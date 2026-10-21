import { createHmac, timingSafeEqual } from 'node:crypto';
import { PRINCIPAL } from '../lib/types.ts';
import type { EtatOffre, Periode, PlanPayant } from '../lib/abonnement.ts';
import { OFFRES, PERIODES, PLANS_PAYANTS, STATUTS_PRO, estPaye, estResilie } from '../lib/abonnement.ts';
import type { Env } from './courriel.ts';
import type { Compte, ProduitCreem } from './db.ts';
import { appliquerAbonnement, compteParAbonnement, compteParClientCreem, compteParId, ecrireCatalogue, lireCatalogue, oublierWebhook, webhookDejaRecu } from './db.ts';

/*
 * Le paiement des offres Starter, Pro et Premium, par Creem, marchand officiel
 * (merchant of record) : Creem vend l'abonnement à sa place, encaisse, facture
 * et reverse la TVA du pays de l'acheteur. Le serveur ouvre une page de
 * paiement, change l'offre d'un abonné, résilie un abonnement (à la fin de la
 * période payée quand on repasse en Gratuit, tout de suite quand le compte est
 * supprimé), ouvre le portail client, crée les produits des offres, et écoute
 * les webhooks signés qui disent où en est l'abonnement. Il ne croit jamais le
 * navigateur : le retour sur `success_url` n'accorde rien.
 *
 * Variables d'environnement :
 *   CREEM_API_KEY          la clé d'API (Developers > API keys). Pour créer les produits,
 *                          changer d'offre et résilier, elle a aussi besoin des droits Products et Subscriptions.
 *   CREEM_WEBHOOK_SECRET   le secret du webhook (Developers > Webhooks)
 *   CREEM_PRODUIT_MOIS     le produit « Pro mensuel » d'avant les quatre offres (prod_…), facultatif
 *   CREEM_PRODUIT_AN       le produit « Pro annuel » d'avant les quatre offres, facultatif
 *   CREEM_TEST=1           pour l'API de test (test-api.creem.io), avec une clé de test
 * Les produits des offres se créent depuis l'onglet Comptes (« Créer les offres dans Creem ») et
 * vivent dans la base (`lireCatalogue`). Hopla les relit dans Creem au démarrage, toutes les heures
 * et à l'ouverture de l'onglet Comptes (`relireCatalogue`) : un prix changé dans le tableau de bord
 * de Creem y est repris, sans rien créer ni changer chez Creem.
 */

export interface ConfigCreem { cle: string; secret: string; api: string; anciens: Partial<Record<Periode, string>> }

export function config(env: Env): ConfigCreem | null {
  const cle = env.CREEM_API_KEY?.trim(), secret = env.CREEM_WEBHOOK_SECRET?.trim();
  if (!cle || !secret) return null;
  const anciens: Partial<Record<Periode, string>> = {};
  if (env.CREEM_PRODUIT_MOIS?.trim()) anciens.mois = env.CREEM_PRODUIT_MOIS.trim();
  if (env.CREEM_PRODUIT_AN?.trim()) anciens.an = env.CREEM_PRODUIT_AN.trim();
  return { cle, secret, api: env.CREEM_TEST === '1' ? 'https://test-api.creem.io' : 'https://api.creem.io', anciens };
}

const INJOIGNABLE = 'Le paiement ne répond pas. Réessaie dans un instant.';
const centimes = (euros: number) => Math.round(euros * 100);

/** Le produit à vendre pour une offre et une période : celui du catalogue au prix du jour, ou l'ancien Pro tant qu'aucun ne l'a remplacé. */
export function produitEnVente(c: ConfigCreem, plan: PlanPayant, periode: Periode, catalogue = lireCatalogue()): string | null {
  const prix = centimes(OFFRES[plan].prix[periode]);
  const p = catalogue.find(x => x.actuel && x.plan === plan && x.periode === periode && x.prix === prix);
  if (p) return p.id;
  if (plan === 'pro' && !catalogue.some(x => x.plan === 'pro' && x.periode === periode)) return c.anciens[periode] ?? null;
  return null;
}

/** Les offres qu'on peut acheter maintenant : en vente, et un produit Creem pour chaque période. */
export function offresEnVente(env: Env): PlanPayant[] {
  const c = config(env);
  if (!c) return [];
  const catalogue = lireCatalogue();
  return PLANS_PAYANTS.filter(p => OFFRES[p].enVente && PERIODES.every(periode => produitEnVente(c, p, periode, catalogue)));
}

/** Tous les produits qui sont à Hopla : un webhook pour un autre (la boutique vend aussi des formations) ne le regarde pas. */
const produitsHopla = (c: ConfigCreem) => new Set([...lireCatalogue().map(p => p.id), ...Object.values(c.anciens)]);

async function appeler(c: ConfigCreem, fetchImpl: typeof fetch, chemin: string, corps?: unknown, entetes: Record<string, string> = {}): Promise<Record<string, unknown>> {
  let r: Response;
  try {
    r = await fetchImpl(`${c.api}${chemin}`, {
      method: corps === undefined ? 'GET' : 'POST',
      headers: { 'x-api-key': c.cle, 'Content-Type': 'application/json', ...entetes },
      body: corps === undefined ? undefined : JSON.stringify(corps),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error('[liens] Creem', chemin, (error as Error).message);
    throw new ErreurCreem(INJOIGNABLE, 0);
  }
  if (!r.ok) {
    console.error('[liens] Creem', chemin, r.status, (await r.text().catch(() => '')).slice(0, 300));
    // Une clé sans le droit demandé : Creem répond 401 ou 403.
    if (r.status === 401 || r.status === 403) throw new ErreurDroits(chemin, r.status, corps === undefined);
    throw new ErreurCreem(INJOIGNABLE, r.status);
  }
  return (await r.json().catch(() => ({}))) as Record<string, unknown>;
}

/** Une réponse de Creem qui n'est pas passée : `status` est son code HTTP, 0 si Creem n'a pas répondu. */
export class ErreurCreem extends Error {
  // Pas de propriété dans les paramètres du constructeur : Node lit ce fichier sans compilateur, en retirant les types.
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

class ErreurDroits extends ErreurCreem {
  constructor(chemin: string, status: number, lecture: boolean) {
    super(chemin.startsWith('/v1/products') ? `La clé Creem n’a pas le droit de ${lecture ? 'lire' : 'créer'} des produits : ajoute-lui « Products » dans Creem, Developers, API keys.`
      : chemin.startsWith('/v1/subscriptions') && chemin.endsWith('/cancel') ? 'La résiliation ne passe pas encore par Hopla : fais-la depuis le portail Creem.'
        : chemin.startsWith('/v1/subscriptions') ? 'Le changement d’offre n’est pas encore ouvert. Écris-nous, on s’en occupe.'
          : INJOIGNABLE, status);
  }
}

/**
 * Prendre une offre. Sans abonnement : la page de paiement Creem, le compte voyage
 * dans les métadonnées et revient par webhook. Avec un abonnement en cours : Creem
 * change son produit (au prorata, payé ou rendu tout de suite), et le webhook qui
 * suit change l'offre. Dans les deux cas, l'adresse où aller ensuite.
 */
export async function ouvrirPaiement(env: Env, fetchImpl: typeof fetch, compte: Compte, plan: PlanPayant, periode: Periode, origine: string, maintenant = Date.now()): Promise<string> {
  const c = config(env);
  if (!c) throw new Error('Le paiement n’est pas encore branché.');
  if (compte.id === PRINCIPAL) throw new Error('Le compte principal n’a pas besoin d’abonnement.');
  const produit = OFFRES[plan].enVente ? produitEnVente(c, plan, periode) : null;
  if (!produit) throw new Error(`L’offre ${OFFRES[plan].nom} arrive bientôt.`);
  const retour = `${origine}/admin?paiement=${plan}`;
  if (compte.creem_abonnement && estPaye({ statut: compte.abonnement_statut, finPeriode: compte.fin_periode }, maintenant)) {
    // Résilié, l'abonnement court jusqu'à sa fin et n'en change plus : on reprend une offre ensuite (comme le disent les offres).
    if (estResilie(compte.abonnement_statut)) throw new Error('Ton offre est résiliée : tu pourras en prendre une autre à la fin de la période payée.');
    if (compte.abonnement_produit === produit) throw new Error('C’est déjà ton offre.');
    await appeler(c, fetchImpl, `/v1/subscriptions/${encodeURIComponent(compte.creem_abonnement)}/upgrade`, { product_id: produit, update_behavior: 'proration-charge-immediately' });
    return retour;
  }
  const r = await appeler(c, fetchImpl, '/v1/checkouts', {
    product_id: produit,
    request_id: `${compte.id}-${maintenant}`,
    success_url: retour,
    customer: { email: compte.email },
    metadata: { compte: compte.id },
  });
  const url = typeof r.checkout_url === 'string' ? r.checkout_url : '';
  if (!/^https:\/\//.test(url)) throw new Error(INJOIGNABLE);
  return url;
}

/* ---- Les produits des offres, dans Creem ---- */

/**
 * Pour l'onglet Comptes : chaque offre et période, avec son produit Creem s'il existe au prix du jour, et sinon
 * le prix que Creem facture pour le produit de l'offre, quand on le connaît.
 */
export function etatOffres(env: Env): EtatOffre[] {
  const c = config(env);
  const catalogue = lireCatalogue();
  return PLANS_PAYANTS.flatMap(plan => PERIODES.map(periode => {
    const produit = c ? produitEnVente(c, plan, periode, catalogue) : null;
    const actuel = catalogue.find(x => x.actuel && x.plan === plan && x.periode === periode);
    return { plan, periode, prix: OFFRES[plan].prix[periode], enVente: OFFRES[plan].enVente, produit, prixCreem: !produit && actuel ? actuel.prix / 100 : null };
  }));
}

const NOMS_PERIODES: Record<Periode, string> = { mois: 'mensuel', an: 'annuel' };
const PERIODES_CREEM: Record<string, Periode> = { 'every-month': 'mois', 'every-year': 'an' };

/** Un produit tel que Creem le décrit. `vendable` : ni archivé, ni supprimé, ni dans une autre monnaie qu'en euros. */
interface ProduitLu { id: string; nom: string; prix: number; periode: Periode | null; vendable: boolean }

function produitLu(r: Record<string, unknown>): ProduitLu | null {
  const id = typeof r.id === 'string' ? r.id : '', prix = Number(r.price);
  if (!/^prod_/.test(id) || !Number.isInteger(prix) || prix < 0) return null;
  const monnaie = typeof r.currency === 'string' ? r.currency.toUpperCase() : 'EUR';
  return {
    id, nom: typeof r.name === 'string' ? r.name : '', prix,
    periode: PERIODES_CREEM[String(r.billing_period)] ?? null,
    vendable: r.status !== 'archived' && r.billing_type !== 'onetime' && monnaie === 'EUR',
  };
}

/** Un produit fait à la main dans Creem, nommé comme ceux de Hopla (« Hopla Starter mensuel »). */
const nommePour = (nom: string, plan: PlanPayant) => /\bhopla\b/i.test(nom) && new RegExp(`\\b${OFFRES[plan].nom}\\b`, 'i').test(nom);

/** Tous les produits de la boutique, page après page. Elle vend aussi des formations : on trie ensuite. */
async function produitsDeLaBoutique(c: ConfigCreem, fetchImpl: typeof fetch): Promise<ProduitLu[]> {
  const produits: ProduitLu[] = [];
  for (let page = 1; page <= 10; page++) {
    const r = await appeler(c, fetchImpl, `/v1/products/search?page_number=${page}&page_size=50`);
    const items = Array.isArray(r.items) ? (r.items as Record<string, unknown>[]) : [];
    produits.push(...items.flatMap(x => produitLu(x) ?? []));
    const suite = (r.pagination as Record<string, unknown> | undefined)?.next_page;
    if (!items.length || typeof suite !== 'number' || suite <= page) break;
  }
  return produits;
}

// Relire et créer écrivent tous deux le catalogue : l'un attend que l'autre ait fini.
let file: Promise<unknown> = Promise.resolve();
function chacunSonTour<T>(tache: () => Promise<T>): Promise<T> {
  const r = file.then(tache, tache);
  file = r.catch(() => undefined);
  return r;
}

async function relire(c: ConfigCreem, fetchImpl: typeof fetch): Promise<void> {
  const avant = lireCatalogue();
  const anciens = PERIODES.flatMap(periode => { const id = c.anciens[periode]; return id ? [{ id, periode }] : []; });
  const lus = new Map<string, ProduitLu | null>();
  await Promise.all([...new Set([...avant.map(x => x.id), ...anciens.map(a => a.id)])].map(async id => {
    try {
      lus.set(id, produitLu(await appeler(c, fetchImpl, `/v1/products/${encodeURIComponent(id)}`)));
    } catch (error) {
      // Un produit supprimé dans Creem ne se vend plus ; toute autre erreur laisse le catalogue tel qu'il était.
      if (error instanceof ErreurCreem && error.status === 404) lus.set(id, null);
      else throw error;
    }
  }));
  // Une entrée vendable : Creem la connaît, en euros, ni archivée, et toujours à la période qu'on lui connaît.
  const vendable = (x: ProduitCreem) => { const l = lus.get(x.id); return !!l && l.vendable && (!l.periode || l.periode === x.periode); };
  let catalogue = avant.map(x => {
    const l = lus.get(x.id);
    return { ...x, ...(l ? { prix: l.prix } : {}), ...(vendable(x) ? {} : { actuel: false }) };
  });
  // L'ancien Pro entre au catalogue, à son prix : ses abonnés gardent le Pro, et il peut redevenir le produit de l'offre.
  for (const a of anciens) {
    const l = lus.get(a.id);
    if (l && !catalogue.some(x => x.id === a.id)) catalogue.push({ id: a.id, plan: 'pro', periode: a.periode, prix: l.prix, actuel: false });
  }
  const manquent: { plan: PlanPayant; periode: Periode; prix: number }[] = [];
  for (const plan of PLANS_PAYANTS.filter(p => OFFRES[p].enVente)) {
    for (const periode of PERIODES) {
      const prix = centimes(OFFRES[plan].prix[periode]);
      const auPrix = (x: ProduitCreem) => x.plan === plan && x.periode === periode && x.prix === prix && vendable(x);
      if (catalogue.some(x => x.actuel && auPrix(x))) continue;
      // Un produit déjà connu, remis au prix du jour dans Creem, redevient celui de l'offre (le plus récent d'abord).
      const repris = catalogue.findLast(auPrix);
      if (repris) catalogue = catalogue.map(x => (x.plan === plan && x.periode === periode ? { ...x, actuel: x.id === repris.id } : x));
      else manquent.push({ plan, periode, prix });
    }
  }
  if (manquent.length) {
    // Faute de mieux, un produit fait à la main dans Creem, au nom, au prix et à la période de l'offre.
    let boutique: ProduitLu[] = [];
    try { boutique = await produitsDeLaBoutique(c, fetchImpl); } catch (error) { console.error('[liens] Creem, liste des produits', (error as Error).message); }
    for (const m of manquent) {
      const p = boutique.find(x => x.vendable && x.periode === m.periode && x.prix === m.prix && nommePour(x.nom, m.plan) && !catalogue.some(y => y.id === x.id));
      if (!p) continue;
      lus.set(p.id, p);
      catalogue = [...catalogue.map(x => (x.plan === m.plan && x.periode === m.periode ? { ...x, actuel: false } : x)), { id: p.id, plan: m.plan, periode: m.periode, prix: p.prix, actuel: true }];
    }
  }
  if (JSON.stringify(catalogue) !== JSON.stringify(avant)) ecrireCatalogue(catalogue);
}

/**
 * Relit dans Creem chaque produit que Hopla connaît (le catalogue, et l'ancien Pro) : un prix changé dans le
 * tableau de bord de Creem y est repris (Lilian, 21 octobre 2026), et un produit remis au prix du jour redevient
 * celui de son offre. Un produit fait à la main, nommé comme les nôtres, au bon prix et à la bonne période, est
 * repris aussi. Rien n'est créé ni changé chez Creem : des lectures seulement. Un produit archivé ne se vend
 * plus. Si Creem ne répond pas, le catalogue reste tel qu'il était et l'erreur remonte.
 */
export async function relireCatalogue(env: Env, fetchImpl: typeof fetch): Promise<EtatOffre[]> {
  const c = config(env);
  if (!c) throw new Error('Le paiement n’est pas encore branché.');
  await chacunSonTour(() => relire(c, fetchImpl));
  return etatOffres(env);
}

let relecture: ReturnType<typeof setInterval> | null = null;
/** Relit les produits dans Creem peu après le démarrage, puis toutes les heures. Sans Creem, rien. */
export function planifierRelecture(env: Env = process.env) {
  if (relecture || !config(env)) return;
  const tour = () => { relireCatalogue(env, fetch).catch(error => console.error('[liens] Creem, relecture des produits', (error as Error).message)); };
  relecture = setInterval(tour, 3_600_000);
  relecture.unref?.();
  setTimeout(tour, 10_000).unref?.();
}

/**
 * Crée dans Creem les produits qui manquent, au prix du jour : abonnement, TTC, catégorie SaaS, sans essai.
 * Avant, Hopla relit ceux qu'il connaît : un produit remis au bon prix dans Creem, ou l'ancien Pro au bon prix,
 * est repris tel quel, et rien n'est créé en double. Un produit dont le prix a changé reste connu (ses abonnés
 * gardent leur offre), mais n'est plus vendu. Rejouer ne crée rien deux fois.
 */
export async function creerOffres(env: Env, fetchImpl: typeof fetch): Promise<EtatOffre[]> {
  const c = config(env);
  if (!c) throw new Error('Le paiement n’est pas encore branché.');
  await chacunSonTour(async () => {
    await relire(c, fetchImpl);
    let catalogue = lireCatalogue();
    // Une offre pas encore en vente (Premium) n'a pas de produit : rien ne pourrait la vendre par erreur.
    for (const plan of PLANS_PAYANTS.filter(p => OFFRES[p].enVente)) {
      for (const periode of PERIODES) {
        const prix = centimes(OFFRES[plan].prix[periode]);
        if (catalogue.some(x => x.actuel && x.plan === plan && x.periode === periode && x.prix === prix)) continue;
        const cree = await appeler(c, fetchImpl, '/v1/products', {
          name: `Hopla ${OFFRES[plan].nom} ${NOMS_PERIODES[periode]}`,
          description: OFFRES[plan].phrase,
          price: prix, currency: 'EUR', billing_type: 'recurring', billing_period: periode === 'an' ? 'every-year' : 'every-month',
          tax_mode: 'inclusive', tax_category: 'saas',
        }, { 'Idempotency-Key': `hopla-${plan}-${periode}-${prix}` });
        const id = typeof cree.id === 'string' ? cree.id : '';
        if (!/^prod_/.test(id)) throw new Error(INJOIGNABLE);
        catalogue = [
          ...catalogue.filter(x => x.id !== id).map(x => (x.plan === plan && x.periode === periode ? { ...x, actuel: false } : x)),
          { id, plan, periode, prix, actuel: true } satisfies ProduitCreem,
        ];
        // Noté à chaque produit : une erreur au suivant ne perd pas ceux déjà créés.
        ecrireCatalogue(catalogue);
      }
    }
  });
  return etatOffres(env);
}

/* ---- Résilier ---- */

/** Un abonnement qui peut encore prélever : tout ce qui n'est pas terminé chez Creem. */
export const aResilier = (compte: Pick<Compte, 'creem_abonnement' | 'abonnement_statut'>) =>
  !!compte.creem_abonnement && !['canceled', 'expired'].includes(compte.abonnement_statut);

const resiliation = (compte: Compte) => `/v1/subscriptions/${encodeURIComponent(compte.creem_abonnement)}/cancel`;

/**
 * Repasser en Gratuit : Creem résilie l'abonnement à la fin de la période payée (`scheduled`, qu'on écrit
 * toujours : sans lui, Creem suit le réglage de la boutique). L'offre court jusque-là, sans plus rien prélever.
 * La réponse vient de Creem, pas du navigateur, et ne fait que fixer la fin d'une offre déjà payée : elle s'écrit
 * tout de suite. Le webhook `subscription.scheduled_cancel` qui suit dit la même chose.
 */
export async function resilierEnFinDePeriode(env: Env, fetchImpl: typeof fetch, compte: Compte, maintenant = Date.now()): Promise<void> {
  const c = config(env);
  if (!c) throw new Error('Le paiement n’est pas encore branché.');
  if (compte.id === PRINCIPAL || !compte.creem_abonnement || !estPaye({ statut: compte.abonnement_statut, finPeriode: compte.fin_periode }, maintenant)) throw new Error('Aucun abonnement à résilier.');
  // Déjà résilié : rien à refaire (un double toucher, deux onglets).
  if (estResilie(compte.abonnement_statut)) return;
  const r = await appeler(c, fetchImpl, resiliation(compte), { mode: 'scheduled', onExecute: 'cancel' });
  appliquerAbonnement(compte.id, {
    client: idDe(r.customer), abonnement: compte.creem_abonnement,
    statut: texte(r.status) === 'canceled' ? 'canceled' : 'scheduled_cancel',
    finPeriode: instant(r.current_period_end_date),
    // Jamais derrière le dernier webhook appliqué : l'horloge de Creem peut avancer sur la nôtre.
    maj: Math.max(maintenant, compte.abonnement_maj),
  });
}

/**
 * Le compte qu'on supprime résilie son abonnement tout de suite : sa page n'existe plus, rien ne justifie un
 * prélèvement de plus. Creem ne rembourse rien de lui-même. Vrai si Creem l'a résilié ; faux s'il n'y avait
 * rien à résilier (pas d'abonnement, déjà terminé, inconnu de Creem). Toute autre erreur remonte : rien n'est résilié.
 */
export async function resilierAvantSuppression(env: Env, fetchImpl: typeof fetch, compte: Compte): Promise<boolean> {
  if (!aResilier(compte)) return false;
  const c = config(env);
  if (!c) throw new Error('Le paiement n’est pas branché : l’abonnement ne peut pas être résilié d’ici.');
  try {
    await appeler(c, fetchImpl, resiliation(compte), { mode: 'immediate' });
    return true;
  } catch (error) {
    if (error instanceof ErreurCreem && error.status === 404) {
      console.error('[liens] Creem ne connaît pas l’abonnement à résilier', compte.pseudo, compte.creem_abonnement);
      return false;
    }
    throw error;
  }
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

  // La boutique Creem vend aussi d'autres produits (des formations) : un abonnement à l'un d'eux ne regarde pas Hopla.
  const produit = idDe(abonnement.product) || idDe(o.product);
  if (produit && !produitsHopla(c).has(produit)) return { status: 200, message: `ignoré : autre produit (${produit})` };

  const idAbonnement = idDe(abonnement.id);
  const client = idDe(abonnement.customer) || idDe(o.customer);
  // Une résiliation à la fin de la période se dit par son événement, même si l'objet garde « active » jusque-là.
  const statut = type === 'subscription.scheduled_cancel' && ['', 'active'].includes(texte(abonnement.status)) ? 'scheduled_cancel'
    : texte(abonnement.status) || (type === 'checkout.completed' ? 'active' : '');
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
      client, abonnement: idAbonnement, statut, produit,
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
