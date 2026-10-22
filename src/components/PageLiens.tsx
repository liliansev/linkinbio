import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, MouseEvent, ReactNode } from 'react';
import type { Bloc, PagePublique } from '../lib/types.ts';
import { ORIGINE_PUBLIQUE, animationDe, formatVedette, idYoutube, urlPage } from '../lib/types.ts';
import type { Reglages } from '../lib/types.ts';
import { themeDe, variablesTheme } from '../lib/themes.ts';
import { ICONES } from '../lib/icones.ts';
import { lienApp, navigateurIntegre } from '../lib/ouvrirApp.ts';
import { minuteDe, suiteRecente } from '../lib/sortie.ts';
import type { Sortie } from '../lib/sortie.ts';
import { enAttente } from '../lib/moments.ts';
import { etatPlaces } from '../lib/acces.ts';
import { adresseSaisie } from '../lib/valider.ts';
import { jetonTurnstile, preparerTurnstile } from '../lib/turnstile.ts';
import { LOCALE, textes } from '../lib/mots.ts';
import type { Textes } from '../lib/mots.ts';
import { Icone, NOMS_RESEAUX } from './Icone.tsx';
import { peut } from '../lib/abonnement.ts';
import { adresseIntegree, avecMontants, lienMontant, lienSansMontant, nomAgenda, nomSoutien, seIntegre } from '../lib/vitrine.ts';

/*
 * La page publique, rendue côté serveur pour Google et les aperçus de liens,
 * et réutilisée telle quelle dans l'aperçu du back office (`apercu`). Le thème
 * pose ses couleurs en variables CSS ; le style et la forme des boutons sont
 * deux attributs que `page.css` lit.
 */

/**
 * Ce que la page offre à ses blocs : la bulle (« Code copié »), et la feuille où
 * s'ouvre une réservation. Hors de la page (l'aperçu collé de l'éditeur), rien :
 * une réservation s'y ouvre comme un lien.
 */
const ActionsPage = createContext<{ annoncer: (texte: string) => void; reserver?: (bloc: Bloc, depuis: HTMLElement) => void }>({ annoncer: () => {} });

function suivre(page: string, type: 'vue' | 'clic', bloc?: string, app = false) {
  try {
    const params = new URLSearchParams(location.search);
    const corps = JSON.stringify({ page, type, bloc, app, utm: params.get('utm_source') ?? params.get('s') ?? '', referent: document.referrer });
    const blob = new Blob([corps], { type: 'text/plain' });
    if (!navigator.sendBeacon?.('/api/evenement', blob)) fetch('/api/evenement', { method: 'POST', body: corps, keepalive: true }).catch(() => {});
  } catch { /* les statistiques ne doivent jamais gêner la visite */ }
}

/**
 * L'édition sur la page, dans « Ma page » du back office : le nom et la bio se
 * tapent en place, la photo, les réseaux et chaque bloc s'ouvrent d'un toucher.
 * La liste des blocs est confiée au back office (`liste`), qui y ajoute le
 * glisser-déposer sans l'embarquer dans la page publique.
 */
export interface Edition {
  profil: (champs: Partial<Reglages['profil']>) => void;
  /** Choisir une photo ; `source`, l'avatar touché, d'où naît le menu du téléphone. */
  photo: (source: Element) => void;
  envoiPhoto: boolean;
  reseaux: () => void;
  liste: (blocs: Bloc[], rendu: (bloc: Bloc) => ReactNode) => ReactNode;
  /** Le nom vidé puis quitté : il revient tel qu'il était, et le back office le dit. */
  nomVide?: () => void;
  /** Le nom ou la bio changés puis quittés : le back office propose de revenir à la valeur d'avant. */
  modifie?: (champ: 'nom' | 'bio', avant: string) => void;
}

export function PageLiens({ page, apercu = false, edition, liste }: {
  page: PagePublique;
  apercu?: boolean;
  edition?: Edition;
  /** L'aperçu du bureau : les blocs passent par le back office (cerclés, grisés, cliquables) ; le reste de la page est figé. */
  liste?: Edition['liste'];
}) {
  if (edition || liste) apercu = true;
  const { reglages, blocs, compte } = page;
  const Nom = apercu ? 'h2' : 'h1';
  // La page de Lilian s'annonce sans pseudo ; les autres avec le leur.
  const pseudo = compte.principal ? '' : compte.pseudo;
  const theme = themeDe(reglages);
  const t = textes(reglages.vouvoiement);
  const [toast, setToast] = useState('');
  // Dans le navigateur intégré d'une app qui laisse sortir, une feuille propose Safari ou Chrome par-dessus la page (lib/sortie.ts).
  const [ecran, setEcran] = useState(!!page.sortie);
  // Après la feuille, le nom de la page reçoit le focus ; il le garde quand la page se recharge sans elle.
  const [apresEcran] = useState(ecran);
  const nomRef = useRef<HTMLHeadingElement>(null);
  // La réservation ouverte dans sa feuille, et ce qui avait le focus avant elle, pour l'y rendre.
  const [agenda, setAgenda] = useState<Bloc | null>(null);
  const avantAgenda = useRef<HTMLElement | null>(null);
  const actions = useMemo(() => ({
    annoncer: setToast,
    // Le focus revient au lien touché : Safari ne le lui donne pas au toucher.
    reserver: apercu ? undefined : (bloc: Bloc, depuis: HTMLElement) => { avantAgenda.current = depuis; setAgenda(bloc); },
  }), [apercu]);

  useEffect(() => {
    if (apercu) return;
    const params = new URLSearchParams(location.search);
    const suite = params.get('suite');
    if (suite !== null) {
      // Hors de l'app, le repère n'a plus d'usage : l'adresse redevient celle qu'on partage.
      if (!navigateurIntegre(navigator.userAgent)) {
        params.delete('suite');
        const reste = params.toString();
        history.replaceState(history.state, '', `${location.pathname}${reste ? `?${reste}` : ''}${location.hash}`);
      }
      // Passée par l'écran il y a un instant (rouverte dans le navigateur, ou « Continuer ici ») : la visite est déjà comptée.
      if (suiteRecente(suite, page.maintenant ?? Date.now())) return;
    }
    suivre(pseudo, 'vue');
  }, [apercu, pseudo]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2200); return () => clearTimeout(t); }, [toast]);

  const clic = (bloc: Bloc) => {
    if (apercu) return;
    // Le clic part avant la redirection vers l'app (`ouvrirDansApp`, plus haut dans la page) : on note s'il l'ouvrira.
    suivre(pseudo, 'clic', bloc.id, reglages.ouvrirApps && !!bloc.url && !!lienApp(bloc.url, navigator.userAgent));
  };
  const cible = apercu ? { target: '_blank' } : {};
  // Dans l'aperçu du bureau, seuls les blocs répondent : l'en-tête, les réseaux et la signature ne mènent nulle part.
  const fige = liste && !edition ? { inert: true } : {};

  // Depuis le navigateur intégré d'Instagram, TikTok…, un lien vers une app connue s'ouvre dans l'app (voir lib/ouvrirApp.ts).
  function ouvrirDansApp(e: MouseEvent<HTMLDivElement>) {
    if (apercu || !reglages.ouvrirApps || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
    const app = a && lienApp(a.href, navigator.userAgent);
    if (!a || !app) return;
    e.preventDefault();
    location.href = app.adresse;
    // iOS ne dit pas si l'app existe : si la page est encore là, on ouvre le site.
    if (app.repli) setTimeout(() => { if (!document.hidden) location.href = a.href; }, 1500);
  }

  function continuerIci() {
    setEcran(false);
    // Un retour ou un rechargement ne remontre pas l'écran, ni ne recompte la visite, le temps que vaut le repère.
    if (!apercu) {
      const params = new URLSearchParams(location.search);
      params.set('suite', String(minuteDe(page.maintenant ?? Date.now())));
      history.replaceState(history.state, '', `${location.pathname}?${params}${location.hash}`);
    }
    // Le bouton disparaît avec la feuille : le focus passe au nom, en tête de la page.
    requestAnimationFrame(() => nomRef.current?.focus({ preventScroll: true }));
  }

  async function partager() {
    const url = apercu ? urlPage(compte) : location.href.split('?')[0];
    try {
      if (navigator.share) { await navigator.share({ title: reglages.seo.titre || reglages.profil.nom, url }); return; }
      await navigator.clipboard.writeText(url);
      setToast(t.copie);
    } catch { /* partage annulé */ }
  }

  const badge = reglages.profil.badge && <span className="lp-badge" title={t.verifie} role="img" aria-label={t.verifie}><Icone nom="badge" taille={20} /></span>;

  const reseaux = edition ? (
    <button type="button" className="lp-reseaux lp-ed-zone" onClick={edition.reseaux} aria-label="Modifier les réseaux">
      {reglages.reseaux.filter(r => adresseSaisie(r.url)).map(r => <span key={r.reseau + r.url} className="lp-ed-reseau"><Icone nom={r.reseau} taille={22} /></span>)}
      {!reglages.reseaux.some(r => adresseSaisie(r.url)) && <span className="lp-ed-vide">Ajouter tes réseaux</span>}
    </button>
  ) : reglages.reseaux.some(r => adresseSaisie(r.url)) && (
    <nav className="lp-reseaux" aria-label={t.reseaux}>
      {reglages.reseaux.filter(r => adresseSaisie(r.url)).map(r => (
        <a key={r.reseau + r.url} href={r.url} aria-label={NOMS_RESEAUX[r.reseau]} rel="me noopener" {...cible}>
          <Icone nom={r.reseau} taille={22} />
        </a>
      ))}
    </nav>
  );

  return (
    <ActionsPage.Provider value={actions}>
    <div className="lp" onClick={ouvrirDansApp} style={variablesTheme(theme) as CSSProperties} data-bouton={reglages.bouton.style} data-forme={reglages.bouton.forme} data-ombre={reglages.bouton.ombre} data-police={theme.police} data-decor={theme.decor} data-bureau={reglages.bureau}>
      {/* Sous une feuille, la page est là, mais rien n'y répond tant qu'on ne l'a pas refermée. */}
      <div className="lp-scene" {...((ecran && page.sortie) || agenda ? { inert: true } : {})}>
      <div className="lp-col">
        {reglages.partage && !edition && (
          <button type="button" className="lp-partager" onClick={partager} aria-label={t.partager} {...fige}>
            <Icone nom="partage" taille={18} />
          </button>
        )}
        <header className="lp-tete" {...fige}>
          {edition ? (
            <button type="button" className="lp-ed-photo" onClick={e => edition.photo(e.currentTarget)} aria-label={reglages.profil.avatar ? 'Changer la photo' : 'Ajouter une photo'}>
              {reglages.profil.avatar ? <img className="lp-avatar" src={reglages.profil.avatar} alt="" width={96} height={96} /> : <span className="lp-avatar lp-ed-sans-photo" />}
              <span className="lp-ed-pastille">{edition.envoiPhoto ? '…' : <Icone nom="photo" taille={16} />}</span>
            </button>
          ) : reglages.profil.avatar && <img className="lp-avatar" src={reglages.profil.avatar} alt="" width={96} height={96} />}
          {/* Dans le back office, la page n'est qu'un aperçu : son nom n'y prend pas le titre principal. */}
          <Nom className="lp-nom" ref={nomRef} {...(apresEcran ? { tabIndex: -1 } : {})}>
            {edition
              ? <input className="lp-ed-saisie" value={reglages.profil.nom} maxLength={80} placeholder="Ton nom" aria-label="Ton nom"
                  style={{ width: `${Math.max(reglages.profil.nom.length, 7) + 1}ch` }} onChange={e => edition.profil({ nom: e.target.value })}
                  onFocus={e => { e.currentTarget.dataset.avant = reglages.profil.nom; }}
                  onBlur={e => { const avant = e.currentTarget.dataset.avant ?? ''; if (!e.currentTarget.value.trim()) { edition.profil({ nom: avant.trim() || compte.pseudo }); edition.nomVide?.(); } else if (e.currentTarget.value !== avant) edition.modifie?.('nom', avant); }} />
              : reglages.profil.nom}
            {badge}
          </Nom>
          {edition
            ? <ChampBio valeur={reglages.profil.bio} onChange={bio => edition.profil({ bio })} onQuitter={avant => edition.modifie?.('bio', avant)} />
            : reglages.profil.bio && <p className="lp-bio">{reglages.profil.bio}</p>}
          {reglages.reseauxPosition === 'haut' && reseaux}
        </header>

        <main className="lp-blocs">
          {edition || liste ? (edition?.liste ?? liste!)(blocs, bloc => <BlocPublic bloc={bloc} reglages={reglages} clic={() => {}} cible={cible} apercu t={t} />) : <>
            {blocs.map((bloc, i) => (
              <div key={bloc.id} className="lp-bloc" data-type={bloc.type} data-vedette={formatVedette(bloc)} style={{ '--i': i } as CSSProperties}>
                <BlocPublic bloc={bloc} reglages={reglages} clic={() => clic(bloc)} cible={cible} apercu={apercu} maintenant={page.maintenant} pseudo={pseudo} t={t} />
              </div>
            ))}
            {blocs.length === 0 && !apercu && <p className="lp-texte">{t.rien}</p>}
          </>}
        </main>

        {reglages.reseauxPosition === 'bas' && <footer className="lp-pied" {...fige}>{reseaux}</footer>}
        <p className="lp-signature" {...fige}>{compte.principal
          ? <a href="https://liliansevoumian.fr" {...cible}>liliansevoumian.fr</a>
          : <>
            {/* La mention disparaît dès Starter ; les liens légaux restent sur toutes les pages. */}
            {!peut(compte.plan, 'sansMention') && <a href={ORIGINE_PUBLIQUE} {...cible}>{t.hopla}</a>}
            <span className="lp-legal">
              <a href="/legal/confidentialite" {...cible}>{t.confidentialite}</a>
              <a href={`/signaler?page=${compte.pseudo}`} rel="nofollow" {...cible}>{t.signaler}</a>
            </span>
          </>}</p>
      </div>
      </div>
      {ecran && page.sortie && <FeuilleSortie sortie={page.sortie} t={t} annoncer={setToast} continuer={continuerIci} />}
      {agenda && <FeuilleAgenda bloc={agenda} t={t} fermer={() => { setAgenda(null); requestAnimationFrame(() => avantAgenda.current?.focus({ preventScroll: true })); }} />}
      {toast && <div className="lp-toast" role="status">{toast}</div>}
    </div>
    </ActionsPage.Provider>
  );
}

/**
 * La feuille qui monte par-dessus la page dans le navigateur intégré de
 * LinkedIn, d'Instagram… : la page est déjà là, voilée, et la feuille propose
 * de l'ouvrir dans Safari ou Chrome, de copier son lien, ou de continuer ici
 * (le voile et Échap aussi). Aux couleurs du thème, rendue par le serveur :
 * sans script, « Continuer ici » mène déjà à la page sans elle.
 */
function FeuilleSortie({ sortie, t, annoncer, continuer }: {
  sortie: Sortie; t: Textes; annoncer: (texte: string) => void; continuer: () => void;
}) {
  const [aide, setAide] = useState(false);
  const [sort, setSort] = useState(false);
  const feuille = useRef<HTMLElement>(null);
  // Partie dans Safari puis revenue dans l'app : la feuille a fait son office, la page prend sa place.
  const retour = useRef<(() => void) | null>(null);
  useEffect(() => () => { if (retour.current) document.removeEventListener('visibilitychange', retour.current); }, []);
  const ici = new URL(sortie.lien);

  // La feuille redescend avant de laisser la page ; d'un coup avec moins de mouvement.
  function fermer() {
    if (sort) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { continuer(); return; }
    setSort(true);
    setTimeout(continuer, 220);
  }

  // Une fenêtre par-dessus la page : le focus y entre, et Échap la referme comme « Continuer ici ».
  useEffect(() => { feuille.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') fermer(); };
    document.addEventListener('keydown', echap);
    return () => document.removeEventListener('keydown', echap);
  });

  function ouvrir(e: MouseEvent<HTMLAnchorElement>) {
    // Facebook et Threads n'ouvrent Safari que par une fenêtre ; si elle est refusée, par le lien lui-même.
    if (sortie.fenetre) {
      e.preventDefault();
      if (!window.open(sortie.adresse, '_blank')) location.href = sortie.adresse;
    }
    // La page encore là un moment après : rien ne s'est ouvert, le menu de l'app reste.
    setTimeout(() => { if (!document.hidden) setAide(true); }, 1500);
    if (!retour.current) {
      let partie = false;
      retour.current = () => {
        if (document.hidden) { partie = true; return; }
        if (!partie) return;
        document.removeEventListener('visibilitychange', retour.current!);
        continuer();
      };
      document.addEventListener('visibilitychange', retour.current);
    }
  }

  async function copier() {
    try {
      await navigator.clipboard.writeText(sortie.lien);
      annoncer(t.copie);
    } catch {
      if (copierALAncienne(sortie.lien)) { annoncer(t.copie); return; }
      // Ni copie ni ouverture : reste le menu de l'app.
      annoncer(t.copieRatee);
      setAide(true);
    }
  }

  return (
    <div className="lp-sortie" data-sort={sort || undefined}>
      {/* Toucher le voile, c'est continuer ici ; les lecteurs d'écran ont le lien de la feuille. */}
      <a className="lp-sortie-voile" href={ici.pathname + ici.search} tabIndex={-1} aria-hidden="true" onClick={e => { e.preventDefault(); fermer(); }} />
      <section ref={feuille} className="lp-sortie-feuille" role="dialog" aria-modal="true" aria-labelledby="lp-sortie-titre" tabIndex={-1}>
        {/* Si rien ne s'ouvre, l'aide prend la place de la phrase, et la place de la plus longue est gardée : rien ne bouge sous le doigt. */}
        <div className="lp-sortie-mots" data-aide={aide || undefined}>
          <p className="lp-sortie-titre" id="lp-sortie-titre">{t.sortieTexte(sortie.safari)}</p>
          <p className="lp-sortie-titre lp-sortie-aide" aria-hidden="true">
            {t.aideAvant} <span className="lp-sortie-points"><Icone nom={sortie.android ? 'points-verticaux' : 'points'} taille={16} /></span> {t.aideApres}
          </p>
        </div>
        <div className="lp-sortie-gestes">
          <a className="lp-btn lp-accent" href={sortie.adresse} onClick={ouvrir}>
            <span className="lp-picto"><Icone nom={sortie.safari ? 'boussole' : 'globe'} taille={22} /></span>
            <span className="lp-btn-texte"><span className="lp-btn-titre">{t.ouvrirDans(sortie.safari)}</span></span>
          </a>
          <button type="button" className="lp-btn" onClick={copier}>
            <span className="lp-picto"><Icone nom="copier" taille={22} /></span>
            <span className="lp-btn-texte"><span className="lp-btn-titre">{t.copierLien}</span></span>
          </button>
        </div>
        <a className="lp-sortie-ici" href={ici.pathname + ici.search} onClick={e => { e.preventDefault(); fermer(); }}>{t.continuerIci}</a>
        <p className="lp-sortie-annonce" aria-live="polite">{aide ? `${t.aideAvant} ${t.troisPoints} ${t.aideApres}` : ''}</p>
      </section>
    </div>
  );
}

/**
 * Une réservation Calendly, Cal.com ou Google Agenda, dans une feuille faite comme
 * celle qui propose le navigateur. L'agenda ne se charge qu'à l'ouverture : avant,
 * la page ne parle à personne. Il garde ses propres règles (ses témoins compris),
 * et « Ouvrir sur Calendly » reste là s'il refuse de s'afficher dans la page.
 */
function FeuilleAgenda({ bloc, t, fermer }: { bloc: Bloc; t: Textes; fermer: () => void }) {
  const [sort, setSort] = useState(false);
  const [charge, setCharge] = useState(false);
  const feuille = useRef<HTMLElement>(null);
  const adresse = adresseIntegree(bloc.url, location.hostname);

  function quitter() {
    if (sort) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { fermer(); return; }
    setSort(true);
    setTimeout(fermer, 220);
  }
  useEffect(() => { feuille.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') quitter(); };
    document.addEventListener('keydown', echap);
    return () => document.removeEventListener('keydown', echap);
  });

  return (
    <div className="lp-sortie lp-agenda" data-sort={sort || undefined}>
      <div className="lp-sortie-voile" aria-hidden="true" onClick={quitter} />
      <section ref={feuille} className="lp-sortie-feuille" role="dialog" aria-modal="true" aria-labelledby="lp-agenda-titre" tabIndex={-1}>
        <header className="lp-agenda-tete">
          <p className="lp-agenda-titre" id="lp-agenda-titre">{bloc.titre}</p>
          <a className="lp-agenda-apart" href={bloc.url} target="_blank" rel="noopener">{t.ouvrirSur(nomAgenda(bloc.url))}</a>
          <button type="button" className="lp-agenda-fermer" onClick={quitter} aria-label={t.fermer}><Icone nom="ui-fermer" taille={20} /></button>
        </header>
        <div className="lp-agenda-cadre">
          {!charge && <p className="lp-agenda-attente" aria-hidden="true">{t.chargement}</p>}
          {adresse && <iframe src={adresse} title={bloc.titre} onLoad={() => setCharge(true)} allow="payment"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation" />}
        </div>
      </section>
    </div>
  );
}

/** Copier sans l'API du presse-papiers, que certains navigateurs intégrés refusent. */
function copierALAncienne(texte: string): boolean {
  const zone = document.createElement('textarea');
  zone.value = texte;
  zone.readOnly = true;
  zone.style.position = 'fixed';
  zone.style.opacity = '0';
  document.body.append(zone);
  zone.select();
  zone.setSelectionRange(0, texte.length);
  try { return document.execCommand('copy'); } catch { return false; } finally { zone.remove(); }
}

/** La bio, tapée en place : le champ grandit avec le texte. */
function ChampBio({ valeur, onChange, onQuitter }: { valeur: string; onChange: (v: string) => void; onQuitter?: (avant: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const avant = useRef('');
  // À chaque rendu : le texte, mais aussi la police du thème, changent la hauteur.
  useLayoutEffect(() => {
    const t = ref.current;
    if (!t || CSS.supports('field-sizing', 'content')) return;
    t.style.height = 'auto';
    t.style.height = `${t.scrollHeight}px`;
  });
  return <textarea ref={ref} className="lp-bio lp-ed-saisie" rows={1} value={valeur} maxLength={300} placeholder="Une phrase sur toi" aria-label="Ta bio" onChange={e => onChange(e.target.value)}
    onFocus={e => { avant.current = e.currentTarget.value; }} onBlur={e => { if (e.currentTarget.value !== avant.current) onQuitter?.(avant.current); }} />;
}

/** « exemple.fr », sans le www ni le chemin. */
function nomDeDomaine(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function Pictogramme({ bloc }: { bloc: Bloc }) {
  if (bloc.image) return <img className="lp-vignette" src={bloc.image} alt="" width={40} height={40} loading="lazy" />;
  if (bloc.icone && ICONES[bloc.icone]) return <span className="lp-picto"><Icone nom={bloc.icone} taille={22} /></span>;
  // Un emoji enregistré avant les pictos dessinés reste lisible.
  if (bloc.icone) return <span className="lp-picto lp-emoji" aria-hidden="true">{bloc.icone}</span>;
  return null;
}

/** La mention d'un lien partenaire, que la loi du 9 juin 2023 demande à tous : « Publicité » ou « Collaboration commerciale ». */
function Mention({ bloc, t }: { bloc: Bloc; t: Textes }) {
  if (!bloc.partenariat) return null;
  return <span className="lp-pub">{bloc.partenariat.mention === 'collaboration' ? t.collaboration : t.publicite}</span>;
}

/** Le code promo d'un lien partenaire, sous lui, copié d'un geste. */
function CodePromo({ code, t }: { code: string; t: Textes }) {
  const { annoncer } = useContext(ActionsPage);
  async function copier() {
    try {
      await navigator.clipboard.writeText(code);
      annoncer(t.codeCopie(code));
    } catch { annoncer(copierALAncienne(code) ? t.codeCopie(code) : t.copieRatee); }
  }
  return (
    <button type="button" className="lp-code" onClick={copier} aria-label={t.copierCode(code)}>
      <span className="lp-code-libelle">{t.codePromo}</span>
      <span className="lp-code-valeur">{code}</span>
      <Icone nom="copier" taille={16} />
    </button>
  );
}

export function BlocPublic({ bloc, reglages, clic, cible, apercu, maintenant, pseudo, t = textes(reglages.vouvoiement) }: { bloc: Bloc; reglages: Reglages; clic: () => void; cible: object; apercu: boolean; maintenant?: number; pseudo?: string; t?: Textes }) {
  if (bloc.type === 'lien' && enAttente(bloc, maintenant ?? Date.now())) return <CompteARebours bloc={bloc} depart={maintenant ?? Date.now()} apercu={apercu} t={t} />;
  // Un lien partenaire se dit à Google (`sponsored`), comme aux visiteurs.
  const rel = `${bloc.indexable ? '' : 'nofollow '}${bloc.partenariat ? 'sponsored ' : ''}noopener`;
  const nosnippet = bloc.indexable ? {} : { 'data-nosnippet': true };
  const mouvement = animationDe(bloc, reglages);
  const anim = mouvement !== 'aucune' ? `lp-anim-${mouvement}` : '';
  const mention = <Mention bloc={bloc} t={t} />;
  // Le code promo se pose sous le lien : deux gestes, deux cibles.
  const avecCode = (lien: ReactNode) => (bloc.partenariat?.code ? <div className="lp-partenaire">{lien}<CodePromo code={bloc.partenariat.code} t={t} /></div> : lien);
  switch (bloc.type) {
    case 'titre':
      return <h2 className="lp-section">{bloc.titre}</h2>;
    case 'texte':
      return <p className="lp-texte">{bloc.titre}</p>;
    case 'video':
      return <Video id={idYoutube(bloc.url)} titre={bloc.titre} url={bloc.url} vedette={bloc.vedette} clic={clic} />;
    case 'derniere-video':
      return <DerniereVideo titre={bloc.titre} clic={clic} />;
    case 'newsletter':
      return <Newsletter bloc={bloc} apercu={apercu} />;
    case 'inscription':
      return <Inscription bloc={bloc} apercu={apercu} pseudo={pseudo ?? ''} t={t} />;
    case 'preuve':
      return <PreuveSociale bloc={bloc} t={t} clic={clic} cible={cible} />;
    case 'produit':
      return bloc.url ? avecCode(<Produit bloc={bloc} rel={rel} anim={anim} clic={clic} cible={cible} nosnippet={nosnippet} mention={mention} />) : null;
    case 'soutien':
      return bloc.url ? <Soutien bloc={bloc} rel={rel} clic={clic} cible={cible} t={t} /> : null;
    case 'reservation':
      return bloc.url ? <Reservation bloc={bloc} rel={rel} anim={anim} clic={clic} cible={cible} nosnippet={nosnippet} /> : null;
    default:
      if (bloc.acces) return <Drop bloc={bloc} t={t} apercu={apercu} pseudo={pseudo ?? ''} clic={clic} cible={cible} />;
      if (!bloc.url) return null;
      if (bloc.vedette) {
        const teinte = bloc.teinte === 'accent' ? 'lp-accent' : '';
        if (bloc.format === 'bouton') {
          return avecCode(
            <a className={`lp-btn lp-btn-vedette ${teinte} ${anim}`} href={bloc.url} rel={rel} onClick={clic} {...cible} {...nosnippet}>
              <Pictogramme bloc={bloc} />
              <span className="lp-btn-texte">
                {mention}
                <span className="lp-btn-titre">{bloc.titre || bloc.url}</span>
                {bloc.sousTitre && <span className="lp-sous">{bloc.sousTitre}</span>}
              </span>
            </a>
          );
        }
        const picto = bloc.icone ? (ICONES[bloc.icone] ? <Icone nom={bloc.icone} taille={bloc.format === 'carte' ? 28 : 22} /> : bloc.icone) : null;
        const hote = nomDeDomaine(bloc.url);
        if (bloc.format === 'carte') {
          return avecCode(
            <a className={`lp-carte ${teinte} ${anim}`} data-format="carte" href={bloc.url} rel={rel} onClick={clic} {...cible} {...nosnippet}>
              {bloc.image ? (
                <span className="lp-carte-visuel">
                  <img src={bloc.image} alt="" loading="lazy" />
                  {picto && <span className="lp-carte-tuile" aria-hidden="true">{picto}</span>}
                </span>
              ) : (
                <span className="lp-carte-visuel lp-carte-motif" aria-hidden="true">
                  <span className="lp-carte-tuile">{picto ?? <Icone nom="lien" taille={28} />}</span>
                </span>
              )}
              <span className="lp-carte-corps">
                {mention}
                <span className="lp-carte-titre">{bloc.titre || hote}</span>
                {bloc.sousTitre && <span className="lp-carte-sous">{bloc.sousTitre}</span>}
                {bloc.description && <span className="lp-carte-description">{bloc.description}</span>}
                <span className="lp-carte-pied">
                  <span className="lp-carte-domaine"><Icone nom="site" taille={14} />{hote}</span>
                  <span className="lp-carte-fleche" aria-hidden="true"><Icone nom="ui-fleche" taille={18} /></span>
                </span>
              </span>
            </a>
          );
        }
        return avecCode(
          <a className={`lp-carte ${teinte} ${anim}`} data-format="bandeau" href={bloc.url} rel={rel} onClick={clic} {...cible} {...nosnippet}>
            {bloc.image ? <img className="lp-carte-tuile" src={bloc.image} alt="" loading="lazy" /> : picto && <span className="lp-carte-tuile" aria-hidden="true">{picto}</span>}
            <span className="lp-carte-texte">
              {mention}
              <span className="lp-carte-titre">{bloc.titre || hote}</span>
              {bloc.sousTitre && <span className="lp-sous">{bloc.sousTitre}</span>}
              {bloc.description && <span className="lp-carte-description">{bloc.description}</span>}
            </span>
            <span className="lp-carte-fleche" aria-hidden="true"><Icone nom="ui-fleche" taille={18} /></span>
          </a>
        );
      }
      return avecCode(
        <a className={`lp-btn ${anim}`} href={bloc.url} rel={rel} onClick={clic} {...cible} {...nosnippet}>
          <Pictogramme bloc={bloc} />
          <span className="lp-btn-texte">
            {mention}
            <span className="lp-btn-titre">{bloc.titre || bloc.url}</span>
            {bloc.sousTitre && <span className="lp-sous">{bloc.sousTitre}</span>}
          </span>
        </a>
      );
  }
}

/**
 * Un produit : sa photo, son nom et son prix, lus sur la boutique. Mis en avant,
 * une grande carte à la couleur d'accent. Le paiement se fait sur la boutique.
 */
function Produit({ bloc, rel, anim, clic, cible, nosnippet, mention }: { bloc: Bloc; rel: string; anim: string; clic: () => void; cible: object; nosnippet: object; mention: ReactNode }) {
  const hote = nomDeDomaine(bloc.url);
  const ligne = (
    <span className="lp-produit-ligne">
      {bloc.prix && <span className="lp-prix">{bloc.prix}</span>}
      <span className="lp-carte-domaine">{hote}</span>
    </span>
  );
  if (bloc.vedette) {
    return (
      <a className={`lp-carte lp-produit lp-accent ${anim}`} data-format="carte" href={bloc.url} rel={rel} onClick={clic} {...cible} {...nosnippet}>
        {bloc.image
          ? <span className="lp-carte-visuel"><img src={bloc.image} alt="" loading="lazy" /></span>
          : <span className="lp-carte-visuel lp-carte-motif" aria-hidden="true"><span className="lp-carte-tuile"><Icone nom="bloc-produit" taille={28} /></span></span>}
        <span className="lp-carte-corps">
          {mention}
          <span className="lp-carte-titre">{bloc.titre || hote}</span>
          {bloc.description && <span className="lp-carte-description">{bloc.description}</span>}
          <span className="lp-carte-pied">
            {ligne}
            <span className="lp-carte-fleche" aria-hidden="true"><Icone nom="ui-fleche" taille={18} /></span>
          </span>
        </span>
      </a>
    );
  }
  return (
    <a className={`lp-carte lp-produit ${anim}`} data-format="bandeau" href={bloc.url} rel={rel} onClick={clic} {...cible} {...nosnippet}>
      {bloc.image
        ? <img className="lp-carte-tuile" src={bloc.image} alt="" loading="lazy" />
        : <span className="lp-carte-tuile" aria-hidden="true"><Icone nom="bloc-produit" taille={24} /></span>}
      <span className="lp-carte-texte">
        {mention}
        <span className="lp-carte-titre">{bloc.titre || hote}</span>
        {ligne}
      </span>
      <span className="lp-carte-fleche" aria-hidden="true"><Icone nom="ui-fleche" taille={18} /></span>
    </a>
  );
}

/**
 * « Me soutenir » : chez PayPal, des montants tout prêts (l'adresse les reprend)
 * et « Autre montant » ; ailleurs (Ko-fi, Tipeee, Lydia…), un seul bouton vers
 * le site, qui fait choisir chez lui. Hopla n'encaisse rien.
 */
function Soutien({ bloc, rel, clic, cible, t }: { bloc: Bloc; rel: string; clic: () => void; cible: object; t: Textes }) {
  const site = nomSoutien(bloc.url);
  const montants = avecMontants(bloc.url) ? bloc.montants : [];
  const euros = (n: number) => n.toLocaleString(LOCALE, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  return (
    <section className="lp-newsletter lp-soutien">
      <div className="lp-newsletter-tete">
        <span className="lp-newsletter-picto" aria-hidden="true"><Icone nom="bloc-soutien" taille={20} /></span>
        <span className="lp-newsletter-textes">
          <h2 className="lp-newsletter-titre">{bloc.titre}</h2>
          {bloc.sousTitre && <p className="lp-sous">{bloc.sousTitre}</p>}
        </span>
      </div>
      {montants.length ? <>
        <div className="lp-soutien-montants">
          {montants.map(n => <a key={n} className="lp-btn lp-btn-compact lp-accent" href={lienMontant(bloc.url, n)} rel={rel} onClick={clic} {...cible}>{euros(n)}</a>)}
          <a className="lp-btn lp-btn-compact lp-soutien-autre" href={lienSansMontant(bloc.url)} rel={rel} onClick={clic} {...cible}>{t.autreMontant}</a>
        </div>
        <p className="lp-mention">{t.paiementSur(site)}</p>
      </> : <a className="lp-btn lp-btn-compact lp-accent lp-soutien-un" href={bloc.url} rel={rel} onClick={clic} {...cible}>{t.soutenirSur(site)}</a>}
    </section>
  );
}

/**
 * Une prise de rendez-vous. Calendly, Cal.com et Google Agenda s'ouvrent dans une
 * feuille, sans quitter la page ; les autres (Planity…) comme un lien. Sans script,
 * c'est toujours un lien.
 */
function Reservation({ bloc, rel, anim, clic, cible, nosnippet }: { bloc: Bloc; rel: string; anim: string; clic: () => void; cible: object; nosnippet: object }) {
  const { reserver } = useContext(ActionsPage);
  const dedans = !!reserver && seIntegre(bloc.url);
  function ouvrir(e: MouseEvent<HTMLAnchorElement>) {
    clic();
    if (!dedans || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    reserver!(bloc, e.currentTarget);
  }
  return (
    <a className={`lp-carte lp-reservation ${bloc.vedette ? 'lp-accent' : ''} ${anim}`} data-format="bandeau" href={bloc.url} rel={rel} onClick={ouvrir}
      {...(dedans ? { 'aria-haspopup': 'dialog' as const } : cible)} {...nosnippet}>
      {bloc.image
        ? <img className="lp-carte-tuile" src={bloc.image} alt="" loading="lazy" />
        : <span className="lp-carte-tuile" aria-hidden="true"><Icone nom={bloc.icone && ICONES[bloc.icone] ? bloc.icone : 'bloc-reservation'} taille={22} /></span>}
      <span className="lp-carte-texte">
        <span className="lp-carte-titre">{bloc.titre}</span>
        <span className="lp-sous">{bloc.sousTitre || nomAgenda(bloc.url)}</span>
      </span>
      <span className="lp-carte-fleche" aria-hidden="true"><Icone nom="ui-fleche" taille={18} /></span>
    </a>
  );
}

const deux = (n: number) => String(n).padStart(2, '0');

/** Un lien pas encore ouvert : son titre et le temps qui reste. Son adresse n'arrive qu'à l'ouverture. */
function CompteARebours({ bloc, depart, apercu, t }: { bloc: Bloc; depart: number; apercu: boolean; t: Textes }) {
  const [maintenant, setMaintenant] = useState(depart);
  const ouverture = Date.parse(bloc.debut);
  useEffect(() => {
    setMaintenant(Date.now());
    const t = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const reste = Math.max(0, ouverture - maintenant);
  // À l'heure dite, la page se recharge : le serveur donne alors l'adresse du lien.
  useEffect(() => { if (!apercu && reste === 0) { const t = setTimeout(() => location.reload(), 800); return () => clearTimeout(t); } }, [reste, apercu]);
  const s = Math.floor(reste / 1000), j = Math.floor(s / 86_400), h = Math.floor((s % 86_400) / 3600), m = Math.floor((s % 3600) / 60);
  const quand = new Date(ouverture).toLocaleString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  return (
    <div className={`lp-carte lp-rebours ${bloc.vedette && bloc.teinte === 'accent' ? 'lp-accent' : ''}`} data-format="bandeau" role="timer" aria-label={`${bloc.titre} : ${t.ouvreLe(quand)}`}>
      <span className="lp-carte-tuile" aria-hidden="true"><Icone nom={bloc.icone && ICONES[bloc.icone] ? bloc.icone : 'horloge'} taille={22} /></span>
      <span className="lp-carte-texte">
        <Mention bloc={bloc} t={t} />
        <span className="lp-carte-titre">{bloc.titre || t.bientot}</span>
        <span className="lp-sous">{reste === 0 ? t.ouvert : t.ouvreLe(quand)}</span>
      </span>
      <span className="lp-rebours-chrono" aria-hidden="true">
        {j > 0 ? <><b>{j}</b>{t.j} <b>{deux(h)}</b>{t.h}</> : <><b>{deux(h)}</b>:<b>{deux(m)}</b>:<b>{deux(s % 60)}</b></>}
      </span>
    </div>
  );
}

function Lecteur({ id, titre, vignette, clic, legende }: { id: string; titre: string; vignette: string; clic: () => void; legende?: ReactNode }) {
  const [joue, setJoue] = useState(false);
  return (
    <figure className="lp-video">
      <div className="lp-video-cadre">
        {joue ? (
          <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`} title={titre} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
        ) : (
          <button type="button" className="lp-video-jouer" onClick={() => { setJoue(true); clic(); }} aria-label={`Lire la vidéo : ${titre}`}>
            <img src={vignette} alt="" loading="lazy" />
            <span className="lp-video-play"><Icone nom="play" taille={26} /></span>
          </button>
        )}
      </div>
      <figcaption>{legende ?? titre}</figcaption>
    </figure>
  );
}

function Video({ id, titre, url, clic }: { id: string | null; titre: string; url: string; vedette: boolean; clic: () => void }) {
  if (!id) return url ? <a className="lp-btn" href={url} onClick={clic}><span className="lp-btn-texte"><span className="lp-btn-titre">{titre}</span></span></a> : null;
  return <Lecteur id={id} titre={titre} vignette={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} clic={clic} />;
}

/* La vidéo la plus récente de la chaîne, relevée par le serveur du site. */
function DerniereVideo({ titre, clic }: { titre: string; clic: () => void }) {
  const [video, setVideo] = useState<{ id: string; titre: string } | null | 'absente'>(null);
  useEffect(() => {
    let annule = false;
    fetch('/api/derniere-video').then(r => (r.ok ? r.json() : Promise.reject())).then(v => { if (!annule) setVideo(v?.id ? v : 'absente'); }).catch(() => { if (!annule) setVideo('absente'); });
    return () => { annule = true; };
  }, []);
  if (video === 'absente') {
    return <a className="lp-btn" href="https://www.youtube.com/@lilian.sevoumian" onClick={clic}><span className="lp-picto"><Icone nom="youtube" taille={22} /></span><span className="lp-btn-texte"><span className="lp-btn-titre">{titre}</span></span></a>;
  }
  if (!video) return <div className="lp-video lp-video-attente" aria-hidden="true"><div className="lp-video-cadre" /></div>;
  return <Lecteur id={video.id} titre={video.titre} vignette={`/api/derniere-video/vignette?v=${video.id}`} clic={clic}
    legende={<><span className="lp-video-etiquette">{titre}</span>{video.titre}</>} />;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Newsletter({ bloc, apercu }: { bloc: Bloc; apercu: boolean }) {
  const [etat, setEtat] = useState<{ type: 'repos' | 'envoi' | 'ok' | 'erreur'; message?: string }>({ type: 'repos' });
  async function envoyer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (apercu) { setEtat({ type: 'ok', message: 'Dans l’aperçu, rien n’est envoyé.' }); return; }
    const email = String(new FormData(event.currentTarget).get('email') ?? '');
    // Le message est celui de la page, dans son ton : pas la bulle du navigateur, dans sa langue à lui.
    if (!EMAIL.test(email.trim())) { setEtat({ type: 'erreur', message: 'Cette adresse e-mail ne semble pas complète.' }); return; }
    setEtat({ type: 'envoi' });
    try {
      const r = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, website: '' }) });
      const corps = await r.json().catch(() => ({}));
      setEtat(r.ok ? { type: 'ok', message: corps.message ?? 'C’est noté, regardez votre boîte.' } : { type: 'erreur', message: corps.message ?? 'L’inscription n’est pas passée. Réessayez.' });
    } catch { setEtat({ type: 'erreur', message: 'L’inscription n’est pas passée. Réessayez.' }); }
  }
  return (
    <section className="lp-newsletter">
      <div className="lp-newsletter-tete">
        <span className="lp-newsletter-picto" aria-hidden="true"><Icone nom="bloc-newsletter" taille={20} /></span>
        <span className="lp-newsletter-textes">
          <h2 className="lp-newsletter-titre">{bloc.titre}</h2>
          {bloc.sousTitre && <p className="lp-sous">{bloc.sousTitre}</p>}
        </span>
      </div>
      {etat.type === 'ok' ? <p className="lp-newsletter-ok" role="status">{etat.message}</p> : (
        <form onSubmit={envoyer} noValidate>
          <input type="email" name="email" required autoComplete="email" aria-invalid={etat.type === 'erreur' || undefined} placeholder="votre@email.fr" aria-label="Votre adresse e-mail" />
          <button type="submit" className="lp-btn lp-btn-compact lp-accent" disabled={etat.type === 'envoi'}>{etat.type === 'envoi' ? '…' : 'S’inscrire'}</button>
        </form>
      )}
      {etat.type === 'erreur' && <p className="lp-newsletter-erreur" role="alert">{etat.message}</p>}
    </section>
  );
}

/** « Rejoins ma liste » : l'inscrit reste chez la personne (et part chez Brevo ou Mailchimp si elle l'a branché). */
function Inscription({ bloc, apercu, pseudo, t }: { bloc: Bloc; apercu: boolean; pseudo: string; t: Textes }) {
  const [etat, setEtat] = useState<{ type: 'repos' | 'envoi' | 'ok' | 'erreur'; message?: string }>({ type: 'repos' });
  async function envoyer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (apercu) { setEtat({ type: 'ok', message: t.apercu }); return; }
    const f = new FormData(event.currentTarget);
    if (!EMAIL.test(String(f.get('email') ?? '').trim())) { setEtat({ type: 'erreur', message: t.emailInvalide }); return; }
    setEtat({ type: 'envoi' });
    try {
      const params = new URLSearchParams(location.search);
      const jeton = await jetonTurnstile('liste');
      const r = await fetch('/api/inscription', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: pseudo, bloc: bloc.id, email: f.get('email'), prenom: f.get('prenom') ?? '', website: f.get('website') ?? '', utm: params.get('utm_source') ?? params.get('s') ?? '', referent: document.referrer, jeton }) });
      // Les messages viennent de la page, dans son ton (tu ou vous) ; le serveur ne donne que le statut.
      setEtat(r.ok ? { type: 'ok', message: t.merci } : { type: 'erreur', message: r.status === 400 ? t.emailInvalide : r.status === 429 ? t.tropDEssais : r.status === 404 ? t.indisponible : t.echec });
    } catch { setEtat({ type: 'erreur', message: t.echec }); }
  }
  return (
    <section className="lp-newsletter lp-inscription">
      <div className="lp-newsletter-tete">
        <span className="lp-newsletter-picto" aria-hidden="true"><Icone nom="bloc-inscription" taille={20} /></span>
        <span className="lp-newsletter-textes">
          <h2 className="lp-newsletter-titre">{bloc.titre}</h2>
          {bloc.sousTitre && <p className="lp-sous">{bloc.sousTitre}</p>}
        </span>
      </div>
      {etat.type === 'ok' ? <p className="lp-newsletter-ok" role="status">{etat.message}</p> : (
        <form onSubmit={envoyer} noValidate data-prenom={bloc.demanderPrenom || undefined} onFocus={apercu ? undefined : () => preparerTurnstile('liste')}>
          {bloc.demanderPrenom && <input name="prenom" autoComplete="given-name" placeholder={t.prenom} aria-label={t.prenomAria} maxLength={60} />}
          <input type="email" name="email" required autoComplete="email" placeholder={t.email} aria-label={t.emailAria} aria-invalid={etat.type === 'erreur' || undefined} aria-describedby={etat.type === 'erreur' ? `${bloc.id}-erreur` : undefined} />
          {/* Un champ que seuls les robots remplissent. */}
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="lp-piege" />
          <button type="submit" className="lp-btn lp-btn-compact lp-accent" disabled={etat.type === 'envoi'}>{etat.type === 'envoi' ? '…' : t.inscrire}</button>
        </form>
      )}
      {etat.type === 'erreur' && <p id={`${bloc.id}-erreur`} className="lp-newsletter-erreur" role="alert">{etat.message}</p>}
      <p className="lp-mention">{t.mention} <a href="/legal/confidentialite" target="_blank" rel="noopener">{t.confidentialite}</a></p>
    </section>
  );
}

/**
 * Le mode drop : un lien qui se débloque avec un code, ou pour les premiers
 * arrivés. L'adresse n'est pas dans la page : `/api/acces` la donne une fois
 * le code vérifié et la place prise.
 */
function Drop({ bloc, t, apercu, pseudo, clic, cible }: { bloc: Bloc; t: Textes; apercu: boolean; pseudo: string; clic: () => void; cible: object }) {
  const avecCode = !!bloc.acces?.code;
  const places = bloc.acces?.places ?? 0;
  const [restantes, setRestantes] = useState(bloc.restantes ?? null);
  const [ouvert, setOuvert] = useState(false);
  const [url, setUrl] = useState('');
  const [garde, setGarde] = useState(false);
  const [etat, setEtat] = useState<{ type: 'repos' | 'envoi' | 'erreur'; message?: string }>({ type: 'repos' });
  const complet = places > 0 && restantes !== null && restantes <= 0 && !url;
  const badge = url ? '' : etatPlaces(restantes, places, t);

  async function debloquer(code = '') {
    // Dans l'aperçu du back office, le bloc a encore son adresse : on la montre sans prendre de place.
    if (apercu) { if (bloc.url) setUrl(bloc.url); else setEtat({ type: 'erreur', message: t.apercu }); return; }
    setEtat({ type: 'envoi' });
    try {
      const r = await fetch('/api/acces', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page: pseudo, bloc: bloc.id, code }) });
      const corps = await r.json().catch(() => ({})) as { url?: string; restantes?: number | null };
      if (typeof corps.restantes === 'number') setRestantes(corps.restantes);
      if (r.ok && corps.url) { setUrl(corps.url); setGarde(places > 0); setEtat({ type: 'repos' }); clic(); return; }
      setEtat({ type: 'erreur', message: r.status === 403 ? t.mauvaisCode : r.status === 410 ? t.complet : r.status === 429 ? t.tropDEssais : r.status === 404 ? t.indisponible : t.echec });
    } catch { setEtat({ type: 'erreur', message: t.echec }); }
  }

  return (
    <div className="lp-drop" data-complet={complet || undefined} data-debloque={url ? true : undefined}>
      <button type="button" className={`lp-carte lp-drop-tete ${bloc.vedette && bloc.teinte === 'accent' ? 'lp-accent' : ''}`} data-format="bandeau" aria-expanded={avecCode ? ouvert || !!url : undefined} disabled={complet || etat.type === 'envoi' || !!url}
        onClick={() => (avecCode ? setOuvert(o => !o) : debloquer())}>
        <span className="lp-carte-tuile" aria-hidden="true"><Icone nom={url ? 'check' : bloc.icone && ICONES[bloc.icone] ? bloc.icone : 'cadenas'} taille={22} /></span>
        <span className="lp-carte-texte">
          <Mention bloc={bloc} t={t} />
          <span className="lp-carte-titre">{bloc.titre || t.reserve}</span>
          <span className="lp-sous">{url ? (garde ? t.garde : t.debloque) : bloc.sousTitre || (avecCode ? t.reserve : t.reserver)}</span>
          {badge && <span className="lp-drop-places">{badge}</span>}
        </span>
      </button>
      {avecCode && ouvert && !url && (
        <form className="lp-drop-form" onSubmit={e => { e.preventDefault(); debloquer(String(new FormData(e.currentTarget).get('code') ?? '')); }}>
          <input name="code" required maxLength={40} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder={t.code} aria-label={t.code} autoFocus />
          <button type="submit" className="lp-btn lp-btn-compact lp-accent" disabled={etat.type === 'envoi'}>{etat.type === 'envoi' ? '…' : t.debloquer}</button>
        </form>
      )}
      {url && (
        <a className="lp-btn lp-btn-compact lp-accent lp-drop-ouvrir" href={url} rel="noopener" {...cible}>
          <span className="lp-btn-titre">{t.ouvrir}</span><Icone nom="ui-fleche" taille={16} />
        </a>
      )}
      {etat.type === 'erreur' && <p className="lp-newsletter-erreur" role="alert">{etat.message}{etat.message === t.mauvaisCode ? ` ${t.ouTrouver}` : ''}</p>}
    </div>
  );
}

/** Cinq étoiles, remplies jusqu'à la note. */
function Etoiles({ note }: { note: number }) {
  const etoile = <path d="M12 2.5l2.94 6.06 6.56.92-4.78 4.6 1.17 6.52L12 17.5l-5.89 3.1 1.17-6.52-4.78-4.6 6.56-.92z" />;
  const rangee = (cls: string) => <span className={cls}>{[0, 1, 2, 3, 4].map(i => <svg key={i} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">{etoile}</svg>)}</span>;
  return (
    <span className="lp-etoiles">
      {rangee('lp-etoiles-fond')}
      <span className="lp-etoiles-plein" style={{ width: `${(Math.min(5, Math.max(0, note)) / 5) * 100}%` }}>{rangee('')}</span>
    </span>
  );
}

/** Une preuve : la note des avis, un chiffre qui compte, ou un témoignage. */
function PreuveSociale({ bloc, t, clic, cible }: { bloc: Bloc; t: Textes; clic: () => void; cible: object }) {
  const p = bloc.preuve;
  if (!p) return null;
  const locale = LOCALE;
  const nombre = (n: number) => n.toLocaleString(locale);
  let corps: ReactNode;
  if (p.genre === 'note') {
    const note = p.note.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    corps = <>
      {bloc.titre && <span className="lp-preuve-titre">{bloc.titre}</span>}
      <span className="lp-preuve-ligne" role="img" aria-label={t.noteAria(note)}>
        <Etoiles note={p.note} />
        <span className="lp-preuve-note"><b>{note}</b> {t.sur5}</span>
      </span>
      {(p.nombre > 0 || p.source) && <span className="lp-sous">{p.nombre > 0 ? t.avis(nombre(p.nombre), p.source) : p.source}</span>}
    </>;
  } else if (p.genre === 'compteur') {
    const court = new Intl.NumberFormat(locale, { notation: p.nombre >= 10_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(p.nombre);
    corps = <>
      <span className="lp-preuve-chiffre">{court}</span>
      <span className="lp-preuve-libelle">{bloc.titre}{p.source ? <span className="lp-sous"> · {p.source}</span> : null}</span>
    </>;
  } else {
    corps = <>
      <blockquote className="lp-preuve-citation">{bloc.description || bloc.titre}</blockquote>
      {(bloc.sousTitre || p.source) && <span className="lp-preuve-auteur">{bloc.sousTitre}{bloc.sousTitre && p.source ? ' · ' : ''}{p.source && <span className="lp-sous">{p.source}</span>}</span>}
    </>;
  }
  const classe = `lp-preuve lp-preuve-${p.genre}`;
  return bloc.url
    ? <a className={classe} href={bloc.url} rel="noopener" onClick={clic} {...cible}>{corps}</a>
    : <div className={classe}>{corps}</div>;
}
