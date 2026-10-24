/*
 * La vitrine (Starter, 22 octobre 2026) : un produit et son prix, « Me soutenir »,
 * « Réserver ». Hopla n'encaisse rien et ne réserve rien : chaque bloc mène au
 * site qui le fait. Ici, ce que la page sait de ces sites : leur nom, l'adresse
 * d'un montant chez PayPal, et les agendas qui s'ouvrent dans la page.
 */

/** L'hôte d'une adresse, sans « www. » ; vide si l'adresse n'en est pas une. */
function hote(url: string): string {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; }
}
const chemin = (url: string) => { try { return new URL(url).pathname.split('/').filter(Boolean); } catch { return []; } };
const sur = (h: string, domaine: string) => h === domaine || h.endsWith(`.${domaine}`);

/** Les sites de soutien que la page sait nommer. */
export const NOMS_SOUTIEN = { paypal: 'PayPal', kofi: 'Ko-fi', tipeee: 'Tipeee', lydia: 'Lydia', buymeacoffee: 'Buy Me a Coffee', patreon: 'Patreon' } as const;
export type Soutien = keyof typeof NOMS_SOUTIEN;

/** Le compte PayPal.Me d'une adresse (« paypal.me/lilian », « paypal.com/paypalme/lilian »), sans montant ; null sinon. */
function comptePaypal(url: string): string | null {
  const h = hote(url), c = chemin(url);
  if (h === 'paypal.me' && c[0]) return `https://paypal.me/${c[0]}`;
  if (h === 'paypal.com' && c[0]?.toLowerCase() === 'paypalme' && c[1]) return `https://www.paypal.com/paypalme/${c[1]}`;
  return null;
}

export function soutienDe(url: string): Soutien | null {
  const h = hote(url);
  if (comptePaypal(url) || h === 'paypal.me') return 'paypal';
  if (h === 'ko-fi.com') return 'kofi';
  if (sur(h, 'tipeee.com')) return 'tipeee';
  if (sur(h, 'lydia-app.com') || sur(h, 'lydia.me')) return 'lydia';
  if (h === 'buymeacoffee.com' || h === 'buymeacoff.ee') return 'buymeacoffee';
  if (sur(h, 'patreon.com')) return 'patreon';
  return null;
}

/** Le nom du site où l'on paie, pour « Soutenir sur Ko-fi » : connu, ou son domaine. */
export const nomSoutien = (url: string) => { const s = soutienDe(url); return s ? NOMS_SOUTIEN[s] : hote(url); };

/** Seul PayPal.Me reprend un montant dans son adresse : les autres sites le font choisir chez eux. */
export const avecMontants = (url: string) => comptePaypal(url) !== null;

/** L'adresse PayPal.Me qui propose déjà ce montant, en euros : « paypal.me/lilian/5EUR ». */
export function lienMontant(url: string, montant: number): string {
  const compte = comptePaypal(url);
  return compte ? `${compte}/${montant}EUR` : url;
}

/** L'adresse sans montant, pour « Autre montant » : le visiteur le tape chez PayPal. */
export const lienSansMontant = (url: string) => comptePaypal(url) ?? url;

/** Les agendas que la page sait nommer. */
export const NOMS_AGENDA = {
  calendly: 'Calendly', calcom: 'Cal.com', lemcal: 'lemcal', google: 'Google Agenda', planity: 'Planity', doctolib: 'Doctolib',
  tidycal: 'TidyCal', zcal: 'zcal', savvycal: 'SavvyCal', hubspot: 'HubSpot', acuity: 'Acuity', youcanbook: 'YouCanBook.me',
} as const;
export type Agenda = keyof typeof NOMS_AGENDA;

export function agendaDe(url: string): Agenda | null {
  const h = hote(url);
  if (sur(h, 'calendly.com')) return 'calendly';
  if (h === 'cal.com' || h === 'app.cal.com' || h === 'cal.eu') return 'calcom';
  if (sur(h, 'lemcal.com')) return 'lemcal';
  if (h === 'calendar.google.com' || h === 'calendar.app.google') return 'google';
  if (sur(h, 'planity.com')) return 'planity';
  if (/(^|\.)doctolib\.(fr|de|it)$/.test(h)) return 'doctolib';
  if (h === 'tidycal.com') return 'tidycal';
  if (h === 'zcal.co') return 'zcal';
  if (h === 'savvycal.com') return 'savvycal';
  if (/^meetings(-[a-z0-9]+)?\.hubspot\.com$/.test(h)) return 'hubspot';
  if (sur(h, 'as.me') || sur(h, 'acuityscheduling.com')) return 'acuity';
  if (sur(h, 'youcanbook.me')) return 'youcanbook';
  return null;
}

export const nomAgenda = (url: string) => { const a = agendaDe(url); return a ? NOMS_AGENDA[a] : hote(url); };

/**
 * L'adresse à charger dans la feuille de réservation, ou null quand le site ne se laisse pas
 * intégrer : il s'ouvre alors à part, comme un lien. Calendly reçoit les réglages de son
 * intégration (`embed_domain`, `embed_type`) ; Cal.com se charge tel quel ; Google Agenda dans
 * la vue qu'il donne pour être intégré (`gv=true`), seulement depuis son adresse longue.
 * `domaine` : celui de la page, que Calendly demande.
 */
export function adresseIntegree(url: string, domaine: string): string | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const a = agendaDe(url), c = chemin(url);
  if (a === 'calendly' && c.length) {
    u.searchParams.set('embed_domain', domaine);
    u.searchParams.set('embed_type', 'Inline');
    return u.toString();
  }
  if (a === 'calcom' && c.length) return u.toString();
  if (a === 'google' && hote(url) === 'calendar.google.com' && c.slice(0, 3).join('/') === 'calendar/appointments/schedules' && c[3]) {
    u.searchParams.set('gv', 'true');
    return u.toString();
  }
  return null;
}

/** Ce lien de réservation s'ouvre-t-il dans la page ? */
export const seIntegre = (url: string) => adresseIntegree(url, 'hopla.page') !== null;

/**
 * Le logo du site d'une adresse, quand Hopla en a un (24 octobre 2026) : un agenda, une page de soutien, une boutique. Le
 * choix des blocs le pose sur la ligne que l'adresse appelle, à la place du picto ; les réseaux ont le leur
 * (`reseauDeUrl`). Cal.com n'en a pas ici : son logo, tout en largeur, ne tient pas dans un carré.
 */
export function logoAdresse(url: string): string | undefined {
  const h = hote(url);
  if (!h) return undefined;
  const a = agendaDe(url);
  if (a === 'calendly' || a === 'google') return a;
  const s = soutienDe(url);
  if (s === 'paypal' || s === 'kofi' || s === 'patreon') return s;
  if (sur(h, 'stripe.com')) return 'stripe';
  if (sur(h, 'myshopify.com') || h === 'shop.app') return 'shopify';
  if (sur(h, 'etsy.com') || h === 'etsy.me') return 'etsy';
  return undefined;
}
