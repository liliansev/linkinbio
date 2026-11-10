import test from 'node:test';
import assert from 'node:assert/strict';

process.env.LIENS_DB = ':memory:';
const db = await import('./db.ts');
const { lireLinktree, lirePageDeLiens, lirePageImportee, appliquerImport } = await import('./importer.ts');
const { nouveauBloc } = await import('../lib/types.ts');
const P = 'principal';

test.beforeEach(() => { db.fermer(); });

const linktree = (props: unknown) => `<html><head><title>x</title></head><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: props } })}</script></body></html>`;

test('une page Linktree se lit dans ses données : liens dans l’ordre, sections, réseaux, profil', () => {
  const page = lireLinktree(linktree({
    pageTitle: 'Camille Martin', description: 'Céramiste à Lyon', username: 'camille',
    account: { profilePictureUrl: 'https://ugc.production.linktr.ee/a.jpeg' },
    links: [
      { type: 'CLASSIC', title: 'Ma boutique', url: 'https://camille.fr/boutique', position: 2 },
      { type: 'HEADER', title: 'Mes vidéos', url: null, position: 0 },
      { type: 'YOUTUBE_VIDEO', title: 'Tournage', url: 'https://www.youtube.com/watch?v=abc', position: 1 },
      { type: 'CLASSIC', title: 'Caché', url: 'https://camille.fr/prive', position: 3, locked: true },
      { type: 'CLASSIC', title: 'Sans adresse', url: '', position: 4 },
      { type: 'CLASSIC', title: 'Doublon', url: 'https://camille.fr/boutique/', position: 5 },
    ],
    socialLinks: [{ type: 'INSTAGRAM', url: 'https://instagram.com/camille', position: 1 }, { type: 'EMAIL_ADDRESS', url: 'camille@exemple.fr', position: 0 }, { type: 'INCONNU', url: 'https://exemple.fr', position: 2 }],
  }));
  assert.ok(page);
  assert.equal(page.nom, 'Camille Martin');
  assert.equal(page.bio, 'Céramiste à Lyon');
  assert.equal(page.avatar, 'https://ugc.production.linktr.ee/a.jpeg');
  assert.deepEqual(page.liens.map(l => l.titre), ['Mes vidéos', 'Tournage', 'Ma boutique']);
  assert.ok(page.liens[0].titreSection);
  assert.deepEqual(page.reseaux, [{ reseau: 'email', url: 'mailto:camille@exemple.fr' }, { reseau: 'instagram', url: 'https://instagram.com/camille' }]);
});

test('une page sans données Linktree se lit par ses liens sortants', () => {
  const html = `<html><head><title>Marie | Beacons</title><meta property="og:description" content="Photographe"><meta property="og:image" content="/photo.jpg"></head><body>
    <a href="/interne">Interne</a><a href="https://beacons.ai/signup">Créer ta page</a>
    <a href="https://marie.fr/portfolio"><span>Mon &amp; portfolio</span></a>
    <a href="https://instagram.com/marie"><svg><path d="M0"/></svg></a>
    <a href="https://www.youtube.com/@marie">Ma chaîne</a>
    <a href="javascript:void(0)">Rien</a><a href="mailto:marie@exemple.fr">Écrire</a></body></html>`;
  assert.equal(lireLinktree(html), null);
  const page = lirePageImportee(html, 'https://beacons.ai/marie');
  assert.equal(page.nom, 'Marie');
  assert.equal(page.bio, 'Photographe');
  assert.equal(page.avatar, 'https://beacons.ai/photo.jpg');
  assert.deepEqual(page.liens, [{ titre: 'Mon & portfolio', url: 'https://marie.fr/portfolio' }, { titre: 'Ma chaîne', url: 'https://www.youtube.com/@marie' }]);
  assert.deepEqual(page.reseaux.map(r => r.reseau), ['instagram', 'email']);
  assert.deepEqual(lirePageDeLiens('<html><body></body></html>', 'https://x.fr').liens, []);
});

test('l’import ajoute sous la page, sans doublon, et ne remplit le profil que là où il est vide', () => {
  db.lireBlocs(P);
  for (const b of db.lireBlocs(P)) db.supprimerBloc(P, b.id);
  db.enregistrerBloc(P, { ...nouveauBloc('lien', 'deja'), titre: 'Mon site', url: 'https://camille.fr' });
  const avant = db.lireReglages(P);
  db.ecrireReglages(P, { ...avant, profil: { ...avant.profil, nom: 'Camille', bio: '', avatar: '' }, reseaux: [{ reseau: 'instagram', url: 'https://instagram.com/moi' }] });
  const bilan = appliquerImport(P, {
    nom: 'Camille Martin', bio: 'Céramiste', avatar: 'https://ailleurs.fr/a.jpg',
    liens: [
      { titre: 'Site', url: 'https://camille.fr/' },
      { titre: 'Vidéos', url: '', titreSection: true },
      { titre: 'Tournage', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { titre: 'Vide', url: '', titreSection: true },
    ],
    reseaux: [{ reseau: 'instagram', url: 'https://instagram.com/autre' }, { reseau: 'tiktok', url: 'https://tiktok.com/@camille' }],
  }, { vitrine: true, langue: 'fr', avatar: '/media/abc.jpg' });
  assert.deepEqual(bilan, { liens: 1, reseaux: 1, profil: true, dejaLa: 1 });
  const blocs = db.lireBlocs(P);
  assert.deepEqual(blocs.map(b => [b.type, b.titre]), [['lien', 'Mon site'], ['titre', 'Vidéos'], ['video', 'Tournage']]);
  const r = db.lireReglages(P);
  assert.equal(r.profil.nom, 'Camille Martin');
  assert.equal(r.profil.bio, 'Céramiste');
  assert.equal(r.profil.avatar, '/media/abc.jpg');
  assert.deepEqual(r.reseaux.map(x => x.reseau), ['instagram', 'tiktok']);
  // Une seconde fois : tout est déjà là, et le profil déjà rempli ne bouge plus.
  const encore = appliquerImport(P, { nom: 'Autre', bio: 'Autre', avatar: '', liens: [{ titre: 'Tournage', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }], reseaux: [] }, { vitrine: true, langue: 'fr', avatar: '' });
  assert.deepEqual(encore, { liens: 0, reseaux: 0, profil: false, dejaLa: 1 });
  assert.equal(db.lireReglages(P).profil.nom, 'Camille Martin');
});
