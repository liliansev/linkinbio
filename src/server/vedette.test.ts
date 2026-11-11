import test from 'node:test';
import assert from 'node:assert/strict';

process.env.LIENS_DB = ':memory:';
const db = await import('./db.ts');
const { nouveauBloc } = await import('../lib/types.ts');
const P = 'principal';

const lien = (id: string, vedette = false) => ({ ...nouveauBloc('lien', id), url: `https://site.fr/${id}`, vedette });
const enAvant = () => db.lireBlocs(P).filter(b => b.vedette).map(b => b.id).sort();

test('un seul bloc mis en avant : celui qu’on allume éteint les autres', () => {
  db.lireBlocs(P);
  db.enregistrerBloc(P, lien('a', true));
  db.enregistrerBloc(P, lien('b'));
  assert.deepEqual(enAvant(), ['a']);
  db.enregistrerBloc(P, lien('b', true));
  assert.deepEqual(enAvant(), ['b'], 'allumer b éteint a');
  db.enregistrerBloc(P, { ...lien('b', true), titre: 'Autre nom' });
  assert.deepEqual(enAvant(), ['b'], 'modifier un bloc déjà mis en avant ne touche à rien');
  db.enregistrerBloc(P, lien('c', true));
  assert.deepEqual(enAvant(), ['c'], 'un bloc neuf mis en avant aussi');
});
