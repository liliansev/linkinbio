import type { Bloc, Reglages } from './types.ts';
import { SANS_COULEURS, nouveauBloc } from './types.ts';
import { THEME_DEFAUT } from './themes.ts';

/*
 * Le contenu de départ, posé une seule fois quand la base est vide. Tout se
 * modifie ensuite depuis le back office.
 */

export const REGLAGES_DEFAUT: Reglages = {
  profil: {
    nom: 'Lilian Sevoumian',
    bio: 'J’automatise le travail des PME avec l’IA, n8n et Make. Vidéos, newsletter et formations.',
    avatar: '/avatar.webp',
    badge: true,
  },
  reseaux: [
    { reseau: 'youtube', url: 'https://www.youtube.com/@lilian.sevoumian' },
    { reseau: 'linkedin', url: 'https://www.linkedin.com/in/liliansevoumian/' },
    { reseau: 'github', url: 'https://github.com/liliansev' },
    { reseau: 'email', url: 'mailto:bonjour@liliansevoumian.fr' },
  ],
  reseauxPosition: 'haut',
  theme: THEME_DEFAUT,
  couleurs: SANS_COULEURS,
  bouton: { style: 'plein', forme: 'pilule', ombre: 'subtile' },
  seo: {
    titre: 'Lilian Sevoumian · Tous mes liens',
    description: 'Mes vidéos, ma newsletter, mes formations et mes projets, au même endroit.',
    indexable: true,
  },
  partage: true,
  ouvrirApps: true,
  resumeHebdo: true,
  vouvoiement: false,
  animation: 'orbite',
  bureau: 'onepage',
  vuesReseaux: [],
  utm: false,
  redirection: { url: '', fin: '' },
};

export function blocsDefaut(id: () => string): Bloc[] {
  const bloc = (type: Bloc['type'], champs: Partial<Bloc>): Bloc => ({ ...nouveauBloc(type, id()), ...champs });
  return [
    bloc('lien', { titre: 'Parlons de votre projet', sousTitre: 'Écrivez-moi, je vous réponds', url: 'https://liliansevoumian.fr/contact', icone: 'message', vedette: true }),
    bloc('derniere-video', { titre: 'Ma dernière vidéo' }),
    bloc('titre', { titre: 'Ce que je fais' }),
    bloc('lien', { titre: 'Mon site', url: 'https://liliansevoumian.fr', icone: 'site' }),
    bloc('lien', { titre: 'Le blog', url: 'https://liliansevoumian.fr/blog', icone: 'plume' }),
    bloc('lien', { titre: 'Agence AFK', sousTitre: 'Automatisation et IA pour les équipes', url: 'https://agenceafk.fr', icone: 'reglage' }),
    bloc('lien', { titre: 'Augmentés', sousTitre: 'Les formations IA', url: 'https://augmentes.fr', icone: 'diplome' }),
    bloc('newsletter', { titre: 'Ma newsletter', sousTitre: 'Ce que je teste en IA, directement dans votre boîte.' }),
  ];
}

/** La page d'un compte qui vient d'être créé : le pseudo pour nom, rien d'autre, invisible pour Google. */
export function reglagesNouveauCompte(pseudo: string): Reglages {
  // « camille-dupont » devient « Camille Dupont » : un nom, pas une adresse.
  const nom = pseudo.split('-').filter(Boolean).map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(' ') || pseudo;
  return {
    ...REGLAGES_DEFAUT,
    profil: { nom, bio: '', avatar: '', badge: false },
    reseaux: [],
    seo: { titre: `${nom} · Hopla`, description: '', indexable: false },
    animation: 'reflet',
    bureau: 'colonne',
  };
}
