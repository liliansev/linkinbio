import { createFileRoute } from '@tanstack/react-router';
import { IndexComparatifs } from '../../accueil/pages/PageComparatif.tsx';
import { teteIndexComparatifs } from '../../accueil/pages/tetes.ts';
import { modeInscription } from '../../server/fonctions.ts';

/* hopla.page/comparatif : Hopla face à chaque outil, en français. */
export const Route = createFileRoute('/comparatif/')({
  loader: () => modeInscription(),
  head: () => teteIndexComparatifs('fr'),
  component: Page,
});

function Page() {
  const mode = Route.useLoaderData() ?? 'libre';
  return <IndexComparatifs mode={mode} langue="fr" />;
}
