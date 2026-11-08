import { createFileRoute, notFound } from '@tanstack/react-router';
import { PageComparatif } from '../../accueil/pages/PageComparatif.tsx';
import { comparatif } from '../../accueil/pages/comparatifs.ts';
import { teteComparatif } from '../../accueil/pages/tetes.ts';
import { modeInscription } from '../../server/fonctions.ts';

/* hopla.page/comparatif/<outil> : Hopla face à un outil du marché (26 octobre 2026, demandé par Lilian), en français. */
export const Route = createFileRoute('/comparatif/$outil')({
  loader: async ({ params }) => {
    if (!comparatif(params.outil, 'fr')) throw notFound();
    return modeInscription();
  },
  head: ({ params }) => {
    const c = comparatif(params.outil, 'fr');
    return c ? teteComparatif(c, 'fr') : { meta: [{ title: 'Hopla' }] };
  },
  component: Page,
});

function Page() {
  const { outil } = Route.useParams();
  const mode = Route.useLoaderData() ?? 'libre';
  const c = comparatif(outil, 'fr');
  return c ? <PageComparatif key={c.slug} c={c} mode={mode} langue="fr" /> : null;
}
