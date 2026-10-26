import { createFileRoute, notFound } from '@tanstack/react-router';
import type { NomDocument } from '../../lib/legal.ts';
import { DOCUMENTS, LEGAL } from '../../lib/legal.ts';
import { Pied } from '../../accueil/Fin.tsx';
import { Barre } from '../../accueil/Ouverture.tsx';

/* Les textes légaux de Hopla (CGU, accord de traitement, confidentialité, sous-traitants, mentions). */
export const Route = createFileRoute('/legal/$document')({
  loader: ({ params }) => {
    if (!DOCUMENTS.includes(params.document as NomDocument)) throw notFound();
    return params.document as NomDocument;
  },
  head: ({ loaderData }) => ({ meta: loaderData ? [{ title: `${LEGAL[loaderData].titre} · Hopla` }, { name: 'description', content: LEGAL[loaderData].resume }, { name: 'theme-color', content: '#292bff' }] : [] }),
  component: PageLegale,
});

/** Les espaces avant « : ; ? ! » et dans les guillemets deviennent insécables à l'affichage : le texte ne change pas. */
const fines = (t: string) => t.replace(/ ([:;?!»])/g, '\u00a0$1').replace(/« /g, '«\u00a0');

function PageLegale() {
  const nom = Route.useLoaderData();
  const doc = LEGAL[nom];
  // Le gabarit des pages publiques (26 octobre 2026, audit des alignements) : la barre, le titre sur le bleu, le texte
  // sur la colonne commune, puis le pied ; plus de page à part, en nuit, sans barre.
  return (
    <div className="hl hl-humain hf">
      <a href="#contenu" className="hl-evitement">Aller au contenu</a>
      <Barre ailleurs />
      <main id="contenu">
        <section className="hl-heros hf-heros" data-teinte="klein" aria-labelledby="titre">
          <nav className="hf-fil" aria-label="Fil d’Ariane"><a href="/">Hopla</a></nav>
          <h1 id="titre" className="hl-h1 hf-titre">{doc.titre}</h1>
          <p className="hl-chapo">{doc.resume}</p>
        </section>
        <div className="hl-section hl-etroite hf-legal">
          {doc.sections.map(s => (
            <section key={s.titre}>
              <h2 className="hl-h3">{s.titre}</h2>
              {s.texte.map((t, i) => <p key={i}>{fines(t)}</p>)}
            </section>
          ))}
          <nav className="hf-legal-docs" aria-label="Textes légaux">
            {DOCUMENTS.map(d => (
              <a key={d} href={`/legal/${d}`} aria-current={d === nom ? 'page' : undefined}>{LEGAL[d].titre}</a>
            ))}
          </nav>
        </div>
      </main>
      <Pied />
    </div>
  );
}
