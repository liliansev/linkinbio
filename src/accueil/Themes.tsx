import { useEffect, useRef, useState } from 'react';
import type { Couleurs } from '../lib/types.ts';
import { SANS_COULEURS } from '../lib/types.ts';
import { THEMES } from '../lib/themes.ts';
import { Icone } from '../components/Icone.tsx';
import { EcranPage, Telephone } from './Telephone.tsx';
import { pageMarie } from './exemples.ts';

/* 06 · Vingt thèmes sur un rail, puis les couleurs qu'on change soi-même. */

const NUANCES: { role: keyof Couleurs; nom: string; choix: [string, string][] }[] = [
  { role: 'fond', nom: 'Fond', choix: [['#f4efe6', 'crème'], ['#1d2b3a', 'nuit'], ['#f6d9d0', 'rose poudré'], ['#dfe8dc', 'sauge']] },
  { role: 'boutons', nom: 'Boutons', choix: [['#ffffff', 'blancs'], ['#1b1b1b', 'noirs'], ['#33524a', 'vert forêt'], ['#f2c94c', 'moutarde']] },
  { role: 'accent', nom: 'Accent', choix: [['#e2552d', 'corail'], ['#3651d4', 'bleu'], ['#b0186b', 'framboise'], ['#1f7a4d', 'vert']] },
];

export function Themes() {
  const [couleurs, setCouleurs] = useState<Couleurs>(SANS_COULEURS);
  const rail = useRef<HTMLUListElement>(null);
  const defiler = (sens: number) => rail.current?.scrollBy({ left: sens * rail.current.clientWidth * 0.8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });

  // Les flèches s'éteignent aux deux bouts du rail.
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
    <section className="hl-section" id="themes" aria-labelledby="titre-themes">
      <div className="hl-tete-section hl-entre">
        <h2 id="titre-themes" className="hl-h2">Vingt thèmes. Et tes couleurs.</h2>
        <p className="hl-chapo">Des plus sobres aux plus audacieux, chacun avec sa typographie réglée à la main. Change d’ambiance en un geste.</p>
      </div>
      <div className="hl-rail-tete hl-grand-seul">
        <div className="hl-fleches">
          <button type="button" onClick={() => defiler(-1)} disabled={bouts.debut} aria-label="Thèmes précédents"><Icone nom="ui-chevron" taille={18} className="hl-gauche" /></button>
          <button type="button" onClick={() => defiler(1)} disabled={bouts.fin} aria-label="Thèmes suivants"><Icone nom="ui-chevron" taille={18} className="hl-droite" /></button>
        </div>
      </div>
      <ul ref={rail} className="hl-rail" aria-label={`${THEMES.length} thèmes`}>
        {THEMES.map(t => (
          <li key={t.id} className="hl-rail-item">
            <Telephone largeur={210} label={`La page de Marie dans le thème ${t.nom}`}>
              <EcranPage page={pageMarie(t.id)} />
            </Telephone>
            <p><b>{t.nom}</b> <span className="hl-gris">{t.humeur}</span></p>
          </li>
        ))}
      </ul>

      {/* Au téléphone, l'aperçu passe entre le texte et les pastilles : on voit ce que change chaque toucher. */}
      <div className="hl-couleurs hl-entre">
        <div className="hl-couleurs-texte">
          <h3 className="hl-h3">Tes couleurs</h3>
          <p>Garde la typographie d’un thème, ici Lin, et change son fond, ses boutons ou son accent. Un geste remet tout comme avant.</p>
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
          <Telephone largeur={260} label="La page de Marie dans le thème Lin, avec les couleurs choisies">
            <EcranPage page={pageMarie('lin', { couleurs })} />
          </Telephone>
        </div>
      </div>
    </section>
  );
}
