import { llms, loader } from 'fumadocs-core/source';
import { defineDocs } from 'fumadocs-mdx/macro';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { basePath, docsRoute, siteUrl } from './shared';

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema,
    postprocess: { includeProcessedMarkdown: true },
  },
  meta: { schema: metaSchema },
});

export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  plugins: [],
});

/** Pour les agents IA : /docs/llms.txt (le sommaire) et le Markdown de chaque page. */
export const docsLlms = llms(source, {
  renderPage: async page => `# ${page.data.title} (${siteUrl}${basePath}${page.url === '/' ? '' : page.url})

${await page.data.getText('processed')}`,
});
