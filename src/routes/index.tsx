import { createFileRoute } from '@tanstack/react-router';
import { avecJeton, preparerTurnstile } from '../lib/turnstile.ts';
import { Accueil } from '../accueil/Accueil.tsx';
import type { ApiAccueil } from '../accueil/Reserver.tsx';
import { DESCRIPTION, FONCTIONS, questions } from '../accueil/textes.ts';
import type { Inscription } from '../accueil/textes.ts';
import { corrigerAdresse, modeInscription, renommerPage, renvoyerLien, reserverNom, verifierNom } from '../server/fonctions.ts';
import { OFFRES, PERIODES, PLANS_PAYANTS } from '../lib/abonnement.ts';
import { ORIGINE_PUBLIQUE, SITE_LILIAN } from '../lib/types.ts';

/*
 * hopla.page : l'accueil du service, qui présente Hopla et prend les noms
 * (inscription directe ou liste d'attente, voir `server/attente.ts`). Chaque
 * page vit sur /<pseudo> ; celle de Lilian sert d'exemple.
 *
 * Le <head> est écrit pour les moteurs de recherche et pour les IA qui
 * répondent à la place d'une recherche : un titre et une description nets,
 * une image de partage, et des données structurées qui disent ce qu'est
 * Hopla, ce qu'il fait, ce qu'il coûte, et les questions de la page.
 */

const TITRE = 'Hopla · la page de liens qui s’adapte à chaque visiteur';
/** Pour les résultats de recherche : moins de 160 caractères. */
const RESUME = 'Ta page de liens pour ta bio Instagram, TikTok ou YouTube. Elle se réorganise selon le réseau et l’heure et ouvre tes liens dans leurs apps. Gratuit.';
const URL = `${ORIGINE_PUBLIQUE}/`;
const IMAGE = `${ORIGINE_PUBLIQUE}/og.png`;

const donnees = (mode: Inscription) => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization', '@id': `${URL}#organisation`, name: 'Hopla', url: URL,
      logo: { '@type': 'ImageObject', url: `${ORIGINE_PUBLIQUE}/icon-512.png`, width: 512, height: 512 },
      founder: { '@type': 'Person', name: 'Lilian Sevoumian', url: SITE_LILIAN },
    },
    { '@type': 'WebSite', '@id': `${URL}#site`, url: URL, name: 'Hopla', inLanguage: 'fr-FR', publisher: { '@id': `${URL}#organisation` } },
    {
      '@type': 'WebPage', '@id': `${URL}#page`, url: URL, name: TITRE, description: RESUME, inLanguage: 'fr-FR',
      isPartOf: { '@id': `${URL}#site` }, about: { '@id': `${URL}#application` }, primaryImageOfPage: { '@type': 'ImageObject', url: IMAGE, width: 1200, height: 630 },
    },
    {
      '@type': 'SoftwareApplication', '@id': `${URL}#application`, name: 'Hopla', url: URL, image: IMAGE,
      applicationCategory: 'BusinessApplication', applicationSubCategory: 'Page de liens pour la bio des réseaux sociaux', operatingSystem: 'Web, iOS, Android',
      inLanguage: 'fr', description: DESCRIPTION, featureList: FONCTIONS, publisher: { '@id': `${URL}#organisation` },
      offers: [
        { '@type': 'Offer', name: 'Gratuit', price: '0', priceCurrency: 'EUR', description: OFFRES.gratuit.phrase },
        // Les offres en vente, au mois et à l'an ; Premium attend son nom de domaine.
        ...PLANS_PAYANTS.filter(p => OFFRES[p].enVente).flatMap(p => PERIODES.map(periode => ({
          '@type': 'Offer', name: `${OFFRES[p].nom}, par ${periode}`, price: String(OFFRES[p].prix[periode]), priceCurrency: 'EUR', description: OFFRES[p].phrase,
        }))),
      ],
    },
    {
      '@type': 'FAQPage', '@id': `${URL}#questions`, inLanguage: 'fr-FR',
      mainEntity: questions(mode).map(([q, r]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: r } })),
    },
  ],
});

export const Route = createFileRoute('/')({
  loader: () => modeInscription(),
  head: ({ loaderData }) => ({
    meta: [
      { title: TITRE },
      { name: 'description', content: RESUME },
      { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1' },
      { name: 'theme-color', content: '#ffffff' },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Hopla' },
      { property: 'og:url', content: URL },
      { property: 'og:title', content: TITRE },
      { property: 'og:description', content: RESUME },
      { property: 'og:locale', content: 'fr_FR' },
      { property: 'og:image', content: IMAGE },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: 'Hopla, la page de liens qui s’adapte à chaque visiteur : trois pages Hopla sur des téléphones.' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: TITRE },
      { name: 'twitter:description', content: RESUME },
      { name: 'twitter:image', content: IMAGE },
    ],
    links: [{ rel: 'canonical', href: URL }],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(donnees(loaderData ?? 'libre')).replace(/</g, '\\u003c') }],
  }),
  component: Page,
});

// Chaque envoi part avec son jeton anti-robot (lib/turnstile.ts), préparé dès qu'on tape un nom.
const api = (mode: Inscription): ApiAccueil => ({
  verifier: nom => { preparerTurnstile('accueil'); return verifierNom({ data: nom }); },
  reserver: (nom, email) => avecJeton('accueil', jeton => reserverNom({ data: { nom, email, jeton } })),
  // Une page pas encore ouverte reçoit de nouveau sa bienvenue (sinon un lien de connexion). En liste d'attente, la réservation se rappelle.
  renvoyer: (nom, email) => avecJeton('accueil', jeton => (mode === 'libre' ? renvoyerLien({ data: { nom, email, jeton } }) : reserverNom({ data: { nom, email, jeton } }))),
  corriger: (nom, ancienne, nouvelle) => avecJeton('accueil', jeton => corrigerAdresse({ data: { nom, ancienne, nouvelle, jeton } })),
  renommer: (ancien, nouveau, email) => avecJeton('accueil', jeton => renommerPage({ data: { ancien, nouveau, email, jeton } })),
});
const API = { libre: api('libre'), attente: api('attente') };

function Page() {
  const mode = Route.useLoaderData() ?? 'libre';
  return <Accueil api={API[mode]} mode={mode} />;
}
