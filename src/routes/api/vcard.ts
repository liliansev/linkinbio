import { createFileRoute } from '@tanstack/react-router';
import { carteDeVisite } from '../../server/message.ts';

/* La carte de visite d'une page, en fichier vCard : un toucher la range dans les contacts du téléphone. */
export const Route = createFileRoute('/api/vcard')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const params = new URL(request.url).searchParams;
        const carte = carteDeVisite(params.get('page') ?? '', params.get('bloc') ?? '');
        if (!carte) return new Response('Cette carte de visite n’existe plus.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        return new Response(carte.vcf, {
          headers: {
            'Content-Type': 'text/vcard; charset=utf-8',
            'Content-Disposition': `attachment; filename="${carte.fichier}"`,
            'Cache-Control': 'no-store',
            'X-Robots-Tag': 'noindex',
          },
        });
      },
    },
  },
});
