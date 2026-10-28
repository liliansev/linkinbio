import { defineConfig, loadEnv } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { valeursDuBuild } from './src/lib/instance.ts';

export default defineConfig(({ mode }) => ({
  base: '/',
  server: { port: 4400 },
  resolve: { tsconfigPaths: true },
  ssr: { noExternal: true },
  // L'instance (src/lib/instance.ts) : ses adresses et son identité légale, lues dans le fichier .env ou l'environnement du build.
  define: { __HOPLA_INSTANCE__: JSON.stringify(valeursDuBuild({ ...loadEnv(mode, process.cwd(), 'LIENS_'), ...process.env })) },
  plugins: [tailwindcss(), tanstackStart({ srcDirectory: 'src' }), viteReact()],
}));
