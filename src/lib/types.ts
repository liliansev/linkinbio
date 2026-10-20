/*
 * Le modèle de la page de liens, partagé par le serveur, le back office et la
 * page publique. Une page = des réglages (profil, thème, boutons, SEO) et une
 * liste ordonnée de blocs.
 */

import type { Abonnement, EtatOffre, Periode, Plan, PlanPayant } from './abonnement.ts';
import type { Droits } from './droits.ts';
import type { Creneau } from './moments.ts';
import type { Audience, EffetAudience } from './provenance.ts';

export const TYPES_BLOC = ['lien', 'titre', 'texte', 'video', 'derniere-video', 'newsletter', 'inscription', 'preuve'] as const;
export type TypeBloc = (typeof TYPES_BLOC)[number];

/** Les mouvements qui attirent l'œil sur un bouton. */
export const ANIMATIONS = ['aucune', 'reflet', 'orbite', 'lueur', 'onde', 'respiration', 'rebond', 'secousse'] as const;
export type Animation = (typeof ANIMATIONS)[number];
/** Ce qu'un bloc peut choisir : un mouvement, ou `auto` (celui des réglages s'il est mis en avant, aucun sinon). */
export const ANIMATIONS_BLOC = ['auto', ...ANIMATIONS] as const;
export type AnimationBloc = (typeof ANIMATIONS_BLOC)[number];

export interface Bloc {
  id: string;
  type: TypeBloc;
  /** Le libellé du bouton, le titre de section ou le texte du paragraphe. */
  titre: string;
  url: string;
  sousTitre: string;
  /** Un texte plus long, sous le titre d'un bandeau ou d'une carte. */
  description: string;
  /** Le nom d'un picto ou d'un réseau (`fusee`, `youtube`...), voir `icones.ts`. */
  icone: string;
  /** Vignette : une URL `/media/...` ou https. */
  image: string;
  /** Visible sur la page publique. Privé = seulement dans le back office. */
  public: boolean;
  /** Suivi par Google : lien `follow`, repris dans les données structurées. */
  indexable: boolean;
  /** Mis en avant : grande carte en tête de sa section. */
  vedette: boolean;
  /** La forme d'un lien mis en avant : bouton, bandeau ou grande carte. */
  format: FormatVedette;
  /** Sa couleur : l'accent du thème, ou celle des autres boutons. */
  teinte: TeinteVedette;
  animation: AnimationBloc;
  /** Programmation (ISO), vide = pas de borne. */
  debut: string;
  fin: string;
  /** Avant `debut`, montrer un compte à rebours (sans l'adresse) plutôt que rien. */
  compteARebours: boolean;
  /** Un créneau qui revient chaque semaine : visible, ou mis en avant, à ces heures-là. */
  creneau: Creneau | null;
  /** Les provenances visées (Instagram, TikTok…) : le bloc passe en tête pour elles, ou ne s'affiche que pour elles. */
  audience: { sources: Audience[]; effet: EffetAudience } | null;
  /** Les provenances pour qui le bloc est caché (la vue par réseau de « Ma page »). */
  cache: Audience[];
  /** « Rejoins ma liste » : demander aussi le prénom. */
  demanderPrenom: boolean;
  /** Le mode drop : un code à taper, des places comptées, ou les deux. L'adresse ne part qu'une fois le lien débloqué. */
  acces: Acces | null;
  /** Sur la page publique seulement : les places qui restent d'un drop (null = sans limite). */
  restantes?: number | null;
  /** Un avis, un chiffre, un témoignage (bloc `preuve`). */
  preuve: Preuve | null;
  /** Le titre, le sous-titre et la description dans d'autres langues. */
  traductions: Partial<Record<Langue, Traduction>>;
}

export interface Acces {
  /** Le code à taper, vide = pas de code. Jamais envoyé à la page publique (seulement `•` s'il y en a un). */
  code: string;
  /** Le nombre de places, 0 = sans limite. */
  places: number;
}

export const GENRES_PREUVE = ['note', 'compteur', 'temoignage'] as const;
export type GenrePreuve = (typeof GENRES_PREUVE)[number];
export interface Preuve {
  genre: GenrePreuve;
  /** Note sur 5 (`note`). */
  note: number;
  /** Le nombre d'avis (`note`) ou le chiffre affiché (`compteur`). */
  nombre: number;
  /** Où vit la preuve : Google, Trustpilot, Malt, YouTube… */
  source: string;
}

/** Les langues dans lesquelles une page peut se traduire, en plus du français. */
export const LANGUES = ['en', 'es', 'de', 'it'] as const;
export type Langue = (typeof LANGUES)[number];
export type LangueVisiteur = Langue | 'fr';
export interface Traduction { titre: string; sousTitre: string; description: string }

export const FORMATS_VEDETTE = ['bouton', 'bandeau', 'carte'] as const;
export type FormatVedette = (typeof FORMATS_VEDETTE)[number];
export const TEINTES_VEDETTE = ['accent', 'theme'] as const;
export type TeinteVedette = (typeof TEINTES_VEDETTE)[number];

export const STYLES_BOUTON = ['plein', 'contour', 'doux', 'relief', 'verre'] as const;
export type StyleBouton = (typeof STYLES_BOUTON)[number];
export const FORMES_BOUTON = ['pilule', 'arrondi', 'carre'] as const;
export type FormeBouton = (typeof FORMES_BOUTON)[number];
/** L'ombre portée sous les boutons, au choix : aucune, subtile ou marquée. */
export const OMBRES_BOUTON = ['aucune', 'subtile', 'marquee'] as const;
export type OmbreBouton = (typeof OMBRES_BOUTON)[number];

export const RESEAUX = ['youtube', 'linkedin', 'instagram', 'tiktok', 'x', 'github', 'facebook', 'threads', 'twitch', 'spotify', 'email', 'site'] as const;
export type Reseau = (typeof RESEAUX)[number];

/** Le fond, les boutons et l'accent qu'on peut changer après avoir choisi un thème. */
export interface Couleurs { fond: string; boutons: string; accent: string }
export const SANS_COULEURS: Couleurs = { fond: '', boutons: '', accent: '' };

export interface Reglages {
  profil: { nom: string; bio: string; avatar: string; badge: boolean };
  reseaux: { reseau: Reseau; url: string }[];
  /** Les icônes des réseaux en haut (sous la bio) ou en bas de page. */
  reseauxPosition: 'haut' | 'bas';
  theme: string;
  /** Les couleurs changées par-dessus le thème (`#rrggbb`) ; vide, c'est celle du thème. */
  couleurs: Couleurs;
  bouton: { style: StyleBouton; forme: FormeBouton; ombre: OmbreBouton };
  seo: { titre: string; description: string; indexable: boolean };
  /** Le bouton « Partager » en haut de la page publique. */
  partage: boolean;
  /** Depuis le navigateur intégré d'Instagram, TikTok…, ouvrir les liens dans leur app (YouTube, Spotify…). */
  ouvrirApps: boolean;
  /** Le lundi matin, le résumé de la semaine par e-mail. */
  resumeHebdo: boolean;
  /** Les langues proposées en plus du français : la page parle celle du visiteur. */
  langues: Langue[];
  /** La bio dans ces langues. */
  bioTraduite: Partial<Record<Langue, string>>;
  /** Les mots de la page (formulaires, drops) vouvoient le visiteur plutôt que de le tutoyer. */
  vouvoiement: boolean;
  /** Le mouvement des liens mis en avant (un bloc peut choisir le sien). */
  animation: Animation;
  /** Les réseaux qui ont leur vue dans « Ma page » (vide : l'option est coupée). */
  /** Les réseaux où le compte colle son lien (choisis aux premiers pas) : chaque bloc se coche ou se décoche pour chacun. Vide : les plus connus. */
  vuesReseaux: Audience[];
  /** La mise en page sur un grand écran ; sur téléphone, la page reste une colonne. */
  bureau: MiseEnPageBureau;
}

export const MISES_EN_PAGE_BUREAU = ['colonne', 'profil', 'onepage'] as const;
export type MiseEnPageBureau = (typeof MISES_EN_PAGE_BUREAU)[number];

/** Le compte de Lilian, servi sur hopla.page/lilian comme les autres sur hopla.page/<pseudo>. */
export const PRINCIPAL = 'principal';

/** Les blocs branchés sur les outils de Lilian (sa chaîne YouTube, sa newsletter) : réservés à sa page. */
export const TYPES_PRINCIPAL: readonly TypeBloc[] = ['derniere-video', 'newsletter'];

/** Qui possède la page : de quoi construire son adresse. */
export interface ComptePage { pseudo: string; principal: boolean }

/** Les pages publiques, et le back office sur son propre nom (son cookie n'est jamais envoyé aux pages). */
export const ORIGINE_PUBLIQUE = 'https://hopla.page';
export const ORIGINE_ADMIN = 'https://app.hopla.page';
export interface Origines { page: string; admin: string }
/** Le site de Lilian, l'éditeur du service. */
export const SITE_LILIAN = 'https://liliansevoumian.fr';
export const cheminPage = (c: ComptePage) => `/${c.pseudo}`;
export const urlPage = (c: ComptePage) => `${ORIGINE_PUBLIQUE}${cheminPage(c)}`;
/** `https://hopla.page/camille` devient `hopla.page/camille`. */
export const sansSchema = (url: string) => url.replace(/^https?:\/\//, '');

/** Une ligne de la liste des comptes, dans le back office de Lilian. */
export interface CompteResume {
  id: string;
  email: string;
  pseudo: string;
  statut: 'actif' | 'suspendu';
  cree: number;
  connexion: number | null;
  blocs: number;
  /** Vues des 30 derniers jours. */
  vues: number;
  principal: boolean;
  /** L'offre en ce moment (Premium pour le compte principal, qui n'a pas d'abonnement). */
  plan: Plan;
}

/** Ce que la page publique reçoit : jamais un bloc privé ni hors programmation. */
export interface PagePublique {
  reglages: Reglages;
  blocs: Bloc[];
  /** Dès Starter, la page perd la mention « Une page faite avec Hopla ». */
  compte: ComptePage & { plan: Plan };
  /** L'instant où la page a été composée : le compte à rebours part de là, au serveur comme au navigateur. */
  maintenant?: number;
  /** La langue dans laquelle la page s'affiche (celle du visiteur, si la page la propose). */
  langue?: LangueVisiteur;
}

export interface EtatAdmin {
  reglages: Reglages;
  blocs: Bloc[];
  compte: ComptePage & { email: string; plan: Plan };
  abonnement: Abonnement;
  /** Vrai quand le paiement est branché sur le serveur (Creem configuré) et que le compte peut s'abonner. */
  paiement: boolean;
  /** Les offres qu'on peut prendre maintenant (un produit Creem pour chaque période). */
  enVente: PlanPayant[];
  /** Ce que le compte peut faire de sa page ; le reste se montre avec l'offre qui le débloque. */
  droits: Droits;
  /** Clics des 30 derniers jours, par bloc. */
  clics: Record<string, number>;
  /** Les places prises de chaque drop. */
  places: Record<string, number>;
  /** Vrai quand la base vit en mémoire : rien ne survivra au redémarrage. */
  stockageEphemere: boolean;
  /** Faux tant que le compte n'a pas accepté la version en vigueur des CGU (toujours vrai pour le compte principal). */
  cguAJour: boolean;
}

export interface Stats {
  jours: number;
  vues: number;
  visiteurs: number;
  clics: number;
  /** Une entrée par jour, du plus ancien au plus récent. */
  serie: { jour: string; vues: number; clics: number }[];
  /** `avant` : le même chiffre sur la période précédente. */
  blocs: { id: string; titre: string; clics: number; avant: number }[];
  sources: { nom: string; vues: number; avant: number }[];
  appareils: { nom: string; vues: number }[];
  /** Les clics depuis le navigateur intégré d'Instagram, TikTok… : en tout, vers un lien qui a son app, et ouverts dans l'app. */
  apps: { integres: number; versApp: number; ouverts: number };
  /** Mêmes totaux sur la période précédente, pour la tendance. */
  precedent: { vues: number; visiteurs: number; clics: number };
  /** Faux tant que personne n'a jamais vu la page (sur toute la durée de conservation) : Stats n'en montre alors qu'un état vide. */
  dejaVue: boolean;
}

export const FOURNISSEURS_LISTE = ['brevo', 'mailchimp'] as const;
export type FournisseurListe = (typeof FOURNISSEURS_LISTE)[number];

/** Le fournisseur branché, sans jamais la clé (seulement ses quatre derniers caractères). */
export interface IntegrationListe { fournisseur: FournisseurListe; liste: string; nom: string; cle: string }

export interface Contact { id: string; email: string; prenom: string; ts: number; source: string; synchro: '' | 'ok' | 'erreur' }

/** Les inscrits de « Rejoins ma liste ». */
export interface Liste {
  total: number;
  /** Inscrits des 7 derniers jours. */
  semaine: number;
  derniers: Contact[];
  integration: IntegrationListe | null;
  /** Inscrits pas encore partis chez le fournisseur (erreur, ou arrivés avant le branchement). */
  enAttente: number;
}

/** Ce que le back office demande au serveur (ou à la démo, dans l'aperçu). */
export interface Api {
  charger(): Promise<EtatAdmin>;
  enregistrerBloc(bloc: Bloc): Promise<Bloc>;
  supprimerBloc(id: string): Promise<void>;
  ordonner(ids: string[]): Promise<void>;
  enregistrerReglages(reglages: Reglages): Promise<Reglages>;
  envoyerImage(dataUrl: string): Promise<string>;
  /** Le titre, la description et l'image (en data URL) d'un site, lus par le serveur. */
  apercuSite(url: string): Promise<{ titre: string; description: string; image: string | null }>;
  stats(jours: number): Promise<Stats>;
  deconnexion(): Promise<void>;
  /** Enregistre l'acceptation des CGU et de l'accord de traitement en vigueur. */
  accepterCgu(): Promise<void>;
  /** Supprime son propre compte ; `confirmation` est le pseudo retapé. Jamais le compte principal. */
  supprimerMonCompte(confirmation: string): Promise<{ ok: boolean; message: string }>;
  /** L'adresse de l'export complet (JSON), ou null dans l'aperçu. */
  urlExport: string | null;
  /** Prendre une offre : l'adresse où aller (la page de paiement Creem, ou le retour après un changement d'offre). */
  ouvrirPaiement(plan: PlanPayant, periode: Periode): Promise<string>;
  /** L'adresse du portail client Creem : carte, factures, résiliation. */
  ouvrirPortail(): Promise<string>;
  liste(): Promise<Liste>;
  /** Branche Brevo ou Mailchimp (la clé est vérifiée chez eux), ou débranche avec `null`. */
  brancherListe(i: { fournisseur: FournisseurListe; cle: string; liste: string } | null): Promise<{ ok: boolean; message: string }>;
  supprimerContact(id: string): Promise<void>;
  /** Renvoie chez le fournisseur les inscrits qui n'y sont pas encore. */
  resynchroniser(): Promise<{ envoyes: number; erreurs: number }>;
  /** L'adresse du CSV des inscrits, ou null dans l'aperçu. */
  urlContacts: string | null;
  /** Seulement pour le compte principal : gérer les autres comptes. */
  comptes?: ApiComptes;
}

/** Un nom réservé depuis l'accueil, en attente d'invitation. */
export interface Reservation { id: string; email: string; pseudo: string; ts: number }

export interface ApiComptes {
  lister(): Promise<CompteResume[]>;
  /** Les offres et leurs produits dans Creem. */
  offres(): Promise<EtatOffre[]>;
  /** Crée dans Creem les produits qui manquent, au prix du jour. */
  creerOffres(): Promise<EtatOffre[]>;
  /** La liste d'attente, dans l'ordre d'arrivée. */
  attente(): Promise<Reservation[]>;
  /** Crée la page de la réservation et envoie l'invitation. */
  inviterAttente(id: string): Promise<{ ok: boolean; message: string; lienDev?: string }>;
  retirerAttente(id: string): Promise<void>;
  /** Crée le compte et envoie l'invitation ; renvoie le message à afficher. */
  inviter(email: string, pseudo: string): Promise<{ ok: boolean; message: string; lienDev?: string }>;
  renvoyer(id: string): Promise<{ ok: boolean; message: string; lienDev?: string }>;
  /** `motif` part par e-mail à la personne (DSA, article 17) quand on suspend ou supprime. */
  changerStatut(id: string, statut: CompteResume['statut'], motif: string): Promise<void>;
  supprimer(id: string, motif: string): Promise<void>;
  signalements(): Promise<SignalementResume[]>;
  /** Classe un signalement, ou suspend la page avec `decision` pour motif. */
  traiterSignalement(id: string, statut: 'sans-suite' | 'suspendu', decision: string): Promise<void>;
}

export interface SignalementResume {
  id: string;
  compte: string;
  pseudo: string;
  motif: string;
  details: string;
  /** Vrai si la personne a laissé son adresse (elle reçoit la décision). */
  contact: boolean;
  ts: number;
  statut: 'ouvert' | 'sans-suite' | 'suspendu';
  decision: string;
}

export function nouveauBloc(type: TypeBloc, id: string): Bloc {
  const titres: Record<TypeBloc, string> = {
    lien: '', titre: 'Nouvelle section', texte: '', video: 'Ma vidéo', 'derniere-video': 'Ma dernière vidéo', newsletter: 'Ma newsletter', inscription: 'Rejoins ma liste', preuve: 'Ce qu’ils en disent',
  };
  return {
    id, type, titre: titres[type], url: '', sousTitre: type === 'newsletter' || type === 'inscription' ? 'Un e-mail de temps en temps, rien de plus.' : '', description: '', icone: '', image: '',
    public: true, indexable: true, vedette: false, format: 'bandeau', teinte: 'accent', animation: 'auto', debut: '', fin: '',
    compteARebours: false, creneau: null, audience: null, cache: [], demanderPrenom: false, acces: null,
    preuve: type === 'preuve' ? { genre: 'note', note: 0, nombre: 0, source: '' } : null, traductions: {},
  };
}

/** Le mouvement que joue un bloc, une fois appliqués les réglages de la page. */
export function animationDe(bloc: Bloc, reglages: Reglages): Animation {
  if (bloc.animation !== 'auto') return bloc.animation;
  return bloc.vedette ? reglages.animation : 'aucune';
}

/** Un bloc est-il affiché maintenant ? Public, et dans sa programmation. */
export function estEnLigne(bloc: Bloc, maintenant = Date.now()): boolean {
  if (!bloc.public) return false;
  if (bloc.debut && Date.parse(bloc.debut) > maintenant) return false;
  if (bloc.fin && Date.parse(bloc.fin) <= maintenant) return false;
  return true;
}

export function idYoutube(url: string): string | null {
  const m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/.exec(url);
  return m?.[1] ?? null;
}
