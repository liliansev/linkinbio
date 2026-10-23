import test from 'node:test';
import assert from 'node:assert/strict';
import { ficheProduit, pourReserver, pourSoutenir, typeDeAdresse, versType } from './detection.ts';
import { nouveauBloc } from './types.ts';

test('une vidéo YouTube, un agenda, un soutien ou un produit se reconnaissent à leur adresse', () => {
  for (const [url, type] of [
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'video'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'video'],
    ['https://youtube.com/shorts/dQw4w9WgXcQ', 'video'],
    ['https://cal.com/lilian/30min', 'reservation'],
    ['https://calendly.com/camille/decouverte', 'reservation'],
    ['https://app.lemcal.com/@lilian/decouverte', 'reservation'],
    ['https://calendar.app.google/abc123', 'reservation'],
    ['https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ1', 'reservation'],
    ['https://www.planity.com/salon-camille-75011-paris', 'reservation'],
    ['https://www.doctolib.fr/osteopathe/paris/camille-martin', 'reservation'],
    ['https://camille.as.me/', 'reservation'],
    ['https://paypal.me/lilian', 'soutien'],
    ['https://ko-fi.com/camille', 'soutien'],
    ['https://fr.tipeee.com/camille', 'soutien'],
    ['https://www.patreon.com/camille', 'soutien'],
    ['https://www.etsy.com/fr/listing/123456/carnet-de-recettes', 'produit'],
    ['https://camille.gumroad.com/l/guide', 'produit'],
    ['https://stan.store/camille/p/mon-guide', 'produit'],
    ['https://ko-fi.com/s/a1b2c3', 'produit'],
  ] as const) assert.equal(typeDeAdresse(url, true), type, url);
});

test('l’accueil d’un agenda ou d’un site de soutien, une chaîne YouTube ou une page ordinaire restent des liens', () => {
  for (const url of [
    'https://calendly.com/', 'https://calendly.com/pricing', 'https://cal.com/', 'https://calendar.google.com/calendar/r',
    'https://www.paypal.com/fr/home', 'https://ko-fi.com/', 'https://www.patreon.com/posts/mon-annonce-123', 'https://ko-fi.com/post/merci-A1',
    'https://www.youtube.com/@lilian', 'https://www.etsy.com/shop/camille', 'https://gumroad.com/', 'https://atelier-camille.fr/products/bol',
    'https://hopla.page/lilian', 'pas une adresse',
  ]) assert.equal(typeDeAdresse(url, true), 'lien', url);
});

test('sans la vitrine, un agenda, un soutien ou un produit restent des liens ; une vidéo reste une vidéo', () => {
  assert.equal(typeDeAdresse('https://cal.com/lilian', false), 'lien');
  assert.equal(typeDeAdresse('https://paypal.me/lilian', false), 'lien');
  assert.equal(typeDeAdresse('https://www.etsy.com/listing/1/x', false), 'lien');
  assert.equal(typeDeAdresse('https://youtu.be/dQw4w9WgXcQ', false), 'video');
  assert.equal(pourReserver('https://zcal.co/camille'), true);
  assert.equal(pourSoutenir('https://buymeacoffee.com/camille'), true);
  assert.equal(ficheProduit('https://payhip.com/b/AbC1'), true);
});

test('un bloc neuf qui change de type garde son adresse, sa programmation et le texte tapé à la main', () => {
  const lien = { ...nouveauBloc('lien', 'x'), url: 'https://cal.com/lilian', titre: 'Cal', image: '/media/a.webp', debut: '2026-11-01T09:00', public: false, vedette: true };
  const rdv = versType(lien, 'reservation', false);
  assert.equal(rdv.type, 'reservation');
  assert.equal(rdv.id, 'x');
  assert.equal(rdv.url, lien.url);
  assert.equal(rdv.titre, 'Prendre rendez-vous');
  assert.equal(rdv.image, '');
  assert.equal(rdv.debut, lien.debut);
  assert.equal(rdv.public, false);
  assert.equal(rdv.vedette, true);
  assert.equal(versType(lien, 'reservation', true).titre, 'Cal');
  // « Me soutenir » ne se met pas en avant.
  assert.equal(versType(lien, 'soutien', false).vedette, false);
  assert.deepEqual(versType(lien, 'soutien', false).montants, nouveauBloc('soutien', 'x').montants);
});
