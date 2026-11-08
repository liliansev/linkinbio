import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Icone } from '../components/Icone.tsx';
import { THEMES, nomTheme } from '../lib/themes.ts';
import type { Langue } from '../lib/types.ts';
import { CroquisLien, EcranPage, Telephone } from './Telephone.tsx';
import { PROFILS, blocsExemples, pageExemple } from './exemples.ts';
import { useL, useLangue } from './langue.ts';
import { mouvementReduit, useEnVue, useEnchainement, useGlisse, useSequence } from './mouvement.ts';

/*
 * 07 · Prendre sa page en main, en une section et deux temps sur un même
 * téléphone : Créer (l'arrivée d'un nouvel inscrit, quatre questions, la page
 * qui se remplit) et Modifier (le back office, où l'on touche sa page pour la
 * changer). Les deux se jouent l'un après l'autre, en boucle, tant que le
 * téléphone est à l'écran, et s'arrêtent là où ils en sont quand on le quitte
 * (26 octobre 2026, demandé par Lilian : rien à toucher pour voir la suite,
 * ni onglet à choisir : Créer et Modifier se disent, ils ne se cliquent pas).
 * Au bureau, la scène se pose sur le bleu Klein, Créer à gauche du téléphone et
 * Modifier à droite, en miroir ; celle qui se joue s'allume (26 octobre 2026,
 * demandé par Lilian : « vide, mal aligné et manque de punch »).
 */

type Onglet = 'creer' | 'modifier';
interface Pas { titre: string; texte: string; picto?: string }

const ETAPES: Record<Langue, Pas[]> = {
  fr: [
    { titre: 'Ta page, à ton nom', texte: 'Ta photo, ton nom, une phrase sur ce que tu fais.' },
    { titre: 'Tes liens les plus utiles', texte: 'Colle une adresse, Hopla trouve le titre du site tout seul.' },
    { titre: 'Où te suivre ?', texte: 'Ton pseudo suffit, l’adresse se complète.' },
    { titre: 'Choisis ton thème', texte: 'Dix au choix pour commencer, les vingt-quatre ensuite, tous gratuits.' },
  ],
  en: [
    { titre: 'Your page, your name', texte: 'Your photo, your name, one line about what you do.' },
    { titre: 'Your most useful links', texte: 'Paste a link, Hopla finds the site’s title on its own.' },
    { titre: 'Where can people follow you?', texte: 'Your handle is enough, the link fills itself in.' },
    { titre: 'Pick your theme', texte: 'Ten to start with, all twenty-four after that, all free.' },
  ],
};
const GESTES: Record<Langue, Pas[]> = {
  fr: [
    { picto: 'plume', titre: 'Toucher pour écrire', texte: 'Ton nom, ta bio, un lien : touche, tape, c’est en ligne.' },
    { picto: 'deplacer', titre: 'Maintenir pour déplacer', texte: 'Un bloc se soulève et se pose où tu veux.' },
    { picto: 'palette', titre: 'Personnaliser', texte: 'Le design s’ouvre dans une feuille qui laisse voir ta page.' },
  ],
  en: [
    { picto: 'plume', titre: 'Tap to write', texte: 'Your name, your bio, a link: tap, type, it’s live.' },
    { picto: 'deplacer', titre: 'Hold to move', texte: 'A block lifts up and lands wherever you want.' },
    { picto: 'palette', titre: 'Customize', texte: 'The design opens in a sheet that keeps your page in view.' },
  ],
};

/** Créer : une étape remplie toutes les 0,8 s. Modifier : 1 le nom s'écrit ; 2 un bloc se soulève ; 3 il monte ; 4 il se pose ; 5 la feuille s'ouvre ; 6 un thème est choisi. */
const PAS: Record<Onglet, number[]> = { creer: [300, 800, 800, 800], modifier: [300, 800, 350, 400, 500, 600] };
/** Le temps laissé sur la fin de chaque scène avant de passer à l'autre (26 octobre 2026, demandé par Lilian : le tour entier en moins de 8 s, contre 14). */
const TENUE: Record<Onglet, number> = { creer: 900, modifier: 1200 };
const somme = (l: number[]) => l.reduce((a, b) => a + b, 0);

function pageEtape(n: number, langue: Langue) {
  return pageExemple('yanis', n >= 4 ? PROFILS.yanis.theme : 'neige', {
    profil: n >= 1 ? {} : { nom: '', bio: '', avatar: PROFILS.yanis.avatar },
    blocs: n >= 2 ? blocsExemples('yanis', langue).slice(0, 2) : [],
    reseaux: n >= 3,
    langue,
  });
}

/** Avant la première question, la page n'est encore qu'une silhouette : jamais un écran vide. */
function Silhouette() {
  return (
    <div className="hl-cq" aria-hidden="true">
      <div className="hl-cq-tete">
        <img className="hl-cq-avatar" src={PROFILS.yanis.avatar} alt="" width="62" height="62" loading="lazy" />
        <span className="hl-cq-trait" style={{ width: '46%', height: 12 }} />
        <span className="hl-cq-trait" style={{ width: '64%' }} />
      </div>
    </div>
  );
}

const SUITE = ' Bertrand';
const TITRES: Record<Langue, Record<string, string>> = {
  fr: { atelier: 'La vidéo de mercredi', tiktok: 'Les coulisses sur TikTok', boutique: 'Mon matériel de tournage' },
  en: { atelier: 'Wednesday’s video', tiktok: 'Behind the scenes on TikTok', boutique: 'My filming gear' },
};

/** Le back office au téléphone : le nom s'écrit sur la page, un bloc change de place, le design s'ouvre dans une feuille. */
function BackOffice({ etape }: { etape: number }) {
  const langue = useLangue();
  const l = useL();
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
  // Le thème choisi tranche sur le bleu de la scène : la nuit et sa pêche.
  const choisi = swatches[0];
  return (
    <div className="hl-bo">
      <div className="hl-bo-tete"><b>{l('Ma page', 'My page')}</b><span className="hl-gris">hopla.page/yanis</span></div>
      <div className="hl-bo-page" style={etape >= 6 ? { background: choisi.fondUni, color: choisi.texte } : undefined}>
        <img className="hl-cq-avatar" src={PROFILS.yanis.avatar} alt="" width="62" height="62" loading="lazy" />
        <span className="hl-bo-nom" data-edite={(etape >= 1 && etape < 2) || undefined}>Yanis{SUITE.slice(0, lettres)}{etape >= 1 && etape < 2 && <i className="hl-curseur" />}</span>
        <span className="hl-cq-trait" style={{ width: '58%' }} />
        <div className="hl-cq-liens" ref={liste}>
          {ordre.map(c => <CroquisLien key={c} cle={c} titre={TITRES[langue][c]} vedette={c === 'boutique'} data-souleve={c === 'boutique' && etape >= 2 && etape < 4 ? '' : undefined} />)}
        </div>
      </div>
      <div className="hl-bo-feuille" data-ouvert={etape >= 5 || undefined}>
        <b>{l('Personnaliser', 'Customize')}</b>
        <div className="hl-bo-themes">
          {swatches.map(t => <span key={t.id} style={{ background: t.fondUni }} data-choisi={(etape >= 6 ? t.id === choisi.id : t.id === 'champagne') || undefined} title={nomTheme(t, langue)} />)}
        </div>
      </div>
      <nav className="hl-bo-onglets">
        <span data-actif=""><Icone nom="nav-page" taille={18} />{l('Ma page', 'My page')}</span>
        <span><Icone nom="nav-stats" taille={18} />Stats</span>
        <span><Icone nom="palette" taille={18} />{l('Personnaliser', 'Design')}</span>
        <span><Icone nom="nav-reglages" taille={18} />{l('Réglages', 'Settings')}</span>
      </nav>
    </div>
  );
}

export function Prise() {
  const langue = useLangue();
  const l = useL();
  const [ref, enVue] = useEnVue<HTMLDivElement>(0.3);
  const [onglet, setOnglet] = useState<Onglet>('creer');
  const [jeu, setJeu] = useState(0);
  const [etape, rejouer] = useSequence(enVue, PAS[onglet]);

  // Une scène finie passe à l'autre, Créer puis Modifier puis Créer, sans rien à toucher ; la souris qui bouge sur
  // la scène suspend le passage, et quitter la section l'arrête là où il en est.
  const [pause, garde] = useEnchainement(enVue && etape >= PAS[onglet].length, TENUE[onglet], () => {
    setOnglet(o => (o === 'creer' ? 'modifier' : 'creer')); setJeu(j => j + 1); rejouer();
  });

  const liste = onglet === 'creer' ? ETAPES[langue] : GESTES[langue];
  // Le pas lu, de 0 à liste.length - 1.
  const rang = onglet === 'creer' ? Math.max(1, etape) - 1 : etape < 2 ? 0 : etape < 5 ? 1 : 2;

  const temps = (o: Onglet) => ({
    key: o === onglet ? `${o}-${jeu}` : o, 'data-actif': onglet === o || undefined, 'aria-current': onglet === o ? 'step' as const : undefined,
    'data-remplit': (o === onglet && !mouvementReduit()) || undefined, style: { '--duree': `${somme(PAS[o]) + TENUE[o]}ms` } as CSSProperties,
  });
  const pausee = pause || !enVue || undefined;

  /** Au bureau, une colonne de chaque côté du téléphone : Créer à gauche, Modifier à droite ; celle qui se joue s'allume. */
  const colonne = (o: Onglet) => {
    const pas = o === 'creer' ? ETAPES[langue] : GESTES[langue];
    const { key, ...t } = temps(o);
    return (
      <div className="hl-prise-col" data-cote={o} data-actif={onglet === o || undefined}>
        <p className="hl-prise-temps" data-pause={pausee}><span key={key} {...t}>{o === 'creer' ? l('Créer', 'Create') : l('Modifier', 'Edit')}</span></p>
        <ol className="hl-etapes">
          {pas.map((p, i) => (
            <li key={p.titre} data-lu={(onglet === o && rang === i) || undefined} aria-current={onglet === o && rang === i ? 'step' : undefined}>
              <span className="hl-etape-num">{p.picto ? <Icone nom={p.picto} taille={26} /> : i + 1}</span>
              <span><b>{p.titre}</b><span className="hl-etape-texte">{p.texte}</span></span>
            </li>
          ))}
        </ol>
      </div>
    );
  };

  return (
    <section className="hl-section hl-prise-scene" data-teinte="citron" aria-labelledby="prise">
      <div className="hl-tete-section hl-entre">
        <h2 id="prise" className="hl-h2">{l(<>Ta page en deux minutes<br /><span className="hl-cache">. </span><span>Depuis ton téléphone</span></>, <>Your page in two minutes<br /><span className="hl-cache">. </span><span>From your phone</span></>)}</h2>
        <p className="hl-chapo">{l('Quatre questions pour la créer. Ensuite, tu la modifies en la touchant : pas de formulaire à part.', 'Four questions to create it. Then you edit it by touching it: no separate form.')}</p>
      </div>
      <div className="hl-prise" {...garde}>
        {/* Au téléphone, les deux temps de la scène, dits et non choisis : celui qui se joue se remplit, puis passe la main. */}
        <ol className="hl-onglets hl-onglets-scene hl-temps hl-petit-seul" aria-label={l('Créer, puis modifier : les deux se jouent l’un après l’autre', 'Create, then edit: one plays after the other')} data-pause={pausee}>
          {(['creer', 'modifier'] as const).map(o => { const { key, ...t } = temps(o); return <li key={key} {...t}>{o === 'creer' ? l('Créer', 'Create') : l('Modifier', 'Edit')}</li>; })}
        </ol>
        {colonne('creer')}
        <div ref={ref} className="hl-prise-tel">
          <Telephone largeur={320} label={onglet === 'creer'
            ? l('La page de Yanis se remplit à chaque étape de l’inscription.', 'Yanis’s page fills in at each step of signup.')
            : l('Le back office de Hopla au téléphone : le nom s’écrit sur la page, un lien se déplace, le design s’ouvre dans une feuille.', 'The Hopla editor on a phone: the name is typed on the page, a link moves, the design opens in a sheet.')}>
            <div key={jeu} className="hl-fondu">{onglet === 'modifier' ? <BackOffice etape={etape} />
              : etape === 0 ? <Silhouette /> : <div className="hl-fondu"><EcranPage page={pageEtape(etape, langue)} /></div>}</div>
          </Telephone>
          <div className="hl-prise-legende hl-petit-seul">
            <div className="hl-segments" aria-hidden="true">{liste.map((_, i) => <i key={i} data-plein={rang >= i || undefined} />)}</div>
            <p><span className="hl-gris">{rang + 1} {l('sur', 'of')} {liste.length}</span> <b>{liste[rang].titre}</b><span className="hl-etape-texte">{liste[rang].texte}</span></p>
          </div>
        </div>
        {colonne('modifier')}
      </div>
    </section>
  );
}
