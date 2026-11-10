import { createFileRoute } from '@tanstack/react-router';
import { lireMedia } from '../../server/db.ts';
import { EXTENSIONS_AUDIO, MIME_FICHIER, plage } from '../../lib/fichiers.ts';
import type { ExtensionFichier } from '../../lib/fichiers.ts';

const FICHIER = new RegExp(`^([\\w-]{1,40})\\.(webp|jpg|png|pdf|${EXTENSIONS_AUDIO.join('|')})$`);

/*
 * Les images envoyées depuis le back office : un identifiant ne change jamais de contenu. Derrière Cloudflare, son
 * cache n'en garde une copie qu'une heure (`CDN-Cache-Control`) : une image retirée, ou d'un compte suspendu, ne
 * reste pas servie un an par le réseau. Depuis le 10 novembre 2026, aussi un PDF ou un son : servis sous leur vrai
 * type, jamais deviné par le navigateur, et par plages (`Range`), sans quoi Safari ne lit pas un son.
 */
export const Route = createFileRoute('/media/$fichier')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const m = FICHIER.exec(params.fichier);
        const octets = m ? lireMedia(m[1], m[2]) : null;
        if (!m || !octets) return new Response('Introuvable', { status: 404 });
        const image = /^(webp|jpg|png)$/.test(m[2]);
        const entetes: Record<string, string> = {
          'Content-Type': image ? (m[2] === 'jpg' ? 'image/jpeg' : `image/${m[2]}`) : MIME_FICHIER[m[2] as ExtensionFichier],
          'Cache-Control': 'public, max-age=31536000, immutable', 'CDN-Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff',
        };
        if (image) return new Response(new Uint8Array(octets), { headers: entetes });
        entetes['Accept-Ranges'] = 'bytes';
        // Un PDF s'ouvre dans le lecteur du navigateur, jamais dans le cadre d'un autre site ; rien d'autre ne s'y exécute.
        if (m[2] === 'pdf') { entetes['Content-Disposition'] = 'inline; filename="document.pdf"'; entetes['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"; }
        const demandee = request.headers.get('range');
        const p = plage(demandee, octets.length);
        if (demandee && !p) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${octets.length}` } });
        if (!p) return new Response(new Uint8Array(octets), { headers: entetes });
        return new Response(new Uint8Array(octets.subarray(p.de, p.a + 1)), { status: 206, headers: { ...entetes, 'Content-Range': `bytes ${p.de}-${p.a}/${octets.length}` } });
      },
    },
  },
});
