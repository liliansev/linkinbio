import type { Resiliation } from '../lib/types.ts';
import type { Compte } from './db.ts';
import { supprimerCompte } from './db.ts';
import { adresseAdmin } from './auth.ts';
import { echapper, envoyer, enveloppe } from './courriel.ts';
import type { Env } from './courriel.ts';
import { aResilier, resilierAvantSuppression } from './creem.ts';

/*
 * Supprimer un compte, à la demande de la personne (Réglages) ou de Lilian
 * (Comptes) : son abonnement Creem est résilié d'abord, tout de suite, pour
 * qu'aucun paiement ne parte plus pour une page qui n'existe plus.
 *
 * Si Creem ne répond pas, rien n'est supprimé et on le dit : un nouvel essai
 * suffit d'ordinaire. Mais le droit à l'effacement ne dépend pas de Creem : au
 * deuxième échec de suite (dans la journée), le compte est supprimé quand même,
 * et Lilian reçoit par e-mail (et dans le journal du serveur) de quoi résilier
 * l'abonnement à la main. Un abonnement déjà résilié pour la fin de sa période
 * ne prélèvera plus rien : son échec ne retient pas la suppression.
 */

/** Le dernier échec de résiliation de chaque compte : au suivant, dans la journée, on supprime quand même. */
const echecs = new Map<string, number>();
const UN_JOUR = 86_400_000;

export type IssueSuppression = { ok: true; resiliation: Resiliation } | { ok: false };

export async function supprimerAvecAbonnement(env: Env, fetchImpl: typeof fetch, compte: Compte, maintenant = Date.now()): Promise<IssueSuppression> {
  let resiliation: Resiliation = 'aucune';
  let erreur = '';
  if (aResilier(compte)) {
    try {
      resiliation = (await resilierAvantSuppression(env, fetchImpl, compte)) ? 'faite' : 'aucune';
      echecs.delete(compte.id);
    } catch (error) {
      erreur = (error as Error).message;
      // Déjà résilié pour la fin de la période : plus rien ne sera prélevé, la suppression n'attend pas Creem.
      if (compte.abonnement_statut === 'scheduled_cancel') {
        console.error('[liens] résiliation immédiate refusée, celle de fin de période tient', compte.pseudo, compte.creem_abonnement, erreur);
      } else {
        const avant = echecs.get(compte.id);
        if (avant === undefined || maintenant - avant > UN_JOUR) {
          if (echecs.size > 1000) echecs.clear();
          echecs.set(compte.id, maintenant);
          return { ok: false };
        }
        echecs.delete(compte.id);
        resiliation = 'a-la-main';
      }
    }
  }
  supprimerCompte(compte.id);
  if (resiliation === 'a-la-main') await prevenirLilian(env, fetchImpl, compte, erreur);
  return { ok: true, resiliation };
}

const dateLongue = (ms: number) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });

/**
 * Ce qu'il faut pour résilier à la main, dans le tableau de bord de Creem : l'abonnement, le client, la prochaine
 * échéance. Pas l'adresse e-mail : Creem la connaît, et la politique de confidentialité ne promet que le pseudo et
 * les identifiants Creem.
 */
async function prevenirLilian(env: Env, fetchImpl: typeof fetch, compte: Compte, erreur: string) {
  console.error('[liens] abonnement à résilier à la main', compte.pseudo, compte.creem_abonnement, compte.creem_client, erreur);
  const lignes = [
    `Le compte ${compte.pseudo} est supprimé, mais Creem n’a pas confirmé la résiliation de son abonnement, deux fois de suite.`,
    `Résilie-le à la main dans Creem (Subscriptions), avant sa prochaine échéance : ${compte.fin_periode ? dateLongue(compte.fin_periode) : 'date inconnue'}. Un prélèvement parti d’ici là est à rembourser.`,
    `Abonnement : ${compte.creem_abonnement}`,
    `Client : ${compte.creem_client || 'inconnu'}`,
    `Statut connu : ${compte.abonnement_statut || 'inconnu'}`,
    `Erreur : ${erreur || 'inconnue'}`,
  ];
  await envoyer(env, fetchImpl, {
    to: adresseAdmin(env),
    subject: `Abonnement à résilier à la main : ${compte.pseudo}`,
    html: enveloppe(lignes.map(l => `<p>${echapper(l)}</p>`).join('')),
    text: lignes.join('\n'),
  });
}
