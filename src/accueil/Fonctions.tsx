import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Icone } from '../components/Icone.tsx';
import { Symbole } from '../components/Logo.tsx';
import { CroquisLien, CroquisTete, Telephone } from './Telephone.tsx';
import { mouvementReduit, useCompte, useGlisse, useSequence, useVisible, useVu } from './mouvement.ts';

/*
 * Ce que fait Hopla, en trois sections : 02 les liens qui s'ouvrent dans
 * leur app, 03 la page qui change selon le réseau, l'heure et les drops,
 * 05 les stats en phrases, lues comme l'e-mail du lundi (le reste de l'offre
 * gratuite se lit dans les prix). Les téléphones y
 * sont des croquis gris : on lit le mouvement, pas un thème. Au téléphone,
 * chaque démo part quand son téléphone est à l'écran, ses onglets juste
 * au-dessus et sa légende dessous. Les légendes ne s'annoncent aux lecteurs d'écran
 * qu'une fois qu'on a touché une commande.
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
  sans: 'Le lien s’ouvre dans le navigateur d’Instagram. Ton visiteur n’y est connecté à rien : on lui demande de se reconnecter, et le plus souvent, il repart.',
  avec: 'Hopla ouvre le lien dans l’app YouTube, où ton visiteur est déjà connecté. Il regarde, il s’abonne, sans rien retaper.',
};

export function DansApp() {
  const [ref, vu] = useVu<HTMLDivElement>(0.6);
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
    <section className="hl-section" id="fonctions" aria-labelledby="dans-app">
      <div className="hl-dans-app">
        <div className="hl-dans-app-tete hl-entre">
          <h2 id="dans-app" className="hl-h2">Tes liens s’ouvrent dans l’app, pas dans Instagram.</h2>
          <p className="hl-chapo">Depuis Instagram ou TikTok, ton lien YouTube ou Spotify s’ouvre dans son app, là où ton visiteur est déjà connecté.</p>
        </div>
        <div ref={ref} className="hl-dans-app-tel">
          <Telephone largeur={290} className="hl-tel-court" label={cote === 'sans'
            ? 'Sans Hopla : le lien YouTube s’ouvre dans le navigateur d’Instagram, qui demande de se connecter, et le visiteur repart.'
            : 'Avec Hopla : le lien YouTube s’ouvre directement dans l’app YouTube, où le visiteur s’abonne.'}>
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
                <div className="hl-integre" data-ouvert={(etape >= 2 && (etape < 4 || reduit)) || undefined}>
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
                  <div className="hl-app-barre"><Icone nom="youtube" taille={18} /><b>YouTube</b></div>
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

/** Le compte à rebours d'un lancement : il égrène ses secondes tant que son chapitre est lu et qu'il est à l'écran. */
function Rebours({ actif }: { actif: boolean }) {
  const [reste, setReste] = useState(((2 * 24 + 14) * 60 + 8) * 60 + 12);
  const [ref, visible] = useVisible<HTMLDivElement>();
  useEffect(() => {
    if (!actif || !visible || mouvementReduit()) return;
    const t = setInterval(() => setReste(r => r - 1), 1000);
    return () => clearInterval(t);
  }, [actif, visible]);
  const j = Math.floor(reste / 86400), h = Math.floor((reste % 86400) / 3600), m = Math.floor((reste % 3600) / 60), s = reste % 60;
  const deux = (n: number) => String(n).padStart(2, '0');
  return (
    <div ref={ref} className="hl-cq-carte" role="timer" aria-label="Lancement dans deux jours et demi">
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
  { court: 'Le réseau', titre: 'Selon le réseau', texte: 'Ton TikTok passe en tête pour qui arrive de TikTok, ta chaîne pour qui vient de YouTube. Hopla reconnaît l’app tout seul, sans lien différent par réseau.' },
  { court: 'L’heure', titre: 'Selon l’heure', texte: '« Réserver un appel » le matin en semaine, « Dernier épisode » le soir. Et un compte à rebours avant un lancement, sans dévoiler l’adresse.' },
  { court: 'Les drops', titre: 'Des drops', texte: 'Un drop, c’est un lien réservé : il s’ouvre avec un code, ou pour les cinquante premiers. Le compteur de places se tient à jour tout seul.' },
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
  const [refMobile, vuMobile] = useVu<HTMLDivElement>(0.6);
  const [touche, setTouche] = useState(false);

  // Au bureau, le chapitre lu est celui qui croise le milieu de l'écran, à côté du téléphone qui reste.
  useEffect(() => {
    if (typeof IntersectionObserver !== 'function' || !matchMedia('(min-width: 1024px)').matches) return;
    const o = new IntersectionObserver(entrees => {
      for (const en of entrees) if (en.isIntersecting) setActif(Number((en.target as HTMLElement).dataset.chapitre));
    }, { rootMargin: '-45% 0px -45% 0px' });
    chapitres.current.forEach(c => c && o.observe(c));
    return () => o.disconnect();
  }, []);

  // Au téléphone, un seul téléphone et trois onglets : le premier chapitre se joue quand le téléphone est à l'écran,
  // les autres quand on les touche. Rien n'avance pendant qu'on lit.
  useEffect(() => { if (vuMobile) setActif(a => (a < 0 ? 0 : a)); }, [vuMobile]);

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
  const lu = Math.max(0, actif);
  const sources = (
    <div className="hl-essai" role="group" aria-label="Essayer depuis un réseau">
      <span className="hl-gris">Arrivé de</span>
      {SOURCES.map(s => <button key={s.id} type="button" aria-pressed={e.source === s.id} onClick={() => { setTouche(true); joues.current.add(0); setE(x => ({ ...x, source: s.id })); }}>{s.nom}</button>)}
    </div>
  );
  const tel = (l: number) => (
    <Telephone largeur={l} className="hl-tel-court hl-tel-vivante" label={LABELS[lu]}>
      <EcranChapitre i={lu} e={e} actif={actif === lu} />
    </Telephone>
  );

  return (
    <section className="hl-section" aria-labelledby="vivante">
      <div className="hl-tete-section hl-entre">
        <h2 id="vivante" className="hl-h2">Une page qui change selon qui la regarde.</h2>
        <p className="hl-chapo">Selon le réseau d’où arrive ton visiteur, l’heure qu’il est, ou le code qu’il a reçu.</p>
      </div>
      <div className="hl-vivante hl-grand-seul">
        <ol className="hl-chapitres">
          {CHAPITRES.map((c, i) => (
            <li key={c.titre} ref={el => { chapitres.current[i] = el; }} data-chapitre={i} className="hl-chapitre" data-lu={actif === i || undefined}>
              <h3 className="hl-h3">{c.titre}</h3>
              <p>{c.texte}</p>
              {i === 0 ? sources : <Revoir onClick={() => rejouer(i)} />}
            </li>
          ))}
        </ol>
        <div className="hl-vivante-tel" aria-hidden={actif < 0 || undefined}>
          <div className="hl-colle">{tel(300)}</div>
        </div>
      </div>
      <div className="hl-vivante-mobile hl-petit-seul">
        <div className="hl-onglets hl-onglets-scene" role="group" aria-label="Trois façons de changer, la démo se rejoue à chaque choix">
          {CHAPITRES.map((c, i) => (
            <button key={c.court} type="button" aria-pressed={lu === i} onClick={() => { setTouche(true); rejouer(i); }}>
              {c.court}
            </button>
          ))}
        </div>
        <div ref={refMobile} className="hl-vivante-mobile-tel">{tel(290)}</div>
        <div className="hl-legendes">
          {/* Les trois légendes réservent la place de la plus longue : rien dessous ne saute. */}
          {CHAPITRES.map((c, i) => i !== lu && (
            <div key={c.court} className="hl-legende-scene hl-legende-gabarit" aria-hidden="true">
              <p><b>{c.titre}.</b> {c.texte}</p>
              {i === 0 && sources}
            </div>
          ))}
          <div key={lu} className="hl-legende-scene" aria-live={touche ? 'polite' : 'off'}>
            <p><b>{CHAPITRES[lu].titre}.</b> {CHAPITRES[lu].texte}</p>
            {lu === 0 && sources}
          </div>
        </div>
      </div>
    </section>
  );
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
    <section className="hl-section hl-section-stats" aria-labelledby="stats">
      <div className="hl-tete-section hl-entre">
        <h2 id="stats" className="hl-h2">Tes stats, en clair.</h2>
        <p className="hl-chapo">Pas de tableau à déchiffrer : Hopla te dit ce qui a bougé, dans ton espace et par e‑mail chaque lundi à 9 h. Sans cookie ni bannière, l’adresse IP de tes visiteurs n’est jamais gardée.</p>
      </div>
      <div className="hl-stats">
        <article className="hl-mail" aria-label="Exemple d’e-mail du lundi">
          <div className="hl-mail-tete"><Symbole className="hl-mail-logo" /><b>Hopla</b><span className="hl-gris">lundi, 9 h</span></div>
          <p className="hl-mail-sujet">Ta semaine sur Hopla</p>
          <ol ref={ref} key={tour} className="hl-stats-liste">
            <Phrase joue={vu} depart={0} hausse morceaux={['Ta page a eu', { n: 412, suite: ' vues,' }, 'soit', { n: 18, suite: ' %' }, 'de plus que la semaine d’avant.']} />
            <Phrase joue={vu} depart={500} morceaux={['Instagram t’amène le plus de monde :', { n: 61, suite: ' %' }, 'des visites.']} />
            <Phrase joue={vu} depart={950} morceaux={['Ton meilleur jour : jeudi, avec', { n: 88 }, 'vues. Un post ce jour-là ?']} />
            <Phrase joue={vu} depart={1450} hausse morceaux={['Ton lien « Ma boutique » a fait', { n: 40, avant: '+', suite: ' %' }, 'de clics (35 contre 25).']} />
            <Phrase joue={vu} depart={1950} morceaux={[{ n: 38 }, 'clics se sont ouverts directement dans leur app, sans rester coincés dans Instagram ou TikTok.']} />
          </ol>
          <span className="hl-mail-bouton" aria-hidden="true">Voir mes stats</span>
        </article>
        <p className="hl-gris hl-petit">Chiffres d’exemple. <Revoir onClick={() => setTour(t => t + 1)} /></p>
      </div>
    </section>
  );
}
