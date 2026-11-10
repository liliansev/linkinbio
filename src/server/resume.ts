import { ORIGINE_ADMIN, PRINCIPAL } from '../lib/types.ts';
import { resumer } from '../lib/resume.ts';
import * as db from './db.ts';
import { adresseAdmin } from './auth.ts';
import type { Env } from './courriel.ts';
import { echapper, envoyer, enveloppe, bouton } from './courriel.ts';
import { droits } from './droits.ts';

/*
 * Le résumé de la semaine, par e-mail, le lundi à partir de 9 h (heure de
 * Paris). Une seule fois par compte et par semaine (table `resumes`), et
 * seulement si la page a eu des visites : pas de courrier vide. Il fait partie
 * des stats : une page qui n'y a pas droit (Gratuit) ne le reçoit pas. Le
 * réglage « Mes stats par e-mail chaque lundi » le coupe.
 */

const formatParis = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', hourCycle: 'h23' });

/** Vrai le lundi, de 9 h à minuit, à Paris. */
export function heureDuResume(maintenant: number): boolean {
  const p = Object.fromEntries(formatParis.formatToParts(maintenant).map(x => [x.type, x.value]));
  return p.weekday === 'Mon' && Number(p.hour) >= 9;
}

/** La semaine en cours, nommée par son lundi (`2026-10-19`). */
export const semaineDe = (maintenant: number) => db.jourDe(maintenant);

export function courrielResume(pseudo: string, stats: ReturnType<typeof db.stats>, admin: string, langue: 'fr' | 'en' = 'fr') {
  if (langue === 'en') {
    const phrases = resumer(stats, 'en').map(p => p.texte);
    const n = (x: number) => x.toLocaleString('en-US');
    const chiffres = `${n(stats.vues)} views · ${n(stats.visiteurs)} visitors · ${n(stats.clics)} clicks`;
    const stop = 'To stop getting this summary: Settings, “My analytics by email every Monday”.';
    return {
      subject: `Your week on Hopla: ${phrases[0]?.replace(/\.$/, '').slice(0, 80) ?? chiffres}`,
      text: `Hi ${pseudo},\n\n${phrases.map(p => `• ${p}`).join('\n')}\n\n${chiffres}\n\nAll your analytics: ${admin}\n\n${stop}`,
      html: enveloppe(`<p>Hi ${echapper(pseudo)},</p><ul>${phrases.map(p => `<li style="margin:0 0 8px">${echapper(p)}</li>`).join('')}</ul><p style="color:#555">${chiffres}</p>${bouton(admin, 'See my analytics')}<p style="color:#888;font-size:13px">${stop}</p>`),
    };
  }
  const phrases = resumer(stats).map(p => p.texte);
  const chiffres = `${stats.vues.toLocaleString('fr-FR')} vues · ${stats.visiteurs.toLocaleString('fr-FR')} visiteurs · ${stats.clics.toLocaleString('fr-FR')} clics`;
  return {
    subject: `Ta semaine sur Hopla : ${phrases[0]?.replace(/\.$/, '').slice(0, 80) ?? chiffres}`,
    text: `Bonjour ${pseudo},\n\n${phrases.map(p => `• ${p}`).join('\n')}\n\n${chiffres}\n\nToutes tes stats : ${admin}\n\nPour ne plus recevoir ce résumé : Réglages, « Mes stats par e-mail chaque lundi ».`,
    html: enveloppe(`<p>Bonjour ${echapper(pseudo)},</p><ul>${phrases.map(p => `<li style="margin:0 0 8px">${echapper(p)}</li>`).join('')}</ul><p style="color:#555">${chiffres}</p>${bouton(admin, 'Voir mes stats')}<p style="color:#888;font-size:13px">Pour ne plus recevoir ce résumé : Réglages, « Mes stats par e-mail chaque lundi ».</p>`),
  };
}

/** Envoie les résumés dus. Renvoie le nombre d'e-mails partis. */
export async function envoyerResumes(env: Env, fetchImpl: typeof fetch, maintenant = Date.now()): Promise<number> {
  if (!heureDuResume(maintenant)) return 0;
  const semaine = semaineDe(maintenant);
  const admin = `${env.LIENS_ORIGINE_ADMIN || ORIGINE_ADMIN}/admin`;
  let envoyes = 0;
  for (const c of db.listerComptes(maintenant)) {
    const reglages = db.lireReglages(c.id);
    if (c.statut !== 'actif' || !reglages.resumeHebdo) continue;
    // Les stats se comptent pour tout le monde, mais seule une offre qui les montre reçoit leur résumé.
    const compte = db.compteParId(c.id);
    if (!compte || !droits(compte, env, maintenant).stats) continue;
    if (!db.reserverResume(c.id, semaine, maintenant)) continue;
    const stats = db.stats(c.id, 7, maintenant);
    if (!stats.vues) continue;
    const to = db.duPrincipal(compte) ? adresseAdmin(env) : c.email;
    if (!to) continue;
    if (await envoyer(env, fetchImpl, { to, ...courrielResume(c.pseudo, stats, admin, reglages.langue) })) envoyes++;
  }
  return envoyes;
}

let minuteur: ReturnType<typeof setInterval> | null = null;
/** Vérifie toutes les heures s'il y a des résumés à envoyer. Sans clé Resend, rien ne part. */
export function planifierResumes(env: Env = process.env) {
  if (minuteur || !env.RESEND_API_KEY || env.HOPLA_RESUMES === '0') return;
  const tour = () => { envoyerResumes(env, fetch).catch(error => console.error('[liens] résumés', (error as Error).message)); };
  minuteur = setInterval(tour, 3_600_000);
  minuteur.unref?.();
  setTimeout(tour, 60_000).unref?.();
}
