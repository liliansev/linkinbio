import test from 'node:test';
import assert from 'node:assert/strict';
import { enUnePhrase, resumer } from './resume.ts';
import type { Stats } from './types.ts';

const serie = (vues: number[]) => vues.map((v, i) => ({ jour: `2026-10-${String(13 + i).padStart(2, '0')}`, vues: v, visiteurs: Math.round(v * 0.75), clics: Math.round(v / 3) }));

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

test('les stats en une phrase, en tête de l’onglet', () => {
  const s: Stats = {
    jours: 30, vues: 2877, visiteurs: 2129, clics: 1096, serie: serie([90, 100, 95, 92, 98, 101, 99]),
    blocs: [], sources: [{ nom: 'Instagram', vues: 1093, avant: 1500 }, { nom: 'Direct', vues: 345, avant: 500 }],
    appareils: [], apps: { integres: 0, versApp: 0, ouverts: 0 }, precedent: { vues: 4294, visiteurs: 3170, clics: 1660 }, dejaVue: true,
  };
  // Les milliers et le pourcentage se séparent d'une espace fine insécable, comme partout en français.
  assert.equal(enUnePhrase(s), 'En 30 jours, ta page a eu 2 877 vues, 33 % de moins que les 30 jours d’avant, et Instagram t’amène le plus de monde.');
  // Trop peu de vues avant pour comparer : le total, et d'où vient le monde.
  assert.equal(enUnePhrase({ ...s, jours: 7, vues: 120, precedent: { vues: 4, visiteurs: 3, clics: 1 } }), 'En 7 jours, ta page a eu 120 vues et Instagram t’amène le plus de monde.');
  // Ni comparaison ni provenance : les vues et les clics.
  assert.equal(enUnePhrase({ ...s, jours: 7, vues: 6, clics: 2, sources: [{ nom: 'Direct', vues: 6, avant: 0 }], precedent: { vues: 3, visiteurs: 3, clics: 1 } }), 'En 7 jours, ta page a eu 6 vues et 2 clics.');
  // Un petit écart ne fait pas une nouvelle.
  assert.equal(enUnePhrase({ ...s, jours: 365, vues: 105, sources: [], precedent: { vues: 100, visiteurs: 80, clics: 30 } }), 'En un an, ta page a eu 105 vues, à peu près autant que l’année d’avant.');
  // Le QR code se dit avec son article.
  assert.match(enUnePhrase({ ...s, sources: [{ nom: 'QR code', vues: 40, avant: 0 }] }), /, et ton QR code t’amène le plus de monde\.$/);
  assert.match(enUnePhrase({ ...s, vues: 0 }), /^En 30 jours, pas encore de visite\./);
});
