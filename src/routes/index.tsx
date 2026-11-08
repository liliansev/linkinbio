import { createFileRoute } from '@tanstack/react-router';
import { Accueil } from '../accueil/Accueil.tsx';
import { APIS } from '../accueil/api.ts';
import { teteAccueil } from '../accueil/tete.ts';
import { modeInscription } from '../server/fonctions.ts';

/*
 * hopla.page : l'accueil du service, en anglais (8 novembre 2026, Hopla anglais d'abord ; la version française vit sur
 * /fr, sans redirection forcée), qui présente Hopla et prend les noms (inscription directe ou liste d'attente, voir
 * `server/attente.ts`). Chaque page vit sur /<pseudo> ; celle de Lilian sert d'exemple. Le <head> : `accueil/tete.ts`.
 */

export const Route = createFileRoute('/')({
  loader: () => modeInscription(),
  head: ({ loaderData }) => teteAccueil('en', loaderData ?? 'libre'),
  component: Page,
});

function Page() {
  const mode = Route.useLoaderData() ?? 'libre';
  return <Accueil api={APIS[mode].en} mode={mode} langue="en" />;
}
