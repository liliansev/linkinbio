import { createFileRoute, notFound } from '@tanstack/react-router';
import { lirePagePublique } from '../server/fonctions.ts';
import { PageLiens } from '../components/PageLiens.tsx';
import { tetePage } from '../lib/tete.ts';

/* Une page, sur hopla.page/<pseudo>. Celle de Lilian est /lilian. */
export const Route = createFileRoute('/$pseudo')({
  loader: async ({ params }) => {
    if (!/^[a-z0-9-]{3,30}$/i.test(params.pseudo)) throw notFound();
    const page = await lirePagePublique({ data: params.pseudo });
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData }) => tetePage(loaderData),
  component: Page,
});

function Page() {
  return <PageLiens page={Route.useLoaderData()} />;
}
