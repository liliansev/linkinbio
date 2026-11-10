import { Resolver } from 'node:dns/promises';
import type { EtatDomainePerso } from '../lib/domaines.ts';
import { hoteDomaine } from '../lib/domaines.ts';
import type { ComptePage } from '../lib/types.ts';
import { PRINCIPAL } from '../lib/types.ts';
import type { Env } from './courriel.ts';
import type { Compte, Domaine } from './db.ts';
import * as db from './db.ts';
import { droits } from './droits.ts';

/*
 * Son propre nom de domaine (10 novembre 2026, lot 6 d'après Taap.it, Premium). La personne tape `liens.marie.fr`,
 * pose chez son registrar un CNAME vers `<son compte>.<LIENS_DOMAINES>` (un nom à elle : poser le CNAME prouve à la
 * fois que le domaine est le sien et que c'est cette page qu'elle veut y voir), puis « Vérifier ». Un domaine racine,
 * qui ne prend pas de CNAME, se prouve par un TXT `_hopla.<nom>`.
 *
 * Derrière Cloudflare (hopla.page), le nom vérifié est déclaré à Cloudflare for SaaS, qui lui fait son certificat :
 * `LIENS_CF_JETON` et `LIENS_CF_ZONE`. Sans eux (une instance auto-hébergée), le nom répond dès qu'il est vérifié, et
 * c'est le serveur web de l'instance qui fait le certificat (`/api/domaine?domain=` lui dit quels noms sont connus).
 *
 * Sans `LIENS_DOMAINES`, tout dort : rien n'est proposé, aucun nom ne répond.
 */

/** Le nom vers lequel pointent les CNAME (`LIENS_DOMAINES`, par exemple `cname.hopla.page`) ; null : la fonction dort. */
export function cibleDomaines(env: Env = process.env): string | null {
  const c = (env.LIENS_DOMAINES ?? '').trim().toLowerCase().replace(/\.$/, '');
  return /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,24}$/.test(c) ? c : null;
}

const cibleDuCompte = (compte: string, cible: string) => `${compte}.${cible}`;
const preuve = (compte: string) => `hopla=${compte}`;

/** Ce que le back office montre : le nom, son état, et les enregistrements à poser. */
export function etatDomaine(compte: string, env: Env = process.env): EtatDomainePerso | null {
  const cible = cibleDomaines(env);
  const d = db.domaineDuCompte(compte);
  if (!cible || !d) return null;
  return { hote: d.hote, etat: d.etat, cible: cibleDuCompte(compte, cible), texte: { nom: `_hopla.${d.hote}`, valeur: preuve(compte) } };
}

/* ---- Le DNS ---- */

export interface Resolveur { cname(hote: string): Promise<string[]>; txt(hote: string): Promise<string[][]> }
const resolveurSysteme = (): Resolveur => {
  const r = new Resolver({ timeout: 3000, tries: 2 });
  return { cname: h => r.resolveCname(h), txt: h => r.resolveTxt(h) };
};

/** Le CNAME du nom mène au nom du compte, ou son TXT `_hopla` le dit : c'est bien son domaine, et bien cette page. */
export async function dnsEnPlace(hote: string, compte: string, cible: string, r: Resolveur = resolveurSysteme()): Promise<boolean> {
  const propre = (n: string) => n.toLowerCase().replace(/\.$/, '');
  const noms = await r.cname(hote).catch(() => [] as string[]);
  if (noms.some(n => propre(n) === cibleDuCompte(compte, cible))) return true;
  const textes = await r.txt(`_hopla.${hote}`).catch(() => [] as string[][]);
  return textes.some(t => t.join('').trim() === preuve(compte));
}

/* ---- Cloudflare for SaaS : un « custom hostname » par nom, qui porte son certificat ---- */

interface Cloudflare { jeton: string; zone: string }
export const cloudflare = (env: Env = process.env): Cloudflare | null => {
  const jeton = env.LIENS_CF_JETON?.trim(), zone = env.LIENS_CF_ZONE?.trim();
  return jeton && zone && /^[a-f0-9]{32}$/.test(zone) ? { jeton, zone } : null;
};

interface NomCloudflare { id: string; status?: string; ssl?: { status?: string } }
async function appel<T>(c: Cloudflare, requete: typeof fetch, methode: string, chemin: string, corps?: unknown): Promise<T> {
  const reponse = await requete(`https://api.cloudflare.com/client/v4/zones/${c.zone}/custom_hostnames${chemin}`, {
    method: methode, headers: { Authorization: `Bearer ${c.jeton}`, 'Content-Type': 'application/json' },
    ...(corps ? { body: JSON.stringify(corps) } : {}), signal: AbortSignal.timeout(10_000),
  });
  const json = await reponse.json().catch(() => null) as { success?: boolean; result?: T } | null;
  if (!reponse.ok || !json?.success) throw new Error(`Cloudflare ${reponse.status}`);
  return json.result as T;
}

/** Déclare le nom à Cloudflare (ou le retrouve s'il l'est déjà) ; `actif` quand son certificat est en place. */
export async function nomCloudflare(c: Cloudflare, hote: string, requete: typeof fetch = fetch): Promise<{ id: string; actif: boolean }> {
  const connus = await appel<NomCloudflare[]>(c, requete, 'GET', `?hostname=${encodeURIComponent(hote)}`);
  const nom = connus.find(n => n.id) ?? await appel<NomCloudflare>(c, requete, 'POST', '', { hostname: hote, ssl: { method: 'http', type: 'dv' } });
  return { id: nom.id, actif: nom.status === 'active' && nom.ssl?.status === 'active' };
}

async function oublierChezCloudflare(d: Domaine | undefined, env: Env, requete: typeof fetch) {
  const c = cloudflare(env);
  if (!c || !d?.cf) return;
  // Un nom resté chez Cloudflare ne montre rien (l'app ne le connaît plus) : on note l'échec, on ne bloque pas la personne.
  await appel(c, requete, 'DELETE', `/${d.cf}`).catch(error => console.error('[liens] domaine non retiré de Cloudflare', d.hote, (error as Error).message));
}

/* ---- Les gestes ---- */

export type RefusDomaine = 'ferme' | 'offre' | 'nom' | 'pris';

/** Pose le nom du compte (à la place de l'ancien). Il ne répond pas encore : il attend ses enregistrements DNS. */
export async function brancher(c: Compte, saisie: unknown, env: Env = process.env, requete: typeof fetch = fetch, maintenant = Date.now()): Promise<{ ok: true } | { ok: false; refus: RefusDomaine }> {
  const cible = cibleDomaines(env);
  if (!cible) return { ok: false, refus: 'ferme' };
  if (!droits(c, env, maintenant).domaine) return { ok: false, refus: 'offre' };
  const hote = hoteDomaine(saisie, [cible]);
  if (!hote) return { ok: false, refus: 'nom' };
  const avant = db.domaineDuCompte(c.id);
  if (avant?.hote === hote) return { ok: true };
  if (db.domaineParHote(hote)) return { ok: false, refus: 'pris' };
  await oublierChezCloudflare(avant, env, requete);
  return db.poserDomaine(c.id, hote, maintenant) ? { ok: true } : { ok: false, refus: 'pris' };
}

/** Regarde le DNS, puis Cloudflare : l'état du nom après coup, ou null sans nom. Un nom qui répondait et dont le DNS a changé repasse en attente. */
export async function verifier(c: Compte, env: Env = process.env, outils: { resolveur?: Resolveur; requete?: typeof fetch } = {}, maintenant = Date.now()): Promise<EtatDomainePerso | null> {
  const cible = cibleDomaines(env);
  const d = db.domaineDuCompte(c.id);
  if (!cible || !d) return null;
  if (!(await dnsEnPlace(d.hote, c.id, cible, outils.resolveur))) db.noterDomaine(c.id, 'attente', d.cf, maintenant);
  else {
    const cf = cloudflare(env);
    if (!cf) db.noterDomaine(c.id, 'actif', '', maintenant);
    else {
      const nom = await nomCloudflare(cf, d.hote, outils.requete);
      db.noterDomaine(c.id, nom.actif ? 'actif' : 'certificat', nom.id, maintenant);
    }
  }
  return etatDomaine(c.id, env);
}

export async function retirer(compte: string, env: Env = process.env, requete: typeof fetch = fetch) {
  await oublierChezCloudflare(db.domaineDuCompte(compte), env, requete);
  db.retirerDomaine(compte);
}

/* ---- Servir ---- */

/** Le nom de domaine du compte quand il répond : posé, vérifié, et dans son offre. Vide sinon. */
export function domaineActif(c: Compte, env: Env = process.env, maintenant = Date.now()): string {
  if (!cibleDomaines(env)) return '';
  const d = db.domaineDuCompte(c.id);
  return d?.etat === 'actif' && droits(c, env, maintenant).domaine ? d.hote : '';
}

/** De quoi écrire l'adresse de la page d'un compte : sur son nom de domaine quand il répond. */
export function pageDuCompte(c: Compte, env: Env = process.env, maintenant = Date.now()): ComptePage {
  const domaine = domaineActif(c, env, maintenant);
  return { pseudo: c.pseudo, principal: c.id === PRINCIPAL, ...(domaine ? { domaine } : {}) };
}

/**
 * À qui est ce nom (celui de la requête) : `page`, le compte dont la page y répond ; `ailleurs`, un nom connu qui ne
 * répond pas ou plus (pas vérifié, offre perdue, compte suspendu) ; null, un nom inconnu ou la fonction en sommeil.
 */
export function compteDeHote(hote: string, env: Env = process.env, maintenant = Date.now()): { page: Compte } | { ailleurs: Compte | null } | null {
  if (!cibleDomaines(env)) return null;
  const d = db.domaineParHote(hote.toLowerCase().replace(/:\d+$/, ''));
  if (!d) return null;
  const c = db.compteParId(d.compte);
  if (!c || c.statut !== 'actif') return { ailleurs: null };
  return domaineActif(c, env, maintenant) === d.hote ? { page: c } : { ailleurs: c };
}

/** Ce nom est-il celui d'une page qui y répond ? (Turnstile, le certificat d'une instance auto-hébergée.) */
export const hoteActif = (hote: string, env: Env = process.env) => { const r = compteDeHote(hote, env); return !!r && 'page' in r; };
