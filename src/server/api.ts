import { randomBytes } from 'node:crypto';
import type { Bloc, Reglages, Stats } from '../lib/types.ts';
import { PRINCIPAL, TYPES_BLOC, TYPES_PRINCIPAL, adressePartage } from '../lib/types.ts';
import { THEMES } from '../lib/themes.ts';
import { lirePeriode } from '../lib/periode.ts';
import { validerBloc, validerReglages } from '../lib/valider.ts';
import { VERSION_CGU } from '../lib/legal.ts';
import { DOC_API } from '../lib/docApi.ts';
import * as db from './db.ts';
import { empreinte } from './auth.ts';
import { droits, joursLisibles, periodeLisible, verifierDates } from './droits.ts';
import { JOUR, MINUTE, cleIp, limiteur } from './limites.ts';

/*
 * L'API publique de Hopla (28 octobre 2026, demandée par Lilian) : chacun, ou son agent IA, lit et modifie sa
 * page avec une clé créée dans Réglages. Une seule couche pour l'API REST (`/api/v1/…`) et le serveur MCP
 * (`/mcp`, voir `mcp.ts`) : l'authentification, les limites, et les gestes sur la page, qui passent par les
 * mêmes validations que le back office (`validerBloc`, `validerReglages`, `verifierDates`).
 *
 * Une clé appartient à un compte et ne touche qu'à lui. On n'en garde que l'empreinte (SHA-256 : la clé est
 * tirée au hasard sur 192 bits, rien à deviner). Elle sert tant que le compte a l'offre Pro (`FONCTIONS.api`),
 * est actif et a accepté les CGU en vigueur ; une clé « lecture seule » ne modifie rien. Pas de cookie : une
 * requête d'un autre site n'emporte aucun droit, d'où l'en-tête CORS ouvert.
 */

export const PREFIXE_CLE = 'hopla_';
const FORME_CLE = /^hopla_[\w-]{32}$/;

/** Une clé neuve : la clé elle-même (montrée une fois), son empreinte et le début qu'on garde pour la reconnaître. */
export function nouvelleCle() {
  const cle = `${PREFIXE_CLE}${randomBytes(24).toString('base64url')}`;
  return { cle, hash: empreinte(cle), debut: cle.slice(0, PREFIXE_CLE.length + 4) };
}

export class ErreurApi extends Error {
  readonly statut: number;
  readonly code: string;
  constructor(statut: number, code: string, message: string) { super(message); this.statut = statut; this.code = code; }
}

export interface Appelant { compte: string; cle: string; ecriture: boolean }

/** 120 appels par minute et 5 000 par jour pour une clé : de quoi tout faire d'une page, pas de quoi la marteler. */
const appelsParCle = limiteur([120, MINUTE], [5000, JOUR]);
/** Une adresse IP qui essaie des clés fausses s'arrête vite. */
const clesFaussesParIp = limiteur([20, MINUTE]);

/** Le compte d'une clé passée en `Authorization: Bearer hopla_…`, ou l'erreur à rendre. */
export function authentifier(entete: string | null, ip: string, env: Record<string, string | undefined> = process.env, maintenant = Date.now()): Appelant {
  const cle = /^Bearer\s+(\S+)$/i.exec(entete?.trim() ?? '')?.[1] ?? '';
  if (!cle) throw new ErreurApi(401, 'cle_absente', 'Ajoute ta clé d’API dans l’en-tête Authorization: Bearer hopla_… Elle se crée dans Réglages, sur app.hopla.page.');
  const trouvee = FORME_CLE.test(cle) ? db.cleApiParEmpreinte(empreinte(cle)) : undefined;
  if (!trouvee) {
    if (clesFaussesParIp(cleIp(ip || 'inconnue'), maintenant)) throw new ErreurApi(429, 'trop_d_essais', 'Trop de clés refusées. Réessaie dans une minute.');
    throw new ErreurApi(401, 'cle_invalide', 'Cette clé n’existe pas ou a été révoquée.');
  }
  const compte = db.compteParId(trouvee.compte);
  if (!compte || compte.statut !== 'actif') throw new ErreurApi(403, 'compte_suspendu', 'Ce compte est suspendu.');
  if (compte.id !== PRINCIPAL && compte.cgu !== VERSION_CGU) throw new ErreurApi(403, 'conditions', 'Accepte les nouvelles conditions d’utilisation sur app.hopla.page, puis réessaie.');
  if (!droits(compte, env, maintenant).api) throw new ErreurApi(403, 'offre', 'L’API et le serveur MCP demandent Hopla Pro. Ta clé reprendra du service dès que ta page y repasse.');
  if (appelsParCle(trouvee.id, maintenant)) throw new ErreurApi(429, 'trop_d_appels', 'Trop d’appels avec cette clé. Réessaie dans une minute.');
  db.noterUsageCleApi(trouvee.id, maintenant);
  return { compte: compte.id, cle: trouvee.id, ecriture: trouvee.ecriture === 1 };
}

const ecrire = (a: Appelant) => {
  if (!a.ecriture) throw new ErreurApi(403, 'lecture_seule', 'Cette clé est en lecture seule : crée une clé qui peut modifier ta page.');
};

const objet = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});

/* ---- Les gestes, communs à l'API REST et au serveur MCP ---- */

/** Ce qu'un compte invité ne pose pas sur sa page : les blocs branchés sur les outils de Lilian, le badge vérifié. */
const reglagesPourCompte = (compte: string, r: Reglages): Reglages => (compte === PRINCIPAL ? r : { ...r, profil: { ...r.profil, badge: false } });

export function lirePage(a: Appelant) {
  const c = db.compteParId(a.compte)!;
  const reglages = db.lireReglages(a.compte);
  return {
    page: { pseudo: c.pseudo, adresse: adressePartage({ pseudo: c.pseudo, principal: c.id === PRINCIPAL }, reglages.domaine), offre: db.abonnement(c).plan },
    reglages,
    blocs: db.lireBlocs(a.compte),
  };
}

/** Les réglages dont on change une partie : un objet (profil, bouton, seo, couleurs, redirection) se complète, le reste se remplace. */
const SOUS_OBJETS = ['profil', 'bouton', 'seo', 'couleurs', 'redirection'];

export function modifierReglages(a: Appelant, partiel: unknown): Reglages {
  ecrire(a);
  const changes = objet(partiel);
  if (!Object.keys(changes).length) throw new ErreurApi(400, 'rien_a_changer', 'Envoie au moins un réglage à changer, par exemple {"profil": {"bio": "…"}}.');
  if ('theme' in changes && !THEMES.some(t => t.id === changes.theme)) throw new ErreurApi(400, 'theme_inconnu', `Thème inconnu. Les thèmes : ${THEMES.map(t => t.id).join(', ')}.`);
  const actuel = db.lireReglages(a.compte);
  const fusion: Record<string, unknown> = { ...actuel };
  // Seules les clés connues passent : rien d'autre ne s'écrit sur l'objet.
  for (const cle of Object.keys(actuel)) {
    if (!(cle in changes)) continue;
    fusion[cle] = SOUS_OBJETS.includes(cle) ? { ...objet(actuel[cle as keyof Reglages]), ...objet(changes[cle]) } : changes[cle];
  }
  const reglages = reglagesPourCompte(a.compte, validerReglages(fusion, actuel));
  db.ecrireReglages(a.compte, reglages);
  return reglages;
}

const blocDuCompte = (a: Appelant, id: string): Bloc => {
  const bloc = db.lireBlocs(a.compte).find(b => b.id === id);
  if (!bloc) throw new ErreurApi(404, 'bloc_introuvable', 'Aucun bloc de ta page n’a cet id.');
  return bloc;
};

export const lireBlocs = (a: Appelant) => db.lireBlocs(a.compte);
export const lireBloc = (a: Appelant, id: string) => blocDuCompte(a, id);

function enregistrer(a: Appelant, bloc: Bloc) {
  if (a.compte !== PRINCIPAL && TYPES_PRINCIPAL.includes(bloc.type)) throw new ErreurApi(400, 'type_reserve', 'Ce type de bloc n’est pas disponible.');
  try {
    verifierDates(db.compteParId(a.compte)!, bloc);
    db.enregistrerBloc(a.compte, bloc);
  } catch (error) {
    throw new ErreurApi(400, 'bloc_refuse', (error as Error).message);
  }
}

/** Les types qu'un compte peut poser. */
export const typesPermis = (compte: string) => TYPES_BLOC.filter(t => compte === PRINCIPAL || !TYPES_PRINCIPAL.includes(t));

/** Un bloc neuf, en haut de la page, ou à `position` (0 : en haut) ; le type par défaut est un lien. */
export function ajouterBloc(a: Appelant, donnees: unknown, position?: unknown): Bloc {
  ecrire(a);
  const o = objet(donnees);
  if (o.type !== undefined && !(typesPermis(a.compte) as readonly unknown[]).includes(o.type)) {
    throw new ErreurApi(400, 'type_inconnu', `Type de bloc inconnu. Les types : ${typesPermis(a.compte).join(', ')}.`);
  }
  const bloc = validerBloc(o, db.nouvelId());
  enregistrer(a, bloc);
  if (typeof position === 'number' && Number.isInteger(position) && position > 0) {
    const autres = db.lireBlocs(a.compte).map(b => b.id).filter(id => id !== bloc.id);
    autres.splice(Math.min(position, autres.length), 0, bloc.id);
    db.ordonner(a.compte, autres);
  }
  return bloc;
}

/** Ce qui change dans un bloc : le reste est gardé. Son type et son id ne changent pas. */
export function modifierBloc(a: Appelant, id: string, partiel: unknown): Bloc {
  ecrire(a);
  const avant = blocDuCompte(a, id);
  const bloc = validerBloc({ ...avant, ...objet(partiel), type: avant.type }, avant.id);
  enregistrer(a, bloc);
  return bloc;
}

export function supprimerBloc(a: Appelant, id: string) {
  ecrire(a);
  blocDuCompte(a, id);
  db.supprimerBloc(a.compte, id);
  return { supprime: id };
}

/** Le nouvel ordre de tous les blocs : chaque id une fois, aucun d'oublié. */
export function ordonnerBlocs(a: Appelant, ids: unknown): Bloc[] {
  ecrire(a);
  const actuels = db.lireBlocs(a.compte).map(b => b.id);
  const liste = Array.isArray(ids) ? ids.map(String) : [];
  if (liste.length !== actuels.length || new Set(liste).size !== liste.length || !liste.every(id => actuels.includes(id))) {
    throw new ErreurApi(400, 'ordre_incomplet', 'Donne les id de tous les blocs de ta page, chacun une fois, dans le nouvel ordre.');
  }
  db.ordonner(a.compte, liste);
  return db.lireBlocs(a.compte);
}

/** Les stats d'une période : 7, 14, 30, 90 ou 365 derniers jours, ou des dates `{ du, au }` (AAAA-MM-JJ). */
export function lireStats(a: Appelant, periode: unknown, env: Record<string, string | undefined> = process.env): Stats {
  const lue = lirePeriode(periode ?? 30);
  if (lue === null) throw new ErreurApi(400, 'periode', 'Période refusée : 7, 14, 30, 90 ou 365 jours, ou des dates du et au (AAAA-MM-JJ).');
  const compte = db.compteParId(a.compte)!;
  if (!joursLisibles(compte, env)) throw new ErreurApi(403, 'offre', 'Tes stats demandent Hopla Starter.');
  const bornee = periodeLisible(compte, lue, env);
  if (bornee === null) throw new ErreurApi(400, 'periode', 'Ces dates sont plus anciennes que ton historique.');
  return db.stats(a.compte, bornee);
}

export const listerThemes = () => THEMES.map(t => ({ id: t.id, nom: t.nom, humeur: t.humeur, famille: t.famille }));

/* ---- L'API REST : /api/v1/… ---- */

export const ENTETES_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, Retry-After',
  'Access-Control-Max-Age': '86400',
};

export const json = (statut: number, corps: unknown, entetes: Record<string, string> = {}) => new Response(JSON.stringify(corps), {
  status: statut,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...ENTETES_CORS, ...entetes },
});

export function reponseErreur(error: unknown): Response {
  if (error instanceof ErreurApi) {
    return json(error.statut, { erreur: { code: error.code, message: error.message } }, {
      ...(error.statut === 429 ? { 'Retry-After': '60' } : {}),
      ...(error.statut === 401 ? { 'WWW-Authenticate': 'Bearer realm="hopla"' } : {}),
    });
  }
  console.error('[api]', error);
  return json(500, { erreur: { code: 'serveur', message: 'Le serveur a eu un souci. Réessaie dans un instant.' } });
}

/** Le corps JSON d'une requête, 256 Ko au plus. */
export async function lireCorps(requete: Request): Promise<unknown> {
  const texte = await requete.text();
  if (texte.length > 256_000) throw new ErreurApi(413, 'trop_gros', 'Corps de requête trop gros (256 Ko au plus).');
  if (!texte.trim()) return {};
  try { return JSON.parse(texte); }
  catch { throw new ErreurApi(400, 'json', 'Le corps de la requête n’est pas du JSON valide.'); }
}

/** L'adresse IP du visiteur, que deploy/server.mjs a démêlée. */
export const ipDe = (requete: Request) => requete.headers.get('x-real-ip') ?? '';

export async function repondreApi(requete: Request, env: Record<string, string | undefined> = process.env): Promise<Response> {
  const url = new URL(requete.url);
  const chemin = url.pathname.replace(/^\/api\/v1/, '').replace(/\/+$/, '');
  const methode = requete.method.toUpperCase();
  if (methode === 'OPTIONS') return new Response(null, { status: 204, headers: ENTETES_CORS });
  // La documentation, sans clé : pour les humains comme pour les agents.
  if (chemin === '' && (methode === 'GET' || methode === 'HEAD')) {
    return new Response(DOC_API, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600', ...ENTETES_CORS } });
  }
  try {
    const a = authentifier(requete.headers.get('authorization'), ipDe(requete), env);
    const bloc = /^\/blocs\/([\w-]{1,40})$/.exec(chemin)?.[1];
    const route = bloc ? '/blocs/:id' : chemin;
    switch (`${methode} ${route}`) {
      case 'GET /page': return json(200, lirePage(a));
      case 'PATCH /reglages': return json(200, { reglages: modifierReglages(a, await lireCorps(requete)) });
      case 'GET /blocs': return json(200, { blocs: lireBlocs(a) });
      case 'POST /blocs': {
        const corps = objet(await lireCorps(requete));
        const { position, ...donnees } = corps;
        return json(201, { bloc: ajouterBloc(a, donnees, position) });
      }
      case 'GET /blocs/:id': return json(200, { bloc: lireBloc(a, bloc!) });
      case 'PATCH /blocs/:id': return json(200, { bloc: modifierBloc(a, bloc!, await lireCorps(requete)) });
      case 'DELETE /blocs/:id': return json(200, supprimerBloc(a, bloc!));
      case 'PUT /ordre': return json(200, { blocs: ordonnerBlocs(a, objet(await lireCorps(requete)).ids) });
      case 'GET /stats': {
        const du = url.searchParams.get('du'), au = url.searchParams.get('au');
        return json(200, { stats: lireStats(a, du || au ? { du, au } : url.searchParams.get('periode') ?? undefined, env) });
      }
      case 'GET /themes': return json(200, { themes: listerThemes() });
    }
    const connue = ['/page', '/reglages', '/blocs', '/blocs/:id', '/ordre', '/stats', '/themes'].includes(route);
    throw new ErreurApi(connue ? 405 : 404, connue ? 'methode' : 'introuvable', connue ? 'Méthode non permise sur cette adresse.' : 'Adresse inconnue. La documentation : GET /api/v1');
  } catch (error) {
    return reponseErreur(error);
  }
}
