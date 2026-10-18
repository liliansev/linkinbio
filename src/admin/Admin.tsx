import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Api, Bloc, EtatAdmin, Reglages } from '../lib/types.ts';
import { TYPES_PRINCIPAL, cheminPage, urlPage } from '../lib/types.ts';
import { composerMoment } from '../lib/moments.ts';
import { PageLiens } from '../components/PageLiens.tsx';
import { MaPage } from './MaPage.tsx';
import { EditeurBloc } from './EditeurBloc.tsx';
import { OngletStats } from './OngletStats.tsx';
import { OngletReglages } from './OngletReglages.tsx';
import { OngletComptes } from './OngletComptes.tsx';
import { AccepterCgu } from './AccepterCgu.tsx';
import { PremiersPas, premiersPasFaits } from './PremiersPas.tsx';
import { pageNeuve } from '../lib/demarrage.ts';
import { Icone } from '../components/Icone.tsx';
import { vibrer } from './ui.tsx';

/*
 * Le back office. Tout s'enregistre tout seul : un bloc quand on valide sa
 * feuille, l'ordre dès qu'on lâche, l'apparence et les réglages une fraction
 * de seconde après la dernière frappe. L'aperçu à droite (ou plein écran sur
 * téléphone) est la vraie page, rendue avec l'état en cours.
 */

type Onglet = 'page' | 'stats' | 'reglages' | 'comptes';
type Sauvegarde = 'ok' | 'encours' | 'erreur';

const ONGLETS: { id: Onglet; nom: string; icone: ReactNode }[] = [
  { id: 'page', nom: 'Ma page', icone: <><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M9.5 8h5M9.5 12h5M9.5 16h3" /></> },
  { id: 'stats', nom: 'Stats', icone: <path d="M3 3v18h18M7 16l4-5 3 3 5-7" /> },
  { id: 'comptes', nom: 'Comptes', icone: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></> },
  { id: 'reglages', nom: 'Réglages', icone: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></> },
];

function Picto({ children, taille = 22 }: { children: ReactNode; taille?: number }) {
  return <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

export function Admin({ api, initial, demo = false }: { api: Api; initial: EtatAdmin; demo?: boolean }) {
  const [blocs, setBlocs] = useState(initial.blocs);
  const [reglages, setReglages] = useState(initial.reglages);
  const [clics, setClics] = useState(initial.clics);
  const [onglet, setOnglet] = useState<Onglet>('page');
  const [edition, setEdition] = useState<{ bloc: Bloc; nouveau: boolean } | null>(null);
  const [sauvegarde, setSauvegarde] = useState<Sauvegarde>('ok');
  const [toast, setToast] = useState<{ texte: string; annuler?: () => void } | null>(null);
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
      setToast({ texte: (error as Error).message?.includes('Session') ? 'Ta session a expiré. Recharge la page pour te reconnecter.' : 'Pas enregistré. Vérifie ta connexion.' });
      return undefined;
    }
  }, []);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), toast.annuler ? 5000 : 2600); return () => clearTimeout(t); }, [toast]);
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

  /** Un onglet, ouvert sur une de ses cartes. */
  function ouvrirSur(o: Onglet, ancre: string) {
    setOnglet(o);
    setTimeout(() => document.getElementById(ancre)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }
  function versAbonnement() { ouvrirSur('reglages', 'abonnement'); }

  function changerReglages(r: Reglages) {
    setReglages(r);
    clearTimeout(minuteur.current);
    setSauvegarde('encours');
    minuteur.current = setTimeout(() => { ecrire(() => api.enregistrerReglages(r)); }, 650);
  }

  function enregistrerBloc(bloc: Bloc) {
    const nouveau = !blocs.some(b => b.id === bloc.id);
    setBlocs(liste => (nouveau ? [bloc, ...liste] : liste.map(b => (b.id === bloc.id ? bloc : b))));
    setEdition(null);
    ecrire(() => api.enregistrerBloc(bloc));
    if (nouveau) setToast({ texte: 'Ajouté en haut de ta page' });
  }

  /** Plusieurs liens d'un coup (les premiers pas) : les nouveaux en tête, dans l'ordre donné ; les autres mis à jour sur place. */
  function poserBlocs(liste: Bloc[]) {
    const nouveaux = liste.filter(b => !blocs.some(x => x.id === b.id));
    setBlocs(l => [...nouveaux, ...l.map(b => liste.find(x => x.id === b.id) ?? b)]);
    // Le serveur pose chaque nouveau bloc en tête : on les envoie du dernier au premier.
    ecrire(async () => { for (const b of [...liste].reverse()) await api.enregistrerBloc(b); });
  }

  function ordonner(liste: Bloc[]) {
    setBlocs(liste);
    ecrire(() => api.ordonner(liste.map(b => b.id)));
  }

  function supprimer(bloc: Bloc) {
    const avant = blocs;
    setBlocs(liste => liste.filter(b => b.id !== bloc.id));
    setEdition(null);
    ecrire(() => api.supprimerBloc(bloc.id));
    setToast({
      texte: 'Bloc supprimé',
      annuler: () => {
        setBlocs(avant);
        setToast(null);
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
    <div role="status" className="adm-toast fixed inset-x-4 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-sm items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-[14.5px] font-medium text-nuit shadow-2xl lg:bottom-6">
      <span className="flex items-center gap-2">{!toast.annuler && sauvegarde !== 'erreur' && <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white"><Icone nom="ui-ok" taille={13} /></span>}{toast.texte}</span>
      {toast.annuler && <button type="button" onClick={toast.annuler} className="-my-1 min-h-9 rounded-full px-3 font-semibold text-[#a3461d] hover:bg-black/5">Annuler</button>}
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
    <div className="adm min-h-dvh bg-nuit font-sans text-white antialiased">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-nuit/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          {reglages.profil.avatar ? <img src={reglages.profil.avatar} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="h-9 w-9 rounded-full bg-white/10" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight">{reglages.profil.nom || 'Hopla'}</p>
            <p className={`flex items-center gap-1.5 text-[12px] leading-tight ${sauvegarde === 'erreur' ? 'text-red-300' : 'text-white/45'}`} aria-live="polite">
              <span className={`h-1.5 w-1.5 rounded-full ${sauvegarde === 'encours' ? 'animate-pulse bg-amber-300' : sauvegarde === 'erreur' ? 'bg-red-400' : 'bg-emerald-400'}`} />{indicateur}
            </p>
          </div>
          <nav className="mr-2 hidden gap-1 rounded-full bg-white/[0.05] p-1 lg:flex" aria-label="Sections">
            {onglets.map(o => (
              <button key={o.id} type="button" onClick={() => setOnglet(o.id)} aria-current={onglet === o.id ? 'page' : undefined}
                className={`min-h-9 rounded-full px-4 text-[14px] font-medium transition ${onglet === o.id ? 'bg-white text-nuit' : 'text-white/65 hover:text-white'}`}>{o.nom}</button>
            ))}
          </nav>
          <button type="button" onClick={() => setApercu(true)} className="flex min-h-10 items-center gap-1.5 rounded-full bg-white/[0.08] px-4 text-[14px] font-medium transition active:scale-95 lg:hidden">Aperçu</button>
          <a href={demo ? '#page' : cheminPage(compte)} target={demo ? undefined : '_blank'} rel="noopener" className="hidden min-h-10 items-center gap-1.5 rounded-full bg-peche px-4 text-[14px] font-semibold text-nuit transition hover:brightness-105 sm:inline-flex">Voir ma page <Icone nom="ui-fleche" taille={16} /></a>
        </div>
      </header>

      {initial.stockageEphemere && !demo && (
        <p className="mx-auto mt-3 max-w-6xl px-4"><span className="block rounded-xl bg-amber-400/15 px-3.5 py-2.5 text-[13.5px] text-amber-100">Le stockage n’est pas encore branché sur le serveur : tes changements seront perdus au prochain redémarrage.</span></p>
      )}

      <div className={`mx-auto max-w-6xl px-4 ${onglet === 'page' ? '' : 'lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10'}`}>
        <main className={`mx-auto w-full max-w-xl lg:pb-12 ${onglet === 'page' ? 'pb-48 lg:pt-5' : 'pt-5 pb-32'}`}>
          <div key={onglet} className="adm-onglet">
          <h1 className={`mb-4 text-[28px] font-semibold tracking-[-0.025em] lg:hidden ${onglet === 'page' ? 'sr-only' : ''}`}>{onglets.find(o => o.id === onglet)!.nom}</h1>
          {onglet === 'page' && <MaPage compte={compte} reglages={reglages} blocs={blocs} clics={clics} onReglages={changerReglages} onOrdonner={ordonner}
            onModifier={b => { setBlocs(l => l.map(x => (x.id === b.id ? b : x))); ecrire(() => api.enregistrerBloc(b)); }}
            onOuvrir={b => setEdition({ bloc: b, nouveau: false })} onAjouter={b => setEdition({ bloc: b, nouveau: true })} envoyerImage={d => api.envoyerImage(d)} />}
          {onglet === 'stats' && <OngletStats charger={chargerStats} limite={initial.paiement && !compte.pro} onPro={versAbonnement}
            ouvrirApps={reglages.ouvrirApps} onActiverApps={() => changerReglages({ ...reglages, ouvrirApps: true })} />}
          {onglet === 'reglages' && <OngletReglages reglages={reglages} compte={compte} onChange={changerReglages} onDeconnexion={deconnexion} urlExport={api.urlExport} supprimerMonCompte={api.supprimerMonCompte}
            abonnement={abonnement} paiement={initial.paiement} ouvrirPaiement={api.ouvrirPaiement} ouvrirPortail={api.ouvrirPortail} />}
          {onglet === 'comptes' && api.comptes && <OngletComptes api={api.comptes} />}
          </div>
        </main>

        {onglet !== 'page' && (
          <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] items-center justify-center lg:flex" aria-label="Aperçu de ta page">
            <Telephone page={page} />
          </aside>
        )}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.07] bg-[#0e1524]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Sections">
        <ul className={`mx-auto grid max-w-md ${onglets.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {onglets.map(o => (
            <li key={o.id}>
              <button type="button" onClick={() => { if (o.id !== onglet) { vibrer(5); setOnglet(o.id); scrollTo({ top: 0 }); } }} aria-current={onglet === o.id ? 'page' : undefined}
                className={`flex h-16 w-full flex-col items-center justify-center gap-1 text-[11.5px] font-medium transition-colors duration-200 active:scale-95 ${onglet === o.id ? 'text-peche' : 'text-white/50'}`}>
                <span className={`adm-nav-pastille grid h-8 place-items-center rounded-full ${onglet === o.id ? 'w-14 bg-peche/15' : 'w-10 bg-transparent'}`}><Picto>{o.icone}</Picto></span>{o.nom}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {apercu && (
        <div className="adm-fondu fixed inset-0 z-40 flex flex-col bg-black/80 backdrop-blur-sm lg:hidden" role="dialog" aria-modal="true" aria-label="Aperçu de ta page">
          <div className="adm-apercu relative min-h-0 flex-1 overflow-y-auto"><PageLiens page={page} apercu /></div>
          <button type="button" onClick={() => setApercu(false)} className="absolute bottom-[max(20px,env(safe-area-inset-bottom))] left-1/2 min-h-12 -translate-x-1/2 rounded-full bg-white px-6 text-[15px] font-semibold text-nuit shadow-2xl">Fermer l’aperçu</button>
        </div>
      )}

      {edition && (
        <EditeurBloc adressePage={urlPage(compte)} bloc={edition.bloc} reglages={reglages} nouveau={edition.nouveau} clics={clics[edition.bloc.id] ?? 0} onFermer={() => setEdition(null)}
          onEnregistrer={enregistrerBloc} onSupprimer={supprimer} onDupliquer={dupliquer} envoyerImage={d => api.envoyerImage(d)} apercuSite={u => api.apercuSite(u)} />
      )}

      {bulle}
    </div>
  );
}

function Telephone({ page }: { page: Parameters<typeof PageLiens>[0]['page'] }) {
  return (
    <div className="relative h-[min(760px,calc(100dvh-7rem))] aspect-[9/19] rounded-[44px] border border-white/10 bg-black p-2.5 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)_inset]">
      <div className="absolute top-4 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
      <div className="adm-apercu h-full overflow-y-auto overflow-x-hidden rounded-[36px] [scrollbar-width:none]"><PageLiens page={page} apercu /></div>
    </div>
  );
}
