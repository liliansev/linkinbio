import { createHash, randomBytes } from 'node:crypto';
import { ajouterJeton, jetonsRecents, supprimerJeton, verifierJeton } from './db.ts';

/*
 * La connexion au back office, sans mot de passe : un bouton envoie un lien à
 * l'adresse de Lilian (par Resend, déjà utilisé par le formulaire de contact),
 * le lien ouvre une session de 90 jours dans un cookie HttpOnly. On ne stocke
 * que l'empreinte des jetons. Aucune adresse ne se saisit : le lien ne part
 * jamais ailleurs que dans la boîte de Lilian.
 *
 * Variables d'environnement (facultatives) :
 *   LIENS_ADMIN_EMAIL  la boîte qui reçoit le lien, CONTACT_TO sinon,
 *                      bonjour@liliansevoumian.fr à défaut ;
 *   CONTACT_FROM       l'expéditeur, formulaire@liliansevoumian.fr sinon ;
 *   RESEND_API_KEY     requise en production pour envoyer le lien.
 */

export const COOKIE_SESSION = 'liens_session';
export const DUREE_SESSION = 90 * 86_400_000;
const DUREE_LIEN = 15 * 60_000;

export const empreinte = (jeton: string) => createHash('sha256').update(jeton).digest('hex');
const nouveauJeton = () => randomBytes(32).toString('base64url');

type Env = Record<string, string | undefined>;
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

export function sessionValide(jeton: string | null | undefined): boolean {
  return !!jeton && /^[\w-]{20,80}$/.test(jeton) && verifierJeton(empreinte(jeton), 'session');
}

export type Reponse = { ok: true; message: string; lienDev?: string } | { ok: false; message: string };

const demandesParIp = new Map<string, number[]>();
/** Au plus 3 demandes par heure depuis une même adresse IP : un inconnu ne peut ni bombarder la boîte ni épuiser le plafond du jour. */
function ipTropInsistante(ip: string, maintenant: number) {
  const recentes = (demandesParIp.get(ip) ?? []).filter(t => maintenant - t < 3_600_000);
  if (demandesParIp.size > 5000) demandesParIp.clear();
  if (recentes.length >= 3) return true;
  demandesParIp.set(ip, [...recentes, maintenant]);
  return false;
}

export async function demanderConnexion(origine: string, env: Env, fetchImpl: typeof fetch = fetch, maintenant = Date.now(), ip = ''): Promise<Reponse> {
  const recents = jetonsRecents(maintenant - 86_400_000);
  if (maintenant - recents.dernier < 60_000) return { ok: false, message: 'Un lien vient de partir. Regarde ta boîte, ou réessaie dans une minute.' };
  if (ipTropInsistante(ip, maintenant)) return { ok: false, message: 'Trop de demandes. Réessaie dans une heure.' };
  if (recents.n >= 50) return { ok: false, message: 'Trop de demandes aujourd’hui. Réessaie demain.' };
  const jeton = nouveauJeton();
  const lien = `${origine}/liens/admin/connexion?jeton=${jeton}`;
  const destinataire = adresseAdmin(env);
  if (!env.RESEND_API_KEY) {
    if (env.NODE_ENV === 'production') return { ok: false, message: 'L’envoi d’e-mails n’est pas configuré sur le serveur.' };
    ajouterJeton(empreinte(jeton), 'connexion', DUREE_LIEN);
    console.log(`[liens] lien de connexion (dev) : ${lien}`);
    return { ok: true, message: 'Mode développement : le lien est ci-dessous.', lienDev: lien };
  }
  const html = `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#111">
<p>Voici ton lien pour ouvrir le back office de ta page de liens. Il marche une seule fois, pendant 15 minutes.</p>
<p><a href="${lien}" style="display:inline-block;background:#ffb38a;color:#111827;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">Ouvrir mon back office</a></p>
<p style="color:#666;font-size:14px">Tu n’as rien demandé ? Ignore ce message, personne ne peut s’en servir sans accès à ta boîte.</p></div>`;
  // Le jeton est inscrit avant l'envoi : deux demandes simultanées ne passent pas toutes deux le délai d'une minute.
  ajouterJeton(empreinte(jeton), 'connexion', DUREE_LIEN);
  try {
    const reponse = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Mes liens <${env.CONTACT_FROM?.trim() || 'formulaire@liliansevoumian.fr'}>`,
        to: [destinataire], subject: 'Ton lien de connexion', html,
        text: `Ouvre ton back office : ${lien}\nLe lien marche une seule fois, pendant 15 minutes.`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!reponse.ok) { console.error('[liens] Resend', reponse.status); supprimerJeton(empreinte(jeton)); return { ok: false, message: 'L’e-mail n’est pas parti. Réessaie dans un instant.' }; }
  } catch (error) {
    console.error('[liens] Resend', (error as Error).message);
    supprimerJeton(empreinte(jeton));
    return { ok: false, message: 'L’e-mail n’est pas parti. Réessaie dans un instant.' };
  }
  return { ok: true, message: `C’est parti : ouvre le lien reçu sur ${masquer(destinataire)}.` };
}

/** Échange un lien de connexion (usage unique) contre un jeton de session. */
export function ouvrirSession(jetonConnexion: string): string | null {
  if (!/^[\w-]{20,80}$/.test(jetonConnexion) || !verifierJeton(empreinte(jetonConnexion), 'connexion', true)) return null;
  const session = nouveauJeton();
  ajouterJeton(empreinte(session), 'session', DUREE_SESSION);
  return session;
}

export const fermerSession = (jeton: string | null) => { if (jeton) supprimerJeton(empreinte(jeton)); };
