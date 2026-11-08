import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import type { Couleurs } from '../lib/types.ts';
import { SANS_COULEURS } from '../lib/types.ts';
import { THEMES, humeurTheme, nomTheme } from '../lib/themes.ts';
import { Icone } from '../components/Icone.tsx';
import { EcranPage, Telephone } from './Telephone.tsx';
import { pageDe, pageExemple, profilDe, IDS_PROFILS } from './exemples.ts';
import { useL, useLangue } from './langue.ts';
import { mouvementReduit, useVisible } from './mouvement.ts';

/*
 * 06 · Vingt-quatre thèmes sur un rail, puis les couleurs qu'on change soi-même, sur
 * le crème (26 octobre 2026 : la scène ne prend plus la teinte du thème
 * regardé, l'accueil tient en trois fonds). Le rail paraît en fondu un peu
 * avant d'arriver à l'écran, puis défile seul, en boucle (26 octobre 2026,
 * demandé par Lilian : « là on voit vide, je scroll et hop tout s'affiche »).
 * Il s'arrête hors de l'écran, sous la souris, au focus et le temps qu'on le
 * fasse glisser soi-même.
 */

/** L'ordre du rail (27 octobre 2026, demandé par Lilian : « les plus beaux en premier ») : les thèmes francs et colorés
 *  ouvrent, les sobres ferment. Un thème ajouté sans place ici vient à la fin. */
const ORDRE = ['coucher', 'klein', 'mangue', 'aurore', 'lampe', 'brutal', 'lagon', 'riso', 'cerise', 'galaxie', 'memphis', 'arcade',
  'skate', 'bauhaus', 'champagne', 'argile', 'lilas', 'sauge', 'lin', 'neige', 'foret', 'onyx', 'marine', 'nuit-peche'];
const RAIL = [...THEMES].sort((a, b) => (ORDRE.indexOf(a.id) + 1 || 99) - (ORDRE.indexOf(b.id) + 1 || 99));

/** Pixels par seconde (90 depuis le 26 octobre 2026, Lilian : « pas assez vite ») : le rail vit, un nom se lit encore au passage. */
const VITESSE = 90;
/** Après un geste du visiteur, le rail attend avant de reprendre sa course. */
const REPRISE = 3000;

/** Vrai dès que l'élément approche de l'écran (un cinquième de hauteur avant), et le reste. */
function useApproche<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [proche, setProche] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || proche) return;
    if (typeof IntersectionObserver !== 'function') { setProche(true); return; }
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setProche(true); o.disconnect(); } }, { rootMargin: '0px 0px 20% 0px' });
    o.observe(el);
    return () => o.disconnect();
  }, [proche]);
  return [ref, proche];
}

/** Fait défiler le rail tant qu'il est à l'écran et que personne n'y touche. La seconde moitié est une copie de la première : on y revient au début sans saut. */
function useDefilement(rail: RefObject<HTMLUListElement | null>, actif: boolean) {
  useEffect(() => {
    const el = rail.current;
    if (!el || !actif) return;
    let image = 0, avant = 0, pos = el.scrollLeft, repos = 0, survol = false;
    const tour = (t: number) => {
      const dt = avant ? Math.min(64, t - avant) : 0;
      avant = t;
      if (!survol && !el.contains(document.activeElement) && t >= repos) {
        // Le visiteur a pu faire glisser le rail : on repart d'où il l'a laissé.
        if (Math.abs(el.scrollLeft - pos) > 2) pos = el.scrollLeft;
        const copie = el.children[RAIL.length] as HTMLElement | undefined;
        const moitie = copie ? copie.offsetLeft - (el.children[0] as HTMLElement).offsetLeft : 0;
        pos += (VITESSE * dt) / 1000;
        if (moitie && pos >= moitie) pos -= moitie;
        el.scrollLeft = pos;
      }
      image = requestAnimationFrame(tour);
    };
    image = requestAnimationFrame(tour);
    const geste = () => { repos = performance.now() + REPRISE; };
    const entre = (e: PointerEvent) => { if (e.pointerType === 'mouse') survol = true; };
    const sort = (e: PointerEvent) => { if (e.pointerType === 'mouse') { survol = false; geste(); } };
    el.addEventListener('pointerenter', entre);
    el.addEventListener('pointerleave', sort);
    el.addEventListener('pointerdown', geste);
    el.addEventListener('touchmove', geste, { passive: true });
    el.addEventListener('wheel', geste, { passive: true });
    return () => {
      cancelAnimationFrame(image);
      el.removeEventListener('pointerenter', entre);
      el.removeEventListener('pointerleave', sort);
      el.removeEventListener('pointerdown', geste);
      el.removeEventListener('touchmove', geste);
      el.removeEventListener('wheel', geste);
    };
  }, [rail, actif]);
}

/** Chaque nuance porte son nom en français puis en anglais. */
const NUANCES: { role: keyof Couleurs; nom: [string, string]; choix: [string, string, string][] }[] = [
  { role: 'fond', nom: ['Fond', 'Background'], choix: [['#f4efe6', 'crème', 'cream'], ['#1d2b3a', 'nuit', 'night'], ['#f6d9d0', 'rose poudré', 'powder pink'], ['#dfe8dc', 'sauge', 'sage']] },
  { role: 'boutons', nom: ['Boutons', 'Buttons'], choix: [['#ffffff', 'blancs', 'white'], ['#1b1b1b', 'noirs', 'black'], ['#33524a', 'vert forêt', 'forest green'], ['#f2c94c', 'moutarde', 'mustard']] },
  { role: 'accent', nom: ['Accent', 'Accent'], choix: [['#c4421a', 'corail', 'coral'], ['#3651d4', 'bleu', 'blue'], ['#b0186b', 'framboise', 'raspberry'], ['#1f7a4d', 'vert', 'green']] },
];

export function Themes() {
  const langue = useLangue();
  const l = useL();
  const [couleurs, setCouleurs] = useState<Couleurs>(SANS_COULEURS);
  const [refVu, vu] = useApproche<HTMLDivElement>();
  const [refVisible, visible] = useVisible<HTMLElement>();
  const rail = useRef<HTMLUListElement>(null);
  // La boucle (et sa copie des thèmes) n'existe qu'avec le mouvement : sinon le rail reste celui qu'on fait glisser.
  const [boucle, setBoucle] = useState(false);
  useEffect(() => setBoucle(!mouvementReduit()), []);
  // Une boucle sans fin a son bouton pause, comme l'animation de Camille (critique du 27 octobre 2026, WCAG 2.2.2).
  const [pause, setPause] = useState(false);
  useDefilement(rail, boucle && vu && visible && !pause);
  const defiler = (sens: number) => {
    rail.current?.dispatchEvent(new PointerEvent('pointerdown'));
    rail.current?.scrollBy({ left: sens * rail.current.clientWidth * 0.8, behavior: mouvementReduit() ? 'auto' : 'smooth' });
  };

  // Les flèches s'éteignent aux deux bouts du rail, sans `disabled` : le focus reste sur la flèche qu'on vient d'utiliser.
  const [bouts, setBouts] = useState({ debut: true, fin: false });
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const lire = () => setBouts({ debut: el.scrollLeft <= 4, fin: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    lire();
    el.addEventListener('scroll', lire, { passive: true });
    addEventListener('resize', lire);
    return () => { el.removeEventListener('scroll', lire); removeEventListener('resize', lire); };
  }, []);


  return (
    <section ref={refVisible} className="hl-section" id="themes" data-teinte="creme" aria-labelledby="titre-themes">
      <div className="hl-tete-section hl-entre">
        <h2 id="titre-themes" className="hl-h2">{l(<>Une page à toi<br /><span className="hl-cache">. </span>Ça se voit</>, <>A page that’s yours<br /><span className="hl-cache">. </span>And it shows</>)}</h2>
        <p className="hl-chapo">{l('Des plus sobres aux plus audacieux, chacun avec sa typographie réglée à la main. Change d’ambiance en un geste.', 'From the most understated to the boldest, each with typography tuned by hand. Switch the mood in one tap.')}</p>
      </div>
      <div className="hl-rail-tete hl-grand-seul">
        {boucle && <button type="button" className="hl-revoir" onClick={() => setPause(p => !p)}>{pause ? l('Reprendre le défilement', 'Resume scrolling') : l('Mettre en pause', 'Pause')}</button>}
        <div className="hl-fleches">
          <button type="button" onClick={() => { if (!bouts.debut) defiler(-1); }} aria-disabled={bouts.debut || undefined} aria-label={l('Thèmes précédents', 'Previous themes')}><Icone nom="ui-chevron" taille={18} className="hl-gauche" /></button>
          <button type="button" onClick={() => { if (!bouts.fin) defiler(1); }} aria-disabled={bouts.fin || undefined} aria-label={l('Thèmes suivants', 'Next themes')}><Icone nom="ui-chevron" taille={18} className="hl-droite" /></button>
        </div>
      </div>
      <div ref={refVu}>
      <ul ref={rail} className="hl-rail" tabIndex={0} data-vu={vu || undefined} data-boucle={boucle || undefined} aria-label={l(`${RAIL.length} thèmes`, `${RAIL.length} themes`)}>
        {(boucle ? [...RAIL, ...RAIL] : RAIL).map((t, k) => {
          const i = k % RAIL.length, copie = k >= RAIL.length;
          return (
            <li key={`${t.id}${copie ? '-copie' : ''}`} className="hl-rail-item" data-i={i} aria-hidden={copie || undefined} inert={copie || undefined}
              style={k < 6 ? { '--d': `${k * 90}ms` } as CSSProperties : undefined}>
              <Telephone largeur={300} label={`${pageDe(profilDe(IDS_PROFILS[i % IDS_PROFILS.length], langue).nom, langue)} ${l('dans le thème', 'in the theme')} ${nomTheme(t, langue)}`}>
                <EcranPage page={pageExemple(IDS_PROFILS[i % IDS_PROFILS.length], t.id, { langue })} />
              </Telephone>
              <p><b>{nomTheme(t, langue)}</b> <span className="hl-gris">{humeurTheme(t, langue)}</span></p>
            </li>
          );
        })}
      </ul>
      </div>

      {/* Au téléphone, l'aperçu passe entre le texte et les pastilles : on voit ce que change chaque toucher. */}
      <div id="couleurs" className="hl-couleurs hl-entre">
        <div className="hl-couleurs-texte">
          <h3 className="hl-h3 hl-couleurs-titre">{l('Tes couleurs', 'Your colors')}</h3>
          <p>{l('Garde la typographie d’un thème, ici Lin, et change son fond, ses boutons ou son accent. Un geste remet tout comme avant.', 'Keep a theme’s typography, here Linen, and change its background, buttons or accent. One tap puts everything back.')}</p>
        </div>
        <div className="hl-couleurs-reglage">
          <div className="hl-nuances">
            {NUANCES.map(n => (
              <fieldset key={n.role}>
                <legend>{l(...n.nom)}</legend>
                {n.choix.map(([c, fr, en]) => { const nom = l(fr, en); return (
                  <button key={c} type="button" className="hl-nuance" style={{ background: c }} aria-pressed={couleurs[n.role] === c}
                    aria-label={`${l(...n.nom)} ${nom}`} title={nom} onClick={() => setCouleurs(x => ({ ...x, [n.role]: x[n.role] === c ? '' : c }))} />
                ); })}
              </fieldset>
            ))}
          </div>
          {/* Le retour n'apparaît qu'une fois une couleur choisie ; sa place est gardée, rien ne saute. */}
          <button type="button" className="hl-lien-texte" data-cache={(!couleurs.fond && !couleurs.boutons && !couleurs.accent) || undefined} onClick={() => setCouleurs(SANS_COULEURS)}>{l('Revenir aux couleurs du thème', 'Back to the theme’s colors')}</button>
        </div>
        <div className="hl-couleurs-tel">
          <Telephone largeur={300} className="hl-tel-court" label={l('La page d’Inès Laurent dans le thème Lin, avec les couleurs choisies', `${pageDe(profilDe('ines', 'en').nom, 'en')} in the Linen theme, with the chosen colors`)}>
            <EcranPage page={pageExemple('ines', 'lin', { couleurs, langue })} />
          </Telephone>
        </div>
      </div>
    </section>
  );
}
