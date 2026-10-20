import { useEffect, useRef, useState } from 'react';
import { Icone } from '../components/Icone.tsx';
import { THEMES } from '../lib/themes.ts';
import { CroquisLien, EcranPage, Telephone } from './Telephone.tsx';
import { BLOCS_MARIE, pageMarie } from './exemples.ts';
import { mouvementReduit, useGlisse, useSequence, useVu } from './mouvement.ts';

/* 07 · L'arrivée d'un nouvel inscrit en quatre questions ; 08 · le back office, où l'on touche sa page pour la changer. */

const ETAPES = [
  { titre: 'Ta page, à ton nom', texte: 'Ta photo, ton nom, une phrase sur ce que tu fais.' },
  { titre: 'Tes liens les plus utiles', texte: 'Colle une adresse, Hopla trouve le titre du site tout seul.' },
  { titre: 'Où te suivre ?', texte: 'Ton pseudo suffit, l’adresse se complète.' },
  { titre: 'Choisis ton thème', texte: 'Dix pour commencer, les vingt ensuite.' },
];

function pageEtape(n: number) {
  return pageMarie(n >= 4 ? 'champagne' : 'neige', {
    profil: n >= 1 ? {} : { nom: '', bio: '', avatar: '' },
    blocs: n >= 2 ? BLOCS_MARIE.slice(0, 2) : [],
    reseaux: n >= 3,
  });
}

export function Arrivee() {
  const [ref, vu] = useVu<HTMLDivElement>(0.35);
  const [auto, rejouer] = useSequence(vu, [500, 1400, 1400, 1400]);
  const [choisi, setChoisi] = useState<number | null>(null);
  const etape = choisi ?? auto;
  const lue = Math.max(1, etape);

  return (
    <section className="hl-section" aria-labelledby="arrivee">
      <div className="hl-tete-section hl-entre">
        <h2 id="arrivee" className="hl-h2">En ligne en quatre questions.</h2>
        <p className="hl-chapo">Ton nom, tes liens, tes réseaux, ton ambiance. Ta page se remplit sous tes yeux.</p>
      </div>
      <div ref={ref} className="hl-arrivee">
        <ol className="hl-etapes">
          {ETAPES.map((e, i) => (
            <li key={e.titre} data-lu={lue === i + 1 || undefined}>
              <button type="button" onClick={() => setChoisi(i + 1)} aria-current={lue === i + 1 ? 'step' : undefined}>
                <span className="hl-etape-num">{i + 1}</span>
                <span><b>{e.titre}</b><span className="hl-etape-texte">{e.texte}</span></span>
              </button>
            </li>
          ))}
        </ol>
        <div className="hl-arrivee-tel">
          <div className="hl-segments hl-petit-seul" aria-hidden="true">{ETAPES.map((_, i) => <i key={i} data-plein={etape > i || undefined} />)}</div>
          <p className="hl-petit-seul hl-arrivee-legende"><span className="hl-gris">{lue} sur 4</span> <b>{ETAPES[lue - 1].titre}</b><span className="hl-etape-texte">{ETAPES[lue - 1].texte}</span></p>
          <Telephone largeur={280} label="La page de Marie se remplit à chaque étape de l’inscription">
            <EcranPage page={pageEtape(etape)} />
          </Telephone>
          <button type="button" className="hl-revoir" onClick={() => { setChoisi(null); rejouer(); }}>Revoir</button>
        </div>
      </div>
    </section>
  );
}

/* ---- 08 · Modifier en touchant ---- */

const GESTES = [
  { picto: 'plume', titre: 'Toucher pour écrire', texte: 'Ton nom, ta bio, un lien : touche, tape, c’est en ligne.' },
  { picto: 'main', titre: 'Maintenir pour déplacer', texte: 'Un bloc se soulève et se pose où tu veux.' },
  { picto: 'palette', titre: 'Personnaliser', texte: 'Le design s’ouvre dans une feuille qui laisse voir ta page.' },
];
const SUITE = ' Lambert';

export function Toucher() {
  const [ref, vu] = useVu<HTMLDivElement>(0.4);
  // 1 : le nom s'écrit ; 2 : un bloc se soulève ; 3 : il monte ; 4 : il se pose ; 5 : la feuille s'ouvre ; 6 : un thème est choisi.
  const [etape, rejouer] = useSequence(vu, [500, 1500, 500, 600, 800, 900]);
  const [lettres, setLettres] = useState(0);
  const liste = useRef<HTMLDivElement>(null);
  const ordre = etape >= 3 ? ['boutique', 'atelier', 'tiktok'] : ['atelier', 'tiktok', 'boutique'];
  useGlisse(liste, ordre.join());

  const ecrit = etape >= 1;
  useEffect(() => {
    if (!ecrit) { setLettres(0); return; }
    if (mouvementReduit()) { setLettres(SUITE.length); return; }
    const t = [...SUITE].map((_, k) => setTimeout(() => setLettres(k + 1), k * 90));
    return () => t.forEach(clearTimeout);
  }, [ecrit]);

  const geste = etape < 2 ? 0 : etape < 5 ? 1 : 2;
  const titres: Record<string, string> = { atelier: 'Réserver un atelier', tiktok: 'Mon dernier TikTok', boutique: 'Ma boutique' };
  const swatches = ['nuit-peche', 'champagne', 'klein', 'aurore'].map(id => THEMES.find(t => t.id === id)!);
  const klein = swatches[2];

  return (
    <section className="hl-section" aria-labelledby="toucher">
      <div className="hl-tete-section hl-entre">
        <h2 id="toucher" className="hl-h2">Tu modifies ta page en la touchant.</h2>
        <p className="hl-chapo">Pas de formulaire à part. Ce que tu touches, tu le changes.</p>
      </div>
      <div ref={ref} className="hl-toucher">
        <ol className="hl-gestes">
          {GESTES.map((g, i) => (
            <li key={g.titre} data-lu={geste === i || undefined}>
              <Icone nom={g.picto} taille={24} />
              <span><b>{g.titre}</b><span className="hl-etape-texte">{g.texte}</span></span>
            </li>
          ))}
          <li className="hl-gestes-revoir"><button type="button" className="hl-revoir" onClick={rejouer}>Revoir</button></li>
        </ol>
        <Telephone largeur={290} label="Le back office de Hopla au téléphone : le nom s’écrit sur la page, un lien se déplace, le design s’ouvre dans une feuille.">
          <div className="hl-bo">
            <div className="hl-bo-tete"><b>Ma page</b><span className="hl-gris">hopla.page/marie-lambert</span></div>
            <div className="hl-bo-page" style={etape >= 6 ? { background: klein.fondUni, color: klein.texte } : undefined}>
              <span className="hl-cq-avatar" />
              <span className="hl-bo-nom" data-edite={(etape >= 1 && etape < 2) || undefined}>Marie{SUITE.slice(0, lettres)}{etape >= 1 && etape < 2 && <i className="hl-curseur" />}</span>
              <span className="hl-cq-trait" style={{ width: '58%' }} />
              <div className="hl-cq-liens" ref={liste}>
                {ordre.map(c => <CroquisLien key={c} cle={c} titre={titres[c]} vedette={c === 'boutique'} data-souleve={c === 'boutique' && etape >= 2 && etape < 4 ? '' : undefined} />)}
              </div>
            </div>
            <div className="hl-bo-feuille" data-ouvert={etape >= 5 || undefined}>
              <b>Personnaliser</b>
              <div className="hl-bo-themes">
                {swatches.map(t => <span key={t.id} style={{ background: t.fondUni }} data-choisi={(etape >= 6 ? t.id === 'klein' : t.id === 'nuit-peche') || undefined} title={t.nom} />)}
              </div>
            </div>
            <nav className="hl-bo-onglets">
              <span data-actif=""><Icone nom="lien" taille={18} />Ma page</span>
              <span><Icone nom="courbe" taille={18} />Stats</span>
              <span><Icone nom="palette" taille={18} />Personnaliser</span>
              <span><Icone nom="reglage" taille={18} />Réglages</span>
            </nav>
          </div>
        </Telephone>
      </div>
    </section>
  );
}
