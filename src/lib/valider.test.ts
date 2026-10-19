import test from 'node:test';
import assert from 'node:assert/strict';
import { adresseSaisie } from './valider.ts';

test('une adresse tapée doit ressembler à un site', () => {
  assert.equal(adresseSaisie('ma boutique'), '');
  assert.equal(adresseSaisie('boutique'), '');
  assert.equal(adresseSaisie('atelier-marie.fr'), 'https://atelier-marie.fr/');
  assert.equal(adresseSaisie('marie@atelier.fr'), 'mailto:marie@atelier.fr');
  assert.equal(adresseSaisie('/contact'), '/contact');
});

test('pourquoiPasAdresse dit ce qui manque', async () => {
  const { pourquoiPasAdresse } = await import('./valider.ts');
  assert.match(pourquoiPasAdresse('https//x.fr'), /« : »/);
  assert.match(pourquoiPasAdresse('ma boutique'), /espace/);
  assert.match(pourquoiPasAdresse('monsite'), /\.fr ou \.com/);
});
