import type { Bloc, Couleurs, PagePublique, Reglages } from '../lib/types.ts';
import { SANS_COULEURS, nouveauBloc } from '../lib/types.ts';
import { REGLAGES_DEFAUT } from '../lib/defauts.ts';
import { themeParId } from '../lib/themes.ts';
import { nomSaisi } from '../lib/valider.ts';

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

/** Des initiales sur un rond : l'avatar des pages inventées. */
const initiales = (texte: string, fond: string, encre: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="${fond}"/><text x="48" y="58" font-family="Geist Variable, system-ui, sans-serif" font-size="30" font-weight="600" text-anchor="middle" fill="${encre}">${texte}</text></svg>`)}`;

/** Jules Moreau, un musicien inventé, pour le troisième téléphone de l'ouverture. */
const BLOCS_JULES = [
  bloc('lien', { titre: 'Le nouveau single', sousTitre: 'Sur toutes les plateformes', url: 'https://open.spotify.com/', icone: 'spotify', vedette: true, format: 'bouton' }),
  bloc('lien', { titre: 'Billets de la tournée', url: 'https://exemple.fr/tournee', icone: 'billet' }),
  bloc('lien', { titre: 'Le clip', url: 'https://youtube.com/', icone: 'youtube' }),
  bloc('lien', { titre: 'Mon podcast', url: 'https://exemple.fr/podcast', icone: 'podcast' }),
];
export function pageJules(theme: string): PagePublique {
  return {
    reglages: {
      ...habiller(REGLAGES_DEFAUT, theme),
      profil: { nom: 'Jules Moreau', bio: 'Auteur, compositeur. En tournée cet hiver.', avatar: initiales('JM', '#dcdcf5', '#2b2b4a'), badge: false },
      reseaux: [{ reseau: 'instagram', url: 'https://instagram.com/' }, { reseau: 'spotify', url: 'https://open.spotify.com/' }, { reseau: 'youtube', url: 'https://youtube.com/' }],
    },
    blocs: BLOCS_JULES,
    compte: { pseudo: 'jules-moreau', principal: false, pro: false },
  };
}

/** « marie-claire-2 » devient « Marie Claire 2 » : le nom qu'on tape, posé sur la page du téléphone. */
export const nomAffiche = (pseudo: string) => pseudo.split('-').filter(Boolean).map(m => m[0].toUpperCase() + m.slice(1)).join(' ');

/** Le nom tel qu'on l'a tapé (« Zoé Martin »), s'il donne bien ce pseudo ; sinon celui qu'on tire du pseudo. */
export function nomTape(saisie: string, pseudo: string) {
  const mots = saisie.trim().split(/[\s._-]+/).filter(Boolean);
  if (!mots.length || nomSaisi(saisie, 200).replace(/-$/, '') !== pseudo) return nomAffiche(pseudo);
  return mots.map(m => m[0].toUpperCase() + m.slice(1)).join(' ');
}

const BLOCS_VISITEUR = [
  bloc('lien', { titre: 'Mon site', url: 'https://exemple.fr', icone: 'site', vedette: true, format: 'bouton' }),
  bloc('lien', { titre: 'Ma dernière vidéo', url: 'https://youtube.com/', icone: 'youtube' }),
  bloc('lien', { titre: 'Mon dernier TikTok', url: 'https://tiktok.com/', icone: 'tiktok' }),
  bloc('lien', { titre: 'Me contacter', url: 'https://exemple.fr/contact', icone: 'courrier' }),
];

/** La page de celui qui tape son nom dans l'ouverture : son nom, ses initiales, des liens de départ. */
export function pageVisiteur(pseudo: string, theme: string, nom = nomAffiche(pseudo)): PagePublique {
  const lettres = nom.split(' ').slice(0, 2).map(m => m[0]).join('');
  return {
    reglages: {
      ...habiller(REGLAGES_DEFAUT, theme),
      profil: { nom, bio: 'Ta bio, en une phrase.', avatar: initiales(lettres, '#e9e9e9', '#333'), badge: false },
      reseaux: RESEAUX_MARIE,
    },
    blocs: BLOCS_VISITEUR,
    compte: { pseudo, principal: false, pro: false },
  };
}

/** La page vue depuis un réseau : son lien passe en tête et devient le lien mis en avant, comme sur une vraie page Hopla. */
export function selonReseau(page: PagePublique, reseau: string): PagePublique {
  const enTete = page.blocs.filter(b => b.icone === reseau);
  if (!enTete.length) return page;
  const reste = page.blocs.filter(b => b.icone !== reseau);
  const vedette = page.blocs.find(b => b.vedette);
  return {
    ...page,
    blocs: [...enTete, ...reste].map((b, i) => ({ ...b, vedette: i === 0, format: i === 0 ? 'bouton' : b.format, sousTitre: i === 0 ? b.sousTitre : b === vedette ? '' : b.sousTitre })),
  };
}
