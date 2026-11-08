import { CONTACT_LEGAL } from '../lib/legal.ts';
import type { Langue, Origines } from '../lib/types.ts';
import { NOM_PUBLIC, sansSchema } from '../lib/types.ts';
import { nomSaisi, email as validerEmail, pseudo as validerPseudo } from '../lib/valider.ts';
import * as db from './db.ts';
import { demanderConnexion, inviter } from './auth.ts';
import type { Reponse } from './auth.ts';
import { bouton, envoyer, enveloppe } from './courriel.ts';
import type { Env } from './courriel.ts';
import { HEURE, cleIp, destinataireSature, limiteur } from './limites.ts';

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

/** Le mot de la langue de l'accueil d'où vient la demande : l'anglais sur /, le français sur /fr (8 novembre 2026). */
const dire = (langue: Langue | undefined) => (fr: string, en: string) => (langue === 'en' ? en : fr);

export type EtatNom = { etat: 'libre' | 'pris' | 'invalide'; nom: string; suggestions: string[]; reserve?: boolean };

/** Deux variantes libres d'un nom déjà pris. */
function suggestions(nom: string, annee = new Date().getFullYear()): string[] {
  const base = nom.slice(0, 22).replace(/-$/, '');
  const essais = [`${base}-page`, `${base}-${String(annee).slice(2)}`, `le-${base}`, `${base}-hq`, `${base}-off`, `${base}${Math.floor(Math.random() * 90 + 10)}`];
  return essais.filter(e => validerPseudo(e) === e && !db.nomPris(e)).slice(0, 2);
}

export function verifierNom(saisie: string): EtatNom {
  const nom = nomSaisi(saisie).replace(/-$/, '');
  if (!/^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/.test(nom) || nom.includes('--')) return { etat: 'invalide', nom, suggestions: [] };
  if (db.nomPris(nom)) return { etat: 'pris', nom, suggestions: suggestions(nom) };
  // Un nom gardé par Hopla (admin, aide…) se lit comme un nom déjà pris, sans proposer de s'y connecter.
  return validerPseudo(nom) !== nom ? { etat: 'pris', nom, suggestions: suggestions(nom), reserve: true } : { etat: 'libre', nom, suggestions: [] };
}

/** Au plus 5 réservations par heure depuis une même adresse IP (un /64 en IPv6). */
const parIp = limiteur([5, HEURE]);
const tropInsistante = (ip: string, maintenant: number) => parIp(cleIp(ip), maintenant);
/**
 * Chaque envoi ci-dessous part vers une adresse tapée par un inconnu. Passé la limite (voir `destinataireSature`),
 * rien ne part : l'accueil le dit quand on vient de taper l'adresse, et se tait pour un renvoi.
 */
const tropDeCourriels = (langue?: Langue) => ({ ok: false as const, message: dire(langue)('Trop d’e-mails sont partis vers cette adresse. Réessaie plus tard.', 'Too many emails have been sent to this address. Try again later.') });
/** Au-delà, l'accueil demande de revenir demain : personne ne vide la liste des noms d'un coup. */
const PLAFOND_JOUR = 300;

/** L'adresse a déjà une page ou un nom : rien ne change, et seule sa boîte apprend pourquoi. */
async function rappeler(origines: Origines, env: Env, adresse: string, deja: { compte: string } | { reservation: string }, fetchImpl: typeof fetch, langue?: Langue) {
  const page = (p: string) => `${origines.page}/${p}`;
  const [sujet, texte, lien, libelle] = langue === 'en'
    ? ('compte' in deja
      ? ['You already have a Hopla page', `Your page is already live at ${sansSchema(page(deja.compte))}. To edit it, log in with this email address.`, `${origines.admin}/admin`, 'Log in']
      : ['Your Hopla name is already reserved', `You already reserved ${sansSchema(page(deja.reservation))}. During the beta, one email address keeps one name: your invite will arrive here.`, page(deja.reservation), 'See my address'])
    : 'compte' in deja
    ? ['Tu as déjà une page Hopla', `Ta page est déjà en ligne sur ${sansSchema(page(deja.compte))}. Pour la modifier, connecte-toi avec cette adresse.`, `${origines.admin}/admin`, 'Me connecter']
    : ['Ton nom Hopla est déjà réservé', `Tu as déjà réservé ${sansSchema(page(deja.reservation))}. Pendant la bêta, une adresse garde un seul nom : ton invitation arrivera ici.`, page(deja.reservation), 'Voir mon adresse'];
  await envoyer(env, fetchImpl, { to: adresse, subject: sujet, replyTo: CONTACT_LEGAL, html: enveloppe(`<p>${texte}</p>${bouton(lien, libelle)}`), text: `${texte}\n${lien}` });
}

export async function reserverNom(origines: Origines, env: Env, saisie: { nom: string; email: string; langue?: Langue }, fetchImpl: typeof fetch = fetch, maintenant = Date.now(), ip = ''): Promise<Reponse> {
  const d = dire(saisie.langue);
  const nom = validerPseudo(saisie.nom);
  const adresse = validerEmail(saisie.email);
  if (!nom) return { ok: false, message: d('Ce nom ne peut pas servir d’adresse. Choisis-en un autre.', 'This name can’t be used as an address. Pick another one.') };
  if (!adresse) return { ok: false, message: d('Cette adresse e-mail ne semble pas valide.', 'This email address doesn’t look valid.') };
  if (tropInsistante(ip, maintenant)) return { ok: false, message: d('Trop de réservations depuis ce réseau. Réessaie dans une heure.', 'Too many reservations from this network. Try again in an hour.') };
  if (db.reservationsDepuis(maintenant - 86_400_000) >= PLAFOND_JOUR) return { ok: false, message: d('Beaucoup de monde aujourd’hui. Réessaie demain, ton nom t’attendra peut-être.', 'Lots of people today. Try again tomorrow, your name may still be waiting.') };
  if (destinataireSature(adresse, maintenant)) return tropDeCourriels(saisie.langue);
  const note = { ok: true as const, message: d(`C’est noté. Ton invitation arrivera à ${adresse}.`, `Got it. Your invite will arrive at ${adresse}.`) };
  const deja = db.dejaInscrit(adresse);
  if (deja) { await rappeler(origines, env, adresse, deja, fetchImpl, saisie.langue); return note; }
  if (!db.reserver(adresse, nom, maintenant)) return { ok: false, message: d(`${NOM_PUBLIC}/${nom} vient d’être pris. Essaie une variante.`, `${NOM_PUBLIC}/${nom} was just taken. Try a variation.`) };
  await confirmerReservation(env, adresse, nom, fetchImpl, saisie.langue);
  return note;
}

async function confirmerReservation(env: Env, adresse: string, nom: string, fetchImpl: typeof fetch, langue?: Langue) {
  if (langue === 'en') {
    const text = `${NOM_PUBLIC}/${nom} is yours. We’re opening pages little by little: your invite will arrive at this address, with a link to create your page in four questions.`;
    const sent = await envoyer(env, fetchImpl, {
      to: adresse, subject: 'Your Hopla name is reserved', replyTo: CONTACT_LEGAL,
      html: enveloppe(`<p>${text}</p>
<p style="color:#666;font-size:14px">Didn’t ask for this? Reply to this email and we’ll erase your address. Without an invite, the reservation erases itself after a year.</p>`),
      text: `${text}\n\nDidn’t ask for this? Reply to this email and we’ll erase your address.`,
    });
    if (!sent) console.error('[liens] confirmation de réservation non envoyée');
    return;
  }
  const texte = `${NOM_PUBLIC}/${nom} est à toi. On ouvre les pages petit à petit : ton invitation arrivera à cette adresse, avec un lien pour créer ta page en quatre questions.`;
  const parti = await envoyer(env, fetchImpl, {
    to: adresse, subject: 'Ton nom Hopla est réservé', replyTo: CONTACT_LEGAL,
    html: enveloppe(`<p>${texte}</p>
<p style="color:#666;font-size:14px">Tu n’as rien demandé ? Réponds à ce message et on efface ton adresse. Sans invitation, la réservation s’efface d’elle-même au bout d’un an.</p>`),
    text: `${texte}\n\nTu n’as rien demandé ? Réponds à ce message et on efface ton adresse.`,
  });
  // La réservation tient même si l'e-mail tarde : l'invitation repartira de la liste.
  if (!parti) console.error('[liens] confirmation de réservation non envoyée');
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
export async function creerHopla(origines: Origines, env: Env, saisie: { nom: string; email: string; langue?: Langue }, fetchImpl: typeof fetch = fetch, maintenant = Date.now(), ip = ''): Promise<Reponse> {
  const d = dire(saisie.langue);
  const nom = validerPseudo(saisie.nom);
  const adresse = validerEmail(saisie.email);
  if (!nom) return { ok: false, message: d('Ce nom ne peut pas servir d’adresse. Choisis-en un autre.', 'This name can’t be used as an address. Pick another one.') };
  if (!adresse) return { ok: false, message: d('Cette adresse e-mail ne semble pas valide.', 'This email address doesn’t look valid.') };
  if (tropInsistante(ip, maintenant)) return { ok: false, message: d('Trop de pages créées depuis ce réseau. Réessaie dans une heure.', 'Too many pages created from this network. Try again in an hour.') };
  if (db.comptesDepuis(maintenant - 86_400_000) >= PLAFOND_JOUR) return { ok: false, message: d('Beaucoup de monde aujourd’hui. Réessaie demain, ton nom t’attendra peut-être.', 'Lots of people today. Try again tomorrow, your name may still be waiting.') };
  // Avant de savoir quel e-mail partira : la réponse reste la même, que l'adresse ait une page ou non.
  if (destinataireSature(adresse, maintenant)) return tropDeCourriels(saisie.langue);
  const note = { ok: true as const, message: d(`Va dans tes e-mails : ton lien est parti à ${adresse}.`, `Check your inbox: your link was sent to ${adresse}.`) };
  const reservation = db.reservationParEmail(adresse);
  if (reservation) return (await inviterReservation(origines, env, reservation.id, fetchImpl)).ok ? note : { ok: false, message: d('L’e-mail n’est pas parti. Réessaie dans un instant.', 'The email didn’t go out. Try again in a moment.') };
  const deja = db.dejaInscrit(adresse);
  if (deja) { await rappeler(origines, env, adresse, deja, fetchImpl, saisie.langue); return note; }
  if (db.nomPris(nom)) return { ok: false, message: d(`${NOM_PUBLIC}/${nom} vient d’être pris. Essaie une variante.`, `${NOM_PUBLIC}/${nom} was just taken. Try a variation.`) };
  let compte: db.Compte;
  try { compte = db.creerCompte(adresse, nom, maintenant, saisie.langue); } catch { return { ok: false, message: d(`${NOM_PUBLIC}/${nom} vient d’être pris. Essaie une variante.`, `${NOM_PUBLIC}/${nom} was just taken. Try a variation.`) }; }
  const envoi = await inviter(origines, env, compte, fetchImpl, 'inscription');
  // Sans e-mail, personne ne peut entrer dans la page : elle s'efface, le nom redevient libre.
  if (!envoi.ok) { db.supprimerCompte(compte.id); return { ok: false, message: d('L’e-mail n’est pas parti. Réessaie dans un instant.', 'The email didn’t go out. Try again in a moment.') }; }
  return note;
}

/**
 * « Renvoie-le », sur la carte d'envoi de l'accueil. Une page que personne n'a
 * encore ouverte reçoit de nouveau son e-mail de bienvenue, valable une semaine
 * comme le premier, qui marche toujours. Sinon (page déjà ouverte, nom ou
 * adresse qui ne vont pas ensemble), c'est la demande de connexion habituelle.
 * Pour un même compte, un envoi par minute et dix par jour ; au-delà on se tait.
 */
export async function renvoyerInscription(origines: Origines, env: Env, saisie: { nom: string; email: string; langue?: Langue }, fetchImpl: typeof fetch = fetch, maintenant = Date.now(), ip = ''): Promise<Reponse> {
  const d = dire(saisie.langue);
  const nom = validerPseudo(saisie.nom);
  const adresse = validerEmail(saisie.email);
  const compte = nom ? db.compteParPseudo(nom) : null;
  if (!adresse || !compte || compte.email !== adresse || compte.connexion) {
    const r = await demanderConnexion(origines, env, saisie.email, fetchImpl, maintenant, ip);
    return r.ok ? { ...r, message: d('C’est renvoyé. Ce lien marche 15 minutes : ouvre-le dès qu’il arrive.', 'Sent again. This link works for 15 minutes: open it as soon as it arrives.') } : r;
  }
  const note = { ok: true as const, message: d('C’est renvoyé, avec un nouveau lien de 7 jours. Le premier marche toujours.', 'Sent again, with a new 7-day link. The first one still works.') };
  const recents = db.jetonsRecents(maintenant - 86_400_000, compte.id);
  if (maintenant - recents.dernier < 60_000 || recents.n >= 10 || destinataireSature(adresse, maintenant)) return note;
  const r = await inviter(origines, env, compte, fetchImpl, 'inscription');
  return r.ok ? { ...note, lienDev: r.lienDev } : { ok: false, message: d('L’e-mail n’est pas parti. Réessaie dans un instant.', 'The email didn’t go out. Try again in a moment.') };
}

/** Le temps de voir qu'on s'est trompé d'adresse, juste après l'envoi. */
export const DELAI_CORRECTION = 30 * 60_000;

/**
 * Une faute dans l'adresse, vue juste après l'envoi. Tant que personne n'est
 * entré dans la page (ou que la réservation est toute neuve), l'adresse se
 * corrige et le lien repart à la bonne ; celui parti à l'ancienne ne sert plus.
 * Il faut redonner le nom et l'ancienne adresse exacte : personne d'autre ne
 * détourne une page qui vient de naître. Comme à l'inscription, la réponse ne
 * dit pas si la nouvelle adresse a déjà une page.
 */
export async function corrigerAdresse(origines: Origines, env: Env, saisie: { nom: string; ancienne: string; nouvelle: string; langue?: Langue }, fetchImpl: typeof fetch = fetch, maintenant = Date.now(), ip = ''): Promise<Reponse> {
  const d = dire(saisie.langue);
  const nom = validerPseudo(saisie.nom);
  const ancienne = validerEmail(saisie.ancienne);
  const nouvelle = validerEmail(saisie.nouvelle);
  if (!nouvelle) return { ok: false, message: d('Cette adresse e-mail ne semble pas valide.', 'This email address doesn’t look valid.') };
  const refus = { ok: false as const, message: d(`Cette adresse ne se corrige plus d’ici. Écris-nous à ${CONTACT_LEGAL}.`, `This address can no longer be changed from here. Write to us at ${CONTACT_LEGAL}.`) };
  if (!nom || !ancienne) return refus;
  if (tropInsistante(ip, maintenant)) return { ok: false, message: d('Trop d’essais depuis ce réseau. Réessaie dans une heure.', 'Too many attempts from this network. Try again in an hour.') };
  const panne = { ok: false as const, message: d('L’e-mail n’est pas parti. Réessaie dans un instant.', 'The email didn’t go out. Try again in a moment.') };

  if (!inscriptionLibre(env)) {
    const r = db.reservationParEmail(ancienne);
    if (!r || r.pseudo !== nom || maintenant - r.ts > DELAI_CORRECTION) return refus;
    if (destinataireSature(nouvelle, maintenant)) return tropDeCourriels(saisie.langue);
    const note = { ok: true as const, message: d(`C’est corrigé. Ton invitation arrivera à ${nouvelle}.`, `Fixed. Your invite will arrive at ${nouvelle}.`) };
    const deja = nouvelle === ancienne ? null : db.dejaInscrit(nouvelle);
    if (deja) { await rappeler(origines, env, nouvelle, deja, fetchImpl, saisie.langue); return note; }
    db.changerEmailReservation(r.id, nouvelle);
    await confirmerReservation(env, nouvelle, nom, fetchImpl, saisie.langue);
    return note;
  }

  const compte = db.compteParPseudo(nom);
  if (!compte || compte.email !== ancienne || compte.connexion || maintenant - compte.cree > DELAI_CORRECTION) return refus;
  if (destinataireSature(nouvelle, maintenant)) return tropDeCourriels(saisie.langue);
  const note = { ok: true as const, message: d(`C’est corrigé. Va dans tes e-mails : ton lien est parti à ${nouvelle}.`, `Fixed. Check your inbox: your link was sent to ${nouvelle}.`) };
  const deja = nouvelle === ancienne ? null : db.dejaInscrit(nouvelle);
  if (deja) { await rappeler(origines, env, nouvelle, deja, fetchImpl, saisie.langue); return note; }
  db.changerEmail(compte.id, nouvelle);
  const envoi = await inviter(origines, env, { ...compte, email: nouvelle }, fetchImpl, 'inscription');
  // L'e-mail n'est pas parti : l'adresse d'avant revient, et l'on peut réessayer.
  if (!envoi.ok) { db.changerEmail(compte.id, ancienne); return panne; }
  return note;
}

/**
 * Une faute dans le nom, vue juste après l'envoi. Mêmes garde-fous que pour
 * l'adresse : l'ancien nom et l'adresse exacte, une page que personne n'a
 * ouverte, dans la demi-heure. La page prend le nouveau nom et le lien repart,
 * avec la bonne adresse dans l'e-mail ; celui parti sous l'ancien nom ne sert plus.
 */
export async function renommerPage(origines: Origines, env: Env, saisie: { ancien: string; nouveau: string; email: string; langue?: Langue }, fetchImpl: typeof fetch = fetch, maintenant = Date.now(), ip = ''): Promise<Reponse & { nom?: string }> {
  const d = dire(saisie.langue);
  const ancien = validerPseudo(saisie.ancien);
  const adresse = validerEmail(saisie.email);
  const nouveau = verifierNom(saisie.nouveau);
  const refus = { ok: false as const, message: d(`Ce nom ne se change plus d’ici. Écris-nous à ${CONTACT_LEGAL}.`, `This name can no longer be changed from here. Write to us at ${CONTACT_LEGAL}.`) };
  if (!ancien || !adresse) return refus;
  if (nouveau.etat === 'invalide') return { ok: false, message: d('Ce nom ne peut pas servir d’adresse : 3 à 30 caractères, lettres, chiffres et tirets.', 'This name can’t be used as an address: 3 to 30 characters, letters, numbers and hyphens.') };
  if (nouveau.nom === ancien) return { ok: true, message: d(`${NOM_PUBLIC}/${ancien} reste ton adresse.`, `${NOM_PUBLIC}/${ancien} stays your address.`), nom: ancien };
  if (nouveau.etat === 'pris') return { ok: false, message: d(`${NOM_PUBLIC}/${nouveau.nom} est déjà pris. Essaie une variante.`, `${NOM_PUBLIC}/${nouveau.nom} is already taken. Try a variation.`) };
  if (tropInsistante(ip, maintenant)) return { ok: false, message: d('Trop d’essais depuis ce réseau. Réessaie dans une heure.', 'Too many attempts from this network. Try again in an hour.') };
  const nom = nouveau.nom;

  if (!inscriptionLibre(env)) {
    const r = db.reservationParEmail(adresse);
    if (!r || r.pseudo !== ancien || maintenant - r.ts > DELAI_CORRECTION) return refus;
    if (destinataireSature(adresse, maintenant)) return tropDeCourriels(saisie.langue);
    try { db.changerPseudoReservation(r.id, nom); } catch { return { ok: false, message: d(`${NOM_PUBLIC}/${nom} vient d’être pris. Essaie une variante.`, `${NOM_PUBLIC}/${nom} was just taken. Try a variation.`) }; }
    await confirmerReservation(env, adresse, nom, fetchImpl, saisie.langue);
    return { ok: true, message: d(`C’est changé. Ton invitation arrivera à ${adresse}.`, `Changed. Your invite will arrive at ${adresse}.`), nom };
  }

  const compte = db.compteParPseudo(ancien);
  if (!compte || compte.email !== adresse || compte.connexion || maintenant - compte.cree > DELAI_CORRECTION) return refus;
  if (destinataireSature(adresse, maintenant)) return tropDeCourriels(saisie.langue);
  try { db.changerPseudo(compte.id, nom); } catch { return { ok: false, message: d(`${NOM_PUBLIC}/${nom} vient d’être pris. Essaie une variante.`, `${NOM_PUBLIC}/${nom} was just taken. Try a variation.`) }; }
  const envoi = await inviter(origines, env, { ...compte, pseudo: nom }, fetchImpl, 'inscription');
  // L'e-mail n'est pas parti : l'ancien nom revient, et l'on peut réessayer.
  if (!envoi.ok) { db.changerPseudo(compte.id, ancien); return { ok: false, message: d('L’e-mail n’est pas parti. Réessaie dans un instant.', 'The email didn’t go out. Try again in a moment.') }; }
  return { ok: true, message: d(`C’est changé. Va dans tes e-mails : un nouveau lien est parti à ${adresse}.`, `Changed. Check your inbox: a new link was sent to ${adresse}.`), nom };
}
