/// <reference types="vite/client" />
import { HeadContent, Outlet, Scripts, createRootRoute, useMatches } from '@tanstack/react-router';
import { DeviseSite } from '../accueil/langue.ts';
import { deviseVisiteur } from '../server/fonctions.ts';
import type { ReactNode } from 'react';
import css from '../styles/app.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [{ charSet: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content' }],
    links: [
      { rel: 'stylesheet', href: css },
      { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/site.webmanifest' },
    ],
  }),
  // La monnaie des prix, d'après le pays du visiteur : lue une fois, au premier chargement.
  loader: () => deviseVisiteur().catch(() => 'EUR' as const),
  staleTime: Infinity,
  shellComponent: Coquille,
  component: Racine,
  notFoundComponent: () => (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#0c121f', color: '#f4f1ec', fontFamily: 'Geist Variable, system-ui' }}>
      {/* Anglais d'abord (8 novembre 2026), le français dessous : une adresse inconnue ne dit pas sa langue. */}
      <div style={{ textAlign: 'center', lineHeight: 1.6 }}>
        <p>This page doesn’t exist. <a href="/" style={{ color: '#ffb38a' }}>Back to Hopla</a></p>
        <p lang="fr" style={{ opacity: 0.7 }}>Cette page n’existe pas. <a href="/fr" style={{ color: '#ffb38a' }}>Retour à Hopla</a></p>
      </div>
    </main>
  ),
});

function Racine() {
  const devise = Route.useLoaderData();
  return <DeviseSite.Provider value={devise ?? 'EUR'}><Outlet /></DeviseSite.Provider>;
}

/** La langue du document : celle de la page publique ouverte (son réglage), le français ailleurs pour l'instant. */
function useLangueDocument(): string {
  return useMatches({
    select: matches => {
      for (const m of [...matches].reverse()) {
        // L'accueil, les fonctions et les comparatifs en anglais (8 novembre 2026) ; leur version française et
        // les autres pages du site restent en français.
        if (m.routeId === '/' || /^\/(features|compare)\//.test(m.routeId)) return 'en';
        // Une page publique, ou le back office : la langue du compte, sinon (connexion) celle du navigateur.
        const d = m.loaderData as { reglages?: { langue?: string }; etat?: { reglages?: { langue?: string } }; langue?: string } | undefined;
        const langue = d?.reglages?.langue ?? d?.etat?.reglages?.langue ?? d?.langue;
        if (langue) return langue;
      }
      return 'fr';
    },
  });
}

function Coquille({ children }: { children: ReactNode }) {
  const langue = useLangueDocument();
  return (
    <html lang={langue}>
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}
