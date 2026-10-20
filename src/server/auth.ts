import { createHash, randomBytes } from 'node:crypto';
import { PRINCIPAL, sansSchema } from '../lib/types.ts';
import type { Origines } from '../lib/types.ts';
import { ajouterJeton, compteParEmail, jetonsRecents, noterConnexion, supprimerJeton, verifierJeton } from './db.ts';
import type { Compte } from './db.ts';
import { bouton, envoyer, enveloppe } from './courriel.ts';
import type { Env } from './courriel.ts';

/*
 * La connexion au back office, sans mot de passe : on saisit son adresse, un
 * lien part par e-mail (Resend, déjà utilisé par le formulaire de contact), le
 * lien ouvre une session de 90 jours dans un cookie HttpOnly. On ne stocke que
 * l'empreinte des jetons, chacun rattaché à son compte.
 *
 * La réponse est la même que l'adresse ait un compte ou non : personne ne peut
 * s'en servir pour savoir qui a une page. Les comptes autres que celui de
 * Lilian n'existent que sur invitation (voir `inviter`).
 *
 * Variables d'environnement (facultatives) :
 *   LIENS_ADMIN_EMAIL  l'adresse du compte principal, CONTACT_TO sinon,
 *                      bonjour@liliansevoumian.fr à défaut ;
 *   CONTACT_FROM       l'expéditeur, Hopla <connexion@hopla.page> en production ;
 *   RESEND_API_KEY     requise en production pour envoyer les liens.
 */

export const COOKIE_SESSION = 'liens_session';
export const DUREE_SESSION = 90 * 86_400_000;
const DUREE_LIEN = 15 * 60_000;
/** Une invitation attend plus longtemps qu'un lien demandé à l'instant. */
const DUREE_INVITATION = 7 * 86_400_000;

export const empreinte = (jeton: string) => createHash('sha256').update(jeton).digest('hex');
const nouveauJeton = () => randomBytes(32).toString('base64url');

export const adresseAdmin = (env: Env) => env.LIENS_ADMIN_EMAIL?.trim() || env.CONTACT_TO?.trim() || 'bonjour@liliansevoumian.fr';

/** `bonjour@liliansevoumian.fr` devient `b•••••r@liliansevoumian.fr`. */
export function masquer(email: string): string {
  const [nom, domaine] = email.split('@');
  if (!domaine) return '•••';
  return `${nom.charAt(0)}${'•'.repeat(Math.max(1, nom.length - 2))}${nom.length > 1 ? nom.charAt(nom.length - 1) : ''}@${domaine}`;
}

export function lireCookie(entete: string | null | undefined, nom: string): string | null {
  for (const morceau of (entete ?? '').split(';')) {
    const [cle, ...valeur] = morceau.trim().split('=');
    if (cle === nom) return decodeURIComponent(valeur.join('='));
  }
  return null;
}

/** Le compte d'une session ouverte, ou null. */
export function compteDeSession(jeton: string | null | undefined): string | null {
  return jeton && /^[\w-]{20,80}$/.test(jeton) ? verifierJeton(empreinte(jeton), 'session') : null;
}

/** L'adresse à laquelle répond un compte : l'environnement pour le principal, la base pour les autres. */
export function compteParAdresse(email: string, env: Env): string | null {
  const e = email.trim().toLowerCase();
  if (e && e === adresseAdmin(env).toLowerCase()) return PRINCIPAL;
  const compte = compteParEmail(e);
  return compte && compte.statut === 'actif' ? compte.id : null;
}

export type Reponse = { ok: true; message: string; lienDev?: string } | { ok: false; message: string };

const demandesParIp = new Map<string, number[]>();
/** Au plus 3 demandes par heure depuis une même adresse IP : un inconnu ne peut ni bombarder une boîte ni épuiser le plafond du jour. */
function ipTropInsistante(ip: string, maintenant: number) {
  const recentes = (demandesParIp.get(ip) ?? []).filter(t => maintenant - t < 3_600_000);
  if (demandesParIp.size > 5000) demandesParIp.clear();
  if (recentes.length >= 3) return true;
  demandesParIp.set(ip, [...recentes, maintenant]);
  return false;
}

/**
 * Inscrit un lien de connexion pour `compte` et l'envoie à `destinataire`. Le
 * jeton est inscrit avant l'envoi : deux demandes simultanées ne passent pas
 * toutes deux le délai d'une minute. Il est retiré si l'envoi échoue.
 */
async function envoyerLien(o: {
  origines: Origines; env: Env; fetchImpl: typeof fetch; compte: string; destinataire: string; duree: number;
  sujet: string; html: (lien: string) => string; texte: (lien: string) => string;
}): Promise<Reponse> {
  const jeton = nouveauJeton();
  const lien = `${o.origines.admin}/admin/connexion?jeton=${jeton}`;
  if (!o.env.RESEND_API_KEY && o.env.NODE_ENV === 'production') return { ok: false, message: 'L’envoi d’e-mails n’est pas configuré sur le serveur.' };
  ajouterJeton(empreinte(jeton), 'connexion', o.duree, o.compte);
  if (!o.env.RESEND_API_KEY) {
    console.log(`[liens] lien de connexion (dev) : ${lien}`);
    return { ok: true, message: 'Mode développement : le lien est ci-dessous.', lienDev: lien };
  }
  const parti = await envoyer(o.env, o.fetchImpl, { to: o.destinataire, subject: o.sujet, html: o.html(lien), text: o.texte(lien) });
  if (!parti) { supprimerJeton(empreinte(jeton)); return { ok: false, message: 'L’e-mail n’est pas parti. Réessaie dans un instant.' }; }
  return { ok: true, message: '' };
}

export async function demanderConnexion(origines: Origines, env: Env, email: string, fetchImpl: typeof fetch = fetch, maintenant = Date.now(), ip = ''): Promise<Reponse> {
  const adresse = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adresse)) return { ok: false, message: 'Entre l’adresse e-mail de ton compte.' };
  if (ipTropInsistante(ip, maintenant)) return { ok: false, message: 'Trop de demandes. Réessaie dans une heure.' };
  if (jetonsRecents(maintenant - 86_400_000).n >= 200) return { ok: false, message: 'Trop de demandes aujourd’hui. Réessaie demain.' };
  const envoye = { ok: true as const, message: `Si ${adresse} a un compte, le lien vient de partir. Il marche une fois, pendant 15 minutes.` };
  const compte = compteParAdresse(adresse, env);
  if (!compte) return envoye;
  // Par compte : un lien par minute, dix par jour. Au-delà on se tait, pour ne rien révéler.
  const recents = jetonsRecents(maintenant - 86_400_000, compte);
  if (maintenant - recents.dernier < 60_000 || recents.n >= 10) return envoye;
  const r = await envoyerLien({
    origines, env, fetchImpl, compte, destinataire: adresse, duree: DUREE_LIEN,
    sujet: 'Ton lien de connexion',
    html: lien => enveloppe(`<p>Voici ton lien pour ouvrir le back office de ta page Hopla. Il marche une seule fois, pendant 15 minutes.</p>
${bouton(lien, 'Ouvrir mon back office')}
<p style="color:#666;font-size:14px">Tu n’as rien demandé ? Ignore ce message, personne ne peut s’en servir sans accès à ta boîte.</p>`),
    texte: lien => `Ouvre ton back office : ${lien}\nLe lien marche une seule fois, pendant 15 minutes.`,
  });
  return r.ok ? { ...envoye, lienDev: r.lienDev } : r;
}

/**
 * Le premier e-mail d'un compte : l'adresse de sa page et un lien valable une
 * semaine. `motif` dit d'où vient la page : ouverte par Lilian (`invitation`),
 * réservée depuis l'accueil pendant la liste d'attente (`reservation`), ou
 * créée à l'instant depuis l'accueil (`inscription`).
 */
export async function inviter(origines: Origines, env: Env, compte: Compte, fetchImpl: typeof fetch = fetch, motif: 'invitation' | 'reservation' | 'inscription' = 'invitation'): Promise<Reponse> {
  const page = `${origines.page}/${compte.pseudo}`;
  const lienPage = `<a href="${page}">${sansSchema(page)}</a>`;
  const intro = (adresse: string, texte = false) => ({
    invitation: texte ? `Lilian Sevoumian t’a ouvert une page sur Hopla : ${adresse}` : `Lilian Sevoumian t’a ouvert une page sur Hopla, à l’adresse ${adresse}.`,
    reservation: `Tu avais réservé ${adresse} : ta page est ouverte.`,
    inscription: `Ta page ${adresse} est créée.`,
  })[motif];
  const r = await envoyerLien({
    origines, env, fetchImpl, compte: compte.id, destinataire: compte.email, duree: DUREE_INVITATION,
    sujet: 'Ta page Hopla est prête',
    html: lien => enveloppe(`<p>Bonjour,</p>
<p>${intro(lienPage)} Elle est vide pour l’instant : ajoute tes liens, choisis un thème, et elle est en ligne.</p>
${bouton(lien, 'Créer ma page')}
<p style="color:#666;font-size:14px">Ce lien marche une seule fois, pendant 7 jours. Ensuite, tu te connectes depuis ${sansSchema(origines.admin)} avec cette adresse.${motif === 'inscription' ? ' Tu n’as rien demandé ? Réponds à ce message et on supprime la page.' : ''}</p>`),
    texte: lien => `${intro(page, true)}\nPour la créer : ${lien}\nLe lien marche une seule fois, pendant 7 jours. Ensuite, tu te connectes depuis ${origines.admin} avec cette adresse.`,
  });
  return r.ok ? { ok: true, message: `Invitation envoyée à ${compte.email}.`, lienDev: r.lienDev } : r;
}

/** Échange un lien de connexion (usage unique) contre un jeton de session du même compte. */
export function ouvrirSession(jetonConnexion: string): string | null {
  if (!/^[\w-]{20,80}$/.test(jetonConnexion)) return null;
  const compte = verifierJeton(empreinte(jetonConnexion), 'connexion', true);
  if (!compte) return null;
  const session = nouveauJeton();
  ajouterJeton(empreinte(session), 'session', DUREE_SESSION, compte);
  noterConnexion(compte);
  return session;
}

export const fermerSession = (jeton: string | null) => { if (jeton) supprimerJeton(empreinte(jeton)); };
