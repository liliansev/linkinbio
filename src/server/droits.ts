import type { Fonction } from '../lib/abonnement.ts';
import { FONCTIONS, joursStats, peut } from '../lib/abonnement.ts';
import type { Droits } from '../lib/droits.ts';
import { REFUS_PROGRAMMATION, nouvellesDates } from '../lib/droits.ts';
import type { Bloc } from '../lib/types.ts';
import type { PeriodeStats } from '../lib/periode.ts';
import { borner, jourDe } from '../lib/periode.ts';
import type { Env } from './courriel.ts';
import { config } from './creem.ts';
import type { Compte } from './db.ts';
import { abonnement, lireBlocs } from './db.ts';

/**
 * Ce qu'un compte peut faire de sa page : son offre, plus ce que gardent les
 * pages créées avant les quatre offres. Tant que le paiement n'est pas branché
 * (en local, dans l'aperçu), il n'y a pas d'offre à prendre : rien n'est
 * réservé, sauf la page sans mention.
 */
export function droits(c: Compte, env: Env = process.env, maintenant = Date.now()): Droits {
  const plan = abonnement(c, maintenant).plan;
  const libre = !config(env);
  return Object.fromEntries((Object.keys(FONCTIONS) as Fonction[]).map(f => [f, (libre && f !== 'sansMention') || peut(plan, f, c.cree)])) as Droits;
}

/**
 * Avant d'enregistrer un bloc : sans `programmation` (Starter), on garde ou on
 * retire les dates d'un bloc, on n'en pose pas de nouvelles (`nouvellesDates`).
 * La page publique, elle, tient toujours les dates déjà posées.
 */
export function verifierDates(c: Compte, bloc: Pick<Bloc, 'id' | 'debut' | 'fin' | 'compteARebours'>, env: Env = process.env, maintenant = Date.now()) {
  if (droits(c, env, maintenant).programmation) return;
  if (nouvellesDates(lireBlocs(c.id).find(b => b.id === bloc.id), bloc)) throw new Error(REFUS_PROGRAMMATION);
}

/**
 * Les jours de stats que ce compte peut lire : aucun en Gratuit, 30 en Starter,
 * un an en Pro, 7 pour une page d'avant les offres. Tant que le paiement n'est
 * pas branché, il n'y a pas d'offre à proposer : rien n'est limité.
 */
export const joursLisibles = (c: Compte, env: Env = process.env, maintenant = Date.now()) =>
  (config(env) ? joursStats(abonnement(c, maintenant).plan, droits(c, env, maintenant).stats) : 365);

/**
 * La période qu'un compte demande, ramenée à ce qu'il peut lire : des derniers jours au plus de son
 * historique (14 jours demandés par une page qui en lit 7 : ses 7), des dates resserrées sur cet
 * historique, jusqu'à aujourd'hui. Rien quand ses dates tombent toutes avant (ou qu'il n'a pas de stats).
 */
export function periodeLisible(c: Compte, p: PeriodeStats, env: Env = process.env, maintenant = Date.now()): PeriodeStats | null {
  const jours = joursLisibles(c, env, maintenant);
  if (!jours) return null;
  return typeof p === 'number' ? Math.min(p, jours) : borner(p, jours, jourDe(maintenant));
}
