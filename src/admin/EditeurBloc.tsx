import { useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, MutableRefObject } from 'react';
import type { Api, Bloc, MentionPartenaire, Partenariat, Reglages } from '../lib/types.ts';
import { ANIMATIONS_BLOC, MONTANTS_DEFAUT, SANS_COULEURS, TYPES_ADRESSE, TYPES_VITRINE, estEnLigne, nouveauBloc } from '../lib/types.ts';
import { RESEAUX } from '../lib/types.ts';
import { adresse, adresseSaisie, montants as lireMontants, pourquoiPasAdresse } from '../lib/valider.ts';
import { avecMontants, nomAgenda, nomSoutien, seIntegre, soutienDe } from '../lib/vitrine.ts';
import { nomSite, reseauDeUrl } from '../lib/demarrage.ts';
import { memeBloc, verifierBloc } from '../lib/editionBloc.ts';
import type { ChampErreur, Erreurs } from '../lib/editionBloc.ts';
import { themeDe, variablesTheme } from '../lib/themes.ts';
import { ICONES } from '../lib/icones.ts';
import { Icone, NOMS_RESEAUX, PICTOS } from '../components/Icone.tsx';
import { BlocPublic } from '../components/PageLiens.tsx';
import { BoutonPrincipal, BoutonSecondaire, Champ, Feuille, Interrupteur, ListeChoix, NOMS_ANIMATIONS, Segments, choisirFichier, classeBouton, classeSaisie, flechesRadio, preparerImage, useFilFeuille, vibrer } from './ui.tsx';
import type { FilFeuille } from './ui.tsx';
import { typeDe } from './OngletLiens.tsx';
import { appDe } from '../lib/ouvrirApp.ts';
import { ChampsPreuve, PagesBloc, RangeesCompactes, RegleAOuvrir, RegleAcces, RegleMoment, RegleReseaux, Repli } from './ReglesBloc.tsx';
import type { PageRegle } from './ReglesBloc.tsx';
import { useCouche } from './couches.ts';
import { reseauxDePartage } from '../lib/provenance.ts';
import { etiquettes } from '../lib/etiquettes.ts';
import { Etiquette, FournisseurOffre, Reserve, offreDe, useDroits, useVoirOffres } from './offre.tsx';
import type { Fonction } from '../lib/abonnement.ts';
import { focusAuto } from '../lib/clavier';

/** Au téléphone, la page ouverte dans la feuille d'un bloc : l'essentiel (`null`), « Plus de réglages », ou une règle. */
type PageBloc = 'plus' | PageRegle | null;
const hoteDe = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
const NOMS_PAGES: Record<'plus' | PageRegle, string> = { plus: 'Plus de réglages', moment: 'Quand l’afficher', reseaux: 'Afficher sur', acces: 'Accès réservé', animation: 'Animation' };
const niveau = (p: PageBloc) => (p === null ? 0 : p === 'plus' ? 1 : 2);

/** Pose le fil de la feuille depuis son contenu : le nom de la page ouverte et sa flèche de retour. */
function FilPage({ fil }: { fil: FilFeuille | null }) {
  useFilFeuille(fil);
  return null;
}

/** Les deux mentions qu'un lien partenaire peut porter (loi du 9 juin 2023). */
const MENTIONS: { id: MentionPartenaire; nom: string }[] = [{ id: 'publicite', nom: 'Publicité' }, { id: 'collaboration', nom: 'Collaboration commerciale' }];
const PARTENARIAT_NEUF: Partenariat = { mention: 'publicite', code: '' };

/**
 * Les montants de « Me soutenir » chez PayPal : quatre cases, en euros entiers ; une case vide n'est pas proposée.
 * Les cases se remettent dans l'ordre en les quittant, jamais pendant la frappe.
 */
function ChampMontants({ montants, onChange, compact = false }: { montants: number[]; onChange: (m: number[]) => void; compact?: boolean }) {
  const remplir = (l: number[]) => [0, 1, 2, 3].map(i => (l[i] ? String(l[i]) : ''));
  const [cases, setCases] = useState(() => remplir(montants));
  // Revenus d'ailleurs (« Annuler mes changements ») : les cases reprennent les montants du bloc.
  useEffect(() => {
    if (JSON.stringify(lireMontants(cases.map(Number))) !== JSON.stringify(montants)) setCases(remplir(montants));
  }, [montants]); // eslint-disable-line react-hooks/exhaustive-deps
  function changer(i: number, v: string) {
    const l = cases.map((c, j) => (j === i ? v.replace(/\D/g, '').slice(0, 4) : c));
    setCases(l);
    onChange(lireMontants(l.map(Number)));
  }
  return (
    <div role="group" aria-label="Montants proposés, en euros" className="grid grid-cols-4 gap-2 bureau:gap-1.5"
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setCases(remplir(montants)); }}>
      {cases.map((c, i) => (
        <input key={i} className={`${classeSaisie} ${compact ? 'adm-field-ligne' : ''} text-center tabular-nums`} inputMode="numeric" enterKeyHint="done" value={c}
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
export function EditeurBloc({ bloc, reglages, nouveau, bureau = false, garde, onBrouillon, onFermer, onRetour, onEnregistrer, onSupprimer, onDupliquer, onDeplacer, place, envoyerImage, apercuSite, clics, prises = 0, principal = false }: {
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
  /** Un bloc neuf, au téléphone : la flèche de l'en-tête (et le retour du téléphone) ramène au choix du bloc, sans rien ajouter. */
  onRetour?: () => void;
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
  const [b, setB] = useState<Bloc>(bloc);
  // Une erreur dit sur quel champ elle porte : elle s'affiche dessous, et part dès qu'on y touche.
  // Plusieurs champs peuvent manquer à la fois (une note, son nombre d'avis, sa source) : chacun dit le sien.
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const setErreur = (texte: string, champ: ChampErreur = 'url') => setErreurs(texte ? { [champ]: texte } : {});
  const erreurDe = (champ: string) => erreurs[champ as ChampErreur];
  const erreur = Object.keys(erreurs).length > 0;
  const [envoi, setEnvoi] = useState(false);
  const [lecture, setLecture] = useState(false);
  const droits = useDroits();
  const voir = useVoirOffres();
  const [icones, setIcones] = useState(false);
  // L'essentiel d'abord, neuf ou pas ; le reste attend derrière « Plus de réglages ».
  // Ouvert pour y régler une règle tout juste débloquée (au retour des offres), il arrive déplié (au téléphone, sur la page de la règle).
  const regleAOuvrir = useContext(RegleAOuvrir);
  const aRegler = regleAOuvrir !== null;
  const [plus, setPlus] = useState(aRegler);
  const [page, setPage] = useState<PageBloc>(bureau ? null : regleAOuvrir);
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
  useCouche(!bureau && niveau(page) === 2, () => { allerA('plus'); return true; });

  /*
   * Au téléphone, la feuille d'un bloc posé s'arrête juste sous lui (22 octobre 2026) : le bloc remonte sous l'en-tête,
   * et la feuille prend toute la place qui reste, entre la moitié et 86 % de l'écran. Un bloc neuf, pas encore sur la
   * page, a une feuille presque pleine. Le bloc reste en vue quand la feuille grandit ou qu'il change de taille.
   */
  const [plafond, setPlafond] = useState<number>();
  useLayoutEffect(() => {
    if (bureau) return;
    const blocPage = () => (nouveau ? null : document.querySelector<HTMLElement>(`.adm-toile [data-id="${CSS.escape(bloc.id)}"]`));
    const feuille = () => document.querySelector<HTMLElement>('.adm-feuille-bloc');
    const sousEntete = () => (document.querySelector('.adm-topbar')?.getBoundingClientRect().bottom ?? 72) + 12;
    const clavier = () => !!window.visualViewport && innerHeight - window.visualViewport.height > 120;
    const mesurer = () => {
      const el = blocPage();
      const h = innerHeight;
      setPlafond(Math.round(el ? Math.min(h * 0.86, Math.max(h * 0.5, h - sousEntete() - el.offsetHeight - 14)) : h * 0.92));
    };
    const ajuster = () => {
      const el = blocPage(), f = feuille();
      if (!el || !f || clavier()) return;
      const r = el.getBoundingClientRect();
      const haut = sousEntete(), bas = innerHeight - f.offsetHeight - 12;
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
  }, [bureau, nouveau, bloc.id]);
  const idPlus = useId();
  const racine = useRef<HTMLDivElement>(null);
  const fichier = useRef<HTMLInputElement>(null);
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

  // Clavier ouvert, l'aperçu collant se replie : la place va au champ et à son erreur.
  const [clavier, setClavier] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const lire = () => setClavier(vv.height < window.innerHeight * 0.75 || vv.height < 560);
    lire(); vv.addEventListener('resize', lire);
    return () => vv.removeEventListener('resize', lire);
  }, []);

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
      if (bureau) setPlus(true); else allerA('moment');
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

  // L'aperçu montre le bouton comme la page le montrera : sans Starter, aux couleurs du thème.
  const vue = droits.couleurs ? reglages : { ...reglages, couleurs: SANS_COULEURS };
  const theme = themeDe(vue);
  // Une preuve ne s'aperçoit qu'une fois commencée : pas de « 0,0 sur 5 » avant d'avoir rien tapé.
  const preuveRemplie = !!b.preuve && (b.preuve.genre === 'note' ? b.preuve.note > 0 && b.preuve.note <= 5 : b.preuve.genre === 'compteur' ? b.preuve.nombre > 0 : !!b.description.trim());
  // Ce qui est réglé derrière « Plus de réglages », nommé à droite de la ligne : on sait quoi sans ouvrir.
  // Au bureau, « Mis en avant » se règle dehors, à côté de « Visible sur ma page » : la ligne ne le répète pas.
  // La photo d'un produit est dans l'essentiel, sous les yeux ; des montants de soutien se disent s'ils ne sont plus ceux de départ.
  const montantsAMoi = b.type === 'soutien' && avecMontants(adresseValide) && b.montants.join() !== MONTANTS_DEFAUT.join();
  const reglages_ = ([[b.vedette && !bureau, 'Mis en avant'], [!!b.sousTitre, 'Sous-titre'], [montantsAMoi, 'Montants'], [!!b.icone, 'Icône'], [!!b.image && b.type !== 'produit', 'Image'], [b.vedette && b.animation !== 'auto', 'Animation'],
    [!!b.acces, 'Accès réservé'], [!!(b.debut || b.fin || b.creneau), 'Quand l’afficher'], [!!(b.cache.length || b.audience), 'Afficher sur']] as [boolean, string][])
    .filter(([oui]) => oui).map(([, nom]) => nom);
  const reglees = reglages_.length > 2 ? `${reglages_.slice(0, 2).join(', ')} et ${reglages_.length - 2} de plus` : reglages_.join(', ');
  // Rien de réglé : la ligne dit ce qu'elle cache.
  const cache = b.type === 'lien' ? 'Sous-titre, icône, règles'
    : b.type === 'reservation' ? 'Sous-titre, icône, règles'
    : b.type === 'soutien' ? (avecMontants(adresseValide) ? 'Sous-titre, montants, règles' : 'Sous-titre, règles')
    : b.type === 'produit' ? (bureau ? 'Lien partenaire, règles' : 'Mise en avant, règles')
    : (b.type === 'video' || b.type === 'derniere-video') && !bureau ? 'Mise en avant, règles' : b.type === 'newsletter' ? 'Sous-titre, règles' : b.type === 'inscription' ? 'Sous-titre, prénom, règles' : 'Règles';
  const nomAuto = `Comme ma page (${NOMS_ANIMATIONS[reglages.animation].nom})`;
  const nomIcone = b.icone ? NOMS_RESEAUX[b.icone] ?? PICTOS.find(p => p.nom === b.icone)?.libelle ?? '' : 'Aucune';

  async function choisirImage(f: File | undefined) {
    if (!f) return;
    setEnvoi(true); setErreur('');
    // Une photo de produit sert en tuile comme en grande carte : carrée, et assez grande pour les deux.
    const format = b.type === 'produit' ? 'photo' : b.vedette && b.format === 'carte' ? 'large' : 'carre';
    try { maj({ image: await envoyerImage(await preparerImage(f, format)) }); }
    catch { setErreur('L’image n’est pas passée. Essaie une autre photo.', 'image'); }
    finally { setEnvoi(false); if (fichier.current) fichier.current.value = ''; }
  }

  /** Lit le site du lien : son image de partage (ou une capture), sa description et son titre. */
  async function recupererApercu() {
    const url = adresseSaisie(b.url);
    if (!url) { setErreur('Indique d’abord l’adresse du lien.'); return; }
    setLecture(true); setErreur('');
    try {
      const site = await apercuSite(url);
      let image = '';
      if (site.image) image = await envoyerImage(await preparerImage(await (await fetch(site.image)).blob(), 'large'));
      setB(avant => ({
        ...avant,
        image: image || avant.image,
        description: avant.description || site.description,
        titre: avant.titre || site.titre,
      }));
      vibrer(10);
      if (!image && !site.description) setErreur('Ce site ne donne ni image ni description. Ajoute-les à la main.', 'image');
    } catch { setErreur('Impossible de lire ce site pour l’instant. Ajoute l’image et la description à la main.', 'image'); }
    finally { setLecture(false); }
  }

  /**
   * Une adresse quittée, collée, ou arrivée toute faite. Elle se vérifie en quittant le champ, comme aux premiers pas.
   * Un lien sans texte prend le nom du site, puis son vrai titre : seul le titre est demandé au serveur, il ne
   * télécharge ni image ni capture pour si peu ; un profil de réseau prend son icône. Un produit lit sa boutique.
   */
  /** L'adresse dont viennent le texte, l'image et la description, et ce que Hopla y a lu. */
  const luLien = useRef({ url: adresseSaisie(bloc.url), titre: '', image: '', description: '' });
  /** L'adresse a été effacée : celle qu'on retape remplace tout ce qui venait de l'ancienne. */
  const efface = useRef(false);
  async function lireAdresse(saisie = b.url) {
    if (b.type === 'video' || !TYPES_ADRESSE.includes(b.type)) return;
    const url = adresseSaisie(saisie);
    if (saisie.trim() && !url) { setErreur(pourquoiPasAdresse(saisie)); return; }
    if (!url) return;
    if (b.type === 'produit') return lireBoutique(url);
    if (b.type !== 'lien') return;
    const reseau = !b.icone ? reseauDeUrl(url) : null;
    if (reseau) setB(avant => (avant.icone ? avant : { ...avant, icone: reseau }));
    // Une autre adresse relit le site d'elle-même (Lilian, 22 octobre 2026) : le texte, l'image et la description qui venaient
    // de l'ancienne (vides, lus par Hopla, ou l'adresse effacée puis retapée) prennent ceux de la nouvelle ; ce qu'on a écrit reste.
    const ancien = luLien.current;
    if (url === ancien.url && b.titre.trim()) return;
    const effacee = efface.current;
    efface.current = false;
    const autreSite = !!ancien.url && hoteDe(url) !== hoteDe(ancien.url);
    const titreAuto = !b.titre.trim() || effacee || b.titre === ancien.titre || (!!ancien.url && b.titre === nomSite(ancien.url));
    const imageAuto = !!b.image && (effacee || autreSite || b.image === ancien.image);
    const descriptionAuto = !!b.description && (effacee || autreSite || b.description === ancien.description);
    luLien.current = { url, titre: '', image: '', description: '' };
    if (!titreAuto && !imageAuto && !descriptionAuto) return;
    const repli = nomSite(url);
    const titreDepart = b.titre;
    const pareil = (avant: Bloc) => adresseSaisie(avant.url) === url;
    if (titreAuto && repli) {
      luLien.current.titre = repli;
      setB(avant => (pareil(avant) && avant.titre === titreDepart ? { ...avant, titre: repli } : avant));
    }
    const imageDepart = b.image, descriptionDepart = b.description;
    if (imageAuto || descriptionAuto) setLecture(true);
    try {
      const site = await apercuSite(url, imageAuto ? 'partage' : false);
      const image = imageAuto && site.image ? await envoyerImage(await preparerImage(await (await fetch(site.image)).blob(), 'large')) : '';
      const titre = site.titre.slice(0, 80);
      luLien.current = { url, titre: titreAuto ? titre || repli : '', image, description: descriptionAuto ? site.description : '' };
      setB(avant => (!pareil(avant) ? avant : {
        ...avant,
        titre: titreAuto && titre && (avant.titre === repli || avant.titre === titreDepart) ? titre : avant.titre,
        image: imageAuto && avant.image === imageDepart ? image : avant.image,
        description: descriptionAuto && avant.description === descriptionDepart ? site.description : avant.description,
      }));
    } catch { /* le nom du site suffit */ }
    finally { setLecture(false); }
  }
  // L'adresse tapée se relit d'elle-même dès qu'on cesse de taper : « Terminé » trouve le texte et l'image déjà là.
  useEffect(() => {
    if (b.type !== 'lien' && b.type !== 'produit') return;
    const url = adresseSaisie(b.url);
    if (!url || url === luLien.current.url) return;
    const t = setTimeout(() => void lireAdresse(b.url), 900);
    return () => clearTimeout(t);
  }, [b.url]); // eslint-disable-line react-hooks/exhaustive-deps
  // Un lien neuf qui arrive avec son adresse (collée sur la page ou dans Ajouter) cherche son texte tout de suite.
  useEffect(() => { if (nouveau && bloc.url && !bloc.titre.trim()) void lireAdresse(bloc.url); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Ce que la dernière lecture de la boutique a écrit : une autre adresse le remplace, jamais ce qu'on a tapé. */
  const lu = useRef<{ url: string; titre: string; prix: string; image: string } | null>(null);
  /** La mention et le code d'un lien qui cesse d'être partenaire : rallumé, il les retrouve. */
  const partenariatGarde = useRef<Partenariat | null>(bloc.partenariat);
  /**
   * Un produit lit sa boutique dès qu'on colle son adresse : son nom, son prix et sa photo de partage, jamais une
   * capture de la page. `encore` : le bouton « Depuis la boutique », qui relit la même adresse.
   */
  async function lireBoutique(url: string, encore = false) {
    const ecrit = lu.current;
    const libre = (k: 'titre' | 'prix' | 'image', v: string) => !v.trim() || v === ecrit?.[k];
    if (!encore && (ecrit?.url === url || !(libre('titre', b.titre) || libre('prix', b.prix) || libre('image', b.image)))) return;
    lu.current = { url, titre: '', prix: '', image: '' };
    setLecture(true); setErreur('');
    try {
      const site = await apercuSite(url, 'partage');
      const image = site.image && libre('image', b.image) ? await envoyerImage(await preparerImage(await (await fetch(site.image)).blob(), 'photo')) : '';
      const neuf = { url, titre: site.titre.slice(0, 80), prix: site.prix, image };
      setB(avant => (adresseSaisie(avant.url) !== url ? avant : {
        ...avant,
        titre: libre('titre', avant.titre) ? neuf.titre : avant.titre,
        prix: libre('prix', avant.prix) ? neuf.prix : avant.prix,
        image: libre('image', avant.image) ? neuf.image : avant.image,
      }));
      lu.current = neuf;
      if (neuf.titre || neuf.prix || neuf.image) vibrer(10);
      else setErreur('Cette boutique ne donne ni nom ni prix. Ajoute-les à la main.', 'image');
    } catch {
      lu.current = ecrit;
      setErreur('Impossible de lire cette boutique pour l’instant. Ajoute le nom, le prix et la photo à la main.', 'image');
    } finally { setLecture(false); }
  }

  /**
   * Fermer d'un glissé, d'Échap, de la croix ou d'un toucher à côté garde ce qui a changé, comme partout
   * ailleurs, y compris un bloc neuf : une adresse collée ne se perd pas d'un geste.
   */
  function fermerEnGardant() {
    if (commence()) {
      const v = valider();
      if (!v) { vibrer(20); return; }
      if (!memeBloc(v, enregistre.current)) { brut.current = b; return onEnregistrer(v, bureau ? { discret: true } : undefined); }
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
    if (commence()) { brut.current = b; if (!memeBloc(v, enregistre.current)) { enregistre.current = v; onEnregistrer(v, { garder: true, discret: true }); } }
    onDupliquer(v);
  }
  // Retirer reprend la version enregistrée : « Annuler » dans le message remet celle-là, jamais un champ à moitié tapé.
  const retirer = () => onSupprimer(enregistre.current ?? bloc);
  /** Au bureau, « Ajouter à ma page » pose le bloc et garde sa rangée dépliée : on continue de le régler. */
  function ajouter() {
    const v = valider();
    if (!v) return;
    vibrer(12);
    setB(v); brut.current = v; enregistre.current = v; depart.current = v;
    onEnregistrer(v, { garder: true });
  }

  const titre = nouveau ? `Ajouter : ${type.nom}` : [type.nom, !b.public && 'masqué', b.public && !estEnLigne(b) && 'programmé'].filter(Boolean).join(' · ');
  const ligne = 'flex min-h-11 items-center gap-2 bureau:min-h-9';

  // Un bloc neuf n'est pas encore sur la page : au téléphone, son aperçu reste collé en haut de la feuille, chaque réglage se voit sans remonter.
  // Au bureau, il se voit sur la page, à droite, à la place qu'il prendra (voir MaPage).
  // Un bloc de la vitrine s'aperçoit dès son adresse : avant, il n'a rien à montrer.
  const apercu = nouveau && !bureau && (b.type === 'lien' || (TYPES_VITRINE.includes(b.type) && !!adresseValide) || (b.type === 'preuve' && preuveRemplie)) && !clavier && (
    <div className="sticky top-0 z-10 -mx-5 bg-nuit px-5 pb-3 pt-1 shadow-[0_14px_14px_-12px_#ffffff]">
      <div className="lp lp-mini -mx-1 rounded-[20px] p-4 ring-1 ring-white/[0.06]" style={variablesTheme(theme) as CSSProperties}
        data-bouton={reglages.bouton.style} data-forme={reglages.bouton.forme} data-ombre={reglages.bouton.ombre} data-police={theme.police} data-decor={theme.decor} aria-label="Aperçu du bouton">
        <div className="pointer-events-none" inert>
          {/* Sans Starter, un compte à rebours gardé se tait sur la page : l'aperçu montre le bouton tel qu'il s'ouvrira. */}
          <BlocPublic key={`${b.format}-${b.teinte}-${b.animation}-${b.vedette}`} bloc={{ ...b, url: b.type === 'preuve' ? b.url : adresseValide || b.url || '#', titre: b.titre || (b.type === 'lien' ? 'Texte du bouton' : b.type === 'produit' ? 'Nom du produit' : b.type === 'soutien' || b.type === 'reservation' ? nouveauBloc(b.type, b.id).titre : ''), public: true, restantes: b.acces?.places ? Math.max(0, b.acces.places - prises) : null, compteARebours: b.compteARebours && droits.programmation }} reglages={vue} clic={() => {}} cible={{}} apercu />
        </div>
      </div>
    </div>
  );

  const grilleIcones = icones && (
    <div role="radiogroup" onKeyDown={e => flechesRadio(e, false)} aria-label="Icône" className="adm-groupe mt-1.5 grid max-h-[208px] grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1.5 overflow-y-auto p-2 [scrollbar-width:thin] bureau:grid-cols-[repeat(auto-fill,minmax(36px,1fr))]">
      {[{ nom: '', libelle: 'Sans icône' }, ...RESEAUX.map(r => ({ nom: r as string, libelle: NOMS_RESEAUX[r] })), ...PICTOS].map(p => {
        const choisi = b.icone === p.nom;
        return (
          // L'icône seule, sans fond derrière elle : la prise passe au bleu, un point dessous.
          <button key={p.nom || 'sans'} type="button" role="radio" aria-checked={choisi} aria-label={p.libelle} title={p.libelle} onClick={() => { vibrer(4); maj({ icone: p.nom }); setIcones(false); }}
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
    <Repli id="animation" key={`animation-${b.id}`} titre="Animation" icone="eclair" resume={b.animation === 'auto' ? 'Comme ma page' : NOMS_ANIMATIONS[b.animation].nom} ouvert={false}>
      {/* Une liste, pas une rangée de pastilles : le bloc sur la page (ou l'aperçu en haut) joue l'animation choisie. */}
      <ListeChoix label="Animation" valeur={b.animation} onChange={a => maj({ animation: a })}
        options={ANIMATIONS_BLOC.map(a => a === 'auto'
          ? { id: a, nom: nomAuto }
          : { id: a, nom: NOMS_ANIMATIONS[a].nom })} />
    </Repli>
  );
  const enAvant = !['titre', 'texte', 'newsletter', 'inscription', 'preuve', 'soutien'].includes(b.type);
  const aideVedette = b.type === 'produit' ? 'Une grande carte, de la couleur d’accent de ta page.' : b.type === 'reservation' ? 'De la couleur d’accent de ta page.' : 'En plus grand, de la couleur d’accent de ta page.';
  const vedette = (compact: boolean) => enAvant && <Interrupteur key="vedette" compact={compact} label="Mis en avant" aide={aideVedette} actif={b.vedette} onChange={v => maj({ vedette: v })} />;
  const bascules = (compact: boolean, sansVedette = false) => [
    b.type === 'inscription' && <Interrupteur key="prenom" compact={compact} label="Demander le prénom" actif={b.demanderPrenom} onChange={v => maj({ demanderPrenom: v })} />,
    !sansVedette && vedette(compact),
    // Un lien qui devient partenaire prend sa mention ; éteint puis rallumé, il retrouve celle d'avant, et son code.
    (b.type === 'lien' || b.type === 'produit') && (
      <Interrupteur key="partenaire" compact={compact} label="Lien partenaire" aide="Affiliation ou collaboration payée : la mention « Publicité » s’affiche." actif={!!b.partenariat}
        onChange={v => { if (!v) partenariatGarde.current = b.partenariat; maj({ partenariat: v ? partenariatGarde.current ?? PARTENARIAT_NEUF : null }); }} />
    ),
    b.type === 'lien' && principal && <Interrupteur key="google" compact={compact} label="Visible par Google" actif={b.indexable} onChange={v => maj({ indexable: v })} />,
  ].filter(Boolean);
  const regles = (
    <>
      {/* Quand, où, pour qui : l'ordre des maquettes du 20 octobre. */}
      <RegleMoment key={`moment-${b.id}`} b={b} maj={maj} erreur={erreurDe('dates')} />
      <RegleReseaux key={`reseaux-${b.id}`} b={b} maj={maj} reseaux={reseauxDePartage(reglages.vuesReseaux)} />
      {b.type === 'lien' && <RegleAcces key={`acces-${b.id}`} b={b} maj={maj} prises={prises} />}
    </>
  );
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
  const aideUrl = app ? ok(`Ce lien s’ouvre directement dans l’app ${app}, même depuis ${['Instagram', 'TikTok'].filter(n => n !== app).join(' ou ')}.`)
    // Avant l'adresse, rien : l'aide du bloc neuf dit déjà quels sites conviennent.
    : !adresseValide ? undefined
    : b.type === 'reservation' ? (seIntegre(adresseValide) ? ok('La réservation s’ouvre dans ta page, sans la quitter.') : `${nomAgenda(adresseValide)} s’ouvre sur son site.`)
    : b.type === 'soutien' ? (avecMontants(adresseValide) ? 'Tes visiteurs choisissent un montant, puis paient sur PayPal.' : soutienDe(adresseValide) ? `Tes visiteurs choisissent le montant sur ${nomSoutien(adresseValide)}.` : undefined)
    : undefined;
  const champUrl = avecUrl && (
    <Champ label={b.type === 'video' ? 'Adresse de la vidéo YouTube' : b.type === 'produit' ? 'Adresse du produit' : b.type === 'reservation' ? 'Adresse de ton agenda' : 'Adresse'} erreur={erreurDe('url')} aide={aideUrl}>
      <input className={classeSaisie} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off"
        placeholder={b.type === 'video' ? 'https://youtu.be/…' : b.type === 'soutien' ? 'https://paypal.me/…' : b.type === 'reservation' ? 'https://calendly.com/…' : 'https://…'}
        value={b.url} onChange={e => { if (!e.target.value.trim()) efface.current = true; maj({ url: e.target.value }); }} onBlur={() => lireAdresse()} autoFocus={focusAuto(nouveau && !bloc.url)}
        onPaste={e => { const texte = e.clipboardData.getData('text'); if (!b.url.trim() && adresseSaisie(texte)) setTimeout(() => lireAdresse(texte)); }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('bloc-titre')?.focus(); } }} />
    </Champ>
  );
  const champTitre = b.type !== 'derniere-video' && b.type !== 'preuve' && (
    <Champ erreur={erreurDe('titre')} label={b.type === 'lien' || b.type === 'reservation' ? 'Texte du bouton' : b.type === 'produit' ? 'Nom du produit' : b.type === 'texte' ? 'Texte' : 'Titre'}>
      {b.type === 'texte'
        ? <textarea className={`${classeSaisie} min-h-28`} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={1000} autoFocus={focusAuto(nouveau)} />
        : <input id="bloc-titre" className={classeSaisie} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={160} autoFocus={focusAuto(nouveau && !avecUrl)}
            placeholder={b.type === 'lien' ? 'Mon super lien' : b.type === 'produit' ? (lecture ? 'Lecture de la boutique…' : '') : b.type === 'soutien' || b.type === 'reservation' ? nouveauBloc(b.type, b.id).titre : ''} />}
    </Champ>
  );
  // Un produit : son prix et sa photo, lus sur la boutique, sous les yeux ; ils se corrigent à la main.
  const champPrix = b.type === 'produit' && (
    <Champ label="Prix (facultatif)">
      <input className={classeSaisie} value={b.prix} onChange={e => maj({ prix: e.target.value })} maxLength={24} placeholder={lecture ? 'Lecture de la boutique…' : '24 €'} />
    </Champ>
  );
  const photoProduit = b.type === 'produit' && (
    <div>
      <span className="mb-1.5 block text-[12.5px] font-medium text-white/60 bureau:text-white/75">Photo</span>
      <div className="flex min-h-12 items-center gap-3 bureau:min-h-11 bureau:gap-2">
        {b.image && <img src={b.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover bureau:h-11 bureau:w-11" />}
        <div className="flex flex-wrap items-center gap-2 bureau:gap-1.5">
          {!b.image && !!adresseValide && (
            <button type="button" onClick={() => lireBoutique(adresseValide, true)} disabled={lecture || envoi} className={classeBouton.secondaire}>{lecture ? 'Lecture de la boutique…' : 'Depuis la boutique'}</button>
          )}
          <button type="button" onClick={e => choisirFichier(fichier.current, e.currentTarget)} disabled={envoi} className={classeBouton.secondaire}>{envoi ? 'Envoi…' : b.image ? 'Changer' : 'Ajouter une photo'}</button>
          {b.image && <button type="button" onClick={() => maj({ image: '' })} className={classeBouton.discret}>Retirer</button>}
        </div>
        {champFichier}
      </div>
      {erreurImage && <div className="mt-1.5">{erreurImage}</div>}
    </div>
  );
  // L'image d'un lien, sous les yeux comme la photo d'un produit (Lilian, 22 octobre 2026) : plus besoin d'aller la chercher dans « Plus de réglages ».
  const imageLien = b.type === 'lien' && (
    <div>
      <span className="mb-1.5 block text-[12.5px] font-medium text-white/60 bureau:text-white/75">Image (facultatif)</span>
      <div className="flex min-h-12 items-center gap-3 bureau:min-h-11 bureau:gap-2">
        {b.image && <img src={b.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover bureau:h-11 bureau:w-11" />}
        <div className="flex flex-wrap items-center gap-2 bureau:gap-1.5">
          {!!adresseValide && (
            <button type="button" onClick={recupererApercu} disabled={lecture || envoi} className={classeBouton.secondaire}>{lecture ? 'Lecture du site…' : b.image ? 'Reprendre celle du site' : 'Depuis le site'}</button>
          )}
          <button type="button" onClick={e => choisirFichier(fichier.current, e.currentTarget)} disabled={envoi} className={classeBouton.secondaire}>{envoi ? 'Envoi…' : b.image ? 'Changer' : 'Ajouter'}</button>
          {b.image && <button type="button" onClick={() => maj({ image: '' })} className={classeBouton.discret}>Retirer</button>}
        </div>
        {champFichier}
      </div>
      {erreurImage && <div className="mt-1.5">{erreurImage}</div>}
    </div>
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
  // Ce qui se règle derrière « Plus de réglages » selon le bloc : l'icône et l'image d'un lien ou d'une réservation,
  // les montants de « Me soutenir » chez PayPal, le sous-titre qu'une réservation montre déjà sans rien taper.
  const avecVisuel = b.type === 'lien' || b.type === 'reservation';
  const montants = b.type === 'soutien' && avecMontants(adresseValide) && ((compact: boolean) => <ChampMontants compact={compact} montants={b.montants} onChange={m => maj({ montants: m })} />);
  const placeholderSousTitre = b.type === 'reservation' && adresseValide ? nomAgenda(adresseValide) : '';
  const compteClics = b.type === 'lien' || TYPES_VITRINE.includes(b.type);

  /** Le haut, commun aux deux formes : à quoi sert le bloc, ce qu'il a de particulier, puis ses champs essentiels. */
  const essentiel = (
    <>
      {/* Un bloc neuf dit d'abord à quoi il sert, en une ligne ; un bloc existant, ce qu'il a de particulier, en clair. */}
      {nouveau && <p className="text-[13.5px] leading-snug text-white/60">{type.aide}.</p>}
      {!nouveau && etiquettes(b, droits).length > 0 && <p className="text-[13px] leading-snug text-white/60">{etiquettes(b, droits).join(' · ')}</p>}
      {/* Un avis ou une liste gardés d'une offre passée : ils attendent, rien n'est perdu. */}
      {type.fonction && !droits[type.fonction] && <Reserve fonction={type.fonction} phrase={`Ce bloc n’est pas montré sur ta page sans Hopla ${offreDe(type.fonction)}. Il revient tel quel dès que tu la prends.`} />}
      {b.type === 'preuve' && nouveau && !bureau && !preuveRemplie && !clavier && (
        // La place de l'aperçu est gardée dès l'ouverture : le formulaire ne saute pas quand la première valeur arrive.
        <div className="lp lp-mini grid min-h-[112px] place-items-center rounded-[20px] p-4 text-center ring-1 ring-white/[0.06]" style={variablesTheme(theme) as CSSProperties} data-police={theme.police} data-decor={theme.decor}>
          <p className="text-[13.5px]" style={{ color: 'var(--doux)' }}>L’aperçu s’affiche ici dès ta première valeur.</p>
        </div>
      )}
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
      {imageLien}
      {b.type === 'produit' && (bureau ? <div className="adm-paire">{champPrix}{photoProduit}</div> : <>{champPrix}{photoProduit}</>)}
      {partenaire}
      {b.type === 'derniere-video' && (
        <Champ label="Petit titre au-dessus" aide="La vidéo elle-même change toute seule à chaque nouvelle publication sur la chaîne.">
          <input className={classeSaisie} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={160} />
        </Champ>
      )}
    </>
  );

  if (bureau) {
    // L'allure : le sous-titre, l'icône et l'image d'un lien ou d'une réservation, le prénom d'une liste, les montants d'un soutien ;
    // « Mis en avant » est dehors.
    const aApparence = ['lien', 'newsletter', 'inscription', 'produit', 'soutien', 'reservation'].includes(b.type);
    // Les deux côtés passent par la même vérification : une adresse rangée sans sa barre finale n'est pas un changement.
    const norme = (x: Bloc) => verifierBloc(x).bloc ?? x;
    const annulable = !nouveau && !!depart.current && !memeBloc(norme(b), norme(depart.current));
    return (
      <FournisseurOffre value={offre}>
      <RangeesCompactes.Provider value>
      <div ref={racine} className="adm-editeur adm-editeur-ligne">
        {essentiel}
        {/* Les deux gestes les plus courants après le texte : le montrer ou non, le mettre en avant. */}
        <div className="adm-paire">
          <Interrupteur compact label="Visible sur ma page" actif={b.public} onChange={v => maj({ public: v })} />
          {vedette(true)}
        </div>

        {/* Le reste attend derrière une seule ligne, qui dit ce qui est réglé : on sait quoi sans ouvrir. */}
        <div className="adm-plus-groupe">
          <button type="button" onClick={() => { vibrer(4); setPlus(!plus); }} aria-expanded={plus} aria-controls={idPlus} className="adm-plus">
            <span className="shrink-0 font-medium text-white">Plus de réglages</span>
            {!plus && <span className="min-w-0 flex-1 truncate text-white/55">{reglees || cache}</span>}
            <Icone nom="ui-chevron" taille={14} className={`ml-auto shrink-0 text-white/55 transition-transform ${plus ? 'rotate-180' : ''}`} />
          </button>
          {plus && (
            <div id={idPlus} className="adm-plus-contenu">
              {aApparence && (
                <section aria-label="Apparence" className="flex flex-col">
                  <h3 className="adm-section-panneau">Apparence</h3>
                  {b.type !== 'produit' && (
                    <label className={ligne}>
                      <span className="flex-1 text-[13.5px] text-white">Sous-titre</span>
                      <input className={`${classeSaisie} adm-field-ligne max-w-[260px]`} value={b.sousTitre} onChange={e => maj({ sousTitre: e.target.value })} maxLength={240} placeholder={placeholderSousTitre || 'Facultatif'} />
                    </label>
                  )}
                  {montants && (
                    <div className={ligne}>
                      <span className="flex-1 text-[13.5px] text-white">Montants en euros</span>
                      <div className="w-[216px] shrink-0">{montants(true)}</div>
                    </div>
                  )}
                  {avecVisuel && (
                    <div>
                      <div className={ligne}>
                        <span className="flex-1 text-[13.5px] text-white">Icône</span>
                        <button type="button" onClick={() => setIcones(!icones)} aria-expanded={icones} aria-label={`Icône : ${nomIcone}`} className="adm-valeur">
                          {b.icone && <Icone nom={ICONES[b.icone] ? b.icone : 'ui-aucun'} taille={14} className="shrink-0" />}
                          <span className="truncate">{nomIcone}</span>
                        </button>
                      </div>
                      {grilleIcones}
                    </div>
                  )}
                  {b.type === 'reservation' && (
                    <div className={ligne}>
                      <span className="flex-1 text-[13.5px] text-white">Image</span>
                      {b.image && <img src={b.image} alt="" className="h-8 w-8 rounded-md object-cover" />}
                      <button type="button" onClick={e => choisirFichier(fichier.current, e.currentTarget)} disabled={envoi} className="adm-valeur">{envoi ? 'Envoi…' : b.image ? 'Changer' : 'Ajouter'}</button>
                      {b.image && <button type="button" onClick={() => maj({ image: '' })} aria-label="Retirer l’image" title="Retirer l’image" className={classeBouton.icone}><Icone nom="ui-corbeille" taille={15} /></button>}
                      {champFichier}
                    </div>
                  )}
                  {b.type === 'reservation' && erreurImage}
                  {bascules(true, true)}
                  {description && <div className="pt-2">{description}</div>}
                  {formeCouleur && <div className="pt-2">{formeCouleur}</div>}
                  {animation}
                </section>
              )}
              <section aria-label="Règles" className="flex flex-col">
                <h3 className="adm-section-panneau">Règles</h3>
                {regles}
              </section>
            </div>
          )}
        </div>

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
      </RangeesCompactes.Provider>
      </FournisseurOffre>
    );
  }

  // Au téléphone, la feuille mène de page en page, sa flèche dans l'en-tête : l'essentiel, puis « Plus de réglages », puis une page par règle.
  const fil: FilFeuille | null = page === null ? null : {
    titre: NOMS_PAGES[page],
    label: page === 'plus' ? 'Revenir au bloc' : 'Revenir à Plus de réglages',
    retour: () => allerA(page === 'plus' ? null : 'plus'),
  };
  const groupe = 'adm-groupe flex flex-col divide-y divide-white/[0.06]';
  return (
    <FournisseurOffre value={offre}>
    {/* `cote` : la page reste visible au-dessus de la feuille, et le bloc s'y redessine à chaque frappe ; la feuille s'arrête sous lui.
        Un bloc neuf n'est pas encore sur la page : sa feuille, voilée, prend presque tout l'écran, son aperçu en haut. */}
    <Feuille ouverte cote={!nouveau} classe="adm-feuille-bloc" plafond={plafond} onFermer={fermerEnGardant} retenir={retenir} titre={titre}
      retour={nouveau && onRetour ? { label: 'Revenir au choix du bloc', action: onRetour } : undefined}
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
      {apercu}
      <PagesBloc.Provider value={{ page, ouvrir: allerA }}>
      {/* La première page reste montée sous les autres : rien ne s'y perd, et son champ ne reprend pas le focus au retour. */}
      <div hidden={page !== null} className="adm-editeur flex flex-col gap-4 pt-1">
        {essentiel}

        {/* Masquer un bloc un temps est le geste le plus courant après le texte : il reste à portée, hors de « Plus de réglages ». */}
        <div className="-mt-1 border-b border-white/[0.07]">
          <Interrupteur label="Visible sur ma page" actif={b.public} onChange={v => maj({ public: v })} />
        </div>

        {/* Le reste attend derrière une seule ligne, qui dit ce qui est réglé ; elle mène à sa page, la flèche de l'en-tête ramène. */}
        <button id={`${idPlus}-ligne`} type="button" onClick={() => { vibrer(4); allerA('plus'); }}
          className="-mt-2 flex min-h-12 w-full items-center gap-3 text-left">
          <span className="shrink-0 whitespace-nowrap text-[14.5px] font-medium text-white">Plus de réglages</span>
          <span className="min-w-0 flex-1 truncate text-right text-[13px] text-white/55">{reglees || cache}</span>
          <Icone nom="ui-chevron" taille={16} className="-rotate-90 shrink-0 text-white/55" />
        </button>

        {!nouveau && compteClics && clics > 0 && <p className="text-center text-[13px] text-white/55">{clics} clic{clics > 1 ? 's' : ''} ces 30 derniers jours</p>}

        {/* Les gestes rares, nommés en toutes lettres, au bout de la feuille plutôt qu'en pictos à côté de Terminé. */}
        {!nouveau && (
          <div className={groupe}>
            {onDeplacer && place && place.total > 1 && (
              <div className="flex min-h-12 items-center gap-2 pl-4 pr-1.5">
                <span className="flex-1 text-[14.5px] font-medium text-white/85">Place sur ta page</span>
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
          {page === 'plus' && (<>
            {/* Deux groupes nommés, l'allure puis les règles : on trouve sans tout lire. */}
            {['lien', 'video', 'newsletter', 'inscription', 'produit', 'soutien', 'reservation'].includes(b.type) && <h3 className="-mb-1 text-[13px] font-medium text-white/55">Apparence</h3>}
            {['lien', 'newsletter', 'inscription', 'soutien', 'reservation'].includes(b.type) && (
              <Champ label="Sous-titre (facultatif)">
                <input className={classeSaisie} value={b.sousTitre} onChange={e => maj({ sousTitre: e.target.value })} maxLength={240} placeholder={placeholderSousTitre} />
              </Champ>
            )}
            {montants && (
              <div>
                <span className="mb-1.5 block text-[12.5px] font-medium text-white/60">Montants proposés, en euros</span>
                {montants(false)}
              </div>
            )}

            {description}

            {avecVisuel && (
              <>
                <div>
                  <button type="button" onClick={() => setIcones(!icones)} aria-expanded={icones}
                    className="adm-groupe flex min-h-12 w-full items-center gap-3 px-4 text-left transition hover:bg-white/[0.03]">
                    <span className="text-white"><Icone nom={b.icone && ICONES[b.icone] ? b.icone : 'ui-aucun'} taille={20} /></span>
                    <span className="flex-1 text-[14.5px] font-medium text-white/85">Icône</span>
                    <span className="text-[13px] text-white/50">{nomIcone}</span>
                    <Icone nom="ui-chevron" taille={16} className={`text-white/55 transition ${icones ? 'rotate-180' : ''}`} />
                  </button>
                  {grilleIcones}
                </div>
                {b.type === 'reservation' && <div className="flex items-center gap-3">
                  {b.image && <img src={b.image} alt="" className="h-14 w-14 rounded-xl object-cover" />}
                  <div className="flex flex-1 flex-wrap gap-2">
                    <button type="button" onClick={e => choisirFichier(fichier.current, e.currentTarget)} disabled={envoi} className={classeBouton.secondaire}>{envoi ? 'Envoi…' : b.image ? 'Changer l’image' : 'Ajouter une image'}</button>
                    {b.image && <button type="button" onClick={() => maj({ image: '' })} className={classeBouton.discret}>Retirer</button>}
                  </div>
                  {champFichier}
                </div>}
                {b.type === 'reservation' && erreurImage && <div className="-mt-2">{erreurImage}</div>}
              </>
            )}

            {bascules(false).length > 0 && <div className="adm-groupe divide-y divide-white/[0.06] px-4">{bascules(false)}</div>}
            {formeCouleur}
          </>)}
          {/* Les règles (et l'animation d'un lien mis en avant) restent montées d'une page à l'autre : une ligne ici, leur page là. */}
          {animation && <div className={page === 'plus' ? groupe : 'contents'}>{animation}</div>}
          {page === 'plus' && <h3 className="-mb-1 pt-1 text-[13px] font-medium text-white/55">Règles</h3>}
          <div className={page === 'plus' ? groupe : 'contents'}>{regles}</div>
        </div>
      )}
      </PagesBloc.Provider>
    </Feuille>
    </FournisseurOffre>
  );
}
