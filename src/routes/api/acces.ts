import { createFileRoute } from '@tanstack/react-router';
import { debloquer } from '../../server/acces.ts';

/* Le mode drop : un lien qui se débloque avec un code, ou pour les premiers arrivés. */
export const Route = createFileRoute('/api/acces')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const site = request.headers.get('sec-fetch-site');
        if (site && site !== 'same-origin') return new Response(null, { status: 403 });
        const texte = await request.text();
        if (texte.length > 1000) return new Response(null, { status: 413 });
        let entree: Record<string, unknown> = {};
        try { entree = JSON.parse(texte); } catch { return new Response(null, { status: 400 }); }
        const r = debloquer(entree, { ip: request.headers.get('x-real-ip') ?? '', ua: request.headers.get('user-agent') ?? '' });
        return Response.json({ message: r.message, url: r.url, restantes: r.restantes }, { status: r.status, headers: { 'Cache-Control': 'no-store' } });
      },
    },
  },
});
