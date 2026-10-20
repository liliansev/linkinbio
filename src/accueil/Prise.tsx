import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Icone } from '../components/Icone.tsx';
import { THEMES } from '../lib/themes.ts';
import { CroquisLien, EcranPage, Telephone } from './Telephone.tsx';
import { BLOCS_MARIE, pageMarie } from './exemples.ts';
import { mouvementReduit, useGlisse, useSequence, useVu } from './mouvement.ts';

/*
 * 07 · Prendre sa page en main, en une section et deux onglets sur un même
 * téléphone : Créer (l'arrivée d'un nouvel inscrit, quatre questions, la page
 * qui se remplit) et Modifier (le back office, où l'on touche sa page pour la
 * changer). Comme pour Sans et Avec Hopla, chaque onglet rejoue sa scène ; à
 * la première lecture, Créer se joue, puis Modifier, une fois.
 */

type Onglet = 'creer' | 'modifier';
interface Pas { titre: string; texte: string; picto?: string }

const ETAPES: Pas[] = [
  { titre: 'Ta page, à ton nom', texte: 'Ta photo, ton nom, une phrase sur ce que tu fais.' },
  { titre: 'Tes liens les plus utiles', texte: 'Colle une adresse, Hopla trouve le titre du site tout seul.' },
  { titre: 'Où te suivre ?', texte: 'Ton pseudo suffit, l’adresse se complète.' },
  { titre: 'Choisis ton thème', texte: 'Dix pour commencer, les vingt ensuite.' },
];
const GESTES: Pas[] = [
  { picto: 'plume', titre: 'Toucher pour écrire', texte: 'Ton nom, ta bio, un lien : touche, tape, c’est en ligne.' },
  { picto: 'deplacer', titre: 'Maintenir pour déplacer', texte: 'Un bloc se soulève et se pose où tu veux.' },
  { picto: 'palette', titre: 'Personnaliser', texte: 'Le design s’ouvre dans une feuille qui laisse voir ta page.' },
];

/** Créer : une étape remplie toutes les 1,4 s. Modifier : 1 le nom s'écrit ; 2 un bloc se soulève ; 3 il monte ; 4 il se pose ; 5 la feuille s'ouvre ; 6 un thème est choisi. */
const PAS: Record<Onglet, number[]> = { creer: [500, 1400, 1400, 1400], modifier: [500, 1500, 500, 600, 800, 900] };
/** Toucher un geste montre son état : le nom en train de s'écrire, le bloc posé, le thème choisi. */
const ETAPE_DU_GESTE = [1, 4, 6];
const AVANT_MODIFIER = 4700 + 1600;

function pageEtape(n: number) {
  return pageMarie(n >= 4 ? 'champagne' : 'neige', {
    profil: n >= 1 ? {} : { nom: '', bio: '', avatar: '' },
    blocs: n >= 2 ? BLOCS_MARIE.slice(0, 2) : [],
    reseaux: n >= 3,
  });
}

const SUITE = ' Lambert';
const TITRES: Record<string, string> = { atelier: 'Réserver un atelier', tiktok: 'Mon dernier TikTok', boutique: 'Ma boutique' };

/** Le back office au téléphone : le nom s'écrit sur la page, un bloc change de place, le design s'ouvre dans une feuille. */
function BackOffice({ etape }: { etape: number }) {
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

  const swatches = ['nuit-peche', 'champagne', 'klein', 'aurore'].map(id => THEMES.find(t => t.id === id)!);
  const klein = swatches[2];
  return (
    <div className="hl-bo">
      <div className="hl-bo-tete"><b>Ma page</b><span className="hl-gris">hopla.page/marie-lambert</span></div>
      <div className="hl-bo-page" style={etape >= 6 ? { background: klein.fondUni, color: klein.texte } : undefined}>
        <span className="hl-cq-avatar" />
        <span className="hl-bo-nom" data-edite={(etape >= 1 && etape < 2) || undefined}>Marie{SUITE.slice(0, lettres)}{etape >= 1 && etape < 2 && <i className="hl-curseur" />}</span>
        <span className="hl-cq-trait" style={{ width: '58%' }} />
        <div className="hl-cq-liens" ref={liste}>
          {ordre.map(c => <CroquisLien key={c} cle={c} titre={TITRES[c]} vedette={c === 'boutique'} data-souleve={c === 'boutique' && etape >= 2 && etape < 4 ? '' : undefined} />)}
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
  );
}

export function Prise() {
  const [ref, vu] = useVu<HTMLDivElement>(0.6);
  const [onglet, setOnglet] = useState<Onglet>('creer');
  const [jeu, setJeu] = useState(0);
  const [auto, setAuto] = useState(true);
  // La légende ne s'annonce qu'une fois qu'on a touché une commande, pas pendant l'enchaînement automatique.
  const [touche, setTouche] = useState(false);
  const [choisi, setChoisi] = useState<number | null>(null);
  const [lu, rejouer] = useSequence(vu, PAS[onglet]);
  const etape = choisi ?? lu;

  const choisir = (o: Onglet) => { setOnglet(o); setChoisi(null); setJeu(j => j + 1); rejouer(); };
  const toucher = (o: Onglet) => { setAuto(false); setTouche(true); choisir(o); };

  // La première fois : Créer, puis Modifier.
  const enchaine = vu && auto && onglet === 'creer' && choisi === null && !mouvementReduit();
  useEffect(() => {
    if (!enchaine) return;
    const t = setTimeout(() => { setAuto(false); choisir('modifier'); }, AVANT_MODIFIER);
    return () => clearTimeout(t);
    // `choisir` ne change pas d'effet : seul l'état de l'enchaînement compte.
  }, [enchaine]);

  const liste = onglet === 'creer' ? ETAPES : GESTES;
  // Le pas lu, de 0 à liste.length - 1.
  const rang = onglet === 'creer' ? Math.max(1, etape) - 1 : etape < 2 ? 0 : etape < 5 ? 1 : 2;
  const montrer = (i: number) => { setAuto(false); setTouche(true); setChoisi(onglet === 'creer' ? i + 1 : ETAPE_DU_GESTE[i]); };

  return (
    <section className="hl-section" aria-labelledby="prise">
      <div className="hl-tete-section hl-entre">
        <h2 id="prise" className="hl-h2">Ta page en deux minutes, depuis ton téléphone.</h2>
        <p className="hl-chapo">Quatre questions pour la créer. Ensuite, tu la modifies en la touchant : pas de formulaire à part.</p>
      </div>
      <div className="hl-prise">
        <div className="hl-prise-texte">
          <div className="hl-onglets hl-onglets-scene" role="group" aria-label="Créer ou modifier sa page, la scène se rejoue à chaque choix">
            {(['creer', 'modifier'] as const).map(o => (
              <button key={o} type="button" aria-pressed={onglet === o} onClick={() => toucher(o)}
                data-remplit={(enchaine && o === 'creer') || undefined} style={{ '--duree': `${AVANT_MODIFIER}ms` } as CSSProperties}>
                {o === 'creer' ? 'Créer' : 'Modifier'}
              </button>
            ))}
          </div>
          <ol key={onglet} className="hl-etapes">
            {liste.map((p, i) => (
              <li key={p.titre} data-lu={rang === i || undefined}>
                <button type="button" onClick={() => montrer(i)} aria-current={rang === i ? 'step' : undefined}>
                  <span className="hl-etape-num">{p.picto ? <Icone nom={p.picto} taille={18} /> : i + 1}</span>
                  <span><b>{p.titre}</b><span className="hl-etape-texte">{p.texte}</span></span>
                </button>
              </li>
            ))}
          </ol>
        </div>
        <div ref={ref} className="hl-prise-tel">
          <Telephone largeur={290} label={onglet === 'creer'
            ? 'La page de Marie se remplit à chaque étape de l’inscription.'
            : 'Le back office de Hopla au téléphone : le nom s’écrit sur la page, un lien se déplace, le design s’ouvre dans une feuille.'}>
            <div key={jeu} className="hl-fondu">{onglet === 'creer' ? <EcranPage page={pageEtape(etape)} /> : <BackOffice etape={etape} />}</div>
          </Telephone>
          <div className="hl-prise-legende hl-petit-seul" aria-live={touche ? 'polite' : 'off'}>
            <div className="hl-segments" aria-hidden="true">{liste.map((_, i) => <i key={i} data-plein={rang >= i || undefined} />)}</div>
            <p><span className="hl-gris">{rang + 1} sur {liste.length}</span> <b>{liste[rang].titre}</b><span className="hl-etape-texte">{liste[rang].texte}</span></p>
          </div>
          <button type="button" className="hl-revoir" onClick={() => { setTouche(true); setChoisi(null); rejouer(); }}>Revoir</button>
        </div>
      </div>
    </section>
  );
}
