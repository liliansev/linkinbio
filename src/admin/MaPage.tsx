import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Bloc, PagePublique, Reglages, TypeBloc } from '../lib/types.ts';
import { TYPES_PRINCIPAL, estEnLigne, nouveauBloc } from '../lib/types.ts';
import { etiquettes } from '../lib/etiquettes.ts';
import type { Destination } from '../lib/demarrage.ts';
import { PageLiens } from '../components/PageLiens.tsx';
import type { Edition } from '../components/PageLiens.tsx';
import { Icone } from '../components/Icone.tsx';
import { HautLiens } from './BienDemarrer.tsx';
import { FeuilleAjout } from './OngletLiens.tsx';
import { DesignTiroirs, OngletApparence } from './OngletApparence.tsx';
import { Feuille, Interrupteur, preparerImage, vibrer } from './ui.tsx';

/*
 * « Ma page » : on édite la page elle-même. Le nom et la bio se tapent en
 * place ; la photo, les réseaux et chaque bloc s'ouvrent d'un toucher ; un
 * bloc maintenu se déplace. Le thème et les boutons s'ouvrent dans une feuille
 * qui laisse voir la page. Une seule façon d'éditer : pas de vue en liste à
 * choisir (Lilian, 18 octobre 2026).
 */

export function MaPage({ compte, reglages, blocs, clics, onReglages, onOrdonner, onOuvrir, onAjouter, envoyerImage }: {
  compte: PagePublique['compte'];
  reglages: Reglages;
  blocs: Bloc[];
  clics: Record<string, number>;
  onReglages: (r: Reglages) => void;
  onOrdonner: (blocs: Bloc[]) => void;
  onOuvrir: (bloc: Bloc) => void;
  onAjouter: (bloc: Bloc) => void;
  envoyerImage: (d: string) => Promise<string>;
}) {
  const [feuille, setFeuille] = useState<'design' | 'reseaux' | 'ajout' | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const fichier = useRef<HTMLInputElement>(null);
  const toile = useRef<HTMLDivElement>(null);
  const principal = compte.principal;
  const visibles = blocs.filter(b => principal || !TYPES_PRINCIPAL.includes(b.type));

  const profil = (champs: Partial<Reglages['profil']>) => onReglages({ ...reglages, profil: { ...reglages.profil, ...champs } });

  async function photo(f: File | undefined) {
    if (!f) return;
    setEnvoi(true);
    try { profil({ avatar: await envoyerImage(await preparerImage(f, 'carre')) }); } finally { setEnvoi(false); if (fichier.current) fichier.current.value = ''; }
  }
  /** Le design s'ouvre en laissant voir le haut de la page (sur ordinateur, elle est à gauche de la feuille). */
  function design() {
    const nom = toile.current?.querySelector('.lp-nom');
    if (nom) scrollTo({ top: nom.getBoundingClientRect().top + scrollY - 80 });
    setFeuille('design');
  }
  const direct = <ApercuDirect page={{ reglages, blocs: visibles, compte }} />;
  const ajouter = (type: TypeBloc) => { setFeuille(null); onAjouter(nouveauBloc(type, `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`)); };

  /** Une étape de « Bien démarrer » mène à l'endroit de la page où elle se fait. */
  function aller(d: Destination) {
    vibrer(5);
    if (d === 'lien') return ajouter('lien');
    if (d === 'photo') return fichier.current?.click();
    if (d === 'theme') return design();
    if (d === 'reseaux') return setFeuille('reseaux');
    setTimeout(() => {
      const bio = toile.current?.querySelector<HTMLTextAreaElement>('.lp-bio');
      bio?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      bio?.focus({ preventScroll: true });
    }, 60);
  }

  const edition: Edition = {
    profil,
    photo: () => fichier.current?.click(),
    envoiPhoto: envoi,
    reseaux: () => setFeuille('reseaux'),
    liste: (liste, rendu) => <BlocsEditables blocs={liste} rendu={rendu} clics={clics} onOrdonner={onOrdonner} onOuvrir={onOuvrir} onAjouter={() => setFeuille('ajout')}
      />,
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Les deux gestes de la page, en tête, sur téléphone comme sur ordinateur : rien ne flotte au-dessus des onglets. */}
      <div className="order-0 flex items-center justify-end gap-2 pt-3 lg:pt-0">
        <button type="button" onClick={design} className="flex min-h-9 items-center gap-1.5 rounded-full bg-white/[0.07] px-3.5 text-[13.5px] font-medium text-white transition hover:bg-white/[0.12] active:scale-95">
          <Icone nom="palette" taille={16} /> Design
        </button>
        <button type="button" onClick={() => { vibrer(5); setFeuille('ajout'); }} className="flex min-h-9 items-center gap-1.5 rounded-full bg-peche px-3.5 text-[13.5px] font-semibold text-nuit transition hover:brightness-105 active:scale-95">
          <Icone nom="ui-plus" taille={16} /> Ajouter
        </button>
      </div>

      {/* Sur téléphone, la page vient d'abord, bord à bord ; l'adresse et « Bien démarrer » passent dessous. */}
      <div className="order-2 lg:order-none"><HautLiens compte={compte} reglages={reglages} blocs={blocs} aller={aller} /></div>

      <div className="order-1 lg:order-none">
        <div ref={toile}
          className="adm-apercu adm-toile -mx-4 overflow-hidden lg:mx-0 lg:rounded-[30px] lg:ring-1 lg:ring-white/10 lg:shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
          <PageLiens page={{ reglages, blocs: visibles, compte }} edition={edition} />
        </div>
        <p className="mt-3 text-center text-[13px] leading-snug text-white/45">Touche un élément pour le modifier. Maintiens un bloc pour le déplacer.</p>
      </div>

      <input ref={fichier} type="file" accept="image/*" hidden onChange={e => photo(e.target.files?.[0])} />
      <FeuilleAjout ouverte={feuille === 'ajout'} onFermer={() => setFeuille(null)} onChoisir={ajouter} principal={principal} />
      <Feuille ouverte={feuille === 'reseaux'} onFermer={() => setFeuille(null)} titre="Réseaux" cote apercu={direct}>
        <OngletApparence reglages={reglages} onChange={onReglages} envoyerImage={envoyerImage} principal={principal} parties={['reseaux']} />
      </Feuille>
      <Feuille ouverte={feuille === 'design'} onFermer={() => setFeuille(null)} titre="Design" cote apercu={direct}>
        <DesignTiroirs reglages={reglages} onChange={onReglages} envoyerImage={envoyerImage} principal={principal}
          pied={principal && <Interrupteur label="Badge vérifié" aide="La petite coche à côté de ton nom." actif={reglages.profil.badge} onChange={v => profil({ badge: v })} />} />
      </Feuille>
    </div>
  );
}


/**
 * La page en direct, en miniature, au-dessus de la feuille de design sur
 * téléphone : rendue à la largeur d'un téléphone puis réduite pour tenir dans
 * la place laissée, elle suit chaque réglage.
 */
function ApercuDirect({ page }: { page: PagePublique }) {
  const cadre = useRef<HTMLDivElement>(null);
  const [taille, setTaille] = useState({ l: 0, h: 0 });
  useLayoutEffect(() => {
    const el = cadre.current?.parentElement;
    if (!el) return;
    const mesurer = () => setTaille({ l: el.clientWidth - 32, h: el.clientHeight - 24 });
    mesurer();
    const obs = new ResizeObserver(mesurer);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  // Une page de téléphone fait 390 de large ; la miniature garde ses proportions, sans dépasser 62 % de l'écran.
  const LARGEUR = 390;
  const l = Math.min(taille.l * 0.62, 260), echelle = l / LARGEUR;
  return (
    <div ref={cadre} className="flex flex-col items-center gap-2" aria-hidden="true">
      {taille.h > 0 && (
        <div className="overflow-hidden rounded-[22px] ring-1 ring-white/15 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]" style={{ width: l, height: taille.h - 22 }}>
          <div className="adm-apercu" style={{ width: LARGEUR, height: (taille.h - 22) / echelle, transform: `scale(${echelle})`, transformOrigin: '0 0' }}>
            <PageLiens page={page} apercu />
          </div>
        </div>
      )}
      <p className="flex items-center gap-1.5 text-[12px] font-medium text-white/55"><span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" /> Aperçu en direct</p>
    </div>
  );
}

function BlocsEditables({ blocs, rendu, clics, onOrdonner, onOuvrir, onAjouter }: {
  blocs: Bloc[]; rendu: (bloc: Bloc) => ReactNode; clics: Record<string, number>;
  onOrdonner: (blocs: Bloc[]) => void; onOuvrir: (bloc: Bloc) => void; onAjouter: () => void;
}) {
  // Un glisser se termine par un clic : il ne doit pas ouvrir le bloc lâché.
  const glisse = useRef(0);
  const capteurs = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 260, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] } }),
  );
  function deplacer({ active, over }: DragEndEvent) {
    glisse.current = Date.now();
    if (!over || active.id === over.id) return;
    vibrer(10);
    onOrdonner(arrayMove(blocs, blocs.findIndex(b => b.id === active.id), blocs.findIndex(b => b.id === over.id)));
  }
  const ouvrir = (bloc: Bloc) => { if (Date.now() - glisse.current > 250) onOuvrir(bloc); };
  return (
    <>
      <button type="button" className="lp-ed-ajout" onClick={onAjouter}><Icone nom="ui-plus" taille={18} /> Ajouter un bloc</button>
      <DndContext sensors={capteurs} collisionDetection={closestCenter} onDragStart={() => vibrer(6)} onDragEnd={deplacer} onDragCancel={() => { glisse.current = Date.now(); }}>
        <SortableContext items={blocs.map(b => b.id)} strategy={verticalListSortingStrategy}>
          {blocs.map((bloc, i) => <BlocEditable key={bloc.id} bloc={bloc} i={i} clics={clics[bloc.id]} ouvrir={ouvrir}>{rendu(bloc)}</BlocEditable>)}
        </SortableContext>
      </DndContext>
    </>
  );
}

function BlocEditable({ bloc, i, clics, ouvrir, children }: { bloc: Bloc; i: number; clics?: number; ouvrir: (b: Bloc) => void; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bloc.id });
  const prive = !bloc.public;
  const regles = etiquettes(bloc);
  const programme = bloc.public && !estEnLigne(bloc) && !regles.includes('Compte à rebours');
  const nom = bloc.titre || bloc.url || 'ce bloc';
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} aria-label={[`Modifier ${nom}`, prive && 'privé', programme && 'programmé', ...regles].filter(Boolean).join(', ')} aria-roledescription="bloc déplaçable"
      className="lp-bloc lp-ed-bloc" data-type={bloc.type} data-vedette={bloc.vedette ? bloc.format : undefined} data-glisse={isDragging || undefined} data-prive={prive || programme || undefined}
      style={{ '--i': i, transform: CSS.Transform.toString(transform), transition } as CSSProperties}
      onClickCapture={e => { e.preventDefault(); e.stopPropagation(); ouvrir(bloc); }}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ouvrir(bloc); } else listeners?.onKeyDown?.(e); }}>
      {children}
      {(prive || programme || regles.length > 0) && (
        <span className="lp-ed-puces" aria-hidden="true">
          {prive && <span className="lp-ed-puce"><Icone nom="ui-masque" taille={12} /> Privé</span>}
          {programme && <span className="lp-ed-puce"><Icone nom="ui-horloge" taille={12} /> Programmé</span>}
          {regles.map(r => <span key={r} className="lp-ed-puce">{r}</span>)}
        </span>
      )}
    </div>
  );
}
