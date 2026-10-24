import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceDe } from '../lib/avis.ts';
import { noteDePage } from './avis.ts';

test('la note d’une page d’avis se lit dans son JSON-LD, ramenée sur 5', () => {
  const html = `<html><head><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"LocalBusiness","name":"Atelier","aggregateRating":{"@type":"AggregateRating","ratingValue":"4,6","bestRating":"5","reviewCount":"1 234"}}]}</script></head></html>`;
  assert.deepEqual(noteDePage(html, 'https://fr.trustpilot.com/review/atelier.fr'), { note: 4.6, nombre: 1234, source: 'Trustpilot' });
  const sur10 = `<script type="application/ld+json">{"@type":"AggregateRating","ratingValue":9,"bestRating":10,"ratingCount":80}</script>`;
  assert.deepEqual(noteDePage(sur10, 'https://www.avis-verifies.com/avis-clients/atelier.fr'), { note: 4.5, nombre: 80, source: 'Avis Vérifiés' });
});

test('Trustpilot redit sa note dans ses données de page', () => {
  const html = `<script id="__NEXT_DATA__">{"businessUnit":{"trustScore":4.2,"numberOfReviews":{"total":512}}}</script>`;
  assert.deepEqual(noteDePage(html, 'https://www.trustpilot.com/review/atelier.fr'), { note: 4.2, nombre: 512, source: 'Trustpilot' });
});

test('une page sans note, une note hors échelle ou sans avis ne donne rien', () => {
  assert.equal(noteDePage('<html><head><title>Atelier</title></head></html>', 'https://atelier.fr'), null);
  assert.equal(noteDePage(`<script type="application/ld+json">{"aggregateRating":{"ratingValue":7,"reviewCount":3}}</script>`, 'https://atelier.fr'), null);
  assert.equal(noteDePage(`<script type="application/ld+json">{"aggregateRating":{"ratingValue":4.8,"reviewCount":0}}</script>`, 'https://atelier.fr'), null);
});

test('le site des avis se nomme d’après son adresse', () => {
  assert.equal(sourceDe('https://g.page/atelier'), 'Google');
  assert.equal(sourceDe('https://www.malt.fr/profile/lou'), 'Malt');
  assert.equal(sourceDe('https://atelier.fr'), '');
});
