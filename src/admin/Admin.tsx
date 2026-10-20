import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Api, Bloc, EtatAdmin, Reglages } from '../lib/types.ts';
import { TYPES_PRINCIPAL, nouveauBloc, urlPage } from '../lib/types.ts';
import { composerMoment } from '../lib/moments.ts';
import { PageLiens } from '../components/PageLiens.tsx';
import { MaPage } from './MaPage.tsx';
import { EditeurBloc } from './EditeurBloc.tsx';
import { OngletStats } from './OngletStats.tsx';
import { MaListe } from './MaListe.tsx';
import { OngletReglages } from './OngletReglages.tsx';
import { OngletComptes } from './OngletComptes.tsx';
import { AccepterCgu } from './AccepterCgu.tsx';
import { PremiersPas, premiersPasFaits } from './PremiersPas.tsx';
import { pageNeuve } from '../lib/demarrage.ts';
import { sansSchema } from '../lib/types.ts';
import { Icone } from '../components/Icone.tsx';
import { BoutonCopier, EmplacementEntete, Menu, classeBouton, copierTexte, vibrer } from './ui.tsx';
import { Marque } from './Marque.tsx';
import { AnneauDemarrage, noterPartage, useDemarrage } from './BienDemarrer.tsx';
import { FournisseurOffre } from './offre.tsx';
import { OFFRES, estPlanPayant, joursStats } from '../lib/abonnement.ts';
import { REFUS_PROGRAMMATION, nouvellesDates, selonDroits } from '../lib/droits.ts';

/*
 * Le back office. Tout s'enregistre tout seul : un bloc quand on valide sa
 * feuille, l'ordre dès qu'on lâche, l'apparence et les réglages une fraction
 * de seconde après la dernière frappe. L'aperçu à droite (ou plein écran sur
 * téléphone) est la vraie page, rendue avec l'état en cours.
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

export function Admin({ api, initial, demo = false }: { api: Api; initial: EtatAdmin; demo?: boolean }) {
  const [blocs, setBlocs] = useState(initial.blocs);
  const [reglages, setReglages] = useState(initial.reglages);
  const [clics, setClics] = useState(initial.clics);
  const [onglet, setOnglet] = useState<Onglet>('page');
  const [sectionReglage, setSectionReglage] = useState<'abonnement' | undefined>();
  const [edition, setEdition] = useState<{ bloc: Bloc; nouveau: boolean; enBas?: boolean } | null>(null);
  const [sauvegarde, setSauvegarde] = useState<Sauvegarde>('ok');
  const [toast, setToast] = useState<{ texte: string; annuler?: () => void; action?: string; genre?: 'ok' | 'info'; long?: boolean } | null>(null);
  // Le doigt ou le focus sur le message le garde affiché : « Annuler » ne file pas pendant qu'on le vise.
  const [toastTenu, setToastTenu] = useState(false);
  const [apercu, setApercu] = useState(false);
  // L'endroit de l'en-tête du bureau où l'onglet ouvert pose son geste (voir `ActionEntete`).
  const [emplacement, setEmplacement] = useState<HTMLDivElement | null>(null);
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
  // Le chemin vers les offres, pour un refus du serveur (absent quand le compte ne peut pas s'abonner) : la feuille d'un bloc encore ouverte se ferme.
  const versOffres = useRef<(() => void) | undefined>(undefined);
  versOffres.current = initial.paiement ? () => { setEdition(null); versAbonnement(); } : undefined;
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

  // Au retour de la page de paiement (ou d'un changement d'offre) : l'offre arrive par webhook, quelques secondes plus tard.
  useEffect(() => {
    const voulue = new URLSearchParams(location.search).get('paiement');
    if (demo || voulue === null) return;
    history.replaceState(null, '', location.pathname);
    versAbonnement();
    const plan = estPlanPayant(voulue) ? voulue : 'pro';
    setToast({ texte: `Merci ! Ton offre ${OFFRES[plan].nom} arrive dans un instant.` });
    let essais = 0;
    const t = setInterval(async () => {
      essais++;
      try {
        const e = await api.charger();
        const arrivee = e.abonnement.plan === plan;
        if (arrivee || essais >= 15) {
          clearInterval(t);
          setAbonnement(e.abonnement);
          setDroits(e.droits);
          if (arrivee) setToast({ texte: `Bienvenue en ${OFFRES[plan].nom}` });
        }
      } catch { if (essais >= 15) clearInterval(t); }
    }, 2000);
    return () => clearInterval(t);
  }, [api, demo]);

  function choisirOnglet(o: Onglet) {
    setSectionReglage(undefined);
    setOnglet(o);
    scrollTo({ top: 0 });
  }
  function versAbonnement() { setSectionReglage('abonnement'); setOnglet('reglages'); scrollTo({ top: 0 }); }

  function changerReglages(r: Reglages) {
    setReglages(r);
    clearTimeout(minuteur.current);
    setSauvegarde('encours');
    minuteur.current = setTimeout(() => { ecrire(() => api.enregistrerReglages(r)); }, 650);
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

  function enregistrerBloc(bloc: Bloc) {
    const nouveau = !blocs.some(b => b.id === bloc.id);
    const enBas = nouveau && !!edition?.enBas;
    const liste = nouveau ? (enBas ? [...blocs, bloc] : [bloc, ...blocs]) : blocs.map(b => (b.id === bloc.id ? bloc : b));
    setBlocs(liste);
    setEdition(null);
    // Le serveur pose un bloc neuf en tête : ajouté par le bas, il est rangé à la fin juste après.
    ecrire(async () => { await api.enregistrerBloc(bloc); if (enBas) await api.ordonner(liste.map(b => b.id)); });
    if (nouveau) {
      const avant = blocs;
      setToast({ texte: enBas ? 'Ajouté en bas de ta page' : 'Ajouté en haut de ta page', annuler: () => { setBlocs(avant); setToast({ texte: 'Ajout annulé', genre: 'info' }); ecrire(() => api.supprimerBloc(bloc.id)); } });
      montrer(bloc.id);
    } else {
      // Une modification se défait aussi, le temps du message : le bloc revient tel qu'il était.
      const ancien = blocs.find(b => b.id === bloc.id);
      if (ancien && JSON.stringify(ancien) !== JSON.stringify(bloc)) setToast({ texte: 'Modifications enregistrées', annuler: () => {
        setBlocs(l => l.map(b => (b.id === ancien.id ? ancien : b))); setToast({ texte: 'Changements annulés', genre: 'info' }); ecrire(() => api.enregistrerBloc(ancien));
      } });
    }
  }

  /** Plusieurs liens d'un coup (les premiers pas) : les nouveaux en tête, dans l'ordre donné ; les autres mis à jour sur place. */
  function poserBlocs(liste: Bloc[]) {
    const nouveaux = liste.filter(b => !blocs.some(x => x.id === b.id));
    setBlocs(l => [...nouveaux, ...l.map(b => liste.find(x => x.id === b.id) ?? b)]);
    // Le serveur pose chaque nouveau bloc en tête : on les envoie du dernier au premier.
    ecrire(async () => { for (const b of [...liste].reverse()) await api.enregistrerBloc(b); });
  }

  function ordonner(liste: Bloc[], texte = 'Bloc déplacé') {
    const avant = blocs;
    setBlocs(liste);
    ecrire(() => api.ordonner(liste.map(b => b.id)));
    setToast({ texte, annuler: () => { setBlocs(avant); setToast({ texte: 'Remis à sa place', genre: 'info' }); ecrire(() => api.ordonner(avant.map(b => b.id))); } });
  }

  /** Un cran plus haut ou plus bas, depuis la feuille du bloc : l'ordre se règle aussi sans glisser. */
  function deplacer(bloc: Bloc, sens: -1 | 1) {
    const i = blocs.findIndex(b => b.id === bloc.id);
    const j = i + sens;
    if (i < 0 || j < 0 || j >= blocs.length) return;
    const liste = [...blocs];
    [liste[i], liste[j]] = [liste[j], liste[i]];
    // Le déplacement s'enregistre tout de suite, à part des réglages de la feuille : le message le dit.
    ordonner(liste, sens < 0 ? 'Bloc monté d’un cran' : 'Bloc descendu d’un cran');
  }

  function supprimer(bloc: Bloc) {
    const avant = blocs;
    setBlocs(liste => liste.filter(b => b.id !== bloc.id));
    setEdition(null);
    ecrire(() => api.supprimerBloc(bloc.id));
    setToast({
      texte: 'Retiré de ta page',
      // Retirer ne demande pas de confirmation : l'annulation reste offerte plus longtemps.
      long: true,
      annuler: () => {
        setBlocs(avant);
        setToast({ texte: 'Remis sur ta page', genre: 'info' });
        ecrire(async () => { await api.enregistrerBloc(bloc); await api.ordonner(avant.map(b => b.id)); });
      },
    });
  }

  function dupliquer(bloc: Bloc) {
    const copie = { ...bloc, id: `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, titre: bloc.titre ? `${bloc.titre} (copie)` : '' };
    // Sans Starter, une copie ne reprend pas des dates : le serveur la refuserait. Rien n'est créé, le message le dit tout de suite.
    if (!droits.programmation && nouvellesDates(undefined, copie)) { setToast(refusProgrammation()); return; }
    const i = blocs.findIndex(b => b.id === bloc.id);
    const liste = [...blocs.slice(0, i + 1), copie, ...blocs.slice(i + 1)];
    setBlocs(liste);
    setEdition({ bloc: copie, nouveau: false });
    montrer(copie.id);
    ecrire(async () => { await api.enregistrerBloc(copie); await api.ordonner(liste.map(b => b.id)); });
  }

  async function deconnexion() {
    await api.deconnexion();
    location.reload();
  }

  // L'aperçu plein écran est la page telle que les visiteurs la voient : ce que l'offre ne comprend pas s'en efface, comme sur le serveur.
  const page = useMemo(() => {
    const maintenant = Date.now();
    const permis = selonDroits(reglages, blocs.filter(b => compte.principal || !TYPES_PRINCIPAL.includes(b.type)), droits);
    return { reglages: permis.reglages, blocs: composerMoment(permis.blocs, maintenant), compte, maintenant };
  }, [reglages, blocs, compte, droits]);
  const chargerStats = useCallback((jours: number) => api.stats(jours).then(s => { if (jours === 30) setClics(Object.fromEntries(s.blocs.map(b => [b.id, b.clics]))); return s; }), [api]);
  const demarrage = useDemarrage(reglages, blocs);
  useEffect(() => { if (!demarrage.actif) setDemarrageOuvert(false); }, [demarrage.actif]);

  if (!cguAJour) return <AccepterCgu accepter={async () => { await api.accepterCgu(); setCguAJour(true); }} deconnexion={deconnexion} />;

  const bulle = toast && (
    <div role="status" onPointerEnter={() => setToastTenu(true)} onPointerLeave={() => setToastTenu(false)} onFocus={() => setToastTenu(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setToastTenu(false); }} className={`adm-toast fixed inset-x-4 ${onglet === 'page' && !premiersPas ? 'bottom-[calc(134px+env(safe-area-inset-bottom))]' : 'bottom-[calc(76px+env(safe-area-inset-bottom))]'} z-[60] mx-auto flex max-w-sm items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-[14.5px] font-medium text-nuit shadow-2xl lg:bottom-6`}>
      <span className="flex items-center gap-2">{/* La coche confirme ; une simple information n'en a pas. */}{!toast.annuler && toast.genre !== 'info' && sauvegarde !== 'erreur' && <span aria-hidden="true"><Icone nom="ui-ok" taille={18} /></span>}{toast.texte}</span>
      {toast.annuler && <button ref={actionToast} type="button" onClick={toast.annuler} className="-my-2 min-h-11 rounded-lg px-3 font-semibold text-nuit underline decoration-nuit/30 underline-offset-4 hover:bg-nuit/10">{toast.action ?? 'Annuler'}</button>}
    </div>
  );

  const offre = { droits, voirOffres: initial.paiement ? versAbonnement : undefined };

  if (premiersPas) {
    return (
      <FournisseurOffre value={offre}>
        <PremiersPas compte={compte} reglages={reglages} blocs={blocs} onReglages={changerReglages} onPoserBlocs={poserBlocs}
          envoyerImage={d => api.envoyerImage(d)} apercuSite={u => api.apercuSite(u)} onFin={suite => {
            setPremiersPas(false); setOnglet('page'); scrollTo({ top: 0 });
            // « Ajouter mon premier lien » : l'éditeur s'ouvre déjà sur un lien neuf.
            if (suite === 'lien') setEdition({ bloc: nouveauBloc('lien', `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`), nouveau: true });
          }} />
        {bulle}
      </FournisseurOffre>
    );
  }

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
            <button key={o.id} type="button" onClick={() => { if (o.id !== onglet) choisirOnglet(o.id); }} aria-current={onglet === o.id ? 'page' : undefined}
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
          <h1 className="adm-entete-titre min-w-0 flex-1 truncate">{titre}</h1>
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
      <div className="mx-auto max-w-[1120px] px-4 lg:max-w-none lg:px-10">
        <main id="contenu-admin" className={`mx-auto w-full pb-28 lg:pb-12 lg:pt-7 ${onglet === 'page' ? 'pt-4' : 'pt-6'}`}>
          <div key={onglet} className="adm-onglet">
          {/* Au téléphone, le titre de l'écran ouvre le contenu (Ma page n'affiche pas le sien : l'en-tête et la barre du bas disent déjà où l'on est,
              il reste pour les lecteurs d'écran). Au bureau, il est dans l'en-tête. */}
          <div className={`adm-page-heading lg:hidden ${onglet === 'page' ? 'sr-only' : ''}`}>
            <h1>{titre}</h1>
          </div>
          {onglet === 'page' && <MaPage compte={compte} reglages={reglages} blocs={blocs} clics={clics} onReglages={changerReglages} onOrdonner={ordonner}
            onOuvrir={b => setEdition({ bloc: b, nouveau: false })} onAjouter={(b, enBas) => setEdition({ bloc: b, nouveau: true, enBas })} envoyerImage={d => api.envoyerImage(d)} annoncer={t => setToast(t)}
            demarrage={demarrageOuvert} fermerDemarrage={() => setDemarrageOuvert(false)} />}
          {onglet === 'stats' && <OngletStats charger={chargerStats} adresse={urlPage(compte)} pseudo={compte.pseudo} joursMax={initial.paiement ? joursStats(compte.plan, droits.stats) : 365} onOffres={initial.paiement ? versAbonnement : undefined}
            ouvrirApps={reglages.ouvrirApps} onActiverApps={() => changerReglages({ ...reglages, ouvrirApps: true })} liste={<MaListe api={api} />} />}
          {onglet === 'reglages' && <OngletReglages reglages={reglages} compte={compte} onChange={changerReglages} onDeconnexion={deconnexion} urlExport={api.urlExport} supprimerMonCompte={api.supprimerMonCompte}
            abonnement={abonnement} paiement={initial.paiement} enVente={initial.enVente} ouvrirPaiement={api.ouvrirPaiement} ouvrirPortail={api.ouvrirPortail} sectionInitiale={sectionReglage} />}
          {onglet === 'comptes' && api.comptes && <OngletComptes api={api.comptes} />}
          </div>
        </main>

      </div>
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

      {edition && (
        <EditeurBloc adressePage={urlPage(compte)} principal={compte.principal} bloc={edition.bloc} reglages={reglages} nouveau={edition.nouveau} clics={clics[edition.bloc.id] ?? 0} prises={initial.places?.[edition.bloc.id] ?? 0} onFermer={() => setEdition(null)}
          onEnregistrer={enregistrerBloc} onSupprimer={supprimer} onDupliquer={dupliquer} onDeplacer={deplacer} place={{ rang: blocs.findIndex(b => b.id === edition.bloc.id), total: blocs.length }} envoyerImage={d => api.envoyerImage(d)} apercuSite={u => api.apercuSite(u)} />
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
