import type { Metadata, Viewport } from 'next';
import { Provider } from '@/components/provider';
import '@fontsource-variable/geist';
import '@fontsource-variable/bricolage-grotesque';
import './global.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://hopla.page/docs/'),
  title: { default: 'Hopla Docs', template: '%s · Hopla Docs' },
  description: 'Hopla REST API and MCP server: manage a link-in-bio page from your code or an AI agent.',
  icons: { icon: '/favicon.svg' },
  openGraph: { siteName: 'Hopla', locale: 'en_US', images: '/og.png' },
};

export const viewport: Viewport = { themeColor: '#292bff' };

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
