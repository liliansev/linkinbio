import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, Modifier } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS as CssDnd } from '@dnd-kit/utilities';
import type { Bloc, PagePublique, Reglages, TypeBloc } from '../lib/types.ts';
import { GALERIE_GRATUITE, SANS_COULEURS, TYPES_ADRESSE, TYPES_PRINCIPAL, TYPES_VITRINE, formatVedette, nouveauBloc, sansSchema } from '../lib/types.ts';
import { etiquettes } from '../lib/etiquettes.ts';
import { horsCreneauOuDates } from '../lib/moments.ts';
import { enGrille } from '../lib/collections.ts';
import { avecEssai, selonDroits } from '../lib/droits.ts';
import type { Droits } from '../lib/droits.ts';
import type { Destination } from '../lib/demarrage.ts';
import { urlReseau } from '../lib/demarrage.ts';
import { adresseSaisie } from '../lib/valider.ts';
import { verifierBloc } from '../lib/editionBloc.ts';
import { versType } from '../lib/detection.ts';
import { ICONES } from '../lib/icones.ts';
import { PageLiens } from '../components/PageLiens.tsx';
import type { Edition } from '../components/PageLiens.tsx';
import { Icone, NOMS_RESEAUX } from '../components/Icone.tsx';
import { themeDe, variablesTheme } from '../lib/themes.ts';
import { HautLiens } from './BienDemarrer.tsx';
import type { Demarrage } from './BienDemarrer.tsx';
import { ChampAjout, FeuilleAjout } from './OngletLiens.tsx';
import { typeDe } from '../lib/catalogue.ts';
import { DesignTiroirs, OngletApparence } from './OngletApparence.tsx';
import type { Tiroir } from './OngletApparence.tsx';
import { ActionEntete, BoutonPrincipal, BoutonSecondaire, Feuille, Interrupteur, Menu, choisirFichier, classeBouton, couleurReseau, flechesRadio, preparerImage, vibrer } from './ui.tsx';
import { Etiquette, offreDe, useDroits, useVoirOffres } from './offre.tsx';
import type { Fonction } from '../lib/abonnement.ts';
import { focusSaisie } from '../lib/clavier';

/*
 * « Ma page ».
 *
 * Au bureau (direction A, 21 octobre 2026, choisie par Lilian), l'édition est
 * à gauche et la page à droite. À gauche, sous « Bien démarrer », deux onglets
 * collés en haut, Contenu et Design. Contenu : le profil (photo, nom et bio
 * tapés en place, réseaux), un champ où coller une adresse ou chercher un bloc
 * (`ChampAjout`), puis la liste des blocs, une rangée chacun. Une rangée se déplace par sa poignée (souris ou
 * clavier) ; un clic la déplie sur les réglages du bloc, qui s'enregistrent
 * tout seuls, une rangée ouverte à la fois. Un bloc neuf a sa rangée en haut
 * (en bas s'il vient du bas), et se voit déjà sur la page, à la place qu'il
 * prendra ; seul « Ajouter à ma page » l'y met en ligne, refermé autrement il
 * est gardé masqué (24 octobre 2026). Design : les tiroirs du design. À
 * droite, la page à la vraie largeur d'un téléphone, collée, réduite si
 * l'écran est court ou étroit ; elle suit chaque frappe, et un clic sur un de
 * ses blocs ouvre sa rangée. Elle se regarde aussi sur un ordinateur, comme la
 * voient les visiteurs.
 *
 * Au téléphone, rien ne change : on édite la page elle-même. Le nom et la bio
 * se tapent en place ; la photo, les réseaux et chaque bloc s'ouvrent d'un
 * toucher, dans une feuille du bas qui laisse voir la page au-dessus ; un bloc
 * maintenu se déplace (Lilian, 18 octobre 2026).
 */

type Cote = 'design' | 'reseaux';
type Gestes = { basculer: (b: Bloc) => void; dupliquer: (b: Bloc) => void; supprimer: (b: Bloc) => void };

const nouvelId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const reduit = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Ce que l'en-tête et les onglets collés couvrent en haut de l'écran, au bureau (le `scroll-padding-top` de la page). */
const margeHaut = () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;

/**
 * Un bloc neuf tel que la page le montre pendant qu'on le remplit, à la place qu'il prendra (au téléphone depuis le
 * 23 octobre 2026, comme au bureau) : tel quel s'il est valable ; sinon un lien avec le texte qu'il aura, un titre ou un
 * texte avec le mot qui les attend, une preuve dès sa première valeur, un produit, un agenda ou un soutien dès son
 * adresse, et ce qui attend encore la sienne (une vidéo, une boutique) en bouton à son nom et à son picto.
 */
/** La liste avec le bloc neuf à la place qu'il prendra, en haut ou en bas ; déjà posé (gardé masqué, rouvert à ajouter), à la sienne. */
function avecLeNeuf(liste: Bloc[], neuf: Bloc | null | undefined, enBas: boolean): Bloc[] {
  if (!neuf) return liste;
  if (liste.some(b => b.id === neuf.id)) return liste.map(b => (b.id === neuf.id ? neuf : b));
  return enBas ? [...liste, neuf] : [neuf, ...liste];
}

function brouillonNeuf(b: Bloc): Bloc {
  const valable = verifierBloc(b).bloc;
  if (valable) return valable;
  const url = adresseSaisie(b.url);
  if (b.type === 'lien') return { ...b, titre: b.titre.trim() || 'Texte du bouton', url: url || '#' };
  if (b.type === 'titre' || b.type === 'texte') return { ...b, titre: b.titre.trim() || (b.type === 'titre' ? 'Titre de section' : 'Ton texte') };
  const p = b.preuve;
  if (p && (p.genre === 'note' ? p.note > 0 && p.note <= 5 : p.genre === 'compteur' ? p.nombre > 0 : !!b.description.trim())) return b;
  if (url && TYPES_VITRINE.includes(b.type)) return { ...b, url, titre: b.titre.trim() || (b.type === 'produit' ? 'Nom du produit' : nouveauBloc(b.type, b.id).titre) };
  const type = typeDe(b);
  return { ...nouveauBloc('lien', b.id), titre: b.titre.trim() || type.nom, url: '#', icone: type.picto };
}

export function MaPage({ compte, reglages, blocs, clics, visiteurs, grand, choisi, editeur, neuf, onReglages, onOrdonner, onOuvrir, onAjouter, onPoser, liberer, fermerEdition, gestes, envoyerImage, annoncer, demarrage, demarrageOuvert, fermerDemarrage, demandeDesign, designOuvert, demandeAjout, ajoutOuvert, appel, teteApercu }: {
  compte: PagePublique['compte'];
  reglages: Reglages;
  /** Les blocs tels qu'on les voit : celui qu'on règle se redessine à chaque frappe. */
  blocs: Bloc[];
  clics: Record<string, number>;
  /** La page telle que les visiteurs la voient, pour l'aperçu sur ordinateur. */
  visiteurs: PagePublique;
  /** La mise en page du bureau : l'édition à gauche, la page à droite. */
  grand: boolean;
  /** Le bloc ouvert dans l'éditeur : sa rangée est dépliée, et il est cerclé sur la page. */
  choisi: string | null;
  /** L'éditeur du bloc ouvert, au bureau : il se déplie dans sa rangée. */
  editeur: ReactNode;
  /**
   * Un bloc neuf qu'on règle avant de l'ajouter, tel qu'il est saisi, en haut (en bas s'il vient du bas) : au bureau, une
   * rangée de plus dans la liste et son bloc sur la page à droite ; au téléphone, son bloc sur la page, la feuille sous lui.
   */
  neuf: { bloc: Bloc; enBas: boolean } | null;
  onReglages: (r: Reglages) => void;
  onOrdonner: (blocs: Bloc[]) => void;
  onOuvrir: (bloc: Bloc) => void;
  /** `enBas` : ajouté depuis le bas de la page, le bloc se pose en dernier. */
  /** `choisi` : pris dans la liste avec une adresse déjà tapée, le bloc reste ce qu'on a choisi. */
  onAjouter: (bloc: Bloc, enBas?: boolean, choisi?: boolean, repris?: boolean) => void;
  /** Un bloc neuf gardé sans rouvrir son éditeur, masqué : la liste refermée sur ce qu'on avait tapé. */
  onPoser: (bloc: Bloc, enBas: boolean) => void;
  /** Avant un autre geste : ce qui est tapé dans l'éditeur s'écrit. Faux si un champ faux le retient. */
  liberer: () => boolean;
  /** Ferme l'éditeur du bloc (le design prend sa place, la rangée se replie). Faux s'il est retenu. */
  fermerEdition: () => boolean;
  /** Les gestes d'une rangée, au bureau : l'œil, Dupliquer, Retirer. */
  gestes: Gestes;
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
  /** Rouvre le choix du bloc (la flèche d'un bloc neuf, au téléphone) ; `ajoutOuvert` dit que c'est fait. */
  demandeAjout?: { enBas: boolean; brouillon?: Bloc } | null;
  ajoutOuvert?: () => void;
  /** Au téléphone, sous la page : l'offre du dessus, en une ligne (voir `AppelOffre`). Au bureau, elle est dans la barre latérale. */
  appel?: ReactNode;
  /** Au bureau, en tête de la zone de l'aperçu : l'adresse de la page, Copier et « Voir ma page ». */
  teteApercu?: ReactNode;
}) {
  // Le design ou les réseaux. Au bureau, le design est l'onglet de droite, les réseaux s'ouvrent dans le profil ; au téléphone, dans une feuille.
  const [cote, setCote] = useState<Cote | null>(null);
  // Un pseudo venu du choix des blocs, qui attend son réseau dans les réseaux ouverts.
  const [pseudoReseau, setPseudoReseau] = useState('');
  // Le tiroir du design ouvert d'emblée (les couleurs, juste après les avoir prises), le temps d'une ouverture ;
  // la clé remonte le design s'il était déjà ouvert sur un autre tiroir.
  const [tiroirDepart, setTiroirDepart] = useState<Tiroir | undefined>();
  const [cleDesign, setCleDesign] = useState(0);
  const [ajout, setAjout] = useState(false);
  // Au bureau, la page à droite, à la largeur d'un téléphone ou sur un ordinateur.
  const [largeur, setLargeur] = useState<'telephone' | 'ordinateur'>('telephone');
  // La page sur un ordinateur s'ouvre par-dessus le travail : la bascule y prend la main, Échap revient au téléphone,
  // et la main revient à la bascule de la carte.
  const calque = useRef<HTMLDivElement>(null);
  const ordiOuvert = useRef(false);
  useEffect(() => {
    if (largeur === 'telephone') {
      if (ordiOuvert.current) document.querySelector<HTMLElement>('.adm-apercu-colle .adm-vues [aria-checked="true"]')?.focus({ preventScroll: true });
      ordiOuvert.current = false;
      return;
    }
    ordiOuvert.current = true;
    calque.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus({ preventScroll: true });
    const touche = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented && !document.querySelector('[role="dialog"]')) { e.preventDefault(); setLargeur('telephone'); } };
    addEventListener('keydown', touche);
    return () => removeEventListener('keydown', touche);
  }, [largeur]);
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
  // Au bureau : la photo et la bio du profil (où mènent les étapes de « Bien démarrer »), et l'écran du téléphone.
  const photoBureau = useRef<HTMLButtonElement>(null);
  const bioBureau = useRef<HTMLTextAreaElement>(null);
  const ecran = useRef<HTMLDivElement>(null);
  const id = useId();
  const principal = compte.principal;
  const visibles = blocs.filter(b => principal || !TYPES_PRINCIPAL.includes(b.type));
  const neufVu = neuf && brouillonNeuf(neuf.bloc);
  const avecNeuf = avecLeNeuf(visibles, neufVu, !!neuf?.enBas);
  // La page se dessine comme les visiteurs la verront : sans Starter, aux couleurs de son thème. Les réglages, eux, gardent tout.
  // Quand les offres sont en vente, le design s'essaie : il se montre ici, et le bandeau de Ma page dit qu'il est à l'essai.
  const droits = useDroits();
  const essai = !!useVoirOffres();
  const vus = essai ? avecEssai(droits) : droits;
  const montree = vus.couleurs ? reglages : { ...reglages, couleurs: SANS_COULEURS };

  // Les réglages du dernier rendu : une annulation tardive ne défait que son propre champ.
  const derniers = useRef(reglages);
  derniers.current = reglages;
  const profil = (champs: Partial<Reglages['profil']>) => onReglages({ ...reglages, profil: { ...reglages.profil, ...champs } });
  /** Le nom ou la bio changés puis quittés : le message propose de revenir à la valeur d'avant. */
  const modifie = (champ: 'nom' | 'bio', avant: string) => annoncer({ texte: champ === 'nom' ? 'Nom mis à jour' : 'Bio mise à jour', annuler: () => { onReglages({ ...derniers.current, profil: { ...derniers.current.profil, [champ]: avant } }); annoncer({ texte: 'Changements annulés', genre: 'info' }); } });
  const nomVide = () => annoncer({ texte: 'Ton nom ne peut pas rester vide : il revient tel qu’il était.', genre: 'info' });

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
    if (!grand && (toile.current?.getBoundingClientRect().top ?? 0) < 0) toile.current?.scrollIntoView({ block: 'start', behavior: reduit() ? 'auto' : 'smooth' });
    depart.current = null;
    setTiroirDepart(undefined);
    setPseudoReseau('');
    setCote(null);
  }
  /** Avant de passer à autre chose : le design se ferme, les réseaux aussi s'ils mènent quelque part. */
  const quitterCote = () => {
    if (!cote) return true;
    if (cote === 'reseaux' && reseauFaux()) return false;
    fermerCote();
    return true;
  };
  /** Ouvre le design ou les réseaux, après avoir écrit et fermé ce qui était ouvert. Faux si quelque chose le retient. */
  function ouvrirCote(c: Cote) {
    if (cote === c) return true;
    if (!quitterCote() || !fermerEdition()) return false;
    depart.current = reglages;
    setCote(c);
    // Au téléphone, le design s'ouvre en laissant voir le haut de la page, au-dessus de la feuille.
    if (!grand && c === 'design' && toile.current) scrollTo({ top: Math.max(0, toile.current.getBoundingClientRect().top + scrollY - 96) });
    return true;
  }
  /** « Annuler mes changements », au bureau : le design ou les réseaux reviennent à ce qu'ils étaient en ouvrant. */
  const annulerCote = () => { if (depart.current) onReglages(depart.current); annoncer({ texte: 'Changements annulés', genre: 'info' }); };
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
    try { profil({ avatar: await envoyerImage(await preparerImage(f, 'photo')) }); } catch { annoncer({ texte: 'La photo n’est pas passée. Essaie une autre image, en JPG ou PNG.', genre: 'info', long: true }); } finally { setEnvoi(false); if (fichier.current) fichier.current.value = ''; }
  }
  // L'aperçu du design au téléphone montre la page des visiteurs : sans l'offre, ni drop, ni liste, ni avis, ni compte à rebours.
  const direct = <ApercuDirect page={{ ...selonDroits(reglages, visibles, vus), compte }} />;

  // Le bouton du bas de la page pose le bloc en bas ; celui du haut, en haut.
  const enBas = useRef(false);
  // Au bureau, le champ au-dessus des blocs, seule entrée du choix : le bouton de l'en-tête et la touche A le demandent.
  const [demandeChamp, setDemandeChamp] = useState(false);
  /**
   * Ajouter : ce qui est tapé dans l'éditeur s'écrit d'abord ; puis le choix du bloc s'ouvre, au téléphone dans sa
   * feuille, au bureau dans le champ au-dessus des blocs (le contenu revient d'abord, si le design était ouvert).
   */
  function ouvrirAjout(bas = false) {
    if (!liberer() || (cote === 'reseaux' && reseauFaux())) return;
    vibrer(5);
    if (grand) {
      if (cote === 'design' && !quitterCote()) return;
      setDemandeChamp(true);
      return;
    }
    enBas.current = bas;
    brouillonAjout.current = null;
    setAdresseAjout('');
    setAjout(true);
  }
  /*
   * Revenu d'un bloc neuf par sa flèche, avec ce qui était tapé : l'adresse attend dans « Colle une adresse », le bloc qu'on
   * choisit reprend le tout, et refermer la liste garde ce qui était tapé, masqué, comme la croix du bloc (« Annuler » l'oublie).
   */
  const brouillonAjout = useRef<Bloc | null>(null);
  // Ce que le champ montre, gardé le temps que la liste se referme.
  const [adresseAjout, setAdresseAjout] = useState('');
  // Revenu d'un bloc neuf par sa flèche : la liste se rouvre telle qu'on l'avait quittée, une fois.
  useEffect(() => {
    if (!demandeAjout) return;
    enBas.current = demandeAjout.enBas;
    brouillonAjout.current = demandeAjout.brouillon ?? null;
    setAdresseAjout(demandeAjout.brouillon?.url ?? '');
    setAjout(true);
    ajoutOuvert?.();
  }, [demandeAjout]); // eslint-disable-line react-hooks/exhaustive-deps
  /**
   * Un bloc pris dans le choix, avec l'adresse tapée s'il vient d'une ligne qu'elle donne : il reste ce qu'on a choisi.
   * Faux si quelque chose le retient.
   */
  const ajouter = (type: TypeBloc, modele?: Partial<Bloc>, url?: string) => {
    setAjout(false);
    const d = brouillonAjout.current, bas = enBas.current;
    brouillonAjout.current = null;
    enBas.current = false;
    if (!quitterCote()) return false;
    // Un autre bloc reprend ce qui était tapé (l'adresse s'il en a une, le texte écrit, les réglages), sauf si une autre adresse a été tapée depuis.
    const base = d && (!url || adresseSaisie(d.url) === url) ? d : null;
    const repris = base && { ...versType(base, type, !!base.titre.trim() && base.titre !== nouveauBloc(base.type, base.id).titre), ...(TYPES_ADRESSE.includes(type) ? {} : { url: '' }) };
    const bloc = { ...(repris || nouveauBloc(type, nouvelId())), ...modele, ...(url && TYPES_ADRESSE.includes(type) ? { url } : {}) };
    onAjouter(bloc, bas, !!adresseSaisie(bloc.url));
    return true;
  };
  /**
   * Une adresse prise telle quelle, collée ou par la ligne qu'elle appelle : le bloc neuf la suit (une vidéo, un agenda…).
   * La même adresse que le bloc neuf d'où l'on revient par sa flèche : on le retrouve tel qu'on l'avait laissé.
   */
  const coller = (url: string) => {
    setAjout(false);
    const d = brouillonAjout.current, bas = enBas.current;
    brouillonAjout.current = null;
    enBas.current = false;
    if (!d || adresseSaisie(d.url) !== url) return ajouterAdresse(url, bas);
    if (!quitterCote()) return false;
    onAjouter(d, bas, false, true);
    return true;
  };
  /** La liste refermée : ce qui était tapé dans un bloc neuf se garde, masqué, s'il est valable (voir `masque` dans `EditeurBloc`). */
  const fermerAjout = () => {
    setAjout(false);
    const d = brouillonAjout.current, bas = enBas.current;
    brouillonAjout.current = null;
    enBas.current = false;
    const v = d && verifierBloc(d).bloc;
    if (v) onPoser(v, bas);
  };
  /** Un pseudo tapé dans le choix (« @lilian ») : les réseaux s'ouvrent, et demandent lequel. Faux si quelque chose le retient. */
  const reseau = (pseudo: string) => {
    fermerAjout();
    if (!ouvrirCote('reseaux')) return false;
    setPseudoReseau(pseudo);
    return true;
  };
  /** Une adresse collée devient un lien neuf, qu'on règle avant de l'ajouter. Faux si quelque chose le retient. */
  const ajouterAdresse = (url: string, bas = false) => {
    if (!quitterCote()) return false;
    onAjouter({ ...nouveauBloc('lien', nouvelId()), url }, bas);
    return true;
  };
  const ordonner = (liste: Bloc[]) => { if (!deplace) { setDeplace(true); try { localStorage.setItem(`hopla-bloc-deplace:${compte.pseudo}`, '1'); } catch { /* stockage refusé */ } } onOrdonner(liste); };
  const ouvrirBloc = (bloc: Bloc) => {
    if (!quitterCote()) return;
    if (ouverts < 2) { setOuverts(ouverts + 1); try { localStorage.setItem(`hopla-blocs-ouverts:${compte.pseudo}`, String(ouverts + 1)); } catch { /* stockage refusé */ } }
    onOuvrir(bloc);
  };
  /** Un clic sur un bloc de la page, au bureau : sa rangée s'ouvre, ou revient en vue si elle l'est déjà. Le focus ne bouge pas : c'est un geste de souris. */
  const ouvrirDepuisApercu = (bloc: Bloc) => {
    if (bloc.id !== (choisi ?? neuf?.bloc.id)) { ouvrirBloc(bloc); return; }
    const li = document.querySelector<HTMLElement>(`.adm-rangee[data-id="${CSS.escape(bloc.id)}"]`);
    if (li) montrerRangee(li);
  };

  // Au clavier : « A » ouvre Ajouter ; une adresse collée sur la page (hors d'un champ) devient un lien neuf.
  const raccourcis = useRef({ ouvrirAjout, ajouterAdresse });
  raccourcis.current = { ouvrirAjout, ajouterAdresse };
  useEffect(() => {
    const libre = (e: Event) => !(e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable], [role="dialog"]') && !document.querySelector('[role="dialog"]');
    const touche = (e: KeyboardEvent) => { if ((e.key === 'a' || e.key === 'A') && !e.defaultPrevented && !e.metaKey && !e.ctrlKey && !e.altKey && libre(e)) { e.preventDefault(); raccourcis.current.ouvrirAjout(); } };
    const coller = (e: ClipboardEvent) => {
      if (!libre(e)) return;
      const url = adresseSaisie(e.clipboardData?.getData('text') ?? '');
      if (!url) return;
      e.preventDefault();
      raccourcis.current.ajouterAdresse(url);
    };
    addEventListener('keydown', touche); addEventListener('paste', coller);
    return () => { removeEventListener('keydown', touche); removeEventListener('paste', coller); };
  }, []);

  /** Une étape de « Bien démarrer » mène à l'endroit où elle se fait : sur la page au téléphone, dans le profil au bureau. */
  function aller(d: Destination) {
    vibrer(5);
    if (d === 'lien') return ajouter('lien');
    if (d === 'photo') return choisirFichier(fichier.current, grand ? photoBureau.current : toile.current?.querySelector('.lp-ed-photo'));
    if (d === 'theme') return ouvrirCote('design');
    if (d === 'reseaux') return ouvrirCote('reseaux');
    // La bio : on y arrive en contenu, le design refermé.
    if (grand && !quitterCote()) return;
    setTimeout(() => {
      const bio = grand ? bioBureau.current : toile.current?.querySelector<HTMLTextAreaElement>('.lp-bio');
      bio?.scrollIntoView({ behavior: reduit() ? 'auto' : 'smooth', block: 'center' });
      focusSaisie(bio, { preventScroll: true });
    }, 60);
  }

  const badge = principal && <Interrupteur label="Badge vérifié" actif={reglages.profil.badge} onChange={v => profil({ badge: v })} />;
  const design = <DesignTiroirs key={cleDesign} reglages={reglages} onChange={onReglages} envoyerImage={envoyerImage} principal={principal} vedettes={blocs.filter(b => b.vedette).length} pied={badge} initial={tiroirDepart} />;
  const reseaux = <OngletApparence reglages={reglages} onChange={onReglages} envoyerImage={envoyerImage} principal={principal} parties={['reseaux']} pseudo={pseudoReseau} onPseudo={() => setPseudoReseau('')} />;

  if (grand) {
    const enDesign = cote === 'design';
    const actifs = reglages.reseaux.filter(r => adresseSaisie(r.url));
    /** Contenu ou Design : quitter le design le referme (et dit ce qui a changé). Faux si quelque chose retient. */
    const choisirOnglet = (o: 'contenu' | 'design') => (o === 'design' ? ouvrirCote('design') : !enDesign || quitterCote());
    // Téléphone ou ordinateur : la même bascule, sur la carte de l'aperçu et en haut de la page sur un ordinateur.
    const vues = (
      <div role="radiogroup" aria-label="Voir ma page" onKeyDown={e => flechesRadio(e)} className="adm-vues">
        {(['telephone', 'ordinateur'] as const).map(l => (
          <button key={l} type="button" role="radio" aria-checked={largeur === l} tabIndex={largeur === l ? 0 : -1} onClick={() => setLargeur(l)} className="adm-outil">
            <Icone nom={l === 'telephone' ? 'mobile' : 'ordinateur'} taille={l === 'telephone' ? 15 : 16} />{l === 'telephone' ? 'Téléphone' : 'Ordinateur'}
          </button>
        ))}
      </div>
    );
    // Le bloc neuf se voit sur la page, à la place qu'il prendra. Il n'y est pas encore : un clic sur lui ramène à sa rangée.
    return (
      <div className="adm-studio adm-studio-bureau">
        {/* Le geste principal est à droite de l'en-tête, comme celui de chaque onglet. */}
        <ActionEntete>
          {/* Il mène au champ au-dessus des blocs, qui prend la main, sa liste ouverte. */}
          <BoutonPrincipal onClick={() => ouvrirAjout()} aria-keyshortcuts="A" title="Ajouter (A, ou colle une adresse)"><Icone nom="ui-plus" taille={14} className="shrink-0" />Ajouter un bloc</BoutonPrincipal>
        </ActionEntete>

        <div className="adm-edition">
          <div className="adm-edition-col">
            {/* « Bien démarrer », tant que la page n'a pas commencé : au-dessus des onglets, il mène au profil, au design ou à un lien neuf. */}
            <HautLiens compte={compte} reglages={reglages} demarrage={demarrage} aller={aller} annoncer={annoncer} feuille={demarrageOuvert} fermerFeuille={fermerDemarrage} />

            {/* Collés sous l'en-tête : on change d'onglet sans remonter. */}
            <div className="adm-onglets-edition">
              <div role="tablist" aria-label="Ma page" className="adm-onglets"
                onKeyDown={e => {
                  const vers = ({ ArrowLeft: 'contenu', ArrowRight: 'design', Home: 'contenu', End: 'design' } as const)[e.key as 'Home'];
                  if (!vers) return;
                  e.preventDefault();
                  if (choisirOnglet(vers)) document.getElementById(`${id}-${vers}`)?.focus();
                }}>
                {(['contenu', 'design'] as const).map(o => {
                  const pris = (o === 'design') === enDesign;
                  return (
                    <button key={o} id={`${id}-${o}`} type="button" role="tab" aria-selected={pris} aria-controls={`${id}-panneau`} tabIndex={pris ? 0 : -1}
                      onClick={() => { if (!pris) { vibrer(4); choisirOnglet(o); } }}>
                      {o === 'contenu' ? 'Contenu' : 'Design'}
                    </button>
                  );
                })}
              </div>
              {enDesign && change && (
                <button type="button" onClick={annulerCote} className={`${classeBouton.discret} ml-auto`}><Icone nom="ui-retour" taille={15} className="shrink-0" />Annuler mes changements</button>
              )}
            </div>

            <div id={`${id}-panneau`} role="tabpanel" aria-labelledby={`${id}-${enDesign ? 'design' : 'contenu'}`} className="adm-edition-corps">
              {enDesign ? design : (
                <>
                  <section className="adm-profil" aria-label="Ton profil">
                    <div className="adm-profil-haut">
                      {/* La photo se clique elle-même ; sans photo, l'icône seule à sa place : pas de pastille par-dessus. */}
                      <button ref={photoBureau} type="button" className="adm-profil-photo" onClick={e => choisirFichier(fichier.current, e.currentTarget)}
                        aria-label={reglages.profil.avatar ? 'Changer la photo' : 'Ajouter une photo'} title={reglages.profil.avatar ? 'Changer la photo' : 'Ajouter une photo'}
                        aria-busy={envoi || undefined} data-envoi={envoi || undefined}>
                        {reglages.profil.avatar ? <img src={reglages.profil.avatar} alt="" /> : <Icone nom="utilisateur" taille={30} />}
                      </button>
                      <div className="adm-profil-texte">
                        {/* Le nom et la bio se tapent en place, comme sur la page au téléphone : ils ressemblent à du texte jusqu'au survol. */}
                        <div className="adm-profil-ligne">
                          <input className="adm-profil-nom" value={reglages.profil.nom} maxLength={80} placeholder="Ton nom" aria-label="Ton nom"
                            style={{ width: `${Math.max(reglages.profil.nom.length, 7) + 2}ch` }} onChange={e => profil({ nom: e.target.value })}
                            onFocus={e => { e.currentTarget.dataset.avant = reglages.profil.nom; }}
                            onBlur={e => { const avant = e.currentTarget.dataset.avant ?? ''; if (!e.currentTarget.value.trim()) { profil({ nom: avant.trim() || compte.pseudo }); nomVide(); } else if (e.currentTarget.value !== avant) modifie('nom', avant); }} />
                          {reglages.profil.badge && <span className="adm-profil-badge" role="img" aria-label="Badge vérifié" title="Badge vérifié"><Icone nom="badge" taille={15} /></span>}
                        </div>
                        <ChampBio cible={bioBureau} valeur={reglages.profil.bio} onChange={bio => profil({ bio })} onQuitter={avant => modifie('bio', avant)} />
                      </div>
                    </div>
                    <div className="adm-profil-reseaux">
                      {actifs.map(r => <span key={r.reseau + r.url} className="adm-reseau" title={NOMS_RESEAUX[r.reseau]} style={{ color: couleurReseau(r.reseau) }}><Icone nom={r.reseau} taille={18} /></span>)}
                      <button type="button" className="adm-lien" aria-expanded={cote === 'reseaux'} aria-controls={`${id}-reseaux`}
                        onClick={() => { vibrer(4); if (cote === 'reseaux') quitterCote(); else ouvrirCote('reseaux'); }}>
                        {cote === 'reseaux' ? 'Fermer les réseaux' : actifs.length ? 'Modifier mes réseaux' : 'Ajouter tes réseaux'}
                      </button>
                    </div>
                    {cote === 'reseaux' && (
                      <div id={`${id}-reseaux`} className="adm-profil-edition">
                        {reseaux}
                        <div className="flex items-center justify-end gap-1">
                          {change && <button type="button" onClick={annulerCote} className={classeBouton.discret}><Icone nom="ui-retour" taille={15} className="shrink-0" />Annuler mes changements</button>}
                          <BoutonSecondaire onClick={() => quitterCote()}>Terminé</BoutonSecondaire>
                        </div>
                      </div>
                    )}
                  </section>

                  <ChampAjout principal={principal} onChoisir={ajouter} onColler={coller} onReseau={reseau} demande={demandeChamp} demandeVue={() => setDemandeChamp(false)} />

                  <ListeBlocs blocs={visibles} clics={clics} choisi={choisi} editeur={editeur} neuf={neuf} gestes={{ ...gestes, dupliquer: b => { if (quitterCote()) gestes.dupliquer(b); } }}
                    onOrdonner={ordonner} onOuvrir={ouvrirBloc} fermer={fermerEdition} onAjouter={() => ouvrirAjout()} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* La troisième zone, d'un bord à l'autre de l'écran à droite (24 octobre 2026, d'après Linktree et Later) : l'adresse en tête,
            puis la page, qui suit chaque frappe ; un clic sur un bloc ouvre sa rangée. */}
        <aside className="adm-apercu-cote" aria-label="Aperçu de ta page">
          <div className="adm-apercu-tete">{teteApercu}</div>
          <div className="adm-apercu-colle">
            {vues}
            <Telephone ecran={ecran} choisi={choisi ?? neuf?.bloc.id ?? null}>
              <PageLiens page={{ reglages: montree, blocs: avecNeuf, compte }}
                liste={(liste, rendu) => <BlocsApercu blocs={liste} rendu={rendu} choisi={choisi ?? neuf?.bloc.id ?? null} ouvrir={ouvrirDepuisApercu} />} />
            </Telephone>
          </div>
        </aside>

        {/* Sur un ordinateur, la page s'ouvre par-dessus l'espace de travail, à sa vraie taille dès que l'écran la tient
            (24 octobre 2026, critique série 2 : réduite à côté de l'édition, elle était illisible sur un portable, et la colonne sautait). */}
        {largeur === 'ordinateur' && (
          <div ref={calque} className="adm-ordi-calque" role="region" aria-label="Ta page sur un ordinateur">
            {vues}
            <ApercuBureau page={visiteurs} />
          </div>
        )}

        <input ref={fichier} type="file" accept="image/*" className="adm-fichier" tabIndex={-1} aria-hidden="true" onChange={e => photo(e.target.files?.[0])} />
      </div>
    );
  }

  const edition: Edition = {
    profil,
    photo: source => choisirFichier(fichier.current, source),
    envoiPhoto: envoi,
    reseaux: () => ouvrirCote('reseaux'),
    modifie,
    nomVide,
    liste: (liste, rendu) => <BlocsEditables blocs={liste} rendu={rendu} choisi={choisi ?? neuf?.bloc.id ?? null} neuf={neuf?.bloc.id} onOrdonner={ordonner} onOuvrir={ouvrirBloc} onAjouter={() => ouvrirAjout(true)} />,
  };
  // Le pied des feuilles du téléphone, qui s'enregistrent seules : Terminé ferme, Annuler (dès qu'il y a un changement) revient au départ.
  const piedAnnuler = (fermer: (apres?: () => void) => void) => (
    <div className="flex items-center gap-2">
      {change && <BoutonSecondaire onClick={() => { const avant = depart.current; fermer(() => { if (avant) onReglages(avant); fermerCote(true); }); }}>Annuler</BoutonSecondaire>}
      <BoutonPrincipal className="flex-1" onClick={() => fermer()}>Terminé</BoutonPrincipal>
    </div>
  );

  return (
    <div className="adm-studio">
      <div>
        {/* Au téléphone, les deux gestes de la page sont posés sur la barre des onglets, à portée du pouce : la page commence sous l'en-tête. */}
        <aside className="adm-editor-tools" aria-label="Outils de la page">
          {/* Ajouter prend la place qui reste ; sur un écran étroit, il se dit en un mot plutôt que sur deux lignes. */}
          <div className="grid grid-cols-[1fr_auto] gap-2 whitespace-nowrap">
            <BoutonPrincipal onClick={() => ouvrirAjout()} aria-keyshortcuts="A" title="Ajouter (A, ou colle une adresse)"><Icone nom="ui-plus" taille={17} className="shrink-0" /><span>Ajouter<span className="max-[359px]:hidden"> un bloc</span></span></BoutonPrincipal>
            <BoutonSecondaire onClick={() => ouvrirCote('design')}><Icone nom="palette" taille={17} className="shrink-0" />Personnaliser</BoutonSecondaire>
          </div>
        </aside>

        {/* La feuille de « Bien démarrer », que l'anneau de l'en-tête ouvre. */}
        <HautLiens compte={compte} reglages={reglages} demarrage={demarrage} aller={aller} annoncer={annoncer} feuille={demarrageOuvert} fermerFeuille={fermerDemarrage} />

        <div ref={toile} className="adm-apercu adm-toile relative scroll-mt-24 overflow-hidden rounded-[24px]">
          <PageLiens page={{ reglages: montree, blocs: avecNeuf, compte }} edition={edition} />
          {/* Le geste s'écrit sur la page même, dans sa couleur, en haut à gauche : pas une ligne de plus au-dessus d'elle. */}
          {astuce && <p className="pointer-events-none absolute top-4 left-4 right-16 text-[13px] font-medium leading-snug" style={{ color: variablesTheme(themeDe(montree))['--doux'] }}>{visibles.length < 2 ? 'Touche pour modifier.' : 'Touche pour modifier, maintiens pour déplacer.'}</p>}
        </div>
        {appel && <div className="adm-appel-sous">{appel}</div>}
      </div>

      <input ref={fichier} type="file" accept="image/*" className="adm-fichier" tabIndex={-1} aria-hidden="true" onChange={e => photo(e.target.files?.[0])} />
      <FeuilleAjout ouverte={ajout} onFermer={fermerAjout} onChoisir={ajouter} onColler={coller} onReseau={reseau} principal={principal} adresse={adresseAjout} />
      <Feuille ouverte={cote === 'reseaux'} onFermer={() => fermerCote()} retenir={reseauFaux} titre="Réseaux" cote apercu={direct} pied={piedAnnuler}>
        {reseaux}
      </Feuille>
      <Feuille ouverte={cote === 'design'} onFermer={() => fermerCote()} titre="Design" cote apercu={direct} pied={piedAnnuler}>
        {design}
      </Feuille>
    </div>
  );
}

/** La bio du profil, au bureau : tapée en place, le champ grandit avec le texte. */
function ChampBio({ cible, valeur, onChange, onQuitter }: { cible: RefObject<HTMLTextAreaElement | null>; valeur: string; onChange: (v: string) => void; onQuitter: (avant: string) => void }) {
  const avant = useRef('');
  useLayoutEffect(() => {
    const t = cible.current;
    if (!t || CSS.supports('field-sizing', 'content')) return;
    t.style.height = 'auto';
    t.style.height = `${t.scrollHeight}px`;
  });
  return <textarea ref={cible} className="adm-profil-bio" rows={1} value={valeur} maxLength={300} placeholder="Une phrase sur toi" aria-label="Ta bio" onChange={e => onChange(e.target.value)}
    onFocus={e => { avant.current = e.currentTarget.value; }} onBlur={e => { if (e.currentTarget.value !== avant.current) onQuitter(avant.current); }} />;
}

/** Le nom d'un bloc dans sa rangée : son texte, sinon son adresse, sinon son genre. */
function nomBloc(b: Bloc) {
  const titre = b.titre.trim().split('\n')[0];
  return titre || (TYPES_ADRESSE.includes(b.type) && b.url ? sansSchema(b.url).replace(/\/$/, '') : '') || (b.type === 'lieu' ? b.adressePostale.split('\n')[0].trim() : '') || typeDe(b).nom;
}
/** Ce qui se lit en gris à côté du nom : le prix d'un produit, l'adresse d'un bloc qui mène quelque part, sinon le genre du bloc. */
function sousBloc(b: Bloc, nom: string) {
  const sous = b.type === 'produit' && b.prix ? b.prix : TYPES_ADRESSE.includes(b.type) && b.url ? sansSchema(b.url).replace(/\/$/, '') : typeDe(b).nom;
  return sous === nom ? '' : sous;
}

/**
 * Le bloc tel que la page des visiteurs le dessine : sans Starter, ni compte à rebours gardé d'une offre
 * passée, ni code promo. Seul le dessin change : l'éditeur reçoit le bloc tel qu'il est enregistré.
 */
function commeSurLaPage(bloc: Bloc, droits: Droits): Bloc {
  let b = bloc;
  if (!droits.programmation && b.compteARebours) b = { ...b, compteARebours: false };
  if (!droits.vitrine && b.partenariat?.code) b = { ...b, partenariat: { ...b.partenariat, code: '' } };
  if (!droits.galerie && b.images.length > GALERIE_GRATUITE) b = { ...b, images: b.images.slice(0, GALERIE_GRATUITE) };
  if (!droits.cadeau && b.cadeau) b = { ...b, cadeau: null };
  return b;
}

/** Ce qu'un bloc a de particulier, dit de la même façon dans la liste du bureau et sur la page du téléphone. */
function etatBloc(bloc: Bloc, droits: Droits) {
  // Un bloc que l'offre ne comprend plus reste là, grisé comme un bloc masqué : il revient avec l'offre.
  const attend = ([[!!bloc.acces, 'drops'], [bloc.type === 'inscription', 'listeEmail'], [bloc.type === 'preuve', 'avis'], [TYPES_VITRINE.includes(bloc.type), 'vitrine'], [bloc.type === 'formulaire', 'formulaire'], [bloc.disposition === 'grille', 'grille'], [bloc.type === 'flux', 'flux']] as [boolean, Fonction][]).find(([oui, f]) => oui && !droits[f])?.[1];
  const prive = !bloc.public || !!attend;
  // Une règle que l'offre ne comprend plus n'est pas dite : sans Starter, un lancement attend sa date sans compte à rebours (« programmé »).
  const regles = etiquettes(bloc, droits);
  // Un créneau « affiché seulement » qui le retire en ce moment le grise aussi : la page éditée montre ce que voient les visiteurs.
  const programme = horsCreneauOuDates(bloc, !!droits.heure) && !regles.includes('Compte à rebours');
  // Chaque règle porte un picto, et en bulle le nom qu'elle a dans l'éditeur (une partie de Visibilité, une ligne de « Plus de
  // réglages ») : on la reconnaît sans l'ouvrir.
  const selonHeure = !!(bloc.creneau && droits.heure);
  const puces = [
    { oui: !programme && (selonHeure || !!(bloc.compteARebours && bloc.debut && droits.programmation)), icone: 'horloge', nom: selonHeure ? 'Selon l’heure' : 'Compte à rebours' },
    { oui: !!(bloc.cache?.length || bloc.audience?.sources.length), icone: 'cible', nom: 'Selon le réseau' },
    { oui: !!(bloc.pays && droits.pays), icone: 'globe', nom: 'Selon le pays' },
    { oui: !!bloc.acces, icone: 'cadenas', nom: 'Accès réservé' },
    { oui: !!bloc.partenariat, icone: 'bloc-partenaire', nom: 'Lien partenaire' },
  ].filter(p => p.oui);
  // Ce qu'un lecteur d'écran entend après le nom.
  const dit = [attend ? `pas montré sans Hopla ${offreDe(attend)}` : prive && 'masqué', programme && 'programmé', bloc.partenariat && 'lien partenaire', ...regles].filter(Boolean).join(', ');
  return { attend, prive, programme, regles, puces, dit };
}

/** Le bloc entier répond : ses liens, sa vidéo et son formulaire sortent de l'ordre de tabulation, même arrivés après coup (la dernière vidéo, chargée à part). */
function useFige(noeud: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const n = noeud.current;
    if (!n) return;
    const figer = () => n.querySelectorAll(':scope > :not(.lp-ed-puces):not([inert])').forEach(x => x.setAttribute('inert', ''));
    figer();
    const veille = new MutationObserver(figer);
    veille.observe(n, { childList: true });
    return () => veille.disconnect();
  });
}

/** La rangée ouverte se montre en entier si elle tient, sinon par son haut : son en-tête ne passe jamais sous les onglets collés. */
function montrerRangee(li: HTMLElement) {
  const marge = margeHaut(), r = li.getBoundingClientRect(), bas = innerHeight - 16;
  const ecart = r.top < marge ? r.top - marge : r.bottom > bas ? Math.min(r.bottom - bas, r.top - marge) : 0;
  if (Math.abs(ecart) > 1) scrollBy({ top: ecart, behavior: reduit() ? 'auto' : 'smooth' });
}

/** Au bureau, une rangée ne se déplace que de haut en bas. */
const vertical: Modifier = ({ transform }) => ({ ...transform, x: 0 });

/**
 * La liste des blocs, au bureau : une rangée par bloc, déplacée par sa poignée,
 * dépliée d'un clic sur ses réglages. Une seule ouverte à la fois : en passant
 * d'une rangée à l'autre, celle qu'on vient de cliquer reste sous la souris.
 */
function ListeBlocs({ blocs, clics, choisi, editeur, neuf, gestes, onOrdonner, onOuvrir, fermer, onAjouter }: {
  blocs: Bloc[]; clics: Record<string, number>; choisi: string | null; editeur: ReactNode; neuf: { bloc: Bloc; enBas: boolean } | null;
  gestes: Gestes; onOrdonner: (blocs: Bloc[]) => void; onOuvrir: (bloc: Bloc) => void; fermer: () => boolean; onAjouter: () => void;
}) {
  const droits = useDroits();
  const liste = useRef<HTMLUListElement>(null);
  const capteurs = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] } }),
  );
  function deplacer({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const de = blocs.findIndex(b => b.id === active.id), vers = blocs.findIndex(b => b.id === over.id);
    if (de < 0 || vers < 0) return;
    vibrer(10);
    onOrdonner(arrayMove(blocs, de, vers));
  }

  const ouvert = choisi ?? neuf?.bloc.id ?? null;
  const rangee = (id: string) => liste.current?.querySelector<HTMLElement>(`.adm-rangee[data-id="${CSS.escape(id)}"]`) ?? null;
  // La rangée cliquée et sa hauteur à l'écran avant le clic : celle qui se replie au-dessus d'elle ne la fait pas sauter.
  const ancre = useRef<{ id: string; haut: number; quand: number } | null>(null);
  const ouvrir = (b: Bloc) => {
    const li = rangee(b.id);
    ancre.current = li ? { id: b.id, haut: li.getBoundingClientRect().top, quand: Date.now() } : null;
    onOuvrir(b);
  };
  const precedent = useRef(ouvert);
  useLayoutEffect(() => {
    const avant = precedent.current;
    precedent.current = ouvert;
    if (ouvert === avant) return;
    const a = ancre.current;
    ancre.current = null;
    if (ouvert) {
      const li = rangee(ouvert);
      if (!li) return;
      if (a && a.id === ouvert && Date.now() - a.quand < 1000) {
        const ecart = li.getBoundingClientRect().top - a.haut;
        if (Math.abs(ecart) > 0.5) scrollBy({ top: ecart });
      }
      montrerRangee(li);
    } else if (avant) {
      // Repliée (Échap, son chevron, un clic sur son nom) : son en-tête revient en vue, et le focus s'y pose s'il était dedans.
      const li = rangee(avant);
      if (!li) return;
      const haut = li.getBoundingClientRect().top - margeHaut();
      if (haut < 0) scrollBy({ top: haut - 8 });
      const ici = document.activeElement;
      if (!ici || ici === document.body) li.querySelector<HTMLElement>('.adm-rangee-bouton')?.focus({ preventScroll: true });
    }
  }, [ouvert]); // eslint-disable-line react-hooks/exhaustive-deps

  // Le bloc neuf a sa rangée, en haut ou en bas, à la place qu'il prendra : une fois ajouté, elle reste la même.
  const rangees = avecLeNeuf(blocs, neuf?.bloc, !!neuf?.enBas);
  if (!rangees.length) return (
    <div className="adm-liste-vide">
      <p>Ta page n’a encore aucun bloc.</p>
      <BoutonSecondaire onClick={onAjouter}><Icone nom="ui-plus" taille={15} className="shrink-0" />Ajouter un bloc</BoutonSecondaire>
    </div>
  );
  return (
    <DndContext accessibility={ACCESSIBILITE} sensors={capteurs} collisionDetection={closestCenter} modifiers={[vertical]} onDragStart={() => vibrer(6)} onDragEnd={deplacer}>
      <SortableContext items={blocs.map(b => b.id)} strategy={verticalListSortingStrategy}>
        <ul ref={liste} className="adm-liste-blocs" aria-label="Les blocs de ta page">
          {rangees.map(b => (
            <Rangee key={b.id} bloc={b} droits={droits} clics={clics[b.id] ?? 0} neuf={b.id === neuf?.bloc.id} ouvert={b.id === ouvert}
              editeur={b.id === ouvert ? editeur : null} ouvrir={ouvrir} fermer={fermer} gestes={gestes} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function Rangee({ bloc, droits, clics, neuf, ouvert, editeur, ouvrir, fermer, gestes }: {
  bloc: Bloc; droits: Droits; clics: number; neuf: boolean; ouvert: boolean; editeur: ReactNode;
  ouvrir: (b: Bloc) => void; fermer: () => boolean; gestes: Gestes;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: bloc.id, disabled: neuf, attributes: { roleDescription: 'bloc déplaçable' } });
  const type = typeDe(bloc);
  const etat = etatBloc(bloc, droits);
  const nom = neuf ? `Nouveau bloc : ${type?.nom ?? ''}` : nomBloc(bloc);
  const sous = neuf ? '' : sousBloc(bloc, nom);
  const idReglages = useId();
  // Ouverte, son en-tête colle sous celui de l'onglet ; un trait d'un pixel le sépare des réglages qui passent dessous,
  // seulement tant qu'il colle (23 octobre 2026).
  const tete = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const t = tete.current;
    if (!ouvert || !t) return;
    const voir = () => { const li = t.parentElement; if (li) t.toggleAttribute('data-colle', t.getBoundingClientRect().top - li.getBoundingClientRect().top > 0.5); };
    voir();
    addEventListener('scroll', voir, { capture: true, passive: true });
    addEventListener('resize', voir);
    return () => { removeEventListener('scroll', voir, { capture: true }); removeEventListener('resize', voir); t.removeAttribute('data-colle'); };
  }, [ouvert]);
  // Le picto du bloc s'il en a un (un réseau, un picto choisi), sinon celui de son genre.
  const picto = bloc.icone && ICONES[bloc.icone] ? bloc.icone : type?.picto ?? 'bloc-lien';
  return (
    <li ref={setNodeRef} className="adm-rangee" data-id={bloc.id} data-nom={nom} data-ouvert={ouvert || undefined} data-glisse={isDragging || undefined}
      data-prive={(!neuf && (etat.prive || etat.programme)) || undefined} style={{ transform: CssDnd.Translate.toString(transform), transition }}>
      <div ref={tete} className="adm-rangee-tete">
        {neuf ? <span className="adm-rangee-poignee" aria-hidden="true" /> : (
          <button ref={setActivatorNodeRef} type="button" {...attributes} {...listeners} className="adm-rangee-poignee" aria-label={`Déplacer ${nom}`} title="Glisser pour déplacer">
            <Icone nom="ui-poignee" taille={14} />
          </button>
        )}
        {/* Le nom est le bouton : il déplie la rangée, ou la replie. Un bloc neuf ne se replie pas : il s'ajoute ou s'oublie, en bas. */}
        {neuf ? (
          <span className="adm-rangee-bouton"><Icone nom={picto} taille={15} className="adm-rangee-picto" /><span className="adm-rangee-nom">{nom}</span></span>
        ) : (
          <button type="button" className="adm-rangee-bouton" aria-expanded={ouvert} aria-controls={ouvert ? idReglages : undefined}
            onClick={() => { vibrer(4); if (ouvert) fermer(); else ouvrir(bloc); }}>
            <Icone nom={picto} taille={15} className="adm-rangee-picto" />
            <span className="adm-rangee-nom">{nom}</span>
            {sous && <span className="adm-rangee-sous">{sous}</span>}
            {bloc.vedette && (
              <span className="adm-rangee-marque">
                <span className="adm-rangee-marque-picto" title="Mis en avant" aria-hidden="true"><Icone nom="etoile" taille={13} /></span>
                <span className="adm-rangee-marque-mot">Mis en avant</span>
              </span>
            )}
            {/* Un picto par état, sans étiquette : le nom complet se lit au survol, et un lecteur d'écran l'entend. */}
            {(etat.attend || etat.programme || etat.puces.length > 0) && (
              <span className="adm-rangee-etats" aria-hidden="true">
                {/* Réservé, le bloc porte le nom de son offre, pas l'œil d'un bloc masqué : on sait pourquoi il est grisé. */}
                {etat.attend && <span title={`Pas montré sans Hopla ${offreDe(etat.attend)}`}><Etiquette fonction={etat.attend} /></span>}
                {etat.programme && <span title="Programmé"><Icone nom="horloge" taille={13} /></span>}
                {etat.puces.map(p => <span key={p.icone} title={p.nom}><Icone nom={p.icone} taille={13} /></span>)}
              </span>
            )}
            {etat.dit && <span className="sr-only">, {etat.dit}</span>}
            {/* Ouverte, la rangée dit ses clics en entier, en bas de ses réglages. */}
            {!ouvert && clics > 0 && <span className="adm-rangee-clics" title="Ces 30 derniers jours">{clics.toLocaleString('fr-FR')} clic{clics > 1 ? 's' : ''}</span>}
          </button>
        )}
        {ouvert ? !neuf && (
          <button type="button" className="adm-rangee-geste" onClick={() => fermer()} aria-label={`Replier ${nom}`} title="Replier (Échap)">
            <Icone nom="ui-chevron" taille={14} className="rotate-180" />
          </button>
        ) : (
          <>
            {/* L'œil et « … » sont des raccourcis de la souris : au clavier, la rangée ouverte par son nom a les mêmes gestes
                (Visibilité, Dupliquer, Retirer), et la liste ne coûte que deux arrêts par bloc (critique série 2). */}
            <button type="button" tabIndex={-1} className="adm-rangee-geste" onClick={() => { vibrer(5); gestes.basculer(bloc); }}
              aria-label={bloc.public ? `Masquer ${nom}` : `Montrer ${nom}`} title={bloc.public ? 'Masquer de ma page' : 'Montrer sur ma page'}>
              <Icone nom={bloc.public ? 'ui-oeil' : 'ui-masque'} taille={15} />
            </button>
            <Menu label={`Gestes : ${nom}`} titre={`Plus de gestes : ${nom}`} className="adm-rangee-geste" tabIndex={-1} elements={[
              { nom: 'Modifier', icone: 'ui-crayon', action: () => ouvrir(bloc) },
              { nom: 'Dupliquer', icone: 'ui-copier', action: () => gestes.dupliquer(bloc) },
              { nom: 'Retirer de ma page', icone: 'ui-corbeille', danger: true, action: () => gestes.supprimer(bloc) },
            ]}>
              <Icone nom="ui-points" taille={15} />
            </Menu>
          </>
        )}
      </div>
      {ouvert && <div id={idReglages} role="region" aria-label={`Réglages : ${nom}`} className="adm-rangee-reglages">{editeur}</div>}
    </li>
  );
}

/**
 * La page à droite, au bureau, dans un téléphone : 390 px d'écran, haut de
 * 760 px, et jusqu'à 932 (un grand iPhone) quand l'écran de l'ordinateur a la
 * place ; réduit d'un bloc seulement quand la hauteur ou la largeur manque. La
 * carte crème autour en prend la taille. Le bloc ouvert dans la liste vient en
 * vue sur l'écran s'il n'y est pas.
 */
function Telephone({ ecran, choisi, children }: { ecran: RefObject<HTMLDivElement | null>; choisi: string | null; children: ReactNode }) {
  const lieu = useRef<HTMLDivElement>(null);
  const [mesure, setMesure] = useState({ echelle: 0, haut: 760 });
  useLayoutEffect(() => {
    const el = lieu.current;
    const carte = el?.closest<HTMLElement>('.adm-apercu-colle');
    if (!el || !carte) return;
    const mesurer = () => {
      // La place sous le haut du téléphone, jusqu'au bas de sa zone, fixée à l'écran.
      const dispo = window.innerHeight - el.getBoundingClientRect().top - (parseFloat(getComputedStyle(carte).paddingBottom) || 0);
      const haut = Math.round(Math.min(932, Math.max(760, dispo - 18)));
      setMesure({ echelle: Math.min(1, el.clientWidth / 408, dispo / (haut + 18)), haut });
    };
    mesurer();
    const obs = new ResizeObserver(mesurer);
    obs.observe(el);
    window.addEventListener('resize', mesurer);
    // L'entrée de l'onglet est une animation : tant qu'elle joue, la zone fixée suit l'onglet qui glisse. On remesure à sa fin.
    document.addEventListener('animationend', mesurer);
    return () => { obs.disconnect(); window.removeEventListener('resize', mesurer); document.removeEventListener('animationend', mesurer); };
  }, []);
  const { echelle, haut } = mesure;
  useEffect(() => {
    const e = ecran.current;
    if (!choisi || !e) return;
    const el = e.querySelector<HTMLElement>(`[data-id="${CSS.escape(choisi)}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect(), b = e.getBoundingClientRect();
    if (r.top >= b.top + 8 && r.bottom <= b.bottom - 8) return;
    // Les mesures sont à l'échelle du téléphone, le défilement de l'écran à la sienne.
    const s = b.height / e.offsetHeight || 1;
    const haut = e.scrollTop + (r.top - b.top) / s - Math.max(16, (e.clientHeight - el.offsetHeight) / 2);
    e.scrollTo({ top: Math.max(0, haut), behavior: reduit() ? 'auto' : 'smooth' });
  }, [choisi, ecran]);
  return (
    <div ref={lieu} className="adm-tel-lieu">
      <div className="adm-tel-cadre" style={{ width: 408 * echelle, height: (haut + 18) * echelle, visibility: echelle ? undefined : 'hidden' }}>
        <div className="adm-tel" style={{ height: haut + 18, transform: `scale(${echelle})` }}>
          {/* L'écran se lit à la souris ; au clavier et pour un lecteur d'écran, tout se fait dans la liste. */}
          <div ref={ecran} className="adm-tel-ecran adm-apercu" aria-hidden="true">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Les blocs de la page à droite : grisés s'ils sont masqués, cerclés quand leur rangée est ouverte, ouverts d'un clic. */
function BlocsApercu({ blocs, rendu, choisi, ouvrir }: { blocs: Bloc[]; rendu: (bloc: Bloc) => ReactNode; choisi: string | null; ouvrir: (b: Bloc) => void }) {
  const droits = useDroits();
  const tuiles = enGrille(blocs);
  return (
    <>
      {blocs.map((bloc, i) => {
        const e = etatBloc(bloc, droits);
        return (
          <BlocApercu key={bloc.id} bloc={bloc} i={i} choisi={choisi === bloc.id} prive={e.prive || e.programme} tuile={tuiles.has(bloc.id)} ouvrir={ouvrir}>
            {rendu(commeSurLaPage(bloc, droits))}
          </BlocApercu>
        );
      })}
    </>
  );
}

function BlocApercu({ bloc, i, choisi, prive, tuile, ouvrir, children }: { bloc: Bloc; i: number; choisi: boolean; prive: boolean; tuile: boolean; ouvrir: (b: Bloc) => void; children: ReactNode }) {
  const noeud = useRef<HTMLDivElement>(null);
  useFige(noeud);
  return (
    <div ref={noeud} className="lp-bloc lp-ed-bloc" data-id={bloc.id} data-type={bloc.type} data-vedette={formatVedette(bloc)} data-tuile={tuile || undefined}
      data-prive={prive || undefined} data-choisi={choisi || undefined} style={{ '--i': i } as CSSProperties}
      onClickCapture={e => { e.preventDefault(); e.stopPropagation(); ouvrir(bloc); }}>
      {children}
    </div>
  );
}

/**
 * La page sur un ordinateur, en aperçu : rendue à 1280 px de large, comme les
 * visiteurs la voient (sa mise en page « Sur ordinateur » comprise), puis
 * réduite pour tenir dans la colonne. Elle ne se modifie pas : la liste, à
 * gauche, la règle.
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

/** Ce que les lecteurs d'écran disent pendant un déplacement, en français : le nom de la rangée au bureau, du bloc au téléphone. */
const nomDe = (id: string | number) => {
  const cle = CSS.escape(String(id));
  const el = document.querySelector<HTMLElement>(`.adm-rangee[data-id="${cle}"], .lp-ed-bloc[data-id="${cle}"]`);
  return el?.dataset.nom ?? el?.getAttribute('aria-label')?.replace(/^Modifier /, '').split(',')[0] ?? 'le bloc';
};
const ACCESSIBILITE = {
  screenReaderInstructions: { draggable: 'Pour déplacer un bloc, appuie sur Espace, puis sur les flèches haut et bas. Espace de nouveau pour le poser, Échap pour annuler.' },
  announcements: {
    onDragStart: ({ active }: { active: { id: string | number } }) => `${nomDe(active.id)} pris.`,
    onDragOver: ({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) => (over ? `${nomDe(active.id)} au niveau de ${nomDe(over.id)}.` : `${nomDe(active.id)} hors de la liste.`),
    onDragEnd: ({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) => (over ? `${nomDe(active.id)} posé.` : `${nomDe(active.id)} reposé à sa place.`),
    onDragCancel: ({ active }: { active: { id: string | number } }) => `Déplacement annulé, ${nomDe(active.id)} reste à sa place.`,
  },
};

/** Au téléphone : la page elle-même, dont chaque bloc s'ouvre d'un toucher et se déplace en le maintenant. */
function BlocsEditables({ blocs, rendu, choisi, neuf, onOrdonner, onOuvrir, onAjouter }: {
  blocs: Bloc[]; rendu: (bloc: Bloc) => ReactNode; choisi: string | null;
  /** Le bloc neuf qu'on remplit, déjà à sa place : il ne s'ouvre ni ne se déplace, il n'est pas encore ajouté. */
  neuf?: string;
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
    onOrdonner(arrayMove(blocs, blocs.findIndex(b => b.id === active.id), blocs.findIndex(b => b.id === over.id)).filter(b => b.id !== neuf));
  }
  const ouvrir = (bloc: Bloc) => { if (bloc.id !== neuf && Date.now() - glisse.current > 250) onOuvrir(bloc); };
  // La toile dessine les blocs comme la page des visiteurs (voir `commeSurLaPage`).
  const droits = useDroits();
  const dessin = (bloc: Bloc) => rendu(commeSurLaPage(bloc, droits));
  const tuiles = enGrille(blocs);
  return (
    <>
      <DndContext accessibility={ACCESSIBILITE} sensors={capteurs} collisionDetection={closestCenter} onDragStart={() => vibrer(6)} onDragEnd={deplacer} onDragCancel={() => { glisse.current = Date.now(); }}>
        <SortableContext items={blocs.map(b => b.id)} strategy={verticalListSortingStrategy}>
          {blocs.map((bloc, i) => <BlocEditable key={bloc.id} bloc={bloc} i={i} choisi={choisi === bloc.id} neuf={bloc.id === neuf} tuile={tuiles.has(bloc.id)} ouvrir={ouvrir}>{dessin(bloc)}</BlocEditable>)}
        </SortableContext>
      </DndContext>
      {/* Sous le dernier bloc, à portée du pouce : le même geste, et le même nom, que le bouton Ajouter du haut. « Ajouter à ma page » reste au geste qui pose le bloc. */}
      <button type="button" onClick={onAjouter} className="lp-ed-zone lp-ed-ajout"><Icone nom="ui-plus" taille={18} /> Ajouter un bloc</button>
    </>
  );
}

function BlocEditable({ bloc, i, choisi, neuf = false, tuile, ouvrir, children }: { bloc: Bloc; i: number; choisi: boolean; neuf?: boolean; tuile: boolean; ouvrir: (b: Bloc) => void; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bloc.id, disabled: neuf });
  const droits = useDroits();
  const { attend, prive, programme, puces, dit } = etatBloc(bloc, droits);
  const nom = bloc.titre || bloc.url || 'ce bloc';
  // Le bloc entier est un seul bouton : ses liens et champs intérieurs sortent de l'ordre de tabulation.
  const noeud = useRef<HTMLDivElement | null>(null);
  useFige(noeud);
  return (
    <div ref={n => { setNodeRef(n); noeud.current = n; }} {...attributes} {...listeners} aria-label={[`Modifier ${nom}`, dit].filter(Boolean).join(', ')} aria-roledescription="bloc déplaçable"
      aria-current={choisi || undefined}
      className="lp-bloc lp-ed-bloc" data-id={bloc.id} data-type={bloc.type} data-vedette={formatVedette(bloc)} data-tuile={tuile || undefined} data-glisse={isDragging || undefined} data-prive={prive || programme || undefined}
      data-choisi={choisi || undefined}
      style={{ '--i': i, transform: CssDnd.Transform.toString(transform), transition } as CSSProperties}
      onClickCapture={e => { e.preventDefault(); e.stopPropagation(); ouvrir(bloc); }}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ouvrir(bloc); } else listeners?.onKeyDown?.(e); }}>
      {children}
      {(prive || programme || puces.length > 0) && (
        <span className="lp-ed-puces" aria-hidden="true">
          {/* Un picto par état, sans étiquette : le nom complet est dans l'aria-label du bloc. */}
          {/* Réservé, le bloc porte le nom de son offre, pas l'œil d'un bloc masqué : on sait pourquoi il est grisé. */}
          {prive && <span className="lp-ed-puce" title={attend ? `Pas montré sans Hopla ${offreDe(attend)}` : 'Masqué'}>{attend ? <Etiquette fonction={attend} /> : <Icone nom="masque" taille={13} />}</span>}
          {programme && <span className="lp-ed-puce" title="Programmé"><Icone nom="horloge" taille={13} /></span>}
          {/* Chaque règle porte le picto de sa ligne dans l'éditeur : on la reconnaît sans l'ouvrir. */}
          {puces.map(p => <span key={p.icone} className="lp-ed-puce" title={p.nom}><Icone nom={p.icone} taille={13} /></span>)}
        </span>
      )}
    </div>
  );
}
