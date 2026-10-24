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
 * (`CF-IPCountry`, deux lettres) : l'adresse IP ne sert qu'à l'empreinte.
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

export function enregistrer(entree: { page?: unknown; type: unknown; bloc: unknown; utm: unknown; referent: unknown; app?: unknown }, contexte: { ip: string; ua: string; session: string | null; pays?: string }, maintenant = Date.now()): boolean {
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
  });
  return true;
}
