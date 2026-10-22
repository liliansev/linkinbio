import { ORIGINE_ADMIN, ORIGINE_PUBLIQUE } from '../lib/types.ts';
import type { ActionTurnstile } from '../lib/turnstile.ts';
import type { Env } from './courriel.ts';
import { MINUTE, cleIp, limiteur } from './limites.ts';

/*
 * Turnstile, la vérification anti-robot de Cloudflare, devant les formulaires
 * publics qui font partir un e-mail ou gardent une adresse : la connexion,
 * l'accueil (prendre son nom, renvoyer, corriger), le signalement et « Rejoins
 * ma liste ». Le navigateur obtient un jeton (voir `lib/turnstile.ts`), le
 * serveur le fait vérifier une fois par Cloudflare : bon, de la bonne action,
 * pris sur un nom de Hopla. Au moindre doute, la demande est refusée.
 *
 * Sans les deux clés, rien n'est demandé : en développement, dans les tests, et
 * en production tant qu'elles ne sont pas posées.
 *
 * Variables d'environnement :
 *   TURNSTILE_SITE_KEY  la clé publique du widget (0x…), que les pages lisent ;
 *   TURNSTILE_SECRET    la clé secrète, qui ne quitte jamais le serveur.
 */

/** Les deux clés, ou rien : une seule des deux ne protégerait rien et bloquerait les formulaires. */
export const turnstileActif = (env: Env) => !!(env.TURNSTILE_SITE_KEY?.trim() && env.TURNSTILE_SECRET?.trim());
export const cleTurnstile = (env: Env) => (turnstileActif(env) ? env.TURNSTILE_SITE_KEY!.trim() : '');

export const MESSAGE_ROBOT = 'La vérification anti-robot n’a pas abouti. Réessaie.';

/**
 * Les noms où un jeton a pu être pris : les deux origines de Hopla en
 * production (jamais localhost, que le widget accepte pour le développement),
 * le nom de la requête ailleurs.
 */
export function hotesTurnstile(env: Env, adresseRequete: string): Set<string> {
  if (env.NODE_ENV !== 'production') return new Set([new URL(adresseRequete).hostname]);
  return new Set([env.LIENS_ORIGINE || ORIGINE_PUBLIQUE, env.LIENS_ORIGINE_ADMIN || ORIGINE_ADMIN].map(o => new URL(o).hostname));
}

/** Trente vérifications par minute depuis une même adresse : un robot sans jeton ne fait pas travailler le serveur pour rien. */
const verifications = limiteur([30, MINUTE]);

/** Vrai si le jeton est bon, ou si Turnstile n'est pas branché. */
export async function verifierTurnstile(
  env: Env, fetchImpl: typeof fetch,
  demande: { jeton: unknown; action: ActionTurnstile; ip: string; hotes: Set<string> },
  maintenant = Date.now(),
): Promise<boolean> {
  if (!turnstileActif(env)) return true;
  const { jeton, action, ip, hotes } = demande;
  // Un jeton fait au plus 2048 caractères (documentation de Siteverify).
  if (typeof jeton !== 'string' || !jeton || jeton.length > 2048) return false;
  if (verifications(cleIp(ip), maintenant)) return false;
  let r: { success?: unknown; action?: unknown; hostname?: unknown; 'error-codes'?: unknown };
  try {
    const reponse = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET!.trim(), response: jeton, ...(ip ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!reponse.ok) throw new Error(`siteverify ${reponse.status}`);
    r = await reponse.json();
  } catch (error) {
    // Cloudflare injoignable : on refuse plutôt que de laisser passer tout le monde.
    console.error('[liens] Turnstile', (error as Error).message);
    return false;
  }
  const codes = Array.isArray(r['error-codes']) ? r['error-codes'].map(String) : [];
  if (codes.some(c => c.includes('secret'))) console.error('[liens] Turnstile : clé secrète refusée', codes.join(' '));
  return r.success === true && r.action === action && typeof r.hostname === 'string' && hotes.has(r.hostname);
}
