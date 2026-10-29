import type { Metadata } from 'next';
import Link from 'next/link';
import { Marque } from '@/components/marque';
import { Reference } from './reference';

export const metadata: Metadata = {
  title: 'API reference',
  description: 'Every Hopla API endpoint with its parameters and responses, plus an interactive console.',
  alternates: { canonical: '/docs/reference' },
};

/* La référence de l'API : Scalar, sur toute la page, sous une barre qui ramène aux guides. */
export default function Page() {
  return (
    <div className="hd-ref">
      <header className="hd-ref-barre">
        <Link href="/" aria-label="Hopla Docs"><Marque /></Link>
        <nav className="hd-ref-liens" aria-label="Documentation">
          <Link href="/">Guides</Link>
          <Link href="/mcp">MCP server</Link>
          <a href="/docs/openapi.json" download>OpenAPI</a>
        </nav>
      </header>
      <Reference />
    </div>
  );
}
