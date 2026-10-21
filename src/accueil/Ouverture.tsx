import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Icone } from '../components/Icone.tsx';
import { Symbole } from '../components/Logo.tsx';
import { Reserver, allerAuChamp, useReservation } from './Reserver.tsx';
import type { ApiAccueil } from './Reserver.tsx';
import { HeroProfils } from './Profils.tsx';
import { Roue } from './Roue.tsx';
import { APPEL, MOTS, useInscription } from './textes.ts';

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
const SECTIONS = [['#inspiration', 'Inspiration'], ['#fonctionnement', 'Comment ça marche'], ['#prix', 'Tarifs']];

export function Ouverture({ api }: { api: ApiAccueil }) {
  const mode = useInscription();
  return (
    <section className="hl-heros hp-heros" data-teinte="klein" aria-labelledby="titre">
      <div className="hl-heros-texte">
        <h1 id="titre" className="hl-h1 hl-heros-titre">Un lien qui<br />te ressemble<span>Et s’adapte à<br />chaque visiteur</span></h1>
        <p className="hl-chapo">Tes créations, tes projets, tes coups de cœur. Qu’on arrive d’Instagram, de TikTok ou de LinkedIn, ta page met le bon lien en premier.</p>
        <div data-zone-appel=""><Reserver api={api} id="reserver" grand premier note={MOTS[mode].note} /></div>
        <a className="hp-decouvrir" href="#inspiration">Trouve l’inspiration <Icone nom="ui-chevron" taille={20} /></a>
      </div>
      <HeroProfils />
      <div className="hp-heros-pied"><span>Pour ceux qui ont quelque chose à partager</span><span>Créateurs · Indépendants · Artistes · Passionnés</span></div>
    </section>
  );
}

export function Selon() {
  return (
    <section className="hl-section hp-selon" id="fonctionnement" aria-labelledby="selon">
      <div className="hp-selon-texte">
        <h2 id="selon" className="hl-h2">Camille partage<br /><span>Hopla s’adapte</span></h2>
        <p className="hl-chapo">Un seul lien dans toutes ses bios. Hopla reconnaît le réseau d’où vient son visiteur et met le bon lien en premier.</p>
        <ol className="hp-source-legendes">
          <li><Icone nom="instagram" taille={20} /><span>Depuis Instagram<b>Son portfolio, pour découvrir ses photos</b></span></li>
          <li><Icone nom="linkedin" taille={20} /><span>Depuis LinkedIn<b>Son contact, pour travailler ensemble</b></span></li>
        </ol>
        <span className="hp-inclus"><Icone nom="check" taille={18} />Inclus dans l’offre gratuite</span>
      </div>
      <Roue />
    </section>
  );
}
