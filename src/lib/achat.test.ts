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
  // Le bloc de la vitrine qu'on voulait en faire, et l'adresse qu'il prendra, reviennent aussi ; une adresse qui n'en est pas une, non.
  assert.deepEqual(achatDeRetour('?paiement=starter', { ...note, pour: 'vitrine', type: 'reservation', url: 'https://calendly.com/lilian/30min' }, maintenant),
    { plan: 'starter', periode: 'an', pour: 'vitrine', avant: 'gratuit', type: 'reservation', url: 'https://calendly.com/lilian/30min' });
  assert.deepEqual(achatDeRetour('?paiement=starter', { ...note, pour: 'vitrine', type: 'video', url: 'javascript:alert(1)' }, maintenant), { plan: 'starter', periode: 'an', pour: 'vitrine', avant: 'gratuit' });
  // Un bloc neuf, parti masqué, se rouvre à ajouter ; venu d'Intégrations, il y ramène. Seul `true` compte.
  assert.deepEqual(achatDeRetour('?paiement=starter', { ...note, pour: 'vitrine', bloc: 'n1a2b', type: 'reservation', neuf: true, integrations: true }, maintenant),
    { plan: 'starter', periode: 'an', pour: 'vitrine', avant: 'gratuit', bloc: 'n1a2b', type: 'reservation', neuf: true, integrations: true });
  assert.deepEqual(achatDeRetour('?paiement=starter', { ...note, neuf: 'oui', integrations: 1 }, maintenant), { plan: 'starter', periode: 'an', pour: 'couleurs', avant: 'gratuit' });
  // Un abonné qui change d'offre : la période d'avant revient aussi, pour dire si Creem facture ou rend la différence.
  assert.deepEqual(achatDeRetour('?paiement=starter', { ...note, avant: 'pro', periodeAvant: 'an' }, maintenant), { plan: 'starter', periode: 'an', pour: 'couleurs', avant: 'pro', periodeAvant: 'an' });
  assert.deepEqual(achatDeRetour('?paiement=starter', { ...note, periodeAvant: 'jour' }, maintenant), { plan: 'starter', periode: 'an', pour: 'couleurs', avant: 'gratuit' });
  // L'offre offerte qui passait devant l'abonnement revient aussi : ce qui s'ouvre se compte depuis elle.
  assert.deepEqual(achatDeRetour('?paiement=pro', { ...note, plan: 'pro', deja: 'starter' }, maintenant), { plan: 'pro', periode: 'an', pour: 'couleurs', avant: 'gratuit', deja: 'starter' });
  // Une note abîmée garde ce qui se lit.
  assert.deepEqual(achatDeRetour('?paiement=starter', { ...note, periode: 'semaine', pour: 'toString', avant: 'or', deja: 'or', bloc: '"><img>' }, maintenant), { plan: 'starter', periode: null });
  assert.deepEqual(achatDeRetour('?paiement=starter', null, maintenant), { plan: 'starter', periode: null });
  // Pas d'offre payante nommée : pas de retour de paiement.
  assert.equal(achatDeRetour('?paiement=gratuit', note, maintenant), null);
  assert.equal(achatDeRetour('?paiement=', note, maintenant), null);
  assert.equal(achatDeRetour('?onglet=stats', note, maintenant), null);
});

test('« C’est fait » attend l’abonnement écrit par le serveur, jamais l’adresse', () => {
  const achat = { plan: 'starter' as const, periode: 'an' as const };
  // Le webhook n'est pas encore passé : la page est toujours en Gratuit.
  assert.equal(etapeRetour(achat, { payee: 'gratuit', periode: null }, 0), 'activation');
  assert.equal(etapeRetour(achat, null, 3), 'activation');
  assert.equal(etapeRetour(achat, { payee: 'starter', periode: 'an' }, 2), 'fait');
  // Passer de Starter au mois à Starter à l'année : la même offre ne suffit pas, il faut la nouvelle période.
  assert.equal(etapeRetour(achat, { payee: 'starter', periode: 'mois' }, 2), 'activation');
  // Sans la période (pas de note), l'offre suffit.
  assert.equal(etapeRetour({ plan: 'starter', periode: null }, { payee: 'starter', periode: 'mois' }, 2), 'fait');
  // Une offre offerte au-dessus ne compte pas : seul l'abonnement payé dit que c'est fait.
  const offert = { plan: 'pro' as const, payee: 'gratuit' as const, periode: null };
  assert.equal(etapeRetour(achat, offert, 0), 'activation');
  assert.equal(etapeRetour(achat, { ...offert, payee: 'starter', periode: 'an' }, 0), 'fait');
  // Trop longtemps sans nouvelles : on cesse d'attendre à l'écran, sans rien accorder.
  assert.equal(etapeRetour(achat, { payee: 'gratuit', periode: null }, ESSAIS_RAPIDES), 'attente');
  // Et si l'offre arrive ensuite, c'est fait.
  assert.equal(etapeRetour(achat, { payee: 'starter', periode: 'an' }, ESSAIS_RAPIDES + 4), 'fait');
});

test('l’abonnement se relit vite, puis plus calmement, puis plus du tout', () => {
  assert.equal(delaiAvantEssai(0), 2000);
  assert.equal(delaiAvantEssai(ESSAIS_RAPIDES - 1), 2000);
  assert.equal(delaiAvantEssai(ESSAIS_RAPIDES), 10_000);
  assert.equal(delaiAvantEssai(ESSAIS_MAX - 1), 10_000);
  assert.equal(delaiAvantEssai(ESSAIS_MAX), null);
});
