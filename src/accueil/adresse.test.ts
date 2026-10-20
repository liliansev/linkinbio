import test from 'node:test';
import assert from 'node:assert/strict';
import { adresseSuggeree } from './adresse.ts';

test('une faute de frappe dans un domaine courant propose la bonne adresse', () => {
  assert.equal(adresseSuggeree('marie@gmial.com'), 'marie@gmail.com');
  assert.equal(adresseSuggeree('marie@gmail.co'), 'marie@gmail.com');
  assert.equal(adresseSuggeree('marie@gmail.fr'), 'marie@gmail.com');
  assert.equal(adresseSuggeree('Marie@Hotmial.fr '), 'marie@hotmail.fr');
  assert.equal(adresseSuggeree('jules@outlok.fr'), 'jules@outlook.fr');
  assert.equal(adresseSuggeree('jules@yahooo.fr'), 'jules@yahoo.fr');
  assert.equal(adresseSuggeree('jules@orange.fe'), 'jules@orange.fr');
});

test('une adresse juste, rare ou pas encore finie ne propose rien', () => {
  assert.equal(adresseSuggeree('marie@gmail.com'), null);
  assert.equal(adresseSuggeree('marie@hotmail.fr'), null);
  assert.equal(adresseSuggeree('marie@atelier-lambert.fr'), null);
  assert.equal(adresseSuggeree('lilian@liliansevoumian.fr'), null);
  assert.equal(adresseSuggeree('marie@gmail'), null);
  assert.equal(adresseSuggeree('marie@'), null);
  assert.equal(adresseSuggeree('pas une adresse'), null);
  // « me.com » et « free.fr » sont courts : une seule lettre d'écart, pas deux.
  assert.equal(adresseSuggeree('marie@mi.co'), null);
});
