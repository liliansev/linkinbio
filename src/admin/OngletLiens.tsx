import { useState } from 'react';
import type { CSSProperties } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Bloc, TypeBloc } from '../lib/types.ts';
import { TYPES_PRINCIPAL, estEnLigne, nouveauBloc } from '../lib/types.ts';
import { etiquettes } from '../lib/etiquettes.ts';
import { ICONES } from '../lib/icones.ts';
import { Icone } from '../components/Icone.tsx';
import { Feuille, vibrer } from './ui.tsx';

export const TYPES: { type: TypeBloc; nom: string; aide: string; picto: string }[] = [
  { type: 'lien', nom: 'Lien', aide: 'Un bouton vers n’importe quelle adresse', picto: 'bloc-lien' },
  { type: 'titre', nom: 'Titre de section', aide: 'Pour regrouper les liens', picto: 'bloc-titre' },
  { type: 'texte', nom: 'Texte', aide: 'Un court paragraphe', picto: 'bloc-texte' },
  { type: 'video', nom: 'Vidéo YouTube', aide: 'Lue directement dans la page', picto: 'bloc-video' },
  { type: 'derniere-video', nom: 'Ma dernière vidéo', aide: 'Se met à jour toute seule', picto: 'bloc-derniere-video' },
  { type: 'inscription', nom: 'Rejoins ma liste', aide: 'Récolte des e-mails, export, Brevo, Mailchimp', picto: 'bloc-inscription' },
  { type: 'preuve', nom: 'Avis et preuves', aide: 'Ta note Google, un chiffre, un témoignage', picto: 'bloc-preuve' },
  { type: 'newsletter', nom: 'Inscription newsletter', aide: 'Branchée sur Lumail', picto: 'bloc-newsletter' },
];
const NOM_TYPE = Object.fromEntries(TYPES.map(t => [t.type, t.nom])) as Record<TypeBloc, string>;

export function OngletLiens({ blocs, clics, onOrdonner, onModifier, onOuvrir, onAjouter, principal = true }: {
  blocs: Bloc[];
  clics: Record<string, number>;
  onOrdonner: (blocs: Bloc[]) => void;
  onModifier: (bloc: Bloc) => void;
  onOuvrir: (bloc: Bloc) => void;
  onAjouter: (bloc: Bloc) => void;
  /** Les autres comptes n'ont pas les blocs branchés sur la chaîne et la newsletter de Lilian. */
  principal?: boolean;
}) {
  const [choix, setChoix] = useState(false);
  const capteurs = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function deplacer({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    vibrer(10);
    const de = blocs.findIndex(b => b.id === active.id), vers = blocs.findIndex(b => b.id === over.id);
    onOrdonner(arrayMove(blocs, de, vers));
  }
  function ajouter(type: TypeBloc) {
    setChoix(false);
    onAjouter(nouveauBloc(type, `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`));
  }

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={() => setChoix(true)}
        className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-peche text-[16px] font-semibold text-nuit shadow-[0_12px_30px_-14px_rgba(255,179,138,0.7)] transition duration-150 hover:brightness-105 active:scale-[0.98]">
        <Icone nom="ui-plus" taille={20} /> Ajouter un bloc
      </button>

      <DndContext sensors={capteurs} collisionDetection={closestCenter} onDragStart={() => vibrer(6)} onDragEnd={deplacer}>
        <SortableContext items={blocs.map(b => b.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2.5">
            {blocs.map(bloc => <Ligne key={bloc.id} bloc={bloc} clics={clics[bloc.id] ?? 0} onModifier={onModifier} onOuvrir={onOuvrir} />)}
          </ul>
        </SortableContext>
      </DndContext>
      {blocs.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-[20px] bg-white/[0.03] px-6 py-10 text-center">
          <span className="mb-1 grid h-12 w-12 place-items-center rounded-full bg-white/[0.06] text-peche"><Icone nom="lien" taille={22} /></span>
          <p className="text-[16px] font-semibold text-white">Ta page est vide</p>
          <p className="max-w-[30ch] text-[14px] leading-snug text-white/55">Ajoute un lien, un titre ou ta dernière vidéo : tout apparaît aussitôt sur ta page.</p>
        </div>
      )}
      {blocs.length > 1 && <p className="text-center text-[13px] text-white/40">Maintiens la poignée à gauche pour déplacer un bloc.</p>}

      <FeuilleAjout ouverte={choix} onFermer={() => setChoix(false)} onChoisir={ajouter} principal={principal} />
    </div>
  );
}

/** Le choix du type de bloc à ajouter. */
export function FeuilleAjout({ ouverte, onFermer, onChoisir, principal }: { ouverte: boolean; onFermer: () => void; onChoisir: (type: TypeBloc) => void; principal: boolean }) {
  const types = principal ? TYPES : TYPES.filter(t => !TYPES_PRINCIPAL.includes(t.type));
  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Ajouter un bloc">
      {fermer => (
        <>
        <svg width="0" height="0" className="absolute" aria-hidden="true">
          <linearGradient id="hopla-degrade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffe3d1" />
            <stop offset="0.55" stopColor="#ffb38a" />
            <stop offset="1" stopColor="#ff8a5c" />
          </linearGradient>
        </svg>
        <ul className="adm-cascade -mx-2 flex flex-col pb-2">
          {types.map((t, i) => (
            <li key={t.type} style={{ '--i': i } as CSSProperties}>
              <button type="button" onClick={() => fermer(() => onChoisir(t.type))}
                className="group flex w-full items-center gap-3.5 rounded-2xl px-2 py-2.5 text-left transition duration-150 hover:bg-white/[0.05] active:scale-[0.985] active:bg-white/[0.07]">
                {/* Pas de pastille : le picto plein, en dégradé de pêche, se suffit. */}
                <span className="grid h-12 w-10 shrink-0 place-items-center transition duration-150 group-hover:scale-105">
                  <Icone nom={t.picto} taille={30} className="picto-degrade" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold text-white">{t.nom}</span>
                  <span className="block text-[13.5px] leading-snug text-white/55">{t.aide}</span>
                </span>
                <Icone nom="ui-chevron" taille={18} className="-rotate-90 text-white/30" />
              </button>
            </li>
          ))}
        </ul>
        </>
      )}
    </Feuille>
  );
}

function Ligne({ bloc, clics, onModifier, onOuvrir }: { bloc: Bloc; clics: number; onModifier: (b: Bloc) => void; onOuvrir: (b: Bloc) => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: bloc.id });
  const enLigne = estEnLigne(bloc);
  const programme = bloc.public && !enLigne;
  const titre = bloc.titre || (bloc.type === 'lien' ? bloc.url || 'Lien sans titre' : NOM_TYPE[bloc.type]);
  const sousLigne = bloc.type === 'lien' ? bloc.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : NOM_TYPE[bloc.type];
  // Un titre de section se lit comme un intercalaire : pas une carte, une séparation.
  const section = bloc.type === 'titre';
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative flex items-stretch rounded-[20px] border transition-[box-shadow,border-color,scale] duration-200 ${section ? 'mt-2 bg-transparent' : 'bg-[#141c2e]'} ${isDragging ? 'z-10 scale-[1.02] border-peche/60 bg-[#141c2e] shadow-[0_24px_50px_-16px_rgba(0,0,0,0.75)]' : section ? 'border-white/[0.12]' : 'border-white/[0.07]'}`}>
      <button ref={setActivatorNodeRef} type="button" {...attributes} {...listeners} aria-label={`Déplacer ${titre}`}
        className="flex w-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-l-2xl text-white/35 hover:text-white/70 active:cursor-grabbing">
        <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor" aria-hidden="true"><circle cx="4" cy="4" r="1.7" /><circle cx="10" cy="4" r="1.7" /><circle cx="4" cy="10" r="1.7" /><circle cx="10" cy="10" r="1.7" /><circle cx="4" cy="16" r="1.7" /><circle cx="10" cy="16" r="1.7" /></svg>
      </button>
      <button type="button" onClick={() => onOuvrir(bloc)} className={`flex min-w-0 flex-1 items-center gap-3 pr-2 text-left ${section ? 'py-2' : 'py-3'}`}>
        <span className={`grid ${section ? 'h-9 w-9 bg-transparent!' : 'h-11 w-11'} shrink-0 place-items-center overflow-hidden rounded-[13px] text-lg transition-opacity ${bloc.vedette ? 'bg-peche/15 text-peche' : 'bg-white/[0.07] text-white/85'} ${!bloc.public ? 'opacity-45' : ''}`}>
          {bloc.image ? <img src={bloc.image} alt="" className="h-full w-full object-cover" />
            : bloc.icone && ICONES[bloc.icone] ? <Icone nom={bloc.icone} taille={20} />
            : bloc.icone || <Icone nom={TYPES.find(t => t.type === bloc.type)!.picto} taille={20} />}
        </span>
        <span className={`min-w-0 flex-1 transition-opacity ${!bloc.public ? 'opacity-45' : ''}`}>
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold text-white">{titre}</span>
            {bloc.vedette && <span className="shrink-0 text-peche" title="Mis en avant"><Icone nom="etoile" taille={14} className="[&_*]:fill-current" /></span>}
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-[12.5px] text-white/45">
            <span className="truncate">{!bloc.public ? 'Privé' : sousLigne}</span>
            {programme && <span className="flex shrink-0 items-center gap-1 text-amber-200/85"><Icone nom="ui-horloge" taille={13} />Programmé</span>}
            {etiquettes(bloc).map(r => <span key={r} className="shrink-0 text-peche/80">{r}</span>)}
            {!bloc.indexable && bloc.public && <span className="flex shrink-0 items-center" title="Masqué pour Google"><Icone nom="ui-masque" taille={13} /></span>}
          </span>
        </span>
        {bloc.type === 'lien' && <span className="shrink-0 text-right text-[12px] leading-tight text-white/45"><span className="block text-[15px] font-semibold text-white/80">{clics}</span>clics</span>}
      </button>
      <div className="flex items-center pr-3">
        <button type="button" role="switch" aria-checked={bloc.public} aria-label={bloc.public ? `Rendre ${titre} privé` : `Rendre ${titre} public`}
          onClick={() => { vibrer(); onModifier({ ...bloc, public: !bloc.public }); }}
          className={`adm-interrupteur relative h-7 w-[46px] shrink-0 rounded-full ${bloc.public ? 'bg-peche' : 'bg-white/15'}`}>
          <span className={`absolute top-1 left-1 h-5 w-5 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.3)] ${bloc.public ? 'translate-x-[18px] bg-nuit' : 'bg-white'}`} />
        </button>
      </div>
    </li>
  );
}
