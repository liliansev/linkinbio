import test from 'node:test';
import assert from 'node:assert/strict';
import { ajouterJours, borner, cleDe, estJour, jourDe, joursEntre, lirePeriode, longueur, nomCourt, nomMois, nomPlage, plageDe, premierJour } from './periode.ts';

test('le jour de Paris, même quand Londres ou New York sont encore la veille', () => {
  // 23 h 30 à Londres le 21 octobre (UTC+1) : il est déjà 0 h 30 le 22 à Paris.
  assert.equal(jourDe(Date.parse('2026-10-21T22:30:00Z')), '2026-10-22');
  assert.equal(jourDe(Date.parse('2026-10-21T21:59:00Z')), '2026-10-21');
  // L'hiver, Paris n'a qu'une heure d'avance.
  assert.equal(jourDe(Date.parse('2026-12-31T23:30:00Z')), '2027-01-01');
});

test('compter les jours sans tomber dans les changements d’heure', () => {
  assert.equal(ajouterJours('2026-10-22', -6), '2026-10-16');
  assert.equal(ajouterJours('2026-03-01', -1), '2026-02-28');
  assert.equal(ajouterJours('2024-03-01', -1), '2024-02-29');
  assert.equal(ajouterJours('2026-12-31', 1), '2027-01-01');
  // Le passage à l'heure d'été (29 mars 2026) et à l'heure d'hiver (25 octobre 2026) ne sautent ni ne doublent aucun jour.
  assert.equal(ajouterJours('2026-03-30', -1), '2026-03-29');
  assert.equal(ajouterJours('2026-10-26', -1), '2026-10-25');
  assert.equal(joursEntre('2026-03-28', '2026-03-31'), 3);
  assert.equal(joursEntre('2026-10-12', '2026-10-12'), 0);
  assert.equal(longueur({ du: '2026-10-12', au: '2026-10-18' }), 7);
});

test('une vraie date, rien d’autre', () => {
  assert.equal(estJour('2026-10-12'), true);
  assert.equal(estJour('2024-02-29'), true);
  for (const faux of ['2026-09-31', '2026-02-29', '2026-13-01', '2026-9-3', '2026-10-12T00:00', '', 20261012, null]) assert.equal(estJour(faux), false, String(faux));
});

test('une période venue du navigateur : une durée connue, ou deux dates dans l’ordre', () => {
  assert.equal(lirePeriode(14), 14);
  assert.equal(lirePeriode('365'), 365);
  assert.equal(lirePeriode(8), null);
  assert.equal(lirePeriode(-7), null);
  assert.deepEqual(lirePeriode({ du: '2026-10-12', au: '2026-10-18' }), { du: '2026-10-12', au: '2026-10-18' });
  assert.deepEqual(lirePeriode({ du: '2026-10-12', au: '2026-10-12', autre: 'x' }), { du: '2026-10-12', au: '2026-10-12' });
  assert.equal(lirePeriode({ du: '2026-10-18', au: '2026-10-12' }), null, 'à l’envers');
  assert.equal(lirePeriode({ du: '2026-10-12' }), null);
  assert.equal(lirePeriode({ du: "2026-10-12' OR 1=1", au: '2026-10-18' }), null);
  assert.equal(lirePeriode(null), null);
  assert.equal(lirePeriode([7]), null);
});

test('les jours d’une période, et l’historique que l’offre laisse lire', () => {
  assert.deepEqual(plageDe(7, '2026-10-22'), { du: '2026-10-16', au: '2026-10-22' });
  assert.deepEqual(plageDe(365, '2026-10-22'), { du: '2025-10-23', au: '2026-10-22' });
  assert.deepEqual(plageDe({ du: '2026-10-01', au: '2026-10-05' }, '2026-10-22'), { du: '2026-10-01', au: '2026-10-05' });
  assert.equal(cleDe(30), '30');
  assert.equal(cleDe({ du: '2026-10-01', au: '2026-10-05' }), '2026-10-01/2026-10-05');
  // Starter lit 30 jours : du 23 septembre au 22 octobre.
  assert.equal(premierJour(30, '2026-10-22'), '2026-09-23');
  assert.deepEqual(borner({ du: '2026-10-01', au: '2026-10-05' }, 30, '2026-10-22'), { du: '2026-10-01', au: '2026-10-05' });
  assert.deepEqual(borner({ du: '2026-09-01', au: '2026-10-05' }, 30, '2026-10-22'), { du: '2026-09-23', au: '2026-10-05' }, 'trop loin : resserrée');
  assert.deepEqual(borner({ du: '2026-10-20', au: '2026-11-02' }, 30, '2026-10-22'), { du: '2026-10-20', au: '2026-10-22' }, 'demain n’a pas de stats');
  assert.equal(borner({ du: '2026-08-01', au: '2026-08-31' }, 30, '2026-10-22'), null, 'tout entière avant l’historique');
});

test('une plage en mots : « 1er », l’année quand ce n’est pas celle-ci', () => {
  const ajd = '2026-10-22';
  assert.equal(nomPlage({ du: '2026-10-12', au: '2026-10-12' }, ajd), 'Le 12 octobre');
  assert.equal(nomPlage({ du: '2026-10-01', au: '2026-10-18' }, ajd), 'Du 1er au 18 octobre');
  assert.equal(nomPlage({ du: '2026-09-28', au: '2026-10-04' }, ajd), 'Du 28 septembre au 4 octobre');
  assert.equal(nomPlage({ du: '2025-12-28', au: '2026-01-04' }, ajd), 'Du 28 décembre 2025 au 4 janvier 2026');
  assert.equal(nomPlage({ du: '2025-11-01', au: '2025-11-30' }, ajd), 'Du 1er au 30 novembre 2025');
  assert.equal(nomPlage({ du: '2025-11-01', au: '2025-11-01' }, ajd), 'Le 1er novembre 2025');
  assert.equal(nomCourt({ du: '2026-10-12', au: '2026-10-12' }, ajd), '12 oct.');
  assert.equal(nomCourt({ du: '2026-10-12', au: '2026-10-18' }, ajd), '12–18 oct.');
  assert.equal(nomCourt({ du: '2026-09-28', au: '2026-10-04' }, ajd), '28 sept. – 4 oct.');
  assert.equal(nomCourt({ du: '2025-12-28', au: '2026-01-04' }, ajd), '28 déc. 2025 – 4 janv. 2026');
  assert.equal(nomCourt({ du: '2025-11-03', au: '2025-11-09' }, ajd), '3–9 nov. 2025');
  assert.equal(nomMois('2026-10-12'), 'Octobre 2026');
  assert.equal(nomMois('2026-08-01'), 'Août 2026');
});
