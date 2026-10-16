import { createFileRoute } from '@tanstack/react-router';
import { lireMedia } from '../../server/db.ts';

/* Les images envoyées depuis le back office : un identifiant ne change jamais de contenu. */
export const Route = createFileRoute('/media/$fichier')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const m = /^([\w-]{1,40})\.(webp|jpg)$/.exec(params.fichier);
        const octets = m ? lireMedia(m[1], m[2]) : null;
        if (!m || !octets) return new Response('Introuvable', { status: 404 });
        return new Response(new Uint8Array(octets), { headers: { 'Content-Type': m[2] === 'webp' ? 'image/webp' : 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
      },
    },
  },
});
