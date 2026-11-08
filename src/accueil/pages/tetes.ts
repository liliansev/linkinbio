import { ORIGINE_PUBLIQUE } from '../../lib/types.ts';
import type { Langue } from '../../lib/types.ts';
import { URL_ACCUEIL } from '../tete.ts';
import { CHEMIN_FONCTIONS, pageParId } from './fonctions.ts';
import type { PageFonction } from './fonctions.ts';
import { CHEMIN_COMPARATIFS } from './comparatifs.ts';
import type { Comparatif } from './comparatifs.ts';

/*
 * Le <head> des pages des fonctions et des comparatifs, dans les deux langues (8 novembre 2026, Hopla
 * anglais d'abord) : l'anglais sous /features et /compare, le français sous /fonctionnalites et /comparatif,
 * les deux adresses liées par `hreflang`, l'anglais par défaut.
 */

const IMAGE = `${ORIGINE_PUBLIQUE}/og.png`;
const LOCALE: Record<Langue, [string, string, string]> = { en: ['en_US', 'fr_FR', 'en-US'], fr: ['fr_FR', 'en_US', 'fr-FR'] };

/** Les adresses d'une page dans les deux langues. */
type Adresses = Record<Langue, string>;

const liens = (langue: Langue, a: Adresses) => [
  { rel: 'canonical', href: a[langue] },
  { rel: 'alternate', hrefLang: 'en', href: a.en },
  { rel: 'alternate', hrefLang: 'fr', href: a.fr },
  { rel: 'alternate', hrefLang: 'x-default', href: a.en },
];

function tete(langue: Langue, a: Adresses, titre: string, resume: string, type: 'website' | 'article', graphe?: object[]) {
  const [locale, autre] = LOCALE[langue];
  return {
    meta: [
      { title: titre },
      { name: 'description', content: resume },
      { name: 'robots', content: 'index, follow, max-image-preview:large' },
      { name: 'theme-color', content: '#ffffff' },
      { property: 'og:type', content: type },
      { property: 'og:site_name', content: 'Hopla' },
      { property: 'og:url', content: a[langue] },
      { property: 'og:title', content: titre },
      { property: 'og:description', content: resume },
      { property: 'og:locale', content: locale },
      { property: 'og:locale:alternate', content: autre },
      { property: 'og:image', content: IMAGE },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: liens(langue, a),
    scripts: graphe ? [{
      type: 'application/ld+json',
      children: JSON.stringify({ '@context': 'https://schema.org', '@graph': graphe }).replace(/</g, '\\u003c'),
    }] : [],
  };
}

const fil = (elements: [string, string][]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: elements.map(([name, item], k) => ({ '@type': 'ListItem', position: k + 1, name, item })),
});
const faq = (langue: Langue, questions: [string, string][]) => ({
  '@type': 'FAQPage', inLanguage: LOCALE[langue][2],
  mainEntity: questions.map(([q, r]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: r } })),
});

const INDEX_FONCTIONS = {
  en: ['Hopla features · a link in bio page that adapts', 'Everything Hopla does, feature by feature: the page by network and time of day, links that open in their app, the storefront, analytics.'],
  fr: ['Les fonctionnalités de Hopla · page de liens pour ta bio', 'Tout ce que fait Hopla, fonctionnalité par fonctionnalité : la page selon le réseau et l’heure, les liens ouverts dans leur app, la vitrine, les stats.'],
} as const;

const INDEX_COMPARATIFS = {
  en: ['Hopla vs Linktree, Beacons, Stan and the others', 'Hopla compared with the link in bio tools on the market: Linktree, Beacons, Stan, Lnk.Bio, Taplink, Later. Prices, commissions and features, tool by tool.'],
  fr: ['Hopla face à Linktree, Beacons, Stan et les autres', 'Hopla comparé aux pages de liens du marché : Linktree, Beacons, Stan, Lnk.Bio, Taplink, Later. Prix, commissions et fonctions, outil par outil.'],
} as const;

const adressesIndex = (chemins: Record<Langue, string>): Adresses => ({ en: `${ORIGINE_PUBLIQUE}${chemins.en}`, fr: `${ORIGINE_PUBLIQUE}${chemins.fr}` });

export const teteIndexFonctions = (langue: Langue) => tete(langue, adressesIndex(CHEMIN_FONCTIONS), INDEX_FONCTIONS[langue][0], INDEX_FONCTIONS[langue][1], 'website');
export const teteIndexComparatifs = (langue: Langue) => tete(langue, adressesIndex(CHEMIN_COMPARATIFS), INDEX_COMPARATIFS[langue][0], INDEX_COMPARATIFS[langue][1], 'website');

export function teteFonction(page: PageFonction, langue: Langue) {
  const a: Adresses = {
    en: `${ORIGINE_PUBLIQUE}${CHEMIN_FONCTIONS.en}/${pageParId(page.id, 'en')?.slug}`,
    fr: `${ORIGINE_PUBLIQUE}${CHEMIN_FONCTIONS.fr}/${pageParId(page.id, 'fr')?.slug}`,
  };
  return tete(langue, a, `${page.nom} · Hopla`, page.resume, 'website', [
    fil([['Hopla', URL_ACCUEIL[langue]], [langue === 'en' ? 'Features' : 'Fonctionnalités', adressesIndex(CHEMIN_FONCTIONS)[langue]], [page.nom, a[langue]]]),
    faq(langue, page.questions),
  ]);
}

export function teteComparatif(c: Comparatif, langue: Langue) {
  const a: Adresses = { en: `${ORIGINE_PUBLIQUE}${CHEMIN_COMPARATIFS.en}/${c.slug}`, fr: `${ORIGINE_PUBLIQUE}${CHEMIN_COMPARATIFS.fr}/${c.slug}` };
  const titre = langue === 'en' ? `Hopla vs ${c.nom}: the comparison · Hopla` : `Hopla vs ${c.nom} : le comparatif · Hopla`;
  return tete(langue, a, titre, c.resume, 'article', [
    fil([['Hopla', URL_ACCUEIL[langue]], [langue === 'en' ? 'Comparisons' : 'Comparatifs', adressesIndex(CHEMIN_COMPARATIFS)[langue]], [`Hopla vs ${c.nom}`, a[langue]]]),
    faq(langue, c.questions),
  ]);
}
