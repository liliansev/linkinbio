import Link from 'next/link';
import { Exemple } from './exemple';
import { GROUPES, Methode, ancre } from './routes';

export { Methode, Route, Routes } from './routes';

/* Les guides de chaque groupe de la référence : la carte du groupe y mène. */
const GUIDES: Record<string, string> = {
  Page: '/settings', Blocks: '/blocks', Images: '/images', Analytics: '/analytics', Sharing: '/qr-code',
  'Email list': '/email-list', 'Web fetching': '/web-fetching', Account: '/account', 'Reference values': '/reference-values',
};

const PORTES = [
  { href: '/quickstart', titre: 'Quickstart', texte: 'Create an API key, make your first request, add a link.' },
  { href: '/mcp', titre: 'MCP server', texte: 'Connect Claude, Cursor or any MCP client.' },
  { href: '/examples', titre: 'Examples', texte: 'Scripts for common use cases: weekly report, scheduled launch, backups.' },
];

/* L'ouverture de la documentation : une phrase et un exemple qui marche côte à côte, trois portes, puis tout ce que l'API sait faire. */
export function Accueil() {
  const routes = GROUPES.reduce((n, g) => n + g.routes.length, 0);
  return (
    <div className="hd-accueil not-prose">
      <div className="hd-accueil-tete">
        <div className="hd-accueil-texte">
          <p className="hd-accueil-sur">REST API and MCP server · Hopla Pro</p>
          <h1 className="hd-accueil-titre">Hopla API <span>and MCP server</span></h1>
          <p className="hd-accueil-chapo">
            Everything the admin panel does, available through the REST API and the MCP server: page, blocks, images, analytics, email list.
          </p>
          <div className="hd-accueil-actions">
            <Link href="/quickstart" className="hd-bouton hd-bouton-plein">Quickstart</Link>
            <Link href="/reference" className="hd-bouton">API reference</Link>
          </div>
          <dl className="hd-accueil-chiffres">
            <div><dt>{routes}</dt><dd>endpoints</dd></div>
            <div><dt>25</dt><dd>MCP tools</dd></div>
            <div><dt>120</dt><dd>requests per minute</dd></div>
          </dl>
        </div>
        <Exemple />
      </div>

      <div className="hd-portes">
        {PORTES.map(p => (
          <Link key={p.href} href={p.href} className="hd-porte">
            <span className="hd-porte-titre">{p.titre}</span>
            <span className="hd-porte-texte">{p.texte}</span>
            <span className="hd-porte-fleche" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>

      <h2 className="hd-accueil-h2">Resources</h2>
      <p className="hd-accueil-sous">Every endpoint is documented in the API reference, with an interactive console.</p>
      <div className="hd-carte-groupes">
        {GROUPES.filter(g => g.routes.length).map(g => (
          <section key={g.name} className="hd-carte-groupe">
            <Link href={GUIDES[g.name] ?? '/reference'} className="hd-carte-groupe-titre">{g.name}<span aria-hidden="true">→</span></Link>
            <p>{g.description}</p>
            <ul>
              {g.routes.map(r => (
                <li key={r.m + r.chemin}>
                  <Link href={ancre(g.name, r.m, r.chemin)}><Methode m={r.m} /><code>{r.chemin}</code></Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
