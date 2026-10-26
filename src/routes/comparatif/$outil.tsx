import { createFileRoute, notFound } from '@tanstack/react-router';
import { PageComparatif } from '../../accueil/pages/PageComparatif.tsx';
import { comparatif } from '../../accueil/pages/comparatifs.ts';
import { modeInscription } from '../../server/fonctions.ts';
import { ORIGINE_PUBLIQUE } from '../../lib/types.ts';

/* hopla.page/comparatif/<outil> : Hopla face à un outil du marché (26 octobre 2026, demandé par Lilian). */
export const Route = createFileRoute('/comparatif/$outil')({
  loader: async ({ params }) => {
    if (!comparatif(params.outil)) throw notFound();
    return modeInscription();
  },
  head: ({ params }) => {
    const c = comparatif(params.outil);
    if (!c) return { meta: [{ title: 'Hopla' }] };
    const titre = `Hopla vs ${c.nom} : le comparatif · Hopla`;
    const url = `${ORIGINE_PUBLIQUE}/comparatif/${c.slug}`;
    return {
      meta: [
        { title: titre },
        { name: 'description', content: c.resume },
        { name: 'robots', content: 'index, follow, max-image-preview:large' },
        { name: 'theme-color', content: '#ffffff' },
        { property: 'og:type', content: 'article' },
        { property: 'og:site_name', content: 'Hopla' },
        { property: 'og:url', content: url },
        { property: 'og:title', content: titre },
        { property: 'og:description', content: c.resume },
        { property: 'og:locale', content: 'fr_FR' },
        { property: 'og:image', content: `${ORIGINE_PUBLIQUE}/og.png` },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      links: [{ rel: 'canonical', href: url }],
      scripts: [{
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'BreadcrumbList', itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Hopla', item: `${ORIGINE_PUBLIQUE}/` },
                { '@type': 'ListItem', position: 2, name: 'Comparatifs', item: `${ORIGINE_PUBLIQUE}/comparatif` },
                { '@type': 'ListItem', position: 3, name: `Hopla vs ${c.nom}`, item: url },
              ],
            },
            { '@type': 'FAQPage', inLanguage: 'fr-FR', mainEntity: c.questions.map(([q, r]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: r } })) },
          ],
        }).replace(/</g, '\\u003c'),
      }],
    };
  },
  component: Page,
});

function Page() {
  const { outil } = Route.useParams();
  const mode = Route.useLoaderData() ?? 'libre';
  const c = comparatif(outil);
  return c ? <PageComparatif key={c.slug} c={c} mode={mode} /> : null;
}
