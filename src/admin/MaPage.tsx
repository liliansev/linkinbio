import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Bloc, PagePublique, Reglages, TypeBloc } from '../lib/types.ts';
import { TYPES_PRINCIPAL, estEnLigne, nouveauBloc } from '../lib/types.ts';
import { etiquettes } from '../lib/etiquettes.ts';
import type { Destination } from '../lib/demarrage.ts';
import { urlReseau } from '../lib/demarrage.ts';
import { adresseSaisie } from '../lib/valider.ts';
import { PageLiens } from '../components/PageLiens.tsx';
import type { Edition } from '../components/PageLiens.tsx';
import { Icone, NOMS_RESEAUX } from '../components/Icone.tsx';
import { themeDe, variablesTheme } from '../lib/themes.ts';
import { HautLiens } from './BienDemarrer.tsx';
import { FeuilleAjout } from './OngletLiens.tsx';
import { DesignTiroirs, OngletApparence } from './OngletApparence.tsx';
import { BoutonPrincipal, BoutonSecondaire, Feuille, Interrupteur, preparerImage, vibrer } from './ui.tsx';

/*
 * « Ma page » : on édite la page elle-même. Le nom et la bio se tapent en
 * place ; la photo, les réseaux et chaque bloc s'ouvrent d'un toucher ; un
 * bloc maintenu se déplace. Le thème et les boutons s'ouvrent dans une feuille
 * qui laisse voir la page. Une seule façon d'éditer : pas de vue en liste à
 * choisir (Lilian, 18 octobre 2026).
 */

export function MaPage({ compte, reglages, blocs, clics, onReglages, onOrdonner, onOuvrir, onAjouter, envoyerImage, annoncer, demarrage, fermerDemarrage }: {
  compte: PagePublique['compte'];
  reglages: Reglages;
  blocs: Bloc[];
  clics: Record<string, number>;
  onReglages: (r: Reglages) => void;
  onOrdonner: (blocs: Bloc[]) => void;
  onOuvrir: (bloc: Bloc) => void;
  /** `enBas` : ajouté depuis le bas de la page, le bloc se pose en dernier. */
  onAjouter: (bloc: Bloc, enBas?: boolean) => void;
  envoyerImage: (d: string) => Promise<string>;
  /** Un message en bas de l'écran, avec son Annuler. */
  annoncer: (t: { texte: string; annuler?: () => void; genre?: 'ok' | 'info'; long?: boolean }) => void;
  /** « Bien démarrer », ouvert depuis l'anneau de l'en-tête du téléphone. */
  demarrage: boolean;
  fermerDemarrage: () => void;
}) {
  const [feuille, setFeuilleBrute] = useState<'design' | 'reseaux' | 'ajout' | null>(null);
  // Les réglages au moment où la feuille de design ou des réseaux s'ouvre : « Annuler » y revient.
  const depart = useRef<Reglages | null>(null);
  const setFeuille = (f: typeof feuille, annule = false) => {
    // En refermant le design, la page revient en vue : on a pu descendre loin en la regardant changer.
    if (!f && (feuille === 'design' || feuille === 'reseaux')) {
      const avant = depart.current;
      if (annule) annoncer({ texte: 'Changements annulés', genre: 'info' });
      else if (avant && JSON.stringify(avant) !== JSON.stringify(reglages)) {
        // Les réseaux se rangent en partant : un pseudo devient l'adresse du profil, une ligne vide s'en va.
        const propres = feuille === 'reseaux' ? reglages.reseaux.filter(r => r.url.trim()).map(r => ({ ...r, url: urlReseau(r.reseau, r.url) })).filter(r => r.url) : reglages.reseaux;
        if (JSON.stringify(propres) !== JSON.stringify(reglages.reseaux)) onReglages({ ...reglages, reseaux: propres });
        annoncer({ texte: feuille === 'design' ? 'Design mis à jour' : 'Réseaux mis à jour', annuler: () => { onReglages(avant); annoncer({ texte: 'Changements annulés', genre: 'info' }); } });
      }
      const haut = toile.current?.getBoundingClientRect().top ?? 0;
      if (haut < 0) toile.current?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    depart.current = f === 'design' || f === 'reseaux' ? reglages : null; setFeuilleBrute(f);
  };
  const change = depart.current !== null && JSON.stringify(depart.current) !== JSON.stringify(reglages);
  // Le pied de chaque feuille qui s'enregistre seule : Terminé ferme, Annuler (dès qu'il y a un changement) revient au départ.
  const piedAnnuler = (fermer: (apres?: () => void) => void) => (
    <div className="flex items-center gap-2">
      {change && <BoutonSecondaire onClick={() => { const avant = depart.current; fermer(() => { if (avant) onReglages(avant); setFeuille(null, true); }); }}>Annuler</BoutonSecondaire>}
      <BoutonPrincipal className="flex-1" onClick={() => fermer()}>Terminé</BoutonPrincipal>
    </div>
  );
  const [envoi, setEnvoi] = useState(false);
  // Le geste s'explique au-dessus de la page tant que deux blocs n'ont pas été ouverts, puis se tait (compté par compte, pas par appareil).
  const [ouverts, setOuverts] = useState(() => { try { return Number(localStorage.getItem(`hopla-blocs-ouverts:${compte.pseudo}`)) || 0; } catch { return 0; } });
  // Et revient, tant qu'aucun bloc n'a jamais été déplacé, dès que la page en a trois : c'est là que l'ordre compte.
  const [deplace, setDeplace] = useState(() => { try { return !!localStorage.getItem(`hopla-bloc-deplace:${compte.pseudo}`); } catch { return false; } });
  const astuce = ouverts < 2 || (!deplace && blocs.length >= 3);
  const ordonner = (liste: Bloc[]) => { if (!deplace) { setDeplace(true); try { localStorage.setItem(`hopla-bloc-deplace:${compte.pseudo}`, '1'); } catch { /* stockage refusé */ } } onOrdonner(liste); };
  const ouvrirBloc = (bloc: Bloc) => { if (ouverts < 2) { setOuverts(ouverts + 1); try { localStorage.setItem(`hopla-blocs-ouverts:${compte.pseudo}`, String(ouverts + 1)); } catch { /* stockage refusé */ } } onOuvrir(bloc); };
  const fichier = useRef<HTMLInputElement>(null);
  const toile = useRef<HTMLDivElement>(null);
  const principal = compte.principal;
  const visibles = blocs.filter(b => principal || !TYPES_PRINCIPAL.includes(b.type));

  // Les réglages du dernier rendu : une annulation tardive ne défait que son propre champ.
  const derniers = useRef(reglages);
  derniers.current = reglages;
  const profil = (champs: Partial<Reglages['profil']>) => onReglages({ ...reglages, profil: { ...reglages.profil, ...champs } });

  async function photo(f: File | undefined) {
    if (!f) return;
    setEnvoi(true);
    try { profil({ avatar: await envoyerImage(await preparerImage(f, 'carre')) }); } catch { annoncer({ texte: 'La photo n’est pas passée. Essaie une autre image, en JPG ou PNG.', genre: 'info', long: true }); } finally { setEnvoi(false); if (fichier.current) fichier.current.value = ''; }
  }
  /** Le design s'ouvre en laissant voir le haut de la page (sur ordinateur, elle est à gauche de la feuille). */
  function design() {
    if (toile.current) scrollTo({ top: Math.max(0, toile.current.getBoundingClientRect().top + scrollY - 96) });
    setFeuille('design');
  }
  const direct = <ApercuDirect page={{ reglages, blocs: visibles, compte }} />;
  // Le bouton du bas de la page pose le bloc en bas ; celui du haut, en haut.
  const enBas = useRef(false);
  const ajouter = (type: TypeBloc) => { setFeuille(null); onAjouter(nouveauBloc(type, `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`), enBas.current); enBas.current = false; };
  // Au clavier : « A » ouvre Ajouter ; une adresse collée sur la page (hors d'un champ) devient un lien neuf.
  useEffect(() => {
    const libre = (e: Event) => !(e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable], [role="dialog"]') && !document.querySelector('[role="dialog"]');
    const touche = (e: KeyboardEvent) => { if ((e.key === 'a' || e.key === 'A') && !e.metaKey && !e.ctrlKey && !e.altKey && libre(e)) { e.preventDefault(); setFeuilleBrute('ajout'); } };
    const coller = (e: ClipboardEvent) => {
      if (!libre(e)) return;
      const url = adresseSaisie(e.clipboardData?.getData('text') ?? '');
      if (!url) return;
      e.preventDefault();
      onAjouter({ ...nouveauBloc('lien', `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`), url });
    };
    addEventListener('keydown', touche); addEventListener('paste', coller);
    return () => { removeEventListener('keydown', touche); removeEventListener('paste', coller); };
  }, [onAjouter]);
  /** Un réseau rempli qui ne mène nulle part garde la feuille ouverte, sur son champ. */
  const reseauFaux = () => {
    const faux = reglages.reseaux.find(r => r.url.trim() && !urlReseau(r.reseau, r.url));
    // Le champ se montre, son erreur dessous : il n'est pas refocalisé, sans quoi l'erreur se tairait pendant la saisie.
    if (faux) { (document.activeElement as HTMLElement | null)?.blur(); setTimeout(() => document.querySelector<HTMLInputElement>(`[aria-label="${NOMS_RESEAUX[faux.reseau]}"]`)?.scrollIntoView({ block: 'center' }), 40); }
    return !!faux;
  };

  /** Une étape de « Bien démarrer » mène à l'endroit de la page où elle se fait. */
  function aller(d: Destination) {
    vibrer(5);
    if (d === 'lien') return ajouter('lien');
    if (d === 'photo') return fichier.current?.click();
    if (d === 'theme') return design();
    if (d === 'reseaux') return setFeuille('reseaux');
    setTimeout(() => {
      const bio = toile.current?.querySelector<HTMLTextAreaElement>('.lp-bio');
      bio?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      bio?.focus({ preventScroll: true });
    }, 60);
  }

  const edition: Edition = {
    profil,
    photo: () => fichier.current?.click(),
    envoiPhoto: envoi,
    reseaux: () => setFeuille('reseaux'),
    modifie: (champ, avant) => annoncer({ texte: champ === 'nom' ? 'Nom mis à jour' : 'Bio mise à jour', annuler: () => { onReglages({ ...derniers.current, profil: { ...derniers.current.profil, [champ]: avant } }); annoncer({ texte: 'Changements annulés', genre: 'info' }); } }),
    nomVide: () => annoncer({ texte: 'Ton nom ne peut pas rester vide : il revient tel qu’il était.', genre: 'info' }),
    liste: (liste, rendu) => <BlocsEditables blocs={liste} rendu={rendu} clics={clics} onOrdonner={ordonner} onOuvrir={ouvrirBloc}
      onAjouter={() => { vibrer(5); enBas.current = true; setFeuille('ajout'); }} />,
  };

  return (
    <div className="adm-editor-layout">
      {/* Les deux gestes de la page : à droite sur ordinateur ; au téléphone, posés sur la barre des onglets, à portée du pouce, pour que la page commence sous l'en-tête. */}
      <aside className="adm-editor-tools" aria-label="Outils de la page">
        {/* Ajouter prend la place qui reste ; sur un écran étroit, il se dit en un mot plutôt que sur deux lignes. */}
        <div className="grid grid-cols-[1fr_auto] gap-2 whitespace-nowrap lg:grid-cols-1 lg:gap-2.5">
          <BoutonPrincipal onClick={() => { vibrer(5); setFeuille('ajout'); }} aria-keyshortcuts="A" title="Ajouter (A, ou colle une adresse)"><Icone nom="ui-plus" taille={17} className="shrink-0" /><span>Ajouter<span className="max-[359px]:hidden"> un bloc</span></span></BoutonPrincipal>
          <BoutonSecondaire onClick={design}><Icone nom="palette" taille={17} className="shrink-0" />Personnaliser</BoutonSecondaire>
          <button type="button" onClick={() => setFeuille('reseaux')} className="adm-button-outline hidden min-h-11 items-center justify-center gap-2 px-4 text-[13px] font-medium lg:flex"><Icone nom="globe" taille={17} />Réseaux sociaux</button>
        </div>
      </aside>

      <div className="adm-editor-content">

      {/* L'adresse et « Bien démarrer » d'abord, sur ordinateur : ce qui reste à faire se voit sans dérouler toute la page. */}
      <HautLiens compte={compte} reglages={reglages} blocs={blocs} aller={aller} annoncer={annoncer} feuille={demarrage} fermerFeuille={fermerDemarrage} />

      {/* Sur ordinateur, la feuille de design se pose à droite : la page glisse à gauche pour rester visible en entier. */}
      <div>
        <div ref={toile}
          className="adm-apercu adm-toile relative scroll-mt-24 overflow-hidden rounded-[24px] lg:rounded-[28px]">
          <PageLiens page={{ reglages, blocs: visibles, compte }} edition={edition} />
          {/* Le geste s'écrit sur la page même, dans sa couleur, en haut à gauche : pas une ligne de plus au-dessus d'elle. */}
          {astuce && <p className="pointer-events-none absolute top-4 left-4 right-16 text-[13px] font-medium leading-snug lg:left-6" style={{ color: variablesTheme(themeDe(reglages))['--doux'] }}>{visibles.length < 2 ? <><span className="lg:hidden">Touche pour modifier.</span><span className="hidden lg:inline">Clique pour modifier.</span></> : <><span className="lg:hidden">Touche pour modifier, maintiens pour déplacer.</span><span className="hidden lg:inline">Clique pour modifier, fais glisser pour déplacer.</span></>}</p>}
        </div>
      </div>
      </div>

      <input ref={fichier} type="file" accept="image/*" hidden onChange={e => photo(e.target.files?.[0])} />
      <FeuilleAjout ouverte={feuille === 'ajout'} onFermer={() => { enBas.current = false; setFeuille(null); }} onChoisir={ajouter} principal={principal} />
      <Feuille ouverte={feuille === 'reseaux'} onFermer={() => setFeuille(null)} retenir={reseauFaux} titre="Réseaux" cote apercu={direct} pied={piedAnnuler}>
        <OngletApparence reglages={reglages} onChange={onReglages} envoyerImage={envoyerImage} principal={principal} parties={['reseaux']} />
      </Feuille>
      <Feuille ouverte={feuille === 'design'} onFermer={() => setFeuille(null)} titre="Design" cote apercu={direct} pied={piedAnnuler}>
        <DesignTiroirs reglages={reglages} onChange={onReglages} envoyerImage={envoyerImage} principal={principal} vedettes={blocs.filter(b => b.vedette).length}
          pied={principal && <Interrupteur label="Badge vérifié" actif={reglages.profil.badge} onChange={v => profil({ badge: v })} />} />
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
        <div className="overflow-hidden rounded-[22px] ring-1 ring-white/15 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.3)]" style={{ width: l, height: taille.h - 22 }}>
          <div className="adm-apercu" style={{ width: LARGEUR, height: (taille.h - 22) / echelle, transform: `scale(${echelle})`, transformOrigin: '0 0' }}>
            <PageLiens page={page} apercu />
          </div>
        </div>
      )}
      <p className="text-[12px] font-medium text-white/55">Aperçu en direct</p>
    </div>
  );
}

/** Ce que les lecteurs d'écran disent pendant un déplacement, en français. */
const nomDe = (id: string | number) => document.querySelector(`[data-id="${id}"]`)?.getAttribute('aria-label')?.replace(/^Modifier /, '').split(',')[0] ?? 'le bloc';
const ACCESSIBILITE = {
  screenReaderInstructions: { draggable: 'Pour déplacer un bloc, appuie sur Espace, puis sur les flèches haut et bas. Espace de nouveau pour le poser, Échap pour annuler.' },
  announcements: {
    onDragStart: ({ active }: { active: { id: string | number } }) => `${nomDe(active.id)} pris.`,
    onDragOver: ({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) => (over ? `${nomDe(active.id)} au niveau de ${nomDe(over.id)}.` : `${nomDe(active.id)} hors de la liste.`),
    onDragEnd: ({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) => (over ? `${nomDe(active.id)} posé.` : `${nomDe(active.id)} reposé à sa place.`),
    onDragCancel: ({ active }: { active: { id: string | number } }) => `Déplacement annulé, ${nomDe(active.id)} reste à sa place.`,
  },
};

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
      <DndContext accessibility={ACCESSIBILITE} sensors={capteurs} collisionDetection={closestCenter} onDragStart={() => vibrer(6)} onDragEnd={deplacer} onDragCancel={() => { glisse.current = Date.now(); }}>
        <SortableContext items={blocs.map(b => b.id)} strategy={verticalListSortingStrategy}>
          {blocs.map((bloc, i) => <BlocEditable key={bloc.id} bloc={bloc} i={i} clics={clics[bloc.id]} ouvrir={ouvrir}>{rendu(bloc)}</BlocEditable>)}
        </SortableContext>
      </DndContext>
      {/* Sous le dernier bloc, à portée du pouce : le même geste que le bouton Ajouter du haut. */}
      <button type="button" onClick={onAjouter} className="lp-ed-zone lp-ed-ajout"><Icone nom="ui-plus" taille={18} /> Ajouter à ma page</button>
    </>
  );
}

function BlocEditable({ bloc, i, clics, ouvrir, children }: { bloc: Bloc; i: number; clics?: number; ouvrir: (b: Bloc) => void; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bloc.id });
  const prive = !bloc.public;
  const regles = etiquettes(bloc);
  const programme = bloc.public && !estEnLigne(bloc) && !regles.includes('Compte à rebours');
  const puces = [
    { oui: !programme && !!(bloc.creneau || (bloc.compteARebours && bloc.debut)), icone: 'horloge', nom: 'Quand l’afficher' },
    { oui: !!(bloc.cache?.length || bloc.audience?.sources.length), icone: 'cible', nom: 'Afficher sur' },
    { oui: !!bloc.acces, icone: 'cadenas', nom: 'Accès réservé' },
    { oui: Object.keys(bloc.traductions ?? {}).length > 0, icone: 'globe', nom: 'Traduit' },
  ].filter(p => p.oui);
  const nom = bloc.titre || bloc.url || 'ce bloc';
  // Le bloc entier est un seul bouton : ses liens et champs intérieurs sortent de l'ordre de tabulation.
  const noeud = useRef<HTMLDivElement | null>(null);
  // Un contenu qui arrive après coup (la dernière vidéo, chargée à part) devient inerte lui aussi.
  useEffect(() => {
    const n = noeud.current;
    if (!n) return;
    const figer = () => n.querySelectorAll(':scope > :not(.lp-ed-puces):not([inert])').forEach(x => x.setAttribute('inert', ''));
    figer();
    const veille = new MutationObserver(figer);
    veille.observe(n, { childList: true });
    return () => veille.disconnect();
  });
  return (
    <div ref={n => { setNodeRef(n); noeud.current = n; }} {...attributes} {...listeners} aria-label={[`Modifier ${nom}`, prive && 'masqué', programme && 'programmé', ...regles].filter(Boolean).join(', ')} aria-roledescription="bloc déplaçable"
      className="lp-bloc lp-ed-bloc" data-id={bloc.id} data-type={bloc.type} data-vedette={bloc.vedette ? bloc.format : undefined} data-glisse={isDragging || undefined} data-prive={prive || programme || undefined}
      style={{ '--i': i, transform: CSS.Transform.toString(transform), transition } as CSSProperties}
      onClickCapture={e => { e.preventDefault(); e.stopPropagation(); ouvrir(bloc); }}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ouvrir(bloc); } else listeners?.onKeyDown?.(e); }}>
      {children}
      {(prive || programme || puces.length > 0) && (
        <span className="lp-ed-puces" aria-hidden="true">
          {/* Un picto par état, sans étiquette : le nom complet est dans l'aria-label du bloc. */}
          {prive && <span className="lp-ed-puce" title="Masqué"><Icone nom="masque" taille={13} /></span>}
          {programme && <span className="lp-ed-puce" title="Programmé"><Icone nom="horloge" taille={13} /></span>}
          {/* Chaque règle porte le picto de sa ligne dans l'éditeur : on la reconnaît sans l'ouvrir. */}
          {puces.map(p => <span key={p.icone} className="lp-ed-puce" title={p.nom}><Icone nom={p.icone} taille={13} /></span>)}
        </span>
      )}
    </div>
  );
}
