import type { Metadata } from 'next';
import Link from 'next/link';
import { Marque } from '@/components/marque';
import { Reference } from './reference';

export const metadata: Metadata = {
  title: 'Référence de l’API',
  description: 'Chaque route de l’API de Hopla, ses champs et ses réponses, à essayer avec ta clé.',
  alternates: { canonical: '/docs/reference' },
};

/* La référence de l'API : Scalar, sur toute la page, sous une barre qui ramène aux guides. */
export default function Page() {
  return (
    <div className="hd-ref">
      <header className="hd-ref-barre">
        <Link href="/" aria-label="Documentation de Hopla"><Marque /></Link>
        <nav className="hd-ref-liens" aria-label="Documentation">
          <Link href="/">Guides</Link>
          <Link href="/mcp">Serveur MCP</Link>
          <a href="/docs/openapi.json" download>OpenAPI</a>
        </nav>
      </header>
      <Reference />
    </div>
  );
}
