import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { THEMES } from '../lib/themes.ts';
import { Symbole } from '../components/Logo.tsx';
import { EcranPage, Telephone } from './Telephone.tsx';
import { Reserver, allerAuChamp, useReservation } from './Reserver.tsx';
import type { ApiAccueil } from './Reserver.tsx';
import { nomAffiche, pageJules, pageLilian, pageMarie, pageVisiteur } from './exemples.ts';
import { mouvementReduit } from './mouvement.ts';
import { APPEL, MOTS, useInscription } from './textes.ts';

/*
 * 01 · La barre et l'ouverture. La promesse, puis tout de suite le champ du
 * nom : on tape, et le téléphone d'à côté devient sa page (son nom, son
 * adresse). Au bureau, le texte à gauche et les téléphones à droite, à la
 * même hauteur que le champ ; au téléphone, où le clavier cache la scène, une
 * carte aux couleurs du thème reprend son nom sous le champ. Trois téléphones
 * s'ouvrent en éventail, une fois, sur une lumière grise et une grille fine.
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
  const [debut, suite] = APPEL[useInscription()];
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
          <a href="#reserver" className="hl-btn hl-btn-petit" onClick={ev => { ev.preventDefault(); allerAuChamp(); }}><span>{debut}<span className="hl-large">{suite}</span></span></a>
        </div>
      </div>
    </header>
  );
}

/** Le tour des thèmes du téléphone du milieu : une fois, puis il s'arrête sur le premier. Toucher passe au suivant. */
const TOUR = ['nuit-peche', 'aurore', 'champagne', 'klein', 'galaxie'];

const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;
const mots = (texte: string, depart = 0) => texte.split(' ').map((m, i) => (
  <span key={i}><span className="hl-mot" style={d(depart + i * 55)}>{m}</span>{' '}</span>
));

export function Ouverture({ api }: { api: ApiAccueil }) {
  const [rang, setRang] = useState(0);
  const [tourFini, setTourFini] = useState(false);
  const { nom, verif } = useReservation();
  const mode = useInscription();

  useEffect(() => {
    if (tourFini || mouvementReduit()) return;
    const t = setTimeout(() => {
      if (rang === TOUR.length - 1) { setRang(0); setTourFini(true); } else setRang(rang + 1);
    }, rang === 0 ? 3200 : 2400);
    return () => clearTimeout(t);
  }, [rang, tourFini]);

  const theme = THEMES.find(t => t.id === TOUR[rang])!;
  const suivant = () => { setTourFini(true); setRang(r => (r + 1) % TOUR.length); };
  // Dès qu'on tape un nom, la page du milieu devient la sienne ; un nom pris le dit dans la barre d'adresse.
  const pseudo = nom.replace(/-$/, '');
  const pris = !!pseudo && verif?.nom === pseudo && verif.etat !== 'libre';
  const page = pseudo ? pageVisiteur(pseudo, theme.id) : pageLilian(theme.id);
  const adresse = pris
    ? <span className="hl-tel-pris"><s>hopla.page/{pseudo}</s> {verif?.etat === 'pris' ? 'déjà pris' : 'impossible'}</span>
    : `hopla.page/${pseudo || 'lilian'}`;

  return (
    <section className="hl-heros" aria-labelledby="titre">
      <div className="hl-heros-fond" aria-hidden="true" />
      <div className="hl-heros-texte">
        <h1 id="titre" className="hl-h1 hl-heros-titre hl-mots">{mots('La page de liens qui s’adapte à chaque visiteur.')}</h1>
        <p className="hl-chapo hl-apparait" style={d(420)}>
          Un seul lien dans ta bio. Ta page change selon le réseau et l’heure, ouvre tes liens dans leurs apps et se modifie depuis ton téléphone.
        </p>
        <div className="hl-apparait" style={d(540)}>
          <Reserver api={api} id="reserver" grand note={MOTS[mode].note} />
          {pseudo.length >= 3 && !pris && (
            <div className="hl-apercu hl-petit-seul" style={{ background: theme.fondUni, color: theme.texte }} aria-hidden="true">
              <span className="hl-apercu-avatar">{nomAffiche(pseudo).split(' ').slice(0, 2).map(m => m[0]).join('')}</span>
              <span className="hl-apercu-texte"><b>{nomAffiche(pseudo)}</b><small style={{ color: theme.doux }}>hopla.page/{pseudo} · {theme.nom}</small></span>
            </div>
          )}
        </div>
      </div>
      <div className="hl-heros-visuel">
        <div className="hl-scene">
          <div className="hl-scene-tel hl-scene-gauche" aria-hidden="true">
            <Telephone largeur={250} label="La page de Marie Lambert, céramiste, dans le thème Lin">
              <EcranPage page={pageMarie('lin')} />
            </Telephone>
          </div>
          <div className="hl-scene-tel hl-scene-droite" aria-hidden="true">
            <Telephone largeur={250} label="La page de Jules Moreau, musicien, dans le thème Arcade">
              <EcranPage page={pageJules('arcade')} />
            </Telephone>
          </div>
          <div className="hl-scene-tel hl-scene-milieu">
            <button type="button" className="hl-tel-bouton" onClick={suivant} aria-label={`Thème suivant (${theme.nom}, ${rang + 1} sur ${TOUR.length})`}>
              <Telephone largeur={290} adresse={adresse} label={pseudo && !pris ? `Un aperçu de ta page, hopla.page/${pseudo}` : 'La page de Lilian Sevoumian sur Hopla, dans plusieurs thèmes'}>
                <div key={theme.id} className="hl-fondu"><EcranPage page={page} /></div>
              </Telephone>
            </button>
          </div>
        </div>
        <p className="hl-legende hl-apparait" style={d(1300)} aria-live="polite">
          Thème {theme.nom} · <span className="hl-tactile">touche</span><span className="hl-souris">clique sur</span> le téléphone pour changer
        </p>
      </div>
    </section>
  );
}
