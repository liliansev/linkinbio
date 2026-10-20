import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

/*
 * L'aperçu d'un site, pour habiller un lien mis en avant : son titre, sa
 * description et son image de partage (`og:image`), lus dans la page. Sans
 * image de partage, une capture de la page la remplace. Seul le back office
 * l'appelle, et le serveur ne suit que des adresses publiques.
 */

export interface ApercuSite { titre: string; description: string; image: string | null }

const LIMITE_PAGE = 1_500_000;
const LIMITE_IMAGE = 5_000_000;
const DELAI = 8000;
const CAPTURE = (url: string) => `https://image.thum.io/get/width/1200/crop/675/noanimate/${url}`;

const RESERVEES = new BlockList();
for (const [reseau, bits] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 3]] as const) RESERVEES.addSubnet(reseau, bits, 'ipv4');
for (const [reseau, bits] of [['64:ff9b::', 96], ['100::', 64], ['2001:db8::', 32], ['2002::', 16], ['fc00::', 7], ['fe80::', 10], ['fec0::', 10], ['ff00::', 8]] as const) RESERVEES.addSubnet(reseau, bits, 'ipv6');
RESERVEES.addAddress('::', 'ipv6');
RESERVEES.addAddress('::1', 'ipv6');

/** Une adresse IP du réseau local, de la machine ou réservée (IPv4 glissée dans une IPv6 comprise). */
export function estPrivee(ip: string): boolean {
  const mappee = /^::(ffff:)?(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mappee) return estPrivee(mappee[2]);
  const famille = isIP(ip);
  if (!famille) return true;
  return RESERVEES.check(ip, famille === 4 ? 'ipv4' : 'ipv6');
}

async function verifier(url: URL) {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Adresse refusée.');
  const adresses = isIP(url.hostname) ? [{ address: url.hostname }] : await lookup(url.hostname, { all: true });
  if (!adresses.length || adresses.some(a => estPrivee(a.address))) throw new Error('Adresse refusée.');
}

/** Télécharge en suivant au plus quatre redirections, chacune vérifiée, sans dépasser `limite` octets. */
async function telecharger(depart: string, limite: number, accepte: string) {
  let url = new URL(depart);
  for (let saut = 0; saut < 5; saut++) {
    await verifier(url);
    const reponse = await fetch(url, {
      redirect: 'manual', signal: AbortSignal.timeout(DELAI),
      headers: { accept: accepte, 'user-agent': 'Mozilla/5.0 (compatible; Hopla/1.0; +https://hopla.page)' },
    });
    if (reponse.status >= 300 && reponse.status < 400 && reponse.headers.get('location')) {
      url = new URL(reponse.headers.get('location')!, url);
      continue;
    }
    if (!reponse.ok || !reponse.body) throw new Error(`Réponse ${reponse.status}`);
    const morceaux: Uint8Array[] = [];
    let total = 0;
    for await (const morceau of reponse.body as unknown as AsyncIterable<Uint8Array>) {
      total += morceau.length;
      if (total > limite) throw new Error('Fichier trop lourd.');
      morceaux.push(morceau);
    }
    return { octets: Buffer.concat(morceaux), type: reponse.headers.get('content-type') ?? '', url: url.toString() };
  }
  throw new Error('Trop de redirections.');
}

const ENTITES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decoder = (t: string) => t
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&([a-z]+);/gi, (m, n) => ENTITES[n.toLowerCase()] ?? m);

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

/** Le titre, la description et l'image de partage déclarés dans le `<head>` d'une page. */
export function lireMeta(html: string, base: string): { titre: string; description: string; image: string } {
  const meta: Record<string, string> = {};
  for (const [balise] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attr = (nom: string) => new RegExp(`\\b${nom}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(balise);
    const cle = attr('property') ?? attr('name');
    const contenu = attr('content');
    if (!cle || !contenu) continue;
    const k = (cle[2] ?? cle[3]).toLowerCase();
    if (!(k in meta)) meta[k] = decoder((contenu[2] ?? contenu[3]).trim());
  }
  const titreBalise = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? '';
  const image = meta['og:image:secure_url'] || meta['og:image'] || meta['twitter:image'] || meta['twitter:image:src'] || '';
  let absolue = '';
  try { if (image) absolue = new URL(image, base).toString(); } catch { /* image illisible */ }
  return {
    titre: titreCourt(meta['og:title'] || meta['twitter:title'] || decoder(titreBalise)),
    description: (meta['og:description'] || meta['description'] || meta['twitter:description'] || '').replace(/\s+/g, ' ').trim().slice(0, 400),
    image: absolue,
  };
}

async function imageEnDataUrl(url: string): Promise<string | null> {
  try {
    const { octets, type } = await telecharger(url, LIMITE_IMAGE, 'image/avif,image/webp,image/png,image/jpeg,image/*');
    const mime = type.split(';')[0].trim().toLowerCase();
    if (!/^image\/(png|jpeg|webp|gif|avif)$/.test(mime)) return null;
    return `data:${mime};base64,${octets.toString('base64')}`;
  } catch { return null; }
}

export async function apercuSite(url: string): Promise<ApercuSite> {
  const page = await telecharger(url, LIMITE_PAGE, 'text/html,application/xhtml+xml');
  const { titre, description, image } = lireMeta(page.octets.toString('utf8'), page.url);
  const visuel = (image && (await imageEnDataUrl(image))) || (await imageEnDataUrl(CAPTURE(page.url)));
  return { titre, description, image: visuel };
}
