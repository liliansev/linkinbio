import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Avatar, OffreFonction, Personne } from './Profils.tsx';
import type { ProfilExemple } from './exemples.ts';
import { Icone } from '../components/Icone.tsx';
import { Symbole } from '../components/Logo.tsx';
import { CroquisLien, CroquisTete, Telephone } from './Telephone.tsx';
import { mouvementReduit, useCompte, useEnchainement, useGlisse, useSequence, useVu } from './mouvement.ts';
import { COULEURS_SOURCES } from '../lib/stats.ts';

/*
 * Ce que fait Hopla, en trois sections : 02 les liens qui s'ouvrent dans
 * leur app, 03 la page qui change selon l'heure, avant un lancement et pour les drops, avec les avis
 * et la liste e-mail (le réseau se voit dans l'ouverture),
 * 05 le dashboard et les stats en phrases de l'e-mail du lundi (ce que comprend
 * chaque offre se lit dans les prix). Les téléphones y
 * sont des croquis gris : on lit le mouvement, pas un thème. Au téléphone,
 * chaque démo part quand son téléphone est à l'écran, ses onglets juste
 * au-dessus et sa légende dessous. Les légendes ne s'annoncent aux lecteurs d'écran
 * qu'une fois qu'on a touché une commande.
 */

const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

/** `quoi` : ce qui se rejoue, pour qui n'entend que le bouton. */
function Revoir({ onClick, quoi }: { onClick: () => void; quoi: string }) {
  return <button type="button" className="hl-revoir" onClick={onClick} aria-label={`Revoir : ${quoi}`}>Revoir</button>;
}

/* ---- 02 · Dans l'app ----
 * Deux onglets, Sans Hopla et Avec Hopla, sur un même téléphone. Chaque
 * onglet choisi rejoue sa scène depuis le début. À la première lecture, la
 * scène « Sans » se joue, son onglet se remplit comme une barre de lecture,
 * puis « Avec » prend la main, une fois ; un toucher arrête l'enchaînement.
 * Avec moins de mouvement, rien ne s'enchaîne : la scène montre d'emblée
 * « Avec », la promesse, et « Sans » reste à un toucher. Au téléphone, les
 * onglets passent juste au-dessus du téléphone, à l'écran avec lui pendant
 * que la scène joue, et la légende dessous.
 */

type Cote = 'sans' | 'avec';
/*
 * Sans Hopla, 1 : la touche sur le lien ; 2 : le navigateur d'Instagram s'ouvre ;
 * 3 : la demande de connexion reste à l'écran, le temps de la lire ; 4 : le
 * visiteur touche la croix ; 5 : il est reparti. Avec Hopla, 1 : la touche ;
 * 2 : l'app s'ouvre ; 3 : le clip démarre ; 4 : il s'abonne. Même nombre de
 * pas des deux côtés : avec moins de mouvement, chaque scène est à sa fin.
 */
const PAS_SANS = [350, 500, 2000, 700, 600];
const PAS_AVEC = [350, 500, 850, 900, 400];
/** La scène « Sans » dure 4,2 s ; une courte pause laisse lire la légende avant « Avec ». */
const AVANT_AVEC = PAS_SANS.reduce((total, duree) => total + duree, 0) + 2800;
const LEGENDES: Record<Cote, string> = {
  sans: 'Le lien s’ouvre dans le navigateur d’Instagram. Une connexion peut être demandée avant de regarder le clip de Sacha.',
  avec: 'Hopla ouvre le clip de Sacha dans l’app YouTube si elle est installée. Le visiteur retrouve son compte et peut s’abonner.',
};

export function DansApp() {
  const [ref, vu] = useVu<HTMLDivElement>(0.85);
  const [cote, setCote] = useState<Cote>('sans');
  const [jeu, setJeu] = useState(0);
  const [auto, setAuto] = useState(true);
  const [touche, setTouche] = useState(false);
  const [etape, rejouer] = useSequence(vu, cote === 'sans' ? PAS_SANS : PAS_AVEC);
  const reduit = mouvementReduit();

  const choisir = (c: Cote) => { setCote(c); setJeu(j => j + 1); rejouer(); };
  const toucher = (c: Cote) => { setAuto(false); setTouche(true); choisir(c); };
  useEffect(() => { if (reduit) setCote('avec'); }, [reduit]);

  // La première fois : « Sans », puis « Avec » ; la souris qui bouge sur la scène suspend le passage.
  const enchaine = vu && auto && cote === 'sans' && !reduit;
  const [pause, garde] = useEnchainement(enchaine, AVANT_AVEC, () => { setAuto(false); choisir('avec'); });

  return (
    <section className="hl-section" id="fonctions" data-teinte="nuit" aria-labelledby="dans-app">
      <div className="hl-dans-app">
        <div className="hl-dans-app-tete hl-entre">
          <h2 id="dans-app" className="hl-h2">Moins de détours<br /><span className="hl-cache">. </span>Plus de Sacha</h2>
          <p className="hl-chapo">Un clic sur son clip et YouTube prend le relais. <span className="hl-si-mouvement">Regarde le trajet, puis rejoue la scène avec ou sans Hopla.</span><span className="hl-sans-mouvement">Compare le trajet avec et sans Hopla.</span></p>
          <OffreFonction offre="gratuit" />
        </div>
        <div ref={ref} className="hl-dans-app-tel" {...garde}>
          <Telephone largeur={290} className="hl-tel-court" label={cote === 'sans'
            ? 'Sans Hopla : le lien YouTube s’ouvre dans le navigateur d’Instagram, qui demande de se connecter, et le visiteur repart.'
            : 'Avec Hopla : le lien YouTube s’ouvre directement dans l’app YouTube, où le visiteur s’abonne.'}>
            <div key={jeu} className="hl-scene-app">
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
                        {etape >= 4 ? <><Icone nom="check" taille={12} />Abonné</> : 'S’abonner'}
                      </span>
                    </div>
                  </div>
                  <ul className="hl-app-suite" aria-hidden="true">
                    {[0, 1, 2].map(k => <li key={k}><i /><span><span className="hl-app-trait" style={{ width: `${86 - k * 14}%` }} /><span className="hl-app-trait" style={{ width: '44%' }} /></span></li>)}
                  </ul>
                </div>
              )}
            </div>
          </Telephone>
        </div>
        <div className="hl-dans-app-commande" {...garde}>
          <div className="hl-onglets hl-onglets-scene" role="group" aria-label="Comparer, la scène se rejoue à chaque choix" data-pause={pause || undefined}>
            {(['sans', 'avec'] as const).map(c => (
              <button key={c} type="button" aria-pressed={cote === c} onClick={() => toucher(c)}
                data-remplit={(enchaine && c === 'sans') || undefined} style={{ '--duree': `${AVANT_AVEC}ms` } as CSSProperties}>
                {c === 'sans' ? 'Sans Hopla' : 'Avec Hopla'}
              </button>
            ))}
          </div>
          {/* Les deux légendes, invisibles, tiennent la place de la plus longue : le passage de Sans à Avec ne fait rien bouger. */}
          <div className="hl-legendes">
            {(['sans', 'avec'] as const).map(c => <p key={c} className="hl-legende-scene hl-legende-gabarit" aria-hidden="true">{LEGENDES[c]}</p>)}
            <p key={cote} className="hl-legende-scene" aria-live={touche ? 'polite' : 'off'}>{LEGENDES[cote]}</p>
          </div>
          {/* Revoir rejoue la scène affichée, comme ses onglets. La suite se dit quand « Sans » finit : on ne l'attend pas sans le savoir.
              Sa place est gardée, rien ne saute. Avec moins de mouvement, chaque scène est posée sur sa fin : ni l'un ni l'autre. */}
          {!reduit && <div className="hl-dans-app-actions">
            <Revoir onClick={() => toucher(cote)} quoi={cote === 'sans' ? 'le trajet sans Hopla' : 'le trajet avec Hopla'} />
            <button type="button" className="hl-btn hl-btn-petit hl-suite" data-cache={!(cote === 'sans' && etape >= PAS_SANS.length) || undefined} onClick={() => toucher('avec')}>
              Voir avec Hopla<Icone nom="ui-chevron" taille={16} className="hl-droite" />
            </button>
          </div>}
        </div>
      </div>
    </section>
  );
}

/* ---- 03 · Une page vivante ---- */

interface EtatVivant { heure: number; rebours: number; drop: number; avis: number; liste: number }
type Chapitre = keyof EtatVivant;

/* Chaque démo part de DEPART et finit sur FIN ; avec moins de mouvement, elle est
 * posée sur IMMOBILE : le compte à rebours y reste lisible au lieu d'être déjà ouvert. */
const DEPART: EtatVivant = { heure: 9, rebours: 5, drop: 0, avis: 0, liste: 0 };
const ORDRE: Chapitre[] = ['heure', 'rebours', 'drop', 'avis', 'liste'];

/** L'adresse que tape le visiteur de Malik, une lettre après l'autre. */
const ADRESSE_LISTE = 'noa@mail.fr';
/* La liste : l'adresse s'écrit (1 à 11), le bouton est touché (12), « C'est noté » (13), l'inscrit part vers Brevo (14). */
const LISTE_TOUCHE = ADRESSE_LISTE.length + 1;
const LISTE_NOTEE = ADRESSE_LISTE.length + 2;
const LISTE_BREVO = ADRESSE_LISTE.length + 3;
/* Les avis : les cinq étoiles se remplissent (1 à 5), la note et le nombre d'avis (6), le mot d'une cliente (7). */
const AVIS_NOTE = 6;
const AVIS_MOT = 7;
const IMMOBILE: EtatVivant = { heure: 21, rebours: ((2 * 60) + 14) * 60 + 8, drop: 3, avis: AVIS_MOT, liste: LISTE_BREVO };

/** Les pas de chaque démo : [délai en ms, valeur]. */
const PAS_VIVANTE: Record<Chapitre, [number, number][]> = {
  heure: Array.from({ length: 12 }, (_, k) => [700 + k * 110, 10 + k]),
  rebours: [4, 3, 2, 1, 0].map((n, k) => [700 + k * 1000, n]),
  drop: [1, 2, 3].map((n, k) => [700 + k * 650, n]),
  avis: [...[1, 2, 3, 4, 5].map((n, k): [number, number] => [700 + k * 180, n]), [1800, AVIS_NOTE], [2700, AVIS_MOT]],
  liste: [...Array.from({ length: ADRESSE_LISTE.length }, (_, k): [number, number] => [700 + k * 85, k + 1]),
    [2000, LISTE_TOUCHE], [2450, LISTE_NOTEE], [3300, LISTE_BREVO]],
};

const deux = (n: number) => String(n).padStart(2, '0');

/** Les trois liens de Malik selon l'heure : le soir, « Réserver un dîner » monte de la dernière place à la première. */
const LIENS_HEURE: Record<string, { titre: string; picto: string }> = {
  atelier: { titre: 'Le menu du jour', picto: 'document' },
  tiktok: { titre: 'Ma recette du dimanche', picto: 'youtube' },
  boutique: { titre: 'Réserver un dîner', picto: 'agenda' },
};

function EcranHeure({ heure }: { heure: number }) {
  const liste = useRef<HTMLDivElement>(null);
  const soir = heure >= 18;
  const ordre = soir ? ['boutique', 'tiktok', 'atelier'] : ['atelier', 'tiktok', 'boutique'];
  useGlisse(liste, ordre.join(), 550);
  return (
    <div className="hl-cq">
      <div className="hl-cq-horloge"><b>{deux(heure)}:00</b><span>{soir ? 'le soir' : 'le matin'}</span></div>
      <CroquisTete profil="malik" />
      <div className="hl-cq-liens" ref={liste}>
        {ordre.map((c, k) => <CroquisLien key={c} cle={c} titre={LIENS_HEURE[c].titre} vedette={k === 0} picto={<Icone nom={LIENS_HEURE[c].picto} taille={14} />} />)}
      </div>
    </div>
  );
}

/** Un lancement : le compte à rebours, sans l'adresse, puis le lien qui s'ouvre à l'heure dite. L'horloge dit l'heure qu'il est : à 17:59, il ne reste que des secondes. */
function EcranRebours({ reste }: { reste: number }) {
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

function EcranDrop({ drop }: { drop: number }) {
  const code = 'MERCI'.slice(0, drop >= 2 ? 5 : drop === 1 ? 3 : 0);
  const ouvert = drop >= 2;
  return (
    <div className="hl-cq">
      <CroquisTete profil="hugo" />
      <div className="hl-cq-liens">
        <CroquisLien titre="Mes affiches" />
        <div className="hl-cq-drop" data-ouvert={ouvert || undefined}>
          <div className="hl-cq-drop-tete">
            <span key={String(ouvert)} className="hl-cq-drop-picto"><Icone nom={ouvert ? 'check' : 'cadenas'} taille={16} /></span>
            <span><b>Accès en avant-première</b><span className="hl-cq-sous">{ouvert ? 'Débloqué, la place est à toi' : 'Avec un code'}</span></span>
            <span key={drop >= 3 ? 2 : 3} className="hl-cq-places">Plus que {drop >= 3 ? 2 : 3} places</span>
          </div>
          {ouvert
            ? <div className="hl-cq-ouvrir">Ouvrir le lien</div>
            : <div className="hl-cq-code"><span className="hl-cq-saisie">{code}<i /></span><span className="hl-cq-ok">Ouvrir</span></div>}
        </div>
        <CroquisLien titre="Dessiner ton projet" />
      </div>
    </div>
  );
}

/** Les avis d'Inès : ses étoiles se remplissent, puis sa note, le nombre d'avis et le mot d'une cliente. */
function EcranAvis({ avis }: { avis: number }) {
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

/** La liste de Malik : un visiteur tape son adresse, s'inscrit, et l'inscrit part vers Brevo. */
function EcranListe({ liste }: { liste: number }) {
  const note = liste >= LISTE_NOTEE;
  return (
    <div className="hl-cq">
      <CroquisTete profil="malik" />
      <div className="hl-cq-liens">
        <CroquisLien titre="Ma recette du dimanche" picto={<Icone nom="youtube" taille={14} />} />
        <div className="hl-cq-liste" data-note={note || undefined}>
          <div className="hl-cq-drop-tete">
            <span className="hl-cq-drop-picto"><Icone nom="courrier" taille={16} /></span>
            <span><b>Rejoins ma liste</b><span className="hl-cq-sous">Une recette chaque dimanche</span></span>
          </div>
          {note
            ? <p key="note" className="hl-cq-merci"><Icone nom="check" taille={14} />C’est noté, merci !</p>
            : <div className="hl-cq-code">
              <span className="hl-cq-saisie hl-cq-adresse">{ADRESSE_LISTE.slice(0, liste)}{liste < LISTE_TOUCHE && <i />}{liste === 0 && <span className="hl-cq-indice">ton@email.fr</span>}</span>
              <span className="hl-cq-ok hl-cq-inscrire" data-touche={liste >= LISTE_TOUCHE || undefined}>Je m’inscris</span>
            </div>}
        </div>
        <CroquisLien titre="Réserver un dîner" picto={<Icone nom="agenda" taille={14} />} />
      </div>
      {liste >= LISTE_BREVO && <p className="hl-toast hl-toast-vite"><Icone nom="check" taille={14} />Ajouté à ta liste Brevo</p>}
    </div>
  );
}

const CHAPITRES: { court: string; offre: 'starter' | 'pro'; titre: string; texte: string }[] = [
  { court: 'L’heure', offre: 'pro', titre: 'Malik cuisine, sa\u00a0page s’organise', texte: 'Le menu du jour le midi, les réservations pour dîner le soir. Tu choisis les horaires, Hopla met le bon lien en tête.' },
  { court: 'Le lancement', offre: 'starter', titre: 'Les nouvelles pièces d’Inès', texte: 'Ton lien affiche un compte à rebours, sans dévoiler son adresse. À l’heure dite, il s’ouvre tout seul.' },
  { court: 'Les drops', offre: 'pro', titre: 'Les éditions limitées d’Hugo', texte: 'Un drop, c’est un lien réservé : il s’ouvre avec un code, pour le nombre de places que tu choisis. Le compteur se tient à jour tout seul.' },
  { court: 'Les avis', offre: 'starter', titre: 'Les clients d’Inès en parlent', texte: 'Ta note sur 5, le nombre d’avis et le mot d’un client, en bonne place sur ta page. Tu les reprends de Google ou d’ailleurs, Hopla les met en forme.' },
  { court: 'La liste e-mail', offre: 'pro', titre: 'Malik garde le contact', texte: 'Un visiteur laisse son e-mail sur ta page et rejoint ta liste. Il part tout seul vers Brevo ou Mailchimp si tu les as branchés.' },
];
/** Qui montre chaque chapitre. */
const PERSONNES: ProfilExemple[] = ['malik', 'ines', 'hugo', 'ines', 'malik'];

function EcranChapitre({ i, e }: { i: number; e: EtatVivant }) {
  switch (ORDRE[i]) {
    case 'heure': return <EcranHeure heure={e.heure} />;
    case 'rebours': return <EcranRebours reste={e.rebours} />;
    case 'drop': return <EcranDrop drop={e.drop} />;
    case 'avis': return <EcranAvis avis={e.avis} />;
    default: return <EcranListe liste={e.liste} />;
  }
}
const LABELS = [
  'Le soir, la page de Malik met « Réserver un dîner » en tête à la place de « Le menu du jour ».',
  'Un compte à rebours, puis le lien qui s’ouvre à l’heure dite.',
  'Un lien réservé s’ouvre avec un code, et ses places se comptent.',
  'Sur la page d’Inès, ses avis : 4,9 sur 5 pour 87 avis Google, et le mot d’une cliente.',
  'Sur la page de Malik, un visiteur laisse son e-mail : il rejoint sa liste, envoyée vers Brevo.',
];

/** Les onglets ont une adresse : un avantage des prix (#vivante-drops) ramène à son chapitre et l'ouvre. */
const IDS_CHAPITRES = ['vivante-heure', 'vivante-lancement', 'vivante-drops', 'vivante-avis', 'vivante-liste'];

export function Vivante() {
  const [ref, vu] = useVu<HTMLDivElement>(0.6);
  const [actif, setActif] = useState(0);
  const [tour, setTour] = useState(0);
  const [e, setE] = useState<EtatVivant>(DEPART);
  const [touche, setTouche] = useState(false);
  useEffect(() => {
    const ouvrir = () => { const i = IDS_CHAPITRES.indexOf(location.hash.slice(1)); if (i >= 0) { setActif(i); setTour(t => t + 1); } };
    ouvrir();
    // Au bureau, le téléphone est à côté des onglets, plus haut : la scène entière vient au milieu de l'écran.
    const clic = (ev: MouseEvent) => {
      if (!(ev.target as Element | null)?.closest?.('a[href^="#vivante-"]')) return;
      setTimeout(() => {
        ouvrir();
        if (matchMedia('(min-width: 1024px)').matches) ref.current?.scrollIntoView({ block: 'center', behavior: mouvementReduit() ? 'auto' : 'smooth' });
      });
    };
    document.addEventListener('click', clic);
    return () => document.removeEventListener('click', clic);
  }, []);
  useEffect(() => {
    if (!vu) return;
    const cle = ORDRE[actif];
    if (mouvementReduit()) { setE({ ...DEPART, [cle]: IMMOBILE[cle] }); return; }
    setE(DEPART);
    const t = PAS_VIVANTE[cle].map(([ms, v]) => setTimeout(() => setE(x => ({ ...x, [cle]: v })), ms));
    return () => t.forEach(clearTimeout);
  }, [actif, vu, tour]);
  // Quand les onglets défilent de côté, celui de la démo en cours vient au milieu de la bande.
  useEffect(() => {
    const b = document.getElementById(IDS_CHAPITRES[actif]);
    const bande = b?.parentElement;
    if (!b || !bande || bande.scrollWidth <= bande.clientWidth) return;
    bande.scrollTo({ left: b.offsetLeft - (bande.clientWidth - b.offsetWidth) / 2, behavior: mouvementReduit() ? 'auto' : 'smooth' });
  }, [actif]);
  // Au téléphone, la démo choisie se joue à l'écran : le téléphone, juste sous les onglets, remonte s'il le faut.
  const choisir = (i: number) => {
    setTouche(true); setActif(i); setTour(t => t + 1);
    if (matchMedia('(max-width: 1023px)').matches) ref.current?.scrollIntoView({ block: 'nearest', behavior: mouvementReduit() ? 'auto' : 'smooth' });
  };
  return <section className="hl-section hp-vivante" data-teinte="peche" aria-labelledby="vivante">
    <div className="hl-tete-section"><h2 id="vivante" className="hl-h2">Toi, tu avances<br /><span className="hl-cache">. </span>Ta page suit</h2><p className="hl-chapo">Le bon lien selon l’heure, un compte à rebours avant un lancement, des places comptées pour un drop, tes avis clients et ta liste e-mail. Hopla garde le rythme.</p></div>
    <div className="hp-vivante-scene">
      <div className="hp-vivante-texte">
        <div className="hl-onglets" role="group" aria-label="Choisir une démonstration">
          {CHAPITRES.map((c, i) => <button key={c.court} id={IDS_CHAPITRES[i]} type="button" aria-pressed={actif === i} onClick={() => choisir(i)}>{c.court}</button>)}
        </div>
        <div className="hp-vivante-explication" aria-live={touche ? 'polite' : 'off'}>
          <Personne profil={PERSONNES[actif]} badge={false} />
          <h3 className="hl-h3">{CHAPITRES[actif].titre}</h3><p>{CHAPITRES[actif].texte}</p>
          <OffreFonction offre={CHAPITRES[actif].offre} />
        </div>
        {/* Avec moins de mouvement, la démo est posée sur sa fin : il n'y a rien à revoir. */}
        {!mouvementReduit() && <Revoir onClick={() => choisir(actif)} quoi={CHAPITRES[actif].titre} />}
      </div>
      <div ref={ref} className="hp-vivante-tel"><Telephone largeur={290} className="hl-tel-court hl-tel-vivante" label={LABELS[actif]}><EcranChapitre i={actif} e={e} /></Telephone></div>
    </div>
  </section>;
}

/* ---- 05 · Les stats ----
 * Deux documents, l'un ou l'autre selon l'onglet, à toutes les tailles : le
 * dashboard, puis l'e-mail du lundi qui en reprend les chiffres en phrases.
 * Jamais les mêmes chiffres deux fois côte à côte.
 */

type Morceau = string | { n: number; avant?: string; suite?: string };

function Phrase({ morceaux, joue, depart, hausse }: { morceaux: Morceau[]; joue: boolean; depart: number; hausse?: boolean }) {
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
  const points = vues.map((v, i) => `${16 + i * 78},${170 - v * 1.5}`).join(' ');
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
            {/* Le bleu de la courbe du back office (22 octobre 2026) : l'accueil montre l'outil tel qu'il est. */}
            <polygon points={`16,170 ${points} 484,170`} fill="#292bff" fillOpacity=".08" />
            <polyline points={points} fill="none" stroke="#292bff" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx="250" cy="38" r="4" fill="#292bff" />
          </svg>
          <b className="hp-dashboard-pic" aria-hidden="true">88</b>
        </div>
        <div className="hp-dashboard-jours" aria-hidden="true">{['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(jour => <span key={jour}>{jour}</span>)}</div>
      </figure>
      <div className="hp-dashboard-details">
        <div><p>D’où viennent les visites</p><ul>{([['Instagram', 'instagram', 61], ['Accès direct', 'lien', 24], ['YouTube', 'youtube', 15]] as const).map(([nom, icone, part]) => {
          // Comme au back office : le logo du réseau dans sa couleur, sa barre dans une teinte claire de celle-ci.
          const couleur = COULEURS_SOURCES[nom];
          return <li key={nom} style={couleur && { '--picto': couleur.picto, '--barre': couleur.barre } as CSSProperties}><span className="hp-dashboard-barre" style={{ width: `${part}%` }} /><span className="hp-dashboard-source"><Icone nom={icone} taille={14} />{nom}</span><b>{part}&#8239;%</b></li>;
        })}</ul></div>
        <div><p>Les liens les plus cliqués</p><ul>{[['Mes pièces du moment', 35], ['Un samedi à l’atelier', 28], ['Les coulisses en vidéo', 19]].map(([nom, clics]) => <li key={nom}><span>{nom}</span><b>{clics}</b></li>)}</ul></div>
      </div>
    </div>
  );
}

export function Stats() {
  const [ref, vu] = useVu<HTMLDivElement>(0.3);
  const [tour, setTour] = useState(0);
  const [vue, setVue] = useState<'dashboard' | 'email'>('dashboard');
  // Une vue à la fois : l'e-mail rejoue ses chiffres quand on l'ouvre.
  const voir = (v: 'dashboard' | 'email') => { setVue(v); if (v === 'email') setTour(t => t + 1); };
  return (
    <section className="hl-section hl-section-stats" data-teinte="menthe" aria-labelledby="stats">
      <div className="hl-tete-section hp-stats-tete hl-entre">
        <h2 id="stats" className="hl-h2">Tes stats, en clair</h2>
        <div>
          <p className="hl-chapo">Ton tableau de bord pour suivre tes vues, tes clics et d’où viennent tes visiteurs. Et chaque lundi à 9 h, l’essentiel par e‑mail.</p>
          <OffreFonction offre="starter" />
          <p className="hp-stats-confidentialite">Sans cookie ni bannière, l’adresse IP de tes visiteurs n’est jamais gardée.</p>
        </div>
      </div>
      <div ref={ref} className="hl-stats" data-vue={vue}>
        <div className="hl-onglets" role="group" aria-label="Aperçu des statistiques">
          <button type="button" aria-pressed={vue === 'dashboard'} onClick={() => voir('dashboard')}>Le tableau de bord</button>
          <button type="button" aria-pressed={vue === 'email'} onClick={() => voir('email')}>L’e‑mail du lundi</button>
        </div>
        <div className="hp-stats-docs">
          <article className="hl-mail hp-doc-dashboard" aria-label="Exemple de tableau de bord">
            <div className="hl-mail-tete"><Symbole className="hl-mail-logo" /><b>Hopla</b></div>
            <Personne profil="ines" badge={false} />
            <DashboardStats />
          </article>
          <article className="hl-mail hp-doc-email" aria-label="Exemple d’e-mail du lundi">
            <div className="hl-mail-tete"><Symbole className="hl-mail-logo" /><b>Hopla</b><span className="hl-gris">lundi, 9 h</span></div>
            <Personne profil="ines" badge={false} />
            <p className="hl-mail-sujet">Ce qui a plu cette semaine</p>
            <ol key={tour} className="hl-stats-liste">
              <Phrase joue={vu} depart={0} hausse morceaux={['Ta page a eu', { n: 412 }, 'vues, soit', { n: 18, suite: '\u202f%' }, 'de plus que la semaine d’avant.']} />
              <Phrase joue={vu} depart={500} morceaux={['Instagram t’amène le plus de monde\u00a0:', { n: 61, suite: '\u202f%' }, 'des visites.']} />
              <Phrase joue={vu} depart={950} morceaux={['Ton meilleur jour\u00a0: jeudi, avec', { n: 88 }, 'vues. Un post ce jour-là\u202f?']} />
              <Phrase joue={vu} depart={1450} hausse morceaux={['Ton lien «\u202fMes pièces du moment\u202f» a fait', { n: 40, avant: '+', suite: '\u202f%' }, 'de clics (35 contre 25).']} />
              <Phrase joue={vu} depart={1950} morceaux={[{ n: 38 }, 'clics se sont ouverts directement dans leur app, sans rester coincés dans Instagram.']} />
            </ol>
            <button type="button" className="hl-mail-bouton hp-mail-vers-dashboard" onClick={() => voir('dashboard')}>Voir le tableau de bord</button>
          </article>
        </div>
        <p className="hl-gris hl-petit">Chiffres d’exemple. {!mouvementReduit() && <span className="hp-stats-revoir" data-vue={vue}><Revoir onClick={() => setTour(t => t + 1)} quoi="les chiffres de l’e-mail" /></span>}</p>
      </div>
    </section>
  );
}
