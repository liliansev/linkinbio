import test from 'node:test';
import assert from 'node:assert/strict';
import { dureeLisible, estAudio, estDocument, plage, typeFichier } from './fichiers.ts';

const octets = (debut: number[] | string, taille = 32) => {
  const o = new Uint8Array(taille);
  o.set(typeof debut === 'string' ? [...debut].map(c => c.charCodeAt(0)) : debut);
  return o;
};

test('le type d’un fichier se lit dans ses premiers octets', () => {
  assert.equal(typeFichier(octets('%PDF-1.7')), 'pdf');
  assert.equal(typeFichier(octets('ID3')), 'mp3');
  assert.equal(typeFichier(octets([0xff, 0xfb, 0x90])), 'mp3');
  assert.equal(typeFichier(octets([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70])), 'm4a');
  assert.equal(typeFichier(octets('OggS')), 'ogg');
  assert.equal(typeFichier(octets([0x1a, 0x45, 0xdf, 0xa3])), 'webm');
  assert.equal(typeFichier(octets('RIFF\0\0\0\0WAVE')), 'wav');
  // Une page HTML, un script, une image ou un fichier trop court ne passent pas.
  assert.equal(typeFichier(octets('<!doctype html><script>')), null);
  assert.equal(typeFichier(octets('RIFF\0\0\0\0WEBP')), null);
  assert.equal(typeFichier(octets(' %PDF-1.7')), null);
  assert.equal(typeFichier(octets('%PDF-', 5)), null);
});

test('seules les adresses de fichiers gardés chez Hopla sont reconnues', () => {
  assert.equal(estDocument('/media/abc123.pdf'), true);
  assert.equal(estDocument('/media/abc123.mp3'), false);
  assert.equal(estDocument('https://exemple.fr/x.pdf'), false);
  assert.equal(estDocument('/media/../x.pdf'), false);
  assert.equal(estAudio('/media/abc-1_2.webm'), true);
  assert.equal(estAudio('/media/abc.m4a'), true);
  assert.equal(estAudio('/media/abc.pdf'), false);
  assert.equal(estAudio(null), false);
});

test('une durée se lit comme sur un lecteur, une plage se borne au fichier', () => {
  assert.equal(dureeLisible(42), '0:42');
  assert.equal(dureeLisible(185.4), '3:05');
  assert.equal(dureeLisible(-3), '0:00');
  assert.deepEqual(plage('bytes=0-', 1000), { de: 0, a: 999 });
  assert.deepEqual(plage('bytes=0-1', 1000), { de: 0, a: 1 });
  assert.deepEqual(plage('bytes=500-5000', 1000), { de: 500, a: 999 });
  assert.deepEqual(plage('bytes=-100', 1000), { de: 900, a: 999 });
  assert.equal(plage('bytes=1000-', 1000), null);
  assert.equal(plage('bytes=5-2', 1000), null);
  assert.equal(plage('octets=0-1', 1000), null);
  assert.equal(plage(null, 1000), null);
});
