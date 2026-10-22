import test from 'node:test';
import assert from 'node:assert/strict';
import { ICONES } from './icones.ts';
import { COULEURS_LOGOS, LOGOS_OUTILS, OUTILS_DES_BLOCS, destination } from './integrations.ts';

/** Le contraste WCAG d'une couleur sur le blanc. */
function contrasteSurBlanc(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);
  return 1.05 / (l + 0.05);
}

test('Intégrations : chaque logo existe, et sa couleur se lit sur le blanc', () => {
  const logos = [...Object.values(LOGOS_OUTILS), ...OUTILS_DES_BLOCS.flatMap(b => b.logos)];
  assert.deepEqual(logos.filter(l => !ICONES[l]), [], 'une icône absente ne s’affiche pas, sans rien dire');
  for (const [nom, couleur] of Object.entries(COULEURS_LOGOS)) assert.ok(contrasteSurBlanc(couleur) >= 4.5, `${nom} : ${contrasteSurBlanc(couleur).toFixed(2)}:1`);
});

test('Intégrations : où partent les inscrits, en quelques mots', () => {
  assert.equal(destination({ fournisseur: 'brevo', nom: 'Newsletter' }), 'chez Brevo, la liste « Newsletter »');
  assert.equal(destination({ fournisseur: 'kit', nom: 'Bienvenue' }), 'chez Kit, le formulaire « Bienvenue »');
  assert.equal(destination({ fournisseur: 'systeme', nom: '' }), 'chez Systeme.io', 'sans tag');
  assert.equal(destination({ fournisseur: 'make', nom: 'hook.eu1.make.com' }), 'vers Make', 'un webhook n’a pas de liste');
});
