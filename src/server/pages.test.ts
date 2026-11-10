import test from 'node:test';
import assert from 'node:assert/strict';

process.env.LIENS_DB = ':memory:';
const db = await import('./db.ts');
const { droits, pageEnLigne } = await import('./droits.ts');
const { supprimerAvecAbonnement } = await import('./suppression.ts');
const { PRINCIPAL } = await import('../lib/types.ts');

test.beforeEach(() => { db.fermer(); });

/** Avec Creem : plusieurs pages demandent Premium. Sans lui (en local), rien n'est réservé. */
const PAYANT = { CREEM_API_KEY: 'creem_test_x', CREEM_WEBHOOK_SECRET: 'whsec_x' };
const interdit = (async () => { throw new Error('Creem ne doit pas être appelé'); }) as unknown as typeof fetch;

test('une page en plus suit l’adresse, les conditions et l’offre de son compte', () => {
  const marie = db.creerCompte('marie@exemple.fr', 'marie');
  db.offrir(marie.id, 'premium', null);
  const atelier = db.creerPage(marie, 'atelier-marie', 'en');
  assert.equal(atelier.proprietaire, marie.id);
  assert.equal(atelier.email, 'marie@exemple.fr');
  assert.equal(db.lireReglages(atelier.id).langue, 'en');
  // On n'entre que par le compte : l'adresse ne mène qu'à lui, et la page n'a ni essai ni abonnement à elle.
  assert.equal(db.compteParEmail('marie@exemple.fr')?.id, marie.id);
  assert.equal(atelier.essai_jusqu, null);
  assert.equal(atelier.offerte, '');
  assert.equal(db.abonnement(atelier).plan, 'premium');
  assert.equal(db.titulaire(atelier).id, marie.id);
  assert.deepEqual(db.pagesDe(atelier).map(p => p.pseudo), ['marie', 'atelier-marie']);
  assert.deepEqual(db.pagesDe(db.compteParId(marie.id)!).map(p => p.pseudo), ['marie', 'atelier-marie']);
  assert.throws(() => db.creerPage(marie, 'marie'), /déjà pris/);
  assert.throws(() => db.changerEmail(atelier.id, 'autre@exemple.fr'), /page en plus/);

  // Les conditions s'acceptent une fois, depuis n'importe quelle page.
  db.accepterCgu(atelier.id, '2026-11-10.1');
  assert.equal(db.compteParId(marie.id)?.cgu, '2026-11-10.1');
  assert.equal(db.compteParPseudo('atelier-marie')?.cgu, '2026-11-10.1');

  // Dans Comptes, elle se lit avec l'adresse et l'offre de son compte.
  const ligne = db.listerComptes().find(c => c.pseudo === 'atelier-marie')!;
  assert.equal(ligne.email, 'marie@exemple.fr');
  assert.equal(ligne.pageDe, 'marie');
  assert.equal(ligne.plan, 'premium');
});

test('une page en plus ne répond que tant que l’offre du compte comprend plusieurs pages', () => {
  const marie = db.creerCompte('marie@exemple.fr', 'marie');
  const atelier = db.creerPage(marie, 'atelier-marie');
  // L'essai est un Pro : pas de pages en plus.
  assert.equal(droits(atelier, PAYANT).pages, false);
  assert.equal(pageEnLigne(atelier, PAYANT), false);
  assert.equal(pageEnLigne(db.compteParId(marie.id), PAYANT), true);
  db.offrir(marie.id, 'premium', null);
  assert.equal(pageEnLigne(db.compteParId(atelier.id), PAYANT), true);
  // Sans paiement branché, rien n'est réservé.
  db.retirerOffre(marie.id);
  assert.equal(pageEnLigne(db.compteParId(atelier.id), {}), true);
  // Le compte suspendu, ses pages ne répondent plus ; la page suspendue seule, le compte répond toujours.
  db.changerStatut(marie.id, 'suspendu');
  assert.equal(pageEnLigne(db.compteParId(atelier.id), {}), false);
  db.changerStatut(marie.id, 'actif');
  db.changerStatut(atelier.id, 'suspendu');
  assert.equal(pageEnLigne(db.compteParId(atelier.id), {}), false);
  assert.equal(pageEnLigne(db.compteParId(marie.id), {}), true);
  assert.equal(pageEnLigne(undefined), false);
});

test('la session passe d’une page à l’autre, et tombe avec le compte', () => {
  const marie = db.creerCompte('marie@exemple.fr', 'marie');
  const atelier = db.creerPage(marie, 'atelier-marie');
  db.ajouterJeton('h'.repeat(64), 'session', 60_000, marie.id);
  assert.equal(db.verifierJeton('h'.repeat(64), 'session'), marie.id);
  assert.equal(db.deplacerJeton('h'.repeat(64), atelier.id), true);
  assert.equal(db.verifierJeton('h'.repeat(64), 'session'), atelier.id);
  assert.equal(db.deplacerJeton('x'.repeat(64), atelier.id), false);
  db.changerStatut(marie.id, 'suspendu');
  assert.equal(db.verifierJeton('h'.repeat(64), 'session'), null);
});

test('supprimer une page en plus ne touche ni au compte ni à son abonnement ; supprimer le compte emporte ses pages', async () => {
  const marie = db.creerCompte('marie@exemple.fr', 'marie');
  db.appliquerAbonnement(marie.id, { client: 'cust_1', abonnement: 'sub_1', statut: 'active', finPeriode: Date.now() + 86_400_000, maj: 1 });
  const atelier = db.creerPage(marie, 'atelier-marie');
  const boutique = db.creerPage(marie, 'boutique-marie');
  // La page n'a pas d'abonnement à résilier : Creem n'est pas appelé.
  assert.deepEqual(await supprimerAvecAbonnement(PAYANT, interdit, atelier), { ok: true, resiliation: 'aucune' });
  assert.equal(db.compteParId(atelier.id), undefined);
  assert.equal(db.compteParId(marie.id)?.creem_abonnement, 'sub_1');
  assert.deepEqual(db.pagesDe(boutique).map(p => p.pseudo), ['marie', 'boutique-marie']);
  db.supprimerCompte(marie.id);
  assert.equal(db.compteParId(boutique.id), undefined);
  assert.equal(db.nomPris('boutique-marie'), false);
});

test('la purge des pages jamais ouvertes laisse une page en plus encore vide', () => {
  const marie = db.creerCompte('marie@exemple.fr', 'marie', Date.now() - 90 * 86_400_000);
  db.noterConnexion(marie.id);
  const atelier = db.creerPage(db.compteParId(marie.id)!, 'atelier-marie', 'fr', Date.now() - 60 * 86_400_000);
  db.purger();
  assert.ok(db.compteParId(atelier.id));
});

test('les pages du compte principal ont tout, comme lui', () => {
  const lilian = db.compteParId(PRINCIPAL)!;
  const projet = db.creerPage(lilian, 'projet-test');
  assert.equal(db.duPrincipal(projet), true);
  assert.equal(db.abonnement(projet).plan, 'premium');
  assert.equal(pageEnLigne(projet, PAYANT), true);
  assert.equal(db.duPrincipal(db.creerCompte('marie@exemple.fr', 'marie')), false);
});
