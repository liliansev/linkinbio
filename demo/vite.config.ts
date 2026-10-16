import { defineConfig } from 'vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// L'aperçu en un seul fichier HTML (Artifact) : tout est inliné ensuite par inline.mjs.
export default defineConfig({
  root: __dirname,
  base: './',
  plugins: [tailwindcss(), viteReact()],
  build: { outDir: 'dist', emptyOutDir: true, assetsInlineLimit: 100_000_000, cssCodeSplit: false, modulePreload: false },
});
