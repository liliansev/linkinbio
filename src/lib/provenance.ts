import type { Bloc } from './types.ts';

/*
 * D'où vient le visiteur. Trois indices, du plus sûr au moins sûr : le
 * paramètre `?s=` (ou `utm_source`) que la personne met dans sa bio, le
 * navigateur intégré de l'app (Instagram, TikTok… se nomment dans leur
 * user agent, même quand ils taisent le référent), puis le site d'origine.
 * Sert à la page qui s'adapte à son public et aux statistiques.
 */

export const AUDIENCES = ['instagram', 'tiktok', 'youtube', 'linkedin', 'x', 'facebook', 'threads', 'snapchat', 'qr', 'newsletter', 'email', 'google'] as const;
export type Audience = (typeof AUDIENCES)[number];

export const NOMS_AUDIENCES: Record<Audience, string> = {
  instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', linkedin: 'LinkedIn', x: 'X', facebook: 'Facebook', threads: 'Threads',
  snapchat: 'Snapchat', qr: 'QR code', newsletter: 'Newsletter', email: 'E-mail', google: 'Google',
};

const ALIAS: Record<string, Audience> = {
  ig: 'instagram', insta: 'instagram', tt: 'tiktok', yt: 'youtube', li: 'linkedin', twitter: 'x', fb: 'facebook', snap: 'snapchat',
  nl: 'newsletter', mail: 'email', 'e-mail': 'email',
};

/** Le navigateur intégré d'une app, d'après son user agent. */
const APPS: [RegExp, Audience][] = [
  [/Barcelona/i, 'threads'], [/Instagram/i, 'instagram'], [/musical_ly|BytedanceWebview|TikTok/i, 'tiktok'],
  [/LinkedInApp/i, 'linkedin'], [/FBAN|FBAV|FB_IAB|FBIOS/i, 'facebook'], [/Snapchat/i, 'snapchat'], [/Twitter/i, 'x'],
];

const SITES: [RegExp, Audience][] = [
  [/(^|\.)instagram\.com$/, 'instagram'], [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'], [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'linkedin'],
  [/(^|\.)(t\.co|x\.com|twitter\.com)$/, 'x'], [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, 'facebook'], [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)threads\.(net|com)$/, 'threads'], [/(^|\.)snapchat\.com$/, 'snapchat'], [/(^|\.)(mail\.google\.com|outlook\.[a-z.]+)$/, 'email'], [/(^|\.)google\.[a-z.]+$/, 'google'],
];

/** Le paramètre `?s=` lu comme une audience connue, ou vide. */
export function audienceDuParametre(s: string): Audience | '' {
  const v = s.trim().toLowerCase().slice(0, 40);
  if (!v) return '';
  if ((AUDIENCES as readonly string[]).includes(v)) return v as Audience;
  return ALIAS[v] ?? '';
}

export function audienceDeLApp(ua: string): Audience | '' {
  return APPS.find(([motif]) => motif.test(ua))?.[1] ?? '';
}

export function audienceDuSite(referent: string): Audience | '' {
  let hote = '';
  try { hote = new URL(referent).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
  return SITES.find(([motif]) => motif.test(hote))?.[1] ?? '';
}

export function provenance({ s = '', ua = '', referent = '' }: { s?: string; ua?: string; referent?: string }): Audience | '' {
  return audienceDuParametre(s) || audienceDeLApp(ua) || audienceDuSite(referent);
}

export const EFFETS_AUDIENCE = ['avant', 'seulement'] as const;
export type EffetAudience = (typeof EFFETS_AUDIENCE)[number];

/** Ce qu'un bloc devient pour ce visiteur : retiré, laissé, ou mis en avant. */
export function selonAudience(bloc: Bloc, audience: Audience | ''): 'retire' | 'normal' | 'avant' {
  if (audience && bloc.cache?.includes(audience)) return 'retire';
  const a = bloc.audience;
  if (!a || !a.sources.length) return 'normal';
  const vise = !!audience && a.sources.includes(audience);
  if (a.effet === 'seulement') return vise ? 'normal' : 'retire';
  return vise ? 'avant' : 'normal';
}

/** Montrer ou cacher un bloc pour une provenance (l'œil de la vue par réseau). */
export function basculerPour(bloc: Bloc, audience: Audience, visible: boolean): Pick<Bloc, 'cache' | 'audience'> {
  const cache = (bloc.cache ?? []).filter(a => a !== audience);
  if (!visible) return { cache: [...cache, audience], audience: bloc.audience };
  // Un bloc réservé à d'autres réseaux s'ouvre aussi à celui-ci.
  const a = bloc.audience;
  const ouvert = a?.effet === 'seulement' && !a.sources.includes(audience) ? { ...a, sources: [...a.sources, audience] } : a;
  return { cache, audience: ouvert };
}

/** Les blocs pour ce visiteur : ceux qui visent sa provenance passent en tête, mis en avant. */
export function composerAudience(blocs: Bloc[], audience: Audience | ''): Bloc[] {
  const tete: Bloc[] = [], reste: Bloc[] = [];
  for (const bloc of blocs) {
    const effet = selonAudience(bloc, audience);
    if (effet === 'retire') continue;
    if (effet === 'avant') tete.push({ ...bloc, vedette: true });
    else reste.push(bloc);
  }
  return [...tete, ...reste];
}

/** Les réseaux proposés dans chaque lien quand le compte n'en a pas choisi à son arrivée. */
export const RESEAUX_PAR_DEFAUT: Audience[] = ['instagram', 'tiktok', 'youtube', 'linkedin', 'x', 'facebook'];

/** Les réseaux où le compte partage son lien : ceux choisis aux premiers pas, sinon les plus connus. */
export function reseauxDePartage(choisis: Audience[]): Audience[] {
  const reseaux = choisis.filter(a => RESEAUX_SOCIAUX.includes(a));
  return reseaux.length ? reseaux : RESEAUX_PAR_DEFAUT;
}

/** Les provenances qui sont des réseaux où l'on colle un lien en bio (pas le QR code, l'e-mail ni Google). */
export const RESEAUX_SOCIAUX: Audience[] = ['instagram', 'tiktok', 'youtube', 'linkedin', 'x', 'facebook', 'threads', 'snapchat'];

/** Mettre un bloc en tête (et en avant) pour une provenance, ou l'y retirer. */
export function enTetePour(bloc: Bloc, audience: Audience, oui: boolean): Pick<Bloc, 'audience'> {
  const a = bloc.audience;
  // Un bloc réservé à quelques réseaux le reste : « en tête » ne s'applique qu'aux blocs visibles partout.
  if (a?.effet === 'seulement') return { audience: a };
  const sources = (a?.sources ?? []).filter(s => s !== audience);
  if (oui) sources.push(audience);
  return { audience: sources.length ? { sources: AUDIENCES.filter(s => sources.includes(s)), effet: 'avant' } : null };
}
