import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Api, Bloc, EtatAdmin, Reglages } from '../lib/types.ts';
import { TYPES_PRINCIPAL, urlPage } from '../lib/types.ts';
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
import { Icone } from '../components/Icone.tsx';
import { BoutonCopier, vibrer } from './ui.tsx';

/*
 * Le back office. Tout s'enregistre tout seul : un bloc quand on valide sa
 * feuille, l'ordre dès qu'on lâche, l'apparence et les réglages une fraction
 * de seconde après la dernière frappe. L'aperçu à droite (ou plein écran sur
 * téléphone) est la vraie page, rendue avec l'état en cours.
 */

type Onglet = 'page' | 'stats' | 'reglages' | 'comptes';
type Sauvegarde = 'ok' | 'encours' | 'erreur';

// Les mêmes pictos pleins que partout ailleurs dans le back office.
const ONGLETS: { id: Onglet; nom: string; icone: string }[] = [
  { id: 'page', nom: 'Ma page', icone: 'document' },
  { id: 'stats', nom: 'Statistiques', icone: 'courbe' },
  { id: 'comptes', nom: 'Comptes', icone: 'equipe' },
  { id: 'reglages', nom: 'Réglages', icone: 'reglage' },
];

const DESCRIPTIONS: Record<Onglet, string> = {
  page: 'Un seul lien. Tout ce que tu veux partager.',
  stats: 'Comprends ce qui plaît et ce qui fait cliquer.',
  comptes: 'Les invitations et les pages de ta communauté.',
  reglages: 'Le partage, les préférences et les données de ton compte.',
};

export function Admin({ api, initial, demo = false }: { api: Api; initial: EtatAdmin; demo?: boolean }) {
  const [blocs, setBlocs] = useState(initial.blocs);
  const [reglages, setReglages] = useState(initial.reglages);
  const [clics, setClics] = useState(initial.clics);
  const [onglet, setOnglet] = useState<Onglet>('page');
  const [sectionReglage, setSectionReglage] = useState<'abonnement' | undefined>();
  const [edition, setEdition] = useState<{ bloc: Bloc; nouveau: boolean; enBas?: boolean; traduire?: boolean } | null>(null);
  const [sauvegarde, setSauvegarde] = useState<Sauvegarde>('ok');
  const [toast, setToast] = useState<{ texte: string; annuler?: () => void; action?: string; genre?: 'ok' | 'info'; long?: boolean } | null>(null);
  // Le doigt ou le focus sur le message le garde affiché : « Annuler » ne file pas pendant qu'on le vise.
  const [toastTenu, setToastTenu] = useState(false);
  const [apercu, setApercu] = useState(false);
  const [cguAJour, setCguAJour] = useState(initial.cguAJour);
  const [abonnement, setAbonnement] = useState({ ...initial.abonnement, pro: initial.compte.pro });
  // Un compte neuf arrive sur ses premiers pas, une seule fois, et seulement tant que sa page est vide.
  const [premiersPas, setPremiersPas] = useState(() => !initial.compte.principal && pageNeuve(initial.reglages, initial.blocs));
  // Remis à plus tard sur cet appareil : lu après l'hydratation, le serveur n'en sait rien.
  useEffect(() => { if (premiersPasFaits()) setPremiersPas(false); }, []);
  const enCours = useRef(0);
  const compte = useMemo(() => ({ ...initial.compte, pro: abonnement.pro }), [initial.compte, abonnement.pro]);
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
      // Un échec se rejoue d'un toucher : la même écriture repart.
      setToast((error as Error).message?.includes('Session')
        ? { texte: 'Ta session a expiré. Recharge la page pour te reconnecter.' }
        : { texte: 'Pas enregistré. Vérifie ta connexion.', action: 'Réessayer', annuler: () => { setToast(null); void ecrireRef.current(action); } });
      return undefined;
    }
  }, []);

  const ecrireRef = useRef(ecrire);
  ecrireRef.current = ecrire;
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

  // Au retour de la page de paiement : le Pro arrive par webhook, quelques secondes plus tard.
  useEffect(() => {
    if (demo || !new URLSearchParams(location.search).has('paiement')) return;
    history.replaceState(null, '', location.pathname);
    versAbonnement();
    setToast({ texte: 'Merci ! Ton passage en Pro arrive dans un instant.' });
    let essais = 0;
    const t = setInterval(async () => {
      essais++;
      try {
        const e = await api.charger();
        if (e.compte.pro || essais >= 15) {
          clearInterval(t);
          setAbonnement({ ...e.abonnement, pro: e.compte.pro });
          if (e.compte.pro) setToast({ texte: 'Bienvenue en Pro' });
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

  const page = useMemo(() => { const maintenant = Date.now(); return { reglages, blocs: composerMoment(blocs.filter(b => compte.principal || !TYPES_PRINCIPAL.includes(b.type)), maintenant), compte, maintenant }; }, [reglages, blocs, compte]);
  const chargerStats = useCallback((jours: number) => api.stats(jours).then(s => { if (jours === 30) setClics(Object.fromEntries(s.blocs.map(b => [b.id, b.clics]))); return s; }), [api]);

  if (!cguAJour) return <AccepterCgu accepter={async () => { await api.accepterCgu(); setCguAJour(true); }} deconnexion={deconnexion} />;

  const bulle = toast && (
    <div role="status" onPointerEnter={() => setToastTenu(true)} onPointerLeave={() => setToastTenu(false)} onFocus={() => setToastTenu(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setToastTenu(false); }} className="adm-toast fixed inset-x-4 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-sm items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-[14.5px] font-medium text-nuit shadow-2xl lg:bottom-6">
      <span className="flex items-center gap-2">{/* La coche verte confirme ; une simple information n'en a pas. */}{!toast.annuler && toast.genre !== 'info' && sauvegarde !== 'erreur' && <span className="text-emerald-400" aria-hidden="true"><Icone nom="ui-ok" taille={18} /></span>}{toast.texte}</span>
      {toast.annuler && <button ref={actionToast} type="button" onClick={toast.annuler} className="-my-2 min-h-11 rounded-full px-3 font-semibold text-nuit underline decoration-nuit/30 underline-offset-4 hover:bg-nuit/10">{toast.action ?? 'Annuler'}</button>}
    </div>
  );

  if (premiersPas) {
    return (
      <>
        <PremiersPas compte={compte} reglages={reglages} blocs={blocs} onReglages={changerReglages} onPoserBlocs={poserBlocs}
          envoyerImage={d => api.envoyerImage(d)} apercuSite={u => api.apercuSite(u)} onFin={() => { setPremiersPas(false); setOnglet('page'); scrollTo({ top: 0 }); }} />
        {bulle}
      </>
    );
  }

  const indicateur = sauvegarde === 'encours' ? 'Enregistrement…' : sauvegarde === 'erreur' ? 'Non enregistré' : 'Enregistré';

  return (
    <div className="adm adm-shell min-h-dvh font-sans text-white antialiased">
      {/* Sur ordinateur, une barre latérale comme dans tout SaaS : la marque, les sections, l'état de l'enregistrement, la page en ligne. */}
      <aside className="adm-sidebar fixed inset-y-0 left-0 z-30 hidden w-60 flex-col lg:flex" aria-label="Navigation">
        <div className="flex items-center gap-3 px-3 pb-9 pt-2">
          <svg viewBox="0 0 256 256" className="h-7 w-7" aria-hidden="true"><rect width="256" height="256" rx="64" fill="#0a0a0a" /><g fill="#ffffff" transform="translate(40 40) scale(0.6875)"><path d="M165.66,90.34a8,8,0,0,1,0,11.32l-64,64a8,8,0,0,1-11.32-11.32l64-64A8,8,0,0,1,165.66,90.34ZM215.6,40.4a56,56,0,0,0-79.2,0L106.34,70.45a8,8,0,0,0,11.32,11.32l30.06-30a40,40,0,0,1,56.57,56.56l-30.07,30.06a8,8,0,0,0,11.31,11.32L215.6,119.6a56,56,0,0,0,0-79.2ZM138.34,174.22l-30.06,30.06a40,40,0,1,1-56.56-56.57l30.05-30.05a8,8,0,0,0-11.32-11.32L40.4,136.4a56,56,0,0,0,79.2,79.2l30.06-30.07a8,8,0,0,0-11.32-11.31Z" /></g></svg>
          <span className="text-[23px] font-semibold tracking-[-0.035em]">Hopla<span className="text-white/40">.</span></span>
        </div>
        <nav className="flex flex-col gap-1.5" aria-label="Sections">
          {onglets.map(o => (
            <button key={o.id} type="button" onClick={() => { if (o.id !== onglet) choisirOnglet(o.id); }} aria-current={onglet === o.id ? 'page' : undefined}
              className="adm-nav-item">
              <Icone nom={o.icone} taille={20} />{o.nom}
              {o.id === 'page' && <span className="adm-nav-count">{blocs.length}</span>}
            </button>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          {/* L'adresse de la page vit en tête de Ma page, avec Copier : pas une deuxième fois ici. */}
          <p className="px-3 text-[12px] leading-relaxed text-white/55">Un petit espace pour<br />tout ton univers.</p>
          <div className="flex items-center gap-3 border-t border-white/[0.08] px-2 pt-5">
            {reglages.profil.avatar ? <img src={reglages.profil.avatar} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.06]"><Icone nom="utilisateur" taille={20} /></span>}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium leading-tight">{reglages.profil.nom || 'Hopla'}</p>
              <p className="mt-1 text-[11.5px] text-white/55">{compte.principal ? 'Compte principal' : compte.pro ? 'Hopla Pro' : 'Hopla Gratuit'}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-60">
      <header className="adm-topbar sticky top-0 z-30">
        <div className="mx-auto flex min-h-[72px] max-w-[1120px] items-center gap-3 px-4 lg:min-h-20 lg:px-8">
          <div className="hidden flex-1 items-center gap-2 text-[13px] lg:flex"><span className="text-white/55">Mon espace</span><Icone nom="ui-chevron" taille={12} className="-rotate-90 text-white/40" /><span className="font-medium">{onglets.find(o => o.id === onglet)!.nom}</span></div>
          {reglages.profil.avatar ? <img src={reglages.profil.avatar} alt="" className="h-9 w-9 rounded-full object-cover lg:hidden" /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06] lg:hidden"><Icone nom="utilisateur" taille={18} /></span>}
          <div className="min-w-0 flex-1 lg:hidden">
            {/* Sur téléphone, l'en-tête porte l'adresse de la page : la copier ne prend plus une ligne au-dessus de la page. */}
            <p className="truncate text-[15px] font-semibold leading-tight" translate="no">{urlPage(compte).replace(/^https?:\/\//, '')}</p>
            <p className={`flex items-center gap-1.5 text-[12px] leading-tight ${sauvegarde === 'erreur' ? 'text-red-300' : 'text-white/55'}`} aria-live="polite">
              <span className={`h-1.5 w-1.5 rounded-full ${sauvegarde === 'encours' ? 'animate-pulse bg-amber-300 motion-reduce:animate-none' : sauvegarde === 'erreur' ? 'bg-red-400' : 'bg-white/60'}`} />{indicateur}
            </p>
          </div>
          <p className={`mr-2 hidden items-center gap-1.5 text-[12px] lg:flex ${sauvegarde === 'erreur' ? 'text-red-300' : 'text-white/55'}`} role="status"><Icone nom={sauvegarde === 'ok' ? 'ui-ok' : sauvegarde === 'erreur' ? 'cloche' : 'horloge'} taille={15} />{indicateur}</p>
          <span className="lg:hidden"><BoutonCopier compact texte={urlPage(compte)} label="Copier l’adresse de ta page" onCopie={() => { try { localStorage.setItem('hopla-page-partagee', '1'); } catch { /* stockage refusé */ } }} /></span>
          <button type="button" onClick={() => setApercu(true)} className="adm-button-outline flex min-h-11 items-center gap-1.5 px-3.5 text-[13px] font-medium lg:hidden"><Icone nom="oeil" taille={17} />Aperçu</button>
          <a href={demo ? '#page' : urlPage(compte)} target={demo ? undefined : '_blank'} rel={demo ? undefined : 'noopener'} className="adm-button-outline hidden min-h-11 items-center gap-2 px-4 text-[13px] font-medium lg:flex">Voir ma page<Icone nom="ui-ouvrir" taille={15} /></a>
        </div>
      </header>

      {initial.stockageEphemere && !demo && (
        <p className="mx-auto mt-3 max-w-6xl px-4"><span className="block rounded-xl bg-amber-400/15 px-3.5 py-2.5 text-[13.5px] text-amber-100">Le stockage n’est pas encore branché sur le serveur : tes changements seront perdus au prochain redémarrage.</span></p>
      )}

      <div className="mx-auto max-w-[1120px] px-4 lg:px-8">
        <main id="contenu-admin" className="mx-auto w-full pb-28 pt-6 lg:pb-12 lg:pt-9">
          <div key={onglet} className="adm-onglet">
          <div className="adm-page-heading">
            <h1>{onglets.find(o => o.id === onglet)!.nom}</h1>
            <p>{DESCRIPTIONS[onglet]}</p>
          </div>
          {onglet === 'page' && <MaPage compte={compte} reglages={reglages} blocs={blocs} clics={clics} onReglages={changerReglages} onOrdonner={ordonner}
            onOuvrir={b => setEdition({ bloc: b, nouveau: false })} onAjouter={(b, enBas) => setEdition({ bloc: b, nouveau: true, enBas })} envoyerImage={d => api.envoyerImage(d)} annoncer={t => setToast(t)} />}
          {onglet === 'stats' && <OngletStats charger={chargerStats} limite={initial.paiement && !compte.pro} onPro={versAbonnement}
            ouvrirApps={reglages.ouvrirApps} onActiverApps={() => changerReglages({ ...reglages, ouvrirApps: true })} liste={<MaListe api={api} />} />}
          {onglet === 'reglages' && <OngletReglages reglages={reglages} compte={compte} blocs={blocs} traduire={b => setEdition({ bloc: b, nouveau: false, traduire: true })} onChange={changerReglages} onDeconnexion={deconnexion} urlExport={api.urlExport} supprimerMonCompte={api.supprimerMonCompte}
            abonnement={abonnement} paiement={initial.paiement} ouvrirPaiement={api.ouvrirPaiement} ouvrirPortail={api.ouvrirPortail} sectionInitiale={sectionReglage} />}
          {onglet === 'comptes' && api.comptes && <OngletComptes api={api.comptes} />}
          </div>
        </main>

      </div>

      </div>

      <nav className="adm-mobile-nav fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Sections">
        <ul className={`mx-auto grid max-w-md ${onglets.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {onglets.map(o => (
            <li key={o.id}>
              <button key={o.id} type="button" onClick={() => { if (o.id !== onglet) { vibrer(5); choisirOnglet(o.id); } }} aria-current={onglet === o.id ? 'page' : undefined}
                className={`flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors duration-200 ${onglet === o.id ? 'font-semibold text-white' : 'text-white/55'}`}>
                <span className="adm-nav-pastille grid h-7 w-12 place-items-center rounded-full"><Icone nom={o.icone} taille={21} /></span>{o.id === 'stats' ? 'Stats' : o.nom}
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
            <button ref={fermerApercu} type="button" onClick={() => setApercu(false)} className="min-h-12 rounded-full bg-white px-6 text-[15px] font-semibold text-nuit">Fermer l’aperçu</button>
          </div>
        </div>
      )}

      {edition && (
        <EditeurBloc adressePage={urlPage(compte)} principal={compte.principal} bloc={edition.bloc} reglages={reglages} nouveau={edition.nouveau} clics={clics[edition.bloc.id] ?? 0} prises={initial.places?.[edition.bloc.id] ?? 0} onFermer={() => setEdition(null)}
          onEnregistrer={enregistrerBloc} onSupprimer={supprimer} onDupliquer={dupliquer} onDeplacer={deplacer} traduire={edition.traduire} place={{ rang: blocs.findIndex(b => b.id === edition.bloc.id), total: blocs.length }} envoyerImage={d => api.envoyerImage(d)} apercuSite={u => api.apercuSite(u)} />
      )}

      {bulle}
    </div>
  );
}
