import { createFileRoute } from '@tanstack/react-router';
import { lirePagePublique } from '../server/fonctions.ts';
import { PageLiens } from '../components/PageLiens.tsx';
import { themeParId } from '../lib/themes.ts';

const URL_PAGE = 'https://liliansevoumian.fr/liens/';
const absolue = (chemin: string) => (chemin.startsWith('/') ? `https://liliansevoumian.fr${chemin}` : chemin);

export const Route = createFileRoute('/')({
  loader: () => lirePagePublique(),
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { reglages, blocs } = loaderData;
    const titre = reglages.seo.titre || reglages.profil.nom;
    const description = reglages.seo.description || reglages.profil.bio;
    const image = reglages.profil.avatar ? absolue(reglages.profil.avatar) : undefined;
    // Seuls les liens « visibles par Google » entrent dans les données structurées.
    const personne = {
      '@context': 'https://schema.org', '@type': 'ProfilePage', url: URL_PAGE, name: titre,
      mainEntity: {
        '@type': 'Person', name: reglages.profil.nom, description: reglages.profil.bio, image, url: 'https://liliansevoumian.fr',
        sameAs: [...reglages.reseaux.filter(r => r.url.startsWith('http')).map(r => r.url), ...blocs.filter(b => b.type === 'lien' && b.indexable && b.url.startsWith('http')).map(b => b.url)],
      },
    };
    return {
      meta: [
        { title: titre },
        { name: 'description', content: description },
        { name: 'robots', content: reglages.seo.indexable ? 'index, follow' : 'noindex, nofollow' },
        { name: 'theme-color', content: themeParId(reglages.theme).fondUni },
        { property: 'og:type', content: 'profile' },
        { property: 'og:title', content: titre },
        { property: 'og:description', content: description },
        { property: 'og:url', content: URL_PAGE },
        ...(image ? [{ property: 'og:image', content: image }] : []),
        { name: 'twitter:card', content: 'summary' },
      ],
      links: [{ rel: 'canonical', href: URL_PAGE }],
      scripts: [
        ...(reglages.seo.indexable ? [{ type: 'application/ld+json', children: JSON.stringify(personne) }] : []),
        // DataFast, comme sur le reste du site : visites, provenance et goals `liens_*`.
        // Le back office ne charge pas ce script.
        { children: 'window.datafast=window.datafast||function(){(window.datafast.q=window.datafast.q||[]).push(arguments)};' },
        { defer: true, src: '/js/script.js', 'data-website-id': 'dfid_Mq8wt9KvIisuofpYWZouo', 'data-domain': 'liliansevoumian.fr', 'data-api-url': '/api/dfst-events' },
      ],
    };
  },
  component: Page,
});

function Page() {
  return <PageLiens page={Route.useLoaderData()} />;
}
