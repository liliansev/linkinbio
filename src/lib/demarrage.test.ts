import test from 'node:test';
import assert from 'node:assert/strict';
import { etapesDemarrage } from './demarrage.ts';
import { reglagesNouveauCompte } from './defauts.ts';
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
  const e = etapesDemarrage(r, [lien('a', 'https://a.fr'), lien('b', ''), lien('c', 'https://c.fr', false)], false).find(x => x.id === 'lien')!;
  assert.equal(e.faite, false);
  assert.match(e.aide, /1 sur 3/);
});
