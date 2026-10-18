import { useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Bloc, PagePublique, Reglages, TypeBloc } from '../lib/types.ts';
import { TYPES_PRINCIPAL, estEnLigne, nouveauBloc } from '../lib/types.ts';
import type { Destination } from '../lib/demarrage.ts';
import { PageLiens } from '../components/PageLiens.tsx';
import type { Edition } from '../components/PageLiens.tsx';
import { Icone } from '../components/Icone.tsx';
import { HautLiens } from './BienDemarrer.tsx';
import { FeuilleAjout, OngletLiens } from './OngletLiens.tsx';
import { OngletApparence } from './OngletApparence.tsx';
import { Feuille, Interrupteur, Segments, preparerImage, vibrer } from './ui.tsx';

/*
 * « Ma page » : on édite la page elle-même. Le nom et la bio se tapent en
 * place ; la photo, les réseaux et chaque bloc s'ouvrent d'un toucher ; un
 * bloc maintenu se déplace. Le thème et les boutons s'ouvrent dans une feuille
 * qui laisse voir la page. La liste d'avant reste à un toucher, pour ceux qui
 * veulent leurs clics et leurs interrupteurs en colonne.
 */

type Vue = 'page' | 'liste';
const CLE_VUE = 'hopla-vue-ma-page';
const lireVue = (): Vue => { try { return localStorage.getItem(CLE_VUE) === 'liste' ? 'liste' : 'page'; } catch { return 'page'; } };

export function MaPage({ compte, reglages, blocs, clics, onReglages, onOrdonner, onModifier, onOuvrir, onAjouter, envoyerImage }: {
  compte: PagePublique['compte'];
  reglages: Reglages;
  blocs: Bloc[];
  clics: Record<string, number>;
  onReglages: (r: Reglages) => void;
  onOrdonner: (blocs: Bloc[]) => void;
  onModifier: (bloc: Bloc) => void;
  onOuvrir: (bloc: Bloc) => void;
  onAjouter: (bloc: Bloc) => void;
  envoyerImage: (d: string) => Promise<string>;
}) {
  const [vue, setVue] = useState<Vue>(lireVue);
  const [feuille, setFeuille] = useState<'design' | 'reseaux' | 'ajout' | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [saisie, setSaisie] = useState(false);
  const fichier = useRef<HTMLInputElement>(null);
  const toile = useRef<HTMLDivElement>(null);
  const principal = compte.principal;
  const visibles = blocs.filter(b => principal || !TYPES_PRINCIPAL.includes(b.type));

  function changerVue(v: Vue) {
    setVue(v);
    try { localStorage.setItem(CLE_VUE, v); } catch { /* le choix vaut pour cette visite */ }
  }
  const profil = (champs: Partial<Reglages['profil']>) => onReglages({ ...reglages, profil: { ...reglages.profil, ...champs } });

  async function photo(f: File | undefined) {
    if (!f) return;
    setEnvoi(true);
    try { profil({ avatar: await envoyerImage(await preparerImage(f, 'carre')) }); } finally { setEnvoi(false); if (fichier.current) fichier.current.value = ''; }
  }
  /** Le design s'ouvre en laissant voir le haut de la page : le nom, les premiers boutons, l'accent. */
  function design() {
    const nom = toile.current?.querySelector('.lp-nom');
    if (nom) scrollTo({ top: nom.getBoundingClientRect().top + scrollY - 80 });
    setFeuille('design');
  }
  const ajouter = (type: TypeBloc) => { setFeuille(null); onAjouter(nouveauBloc(type, `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`)); };

  /** Une étape de « Bien démarrer » mène à l'endroit de la page où elle se fait. */
  function aller(d: Destination) {
    vibrer(5);
    if (d === 'lien') return ajouter('lien');
    if (d === 'photo') return fichier.current?.click();
    if (d === 'theme') return design();
    if (d === 'reseaux') return setFeuille('reseaux');
    changerVue('page');
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
    liste: (liste, rendu) => <BlocsEditables blocs={liste} rendu={rendu} clics={clics} onOrdonner={onOrdonner} onOuvrir={onOuvrir} onAjouter={() => setFeuille('ajout')} />,
  };

  const bascule = vue === 'page' ? 'liste' : 'page';
  return (
    <div className="flex flex-col gap-4">
      {/* Sur téléphone, la page vient d'abord, bord à bord ; l'adresse et « Bien démarrer » passent dessous. */}
      <div className="order-2 lg:order-none"><HautLiens compte={compte} reglages={reglages} blocs={blocs} aller={aller} /></div>

      <div className="hidden items-center gap-3 lg:flex">
        <div className="flex-1"><Segments label="Affichage" valeur={vue} options={[{ id: 'page', nom: 'Sur la page' }, { id: 'liste', nom: 'En liste' }]} onChange={changerVue} /></div>
        <button type="button" onClick={design} className="flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-white/[0.08] px-4 text-[14.5px] font-medium text-white transition hover:bg-white/[0.13] active:scale-95">
          <Icone nom="palette" taille={18} /> Design
        </button>
      </div>

      <div className="order-1 lg:order-none">
        {vue === 'page' ? (
          <>
            <div ref={toile} onFocus={e => setSaisie(e.target.matches('input, textarea'))} onBlur={() => setSaisie(false)}
              className="adm-apercu adm-toile -mx-4 overflow-hidden lg:mx-0 lg:rounded-[30px] lg:ring-1 lg:ring-white/10 lg:shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
              <PageLiens page={{ reglages, blocs: visibles, compte }} edition={edition} />
            </div>
            <p className="mt-3 text-center text-[13px] leading-snug text-white/45">Touche un élément pour le modifier. Maintiens un bloc pour le déplacer.</p>
          </>
        ) : (
          <div className="pt-5 lg:pt-0">
            <OngletLiens blocs={blocs} clics={clics} onOrdonner={onOrdonner} onModifier={onModifier} onOuvrir={onOuvrir} onAjouter={onAjouter} principal={principal} />
          </div>
        )}
      </div>

      {/* Les gestes de la page, sous le pouce, au-dessus de la barre d'onglets. Ils s'effacent pendant la frappe. */}
      {!saisie && (
        <div className="adm-dock fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 flex justify-center px-4 lg:hidden">
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[#141c2e]/92 p-1.5 shadow-[0_18px_40px_-14px_rgba(0,0,0,0.8)] backdrop-blur-xl">
            <button type="button" onClick={() => { vibrer(5); setFeuille('ajout'); }} className="flex min-h-11 items-center gap-1.5 rounded-full bg-peche px-4 text-[14.5px] font-semibold text-nuit active:scale-95">
              <Icone nom="ui-plus" taille={18} /> Ajouter
            </button>
            <button type="button" onClick={design} className="flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[14.5px] font-medium text-white active:scale-95 active:bg-white/10">
              <Icone nom="palette" taille={18} /> Design
            </button>
            <button type="button" onClick={() => { vibrer(5); changerVue(bascule); }} className="flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[14.5px] font-medium text-white/80 active:scale-95 active:bg-white/10">
              {bascule === 'liste' ? 'Liste' : 'Page'}
            </button>
          </div>
        </div>
      )}

      <input ref={fichier} type="file" accept="image/*" hidden onChange={e => photo(e.target.files?.[0])} />
      <FeuilleAjout ouverte={feuille === 'ajout'} onFermer={() => setFeuille(null)} onChoisir={ajouter} principal={principal} />
      <Feuille ouverte={feuille === 'reseaux'} onFermer={() => setFeuille(null)} titre="Réseaux" cote>
        <OngletApparence reglages={reglages} onChange={onReglages} envoyerImage={envoyerImage} principal={principal} parties={['reseaux']} />
      </Feuille>
      <Feuille ouverte={feuille === 'design'} onFermer={() => setFeuille(null)} titre="Design" cote>
        <div className="flex flex-col gap-4">
          <OngletApparence reglages={reglages} onChange={onReglages} envoyerImage={envoyerImage} principal={principal} parties={['theme', 'boutons', 'animation', 'bureau']} />
          {principal && <Interrupteur label="Badge vérifié" aide="La petite coche à côté de ton nom." actif={reglages.profil.badge} onChange={v => profil({ badge: v })} />}
        </div>
      </Feuille>
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
  const programme = bloc.public && !estEnLigne(bloc);
  const nom = bloc.titre || bloc.url || 'ce bloc';
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} aria-label={`Modifier ${nom}`} aria-roledescription="bloc déplaçable"
      className="lp-bloc lp-ed-bloc" data-type={bloc.type} data-vedette={bloc.vedette ? bloc.format : undefined} data-glisse={isDragging || undefined} data-prive={prive || programme || undefined}
      style={{ '--i': i, transform: CSS.Transform.toString(transform), transition } as CSSProperties}
      onClickCapture={e => { e.preventDefault(); e.stopPropagation(); ouvrir(bloc); }}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ouvrir(bloc); } else listeners?.onKeyDown?.(e); }}>
      {children}
      {(prive || programme || (bloc.type === 'lien' && clics !== undefined)) && (
        <span className="lp-ed-puces" aria-hidden="true">
          {prive && <span className="lp-ed-puce"><Icone nom="ui-masque" taille={12} /> Privé</span>}
          {programme && <span className="lp-ed-puce"><Icone nom="ui-horloge" taille={12} /> Programmé</span>}
          {bloc.type === 'lien' && clics !== undefined && <span className="lp-ed-puce">{clics} clics</span>}
        </span>
      )}
    </div>
  );
}
