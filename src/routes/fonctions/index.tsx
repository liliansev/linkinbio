import { createFileRoute } from '@tanstack/react-router';
import { IndexFonctions } from '../../accueil/pages/PageFonction.tsx';
import { modeInscription } from '../../server/fonctions.ts';
import { ORIGINE_PUBLIQUE } from '../../lib/types.ts';

/* hopla.page/fonctions : toutes les fonctions de Hopla, une ligne chacune. */
const TITRE = 'Les fonctions de Hopla · page de liens pour ta bio';
const RESUME = 'Tout ce que fait Hopla, fonction par fonction : la page selon le réseau et l’heure, les liens ouverts dans leur app, la vitrine, les stats.';

export const Route = createFileRoute('/fonctions/')({
  loader: () => modeInscription(),
  head: () => ({
    meta: [
      { title: TITRE },
      { name: 'description', content: RESUME },
      { name: 'robots', content: 'index, follow, max-image-preview:large' },
      { name: 'theme-color', content: '#ffffff' },
      { property: 'og:title', content: TITRE },
      { property: 'og:description', content: RESUME },
      { property: 'og:url', content: `${ORIGINE_PUBLIQUE}/fonctions` },
      { property: 'og:image', content: `${ORIGINE_PUBLIQUE}/og.png` },
    ],
    links: [{ rel: 'canonical', href: `${ORIGINE_PUBLIQUE}/fonctions` }],
  }),
  component: Page,
});

function Page() {
  const mode = Route.useLoaderData() ?? 'libre';
  return <IndexFonctions mode={mode} />;
}
