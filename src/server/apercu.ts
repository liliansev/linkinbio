import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

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

/** Une adresse IP du réseau local, de la machine ou réservée. */
export function estPrivee(ip: string): boolean {
  const v4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  if (isIP(v4) === 4) {
    const [a, b] = v4.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v6 = ip.toLowerCase();
  return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80');
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
      headers: { accept: accepte, 'user-agent': 'Mozilla/5.0 (compatible; liliansevoumian-liens/1.0; +https://liliansevoumian.fr/liens/)' },
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
    titre: (meta['og:title'] || meta['twitter:title'] || decoder(titreBalise)).trim().slice(0, 160),
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
