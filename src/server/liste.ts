import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { FournisseurListe, IntegrationListe } from '../lib/types.ts';
import { email as validerEmail } from '../lib/valider.ts';
import * as db from './db.ts';
import { source } from './analytique.ts';
import type { Env } from './courriel.ts';

/*
 * « Rejoins ma liste » : les inscrits d'une page restent chez Hopla (export
 * CSV), et partent aussi chez Brevo ou Mailchimp quand la personne a branché
 * sa clé. La clé est chiffrée au repos et ne revient jamais au navigateur.
 * Les adresses des fournisseurs sont fixes : rien ne vise un hôte choisi par
 * l'utilisateur, sauf le centre de données Mailchimp, borné à `us21`.
 */

const cleChiffrement = (env: Env) => createHash('sha256').update(env.LIENS_CLE_INTEGRATIONS || db.secret()).digest();

export function chiffrer(env: Env, texte: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', cleChiffrement(env), iv);
  const donnees = Buffer.concat([c.update(texte, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), donnees.toString('base64url')].join(':');
}

export function dechiffrer(env: Env, valeur: string): string {
  const [v, iv, tag, donnees] = valeur.split(':');
  if (v !== 'v1') return '';
  try {
    const d = createDecipheriv('aes-256-gcm', cleChiffrement(env), Buffer.from(iv, 'base64url'));
    d.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([d.update(Buffer.from(donnees, 'base64url')), d.final()]).toString('utf8');
  } catch { return ''; }
}

const NOMS: Record<FournisseurListe, string> = { brevo: 'Brevo', mailchimp: 'Mailchimp' };

/** Le centre de données d'une clé Mailchimp (`…-us21`), ou vide. */
const centreMailchimp = (cle: string) => { const m = /-([a-z]{2,4}\d{1,3})$/.exec(cle); return m ? m[1] : ''; };

interface Appel { url: string; init: RequestInit }

function appelVerification(fournisseur: FournisseurListe, cle: string, liste: string): Appel | null {
  if (fournisseur === 'brevo') {
    if (!/^\d{1,10}$/.test(liste)) return null;
    return { url: `https://api.brevo.com/v3/contacts/lists/${liste}`, init: { headers: { 'api-key': cle, accept: 'application/json' } } };
  }
  const dc = centreMailchimp(cle);
  if (!dc || !/^[a-z0-9]{4,20}$/.test(liste)) return null;
  return { url: `https://${dc}.api.mailchimp.com/3.0/lists/${liste}?fields=name`, init: { headers: { Authorization: `Basic ${Buffer.from(`hopla:${cle}`).toString('base64')}` } } };
}

function appelInscription(fournisseur: FournisseurListe, cle: string, liste: string, c: { email: string; prenom: string }): Appel | null {
  if (fournisseur === 'brevo') {
    if (!/^\d{1,10}$/.test(liste)) return null;
    return {
      url: 'https://api.brevo.com/v3/contacts',
      init: { method: 'POST', headers: { 'api-key': cle, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ email: c.email, listIds: [Number(liste)], updateEnabled: true, ...(c.prenom ? { attributes: { PRENOM: c.prenom, FIRSTNAME: c.prenom } } : {}) }) },
    };
  }
  const dc = centreMailchimp(cle);
  if (!dc || !/^[a-z0-9]{4,20}$/.test(liste)) return null;
  const id = createHash('md5').update(c.email.toLowerCase()).digest('hex');
  return {
    url: `https://${dc}.api.mailchimp.com/3.0/lists/${liste}/members/${id}`,
    init: { method: 'PUT', headers: { Authorization: `Basic ${Buffer.from(`hopla:${cle}`).toString('base64')}`, 'content-type': 'application/json' },
      body: JSON.stringify({ email_address: c.email, status_if_new: 'subscribed', ...(c.prenom ? { merge_fields: { FNAME: c.prenom } } : {}) }) },
  };
}

/** Vérifie la clé et la liste chez le fournisseur ; renvoie le nom de la liste. */
export async function verifier(fournisseur: FournisseurListe, cle: string, liste: string, fetchImpl: typeof fetch): Promise<{ ok: boolean; message: string; nom?: string }> {
  const appel = appelVerification(fournisseur, cle, liste);
  if (!appel) return { ok: false, message: fournisseur === 'brevo' ? 'L’identifiant de liste Brevo est un nombre (Contacts, Listes).' : 'La clé Mailchimp finit par son centre (…-us21) et l’audience a un identifiant court (Audience, Paramètres).' };
  try {
    const r = await fetchImpl(appel.url, { ...appel.init, redirect: 'error', signal: AbortSignal.timeout(8000) });
    if (r.status === 401 || r.status === 403) return { ok: false, message: `${NOMS[fournisseur]} refuse cette clé.` };
    if (r.status === 404) return { ok: false, message: `${NOMS[fournisseur]} ne trouve pas cette liste.` };
    if (!r.ok) return { ok: false, message: `${NOMS[fournisseur]} ne répond pas (${r.status}). Réessaie dans un instant.` };
    const corps = await r.json().catch(() => ({})) as { name?: unknown };
    const nom = typeof corps.name === 'string' ? corps.name.slice(0, 80) : '';
    return { ok: true, message: `Branché sur ${NOMS[fournisseur]}${nom ? `, liste « ${nom} »` : ''}.`, nom };
  } catch { return { ok: false, message: `${NOMS[fournisseur]} ne répond pas. Réessaie dans un instant.` }; }
}

/** Envoie un inscrit chez le fournisseur branché ; note le résultat sur le contact. */
export async function pousser(env: Env, compte: string, contact: { id: string; email: string; prenom: string }, fetchImpl: typeof fetch): Promise<boolean> {
  const integ = db.lireIntegration(compte);
  if (!integ) return false;
  const cle = dechiffrer(env, integ.cle);
  const appel = cle ? appelInscription(integ.fournisseur, cle, integ.liste, contact) : null;
  if (!appel) { db.noterSynchro(contact.id, 'erreur'); return false; }
  try {
    const r = await fetchImpl(appel.url, { ...appel.init, redirect: 'error', signal: AbortSignal.timeout(6000) });
    // Brevo répond 400 « duplicate » pour une adresse déjà là : elle est bien dans la liste.
    const ok = r.ok || (integ.fournisseur === 'brevo' && r.status === 400 && /duplicate/i.test(await r.text().catch(() => '')));
    db.noterSynchro(contact.id, ok ? 'ok' : 'erreur');
    if (!ok) console.error('[liens] liste', integ.fournisseur, r.status);
    return ok;
  } catch (error) {
    console.error('[liens] liste', integ.fournisseur, (error as Error).message);
    db.noterSynchro(contact.id, 'erreur');
    return false;
  }
}

export function resumeIntegration(env: Env, compte: string): IntegrationListe | null {
  const integ = db.lireIntegration(compte);
  if (!integ) return null;
  const cle = dechiffrer(env, integ.cle);
  return { fournisseur: integ.fournisseur, liste: integ.liste, nom: integ.nom, cle: cle ? `•••• ${cle.slice(-4)}` : '' };
}

const recents = new Map<string, number[]>();
/** Au plus 5 inscriptions par 10 minutes et par adresse IP. */
function tropRapide(ip: string, maintenant: number) {
  const l = (recents.get(ip) ?? []).filter(t => maintenant - t < 600_000);
  l.push(maintenant);
  recents.set(ip, l);
  if (recents.size > 5000) recents.clear();
  return l.length > 5;
}

const MESSAGE_OK = 'C’est noté, merci !';

/** Le formulaire d'une page : vérifie, garde l'inscrit, l'envoie chez le fournisseur. */
export async function inscrire(env: Env, fetchImpl: typeof fetch, entree: Record<string, unknown>, contexte: { ip: string; ua: string; referent: string }, maintenant = Date.now()): Promise<{ status: number; message: string }> {
  // Le champ caché qu'un humain ne remplit pas.
  if (entree.website) return { status: 200, message: MESSAGE_OK };
  const adresse = validerEmail(entree.email);
  if (!adresse) return { status: 400, message: 'Cette adresse e-mail ne semble pas valide.' };
  if (tropRapide(contexte.ip || 'inconnu', maintenant)) return { status: 429, message: 'Trop d’essais. Réessaie dans quelques minutes.' };
  const page = typeof entree.page === 'string' ? entree.page : '';
  const compte = page ? db.compteParPseudo(page) : db.compteParId('principal');
  if (!compte || compte.statut !== 'actif') return { status: 404, message: 'Cette page n’existe plus.' };
  const bloc = db.lireBlocs(compte.id).find(b => b.id === entree.bloc && b.type === 'inscription' && b.public);
  if (!bloc) return { status: 404, message: 'Ce formulaire n’existe plus.' };
  if (db.contactsDuJour(compte.id, maintenant) >= 2000) return { status: 429, message: 'Trop d’inscriptions aujourd’hui. Réessaie demain.' };
  const prenom = bloc.demanderPrenom && typeof entree.prenom === 'string' ? entree.prenom.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 60) : '';
  const contact = db.ajouterContact(compte.id, { email: adresse, prenom, source: source(typeof entree.utm === 'string' ? entree.utm : '', contexte.referent, contexte.ua), bloc: bloc.id }, maintenant);
  // Une adresse déjà inscrite reçoit la même réponse : la page ne dit pas qui est sur la liste.
  if (contact) await pousser(env, compte.id, contact, fetchImpl);
  return { status: 200, message: MESSAGE_OK };
}

/** Le CSV des inscrits, lisible par Excel (séparateur point-virgule, BOM). */
export function csv(compte: string): string {
  const cellule = (v: string) => {
    // Une cellule qui commence par = + - @ serait une formule dans un tableur.
    const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lignes = db.tousLesContacts(compte).map(c => [c.email, c.prenom, new Date(c.ts).toISOString(), c.source, c.synchro].map(cellule).join(';'));
  return `﻿email;prenom;inscrit_le;provenance;synchro\n${lignes.join('\n')}\n`;
}
