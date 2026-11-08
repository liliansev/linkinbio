import { createFileRoute, notFound } from '@tanstack/react-router';
import { PageComparatif } from '../../accueil/pages/PageComparatif.tsx';
import { comparatif } from '../../accueil/pages/comparatifs.ts';
import { teteComparatif } from '../../accueil/pages/tetes.ts';
import { modeInscription } from '../../server/fonctions.ts';

/* hopla.page/compare/<outil> : Hopla face à un outil du marché (26 octobre 2026, demandé par Lilian), en anglais. */
export const Route = createFileRoute('/compare/$outil')({
  loader: async ({ params }) => {
    if (!comparatif(params.outil, 'en')) throw notFound();
    return modeInscription();
  },
  head: ({ params }) => {
    const c = comparatif(params.outil, 'en');
    return c ? teteComparatif(c, 'en') : { meta: [{ title: 'Hopla' }] };
  },
  component: Page,
});

function Page() {
  const { outil } = Route.useParams();
  const mode = Route.useLoaderData() ?? 'libre';
  const c = comparatif(outil, 'en');
  return c ? <PageComparatif key={c.slug} c={c} mode={mode} langue="en" /> : null;
}
