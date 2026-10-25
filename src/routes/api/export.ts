import { createFileRoute } from '@tanstack/react-router';
import { exporter, imagesExportees } from '../../server/db.ts';
import { COOKIE_SESSION, compteDeSession, lireCookie } from '../../server/auth.ts';

/*
 * Le droit d'accès et de portabilité : tout le compte en un fichier JSON, téléchargé depuis l'onglet Réglages.
 * Les images partent en dernier, une à la fois, pour qu'un compte plein ne fasse pas tomber le serveur.
 */
export const Route = createFileRoute('/api/export')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const site = request.headers.get('sec-fetch-site');
        if (site && site !== 'same-origin' && site !== 'none') return new Response(null, { status: 403 });
        const compte = compteDeSession(lireCookie(request.headers.get('cookie'), COOKIE_SESSION));
        if (!compte) return new Response('Connecte-toi pour télécharger tes données.', { status: 401 });
        const donnees = exporter(compte);
        const nom = `mes-liens-${donnees.compte.pseudo}-${donnees.exporte.slice(0, 10)}.json`;
        const tete = JSON.stringify(donnees, null, 2).replace(/\n}$/, ',\n  "images": [');
        const images = imagesExportees(compte);
        let premiere = true;
        const encodeur = new TextEncoder();
        const flux = new ReadableStream<Uint8Array>({
          start(c) { c.enqueue(encodeur.encode(tete)); },
          pull(c) {
            const suivante = images.next();
            if (suivante.done) { c.enqueue(encodeur.encode(premiere ? ']\n}\n' : '\n  ]\n}\n')); c.close(); return; }
            c.enqueue(encodeur.encode((premiere ? '\n    ' : ',\n    ') + JSON.stringify(suivante.value)));
            premiere = false;
          },
        });
        return new Response(flux, {
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="${nom}"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
        });
      },
    },
  },
});
