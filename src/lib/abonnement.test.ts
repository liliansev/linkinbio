import test from 'node:test';
import assert from 'node:assert/strict';
import { BASCULE_OFFRES, FONCTIONS, OFFRES, PLANS, PLANS_PAYANTS, economie, euros, joursStats, libellePrix, parMoisAnnuel, peut } from './abonnement.ts';
import { nouvellesDates, selonDroits } from './droits.ts';
import type { Droits } from './droits.ts';
import { LEGAL } from './legal.ts';
import { SANS_COULEURS, nouveauBloc } from './types.ts';
import { REGLAGES_DEFAUT } from './defauts.ts';
import { composerMoment } from './moments.ts';

test('les prix s’écrivent à la française', () => {
  assert.equal(euros(9), '9\u00a0€');
  assert.equal(euros(86.4), '86,40\u00a0€');
  assert.equal(libellePrix('pro', 'mois'), '9\u00a0€ par mois');
  assert.equal(libellePrix('pro', 'an'), '79\u00a0€ par an');
});

test('chaque offre coûte plus que la précédente, et l’annuel revient moins cher que douze mois', () => {
  for (const [i, p] of PLANS_PAYANTS.entries()) {
    const o = OFFRES[p];
    assert.ok(o.prix.an < o.prix.mois * 12, p);
    assert.ok(economie(p) > 0 && economie(p) < 50, p);
    if (i) assert.ok(o.prix.mois > OFFRES[PLANS_PAYANTS[i - 1]].prix.mois, p);
  }
  assert.equal(economie('pro'), 27);
  assert.equal(parMoisAnnuel('pro'), 6.58);
  // Chaque offre lit au moins l'historique et la place de la précédente.
  for (let i = 1; i < PLANS.length; i++) {
    assert.ok(OFFRES[PLANS[i]].jours >= OFFRES[PLANS[i - 1]].jours);
    assert.ok(OFFRES[PLANS[i]].quota > OFFRES[PLANS[i - 1]].quota);
  }
  assert.equal(OFFRES.premium.enVente, false);
});

test('une fonction se débloque avec son offre et celles du dessus', () => {
  // Gratuit : des liens sans limite, la page selon le réseau et les thèmes, rien de réservé.
  for (const f of Object.keys(FONCTIONS) as (keyof typeof FONCTIONS)[]) assert.equal(peut('gratuit', f), false, f);
  for (const f of ['sansMention', 'couleurs', 'programmation', 'avis', 'stats'] as const) assert.equal(peut('starter', f), true, f);
  for (const f of ['heure', 'drops', 'listeEmail'] as const) {
    assert.equal(peut('starter', f), false, f);
    assert.equal(peut('pro', f), true, f);
  }
  assert.equal(peut('premium', 'listeEmail'), true);
});

test('une page d’avant les offres garde tout, sauf la page sans mention', () => {
  const avant = BASCULE_OFFRES - 86_400_000;
  for (const f of ['drops', 'couleurs', 'programmation', 'heure', 'stats', 'avis', 'listeEmail'] as const) assert.equal(peut('gratuit', f, avant), true, f);
  assert.equal(peut('gratuit', 'sansMention', avant), false);
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
