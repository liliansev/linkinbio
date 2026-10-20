import { createFileRoute } from '@tanstack/react-router';
import { Accueil } from '../accueil/Accueil.tsx';
import type { ApiAccueil } from '../accueil/Reserver.tsx';
import { reserverNom, verifierNom } from '../server/fonctions.ts';
import { TARIFS } from '../lib/abonnement.ts';

/*
 * hopla.page : l'accueil du service, qui présente Hopla et prend les
 * réservations de nom (la liste d'attente, voir `server/attente.ts`). Chaque
 * page vit sur /<pseudo> ; celle de Lilian sert d'exemple.
 */

const DESCRIPTION = 'Ta page de liens sur hopla.page/ton-nom : elle se réorganise selon le réseau et l’heure, ouvre tes liens dans leurs apps et se modifie depuis ton téléphone. Gratuit, toutes les fonctions comprises.';

const DONNEES = {
  '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Hopla', url: 'https://hopla.page/', applicationCategory: 'BusinessApplication', operatingSystem: 'Web',
  inLanguage: 'fr', description: DESCRIPTION,
  offers: [
    { '@type': 'Offer', name: 'Gratuit', price: '0', priceCurrency: 'EUR' },
    { '@type': 'Offer', name: 'Pro', price: String(TARIFS.mois.prix), priceCurrency: 'EUR' },
  ],
};

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Hopla · la page de liens qui s’adapte à chaque visiteur' },
      { name: 'description', content: DESCRIPTION },
      { name: 'theme-color', content: '#ffffff' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://hopla.page/' },
      { property: 'og:title', content: 'Hopla · la page de liens qui s’adapte à chaque visiteur' },
      { property: 'og:description', content: DESCRIPTION },
      { property: 'og:locale', content: 'fr_FR' },
    ],
    links: [{ rel: 'canonical', href: 'https://hopla.page/' }],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(DONNEES).replace(/</g, '\\u003c') }],
  }),
  component: Page,
});

const api: ApiAccueil = {
  verifier: nom => verifierNom({ data: nom }),
  reserver: (nom, email) => reserverNom({ data: { nom, email } }),
};

function Page() {
  return <Accueil api={api} />;
}
