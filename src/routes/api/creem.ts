import { createFileRoute } from '@tanstack/react-router';
import { traiterWebhook } from '../../server/creem.ts';
import { adresseAdmin } from '../../server/auth.ts';
import { echapper, envoyer, enveloppe } from '../../server/courriel.ts';

/* Les webhooks de Creem : l'abonnement Pro d'un compte commence, se renouvelle, se résilie. */
export const Route = createFileRoute('/api/creem')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const corps = await request.text();
        if (corps.length > 200_000) return new Response(null, { status: 413 });
        const issue = traiterWebhook(process.env, corps, request.headers.get('creem-signature'));
        if (issue.status !== 200) console.error('[liens] webhook Creem refusé :', issue.message);
        // Quelqu'un a payé sans que Hopla sache pour quelle page : Lilian le sait tout de suite, pas en lisant les journaux.
        if (issue.alerte) {
          const lignes = ['Creem a signalé un abonnement que Hopla n’a rattaché à aucun compte : la personne a peut-être payé sans recevoir son offre.', issue.alerte, 'Retrouve-la dans Creem (Subscriptions), puis offre-lui l’offre depuis Comptes ou rembourse-la.'];
          void envoyer(process.env, fetch, {
            to: adresseAdmin(process.env),
            subject: 'Paiement Creem sans compte Hopla',
            html: enveloppe(lignes.map(l => `<p>${echapper(l)}</p>`).join('')),
            text: lignes.join('\n'),
          }).catch(error => console.error('[liens] alerte Creem non envoyée', error));
        }
        return new Response(issue.message, { status: issue.status, headers: { 'Cache-Control': 'no-store' } });
      },
    },
  },
});
