import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Icone } from '../components/Icone.tsx';
import { THEMES } from '../lib/themes.ts';
import { CroquisLien, EcranPage, Telephone } from './Telephone.tsx';
import { BLOCS_EXEMPLES, PROFILS, pageExemple } from './exemples.ts';
import { mouvementReduit, useEnVue, useEnchainement, useGlisse, useSequence } from './mouvement.ts';

/*
 * 07 · Prendre sa page en main, en une section et deux temps sur un même
 * téléphone : Créer (l'arrivée d'un nouvel inscrit, quatre questions, la page
 * qui se remplit) et Modifier (le back office, où l'on touche sa page pour la
 * changer). Les deux se jouent l'un après l'autre, en boucle, tant que le
 * téléphone est à l'écran, et s'arrêtent là où ils en sont quand on le quitte
 * (26 octobre 2026, demandé par Lilian : rien à toucher pour voir la suite,
 * ni onglet à choisir : Créer et Modifier se disent, ils ne se cliquent pas).
 */

type Onglet = 'creer' | 'modifier';
interface Pas { titre: string; texte: string; picto?: string }

const ETAPES: Pas[] = [
  { titre: 'Ta page, à ton nom', texte: 'Ta photo, ton nom, une phrase sur ce que tu fais.' },
  { titre: 'Tes liens les plus utiles', texte: 'Colle une adresse, Hopla trouve le titre du site tout seul.' },
  { titre: 'Où te suivre ?', texte: 'Ton pseudo suffit, l’adresse se complète.' },
  { titre: 'Choisis ton thème', texte: 'Dix au choix pour commencer, les vingt ensuite, tous gratuits.' },
];
const GESTES: Pas[] = [
  { picto: 'plume', titre: 'Toucher pour écrire', texte: 'Ton nom, ta bio, un lien : touche, tape, c’est en ligne.' },
  { picto: 'deplacer', titre: 'Maintenir pour déplacer', texte: 'Un bloc se soulève et se pose où tu veux.' },
  { picto: 'palette', titre: 'Personnaliser', texte: 'Le design s’ouvre dans une feuille qui laisse voir ta page.' },
];

/** Créer : une étape remplie toutes les 1,4 s. Modifier : 1 le nom s'écrit ; 2 un bloc se soulève ; 3 il monte ; 4 il se pose ; 5 la feuille s'ouvre ; 6 un thème est choisi. */
const PAS: Record<Onglet, number[]> = { creer: [500, 1400, 1400, 1400], modifier: [500, 1500, 500, 600, 800, 900] };
/** Le temps laissé sur la fin de chaque scène avant de passer à l'autre. */
const TENUE: Record<Onglet, number> = { creer: 1600, modifier: 2600 };
const somme = (l: number[]) => l.reduce((a, b) => a + b, 0);

function pageEtape(n: number) {
  return pageExemple('lea', n >= 4 ? PROFILS.lea.theme : 'neige', {
    profil: n >= 1 ? {} : { nom: '', bio: '', avatar: PROFILS.lea.avatar },
    blocs: n >= 2 ? BLOCS_EXEMPLES.lea.slice(0, 2) : [],
    reseaux: n >= 3,
  });
}

/** Avant la première question, la page n'est encore qu'une silhouette : jamais un écran vide. */
function Silhouette() {
  return (
    <div className="hl-cq" aria-hidden="true">
      <div className="hl-cq-tete">
        <img className="hl-cq-avatar" src={PROFILS.lea.avatar} alt="" width="62" height="62" loading="lazy" />
        <span className="hl-cq-trait" style={{ width: '46%', height: 12 }} />
        <span className="hl-cq-trait" style={{ width: '64%' }} />
      </div>
    </div>
  );
}

const SUITE = ' Morel';
const TITRES: Record<string, string> = { atelier: 'Réserver un cours', tiktok: '10 minutes pour respirer', boutique: 'Le planning de la semaine' };

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
      <div className="hl-bo-tete"><b>Ma page</b><span className="hl-gris">hopla.page/lea-respire</span></div>
      <div className="hl-bo-page" style={etape >= 6 ? { background: klein.fondUni, color: klein.texte } : undefined}>
        <img className="hl-cq-avatar" src={PROFILS.lea.avatar} alt="" width="62" height="62" loading="lazy" />
        <span className="hl-bo-nom" data-edite={(etape >= 1 && etape < 2) || undefined}>Léa{SUITE.slice(0, lettres)}{etape >= 1 && etape < 2 && <i className="hl-curseur" />}</span>
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
        <span data-actif=""><Icone nom="nav-page" taille={18} />Ma page</span>
        <span><Icone nom="nav-stats" taille={18} />Stats</span>
        <span><Icone nom="palette" taille={18} />Personnaliser</span>
        <span><Icone nom="nav-reglages" taille={18} />Réglages</span>
      </nav>
    </div>
  );
}

export function Prise() {
  const [ref, enVue] = useEnVue<HTMLDivElement>(0.3);
  const [onglet, setOnglet] = useState<Onglet>('creer');
  const [jeu, setJeu] = useState(0);
  const [etape, rejouer] = useSequence(enVue, PAS[onglet]);

  // Une scène finie passe à l'autre, Créer puis Modifier puis Créer, sans rien à toucher ; la souris qui bouge sur
  // la scène suspend le passage, et quitter la section l'arrête là où il en est.
  const [pause, garde] = useEnchainement(enVue && etape >= PAS[onglet].length, TENUE[onglet], () => {
    setOnglet(o => (o === 'creer' ? 'modifier' : 'creer')); setJeu(j => j + 1); rejouer();
  });

  const liste = onglet === 'creer' ? ETAPES : GESTES;
  // Le pas lu, de 0 à liste.length - 1.
  const rang = onglet === 'creer' ? Math.max(1, etape) - 1 : etape < 2 ? 0 : etape < 5 ? 1 : 2;

  return (
    <section className="hl-section" aria-labelledby="prise">
      <div className="hl-tete-section hl-entre">
        <h2 id="prise" className="hl-h2">Ta page en deux minutes<br /><span className="hl-cache">. </span>Depuis ton téléphone</h2>
        <p className="hl-chapo">Quatre questions pour la créer. Ensuite, tu la modifies en la touchant : pas de formulaire à part.</p>
      </div>
      <div className="hl-prise" {...garde}>
        <div className="hl-prise-texte">
          {/* Les deux temps de la scène, dits et non choisis : celui qui se joue se remplit, puis passe la main. */}
          <ol className="hl-onglets hl-onglets-scene hl-temps" aria-label="Créer, puis modifier : les deux se jouent l’un après l’autre" data-pause={pause || !enVue || undefined}>
            {(['creer', 'modifier'] as const).map(o => (
              <li key={o === onglet ? `${o}-${jeu}` : o} data-actif={onglet === o || undefined} aria-current={onglet === o ? 'step' : undefined}
                data-remplit={(o === onglet && !mouvementReduit()) || undefined} style={{ '--duree': `${somme(PAS[o]) + TENUE[o]}ms` } as CSSProperties}>
                {o === 'creer' ? 'Créer' : 'Modifier'}
              </li>
            ))}
          </ol>
          <ol key={onglet} className="hl-etapes">
            {liste.map((p, i) => (
              <li key={p.titre} data-lu={rang === i || undefined} aria-current={rang === i ? 'step' : undefined}>
                <div>
                  <span className="hl-etape-num">{p.picto ? <Icone nom={p.picto} taille={18} /> : i + 1}</span>
                  <span><b>{p.titre}</b><span className="hl-etape-texte">{p.texte}</span></span>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div ref={ref} className="hl-prise-tel">
          <Telephone largeur={300} label={onglet === 'creer'
            ? 'La page de Léa se remplit à chaque étape de l’inscription.'
            : 'Le back office de Hopla au téléphone : le nom s’écrit sur la page, un lien se déplace, le design s’ouvre dans une feuille.'}>
            <div key={jeu} className="hl-fondu">{onglet === 'modifier' ? <BackOffice etape={etape} />
              : etape === 0 ? <Silhouette /> : <div className="hl-fondu"><EcranPage page={pageEtape(etape)} /></div>}</div>
          </Telephone>
          <div className="hl-prise-legende hl-petit-seul">
            <div className="hl-segments" aria-hidden="true">{liste.map((_, i) => <i key={i} data-plein={rang >= i || undefined} />)}</div>
            <p><span className="hl-gris">{rang + 1} sur {liste.length}</span> <b>{liste[rang].titre}</b><span className="hl-etape-texte">{liste[rang].texte}</span></p>
          </div>
        </div>
      </div>
    </section>
  );
}
