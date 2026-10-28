import { ANIMATIONS, ANIMATIONS_BLOC, DISPOSITIONS, DOMAINES_COURTS, EFFETS_PAYS, MAX_PAYS, FORMATS_VEDETTE, FORMES_PHOTO, FORMES_BOUTON, GENRES_PREUVE, MAX_IMAGES, MAX_QUESTIONS, MAX_RESEAUX, MENTIONS_PARTENAIRE, OMBRES_BOUTON, MISES_EN_PAGE_BUREAU, RESEAUX, STYLES_BOUTON, TEINTES_VEDETTE, TYPES_BLOC } from './types.ts';
import type { Acces, Bloc, Cadeau, Coordonnees, Partenariat, Preuve, Question, Reglages } from './types.ts';
import { POLICES_CHOIX, idTheme } from './themes.ts';
import { EFFETS_CRENEAU, fuseauValide } from './moments.ts';
import type { Creneau } from './moments.ts';
import { AUDIENCES, EFFETS_AUDIENCE } from './provenance.ts';
import { PAYS, estPays } from './pays.ts';
import type { Audience, EffetAudience } from './provenance.ts';

/*
 * Tout ce qui arrive du navigateur passe ici avant la base : chaque champ est
 * borné, chaque énumération vérifiée, chaque adresse contrôlée. Une valeur
 * inattendue est remplacée par sa valeur par défaut plutôt que refusée, et un
 * champ qu'on ne connaît plus (les traductions, retirées le 20 octobre 2026)
 * est laissé de côté : une page enregistrée avant se lit toujours.
 */

const texte = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '');
/** Une couleur `#rrggbb`, en minuscules ; vide sinon (la couleur du thème). */
const couleur = (v: unknown) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : '');
const couleurs = (v: any) => ({ fond: couleur(v?.fond), boutons: couleur(v?.boutons), accent: couleur(v?.accent) });
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

/**
 * Une adresse tapée dans le back office : plus stricte qu'`adresse`, elle refuse
 * ce qui n'a pas l'air d'un site (« ma boutique », un mot sans point). Vide si
 * la saisie ne mène nulle part.
 */
export function adresseSaisie(v: unknown): string {
  // Des chiffres seuls ne sont pas un site (« 0612 » deviendrait l'adresse IP 0.0.1.138) : un numéro, entier ou pas.
  if (typeof v === 'string' && /^\+?[\d\s.()-]+$/.test(v.trim())) return '';
  const url = adresse(v);
  if (!url || url.startsWith('/') || !/^https?:/i.test(url)) return url;
  const hote = new URL(url).hostname;
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(hote) || hote === 'localhost' ? url : '';
}

/**
 * Un numéro de téléphone tapé (« 06 12 34 56 78 », « +33 6 12 34 56 78 ») : l'adresse `tel:` d'un lien qui l'appelle,
 * de 8 à 15 chiffres ; vide sinon.
 */
export function numeroAppel(v: string): string {
  const s = v.trim();
  if (!/^\+?[\d\s.()-]+$/.test(s)) return '';
  const n = s.replace(/\D/g, '');
  return n.length >= 8 && n.length <= 15 ? `tel:${s.startsWith('+') ? '+' : ''}${n}` : '';
}

/** Une image : seulement nos médias, l'avatar livré, ou https. */
export function image(v: unknown): string {
  const s = texte(v, 2000);
  // `/liens/...` : les adresses d'avant hopla.page, dans un back office ouvert avant la mise à jour.
  const m = /^(?:\/liens)?(\/(media\/[\w-]+\.(webp|jpg|png)|avatar\.webp))$/.exec(s);
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
/** Une liste de provenances connues, sans doublon, dans l'ordre de `AUDIENCES`. */
const provenances = (v: unknown): Audience[] => (Array.isArray(v) ? AUDIENCES.filter(a => v.includes(a)) : []);

export function audience(v: unknown): { sources: Audience[]; effet: EffetAudience } | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const sources = Array.isArray(o.sources) ? AUDIENCES.filter(a => (o.sources as unknown[]).includes(a)) : [];
  return sources.length ? { sources, effet: parmi(o.effet, EFFETS_AUDIENCE, 'avant') } : null;
}

const nombreEntre = (v: unknown, min: number, max: number, defaut: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defaut; };

/** Le mode drop d'un lien : un code, des places, ou null s'il n'y a ni l'un ni l'autre. */
export function acces(v: unknown): Acces | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const code = texte(o.code, 40), places = Math.round(nombreEntre(o.places, 0, 100_000, 0));
  return code || places ? { code, places } : null;
}

export function preuve(v: unknown): Preuve | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  return {
    genre: parmi(o.genre, GENRES_PREUVE, 'note'),
    note: Math.round(nombreEntre(o.note, 0, 5, 5) * 10) / 10,
    nombre: Math.round(nombreEntre(o.nombre, 0, 1e10, 0)),
    source: texte(o.source, 30),
  };
}

/** Un lien partenaire : sa mention (« Publicité » par défaut) et son code promo ; null s'il n'en est pas un. */
export function partenariat(v: unknown): Partenariat | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  return { mention: parmi(o.mention, MENTIONS_PARTENAIRE, 'publicite'), code: texte(o.code, 40) };
}

/** Les montants de « Me soutenir » : des euros entiers, de 1 à 1 000, quatre au plus, sans doublon, du plus petit au plus grand. */
export function montants(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  const l = v.map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 1000);
  return [...new Set(l)].sort((a, b) => a - b).slice(0, 4);
}

/** Les questions d'une FAQ : une question et sa réponse, vingt au plus ; une question sans rien n'est pas gardée. */
export function questions(v: unknown): Question[] {
  if (!Array.isArray(v)) return [];
  return v.map(q => ({ question: texte(q?.question, 200), reponse: texte(q?.reponse, 1500) })).filter(q => q.question || q.reponse).slice(0, MAX_QUESTIONS);
}

/** Les images d’une galerie : les photos envoyées chez Hopla, sans doublon, douze au plus. */
export function images(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  // Seulement des photos envoyées chez Hopla : une galerie ne fait rien charger d'un autre site au visiteur.
  return [...new Set(v.map(image).filter(i => i.startsWith('/media/')))].slice(0, MAX_IMAGES);
}

/** Un numéro de téléphone tel qu'on l'écrit (« 06 12 34 56 78 », « +33 6… ») : des chiffres et leurs séparateurs, 8 à 15 chiffres. */
export function telephone(v: unknown): string {
  const s = texte(v, 30);
  return numeroAppel(s) ? s.replace(/\s+/g, ' ') : '';
}

/** Une carte de visite : un numéro, une adresse e-mail, une société et un poste, chacun vérifié. */
export function coordonnees(v: unknown): Coordonnees {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return { telephone: telephone(o.telephone), email: email(o.email), societe: texte(o.societe, 80), poste: texte(o.poste, 80) };
}

/** Les pays visés par un bloc (codes ISO à deux lettres connus, sans doublon, dans l'ordre de `PAYS`), ou null s'il n'en vise aucun. */
export function pays(v: unknown): Bloc['pays'] {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const voulus = Array.isArray(o.codes) ? new Set(o.codes.filter(estPays)) : new Set<string>();
  const codes = PAYS.filter(c => voulus.has(c)).slice(0, MAX_PAYS);
  return codes.length ? { codes, effet: parmi(o.effet, EFFETS_PAYS, 'seulement') } : null;
}

/** Le cadeau d'une liste e-mail : un site en http(s) et son nom ; null sans adresse. */
export function cadeau(v: unknown): Cadeau | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const url = adresse(o.url);
  return /^https?:/.test(url) ? { nom: texte(o.nom, 80), url } : null;
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
    cache: provenances(o.cache),
    demanderPrenom: bool(o.demanderPrenom, false),
    acces: type === 'lien' ? acces(o.acces) : null,
    preuve: type === 'preuve' ? preuve(o.preuve) ?? { genre: 'note', note: 5, nombre: 0, source: '' } : null,
    prix: type === 'produit' ? texte(o.prix, 24) : '',
    montants: type === 'soutien' ? montants(o.montants) : [],
    partenariat: type === 'lien' || type === 'produit' ? partenariat(o.partenariat) : null,
    questions: type === 'faq' ? questions(o.questions) : [],
    images: type === 'galerie' ? images(o.images) : [],
    coordonnees: type === 'coordonnees' ? coordonnees(o.coordonnees) : null,
    adressePostale: type === 'lieu' || type === 'coordonnees' ? texte(o.adressePostale, 200) : '',
    sensible: (type === 'lien' || type === 'produit') && bool(o.sensible, false),
    disposition: type === 'titre' ? parmi(o.disposition, DISPOSITIONS, 'liste') : 'liste',
    pays: pays(o.pays),
    cadeau: type === 'inscription' ? cadeau(o.cadeau) : null,
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
      photo: parmi(profil.photo, FORMES_PHOTO, base.profil.photo ?? 'ronde'),
    },
    reseaux: reseaux.slice(0, MAX_RESEAUX).map((r: any) => ({ reseau: parmi(r?.reseau, RESEAUX, 'site'), url: adresse(r?.url) })).filter((r: { url: string }) => r.url),
    reseauxPosition: parmi(o.reseauxPosition, ['haut', 'bas'] as const, base.reseauxPosition),
    theme: idTheme(o.theme),
    couleurs: couleurs(o.couleurs ?? base.couleurs),
    bouton: { style: parmi(bouton.style, STYLES_BOUTON, 'plein'), forme: parmi(bouton.forme, FORMES_BOUTON, 'pilule'), ombre: parmi(bouton.ombre, OMBRES_BOUTON, 'aucune') },
    seo: { titre: texte(seo.titre, 80), description: texte(seo.description, 200), indexable: bool(seo.indexable, true) },
    partage: bool(o.partage, base.partage),
    ouvrirApps: bool(o.ouvrirApps, base.ouvrirApps ?? true),
    resumeHebdo: bool(o.resumeHebdo, base.resumeHebdo ?? true),
    vouvoiement: bool(o.vouvoiement, base.vouvoiement ?? false),
    bureau: parmi(o.bureau, MISES_EN_PAGE_BUREAU, base.bureau),
    vuesReseaux: provenances(o.vuesReseaux ?? base.vuesReseaux),
    animation: parmi(o.animation, ANIMATIONS, base.animation),
    utm: bool(o.utm, base.utm ?? false),
    redirection: redirection(o.redirection ?? base.redirection),
    // Une police qu'un thème porte ; `mono`, qu'aucun thème ne porte, ne se choisit pas.
    police: parmi(o.police ?? base.police, POLICES_CHOIX, '' as const),
    // Une photo envoyée chez Hopla seulement : le fond ne fait rien charger d'un autre site au visiteur.
    imageFond: ((i: string) => (i.startsWith('/media/') ? i : ''))(image(o.imageFond ?? base.imageFond)),
    domaine: parmi(o.domaine ?? base.domaine, DOMAINES_COURTS, '' as const),
  };
}

/** La redirection de la page : un site en http(s) seulement, et sa fin s'il en a une. Sans adresse, pas de fin. */
function redirection(v: any): Reglages['redirection'] {
  const url = adresse(v?.url);
  return /^https?:/.test(url) ? { url, fin: date(v?.fin) } : { url: '', fin: '' };
}

/** Les adresses déjà prises par l'application, ou qui prêteraient à confusion. */
const PSEUDOS_RESERVES = new Set([
  'admin', 'api', 'media', 'assets', 'liens', 'hopla', 'avatar', 'healthz', 'mentions-legales', 'cgu', 'tarifs', 'prix', 'pro', 'legal', 'signaler', 'signalement', 'lilian', 'liliansevoumian', 'principal', 'connexion', 'inscription', 'compte', 'comptes',
  'aide', 'support', 'contact', 'blog', 'login', 'signup', 'app', 'www', 'static', 'demo', 'root', 'null', 'undefined', 'favicon', 'robots', 'sitemap',
  'mcp', 'developpeurs', 'docs', 'fonctions', 'fonction', 'fonctionnalites', 'fonctionnalite', 'fonctionnalités', 'comparatif', 'comparatifs', 'alternative', 'alternatives', 'vs',
]);

/** Un pseudo : 3 à 30 caractères, minuscules, chiffres et tirets, ni réservé. Vide si refusé. */
export function pseudo(v: unknown): string {
  const s = texte(v, 40).toLowerCase();
  return /^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/.test(s) && !s.includes('--') && !PSEUDOS_RESERVES.has(s) ? s : '';
}

/** Ce qu'on tape pour son nom se lit déjà comme une adresse : « Marie Dupont » devient « marie-dupont ». Un emoji s'efface sans laisser de tiret. */
export const nomSaisi = (v: string, max = 30) => v.replace(/\s*[\p{Extended_Pictographic}\u200d\ufe0f]+/gu, '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-/, '').slice(0, max);

/** Une adresse e-mail plausible, en minuscules. Vide si refusée. */
export function email(v: unknown): string {
  const s = texte(v, 200).toLowerCase();
  return /^[^\s@<>"',;]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s) ? s : '';
}

/** Pourquoi une saisie n'est pas une adresse, dit au plus près de l'erreur. */
export function pourquoiPasAdresse(v: string): string {
  const s = v.trim();
  // Un pseudo, un numéro pas fini : on dit ce que c'est, pas qu'il manque « .fr ».
  if (s === '@') return 'Tape ton pseudo après le @, ou colle l’adresse de ton profil.';
  if (/^@[\w.-]+$/.test(s)) return `C’est un pseudo : colle plutôt l’adresse de ton profil, comme instagram.com/${s.slice(1)}`;
  if (/^\+?[\d\s.()-]+$/.test(s)) return 'Un numéro de téléphone s’écrit en entier, avec au moins 8 chiffres.';
  if (/^(?!https?:)h?t{1,3}p{1,2}s?:/i.test(s) || /^(?!https?\/\/)h?t{1,3}p{1,2}s?\/\//i.test(s)) return 'Le début de l’adresse est mal tapé : écris https://. Exemple : https://ton‑site.fr';
  if (/^https?\/\//i.test(s)) return 'Il manque « : » après http. Exemple : https://ton‑site.fr';
  if (/^https?:\/[^/]/i.test(s)) return 'Il manque un « / » après https:. Exemple : https://ton‑site.fr';
  // « calendly com » : l'espace tient lieu de point, on propose l'adresse telle qu'elle était voulue.
  const piste = s.replace(/\s+(fr|com|net|org|io|co|me|app|page|bio|link|eu|be|ch|ca|shop|store|dev|ai)$/i, '.$1');
  if (/\s/.test(s) && !/\s/.test(piste)) return `Une adresse n’a pas d’espace : voulais-tu dire ${piste}\u202f?`;
  if (/\s/.test(s)) return 'Une adresse n’a pas d’espace. Exemple : ton‑site.fr';
  if (!/\./.test(s.replace(/^https?:\/\//i, '').split('/')[0])) return 'Il manque la fin de l’adresse, comme .fr ou .com.';
  return 'Ce n’est pas une adresse. Exemple : ton‑site.fr';
}

/** Pourquoi un pseudo ou une adresse de réseau ne passe pas, avec une piste. */
export function pourquoiPasReseau(reseau: string, v: string): string {
  if (reseau === 'email') return v.includes('@') ? 'Il manque une partie de l’adresse e-mail, par exemple toi@exemple.fr' : 'Il manque le @ de l’adresse e-mail, par exemple toi@exemple.fr';
  if (reseau === 'spotify') return 'Colle l’adresse de ta page Spotify : elle commence par open.spotify.com';
  if (reseau === 'whatsapp') return 'Ton numéro avec l’indicatif, comme +33 6 12 34 56 78, ou ton lien wa.me';
  if (['applemusic', 'applepodcasts', 'deezer', 'medium', 'substack', 'mastodon', 'malt', 'etsy', 'bandcamp'].includes(reseau)) return 'Colle l’adresse de ta page, qui commence par https://';
  if (reseau === 'site') return 'L’adresse de ton site, par exemple ton\u2011site.fr';
  const s = v.trim().replace(/^@/, '');
  if (/\s/.test(s)) return `Pas d’espace dans un pseudo : essaie ${s.replace(/\s+/g, '.').toLowerCase()}`;
  return 'Un pseudo sans espace, ou l’adresse de ton profil';
}
