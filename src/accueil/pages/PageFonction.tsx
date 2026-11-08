import type { CSSProperties, ReactNode } from 'react';
import { Icone } from '../../components/Icone.tsx';
import { Symbole } from '../../components/Logo.tsx';
import { THEMES, nomTheme } from '../../lib/themes.ts';
import { nouveauBloc } from '../../lib/types.ts';
import type { Bloc } from '../../lib/types.ts';
import { NOMS_AUDIENCES, composerAudience } from '../../lib/provenance.ts';
import type { Audience } from '../../lib/provenance.ts';
import { EcranPage, Telephone } from '../Telephone.tsx';
import { blocsExemples, pageExemple } from '../exemples.ts';
import {
  ADRESSE_LISTE, AVIS_MOT, AVIS_NOTE, EcranAvis, EcranDansApp, EcranDrop, EcranHeure, EcranListe, EcranRebours,
  LISTE_BREVO, LISTE_NOTEE, LISTE_TOUCHE, Phrase,
} from '../Fonctions.tsx';
import { Personne } from '../Profils.tsx';
import { Barre } from '../Ouverture.tsx';
import { DernierAppel, Pied } from '../Fin.tsx';
import { APIS } from '../api.ts';
import { ModeInscription } from '../textes.ts';
import type { Inscription } from '../textes.ts';
import { useEntrees } from '../mouvement.ts';
import { Defile } from './Defile.tsx';
import { CAPTURES_FONCTIONS, Ecran } from '../Capture.tsx';
import { CHEMIN_FONCTIONS, pagesFonctions } from './fonctions.ts';
import type { PageFonction as Donnees } from './fonctions.ts';
import type { Langue } from '../../lib/types.ts';
import { LangueSite, accueilDe, choix } from '../langue.ts';
import type { Choix } from '../langue.ts';

/*
 * La page d'une fonction : son titre sur le bleu, sa scène qui se joue en
 * défilant, trois raisons, ses questions, les autres fonctions et le champ du
 * nom. Les scènes reprennent les écrans de l'accueil (`Fonctions.tsx`) et les
 * vraies pages (`EcranPage`) ; ici, c'est le défilement qui les fait avancer.
 */

const borne = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const AUDIENCES_RESEAU: ('' | Audience)[] = ['', 'instagram', 'tiktok', 'youtube', 'linkedin'];

const b = (type: Bloc['type'], id: string, champs: Partial<Bloc>): Bloc => ({ ...nouveauBloc(type, `fonction-${id}`), ...champs });
const vitrine = (l: Choix): Bloc[] => [
  b('produit', 'bol', { titre: l('Bol en grès, émail sauge', 'Stoneware bowl, sage glaze'), url: 'https://exemple.fr/products/bol', prix: l('38 €', '$42'), vedette: true }),
  b('reservation', 'atelier', { titre: l('Un samedi à l’atelier', 'A Saturday at the studio'), url: 'https://calendly.com/exemple/atelier', sousTitre: l('Trois heures pour tourner ton premier bol', 'Three hours to throw your first bowl') }),
  b('soutien', 'soutien', { url: 'https://paypal.me/exemple', sousTitre: l('Pour m’aider à ouvrir un deuxième four.', 'To help me open a second kiln.') }),
  b('lien', 'tour', { titre: l('Mon tour de potier', 'My pottery wheel'), url: 'https://exemple-tours.fr/?ref=ines', partenariat: { mention: 'publicite', code: 'INES10' } }),
];

/** La scène de chaque page, par son id : l'étape i, avancée de t, dans un téléphone de `l` px. */
const scenes = (langue: Langue): Record<string, { ratio?: number; rendu: (i: number, t: number, l: number) => ReactNode }> => {
  const tr = choix(langue);
  const VITRINE = vitrine(tr);
  return {
  'selon-le-reseau': {
    ratio: 800 / 390,
    rendu: (i, _t, l) => {
      const a = AUDIENCES_RESEAU[i] ?? '';
      return (
        <div className="hf-tel-source">
          <span key={a || 'tous'} className="hf-source" data-reseau={a || undefined}>
            {a ? <><Icone nom={a} taille={16} />{tr('Depuis', 'From')} {NOMS_AUDIENCES[a]}</> : <><Icone nom="lien" taille={16} />hopla.page/camille</>}
          </span>
          <Telephone largeur={l} className="" label={a ? tr(`La page de Camille ouverte depuis ${NOMS_AUDIENCES[a]}.`, `Camille’s page opened from ${NOMS_AUDIENCES[a]}.`) : tr('La page de Camille.', 'Camille’s page.')}>
            <div key={a} className="hl-fondu"><EcranPage page={pageExemple('camille', undefined, { blocs: composerAudience(blocsExemples('camille', langue), a), langue })} /></div>
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
        <Telephone largeur={l} className="hl-tel-court" label={cote === 'sans' ? tr('Sans Hopla : le clip s’ouvre dans le navigateur d’Instagram.', 'Without Hopla: the video opens in Instagram’s browser.') : tr('Avec Hopla : le clip s’ouvre dans l’app YouTube.', 'With Hopla: the video opens in the YouTube app.')}>
          <EcranDansApp key={cote} cote={cote} etape={etape} />
        </Telephone>
      );
    },
  },
  'page-selon-l-heure': {
    ratio: 610 / 390,
    rendu: (i, t, l) => {
      const heure = borne(9 + Math.floor(((i + t) / 3) * 13), 9, 21);
      return <Telephone largeur={l} className="hl-tel-court hl-tel-vivante" label={tr(`La page de Nadia à ${heure} h.`, `Nadia’s page at ${heure > 12 ? heure - 12 : heure} ${heure >= 12 ? 'pm' : 'am'}.`)}><EcranHeure heure={heure} /></Telephone>;
    },
  },
  lancement: {
    ratio: 610 / 390,
    rendu: (i, t, l) => {
      const reste = i === 0 ? Math.round(8048 - (8048 - 60) * t * t) : i === 1 ? Math.max(1, Math.round(60 * (1 - t))) : 0;
      return <Telephone largeur={l} className="hl-tel-court hl-tel-vivante" label={reste ? tr('Un compte à rebours avant l’ouverture.', 'A countdown before the opening.') : tr('Le lien est ouvert.', 'The link is open.')}><EcranRebours reste={reste} /></Telephone>;
    },
  },
  drops: {
    ratio: 610 / 390,
    rendu: (i, t, l) => {
      const drop = i === 0 ? 0 : i === 1 ? (t < 0.5 ? 0 : 1) : i === 2 ? 2 : 3;
      return <Telephone largeur={l} className="hl-tel-court hl-tel-vivante" label={tr('Un lien réservé, qui s’ouvre avec un code, pour des places comptées.', 'A private link that opens with a code, for limited spots.')}><EcranDrop drop={drop} /></Telephone>;
    },
  },
  avis: {
    ratio: 610 / 390,
    rendu: (i, t, l) => {
      const avis = i === 0 ? borne(Math.ceil(t * 5), 1, 5) : i === 1 ? AVIS_NOTE : AVIS_MOT;
      return <Telephone largeur={l} className="hl-tel-court hl-tel-vivante" label={tr('Les avis d’Inès : 4,9 sur 5 pour 87 avis Google, et le mot d’une cliente.', 'Inès’s reviews: 4.9 out of 5 from 87 Google reviews, and a customer’s words.')}><EcranAvis avis={avis} /></Telephone>;
    },
  },
  'liste-email': {
    ratio: 610 / 390,
    rendu: (i, t, l) => {
      const liste = i === 0 ? borne(Math.ceil(t * ADRESSE_LISTE.length), 0, ADRESSE_LISTE.length) : i === 1 ? (t < 0.4 ? LISTE_TOUCHE : LISTE_NOTEE) : LISTE_BREVO;
      return <Telephone largeur={l} className="hl-tel-court hl-tel-vivante" label={tr('Un visiteur s’inscrit à la liste de Nadia, et part vers Brevo.', 'A visitor joins Nadia’s list, and goes to Brevo.')}><EcranListe liste={liste} /></Telephone>;
    },
  },
  stats: {
    rendu: i => (
      <article className="hl-mail hp-doc-email hf-mail" aria-label={tr('L’e-mail du lundi d’Inès', 'Inès’s Monday email')}>
        <div className="hl-mail-tete"><Symbole className="hl-mail-logo" /><b>Hopla</b><span className="hl-gris">{tr('lundi, 9 h', 'Monday, 9 am')}</span></div>
        <Personne profil="ines" />
        <p className="hl-mail-sujet">{tr('Ce qui a plu cette semaine', 'What people liked this week')}</p>
        <ol className="hl-stats-liste">
          <Phrase joue={i >= 0} depart={0} hausse morceaux={tr(['Ta page a eu', { n: 412 }, 'vues, soit', { n: 18, suite: ' %' }, 'de plus que la semaine d’avant.'], ['Your page got', { n: 412 }, 'views,', { n: 18, suite: '%' }, 'more than the week before.'])} />
          <Phrase joue={i >= 1} depart={0} morceaux={tr(['Instagram t’amène le plus de monde :', { n: 61, suite: ' %' }, 'des visites.'], ['Instagram brings you the most people:', { n: 61, suite: '%' }, 'of visits.'])} />
          <Phrase joue={i >= 2} depart={0} morceaux={tr(['Ton meilleur jour : jeudi, avec', { n: 88 }, 'vues. Un post ce jour-là ?'], ['Your best day: Thursday, with', { n: 88 }, 'views. A post that day?'])} />
          <Phrase joue={i >= 3} depart={0} hausse morceaux={tr(['Ton lien « Mes pièces du moment » a fait', { n: 40, avant: '+', suite: ' %' }, 'de clics (35 contre 25).'], ['Your link “My pieces of the moment” got', { n: 40, avant: '+', suite: '%' }, 'more clicks (35 versus 25).'])} />
          <Phrase joue={i >= 4} depart={0} morceaux={tr([{ n: 38 }, 'clics se sont ouverts directement dans leur app, sans rester coincés dans Instagram.'], [{ n: 38 }, 'clicks opened right in their app, instead of getting stuck in Instagram.'])} />
        </ol>
      </article>
    ),
  },
  vitrine: {
    ratio: 800 / 390,
    rendu: (i, _t, l) => (
      <Telephone largeur={l} label={tr('La vitrine d’Inès : un produit, un rendez-vous, un soutien et un lien partenaire.', 'Inès’s storefront: a product, a booking, a tip and an affiliate link.')}>
        <EcranPage page={pageExemple('ines', undefined, { blocs: VITRINE.slice(Math.max(0, i - 2), i + 1), langue })} />
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
          <span key={perso ? 'perso' : theme.id} className="hf-source">{perso ? tr('Tes couleurs, sur Lin', `Your colors, on ${nomTheme(theme, 'en')}`) : nomTheme(theme, langue)}</span>
          <Telephone largeur={l} label={tr(`La page de Yanis dans le thème ${theme.nom}.`, `Yanis’s page in the ${nomTheme(theme, 'en')} theme.`)}>
            <EcranPage page={pageExemple('yanis', theme.id, { langue, ...(perso ? { couleurs: { fond: '#f4efe6', boutons: '#33524a', accent: '#c4421a' } } : {}) })} />
          </Telephone>
        </div>
      );
    },
  },
  };
};

export function PageFonction({ page, mode = 'libre', langue = 'en' }: { page: Donnees; mode?: Inscription; langue?: Langue }) {
  useEntrees();
  const l = choix(langue);
  const scene = scenes(langue)[page.id];
  const capture = CAPTURES_FONCTIONS[page.id];
  const autres = pagesFonctions(langue).filter(p => p.id !== page.id);
  return (
    <LangueSite.Provider value={langue}>
    <ModeInscription.Provider value={mode}>
      <div className="hl hl-humain hf">
        <a href="#contenu" className="hl-evitement">{l('Aller au contenu', 'Skip to content')}</a>
        <Barre ailleurs />
        <main id="contenu">
          <section className="hl-heros hf-heros" data-teinte="klein" aria-labelledby="titre">
            <nav className="hf-fil" aria-label={l('Fil d’Ariane', 'Breadcrumb')}><a href={accueilDe(langue)}>Hopla</a><span aria-hidden="true">/</span><a href={CHEMIN_FONCTIONS[langue]}>{l('Fonctionnalités', 'Features')}</a></nav>
            <h1 id="titre" className="hl-h1 hf-titre">{page.titre[0]}<span className="hl-cache">. </span><span>{page.titre[1]}</span></h1>
            <p className="hl-chapo">{page.chapo}</p>
          </section>
          <Defile etapes={page.etapes} titre={l(`${page.nom}, en ${page.etapes.length} étapes`, `${page.nom}, in ${page.etapes.length} steps`)} ratio={scene.ratio} rendu={scene.rendu} />
          {capture && (
            <section className="hl-section hf-espace" aria-labelledby="titre-espace">
              <div className="hl-tete-section hl-entre">
                <h2 id="titre-espace" className="hl-h2">{l('Dans ton espace', 'In your dashboard')}</h2>
                <p className="hl-chapo">{l(capture.texte, capture.texteEn)}</p>
              </div>
              <div className="hl-entre"><Ecran capture={capture.capture} telephone={capture.telephone} /></div>
            </section>
          )}
          <section className="hl-section hf-points" data-teinte="creme" aria-labelledby="pourquoi">
            <h2 id="pourquoi" className="hl-h2 hl-entre">{l('Pourquoi ça compte', 'Why it matters')}</h2>
            <ul>
              {page.points.map((p, k) => (
                <li key={p.titre} className="hl-entre" style={{ '--d': `${k * 60}ms` } as CSSProperties}><b>{p.titre}</b><p>{p.texte}</p></li>
              ))}
            </ul>
          </section>
          <section className="hl-section hl-etroite" id="questions" aria-labelledby="titre-questions">
            <div className="hl-questions-tete hl-entre"><h2 id="titre-questions" className="hl-h2">{l('Questions', 'Questions')}</h2></div>
            <div className="hl-questions">
              {page.questions.map(([q, r]) => (
                <details key={q} className="hl-question"><summary>{q}<Icone nom="ui-plus" taille={18} /></summary><p>{r}</p></details>
              ))}
            </div>
          </section>
          <section className="hl-section hf-autres" aria-labelledby="autres">
            <h2 id="autres" className="hl-h2 hl-entre">{l('Les autres fonctionnalités', 'Other features')}</h2>
            <ListeFonctions pages={autres} langue={langue} />
          </section>
          <DernierAppel api={APIS[mode][langue]} />
        </main>
        <Pied />
      </div>
    </ModeInscription.Provider>
    </LangueSite.Provider>
  );
}

/** Les fonctions en liste : le nom et la promesse ; l'offre de chacune se lit dans le tableau des tarifs. */
export function ListeFonctions({ pages, langue }: { pages: Donnees[]; langue: Langue }) {
  return (
    <ul className="hf-liste">
      {pages.map(p => (
        <li key={p.id}>
          <a href={`${CHEMIN_FONCTIONS[langue]}/${p.slug}`}>
            <b>{p.nom}</b>
            <span>{p.chapo.split('. ')[0].replace(/\.$/, '')}.</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** /features et /fonctionnalites : toutes les fonctions, une ligne chacune. */
export function IndexFonctions({ mode = 'libre', langue = 'en' }: { mode?: Inscription; langue?: Langue }) {
  useEntrees();
  const l = choix(langue);
  return (
    <LangueSite.Provider value={langue}>
    <ModeInscription.Provider value={mode}>
      <div className="hl hl-humain hf">
        <a href="#contenu" className="hl-evitement">{l('Aller au contenu', 'Skip to content')}</a>
        <Barre ailleurs />
        <main id="contenu">
          <section className="hl-heros hf-heros" data-teinte="klein" aria-labelledby="titre">
            <nav className="hf-fil" aria-label={l('Fil d’Ariane', 'Breadcrumb')}><a href={accueilDe(langue)}>Hopla</a></nav>
            <h1 id="titre" className="hl-h1 hf-titre">{l('Ce que fait Hopla', 'What Hopla does')}<span className="hl-cache">. </span><span>{l('Toutes ses fonctionnalités', 'Every feature')}</span></h1>
            <p className="hl-chapo">{l('Chaque page montre une fonctionnalité en mouvement : fais défiler, la scène se joue.', 'Each page shows a feature in motion: scroll, and the scene plays.')}</p>
          </section>
          <section className="hl-section hf-autres" aria-label={l('Les fonctionnalités', 'Features')}>
            <ListeFonctions pages={pagesFonctions(langue)} langue={langue} />
          </section>
          <DernierAppel api={APIS[mode][langue]} />
        </main>
        <Pied />
      </div>
    </ModeInscription.Provider>
    </LangueSite.Provider>
  );
}
