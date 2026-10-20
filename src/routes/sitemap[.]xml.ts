import { createFileRoute } from '@tanstack/react-router';
import { lieu, plan } from '../server/referencement.ts';

/* Le plan du site : l'accueil, la page de Lilian si elle est visible par Google, les textes légaux. */
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { publique, admin } = lieu(request);
        if (admin) return new Response('Introuvable', { status: 404 });
        return new Response(plan(publique), { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
      },
    },
  },
});
