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
import { mouvementReduit, useGlisse, useVu } from './mouvement.ts';
import { APPEL, MOTS, useInscription } from './textes.ts';

/*
 * 01 · La barre et l'ouverture. La promesse, puis tout de suite le champ du
 * nom : on tape, et le téléphone d'à côté devient sa page (son nom, son
 * adresse). Ce téléphone prouve la promesse : au-dessus, les onglets
 * Instagram, TikTok, YouTube et LinkedIn s'enfoncent l'un après l'autre, une
 * fois, et la page de Marie (puis la sienne) se recompose dessous, le lien
 * qui a bougé cerclé de la couleur du réseau, la lumière du héros aussi.
 * Au bureau, le texte à gauche et les téléphones à droite ; au
 * téléphone, où le clavier cache la scène, une carte aux couleurs du thème
 * reprend son nom juste sous la réponse du champ. Trois téléphones s'ouvrent en éventail, une
 * fois, sur une lumière grise.
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
 * La tournée des réseaux : le même lien, ouvert depuis Instagram, TikTok,
 * YouTube puis LinkedIn. Chaque onglet s'enfonce comme sous un doigt, puis la
 * page se recompose ; elle s'arrête sur LinkedIn. Toucher un onglet prend la
 * main. Chaque réseau a sa couleur : l'onglet choisi, le cercle autour du
 * lien qui a bougé, et la lumière derrière les téléphones.
 */
const RESEAUX = ['instagram', 'tiktok', 'youtube', 'linkedin'] as const;
type ReseauDemo = (typeof RESEAUX)[number];
const COULEURS: Record<ReseauDemo, { fond: string; anneau: string; lueur: string }> = {
  instagram: { fond: '#d62976', anneau: '#c13584', lueur: '#f56040' },
  tiktok: { fond: '#111111', anneau: '#111111', lueur: '#25f4ee' },
  youtube: { fond: '#e00000', anneau: '#ff0000', lueur: '#ff2a2a' },
  linkedin: { fond: '#0a66c2', anneau: '#0a66c2', lueur: '#2f8ae0' },
};
/** L'attente avant le premier onglet (l'éventail finit de s'ouvrir), puis entre deux onglets. */
const PREMIER = 1900, ENTRE = 2900, APPUI = 220;
const THEME = THEMES.find(t => t.id === 'champagne')!;

const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;
const mots = (texte: string, depart = 0) => texte.split(' ').map((m, i) => (
  <span key={i}><span className="hl-mot" style={d(depart + i * 55)}>{m}</span>{' '}</span>
));

export function Ouverture({ api }: { api: ApiAccueil }) {
  // -1 : personne n'est encore arrivé de nulle part ; sinon le rang dans RESEAUX.
  const [rang, setRang] = useState(-1);
  const [appui, setAppui] = useState(-1);
  const [eclat, setEclat] = useState(0);
  const [touche, setTouche] = useState(false);
  const [refScene, vu] = useVu<HTMLDivElement>(0.5);
  const liste = useRef<HTMLDivElement>(null);
  const { nom, saisie, verif, etape, ancien } = useReservation();
  const mode = useInscription();

  const choisir = (i: number) => { setRang(i); setEclat(e => e + 1); };
  // La tournée part quand le téléphone est à l'écran, et s'arrête sur LinkedIn ; avec moins de mouvement, TikTok d'emblée.
  useEffect(() => {
    if (!vu || touche) return;
    if (mouvementReduit()) { if (rang < 0) setRang(1); return; }
    if (rang === RESEAUX.length - 1) return;
    const attente = rang < 0 ? PREMIER : ENTRE;
    const t1 = setTimeout(() => setAppui(rang + 1), attente);
    const t2 = setTimeout(() => { setAppui(-1); choisir(rang + 1); }, attente + APPUI);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [vu, rang, touche]);

  const reseau = rang >= 0 ? RESEAUX[rang] : null;
  useGlisse(liste, reseau ?? 'direct', 450, '.lp-bloc');
  const toucher = (i: number) => { setTouche(true); setAppui(-1); choisir(i); };
  // Dès qu'on tape un nom de trois caractères, la page du milieu devient la sienne ;
  // un nom pris le dit dans la barre d'adresse, et une fois l'e-mail parti, l'adresse est cochée.
  const tape = nom.replace(/-$/, '');
  const pseudo = tape.length >= 3 ? tape : '';
  const pris = !!pseudo && verif?.nom === pseudo && verif.etat !== 'libre' && pseudo !== ancien;
  // Le nom tel qu'on l'a tapé, accents compris.
  const affiche = nomTape(saisie, pseudo);
  const base = pseudo ? pageVisiteur(pseudo, THEME.id, affiche) : pageMarie(THEME.id, { blocs: BLOCS_MARIE_RESEAUX });
  const page = selonReseau(base, reseau ?? '');
  const phrase = reseau ? ceQuiChange(base, reseau) : 'Le même lien dans toutes tes bios. Regarde ce que voit chaque visiteur.';
  const vuDe = reseau ? `vue par un visiteur arrivé ${deReseau(reseau)}` : 'vue par un visiteur';
  const adresse = pris
    ? <span className="hl-tel-pris"><s>hopla.page/{pseudo}</s> {verif?.etat === 'pris' ? 'déjà pris' : 'impossible'}</span>
    : etape === 'fait' && pseudo
      ? <span key="fait" className="hl-tel-fait"><Icone nom="check" taille={12} />hopla.page/{pseudo}</span>
      : `hopla.page/${pseudo || 'marie-lambert'}`;
  const couleur = reseau ? COULEURS[reseau] : null;

  return (
    <section className="hl-heros" aria-labelledby="titre" style={couleur ? { '--lueur': couleur.lueur } as CSSProperties : undefined}>
      <div className="hl-heros-fond" aria-hidden="true" />
      <div className="hl-heros-texte">
        <h1 id="titre" className="hl-h1 hl-heros-titre hl-mots">{mots('La page de liens qui s’adapte à chaque visiteur.')}</h1>
        <p className="hl-chapo hl-apparait" style={d(420)}>
          Un seul lien dans ta bio. Ta page change selon le réseau et l’heure, ouvre tes liens dans leurs apps et se modifie depuis ton téléphone.
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
      <div className="hl-heros-visuel">
        <div className="hl-reseaux hl-apparait" style={d(900)} role="group" aria-label="D’où arrive le visiteur">
          {RESEAUX.map((r, i) => (
            <button key={r} type="button" aria-pressed={rang === i} data-appui={appui === i || undefined}
              style={{ '--fond': COULEURS[r].fond } as CSSProperties} onClick={() => toucher(i)}>
              <Icone nom={r} taille={16} /><span>{NOMS_AUDIENCES[r]}</span>
            </button>
          ))}
        </div>
        <div ref={refScene} className="hl-scene">
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
        <p key={rang} className="hl-legende hl-reseaux-phrase" aria-live={touche ? 'polite' : 'off'}>{phrase}</p>
      </div>
    </section>
  );
}
