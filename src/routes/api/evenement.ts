import { createFileRoute } from '@tanstack/react-router';
import { enregistrer } from '../../server/analytique.ts';
import { COOKIE_SESSION, lireCookie, sessionValide } from '../../server/auth.ts';

/* Les vues et les clics de la page publique, envoyés par `navigator.sendBeacon`. */
export const Route = createFileRoute('/api/evenement')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Seule la page elle-même envoie ses événements ; un autre site ne peut pas les faire envoyer par ses visiteurs.
        const site = request.headers.get('sec-fetch-site');
        if (site && site !== 'same-origin') return new Response(null, { status: 403 });
        const texte = await request.text();
        if (texte.length > 2000) return new Response(null, { status: 413 });
        let entree: Record<string, unknown> = {};
        try { entree = JSON.parse(texte); } catch { return new Response(null, { status: 400 }); }
        const ip = request.headers.get('x-real-ip') ?? '';
        const admin = sessionValide(lireCookie(request.headers.get('cookie'), COOKIE_SESSION));
        enregistrer({ type: entree.type, bloc: entree.bloc, utm: entree.utm, referent: entree.referent }, { ip, ua: request.headers.get('user-agent') ?? '', admin });
        return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
      },
    },
  },
});
