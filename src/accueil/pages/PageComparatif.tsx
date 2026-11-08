import type { CSSProperties } from 'react';
import { Icone } from '../../components/Icone.tsx';
import { Barre } from '../Ouverture.tsx';
import { DernierAppel, Pied } from '../Fin.tsx';
import { APIS } from '../api.ts';
import { ModeInscription } from '../textes.ts';
import type { Inscription } from '../textes.ts';
import { useEntrees } from '../mouvement.ts';
import { CHEMIN_COMPARATIFS, comparatifs, pasAnnonce } from './comparatifs.ts';
import type { Comparatif } from './comparatifs.ts';
import type { Langue } from '../../lib/types.ts';
import { LangueSite, accueilDe, choix } from '../langue.ts';

/*
 * Hopla face à un outil du marché : le titre sur le bleu, le tableau sur le
 * crème, le texte, quand choisir l'autre, les questions et les autres
 * comparatifs. Les mots vivent dans `comparatifs.ts`.
 */

export function PageComparatif({ c, mode = 'libre', langue = 'en' }: { c: Comparatif; mode?: Inscription; langue?: Langue }) {
  useEntrees();
  const l = choix(langue);
  const autres = comparatifs(langue).filter(x => x.slug !== c.slug);
  return (
    <LangueSite.Provider value={langue}>
    <ModeInscription.Provider value={mode}>
      <div className="hl hl-humain hf">
        <a href="#contenu" className="hl-evitement">{l('Aller au contenu', 'Skip to content')}</a>
        <Barre ailleurs />
        <main id="contenu">
          <section className="hl-heros hf-heros" data-teinte="klein" aria-labelledby="titre">
            <nav className="hf-fil" aria-label={l('Fil d’Ariane', 'Breadcrumb')}><a href={accueilDe(langue)}>Hopla</a><span aria-hidden="true">/</span><a href={CHEMIN_COMPARATIFS[langue]}>{l('Comparatifs', 'Comparisons')}</a></nav>
            <h1 id="titre" className="hl-h1 hf-titre">Hopla vs {c.nom}<span className="hl-cache">{l(' : ', ': ')}</span><span>{l('Le comparatif', 'The comparison')}</span></h1>
            <p className="hl-chapo">{c.chapo}</p>
          </section>
          <section className="hl-section hf-tableau" data-teinte="creme" aria-labelledby="tableau">
            <h2 id="tableau" className="hl-h2 hl-entre">{l('En un coup d’œil', 'At a glance')}</h2>
            <div className="hf-tableau-cadre hl-entre">
              <table>
                <thead>
                  <tr><th scope="col"><span className="hl-cache">{l('Critère', 'Criterion')}</span></th><th scope="col" className="hf-nous">Hopla</th><th scope="col">{c.nom}</th></tr>
                </thead>
                <tbody>
                  {c.lignes.map(([critere, hopla, eux]) => (
                    <tr key={critere}><th scope="row">{critere}</th><td className="hf-nous">{hopla}</td><td data-vide={pasAnnonce(eux) || undefined}>{eux}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="hl-section hl-etroite hf-texte" aria-label={l(`Hopla et ${c.nom}`, `Hopla and ${c.nom}`)}>
            {c.parties.map(p => (
              <div key={p.titre} className="hl-entre">
                <h2 className="hl-h2">{p.titre}</h2>
                {p.texte.map(t => <p key={t}>{t}</p>)}
              </div>
            ))}
            <div className="hf-pour-eux hl-entre">
              <h2 className="hl-h3">{l('Quand choisir', 'When to choose')} {c.nom}</h2>
              <p>{c.pourEux}</p>
            </div>
          </section>
          <section className="hl-section hl-etroite" id="questions" aria-labelledby="titre-questions">
            <div className="hl-questions-tete hl-entre"><h2 id="titre-questions" className="hl-h2">Questions</h2></div>
            <div className="hl-questions">
              {c.questions.map(([q, r]) => (
                <details key={q} className="hl-question"><summary>{q}<Icone nom="ui-plus" taille={18} /></summary><p>{r}</p></details>
              ))}
            </div>
          </section>
          <section className="hl-section hf-autres" aria-labelledby="autres">
            <h2 id="autres" className="hl-h2 hl-entre">{l('Les autres comparatifs', 'Other comparisons')}</h2>
            <ListeComparatifs liste={autres} langue={langue} />
          </section>
          <DernierAppel api={APIS[mode][langue]} />
        </main>
        <Pied />
      </div>
    </ModeInscription.Provider>
    </LangueSite.Provider>
  );
}

export function ListeComparatifs({ liste, langue }: { liste: Comparatif[]; langue: Langue }) {
  return (
    <ul className="hf-liste">
      {liste.map((c, k) => (
        <li key={c.slug} className="hl-entre" style={{ '--d': `${k * 40}ms` } as CSSProperties}>
          <a href={`${CHEMIN_COMPARATIFS[langue]}/${c.slug}`}><b>Hopla vs {c.nom}</b><span>{c.qui[0].toUpperCase() + c.qui.slice(1)}.</span></a>
        </li>
      ))}
    </ul>
  );
}

/** /compare et /comparatif : Hopla face à chaque outil. */
export function IndexComparatifs({ mode = 'libre', langue = 'en' }: { mode?: Inscription; langue?: Langue }) {
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
            <h1 id="titre" className="hl-h1 hf-titre">{l('Hopla face aux autres', 'Hopla vs the others')}<span className="hl-cache">. </span><span>{l('Outil par outil', 'Tool by tool')}</span></h1>
            <p className="hl-chapo">{l('Linktree, Beacons, Stan et les autres : leurs prix, leurs commissions, et ce que Hopla fait de plus, une page qui s’adapte à chaque visiteur.', 'Linktree, Beacons, Stan and the others: their prices, their commissions, and what Hopla adds, a page that adapts to each visitor.')}</p>
          </section>
          <section className="hl-section hf-autres" aria-label={l('Les comparatifs', 'Comparisons')}>
            <ListeComparatifs liste={comparatifs(langue)} langue={langue} />
          </section>
          <DernierAppel api={APIS[mode][langue]} />
        </main>
        <Pied />
      </div>
    </ModeInscription.Provider>
    </LangueSite.Provider>
  );
}
