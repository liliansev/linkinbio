import { createFileRoute, redirect } from '@tanstack/react-router';
import { Accueil } from '../accueil/Accueil.tsx';
import { APIS } from '../accueil/api.ts';
import { teteAccueil } from '../accueil/tete.ts';
import { PageLiens } from '../components/PageLiens.tsx';
import { tetePage } from '../lib/tete.ts';
import { lireRacine } from '../server/fonctions.ts';

/*
 * hopla.page : l'accueil du service, en anglais (8 novembre 2026, Hopla anglais d'abord ; la version française vit sur
 * /fr, sans redirection forcée), qui présente Hopla et prend les noms (inscription directe ou liste d'attente, voir
 * `server/attente.ts`). Chaque page vit sur /<pseudo> ; celle de Lilian sert d'exemple. Le <head> : `accueil/tete.ts`.
 *
 * Sur le nom de domaine d'une page (`liens.marie.fr`, 10 novembre 2026, voir `server/domaines.ts`), la racine est cette
 * page : le serveur le dit d'après le nom de la requête, le même au premier rendu et dans le navigateur.
 */

export const Route = createFileRoute('/')({
  loader: async ({ location }) => {
    // `?s=tiktok` (ou `utm_source`) : sur son propre nom aussi, la page s'adapte au réseau d'où vient le visiteur.
    const q = location.search as Record<string, unknown>;
    const s = [q.s, q.utm_source].find(v => typeof v === 'string') as string | undefined;
    const racine = await lireRacine({ data: { s: s ?? '' } });
    if ('ailleurs' in racine) throw redirect({ href: racine.ailleurs, statusCode: 302 });
    if (racine.page?.redirection) throw redirect({ href: racine.page.redirection, statusCode: 302 });
    return racine;
  },
  head: ({ loaderData }) => (loaderData?.page ? tetePage(loaderData.page) : teteAccueil('en', loaderData?.mode ?? 'libre')),
  component: Page,
});

function Page() {
  const { mode, page } = Route.useLoaderData();
  return page ? <PageLiens page={page} /> : <Accueil api={APIS[mode].en} mode={mode} langue="en" />;
}
