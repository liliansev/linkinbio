import { createFileRoute } from '@tanstack/react-router';
import { IndexFonctions } from '../../accueil/pages/PageFonction.tsx';
import { teteIndexFonctions } from '../../accueil/pages/tetes.ts';
import { modeInscription } from '../../server/fonctions.ts';

/* hopla.page/features : toutes les fonctions de Hopla, une ligne chacune, en anglais. */
export const Route = createFileRoute('/features/')({
  loader: () => modeInscription(),
  head: () => teteIndexFonctions('en'),
  component: Page,
});

function Page() {
  const mode = Route.useLoaderData() ?? 'libre';
  return <IndexFonctions mode={mode} langue="en" />;
}
