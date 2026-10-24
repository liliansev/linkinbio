import { createFileRoute } from '@tanstack/react-router';
import { articlesDuBloc } from '../../server/flux.ts';

/* Les derniers articles, ou la dernière vidéo, d'un bloc d'une page : lus par le serveur, gardés un moment. */
export const Route = createFileRoute('/api/flux')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
        const articles = await articlesDuBloc(params.get('page') ?? '', params.get('bloc') ?? '');
        if (!articles) return Response.json({ articles: [] }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
        // Le flux ne change pas à la minute : le navigateur le garde un peu, sans jamais le partager.
        return Response.json({ articles }, { headers: { 'Cache-Control': 'private, max-age=600', 'X-Robots-Tag': 'noindex' } });
      },
    },
  },
});
