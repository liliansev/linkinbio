import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { THEMES } from '../lib/themes.ts';
import { Icone } from '../components/Icone.tsx';
import { Symbole } from '../components/Logo.tsx';
import { EcranPage, Telephone } from './Telephone.tsx';
import { Reserver, allerAuChamp, useReservation } from './Reserver.tsx';
import type { ApiAccueil } from './Reserver.tsx';
import { BLOCS_MARIE_RESEAUX, ceQuiChange, nomTape, pageJules, pageLilian, pageMarie, pageVisiteur, selonReseau } from './exemples.ts';
import { NOMS_AUDIENCES, deReseau } from '../lib/provenance.ts';
import { useGlisse } from './mouvement.ts';
import { Roue } from './Roue.tsx';
import { APPEL, MOTS, useInscription } from './textes.ts';

/*
 * 01 · La barre et l'ouverture. La promesse, puis tout de suite le champ du
 * nom, sur le bleu Klein d'un des thèmes. À côté (dessous au téléphone), la
 * roue des réseaux (`Roue.tsx`) : les visiteurs partent d'Instagram, TikTok,
 * YouTube et LinkedIn, passent par le même lien et tombent chacun sur la page
 * rangée pour eux ; le nom qu'on tape y remplace celui d'Inès. Juste dessous,
 * « Essaie » (`Selon`) : on touche un réseau et la page de Marie (ou la
 * sienne) se range. Au téléphone, où le clavier cache la roue, une carte aux
 * couleurs du thème reprend son nom juste sous la réponse du champ.
 */

export function Marque() {
  return (
    <a href="/" className="hl-marque" aria-label="Hopla, accueil">
      <Symbole />
      <span>Hopla</span>
    </a>
  );
}

export function Barre() {
  const [defile, setDefile] = useState(false);
  const [menu, setMenu] = useState(false);
  // Au chargement, le champ de l'ouverture est à l'écran : le bouton de la barre attend qu'il en sorte.
  const [champ, setChamp] = useState(true);
  const [debut, suite] = APPEL[useInscription()];
  const { etape, ancien, correction } = useReservation();
  // Une fois l'e-mail parti, il n'y a plus rien à créer : la barre garde Connexion.
  const envoye = etape === 'fait' || !!ancien || correction;
  // Au bureau, Connexion glisse de la largeur du bouton quand il s'efface : on la mesure.
  const bouton = useRef<HTMLAnchorElement>(null);
  const [creer, setCreer] = useState(0);
  useEffect(() => {
    const el = bouton.current;
    if (!el || typeof ResizeObserver !== 'function') return;
    const o = new ResizeObserver(() => setCreer(el.offsetWidth));
    o.observe(el);
    return () => o.disconnect();
  }, []);
  // Le bouton de la barre s'efface tant qu'un champ du nom est à l'écran : un seul appel à la fois.
  useEffect(() => {
    if (typeof IntersectionObserver !== 'function') { setChamp(false); return; }
    const vus = new Set<Element>();
    const o = new IntersectionObserver(entrees => {
      for (const en of entrees) if (en.isIntersecting) vus.add(en.target); else vus.delete(en.target);
      setChamp(vus.size > 0);
    }, { rootMargin: '-60px 0px 0px 0px' });
    document.querySelectorAll('[data-zone-appel]').forEach(el => o.observe(el));
    return () => o.disconnect();
  }, []);
  useEffect(() => {
    const f = () => setDefile(scrollY > 8);
    f();
    addEventListener('scroll', f, { passive: true });
    return () => removeEventListener('scroll', f);
  }, []);
  // Au téléphone, le menu se ferme avec Échap ou en touchant ailleurs.
  useEffect(() => {
    if (!menu) return;
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    const ailleurs = (e: PointerEvent) => { if (!(e.target as Element).closest('.hl-barre')) setMenu(false); };
    addEventListener('keydown', echap);
    addEventListener('pointerdown', ailleurs);
    return () => { removeEventListener('keydown', echap); removeEventListener('pointerdown', ailleurs); };
  }, [menu]);
  return (
    <header className="hl-barre" style={{ '--creer': `${creer}px` } as CSSProperties} data-defile={defile || menu || undefined} data-champ={(champ && !menu) || undefined} data-envoye={envoye || undefined}>
      <div className="hl-barre-dedans">
        <Marque />
        <nav className="hl-barre-nav" aria-label="Sections">
          {SECTIONS.map(([lien, texte]) => <a key={lien} href={lien}>{texte}</a>)}
        </nav>
        <div className="hl-barre-actions">
          <a href="/admin" className="hl-barre-connexion">Connexion</a>
          <a ref={bouton} href="#reserver" className="hl-btn hl-btn-petit" onClick={ev => { ev.preventDefault(); setMenu(false); allerAuChamp(); }}><span>{debut}<span className="hl-large">{suite}</span></span></a>
          <button type="button" className="hl-barre-menu" aria-expanded={menu} aria-controls="hl-menu" aria-label={menu ? 'Fermer le menu' : 'Ouvrir le menu'} onClick={() => setMenu(m => !m)}>
            <Icone nom={menu ? 'ui-fermer' : 'ui-menu'} taille={22} />
          </button>
        </div>
      </div>
      <nav id="hl-menu" className="hl-menu" aria-label="Menu" hidden={!menu}>
        {SECTIONS.map(([lien, texte]) => <a key={lien} href={lien} onClick={() => setMenu(false)}>{texte}</a>)}
        <a href="/admin">Connexion</a>
      </nav>
    </header>
  );
}

/** Les sections de la barre, et du menu au téléphone. */
const SECTIONS = [['#fonctions', 'Fonctions'], ['#themes', 'Thèmes'], ['#prix', 'Prix'], ['#questions', 'Questions']];

/**
 * Essaie (juste sous l'ouverture) : le même lien, ouvert depuis Instagram,
 * TikTok, YouTube ou LinkedIn, au choix du visiteur. Toucher un onglet range
 * la page de Marie (ou la sienne, s'il a tapé son nom) pour ce réseau : le
 * lien qui a bougé est cerclé de la couleur du réseau, et le fond de la
 * section en prend la teinte. Rien ne joue tout seul : la roue d'au-dessus
 * montre déjà le trafic.
 */
const RESEAUX = ['instagram', 'tiktok', 'youtube', 'linkedin'] as const;
type ReseauDemo = (typeof RESEAUX)[number];
const COULEURS: Record<ReseauDemo, { fond: string; anneau: string; teinte: string }> = {
  instagram: { fond: '#d62976', anneau: '#c13584', teinte: '#f56040' },
  tiktok: { fond: '#111111', anneau: '#111111', teinte: '#25f4ee' },
  youtube: { fond: '#e00000', anneau: '#ff0000', teinte: '#ff2a2a' },
  linkedin: { fond: '#0a66c2', anneau: '#0a66c2', teinte: '#2f8ae0' },
};
const THEME = THEMES.find(t => t.id === 'champagne')!;

const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;
/** Les mots d'un titre, qui montent un à un ; ceux de `vifs` prennent la couleur d'accent. */
const mots = (texte: string, depart = 0, vifs = 0) => {
  const liste = texte.split(' ');
  return liste.map((m, i) => (
    <span key={i}><span className={`hl-mot${i >= liste.length - vifs ? ' hl-vif' : ''}`} style={d(depart + i * 55)}>{m}</span>{' '}</span>
  ));
};

/** Le nom tapé dans le champ, s'il fait au moins trois caractères et qu'il est libre. */
function usePseudo() {
  const { nom, saisie, verif, ancien } = useReservation();
  const tape = nom.replace(/-$/, '');
  const pseudo = tape.length >= 3 ? tape : '';
  const pris = !!pseudo && verif?.nom === pseudo && verif.etat !== 'libre' && pseudo !== ancien;
  return { pseudo, pris, affiche: nomTape(saisie, pseudo), verif };
}

export function Ouverture({ api }: { api: ApiAccueil }) {
  const { pseudo, pris, affiche } = usePseudo();
  const mode = useInscription();
  return (
    <section className="hl-heros" data-teinte="klein" aria-labelledby="titre">
      <div className="hl-heros-texte">
        <h1 id="titre" className="hl-h1 hl-heros-titre hl-mots">{mots('La page de liens qui s’adapte à chaque visiteur.', 0, 2)}</h1>
        <p className="hl-chapo hl-apparait" style={d(420)}>
          Rends ta page dynamique selon <span className="hl-insecable">le réseau</span> social.<br />
          Programme tes liens selon <span className="hl-insecable">le moment</span> de la journée.
        </p>
        <div className="hl-apparait" style={d(540)} data-zone-appel="">
          <Reserver api={api} id="reserver" grand premier note={<>{MOTS[mode].note} <a href="/lilian">Voir une vraie page</a></>} apercu={pseudo && !pris && (
            <div className="hl-apercu hl-petit-seul" style={{ background: THEME.fondUni, color: THEME.texte }} aria-hidden="true">
              <span className="hl-apercu-avatar">{affiche.split(' ').slice(0, 2).map(m => m[0]).join('')}</span>
              <span className="hl-apercu-texte"><b>{affiche}</b><small style={{ color: THEME.doux }}>hopla.page/{pseudo} · {THEME.nom}</small></span>
            </div>
          )} />
        </div>
      </div>
      <div className="hl-heros-visuel hl-apparait" style={d(700)}>
        <Roue pseudo={pseudo && !pris ? pseudo : ''} nom={pseudo && !pris ? affiche : ''} />
      </div>
    </section>
  );
}

export function Selon() {
  // -1 : personne n'est encore arrivé de nulle part ; sinon le rang dans RESEAUX.
  const [rang, setRang] = useState(-1);
  const [eclat, setEclat] = useState(0);
  const liste = useRef<HTMLDivElement>(null);
  const { pseudo, pris, affiche, verif } = usePseudo();
  const { etape } = useReservation();

  const reseau = rang >= 0 ? RESEAUX[rang] : null;
  useGlisse(liste, reseau ?? 'direct', 450, '.lp-bloc');
  const toucher = (i: number) => { setRang(i); setEclat(e => e + 1); };
  // Dès qu'on tape un nom de trois caractères, la page du milieu devient la sienne ;
  // un nom pris le dit dans la barre d'adresse, et une fois l'e-mail parti, l'adresse est cochée.
  const base = pseudo ? pageVisiteur(pseudo, THEME.id, affiche) : pageMarie(THEME.id, { blocs: BLOCS_MARIE_RESEAUX });
  const page = selonReseau(base, reseau ?? '');
  const phrase = reseau ? ceQuiChange(base, reseau) : 'Touche un réseau pour voir la page de son visiteur.';
  const vuDe = reseau ? `vue par un visiteur arrivé ${deReseau(reseau)}` : 'vue par un visiteur';
  const adresse = pris
    ? <span className="hl-tel-pris"><s>hopla.page/{pseudo}</s> {verif?.etat === 'pris' ? 'déjà pris' : 'impossible'}</span>
    : etape === 'fait' && pseudo
      ? <span key="fait" className="hl-tel-fait"><Icone nom="check" taille={12} />hopla.page/{pseudo}</span>
      : `hopla.page/${pseudo || 'marie-lambert'}`;
  const couleur = reseau ? COULEURS[reseau] : null;

  return (
    <section className="hl-section hl-selon" data-teinte="reseau" aria-labelledby="selon" style={couleur ? { '--teinte': couleur.teinte } as CSSProperties : undefined}>
      <div className="hl-tete-section hl-entre">
        <h2 id="selon" className="hl-h2">Choisis d’où arrive ton visiteur.</h2>
        <p className="hl-chapo">Le même lien dans toutes tes bios. Touche un réseau : la page se range pour celui qui arrive de là.</p>
      </div>
      <div className="hl-reseaux hl-entre" role="group" aria-label="D’où arrive le visiteur">
        {RESEAUX.map((r, i) => (
          <button key={r} type="button" aria-pressed={rang === i} style={{ '--fond': COULEURS[r].fond } as CSSProperties} onClick={() => toucher(i)}>
            <Icone nom={r} taille={16} /><span>{NOMS_AUDIENCES[r]}</span>
          </button>
        ))}
      </div>
      <div className="hl-scene hl-entre">
        <div className="hl-scene-tel hl-scene-gauche" aria-hidden="true">
          <Telephone largeur={250} label="La page de Lilian Sevoumian, dans le thème Nuit et pêche">
            <EcranPage page={pageLilian('nuit-peche')} />
          </Telephone>
        </div>
        <div className="hl-scene-tel hl-scene-droite" aria-hidden="true">
          <Telephone largeur={250} label="La page de Jules Moreau, musicien, dans le thème Arcade">
            <EcranPage page={pageJules('arcade')} />
          </Telephone>
        </div>
        <div className="hl-scene-tel hl-scene-milieu" data-eclat={eclat ? (eclat % 2 ? 'a' : 'b') : undefined}
          style={couleur ? { '--anneau': couleur.anneau } as CSSProperties : undefined}>
          <Telephone largeur={290} adresse={adresse} label={pseudo && !pris
            ? `Un aperçu de ta page, hopla.page/${pseudo}, ${vuDe}`
            : `La page de Marie Lambert, céramiste, ${vuDe}`}>
            <div key={pseudo ? 'toi' : 'marie'} ref={liste} className="hl-fondu" data-pris={pris || undefined}><EcranPage page={page} /></div>
          </Telephone>
        </div>
      </div>
      <p key={rang} className="hl-legende hl-reseaux-phrase" aria-live="polite">{phrase}</p>
    </section>
  );
}
