import test from 'node:test';
import assert from 'node:assert/strict';
import { resumer } from './resume.ts';
import type { Stats } from './types.ts';

const serie = (vues: number[]) => vues.map((v, i) => ({ jour: `2026-10-${String(13 + i).padStart(2, '0')}`, vues: v, clics: Math.round(v / 3) }));

test('les stats en phrases : ce qui monte, le meilleur jour, d’où vient le monde', () => {
  const s: Stats = {
    jours: 7, vues: 400, visiteurs: 300, clics: 120, serie: serie([30, 200, 40, 30, 40, 30, 30]),
    blocs: [{ id: 'yt', titre: 'YouTube', clics: 52, avant: 37 }, { id: 'site', titre: 'Mon site', clics: 6, avant: 5 }],
    sources: [{ nom: 'Direct', vues: 150, avant: 100 }, { nom: 'TikTok', vues: 120, avant: 50 }],
    appareils: [], apps: { integres: 40, versApp: 30, ouverts: 28 }, precedent: { vues: 300, visiteurs: 250, clics: 90 }, dejaVue: true,
  };
  const textes = resumer(s).map(p => p.texte);
  assert.equal(textes[0], 'Ta page a eu 400 vues, 33 % de plus que la semaine d’avant.');
  assert.equal(textes[1], 'Ton lien « YouTube » a fait +41 % de clics (52 contre 37).');
  assert.match(textes[2], /^Ton meilleur jour : mercredi 14 octobre, avec 200 vues/);
  assert.equal(textes[3], 'TikTok t’a amené 120 visites, deux fois plus que la semaine d’avant.');
  assert.equal(resumer({ ...s, vues: 0 })[0].ton, 'neutre');
});
