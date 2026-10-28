import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/*
 * La documentation est un site statique (`out/`), servi par deploy/server.mjs sur hopla.page/docs : pas de
 * serveur Next en production, d'où `output: 'export'` et le chemin de base.
 */
/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  basePath: '/docs',
  reactStrictMode: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  // Le dépôt a son propre pnpm-lock.yaml à la racine : la documentation est un projet à part.
  turbopack: { root: import.meta.dirname },
};

export default withMDX(config);
