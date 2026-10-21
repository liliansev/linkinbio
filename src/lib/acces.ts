import type { Bloc } from './types.ts';
import { LOCALE } from './mots.ts';
import type { Textes } from './mots.ts';

/*
 * Le mode drop : un lien qui se débloque avec un code, ou pour les N premiers.
 * La page publique ne reçoit ni l'adresse ni le code (seulement `•` s'il y en
 * a un) : c'est `/api/acces` qui rend l'adresse, une fois le code vérifié et
 * la place prise.
 */

export const CODE_MASQUE = '•';

export function masquerAcces(blocs: Bloc[], prises: (bloc: string) => number): Bloc[] {
  return blocs.map(b => {
    if (!b.acces) return b;
    const { code, places } = b.acces;
    return { ...b, url: '', acces: { code: code ? CODE_MASQUE : '', places }, restantes: places ? Math.max(0, places - prises(b.id)) : null };
  });
}

/** Deux codes égaux, sans tenir compte des majuscules ni des espaces autour. */
export const normaliserCode = (code: string) => code.trim().toLocaleLowerCase('fr').normalize('NFC');

/** « Plus que 3 places », « Complet », avec les mots de la page. Rien tant qu'il en reste beaucoup. */
export function etatPlaces(restantes: number | null | undefined, places: number, t: Textes): string {
  if (!places || restantes === null || restantes === undefined) return '';
  if (restantes <= 0) return t.complet;
  if (restantes === 1) return t.plusQueUne;
  return restantes <= Math.max(10, places / 5) ? t.plusQue(restantes.toLocaleString(LOCALE)) : t.places(places.toLocaleString(LOCALE));
}
