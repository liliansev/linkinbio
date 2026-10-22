import { createFileRoute, notFound } from '@tanstack/react-router';
import { lirePagePublique } from '../server/fonctions.ts';
import { PageLiens } from '../components/PageLiens.tsx';
import { tetePage } from '../lib/tete.ts';

/* Une page, sur hopla.page/<pseudo>. Celle de Lilian est /lilian. */
export const Route = createFileRoute('/$pseudo')({
  // `?s=tiktok` (ou `utm_source`) : la page s'adapte au réseau d'où vient le visiteur.
  // `?suite=<minute>` : la visite passée par l'écran qui propose le navigateur (lib/sortie.ts), déjà comptée.
  validateSearch: (search: Record<string, unknown>): { s?: string; utm_source?: string; suite?: number } => ({
    ...(typeof search.s === 'string' ? { s: search.s } : {}),
    ...(typeof search.utm_source === 'string' ? { utm_source: search.utm_source } : {}),
    ...(typeof search.suite === 'number' ? { suite: search.suite } : {}),
  }),
  loaderDeps: ({ search }) => ({ s: search.s ?? search.utm_source ?? '', suite: search.suite ?? 0 }),
  loader: async ({ params, deps }) => {
    if (!/^[a-z0-9-]{3,30}$/i.test(params.pseudo)) throw notFound();
    const page = await lirePagePublique({ data: { pseudo: params.pseudo, s: deps.s, suite: deps.suite } });
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData }) => tetePage(loaderData),
  component: Page,
});

function Page() {
  return <PageLiens page={Route.useLoaderData()} />;
}
