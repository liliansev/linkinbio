import test from 'node:test';
import assert from 'node:assert/strict';

process.env.LIENS_DB = ':memory:';
process.env.CREEM_API_KEY = 'creem_test_x';
const db = await import('./db.ts');
const { enregistrerLienCourt, suivreLienCourt, maxLiensCourts } = await import('./courts.ts');

test.beforeEach(() => { db.fermer(); });

const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const INSTAGRAM_IOS = `${SAFARI} Instagram 350.0.0.0`;
const INSTAGRAM_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36 Instagram 350.0.0.0';

test('un lien court se crée, se suit, compte ses clics et change de destination sans changer d’adresse', () => {
  const c = db.creerCompte('camille@exemple.fr', 'camille');
  const cree = enregistrerLienCourt(c.id, { code: 'Ma Vidéo', url: 'exemple.fr/video', titre: '  Story  ' });
  assert.ok(cree.ok);
  assert.equal(cree.lien.code, 'ma-video');
  assert.equal(cree.lien.url, 'https://exemple.fr/video');
  assert.equal(cree.lien.titre, 'Story');

  assert.deepEqual(suivreLienCourt('camille', 'ma-video', SAFARI), { vers: 'https://exemple.fr/video' });
  suivreLienCourt('camille', 'ma-video', SAFARI);
  // Un robot ou un aperçu de lien est renvoyé comme les autres, sans compter.
  assert.deepEqual(suivreLienCourt('camille', 'ma-video', 'facebookexternalhit/1.1'), { vers: 'https://exemple.fr/video' });
  assert.equal(db.liensCourts(c.id)[0].clics, 2);
  assert.equal(db.liensCourts(c.id)[0].semaine, 2);

  const modifie = enregistrerLienCourt(c.id, { id: cree.lien.id, code: 'ma-video', url: 'https://exemple.fr/autre', titre: 'Story' });
  assert.ok(modifie.ok);
  assert.deepEqual(suivreLienCourt('camille', 'ma-video', SAFARI), { vers: 'https://exemple.fr/autre' });
  assert.equal(db.liensCourts(c.id).length, 1);
});

test('un lien inconnu, un compte suspendu ou un code mal écrit ne mènent nulle part', () => {
  const c = db.creerCompte('camille@exemple.fr', 'camille');
  assert.ok(enregistrerLienCourt(c.id, { code: 'promo', url: 'https://exemple.fr' }).ok);
  assert.equal(suivreLienCourt('camille', 'autre', SAFARI), null);
  assert.equal(suivreLienCourt('personne', 'promo', SAFARI), null);
  assert.equal(suivreLienCourt('camille', '../promo', SAFARI), null);
  db.changerStatut(c.id, 'suspendu');
  assert.equal(suivreLienCourt('camille', 'promo', SAFARI), null);
});

test('ce qui se refuse : une adresse qui n’est pas du web, un code réservé ou déjà pris, la limite de l’offre', () => {
  const c = db.creerCompte('camille@exemple.fr', 'camille');
  assert.deepEqual(enregistrerLienCourt(c.id, { code: 'x1', url: 'javascript:alert(1)' }), { ok: false, refus: 'adresse' });
  assert.deepEqual(enregistrerLienCourt(c.id, { code: 'x1', url: 'mailto:a@exemple.fr' }), { ok: false, refus: 'adresse' });
  assert.deepEqual(enregistrerLienCourt(c.id, { code: 'admin', url: 'https://exemple.fr' }), { ok: false, refus: 'code' });
  assert.deepEqual(enregistrerLienCourt(c.id, { id: 'inconnu', code: 'x1', url: 'https://exemple.fr' }), { ok: false, refus: 'inconnu' });
  assert.ok(enregistrerLienCourt(c.id, { code: 'promo', url: 'https://exemple.fr' }).ok);
  assert.deepEqual(enregistrerLienCourt(c.id, { code: 'Promo', url: 'https://exemple.fr/2' }), { ok: false, refus: 'pris' });
  // L'essai de Pro n'ouvre pas la limite : cinq liens en Gratuit, codes tirés au hasard.
  assert.equal(maxLiensCourts(c.id), 5);
  for (let i = 0; i < 4; i++) {
    const r = enregistrerLienCourt(c.id, { url: `https://exemple.fr/${i}` });
    assert.ok(r.ok);
    assert.match(r.lien.code, /^[a-z2-9]{6}$/);
  }
  assert.deepEqual(enregistrerLienCourt(c.id, { url: 'https://exemple.fr/de-trop' }), { ok: false, refus: 'limite' });
  assert.equal(maxLiensCourts('principal'), 500);
});

test('depuis le navigateur intégré d’un réseau, le lien s’ouvre dans son app, sauf si la page l’a coupé', () => {
  const c = db.creerCompte('camille@exemple.fr', 'camille');
  assert.ok(enregistrerLienCourt(c.id, { code: 'clip', url: 'https://www.youtube.com/watch?v=abc' }).ok);
  const android = suivreLienCourt('camille', 'clip', INSTAGRAM_ANDROID);
  assert.ok(android && 'vers' in android && android.vers.startsWith('intent://www.youtube.com/watch?v=abc#Intent;'));
  const ios = suivreLienCourt('camille', 'clip', INSTAGRAM_IOS);
  assert.ok(ios && 'page' in ios);
  assert.match(ios.page, /youtube:\/\/www\.youtube\.com\/watch\?v=abc/);
  assert.match(ios.page, /https:\/\/www\.youtube\.com\/watch\?v=abc/);
  assert.deepEqual(suivreLienCourt('camille', 'clip', SAFARI), { vers: 'https://www.youtube.com/watch?v=abc' });
  db.ecrireReglages(c.id, { ...db.lireReglages(c.id), ouvrirApps: false });
  assert.deepEqual(suivreLienCourt('camille', 'clip', INSTAGRAM_IOS), { vers: 'https://www.youtube.com/watch?v=abc' });
});

test('supprimer un lien court efface ses clics, supprimer le compte efface tout', () => {
  const c = db.creerCompte('camille@exemple.fr', 'camille');
  const r = enregistrerLienCourt(c.id, { code: 'promo', url: 'https://exemple.fr' });
  assert.ok(r.ok);
  suivreLienCourt('camille', 'promo', SAFARI);
  db.supprimerLienCourt(c.id, r.lien.id);
  assert.equal(db.liensCourts(c.id).length, 0);
  assert.equal(suivreLienCourt('camille', 'promo', SAFARI), null);
});
