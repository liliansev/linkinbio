import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icone } from '../components/Icone.tsx';
import type { Animation } from '../lib/types.ts';
import type { ReactNode } from 'react';

/* Les petites pièces du back office, pensées pour le pouce : 44 px au moins. */

export function Interrupteur({ actif, onChange, label, aide, disabled }: { actif: boolean; onChange: (v: boolean) => void; label: string; aide?: ReactNode; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-[15px] font-medium text-white">{label}</span>
        {aide && <span className="mt-0.5 block text-[13px] leading-snug text-white/55">{aide}</span>}
      </label>
      <button id={id} type="button" role="switch" aria-checked={actif} disabled={disabled} onClick={() => { vibrer(); onChange(!actif); }}
        className={`adm-interrupteur relative h-8 w-[52px] shrink-0 rounded-full disabled:opacity-40 ${actif ? 'bg-peche' : 'bg-white/15'}`}>
        <span className={`absolute top-1 left-1 h-6 w-6 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.3)] ${actif ? 'translate-x-5 bg-nuit' : 'bg-white'}`} />
      </button>
    </div>
  );
}

export function Champ({ label, aide, children }: { label: string; aide?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-white/70">{label}</span>
      {children}
      {aide && <span className="mt-1.5 block text-[12.5px] leading-snug text-white/45">{aide}</span>}
    </label>
  );
}

export const classeSaisie = 'w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-3 text-[16px] text-white placeholder:text-white/45 outline-none transition focus:border-peche/70 focus:bg-white/[0.09]';

export function Carte({ titre, action, children, className = '', id }: { titre?: string; action?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`scroll-mt-20 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4 ${className}`}>
      {(titre || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {titre && <h2 className="text-[15px] font-semibold text-white">{titre}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Le nom et la description de chaque mouvement, pour les sélecteurs. */
export const NOMS_ANIMATIONS: Record<Animation, { nom: string; aide: string }> = {
  aucune: { nom: 'Aucune', aide: 'Le bouton reste immobile.' },
  reflet: { nom: 'Reflet', aide: 'Une lumière traverse le bouton.' },
  orbite: { nom: 'Orbite', aide: 'Un trait de lumière en fait le tour.' },
  lueur: { nom: 'Lueur', aide: 'Il s’éclaire et respire sa lumière.' },
  onde: { nom: 'Onde', aide: 'Un cercle part de lui, comme une alerte.' },
  respiration: { nom: 'Respiration', aide: 'Il gonfle à peine, lentement.' },
  rebond: { nom: 'Rebond', aide: 'Deux petits sauts, puis le repos.' },
  secousse: { nom: 'Secousse', aide: 'Il fait non de la tête, puis attend.' },
};

type Fermer = (apres?: () => void) => void;
type Contenu = ReactNode | ((fermer: Fermer) => ReactNode);

/** Un petit retour tactile sur Android (iOS l'ignore). */
export function vibrer(ms = 8) {
  try { navigator.vibrate?.(ms); } catch { /* sans vibreur */ }
}

/**
 * Une feuille qui monte du bas sur téléphone, une fenêtre centrée sur
 * ordinateur. On la ferme en la tirant vers le bas, en touchant le fond, avec
 * Échap ou la croix ; elle redescend avant de disparaître. `children` et `pied`
 * peuvent être des fonctions qui reçoivent `fermer(apres)`, pour qu'une action
 * (enregistrer) laisse la feuille sortir avant d'agir.
 */
/**
 * Une feuille qui monte du bas (téléphone) ou s'ouvre au centre (ordinateur).
 * `cote` la laisse voir la page derrière : voile transparent, moins haute sur
 * téléphone, posée à droite sur ordinateur. Pour les réglages qu'on juge sur la page.
 */
export function Feuille({ ouverte, onFermer, titre, children, pied, cote = false }: { ouverte: boolean; onFermer: () => void; titre: string; children: Contenu; pied?: Contenu; cote?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [sortie, setSortie] = useState(false);
  const [tire, setTire] = useState(0);
  const geste = useRef<{ y: number; t: number } | null>(null);
  const fermer = useCallback<Fermer>(apres => {
    setSortie(true);
    const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => { setSortie(false); setTire(0); (apres ?? onFermer)(); }, reduit ? 0 : 190);
  }, [onFermer]);

  useEffect(() => {
    if (!ouverte) return;
    const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') fermer(); };
    document.addEventListener('keydown', touche);
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => { document.removeEventListener('keydown', touche); document.body.style.overflow = avant; };
  }, [ouverte, fermer]);
  if (!ouverte) return null;

  const tirer = {
    onPointerDown: (e: React.PointerEvent) => { if (e.pointerType !== 'mouse') geste.current = { y: e.clientY, t: performance.now() }; },
    onPointerMove: (e: React.PointerEvent) => {
      if (!geste.current) return;
      const dy = e.clientY - geste.current.y;
      // La capture n'arrive qu'une fois le geste engagé : un simple toucher sur la croix reste un clic.
      if (dy > 4 && !e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.setPointerCapture(e.pointerId);
      setTire(Math.max(0, dy));
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (!geste.current) return;
      const dy = e.clientY - geste.current.y, vitesse = dy / (performance.now() - geste.current.t);
      geste.current = null;
      if (dy > 110 || (dy > 30 && vitesse > 0.6)) fermer(); else setTire(0);
    },
    onPointerCancel: () => { geste.current = null; setTire(0); },
  };
  const rendre = (c: Contenu) => (typeof c === 'function' ? c(fermer) : c);

  return (
    <div className={`fixed inset-0 z-50 flex items-end justify-center ${cote ? 'sm:items-stretch sm:justify-end sm:p-4' : 'sm:items-center'}`} role="dialog" aria-modal="true" aria-label={titre} data-sortie={sortie || undefined}>
      <button type="button" aria-label="Fermer" className={`adm-fondu absolute inset-0 ${cote ? 'bg-black/10' : 'bg-black/60 backdrop-blur-[2px]'}`} onClick={() => fermer()} />
      <div ref={ref} tabIndex={-1}
        style={tire ? { transform: `translateY(${tire}px)`, transition: 'none' } : undefined}
        className={`adm-feuille relative flex ${cote ? 'max-h-[58dvh] sm:max-h-none sm:w-[400px]' : 'max-h-[92dvh]'} w-full flex-col rounded-t-[28px] border border-b-0 border-white/10 bg-[#121a2b] shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.7)] outline-none sm:max-w-lg sm:rounded-[28px] sm:border-b`}>
        <div {...tirer} className="shrink-0 touch-none select-none">
          <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-white/25 sm:hidden" />
          <header className="flex items-center justify-between gap-3 px-5 pt-3 pb-2 sm:pt-5">
            <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-white">{titre}</h2>
            <button type="button" onClick={() => fermer()} className="-mr-2 grid h-10 w-10 place-items-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white active:scale-90" aria-label="Fermer">
              <Icone nom="ui-fermer" taille={20} />
            </button>
          </header>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{rendre(children)}</div>
        {pied && <footer className="shrink-0 border-t border-white/[0.07] px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">{rendre(pied)}</footer>}
      </div>
    </div>
  );
}

export function BoutonPrincipal({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-peche px-6 text-[15px] font-semibold text-nuit transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50 ${props.className ?? ''}`}>{children}</button>;
}

export function BoutonSecondaire({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white/[0.08] px-5 text-[15px] font-medium text-white transition hover:bg-white/[0.13] active:scale-[0.98] disabled:opacity-50 ${props.className ?? ''}`}>{children}</button>;
}

/** Un choix parmi quelques options, en pastilles. */
/** Un choix parmi plusieurs, en liste : un nom, une ligne d'aide, une coche sur celui qui est pris. */
export function ListeChoix<T extends string>({ valeur, options, onChange, label }: { valeur: T; options: { id: T; nom: string; aide?: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl bg-white/[0.035]">
      {options.map(o => {
        const pris = valeur === o.id;
        return (
          <button key={o.id} type="button" role="radio" aria-checked={pris} onClick={() => { vibrer(4); onChange(o.id); }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-white/[0.04]">
            <span className="min-w-0 flex-1">
              <span className={`block text-[15px] font-medium ${pris ? 'text-white' : 'text-white/80'}`}>{o.nom}</span>
              {o.aide && <span className="mt-0.5 block text-[13px] leading-snug text-white/50">{o.aide}</span>}
            </span>
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full transition duration-150 ${pris ? 'bg-peche text-nuit' : 'ring-[1.5px] ring-inset ring-white/20'}`} aria-hidden="true">
              {pris && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2 5 8.6l4.5-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Segments<T extends string>({ valeur, options, onChange, label }: { valeur: T; options: { id: T; nom: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-full bg-white/[0.06] p-1">
      {options.map(o => (
        <button key={o.id} type="button" role="radio" aria-checked={valeur === o.id} onClick={() => { vibrer(5); onChange(o.id); }}
          className={`min-h-10 flex-1 rounded-full px-3 text-[14px] font-medium transition duration-200 ${valeur === o.id ? 'bg-white text-nuit shadow-[0_2px_8px_rgba(0,0,0,0.25)]' : 'text-white/65 hover:text-white'}`}>
          {o.nom}
        </button>
      ))}
    </div>
  );
}

/** Réduit une image choisie sur le téléphone, carrée ou en 16:9, côté navigateur. */
export async function preparerImage(fichier: Blob, format: 'carre' | 'large'): Promise<string> {
  const bitmap = await createImageBitmap(fichier);
  const [w, h] = format === 'carre' ? [400, 400] : [960, 540];
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const echelle = Math.max(w / bitmap.width, h / bitmap.height);
  const dw = bitmap.width * echelle, dh = bitmap.height * echelle;
  ctx.drawImage(bitmap, (w - dw) / 2, (h - dh) / 2, dw, dh);
  // Safari ne sait pas toujours encoder en WebP : le JPEG prend alors le relais.
  const webp = canvas.toDataURL('image/webp', 0.85);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.86);
}
