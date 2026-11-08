import type { Bloc, Couleurs, Langue, PagePublique, Reglages } from '../lib/types.ts';
import { FONCTIONS, peut } from '../lib/abonnement.ts';
import type { Fonction } from '../lib/abonnement.ts';
import { selonDroits } from '../lib/droits.ts';
import { nouveauBloc, SANS_COULEURS } from '../lib/types.ts';
import { REGLAGES_DEFAUT } from '../lib/defauts.ts';
import { themeParId } from '../lib/themes.ts';
import { composerAudience } from '../lib/provenance.ts';
import type { Audience } from '../lib/provenance.ts';

/** Neuf profils fictifs, portraits générés. Une seule identité par personne,
 * utilisée dans le hero, les thèmes, l’édition et toutes les démonstrations,
 * et une seule offre (`offre`) : Inès montre ce qu'apporte Starter, Nadia et
 * Théo ce qu'apporte Pro, les autres restent en Gratuit. Neuf thèmes qui ne se
 * ressemblent pas (26 octobre 2026, demandé par Lilian : « que ça donne envie ») :
 * la terre cuite d'Inès, la nuit bleue de Sacha, le noir et or de Camille, le lagon
 * de Nadia, l'arcade de Yanis, le Bauhaus de Théo, la cerise de Karim, le champagne de
 * Margaux, le lilas de Chloé. Nadia, Yanis et Théo ont pris la
 * place d'un chef, d'une prof de yoga et d'un illustrateur le 27 octobre 2026, à la
 * demande de Lilian : des métiers qui vivent de leur audience, moins génériques ;
 * Karim (chef à domicile, Starter), Margaux (décoratrice) et Chloé (étudiante en prépa
 * qui donne des cours) les ont rejoints le même jour. */
export const PROFILS = {
  ines: { nom: 'Inès Laurent', bio: 'Les mains dans la terre, la tête pleine d’idées.', avatar: '/profil-ines.webp', metier: 'Céramiste', ville: 'Lyon', pseudo: 'ines-atelier', theme: 'argile', offre: 'starter' },
  sacha: { nom: 'Sacha Diop', bio: 'Des chansons pour les jours bleus.', avatar: '/profil-sacha.webp', metier: 'Musicien', ville: 'Paris', pseudo: 'sacha-diop', theme: 'galaxie', offre: 'gratuit' },
  camille: { nom: 'Camille Nguyen', bio: 'Des gens, des lieux et la lumière entre les deux.', avatar: '/profil-camille.webp', metier: 'Photographe', ville: 'Bordeaux', pseudo: 'camille', theme: 'onyx', offre: 'gratuit' },
  nadia: { nom: 'Nadia Haddad', bio: 'Ton argent, sans tabou et sans jargon.', avatar: '/profil-nadia.webp', metier: 'Formatrice en finances', ville: 'Tours', pseudo: 'nadia-budget', theme: 'lagon', offre: 'pro' },
  yanis: { nom: 'Yanis Bertrand', bio: 'Une vidéo chaque mercredi, des coulisses tous les jours.', avatar: '/profil-yanis.webp', metier: 'Youtubeur', ville: 'Montpellier', pseudo: 'yanis', theme: 'arcade', offre: 'gratuit' },
  karim: { nom: 'Karim Belkacem', bio: 'Un restaurant chez vous, le temps d’un soir.', avatar: '/profil-karim.webp', metier: 'Chef à domicile', ville: 'Nice', pseudo: 'chef-karim', theme: 'cerise', offre: 'starter' },
  margaux: { nom: 'Margaux Lefèvre', bio: 'Des intérieurs qui vous ressemblent, sans tout changer.', avatar: '/profil-margaux.webp', metier: 'Décoratrice d’intérieur', ville: 'Annecy', pseudo: 'margaux-deco', theme: 'champagne', offre: 'gratuit' },
  chloe: { nom: 'Chloé Tran', bio: 'En prépa, et prof de maths le mercredi soir.', avatar: '/profil-chloe.webp', metier: 'Étudiante en prépa', ville: 'Grenoble', pseudo: 'chloe-maths', theme: 'lilas', offre: 'gratuit' },
  theo: { nom: 'Théo Marchal', bio: 'Apprends à voir trois coups d’avance.', avatar: '/profil-theo.webp', metier: 'Formateur en échecs', ville: 'Rennes', pseudo: 'theo-echecs', theme: 'bauhaus', offre: 'pro' },
} as const;
export type ProfilExemple = keyof typeof PROFILS;

/**
 * Les mêmes neuf personnes en anglais (8 novembre 2026, Hopla anglais d'abord) : leur visage et leur thème ne changent
 * pas ; leur métier, leur bio et leur ville parlent à un visiteur américain.
 */
const PROFILS_EN: Record<ProfilExemple, { nom: string; bio: string; metier: string; ville: string }> = {
  ines: { nom: 'Ines Laurent', bio: 'Hands in the clay, head full of ideas.', metier: 'Ceramist', ville: 'Portland' },
  sacha: { nom: 'Sacha Diop', bio: 'Songs for blue days.', metier: 'Musician', ville: 'Brooklyn' },
  camille: { nom: 'Camille Nguyen', bio: 'People, places and the light in between.', metier: 'Photographer', ville: 'Austin' },
  nadia: { nom: 'Nadia Haddad', bio: 'Your money, no taboo, no jargon.', metier: 'Personal finance coach', ville: 'Denver' },
  yanis: { nom: 'Yanis Bertrand', bio: 'A new video every Wednesday, behind the scenes every day.', metier: 'YouTuber', ville: 'Los Angeles' },
  karim: { nom: 'Karim Belkacem', bio: 'A restaurant in your home, for one night.', metier: 'Private chef', ville: 'Miami' },
  margaux: { nom: 'Margaux Lefevre', bio: 'Interiors that feel like you, without starting over.', metier: 'Interior designer', ville: 'Seattle' },
  chloe: { nom: 'Chloe Tran', bio: 'Engineering student, math tutor on Wednesday nights.', metier: 'Student and tutor', ville: 'Boston' },
  theo: { nom: 'Theo Marchal', bio: 'Learn to see three moves ahead.', metier: 'Chess coach', ville: 'Chicago' },
};

/** Une personne d'exemple dans la langue du site. */
export function profilDe(id: ProfilExemple, langue: Langue = 'fr') {
  const p = PROFILS[id];
  return langue === 'en' ? { ...p, ...PROFILS_EN[id] } : p;
}
export const IDS_PROFILS = Object.keys(PROFILS) as ProfilExemple[];

const lien = (id: string, titre: string, icone: string, extra: Partial<Bloc> = {}): Bloc => ({
  ...nouveauBloc('lien', `exemple-${id}`), titre, icone, url: `https://exemple.fr/${id}`, ...extra,
});
const avant = (...sources: Audience[]): Pick<Bloc, 'audience'> => ({ audience: { sources, effet: 'avant' } });

export const BLOCS_EXEMPLES: Record<ProfilExemple, Bloc[]> = {
  ines: [lien('ines-pieces', 'Mes pièces du moment', 'boutique', { vedette: true, format: 'bouton' }), lien('ines-atelier', 'Un samedi à l’atelier', 'agenda'), lien('ines-video', 'Les coulisses en vidéo', 'youtube', { url: 'https://youtube.com/', ...avant('youtube') })],
  sacha: [lien('sacha-single', 'Écouter Les jours bleus', 'spotify', { url: 'https://open.spotify.com/', vedette: true, format: 'bouton' }), lien('sacha-dates', 'Les prochaines dates', 'billet'), lien('sacha-clip', 'Le clip, enfin !', 'youtube', { url: 'https://youtube.com/' })],
  camille: [
    lien('camille-contact', 'Parlons de ton projet', 'equipe', { audience: { sources: ['linkedin'], effet: 'seulement' } }),
    lien('camille-portfolio', 'Mon portfolio', 'photo', { ...avant('instagram'), vedette: true, format: 'bouton' }),
    lien('camille-coulisses', 'Les coulisses en vidéo', 'tiktok', { url: 'https://tiktok.com/', ...avant('tiktok'), cache: ['linkedin'] }),
    lien('camille-tuto', 'Mon tuto lumière', 'youtube', { url: 'https://youtube.com/', ...avant('youtube') }),
  ],
  nadia: [lien('nadia-podcast', 'Le podcast du matin', 'podcast', { vedette: true, format: 'bouton' }), lien('nadia-methode', 'Ma méthode en vidéo', 'youtube', { url: 'https://youtube.com/' }), lien('nadia-bilan', 'Réserver un bilan', 'agenda')],
  yanis: [lien('yanis-video', 'La vidéo de mercredi', 'youtube', { url: 'https://youtube.com/', vedette: true, format: 'bouton' }), lien('yanis-coulisses', 'Les coulisses sur TikTok', 'tiktok', { url: 'https://tiktok.com/' }), lien('yanis-materiel', 'Mon matériel de tournage', 'camera')],
  karim: [lien('karim-diner', 'Réserver un dîner chez vous', 'agenda', { vedette: true, format: 'bouton' }), lien('karim-menus', 'Mes menus de saison', 'document'), lien('karim-instagram', 'Mes assiettes sur Instagram', 'instagram', { url: 'https://instagram.com/' })],
  margaux: [lien('margaux-rdv', 'Un premier rendez-vous', 'agenda', { vedette: true, format: 'bouton' }), lien('margaux-avant-apres', 'Mes avant-après', 'photo'), lien('margaux-pinterest', 'Mes idées sur Pinterest', 'pinterest', { url: 'https://pinterest.com/' })],
  chloe: [lien('chloe-cours', 'Réserver un cours de maths', 'agenda', { vedette: true, format: 'bouton' }), lien('chloe-fiches', 'Mes fiches de révision', 'document'), lien('chloe-message', 'M’écrire avant un premier cours', 'courrier')],
  // Théo est en Pro : sa page porte un drop, le stage que ses élèves débloquent avec un code.
  theo: [lien('theo-cours', 'Mes cours en ligne', 'video', { vedette: true, format: 'bouton' }), lien('theo-stage', 'Le stage d’ouvertures', 'cadenas', { acces: { code: '•', places: 30 }, restantes: 3 }), lien('theo-particulier', 'Un cours particulier', 'agenda')],
};

/** Les textes des blocs d'exemple en anglais, par l'id du bloc ; ce qui n'est pas là reste tel quel. */
const BLOCS_EN: Record<string, Partial<Bloc>> = {
  'exemple-ines-pieces': { titre: 'My latest pieces' }, 'exemple-ines-atelier': { titre: 'A Saturday at the studio' }, 'exemple-ines-video': { titre: 'Behind the scenes on video' },
  'exemple-sacha-single': { titre: 'Listen to Blue Days' }, 'exemple-sacha-dates': { titre: 'Upcoming shows' }, 'exemple-sacha-clip': { titre: 'The music video is out!' },
  'exemple-camille-contact': { titre: 'Let’s talk about your project' }, 'exemple-camille-portfolio': { titre: 'My portfolio' },
  'exemple-camille-coulisses': { titre: 'Behind the scenes on video' }, 'exemple-camille-tuto': { titre: 'My lighting tutorial' },
  'exemple-nadia-podcast': { titre: 'The morning podcast' }, 'exemple-nadia-methode': { titre: 'My method on video' }, 'exemple-nadia-bilan': { titre: 'Book a money check-in' },
  'exemple-yanis-video': { titre: 'Wednesday’s video' }, 'exemple-yanis-coulisses': { titre: 'Behind the scenes on TikTok' }, 'exemple-yanis-materiel': { titre: 'My filming gear' },
  'exemple-karim-diner': { titre: 'Book a dinner at your place' }, 'exemple-karim-menus': { titre: 'My seasonal menus' }, 'exemple-karim-instagram': { titre: 'My plates on Instagram' },
  'exemple-margaux-rdv': { titre: 'Book a first consultation' }, 'exemple-margaux-avant-apres': { titre: 'My before and afters' }, 'exemple-margaux-pinterest': { titre: 'My ideas on Pinterest' },
  'exemple-chloe-cours': { titre: 'Book a math lesson' }, 'exemple-chloe-fiches': { titre: 'My study sheets' }, 'exemple-chloe-message': { titre: 'Message me before a first lesson' },
  'exemple-theo-cours': { titre: 'My online courses' }, 'exemple-theo-stage': { titre: 'The openings workshop' }, 'exemple-theo-particulier': { titre: 'A private lesson' },
  'page-ines-bol': { titre: 'Moon bowl, glazed stoneware', prix: '$38', description: 'Hand-thrown in Portland. Every piece is one of a kind.' },
  'page-ines-atelier': { titre: 'A Saturday at the studio', sousTitre: 'Your first bowl in three hours' },
  'page-ines-avis': { titre: 'What my students say' }, 'page-ines-video': { titre: 'Behind the scenes on video' },
  'page-sacha-ep': { titre: 'Blue Days', sousTitre: 'The new EP, five tracks' }, 'page-sacha-dates': { titre: 'Upcoming shows', sousTitre: 'Brooklyn, Chicago, Toronto' },
  'page-sacha-clip': { titre: 'The music video is out!' },
  'page-camille-images': { titre: 'My latest shots' }, 'page-camille-portfolio': { titre: 'My portfolio' },
  'page-camille-contact': { titre: 'Let’s talk about your project' }, 'page-camille-tuto': { titre: 'My lighting tutorial' },
  'page-nadia-bilan': { titre: 'A 30-minute money check-in', sousTitre: 'We reset your budget, together' },
  'page-nadia-podcast': { titre: 'Money, made simple', sousTitre: 'The podcast, a new episode every Monday' },
  'page-nadia-guide': { titre: 'My free budget guide' }, 'page-nadia-astuces': { titre: 'One money tip every Sunday', sousTitre: 'A five-minute read, zero jargon.' },
  'page-yanis-videos': { titre: 'My latest videos' }, 'page-yanis-video': { titre: 'Wednesday’s video' },
  'page-yanis-coulisses': { titre: 'Behind the scenes on TikTok' }, 'page-yanis-materiel': { titre: 'My filming gear' },
  'page-karim-diner': { titre: 'Book a dinner at your place', sousTitre: '4 to 12 guests, across South Florida' },
  'page-karim-assiettes': { titre: 'The fall menu' }, 'page-karim-avis': { titre: 'What my guests say' }, 'page-karim-menus': { titre: 'My seasonal menus' },
  'page-margaux-projets': { titre: 'My latest projects' }, 'page-margaux-rdv': { titre: 'Book a first consultation' },
  'page-margaux-avant-apres': { titre: 'My before and afters' }, 'page-margaux-pinterest': { titre: 'My ideas on Pinterest' },
  'page-chloe-cours': { titre: 'Book a math lesson' },
  'page-chloe-mot': { titre: 'Engineering student in Boston. I tutor math and physics, from middle school to high school, at your place or online.' },
  'page-chloe-fiches': { titre: 'My study sheets' }, 'page-chloe-message': { titre: 'Message me before a first lesson' },
  'page-theo-puzzles': { titre: 'Puzzles of the week' }, 'page-theo-cours': { titre: 'Chess openings, the complete course', prix: '$49' },
  'page-theo-stage': { titre: 'The openings workshop' }, 'page-theo-particulier': { titre: 'A private lesson', sousTitre: 'Online, all levels' },
};

/** Les blocs d'exemple dans la langue du site. */
export const enLangue = (blocs: Bloc[], langue: Langue = 'fr'): Bloc[] => (langue === 'en' ? blocs.map(b => ({ ...b, ...BLOCS_EN[b.id] })) : blocs);
/** Les blocs courts d'un profil, pour les démos (héros, Roue, Prise). */
export const blocsExemples = (id: ProfilExemple, langue: Langue = 'fr') => enLangue(BLOCS_EXEMPLES[id], langue);

const RESEAUX_EXEMPLES: Record<ProfilExemple, Reglages['reseaux']> = {
  ines: [{ reseau: 'instagram', url: 'https://instagram.com/' }, { reseau: 'youtube', url: 'https://youtube.com/' }],
  sacha: [{ reseau: 'spotify', url: 'https://open.spotify.com/' }, { reseau: 'youtube', url: 'https://youtube.com/' }],
  camille: [{ reseau: 'instagram', url: 'https://instagram.com/' }, { reseau: 'linkedin', url: 'https://linkedin.com/' }],
  nadia: [{ reseau: 'instagram', url: 'https://instagram.com/' }, { reseau: 'youtube', url: 'https://youtube.com/' }],
  yanis: [{ reseau: 'youtube', url: 'https://youtube.com/' }, { reseau: 'tiktok', url: 'https://tiktok.com/' }, { reseau: 'instagram', url: 'https://instagram.com/' }],
  karim: [{ reseau: 'instagram', url: 'https://instagram.com/' }, { reseau: 'tiktok', url: 'https://tiktok.com/' }],
  margaux: [{ reseau: 'instagram', url: 'https://instagram.com/' }, { reseau: 'pinterest', url: 'https://pinterest.com/' }],
  chloe: [{ reseau: 'instagram', url: 'https://instagram.com/' }, { reseau: 'email', url: 'mailto:chloe@exemple.fr' }],
  theo: [{ reseau: 'youtube', url: 'https://youtube.com/' }, { reseau: 'twitch', url: 'https://twitch.tv/' }],
};

/** La vraie page publique avec les thèmes et le modèle du produit, sans appel serveur. */
export function pageExemple(id: ProfilExemple, theme: string = PROFILS[id].theme, o: { couleurs?: Couleurs; profil?: Partial<Reglages['profil']>; reseaux?: boolean; blocs?: Bloc[]; langue?: Langue } = {}): PagePublique {
  const langue = o.langue ?? 'fr';
  const p = profilDe(id, langue);
  return {
    reglages: {
      ...REGLAGES_DEFAUT, theme, langue, couleurs: o.couleurs ?? SANS_COULEURS,
      bouton: { ...REGLAGES_DEFAUT.bouton, ...themeParId(theme).conseil }, animation: 'aucune', bureau: 'colonne', partage: false,
      profil: { nom: p.nom, bio: p.bio, avatar: p.avatar, badge: false, photo: 'ronde', ...o.profil },
      reseaux: o.reseaux === false ? [] : RESEAUX_EXEMPLES[id].map(r => ({ ...r })),
    },
    blocs: enLangue(o.blocs ?? composerAudience(BLOCS_EXEMPLES[id], ''), langue).map(b => ({ ...b })),
    compte: { pseudo: p.pseudo, principal: false, plan: p.offre },
  };
}

const bloc = (type: Bloc['type'], id: string, champs: Partial<Bloc>): Bloc => ({ ...nouveauBloc(type, `page-${id}`), ...champs });
const image = (nom: string) => `/exemple-${nom}.svg`;

/*
 * La page complète de chaque profil, celle qu'on ouvre dans la galerie : ses blocs
 * dans leur meilleure forme (vitrine, galerie, lecteur, avis, liste e-mail) et sa
 * grande photo quand son offre la comprend. Les images sont dessinées pour Hopla
 * (`public/exemple-*.svg`). Chacune passe par `selonDroits` : une page d'exemple ne
 * montre jamais plus que son offre.
 */
const PAGES: Record<ProfilExemple, { blocs: Bloc[]; profil?: Partial<Reglages['profil']> }> = {
  ines: {
    profil: { photo: 'grande' },
    blocs: [
      bloc('produit', 'ines-bol', { titre: 'Bol Lune, grès émaillé', prix: '38 €', image: image('ines-bol'), url: 'https://exemple.fr/ines-bol', vedette: true, description: 'Tourné à la main à Lyon. Chaque pièce est unique.' }),
      bloc('reservation', 'ines-atelier', { titre: 'Un samedi à l’atelier', url: 'https://calendly.com/ines-atelier/samedi', sousTitre: 'Ton premier bol en trois heures' }),
      bloc('preuve', 'ines-avis', { titre: 'Ce qu’en disent mes élèves', preuve: { genre: 'note', note: 4.9, nombre: 126, source: 'Google' } }),
      bloc('lien', 'ines-video', { titre: 'Les coulisses en vidéo', icone: 'youtube', url: 'https://youtube.com/' }),
    ],
  },
  sacha: {
    blocs: [
      bloc('musique', 'sacha-ep', { titre: 'Les jours bleus', sousTitre: 'Le nouvel EP, cinq titres', url: 'https://open.spotify.com/album/0ExempleHoplaSachaDiop0', image: image('sacha-jours-bleus'), vedette: true }),
      bloc('lien', 'sacha-dates', { titre: 'Les prochaines dates', icone: 'billet', url: 'https://exemple.fr/sacha-dates', sousTitre: 'Paris, Lyon, Bruxelles' }),
      bloc('lien', 'sacha-clip', { titre: 'Le clip, enfin !', icone: 'youtube', url: 'https://youtube.com/' }),
    ],
  },
  camille: {
    blocs: [
      bloc('galerie', 'camille-images', { titre: 'Mes dernières images', images: [image('camille-dune'), image('camille-miroir'), image('camille-pins')] }),
      bloc('lien', 'camille-portfolio', { titre: 'Mon portfolio', icone: 'photo', url: 'https://exemple.fr/camille-portfolio', vedette: true, format: 'bouton' }),
      bloc('lien', 'camille-contact', { titre: 'Parlons de ton projet', icone: 'equipe', url: 'https://exemple.fr/camille-contact' }),
      bloc('lien', 'camille-tuto', { titre: 'Mon tuto lumière', icone: 'youtube', url: 'https://youtube.com/' }),
    ],
  },
  nadia: {
    profil: { photo: 'grande' },
    blocs: [
      bloc('reservation', 'nadia-bilan', { titre: 'Un bilan de 30 minutes', url: 'https://calendly.com/nadia-budget/bilan', sousTitre: 'On remet ton budget à plat, ensemble', vedette: true }),
      bloc('musique', 'nadia-podcast', { titre: 'L’argent, simplement', sousTitre: 'Le podcast, un épisode chaque lundi', url: 'https://open.spotify.com/show/0ExempleHoplaNadiaHaddad', image: image('nadia-podcast') }),
      bloc('lien', 'nadia-guide', { titre: 'Mon guide budget, gratuit', icone: 'document', url: 'https://exemple.fr/nadia-guide' }),
      bloc('inscription', 'nadia-astuces', { titre: 'Une astuce chaque dimanche', sousTitre: 'Cinq minutes de lecture, zéro jargon.' }),
    ],
  },
  yanis: {
    blocs: [
      bloc('galerie', 'yanis-videos', { titre: 'Mes dernières vidéos', images: ['trente-jours', 'studio', 'premiere-video'].map(n => image(`yanis-${n}`)) }),
      bloc('lien', 'yanis-video', { titre: 'La vidéo de mercredi', icone: 'youtube', url: 'https://youtube.com/', vedette: true, format: 'bouton' }),
      bloc('lien', 'yanis-coulisses', { titre: 'Les coulisses sur TikTok', icone: 'tiktok', url: 'https://tiktok.com/' }),
      bloc('lien', 'yanis-materiel', { titre: 'Mon matériel de tournage', icone: 'camera', url: 'https://exemple.fr/yanis-materiel' }),
    ],
  },
  karim: {
    profil: { photo: 'grande' },
    blocs: [
      bloc('reservation', 'karim-diner', { titre: 'Réserver un dîner chez vous', url: 'https://calendly.com/chef-karim/diner', sousTitre: 'De 4 à 12 couverts, sur la Côte d’Azur', vedette: true }),
      bloc('galerie', 'karim-assiettes', { titre: 'Le menu d’automne', images: ['daurade', 'agneau', 'tarte'].map(n => image(`karim-${n}`)) }),
      bloc('preuve', 'karim-avis', { titre: 'Ce qu’en disent mes convives', preuve: { genre: 'note', note: 4.9, nombre: 84, source: 'Google' } }),
      bloc('lien', 'karim-menus', { titre: 'Mes menus de saison', icone: 'document', url: 'https://exemple.fr/karim-menus' }),
    ],
  },
  margaux: {
    blocs: [
      bloc('galerie', 'margaux-projets', { titre: 'Mes derniers projets', images: ['salon', 'cuisine', 'chambre'].map(n => image(`margaux-${n}`)) }),
      bloc('lien', 'margaux-rdv', { titre: 'Un premier rendez-vous', icone: 'agenda', url: 'https://exemple.fr/margaux-rdv', vedette: true, format: 'bouton' }),
      bloc('lien', 'margaux-avant-apres', { titre: 'Mes avant-après', icone: 'photo', url: 'https://exemple.fr/margaux-avant-apres' }),
      bloc('lien', 'margaux-pinterest', { titre: 'Mes idées sur Pinterest', icone: 'pinterest', url: 'https://pinterest.com/' }),
    ],
  },
  chloe: {
    blocs: [
      bloc('lien', 'chloe-cours', { titre: 'Réserver un cours de maths', icone: 'agenda', url: 'https://exemple.fr/chloe-cours', vedette: true, format: 'bouton' }),
      bloc('texte', 'chloe-mot', { titre: 'En MPSI à Grenoble. Je donne des cours de maths et de physique, de la 4e à la terminale, chez toi ou en visio.' }),
      bloc('lien', 'chloe-fiches', { titre: 'Mes fiches de révision', icone: 'document', url: 'https://exemple.fr/chloe-fiches' }),
      bloc('lien', 'chloe-message', { titre: 'M’écrire avant un premier cours', icone: 'courrier', url: 'mailto:chloe@exemple.fr' }),
    ],
  },
  theo: {
    blocs: [
      bloc('galerie', 'theo-puzzles', { titre: 'Les puzzles de la semaine', images: ['mat-en-deux', 'fourchette', 'finale'].map(n => image(`theo-${n}`)) }),
      bloc('produit', 'theo-cours', { titre: 'Les ouvertures, le cours complet', prix: '49 €', image: image('theo-stage'), url: 'https://exemple.fr/theo-cours' }),
      lien('theo-stage', 'Le stage d’ouvertures', 'cadenas', { id: 'page-theo-stage', acces: { code: '•', places: 30 }, restantes: 3 }),
      bloc('reservation', 'theo-particulier', { titre: 'Un cours particulier', url: 'https://calendly.com/theo-echecs/cours', sousTitre: 'En visio, tous niveaux' }),
    ],
  },
};

const droitsDe = (plan: PagePublique['compte']['plan']) =>
  Object.fromEntries((Object.keys(FONCTIONS) as Fonction[]).map(f => [f, peut(plan, f)])) as Record<Fonction, boolean>;

/** La page d'un profil telle qu'il l'a soignée, dans son thème : celle de la galerie de l'accueil. */
export function pageProfil(id: ProfilExemple, langue: Langue = 'fr'): PagePublique {
  const { blocs, profil } = PAGES[id];
  const page = pageExemple(id, PROFILS[id].theme, { blocs, profil, langue });
  return { ...page, ...selonDroits(page.reglages, page.blocs, droitsDe(page.compte.plan)) };
}

/** « d’Inès Laurent », « de Théo Marchal », « de Sacha Diop » : la préposition qui va devant un prénom. */
export const de = (nom: string) => (/^[aeiouàâäéèêëîïôöûüh]/i.test(nom) ? `d’${nom}` : `de ${nom}`);
/** « Ines Laurent’s », « la page d’Inès Laurent » : le nom possessif dans la langue du site. */
export const pageDe = (nom: string, langue: Langue = 'fr') => (langue === 'en' ? `${nom}’s page` : `La page ${de(nom)}`);
