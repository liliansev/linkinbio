import test from 'node:test';
import assert from 'node:assert/strict';
import { estRacine, hoteDomaine, nomChezLeRegistrar } from './domaines.ts';
import { adressePartage, urlPage } from './types.ts';

test('un nom de domaine tapé se remet au propre, ou se refuse', () => {
  assert.equal(hoteDomaine('  https://Liens.Marie.fr/accueil?x=1 '), 'liens.marie.fr');
  assert.equal(hoteDomaine('marie.co.uk.'), 'marie.co.uk');
  assert.equal(hoteDomaine('liens.café.fr'), 'liens.xn--caf-dma.fr');
  for (const refuse of ['', 'marie', '192.168.1.1', 'marie@exemple.fr', 'liens marie.fr', '-liens.marie.fr', 'liens..marie.fr', 'liens.marie.fr:8080', `${'a'.repeat(64)}.fr`, 'serveur.local', 'localhost']) {
    assert.equal(hoteDomaine(refuse), '', refuse);
  }
  // Les noms de Hopla ne sont à personne : ni ceux de l'instance, ni les noms courts, ni la cible des CNAME.
  for (const hopla of ['hopla.page', 'app.hopla.page', 'marie.hopla.page', 'hpla.eu', 'marie.hpla.art']) assert.equal(hoteDomaine(hopla), '', hopla);
  assert.equal(hoteDomaine('abc.cname.exemple.net', ['cname.exemple.net']), '');
  assert.equal(hoteDomaine(42), '');
});

test('un domaine racine se reconnaît : il ne prend pas de CNAME', () => {
  assert.equal(estRacine('marie.fr'), true);
  assert.equal(estRacine('marie.co.uk'), true);
  assert.equal(estRacine('liens.marie.fr'), false);
  assert.equal(estRacine('liens.marie.co.uk'), false);
  assert.equal(nomChezLeRegistrar('liens.marie.fr'), 'liens');
  assert.equal(nomChezLeRegistrar('mes.liens.marie.co.uk'), 'mes.liens');
  assert.equal(nomChezLeRegistrar('marie.fr'), '@');
});

test('l’adresse d’une page : son propre nom de domaine d’abord, puis son nom court', () => {
  const marie = { pseudo: 'marie', principal: false };
  assert.equal(urlPage(marie), 'https://hopla.page/marie');
  assert.equal(adressePartage(marie, 'hpla.art'), 'https://hpla.art/marie');
  const chezElle = { ...marie, domaine: 'liens.marie.fr' };
  assert.equal(urlPage(chezElle), 'https://liens.marie.fr');
  assert.equal(adressePartage(chezElle, 'hpla.art'), 'https://liens.marie.fr');
});
