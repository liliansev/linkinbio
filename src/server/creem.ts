import { createHmac, timingSafeEqual } from 'node:crypto';
import { PRINCIPAL } from '../lib/types.ts';
import type { Periode } from '../lib/abonnement.ts';
import { STATUTS_PRO } from '../lib/abonnement.ts';
import type { Env } from './courriel.ts';
import type { Compte } from './db.ts';
import { appliquerAbonnement, compteParAbonnement, compteParClientCreem, compteParId, oublierWebhook, webhookDejaRecu } from './db.ts';

/*
 * Le paiement de l'offre Pro, par Creem, marchand officiel (merchant of
 * record) : Creem vend l'abonnement à sa place, encaisse, facture et reverse
 * la TVA du pays de l'acheteur. Le serveur ne fait que trois choses :
 * ouvrir une page de paiement, ouvrir le portail client, et écouter les
 * webhooks signés qui disent où en est l'abonnement. Il ne croit jamais le
 * navigateur : le retour sur `success_url` n'accorde rien.
 *
 * Variables d'environnement :
 *   CREEM_API_KEY          la clé d'API (Developers > API keys)
 *   CREEM_WEBHOOK_SECRET   le secret du webhook (Developers > Webhooks)
 *   CREEM_PRODUIT_MOIS     l'identifiant du produit « Pro mensuel » (prod_…)
 *   CREEM_PRODUIT_AN       l'identifiant du produit « Pro annuel »
 *   CREEM_TEST=1           pour l'API de test (test-api.creem.io), avec une clé de test
 */

export interface ConfigCreem { cle: string; secret: string; api: string; produits: Record<Periode, string> }

export function config(env: Env): ConfigCreem | null {
  const cle = env.CREEM_API_KEY?.trim(), secret = env.CREEM_WEBHOOK_SECRET?.trim();
  const mois = env.CREEM_PRODUIT_MOIS?.trim(), an = env.CREEM_PRODUIT_AN?.trim();
  if (!cle || !secret || !mois || !an) return null;
  return { cle, secret, api: env.CREEM_TEST === '1' ? 'https://test-api.creem.io' : 'https://api.creem.io', produits: { mois, an } };
}

const INJOIGNABLE = 'Le paiement ne répond pas. Réessaie dans un instant.';

async function appeler(c: ConfigCreem, fetchImpl: typeof fetch, chemin: string, corps: unknown): Promise<Record<string, unknown>> {
  let r: Response;
  try {
    r = await fetchImpl(`${c.api}${chemin}`, {
      method: 'POST',
      headers: { 'x-api-key': c.cle, 'Content-Type': 'application/json' },
      body: JSON.stringify(corps),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error('[liens] Creem', chemin, (error as Error).message);
    throw new Error(INJOIGNABLE);
  }
  if (!r.ok) {
    console.error('[liens] Creem', chemin, r.status, (await r.text().catch(() => '')).slice(0, 300));
    throw new Error(INJOIGNABLE);
  }
  return (await r.json().catch(() => ({}))) as Record<string, unknown>;
}

/** La page de paiement Creem pour passer en Pro. Le compte voyage dans les métadonnées et revient par webhook. */
export async function ouvrirPaiement(env: Env, fetchImpl: typeof fetch, compte: Compte, periode: Periode, origine: string, maintenant = Date.now()): Promise<string> {
  const c = config(env);
  if (!c) throw new Error('Le paiement n’est pas encore branché.');
  if (compte.id === PRINCIPAL) throw new Error('Le compte principal n’a pas besoin d’abonnement.');
  const r = await appeler(c, fetchImpl, '/v1/checkouts', {
    product_id: c.produits[periode],
    request_id: `${compte.id}-${maintenant}`,
    success_url: `${origine}/admin?paiement=ok`,
    customer: { email: compte.email },
    metadata: { compte: compte.id },
  });
  const url = typeof r.checkout_url === 'string' ? r.checkout_url : '';
  if (!/^https:\/\//.test(url)) throw new Error(INJOIGNABLE);
  return url;
}

/** Le portail client Creem : changer de carte, télécharger ses factures, résilier. */
export async function ouvrirPortail(env: Env, fetchImpl: typeof fetch, compte: Compte): Promise<string> {
  const c = config(env);
  if (!c) throw new Error('Le paiement n’est pas encore branché.');
  if (!compte.creem_client) throw new Error('Aucun abonnement à gérer.');
  const r = await appeler(c, fetchImpl, '/v1/customers/billing', { customer_id: compte.creem_client });
  const url = typeof r.customer_portal_link === 'string' ? r.customer_portal_link : '';
  if (!/^https:\/\//.test(url)) throw new Error('Le portail ne répond pas. Réessaie dans un instant.');
  return url;
}

/** La signature d'un webhook : HMAC-SHA256 du corps brut, en hexadécimal, dans l'en-tête `creem-signature`. */
export function signatureValide(corps: string, signature: string | null, secret: string): boolean {
  if (!signature || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const attendue = createHmac('sha256', secret).update(corps).digest();
  return timingSafeEqual(attendue, Buffer.from(signature, 'hex'));
}

type Objet = Record<string, unknown>;
const objet = (v: unknown): Objet => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Objet) : {});
const texte = (v: unknown) => (typeof v === 'string' ? v.slice(0, 200) : '');
const instant = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v < 1e12 ? v * 1000 : v;
  if (typeof v === 'string') { const t = Date.parse(v); return Number.isNaN(t) ? null : t; }
  return null;
};
/** Un client ou un abonnement arrive en objet (`{ id, … }`) ou, parfois, en simple identifiant. */
const idDe = (v: unknown) => (typeof v === 'string' ? v.slice(0, 200) : texte(objet(v).id));

export type Issue = { status: number; message: string };

/**
 * Un webhook Creem. Toujours 200 une fois la signature vérifiée, même pour un
 * événement sans suite pour nous : sinon Creem le renverrait pendant 24 heures.
 */
export function traiterWebhook(env: Env, corps: string, signature: string | null, maintenant = Date.now()): Issue {
  const c = config(env);
  if (!c) return { status: 503, message: 'paiement non configuré' };
  if (!signatureValide(corps, signature, c.secret)) return { status: 401, message: 'signature invalide' };
  let e: Objet;
  try { e = objet(JSON.parse(corps)); } catch { return { status: 400, message: 'JSON invalide' }; }
  const id = texte(e.id), type = texte(e.eventType), o = objet(e.object);
  if (!id || !type) return { status: 400, message: 'événement incomplet' };
  if (webhookDejaRecu(id, maintenant)) return { status: 200, message: 'déjà traité' };

  // L'abonnement : l'objet lui-même pour `subscription.*`, imbriqué dans `checkout.completed`.
  let abonnement: Objet;
  if (type.startsWith('subscription.')) abonnement = o;
  else if (type === 'checkout.completed' && o.subscription) abonnement = typeof o.subscription === 'string' ? { id: o.subscription, status: 'active' } : objet(o.subscription);
  else return { status: 200, message: `ignoré : ${type}` };

  const idAbonnement = idDe(abonnement.id);
  const client = idDe(abonnement.customer) || idDe(o.customer);
  const statut = texte(abonnement.status) || (type === 'checkout.completed' ? 'active' : '');
  const meta = { ...objet(abonnement.metadata), ...objet(o.metadata) };
  const compteMeta = texte(meta.compte);
  const compte = (compteMeta && compteMeta !== PRINCIPAL ? compteParId(compteMeta) : undefined) ?? compteParAbonnement(idAbonnement) ?? compteParClientCreem(client);
  if (!compte || !statut) {
    console.error('[liens] webhook Creem sans compte', type, idAbonnement);
    return { status: 200, message: 'aucun compte' };
  }
  // La fin d'un ancien abonnement n'éteint pas celui qui l'a remplacé.
  if (compte.creem_abonnement && idAbonnement && idAbonnement !== compte.creem_abonnement && !(STATUTS_PRO as readonly string[]).includes(statut)) {
    return { status: 200, message: 'ancien abonnement' };
  }
  try {
    appliquerAbonnement(compte.id, {
      client, abonnement: idAbonnement, statut,
      finPeriode: instant(abonnement.current_period_end_date),
      maj: instant(e.created_at) ?? maintenant,
    });
  } catch (error) {
    // Rien n'est noté : Creem renverra l'événement.
    oublierWebhook(id);
    throw error;
  }
  return { status: 200, message: `${compte.pseudo} : ${statut}` };
}
