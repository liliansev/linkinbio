import { createFileRoute } from '@tanstack/react-router';
import { IndexComparatifs } from '../../accueil/pages/PageComparatif.tsx';
import { teteIndexComparatifs } from '../../accueil/pages/tetes.ts';
import { modeInscription } from '../../server/fonctions.ts';

/* hopla.page/compare : Hopla face à chaque outil, en anglais. */
export const Route = createFileRoute('/compare/')({
  loader: () => modeInscription(),
  head: () => teteIndexComparatifs('en'),
  component: Page,
});

function Page() {
  const mode = Route.useLoaderData() ?? 'libre';
  return <IndexComparatifs mode={mode} langue="en" />;
}
