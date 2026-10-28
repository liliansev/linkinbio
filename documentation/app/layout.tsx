import type { Metadata, Viewport } from 'next';
import { Provider } from '@/components/provider';
import '@fontsource-variable/geist';
import '@fontsource-variable/bricolage-grotesque';
import './global.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://hopla.page/docs/'),
  title: { default: 'Documentation de Hopla', template: '%s · Hopla Docs' },
  description: 'L’API et le serveur MCP de Hopla : gère ta page de liens depuis ton code ou ton agent IA.',
  icons: { icon: '/favicon.svg' },
  openGraph: { siteName: 'Hopla', locale: 'fr_FR', images: '/og.png' },
};

export const viewport: Viewport = { themeColor: '#292bff' };

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
