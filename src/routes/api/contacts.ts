import { createFileRoute } from '@tanstack/react-router';
import { compteParId } from '../../server/db.ts';
import { csv } from '../../server/liste.ts';
import { COOKIE_SESSION, compteDeSession, lireCookie } from '../../server/auth.ts';

/* Les inscrits de « Rejoins ma liste », en CSV, depuis l'onglet Stats. */
export const Route = createFileRoute('/api/contacts')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const site = request.headers.get('sec-fetch-site');
        if (site && site !== 'same-origin' && site !== 'none') return new Response(null, { status: 403 });
        const compte = compteDeSession(lireCookie(request.headers.get('cookie'), COOKIE_SESSION));
        if (!compte) return new Response('Connecte-toi pour télécharger ta liste.', { status: 401 });
        const nom = `inscrits-${compteParId(compte)?.pseudo ?? 'hopla'}-${new Date().toISOString().slice(0, 10)}.csv`;
        return new Response(csv(compte), {
          headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${nom}"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
        });
      },
    },
  },
});
