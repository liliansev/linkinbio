import type { Bloc } from './types.ts';
import { estEnLigne } from './types.ts';

/*
 * Une page qui change selon le moment. Un bloc peut vivre sur un créneau qui
 * revient chaque semaine (des jours, une plage horaire, dans le fuseau de la
 * personne) : seulement visible à ces heures, ou mis en avant à ces heures,
 * comme « Réserver » le matin et « Dernier épisode » le soir. Avant sa date
 * de début, un bloc peut aussi s'annoncer par un compte à rebours, sans
 * dévoiler son adresse.
 */

export const EFFETS_CRENEAU = ['afficher', 'avant'] as const;
export type EffetCreneau = (typeof EFFETS_CRENEAU)[number];

export interface Creneau {
  /** Les jours, de 1 (lundi) à 7 (dimanche). */
  jours: number[];
  /** `HH:MM`. Une fin avant le début passe minuit (22:00 à 02:00) ; égales, toute la journée. */
  de: string;
  a: string;
  /** Le fuseau de la personne, relevé par son navigateur quand elle règle le créneau. */
  fuseau: string;
  effet: EffetCreneau;
}

export const FUSEAU_DEFAUT = 'Europe/Paris';
export const NOMS_JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

export function fuseauValide(v: unknown): string {
  if (typeof v !== 'string' || !v || v.length > 60) return FUSEAU_DEFAUT;
  try { new Intl.DateTimeFormat('fr-FR', { timeZone: v }); return v; } catch { return FUSEAU_DEFAUT; }
}

const formats = new Map<string, Intl.DateTimeFormat>();
/** Le jour (1 à 7) et la minute du jour à cet instant, dans ce fuseau. */
export function heureLocale(maintenant: number, fuseau: string): { jour: number; minute: number } {
  let f = formats.get(fuseau);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: fuseau, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    formats.set(fuseau, f);
  }
  const parties = Object.fromEntries(f.formatToParts(maintenant).map(p => [p.type, p.value]));
  const jour = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(parties.weekday) + 1;
  return { jour, minute: Number(parties.hour) * 60 + Number(parties.minute) };
}

const minutes = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

/** Le créneau est-il ouvert à cet instant ? */
export function dansCreneau(c: Creneau, maintenant: number): boolean {
  if (!c.jours.length) return false;
  const { jour, minute } = heureLocale(maintenant, c.fuseau);
  const de = minutes(c.de), a = minutes(c.a);
  if (de === a) return c.jours.includes(jour);
  if (de < a) return c.jours.includes(jour) && minute >= de && minute < a;
  // Passé minuit : la fin tombe le lendemain d'un jour choisi.
  const veille = jour === 1 ? 7 : jour - 1;
  return (c.jours.includes(jour) && minute >= de) || (c.jours.includes(veille) && minute < a);
}

/** Un bloc pas encore ouvert, qui s'annonce par un compte à rebours. */
export const enAttente = (bloc: Bloc, maintenant: number) => bloc.public && bloc.compteARebours && !!bloc.debut && Date.parse(bloc.debut) > maintenant
  && (!bloc.fin || Date.parse(bloc.fin) > Date.parse(bloc.debut));

/** « lundi au vendredi, 8 h à 12 h », pour le back office. */
export function decrireCreneau(c: Creneau): string {
  const j = [...c.jours].sort();
  let jours = j.length === 7 ? 'tous les jours' : j.map(n => NOMS_JOURS[n - 1]).join(', ');
  const suite = j.length > 2 && j.every((n, i) => !i || n === j[i - 1] + 1);
  if (j.length === 5 && suite && j[0] === 1) jours = 'en semaine';
  else if (j.length === 2 && j[0] === 6 && j[1] === 7) jours = 'le week-end';
  else if (suite && j.length < 7) jours = `du ${NOMS_JOURS[j[0] - 1]} au ${NOMS_JOURS[j[j.length - 1] - 1]}`;
  const h = (s: string) => s.replace(/^0/, '').replace(':00', ' h').replace(':', ' h ');
  return c.de === c.a ? jours : `${jours}, de ${h(c.de)} à ${h(c.a)}`;
}

/** Ce qu'un bloc devient à cet instant : retiré, laissé, ou mis en avant. */
export function selonMoment(bloc: Bloc, maintenant: number): 'retire' | 'normal' | 'avant' {
  if (!bloc.creneau) return 'normal';
  const ouvert = dansCreneau(bloc.creneau, maintenant);
  if (bloc.creneau.effet === 'afficher') return ouvert ? 'normal' : 'retire';
  return ouvert ? 'avant' : 'normal';
}

/**
 * Un bloc posé qui n'est pas sur la page à cet instant : pas encore ouvert, déjà fini, ou hors de son créneau « affiché
 * seulement » (`heure` : l'offre comprend le créneau, sinon il ne s'applique pas). Le back office le grise, « programmé ».
 */
export const horsCreneauOuDates = (bloc: Bloc, heure: boolean, maintenant = Date.now()) =>
  bloc.public && (!estEnLigne(bloc, maintenant) || (heure && selonMoment(bloc, maintenant) === 'retire'));

/**
 * Les blocs tels que la page les montre à cet instant : programmation,
 * comptes à rebours (sans leur adresse) et créneaux appliqués. Un bloc mis en
 * avant par son créneau passe en tête, dans sa forme de lien mis en avant.
 */
export function composerMoment(blocs: Bloc[], maintenant: number): Bloc[] {
  const tete: Bloc[] = [], reste: Bloc[] = [];
  for (const bloc of blocs) {
    if (enAttente(bloc, maintenant)) { reste.push({ ...bloc, url: '' }); continue; }
    if (!estEnLigne(bloc, maintenant)) continue;
    const effet = selonMoment(bloc, maintenant);
    if (effet === 'retire') continue;
    if (effet === 'avant') tete.push({ ...bloc, vedette: true });
    else reste.push(bloc);
  }
  return [...tete, ...reste];
}
