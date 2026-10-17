import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { lirePagePublique } from '../server/fonctions.ts';
import { PageLiens } from '../components/PageLiens.tsx';
import { tetePage } from '../lib/tete.ts';

/* La page d'un autre compte, sur /liens/<pseudo>. Celle de Lilian reste sur /liens/. */
export const Route = createFileRoute('/$pseudo')({
  loader: async ({ params }) => {
    if (!/^[a-z0-9-]{3,30}$/i.test(params.pseudo)) throw notFound();
    const page = await lirePagePublique({ data: params.pseudo });
    if (!page) throw notFound();
    if (page.compte.principal) throw redirect({ to: '/' });
    return page;
  },
  head: ({ loaderData }) => tetePage(loaderData),
  component: Page,
});

function Page() {
  return <PageLiens page={Route.useLoaderData()} />;
}
