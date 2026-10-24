/*
 * Les flux que lisent « Mes derniers articles » et « Ma dernière vidéo YouTube » (24 octobre 2026) : le serveur va les
 * chercher, comme l'aperçu d'un site (une adresse publique vérifiée à la connexion, huit redirections au plus, 2 Mo), et les
 * garde 30 minutes, 5 après un échec : mille visiteurs d'une page ne font qu'une lecture. Le visiteur ne parle qu'à Hopla.
 */
import type { ArticleFlux } from '../lib/flux.ts';
import { estFlux, fluxAnnonce, fluxChaine, fluxVideosLongues, idChaine, lireFlux } from '../lib/flux.ts';
import { chaineYoutube } from '../lib/detection.ts';
import { ARTICLES_FLUX, PRINCIPAL, estEnLigne } from '../lib/types.ts';
import { decoderPage, telecharger } from './apercu.ts';
import * as db from './db.ts';
import { droits } from './droits.ts';
import type { Env } from './courriel.ts';

const LIMITE = 2_000_000;
const ACCEPTE = 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, text/html;q=0.8, */*;q=0.5';
const GARDE = 30 * 60_000;
const GARDE_ECHEC = 5 * 60_000;
/** Au-delà, les lectures les plus anciennes s'en vont : la mémoire ne grossit pas sans fin. */
const MAX_GARDES = 2000;

/** Un texte lu à une adresse, et l'adresse où il a fini (après ses redirections). Une page s'arrête à la fin de son `<head>`. */
async function lire(url: string): Promise<{ texte: string; url: string }> {
  const r = await telecharger(url, { limite: LIMITE, accepte: ACCEPTE, coupe: true });
  if (r.statut >= 400) throw new Error(`Réponse ${r.statut}`);
  return { texte: decoderPage(r.octets, r.type), url: r.url };
}

/** Les articles du flux à cette adresse, ou du flux que sa page annonce. */
async function articlesDuSite(url: string): Promise<ArticleFlux[]> {
  const page = await lire(url);
  if (estFlux(page.texte)) return lireFlux(page.texte, page.url);
  const annonce = fluxAnnonce(page.texte, page.url);
  if (!annonce) throw new Error('Pas de flux.');
  const flux = await lire(annonce);
  if (!estFlux(flux.texte)) throw new Error('Pas de flux.');
  return lireFlux(flux.texte, flux.url);
}

/**
 * Les dernières vidéos d'une chaîne : son identifiant se lit dans l'adresse ou dans sa page, puis ses vidéos longues
 * (sans les Shorts), ou toutes si cette liste ne répond pas.
 */
async function videosDeLaChaine(url: string): Promise<ArticleFlux[]> {
  const id = idChaine(url) || idChaine((await lire(url)).texte);
  if (!id) throw new Error('Chaîne introuvable.');
  for (const adresse of [fluxVideosLongues(id), fluxChaine(id)]) {
    try {
      const flux = await lire(adresse);
      const videos = estFlux(flux.texte) ? lireFlux(flux.texte, flux.url).filter(a => a.video) : [];
      if (videos.length) return videos;
    } catch { /* la liste suivante */ }
  }
  throw new Error('Aucune vidéo.');
}

const gardes = new Map<string, { quand: number; duree: number; articles: Promise<ArticleFlux[]> }>();

/** Les derniers articles d'un site (`video` : les dernières vidéos d'une chaîne YouTube), gardés un moment. */
export function articlesDe(url: string, { video = false } = {}, maintenant = Date.now()): Promise<ArticleFlux[]> {
  const cle = `${video ? 'v' : 'a'}:${url}`;
  const garde = gardes.get(cle);
  if (garde && maintenant - garde.quand < garde.duree) return garde.articles;
  const articles = (video || chaineYoutube(url) ? videosDeLaChaine(url) : articlesDuSite(url));
  const entree = { quand: maintenant, duree: GARDE, articles };
  gardes.delete(cle);
  gardes.set(cle, entree);
  if (gardes.size > MAX_GARDES) gardes.delete(gardes.keys().next().value!);
  // Un échec se retente plus tôt ; la promesse rejetée reste gardée d'ici là, sans relancer de lecture.
  articles.catch(() => { entree.duree = GARDE_ECHEC; });
  return articles;
}

/** Pour les tests : oublier ce qui a été lu. */
export const oublierFlux = () => gardes.clear();

/**
 * Ce que montre le bloc d'une page publique : ses trois derniers articles (`flux`, Pro), ou sa dernière vidéo
 * (`derniere-video`, à tous). Null si le bloc n'existe pas, n'est pas en ligne ou n'est plus compris dans l'offre ; une
 * liste vide si le flux ne se lit pas (la page montre alors un simple lien).
 */
export async function articlesDuBloc(pseudo: unknown, id: unknown, maintenant = Date.now(), env: Env = process.env): Promise<ArticleFlux[] | null> {
  const compte = typeof pseudo === 'string' && pseudo ? db.compteParPseudo(pseudo) : db.compteParId(PRINCIPAL);
  if (!compte || compte.statut !== 'actif') return null;
  const bloc = db.lireBlocs(compte.id).find(b => b.id === id && (b.type === 'flux' || b.type === 'derniere-video') && estEnLigne(b, maintenant));
  if (!bloc || !/^https?:/.test(bloc.url) || (bloc.type === 'flux' && !droits(compte, env, maintenant).flux)) return null;
  const video = bloc.type === 'derniere-video';
  try { return (await articlesDe(bloc.url, { video }, maintenant)).slice(0, video ? 1 : ARTICLES_FLUX); }
  catch { return []; }
}
