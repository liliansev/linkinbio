/*
 * Les liens déjà posés passent au favicon de leur site (26 octobre 2026, demandé par Lilian : « mets à jour tous les
 * liens existants et même ceux de mes clients »). Une seule fois, peu après le démarrage, pour toutes les pages : la
 * vignette d'un bouton qui a une image prend le favicon de son site, dans sa meilleure taille. Un site sans favicon,
 * un réseau (son icône), la grande image d'une carte, ou une page pleine (quota) gardent ce qu'ils ont. L'image
 * d'avant se garde dans `vignettes_avant` : `rendreVignettes()` la remet.
 *
 * Une seconde fois le 5 novembre 2026 (demandé par Lilian : « les favicons carrés se mettent sur un fond blanc pas très
 * beau ») : depuis le 26 octobre, le back office posait le favicon d'un lien neuf sur du blanc, en WebP. Les liens
 * passés au favicon depuis, sans PNG et jamais repris, le reprennent seul, en PNG, que la page pose sans fond.
 */
import type { Bloc } from '../lib/types.ts';
import { reseauDeUrl } from '../lib/demarrage.ts';
import * as db from './db.ts';

const REPERE = 'favicons-liens';
const REPERE_SANS_FOND = 'favicons-sans-fond';
type Favicon = { octets: Uint8Array; extension: db.ExtensionMedia } | null;

/** Un bouton de lien vers un site, avec une image dans sa vignette. */
export const vignetteARelire = (b: Bloc) => b.type === 'lien' && !!b.image && /^https?:\/\//i.test(b.url)
  && !reseauDeUrl(b.url) && !(b.vedette && b.format === 'carte');

/** Un lien qui n'a pas encore son favicon seul : pas de PNG, et pas déjà repris une fois (son image a été choisie depuis). */
export const vignetteSurFond = (dejaRepris: Set<string>) => (b: Bloc) => vignetteARelire(b) && !b.image!.endsWith('.png') && !dejaRepris.has(b.id);

/** Le favicon d'un site, prêt à garder ; null s'il n'en a pas, ou dans un format qu'on ne garde pas. */
export async function lireFavicon(url: string): Promise<Favicon> {
  try {
    // Chargé à la demande, comme dans avis.ts : l'aperçu (node:net) ne suit pas ce module dans le bundle du navigateur.
    const { apercuSite } = await import('./apercu.ts');
    const site = await apercuSite(url, { image: 'logo' });
    const m = site.image && /^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(site.image);
    if (!m) return null;
    return { octets: new Uint8Array(Buffer.from(m[2], 'base64')), extension: m[1] === 'jpeg' ? 'jpg' : m[1] as db.ExtensionMedia };
  } catch { return null; }
}

/** Passe chaque vignette de lien de toutes les pages au favicon de son site ; le nombre de liens changés. */
export async function passerAuxFavicons(lire = lireFavicon, aRelire: (b: Bloc) => boolean = vignetteARelire): Promise<number> {
  let changes = 0;
  const parSite = new Map<string, Favicon>();
  for (const c of db.listerComptes()) {
    for (const b of db.lireBlocs(c.id).filter(aRelire)) {
      let origine: string;
      try { origine = new URL(b.url).origin; } catch { continue; }
      if (!parSite.has(origine)) parSite.set(origine, await lire(b.url));
      const f = parSite.get(origine);
      if (!f) continue;
      try {
        const image = `/media/${db.ajouterMedia(c.id, f.octets, f.extension)}.${f.extension}`;
        db.garderVignette(c.id, b.id, b.image, image);
        db.enregistrerBloc(c.id, { ...b, image });
        changes++;
      } catch { /* une page pleine garde son image */ }
    }
  }
  return changes;
}

/** Remet l'image d'avant à chaque lien passé au favicon, s'il a encore ce favicon. */
export function rendreVignettes(): number {
  let rendues = 0;
  for (const v of db.vignettesGardees()) {
    const b = db.lireBlocs(v.compte).find(x => x.id === v.bloc);
    if (!b || b.image !== v.favicon) continue;
    db.enregistrerBloc(v.compte, { ...b, image: v.image });
    rendues++;
  }
  return rendues;
}

/**
 * Une fois pour toutes, une minute après le démarrage ; `HOPLA_FAVICONS=0` l'éteint. Une base qui n'a jamais été
 * reprise passe tout au favicon ; une base reprise le 26 octobre ne reprend que les favicons posés sur du blanc depuis.
 */
export function planifierFavicons(env: Record<string, string | undefined> = process.env) {
  if (env.HOPLA_FAVICONS === '0' || (db.repere(REPERE) && db.repere(REPERE_SANS_FOND))) return;
  setTimeout(() => {
    if (db.repere(REPERE) && db.repere(REPERE_SANS_FOND)) return;
    const aRelire = db.repere(REPERE) ? vignetteSurFond(new Set(db.vignettesGardees().map(v => v.bloc))) : vignetteARelire;
    db.poserRepere(REPERE);
    db.poserRepere(REPERE_SANS_FOND);
    passerAuxFavicons(lireFavicon, aRelire)
      .then(n => console.log(`[liens] favicons : ${n} liens passés au favicon de leur site`))
      .catch(error => console.error('[liens] favicons', (error as Error).message));
  }, 60_000).unref?.();
}
