/*
 * Ce qu'est une adresse collée (23 octobre 2026, demandé par Lilian : « que ça détecte automatiquement de quoi il
 * s'agit ») : une vidéo YouTube, Vimeo ou TikTok s'affiche dans la page, un titre ou un podcast Spotify, Apple Music,
 * Deezer ou SoundCloud devient un lecteur (24 octobre 2026), un agenda devient une prise de rendez-vous, PayPal ou Ko-fi un
 * « Me soutenir », la fiche d'un produit sur Etsy ou Gumroad un produit. Le reste est un lien. Seule l'adresse compte
 * ici, rien n'est demandé au site ; une page qui déclare un prix (une boutique Shopify, WooCommerce…) devient un
 * produit une fois lue, dans l'éditeur. Les blocs de la vitrine demandent Starter : sans elle, l'adresse reste un lien.
 */
import type { Bloc, TypeBloc } from './types.ts';
import { nouveauBloc } from './types.ts';
import { agendaDe, avecMontants, soutienDe } from './vitrine.ts';
import { estMusique, estVideo } from './lecteurs.ts';

/** Ce que peut devenir une adresse collée. */
export type TypeAdresse = Extract<TypeBloc, 'lien' | 'video' | 'musique' | 'reservation' | 'soutien' | 'produit'>;

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

/**
 * Les régies d'affiliation (24 octobre 2026) : un lien qui passe par elles rapporte une commission. Les liens courts
 * d'Amazon, Awin, Tradedoubler, Effiliation, Kwanko, Rakuten, ShareASale, CJ, Impact, Partnerize, Skimlinks, LTK,
 * Geniuslink, Howl et ShopMy.
 */
const REGIES = [
  'amzn.to', 'amzn.eu', 'a.co', 'awin1.com', 'tidd.ly', 'tradedoubler.com', 'effiliation.com', 'metaffiliation.com', 'linksynergy.com',
  'shareasale.com', 'shrsl.com', 'anrdoezrs.net', 'dpbolvw.net', 'jdoqocy.com', 'kqzyfj.com', 'tkqlhce.com', 'sjv.io', 'pxf.io', 'prf.hn',
  'skimresources.com', 'redirectingat.com', 'rstyle.me', 'liketk.it', 'liketoknow.it', 'shopltk.com', 'geni.us', 'howl.me', 'shopmy.us',
];
/** Ce que posent les programmes d'affiliation dans l'adresse : Rewardful (`via`), FirstPromoter (`fpr`), Lemon Squeezy (`aff`)… */
const PARAMS_AFFILIATION = /^(aff|affid|aff_id|affiliate|affiliate_id|affiliateid|fpr|via|ref_id|referral|referral_code)$/i;

/**
 * Un lien d'affiliation, reconnu à son adresse : une régie, une boutique Amazon avec son `tag` ou sa vitrine
 * d'influenceur, un lien affilié Gumroad, ou un paramètre d'affiliation. L'éditeur propose alors d'en faire un lien
 * partenaire, avec sa mention ; rien ne change sans la personne. Un `ref` seul ne compte pas : il sert aussi à dire
 * d'où vient le visiteur.
 */
export function lienAffilie(url: string): boolean {
  let u: URL;
  try { u = new URL(url); } catch { return false; }
  if (!/^https?:$/.test(u.protocol)) return false;
  const h = u.hostname.toLowerCase().replace(/^www\./, ''), c = chemin(url);
  if (REGIES.some(d => sur(h, d))) return true;
  if (/(^|\.)amazon\.[a-z]{2,3}(\.[a-z]{2})?$/.test(h) && (u.searchParams.has('tag') || c[0] === 'shop')) return true;
  if (sur(h, 'gumroad.com') && (c[0] === 'a' || u.searchParams.has('a'))) return true;
  return [...u.searchParams].some(([k, v]) => PARAMS_AFFILIATION.test(k) || (/^utm_(source|medium|campaign)$/i.test(k) && /affil/i.test(v)));
}

/** Ce que devient une adresse : `vitrine`, la page a les blocs de la vitrine (Starter). */
export function typeDeAdresse(url: string, vitrine: boolean): TypeAdresse {
  // Une vidéo YouTube, Vimeo ou TikTok, un titre ou un podcast sur Spotify, Deezer… se lisent dans la page, pour tous.
  if (estVideo(url)) return 'video';
  if (estMusique(url)) return 'musique';
  if (vitrine && pourReserver(url)) return 'reservation';
  if (vitrine && pourSoutenir(url)) return 'soutien';
  if (vitrine && ficheProduit(url)) return 'produit';
  return 'lien';
}

/** Ce que deux types de blocs ont en commun et qu'un changement de type garde : le sous-titre, l'icône, l'animation. */
const AVEC_SOUS_TITRE: readonly TypeBloc[] = ['lien', 'newsletter', 'inscription', 'soutien', 'reservation'];
const AVEC_ICONE: readonly TypeBloc[] = ['lien', 'reservation'];
const AVEC_ANIMATION: readonly TypeBloc[] = ['lien', 'produit', 'reservation'];
const enCommun = (types: readonly TypeBloc[], de: TypeBloc, vers: TypeBloc) => types.includes(de) && types.includes(vers);

/**
 * Un bloc qui change de type avec son adresse : il garde l'adresse, la visibilité, la programmation et le public
 * visé, et ce que les deux types montrent l'un comme l'autre (le sous-titre, l'icône, l'animation) ; le reste repart
 * de zéro. Son texte aussi, sauf s'il a été tapé à la main (`texteAMoi`).
 */
export function versType(b: Bloc, type: TypeBloc, texteAMoi: boolean): Bloc {
  const neuf = nouveauBloc(type, b.id);
  return {
    ...neuf,
    url: b.url, public: b.public, indexable: b.indexable, vedette: type !== 'soutien' && b.vedette,
    debut: b.debut, fin: b.fin, compteARebours: b.compteARebours, creneau: b.creneau, audience: b.audience, cache: b.cache,
    titre: texteAMoi && b.titre.trim() ? b.titre : neuf.titre,
    ...(enCommun(AVEC_SOUS_TITRE, b.type, type) ? { sousTitre: b.sousTitre } : {}),
    ...(enCommun(AVEC_ICONE, b.type, type) ? { icone: b.icone } : {}),
    ...(enCommun(AVEC_ANIMATION, b.type, type) ? { animation: b.animation } : {}),
  };
}
