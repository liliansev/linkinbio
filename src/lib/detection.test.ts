import test from 'node:test';
import assert from 'node:assert/strict';
import { adresseFlux, chaineYoutube, ficheProduit, lienAffilie, pourReserver, pourSoutenir, suggestion, typeDeAdresse, versType } from './detection.ts';
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

test('un bloc qui change de type garde ce que les deux types montrent : sous-titre, icône, animation', () => {
  const lien = { ...nouveauBloc('lien', 'x'), url: 'https://cal.com/lilian', sousTitre: '30 minutes, offert', icone: 'calendrier', animation: 'lueur' as const };
  const rdv = versType(lien, 'reservation', false);
  assert.equal(rdv.sousTitre, '30 minutes, offert');
  assert.equal(rdv.icone, 'calendrier');
  assert.equal(rdv.animation, 'lueur');
  // Un produit n'a ni sous-titre ni icône ; « Me soutenir » n'a ni icône ni animation.
  const produit = versType(lien, 'produit', false);
  assert.equal(produit.sousTitre, '');
  assert.equal(produit.icone, '');
  assert.equal(produit.animation, 'lueur');
  const soutien = versType(lien, 'soutien', false);
  assert.equal(soutien.sousTitre, '30 minutes, offert');
  assert.equal(soutien.icone, '');
  assert.equal(soutien.animation, 'auto');
  // Et le chemin inverse : la prise de rendez-vous rendue à un lien garde les siens.
  assert.equal(versType(rdv, 'lien', false).icone, 'calendrier');
  assert.equal(versType(rdv, 'lien', false).sousTitre, '30 minutes, offert');
});

test('un lien d’affiliation se reconnaît à sa régie ou à ses paramètres, un `ref` seul ne compte pas', () => {
  for (const url of [
    'https://amzn.to/3xYz12',
    'https://amzn.eu/d/abc',
    'https://www.amazon.fr/dp/B0C123?tag=lilian-21',
    'https://www.amazon.fr/shop/lilian',
    'https://www.awin1.com/cread.php?awinmid=1&awinaffid=2',
    'https://tidd.ly/3abc',
    'https://clk.tradedoubler.com/click?p=1&a=2',
    'https://click.linksynergy.com/deeplink?id=abc',
    'https://www.anrdoezrs.net/click-123-456',
    'https://notion.sjv.io/abc',
    'https://go.skimresources.com/?id=1&url=x',
    'https://rstyle.me/+abc',
    'https://liketk.it/4abc',
    'https://geni.us/abc',
    'https://lilian.gumroad.com/l/carnet?a=123456',
    'https://gumroad.com/a/123456/abc',
    'https://outil.com/?via=lilian',
    'https://outil.com/?fpr=lilian',
    'https://boutique.lemonsqueezy.com/checkout/buy/abc?aff=123',
    'https://outil.com/tarifs?utm_source=x&utm_medium=affiliate',
  ]) assert.equal(lienAffilie(url), true, url);
  for (const url of [
    'https://www.amazon.fr/dp/B0C123',
    'https://lilian.gumroad.com/l/carnet',
    'https://outil.com/?ref=instagram',
    'https://monsite.fr/blog?utm_source=instagram&utm_medium=social',
    'https://data.co/',
    'mailto:lilian@exemple.fr',
    'pas une adresse',
  ]) assert.equal(lienAffilie(url), false, url);
});

test('une chaîne YouTube ou un flux RSS restent des liens, et proposent d’en faire la dernière vidéo ou les derniers articles', () => {
  assert.equal(chaineYoutube('https://www.youtube.com/@lilian'), true);
  assert.equal(chaineYoutube('https://m.youtube.com/channel/UCabcdefghijklmnopqrstuv'), true);
  assert.equal(chaineYoutube('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), false);
  assert.equal(chaineYoutube('https://www.youtube.com/c'), false);
  for (const url of ['https://blog.fr/feed', 'https://blog.fr/feed/', 'https://pod.fr/rss.xml', 'https://feeds.acast.com/public/shows/x', 'https://anchor.fm/s/abc/podcast/rss', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCx']) {
    assert.equal(adresseFlux(url), true, url);
  }
  assert.equal(adresseFlux('https://blog.fr/articles/feedback'), false);
  assert.equal(suggestion('https://www.youtube.com/@lilian'), 'derniere-video');
  assert.equal(suggestion('https://blog.fr/feed'), 'flux');
  assert.equal(suggestion('https://blog.fr/'), null);
  assert.equal(typeDeAdresse('https://www.youtube.com/@lilian', true), 'lien');
  assert.equal(typeDeAdresse('https://blog.fr/feed', true), 'lien');
});
