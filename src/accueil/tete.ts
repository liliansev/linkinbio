import { DESCRIPTION, FONCTIONS, questions } from './textes.ts';
import type { Inscription } from './textes.ts';
import { OFFRES, OFFRES_EN, PERIODES, PLANS_PAYANTS, nomOffre } from '../lib/abonnement.ts';
import { ORIGINE_PUBLIQUE, SITE_LILIAN } from '../lib/types.ts';
import type { Langue } from '../lib/types.ts';

/*
 * Le <head> de l'accueil, en anglais sur / et en français sur /fr (8 novembre 2026, Hopla anglais d'abord) : écrit
 * pour les moteurs de recherche et pour les IA qui répondent à la place d'une recherche. Un titre et une description
 * nets, une image de partage, les deux adresses liées par `hreflang`, et des données structurées qui disent ce qu'est
 * Hopla, ce qu'il fait, ce qu'il coûte, et les questions de la page.
 */

export const URL_ACCUEIL: Record<Langue, string> = { en: `${ORIGINE_PUBLIQUE}/`, fr: `${ORIGINE_PUBLIQUE}/fr` };
const IMAGE = `${ORIGINE_PUBLIQUE}/og.png`;

const MOTS = {
  en: {
    titre: 'Hopla · the link in bio page that adapts to every visitor',
    /** Pour les résultats de recherche : moins de 160 caractères. */
    resume: 'Your link in bio page for Instagram, TikTok or YouTube. It reorders itself by network and time of day and opens your links in their apps. Free.',
    alt: 'Hopla, the link in bio page that adapts to every visitor: three Hopla pages on phones.',
    categorie: 'Link in bio page for social media profiles', parAn: 'per year', parMois: 'per month',
    locale: 'en_US', autre: 'fr_FR', html: 'en-US',
  },
  fr: {
    titre: 'Hopla · la page de liens qui s’adapte à chaque visiteur',
    resume: 'Ta page de liens pour ta bio Instagram, TikTok ou YouTube. Elle se réorganise selon le réseau et l’heure et ouvre tes liens dans leurs apps. Gratuit.',
    alt: 'Hopla, la page de liens qui s’adapte à chaque visiteur : trois pages Hopla sur des téléphones.',
    categorie: 'Page de liens pour la bio des réseaux sociaux', parAn: 'par an', parMois: 'par mois',
    locale: 'fr_FR', autre: 'en_US', html: 'fr-FR',
  },
};

const donnees = (langue: Langue, mode: Inscription) => {
  const m = MOTS[langue], url = URL_ACCUEIL[langue], racine = URL_ACCUEIL.en;
  const phrase = (p: keyof typeof OFFRES) => (langue === 'en' ? OFFRES_EN[p].phrase : OFFRES[p].phrase);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization', '@id': `${racine}#organisation`, name: 'Hopla', url: racine,
        logo: { '@type': 'ImageObject', url: `${ORIGINE_PUBLIQUE}/icon-512.png`, width: 512, height: 512 },
        founder: { '@type': 'Person', name: 'Lilian Sevoumian', url: SITE_LILIAN },
      },
      { '@type': 'WebSite', '@id': `${racine}#site`, url: racine, name: 'Hopla', inLanguage: ['en-US', 'fr-FR'], publisher: { '@id': `${racine}#organisation` } },
      {
        '@type': 'WebPage', '@id': `${url}#page`, url, name: m.titre, description: m.resume, inLanguage: m.html,
        isPartOf: { '@id': `${racine}#site` }, about: { '@id': `${racine}#application` }, primaryImageOfPage: { '@type': 'ImageObject', url: IMAGE, width: 1200, height: 630 },
      },
      {
        '@type': 'SoftwareApplication', '@id': `${racine}#application`, name: 'Hopla', url: racine, image: IMAGE,
        applicationCategory: 'BusinessApplication', applicationSubCategory: m.categorie, operatingSystem: 'Web, iOS, Android',
        inLanguage: m.html, description: DESCRIPTION[langue], featureList: FONCTIONS[langue], publisher: { '@id': `${racine}#organisation` },
        offers: [
          { '@type': 'Offer', name: nomOffre('gratuit', langue), price: '0', priceCurrency: langue === 'en' ? 'USD' : 'EUR', description: phrase('gratuit') },
          // Les offres en vente, au mois et à l'an ; Premium attend son nom de domaine.
          ...PLANS_PAYANTS.filter(p => OFFRES[p].enVente).flatMap(p => PERIODES.map(periode => ({
            '@type': 'Offer', name: `${nomOffre(p, langue)}, ${periode === 'an' ? m.parAn : m.parMois}`, price: String(OFFRES[p].prix[periode]), priceCurrency: langue === 'en' ? 'USD' : 'EUR', description: phrase(p),
          }))),
        ],
      },
      {
        '@type': 'FAQPage', '@id': `${url}#questions`, inLanguage: m.html,
        mainEntity: questions(mode, langue).map(([q, r]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: r } })),
      },
    ],
  };
};

export function teteAccueil(langue: Langue, mode: Inscription) {
  const m = MOTS[langue], url = URL_ACCUEIL[langue];
  return {
    meta: [
      { title: m.titre },
      { name: 'description', content: m.resume },
      { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1' },
      { name: 'theme-color', content: '#ffffff' },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Hopla' },
      { property: 'og:url', content: url },
      { property: 'og:title', content: m.titre },
      { property: 'og:description', content: m.resume },
      { property: 'og:locale', content: m.locale },
      { property: 'og:locale:alternate', content: m.autre },
      { property: 'og:image', content: IMAGE },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: m.alt },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: m.titre },
      { name: 'twitter:description', content: m.resume },
      { name: 'twitter:image', content: IMAGE },
    ],
    links: [
      { rel: 'canonical', href: url },
      { rel: 'alternate', hrefLang: 'en', href: URL_ACCUEIL.en },
      { rel: 'alternate', hrefLang: 'fr', href: URL_ACCUEIL.fr },
      { rel: 'alternate', hrefLang: 'x-default', href: URL_ACCUEIL.en },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(donnees(langue, mode)).replace(/</g, '\\u003c') }],
  };
}
