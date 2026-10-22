import test from 'node:test';
import assert from 'node:assert/strict';
import { aireSous, lisse } from './courbe.ts';
import type { PointTrace } from './courbe.ts';

/** Les courbes d'un chemin : le point de départ, les deux points de contrôle, le point d'arrivée. */
function courbes(chemin: string) {
  const morceaux = chemin.trim().split(/\s(?=[MLC])/);
  let depart = morceaux[0].slice(1).split(',').map(Number);
  return morceaux.slice(1).map(m => {
    const [c1, c2, fin] = m.slice(1).split(' ').map(c => c.split(',').map(Number));
    const courbe = { depart, c1, c2, fin };
    depart = fin;
    return courbe;
  });
}

// Le y d'un SVG descend : 100 est la ligne de base, 0 le haut du dessin.
const jours: PointTrace[] = [[0, 90], [10, 0], [20, 0], [30, 100], [40, 10], [50, 15], [60, 0], [70, 100], [80, 100]];

test('la courbe passe par chaque jour', () => {
  const c = courbes(lisse(jours));
  assert.equal(c.length, jours.length - 1);
  assert.deepEqual(c[0].depart, jours[0]);
  c.forEach((k, i) => assert.deepEqual(k.fin, jours[i + 1]));
});

test('elle ne dépasse jamais ses points : ni sous la ligne de base, ni au-dessus d’un pic', () => {
  // Chaque courbe tient dans le rectangle de ses deux points de contrôle et de ses bouts : s'ils restent entre
  // les deux jours qu'elle relie, elle aussi. Une interpolation ordinaire passerait sous zéro après le pic du 4e jour.
  for (const { depart, c1, c2, fin } of courbes(lisse(jours))) {
    const bas = Math.min(depart[1], fin[1]) - 0.05, haut = Math.max(depart[1], fin[1]) + 0.05;
    for (const y of [c1[1], c2[1]]) assert.ok(y >= bas && y <= haut, `${y} hors de [${bas}, ${haut}]`);
  }
});

test('deux jours égaux se relient à plat, et sous trois points le trait est droit', () => {
  const plat = courbes(lisse(jours))[1];
  assert.equal(plat.c1[1], 0);
  assert.equal(plat.c2[1], 0);
  assert.equal(lisse([[0, 50], [10, 20]]), 'M0.0,50.0 L10.0,20.0');
  assert.equal(aireSous([[0, 50], [10, 20]], 100), 'M0.0,50.0 L10.0,20.0 L10.0,100.0 L0.0,100.0 Z');
  assert.equal(aireSous([], 100), '');
});
