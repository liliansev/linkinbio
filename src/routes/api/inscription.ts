import { createFileRoute } from '@tanstack/react-router';
import { inscrire } from '../../server/liste.ts';

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
        const r = await inscrire(process.env, fetch, entree, {
          ip: request.headers.get('x-real-ip') ?? '', ua: request.headers.get('user-agent') ?? '', referent: typeof entree.referent === 'string' ? entree.referent : '',
        });
        return Response.json({ message: r.message }, { status: r.status, headers: { 'Cache-Control': 'no-store' } });
      },
    },
  },
});
