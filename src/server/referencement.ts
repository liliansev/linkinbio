import { DESCRIPTION, FONCTIONS, questions } from '../accueil/textes.ts';
import { OFFRES, PLANS, euros } from '../lib/abonnement.ts';
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

const echapper = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function plan(publique: string): string {
  const adresses = [`${publique}/`];
  const lilian = db.compteParId(PRINCIPAL);
  if (lilian && db.lireReglages(PRINCIPAL).seo.indexable) adresses.push(`${publique}/${lilian.pseudo}`);
  adresses.push(`${publique}/fonctionnalites`, ...PAGES_FONCTIONS.map(p => `${publique}/fonctionnalites/${p.slug}`));
  adresses.push(`${publique}/comparatif`, ...COMPARATIFS.map(c => `${publique}/comparatif/${c.slug}`));
  adresses.push(...DOCUMENTS.map(d => `${publique}/legal/${d}`));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${adresses.map(a => `  <url><loc>${echapper(a)}</loc></url>`).join('\n')}
</urlset>
`;
}

/** Le résumé de Hopla pour les IA (https://llmstxt.org) : les mêmes faits que l'accueil. */
export function llms(publique: string, env = process.env): string {
  const mode = inscriptionLibre(env) ? 'libre' : 'attente';
  return `# Hopla

> La page de liens qui s’adapte à chaque visiteur. ${DESCRIPTION}

Hopla est un service français, créé par Lilian Sevoumian (${SITE_LILIAN}). Chaque page vit sur ${publique}/<nom> et se modifie depuis un téléphone. ${mode === 'libre' ? `On crée la sienne depuis ${publique}/ : on choisit son nom, on laisse son adresse e-mail, et le lien pour entrer dans sa page arrive aussitôt.` : `Les pages s’ouvrent sur invitation : on réserve son nom depuis ${publique}/.`}

## Ce que fait Hopla

${FONCTIONS.map(f => `- ${f}`).join('\n')}

## Prix

${PLANS.map(p => {
  const o = OFFRES[p];
  const prix = p === 'gratuit' ? '0 €, pour toujours' : `${euros(o.prix.mois)} par mois, ou ${euros(o.prix.an)} par an${o.enVente ? '' : ' (bientôt)'}`;
  return `- ${o.nom} : ${prix}. ${o.phrase}\n${o.avantages.map(a => `  - ${a}`).join('\n')}`;
}).join('\n')}

## Questions fréquentes

${questions(mode).map(([q, r]) => `### ${q}\n\n${r}`).join('\n\n')}

## Liens

- [Accueil de Hopla](${publique}/) : présentation, thèmes, prix${mode === 'libre' ? ', création d’une page' : ', réservation d’un nom'}
- [Un exemple : la page de Lilian Sevoumian](${publique}/lilian)
- [Les fonctionnalités de Hopla](${publique}/fonctionnalites), une page chacune :
${PAGES_FONCTIONS.map(p => `  - [${p.nom}](${publique}/fonctionnalites/${p.slug}) : ${p.resume}`).join('\n')}
- [Hopla face aux autres outils](${publique}/comparatif) :
${COMPARATIFS.map(c => `  - [Hopla vs ${c.nom}](${publique}/comparatif/${c.slug}) : ${c.resume}`).join('\n')}
${DOCUMENTS.map(d => `- [${LEGAL[d].titre}](${publique}/legal/${d}) : ${LEGAL[d].resume}`).join('\n')}
`;
}
