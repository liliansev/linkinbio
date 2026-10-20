/*
 * Les offres, en un seul endroit : Gratuit, Starter, Pro et Premium (choix de
 * Lilian, 20 octobre 2026), leurs prix (ceux des produits Creem, que « Créer
 * les offres dans Creem » tient à jour), ce que chacune débloque, et la lecture
 * d'un abonnement. Le compte principal (Lilian) a tout, sans abonnement.
 * Gratuit garde l'essentiel pour essayer : des liens sans limite, la page selon
 * le réseau du visiteur (la promesse de Hopla) et tous les thèmes.
 */

/** Un prix en euros à la française : « 9 € », « 86,40 € » (espace insécable avant le symbole). */
export const euros = (n: number) =>
  `${n.toLocaleString('fr-FR', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })} €`;

export const PERIODES = ['mois', 'an'] as const;
export type Periode = (typeof PERIODES)[number];
export const PLANS = ['gratuit', 'starter', 'pro', 'premium'] as const;
export type Plan = (typeof PLANS)[number];
export type PlanPayant = Exclude<Plan, 'gratuit'>;
export const PLANS_PAYANTS: readonly PlanPayant[] = ['starter', 'pro', 'premium'];
export const estPlan = (v: unknown): v is Plan => PLANS.includes(v as Plan);
export const estPlanPayant = (v: unknown): v is PlanPayant => PLANS_PAYANTS.includes(v as PlanPayant);

const Mo = 1024 * 1024;

export interface Offre {
  nom: string;
  /** Ce que l'offre change, en une phrase. */
  phrase: string;
  /** Prix TTC en euros, 0 pour Gratuit. L'annuel revient à environ un quart de moins que douze mois. */
  prix: Record<Periode, number>;
  /** Ce qu'elle ajoute à l'offre d'avant, dans l'ordre où on le lit. */
  avantages: string[];
  /**
   * La place pour les images, en octets : un garde-fou contre les abus, qu'on
   * n'annonce pas (seul le message d'un envoi refusé en parle).
   */
  quota: number;
  /** L'historique des statistiques qu'on peut lire, en jours (0 : pas de stats). */
  jours: number;
  /** En vente aujourd'hui. Premium attend son nom de domaine et ses pages. */
  enVente: boolean;
}

export const OFFRES: Record<Plan, Offre> = {
  gratuit: {
    nom: 'Gratuit', phrase: 'Ta page et tous tes liens, pour toujours.', prix: { mois: 0, an: 0 }, quota: 25 * Mo, jours: 0, enVente: true,
    avantages: ['Des liens sans limite', 'Ta page selon le réseau du visiteur', 'Les vingt thèmes'],
  },
  starter: {
    nom: 'Starter', phrase: 'Ta page, sans la mention Hopla.', prix: { mois: 4, an: 36 }, quota: 100 * Mo, jours: 30, enVente: true,
    avantages: ['Sans la mention « Une page faite avec Hopla »', 'Tes couleurs', 'Tes liens programmés à l’avance', 'Les avis de tes clients', 'Analytics détaillées sur 30 jours'],
  },
  pro: {
    nom: 'Pro', phrase: 'Le bon lien, au bon moment.', prix: { mois: 9, an: 79 }, quota: 200 * Mo, jours: 365, enVente: true,
    avantages: ['Ta page selon l’heure', 'Les drops : un code, des places comptées', 'Ta liste e-mail, vers Brevo ou Mailchimp', 'Analytics sur un an'],
  },
  premium: {
    nom: 'Premium', phrase: 'Ta page à ton nom de domaine.', prix: { mois: 19, an: 169 }, quota: 1024 * Mo, jours: 365, enVente: false,
    avantages: ['Ton propre nom de domaine', 'Jusqu’à trois pages'],
  },
};

/** Le rang d'une offre : chacune contient celles d'avant. */
export const rang = (p: Plan) => PLANS.indexOf(p);

/** Ce que l'annuel fait gagner sur douze mois, en pourcentage arrondi (27 pour le Pro). */
export const economie = (p: PlanPayant) => Math.round((1 - OFFRES[p].prix.an / (OFFRES[p].prix.mois * 12)) * 100);
/** Le prix d'une offre par mois quand on la paie à l'année (6,58 € pour le Pro). */
export const parMoisAnnuel = (p: PlanPayant) => Math.round((OFFRES[p].prix.an / 12) * 100) / 100;
/** « 79 € par an », « 9 € par mois ». */
export const libellePrix = (p: PlanPayant, periode: Periode) => `${euros(OFFRES[p].prix[periode])} par ${periode === 'an' ? 'an' : 'mois'}`;

/**
 * Les fonctions réservées, et l'offre qui les débloque. Tout le reste est dans
 * Gratuit, dont la page selon le réseau du visiteur (« Afficher sur »).
 * `programmation` : les dates d'un bloc (début, fin, compte à rebours) ;
 * `heure` : le créneau qui revient chaque semaine ; `stats` : lire ses stats
 * (elles se comptent pour tout le monde, seule leur lecture est réservée).
 */
export const FONCTIONS = {
  sansMention: 'starter',
  couleurs: 'starter',
  programmation: 'starter',
  avis: 'starter',
  stats: 'starter',
  heure: 'pro',
  drops: 'pro',
  listeEmail: 'pro',
} as const satisfies Record<string, PlanPayant>;
export type Fonction = keyof typeof FONCTIONS;

/**
 * Les pages créées avant les quatre offres gardent ce qu'elles faisaient en
 * gratuit (promis par Lilian le 20 octobre 2026) : tout, sauf la page sans mention.
 */
export const BASCULE_OFFRES = Date.UTC(2026, 9, 21);
/** Les jours de stats qu'une page d'avant les offres lisait en gratuit : elle les garde. */
export const JOURS_AVANT_OFFRES = 7;

/** Ce compte peut-il se servir de cette fonction ? `cree` : la création du compte (ms), pour les pages d'avant. */
export function peut(plan: Plan, f: Fonction, cree = Number.POSITIVE_INFINITY): boolean {
  if (rang(plan) >= rang(FONCTIONS[f])) return true;
  return f !== 'sansMention' && cree < BASCULE_OFFRES;
}

/**
 * Les jours de stats qu'un compte peut lire : ceux de son offre, au moins ceux
 * d'une page d'avant les offres quand il a le droit aux stats, aucun sinon.
 */
export const joursStats = (plan: Plan, permis: boolean) => (permis ? Math.max(OFFRES[plan].jours, JOURS_AVANT_OFFRES) : 0);

/** Une offre et une période dans Creem, pour l'onglet Comptes : son prix du jour et le produit qui le vend, s'il existe. */
export interface EtatOffre { plan: PlanPayant; periode: Periode; prix: number; enVente: boolean; produit: string | null }

/** Les statuts d'abonnement Creem qui donnent accès à l'offre payée. Un impayé la garde le temps des relances. */
export const STATUTS_PRO = ['active', 'trialing', 'scheduled_cancel', 'past_due'] as const;
/** Après la fin de la période payée, combien de jours de grâce si aucun webhook n'est venu clore l'abonnement. */
export const GRACE_JOURS = 7;

export interface Abonnement {
  plan: Plan;
  /** Le statut Creem tel que reçu (`active`, `scheduled_cancel`, `past_due`, `canceled`…), vide sans abonnement. */
  statut: string;
  /** Fin de la période payée en cours (ms), si connue. */
  finPeriode: number | null;
  /** Mensuel ou annuel, si on le sait (d'après le produit Creem). */
  periode: Periode | null;
  /** Vrai si Creem connaît ce client : le portail (carte, résiliation, factures) est ouvert. */
  portail: boolean;
}

/**
 * Résilié mais payé jusqu'à la fin de la période : `scheduled_cancel`, ou
 * `canceled` tel que Creem le note quand on résilie depuis son portail.
 */
export const estResilie = (statut: string) => statut === 'scheduled_cancel' || statut === 'canceled';

/** L'abonnement donne-t-il encore accès à son offre, d'après ce que Creem a dit et la date ? Un abonnement résilié s'éteint de lui-même après sa période. */
export function estPaye(a: { statut: string; finPeriode: number | null }, maintenant = Date.now()): boolean {
  // Résilié depuis le portail : l'offre tient jusqu'à la fin payée, sans grâce, et seulement si on la connaît.
  if (a.statut === 'canceled') return !!a.finPeriode && maintenant <= a.finPeriode;
  if (!(STATUTS_PRO as readonly string[]).includes(a.statut)) return false;
  // Une résiliation s'arrête à la fin de la période ; un renouvellement dont on n'a pas eu de nouvelles garde quelques jours de grâce.
  const grace = a.statut === 'scheduled_cancel' ? 0 : GRACE_JOURS * 86_400_000;
  if (a.finPeriode && maintenant > a.finPeriode + grace) return false;
  return true;
}
