import test from 'node:test';
import assert from 'node:assert/strict';
import { TARIFS, euros } from './abonnement.ts';
import { LEGAL } from './legal.ts';

test('les prix s’écrivent à la française', () => {
  assert.equal(euros(9), '9 €');
  assert.equal(euros(86.4), '86,40 €');
  assert.equal(TARIFS.mois.libelle, '9 € par mois');
  assert.equal(TARIFS.an.libelle, '86,40 € par an');
});

test('l’annuel vaut douze mois moins 20 %', () => {
  assert.equal(Math.round(TARIFS.mois.prix * 12 * 0.8 * 100) / 100, TARIFS.an.prix);
});

test('les CGU citent les prix en vigueur', () => {
  const cgu = LEGAL.cgu.sections.flatMap(s => s.texte).join(' ');
  assert.match(cgu, /9 € par mois ou 86,40 € par an, toutes taxes comprises/);
});
