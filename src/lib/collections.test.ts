import test from 'node:test';
import assert from 'node:assert/strict';
import { enGrille } from './collections.ts';
import { validerBloc, validerReglages } from './valider.ts';
import { selonDroits } from './droits.ts';
import type { Droits } from './droits.ts';
import { FONCTIONS } from './abonnement.ts';
import { REGLAGES_DEFAUT } from './defauts.ts';
import { POLICES_CHOIX, THEMES, themeDe, themeParId } from './themes.ts';

const TOUT = Object.fromEntries(Object.keys(FONCTIONS).map(f => [f, true])) as Droits;
const RIEN = Object.fromEntries(Object.keys(FONCTIONS).map(f => [f, false])) as Droits;
const bloc = (o: object, id: string) => validerBloc(o, id);

test('Collections : un titre en grille range en tuiles les liens simples qui le suivent, jusqu’au titre suivant', () => {
  const blocs = [
    bloc({ type: 'lien', titre: 'Avant', url: 'https://a.fr' }, 'avant'),
    bloc({ type: 'titre', titre: 'Mes boutiques', disposition: 'grille' }, 't1'),
    bloc({ type: 'lien', titre: 'Etsy', url: 'https://etsy.com/shop/x' }, 'etsy'),
    bloc({ type: 'texte', titre: 'Un mot' }, 'texte'),
    bloc({ type: 'lien', titre: 'Vedette', url: 'https://b.fr', vedette: true }, 'vedette'),
    bloc({ type: 'lien', titre: 'Drop', url: 'https://c.fr', acces: { code: '1234', places: 0 } }, 'drop'),
    bloc({ type: 'lien', titre: 'Plus tard', url: 'https://d.fr' }, 'attend'),
    bloc({ type: 'lien', titre: 'Shopify', url: 'https://e.fr' }, 'shopify'),
    bloc({ type: 'titre', titre: 'Le reste' }, 't2'),
    bloc({ type: 'lien', titre: 'Après', url: 'https://f.fr' }, 'apres'),
  ];
  assert.deepEqual([...enGrille(blocs, b => b.id === 'attend')], ['etsy', 'shopify']);
  assert.equal(enGrille(blocs.map(b => (b.type === 'titre' ? { ...b, disposition: 'liste' as const } : b))).size, 0);
});

test('Collections : la disposition ne vaut que pour un titre, et repasse en liste sans Starter', () => {
  assert.equal(bloc({ type: 'titre', disposition: 'grille' }, 't').disposition, 'grille');
  assert.equal(bloc({ type: 'titre', disposition: 'carrousel' }, 't').disposition, 'liste');
  assert.equal(bloc({ type: 'lien', disposition: 'grille' }, 'l').disposition, 'liste');
  const titre = bloc({ type: 'titre', disposition: 'grille' }, 't');
  assert.equal(selonDroits(REGLAGES_DEFAUT, [titre], TOUT).blocs[0].disposition, 'grille');
  assert.equal(selonDroits(REGLAGES_DEFAUT, [titre], RIEN).blocs[0].disposition, 'liste');
});

test('Police : choisie parmi celles des thèmes, avec la typographie du thème qui la porte ; mono ne se choisit pas', () => {
  const nuit = themeParId('nuit-peche');
  const avec = themeDe({ theme: 'nuit-peche', police: 'display' });
  const porteur = THEMES.find(t => t.police === 'display')!;
  assert.equal(avec.police, 'display');
  assert.deepEqual(avec.typo, porteur.typo, 'la typographie réglée voyage avec la police');
  assert.equal(avec.fondUni, nuit.fondUni, 'les couleurs restent celles de la page');
  assert.deepEqual(themeDe({ theme: 'nuit-peche', police: '' }), nuit);
  for (const p of POLICES_CHOIX) assert.ok(THEMES.some(t => t.police === p), `${p} est portée par un thème`);
  assert.equal(validerReglages({ police: 'mono' }, REGLAGES_DEFAUT).police, '');
  assert.equal(validerReglages({ police: 'serif' }, REGLAGES_DEFAUT).police, 'serif');
});

test('Image de fond et grande photo : des photos envoyées chez Hopla seulement, retirées de la page sans l’offre', () => {
  const r = validerReglages({ imageFond: '/media/abc.webp', profil: { nom: 'Camille', photo: 'grande' }, police: 'serif' }, REGLAGES_DEFAUT);
  assert.equal(r.imageFond, '/media/abc.webp');
  assert.equal(r.profil.photo, 'grande');
  assert.equal(validerReglages({ imageFond: 'https://ailleurs.fr/fond.jpg' }, REGLAGES_DEFAUT).imageFond, '', 'rien ne se charge d’un autre site');
  assert.equal(validerReglages({ profil: { nom: 'Camille', photo: 'hexagone' } }, REGLAGES_DEFAUT).profil.photo, 'ronde');
  // Une page d'avant le lot 3 garde le rond, sans police ni fond.
  const { police, imageFond, ...ancienne } = REGLAGES_DEFAUT;
  const relue = validerReglages({ ...ancienne, profil: { nom: 'Camille' } }, { ...REGLAGES_DEFAUT, profil: { ...REGLAGES_DEFAUT.profil, photo: undefined as never } });
  assert.equal(relue.profil.photo, 'ronde');
  assert.equal(relue.police, '');
  assert.equal(relue.imageFond, '');
  assert.equal(selonDroits(r, [], TOUT).reglages, r, 'une page qui a tout garde ses réglages tels quels');
  const sans = selonDroits(r, [], RIEN).reglages;
  assert.equal(sans.imageFond, '');
  assert.equal(sans.profil.photo, 'ronde');
  assert.equal(sans.police, '');
  assert.equal(r.imageFond, '/media/abc.webp', 'rien n’est effacé de la base');
  void police; void imageFond;
});
