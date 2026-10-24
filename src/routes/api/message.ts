import { createFileRoute } from '@tanstack/react-router';
import { envoyerMessage } from '../../server/message.ts';
import { hotesTurnstile } from '../../server/turnstile.ts';

/* « Me contacter » : le message d'un visiteur part dans la boîte du propriétaire de la page. */
export const Route = createFileRoute('/api/message')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const site = request.headers.get('sec-fetch-site');
        if (site && site !== 'same-origin') return new Response(null, { status: 403 });
        const texte = await request.text();
        if (texte.length > 6000) return new Response(null, { status: 413 });
        let entree: Record<string, unknown> = {};
        try { entree = JSON.parse(texte); } catch { return new Response(null, { status: 400 }); }
        const r = await envoyerMessage(process.env, fetch, entree, { ip: request.headers.get('x-real-ip') ?? '', hotes: hotesTurnstile(process.env, request.url) });
        return new Response(null, { status: r.status, headers: { 'Cache-Control': 'no-store' } });
      },
    },
  },
});
