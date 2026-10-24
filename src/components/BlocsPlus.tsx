import { useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import type { Bloc } from '../lib/types.ts';
import type { Textes } from '../lib/mots.ts';
import type { Lecteur as InfosLecteur } from '../lib/lecteurs.ts';
import { lecteurDe } from '../lib/lecteurs.ts';
import { jetonTurnstile, preparerTurnstile } from '../lib/turnstile.ts';
import { Icone } from './Icone.tsx';

/*
 * Les blocs venus de Linktree (24 octobre 2026) : un lecteur de musique ou de podcast, une vidéo Vimeo ou TikTok, une
 * galerie, des questions fréquentes, une carte de visite, une adresse et « Me contacter ». Chacun garde la grammaire de
 * la page : une carte à la couleur des boutons, son picto seul, son titre dans la police des cartes du thème. Rien d'un
 * autre site ne se charge avant le toucher du visiteur (un lecteur, la carte).
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** La tête d'une carte : son picto seul, son titre, son sous-titre. */
function TeteCarte({ picto, titre, sous }: { picto: string; titre: string; sous?: string }) {
  return (
    <div className="lp-newsletter-tete">
      <span className="lp-newsletter-picto" aria-hidden="true"><Icone nom={picto} taille={26} /></span>
      <span className="lp-newsletter-textes">
        <h2 className="lp-newsletter-titre">{titre}</h2>
        {sous && <p className="lp-sous">{sous}</p>}
      </span>
    </div>
  );
}

/**
 * Une vidéo Vimeo ou TikTok : sa vignette (lue sur son site par l'éditeur) et le triangle ; le lecteur ne se charge
 * qu'au toucher. Une vidéo TikTok est verticale.
 */
export function VideoIntegree({ lecteur, bloc, clic, t }: { lecteur: InfosLecteur; bloc: Bloc; clic: () => void; t: Textes }) {
  const [joue, setJoue] = useState(false);
  const [cassee, setCassee] = useState(false);
  const vertical = lecteur.forme === 'vertical';
  return (
    <figure className="lp-video" data-forme={vertical ? 'vertical' : undefined}>
      <div className="lp-video-cadre">
        {joue ? (
          <iframe src={lecteur.adresse} title={bloc.titre} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
        ) : (
          <button type="button" className="lp-video-jouer" onClick={() => { setJoue(true); clic(); }} aria-label={t.lireVideo(bloc.titre)}>
            {bloc.image && !cassee
              ? <img src={bloc.image} alt="" loading="lazy" onError={() => setCassee(true)} />
              : <span className="lp-video-service" aria-hidden="true"><Icone nom={lecteur.service} taille={34} /></span>}
            <span className="lp-video-play"><Icone nom="play" taille={52} /></span>
          </button>
        )}
      </div>
      <figcaption>{bloc.titre}</figcaption>
    </figure>
  );
}

/**
 * Un titre, un album, une playlist ou un podcast : une carte avec sa pochette (ou le logo du service) et un triangle ;
 * au toucher, le lecteur du service prend sa place, à sa hauteur.
 */
export function Musique({ bloc, clic, t }: { bloc: Bloc; clic: () => void; t: Textes }) {
  const [joue, setJoue] = useState(false);
  const lecteur = lecteurDe(bloc.url);
  if (!lecteur) return bloc.url ? <a className="lp-btn" href={bloc.url} rel="noopener" onClick={clic}><span className="lp-btn-texte"><span className="lp-btn-titre">{bloc.titre}</span></span></a> : null;
  const hauteur = typeof lecteur.forme === 'number' ? lecteur.forme : 352;
  if (joue) {
    return (
      <div className="lp-lecteur-cadre" style={{ '--hauteur': `${hauteur}px` } as CSSProperties}>
        <iframe src={lecteur.adresse} title={bloc.titre} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
      </div>
    );
  }
  return (
    <button type="button" className={`lp-carte lp-lecteur ${bloc.vedette ? 'lp-accent' : ''}`} data-format="bandeau" onClick={() => { setJoue(true); clic(); }}
      aria-label={t.ecouter(bloc.titre, lecteur.nom)}>
      {bloc.image
        ? <img className="lp-carte-tuile" src={bloc.image} alt="" loading="lazy" />
        : <span className="lp-carte-picto" aria-hidden="true"><Icone nom={lecteur.service} taille={26} /></span>}
      <span className="lp-carte-texte">
        <span className="lp-carte-titre">{bloc.titre}</span>
        <span className="lp-sous">{bloc.sousTitre || lecteur.nom}</span>
      </span>
      <span className="lp-lecteur-play" aria-hidden="true"><Icone nom="play" taille={22} /></span>
    </button>
  );
}

/** Des photos qui défilent d'un geste, l'une à côté de l'autre ; la suivante dépasse, pour dire qu'il y en a d'autres. */
export function Galerie({ bloc, t }: { bloc: Bloc; t: Textes }) {
  const rail = useRef<HTMLUListElement>(null);
  if (!bloc.images.length) return null;
  const total = bloc.images.length;
  const defiler = (sens: -1 | 1) => {
    const r = rail.current;
    if (!r) return;
    const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
    r.scrollBy({ left: sens * r.clientWidth * 0.85, behavior: reduit ? 'instant' : 'smooth' });
  };
  return (
    <figure className="lp-galerie" data-seule={total === 1 || undefined}>
      <ul ref={rail} className="lp-galerie-rail" tabIndex={total > 1 ? 0 : undefined} aria-label={bloc.titre || undefined}>
        {bloc.images.map((src, i) => (
          <li key={src + i}><img src={src} alt={t.photo(i + 1, total)} loading={i < 2 ? 'eager' : 'lazy'} draggable={false} /></li>
        ))}
      </ul>
      {total > 1 && (
        <div className="lp-galerie-fleches">
          <button type="button" onClick={() => defiler(-1)} aria-label={t.photoPrecedente}><Icone nom="ui-chevron" taille={18} /></button>
          <button type="button" onClick={() => defiler(1)} aria-label={t.photoSuivante}><Icone nom="ui-chevron" taille={18} /></button>
        </div>
      )}
      {bloc.titre && <figcaption>{bloc.titre}</figcaption>}
    </figure>
  );
}

/** Les questions fréquentes, en accordéon : chaque question s'ouvre seule, sans script (`details`). */
export function Faq({ bloc }: { bloc: Bloc }) {
  const questions = bloc.questions.filter(q => q.question && q.reponse);
  if (!questions.length) return null;
  return (
    <section className="lp-newsletter lp-faq">
      <TeteCarte picto="bloc-faq" titre={bloc.titre} />
      <div className="lp-faq-liste">
        {questions.map((q, i) => (
          <details key={i} className="lp-faq-q">
            <summary><span>{q.question}</span><Icone nom="ui-chevron" taille={18} /></summary>
            <p>{q.reponse}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/**
 * Une carte de visite : le nom, le poste et la société, le numéro et l'adresse e-mail d'un toucher, et « Enregistrer le
 * contact », un fichier vCard que le téléphone range dans ses contacts (sans script aussi : c'est un lien).
 */
export function CarteVisite({ bloc, pseudo, clic, t }: { bloc: Bloc; pseudo: string; clic: () => void; t: Textes }) {
  const c = bloc.coordonnees;
  if (!c || !bloc.titre) return null;
  const sous = [c.poste, c.societe].filter(Boolean).join(' · ');
  const tel = c.telephone ? `tel:${c.telephone.replace(/[^\d+]/g, '')}` : '';
  const site = /^https?:/.test(bloc.url) ? bloc.url : '';
  const lignes = [
    tel && { href: tel, picto: 'telephone', texte: c.telephone, nom: t.appeler },
    c.email && { href: `mailto:${c.email}`, picto: 'courrier', texte: c.email, nom: t.ecrire },
    site && { href: site, picto: 'site', texte: site.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), nom: '' },
  ].filter(Boolean) as { href: string; picto: string; texte: string; nom: string }[];
  return (
    <section className="lp-newsletter lp-coordonnees">
      <TeteCarte picto="bloc-coordonnees" titre={bloc.titre} sous={sous} />
      {(lignes.length > 0 || bloc.adressePostale) && (
        <ul className="lp-coordonnees-lignes">
          {lignes.map(l => (
            <li key={l.href}><a href={l.href} rel="noopener" aria-label={l.nom ? `${l.nom} : ${l.texte}` : undefined}><Icone nom={l.picto} taille={18} /><span>{l.texte}</span></a></li>
          ))}
          {bloc.adressePostale && <li><span className="lp-coordonnees-adresse"><Icone nom="lieu" taille={18} /><span>{bloc.adressePostale}</span></span></li>}
        </ul>
      )}
      <a className="lp-btn lp-btn-compact lp-accent lp-coordonnees-enregistrer" href={`/api/vcard?page=${encodeURIComponent(pseudo)}&bloc=${encodeURIComponent(bloc.id)}`} download onClick={clic} rel="nofollow">
        <Icone nom="ajouterContact" taille={18} />{t.enregistrerContact}
      </a>
    </section>
  );
}

/** Une adresse : le lieu, l'itinéraire d'un toucher, et la carte, qui ne se charge que si on la demande. */
export function Lieu({ bloc, clic, t }: { bloc: Bloc; clic: () => void; t: Textes }) {
  const [carte, setCarte] = useState(false);
  if (!bloc.adressePostale) return null;
  const q = encodeURIComponent(bloc.adressePostale.replace(/\s*\n\s*/g, ', '));
  return (
    <section className="lp-newsletter lp-lieu">
      <TeteCarte picto="lieu" titre={bloc.titre || bloc.adressePostale.split('\n')[0]} sous={bloc.titre ? bloc.adressePostale : bloc.adressePostale.split('\n').slice(1).join('\n')} />
      {carte && (
        <div className="lp-lieu-carte">
          <iframe src={`https://maps.google.com/maps?q=${q}&output=embed`} title={t.carteDe(bloc.titre || bloc.adressePostale)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>
      )}
      <div className="lp-lieu-gestes">
        <a className="lp-btn lp-btn-compact lp-accent" href={`https://www.google.com/maps/dir/?api=1&destination=${q}`} target="_blank" rel="noopener" onClick={clic}>{t.itineraire}</a>
        {!carte && <button type="button" className="lp-lieu-voir" onClick={() => setCarte(true)}>{t.voirCarte}</button>}
      </div>
    </section>
  );
}

/** « Me contacter » : un nom, une adresse, un message ; il part dans la boîte du propriétaire, dont l'adresse reste cachée. */
export function Contact({ bloc, apercu, pseudo, t }: { bloc: Bloc; apercu: boolean; pseudo: string; t: Textes }) {
  const [etat, setEtat] = useState<{ type: 'repos' | 'envoi' | 'ok' | 'erreur'; message?: string; champ?: 'email' | 'message' }>({ type: 'repos' });
  async function envoyer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (apercu) { setEtat({ type: 'ok', message: t.apercu }); return; }
    const f = new FormData(event.currentTarget);
    if (!EMAIL.test(String(f.get('email') ?? '').trim())) { setEtat({ type: 'erreur', message: t.emailInvalide, champ: 'email' }); return; }
    if (String(f.get('message') ?? '').trim().length < 2) { setEtat({ type: 'erreur', message: t.messageVide, champ: 'message' }); return; }
    setEtat({ type: 'envoi' });
    try {
      const jeton = await jetonTurnstile('message');
      const r = await fetch('/api/message', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: pseudo, bloc: bloc.id, nom: f.get('nom') ?? '', email: f.get('email'), message: f.get('message'), website: f.get('website') ?? '', jeton }) });
      setEtat(r.ok ? { type: 'ok', message: t.envoye } : { type: 'erreur', message: r.status === 400 ? t.emailInvalide : r.status === 429 ? t.tropDEssais : r.status === 404 ? t.indisponible : t.echec });
    } catch { setEtat({ type: 'erreur', message: t.echec }); }
  }
  const erreurId = `${bloc.id}-erreur`;
  const faux = (champ: 'email' | 'message') => (etat.type === 'erreur' && etat.champ === champ ? { 'aria-invalid': true, 'aria-describedby': erreurId } : {});
  return (
    <section className="lp-newsletter lp-contact">
      <TeteCarte picto="bloc-formulaire" titre={bloc.titre} sous={bloc.sousTitre} />
      {etat.type === 'ok' ? <p className="lp-newsletter-ok" role="status">{etat.message}</p> : (
        <form className="lp-contact-form" onSubmit={envoyer} noValidate onFocus={apercu ? undefined : () => preparerTurnstile('message')}>
          <input name="nom" autoComplete="name" placeholder={t.nom} aria-label={t.nomAria} maxLength={80} />
          <input type="email" name="email" required autoComplete="email" placeholder={t.email} aria-label={t.emailAria} maxLength={200} {...faux('email')} />
          <textarea name="message" required rows={4} placeholder={t.message} aria-label={t.messageAria} maxLength={3000} {...faux('message')} />
          {/* Un champ que seuls les robots remplissent. */}
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="lp-piege" />
          <button type="submit" className="lp-btn lp-btn-compact lp-accent" disabled={etat.type === 'envoi'}>{etat.type === 'envoi' ? '…' : t.envoyer}</button>
        </form>
      )}
      {etat.type === 'erreur' && <p id={erreurId} className="lp-newsletter-erreur" role="alert">{etat.message}</p>}
      {etat.type !== 'ok' && <p className="lp-mention">{t.mentionMessage} <a href="/legal/confidentialite" target="_blank" rel="noopener">{t.confidentialite}</a></p>}
    </section>
  );
}
