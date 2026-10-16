import { createMiddleware, createServerFn } from '@tanstack/react-start';
import { deleteCookie, getCookie, getRequestHeader, getRequestUrl, setCookie } from '@tanstack/react-start/server';
import type { Bloc, EtatAdmin, PagePublique, Reglages, Stats } from '../lib/types.ts';
import { estEnLigne } from '../lib/types.ts';
import { adresse, validerBloc, validerReglages } from '../lib/valider.ts';
import { apercuSite as lireApercu } from './apercu.ts';
import * as db from './db.ts';
import { COOKIE_SESSION, DUREE_SESSION, adresseAdmin, demanderConnexion, fermerSession, masquer, ouvrirSession, sessionValide } from './auth.ts';

/*
 * Les fonctions serveur : la page publique en lecture libre, tout le reste
 * derrière la session. Chaque fonction protégée vérifie elle-même la session
 * (middleware), qu'on l'appelle depuis le back office ou directement.
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
  if (!sessionValide(getCookie(COOKIE_SESSION))) throw new Error('Session expirée : reconnecte-toi.');
  memeOrigine();
  return next();
});

export const lirePagePublique = createServerFn({ method: 'GET' }).handler(async (): Promise<PagePublique> => {
  const maintenant = Date.now();
  return { reglages: db.lireReglages(), blocs: db.lireBlocs().filter(bloc => estEnLigne(bloc, maintenant)) };
});

function etat(): EtatAdmin {
  return { reglages: db.lireReglages(), blocs: db.lireBlocs(), clics: db.clicsParBloc(30), stockageEphemere: db.stockageEphemere() };
}

export type AccesAdmin = { connecte: true; etat: EtatAdmin } | { connecte: false; adresse: string };

export const lireAdmin = createServerFn({ method: 'GET' }).handler(async (): Promise<AccesAdmin> => {
  if (!sessionValide(getCookie(COOKIE_SESSION))) return { connecte: false, adresse: masquer(adresseAdmin(process.env)) };
  return { connecte: true, etat: etat() };
});

export const chargerEtat = createServerFn({ method: 'GET' }).middleware([session]).handler(async () => etat());

export const demanderLien = createServerFn({ method: 'POST' }).handler(async () => {
  memeOrigine();
  return demanderConnexion(origine(), process.env);
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
  .handler(async ({ data }): Promise<Bloc> => { db.enregistrerBloc(data); return data; });

export const supprimerBloc = createServerFn({ method: 'POST' })
  .middleware([session])
  .validator((data: unknown) => String(data ?? '').slice(0, 40))
  .handler(async ({ data }) => { db.supprimerBloc(data); return { ok: true }; });

export const ordonner = createServerFn({ method: 'POST' })
  .middleware([session])
  .validator((data: unknown) => (Array.isArray(data) ? data.slice(0, 300).map(String).filter(id => /^[\w-]{1,40}$/.test(id)) : []))
  .handler(async ({ data }) => { db.ordonner(data); return { ok: true }; });

export const enregistrerReglages = createServerFn({ method: 'POST' })
  .middleware([session])
  .validator((data: unknown) => validerReglages(data, db.lireReglages()))
  .handler(async ({ data }): Promise<Reglages> => { db.ecrireReglages(data); return data; });

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
  .handler(async ({ data }) => `/liens/media/${db.ajouterMedia(new Uint8Array(data.octets), data.extension)}.${data.extension}`);

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
  .handler(async ({ data }): Promise<Stats> => db.stats(data));
