import { createFileRoute } from '@tanstack/react-router';
import { IndexComparatifs } from '../../accueil/pages/PageComparatif.tsx';
import { modeInscription } from '../../server/fonctions.ts';
import { ORIGINE_PUBLIQUE } from '../../lib/types.ts';

/* hopla.page/comparatif : Hopla face à chaque outil du marché. */
const TITRE = 'Hopla face à Linktree, Beacons, Stan et les autres';
const RESUME = 'Hopla comparé aux pages de liens du marché : Linktree, Beacons, Stan, Lnk.Bio, Taplink, Later. Prix, commissions et fonctions, outil par outil.';

export const Route = createFileRoute('/comparatif/')({
  loader: () => modeInscription(),
  head: () => ({
    meta: [
      { title: TITRE },
      { name: 'description', content: RESUME },
      { name: 'robots', content: 'index, follow, max-image-preview:large' },
      { name: 'theme-color', content: '#ffffff' },
      { property: 'og:title', content: TITRE },
      { property: 'og:description', content: RESUME },
      { property: 'og:url', content: `${ORIGINE_PUBLIQUE}/comparatif` },
      { property: 'og:image', content: `${ORIGINE_PUBLIQUE}/og.png` },
    ],
    links: [{ rel: 'canonical', href: `${ORIGINE_PUBLIQUE}/comparatif` }],
  }),
  component: Page,
});

function Page() {
  const mode = Route.useLoaderData() ?? 'libre';
  return <IndexComparatifs mode={mode} />;
}
