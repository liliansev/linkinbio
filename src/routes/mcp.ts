import { createFileRoute } from '@tanstack/react-router';
import { repondreMcp } from '../server/mcp.ts';

/* Le serveur MCP de Hopla, sur app.hopla.page/mcp (voir server/mcp.ts). */
const repondre = ({ request }: { request: Request }) => repondreMcp(request);

export const Route = createFileRoute('/mcp')({
  server: { handlers: { GET: repondre, POST: repondre, DELETE: repondre, OPTIONS: repondre } },
});
