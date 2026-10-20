import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { THEMES } from '../lib/themes.ts';
import { EcranPage, Telephone } from './Telephone.tsx';
import { Reserver, allerAuChamp, useReservation } from './Reserver.tsx';
import type { ApiAccueil } from './Reserver.tsx';
import { pageLilian } from './exemples.ts';
import { mouvementReduit } from './mouvement.ts';

/* 01 · La barre et l'ouverture : la promesse, le nom à réserver, une vraie page qui fait un tour de ses thèmes. */

export function Marque() {
  return (
    <a href="/" className="hl-marque" aria-label="Hopla, accueil">
      <svg viewBox="0 0 256 256" aria-hidden="true"><rect width="256" height="256" rx="64" fill="currentColor" /><g fill="#ffffff" transform="translate(40 40) scale(0.6875)"><path d="M165.66,90.34a8,8,0,0,1,0,11.32l-64,64a8,8,0,0,1-11.32-11.32l64-64A8,8,0,0,1,165.66,90.34ZM215.6,40.4a56,56,0,0,0-79.2,0L106.34,70.45a8,8,0,0,0,11.32,11.32l30.06-30a40,40,0,0,1,56.57,56.56l-30.07,30.06a8,8,0,0,0,11.31,11.32L215.6,119.6a56,56,0,0,0,0-79.2ZM138.34,174.22l-30.06,30.06a40,40,0,1,1-56.56-56.57l30.05-30.05a8,8,0,0,0-11.32-11.32L40.4,136.4a56,56,0,0,0,79.2,79.2l30.06-30.07a8,8,0,0,0-11.32-11.31Z" /></g></svg>
      <span>Hopla</span>
    </a>
  );
}

export function Barre() {
  const [defile, setDefile] = useState(false);
  useEffect(() => {
    const f = () => setDefile(scrollY > 8);
    f();
    addEventListener('scroll', f, { passive: true });
    return () => removeEventListener('scroll', f);
  }, []);
  return (
    <header className="hl-barre" data-defile={defile || undefined}>
      <div className="hl-barre-dedans">
        <Marque />
        <nav className="hl-barre-nav" aria-label="Sections">
          <a href="#fonctions">Fonctions</a>
          <a href="#themes">Thèmes</a>
          <a href="#prix">Prix</a>
        </nav>
        <div className="hl-barre-actions">
          <a href="/admin" className="hl-barre-connexion">Connexion</a>
          <a href="#reserver" className="hl-btn hl-btn-petit" onClick={ev => { ev.preventDefault(); allerAuChamp(); }}><span>Réserver<span className="hl-large"> mon nom</span></span></a>
        </div>
      </div>
    </header>
  );
}

/** Le tour des thèmes du téléphone : une fois, puis il s'arrête sur le premier. Toucher passe au suivant. */
const TOUR = ['nuit-peche', 'aurore', 'champagne', 'klein', 'galaxie'];

const mots = (texte: string, depart = 0) => texte.split(' ').map((m, i) => (
  <span key={i}><span className="hl-mot" style={{ '--d': `${depart + i * 55}ms` } as CSSProperties}>{m}</span>{' '}</span>
));

export function Ouverture({ api }: { api: ApiAccueil }) {
  const [rang, setRang] = useState(0);
  const [tourFini, setTourFini] = useState(false);
  const { nom } = useReservation();

  useEffect(() => {
    if (tourFini || mouvementReduit()) return;
    const t = setTimeout(() => {
      if (rang === TOUR.length - 1) { setRang(0); setTourFini(true); } else setRang(rang + 1);
    }, rang === 0 ? 2600 : 2400);
    return () => clearTimeout(t);
  }, [rang, tourFini]);

  const theme = THEMES.find(t => t.id === TOUR[rang])!;
  const suivant = () => { setTourFini(true); setRang(r => (r + 1) % TOUR.length); };

  return (
    <section className="hl-ouverture" aria-labelledby="titre">
      <div className="hl-ouverture-texte">
        <h1 id="titre" className="hl-h1 hl-mots">{mots('La page de liens qui s’adapte à chaque visiteur.')}</h1>
        <p className="hl-chapo hl-apparait" style={{ '--d': '420ms' } as CSSProperties}>
          Tes liens sur hopla.page/ton-nom. Ta page se réorganise selon d’où l’on vient et l’heure qu’il est, ouvre tes liens dans leurs apps, et se modifie depuis ton téléphone.
        </p>
        <div className="hl-apparait" style={{ '--d': '520ms' } as CSSProperties}>
          <Reserver api={api} id="reserver" note="Gratuit, toutes les fonctions comprises." />
        </div>
      </div>
      <div className="hl-ouverture-tel hl-monte">
        <button type="button" className="hl-tel-bouton" onClick={suivant} aria-label={`Thème suivant (${theme.nom}, ${rang + 1} sur ${TOUR.length})`}>
          <Telephone largeur={300} adresse={`hopla.page/${nom.replace(/-$/, '') || 'lilian'}`} label="La page de Lilian Sevoumian sur Hopla, dans plusieurs thèmes">
            <div key={theme.id} className="hl-fondu"><EcranPage page={pageLilian(theme.id)} /></div>
          </Telephone>
        </button>
        <p className="hl-legende" aria-live="polite">Thème {theme.nom} · {rang + 1} sur {TOUR.length}</p>
      </div>
    </section>
  );
}
