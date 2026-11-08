import type { Langue } from '../../lib/types.ts';
import { CHEMIN_FONCTIONS, pageFonction, pageParId } from './fonctions.ts';
import { CHEMIN_COMPARATIFS } from './comparatifs.ts';

/*
 * La même page dans l'autre langue (8 novembre 2026, Hopla anglais d'abord) : `/` et `/fr`, `/features/<slug>`
 * et `/fonctionnalites/<slug>`, `/compare/<outil>` et `/comparatif/<outil>`. Le lien « English » ou « Français »
 * du menu y mène, au lieu de ramener à l'accueil.
 */
export function autreAdresse(chemin: string, langue: Langue): string {
  const autre: Langue = langue === 'fr' ? 'en' : 'fr';
  const c = chemin.replace(/\/+$/, '') || '/';
  if (c === CHEMIN_FONCTIONS[langue]) return CHEMIN_FONCTIONS[autre];
  if (c === CHEMIN_COMPARATIFS[langue]) return CHEMIN_COMPARATIFS[autre];
  if (c.startsWith(`${CHEMIN_FONCTIONS[langue]}/`)) {
    const page = pageFonction(c.slice(CHEMIN_FONCTIONS[langue].length + 1), langue);
    const la = page && pageParId(page.id, autre);
    return la ? `${CHEMIN_FONCTIONS[autre]}/${la.slug}` : CHEMIN_FONCTIONS[autre];
  }
  if (c.startsWith(`${CHEMIN_COMPARATIFS[langue]}/`)) return `${CHEMIN_COMPARATIFS[autre]}${c.slice(CHEMIN_COMPARATIFS[langue].length)}`;
  return autre === 'fr' ? '/fr' : '/';
}
