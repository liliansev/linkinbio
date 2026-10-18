import test from 'node:test';
import assert from 'node:assert/strict';
import { FAMILLES, REMPLACES, THEMES, contraste, idTheme, personnaliser, themeDe, themeParId, variablesTheme } from './themes.ts';

const couleurs = (fond: string) => fond.match(/#[0-9a-f]{6}/gi) ?? [];

test('vingt thèmes, identifiants uniques, chaque famille garnie', () => {
  assert.equal(THEMES.length, 20);
  assert.equal(new Set(THEMES.map(t => t.id)).size, 20);
  for (const f of FAMILLES) assert.ok(THEMES.some(t => t.famille === f.id), `famille vide : ${f.id}`);
});

test('les anciens identifiants restent : une page enregistrée garde son thème ou passe sur le plus proche', () => {
  const anciens = ['nuit-peche', 'minuit', 'encre', 'foret', 'bordeaux', 'aubergine', 'cafe', 'terminal', 'ardoise', 'neon', 'papier', 'neige', 'ivoire', 'sable', 'menthe', 'ciel', 'lavande', 'abricot', 'rose', 'citron', 'orange', 'jaune', 'klein', 'pomme', 'rouge', 'aurore', 'ocean', 'coucher', 'peche-nuit', 'holo', 'onyx', 'champagne', 'velours', 'marbre', 'studio', 'givre', 'brutal', 'y2k', 'arcade', 'acide', 'damier', 'cosmos', 'bonbon', 'lave', 'velours', 'studio', 'y2k', 'menthe', 'jaune', 'ocean'];
  for (const id of anciens) assert.equal(themeParId(id).id, REMPLACES[id] ?? id, id);
  for (const id of Object.values(REMPLACES)) assert.ok(THEMES.some(t => t.id === id), `remplaçant inconnu : ${id}`);
  assert.equal(idTheme('inconnu'), 'nuit-peche');
  assert.equal(idTheme(undefined), 'nuit-peche');
});

test('chaque thème a sa police de titre, ses variables et ses boutons', () => {
  for (const t of THEMES) {
    const v = variablesTheme(t);
    assert.ok(v['--police'] && v['--police-titre'] && v['--titre-section'], t.id);
    assert.ok(t.conseil.style && t.conseil.forme && t.conseil.ombre, t.id);
    assert.ok(v['--nom-graisse'] && v['--btn-graisse'] && v['--ombre-teinte'], t.id);
  }
});

test('chaque thème est lisible : texte sur tout le fond, boutons et accent', () => {
  for (const t of THEMES) {
    for (const c of couleurs(t.fond)) assert.ok(contraste(t.texte, c) >= 4.5, `${t.id} : texte sur ${c} = ${contraste(t.texte, c).toFixed(2)}`);
    for (const c of couleurs(t.fond)) assert.ok(contraste(t.doux, c) >= 3, `${t.id} : texte doux sur ${c} = ${contraste(t.doux, c).toFixed(2)}`);
    assert.ok(contraste(t.surface, t.surfaceTexte) >= 4.5, `${t.id} : bouton = ${contraste(t.surface, t.surfaceTexte).toFixed(2)}`);
    assert.ok(contraste(t.vedette, t.vedetteTexte) >= 4.5, `${t.id} : carte mise en avant = ${contraste(t.vedette, t.vedetteTexte).toFixed(2)}`);
    assert.ok(contraste(variablesTheme(t)['--titre-section'], t.fondUni) >= 3, `${t.id} : titres de section`);
  }
});

test('trois rôles par thème : l\'accent se distingue des boutons et du fond', () => {
  for (const t of THEMES) {
    assert.notEqual(t.vedette.toLowerCase(), t.surface.toLowerCase(), `${t.id} : accent identique aux boutons`);
    assert.ok(contraste(t.vedette, t.fondUni) >= 1.6, `${t.id} : accent sur le fond = ${contraste(t.vedette, t.fondUni).toFixed(2)}`);
  }
});

test('les couleurs changées par-dessus un thème restent lisibles', () => {
  const fonds = ['#ffffff', '#111111', '#ffd400', '#1f35ff', '#ff6fae', '#7cf5c8', '#23704f', '#808080'];
  for (const t of THEMES) for (const c of fonds) {
    const p = personnaliser(t, { fond: c, boutons: c, accent: c });
    assert.equal(p.fondUni, c);
    assert.ok(contraste(p.texte, c) >= 4.5, `${t.id} sur ${c} : texte`);
    assert.ok(contraste(p.doux, c) >= 3, `${t.id} sur ${c} : texte doux = ${contraste(p.doux, c).toFixed(2)}`);
    assert.ok(contraste(p.surface, p.surfaceTexte) >= 4.5, `${t.id} : boutons ${c}`);
    assert.ok(contraste(p.vedette, p.vedetteTexte) >= 4.5, `${t.id} : accent ${c}`);
    assert.equal(p.police, t.police);
  }
  assert.deepEqual(themeDe({ theme: 'klein', couleurs: { fond: '', boutons: '', accent: '' } }), themeParId('klein'));
  assert.equal(themeDe({ theme: 'klein', couleurs: { fond: 'rouge', boutons: '', accent: '' } }).fondUni, themeParId('klein').fondUni);
});
