/*
 * Ce qu'est une adresse collée (23 octobre 2026, demandé par Lilian : « que ça détecte automatiquement de quoi il
 * s'agit ») : une vidéo YouTube s'affiche dans la page, un agenda devient une prise de rendez-vous, PayPal ou Ko-fi un
 * « Me soutenir », la fiche d'un produit sur Etsy ou Gumroad un produit. Le reste est un lien. Seule l'adresse compte
 * ici, rien n'est demandé au site ; une page qui déclare un prix (une boutique Shopify, WooCommerce…) devient un
 * produit une fois lue, dans l'éditeur. Les blocs de la vitrine demandent Starter : sans elle, l'adresse reste un lien.
 */
import type { Bloc, TypeBloc } from './types.ts';
import { idYoutube, nouveauBloc } from './types.ts';
import { agendaDe, avecMontants, soutienDe } from './vitrine.ts';

/** Ce que peut devenir une adresse collée. */
export type TypeAdresse = Extract<TypeBloc, 'lien' | 'video' | 'reservation' | 'soutien' | 'produit'>;

const hote = (url: string) => { try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };
const chemin = (url: string) => { try { return new URL(url).pathname.split('/').filter(Boolean).map(c => c.toLowerCase()); } catch { return []; } };
const sur = (h: string, domaine: string) => h === domaine || h.endsWith(`.${domaine}`);

/** Les pages d'un site d'agenda ou de soutien qui ne sont pas celles d'une personne : ses prix, son blog, son aide. */
const PAGES_DU_SITE = /^(pricing|tarifs|prix|blog|features|fonctionnalites|login|signin|sign-in|signup|sign-up|register|solutions|resources|integrations|about|careers|jobs|legal|privacy|terms|help|support|docs|download|enterprise|customers|product|products|contact|home|explore|discover|search|posts?|s|shop|creators?|manifesto)$/;

/** La page de réservation d'une personne : un agenda connu, avec son adresse à elle (pas l'accueil de l'agenda). */
export function pourReserver(url: string): boolean {
  const a = agendaDe(url);
  if (!a) return false;
  const h = hote(url), c = chemin(url);
  // Google : la page de rendez-vous, pas l'agenda lui-même ; Acuity et YouCanBook.me mettent le compte dans le sous-domaine.
  if (a === 'google') return h === 'calendar.app.google' ? c.length > 0 : c.includes('appointments');
  if ((a === 'acuity' && h.endsWith('.as.me')) || (a === 'youcanbook' && h !== 'youcanbook.me')) return true;
  return c.length > 0 && !PAGES_DU_SITE.test(c[0]);
}

/** La page de soutien d'une personne : PayPal.Me, Ko-fi, Tipeee, Lydia, Buy Me a Coffee ou Patreon, à son nom. */
export function pourSoutenir(url: string): boolean {
  const s = soutienDe(url);
  if (!s) return false;
  if (s === 'paypal') return avecMontants(url);
  const c = chemin(url);
  return c.length > 0 && !PAGES_DU_SITE.test(c[0]);
}

/** La fiche d'un produit sur une place de marché ou une boutique de créateur, reconnue à son adresse. */
export function ficheProduit(url: string): boolean {
  const h = hote(url), c = chemin(url);
  const apres = (mot: string) => { const i = c.indexOf(mot); return i >= 0 && !!c[i + 1]; };
  if (sur(h, 'etsy.com')) return apres('listing');
  if (sur(h, 'gumroad.com')) return apres('l');
  if (sur(h, 'lemonsqueezy.com')) return apres('buy');
  if (h === 'payhip.com') return c[0] === 'b' && !!c[1];
  if (h === 'stan.store') return c[1] === 'p' && !!c[2];
  if (h === 'ko-fi.com') return c[0] === 's' && !!c[1];
  if (sur(h, 'sellfy.com') || sur(h, 'sellfy.store')) return c[0] === 'p' && !!c[1];
  return false;
}

/** Ce que devient une adresse : `vitrine`, la page a les blocs de la vitrine (Starter). */
export function typeDeAdresse(url: string, vitrine: boolean): TypeAdresse {
  if (idYoutube(url)) return 'video';
  if (vitrine && pourReserver(url)) return 'reservation';
  if (vitrine && pourSoutenir(url)) return 'soutien';
  if (vitrine && ficheProduit(url)) return 'produit';
  return 'lien';
}

/**
 * Un bloc neuf qui change de type avec son adresse : il garde l'adresse, la visibilité, la programmation et le public
 * visé ; le reste repart de zéro. Son texte aussi, sauf s'il a été tapé à la main (`texteAMoi`).
 */
export function versType(b: Bloc, type: TypeBloc, texteAMoi: boolean): Bloc {
  const neuf = nouveauBloc(type, b.id);
  return {
    ...neuf,
    url: b.url, public: b.public, indexable: b.indexable, vedette: type !== 'soutien' && b.vedette,
    debut: b.debut, fin: b.fin, compteARebours: b.compteARebours, creneau: b.creneau, audience: b.audience, cache: b.cache,
    titre: texteAMoi && b.titre.trim() ? b.titre : neuf.titre,
  };
}
