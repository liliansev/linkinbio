import { createContext, useContext } from 'react';
import type { Langue } from '../lib/types.ts';

/*
 * La langue du site public (8 novembre 2026, demandé par Lilian : « faire de Hopla US first et traduire en
 * français ») : l'anglais sur `/`, le français sous `/fr`. Chaque texte s'écrit à deux, le français puis
 * l'anglais, côte à côte (`l('Créer ma page', 'Create my page')`) : on relit l'un contre l'autre, et rien ne
 * reste sans traduction.
 */

export const LangueSite = createContext<Langue>('en');
export const useLangue = () => useContext(LangueSite);

/** Choisit entre le français et l'anglais selon la langue de la page. */
export type Choix = <T>(fr: T, en: T) => T;
export const choix = (langue: Langue): Choix => (fr, en) => (langue === 'fr' ? fr : en);
export const useL = (): Choix => choix(useLangue());

/** Le début des adresses du site dans une langue : rien en anglais, `/fr` en français. */
export const prefixe = (langue: Langue) => (langue === 'fr' ? '/fr' : '');
/** L'accueil dans une langue. */
export const accueilDe = (langue: Langue) => (langue === 'fr' ? '/fr' : '/');
