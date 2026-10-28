import Link from 'next/link';
import { Exemple } from './exemple';
import { GROUPES, Methode, ancre } from './routes';

export { Methode, Route, Routes } from './routes';

/* Les guides de chaque groupe de la référence : la carte du groupe y mène. */
const GUIDES: Record<string, string> = {
  Page: '/reglages', Blocs: '/blocs', Images: '/images', Statistiques: '/stats', Partage: '/qr-code',
  'Liste e-mail': '/liste-email', 'Lire le web': '/lire-le-web', Compte: '/compte', Référence: '/listes',
};

const PORTES = [
  { href: '/demarrage', titre: 'Démarrer', texte: 'Une clé, un premier appel, un lien ajouté à ta page : deux minutes.' },
  { href: '/mcp', titre: 'Serveur MCP', texte: 'Claude, Cursor ou ton agent gèrent ta page en langage courant.' },
  { href: '/recettes', titre: 'Recettes', texte: 'Des scripts prêts à copier : le lien de la semaine, les stats du lundi, les inscrits.' },
];

/* L'ouverture de la documentation : une phrase et un exemple qui marche côte à côte, trois portes, puis tout ce que l'API sait faire. */
export function Accueil() {
  const routes = GROUPES.reduce((n, g) => n + g.routes.length, 0);
  return (
    <div className="hd-accueil not-prose">
      <div className="hd-accueil-tete">
        <div className="hd-accueil-texte">
          <p className="hd-accueil-sur">API REST et serveur MCP · Hopla Pro</p>
          <h1 className="hd-accueil-titre">Ta page Hopla, <span>depuis ton code</span></h1>
          <p className="hd-accueil-chapo">
            Tout ce que tu fais dans le back office se fait aussi par l’API, ou en parlant à ton agent IA : ta page, tes blocs, tes images, tes chiffres, ta liste e-mail.
          </p>
          <div className="hd-accueil-actions">
            <Link href="/demarrage" className="hd-bouton hd-bouton-plein">Démarrer</Link>
            <Link href="/reference" className="hd-bouton">Voir la référence</Link>
          </div>
          <dl className="hd-accueil-chiffres">
            <div><dt>{routes}</dt><dd>routes</dd></div>
            <div><dt>25</dt><dd>outils MCP</dd></div>
            <div><dt>120</dt><dd>appels par minute</dd></div>
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

      <h2 className="hd-accueil-h2">Ce que l’API sait faire</h2>
      <p className="hd-accueil-sous">Chaque route a sa page dans la référence, avec un bouton pour l’essayer avec ta clé.</p>
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
