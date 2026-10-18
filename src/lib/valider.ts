import { ANIMATIONS, ANIMATIONS_BLOC, FORMATS_VEDETTE, FORMES_BOUTON, MISES_EN_PAGE_BUREAU, RESEAUX, STYLES_BOUTON, TEINTES_VEDETTE, TYPES_BLOC } from './types.ts';
import type { Bloc, Reglages } from './types.ts';
import { idTheme } from './themes.ts';
import { EFFETS_CRENEAU, fuseauValide } from './moments.ts';
import type { Creneau } from './moments.ts';
import { AUDIENCES, EFFETS_AUDIENCE } from './provenance.ts';
import type { Audience, EffetAudience } from './provenance.ts';

/*
 * Tout ce qui arrive du navigateur passe ici avant la base : chaque champ est
 * borné, chaque énumération vérifiée, chaque adresse contrôlée. Une valeur
 * inattendue est remplacée par sa valeur par défaut plutôt que refusée.
 */

const texte = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '');
const bool = (v: unknown, defaut: boolean) => (typeof v === 'boolean' ? v : defaut);
const parmi = <T extends string>(v: unknown, liste: readonly T[], defaut: T): T => (liste.includes(v as T) ? (v as T) : defaut);

/** Une adresse cliquable : http(s), mailto, tel, ou un chemin du site. */
export function adresse(v: unknown): string {
  let s = texte(v, 2000);
  if (!s) return '';
  if (s.startsWith('/') && !s.startsWith('//') && !s.startsWith('/\\')) return s;
  if (/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(s)) s = `mailto:${s}`;
  else if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = `https://${s}`;
  try {
    const url = new URL(s);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

/** Une image : seulement nos médias, l'avatar livré, ou https. */
export function image(v: unknown): string {
  const s = texte(v, 2000);
  // `/liens/...` : les adresses d'avant hopla.page, dans un back office ouvert avant la mise à jour.
  const m = /^(?:\/liens)?(\/(media\/[\w-]+\.(webp|jpg)|avatar\.webp))$/.exec(s);
  if (m) return m[1];
  if (s.startsWith('https://')) { try { return new URL(s).href; } catch { return ''; } }
  return '';
}

const date = (v: unknown) => { const s = texte(v, 40); return s && !Number.isNaN(Date.parse(s)) ? new Date(s).toISOString() : ''; };

const heure = (v: unknown, defaut: string) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : defaut);

/** Un créneau hebdomadaire, ou null s'il ne vise aucun jour. */
export function creneau(v: unknown): Creneau | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const jours = Array.isArray(o.jours) ? [...new Set(o.jours.map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 7))].sort() : [];
  if (!jours.length) return null;
  return { jours, de: heure(o.de, '09:00'), a: heure(o.a, '18:00'), fuseau: fuseauValide(o.fuseau), effet: parmi(o.effet, EFFETS_CRENEAU, 'avant') };
}

/** Les provenances visées par un bloc, ou null s'il n'en vise aucune. */
export function audience(v: unknown): { sources: Audience[]; effet: EffetAudience } | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const sources = Array.isArray(o.sources) ? AUDIENCES.filter(a => (o.sources as unknown[]).includes(a)) : [];
  return sources.length ? { sources, effet: parmi(o.effet, EFFETS_AUDIENCE, 'avant') } : null;
}

/** Les noms d'avant le 16 octobre 2026, gardés pour les blocs déjà enregistrés. */
const ANCIENNES: Record<string, string> = { brille: 'reflet', pulse: 'respiration', secoue: 'secousse' };

export function validerBloc(v: unknown, id: string): Bloc {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const type = parmi(o.type, TYPES_BLOC, 'lien');
  return {
    id,
    type,
    titre: texte(o.titre, type === 'texte' ? 1000 : 160),
    url: adresse(o.url),
    sousTitre: texte(o.sousTitre, 240),
    description: texte(o.description, 400),
    icone: texte(o.icone, 24),
    image: image(o.image),
    public: bool(o.public, true),
    indexable: bool(o.indexable, true),
    vedette: bool(o.vedette, false),
    format: parmi(o.format, FORMATS_VEDETTE, 'bandeau'),
    teinte: parmi(o.teinte, TEINTES_VEDETTE, 'accent'),
    animation: parmi(ANCIENNES[o.animation as string] ?? o.animation, ANIMATIONS_BLOC, 'auto'),
    debut: date(o.debut),
    fin: date(o.fin),
    compteARebours: bool(o.compteARebours, false),
    creneau: creneau(o.creneau),
    audience: audience(o.audience),
    demanderPrenom: bool(o.demanderPrenom, false),
  };
}

export function validerReglages(v: unknown, base: Reglages): Reglages {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, any>;
  const profil = o.profil ?? {}, bouton = o.bouton ?? {}, seo = o.seo ?? {};
  const reseaux = Array.isArray(o.reseaux) ? o.reseaux : base.reseaux;
  return {
    profil: {
      nom: texte(profil.nom, 80) || base.profil.nom,
      bio: texte(profil.bio, 300),
      avatar: image(profil.avatar),
      badge: bool(profil.badge, base.profil.badge),
    },
    reseaux: reseaux.slice(0, 12).map((r: any) => ({ reseau: parmi(r?.reseau, RESEAUX, 'site'), url: adresse(r?.url) })).filter((r: { url: string }) => r.url),
    reseauxPosition: parmi(o.reseauxPosition, ['haut', 'bas'] as const, base.reseauxPosition),
    theme: idTheme(o.theme),
    bouton: { style: parmi(bouton.style, STYLES_BOUTON, 'plein'), forme: parmi(bouton.forme, FORMES_BOUTON, 'pilule') },
    seo: { titre: texte(seo.titre, 80), description: texte(seo.description, 200), indexable: bool(seo.indexable, true) },
    partage: bool(o.partage, base.partage),
    ouvrirApps: bool(o.ouvrirApps, base.ouvrirApps ?? true),
    bureau: parmi(o.bureau, MISES_EN_PAGE_BUREAU, base.bureau),
    animation: parmi(o.animation, ANIMATIONS, base.animation),
  };
}

/** Les adresses déjà prises par l'application, ou qui prêteraient à confusion. */
const PSEUDOS_RESERVES = new Set([
  'admin', 'api', 'media', 'assets', 'liens', 'hopla', 'avatar', 'healthz', 'mentions-legales', 'cgu', 'tarifs', 'prix', 'pro', 'legal', 'signaler', 'signalement', 'lilian', 'liliansevoumian', 'principal', 'connexion', 'inscription', 'compte', 'comptes',
  'aide', 'support', 'contact', 'blog', 'login', 'signup', 'app', 'www', 'static', 'demo', 'root', 'null', 'undefined', 'favicon', 'robots', 'sitemap',
]);

/** Un pseudo : 3 à 30 caractères, minuscules, chiffres et tirets, ni réservé. Vide si refusé. */
export function pseudo(v: unknown): string {
  const s = texte(v, 40).toLowerCase();
  return /^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/.test(s) && !s.includes('--') && !PSEUDOS_RESERVES.has(s) ? s : '';
}

/** Une adresse e-mail plausible, en minuscules. Vide si refusée. */
export function email(v: unknown): string {
  const s = texte(v, 200).toLowerCase();
  return /^[^\s@<>"',;]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s) ? s : '';
}
