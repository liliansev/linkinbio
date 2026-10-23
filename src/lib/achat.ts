import type { Abonnement, Fonction, Periode, Plan, PlanPayant } from './abonnement.ts';
import { FONCTIONS, PERIODES, estPlan, estPlanPayant } from './abonnement.ts';

/*
 * Le retour d'un paiement. Creem renvoie sur `/admin?paiement=<offre>` ; cette
 * adresse ne donne rien : l'offre n'arrive qu'avec le webhook signé, que le
 * serveur écrit. Le back office relit donc l'abonnement jusqu'à le voir, et
 * dit où il en est : « On active ton offre… », puis « C'est fait ».
 *
 * Avant de partir chez Creem, il note dans l'onglet (sessionStorage) ce qu'on
 * prend, la période, d'où l'on venait (une fonction réservée) et l'offre d'avant :
 * de quoi dire au retour ce qui vient de s'ouvrir.
 */

export const CLE_ACHAT = 'hopla-achat';

/**
 * Ce qu'on vient de prendre. `avant` : l'offre payée d'avant, quand on la connaît, et `periodeAvant` sa période ;
 * `deja` : l'offre offerte qui passait devant elle (ce qui était déjà ouvert) ; `bloc` : le bloc d'où l'on venait.
 */
export interface Achat { plan: PlanPayant; periode: Periode | null; pour?: Fonction; avant?: Plan; periodeAvant?: Periode; deja?: Plan; bloc?: string }

/** La note posée avant de partir chez Creem. Elle ne vaut que pour cette offre, et quelques heures. */
export interface NoteAchat { plan: PlanPayant; periode: Periode; pour?: Fonction; avant: Plan; periodeAvant?: Periode; deja?: Plan; bloc?: string; ts: number }

const VALIDITE = 3 * 3_600_000;

/** L'achat que l'adresse de retour annonce (`?paiement=pro`), complété par la note s'il s'agit du même. Rien si l'adresse n'en nomme pas. */
export function achatDeRetour(recherche: string, note: unknown, maintenant = Date.now()): Achat | null {
  const plan = new URLSearchParams(recherche).get('paiement');
  if (!estPlanPayant(plan)) return null;
  const n = (note && typeof note === 'object' ? note : {}) as Partial<NoteAchat>;
  const fraiche = n.plan === plan && typeof n.ts === 'number' && maintenant - n.ts >= 0 && maintenant - n.ts < VALIDITE;
  if (!fraiche) return { plan, periode: null };
  return {
    plan,
    periode: PERIODES.includes(n.periode as Periode) ? n.periode as Periode : null,
    ...(typeof n.pour === 'string' && Object.hasOwn(FONCTIONS, n.pour) ? { pour: n.pour } : {}),
    ...(estPlan(n.avant) ? { avant: n.avant } : {}),
    ...(PERIODES.includes(n.periodeAvant as Periode) ? { periodeAvant: n.periodeAvant as Periode } : {}),
    ...(estPlan(n.deja) ? { deja: n.deja } : {}),
    ...(typeof n.bloc === 'string' && /^[\w-]{1,64}$/.test(n.bloc) ? { bloc: n.bloc } : {}),
  };
}

export type EtapeRetour = 'activation' | 'fait' | 'attente';

/** Les lectures de l'abonnement : toutes les 2 secondes pendant 30 secondes, puis toutes les 10 secondes pendant 3 minutes. */
export const ESSAIS_RAPIDES = 15;
export const ESSAIS_MAX = ESSAIS_RAPIDES + 18;
export const delaiAvantEssai = (essais: number): number | null => (essais < ESSAIS_RAPIDES ? 2000 : essais < ESSAIS_MAX ? 10_000 : null);

/**
 * Où en est le retour. « fait » seulement quand l'abonnement lu sur le serveur
 * porte l'offre prise (et sa période, quand on la connaît) : jamais d'après
 * l'adresse. C'est l'offre payée qui compte, pas une offre offerte au-dessus.
 * Après les lectures rapides, on cesse d'attendre à l'écran.
 */
export function etapeRetour(achat: Pick<Achat, 'plan' | 'periode'>, lu: Pick<Abonnement, 'payee' | 'periode'> | null, essais: number): EtapeRetour {
  if (lu && lu.payee === achat.plan && (!achat.periode || !lu.periode || lu.periode === achat.periode)) return 'fait';
  return essais >= ESSAIS_RAPIDES ? 'attente' : 'activation';
}
