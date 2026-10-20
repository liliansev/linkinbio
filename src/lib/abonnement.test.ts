import test from 'node:test';
import assert from 'node:assert/strict';
import { BASCULE_OFFRES, OFFRES, PLANS, PLANS_PAYANTS, economie, euros, libellePrix, parMoisAnnuel, peut } from './abonnement.ts';
import { selonDroits } from './droits.ts';
import type { Droits } from './droits.ts';
import { LEGAL } from './legal.ts';
import { nouveauBloc } from './types.ts';
import { REGLAGES_DEFAUT } from './defauts.ts';

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
  assert.equal(peut('gratuit', 'sansMention'), false);
  assert.equal(peut('starter', 'sansMention'), true);
  assert.equal(peut('starter', 'avis'), true);
  assert.equal(peut('starter', 'drops'), false);
  assert.equal(peut('pro', 'drops'), true);
  assert.equal(peut('premium', 'listeEmail'), true);
});

test('une page d’avant les offres garde tout, sauf la page sans mention', () => {
  const avant = BASCULE_OFFRES - 86_400_000;
  assert.equal(peut('gratuit', 'drops', avant), true);
  assert.equal(peut('gratuit', 'langues', avant), true);
  assert.equal(peut('gratuit', 'sansMention', avant), false);
  assert.equal(peut('gratuit', 'drops', BASCULE_OFFRES + 1), false);
});

test('ce que l’offre ne comprend pas s’efface de la page, sans rien perdre', () => {
  const rien: Droits = { sansMention: false, avis: false, langues: false, reseauHeure: false, drops: false, listeEmail: false };
  const reglages = { ...REGLAGES_DEFAUT, langues: ['en' as const] };
  const lien = { ...nouveauBloc('lien', 'a'), url: 'https://exemple.fr', cache: ['instagram' as const], creneau: { jours: [1], de: '09:00', a: '12:00', fuseau: 'Europe/Paris', effet: 'afficher' as const } };
  const drop = { ...nouveauBloc('lien', 'b'), acces: { code: 'VIP', places: 0 } };
  const liste = nouveauBloc('inscription', 'c');
  const avis = nouveauBloc('preuve', 'd');
  const page = selonDroits(reglages, [lien, drop, liste, avis], rien);
  assert.deepEqual(page.reglages.langues, []);
  assert.deepEqual(page.blocs.map(b => b.id), ['a']);
  assert.deepEqual(page.blocs[0].cache, []);
  assert.equal(page.blocs[0].creneau, null);
  // Avec tous les droits, rien ne change.
  const tout: Droits = { sansMention: true, avis: true, langues: true, reseauHeure: true, drops: true, listeEmail: true };
  const pleine = selonDroits(reglages, [lien, drop, liste, avis], tout);
  assert.equal(pleine.blocs.length, 4);
  assert.deepEqual(pleine.blocs[0].cache, ['instagram']);
});

test('les CGU citent les prix en vigueur', () => {
  const cgu = LEGAL.cgu.sections.flatMap(s => s.texte).join(' ');
  for (const p of PLANS_PAYANTS) assert.ok(cgu.includes(`${OFFRES[p].nom}, à ${euros(OFFRES[p].prix.mois)} par mois ou ${euros(OFFRES[p].prix.an)} par an`), p);
});
