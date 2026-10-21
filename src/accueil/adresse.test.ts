import test from 'node:test';
import assert from 'node:assert/strict';
import { adresseSuggeree, nomDansAdresse, nomDansLien } from './adresse.ts';
import { nomSaisi } from '../lib/valider.ts';

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

test('une adresse collée dans le champ du nom ne garde que le nom', () => {
  const nom = (v: string) => nomSaisi(nomDansAdresse(v));
  assert.equal(nom('https://hopla.page/marie-lambert'), 'marie-lambert');
  assert.equal(nom(' hopla.page/marie-lambert?ref=bio '), 'marie-lambert');
  assert.equal(nom('https://www.linktr.ee/Marie.Lambert'), 'marie-lambert');
  assert.equal(nom('https://www.instagram.com/@marie_lambert/'), 'marie-lambert');
  assert.equal(nom('https://youtube.com/@MarieLambert/videos'), 'marielambert');
  assert.equal(nom('marie.lambert@gmail.com'), 'marie-lambert');
  assert.equal(nom('hopla.page/'), '');
  // Ce qui n'est pas une adresse passe tel quel.
  assert.equal(nom('Marie Lambert'), 'marie-lambert');
  assert.equal(nom('marie.lambert'), 'marie-lambert');
});

test('un lien tapé lettre à lettre se reconnaît dès le début de son nom, et un emoji ne laisse pas de tiret', () => {
  assert.equal(nomDansLien('https://linktr.ee/'), '');
  assert.equal(nomDansLien('https://linktr.ee/z'), 'z');
  assert.equal(nomDansLien('marie.lambert'), '');
  assert.equal(nomDansLien('marie@gmail.com'), '');
  assert.equal(nomSaisi('zoé🎉'), 'zoe');
  assert.equal(nomSaisi('Zoé 🎉 Martin'), 'zoe-martin');
});
