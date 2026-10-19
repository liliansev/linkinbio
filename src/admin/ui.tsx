import { cloneElement, isValidElement, useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icone } from '../components/Icone.tsx';
import type { Animation } from '../lib/types.ts';
import type { ReactNode } from 'react';

/* Les petites pièces du back office : fines et sobres, 40 px de cible au moins pour le pouce. */

export function Interrupteur({ actif, onChange, label, aide, disabled }: { actif: boolean; onChange: (v: boolean) => void; label: string; aide?: ReactNode; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-[14.5px] font-medium text-white">{label}</span>
        {aide && <span className="mt-0.5 block text-[12.5px] leading-snug text-white/50">{aide}</span>}
      </label>
      <Bascule id={id} actif={actif} disabled={disabled} onClick={() => { vibrer(); onChange(!actif); }} />
    </div>
  );
}

/** L'interrupteur seul, pour les lignes qui portent déjà leur icône et leur nom : un seul dessin partout. */
export function Bascule({ actif, onClick, id, disabled, label, decrit }: { actif: boolean; onClick: () => void; id?: string; disabled?: boolean; label?: string; decrit?: string }) {
  return (
    <button id={id} type="button" role="switch" aria-checked={actif} aria-label={label} aria-describedby={decrit} disabled={disabled} onClick={onClick}
      className={`adm-interrupteur relative h-6 w-10 shrink-0 rounded-full before:absolute before:-inset-2 before:content-[''] disabled:opacity-40 ${actif ? 'bg-white' : 'bg-white/15'}`}>
      <span className={`absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] bg-nuit ${actif ? 'translate-x-4' : ''}`} />
    </button>
  );
}

/** Un champ et son nom ; `erreur` s'affiche dessous, rattachée au champ (aria-invalid, aria-describedby). */
export function Champ({ label, aide, erreur, children }: { label: string; aide?: ReactNode; erreur?: string; children: ReactNode }) {
  const id = useId();
  const champ = erreur && isValidElement(children)
    ? cloneElement(children as React.ReactElement<Record<string, unknown>>, { 'aria-invalid': true, 'aria-describedby': id })
    : children;
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-white/60">{label}</span>
      {champ}
      {erreur && <span id={id} role="alert" className="mt-1.5 block text-[13px] font-medium leading-snug text-red-300">{erreur}</span>}
      {aide && !erreur && <span className="mt-1.5 block text-[12.5px] leading-snug text-white/55">{aide}</span>}
    </label>
  );
}

export const classeSaisie = 'adm-field w-full rounded-xl border border-white/15 bg-nuit px-3.5 py-3 text-[16px] text-white placeholder:text-white/50 transition focus:border-white/70 aria-[invalid=true]:border-red-400/70';

export function Carte({ titre, action, children, className = '', id, nu = false }: { titre?: string; action?: ReactNode; children: ReactNode; className?: string; id?: string; nu?: boolean }) {
  return (
    <section id={id} className={`scroll-mt-24 ${nu ? '' : 'adm-card'} ${className}`}>
      {(titre || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {titre && <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-white">{titre}</h2>}
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
 * `apercu`, sur téléphone, se pose au-dessus de la feuille : la page en direct,
 * en miniature, qui suit chaque réglage (Lilian, 18 octobre 2026).
 */
export function Feuille({ ouverte, onFermer, retenir, titre, children, pied, cote = false, apercu }: { ouverte: boolean; onFermer: () => void; retenir?: () => boolean; titre: string; children: Contenu; pied?: Contenu; cote?: boolean; apercu?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [sortie, setSortie] = useState(false);
  const [tire, setTire] = useState(0);
  // La hauteur visible quand le clavier est ouvert (iOS ne réduit ni la fenêtre ni les dvh) : la feuille s'y tient.
  const [visible, setVisible] = useState<{ h: number; haut: number } | null>(null);
  const geste = useRef<{ y: number; t: number } | null>(null);
  const fermer = useCallback<Fermer>(apres => {
    // Un geste qui fermerait sur un travail pas valable laisse la feuille ouverte (retenir dit pourquoi).
    if (!apres && retenir?.()) { setTire(0); vibrer(20); return; }
    setSortie(true);
    const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => { setSortie(false); setTire(0); (apres ?? onFermer)(); }, reduit ? 0 : 190);
  }, [onFermer, retenir]);

  // L'effet ne dépend que de l'ouverture : un parent qui se redessine ne vole pas le focus du champ en cours.
  const fermerRef = useRef(fermer);
  fermerRef.current = fermer;
  useEffect(() => {
    if (!ouverte) return;
    // Une vraie fenêtre : Tab tourne dans la feuille, et le focus revient d'où il venait à la fermeture.
    const avantFocus = document.activeElement as HTMLElement | null;
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermerRef.current();
      // Ctrl ou Cmd + Entrée : le bouton principal du pied, comme un clic sur Terminé.
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && ref.current) {
        const principal = ref.current.querySelector<HTMLButtonElement>('[data-principal]:not([disabled])');
        if (principal) { e.preventDefault(); principal.click(); }
        return;
      }
      if (e.key !== 'Tab' || !ref.current) return;
      const cibles = [...ref.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])')].filter(x => x.offsetParent !== null);
      if (!cibles.length) return;
      const premier = cibles[0], dernier = cibles[cibles.length - 1];
      if (e.shiftKey && (document.activeElement === premier || document.activeElement === ref.current)) { e.preventDefault(); dernier.focus(); }
      else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
      else if (!ref.current.contains(document.activeElement)) { e.preventDefault(); premier.focus(); }
    };
    document.addEventListener('keydown', touche);
    const vv = window.visualViewport;
    const suivre = () => { if (vv) setVisible(innerHeight - vv.height > 120 ? { h: vv.height, haut: vv.offsetTop } : null); };
    vv?.addEventListener('resize', suivre);
    vv?.addEventListener('scroll', suivre);
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Le champ qui a l'autoFocus garde la main ; sinon la feuille prend le focus.
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
    return () => { vv?.removeEventListener('resize', suivre); vv?.removeEventListener('scroll', suivre); setVisible(null); document.removeEventListener('keydown', touche); document.body.style.overflow = avant; 
      // Le focus revient d'où il venait, sauf si une autre feuille vient de le prendre (Ajouter qui ouvre l'éditeur sur son premier champ).
      const ici = document.activeElement;
      const libre = !ici || ici === document.body || !!ref.current?.contains(ici);
      if (libre && avantFocus?.isConnected) avantFocus.focus({ preventScroll: true });
    };
  }, [ouverte]);
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
    <div className={`fixed inset-0 z-50 flex items-end justify-center ${cote ? 'sm:items-stretch sm:justify-end sm:p-4' : 'sm:items-center'}`} role="dialog" aria-modal="true" aria-label={titre} data-sortie={sortie || undefined}
      style={visible ? { top: visible.haut, height: visible.h, bottom: 'auto' } : undefined}>
      <button type="button" tabIndex={-1} aria-hidden="true" className={`adm-fondu absolute inset-0 ${apercu ? 'bg-[#f4f4f4] sm:bg-black/[0.04]' : cote ? 'bg-black/[0.04]' : 'bg-black/40 backdrop-blur-[2px]'}`} onClick={() => fermer()} />
      {apercu && <div inert className="adm-fondu pointer-events-none absolute inset-x-0 top-0 bottom-[57dvh] flex items-center justify-center px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 sm:hidden">{apercu}</div>}
      <div ref={ref} tabIndex={-1}
        style={{ ...(tire ? { transform: `translateY(${tire}px)`, transition: 'none' } : {}), ...(visible ? { maxHeight: visible.h - 8, height: 'auto' } : {}) }}
        className={`adm-feuille relative flex ${apercu ? 'h-[57dvh] sm:h-auto sm:w-[400px]' : cote ? 'max-h-[58dvh] sm:max-h-none sm:w-[400px]' : 'max-h-[92dvh]'} w-full flex-col border border-b-0 border-white/10 bg-nuit shadow-[0_-12px_40px_-16px_rgba(0,0,0,0.18)] outline-none sm:max-w-lg sm:border-b`}>
        <div {...tirer} className="shrink-0 touch-none select-none">
          <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-white/20 sm:hidden" />
          <header className="flex items-center justify-between gap-3 px-5 pt-2.5 pb-2 sm:pt-4">
            <h2 className="text-[18px] font-semibold tracking-[-0.025em] text-white">{titre}</h2>
            <button type="button" onClick={() => fermer()} className={`-mr-3 ${classeBouton.icone} active:scale-90`} aria-label="Fermer">
              <Icone nom="ui-fermer" taille={18} />
            </button>
          </header>
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 ${pied ? 'pb-4' : 'pb-[max(16px,env(safe-area-inset-bottom))]'}`}>{rendre(children)}</div>
        {pied && <footer className="shrink-0 border-t border-white/[0.07] px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">{rendre(pied)}</footer>}
      </div>
    </div>
  );
}

/**
 * Copie un texte. Si le presse-papiers est refusé, l'ancienne méthode prend le relais ; si elle échoue
 * aussi, l'adresse s'affiche, sélectionnée, pour être copiée à la main : une copie ne rate jamais en silence.
 */
export async function copierTexte(texte: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(texte); return true; } catch { /* on essaie autrement */ }
  try {
    const zone = document.createElement('textarea');
    zone.value = texte; zone.setAttribute('readonly', ''); zone.style.position = 'fixed'; zone.style.opacity = '0';
    document.body.appendChild(zone); zone.select();
    const ok = document.execCommand('copy');
    zone.remove();
    if (ok) return true;
  } catch { /* on montre l'adresse */ }
  window.prompt('Copie cette adresse :', texte);
  return false;
}

/** Le même bouton Copier partout : il copie, vibre, dit « Copié » un instant, puis prévient (`onCopie`). */
export function BoutonCopier({ texte, onCopie, label, compact = false }: { texte: string; onCopie?: () => void; label?: string; compact?: boolean }) {
  const [copie, setCopie] = useState(false);
  async function copier() {
    if (!(await copierTexte(texte))) return;
    vibrer(8); setCopie(true); onCopie?.(); setTimeout(() => setCopie(false), 1800);
  }
  if (compact) return (
    <button type="button" onClick={copier} aria-label={copie ? 'Adresse copiée' : label ?? 'Copier'}
      className="adm-button-outline grid h-11 w-11 shrink-0 place-items-center text-white transition active:scale-95">
      <Icone nom={copie ? 'ui-ok' : 'ui-copier'} taille={18} />
    </button>
  );
  return (
    <button type="button" onClick={copier} aria-label={label}
      className="adm-button-outline flex min-h-11 shrink-0 items-center gap-1.5 px-3.5 text-[14px] font-medium text-white transition active:scale-95">
      <Icone nom={copie ? 'ui-ok' : 'ui-copier'} taille={16} />{copie ? 'Copié' : 'Copier'}
    </button>
  );
}

/**
 * Les cinq boutons du back office, en classes : un lien (télécharger, ouvrir)
 * prend la même allure qu'un bouton. Tous en rectangle arrondi à 12 px : pas
 * de pilule (Lilian, 19 octobre 2026). Le rouge ne sert qu'à effacer pour de bon.
 */
export const classeBouton = {
  principal: 'adm-button-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-[14px] font-semibold text-nuit transition active:scale-[0.98] disabled:opacity-50',
  secondaire: 'adm-button-outline inline-flex min-h-11 items-center justify-center gap-2 px-4 text-[14px] font-medium text-white transition active:scale-[0.98] disabled:opacity-50',
  danger: 'adm-button-danger inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-semibold transition active:scale-[0.98] disabled:opacity-40',
  discret: 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-[14px] font-medium text-white/60 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50',
  icone: 'grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white/55 transition hover:bg-white/[0.06] hover:text-white',
};

/** Une étiquette d'état (Pro, Suspendu) : petite et rectangulaire, comme les boutons. */
export const classeBadge = 'inline-flex items-center rounded-[7px] bg-white/[0.07] px-1.5 py-0.5 text-[11.5px] font-semibold text-white';

export function BoutonPrincipal({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" data-principal="" aria-keyshortcuts="Control+Enter Meta+Enter" {...props} className={`${classeBouton.principal} ${props.className ?? ''}`}>{children}</button>;
}

export function BoutonSecondaire({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`${classeBouton.secondaire} ${props.className ?? ''}`}>{children}</button>;
}

/** Un choix parmi quelques options, en pastilles. */
/**
 * Les flèches dans un groupe de boutons radio (motif ARIA) : elles passent au
 * voisin et, si `choisir`, le prennent. À poser sur le conteneur `radiogroup`.
 */
export function flechesRadio(e: React.KeyboardEvent<HTMLElement>, choisir = true) {
  const pas = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, Home: -Infinity, End: Infinity }[e.key];
  if (pas === undefined) return;
  const radios = [...e.currentTarget.querySelectorAll<HTMLElement>('[role=radio]:not([disabled])')];
  const i = radios.indexOf(document.activeElement as HTMLElement);
  if (i < 0) return;
  e.preventDefault();
  const n = pas === -Infinity ? 0 : pas === Infinity ? radios.length - 1 : (i + pas + radios.length) % radios.length;
  radios[n].focus();
  if (choisir) radios[n].click();
}
/** Un seul arrêt de tabulation par groupe : le choix en cours, ou le premier. */
export const arretRadio = (pris: boolean, premier: boolean, aucun: boolean) => (pris || (aucun && premier) ? 0 : -1);

/** Un choix parmi plusieurs, en liste : un nom, une coche sur celui qui est pris. */
export function ListeChoix<T extends string>({ valeur, options, onChange, label }: { valeur: T; options: { id: T; nom: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={e => flechesRadio(e)} className="adm-groupe divide-y divide-white/[0.06]">
      {options.map((o, i) => {
        const pris = valeur === o.id;
        return (
          <button key={o.id} type="button" role="radio" aria-checked={pris} tabIndex={arretRadio(pris, i === 0, !options.some(x => x.id === valeur))} onClick={() => { vibrer(4); onChange(o.id); }}
            className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-white/[0.04]">
            <span className={`min-w-0 flex-1 text-[14px] font-medium ${pris ? 'text-white' : 'text-white/80'}`}>{o.nom}</span>
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full transition duration-150 ${pris ? 'bg-white text-nuit' : 'ring-[1.5px] ring-inset ring-white/20'}`} aria-hidden="true">
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
    <div role="radiogroup" aria-label={label} onKeyDown={e => flechesRadio(e)} className="flex gap-0.5 rounded-[10px] bg-white/[0.06] p-[3px]">
      {options.map((o, i) => (
        <button key={o.id} type="button" role="radio" aria-checked={valeur === o.id} tabIndex={arretRadio(valeur === o.id, i === 0, !options.some(x => x.id === valeur))} onClick={() => { vibrer(5); onChange(o.id); }}
          className={`min-h-10 flex-1 rounded-[7px] px-2.5 text-[13.5px] font-medium transition duration-200 ${valeur === o.id ? 'bg-nuit text-white shadow-[0_1px_3px_rgba(0,0,0,0.14)]' : 'text-white/55 hover:text-white'}`}>
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
