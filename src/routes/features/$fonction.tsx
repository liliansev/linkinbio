import { createFileRoute, notFound } from '@tanstack/react-router';
import { PageFonction } from '../../accueil/pages/PageFonction.tsx';
import { pageFonction } from '../../accueil/pages/fonctions.ts';
import { teteFonction } from '../../accueil/pages/tetes.ts';
import { modeInscription } from '../../server/fonctions.ts';

/*
 * hopla.page/features/<fonction> : une fonction de Hopla, sa scène jouée en défilant (26 octobre 2026,
 * demandé par Lilian), en anglais ; le français sous /fonctionnalites
 * (8 novembre 2026). Les mots vivent dans `accueil/pages/fonctions.ts`.
 */
export const Route = createFileRoute('/features/$fonction')({
  loader: async ({ params }) => {
    if (!pageFonction(params.fonction, 'en')) throw notFound();
    return modeInscription();
  },
  head: ({ params }) => {
    const page = pageFonction(params.fonction, 'en');
    return page ? teteFonction(page, 'en') : { meta: [{ title: 'Hopla' }] };
  },
  component: Page,
});

function Page() {
  const { fonction } = Route.useParams();
  const mode = Route.useLoaderData() ?? 'libre';
  const page = pageFonction(fonction, 'en');
  return page ? <PageFonction key={page.slug} page={page} mode={mode} langue="en" /> : null;
}
