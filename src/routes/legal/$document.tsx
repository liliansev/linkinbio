import { createFileRoute, notFound } from '@tanstack/react-router';
import type { DocumentLegal, NomDocument } from '../../lib/legal.ts';
import { DOCUMENTS, LEGAL } from '../../lib/legal.ts';
import { LEGAL_EN, cheminLegal, documentDeSlug } from '../../lib/legal-en.ts';
import { ORIGINE_PUBLIQUE } from '../../lib/types.ts';
import { Pied } from '../../accueil/Fin.tsx';
import { Barre } from '../../accueil/Ouverture.tsx';
import { LangueSite } from '../../accueil/langue.ts';

/*
 * Les textes légaux de Hopla (CGU, accord de traitement, confidentialité, sous-traitants, mentions). Depuis le
 * 8 novembre 2026 (accord de Lilian), en anglais sous leurs adresses anglaises (`/legal/terms`…, `lib/legal-en.ts`),
 * en français sous les adresses d'avant (`/legal/cgu`…) ; la version française fait foi.
 */
export const Route = createFileRoute('/legal/$document')({
  loader: ({ params }) => {
    const d = documentDeSlug(params.document);
    if (!d) throw notFound();
    return d;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const doc = textes(loaderData.langue)[loaderData.nom];
    return {
      meta: [{ title: `${doc.titre} · Hopla` }, { name: 'description', content: doc.resume }, { name: 'theme-color', content: '#292bff' }],
      links: [
        { rel: 'alternate', hrefLang: 'en', href: `${ORIGINE_PUBLIQUE}${cheminLegal(loaderData.nom, 'en')}` },
        { rel: 'alternate', hrefLang: 'fr', href: `${ORIGINE_PUBLIQUE}${cheminLegal(loaderData.nom, 'fr')}` },
        { rel: 'alternate', hrefLang: 'x-default', href: `${ORIGINE_PUBLIQUE}${cheminLegal(loaderData.nom, 'en')}` },
      ],
    };
  },
  component: PageLegale,
});

const textes = (langue: 'fr' | 'en'): Record<NomDocument, DocumentLegal> => (langue === 'en' ? LEGAL_EN : LEGAL);

/** Les espaces avant « : ; ? ! » et dans les guillemets deviennent insécables à l'affichage, en français : le texte ne change pas. */
const fines = (t: string) => t.replace(/ ([:;?!»])/g, ' $1').replace(/« /g, '« ');

function PageLegale() {
  const { nom, langue } = Route.useLoaderData();
  const tous = textes(langue);
  const doc = tous[nom];
  const en = langue === 'en';
  const autre = en ? 'fr' : 'en';
  // Le gabarit des pages publiques (26 octobre 2026, audit des alignements) : la barre, le titre sur le bleu, le texte
  // sur la colonne commune, puis le pied.
  return (
    <LangueSite.Provider value={langue}>
    <div className="hl hl-humain hf">
      <a href="#contenu" className="hl-evitement">{en ? 'Skip to content' : 'Aller au contenu'}</a>
      <Barre ailleurs />
      <main id="contenu">
        <section className="hl-heros hf-heros" data-teinte="klein" aria-labelledby="titre">
          <nav className="hf-fil" aria-label={en ? 'Breadcrumb' : 'Fil d’Ariane'}><a href={en ? '/' : '/fr'}>Hopla</a></nav>
          <h1 id="titre" className="hl-h1 hf-titre">{doc.titre}</h1>
          <p className="hl-chapo">{doc.resume}</p>
        </section>
        <div className="hl-section hl-etroite hf-legal">
          {doc.sections.map(s => (
            <section key={s.titre}>
              <h2 className="hl-h3">{s.titre}</h2>
              {s.texte.map((t, i) => <p key={i}>{en ? t : fines(t)}</p>)}
            </section>
          ))}
          <nav className="hf-legal-docs" aria-label={en ? 'Legal' : 'Textes légaux'}>
            {DOCUMENTS.map(d => (
              <a key={d} href={cheminLegal(d, langue)} aria-current={d === nom ? 'page' : undefined}>{tous[d].titre}</a>
            ))}
            <a href={cheminLegal(nom, autre)} hrefLang={autre} lang={autre}>{en ? 'Version française' : 'English version'}</a>
          </nav>
        </div>
      </main>
      <Pied />
    </div>
    </LangueSite.Provider>
  );
}
