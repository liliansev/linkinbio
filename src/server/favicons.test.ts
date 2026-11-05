import test from 'node:test';
import assert from 'node:assert/strict';

process.env.LIENS_DB = ':memory:';
const db = await import('./db.ts');
const { passerAuxFavicons, rendreVignettes, vignetteARelire, vignetteSurFond } = await import('./favicons.ts');
const { nouveauBloc } = await import('../lib/types.ts');
const P = 'principal';

test.beforeEach(() => { db.fermer(); });

const lien = (id: string, champs: Partial<ReturnType<typeof nouveauBloc>>) => ({ ...nouveauBloc('lien', id), ...champs });

test('seuls les boutons de lien vers un site, avec une image, passent au favicon', () => {
  assert.ok(vignetteARelire(lien('a', { url: 'https://atelier.fr', image: '/media/x.webp' })));
  assert.ok(!vignetteARelire(lien('b', { url: 'https://atelier.fr', image: '' })), 'sans image, rien à changer');
  assert.ok(!vignetteARelire(lien('c', { url: 'https://www.instagram.com/marie', image: '/media/x.webp' })), 'un réseau garde son icône');
  assert.ok(!vignetteARelire(lien('d', { url: 'https://atelier.fr', image: '/media/x.webp', vedette: true, format: 'carte' })), 'la grande image d’une carte reste');
  assert.ok(!vignetteARelire(lien('e', { url: 'mailto:a@b.fr', image: '/media/x.webp' })));
});

test('les liens prennent le favicon de leur site, un site lu une fois, et se rendent', async () => {
  db.lireBlocs(P);
  db.enregistrerBloc(P, lien('un', { url: 'https://atelier.fr/a', image: '/media/avant1.webp' }));
  db.enregistrerBloc(P, lien('deux', { url: 'https://atelier.fr/b', image: '/media/avant2.webp' }));
  db.enregistrerBloc(P, lien('trois', { url: 'https://muet.fr', image: '/media/avant3.webp' }));
  const lus: string[] = [];
  const n = await passerAuxFavicons(async url => {
    lus.push(new URL(url).origin);
    return url.includes('muet') ? null : { octets: new Uint8Array([137, 80, 78, 71]), extension: 'png' };
  });
  assert.equal(n, 2);
  assert.deepEqual(lus.sort(), ['https://atelier.fr', 'https://muet.fr']);
  const blocs = db.lireBlocs(P);
  const image = (id: string) => blocs.find(b => b.id === id)!.image;
  assert.match(image('un'), /^\/media\/[\w-]+\.png$/);
  assert.equal(image('trois'), '/media/avant3.webp', 'un site sans favicon garde son image');
  assert.ok(db.lireMedia(image('un').slice(7, -4), 'png'));
  assert.equal(rendreVignettes(), 2);
  assert.equal(db.lireBlocs(P).find(b => b.id === 'un')!.image, '/media/avant1.webp');
});

test('la seconde reprise ne touche qu’aux favicons posés sur du blanc depuis, jamais à un lien déjà repris', async () => {
  db.lireBlocs(P);
  db.enregistrerBloc(P, lien('blanc', { url: 'https://fillout.com', image: '/media/blanc.webp' }));
  db.enregistrerBloc(P, lien('seul', { url: 'https://atelier.fr', image: '/media/seul.png' }));
  db.enregistrerBloc(P, lien('choisie', { url: 'https://atelier.fr/b', image: '/media/photo.webp' }));
  db.garderVignette(P, 'choisie', '/media/avant.webp', '/media/favicon.png');
  const aRelire = vignetteSurFond(new Set(db.vignettesGardees().map(v => v.bloc)));
  const n = await passerAuxFavicons(async () => ({ octets: new Uint8Array([137, 80, 78, 71]), extension: 'png' }), aRelire);
  assert.equal(n, 1);
  const image = (id: string) => db.lireBlocs(P).find(b => b.id === id)!.image;
  assert.match(image('blanc'), /\.png$/);
  assert.equal(image('seul'), '/media/seul.png');
  assert.equal(image('choisie'), '/media/photo.webp', 'une image choisie après la première reprise reste');
});
