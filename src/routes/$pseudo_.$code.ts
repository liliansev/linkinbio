import { createFileRoute } from '@tanstack/react-router';
import { suivreLienCourt } from '../server/courts.ts';

/* Un lien court, `hopla.page/<pseudo>/<code>` : il compte son clic et renvoie vers sa destination, dans son app si elle s'y prête. */
const ENTETES = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };

export const Route = createFileRoute('/$pseudo_/$code')({
  server: {
    handlers: {
      GET: ({ request, params }) => {
        const suite = suivreLienCourt(params.pseudo.toLowerCase(), params.code.toLowerCase(), request.headers.get('user-agent') ?? '');
        if (!suite) return new Response('Ce lien n’existe pas, ou plus. This link doesn’t exist anymore.', { status: 404, headers: { ...ENTETES, 'Content-Type': 'text/plain; charset=utf-8' } });
        if ('page' in suite) return new Response(suite.page, { headers: { ...ENTETES, 'Content-Type': 'text/html; charset=utf-8' } });
        return new Response(null, { status: 302, headers: { ...ENTETES, Location: suite.vers } });
      },
    },
  },
});
