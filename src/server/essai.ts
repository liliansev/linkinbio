import { OFFRES, PLAN_ESSAI, planHorsEssai } from '../lib/abonnement.ts';
import { BLOCS_GRATUITS, ORIGINE_ADMIN } from '../lib/types.ts';
import * as db from './db.ts';
import type { Env } from './courriel.ts';
import { bouton, echapper, enveloppe, envoyer } from './courriel.ts';
import { config } from './creem.ts';
import { CONTACT_LEGAL } from '../lib/legal.ts';

/*
 * La fin de l'essai de Pro (25 octobre 2026, choisi par Lilian), par e-mail : trois jours avant, ce qui va
 * s'arrêter et le chemin vers Starter ; le jour venu, que la page reste en ligne en Gratuit et que rien n'est
 * effacé. Un seul e-mail par étape (`essai_rappel`), et aucun pour qui a pris une offre entre-temps ou s'en est
 * vu offrir une.
 */

const JOUR = 86_400_000;
/** Le premier e-mail part trois jours avant la fin ; le second, au plus tard une semaine après (un serveur arrêté ne l'envoie pas des mois plus tard). */
export const RAPPEL_AVANT = 3 * JOUR;
const FIN_TARDIVE = 7 * JOUR;

const dateLongue = (ms: number) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
const starter = `${OFFRES.starter.prix.mois} € par mois`;
/** Ce que Gratuit ne garde pas, en peu de mots. */
const PERTES = [`plus de ${BLOCS_GRATUITS} blocs`, 'la page sans la mention Hopla', 'tes couleurs et ton fond', 'ta vitrine', 'tes stats'];

export function courrielEssai(etape: 1 | 2, pseudo: string, fin: number, admin: string) {
  const pro = OFFRES[PLAN_ESSAI].nom;
  const pertes = PERTES.join(', ').replace(/, ([^,]*)$/, ' et $1');
  if (etape === 1) {
    const phrase = `Ton essai de Hopla ${pro} s’arrête le ${dateLongue(fin)}. Ensuite, ta page reste en ligne en Gratuit, mais sans ${pertes}.`;
    const suite = `Pour tout garder, Starter commence à ${starter}, sans engagement. Rien n’est effacé si tu ne fais rien : reprendre une offre plus tard remet tout en place.`;
    return {
      subject: `Ton essai Hopla ${pro} s’arrête dans 3 jours`,
      text: `Bonjour ${pseudo},\n\n${phrase}\n\n${suite}\n\nChoisir mon offre : ${admin}\n\nUne question ? Réponds à ce message.`,
      html: enveloppe(`<p>Bonjour ${echapper(pseudo)},</p><p>${phrase}</p><p>${suite}</p>${bouton(admin, 'Choisir mon offre')}<p style="color:#888;font-size:13px">Une question ? Réponds simplement à ce message.</p>`),
    };
  }
  const phrase = `Ton essai de Hopla ${pro} est fini. Ta page reste en ligne en Gratuit : ses ${BLOCS_GRATUITS} premiers blocs, avec la mention Hopla.`;
  const suite = `Tout ce que tu as réglé est gardé. Starter, à ${starter}, le remet en place aussitôt.`;
  return {
    subject: `Ton essai Hopla ${pro} est fini, ta page reste en ligne`,
    text: `Bonjour ${pseudo},\n\n${phrase}\n\n${suite}\n\nVoir les offres : ${admin}\n\nUne question ? Réponds à ce message.`,
    html: enveloppe(`<p>Bonjour ${echapper(pseudo)},</p><p>${phrase}</p><p>${suite}</p>${bouton(admin, 'Voir les offres')}<p style="color:#888;font-size:13px">Une question ? Réponds simplement à ce message.</p>`),
  };
}

/** Envoie les e-mails de fin d'essai dus. Renvoie le nombre d'e-mails partis. */
export async function envoyerFinsDEssai(env: Env, fetchImpl: typeof fetch, maintenant = Date.now()): Promise<number> {
  const admin = `${env.LIENS_ORIGINE_ADMIN || ORIGINE_ADMIN}/admin`;
  const etapes: [1 | 2, number, number][] = [[1, maintenant, maintenant + RAPPEL_AVANT], [2, maintenant - FIN_TARDIVE, maintenant]];
  let envoyes = 0;
  for (const [etape, de, a] of etapes) {
    for (const c of db.comptesEnFinDEssai(etape, de, a)) {
      // Une offre prise ou offerte entre-temps : l'essai ne laisse rien perdre, on ne relance pas.
      if (planHorsEssai(db.abonnement(c, maintenant)) !== 'gratuit' || !c.email) continue;
      // Le second e-mail dit tout : le premier ne part plus quand la fin est déjà passée.
      if (!db.reserverRappelEssai(c.id, etape)) continue;
      if (await envoyer(env, fetchImpl, { to: c.email, replyTo: CONTACT_LEGAL, ...courrielEssai(etape, c.pseudo, c.essai_jusqu!, admin) })) envoyes++;
    }
  }
  return envoyes;
}

let minuteur: ReturnType<typeof setInterval> | null = null;
/** Vérifie toutes les heures s'il y a des e-mails de fin d'essai à envoyer. Sans clé Resend ni Creem, rien ne part. */
export function planifierFinsDEssai(env: Env = process.env) {
  // Sans Creem, il n'y a pas d'offre à prendre : la fin d'un essai n'a rien à annoncer.
  if (minuteur || !env.RESEND_API_KEY || !config(env) || env.HOPLA_ESSAI_COURRIELS === '0') return;
  const tour = () => { envoyerFinsDEssai(env, fetch).catch(error => console.error('[liens] fins d’essai', (error as Error).message)); };
  minuteur = setInterval(tour, 3_600_000);
  minuteur.unref?.();
  setTimeout(tour, 90_000).unref?.();
}
