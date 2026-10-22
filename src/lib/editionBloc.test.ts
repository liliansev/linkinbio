import test from 'node:test';
import assert from 'node:assert/strict';
import { memeBloc, verifierBloc } from './editionBloc.ts';
import { nouveauBloc } from './types.ts';
import type { Bloc } from './types.ts';

const lien = (champs: Partial<Bloc> = {}): Bloc => ({ ...nouveauBloc('lien', 'a'), ...champs });

test('un lien sans adresse ne s’enregistre pas, et l’erreur dit quoi faire', () => {
  assert.deepEqual(verifierBloc(lien()).erreurs, { url: 'Indique l’adresse du lien.' });
  assert.ok(verifierBloc(lien({ url: 'pas une adresse' })).erreurs?.url);
});

test('une adresse tapée sans https le prend, et un lien sans texte prend le nom du site', () => {
  const v = verifierBloc(lien({ url: 'atelier-marie.fr' }));
  assert.equal(v.bloc?.url, 'https://atelier-marie.fr/');
  assert.equal(v.bloc?.titre, 'Atelier Marie');
  assert.equal(verifierBloc(lien({ url: 'https://a.fr', titre: 'Mon site' })).bloc?.titre, 'Mon site');
});

test('un titre ou un texte vide attend, une vidéo veut une adresse YouTube', () => {
  assert.deepEqual(verifierBloc({ ...nouveauBloc('titre', 't'), titre: '  ' }).erreurs, { titre: 'Écris le titre.' });
  assert.deepEqual(verifierBloc(nouveauBloc('texte', 't')).erreurs, { titre: 'Écris le texte.' });
  assert.ok(verifierBloc({ ...nouveauBloc('video', 'v'), url: 'https://vimeo.com/1' }).erreurs?.url);
  assert.ok(verifierBloc({ ...nouveauBloc('video', 'v'), url: 'https://youtu.be/dQw4w9WgXcQ' }).bloc);
});

test('une note se tape avec son nombre d’avis et sa source, chacun dit ce qui lui manque', () => {
  const avis = { ...nouveauBloc('preuve', 'p'), preuve: { genre: 'note' as const, note: 0, nombre: 0, source: '' } };
  assert.deepEqual(Object.keys(verifierBloc(avis).erreurs ?? {}).sort(), ['nombre', 'note', 'source']);
  assert.ok(verifierBloc({ ...avis, preuve: { genre: 'note', note: 7, nombre: 12, source: 'Google' } }).erreurs?.note);
  assert.ok(verifierBloc({ ...avis, preuve: { genre: 'note', note: 4.8, nombre: 12, source: 'Google' } }).bloc);
});

test('la fin d’un bloc programmé vient après son début', () => {
  const b = lien({ url: 'https://a.fr', debut: '2026-11-02T10:00:00.000Z', fin: '2026-11-01T10:00:00.000Z' });
  assert.deepEqual(verifierBloc(b).erreurs, { dates: 'La fin doit venir après le début.' });
  assert.ok(verifierBloc({ ...b, fin: '2026-11-03T10:00:00.000Z' }).bloc);
});

test('la vitrine : une adresse de page web pour chacun, un nom pour un produit, un texte de départ pour les autres', () => {
  const produit = { ...nouveauBloc('produit', 'p'), url: 'etsy.com/fr/listing/1' };
  assert.deepEqual(verifierBloc(produit).erreurs, { titre: 'Écris le nom du produit.' });
  assert.deepEqual(verifierBloc({ ...produit, url: '' }).erreurs, { url: 'Indique l’adresse du produit sur ta boutique.' });
  assert.ok(verifierBloc({ ...produit, url: 'camille@exemple.fr', titre: 'Carnet' }).erreurs?.url, 'une adresse e-mail n’est pas une boutique');
  assert.equal(verifierBloc({ ...produit, titre: 'Carnet' }).bloc?.url, 'https://etsy.com/fr/listing/1');
  const soutien = { ...nouveauBloc('soutien', 's'), url: 'paypal.me/camille', titre: ' ', montants: [10, 3, 10] };
  assert.equal(verifierBloc(soutien).bloc?.titre, 'Me soutenir');
  assert.deepEqual(verifierBloc(soutien).bloc?.montants, [3, 10]);
  assert.equal(verifierBloc({ ...nouveauBloc('reservation', 'r'), url: 'calendly.com/camille', titre: '' }).bloc?.titre, 'Prendre rendez-vous');
  assert.deepEqual(verifierBloc(nouveauBloc('reservation', 'r')).erreurs, { url: 'Indique l’adresse de ton agenda.' });
  const partenaire = lien({ url: 'https://a.fr', titre: 'A', partenariat: { mention: 'publicite', code: ' CAMILLE10 ' } });
  assert.equal(verifierBloc(partenaire).bloc?.partenariat?.code, 'CAMILLE10');
});

test('l’enregistrement automatique ne réécrit pas une version identique', () => {
  const v = verifierBloc(lien({ url: 'https://a.fr', titre: 'A' })).bloc;
  assert.equal(memeBloc(v, { ...v! }), true);
  assert.equal(memeBloc(v, { ...v!, titre: 'B' }), false);
  assert.equal(memeBloc(v, null), false);
});
