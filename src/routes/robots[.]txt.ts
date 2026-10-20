import { createFileRoute } from '@tanstack/react-router';
import { lieu, robots } from '../server/referencement.ts';

/* Tout se lit sur hopla.page ; rien sur le back office. */
export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { publique, admin } = lieu(request);
        return new Response(robots(publique, admin), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
      },
    },
  },
});
