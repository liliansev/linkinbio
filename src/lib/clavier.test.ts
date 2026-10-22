import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

function composants(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap(e => {
    const chemin = join(dossier, e.name);
    return e.isDirectory() ? composants(chemin) : e.name.endsWith('.tsx') ? [chemin] : [];
  });
}

test("aucun champ ne prend la main tout seul sur un écran tactile : un autoFocus passe par focusAuto (un bouton excepté)", () => {
  const racine = fileURLToPath(new URL('..', import.meta.url));
  const fautifs: string[] = [];
  for (const fichier of composants(racine)) {
    readFileSync(fichier, 'utf8').split('\n').forEach((ligne, i) => {
      if (/\bautoFocus\b(?!=\{focusAuto\()/.test(ligne) && !/<button\b/.test(ligne) && !/^\s*(\/\/|\*|\{\/\*)/.test(ligne))
        fautifs.push(`${fichier.slice(racine.length)}:${i + 1}`);
    });
  }
  assert.deepEqual(fautifs, []);
});
