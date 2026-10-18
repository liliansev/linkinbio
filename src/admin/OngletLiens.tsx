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
  { type: 'video', nom: 'Vidéo YouTube', aide: 'La vidéo s’affiche dans la page', picto: 'bloc-video' },
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
          <ul className="flex flex-col gap-1.5">
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
      {blocs.length > 1 && <p className="text-center text-[13px] text-white/40">Fais glisser la poignée à gauche pour changer l’ordre.</p>}

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
  const [menu, setMenu] = useState(false);
  const enLigne = estEnLigne(bloc);
  const programme = bloc.public && !enLigne;
  const titre = bloc.titre || (bloc.type === 'lien' ? bloc.url || 'Lien sans titre' : NOM_TYPE[bloc.type]);
  const domaine = bloc.url.replace(/^https?:\/\/(www\.)?/, '').replace(/[/?#].*$/, '');
  // Une ligne lisible d'un coup d'œil : les clics d'abord, puis où mène le lien.
  const sousLigne = !bloc.public ? 'Privé' : bloc.type === 'lien' ? [`${clics} clic${clics > 1 ? 's' : ''}`, domaine].filter(Boolean).join(' · ') : titre === NOM_TYPE[bloc.type] ? TYPES.find(t => t.type === bloc.type)!.aide : NOM_TYPE[bloc.type];
  // Un titre de section se lit comme un intercalaire : pas une carte, une séparation.
  const section = bloc.type === 'titre';
  const agir = (b: Bloc) => { vibrer(); setMenu(false); onModifier(b); };
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative flex items-stretch rounded-2xl transition-[box-shadow,background-color,scale] duration-200 ${section ? 'mt-3 bg-transparent' : 'bg-white/[0.045]'} ${isDragging ? 'z-10 scale-[1.02] bg-[#1a2336] shadow-[0_24px_50px_-16px_rgba(0,0,0,0.75)]' : ''} ${menu ? 'z-10' : ''}`}>
      <button ref={setActivatorNodeRef} type="button" {...attributes} {...listeners} aria-label={`Déplacer ${titre}`}
        className="flex w-9 shrink-0 cursor-grab touch-none items-center justify-center text-white/30 hover:text-white/70 active:cursor-grabbing">
        <Icone nom="ui-poignee" taille={16} />
      </button>
      <button type="button" onClick={() => onOuvrir(bloc)} className={`flex min-w-0 flex-1 items-center gap-3 text-left ${section ? 'py-1.5' : 'py-2.5'}`}>
        {!section && (
          <span className={`grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl text-lg transition-opacity ${bloc.vedette ? 'bg-peche/15 text-peche' : 'bg-white/[0.07] text-white/85'} ${!bloc.public ? 'opacity-45' : ''}`}>
            {bloc.image ? <img src={bloc.image} alt="" className="h-full w-full object-cover" />
              : bloc.icone && ICONES[bloc.icone] ? <Icone nom={bloc.icone} taille={19} />
              : bloc.icone || <Icone nom={TYPES.find(t => t.type === bloc.type)!.picto} taille={19} />}
          </span>
        )}
        <span className={`min-w-0 flex-1 transition-opacity ${!bloc.public ? 'opacity-45' : ''}`}>
          <span className="flex items-center gap-1.5">
            <span className={`truncate ${section ? 'text-[13px] font-medium text-white/55' : 'text-[15px] font-medium text-white'}`}>{titre}</span>
            {bloc.vedette && <span className="shrink-0 text-peche" title="Mis en avant"><Icone nom="ui-etoile" taille={13} /></span>}
          </span>
          {!section && (
            <span className="mt-0.5 flex items-center gap-2 text-[12.5px] text-white/45">
              <span className="truncate">{sousLigne}</span>
              {programme && <span className="flex shrink-0 items-center gap-1 text-amber-200/85"><Icone nom="ui-horloge" taille={13} />Programmé</span>}
              {etiquettes(bloc).map(r => <span key={r} className="shrink-0 text-peche/80">{r}</span>)}
              {!bloc.indexable && bloc.public && <span className="flex shrink-0 items-center" title="Masqué pour Google"><Icone nom="ui-masque" taille={13} /></span>}
            </span>
          )}
        </span>
      </button>
      <div className="flex items-center pr-1">
        <button type="button" aria-pressed={!bloc.public} aria-label={bloc.public ? `Masquer ${titre}` : `Afficher ${titre}`} title={bloc.public ? 'Visible sur ta page' : 'Masqué'}
          onClick={() => agir({ ...bloc, public: !bloc.public })}
          className={`grid h-10 w-10 place-items-center rounded-full transition hover:bg-white/[0.07] ${bloc.public ? 'text-white/55' : 'text-peche'}`}>
          <Icone nom={bloc.public ? 'ui-oeil' : 'ui-oeil-barre'} taille={18} />
        </button>
        <button type="button" aria-label={`Plus d’options pour ${titre}`} aria-expanded={menu} aria-haspopup="menu" onClick={() => setMenu(m => !m)}
          className="grid h-10 w-8 place-items-center rounded-full text-white/55 transition hover:bg-white/[0.07]">
          <Icone nom="ui-actions" taille={18} />
        </button>
      </div>
      {menu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} aria-hidden="true" />
          <div role="menu" className="absolute top-[calc(100%-6px)] right-2 z-20 flex min-w-52 flex-col rounded-2xl bg-[#1d2638] p-1.5 shadow-[0_20px_50px_-14px_rgba(0,0,0,0.85)] ring-1 ring-white/10"
            onKeyDown={e => { if (e.key === 'Escape') setMenu(false); }}>
            <ActionMenu icone="ui-crayon" onClick={() => { setMenu(false); onOuvrir(bloc); }}>Modifier</ActionMenu>
            {!section && <ActionMenu icone="ui-etoile" onClick={() => agir({ ...bloc, vedette: !bloc.vedette })}>{bloc.vedette ? 'Ne plus mettre en avant' : 'Mettre en avant'}</ActionMenu>}
            <ActionMenu icone={bloc.public ? 'ui-oeil-barre' : 'ui-oeil'} onClick={() => agir({ ...bloc, public: !bloc.public })}>{bloc.public ? 'Masquer de ma page' : 'Afficher sur ma page'}</ActionMenu>
          </div>
        </>
      )}
    </li>
  );
}

function ActionMenu({ icone, onClick, children }: { icone: string; onClick: () => void; children: string }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-[14.5px] text-white/90 hover:bg-white/[0.07]">
      <Icone nom={icone} taille={17} className="text-white/55" /> {children}
    </button>
  );
}
