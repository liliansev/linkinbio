import { useEffect, useRef } from 'react';

/*
 * Le retour du téléphone (le geste du bord sur iPhone, la touche ou le geste
 * sur Android) et la flèche du navigateur referment ce qui est ouvert par-dessus
 * la page, une couche à la fois : la sous-page d'un bloc, puis sa feuille.
 * Avant, le retour quittait le back office (22 octobre 2026, Lilian : « on ne
 * peut pas faire retour dans les menus d'édition du bloc »).
 *
 * Chaque couche ouverte pose une entrée dans l'historique, à la même adresse.
 * Le routeur n'en sait rien : l'entrée passe par la méthode d'origine du
 * navigateur (celle que TanStack n'écoute pas), et le `popstate` qui la retire
 * est arrêté avant lui. Les changements d'un même instant (une feuille qui se
 * ferme pendant qu'une autre s'ouvre) se compensent : l'historique ne bouge
 * qu'une fois, au bout du compte.
 */

interface Couche { retour: () => boolean; partie: boolean }

const CLE = 'hoplaCouche';
const pile: Couche[] = [];
/** Nos entrées au-dessus de la page, dans l'historique. */
let profondeur = 0;
/** Un retour lancé par nous, dont le `popstate` est à laisser passer. */
let attendu = false;
let prevu = false;
let ecoute = false;
/** La clé TanStack de l'entrée de la page : nos entrées la gardent, c'est à elle qu'on les reconnaît. */
let base: unknown;

const ouvertes = () => pile.filter(c => !c.partie).length;

function synchroniser() {
  if (attendu) return;
  const voulu = ouvertes();
  if (voulu > profondeur) {
    if (!profondeur) base = history.state?.__TSR_key;
    for (let i = profondeur + 1; i <= voulu; i++) History.prototype.pushState.call(history, { ...history.state, [CLE]: i }, '');
    profondeur = voulu;
  } else if (voulu < profondeur) {
    attendu = true;
    const n = profondeur - voulu;
    profondeur = voulu;
    history.go(-n);
  }
}

function planifier() {
  if (prevu) return;
  prevu = true;
  setTimeout(() => { prevu = false; synchroniser(); });
}

function surRetour(e: PopStateEvent) {
  if (!profondeur && !attendu) return;
  const etat = e.state as Record<string, unknown> | null;
  if (etat?.__TSR_key !== base) {
    // On a quitté nos entrées par un autre chemin (un long appui sur la flèche, vers une autre adresse) : tout se referme, le routeur fait le reste.
    profondeur = 0;
    attendu = false;
    for (const c of [...pile].reverse()) if (!c.partie && c.retour()) c.partie = true;
    return;
  }
  // La même page : le routeur n'a rien à faire de ce retour.
  e.stopImmediatePropagation();
  const n = Number(etat?.[CLE]) || 0;
  if (attendu) { attendu = false; profondeur = n; planifier(); return; }
  // En avant vers une couche déjà refermée : on revient où l'on était, rien ne se rouvre.
  if (n > profondeur) { attendu = true; history.go(profondeur - n); return; }
  profondeur = n;
  // Les couches du dessus se referment, de la plus haute à la plus basse ; une couche qui refuse (un champ faux) reste, et son entrée revient.
  const dessus = pile.filter(c => !c.partie).slice(profondeur).reverse();
  for (const c of dessus) if (c.retour()) c.partie = true;
  planifier();
}

/**
 * Une couche ouverte par-dessus la page tant que `ouverte` : le retour du
 * téléphone appelle `retour`, qui dit si elle s'en va (faux : elle reste, un
 * champ faux la retient). Renvoie `partir`, à appeler quand elle commence à
 * se fermer d'elle-même (son animation de sortie ne compte plus comme ouverte).
 */
export function useCouche(ouverte: boolean, retour: () => boolean): () => void {
  const retourRef = useRef(retour);
  retourRef.current = retour;
  const couche = useRef<Couche | null>(null);
  useEffect(() => {
    if (!ouverte) return;
    if (!ecoute) { ecoute = true; addEventListener('popstate', surRetour, { capture: true }); }
    const c: Couche = { retour: () => retourRef.current(), partie: false };
    couche.current = c;
    pile.push(c);
    planifier();
    return () => {
      const i = pile.indexOf(c);
      if (i >= 0) pile.splice(i, 1);
      if (couche.current === c) couche.current = null;
      planifier();
    };
  }, [ouverte]);
  return () => {
    const c = couche.current;
    if (c && !c.partie) { c.partie = true; planifier(); }
  };
}
