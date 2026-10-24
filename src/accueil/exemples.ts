import type { Bloc, Couleurs, PagePublique, Reglages } from '../lib/types.ts';
import { nouveauBloc, SANS_COULEURS } from '../lib/types.ts';
import { REGLAGES_DEFAUT } from '../lib/defauts.ts';
import { themeParId } from '../lib/themes.ts';
import { composerAudience } from '../lib/provenance.ts';
import type { Audience } from '../lib/provenance.ts';

/** Six profils fictifs, portraits générés. Une seule identité par personne,
 * utilisée dans le hero, les thèmes, l’édition et toutes les démonstrations,
 * et une seule offre (`offre`) : Inès montre ce qu'apporte Starter, Malik et
 * Hugo ce qu'apporte Pro, les autres restent en Gratuit. */
export const PROFILS = {
  ines: { nom: 'Inès Laurent', bio: 'Les mains dans la terre, la tête pleine d’idées.', avatar: '/profil-ines.webp', metier: 'Céramiste', ville: 'Lyon', pseudo: 'ines-atelier', theme: 'champagne', offre: 'starter' },
  sacha: { nom: 'Sacha Diop', bio: 'Des chansons pour les jours bleus.', avatar: '/profil-sacha.webp', metier: 'Musicien', ville: 'Paris', pseudo: 'sacha-diop', theme: 'lilas', offre: 'gratuit' },
  camille: { nom: 'Camille Nguyen', bio: 'Des gens, des lieux et la lumière entre les deux.', avatar: '/profil-camille.webp', metier: 'Photographe', ville: 'Bordeaux', pseudo: 'camille', theme: 'neige', offre: 'gratuit' },
  malik: { nom: 'Malik Benali', bio: 'Une grande table, des bons produits, et vous.', avatar: '/profil-malik.webp', metier: 'Chef et créateur', ville: 'Marseille', pseudo: 'chez-malik', theme: 'sauge', offre: 'pro' },
  lea: { nom: 'Léa Morel', bio: 'Du mouvement. Du souffle. Un peu de temps pour soi.', avatar: '/profil-lea.webp', metier: 'Prof de yoga', ville: 'Nantes', pseudo: 'lea-respire', theme: 'sauge', offre: 'gratuit' },
  hugo: { nom: 'Hugo Perrin', bio: 'Des affiches colorées et des idées à dessiner.', avatar: '/profil-hugo.webp', metier: 'Illustrateur', ville: 'Lille', pseudo: 'hugo-dessine', theme: 'coucher', offre: 'pro' },
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

/** « d’Inès Laurent », « d’Hugo Perrin », « de Sacha Diop » : la préposition qui va devant un prénom. */
export const de = (nom: string) => (/^[aeiouyàâäéèêëîïôöûüh]/i.test(nom) ? `d’${nom}` : `de ${nom}`);
