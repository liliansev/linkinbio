import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FocusEvent, PointerEvent, RefObject } from 'react';

/*
 * Le mouvement de l'accueil, en quelques outils : un élément « vu » une fois
 * (et une seule), le réglage « moins de mouvement » du système, un nombre qui
 * compte jusqu'à sa valeur, et une liste qui glisse quand son ordre change.
 * Une scène part dès qu'elle arrive à l'écran, se met en pause quand on la
 * quitte et reprend au retour, sans rien à toucher (26 octobre 2026, demandé
 * par Lilian) ; avec moins de mouvement, l'état final s'affiche.
 */

export const mouvementReduit = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Vrai quand l'élément est resté `tenue` ms à `seuil` dans l'écran, et le
 * reste : une scène que l'on traverse (un saut vers une ancre, un défilement
 * rapide) ne se joue pas dans le dos du visiteur. Il suffit toujours que
 * l'élément occupe 40 % de l'écran : un téléphone, au téléphone, part quand on
 * s'arrête sur ses onglets, sans qu'il faille l'avoir entier au pixel près.
 */
export function useVu<T extends Element>(seuil = 0.2, tenue = 150): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [vu, setVu] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || vu) return;
    if (typeof IntersectionObserver !== 'function') { setVu(true); return; }
    const hauteur = el.getBoundingClientRect().height;
    const s = hauteur ? Math.min(seuil, (innerHeight * 0.4) / hauteur) : seuil;
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    const o = new IntersectionObserver(([e]) => {
      clearTimeout(minuterie);
      // Le rappel vient aussi quand l'élément repasse sous le seuil : il compte alors comme sorti.
      if (e.isIntersecting && e.intersectionRatio >= s - 0.01) minuterie = setTimeout(() => { setVu(true); o.disconnect(); }, tenue);
    }, { threshold: s, rootMargin: '0px 0px -8% 0px' });
    o.observe(el);
    return () => { clearTimeout(minuterie); o.disconnect(); };
  }, [vu, seuil, tenue]);
  return [ref, vu];
}

/**
 * Vrai tant que l'élément tient `seuil` de lui-même dans l'écran (ou 40 % de
 * l'écran, s'il est plus grand) : la scène joue, puis se met en pause dès
 * qu'on la quitte. `tenue` ms à l'écran avant de partir, pour un défilement
 * qui ne fait que passer.
 */
export function useEnVue<T extends Element>(seuil = 0.3, tenue = 120): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [enVue, setEnVue] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver !== 'function') { setEnVue(true); return; }
    const hauteur = el.getBoundingClientRect().height;
    const s = hauteur ? Math.min(seuil, (innerHeight * 0.4) / hauteur) : seuil;
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    const o = new IntersectionObserver(([e]) => {
      clearTimeout(minuterie);
      if (e.isIntersecting && e.intersectionRatio >= s - 0.01) minuterie = setTimeout(() => setEnVue(true), tenue);
      else setEnVue(false);
    }, { threshold: [0, s] });
    o.observe(el);
    return () => { clearTimeout(minuterie); o.disconnect(); };
  }, [seuil, tenue]);
  return [ref, enVue];
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

/**
 * Une suite d'étapes : `pas[i]` est le délai avant l'étape i + 1. Elle joue
 * tant que `actif`, s'arrête là où elle en est quand `actif` tombe, et repart
 * de cette étape. Rejouer remet à zéro.
 */
export function useSequence(actif: boolean, pas: number[]): [number, () => void] {
  const [etape, setEtape] = useState(0);
  const [tour, setTour] = useState(0);
  const courante = useRef(0);
  courante.current = etape;
  useEffect(() => {
    if (!actif) return;
    if (mouvementReduit()) { setEtape(pas.length); return; }
    const depart = courante.current;
    let total = 0;
    const minuteries = pas.slice(depart).map((d, k) => { total += d; return setTimeout(() => setEtape(depart + k + 1), total); });
    return () => minuteries.forEach(clearTimeout);
    // `pas` est une constante de chaque démo : seuls `actif` et « Revoir » relancent.
  }, [actif, tour]);
  // Rejouer repart de zéro dans le même rendu : l'écran remonté ne montre jamais la fin de la lecture d'avant.
  return [etape, () => { const zero = mouvementReduit() ? pas.length : 0; courante.current = zero; setEtape(zero); setTour(t => t + 1); }];
}

/** Le temps sans mouvement de souris après lequel une scène en pause repart. */
const REPRISE = 1500;

/**
 * Une scène qui passe d'elle-même à la suite après `duree` ms, tant que
 * `actif`. La souris qui bouge sur la scène met l'attente en pause, et elle
 * reprend une seconde et demie après le dernier mouvement : un curseur laissé
 * là par la molette n'arrête rien. Le focus au clavier la suspend tant qu'il
 * reste dedans. Le temps qui restait repart à la reprise. `garde` se pose sur
 * ce que la pause couvre.
 */
export function useEnchainement(actif: boolean, duree: number, suite: () => void) {
  const [pause, setPause] = useState(false);
  const restant = useRef(duree);
  const fn = useRef(suite);
  fn.current = suite;
  const reprise = useRef<ReturnType<typeof setTimeout>>(undefined);
  const clavier = useRef(false);
  useEffect(() => { if (!actif) restant.current = duree; }, [actif, duree]);
  useEffect(() => {
    if (!actif || pause) return;
    const debut = performance.now();
    const t = setTimeout(() => fn.current(), restant.current);
    return () => { clearTimeout(t); restant.current = Math.max(0, restant.current - (performance.now() - debut)); };
  }, [actif, pause]);
  useEffect(() => () => clearTimeout(reprise.current), []);
  const garde = {
    onPointerMove: (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || clavier.current) return;
      setPause(true);
      clearTimeout(reprise.current);
      reprise.current = setTimeout(() => setPause(false), REPRISE);
    },
    onPointerLeave: () => { clearTimeout(reprise.current); if (!clavier.current) setPause(false); },
    // Un clic laisse le focus sur le bouton touché : seul le focus visible, celui du clavier, retient la scène.
    onFocus: (e: FocusEvent) => { if (!(e.target as Element).matches(':focus-visible')) return; clavier.current = true; clearTimeout(reprise.current); setPause(true); },
    onBlur: (e: FocusEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) { clavier.current = false; setPause(false); } },
  };
  return [actif && pause, garde] as const;
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
 * Les enfants de `ref` (ceux qui portent `data-cle`, ou ceux de `selecteur`)
 * glissent de leur ancienne place à la nouvelle quand `ordre` change (la
 * technique FLIP), en `duree` ms. React garde le même élément d'un ordre à
 * l'autre : c'est lui qu'on suit.
 */
export function useGlisse(ref: RefObject<HTMLElement | null>, ordre: string, duree = 400, selecteur = '[data-cle]') {
  const places = useRef(new Map<Element, number>());
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const enfants = [...el.querySelectorAll<HTMLElement>(selecteur)];
    const avant = places.current;
    const apres = new Map(enfants.map(e => [e, e.offsetTop] as const));
    if (avant.size && !mouvementReduit()) {
      for (const e of enfants) {
        const d = (avant.get(e) ?? apres.get(e)!) - apres.get(e)!;
        if (d) e.animate([{ transform: `translateY(${d}px)` }, { transform: 'none' }], { duration: duree, easing: 'cubic-bezier(.2,.7,.2,1)' });
      }
    }
    places.current = apres;
  }, [ref, ordre, duree, selecteur]);
}
