import type { BilanImport, Bloc, Langue, Reseau } from '../lib/types.ts';
import { MAX_RESEAUX, RESEAUX, nouveauBloc } from '../lib/types.ts';
import { reseauDeUrl } from '../lib/demarrage.ts';
import { typeDeAdresse } from '../lib/detection.ts';
import { adresse, validerBloc } from '../lib/valider.ts';
import * as db from './db.ts';

/*
 * Importer sa page d'ailleurs (10 novembre 2026, demandé par Lilian d'après
 * Taap.it : « J'ai un Linktree ») : on colle l'adresse de sa page Linktree,
 * Beacons, Bento, Carrd… et Hopla en reprend le nom, la bio, la photo, les
 * liens dans leur ordre et les réseaux. Une page Linktree se lit dans les
 * données qu'elle embarque (`__NEXT_DATA__`) ; toute autre page, dans ses
 * balises de partage et ses liens qui sortent du site. Rien n'est effacé : les
 * liens s'ajoutent sous ceux de la page, ceux qu'elle a déjà sont laissés de
 * côté, et le profil ne se remplit que là où il est vide.
 */

export interface LienImporte { titre: string; url: string; titreSection?: boolean }
export interface PageImportee {
  nom: string; bio: string; avatar: string;
  liens: LienImporte[];
  reseaux: { reseau: Reseau; url: string }[];
}

/** Au plus ce qu'une page importée apporte : de quoi reprendre une vraie page, pas de quoi la remplir de tout un site. */
export const MAX_LIENS_IMPORTES = 60;

const RESEAUX_LINKTREE: Record<string, Reseau> = {
  INSTAGRAM: 'instagram', TIKTOK: 'tiktok', YOUTUBE: 'youtube', LINKEDIN: 'linkedin', TWITTER: 'x', X: 'x', THREADS: 'threads',
  FACEBOOK: 'facebook', TWITCH: 'twitch', SPOTIFY: 'spotify', EMAIL_ADDRESS: 'email', EMAIL: 'email', GITHUB: 'github',
  WHATSAPP: 'whatsapp', TELEGRAM: 'telegram', DISCORD: 'discord', PINTEREST: 'pinterest', SNAPCHAT: 'snapchat', BLUESKY: 'bluesky',
  MASTODON: 'mastodon', REDDIT: 'reddit', SUBSTACK: 'substack', MEDIUM: 'medium', PATREON: 'patreon', SOUNDCLOUD: 'soundcloud',
  DEEZER: 'deezer', APPLE_MUSIC: 'applemusic', APPLE_PODCAST: 'applepodcasts', APPLE_PODCASTS: 'applepodcasts', BANDCAMP: 'bandcamp',
  VIMEO: 'vimeo', BEHANCE: 'behance', DRIBBBLE: 'dribbble', ETSY: 'etsy', WEBSITE: 'site',
};

const texte = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** Une adresse e-mail nue devient un lien `mailto:` ; le reste passe par la validation des adresses. */
function adresseImportee(url: string): string {
  const brute = url.trim();
  if (/^[^\s@/]+@[^\s@/]+\.[a-z]{2,}$/i.test(brute)) return `mailto:${brute}`;
  return adresse(brute);
}

function reseauImporte(type: string, url: string): Reseau | null {
  if (/^mailto:/i.test(url)) return 'email';
  const r = RESEAUX_LINKTREE[type.toUpperCase()] ?? reseauDeUrl(url);
  return r && (RESEAUX as readonly string[]).includes(r) ? r : null;
}

function sansDoublons(page: PageImportee): PageImportee {
  const vus = new Set<string>();
  const liens = page.liens.filter(l => {
    if (l.titreSection) return true;
    const cle = l.url.replace(/\/+$/, '').toLowerCase();
    if (vus.has(cle)) return false;
    vus.add(cle);
    return true;
  }).slice(0, MAX_LIENS_IMPORTES);
  const reseauxVus = new Set<Reseau>();
  const reseaux = page.reseaux.filter(r => (reseauxVus.has(r.reseau) ? false : (reseauxVus.add(r.reseau), true))).slice(0, MAX_RESEAUX);
  return { ...page, liens, reseaux };
}

/** Une page Linktree : ses données embarquées. null si la page n'en a pas. */
export function lireLinktree(html: string): PageImportee | null {
  const m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!m) return null;
  let props: any;
  try { props = JSON.parse(m[1])?.props?.pageProps; } catch { return null; }
  if (!props || typeof props !== 'object' || !Array.isArray(props.links)) return null;
  const compte = props.account ?? {};
  const liens: LienImporte[] = [...props.links]
    .filter((l: any) => l && typeof l === 'object' && !l.locked && !l.parent)
    .sort((a: any, b: any) => (Number(a.position) || 0) - (Number(b.position) || 0))
    .flatMap((l: any): LienImporte[] => {
      const titre = texte(l.title, 120);
      if (String(l.type).toUpperCase() === 'HEADER') return titre ? [{ titre, url: '', titreSection: true }] : [];
      const url = adresseImportee(String(l.url ?? ''));
      return url ? [{ titre, url }] : [];
    });
  const reseaux = (Array.isArray(props.socialLinks) ? props.socialLinks : [])
    .slice().sort((a: any, b: any) => (Number(a?.position) || 0) - (Number(b?.position) || 0))
    .flatMap((s: any) => {
      const url = adresseImportee(String(s?.url ?? ''));
      const reseau = url ? reseauImporte(String(s?.type ?? ''), url) : null;
      return reseau ? [{ reseau, url }] : [];
    });
  return sansDoublons({
    nom: texte(props.pageTitle || compte.pageTitle || props.username, 60),
    bio: texte(props.description || compte.description, 300),
    avatar: adresse(String(compte.profilePictureUrl || props.customAvatar || compte.customAvatar || '')),
    liens, reseaux,
  });
}

const ENTITES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decoder = (s: string) => s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (tout, e: string) => {
  if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : tout; }
  return ENTITES[e.toLowerCase()] ?? tout;
});
const sansBalises = (s: string) => decoder(s.replace(/<(script|style|svg)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function meta(html: string, nom: string): string {
  for (const balise of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const cle = /\b(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(balise)?.[1]?.toLowerCase();
    if (cle !== nom) continue;
    const contenu = /\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i.exec(balise);
    if (contenu) return decoder(contenu[1] ?? contenu[2] ?? '').trim();
  }
  return '';
}

/** Les sites des pages de liens : un lien vers eux est leur propre décor (« Créer ta page »), pas un lien de la personne. */
const PLATEFORMES = /(^|\.)(linktr\.ee|linktree\.com|beacons\.ai|beacons\.page|bento\.me|carrd\.co|lnk\.bio|campsite\.bio|taap\.it|milkshake\.app|stan\.store|hopla\.page|later\.com|tap\.bio|snipfeed\.co|komi\.io)$/i;

/** Toute autre page de liens : ses balises de partage et les liens qui sortent de son site, dans l'ordre de la page. */
export function lirePageDeLiens(html: string, depart: string): PageImportee {
  let hote = '';
  try { hote = new URL(depart).hostname.toLowerCase(); } catch { /* adresse déjà vérifiée */ }
  const corps = html.replace(/<head[\s\S]*?<\/head>/i, '');
  const liens: LienImporte[] = [];
  const reseaux: PageImportee['reseaux'] = [];
  for (const m of corps.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = /\bhref\s*=\s*"([^"]*)"|\bhref\s*=\s*'([^']*)'/i.exec(m[1]);
    const brute = decoder((href?.[1] ?? href?.[2] ?? '').trim());
    let url: string;
    try { url = new URL(brute, depart).toString(); } catch { continue; }
    if (/^mailto:/i.test(url)) { reseaux.push({ reseau: 'email', url }); continue; }
    if (!/^https?:/i.test(url)) continue;
    const cible = new URL(url).hostname.toLowerCase();
    if (cible === hote || PLATEFORMES.test(cible)) continue;
    const propre = adresse(url);
    if (!propre) continue;
    const titre = texte(sansBalises(m[2]) || /\baria-label\s*=\s*"([^"]*)"/i.exec(m[1])?.[1] || /\btitle\s*=\s*"([^"]*)"/i.exec(m[1])?.[1] || '', 120);
    const reseau = reseauDeUrl(propre);
    // Un réseau sans texte (une icône seule) rejoint les réseaux ; avec un texte, c'est un bouton de la page.
    if (reseau && !titre) reseaux.push({ reseau, url: propre });
    else liens.push({ titre, url: propre });
  }
  const titrePage = meta(html, 'og:title') || sansBalises(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '');
  const image = meta(html, 'og:image');
  return sansDoublons({
    nom: texte(titrePage.replace(/\s*[|·•–-]\s*(Linktree|Beacons|Bento|Carrd|Linkin\.bio|taap\.it|Instagram|TikTok)\s*$/i, ''), 60),
    bio: texte(meta(html, 'og:description') || meta(html, 'description'), 300),
    avatar: image ? adresse(new URL(image, depart).toString()) : '',
    liens, reseaux,
  });
}

/** Lit la page : Linktree par ses données, le reste par ses liens. */
export function lirePageImportee(html: string, depart: string): PageImportee {
  return lireLinktree(html) ?? lirePageDeLiens(html, depart);
}

const VIDE: BilanImport = { liens: 0, reseaux: 0, profil: false, dejaLa: 0 };

/**
 * Ajoute à la page d'un compte ce que la page importée a de plus : ses liens sous les blocs déjà posés, dans leur
 * ordre, ses réseaux après les siens (vingt au plus), et le nom, la bio et la photo là où la page n'en a pas encore.
 * `avatar` : l'image déjà rangée chez Hopla (`/media/…`), ou vide.
 */
export function appliquerImport(compte: string, page: PageImportee, { vitrine, langue, avatar }: { vitrine: boolean; langue: Langue; avatar: string }): BilanImport {
  const blocs = db.lireBlocs(compte);
  const reglages = db.lireReglages(compte);
  const dejaPoses = new Set(blocs.map(b => b.url.replace(/\/+$/, '').toLowerCase()).filter(Boolean));
  const bilan = { ...VIDE };
  const nouveaux: Bloc[] = [];
  for (const l of page.liens) {
    if (l.titreSection) {
      nouveaux.push(validerBloc({ ...nouveauBloc('titre', db.nouvelId(), langue), titre: l.titre }, db.nouvelId()));
      continue;
    }
    if (dejaPoses.has(l.url.replace(/\/+$/, '').toLowerCase())) { bilan.dejaLa++; continue; }
    const type = /^(mailto|tel):/i.test(l.url) ? 'lien' : typeDeAdresse(l.url, vitrine);
    const neuf = nouveauBloc(type, db.nouvelId(), langue);
    nouveaux.push(validerBloc({ ...neuf, url: l.url, titre: l.titre || neuf.titre }, neuf.id));
    bilan.liens++;
  }
  // Une section qui ne garde aucun lien (tous déjà là) ne se pose pas seule en bas de la page.
  const utiles = nouveaux.filter((b, i) => b.type !== 'titre' || (nouveaux[i + 1] && nouveaux[i + 1].type !== 'titre'));
  for (const b of utiles) db.enregistrerBloc(compte, b);
  if (utiles.length) db.ordonner(compte, [...blocs.map(b => b.id), ...utiles.map(b => b.id)]);

  const reseaux = [...reglages.reseaux];
  for (const r of page.reseaux) {
    if (reseaux.length >= MAX_RESEAUX) break;
    if (reseaux.some(x => x.reseau === r.reseau || x.url === r.url)) continue;
    reseaux.push(r);
    bilan.reseaux++;
  }
  // Une page pas encore personnalisée (ni bio ni photo) prend aussi le nom de celle qu'on importe.
  const neuve = !reglages.profil.bio && !reglages.profil.avatar;
  const profil = {
    ...reglages.profil,
    nom: neuve && page.nom ? page.nom : reglages.profil.nom,
    bio: reglages.profil.bio || page.bio,
    avatar: reglages.profil.avatar || avatar,
  };
  bilan.profil = profil.nom !== reglages.profil.nom || profil.bio !== reglages.profil.bio || profil.avatar !== reglages.profil.avatar;
  if (bilan.reseaux || bilan.profil) db.ecrireReglages(compte, { ...reglages, reseaux, profil });
  return bilan;
}

/** Lit la page à cette adresse et l'ajoute à celle du compte. La photo est rapatriée chez Hopla, jamais liée chez l'autre. */
export async function importerPage(compte: string, url: string, { vitrine, langue }: { vitrine: boolean; langue: Langue }): Promise<BilanImport> {
  const { telecharger, decoderPage, VOIX_NAVIGATEUR } = await import('./apercu.ts');
  const reponse = await telecharger(url, { limite: 3_000_000, accepte: 'text/html,application/xhtml+xml', voix: VOIX_NAVIGATEUR });
  const page = lirePageImportee(decoderPage(reponse.octets, reponse.type), reponse.url);
  if (!page.liens.length && !page.reseaux.length) throw new Error('Aucun lien trouvé sur cette page.');
  let avatar = '';
  if (page.avatar && !db.lireReglages(compte).profil.avatar) {
    try {
      const image = await telecharger(page.avatar, { limite: 3_000_000, accepte: 'image/webp,image/jpeg,image/png', voix: VOIX_NAVIGATEUR });
      const o = image.octets;
      const extension = o.subarray(0, 4).toString('latin1') === 'RIFF' && o.subarray(8, 12).toString('latin1') === 'WEBP' ? 'webp'
        : o[0] === 0xff && o[1] === 0xd8 ? 'jpg'
        : o.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) ? 'png' : null;
      if (extension) avatar = `/media/${db.ajouterMedia(compte, new Uint8Array(o), extension)}.${extension}`;
    } catch { /* la photo ne vient pas : les liens, eux, sont là */ }
  }
  return appliquerImport(compte, page, { vitrine, langue, avatar });
}
