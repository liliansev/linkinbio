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
    avantages: ['Sans la mention « Une page faite avec Hopla »', 'Tes couleurs', 'Tes liens programmés à l’avance', 'Les avis de tes clients', 'Tes stats sur 30 jours'],
  },
  pro: {
    nom: 'Pro', phrase: 'Le bon lien, au bon moment.', prix: { mois: 9, an: 79 }, quota: 200 * Mo, jours: 365, enVente: true,
    avantages: ['Ta page selon l’heure', 'Les drops : un code, des places comptées', 'Ta liste e-mail, vers Brevo ou Mailchimp', 'Tes stats sur un an'],
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
/** Ce que l'annuel fait gagner en un an, en euros : douze mois moins l'année (12 € pour Starter, 29 € pour Pro). */
export const economieAnnuelle = (p: PlanPayant) => Math.round((OFFRES[p].prix.mois * 12 - OFFRES[p].prix.an) * 100) / 100;
/** Les mois entiers que l'annuel offre : trois pour Starter (36 € au lieu de 48 €), trois pour Pro (29 € de moins, plus de trois fois 9 €). */
export const moisOfferts = (p: PlanPayant) => Math.floor(economieAnnuelle(p) / OFFRES[p].prix.mois + 1e-9);
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
 * Chaque fonction réservée en mots, pour les offres : la ligne de son offre qui
 * l'annonce (`avantage`, mot pour mot dans `OFFRES`), et ce pour quoi on vient
 * la prendre, sur l'étiquette de l'offre mise en avant (« Pour tes couleurs »).
 */
export const FONCTIONS_EN_MOTS: Record<Fonction, { avantage: string; pour: string }> = {
  sansMention: { avantage: 'Sans la mention « Une page faite avec Hopla »', pour: 'Pour ôter la mention' },
  couleurs: { avantage: 'Tes couleurs', pour: 'Pour tes couleurs' },
  programmation: { avantage: 'Tes liens programmés à l’avance', pour: 'Pour programmer' },
  avis: { avantage: 'Les avis de tes clients', pour: 'Pour les avis' },
  stats: { avantage: 'Tes stats sur 30 jours', pour: 'Pour tes stats' },
  heure: { avantage: 'Ta page selon l’heure', pour: 'Pour tes créneaux' },
  drops: { avantage: 'Les drops : un code, des places comptées', pour: 'Pour les drops' },
  listeEmail: { avantage: 'Ta liste e-mail, vers Brevo ou Mailchimp', pour: 'Pour ta liste e-mail' },
};

/**
 * L'appel vers l'offre du dessus, en une ligne du back office (Lilian, 21 octobre 2026) : ce que chaque offre
 * apporte de plus parlant, en peu de mots, dans l'ordre où on le propose (« Passer en Starter : sans la mention
 * Hopla »). Une fonction que le compte a déjà (une page d'avant les offres garde presque tout) laisse la place
 * à la suivante ; la dernière de chaque liste ne dépend d'aucune fonction.
 */
export const ACCROCHES: Record<PlanPayant, { texte: string; fonction?: Fonction }[]> = {
  starter: [{ texte: 'sans la mention Hopla', fonction: 'sansMention' }, { texte: 'tes couleurs', fonction: 'couleurs' }, { texte: 'tes stats sur 30 jours' }],
  pro: [{ texte: 'ta page selon l’heure', fonction: 'heure' }, { texte: 'les drops', fonction: 'drops' }, { texte: 'ta liste e-mail', fonction: 'listeEmail' }, { texte: 'tes stats sur un an' }],
  premium: [{ texte: 'ton nom de domaine' }],
};

/** L'offre à proposer au-dessus de celle d'un compte, et ce qu'elle apporte : `fonction` met en avant sa ligne dans les offres. */
export interface OffreSuivante { plan: PlanPayant; texte: string; fonction?: Fonction }

/**
 * La première offre en vente au-dessus de celle du compte, avec son accroche. Rien quand rien n'est en vente
 * au-dessus (Pro : Premium n'est pas en vente ; le compte principal a déjà tout), ni pour une offre résiliée ou
 * impayée : on ne relance pas qui s'en va, ni qui a un souci de carte. `droits` : ce que le compte a déjà.
 */
export function offreSuivante(a: Pick<Abonnement, 'plan' | 'statut'>, droits: Partial<Record<Fonction, boolean>>, enVente: readonly PlanPayant[]): OffreSuivante | null {
  if (a.plan !== 'gratuit' && (estResilie(a.statut) || a.statut === 'past_due')) return null;
  const plan = PLANS_PAYANTS.find(p => rang(p) > rang(a.plan) && OFFRES[p].enVente && enVente.includes(p));
  const accroche = plan && ACCROCHES[plan].find(x => !x.fonction || !droits[x.fonction]);
  return plan && accroche ? { plan, ...accroche } : null;
}

/**
 * Un abonné qui change d'offre paie ou se fait rendre la différence aujourd'hui, au prorata (Creem,
 * `proration-charge-immediately`) : monter la fait payer, descendre la rend sur sa carte. Quand la période
 * change aussi, le sens dépend de ce qui reste de la période en cours : Creem en décide (null).
 */
export function sensDuChangement(avant: { plan: Plan; periode: Periode | null }, apres: { plan: PlanPayant; periode: Periode }): 'facture' | 'rendu' | null {
  if (avant.plan === 'gratuit' || avant.plan === apres.plan || avant.periode !== apres.periode) return null;
  return rang(apres.plan) > rang(avant.plan) ? 'facture' : 'rendu';
}

/** Ce qu'on gagne (ou perd) en passant d'une offre à l'autre : les avantages des offres entre les deux, dans l'ordre où on les lit. */
export function avantagesEntre(depuis: Plan, vers: Plan): string[] {
  const [bas, haut] = rang(depuis) <= rang(vers) ? [depuis, vers] : [vers, depuis];
  return PLANS.slice(rang(bas) + 1, rang(haut) + 1).flatMap(p => OFFRES[p].avantages);
}

/** La prochaine échéance d'un abonnement pris le jour `debut` : un mois ou un an plus tard, le même jour, ou le dernier du mois s'il n'existe pas. */
export function echeance(debut: number, periode: Periode): number {
  const d = new Date(debut);
  const jour = d.getDate();
  d.setDate(1);
  if (periode === 'an') d.setFullYear(d.getFullYear() + 1); else d.setMonth(d.getMonth() + 1);
  d.setDate(Math.min(jour, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return d.getTime();
}

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

/**
 * Ce que Réglages montre de l'abonnement, d'un coup d'œil : « Gérer mon abonnement » tant qu'une offre payée
 * court (la changer, la résilier, la carte), et « Mes factures » pour tout compte que Creem connaît, qu'il soit
 * abonné, résilié ou ancien abonné : ses factures restent chez Creem.
 */
export const accesAbonnement = (a: Pick<Abonnement, 'plan' | 'portail'>) => ({ gerer: a.plan !== 'gratuit', factures: a.portail });
