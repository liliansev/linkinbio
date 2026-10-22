import test from 'node:test';
import assert from 'node:assert/strict';
import { COULEURS_SOURCES, chiffre, ecart, graduation, parSemaine, reperes, totalDe, valeurDuJour } from './stats.ts';
import { NOMS_AUDIENCES } from './provenance.ts';
import { contraste } from './themes.ts';

const s = { vues: 2877, visiteurs: 2129, clics: 1096, precedent: { vues: 4294, visiteurs: 3170, clics: 1660 } };

test('l’écart avec la période d’avant : en pourcentage, en points pour le taux', () => {
  assert.equal(ecart(s, 'vues').court, '−33 %');
  assert.equal(ecart(s, 'clics').court, '−34 %');
  // 38 % contre 39 % : un point de moins, pas « −3 % ».
  assert.equal(ecart(s, 'taux').court, '−1 pt');
  assert.equal(ecart({ ...s, clics: 1351 }, 'taux').court, '+8 pts');
  assert.equal(ecart({ ...s, precedent: { vues: 2877, visiteurs: 2129, clics: 1096 } }, 'vues').court, 'stable');
  assert.equal(ecart({ ...s, precedent: { vues: 0, visiteurs: 0, clics: 0 } }, 'vues').court, 'nouveau');
  assert.equal(ecart({ ...s, precedent: { vues: 0, visiteurs: 0, clics: 0 } }, 'taux').court, '');
  assert.match(ecart(s, 'vues').long, /^en baisse de 33/);
});

test('le chiffre d’un jour et de la période', () => {
  const jour = { jour: '2026-10-20', vues: 40, visiteurs: 30, clics: 10 };
  assert.equal(valeurDuJour(jour, 'visiteurs'), 30);
  assert.equal(valeurDuJour(jour, 'taux'), 25);
  assert.equal(valeurDuJour({ ...jour, vues: 0, clics: 0 }, 'taux'), 0);
  assert.equal(totalDe(s, 'taux'), 38);
  assert.equal(totalDe({ ...s, vues: 0 }, 'taux'), null);
  assert.equal(chiffre(2877, 'vues'), '2 877');
  assert.equal(chiffre(38, 'taux'), '38 %');
});

test('une échelle aux nombres ronds, quatre intervalles au plus', () => {
  assert.deepEqual(graduation(176), { haut: 200, pas: 50 });
  assert.deepEqual(graduation(0), { haut: 4, pas: 1 });
  assert.deepEqual(graduation(7), { haut: 8, pas: 2 });
  assert.deepEqual(graduation(45), { haut: 60, pas: 20 });
  assert.deepEqual(graduation(1000), { haut: 1000, pas: 250 });
  for (const max of [5, 9, 13, 99, 101, 2877, 12345]) {
    const { haut, pas } = graduation(max);
    assert.ok(haut >= max && haut / pas <= 4 && Number.isInteger(pas), `échelle de ${max}`);
  }
});

const jours = (n: number, debut = Date.UTC(2026, 8, 21)) => Array.from({ length: n }, (_, i) => ({ jour: new Date(debut + i * 86_400_000).toISOString().slice(0, 10), vues: 10, visiteurs: 8, clics: 3 }));

test('un an se lit à la semaine : sept jours par point, la dernière finit aujourd’hui', () => {
  const an = jours(365, Date.UTC(2025, 9, 21));
  const semaines = parSemaine(an);
  assert.equal(semaines.length, 52);
  assert.equal(semaines[51].fin, an[364].jour);
  assert.equal(semaines[0].jour, an[1].jour);
  assert.deepEqual([semaines[0].vues, semaines[0].visiteurs, semaines[0].clics], [70, 56, 21]);
});

test('les dates sous la courbe : une par semaine sur 30 jours, le début de chaque mois sur un an', () => {
  assert.deepEqual(reperes(jours(7)), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(reperes(jours(30)), [0, 7, 14, 21, 28]);
  assert.deepEqual(reperes(jours(90)), [0, 14, 28, 42, 56, 70, 84]);
  const semaines = parSemaine(jours(365, Date.UTC(2025, 9, 21)));
  const r = reperes(semaines);
  assert.equal(r.length, 12);
  // Chaque repère tombe sur la semaine où un nouveau mois commence.
  assert.ok(r.every(i => semaines[i].fin!.slice(5, 7) !== semaines[i - 1].fin!.slice(5, 7)));
});

test('chaque réseau a sa couleur sous le nom que lui donnent les stats, et tout s’y lit', () => {
  const noms: string[] = Object.values(NOMS_AUDIENCES);
  for (const [nom, { picto, barre }] of Object.entries(COULEURS_SOURCES)) {
    assert.ok(noms.includes(nom), `${nom} : un nom que les stats ne donnent jamais`);
    // Le nom, à l'encre du back office ou de l'accueil, est écrit sur la barre.
    for (const encre of ['#0a0a0a', '#20241f']) assert.ok(contraste(encre, barre) >= 4.5, `${nom} : nom sur la barre = ${contraste(encre, barre).toFixed(2)}`);
    // Le logo est posé sur la barre, ou sur le blanc quand elle est plus courte que lui.
    for (const fond of [barre, '#ffffff']) assert.ok(contraste(picto, fond) >= 3, `${nom} : logo sur ${fond} = ${contraste(picto, fond).toFixed(2)}`);
  }
});
