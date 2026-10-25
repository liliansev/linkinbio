import { createHash } from 'node:crypto';
import { MINUTE, cleIp, limiteur } from './limites.ts';
import { MESSAGE_ROBOT, verifierTurnstile } from './turnstile.ts';
import type { FournisseurListe, IntegrationListe, ListeFournisseur, Webhook } from '../lib/types.ts';
import { ORIGINE_PUBLIQUE, PRINCIPAL, cheminPage, estWebhook } from '../lib/types.ts';
import { ADRESSE_WEBHOOK, LISTE_CHEZ, NOMS_FOURNISSEURS, OUVRAGE_WEBHOOK, adresseWebhook } from '../lib/integrations.ts';
import { email as validerEmail } from '../lib/valider.ts';
import * as db from './db.ts';
import { droits } from './droits.ts';
import { source } from './analytique.ts';
import type { Env } from './courriel.ts';

/*
 * « Rejoins ma liste » : les inscrits d'une page restent chez Hopla (export
 * CSV), et partent aussi là où la personne a branché sa liste : une des huit
 * newsletters (Brevo, Mailchimp, Kit, MailerLite, beehiiv, Systeme.io, MailCheap, Loops), par
 * leur API, ou Make, Zapier ou n8n, par un webhook. La clé (ou l'adresse du
 * webhook) est chiffrée au repos et ne revient jamais au navigateur. Les API
 * des newsletters ont des adresses fixes (le centre de données Mailchimp, lu
 * au bout de la clé, a la forme `us21`) ; un webhook vise un hôte choisi par
 * l'utilisateur : en production, tout passe par `requeteSortante`
 * (sortante.ts), qui ne laisse partir vers un tel hôte que des requêtes https
 * vers une adresse publique.
 */

export { chiffrer, dechiffrer } from './coffre.ts';
import { dechiffrer } from './coffre.ts';

/** Un refus du fournisseur : la clé, la liste, l'adresse d'un webhook, ou une panne (avec son statut). `message` remplace le message ordinaire. */
class Refus extends Error {
  // Pas de propriétés de paramètre : les tests lisent ce fichier sans le compiler (types effacés seulement).
  readonly raison: 'cle' | 'liste' | 'adresse' | 'panne';
  readonly statut: number;
  constructor(raison: Refus['raison'], statut = 0, message = '') { super(message); this.raison = raison; this.statut = statut; }
}

/** Une requête chez le fournisseur, sans suivre de redirection, bornée dans le temps. */
const requete = (f: typeof fetch, url: string, init: RequestInit = {}, delai = 8000) => f(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(delai) });

/** Une requête chez le fournisseur, et sa réponse lue en JSON, telle quelle ; un refus si elle ne va pas. */
async function appelerBrut(f: typeof fetch, url: string, init: RequestInit = {}, delai = 8000): Promise<unknown> {
  const r = await requete(f, url, init, delai);
  if (r.status === 401 || r.status === 403) throw new Refus('cle', r.status);
  if (r.status === 404) throw new Refus('liste', r.status);
  if (!r.ok) throw new Refus('panne', r.status);
  return r.json().catch(() => ({}));
}

/** La même, quand la réponse est un objet (le reste devient un objet vide). */
async function appeler(f: typeof fetch, url: string, init: RequestInit = {}, delai = 8000): Promise<Record<string, unknown>> {
  const corps = await appelerBrut(f, url, init, delai);
  return corps && typeof corps === 'object' && !Array.isArray(corps) ? corps as Record<string, unknown> : {};
}

/** Les objets d'un tableau rendu par une API (le reste est ignoré). */
const objets = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : []);
/** Un texte venu d'une API, sans caractère de contrôle, borné. */
const propre = (v: unknown, max = 80) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
const enListes = (v: unknown): ListeFournisseur[] => objets(v).map(l => ({ id: propre(l.id, 70), nom: propre(l.name) }));
/** Le nom d'une liste parmi celles du compte (pour les API qui ne lisent pas une liste seule). */
const parmi = (listes: ListeFournisseur[], id: string) => {
  const trouvee = listes.find(l => l.id === id);
  if (!trouvee) throw new Refus('liste');
  return trouvee.nom;
};
const json = { 'content-type': 'application/json', accept: 'application/json' };

/** Ce qui part chez le fournisseur pour un inscrit ; `page`, l'adresse de la page où il s'est inscrit. */
interface Inscrit { email: string; prenom: string; ts: number; source: string; page: string }

/** Ce que Hopla sait faire chez un fournisseur. Chaque fonction lève un `Refus` (ou une erreur réseau) quand ça ne va pas. */
interface Pilote {
  /** La forme d'un identifiant de liste (vide : sans liste, si la forme l'accepte). */
  forme: RegExp;
  /** Les listes du compte, pour les choisir par leur nom. */
  listes(cle: string, f: typeof fetch): Promise<ListeFournisseur[]>;
  /** Vérifie la clé et la liste (pour un webhook, lui envoie un inscrit d'exemple) ; renvoie le nom de la liste. */
  nom(cle: string, liste: string, f: typeof fetch, page: string): Promise<string>;
  /** Envoie un inscrit. */
  pousser(cle: string, liste: string, c: Inscrit, f: typeof fetch): Promise<void>;
}

const enteteBrevo = (cle: string) => ({ 'api-key': cle, accept: 'application/json' });
const brevo: Pilote = {
  forme: /^\d{1,10}$/,
  async listes(cle, f) {
    const toutes: ListeFournisseur[] = [];
    // Brevo rend 50 listes à la fois : les plus récentes d'abord, 500 au plus.
    for (let decalage = 0; decalage < 500; decalage += 50) {
      const page = enListes((await appeler(f, `https://api.brevo.com/v3/contacts/lists?limit=50&offset=${decalage}&sort=desc`, { headers: enteteBrevo(cle) })).lists);
      toutes.push(...page);
      if (page.length < 50) break;
    }
    return toutes;
  },
  nom: async (cle, liste, f) => propre((await appeler(f, `https://api.brevo.com/v3/contacts/lists/${liste}`, { headers: enteteBrevo(cle) })).name),
  async pousser(cle, liste, c, f) {
    const envoyer = (avecPrenom: boolean) => requete(f, 'https://api.brevo.com/v3/contacts', {
      method: 'POST', headers: { ...enteteBrevo(cle), ...json },
      body: JSON.stringify({ email: c.email, listIds: [Number(liste)], updateEnabled: true, ...(avecPrenom && c.prenom ? { attributes: { PRENOM: c.prenom, FIRSTNAME: c.prenom } } : {}) }),
    }, 6000);
    let r = await envoyer(true);
    // Brevo répond 400 « duplicate » pour une adresse déjà là : elle est bien dans la liste. Un autre 400 avec le prénom : un compte
    // qui n'a pas l'attribut PRENOM ou FIRSTNAME ; l'adresse repart seule, mieux vaut un inscrit sans prénom que pas d'inscrit.
    if (r.status === 400) {
      if (/duplicate/i.test(await r.text().catch(() => ''))) return;
      if (c.prenom) r = await envoyer(false);
    }
    if (r.status === 401 || r.status === 403) throw new Refus('cle', r.status);
    if (!r.ok && !(r.status === 400 && /duplicate/i.test(await r.text().catch(() => '')))) throw new Refus('panne', r.status);
  },
};

/** Le centre de données d'une clé Mailchimp (`…-us21`), ou vide. */
const centreMailchimp = (cle: string) => { const m = /-([a-z]{2,4}\d{1,3})$/.exec(cle); return m ? m[1] : ''; };
function baseMailchimp(cle: string) {
  const dc = centreMailchimp(cle);
  if (!dc) throw new Refus('cle', 0, 'Ta clé Mailchimp finit par son centre de données, comme « -us21 » : copie-la en entier.');
  return `https://${dc}.api.mailchimp.com/3.0`;
}
const enteteMailchimp = (cle: string) => ({ Authorization: `Basic ${Buffer.from(`hopla:${cle}`).toString('base64')}`, accept: 'application/json' });
const mailchimp: Pilote = {
  forme: /^[a-z0-9]{4,20}$/,
  listes: async (cle, f) => enListes((await appeler(f, `${baseMailchimp(cle)}/lists?fields=lists.id,lists.name&count=100`, { headers: enteteMailchimp(cle) })).lists),
  nom: async (cle, liste, f) => propre((await appeler(f, `${baseMailchimp(cle)}/lists/${liste}?fields=name`, { headers: enteteMailchimp(cle) })).name),
  async pousser(cle, liste, c, f) {
    const id = createHash('md5').update(c.email.toLowerCase()).digest('hex');
    const envoyer = (avecPrenom: boolean) => appeler(f, `${baseMailchimp(cle)}/lists/${liste}/members/${id}`, {
      method: 'PUT', headers: { ...enteteMailchimp(cle), ...json },
      body: JSON.stringify({ email_address: c.email, status_if_new: 'subscribed', ...(avecPrenom && c.prenom ? { merge_fields: { FNAME: c.prenom } } : {}) }),
    }, 6000);
    // Une audience sans le champ FNAME refuse le prénom (400) : l'adresse repart seule.
    try { await envoyer(true); } catch (e) { if (!(e instanceof Refus && e.raison === 'panne' && e.statut === 400 && c.prenom)) throw e; await envoyer(false); }
  },
};

/** Kit (API v4) : les inscrits vont dans un formulaire, où il faut d'abord les créer. */
const enteteKit = (cle: string) => ({ 'X-Kit-Api-Key': cle, accept: 'application/json' });
const formsKit = async (cle: string, f: typeof fetch) => enListes((await appeler(f, 'https://api.kit.com/v4/forms?status=active&per_page=1000', { headers: enteteKit(cle) })).forms);
const kit: Pilote = {
  forme: /^\d{1,12}$/,
  listes: formsKit,
  nom: async (cle, liste, f) => parmi(await formsKit(cle, f), liste),
  async pousser(cle, liste, c, f) {
    const entetes = { ...enteteKit(cle), ...json };
    await appeler(f, 'https://api.kit.com/v4/subscribers', { method: 'POST', headers: entetes, body: JSON.stringify({ email_address: c.email, ...(c.prenom ? { first_name: c.prenom } : {}) }) }, 6000);
    await appeler(f, `https://api.kit.com/v4/forms/${liste}/subscribers`, { method: 'POST', headers: entetes, body: JSON.stringify({ email_address: c.email, ...(c.page ? { referrer: c.page } : {}) }) }, 6000);
  },
};

const enteteMailerlite = (cle: string) => ({ Authorization: `Bearer ${cle}`, accept: 'application/json' });
const groupesMailerlite = async (cle: string, f: typeof fetch) => enListes((await appeler(f, 'https://connect.mailerlite.com/api/groups?limit=100&sort=name', { headers: enteteMailerlite(cle) })).data);
const mailerlite: Pilote = {
  forme: /^\d{1,24}$/,
  listes: groupesMailerlite,
  nom: async (cle, liste, f) => parmi(await groupesMailerlite(cle, f), liste),
  async pousser(cle, liste, c, f) {
    // Un inscrit déjà là garde ses groupes et son statut : celui-ci s'ajoute.
    await appeler(f, 'https://connect.mailerlite.com/api/subscribers', {
      method: 'POST', headers: { ...enteteMailerlite(cle), ...json },
      body: JSON.stringify({ email: c.email, groups: [liste], ...(c.prenom ? { fields: { name: c.prenom } } : {}) }),
    }, 6000);
  },
};

const enteteBeehiiv = (cle: string) => ({ Authorization: `Bearer ${cle}`, accept: 'application/json' });
const beehiiv: Pilote = {
  forme: /^pub_[\w-]{8,64}$/,
  listes: async (cle, f) => enListes((await appeler(f, 'https://api.beehiiv.com/v2/publications?limit=100', { headers: enteteBeehiiv(cle) })).data),
  async nom(cle, liste, f) {
    const corps = await appeler(f, `https://api.beehiiv.com/v2/publications/${liste}`, { headers: enteteBeehiiv(cle) });
    return propre(objets([corps.data])[0]?.name);
  },
  async pousser(cle, liste, c, f) {
    // beehiiv envoie son e-mail de bienvenue ; une adresse désinscrite n'est pas réinscrite.
    await appeler(f, `https://api.beehiiv.com/v2/publications/${liste}/subscriptions`, {
      method: 'POST', headers: { ...enteteBeehiiv(cle), ...json },
      body: JSON.stringify({ email: c.email, reactivate_existing: false, send_welcome_email: true, utm_source: 'hopla', ...(c.page ? { referring_site: c.page } : {}) }),
    }, 6000);
  },
};

/** Systeme.io : un contact, retrouvé par son adresse ou créé, puis marqué du tag choisi (facultatif). */
const enteteSysteme = (cle: string) => ({ 'X-API-Key': cle, accept: 'application/json' });
const systeme: Pilote = {
  forme: /^(\d{1,12})?$/,
  // Un tag est facultatif : « Sans tag » vient en premier.
  listes: async (cle, f) => [{ id: '', nom: 'Sans tag' }, ...enListes((await appeler(f, 'https://api.systeme.io/api/tags?limit=100', { headers: enteteSysteme(cle) })).items)],
  async nom(cle, liste, f) {
    // Sans tag, il reste à vérifier la clé.
    if (!liste) { await appeler(f, 'https://api.systeme.io/api/tags?limit=10', { headers: enteteSysteme(cle) }); return ''; }
    return propre((await appeler(f, `https://api.systeme.io/api/tags/${liste}`, { headers: enteteSysteme(cle) })).name);
  },
  async pousser(cle, liste, c, f) {
    const entetes = enteteSysteme(cle);
    const trouves = objets((await appeler(f, `https://api.systeme.io/api/contacts?email=${encodeURIComponent(c.email)}&limit=10`, { headers: entetes }, 6000)).items);
    // Seulement le contact de cette adresse : un filtre ignoré rendrait les premiers contacts du compte.
    const existant = trouves.find(x => propre(x.email, 200).toLowerCase() === c.email);
    const id = propre(existant ? existant.id : (await appeler(f, 'https://api.systeme.io/api/contacts', {
      method: 'POST', headers: { ...entetes, ...json },
      body: JSON.stringify({ email: c.email, ...(c.prenom ? { fields: [{ slug: 'first_name', value: c.prenom }] } : {}) }),
    }, 6000)).id, 20);
    if (!/^\d{1,15}$/.test(id)) throw new Refus('panne');
    if (!liste || objets(existant?.tags).some(t => propre(t.id, 20) === liste)) return;
    await appeler(f, `https://api.systeme.io/api/contacts/${id}/tags`, { method: 'POST', headers: { ...entetes, ...json }, body: JSON.stringify({ tagId: Number(liste) }) }, 6000);
  },
};

/**
 * MailCheap (25 octobre 2026, demandé par Lilian) : un inscrit part comme par le formulaire de son archive, et reçoit
 * l'e-mail de bienvenue ou de confirmation. Une clé « Signups only » suffit et ne lit rien d'autre : elle ne voit pas
 * les newsletters du compte (403), ses inscrits vont dans la première, celle que le compte a depuis le plus longtemps.
 */
const MAILCHEAP = 'https://mailcheap.ai/api/v1';
const enteteMailcheap = (cle: string) => ({ Authorization: `Bearer ${cle}`, accept: 'application/json' });
/** Vérifie une clé sans inscrire personne : une adresse qui n'en est pas une est refusée (400) après la clé (401). */
async function essaiMailcheap(cle: string, f: typeof fetch) {
  const r = await requete(f, `${MAILCHEAP}/contacts`, { method: 'POST', headers: { ...enteteMailcheap(cle), ...json }, body: JSON.stringify({ email: 'hopla' }) });
  if (r.status === 401 || r.status === 403) throw new Refus('cle', r.status);
  if (r.status >= 500) throw new Refus('panne', r.status);
}
async function newslettersMailcheap(cle: string, f: typeof fetch): Promise<ListeFournisseur[]> {
  try {
    return enListes((await appeler(f, `${MAILCHEAP}/newsletters`, { headers: enteteMailcheap(cle) })).newsletters);
  } catch (e) {
    if (!(e instanceof Refus && e.statut === 403)) throw e;
    await essaiMailcheap(cle, f);
    return [{ id: '', nom: 'Ta newsletter' }];
  }
}
const mailcheap: Pilote = {
  forme: /^([a-f0-9]{24})?$/,
  listes: newslettersMailcheap,
  async nom(cle, liste, f) {
    if (!liste) { await essaiMailcheap(cle, f); return ''; }
    return parmi(await newslettersMailcheap(cle, f), liste);
  },
  async pousser(cle, liste, c, f) {
    await appeler(f, `${MAILCHEAP}/contacts`, {
      method: 'POST', headers: { ...enteteMailcheap(cle), ...json },
      body: JSON.stringify({ email: c.email, source: 'hopla', ...(liste ? { newsletter: liste } : {}), ...(c.prenom ? { firstName: c.prenom } : {}) }),
    }, 6000);
  },
};

/** Loops (25 octobre 2026, demandé par Lilian) : un contact de l'audience, ajouté s'il le faut à une liste. */
const LOOPS = 'https://app.loops.so/api/v1';
const enteteLoops = (cle: string) => ({ Authorization: `Bearer ${cle}`, accept: 'application/json' });
const listesLoops = async (cle: string, f: typeof fetch) => enListes(await appelerBrut(f, `${LOOPS}/lists`, { headers: enteteLoops(cle) }));
const loops: Pilote = {
  forme: /^([a-z0-9]{8,40})?$/,
  // Une liste est facultative : sans elle, l'inscrit rejoint l'audience.
  listes: async (cle, f) => [{ id: '', nom: 'Toute ton audience' }, ...await listesLoops(cle, f)],
  async nom(cle, liste, f) {
    await appeler(f, `${LOOPS}/api-key`, { headers: enteteLoops(cle) });
    return liste ? parmi(await listesLoops(cle, f), liste) : '';
  },
  async pousser(cle, liste, c, f) {
    // Met à jour le contact, ou le crée : une adresse déjà là ne fait pas d'erreur.
    await appeler(f, `${LOOPS}/contacts/update`, {
      method: 'PUT', headers: { ...enteteLoops(cle), ...json },
      body: JSON.stringify({ email: c.email, source: 'Hopla', ...(c.prenom ? { firstName: c.prenom } : {}), ...(liste ? { mailingLists: { [liste]: true } } : {}) }),
    }, 6000);
  },
};

/** Ce que reçoit un webhook pour un inscrit : les colonnes du CSV, la page, et `exemple` (vrai pour l'envoi d'essai). */
const corpsWebhook = (c: Inscrit, exemple: boolean) => JSON.stringify({ email: c.email, prenom: c.prenom, inscrit_le: new Date(c.ts).toISOString(), provenance: c.source, page: c.page, exemple });

const webhook = (outil: Webhook): Pilote => {
  const poster = async (cle: string, c: Inscrit, exemple: boolean, f: typeof fetch) => {
    const u = adresseWebhook(outil, cle);
    if (!u) throw new Refus('adresse');
    await appeler(f, u.href, { method: 'POST', headers: json, body: corpsWebhook(c, exemple) }, exemple ? 8000 : 6000);
    return u;
  };
  return {
    forme: /^$/,
    listes: async () => [],
    nom: async (cle, _liste, f, page) => (await poster(cle, { email: 'exemple@hopla.page', prenom: 'Camille', ts: Date.now(), source: 'Instagram', page }, true, f)).host,
    pousser: async (cle, _liste, c, f) => { await poster(cle, c, false, f); },
  };
};

const PILOTES: Record<FournisseurListe, Pilote> = {
  brevo, mailchimp, kit, mailerlite, beehiiv, systeme, mailcheap, loops, make: webhook('make'), zapier: webhook('zapier'), n8n: webhook('n8n'),
};

/** Le nom de la connexion refusée par `requeteSortante` : une adresse du réseau interne. */
const adresseRefusee = (e: unknown) => (e as { code?: string })?.code === 'EREFUSEE' || (e as Error)?.message === 'Adresse refusée.';

/** Ce que dit le back office quand un fournisseur refuse ou ne répond pas. */
function messageEchec(fournisseur: FournisseurListe, e: unknown): string {
  const nom = NOMS_FOURNISSEURS[fournisseur];
  if (adresseRefusee(e)) return 'Hopla n’envoie rien à cette adresse.';
  if (!(e instanceof Refus)) return `${nom} ne répond pas. Réessaie dans un instant.`;
  if (e.message) return e.message;
  if (estWebhook(fournisseur)) {
    if (e.raison === 'adresse') return ADRESSE_WEBHOOK[fournisseur];
    if (e.raison === 'cle') return `${nom} refuse cette adresse.`;
    if (e.raison === 'liste' || e.statut === 410) return `${nom} ne trouve pas ce webhook. Vérifie l’adresse, et que ${OUVRAGE_WEBHOOK[fournisseur]} est actif.`;
  } else {
    if (e.raison === 'cle') return `${nom} refuse cette clé.`;
    if (e.raison === 'liste') return `${nom} ne trouve pas ${LISTE_CHEZ[fournisseur].cette}.`;
  }
  return `${nom} ne répond pas (${e.statut}). Réessaie dans un instant.`;
}

/** Les listes du compte chez une newsletter, pour en choisir une par son nom. */
export async function listes(fournisseur: FournisseurListe, cle: string, f: typeof fetch): Promise<{ ok: boolean; message: string; listes: ListeFournisseur[] }> {
  if (estWebhook(fournisseur)) return { ok: false, message: 'Un webhook n’a pas de liste.', listes: [] };
  const pilote = PILOTES[fournisseur];
  try {
    // Un identifiant vide, quand la forme l'accepte : sans tag, sans liste, la première newsletter.
    const trouvees = (await pilote.listes(cle, f)).filter(l => pilote.forme.test(l.id));
    return { ok: true, message: trouvees.length ? '' : LISTE_CHEZ[fournisseur].vide, listes: trouvees };
  } catch (e) {
    // Une liste vide peut répondre 404 : la clé, elle, est passée.
    if (e instanceof Refus && e.raison === 'liste') return { ok: true, message: LISTE_CHEZ[fournisseur].vide, listes: [] };
    return { ok: false, message: messageEchec(fournisseur, e), listes: [] };
  }
}

/**
 * Vérifie la clé et la liste chez le fournisseur (un webhook reçoit un inscrit d'exemple, marqué `exemple`) ;
 * renvoie le nom de la liste, ou l'hôte du webhook. `page` : l'adresse de la page, pour l'exemple.
 */
export async function verifier(fournisseur: FournisseurListe, cle: string, liste: string, f: typeof fetch, page = ''): Promise<{ ok: boolean; message: string; nom?: string }> {
  const pilote = PILOTES[fournisseur];
  if (!pilote.forme.test(liste)) return { ok: false, message: estWebhook(fournisseur) ? 'Un webhook n’a pas de liste.' : `Choisis ${LISTE_CHEZ[fournisseur].la} où vont tes inscrits.` };
  const nom = NOMS_FOURNISSEURS[fournisseur];
  try {
    const trouve = await pilote.nom(cle, liste, f, page);
    if (estWebhook(fournisseur)) return { ok: true, message: `Branché sur ${nom}. Un inscrit d’exemple vient d’y partir.`, nom: trouve };
    return { ok: true, message: `Branché sur ${nom}${trouve ? `, ${LISTE_CHEZ[fournisseur].la} « ${trouve} »` : ''}.`, nom: trouve };
  } catch (e) { return { ok: false, message: messageEchec(fournisseur, e) }; }
}

/** L'adresse publique de la page d'un compte, pour le fournisseur (beehiiv, Kit, un webhook). */
function pageDe(env: Env, compte: string): string {
  const c = db.compteParId(compte);
  return c ? `${env.LIENS_ORIGINE || ORIGINE_PUBLIQUE}${cheminPage({ pseudo: c.pseudo, principal: c.id === PRINCIPAL })}` : '';
}
export { pageDe as adressePage };

/** Envoie un inscrit chez le fournisseur branché ; note le résultat sur le contact. */
export async function pousser(env: Env, compte: string, contact: db.ContactAEnvoyer, f: typeof fetch): Promise<boolean> {
  const integ = db.lireIntegration(compte);
  if (!integ) return false;
  const cle = dechiffrer(env, integ.cle);
  const pilote = PILOTES[integ.fournisseur] as Pilote | undefined;
  if (!cle || !pilote || !pilote.forme.test(integ.liste)) { db.noterSynchro(contact.id, 'erreur'); return false; }
  try {
    await pilote.pousser(cle, integ.liste, { email: contact.email, prenom: contact.prenom, ts: contact.ts, source: contact.source, page: pageDe(env, compte) }, f);
    db.noterSynchro(contact.id, 'ok');
    return true;
  } catch (error) {
    console.error('[liens] liste', integ.fournisseur, error instanceof Refus ? error.statut : (error as Error).message);
    db.noterSynchro(contact.id, 'erreur');
    return false;
  }
}

/** Ce qui se montre de la clé : ses quatre derniers caractères ; d'un webhook, son hôte et la fin de son adresse. */
function masquer(fournisseur: FournisseurListe, cle: string): string {
  const fin = cle.replace(/\/+$/, '').slice(-4);
  const u = estWebhook(fournisseur) ? adresseWebhook(fournisseur, cle) : null;
  return u ? `${u.host}/…${fin}` : `•••• ${fin}`;
}

export function resumeIntegration(env: Env, compte: string): IntegrationListe | null {
  const integ = db.lireIntegration(compte);
  if (!integ || !(integ.fournisseur in PILOTES)) return null;
  const cle = dechiffrer(env, integ.cle);
  return { fournisseur: integ.fournisseur, liste: integ.liste, nom: integ.nom, cle: cle ? masquer(integ.fournisseur, cle) : '' };
}

/** Au plus 20 appels aux fournisseurs par 10 minutes et par compte, depuis le back office (lister, brancher, renvoyer). */
const appelsDuCompte = limiteur([20, 10 * MINUTE]);
export const tropDAppels = (compte: string, maintenant = Date.now()) => appelsDuCompte(compte, maintenant);

/** Au plus 5 inscriptions par 10 minutes et par adresse IP (un /64 en IPv6). */
const recents = limiteur([5, 10 * MINUTE]);
const tropRapide = (ip: string, maintenant: number) => recents(cleIp(ip), maintenant);

const MESSAGE_OK = 'C’est noté, merci !';

/** Le formulaire d'une page : vérifie, garde l'inscrit, l'envoie chez le fournisseur. */
export async function inscrire(env: Env, fetchImpl: typeof fetch, entree: Record<string, unknown>, contexte: { ip: string; ua: string; referent: string; hotes?: Set<string> }, maintenant = Date.now()): Promise<{ status: number; message: string; cadeau?: string }> {
  // Le champ caché qu'un humain ne remplit pas.
  if (entree.website) return { status: 200, message: MESSAGE_OK };
  const adresse = validerEmail(entree.email);
  if (!adresse) return { status: 400, message: 'Cette adresse e-mail ne semble pas valide.' };
  if (tropRapide(contexte.ip || 'inconnu', maintenant)) return { status: 429, message: 'Trop d’essais. Réessaie dans quelques minutes.' };
  const page = typeof entree.page === 'string' ? entree.page : '';
  const compte = page ? db.compteParPseudo(page) : db.compteParId('principal');
  if (!compte || compte.statut !== 'actif') return { status: 404, message: 'Cette page n’existe plus.' };
  // Le formulaire n'existe que dans l'offre qui le comprend (la page publique ne le montre pas sans elle).
  const d = droits(compte, env, maintenant);
  if (!d.listeEmail) return { status: 404, message: 'Ce formulaire n’existe plus.' };
  const bloc = db.lireBlocs(compte.id).find(b => b.id === entree.bloc && b.type === 'inscription' && b.public);
  if (!bloc) return { status: 404, message: 'Ce formulaire n’existe plus.' };
  // Une adresse gardée part parfois chez une newsletter, qui lui écrit : un robot n'en inscrit pas à la chaîne.
  if (!(await verifierTurnstile(env, fetchImpl, { jeton: entree.jeton, action: 'liste', ip: contexte.ip, hotes: contexte.hotes ?? new Set() }, maintenant))) return { status: 403, message: MESSAGE_ROBOT };
  if (db.contactsDuJour(compte.id, maintenant) >= 2000) return { status: 429, message: 'Trop d’inscriptions aujourd’hui. Réessaie demain.' };
  const prenom = bloc.demanderPrenom && typeof entree.prenom === 'string' ? entree.prenom.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 60) : '';
  const contact = db.ajouterContact(compte.id, { email: adresse, prenom, source: source(typeof entree.utm === 'string' ? entree.utm : '', contexte.referent, contexte.ua), bloc: bloc.id }, maintenant);
  // Une adresse déjà inscrite reçoit la même réponse : la page ne dit pas qui est sur la liste.
  // Le visiteur n'attend pas un fournisseur lent : au-delà de 4 secondes, l'envoi finit sans lui (et se note sur le contact).
  if (contact) await Promise.race([pousser(env, compte.id, contact, fetchImpl), new Promise(fin => { setTimeout(fin, 4000).unref?.(); })]);
  // Le cadeau (Pro) s'ouvre une fois l'adresse laissée, déjà inscrite ou non : son adresse n'a jamais été dans la page.
  return { status: 200, message: MESSAGE_OK, ...(d.cadeau && bloc.cadeau?.url ? { cadeau: bloc.cadeau.url } : {}) };
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

/**
 * Les adresses à donner à Substack, qui n'a pas d'API : à coller dans « Add subscribers », ou en fichier pour
 * « Import CSV » (une colonne `email`). Une adresse qui commencerait comme une formule de tableur n'y part pas.
 */
export const adressesSubstack = (compte: string) => db.tousLesContacts(compte).map(c => c.email).filter(e => !/^[=+\-@]/.test(e));
export const csvSubstack = (compte: string) => `email\n${adressesSubstack(compte).map(e => `${e}\n`).join('')}`;
