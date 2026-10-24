import test from 'node:test';
import assert from 'node:assert/strict';
import { ACCROCHES, BASCULE_OFFRES, FONCTIONS, FONCTIONS_EN_MOTS, OFFRES, PLANS, PLANS_PAYANTS, accesAbonnement, apresAbonnement, apresOffre, avantagesEntre, echeance, economie, economieAnnuelle, effetOffert, estDureeOfferte, euros, finOfferte, joursStats, libellePrix, moisOfferts, offerteAuDessus, offreSuivante, offresAOffrir, parMoisAnnuel, peut, sensDuChangement } from './abonnement.ts';
import type { Fonction, OffreOfferte, Plan, PlanPayant } from './abonnement.ts';
import { avecEssai, enEssai, nouvellesDates, sansEssai, selonDroits } from './droits.ts';
import type { Droits } from './droits.ts';
import { LEGAL } from './legal.ts';
import { SANS_COULEURS, nouveauBloc } from './types.ts';
import { REGLAGES_DEFAUT } from './defauts.ts';
import { composerMoment } from './moments.ts';

test('les prix s’écrivent à la française', () => {
  assert.equal(euros(9), '9\u00a0€');
  assert.equal(euros(86.4), '86,40\u00a0€');
  assert.equal(libellePrix('starter', 'mois'), '9\u00a0€ par mois');
  assert.equal(libellePrix('pro', 'mois'), '19\u00a0€ par mois');
  assert.equal(libellePrix('pro', 'an'), '169\u00a0€ par an');
});

test('chaque offre coûte plus que la précédente, et l’annuel revient moins cher que douze mois', () => {
  for (const [i, p] of PLANS_PAYANTS.entries()) {
    const o = OFFRES[p];
    assert.ok(o.prix.an < o.prix.mois * 12, p);
    assert.ok(economie(p) > 0 && economie(p) < 50, p);
    if (i) assert.ok(o.prix.mois > OFFRES[PLANS_PAYANTS[i - 1]].prix.mois, p);
  }
  assert.equal(economie('starter'), 27);
  assert.equal(economie('pro'), 26);
  assert.equal(parMoisAnnuel('starter'), 6.58);
  assert.equal(parMoisAnnuel('pro'), 14.08);
  // Chaque offre lit au moins l'historique et la place de la précédente.
  for (let i = 1; i < PLANS.length; i++) {
    assert.ok(OFFRES[PLANS[i]].jours >= OFFRES[PLANS[i - 1]].jours);
    assert.ok(OFFRES[PLANS[i]].quota > OFFRES[PLANS[i - 1]].quota);
  }
  assert.equal(OFFRES.premium.enVente, false);
});

test('l’annuel : l’économie réelle en euros, et les mois offerts', () => {
  assert.equal(economieAnnuelle('starter'), 29);
  assert.equal(economieAnnuelle('pro'), 59);
  assert.equal(economieAnnuelle('premium'), 89);
  for (const p of PLANS_PAYANTS) {
    assert.equal(economieAnnuelle(p), OFFRES[p].prix.mois * 12 - OFFRES[p].prix.an, p);
    assert.equal(moisOfferts(p), 3, p);
  }
});

test('chaque fonction réservée se lit, mot pour mot, dans les avantages de son offre', () => {
  for (const f of Object.keys(FONCTIONS) as Fonction[]) {
    assert.ok(OFFRES[FONCTIONS[f]].avantages.includes(FONCTIONS_EN_MOTS[f].avantage), f);
    assert.match(FONCTIONS_EN_MOTS[f].pour, /^Pour /, f);
    // La pastille tient à côté du nom de l'offre, sur une carte de la grille du bureau.
    assert.ok(FONCTIONS_EN_MOTS[f].pour.length <= 20, f);
  }
});

test('ce qu’on gagne d’une offre à l’autre, dans les deux sens', () => {
  assert.deepEqual(avantagesEntre('gratuit', 'starter'), OFFRES.starter.avantages);
  assert.deepEqual(avantagesEntre('gratuit', 'pro'), [...OFFRES.starter.avantages, ...OFFRES.pro.avantages]);
  assert.deepEqual(avantagesEntre('pro', 'starter'), OFFRES.pro.avantages);
  assert.deepEqual(avantagesEntre('starter', 'starter'), []);
});

test('la prochaine échéance : un mois ou un an plus tard, le même jour ou le dernier du mois', () => {
  const jour = (a: number, m: number, j: number) => new Date(a, m - 1, j, 10).getTime();
  const lu = (t: number) => { const d = new Date(t); return [d.getFullYear(), d.getMonth() + 1, d.getDate()]; };
  assert.deepEqual(lu(echeance(jour(2026, 10, 20), 'an')), [2027, 10, 20]);
  assert.deepEqual(lu(echeance(jour(2026, 10, 20), 'mois')), [2026, 11, 20]);
  assert.deepEqual(lu(echeance(jour(2026, 1, 31), 'mois')), [2026, 2, 28]);
  assert.deepEqual(lu(echeance(jour(2028, 2, 29), 'an')), [2029, 2, 28]);
  assert.deepEqual(lu(echeance(jour(2026, 12, 15), 'mois')), [2027, 1, 15]);
});

test('une offre offerte : sa fin, ce qu’on peut offrir, et ce que la page a ensuite', () => {
  const jour = (a: number, m: number, j: number) => new Date(a, m - 1, j, 10).getTime();
  const lu = (t: number | null) => { const d = new Date(t!); return [d.getFullYear(), d.getMonth() + 1, d.getDate()]; };
  assert.deepEqual(lu(finOfferte(jour(2026, 1, 31), '1m')), [2026, 2, 28]);
  assert.deepEqual(lu(finOfferte(jour(2026, 10, 23), '3m')), [2027, 1, 23]);
  assert.deepEqual(lu(finOfferte(jour(2026, 10, 23), '1a')), [2027, 10, 23]);
  assert.equal(finOfferte(jour(2026, 10, 23), 'toujours'), null);
  assert.ok(estDureeOfferte('3m'));
  for (const v of ['2m', '', null, undefined, 3]) assert.ok(!estDureeOfferte(v), String(v));
  // Ce qui est en vente au-dessus de ce qu'on paie : jamais Premium, qui n'est pas en vente.
  assert.deepEqual(offresAOffrir({ payee: 'gratuit', statut: '' }), ['starter', 'pro']);
  assert.deepEqual(offresAOffrir({ payee: 'starter', statut: 'active' }), ['pro']);
  assert.deepEqual(offresAOffrir({ payee: 'pro', statut: 'active' }), []);
  // Un abonnement résilié : l'offre offerte prendra sa suite, la même ou une autre.
  assert.deepEqual(offresAOffrir({ payee: 'pro', statut: 'scheduled_cancel' }), ['starter', 'pro']);
  // Elle passe devant l'abonnement quand elle est au-dessus, et seulement alors.
  const fin = jour(2026, 12, 1);
  const actif = { payee: 'starter' as const, statut: 'active', finPeriode: fin };
  const resilie = { ...actif, statut: 'scheduled_cancel' };
  assert.equal(effetOffert(actif, 'pro', fin - 1), 'maintenant');
  assert.equal(effetOffert(actif, 'starter', null), null, 'offrir ce qu’on paie ne donne rien');
  assert.equal(effetOffert(resilie, 'starter', fin + 1), 'ensuite', 'après une résiliation, elle prend la suite');
  assert.equal(effetOffert(resilie, 'starter', null), 'ensuite');
  assert.equal(effetOffert(resilie, 'starter', fin), null, 'une offre qui finit avec l’abonnement ne donne rien');
  assert.equal(effetOffert({ ...resilie, finPeriode: null }, 'starter', fin), 'ensuite', 'sans la fin connue, on laisse faire');
  const starter: OffreOfferte = { plan: 'starter', jusqu: fin };
  const pro: OffreOfferte = { plan: 'pro', jusqu: fin };
  assert.equal(offerteAuDessus({ payee: 'gratuit', offerte: starter }), starter);
  assert.equal(offerteAuDessus({ payee: 'starter', offerte: starter }), null);
  assert.equal(offerteAuDessus({ payee: 'pro', offerte: starter }), null);
  assert.equal(offerteAuDessus({ payee: 'gratuit', offerte: null }), null);
  // Un abonnement qui s'arrête : l'offre offerte qui court encore ce jour-là prend la suite, sinon Gratuit.
  assert.equal(apresAbonnement({ offerte: null }, fin), 'gratuit');
  assert.equal(apresAbonnement({ offerte: { plan: 'pro', jusqu: null } }, fin), 'pro');
  assert.equal(apresAbonnement({ offerte: { plan: 'pro', jusqu: fin + 1 } }, fin), 'pro');
  assert.equal(apresAbonnement({ offerte: { plan: 'pro', jusqu: fin - 1 } }, fin), 'gratuit');
  assert.equal(apresAbonnement({ offerte: pro }, null), 'gratuit', 'sans la fin de la période, on ne promet rien');
  // L'offre offerte qui finit : la page garde ce qu'elle paie encore ce jour-là.
  assert.equal(apresOffre({ payee: 'gratuit', statut: '', finPeriode: null, offerte: pro }), 'gratuit');
  assert.equal(apresOffre({ payee: 'starter', statut: 'active', finPeriode: fin - 10, offerte: pro }), 'starter', 'un abonnement actif se renouvelle');
  assert.equal(apresOffre({ payee: 'starter', statut: 'scheduled_cancel', finPeriode: fin - 10, offerte: pro }), 'gratuit');
  assert.equal(apresOffre({ payee: 'starter', statut: 'scheduled_cancel', finPeriode: fin + 10, offerte: pro }), 'starter');
  assert.equal(apresOffre({ payee: 'starter', statut: 'active', finPeriode: fin, offerte: { plan: 'pro', jusqu: null } }), 'starter');
});

test('une fonction se débloque avec son offre et celles du dessus', () => {
  // Gratuit : des liens sans limite, la page selon le réseau et les thèmes, rien de réservé.
  for (const f of Object.keys(FONCTIONS) as (keyof typeof FONCTIONS)[]) assert.equal(peut('gratuit', f), false, f);
  for (const f of ['sansMention', 'vitrine', 'couleurs', 'programmation', 'avis', 'stats'] as const) assert.equal(peut('starter', f), true, f);
  for (const f of ['heure', 'drops', 'listeEmail'] as const) {
    assert.equal(peut('starter', f), false, f);
    assert.equal(peut('pro', f), true, f);
  }
  assert.equal(peut('premium', 'listeEmail'), true);
});

test('une page d’avant les offres garde tout, sauf la page sans mention et la vitrine, venue après', () => {
  const avant = BASCULE_OFFRES - 86_400_000;
  for (const f of ['drops', 'couleurs', 'programmation', 'heure', 'stats', 'avis', 'listeEmail'] as const) assert.equal(peut('gratuit', f, avant), true, f);
  assert.equal(peut('gratuit', 'sansMention', avant), false);
  assert.equal(peut('gratuit', 'vitrine', avant), false);
  assert.equal(peut('starter', 'vitrine', avant), true);
  assert.equal(peut('gratuit', 'drops', BASCULE_OFFRES + 1), false);
  assert.equal(peut('gratuit', 'programmation', BASCULE_OFFRES + 1), false);
});

test('les jours de stats : aucun en Gratuit, 30 en Starter, un an en Pro, 7 pour une page d’avant les offres', () => {
  assert.equal(joursStats('gratuit', false), 0);
  assert.equal(joursStats('starter', true), 30);
  assert.equal(joursStats('pro', true), 365);
  assert.equal(joursStats('premium', true), 365);
  // Une page d'avant les offres a le droit aux stats sans abonnement : elle garde ses sept jours.
  assert.equal(joursStats('gratuit', peut('gratuit', 'stats', BASCULE_OFFRES - 1)), 7);
  assert.equal(joursStats('gratuit', peut('gratuit', 'stats', BASCULE_OFFRES + 1)), 0);
});

const RIEN = Object.fromEntries(Object.keys(FONCTIONS).map(f => [f, false])) as Droits;
const TOUT = Object.fromEntries(Object.keys(FONCTIONS).map(f => [f, true])) as Droits;
const CRENEAU = { jours: [1], de: '09:00', a: '12:00', fuseau: 'Europe/Paris', effet: 'afficher' as const };

test('ce que l’offre ne comprend pas s’efface de la page, sans rien perdre', () => {
  const reglages = { ...REGLAGES_DEFAUT, couleurs: { fond: '#112233', boutons: '#ffffff', accent: '' } };
  const lien = { ...nouveauBloc('lien', 'a'), url: 'https://exemple.fr', cache: ['instagram' as const], audience: { sources: ['tiktok' as const], effet: 'avant' as const }, creneau: CRENEAU };
  const lancement = { ...nouveauBloc('lien', 'e'), url: 'https://exemple.fr/l', debut: '2099-01-01T10:00', fin: '2099-02-01T10:00', compteARebours: true };
  const drop = { ...nouveauBloc('lien', 'b'), acces: { code: 'VIP', places: 0 } };
  const liste = nouveauBloc('inscription', 'c');
  const avis = nouveauBloc('preuve', 'd');
  const page = selonDroits(reglages, [lien, lancement, drop, liste, avis], RIEN);
  // La page reprend les couleurs de son thème ; celles choisies restent dans les réglages.
  assert.deepEqual(page.reglages.couleurs, SANS_COULEURS);
  assert.equal(reglages.couleurs.fond, '#112233');
  assert.deepEqual(page.blocs.map(b => b.id), ['a', 'e']);
  // La page selon le réseau reste à tous ; le créneau de la semaine s'efface.
  assert.deepEqual(page.blocs[0].cache, ['instagram']);
  assert.deepEqual(page.blocs[0].audience, { sources: ['tiktok'], effet: 'avant' });
  assert.equal(page.blocs[0].creneau, null);
  assert.deepEqual(lien.creneau, CRENEAU);
  // Les dates tiennent toujours, mais le compte à rebours se tait.
  assert.equal(page.blocs[1].debut, '2099-01-01T10:00');
  assert.equal(page.blocs[1].fin, '2099-02-01T10:00');
  assert.equal(page.blocs[1].compteARebours, false);
  // Avec tous les droits, rien ne change.
  const pleine = selonDroits(reglages, [lien, lancement, drop, liste, avis], TOUT);
  assert.equal(pleine.blocs.length, 5);
  assert.equal(pleine.reglages, reglages);
  assert.deepEqual(pleine.blocs[0].creneau, CRENEAU);
  assert.equal(pleine.blocs[1].compteARebours, true);
  // Sur la page, le lancement attend sa date sans rien montrer ; avec la programmation, son compte à rebours s'affiche.
  const avantLancement = Date.parse('2098-12-31T10:00:00Z');
  assert.ok(!composerMoment(page.blocs, avantLancement).some(b => b.id === 'e'));
  assert.ok(composerMoment(pleine.blocs, avantLancement).some(b => b.id === 'e'));
});

test('la vitrine demande Starter ; la mention d’un lien partenaire reste à tous, son code promo non', () => {
  const produit = { ...nouveauBloc('produit', 'p'), url: 'https://boutique.exemple/p', titre: 'Le carnet', prix: '24\u00a0€' };
  const soutien = { ...nouveauBloc('soutien', 's'), url: 'https://paypal.me/lilian' };
  const rdv = { ...nouveauBloc('reservation', 'r'), url: 'https://calendly.com/lilian/30min' };
  const partenaire = { ...nouveauBloc('lien', 'l'), url: 'https://marque.exemple', partenariat: { mention: 'collaboration' as const, code: 'LILIAN20' } };
  const page = selonDroits(REGLAGES_DEFAUT, [produit, soutien, rdv, partenaire], RIEN);
  assert.deepEqual(page.blocs.map(b => b.id), ['l']);
  assert.deepEqual(page.blocs[0].partenariat, { mention: 'collaboration', code: '' });
  // Rien n'est effacé : reprendre Starter remet le code.
  assert.equal(partenaire.partenariat.code, 'LILIAN20');
  const pleine = selonDroits(REGLAGES_DEFAUT, [produit, soutien, rdv, partenaire], { ...RIEN, vitrine: true });
  assert.deepEqual(pleine.blocs.map(b => b.id), ['p', 's', 'r', 'l']);
  assert.equal(pleine.blocs[3], partenaire);
});

test('la page selon le réseau et la page selon l’heure se séparent : le réseau pour tous, l’heure avec Pro', () => {
  const lien = { ...nouveauBloc('lien', 'a'), url: 'https://exemple.fr', cache: ['youtube' as const], creneau: CRENEAU };
  const starter = { ...TOUT, heure: false, drops: false, listeEmail: false };
  const [enStarter] = selonDroits(REGLAGES_DEFAUT, [lien], starter).blocs;
  assert.deepEqual(enStarter.cache, ['youtube']);
  assert.equal(enStarter.creneau, null);
  const [enPro] = selonDroits(REGLAGES_DEFAUT, [lien], TOUT).blocs;
  assert.deepEqual(enPro.creneau, CRENEAU);
});

test('les couleurs suivent leur droit, et lui seul', () => {
  const reglages = { ...REGLAGES_DEFAUT, couleurs: { fond: '#112233', boutons: '', accent: '#ff0000' } };
  assert.deepEqual(selonDroits(reglages, [], { ...TOUT, couleurs: false }).reglages.couleurs, SANS_COULEURS);
  assert.deepEqual(selonDroits(reglages, [], { ...RIEN, couleurs: true }).reglages.couleurs, reglages.couleurs);
});

test('poser des dates demande la programmation, les retirer jamais', () => {
  const sans = { debut: '', fin: '', compteARebours: false };
  const date = { debut: '2099-01-01T10:00', fin: '', compteARebours: false };
  assert.equal(nouvellesDates(undefined, sans), false);
  assert.equal(nouvellesDates(sans, sans), false);
  assert.equal(nouvellesDates(undefined, date), true);
  assert.equal(nouvellesDates(sans, date), true);
  assert.equal(nouvellesDates(sans, { ...sans, fin: '2099-01-01T10:00' }), true);
  // Garder ses dates, ou les retirer, reste permis.
  assert.equal(nouvellesDates(date, date), false);
  assert.equal(nouvellesDates(date, sans), false);
  assert.equal(nouvellesDates({ ...date, compteARebours: true }, date), false);
  // Les changer, ou ajouter un compte à rebours, c'est programmer.
  assert.equal(nouvellesDates(date, { ...date, debut: '2099-03-01T10:00' }), true);
  assert.equal(nouvellesDates(date, { ...date, compteARebours: true }), true);
  // Un compte à rebours sans date de début n'a rien à compter.
  assert.equal(nouvellesDates(sans, { ...sans, compteARebours: true }), false);
});

test('les CGU citent les prix en vigueur', () => {
  const cgu = LEGAL.cgu.sections.flatMap(s => s.texte).join(' ');
  for (const p of PLANS_PAYANTS) assert.ok(cgu.includes(`${OFFRES[p].nom}, à ${euros(OFFRES[p].prix.mois)} par mois ou ${euros(OFFRES[p].prix.an)} par an`), p);
});

test('ni les offres ni les CGU ne parlent plus de place pour les images ni de langues', () => {
  const cgu = LEGAL.cgu.sections.flatMap(s => s.texte).join(' ');
  const offres = PLANS.flatMap(p => [OFFRES[p].phrase, ...OFFRES[p].avantages]).join(' ');
  for (const texte of [cgu, offres]) assert.doesNotMatch(texte, /[MG]o d’images|langues/);
});

/** Les droits d'un compte, comme le serveur les calcule : son offre, et ce que garde une page d'avant les offres. */
const droitsDe = (plan: Plan, cree = Number.POSITIVE_INFINITY) => Object.fromEntries((Object.keys(FONCTIONS) as Fonction[]).map(f => [f, peut(plan, f, cree)])) as Droits;

test('l’offre du dessus : la première en vente, avec ce qu’elle apporte de plus parlant', () => {
  const enVente: PlanPayant[] = ['starter', 'pro'];
  const compte = (plan: Plan, statut = plan === 'gratuit' ? '' : 'active', cree?: number) => offreSuivante({ plan, payee: plan, statut }, droitsDe(plan, cree), enVente);
  assert.deepEqual(compte('gratuit'), { plan: 'starter', texte: 'sans la mention Hopla', fonction: 'sansMention' });
  assert.deepEqual(compte('starter'), { plan: 'pro', texte: 'ta page selon l’heure', fonction: 'heure' });
  // Au-dessus de Pro, Premium n'est pas en vente ; le compte principal (Premium) a déjà tout.
  assert.equal(compte('pro'), null);
  assert.equal(compte('premium', ''), null);
  // Qui s'en va, ou a un souci de carte, n'est pas relancé.
  for (const statut of ['scheduled_cancel', 'canceled', 'past_due']) assert.equal(compte('starter', statut), null, statut);
  // Revenu en Gratuit, un ancien abonné voit de nouveau Starter.
  assert.deepEqual(compte('gratuit', 'expired'), { plan: 'starter', texte: 'sans la mention Hopla', fonction: 'sansMention' });
  // Ce qui est en vente décide : rien en vente, rien à proposer ; Pro seul, on propose Pro.
  assert.equal(offreSuivante({ plan: 'gratuit', payee: 'gratuit', statut: '' }, droitsDe('gratuit'), []), null);
  assert.deepEqual(offreSuivante({ plan: 'gratuit', payee: 'gratuit', statut: '' }, droitsDe('gratuit'), ['pro']), { plan: 'pro', texte: 'ta page selon l’heure', fonction: 'heure' });
  // Starter offert : on propose ce qu'il y a au-dessus, Pro ; Pro offert a déjà ce qui est en vente.
  assert.deepEqual(offreSuivante({ plan: 'starter', payee: 'gratuit', statut: '' }, droitsDe('starter'), enVente), { plan: 'pro', texte: 'ta page selon l’heure', fonction: 'heure' });
  assert.equal(offreSuivante({ plan: 'pro', payee: 'gratuit', statut: '' }, droitsDe('pro'), enVente), null);
  // Un abonnement résilié sous une offre offerte : on ne relance pas non plus.
  assert.equal(offreSuivante({ plan: 'pro', payee: 'starter', statut: 'scheduled_cancel' }, droitsDe('pro'), enVente), null);
  // Une page d'avant les offres a déjà presque tout : on lui propose ce qui lui manque vraiment.
  const avant = BASCULE_OFFRES - 86_400_000;
  assert.deepEqual(compte('gratuit', '', avant), { plan: 'starter', texte: 'sans la mention Hopla', fonction: 'sansMention' });
  assert.deepEqual(compte('starter', 'active', avant), { plan: 'pro', texte: 'tes stats sur un an' });
});

test('chaque accroche parle d’une fonction de son offre, et la dernière ne dépend de rien', () => {
  for (const p of PLANS_PAYANTS) {
    const liste = ACCROCHES[p];
    assert.ok(liste.length > 0, p);
    for (const a of liste) {
      if (a.fonction) assert.equal(FONCTIONS[a.fonction], p, `${p} : ${a.texte}`);
      assert.match(a.texte, /^[a-zà-ÿ]/, 'en minuscule, après « Passer en … : »');
      assert.doesNotMatch(a.texte, /\u2014/, 'jamais de tiret cadratin');
    }
    assert.equal(liste.at(-1)!.fonction, undefined, `${p} a toujours quelque chose à dire`);
  }
});

test('changer d’offre : monter fait payer la différence, descendre la rend, changer de période laisse Creem décider', () => {
  assert.equal(sensDuChangement({ plan: 'starter', periode: 'mois' }, { plan: 'pro', periode: 'mois' }), 'facture');
  assert.equal(sensDuChangement({ plan: 'pro', periode: 'an' }, { plan: 'starter', periode: 'an' }), 'rendu');
  // Une autre période : ce qui reste de la période en cours décide.
  assert.equal(sensDuChangement({ plan: 'pro', periode: 'mois' }, { plan: 'starter', periode: 'an' }), null);
  assert.equal(sensDuChangement({ plan: 'starter', periode: 'an' }, { plan: 'starter', periode: 'mois' }), null);
  assert.equal(sensDuChangement({ plan: 'starter', periode: null }, { plan: 'pro', periode: 'mois' }), null);
  // Depuis Gratuit, ce n'est pas un changement : on paie sur la page de Creem.
  assert.equal(sensDuChangement({ plan: 'gratuit', periode: null }, { plan: 'starter', periode: 'mois' }), null);
});

test('Réglages : gérer son abonnement tant qu’il court, ses factures dès qu’on a payé une fois', () => {
  assert.deepEqual(accesAbonnement({ payee: 'gratuit', portail: false }), { gerer: false, factures: false });
  assert.deepEqual(accesAbonnement({ payee: 'gratuit', portail: true }), { gerer: false, factures: true }, 'un ancien abonné garde ses factures');
  assert.deepEqual(accesAbonnement({ payee: 'starter', portail: true }), { gerer: true, factures: true });
  assert.deepEqual(accesAbonnement({ payee: 'pro', portail: false }), { gerer: true, factures: false });
  // Une offre offerte ne se gère pas : seul ce qui se paie ouvre « Gérer mon abonnement ».
  const offert = { plan: 'pro' as const, payee: 'gratuit' as const, portail: false };
  assert.deepEqual(accesAbonnement(offert), { gerer: false, factures: false });
});

test('les CGU disent que supprimer son compte résilie son abonnement', () => {
  const compte = LEGAL.cgu.sections.find(s => s.titre === 'Ton compte')!.texte.join(' ');
  assert.match(compte, /résilie au même moment/);
  assert.match(compte, /n’est pas remboursée, sauf dans les 14 jours/);
});

test('le design s’essaie sans Starter : il se montre au back office, la page publique ne le montre pas, et se retire d’un geste', () => {
  const reglages = { ...REGLAGES_DEFAUT, police: 'elegante' as const, imageFond: '/media/fond.webp', couleurs: { ...SANS_COULEURS, fond: '#112233' } };
  assert.deepEqual(enEssai(reglages, RIEN), ['couleurs', 'fond']);
  assert.deepEqual(enEssai(reglages, TOUT), []);
  assert.equal(selonDroits(reglages, [], RIEN).reglages.imageFond, '');
  assert.equal(selonDroits(reglages, [], avecEssai(RIEN)).reglages.imageFond, '/media/fond.webp');
  const retire = sansEssai(reglages, RIEN);
  assert.deepEqual(enEssai(retire, RIEN), []);
  assert.equal(retire.theme, reglages.theme);
});
