import test from 'node:test';
import assert from 'node:assert/strict';
import { adresseIntegree, agendaDe, avecMontants, lienMontant, lienSansMontant, nomAgenda, nomSoutien, soutienDe } from './vitrine.ts';

test('reconnaît les sites de soutien, et nomme les autres par leur domaine', () => {
  assert.equal(soutienDe('https://paypal.me/lilian'), 'paypal');
  assert.equal(soutienDe('https://www.paypal.com/paypalme/lilian'), 'paypal');
  assert.equal(soutienDe('https://ko-fi.com/lilian'), 'kofi');
  assert.equal(soutienDe('https://fr.tipeee.com/lilian'), 'tipeee');
  assert.equal(soutienDe('https://lydia-app.com/collect/lilian'), 'lydia');
  assert.equal(soutienDe('https://www.buymeacoffee.com/lilian'), 'buymeacoffee');
  assert.equal(soutienDe('https://www.patreon.com/lilian'), 'patreon');
  assert.equal(soutienDe('https://www.paypal.com/fr/home'), null);
  assert.equal(soutienDe('pas une adresse'), null);
  assert.equal(nomSoutien('https://ko-fi.com/lilian'), 'Ko-fi');
  assert.equal(nomSoutien('https://www.cagnotte.fr/lilian'), 'cagnotte.fr');
});

test('PayPal.Me reprend le montant dans son adresse, en euros ; les autres sites le font choisir chez eux', () => {
  assert.equal(avecMontants('https://paypal.me/lilian'), true);
  assert.equal(lienMontant('https://paypal.me/lilian', 5), 'https://paypal.me/lilian/5EUR');
  // Un montant déjà dans l'adresse est remplacé, pas ajouté.
  assert.equal(lienMontant('https://www.paypal.me/lilian/20EUR?locale=fr', 3), 'https://paypal.me/lilian/3EUR');
  assert.equal(lienMontant('https://www.paypal.com/paypalme/lilian/10', 10), 'https://www.paypal.com/paypalme/lilian/10EUR');
  assert.equal(lienSansMontant('https://paypal.me/lilian/20EUR'), 'https://paypal.me/lilian');
  for (const url of ['https://ko-fi.com/lilian', 'https://paypal.me/', 'https://www.paypal.com/paypalme/']) {
    assert.equal(avecMontants(url), false, url);
    assert.equal(lienMontant(url, 5), url, url);
  }
});

test('Calendly, Cal.com et Google Agenda s’ouvrent dans la page ; Planity et les autres, à part', () => {
  assert.equal(adresseIntegree('https://calendly.com/lilian/30min', 'hopla.page'), 'https://calendly.com/lilian/30min?embed_domain=hopla.page&embed_type=Inline');
  assert.equal(adresseIntegree('https://calendly.com/lilian/30min?month=2026-11', 'hopla.page'), 'https://calendly.com/lilian/30min?month=2026-11&embed_domain=hopla.page&embed_type=Inline');
  assert.equal(adresseIntegree('https://cal.com/lilian/decouverte', 'hopla.page'), 'https://cal.com/lilian/decouverte');
  assert.equal(adresseIntegree('https://calendar.google.com/calendar/appointments/schedules/AcZssZ1', 'hopla.page'), 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ1?gv=true');
  // L'adresse courte de Google passe par une redirection que Google ne laisse pas intégrer.
  assert.equal(adresseIntegree('https://calendar.app.google/abc', 'hopla.page'), null);
  for (const url of ['https://www.planity.com/salon-camille-75011-paris', 'https://calendly.com/', 'http://calendly.com/lilian', 'https://www.doctolib.fr/x', 'nulle part'])
    assert.equal(adresseIntegree(url, 'hopla.page'), null, url);
  assert.equal(agendaDe('https://www.planity.com/salon'), 'planity');
  assert.equal(agendaDe('https://app.lemcal.com/@lilian/decouverte'), 'lemcal');
  assert.equal(agendaDe('https://cal.com/lilian'), 'calcom');
  assert.equal(nomAgenda('https://calendly.com/lilian'), 'Calendly');
  assert.equal(nomAgenda('https://www.doctolib.fr/x'), 'doctolib.fr');
});
