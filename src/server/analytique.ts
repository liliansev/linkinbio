import { createHash } from 'node:crypto';
import { ajouterEvenement, evenementsDuJour, jourDe, lireBlocs, secret } from './db.ts';

/*
 * Les statistiques intégrées, sans cookie ni donnée personnelle : un visiteur
 * est une empreinte du jour (secret + date + IP + navigateur), illisible et
 * renouvelée chaque jour. Les robots sont écartés, et les visites de Lilian
 * connecté aussi.
 */

const ROBOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|curl|wget|python|headless|lighthouse/i;

const SOURCES: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/, 'Instagram'], [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'], [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'LinkedIn'],
  [/(^|\.)(t\.co|x\.com|twitter\.com)$/, 'X'], [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, 'Facebook'], [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)threads\.(net|com)$/, 'Threads'], [/(^|\.)(bing\.com|duckduckgo\.com|qwant\.com)$/, 'Moteurs'],
  [/(^|\.)liliansevoumian\.fr$/, 'Mon site'], [/(^|\.)(mail\.google\.com|outlook\.[a-z.]+)$/, 'E-mail'], [/(^|\.)google\.[a-z.]+$/, 'Google'],
];

/** Le nom lisible d'une provenance : `?utm_source=` d'abord, sinon le référent. */
export function source(utm: string, referent: string): string {
  const u = utm.trim().toLowerCase().slice(0, 40);
  const alias: Record<string, string> = { qr: 'QR code', ig: 'Instagram', yt: 'YouTube', li: 'LinkedIn', tt: 'TikTok', nl: 'Newsletter' };
  if (alias[u]) return alias[u];
  if (u) {
    for (const [, nom] of SOURCES) if (nom.toLowerCase() === u) return nom;
    return u.charAt(0).toUpperCase() + u.slice(1);
  }
  let hote = '';
  try { hote = new URL(referent).hostname.replace(/^www\./, ''); } catch { return 'Direct'; }
  for (const [motif, nom] of SOURCES) if (motif.test(hote)) return nom;
  return hote.slice(0, 60) || 'Direct';
}

export function appareil(ua: string): string {
  if (/iPad|Tablet/i.test(ua)) return 'Tablette';
  if (/Mobi|Android|iPhone/i.test(ua)) return 'Mobile';
  return 'Ordinateur';
}

const fenetre = new Map<string, number[]>();
/** Au plus 60 événements par minute et par adresse IP (changer de navigateur ne suffit pas à passer outre). */
function tropRapide(visiteur: string, maintenant: number) {
  const recents = (fenetre.get(visiteur) ?? []).filter(t => maintenant - t < 60_000);
  recents.push(maintenant);
  fenetre.set(visiteur, recents);
  if (fenetre.size > 5000) fenetre.clear();
  return recents.length > 60;
}

export function enregistrer(entree: { type: unknown; bloc: unknown; utm: unknown; referent: unknown }, contexte: { ip: string; ua: string; admin: boolean }, maintenant = Date.now()): boolean {
  if (contexte.admin || !contexte.ua || ROBOTS.test(contexte.ua)) return false;
  const type = entree.type === 'clic' ? 'clic' : entree.type === 'vue' ? 'vue' : null;
  if (!type) return false;
  const bloc = type === 'clic' && typeof entree.bloc === 'string' && /^[\w-]{1,40}$/.test(entree.bloc) ? entree.bloc : null;
  if (type === 'clic' && !bloc) return false;
  const visiteur = createHash('sha256').update(`${secret()}|${jourDe(maintenant)}|${contexte.ip}|${contexte.ua}`).digest('base64url').slice(0, 16);
  if (tropRapide(contexte.ip || visiteur, maintenant)) return false;
  // Un clic vise un lien qui existe ; et un plafond par jour protège le disque d'un envoi en masse.
  if (bloc && !lireBlocs().some(b => b.id === bloc)) return false;
  if (evenementsDuJour(maintenant) >= 50_000) return false;
  ajouterEvenement({
    type, bloc, visiteur, ts: maintenant,
    source: source(typeof entree.utm === 'string' ? entree.utm : '', typeof entree.referent === 'string' ? entree.referent : ''),
    appareil: appareil(contexte.ua),
  });
  return true;
}
