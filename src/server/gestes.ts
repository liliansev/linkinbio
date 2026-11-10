import { PRINCIPAL, sansSchema } from '../lib/types.ts';
import type { Origines } from '../lib/types.ts';
import type { DureeOfferte, PlanPayant } from '../lib/abonnement.ts';
import { OFFRES, avantage, nomOffre, apresAbonnement, apresOffre, avantagesEntre, effetOffert, estResilie, finOfferte, rang } from '../lib/abonnement.ts';
import { CONTACT_LEGAL } from '../lib/legal.ts';
import { abonnement, compteParId, lireReglages, offrir, retirerOffre, titulaire } from './db.ts';
import type { Compte } from './db.ts';
import { resilierEnFinDePeriode } from './creem.ts';
import { bouton, echapper, envoyer, enveloppe } from './courriel.ts';
import type { Env } from './courriel.ts';

/*
 * Les gestes de Lilian sur l'abonnement d'un compte, depuis l'onglet Comptes (23 octobre 2026) : résilier
 * l'abonnement pour la fin de la période payée, offrir une offre (Starter ou Pro, pour une durée ou sans fin,
 * sans rien facturer ni toucher à Creem), ou la retirer. Résilier et offrir préviennent la personne par
 * e-mail, avec le mot de Lilian s'il en laisse un ; elle répond à l'adresse de contact.
 */

export type Reponse = { ok: boolean; message: string };

const dateLongue = (ms: number) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
const dateEn = (ms: number) => new Date(ms).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });

/** La langue de la page d'un compte : l'e-mail qui le prévient la parle (8 novembre 2026). Les messages à Lilian restent en français. */
function langueDe(compte: string): 'fr' | 'en' {
  try { return lireReglages(compte).langue === 'en' ? 'en' : 'fr'; } catch { return 'fr'; }
}

/** Le compte d'un geste : jamais le principal, qui n'a pas d'abonnement ; pour une page en plus, le compte à qui elle est. */
function compteDuGeste(id: string): Compte {
  const page = compteParId(id);
  const compte = page && titulaire(page);
  if (!compte || compte.id === PRINCIPAL) throw new Error('Compte introuvable.');
  return compte;
}

/** Le mot de Lilian, tel qu'il part dans l'e-mail : un paragraphe à lui, avant le reste. */
const motHtml = (mot: string) => (mot.trim() ? `<p style="white-space:pre-wrap">${echapper(mot.trim())}</p>` : '');
const motTexte = (mot: string) => (mot.trim() ? `${mot.trim()}\n\n` : '');

/**
 * Résilie l'abonnement d'un compte pour la fin de la période payée, comme « Repasser en Gratuit » le fait
 * pour la personne elle-même : l'offre court jusque-là, plus rien n'est prélevé ensuite, rien n'est effacé.
 * Creem ne rembourse rien de lui-même : un remboursement se fait dans son tableau de bord.
 */
export async function resilierPourLeCompte(env: Env, fetchImpl: typeof fetch, id: string, mot: string, maintenant = Date.now()): Promise<Reponse> {
  const compte = compteDuGeste(id);
  const avant = abonnement(compte, maintenant);
  if (avant.payee === 'gratuit') throw new Error(`${compte.pseudo} n’a pas d’abonnement à résilier.`);
  const nom = OFFRES[avant.payee].nom;
  if (estResilie(compte.abonnement_statut)) {
    return { ok: true, message: `L’abonnement ${nom} de ${compte.pseudo} est déjà résilié${avant.finPeriode ? ` : il s’arrête le ${dateLongue(avant.finPeriode)}` : ''}.` };
  }
  await resilierEnFinDePeriode(env, fetchImpl, compte, maintenant);
  const apres = abonnement(compteParId(id)!, maintenant);
  const fin = apres.finPeriode;
  const quand = fin ? `le ${dateLongue(fin)}` : 'à la fin de la période payée';
  // Une offre offerte qui court encore après la période payée prend la suite : la personne le lit aussi.
  const suite = apresAbonnement(apres, fin);
  const ensuite = suite === 'gratuit' || !apres.offerte ? '' : ` Ensuite, ta page garde ${OFFRES[suite].nom}, offert ${apres.offerte.jusqu ? `jusqu’au ${dateLongue(apres.offerte.jusqu)}` : 'sans limite de durée'}.`;
  const en = langueDe(compte.id) === 'en';
  const nomEn = nomOffre(avant.payee, 'en');
  const quandEn = fin ? `on ${dateEn(fin)}` : 'at the end of the paid period';
  const ensuiteEn = suite === 'gratuit' || !apres.offerte ? '' : ` After that, your page keeps ${nomOffre(suite, 'en')}, free ${apres.offerte.jusqu ? `until ${dateEn(apres.offerte.jusqu)}` : 'with no end date'}.`;
  const parti = await envoyer(env, fetchImpl, en ? {
    to: compte.email, replyTo: CONTACT_LEGAL,
    subject: 'Your Hopla subscription is canceled',
    html: enveloppe(`<p>Hi,</p><p>Your Hopla ${nomEn} subscription is canceled.</p>${motHtml(mot)}<p>Your ${nomEn} plan runs until the end of what you paid for, and stops ${quandEn}: nothing more will be charged.${ensuiteEn} Nothing is removed from your page, and picking a plan again brings everything back.</p><p style="color:#666;font-size:14px">Your invoices stay with Creem. Any question? Just reply to this email.</p>`),
    text: `Your Hopla ${nomEn} subscription is canceled.\n\n${motTexte(mot)}Your ${nomEn} plan stops ${quandEn}: nothing more will be charged.${ensuiteEn} Nothing is removed from your page.\n\nYour invoices stay with Creem. Any question? Reply to this email.`,
  } : {
    to: compte.email, replyTo: CONTACT_LEGAL,
    subject: 'Ton abonnement Hopla est résilié',
    html: enveloppe(`<p>Bonjour,</p><p>Ton abonnement Hopla ${nom} est résilié.</p>${motHtml(mot)}<p>Ton offre ${nom} court jusqu’au bout de ce que tu as payé, et s’arrête ${quand} : plus rien ne sera prélevé.${ensuite} Rien n’est effacé de ta page, et reprendre une offre remet tout en place.</p><p style="color:#666;font-size:14px">Tes factures restent chez Creem. Une question ? Réponds simplement à ce message.</p>`),
    text: `Ton abonnement Hopla ${nom} est résilié.\n\n${motTexte(mot)}Ton offre ${nom} s’arrête ${quand} : plus rien ne sera prélevé.${ensuite} Rien n’est effacé de ta page.\n\nTes factures restent chez Creem. Une question ? Réponds à ce message.`,
  });
  return {
    ok: true,
    message: `L’abonnement ${nom} de ${compte.pseudo} est résilié : il s’arrête ${quand}. ${parti ? 'La personne est prévenue par e-mail.' : 'L’e-mail qui la prévient n’est pas parti : préviens-la toi-même.'}`,
  };
}

/**
 * Offre une offre à un compte, sans paiement, pour une durée ou sans fin : elle s'applique tout de suite et
 * remplace l'offre offerte d'avant. Un abonnement Creem continue d'être prélevé : le résilier est un autre geste.
 * Après un abonnement résilié, elle prend sa suite : la personne garde son offre, ou passe à celle-ci, sans payer.
 */
export async function offrirAuCompte(env: Env, fetchImpl: typeof fetch, origines: Origines, id: string, plan: PlanPayant, duree: DureeOfferte, mot: string, maintenant = Date.now()): Promise<Reponse> {
  const compte = compteDuGeste(id);
  if (compte.statut !== 'actif') throw new Error(`Réactive ${compte.pseudo} avant de lui offrir une offre.`);
  if (!OFFRES[plan].enVente) throw new Error(`${OFFRES[plan].nom} n’est pas encore en vente.`);
  const avant = abonnement(compte, maintenant);
  const nom = OFFRES[plan].nom;
  const paye = OFFRES[avant.payee].nom;
  const jusqu = finOfferte(maintenant, duree);
  const effet = effetOffert(avant, plan, jusqu);
  const finPayee = avant.finPeriode ? `le ${dateLongue(avant.finPeriode)}` : 'à la fin de la période payée';
  if (!effet) {
    throw new Error(estResilie(avant.statut)
      ? `L’abonnement ${paye} de ${compte.pseudo} court jusqu’au ${avant.finPeriode ? dateLongue(avant.finPeriode) : 'bout de la période payée'} : une offre qui finit avant ne lui donnerait rien.`
      : `${compte.pseudo} paie déjà ${paye} : offrir ${nom} ne lui donnerait rien de plus.`);
  }
  offrir(compte.id, plan, jusqu, maintenant);
  const pendant = jusqu ? `jusqu’au ${dateLongue(jusqu)}` : 'sans limite de durée';
  // Ce que l'offre ouvre de plus que ce que la page a déjà, offert ou payé : rien quand elle prend la suite d'un abonnement.
  const ouvre = effet === 'maintenant' && rang(plan) > rang(avant.plan) ? avantagesEntre(avant.plan, plan) : [];
  const page = `${origines.page}/${compte.pseudo}`;
  const intro = (lien: string) => (effet === 'maintenant'
    ? `Lilian Sevoumian t’offre Hopla ${nom}, ${pendant}, pour ta page ${lien}. C’est déjà actif : rien à payer, aucune carte à donner.`
    : `Ton abonnement Hopla ${paye} s’arrête ${finPayee}, et plus rien ne sera prélevé. Ensuite, Lilian Sevoumian t’offre Hopla ${nom}, ${pendant}, pour ta page ${lien} : rien à payer, aucune carte à donner.`);
  const ensuite = jusqu ? `Le ${dateLongue(jusqu)}, ta page repassera en ${OFFRES[apresOffre({ ...avant, offerte: { plan, jusqu } })].nom}, sans rien perdre de son contenu.` : '';
  const en = langueDe(compte.id) === 'en';
  const nomEn = nomOffre(plan, 'en');
  const pendantEn = jusqu ? `until ${dateEn(jusqu)}` : 'with no end date';
  const finPayeeEn = avant.finPeriode ? `on ${dateEn(avant.finPeriode)}` : 'at the end of the paid period';
  const introEn = (lien: string) => (effet === 'maintenant'
    ? `Lilian Sevoumian is giving you Hopla ${nomEn}, ${pendantEn}, for your page ${lien}. It’s already active: nothing to pay, no card needed.`
    : `Your Hopla ${nomOffre(avant.payee, 'en')} subscription stops ${finPayeeEn}, and nothing more will be charged. After that, Lilian Sevoumian is giving you Hopla ${nomEn}, ${pendantEn}, for your page ${lien}: nothing to pay, no card needed.`);
  const ensuiteEn = jusqu ? `On ${dateEn(jusqu)}, your page will go back to ${nomOffre(apresOffre({ ...avant, offerte: { plan, jusqu } }), 'en')}, without losing any of its content.` : '';
  const ouvreEn = ouvre.map(a => avantage(a, 'en'));
  const parti = await envoyer(env, fetchImpl, en ? {
    to: compte.email, replyTo: CONTACT_LEGAL,
    subject: `Hopla ${nomEn} is on us`,
    html: enveloppe(`<p>Hi,</p><p>${introEn(`<a href="${page}">${echapper(sansSchema(page))}</a>`)}</p>${motHtml(mot)}${ouvreEn.length ? `<p>What ${nomEn} unlocks:</p><ul>${ouvreEn.map(a => `<li>${echapper(a)}</li>`).join('')}</ul>` : ''}${bouton(`${origines.admin}/admin`, 'Open my dashboard')}${ensuiteEn ? `<p style="color:#666;font-size:14px">${ensuiteEn}</p>` : ''}`),
    text: `${introEn(page)}\n\n${motTexte(mot)}${ouvreEn.length ? `What ${nomEn} unlocks:\n${ouvreEn.map(a => `- ${a}`).join('\n')}\n\n` : ''}Your dashboard: ${origines.admin}/admin${ensuiteEn ? `\n\n${ensuiteEn}` : ''}`,
  } : {
    to: compte.email, replyTo: CONTACT_LEGAL,
    subject: `Hopla ${nom} t’est offert`,
    html: enveloppe(`<p>Bonjour,</p><p>${intro(`<a href="${page}">${echapper(sansSchema(page))}</a>`)}</p>${motHtml(mot)}${ouvre.length ? `<p>Ce que ${nom} t’ouvre :</p><ul>${ouvre.map(a => `<li>${echapper(a)}</li>`).join('')}</ul>` : ''}${bouton(`${origines.admin}/admin`, 'Ouvrir mon back office')}${ensuite ? `<p style="color:#666;font-size:14px">${ensuite}</p>` : ''}`),
    text: `${intro(page)}\n\n${motTexte(mot)}${ouvre.length ? `Ce que ${nom} t’ouvre :\n${ouvre.map(a => `- ${a}`).join('\n')}\n\n` : ''}Ton back office : ${origines.admin}/admin${ensuite ? `\n\n${ensuite}` : ''}`,
  });
  const fait = effet === 'maintenant' ? `${compte.pseudo} a ${nom}, offert ${pendant}.` : `Après son abonnement, qui s’arrête ${finPayee}, ${compte.pseudo} ${plan === avant.payee ? 'garde' : 'passe en'} ${nom}, offert ${pendant}.`;
  return { ok: true, message: `${fait} ${parti ? 'La personne est prévenue par e-mail.' : 'L’e-mail qui la prévient n’est pas parti : préviens-la toi-même.'}` };
}

/** Retire l'offre offerte : la page repasse tout de suite à ce qu'elle paie, ou en Gratuit, sans rien effacer. Aucun e-mail ne part. */
export function retirerAuCompte(id: string, maintenant = Date.now()): Reponse {
  const compte = compteDuGeste(id);
  const avant = abonnement(compte, maintenant);
  if (!avant.offerte) throw new Error(`${compte.pseudo} n’a pas d’offre offerte.`);
  retirerOffre(compte.id);
  const nom = OFFRES[avant.offerte.plan].nom;
  // Sous l'abonnement, l'offre ne faisait que prendre sa suite : la page ne change pas aujourd'hui.
  if (rang(avant.offerte.plan) <= rang(avant.payee)) return { ok: true, message: `${compte.pseudo} n’a plus ${nom} offert. Son abonnement ${OFFRES[avant.payee].nom} ne change pas.` };
  return { ok: true, message: `${compte.pseudo} n’a plus ${nom} offert : sa page repasse en ${OFFRES[avant.payee].nom}.` };
}
