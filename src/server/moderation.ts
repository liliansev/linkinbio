import { PRINCIPAL, sansSchema } from '../lib/types.ts';
import type { Origines, Resiliation } from '../lib/types.ts';
import { CONTACT_LEGAL, MOTIFS_SIGNALEMENT, nomMotif } from '../lib/legal.ts';
import { ajouterSignalement, changerStatut, compteParId, compteParPseudo, signalementParId, signalementsDepuis, traiterSignalement } from './db.ts';
import { adresseAdmin } from './auth.ts';
import { echapper, envoyer, enveloppe } from './courriel.ts';
import type { Env } from './courriel.ts';
import { HEURE, cleIp, destinataireSature, limiteur } from './limites.ts';
import { supprimerAvecAbonnement } from './suppression.ts';

/*
 * La modération, telle que le règlement sur les services numériques la
 * demande à un hébergeur : un formulaire de signalement sur chaque page
 * (article 16), un accusé de réception et la décision à qui a signalé, et une
 * motivation envoyée au compte suspendu ou supprimé (article 17), qu'il peut
 * contester en répondant.
 */

export type Reponse = { ok: boolean; message: string };

/** Cinq signalements par heure depuis une même adresse IP (un /64 en IPv6). */
const parIp = limiteur([5, HEURE]);
const tropDeSignalements = (ip: string, maintenant: number) => parIp(cleIp(ip), maintenant);

export async function signaler(
  env: Env, fetchImpl: typeof fetch,
  entree: { page: unknown; motif: unknown; details: unknown; email: unknown; bonneFoi: unknown },
  ip: string, origines: Origines, maintenant = Date.now(),
): Promise<Reponse> {
  const page = typeof entree.page === 'string' ? entree.page.toLowerCase().slice(0, 40) : '';
  const compte = page ? compteParPseudo(page) : undefined;
  if (!compte || compte.id === PRINCIPAL) return { ok: false, message: 'Cette page n’existe pas.' };
  const motif = MOTIFS_SIGNALEMENT.some(([id]) => id === entree.motif) ? String(entree.motif) : '';
  if (!motif) return { ok: false, message: 'Choisis un motif.' };
  const details = typeof entree.details === 'string' ? entree.details.trim().slice(0, 2000) : '';
  if (details.length < 10) return { ok: false, message: 'Explique en quelques mots ce qui pose problème, et où sur la page.' };
  const email = typeof entree.email === 'string' ? entree.email.trim().toLowerCase().slice(0, 200) : '';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: 'Cette adresse e-mail ne semble pas valide.' };
  if (entree.bonneFoi !== true) return { ok: false, message: 'Coche la case de bonne foi pour envoyer le signalement.' };
  if (tropDeSignalements(ip, maintenant) || signalementsDepuis(maintenant - 86_400_000) >= 200) return { ok: false, message: 'Trop de signalements. Réessaie plus tard, ou écris à ' + CONTACT_LEGAL + '.' };

  ajouterSignalement({ compte: compte.id, motif, details, email }, maintenant);
  const lienPage = `${origines.page}/${compte.pseudo}`;
  await envoyer(env, fetchImpl, {
    to: adresseAdmin(env), replyTo: email || undefined,
    subject: `Signalement : ${compte.pseudo} (${nomMotif(motif)})`,
    html: enveloppe(`<p>Nouveau signalement sur <a href="${lienPage}">${echapper(compte.pseudo)}</a>.</p><p><strong>${echapper(nomMotif(motif))}</strong></p><p style="white-space:pre-wrap">${echapper(details)}</p><p>À traiter dans l’onglet Comptes du back office : <a href="${origines.admin}/admin">${sansSchema(origines.admin)}</a>.</p>`),
    text: `Nouveau signalement sur ${lienPage}\n${nomMotif(motif)}\n\n${details}\n\nÀ traiter dans l’onglet Comptes : ${origines.admin}/admin`,
  });
  // L'adresse de l'accusé de réception est tapée par n'importe qui : passé la limite, il ne part pas (le signalement, lui, est gardé).
  if (email && !destinataireSature(email, maintenant)) {
    await envoyer(env, fetchImpl, {
      to: email, replyTo: CONTACT_LEGAL,
      subject: 'Ton signalement est bien reçu',
      html: enveloppe(`<p>Bonjour,</p><p>Ton signalement de la page <a href="${lienPage}">${echapper(sansSchema(lienPage))}</a> (${echapper(nomMotif(motif))}) est bien reçu. Il sera examiné par une personne, et tu recevras la décision à cette adresse.</p>`),
      text: `Ton signalement de ${lienPage} (${nomMotif(motif)}) est bien reçu. Il sera examiné par une personne, et tu recevras la décision à cette adresse.`,
    });
  }
  return { ok: true, message: email ? 'Merci. Le signalement est envoyé, et tu recevras la décision par e-mail.' : 'Merci. Le signalement est envoyé et sera examiné par une personne.' };
}

/** Ce que devient l'abonnement d'un compte supprimé, dit à la personne. */
const ABONNEMENT_SUPPRIME: Record<Resiliation, string> = {
  aucune: '',
  faite: ' Ton abonnement s’arrête avec : plus aucun paiement ne sera prélevé. Tes factures restent chez Creem.',
  'a-la-main': ' Ton abonnement s’arrête avec : nous le résilions à la main, et un paiement prélevé d’ici là te sera remboursé. Tes factures restent chez Creem.',
};

/**
 * La motivation envoyée au compte (DSA, article 17) : ce qui a été décidé, pourquoi, et comment contester.
 * Une suppression dit aussi ce qu'il advient de l'abonnement, quand il y en avait un.
 */
export async function motiver(env: Env, fetchImpl: typeof fetch, compte: { email: string; pseudo: string }, action: 'suspendu' | 'supprime', motif: string, resiliation: Resiliation = 'aucune'): Promise<boolean> {
  if (!compte.email || !motif.trim()) return false;
  const quoi = action === 'suspendu' ? 'Ta page Hopla est suspendue' : 'Ton compte Hopla est supprimé';
  const suite = action === 'suspendu'
    ? 'Ta page n’est plus visible et tu ne peux plus te connecter au back office. Tes données sont conservées : si la décision est levée, tout revient tel quel.'
    : `Ta page, tes liens, tes images et tes statistiques sont effacés.${ABONNEMENT_SUPPRIME[resiliation]}`;
  return envoyer(env, fetchImpl, {
    to: compte.email, replyTo: CONTACT_LEGAL,
    subject: quoi,
    html: enveloppe(`<p>Bonjour,</p><p>${quoi} (pseudo « ${echapper(compte.pseudo)} »).</p><p><strong>Motif :</strong></p><p style="white-space:pre-wrap">${echapper(motif.trim())}</p><p>${suite}</p><p>Cette décision a été prise par une personne, au regard des conditions générales d’utilisation de Hopla. Tu peux la contester en répondant simplement à ce message : ta réponse sera examinée et tu recevras une décision motivée.</p>`),
    text: `${quoi} (pseudo « ${compte.pseudo} »).\n\nMotif :\n${motif.trim()}\n\n${suite}\n\nCette décision a été prise par une personne, au regard des conditions générales d’utilisation de Hopla. Tu peux la contester en répondant à ce message.`,
  });
}

/** Suspend ou réactive un compte ; une suspension part avec sa motivation. */
export async function changerStatutMotive(env: Env, fetchImpl: typeof fetch, id: string, statut: 'actif' | 'suspendu', motif: string) {
  const compte = compteParId(id);
  if (!compte || compte.id === PRINCIPAL) throw new Error('Compte introuvable.');
  if (statut === 'suspendu' && !motif.trim()) throw new Error('Indique le motif : il est envoyé à la personne.');
  changerStatut(id, statut);
  if (statut === 'suspendu' && compte.statut !== 'suspendu') await motiver(env, fetchImpl, compte, 'suspendu', motif);
}

/**
 * Supprime un compte, son abonnement résilié d'abord (voir `suppression.ts`) ; si un motif est donné, la
 * personne le reçoit (une suppression demandée par elle n'en a pas besoin). Ce qu'il advient de l'abonnement.
 */
export async function supprimerMotive(env: Env, fetchImpl: typeof fetch, id: string, motif: string, maintenant = Date.now()): Promise<Resiliation> {
  const compte = compteParId(id);
  if (!compte || compte.id === PRINCIPAL) throw new Error('Compte introuvable.');
  const issue = await supprimerAvecAbonnement(env, fetchImpl, compte, maintenant);
  if (!issue.ok) throw new Error(`Creem n’a pas résilié l’abonnement de ${compte.pseudo}, alors le compte n’est pas supprimé. Réessaie : si Creem échoue encore, le compte sera supprimé et tu recevras par e-mail de quoi résilier l’abonnement à la main.`);
  if (motif.trim()) await motiver(env, fetchImpl, compte, 'supprime', motif, issue.resiliation);
  return issue.resiliation;
}

/** Classe un signalement, ou suspend la page ; la personne qui l'a envoyé reçoit la décision si elle a laissé son adresse. */
export async function traiter(env: Env, fetchImpl: typeof fetch, id: string, statut: 'sans-suite' | 'suspendu', decision: string, origine: string) {
  const s = signalementParId(id);
  if (!s || s.statut !== 'ouvert') throw new Error('Signalement introuvable ou déjà traité.');
  const texte = decision.trim() || (statut === 'sans-suite' ? 'Après examen, la page ne nous paraît pas enfreindre la loi ni nos conditions d’utilisation.' : '');
  if (statut === 'suspendu') await changerStatutMotive(env, fetchImpl, s.compte, 'suspendu', texte || `Signalement : ${nomMotif(s.motif)}.`);
  traiterSignalement(id, statut, texte);
  if (s.email) {
    const issue = statut === 'suspendu' ? 'La page a été suspendue.' : 'La page reste en ligne.';
    await envoyer(env, fetchImpl, {
      to: s.email, replyTo: CONTACT_LEGAL,
      subject: 'La décision sur ton signalement',
      html: enveloppe(`<p>Bonjour,</p><p>Ton signalement de la page ${echapper(`${sansSchema(origine)}/${s.pseudo}`)} a été examiné. ${issue}</p>${texte ? `<p style="white-space:pre-wrap">${echapper(texte)}</p>` : ''}<p>Tu peux contester cette décision en répondant à ce message.</p>`),
      text: `Ton signalement de ${origine}/${s.pseudo} a été examiné. ${issue}\n\n${texte}\n\nTu peux contester cette décision en répondant à ce message.`,
    });
  }
}
