import { DESCRIPTION, FONCTIONS, questions } from '../accueil/textes.ts';
import { OFFRES, OFFRES_EN, PLANS, avantage, euros, nomOffre } from '../lib/abonnement.ts';
import { DOCUMENTS, LEGAL } from '../lib/legal.ts';
import { ORIGINE_ADMIN, ORIGINE_PUBLIQUE, PRINCIPAL, SITE_LILIAN } from '../lib/types.ts';
import { PAGES_FONCTIONS } from '../accueil/pages/fonctions.ts';
import { COMPARATIFS } from '../accueil/pages/comparatifs.ts';
import * as db from './db.ts';
import { inscriptionLibre } from './attente.ts';

/*
 * Ce que Hopla dit aux robots : robots.txt, sitemap.xml et llms.txt. Sur
 * hopla.page, tout se lit ; le back office (app.hopla.page) ne s'indexe pas.
 * Les pages des comptes restent hors de Google pendant la bêta (voir
 * `lib/tete.ts`) : le plan du site ne liste que l'accueil, les pages des fonctions et des comparatifs, la page de Lilian
 * quand elle est visible par Google, et les textes légaux.
 */

/** L'origine publique à écrire dans les adresses, et si la demande vise le back office. */
export function lieu(request: Request, env = process.env) {
  const url = new URL(request.url);
  const prod = env.NODE_ENV === 'production';
  const publique = prod ? env.LIENS_ORIGINE || ORIGINE_PUBLIQUE : url.origin;
  const admin = prod ? env.LIENS_ORIGINE_ADMIN || ORIGINE_ADMIN : url.origin;
  const hote = url.host;
  return { publique, admin: hote === new URL(admin).host && hote !== new URL(publique).host };
}

export function robots(publique: string, admin: boolean): string {
  if (admin) return 'User-agent: *\nDisallow: /\n';
  return `# Hopla : les pages de liens sur ${publique}/<nom>.
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /_serverFn/
Disallow: /signaler

Sitemap: ${publique}/sitemap.xml
`;
}

/** Les pages de la documentation, celles de documentation/content/docs et la référence. */
const PAGES_DOCS = ['', '/quickstart', '/authentication', '/mcp', '/blocks', '/settings', '/analytics', '/errors', '/reference'];

const echapper = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function plan(publique: string): string {
  const adresses = [`${publique}/`, `${publique}/fr`];
  const lilian = db.compteParId(PRINCIPAL);
  if (lilian && db.lireReglages(PRINCIPAL).seo.indexable) adresses.push(`${publique}/${lilian.pseudo}`);
  adresses.push(`${publique}/fonctionnalites`, ...PAGES_FONCTIONS.map(p => `${publique}/fonctionnalites/${p.slug}`));
  adresses.push(`${publique}/comparatif`, ...COMPARATIFS.map(c => `${publique}/comparatif/${c.slug}`));
  adresses.push(...DOCUMENTS.map(d => `${publique}/legal/${d}`));
  // La documentation de l'API (hopla.page/docs, un site statique à part : documentation/).
  adresses.push(...PAGES_DOCS.map(d => `${publique}/docs${d}`));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${adresses.map(a => `  <url><loc>${echapper(a)}</loc></url>`).join('\n')}
</urlset>
`;
}

/**
 * Le résumé de Hopla pour les IA (https://llmstxt.org) : les mêmes faits que l'accueil, en anglais depuis le 8 novembre
 * 2026 (Hopla anglais d'abord). Les pages des fonctions, des comparatifs et les textes légaux sont encore en français.
 */
export function llms(publique: string, env = process.env): string {
  const mode = inscriptionLibre(env) ? 'libre' : 'attente';
  return `# Hopla

> The link in bio page that adapts to every visitor. ${DESCRIPTION.en}

Hopla is an independent service made in France by Lilian Sevoumian (${SITE_LILIAN}). Each page lives at ${publique}/<name> and is edited from a phone. ${mode === 'libre' ? `You create yours from ${publique}/: pick a name, leave your email address, and the link to your page arrives right away.` : `Pages open by invitation: you claim your name from ${publique}/.`}

## What Hopla does

${FONCTIONS.en.map(f => `- ${f}`).join('\n')}

## Pricing

${PLANS.map(p => {
  const o = OFFRES[p];
  const prix = p === 'gratuit' ? `${euros(0, 'en')}, forever` : `${euros(o.prix.mois, 'en')} per month, or ${euros(o.prix.an, 'en')} per year${o.enVente ? '' : ' (coming soon)'}`;
  return `- ${nomOffre(p, 'en')}: ${prix}. ${OFFRES_EN[p].phrase}\n${o.avantages.map(a => `  - ${avantage(a, 'en')}`).join('\n')}`;
}).join('\n')}

## FAQ

${questions(mode, 'en').map(([q, r]) => `### ${q}\n\n${r}`).join('\n\n')}

## Links

- [Hopla home page](${publique}/): overview, themes, pricing${mode === 'libre' ? ', page creation' : ', name reservation'}
- [Hopla in French](${publique}/fr)
- [An example: Lilian Sevoumian’s page](${publique}/lilian)
- [Hopla’s features](${publique}/fonctionnalites), one page each (in French):
${PAGES_FONCTIONS.map(p => `  - [${p.nom}](${publique}/fonctionnalites/${p.slug}) : ${p.resume}`).join('\n')}
- [Hopla compared with other tools](${publique}/comparatif) (in French):
${COMPARATIFS.map(c => `  - [Hopla vs ${c.nom}](${publique}/comparatif/${c.slug}) : ${c.resume}`).join('\n')}
- [API and MCP server documentation](${publique}/docs): manage your page from an AI agent or your own code (Pro plan); for agents, [${publique}/docs/llms.txt](${publique}/docs/llms.txt)
${DOCUMENTS.map(d => `- [${LEGAL[d].titre}](${publique}/legal/${d}) : ${LEGAL[d].resume}`).join('\n')}
`;
}
