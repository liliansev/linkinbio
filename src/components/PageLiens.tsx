import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, MouseEvent, ReactNode } from 'react';
import type { Bloc, PagePublique } from '../lib/types.ts';
import { ORIGINE_PUBLIQUE, animationDe, idYoutube, urlPage } from '../lib/types.ts';
import type { Reglages } from '../lib/types.ts';
import { themeDe, variablesTheme } from '../lib/themes.ts';
import { ICONES } from '../lib/icones.ts';
import { lienApp } from '../lib/ouvrirApp.ts';
import { enAttente } from '../lib/moments.ts';
import { etatPlaces } from '../lib/acces.ts';
import { adresseSaisie } from '../lib/valider.ts';
import { LOCALES, NOMS_LANGUES, textes } from '../lib/langues.ts';
import type { Textes } from '../lib/langues.ts';
import type { LangueVisiteur } from '../lib/types.ts';
import { Icone, NOMS_RESEAUX } from './Icone.tsx';

/*
 * La page publique, rendue côté serveur pour Google et les aperçus de liens,
 * et réutilisée telle quelle dans l'aperçu du back office (`apercu`). Le thème
 * pose ses couleurs en variables CSS ; le style et la forme des boutons sont
 * deux attributs que `page.css` lit.
 */

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
  photo: () => void;
  envoiPhoto: boolean;
  reseaux: () => void;
  liste: (blocs: Bloc[], rendu: (bloc: Bloc) => ReactNode) => ReactNode;
  /** Le nom vidé puis quitté : il revient tel qu'il était, et le back office le dit. */
  nomVide?: () => void;
}

export function PageLiens({ page, apercu = false, edition }: { page: PagePublique; apercu?: boolean; edition?: Edition }) {
  if (edition) apercu = true;
  const { reglages, blocs, compte } = page;
  const Nom = apercu ? 'h2' : 'h1';
  // La page de Lilian s'annonce sans pseudo ; les autres avec le leur.
  const pseudo = compte.principal ? '' : compte.pseudo;
  const theme = themeDe(reglages);
  const langue = page.langue ?? 'fr';
  const t = textes(langue, reglages.vouvoiement);
  const [toast, setToast] = useState('');

  useEffect(() => { if (!apercu) suivre(pseudo, 'vue'); }, [apercu, pseudo]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2200); return () => clearTimeout(t); }, [toast]);

  const clic = (bloc: Bloc) => {
    if (apercu) return;
    // Le clic part avant la redirection vers l'app (`ouvrirDansApp`, plus haut dans la page) : on note s'il l'ouvrira.
    suivre(pseudo, 'clic', bloc.id, reglages.ouvrirApps && !!bloc.url && !!lienApp(bloc.url, navigator.userAgent));
  };
  const cible = apercu ? { target: '_blank' } : {};

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

  async function partager() {
    const url = apercu ? urlPage(compte) : location.href.split('?')[0];
    try {
      if (navigator.share) { await navigator.share({ title: reglages.seo.titre || reglages.profil.nom, url }); return; }
      await navigator.clipboard.writeText(url);
      setToast(t.copie);
    } catch { /* partage annulé */ }
  }

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
    <div className="lp" lang={langue} onClick={ouvrirDansApp} style={variablesTheme(theme) as CSSProperties} data-bouton={reglages.bouton.style} data-forme={reglages.bouton.forme} data-ombre={reglages.bouton.ombre} data-police={theme.police} data-decor={theme.decor} data-bureau={reglages.bureau}>
      <div className="lp-scene">
      <div className="lp-col">
        {reglages.partage && !edition && (
          <button type="button" className="lp-partager" onClick={partager} aria-label={t.partager} {...(edition ? { inert: true, tabIndex: -1 } : {})}>
            <Icone nom="partage" taille={18} />
          </button>
        )}
        <header className="lp-tete">
          {edition ? (
            <button type="button" className="lp-ed-photo" onClick={edition.photo} aria-label={reglages.profil.avatar ? 'Changer la photo' : 'Ajouter une photo'}>
              {reglages.profil.avatar ? <img className="lp-avatar" src={reglages.profil.avatar} alt="" width={96} height={96} /> : <span className="lp-avatar lp-ed-sans-photo" />}
              <span className="lp-ed-pastille">{edition.envoiPhoto ? '…' : <Icone nom="photo" taille={16} />}</span>
            </button>
          ) : reglages.profil.avatar && <img className="lp-avatar" src={reglages.profil.avatar} alt="" width={96} height={96} />}
          {/* Dans le back office, la page n'est qu'un aperçu : son nom n'y prend pas le titre principal. */}
          <Nom className="lp-nom">
            {edition
              ? <input className="lp-ed-saisie" value={reglages.profil.nom} maxLength={80} placeholder="Ton nom" aria-label="Ton nom"
                  style={{ width: `${Math.max(reglages.profil.nom.length, 7) + 1}ch` }} onChange={e => edition.profil({ nom: e.target.value })}
                  onFocus={e => { e.currentTarget.dataset.avant = reglages.profil.nom; }}
                  onBlur={e => { if (!e.currentTarget.value.trim()) { edition.profil({ nom: e.currentTarget.dataset.avant?.trim() || compte.pseudo }); edition.nomVide?.(); } }} />
              : reglages.profil.nom}
            {reglages.profil.badge && <span className="lp-badge" title={t.verifie} role="img" aria-label={t.verifie}><Icone nom="badge" taille={20} /></span>}
          </Nom>
          {edition
            ? <ChampBio valeur={reglages.profil.bio} onChange={bio => edition.profil({ bio })} />
            : reglages.profil.bio && <p className="lp-bio">{reglages.profil.bio}</p>}
          {reglages.reseauxPosition === 'haut' && reseaux}
        </header>

        <main className="lp-blocs">
          {edition ? edition.liste(blocs, bloc => <BlocPublic bloc={bloc} reglages={reglages} clic={() => {}} cible={cible} apercu t={t} langue={langue} />) : <>
            {blocs.map((bloc, i) => (
              <div key={bloc.id} className="lp-bloc" data-type={bloc.type} data-vedette={bloc.vedette ? bloc.format : undefined} style={{ '--i': i } as CSSProperties}>
                <BlocPublic bloc={bloc} reglages={reglages} clic={() => clic(bloc)} cible={cible} apercu={apercu} maintenant={page.maintenant} pseudo={pseudo} t={t} langue={langue} />
              </div>
            ))}
            {blocs.length === 0 && <p className="lp-texte">{t.rien}</p>}
          </>}
        </main>

        {reglages.reseauxPosition === 'bas' && <footer className="lp-pied">{reseaux}</footer>}
        {!edition && reglages.langues?.length > 0 && (
          <nav className="lp-langues" aria-label={t.langue}>
            {(['fr', ...reglages.langues] as LangueVisiteur[]).map(l => (
              <a key={l} href={`?lang=${l}`} hrefLang={l} lang={l} aria-current={l === langue ? 'true' : undefined} rel="alternate">{NOMS_LANGUES[l]}</a>
            ))}
          </nav>
        )}
        <p className="lp-signature">{compte.principal
          ? <a href="https://liliansevoumian.fr" {...cible}>liliansevoumian.fr</a>
          : <>
            {/* La mention disparaît en Pro ; les liens légaux restent sur toutes les pages. */}
            {!compte.pro && <a href={ORIGINE_PUBLIQUE} {...cible}>{t.hopla}</a>}
            <span className="lp-legal">
              <a href="/legal/confidentialite" {...cible}>{t.confidentialite}</a>
              <a href={`/signaler?page=${compte.pseudo}`} rel="nofollow" {...cible}>{t.signaler}</a>
            </span>
          </>}</p>
      </div>
      </div>
      {toast && <div className="lp-toast" role="status">{toast}</div>}
    </div>
  );
}

/** La bio, tapée en place : le champ grandit avec le texte. */
function ChampBio({ valeur, onChange }: { valeur: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // À chaque rendu : le texte, mais aussi la police du thème, changent la hauteur.
  useLayoutEffect(() => {
    const t = ref.current;
    if (!t || CSS.supports('field-sizing', 'content')) return;
    t.style.height = 'auto';
    t.style.height = `${t.scrollHeight}px`;
  });
  return <textarea ref={ref} className="lp-bio lp-ed-saisie" rows={1} value={valeur} maxLength={300} placeholder="Une phrase sur toi" aria-label="Ta bio" onChange={e => onChange(e.target.value)} />;
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

export function BlocPublic({ bloc, reglages, clic, cible, apercu, maintenant, pseudo, t = textes('fr'), langue = 'fr' }: { bloc: Bloc; reglages: Reglages; clic: () => void; cible: object; apercu: boolean; maintenant?: number; pseudo?: string; t?: Textes; langue?: LangueVisiteur }) {
  if (bloc.type === 'lien' && enAttente(bloc, maintenant ?? Date.now())) return <CompteARebours bloc={bloc} depart={maintenant ?? Date.now()} apercu={apercu} t={t} langue={langue} />;
  const rel = bloc.indexable ? 'noopener' : 'nofollow noopener';
  const nosnippet = bloc.indexable ? {} : { 'data-nosnippet': true };
  const mouvement = animationDe(bloc, reglages);
  const anim = mouvement !== 'aucune' ? `lp-anim-${mouvement}` : '';
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
      return <PreuveSociale bloc={bloc} t={t} langue={langue} clic={clic} cible={cible} />;
    default:
      if (bloc.acces) return <Drop bloc={bloc} t={t} langue={langue} apercu={apercu} pseudo={pseudo ?? ''} clic={clic} cible={cible} />;
      if (!bloc.url) return null;
      if (bloc.vedette) {
        const teinte = bloc.teinte === 'accent' ? 'lp-accent' : '';
        if (bloc.format === 'bouton') {
          return (
            <a className={`lp-btn lp-btn-vedette ${teinte} ${anim}`} href={bloc.url} rel={rel} onClick={clic} {...cible} {...nosnippet}>
              <Pictogramme bloc={bloc} />
              <span className="lp-btn-texte">
                <span className="lp-btn-titre">{bloc.titre || bloc.url}</span>
                {bloc.sousTitre && <span className="lp-sous">{bloc.sousTitre}</span>}
              </span>
            </a>
          );
        }
        const picto = bloc.icone ? (ICONES[bloc.icone] ? <Icone nom={bloc.icone} taille={bloc.format === 'carte' ? 28 : 22} /> : bloc.icone) : null;
        const hote = nomDeDomaine(bloc.url);
        if (bloc.format === 'carte') {
          return (
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
        return (
          <a className={`lp-carte ${teinte} ${anim}`} data-format="bandeau" href={bloc.url} rel={rel} onClick={clic} {...cible} {...nosnippet}>
            {bloc.image ? <img className="lp-carte-tuile" src={bloc.image} alt="" loading="lazy" /> : picto && <span className="lp-carte-tuile" aria-hidden="true">{picto}</span>}
            <span className="lp-carte-texte">
              <span className="lp-carte-titre">{bloc.titre || hote}</span>
              {bloc.sousTitre && <span className="lp-sous">{bloc.sousTitre}</span>}
              {bloc.description && <span className="lp-carte-description">{bloc.description}</span>}
            </span>
            <span className="lp-carte-fleche" aria-hidden="true"><Icone nom="ui-fleche" taille={18} /></span>
          </a>
        );
      }
      return (
        <a className={`lp-btn ${anim}`} href={bloc.url} rel={rel} onClick={clic} {...cible} {...nosnippet}>
          <Pictogramme bloc={bloc} />
          <span className="lp-btn-texte">
            <span className="lp-btn-titre">{bloc.titre || bloc.url}</span>
            {bloc.sousTitre && <span className="lp-sous">{bloc.sousTitre}</span>}
          </span>
        </a>
      );
  }
}

const deux = (n: number) => String(n).padStart(2, '0');

/** Un lien pas encore ouvert : son titre et le temps qui reste. Son adresse n'arrive qu'à l'ouverture. */
function CompteARebours({ bloc, depart, apercu, t, langue }: { bloc: Bloc; depart: number; apercu: boolean; t: Textes; langue: LangueVisiteur }) {
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
  const quand = new Date(ouverture).toLocaleString(LOCALES[langue], { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  return (
    <div className={`lp-carte lp-rebours ${bloc.vedette && bloc.teinte === 'accent' ? 'lp-accent' : ''}`} data-format="bandeau" role="timer" aria-label={`${bloc.titre} : ${t.ouvreLe(quand)}`}>
      <span className="lp-carte-tuile" aria-hidden="true"><Icone nom={bloc.icone && ICONES[bloc.icone] ? bloc.icone : 'horloge'} taille={22} /></span>
      <span className="lp-carte-texte">
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
      const r = await fetch('/api/inscription', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: pseudo, bloc: bloc.id, email: f.get('email'), prenom: f.get('prenom') ?? '', website: f.get('website') ?? '', utm: params.get('utm_source') ?? params.get('s') ?? '', referent: document.referrer }) });
      // Les messages viennent de la page, dans la langue du visiteur ; le serveur ne donne que le statut.
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
        <form onSubmit={envoyer} noValidate data-prenom={bloc.demanderPrenom || undefined}>
          {bloc.demanderPrenom && <input name="prenom" autoComplete="given-name" placeholder={t.prenom} aria-label={t.prenomAria} maxLength={60} />}
          <input type="email" name="email" required autoComplete="email" placeholder={t.email} aria-label={t.emailAria} />
          {/* Un champ que seuls les robots remplissent. */}
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="lp-piege" />
          <button type="submit" className="lp-btn lp-btn-compact lp-accent" disabled={etat.type === 'envoi'}>{etat.type === 'envoi' ? '…' : t.inscrire}</button>
        </form>
      )}
      {etat.type === 'erreur' && <p className="lp-newsletter-erreur" role="alert">{etat.message}</p>}
      <p className="lp-mention">{t.mention} <a href="/legal/confidentialite" target="_blank" rel="noopener">{t.confidentialite}</a></p>
    </section>
  );
}

/**
 * Le mode drop : un lien qui se débloque avec un code, ou pour les premiers
 * arrivés. L'adresse n'est pas dans la page : `/api/acces` la donne une fois
 * le code vérifié et la place prise.
 */
function Drop({ bloc, t, langue, apercu, pseudo, clic, cible }: { bloc: Bloc; t: Textes; langue: LangueVisiteur; apercu: boolean; pseudo: string; clic: () => void; cible: object }) {
  const avecCode = !!bloc.acces?.code;
  const places = bloc.acces?.places ?? 0;
  const [restantes, setRestantes] = useState(bloc.restantes ?? null);
  const [ouvert, setOuvert] = useState(false);
  const [url, setUrl] = useState('');
  const [garde, setGarde] = useState(false);
  const [etat, setEtat] = useState<{ type: 'repos' | 'envoi' | 'erreur'; message?: string }>({ type: 'repos' });
  const complet = places > 0 && restantes !== null && restantes <= 0 && !url;
  const badge = url ? '' : etatPlaces(restantes, places, t, LOCALES[langue]);

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
function PreuveSociale({ bloc, t, langue, clic, cible }: { bloc: Bloc; t: Textes; langue: LangueVisiteur; clic: () => void; cible: object }) {
  const p = bloc.preuve;
  if (!p) return null;
  const locale = LOCALES[langue];
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
