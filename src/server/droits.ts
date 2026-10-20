import type { Fonction } from '../lib/abonnement.ts';
import { FONCTIONS, peut } from '../lib/abonnement.ts';
import type { Droits } from '../lib/droits.ts';
import type { Env } from './courriel.ts';
import { config } from './creem.ts';
import type { Compte } from './db.ts';
import { abonnement } from './db.ts';

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
