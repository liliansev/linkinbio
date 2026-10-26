import { createFileRoute, notFound } from '@tanstack/react-router';
import { PageFonction } from '../../accueil/pages/PageFonction.tsx';
import { pageFonction } from '../../accueil/pages/fonctions.ts';
import { modeInscription } from '../../server/fonctions.ts';
import { ORIGINE_PUBLIQUE } from '../../lib/types.ts';

/*
 * hopla.page/fonctions/<fonction> : une fonction de Hopla, sa scène jouée en
 * défilant (26 octobre 2026, demandé par Lilian). Les mots vivent dans
 * `accueil/pages/fonctions.ts`.
 */
export const Route = createFileRoute('/fonctions/$fonction')({
  loader: async ({ params }) => {
    if (!pageFonction(params.fonction)) throw notFound();
    return modeInscription();
  },
  head: ({ params }) => {
    const page = pageFonction(params.fonction);
    if (!page) return { meta: [{ title: 'Hopla' }] };
    const titre = `${page.nom} · Hopla`;
    const url = `${ORIGINE_PUBLIQUE}/fonctions/${page.slug}`;
    const image = `${ORIGINE_PUBLIQUE}/og.png`;
    return {
      meta: [
        { title: titre },
        { name: 'description', content: page.resume },
        { name: 'robots', content: 'index, follow, max-image-preview:large' },
        { name: 'theme-color', content: '#ffffff' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Hopla' },
        { property: 'og:url', content: url },
        { property: 'og:title', content: titre },
        { property: 'og:description', content: page.resume },
        { property: 'og:locale', content: 'fr_FR' },
        { property: 'og:image', content: image },
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
                { '@type': 'ListItem', position: 2, name: 'Fonctions', item: `${ORIGINE_PUBLIQUE}/fonctions` },
                { '@type': 'ListItem', position: 3, name: page.nom, item: url },
              ],
            },
            { '@type': 'FAQPage', inLanguage: 'fr-FR', mainEntity: page.questions.map(([q, r]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: r } })) },
          ],
        }).replace(/</g, '\\u003c'),
      }],
    };
  },
  component: Page,
});

function Page() {
  const { fonction } = Route.useParams();
  const mode = Route.useLoaderData() ?? 'libre';
  const page = pageFonction(fonction);
  return page ? <PageFonction key={page.slug} page={page} mode={mode} /> : null;
}
