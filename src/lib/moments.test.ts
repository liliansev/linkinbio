import test from 'node:test';
import assert from 'node:assert/strict';
import { composerMoment, dansCreneau, decrireCreneau } from './moments.ts';
import { nouveauBloc } from './types.ts';
import { validerBloc } from './valider.ts';

// Lundi 19 octobre 2026, 9 h 30 à Paris (UTC+2).
const LUNDI_9H30 = Date.parse('2026-10-19T07:30:00Z');
const c = { jours: [1, 2, 3, 4, 5], de: '08:00', a: '12:00', fuseau: 'Europe/Paris', effet: 'avant' as const };

test('un créneau suit les jours et les heures du fuseau de la personne', () => {
  assert.equal(dansCreneau(c, LUNDI_9H30), true);
  assert.equal(dansCreneau(c, LUNDI_9H30 + 3 * 3_600_000), false, '12 h 30 : fermé');
  assert.equal(dansCreneau({ ...c, fuseau: 'America/Montreal' }, LUNDI_9H30), false, '3 h 30 à Montréal');
  assert.equal(dansCreneau(c, LUNDI_9H30 - 2 * 86_400_000), false, 'samedi');
  // 22 h à 2 h, le vendredi : ouvert le samedi à 1 h, fermé le vendredi à 1 h.
  const nuit = { ...c, jours: [5], de: '22:00', a: '02:00' };
  assert.equal(dansCreneau(nuit, Date.parse('2026-10-23T23:00:00Z')), true, 'samedi 1 h');
  assert.equal(dansCreneau(nuit, Date.parse('2026-10-22T23:00:00Z')), false, 'vendredi 1 h');
  assert.equal(decrireCreneau(c), 'en semaine, de 8 h à 12 h');
  assert.equal(decrireCreneau({ ...c, jours: [6, 7], de: '18:30', a: '23:00' }), 'le week-end, de 18 h 30 à 23 h');
});

test('la page met en tête le bloc de son créneau, et cache ceux hors de leur créneau', () => {
  const lien = (id: string, champs = {}) => ({ ...nouveauBloc('lien', id), url: 'https://exemple.fr/', titre: id, ...champs });
  const blocs = [lien('a'), lien('reserver', { creneau: c }), lien('soir', { creneau: { ...c, de: '18:00', a: '23:00', effet: 'afficher' } })];
  assert.deepEqual(composerMoment(blocs, LUNDI_9H30).map(b => b.id), ['reserver', 'a']);
  assert.equal(composerMoment(blocs, LUNDI_9H30)[0].vedette, true);
  assert.deepEqual(composerMoment(blocs, LUNDI_9H30 + 10 * 3_600_000).map(b => b.id), ['a', 'reserver', 'soir']);
});

test('un lancement s’annonce par un compte à rebours, sans son adresse', () => {
  const lancement = { ...nouveauBloc('lien', 'l'), titre: 'Ma formation', url: 'https://secret.fr/', debut: new Date(LUNDI_9H30 + 86_400_000).toISOString(), compteARebours: true };
  const [avant] = composerMoment([lancement], LUNDI_9H30);
  assert.equal(avant.url, '', 'l’adresse ne part pas avant l’heure');
  assert.equal(composerMoment([{ ...lancement, compteARebours: false }], LUNDI_9H30).length, 0);
  assert.equal(composerMoment([lancement], LUNDI_9H30 + 2 * 86_400_000)[0].url, 'https://secret.fr/');
  const v = validerBloc({ creneau: { jours: [9, 1, 1], de: '25:00', fuseau: 'Pas/Un_fuseau' } }, 'x');
  assert.deepEqual(v.creneau, { jours: [1], de: '09:00', a: '18:00', fuseau: 'Europe/Paris', effet: 'avant' });
  assert.equal(validerBloc({ creneau: { jours: [] } }, 'x').creneau, null);
});
