import test from 'node:test';
import assert from 'node:assert/strict';
import { avecUtm, blocsAvecUtm, redirectionActive } from './sorties.ts';
import { validerBloc, validerReglages } from './valider.ts';
import { selonDroits } from './droits.ts';
import type { Droits } from './droits.ts';
import { FONCTIONS } from './abonnement.ts';
import { REGLAGES_DEFAUT } from './defauts.ts';
import { adressePartage } from './types.ts';

const TOUT = Object.fromEntries(Object.keys(FONCTIONS).map(f => [f, true])) as Droits;
const RIEN = Object.fromEntries(Object.keys(FONCTIONS).map(f => [f, false])) as Droits;

test('UTM : les liens vers un site sont marqués, une seule fois, sans toucher au reste', () => {
  assert.equal(avecUtm('https://boutique.fr/sac?taille=m'), 'https://boutique.fr/sac?taille=m&utm_source=hopla&utm_medium=referral');
  assert.equal(avecUtm('https://boutique.fr/?utm_source=insta'), 'https://boutique.fr/?utm_source=insta', 'des UTM déjà posés restent');
  assert.equal(avecUtm('https://hopla.page/camille'), 'https://hopla.page/camille', 'une autre page Hopla ne change pas');
  assert.equal(avecUtm('mailto:a@b.fr'), 'mailto:a@b.fr');
  assert.equal(avecUtm('tel:+33612345678'), 'tel:+33612345678');
  const lien = validerBloc({ type: 'lien', titre: 'Sac', url: 'boutique.fr' }, 'l');
  const soutien = validerBloc({ type: 'soutien', titre: 'Merci', url: 'https://paypal.me/camille' }, 's');
  const [a, b] = blocsAvecUtm({ ...REGLAGES_DEFAUT, utm: true }, [lien, soutien]);
  assert.match(a.url, /utm_source=hopla/);
  assert.equal(b.url, soutien.url, 'PayPal.Me garde son adresse : les montants s’y ajoutent');
  assert.equal(blocsAvecUtm(REGLAGES_DEFAUT, [lien])[0].url, lien.url, 'éteint, rien ne change');
});

test('redirection : une adresse http(s), jusqu’à sa fin, jamais vers la page elle-même', () => {
  const maintenant = Date.parse('2026-10-24T12:00:00Z');
  assert.equal(redirectionActive({ url: '', fin: '' }, maintenant), null);
  assert.equal(redirectionActive({ url: 'https://sortie.fr/', fin: '' }, maintenant), 'https://sortie.fr/');
  assert.equal(redirectionActive({ url: 'https://sortie.fr/', fin: '2026-10-30T00:00:00.000Z' }, maintenant), 'https://sortie.fr/');
  assert.equal(redirectionActive({ url: 'https://sortie.fr/', fin: '2026-10-20T00:00:00.000Z' }, maintenant), null, 'finie');
  assert.equal(redirectionActive({ url: 'https://hopla.page/camille/', fin: '' }, maintenant, 'https://hopla.page/camille'), null, 'elle tournerait en rond');
  assert.equal(redirectionActive({ url: 'https://hopla.page/marie', fin: '' }, maintenant, 'https://hopla.page/camille'), 'https://hopla.page/marie');
  assert.equal(redirectionActive({ url: 'https://hpla.art/camille', fin: '' }, maintenant, 'https://hopla.page/camille'), null, 'son nom court tourne en rond aussi');
  assert.equal(redirectionActive({ url: 'https://hpla.art/marie', fin: '' }, maintenant, 'https://hopla.page/camille'), 'https://hpla.art/marie');

  const d = (domaine: unknown) => validerReglages({ ...REGLAGES_DEFAUT, domaine } as never, REGLAGES_DEFAUT).domaine;
  assert.equal(d('hpla.art'), 'hpla.art');
  assert.equal(d('exemple.com'), '');
  assert.equal(adressePartage({ pseudo: 'camille', principal: false }, 'hpla.eu'), 'https://hpla.eu/camille');
  assert.equal(adressePartage({ pseudo: 'camille', principal: false }, ''), 'https://hopla.page/camille');

  const r = validerReglages({ ...REGLAGES_DEFAUT, utm: true, redirection: { url: 'sortie.fr/lancement', fin: '2026-10-30T10:00' } }, REGLAGES_DEFAUT);
  assert.equal(r.utm, true);
  assert.equal(r.redirection.url, 'https://sortie.fr/lancement');
  assert.match(r.redirection.fin, /^2026-10-30T/);
  assert.deepEqual(validerReglages({ ...REGLAGES_DEFAUT, redirection: { url: 'javascript:alert(1)', fin: '2026-10-30' } }, REGLAGES_DEFAUT).redirection, { url: '', fin: '' });
  assert.deepEqual(validerReglages({ ...REGLAGES_DEFAUT, redirection: { url: 'mailto:a@b.fr', fin: '' } }, REGLAGES_DEFAUT).redirection, { url: '', fin: '' });
  // Une page enregistrée avant le 24 octobre 2026 se lit toujours, sans UTM ni redirection.
  const { utm: _u, redirection: _r, ...ancienne } = REGLAGES_DEFAUT;
  const relue = validerReglages(ancienne, { ...REGLAGES_DEFAUT, utm: undefined, redirection: undefined } as never);
  assert.equal(relue.utm, false);
  assert.deepEqual(relue.redirection, { url: '', fin: '' });
});

test('sans Starter, la page perd ses UTM et sa redirection, sans rien effacer ; un lien pour adultes reste à tous', () => {
  const reglages = { ...REGLAGES_DEFAUT, utm: true, redirection: { url: 'https://sortie.fr/', fin: '' } };
  const lien = validerBloc({ type: 'lien', titre: 'Club', url: 'club.fr', sensible: true }, 'a');
  const page = selonDroits(reglages, [lien], RIEN);
  assert.equal(page.reglages.utm, false);
  assert.deepEqual(page.reglages.redirection, { url: '', fin: '' });
  assert.equal(page.blocs[0].sensible, true);
  assert.equal(reglages.utm, true, 'la base garde le réglage');
  assert.equal(selonDroits(reglages, [lien], TOUT).reglages, reglages);
});

test('18+ : réservé aux liens et aux produits', () => {
  assert.equal(validerBloc({ type: 'lien', titre: 'Club', url: 'club.fr', sensible: true }, 'a').sensible, true);
  assert.equal(validerBloc({ type: 'produit', titre: 'Livre', url: 'boutique.fr/livre', sensible: true }, 'b').sensible, true);
  assert.equal(validerBloc({ type: 'texte', titre: 'Bonjour', sensible: true }, 'c').sensible, false);
  assert.equal(validerBloc({ type: 'lien', titre: 'Club', url: 'club.fr', sensible: 'oui' }, 'd').sensible, false);
  assert.equal(validerBloc({ type: 'lien', titre: 'Club', url: 'club.fr' }, 'e').sensible, false);
});
