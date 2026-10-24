import type { Bloc } from './types.ts';

/**
 * Les collections (24 octobre 2026, d'après Linktree) : un titre de section réglé en grille range en tuiles les liens qui
 * le suivent, jusqu'au titre suivant. Seuls les liens simples s'y rangent : un lien mis en avant, un drop, un compte à
 * rebours ou tout autre bloc garde toute la largeur, sans couper la collection. Rend les identifiants des liens en tuile.
 */
export function enGrille(blocs: readonly Bloc[], attend?: (b: Bloc) => boolean): Set<string> {
  const tuiles = new Set<string>();
  let grille = false;
  for (const b of blocs) {
    if (b.type === 'titre') grille = b.disposition === 'grille';
    else if (grille && b.type === 'lien' && !b.vedette && !b.acces && !!b.url && !attend?.(b)) tuiles.add(b.id);
  }
  return tuiles;
}
