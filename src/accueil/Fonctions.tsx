import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Avatar, Personne } from './Profils.tsx';
import { Icone } from '../components/Icone.tsx';
import { Symbole } from '../components/Logo.tsx';
import { CroquisLien, CroquisTete, Telephone } from './Telephone.tsx';
import { mouvementReduit, useCompte, useGlisse, useSequence, useVu } from './mouvement.ts';

/*
 * Ce que fait Hopla, en trois sections : 02 les liens qui s'ouvrent dans
 * leur app, 03 la page qui change selon l'heure, avant un lancement et pour les drops (le réseau se
 * voit dans l'ouverture),
 * 05 les stats en phrases, lues comme l'e-mail du lundi (ce que comprend
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
/** 1 : la touche sur le lien ; 2 : ce qui s'ouvre ; 3 : la suite ; 4 : le visiteur repart, ou s'abonne. */
const PAS_APP = [450, 600, 1000, 1100];
/** La scène « Sans » dure 3,15 s ; on laisse ensuite le temps de lire sa légende avant « Avec ». */
const AVANT_AVEC = 3150 + 3500;
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
  const [etape, rejouer] = useSequence(vu, PAS_APP);
  const reduit = mouvementReduit();

  const choisir = (c: Cote) => { setCote(c); setJeu(j => j + 1); rejouer(); };
  const toucher = (c: Cote) => { setAuto(false); setTouche(true); choisir(c); };
  useEffect(() => { if (reduit) setCote('avec'); }, [reduit]);

  // La première fois : « Sans », puis « Avec ».
  const enchaine = vu && auto && cote === 'sans' && !reduit;
  useEffect(() => {
    if (!enchaine) return;
    const t = setTimeout(() => { setAuto(false); choisir('avec'); }, AVANT_AVEC);
    return () => clearTimeout(t);
    // `choisir` ne change pas d'effet : seul l'état de l'enchaînement compte.
  }, [enchaine]);

  return (
    <section className="hl-section" id="fonctions" data-teinte="nuit" aria-labelledby="dans-app">
      <div className="hl-dans-app">
        <div className="hl-dans-app-tete hl-entre">
          <h2 id="dans-app" className="hl-h2">Moins de détours<br />Plus de Sacha</h2>
          <p className="hl-chapo">Un clic sur son clip et YouTube prend le relais. Regarde le trajet, puis rejoue la scène avec ou sans Hopla.</p>
        </div>
        <div ref={ref} className="hl-dans-app-tel">
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
                </div>
              </div>
              {cote === 'sans' ? <>
                <div className="hl-integre" data-ouvert={(etape >= 2 && (etape < 4 || reduit)) || undefined}>
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
                {etape >= 4 && <p className="hl-toast" role="status">Ton visiteur est reparti.</p>}
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
        <div className="hl-dans-app-commande">
          <div className="hl-onglets hl-onglets-scene" role="group" aria-label="Comparer, la scène se rejoue à chaque choix">
            {(['sans', 'avec'] as const).map(c => (
              <button key={c} type="button" aria-pressed={cote === c} onClick={() => toucher(c)}
                data-remplit={(enchaine && c === 'sans') || undefined} style={{ '--duree': `${AVANT_AVEC}ms` } as CSSProperties}>
                {c === 'sans' ? 'Sans Hopla' : 'Avec Hopla'}
              </button>
            ))}
          </div>
          <p key={cote} className="hl-legende-scene" aria-live={touche ? 'polite' : 'off'}>{LEGENDES[cote]}</p>
        </div>
      </div>
    </section>
  );
}

/* ---- 03 · Une page vivante ---- */

interface EtatVivant { heure: number; rebours: number; drop: number }
type Chapitre = keyof EtatVivant;

/* Chaque démo part de DEPART et finit sur FIN ; avec moins de mouvement, elle est
 * posée sur IMMOBILE : le compte à rebours y reste lisible au lieu d'être déjà ouvert. */
const DEPART: EtatVivant = { heure: 9, rebours: 5, drop: 0 };
const IMMOBILE: EtatVivant = { heure: 21, rebours: ((2 * 60) + 14) * 60 + 8, drop: 3 };
const ORDRE: Chapitre[] = ['heure', 'rebours', 'drop'];

const deux = (n: number) => String(n).padStart(2, '0');

/** Les trois liens de Malik selon l'heure : le soir, « Réserver un dîner » monte de la dernière place à la première. */
const LIENS_HEURE: Record<string, { titre: string; picto: string }> = {
  atelier: { titre: 'Le menu du jour', picto: 'agenda' },
  tiktok: { titre: 'La recette du dimanche', picto: 'youtube' },
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

/** Un lancement : le compte à rebours, sans l'adresse, puis le lien qui s'ouvre à l'heure dite. */
function EcranRebours({ reste }: { reste: number }) {
  const h = Math.floor(reste / 3600), m = Math.floor((reste % 3600) / 60), s = reste % 60;
  return (
    <div className="hl-cq">
      <CroquisTete profil="ines" />
      <div className="hl-cq-liens">
        {reste > 0 ? (
          <div className="hl-cq-rebours" role="timer" aria-label="Ma nouvelle collection ouvre ce soir à 18 h">
            <span className="hl-cq-rebours-tete"><Icone nom="horloge" taille={16} /><b>Ma nouvelle collection</b></span>
            <span className="hl-cq-rebours-chrono">{deux(h)}:{deux(m)}:{deux(s)}</span>
            <span className="hl-cq-sous">Ouvre ce soir à 18:00</span>
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

const CHAPITRES = [
  { court: 'L’heure', titre: 'Malik cuisine, sa page s’organise', texte: 'Le menu du jour le midi, les réservations pour dîner le soir. Malik choisit les horaires, Hopla met le bon lien en tête.' },
  { court: 'Le lancement', titre: 'Les nouvelles pièces d’Inès', texte: 'Ton lien affiche un compte à rebours, sans dévoiler son adresse. À l’heure dite, il s’ouvre tout seul.' },
  { court: 'Les drops', titre: 'Les éditions limitées d’Hugo', texte: 'Un drop, c’est un lien réservé : il s’ouvre avec un code, ou pour les cinquante premiers. Le compteur de places se tient à jour tout seul.' },
];

function EcranChapitre({ i, e }: { i: number; e: EtatVivant }) {
  return i === 0 ? <EcranHeure heure={e.heure} /> : i === 1 ? <EcranRebours reste={e.rebours} /> : <EcranDrop drop={e.drop} />;
}
const LABELS = [
  'Le soir, la page de Malik met « Réserver un dîner » en tête à la place de « Le menu du jour ».',
  'Un compte à rebours, puis le lien qui s’ouvre à l’heure dite.',
  'Un lien réservé s’ouvre avec un code, et ses places se comptent.',
];

export function Vivante() {
  const [ref, vu] = useVu<HTMLDivElement>(0.3);
  const [actif, setActif] = useState(0);
  const [tour, setTour] = useState(0);
  const [e, setE] = useState<EtatVivant>(DEPART);
  const [touche, setTouche] = useState(false);
  useEffect(() => {
    if (!vu) return;
    const cle = ORDRE[actif];
    if (mouvementReduit()) { setE({ ...DEPART, [cle]: IMMOBILE[cle] }); return; }
    setE(DEPART);
    const pas: [number, number][] = cle === 'heure'
      ? Array.from({ length: 12 }, (_, k) => [700 + k * 110, 10 + k])
      : cle === 'rebours' ? [4, 3, 2, 1, 0].map((n, k) => [700 + k * 1000, n])
      : [1, 2, 3].map((n, k) => [700 + k * 650, n]);
    const t = pas.map(([ms, v]) => setTimeout(() => setE(x => ({ ...x, [cle]: v })), ms));
    return () => t.forEach(clearTimeout);
  }, [actif, vu, tour]);
  const choisir = (i: number) => { setTouche(true); setActif(i); setTour(t => t + 1); };
  return <section className="hl-section hp-vivante" data-teinte="peche" aria-labelledby="vivante">
    <div className="hl-tete-section"><h2 id="vivante" className="hl-h2">Toi, tu avances<br />Ta page suit</h2><p className="hl-chapo">Un atelier à annoncer, un projet qui sort, une idée à partager. Hopla garde le rythme.</p></div>
    <div className="hp-vivante-scene">
      <div className="hp-vivante-texte">
        <div className="hl-onglets" role="group" aria-label="Choisir une démonstration">
          {CHAPITRES.map((c, i) => <button key={c.court} type="button" aria-pressed={actif === i} onClick={() => choisir(i)}>{c.court}</button>)}
        </div>
        <div className="hp-vivante-explication" aria-live={touche ? 'polite' : 'off'}>
          <Personne profil={actif === 0 ? 'malik' : actif === 1 ? 'ines' : 'hugo'} offre={actif === 1 ? 'starter' : 'pro'} />
          <h3 className="hl-h3">{CHAPITRES[actif].titre}</h3><p>{CHAPITRES[actif].texte}</p>
        </div>
        <Revoir onClick={() => choisir(actif)} quoi={CHAPITRES[actif].titre} />
      </div>
      <div ref={ref} className="hp-vivante-tel"><Telephone largeur={290} className="hl-tel-court hl-tel-vivante" label={LABELS[actif]}><EcranChapitre i={actif} e={e} /></Telephone></div>
    </div>
  </section>;
}

/* ---- 05 · Les stats en phrases ----
 * Les phrases que Hopla écrit dans Stats, posées dans l'e-mail du lundi qui
 * les reprend : une seule fois chaque chiffre. Au bureau, le titre à gauche
 * et l'e-mail à droite.
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

export function Stats() {
  const [ref, vu] = useVu<HTMLOListElement>(0.3);
  const [tour, setTour] = useState(0);
  return (
    <section className="hl-section hl-section-stats" data-teinte="menthe" aria-labelledby="stats">
      <div className="hl-tete-section hl-entre">
        <h2 id="stats" className="hl-h2">Tes stats, en clair.</h2>
        <p className="hl-chapo">Pas de tableau à déchiffrer : Hopla te dit ce qui a bougé, dans ton espace et par e‑mail chaque lundi à 9 h. Sans cookie ni bannière, l’adresse IP de tes visiteurs n’est jamais gardée.</p>
      </div>
      <div className="hl-stats">
        <article className="hl-mail" aria-label="Exemple d’e-mail du lundi">
          <div className="hl-mail-tete"><Symbole className="hl-mail-logo" /><b>Hopla</b><span className="hl-gris">lundi, 9 h</span></div>
          <Personne profil="hugo" offre="starter" /><p className="hl-mail-sujet">Hugo sait ce qui plaît</p>
          <ol ref={ref} key={tour} className="hl-stats-liste">
            <Phrase joue={vu} depart={0} hausse morceaux={['Ta page a eu', { n: 412, suite: ' vues,' }, 'soit', { n: 18, suite: ' %' }, 'de plus que la semaine d’avant.']} />
            <Phrase joue={vu} depart={500} morceaux={['Instagram t’amène le plus de monde :', { n: 61, suite: ' %' }, 'des visites.']} />
            <Phrase joue={vu} depart={950} morceaux={['Ton meilleur jour : jeudi, avec', { n: 88 }, 'vues. Un post ce jour-là ?']} />
            <Phrase joue={vu} depart={1450} hausse morceaux={['Ton lien « Mes affiches » a fait', { n: 40, avant: '+', suite: ' %' }, 'de clics (35 contre 25).']} />
            <Phrase joue={vu} depart={1950} morceaux={[{ n: 38 }, 'clics se sont ouverts directement dans leur app, sans rester coincés dans Instagram ou TikTok.']} />
          </ol>
          <span className="hl-mail-bouton" aria-hidden="true">Voir mes stats</span>
        </article>
        <p className="hl-gris hl-petit">Chiffres d’exemple. <Revoir onClick={() => setTour(t => t + 1)} quoi="les chiffres" /></p>
      </div>
    </section>
  );
}
