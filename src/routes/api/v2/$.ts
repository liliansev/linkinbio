import { createFileRoute } from '@tanstack/react-router';
import { repondreApi } from '../../../server/api.ts';

/* L'API publique en anglais, /api/v2/… : tout passe par `repondreApi` (server/api.ts). */
const repondre = ({ request }: { request: Request }) => repondreApi(request);

export const Route = createFileRoute('/api/v2/$')({
  server: { handlers: { GET: repondre, HEAD: repondre, POST: repondre, PATCH: repondre, PUT: repondre, DELETE: repondre, OPTIONS: repondre } },
});
