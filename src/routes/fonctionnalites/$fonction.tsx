import { createFileRoute, notFound } from '@tanstack/react-router';
import { PageFonction } from '../../accueil/pages/PageFonction.tsx';
import { pageFonction } from '../../accueil/pages/fonctions.ts';
import { teteFonction } from '../../accueil/pages/tetes.ts';
import { modeInscription } from '../../server/fonctions.ts';

/*
 * hopla.page/fonctionnalites/<fonction> : une fonction de Hopla, sa scène jouée en défilant (26 octobre 2026,
 * demandé par Lilian), en français ; l’anglais sous /features
 * (8 novembre 2026). Les mots vivent dans `accueil/pages/fonctions.ts`.
 */
export const Route = createFileRoute('/fonctionnalites/$fonction')({
  loader: async ({ params }) => {
    if (!pageFonction(params.fonction, 'fr')) throw notFound();
    return modeInscription();
  },
  head: ({ params }) => {
    const page = pageFonction(params.fonction, 'fr');
    return page ? teteFonction(page, 'fr') : { meta: [{ title: 'Hopla' }] };
  },
  component: Page,
});

function Page() {
  const { fonction } = Route.useParams();
  const mode = Route.useLoaderData() ?? 'libre';
  const page = pageFonction(fonction, 'fr');
  return page ? <PageFonction key={page.slug} page={page} mode={mode} langue="fr" /> : null;
}
