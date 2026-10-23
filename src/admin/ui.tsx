import { cloneElement, createContext, isValidElement, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Icone, NOMS_RESEAUX } from '../components/Icone.tsx';
import type { Animation } from '../lib/types.ts';
import { COULEURS_SOURCES } from '../lib/stats.ts';
import { useCouche } from './couches.ts';
import type { ReactNode } from 'react';

/*
 * Les petites pièces du back office : fines et sobres, 44 px de cible pour le
 * pouce. Au bureau (variante `bureau:`, voir app.css), les mêmes pièces se
 * resserrent : boutons de 36 px, champs de 40, interrupteur de 32 sur 18.
 */

/** Le logo d'un réseau du profil dans la couleur de sa marque, celle de « D'où viennent les visites » ; rien (l'encre) pour les autres. */
export const couleurReseau = (reseau: string): string | undefined => COULEURS_SOURCES[NOMS_RESEAUX[reseau]]?.picto;

/** La barre du navigateur au téléphone (`theme-color`) : le bleu de l'en-tête et des écrans d'entrée (connexion, lien reçu, CGU). */
export const COULEUR_NAVIGATEUR = '#292bff';

const GRAND = '(min-width: 1024px)';
/**
 * Un écran assez large pour la barre latérale, l'édition et la page côte à
 * côte (1024 px). La forme suit la largeur, la densité suit la souris : une tablette
 * en paysage a la mise en page du bureau avec des cibles pour le doigt.
 */
export function useGrandEcran() {
  return useSyncExternalStore(
    f => { const m = matchMedia(GRAND); m.addEventListener('change', f); return () => m.removeEventListener('change', f); },
    () => matchMedia(GRAND).matches,
    () => false,
  );
}

/**
 * Une sous-page d'un onglet (Réglages, puis Facturation) : l'en-tête montre le
 * fil « Réglages / Facturation », dont le premier nom ramène en arrière.
 * L'onglet pose `SousPage` tant que la sous-page est ouverte.
 */
export interface Fil { nom: string; retour: () => void }
export const PoserFil = createContext<(f: Fil | null) => void>(() => {});
export function SousPage({ nom, retour }: Fil) {
  const poser = useContext(PoserFil);
  const retourRef = useRef(retour);
  retourRef.current = retour;
  useEffect(() => { poser({ nom, retour: () => retourRef.current() }); return () => poser(null); }, [nom, poser]);
  // Le retour du téléphone ramène aussi d'où l'on vient, comme le premier nom du fil.
  useCouche(true, () => { retourRef.current(); return true; });
  return null;
}

/** Un groupe de réglages : son titre, puis ses lignes dans un cadre fin (Réglages, Facturation). */
export function Groupe({ titre, children }: { titre: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5">
      <h2 id={id} className="text-[15px] font-semibold tracking-[-0.015em] text-white">{titre}</h2>
      <div className="adm-lignes">{children}</div>
    </section>
  );
}

/**
 * Une ligne de réglage : le libellé à gauche, le contrôle à droite. `valeur`
 * se lit en gris entre les deux au bureau, sous le libellé au téléphone.
 * `avant` : ce qui précède le libellé (le logo d'un outil, dans Intégrations) ; la valeur reste alignée sur le libellé.
 */
export function Ligne({ nom, valeur, avant, children, className = '' }: { nom: ReactNode; valeur?: ReactNode; avant?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={`adm-ligne ${children ? 'adm-ligne-controle' : ''} ${className}`}>
      {avant}
      <span className="adm-ligne-texte">
        <span className="adm-ligne-nom">{nom}</span>
        {valeur && <span className="adm-ligne-valeur">{valeur}</span>}
      </span>
      {children}
    </div>
  );
}

/** Une ligne à interrupteur : le libellé l'actionne aussi. */
export function LigneBascule({ nom, actif, changer, disabled }: { nom: string; actif: boolean; changer: (v: boolean) => void; disabled?: boolean }) {
  const id = useId();
  return (
    <Ligne className="adm-ligne-bascule" nom={<label htmlFor={id} className="cursor-pointer">{nom}</label>}>
      <Bascule id={id} actif={actif} disabled={disabled} onClick={() => { vibrer(); changer(!actif); }} />
    </Ligne>
  );
}

/**
 * Une ligne qui mène ailleurs (Mon abonnement, une fonction réservée) : toute la
 * ligne se touche, un chevron au bout. `apres` se pose avant lui (l'offre qui
 * débloque). `externe` : elle quitte Hopla (le portail de Creem), le signe
 * d'ouverture remplace le chevron. Sans `onClick`, la ligne se lit sans mener nulle part.
 */
export function LigneLien({ nom, valeur, avant, apres, onClick, label, disabled, id, externe = false }: { nom: ReactNode; valeur?: ReactNode; avant?: ReactNode; apres?: ReactNode; onClick?: () => void; label?: string; disabled?: boolean; id?: string; externe?: boolean }) {
  const texte = (
    <span className="adm-ligne-texte">
      <span className="adm-ligne-nom">{nom}</span>
      {valeur && <span className="adm-ligne-valeur">{valeur}</span>}
    </span>
  );
  if (!onClick) return <div className="adm-ligne">{avant}{texte}{apres}</div>;
  return (
    <button id={id} type="button" onClick={onClick} aria-label={label} disabled={disabled} className="adm-ligne adm-ligne-lien">
      {avant}{texte}{apres}
      {externe
        ? <Icone nom="ui-ouvrir" taille={15} className="shrink-0 text-[#55554f]" />
        : <Icone nom="ui-chevron" taille={16} className="-rotate-90 shrink-0 text-[#55554f]" />}
    </button>
  );
}

/** L'endroit de l'en-tête où chaque onglet pose son geste, au bureau (Ajouter un bloc, la période, Inviter). */
export const EmplacementEntete = createContext<HTMLElement | null>(null);
export function ActionEntete({ children }: { children: ReactNode }) {
  const lieu = useContext(EmplacementEntete);
  return lieu ? createPortal(children, lieu) : null;
}

/** `compact` : une ligne des réglages d'un bloc, au bureau, le nom à gauche, sans phrase d'aide (elle passe en infobulle). */
export function Interrupteur({ actif, onChange, label, aide, disabled, compact = false }: { actif: boolean; onChange: (v: boolean) => void; label: string; aide?: ReactNode; disabled?: boolean; compact?: boolean }) {
  const id = useId();
  return (
    <div className={`flex items-center justify-between gap-4 ${compact ? 'min-h-11 bureau:min-h-9' : 'py-2.5'}`}>
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer" title={compact && typeof aide === 'string' ? aide : undefined}>
        <span className={`block text-white ${compact ? 'text-[13.5px]' : 'text-[14.5px] font-medium'}`}>{label}</span>
        {aide && !compact && <span className="mt-0.5 block text-[12.5px] leading-snug text-white/50">{aide}</span>}
      </label>
      <Bascule id={id} actif={actif} disabled={disabled} onClick={() => { vibrer(); onChange(!actif); }} />
    </div>
  );
}

/**
 * L'interrupteur seul, pour les lignes qui portent déjà leur icône et leur nom : un seul dessin partout.
 * Éteint, sa piste reste à 3:1 sur le blanc (WCAG 1.4.11) : on le voit, et on voit qu'il est éteint.
 */
export function Bascule({ actif, onClick, id, disabled, label, decrit }: { actif: boolean; onClick: () => void; id?: string; disabled?: boolean; label?: string; decrit?: string }) {
  return (
    <button id={id} type="button" role="switch" aria-checked={actif} aria-label={label} aria-describedby={decrit} disabled={disabled} onClick={onClick}
      className={`adm-interrupteur relative h-6 w-10 shrink-0 rounded-full before:absolute before:-inset-2 before:content-[''] disabled:opacity-40 bureau:h-[18px] bureau:w-8 ${actif ? 'bg-bleu' : 'bg-white/45'}`}>
      <span className={`absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] bg-nuit bureau:top-[2px] bureau:left-[2px] bureau:h-3.5 bureau:w-3.5 ${actif ? 'translate-x-4 bureau:translate-x-3.5' : ''}`} />
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
      <span className="mb-1.5 block text-[12.5px] font-medium text-white/60 bureau:text-white/75">{label}</span>
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

/**
 * Une sous-page dans une feuille (un tiroir du design, les réglages d'un bloc) :
 * l'en-tête prend son nom, et une flèche à gauche ramène d'un cran.
 */
export interface FilFeuille { titre: string; retour: () => void; label: string }
const PoserFilFeuille = createContext<((f: FilFeuille | null) => void) | null>(null);
/** Pose le fil de la feuille qui contient ce composant ; faux hors de toute feuille (au bureau, dans la page). */
export function useFilFeuille(fil: FilFeuille | null): boolean {
  const poser = useContext(PoserFilFeuille);
  const filRef = useRef(fil);
  filRef.current = fil;
  const cle = fil ? `${fil.titre}\n${fil.label}` : '';
  useLayoutEffect(() => {
    if (!poser) return;
    poser(filRef.current && { ...filRef.current, retour: () => filRef.current?.retour() });
    return () => poser(null);
  }, [poser, cle]);
  return !!poser;
}

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
export function Feuille({ ouverte, onFermer, retenir, titre, children, pied, cote = false, apercu, petite = false, moyenne = false, large = false, nue = false, retour, plafond, classe = '' }: { ouverte: boolean; onFermer: () => void; retenir?: () => boolean; titre: string; children: Contenu; pied?: Contenu; cote?: boolean; apercu?: React.ReactNode;
  /** Une flèche à gauche du titre, qui ramène d'un cran (une sous-page, le choix du bloc). */
  retour?: { label: string; action: () => void };
  /** La hauteur la plus grande, en pixels, à la place de celle de `cote` : la feuille d'un bloc laisse voir le bloc au-dessus d'elle. Elle ne rapetisse pas d'une page à l'autre. */
  plafond?: number;
  /** Une classe de plus sur la feuille, pour la retrouver. */
  classe?: string;
  /** Une petite fenêtre au bureau (440 px, titre de 15) : une question courte, comme Inviter. */
  petite?: boolean;
  /** Une fenêtre de 560 px : un message qui se lit, comme « C'est fait ». */
  moyenne?: boolean;
  /** Plein écran au téléphone, 1000 px au bureau : les offres. */
  large?: boolean;
  /** Sans en-tête ni marges : le contenu pose lui-même son titre, sa croix et son défilement. */
  nue?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [sortie, setSortie] = useState(false);
  const [tire, setTire] = useState(0);
  // La hauteur visible quand le clavier est ouvert (iOS ne réduit ni la fenêtre ni les dvh) : la feuille s'y tient.
  const [visible, setVisible] = useState<{ h: number; haut: number } | null>(null);
  const geste = useRef<{ y: number; t: number } | null>(null);
  // Posée sur une autre fenêtre (les offres par-dessus Ajouter), la feuille ne rajoute pas de voile : un seul assombrissement,
  // celui du dessous. Lu une fois la page à jour, avant d'être peint : une fenêtre qui se ferme au même moment ne compte pas.
  const [pardessus, setPardessus] = useState(false);
  useLayoutEffect(() => {
    if (!ouverte) return;
    const moi = ref.current?.closest('[role=dialog]');
    setPardessus([...document.querySelectorAll('[role=dialog][aria-modal=true]')].some(d => d !== moi));
  }, [ouverte]);
  // La sous-page posée par le contenu (un tiroir du design) : son nom et sa flèche prennent l'en-tête.
  const [filEnfant, setFilEnfant] = useState<FilFeuille | null>(null);
  // Le retour du téléphone fait comme la flèche de l'en-tête quand la feuille en a une (un bloc neuf revient au choix du bloc),
  // sinon il la referme comme un glissé : un travail pas valable la retient.
  const fermerRef = useRef<(apres?: () => void) => boolean>(() => false);
  const retourRef = useRef(retour?.action);
  retourRef.current = retour?.action;
  const partir = useCouche(ouverte, () => fermerRef.current(retourRef.current));
  const fermer = useCallback((apres?: () => void): boolean => {
    // Un geste qui fermerait sur un travail pas valable laisse la feuille ouverte (retenir dit pourquoi).
    if (!apres && retenir?.()) { setTire(0); vibrer(20); return false; }
    setSortie(true);
    partir();
    const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => { setSortie(false); setTire(0); (apres ?? onFermer)(); }, reduit ? 0 : 190);
    return true;
  }, [onFermer, retenir, partir]);

  // L'effet ne dépend que de l'ouverture : un parent qui se redessine ne vole pas le focus du champ en cours.
  fermerRef.current = fermer;
  // La feuille d'un bloc garde sa plus grande hauteur : passer d'une page de réglages à l'autre ne la fait pas sauter.
  const [plancher, setPlancher] = useState(0);
  useEffect(() => {
    if (!ouverte || !plafond || !ref.current) return;
    const f = ref.current;
    const ro = new ResizeObserver(() => setPlancher(h => Math.max(h, Math.min(f.offsetHeight, plafond))));
    ro.observe(f);
    return () => { ro.disconnect(); setPlancher(0); };
  }, [ouverte, plafond]);
  useEffect(() => {
    if (!ouverte) return;
    // Une vraie fenêtre : Tab tourne dans la feuille, et le focus revient d'où il venait à la fermeture.
    const avantFocus = document.activeElement as HTMLElement | null;
    const touche = (e: KeyboardEvent) => {
      // Deux feuilles l'une sur l'autre (les offres par-dessus le design) : seule celle du dessus écoute le clavier.
      const fenetres = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      if (fenetres[fenetres.length - 1] !== ref.current?.parentElement) return;
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
    // Le champ qui a l'autoFocus (au bureau seulement, voir lib/clavier.ts) garde la main ; sinon la feuille prend le focus.
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
      <button type="button" tabIndex={-1} aria-hidden="true" className={`adm-fondu absolute inset-0 ${apercu ? 'bg-[#f3eee5] sm:bg-black/[0.04]' : cote ? 'bg-black/[0.04]' : pardessus ? '' : 'bg-black/40 backdrop-blur-[2px]'}`} onClick={() => fermer()} />
      {apercu && <div inert className="adm-fondu pointer-events-none absolute inset-x-0 top-0 bottom-[57dvh] flex items-center justify-center px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 sm:hidden">{apercu}</div>}
      <div ref={ref} tabIndex={-1}
        style={{ ...(tire ? { transform: `translateY(${tire}px)`, transition: 'none' } : {}), ...(visible ? { maxHeight: visible.h - 8, height: 'auto' } : plafond ? { maxHeight: plafond, minHeight: Math.min(plancher, plafond) || undefined } : {}) }}
        className={`adm-feuille relative flex ${large ? 'adm-feuille-large' : apercu ? 'h-[57dvh] sm:h-auto sm:w-[400px]' : cote ? 'max-h-[58dvh] sm:max-h-none sm:w-[400px]' : 'max-h-[92dvh]'} w-full flex-col border border-b-0 border-white/10 bg-nuit shadow-[0_-12px_40px_-16px_rgba(0,0,0,0.18)] sm:border-b ${large ? '' : petite ? 'adm-feuille-petite sm:max-w-[440px]' : moyenne ? 'adm-feuille-moyenne sm:max-w-[560px]' : 'sm:max-w-lg'} ${classe}`}>
        <PoserFilFeuille.Provider value={setFilEnfant}>
        {nue ? rendre(children) : <>
        <div {...tirer} className="shrink-0 touch-none select-none">
          <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-white/20 sm:hidden" />
          <header className="flex items-center justify-between gap-3 px-5 pt-2.5 pb-2 sm:pt-4">
            {/* Dans une sous-page, la flèche ramène d'un cran et le titre devient le sien : on sait où l'on est, et comment revenir. */}
            {/* Une sous-page reste dans la feuille ; la flèche de la feuille elle-même la quitte (en glissant vers le bas, comme une fermeture). */}
            {(() => {
              const fil = filEnfant ?? (retour ? { titre, retour: () => { fermer(retour.action); }, label: retour.label } : null);
              return (
                <div className="flex min-w-0 items-center gap-1">
                  {fil && (
                    <button type="button" onClick={() => { vibrer(4); fil.retour(); }} aria-label={fil.label} title={fil.label} className={`adm-feuille-retour -ml-3 ${classeBouton.icone} text-white/80 active:scale-90`}>
                      <Icone nom="ui-chevron" taille={18} className="rotate-90" />
                    </button>
                  )}
                  <h2 className={`min-w-0 truncate text-[18px] font-semibold tracking-[-0.025em] text-white ${petite ? 'bureau:text-[15px] bureau:tracking-[-0.015em]' : ''}`}>{fil?.titre ?? titre}</h2>
                </div>
              );
            })()}
            <button type="button" onClick={() => fermer()} className={`-mr-3 ${classeBouton.icone} active:scale-90`} aria-label="Fermer">
              <Icone nom="ui-fermer" taille={18} />
            </button>
          </header>
        </div>
        <div className={`adm-feuille-corps min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 ${pied ? 'pb-4' : 'pb-[max(16px,env(safe-area-inset-bottom))]'}`}>{rendre(children)}</div>
        {pied && <footer className="shrink-0 border-t border-white/[0.07] px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">{rendre(pied)}</footer>}
        </>}
        </PoserFilFeuille.Provider>
      </div>
    </div>
  );
}

/**
 * Ouvre le choix d'une image depuis ce qu'on vient de toucher. iOS fait naître
 * son menu (Photothèque, Prendre une photo…) du champ lui-même : caché en
 * `display: none`, le champ n'a pas de place, et le menu partait d'un coin de
 * l'écran en une petite tache noire. Le champ (classe `adm-fichier`) se pose
 * donc, invisible, sur l'élément touché juste avant de s'ouvrir.
 */
export function choisirFichier(champ: HTMLInputElement | null, source?: Element | null) {
  if (!champ) return;
  const cible = source?.getBoundingClientRect();
  if (cible) {
    // Mesuré depuis sa propre place : le champ peut vivre dans une feuille animée, qui déplace son repère.
    Object.assign(champ.style, { left: '0px', top: '0px', width: `${cible.width}px`, height: `${cible.height}px` });
    const repere = champ.getBoundingClientRect();
    Object.assign(champ.style, { left: `${cible.left - repere.left}px`, top: `${cible.top - repere.top}px` });
  }
  champ.click();
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
  // Compact, l'icône seule : ni cadre ni fond derrière elle.
  if (compact) return (
    <button type="button" onClick={copier} aria-label={copie ? 'Adresse copiée' : label ?? 'Copier'}
      className="adm-icone-seule grid h-11 w-11 shrink-0 place-items-center text-white transition active:scale-90 bureau:h-9 bureau:w-9">
      <Icone nom={copie ? 'ui-ok' : 'ui-copier'} taille={18} />
    </button>
  );
  return (
    <button type="button" onClick={copier} aria-label={label}
      className="adm-button-outline flex min-h-11 shrink-0 items-center gap-1.5 px-3.5 text-[14px] font-medium text-white transition active:scale-95 bureau:min-h-9 bureau:px-3">
      <Icone nom={copie ? 'ui-ok' : 'ui-copier'} taille={16} />{copie ? 'Copié' : 'Copier'}
    </button>
  );
}

export interface ElementMenu {
  nom: string;
  action: () => void;
  icone?: string;
  /** Effacer pour de bon : le seul élément en rouge. */
  danger?: boolean;
  /** Un choix exclusif (une période) : l'élément devient une option cochée ou non. */
  coche?: boolean;
  /** Le nom de l'offre qui ouvre ce choix (« Pro ») : l'élément mène aux offres plutôt qu'au choix. */
  etiquette?: string;
  /** L'offre elle-même (`pro`) : son étiquette prend ses couleurs, celles de l'accueil. */
  offre?: string;
}

/**
 * Un bouton qui ouvre une courte liste d'actions (motif ARIA « menu bouton ») :
 * les flèches parcourent la liste, Échap la referme et rend le focus au
 * bouton, un clic ailleurs la range. `entete` se pose au-dessus de la liste
 * sans en faire partie (l'adresse du compte, par exemple).
 */
export function Menu({ label, elements, children, className = '', titre, haut = false, aligne = 'droite', entete, tabIndex, onBascule }: {
  label: string; elements: ElementMenu[]; children: ReactNode; className?: string;
  /** Le nom du bouton pour un lecteur d'écran, quand il ne montre qu'un picto. */
  titre?: string;
  haut?: boolean; aligne?: 'gauche' | 'droite' | 'largeur'; entete?: ReactNode;
  /** -1 pour un raccourci de la souris dont le clavier a déjà le chemin (les actions posées à côté d'un bloc). */
  tabIndex?: number;
  /** Prévenu quand la liste s'ouvre ou se ferme : ce qui porte le menu reste affiché tant qu'elle est ouverte. */
  onBascule?: (ouvert: boolean) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  const bouton = useRef<HTMLButtonElement>(null);
  const boite = useRef<HTMLDivElement>(null);
  const options = () => [...(boite.current?.querySelectorAll<HTMLElement>('[role^=menuitem]') ?? [])];
  const basculeRef = useRef(onBascule);
  basculeRef.current = onBascule;
  useEffect(() => { basculeRef.current?.(ouvert); }, [ouvert]);
  useEffect(() => {
    if (!ouvert) return;
    const o = options();
    (o.find(x => x.getAttribute('aria-checked') === 'true') ?? o[0])?.focus();
    const dehors = (e: PointerEvent) => { const t = e.target as Node; if (!boite.current?.contains(t) && !bouton.current?.contains(t)) setOuvert(false); };
    document.addEventListener('pointerdown', dehors);
    return () => document.removeEventListener('pointerdown', dehors);
  }, [ouvert]);
  function touche(e: React.KeyboardEvent) {
    const o = options();
    const i = o.indexOf(document.activeElement as HTMLElement);
    // Échap ne referme que le menu : la feuille ou la rangée qui le porte reste ouverte.
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOuvert(false); bouton.current?.focus(); }
    else if (e.key === 'Tab') setOuvert(false);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); o[(i + (e.key === 'ArrowDown' ? 1 : -1) + o.length) % o.length]?.focus(); }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); o[e.key === 'Home' ? 0 : o.length - 1]?.focus(); }
  }
  const place = `${haut ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} ${aligne === 'gauche' ? 'left-0' : aligne === 'droite' ? 'right-0' : 'inset-x-0'}`;
  return (
    <div className="relative">
      <button ref={bouton} type="button" aria-haspopup="menu" aria-expanded={ouvert} aria-controls={ouvert ? id : undefined} aria-label={titre} title={titre} tabIndex={tabIndex}
        onClick={() => setOuvert(o => !o)} onKeyDown={e => { if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !ouvert) { e.preventDefault(); setOuvert(true); } }} className={className}>
        {children}
      </button>
      {ouvert && (
        <div ref={boite} onKeyDown={touche} className={`adm-menu adm-fondu absolute z-50 min-w-[180px] ${place}`}>
          {entete}
          <div role="menu" id={id} aria-label={label}>
            {elements.map(el => (
              <button key={el.nom} type="button" tabIndex={-1} role={el.coche === undefined ? 'menuitem' : 'menuitemradio'} aria-checked={el.coche}
                aria-label={el.etiquette ? `${el.nom}, avec ${el.etiquette} : voir les offres` : undefined}
                onClick={() => { setOuvert(false); bouton.current?.focus({ preventScroll: true }); el.action(); }}
                className={`adm-menu-item ${el.danger ? 'text-red-300' : 'text-white'}`}>
                {el.icone && <Icone nom={el.icone} taille={16} className="shrink-0" />}
                <span className={`min-w-0 flex-1 truncate text-left ${el.etiquette ? 'text-white/60' : ''}`}>{el.nom}</span>
                {el.etiquette && <span className={classeBadge} data-offre={el.offre}>{el.etiquette}</span>}
                {el.coche && <Icone nom="ui-ok" taille={15} className="shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Les cinq boutons du back office, en classes : un lien (télécharger, ouvrir)
 * prend la même allure qu'un bouton. Tous en rectangle arrondi à 12 px, 8 au
 * bureau : pas de pilule (Lilian, 19 octobre 2026). Le rouge ne sert qu'à
 * effacer pour de bon.
 */
export const classeBouton = {
  principal: 'adm-button-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-bleu px-5 text-[14px] font-semibold text-nuit transition active:scale-[0.98] disabled:opacity-50 bureau:min-h-9 bureau:gap-1.5 bureau:rounded-lg bureau:px-3.5 bureau:font-medium',
  secondaire: 'adm-button-outline inline-flex min-h-11 items-center justify-center gap-2 px-4 text-[14px] font-medium text-white transition active:scale-[0.98] disabled:opacity-50 bureau:min-h-9 bureau:gap-1.5 bureau:px-3',
  danger: 'adm-button-danger inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-semibold transition active:scale-[0.98] disabled:opacity-40 bureau:min-h-9 bureau:rounded-lg bureau:px-3 bureau:font-medium',
  discret: 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-[14px] font-medium text-white/60 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50 bureau:min-h-9 bureau:rounded-lg bureau:px-2.5',
  // Un bouton fait d'une icône : l'icône seule, qui fonce au survol, jamais un fond derrière elle (22 octobre 2026).
  icone: 'grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white/55 transition hover:text-white bureau:h-8 bureau:w-8 bureau:rounded-lg',
};

/** Une étiquette d'état (Toi, Bientôt) : petite et rectangulaire, comme les boutons. Avec `data-offre`, elle prend les couleurs de l'offre. */
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
            {/* La coche seule, en bleu, sur le choix pris : ni rond plein ni cercle vide autour. */}
            <span className="grid h-5 w-5 shrink-0 place-items-center text-bleu" aria-hidden="true">
              {pris && <Icone nom="ui-ok" taille={18} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Un choix parmi quelques-uns. `souple` : chaque option prend la largeur de son nom, pour un nom long qui doit tenir sur une ligne. */
export function Segments<T extends string>({ valeur, options, onChange, label, souple }: { valeur: T; options: { id: T; nom: string }[]; onChange: (v: T) => void; label: string; souple?: boolean }) {
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={e => flechesRadio(e)} className="flex gap-0.5 rounded-[10px] bg-white/[0.06] p-[3px]">
      {options.map((o, i) => (
        <button key={o.id} type="button" role="radio" aria-checked={valeur === o.id} tabIndex={arretRadio(valeur === o.id, i === 0, !options.some(x => x.id === valeur))} onClick={() => { vibrer(5); onChange(o.id); }}
          className={`min-h-10 ${souple ? 'flex-auto whitespace-nowrap' : 'flex-1'} rounded-[7px] px-2.5 text-[13.5px] font-medium transition duration-200 bureau:min-h-[30px] ${valeur === o.id ? 'bg-nuit text-bleu shadow-[0_1px_3px_rgba(0,0,0,0.14)]' : 'text-white/55 hover:text-white'}`}>
          {o.nom}
        </button>
      ))}
    </div>
  );
}

/** Réduit une image choisie sur le téléphone, côté navigateur : carrée, en 16:9, ou la photo d'un produit, carrée et plus grande. */
export async function preparerImage(fichier: Blob, format: 'carre' | 'large' | 'photo'): Promise<string> {
  const bitmap = await createImageBitmap(fichier);
  const [w, h] = format === 'carre' ? [400, 400] : format === 'photo' ? [800, 800] : [960, 540];
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

/**
 * Le logo d'un site en vignette (23 octobre 2026) : posé bord à bord s'il remplit déjà son carré (une icône d'écran
 * d'accueil) ; sinon centré, avec de l'air, sur du blanc, comme une icône d'app. Un logo transparent ne disparaît
 * pas sur un thème sombre, et le JPEG de Safari n'a pas de transparence à noircir.
 */
export async function preparerLogo(fichier: Blob, format: 'carre' | 'large'): Promise<string> {
  const bitmap = await createImageBitmap(fichier);
  const [w, h] = format === 'carre' ? [400, 400] : [960, 540];
  // La transparence se lit sur le pourtour, réduit à 24 pixels de côté.
  const sonde = document.createElement('canvas');
  sonde.width = 24; sonde.height = 24;
  const s = sonde.getContext('2d', { willReadFrequently: true })!;
  s.drawImage(bitmap, 0, 0, 24, 24);
  const px = s.getImageData(0, 0, 24, 24).data;
  let transparent = false;
  for (let i = 0; i < 24 * 24 && !transparent; i++) {
    const x = i % 24, y = Math.floor(i / 24);
    if ((x === 0 || y === 0 || x === 23 || y === 23) && px[i * 4 + 3] < 250) transparent = true;
  }
  const ratio = bitmap.width / bitmap.height;
  const bordABord = !transparent && format === 'carre' && ratio > 0.9 && ratio < 1.1;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  if (bordABord) ctx.drawImage(bitmap, 0, 0, w, h);
  else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    const place = Math.min(w, h) * (format === 'carre' ? 0.64 : 0.46);
    const echelle = Math.min(place / bitmap.width, place / bitmap.height);
    const dw = bitmap.width * echelle, dh = bitmap.height * echelle;
    ctx.drawImage(bitmap, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }
  const webp = canvas.toDataURL('image/webp', 0.9);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.9);
}
