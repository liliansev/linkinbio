import test from 'node:test';
import assert from 'node:assert/strict';
import { TARIFS, euros } from './abonnement.ts';
import { LEGAL } from './legal.ts';

test('les prix s’écrivent à la française', () => {
  assert.equal(euros(9), '9 €');
  assert.equal(euros(86.4), '86,40 €');
  assert.equal(TARIFS.mois.libelle, '9 € par mois');
  assert.equal(TARIFS.an.libelle, '79 € par an');
});

test('l’annuel annonce ce qu’il fait gagner sur douze mois', () => {
  assert.equal(TARIFS.an.economie, '\u221227\u00a0%');
  assert.ok(TARIFS.an.prix < TARIFS.mois.prix * 12);
});

test('les CGU citent les prix en vigueur', () => {
  const cgu = LEGAL.cgu.sections.flatMap(s => s.texte).join(' ');
  assert.match(cgu, /9 € par mois ou 79 € par an, toutes taxes comprises/);
});
