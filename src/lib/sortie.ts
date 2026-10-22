import { audienceDeLApp } from './provenance.ts';

/*
 * Sortir du navigateur intégré d'une app pour ouvrir la page dans le vrai
 * navigateur du visiteur (Safari, Chrome…), là où ses comptes sont connectés et
 * où les liens lancent leurs apps. Seulement là où une adresse le permet,
 * d'après les essais publiés par inappdebugger.com sur les dernières versions :
 *   iPhone : `x-safari-https://` ouvre Safari, par le lien lui-même (LinkedIn,
 *            Messenger) ou par `window.open` (Facebook et Threads ignorent le
 *            lien) ; Instagram a son adresse, `instagram://extbrowser/`.
 *   Android : une adresse `intent://` sans paquet, que reçoit le navigateur par
 *            défaut (Instagram, Facebook, Messenger, Threads). LinkedIn, X et
 *            Snapchat y ouvrent déjà les liens dans Chrome.
 * TikTok, X et Snapchat sur iPhone, TikTok sur Android, n'en laissent aucune de
 * sûre : pas d'écran, la page s'ouvre comme avant.
 */

export interface Sortie {
  /** L'adresse qui ouvre la page hors de l'app. */
  adresse: string;
  /** Facebook et Threads n'obéissent qu'à `window.open` ; les autres au lien lui-même. */
  fenetre: boolean;
  /** `x-safari-https` ouvre toujours Safari : le bouton peut le nommer. */
  safari: boolean;
  /** Sur Android, le menu de l'app se signale par trois points debout, pas couchés. */
  android: boolean;
  /** La page elle-même, à copier si rien ne s'ouvre. */
  lien: string;
}

/** Combien de minutes `suite` vaut : le temps de passer de l'app au navigateur, ou de recharger la page. */
export const DUREE_SUITE = 15;

/** La minute d'un instant, ce que porte `suite`. */
export const minuteDe = (instant: number) => Math.floor(instant / 60_000);

/**
 * La page rouverte hors de l'app : sa provenance (`s`) la suit, pour la page
 * selon le réseau et les stats, et `suite` dit que la visite est déjà comptée.
 * Le repère porte sa minute et périme : copié puis partagé, le lien redevient
 * une visite comme une autre.
 */
export function lienDeSuite(page: string, s: string, instant: number): string {
  const u = new URL(page);
  if (s) u.searchParams.set('s', s);
  u.searchParams.set('suite', String(minuteDe(instant)));
  return u.toString();
}

/** `suite` posé il y a moins de `DUREE_SUITE` minutes, à l'heure du serveur qui l'a posé. */
export function suiteRecente(suite: unknown, instant: number): boolean {
  const minute = typeof suite === 'string' && /^\d+$/.test(suite) ? Number(suite) : suite;
  if (typeof minute !== 'number' || !Number.isInteger(minute)) return false;
  const ecart = minuteDe(instant) - minute;
  return ecart >= 0 && ecart < DUREE_SUITE;
}

/** De quoi sortir de l'app qui ouvre la page (`ua`), ou `null` : hors d'une app, ou dans une app qui ne laisse pas sortir. */
export function sortieDuNavigateur(lien: string, ua: string): Sortie | null {
  let u: URL;
  try { u = new URL(lien); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const app = audienceDeLApp(ua);
  if (/Android/i.test(ua)) {
    if (app !== 'instagram' && app !== 'facebook' && app !== 'threads') return null;
    return { adresse: `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;end`, fenetre: false, safari: false, android: true, lien };
  }
  if (!/iPhone|iPad|iPod/i.test(ua)) return null;
  if (app === 'instagram') return { adresse: `instagram://extbrowser/?url=${encodeURIComponent(lien)}`, fenetre: false, safari: false, android: false, lien };
  const safari = `x-safari-${lien}`;
  if (app === 'linkedin') return { adresse: safari, fenetre: false, safari: true, android: false, lien };
  if (app === 'facebook') return { adresse: safari, fenetre: !/Messenger/i.test(ua), safari: true, android: false, lien };
  if (app === 'threads') return { adresse: safari, fenetre: true, safari: true, android: false, lien };
  return null;
}
