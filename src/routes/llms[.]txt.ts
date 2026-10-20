import { createFileRoute } from '@tanstack/react-router';
import { lieu, llms } from '../server/referencement.ts';

/* Hopla résumé pour les IA qui répondent à la place d'une recherche (https://llmstxt.org). */
export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { publique, admin } = lieu(request);
        if (admin) return new Response('Introuvable', { status: 404 });
        return new Response(llms(publique), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
      },
    },
  },
});
