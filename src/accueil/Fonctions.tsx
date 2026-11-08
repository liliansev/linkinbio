import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Avatar, Personne } from './Profils.tsx';
import { Icone } from '../components/Icone.tsx';
import { Symbole } from '../components/Logo.tsx';
import { CroquisLien, CroquisTete } from './Telephone.tsx';
import { mouvementReduit, useCompte, useGlisse } from './mouvement.ts';
import { COULEURS_SOURCES } from '../lib/stats.ts';
import { DEGRADE_COURBE, aireSous, lisse } from '../lib/courbe.ts';
import type { PointTrace } from '../lib/courbe.ts';
import type { Langue } from '../lib/types.ts';
import { useL, useLangue } from './langue.ts';
import type { Choix } from './langue.ts';
import { CHEMIN_FONCTIONS, cheminFonction } from './pages/fonctions.ts';

/*
 * Les écrans des fonctions : les liens ouverts dans leur app, la page selon
 * l'heure, un lancement, un drop, les avis, la liste e-mail, et les stats. Les
 * téléphones y sont des croquis gris : on lit le mouvement, pas un thème. Sur
 * l'accueil, il en reste « Plus loin » ; les scènes se jouent au défilement sur
 * les pages des fonctions (26 octobre 2026 : plus d'onglets à cliquer).
 */

const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

/* ---- Dans l'app ----
 * Les écrans des scènes de l'accueil d'avant, repris par les pages des fonctions
 * (`pages/PageFonction.tsx`), où le défilement les fait avancer.
 */

export type Cote = 'sans' | 'avec';
/*
 * Sans Hopla, 1 : la touche sur le lien ; 2 : le navigateur d'Instagram s'ouvre ;
 * 3 : la demande de connexion reste à l'écran, le temps de la lire ; 4 : le
 * visiteur touche la croix ; 5 : il est reparti. Avec Hopla, 1 : la touche ;
 * 2 : l'app s'ouvre ; 3 : le clip démarre ; 4 : il s'abonne. Même nombre de
 * pas des deux côtés : avec moins de mouvement, chaque scène est à sa fin.
 */
/** Le trajet du visiteur de Sacha, sans Hopla ou avec, à l'étape `etape` (1 : la touche ; sans Hopla, 2 le navigateur d'Instagram, 3 la connexion demandée, 4 la croix, 5 reparti ; avec, 2 l'app, 3 le clip, 4 abonné). */
export function EcranDansApp({ cote, etape, reduit = false }: { cote: Cote; etape: number; reduit?: boolean }) {
  const l = useL();
  return (
    <div className="hl-scene-app">
      <div className="hl-cq">
        <CroquisTete profil="sacha" />
        <div className="hl-cq-liens">
          <CroquisLien titre={l('Les jours bleus, le clip', 'Blue days, the video')} picto={<Icone nom="youtube" taille={14} />} data-touche={etape >= 1 || undefined} />
          <CroquisLien titre={l('Écouter sur Spotify', 'Listen on Spotify')} />
          <CroquisLien titre={l('Les prochaines dates', 'Upcoming shows')} />
          <CroquisLien titre={l('Le merch de la tournée', 'Tour merch')} />
          <CroquisLien titre={l('M’écrire pour un concert', 'Book me for a show')} />
        </div>
      </div>
      {cote === 'sans' ? <>
        <div className="hl-integre" data-ouvert={(etape >= 2 && (etape < 5 || reduit)) || undefined}>
          <div className="hl-integre-barre"><span className="hl-tap" data-touche={etape >= 4 || undefined}><Icone nom="ui-fermer" taille={14} /></span><span>youtube.com</span></div>
          <i className="hl-integre-charge" data-joue={etape >= 2 || undefined} />
          <div className="hl-integre-video hp-video-sacha"><Avatar profil="sacha" /></div>
          <div className="hl-cq-trait" style={{ width: '70%' }} />
          <div className="hl-cq-trait" style={{ width: '45%' }} />
          <div className="hl-integre-feuille">
            <b>{l('Connecte-toi pour continuer', 'Sign in to continue')}</b>
            <span className="hl-cq-trait" style={{ width: '80%' }} />
            <span className="hl-integre-bouton">{l('Se connecter', 'Sign in')}</span>
          </div>
        </div>
        {etape >= 5 && <p className="hl-toast" role="status">{l('Ton visiteur est reparti.', 'Your visitor left.')}</p>}
      </> : (
        <div className="hl-app" data-ouvert={etape >= 2 || undefined}>
          <div className="hl-app-barre"><Icone nom="youtube" taille={18} /><b>YouTube</b></div>
          <div className="hl-app-video hp-video-sacha"><Avatar profil="sacha" /><Icone nom="play" taille={30} /><i data-joue={etape >= 3 || undefined} /></div>
          <div className="hl-app-corps">
            <b className="hp-video-titre">{l('Les jours bleus · le clip', 'Blue days · the video')}</b>
            <div className="hl-app-ligne">
              <Avatar profil="sacha" className="hl-app-rond" /><b className="hp-chaine">Sacha Diop</b>
              <span className="hl-app-abonne hl-tap" data-touche={etape >= 4 || undefined} data-fait={etape >= 4 || undefined}>
                {etape >= 4 ? <><Icone nom="coche" taille={12} />{l('Abonné', 'Subscribed')}</> : l('S’abonner', 'Subscribe')}
              </span>
            </div>
          </div>
          <ul className="hl-app-suite" aria-hidden="true">
            {[0, 1, 2].map(k => <li key={k}><i /><span><span className="hl-app-trait" style={{ width: `${86 - k * 14}%` }} /><span className="hl-app-trait" style={{ width: '44%' }} /></span></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ---- Une page vivante ---- */

/** L'adresse que tape le visiteur de Nadia, une lettre après l'autre. */
export const ADRESSE_LISTE = 'noa@mail.fr';
/* La liste : l'adresse s'écrit (1 à 11), le bouton est touché (12), « C'est noté » (13), l'inscrit part vers Brevo (14). */
export const LISTE_TOUCHE = ADRESSE_LISTE.length + 1;
export const LISTE_NOTEE = ADRESSE_LISTE.length + 2;
export const LISTE_BREVO = ADRESSE_LISTE.length + 3;
/* Les avis : les cinq étoiles se remplissent (1 à 5), la note et le nombre d'avis (6), le mot d'une cliente (7). */
export const AVIS_NOTE = 6;
export const AVIS_MOT = 7;
const deux = (n: number) => String(n).padStart(2, '0');
/** L'heure d'une horloge : 18:00 en français, 6:00 pm en anglais. */
const horloge = (h: number, m: number, l: Choix) => l(`${deux(h)}:${deux(m)}`, `${h % 12 || 12}:${deux(m)} ${h >= 12 ? 'pm' : 'am'}`);

/** Les trois liens de Nadia selon l'heure : le soir, « Réserver un bilan » monte de la dernière place à la première. */
const LIENS_HEURE: Record<string, { titre: string; en: string; picto: string }> = {
  atelier: { titre: 'Le podcast du matin', en: 'The morning podcast', picto: 'podcast' },
  tiktok: { titre: 'Ma méthode en vidéo', en: 'My method on video', picto: 'youtube' },
  boutique: { titre: 'Réserver un bilan', en: 'Book a session', picto: 'agenda' },
};

export function EcranHeure({ heure }: { heure: number }) {
  const l = useL();
  const liste = useRef<HTMLDivElement>(null);
  const soir = heure >= 18;
  const ordre = soir ? ['boutique', 'tiktok', 'atelier'] : ['atelier', 'tiktok', 'boutique'];
  useGlisse(liste, ordre.join(), 550);
  return (
    <div className="hl-cq">
      <div className="hl-cq-horloge"><b>{horloge(heure, 0, l)}</b><span>{soir ? l('le soir', 'evening') : heure >= 14 ? l('l’après-midi', 'afternoon') : heure >= 12 ? l('le midi', 'noon') : l('le matin', 'morning')}</span></div>
      <CroquisTete profil="nadia" />
      <div className="hl-cq-liens" ref={liste}>
        {ordre.map((c, k) => <CroquisLien key={c} cle={c} titre={l(LIENS_HEURE[c].titre, LIENS_HEURE[c].en)} vedette={k === 0} picto={<Icone nom={LIENS_HEURE[c].picto} taille={14} />} />)}
      </div>
    </div>
  );
}

/** Un lancement : le compte à rebours, sans l'adresse, puis le lien qui s'ouvre à l'heure dite. L'horloge dit l'heure qu'il est : à 17:59, il ne reste que des secondes. */
export function EcranRebours({ reste }: { reste: number }) {
  const l = useL();
  const h = Math.floor(reste / 3600), m = Math.floor((reste % 3600) / 60), s = reste % 60;
  const maintenant = 18 * 3600 - reste;
  return (
    <div className="hl-cq">
      <div className="hl-cq-horloge hl-cq-horloge-petite"><b>{horloge(Math.floor(maintenant / 3600), Math.floor((maintenant % 3600) / 60), l)}</b><span>{reste > 0 ? l('avant l’ouverture', 'until opening') : l('c’est ouvert', 'it’s open')}</span></div>
      <CroquisTete profil="ines" />
      <div className="hl-cq-liens">
        {reste > 0 ? (
          <div className="hl-cq-rebours" role="timer" aria-label={l('Ma nouvelle collection ouvre ce soir à 18 h', 'My new collection opens tonight at 6 pm')}>
            <span className="hl-cq-rebours-tete"><Icone nom="horloge" taille={16} /><b>{l('Ma nouvelle collection', 'My new collection')}</b></span>
            <span className="hl-cq-rebours-chrono">{deux(h)}:{deux(m)}:{deux(s)}</span>
            <span className="hl-cq-sous">{l('Ouvre ce soir à 18 h', 'Opens tonight at 6 pm')}</span>
          </div>
        ) : <CroquisLien key="ouvert" titre={l('Ma nouvelle collection', 'My new collection')} vedette picto={<Icone nom="fusee" taille={14} />} data-arrive="" />}
        <CroquisLien titre={l('Mon dernier TikTok', 'My latest TikTok')} picto={<Icone nom="tiktok" taille={14} />} />
        <CroquisLien titre={l('Réserver un atelier', 'Book a workshop')} picto={<Icone nom="agenda" taille={14} />} />
      </div>
    </div>
  );
}

export function EcranDrop({ drop }: { drop: number }) {
  const l = useL();
  const code = l('MERCI', 'VIP25').slice(0, drop >= 2 ? 5 : drop === 1 ? 3 : 0);
  const ouvert = drop >= 2;
  return (
    <div className="hl-cq">
      <CroquisTete profil="theo" />
      <div className="hl-cq-liens">
        <CroquisLien titre={l('Mes cours en ligne', 'My online courses')} />
        <div className="hl-cq-drop" data-ouvert={ouvert || undefined}>
          <div className="hl-cq-drop-tete">
            <span key={String(ouvert)} className="hl-cq-drop-picto"><Icone nom={ouvert ? 'check' : 'cadenas'} taille={22} /></span>
            <span><b>{l('Le stage d’ouvertures', 'The openings course')}</b><span className="hl-cq-sous">{ouvert ? l('Débloqué, la place est à toi', 'Unlocked, the spot is yours') : l('Avec un code', 'With a code')}</span></span>
            <span key={drop >= 3 ? 2 : 3} className="hl-cq-places">{l(`Plus que ${drop >= 3 ? 2 : 3} places`, `Only ${drop >= 3 ? 2 : 3} spots left`)}</span>
          </div>
          {ouvert
            ? <div className="hl-cq-ouvrir">{l('Ouvrir le lien', 'Open the link')}</div>
            : <div className="hl-cq-code"><span className="hl-cq-saisie">{code}<i /></span><span className="hl-cq-ok">{l('Ouvrir', 'Open')}</span></div>}
        </div>
        <CroquisLien titre={l('Un cours particulier', 'A private lesson')} />
      </div>
    </div>
  );
}

/** Les avis d'Inès : ses étoiles se remplissent, puis sa note, le nombre d'avis et le mot d'une cliente. */
export function EcranAvis({ avis }: { avis: number }) {
  const l = useL();
  return (
    <div className="hl-cq">
      <CroquisTete profil="ines" />
      <div className="hl-cq-liens">
        <CroquisLien titre={l('Mes pièces du moment', 'My pieces of the moment')} picto={<Icone nom="instagram" taille={14} />} />
        <div className="hl-cq-avis">
          <b>{l('Ce qu’en disent mes clients', 'What my customers say')}</b>
          <span className="hl-cq-etoiles">{[1, 2, 3, 4, 5].map(n => <span key={n} data-pleine={avis >= n || undefined}><Icone nom="etoile" taille={18} /></span>)}</span>
          <span className="hl-cq-note" data-vu={avis >= AVIS_NOTE || undefined}><b>{l('4,9', '4.9')}</b> {l('sur 5 · 87 avis Google', 'out of 5 · 87 Google reviews')}</span>
        </div>
        {avis >= AVIS_MOT && <figure className="hl-cq-citation">
          <blockquote>{l('« Mon bol préféré. Je m’en sers tous les matins. »', '“My favorite bowl. I use it every morning.”')}</blockquote>
          <figcaption>{l('Julie, cliente à Lyon', 'Julie, a customer in Lyon')}</figcaption>
        </figure>}
        {avis < AVIS_MOT && <CroquisLien titre={l('Réserver un atelier', 'Book a workshop')} picto={<Icone nom="agenda" taille={14} />} />}
      </div>
    </div>
  );
}

/** La liste de Nadia : un visiteur tape son adresse, s'inscrit, et l'inscrit part vers Brevo. */
export function EcranListe({ liste }: { liste: number }) {
  const l = useL();
  const note = liste >= LISTE_NOTEE;
  return (
    <div className="hl-cq">
      <CroquisTete profil="nadia" />
      <div className="hl-cq-liens">
        <CroquisLien titre={l('Le podcast du matin', 'The morning podcast')} picto={<Icone nom="podcast" taille={14} />} />
        <div className="hl-cq-liste" data-note={note || undefined}>
          <div className="hl-cq-drop-tete">
            <span className="hl-cq-drop-picto"><Icone nom="courrier" taille={22} /></span>
            <span><b>{l('Rejoins ma liste', 'Join my list')}</b><span className="hl-cq-sous">{l('Une astuce chaque dimanche', 'A tip every Sunday')}</span></span>
          </div>
          {note
            ? <p key="note" className="hl-cq-merci"><Icone nom="coche" taille={14} />{l('C’est noté, merci !', 'Got it, thanks!')}</p>
            : <div className="hl-cq-code">
              <span className="hl-cq-saisie hl-cq-adresse">{ADRESSE_LISTE.slice(0, liste)}{liste < LISTE_TOUCHE && <i />}{liste === 0 && <span className="hl-cq-indice">{l('ton@email.fr', 'you@email.com')}</span>}</span>
              <span className="hl-cq-ok hl-cq-inscrire" data-touche={liste >= LISTE_TOUCHE || undefined}>{l('Je m’inscris', 'Sign me up')}</span>
            </div>}
        </div>
        <CroquisLien titre={l('Réserver un bilan', 'Book a session')} picto={<Icone nom="agenda" taille={14} />} />
      </div>
      {liste >= LISTE_BREVO && <p className="hl-toast hl-toast-vite"><Icone nom="coche" taille={14} />{l('Ajouté à ta liste Brevo', 'Added to your Brevo list')}</p>}
    </div>
  );
}

/* ---- Les stats ----
 * Le tableau de bord de « Plus loin », et les phrases de l'e-mail du lundi
 * (page de la fonction Stats).
 */

export type Morceau = string | { n: number; avant?: string; suite?: string };

export function Phrase({ morceaux, joue, depart, hausse }: { morceaux: Morceau[]; joue: boolean; depart: number; hausse?: boolean }) {
  const l = useL();
  let k = 0;
  return (
    <li className="hl-stat" data-joue={joue || undefined}>
      {hausse && <span className="hl-stat-hausse" style={d(depart)}><Icone nom="hausse" taille={22} /><span className="hl-cache">{l('En hausse : ', 'Up: ')}</span></span>}
      <span>
        {morceaux.map((m, i) => {
          if (typeof m === 'string') return m.split(' ').filter(Boolean).map((mot, j) => <span key={`${i}-${j}`}><span className="hl-stat-mot" style={d(depart + k++ * 30)}>{mot}</span> </span>);
          return <Nombre key={i} {...m} joue={joue} delai={depart + k++ * 30} />;
        })}
      </span>
    </li>
  );
}

/** Un nombre qui compte depuis 0 quand son mot apparaît ; avec moins de mouvement, il est là tout de suite. */
function Nombre({ n, avant = '', suite = '', joue, delai }: { n: number; avant?: string; suite?: string; joue: boolean; delai: number }) {
  const langue = useLangue();
  const [pret, setPret] = useState(false);
  useEffect(() => { if (!joue) return; const t = setTimeout(() => setPret(true), mouvementReduit() ? 0 : delai); return () => clearTimeout(t); }, [joue, delai]);
  const v = useCompte(n, pret);
  return <><span className="hl-stat-mot hl-stat-nombre" style={d(delai)}>{avant}{v.toLocaleString(langue === 'en' ? 'en-US' : 'fr-FR')}{suite}</span> </>;
}

/** Un aperçu des mêmes mesures que le dashboard, avec les chiffres de l'e-mail ci-dessous. */
function DashboardStats() {
  const l = useL();
  const vues = [42, 54, 48, 88, 62, 70, 48];
  const trace = vues.map((v, i): PointTrace => [16 + i * 78, 170 - v * 1.5]);
  const degrade = `hp-degrade-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <div className="hp-dashboard">
      <div className="hp-dashboard-titre"><b>{l('Mes statistiques', 'My stats')}</b><span>{l('7 derniers jours', 'Last 7 days')}</span></div>
      <p>{l(<>Ta page a reçu <b>18&#8239;% de vues en plus</b> cette semaine.</>, <>Your page got <b>18% more views</b> this week.</>)}</p>
      <dl className="hp-dashboard-mesures">
        {[[l('Vues', 'Views'), '412'], [l('Visiteurs', 'Visitors'), '286'], [l('Clics', 'Clicks'), '124'], [l('Taux de clic', 'Click rate'), l('30,1\u202f%', '30.1%')]].map(([nom, valeur]) => <div key={nom}><dt>{nom}</dt><dd>{valeur}</dd></div>)}
      </dl>
      <figure className="hp-dashboard-courbe">
        <figcaption>{l('Les vues, jour après jour', 'Views, day by day')}</figcaption>
        {/* Les mots de la courbe sont en HTML : une taille fixe, quelle que soit la largeur du dessin. */}
        <div className="hp-dashboard-dessin">
          <svg viewBox="0 0 500 180" role="img" aria-label={l('Vues de lundi à dimanche : 42, 54, 48, 88, 62, 70 et 48. Le meilleur jour est jeudi, avec 88 vues.', 'Views from Monday to Sunday: 42, 54, 48, 88, 62, 70 and 48. The best day is Thursday, with 88 views.')}>
            {[20, 95, 170].map(y => <line key={y} x1="16" x2="484" y1={y} y2={y} stroke="#e8e8e3" />)}
            {/* La courbe du back office, lisse sur son dégradé bleu (22 octobre 2026) : l'accueil montre l'outil tel qu'il est. */}
            <defs>
              <linearGradient id={degrade} x1="0" y1="0" x2="0" y2="1">
                {DEGRADE_COURBE.map(s => <stop key={s.arret} offset={s.arret} stopColor="#292bff" stopOpacity={s.opacite} />)}
              </linearGradient>
            </defs>
            <path d={aireSous(trace, 170)} fill={`url(#${degrade})`} />
            <path d={lisse(trace)} fill="none" stroke="#292bff" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx="250" cy="38" r="4" fill="#292bff" />
          </svg>
          <b className="hp-dashboard-pic" aria-hidden="true">88</b>
        </div>
        <div className="hp-dashboard-jours" aria-hidden="true">{l(['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'], ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map(jour => <span key={jour}>{jour}</span>)}</div>
      </figure>
      <div className="hp-dashboard-details">
        <div><p>{l('D’où viennent les visites', 'Where visits come from')}</p><ul>{([['Instagram', 'instagram', 61], ['Accès direct', 'lien', 24], ['YouTube', 'youtube', 15]] as const).map(([nom, icone, part]) => {
          // Comme au back office : le logo du réseau dans sa couleur, devant sa barre teintée, jamais posé dessus.
          const couleur = COULEURS_SOURCES[nom];
          return (
            <li key={nom} data-source="" style={couleur && { '--picto': couleur.picto, '--barre': couleur.barre } as CSSProperties}>
              <span className="hp-dashboard-source"><Icone nom={icone} taille={16} /><span><span className="hp-dashboard-barre" style={{ width: `${part}%` }} />{nom === 'Accès direct' ? l(nom, 'Direct') : nom}</span></span>
              <b>{part}{l('\u202f', '')}%</b>
            </li>
          );
        })}</ul></div>
        <div><p>{l('Les liens les plus cliqués', 'Most clicked links')}</p><ul>{l([['Mes pièces du moment', 35], ['Un samedi à l’atelier', 28], ['Les coulisses en vidéo', 19]], [['My latest pieces', 35], ['A Saturday at the studio', 28], ['Behind the scenes on video', 19]]).map(([nom, clics]) => <li key={nom}><span>{nom}</span><b>{clics}</b></li>)}</ul></div>
      </div>
    </div>
  );
}

const PLUS_LOIN_FR: { nom: string; texte: string; offre: 'starter' | 'pro'; page: string }[] = [
  { nom: 'Tes stats, en clair', texte: 'Tes vues, tes clics, d’où viennent tes visiteurs, et l’essentiel chaque lundi par e‑mail.', offre: 'starter', page: 'stats' },
  { nom: 'Ta vitrine', texte: 'Tes produits avec leur photo et leur prix, ta prise de rendez-vous, tes dons.', offre: 'starter', page: 'vitrine' },
  { nom: 'Tes lancements', texte: 'Un lien qui apparaît à l’heure dite, avec son compte à rebours.', offre: 'starter', page: 'lancement' },
  { nom: 'Tes avis clients', texte: 'Ta note Google ou Trustpilot, recopiée chaque jour.', offre: 'starter', page: 'avis' },
  { nom: 'Ta page selon l’heure', texte: 'Ton podcast le matin, ta prise de rendez-vous le soir.', offre: 'pro', page: 'page-selon-l-heure' },
  { nom: 'Tes places comptées et ta liste e‑mail', texte: 'Un lien qui s’ouvre avec un code, et des inscrits qui partent vers ta newsletter.', offre: 'pro', page: 'drops' },
];

const PLUS_LOIN_EN: typeof PLUS_LOIN_FR = [
  { nom: 'Your analytics, in plain words', texte: 'Your views, your clicks, where your visitors come from, and the essentials every Monday by email.', offre: 'starter', page: 'stats' },
  { nom: 'Your storefront', texte: 'Your products with their photo and price, your booking page, your tips.', offre: 'starter', page: 'vitrine' },
  { nom: 'Your launches', texte: 'A link that appears right on time, with its countdown.', offre: 'starter', page: 'lancement' },
  { nom: 'Your customer reviews', texte: 'Your Google or Trustpilot rating, copied over every day.', offre: 'starter', page: 'avis' },
  { nom: 'Your page by time of day', texte: 'Your podcast in the morning, your booking link in the evening.', offre: 'pro', page: 'page-selon-l-heure' },
  { nom: 'Limited spots and your email list', texte: 'A link that opens with a code, and signups sent straight to your newsletter.', offre: 'pro', page: 'drops' },
];
const PLUS_LOIN: Record<Langue, typeof PLUS_LOIN_FR> = { fr: PLUS_LOIN_FR, en: PLUS_LOIN_EN };

export function PlusLoin() {
  const langue = useLangue();
  const l = useL();
  return (
    <section className="hl-section hp-plus-loin" id="plus-loin" data-teinte="nuit" aria-labelledby="titre-plus-loin">
      <div className="hl-tete-section hl-entre">
        <h2 id="titre-plus-loin" className="hl-h2">{l(<>Quand tu veux<br /><span className="hl-cache"> </span>aller plus loin</>, <>When you want<br /><span className="hl-cache"> </span>to go further</>)}</h2>
        <p className="hl-chapo">{l('Ta page vend, compte et suit ton rythme. Sans cookie ni bannière : l’adresse IP de tes visiteurs n’est jamais gardée.', 'Your page sells, counts and keeps up with you. No cookies, no banner: your visitors’ IP address is never stored.')}</p>
      </div>
      <div className="hp-plus-loin-corps">
        <ul className="hp-plus-loin-liste">
          {PLUS_LOIN[langue].map((f, i) => (
            <li key={f.nom} className="hl-entre" style={d(i * 50)}>
              <a href={cheminFonction(f.page, langue)} className="hp-plus-loin-nom"><b>{f.nom}</b></a>
              <span>{f.texte}</span>
            </li>
          ))}
          <li className="hp-plus-loin-tout hl-entre"><a href={CHEMIN_FONCTIONS[langue]}>{l('Toutes les fonctionnalités, une page chacune', 'Every feature, one page each')}</a></li>
        </ul>
        <article className="hl-mail hp-doc-dashboard hl-entre" aria-label={l('Exemple de tableau de bord', 'Sample dashboard')}>
          <div className="hl-mail-tete"><Symbole className="hl-mail-logo" /><b>Hopla</b></div>
          <Personne profil="ines" />
          <DashboardStats />
          <p className="hl-gris hl-petit">{l('Chiffres d’exemple.', 'Sample figures.')}</p>
        </article>
      </div>
    </section>
  );
}
