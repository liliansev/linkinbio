import { createFileRoute, notFound } from '@tanstack/react-router';
import { lirePagePublique } from '../server/fonctions.ts';
import { PageLiens } from '../components/PageLiens.tsx';
import { tetePage } from '../lib/tete.ts';

/* La page de Lilian, sur /liens/. */
export const Route = createFileRoute('/')({
  loader: async () => {
    const page = await lirePagePublique({ data: '' });
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData }) => tetePage(loaderData),
  component: Page,
});

function Page() {
  return <PageLiens page={Route.useLoaderData()} />;
}
