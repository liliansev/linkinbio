import { randomUUID } from 'node:crypto';
import { PRINCIPAL, NOM_PUBLIC } from '../lib/types.ts';
import type { Langue } from '../lib/types.ts';
import type { LienCourt } from '../lib/courts.ts';
import { MAX_LIENS_COURTS, codeCourt } from '../lib/courts.ts';
import { planHorsEssai } from '../lib/abonnement.ts';
import { lienApp } from '../lib/ouvrirApp.ts';
import { adresse } from '../lib/valider.ts';
import * as db from './db.ts';

/*
 * Les liens courts d'un compte (10 novembre 2026, lot 2 d'après Taap.it) : les créer, les suivre. Suivre un lien
 * court, c'est compter un clic (un nombre par jour, rien du visiteur) puis renvoyer vers sa destination, dans son
 * app quand on arrive du navigateur intégré d'Instagram, de TikTok… et que la page le veut (`ouvrirApps`).
 */

const ROBOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|curl|wget|python|headless|lighthouse/i;

/** Combien de liens courts ce compte peut avoir : selon l'offre qu'il a vraiment, hors essai ; tout pour le compte principal et une instance sans paiement. */
export function maxLiensCourts(compte: string, maintenant = Date.now()): number {
  const c = db.compteParId(compte);
  if (!c) return 0;
  if (c.id === PRINCIPAL || db.sansPaiement()) return MAX_LIENS_COURTS.premium;
  return MAX_LIENS_COURTS[planHorsEssai(db.abonnement(c, maintenant))];
}

export type RefusLienCourt = 'adresse' | 'code' | 'pris' | 'limite' | 'inconnu';

/** Un code au hasard, sans lettres qui se confondent, pour qui n'en tape pas. */
const codeAuHasard = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), o => 'abcdefghjkmnpqrstuvwxyz23456789'[o % 31]).join('');

/** Crée un lien court (sans `id`) ou le modifie. Le code ne se tape pas forcément : vide, il est tiré au hasard. */
export function enregistrerLienCourt(compte: string, entree: { id?: unknown; code?: unknown; url?: unknown; titre?: unknown }, maintenant = Date.now()): { ok: true; lien: LienCourt } | { ok: false; refus: RefusLienCourt } {
  const url = adresse(entree.url);
  if (!/^https?:\/\//.test(url)) return { ok: false, refus: 'adresse' };
  const id = typeof entree.id === 'string' && entree.id ? entree.id.slice(0, 40) : '';
  const existants = db.liensCourts(compte, maintenant);
  if (id && !existants.some(l => l.id === id)) return { ok: false, refus: 'inconnu' };
  if (!id && existants.length >= maxLiensCourts(compte, maintenant)) return { ok: false, refus: 'limite' };
  const tape = String(entree.code ?? '').trim();
  let code = tape ? codeCourt(tape) : '';
  if (tape && !code) return { ok: false, refus: 'code' };
  if (!code) do { code = codeAuHasard(); } while (existants.some(l => l.code === code));
  const lien = { id: id || randomUUID(), code, url, titre: (typeof entree.titre === 'string' ? entree.titre : '').replace(/\s+/g, ' ').trim().slice(0, 80) };
  if (!db.ecrireLienCourt(compte, lien, maintenant)) return { ok: false, refus: 'pris' };
  return { ok: true, lien: db.liensCourts(compte, maintenant).find(l => l.id === lien.id)! };
}

const echapper = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

/** Sur iOS, un schéma d'app ne dit pas s'il a marché : une petite page l'essaie, puis passe à l'adresse web. */
function pageApp(app: string, web: string, langue: Langue): string {
  const l = (fr: string, en: string) => (langue === 'fr' ? fr : en);
  return `<!doctype html><html lang="${langue}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${echapper(NOM_PUBLIC)}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.4 system-ui,sans-serif;background:#f6f3ea;color:#16161d}a{color:#1f3cff;display:inline-block;padding:12px}</style></head>
<body><p><a id="suite" href="${echapper(web)}">${l('Continuer', 'Continue')}</a></p>
<script>var web=${JSON.stringify(web).replace(/</g, '\\u003c')};location.href=${JSON.stringify(app).replace(/</g, '\\u003c')};setTimeout(function(){if(!document.hidden)location.replace(web)},1500);</script></body></html>`;
}

/**
 * Où mène `/<pseudo>/<code>` : une redirection, la petite page qui ouvre l'app sur iOS, ou rien (404). Le clic se
 * compte ici, sauf celui d'un robot ou d'un aperçu de lien.
 */
export function suivreLienCourt(pseudo: string, code: string, ua: string, maintenant = Date.now()): { vers: string } | { page: string } | null {
  if (!/^[a-z0-9-]{3,30}$/.test(pseudo) || !codeCourt(code) || codeCourt(code) !== code) return null;
  const c = db.compteParPseudo(pseudo);
  if (!c || c.statut !== 'actif') return null;
  const lien = db.lienCourtParCode(c.id, code);
  if (!lien) return null;
  if (ua && !ROBOTS.test(ua)) db.compterClicCourt(c.id, lien.id, maintenant);
  const reglages = db.lireReglages(c.id);
  const app = reglages.ouvrirApps === false ? null : lienApp(lien.url, ua);
  if (!app) return { vers: lien.url };
  return app.repli ? { page: pageApp(app.adresse, lien.url, reglages.langue) } : { vers: app.adresse };
}
