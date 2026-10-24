import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { lirePagePublique } from '../server/fonctions.ts';
import { PageLiens } from '../components/PageLiens.tsx';
import { tetePage } from '../lib/tete.ts';

/* Une page, sur hopla.page/<pseudo>. Celle de Lilian est /lilian. */
export const Route = createFileRoute('/$pseudo')({
  // `?s=tiktok` (ou `utm_source`) : la page s'adapte au réseau d'où vient le visiteur.
  validateSearch: (search: Record<string, unknown>): { s?: string; utm_source?: string } => ({
    ...(typeof search.s === 'string' ? { s: search.s } : {}),
    ...(typeof search.utm_source === 'string' ? { utm_source: search.utm_source } : {}),
  }),
  loaderDeps: ({ search }) => ({ s: search.s ?? search.utm_source ?? '' }),
  loader: async ({ params, deps }) => {
    if (!/^[a-z0-9-]{3,30}$/i.test(params.pseudo)) throw notFound();
    const page = await lirePagePublique({ data: { pseudo: params.pseudo, s: deps.s } });
    if (!page) throw notFound();
    // « Redirection » (Starter) : toute la page renvoie vers une seule adresse, le temps d'un lancement.
    if (page.redirection) throw redirect({ href: page.redirection, statusCode: 302 });
    return page;
  },
  head: ({ loaderData }) => tetePage(loaderData),
  component: Page,
});

function Page() {
  return <PageLiens page={Route.useLoaderData()} />;
}
