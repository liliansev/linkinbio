/*
 * Les étapes de « Bien démarrer », en tête de l'onglet Liens tant que la page
 * n'est pas prête. Chacune se coche toute seule quand la page la remplit.
 */

import type { Bloc, Reglages } from './types.ts';
import { THEME_DEFAUT } from './themes.ts';

export type Destination = 'photo' | 'bio' | 'theme' | 'reseaux' | 'lien';

export interface Etape { id: Destination | 'partage'; nom: string; aide: string; faite: boolean }

export function etapesDemarrage(reglages: Reglages, blocs: Bloc[], partagee: boolean): Etape[] {
  const liens = blocs.filter(b => b.type === 'lien' && b.public && b.url).length;
  return [
    { id: 'photo', nom: 'Ajoute ta photo', aide: 'Un visage rassure avant de cliquer.', faite: !!reglages.profil.avatar },
    { id: 'bio', nom: 'Écris ta bio', aide: 'Une phrase : ce que tu fais, pour qui.', faite: !!reglages.profil.bio.trim() },
    { id: 'lien', nom: 'Ajoute trois liens', aide: liens ? `${liens} sur 3 pour l’instant.` : 'Ton site, ta prise de rendez-vous, ta boutique.', faite: liens >= 3 },
    { id: 'reseaux', nom: 'Relie tes réseaux', aide: 'Leurs icônes s’affichent sous ton nom.', faite: reglages.reseaux.some(r => r.url.trim()) },
    { id: 'theme', nom: 'Choisis ton thème', aide: 'Des plus sobres aux plus audacieux, en un geste.', faite: reglages.theme !== THEME_DEFAUT },
    { id: 'partage', nom: 'Partage ta page', aide: 'Colle l’adresse dans ta bio Instagram ou TikTok.', faite: partagee },
  ];
}
