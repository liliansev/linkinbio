import { lookup as resoudreDns } from 'node:dns';
import type { LookupAddress } from 'node:dns';
import { request as requeteHttp } from 'node:http';
import type { IncomingMessage } from 'node:http';
import { request as requeteHttps } from 'node:https';
import { BlockList, isIP } from 'node:net';
import type { LookupFunction } from 'node:net';
import type { ImageApercu, VisuelApercu } from '../lib/types.ts';

/*
 * L'aperçu d'un site, pour habiller un lien : son titre, sa description et son
 * image de partage (`og:image`), lus dans la page, et le prix d'un produit. Sans image de partage, une
 * capture de la page la remplace. Seul le back office l'appelle, et le serveur
 * ne suit que des adresses publiques.
 *
 * Des sites ne se laissaient pas lire (22 octobre 2026) : une page trop lourde
 * était refusée en entier, une page en latin-1 sortait illisible, YouTube
 * répondait par sa page de consentement, et les sites qui ferment la porte aux
 * robots ne donnaient rien. Désormais : on ne lit que le `<head>`, dans le
 * jeu de caractères annoncé ; on se présente comme les aperçus de liens
 * (iMessage, WhatsApp), à qui la plupart des sites servent leurs balises de
 * partage, puis comme un navigateur si la porte reste fermée ; les grands
 * sites de vidéo et de musique passent par leur oEmbed ; et une page de
 * vérification (« Just a moment… ») ne se prend jamais pour un titre.
 *
 * Le logo d'un site (23 octobre 2026, demandé par Lilian) : ses icônes d'écran
 * d'accueil (`apple-touch-icon`), ses icônes déclarées, celles de son manifeste,
 * puis `/favicon.ico`. Il habille la petite vignette d'un bouton quand l'image
 * de partage est une bannière large, qui s'y couperait.
 */

export interface ApercuSite {
  titre: string; description: string; image: string | null; prix: string;
  /** D'où vient l'image : l'image de partage, le logo du site, ou une capture de la page. */
  visuel?: VisuelApercu;
}

/** Au plus ce qu'on lit d'une page : son `<head>` suffit, la lecture s'arrête dès qu'il se ferme. */
const LIMITE_PAGE = 2_000_000;
const LIMITE_IMAGE = 5_000_000;
const LIMITE_OEMBED = 200_000;
const DELAI = 7000;
/** Un logo se cherche à plusieurs adresses : chacune a moins de temps, et quatre essais au plus. */
const DELAI_LOGO = 4000;
const ESSAIS_LOGO = 4;
const SAUTS = 8;
const CAPTURE = (url: string) => `https://image.thum.io/get/width/1200/crop/675/noanimate/${url}`;

/**
 * Deux façons de se présenter. D'abord comme les aperçus de liens (la voix d'iMessage, avec le nom de Hopla) :
 * Instagram, TikTok et la plupart des sites leur servent les balises de partage, même derrière une connexion.
 * Puis, si la porte reste fermée, comme un navigateur ordinaire.
 */
const VOIX_APERCU = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 facebookexternalhit/1.1 Facebot Twitterbot/1.0 Hopla/1.0 (+https://hopla.page)';
const VOIX_NAVIGATEUR = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
type Voix = typeof VOIX_APERCU | typeof VOIX_NAVIGATEUR;

const RESERVEES = new BlockList();
for (const [reseau, bits] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 3]] as const) RESERVEES.addSubnet(reseau, bits, 'ipv4');
// `::/96` et `::ffff:0:0:0/96` : une IPv4 glissée dans une IPv6 sous ses formes anciennes (`[::127.0.0.1]` devient `::7f00:1`).
for (const [reseau, bits] of [['::', 96], ['::ffff:0:0:0', 96], ['64:ff9b::', 96], ['64:ff9b:1::', 48], ['100::', 64], ['2001::', 23], ['2001:db8::', 32], ['2002::', 16], ['fc00::', 7], ['fe80::', 10], ['fec0::', 10], ['ff00::', 8]] as const) RESERVEES.addSubnet(reseau, bits, 'ipv6');

/** Une adresse IP du réseau local, de la machine ou réservée (IPv4 glissée dans une IPv6 comprise). */
export function estPrivee(ip: string): boolean {
  const mappee = /^::(ffff:)?(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mappee) return estPrivee(mappee[2]);
  const famille = isIP(ip);
  if (!famille) return true;
  return RESERVEES.check(ip, famille === 4 ? 'ipv4' : 'ipv6');
}

type Resolveur = (hote: string, options: { all: true }, rappel: (erreur: NodeJS.ErrnoException | null, adresses: LookupAddress[]) => void) => void;

/**
 * La résolution DNS de la connexion elle-même, qui refuse un nom dont une seule
 * adresse est privée. Vérifier d'abord, puis laisser `fetch` résoudre de nouveau,
 * laisserait un serveur DNS répondre une adresse publique à la vérification et
 * 127.0.0.1 à la connexion.
 */
export const resolutionPublique = (resoudre: Resolveur = resoudreDns as Resolveur): LookupFunction => (hote, options, rappel) => {
  resoudre(hote, { all: true }, (erreur, adresses) => {
    if (erreur) return rappel(erreur, '', 0);
    if (!adresses.length || adresses.some(a => estPrivee(a.address))) return rappel(Object.assign(new Error('Adresse refusée.'), { code: 'EREFUSEE' }), '', 0);
    if (options.all) return rappel(null, adresses);
    const famille = options.family === 'IPv4' ? 4 : options.family === 'IPv6' ? 6 : options.family;
    const choisie = adresses.find(a => !famille || a.family === famille) ?? adresses[0];
    rappel(null, choisie.address, choisie.family);
  });
};

/**
 * Une requête GET, sans suivre de redirection, qui ne se connecte qu'à une adresse publique. Le délai
 * dépassé rejette avec sa raison (`TimeoutError`), comme `fetch`.
 */
function obtenir(url: URL, entetes: Record<string, string>, delai: AbortSignal): Promise<IncomingMessage> {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return Promise.reject(new Error('Adresse refusée.'));
  // Une adresse IP écrite telle quelle ne passe pas par la résolution : elle se vérifie ici.
  const hote = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(hote) && estPrivee(hote)) return Promise.reject(new Error('Adresse refusée.'));
  return new Promise((ok, ko) => {
    const requete = (url.protocol === 'https:' ? requeteHttps : requeteHttp)(url, {
      method: 'GET', agent: false, lookup: resolutionPublique(), signal: delai, headers: entetes,
    }, ok);
    requete.on('error', e => ko(delai.aborted ? delai.reason : e));
    requete.end();
  });
}

/** YouTube et Google montrent une page de consentement aux visiteurs d'Europe : ce témoin dit qu'on l'a déjà vue (refus des témoins compris). */
const consentement = (hote: string): Record<string, string> => (/(^|\.)(youtube\.com|youtu\.be|google\.[a-z.]+)$/i.test(hote) ? { cookie: 'SOCS=CAI; CONSENT=PENDING+987' } : {});

interface Reponse { octets: Buffer; type: string; url: string; statut: number }

/**
 * Télécharge en suivant au plus huit redirections, chacune vérifiée. Une page s'arrête à la fin de son `<head>`
 * (`coupe`) ou à `limite` octets, et se lit quelle que soit sa réponse (un 403 peut porter ses balises) ;
 * un fichier (une image) doit répondre 200 et tenir sous `limite`.
 */
async function telecharger(depart: string, { limite, accepte, voix = VOIX_APERCU, coupe = false, referent, duree = DELAI }: { limite: number; accepte: string; voix?: Voix; coupe?: boolean; referent?: string; duree?: number }): Promise<Reponse> {
  let url = new URL(depart);
  for (let saut = 0; saut <= SAUTS; saut++) {
    const delai = AbortSignal.timeout(duree);
    const reponse = await obtenir(url, {
      accept: accepte, 'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8', 'user-agent': voix, ...consentement(url.hostname), ...(referent ? { referer: referent } : {}),
    }, delai);
    const statut = reponse.statusCode ?? 0;
    const suite = reponse.headers.location;
    if (statut >= 300 && statut < 400 && suite) {
      reponse.destroy();
      url = new URL(suite, url);
      continue;
    }
    if (!coupe && (statut < 200 || statut >= 300)) { reponse.destroy(); throw new Error(`Réponse ${statut}`); }
    const morceaux: Buffer[] = [];
    let total = 0;
    let entiere = false;
    try {
      let arretee = false;
      for await (const morceau of reponse as AsyncIterable<Buffer>) {
        total += morceau.length;
        if (total > limite) {
          if (!coupe) throw new Error('Fichier trop lourd.');
          morceaux.push(morceau.subarray(0, morceau.length - (total - limite)));
          arretee = true;
          break;
        }
        morceaux.push(morceau);
        // Le `<head>` est fermé (ou le corps commencé) : les balises de partage sont toutes là.
        if (coupe && /<\/head\s*>|<body[\s>]/i.test(Buffer.concat(morceaux.slice(-2)).toString('latin1'))) { arretee = true; break; }
      }
      entiere = arretee || reponse.complete;
    } catch (e) { throw delai.aborted ? delai.reason : e; } finally { reponse.destroy(); }
    // Coupée par le délai, une réponse peut s'arrêter en route sans erreur.
    if (!entiere) throw delai.aborted ? delai.reason : new Error('Réponse incomplète.');
    return { octets: Buffer.concat(morceaux), type: reponse.headers['content-type'] ?? '', url: url.toString(), statut };
  }
  throw new Error('Trop de redirections.');
}

/** Les 32 signes que Windows-1252 met entre 0x80 et 0x9F, là où le latin-1 n'a que des caractères de contrôle (l'apostrophe courbe, l'euro…). */
const CP1252 = '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008DŽ\u008F\u0090‘’“”•–—˜™š›œ\u009DžŸ';
/** Windows-1252, que le web lit aussi pour « iso-8859-1 » : Node le confond parfois avec le latin-1, on le fait à la main. */
const windows1252 = (octets: Uint8Array) => Buffer.from(octets).toString('latin1').replace(/[\u0080-\u009f]/g, c => CP1252[c.charCodeAt(0) - 0x80]);
const LATIN = /^(windows-1252|cp1252|x-cp1252|iso-8859-1|iso8859-1|iso_8859-1|latin-?1|l1|us-ascii|ascii)$/i;

/** Le texte d'une page, dans le jeu de caractères qu'elle annonce (en-tête, puis `<meta charset>`), UTF-8 sinon. */
export function decoderPage(octets: Uint8Array, type = ''): string {
  const debut = Buffer.from(octets.subarray(0, 4096)).toString('latin1');
  const annonce = /charset\s*=\s*["']?([\w:.-]+)/i.exec(type)?.[1]
    ?? /<meta[^>]+charset\s*=\s*["']?([\w:.-]+)/i.exec(debut)?.[1];
  const lire = (jeu: string) => {
    if (LATIN.test(jeu)) return windows1252(octets);
    try { return new TextDecoder(jeu.toLowerCase()).decode(octets); } catch { return null; }
  };
  if (annonce) { const t = lire(annonce); if (t !== null) return t; }
  const utf8 = new TextDecoder('utf-8').decode(octets);
  // Rien d'annoncé et de l'UTF-8 cassé : une vieille page en Windows-1252, comme beaucoup de sites français d'avant.
  return !annonce && utf8.includes('�') ? windows1252(octets) : utf8;
}

const ENTITES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', thinsp: ' ', ensp: ' ', emsp: ' ', shy: '',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', laquo: '«', raquo: '»', sbquo: '‚', bdquo: '„', hellip: '…', ndash: '–', mdash: '—', middot: '·', bull: '•',
  euro: '€', pound: '£', copy: '©', reg: '®', trade: '™', deg: '°', times: '×', eacute: 'é', Eacute: 'É', egrave: 'è', Egrave: 'È', ecirc: 'ê', Ecirc: 'Ê', euml: 'ë',
  agrave: 'à', Agrave: 'À', aacute: 'á', acirc: 'â', Acirc: 'Â', auml: 'ä', atilde: 'ã', ccedil: 'ç', Ccedil: 'Ç', icirc: 'î', iuml: 'ï', iacute: 'í',
  ocirc: 'ô', Ocirc: 'Ô', ouml: 'ö', oacute: 'ó', otilde: 'õ', ugrave: 'ù', ucirc: 'û', uuml: 'ü', uacute: 'ú', ntilde: 'ñ', oelig: 'œ', OElig: 'Œ', aelig: 'æ', szlig: 'ß',
};
const decoder = (t: string) => t
  .replace(/&#x([0-9a-f]+);/gi, (m, h) => { const n = parseInt(h, 16); return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m; })
  .replace(/&#(\d+);/g, (m, d) => { const n = Number(d); return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m; })
  .replace(/&([a-z]+[0-9]*);/gi, (m, n) => ENTITES[n] ?? ENTITES[n.toLowerCase()] ?? m);

/** Ce qui sépare le titre d'une page du nom de son site : « Mes ateliers | Atelier Camille ». */
const SEPARATEUR = /\s+(?:\||-|–|—|·|•|::|»)\s+/;
const GENERIQUES = /^(accueil|page d['’]accueil|home|homepage|home page|bienvenue|welcome)$/i;

/**
 * Le titre d'un lien, tel qu'on l'écrirait sur un bouton : sans le nom du site
 * collé derrière (« | AFK », « - Mon site »), sauf quand il ne reste qu'un mot
 * comme « Accueil » ; alors c'est le nom du site qui sert.
 */
export function titreCourt(titre: string): string {
  const t = titre.replace(/\s+/g, ' ').trim();
  const morceaux = t.split(SEPARATEUR);
  if (morceaux.length < 2) return t.slice(0, 80);
  const tete = morceaux[0].trim();
  const queue = morceaux[morceaux.length - 1].trim();
  const choisi = GENERIQUES.test(tete) ? queue : tete.length >= 3 ? tete : t;
  return choisi.slice(0, 80).trim();
}

/**
 * Les pages qui ne sont pas le site : une vérification anti-robots, un consentement, une erreur. Leur titre n'est jamais celui du lien.
 */
const BARRAGES = [
  /^(just a moment|un instant|one moment, please|attention required|access denied|acc[eè]s (refus[ée]|interdit)|forbidden|not found|page (not found|introuvable|non trouv[ée]e)|robot check|are you a (robot|human)|security check|checking your browser|ddos-guard|request rejected|before you continue|avant d['’]acc[ée]der|v[ée]rification (de s[ée]curit[ée]|en cours|requise|du navigateur)|verifying you are human|captcha)/i,
  /^(40\d|50\d)(\s*[-:|]?\s*(forbidden|not found|unauthorized|error|service unavailable|bad gateway|gateway time-?out|internal server error|interdit|introuvable|erreur))?$/i,
  /^(error|erreur)(\s*\d{3})?$/i,
  /^(sign in|sign up|log in|login|se connecter|connexion|s['’]identifier|inscription)(\s+(to|à|sur)\s.*)?$/i,
];
export const estBarrage = (titre: string) => [titre, titreCourt(titre)].some(t => BARRAGES.some(m => m.test(t.replace(/[.…!\s]+$/, '').trim())));

/** Une icône déclarée par une page : son adresse, son plus petit côté annoncé (0 s'il ne l'est pas), et si c'est celle de l'écran d'accueil. */
export interface IconeDeclaree { url: string; taille: number; accueil: boolean }

interface Meta { titre: string; description: string; image: string; oembed: string; rafraichir: string; prix: string; icones: IconeDeclaree[]; manifeste: string }

/** Un montant écrit à la façon de n'importe quel pays (« 24,00 », « 1.234,56 », « 1,234.56 », « 1 234 ») ; null s'il n'y en a pas, ou s'il est nul. */
export function montant(brut: string): number | null {
  const t = /\d[\d.,]*/.exec(brut.replace(/[\s\u00a0\u202f']/g, ''))?.[0];
  if (!t) return null;
  // Le dernier séparateur suivi d'un ou deux chiffres est la virgule ; suivi de trois, il ne sépare que des milliers.
  const dernier = Math.max(t.lastIndexOf(','), t.lastIndexOf('.'));
  const apres = t.length - dernier - 1;
  const decimal = dernier >= 0 && apres >= 1 && apres <= 2;
  const entier = (decimal ? t.slice(0, dernier) : t).replace(/[.,]/g, '');
  const n = Number(decimal ? `${entier}.${t.slice(dernier + 1)}` : entier);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** La devise d'un prix écrit avec son symbole, quand la page ne l'a pas déclarée. */
const SYMBOLES: [RegExp, string][] = [[/€|\beur\b/i, 'EUR'], [/£|\bgbp\b/i, 'GBP'], [/\bchf\b/i, 'CHF'], [/ca\$|\bcad\b/i, 'CAD'], [/\$|\busd\b/i, 'USD']];

/** Un prix comme on l'écrit en France : « 24 € », « 12,50 € », « 10 $ » ; vide pour une devise inconnue. */
export function ecrirePrix(n: number, devise: string): string {
  if (!/^[A-Z]{3}$/.test(devise)) return '';
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: devise, currencyDisplay: 'narrowSymbol', minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n);
  } catch { return ''; }
}

const enTexte = (v: unknown) => (typeof v === 'number' || typeof v === 'string' ? String(v).trim() : '');

/** L'offre d'un produit décrit en JSON-LD (`offers`, une ou plusieurs) : son prix, le plus bas s'il y en a plusieurs. */
function offreJsonLd(html: string): { brut: string; devise: string; des: boolean } | null {
  for (const [, texte] of html.matchAll(/<script\b[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let pile: unknown[];
    try { pile = [JSON.parse(texte)]; } catch { continue; }
    for (let n = pile.pop(); n !== undefined; n = pile.pop()) {
      if (!n || typeof n !== 'object') continue;
      if (Array.isArray(n)) { pile.push(...n); continue; }
      const o = n as Record<string, unknown>;
      const offres = ([o.offers].flat().filter(x => x && typeof x === 'object') as Record<string, unknown>[])
        .map(x => ({ ...x, ...(x.priceSpecification && typeof x.priceSpecification === 'object' ? x.priceSpecification as Record<string, unknown> : {}) }));
      const prix = offres.flatMap(x => [enTexte(x.price) || enTexte(x.lowPrice)].filter(p => montant(p) !== null));
      if (prix.length) {
        const bas = prix.reduce((a, b) => (montant(b)! < montant(a)! ? b : a));
        const haut = offres.map(x => montant(enTexte(x.highPrice))).find(h => h !== null);
        const des = new Set(prix.map(montant)).size > 1 || (!!haut && haut > montant(bas)!);
        return { brut: bas, devise: enTexte(offres.find(x => enTexte(x.priceCurrency))?.priceCurrency), des };
      }
      pile.push(...Object.values(o).filter(v => v && typeof v === 'object'));
    }
  }
  return null;
}

/**
 * Le prix d'un produit, tel que les boutiques le déclarent pour leurs aperçus : Shopify (`og:price:amount`),
 * WooCommerce et Gumroad (`product:price:amount`), Etsy (`etsymarketplace:price_value`), les microdonnées
 * (`itemprop="price"`), une étiquette Twitter (« Price »), et sinon le JSON-LD d'un produit. Vide s'il n'y en a pas.
 */
function lirePrix(meta: Record<string, string>, html: string): string {
  let brut = meta['og:price:amount'] || meta['product:price:amount'] || meta['etsymarketplace:price_value'] || meta.price || '';
  let devise = meta['og:price:currency'] || meta['product:price:currency'] || meta['etsymarketplace:currency_code'] || meta.pricecurrency || '';
  let des = false;
  for (let i = 1; i <= 4 && !brut; i++) if (/^(price|prix)$/i.test(meta[`twitter:label${i}`] ?? '')) brut = meta[`twitter:data${i}`] ?? '';
  if (!brut) {
    const offre = offreJsonLd(html);
    if (offre) { brut = offre.brut; devise = offre.devise || devise; des = offre.des; }
  }
  const n = montant(brut);
  if (n === null) return '';
  const texte = ecrirePrix(n, devise.trim().toUpperCase() || (SYMBOLES.find(([motif]) => motif.test(brut))?.[1] ?? ''));
  return texte && des ? `Dès ${texte}` : texte;
}

/**
 * Le titre, la description, l'image de partage et le prix (une boutique) déclarés dans le `<head>` d'une page, son oEmbed
 * s'il en a un, ses icônes et son manifeste. Une icône en SVG est laissée de côté : elle ne se redessine pas en vignette.
 */
export function lireMeta(html: string, base: string): Meta {
  const meta: Record<string, string> = {};
  const attr = (balise: string, nom: string) => {
    const m = new RegExp(`\\b${nom}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(balise);
    return m ? m[1] ?? m[2] ?? m[3] ?? '' : null;
  };
  for (const [balise] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const cle = attr(balise, 'property') ?? attr(balise, 'name') ?? attr(balise, 'itemprop') ?? (attr(balise, 'http-equiv') ? `http-equiv:${attr(balise, 'http-equiv')}` : null);
    const contenu = attr(balise, 'content');
    if (!cle || contenu === null) continue;
    const k = cle.toLowerCase();
    if (!(k in meta) && contenu.trim()) meta[k] = decoder(contenu.trim());
  }
  const liens: Record<string, string> = {};
  const icones: IconeDeclaree[] = [];
  for (const [balise] of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = attr(balise, 'rel')?.toLowerCase() ?? '', type = attr(balise, 'type')?.toLowerCase() ?? '', href = attr(balise, 'href');
    if (!href) continue;
    const rels = rel.split(/\s+/);
    if (rel === 'image_src' && !liens.image) liens.image = decoder(href);
    if (rel.includes('alternate') && type === 'application/json+oembed' && !liens.oembed) liens.oembed = decoder(href);
    if (rels.includes('manifest') && !liens.manifeste) liens.manifeste = decoder(href);
    const accueil = rels.some(r => r === 'apple-touch-icon' || r === 'apple-touch-icon-precomposed');
    if ((accueil || rels.includes('icon')) && !type.includes('svg') && !/\.svg([?#]|$)/i.test(href)) {
      const tailles = (attr(balise, 'sizes') ?? '').match(/\d+x\d+/gi)?.map(t => Math.min(...t.toLowerCase().split('x').map(Number))) ?? [];
      // Une icône d'écran d'accueil sans taille fait 180 pixels ; une icône sans taille, souvent 16 ou 32.
      icones.push({ url: decoder(href), taille: tailles.length ? Math.max(...tailles) : accueil ? 180 : 0, accueil });
    }
  }
  const absolue = (u: string) => { try { return u ? new URL(u, base).toString() : ''; } catch { return ''; } };
  const titreBalise = decoder(/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? '');
  const brut = meta['og:title'] || meta['twitter:title'] || titreBalise || meta.title || meta.name || '';
  const titre = titreCourt(brut);
  const barre = estBarrage(titre) || estBarrage(brut);
  const image = meta['og:image:secure_url'] || meta['og:image'] || meta['og:image:url'] || meta['twitter:image'] || meta['twitter:image:src'] || meta.image || liens.image || '';
  // « 0; url=/ailleurs » : une page qui renvoie ailleurs sans en avoir l'air.
  const rafraichir = /url\s*=\s*['"]?([^'";]+)/i.exec(meta['http-equiv:refresh'] ?? '')?.[1]?.trim() ?? '';
  return {
    titre: barre ? '' : titre,
    description: barre ? '' : (meta['og:description'] || meta.description || meta['twitter:description'] || '').replace(/\s+/g, ' ').trim().slice(0, 400),
    image: barre ? '' : absolue(image),
    oembed: absolue(liens.oembed ?? ''),
    rafraichir: absolue(rafraichir),
    prix: barre ? '' : lirePrix(meta, html),
    icones: barre ? [] : icones.map(i => ({ ...i, url: absolue(i.url) })).filter(i => /^https?:/.test(i.url)),
    manifeste: barre ? '' : absolue(liens.manifeste ?? ''),
  };
}

/** Les sites de vidéo et de musique : leur oEmbed donne le vrai titre et la vignette, quand la page ne les montre qu'en JavaScript ou derrière un consentement. */
const OEMBED: [RegExp, (u: string) => string][] = [
  [/^(www\.|m\.|music\.)?youtube\.com$|^youtu\.be$/, u => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u)}`],
  [/^(www\.)?vimeo\.com$/, u => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(u)}`],
  [/^open\.spotify\.com$/, u => `https://open.spotify.com/oembed?url=${encodeURIComponent(u)}`],
  [/^(www\.|m\.)?soundcloud\.com$/, u => `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(u)}`],
  [/^(www\.)?deezer\.com$/, u => `https://api.deezer.com/oembed?format=json&url=${encodeURIComponent(u)}`],
  [/^(www\.|m\.)?tiktok\.com$/, u => `https://www.tiktok.com/oembed?url=${encodeURIComponent(u)}`],
  [/^(www\.)?dailymotion\.com$|^dai\.ly$/, u => `https://www.dailymotion.com/services/oembed?format=json&url=${encodeURIComponent(u)}`],
];
export function adresseOembed(url: string): string | null {
  let hote: string;
  try { hote = new URL(url).hostname.toLowerCase(); } catch { return null; }
  const fournisseur = OEMBED.find(([motif]) => motif.test(hote));
  return fournisseur ? fournisseur[1](url) : null;
}

/** Le titre et la vignette d'un oEmbed ; rien s'il ne répond pas. */
export function lireOembed(texte: string): { titre: string; image: string } {
  try {
    const o = JSON.parse(texte) as { title?: unknown; author_name?: unknown; thumbnail_url?: unknown };
    const titre = typeof o.title === 'string' && o.title.trim() ? o.title : typeof o.author_name === 'string' ? o.author_name : '';
    return { titre: decoder(titre).replace(/\s+/g, ' ').trim().slice(0, 80), image: typeof o.thumbnail_url === 'string' ? o.thumbnail_url : '' };
  } catch { return { titre: '', image: '' }; }
}

async function oembed(adresse: string): Promise<{ titre: string; image: string }> {
  try {
    const r = await telecharger(adresse, { limite: LIMITE_OEMBED, accepte: 'application/json', voix: VOIX_NAVIGATEUR });
    return lireOembed(r.octets.toString('utf8'));
  } catch { return { titre: '', image: '' }; }
}

/** La page lue d'une voix, puis de l'autre si la première ne donne rien ; une page qui renvoie ailleurs est suivie une fois. */
async function lirePage(url: string): Promise<Meta & { url: string }> {
  let derniere: (Meta & { url: string }) | null = null;
  let erreur: unknown = null;
  for (const voix of [VOIX_APERCU, VOIX_NAVIGATEUR] as const) {
    try {
      let page = await telecharger(url, { limite: LIMITE_PAGE, accepte: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5', voix, coupe: true });
      let m = lireMeta(decoderPage(page.octets, page.type), page.url);
      if (m.rafraichir && !m.titre && m.rafraichir !== page.url) {
        page = await telecharger(m.rafraichir, { limite: LIMITE_PAGE, accepte: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5', voix, coupe: true });
        m = lireMeta(decoderPage(page.octets, page.type), page.url);
      }
      // On garde la lecture la plus parlante des deux : un titre d'abord, sinon ce qu'il y a.
      if (!derniere || m.titre || (!derniere.titre && (m.description || m.image))) derniere = { ...m, url: page.url };
      // Une page qui répond et se présente : c'est fini. Une porte fermée (403, 429, une vérification) : l'autre voix essaie.
      if (m.titre && (page.statut < 400 || voix === VOIX_NAVIGATEUR)) return derniere;
    } catch (e) { erreur = e; if ((e as Error).name === 'TimeoutError' || (e as Error).message === 'Adresse refusée.') break; }
  }
  if (derniere) return derniere;
  throw erreur ?? new Error('Page illisible.');
}

/** La largeur et la hauteur d'une image, lues dans ses octets : PNG, JPEG, GIF, WebP et ICO (sa plus grande icône) ; null sinon. */
export function tailleImage(o: Uint8Array): { l: number; h: number } | null {
  const b = Buffer.from(o.buffer, o.byteOffset, o.byteLength);
  const texte = (de: number, a: number) => b.toString('latin1', de, a);
  if (b.length >= 24 && b.readUInt32BE(0) === 0x89504e47) return { l: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.length >= 10 && texte(0, 3) === 'GIF') return { l: b.readUInt16LE(6), h: b.readUInt16LE(8) };
  if (b.length >= 30 && texte(0, 4) === 'RIFF' && texte(8, 12) === 'WEBP') {
    const morceau = texte(12, 16);
    if (morceau === 'VP8 ') return { l: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (morceau === 'VP8L') { const n = b.readUInt32LE(21); return { l: (n & 0x3fff) + 1, h: ((n >>> 14) & 0x3fff) + 1 }; }
    if (morceau === 'VP8X') return { l: b.readUIntLE(24, 3) + 1, h: b.readUIntLE(27, 3) + 1 };
    return null;
  }
  const ico = entreesIco(b);
  if (ico) { const c = Math.max(0, ...ico.map(e => e.cote)); return c ? { l: c, h: c } : null; }
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    // Les marqueurs d'un JPEG, jusqu'à celui qui décrit l'image (SOF) et donne sa taille.
    for (let i = 2; i + 9 < b.length;) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m === 0xff) { i++; continue; }
      if (m === 0x01 || (m >= 0xd0 && m <= 0xd8)) { i += 2; continue; }
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { l: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

/** Les icônes d'un fichier ICO (le `favicon.ico`) : leur côté, et où elles sont rangées ; null si ce n'en est pas un. */
function entreesIco(b: Buffer): { cote: number; debut: number; longueur: number }[] | null {
  if (b.length < 22 || b.readUInt16LE(0) !== 0 || b.readUInt16LE(2) !== 1) return null;
  const n = b.readUInt16LE(4);
  if (!n || 6 + 16 * n > b.length) return null;
  return Array.from({ length: n }, (_, i) => {
    const e = 6 + 16 * i;
    return { cote: Math.min(b[e] || 256, b[e + 1] || 256), longueur: b.readUInt32LE(e + 8), debut: b.readUInt32LE(e + 12) };
  });
}

/** La plus grande icône d'un ICO quand elle est rangée en PNG (le cas des icônes modernes) : un PNG tout simple, que tout navigateur lit. */
export function pngDeIco(o: Uint8Array): Buffer | null {
  const b = Buffer.from(o.buffer, o.byteOffset, o.byteLength);
  const grande = entreesIco(b)?.sort((x, y) => y.cote - x.cote)[0];
  if (!grande || grande.debut + grande.longueur > b.length) return null;
  const png = b.subarray(grande.debut, grande.debut + grande.longueur);
  return png.length > 8 && png.readUInt32BE(0) === 0x89504e47 ? png : null;
}

interface ImageLue { donnees: string; l: number; h: number }
const cote = (i: ImageLue) => Math.min(i.l, i.h);
/** Presque carrée : elle tient entière dans la vignette d'un bouton. */
const carree = (i: ImageLue) => i.l / i.h >= 0.8 && i.l / i.h <= 1.25;

/** Une image téléchargée, en data URL, avec sa taille ; null si ce n'est pas une image qu'un navigateur sait lire. */
async function imageDe(url: string, referent?: string, duree = DELAI): Promise<ImageLue | null> {
  try {
    const { octets, type } = await telecharger(url, { limite: LIMITE_IMAGE, accepte: 'image/avif,image/webp,image/png,image/jpeg,image/*', voix: VOIX_NAVIGATEUR, referent, duree });
    let mime = type.split(';')[0].trim().toLowerCase();
    let corps: Buffer = octets;
    // Un favicon se sert sous bien des noms (image/x-icon, image/vnd.microsoft.icon, application/octet-stream) : ses octets disent ce qu'il est.
    if (entreesIco(octets)) {
      const png = pngDeIco(octets);
      if (png) { corps = png; mime = 'image/png'; } else mime = 'image/x-icon';
    } else if (!/^image\/(png|jpeg|webp|gif|avif)$/.test(mime)) return null;
    const taille = tailleImage(octets) ?? { l: 0, h: 0 };
    if (mime !== 'image/avif' && !taille.l) return null;
    return { donnees: `data:${mime};base64,${corps.toString('base64')}`, l: taille.l || 1200, h: taille.h || 630 };
  } catch { return null; }
}

/** Les icônes d'un manifeste d'application web, de la plus grande à la plus petite, sans SVG ni icône monochrome. */
async function iconesManifeste(adresse: string): Promise<string[]> {
  try {
    const r = await telecharger(adresse, { limite: LIMITE_OEMBED, accepte: 'application/manifest+json,application/json', voix: VOIX_NAVIGATEUR, duree: DELAI_LOGO });
    const m = JSON.parse(r.octets.toString('utf8')) as { icons?: { src?: unknown; sizes?: unknown; type?: unknown; purpose?: unknown }[] };
    return (Array.isArray(m.icons) ? m.icons : [])
      .filter(i => typeof i.src === 'string' && !/svg/i.test(String(i.type ?? '')) && !/\.svg([?#]|$)/i.test(i.src) && !/monochrome/i.test(String(i.purpose ?? '')))
      .map(i => ({ url: new URL(i.src as string, r.url).toString(), taille: Math.max(0, ...(String(i.sizes ?? '').match(/\d+/g) ?? []).map(Number)) }))
      .sort((a, b) => b.taille - a.taille).slice(0, 2).map(i => i.url);
  } catch { return []; }
}

/**
 * Le logo d'un site, le plus net trouvé : ses icônes d'écran d'accueil et ses grandes icônes déclarées, celles de son
 * manifeste, `/apple-touch-icon.png`, ses petites icônes, puis `/favicon.ico`. Quatre essais au plus ; null si le plus
 * net a un côté sous `min` pixels.
 */
async function logoDuSite(page: (Meta & { url: string }) | null, url: string, min: number): Promise<ImageLue | null> {
  let origine: string;
  try { origine = new URL(page?.url ?? url).origin; } catch { return null; }
  const declarees = [...(page?.icones ?? [])].sort((a, b) => Number(b.accueil) - Number(a.accueil) || b.taille - a.taille);
  const grandes = declarees.filter(i => i.accueil || i.taille >= 64).map(i => i.url);
  const petites = declarees.filter(i => !i.accueil && i.taille < 64).map(i => i.url);
  const manifeste = page?.manifeste && grandes.length < 2 ? await iconesManifeste(page.manifeste) : [];
  const adresses = [...new Set([...grandes, ...manifeste, `${origine}/apple-touch-icon.png`, ...petites, `${origine}/favicon.ico`])].slice(0, ESSAIS_LOGO + 2);
  let meilleure: ImageLue | null = null;
  let essais = 0;
  for (const a of adresses) {
    if (essais >= ESSAIS_LOGO) break;
    essais++;
    const image = await imageDe(a, page?.url, DELAI_LOGO);
    if (image && (!meilleure || cote(image) > cote(meilleure))) meilleure = image;
    if (meilleure && cote(meilleure) >= 120) break;
  }
  return meilleure && cote(meilleure) >= min ? meilleure : null;
}

/**
 * L'aperçu d'un site. `image` à faux : le titre, la description et le prix seuls, pour remplir le texte d'un lien
 * sans attendre une image ni une capture. `'partage'` : l'image de partage, ou rien, jamais une capture (la photo
 * d'un produit ne peut pas être un morceau de sa page). `'logo'` : le logo du site seul. `'vignette'` : ce qui tient le
 * mieux dans la petite vignette carrée d'un bouton, l'image de partage si elle est carrée, sinon le logo du site,
 * sinon l'image de partage, jamais une capture.
 */
export async function apercuSite(url: string, { image: mode = true }: { image?: ImageApercu } = {}): Promise<ApercuSite> {
  const viaOembed = adresseOembed(url);
  const [page, o] = await Promise.all([
    lirePage(url).catch(e => (viaOembed || mode === 'logo' ? null : Promise.reject(e))),
    viaOembed ? oembed(viaOembed) : Promise.resolve(null),
  ]);
  // L'oEmbed annoncé par la page elle-même, quand elle n'a pas dit son titre.
  const annonce = !o && page && !page.titre && page.oembed ? await oembed(page.oembed) : null;
  const titre = o?.titre || page?.titre || annonce?.titre || '';
  const description = page?.description ?? '';
  const prix = page?.prix ?? '';
  const base = { titre, description, prix };
  if (!mode) return { ...base, image: null };
  const avec = (i: ImageLue | null, visuel: VisuelApercu): ApercuSite => (i ? { ...base, image: i.donnees, visuel } : { ...base, image: null });
  if (mode === 'logo') return avec(await logoDuSite(page, url, 32), 'logo');
  const source = page?.image || o?.image || annonce?.image || '';
  const partage = source ? await imageDe(source, page?.url) : null;
  if (mode === 'vignette') {
    if (partage && carree(partage) && cote(partage) >= 96) return avec(partage, 'partage');
    const logo = await logoDuSite(page, url, 64);
    return logo ? avec(logo, 'logo') : avec(partage, 'partage');
  }
  if (partage || mode === 'partage') return avec(partage, 'partage');
  return avec(await imageDe(CAPTURE(page?.url ?? url)), 'capture');
}
