import { useEffect, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import type { Bloc, PagePublique } from '../lib/types.ts';
import { ORIGINE_PUBLIQUE, animationDe, idYoutube, urlPage } from '../lib/types.ts';
import type { Reglages } from '../lib/types.ts';
import { themeParId, variablesTheme } from '../lib/themes.ts';
import { ICONES } from '../lib/icones.ts';
import { Icone, NOMS_RESEAUX } from './Icone.tsx';

/*
 * La page publique, rendue côté serveur pour Google et les aperçus de liens,
 * et réutilisée telle quelle dans l'aperçu du back office (`apercu`). Le thème
 * pose ses couleurs en variables CSS ; le style et la forme des boutons sont
 * deux attributs que `page.css` lit.
 */

function suivre(page: string, type: 'vue' | 'clic', bloc?: string) {
  try {
    const params = new URLSearchParams(location.search);
    const corps = JSON.stringify({ page, type, bloc, utm: params.get('utm_source') ?? params.get('s') ?? '', referent: document.referrer });
    const blob = new Blob([corps], { type: 'text/plain' });
    if (!navigator.sendBeacon?.('/api/evenement', blob)) fetch('/api/evenement', { method: 'POST', body: corps, keepalive: true }).catch(() => {});
  } catch { /* les statistiques ne doivent jamais gêner la visite */ }
}

export function PageLiens({ page, apercu = false }: { page: PagePublique; apercu?: boolean }) {
  const { reglages, blocs, compte } = page;
  // La page de Lilian s'annonce sans pseudo ; les autres avec le leur.
  const pseudo = compte.principal ? '' : compte.pseudo;
  const theme = themeParId(reglages.theme);
  const [toast, setToast] = useState('');

  useEffect(() => { if (!apercu) suivre(pseudo, 'vue'); }, [apercu, pseudo]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2200); return () => clearTimeout(t); }, [toast]);

  const clic = (bloc: Bloc) => {
    if (apercu) return;
    suivre(pseudo, 'clic', bloc.id);
  };
  const cible = apercu ? { target: '_blank' } : {};

  async function partager() {
    const url = apercu ? urlPage(compte) : location.href.split('?')[0];
    try {
      if (navigator.share) { await navigator.share({ title: reglages.seo.titre || reglages.profil.nom, url }); return; }
      await navigator.clipboard.writeText(url);
      setToast('Lien copié');
    } catch { /* partage annulé */ }
  }

  const reseaux = reglages.reseaux.some(r => r.url) && (
    <nav className="lp-reseaux" aria-label="Réseaux">
      {reglages.reseaux.filter(r => r.url).map(r => (
        <a key={r.reseau + r.url} href={r.url} aria-label={NOMS_RESEAUX[r.reseau]} rel="me noopener" {...cible}>
          <Icone nom={r.reseau} taille={22} />
        </a>
      ))}
    </nav>
  );

  return (
    <div className="lp" style={variablesTheme(theme) as CSSProperties} data-bouton={reglages.bouton.style} data-forme={reglages.bouton.forme} data-police={theme.police} data-bureau={reglages.bureau}>
      <div className="lp-scene">
      <div className="lp-col">
        {reglages.partage && (
          <button type="button" className="lp-partager" onClick={partager} aria-label="Partager cette page">
            <Icone nom="partage" taille={18} />
          </button>
        )}
        <header className="lp-tete">
          {reglages.profil.avatar && <img className="lp-avatar" src={reglages.profil.avatar} alt="" width={96} height={96} />}
          <h1 className="lp-nom">
            {reglages.profil.nom}
            {reglages.profil.badge && <span className="lp-badge" title="Compte vérifié"><Icone nom="badge" taille={20} /></span>}
          </h1>
          {reglages.profil.bio && <p className="lp-bio">{reglages.profil.bio}</p>}
          {reglages.reseauxPosition === 'haut' && reseaux}
        </header>

        <main className="lp-blocs">
          {blocs.map((bloc, i) => (
            <div key={bloc.id} className="lp-bloc" data-type={bloc.type} data-vedette={bloc.vedette ? bloc.format : undefined} style={{ '--i': i } as CSSProperties}>
              <BlocPublic bloc={bloc} reglages={reglages} clic={() => clic(bloc)} cible={cible} apercu={apercu} />
            </div>
          ))}
          {blocs.length === 0 && <p className="lp-texte">Rien ici pour l’instant.</p>}
        </main>

        {reglages.reseauxPosition === 'bas' && <footer className="lp-pied">{reseaux}</footer>}
        <p className="lp-signature">{compte.principal
          ? <a href="https://liliansevoumian.fr" {...cible}>liliansevoumian.fr</a>
          : <>
            {/* La mention disparaît en Pro ; les liens légaux restent sur toutes les pages. */}
            {!compte.pro && <a href={ORIGINE_PUBLIQUE} {...cible}>Une page faite avec Hopla</a>}
            <span className="lp-legal">
              <a href="/legal/confidentialite" {...cible}>Confidentialité</a>
              <a href={`/signaler?page=${compte.pseudo}`} rel="nofollow" {...cible}>Signaler</a>
            </span>
          </>}</p>
      </div>
      </div>
      {toast && <div className="lp-toast" role="status">{toast}</div>}
    </div>
  );
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

export function BlocPublic({ bloc, reglages, clic, cible, apercu }: { bloc: Bloc; reglages: Reglages; clic: () => void; cible: object; apercu: boolean }) {
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
    default:
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

function Newsletter({ bloc, apercu }: { bloc: Bloc; apercu: boolean }) {
  const [etat, setEtat] = useState<{ type: 'repos' | 'envoi' | 'ok' | 'erreur'; message?: string }>({ type: 'repos' });
  async function envoyer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (apercu) { setEtat({ type: 'ok', message: 'Dans l’aperçu, rien n’est envoyé.' }); return; }
    const email = String(new FormData(event.currentTarget).get('email') ?? '');
    setEtat({ type: 'envoi' });
    try {
      const r = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, website: '' }) });
      const corps = await r.json().catch(() => ({}));
      setEtat(r.ok ? { type: 'ok', message: corps.message ?? 'C’est noté, regardez votre boîte.' } : { type: 'erreur', message: corps.message ?? 'L’inscription n’est pas passée. Réessayez.' });
    } catch { setEtat({ type: 'erreur', message: 'L’inscription n’est pas passée. Réessayez.' }); }
  }
  return (
    <section className="lp-newsletter">
      <h2 className="lp-newsletter-titre">{bloc.titre}</h2>
      {bloc.sousTitre && <p className="lp-sous">{bloc.sousTitre}</p>}
      {etat.type === 'ok' ? <p className="lp-newsletter-ok" role="status">{etat.message}</p> : (
        <form onSubmit={envoyer}>
          <input type="email" name="email" required autoComplete="email" placeholder="votre@email.fr" aria-label="Votre adresse e-mail" />
          <button type="submit" className="lp-btn lp-btn-compact" disabled={etat.type === 'envoi'}>{etat.type === 'envoi' ? '…' : 'S’inscrire'}</button>
        </form>
      )}
      {etat.type === 'erreur' && <p className="lp-newsletter-erreur" role="alert">{etat.message}</p>}
    </section>
  );
}
