import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as EvenementPointeur, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Bloc, PagePublique, Reglages, TypeBloc } from '../lib/types.ts';
import { SANS_COULEURS, TYPES_PRINCIPAL, estEnLigne, nouveauBloc } from '../lib/types.ts';
import { etiquettes } from '../lib/etiquettes.ts';
import { selonDroits } from '../lib/droits.ts';
import type { Destination } from '../lib/demarrage.ts';
import { urlReseau } from '../lib/demarrage.ts';
import { adresseSaisie } from '../lib/valider.ts';
import { PageLiens } from '../components/PageLiens.tsx';
import type { Edition } from '../components/PageLiens.tsx';
import { Icone, NOMS_RESEAUX } from '../components/Icone.tsx';
import { themeDe, variablesTheme } from '../lib/themes.ts';
import { HautLiens } from './BienDemarrer.tsx';
import type { Demarrage } from './BienDemarrer.tsx';
import { FeuilleAjout } from './OngletLiens.tsx';
import { DesignTiroirs, OngletApparence } from './OngletApparence.tsx';
import type { Tiroir } from './OngletApparence.tsx';
import { ActionEntete, BoutonPrincipal, BoutonSecondaire, Feuille, Interrupteur, Menu, Panneau, choisirFichier, flechesRadio, preparerImage, vibrer } from './ui.tsx';
import type { ElementMenu } from './ui.tsx';
import { offreDe, useDroits, usePermis } from './offre.tsx';
import type { Fonction } from '../lib/abonnement.ts';

/*
 * « Ma page » : on édite la page elle-même. Le nom et la bio se tapent en
 * place ; la photo, les réseaux et chaque bloc s'ouvrent d'un toucher ; un
 * bloc maintenu se déplace. Une seule façon d'éditer : pas de vue en liste à
 * choisir (Lilian, 18 octobre 2026).
 *
 * Au bureau (direction B, 20 octobre 2026), la page est au centre du canevas,
 * à la vraie largeur d'un téléphone. Un clic sur un bloc le choisit : ses
 * réglages s'ouvrent dans un panneau à droite, non modal, qui s'enregistre
 * tout seul ; le design s'ouvre au même endroit. Au survol, chaque bloc montre
 * sa poignée à gauche, son œil et ses gestes à droite, hors de la page. Au
 * téléphone, les réglages s'ouvrent dans une feuille du bas qui laisse voir la
 * page au-dessus.
 */

type Cote = 'design' | 'reseaux';

/** Ce que la page sait du travail en cours, pour chaque bloc : celui qui est choisi, celui que la souris longe, où poser les gestes. */
interface Toile {
  calque: HTMLElement | null;
  choisi: string | null;
  survole: string | null;
  basculer: (b: Bloc) => void;
  dupliquer: (b: Bloc) => void;
  supprimer: (b: Bloc) => void;
}
const ContexteToile = createContext<Toile | null>(null);

export function MaPage({ compte, reglages, blocs, clics, visiteurs, grand, choisi, panneau, onReglages, onOrdonner, onOuvrir, onAjouter, liberer, fermerEdition, gestes, envoyerImage, annoncer, demarrage, demarrageOuvert, fermerDemarrage, demandeDesign, designOuvert }: {
  compte: PagePublique['compte'];
  reglages: Reglages;
  /** Les blocs tels qu'on les voit : celui qu'on règle se redessine à chaque frappe. */
  blocs: Bloc[];
  clics: Record<string, number>;
  /** La page telle que les visiteurs la voient, pour l'aperçu sur ordinateur. */
  visiteurs: PagePublique;
  /** La mise en page du bureau : la page au centre, les réglages dans un panneau à droite. */
  grand: boolean;
  /** Le bloc ouvert dans l'éditeur, cerclé sur la page. */
  choisi: string | null;
  /** L'éditeur du bloc ouvert, au bureau : il occupe le panneau de droite. */
  panneau: ReactNode;
  onReglages: (r: Reglages) => void;
  onOrdonner: (blocs: Bloc[]) => void;
  onOuvrir: (bloc: Bloc) => void;
  /** `enBas` : ajouté depuis le bas de la page, le bloc se pose en dernier. */
  onAjouter: (bloc: Bloc, enBas?: boolean) => void;
  /** Avant un autre geste : ce qui est tapé dans l'éditeur s'écrit. Faux si un champ faux le retient. */
  liberer: () => boolean;
  /** Ferme l'éditeur du bloc (le design prend sa place, un clic à côté de la page). Faux s'il est retenu. */
  fermerEdition: () => boolean;
  /** Les gestes posés à côté d'un bloc, au survol. */
  gestes: { basculer: (b: Bloc) => void; dupliquer: (b: Bloc) => void; supprimer: (b: Bloc) => void };
  envoyerImage: (d: string) => Promise<string>;
  /** Un message en bas de l'écran, avec son Annuler. */
  annoncer: (t: { texte: string; annuler?: () => void; genre?: 'ok' | 'info'; long?: boolean }) => void;
  demarrage: Demarrage;
  /** « Bien démarrer », ouvert depuis l'anneau de l'en-tête du téléphone. */
  demarrageOuvert: boolean;
  fermerDemarrage: () => void;
  /** Ouvre le design sur un tiroir (« Essayer tes couleurs », après l'achat) ; `designOuvert` dit que c'est fait. */
  demandeDesign?: Tiroir | null;
  designOuvert?: () => void;
}) {
  // Le design ou les réseaux : dans le panneau de droite au bureau, dans une feuille au téléphone.
  const [cote, setCote] = useState<Cote | null>(null);
  // Le tiroir du design ouvert d'emblée (les couleurs, juste après les avoir prises), le temps d'une ouverture ;
  // la clé remonte le design s'il était déjà ouvert sur un autre tiroir.
  const [tiroirDepart, setTiroirDepart] = useState<Tiroir | undefined>();
  const [cleDesign, setCleDesign] = useState(0);
  const [ajout, setAjout] = useState(false);
  // La page à la largeur d'un téléphone, qu'on modifie, ou sur un ordinateur, en aperçu.
  const [largeur, setLargeur] = useState<'telephone' | 'ordinateur'>('telephone');
  // Les réglages au moment où le design ou les réseaux s'ouvrent : « Annuler » y revient.
  const depart = useRef<Reglages | null>(null);
  const change = depart.current !== null && JSON.stringify(depart.current) !== JSON.stringify(reglages);
  const [envoi, setEnvoi] = useState(false);
  // Le geste s'explique sur la page tant que deux blocs n'ont pas été ouverts, puis se tait (compté par compte, pas par appareil).
  const [ouverts, setOuverts] = useState(() => { try { return Number(localStorage.getItem(`hopla-blocs-ouverts:${compte.pseudo}`)) || 0; } catch { return 0; } });
  // Et revient, tant qu'aucun bloc n'a jamais été déplacé, dès que la page en a trois : c'est là que l'ordre compte.
  const [deplace, setDeplace] = useState(() => { try { return !!localStorage.getItem(`hopla-bloc-deplace:${compte.pseudo}`); } catch { return false; } });
  const astuce = ouverts < 2 || (!deplace && blocs.length >= 3);
  const fichier = useRef<HTMLInputElement>(null);
  const toile = useRef<HTMLDivElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  const [calque, setCalque] = useState<HTMLDivElement | null>(null);
  const [survole, setSurvole] = useState<string | null>(null);
  const principal = compte.principal;
  const visibles = blocs.filter(b => principal || !TYPES_PRINCIPAL.includes(b.type));
  // La page se dessine comme les visiteurs la verront : sans Starter, aux couleurs de son thème. Les réglages, eux, gardent tout.
  const droits = useDroits();
  const montree = droits.couleurs ? reglages : { ...reglages, couleurs: SANS_COULEURS };

  // Les réglages du dernier rendu : une annulation tardive ne défait que son propre champ.
  const derniers = useRef(reglages);
  derniers.current = reglages;
  const profil = (champs: Partial<Reglages['profil']>) => onReglages({ ...reglages, profil: { ...reglages.profil, ...champs } });

  /** Un réseau rempli qui ne mène nulle part garde le design ou la feuille ouverts, sur son champ. */
  const reseauFaux = () => {
    const faux = reglages.reseaux.find(r => r.url.trim() && !urlReseau(r.reseau, r.url));
    // Le champ se montre, son erreur dessous : il n'est pas refocalisé, sans quoi l'erreur se tairait pendant la saisie.
    if (faux) { (document.activeElement as HTMLElement | null)?.blur(); setTimeout(() => document.querySelector<HTMLInputElement>(`[aria-label="${NOMS_RESEAUX[faux.reseau]}"]`)?.scrollIntoView({ block: 'center' }), 40); }
    return !!faux;
  };

  /** Le design ou les réseaux se referment : ce qui a changé se dit, avec son Annuler. */
  function fermerCote(annule = false) {
    const avant = depart.current;
    if (annule) annoncer({ texte: 'Changements annulés', genre: 'info' });
    else if (avant && JSON.stringify(avant) !== JSON.stringify(reglages)) {
      // Les réseaux se rangent en partant : un pseudo devient l'adresse du profil, une ligne vide s'en va.
      const propres = cote === 'reseaux' ? reglages.reseaux.filter(r => r.url.trim()).map(r => ({ ...r, url: urlReseau(r.reseau, r.url) })).filter(r => r.url) : reglages.reseaux;
      if (JSON.stringify(propres) !== JSON.stringify(reglages.reseaux)) onReglages({ ...reglages, reseaux: propres });
      annoncer({ texte: cote === 'design' ? 'Design mis à jour' : 'Réseaux mis à jour', annuler: () => { onReglages(avant); annoncer({ texte: 'Changements annulés', genre: 'info' }); } });
    }
    // Au téléphone, la page revient en vue : on a pu descendre loin en la regardant changer.
    if (!grand && (toile.current?.getBoundingClientRect().top ?? 0) < 0) toile.current?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    depart.current = null;
    setTiroirDepart(undefined);
    setCote(null);
  }
  /** Avant de passer à autre chose : le design se ferme, les réseaux aussi s'ils mènent quelque part. */
  const quitterCote = () => {
    if (!cote) return true;
    if (cote === 'reseaux' && reseauFaux()) return false;
    fermerCote();
    return true;
  };
  function ouvrirCote(c: Cote) {
    if (cote === c) return;
    if (!quitterCote() || !fermerEdition()) return;
    depart.current = reglages;
    setCote(c);
    // Au téléphone, le design s'ouvre en laissant voir le haut de la page, au-dessus de la feuille.
    if (!grand && c === 'design' && toile.current) scrollTo({ top: Math.max(0, toile.current.getBoundingClientRect().top + scrollY - 96) });
  }
  // Une demande venue d'ailleurs (après l'achat des couleurs) : le design s'ouvre sur le bon tiroir, une fois.
  useEffect(() => {
    if (!demandeDesign) return;
    setTiroirDepart(demandeDesign);
    setCleDesign(k => k + 1);
    if (cote !== 'design') ouvrirCote('design');
    designOuvert?.();
  }, [demandeDesign]); // eslint-disable-line react-hooks/exhaustive-deps

  async function photo(f: File | undefined) {
    if (!f) return;
    setEnvoi(true);
    try { profil({ avatar: await envoyerImage(await preparerImage(f, 'carre')) }); } catch { annoncer({ texte: 'La photo n’est pas passée. Essaie une autre image, en JPG ou PNG.', genre: 'info', long: true }); } finally { setEnvoi(false); if (fichier.current) fichier.current.value = ''; }
  }
  // L'aperçu du design au téléphone montre la page des visiteurs : sans l'offre, ni drop, ni liste, ni avis, ni compte à rebours.
  const direct = <ApercuDirect page={{ ...selonDroits(reglages, visibles, droits), compte }} />;

  // Le bouton du bas de la page pose le bloc en bas ; celui du haut, en haut.
  const enBas = useRef(false);
  /** Ajouter : ce qui est tapé dans l'éditeur s'écrit d'abord, puis le choix du bloc s'ouvre. */
  function ouvrirAjout(bas = false) {
    if (!liberer() || (cote === 'reseaux' && reseauFaux())) return;
    vibrer(5);
    enBas.current = bas;
    setAjout(true);
  }
  const ajouter = (type: TypeBloc) => {
    setAjout(false);
    if (!quitterCote()) return;
    onAjouter(nouveauBloc(type, `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`), enBas.current);
    enBas.current = false;
  };
  const ordonner = (liste: Bloc[]) => { if (!deplace) { setDeplace(true); try { localStorage.setItem(`hopla-bloc-deplace:${compte.pseudo}`, '1'); } catch { /* stockage refusé */ } } onOrdonner(liste); };
  const ouvrirBloc = (bloc: Bloc) => {
    if (!quitterCote()) return;
    if (ouverts < 2) { setOuverts(ouverts + 1); try { localStorage.setItem(`hopla-blocs-ouverts:${compte.pseudo}`, String(ouverts + 1)); } catch { /* stockage refusé */ } }
    onOuvrir(bloc);
  };

  // Au clavier : « A » ouvre Ajouter ; une adresse collée sur la page (hors d'un champ) devient un lien neuf.
  const raccourcis = useRef({ ouvrirAjout, quitterCote, onAjouter });
  raccourcis.current = { ouvrirAjout, quitterCote, onAjouter };
  useEffect(() => {
    const libre = (e: Event) => !(e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable], [role="dialog"]') && !document.querySelector('[role="dialog"]');
    const touche = (e: KeyboardEvent) => { if ((e.key === 'a' || e.key === 'A') && !e.metaKey && !e.ctrlKey && !e.altKey && libre(e)) { e.preventDefault(); raccourcis.current.ouvrirAjout(); } };
    const coller = (e: ClipboardEvent) => {
      if (!libre(e)) return;
      const url = adresseSaisie(e.clipboardData?.getData('text') ?? '');
      if (!url) return;
      e.preventDefault();
      if (!raccourcis.current.quitterCote()) return;
      raccourcis.current.onAjouter({ ...nouveauBloc('lien', `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`), url });
    };
    addEventListener('keydown', touche); addEventListener('paste', coller);
    return () => { removeEventListener('keydown', touche); removeEventListener('paste', coller); };
  }, []);

  /** Une étape de « Bien démarrer » mène à l'endroit de la page où elle se fait. */
  function aller(d: Destination) {
    vibrer(5);
    if (d === 'lien') return ajouter('lien');
    if (d === 'photo') return choisirFichier(fichier.current, toile.current?.querySelector('.lp-ed-photo'));
    if (d === 'theme') return ouvrirCote('design');
    if (d === 'reseaux') return ouvrirCote('reseaux');
    setTimeout(() => {
      const bio = toile.current?.querySelector<HTMLTextAreaElement>('.lp-bio');
      bio?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      bio?.focus({ preventScroll: true });
    }, 60);
  }

  // Au survol, la rangée du bloc que la souris longe, d'un bord à l'autre du canevas : ses gestes, posés hors de la page, restent à portée.
  const image = useRef(0);
  // La hauteur de la souris, gardée : la page qui défile sous elle change le bloc longé sans qu'elle bouge.
  const hauteur = useRef<number | null>(null);
  function relire() {
    cancelAnimationFrame(image.current);
    image.current = requestAnimationFrame(() => {
      const y = hauteur.current;
      let id: string | null = null;
      if (y !== null) for (const el of zone.current?.querySelectorAll<HTMLElement>('.lp-ed-bloc') ?? []) {
        const r = el.getBoundingClientRect();
        if (y >= r.top - 8 && y <= r.bottom + 8) { id = el.dataset.id ?? null; break; }
      }
      setSurvole(id);
    });
  }
  function suivreSurvol(e: EvenementPointeur) {
    if (!grand || e.pointerType !== 'mouse') return;
    hauteur.current = e.clientY;
    relire();
  }
  function quitterSurvol() { hauteur.current = null; relire(); }
  useEffect(() => {
    const defile = () => { if (hauteur.current !== null) relire(); };
    addEventListener('scroll', defile, { passive: true });
    return () => { removeEventListener('scroll', defile); cancelAnimationFrame(image.current); };
  }, []);

  // Un clic à côté de la page referme ce qui est ouvert à droite, comme dans un outil de dessin.
  const pointeVide = useRef(false);
  const vide = (t: EventTarget) => t instanceof HTMLElement && t.hasAttribute('data-vide');

  const edition: Edition = {
    profil,
    photo: source => choisirFichier(fichier.current, source),
    envoiPhoto: envoi,
    reseaux: () => ouvrirCote('reseaux'),
    modifie: (champ, avant) => annoncer({ texte: champ === 'nom' ? 'Nom mis à jour' : 'Bio mise à jour', annuler: () => { onReglages({ ...derniers.current, profil: { ...derniers.current.profil, [champ]: avant } }); annoncer({ texte: 'Changements annulés', genre: 'info' }); } }),
    nomVide: () => annoncer({ texte: 'Ton nom ne peut pas rester vide : il revient tel qu’il était.', genre: 'info' }),
    liste: (liste, rendu) => <BlocsEditables blocs={liste} rendu={rendu} clics={clics} onOrdonner={ordonner} onOuvrir={ouvrirBloc} onAjouter={() => ouvrirAjout(true)} />,
  };
  const contexte: Toile = {
    calque: grand ? calque : null, choisi, survole,
    basculer: gestes.basculer,
    dupliquer: b => { if (quitterCote()) gestes.dupliquer(b); },
    supprimer: gestes.supprimer,
  };

  // Le design et les réseaux, au bureau : dans le panneau de droite, à la place des réglages d'un bloc.
  const menuCote: ElementMenu[] = change ? [{ nom: 'Annuler mes changements', icone: 'ui-retour', action: () => { if (depart.current) onReglages(depart.current); annoncer({ texte: 'Changements annulés', genre: 'info' }); } }] : [];
  const badge = principal && <Interrupteur label="Badge vérifié" actif={reglages.profil.badge} onChange={v => profil({ badge: v })} />;
  const contenuCote = cote === 'design'
    ? <DesignTiroirs key={cleDesign} reglages={reglages} onChange={onReglages} envoyerImage={envoyerImage} principal={principal} vedettes={blocs.filter(b => b.vedette).length} pied={badge} initial={tiroirDepart} />
    : cote === 'reseaux' && <OngletApparence reglages={reglages} onChange={onReglages} envoyerImage={envoyerImage} principal={principal} parties={['reseaux']} />;
  const aDroite = grand && (panneau || (cote && (
    <Panneau key={cote} titre={cote === 'design' ? 'Design' : 'Réseaux'} onFermer={quitterCote} menu={menuCote}>
      <div className="pt-1">{contenuCote}</div>
    </Panneau>
  )));
  // Le pied des feuilles du téléphone, qui s'enregistrent seules : Terminé ferme, Annuler (dès qu'il y a un changement) revient au départ.
  const piedAnnuler = (fermer: (apres?: () => void) => void) => (
    <div className="flex items-center gap-2">
      {change && <BoutonSecondaire onClick={() => { const avant = depart.current; fermer(() => { if (avant) onReglages(avant); fermerCote(true); }); }}>Annuler</BoutonSecondaire>}
      <BoutonPrincipal className="flex-1" onClick={() => fermer()}>Terminé</BoutonPrincipal>
    </div>
  );

  return (
    <div className="adm-studio" data-cote={aDroite ? '' : undefined}>
      {/* Au bureau, le geste principal est à droite de l'en-tête, comme celui de chaque onglet. */}
      <ActionEntete>
        <BoutonPrincipal onClick={() => ouvrirAjout()} aria-keyshortcuts="A" title="Ajouter (A, ou colle une adresse)"><Icone nom="ui-plus" taille={14} className="shrink-0" />Ajouter un bloc</BoutonPrincipal>
      </ActionEntete>

      <div className="adm-canevas" data-vide=""
        onPointerDown={e => { pointeVide.current = vide(e.target); }}
        onClick={e => { if (!grand || !pointeVide.current || !vide(e.target)) return; pointeVide.current = false; if (cote) quitterCote(); else if (choisi) fermerEdition(); }}>
        {/* Au bureau, une barre posée au-dessus de la page : le design, et la largeur à laquelle on la regarde. */}
        <div className="adm-outils-page" role="toolbar" aria-label="Outils de la page">
          <button type="button" onClick={() => (cote === 'design' ? quitterCote() : ouvrirCote('design'))} aria-pressed={cote === 'design'} className="adm-outil">
            <Icone nom="palette" taille={15} className="shrink-0" />Design
          </button>
          <span className="adm-outils-trait" aria-hidden="true" />
          <div role="radiogroup" aria-label="Voir ma page" onKeyDown={e => flechesRadio(e)} className="flex gap-0.5">
            {(['telephone', 'ordinateur'] as const).map(l => (
              <button key={l} type="button" role="radio" aria-checked={largeur === l} tabIndex={largeur === l ? 0 : -1} onClick={() => setLargeur(l)}
                aria-label={l === 'telephone' ? 'Sur un téléphone, à modifier' : 'Sur un ordinateur, en aperçu'} title={l === 'telephone' ? 'Sur un téléphone' : 'Sur un ordinateur'} className="adm-outil adm-outil-carre">
                <Icone nom={l === 'telephone' ? 'mobile' : 'ordinateur'} taille={l === 'telephone' ? 15 : 16} />
              </button>
            ))}
          </div>
        </div>

        {/* Au téléphone, les deux gestes de la page sont posés sur la barre des onglets, à portée du pouce : la page commence sous l'en-tête. */}
        <aside className="adm-editor-tools" aria-label="Outils de la page">
          {/* Ajouter prend la place qui reste ; sur un écran étroit, il se dit en un mot plutôt que sur deux lignes. */}
          <div className="grid grid-cols-[1fr_auto] gap-2 whitespace-nowrap">
            <BoutonPrincipal onClick={() => ouvrirAjout()} aria-keyshortcuts="A" title="Ajouter (A, ou colle une adresse)"><Icone nom="ui-plus" taille={17} className="shrink-0" /><span>Ajouter<span className="max-[359px]:hidden"> un bloc</span></span></BoutonPrincipal>
            <BoutonSecondaire onClick={() => ouvrirCote('design')}><Icone nom="palette" taille={17} className="shrink-0" />Personnaliser</BoutonSecondaire>
          </div>
        </aside>

        {/* « Bien démarrer » au-dessus de la page, au bureau, tant qu'elle n'a pas commencé. */}
        <HautLiens compte={compte} reglages={reglages} demarrage={demarrage} aller={aller} annoncer={annoncer} feuille={demarrageOuvert} fermerFeuille={fermerDemarrage} />

        {largeur === 'ordinateur' && grand ? <ApercuBureau page={visiteurs} /> : (
          <div ref={zone} className="adm-cadre-zone" data-vide="" onPointerMove={suivreSurvol} onPointerLeave={quitterSurvol}>
            <div className="adm-cadre-lieu" data-vide="">
              <div ref={toile} className="adm-apercu adm-toile adm-cadre relative scroll-mt-24 overflow-hidden rounded-[24px] lg:rounded-[28px]" data-studio={grand || undefined}>
                <ContexteToile.Provider value={contexte}>
                  <PageLiens page={{ reglages: montree, blocs: visibles, compte }} edition={edition} />
                </ContexteToile.Provider>
                {/* Au téléphone, le geste s'écrit sur la page même, dans sa couleur, en haut à gauche : pas une ligne de plus au-dessus d'elle. */}
                {astuce && !grand && <p className="pointer-events-none absolute top-4 left-4 right-16 text-[13px] font-medium leading-snug" style={{ color: variablesTheme(themeDe(montree))['--doux'] }}>{visibles.length < 2 ? 'Touche pour modifier.' : 'Touche pour modifier, maintiens pour déplacer.'}</p>}
              </div>
              {/* Les gestes d'un bloc se posent ici, hors du cadre de la page qui les couperait. */}
              {grand && <div ref={setCalque} className="adm-calque" />}
            </div>
          </div>
        )}
      </div>

      {/* Le panneau de droite, au bureau : les réglages du bloc choisi, ou le design. Il s'ouvre sans voile, la page reste à portée. */}
      <div className="adm-panneau-cote">{aDroite && <div className="adm-panneau-colle">{aDroite}</div>}</div>

      <input ref={fichier} type="file" accept="image/*" className="adm-fichier" tabIndex={-1} aria-hidden="true" onChange={e => photo(e.target.files?.[0])} />
      <FeuilleAjout ouverte={ajout} onFermer={() => { enBas.current = false; setAjout(false); }} onChoisir={ajouter} principal={principal} />
      <Feuille ouverte={!grand && cote === 'reseaux'} onFermer={() => fermerCote()} retenir={reseauFaux} titre="Réseaux" cote apercu={direct} pied={piedAnnuler}>
        {contenuCote}
      </Feuille>
      <Feuille ouverte={!grand && cote === 'design'} onFermer={() => fermerCote()} titre="Design" cote apercu={direct} pied={piedAnnuler}>
        {contenuCote}
      </Feuille>
    </div>
  );
}

/**
 * La page sur un ordinateur, en aperçu : rendue à 1280 px de large, comme les
 * visiteurs la voient (sa mise en page « Sur ordinateur » comprise), puis
 * réduite pour tenir dans le canevas. Elle ne se modifie pas : la page se
 * règle dans la vue téléphone.
 */
function ApercuBureau({ page }: { page: PagePublique }) {
  const lieu = useRef<HTMLDivElement>(null);
  const interieur = useRef<HTMLDivElement>(null);
  const [taille, setTaille] = useState({ l: 0, h: 0 });
  useLayoutEffect(() => {
    const el = lieu.current, dedans = interieur.current;
    if (!el || !dedans) return;
    const mesurer = () => setTaille({ l: el.clientWidth, h: dedans.offsetHeight });
    mesurer();
    const obs = new ResizeObserver(mesurer);
    obs.observe(el); obs.observe(dedans);
    return () => obs.disconnect();
  }, []);
  const LARGEUR = 1280;
  const echelle = taille.l ? Math.min(1, taille.l / LARGEUR) : 0;
  return (
    <div ref={lieu} className="adm-ordi-lieu">
      <div className="adm-ordi adm-apercu adm-toile" style={{ width: LARGEUR * echelle, height: taille.h * echelle, visibility: echelle ? undefined : 'hidden' }}>
        <div ref={interieur} className="adm-ordi-page" style={{ width: LARGEUR, transform: `scale(${echelle})` }}>
          <PageLiens page={page} apercu />
        </div>
      </div>
      <p className="adm-ordi-legende">Ta page sur un ordinateur, comme la voient tes visiteurs. Elle se modifie dans la vue téléphone.</p>
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
  // Pendant un glisser, les gestes posés à côté des blocs s'effacent : ils ne suivraient pas.
  const [enCours, setEnCours] = useState(false);
  const capteurs = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 260, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] } }),
  );
  function deplacer({ active, over }: DragEndEvent) {
    glisse.current = Date.now();
    setEnCours(false);
    if (!over || active.id === over.id) return;
    vibrer(10);
    onOrdonner(arrayMove(blocs, blocs.findIndex(b => b.id === active.id), blocs.findIndex(b => b.id === over.id)));
  }
  const ouvrir = (bloc: Bloc) => { if (Date.now() - glisse.current > 250) onOuvrir(bloc); };
  // Sans Starter, un compte à rebours gardé d'une offre passée ne se montre pas sur la page : la toile le dessine pareil.
  // Seul le dessin change : l'éditeur reçoit le bloc tel qu'il est enregistré.
  const programmation = usePermis('programmation');
  const dessin = (bloc: Bloc) => rendu(programmation || !bloc.compteARebours ? bloc : { ...bloc, compteARebours: false });
  return (
    <>
      <DndContext accessibility={ACCESSIBILITE} sensors={capteurs} collisionDetection={closestCenter} onDragStart={() => { vibrer(6); setEnCours(true); }} onDragEnd={deplacer} onDragCancel={() => { glisse.current = Date.now(); setEnCours(false); }}>
        <SortableContext items={blocs.map(b => b.id)} strategy={verticalListSortingStrategy}>
          {blocs.map((bloc, i) => <BlocEditable key={bloc.id} bloc={bloc} i={i} clics={clics[bloc.id]} ouvrir={ouvrir} glisse={enCours}>{dessin(bloc)}</BlocEditable>)}
        </SortableContext>
      </DndContext>
      {/* Sous le dernier bloc, à portée du pouce : le même geste que le bouton Ajouter du haut. */}
      <button type="button" onClick={onAjouter} className="lp-ed-zone lp-ed-ajout"><Icone nom="ui-plus" taille={18} /> Ajouter à ma page</button>
    </>
  );
}

function BlocEditable({ bloc, i, clics, ouvrir, glisse, children }: { bloc: Bloc; i: number; clics?: number; ouvrir: (b: Bloc) => void; glisse: boolean; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bloc.id });
  const droits = useDroits();
  const toile = useContext(ContexteToile);
  // Un bloc que l'offre ne comprend plus reste là, grisé comme un bloc masqué : il revient avec l'offre.
  const attend = ([[!!bloc.acces, 'drops'], [bloc.type === 'inscription', 'listeEmail'], [bloc.type === 'preuve', 'avis']] as [boolean, Fonction][]).find(([oui, f]) => oui && !droits[f])?.[1];
  const prive = !bloc.public || !!attend;
  // Une règle que l'offre ne comprend plus n'est pas dite : sans Starter, un lancement attend sa date sans compte à rebours (« programmé »).
  const regles = etiquettes(bloc, droits);
  const programme = bloc.public && !estEnLigne(bloc) && !regles.includes('Compte à rebours');
  const puces = [
    { oui: !programme && !!((bloc.creneau && droits.heure) || (bloc.compteARebours && bloc.debut && droits.programmation)), icone: 'horloge', nom: 'Quand l’afficher' },
    { oui: !!(bloc.cache?.length || bloc.audience?.sources.length), icone: 'cible', nom: 'Afficher sur' },
    { oui: !!bloc.acces, icone: 'cadenas', nom: 'Accès réservé' },
  ].filter(p => p.oui);
  const nom = bloc.titre || bloc.url || 'ce bloc';
  const choisi = toile?.choisi === bloc.id;
  const survol = !glisse && toile?.survole === bloc.id;
  // Le menu « … » ouvert garde ses gestes affichés, même si la souris part sur une autre rangée.
  const [menu, setMenu] = useState(false);
  const calque = toile?.calque ?? null;
  const montre = !!calque && !glisse && (choisi || survol || menu);

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

  // Les gestes se posent à la hauteur du bloc : centrés sur un bloc court, sur sa première ligne pour un grand (une vidéo).
  const [haut, setHaut] = useState<number | null>(null);
  useLayoutEffect(() => {
    const n = noeud.current;
    if (!montre || !calque || !n) return;
    const mesurer = () => { const r = n.getBoundingClientRect(), c = calque.getBoundingClientRect(); setHaut(Math.round(r.top - c.top + (Math.min(r.height, 64) - 32) / 2)); };
    mesurer();
    // Après un déplacement, les blocs glissent à leur place : on remesure une fois qu'ils y sont.
    const t = setTimeout(mesurer, 320);
    const obs = new ResizeObserver(mesurer);
    obs.observe(calque); obs.observe(n);
    return () => { clearTimeout(t); obs.disconnect(); };
  }, [montre, calque, i]);

  const actions = montre && calque && haut !== null && toile && createPortal(
    <>
      {/* La poignée : on la saisit pour déplacer le bloc, un clic l'ouvre. Des raccourcis de la souris : au clavier, le bloc lui-même se déplace et s'ouvre. */}
      <div className="adm-actions-bloc adm-actions-gauche" style={{ top: haut }}>
        <button type="button" tabIndex={-1} {...listeners} onClick={() => ouvrir(bloc)} aria-label={`Déplacer ${nom}`} title="Glisser pour déplacer" className="adm-action-bloc cursor-grab active:cursor-grabbing">
          <Icone nom="ui-poignee" taille={15} />
        </button>
      </div>
      {/* Le bloc choisi a ses gestes dans le panneau : il ne garde que sa poignée. */}
      {!choisi && (
        <div className="adm-actions-bloc adm-actions-droite" style={{ top: haut }}>
          <button type="button" tabIndex={-1} onClick={() => { vibrer(5); toile.basculer(bloc); }} aria-label={bloc.public ? `Masquer ${nom}` : `Montrer ${nom}`} title={bloc.public ? 'Masquer de ma page' : 'Montrer sur ma page'} className="adm-action-bloc">
            <Icone nom={bloc.public ? 'ui-oeil' : 'ui-masque'} taille={15} />
          </button>
          <Menu label={`Gestes : ${nom}`} titre="Plus de gestes" tabIndex={-1} onBascule={setMenu} className="adm-action-bloc" elements={[
            { nom: 'Modifier', icone: 'ui-crayon', action: () => ouvrir(bloc) },
            { nom: 'Dupliquer', icone: 'ui-copier', action: () => toile.dupliquer(bloc) },
            { nom: 'Retirer de ma page', icone: 'ui-corbeille', danger: true, action: () => toile.supprimer(bloc) },
          ]}>
            <Icone nom="ui-points" taille={15} />
          </Menu>
        </div>
      )}
    </>,
    calque,
  );

  return (
    <>
      <div ref={n => { setNodeRef(n); noeud.current = n; }} {...attributes} {...listeners} aria-label={[`Modifier ${nom}`, attend ? `pas montré sans Hopla ${offreDe(attend)}` : prive && 'masqué', programme && 'programmé', ...regles].filter(Boolean).join(', ')} aria-roledescription="bloc déplaçable"
        aria-current={choisi || undefined}
        className="lp-bloc lp-ed-bloc" data-id={bloc.id} data-type={bloc.type} data-vedette={bloc.vedette ? bloc.format : undefined} data-glisse={isDragging || undefined} data-prive={prive || programme || undefined}
        data-choisi={choisi || undefined} data-survol={survol || undefined}
        style={{ '--i': i, transform: CSS.Transform.toString(transform), transition } as CSSProperties}
        onClickCapture={e => { e.preventDefault(); e.stopPropagation(); ouvrir(bloc); }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ouvrir(bloc); } else listeners?.onKeyDown?.(e); }}>
        {children}
        {(prive || programme || puces.length > 0) && (
          <span className="lp-ed-puces" aria-hidden="true">
            {/* Un picto par état, sans étiquette : le nom complet est dans l'aria-label du bloc. */}
            {prive && <span className="lp-ed-puce" title={attend ? `Pas montré sans Hopla ${offreDe(attend)}` : 'Masqué'}><Icone nom="masque" taille={13} /></span>}
            {programme && <span className="lp-ed-puce" title="Programmé"><Icone nom="horloge" taille={13} /></span>}
            {/* Chaque règle porte le picto de sa ligne dans l'éditeur : on la reconnaît sans l'ouvrir. */}
            {puces.map(p => <span key={p.icone} className="lp-ed-puce" title={p.nom}><Icone nom={p.icone} taille={13} /></span>)}
          </span>
        )}
      </div>
      {/* Le bloc reste un seul élément pour le glisser : ses gestes vivent à côté de lui, hors de la page. */}
      {actions}
    </>
  );
}
