import test from 'node:test';
import assert from 'node:assert/strict';
import { adresseCourte, codeCourt } from './courts.ts';

test('codeCourt : minuscules, chiffres et tirets, de 2 à 40 signes', () => {
  assert.equal(codeCourt('Ma Vidéo !'), 'ma-video');
  assert.equal(codeCourt('  --promo--2026--  '), 'promo-2026');
  assert.equal(codeCourt('a'), '');
  assert.equal(codeCourt('admin'), '');
  assert.equal(codeCourt('x'.repeat(60)).length, 40);
  assert.equal(codeCourt('../etc'), 'etc');
});

test('adresseCourte : sur hopla.page ou sur le nom court choisi', () => {
  const compte = { pseudo: 'camille', principal: false };
  assert.match(adresseCourte(compte, 'video', ''), /\/camille\/video$/);
  assert.equal(adresseCourte(compte, 'video', 'hpla.eu'), 'https://hpla.eu/camille/video');
});
