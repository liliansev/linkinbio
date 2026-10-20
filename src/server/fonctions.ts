import { createMiddleware, createServerFn } from '@tanstack/react-start';
import { deleteCookie, getCookie, getRequestHeader, getRequestUrl, setCookie } from '@tanstack/react-start/server';
import type { Bloc, CompteResume, EtatAdmin, Liste, Origines, PagePublique, Reglages, Reservation, SignalementResume, Stats } from '../lib/types.ts';
import { FOURNISSEURS_LISTE } from '../lib/types.ts';
import * as liste from './liste.ts';
import { planifierResumes } from './resume.ts';
import { VERSION_CGU } from '../lib/legal.ts';
import { ORIGINE_ADMIN, ORIGINE_PUBLIQUE, PRINCIPAL, TYPES_PRINCIPAL } from '../lib/types.ts';
import { masquerAcces } from '../lib/acces.ts';
import { composerMoment } from '../lib/moments.ts';
import { composerAudience, provenance } from '../lib/provenance.ts';
import { adresse, email, pseudo, validerBloc, validerReglages } from '../lib/valider.ts';
import { apercuSite as lireApercu } from './apercu.ts';
import * as db from './db.ts';
import { COOKIE_SESSION, DUREE_SESSION, adresseAdmin, compteDeSession, demanderConnexion, fermerSession, inviter, ouvrirSession } from './auth.ts';
import { changerStatutMotive, signaler, supprimerMotive, traiter } from './moderation.ts';
import { corrigerAdresse as corriger, creerHopla, inscriptionLibre, inviterReservation, renommerPage as renommer, renvoyerInscription, reserverNom as reserver, verifierNom as verifier } from './attente.ts';
import * as creem from './creem.ts';
import { droits, joursLisibles, verifierDates } from './droits.ts';
import { selonDroits } from '../lib/droits.ts';
import { estPlanPayant } from '../lib/abonnement.ts';
import type { Periode, PlanPayant } from '../lib/abonnement.ts';

/*
 * Les fonctions serveur : les pages publiques en lecture libre, tout le reste
 * derrière la session. Chaque fonction protégée reçoit le compte de la session
 * (middleware) et ne touche qu'à ce qui lui appartient ; la gestion des comptes
 * est réservée au compte principal.
 */

// Le résumé de la semaine part le lundi matin (voir resume.ts).
planifierResumes();

const enProduction = () => process.env.NODE_ENV === 'production';
/** Les pages sur hopla.page, le back office sur app.hopla.page ; en dev, tout sur l'adresse de la requête. */
const origines = (): Origines => (enProduction()
  ? { page: process.env.LIENS_ORIGINE || ORIGINE_PUBLIQUE, admin: process.env.LIENS_ORIGINE_ADMIN || ORIGINE_ADMIN }
  : { page: getRequestUrl().origin, admin: getRequestUrl().origin });

/** Sans `domain`, le cookie reste sur le nom qui l'a posé (app.hopla.page) : les pages publiques ne le reçoivent jamais. */
const cookieSession = () => ({ httpOnly: true, secure: enProduction(), sameSite: 'lax' as const, path: '/' });

/** Une requête qui écrit doit venir de Hopla lui-même. */
function memeOrigine() {
  const recue = getRequestHeader('origin');
  const o = origines();
  if (recue && recue !== o.page && recue !== o.admin && recue !== getRequestUrl().origin) throw new Error('Origine refusée');
}

/** Une session ouverte, conditions acceptées ou non : de quoi les accepter, exporter ses données ou partir. */
const sessionBrute = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const compte = compteDeSession(getCookie(COOKIE_SESSION));
  if (!compte) throw new Error('Session expirée : reconnecte-toi.');
  memeOrigine();
  return next({ context: { compte } });
});

const cguAJour = (compte: string) => compte === PRINCIPAL || db.compteParId(compte)?.cgu === VERSION_CGU;

/** Tout le reste demande aussi d'avoir accepté la version en vigueur des CGU. */
const session = createMiddleware({ type: 'function' }).middleware([sessionBrute]).server(async ({ next, context }) => {
  if (!cguAJour(context.compte)) throw new Error('Accepte les conditions d’utilisation pour continuer.');
  return next();
});

const proprietaire = createMiddleware({ type: 'function' }).middleware([session]).server(async ({ next, context }) => {
  if (context.compte !== PRINCIPAL) throw new Error('Réservé au compte principal.');
  return next();
});

/** Ce qu'un compte invité n'a pas le droit d'afficher : les blocs branchés sur les outils de Lilian, et le badge vérifié. */
function pourCompte<T extends Bloc>(compte: string, blocs: T[]): T[] {
  return compte === PRINCIPAL ? blocs : blocs.filter(b => !TYPES_PRINCIPAL.includes(b.type));
}
function reglagesPourCompte(compte: string, r: Reglages): Reglages {
  return compte === PRINCIPAL ? r : { ...r, profil: { ...r.profil, badge: false } };
}

/** La page de Lilian sans pseudo, celle d'un autre compte avec. Null si elle n'existe pas ou est suspendue. */
export const lirePagePublique = createServerFn({ method: 'GET' })
  .validator((data: unknown) => {
    const o = (typeof data === 'string' ? { pseudo: data } : data ?? {}) as { pseudo?: unknown; s?: unknown };
    const court = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : '');
    return { pseudo: court(o.pseudo, 40).toLowerCase(), s: court(o.s, 40) };
  })
  .handler(async ({ data }): Promise<PagePublique | null> => {
    const compte = data.pseudo ? db.compteParPseudo(data.pseudo) : db.compteParId(PRINCIPAL);
    if (!compte || compte.statut !== 'actif') return null;
    const maintenant = Date.now();
    // Ce que l'offre du compte ne comprend pas s'efface avant tout le reste.
    const { reglages, blocs: permis } = selonDroits(reglagesPourCompte(compte.id, db.lireReglages(compte.id)), pourCompte(compte.id, db.lireBlocs(compte.id)), droits(compte, process.env, maintenant));
    // Le référent d'une page qui se recharge elle-même (hopla.page) ne dit rien de la provenance.
    const blocs = composerAudience(composerMoment(permis, maintenant), provenance({ s: data.s, ua: getRequestHeader('user-agent') ?? '', referent: getRequestHeader('referer') ?? '' }));
    const prises = db.placesParBloc(compte.id);
    return {
      reglages,
      blocs: masquerAcces(blocs, id => prises[id] ?? 0),
      compte: { pseudo: compte.pseudo, principal: compte.id === PRINCIPAL, plan: db.abonnement(compte, maintenant).plan },
      maintenant,
    };
  });

function etat(compte: string): EtatAdmin {
  const c = db.compteParId(compte)!;
  const abonnement = db.abonnement(c);
  const d = droits(c);
  return {
    // Les clics de chaque bloc sont des stats : sans elles, l'éditeur n'en montre pas.
    reglages: db.lireReglages(compte), blocs: db.lireBlocs(compte), clics: d.stats ? db.clicsParBloc(compte, 30) : {}, places: db.placesParBloc(compte), stockageEphemere: db.stockageEphemere(),
    compte: { pseudo: c.pseudo, principal: compte === PRINCIPAL, email: c.email, plan: abonnement.plan }, cguAJour: cguAJour(compte),
    abonnement, paiement: compte !== PRINCIPAL && !!creem.config(process.env), enVente: creem.offresEnVente(process.env), droits: d,
  };
}

export type AccesAdmin = { connecte: true; etat: EtatAdmin } | { connecte: false };

export const lireAdmin = createServerFn({ method: 'GET' }).handler(async (): Promise<AccesAdmin> => {
  const compte = compteDeSession(getCookie(COOKIE_SESSION));
  return compte ? { connecte: true, etat: etat(compte) } : { connecte: false };
});

export const chargerEtat = createServerFn({ method: 'GET' }).middleware([sessionBrute]).handler(async ({ context }) => etat(context.compte));

export const demanderLien = createServerFn({ method: 'POST' })
  .validator((data: unknown) => String(data ?? '').slice(0, 200))
  .handler(async ({ data }) => {
    memeOrigine();
    return demanderConnexion(origines(), process.env, data, fetch, Date.now(), getRequestHeader('x-real-ip') ?? '');
  });

export const connecter = createServerFn({ method: 'POST' })
  .validator((data: unknown) => String((data as { jeton?: unknown })?.jeton ?? '').slice(0, 100))
  .handler(async ({ data }) => {
    memeOrigine();
    const jeton = ouvrirSession(data);
    if (!jeton) return { ok: false as const, message: 'Ce lien a déjà servi ou a expiré. Demande-en un nouveau.' };
    setCookie(COOKIE_SESSION, jeton, { ...cookieSession(), maxAge: DUREE_SESSION / 1000 });
    return { ok: true as const };
  });

export const deconnecter = createServerFn({ method: 'POST' }).handler(async () => {
  memeOrigine();
  fermerSession(getCookie(COOKIE_SESSION) ?? null);
  deleteCookie(COOKIE_SESSION, cookieSession());
  return { ok: true };
});

export const accepterCgu = createServerFn({ method: 'POST' }).middleware([sessionBrute]).handler(async ({ context }) => {
  db.accepterCgu(context.compte, VERSION_CGU);
  return { ok: true };
});

/** Le droit à l'effacement, en libre-service : il faut retaper son pseudo. */
export const supprimerMonCompte = createServerFn({ method: 'POST' })
  .middleware([sessionBrute])
  .validator((data: unknown) => String(data ?? '').trim().toLowerCase().slice(0, 40))
  .handler(async ({ data, context }) => {
    if (context.compte === PRINCIPAL) return { ok: false, message: 'Le compte principal ne se supprime pas.' };
    const compte = db.compteParId(context.compte);
    if (!compte || data !== compte.pseudo) return { ok: false, message: 'Retape ton pseudo exactement pour confirmer.' };
    db.supprimerCompte(compte.id);
    deleteCookie(COOKIE_SESSION, cookieSession());
    return { ok: true, message: 'Ton compte est supprimé.' };
  });

export const enregistrerBloc = createServerFn({ method: 'POST' })
  .middleware([session])
  .validator((data: unknown) => {
    const id = String((data as { id?: unknown })?.id ?? '');
    return validerBloc(data, /^[\w-]{1,40}$/.test(id) ? id : db.nouvelId());
  })
  .handler(async ({ data, context }): Promise<Bloc> => {
    if (context.compte !== PRINCIPAL && TYPES_PRINCIPAL.includes(data.type)) throw new Error('Ce type de bloc n’est pas encore disponible.');
    // La page publique tient toujours les dates d'un bloc : sans Starter, on peut les retirer, pas en poser de nouvelles.
    verifierDates(db.compteParId(context.compte)!, data);
    db.enregistrerBloc(context.compte, data);
    return data;
  });

export const supprimerBloc = createServerFn({ method: 'POST' })
  .middleware([session])
  .validator((data: unknown) => String(data ?? '').slice(0, 40))
  .handler(async ({ data, context }) => { db.supprimerBloc(context.compte, data); return { ok: true }; });

export const ordonner = createServerFn({ method: 'POST' })
  .middleware([session])
  .validator((data: unknown) => (Array.isArray(data) ? data.slice(0, 300).map(String).filter(id => /^[\w-]{1,40}$/.test(id)) : []))
  .handler(async ({ data, context }) => { db.ordonner(context.compte, data); return { ok: true }; });

export const enregistrerReglages = createServerFn({ method: 'POST' })
  .middleware([session])
  .validator((data: unknown) => data)
  .handler(async ({ data, context }): Promise<Reglages> => {
    const reglages = reglagesPourCompte(context.compte, validerReglages(data, db.lireReglages(context.compte)));
    db.ecrireReglages(context.compte, reglages);
    return reglages;
  });

/** Une image déjà réduite par le navigateur (WebP, ou JPEG sur Safari), 1,5 Mo au plus. */
export const envoyerImage = createServerFn({ method: 'POST' })
  .middleware([session])
  .validator((data: unknown) => {
    const m = /^data:image\/(webp|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(String(data ?? ''));
    if (!m || m[2].length > 2_000_000) throw new Error('Image refusée.');
    const octets = Buffer.from(m[2], 'base64');
    const webp = octets.subarray(0, 4).toString('latin1') === 'RIFF' && octets.subarray(8, 12).toString('latin1') === 'WEBP';
    const jpeg = octets[0] === 0xff && octets[1] === 0xd8 && octets[2] === 0xff;
    if (m[1] === 'webp' ? !webp : !jpeg) throw new Error('Image refusée.');
    return { octets, extension: m[1] === 'webp' ? 'webp' as const : 'jpg' as const };
  })
  .handler(async ({ data, context }) => `/media/${db.ajouterMedia(context.compte, new Uint8Array(data.octets), data.extension)}.${data.extension}`);

export const apercuSite = createServerFn({ method: 'POST' })
  .middleware([session])
  .validator((data: unknown) => {
    const url = adresse(String(data ?? ''));
    if (!url) throw new Error('Adresse refusée.');
    return url;
  })
  .handler(async ({ data }) => {
    try { return await lireApercu(data); }
    catch { throw new Error('Impossible de lire ce site.'); }
  });

export const lireStats = createServerFn({ method: 'GET' })
  .middleware([session])
  .validator((data: unknown) => ([7, 30, 90, 365].includes(Number(data)) ? Number(data) : 30))
  // L'historique visible suit l'offre (`joursLisibles`) : tout est gardé, changer d'offre le rend visible. Sans historique, rien ne se lit.
  .handler(async ({ data, context }): Promise<Stats> => {
    const plafond = joursLisibles(db.compteParId(context.compte)!);
    if (!plafond) throw new Error('Tes stats demandent Hopla Starter.');
    return db.stats(context.compte, Math.min(data, plafond));
  });

/* ---- « Rejoins ma liste » ---- */

export const lireListe = createServerFn({ method: 'GET' })
  .middleware([session])
  .handler(async ({ context }): Promise<Liste> => ({ ...db.resumeContacts(context.compte), integration: liste.resumeIntegration(process.env, context.compte) }));

export const brancherListe = createServerFn({ method: 'POST' })
  .middleware([session])
  .validator((data: unknown) => {
    if (data === null) return null;
    const o = (data ?? {}) as { fournisseur?: unknown; cle?: unknown; liste?: unknown };
    return {
      fournisseur: FOURNISSEURS_LISTE.includes(o.fournisseur as never) ? o.fournisseur as (typeof FOURNISSEURS_LISTE)[number] : 'brevo',
      cle: String(o.cle ?? '').trim().slice(0, 200), liste: String(o.liste ?? '').trim().slice(0, 40),
    };
  })
  .handler(async ({ data, context }) => {
    if (!data) { db.ecrireIntegration(context.compte, null); return { ok: true, message: 'Ta liste reste chez Hopla seulement.' }; }
    // Une clé laissée vide garde celle déjà enregistrée (le navigateur ne la connaît pas).
    const avant = db.lireIntegration(context.compte);
    const cle = data.cle || (avant && avant.fournisseur === data.fournisseur ? liste.dechiffrer(process.env, avant.cle) : '');
    if (!cle) return { ok: false, message: 'Colle ta clé d’API.' };
    const v = await liste.verifier(data.fournisseur, cle, data.liste, fetch);
    if (!v.ok) return v;
    db.ecrireIntegration(context.compte, { fournisseur: data.fournisseur, cle: liste.chiffrer(process.env, cle), liste: data.liste, nom: v.nom ?? '' });
    return { ok: true, message: v.message };
  });

export const supprimerContact = createServerFn({ method: 'POST' })
  .middleware([session])
  .validator((data: unknown) => String(data ?? '').slice(0, 40))
  .handler(async ({ data, context }) => { db.supprimerContact(context.compte, data); return { ok: true }; });

export const resynchroniser = createServerFn({ method: 'POST' })
  .middleware([session])
  .handler(async ({ context }) => {
    let envoyes = 0, erreurs = 0;
    for (const c of db.contactsAEnvoyer(context.compte)) (await liste.pousser(process.env, context.compte, c, fetch)) ? envoyes++ : erreurs++;
    return { envoyes, erreurs };
  });

/* ---- Abonnement Pro (Creem) ---- */

export const ouvrirPaiement = createServerFn({ method: 'POST' })
  .middleware([session])
  .validator((data: unknown): { plan: PlanPayant; periode: Periode } => {
    const o = (data ?? {}) as { plan?: unknown; periode?: unknown };
    return { plan: estPlanPayant(o.plan) ? o.plan : 'pro', periode: o.periode === 'an' ? 'an' : 'mois' };
  })
  .handler(async ({ data, context }) => creem.ouvrirPaiement(process.env, fetch, db.compteParId(context.compte)!, data.plan, data.periode, origines().admin));

export const ouvrirPortail = createServerFn({ method: 'POST' })
  .middleware([session])
  .handler(async ({ context }) => creem.ouvrirPortail(process.env, fetch, db.compteParId(context.compte)!));

/** Les offres dans Creem, pour le compte principal : l'état, et la création des produits qui manquent. */
export const lireOffresCreem = createServerFn({ method: 'GET' })
  .middleware([proprietaire])
  .handler(async () => creem.etatOffres(process.env));

export const creerOffresCreem = createServerFn({ method: 'POST' })
  .middleware([proprietaire])
  .handler(async () => creem.creerOffres(process.env, fetch));

/* ---- Prendre son nom depuis l'accueil : créer sa page, ou la liste d'attente ---- */

export const modeInscription = createServerFn({ method: 'GET' })
  .handler(async (): Promise<'libre' | 'attente'> => (inscriptionLibre(process.env) ? 'libre' : 'attente'));

export const verifierNom = createServerFn({ method: 'GET' })
  .validator((data: unknown) => String(data ?? '').slice(0, 60))
  .handler(async ({ data }) => verifier(data));

export const reserverNom = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const o = (data ?? {}) as { nom?: unknown; email?: unknown };
    return { nom: String(o.nom ?? '').slice(0, 40), email: String(o.email ?? '').slice(0, 200) };
  })
  .handler(async ({ data }) => {
    memeOrigine();
    const prendre = inscriptionLibre(process.env) ? creerHopla : reserver;
    return prendre(origines(), process.env, data, fetch, Date.now(), getRequestHeader('x-real-ip') ?? '');
  });

/** « Renvoie-le » sur l'accueil : l'e-mail de bienvenue d'une page pas encore ouverte, sinon un lien de connexion. */
export const renvoyerLien = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const o = (data ?? {}) as { nom?: unknown; email?: unknown };
    return { nom: String(o.nom ?? '').slice(0, 40), email: String(o.email ?? '').slice(0, 200) };
  })
  .handler(async ({ data }) => {
    memeOrigine();
    return renvoyerInscription(origines(), process.env, data, fetch, Date.now(), getRequestHeader('x-real-ip') ?? '');
  });

/** Juste après l'envoi, une adresse mal tapée se corrige tant que la page n'a pas été ouverte. */
export const corrigerAdresse = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const o = (data ?? {}) as { nom?: unknown; ancienne?: unknown; nouvelle?: unknown };
    return { nom: String(o.nom ?? '').slice(0, 40), ancienne: String(o.ancienne ?? '').slice(0, 200), nouvelle: String(o.nouvelle ?? '').slice(0, 200) };
  })
  .handler(async ({ data }) => {
    memeOrigine();
    return corriger(origines(), process.env, data, fetch, Date.now(), getRequestHeader('x-real-ip') ?? '');
  });

/** Juste après l'envoi, un nom mal tapé se change tant que la page n'a pas été ouverte. */
export const renommerPage = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const o = (data ?? {}) as { ancien?: unknown; nouveau?: unknown; email?: unknown };
    return { ancien: String(o.ancien ?? '').slice(0, 40), nouveau: String(o.nouveau ?? '').slice(0, 40), email: String(o.email ?? '').slice(0, 200) };
  })
  .handler(async ({ data }) => {
    memeOrigine();
    return renommer(origines(), process.env, data, fetch, Date.now(), getRequestHeader('x-real-ip') ?? '');
  });

export const listerAttente = createServerFn({ method: 'GET' })
  .middleware([proprietaire])
  .handler(async (): Promise<Reservation[]> => db.listerAttente());

export const inviterAttente = createServerFn({ method: 'POST' })
  .middleware([proprietaire])
  .validator((data: unknown) => String(data ?? '').slice(0, 40))
  .handler(async ({ data }) => inviterReservation(origines(), process.env, data));

export const retirerAttente = createServerFn({ method: 'POST' })
  .middleware([proprietaire])
  .validator((data: unknown) => String(data ?? '').slice(0, 40))
  .handler(async ({ data }) => { db.retirerReservation(data); return { ok: true }; });

/* ---- Les comptes, depuis le back office de Lilian ---- */

export const listerComptes = createServerFn({ method: 'GET' })
  .middleware([proprietaire])
  .handler(async (): Promise<CompteResume[]> => db.listerComptes());

export const inviterCompte = createServerFn({ method: 'POST' })
  .middleware([proprietaire])
  .validator((data: unknown) => {
    const o = (data ?? {}) as { email?: unknown; pseudo?: unknown };
    return { email: email(o.email), pseudo: pseudo(o.pseudo) };
  })
  .handler(async ({ data }) => {
    if (!data.email) return { ok: false, message: 'Cette adresse e-mail ne semble pas valide.' };
    if (!data.pseudo) return { ok: false, message: 'Le pseudo fait 3 à 30 caractères : minuscules, chiffres et tirets (et quelques mots sont réservés).' };
    if (data.email === adresseAdmin(process.env).toLowerCase()) return { ok: false, message: 'C’est l’adresse de ton propre compte.' };
    let compte: db.Compte;
    try { compte = db.creerCompte(data.email, data.pseudo); } catch (error) { return { ok: false, message: (error as Error).message }; }
    const r = await inviter(origines(), process.env, compte);
    return r.ok ? r : { ok: false, message: `Compte créé, mais l’invitation n’est pas partie : ${r.message} Renvoie-la depuis la liste.` };
  });

export const renvoyerInvitation = createServerFn({ method: 'POST' })
  .middleware([proprietaire])
  .validator((data: unknown) => String(data ?? '').slice(0, 40))
  .handler(async ({ data }) => {
    const compte = db.compteParId(data);
    if (!compte || compte.id === PRINCIPAL) return { ok: false, message: 'Compte introuvable.' };
    if (compte.statut !== 'actif') return { ok: false, message: 'Réactive le compte avant de lui renvoyer un lien.' };
    return inviter(origines(), process.env, compte);
  });

const motif = (v: unknown) => String(v ?? '').slice(0, 2000);

export const changerStatutCompte = createServerFn({ method: 'POST' })
  .middleware([proprietaire])
  .validator((data: unknown) => {
    const o = (data ?? {}) as { id?: unknown; statut?: unknown; motif?: unknown };
    return { id: String(o.id ?? '').slice(0, 40), statut: o.statut === 'suspendu' ? 'suspendu' as const : 'actif' as const, motif: motif(o.motif) };
  })
  .handler(async ({ data }) => { await changerStatutMotive(process.env, fetch, data.id, data.statut, data.motif); return { ok: true }; });

export const supprimerCompte = createServerFn({ method: 'POST' })
  .middleware([proprietaire])
  .validator((data: unknown) => {
    const o = (data ?? {}) as { id?: unknown; motif?: unknown };
    return { id: String(o.id ?? '').slice(0, 40), motif: motif(o.motif) };
  })
  .handler(async ({ data }) => { await supprimerMotive(process.env, fetch, data.id, data.motif); return { ok: true }; });

/* ---- Signalements ---- */

/** Le formulaire « Signaler cette page », ouvert à tous. */
export const envoyerSignalement = createServerFn({ method: 'POST' })
  .validator((data: unknown) => (data ?? {}) as Record<string, unknown>)
  .handler(async ({ data }) => {
    memeOrigine();
    return signaler(process.env, fetch, { page: data.page, motif: data.motif, details: data.details, email: data.email, bonneFoi: data.bonneFoi }, getRequestHeader('x-real-ip') ?? '', origines());
  });

export const listerSignalements = createServerFn({ method: 'GET' })
  .middleware([proprietaire])
  .handler(async (): Promise<SignalementResume[]> => db.listerSignalements().map(({ email: e, traite: _, ...s }) => ({ ...s, contact: !!e })));

export const traiterSignalement = createServerFn({ method: 'POST' })
  .middleware([proprietaire])
  .validator((data: unknown) => {
    const o = (data ?? {}) as { id?: unknown; statut?: unknown; decision?: unknown };
    return { id: String(o.id ?? '').slice(0, 40), statut: o.statut === 'suspendu' ? 'suspendu' as const : 'sans-suite' as const, decision: motif(o.decision) };
  })
  .handler(async ({ data }) => { await traiter(process.env, fetch, data.id, data.statut, data.decision, origines().page); return { ok: true }; });
