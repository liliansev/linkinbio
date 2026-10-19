import test from 'node:test';
import assert from 'node:assert/strict';
import { basculerPour, composerAudience, enTetePour, provenance, reseauxDePartage } from './provenance.ts';
import { nouveauBloc } from './types.ts';
import { validerBloc } from './valider.ts';

const IOS_TIKTOK = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_36.0 BytedanceWebview/d8a21c6';
const ANDROID_INSTA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36 Instagram 350.0.0.0 Android';
const THREADS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Barcelona 289.0.0.77.109';

test('la provenance se lit dans le paramètre, puis l’app, puis le site d’origine', () => {
  assert.equal(provenance({ s: 'TT' }), 'tiktok');
  assert.equal(provenance({ s: 'linkedin', ua: IOS_TIKTOK }), 'linkedin', 'le paramètre de la bio l’emporte');
  assert.equal(provenance({ ua: IOS_TIKTOK }), 'tiktok', 'TikTok tait le référent mais se nomme');
  assert.equal(provenance({ ua: ANDROID_INSTA, referent: '' }), 'instagram');
  assert.equal(provenance({ ua: THREADS }), 'threads');
  assert.equal(provenance({ referent: 'https://www.linkedin.com/feed/' }), 'linkedin');
  assert.equal(provenance({ s: 'inconnu', referent: 'https://exemple.fr' }), '');
});

test('un bloc passe en tête, ou n’apparaît que, pour son public', () => {
  const lien = (id: string, champs = {}) => ({ ...nouveauBloc('lien', id), url: 'https://exemple.fr/', ...champs });
  const blocs = [lien('a'), lien('tiktok', { audience: { sources: ['tiktok'], effet: 'avant' } }), lien('cv', { audience: { sources: ['linkedin'], effet: 'seulement' } })];
  assert.deepEqual(composerAudience(blocs, 'tiktok').map(b => b.id), ['tiktok', 'a']);
  assert.equal(composerAudience(blocs, 'tiktok')[0].vedette, true);
  assert.deepEqual(composerAudience(blocs, 'linkedin').map(b => b.id), ['a', 'tiktok', 'cv']);
  assert.deepEqual(composerAudience(blocs, '').map(b => b.id), ['a', 'tiktok']);
  assert.deepEqual(validerBloc({ audience: { sources: ['tiktok', 'myspace'], effet: 'rien' } }, 'x').audience, { sources: ['tiktok'], effet: 'avant' });
  assert.equal(validerBloc({ audience: { sources: [] } }, 'x').audience, null);
});

test('la vue par réseau : un bloc caché pour Instagram disparaît pour Instagram seulement', () => {
  const b = { ...nouveauBloc('lien', 'a'), url: 'https://exemple.fr', titre: 'A' };
  const cache = { ...b, ...basculerPour(b, 'instagram', false) };
  assert.deepEqual(cache.cache, ['instagram']);
  assert.equal(composerAudience([cache], 'instagram').length, 0);
  assert.equal(composerAudience([cache], 'tiktok').length, 1);
  assert.equal(composerAudience([cache], '').length, 1);
  const remis = { ...cache, ...basculerPour(cache, 'instagram', true) };
  assert.deepEqual(remis.cache, []);
  // Un bloc réservé à TikTok, rendu visible depuis la vue Instagram, s'ouvre aussi à Instagram.
  const reserve = { ...b, audience: { sources: ['tiktok' as const], effet: 'seulement' as const } };
  const ouvert = { ...reserve, ...basculerPour(reserve, 'instagram', true) };
  assert.equal(composerAudience([ouvert], 'instagram').length, 1);
});

test('en tête sur un réseau : le bloc passe premier pour ce réseau seulement', () => {
  const a = { ...nouveauBloc('lien', 'a'), titre: 'A' }, b = { ...nouveauBloc('lien', 'b'), titre: 'B' };
  const cv = { ...b, ...enTetePour(b, 'linkedin', true) };
  assert.deepEqual(composerAudience([a, cv], 'linkedin').map(x => x.id), ['b', 'a']);
  assert.deepEqual(composerAudience([a, cv], 'tiktok').map(x => x.id), ['a', 'b']);
  assert.equal({ ...cv, ...enTetePour(cv, 'linkedin', false) }.audience, null);
});

test('sans choix aux premiers pas, les réseaux les plus connus', () => {
  assert.ok(reseauxDePartage([]).includes('instagram'));
  assert.deepEqual(reseauxDePartage(['tiktok']), ['tiktok']);
});

test('deReseau élide devant une voyelle', async () => {
  const { deReseau } = await import('./provenance.ts');
  assert.equal(deReseau('instagram'), 'd’Instagram');
  assert.equal(deReseau('tiktok'), 'de TikTok');
  assert.equal(deReseau('youtube'), 'de YouTube');
  assert.equal(deReseau('qr'), 'd’un QR code');
});
