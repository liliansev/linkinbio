/*
 * L'instance : ce qui distingue hopla.page d'un Hopla auto-hébergé (28 octobre 2026). Les valeurs viennent de
 * l'environnement du serveur, au démarrage (29 octobre 2026, pour qu'une image Docker serve n'importe quelle instance) :
 * `deploy/server.mjs` les pose dans `globalThis.__HOPLA_INSTANCE__` avant de charger l'app, et les écrit dans chaque page
 * HTML pour le navigateur. En développement, `vite.config.ts` les lit dans `.env`. Sans rien de posé (le serveur de
 * hopla.page, les tests), ce sont celles de hopla.page. Voir `.env.example` et `docs/SELF-HOSTING.md`.
 */

export interface ValeursInstance {
  /** `LIENS_ORIGINE` : les pages publiques. */
  origine: string;
  /** `LIENS_ORIGINE_ADMIN` : le back office. */
  origineAdmin: string;
  /** `LIENS_CONTACT_LEGAL` : l'adresse des textes légaux, de « Nous écrire » et des réponses aux e-mails. */
  contact: string;
  /** `LIENS_EDITEUR` : qui édite l'instance (nom, forme, adresse, immatriculation), en une ligne. */
  editeur: string;
  /** `LIENS_HEBERGEUR` : l'hébergeur du serveur, en une ligne. */
  hebergeur: string;
  /** `LIENS_DIRECTEUR` : le directeur de la publication. */
  directeur: string;
  /** `LIENS_DEPOT_SOURCE` : où lire le code de l'instance (AGPL-3.0, article 13), le dépôt de Hopla ou son fork. */
  depot: string;
}

const HOPLA: ValeursInstance = {
  origine: 'https://hopla.page',
  origineAdmin: 'https://app.hopla.page',
  contact: 'bonjour@liliansevoumian.fr',
  editeur: 'AURA GROUP, SARL au capital de 100 €, 5 avenue du Maréchal de Lattre de Tassigny, 94600 Choisy-le-Roi',
  hebergeur: 'Hostinger International Limited, 61 Lordou Vironos Street, 6023 Larnaca, Chypre',
  directeur: 'Lilian Sevoumian',
  depot: 'https://github.com/liliansev/linkinbio',
};

const global = (globalThis as { __HOPLA_INSTANCE__?: Partial<ValeursInstance> }).__HOPLA_INSTANCE__;
const posees: Partial<ValeursInstance> = typeof global === 'object' && global ? global : {};
const origine = (v: string | undefined, defaut: string) => (v && /^https?:\/\/[^/]+/.test(v) ? v.replace(/\/+$/, '') : defaut);
const texte = (v: string | undefined, defaut: string) => v?.trim() || defaut;

const publique = origine(posees.origine, HOPLA.origine);
/** Une instance auto-hébergée sans adresse de back office le sert sur le même nom que ses pages. */
const origines = { origine: publique, origineAdmin: origine(posees.origineAdmin, publique === HOPLA.origine ? HOPLA.origineAdmin : publique) };

/**
 * L'instance de hopla.page, celle de Lilian : seule elle porte sa page par défaut, sa signature, sa chaîne YouTube et
 * l'identité légale d'AURA GROUP. Une instance auto-hébergée a les siennes.
 */
export const EST_HOPLA_PAGE = origines.origine === HOPLA.origine;

/** Ailleurs que sur hopla.page, jamais l'identité d'AURA GROUP par défaut : ce qui manque se lit comme tel. */
const aRenseigner = (variable: string) => `(à renseigner par l’administrateur de l’instance : ${variable})`;
const defaut = (cle: 'editeur' | 'hebergeur' | 'directeur', variable: string) => (EST_HOPLA_PAGE ? HOPLA[cle] : aRenseigner(variable));

export const INSTANCE: ValeursInstance = {
  ...origines,
  contact: texte(posees.contact, EST_HOPLA_PAGE ? HOPLA.contact : `contact@${new URL(origines.origine).hostname}`),
  editeur: texte(posees.editeur, defaut('editeur', 'LIENS_EDITEUR')),
  hebergeur: texte(posees.hebergeur, defaut('hebergeur', 'LIENS_HEBERGEUR')),
  directeur: texte(posees.directeur, defaut('directeur', 'LIENS_DIRECTEUR')),
  depot: origine(posees.depot, HOPLA.depot),
};

/**
 * Le lien « Code source » (AGPL-3.0, article 13) : toujours sur une instance auto-hébergée ; sur hopla.page, depuis
 * que le dépôt est public (29 octobre 2026). Le repasser à false si le dépôt redevenait privé.
 */
const DEPOT_OUVERT = true;
export const LIEN_SOURCE = !EST_HOPLA_PAGE || DEPOT_OUVERT ? INSTANCE.depot : '';

/** Le nom de l'éditeur, sans sa forme ni son adresse : « AURA GROUP ». */
export const NOM_EDITEUR = INSTANCE.editeur.split(',')[0].trim();

/** Ce qui se lit dans l'environnement (le même calcul dans `deploy/server.mjs`, qui ne charge pas ce fichier). */
export const valeursDuBuild = (env: Record<string, string | undefined>): Partial<ValeursInstance> => ({
  origine: env.LIENS_ORIGINE, origineAdmin: env.LIENS_ORIGINE_ADMIN, contact: env.LIENS_CONTACT_LEGAL,
  editeur: env.LIENS_EDITEUR, hebergeur: env.LIENS_HEBERGEUR, directeur: env.LIENS_DIRECTEUR, depot: env.LIENS_DEPOT_SOURCE,
});
