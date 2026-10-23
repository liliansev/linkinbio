import { useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { Api, Bloc, ImageApercu, MentionPartenaire, Partenariat, Reglages, VisuelApercu } from '../lib/types.ts';
import { ANIMATIONS_BLOC, TYPES_ADRESSE, TYPES_VITRINE, nouveauBloc } from '../lib/types.ts';
import { horsCreneauOuDates } from '../lib/moments.ts';
import { RESEAUX } from '../lib/types.ts';
import { adresse, adresseSaisie, montants as lireMontants, pourquoiPasAdresse } from '../lib/valider.ts';
import { avecMontants, nomAgenda, nomSoutien, seIntegre, soutienDe } from '../lib/vitrine.ts';
import { nomSite, reseauDeUrl } from '../lib/demarrage.ts';
import { typeDeAdresse, versType } from '../lib/detection.ts';
import { memeBloc, verifierBloc } from '../lib/editionBloc.ts';
import type { ChampErreur, Erreurs } from '../lib/editionBloc.ts';
import { ICONES } from '../lib/icones.ts';
import { Icone, NOMS_RESEAUX, PICTOS } from '../components/Icone.tsx';
import { BoutonPrincipal, BoutonSecondaire, Champ, Feuille, Interrupteur, ListeChoix, Menu, NOMS_ANIMATIONS, Segments, choisirFichier, classeBouton, classeSaisie, flechesRadio, preparerImage, preparerLogo, useFilFeuille, vibrer } from './ui.tsx';
import type { ElementMenu, FilFeuille } from './ui.tsx';
import { typeDe } from './OngletLiens.tsx';
import { appDe } from '../lib/ouvrirApp.ts';
import { ChampsPreuve, PagesBloc, RangeesCompactes, RegleAOuvrir, RegleAcces, ReglagePourQui, ReglageQuand, Repli, ReplisExclusifs, resumePourQui, resumeQuand } from './ReglesBloc.tsx';
import type { PageRegle } from './ReglesBloc.tsx';
import { useCouche } from './couches.ts';
import { reseauxDePartage } from '../lib/provenance.ts';
import { Etiquette, FournisseurOffre, Reserve, offreDe, useDroits, useVoirOffres } from './offre.tsx';
import type { Fonction } from '../lib/abonnement.ts';
import { focusAuto } from '../lib/clavier';

/** Au téléphone, la page ouverte dans la feuille d'un bloc : l'essentiel (`null`), Quand, Pour qui, l'apparence, « Plus de réglages », ou une règle rare. */
type PageBloc = 'plus' | PageRegle | null;
const hoteDe = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
const NOMS_PAGES: Record<'plus' | PageRegle, string> = { plus: 'Plus de réglages', quand: 'Quand', public: 'Pour qui', apparence: 'Apparence', acces: 'Accès réservé', animation: 'Animation' };
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
const MENTIONS: { id: MentionPartenaire; nom: string }[] = [{ id: 'publicite', nom: 'Publicité' }, { id: 'collaboration', nom: 'Collaboration commerciale' }];
const PARTENARIAT_NEUF: Partenariat = { mention: 'publicite', code: '' };

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
export function EditeurBloc({ bloc, reglages, nouveau, bureau = false, garde, onBrouillon, onFermer, onRetour, onReplier, suitAdresse = true, onEnregistrer, onSupprimer, onDupliquer, onDeplacer, place, envoyerImage, apercuSite, clics, prises = 0, principal = false }: {
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
  onEnregistrer: (bloc: Bloc, options?: OptionsEnregistrement) => void;
  onSupprimer: (bloc: Bloc) => void;
  onDupliquer: (bloc: Bloc) => void;
  /** Monter ou descendre le bloc d'un cran, sans glisser : la place est donnée par la page. */
  onDeplacer?: (bloc: Bloc, sens: -1 | 1) => void;
  place?: { rang: number; total: number };
  envoyerImage: (dataUrl: string) => Promise<string>;
  apercuSite: Api['apercuSite'];
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
   * chose qu'une adresse collée (une prise de rendez-vous encore vide), reste ce qu'il est.
   */
  const [autoDepart] = useState(() => nouveau && suitAdresse && !bloc.partenariat && (bloc.type === 'lien' || typeDeAdresse(adresseSaisie(bloc.url), !!droits.vitrine) === bloc.type));
  const auto = useRef(autoDepart);
  const [b, setB] = useState<Bloc>(() => {
    const url = adresseSaisie(bloc.url);
    const t = autoDepart && url ? typeDeAdresse(url, !!droits.vitrine) : bloc.type;
    return t === bloc.type ? bloc : versType(bloc, t, false);
  });
  const lu = useRef<Lu>({ url: nouveau ? '' : adresseSaisie(bloc.url), inconnu: !nouveau, titre: '', image: '', description: '', prix: '', icone: '' });
  /** Ce qu'on a écrit ou choisi soi-même depuis l'ouverture : une autre adresse n'y touche pas. */
  const aMoi = useRef(new Set<ChampAMoi>());
  /** L'adresse a été effacée : celle qu'on retape remplace tout ce qui venait de l'ancienne. */
  const efface = useRef(false);
  /** La prochaine lecture part sans attendre : une adresse arrivée toute faite, ou « En faire un simple lien ». */
  const immediat = useRef(nouveau && !!bloc.url);
  /** D'où vient l'image : l'image de partage du site, son logo, une capture, une photo choisie ; null si on ne sait pas. */
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
  const voir = useVoirOffres();
  const [icones, setIcones] = useState(false);
  /** Le sous-titre, rare : son champ se montre rempli, ou une fois demandé ; sinon une ligne « Ajouter un sous-titre ». */
  const [sousTitreDemande, setSousTitreDemande] = useState(false);
  // L'essentiel d'abord, neuf ou pas ; le reste attend derrière « Plus de réglages ».
  // Ouvert pour y régler une règle tout juste débloquée (au retour des offres), il arrive déplié (au téléphone, sur la page de la règle).
  const regleAOuvrir = useContext(RegleAOuvrir);
  const [plus, setPlus] = useState(regleAOuvrir === 'acces');
  // Au bureau, le réglage déplié de la rangée (Apparence, Quand ou Pour qui) : un seul à la fois.
  const [repli, setRepli] = useState<string | null>(null);
  // La page d'où l'on vient : Quand, Pour qui et l'apparence s'ouvrent depuis la première page, l'accès réservé depuis
  // « Plus de réglages », l'animation depuis l'apparence (celle d'un rendez-vous, depuis la première page).
  const parent = (p: PageBloc): PageBloc => (p === 'acces' ? 'plus' : p === 'animation' && pageVedette(b) === 'apparence' ? 'apparence' : null);
  const niveau = (p: PageBloc): number => (p === null ? 0 : 1 + niveau(parent(p)));
  const [page, setPage] = useState<PageBloc>(bureau ? null : regleAOuvrir === 'moment' ? 'quand' : regleAOuvrir);
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
  // Ce qui est écrit : la saisie telle qu'elle était au dernier enregistrement (ou à l'ouverture), et sa version enregistrée.
  const brut = useRef<Bloc>(bloc);
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
  /** L'adresse tapée, si c'en est une (complétée de son https). */
  const adresseValide = adresseSaisie(b.url);

  /** Vérifie le bloc ; renvoie la version à enregistrer, ou montre ce qui manque et mène au champ. */
  function valider(): Bloc | null {
    const r = verifierBloc(b);
    if (r.bloc) return r.bloc;
    setErreurs(r.erreurs);
    if (r.erreurs.dates) {
      if (!bureau) allerA('quand');
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
  /** Avant de passer à autre chose : ce qui est valable s'écrit ; un champ faux garde l'éditeur ouvert et dit quoi faire. */
  function liberer(): boolean {
    if (!commence()) return true;
    const v = valider();
    if (!v) { vibrer(20); return false; }
    brut.current = b;
    if (!memeBloc(v, enregistre.current)) { enregistre.current = v; onEnregistrer(v, { garder: true, discret: true }); }
    return true;
  }
  useEffect(() => {
    if (!garde || !bureau) return;
    garde.current = liberer;
    return () => { garde.current = null; };
  });

  /*
   * Ce que la page montre se règle sur la première page du bloc (23 octobre 2026) : son texte, son sous-titre, ses montants,
   * son image, sa description ; l'apparence d'un bloc mis en avant, juste sous « Mis en avant ». Derrière « Plus de réglages »
   * ne reste que ce que la page ne montre pas : le lien partenaire, l'accès réservé, Google, le prénom demandé. Ce qui y est
   * réglé se dit à droite de la ligne, en bleu comme dans Quand et Pour qui ; rien de réglé, le chevron seul : la case dit un
   * état, jamais un sommaire de ce qu'elle cache.
   */
  const reglages_ = ([[!!b.partenariat, 'Lien partenaire'], [!!b.acces, 'Accès réservé'], [b.type === 'lien' && principal && !b.indexable, 'Pas sur Google'],
    [b.type === 'inscription' && b.demanderPrenom, 'Prénom demandé']] as [boolean, string][])
    .filter(([oui]) => oui).map(([, nom]) => nom);
  const reglees = reglages_.length > 2 ? `${reglages_.slice(0, 2).join(', ')} et ${reglages_.length - 2} de plus` : reglages_.join(', ');
  // Un titre, un texte, une vidéo, un soutien, un rendez-vous : rien que la page ne montre, pas de « Plus de réglages ».
  const plusVide = !['lien', 'produit', 'inscription'].includes(b.type);
  const nomAuto = `Comme ma page (${NOMS_ANIMATIONS[reglages.animation].nom})`;
  const nomIcone = b.icone ? NOMS_RESEAUX[b.icone] ?? PICTOS.find(p => p.nom === b.icone)?.libelle ?? '' : 'Aucune';

  /** Le format de l'image d'un bloc : la photo d'un produit, la grande image d'une carte, la vignette d'un bouton. */
  const formatImage = (x: Bloc) => (x.type === 'produit' ? 'photo' as const : x.vedette && x.format === 'carte' ? 'large' as const : 'carre' as const);
  /** Une image lue sur un site (en data URL), préparée à son format puis envoyée : son adresse chez Hopla. Un logo se pose sur du blanc. */
  async function envoyerVisuel(donnees: string, visuel: VisuelApercu | undefined, format: 'carre' | 'large' | 'photo') {
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
      const site = await apercuSite(url, genre === 'logo' ? 'logo' : b.type === 'produit' ? 'partage' : true);
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
    if (saisie.trim() && !url) { setErreur(pourquoiPasAdresse(saisie)); return; }
    if (!url) return;
    const ancien = lu.current;
    // La même adresse ne se relit pas, sauf pour donner un texte à un lien qui n'en a plus.
    if (url === ancien.url && (b.titre.trim() || b.type !== 'lien')) return;
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
    else if (x.type === 'video') await lireVideo(url, x, ancien, effacee);
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
      // Une page qui déclare un prix est une boutique : un lien neuf qui suit son adresse devient son produit.
      if (auto.current && droits.vitrine && site.prix && site.titre) return await devenirProduit(url, site);
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

  /** « En faire un simple lien » : le bloc cesse de suivre son adresse, et le site se relit comme celui d'un lien. */
  function enSimpleLien() {
    vibrer(6);
    auto.current = false;
    lu.current = { ...lu.current, url: '' };
    immediat.current = true;
    const texteAMoi = aMoi.current.has('titre');
    setB(avant => versType(avant, 'lien', texteAMoi));
    setErreurs({});
  }

  /** La mention et le code d'un lien qui cesse d'être partenaire : rallumé, il les retrouve. */
  const partenariatGarde = useRef<Partenariat | null>(bloc.partenariat);

  /**
   * Fermer d'un glissé, d'Échap, de la croix ou d'un toucher à côté garde ce qui a changé, comme partout
   * ailleurs, y compris un bloc neuf : une adresse collée ne se perd pas d'un geste.
   */
  function fermerEnGardant() {
    if (commence()) {
      const v = valider();
      if (!v) { vibrer(20); return; }
      if (!memeBloc(v, enregistre.current)) { brut.current = b; enregistre.current = v; return onEnregistrer(v, bureau ? { discret: true } : undefined); }
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
  // « Voir les offres » ouvre les offres par-dessus. Au téléphone, la feuille du bloc se ferme d'abord comme un glissé, en gardant
  // ce qui a changé ; au bureau, la rangée reste dépliée derrière la fenêtre, et ce qui y est tapé part avant le paiement.
  const offre = { droits, voirOffres: voir && ((f?: Fonction) => { if (retenir()) return; if (!bureau) fermerEnGardant(); voir(f); }) };

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
  // page ». Un bloc posé porte son nom à lui, tel qu'il est sur la page (« Le blog ») : on sait lequel est ouvert. Un texte,
  // une preuve ou la dernière vidéo gardent celui de leur genre, leur « titre » n'étant pas un nom.
  const sonNom = ['texte', 'preuve', 'derniere-video'].includes(b.type) ? '' : bloc.titre.trim();
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
    <Repli id="animation" depuis="apparence" key={`animation-${b.id}`} titre="Animation" icone="eclair" resume={resumeAnimation} regle={b.animation !== 'auto'} ouvert={false}>
      {/* Une liste, pas une rangée de pastilles : le bloc sur la page joue l'animation choisie. */}
      <ListeChoix label="Animation" valeur={b.animation} onChange={a => maj({ animation: a })}
        options={ANIMATIONS_BLOC.map(a => a === 'auto'
          ? { id: a, nom: nomAuto }
          : { id: a, nom: NOMS_ANIMATIONS[a].nom })} />
    </Repli>
  );
  /** « Mis en avant » vient d'être allumé : au bureau, son apparence arrive dépliée, on voit ce qu'il ouvre. */
  const vedetteAllumee = useRef(false);
  const enAvant = !['titre', 'texte', 'newsletter', 'inscription', 'preuve', 'soutien'].includes(b.type);
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
  ].filter(Boolean);
  // Quand et Pour qui, réglés depuis la première page du bloc ; l'accès réservé, rare, derrière « Plus de réglages ».
  const quand = <ReglageQuand key={`quand-${b.id}`} b={b} maj={maj} erreur={erreurDe('dates')} />;
  const pourQui = <ReglagePourQui key={`public-${b.id}`} b={b} maj={maj} reseaux={reseauxDePartage(reglages.vuesReseaux)} />;
  const acces = b.type === 'lien' && <RegleAcces key={`acces-${b.id}`} b={b} maj={maj} prises={prises} />;
  const dejaQuand = resumeQuand(b, !!droits.heure);
  const dejaPourQui = resumePourQui(b);
  // Au téléphone seulement : au bureau, la rangée se déplace par sa poignée, à la souris ou au clavier.
  const fleche = (sens: -1 | 1) => place && onDeplacer && (
    <button type="button" disabled={sens < 0 ? place.rang === 0 : place.rang === place.total - 1} onClick={() => onDeplacer(enregistre.current ?? b, sens)} aria-label={sens < 0 ? 'Monter d’un cran' : 'Descendre d’un cran'}
      className="grid h-11 w-10 place-items-center text-white/75 hover:text-white disabled:text-white/25">
      <Icone nom={sens < 0 ? 'ui-monter' : 'ui-descendre'} taille={18} />
    </button>
  );

  // Ce que fera l'adresse, dit sous son champ : l'app qui s'ouvre, l'agenda dans la page, le site où l'on paie.
  const ok = (texte: string) => <span className="inline-flex items-center gap-1.5 text-white/75"><Icone nom="ui-ok" taille={13} className="shrink-0" />{texte}</span>;
  const app = b.type === 'lien' && reglages.ouvrirApps ? appDe(adresse(b.url)) : null;
  const aideType = app ? ok(`Ce lien s’ouvre directement dans l’app ${app}, même depuis ${['Instagram', 'TikTok'].filter(n => n !== app).join(' ou ')}.`)
    // Avant l'adresse, l'aide d'un bloc neuf : les sites qui conviennent (agendas, soutiens, boutiques), sous le champ qui les attend.
    : !adresseValide ? (nouveau && type.aide ? `${type.aide}.` : undefined)
    : b.type === 'reservation' ? (seIntegre(adresseValide) ? ok('La réservation s’ouvre dans ta page, sans la quitter.') : `${nomAgenda(adresseValide)} s’ouvre sur son site.`)
    : b.type === 'soutien' ? (avecMontants(adresseValide) ? 'Tes visiteurs choisissent un montant, puis paient sur PayPal.' : soutienDe(adresseValide) ? `Tes visiteurs choisissent le montant sur ${nomSoutien(adresseValide)}.` : undefined)
    : undefined;
  const champAdresse = avecUrl && (
    <Champ label={b.type === 'video' ? 'Adresse de la vidéo YouTube' : b.type === 'produit' ? 'Adresse du produit' : b.type === 'reservation' ? 'Adresse de ton agenda' : 'Adresse'} erreur={erreurDe('url')} aide={aideType}>
      <input className={classeSaisie} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off"
        placeholder={b.type === 'video' ? 'https://youtu.be/…' : b.type === 'soutien' ? 'https://paypal.me/…' : b.type === 'reservation' ? 'https://calendly.com/…' : 'https://…'}
        value={b.url} onChange={e => { if (!e.target.value.trim()) efface.current = true; maj({ url: e.target.value }); }} onBlur={() => lireAdresse()} autoFocus={focusAuto(nouveau && !bloc.url)}
        onPaste={e => { const texte = e.clipboardData.getData('text'); if (!b.url.trim() && adresseSaisie(texte)) setTimeout(() => lireAdresse(texte)); }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('bloc-titre')?.focus(); } }} />
    </Champ>
  );
  // Une adresse qui a pris son bloc toute seule (une vidéo, un agenda…) peut rester un simple lien, d'un geste, posé
  // sous le champ et hors de son libellé, pour que le lecteur d'écran ne le lise pas avec l'adresse.
  const champUrl = avecUrl && (auto.current && b.type !== 'lien' && adresseValide ? (
    <div>
      {champAdresse}
      <button type="button" onClick={enSimpleLien} className="flex min-h-11 items-center text-[12.5px] font-medium text-white underline decoration-white/30 underline-offset-[3px] transition hover:decoration-white bureau:mt-0.5 bureau:min-h-0 bureau:py-1.5">En faire un simple lien</button>
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
  const avecVignette = b.type === 'lien' || produit || rdv;
  const iconeVue = b.icone || (rdv ? 'bloc-reservation' : '');
  // Ce qui est en place, quand on sait d'où il vient (une image du site, son logo, une photo, une icône) : sa ligne est cochée
  // dans le menu, les autres le remplacent.
  const source = b.image ? genreImage.current : !produit && b.icone ? 'icone' : null;
  const coche = (de: (typeof source)[]) => (source ? de.includes(source) : undefined);
  const elementsVignette: ElementMenu[] = [
    ...(adresseValide && !rdv ? [{ nom: produit ? 'Photo de la boutique' : 'Image du site', coche: coche(['partage', 'capture']), action: () => void prendreDuSite('partage') }] : []),
    ...(adresseValide && !produit && !rdv ? [{ nom: 'Logo du site', coche: coche(['logo']), action: () => void prendreDuSite('logo') }] : []),
    { nom: 'Choisir une photo', coche: coche(['photo']), action: () => choisirFichier(fichier.current, vignette.current) },
    ...(!produit ? [{ nom: 'Choisir une icône', coche: coche(['icone']), action: () => setIcones(true) }] : []),
    ...(b.image ? [{ nom: produit ? 'Retirer la photo' : 'Retirer l’image', action: () => maj({ image: '' }) }] : []),
    ...(!produit && !b.image && b.icone ? [{ nom: 'Retirer l’icône', action: () => maj({ icone: '' }) }] : []),
  ];
  const rempli = !visuelEnCours && (!!b.image || (!produit && !!iconeVue));
  const nomVignette = produit ? (b.image ? 'Photo du produit : la changer ou la retirer' : 'Ajouter la photo du produit')
    : b.image ? 'Image du bouton : la changer ou la retirer' : b.icone ? `Icône du bouton, ${nomIcone} : la changer ou la retirer`
    : rdv ? 'Icône du bouton : la changer, ou choisir une photo' : 'Ajouter une image ou une icône';
  const case_ = 'grid h-7 w-7 shrink-0 place-items-center bureau:h-6 bureau:w-6';
  const vignetteChamp = avecVignette && (
    <div ref={vignette} className="absolute inset-y-0 left-0 flex items-center pl-1 bureau:pl-0.5">
      <Menu label={produit ? 'Photo du produit' : 'Vignette du bouton'} titre={nomVignette} elements={elementsVignette} aligne="gauche"
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
      <label htmlFor="bloc-titre" className="mb-1.5 block text-[12.5px] font-medium text-white/60 bureau:text-white/75">{produit ? 'Nom du produit' : 'Texte du bouton'}</label>
      {/* Le champ d'abord, la vignette par-dessus : le libellé nomme le champ, pas le bouton de la vignette. Vide, il dit le
          nom que la page montre déjà, celui du site, en attendant sa lecture. */}
      <div className="relative">
        <input id="bloc-titre" className={`${classeSaisie} adm-field-vignette`} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={160} autoFocus={focusAuto(nouveau && !avecUrl)}
          aria-invalid={erreurDe('titre') ? true : undefined} aria-describedby={erreurDe('titre') ? idTitre : undefined}
          placeholder={lecture && !b.titre ? (produit ? 'Lecture de la boutique…' : 'Lecture du site…') : produit ? '' : rdv ? nouveauBloc('reservation', b.id).titre : (adresseValide && nomSite(adresseValide)) || 'Mon super lien'} />
        {vignetteChamp}
      </div>
      {erreurDe('titre') && <span id={idTitre} role="alert" className="mt-1.5 block text-[13px] font-medium leading-snug text-red-300">{erreurDe('titre')}</span>}
      {erreurImage && <div className="mt-1.5">{erreurImage}</div>}
      {icones && !produit && (
        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[12.5px] font-medium text-white/60 bureau:text-white/75">Icône</span>
            <button type="button" onClick={() => setIcones(false)} aria-label="Fermer les icônes" className="grid h-8 w-8 place-items-center rounded-lg text-white/55 transition hover:text-white bureau:h-7 bureau:w-7">
              <Icone nom="ui-fermer" taille={15} />
            </button>
          </div>
          {grilleIcones}
        </div>
      )}
    </div>
  ) : (
    <Champ erreur={erreurDe('titre')} label={b.type === 'texte' ? 'Texte' : 'Titre'}>
      {b.type === 'texte'
        ? <textarea className={`${classeSaisie} min-h-28`} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={1000} autoFocus={focusAuto(nouveau)} />
        : <input id="bloc-titre" className={classeSaisie} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={160} autoFocus={focusAuto(nouveau && !avecUrl)}
            placeholder={b.type === 'soutien' ? nouveauBloc(b.type, b.id).titre : b.type === 'titre' ? 'Nouvelle section' : ''} />}
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
        <span className="mb-1.5 block text-[12.5px] font-medium text-white/60 bureau:text-white/75">Mention</span>
        <Segments label="Mention du lien partenaire" souple valeur={b.partenariat.mention} options={MENTIONS} onChange={v => maj({ partenariat: { ...b.partenariat!, mention: v } })} />
      </div>
      {droits.vitrine ? (
        <Champ label="Code promo (facultatif)">
          <input className={classeSaisie} value={b.partenariat.code} onChange={e => maj({ partenariat: { ...b.partenariat!, code: e.target.value } })} maxLength={40}
            autoCapitalize="characters" autoCorrect="off" spellCheck={false} placeholder="BIENVENUE10" />
        </Champ>
      ) : (
        <div>
          <span className="mb-1.5 flex items-center gap-2 text-[12.5px] font-medium text-white/60 bureau:text-white/75">Code promo <Etiquette fonction="vitrine" /></span>
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
  const avecSousTitre = ['lien', 'newsletter', 'inscription', 'soutien', 'reservation'].includes(b.type);
  const champSousTitre = avecSousTitre && (b.sousTitre || sousTitreDemande || b.type === 'reservation' ? (
    <Champ label="Sous-titre (facultatif)">
      <input className={classeSaisie} value={b.sousTitre} onChange={e => { setSousTitreDemande(true); maj({ sousTitre: e.target.value }); }} maxLength={240} autoFocus={focusAuto(sousTitreDemande && !b.sousTitre)}
        placeholder={b.type === 'reservation' && adresseValide ? nomAgenda(adresseValide) : ''} />
    </Champ>
  ) : (
    <button type="button" onClick={() => { vibrer(4); setSousTitreDemande(true); }}
      className="-my-1.5 flex min-h-11 items-center gap-2 self-start text-[13.5px] font-medium text-white/70 transition hover:text-white bureau:min-h-8">
      <Icone nom="ui-plus" taille={15} className="shrink-0" />Ajouter un sous-titre
    </button>
  ));
  const champMontants = b.type === 'soutien' && avecMontants(adresseValide) && (
    <div>
      <span className="mb-1.5 block text-[12.5px] font-medium text-white/60 bureau:text-white/75">Montants proposés, en euros</span>
      <div className="bureau:max-w-[360px]"><ChampMontants montants={b.montants} onChange={m => maj({ montants: m })} /></div>
    </div>
  );
  const compteClics = b.type === 'lien' || TYPES_VITRINE.includes(b.type);

  /** Le haut, commun aux deux formes : à quoi sert le bloc, ce qu'il a de particulier, puis ses champs essentiels. */
  const essentiel = (
    <>
      {/* Un bloc neuf sans adresse (une liste d'inscrits, un avis) dit d'abord, en une ligne, ce qu'on ne devine pas ; celui qui
          en a une le dit sous son champ, tant qu'il est vide. Rien quand c'est évident. */}
      {nouveau && type.aide && !avecUrl && <p className="text-[13.5px] leading-snug text-white/60">{type.aide}.</p>}
      {/* Un avis ou une liste gardés d'une offre passée : ils attendent, rien n'est perdu. */}
      {type.fonction && !droits[type.fonction] && <Reserve fonction={type.fonction} phrase={`Ce bloc n’est pas montré sur ta page sans Hopla ${offreDe(type.fonction)}. Il revient tel quel dès que tu la prends.`} />}
      {paire ? <div className="adm-paire">{champUrl}{champTitre}</div> : champUrl}

      {b.type === 'preuve' && <ChampsPreuve b={b} maj={maj} erreurDe={erreurDe} />}

      {b.type === 'preuve' && (
        <Champ label={b.preuve?.genre === 'compteur' ? 'Lien vers la source (facultatif)' : 'Lien vers les avis (facultatif)'}
          aide={b.preuve?.genre === 'compteur' ? 'Ta chaîne, ton profil : le bloc devient cliquable, et le chiffre vérifiable.' : 'Ta fiche Google, ta page Trustpilot : le bloc devient cliquable, et la preuve vérifiable.'}>
          <input className={classeSaisie} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="https://…" value={b.url} onChange={e => maj({ url: e.target.value })} />
        </Champ>
      )}
      {b.type === 'preuve' && <p className="text-[12.5px] leading-snug text-white/55">Des chiffres vrais, des avis réels, avec l’accord de leurs auteurs.</p>}

      {!paire && champTitre}
      {/* La description d'un bandeau, d'une carte ou d'un produit mis en avant : la page la montre sous le titre dès que « Mis en
          avant » s'allume, souvent lue sur le site ; elle se lit et se corrige ici, sous le texte, là où l'œil est. */}
      {description}
      {champSousTitre}
      {champMontants}
      {b.type === 'produit' && (bureau ? <div className="adm-paire">{champPrix}</div> : champPrix)}
      {partenaire}
      {b.type === 'derniere-video' && (
        <Champ label="Petit titre au-dessus" aide="La vidéo elle-même change toute seule à chaque nouvelle publication sur la chaîne.">
          <input className={classeSaisie} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={160} />
        </Champ>
      )}
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
        {/* Les deux gestes les plus courants après le texte : le montrer ou non, le mettre en avant. L'un sous l'autre, comme
            au téléphone : côte à côte, l'interrupteur de l'un finissait contre le nom de l'autre. */}
        <div className="flex flex-col">
          <Interrupteur compact label="Visible sur ma page" actif={b.public} onChange={v => maj({ public: v })} />
          {vedette(true)}
        </div>
        {/* Ce que « Mis en avant » ouvre, juste sous lui, puis Quand et Pour qui : chaque ligne dit ce qui est réglé, et se déplie en place.
            Allumé à l'instant, l'apparence arrive dépliée. */}
        <div className="flex flex-col">
          {pageVedette(b) === 'apparence' && (
            <Repli key={`apparence-${b.id}`} titre="Apparence" icone="pinceau" resume={resumeApparence} ouvert={vedetteAllumee.current}>
              {/* L'animation se déplie dans l'apparence, sans la replier. */}
              {formeCouleur}<ReplisExclusifs.Provider value={null}>{animation}</ReplisExclusifs.Provider>
            </Repli>
          )}
          {pageVedette(b) === 'animation' && animation}
          <Repli key={erreurDe('dates') ? 'quand-erreur' : `quand-${b.id}`} titre="Quand" icone="horloge" resume={dejaQuand} regle={dejaQuand !== 'Tout le temps'} ouvert={!!erreurDe('dates') || regleAOuvrir === 'moment'} montrer={regleAOuvrir === 'moment'}>{quand}</Repli>
          <Repli key={`public-${b.id}`} titre="Pour qui" icone="cible" resume={dejaPourQui} regle={dejaPourQui !== 'Tout le monde'} ouvert={false}>{pourQui}</Repli>
        </div>

        {/* Ce que la page ne montre pas attend derrière une seule ligne, qui dit ce qui est réglé : on sait quoi sans ouvrir. */}
        {!plusVide && <div className="adm-plus-groupe">
          <button type="button" onClick={() => { vibrer(4); setPlus(!plus); }} aria-expanded={plus} aria-controls={idPlus} className="adm-plus">
            <span className="shrink-0 font-medium text-white">Plus de réglages</span>
            {!plus && reglees && <span className="min-w-0 flex-1 truncate font-medium text-bleu">{reglees}</span>}
            <Icone nom="ui-chevron" taille={14} className={`ml-auto shrink-0 text-white/55 transition-transform ${plus ? 'rotate-180' : ''}`} />
          </button>
          {plus && (
            <div id={idPlus} className="adm-plus-contenu">
              {bascules(true, true).length > 0 && <div className="flex flex-col">{bascules(true, true)}</div>}
              {acces}
            </div>
          )}
        </div>}

        {/* Le bas de la rangée : un bloc neuf s'ajoute ou s'oublie ; un bloc posé se duplique ou se retire, et revient d'un geste à ce qu'il était. */}
        <div className="adm-editeur-pied">
          {!nouveau && compteClics && clics > 0 && <p className="mr-auto text-[12px] tabular-nums text-white/55">{clics.toLocaleString('fr-FR')} clic{clics > 1 ? 's' : ''} ces 30 derniers jours</p>}
          {nouveau ? (
            <div className="ml-auto flex items-center gap-2">
              {/* Le seul moyen d'oublier un bloc neuf : replier la rangée, elle, l'ajoute s'il est valable. */}
              <BoutonSecondaire onClick={onFermer}>Annuler</BoutonSecondaire>
              <BoutonPrincipal disabled={envoi} onClick={ajouter}>Ajouter à ma page</BoutonPrincipal>
            </div>
          ) : (
            <div className="ml-auto flex flex-wrap items-center justify-end gap-0.5">
              {annulable && (
                <button type="button" onClick={() => { setB(depart.current!); setErreurs({}); vibrer(6); }} className={classeBouton.discret}>
                  <Icone nom="ui-retour" taille={15} className="shrink-0" />Annuler mes changements
                </button>
              )}
              <button type="button" onClick={dupliquer} className={classeBouton.discret}><Icone nom="ui-copier" taille={15} className="shrink-0" />Dupliquer</button>
              <button type="button" onClick={retirer} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-[14px] font-medium text-red-300 transition hover:bg-red-500/[0.06] bureau:min-h-9 bureau:rounded-lg bureau:px-2.5">
                <Icone nom="ui-corbeille" taille={15} className="shrink-0" />Retirer
              </button>
            </div>
          )}
        </div>
      </div>
      </ReplisExclusifs.Provider>
      </RangeesCompactes.Provider>
      </FournisseurOffre>
    );
  }

  // Au téléphone, la feuille mène de page en page, sa flèche dans l'en-tête : l'essentiel, puis une page par règle (l'apparence,
  // Quand, Pour qui, « Plus de réglages »), et l'animation ou l'accès réservé un cran plus loin.
  const fil: FilFeuille | null = page === null ? null : {
    titre: NOMS_PAGES[page],
    label: parent(page) === 'plus' ? 'Revenir à Plus de réglages' : parent(page) === 'apparence' ? 'Revenir à Apparence' : 'Revenir au bloc',
    retour: () => allerA(parent(page)),
  };
  const groupe = 'adm-groupe flex flex-col divide-y divide-white/[0.06]';
  /** Une ligne de la première page qui mène à sa page : son nom, ce qui est réglé à droite (en bleu si c'est une règle), un chevron. */
  const ligneRegle = (id: PageRegle, valeur: string, regle = valeur !== 'Tout le temps' && valeur !== 'Tout le monde') => (
    <button id={`regle-${id}`} type="button" onClick={() => { vibrer(4); allerA(id); }}
      className="flex min-h-12 w-full items-center gap-3 px-4 text-left transition hover:bg-white/[0.03] active:bg-white/[0.05]">
      <span className="shrink-0 text-[14.5px] font-medium text-white">{NOMS_PAGES[id]}</span>
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
          {/* Fermer garde les changements ; ce bouton est la seule façon de les oublier (un bloc neuf n'est pas ajouté). */}
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

        {/* Les quatre gestes les plus courants après le texte, à portée (Lilian, 22 octobre 2026) : le montrer ou non, le mettre
            en avant, le programmer, le régler selon le réseau. Chaque ligne dit ce qui est réglé ; Quand et Pour qui mènent à leur page.
            Allumé, « Mis en avant » pose juste sous lui la ligne de ce qu'il ouvre : l'apparence, ou l'animation d'un rendez-vous. */}
        <div className={groupe}>
          <div className="px-4"><Interrupteur label="Visible sur ma page" actif={b.public} onChange={v => maj({ public: v })} /></div>
          {enAvant && <div className="px-4"><Interrupteur label="Mis en avant" actif={b.vedette} onChange={v => maj({ vedette: v })} /></div>}
          {vedettePage && ligneRegle(vedettePage, vedettePage === 'apparence' ? resumeApparence : resumeAnimation, vedettePage === 'animation' && b.animation !== 'auto')}
          {ligneRegle('quand', dejaQuand)}
          {ligneRegle('public', dejaPourQui)}
        </div>

        {/* Ce que la page ne montre pas attend derrière une seule ligne, qui dit ce qui est réglé ; elle mène à sa page, la flèche de l'en-tête ramène. */}
        {!plusVide && (
          <div className={groupe}>
            <button id={`${idPlus}-ligne`} type="button" onClick={() => { vibrer(4); allerA('plus'); }}
              className="flex min-h-12 w-full items-center gap-3 px-4 text-left transition hover:bg-white/[0.03] active:bg-white/[0.05]">
              <span className="shrink-0 whitespace-nowrap text-[14.5px] font-medium text-white">Plus de réglages</span>
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
          {page === 'quand' && quand}
          {page === 'public' && pourQui}
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
