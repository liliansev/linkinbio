import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, Modifier } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS as CssDnd } from '@dnd-kit/utilities';
import type { Bloc, PagePublique, Reglages, TypeBloc } from '../lib/types.ts';
import { SANS_COULEURS, TYPES_PRINCIPAL, estEnLigne, nouveauBloc, sansSchema } from '../lib/types.ts';
import { etiquettes } from '../lib/etiquettes.ts';
import { selonDroits } from '../lib/droits.ts';
import type { Droits } from '../lib/droits.ts';
import type { Destination } from '../lib/demarrage.ts';
import { urlReseau } from '../lib/demarrage.ts';
import { adresseSaisie, pourquoiPasAdresse } from '../lib/valider.ts';
import { verifierBloc } from '../lib/editionBloc.ts';
import { ICONES } from '../lib/icones.ts';
import { PageLiens } from '../components/PageLiens.tsx';
import type { Edition } from '../components/PageLiens.tsx';
import { Icone, NOMS_RESEAUX } from '../components/Icone.tsx';
import { themeDe, variablesTheme } from '../lib/themes.ts';
import { HautLiens } from './BienDemarrer.tsx';
import type { Demarrage } from './BienDemarrer.tsx';
import { FeuilleAjout, TYPES } from './OngletLiens.tsx';
import { DesignTiroirs, OngletApparence } from './OngletApparence.tsx';
import type { Tiroir } from './OngletApparence.tsx';
import { ActionEntete, BoutonPrincipal, BoutonSecondaire, Feuille, Interrupteur, Menu, choisirFichier, classeBouton, couleurReseau, flechesRadio, preparerImage, vibrer } from './ui.tsx';
import { offreDe, useDroits, usePermis } from './offre.tsx';
import type { Fonction } from '../lib/abonnement.ts';

/*
 * « Ma page ».
 *
 * Au bureau (direction A, 21 octobre 2026, choisie par Lilian), l'édition est
 * à gauche et la page à droite. À gauche, sous « Bien démarrer », deux onglets
 * collés en haut, Contenu et Design. Contenu : le profil (photo, nom et bio
 * tapés en place, réseaux), un champ où coller une adresse, puis la liste des
 * blocs, une rangée chacun. Une rangée se déplace par sa poignée (souris ou
 * clavier) ; un clic la déplie sur les réglages du bloc, qui s'enregistrent
 * tout seuls, une rangée ouverte à la fois. Un bloc neuf a sa rangée en haut
 * (en bas s'il vient du bas), et se voit déjà sur la page, à la place qu'il
 * prendra. Design : les tiroirs du design. À
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

export function MaPage({ compte, reglages, blocs, clics, visiteurs, grand, choisi, editeur, neuf, onReglages, onOrdonner, onOuvrir, onAjouter, liberer, fermerEdition, gestes, envoyerImage, annoncer, demarrage, demarrageOuvert, fermerDemarrage, demandeDesign, designOuvert, demandeAjout, ajoutOuvert, appel }: {
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
  /** Au bureau, un bloc neuf qu'on règle avant de l'ajouter, tel qu'il est saisi : une rangée de plus, en haut de la liste (en bas s'il vient du bas). */
  neuf: { bloc: Bloc; enBas: boolean } | null;
  onReglages: (r: Reglages) => void;
  onOrdonner: (blocs: Bloc[]) => void;
  onOuvrir: (bloc: Bloc) => void;
  /** `enBas` : ajouté depuis le bas de la page, le bloc se pose en dernier. */
  onAjouter: (bloc: Bloc, enBas?: boolean) => void;
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
  demandeAjout?: { enBas: boolean } | null;
  ajoutOuvert?: () => void;
  /** Au téléphone, sous la page : l'offre du dessus, en une ligne (voir `AppelOffre`). Au bureau, elle est dans la barre latérale. */
  appel?: ReactNode;
}) {
  // Le design ou les réseaux. Au bureau, le design est l'onglet de droite, les réseaux s'ouvrent dans le profil ; au téléphone, dans une feuille.
  const [cote, setCote] = useState<Cote | null>(null);
  // Le tiroir du design ouvert d'emblée (les couleurs, juste après les avoir prises), le temps d'une ouverture ;
  // la clé remonte le design s'il était déjà ouvert sur un autre tiroir.
  const [tiroirDepart, setTiroirDepart] = useState<Tiroir | undefined>();
  const [cleDesign, setCleDesign] = useState(0);
  const [ajout, setAjout] = useState(false);
  // Au bureau, la page à droite, à la largeur d'un téléphone ou sur un ordinateur.
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
  // Au bureau : la photo et la bio du profil (où mènent les étapes de « Bien démarrer »), et l'écran du téléphone.
  const photoBureau = useRef<HTMLButtonElement>(null);
  const bioBureau = useRef<HTMLTextAreaElement>(null);
  const ecran = useRef<HTMLDivElement>(null);
  const id = useId();
  const principal = compte.principal;
  const visibles = blocs.filter(b => principal || !TYPES_PRINCIPAL.includes(b.type));
  // La page se dessine comme les visiteurs la verront : sans Starter, aux couleurs de son thème. Les réglages, eux, gardent tout.
  const droits = useDroits();
  const montree = droits.couleurs ? reglages : { ...reglages, couleurs: SANS_COULEURS };

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
  // Revenu d'un bloc neuf par sa flèche : la liste se rouvre telle qu'on l'avait quittée, une fois.
  useEffect(() => {
    if (!demandeAjout) return;
    enBas.current = demandeAjout.enBas;
    setAjout(true);
    ajoutOuvert?.();
  }, [demandeAjout]); // eslint-disable-line react-hooks/exhaustive-deps
  const ajouter = (type: TypeBloc) => {
    setAjout(false);
    if (!quitterCote()) return;
    onAjouter(nouveauBloc(type, nouvelId()), enBas.current);
    enBas.current = false;
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
    const touche = (e: KeyboardEvent) => { if ((e.key === 'a' || e.key === 'A') && !e.metaKey && !e.ctrlKey && !e.altKey && libre(e)) { e.preventDefault(); raccourcis.current.ouvrirAjout(); } };
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
      bio?.focus({ preventScroll: true });
    }, 60);
  }

  const badge = principal && <Interrupteur label="Badge vérifié" actif={reglages.profil.badge} onChange={v => profil({ badge: v })} />;
  const design = <DesignTiroirs key={cleDesign} reglages={reglages} onChange={onReglages} envoyerImage={envoyerImage} principal={principal} vedettes={blocs.filter(b => b.vedette).length} pied={badge} initial={tiroirDepart} />;
  const reseaux = <OngletApparence reglages={reglages} onChange={onReglages} envoyerImage={envoyerImage} principal={principal} parties={['reseaux']} />;

  if (grand) {
    const enDesign = cote === 'design';
    const actifs = reglages.reseaux.filter(r => adresseSaisie(r.url));
    /** Contenu ou Design : quitter le design le referme (et dit ce qui a changé). Faux si quelque chose retient. */
    const choisirOnglet = (o: 'contenu' | 'design') => (o === 'design' ? ouvrirCote('design') : !enDesign || quitterCote());
    // Un bloc neuf se voit sur la page, à la place qu'il prendra, dès qu'il a de quoi s'y montrer ;
    // un lien tout de suite, avec le texte qu'il aura. Il n'y est pas encore : un clic sur lui ramène à sa rangée.
    const neufVu = neuf && (verifierBloc(neuf.bloc).bloc ?? (neuf.bloc.type === 'lien' ? { ...neuf.bloc, titre: neuf.bloc.titre.trim() || 'Texte du bouton', url: '#' } : null));
    return (
      <div className="adm-studio adm-studio-bureau">
        {/* Le geste principal est à droite de l'en-tête, comme celui de chaque onglet. */}
        <ActionEntete>
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
                      <button ref={photoBureau} type="button" className="adm-profil-photo" onClick={e => choisirFichier(fichier.current, e.currentTarget)}
                        aria-label={reglages.profil.avatar ? 'Changer la photo' : 'Ajouter une photo'} title={reglages.profil.avatar ? 'Changer la photo' : 'Ajouter une photo'}>
                        {reglages.profil.avatar ? <img src={reglages.profil.avatar} alt="" /> : <Icone nom="utilisateur" taille={22} />}
                        <span className="adm-profil-pastille" aria-hidden="true">{envoi ? '…' : <Icone nom="photo" taille={11} />}</span>
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
                      {actifs.map(r => <span key={r.reseau + r.url} className="adm-reseau" title={NOMS_RESEAUX[r.reseau]} style={{ color: couleurReseau(r.reseau) }}><Icone nom={r.reseau} taille={15} /></span>)}
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

                  <ChampColler ajouter={ajouterAdresse} />

                  <ListeBlocs blocs={visibles} clics={clics} choisi={choisi} editeur={editeur} neuf={neuf} gestes={{ ...gestes, dupliquer: b => { if (quitterCote()) gestes.dupliquer(b); } }}
                    onOrdonner={ordonner} onOuvrir={ouvrirBloc} fermer={fermerEdition} onAjouter={() => ouvrirAjout()} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* La page, collée à droite : elle suit chaque frappe ; un clic sur un bloc ouvre sa rangée. */}
        <aside className="adm-apercu-cote" aria-label="Aperçu de ta page">
          <div className="adm-apercu-colle">
            <div role="radiogroup" aria-label="Voir ma page" onKeyDown={e => flechesRadio(e)} className="adm-vues">
              {(['telephone', 'ordinateur'] as const).map(l => (
                <button key={l} type="button" role="radio" aria-checked={largeur === l} tabIndex={largeur === l ? 0 : -1} onClick={() => setLargeur(l)}
                  aria-label={l === 'telephone' ? 'Sur un téléphone' : 'Sur un ordinateur'} title={l === 'telephone' ? 'Sur un téléphone' : 'Sur un ordinateur'} className="adm-outil adm-outil-carre">
                  <Icone nom={l === 'telephone' ? 'mobile' : 'ordinateur'} taille={l === 'telephone' ? 15 : 16} />
                </button>
              ))}
            </div>
            {largeur === 'ordinateur' ? <div className="adm-ordi-boite"><ApercuBureau page={visiteurs} /></div> : (
              <Telephone ecran={ecran} choisi={choisi ?? neuf?.bloc.id ?? null}>
                <PageLiens page={{ reglages: montree, blocs: neufVu ? (neuf!.enBas ? [...visibles, neufVu] : [neufVu, ...visibles]) : visibles, compte }}
                  liste={(liste, rendu) => <BlocsApercu blocs={liste} rendu={rendu} choisi={choisi ?? neuf?.bloc.id ?? null} ouvrir={ouvrirDepuisApercu} />} />
              </Telephone>
            )}
          </div>
        </aside>

        <input ref={fichier} type="file" accept="image/*" className="adm-fichier" tabIndex={-1} aria-hidden="true" onChange={e => photo(e.target.files?.[0])} />
        <FeuilleAjout ouverte={ajout} onFermer={() => { enBas.current = false; setAjout(false); }} onChoisir={ajouter} principal={principal} />
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
    liste: (liste, rendu) => <BlocsEditables blocs={liste} rendu={rendu} choisi={choisi} onOrdonner={ordonner} onOuvrir={ouvrirBloc} onAjouter={() => ouvrirAjout(true)} />,
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
          <PageLiens page={{ reglages: montree, blocs: visibles, compte }} edition={edition} />
          {/* Le geste s'écrit sur la page même, dans sa couleur, en haut à gauche : pas une ligne de plus au-dessus d'elle. */}
          {astuce && <p className="pointer-events-none absolute top-4 left-4 right-16 text-[13px] font-medium leading-snug" style={{ color: variablesTheme(themeDe(montree))['--doux'] }}>{visibles.length < 2 ? 'Touche pour modifier.' : 'Touche pour modifier, maintiens pour déplacer.'}</p>}
        </div>
        {appel && <div className="adm-appel-sous">{appel}</div>}
      </div>

      <input ref={fichier} type="file" accept="image/*" className="adm-fichier" tabIndex={-1} aria-hidden="true" onChange={e => photo(e.target.files?.[0])} />
      <FeuilleAjout ouverte={ajout} onFermer={() => { enBas.current = false; setAjout(false); }} onChoisir={ajouter} principal={principal}
        onColler={url => { setAjout(false); ajouterAdresse(url, enBas.current); enBas.current = false; }} />
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

/**
 * Coller une adresse au-dessus de la liste : elle devient un lien neuf, qu'on
 * règle dans sa rangée avant de l'ajouter. Entrée fait de même avec une
 * adresse tapée ; une saisie qui n'en est pas une dit pourquoi.
 */
function ChampColler({ ajouter }: { ajouter: (url: string) => boolean }) {
  const [valeur, setValeur] = useState('');
  const [erreur, setErreur] = useState('');
  const idErreur = useId();
  const poser = (texte: string) => {
    const url = adresseSaisie(texte);
    if (!url) { setErreur(pourquoiPasAdresse(texte)); return; }
    if (ajouter(url)) { setValeur(''); setErreur(''); }
  };
  return (
    <div className="adm-coller">
      <div className="adm-coller-champ">
        <Icone nom="ui-plus" taille={15} className="adm-coller-signe" />
        <input type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={valeur}
          placeholder="Colle une adresse pour ajouter un lien" aria-label="Ajouter un lien depuis son adresse"
          aria-invalid={erreur ? true : undefined} aria-describedby={erreur ? idErreur : undefined}
          onChange={e => { setValeur(e.target.value); if (erreur) setErreur(''); }}
          onPaste={e => {
            if (valeur.trim()) return;
            const texte = e.clipboardData.getData('text');
            if (!adresseSaisie(texte)) return;
            e.preventDefault();
            poser(texte);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); if (valeur.trim()) poser(valeur); }
            else if (e.key === 'Escape' && valeur) { e.preventDefault(); setValeur(''); setErreur(''); }
          }} />
      </div>
      {erreur && <p id={idErreur} role="alert" className="adm-coller-erreur">{erreur}</p>}
    </div>
  );
}

/** Le nom d'un bloc dans sa rangée : son texte, sinon son adresse, sinon son genre. */
function nomBloc(b: Bloc) {
  const type = TYPES.find(t => t.type === b.type)?.nom ?? 'Bloc';
  const titre = b.titre.trim().split('\n')[0];
  return titre || ((b.type === 'lien' || b.type === 'video') && b.url ? sansSchema(b.url).replace(/\/$/, '') : '') || type;
}
/** Ce qui se lit en gris à côté du nom : l'adresse d'un lien ou d'une vidéo, sinon le genre du bloc. */
function sousBloc(b: Bloc, nom: string) {
  const sous = (b.type === 'lien' || b.type === 'video') && b.url ? sansSchema(b.url).replace(/\/$/, '') : TYPES.find(t => t.type === b.type)?.nom ?? '';
  return sous === nom ? '' : sous;
}

/** Ce qu'un bloc a de particulier, dit de la même façon dans la liste du bureau et sur la page du téléphone. */
function etatBloc(bloc: Bloc, droits: Droits) {
  // Un bloc que l'offre ne comprend plus reste là, grisé comme un bloc masqué : il revient avec l'offre.
  const attend = ([[!!bloc.acces, 'drops'], [bloc.type === 'inscription', 'listeEmail'], [bloc.type === 'preuve', 'avis']] as [boolean, Fonction][]).find(([oui, f]) => oui && !droits[f])?.[1];
  const prive = !bloc.public || !!attend;
  // Une règle que l'offre ne comprend plus n'est pas dite : sans Starter, un lancement attend sa date sans compte à rebours (« programmé »).
  const regles = etiquettes(bloc, droits);
  const programme = bloc.public && !estEnLigne(bloc) && !regles.includes('Compte à rebours');
  // Chaque règle porte le picto de sa ligne dans l'éditeur : on la reconnaît sans l'ouvrir.
  const puces = [
    { oui: !programme && !!((bloc.creneau && droits.heure) || (bloc.compteARebours && bloc.debut && droits.programmation)), icone: 'horloge', nom: 'Quand l’afficher' },
    { oui: !!(bloc.cache?.length || bloc.audience?.sources.length), icone: 'cible', nom: 'Afficher sur' },
    { oui: !!bloc.acces, icone: 'cadenas', nom: 'Accès réservé' },
  ].filter(p => p.oui);
  // Ce qu'un lecteur d'écran entend après le nom.
  const dit = [attend ? `pas montré sans Hopla ${offreDe(attend)}` : prive && 'masqué', programme && 'programmé', ...regles].filter(Boolean).join(', ');
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
  const rangees = neuf ? (neuf.enBas ? [...blocs, neuf.bloc] : [neuf.bloc, ...blocs]) : blocs;
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
  const type = TYPES.find(t => t.type === bloc.type);
  const etat = etatBloc(bloc, droits);
  const nom = neuf ? `Nouveau bloc : ${type?.nom ?? ''}` : nomBloc(bloc);
  const sous = neuf ? '' : sousBloc(bloc, nom);
  const idReglages = useId();
  // Le picto du bloc s'il en a un (un réseau, un picto choisi), sinon celui de son genre.
  const picto = bloc.icone && ICONES[bloc.icone] ? bloc.icone : type?.picto ?? 'bloc-lien';
  return (
    <li ref={setNodeRef} className="adm-rangee" data-id={bloc.id} data-nom={nom} data-ouvert={ouvert || undefined} data-glisse={isDragging || undefined}
      data-prive={(!neuf && (etat.prive || etat.programme)) || undefined} style={{ transform: CssDnd.Translate.toString(transform), transition }}>
      <div className="adm-rangee-tete">
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
                {etat.attend && <span title={`Pas montré sans Hopla ${offreDe(etat.attend)}`}><Icone nom="masque" taille={13} /></span>}
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
            <button type="button" className="adm-rangee-geste" onClick={() => { vibrer(5); gestes.basculer(bloc); }}
              aria-label={bloc.public ? `Masquer ${nom}` : `Montrer ${nom}`} title={bloc.public ? 'Masquer de ma page' : 'Montrer sur ma page'}>
              <Icone nom={bloc.public ? 'ui-oeil' : 'ui-masque'} taille={15} />
            </button>
            <Menu label={`Gestes : ${nom}`} titre={`Plus de gestes : ${nom}`} className="adm-rangee-geste" elements={[
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
 * La page à droite, au bureau, dans un téléphone : 390 px d'écran, réduit
 * d'un bloc pour tenir dans la hauteur ou la largeur qui reste. Le bloc
 * ouvert dans la liste vient en vue sur l'écran s'il n'y est pas.
 */
function Telephone({ ecran, choisi, children }: { ecran: RefObject<HTMLDivElement | null>; choisi: string | null; children: ReactNode }) {
  const lieu = useRef<HTMLDivElement>(null);
  const [echelle, setEchelle] = useState(0);
  useLayoutEffect(() => {
    const el = lieu.current;
    if (!el) return;
    const mesurer = () => setEchelle(Math.min(1, el.clientWidth / 408, el.clientHeight / 778));
    mesurer();
    const obs = new ResizeObserver(mesurer);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
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
      <div className="adm-tel-cadre" style={{ width: 408 * echelle, height: 778 * echelle, visibility: echelle ? undefined : 'hidden' }}>
        <div className="adm-tel" style={{ transform: `scale(${echelle})` }}>
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
  // Sans Starter, un compte à rebours gardé d'une offre passée ne se montre pas sur la page : l'aperçu le dessine pareil.
  const programmation = usePermis('programmation');
  return (
    <>
      {blocs.map((bloc, i) => {
        const e = etatBloc(bloc, droits);
        return (
          <BlocApercu key={bloc.id} bloc={bloc} i={i} choisi={choisi === bloc.id} prive={e.prive || e.programme} ouvrir={ouvrir}>
            {rendu(programmation || !bloc.compteARebours ? bloc : { ...bloc, compteARebours: false })}
          </BlocApercu>
        );
      })}
    </>
  );
}

function BlocApercu({ bloc, i, choisi, prive, ouvrir, children }: { bloc: Bloc; i: number; choisi: boolean; prive: boolean; ouvrir: (b: Bloc) => void; children: ReactNode }) {
  const noeud = useRef<HTMLDivElement>(null);
  useFige(noeud);
  return (
    <div ref={noeud} className="lp-bloc lp-ed-bloc" data-id={bloc.id} data-type={bloc.type} data-vedette={bloc.vedette ? bloc.format : undefined}
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
      <p className="adm-ordi-legende">Ta page sur un ordinateur, comme la voient tes visiteurs.</p>
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
function BlocsEditables({ blocs, rendu, choisi, onOrdonner, onOuvrir, onAjouter }: {
  blocs: Bloc[]; rendu: (bloc: Bloc) => ReactNode; choisi: string | null;
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
  // Sans Starter, un compte à rebours gardé d'une offre passée ne se montre pas sur la page : la toile le dessine pareil.
  // Seul le dessin change : l'éditeur reçoit le bloc tel qu'il est enregistré.
  const programmation = usePermis('programmation');
  const dessin = (bloc: Bloc) => rendu(programmation || !bloc.compteARebours ? bloc : { ...bloc, compteARebours: false });
  return (
    <>
      <DndContext accessibility={ACCESSIBILITE} sensors={capteurs} collisionDetection={closestCenter} onDragStart={() => vibrer(6)} onDragEnd={deplacer} onDragCancel={() => { glisse.current = Date.now(); }}>
        <SortableContext items={blocs.map(b => b.id)} strategy={verticalListSortingStrategy}>
          {blocs.map((bloc, i) => <BlocEditable key={bloc.id} bloc={bloc} i={i} choisi={choisi === bloc.id} ouvrir={ouvrir}>{dessin(bloc)}</BlocEditable>)}
        </SortableContext>
      </DndContext>
      {/* Sous le dernier bloc, à portée du pouce : le même geste que le bouton Ajouter du haut. */}
      <button type="button" onClick={onAjouter} className="lp-ed-zone lp-ed-ajout"><Icone nom="ui-plus" taille={18} /> Ajouter à ma page</button>
    </>
  );
}

function BlocEditable({ bloc, i, choisi, ouvrir, children }: { bloc: Bloc; i: number; choisi: boolean; ouvrir: (b: Bloc) => void; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bloc.id });
  const droits = useDroits();
  const { attend, prive, programme, puces, dit } = etatBloc(bloc, droits);
  const nom = bloc.titre || bloc.url || 'ce bloc';
  // Le bloc entier est un seul bouton : ses liens et champs intérieurs sortent de l'ordre de tabulation.
  const noeud = useRef<HTMLDivElement | null>(null);
  useFige(noeud);
  return (
    <div ref={n => { setNodeRef(n); noeud.current = n; }} {...attributes} {...listeners} aria-label={[`Modifier ${nom}`, dit].filter(Boolean).join(', ')} aria-roledescription="bloc déplaçable"
      aria-current={choisi || undefined}
      className="lp-bloc lp-ed-bloc" data-id={bloc.id} data-type={bloc.type} data-vedette={bloc.vedette ? bloc.format : undefined} data-glisse={isDragging || undefined} data-prive={prive || programme || undefined}
      data-choisi={choisi || undefined}
      style={{ '--i': i, transform: CssDnd.Transform.toString(transform), transition } as CSSProperties}
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
  );
}
