import { createFileRoute } from '@tanstack/react-router';
import { compteParId, lireReglages, stats } from '../../server/db.ts';
import { joursLisibles, periodeLisible } from '../../server/droits.ts';
import { COOKIE_SESSION, compteDeSession, lireCookie } from '../../server/auth.ts';
import { lirePeriode } from '../../lib/periode.ts';
import { csvStats } from '../../lib/exportStats.ts';

/* Les stats de la période en CSV, depuis l'onglet Stats : `?periode=30`, ou `?du=2026-10-01&au=2026-10-15`. */
export const Route = createFileRoute('/api/stats')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const site = request.headers.get('sec-fetch-site');
        if (site && site !== 'same-origin' && site !== 'none') return new Response(null, { status: 403 });
        const id = compteDeSession(lireCookie(request.headers.get('cookie'), COOKIE_SESSION));
        const compte = id ? compteParId(id) : undefined;
        if (!compte) return new Response('Connecte-toi pour télécharger tes stats.', { status: 401 });
        if (!joursLisibles(compte)) return new Response('Tes stats demandent Hopla Starter.', { status: 403 });
        const q = new URL(request.url).searchParams;
        const periode = periodeLisible(compte, lirePeriode(q.has('du') ? { du: q.get('du'), au: q.get('au') } : q.get('periode') ?? 30) ?? 30);
        if (periode === null) return new Response('Ces dates sont plus anciennes que ton historique.', { status: 400 });
        const nom = `stats-${compte.pseudo}-${new Date().toISOString().slice(0, 10)}.csv`;
        return new Response(csvStats(stats(compte.id, periode), lireReglages(compte.id).langue), {
          headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${nom}"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
        });
      },
    },
  },
});
