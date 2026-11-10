import type { Plan } from './abonnement.ts';
import type { ComptePage, DomaineCourt } from './types.ts';
import { adressePartage } from './types.ts';

/*
 * Les liens courts (10 novembre 2026, lot 2 d'après Taap.it, demandé par Lilian) : une adresse à soi,
 * `hopla.page/<pseudo>/<code>` (ou `hpla.eu/<pseudo>/<code>`, qui y renvoie), à coller dans une story, un post ou un
 * e-mail. Elle mène où l'on veut, ouvre YouTube, Spotify ou Instagram dans leur app depuis le navigateur intégré d'un
 * réseau, et compte ses clics. Changer la destination ne change pas l'adresse déjà partagée.
 */

export interface LienCourt {
  id: string; code: string; url: string; titre: string; cree: number;
  /** Les clics depuis toujours, et sur les sept derniers jours. */
  clics: number; semaine: number;
}

/** Combien de liens courts par offre. L'essai garde la limite de l'offre qu'on a vraiment : un redirecteur ne s'ouvre pas en grand à tout compte neuf. */
export const MAX_LIENS_COURTS: Record<Plan, number> = { gratuit: 5, starter: 50, pro: 500, premium: 500 };

/** Ce que les pages se réservent sous `/<pseudo>/…`. */
const CODES_RESERVES = new Set(['admin', 'api', 'media', 'assets', 'qr', 'stats']);

/** Le code tapé, mis au propre : minuscules, chiffres et tirets, de 2 à 40 signes ; vide s'il ne peut pas servir. */
export function codeCourt(v: unknown): string {
  const s = String(v ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return s.length >= 2 && !CODES_RESERVES.has(s) ? s : '';
}

/** L'adresse à partager d'un lien court, sur le nom que la page a choisi. */
export const adresseCourte = (compte: ComptePage, code: string, domaine: DomaineCourt | '') => `${adressePartage(compte, domaine)}/${code}`;
