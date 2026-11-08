import { createFileRoute } from '@tanstack/react-router';
import { IndexFonctions } from '../../accueil/pages/PageFonction.tsx';
import { teteIndexFonctions } from '../../accueil/pages/tetes.ts';
import { modeInscription } from '../../server/fonctions.ts';

/* hopla.page/fonctionnalites : toutes les fonctions de Hopla, une ligne chacune, en français. */
export const Route = createFileRoute('/fonctionnalites/')({
  loader: () => modeInscription(),
  head: () => teteIndexFonctions('fr'),
  component: Page,
});

function Page() {
  const mode = Route.useLoaderData() ?? 'libre';
  return <IndexFonctions mode={mode} langue="fr" />;
}
