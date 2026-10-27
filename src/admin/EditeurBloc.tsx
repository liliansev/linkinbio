import { useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { Api, Bloc, Disposition, ImageApercu, MentionPartenaire, Partenariat, Reglages, TypeBloc, TypeVitrine, VisuelApercu } from '../lib/types.ts';
import { ANIMATIONS_BLOC, TYPES_ADRESSE, TYPES_VITRINE, idYoutube, nouveauBloc } from '../lib/types.ts';
import { lecteurDe } from '../lib/lecteurs.ts';
import { horsCreneauOuDates } from '../lib/moments.ts';
import { RESEAUX } from '../lib/types.ts';
import { adresse, adresseSaisie, montants as lireMontants, numeroAppel, pourquoiPasAdresse } from '../lib/valider.ts';
import { avecMontants, nomAgenda, nomSoutien, seIntegre, soutienDe } from '../lib/vitrine.ts';
import { nomSite, reseauDeUrl } from '../lib/demarrage.ts';
import { lienAffilie, suggestion, typeDeAdresse, versType } from '../lib/detection.ts';
import type { TypeAdresse } from '../lib/detection.ts';
import { memeBloc, verifierBloc } from '../lib/editionBloc.ts';
import type { ChampErreur, Erreurs } from '../lib/editionBloc.ts';
import { ICONES } from '../lib/icones.ts';
import { Icone, NOMS_RESEAUX, PICTOS } from '../components/Icone.tsx';
import { BoutonPrincipal, BoutonSecondaire, Champ, Feuille, Interrupteur, ListeChoix, Menu, NOMS_ANIMATIONS, Segments, choisirFichier, classeBouton, classeSaisie, flechesRadio, preparerImage, preparerLogo, useFilFeuille, vibrer } from './ui.tsx';
import type { ElementMenu, FilFeuille } from './ui.tsx';
import { DEVENU, EN_FAIRE, typeDe } from '../lib/catalogue.ts';
import { sourceDe } from '../lib/avis.ts';
import { appDe } from '../lib/ouvrirApp.ts';
import { ChampsPreuve, LigneRepli, PagesBloc, RangeesCompactes, RegleAOuvrir, RegleAcces, ReglageVisibilite, Repli, ReplisExclusifs, resumeVisibilite } from './ReglesBloc.tsx';
import type { PageRegle } from './ReglesBloc.tsx';
import { useCouche } from './couches.ts';
import { reseauxDePartage } from '../lib/provenance.ts';
import { Etiquette, FournisseurOffre, Reserve, offreDe, useDroits, useVoirOffres } from './offre.tsx';
import type { Fonction } from '../lib/abonnement.ts';
import type { SuiteAchat } from '../lib/achat.ts';
import { focusAuto, focusSaisie } from '../lib/clavier';
import { ChampLieu, ChampsCoordonnees, ChampsFaq, ChampsGalerie } from './ChampsBlocs.tsx';
import { DestinationListe } from './OngletIntegrations.tsx';

/** Au téléphone, la page ouverte dans la feuille d'un bloc : l'essentiel (`null`), la visibilité, l'apparence, « Plus de réglages », ou une règle rare. */
type PageBloc = 'plus' | PageRegle | null;
const hoteDe = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
const NOMS_PAGES: Record<'plus' | PageRegle, string> = { plus: 'Plus de réglages', visibilite: 'Visibilité', apparence: 'Apparence', acces: 'Accès réservé', animation: 'Animation' };
const NOMS_FORMES: Record<Bloc['format'], string> = { bouton: 'Bouton', bandeau: 'Bandeau', carte: 'Carte' };
/**
 * Ce que « Mis en avant » ouvre, sur une ligne juste sous lui : l'apparence d'un lien (forme, couleur, animation),
 * l'animation seule d'un produit ou d'un rendez-vous. Rien pour une vidéo. La description d'un bloc mis en avant, que la
 * page montre, est sur la première page, sous son texte.
 */
const pageVedette = (b: Bloc): 'apparence' | 'animation' | null => (!b.vedette ? null : b.type === 'lien' ? 'apparence' : b.type === 'produit' || b.type === 'reservation' ? 'animation' : null);

/** Pose le fil de la feuille depuis son contenu : le nom de la page ouverte et sa flèche de retour. */
function FilPage({ fil }: { fil: FilFeuille | null }) {
  useFilFeuille(fil);
  return null;
}

/**
 * Ce que Hopla a écrit depuis l'adresse lue en dernier (`url`) : une autre adresse le remplace, jamais ce qu'on a écrit
 * soi-même. `inconnu` : un bloc ouvert tel qu'il était, dont on ne sait pas d'où venaient le texte et l'image.
 */
interface Lu { url: string; inconnu: boolean; titre: string; image: string; description: string; prix: string; icone: string }
type ChampAMoi = 'titre' | 'image' | 'description' | 'prix' | 'icone';

/** Les deux mentions qu'un lien partenaire peut porter (loi du 9 juin 2023). */
const DISPOSITIONS_NOMMEES: { id: Disposition; nom: string }[] = [{ id: 'liste', nom: 'En liste' }, { id: 'grille', nom: 'En grille' }];
const MENTIONS: { id: MentionPartenaire; nom: string }[] = [{ id: 'publicite', nom: 'Publicité' }, { id: 'collaboration', nom: 'Collaboration commerciale' }];
const PARTENARIAT_NEUF: Partenariat = { mention: 'publicite', code: '' };

/** Les adresses relues à l'ouverture d'un lien déjà posé, et si leur page déclare un prix : une lecture par adresse et par visite. */
const PRIX_LUS = new Map<string, boolean>();

const EXEMPLES_MONTANTS = [3, 5, 10, 20];

/**
 * Les montants de « Me soutenir » chez PayPal : quatre cases, en euros entiers ; une case vide n'est pas proposée.
 * Les cases se remettent dans l'ordre en les quittant, jamais pendant la frappe.
 */
function ChampMontants({ montants, onChange }: { montants: number[]; onChange: (m: number[]) => void }) {
  const remplir = (l: number[]) => [0, 1, 2, 3].map(i => (l[i] ? String(l[i]) : ''));
  const [cases, setCases] = useState(() => remplir(montants));
  // Revenus d'ailleurs (« Annuler mes changements ») : les cases reprennent les montants du bloc.
  useEffect(() => {
    if (JSON.stringify(lireMontants(cases.map(Number))) !== JSON.stringify(montants)) setCases(remplir(montants));
  }, [montants]); // eslint-disable-line react-hooks/exhaustive-deps
  // Les cases toutes vides disent ce qu'on y mettrait (3, 5, 10, 20 €) ; une seule remplie, les autres se taisent : un
  // montant en gris se lirait comme un montant proposé.
  const vides = cases.every(c => !c);
  function changer(i: number, v: string) {
    const l = cases.map((c, j) => (j === i ? v.replace(/\D/g, '').slice(0, 4) : c));
    setCases(l);
    onChange(lireMontants(l.map(Number)));
  }
  return (
    <div role="group" aria-label="Montants proposés, en euros" className="grid grid-cols-4 gap-2 bureau:gap-1.5"
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setCases(remplir(montants)); }}>
      {cases.map((c, i) => (
        <input key={i} className={`${classeSaisie} text-center tabular-nums`} inputMode="numeric" enterKeyHint="done" value={c} placeholder={vides ? String(EXEMPLES_MONTANTS[i]) : ''}
          onChange={e => changer(i, e.target.value)} aria-label={`Montant ${i + 1}, en euros`} />
      ))}
    </div>
  );
}

export interface OptionsEnregistrement {
  /** L'éditeur reste ouvert sur le bloc enregistré (sa rangée dépliée, au bureau). */
  garder?: boolean;
  /** Enregistré en route : pas de message « Modifications enregistrées » ; un bloc ajouté en passant à un autre ne fait pas défiler la page. */
  discret?: boolean;
  /** Un bloc neuf posé sans son éditeur (le choix des blocs refermé sur ce qu'on avait tapé) : en bas de la page plutôt qu'en haut. */
  enBas?: boolean;
  /**
   * Un bloc neuf gardé sans « Ajouter à ma page » (la croix, Échap, un glissé, un toucher à côté, un autre bloc, un autre
   * onglet, le départ chez Creem) : il est écrit masqué de la page, et le message le dit, avec « Afficher » (24 octobre 2026,
   * choisi par Lilian après la critique). Seul « Ajouter à ma page » met un bloc neuf en ligne.
   */
  masque?: boolean;
}

/*
 * L'éditeur d'un bloc. Au bureau (direction A, 21 octobre 2026), il se déplie
 * dans la rangée du bloc, dans la liste à gauche de la page : l'essentiel
 * d'abord, le reste derrière « Plus de réglages ». Il s'enregistre tout seul une
 * fraction de seconde après la dernière frappe (seule une version valable
 * s'écrit) ; Échap le replie. Au téléphone, une feuille du bas qui laisse voir
 * la page au-dessus, avec son « Terminé ». Dans les deux cas, le bloc se
 * redessine sur la page à chaque frappe (`onBrouillon`).
 */
export function EditeurBloc({ bloc, reglages, nouveau, bureau = false, garde, onBrouillon, onFermer, onRetour, onReplier, suitAdresse = true, repris = false, enFaire, onEnregistrer, onSupprimer, onDupliquer, onDeplacer, place, envoyerImage, apercuSite, noteAvis, clics, prises = 0, principal = false }: {
  bloc: Bloc;
  reglages: Reglages;
  nouveau: boolean;
  /** Au bureau : déplié dans la rangée du bloc, il s'enregistre tout seul. Sinon, la feuille du bas. */
  bureau?: boolean;
  /** Ce que la page appelle avant de passer à autre chose (un autre bloc, le design, un autre onglet) : vrai si l'on peut. */
  garde?: MutableRefObject<(() => boolean) | null>;
  /** Le bloc tel qu'il se tape (vide quand rien n'attend d'être écrit), pour que la page le montre en direct. */
  onBrouillon?: (b: Bloc | null) => void;
  onFermer: () => void;
  /**
   * Un bloc neuf, au téléphone : la flèche de l'en-tête (et le retour du téléphone) ramène au choix du bloc, sans rien
   * ajouter. Ce qui est tapé l'accompagne (`brouillon`) : l'adresse attend dans « Colle une adresse », un autre bloc la reprend.
   */
  onRetour?: (brouillon: Bloc | null) => void;
  /** Au bureau, une rangée changée puis repliée : le bloc tel qu'il était à son ouverture, que « Annuler » dans le message remet. */
  onReplier?: (avant: Bloc) => void;
  /** Faux pour un bloc choisi dans la liste avec une adresse déjà tapée : il reste ce qu'on a choisi, l'adresse ne le change pas. */
  suitAdresse?: boolean;
  /**
   * Un bloc neuf qui reprend ce qui était tapé (retrouvé après un rechargement, ou la même adresse recollée) : il est déjà
   * commencé (fermer le garde, masqué ; la flèche l'emporte), et son adresse ne se relit pas, pour ne rien changer de ce qu'on avait.
   */
  repris?: boolean;
  /** Au retour d'un achat : le bloc que ce lien devient en s'ouvrant (« Ouvrir ton agenda dans ta page »), comme par son geste « En faire… ». */
  enFaire?: TypeAdresse;
  onEnregistrer: (bloc: Bloc, options?: OptionsEnregistrement) => void;
  onSupprimer: (bloc: Bloc) => void;
  onDupliquer: (bloc: Bloc) => void;
  /** Monter ou descendre le bloc d'un cran, sans glisser : la place est donnée par la page. */
  onDeplacer?: (bloc: Bloc, sens: -1 | 1) => void;
  place?: { rang: number; total: number };
  envoyerImage: (dataUrl: string) => Promise<string>;
  apercuSite: Api['apercuSite'];
  /** La note d'une page d'avis collée dans un bloc « Avis et preuves ». */
  noteAvis?: Api['noteAvis'];
  clics: number;
  /** L'adresse publique de la page, pour les astuces (`?s=tiktok`). */
  adressePage: string;
  /** Les places déjà prises, quand le lien est un drop. */
  prises?: number;
  /** Le compte principal, seul visible par Google pendant la bêta. */
  principal?: boolean;
}) {
  const droits = useDroits();
  /**
   * Un bloc neuf suit son adresse (23 octobre 2026, demandé par Lilian) : une vidéo YouTube, un agenda, un soutien ou un
   * produit prennent leur bloc, jusqu'à « En faire un simple lien ». Un lien partenaire, ou un bloc choisi pour autre
   * chose qu'une adresse collée (une prise de rendez-vous encore vide), reste ce qu'il est. Un bloc repris aussi : un
   * lien qu'on avait rendu simple lien ne redevient pas une vidéo.
   */
  const [autoDepart] = useState(() => nouveau && suitAdresse && !bloc.partenariat
    && ((bloc.type === 'lien' && !(repris && adresseSaisie(bloc.url))) || typeDeAdresse(adresseSaisie(bloc.url), !!droits.vitrine) === bloc.type));
  const auto = useRef(autoDepart);
  const [b, setB] = useState<Bloc>(() => {
    const url = adresseSaisie(bloc.url);
    const t = autoDepart && url ? typeDeAdresse(url, !!droits.vitrine) : bloc.type;
    return t === bloc.type ? bloc : versType(bloc, t, false);
  });
  const lu = useRef<Lu>({ url: nouveau && !repris ? '' : adresseSaisie(bloc.url), inconnu: !nouveau || repris, titre: '', image: '', description: '', prix: '', icone: '' });
  /** Ce qu'on a écrit ou choisi soi-même depuis l'ouverture : une autre adresse n'y touche pas. */
  const aMoi = useRef(new Set<ChampAMoi>());
  /** L'adresse a été effacée : celle qu'on retape remplace tout ce qui venait de l'ancienne. */
  const efface = useRef(false);
  /** La prochaine lecture part sans attendre : une adresse arrivée toute faite, ou « En faire un simple lien ». */
  const immediat = useRef(nouveau && !repris && !!bloc.url);
  /** D'où vient l'image : l'image de partage du site, son logo, une photo choisie ; null si on ne sait pas. */
  const genreImage = useRef<VisuelApercu | 'photo' | null>(null);
  // Une erreur dit sur quel champ elle porte : elle s'affiche dessous, et part dès qu'on y touche.
  // Plusieurs champs peuvent manquer à la fois (une note, son nombre d'avis, sa source) : chacun dit le sien.
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const setErreur = (texte: string, champ: ChampErreur = 'url') => setErreurs(texte ? { [champ]: texte } : {});
  const erreurDe = (champ: string) => erreurs[champ as ChampErreur];
  const erreur = Object.keys(erreurs).length > 0;
  const [envoi, setEnvoi] = useState(false);
  const [lecture, setLecture] = useState(false);
  /** Une image se cherche ou s'envoie : la vignette du champ attend. */
  const [visuelEnCours, setVisuelEnCours] = useState(false);
  /** L'adresse d'une page lue qui déclare un prix : un lien qui ne l'a pas suivie propose d'en faire son produit. */
  const [boutique, setBoutique] = useState('');
  /** Le type du bloc à son ouverture : l'enregistrement en route (au bureau) change `bloc`, pas lui. */
  const [typeOuvert] = useState(bloc.type);
  const voir = useVoirOffres();
  const [icones, setIcones] = useState(false);
  /** Le sous-titre, rare : son champ se montre rempli, ou une fois demandé ; sinon une ligne « Ajouter un sous-titre ». */
  const [sousTitreDemande, setSousTitreDemande] = useState(false);
  /** « Ajouter un cadeau », sous une liste e-mail : ses champs restent ouverts une fois demandés, même vidés. */
  const [cadeauDemande, setCadeauDemande] = useState(false);
  // L'essentiel d'abord, neuf ou pas ; le reste attend derrière « Plus de réglages ».
  // Ouvert pour y régler une règle tout juste débloquée (au retour des offres), il arrive déplié (au téléphone, sur la page de la règle).
  const regleAOuvrir = useContext(RegleAOuvrir);
  const [plus, setPlus] = useState(regleAOuvrir === 'acces');
  // Au bureau, le réglage déplié de la rangée (Visibilité ou Apparence) : un seul à la fois.
  const [repli, setRepli] = useState<string | null>(null);
  // La page d'où l'on vient : la visibilité et l'apparence s'ouvrent depuis la première page, l'accès réservé depuis
  // « Plus de réglages », l'animation depuis l'apparence (celle d'un rendez-vous, depuis la première page).
  const parent = (p: PageBloc): PageBloc => (p === 'acces' ? 'plus' : p === 'animation' && pageVedette(b) === 'apparence' ? 'apparence' : null);
  const niveau = (p: PageBloc): number => (p === null ? 0 : 1 + niveau(parent(p)));
  const [page, setPage] = useState<PageBloc>(bureau ? null : regleAOuvrir === 'moment' ? 'visibilite' : regleAOuvrir);
  // Chaque page garde l'endroit où on l'a laissée : on revient à la ligne d'où l'on était parti.
  const defilements = useRef<Partial<Record<string, number>>>({});
  const passage = useRef<{ de: PageBloc; a: PageBloc } | null>(null);
  const corpsFeuille = () => document.querySelector<HTMLElement>('.adm-feuille-bloc .adm-feuille-corps');
  function allerA(p: PageBloc) {
    if (p === page) return;
    const c = corpsFeuille();
    if (c) defilements.current[page ?? 'bloc'] = c.scrollTop;
    passage.current = { de: page, a: p };
    setPage(p);
  }
  useLayoutEffect(() => {
    const v = passage.current;
    if (!v) return;
    passage.current = null;
    // Une page plus profonde s'ouvre par son haut ; en revenant, la page d'avant reprend où on l'avait laissée.
    const remonte = niveau(v.a) < niveau(v.de);
    const c = corpsFeuille();
    if (c) c.scrollTop = remonte ? defilements.current[v.a ?? 'bloc'] ?? 0 : 0;
    // Le focus suit : sur la flèche en entrant (posée dans l'en-tête au rendu suivant), sur la ligne d'où l'on venait en revenant.
    const poser = () => {
      const cible = remonte ? document.getElementById(v.de === 'plus' ? `${idPlus}-ligne` : `regle-${v.de}`) : document.querySelector<HTMLElement>('.adm-feuille-bloc .adm-feuille-retour');
      cible?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    };
    if (remonte) poser(); else requestAnimationFrame(poser);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  // Le retour du téléphone remonte d'une page à la fois, avant de fermer la feuille.
  useCouche(!bureau && page !== null, () => { allerA(null); return true; });
  useCouche(!bureau && niveau(page) === 2, () => { allerA(parent(page)); return true; });

  /*
   * Au téléphone, la feuille d'un bloc s'arrête juste sous lui (22 octobre 2026) : le bloc remonte sous l'en-tête, et la
   * feuille prend toute la place qui reste, entre la moitié et 86 % de l'écran. Un bloc neuf aussi (23 octobre 2026) : il
   * est déjà sur la page, à la place qu'il prendra. Le bloc reste en vue quand la feuille grandit ou qu'il change de taille.
   */
  const [plafond, setPlafond] = useState<number>();
  useLayoutEffect(() => {
    if (bureau) return;
    const blocPage = () => document.querySelector<HTMLElement>(`.adm-toile [data-id="${CSS.escape(bloc.id)}"]`);
    const feuille = () => document.querySelector<HTMLElement>('.adm-feuille-bloc');
    const sousEntete = () => (document.querySelector('.adm-topbar')?.getBoundingClientRect().bottom ?? 72) + 12;
    const clavier = () => !!window.visualViewport && innerHeight - window.visualViewport.height > 120;
    // Les puces d'état (masqué, programmé…) se posent au-dessus du bloc : leur place compte, elles disent ce qu'on vient de régler.
    const puces = (el: HTMLElement) => {
      const p = el.querySelector('.lp-ed-puces');
      return p ? Math.max(0, el.getBoundingClientRect().top - p.getBoundingClientRect().top) : 0;
    };
    const mesurer = () => {
      const el = blocPage();
      const h = innerHeight;
      setPlafond(Math.round(el ? Math.min(h * 0.86, Math.max(h * 0.5, h - sousEntete() - puces(el) - el.offsetHeight - 14)) : h * 0.92));
    };
    const ajuster = () => {
      const el = blocPage(), f = feuille();
      if (!el || !f || clavier()) return;
      const r = el.getBoundingClientRect();
      const haut = sousEntete() + puces(el), bas = innerHeight - f.offsetHeight - 12;
      const cible = Math.max(haut, Math.min(r.top, bas - r.height));
      if (Math.abs(r.top - cible) > 2) scrollBy({ top: r.top - cible, behavior: 'instant' });
    };
    mesurer();
    ajuster();
    const suivre = () => { mesurer(); ajuster(); };
    const ro = new ResizeObserver(suivre);
    // La page entière : un bloc qui grandit (mis en avant, une image) la fait grandir aussi, même s'il est redessiné à neuf.
    for (const x of [document.querySelector('.adm-toile'), feuille()]) if (x) ro.observe(x);
    addEventListener('resize', suivre);
    return () => { ro.disconnect(); removeEventListener('resize', suivre); };
  }, [bureau, bloc.id]);
  const idPlus = useId();
  const idTitre = useId();
  const racine = useRef<HTMLDivElement>(null);
  const fichier = useRef<HTMLInputElement>(null);
  const vignette = useRef<HTMLDivElement>(null);
  const boutonDupliquer = useRef<HTMLButtonElement>(null);
  // Ce qui est écrit : la saisie telle qu'elle était au dernier enregistrement (ou à l'ouverture), et sa version enregistrée.
  const brut = useRef<Bloc>(repris ? nouveauBloc(bloc.type, bloc.id) : bloc);
  const enregistre = useRef<Bloc | null>(nouveau ? null : bloc);
  // Le bloc tel qu'il était en ouvrant l'éditeur : « Annuler mes changements » y revient.
  const depart = useRef<Bloc | null>(nouveau ? null : bloc);
  const enregistrerRef = useRef(onEnregistrer);
  enregistrerRef.current = onEnregistrer;
  const brouillonRef = useRef(onBrouillon);
  brouillonRef.current = onBrouillon;

  // Chaque frappe se voit sur la page ; au bureau, une version valable s'écrit 650 ms après la dernière.
  // Une saisie pas valable (une adresse effacée) laisse voir la dernière version écrite : le bloc ne disparaît pas de la page.
  useEffect(() => {
    const change = !memeBloc(b, brut.current);
    const v = verifierBloc(b).bloc;
    brouillonRef.current?.(change ? v ?? enregistre.current ?? b : null);
    if (!bureau || nouveau || !change || !v) return;
    if (memeBloc(v, enregistre.current)) { brut.current = b; return; }
    const t = setTimeout(() => { brut.current = b; enregistre.current = v; enregistrerRef.current(v, { garder: true, discret: true }); }, 650);
    return () => clearTimeout(t);
  }, [b, bureau, nouveau]);

  // Une erreur s'efface quand on touche à son champ, pas aux autres : celles qui restent vraies restent affichées.
  const maj = (champs: Partial<Bloc>) => {
    const p = champs.preuve, q = b.preuve;
    const touches: ChampErreur[] = [
      ...(['url', 'titre', 'description', 'image'] as const).filter(k => k in champs),
      ...('debut' in champs || 'fin' in champs || 'creneau' in champs ? ['dates' as const] : []),
      ...(p && q ? (['note', 'nombre', 'source'] as const).filter(k => p[k] !== q[k]) : []),
      ...(p && p.genre !== q?.genre ? (['note', 'nombre', 'source'] as const) : []),
    ];
    setB({ ...b, ...champs });
    // Ce qu'on tape ou choisit soi-même ne se remplace plus par ce qu'un site donne.
    for (const k of ['titre', 'image', 'description', 'prix', 'icone'] as const) if (k in champs) aMoi.current.add(k);
    if ('image' in champs) genreImage.current = null;
    if (erreur && touches.some(k => erreurs[k])) setErreurs(e => Object.fromEntries(Object.entries(e).filter(([k]) => !touches.includes(k as ChampErreur))));
  };
  // Un lien partenaire a son nom et son aide à lui : c'est un lien, avec sa mention.
  const type = typeDe(b);
  const avecUrl = TYPES_ADRESSE.includes(b.type);
  /** L'adresse tapée, si c'en est une (complétée de son https) ; dans un lien, un numéro entier est son adresse `tel:`. */
  const adresseValide = adresseSaisie(b.url) || (b.type === 'lien' ? numeroAppel(b.url) : '');
  /** Une page web, qui se lit : ni un numéro ni une adresse e-mail. */
  const web = /^https?:/i.test(adresseValide);

  /** Vérifie le bloc ; renvoie la version à enregistrer, ou montre ce qui manque et mène au champ. */
  function valider(): Bloc | null {
    const r = verifierBloc(b);
    if (r.bloc) return r.bloc;
    setErreurs(r.erreurs);
    if (r.erreurs.dates) {
      if (!bureau) allerA('visibilite');
      setTimeout(() => { const f = document.getElementById('bloc-fin'); f?.scrollIntoView({ block: 'center' }); f?.focus({ preventScroll: true }); }, 60);
    } else {
      // Les autres champs sont sur la première page : on y revient, le champ fautif sous les yeux.
      if (!bureau && page !== null) allerA(null);
      if (r.erreurs.note || r.erreurs.nombre || r.erreurs.source || bureau || page !== null) setTimeout(() => document.querySelector<HTMLElement>('.adm-editeur [aria-invalid="true"]')?.focus(), page !== null ? 60 : 0);
    }
    return null;
  }
  /** Ce qui est tapé n'est pas encore écrit. */
  const commence = () => !memeBloc(b, brut.current);
  // Deux versions se comparent après la même vérification : une adresse rangée sans sa barre finale n'est pas un changement.
  const norme = (x: Bloc) => verifierBloc(x).bloc ?? x;
  /**
   * Écrit ce qui est tapé, sans « Ajouter à ma page » ni « Terminé ». Un bloc neuf ne part pas en ligne d'un autre geste que
   * son bouton : il s'écrit masqué (voir `masque`), et l'éditeur, s'il reste ouvert sur lui, le montre ainsi.
   */
  function ecrireEnRoute(v: Bloc, options?: OptionsEnregistrement) {
    const garde_ = nouveau ? { ...v, public: false } : v;
    brut.current = nouveau ? { ...b, public: false } : b;
    enregistre.current = garde_;
    if (nouveau) setB(x => ({ ...x, public: false }));
    onEnregistrer(garde_, nouveau ? { ...options, masque: true } : options);
  }
  /** Avant de passer à autre chose : ce qui est valable s'écrit ; un champ faux garde l'éditeur ouvert et dit quoi faire. */
  function liberer(): boolean {
    if (!commence()) return true;
    const v = valider();
    if (!v) { vibrer(20); return false; }
    brut.current = b;
    if (!memeBloc(v, enregistre.current)) ecrireEnRoute(v, { garder: true, discret: true });
    return true;
  }
  // « Afficher », dans le message d'un bloc gardé masqué, le montre sur la page : l'éditeur resté ouvert sur lui le suit.
  useEffect(() => {
    const e = enregistre.current;
    if (nouveau || !e || e.public === bloc.public) return;
    enregistre.current = { ...e, public: bloc.public };
    brut.current = { ...brut.current, public: bloc.public };
    setB(x => ({ ...x, public: bloc.public }));
  }, [bloc.public]); // eslint-disable-line react-hooks/exhaustive-deps
  // Au téléphone aussi : les offres s'ouvrent par-dessus la feuille, et ce qui y est tapé s'écrit avant de partir chez Creem.
  useEffect(() => {
    if (!garde) return;
    garde.current = liberer;
    return () => { garde.current = null; };
  });

  /*
   * Ce que la page montre se règle sur la première page du bloc (23 octobre 2026) : son texte, son sous-titre, ses montants,
   * son image, sa description ; l'apparence d'un bloc mis en avant, juste sous « Mis en avant ». Derrière « Plus de réglages »
   * ne reste que ce que la page ne montre pas : le lien partenaire, l'accès réservé, Google, le prénom demandé, un lien
   * réservé aux plus de 18 ans. Ce qui y est
   * réglé se dit à droite de la ligne, en bleu comme dans Visibilité ; rien de réglé, le chevron seul : la case dit un
   * état, jamais un sommaire de ce qu'elle cache.
   */
  const reglages_ = ([[!!b.partenariat, 'Lien partenaire'], [!!b.acces, 'Accès réservé'], [b.type === 'lien' && principal && !b.indexable, 'Pas sur Google'],
    [b.type === 'inscription' && b.demanderPrenom, 'Prénom demandé'], [b.sensible, 'Plus de 18 ans']] as [boolean, string][])
    .filter(([oui]) => oui).map(([, nom]) => nom);
  const reglees = reglages_.length > 2 ? `${reglages_.slice(0, 2).join(', ')} et ${reglages_.length - 2} de plus` : reglages_.join(', ');
  // Un titre, un texte, une vidéo, un soutien, un rendez-vous : rien que la page ne montre, pas de « Plus de réglages ».
  const plusVide = !['lien', 'produit', 'inscription'].includes(b.type);
  const nomAuto = `Comme ma page (${NOMS_ANIMATIONS[reglages.animation].nom})`;
  const nomIcone = b.icone ? NOMS_RESEAUX[b.icone] ?? PICTOS.find(p => p.nom === b.icone)?.libelle ?? '' : 'Aucune';

  /** Le format de l'image d'un bloc : la photo d'un produit, la grande image d'une carte, la vignette d'un bouton. */
  const formatImage = (x: Bloc) => (x.type === 'produit' ? 'photo' as const : x.vedette && x.format === 'carte' ? 'large' as const : 'carre' as const);
  /** Une image lue sur un site (en data URL), préparée à son format puis envoyée : son adresse chez Hopla. Un logo se pose sur du blanc. */
  async function envoyerVisuel(donnees: string, visuel: VisuelApercu | undefined, format: 'carre' | 'large' | 'photo' | 'galerie') {
    const fichierLu = await (await fetch(donnees)).blob();
    return envoyerImage(await (visuel === 'logo' ? preparerLogo(fichierLu, format === 'large' ? 'large' : 'carre') : preparerImage(fichierLu, format)));
  }

  async function choisirImage(f: File | undefined) {
    if (!f) return;
    setEnvoi(true); setVisuelEnCours(true); setErreur('');
    try {
      const image = await envoyerImage(await preparerImage(f, formatImage(b)));
      aMoi.current.add('image');
      genreImage.current = 'photo';
      setB(avant => ({ ...avant, image }));
    } catch { setErreur('L’image n’est pas passée. Essaie une autre photo.', 'image'); }
    finally { setEnvoi(false); setVisuelEnCours(false); if (fichier.current) fichier.current.value = ''; }
  }

  /** Le menu de la vignette : l'image du site (ou la photo de la boutique) et son logo, à la demande. */
  async function prendreDuSite(genre: 'partage' | 'logo') {
    const url = adresseSaisie(b.url);
    if (!url) { setErreur('Indique d’abord l’adresse.'); return; }
    const format = formatImage(b);
    setVisuelEnCours(true); setErreur('');
    try {
      const site = await apercuSite(url, genre === 'logo' ? 'logo' : b.type === 'produit' || b.type === 'musique' ? 'partage' : true);
      if (!site.image) {
        setErreur(genre === 'logo' ? 'Ce site n’a pas de logo assez net. Choisis une photo ou une icône.' : 'Ce site ne donne pas d’image. Choisis une photo.', 'image');
        return;
      }
      const image = await envoyerVisuel(site.image, genre === 'logo' ? 'logo' : site.visuel, format);
      // Venue du site, elle suit l'adresse : une autre la remplace par la sienne, du même genre.
      aMoi.current.delete('image');
      genreImage.current = genre === 'logo' ? 'logo' : site.visuel ?? 'partage';
      lu.current.image = image;
      setB(avant => (adresseSaisie(avant.url) === url ? { ...avant, image } : avant));
      vibrer(10);
    } catch { setErreur('Impossible de lire ce site pour l’instant. Choisis une photo à la place.', 'image'); }
    finally { setVisuelEnCours(false); }
  }

  /*
   * Une adresse quittée, collée, ou arrivée toute faite, relue d'elle-même dès qu'on cesse de taper (22 et 23 octobre
   * 2026, demandé par Lilian : « que ça détecte automatiquement de quoi il s'agit […] et que si je le modifie et que je
   * le remets, ça refetch »). Un bloc neuf qui suit son adresse prend d'abord son bloc (`auto`). Puis le site se lit :
   * le texte d'un lien (le nom du site tout de suite, son vrai titre ensuite), sa vignette et sa description ; le nom,
   * le prix et la photo d'un produit ; le titre d'une vidéo. Ce qui venait de l'ancienne adresse (lu par Hopla, vide, ou
   * l'adresse effacée puis retapée) prend ce que donne la nouvelle ; ce qu'on a écrit ou choisi soi-même reste.
   */
  async function lireAdresse(saisie = b.url) {
    if (!TYPES_ADRESSE.includes(b.type)) return;
    const url = adresseSaisie(saisie);
    // Un numéro entier, dans un lien, l'appelle : rien à lire, rien à redire.
    if (!url && b.type === 'lien' && numeroAppel(saisie)) return;
    if (saisie.trim() && !url) { setErreur(pourquoiPasAdresse(saisie)); return; }
    if (!url) return;
    const ancien = lu.current;
    // La même adresse ne se relit pas, sauf pour donner un texte à un lien qui n'en a plus.
    if (url === ancien.url && (b.titre.trim() || b.type !== 'lien')) return;
    // Une adresse e-mail ou un numéro n'ont pas de page à lire.
    if (!/^https?:/i.test(url)) { lu.current = { ...ancien, url }; return; }
    const effacee = efface.current;
    efface.current = false;
    const autreSite = effacee || !ancien.url || hoteDe(url) !== hoteDe(ancien.url);
    let x: Bloc = { ...b, url: saisie };
    if (auto.current) {
      const t = typeDeAdresse(url, !!droits.vitrine);
      if (t !== x.type) {
        const texteAMoi = aMoi.current.has('titre');
        x = versType(x, t, texteAMoi);
        setB(avant => versType(avant, t, texteAMoi));
        setErreurs({});
      }
    }
    lu.current = { url, inconnu: false, titre: '', image: '', description: '', prix: '', icone: '' };
    if (x.type === 'lien') await lireLien(url, x, ancien, autreSite, effacee);
    else if (x.type === 'produit') await lireBoutique(url, x, ancien, autreSite, effacee);
    else if (x.type === 'video') await (idYoutube(url) ? lireVideo(url, x, ancien, effacee) : lireLecteur(url, x, ancien, effacee));
    else if (x.type === 'musique') await lireLecteur(url, x, ancien, effacee);
  }

  /** Le texte venait-il de l'ancienne adresse ? Vide, lu par Hopla, le nom de l'ancien site, le texte de départ du bloc, ou l'adresse effacée puis retapée. */
  const texteLibre = (x: Bloc, ancien: Lu, effacee: boolean) => !x.titre.trim() || (!aMoi.current.has('titre')
    && (effacee || x.titre === ancien.titre || x.titre === nouveauBloc(x.type, x.id).titre || (!!ancien.url && x.titre === nomSite(ancien.url))));
  /** Un bloc ouvert tel qu'il était : son texte venait-il de son ancien site ? Celui-ci se relit, en même temps que le nouveau, pour le savoir. */
  const ancienneLecture = (x: Bloc, ancien: Lu) => (ancien.inconnu && ancien.url && x.titre.trim() && !aMoi.current.has('titre')
    ? apercuSite(ancien.url, false).catch(() => null) : Promise.resolve(null));

  async function lireLien(url: string, x: Bloc, ancien: Lu, autreSite: boolean, effacee: boolean) {
    const pareil = (avant: Bloc) => adresseSaisie(avant.url) === url && avant.type === 'lien';
    // Un réseau prend son icône d'office (instagram.com/marie, celle d'Instagram) ; celle d'un ancien réseau part avec lui.
    const reseau = reseauDeUrl(url);
    const iconeLibre = !aMoi.current.has('icone') && (!x.icone || x.icone === ancien.icone || (!!ancien.url && x.icone === reseauDeUrl(ancien.url)));
    const icone = iconeLibre ? reseau ?? '' : x.icone;
    if (iconeLibre) lu.current.icone = icone;
    if (icone !== x.icone) setB(avant => (pareil(avant) && avant.icone === x.icone ? { ...avant, icone } : avant));
    const titreAuto = texteLibre(x, ancien, effacee);
    // La vignette d'un réseau est son icône. Sinon, l'image du site : celle qui tient dans la vignette d'un bouton (voir
    // `ImageApercu`), la grande image d'une carte, ou son logo s'il a été choisi. Une icône choisie reste, sans image.
    const iconeChoisie = !iconeLibre && !!x.icone;
    const imageLibre = !aMoi.current.has('image') && (x.image ? autreSite || x.image === ancien.image : !iconeChoisie && (nouveau || autreSite));
    const mode: ImageApercu = !imageLibre || reseau ? false : genreImage.current === 'logo' ? 'logo' : formatImage(x) === 'large' ? 'partage' : 'vignette';
    const descriptionAuto = !aMoi.current.has('description') && (!x.description || autreSite || x.description === ancien.description);
    const repli = nomSite(url);
    if (titreAuto && repli) {
      lu.current.titre = repli;
      setB(avant => (pareil(avant) && avant.titre === x.titre ? { ...avant, titre: repli } : avant));
    }
    if (reseau && imageLibre && x.image) setB(avant => (pareil(avant) && avant.image === x.image ? { ...avant, image: '' } : avant));
    setLecture(true);
    if (mode) setVisuelEnCours(true);
    try {
      const [site, avantLu] = await Promise.all([apercuSite(url, mode), titreAuto ? null : ancienneLecture(x, ancien)]);
      // Une page qui déclare un prix est une boutique : un lien neuf qui suit son adresse devient son produit ; un autre
      // le propose, ou dit, sans Starter, ce que l'offre en ferait.
      if (site.prix && site.titre) {
        if (auto.current && droits.vitrine) return await devenirProduit(url, site);
        setBoutique(url);
      }
      const titre = site.titre.slice(0, 80);
      const titreSuit = titreAuto || (!!avantLu?.titre && avantLu.titre.slice(0, 80) === x.titre);
      const image = mode && site.image ? await envoyerVisuel(site.image, site.visuel, formatImage(x)) : '';
      if (image) genreImage.current = site.visuel ?? 'partage';
      lu.current = { ...lu.current, titre: titreSuit ? titre || repli : '', image, description: descriptionAuto ? site.description : '' };
      setB(avant => (!pareil(avant) ? avant : {
        ...avant,
        titre: titreSuit && titre && (avant.titre === repli || avant.titre === x.titre) ? titre : avant.titre,
        image: mode && avant.image === x.image ? image : avant.image,
        description: descriptionAuto && avant.description === x.description ? site.description : avant.description,
      }));
    } catch { /* le nom du site suffit */ }
    finally { setLecture(false); setVisuelEnCours(false); }
  }

  /** Un lien neuf vers une boutique devient son produit : son nom, son prix, et sa photo (l'image de partage, jamais un logo). */
  async function devenirProduit(url: string, site: Awaited<ReturnType<Api['apercuSite']>>) {
    const texteAMoi = aMoi.current.has('titre');
    const titre = site.titre.slice(0, 80);
    lu.current = { ...lu.current, titre, prix: site.prix, image: '', description: '' };
    setB(avant => (adresseSaisie(avant.url) !== url || avant.type !== 'lien' ? avant
      : { ...versType(avant, 'produit', texteAMoi), titre: texteAMoi && avant.titre.trim() ? avant.titre : titre, prix: site.prix }));
    if (aMoi.current.has('image')) return;
    setVisuelEnCours(true);
    try {
      const photo = site.visuel === 'partage' && site.image ? site.image : (await apercuSite(url, 'partage')).image;
      if (!photo) return;
      const image = await envoyerVisuel(photo, 'partage', 'photo');
      lu.current.image = image;
      genreImage.current = 'partage';
      setB(avant => (adresseSaisie(avant.url) === url && avant.type === 'produit' && !avant.image ? { ...avant, image } : avant));
      vibrer(10);
    } catch { /* le nom et le prix suffisent */ }
    finally { setVisuelEnCours(false); }
  }

  /** Un produit lit sa boutique : son nom, son prix et sa photo de partage, jamais une capture de la page. */
  async function lireBoutique(url: string, x: Bloc, ancien: Lu, autreSite: boolean, effacee: boolean) {
    const pareil = (avant: Bloc) => adresseSaisie(avant.url) === url && avant.type === 'produit';
    const titreLibre = texteLibre(x, ancien, effacee);
    const prixLibre = !x.prix.trim() || (!aMoi.current.has('prix') && (effacee || x.prix === ancien.prix));
    const imageLibre = !aMoi.current.has('image') && (!x.image || autreSite || x.image === ancien.image);
    setLecture(true); setErreur('');
    if (!aMoi.current.has('image')) setVisuelEnCours(true);
    try {
      const [site, avantLu] = await Promise.all([apercuSite(url, aMoi.current.has('image') ? false : 'partage'), titreLibre ? null : ancienneLecture(x, ancien)]);
      // Le nom de départ venait de l'ancienne page : c'était son produit, sa fiche entière suit la nouvelle.
      const suit = !!avantLu?.titre && avantLu.titre.slice(0, 80) === x.titre;
      const prendTitre = titreLibre || suit;
      const prendPrix = prixLibre || (suit && !aMoi.current.has('prix'));
      const prendImage = !aMoi.current.has('image') && (imageLibre || suit);
      const neuf = { titre: site.titre.slice(0, 80), prix: site.prix };
      const image = prendImage && site.image ? await envoyerVisuel(site.image, 'partage', 'photo') : '';
      if (image) genreImage.current = 'partage';
      lu.current = { ...lu.current, titre: prendTitre ? neuf.titre : '', prix: prendPrix ? neuf.prix : '', image: prendImage ? image : '' };
      setB(avant => (!pareil(avant) ? avant : {
        ...avant,
        titre: prendTitre && avant.titre === x.titre ? neuf.titre : avant.titre,
        prix: prendPrix && avant.prix === x.prix ? neuf.prix : avant.prix,
        image: prendImage && avant.image === x.image ? image : avant.image,
      }));
      if (neuf.titre || neuf.prix || image) vibrer(10);
      else setErreur('Cette boutique ne donne ni nom ni prix. Ajoute-les à la main.', 'image');
    } catch {
      // Rien n'est lu : la même adresse se relira en quittant le champ.
      lu.current = ancien;
      setErreur('Impossible de lire cette boutique pour l’instant. Ajoute le nom, le prix et la photo à la main.', 'image');
    } finally { setLecture(false); setVisuelEnCours(false); }
  }

  /** Une vidéo prend son vrai titre, lu par l'oEmbed de YouTube, à la place de « Ma vidéo ». */
  async function lireVideo(url: string, x: Bloc, ancien: Lu, effacee: boolean) {
    if (!texteLibre(x, ancien, effacee)) return;
    try {
      const titre = (await apercuSite(url, false)).titre.slice(0, 80);
      if (!titre) return;
      lu.current.titre = titre;
      setB(avant => (adresseSaisie(avant.url) === url && avant.type === 'video' && avant.titre === x.titre ? { ...avant, titre } : avant));
    } catch { /* « Ma vidéo » suffit */ }
  }

  /**
   * Un lecteur (un titre, un album, un podcast, une vidéo Vimeo ou TikTok) prend son vrai titre et sa pochette, ou sa
   * vignette, lus par le service (oEmbed) ; ce qu'on a écrit ou choisi soi-même reste. Une vidéo TikTok garde sa
   * vignette verticale.
   */
  async function lireLecteur(url: string, x: Bloc, ancien: Lu, effacee: boolean) {
    const titreLibre = texteLibre(x, ancien, effacee);
    const imageLibre = !aMoi.current.has('image') && (!x.image || x.image === ancien.image || effacee);
    if (!titreLibre && !imageLibre) return;
    const pareil = (avant: Bloc) => adresseSaisie(avant.url) === url && avant.type === x.type;
    setLecture(true);
    if (imageLibre) setVisuelEnCours(true);
    try {
      const site = await apercuSite(url, imageLibre ? 'partage' : false);
      const titre = site.titre.slice(0, 80);
      if (titre && titreLibre) {
        lu.current.titre = titre;
        setB(avant => (pareil(avant) && avant.titre === x.titre ? { ...avant, titre } : avant));
      }
      if (imageLibre) {
        const forme = x.type === 'musique' ? 'carre' as const : lecteurDe(url)?.forme === 'vertical' ? 'galerie' as const : 'large' as const;
        const image = site.image ? await envoyerVisuel(site.image, 'partage', forme) : '';
        genreImage.current = 'partage';
        lu.current.image = image;
        setB(avant => (pareil(avant) && avant.image === x.image ? { ...avant, image } : avant));
      }
    } catch { /* le titre de départ et le logo du service suffisent */ }
    finally { setLecture(false); setVisuelEnCours(false); }
  }

  // L'adresse tapée se relit d'elle-même dès qu'on cesse de taper : « Terminé » trouve le texte et l'image déjà là.
  // Une adresse arrivée toute faite (collée sur la page ou dans Ajouter) se lit tout de suite.
  useEffect(() => {
    if (!TYPES_ADRESSE.includes(b.type)) return;
    const url = adresseSaisie(b.url);
    if (!url || url === lu.current.url) return;
    const t = setTimeout(() => void lireAdresse(b.url), immediat.current ? 0 : 900);
    immediat.current = false;
    return () => clearTimeout(t);
  }, [b.url, b.type]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Le texte qu'un bloc garde en changeant de type : celui qu'on a tapé, et celui d'un bloc déjà posé, sauf s'il n'était
   * que le texte de départ, le titre lu sur le site ou le nom du site (« Calendly » pour un agenda) : le nouveau type prend
   * alors le sien (« Prendre rendez-vous »). Celui d'un bloc neuf venait de son site.
   */
  function garderTexte() {
    if (aMoi.current.has('titre')) return true;
    const t = b.titre.trim().toLowerCase();
    if (nouveau || !t) return false;
    const url = adresseSaisie(b.url);
    const venus = [nouveauBloc(b.type, b.id).titre, lu.current.titre, ...(url ? [nomSite(url), nomAgenda(url), nomSoutien(url), hoteDe(url)] : [])];
    return !venus.some(v => v.trim().toLowerCase() === t);
  }
  /**
   * Chaque type pris depuis l'ouverture, tel qu'on l'a quitté : revenir à un type déjà vu, sur la même adresse, rend le bloc
   * à l'identique (son texte, son sous-titre, son image, sa description), sans relire le site. Ce que tous les types ont et
   * qu'on a pu régler entre-temps reste : la visibilité, les dates, le public.
   */
  const versions = useRef(new Map<TypeBloc, { bloc: Bloc; lu: Lu; genre: VisuelApercu | 'photo' | null }>());
  /** Un lien mis en avant devenu « Me soutenir » : sa mise en avant attend qu'il redevienne un lien, et la feuille le dit. */
  const [vedettePerdue, setVedettePerdue] = useState(false);
  function changerType(t: TypeAdresse) {
    vibrer(6);
    const avant = b;
    setVedettePerdue(t === 'soutien' && (avant.vedette || (avant.type === 'soutien' && vedettePerdue)));
    versions.current.set(avant.type, { bloc: avant, lu: { ...lu.current }, genre: genreImage.current });
    const v = versions.current.get(t);
    setErreurs({});
    if (v && adresseSaisie(v.bloc.url) === adresseSaisie(avant.url)) {
      lu.current = { ...v.lu };
      genreImage.current = v.genre;
      setB({ ...v.bloc, url: avant.url, public: avant.public, indexable: avant.indexable, vedette: t !== 'soutien' && (avant.type === 'soutien' ? v.bloc.vedette : avant.vedette),
        debut: avant.debut, fin: avant.fin, compteARebours: avant.compteARebours, creneau: avant.creneau, audience: avant.audience, cache: avant.cache });
      return;
    }
    // Le titre lu sur une page YouTube est celui de la vidéo : un lien qui en devient une le garde, au lieu de « Ma vidéo ».
    const texteGarde = garderTexte() || (t === 'video' && !!lu.current.titre && avant.titre === lu.current.titre);
    lu.current = { ...lu.current, url: '' };
    immediat.current = true;
    setB(versType(avant, t, texteGarde));
  }
  /** « En faire un simple lien » : le bloc cesse de suivre son adresse, et redevient le lien qu'il était, ou un lien qui lit son site. */
  function enSimpleLien() {
    auto.current = false;
    changerType('lien');
  }
  /**
   * « En faire une prise de rendez-vous », « … un produit » (24 octobre 2026) : un lien déjà posé, ou rendu simple lien,
   * prend d'un geste le bloc que son adresse appelle, et son site se relit pour lui (le nom, le prix et la photo d'un produit).
   */
  const enType = (t: TypeAdresse) => changerType(t);
  /**
   * L'ancienne « Ma newsletter » de Lilian ne s'ajoute plus (24 octobre 2026) : son bloc mène d'un geste à la liste e-mail
   * qui la remplace, avec son texte s'il est à lui, son sous-titre, ses dates et son public. La main passe à son texte.
   */
  function enListeEmail() {
    vibrer(6);
    setB(x => versType(x, 'inscription', x.titre.trim() !== nouveauBloc('newsletter', x.id).titre));
    requestAnimationFrame(() => { if (!document.activeElement || document.activeElement === document.body) focusSaisie(document.getElementById('bloc-titre'), { preventScroll: true }); });
  }
  // Au retour d'un achat, le lien d'où l'on était parti prend le bloc qu'on voulait en faire.
  useEffect(() => {
    if (enFaire && b.type === 'lien' && !b.partenariat && adresseSaisie(b.url)) changerType(enFaire);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Un lien déjà posé vers une page qui déclare un prix (une boutique que son adresse ne dit pas) : relu une fois en
  // s'ouvrant, il propose d'en faire son produit, comme un lien neuf qui la lit.
  useEffect(() => {
    const url = adresseSaisie(bloc.url);
    if (nouveau || bloc.type !== 'lien' || bloc.partenariat || !url || typeDeAdresse(url, true) !== 'lien' || reseauDeUrl(url) || appDe(url)) return;
    const deja = PRIX_LUS.get(url);
    if (deja !== undefined) { if (deja) setBoutique(url); return; }
    let ouvert = true;
    apercuSite(url, false).then(site => { const prix = !!(site.prix && site.titre); PRIX_LUS.set(url, prix); if (prix && ouvert) setBoutique(url); }).catch(() => {});
    return () => { ouvert = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Le bloc qui change de type, ou devient un lien partenaire, le dit aux lecteurs d'écran : son nom, en tête, a changé.
  const [annonce, setAnnonce] = useState('');
  const vu = useRef({ type: b.type, partenaire: !!b.partenariat });
  useEffect(() => {
    const avant = vu.current;
    vu.current = { type: b.type, partenaire: !!b.partenariat };
    if (b.type !== avant.type && b.type in DEVENU) setAnnonce(`C’est maintenant ${DEVENU[b.type as TypeAdresse]}${b.type === 'soutien' && vedettePerdue ? ', qui ne se met pas en avant' : ''}.`);
    else if (b.type !== avant.type && b.type === 'inscription') setAnnonce('C’est maintenant une liste e-mail.');
    else if (!b.partenariat && avant.partenaire) setAnnonce('Ce n’est plus un lien partenaire.');
    else if (b.partenariat && !avant.partenaire) setAnnonce(`C’est maintenant un lien partenaire, avec la mention « ${b.partenariat.mention === 'collaboration' ? 'Collaboration commerciale' : 'Publicité'} ».`);
  }, [b.type, b.partenariat]);

  // Un geste sous l'adresse change le bloc et disparaît avec lui : la main passe au geste qui le remplace (« En faire un
  // simple lien »), ou à la mention d'un lien devenu partenaire, pour qu'un clavier ne reparte pas du haut de la page.
  // Le geste qui revient peut attendre la relecture du site : s'il ne vient pas, la main va au champ de l'adresse.
  const gestes = useRef<HTMLDivElement>(null);
  const apresGeste = useRef<{ suite: 'type' | 'partenaire'; avant: number } | null>(null);
  useEffect(() => {
    const attente = apresGeste.current;
    if (!attente) return;
    const ici = document.activeElement;
    // Le clavier ou la souris ont repris la main entre-temps : on la leur laisse.
    if (ici && ici !== document.body) { apresGeste.current = null; return; }
    const cible = attente.suite === 'partenaire'
      ? document.querySelector<HTMLElement>('[aria-label="Mention du lien partenaire"] [aria-checked="true"]')
      : gestes.current?.querySelector<HTMLElement>('button');
    if (cible) { apresGeste.current = null; cible.focus({ preventScroll: true }); return; }
    const t = setTimeout(() => {
      if (apresGeste.current !== attente) return;
      apresGeste.current = null;
      if (document.activeElement === document.body) focusSaisie(document.getElementById('bloc-adresse'), { preventScroll: true });
    }, Math.max(0, attente.avant - Date.now()));
    return () => clearTimeout(t);
  });

  /** La mention et le code d'un lien qui cesse d'être partenaire : rallumé, il les retrouve. */
  const partenariatGarde = useRef<Partenariat | null>(bloc.partenariat);

  /**
   * Fermer d'un glissé, d'Échap, de la croix ou d'un toucher à côté garde ce qui a changé, comme partout ailleurs. Un bloc
   * neuf aussi, mais masqué (24 octobre 2026, choisi par Lilian) : une adresse collée ne se perd pas d'un geste, et rien ne
   * part en ligne sans « Ajouter à ma page ». Le message le dit, avec « Afficher ».
   */
  function fermerEnGardant() {
    if (commence()) {
      const v = valider();
      if (!v) { vibrer(20); return; }
      if (!memeBloc(v, enregistre.current)) return ecrireEnRoute(v, bureau ? { discret: true } : undefined);
    }
    onFermer();
  }
  // Au bureau, Échap replie la rangée en gardant ce qui a changé, où que soit le focus (sauf dans un autre champ de la page,
  // une fenêtre ouverte ou un bloc qu'on déplace au clavier : Échap y a déjà son sens).
  const fermerRef = useRef(fermerEnGardant);
  fermerRef.current = fermerEnGardant;
  useEffect(() => {
    if (!bureau) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('[role="dialog"][aria-modal="true"], .adm-rangee[data-glisse]')) return;
      const ici = document.activeElement;
      if (ici?.closest('input, textarea, select, [contenteditable]') && !racine.current?.contains(ici)) return;
      e.preventDefault();
      fermerRef.current();
    };
    document.addEventListener('keydown', touche);
    return () => document.removeEventListener('keydown', touche);
  }, [bureau]);
  /** Un changement pas valable, neuf ou pas : la feuille reste ouverte et l'erreur dit quoi faire, rien ne se perd en silence. */
  const retenir = () => commence() && !valider();
  // « Voir les offres » ouvre les offres par-dessus le bloc, qui reste ouvert dessous (la feuille au téléphone, la rangée au
  // bureau) : on le retrouve en les fermant. Ce qui y est tapé part avant le paiement, et le bloc revient après l'achat.
  // Un bloc neuf part masqué chez Creem (`masque`) : au retour, il se rouvre à ajouter, comme on l'avait laissé (`neuf`).
  const offre = { droits, voirOffres: voir && ((f?: Fonction, suite?: SuiteAchat) => { if (retenir()) return; voir(f, { ...suite, bloc: bloc.id, ...(nouveau ? { neuf: true as const } : {}) }); }) };

  /** Une copie juste en dessous : ce qui est tapé s'écrit d'abord, la copie le reprend. */
  function dupliquer() {
    const v = commence() ? valider() : enregistre.current ?? bloc;
    if (!v) return;
    sansMessage.current = true;
    if (commence()) { brut.current = b; if (!memeBloc(v, enregistre.current)) { enregistre.current = v; onEnregistrer(v, { garder: true, discret: true }); } }
    onDupliquer(v);
  }
  // Retirer reprend la version enregistrée : « Annuler » dans le message remet celle-là, jamais un champ à moitié tapé.
  const retirer = () => { sansMessage.current = true; onSupprimer(enregistre.current ?? bloc); };
  /*
   * Au bureau, chaque changement s'écrit seul : replier la rangée (Échap, son en-tête, un autre bloc, un autre onglet) dit
   * alors « Modifications enregistrées », comme la croix au téléphone, et Annuler remet le bloc tel qu'il était à son
   * ouverture. Rien de changé, rien à dire ; un bloc dupliqué ou retiré a son propre message.
   */
  const sansMessage = useRef(false);
  const replierRef = useRef(onReplier);
  replierRef.current = onReplier;
  useEffect(() => () => {
    const avant = depart.current, apres = enregistre.current;
    if (bureau && !sansMessage.current && avant && apres && !memeBloc(norme(avant), norme(apres))) replierRef.current?.(avant);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  /**
   * Au bureau, « Ajouter à ma page » pose le bloc et garde sa rangée dépliée : on continue de le régler. Le bouton part avec
   * le pied d'un bloc neuf : le focus reste dans la rangée, sur le premier geste du pied d'un bloc posé, à la même place.
   */
  const apresAjout = useRef(false);
  // Au bureau, un bloc neuf arrivé avec son adresse (collée, ou prise dans le choix) : la main va à son texte, que le site remplit.
  useEffect(() => {
    if (!bureau || !nouveau || !bloc.url) return;
    const t = requestAnimationFrame(() => { if (!document.activeElement || document.activeElement === document.body) focusSaisie(document.getElementById('bloc-titre'), { preventScroll: true }); });
    return () => cancelAnimationFrame(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  function ajouter() {
    const v = valider();
    if (!v) return;
    vibrer(12);
    setB(v); brut.current = v; enregistre.current = v; depart.current = v;
    apresAjout.current = true;
    onEnregistrer(v, { garder: true });
  }
  useEffect(() => {
    if (nouveau || !apresAjout.current) return;
    apresAjout.current = false;
    const ici = document.activeElement;
    if (!ici || ici === document.body) racine.current?.querySelector<HTMLElement>('.adm-editeur-pied button')?.focus({ preventScroll: true });
  }, [nouveau]);

  // Un bloc neuf porte le nom de son genre (« Lien », « Me soutenir ») : il est déjà sur la page, son pied dit « Ajouter à ma
  // page ». Un bloc posé porte son nom à lui, tel qu'il est en train de s'écrire (« Le blog », « Prendre rendez-vous » pour un
  // lien Calendly qui vient d'en devenir un) : on sait lequel est ouvert. Un texte, une preuve ou la dernière vidéo gardent
  // celui de leur genre, leur « titre » n'étant pas un nom.
  const sonNom = ['texte', 'preuve', 'derniere-video'].includes(b.type) ? '' : b.type === 'lieu' ? b.titre.trim() || b.adressePostale.split('\n')[0].trim() : b.titre.trim();
  const titre = nouveau ? type.nom : [sonNom || type.nom, !b.public && 'masqué', horsCreneauOuDates(b, !!droits.heure) && 'programmé'].filter(Boolean).join(' · ');
  const ligne = 'flex min-h-11 items-center gap-2 bureau:min-h-9';

  const grilleIcones = icones && (
    // Toutes les icônes d'un coup, sans boîte qui défile dans la feuille qui défile : le pouce ne fait bouger que la feuille.
    <div role="radiogroup" onKeyDown={e => flechesRadio(e, false)} aria-label="Icône" className="adm-groupe grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1.5 p-2 bureau:grid-cols-[repeat(auto-fill,minmax(36px,1fr))]">
      {[{ nom: '', libelle: 'Sans icône' }, ...RESEAUX.map(r => ({ nom: r as string, libelle: NOMS_RESEAUX[r] })), ...PICTOS].map(p => {
        // Une image en place n'est pas « Sans icône » : rien n'est coché tant qu'elle est là.
        const choisi = p.nom ? b.icone === p.nom : !b.icone && !b.image;
        return (
          // L'icône seule, sans fond derrière elle : la prise passe au bleu, un point dessous.
          // Une icône choisie prend la place de l'image, qui passerait devant elle sur la page.
          <button key={p.nom || 'sans'} type="button" role="radio" aria-checked={choisi} aria-label={p.libelle} title={p.libelle} onClick={() => { vibrer(4); maj(p.nom && b.image ? { icone: p.nom, image: '' } : { icone: p.nom }); setIcones(false); }}
            className={`relative grid aspect-square place-items-center rounded-xl transition duration-150 active:scale-90 bureau:rounded-lg ${choisi ? 'text-bleu after:absolute after:bottom-0.5 after:h-1 after:w-1 after:rounded-full after:bg-bleu' : 'text-white/75 hover:text-white'}`}>
            <Icone nom={p.nom || 'ui-aucun'} taille={20} />
          </button>
        );
      })}
      {b.icone && !ICONES[b.icone] && <span className="relative grid aspect-square place-items-center text-xl after:absolute after:bottom-0.5 after:h-1 after:w-1 after:rounded-full after:bg-bleu" aria-label="Emoji actuel">{b.icone}</span>}
    </div>
  );
  const champFichier = <input ref={fichier} type="file" accept="image/*" className="adm-fichier" tabIndex={-1} aria-hidden="true" onChange={e => choisirImage(e.target.files?.[0])} />;
  const erreurImage = erreurDe('image') && <p role="alert" className="text-[13px] font-medium text-red-300">{erreurDe('image')}</p>;
  const description = ((b.type === 'lien' && b.vedette && b.format !== 'bouton') || (b.type === 'produit' && b.vedette)) && (
    <Champ label="Description (facultatif)" aide={b.type === 'produit' ? 'Trois lignes au plus sous le nom du produit.' : b.format === 'carte' ? 'Trois lignes au plus sous le titre de la carte.' : 'Deux lignes au plus sous le titre.'}>
      <textarea className={`${classeSaisie} min-h-20`} value={b.description} onChange={e => maj({ description: e.target.value })} maxLength={400}
        placeholder="Ce qu’on trouve en cliquant, en une ou deux phrases." />
    </Champ>
  );
  // Ce que disent, sans s'ouvrir, la ligne de l'apparence d'un bloc mis en avant et celle de son animation.
  const resumeAnimation = b.animation === 'auto' ? 'Comme ma page' : NOMS_ANIMATIONS[b.animation].nom;
  const resumeApparence = b.type === 'produit' ? 'Grande carte' : `${NOMS_FORMES[b.format]}, ${b.teinte === 'accent' ? 'couleur d’accent' : 'comme les autres'}`;
  const formeCouleur = b.type === 'lien' && b.vedette && (
    <div className="grid gap-3">
      <div>
        <span className="mb-1.5 block text-[13px] font-medium text-white/70">Forme</span>
        <Segments label="Forme du lien mis en avant" valeur={b.format} onChange={v => maj({ format: v })}
          options={[{ id: 'bouton', nom: 'Bouton' }, { id: 'bandeau', nom: 'Bandeau' }, { id: 'carte', nom: 'Carte' }]} />
      </div>
      <div>
        <span className="mb-1.5 block text-[13px] font-medium text-white/70">Couleur</span>
        <Segments label="Couleur du lien mis en avant" valeur={b.teinte} onChange={v => maj({ teinte: v })}
          options={[{ id: 'accent', nom: 'Accent' }, { id: 'theme', nom: 'Comme les autres' }]} />
      </div>
    </div>
  );
  const animation = (b.type === 'lien' || b.type === 'produit' || b.type === 'reservation') && b.vedette && (
    <Repli id="animation" depuis="apparence" sous key={`animation-${b.id}`} titre="Animation" icone="eclair" resume={resumeAnimation} regle={b.animation !== 'auto'} ouvert={false}>
      {/* Une liste, pas une rangée de pastilles : le bloc sur la page joue l'animation choisie. */}
      <ListeChoix label="Animation" valeur={b.animation} onChange={a => maj({ animation: a })}
        options={ANIMATIONS_BLOC.map(a => a === 'auto'
          ? { id: a, nom: nomAuto }
          : { id: a, nom: NOMS_ANIMATIONS[a].nom })} />
    </Repli>
  );
  /** « Mis en avant » vient d'être allumé : au bureau, son apparence arrive dépliée, on voit ce qu'il ouvre. */
  const vedetteAllumee = useRef(false);
  const enAvant = !['titre', 'texte', 'newsletter', 'inscription', 'preuve', 'soutien', 'faq', 'coordonnees', 'lieu', 'galerie', 'formulaire', 'flux'].includes(b.type);
  const aideVedette = b.type === 'produit' ? 'Une grande carte, de la couleur d’accent de ta page.' : b.type === 'reservation' ? 'De la couleur d’accent de ta page.' : 'En plus grand, de la couleur d’accent de ta page.';
  const vedette = (compact: boolean) => enAvant && <Interrupteur key="vedette" compact={compact} label="Mis en avant" aide={aideVedette} actif={b.vedette} onChange={v => { vedetteAllumee.current = v; maj({ vedette: v }); }} />;
  const bascules = (compact: boolean, sansVedette = false) => [
    b.type === 'inscription' && <Interrupteur key="prenom" compact={compact} label="Demander le prénom" actif={b.demanderPrenom} onChange={v => maj({ demanderPrenom: v })} />,
    !sansVedette && vedette(compact),
    // Un lien qui devient partenaire prend sa mention ; éteint puis rallumé, il retrouve celle d'avant, et son code.
    (b.type === 'lien' || b.type === 'produit') && (
      <Interrupteur key="partenaire" compact={compact} label="Lien partenaire" actif={!!b.partenariat}
        onChange={v => { if (!v) partenariatGarde.current = b.partenariat; maj({ partenariat: v ? partenariatGarde.current ?? PARTENARIAT_NEUF : null }); }} />
    ),
    b.type === 'lien' && principal && <Interrupteur key="google" compact={compact} label="Visible par Google" actif={b.indexable} onChange={v => maj({ indexable: v })} />,
    // Pour tous les comptes : la page demande au visiteur s'il a 18 ans avant d'ouvrir le lien.
    (b.type === 'lien' || b.type === 'produit') && <Interrupteur key="sensible" compact={compact} label="Réservé aux plus de 18 ans" actif={b.sensible} onChange={v => maj({ sensible: v })} />,
  ].filter(Boolean);
  // La visibilité, une ligne de la première page du bloc qui mène à sa page ; l'accès réservé, rare, derrière « Plus de réglages ».
  const visibilite = <ReglageVisibilite key={`visibilite-${b.id}`} b={b} maj={maj} erreur={erreurDe('dates')} reseaux={reseauxDePartage(reglages.vuesReseaux)} />;
  const acces = b.type === 'lien' && <RegleAcces key={`acces-${b.id}`} b={b} maj={maj} prises={prises} />;
  const dejaVisible = resumeVisibilite(b, !!droits.heure, !!droits.pays);
  // Un cran plus haut ou plus bas, au téléphone comme au bureau (où la poignée de la rangée le fait aussi).
  const fleche = (sens: -1 | 1) => place && onDeplacer && (
    <button type="button" disabled={sens < 0 ? place.rang === 0 : place.rang === place.total - 1} onClick={() => onDeplacer(enregistre.current ?? b, sens)} aria-label={sens < 0 ? 'Monter d’un cran' : 'Descendre d’un cran'}
      className="grid h-11 w-10 place-items-center text-white/75 hover:text-white disabled:text-white/25">
      <Icone nom={sens < 0 ? 'ui-monter' : 'ui-descendre'} taille={18} />
    </button>
  );

  // Ce que fera l'adresse, dit sous son champ : l'app qui s'ouvre, l'agenda dans la page, le site où l'on paie.
  const ok = (texte: string) => <span className="inline-flex items-center gap-1.5 text-white/75"><Icone nom="ui-ok" taille={13} className="shrink-0" />{texte}</span>;
  const app = b.type === 'lien' && reglages.ouvrirApps ? appDe(adresse(b.url)) : null;
  // Avant l'adresse, l'aide d'un bloc neuf, sous le champ qui l'attend : les sites qui conviennent (agendas, soutiens,
  // boutiques) ; pour un lien, ce qu'une adresse collée devient, puisque le choix des blocs ne nomme plus ces blocs-là.
  const aideNeuf = !nouveau ? undefined
    : b.type === 'lien' && !b.partenariat ? (droits.vitrine ? 'Colle une vidéo, une musique, un agenda, un produit ou une page de soutien : le bloc s’adapte.' : 'Colle une vidéo ou une musique : elle se lit dans ta page.')
    : type.aide && `${type.aide}.`;
  // Une fois l'adresse là, une ligne cochée dit ce qu'elle fera, pour chaque bloc qui mène quelque part : la même forme partout.
  const aideType = app ? ok(`Ce lien s’ouvre directement dans l’app ${app}, même depuis ${['Instagram', 'TikTok'].filter(n => n !== app).join(' ou ')}.`)
    : !adresseValide ? aideNeuf
    : adresseValide.startsWith('tel:') ? ok('Un toucher appelle ce numéro.')
    : adresseValide.startsWith('mailto:') ? ok(`Un toucher écrit à ${adresseValide.slice(7)}.`)
    : b.type === 'video' ? ok('La vidéo se lit dans ta page, sans la quitter.')
    : b.type === 'derniere-video' ? ok('Ta vidéo la plus récente se lit dans ta page, et change seule à chaque publication.')
    : b.type === 'flux' ? ok('Tes trois derniers articles s’affichent, et se mettent à jour seuls.')
    : b.type === 'musique' ? ok(`Le lecteur${lecteurDe(adresseValide) ? ` ${lecteurDe(adresseValide)!.nom}` : ''} s’ouvre dans ta page, sans la quitter.`)
    : b.type === 'reservation' ? ok(seIntegre(adresseValide) ? 'La réservation s’ouvre dans ta page, sans la quitter.' : `${nomAgenda(adresseValide)} s’ouvre sur son site.`)
    : b.type === 'soutien' ? ok(avecMontants(adresseValide) ? 'Tes visiteurs choisissent un montant, puis paient sur PayPal.'
      : soutienDe(adresseValide) ? `Tes visiteurs choisissent le montant sur ${nomSoutien(adresseValide)}.` : `Tes visiteurs te soutiennent sur ${nomSoutien(adresseValide)}.`)
    // Une boutique, un stage, un atelier : la page montre la photo et le prix, et mène à la fiche, où l'on achète ou réserve.
    : b.type === 'produit' ? ok(`Sa photo et son prix s’affichent, et il mène à ${nomSite(adresseValide) || hoteDe(adresseValide)}.`)
    : undefined;
  const champAdresse = avecUrl && (
    <Champ label={b.type === 'derniere-video' ? 'Adresse de ta chaîne YouTube' : b.type === 'flux' ? 'Adresse de ton blog ou de son flux RSS' : b.type === 'video' ? 'Adresse de la vidéo' : b.type === 'musique' ? 'Adresse du titre, de l’album ou du podcast' : b.type === 'produit' ? 'Adresse du produit' : b.type === 'reservation' ? 'Adresse de ton agenda' : b.type === 'soutien' ? 'Adresse de ta page de soutien' : 'Adresse'} erreur={erreurDe('url')} aide={aideType}>
      <input id="bloc-adresse" className={classeSaisie} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off"
        placeholder={b.type === 'derniere-video' ? 'https://youtube.com/@…' : b.type === 'video' ? 'https://youtu.be/…' : b.type === 'musique' ? 'https://open.spotify.com/…' : b.type === 'soutien' ? 'https://paypal.me/…' : b.type === 'reservation' ? 'https://calendly.com/…' : 'https://…'}
        value={b.url} onChange={e => { if (!e.target.value.trim()) efface.current = true; maj({ url: e.target.value }); }} onBlur={() => lireAdresse()} autoFocus={focusAuto(nouveau && !bloc.url)}
        onPaste={e => { const texte = e.clipboardData.getData('text'); if (!b.url.trim() && adresseSaisie(texte)) setTimeout(() => lireAdresse(texte)); }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('bloc-titre')?.focus(); } }} />
    </Champ>
  );
  /*
   * Ce que l'adresse d'un lien appelle (24 octobre 2026) : une vidéo, un agenda, une page de soutien, une fiche de
   * boutique, ou une page lue qui déclare un prix. Un lien neuf qui suit son adresse le devient tout seul ; un lien déjà
   * posé, ou rendu simple lien, le propose d'un geste ; sans Starter, la vitrine dit ce que l'offre en ferait. Un lien
   * partenaire reste un lien.
   */
  const appel = ((): TypeAdresse => {
    if (b.type !== 'lien' || b.partenariat || !adresseValide) return 'lien';
    const t = typeDeAdresse(adresseValide, true);
    // Une chaîne YouTube, un flux RSS : le lien propose d'en faire la dernière vidéo, les derniers articles.
    return t === 'lien' && boutique === adresseValide ? 'produit' : t === 'lien' ? suggestion(adresseValide) ?? 'lien' : t;
  })();
  const appelLibre = appel === 'video' || appel === 'musique' || appel === 'derniere-video' || (appel === 'flux' ? !!droits.flux : !!droits.vitrine);
  const proposer = appel !== 'lien' && appelLibre && !auto.current;
  const phraseVitrine = appel === 'lien' || appelLibre || !adresseValide ? ''
    : appel === 'flux' ? 'Avec Hopla Pro, ce lien devient tes trois derniers articles, toujours à jour.'
    : appel === 'reservation' ? (seIntegre(adresseValide) ? `Avec Hopla Starter, ton agenda ${nomAgenda(adresseValide)} s’ouvre dans ta page, sans la quitter.` : 'Avec Hopla Starter, ce lien devient une prise de rendez-vous.')
    : appel === 'soutien' ? (avecMontants(adresseValide) ? 'Avec Hopla Starter, tes visiteurs choisissent un montant, puis paient sur PayPal.' : 'Avec Hopla Starter, ce lien devient un bouton « Me soutenir ».')
    : 'Avec Hopla Starter, ce produit s’affiche avec sa photo et son prix.';
  // Un bloc d'adresse (une vidéo, un agenda, un soutien, un produit), neuf ou posé, redevient d'un geste un simple lien (24 octobre
  // 2026) : la détection propose, elle ne décide pas. Le lien garde sa place et sa visibilité.
  const versLien = avecUrl && b.type !== 'lien' && !!adresseValide;
  // Ces gestes se posent sous le champ et hors de son libellé, pour que le lecteur d'écran ne les lise pas avec l'adresse.
  const geste = (texte: string, action: () => void, suite: 'type' | 'partenaire' = 'type') => (
    <button key={texte} type="button" onClick={() => { apresGeste.current = { suite, avant: Date.now() + 1500 }; action(); }} className="flex min-h-11 items-center text-[12.5px] font-medium text-white underline decoration-white/30 underline-offset-[3px] transition hover:decoration-white bureau:mt-0.5 bureau:min-h-0 bureau:py-1.5">{texte}</button>
  );
  // Une adresse d'affiliation (une régie, le tag d'Amazon…) : la loi demande la mention, le lien le propose d'un geste ; le
  // geste inverse prend sa place, sous l'adresse, plutôt que d'attendre dans « Plus de réglages ».
  const affilie = (b.type === 'lien' || b.type === 'produit') && !b.partenariat && web && lienAffilie(adresseValide);
  const pasPartenaire = (b.type === 'lien' || b.type === 'produit') && !!b.partenariat && !!adresseValide;
  const gestesAdresse = [
    versLien ? geste('En faire un simple lien', enSimpleLien) : proposer && geste(EN_FAIRE[appel], () => enType(appel)),
    affilie && geste('C’est un lien partenaire\u202f?', () => maj({ partenariat: partenariatGarde.current ?? PARTENARIAT_NEUF }), 'partenaire'),
    pasPartenaire && geste('Ce n’est pas un lien partenaire', () => { partenariatGarde.current = b.partenariat; maj({ partenariat: null }); }),
  ].filter(Boolean);
  // Un bouton « Me soutenir » ne se met pas en avant : un lien mis en avant qui en devient un le dit, sous son adresse.
  const noteVedette = b.type === 'soutien' && vedettePerdue && <p className="text-[12.5px] leading-snug text-white/55">Un bouton «\u202fMe soutenir\u202f» ne se met pas en avant.</p>;
  // Sans Starter, ce que l'offre ferait de l'adresse se dit juste sous elle, avant le texte.
  const vitrineSousAdresse = phraseVitrine && (appel === 'flux' ? <Reserve fonction="flux" phrase={phraseVitrine} />
    : <Reserve fonction="vitrine" type={appel as TypeVitrine} phrase={phraseVitrine} />);
  const champUrl = avecUrl && (gestesAdresse.length || noteVedette ? (
    <div>
      {champAdresse}
      {gestesAdresse.length > 0 && <div ref={gestes} className="flex flex-wrap items-center gap-x-4">{gestesAdresse}</div>}
      {noteVedette}
    </div>
  ) : champAdresse);
  /*
   * La vignette d'un lien ou la photo d'un produit, posée au début du champ de son texte (23 octobre 2026, demandé par
   * Lilian : « le bouton est trop gros […] un plus à côté, ou une icône très discrète, un crayon ») : l'image, l'icône
   * ou un picto d'image avec son plus, et un petit crayon ; un toucher ouvre ce qu'on peut en faire. Le site la donne de
   * lui-même : rien à aller chercher.
   */
  const produit = b.type === 'produit';
  // Un rendez-vous aussi (23 octobre 2026) : sa photo ou son icône, la même vignette ; sans elles, le picto que la page montre.
  // Son site est un agenda : ni son image ni son logo ne parlent de la personne, ils ne sont pas proposés.
  const rdv = b.type === 'reservation';
  // Un lecteur de musique : sa pochette, lue sur le service, ou une photo ; ni logo ni icône.
  const musique = b.type === 'musique';
  const avecVignette = b.type === 'lien' || produit || rdv || musique;
  const iconeVue = b.icone || (rdv ? 'bloc-reservation' : '');
  // Ce qui est en place, quand on sait d'où il vient (une image du site, son logo, une photo, une icône) : sa ligne est cochée
  // dans le menu, les autres le remplacent.
  const source = b.image ? genreImage.current : !produit && b.icone ? 'icone' : null;
  const coche = (de: (typeof source)[]) => (source ? de.includes(source) : undefined);
  const elementsVignette: ElementMenu[] = [
    ...(web && !rdv ? [{ nom: produit ? 'Photo de la boutique' : musique ? 'Pochette' : 'Image du site', coche: coche(['partage']), action: () => void prendreDuSite('partage') }] : []),
    ...(web && !produit && !rdv && !musique ? [{ nom: 'Logo du site', coche: coche(['logo']), action: () => void prendreDuSite('logo') }] : []),
    { nom: 'Choisir une photo', coche: coche(['photo']), action: () => choisirFichier(fichier.current, vignette.current) },
    ...(!produit && !musique ? [{ nom: 'Choisir une icône', coche: coche(['icone']), action: () => setIcones(true) }] : []),
    ...(b.image ? [{ nom: produit ? 'Retirer la photo' : musique ? 'Retirer la pochette' : 'Retirer l’image', action: () => maj({ image: '' }) }] : []),
    ...(!produit && !b.image && b.icone ? [{ nom: 'Retirer l’icône', action: () => maj({ icone: '' }) }] : []),
  ];
  const rempli = !visuelEnCours && (!!b.image || (!produit && !!iconeVue));
  const nomVignette = produit ? (b.image ? 'Photo du produit : la changer ou la retirer' : 'Ajouter la photo du produit')
    : musique ? (b.image ? 'Pochette : la changer ou la retirer' : 'Ajouter une pochette')
    : b.image ? 'Image du bouton : la changer ou la retirer' : b.icone ? `Icône du bouton, ${nomIcone} : la changer ou la retirer`
    : rdv ? 'Icône du bouton : la changer, ou choisir une photo' : 'Ajouter une image ou une icône';
  const case_ = 'grid h-7 w-7 shrink-0 place-items-center bureau:h-6 bureau:w-6';
  const vignetteChamp = avecVignette && (
    <div ref={vignette} className="absolute inset-y-0 left-0 flex items-center pl-1 bureau:pl-0.5">
      <Menu label={produit ? 'Photo du produit' : musique ? 'Pochette' : 'Vignette du bouton'} titre={nomVignette} elements={elementsVignette} aligne="gauche"
        className="flex h-11 items-center gap-[3px] rounded-lg px-1 text-white/45 transition hover:text-white/80 bureau:h-8">
        {visuelEnCours
          ? <span className={case_} aria-hidden="true"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/15 border-t-white/60 motion-reduce:animate-none" /></span>
          : b.image ? <img src={b.image} alt="" className="h-7 w-7 shrink-0 rounded-[7px] object-cover outline outline-1 -outline-offset-1 outline-white/10 bureau:h-6 bureau:w-6 bureau:rounded-md" />
          : !produit && iconeVue ? <span className={`${case_} text-white`}>{ICONES[iconeVue] ? <Icone nom={iconeVue} taille={20} /> : <span className="text-[18px] leading-none">{iconeVue}</span>}</span>
          : <span className={`${case_} text-white/55`}><Icone nom="ui-image-plus" taille={19} /></span>}
        {/* Le crayon dit qu'on peut changer ce qui est là ; vide, le plus du picto suffit. Sa place reste gardée. */}
        <span className="grid w-3 shrink-0 place-items-center">{rempli && <Icone nom="ui-crayon" taille={12} />}</span>
      </Menu>
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-3 left-[56px] w-px bg-white/10 bureau:inset-y-2.5 bureau:left-[47px]" />
      {champFichier}
    </div>
  );
  const champTitre = b.type !== 'derniere-video' && b.type !== 'preuve' && (avecVignette ? (
    <div>
      <label htmlFor="bloc-titre" className="mb-1.5 block text-[13px] font-semibold text-white">{produit ? 'Nom du produit' : musique ? 'Titre' : 'Texte du bouton'}</label>
      {/* Le champ d'abord, la vignette par-dessus : le libellé nomme le champ, pas le bouton de la vignette. Vide, il dit le
          nom que la page montre déjà, celui du site, en attendant sa lecture. */}
      <div className="relative">
        <input id="bloc-titre" className={`${classeSaisie} adm-field-vignette`} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={160} autoFocus={focusAuto(nouveau && !avecUrl)}
          aria-invalid={erreurDe('titre') ? true : undefined} aria-describedby={erreurDe('titre') ? idTitre : undefined}
          placeholder={lecture && !b.titre ? (produit ? 'Lecture de la boutique…' : 'Lecture du site…') : produit || musique ? '' : rdv ? nouveauBloc('reservation', b.id).titre : (adresseValide && nomSite(adresseValide)) || 'Mon super lien'} />
        {vignetteChamp}
      </div>
      {erreurDe('titre') && <span id={idTitre} role="alert" className="mt-1.5 block text-[13px] font-medium leading-snug text-red-300">{erreurDe('titre')}</span>}
      {erreurImage && <div className="mt-1.5">{erreurImage}</div>}
      {icones && !produit && (
        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-white">Icône</span>
            <button type="button" onClick={() => setIcones(false)} aria-label="Fermer les icônes" className="grid h-8 w-8 place-items-center rounded-lg text-white/55 transition hover:text-white bureau:h-7 bureau:w-7">
              <Icone nom="ui-fermer" taille={15} />
            </button>
          </div>
          {grilleIcones}
        </div>
      )}
    </div>
  ) : (
    <Champ erreur={erreurDe('titre')} label={b.type === 'texte' ? 'Texte' : b.type === 'video' ? 'Titre de la vidéo' : b.type === 'titre' ? 'Titre de la section'
      : b.type === 'coordonnees' ? 'Nom' : b.type === 'lieu' ? 'Nom du lieu (facultatif)' : b.type === 'galerie' ? 'Légende (facultatif)' : 'Titre'}>
      {b.type === 'texte'
        ? <textarea className={`${classeSaisie} min-h-28`} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={1000} autoFocus={focusAuto(nouveau)} />
        : <input id="bloc-titre" className={classeSaisie} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={160} autoFocus={focusAuto(nouveau && !avecUrl && b.type !== 'lieu' && b.type !== 'galerie')}
            autoComplete={b.type === 'coordonnees' ? 'name' : undefined}
            placeholder={b.type === 'soutien' || b.type === 'faq' || b.type === 'formulaire' || b.type === 'flux' ? nouveauBloc(b.type, b.id).titre : b.type === 'titre' ? 'Nouvelle section' : b.type === 'coordonnees' ? 'Marie Dupont' : ''} />}
    </Champ>
  ));
  // Un produit : son prix, lu sur la boutique comme son nom et sa photo ; il se corrige à la main.
  const champPrix = b.type === 'produit' && (
    <Champ label="Prix (facultatif)">
      <input className={classeSaisie} value={b.prix} onChange={e => maj({ prix: e.target.value })} maxLength={24} placeholder={lecture ? 'Lecture de la boutique…' : '24 €'} />
    </Champ>
  );
  // Un lien partenaire : la mention que la loi demande à tous, puis le code promo, avec Starter.
  const partenaire = b.partenariat && (
    <>
      <div>
        <span className="mb-1.5 block text-[13px] font-semibold text-white">Mention</span>
        <Segments label="Mention du lien partenaire" souple valeur={b.partenariat.mention} options={MENTIONS} onChange={v => maj({ partenariat: { ...b.partenariat!, mention: v } })} />
      </div>
      {droits.vitrine ? (
        <Champ label="Code promo (facultatif)">
          <input className={classeSaisie} value={b.partenariat.code} onChange={e => maj({ partenariat: { ...b.partenariat!, code: e.target.value } })} maxLength={40}
            autoCapitalize="characters" autoCorrect="off" spellCheck={false} placeholder="BIENVENUE10" />
        </Champ>
      ) : (
        <div>
          <span className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-white">Code promo <Etiquette fonction="vitrine" /></span>
          {/* Un produit non compris dans l'offre dit déjà, plus haut, où voir les offres : un seul chemin par endroit. */}
          <Reserve fonction="vitrine" bouton={!type.fonction} phrase={b.partenariat.code
            ? `Ton code ${b.partenariat.code} n’est pas montré sans Hopla Starter. Il revient dès que tu la prends.`
            : 'Avec Hopla Starter, ton code promo s’affiche sous le lien, et se copie d’un geste.'} />
        </div>
      )}
    </>
  );
  // Au bureau, l'adresse et son texte côte à côte, comme dans la maquette A2 : la rangée dépliée reste courte.
  const paire = bureau && !!champUrl && !!champTitre;
  // Sous le texte, ce que la page montre encore du bloc : son sous-titre, et les montants de « Me soutenir » chez PayPal.
  // Le sous-titre sert rarement : vide, il attend derrière une ligne, et les gestes courants restent à portée. Celui d'un
  // rendez-vous se montre toujours, puisque la page dit son agenda tant qu'il est vide. Demandé, le champ ne prend la main
  // qu'au bureau : au téléphone, le clavier ne monte pas tout seul. Effacé en cours de frappe, il reste ouvert.
  const avecSousTitre = ['lien', 'newsletter', 'inscription', 'soutien', 'reservation', 'musique', 'formulaire'].includes(b.type);
  const champSousTitre = avecSousTitre && (b.sousTitre || sousTitreDemande || b.type === 'reservation' ? (
    <Champ label="Sous-titre (facultatif)">
      <input className={classeSaisie} value={b.sousTitre} onChange={e => { setSousTitreDemande(true); maj({ sousTitre: e.target.value }); }} maxLength={240} autoFocus={focusAuto(sousTitreDemande && !b.sousTitre)}
        placeholder={b.type === 'reservation' && adresseValide ? nomAgenda(adresseValide) : ''} />
    </Champ>
  ) : (
    <button type="button" onClick={() => { vibrer(4); setSousTitreDemande(true); }}
      className="-my-1.5 flex min-h-11 items-center gap-2 self-start text-[13.5px] font-semibold text-bleu transition hover:text-[var(--adm-bleu-fonce)] bureau:min-h-8">
      <Icone nom="ui-plus" taille={15} className="shrink-0" />Ajouter un sous-titre
    </button>
  ));
  // Un cadeau contre l'e-mail (Pro, 24 octobre 2026) : un guide, un code, une vidéo ; son adresse ne s'ouvre qu'une fois
  // l'adresse e-mail donnée, et ne part jamais avec la page. Il sert rarement : il attend derrière une ligne, comme le sous-titre.
  const champCadeau = b.type === 'inscription' && (b.cadeau || cadeauDemande ? (
    <div className="flex flex-col gap-3">
      <span className="-mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-white">Le cadeau {!droits.cadeau && <Etiquette fonction="cadeau" />}</span>
      {!droits.cadeau && <Reserve fonction="cadeau" phrase="Sans Hopla Pro, ce cadeau n’est pas proposé sur ta page. Il revient dès que tu la prends." />}
      <div className={bureau ? 'adm-paire' : 'flex flex-col gap-3'}>
        <Champ label="Son nom">
          <input className={classeSaisie} value={b.cadeau?.nom ?? ''} onChange={e => maj({ cadeau: { url: b.cadeau?.url ?? '', nom: e.target.value } })} maxLength={80}
            placeholder="Mon guide en PDF" autoFocus={focusAuto(cadeauDemande && !b.cadeau)} />
        </Champ>
        <Champ label="Son adresse" erreur={erreurDe('cadeau')} aide="Elle ne s’ouvre qu’une fois l’e-mail donné.">
          <input className={classeSaisie} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="https://…" value={b.cadeau?.url ?? ''}
            onChange={e => maj({ cadeau: { nom: b.cadeau?.nom ?? '', url: e.target.value } })} />
        </Champ>
      </div>
    </div>
  ) : (
    <button type="button" onClick={() => { vibrer(4); if (!droits.cadeau && voir) { voir('cadeau'); return; } setCadeauDemande(true); }} aria-haspopup={droits.cadeau ? undefined : 'dialog'}
      className="-my-1.5 flex min-h-11 items-center gap-2 self-start text-[13.5px] font-semibold text-bleu transition hover:text-[var(--adm-bleu-fonce)] bureau:min-h-8">
      <Icone nom="ui-plus" taille={15} className="shrink-0" />Offrir un cadeau contre l’e-mail{!droits.cadeau && <Etiquette fonction="cadeau" />}
    </button>
  ));
  const champMontants = b.type === 'soutien' && avecMontants(adresseValide) && (
    <div>
      <span className="mb-1.5 block text-[13px] font-semibold text-white">Montants proposés, en euros</span>
      <div className="bureau:max-w-[360px]"><ChampMontants montants={b.montants} onChange={m => maj({ montants: m })} /></div>
    </div>
  );
  const compteClics = b.type === 'lien' || TYPES_VITRINE.includes(b.type);

  /** Le haut, commun aux deux formes : à quoi sert le bloc, ce qu'il a de particulier, puis ses champs essentiels. */
  const essentiel = (
    <>
      {/* Un bloc neuf sans adresse (une liste d'inscrits, un avis) dit d'abord, en une ligne, ce qu'on ne devine pas ; celui qui
          en a une le dit sous son champ, tant qu'il est vide. Rien quand c'est évident. */}
      {/* La liste e-mail dit déjà où vont ses inscrits, juste dessous : son aide ferait doublon. */}
      {nouveau && type.aide && !avecUrl && !(b.type === 'inscription' && droits.listeEmail) && <p className="text-[13.5px] leading-snug text-white/60">{type.aide}.</p>}
      {/* Un avis ou une liste gardés d'une offre passée : ils attendent, rien n'est perdu. */}
      {type.fonction && !droits[type.fonction] && <Reserve fonction={type.fonction} type={TYPES_VITRINE.includes(b.type) ? b.type as TypeVitrine : undefined}
        phrase={`Ce bloc n’est pas montré sur ta page sans Hopla ${offreDe(type.fonction)}. Il revient tel quel dès que tu la prends.`} />}
      {/* Une liste e-mail dit où partent ses inscrits, et mène à sa newsletter (25 octobre 2026, demandé par Lilian). */}
      {b.type === 'inscription' && droits.listeEmail && <DestinationListe />}
      {/* L'ancienne « Ma newsletter » : elle reste en ligne telle quelle, et dit ce qui la remplace, avec le geste pour y passer. */}
      {b.type === 'newsletter' && (
        <div className="flex flex-col items-start">
          <p className="text-[13.5px] leading-snug text-white/70">La liste e-mail remplace ce bloc : ses inscrits restent chez Hopla, et partent vers ta newsletter branchée dans Intégrations.</p>
          {geste('En faire une liste e-mail', enListeEmail)}
        </div>
      )}
      {paire ?<div className="adm-paire">{champUrl}{champTitre}</div> : champUrl}
      {/* Une adresse de la vitrine sans Starter : le lien reste un lien, et dit ce que l'offre en ferait, juste sous l'adresse. */}
      {vitrineSousAdresse}

      {/* Une note d'avis : le lien d'abord, la note se remplit toute seule quand la page la déclare (Trustpilot, Avis Vérifiés…). */}
      {b.type === 'preuve' && <ChampsPreuve b={b} maj={maj} erreurDe={erreurDe} lien={<LienAvis b={b} maj={maj} noteAvis={noteAvis} />} />}

      {b.type === 'preuve' && b.preuve?.genre !== 'note' && (
        <Champ label={b.preuve?.genre === 'compteur' ? 'Lien vers la source (facultatif)' : 'Lien vers les avis (facultatif)'}
          aide={b.preuve?.genre === 'compteur' ? 'Ta chaîne, ton profil : le bloc devient cliquable, et le chiffre vérifiable.' : 'Ta fiche Google, ta page Trustpilot : le bloc devient cliquable, et la preuve vérifiable.'}>
          <input className={classeSaisie} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="https://…" value={b.url} onChange={e => maj({ url: e.target.value })} />
        </Champ>
      )}
      {b.type === 'preuve' && <p className="text-[12.5px] leading-snug text-white/55">Des chiffres vrais, des avis réels, avec l’accord de leurs auteurs.</p>}

      {b.type === 'galerie' && <ChampsGalerie b={b} maj={maj} erreurDe={erreurDe} envoyerImage={envoyerImage} droit={!!droits.galerie} />}
      {b.type === 'lieu' && <ChampLieu b={b} maj={maj} erreurDe={erreurDe} nouveau={nouveau} />}
      {!paire && champTitre}
      {/* Une collection : les liens qui suivent ce titre, jusqu'au suivant, en liste ou en tuiles (Starter). */}
      {b.type === 'titre' && (
        <div>
          <span className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-white">Les liens dessous {!droits.grille && <Etiquette fonction="grille" />}</span>
          <Segments label="Les liens sous ce titre" valeur={b.disposition ?? 'liste'} options={DISPOSITIONS_NOMMEES}
            onChange={v => { if (v === 'grille' && !droits.grille && voir) return voir('grille'); maj({ disposition: v }); }} />
        </div>
      )}
      {b.type === 'faq' && <ChampsFaq b={b} maj={maj} erreurDe={erreurDe} />}
      {b.type === 'coordonnees' && <ChampsCoordonnees b={b} maj={maj} erreurDe={erreurDe} bureau={bureau} />}
      {/* La description d'un bandeau, d'une carte ou d'un produit mis en avant : la page la montre sous le titre dès que « Mis en
          avant » s'allume, souvent lue sur le site ; elle se lit et se corrige ici, sous le texte, là où l'œil est. */}
      {description}
      {champSousTitre}
      {champCadeau}
      {champMontants}
      {b.type === 'produit' && (bureau ? <div className="adm-paire">{champPrix}</div> : champPrix)}
      {partenaire}
      {b.type === 'derniere-video' && (
        <Champ label="Petit titre">
          <input className={classeSaisie} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={160} />
        </Champ>
      )}
      <span className="sr-only" aria-live="polite">{annonce}</span>
    </>
  );

  if (bureau) {
    const annulable = !nouveau && !!depart.current && !memeBloc(norme(b), norme(depart.current));
    return (
      <FournisseurOffre value={offre}>
      <RangeesCompactes.Provider value>
      <ReplisExclusifs.Provider value={{ ouvert: repli, poser: setRepli }}>
      {/* Un bloc neuf s'ajoute aussi de Cmd ou Ctrl + Entrée, comme le bouton principal d'une feuille. */}
      <div ref={racine} className="adm-editeur adm-editeur-ligne"
        onKeyDown={nouveau ? e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !envoi) { e.preventDefault(); ajouter(); } } : undefined}>
        {essentiel}
        {/* Les gestes courants après le texte, comme au téléphone : la visibilité, une ligne qui dit ce qui est réglé et se
            déplie en place (le bloc sur la page ou non, selon la date, l'heure, le réseau), puis « Mis en avant » et, juste
            sous lui, ce qu'il ouvre. Allumé à l'instant, l'apparence arrive dépliée. */}
        <div className="adm-reglages-groupe">
          <Repli key={erreurDe('dates') ? 'visibilite-erreur' : `visibilite-${b.id}`} titre="Visibilité" resume={dejaVisible} regle={dejaVisible !== 'Visible'}
            ouvert={!!erreurDe('dates') || regleAOuvrir === 'moment'} montrer={regleAOuvrir === 'moment'}>{visibilite}</Repli>
          {vedette(true)}
          {pageVedette(b) === 'apparence' && (
            <Repli key={`apparence-${b.id}`} titre="Apparence" icone="pinceau" resume={resumeApparence} ouvert={vedetteAllumee.current}>
              {/* L'animation se déplie dans l'apparence, sans la replier. */}
              {formeCouleur}<ReplisExclusifs.Provider value={null}>{animation}</ReplisExclusifs.Provider>
            </Repli>
          )}
          {pageVedette(b) === 'animation' && animation}
          {/* Ce que la page ne montre pas attend derrière une ligne de la même forme, qui dit ce qui est réglé : on sait quoi sans ouvrir. */}
          {!plusVide && <>
            <LigneRepli titre="Plus de réglages" resume={plus ? '' : reglees} regle={!!reglees} ouvert={plus} controle={idPlus} onClick={() => setPlus(!plus)} />
            {plus && (
              <div id={idPlus} className="adm-plus-contenu [&>div>div>label>span]:text-white/70">
                {bascules(true, true).length > 0 && <div className="flex flex-col">{bascules(true, true)}</div>}
                {acces}
              </div>
            )}
          </>}
        </div>

        {/* Le bas de la rangée : un bloc neuf s'ajoute ou s'oublie ; un bloc posé se duplique ou se retire, et revient d'un geste à ce qu'il était. */}
        <div className="adm-editeur-pied">
          {!nouveau && compteClics && clics > 0 && <p className="text-[12px] tabular-nums text-white/55">{clics.toLocaleString('fr-FR')} clic{clics > 1 ? 's' : ''} ces 30 derniers jours</p>}
          {nouveau ? (
            <div className="ml-auto flex items-center gap-2">
              {/* Le seul moyen d'oublier un bloc neuf : replier la rangée le garde, masqué, s'il est valable. */}
              <BoutonSecondaire onClick={onFermer}>Annuler</BoutonSecondaire>
              <BoutonPrincipal disabled={envoi} onClick={ajouter}>Ajouter à ma page</BoutonPrincipal>
            </div>
          ) : (
            <>
              {/* Le geste qui détruit à gauche, loin des autres ; la place et « Terminé » comme au téléphone (critique du 27 octobre 2026). */}
              <button type="button" onClick={retirer} className="mr-auto inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[14px] font-medium text-red-300 transition hover:bg-red-500/[0.06]">
                <Icone nom="ui-corbeille" taille={15} className="shrink-0" />Retirer de ma page
              </button>
              <div className="flex flex-wrap items-center justify-end gap-0.5">
                {annulable && (
                  <button type="button" onClick={() => {
                    // Le bloc revient tel qu'il était, sans relire son site ; le bouton disparaît, la main passe à Dupliquer.
                    lu.current = { ...lu.current, url: adresseSaisie(depart.current!.url) };
                    setB(depart.current!); setErreurs({}); vibrer(6); setAnnonce('Changements annulés.');
                    requestAnimationFrame(() => boutonDupliquer.current?.focus({ preventScroll: true }));
                  }} className={classeBouton.discret}>
                    <Icone nom="ui-retour" taille={15} className="shrink-0" />Annuler mes changements
                  </button>
                )}
                <button ref={boutonDupliquer} type="button" onClick={dupliquer} className={classeBouton.discret}><Icone nom="ui-copier" taille={15} className="shrink-0" />Dupliquer</button>
                {place && onDeplacer && place.total > 1 && (
                  <span className="adm-place inline-flex items-center pl-2 text-[13px] tabular-nums text-white/60">
                    Place {place.rang + 1} sur {place.total}{fleche(-1)}{fleche(1)}
                  </span>
                )}
                <BoutonPrincipal className="ml-2" onClick={onFermer}>Terminé</BoutonPrincipal>
              </div>
            </>
          )}
        </div>
      </div>
      </ReplisExclusifs.Provider>
      </RangeesCompactes.Provider>
      </FournisseurOffre>
    );
  }

  // Au téléphone, la feuille mène de page en page, sa flèche dans l'en-tête : l'essentiel, puis une page par règle (la visibilité,
  // l'apparence, « Plus de réglages »), et l'animation ou l'accès réservé un cran plus loin.
  const fil: FilFeuille | null = page === null ? null : {
    titre: NOMS_PAGES[page],
    label: parent(page) === 'plus' ? 'Revenir à Plus de réglages' : parent(page) === 'apparence' ? 'Revenir à Apparence' : 'Revenir au bloc',
    retour: () => allerA(parent(page)),
  };
  const groupe = 'adm-groupe flex flex-col divide-y divide-white/[0.06]';
  /** Une ligne de la première page qui mène à sa page : son nom, ce qui est réglé à droite (en bleu si c'est une règle), un chevron. */
  const ligneRegle = (id: PageRegle, valeur: string, regle: boolean) => (
    <button id={`regle-${id}`} type="button" onClick={() => { vibrer(4); allerA(id); }}
      className="flex min-h-12 w-full items-center gap-3 px-4 text-left transition hover:bg-white/[0.03] active:bg-white/[0.05]">
      <span className="shrink-0 text-[14.5px] font-semibold text-white">{NOMS_PAGES[id]}</span>
      <span className={`min-w-0 flex-1 truncate text-right text-[13.5px] ${regle ? 'font-medium text-bleu' : 'text-white/55'}`}>{valeur}</span>
      <Icone nom="ui-chevron" taille={16} className="-rotate-90 shrink-0 text-white/55" />
    </button>
  );
  const vedettePage = pageVedette(b);
  return (
    <FournisseurOffre value={offre}>
    {/* `cote` : la page reste visible au-dessus de la feuille, et le bloc s'y redessine à chaque frappe ; la feuille s'arrête sous lui.
        Un bloc neuf aussi : il est déjà sur la page, à la place qu'il prendra (voir MaPage). */}
    <Feuille ouverte cote classe="adm-feuille-bloc" plafond={plafond} onFermer={fermerEnGardant} retenir={retenir} titre={titre}
      // La flèche vers le choix des blocs, toujours à la même place (le retour du téléphone fait comme elle) : ce qui est tapé
      // la suit, l'adresse attend dans « Colle une adresse » et le bloc qu'on choisit la reprend, rien ne se perd.
      retour={nouveau && onRetour ? { label: 'Revenir au choix du bloc', action: () => onRetour(commence() ? b : null) } : undefined}
      pied={fermer => (
        <div className="flex items-center gap-2">
          {/* Fermer garde les changements (un bloc neuf, masqué) ; ce bouton est la seule façon de les oublier. */}
          {commence() && (
            <BoutonSecondaire onClick={() => fermer(() => onFermer())}>Annuler</BoutonSecondaire>
          )}
          {/* Rien de touché : Terminé referme, sans réécrire le bloc ni annoncer des modifications qui n'existent pas. */}
          <BoutonPrincipal className="flex-1" disabled={envoi} onClick={() => { if (!nouveau && !commence()) { vibrer(12); fermer(() => onFermer()); return; } const v = valider(); if (v) { vibrer(12); fermer(() => onEnregistrer(v)); } }}>
            {nouveau ? 'Ajouter à ma page' : 'Terminé'}
          </BoutonPrincipal>
        </div>
      )}>
      <FilPage fil={fil} />
      <PagesBloc.Provider value={{ page, ouvrir: allerA }}>
      {/* La première page reste montée sous les autres : rien ne s'y perd, et son champ ne reprend pas le focus au retour. */}
      <div hidden={page !== null} className="adm-editeur flex flex-col gap-4 pt-1">
        {essentiel}

        {/* Les gestes courants après le texte, à portée (Lilian, 22 et 24 octobre 2026) : la visibilité, une ligne qui dit ce
            qui est réglé et mène à sa page (le bloc sur la page ou non, selon la date, l'heure, le réseau), puis « Mis en
            avant », qui pose juste sous lui la ligne de ce qu'il ouvre : l'apparence, ou l'animation d'un rendez-vous. */}
        <div className={groupe}>
          {ligneRegle('visibilite', dejaVisible, dejaVisible !== 'Visible')}
          {enAvant && <div className="px-4"><Interrupteur label="Mis en avant" actif={b.vedette} onChange={v => maj({ vedette: v })} /></div>}
          {vedettePage && ligneRegle(vedettePage, vedettePage === 'apparence' ? resumeApparence : resumeAnimation, vedettePage === 'animation' && b.animation !== 'auto')}
        </div>

        {/* Ce que la page ne montre pas attend derrière une seule ligne, qui dit ce qui est réglé ; elle mène à sa page, la flèche de l'en-tête ramène. */}
        {!plusVide && (
          <div className={groupe}>
            <button id={`${idPlus}-ligne`} type="button" onClick={() => { vibrer(4); allerA('plus'); }}
              className="flex min-h-12 w-full items-center gap-3 px-4 text-left transition hover:bg-white/[0.03] active:bg-white/[0.05]">
              <span className="shrink-0 whitespace-nowrap text-[14.5px] font-semibold text-white">Plus de réglages</span>
              <span className="min-w-0 flex-1 truncate text-right text-[13.5px] font-medium text-bleu">{reglees}</span>
              <Icone nom="ui-chevron" taille={16} className="-rotate-90 shrink-0 text-white/55" />
            </button>
          </div>
        )}

        {!nouveau && compteClics && clics > 0 && <p className="text-center text-[13px] text-white/55">{clics} clic{clics > 1 ? 's' : ''} ces 30 derniers jours</p>}

        {/* Les gestes rares, nommés en toutes lettres, au bout de la feuille plutôt qu'en pictos à côté de Terminé. */}
        {!nouveau && (
          <div className={groupe}>
            {onDeplacer && place && place.total > 1 && (
              <div className="flex min-h-12 items-center gap-2 pl-4 pr-1.5">
                <span className="flex-1 text-[14.5px] font-medium text-white/85">Place sur ma page</span>
                <span className="text-[13px] tabular-nums text-white/55">{place.rang + 1} sur {place.total}</span>
                {fleche(-1)}{fleche(1)}
              </div>
            )}
            <button type="button" onClick={dupliquer} className="flex min-h-12 items-center gap-3 px-4 text-left text-[14.5px] font-medium text-white/85 transition hover:bg-white/[0.04]">
              <Icone nom="ui-copier" taille={18} className="text-white/70" /> Dupliquer
            </button>
            <button type="button" onClick={retirer} className="flex min-h-12 items-center gap-3 px-4 text-left text-[14.5px] font-medium text-red-300 transition hover:bg-red-500/[0.06]">
              <Icone nom="ui-corbeille" taille={18} /> Retirer de ma page
            </button>
          </div>
        )}
      </div>

      {page !== null && (
        <div className="adm-editeur flex flex-col gap-4 pt-1">
          {page === 'apparence' && formeCouleur}
          {page === 'plus' && bascules(false, true).length > 0 && <div className="adm-groupe divide-y divide-white/[0.06] px-4">{bascules(false, true)}</div>}
          {page === 'visibilite' && visibilite}
          {/* L'animation et l'accès réservé restent montés d'une page à l'autre : leur ligne dans la page d'où ils partent, leur page ensuite. */}
          {(page === 'apparence' || page === 'animation') && animation && <div className={page === 'apparence' ? groupe : 'contents'}>{animation}</div>}
          {(page === 'plus' || page === 'acces') && acces && <div className={page === 'plus' ? groupe : 'contents'}>{acces}</div>}
        </div>
      )}
      </PagesBloc.Provider>
    </Feuille>
    </FournisseurOffre>
  );
}

/**
 * Le lien des avis d'une note (24 octobre 2026, demandé par Lilian) : collé, Hopla lit la note et le nombre d'avis sur la
 * page (`lireNoteAvis`), les pose dans le bloc, et le serveur les relit chaque jour. Une page qui ne les déclare pas
 * (une fiche Google) laisse la note à taper à la main.
 */
function LienAvis({ b, maj, noteAvis }: { b: Bloc; maj: (c: Partial<Bloc>) => void; noteAvis?: Api['noteAvis'] }) {
  const [etat, setEtat] = useState<'' | 'lecture' | 'lue' | 'muette' | 'google'>('');
  const derniere = useRef(adresse(b.url));
  // La preuve telle qu'elle est quand la réponse arrive : une note tapée pendant la lecture n'est pas écrasée.
  const actuel = useRef(b);
  actuel.current = b;
  const preuve = () => actuel.current.preuve ?? { genre: 'note' as const, note: 0, nombre: 0, source: '' };
  useEffect(() => {
    const url = adresse(b.url);
    if (!noteAvis || !/^https?:\/\//.test(url) || url === derniere.current) return;
    const minuteur = setTimeout(() => {
      derniere.current = url;
      // Sans note lue, le site se pose quand même sous la note tapée.
      const site = sourceDe(url);
      const muette = (e: 'muette' | 'google') => { const p = preuve(); if (site && !p.source.trim()) maj({ preuve: { ...p, source: site } }); setEtat(e); };
      // Une fiche Google ne donne pas sa note sans l'API Places : rien à lire.
      if (site === 'Google') { muette('google'); return; }
      setEtat('lecture');
      noteAvis(url).then(n => {
        if (!n) { muette('muette'); return; }
        const p = preuve();
        maj({ preuve: { ...p, note: n.note, nombre: n.nombre, source: n.source || p.source } });
        setEtat('lue');
      }).catch(() => muette('muette'));
    }, 600);
    return () => clearTimeout(minuteur);
    // Seule l'adresse relance la lecture : la note posée ne la relit pas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.url, noteAvis]);
  const aide = etat === 'lecture' ? 'Hopla lit la note…'
    : etat === 'lue' ? 'Note lue sur la page. Hopla la relit chaque jour.'
    : etat === 'google' ? 'Google ne laisse pas lire sa note : tape-la dessous. Le bloc mène à ta fiche.'
    : etat === 'muette' ? 'Cette page ne donne pas sa note : tape-la dessous. Le bloc reste cliquable.'
    : 'Ta page Trustpilot, Avis Vérifiés… : la note et le nombre d’avis se remplissent tout seuls, et se relisent chaque jour.';
  return (
    <Champ label="Lien vers tes avis" aide={aide}>
      <input className={classeSaisie} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="https://…" value={b.url}
        onChange={e => { setEtat(''); maj({ url: e.target.value }); }} />
    </Champ>
  );
}
