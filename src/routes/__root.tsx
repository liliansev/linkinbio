/// <reference types="vite/client" />
import { HeadContent, Outlet, Scripts, createRootRoute, useMatches } from '@tanstack/react-router';
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
  shellComponent: Coquille,
  component: Outlet,
  notFoundComponent: () => (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#0c121f', color: '#f4f1ec', fontFamily: 'Geist Variable, system-ui' }}>
      <p>Cette page n’existe pas. <a href="/" style={{ color: '#ffb38a' }}>Retour à Hopla</a></p>
    </main>
  ),
});

/** La langue du document : celle de la page publique ouverte (son réglage), le français ailleurs pour l'instant. */
function useLangueDocument(): string {
  return useMatches({
    select: matches => {
      for (const m of [...matches].reverse()) {
        // L'accueil, les fonctions et les comparatifs en anglais (8 novembre 2026) ; leur version française et
        // les autres pages du site restent en français.
        if (m.routeId === '/' || /^\/(features|compare)\//.test(m.routeId)) return 'en';
        const langue = (m.loaderData as { reglages?: { langue?: string } } | undefined)?.reglages?.langue;
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
