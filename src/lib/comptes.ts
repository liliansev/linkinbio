import type { CompteResume, SignalementResume } from './types.ts';

/*
 * Ce que l'onglet Comptes lit d'un compte : sa dernière connexion en mots,
 * son statut (un signalement ouvert se voit avant qu'on le traite), et si une
 * recherche le trouve.
 */

const JOUR = 86_400_000;
const numeroDuJour = (t: number) => { const d = new Date(t); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / JOUR; };

/** « Aujourd’hui », « Hier », « 11 oct. » (avec l'année quand ce n'est pas celle-ci), « Jamais ». */
export function quand(ts: number | null, maintenant = Date.now()): string {
  if (!ts) return 'Jamais';
  const ecart = numeroDuJour(maintenant) - numeroDuJour(ts);
  if (ecart <= 0) return 'Aujourd’hui';
  if (ecart === 1) return 'Hier';
  const autreAnnee = new Date(ts).getFullYear() !== new Date(maintenant).getFullYear();
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', ...(autreAnnee ? { year: 'numeric' } : {}) }).format(ts);
}

export type StatutCompte = 'actif' | 'signale' | 'suspendu';
export const NOMS_STATUTS: Record<StatutCompte, string> = { actif: 'Actif', signale: 'Signalé', suspendu: 'Suspendu' };

/** Suspendu l'emporte ; sinon un signalement encore ouvert sur la page la dit « Signalé ». */
export function statutCompte(c: Pick<CompteResume, 'id' | 'statut'>, signalements: Pick<SignalementResume, 'compte' | 'statut'>[]): StatutCompte {
  if (c.statut === 'suspendu') return 'suspendu';
  return signalements.some(s => s.compte === c.id && s.statut === 'ouvert') ? 'signale' : 'actif';
}

/** Sans accents ni majuscules : « Léa » se trouve en tapant « lea ». */
const plat = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Une recherche trouve ce qui contient chacun de ses mots, dans l'un des textes donnés (pseudo, e-mail). */
export function trouve(recherche: string, ...textes: string[]): boolean {
  const mots = plat(recherche).split(/\s+/).filter(Boolean);
  const dans = plat(textes.join(' '));
  return mots.every(m => dans.includes(m));
}
