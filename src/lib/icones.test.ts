import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICONES } from './icones.ts';

/** Les fichiers .tsx et .ts de `src`, sous-dossiers compris, sans les tests ni le code généré (le catalogue des blocs est en .ts). */
function composants(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap(e => {
    const chemin = join(dossier, e.name);
    return e.isDirectory() ? composants(chemin) : /\.tsx?$/.test(e.name) && !/\.(test|gen)\.ts$/.test(e.name) ? [chemin] : [];
  });
}

test('chaque icône nommée dans le code existe : une icône absente ne s’affiche pas, sans rien dire', () => {
  const racine = fileURLToPath(new URL('..', import.meta.url));
  const nom = String.raw`([a-zA-Z][\w-]*)`;
  const manquantes: string[] = [];
  for (const fichier of composants(racine)) {
    const code = readFileSync(fichier, 'utf8');
    const noms = [
      // <Icone nom="ui-oeil" />
      ...[...code.matchAll(new RegExp(String.raw`<Icone\s+nom="${nom}"`, 'g'))].map(m => m[1]),
      // <Icone nom={copie ? 'ui-ok' : 'ui-copier'} />
      ...[...code.matchAll(/<Icone\s+nom=\{([^}]*)\}/g)].flatMap(m => [...m[1].matchAll(new RegExp(`'${nom}'`, 'g'))].map(x => x[1])),
      // icone="cible" (Repli), icone: 'horloge' (listes d'onglets, de règles, de lignes)
      ...[...code.matchAll(new RegExp(String.raw`\bicone(?:=|:\s*)["']${nom}["']`, 'g'))].map(m => m[1]),
      // picto: 'bloc-lien' (types de blocs, étapes)
      ...[...code.matchAll(new RegExp(String.raw`\bpicto:\s*'${nom}'`, 'g'))].map(m => m[1]),
    ];
    for (const n of noms) if (!ICONES[n]) manquantes.push(`${fichier.slice(racine.length)} : ${n}`);
  }
  assert.deepEqual(manquantes, []);
});
