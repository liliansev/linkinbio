import type { Bloc, Reglages } from './types.ts';
import { DOMAINES_COURTS, ORIGINE_PUBLIQUE } from './types.ts';

/** Un nom court renvoie vers hopla.page : pour savoir où mène une adresse, il vaut hopla.page. */
const hote = (h: string) => ((DOMAINES_COURTS as readonly string[]).includes(h.replace(/^www\./, '')) ? new URL(ORIGINE_PUBLIQUE).host : h);

/*
 * Ce qui part de la page (24 octobre 2026, rattrapé de Linktree) : les liens marqués `utm_source=hopla`, pour que le
 * site d'arrivée voie d'où vient le visiteur, et la redirection de toute la page vers une seule adresse.
 */

/** Les blocs dont l'adresse mène à un site qu'on visite : un lien, un produit. Une page de soutien ou un agenda garde la sienne. */
const AVEC_UTM: readonly Bloc['type'][] = ['lien', 'produit'];

/**
 * L'adresse d'un lien, marquée pour le site d'arrivée : `utm_source=hopla&utm_medium=referral`, comme le fait Linktree.
 * Une adresse qui porte déjà ses UTM les garde ; une autre page Hopla, un e-mail ou un numéro ne changent pas.
 */
export function avecUtm(url: string): string {
  let u: URL;
  try { u = new URL(url); } catch { return url; }
  if (!/^https?:$/.test(u.protocol) || /(^|\.)hopla\.page$/.test(u.hostname)) return url;
  if ([...u.searchParams.keys()].some(k => k.toLowerCase().startsWith('utm_'))) return url;
  u.searchParams.set('utm_source', 'hopla');
  u.searchParams.set('utm_medium', 'referral');
  return u.href;
}

/** Les blocs de la page publique, leurs liens marqués quand la page le demande. */
export const blocsAvecUtm = <T extends Bloc>(reglages: Reglages, blocs: T[]): T[] =>
  reglages.utm ? blocs.map(b => (AVEC_UTM.includes(b.type) && b.url ? { ...b, url: avecUtm(b.url) } : b)) : blocs;

/**
 * L'adresse vers laquelle la page renvoie en ce moment, ou null : pas de redirection, sa fin passée, ou une adresse qui
 * ramènerait sur la page elle-même (`ici`, son adresse) et tournerait en rond.
 */
export function redirectionActive(r: Reglages['redirection'], maintenant: number, ici?: string): string | null {
  if (!r.url || (r.fin && Date.parse(r.fin) <= maintenant)) return null;
  if (ici) {
    try {
      const a = new URL(r.url), b = new URL(ici);
      if (hote(a.host) === hote(b.host) && a.pathname.replace(/\/+$/, '') === b.pathname.replace(/\/+$/, '')) return null;
    } catch { return null; }
  }
  return r.url;
}
