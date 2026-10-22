/**
 * Règle de Lilian (22 octobre 2026) : ouvrir un menu, une feuille ou une fenêtre ne donne jamais la main à un
 * champ de texte sur un écran tactile, car le clavier monte et cache tout. Au bureau, sans clavier à l'écran,
 * le premier champ peut la prendre.
 */
export function clavierALEcran(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
}

/** `autoFocus` d'un champ : seulement là où aucun clavier ne monte. */
export function focusAuto(voulu = true): boolean {
  return voulu && !clavierALEcran();
}

/** Donne la main à un champ, sauf sur un écran tactile. */
export function focusSaisie(el: HTMLElement | null | undefined, options?: FocusOptions) {
  if (el && !clavierALEcran()) el.focus(options);
}
