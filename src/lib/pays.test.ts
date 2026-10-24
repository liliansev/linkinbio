import test from 'node:test';
import assert from 'node:assert/strict';
import { chercherPays, estPays, listePays, nomPays, pourPays } from './pays.ts';
import { validerBloc } from './valider.ts';
import { selonDroits } from './droits.ts';
import type { Droits } from './droits.ts';
import { FONCTIONS } from './abonnement.ts';
import { REGLAGES_DEFAUT } from './defauts.ts';

const TOUT = Object.fromEntries(Object.keys(FONCTIONS).map(f => [f, true])) as Droits;

test('selon le pays : « seulement » pour ces pays, « sauf » partout ailleurs, un pays inconnu ne voit pas ce qui est réservé', () => {
  const seulement = { pays: { codes: ['FR', 'BE'], effet: 'seulement' as const } };
  const sauf = { pays: { codes: ['FR'], effet: 'sauf' as const } };
  assert.equal(pourPays(seulement, 'FR'), true);
  assert.equal(pourPays(seulement, 'CH'), false);
  assert.equal(pourPays(seulement, ''), false);
  assert.equal(pourPays(sauf, 'FR'), false);
  assert.equal(pourPays(sauf, ''), true);
  assert.equal(pourPays({ pays: null }, ''), true);
  assert.equal(pourPays({ pays: { codes: [], effet: 'seulement' } }, 'US'), true, 'sans pays choisi, le bloc s’affiche partout');
});

test('les pays se nomment et se cherchent en français, sans accents', () => {
  assert.equal(nomPays('BE'), 'Belgique');
  assert.equal(estPays('XK'), true);
  assert.equal(estPays('ZZ'), false);
  assert.equal(chercherPays('belg')[0], 'BE');
  assert.ok(chercherPays('etats').includes('US'));
  assert.ok(chercherPays('egyp').includes('EG'));
  assert.equal(listePays(['FR', 'BE', 'CH']), 'France, Belgique et Suisse');
  assert.equal(listePays(['FR']), 'France');
  assert.equal(listePays(['FR', 'BE', 'CH', 'LU']), '4 pays');
});

test('un bloc garde des pays valides, une fois chacun ; le cadeau d’une liste veut une adresse', () => {
  const b = validerBloc({ type: 'lien', url: 'a.fr', pays: { codes: ['BE', 'zz', 'FR', 'BE', 3], effet: 'rien' } }, 'l');
  assert.deepEqual(b.pays, { codes: ['BE', 'FR'], effet: 'seulement' });
  assert.equal(validerBloc({ type: 'lien', url: 'a.fr', pays: { codes: [] } }, 'l').pays, null);
  const liste = validerBloc({ type: 'inscription', cadeau: { nom: ' Mon guide ', url: 'https://drive.google.com/x' } }, 'i');
  assert.deepEqual(liste.cadeau, { nom: 'Mon guide', url: 'https://drive.google.com/x' });
  assert.equal(validerBloc({ type: 'inscription', cadeau: { nom: 'x', url: 'javascript:alert(1)' } }, 'i').cadeau, null);
  assert.equal(validerBloc({ type: 'lien', url: 'a.fr', cadeau: { nom: 'x', url: 'https://a.fr' } }, 'l').cadeau, null, 'seule une liste a un cadeau');
});

test('sans Pro, le pays, le cadeau et les derniers articles s’effacent de la page, sans rien toucher en base', () => {
  const lien = validerBloc({ type: 'lien', url: 'a.fr', pays: { codes: ['FR'], effet: 'seulement' } }, 'l');
  const liste = validerBloc({ type: 'inscription', cadeau: { nom: 'Guide', url: 'https://a.fr/guide.pdf' } }, 'i');
  const flux = validerBloc({ type: 'flux', url: 'https://blog.fr/feed' }, 'f');
  const sansPro = { ...TOUT, pays: false, cadeau: false, flux: false };
  const page = selonDroits(REGLAGES_DEFAUT, [lien, liste, flux], sansPro);
  assert.deepEqual(page.blocs.map(b => b.id), ['l', 'i']);
  assert.equal(page.blocs[0].pays, null);
  assert.equal(page.blocs[1].cadeau, null);
  assert.deepEqual(lien.pays, { codes: ['FR'], effet: 'seulement' });
  const avec = selonDroits(REGLAGES_DEFAUT, [lien, liste, flux], TOUT);
  assert.deepEqual(avec.blocs, [lien, liste, flux]);
});
