import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icone } from '../components/Icone.tsx';
import { useL } from '../accueil/langue.ts';
import { focusAuto, focusSaisie } from '../lib/clavier.ts';
import { useCouche } from './couches.ts';

/*
 * La palette de commandes (10 novembre 2026, refonte du back office à la Linear, demandée par Lilian : « pas assez de
 * menus ») : ⌘K ou Ctrl + K, ou la loupe de la barre latérale, et tout le back office se trouve en tapant quelques
 * lettres : un écran, un réglage, ajouter un bloc, copier son lien, changer de page. Une commande = un picto, un nom,
 * son raccourci s'il en a un. Rien n'est écrit en plus : la liste se lit d'un coup d'œil, comme le reste.
 */

export interface Commande {
  id: string;
  nom: string;
  icone: string;
  groupe: string;
  /** D'autres mots qui la trouvent (« abonnement » pour « Changer d'offre »). */
  mots?: string;
  touche?: string;
  /** Seulement quand on cherche : les blocs de la page ne chargent pas la liste de départ. */
  recherche?: boolean;
  faire: () => void;
}

/** Sans accents ni majuscules : « reglages » trouve « Réglages ». */
const plat = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function filtrerCommandes(commandes: Commande[], requete: string): Commande[] {
  const q = plat(requete.trim());
  if (!q) return commandes.filter(c => !c.recherche);
  const morceaux = q.split(/\s+/);
  const trouvees = commandes.filter(c => { const t = plat(`${c.nom} ${c.mots ?? ''} ${c.groupe}`); return morceaux.every(m => t.includes(m)); });
  // Ce dont le nom répond passe devant ce que seuls ses mots cachés trouvent : « lien » donne d'abord « Liens courts ».
  const parNom = (c: Commande) => morceaux.every(m => plat(c.nom).includes(m)) ? 0 : 1;
  return trouvees.map((c, i) => ({ c, i })).sort((a, b) => parNom(a.c) - parNom(b.c) || a.i - b.i).map(x => x.c);
}

export function Palette({ ouverte, fermer, commandes }: { ouverte: boolean; fermer: () => void; commandes: Commande[] }) {
  const l = useL();
  const [requete, setRequete] = useState('');
  const [actif, setActif] = useState(0);
  const liste = useRef<HTMLUListElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  const fermeture = useRef<HTMLButtonElement>(null);
  const id = useId();
  const trouvees = useMemo(() => filtrerCommandes(commandes, requete), [commandes, requete]);
  useCouche(ouverte, () => { fermer(); return true; });

  useEffect(() => { if (ouverte) { setRequete(''); setActif(0); } }, [ouverte]);
  useEffect(() => { setActif(0); }, [requete]);
  useEffect(() => {
    liste.current?.querySelector<HTMLElement>(`[data-index="${actif}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [actif]);
  // Ce qui avait la main avant l'ouverture, relevé avant que le champ ne la prenne, pour la lui rendre ensuite.
  const avantRef = useRef<HTMLElement | null>(null);
  if (ouverte && !avantRef.current) avantRef.current = document.activeElement as HTMLElement | null;
  useEffect(() => {
    if (!ouverte) return;
    const avant = avantRef.current;
    if (focusAuto()) focusSaisie(champ.current);
    const corps = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = corps; avantRef.current = null; if (avant?.isConnected) avant.focus({ preventScroll: true }); };
  }, [ouverte]);

  if (!ouverte) return null;
  const lancer = (c: Commande | undefined) => { if (!c) return; fermer(); requestAnimationFrame(() => c.faire()); };
  const touche = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActif(a => Math.min(trouvees.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActif(a => Math.max(0, a - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActif(0); }
    else if (e.key === 'End') { e.preventDefault(); setActif(trouvees.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); lancer(trouvees[actif]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fermer(); }
    else if (e.key === 'Tab' && e.target === champ.current && !e.shiftKey) { e.preventDefault(); fermeture.current?.focus(); }
    else if (e.key === 'Tab') { e.preventDefault(); champ.current?.focus(); }
  };

  // Les commandes rangées par groupe, dans l'ordre où elles arrivent ; l'index reste celui de la liste filtrée.
  const groupes: { nom: string; elements: { c: Commande; i: number }[] }[] = [];
  trouvees.forEach((c, i) => {
    const g = groupes.find(x => x.nom === c.groupe);
    if (g) g.elements.push({ c, i }); else groupes.push({ nom: c.groupe, elements: [{ c, i }] });
  });

  return createPortal(
    <div className="adm adm-palette-fond fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]" onPointerDown={e => { if (e.target === e.currentTarget) fermer(); }}>
      <div role="dialog" aria-modal="true" aria-label={l('Commandes', 'Commands')} className="adm-palette" onKeyDown={touche}
        onMouseDown={e => { if (e.target !== champ.current && !(e.target as HTMLElement).closest('button')) e.preventDefault(); }}>
        <div className="adm-palette-tete">
          <Icone nom="nav-recherche" taille={18} className="adm-palette-loupe shrink-0" />
          <input ref={champ} aria-label={l('Rechercher une commande ou un bloc', 'Search commands or blocks')} value={requete} onChange={e => setRequete(e.target.value)} placeholder={l('Aller à, ajouter, régler…', 'Go to, add, set…')}
            role="combobox" aria-expanded="true" aria-controls={id} aria-activedescendant={trouvees[actif] ? `${id}-${actif}` : undefined} aria-autocomplete="list"
            className="adm-palette-champ" spellCheck={false} autoComplete="off" />
          <button ref={fermeture} type="button" onClick={fermer} className="adm-palette-fermer" aria-label={l('Fermer', 'Close')}><kbd className="adm-touche">{l('Échap', 'Esc')}</kbd></button>
        </div>
        <ul ref={liste} id={id} role="listbox" className="adm-palette-liste" aria-label={l('Commandes', 'Commands')}>
          {groupes.map(g => (
            <li key={g.nom} role="presentation">
              <p className="adm-palette-groupe" aria-hidden="true">{g.nom}</p>
              <ul role="group" aria-label={g.nom}>
                {g.elements.map(({ c, i }) => (
                  <li key={c.id} id={`${id}-${i}`} role="option" aria-selected={i === actif} data-index={i}
                    onPointerMove={() => setActif(i)} onClick={() => lancer(c)} className="adm-palette-item">
                    <Icone nom={c.icone} taille={17} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{c.nom}</span>
                    {c.touche && <kbd className="adm-touche">{c.touche}</kbd>}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <p role="status" className={trouvees.length ? 'sr-only' : 'adm-palette-vide'}>
          {trouvees.length ? l(`${trouvees.length} résultat${trouvees.length > 1 ? 's' : ''}`, `${trouvees.length} result${trouvees.length > 1 ? 's' : ''}`) : l('Rien à ce nom', 'Nothing by that name')}
        </p>
      </div>
    </div>,
    document.body,
  );
}

/** ⌘K (Ctrl + K hors Mac) ouvre la palette, d'où qu'on soit, même dans un champ, mais jamais par-dessus une autre fenêtre. */
const surMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
/** Le nom du raccourci, lu après le premier rendu (le serveur ne connaît pas l'ordinateur) : ⌘K sur Mac, Ctrl K ailleurs. */
export function useToucheK() {
  const [mac, setMac] = useState(true);
  useEffect(() => { setMac(surMac()); }, []);
  return mac ? '⌘K' : 'Ctrl K';
}
export function usePaletteRaccourci(ouvrir: () => void) {
  const ref = useRef(ouvrir);
  ref.current = ouvrir;
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (!(surMac() ? e.metaKey : e.ctrlKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'k') return;
      e.preventDefault();
      if (e.repeat || document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      ref.current();
    };
    addEventListener('keydown', touche);
    return () => removeEventListener('keydown', touche);
  }, []);
}
