/*
 * La note d'un bloc « Avis et preuves », lue toute seule sur la page de ses avis (24 octobre 2026, Lilian : « ya une
 * solution pour récupérer juste la note ? »). Trustpilot, Avis Vérifiés et la plupart des sites d'avis déclarent la
 * note et le nombre d'avis pour Google, dans les données structurées de la page (`aggregateRating`) ; Trustpilot les
 * redit dans ses données de page. Une page qui n'en déclare pas ne donne rien, et la note tapée à la main reste.
 * La note d'une fiche Google ne se lit pas ainsi : il faudrait l'API Places, et sa clé.
 *
 * Le serveur relit chaque jour les notes des pages qui en ont une (`planifierAvis`) : la page suit ses avis sans
 * qu'on y touche.
 */
import type { Bloc, NoteAvis } from '../lib/types.ts';
import { sourceDe } from '../lib/avis.ts';
import * as db from './db.ts';

const nombre = (v: unknown) => { const n = Number(typeof v === 'string' ? v.replace(',', '.').replace(/[\s  ]/g, '') : v); return Number.isFinite(n) ? n : NaN; };
/** Une note ramenée sur 5, à un chiffre après la virgule ; null hors de l'échelle. */
function surCinq(valeur: unknown, meilleure: unknown): number | null {
  const v = nombre(valeur), max = nombre(meilleure) || 5;
  if (!(v > 0) || !(max > 0) || v > max) return null;
  return Math.round((v / max) * 50) / 10;
}

/** La première note déclarée dans le JSON-LD de la page (`aggregateRating`, ou un `AggregateRating` posé seul). */
function noteJsonLd(html: string): Omit<NoteAvis, 'source'> | null {
  for (const [, texte] of html.matchAll(/<script\b[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let pile: unknown[];
    try { pile = [JSON.parse(texte)]; } catch { continue; }
    for (let n = pile.pop(); n !== undefined; n = pile.pop()) {
      if (!n || typeof n !== 'object') continue;
      if (Array.isArray(n)) { pile.push(...n); continue; }
      const o = n as Record<string, unknown>;
      const r = (o['@type'] === 'AggregateRating' ? o : o.aggregateRating) as Record<string, unknown> | undefined;
      if (r && typeof r === 'object') {
        const note = surCinq(r.ratingValue, r.bestRating);
        const avis = Math.round(nombre(r.reviewCount) || nombre(r.ratingCount) || 0);
        if (note !== null && avis > 0) return { note, nombre: avis };
      }
      pile.push(...Object.values(o).filter(v => v && typeof v === 'object'));
    }
  }
  return null;
}

/** Trustpilot redit sa note dans les données de sa page (`"trustScore":4.6,"numberOfReviews":1234`). */
function noteTrustpilot(html: string): Omit<NoteAvis, 'source'> | null {
  const score = /"trustScore"\s*:\s*([\d.]+)/.exec(html)?.[1];
  const avis = /"numberOfReviews"\s*:\s*\{?\s*(?:"total"\s*:\s*)?(\d+)/.exec(html)?.[1];
  const note = surCinq(score, 5);
  return note !== null && Number(avis) > 0 ? { note, nombre: Number(avis) } : null;
}

/** La note lue dans le texte d'une page d'avis ; null si elle n'en déclare pas. */
export function noteDePage(html: string, url: string): NoteAvis | null {
  const lue = noteJsonLd(html) ?? (sourceDe(url) === 'Trustpilot' ? noteTrustpilot(html) : null);
  if (!lue) return null;
  const nom = /<meta\b[^>]*property\s*=\s*["']og:site_name["'][^>]*content\s*=\s*["']([^"']{1,30})["']/i.exec(html)?.[1]?.trim() ?? '';
  return { ...lue, source: sourceDe(url) || nom };
}

/** La note de la page d'avis à cette adresse, lue en entier (les données structurées sont souvent dans le corps). */
export async function lireNote(url: string): Promise<NoteAvis | null> {
  try {
    // Chargé à la demande : `planifierAvis` est appelé au chargement des server functions, et l'aperçu (node:net) ne doit pas
    // suivre ce module dans le bundle du navigateur.
    const { VOIX_NAVIGATEUR, decoderPage, telecharger } = await import('./apercu.ts');
    const page = await telecharger(url, { limite: 3_000_000, accepte: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5', voix: VOIX_NAVIGATEUR });
    return noteDePage(decoderPage(page.octets, page.type), page.url);
  } catch { return null; }
}

/** Un bloc dont la note se relit : une note d'avis, avec l'adresse de ses avis. */
export const noteARelire = (b: Bloc) => b.type === 'preuve' && b.preuve?.genre === 'note' && /^https?:\/\//.test(b.url);

/** Relit la note de chaque bloc d'avis de toutes les pages, et l'écrit quand elle a changé. Une page muette ne change rien. */
export async function relireNotes(lire = lireNote, maintenant = Date.now()): Promise<number> {
  let changees = 0;
  for (const c of db.listerComptes(maintenant)) {
    for (const b of db.lireBlocs(c.id).filter(noteARelire)) {
      const n = await lire(b.url);
      if (!n || !b.preuve || (n.note === b.preuve.note && n.nombre === b.preuve.nombre)) continue;
      db.enregistrerBloc(c.id, { ...b, preuve: { ...b.preuve, note: n.note, nombre: n.nombre, source: b.preuve.source || n.source } });
      changees++;
    }
  }
  return changees;
}

let minuteur: ReturnType<typeof setInterval> | null = null;
/** Relit les notes une fois par jour, et une première fois peu après le démarrage. */
export function planifierAvis(env: Record<string, string | undefined> = process.env) {
  if (minuteur || env.HOPLA_AVIS === '0') return;
  const tour = () => { relireNotes().catch(error => console.error('[liens] avis', (error as Error).message)); };
  minuteur = setInterval(tour, 86_400_000);
  minuteur.unref?.();
  setTimeout(tour, 300_000).unref?.();
}
