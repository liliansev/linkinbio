/*
 * Les étapes de « Bien démarrer », en tête de l'onglet Liens tant que la page
 * n'est pas prête. Chacune se coche toute seule quand la page la remplit.
 */

import type { Bloc, Reglages, Reseau } from './types.ts';
import { TYPES_VITRINE } from './types.ts';
import { adresse, adresseSaisie } from './valider.ts';
import { THEME_DEFAUT } from './themes.ts';

export type Destination = 'photo' | 'bio' | 'theme' | 'reseaux' | 'lien';

export interface Etape { id: Destination | 'partage'; nom: string; aide: string; faite: boolean }

/** `themeVu` : les thèmes ont été regardés ; garder celui de départ est un choix, pas un oubli. */
export function etapesDemarrage(reglages: Reglages, blocs: Bloc[], partagee: boolean, themeVu = false): Etape[] {
  // Un produit ou une prise de rendez-vous compte comme un lien : la page mène déjà quelque part.
  const liens = blocs.filter(b => (b.type === 'lien' || TYPES_VITRINE.includes(b.type)) && b.public && b.url).length;
  return [
    { id: 'photo', nom: 'Ajoute ta photo', aide: 'Un visage rassure avant de cliquer.', faite: !!reglages.profil.avatar },
    { id: 'bio', nom: 'Écris ta bio', aide: 'Une phrase : ce que tu fais, pour qui.', faite: !!reglages.profil.bio.trim() },
    { id: 'lien', nom: 'Ajoute tes liens', aide: 'Ton site, ta prise de rendez-vous, ta boutique.', faite: liens >= 1 },
    { id: 'reseaux', nom: 'Relie tes réseaux', aide: 'Leurs icônes s’affichent sous ton nom.', faite: reglages.reseaux.some(r => !!adresseSaisie(r.url)) },
    { id: 'theme', nom: 'Choisis ton thème', aide: 'Des plus sobres aux plus audacieux, en un geste.', faite: themeVu || reglages.theme !== THEME_DEFAUT },
    { id: 'partage', nom: 'Partage ta page', aide: 'Colle l’adresse dans ta bio Instagram ou TikTok.', faite: partagee },
  ];
}

/**
 * « Bien démarrer » ne sert qu'à une page qui n'a pas encore commencé : jamais
 * au compte principal, ni à une page que quelqu'un a déjà vue, ni à une page
 * qui a déjà des blocs. Ce sont des faits du serveur, pas des marques du
 * navigateur : la liste ne revient pas sur un autre appareil (20 octobre 2026).
 */
export const demarrageUtile = (f: { principal: boolean; dejaVue: boolean; blocs: number }) => !f.principal && !f.dejaVue && f.blocs === 0;

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
/** Les réseaux dont un pseudo suffit à faire l'adresse, dans l'ordre de l'accueil : un « @lilian » tapé dans le choix des blocs en prend un. */
export const RESEAUX_PSEUDO = RESEAUX_ACCUEIL.filter(r => PROFILS[r]);

/**
 * Ce qu'on tape pour un réseau devient son adresse : un pseudo (avec ou sans
 * @) ou une adresse complète. Vide si la saisie ne mène nulle part.
 */
export function urlReseau(reseau: Reseau, saisie: string): string {
  const s = saisie.trim();
  if (!s) return '';
  if (reseau === 'email') return s.includes('@') && !s.includes('/') ? adresse(s.replace(/^mailto:/i, '')) : '';
  if (/^https?:\/\//i.test(s) || s.includes('/')) {
    const url = adresseSaisie(s);
    // Spotify n'a pas de pseudo : seule l'adresse d'une page Spotify mène quelque part.
    if (reseau === 'spotify' && url && !/^https?:\/\/([\w-]+\.)*spotify\.(com|link)(\/|$)/i.test(url)) return '';
    return url;
  }
  // Un site se tape sans https : « ton-site.fr » suffit.
  if (reseau === 'site') return adresseSaisie(s);
  const pseudo = s.replace(/^@/, '');
  const profil = PROFILS[reseau];
  return profil && /^[\w.-]{1,60}$/.test(pseudo) ? profil(pseudo) : '';
}

/**
 * L'inverse d'`urlReseau` pour l'affichage : l'adresse d'un profil se relit en
 * pseudo (« @marie »). Une autre adresse reste telle quelle.
 */
export function pseudoReseau(reseau: Reseau, url: string): string {
  if (reseau === 'email') return url.replace(/^mailto:/i, '');
  const profil = PROFILS[reseau];
  if (!profil) return url;
  const [avant, apres] = profil('\u0000').split('\u0000');
  const sans = url.replace(/^https?:\/\/(www\.)?/i, 'https://').replace(/\/$/, '');
  if (!sans.toLowerCase().startsWith(avant.toLowerCase()) || apres) return url;
  const pseudo = sans.slice(avant.length);
  return /^[\w.-]{1,60}$/.test(pseudo) ? `@${pseudo}` : url;
}

/** Le nom d'un site d'après son adresse, quand il ne donne pas le sien : `https://www.atelier-marie.fr/x` devient « Atelier Marie », jamais une adresse brute. */
export function nomSite(url: string): string {
  let hote: string;
  try { hote = new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
  const parts = hote.split('.');
  // Le nom est la partie avant l'extension (calendly.com, boutique.co.uk) ; une adresse IP ou locale reste telle quelle.
  const fin = parts.length > 2 && /^(co|com|org|net|gouv)$/.test(parts[parts.length - 2]) ? 3 : 2;
  const nom = parts.length >= 2 ? parts[parts.length - fin] : hote;
  if (!nom || /^\d+$/.test(nom)) return hote;
  return MARQUES[nom.toLowerCase()] ?? nom.split('-').filter(Boolean).map(m => m[0].toUpperCase() + m.slice(1)).join(' ');
}
/** Les noms qui ne s'écrivent pas comme leur adresse (youtube.com donne « YouTube », pas « Youtube »). */
const MARQUES: Record<string, string> = {
  youtube: 'YouTube', youtu: 'YouTube', linkedin: 'LinkedIn', tiktok: 'TikTok', github: 'GitHub', paypal: 'PayPal', whatsapp: 'WhatsApp', wa: 'WhatsApp',
  soundcloud: 'SoundCloud', ebay: 'eBay', linktr: 'Linktree', bandcamp: 'Bandcamp', onlyfans: 'OnlyFans', helloasso: 'HelloAsso', leboncoin: 'leboncoin',
};

const HOTES_RESEAUX: Record<string, Reseau> = {
  'instagram.com': 'instagram', 'tiktok.com': 'tiktok', 'youtube.com': 'youtube', 'youtu.be': 'youtube', 'linkedin.com': 'linkedin',
  'x.com': 'x', 'twitter.com': 'x', 'threads.net': 'threads', 'threads.com': 'threads', 'facebook.com': 'facebook', 'twitch.tv': 'twitch',
  'spotify.com': 'spotify', 'open.spotify.com': 'spotify', 'github.com': 'github',
};
/** Le réseau d'une adresse (instagram.com/marie → instagram), pour lui donner son icône d'office. */
export function reseauDeUrl(url: string): Reseau | null {
  try { return HOTES_RESEAUX[new URL(url).hostname.toLowerCase().replace(/^(www|m)\./, '')] ?? null; } catch { return null; }
}
