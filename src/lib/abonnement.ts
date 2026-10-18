/*
 * L'offre Pro, en un seul endroit : ses prix (ceux des produits créés dans
 * Creem, à garder identiques), ce qu'elle débloque, et la lecture d'un
 * abonnement. Le compte principal (Lilian) est toujours Pro, sans abonnement.
 */

export const TARIFS = {
  mois: { prix: 4, libelle: '4 € par mois' },
  an: { prix: 36, libelle: '36 € par an', economie: '3 mois offerts' },
} as const;
export type Periode = keyof typeof TARIFS;

/** Ce que Pro change, dit une seule fois pour l'écran d'abonnement. */
export const AVANTAGES_PRO = [
  'Plus de mention « Une page faite avec Hopla » en bas de ta page',
  'Tes statistiques sur 30 jours, 90 jours et un an (7 jours en gratuit)',
  '200 Mo d’images au lieu de 25 Mo',
];

export const QUOTA_GRATUIT = 25 * 1024 * 1024;
export const QUOTA_PRO = 200 * 1024 * 1024;
/** L'historique visible en gratuit, en jours. */
export const JOURS_GRATUIT = 7;

/** Les statuts d'abonnement Creem qui donnent accès au Pro. Un impayé garde le Pro le temps des relances. */
export const STATUTS_PRO = ['active', 'trialing', 'scheduled_cancel', 'past_due'] as const;
/** Après la fin de la période payée, combien de jours de grâce si aucun webhook n'est venu clore l'abonnement. */
export const GRACE_JOURS = 7;

export interface Abonnement {
  plan: 'gratuit' | 'pro';
  /** Le statut Creem tel que reçu (`active`, `scheduled_cancel`, `past_due`, `canceled`…), vide sans abonnement. */
  statut: string;
  /** Fin de la période payée en cours (ms), si connue. */
  finPeriode: number | null;
  /** Vrai si Creem connaît ce client : le portail (carte, résiliation, factures) est ouvert. */
  portail: boolean;
}

/** Pro ou pas, d'après ce que Creem a dit et la date : un abonnement résilié s'éteint de lui-même après sa période. */
export function estPro(a: { statut: string; finPeriode: number | null }, maintenant = Date.now()): boolean {
  if (!(STATUTS_PRO as readonly string[]).includes(a.statut)) return false;
  // Une résiliation s'arrête à la fin de la période ; un renouvellement dont on n'a pas eu de nouvelles garde quelques jours de grâce.
  const grace = a.statut === 'scheduled_cancel' ? 0 : GRACE_JOURS * 86_400_000;
  if (a.finPeriode && maintenant > a.finPeriode + grace) return false;
  return true;
}
