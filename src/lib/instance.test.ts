import { test } from 'node:test';
import assert from 'node:assert/strict';

// Un fichier de test tourne dans son propre processus : l'instance se pose avant le premier import, comme le ferait le build.
(globalThis as Record<string, unknown>).__HOPLA_INSTANCE__ = {
  origine: 'https://liens.example.org/', origineAdmin: 'https://app.liens.example.org',
  editeur: 'Association Exemple, 1 rue de la Paix, 75002 Paris', directeur: 'Camille Martin',
};

test('une instance auto-hébergée a ses adresses, son identité légale, et rien de Lilian', async () => {
  const { INSTANCE, EST_HOPLA_PAGE, NOM_EDITEUR, LIEN_SOURCE } = await import('./instance.ts');
  const { ORIGINE_PUBLIQUE, NOM_ADMIN, urlPage } = await import('./types.ts');
  const { LEGAL, CONTACT_LEGAL } = await import('./legal.ts');
  assert.equal(EST_HOPLA_PAGE, false);
  assert.equal(ORIGINE_PUBLIQUE, 'https://liens.example.org', 'sans la barre finale');
  assert.equal(NOM_ADMIN, 'app.liens.example.org');
  assert.equal(urlPage({ pseudo: 'camille', principal: false }), 'https://liens.example.org/camille');
  assert.equal(NOM_EDITEUR, 'Association Exemple');
  assert.equal(CONTACT_LEGAL, 'contact@liens.example.org', 'à défaut, une adresse sur le nom de l’instance');
  assert.equal(LIEN_SOURCE, INSTANCE.depot, 'le lien « Code source » est toujours là ailleurs que sur hopla.page');
  const tout = JSON.stringify(LEGAL);
  for (const absent of ['AURA GROUP', 'liliansevoumian', '06 67', 'Lilian Sevoumian', 'hopla.page']) assert.ok(!tout.includes(absent), absent);
  assert.match(tout, /Directeur de la publication : Camille Martin/);
  assert.match(tout, /à renseigner par l’administrateur de l’instance : LIENS_HEBERGEUR/, 'ce qui manque se voit');
});

test('le compte principal prend le pseudo choisi, ou « moi »', async () => {
  const { pseudoPrincipal } = await import('../server/db.ts');
  assert.equal(pseudoPrincipal({ LIENS_PSEUDO_PRINCIPAL: 'Camille' }), 'camille');
  assert.equal(pseudoPrincipal({ LIENS_PSEUDO_PRINCIPAL: 'admin' }), 'moi', 'un nom réservé est refusé');
  assert.equal(pseudoPrincipal({}), 'moi');
});

test('sans adresse, le compte principal d’une instance n’est pas celui de Lilian', async () => {
  const { adresseAdmin } = await import('../server/auth.ts');
  assert.equal(adresseAdmin({}), '');
  assert.equal(adresseAdmin({ LIENS_ADMIN_EMAIL: 'moi@example.org' }), 'moi@example.org');
});
