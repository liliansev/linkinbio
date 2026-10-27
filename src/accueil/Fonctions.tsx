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
  return (
    <div className="hl-scene-app">
      <div className="hl-cq">
        <CroquisTete profil="sacha" />
        <div className="hl-cq-liens">
          <CroquisLien titre="Les jours bleus, le clip" picto={<Icone nom="youtube" taille={14} />} data-touche={etape >= 1 || undefined} />
          <CroquisLien titre="Écouter sur Spotify" />
          <CroquisLien titre="Les prochaines dates" />
          <CroquisLien titre="Le merch de la tournée" />
          <CroquisLien titre="M’écrire pour un concert" />
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
            <b>Connecte-toi pour continuer</b>
            <span className="hl-cq-trait" style={{ width: '80%' }} />
            <span className="hl-integre-bouton">Se connecter</span>
          </div>
        </div>
        {etape >= 5 && <p className="hl-toast" role="status">Ton visiteur est reparti.</p>}
      </> : (
        <div className="hl-app" data-ouvert={etape >= 2 || undefined}>
          <div className="hl-app-barre"><Icone nom="youtube" taille={18} /><b>YouTube</b></div>
          <div className="hl-app-video hp-video-sacha"><Avatar profil="sacha" /><Icone nom="play" taille={30} /><i data-joue={etape >= 3 || undefined} /></div>
          <div className="hl-app-corps">
            <b className="hp-video-titre">Les jours bleus · le clip</b>
            <div className="hl-app-ligne">
              <Avatar profil="sacha" className="hl-app-rond" /><b className="hp-chaine">Sacha Diop</b>
              <span className="hl-app-abonne hl-tap" data-touche={etape >= 4 || undefined} data-fait={etape >= 4 || undefined}>
                {etape >= 4 ? <><Icone nom="coche" taille={12} />Abonné</> : 'S’abonner'}
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

/** Les trois liens de Nadia selon l'heure : le soir, « Réserver un bilan » monte de la dernière place à la première. */
const LIENS_HEURE: Record<string, { titre: string; picto: string }> = {
  atelier: { titre: 'Le podcast du matin', picto: 'podcast' },
  tiktok: { titre: 'Ma méthode en vidéo', picto: 'youtube' },
  boutique: { titre: 'Réserver un bilan', picto: 'agenda' },
};

export function EcranHeure({ heure }: { heure: number }) {
  const liste = useRef<HTMLDivElement>(null);
  const soir = heure >= 18;
  const ordre = soir ? ['boutique', 'tiktok', 'atelier'] : ['atelier', 'tiktok', 'boutique'];
  useGlisse(liste, ordre.join(), 550);
  return (
    <div className="hl-cq">
      <div className="hl-cq-horloge"><b>{deux(heure)}:00</b><span>{soir ? 'le soir' : heure >= 14 ? 'l’après-midi' : heure >= 12 ? 'le midi' : 'le matin'}</span></div>
      <CroquisTete profil="nadia" />
      <div className="hl-cq-liens" ref={liste}>
        {ordre.map((c, k) => <CroquisLien key={c} cle={c} titre={LIENS_HEURE[c].titre} vedette={k === 0} picto={<Icone nom={LIENS_HEURE[c].picto} taille={14} />} />)}
      </div>
    </div>
  );
}

/** Un lancement : le compte à rebours, sans l'adresse, puis le lien qui s'ouvre à l'heure dite. L'horloge dit l'heure qu'il est : à 17:59, il ne reste que des secondes. */
export function EcranRebours({ reste }: { reste: number }) {
  const h = Math.floor(reste / 3600), m = Math.floor((reste % 3600) / 60), s = reste % 60;
  const maintenant = 18 * 3600 - reste;
  return (
    <div className="hl-cq">
      <div className="hl-cq-horloge hl-cq-horloge-petite"><b>{deux(Math.floor(maintenant / 3600))}:{deux(Math.floor((maintenant % 3600) / 60))}</b><span>{reste > 0 ? 'avant l’ouverture' : 'c’est ouvert'}</span></div>
      <CroquisTete profil="ines" />
      <div className="hl-cq-liens">
        {reste > 0 ? (
          <div className="hl-cq-rebours" role="timer" aria-label="Ma nouvelle collection ouvre ce soir à 18 h">
            <span className="hl-cq-rebours-tete"><Icone nom="horloge" taille={16} /><b>Ma nouvelle collection</b></span>
            <span className="hl-cq-rebours-chrono">{deux(h)}:{deux(m)}:{deux(s)}</span>
            <span className="hl-cq-sous">Ouvre ce soir à 18 h</span>
          </div>
        ) : <CroquisLien key="ouvert" titre="Ma nouvelle collection" vedette picto={<Icone nom="fusee" taille={14} />} data-arrive="" />}
        <CroquisLien titre="Mon dernier TikTok" picto={<Icone nom="tiktok" taille={14} />} />
        <CroquisLien titre="Réserver un atelier" picto={<Icone nom="agenda" taille={14} />} />
      </div>
    </div>
  );
}

export function EcranDrop({ drop }: { drop: number }) {
  const code = 'MERCI'.slice(0, drop >= 2 ? 5 : drop === 1 ? 3 : 0);
  const ouvert = drop >= 2;
  return (
    <div className="hl-cq">
      <CroquisTete profil="theo" />
      <div className="hl-cq-liens">
        <CroquisLien titre="Mes cours en ligne" />
        <div className="hl-cq-drop" data-ouvert={ouvert || undefined}>
          <div className="hl-cq-drop-tete">
            <span key={String(ouvert)} className="hl-cq-drop-picto"><Icone nom={ouvert ? 'check' : 'cadenas'} taille={22} /></span>
            <span><b>Le stage d’ouvertures</b><span className="hl-cq-sous">{ouvert ? 'Débloqué, la place est à toi' : 'Avec un code'}</span></span>
            <span key={drop >= 3 ? 2 : 3} className="hl-cq-places">Plus que {drop >= 3 ? 2 : 3} places</span>
          </div>
          {ouvert
            ? <div className="hl-cq-ouvrir">Ouvrir le lien</div>
            : <div className="hl-cq-code"><span className="hl-cq-saisie">{code}<i /></span><span className="hl-cq-ok">Ouvrir</span></div>}
        </div>
        <CroquisLien titre="Un cours particulier" />
      </div>
    </div>
  );
}

/** Les avis d'Inès : ses étoiles se remplissent, puis sa note, le nombre d'avis et le mot d'une cliente. */
export function EcranAvis({ avis }: { avis: number }) {
  return (
    <div className="hl-cq">
      <CroquisTete profil="ines" />
      <div className="hl-cq-liens">
        <CroquisLien titre="Mes pièces du moment" picto={<Icone nom="instagram" taille={14} />} />
        <div className="hl-cq-avis">
          <b>Ce qu’en disent mes clients</b>
          <span className="hl-cq-etoiles">{[1, 2, 3, 4, 5].map(n => <span key={n} data-pleine={avis >= n || undefined}><Icone nom="etoile" taille={18} /></span>)}</span>
          <span className="hl-cq-note" data-vu={avis >= AVIS_NOTE || undefined}><b>4,9</b> sur 5 · 87 avis Google</span>
        </div>
        {avis >= AVIS_MOT && <figure className="hl-cq-citation">
          <blockquote>« Mon bol préféré. Je m’en sers tous les matins. »</blockquote>
          <figcaption>Julie, cliente à Lyon</figcaption>
        </figure>}
        {avis < AVIS_MOT && <CroquisLien titre="Réserver un atelier" picto={<Icone nom="agenda" taille={14} />} />}
      </div>
    </div>
  );
}

/** La liste de Nadia : un visiteur tape son adresse, s'inscrit, et l'inscrit part vers Brevo. */
export function EcranListe({ liste }: { liste: number }) {
  const note = liste >= LISTE_NOTEE;
  return (
    <div className="hl-cq">
      <CroquisTete profil="nadia" />
      <div className="hl-cq-liens">
        <CroquisLien titre="Le podcast du matin" picto={<Icone nom="podcast" taille={14} />} />
        <div className="hl-cq-liste" data-note={note || undefined}>
          <div className="hl-cq-drop-tete">
            <span className="hl-cq-drop-picto"><Icone nom="courrier" taille={22} /></span>
            <span><b>Rejoins ma liste</b><span className="hl-cq-sous">Une astuce chaque dimanche</span></span>
          </div>
          {note
            ? <p key="note" className="hl-cq-merci"><Icone nom="coche" taille={14} />C’est noté, merci !</p>
            : <div className="hl-cq-code">
              <span className="hl-cq-saisie hl-cq-adresse">{ADRESSE_LISTE.slice(0, liste)}{liste < LISTE_TOUCHE && <i />}{liste === 0 && <span className="hl-cq-indice">ton@email.fr</span>}</span>
              <span className="hl-cq-ok hl-cq-inscrire" data-touche={liste >= LISTE_TOUCHE || undefined}>Je m’inscris</span>
            </div>}
        </div>
        <CroquisLien titre="Réserver un bilan" picto={<Icone nom="agenda" taille={14} />} />
      </div>
      {liste >= LISTE_BREVO && <p className="hl-toast hl-toast-vite"><Icone nom="coche" taille={14} />Ajouté à ta liste Brevo</p>}
    </div>
  );
}

/* ---- Les stats ----
 * Le tableau de bord de « Plus loin », et les phrases de l'e-mail du lundi
 * (page de la fonction Stats).
 */

export type Morceau = string | { n: number; avant?: string; suite?: string };

export function Phrase({ morceaux, joue, depart, hausse }: { morceaux: Morceau[]; joue: boolean; depart: number; hausse?: boolean }) {
  let k = 0;
  return (
    <li className="hl-stat" data-joue={joue || undefined}>
      {hausse && <span className="hl-stat-hausse" style={d(depart)}><Icone nom="hausse" taille={22} /><span className="hl-cache">En hausse : </span></span>}
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
  const [pret, setPret] = useState(false);
  useEffect(() => { if (!joue) return; const t = setTimeout(() => setPret(true), mouvementReduit() ? 0 : delai); return () => clearTimeout(t); }, [joue, delai]);
  const v = useCompte(n, pret);
  return <><span className="hl-stat-mot hl-stat-nombre" style={d(delai)}>{avant}{v.toLocaleString('fr-FR')}{suite}</span> </>;
}

/** Un aperçu des mêmes mesures que le dashboard, avec les chiffres de l'e-mail ci-dessous. */
function DashboardStats() {
  const vues = [42, 54, 48, 88, 62, 70, 48];
  const trace = vues.map((v, i): PointTrace => [16 + i * 78, 170 - v * 1.5]);
  const degrade = `hp-degrade-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <div className="hp-dashboard">
      <div className="hp-dashboard-titre"><b>Mes statistiques</b><span>7 derniers jours</span></div>
      <p>Ta page a reçu <b>18&#8239;% de vues en plus</b> cette semaine.</p>
      <dl className="hp-dashboard-mesures">
        {[['Vues', '412'], ['Visiteurs', '286'], ['Clics', '124'], ['Taux de clic', '30,1\u202f%']].map(([nom, valeur]) => <div key={nom}><dt>{nom}</dt><dd>{valeur}</dd></div>)}
      </dl>
      <figure className="hp-dashboard-courbe">
        <figcaption>Les vues, jour après jour</figcaption>
        {/* Les mots de la courbe sont en HTML : une taille fixe, quelle que soit la largeur du dessin. */}
        <div className="hp-dashboard-dessin">
          <svg viewBox="0 0 500 180" role="img" aria-label="Vues de lundi à dimanche : 42, 54, 48, 88, 62, 70 et 48. Le meilleur jour est jeudi, avec 88 vues.">
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
        <div className="hp-dashboard-jours" aria-hidden="true">{['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(jour => <span key={jour}>{jour}</span>)}</div>
      </figure>
      <div className="hp-dashboard-details">
        <div><p>D’où viennent les visites</p><ul>{([['Instagram', 'instagram', 61], ['Accès direct', 'lien', 24], ['YouTube', 'youtube', 15]] as const).map(([nom, icone, part]) => {
          // Comme au back office : le logo du réseau dans sa couleur, devant sa barre teintée, jamais posé dessus.
          const couleur = COULEURS_SOURCES[nom];
          return (
            <li key={nom} data-source="" style={couleur && { '--picto': couleur.picto, '--barre': couleur.barre } as CSSProperties}>
              <span className="hp-dashboard-source"><Icone nom={icone} taille={16} /><span><span className="hp-dashboard-barre" style={{ width: `${part}%` }} />{nom}</span></span>
              <b>{part}&#8239;%</b>
            </li>
          );
        })}</ul></div>
        <div><p>Les liens les plus cliqués</p><ul>{[['Mes pièces du moment', 35], ['Un samedi à l’atelier', 28], ['Les coulisses en vidéo', 19]].map(([nom, clics]) => <li key={nom}><span>{nom}</span><b>{clics}</b></li>)}</ul></div>
      </div>
    </div>
  );
}

const PLUS_LOIN: { nom: string; texte: string; offre: 'starter' | 'pro'; page: string }[] = [
  { nom: 'Tes stats, en clair', texte: 'Tes vues, tes clics, d’où viennent tes visiteurs, et l’essentiel chaque lundi par e‑mail.', offre: 'starter', page: 'stats' },
  { nom: 'Ta vitrine', texte: 'Tes produits avec leur photo et leur prix, ta prise de rendez-vous, tes dons.', offre: 'starter', page: 'vitrine' },
  { nom: 'Tes lancements', texte: 'Un lien qui apparaît à l’heure dite, avec son compte à rebours.', offre: 'starter', page: 'lancement' },
  { nom: 'Tes avis clients', texte: 'Ta note Google ou Trustpilot, recopiée chaque jour.', offre: 'starter', page: 'avis' },
  { nom: 'Ta page selon l’heure', texte: 'Ton podcast le matin, ta prise de rendez-vous le soir.', offre: 'pro', page: 'page-selon-l-heure' },
  { nom: 'Tes places comptées et ta liste e‑mail', texte: 'Un lien qui s’ouvre avec un code, et des inscrits qui partent vers ta newsletter.', offre: 'pro', page: 'drops' },
];

export function PlusLoin() {
  return (
    <section className="hl-section hp-plus-loin" id="plus-loin" data-teinte="nuit" aria-labelledby="titre-plus-loin">
      <div className="hl-tete-section hl-entre">
        <h2 id="titre-plus-loin" className="hl-h2">Quand tu veux<br /><span className="hl-cache"> </span>aller plus loin</h2>
        <p className="hl-chapo">Ta page vend, compte et suit ton rythme. Sans cookie ni bannière : l’adresse IP de tes visiteurs n’est jamais gardée.</p>
      </div>
      <div className="hp-plus-loin-corps">
        <ul className="hp-plus-loin-liste">
          {PLUS_LOIN.map((f, i) => (
            <li key={f.nom} className="hl-entre" style={d(i * 50)}>
              <a href={`/fonctionnalites/${f.page}`} className="hp-plus-loin-nom"><b>{f.nom}</b></a>
              <span>{f.texte}</span>
            </li>
          ))}
          <li className="hp-plus-loin-tout hl-entre"><a href="/fonctionnalites">Toutes les fonctionnalités, une page chacune</a></li>
        </ul>
        <article className="hl-mail hp-doc-dashboard hl-entre" aria-label="Exemple de tableau de bord">
          <div className="hl-mail-tete"><Symbole className="hl-mail-logo" /><b>Hopla</b></div>
          <Personne profil="ines" />
          <DashboardStats />
          <p className="hl-gris hl-petit">Chiffres d’exemple.</p>
        </article>
      </div>
    </section>
  );
}
