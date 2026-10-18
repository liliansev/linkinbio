import test from 'node:test';
import assert from 'node:assert/strict';
import { THEMES_ACCUEIL, etapesDemarrage, nomSite, pageNeuve, urlReseau } from './demarrage.ts';
import { REGLAGES_DEFAUT, reglagesNouveauCompte } from './defauts.ts';
import { THEMES } from './themes.ts';
import { nouveauBloc } from './types.ts';
import type { Bloc } from './types.ts';

const lien = (id: string, url: string, publicOk = true): Bloc => ({ ...nouveauBloc('lien', id), url, public: publicOk });
const faites = (e: ReturnType<typeof etapesDemarrage>) => e.filter(x => x.faite).map(x => x.id);

test('un compte neuf commence avec tout à faire', () => {
  assert.deepEqual(faites(etapesDemarrage(reglagesNouveauCompte('marie'), [], false)), []);
});

test('les étapes se cochent quand la page se remplit', () => {
  const r = reglagesNouveauCompte('marie');
  const pleine = { ...r, theme: 'onyx', profil: { ...r.profil, avatar: '/img/a.webp', bio: 'Céramiste à Lyon' }, reseaux: [{ reseau: 'instagram' as const, url: 'https://instagram.com/marie' }] };
  const blocs = [lien('a', 'https://a.fr'), lien('b', 'https://b.fr'), lien('c', 'https://c.fr')];
  assert.equal(etapesDemarrage(pleine, blocs, true).every(e => e.faite), true);
});

test('seuls les liens publics avec une adresse comptent', () => {
  const r = reglagesNouveauCompte('marie');
  const etape = (blocs: Bloc[]) => etapesDemarrage(r, blocs, false).find(x => x.id === 'lien')!;
  assert.equal(etape([lien('b', ''), lien('c', 'https://c.fr', false)]).faite, false);
  assert.equal(etape([lien('a', 'https://a.fr'), lien('b', '')]).faite, true);
});

test('les premiers pas ne s’ouvrent que sur une page où rien n’est posé', () => {
  const r = reglagesNouveauCompte('marie');
  assert.equal(pageNeuve(r, []), true);
  assert.equal(pageNeuve(r, [lien('a', 'https://a.fr')]), false);
  assert.equal(pageNeuve({ ...r, profil: { ...r.profil, bio: 'Céramiste' } }, []), false);
  assert.equal(pageNeuve({ ...r, reseaux: [{ reseau: 'instagram', url: 'https://instagram.com/marie' }] }, []), false);
  assert.equal(pageNeuve(REGLAGES_DEFAUT, []), false);
});

test('un pseudo devient l’adresse du réseau, une adresse complète reste telle quelle', () => {
  assert.equal(urlReseau('instagram', '@marie.ceramique'), 'https://instagram.com/marie.ceramique');
  assert.equal(urlReseau('tiktok', 'marie'), 'https://tiktok.com/@marie');
  assert.equal(urlReseau('youtube', '@MarieCeramique'), 'https://youtube.com/@MarieCeramique');
  assert.equal(urlReseau('linkedin', 'marie-durand'), 'https://linkedin.com/in/marie-durand');
  assert.equal(urlReseau('instagram', 'instagram.com/marie'), 'https://instagram.com/marie');
  assert.equal(urlReseau('spotify', 'https://open.spotify.com/artist/1'), 'https://open.spotify.com/artist/1');
  assert.equal(urlReseau('spotify', 'marie'), '');
  assert.equal(urlReseau('email', 'marie@atelier.fr'), 'mailto:marie@atelier.fr');
  assert.equal(urlReseau('email', 'marie'), '');
  assert.equal(urlReseau('instagram', 'marie durand'), '');
  assert.equal(urlReseau('instagram', '  '), '');
});

test('les thèmes proposés à l’arrivée existent tous', () => {
  for (const id of THEMES_ACCUEIL) assert.ok(THEMES.some(t => t.id === id), id);
  assert.equal(nomSite('https://www.atelier-marie.fr/boutique'), 'atelier-marie.fr');
  assert.equal(nomSite('pas une adresse'), '');
});
