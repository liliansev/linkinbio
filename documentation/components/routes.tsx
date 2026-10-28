import Link from 'next/link';
import type { ReactNode } from 'react';
import spec from '@/public/openapi.json';

type M = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
interface Operation { tags?: string[]; summary?: string; operationId?: string }

/* Une méthode HTTP, à sa couleur : lire en bleu, écrire en vert, changer en ambre, supprimer en rouge. */
export function Methode({ m }: { m: M }) {
  return <span className={`hd-methode hd-methode-${m.toLowerCase()}`}>{m}</span>;
}

/* L'ancre d'une route dans la référence (Scalar) : le nom du groupe en minuscules, ses espaces en tirets. */
export const ancre = (tag: string, m: string, chemin: string) => `/reference#tag/${tag.toLowerCase().replace(/\s+/g, '-')}/${m}${chemin}`;

/* Toutes les routes, lues dans le fichier OpenAPI : rien à recopier quand une route s'ajoute. */
export const ROUTES = Object.entries(spec.paths as Record<string, Record<string, Operation>>).flatMap(([chemin, ops]) =>
  Object.entries(ops).filter(([m]) => ['get', 'post', 'patch', 'put', 'delete'].includes(m)).map(([m, op]) => ({
    m: m.toUpperCase() as M, chemin, resume: op.summary ?? '', tag: op.tags?.[0] ?? '',
  })));
export const GROUPES = (spec.tags as { name: string; description: string }[]).map(t => ({ ...t, routes: ROUTES.filter(r => r.tag === t.name) }));

/* Une liste de routes dans un cadre, une par ligne, comme l'encart « Endpoints » des documentations de Stripe. */
export function Routes({ titre = 'Les routes', children }: { titre?: string; children: ReactNode }) {
  return (
    <div className="hd-routes not-prose">
      <div className="hd-routes-titre">{titre}</div>
      {children}
    </div>
  );
}

/* Une route : sa méthode, son chemin, ce qu'elle fait, et le lien vers la référence. Le lien se déduit du chemin. */
export function Route({ m, chemin, children }: { m: M; chemin: string; href?: string; children: ReactNode }) {
  const tag = ROUTES.find(r => r.m === m && r.chemin === chemin)?.tag ?? '';
  return (
    <Link href={ancre(tag, m, chemin)} className="hd-route">
      <Methode m={m} />
      <code>{chemin}</code>
      <span>{children}</span>
    </Link>
  );
}

/* Un groupe de la référence, toutes ses routes. */
export function RoutesDe({ tag, titre }: { tag: string; titre?: string }) {
  const g = GROUPES.find(x => x.name === tag);
  if (!g) return null;
  return (
    <Routes titre={titre ?? 'Les routes'}>
      {g.routes.map(r => <Route key={r.m + r.chemin} m={r.m} chemin={r.chemin}>{r.resume}</Route>)}
    </Routes>
  );
}

/* Toutes les routes, groupe par groupe. */
export function ToutesLesRoutes() {
  return (
    <div className="hd-toutes not-prose">
      {GROUPES.filter(g => g.routes.length).map(g => (
        <section key={g.name} className="hd-groupe">
          <h3 className="hd-groupe-titre">{g.name}</h3>
          <p className="hd-groupe-texte">{g.description}</p>
          <Routes titre={`${g.routes.length} route${g.routes.length > 1 ? 's' : ''}`}>
            {g.routes.map(r => <Route key={r.m + r.chemin} m={r.m} chemin={r.chemin}>{r.resume}</Route>)}
          </Routes>
        </section>
      ))}
    </div>
  );
}
