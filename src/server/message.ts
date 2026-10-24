/*
 * Les blocs venus de Linktree qui passent par le serveur (24 octobre 2026) : « Me contacter », dont le message part
 * dans la boîte du propriétaire de la page sans que son adresse ne se montre, et la carte de visite, servie en fichier
 * vCard que le téléphone du visiteur range dans ses contacts.
 */
import type { Bloc } from '../lib/types.ts';
import { PRINCIPAL, estEnLigne, urlPage } from '../lib/types.ts';
import { email as validerEmail } from '../lib/valider.ts';
import * as db from './db.ts';
import { droits } from './droits.ts';
import type { Env } from './courriel.ts';
import { echapper, enveloppe, envoyer } from './courriel.ts';
import { adresseAdmin } from './auth.ts';
import { HEURE, JOUR, MINUTE, cleIp, limiteur } from './limites.ts';
import { verifierTurnstile } from './turnstile.ts';

/** Le bloc public d'une page, en ligne en ce moment, s'il est du type attendu ; la page doit être active. */
function blocPublic(pseudo: unknown, id: unknown, type: Bloc['type'], maintenant: number) {
  const compte = typeof pseudo === 'string' && pseudo ? db.compteParPseudo(pseudo) : db.compteParId(PRINCIPAL);
  if (!compte || compte.statut !== 'actif') return null;
  const bloc = db.lireBlocs(compte.id).find(b => b.id === id && b.type === type && estEnLigne(b, maintenant));
  return bloc ? { compte, bloc } : null;
}

/* ---- Me contacter ---- */

/** Trois messages par adresse IP en dix minutes, dix par jour : de quoi écrire, pas de quoi arroser. */
const parIp = limiteur([3, 10 * MINUTE], [10, JOUR]);
/** Une page ne reçoit pas plus de 20 messages par heure ni 50 par jour : sa boîte ne se noie pas. */
const parPage = limiteur([20, HEURE], [50, JOUR]);

const nettoyer = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '');

/**
 * Un message laissé dans « Me contacter ». Il part par e-mail au propriétaire de la page, avec l'adresse du visiteur en
 * réponse : un clic sur « Répondre » lui écrit. Hopla ne le garde pas. Les messages viennent de la page, dans son ton ;
 * le serveur ne donne que le statut.
 */
export async function envoyerMessage(env: Env, fetchImpl: typeof fetch, entree: Record<string, unknown>, contexte: { ip: string; hotes: Set<string> }, maintenant = Date.now()): Promise<{ status: number }> {
  // Le champ caché qu'un humain ne remplit pas : le robot croit que c'est parti.
  if (entree.website) return { status: 200 };
  const de = validerEmail(entree.email);
  const message = nettoyer(entree.message, 3000);
  const nom = nettoyer(entree.nom, 80).replace(/[<>]/g, '');
  if (!de || message.length < 2) return { status: 400 };
  const trouve = blocPublic(entree.page, entree.bloc, 'formulaire', maintenant);
  if (!trouve || !droits(trouve.compte, env, maintenant).formulaire) return { status: 404 };
  if (parIp(cleIp(contexte.ip || 'inconnu'), maintenant)) return { status: 429 };
  if (!(await verifierTurnstile(env, fetchImpl, { jeton: entree.jeton, action: 'message', ip: contexte.ip, hotes: contexte.hotes }, maintenant))) return { status: 403 };
  if (parPage(trouve.compte.id, maintenant)) return { status: 429 };
  const { compte } = trouve;
  const pour = compte.id === PRINCIPAL ? adresseAdmin(env) : compte.email;
  const page = urlPage({ pseudo: compte.pseudo, principal: compte.id === PRINCIPAL }).replace(/^https:\/\//, '');
  const qui = nom ? `${nom} (${de})` : de;
  const ok = await envoyer(env, fetchImpl, {
    to: pour,
    replyTo: de,
    subject: `Nouveau message de ${nom || de} sur ta page Hopla`,
    text: `${qui} t’a écrit depuis ${page} :\n\n${message}\n\nRéponds à cet e-mail pour lui répondre.\n\nHopla ne garde pas ce message.`,
    html: enveloppe(`<p><strong>${echapper(qui)}</strong> t’a écrit depuis ${echapper(page)} :</p>`
      + `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #292bff;background:#f6f6f8;white-space:pre-wrap">${echapper(message)}</blockquote>`
      + '<p>Réponds à cet e-mail pour lui répondre.</p><p style="color:#666;font-size:13px">Hopla ne garde pas ce message.</p>'),
  });
  return { status: ok ? 200 : 502 };
}

/* ---- La carte de visite ---- */

/** Une valeur de vCard : la barre oblique, la virgule, le point-virgule et le retour à la ligne s'échappent. */
const v = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** Le nom pour `N` : le dernier mot est le nom de famille, le reste le prénom (« Marie Dupont » : Dupont ; Marie). */
function nomDecoupe(complet: string): [string, string] {
  const mots = complet.trim().split(/\s+/);
  return mots.length > 1 ? [mots[mots.length - 1], mots.slice(0, -1).join(' ')] : [complet.trim(), ''];
}

/** Le fichier vCard (3.0, lu par iOS comme par Android) d'une carte de visite, et son nom de fichier ; null si elle n'est pas en ligne. */
export function carteDeVisite(pseudo: unknown, id: unknown, maintenant = Date.now()): { vcf: string; fichier: string } | null {
  const trouve = blocPublic(pseudo, id, 'coordonnees', maintenant);
  if (!trouve) return null;
  const { bloc, compte } = trouve;
  const c = bloc.coordonnees ?? { telephone: '', email: '', societe: '', poste: '' };
  const [famille, prenom] = nomDecoupe(bloc.titre);
  const page = urlPage({ pseudo: compte.pseudo, principal: compte.id === PRINCIPAL });
  const lignes = [
    'BEGIN:VCARD', 'VERSION:3.0',
    `N:${v(famille)};${v(prenom)};;;`, `FN:${v(bloc.titre.trim())}`,
    c.societe && `ORG:${v(c.societe)}`, c.poste && `TITLE:${v(c.poste)}`,
    c.telephone && `TEL;TYPE=CELL:${c.telephone.replace(/[^\d+]/g, '')}`,
    c.email && `EMAIL;TYPE=INTERNET:${c.email}`,
    bloc.url && /^https?:/.test(bloc.url) && `URL:${bloc.url}`,
    `URL:${page}`,
    bloc.adressePostale && `ADR;TYPE=WORK:;;${v(bloc.adressePostale.replace(/\s*\n\s*/g, ', '))};;;;`,
    'END:VCARD',
  ].filter(Boolean);
  const fichier = (bloc.titre.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'contact').slice(0, 60);
  return { vcf: `${lignes.join('\r\n')}\r\n`, fichier: `${fichier}.vcf` };
}
