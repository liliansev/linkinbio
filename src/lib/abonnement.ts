/*
 * L'offre Pro, en un seul endroit : ses prix (ceux des produits créés dans
 * Creem, à garder identiques), ce qu'elle débloque, et la lecture d'un
 * abonnement. Le compte principal (Lilian) est toujours Pro, sans abonnement.
 */

/** Un prix en euros à la française : « 9 € », « 86,40 € » (espace insécable avant le symbole). */
export const euros = (n: number) =>
  `${n.toLocaleString('fr-FR', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}\u00a0€`;

/** Prix TTC. L'annuel vaut douze mois moins 20 % : 9 × 12 = 108 €, soit 86,40 €. */
export const TARIFS = {
  mois: { prix: 9, libelle: `${euros(9)} par mois` },
  an: { prix: 86.4, libelle: `${euros(86.4)} par an`, economie: '\u221220\u00a0%' },
} as const;
export type Periode = keyof typeof TARIFS;

/** Ce que Pro change, dit une seule fois pour l'écran d'abonnement. */
export const AVANTAGES_PRO = [
  'Sans la mention « Une page faite avec Hopla » en bas de ta page',
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

/**
 * Résilié mais payé jusqu'à la fin de la période : `scheduled_cancel`, ou
 * `canceled` tel que Creem le note quand on résilie depuis son portail.
 */
export const estResilie = (statut: string) => statut === 'scheduled_cancel' || statut === 'canceled';

/** Pro ou pas, d'après ce que Creem a dit et la date : un abonnement résilié s'éteint de lui-même après sa période. */
export function estPro(a: { statut: string; finPeriode: number | null }, maintenant = Date.now()): boolean {
  // Résilié depuis le portail : le Pro tient jusqu'à la fin payée, sans grâce, et seulement si on la connaît.
  if (a.statut === 'canceled') return !!a.finPeriode && maintenant <= a.finPeriode;
  if (!(STATUTS_PRO as readonly string[]).includes(a.statut)) return false;
  // Une résiliation s'arrête à la fin de la période ; un renouvellement dont on n'a pas eu de nouvelles garde quelques jours de grâce.
  const grace = a.statut === 'scheduled_cancel' ? 0 : GRACE_JOURS * 86_400_000;
  if (a.finPeriode && maintenant > a.finPeriode + grace) return false;
  return true;
}
