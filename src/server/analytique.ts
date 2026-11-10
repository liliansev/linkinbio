import { createHash } from 'node:crypto';
import { PRINCIPAL } from '../lib/types.ts';
import { NOMS_AUDIENCES, audienceDeLApp } from '../lib/provenance.ts';
import { navigateurIntegre } from '../lib/ouvrirApp.ts';
import { ajouterEvenement, compteParPseudo, evenementsDuJour, jourDe, lireBlocs, secret } from './db.ts';
import { MINUTE, cleIp, limiteur } from './limites.ts';

/*
 * Les statistiques intégrées, sans cookie ni donnée personnelle : un visiteur
 * est une empreinte du jour (secret + date + IP + navigateur), illisible et
 * renouvelée chaque jour. Les robots sont écartés, et les visites du
 * propriétaire de la page, connecté, aussi. Le pays vient de Cloudflare
 * (`CF-IPCountry`, deux lettres), la ville aussi quand la zone la transmet : l'adresse IP ne sert qu'à l'empreinte.
 * Depuis le 10 novembre 2026 (lot 4 d'après Taap.it) : le système, le navigateur et la langue, en familles, sans version.
 */

const ROBOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|curl|wget|python|headless|lighthouse/i;

const SOURCES: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/, 'Instagram'], [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'], [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'LinkedIn'],
  [/(^|\.)(t\.co|x\.com|twitter\.com)$/, 'X'], [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, 'Facebook'], [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)threads\.(net|com)$/, 'Threads'], [/(^|\.)(bing\.com|duckduckgo\.com|qwant\.com)$/, 'Moteurs'],
  [/(^|\.)liliansevoumian\.fr$/, 'Mon site'], [/(^|\.)(mail\.google\.com|outlook\.[a-z.]+)$/, 'E-mail'], [/(^|\.)google\.[a-z.]+$/, 'Google'],
];

/** Le nom lisible d'une provenance : `?utm_source=` d'abord, sinon le référent, sinon l'app dont le navigateur intégré ouvre la page. */
export function source(utm: string, referent: string, ua = ''): string {
  const u = utm.trim().toLowerCase().slice(0, 40);
  const alias: Record<string, string> = { qr: 'QR code', ig: 'Instagram', yt: 'YouTube', li: 'LinkedIn', tt: 'TikTok', nl: 'Newsletter' };
  if (alias[u]) return alias[u];
  if (u) {
    for (const [, nom] of SOURCES) if (nom.toLowerCase() === u) return nom;
    return u.charAt(0).toUpperCase() + u.slice(1);
  }
  let hote = '';
  try { hote = new URL(referent).hostname.replace(/^www\./, ''); } catch { /* pas de référent */ }
  for (const [motif, nom] of SOURCES) if (hote && motif.test(hote)) return nom;
  // TikTok, Instagram… taisent souvent le référent, mais leur navigateur se nomme.
  const app = audienceDeLApp(ua);
  if (app) return NOMS_AUDIENCES[app];
  return hote.slice(0, 60) || 'Direct';
}

/** Le pays d'un visiteur tel que Cloudflare le transmet (`FR`) ; vide quand il ne le sait pas (`XX`) ou pour Tor (`T1`). */
export function pays(code: unknown): string {
  const c = typeof code === 'string' ? code.trim().toUpperCase() : '';
  return /^[A-Z]{2}$/.test(c) && c !== 'XX' ? c : '';
}

export function appareil(ua: string): string {
  if (/iPad|Tablet/i.test(ua)) return 'Tablette';
  if (/Mobi|Android|iPhone/i.test(ua)) return 'Mobile';
  return 'Ordinateur';
}

/** Le système du visiteur, lu dans son navigateur : une famille, jamais une version. */
export function systeme(ua: string): string {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macOS';
  if (/Linux|X11/i.test(ua)) return 'Linux';
  return 'Autre';
}

/** Son navigateur : celui d'une app (« App Instagram ») quand la page s'ouvre dedans, sinon sa famille, sans version. */
export function navigateur(ua: string): string {
  const app = audienceDeLApp(ua);
  if (app) return `App ${NOMS_AUDIENCES[app]}`;
  if (navigateurIntegre(ua)) return 'App';
  if (/Edg(e|A|iOS)?\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet';
  if (/Firefox|FxiOS/.test(ua)) return 'Firefox';
  if (/Chrome|CriOS|Chromium/.test(ua)) return 'Chrome';
  if (/Safari/.test(ua)) return 'Safari';
  return 'Autre';
}

/** La première langue que son navigateur demande (`fr`, `en`), sans la région ; vide s'il n'en dit rien. */
export function langueVisiteur(accept: unknown): string {
  const m = typeof accept === 'string' ? /^\s*([a-z]{2,3})(?=[-_;,\s]|$)/i.exec(accept) : null;
  return m ? m[1].toLowerCase() : '';
}

/**
 * Sa ville, telle que Cloudflare la déduit de la connexion (`CF-IPCity`, quand la zone ajoute les en-têtes de
 * localisation) ; vide sinon. Un en-tête arrive en latin-1 : les accents de Cloudflare, en UTF-8, se relisent ici.
 */
export function ville(v: unknown): string {
  if (typeof v !== 'string' || !v.trim()) return '';
  const relu = Buffer.from(v, 'latin1').toString('utf8');
  return (relu.includes('\ufffd') ? v : relu).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 60);
}

/** Au plus 60 événements par minute et par adresse IP, un /64 en IPv6 (changer de navigateur ne suffit pas à passer outre). */
const fenetre = limiteur([60, MINUTE]);
const tropRapide = (ip: string, maintenant: number) => fenetre(cleIp(ip), maintenant);

/** Le compte d'une page d'après son pseudo (vide pour la page de Lilian), s'il est en ligne. */
function compteDePage(page: unknown): string | null {
  if (page === '' || page === undefined || page === null) return PRINCIPAL;
  if (typeof page !== 'string' || !/^[a-z0-9-]{3,30}$/.test(page)) return null;
  const compte = compteParPseudo(page);
  return compte && compte.statut === 'actif' ? compte.id : null;
}

export function enregistrer(entree: { page?: unknown; type: unknown; bloc: unknown; utm: unknown; referent: unknown; app?: unknown }, contexte: { ip: string; ua: string; session: string | null; pays?: string; langue?: string; ville?: string }, maintenant = Date.now()): boolean {
  if (!contexte.ua || ROBOTS.test(contexte.ua)) return false;
  const compte = compteDePage(entree.page);
  if (!compte || contexte.session === compte) return false;
  const type = entree.type === 'clic' ? 'clic' : entree.type === 'vue' ? 'vue' : null;
  if (!type) return false;
  const bloc = type === 'clic' && typeof entree.bloc === 'string' && /^[\w-]{1,40}$/.test(entree.bloc) ? entree.bloc : null;
  if (type === 'clic' && !bloc) return false;
  const visiteur = createHash('sha256').update(`${secret()}|${jourDe(maintenant)}|${contexte.ip}|${contexte.ua}`).digest('base64url').slice(0, 16);
  if (tropRapide(contexte.ip || visiteur, maintenant)) return false;
  // Un clic vise un lien de cette page ; et un plafond par jour protège le disque d'un envoi en masse.
  if (bloc && !lireBlocs(compte).some(b => b.id === bloc)) return false;
  if (evenementsDuJour(maintenant) >= 50_000 || (compte !== PRINCIPAL && evenementsDuJour(maintenant, compte) >= 10_000)) return false;
  // Le navigateur intégré d'une app se lit ici ; l'ouverture dans l'app, seule la page la sait.
  const integre = navigateurIntegre(contexte.ua);
  ajouterEvenement({
    compte, type, bloc, visiteur, ts: maintenant, integre, app: integre && type === 'clic' && entree.app === true,
    source: source(typeof entree.utm === 'string' ? entree.utm : '', typeof entree.referent === 'string' ? entree.referent : '', contexte.ua),
    appareil: appareil(contexte.ua), pays: pays(contexte.pays),
    systeme: systeme(contexte.ua), navigateur: navigateur(contexte.ua), langue: langueVisiteur(contexte.langue), ville: pays(contexte.pays) ? ville(contexte.ville) : '',
  });
  return true;
}
