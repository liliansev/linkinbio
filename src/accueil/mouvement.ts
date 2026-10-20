import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

/*
 * Le mouvement de l'accueil, en quelques outils : un élément « vu » une fois
 * (et une seule), le réglage « moins de mouvement » du système, un nombre qui
 * compte jusqu'à sa valeur, et une liste qui glisse quand son ordre change.
 * Tout se joue une fois ; avec moins de mouvement, l'état final s'affiche.
 */

export const mouvementReduit = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Vrai dès que l'élément entre à `seuil` dans l'écran, et le reste. */
export function useVu<T extends Element>(seuil = 0.2): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [vu, setVu] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || vu) return;
    if (typeof IntersectionObserver !== 'function') { setVu(true); return; }
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVu(true); o.disconnect(); } }, { threshold: seuil, rootMargin: '0px 0px -8% 0px' });
    o.observe(el);
    return () => o.disconnect();
  }, [vu, seuil]);
  return [ref, vu];
}

/** Vrai tant que l'élément est à l'écran : ce qui égrène le temps s'arrête quand on ne le regarde plus. */
export function useVisible<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver !== 'function') { setVisible(true); return; }
    const o = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    o.observe(el);
    return () => o.disconnect();
  }, []);
  return [ref, visible];
}

/** Pose `data-vu` sur chaque `.hl-entre` de la page quand il arrive à l'écran : la feuille de style fait le reste. */
export function useEntrees() {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>('.hl-entre:not([data-vu])')];
    if (typeof IntersectionObserver !== 'function') { els.forEach(e => { e.dataset.vu = ''; }); return; }
    const o = new IntersectionObserver(entrees => {
      for (const e of entrees) if (e.isIntersecting) { (e.target as HTMLElement).dataset.vu = ''; o.unobserve(e.target); }
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    els.forEach(e => o.observe(e));
    return () => o.disconnect();
  }, []);
}

/** Une suite d'étapes jouée une fois : `pas[i]` est le délai avant l'étape i + 1. Rejouer remet à zéro. */
export function useSequence(actif: boolean, pas: number[]): [number, () => void] {
  const [etape, setEtape] = useState(0);
  const [tour, setTour] = useState(0);
  useEffect(() => {
    if (!actif) return;
    if (mouvementReduit()) { setEtape(pas.length); return; }
    setEtape(0);
    let total = 0;
    const minuteries = pas.map((d, i) => { total += d; return setTimeout(() => setEtape(i + 1), total); });
    return () => minuteries.forEach(clearTimeout);
    // `pas` est une constante de chaque démo : seuls `actif` et « Revoir » relancent.
  }, [actif, tour]);
  // Rejouer repart de zéro dans le même rendu : l'écran remonté ne montre jamais la fin de la lecture d'avant.
  return [etape, () => { setEtape(mouvementReduit() ? pas.length : 0); setTour(t => t + 1); }];
}

/** Un nombre qui compte de 0 à `cible` en `duree` ms, quand `actif` passe à vrai. */
export function useCompte(cible: number, actif: boolean, duree = 800): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!actif) { setN(0); return; }
    if (mouvementReduit()) { setN(cible); return; }
    let image = 0;
    const debut = performance.now();
    const pas = (t: number) => {
      const p = Math.min(1, (t - debut) / duree);
      setN(Math.round(cible * (1 - Math.pow(1 - p, 3))));
      if (p < 1) image = requestAnimationFrame(pas);
    };
    image = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(image);
  }, [cible, actif, duree]);
  return n;
}

/**
 * Les enfants de `ref` qui portent `data-cle` glissent de leur ancienne place à
 * la nouvelle quand `ordre` change (la technique FLIP), en `duree` ms.
 */
export function useGlisse(ref: RefObject<HTMLElement | null>, ordre: string, duree = 400) {
  const places = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const enfants = [...el.querySelectorAll<HTMLElement>('[data-cle]')];
    const avant = places.current;
    const apres = new Map(enfants.map(e => [e.dataset.cle!, e.offsetTop]));
    if (avant.size && !mouvementReduit()) {
      for (const e of enfants) {
        const d = (avant.get(e.dataset.cle!) ?? apres.get(e.dataset.cle!)!) - apres.get(e.dataset.cle!)!;
        if (d) e.animate([{ transform: `translateY(${d}px)` }, { transform: 'none' }], { duration: duree, easing: 'cubic-bezier(.2,.7,.2,1)' });
      }
    }
    places.current = apres;
  }, [ref, ordre, duree]);
}
