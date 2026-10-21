import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Api, Bloc, EtatAdmin, PagePublique, Reglages } from '../lib/types.ts';
import { TYPES_PRINCIPAL, nouveauBloc, urlPage } from '../lib/types.ts';
import { composerMoment } from '../lib/moments.ts';
import { PageLiens } from '../components/PageLiens.tsx';
import { MaPage } from './MaPage.tsx';
import type { Tiroir } from './OngletApparence.tsx';
import { EditeurBloc } from './EditeurBloc.tsx';
import { RegleAOuvrir } from './ReglesBloc.tsx';
import type { OptionsEnregistrement } from './EditeurBloc.tsx';
import { OngletStats } from './OngletStats.tsx';
import { MaListe } from './MaListe.tsx';
import { OngletReglages } from './OngletReglages.tsx';
import { OngletComptes } from './OngletComptes.tsx';
import { AccepterCgu } from './AccepterCgu.tsx';
import { PremiersPas, premiersPasFaits } from './PremiersPas.tsx';
import { pageNeuve } from '../lib/demarrage.ts';
import { sansSchema } from '../lib/types.ts';
import { Icone } from '../components/Icone.tsx';
import { BoutonCopier, EmplacementEntete, Menu, PoserFil, classeBouton, copierTexte, useGrandEcran, vibrer } from './ui.tsx';
import type { Fil } from './ui.tsx';
import { Marque } from './Marque.tsx';
import { AnneauDemarrage, noterPartage, useDemarrage } from './BienDemarrer.tsx';
import { FournisseurOffre } from './offre.tsx';
import { FenetreOffres, RetourPaiement } from './Offres.tsx';
import type { Fonction, PlanPayant } from '../lib/abonnement.ts';
import { FONCTIONS, OFFRES, joursStats, peut } from '../lib/abonnement.ts';
import type { Droits } from '../lib/droits.ts';
import { REFUS_PROGRAMMATION, nouvellesDates, selonDroits } from '../lib/droits.ts';
import type { Achat, EtapeRetour } from '../lib/achat.ts';
import { CLE_ACHAT, achatDeRetour, delaiAvantEssai, etapeRetour } from '../lib/achat.ts';

/*
 * Le back office. Tout s'enregistre tout seul : un bloc une fraction de
 * seconde après la dernière frappe dans son panneau (au bureau) ou quand on
 * valide sa feuille (au téléphone), l'ordre dès qu'on lâche, l'apparence et
 * les réglages une fraction de seconde après la dernière frappe. La page
 * qu'on modifie est la vraie page, rendue avec l'état en cours.
 */

type Onglet = 'page' | 'stats' | 'reglages' | 'comptes';
type Sauvegarde = 'ok' | 'encours' | 'erreur';

// Les mêmes pictos pleins que partout ailleurs dans le back office. Comptes, l'outil de Lilian, vient en dernier, à part.
const ONGLETS: { id: Onglet; nom: string; icone: string }[] = [
  { id: 'page', nom: 'Ma page', icone: 'document' },
  { id: 'stats', nom: 'Stats', icone: 'courbe' },
  { id: 'reglages', nom: 'Réglages', icone: 'reglage' },
  { id: 'comptes', nom: 'Comptes', icone: 'equipe' },
];

const nouvelId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
/** Les fonctions qui se règlent dans un bloc (ses dates, son créneau, son drop). */
const FONCTIONS_DE_BLOC: Fonction[] = ['programmation', 'heure', 'drops'];

/**
 * Le retour de Creem, lu une fois : l'adresse (`?paiement=pro`) et la note posée avant de partir. L'adresse
 * redevient propre et la note s'efface, pour qu'un rechargement ne rejoue rien. Ce retour n'accorde rien.
 */
function lireRetour(): Achat | null {
  const recherche = location.search;
  if (!new URLSearchParams(recherche).has('paiement')) return null;
  let note: unknown = null;
  try { note = JSON.parse(sessionStorage.getItem(CLE_ACHAT) ?? 'null'); sessionStorage.removeItem(CLE_ACHAT); } catch { /* onglet privé : le retour dira seulement l'offre */ }
  history.replaceState(null, '', location.pathname + location.hash);
  return achatDeRetour(recherche, note);
}

export function Admin({ api, initial, demo = false }: { api: Api; initial: EtatAdmin; demo?: boolean }) {
  const [blocs, setBlocs] = useState(initial.blocs);
  const [reglages, setReglages] = useState(initial.reglages);
  const [clics, setClics] = useState(initial.clics);
  const [onglet, setOnglet] = useState<Onglet>('page');
  // Les offres, par-dessus l'écran en cours : `pour`, la fonction réservée d'où l'on vient ; `vers`, l'offre à mettre en avant sans fonction.
  const [offres, setOffres] = useState<{ pour?: Fonction; vers?: PlanPayant; bloc?: string } | null>(null);
  // Au retour de Creem : ce qu'on vient de prendre, et où en est l'offre (voir `lib/achat.ts`).
  const [retour, setRetour] = useState<{ achat: Achat; etape: EtapeRetour } | null>(null);
  // « Essayer tes couleurs » : Ma page ouvre le design sur ses couleurs.
  const [demandeDesign, setDemandeDesign] = useState<Tiroir | null>(null);
  // « Programmer ce bloc », au retour de Creem : le bloc s'ouvre sur la règle que l'offre vient de débloquer.
  const [regleOuverte, setRegleOuverte] = useState<{ bloc: string; regle: 'moment' | 'acces' } | null>(null);
  const [edition, setEdition] = useState<{ bloc: Bloc; nouveau: boolean; enBas?: boolean } | null>(null);
  // Une seule fois : le bloc refermé (ou un autre ouvert), sa règle ne s'ouvre plus d'elle-même.
  useEffect(() => { if (regleOuverte && edition?.bloc.id !== regleOuverte.bloc) setRegleOuverte(null); }, [edition, regleOuverte]);
  // Le bloc tel qu'il se tape dans l'éditeur : la page le redessine à chaque frappe, avant même qu'il soit écrit.
  const [brouillon, setBrouillon] = useState<Bloc | null>(null);
  // Ce que l'éditeur ouvert fait avant qu'on passe à autre chose : écrire ce qui est valable, ou retenir (voir `EditeurBloc`).
  const garde = useRef<(() => boolean) | null>(null);
  // La forme suit la largeur : au bureau, les réglages d'un bloc s'ouvrent dans un panneau à côté de la page.
  const grand = useGrandEcran();
  const [sauvegarde, setSauvegarde] = useState<Sauvegarde>('ok');
  const [toast, setToast] = useState<{ texte: string; annuler?: () => void; action?: string; genre?: 'ok' | 'info'; long?: boolean } | null>(null);
  // Le doigt ou le focus sur le message le garde affiché : « Annuler » ne file pas pendant qu'on le vise.
  const [toastTenu, setToastTenu] = useState(false);
  const [apercu, setApercu] = useState(false);
  // L'endroit de l'en-tête du bureau où l'onglet ouvert pose son geste (voir `ActionEntete`).
  const [emplacement, setEmplacement] = useState<HTMLDivElement | null>(null);
  // Une sous-page ouverte (Réglages, puis Les offres) : l'en-tête montre son fil, qui ramène en arrière (voir `SousPage`).
  const [fil, setFil] = useState<Fil | null>(null);
  // En entrant dans une sous-page, le focus va au retour visible (celui de l'en-tête au bureau, du titre au téléphone).
  const dansSousPage = !!fil;
  useEffect(() => {
    if (!dansSousPage) return;
    [...document.querySelectorAll<HTMLElement>('.adm-fil-retour')].find(b => b.offsetParent)?.focus({ preventScroll: true });
  }, [dansSousPage]);
  // « Bien démarrer » au téléphone : l'anneau de l'en-tête ouvre sa liste dans une feuille.
  const [demarrageOuvert, setDemarrageOuvert] = useState(false);
  const [cguAJour, setCguAJour] = useState(initial.cguAJour);
  const [abonnement, setAbonnement] = useState(initial.abonnement);
  const [droits, setDroits] = useState(initial.droits);
  // Un compte neuf arrive sur ses premiers pas, une seule fois, et seulement tant que sa page est vide.
  const [premiersPas, setPremiersPas] = useState(() => !initial.compte.principal && pageNeuve(initial.reglages, initial.blocs));
  // Remis à plus tard sur cet appareil : lu après l'hydratation, le serveur n'en sait rien.
  useEffect(() => { if (premiersPasFaits()) setPremiersPas(false); }, []);
  const enCours = useRef(0);
  // La liste à jour entre deux rendus : deux gestes dans le même instant (écrire le bloc ouvert, puis en ouvrir un autre) partent de la même.
  const blocsRef = useRef(blocs);
  blocsRef.current = blocs;
  const poserListe = (liste: Bloc[]) => { blocsRef.current = liste; setBlocs(liste); };
  /** Un ordre de blocs appliqué à la liste d'aujourd'hui : un bloc modifié entre-temps garde sa dernière version. */
  const selonOrdre = (ids: string[]) => {
    const l = blocsRef.current;
    return [...l.filter(b => !ids.includes(b.id)), ...ids.map(id => l.find(b => b.id === id)).filter((b): b is Bloc => !!b)];
  };
  const compte = useMemo(() => ({ ...initial.compte, plan: abonnement.plan }), [initial.compte, abonnement.plan]);
  // L'onglet Comptes n'existe que pour Lilian.
  const onglets = ONGLETS.filter(o => o.id !== 'comptes' || api.comptes);
  const minuteur = useRef<ReturnType<typeof setTimeout>>(undefined);

  /** Chaque écriture passe ici : l'indicateur suit les requêtes en vol. */
  const ecrire = useCallback(async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    enCours.current++;
    setSauvegarde('encours');
    try {
      const r = await action();
      if (--enCours.current === 0) setSauvegarde('ok');
      return r;
    } catch (error) {
      enCours.current--;
      setSauvegarde('erreur');
      // Un échec se rejoue d'un toucher : la même écriture repart. Un refus de l'offre, lui, se dit tel quel, avec le chemin vers les offres,
      // et la page revient à ce que le serveur a gardé (une copie ou un retour en arrière refusés ne restent pas affichés).
      const message = (error as Error).message ?? '';
      // La feuille ouverte sur un bloc que le serveur n'a pas gardé se ferme avec lui.
      if (message === REFUS_PROGRAMMATION) api.charger().then(e => { setBlocs(e.blocs); setDroits(e.droits); setAbonnement(e.abonnement); setEdition(ed => (ed && !ed.nouveau && !e.blocs.some(b => b.id === ed.bloc.id) ? null : ed)); if (enCours.current === 0) setSauvegarde('ok'); }).catch(() => {});
      setToast(message.includes('Session')
        ? { texte: 'Ta session a expiré. Recharge la page pour te reconnecter.' }
        : message === REFUS_PROGRAMMATION
          ? refusProgrammation()
          : { texte: 'Pas enregistré. Vérifie ta connexion.', action: 'Réessayer', annuler: () => { setToast(null); void ecrireRef.current(action); } });
      return undefined;
    }
  }, [api]);

  const ecrireRef = useRef(ecrire);
  ecrireRef.current = ecrire;
  // Le compte peut-il prendre une offre : le paiement est branché, et ce n'est pas le compte principal, qui a tout.
  const peutAcheter = initial.paiement && !initial.compte.principal;
  const ouvrirOffres = (pour?: Fonction, vers?: PlanPayant, bloc?: string) => setOffres({ pour, vers, bloc });
  // Le chemin vers les offres, pour un refus du serveur (absent quand le compte ne peut pas s'abonner) : elles s'ouvrent par-dessus.
  const versOffres = useRef<(() => void) | undefined>(undefined);
  versOffres.current = peutAcheter ? () => ouvrirOffres('programmation') : undefined;
  const refusProgrammation = () => ({ texte: REFUS_PROGRAMMATION, long: true, ...(versOffres.current ? { action: 'Voir les offres', annuler: () => { setToast(null); versOffres.current?.(); } } : {}) });
  useEffect(() => { if (!toast) setToastTenu(false); }, [toast]);
  // Après un retrait, le bloc qui avait le focus n'existe plus : le focus va à « Annuler » plutôt qu'au vide.
  const actionToast = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (toast?.annuler && (document.activeElement === document.body || !document.activeElement)) actionToast.current?.focus({ preventScroll: true }); }, [toast]);
  // L'aperçu plein écran se comporte en fenêtre : Échap le ferme, le focus va au bouton puis revient.
  const fermerApercu = useRef<HTMLButtonElement>(null);
  const fenetreApercu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!apercu) return;
    const avant = document.activeElement as HTMLElement | null;
    const corps = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    fermerApercu.current?.focus({ preventScroll: true });
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return setApercu(false);
      if (e.key !== 'Tab' || !fenetreApercu.current) return;
      // Tab tourne dans la fenêtre : rien derrière l'aperçu ne prend le focus.
      const f = [...fenetreApercu.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])')];
      if (!f.length) return;
      const [premier, dernier] = [f[0], f[f.length - 1]];
      const dedans = fenetreApercu.current.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === premier || !dedans)) { e.preventDefault(); dernier.focus(); }
      else if (!e.shiftKey && (document.activeElement === dernier || !dedans)) { e.preventDefault(); premier.focus(); }
    };
    document.addEventListener('keydown', touche);
    return () => { document.removeEventListener('keydown', touche); document.body.style.overflow = corps; avant?.focus({ preventScroll: true }); };
  }, [apercu]);
  useEffect(() => { if (!toast || toastTenu) return; const t = setTimeout(() => setToast(null), toast.long ? 8000 : toast.annuler ? 5000 : 2600); return () => clearTimeout(t); }, [toast, toastTenu]);
  // Annuler, mis au point par le code, disparaît avec le toast : sans ce rappel, le toast suivant ne partirait plus.
  useEffect(() => { setToastTenu(false); }, [toast]);
  useEffect(() => () => clearTimeout(minuteur.current), []);

  /*
   * Au retour de Creem (ou d'un changement d'offre) : l'offre n'arrive qu'avec le webhook signé, que le serveur écrit,
   * quelques secondes plus tard. On relit l'abonnement jusqu'à la voir, sans jamais l'accorder ici : « On active ton
   * offre… », puis « C'est fait ». Fermée avant, la fenêtre laisse la relecture finir et un message le dira.
   */
  const retourLu = useRef<Achat | null | undefined>(undefined);
  const retourFerme = useRef(false);
  useEffect(() => {
    // Lu une seule fois, même si l'effet est rejoué (mode strict) : l'adresse est déjà nettoyée au deuxième passage.
    if (retourLu.current === undefined) retourLu.current = lireRetour();
    const achat = retourLu.current;
    if (!achat) return;
    let essais = 0;
    let fini = false;
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    const dire = (etape: EtapeRetour) => { if (!retourFerme.current) setRetour({ achat, etape }); };
    if (etapeRetour(achat, initial.abonnement, 0) === 'fait') { dire('fait'); return; }
    dire('activation');
    const relire = () => {
      const delai = delaiAvantEssai(essais);
      if (delai === null) return;
      minuterie = setTimeout(async () => {
        essais++;
        try {
          const e = await api.charger();
          if (fini) return;
          const etape = etapeRetour(achat, e.abonnement, essais);
          if (etape === 'fait' || delaiAvantEssai(essais) === null) { setAbonnement(e.abonnement); setDroits(e.droits); }
          if (etape === 'fait') {
            if (retourFerme.current) setToast({ texte: `C’est fait, tu es en ${OFFRES[achat.plan].nom}` });
            dire('fait');
            return;
          }
          dire(etape);
        } catch { if (fini) return; }
        relire();
      }, delai);
    };
    relire();
    return () => { fini = true; clearTimeout(minuterie); };
  }, [api]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Avant un autre geste : ce que l'éditeur ouvert a de valable s'écrit ; un champ faux le retient (faux). */
  const libererEdition = () => !garde.current || garde.current();
  /** Ferme l'éditeur ouvert, après avoir écrit ce qui est valable. */
  function fermerEdition() {
    if (!edition) return true;
    if (!libererEdition()) return false;
    setEdition(null);
    return true;
  }
  function choisirOnglet(o: Onglet) {
    if (!fermerEdition()) return;
    setOnglet(o);
    scrollTo({ top: 0 });
  }

  /** Avant de partir chez Creem : les réglages qui attendaient leur envoi partent, le bloc ouvert s'écrit, et on attend que tout soit gardé (4 secondes au plus). */
  async function avantDePartir() {
    if (reglagesEnAttente.current) {
      clearTimeout(minuteur.current);
      const r = reglagesEnAttente.current;
      reglagesEnAttente.current = null;
      void ecrire(() => api.enregistrerReglages(r));
    }
    libererEdition();
    for (let i = 0; i < 40 && enCours.current > 0; i++) await new Promise(r => setTimeout(r, 100));
  }

  /** La page telle qu'elle sera avec une offre, pour le récapitulatif : ce que l'offre ouvre s'y montre, sans la mention dès Starter. */
  function apercuAvec(plan: PlanPayant): PagePublique {
    const d = Object.fromEntries((Object.keys(FONCTIONS) as Fonction[]).map(f => [f, droits[f] || peut(plan, f)])) as Droits;
    const permis = selonDroits(reglages, blocs.filter(b => !TYPES_PRINCIPAL.includes(b.type)), d);
    const maintenant = Date.now();
    return { reglages: permis.reglages, blocs: composerMoment(permis.blocs, maintenant), compte: { ...compte, plan }, maintenant };
  }

  /** Après « C'est fait » : le geste qui mène à ce qu'on était venu chercher. */
  function actionApres({ pour, bloc }: Achat): { texte: string; faire: () => void } | undefined {
    if (pour === 'couleurs') return { texte: 'Essayer tes couleurs', faire: () => { choisirOnglet('page'); setDemandeDesign('couleurs'); } };
    if (pour === 'stats') return { texte: 'Voir tes stats', faire: () => choisirOnglet('stats') };
    if (pour === 'avis') return { texte: 'Ajouter un avis', faire: () => { choisirOnglet('page'); ajouterBloc(nouveauBloc('preuve', nouvelId())); } };
    if (pour === 'listeEmail') return { texte: 'Ajouter ta liste d’inscrits', faire: () => { choisirOnglet('page'); ajouterBloc(nouveauBloc('inscription', nouvelId())); } };
    // Une règle de bloc (dates, créneau, drop) : on revient au bloc d'où l'on était parti, s'il est toujours là.
    const b = pour && FONCTIONS_DE_BLOC.includes(pour) && bloc ? blocs.find(x => x.id === bloc) : undefined;
    if (b) return {
      texte: pour === 'programmation' ? 'Programmer ce bloc' : pour === 'heure' ? 'Choisir son créneau' : 'Régler ce drop',
      faire: () => { setRegleOuverte({ bloc: b.id, regle: pour === 'drops' ? 'acces' : 'moment' }); choisirOnglet('page'); ouvrirBloc(b); },
    };
    return undefined;
  }

  /** Un clic sur un bloc l'ouvre ; au bureau, le panneau passe d'un bloc à l'autre en écrivant le précédent. */
  function ouvrirBloc(bloc: Bloc) {
    if (edition && !edition.nouveau && edition.bloc.id === bloc.id) return;
    if (!libererEdition()) return;
    setEdition({ bloc: blocsRef.current.find(b => b.id === bloc.id) ?? bloc, nouveau: false });
  }
  function ajouterBloc(bloc: Bloc, enBas?: boolean) {
    if (!libererEdition()) return;
    setEdition({ bloc, nouveau: true, enBas });
  }
  // Au téléphone, la feuille du bloc couvre le bas de l'écran : le bloc ouvert remonte juste sous l'en-tête, au-dessus d'elle.
  const idOuvert = edition && !edition.nouveau ? edition.bloc.id : null;
  useLayoutEffect(() => {
    if (!idOuvert || grand) return;
    const el = document.querySelector<HTMLElement>(`.adm-toile [data-id="${CSS.escape(idOuvert)}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const haut = 84, bas = innerHeight * 0.42 - 12;
    if (r.top < haut || r.bottom > bas) scrollTo({ top: Math.max(0, scrollY + r.top - haut) });
  }, [idOuvert, grand]);

  // Les réglages tapés qui attendent leur envoi : ils partent tout de suite si l'on quitte la page pour Creem.
  const reglagesEnAttente = useRef<Reglages | null>(null);
  function changerReglages(r: Reglages) {
    setReglages(r);
    clearTimeout(minuteur.current);
    setSauvegarde('encours');
    reglagesEnAttente.current = r;
    minuteur.current = setTimeout(() => { reglagesEnAttente.current = null; ecrire(() => api.enregistrerReglages(r)); }, 650);
  }

  /** Un bloc qui vient d'arriver se montre : la page défile jusqu'à lui et il s'éclaire un instant. */
  function montrer(id: string) {
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`.adm-toile [data-id="${CSS.escape(id)}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      el.setAttribute('data-neuf', '');
      setTimeout(() => el.removeAttribute('data-neuf'), 1800);
    }, 260);
  }

  /**
   * Écrit un bloc. `garder` : l'éditeur reste ouvert sur lui (le panneau du bureau). `discret` : enregistré en route,
   * sans message ni défilement ; l'état de l'en-tête dit que c'est gardé.
   */
  function enregistrerBloc(bloc: Bloc, options: OptionsEnregistrement = {}) {
    const avant = blocsRef.current;
    const nouveau = !avant.some(b => b.id === bloc.id);
    const enBas = nouveau && !!edition?.enBas;
    const liste = nouveau ? (enBas ? [...avant, bloc] : [bloc, ...avant]) : avant.map(b => (b.id === bloc.id ? bloc : b));
    poserListe(liste);
    setEdition(e => (e && e.bloc.id === bloc.id ? (options.garder ? { bloc, nouveau: false } : null) : e));
    // Le serveur pose un bloc neuf en tête : ajouté par le bas, il est rangé à la fin juste après.
    ecrire(async () => { await api.enregistrerBloc(bloc); if (enBas) await api.ordonner(liste.map(b => b.id)); });
    if (nouveau) {
      setToast({ texte: enBas ? 'Ajouté en bas de ta page' : 'Ajouté en haut de ta page', annuler: () => {
        poserListe(blocsRef.current.filter(b => b.id !== bloc.id));
        setEdition(e => (e?.bloc.id === bloc.id ? null : e));
        setToast({ texte: 'Ajout annulé', genre: 'info' });
        ecrire(() => api.supprimerBloc(bloc.id));
      } });
      if (!options.discret) montrer(bloc.id);
    } else if (!options.discret) {
      // Une modification se défait aussi, le temps du message : le bloc revient tel qu'il était.
      const ancien = avant.find(b => b.id === bloc.id);
      if (ancien && JSON.stringify(ancien) !== JSON.stringify(bloc)) setToast({ texte: 'Modifications enregistrées', annuler: () => {
        poserListe(blocsRef.current.map(b => (b.id === ancien.id ? ancien : b))); setToast({ texte: 'Changements annulés', genre: 'info' }); ecrire(() => api.enregistrerBloc(ancien));
      } });
    }
  }

  /** L'œil posé à côté d'un bloc, au bureau : le montrer ou le masquer sans l'ouvrir. */
  function basculer(bloc: Bloc) {
    const vrai = blocsRef.current.find(b => b.id === bloc.id);
    if (!vrai || edition?.bloc.id === bloc.id) return;
    const change = { ...vrai, public: !vrai.public };
    poserListe(blocsRef.current.map(b => (b.id === vrai.id ? change : b)));
    ecrire(() => api.enregistrerBloc(change));
    setToast({ texte: change.public ? 'Montré sur ta page' : 'Masqué de ta page', annuler: () => {
      poserListe(blocsRef.current.map(b => (b.id === vrai.id ? { ...b, public: vrai.public } : b)));
      setToast({ texte: 'Changements annulés', genre: 'info' });
      ecrire(() => api.enregistrerBloc({ ...change, public: vrai.public }));
    } });
  }

  /** Plusieurs liens d'un coup (les premiers pas) : les nouveaux en tête, dans l'ordre donné ; les autres mis à jour sur place. */
  function poserBlocs(liste: Bloc[]) {
    const nouveaux = liste.filter(b => !blocs.some(x => x.id === b.id));
    setBlocs(l => [...nouveaux, ...l.map(b => liste.find(x => x.id === b.id) ?? b)]);
    // Le serveur pose chaque nouveau bloc en tête : on les envoie du dernier au premier.
    ecrire(async () => { for (const b of [...liste].reverse()) await api.enregistrerBloc(b); });
  }

  /** Un nouvel ordre : seuls les identifiants comptent, la page peut montrer un bloc en cours de saisie. */
  function ordonner(liste: Bloc[], texte = 'Bloc déplacé') {
    const avant = blocsRef.current.map(b => b.id);
    const nouvelle = selonOrdre(liste.map(b => b.id));
    poserListe(nouvelle);
    ecrire(() => api.ordonner(nouvelle.map(b => b.id)));
    setToast({ texte, annuler: () => { const remise = selonOrdre(avant); poserListe(remise); setToast({ texte: 'Remis à sa place', genre: 'info' }); ecrire(() => api.ordonner(remise.map(b => b.id))); } });
  }

  /** Un cran plus haut ou plus bas, depuis la feuille du bloc : l'ordre se règle aussi sans glisser. */
  function deplacer(bloc: Bloc, sens: -1 | 1) {
    const blocs = blocsRef.current;
    const i = blocs.findIndex(b => b.id === bloc.id);
    const j = i + sens;
    if (i < 0 || j < 0 || j >= blocs.length) return;
    const liste = [...blocs];
    [liste[i], liste[j]] = [liste[j], liste[i]];
    // Le déplacement s'enregistre tout de suite, à part des réglages de la feuille : le message le dit.
    ordonner(liste, sens < 0 ? 'Bloc monté d’un cran' : 'Bloc descendu d’un cran');
  }

  function supprimer(bloc: Bloc) {
    const avant = blocsRef.current;
    const i = avant.findIndex(b => b.id === bloc.id);
    if (i < 0) return;
    // La version enregistrée revient avec Annuler, jamais un champ à moitié tapé.
    const vrai = avant[i];
    poserListe(avant.filter(b => b.id !== bloc.id));
    // Retiré depuis la page, un autre bloc ouvert dans le panneau le reste.
    setEdition(e => (e?.bloc.id === bloc.id ? null : e));
    ecrire(() => api.supprimerBloc(bloc.id));
    setToast({
      texte: 'Retiré de ta page',
      // Retirer ne demande pas de confirmation : l'annulation reste offerte plus longtemps.
      long: true,
      annuler: () => {
        // À sa place d'avant : juste après le bloc qui le précédait.
        const l = blocsRef.current.filter(b => b.id !== vrai.id);
        const precedent = avant[i - 1]?.id;
        const k = precedent ? l.findIndex(b => b.id === precedent) + 1 : 0;
        const remise = [...l.slice(0, k), vrai, ...l.slice(k)];
        poserListe(remise);
        setToast({ texte: 'Remis sur ta page', genre: 'info' });
        ecrire(async () => { await api.enregistrerBloc(vrai); await api.ordonner(remise.map(b => b.id)); });
      },
    });
  }

  function dupliquer(bloc: Bloc) {
    // L'éditeur ouvert écrit d'abord ce qui est tapé : la copie s'ouvre à sa place.
    if (!libererEdition()) return;
    const blocs = blocsRef.current;
    const source = blocs.find(b => b.id === bloc.id) ?? bloc;
    const copie = { ...source, id: `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, titre: source.titre ? `${source.titre} (copie)` : '' };
    // Sans Starter, une copie ne reprend pas des dates : le serveur la refuserait. Rien n'est créé, le message le dit tout de suite.
    if (!droits.programmation && nouvellesDates(undefined, copie)) { setToast(refusProgrammation()); return; }
    const i = blocs.findIndex(b => b.id === bloc.id);
    const liste = [...blocs.slice(0, i + 1), copie, ...blocs.slice(i + 1)];
    poserListe(liste);
    setEdition({ bloc: copie, nouveau: false });
    montrer(copie.id);
    ecrire(async () => { await api.enregistrerBloc(copie); await api.ordonner(liste.map(b => b.id)); });
  }

  async function deconnexion() {
    await api.deconnexion();
    location.reload();
  }

  // Le bloc en cours de saisie, à sa place sur la page.
  const brouillonVu = brouillon && edition && !edition.nouveau && brouillon.id === edition.bloc.id ? brouillon : null;
  const blocsAffiches = useMemo(() => (brouillonVu ? blocs.map(b => (b.id === brouillonVu.id ? brouillonVu : b)) : blocs), [blocs, brouillonVu]);
  // L'aperçu (plein écran au téléphone, sur ordinateur au bureau) est la page telle que les visiteurs la voient :
  // ce que l'offre ne comprend pas s'en efface, comme sur le serveur.
  const page = useMemo(() => {
    const maintenant = Date.now();
    const permis = selonDroits(reglages, blocsAffiches.filter(b => compte.principal || !TYPES_PRINCIPAL.includes(b.type)), droits);
    return { reglages: permis.reglages, blocs: composerMoment(permis.blocs, maintenant), compte, maintenant };
  }, [reglages, blocsAffiches, compte, droits]);
  const chargerStats = useCallback((jours: number) => api.stats(jours).then(s => { if (jours === 30) setClics(Object.fromEntries(s.blocs.map(b => [b.id, b.clics]))); return s; }), [api]);
  const demarrage = useDemarrage(reglages, blocs, { principal: compte.principal, dejaVue: !!initial.dejaVue });
  useEffect(() => { if (!demarrage.actif) setDemarrageOuvert(false); }, [demarrage.actif]);

  if (!cguAJour) return <AccepterCgu accepter={async () => { await api.accepterCgu(); setCguAJour(true); }} deconnexion={deconnexion} />;

  const bulle = toast && (
    <div role="status" onPointerEnter={() => setToastTenu(true)} onPointerLeave={() => setToastTenu(false)} onFocus={() => setToastTenu(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setToastTenu(false); }} className={`adm-toast fixed inset-x-4 ${onglet === 'page' && !premiersPas ? 'bottom-[calc(134px+env(safe-area-inset-bottom))]' : 'bottom-[calc(76px+env(safe-area-inset-bottom))]'} z-[60] mx-auto flex max-w-sm items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-[14.5px] font-medium text-nuit shadow-2xl lg:bottom-6 lg:left-[232px]`}>
      <span className="flex items-center gap-2">{/* La coche confirme ; une simple information n'en a pas. */}{!toast.annuler && toast.genre !== 'info' && sauvegarde !== 'erreur' && <span aria-hidden="true"><Icone nom="ui-ok" taille={18} /></span>}{toast.texte}</span>
      {toast.annuler && <button ref={actionToast} type="button" onClick={toast.annuler} className="-my-2 min-h-11 rounded-lg px-3 font-semibold text-nuit underline decoration-nuit/30 underline-offset-4 hover:bg-nuit/10">{toast.action ?? 'Annuler'}</button>}
    </div>
  );

  // Ouvertes depuis la règle d'un bloc, les offres retiennent ce bloc : au retour de Creem, on y revient d'un geste.
  const offre = { droits, voirOffres: peutAcheter ? (pour?: Fonction) => ouvrirOffres(pour, undefined, pour && FONCTIONS_DE_BLOC.includes(pour) && edition && !edition.nouveau ? edition.bloc.id : undefined) : undefined };

  if (premiersPas) {
    // Les premiers pas n'ont aucune fonction réservée : pas de chemin vers les offres.
    return (
      <FournisseurOffre value={{ droits }}>
        <PremiersPas compte={compte} reglages={reglages} blocs={blocs} onReglages={changerReglages} onPoserBlocs={poserBlocs}
          envoyerImage={d => api.envoyerImage(d)} apercuSite={u => api.apercuSite(u)} onFin={suite => {
            setPremiersPas(false); setOnglet('page'); scrollTo({ top: 0 });
            // « Ajouter mon premier lien » : l'éditeur s'ouvre déjà sur un lien neuf.
            if (suite === 'lien') setEdition({ bloc: nouveauBloc('lien', nouvelId()), nouveau: true });
          }} />
        {bulle}
      </FournisseurOffre>
    );
  }

  // Un éditeur par bloc (la clé) : passer d'un bloc à l'autre repart de la version enregistrée du suivant.
  const editeur = edition && (
    <RegleAOuvrir.Provider value={regleOuverte?.bloc === edition.bloc.id ? regleOuverte.regle : null}>
    <EditeurBloc key={edition.bloc.id} panneau={grand} garde={garde} onBrouillon={setBrouillon}
      adressePage={urlPage(compte)} principal={compte.principal} bloc={edition.bloc} reglages={reglages} nouveau={edition.nouveau} clics={clics[edition.bloc.id] ?? 0} prises={initial.places?.[edition.bloc.id] ?? 0} onFermer={() => setEdition(null)}
      onEnregistrer={enregistrerBloc} onSupprimer={supprimer} onDupliquer={dupliquer} onDeplacer={deplacer} place={{ rang: blocs.findIndex(b => b.id === edition.bloc.id), total: blocs.length }} envoyerImage={d => api.envoyerImage(d)} apercuSite={u => api.apercuSite(u)} />
    </RegleAOuvrir.Provider>
  );
  const indicateur = sauvegarde === 'encours' ? 'Enregistrement…' : sauvegarde === 'erreur' ? 'Non enregistré' : 'Enregistré';
  // Le même signe au téléphone et au bureau : une coche quand tout est gardé, un point qui bat pendant l'envoi, du rouge seulement en cas d'échec.
  const signe = sauvegarde === 'ok'
    ? <Icone nom="ui-ok" taille={14} className="shrink-0" />
    : <span aria-hidden="true" className={`mx-1 h-1.5 w-1.5 shrink-0 rounded-full ${sauvegarde === 'encours' ? 'animate-pulse bg-white/40 motion-reduce:animate-none' : 'bg-red-300'}`} />;
  const adresse = urlPage(compte);
  const courte = sansSchema(adresse);
  const coupe = courte.lastIndexOf('/') + 1;
  const titre = onglets.find(o => o.id === onglet)!.nom;
  const avatar = (taille: string) => reglages.profil.avatar
    ? <img src={reglages.profil.avatar} alt="" className={`${taille} shrink-0 rounded-full object-cover`} />
    : <span className={`${taille} grid shrink-0 place-items-center rounded-full bg-white/[0.06]`}><Icone nom="utilisateur" taille={14} /></span>;

  return (
    <FournisseurOffre value={offre}>
    <div className="adm adm-shell min-h-dvh font-sans text-white antialiased">
      {/* Au bureau, une barre latérale fine : la marque, les sections, et le compte en bas, qui s'ouvre sur « Me déconnecter ». */}
      <aside className="adm-sidebar fixed inset-y-0 left-0 z-30 hidden w-[216px] flex-col lg:flex" aria-label="Navigation">
        <Marque petite className="h-14 shrink-0 px-2" />
        <nav className="flex flex-col gap-0.5 pt-1.5" aria-label="Sections">
          {onglets.map(o => (
            <button key={o.id} type="button" onClick={() => { if (o.id !== onglet) choisirOnglet(o.id); else fil?.retour(); }} aria-current={onglet === o.id ? 'page' : undefined}
              className={`adm-nav-item ${o.id === 'comptes' ? 'mt-3.5' : ''}`}>
              <Icone nom={o.icone} taille={16} className="shrink-0" />{o.nom}
            </button>
          ))}
        </nav>
        <div className="mt-auto">
          <Menu label="Ton compte" haut aligne="largeur" className="adm-compte" titre={`${reglages.profil.nom || compte.pseudo}, ton compte`}
            entete={<p className="truncate px-2.5 pb-1.5 pt-2 text-[12px] text-white/55">{compte.email ? `${compte.email} · ` : ''}{compte.principal ? 'Compte principal' : `Hopla ${OFFRES[compte.plan].nom}`}</p>}
            elements={[{ nom: 'Me déconnecter', icone: 'ui-sortir', action: deconnexion }]}>
            {avatar('h-6 w-6')}
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{reglages.profil.nom || compte.pseudo}</span>
            <Icone nom="ui-chevrons" taille={14} className="shrink-0 text-white/55" />
          </Menu>
        </div>
      </aside>

      <div className="lg:pl-[216px]">
      <header className="adm-topbar sticky top-0 z-30">
        {/* Au téléphone, l'en-tête porte l'adresse de la page et son état : la copier ne prend plus une ligne au-dessus de la page. */}
        <div className="mx-auto flex min-h-[72px] max-w-[1120px] items-center gap-3 px-4 lg:hidden">
          {/* Tant que la page n'est pas prête, l'anneau de « Bien démarrer » prend la place de la photo : la liste ne passe plus avant la page. */}
          {onglet === 'page' && demarrage.actif
            ? <AnneauDemarrage faites={demarrage.faites} total={demarrage.etapes.length} onClick={() => setDemarrageOuvert(true)} />
            : avatar('h-9 w-9')}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight" translate="no">{courte}</p>
            <p className={`flex items-center gap-1 text-[12px] leading-tight ${sauvegarde === 'erreur' ? 'text-red-300' : 'text-white/55'}`} aria-live="polite">
              {signe}{indicateur}
            </p>
          </div>
          <BoutonCopier compact texte={adresse} label="Copier l’adresse de ta page" onCopie={noterPartage} />
          {/* Sous 390 px, l'œil seul : l'adresse garde la place d'être lue. */}
          <button type="button" onClick={() => setApercu(true)} className="adm-button-outline flex min-h-11 items-center justify-center gap-1.5 px-3.5 text-[13px] font-medium max-[389px]:w-11 max-[389px]:px-0"><Icone nom="ui-oeil" taille={17} className="shrink-0" /><span className="max-[389px]:sr-only">Aperçu</span></button>
        </div>
        {/* Au bureau, une seule rangée : le nom de l'écran, puis ce qui sert ici. Pas de barre vide, pas de deuxième titre. */}
        <div className="hidden h-14 items-center gap-2 pl-6 pr-4 lg:flex">
          {fil ? (
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <button type="button" onClick={fil.retour} className="adm-fil-retour -ml-2"><Icone nom="ui-chevron" taille={14} className="rotate-90" />{titre}</button>
              <span aria-hidden="true" className="text-[#b5b5ae]">/</span>
              <h1 className="adm-entete-titre ml-1.5 min-w-0 truncate">{fil.nom}</h1>
            </div>
          ) : <h1 className="adm-entete-titre min-w-0 flex-1 truncate">{titre}</h1>}
          {/* L'état ne se montre que là où l'on écrit, ou quand il a quelque chose à dire. */}
          {(onglet === 'page' || onglet === 'reglages' || sauvegarde !== 'ok') && (
            <p className="adm-etat mr-1.5" data-erreur={sauvegarde === 'erreur' || undefined} role="status">{signe}{indicateur}</p>
          )}
          {onglet === 'page' && (
            <>
              <div className="adm-adresse-entete h-11 bureau:h-9">
                <span className="flex items-center px-2.5 text-[13px] text-white/55" translate="no">{courte.slice(0, coupe)}<span className="font-medium text-white">{courte.slice(coupe)}</span></span>
                <BoutonAdresse adresse={adresse} />
              </div>
              <a href={demo ? '#page' : adresse} target={demo ? undefined : '_blank'} rel={demo ? undefined : 'noopener'} className={classeBouton.secondaire}><Icone nom="ui-ouvrir" taille={15} className="shrink-0" />Voir ma page</a>
            </>
          )}
          <div ref={setEmplacement} className="flex items-center gap-2 empty:hidden" />
        </div>
      </header>

      {initial.stockageEphemere && !demo && (
        <p className="mx-auto mt-3 max-w-6xl px-4"><span className="block rounded-xl bg-amber-400/15 px-3.5 py-2.5 text-[13.5px] text-amber-100">Le stockage n’est pas encore branché sur le serveur : tes changements seront perdus au prochain redémarrage.</span></p>
      )}

      <EmplacementEntete.Provider value={emplacement}>
      <PoserFil.Provider value={setFil}>
      {/* Ma page et Comptes prennent toute la largeur au bureau (le canevas, la barre des onglets de Comptes) ; les autres gardent leurs marges. */}
      <div className={`mx-auto max-w-[1120px] px-4 lg:max-w-none ${onglet === 'page' || onglet === 'comptes' ? 'lg:px-0' : 'lg:px-10'}`}>
        <main id="contenu-admin" className={`mx-auto w-full pb-28 ${onglet === 'page' ? 'pt-4 lg:p-0' : onglet === 'comptes' ? 'pt-6 lg:pb-12 lg:pt-0' : 'pt-6 lg:pb-12 lg:pt-7'}`}>
          <div key={onglet} className="adm-onglet">
          {/* Au téléphone, le titre de l'écran ouvre le contenu (Ma page n'affiche pas le sien : l'en-tête et la barre du bas disent déjà où l'on est,
              il reste pour les lecteurs d'écran). Au bureau, il est dans l'en-tête. */}
          <div className={`adm-page-heading lg:hidden ${onglet === 'page' ? 'sr-only' : ''}`}>
            {fil && <button type="button" onClick={fil.retour} className="adm-fil-retour -ml-2 mb-1"><Icone nom="ui-chevron" taille={16} className="rotate-90" />{titre}</button>}
            <h1>{fil?.nom ?? titre}</h1>
          </div>
          {onglet === 'page' && <MaPage compte={compte} reglages={reglages} blocs={blocsAffiches} clics={clics} visiteurs={page} grand={grand}
            choisi={idOuvert} panneau={grand && editeur} onReglages={changerReglages} onOrdonner={l => ordonner(l)}
            onOuvrir={ouvrirBloc} onAjouter={ajouterBloc} liberer={libererEdition} fermerEdition={fermerEdition} gestes={{ basculer, dupliquer, supprimer }}
            envoyerImage={d => api.envoyerImage(d)} annoncer={t => setToast(t)}
            demarrage={demarrage} demarrageOuvert={demarrageOuvert} fermerDemarrage={() => setDemarrageOuvert(false)} demandeDesign={demandeDesign} designOuvert={() => setDemandeDesign(null)} />}
          {onglet === 'stats' && <OngletStats charger={chargerStats} adresse={urlPage(compte)} pseudo={compte.pseudo} joursMax={initial.paiement ? joursStats(compte.plan, droits.stats) : 365} onOffres={peutAcheter ? ouvrirOffres : undefined}
            ouvrirApps={reglages.ouvrirApps} onActiverApps={() => changerReglages({ ...reglages, ouvrirApps: true })} liste={<MaListe api={api} />} blocs={blocs} />}
          {onglet === 'reglages' && <OngletReglages reglages={reglages} compte={compte} onChange={changerReglages} onDeconnexion={deconnexion} urlExport={api.urlExport} supprimerMonCompte={api.supprimerMonCompte}
            abonnement={abonnement} onOffres={peutAcheter ? (pour?: Fonction) => ouvrirOffres(pour) : undefined} ouvrirPortail={api.ouvrirPortail} />}
          {onglet === 'comptes' && api.comptes && <OngletComptes api={api.comptes} avatar={reglages.profil.avatar} />}
          </div>
        </main>

      </div>
      </PoserFil.Provider>
      </EmplacementEntete.Provider>

      </div>

      <nav className="adm-mobile-nav fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Sections">
        <ul className={`mx-auto grid max-w-md ${onglets.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {onglets.map(o => (
            <li key={o.id}>
              <button key={o.id} type="button" onClick={() => { if (o.id !== onglet) { vibrer(5); choisirOnglet(o.id); } }} aria-current={onglet === o.id ? 'page' : undefined}
                className={`flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11.5px] font-medium transition-colors duration-200 ${onglet === o.id ? 'font-semibold text-white' : 'text-white/55'}`}>
                <span className="grid h-7 w-12 place-items-center"><Icone nom={o.icone} taille={21} /></span>{o.nom}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {apercu && (
        <div ref={fenetreApercu} className="adm-fondu fixed inset-0 z-40 flex flex-col bg-black/80 backdrop-blur-sm lg:hidden" role="dialog" aria-modal="true" aria-label="Aperçu de ta page">
          <div className="adm-apercu relative min-h-0 flex-1 overflow-y-auto"><PageLiens page={page} apercu /></div>
          {/* Sous la page, pas par-dessus : le bouton ne cache jamais le bas de la page. */}
          <div className="flex shrink-0 justify-center border-t border-white/[0.08] bg-nuit px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <button ref={fermerApercu} type="button" onClick={() => setApercu(false)} className={`${classeBouton.principal} w-full max-w-sm`}>Fermer l’aperçu</button>
          </div>
        </div>
      )}

      {/* Au téléphone, l'éditeur est une feuille du bas ; au bureau, il occupe le panneau à droite de la page (voir MaPage). */}
      {!grand && editeur}

      {/* Les offres et le retour de Creem s'ouvrent par-dessus l'écran en cours, qu'on retrouve en les fermant. */}
      {offres && (
        <FenetreOffres onFermer={() => setOffres(null)} abonnement={abonnement} enVente={initial.enVente} pour={offres.pour} vers={offres.vers} bloc={offres.bloc}
          ouvrirPaiement={api.ouvrirPaiement} avantDePartir={avantDePartir} apercu={apercuAvec} />
      )}
      {retour && (
        <RetourPaiement achat={retour.achat} etape={retour.etape} action={actionApres(retour.achat)}
          onFermer={() => { retourFerme.current = true; setRetour(null); }} />
      )}

      {bulle}
    </div>
    </FournisseurOffre>
  );
}

/** Copier, collé à l'adresse dans l'en-tête du bureau : « Copié » un instant, et l'étape « Partage ta page » se coche. */
function BoutonAdresse({ adresse }: { adresse: string }) {
  const [copie, setCopie] = useState(false);
  async function copier() {
    if (!(await copierTexte(adresse))) return;
    vibrer(8); noterPartage(); setCopie(true); setTimeout(() => setCopie(false), 1800);
  }
  return (
    <button type="button" onClick={copier} aria-label={copie ? 'Adresse copiée' : 'Copier l’adresse de ta page'} className="flex items-center gap-1.5 px-3 text-[13px] font-medium text-white">
      <Icone nom={copie ? 'ui-ok' : 'ui-copier'} taille={15} className="shrink-0" />{copie ? 'Copié' : 'Copier'}
    </button>
  );
}
