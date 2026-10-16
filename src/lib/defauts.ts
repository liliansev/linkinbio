import type { Bloc, Reglages } from './types.ts';
import { nouveauBloc } from './types.ts';
import { THEME_DEFAUT } from './themes.ts';

/*
 * Le contenu de départ, posé une seule fois quand la base est vide. Tout se
 * modifie ensuite depuis le back office.
 */

export const REGLAGES_DEFAUT: Reglages = {
  profil: {
    nom: 'Lilian Sevoumian',
    bio: 'J’automatise le travail des PME avec l’IA, n8n et Make. Vidéos, newsletter et formations.',
    avatar: '/liens/avatar.webp',
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
  bouton: { style: 'plein', forme: 'pilule' },
  seo: {
    titre: 'Lilian Sevoumian · Tous mes liens',
    description: 'Mes vidéos, ma newsletter, mes formations et mes projets, au même endroit.',
    indexable: true,
  },
  partage: true,
  animation: 'orbite',
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
