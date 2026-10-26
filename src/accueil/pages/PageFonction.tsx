import type { CSSProperties, ReactNode } from 'react';
import { Icone } from '../../components/Icone.tsx';
import { Symbole } from '../../components/Logo.tsx';
import { THEMES } from '../../lib/themes.ts';
import { nouveauBloc } from '../../lib/types.ts';
import type { Bloc } from '../../lib/types.ts';
import { NOMS_AUDIENCES, composerAudience } from '../../lib/provenance.ts';
import type { Audience } from '../../lib/provenance.ts';
import { EcranPage, Telephone } from '../Telephone.tsx';
import { BLOCS_EXEMPLES, pageExemple } from '../exemples.ts';
import {
  ADRESSE_LISTE, AVIS_MOT, AVIS_NOTE, EcranAvis, EcranDansApp, EcranDrop, EcranHeure, EcranListe, EcranRebours,
  LISTE_BREVO, LISTE_NOTEE, LISTE_TOUCHE, Phrase,
} from '../Fonctions.tsx';
import { Personne } from '../Profils.tsx';
import { Barre } from '../Ouverture.tsx';
import { DernierAppel, Pied } from '../Fin.tsx';
import { API } from '../api.ts';
import { ModeInscription } from '../textes.ts';
import type { Inscription } from '../textes.ts';
import { useEntrees } from '../mouvement.ts';
import { Defile } from './Defile.tsx';
import { PAGES_FONCTIONS } from './fonctions.ts';
import type { PageFonction as Donnees } from './fonctions.ts';

/*
 * La page d'une fonction : son titre sur le bleu, sa scène qui se joue en
 * défilant, trois raisons, ses questions, les autres fonctions et le champ du
 * nom. Les scènes reprennent les écrans de l'accueil (`Fonctions.tsx`) et les
 * vraies pages (`EcranPage`) ; ici, c'est le défilement qui les fait avancer.
 */

const borne = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const AUDIENCES_RESEAU: ('' | Audience)[] = ['', 'instagram', 'tiktok', 'youtube', 'linkedin'];

const b = (type: Bloc['type'], id: string, champs: Partial<Bloc>): Bloc => ({ ...nouveauBloc(type, `fonction-${id}`), ...champs });
const VITRINE: Bloc[] = [
  b('produit', 'bol', { titre: 'Bol en grès, émail sauge', url: 'https://exemple.fr/products/bol', prix: '38 €', vedette: true }),
  b('reservation', 'atelier', { titre: 'Un samedi à l’atelier', url: 'https://calendly.com/exemple/atelier', sousTitre: 'Trois heures pour tourner ton premier bol' }),
  b('soutien', 'soutien', { url: 'https://paypal.me/exemple', sousTitre: 'Pour m’aider à ouvrir un deuxième four.' }),
  b('lien', 'tour', { titre: 'Mon tour de potier', url: 'https://exemple-tours.fr/?ref=ines', partenariat: { mention: 'publicite', code: 'INES10' } }),
];

/** La scène de chaque page : l'étape i, avancée de t, dans un téléphone de `l` px. */
const SCENES: Record<string, { ratio?: number; rendu: (i: number, t: number, l: number) => ReactNode }> = {
  'selon-le-reseau': {
    ratio: 800 / 390,
    rendu: (i, _t, l) => {
      const a = AUDIENCES_RESEAU[i] ?? '';
      return (
        <div className="hf-tel-source">
          <span key={a || 'tous'} className="hf-source" data-reseau={a || undefined}>
            {a ? <><Icone nom={a} taille={16} />Depuis {NOMS_AUDIENCES[a]}</> : <><Icone nom="lien" taille={16} />hopla.page/camille</>}
          </span>
          <Telephone largeur={l} className="" label={a ? `La page de Camille ouverte depuis ${NOMS_AUDIENCES[a]}.` : 'La page de Camille.'}>
            <div key={a} className="hl-fondu"><EcranPage page={pageExemple('camille', undefined, { blocs: composerAudience(BLOCS_EXEMPLES.camille, a) })} /></div>
          </Telephone>
        </div>
      );
    },
  },
  'ouvrir-dans-l-app': {
    rendu: (i, t, l) => {
      const [cote, etape] = ([
        ['sans', t > 0.5 ? 1 : 0], ['sans', t < 0.5 ? 2 : 3], ['sans', t < 0.35 ? 3 : t < 0.65 ? 4 : 5],
        ['avec', t < 0.4 ? 1 : 2], ['avec', 3], ['avec', 4],
      ] as const)[i] ?? ['avec', 4];
      return (
        <Telephone largeur={l} className="hl-tel-court" label={cote === 'sans' ? 'Sans Hopla : le clip s’ouvre dans le navigateur d’Instagram.' : 'Avec Hopla : le clip s’ouvre dans l’app YouTube.'}>
          <EcranDansApp key={cote} cote={cote} etape={etape} />
        </Telephone>
      );
    },
  },
  'page-selon-l-heure': {
    ratio: 610 / 390,
    rendu: (i, t, l) => {
      const heure = borne(9 + Math.floor(((i + t) / 3) * 13), 9, 21);
      return <Telephone largeur={l} className="hl-tel-court hl-tel-vivante" label={`La page de Malik à ${heure} h.`}><EcranHeure heure={heure} /></Telephone>;
    },
  },
  lancement: {
    ratio: 610 / 390,
    rendu: (i, t, l) => {
      const reste = i === 0 ? Math.round(8048 - (8048 - 60) * t * t) : i === 1 ? Math.max(1, Math.round(60 * (1 - t))) : 0;
      return <Telephone largeur={l} className="hl-tel-court hl-tel-vivante" label={reste ? 'Un compte à rebours avant l’ouverture.' : 'Le lien est ouvert.'}><EcranRebours reste={reste} /></Telephone>;
    },
  },
  drops: {
    ratio: 610 / 390,
    rendu: (i, t, l) => {
      const drop = i === 0 ? 0 : i === 1 ? (t < 0.5 ? 0 : 1) : i === 2 ? 2 : 3;
      return <Telephone largeur={l} className="hl-tel-court hl-tel-vivante" label="Un lien réservé, qui s’ouvre avec un code, pour des places comptées."><EcranDrop drop={drop} /></Telephone>;
    },
  },
  avis: {
    ratio: 610 / 390,
    rendu: (i, t, l) => {
      const avis = i === 0 ? borne(Math.ceil(t * 5), 1, 5) : i === 1 ? AVIS_NOTE : AVIS_MOT;
      return <Telephone largeur={l} className="hl-tel-court hl-tel-vivante" label="Les avis d’Inès : 4,9 sur 5 pour 87 avis Google, et le mot d’une cliente."><EcranAvis avis={avis} /></Telephone>;
    },
  },
  'liste-email': {
    ratio: 610 / 390,
    rendu: (i, t, l) => {
      const liste = i === 0 ? borne(Math.ceil(t * ADRESSE_LISTE.length), 0, ADRESSE_LISTE.length) : i === 1 ? (t < 0.4 ? LISTE_TOUCHE : LISTE_NOTEE) : LISTE_BREVO;
      return <Telephone largeur={l} className="hl-tel-court hl-tel-vivante" label="Un visiteur s’inscrit à la liste de Malik, et part vers Brevo."><EcranListe liste={liste} /></Telephone>;
    },
  },
  stats: {
    rendu: i => (
      <article className="hl-mail hp-doc-email hf-mail" aria-label="L’e-mail du lundi d’Inès">
        <div className="hl-mail-tete"><Symbole className="hl-mail-logo" /><b>Hopla</b><span className="hl-gris">lundi, 9 h</span></div>
        <Personne profil="ines" />
        <p className="hl-mail-sujet">Ce qui a plu cette semaine</p>
        <ol className="hl-stats-liste">
          <Phrase joue={i >= 0} depart={0} hausse morceaux={['Ta page a eu', { n: 412 }, 'vues, soit', { n: 18, suite: ' %' }, 'de plus que la semaine d’avant.']} />
          <Phrase joue={i >= 1} depart={0} morceaux={['Instagram t’amène le plus de monde :', { n: 61, suite: ' %' }, 'des visites.']} />
          <Phrase joue={i >= 2} depart={0} morceaux={['Ton meilleur jour : jeudi, avec', { n: 88 }, 'vues. Un post ce jour-là ?']} />
          <Phrase joue={i >= 3} depart={0} hausse morceaux={['Ton lien « Mes pièces du moment » a fait', { n: 40, avant: '+', suite: ' %' }, 'de clics (35 contre 25).']} />
          <Phrase joue={i >= 4} depart={0} morceaux={[{ n: 38 }, 'clics se sont ouverts directement dans leur app, sans rester coincés dans Instagram.']} />
        </ol>
      </article>
    ),
  },
  vitrine: {
    ratio: 800 / 390,
    rendu: (i, _t, l) => (
      <Telephone largeur={l} label="La vitrine d’Inès : un produit, un rendez-vous, un soutien et un lien partenaire.">
        <EcranPage page={pageExemple('ines', undefined, { blocs: VITRINE.slice(Math.max(0, i - 2), i + 1) })} />
      </Telephone>
    ),
  },
  themes: {
    ratio: 800 / 390,
    rendu: (i, t, l) => {
      const perso = i >= 3;
      const k = perso ? THEMES.findIndex(x => x.id === 'lin') : borne(Math.floor(((i + t) / 3) * THEMES.length), 0, THEMES.length - 1);
      const theme = THEMES[Math.max(0, k)];
      return (
        <div className="hf-tel-source">
          <span key={perso ? 'perso' : theme.id} className="hf-source">{perso ? 'Tes couleurs, sur Lin' : theme.nom}</span>
          <Telephone largeur={l} label={`La page de Léa dans le thème ${theme.nom}.`}>
            <EcranPage page={pageExemple('lea', theme.id, perso ? { couleurs: { fond: '#f4efe6', boutons: '#33524a', accent: '#c4421a' } } : {})} />
          </Telephone>
        </div>
      );
    },
  },
};

export function PageFonction({ page, mode = 'libre' }: { page: Donnees; mode?: Inscription }) {
  useEntrees();
  const scene = SCENES[page.slug];
  const autres = PAGES_FONCTIONS.filter(p => p.slug !== page.slug);
  return (
    <ModeInscription.Provider value={mode}>
      <div className="hl hl-humain hf">
        <a href="#contenu" className="hl-evitement">Aller au contenu</a>
        <Barre ailleurs />
        <main id="contenu">
          <section className="hl-heros hf-heros" data-teinte="klein" aria-labelledby="titre">
            <nav className="hf-fil" aria-label="Fil d’Ariane"><a href="/">Hopla</a><span aria-hidden="true">/</span><a href="/fonctionnalites">Fonctionnalités</a></nav>
            <h1 id="titre" className="hl-h1 hf-titre">{page.titre[0]}<span className="hl-cache">. </span><span>{page.titre[1]}</span></h1>
            <p className="hl-chapo">{page.chapo}</p>
          </section>
          <Defile etapes={page.etapes} titre={`${page.nom}, en ${page.etapes.length} étapes`} ratio={scene.ratio} rendu={scene.rendu} />
          <section className="hl-section hf-points" data-teinte="creme" aria-labelledby="pourquoi">
            <h2 id="pourquoi" className="hl-h2 hl-entre">Pourquoi ça compte</h2>
            <ul>
              {page.points.map((p, k) => (
                <li key={p.titre} className="hl-entre" style={{ '--d': `${k * 60}ms` } as CSSProperties}><b>{p.titre}</b><p>{p.texte}</p></li>
              ))}
            </ul>
          </section>
          <section className="hl-section hl-etroite" id="questions" aria-labelledby="titre-questions">
            <div className="hl-questions-tete hl-entre"><h2 id="titre-questions" className="hl-h2">Questions</h2></div>
            <div className="hl-questions">
              {page.questions.map(([q, r]) => (
                <details key={q} className="hl-question"><summary>{q}<Icone nom="ui-plus" taille={18} /></summary><p>{r}</p></details>
              ))}
            </div>
          </section>
          <section className="hl-section hf-autres" aria-labelledby="autres">
            <h2 id="autres" className="hl-h2 hl-entre">Les autres fonctionnalités</h2>
            <ListeFonctions pages={autres} />
          </section>
          <DernierAppel api={API[mode]} />
        </main>
        <Pied />
      </div>
    </ModeInscription.Provider>
  );
}

/** Les fonctions en liste : le nom et la promesse ; l'offre de chacune se lit dans le tableau des tarifs. */
export function ListeFonctions({ pages }: { pages: Donnees[] }) {
  return (
    <ul className="hf-liste">
      {pages.map(p => (
        <li key={p.slug}>
          <a href={`/fonctionnalites/${p.slug}`}>
            <b>{p.nom}</b>
            <span>{p.chapo.split('. ')[0].replace(/\.$/, '')}.</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** /fonctionnalites : toutes les fonctions, une ligne chacune. */
export function IndexFonctions({ mode = 'libre' }: { mode?: Inscription }) {
  useEntrees();
  return (
    <ModeInscription.Provider value={mode}>
      <div className="hl hl-humain hf">
        <a href="#contenu" className="hl-evitement">Aller au contenu</a>
        <Barre ailleurs />
        <main id="contenu">
          <section className="hl-heros hf-heros" data-teinte="klein" aria-labelledby="titre">
            <nav className="hf-fil" aria-label="Fil d’Ariane"><a href="/">Hopla</a></nav>
            <h1 id="titre" className="hl-h1 hf-titre">Ce que fait Hopla<span className="hl-cache">. </span><span>Toutes ses fonctionnalités</span></h1>
            <p className="hl-chapo">Chaque page montre une fonctionnalité en mouvement : fais défiler, la scène se joue.</p>
          </section>
          <section className="hl-section hf-autres" aria-label="Les fonctionnalités">
            <ListeFonctions pages={PAGES_FONCTIONS} />
          </section>
          <DernierAppel api={API[mode]} />
        </main>
        <Pied />
      </div>
    </ModeInscription.Provider>
  );
}
