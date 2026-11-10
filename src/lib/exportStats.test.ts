import test from 'node:test';
import assert from 'node:assert/strict';
import type { Stats } from './types.ts';
import { csvStats } from './exportStats.ts';

const stats: Stats = {
  jours: 2, vues: 12, visiteurs: 9, clics: 4,
  serie: [{ jour: '2026-11-09', vues: 5, visiteurs: 4, clics: 1 }, { jour: '2026-11-10', vues: 7, visiteurs: 5, clics: 3 }],
  blocs: [{ id: 'a', titre: 'Ma boutique; "soldes"', clics: 4, avant: 0 }],
  sources: [{ nom: '=HYPERLINK("x")', vues: 2, avant: 0 }, { nom: 'Instagram', vues: 10, avant: 0 }],
  appareils: [{ nom: 'Mobile', vues: 12 }], pays: [{ code: 'FR', vues: 11, avant: 0 }, { code: '', vues: 1, avant: 0 }],
  villes: [{ nom: 'Lyon', code: 'FR', vues: 6 }], systemes: [{ nom: 'iOS', vues: 9 }], navigateurs: [{ nom: 'App Instagram', vues: 8 }], langues: [{ nom: 'fr', vues: 12 }],
  apps: { integres: 0, versApp: 0, ouverts: 0 }, precedent: { vues: 0, visiteurs: 0, clics: 0 }, dejaVue: true,
};

test('le CSV des stats : une ligne par chiffre, rangée par tableau, sans formule ni cellule cassée', () => {
  const lignes = csvStats(stats).replace('﻿', '').trimEnd().split('\n');
  assert.equal(lignes[0], 'tableau;nom;vues;visiteurs;clics');
  assert.equal(lignes[1], 'jour;2026-11-09;5;4;1');
  assert.ok(lignes.includes('lien;"Ma boutique; ""soldes""";;;4'));
  assert.ok(lignes.includes('provenance;"\'=HYPERLINK(""x"")";2;;'));
  assert.ok(lignes.includes('pays;Inconnu;1;;'));
  assert.ok(lignes.includes('ville;Lyon (FR);6;;'));
  assert.ok(lignes.includes('navigateur;App Instagram;8;;'));
  assert.equal(csvStats(stats, 'en').replace('﻿', '').split('\n')[0], 'table;name;views;visitors;clicks');
});
