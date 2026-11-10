import { createFileRoute } from '@tanstack/react-router';
import { hoteActif } from '../../server/domaines.ts';

/*
 * `GET /api/domaine?domain=liens.marie.fr` : 200 quand ce nom est celui d'une page qui y répond, 404 sinon. Pour une
 * instance auto-hébergée, dont le serveur web fait les certificats à la demande (l'`ask` de Caddy) : il ne demande un
 * certificat que pour un nom connu. Rien d'autre n'est dit du nom.
 */
export const Route = createFileRoute('/api/domaine')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const nom = (new URL(request.url).searchParams.get('domain') ?? '').slice(0, 253);
        return new Response(null, { status: nom && hoteActif(nom) ? 200 : 404, headers: { 'Cache-Control': 'no-store' } });
      },
    },
  },
});
