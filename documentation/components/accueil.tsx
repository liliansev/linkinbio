import Link from 'next/link';
import type { ReactNode } from 'react';

/* Une méthode HTTP, à sa couleur : lire en bleu, écrire en vert, supprimer en rouge. */
export function Methode({ m }: { m: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' }) {
  return <span className={`hd-methode hd-methode-${m.toLowerCase()}`}>{m}</span>;
}

/* Une route de l'API dans une liste : sa méthode, son chemin, ce qu'elle fait, et le lien vers la référence. */
export function Route({ m, chemin, href, children }: { m: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; chemin: string; href: string; children: ReactNode }) {
  return (
    <Link href={href} className="hd-route not-prose">
      <Methode m={m} />
      <code>{chemin}</code>
      <span>{children}</span>
    </Link>
  );
}

const PORTES = [
  { href: '/demarrage', titre: 'Démarrer', texte: 'Une clé, un premier appel, un lien ajouté à ta page : deux minutes.' },
  { href: '/mcp', titre: 'Serveur MCP', texte: 'Claude, Cursor ou ton agent gèrent ta page en langage courant.' },
  { href: '/reference', titre: 'Référence de l’API', texte: 'Chaque route, ses champs, ses réponses. Et un bouton pour l’essayer.' },
];

/* L'ouverture de la documentation : une phrase, un exemple qui marche, trois portes. */
export function Accueil() {
  return (
    <div className="hd-accueil not-prose">
      <h1 className="hd-accueil-titre">Ta page Hopla, <span>depuis ton code</span></h1>
      <p className="hd-accueil-chapo">
        Profil, thème, réseaux, blocs et statistiques : tout ce que tu fais dans le back office se fait aussi par l’API, ou en parlant à ton agent IA.
      </p>
      <div className="hd-accueil-actions">
        <Link href="/demarrage" className="hd-bouton hd-bouton-plein">Démarrer</Link>
        <Link href="/reference" className="hd-bouton">Voir la référence</Link>
      </div>
      <pre className="hd-accueil-code" aria-label="Exemple : ajouter un lien">
        <code>
          <span className="hd-c-cmd">curl</span> -X POST https://app.hopla.page/api/v1/blocs \{'\n'}
          {'  '}-H <span className="hd-c-str">"Authorization: Bearer $HOPLA_CLE"</span> \{'\n'}
          {'  '}-H <span className="hd-c-str">"Content-Type: application/json"</span> \{'\n'}
          {'  '}-d <span className="hd-c-str">{`'{"titre": "Mon nouveau podcast", "url": "https://exemple.fr/podcast"}'`}</span>
        </code>
      </pre>
      <div className="hd-portes">
        {PORTES.map(p => (
          <Link key={p.href} href={p.href} className="hd-porte">
            <span className="hd-porte-titre">{p.titre}</span>
            <span className="hd-porte-texte">{p.texte}</span>
            <span className="hd-porte-fleche" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
