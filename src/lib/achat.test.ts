import test from 'node:test';
import assert from 'node:assert/strict';
import { ESSAIS_MAX, ESSAIS_RAPIDES, achatDeRetour, delaiAvantEssai, etapeRetour } from './achat.ts';

const maintenant = Date.UTC(2026, 9, 20, 12);

test('le retour du paiement se lit dans l’adresse, et la note ne le complète que pour la même offre', () => {
  const note = { plan: 'starter', periode: 'an', pour: 'couleurs', avant: 'gratuit', ts: maintenant - 60_000 };
  assert.deepEqual(achatDeRetour('?paiement=starter', note, maintenant), { plan: 'starter', periode: 'an', pour: 'couleurs', avant: 'gratuit' });
  // Une autre offre que celle notée : l'adresse fait foi, la note ne dit rien.
  assert.deepEqual(achatDeRetour('?paiement=pro', note, maintenant), { plan: 'pro', periode: null });
  // Une note de la veille ne compte plus.
  assert.deepEqual(achatDeRetour('?paiement=starter', { ...note, ts: maintenant - 86_400_000 }, maintenant), { plan: 'starter', periode: null });
  // Le bloc d'où l'on venait revient avec l'achat, pour s'en resservir aussitôt.
  assert.deepEqual(achatDeRetour('?paiement=starter', { ...note, pour: 'programmation', bloc: 'n1a2b' }, maintenant), { plan: 'starter', periode: 'an', pour: 'programmation', avant: 'gratuit', bloc: 'n1a2b' });
  // Une note abîmée garde ce qui se lit.
  assert.deepEqual(achatDeRetour('?paiement=starter', { ...note, periode: 'semaine', pour: 'toString', avant: 'or', bloc: '"><img>' }, maintenant), { plan: 'starter', periode: null });
  assert.deepEqual(achatDeRetour('?paiement=starter', null, maintenant), { plan: 'starter', periode: null });
  // Pas d'offre payante nommée : pas de retour de paiement.
  assert.equal(achatDeRetour('?paiement=gratuit', note, maintenant), null);
  assert.equal(achatDeRetour('?paiement=', note, maintenant), null);
  assert.equal(achatDeRetour('?onglet=stats', note, maintenant), null);
});

test('« C’est fait » attend l’abonnement écrit par le serveur, jamais l’adresse', () => {
  const achat = { plan: 'starter' as const, periode: 'an' as const };
  // Le webhook n'est pas encore passé : la page est toujours en Gratuit.
  assert.equal(etapeRetour(achat, { plan: 'gratuit', periode: null }, 0), 'activation');
  assert.equal(etapeRetour(achat, null, 3), 'activation');
  assert.equal(etapeRetour(achat, { plan: 'starter', periode: 'an' }, 2), 'fait');
  // Passer de Starter au mois à Starter à l'année : la même offre ne suffit pas, il faut la nouvelle période.
  assert.equal(etapeRetour(achat, { plan: 'starter', periode: 'mois' }, 2), 'activation');
  // Sans la période (pas de note), l'offre suffit.
  assert.equal(etapeRetour({ plan: 'starter', periode: null }, { plan: 'starter', periode: 'mois' }, 2), 'fait');
  // Trop longtemps sans nouvelles : on cesse d'attendre à l'écran, sans rien accorder.
  assert.equal(etapeRetour(achat, { plan: 'gratuit', periode: null }, ESSAIS_RAPIDES), 'attente');
  // Et si l'offre arrive ensuite, c'est fait.
  assert.equal(etapeRetour(achat, { plan: 'starter', periode: 'an' }, ESSAIS_RAPIDES + 4), 'fait');
});

test('l’abonnement se relit vite, puis plus calmement, puis plus du tout', () => {
  assert.equal(delaiAvantEssai(0), 2000);
  assert.equal(delaiAvantEssai(ESSAIS_RAPIDES - 1), 2000);
  assert.equal(delaiAvantEssai(ESSAIS_RAPIDES), 10_000);
  assert.equal(delaiAvantEssai(ESSAIS_MAX - 1), 10_000);
  assert.equal(delaiAvantEssai(ESSAIS_MAX), null);
});
