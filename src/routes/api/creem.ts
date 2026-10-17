import { createFileRoute } from '@tanstack/react-router';
import { traiterWebhook } from '../../server/creem.ts';

/* Les webhooks de Creem : l'abonnement Pro d'un compte commence, se renouvelle, se résilie. */
export const Route = createFileRoute('/api/creem')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const corps = await request.text();
        if (corps.length > 200_000) return new Response(null, { status: 413 });
        const issue = traiterWebhook(process.env, corps, request.headers.get('creem-signature'));
        if (issue.status !== 200) console.error('[liens] webhook Creem refusé :', issue.message);
        return new Response(issue.message, { status: issue.status, headers: { 'Cache-Control': 'no-store' } });
      },
    },
  },
});
