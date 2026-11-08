import { createFileRoute } from '@tanstack/react-router';
import { Accueil } from '../../accueil/Accueil.tsx';
import { APIS } from '../../accueil/api.ts';
import { teteAccueil } from '../../accueil/tete.ts';
import { modeInscription } from '../../server/fonctions.ts';

/*
 * hopla.page/fr : l'accueil en français (8 novembre 2026). Le même que /, dans l'autre langue ; une page créée d'ici
 * est en français. Un pseudo a au moins trois caractères : /fr ne cache la page de personne.
 */

export const Route = createFileRoute('/fr/')({
  loader: () => modeInscription(),
  head: ({ loaderData }) => teteAccueil('fr', loaderData ?? 'libre'),
  component: Page,
});

function Page() {
  const mode = Route.useLoaderData() ?? 'libre';
  return <Accueil api={APIS[mode].fr} mode={mode} langue="fr" />;
}
