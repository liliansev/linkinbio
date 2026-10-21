import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quand, statutCompte, trouve } from './comptes.ts';

test('la dernière connexion en mots', () => {
  // Midi, pour qu'aucun fuseau ne change le jour.
  const maintenant = new Date(2026, 9, 20, 12).getTime();
  assert.equal(quand(null, maintenant), 'Jamais');
  assert.equal(quand(new Date(2026, 9, 20, 0, 5).getTime(), maintenant), 'Aujourd’hui');
  assert.equal(quand(new Date(2026, 9, 19, 23, 50).getTime(), maintenant), 'Hier');
  assert.equal(quand(new Date(2026, 9, 11, 9).getTime(), maintenant), '11 oct.');
  assert.equal(quand(new Date(2025, 11, 3, 9).getTime(), maintenant), '3 déc. 2025');
  // Une horloge un peu en avance ne fait pas une connexion « demain ».
  assert.equal(quand(maintenant + 60_000, maintenant), 'Aujourd’hui');
});

test('le statut d’un compte : suspendu, signalé, actif', () => {
  const ouvert = { compte: 'a', statut: 'ouvert' as const };
  const classe = { compte: 'b', statut: 'sans-suite' as const };
  assert.equal(statutCompte({ id: 'a', statut: 'actif' }, [ouvert, classe]), 'signale');
  assert.equal(statutCompte({ id: 'b', statut: 'actif' }, [ouvert, classe]), 'actif');
  assert.equal(statutCompte({ id: 'a', statut: 'suspendu' }, [ouvert]), 'suspendu');
  assert.equal(statutCompte({ id: 'c', statut: 'actif' }, []), 'actif');
});

test('la recherche, sans accents ni majuscules, mot par mot', () => {
  assert.equal(trouve('lea', 'léa-ceramique', 'lea@exemple.fr'), true);
  assert.equal(trouve('CAMILLE', 'camille-studio', 'camille@exemple.fr'), true);
  assert.equal(trouve('exemple hugo', 'hugo-podcast', 'hugo@exemple.fr'), true);
  assert.equal(trouve('hugo sarah', 'hugo-podcast', 'hugo@exemple.fr'), false);
  assert.equal(trouve('  ', 'tout'), true);
});
