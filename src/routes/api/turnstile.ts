import { createFileRoute } from '@tanstack/react-router';
import { cleTurnstile } from '../../server/turnstile.ts';

/* La clé publique de Turnstile, que les formulaires lisent avant de charger le script ; vide tant qu'il n'est pas branché. */
export const Route = createFileRoute('/api/turnstile')({
  server: {
    handlers: {
      GET: async () => Response.json({ cle: cleTurnstile(process.env) }, { headers: { 'Cache-Control': 'public, max-age=300' } }),
    },
  },
});
