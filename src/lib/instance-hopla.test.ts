import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EST_HOPLA_PAGE, LIEN_SOURCE } from './instance.ts';
import { NOM_PUBLIC, ORIGINE_ADMIN } from './types.ts';
import { CONTACT_LEGAL, LEGAL } from './legal.ts';
import { pseudoPrincipal } from '../server/db.ts';

test('sans rien de posé au build, c’est hopla.page, comme avant', () => {
  assert.equal(EST_HOPLA_PAGE, true);
  assert.equal(NOM_PUBLIC, 'hopla.page');
  assert.equal(ORIGINE_ADMIN, 'https://app.hopla.page');
  assert.equal(CONTACT_LEGAL, 'bonjour@liliansevoumian.fr');
  assert.equal(pseudoPrincipal({ LIENS_PSEUDO_PRINCIPAL: 'autre' }), 'lilian', 'le compte de Lilian garde son nom');
  const mentions = LEGAL['mentions-legales'].sections[0].texte.join(' ');
  assert.match(mentions, /AURA GROUP, SARL.*SIREN 991 735 036/);
  assert.match(mentions, /06 67 03 66 74\. Directeur de la publication : Lilian Sevoumian\./);
  assert.equal(LIEN_SOURCE, '', 'pas de lien « Code source » tant que le dépôt est privé');
});
