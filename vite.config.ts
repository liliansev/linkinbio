import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/liens/',
  server: { port: 4400 },
  resolve: { tsconfigPaths: true },
  ssr: { noExternal: true },
  plugins: [tailwindcss(), tanstackStart({ srcDirectory: 'src' }), viteReact()],
});
