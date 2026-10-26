import type { Bloc, Couleurs, PagePublique, Reglages } from '../lib/types.ts';
import { FONCTIONS, peut } from '../lib/abonnement.ts';
import type { Fonction } from '../lib/abonnement.ts';
import { selonDroits } from '../lib/droits.ts';
import { nouveauBloc, SANS_COULEURS } from '../lib/types.ts';
import { REGLAGES_DEFAUT } from '../lib/defauts.ts';
import { themeParId } from '../lib/themes.ts';
import { composerAudience } from '../lib/provenance.ts';
import type { Audience } from '../lib/provenance.ts';

/** Six profils fictifs, portraits générés. Une seule identité par personne,
 * utilisée dans le hero, les thèmes, l’édition et toutes les démonstrations,
 * et une seule offre (`offre`) : Inès montre ce qu'apporte Starter, Malik et
 * Hugo ce qu'apporte Pro, les autres restent en Gratuit. Six thèmes qui ne se
 * ressemblent pas (26 octobre 2026, demandé par Lilian : « que ça donne envie ») :
 * la terre cuite d'Inès, la nuit bleue de Sacha, le noir et or de Camille, le bleu
 * et jaune de Marseille pour Malik, le lin de Léa, l'imprimé risographie d'Hugo. */
export const PROFILS = {
  ines: { nom: 'Inès Laurent', bio: 'Les mains dans la terre, la tête pleine d’idées.', avatar: '/profil-ines.webp', metier: 'Céramiste', ville: 'Lyon', pseudo: 'ines-atelier', theme: 'argile', offre: 'starter' },
  sacha: { nom: 'Sacha Diop', bio: 'Des chansons pour les jours bleus.', avatar: '/profil-sacha.webp', metier: 'Musicien', ville: 'Paris', pseudo: 'sacha-diop', theme: 'galaxie', offre: 'gratuit' },
  camille: { nom: 'Camille Nguyen', bio: 'Des gens, des lieux et la lumière entre les deux.', avatar: '/profil-camille.webp', metier: 'Photographe', ville: 'Bordeaux', pseudo: 'camille', theme: 'onyx', offre: 'gratuit' },
  malik: { nom: 'Malik Benali', bio: 'Une grande table, des bons produits, et vous.', avatar: '/profil-malik.webp', metier: 'Chef et créateur', ville: 'Marseille', pseudo: 'chez-malik', theme: 'klein', offre: 'pro' },
  lea: { nom: 'Léa Morel', bio: 'Du mouvement. Du souffle. Un peu de temps pour soi.', avatar: '/profil-lea.webp', metier: 'Prof de yoga', ville: 'Nantes', pseudo: 'lea-respire', theme: 'lin', offre: 'gratuit' },
  hugo: { nom: 'Hugo Perrin', bio: 'Des affiches colorées et des idées à dessiner.', avatar: '/profil-hugo.webp', metier: 'Illustrateur', ville: 'Lille', pseudo: 'hugo-dessine', theme: 'riso', offre: 'pro' },
} as const;
export type ProfilExemple = keyof typeof PROFILS;
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
  malik: [lien('malik-menu', 'Le menu du jour', 'document', { vedette: true, format: 'bouton' }), lien('malik-diner', 'Réserver un dîner', 'agenda'), lien('malik-recette', 'Ma recette du dimanche', 'youtube', { url: 'https://youtube.com/' })],
  lea: [lien('lea-cours', 'Réserver un cours', 'agenda', { vedette: true, format: 'bouton' }), lien('lea-planning', 'Le planning de la semaine', 'horloge'), lien('lea-respirer', '10 minutes pour respirer', 'youtube', { url: 'https://youtube.com/' })],
  // Hugo est en Pro : sa page porte un drop, le lien réservé que ses abonnés débloquent avec un code.
  hugo: [lien('hugo-affiches', 'Mes affiches', 'boutique', { vedette: true, format: 'bouton' }), lien('hugo-edition', 'Accès en avant-première', 'cadenas', { acces: { code: '•', places: 30 }, restantes: 3 }), lien('hugo-projet', 'Dessiner ton projet', 'plume')],
};

const RESEAUX_EXEMPLES: Record<ProfilExemple, Reglages['reseaux']> = {
  ines: [{ reseau: 'instagram', url: 'https://instagram.com/' }, { reseau: 'youtube', url: 'https://youtube.com/' }],
  sacha: [{ reseau: 'spotify', url: 'https://open.spotify.com/' }, { reseau: 'youtube', url: 'https://youtube.com/' }],
  camille: [{ reseau: 'instagram', url: 'https://instagram.com/' }, { reseau: 'linkedin', url: 'https://linkedin.com/' }],
  malik: [{ reseau: 'instagram', url: 'https://instagram.com/' }, { reseau: 'youtube', url: 'https://youtube.com/' }],
  lea: [{ reseau: 'instagram', url: 'https://instagram.com/' }, { reseau: 'youtube', url: 'https://youtube.com/' }],
  hugo: [{ reseau: 'instagram', url: 'https://instagram.com/' }, { reseau: 'youtube', url: 'https://youtube.com/' }],
};

/** La vraie page publique avec les thèmes et le modèle du produit, sans appel serveur. */
export function pageExemple(id: ProfilExemple, theme: string = PROFILS[id].theme, o: { couleurs?: Couleurs; profil?: Partial<Reglages['profil']>; reseaux?: boolean; blocs?: Bloc[] } = {}): PagePublique {
  const p = PROFILS[id];
  return {
    reglages: {
      ...REGLAGES_DEFAUT, theme, couleurs: o.couleurs ?? SANS_COULEURS,
      bouton: { ...REGLAGES_DEFAUT.bouton, ...themeParId(theme).conseil }, animation: 'aucune', bureau: 'colonne', partage: false,
      profil: { nom: p.nom, bio: p.bio, avatar: p.avatar, badge: false, photo: 'ronde', ...o.profil },
      reseaux: o.reseaux === false ? [] : RESEAUX_EXEMPLES[id].map(r => ({ ...r })),
    },
    blocs: (o.blocs ?? composerAudience(BLOCS_EXEMPLES[id], '')).map(b => ({ ...b })),
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
  malik: {
    profil: { photo: 'grande' },
    blocs: [
      bloc('reservation', 'malik-table', { titre: 'Réserver une table', url: 'https://www.thefork.fr/restaurant/chez-malik', sousTitre: 'Le jeudi et le vendredi soir', vedette: true }),
      bloc('lien', 'malik-menu', { titre: 'Le menu de la semaine', icone: 'document', url: 'https://exemple.fr/malik-menu' }),
      bloc('lien', 'malik-recette', { titre: 'Ma recette du dimanche', icone: 'youtube', url: 'https://youtube.com/' }),
      bloc('inscription', 'malik-diners', { titre: 'Les dîners du mois', sousTitre: 'Les dates en premier, une fois par mois.' }),
    ],
  },
  lea: {
    blocs: [
      bloc('lien', 'lea-cours', { titre: 'Réserver un cours', icone: 'agenda', url: 'https://exemple.fr/lea-cours', vedette: true, format: 'bouton' }),
      bloc('texte', 'lea-mot', { titre: 'Des cours en petit groupe, tous niveaux, au bord de l’Erdre.' }),
      bloc('titre', 'lea-semaine', { titre: 'Cette semaine' }),
      bloc('lien', 'lea-planning', { titre: 'Le planning', icone: 'horloge', url: 'https://exemple.fr/lea-planning' }),
      bloc('lien', 'lea-respirer', { titre: '10 minutes pour respirer', icone: 'youtube', url: 'https://youtube.com/' }),
    ],
  },
  hugo: {
    blocs: [
      bloc('galerie', 'hugo-affiches', { titre: 'Les affiches de la saison', images: ['soleil', 'beffroi', 'oiseau', 'fleurs'].map(n => image(`hugo-${n}`)) }),
      bloc('produit', 'hugo-soleil', { titre: 'Affiche « Soleil », A3', prix: '25 €', image: image('hugo-soleil'), url: 'https://exemple.fr/hugo-soleil' }),
      lien('hugo-edition', 'Accès en avant-première', 'cadenas', { id: 'page-hugo-edition', acces: { code: '•', places: 30 }, restantes: 3 }),
      bloc('lien', 'hugo-projet', { titre: 'Dessiner ton projet', icone: 'plume', url: 'https://exemple.fr/hugo-projet' }),
    ],
  },
};

const droitsDe = (plan: PagePublique['compte']['plan']) =>
  Object.fromEntries((Object.keys(FONCTIONS) as Fonction[]).map(f => [f, peut(plan, f)])) as Record<Fonction, boolean>;

/** La page d'un profil telle qu'il l'a soignée, dans son thème : celle de la galerie de l'accueil. */
export function pageProfil(id: ProfilExemple): PagePublique {
  const { blocs, profil } = PAGES[id];
  const page = pageExemple(id, PROFILS[id].theme, { blocs, profil });
  return { ...page, ...selonDroits(page.reglages, page.blocs, droitsDe(page.compte.plan)) };
}

/** « d’Inès Laurent », « d’Hugo Perrin », « de Sacha Diop » : la préposition qui va devant un prénom. */
export const de = (nom: string) => (/^[aeiouyàâäéèêëîïôöûüh]/i.test(nom) ? `d’${nom}` : `de ${nom}`);
