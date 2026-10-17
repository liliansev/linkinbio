import { createMiddleware, createServerFn } from '@tanstack/react-start';
import { deleteCookie, getCookie, getRequestHeader, getRequestUrl, setCookie } from '@tanstack/react-start/server';
import type { Bloc, CompteResume, EtatAdmin, PagePublique, Reglages, Stats } from '../lib/types.ts';
import { PRINCIPAL, TYPES_PRINCIPAL, estEnLigne } from '../lib/types.ts';
import { adresse, email, pseudo, validerBloc, validerReglages } from '../lib/valider.ts';
import { apercuSite as lireApercu } from './apercu.ts';
import * as db from './db.ts';
import { COOKIE_SESSION, DUREE_SESSION, adresseAdmin, compteDeSession, demanderConnexion, fermerSession, inviter, ouvrirSession } from './auth.ts';

/*
 * Les fonctions serveur : les pages publiques en lecture libre, tout le reste
 * derrière la session. Chaque fonction protégée reçoit le compte de la session
 * (middleware) et ne touche qu'à ce qui lui appartient ; la gestion des comptes
 * est réservée au compte principal.
 */

const enProduction = () => process.env.NODE_ENV === 'production';
const origine = () => (enProduction() ? process.env.LIENS_ORIGINE || 'https://liliansevoumian.fr' : getRequestUrl().origin);

const cookieSession = () => ({ httpOnly: true, secure: enProduction(), sameSite: 'lax' as const, path: '/liens' });

/** Une requête qui écrit doit venir de la page elle-même. */
function memeOrigine() {
  const recue = getRequestHeader('origin');
  if (recue && recue !== origine() && recue !== getRequestUrl().origin) throw new Error('Origine refusée');
}

const session = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const compte = compteDeSession(getCookie(COOKIE_SESSION));
  if (!compte) throw new Error('Session expirée : reconnecte-toi.');
  memeOrigine();
  return next({ context: { compte } });
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
  .validator((data: unknown) => (typeof data === 'string' ? data.toLowerCase().slice(0, 40) : ''))
  .handler(async ({ data }): Promise<PagePublique | null> => {
    const compte = data ? db.compteParPseudo(data) : db.compteParId(PRINCIPAL);
    if (!compte || compte.statut !== 'actif') return null;
    const maintenant = Date.now();
    return {
      reglages: reglagesPourCompte(compte.id, db.lireReglages(compte.id)),
      blocs: pourCompte(compte.id, db.lireBlocs(compte.id)).filter(bloc => estEnLigne(bloc, maintenant)),
      compte: { pseudo: compte.pseudo, principal: compte.id === PRINCIPAL },
    };
  });

function etat(compte: string): EtatAdmin {
  const c = db.compteParId(compte)!;
  return {
    reglages: db.lireReglages(compte), blocs: db.lireBlocs(compte), clics: db.clicsParBloc(compte, 30), stockageEphemere: db.stockageEphemere(),
    compte: { pseudo: c.pseudo, principal: compte === PRINCIPAL, email: c.email },
  };
}

export type AccesAdmin = { connecte: true; etat: EtatAdmin } | { connecte: false };

export const lireAdmin = createServerFn({ method: 'GET' }).handler(async (): Promise<AccesAdmin> => {
  const compte = compteDeSession(getCookie(COOKIE_SESSION));
  return compte ? { connecte: true, etat: etat(compte) } : { connecte: false };
});

export const chargerEtat = createServerFn({ method: 'GET' }).middleware([session]).handler(async ({ context }) => etat(context.compte));

export const demanderLien = createServerFn({ method: 'POST' })
  .validator((data: unknown) => String(data ?? '').slice(0, 200))
  .handler(async ({ data }) => {
    memeOrigine();
    return demanderConnexion(origine(), process.env, data, fetch, Date.now(), getRequestHeader('x-real-ip') ?? '');
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

export const enregistrerBloc = createServerFn({ method: 'POST' })
  .middleware([session])
  .validator((data: unknown) => {
    const id = String((data as { id?: unknown })?.id ?? '');
    return validerBloc(data, /^[\w-]{1,40}$/.test(id) ? id : db.nouvelId());
  })
  .handler(async ({ data, context }): Promise<Bloc> => {
    if (context.compte !== PRINCIPAL && TYPES_PRINCIPAL.includes(data.type)) throw new Error('Ce type de bloc n’est pas encore disponible.');
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
  .handler(async ({ data, context }) => `/liens/media/${db.ajouterMedia(context.compte, new Uint8Array(data.octets), data.extension)}.${data.extension}`);

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
  .handler(async ({ data, context }): Promise<Stats> => db.stats(context.compte, data));

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
    const r = await inviter(origine(), process.env, compte);
    return r.ok ? r : { ok: false, message: `Compte créé, mais l’invitation n’est pas partie : ${r.message} Renvoie-la depuis la liste.` };
  });

export const renvoyerInvitation = createServerFn({ method: 'POST' })
  .middleware([proprietaire])
  .validator((data: unknown) => String(data ?? '').slice(0, 40))
  .handler(async ({ data }) => {
    const compte = db.compteParId(data);
    if (!compte || compte.id === PRINCIPAL) return { ok: false, message: 'Compte introuvable.' };
    if (compte.statut !== 'actif') return { ok: false, message: 'Réactive le compte avant de lui renvoyer un lien.' };
    return inviter(origine(), process.env, compte);
  });

export const changerStatutCompte = createServerFn({ method: 'POST' })
  .middleware([proprietaire])
  .validator((data: unknown) => {
    const o = (data ?? {}) as { id?: unknown; statut?: unknown };
    return { id: String(o.id ?? '').slice(0, 40), statut: o.statut === 'suspendu' ? 'suspendu' as const : 'actif' as const };
  })
  .handler(async ({ data }) => { db.changerStatut(data.id, data.statut); return { ok: true }; });

export const supprimerCompte = createServerFn({ method: 'POST' })
  .middleware([proprietaire])
  .validator((data: unknown) => String(data ?? '').slice(0, 40))
  .handler(async ({ data }) => { db.supprimerCompte(data); return { ok: true }; });
