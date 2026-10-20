import { CONTACT_LEGAL } from '../lib/legal.ts';
import type { Origines } from '../lib/types.ts';
import { sansSchema } from '../lib/types.ts';
import { nomSaisi, email as validerEmail, pseudo as validerPseudo } from '../lib/valider.ts';
import * as db from './db.ts';
import { inviter } from './auth.ts';
import type { Reponse } from './auth.ts';
import { bouton, envoyer, enveloppe } from './courriel.ts';
import type { Env } from './courriel.ts';

/*
 * Prendre son nom depuis l'accueil. On tape un nom, Hopla dit s'il est libre ;
 * on laisse son adresse. Deux modes, choisis par `LIENS_INSCRIPTION` :
 *
 * - libre (par défaut) : la page se crée tout de suite et le lien pour y
 *   entrer (7 jours) part à cette adresse, qui arrive dans ses premiers pas ;
 * - `attente` : le nom est gardé et un e-mail le confirme. Lilian invite
 *   ensuite depuis l'onglet Comptes, ce qui crée la page et envoie le lien.
 *
 * Comme pour la connexion, la réponse ne dit jamais si une adresse a déjà une
 * page ou une réservation : c'est l'e-mail, envoyé à cette adresse seulement,
 * qui le lui rappelle.
 */

export const inscriptionLibre = (env: Env) => env.LIENS_INSCRIPTION?.trim() !== 'attente';

export type EtatNom = { etat: 'libre' | 'pris' | 'invalide'; nom: string; suggestions: string[] };

/** Deux variantes libres d'un nom déjà pris. */
function suggestions(nom: string, annee = new Date().getFullYear()): string[] {
  const base = nom.slice(0, 22).replace(/-$/, '');
  const essais = [`${base}-page`, `${base}-${String(annee).slice(2)}`, `le-${base}`, `${base}-hq`, `${base}-off`, `${base}${Math.floor(Math.random() * 90 + 10)}`];
  return essais.filter(e => validerPseudo(e) === e && !db.nomPris(e)).slice(0, 2);
}

export function verifierNom(saisie: string): EtatNom {
  const nom = nomSaisi(saisie).replace(/-$/, '');
  if (!/^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/.test(nom) || nom.includes('--')) return { etat: 'invalide', nom, suggestions: [] };
  // Un nom réservé par Hopla (admin, lilian…) se lit comme un nom déjà pris.
  return validerPseudo(nom) !== nom || db.nomPris(nom) ? { etat: 'pris', nom, suggestions: suggestions(nom) } : { etat: 'libre', nom, suggestions: [] };
}

const parIp = new Map<string, number[]>();
/** Au plus 5 réservations par heure depuis une même adresse IP. */
function tropInsistante(ip: string, maintenant: number) {
  const recentes = (parIp.get(ip) ?? []).filter(t => maintenant - t < 3_600_000);
  if (parIp.size > 5000) parIp.clear();
  if (recentes.length >= 5) return true;
  parIp.set(ip, [...recentes, maintenant]);
  return false;
}
/** Au-delà, l'accueil demande de revenir demain : personne ne vide la liste des noms d'un coup. */
const PLAFOND_JOUR = 300;

/** L'adresse a déjà une page ou un nom : rien ne change, et seule sa boîte apprend pourquoi. */
async function rappeler(origines: Origines, env: Env, adresse: string, deja: { compte: string } | { reservation: string }, fetchImpl: typeof fetch) {
  const page = (p: string) => `${origines.page}/${p}`;
  const [sujet, texte, lien, libelle] = 'compte' in deja
    ? ['Tu as déjà une page Hopla', `Ta page est déjà en ligne sur ${sansSchema(page(deja.compte))}. Pour la modifier, connecte-toi avec cette adresse.`, `${origines.admin}/admin`, 'Me connecter']
    : ['Ton nom Hopla est déjà réservé', `Tu as déjà réservé ${sansSchema(page(deja.reservation))}. Pendant la bêta, une adresse garde un seul nom : ton invitation arrivera ici.`, page(deja.reservation), 'Voir mon adresse'];
  await envoyer(env, fetchImpl, { to: adresse, subject: sujet, replyTo: CONTACT_LEGAL, html: enveloppe(`<p>${texte}</p>${bouton(lien, libelle)}`), text: `${texte}\n${lien}` });
}

export async function reserverNom(origines: Origines, env: Env, saisie: { nom: string; email: string }, fetchImpl: typeof fetch = fetch, maintenant = Date.now(), ip = ''): Promise<Reponse> {
  const nom = validerPseudo(saisie.nom);
  const adresse = validerEmail(saisie.email);
  if (!nom) return { ok: false, message: 'Ce nom ne peut pas servir d’adresse. Choisis-en un autre.' };
  if (!adresse) return { ok: false, message: 'Cette adresse e-mail ne semble pas valide.' };
  if (tropInsistante(ip, maintenant)) return { ok: false, message: 'Trop de réservations depuis ta connexion. Réessaie dans une heure.' };
  if (db.reservationsDepuis(maintenant - 86_400_000) >= PLAFOND_JOUR) return { ok: false, message: 'Beaucoup de monde aujourd’hui. Réessaie demain, ton nom t’attendra peut-être.' };
  const note = { ok: true as const, message: `C’est noté. Ton invitation arrivera à ${adresse}.` };
  const deja = db.dejaInscrit(adresse);
  if (deja) { await rappeler(origines, env, adresse, deja, fetchImpl); return note; }
  if (!db.reserver(adresse, nom, maintenant)) return { ok: false, message: `hopla.page/${nom} vient d’être pris. Essaie une variante.` };
  const texte = `hopla.page/${nom} est à toi. On ouvre les pages petit à petit : ton invitation arrivera à cette adresse, avec un lien pour créer ta page en quatre questions.`;
  const parti = await envoyer(env, fetchImpl, {
    to: adresse, subject: 'Ton nom Hopla est réservé', replyTo: CONTACT_LEGAL,
    html: enveloppe(`<p>${texte}</p>
<p style="color:#666;font-size:14px">Tu n’as rien demandé ? Réponds à ce message et on efface ton adresse. Sans invitation, la réservation s’efface d’elle-même au bout d’un an.</p>`),
    text: `${texte}\n\nTu n’as rien demandé ? Réponds à ce message et on efface ton adresse.`,
  });
  // La réservation tient même si l'e-mail tarde : l'invitation repartira de la liste.
  if (!parti) console.error('[liens] confirmation de réservation non envoyée');
  return note;
}

/** Depuis l'onglet Comptes : la réservation devient une page, et l'invitation part. */
export async function inviterReservation(origines: Origines, env: Env, id: string, fetchImpl: typeof fetch = fetch): Promise<Reponse> {
  const r = db.reservationParId(id);
  if (!r) return { ok: false, message: 'Cette réservation n’existe plus.' };
  let compte: db.Compte;
  try { compte = db.creerCompte(r.email, r.pseudo); } catch (error) { return { ok: false, message: (error as Error).message }; }
  const envoi = await inviter(origines, env, compte, fetchImpl, 'reservation');
  return envoi.ok ? envoi : { ok: false, message: `Page créée, mais l’invitation n’est pas partie : ${envoi.message} Renvoie-la depuis la liste des comptes.` };
}

/**
 * L'inscription directe : la page se crée sous ce nom et le lien pour y entrer
 * part aussitôt. Une adresse qui avait réservé un nom pendant la liste
 * d'attente reçoit la page de ce nom-là ; une adresse qui a déjà une page
 * reçoit un rappel. La réponse est la même dans les trois cas.
 */
export async function creerHopla(origines: Origines, env: Env, saisie: { nom: string; email: string }, fetchImpl: typeof fetch = fetch, maintenant = Date.now(), ip = ''): Promise<Reponse> {
  const nom = validerPseudo(saisie.nom);
  const adresse = validerEmail(saisie.email);
  if (!nom) return { ok: false, message: 'Ce nom ne peut pas servir d’adresse. Choisis-en un autre.' };
  if (!adresse) return { ok: false, message: 'Cette adresse e-mail ne semble pas valide.' };
  if (tropInsistante(ip, maintenant)) return { ok: false, message: 'Trop de pages créées depuis ta connexion. Réessaie dans une heure.' };
  if (db.comptesDepuis(maintenant - 86_400_000) >= PLAFOND_JOUR) return { ok: false, message: 'Beaucoup de monde aujourd’hui. Réessaie demain, ton nom t’attendra peut-être.' };
  const note = { ok: true as const, message: `C’est parti. Ouvre l’e-mail envoyé à ${adresse} : un clic, et tu entres dans ta page.` };
  const reservation = db.reservationParEmail(adresse);
  if (reservation) return (await inviterReservation(origines, env, reservation.id, fetchImpl)).ok ? note : { ok: false, message: 'L’e-mail n’est pas parti. Réessaie dans un instant.' };
  const deja = db.dejaInscrit(adresse);
  if (deja) { await rappeler(origines, env, adresse, deja, fetchImpl); return note; }
  if (db.nomPris(nom)) return { ok: false, message: `hopla.page/${nom} vient d’être pris. Essaie une variante.` };
  let compte: db.Compte;
  try { compte = db.creerCompte(adresse, nom, maintenant); } catch { return { ok: false, message: `hopla.page/${nom} vient d’être pris. Essaie une variante.` }; }
  const envoi = await inviter(origines, env, compte, fetchImpl, 'inscription');
  // Sans e-mail, personne ne peut entrer dans la page : elle s'efface, le nom redevient libre.
  if (!envoi.ok) { db.supprimerCompte(compte.id); return { ok: false, message: 'L’e-mail n’est pas parti. Réessaie dans un instant.' }; }
  return note;
}
