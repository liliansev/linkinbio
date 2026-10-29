import { createFileRoute } from '@tanstack/react-router';
import { repondreApi } from '../../../server/api.ts';

/* La racine de l'API, /api/v2 : sa documentation, sans clé (voir server/api.ts). */
const repondre = ({ request }: { request: Request }) => repondreApi(request);

export const Route = createFileRoute('/api/v2/')({
  server: { handlers: { GET: repondre, HEAD: repondre, OPTIONS: repondre } },
});
