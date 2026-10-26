import { createFileRoute } from '@tanstack/react-router';
import { lireMedia } from '../../server/db.ts';

/*
 * Les images envoyées depuis le back office : un identifiant ne change jamais de contenu. Derrière Cloudflare, son
 * cache n'en garde une copie qu'une heure (`CDN-Cache-Control`) : une image retirée, ou d'un compte suspendu, ne
 * reste pas servie un an par le réseau.
 */
export const Route = createFileRoute('/media/$fichier')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const m = /^([\w-]{1,40})\.(webp|jpg|png)$/.exec(params.fichier);
        const octets = m ? lireMedia(m[1], m[2]) : null;
        if (!m || !octets) return new Response('Introuvable', { status: 404 });
        return new Response(new Uint8Array(octets), { headers: { 'Content-Type': m[2] === 'jpg' ? 'image/jpeg' : `image/${m[2]}`, 'Cache-Control': 'public, max-age=31536000, immutable', 'CDN-Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
      },
    },
  },
});
