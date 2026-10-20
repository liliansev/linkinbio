import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { THEMES } from '../lib/themes.ts';
import { Icone } from '../components/Icone.tsx';
import { Symbole } from '../components/Logo.tsx';
import { EcranPage, Telephone } from './Telephone.tsx';
import { Reserver, allerAuChamp, useReservation } from './Reserver.tsx';
import type { ApiAccueil } from './Reserver.tsx';
import { nomAffiche, pageJules, pageLilian, pageMarie, pageVisiteur, selonReseau } from './exemples.ts';
import { mouvementReduit, useGlisse, useVu } from './mouvement.ts';
import { APPEL, MOTS, useInscription } from './textes.ts';

/*
 * 01 · La barre et l'ouverture. La promesse, puis tout de suite le champ du
 * nom : on tape, et le téléphone d'à côté devient sa page (son nom, son
 * adresse). Ce téléphone prouve la promesse : la page de Marie, puis la
 * sienne, vue depuis Instagram, TikTok et YouTube, range ses liens à chaque
 * fois. Au bureau, le texte à gauche et les téléphones à droite ; au
 * téléphone, où le clavier cache la scène, une carte aux couleurs du thème
 * reprend son nom sous le champ. Trois téléphones s'ouvrent en éventail, une
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
  const [champ, setChamp] = useState(false);
  const [debut, suite] = APPEL[useInscription()];
  // Au téléphone, le bouton de la barre s'efface tant qu'un champ du nom est à l'écran : un seul appel à la fois.
  useEffect(() => {
    if (typeof IntersectionObserver !== 'function') return;
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
    <header className="hl-barre" data-defile={defile || menu || undefined} data-champ={(champ && !menu) || undefined}>
      <div className="hl-barre-dedans">
        <Marque />
        <nav className="hl-barre-nav" aria-label="Sections">
          {SECTIONS.slice(0, 3).map(([lien, texte]) => <a key={lien} href={lien}>{texte}</a>)}
        </nav>
        <div className="hl-barre-actions">
          <a href="/admin" className="hl-barre-connexion">Connexion</a>
          <a href="#reserver" className="hl-btn hl-btn-petit" onClick={ev => { ev.preventDefault(); setMenu(false); allerAuChamp(); }}><span>{debut}<span className="hl-large">{suite}</span></span></a>
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

/** Les sections de la barre ; au téléphone, le menu ajoute les questions. */
const SECTIONS = [['#fonctions', 'Fonctions'], ['#themes', 'Thèmes'], ['#prix', 'Prix'], ['#questions', 'Questions']];

/**
 * La tournée des visiteurs du téléphone du milieu : la même page, vue depuis
 * Instagram, puis TikTok, puis YouTube, une fois, et ses liens se rangent à
 * chaque fois. Toucher le téléphone passe au réseau suivant.
 */
const VISITES = [
  { reseau: 'instagram', arrive: 'Arrivé d’Instagram' },
  { reseau: 'tiktok', arrive: 'Arrivé de TikTok' },
  { reseau: 'youtube', arrive: 'Arrivé de YouTube' },
];
const THEME = THEMES.find(t => t.id === 'champagne')!;

const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;
const mots = (texte: string, depart = 0) => texte.split(' ').map((m, i) => (
  <span key={i}><span className="hl-mot" style={d(depart + i * 55)}>{m}</span>{' '}</span>
));

export function Ouverture({ api }: { api: ApiAccueil }) {
  const [rang, setRang] = useState(0);
  const [touche, setTouche] = useState(false);
  const [refScene, vu] = useVu<HTMLDivElement>(0.5);
  const liste = useRef<HTMLDivElement>(null);
  const { nom, verif, etape, ancien } = useReservation();
  const mode = useInscription();

  // La tournée part quand le téléphone est à l'écran, et s'arrête sur YouTube ; avec moins de mouvement, TikTok d'emblée.
  useEffect(() => {
    if (!vu || touche) return;
    if (mouvementReduit()) { setRang(1); return; }
    if (rang === VISITES.length - 1) return;
    const t = setTimeout(() => setRang(rang + 1), 2400);
    return () => clearTimeout(t);
  }, [vu, rang, touche]);

  const visite = VISITES[rang];
  useGlisse(liste, visite.reseau, 450, '.lp-bloc');
  const suivant = () => { setTouche(true); setRang(r => (r + 1) % VISITES.length); };
  // Dès qu'on tape un nom de trois caractères, la page du milieu devient la sienne ;
  // un nom pris le dit dans la barre d'adresse, et une fois l'e-mail parti, l'adresse est cochée.
  const tape = nom.replace(/-$/, '');
  const pseudo = tape.length >= 3 ? tape : '';
  const pris = !!pseudo && verif?.nom === pseudo && verif.etat !== 'libre' && pseudo !== ancien;
  const affiche = nomAffiche(pseudo);
  const page = selonReseau(pseudo ? pageVisiteur(pseudo, THEME.id) : pageMarie(THEME.id), visite.reseau);
  const adresse = pris
    ? <span className="hl-tel-pris"><s>hopla.page/{pseudo}</s> {verif?.etat === 'pris' ? 'déjà pris' : 'impossible'}</span>
    : etape === 'fait' && pseudo
      ? <span key="fait" className="hl-tel-fait"><Icone nom="check" taille={12} />hopla.page/{pseudo}</span>
      : `hopla.page/${pseudo || 'marie-lambert'}`;

  return (
    <section className="hl-heros" aria-labelledby="titre">
      <div className="hl-heros-fond" aria-hidden="true" />
      <div className="hl-heros-texte">
        <h1 id="titre" className="hl-h1 hl-heros-titre hl-mots">{mots('La page de liens qui s’adapte à chaque visiteur.')}</h1>
        <p className="hl-chapo hl-apparait" style={d(420)}>
          Un seul lien dans ta bio. Ta page change selon le réseau et l’heure, ouvre tes liens dans leurs apps et se modifie depuis ton téléphone.
        </p>
        <div className="hl-apparait" style={d(540)} data-zone-appel="">
          <Reserver api={api} id="reserver" grand note={<>{MOTS[mode].note} <a href="/lilian">Voir une vraie page</a></>} />
          {pseudo && !pris && etape !== 'fait' && (
            <div className="hl-apercu hl-petit-seul" style={{ background: THEME.fondUni, color: THEME.texte }} aria-hidden="true">
              <span className="hl-apercu-avatar">{affiche.split(' ').slice(0, 2).map(m => m[0]).join('')}</span>
              <span className="hl-apercu-texte"><b>{affiche}</b><small style={{ color: THEME.doux }}>hopla.page/{pseudo} · {THEME.nom}</small></span>
            </div>
          )}
        </div>
      </div>
      <div className="hl-heros-visuel">
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
          <div className="hl-scene-tel hl-scene-milieu">
            <span key={visite.reseau} className="hl-heros-source" aria-hidden="true"><Icone nom={visite.reseau} taille={14} />{visite.arrive}</span>
            <button type="button" className="hl-tel-bouton" onClick={suivant} aria-label={`Réseau suivant (${visite.arrive.toLowerCase()}, ${rang + 1} sur ${VISITES.length})`}>
              <Telephone largeur={290} adresse={adresse} label={pseudo && !pris
                ? `Un aperçu de ta page, hopla.page/${pseudo}, ${visite.arrive.toLowerCase()}`
                : `La page de Marie Lambert, céramiste, vue par un visiteur ${visite.arrive.toLowerCase()}`}>
                <div key={pseudo ? 'toi' : 'marie'} ref={liste} className="hl-fondu" data-pris={pris || undefined}><EcranPage page={page} /></div>
              </Telephone>
            </button>
          </div>
        </div>
        <p className="hl-legende hl-apparait" style={d(1300)} aria-live={touche ? 'polite' : 'off'}>
          Les liens se rangent selon le réseau d’où arrive le visiteur. <span className="hl-tactile">Touche</span><span className="hl-souris">Clique sur</span> le téléphone pour en changer.
        </p>
      </div>
    </section>
  );
}
