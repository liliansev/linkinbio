import { createFileRoute } from '@tanstack/react-router';
import { inscrire } from '../../server/liste.ts';
import { hotesTurnstile } from '../../server/turnstile.ts';
import { requeteSortante } from '../../server/sortante.ts';

/* Le formulaire « Rejoins ma liste » d'une page. */
export const Route = createFileRoute('/api/inscription')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const site = request.headers.get('sec-fetch-site');
        if (site && site !== 'same-origin') return new Response(null, { status: 403 });
        const texte = await request.text();
        if (texte.length > 2000) return new Response(null, { status: 413 });
        let entree: Record<string, unknown> = {};
        try { entree = JSON.parse(texte); } catch { return new Response(null, { status: 400 }); }
        const r = await inscrire(process.env, requeteSortante, entree, {
          ip: request.headers.get('x-real-ip') ?? '', ua: request.headers.get('user-agent') ?? '', referent: typeof entree.referent === 'string' ? entree.referent : '',
          hotes: hotesTurnstile(process.env, request.url),
        });
        return Response.json({ message: r.message, ...(r.cadeau ? { cadeau: r.cadeau } : {}) }, { status: r.status, headers: { 'Cache-Control': 'no-store' } });
      },
    },
  },
});
