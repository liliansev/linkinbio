import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FAMILLES, REMPLACES, THEMES, contraste, fondsDuPied, idTheme, meler, personnaliser, themeDe, themeParId, variablesTheme } from './themes.ts';

const couleurs = (fond: string) => fond.match(/#[0-9a-f]{6}/gi) ?? [];

test('vingt-quatre thèmes, identifiants uniques, chaque famille garnie', () => {
  assert.equal(THEMES.length, 24);
  assert.equal(new Set(THEMES.map(t => t.id)).size, 24);
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

test('« Ajouter un bloc », sous les blocs de la page éditée, se voit sur chaque thème', () => {
  // Le mot a la couleur du texte du thème, lisible plus haut ; son trait, ce texte mêlé au fond (`page.css`), garde 3:1.
  const regle = readFileSync(new URL('../styles/page.css', import.meta.url), 'utf8').match(/button\.lp-ed-ajout \{([^}]*)\}/)?.[1] ?? '';
  assert.match(regle, /\bcolor: var\(--texte\);/);
  const part = Number(regle.match(/inset 0 0 0 [\d.]+px color-mix\(in srgb, var\(--texte\) (\d+)%, transparent\)/)?.[1]) / 100;
  assert.ok(part > 0, 'trait introuvable dans page.css');
  for (const t of THEMES) for (const c of couleurs(t.fond)) {
    const trait = meler(c, t.texte, part);
    assert.ok(contraste(trait, c) >= 3, `${t.id} : trait sur ${c} = ${contraste(trait, c).toFixed(2)}`);
  }
});

test('le picto d\'une carte se voit sur chaque thème, couleurs changées comprises', () => {
  const essais = [...THEMES, personnaliser(themeParId('klein'), { boutons: '#ffd400' }), personnaliser(themeParId('neige'), { accent: '#ffffff' })];
  for (const t of essais) {
    // Seul sur la carte, sans rond derrière lui : il se lit sur la carte elle-même.
    const v = variablesTheme(t);
    assert.ok(contraste(v['--picto-carte'], t.surface) >= 3, `${t.id} : picto sur ${t.surface} = ${contraste(v['--picto-carte'], t.surface).toFixed(2)}`);
  }
});

test('les mentions d\'une carte restent lisibles : 4,5 de contraste au moins', () => {
  for (const t of [...THEMES, personnaliser(themeParId('klein'), { boutons: '#7f7f7f' })]) {
    const v = variablesTheme(t);
    assert.ok(contraste(v['--surface-doux'], t.surface) >= 4.5, `${t.id} : mention = ${contraste(v['--surface-doux'], t.surface).toFixed(2)}`);
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

test('au pied, la mention Hopla prend l\'accent du thème quand il se lit, et les liens légaux se lisent en petit', () => {
  const essais = [...THEMES, personnaliser(themeParId('neige'), { accent: '#ffffff' }), personnaliser(themeParId('klein'), { fond: '#ff3d7f', accent: '#ffe14d' })];
  for (const t of essais) {
    const v = variablesTheme(t);
    // Le fond uni, chaque teinte du dégradé, le panneau de la mise en page Colonne et la lave du décor.
    for (const c of fondsDuPied(t)) {
      // Le texte du thème est le dernier recours : il se lit déjà partout (test plus haut).
      for (const [nom, couleur] of [['mention', v['--mention-hopla']], ['liens légaux', v['--pied-legal']]]) {
        assert.ok(couleur === t.texte || contraste(couleur, c) >= 4.5, `${t.id} : ${nom} ${couleur} sur ${c} = ${contraste(couleur, c).toFixed(2)}`);
      }
    }
  }
  // Sur Klein, la mention est le jaune du thème tel quel, comme Lilian l'a demandé.
  assert.equal(variablesTheme(themeParId('klein'))['--mention-hopla'], '#ffd400');
  // Sur Lampe, la lave passe sous la mention : l'orange s'éclaircit juste assez, sans se fondre dans le texte.
  const lampe = themeParId('lampe');
  assert.ok(![lampe.vedette, lampe.texte].includes(variablesTheme(lampe)['--mention-hopla']));
  // Les liens légaux ne passent pas par une opacité, qui ferait tomber leur contraste sous celui calculé ici.
  const css = readFileSync(new URL('../styles/page.css', import.meta.url), 'utf8');
  const legal = css.match(/\n\.lp-legal \{([^}]*)\}/)?.[1] ?? '';
  assert.match(legal, /\bcolor: var\(--pied-legal\);/);
  assert.doesNotMatch(legal, /opacity/);
  assert.match(css.match(/a\.lp-hopla \{([^}]*)\}/)?.[1] ?? '', /\bcolor: var\(--mention-hopla\);/);
  // La signature de la page de Lilian se lit comme les liens légaux, et l'appui ne pâlit aucun lien du pied.
  assert.match(css.match(/\.lp-signature a \{([^}]*)\}/)?.[1] ?? '', /\bcolor: var\(--pied-legal\);/);
  assert.doesNotMatch(css.match(/a:active \{([^}]*)\}/)?.[1] ?? '', /opacity/);
  // Sur Argile, l'accent ne se lit pas : la mention prend le texte, et passe devant les liens légaux par son poids.
  const argile = variablesTheme(themeParId('argile'));
  assert.equal(argile['--mention-hopla'], themeParId('argile').texte);
  assert.equal(argile['--mention-graisse'], '560');
  assert.equal(variablesTheme(themeParId('klein'))['--mention-graisse'], '480');
});
