import { randomBytes } from 'node:crypto';
import QRCode from 'qrcode';
import type { Bloc, ImageApercu, Reglages, Stats } from '../lib/types.ts';
import { ARTICLES_FLUX, NOM_ADMIN, ORIGINE_PUBLIQUE, PRINCIPAL, RESEAUX, TYPES_BLOC, TYPES_PRINCIPAL, adressePartage } from '../lib/types.ts';
import { THEMES } from '../lib/themes.ts';
import { NOMS_RESEAUX, PICTOS } from '../lib/pictos.ts';
import { lirePeriode } from '../lib/periode.ts';
import { resumer, enUnePhrase } from '../lib/resume.ts';
import { FONCTIONS } from '../lib/abonnement.ts';
import { adresse, validerBloc, validerReglages } from '../lib/valider.ts';
import { VERSION_CGU } from '../lib/legal.ts';
import { DOC_API, DOC_API_V1 } from '../lib/docApi.ts';
import { CODES_EN, PARAMETRES_EN, ROUTES_EN, TYPES_EN, versAnglais, versFrancais } from '../lib/apiAnglais.ts';
import * as db from './db.ts';
import { empreinte } from './auth.ts';
import { droits, joursLisibles, periodeLisible, verifierDates } from './droits.ts';
import { REFUS_PROGRAMMATION } from '../lib/droits.ts';
import { JOUR, MINUTE, cleIp, limiteur } from './limites.ts';
import { apercuSite } from './apercu.ts';
import { articlesDe } from './flux.ts';
import { lireNote } from './avis.ts';
import * as liste from './liste.ts';
import { requeteSortante } from './sortante.ts';

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
  /** Le message de l'API v2 et des outils MCP en anglais, quand celui de la v1 cite des noms français. */
  readonly enAnglais: string;
  constructor(statut: number, code: string, message: string, enAnglais = message) { super(message); this.statut = statut; this.code = code; this.enAnglais = enAnglais; }
}

export interface Appelant { compte: string; cle: string; ecriture: boolean }

/** 120 appels par minute et 5 000 par jour pour une clé : de quoi tout faire d'une page, pas de quoi la marteler. */
const appelsParCle = limiteur([120, MINUTE], [5000, JOUR]);
/** Une adresse IP qui essaie des clés fausses s'arrête vite. */
const clesFaussesParIp = limiteur([20, MINUTE]);

/** Le compte d'une clé passée en `Authorization: Bearer hopla_…`, ou l'erreur à rendre. */
export function authentifier(entete: string | null, ip: string, env: Record<string, string | undefined> = process.env, maintenant = Date.now()): Appelant {
  const cle = /^Bearer\s+(\S+)$/i.exec(entete?.trim() ?? '')?.[1] ?? '';
  if (!cle) throw new ErreurApi(401, 'cle_absente', `Missing API key. Send it in the Authorization header: Bearer hopla_… Create one in Réglages (Settings) on ${NOM_ADMIN}.`);
  const trouvee = FORME_CLE.test(cle) ? db.cleApiParEmpreinte(empreinte(cle)) : undefined;
  if (!trouvee) {
    if (clesFaussesParIp(cleIp(ip || 'inconnue'), maintenant)) throw new ErreurApi(429, 'trop_d_essais', 'Too many invalid API keys. Retry in one minute.');
    throw new ErreurApi(401, 'cle_invalide', 'Invalid or revoked API key.');
  }
  const compte = db.compteParId(trouvee.compte);
  if (!compte || compte.statut !== 'actif') throw new ErreurApi(403, 'compte_suspendu', 'This account is suspended.');
  if (compte.id !== PRINCIPAL && compte.cgu !== VERSION_CGU) throw new ErreurApi(403, 'conditions', `Accept the updated terms of service on ${NOM_ADMIN}, then retry.`);
  if (!droits(compte, env, maintenant).api) throw new ErreurApi(403, 'offre', 'The API and MCP server require the Pro plan. The key is reactivated when the account is back on Pro.');
  if (appelsParCle(trouvee.id, maintenant)) throw new ErreurApi(429, 'trop_d_appels', 'Rate limit exceeded for this API key. Retry in one minute.');
  db.noterUsageCleApi(trouvee.id, maintenant);
  return { compte: compte.id, cle: trouvee.id, ecriture: trouvee.ecriture === 1 };
}

const ecrire = (a: Appelant) => {
  if (!a.ecriture) throw new ErreurApi(403, 'lecture_seule', 'This API key is read-only. Use a key with write access.');
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
  if (!Object.keys(changes).length) throw new ErreurApi(400, 'rien_a_changer', 'Request body must contain at least one setting, for example {"profil": {"bio": "…"}}.',
    'Request body must contain at least one setting, for example {"profile": {"bio": "…"}}.');
  if ('theme' in changes && !THEMES.some(t => t.id === changes.theme)) throw new ErreurApi(400, 'theme_inconnu', `Unknown theme. Valid values: ${THEMES.map(t => t.id).join(', ')}.`);
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
  if (!bloc) throw new ErreurApi(404, 'bloc_introuvable', 'Block not found.');
  return bloc;
};

export const lireBlocs = (a: Appelant) => db.lireBlocs(a.compte);
export const lireBloc = (a: Appelant, id: string) => blocDuCompte(a, id);

function enregistrer(a: Appelant, bloc: Bloc) {
  if (a.compte !== PRINCIPAL && TYPES_PRINCIPAL.includes(bloc.type)) throw new ErreurApi(400, 'type_reserve', 'This block type is not available.');
  try {
    verifierDates(db.compteParId(a.compte)!, bloc);
    db.enregistrerBloc(a.compte, bloc);
  } catch (error) {
    // Les refus du back office sont écrits en français pour l'interface : l'API les rend en anglais.
    const message = (error as Error).message;
    throw new ErreurApi(400, 'bloc_refuse', message === REFUS_PROGRAMMATION ? 'Scheduling a block (start or end date) requires the Starter plan or higher.'
      : /^Deux cents blocs/.test(message) ? 'A page can have at most 200 blocks.' : 'Block rejected.');
  }
}

/** Une adresse envoyée que la validation a dû laisser de côté : on le dit, plutôt que d'enregistrer un bloc sans adresse. */
function adresseGardee(envoye: Record<string, unknown>, bloc: Bloc) {
  if (typeof envoye.url === 'string' && envoye.url.trim() && !(bloc as { url?: string }).url) {
    throw new ErreurApi(400, 'adresse_invalide', 'Invalid url: expected an https://, mailto: or tel: URL.');
  }
}

/** Les types qu'un compte peut poser. */
export const typesPermis = (compte: string) => TYPES_BLOC.filter(t => compte === PRINCIPAL || !TYPES_PRINCIPAL.includes(t));

/** Un bloc neuf, en haut de la page, ou à `position` (0 : en haut) ; le type par défaut est un lien. */
export function ajouterBloc(a: Appelant, donnees: unknown, position?: unknown): Bloc {
  ecrire(a);
  const o = objet(donnees);
  if (o.type !== undefined && !(typesPermis(a.compte) as readonly unknown[]).includes(o.type)) {
    throw new ErreurApi(400, 'type_inconnu', `Unknown block type. Valid values: ${typesPermis(a.compte).join(', ')}.`,
      `Unknown block type. Valid values: ${typesPermis(a.compte).map(t => TYPES_EN[t]).join(', ')}.`);
  }
  const bloc = validerBloc(o, db.nouvelId());
  adresseGardee(o, bloc);
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
  const o = objet(partiel);
  const bloc = validerBloc({ ...avant, ...o, type: avant.type }, avant.id);
  adresseGardee(o, bloc);
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
    throw new ErreurApi(400, 'ordre_incomplet', 'ids must list every block id exactly once, in the new order.');
  }
  db.ordonner(a.compte, liste);
  return db.lireBlocs(a.compte);
}

/** Les stats d'une période : 7, 14, 30, 90 ou 365 derniers jours, ou des dates `{ du, au }` (AAAA-MM-JJ). */
export function lireStats(a: Appelant, periode: unknown, env: Record<string, string | undefined> = process.env): Stats {
  const lue = lirePeriode(periode ?? 30);
  if (lue === null) throw new ErreurApi(400, 'periode', 'Invalid period: use 7, 14, 30, 90 or 365 days, or du and au dates (YYYY-MM-DD).',
    'Invalid period: use 7, 14, 30, 90 or 365 days, or from and to dates (YYYY-MM-DD).');
  const compte = db.compteParId(a.compte)!;
  if (!joursLisibles(compte, env)) throw new ErreurApi(403, 'offre', 'Analytics require the Starter plan or higher.');
  const bornee = periodeLisible(compte, lue, env);
  if (bornee === null) throw new ErreurApi(400, 'periode', 'These dates are outside the analytics retention period of the current plan.');
  return db.stats(a.compte, bornee);
}

export const listerThemes = () => THEMES.map(t => ({ id: t.id, nom: t.nom, humeur: t.humeur, famille: t.famille }));

/* ---- Ce que le back office fait aussi (29 octobre 2026, demandé par Lilian : « tout ce qui est dans l'outil, dans l'API ») ---- */

const iso = (ms: number | null | undefined) => (ms ? new Date(ms).toISOString() : null);

/** Le compte : son adresse, son offre, son essai, et ce que son offre lui ouvre (`fonctions`). */
export function lireCompte(a: Appelant, env: Record<string, string | undefined> = process.env) {
  const c = db.compteParId(a.compte)!;
  const ab = db.abonnement(c);
  const reglages = db.lireReglages(a.compte);
  const d = droits(c, env);
  return {
    compte: {
      pseudo: c.pseudo,
      adresse: adressePartage({ pseudo: c.pseudo, principal: c.id === PRINCIPAL }, reglages.domaine),
      cree: iso(c.cree),
      offre: ab.plan,
      essai: ab.essai ? { jusqu: iso(ab.essai) } : null,
      abonnement: ab.statut ? { offre: ab.payee, statut: ab.statut, periode: ab.periode, finPeriode: iso(ab.finPeriode) } : null,
      offreOfferte: ab.offerte ? { offre: ab.offerte.plan, jusqu: iso(ab.offerte.jusqu) } : null,
      fonctions: Object.fromEntries((Object.keys(FONCTIONS) as (keyof typeof FONCTIONS)[]).map(f => [f, { incluse: d[f], offre: FONCTIONS[f] }])),
      historiqueStats: joursLisibles(c, env),
    },
  };
}

export const lireReglagesApi = (a: Appelant) => ({ reglages: db.lireReglages(a.compte) });

/** Le QR code de la page, qui mène à son adresse marquée `?s=qr` (ses scans se comptent à part dans les stats). */
export async function qrCode(a: Appelant, format: string, taille: number) {
  const { compte } = lireCompte(a);
  const cible = `${compte.adresse}?s=qr`;
  const options = { margin: 2, errorCorrectionLevel: 'M' as const, color: { dark: '#0a0a0a', light: '#ffffff' } };
  if (format === 'png') return { type: 'image/png', corps: new Uint8Array(await QRCode.toBuffer(cible, { ...options, width: taille })) as Uint8Array<ArrayBuffer> };
  return { type: 'image/svg+xml', corps: await QRCode.toString(cible, { ...options, type: 'svg', width: taille }) };
}

/** Une copie d'un bloc, posée juste sous lui (masquée si `masquer`). */
export function dupliquerBloc(a: Appelant, id: string, options: unknown = {}): Bloc {
  ecrire(a);
  const avant = blocDuCompte(a, id);
  const copie = validerBloc({ ...avant, ...(objet(options).masquer === true ? { public: false } : {}) }, db.nouvelId());
  enregistrer(a, copie);
  const ids = db.lireBlocs(a.compte).map(b => b.id).filter(i => i !== copie.id);
  ids.splice(ids.indexOf(avant.id) + 1, 0, copie.id);
  db.ordonner(a.compte, ids);
  return copie;
}

/** Les vues des 7 derniers jours et celles des 7 d'avant : pour toutes les offres, comme l'onglet Stats en Gratuit. */
export function lireSemaine(a: Appelant) {
  const s = db.stats(a.compte, 7);
  return { semaine: { vues: s.vues, avant: s.precedent.vues, dejaVue: s.dejaVue } };
}

/** « En bref » : la période en une phrase, puis ses faits marquants, comme en tête de l'onglet Stats. */
export function lireResume(a: Appelant, periode: unknown, env: Record<string, string | undefined> = process.env) {
  const stats = lireStats(a, periode, env);
  return { resume: { phrase: enUnePhrase(stats), faits: resumer(stats), jours: stats.jours } };
}

/** Une image envoyée chez Hopla (WebP, JPEG ou PNG, 1,5 Mo au plus) : son adresse se pose en avatar, en vignette, dans une galerie. */
export function envoyerMedia(a: Appelant, octets: Uint8Array) {
  ecrire(a);
  if (!octets.length) throw new ErreurApi(400, 'image_absente', 'Missing image: send the raw bytes (Content-Type: image/webp, image/jpeg or image/png), or {"image": "data:image/…;base64,…"}.');
  if (octets.length > 1_500_000) throw new ErreurApi(413, 'image_trop_grosse', 'Image too large: 1.5 MB maximum.');
  const ascii = (de: number, a2: number) => Buffer.from(octets.subarray(de, a2)).toString('latin1');
  const extension = ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP' ? 'webp'
    : octets[0] === 0xff && octets[1] === 0xd8 && octets[2] === 0xff ? 'jpg'
      : ascii(1, 4) === 'PNG' && octets[0] === 0x89 ? 'png' : null;
  if (!extension) throw new ErreurApi(415, 'format_image', 'Unsupported image format: WebP, JPEG or PNG only.');
  let id: string;
  try { id = db.ajouterMedia(a.compte, octets, extension); }
  catch { throw new ErreurApi(413, 'plus_de_place', 'Image storage quota exceeded: delete unused images or reuse an uploaded one.'); }
  const chemin = `/media/${id}.${extension}`;
  return { media: { chemin, url: `${ORIGINE_PUBLIQUE}${chemin}` } };
}

/** Une image en data URL (`data:image/png;base64,…`), décodée. */
export function octetsDeDataUrl(v: unknown): Uint8Array {
  const m = /^data:image\/[\w.+-]+;base64,([A-Za-z0-9+/=\s]+)$/.exec(String(v ?? ''));
  if (!m) throw new ErreurApi(400, 'image_absente', 'The image field must be a data URL: data:image/webp;base64,…');
  if (m[1].length > 2_100_000) throw new ErreurApi(413, 'image_trop_grosse', 'Image too large: 1.5 MB maximum.');
  return new Uint8Array(Buffer.from(m[1], 'base64'));
}

/** La liste e-mail : combien d'inscrits, combien cette semaine, ceux pas encore partis, et où ils partent (sans la clé). */
export function lireListe(a: Appelant, env: Record<string, string | undefined> = process.env) {
  const { total, semaine, enAttente } = db.resumeContacts(a.compte);
  const i = liste.resumeIntegration(env, a.compte);
  return { liste: { inscrits: total, semaine, enAttente, branchee: i ? { outil: i.fournisseur, liste: i.nom || i.liste, cle: i.cle } : null } };
}

const contactPublic = (c: { id: string; email: string; prenom: string; ts: number; source: string; synchro: string }) =>
  ({ id: c.id, email: c.email, prenom: c.prenom, inscrit: iso(c.ts), source: c.source, envoye: c.synchro === 'ok' });

/** Les inscrits, du plus récent au plus ancien, par pages (`limite` 1 à 500, `depart` à partir de 0). */
export function listerInscrits(a: Appelant, limite: unknown, depart: unknown) {
  const tous = db.tousLesContacts(a.compte);
  const n = Math.min(500, Math.max(1, Number.parseInt(String(limite ?? 100), 10) || 100));
  const d = Math.max(0, Number.parseInt(String(depart ?? 0), 10) || 0);
  const page = tous.slice(d, d + n);
  return { inscrits: page.map(contactPublic), total: tous.length, suivant: d + n < tous.length ? d + n : null };
}

/** Tous les inscrits en CSV (email, prénom, date, provenance), comme l'export du back office. */
export function inscritsCsv(a: Appelant, anglais = false): string {
  const champ = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [anglais ? 'email,first_name,subscribed_at,source' : 'email,prenom,inscrit,source', ...db.tousLesContacts(a.compte).map(c => [c.email, c.prenom, iso(c.ts) ?? '', c.source].map(champ).join(','))].join('\n') + '\n';
}

export function supprimerInscrit(a: Appelant, id: string) {
  ecrire(a);
  if (!db.tousLesContacts(a.compte).some(c => c.id === id)) throw new ErreurApi(404, 'inscrit_introuvable', 'Subscriber not found.');
  db.supprimerContact(a.compte, id);
  return { supprime: id };
}

/** Renvoie chez l'outil branché les inscrits qui n'y sont pas encore. */
export async function envoyerInscrits(a: Appelant, env: Record<string, string | undefined> = process.env) {
  ecrire(a);
  if (!liste.resumeIntegration(env, a.compte)) throw new ErreurApi(409, 'rien_de_branche', 'No newsletter or automation is connected. Connect one in Intégrations (Integrations) on ' + NOM_ADMIN + '.');
  if (liste.tropDAppels(a.compte)) throw new ErreurApi(429, 'trop_d_appels', 'Too many sync requests. Retry in a few minutes.');
  let envoyes = 0, erreurs = 0;
  for (const c of db.contactsAEnvoyer(a.compte)) (await liste.pousser(env, a.compte, c, requeteSortante)) ? envoyes++ : erreurs++;
  return { envoyes, erreurs };
}

/** Trente lectures du web par compte en dix minutes, comme dans le back office. */
const lecturesWeb = limiteur([30, 10 * MINUTE]);
const urlLue = (v: unknown) => {
  const url = adresse(String(v ?? ''));
  if (!/^https?:\/\//.test(url)) throw new ErreurApi(400, 'adresse', 'url must be an https:// or http:// URL.');
  return url;
};
const lireLeWeb = (a: Appelant) => { if (lecturesWeb(a.compte)) throw new ErreurApi(429, 'trop_de_lectures', 'Too many web fetch requests. Retry in a few minutes.'); };

/** Ce qu'un site dit de lui : titre, description, prix d'un produit, et son image (data URL), comme quand on colle une adresse. */
export async function lireApercu(a: Appelant, corps: unknown) {
  const o = objet(corps);
  const url = urlLue(o.url);
  lireLeWeb(a);
  const image: ImageApercu = o.image === 'logo' || o.image === 'vignette' || o.image === 'partage' ? o.image : o.image !== false;
  try { return { apercu: await apercuSite(url, { image }) }; }
  catch { throw new ErreurApi(422, 'site_illisible', 'Unable to fetch this URL.'); }
}

/** Les derniers articles d'un blog ou d'un podcast, ou la dernière vidéo d'une chaîne YouTube. */
export async function lireFlux(a: Appelant, corps: unknown) {
  const o = objet(corps);
  const url = urlLue(o.url);
  lireLeWeb(a);
  const video = o.video === true;
  try { return { articles: (await articlesDe(url, { video })).slice(0, video ? 1 : ARTICLES_FLUX) }; }
  catch { return { articles: [] }; }
}

/** La note d'une page d'avis (Trustpilot, une page qui la déclare en JSON-LD), ramenée sur 5 ; null si la page ne la dit pas. */
export async function lireNoteAvis(a: Appelant, corps: unknown) {
  const url = urlLue(objet(corps).url);
  lireLeWeb(a);
  return { note: await lireNote(url).catch(() => null) };
}

/** Les clés du compte, sans elles : leur nom, leur début, ce qu'elles peuvent, quand elles ont servi. `courante` : celle de l'appel. */
export const listerCles = (a: Appelant) => ({
  cles: db.clesApi(a.compte).map(c => ({ id: c.id, nom: c.nom, debut: c.debut, ecriture: c.ecriture, cree: iso(c.cree), utilisee: iso(c.utilisee), courante: c.id === a.cle })),
});

/** Tout ce que Hopla garde du compte (droit d'accès), sans les images. */
export const exporterCompte = (a: Appelant) => db.exporter(a.compte);

export const listerReseaux = () => ({ reseaux: RESEAUX.map(id => ({ id, nom: NOMS_RESEAUX[id] ?? id })) });
export const listerPictos = () => ({ pictos: PICTOS.map(p => ({ nom: p.nom, libelle: p.libelle })) });
export const listerTypes = (a: Appelant) => ({ types: typesPermis(a.compte) });

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

/** Une erreur rendue : `{ erreur: … }` et ses codes français en v1, `{ error: … }` en v2. */
export function reponseErreur(error: unknown, anglais = false): Response {
  if (error instanceof ErreurApi) {
    const corps = anglais ? { error: { code: CODES_EN[error.code] ?? error.code, message: error.enAnglais } } : { erreur: { code: error.code, message: error.message } };
    return json(error.statut, corps, {
      ...(error.statut === 429 ? { 'Retry-After': '60' } : {}),
      ...(error.statut === 401 ? { 'WWW-Authenticate': 'Bearer realm="hopla"' } : {}),
    });
  }
  console.error('[api]', error);
  const message = 'Internal server error. Retry shortly.';
  return json(500, anglais ? { error: { code: 'internal_error', message } } : { erreur: { code: 'serveur', message } });
}

/** Le corps JSON d'une requête, 256 Ko au plus ; une image en data URL a droit à ses 1,5 Mo (2,1 millions de caractères en base64). */
export async function lireCorps(requete: Request, max = 256_000): Promise<unknown> {
  const texte = await requete.text();
  if (texte.length > max) throw new ErreurApi(413, 'trop_gros', `Request body too large (${max > 256_000 ? '1.5 MB image' : '256 KB'} maximum).`);
  if (!texte.trim()) return {};
  try { return JSON.parse(texte); }
  catch { throw new ErreurApi(400, 'json', 'Request body is not valid JSON.'); }
}

/** L'adresse IP du visiteur, que deploy/server.mjs a démêlée. */
export const ipDe = (requete: Request) => requete.headers.get('x-real-ip') ?? '';

/** Les adresses de l'API : une méthode qui n'y est pas permise répond 405, une autre adresse 404. */
const ROUTES = ['/page', '/compte', '/reglages', '/qr', '/blocs', '/blocs/:id', '/blocs/:id/dupliquer', '/ordre', '/medias', '/stats', '/stats/semaine',
  '/stats/resume', '/liste', '/inscrits', '/inscrits/:id', '/inscrits/envoyer', '/apercu', '/flux', '/avis', '/cles', '/export', '/themes', '/reseaux', '/pictos', '/types'];

/** La période des stats lue dans l'adresse : `?periode=30`, ou `?du=…&au=…`. */
const periodeDe = (q: URLSearchParams) => {
  const du = q.get('du'), au = q.get('au');
  return du || au ? { du, au } : q.get('periode') ?? undefined;
};

/** La route d'un chemin de la v2 (`/blocks/:id`…), et celle de la v1 qu'elle sert. */
function routeV2(chemin: string) {
  const [, base, id, suite] = /^(\/(?:blocks|subscribers))\/([\w-]{1,40})(\/duplicate)?$/.exec(chemin) ?? [];
  const route = base && chemin !== '/blocks/order' && chemin !== '/subscribers/sync' ? `${base}/:id${suite ?? ''}` : chemin;
  return { id, connue: route in ROUTES_EN, routeV1: ROUTES_EN[route] ?? `?${route}` };
}

/** La route d'un chemin de la v1 (`/blocs/:id`…). */
function routeV1(chemin: string) {
  const [, base, id, suite] = /^(\/(?:blocs|inscrits))\/([\w-]{1,40})(\/dupliquer)?$/.exec(chemin) ?? [];
  const route = base && chemin !== '/inscrits/envoyer' ? `${base}/:id${suite ?? ''}` : chemin;
  return { id, connue: ROUTES.includes(route), routeV1: route };
}

/*
 * Deux versions (29 octobre 2026) : la v2, en anglais, et la v1, celle du 28 octobre, aux noms français, gardée telle
 * quelle pour les intégrations déjà branchées. Les gestes ne parlent que français : la v2 traduit à l'entrée (chemin,
 * paramètres, corps) et à la sortie (`lib/apiAnglais.ts`).
 */
export async function repondreApi(requete: Request, env: Record<string, string | undefined> = process.env): Promise<Response> {
  const url = new URL(requete.url);
  const v2 = url.pathname.startsWith('/api/v2');
  const chemin = url.pathname.replace(/^\/api\/v[12]/, '').replace(/\/+$/, '');
  const methode = requete.method.toUpperCase();
  if (methode === 'OPTIONS') return new Response(null, { status: 204, headers: ENTETES_CORS });
  // La documentation, sans clé : pour les humains comme pour les agents.
  if (chemin === '' && (methode === 'GET' || methode === 'HEAD')) {
    return new Response(v2 ? DOC_API : DOC_API_V1, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600', ...ENTETES_CORS } });
  }
  const repondre = (statut: number, corps: unknown, entetes: Record<string, string> = {}) => json(statut, v2 ? versAnglais(corps) : corps, entetes);
  const lire = async (max?: number) => (v2 ? versFrancais(await lireCorps(requete, max)) : lireCorps(requete, max));
  try {
    const a = authentifier(requete.headers.get('authorization'), ipDe(requete), env);
    const { id, connue, routeV1: routeFr } = v2 ? routeV2(chemin) : routeV1(chemin);
    const q = v2 ? new URLSearchParams([...url.searchParams].map(([k, v]) => [PARAMETRES_EN[k] ?? k, v])) : url.searchParams;
    switch (`${methode} ${routeFr}`) {
      case 'GET /page': return repondre(200, lirePage(a));
      case 'GET /compte': return repondre(200, lireCompte(a, env));
      case 'GET /reglages': return repondre(200, lireReglagesApi(a));
      case 'PATCH /reglages': return repondre(200, { reglages: modifierReglages(a, await lire()) });
      case 'GET /qr': {
        const format = q.get('format') === 'png' ? 'png' : 'svg';
        const taille = Math.min(2000, Math.max(120, Number.parseInt(q.get('taille') ?? '', 10) || 720));
        const { type, corps } = await qrCode(a, format, taille);
        return new Response(corps, { headers: { 'Content-Type': type, 'Cache-Control': 'no-store', 'Content-Disposition': `inline; filename="qr-hopla.${format}"`, ...ENTETES_CORS } });
      }
      case 'GET /blocs': return repondre(200, { blocs: lireBlocs(a) });
      case 'POST /blocs': {
        const corps = objet(await lire());
        const { position, ...donnees } = corps;
        return repondre(201, { bloc: ajouterBloc(a, donnees, position) });
      }
      case 'GET /blocs/:id': return repondre(200, { bloc: lireBloc(a, id!) });
      case 'PATCH /blocs/:id': return repondre(200, { bloc: modifierBloc(a, id!, await lire()) });
      case 'DELETE /blocs/:id': return repondre(200, supprimerBloc(a, id!));
      case 'POST /blocs/:id/dupliquer': return repondre(201, { bloc: dupliquerBloc(a, id!, await lire()) });
      case 'PUT /ordre': return repondre(200, { blocs: ordonnerBlocs(a, objet(await lire()).ids) });
      case 'POST /medias': {
        const type = requete.headers.get('content-type') ?? '';
        if (/^image\//i.test(type)) {
          const brut = new Uint8Array(await requete.arrayBuffer());
          return repondre(201, envoyerMedia(a, brut));
        }
        return repondre(201, envoyerMedia(a, octetsDeDataUrl(objet(await lire(2_200_000)).image)));
      }
      case 'GET /stats': return repondre(200, { stats: lireStats(a, periodeDe(q), env) });
      case 'GET /stats/semaine': return repondre(200, lireSemaine(a));
      case 'GET /stats/resume': return repondre(200, lireResume(a, periodeDe(q), env));
      case 'GET /liste': return repondre(200, lireListe(a, env));
      case 'GET /inscrits': {
        if (q.get('format') === 'csv') {
          return new Response(inscritsCsv(a, v2), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="inscrits-hopla.csv"', 'Cache-Control': 'no-store', ...ENTETES_CORS } });
        }
        return repondre(200, listerInscrits(a, q.get('limite'), q.get('depart')));
      }
      case 'DELETE /inscrits/:id': return repondre(200, supprimerInscrit(a, id!));
      case 'POST /inscrits/envoyer': return repondre(200, await envoyerInscrits(a, env));
      case 'POST /apercu': return repondre(200, await lireApercu(a, await lire()));
      case 'POST /flux': return repondre(200, await lireFlux(a, await lire()));
      case 'POST /avis': return repondre(200, await lireNoteAvis(a, await lire()));
      case 'GET /cles': return repondre(200, listerCles(a));
      case 'GET /export': return repondre(200, exporterCompte(a), { 'Content-Disposition': 'attachment; filename="export-hopla.json"' });
      case 'GET /themes': return repondre(200, { themes: listerThemes() });
      case 'GET /reseaux': return repondre(200, listerReseaux());
      case 'GET /pictos': return repondre(200, listerPictos());
      case 'GET /types': return repondre(200, listerTypes(a));
    }
    throw new ErreurApi(connue ? 405 : 404, connue ? 'methode' : 'introuvable', connue ? 'Method not allowed on this route.' : `Route not found. Documentation: GET /api/${v2 ? 'v2' : 'v1'}`);
  } catch (error) {
    return reponseErreur(error, v2);
  }
}
