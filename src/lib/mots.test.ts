import test from 'node:test';
import assert from 'node:assert/strict';
import { textes } from './mots.ts';
import { validerReglages } from './valider.ts';
import { REGLAGES_DEFAUT, reglagesNouveauCompte } from './defauts.ts';

test('les mots de la page suivent sa langue, puis le tu ou le vous en français', () => {
  assert.equal(textes(false, 'en').merci, 'You’re in, thank you!');
  assert.equal(textes(true, 'en').merci, 'You’re in, thank you!');
  assert.equal(textes(false, 'en').locale, 'en-US');
  assert.equal(textes(false, 'fr').garde, 'Ta place est gardée.');
  assert.equal(textes(true, 'fr').garde, 'Votre place est gardée.');
  assert.equal(textes().locale, 'fr-FR');
});

test('chaque mot français a son anglais', () => {
  const fr = textes(false, 'fr'), en = textes(false, 'en');
  for (const cle of Object.keys(fr) as (keyof typeof fr)[]) {
    if (['j', 'h', 'adultes', 'codePromo', 'locale'].includes(cle)) continue;
    const a = fr[cle], b = en[cle];
    const lu = (v: unknown) => (typeof v === 'function' ? (v as (...x: unknown[]) => string)('1', 'X') : v);
    assert.notEqual(lu(b), lu(a), `« ${cle} » n'est pas traduit`);
  }
});

test('une page sans langue reste en français, un compte neuf prend celle de son inscription', () => {
  const { langue: _, ...ancienne } = REGLAGES_DEFAUT;
  assert.equal(validerReglages(ancienne, ancienne as typeof REGLAGES_DEFAUT).langue, 'fr');
  assert.equal(validerReglages({ ...REGLAGES_DEFAUT, langue: 'en' }, REGLAGES_DEFAUT).langue, 'en');
  assert.equal(validerReglages({ ...REGLAGES_DEFAUT, langue: 'de' }, REGLAGES_DEFAUT).langue, 'fr');
  assert.equal(reglagesNouveauCompte('camille', 'en').langue, 'en');
  assert.equal(reglagesNouveauCompte('camille').langue, 'fr');
});
