/*
 * Le modèle de la page de liens, partagé par le serveur, le back office et la
 * page publique. Une page = des réglages (profil, thème, boutons, SEO) et une
 * liste ordonnée de blocs.
 */

import type { Abonnement, DureeOfferte, EtatOffre, Periode, Plan, PlanPayant } from './abonnement.ts';
import type { Droits } from './droits.ts';
import type { Creneau } from './moments.ts';
import type { PeriodeStats } from './periode.ts';
import type { Audience, EffetAudience } from './provenance.ts';
import type { Police } from './themes.ts';
import type { ArticleFlux } from './flux.ts';
import { INSTANCE } from './instance.ts';

export const TYPES_BLOC = ['lien', 'titre', 'texte', 'video', 'derniere-video', 'newsletter', 'inscription', 'preuve', 'produit', 'soutien', 'reservation',
  'musique', 'faq', 'coordonnees', 'lieu', 'galerie', 'formulaire', 'flux'] as const;
export type TypeBloc = (typeof TYPES_BLOC)[number];
/** La vitrine (Starter, 22 octobre 2026) : un produit et son prix, « Me soutenir », « Réserver ». Hopla n'encaisse rien, chacun mène au site qui vend. */
export const TYPES_VITRINE: readonly TypeBloc[] = ['produit', 'soutien', 'reservation'];
export type TypeVitrine = Extract<TypeBloc, 'produit' | 'soutien' | 'reservation'>;
/** Les blocs qui mènent à une adresse : la rangée du back office la montre à côté de leur nom. */
export const TYPES_ADRESSE: readonly TypeBloc[] = ['lien', 'video', 'musique', 'produit', 'soutien', 'reservation', 'derniere-video', 'flux'];
/** Les articles d'un flux RSS que la page montre (bloc `flux`). */
export const ARTICLES_FLUX = 3;
/** Les questions d'une FAQ, les images d'une galerie : combien au plus. Sans Starter, une galerie n'en montre que `GALERIE_GRATUITE`. */
export const MAX_QUESTIONS = 20;
export const MAX_IMAGES = 12;
export const GALERIE_GRATUITE = 3;
/**
 * Les blocs qu'une page Gratuit montre (25 octobre 2026) : les cinq premiers blocs visibles, sans compter les titres de
 * section ni les textes, qui ne mènent nulle part. Les autres attendent Starter, gardés tels quels.
 */
export const BLOCS_GRATUITS = 5;
export const compteDansLaLimite = (b: Pick<Bloc, 'type' | 'public'>) => b.public && b.type !== 'titre' && b.type !== 'texte';

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
  /** Le prix d'un produit tel qu'il s'affiche (« 24 € », « Dès 12 € », « Prix libre ») : lu sur sa page, ou tapé. */
  prix: string;
  /** « Me soutenir » : les montants proposés, en euros. Seul PayPal les reprend dans son adresse. */
  montants: number[];
  /** Un lien partenaire (affiliation, collaboration payée) : sa mention, à tous, et son code promo, avec Starter. */
  partenariat: Partenariat | null;
  /** Une FAQ : ses questions et leurs réponses, dans l'ordre (bloc `faq`, 24 octobre 2026). */
  questions: Question[];
  /** Une galerie : ses images, `/media/...` (bloc `galerie`). */
  images: string[];
  /** Une carte de visite : de quoi enregistrer le contact dans son téléphone (bloc `coordonnees`). Le site est l'adresse du bloc. */
  coordonnees: Coordonnees | null;
  /** Une adresse postale, telle qu'on l'écrit sur une enveloppe : celle d'un lieu (bloc `lieu`) ou d'une carte de visite. */
  adressePostale: string;
  /** Réservé aux plus de 18 ans : la page demande confirmation avant d'ouvrir le lien (24 octobre 2026). */
  sensible: boolean;
  /** Un titre de section : les liens qui le suivent, jusqu'au titre suivant, en liste ou en grille (Starter). Une collection, à la Linktree. */
  disposition: Disposition;
  /** Le pays du visiteur, lu chez Cloudflare : le bloc ne s'affiche que pour ces pays, ou pour tous sauf eux (Pro, 24 octobre 2026). */
  pays: { codes: string[]; effet: EffetPays } | null;
  /** « Rejoins ma liste » : un cadeau qui s'ouvre une fois l'adresse donnée (un guide, un code). Son adresse ne part jamais avec la page (Pro). */
  cadeau: Cadeau | null;
}

export const EFFETS_PAYS = ['seulement', 'sauf'] as const;
export type EffetPays = (typeof EFFETS_PAYS)[number];
/** Le nombre de pays qu'un bloc vise au plus. */
export const MAX_PAYS = 60;
export interface Cadeau { nom: string; url: string }

export const DISPOSITIONS = ['liste', 'grille'] as const;
export type Disposition = (typeof DISPOSITIONS)[number];

export interface Question { question: string; reponse: string }
export interface Coordonnees { telephone: string; email: string; societe: string; poste: string }

/** Les deux mentions que demande la loi du 9 juin 2023 sur l'influence commerciale. */
export const MENTIONS_PARTENAIRE = ['publicite', 'collaboration'] as const;
export type MentionPartenaire = (typeof MENTIONS_PARTENAIRE)[number];
export interface Partenariat {
  mention: MentionPartenaire;
  /** Le code promo à copier d'un geste, vide s'il n'y en a pas. */
  code: string;
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

export const RESEAUX = ['youtube', 'linkedin', 'instagram', 'tiktok', 'x', 'github', 'facebook', 'threads', 'twitch', 'spotify', 'email', 'site',
  // Les réseaux qu'on colle le plus, ajoutés le 24 octobre 2026 (d'après Linktree).
  'whatsapp', 'telegram', 'discord', 'pinterest', 'snapchat', 'bluesky', 'mastodon', 'reddit', 'substack', 'medium', 'patreon', 'soundcloud',
  'deezer', 'applemusic', 'applepodcasts', 'bandcamp', 'vimeo', 'behance', 'dribbble', 'malt', 'etsy'] as const;
/** Le nombre de réseaux qu'une page montre au plus. */
export const MAX_RESEAUX = 20;
export type Reseau = (typeof RESEAUX)[number];

/** Le fond, les boutons et l'accent qu'on peut changer après avoir choisi un thème. */
export interface Couleurs { fond: string; boutons: string; accent: string }
export const SANS_COULEURS: Couleurs = { fond: '', boutons: '', accent: '' };

export interface Reglages {
  /** `photo` : la photo de profil en rond, ou en grand en haut de la page, fondue dans le fond (Starter). */
  profil: { nom: string; bio: string; avatar: string; badge: boolean; photo: FormePhoto };
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
  /** Les mots de la page (formulaires, drops) vouvoient le visiteur plutôt que de le tutoyer. */
  vouvoiement: boolean;
  /** Le mouvement des liens mis en avant (un bloc peut choisir le sien). */
  animation: Animation;
  /** Les réseaux qui ont leur vue dans « Ma page » (vide : l'option est coupée). */
  /** Les réseaux où le compte colle son lien (choisis aux premiers pas) : chaque bloc se coche ou se décoche pour chacun. Vide : les plus connus. */
  vuesReseaux: Audience[];
  /** La mise en page sur un grand écran ; sur téléphone, la page reste une colonne. */
  bureau: MiseEnPageBureau;
  /** Les liens de la page portent `utm_source=hopla` : le site d'arrivée voit d'où vient le visiteur (Starter). */
  utm: boolean;
  /** Toute la page renvoie vers une seule adresse (un lancement, une sortie), jusqu'à `fin` (ISO) ou sans fin ; `url` vide : rien (Starter). */
  redirection: { url: string; fin: string };
  /** La police de la page, prise parmi celles des thèmes ; vide, celle du thème (Starter, avec les couleurs). */
  police: Police | '';
  /** Une photo à soi derrière la page, voilée de la couleur du fond ; vide, le fond du thème (Starter). */
  imageFond: string;
  /** Le nom court de l'adresse à partager (`hpla.art/camille`), qui renvoie vers hopla.page ; vide, hopla.page. */
  domaine: DomaineCourt | '';
}

export const FORMES_PHOTO = ['ronde', 'grande'] as const;
export type FormePhoto = (typeof FORMES_PHOTO)[number];

export const MISES_EN_PAGE_BUREAU = ['colonne', 'profil', 'onepage'] as const;
export type MiseEnPageBureau = (typeof MISES_EN_PAGE_BUREAU)[number];

/** Le compte de Lilian, servi sur hopla.page/lilian comme les autres sur hopla.page/<pseudo>. */
export const PRINCIPAL = 'principal';

/**
 * Les blocs branchés sur les outils de Lilian (sa newsletter) : réservés à sa page. « Ma dernière vidéo YouTube » est à
 * tous depuis le 24 octobre 2026 (l'adresse de la chaîne dans le bloc) ; sans adresse, c'est la chaîne de Lilian, à lui seul.
 */
export const TYPES_PRINCIPAL: readonly TypeBloc[] = ['newsletter'];

/** Qui possède la page : de quoi construire son adresse. */
export interface ComptePage { pseudo: string; principal: boolean }

/** Les pages publiques, et le back office sur son propre nom (son cookie n'est jamais envoyé aux pages) : hopla.page, ou ceux de l'instance (`lib/instance.ts`). */
export const ORIGINE_PUBLIQUE = INSTANCE.origine;
export const ORIGINE_ADMIN = INSTANCE.origineAdmin;
export interface Origines { page: string; admin: string }
/** Le site de Lilian, l'éditeur du service. */
export const SITE_LILIAN = 'https://liliansevoumian.fr';
export const cheminPage = (c: ComptePage) => `/${c.pseudo}`;
export const urlPage = (c: ComptePage) => `${ORIGINE_PUBLIQUE}${cheminPage(c)}`;
/**
 * Les noms courts (24 octobre 2026, achetés par Lilian) : `hpla.art/camille` renvoie en 301 vers
 * `hopla.page/camille`, chemin et requête gardés, pour toutes les pages. La page ne vit que sur hopla.page ;
 * chacun choisit seulement l'adresse qu'il partage (`domaine` des réglages).
 */
export const DOMAINES_COURTS = ['hpla.eu', 'hpla.art', 'hpla.pro', 'hpla.store'] as const;
export type DomaineCourt = (typeof DOMAINES_COURTS)[number];
/** L'adresse que la personne partage : sur son nom court s'il en a choisi un, sinon celle de la page. */
export const adressePartage = (c: ComptePage, domaine: DomaineCourt | '' = '') => (domaine ? `https://${domaine}${cheminPage(c)}` : urlPage(c));
/** `https://hopla.page/camille` devient `hopla.page/camille`. */
export const sansSchema = (url: string) => url.replace(/^https?:\/\//, '');
/** `hopla.page` et `app.hopla.page`, ou les noms de l'instance : pour les dire dans un texte. */
export const NOM_PUBLIC = sansSchema(ORIGINE_PUBLIQUE);
export const NOM_ADMIN = sansSchema(ORIGINE_ADMIN);

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
  /** Son abonnement tel que la personne le voit dans Réglages : l'offre payée, son statut et sa fin, une offre offerte. */
  abonnement: Abonnement;
}

/** Ce que la page publique reçoit : jamais un bloc privé ni hors programmation. */
export interface PagePublique {
  reglages: Reglages;
  blocs: Bloc[];
  /** Dès Starter, la page perd la mention « Créer ma page avec Hopla ». */
  compte: ComptePage & { plan: Plan };
  /** L'instant où la page a été composée : le compte à rebours part de là, au serveur comme au navigateur. */
  maintenant?: number;
  /** La page renvoie en ce moment vers cette adresse (« Redirection », Starter) : le visiteur n'en voit rien, il y part. */
  redirection?: string;
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
  /** Vrai dès qu'un visiteur a vu la page : elle a commencé, « Bien démarrer » ne se montre plus. */
  dejaVue: boolean;
}

/** Les vues de la semaine, montrées en Gratuit (24 octobre 2026, Lilian) : le détail reste à Starter. */
export interface Semaine { vues: number; avant: number; dejaVue: boolean }

export interface Stats {
  /** Le nombre de jours de la période, le premier et le dernier compris (ce sont ceux de `serie`). */
  jours: number;
  /** Des dates choisies dans le calendrier (« Du 12 au 18 octobre »), plutôt que les derniers jours. */
  plage?: boolean;
  vues: number;
  visiteurs: number;
  clics: number;
  /** Une entrée par jour, du plus ancien au plus récent. `visiteurs` : ceux du jour (un visiteur compte une fois par jour). */
  serie: { jour: string; vues: number; visiteurs: number; clics: number }[];
  /** `avant` : le même chiffre sur la période précédente. */
  blocs: { id: string; titre: string; clics: number; avant: number }[];
  sources: { nom: string; vues: number; avant: number }[];
  appareils: { nom: string; vues: number }[];
  /** Les pays des visiteurs, lus chez Cloudflare (`FR`, vide quand il ne le sait pas) ; l'adresse IP n'est jamais gardée. */
  pays: { code: string; vues: number; avant: number }[];
  /** Les clics depuis le navigateur intégré d'Instagram, TikTok… : en tout, vers un lien qui a son app, et ouverts dans l'app. */
  apps: { integres: number; versApp: number; ouverts: number };
  /** Mêmes totaux sur la période précédente, pour la tendance. */
  precedent: { vues: number; visiteurs: number; clics: number };
  /** Faux tant que personne n'a jamais vu la page (sur toute la durée de conservation) : Stats n'en montre alors qu'un état vide. */
  dejaVue: boolean;
}

/** Les newsletters branchées par leur API : une clé, puis la liste choisie parmi celles du compte. */
export const NEWSLETTERS = ['brevo', 'mailchimp', 'mailcheap', 'kit', 'mailerlite', 'beehiiv', 'loops', 'systeme'] as const;
/** Les outils d'automatisation, branchés par l'adresse d'un webhook. */
export const WEBHOOKS = ['make', 'zapier', 'n8n'] as const;
export const FOURNISSEURS_LISTE = [...NEWSLETTERS, ...WEBHOOKS] as const;
export type Newsletter = (typeof NEWSLETTERS)[number];
export type Webhook = (typeof WEBHOOKS)[number];
export type FournisseurListe = (typeof FOURNISSEURS_LISTE)[number];
export const estWebhook = (f: FournisseurListe): f is Webhook => (WEBHOOKS as readonly string[]).includes(f);

/**
 * Le fournisseur branché, sans jamais la clé : seulement ses quatre derniers caractères (pour un webhook, son
 * hôte et la fin de son adresse). `nom` : le nom de la liste chez lui, ou l'hôte d'un webhook.
 */
export interface IntegrationListe { fournisseur: FournisseurListe; liste: string; nom: string; cle: string }

/** Une liste du compte chez une newsletter (une audience Mailchimp, un formulaire Kit, un tag Systeme.io…). */
export interface ListeFournisseur { id: string; nom: string }

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

/**
 * L'image qu'on demande avec l'aperçu d'un site : aucune (`false`, plus vite), son image de partage (`true` ou
 * `'partage'`, la photo d'un produit), son logo seul (`'logo'`), ou la petite vignette carrée d'un bouton (`'vignette'` :
 * le favicon du site, sinon une image de partage carrée, sinon rien). Jamais une capture de la page (26 octobre 2026).
 */
export type ImageApercu = boolean | 'partage' | 'logo' | 'vignette';
/** La note d'une page d'avis, lue dans ses données structurées : sur 5, le nombre d'avis, le nom du site. */
export interface NoteAvis { note: number; nombre: number; source: string }
/** D'où vient l'image d'un aperçu : l'image de partage du site, ou son logo (son favicon). */
export type VisuelApercu = 'partage' | 'logo';

/** Ce que le back office demande au serveur (ou à la démo, dans l'aperçu). */
/** Une clé d'API, telle que Réglages la montre : son nom, ses premiers caractères, ce qu'elle peut, quand elle a servi. */
export interface CleApi { id: string; nom: string; debut: string; ecriture: boolean; cree: number; utilisee: number | null }

/** Les clés d'API du compte, pour l'API et le serveur MCP (Réglages, « API et MCP »). */
export interface ApiCles {
  lister(): Promise<CleApi[]>;
  /** La clé en clair ne revient qu'ici, une fois. */
  creer(nom: string, ecriture: boolean): Promise<{ cle: string; infos: CleApi }>;
  revoquer(id: string): Promise<void>;
}

export interface Api {
  charger(): Promise<EtatAdmin>;
  enregistrerBloc(bloc: Bloc): Promise<Bloc>;
  supprimerBloc(id: string): Promise<void>;
  ordonner(ids: string[]): Promise<void>;
  enregistrerReglages(reglages: Reglages): Promise<Reglages>;
  envoyerImage(dataUrl: string): Promise<string>;
  /**
   * Le titre, la description, l'image (en data URL) et le prix (une boutique) d'un site, lus par le serveur. Voir
   * `ImageApercu` pour l'image demandée ; `visuel` dit d'où vient celle qui revient.
   */
  apercuSite(url: string, image?: ImageApercu): Promise<{ titre: string; description: string; image: string | null; prix: string; visuel?: VisuelApercu }>;
  /** Les stats des derniers jours (7, 14, 30, 90 ou 365), ou de dates choisies. */
  /** Les derniers articles d'un blog ou d'un flux RSS (`video` : la dernière vidéo d'une chaîne YouTube), lus par le serveur ; vide s'il ne se lit pas. */
  flux(url: string, video: boolean): Promise<ArticleFlux[]>;
  stats(periode: PeriodeStats): Promise<Stats>;
  /** La note de la page d'avis à cette adresse ; null quand elle n'en déclare pas. */
  noteAvis?(url: string): Promise<NoteAvis | null>;
  /** Les vues des 7 derniers jours et des 7 d'avant, lisibles par toutes les offres, Gratuit compris. */
  semaine?(): Promise<Semaine>;
  deconnexion(): Promise<void>;
  /** Enregistre l'acceptation des CGU et de l'accord de traitement en vigueur. */
  accepterCgu(): Promise<void>;
  /**
   * Supprime son propre compte ; `confirmation` est le pseudo retapé. Jamais le compte principal. Un abonnement
   * en cours est résilié avant ; `aLaMain` : Creem ne l'a pas confirmé, il sera résilié à la main (le message le dit).
   */
  supprimerMonCompte(confirmation: string): Promise<{ ok: boolean; message: string; aLaMain?: boolean }>;
  /** L'adresse de l'export complet (JSON), ou null dans l'aperçu. */
  urlExport: string | null;
  /** Prendre une offre : l'adresse où aller (la page de paiement Creem, ou le retour après un changement d'offre). */
  ouvrirPaiement(plan: PlanPayant, periode: Periode): Promise<string>;
  /** L'adresse du portail client Creem : carte, factures, résiliation. */
  ouvrirPortail(): Promise<string>;
  /** Repasser en Gratuit : l'abonnement est résilié chez Creem pour la fin de la période payée. L'abonnement tel qu'il est ensuite. */
  resilierAbonnement(): Promise<Abonnement>;
  liste(): Promise<Liste>;
  /**
   * Les listes du compte chez une newsletter, pour en choisir une par son nom. `cle` vide : celle déjà
   * enregistrée pour ce fournisseur (le navigateur ne la connaît pas).
   */
  listesFournisseur(i: { fournisseur: FournisseurListe; cle: string }): Promise<{ ok: boolean; message: string; listes: ListeFournisseur[] }>;
  /**
   * Branche une newsletter ou un webhook (la clé ou l'adresse est vérifiée chez eux), ou débranche avec `null`.
   * Pour un webhook, `cle` est son adresse et `liste` reste vide.
   */
  brancherListe(i: { fournisseur: FournisseurListe; cle: string; liste: string } | null): Promise<{ ok: boolean; message: string }>;
  supprimerContact(id: string): Promise<void>;
  /** Renvoie chez le fournisseur les inscrits qui n'y sont pas encore. */
  resynchroniser(): Promise<{ envoyes: number; erreurs: number }>;
  /** Toutes les adresses des inscrits, à coller dans Substack (qui n'a pas d'API). */
  adresses(): Promise<string[]>;
  /** L'adresse du CSV des inscrits (`?format=substack` : les adresses seules, pour l'import de Substack), ou null dans l'aperçu. */
  urlContacts: string | null;
  /** Seulement pour le compte principal : gérer les autres comptes. */
  comptes?: ApiComptes;
  /** Absent dans l'aperçu statique sans serveur. */
  cles?: ApiCles;
}

/**
 * Ce qu'il advient de l'abonnement Creem d'un compte qu'on supprime : `aucune` (rien à résilier), `faite`
 * (résilié tout de suite), `a-la-main` (Creem ne l'a pas confirmé deux fois de suite : le compte est supprimé
 * quand même, et Lilian reçoit de quoi le résilier à la main).
 */
export type Resiliation = 'aucune' | 'faite' | 'a-la-main';

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
  /** Son lien : le premier e-mail d'une page jamais ouverte (7 jours), un lien de connexion d'un jour sinon. */
  renvoyer(id: string): Promise<{ ok: boolean; message: string; lienDev?: string }>;
  /** Résilie l'abonnement pour la fin de la période payée ; la personne est prévenue, avec `mot` s'il y en a un. */
  resilier(id: string, mot: string): Promise<{ ok: boolean; message: string }>;
  /** Offre une offre, sans paiement, pour une durée ; la personne est prévenue, avec `mot` s'il y en a un. */
  offrir(id: string, plan: PlanPayant, duree: DureeOfferte, mot: string): Promise<{ ok: boolean; message: string }>;
  /** Retire l'offre offerte : la page revient à ce qu'elle paie, ou à Gratuit. */
  retirerOffre(id: string): Promise<{ ok: boolean; message: string }>;
  /** `motif` part par e-mail à la personne (DSA, article 17) quand on suspend ou supprime. */
  changerStatut(id: string, statut: CompteResume['statut'], motif: string): Promise<void>;
  /** Supprime le compte, après avoir résilié son abonnement : ce qu'il est advenu de l'abonnement. */
  supprimer(id: string, motif: string): Promise<Resiliation>;
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

/** Les montants que « Me soutenir » propose d'abord, en euros. */
export const MONTANTS_DEFAUT: readonly number[] = [3, 5, 10];

export function nouveauBloc(type: TypeBloc, id: string): Bloc {
  const titres: Record<TypeBloc, string> = {
    lien: '', titre: '', texte: '', video: 'Ma vidéo', 'derniere-video': 'Ma dernière vidéo', newsletter: 'Ma newsletter', inscription: 'Rejoins ma liste', preuve: 'Ce qu’ils en disent',
    produit: '', soutien: 'Me soutenir', reservation: 'Prendre rendez-vous',
    musique: 'Écouter', faq: 'Questions fréquentes', coordonnees: '', lieu: '', galerie: '', formulaire: 'Me contacter', flux: 'Mes derniers articles',
  };
  return {
    id, type, titre: titres[type], url: '', sousTitre: type === 'newsletter' || type === 'inscription' ? 'Un e-mail de temps en temps, rien de plus.' : '', description: '', icone: '', image: '',
    public: true, indexable: true, vedette: false, format: 'bandeau', teinte: 'accent', animation: 'auto', debut: '', fin: '',
    compteARebours: false, creneau: null, audience: null, cache: [], demanderPrenom: false, acces: null,
    preuve: type === 'preuve' ? { genre: 'note', note: 0, nombre: 0, source: '' } : null,
    prix: '', montants: type === 'soutien' ? [...MONTANTS_DEFAUT] : [], partenariat: null,
    questions: type === 'faq' ? [{ question: '', reponse: '' }] : [], images: [],
    coordonnees: type === 'coordonnees' ? { telephone: '', email: '', societe: '', poste: '' } : null, adressePostale: '', sensible: false, disposition: 'liste',
    pays: null, cadeau: null,
  };
}

/** Le format d'un bloc mis en avant, tel que la page le montre : le sien, sauf un produit, qui devient une grande carte, et une réservation, un bandeau. */
export function formatVedette(bloc: Bloc): FormatVedette | undefined {
  if (!bloc.vedette) return undefined;
  return bloc.type === 'produit' ? 'carte' : bloc.type === 'reservation' ? 'bandeau' : bloc.format;
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
