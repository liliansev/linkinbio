import type { Bloc, Couleurs, PagePublique, Reglages } from '../lib/types.ts';
import { SANS_COULEURS, nouveauBloc } from '../lib/types.ts';
import { REGLAGES_DEFAUT } from '../lib/defauts.ts';
import { themeParId } from '../lib/themes.ts';

/*
 * Les pages montrées dans les téléphones de l'accueil : le vrai composant de
 * page publique, avec des données d'exemple. Celle de Lilian (sa photo, ses
 * réseaux, de simples liens), et celle de Marie Lambert, une céramiste
 * inventée, pour les thèmes et l'arrivée d'un nouvel inscrit. Aucun bloc qui
 * appelle le serveur, aucun mouvement en boucle.
 */

let n = 0;
const bloc = (type: Bloc['type'], champs: Partial<Bloc>): Bloc => ({ ...nouveauBloc(type, `ex${n++}`), ...champs });

/** Le thème et ses boutons conseillés, comme quand on le choisit dans le back office. */
function habiller(r: Reglages, theme: string, couleurs: Couleurs = SANS_COULEURS): Reglages {
  return { ...r, theme, couleurs, bouton: { ...r.bouton, ...themeParId(theme).conseil }, animation: 'aucune', bureau: 'colonne', partage: false };
}

const BLOCS_LILIAN = [
  bloc('lien', { titre: 'Réserver un appel', sousTitre: 'Parlons de votre projet', url: 'https://liliansevoumian.fr/contact', icone: 'agenda', vedette: true, format: 'bouton' }),
  bloc('lien', { titre: 'Ma dernière vidéo', url: 'https://www.youtube.com/@lilian.sevoumian', icone: 'youtube' }),
  bloc('lien', { titre: 'Mes formations', url: 'https://augmentes.fr', icone: 'diplome' }),
  bloc('lien', { titre: 'La newsletter', url: 'https://liliansevoumian.fr', icone: 'courrier' }),
];

export function pageLilian(theme: string): PagePublique {
  return {
    reglages: habiller(REGLAGES_DEFAUT, theme),
    blocs: BLOCS_LILIAN,
    compte: { pseudo: 'lilian', principal: true, pro: true },
  };
}

/** Les initiales sur un rond neutre : une photo de profil sans visage inventé. */
const AVATAR_MARIE = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="#e8e4dc"/><text x="48" y="58" font-family="Geist Variable, system-ui, sans-serif" font-size="30" font-weight="600" text-anchor="middle" fill="#3b3631">ML</text></svg>')}`;

const PROFIL_MARIE: Reglages['profil'] = { nom: 'Marie Lambert', bio: 'Céramiste à Lyon. Ateliers, boutique et coulisses de l’atelier.', avatar: AVATAR_MARIE, badge: false };
const RESEAUX_MARIE: Reglages['reseaux'] = [
  { reseau: 'instagram', url: 'https://instagram.com/' },
  { reseau: 'tiktok', url: 'https://tiktok.com/' },
  { reseau: 'youtube', url: 'https://youtube.com/' },
];
export const BLOCS_MARIE = [
  bloc('lien', { titre: 'Ma boutique', sousTitre: 'Les pièces de la saison', url: 'https://exemple.fr/boutique', icone: 'boutique', vedette: true, format: 'bouton' }),
  bloc('lien', { titre: 'Réserver un atelier', url: 'https://exemple.fr/ateliers', icone: 'agenda' }),
  bloc('lien', { titre: 'Mon dernier TikTok', url: 'https://tiktok.com/', icone: 'tiktok' }),
  bloc('lien', { titre: 'Ma chaîne YouTube', url: 'https://youtube.com/', icone: 'youtube' }),
];

/** La page de Marie, entière ou en partie (l'arrivée la remplit étape par étape). */
export function pageMarie(theme: string, o: { couleurs?: Couleurs; profil?: Partial<Reglages['profil']>; reseaux?: boolean; blocs?: Bloc[] } = {}): PagePublique {
  return {
    reglages: { ...habiller(REGLAGES_DEFAUT, theme, o.couleurs), profil: { ...PROFIL_MARIE, ...o.profil }, reseaux: o.reseaux === false ? [] : RESEAUX_MARIE },
    blocs: o.blocs ?? BLOCS_MARIE,
    compte: { pseudo: 'marie-lambert', principal: false, pro: false },
  };
}
