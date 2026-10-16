import test from 'node:test';
import assert from 'node:assert/strict';
import { THEMES } from './themes.ts';

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const couleurs = (fond: string) => fond.match(/#[0-9a-f]{6}/gi) ?? [];

test('trente thèmes, identifiants uniques', () => {
  assert.equal(THEMES.length, 30);
  assert.equal(new Set(THEMES.map(t => t.id)).size, 30);
});

test('chaque thème est lisible : texte sur tout le fond, boutons pleins', () => {
  for (const t of THEMES) {
    for (const c of couleurs(t.fond)) assert.ok(contraste(t.texte, c) >= 4.5, `${t.id} : texte sur ${c} = ${contraste(t.texte, c).toFixed(2)}`);
    for (const c of couleurs(t.fond)) assert.ok(contraste(t.doux, c) >= 3, `${t.id} : texte doux sur ${c} = ${contraste(t.doux, c).toFixed(2)}`);
    assert.ok(contraste(t.surface, t.surfaceTexte) >= 4.5, `${t.id} : bouton = ${contraste(t.surface, t.surfaceTexte).toFixed(2)}`);
    assert.ok(contraste(t.vedette, t.vedetteTexte) >= 4.5, `${t.id} : carte mise en avant = ${contraste(t.vedette, t.vedetteTexte).toFixed(2)}`);
  }
});
