import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import type { Couleurs } from '../lib/types.ts';
import { SANS_COULEURS } from '../lib/types.ts';
import { THEMES } from '../lib/themes.ts';
import { Icone } from '../components/Icone.tsx';
import { EcranPage, Telephone } from './Telephone.tsx';
import { de, pageExemple, IDS_PROFILS, PROFILS } from './exemples.ts';
import { OffreFonction } from './Profils.tsx';
import { mouvementReduit, useVisible } from './mouvement.ts';

/*
 * 06 · Vingt thèmes sur un rail, puis les couleurs qu'on change soi-même, sur
 * le crème (26 octobre 2026 : la scène ne prend plus la teinte du thème
 * regardé, l'accueil tient en trois fonds). Le rail paraît en fondu un peu
 * avant d'arriver à l'écran, puis défile seul, en boucle (26 octobre 2026,
 * demandé par Lilian : « là on voit vide, je scroll et hop tout s'affiche »).
 * Il s'arrête hors de l'écran, sous la souris, au focus et le temps qu'on le
 * fasse glisser soi-même.
 */

/** Pixels par seconde : on lit un nom de thème au passage sans courir après. */
const VITESSE = 36;
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
        const copie = el.children[THEMES.length] as HTMLElement | undefined;
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

const NUANCES: { role: keyof Couleurs; nom: string; choix: [string, string][] }[] = [
  { role: 'fond', nom: 'Fond', choix: [['#f4efe6', 'crème'], ['#1d2b3a', 'nuit'], ['#f6d9d0', 'rose poudré'], ['#dfe8dc', 'sauge']] },
  { role: 'boutons', nom: 'Boutons', choix: [['#ffffff', 'blancs'], ['#1b1b1b', 'noirs'], ['#33524a', 'vert forêt'], ['#f2c94c', 'moutarde']] },
  { role: 'accent', nom: 'Accent', choix: [['#c4421a', 'corail'], ['#3651d4', 'bleu'], ['#b0186b', 'framboise'], ['#1f7a4d', 'vert']] },
];

export function Themes() {
  const [couleurs, setCouleurs] = useState<Couleurs>(SANS_COULEURS);
  const [refVu, vu] = useApproche<HTMLDivElement>();
  const [refVisible, visible] = useVisible<HTMLElement>();
  const rail = useRef<HTMLUListElement>(null);
  // La boucle (et sa copie des thèmes) n'existe qu'avec le mouvement : sinon le rail reste celui qu'on fait glisser.
  const [boucle, setBoucle] = useState(false);
  useEffect(() => setBoucle(!mouvementReduit()), []);
  useDefilement(rail, boucle && vu && visible);
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
        <h2 id="titre-themes" className="hl-h2">Une page à toi<br /><span className="hl-cache">. </span>Ça se voit</h2>
        <p className="hl-chapo">Des plus sobres aux plus audacieux, chacun avec sa typographie réglée à la main. Change d’ambiance en un geste.</p>
        <OffreFonction offre="gratuit" quoi="Les vingt thèmes" />
      </div>
      <div className="hl-rail-tete hl-grand-seul">
        <div className="hl-fleches">
          <button type="button" onClick={() => { if (!bouts.debut) defiler(-1); }} aria-disabled={bouts.debut || undefined} aria-label="Thèmes précédents"><Icone nom="ui-chevron" taille={18} className="hl-gauche" /></button>
          <button type="button" onClick={() => { if (!bouts.fin) defiler(1); }} aria-disabled={bouts.fin || undefined} aria-label="Thèmes suivants"><Icone nom="ui-chevron" taille={18} className="hl-droite" /></button>
        </div>
      </div>
      <div ref={refVu}>
      <ul ref={rail} className="hl-rail" tabIndex={0} data-vu={vu || undefined} data-boucle={boucle || undefined} aria-label={`${THEMES.length} thèmes`}>
        {(boucle ? [...THEMES, ...THEMES] : THEMES).map((t, k) => {
          const i = k % THEMES.length, copie = k >= THEMES.length;
          return (
            <li key={`${t.id}${copie ? '-copie' : ''}`} className="hl-rail-item" data-i={i} aria-hidden={copie || undefined} inert={copie || undefined}
              style={k < 6 ? { '--d': `${k * 90}ms` } as CSSProperties : undefined}>
              <Telephone largeur={300} label={`La page ${de(PROFILS[IDS_PROFILS[i % IDS_PROFILS.length]].nom)} dans le thème ${t.nom}`}>
                <EcranPage page={pageExemple(IDS_PROFILS[i % IDS_PROFILS.length], t.id)} />
              </Telephone>
              <p><b>{t.nom}</b> <span className="hl-gris">{t.humeur}</span></p>
            </li>
          );
        })}
      </ul>
      </div>

      {/* Au téléphone, l'aperçu passe entre le texte et les pastilles : on voit ce que change chaque toucher. */}
      <div id="couleurs" className="hl-couleurs hl-entre">
        <div className="hl-couleurs-texte">
          <h3 className="hl-h3 hl-couleurs-titre">Tes couleurs</h3>
          <p>Garde la typographie d’un thème, ici Lin, et change son fond, ses boutons ou son accent. Un geste remet tout comme avant.</p>
          <OffreFonction offre="starter" />
        </div>
        <div className="hl-couleurs-reglage">
          <div className="hl-nuances">
            {NUANCES.map(n => (
              <fieldset key={n.role}>
                <legend>{n.nom}</legend>
                {n.choix.map(([c, nom]) => (
                  <button key={c} type="button" className="hl-nuance" style={{ background: c }} aria-pressed={couleurs[n.role] === c}
                    aria-label={`${n.nom} ${nom}`} title={nom} onClick={() => setCouleurs(x => ({ ...x, [n.role]: x[n.role] === c ? '' : c }))} />
                ))}
              </fieldset>
            ))}
          </div>
          {/* Le retour n'apparaît qu'une fois une couleur choisie ; sa place est gardée, rien ne saute. */}
          <button type="button" className="hl-lien-texte" data-cache={(!couleurs.fond && !couleurs.boutons && !couleurs.accent) || undefined} onClick={() => setCouleurs(SANS_COULEURS)}>Revenir aux couleurs du thème</button>
        </div>
        <div className="hl-couleurs-tel">
          <Telephone largeur={300} className="hl-tel-court" label="La page d’Inès Laurent dans le thème Lin, avec les couleurs choisies">
            <EcranPage page={pageExemple('ines', 'lin', { couleurs })} />
          </Telephone>
        </div>
      </div>
    </section>
  );
}
