import { createGetUrl } from 'fumadocs-core/source';

export const appName = 'Hopla';
/** Le chemin de base de Next (next.config.mjs) : ce que les liens écrits à la main et les `fetch` doivent ajouter. */
export const basePath = '/docs';
export const siteUrl = 'https://hopla.page';
export const docsRoute = '/';
export const docsContentRoute = '/llms.mdx';

const getContentUrl = createGetUrl(docsContentRoute);

/** Le Markdown d'une page, pour « Copier en Markdown » et les agents IA. */
export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'content.md'];
  return { segments, url: `${basePath}${getContentUrl(segments, page.locale)}` };
}
