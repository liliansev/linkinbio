/*
 * Les étapes de « Bien démarrer », en tête de l'onglet Liens tant que la page
 * n'est pas prête. Chacune se coche toute seule quand la page la remplit.
 */

import type { Bloc, Reglages, Reseau } from './types.ts';
import { adresse } from './valider.ts';
import { THEME_DEFAUT } from './themes.ts';

export type Destination = 'photo' | 'bio' | 'theme' | 'reseaux' | 'lien';

export interface Etape { id: Destination | 'partage'; nom: string; aide: string; faite: boolean }

export function etapesDemarrage(reglages: Reglages, blocs: Bloc[], partagee: boolean): Etape[] {
  const liens = blocs.filter(b => b.type === 'lien' && b.public && b.url).length;
  return [
    { id: 'photo', nom: 'Ajoute ta photo', aide: 'Un visage rassure avant de cliquer.', faite: !!reglages.profil.avatar },
    { id: 'bio', nom: 'Écris ta bio', aide: 'Une phrase : ce que tu fais, pour qui.', faite: !!reglages.profil.bio.trim() },
    { id: 'lien', nom: 'Ajoute trois liens', aide: liens ? `${liens} sur 3 pour l’instant.` : 'Ton site, ta prise de rendez-vous, ta boutique.', faite: liens >= 3 },
    { id: 'reseaux', nom: 'Relie tes réseaux', aide: 'Leurs icônes s’affichent sous ton nom.', faite: reglages.reseaux.some(r => r.url.trim()) },
    { id: 'theme', nom: 'Choisis ton thème', aide: 'Des plus sobres aux plus audacieux, en un geste.', faite: reglages.theme !== THEME_DEFAUT },
    { id: 'partage', nom: 'Partage ta page', aide: 'Colle l’adresse dans ta bio Instagram ou TikTok.', faite: partagee },
  ];
}

/* ---- Les premiers pas : l'arrivée d'un compte neuf ---- */

/** Une page tout juste créée : rien n'y a encore été posé. Les premiers pas ne s'ouvrent que sur elle. */
export const pageNeuve = (r: Reglages, blocs: Bloc[]) =>
  blocs.length === 0 && !r.profil.avatar && !r.profil.bio.trim() && !r.reseaux.some(x => x.url.trim());

/** Dix thèmes pour démarrer, du plus sobre au plus affirmé : assez pour choisir, pas trop pour hésiter. Les autres attendent dans Design. */
export const THEMES_ACCUEIL = ['nuit-peche', 'neige', 'sauge', 'champagne', 'marine', 'aurore', 'coucher', 'klein', 'riso', 'galaxie'];

/** Les réseaux proposés d'abord, puis les autres. */
export const RESEAUX_ACCUEIL: Reseau[] = ['instagram', 'tiktok', 'youtube', 'linkedin', 'x', 'threads', 'facebook', 'twitch', 'spotify', 'github', 'email'];

const PROFILS: Partial<Record<Reseau, (p: string) => string>> = {
  instagram: p => `https://instagram.com/${p}`,
  tiktok: p => `https://tiktok.com/@${p}`,
  youtube: p => `https://youtube.com/@${p}`,
  linkedin: p => `https://linkedin.com/in/${p}`,
  x: p => `https://x.com/${p}`,
  threads: p => `https://threads.net/@${p}`,
  facebook: p => `https://facebook.com/${p}`,
  twitch: p => `https://twitch.tv/${p}`,
  github: p => `https://github.com/${p}`,
};

/**
 * Ce qu'on tape pour un réseau devient son adresse : un pseudo (avec ou sans
 * @) ou une adresse complète. Vide si la saisie ne mène nulle part.
 */
export function urlReseau(reseau: Reseau, saisie: string): string {
  const s = saisie.trim();
  if (!s) return '';
  if (reseau === 'email') return s.includes('@') && !s.includes('/') ? adresse(s.replace(/^mailto:/i, '')) : '';
  if (/^https?:\/\//i.test(s) || s.includes('/')) return adresse(s);
  const pseudo = s.replace(/^@/, '');
  const profil = PROFILS[reseau];
  return profil && /^[\w.-]{1,60}$/.test(pseudo) ? profil(pseudo) : '';
}

/** Le nom d'un site d'après son adresse, quand il ne donne pas le sien : `https://www.atelier-marie.fr/x` devient `atelier-marie.fr`. */
export function nomSite(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}
