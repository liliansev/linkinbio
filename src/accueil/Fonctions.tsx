import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import QRCode from 'qrcode';
import { Icone } from '../components/Icone.tsx';
import { CroquisLien, CroquisTete, Telephone } from './Telephone.tsx';
import { mouvementReduit, useCompte, useGlisse, useSequence, useVu } from './mouvement.ts';

/*
 * Ce que fait Hopla, en quatre sections : 02 les liens qui s'ouvrent dans
 * leur app, 03 la page qui change selon le réseau, l'heure et les drops,
 * 04 tout ce qu'il faut autour, 05 les stats en une phrase. Les téléphones y
 * sont des croquis gris : on lit le mouvement, pas un thème.
 */

const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

function Revoir({ onClick }: { onClick: () => void }) {
  return <button type="button" className="hl-revoir" onClick={onClick}>Revoir</button>;
}

/* ---- 02 · Dans l'app ----
 * Deux onglets, Sans Hopla et Avec Hopla, sur un même téléphone. Chaque
 * onglet choisi rejoue sa scène depuis le début. À la première lecture, la
 * scène « Sans » se joue, son onglet se remplit comme une barre de lecture,
 * puis « Avec » prend la main, une fois ; un toucher arrête l'enchaînement.
 */

type Cote = 'sans' | 'avec';
/** 1 : la touche sur le lien ; 2 : ce qui s'ouvre ; 3 : la suite ; 4 : le visiteur repart, ou s'abonne. */
const PAS_APP = [450, 600, 1000, 1100];
const AVANT_AVEC = 3150 + 1500;
const LEGENDES: Record<Cote, string> = {
  sans: 'Le lien s’ouvre dans le navigateur d’Instagram. Ton visiteur n’y est connecté à rien : on lui demande de se reconnecter, et le plus souvent, il repart.',
  avec: 'Hopla ouvre le lien dans l’app YouTube, où ton visiteur est déjà connecté. Il regarde, il s’abonne, sans rien retaper.',
};

export function DansApp() {
  const [ref, vu] = useVu<HTMLDivElement>(0.35);
  const [cote, setCote] = useState<Cote>('sans');
  const [jeu, setJeu] = useState(0);
  const [auto, setAuto] = useState(true);
  const [etape, rejouer] = useSequence(vu, PAS_APP);
  const clics = useCompte(38, cote === 'avec' && etape >= 2);

  const choisir = (c: Cote) => { setCote(c); setJeu(j => j + 1); rejouer(); };
  const toucher = (c: Cote) => { setAuto(false); choisir(c); };

  // La première fois : « Sans », puis « Avec ».
  const enchaine = vu && auto && cote === 'sans' && !mouvementReduit();
  useEffect(() => {
    if (!enchaine) return;
    const t = setTimeout(() => { setAuto(false); choisir('avec'); }, AVANT_AVEC);
    return () => clearTimeout(t);
    // `choisir` ne change pas d'effet : seul l'état de l'enchaînement compte.
  }, [enchaine]);

  return (
    <section className="hl-section" aria-labelledby="dans-app">
      <div className="hl-dans-app">
        <div className="hl-dans-app-texte">
          <div className="hl-entre">
            <h2 id="dans-app" className="hl-h2">Tes liens s’ouvrent dans l’app, pas dans Instagram.</h2>
            <p className="hl-chapo">Depuis Instagram ou TikTok, ton lien YouTube ou Spotify s’ouvre dans son app, là où ton visiteur est déjà connecté.</p>
          </div>
          <div className="hl-onglets hl-onglets-scene" role="group" aria-label="Comparer, la scène se rejoue à chaque choix">
            {(['sans', 'avec'] as const).map(c => (
              <button key={c} type="button" aria-pressed={cote === c} onClick={() => toucher(c)}
                data-remplit={(enchaine && c === 'sans') || undefined} style={{ '--duree': `${AVANT_AVEC}ms` } as CSSProperties}>
                {c === 'sans' ? 'Sans Hopla' : 'Avec Hopla'}
              </button>
            ))}
          </div>
          <p key={cote} className="hl-legende-scene" aria-live="polite">{LEGENDES[cote]}</p>
          <p className="hl-phrase-stat hl-grand-seul" data-visible={(cote === 'avec' && etape >= 2) || undefined} aria-hidden={cote !== 'avec' || undefined}>
            <b className="hl-chiffre">{clics}</b> clics ouverts dans leur app cette semaine. <span className="hl-gris">Exemple de phrase de tes stats.</span>
          </p>
        </div>
        <div ref={ref} className="hl-dans-app-tel">
          <Telephone largeur={290} label={cote === 'sans'
            ? 'Sans Hopla : le lien YouTube s’ouvre dans le navigateur d’Instagram, qui demande de se connecter, et le visiteur repart.'
            : 'Avec Hopla : le lien YouTube s’ouvre directement dans l’app YouTube, où le visiteur s’abonne.'}>
            <div key={jeu} className="hl-scene-app">
              <div className="hl-cq">
                <CroquisTete />
                <div className="hl-cq-liens">
                  <CroquisLien titre="Ma dernière vidéo" picto={<Icone nom="youtube" taille={14} />} data-touche={etape >= 1 || undefined} />
                  <CroquisLien titre="Ma boutique" />
                  <CroquisLien titre="Réserver un atelier" />
                </div>
              </div>
              {cote === 'sans' ? <>
                <div className="hl-integre" data-ouvert={(etape >= 2 && etape < 4) || undefined}>
                  <div className="hl-integre-barre"><span className="hl-tap" data-touche={etape >= 4 || undefined}><Icone nom="ui-fermer" taille={14} /></span><span>youtube.com</span></div>
                  <i className="hl-integre-charge" data-joue={etape >= 2 || undefined} />
                  <div className="hl-integre-video" />
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
                  <div className="hl-app-video"><Icone nom="play" taille={30} /><i data-joue={etape >= 3 || undefined} /></div>
                  <div className="hl-app-corps">
                    <span className="hl-app-trait" style={{ width: '82%' }} />
                    <span className="hl-app-trait" style={{ width: '50%' }} />
                    <div className="hl-app-ligne">
                      <span className="hl-app-rond" /><span className="hl-app-trait" style={{ width: '38%' }} />
                      <span className="hl-app-abonne hl-tap" data-touche={etape >= 4 || undefined} data-fait={etape >= 4 || undefined}>
                        {etape >= 4 ? <><Icone nom="check" taille={12} />Abonné</> : 'S’abonner'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Telephone>
        </div>
        <p className="hl-phrase-stat hl-petit-seul" data-visible={(cote === 'avec' && etape >= 2) || undefined} aria-hidden={cote !== 'avec' || undefined}>
          <b className="hl-chiffre">{clics}</b> clics ouverts dans leur app cette semaine. <span className="hl-gris">Exemple de phrase de tes stats.</span>
        </p>
      </div>
    </section>
  );
}

/* ---- 03 · Une page vivante ---- */

type Source = 'instagram' | 'tiktok' | 'youtube';
const SOURCES: { id: Source; nom: string; arrive: string }[] = [
  { id: 'instagram', nom: 'Instagram', arrive: 'Arrivé d’Instagram' },
  { id: 'tiktok', nom: 'TikTok', arrive: 'Arrivé de TikTok' },
  { id: 'youtube', nom: 'YouTube', arrive: 'Arrivé de YouTube' },
];
const LIENS: Record<string, string> = { boutique: 'Ma boutique', atelier: 'Réserver un atelier', tiktok: 'Mon dernier TikTok', youtube: 'Ma chaîne YouTube' };
const ORDRE: Record<Source, string[]> = {
  instagram: ['boutique', 'atelier', 'tiktok', 'youtube'],
  tiktok: ['tiktok', 'boutique', 'atelier', 'youtube'],
  youtube: ['youtube', 'boutique', 'atelier', 'tiktok'],
};

interface EtatVivant { source: Source; heure: number; drop: number }

function EcranReseau({ source }: { source: Source }) {
  const liste = useRef<HTMLDivElement>(null);
  useGlisse(liste, source);
  const s = SOURCES.find(x => x.id === source)!;
  return (
    <div className="hl-cq">
      <CroquisTete etiquette={<span key={source} className="hl-cq-etiquette"><i />{s.arrive}</span>} />
      <div className="hl-cq-liens" ref={liste}>
        {ORDRE[source].map((cle, i) => <CroquisLien key={cle} cle={cle} titre={LIENS[cle]} vedette={i === 0} picto={cle === 'tiktok' || cle === 'youtube' ? <Icone nom={cle} taille={14} /> : undefined} />)}
      </div>
    </div>
  );
}

/** Le compte à rebours d'un lancement : il égrène ses secondes tant qu'on le regarde. */
function Rebours({ actif }: { actif: boolean }) {
  const [reste, setReste] = useState(((2 * 24 + 14) * 60 + 8) * 60 + 12);
  useEffect(() => {
    if (!actif || mouvementReduit()) return;
    const t = setInterval(() => setReste(r => r - 1), 1000);
    return () => clearInterval(t);
  }, [actif]);
  const j = Math.floor(reste / 86400), h = Math.floor((reste % 86400) / 3600), m = Math.floor((reste % 3600) / 60), s = reste % 60;
  const deux = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="hl-cq-carte" role="timer" aria-label="Lancement dans deux jours et demi">
      <Icone nom="horloge" taille={16} />
      <span><b>Lancement dans</b><span className="hl-cq-chrono">{deux(j)} j {deux(h)} h {deux(m)} min {deux(s)} s</span></span>
    </div>
  );
}

function EcranHeure({ heure, actif }: { heure: number; actif: boolean }) {
  const liste = useRef<HTMLDivElement>(null);
  const soir = heure >= 18;
  useGlisse(liste, soir ? 'soir' : 'matin');
  return (
    <div className="hl-cq">
      <div className="hl-cq-statut"><b>{String(heure).padStart(2, '0')}:00</b></div>
      <CroquisTete />
      <div className="hl-cq-liens" ref={liste}>
        {soir
          ? <CroquisLien key="episode" cle="episode" titre="Dernier épisode" vedette picto={<Icone nom="play" taille={14} />} data-arrive="" />
          : <CroquisLien key="appel" cle="appel" titre="Réserver un appel" vedette picto={<Icone nom="agenda" taille={14} />} />}
        <CroquisLien key="formations" cle="formations" titre="Mes formations" />
        <div data-cle="rebours"><Rebours actif={actif} /></div>
      </div>
    </div>
  );
}

function EcranDrop({ drop }: { drop: number }) {
  const code = 'MERCI'.slice(0, drop >= 2 ? 5 : drop === 1 ? 3 : 0);
  const ouvert = drop >= 2;
  return (
    <div className="hl-cq">
      <CroquisTete />
      <div className="hl-cq-liens">
        <CroquisLien titre="Ma boutique" />
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
        <CroquisLien titre="Réserver un atelier" />
      </div>
    </div>
  );
}

const CHAPITRES = [
  { titre: 'Selon d’où l’on vient', texte: 'Ton TikTok passe en tête pour qui arrive de TikTok, ta chaîne pour qui vient de YouTube. Hopla reconnaît l’app tout seul, sans lien différent par réseau.' },
  { titre: 'Selon l’heure', texte: '« Réserver un appel » le matin en semaine, « Dernier épisode » le soir. Et un compte à rebours avant un lancement, sans dévoiler l’adresse.' },
  { titre: 'Des drops', texte: 'Un lien qui s’ouvre avec un code, ou pour les cinquante premiers. Le compteur de places se tient à jour tout seul.' },
];

function EcranChapitre({ i, e, actif }: { i: number; e: EtatVivant; actif: boolean }) {
  return i === 0 ? <EcranReseau source={e.source} /> : i === 1 ? <EcranHeure heure={e.heure} actif={actif} /> : <EcranDrop drop={e.drop} />;
}
const LABELS = ['La page change l’ordre de ses liens selon le réseau d’origine du visiteur.', 'La page met en avant un autre lien le soir, et affiche un compte à rebours.', 'Un lien réservé s’ouvre avec un code, et ses places se comptent.'];

export function Vivante() {
  const [actif, setActif] = useState(-1);
  const [e, setE] = useState<EtatVivant>({ source: 'instagram', heure: 9, drop: 0 });
  const joues = useRef(new Set<number>());
  const chapitres = useRef<(HTMLElement | null)[]>([]);

  // Le chapitre lu : celui qui croise le milieu de l'écran.
  useEffect(() => {
    if (typeof IntersectionObserver !== 'function') return;
    const o = new IntersectionObserver(entrees => {
      for (const en of entrees) if (en.isIntersecting) setActif(Number((en.target as HTMLElement).dataset.chapitre));
    }, { rootMargin: '-45% 0px -45% 0px' });
    chapitres.current.forEach(c => c && o.observe(c));
    return () => o.disconnect();
  }, []);

  // Chaque chapitre joue sa démo la première fois qu'on le lit.
  useEffect(() => {
    if (actif < 0 || joues.current.has(actif)) return;
    joues.current.add(actif);
    if (mouvementReduit()) { setE(x => (actif === 0 ? { ...x, source: 'tiktok' } : actif === 1 ? { ...x, heure: 21 } : { ...x, drop: 3 })); return; }
    const t: ReturnType<typeof setTimeout>[] = [];
    if (actif === 0) t.push(setTimeout(() => setE(x => ({ ...x, source: 'tiktok' })), 700));
    if (actif === 1) for (let h = 10; h <= 21; h++) t.push(setTimeout(() => setE(x => ({ ...x, heure: h })), 500 + (h - 10) * 90));
    if (actif === 2) [1, 2, 3].forEach((n, k) => t.push(setTimeout(() => setE(x => ({ ...x, drop: n })), 600 + k * 650)));
    return () => t.forEach(clearTimeout);
  }, [actif]);

  const rejouer = (i: number) => {
    joues.current.delete(i);
    setE(x => (i === 0 ? { ...x, source: 'instagram' } : i === 1 ? { ...x, heure: 9 } : { ...x, drop: 0 }));
    setActif(-1);
    requestAnimationFrame(() => setActif(i));
  };

  const tel = (i: number, l: number) => (
    <Telephone largeur={l} label={LABELS[i]}>
      <EcranChapitre i={i} e={e} actif={actif === i} />
    </Telephone>
  );

  return (
    <section className="hl-section" id="fonctions" aria-labelledby="vivante">
      <div className="hl-tete-section hl-entre">
        <h2 id="vivante" className="hl-h2">Une page qui change selon qui la regarde.</h2>
        <p className="hl-chapo">Un seul lien dans ta bio. Hopla s’occupe du reste.</p>
      </div>
      <div className="hl-vivante">
        <ol className="hl-chapitres">
          {CHAPITRES.map((c, i) => (
            <li key={c.titre} ref={el => { chapitres.current[i] = el; }} data-chapitre={i} className="hl-chapitre" data-lu={actif === i || undefined}>
              <h3 className="hl-h3">{c.titre}</h3>
              <p>{c.texte}</p>
              {i === 0 && (
                <div className="hl-onglets" role="group" aria-label="Essayer depuis un réseau">
                  {SOURCES.map(s => <button key={s.id} type="button" aria-pressed={e.source === s.id} onClick={() => { joues.current.add(0); setE(x => ({ ...x, source: s.id })); }}>{s.nom}</button>)}
                </div>
              )}
              {i > 0 && <Revoir onClick={() => rejouer(i)} />}
              <div className="hl-chapitre-tel">{tel(i, 280)}</div>
            </li>
          ))}
        </ol>
        <div className="hl-vivante-tel" aria-hidden={actif < 0 || undefined}>
          <div className="hl-colle">{tel(Math.max(0, actif), 300)}</div>
        </div>
      </div>
    </section>
  );
}

/* ---- 04 · Tout ce qu'il faut autour ---- */

function Case({ picto, titre, texte, large, rang, children }: { picto: string; titre: string; texte: string; large?: 2 | 3; rang: number; children: (joue: boolean) => ReactNode }) {
  const [ref, vu] = useVu<HTMLLIElement>(0.4);
  const [tour, setTour] = useState(0);
  return (
    <li ref={ref} className="hl-case hl-entre" data-large={large} style={d(rang * 60)} onMouseEnter={() => vu && setTour(t => t + 1)}>
      <Icone nom={picto} taille={24} />
      <h3 className="hl-case-titre">{titre}</h3>
      <p>{texte}</p>
      <div key={tour} className="hl-case-demo">{children(vu)}</div>
    </li>
  );
}

function Tape({ texte, joue, apres = 0 }: { texte: string; joue: boolean; apres?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!joue) return;
    if (mouvementReduit()) { setN(texte.length); return; }
    const t = [...texte].map((_, k) => setTimeout(() => setN(k + 1), apres + k * 45));
    return () => t.forEach(clearTimeout);
  }, [joue, texte, apres]);
  return <>{texte.slice(0, n)}</>;
}

function DemoListe({ joue }: { joue: boolean }) {
  const [merci, setMerci] = useState(false);
  useEffect(() => { if (!joue) return; const t = setTimeout(() => setMerci(true), mouvementReduit() ? 0 : 1400); return () => clearTimeout(t); }, [joue]);
  return (
    <div className="hl-demo-liste">
      <div className="hl-mini-carte">
        <b>Rejoins ma liste</b>
        <span className="hl-gris">Un e-mail de temps en temps, rien de plus.</span>
        {merci ? <span className="hl-mini-merci"><Icone nom="check" taille={16} />Merci, c’est noté.</span> : (
          <span className="hl-mini-form"><span className="hl-mini-champ"><Tape texte="marie@exemple.fr" joue={joue} apres={200} /></span><span className="hl-mini-ok">S’inscrire</span></span>
        )}
      </div>
      <p className="hl-outils">Brevo · Mailchimp · CSV</p>
    </div>
  );
}

const LANGUES = ['Bonjour', 'Hello', 'Hola', 'Hallo', 'Ciao', 'Bonjour'];
function DemoLangues({ joue }: { joue: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!joue || mouvementReduit()) return;
    const t = LANGUES.slice(1).map((_, k) => setTimeout(() => setI(k + 1), 300 + k * 650));
    return () => t.forEach(clearTimeout);
  }, [joue]);
  return <p className="hl-demo-langue" aria-label="Bonjour, Hello, Hola, Hallo, Ciao"><span key={i}>{LANGUES[i]}</span></p>;
}

function DemoQR({ joue }: { joue: boolean }) {
  const modules = useMemo(() => {
    const q = QRCode.create('https://hopla.page/marie-lambert?s=qr', { errorCorrectionLevel: 'M' });
    const n = q.modules.size;
    const pleins: [number, number][] = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.modules.get(x, y)) pleins.push([x, y]);
    return { n, pleins };
  }, []);
  return (
    <svg className="hl-demo-qr" data-joue={joue || undefined} viewBox={`-2 -2 ${modules.n + 4} ${modules.n + 4}`} role="img" aria-label="Un QR code vers la page de Marie">
      {modules.pleins.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1.04" height="1.04" style={d((x + y) * 14)} />)}
    </svg>
  );
}

const SEMAINE = [38, 52, 46, 88, 61, 70, 57];
export function Autour() {
  return (
    <section className="hl-section" aria-labelledby="autour">
      <div className="hl-tete-section hl-entre">
        <h2 id="autour" className="hl-h2">Et tout ce qu’il faut autour.</h2>
      </div>
      <ul className="hl-bento">
        <Case rang={0} large={2} picto="courrier" titre="Ta liste e-mail, sans outil en plus" texte="Un formulaire sur ta page. Les inscrits arrivent chez toi, en CSV, ou directement dans Brevo et Mailchimp.">
          {joue => <DemoListe joue={joue} />}
        </Case>
        <Case rang={1} picto="etoile" titre="Avis et preuves" texte="Ta note Google ou Malt, un chiffre qui parle, les mots d’un client.">
          {joue => (
            <div className="hl-demo-avis" data-joue={joue || undefined}>
              <b>4,9</b>
              <span className="hl-etoiles" aria-hidden="true">{[0, 1, 2, 3, 4].map(k => <span key={k} style={d(k * 80)}><Icone nom="etoile" taille={18} /></span>)}</span>
              <span className="hl-gris">sur 5 · 128 avis Google, exemple</span>
            </div>
          )}
        </Case>
        <Case rang={2} picto="globe" titre="Ta page parle sa langue" texte="Français, anglais, espagnol, allemand, italien : chaque visiteur la lit dans la sienne.">
          {joue => <DemoLangues joue={joue} />}
        </Case>
        <Case rang={3} picto="film" titre="Une vidéo, lue sur place" texte="Ta vidéo se lance sur la page, sans quitter Hopla.">
          {joue => <div className="hl-demo-video" data-joue={joue || undefined}><Icone nom="play" taille={26} /><i /></div>}
        </Case>
        <Case rang={4} picto="qr" titre="Un QR code prêt à imprimer" texte="Pour une affiche, une carte, un stand. Ceux qui le scannent se comptent à part.">
          {joue => <DemoQR joue={joue} />}
        </Case>
        <Case rang={5} large={3} picto="cadenas" titre="Des stats sans cookie" texte="Pas de bannière à imposer à tes visiteurs : l’adresse IP n’est jamais gardée, aucun traceur ne les suit d’un site à l’autre.">
          {joue => (
            <div className="hl-demo-barres" data-joue={joue || undefined} aria-hidden="true">
              {SEMAINE.map((v, k) => <span key={k} style={{ ...d(k * 70), '--h': `${v}%` } as CSSProperties}><i /><small>{'LMMJVSD'[k]}</small></span>)}
            </div>
          )}
        </Case>
      </ul>
    </section>
  );
}

/* ---- 05 · Les stats en une phrase ---- */

type Morceau = string | { n: number; avant?: string; suite?: string };

function Phrase({ morceaux, joue, depart, hausse }: { morceaux: Morceau[]; joue: boolean; depart: number; hausse?: boolean }) {
  let k = 0;
  return (
    <li className="hl-stat" data-joue={joue || undefined}>
      {hausse && <span className="hl-stat-hausse" style={d(depart)}><Icone nom="courbe" taille={22} /></span>}
      <span>
        {morceaux.map((m, i) => {
          if (typeof m === 'string') return m.split(' ').filter(Boolean).map((mot, j) => <span key={`${i}-${j}`}><span className="hl-stat-mot" style={d(depart + k++ * 30)}>{mot}</span> </span>);
          return <Nombre key={i} {...m} joue={joue} delai={depart + k++ * 30} />;
        })}
      </span>
    </li>
  );
}

/** Un nombre qui compte depuis 0 quand son mot apparaît. */
function Nombre({ n, avant = '', suite = '', joue, delai }: { n: number; avant?: string; suite?: string; joue: boolean; delai: number }) {
  const [pret, setPret] = useState(false);
  useEffect(() => { if (!joue) return; const t = setTimeout(() => setPret(true), delai); return () => clearTimeout(t); }, [joue, delai]);
  const v = useCompte(n, pret);
  return <><span className="hl-stat-mot hl-stat-nombre" style={d(delai)}>{avant}{v.toLocaleString('fr-FR')}{suite}</span> </>;
}

export function Stats() {
  const [ref, vu] = useVu<HTMLOListElement>(0.3);
  const [tour, setTour] = useState(0);
  return (
    <section className="hl-section" aria-labelledby="stats">
      <div className="hl-tete-section hl-entre">
        <h2 id="stats" className="hl-h2">Tes stats, en une phrase.</h2>
        <p className="hl-chapo">Pas de tableau à déchiffrer. Hopla te dit ce qui a bougé, et t’envoie le résumé chaque lundi à 9 h.</p>
      </div>
      <div className="hl-stats">
        <div>
          <ol ref={ref} key={tour} className="hl-stats-liste">
            <Phrase joue={vu} depart={0} hausse morceaux={['Ta page a eu', { n: 412, suite: '\u00a0vues,' }, { n: 18, suite: '\u00a0%' }, 'de plus que la semaine d’avant.']} />
            <Phrase joue={vu} depart={500} morceaux={['Instagram t’amène le plus de monde :', { n: 61, suite: '\u00a0%' }, 'des visites.']} />
            <Phrase joue={vu} depart={950} hausse morceaux={['Ton meilleur jour : jeudi 16 octobre, avec', { n: 88 }, 'vues. Un post ce jour-là ?']} />
            <Phrase joue={vu} depart={1450} hausse morceaux={['Ton lien « Ma boutique » a fait', { n: 40, avant: '+', suite: '\u00a0%' }, 'de clics (35 contre 25).']} />
            <Phrase joue={vu} depart={1950} morceaux={[{ n: 38 }, 'clics se sont ouverts directement dans leur app, sans rester coincés dans Instagram ou TikTok.']} />
          </ol>
          <p className="hl-gris hl-petit">Chiffres d’exemple. <Revoir onClick={() => setTour(t => t + 1)} /></p>
        </div>
        <div className="hl-mail" data-joue={vu || undefined} key={`m${tour}`} aria-label="L’e-mail du lundi" role="img">
          <div className="hl-mail-tete"><span className="hl-mail-logo" /><b>Hopla</b><span className="hl-gris">lundi 9:00</span></div>
          <p className="hl-mail-sujet">Ta semaine sur Hopla</p>
          <p>Ta page a eu 412 vues, 18 % de plus que la semaine d’avant.</p>
          <p>Instagram t’amène le plus de monde : 61 % des visites.</p>
          <p>Ton lien « Ma boutique » a fait +40 % de clics.</p>
          <span className="hl-mail-bouton">Voir mes stats</span>
        </div>
      </div>
    </section>
  );
}
