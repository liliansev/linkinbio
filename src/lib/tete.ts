import type { PagePublique } from './types.ts';
import { ORIGINE_PUBLIQUE, urlPage } from './types.ts';
import { themeParId } from './themes.ts';

/*
 * Le <head> d'une page publique. La page de Lilian garde ses données
 * structurées et DataFast ; les pages des autres comptes restent hors de Google
 * pendant la bêta (elles vivent sous le domaine de Lilian) et ne chargent aucun
 * suivi tiers.
 */

const absolue = (chemin: string) => (chemin.startsWith('/') ? `${ORIGINE_PUBLIQUE}${chemin}` : chemin);

export function tetePage(page: PagePublique | null | undefined) {
  if (!page) return {};
  const { reglages, blocs, compte } = page;
  const url = urlPage(compte);
  const titre = reglages.seo.titre || reglages.profil.nom;
  const description = reglages.seo.description || reglages.profil.bio;
  const image = reglages.profil.avatar ? absolue(reglages.profil.avatar) : undefined;
  const indexable = compte.principal && reglages.seo.indexable;
  // Seuls les liens « visibles par Google » entrent dans les données structurées.
  const personne = {
    '@context': 'https://schema.org', '@type': 'ProfilePage', url, name: titre,
    mainEntity: {
      '@type': 'Person', name: reglages.profil.nom, description: reglages.profil.bio, image, url: ORIGINE_PUBLIQUE,
      sameAs: [...reglages.reseaux.filter(r => r.url.startsWith('http')).map(r => r.url), ...blocs.filter(b => b.type === 'lien' && b.indexable && b.url.startsWith('http')).map(b => b.url)],
    },
  };
  return {
    meta: [
      { title: titre },
      { name: 'description', content: description },
      { name: 'robots', content: indexable ? 'index, follow' : 'noindex, nofollow' },
      { name: 'theme-color', content: themeParId(reglages.theme).fondUni },
      { property: 'og:type', content: 'profile' },
      { property: 'og:title', content: titre },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
      ...(image ? [{ property: 'og:image', content: image }] : []),
      { name: 'twitter:card', content: 'summary' },
    ],
    links: [{ rel: 'canonical', href: url }],
    scripts: compte.principal ? [
      ...(indexable ? [{ type: 'application/ld+json', children: JSON.stringify(personne).replace(/</g, '\\u003c') }] : []),
      // DataFast, comme sur le reste du site : visites, provenance et goals `liens_*`.
      // Le back office ne charge pas ce script.
      { children: 'window.datafast=window.datafast||function(){(window.datafast.q=window.datafast.q||[]).push(arguments)};' },
      { defer: true, src: '/js/script.js', 'data-website-id': 'dfid_Mq8wt9KvIisuofpYWZouo', 'data-domain': 'liliansevoumian.fr', 'data-api-url': '/api/dfst-events' },
    ] : [],
  };
}
