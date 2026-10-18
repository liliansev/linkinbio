import test from 'node:test';
import assert from 'node:assert/strict';

process.env.LIENS_DB = ':memory:';
const db = await import('./db.ts');
const auth = await import('./auth.ts');
const { source, appareil, enregistrer } = await import('./analytique.ts');
const { validerBloc, validerReglages, adresse, pseudo, email } = await import('../lib/valider.ts');
const P = 'principal';
const O = { page: 'https://hopla.page', admin: 'https://app.hopla.page' };
const { REGLAGES_DEFAUT } = await import('../lib/defauts.ts');

test.beforeEach(() => { db.fermer(); });

test('la base se remplit une fois, puis ajoute en tête, réordonne et supprime', () => {
  const depart = db.lireBlocs(P);
  assert.ok(depart.length >= 5);
  assert.equal(db.stockageEphemere(), true);
  const bloc = validerBloc({ type: 'lien', titre: 'Nouveau', url: 'exemple.fr' }, 'abc');
  db.enregistrerBloc(P, bloc);
  assert.equal(db.lireBlocs(P)[0].id, 'abc');
  assert.equal(db.lireBlocs(P)[0].url, 'https://exemple.fr/');
  db.enregistrerBloc(P, { ...bloc, titre: 'Renommé' });
  assert.equal(db.lireBlocs(P)[0].titre, 'Renommé');
  const ids = db.lireBlocs(P).map(b => b.id).reverse();
  db.ordonner(P, ids);
  assert.deepEqual(db.lireBlocs(P).map(b => b.id), ids);
  db.supprimerBloc(P, 'abc');
  assert.equal(db.lireBlocs(P).length, depart.length);
});

test('les adresses dangereuses sont refusées, les raccourcis complétés', () => {
  assert.equal(adresse('javascript:alert(1)'), '');
  assert.equal(adresse('data:text/html,x'), '');
  assert.equal(adresse('moi@exemple.fr'), 'mailto:moi@exemple.fr');
  assert.equal(adresse('/blog'), '/blog');
  assert.equal(adresse('//evil.com'), 'https://evil.com/');
  const b = validerBloc({ type: 'rien', titre: 'x'.repeat(500), public: 'oui', image: 'data:image/png;base64,AAA', animation: 'feu' }, 'id');
  assert.equal(b.type, 'lien'); assert.equal(b.titre.length, 160); assert.equal(b.public, true); assert.equal(b.image, ''); assert.equal(b.animation, 'auto');
  // Les noms d'avant gardent leur mouvement.
  assert.equal(validerBloc({ animation: 'brille' }, 'id').animation, 'reflet');
  assert.equal(validerBloc({ image: '/liens/media/ab-1.webp' }, 'id').image, '/media/ab-1.webp', 'une ancienne adresse d’image est reprise');
  assert.equal(validerBloc({ image: '/media/ab-1.webp' }, 'id').image, '/media/ab-1.webp');
  assert.equal(validerBloc({ image: '/ailleurs/ab.webp' }, 'id').image, '');
  assert.equal(pseudo('hopla'), ''); assert.equal(pseudo('admin'), '');
  const r = validerReglages({ theme: 'inconnu', bouton: { style: 'rien' }, reseaux: [{ reseau: 'youtube', url: '' }, { reseau: 'x', url: 'x.com/moi' }] }, REGLAGES_DEFAUT);
  assert.equal(r.theme, 'nuit-peche'); assert.equal(r.bouton.style, 'plein'); assert.deepEqual(r.reseaux, [{ reseau: 'x', url: 'https://x.com/moi' }]);
});

test('connexion par lien : envoi par Resend, usage unique, limite d’envoi', async () => {
  const envois: { url: string; corps: any }[] = [];
  const fetchFaux = (async (url: string, init: RequestInit) => { envois.push({ url, corps: JSON.parse(String(init.body)) }); return new Response('{}', { status: 200 }); }) as typeof fetch;
  const env = { RESEND_API_KEY: 'cle', NODE_ENV: 'production' };
  const r = await auth.demanderConnexion(O, env, 'Bonjour@liliansevoumian.fr', fetchFaux, 1_000_000, '1.1.1.1');
  assert.equal(r.ok, true);
  assert.deepEqual(envois[0].corps.to, ['bonjour@liliansevoumian.fr']);
  assert.equal(envois[0].corps.from, 'Hopla <connexion@hopla.page>');
  assert.match(envois[0].corps.text, /https:\/\/app\.hopla\.page\/admin\/connexion\?jeton=/, 'le lien ouvre le back office, sur son propre nom');
  const jeton = /jeton=([\w-]+)/.exec(envois[0].corps.text)![1];
  const encore = await auth.demanderConnexion(O, env, 'bonjour@liliansevoumian.fr', fetchFaux, 1_030_000, '1.1.1.2');
  assert.equal(encore.ok, true, 'même réponse…');
  assert.equal(envois.length, 1, '… mais un seul lien par minute');
  const inconnu = await auth.demanderConnexion(O, env, 'personne@exemple.fr', fetchFaux, 1_100_000, '1.1.1.3');
  assert.equal(inconnu.message, `Si personne@exemple.fr a un compte, le lien vient de partir. Il marche une fois, pendant 15 minutes.`, 'une adresse inconnue reçoit la même réponse');
  assert.equal(envois.length, 1, 'et rien ne part');
  const session = auth.ouvrirSession(jeton);
  assert.ok(session);
  assert.equal(auth.compteDeSession(session), P);
  assert.equal(auth.ouvrirSession(jeton), null, 'le lien ne sert qu’une fois');
  auth.fermerSession(session);
  assert.equal(auth.compteDeSession(session), null);
  assert.equal(auth.compteDeSession('n’importe quoi'), null);
  const sansCle = await auth.demanderConnexion(O, { NODE_ENV: 'production' }, 'bonjour@liliansevoumian.fr', fetchFaux, 9_000_000, '1.1.1.4');
  assert.equal(sansCle.ok, false);
  assert.equal(auth.masquer('bonjour@liliansevoumian.fr'), 'b•••••r@liliansevoumian.fr');
  assert.equal(auth.adresseAdmin({ CONTACT_TO: 'a@b.fr' }), 'a@b.fr');
});

test('statistiques : sources lisibles, robots et admin écartés, totaux et tendance', () => {
  assert.equal(source('', 'https://l.instagram.com/?u=x'), 'Instagram');
  assert.equal(source('', 'https://mail.google.com/'), 'E-mail');
  assert.equal(source('', 'https://www.google.fr/'), 'Google');
  assert.equal(source('qr', ''), 'QR code');
  assert.equal(source('', ''), 'Direct');
  assert.equal(appareil('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'), 'Mobile');
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari';
  const maintenant = Date.parse('2026-10-16T12:00:00Z');
  assert.equal(enregistrer({ type: 'vue', bloc: null, utm: '', referent: '' }, { ip: '1.1.1.1', ua: 'Googlebot/2.1', session: null }, maintenant), false);
  assert.equal(enregistrer({ type: 'vue', bloc: null, utm: '', referent: '' }, { ip: '1.1.1.1', ua: iphone, session: P }, maintenant), false);
  enregistrer({ type: 'vue', bloc: null, utm: '', referent: 'https://www.instagram.com/' }, { ip: '1.1.1.1', ua: iphone, session: null }, maintenant);
  enregistrer({ type: 'vue', bloc: null, utm: '', referent: '' }, { ip: '1.1.1.1', ua: iphone, session: null }, maintenant + 1000);
  enregistrer({ type: 'vue', bloc: null, utm: '', referent: '' }, { ip: '2.2.2.2', ua: iphone, session: null }, maintenant);
  const id = db.lireBlocs(P)[0].id;
  enregistrer({ type: 'clic', bloc: id, utm: '', referent: '' }, { ip: '2.2.2.2', ua: iphone, session: null }, maintenant);
  assert.equal(enregistrer({ type: 'clic', bloc: '../x', utm: '', referent: '' }, { ip: '2.2.2.2', ua: iphone, session: null }, maintenant), false);
  enregistrer({ type: 'vue', bloc: null, utm: '', referent: '' }, { ip: '3.3.3.3', ua: iphone, session: null }, maintenant - 10 * 86_400_000);
  const s = db.stats(P, 7, maintenant);
  assert.equal(s.vues, 3); assert.equal(s.visiteurs, 2); assert.equal(s.clics, 1);
  assert.equal(s.serie.length, 7); assert.equal(s.serie[6].vues, 3);
  assert.equal(s.precedent.vues, 1);
  assert.deepEqual(s.blocs.map(b => b.id), [id]);
  assert.equal(s.sources[0].nom, 'Direct');
});

test('comptes : chaque page est isolée des autres', async () => {
  const camille = db.creerCompte('Camille@Exemple.fr', 'camille');
  assert.equal(camille.email, 'camille@exemple.fr');
  assert.throws(() => db.creerCompte('camille@exemple.fr', 'autre'), /déjà un compte/);
  assert.throws(() => db.creerCompte('autre@exemple.fr', 'camille'), /déjà pris/);
  assert.equal(db.lireBlocs(camille.id).length, 0, 'une page neuve est vide');
  assert.equal(db.lireReglages(camille.id).profil.nom, 'camille');
  assert.equal(db.lireReglages(camille.id).seo.indexable, false);

  // Un bloc de Lilian ne se lit, ne se modifie, ne se déplace ni ne se supprime depuis un autre compte.
  const aLilian = db.lireBlocs(P)[0];
  assert.throws(() => db.enregistrerBloc(camille.id, { ...aLilian, titre: 'Piraté' }), /introuvable/);
  db.supprimerBloc(camille.id, aLilian.id);
  db.ordonner(camille.id, [aLilian.id]);
  assert.deepEqual(db.lireBlocs(P)[0], aLilian);
  db.enregistrerBloc(camille.id, validerBloc({ type: 'lien', titre: 'Mon portfolio', url: 'camille.fr' }, 'c1'));
  assert.deepEqual(db.lireBlocs(camille.id).map(b => b.id), ['c1']);
  assert.ok(!db.lireBlocs(P).some(b => b.id === 'c1'));
  db.ecrireReglages(camille.id, { ...db.lireReglages(camille.id), theme: 'craie' });
  assert.notEqual(db.lireReglages(P).profil.nom, 'camille');

  // Les statistiques : un clic sur la page de Camille ne compte que chez elle, et pas sur un bloc d'un autre.
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari';
  const t = Date.parse('2026-10-17T12:00:00Z');
  assert.equal(enregistrer({ page: 'camille', type: 'vue', bloc: null, utm: '', referent: '' }, { ip: '9.9.9.1', ua: iphone, session: null }, t), true);
  assert.equal(enregistrer({ page: 'camille', type: 'clic', bloc: 'c1', utm: '', referent: '' }, { ip: '9.9.9.1', ua: iphone, session: null }, t), true);
  assert.equal(enregistrer({ page: 'camille', type: 'clic', bloc: aLilian.id, utm: '', referent: '' }, { ip: '9.9.9.1', ua: iphone, session: null }, t), false);
  assert.equal(enregistrer({ page: 'camille', type: 'vue', bloc: null, utm: '', referent: '' }, { ip: '9.9.9.2', ua: iphone, session: camille.id }, t), false, 'Camille connectée ne se compte pas');
  assert.equal(enregistrer({ page: 'inconnu', type: 'vue', bloc: null, utm: '', referent: '' }, { ip: '9.9.9.3', ua: iphone, session: null }, t), false);
  assert.equal(db.stats(camille.id, 7, t).vues, 1);
  assert.equal(db.stats(camille.id, 7, t).clics, 1);
  assert.equal(db.stats(P, 7, t).vues, 0);

  // Les images comptent dans le quota du compte.
  const media = db.ajouterMedia(camille.id, new Uint8Array(10), 'webp');
  assert.ok(db.lireMedia(media, 'webp'));
  assert.throws(() => db.ajouterMedia(camille.id, new Uint8Array(db.QUOTA_MEDIAS), 'webp'), /Plus de place/);

  // Connexion : le lien part à Camille et ouvre son compte, pas celui de Lilian.
  const envois: any[] = [];
  const fetchFaux = (async (_: string, init: RequestInit) => { envois.push(JSON.parse(String(init.body))); return new Response('{}'); }) as typeof fetch;
  const env = { RESEND_API_KEY: 'cle', NODE_ENV: 'production' };
  await auth.demanderConnexion(O, env, 'camille@exemple.fr', fetchFaux, Date.now(), '9.9.9.4');
  assert.deepEqual(envois[0].to, ['camille@exemple.fr']);
  const session = auth.ouvrirSession(/jeton=([\w-]+)/.exec(envois[0].text)![1])!;
  assert.equal(auth.compteDeSession(session), camille.id);
  assert.ok(db.compteParId(camille.id)!.connexion);

  // L'invitation part à la bonne adresse avec l'adresse de la page.
  const inv = await auth.inviter(O, env, camille, fetchFaux);
  assert.equal(inv.ok, true);
  assert.match(envois[1].text, /https:\/\/hopla\.page\/camille\n/);
  assert.match(envois[1].text, /https:\/\/app\.hopla\.page\/admin\/connexion\?jeton=/);

  // Suspendu : plus de session, plus de connexion, plus de page.
  db.changerStatut(camille.id, 'suspendu');
  assert.equal(auth.compteDeSession(session), null);
  assert.equal(auth.compteParAdresse('camille@exemple.fr', env), null);
  assert.equal(enregistrer({ page: 'camille', type: 'vue', bloc: null, utm: '', referent: '' }, { ip: '9.9.9.5', ua: iphone, session: null }, t), false);
  assert.throws(() => db.changerStatut(P, 'suspendu'));

  // Supprimé : plus rien.
  const liste = db.listerComptes();
  assert.equal(liste[0].principal, true);
  assert.equal(liste.find(c => c.id === camille.id)!.blocs, 1);
  db.supprimerCompte(camille.id);
  assert.equal(db.compteParId(camille.id), undefined);
  assert.equal(db.lireMedia(media, 'webp'), null);
  assert.throws(() => db.lireReglages(camille.id));
  assert.throws(() => db.supprimerCompte(P));
});

test('pseudos et adresses : formats, mots réservés', () => {
  assert.equal(pseudo('Camille-Studio'), 'camille-studio');
  assert.equal(pseudo('ab'), '');
  assert.equal(pseudo('admin'), '');
  assert.equal(pseudo('-camille'), '');
  assert.equal(pseudo('a--b'), '');
  assert.equal(pseudo('été'), '');
  assert.equal(email(' Moi@Exemple.FR '), 'moi@exemple.fr');
  assert.equal(email('moi<script>@exemple.fr'), '');
  assert.equal(email('pas-une-adresse'), '');
});

test('une base d’avant les comptes est reprise telle quelle par le compte principal', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const fichier = join(mkdtempSync(join(tmpdir(), 'liens-')), 'ancienne.db');
  const ancienne = new DatabaseSync(fichier);
  ancienne.exec(`CREATE TABLE reglages (cle TEXT PRIMARY KEY, valeur TEXT NOT NULL);
    CREATE TABLE blocs (id TEXT PRIMARY KEY, position INTEGER NOT NULL, donnees TEXT NOT NULL);
    CREATE TABLE medias (id TEXT PRIMARY KEY, extension TEXT NOT NULL, octets BLOB NOT NULL, cree INTEGER NOT NULL);
    CREATE TABLE evenements (id INTEGER PRIMARY KEY, type TEXT NOT NULL, bloc TEXT, jour TEXT NOT NULL, ts INTEGER NOT NULL, visiteur TEXT NOT NULL, source TEXT NOT NULL, appareil TEXT NOT NULL);
    CREATE INDEX evenements_jour ON evenements (jour, type);
    CREATE TABLE jetons (hash TEXT PRIMARY KEY, type TEXT NOT NULL, expire INTEGER NOT NULL, cree INTEGER NOT NULL);`);
  ancienne.prepare('INSERT INTO reglages VALUES (?, ?)').run('page', JSON.stringify({ ...REGLAGES_DEFAUT, profil: { ...REGLAGES_DEFAUT.profil, nom: 'Ancien nom', avatar: '/liens/avatar.webp' } }));
  // Les images d'avant hopla.page, sous /liens.
  ancienne.prepare('INSERT INTO blocs VALUES (?, ?, ?)').run('vieux', 0, JSON.stringify({ ...validerBloc({ type: 'lien', titre: 'Vieux lien', url: 'a.fr' }, 'vieux'), image: '/liens/media/abc123.webp' }));
  ancienne.prepare('INSERT INTO jetons VALUES (?, ?, ?, ?)').run(auth.empreinte('session-d-avant-les-comptes-0000'), 'session', Date.now() + 86_400_000, Date.now());
  ancienne.close();
  process.env.LIENS_DB = fichier;
  db.fermer();
  try {
    assert.equal(db.lireReglages(P).profil.nom, 'Ancien nom');
    assert.deepEqual(db.lireBlocs(P).map(b => b.id), ['vieux']);
    assert.equal(db.lireBlocs(P)[0].image, '/media/abc123.webp', 'les images quittent /liens');
    assert.equal(db.lireReglages(P).profil.avatar, '/avatar.webp');
    assert.equal(auth.compteDeSession('session-d-avant-les-comptes-0000'), P, 'la session ouverte reste valable');
    db.fermer();
    assert.deepEqual(db.lireBlocs(P).map(b => b.id), ['vieux'], 'une seconde ouverture ne change rien');
  } finally { db.fermer(); process.env.LIENS_DB = ':memory:'; }
});

test('conservation : les statistiques de plus de treize mois et les jetons expirés partent à la purge', () => {
  const maintenant = Date.parse('2026-10-17T12:00:00Z');
  db.ajouterEvenement({ compte: P, type: 'vue', bloc: null, visiteur: 'a', source: 'Direct', appareil: 'Mobile', ts: maintenant - 400 * 86_400_000 });
  db.ajouterEvenement({ compte: P, type: 'vue', bloc: null, visiteur: 'b', source: 'Direct', appareil: 'Mobile', ts: maintenant - 300 * 86_400_000 });
  db.purger(maintenant);
  const restes = db.exporter(P).statistiques;
  assert.equal(restes.length, 1);
  assert.equal(restes[0].ts, new Date(maintenant - 300 * 86_400_000).toISOString());
});

test('export : tout le compte, sans l’empreinte des visiteurs', () => {
  const zoe = db.creerCompte('zoe@exemple.fr', 'zoe');
  db.enregistrerBloc(zoe.id, validerBloc({ type: 'lien', titre: 'Portfolio', url: 'zoe.fr' }, 'z1'));
  db.ajouterMedia(zoe.id, new Uint8Array([1, 2, 3]), 'webp');
  db.ajouterEvenement({ compte: zoe.id, type: 'clic', bloc: 'z1', visiteur: 'secret', source: 'Instagram', appareil: 'Mobile' });
  db.accepterCgu(zoe.id, '2026-10-17', 1_000);
  const e = db.exporter(zoe.id);
  assert.equal(e.compte.pseudo, 'zoe');
  assert.equal(e.compte.email, 'zoe@exemple.fr');
  assert.deepEqual(e.compte.conditionsAcceptees, { version: '2026-10-17', le: new Date(1_000).toISOString() });
  assert.deepEqual(e.blocs.map(b => b.id), ['z1']);
  assert.equal(e.images.length, 1);
  assert.match(e.images[0].donnees, /^data:image\/webp;base64,AQID$/);
  assert.equal(e.statistiques.length, 1);
  assert.ok(!JSON.stringify(e).includes('secret'));
  assert.equal(db.exporter(P).blocs.some(b => b.id === 'z1'), false, 'l’export d’un compte ne contient que lui');
});

test('signalements : formulaire, accusé de réception, suspension motivée, décision à qui a signalé', async () => {
  const { signaler, traiter, supprimerMotive, changerStatutMotive } = await import('./moderation.ts');
  const envois: any[] = [];
  const fetchFaux = (async (_: string, init: RequestInit) => { envois.push(JSON.parse(String(init.body))); return new Response('{}'); }) as typeof fetch;
  const env = { RESEND_API_KEY: 'cle', NODE_ENV: 'production', CONTACT_TO: 'lilian@exemple.fr' };
  const hugo = db.creerCompte('hugo@exemple.fr', 'hugo');
  const base = { page: 'hugo', motif: 'arnaque', details: 'Le lien mène à une fausse page Instagram.', email: 'Temoin@Exemple.fr', bonneFoi: true };

  assert.equal((await signaler(env, fetchFaux, { ...base, page: '' }, '5.5.5.1', O)).ok, false, 'pas de signalement sur la page de Lilian');
  assert.equal((await signaler(env, fetchFaux, { ...base, motif: 'rien' }, '5.5.5.1', O)).ok, false);
  assert.equal((await signaler(env, fetchFaux, { ...base, details: 'court' }, '5.5.5.1', O)).ok, false);
  assert.equal((await signaler(env, fetchFaux, { ...base, bonneFoi: false }, '5.5.5.1', O)).ok, false);
  assert.equal(envois.length, 0);

  const r = await signaler(env, fetchFaux, base, '5.5.5.2', O);
  assert.equal(r.ok, true);
  assert.deepEqual(envois.map(e => e.to[0]), ['lilian@exemple.fr', 'temoin@exemple.fr'], 'Lilian est prévenu, la personne reçoit un accusé');
  assert.equal(envois[0].reply_to, 'temoin@exemple.fr');
  const [s] = db.listerSignalements();
  assert.equal(s.pseudo, 'hugo'); assert.equal(s.statut, 'ouvert');

  // Cinq signalements par heure et par IP.
  for (let i = 0; i < 5; i++) await signaler(env, fetchFaux, { ...base, email: '' }, '5.5.5.9', O);
  assert.equal((await signaler(env, fetchFaux, { ...base, email: '' }, '5.5.5.9', O)).ok, false);

  envois.length = 0;
  await assert.rejects(() => changerStatutMotive(env, fetchFaux, hugo.id, 'suspendu', '  '), /motif/);
  await traiter(env, fetchFaux, s.id, 'suspendu', 'Lien de hameçonnage (CGU, « Ce que tu publies »).', O.page);
  assert.equal(db.compteParId(hugo.id)!.statut, 'suspendu');
  assert.deepEqual(envois.map(e => e.to[0]), ['hugo@exemple.fr', 'temoin@exemple.fr']);
  assert.match(envois[0].text, /hameçonnage/);
  assert.match(envois[0].text, /contester/);
  assert.match(envois[1].text, /suspendue/);
  assert.match(envois[1].text, /https:\/\/hopla\.page\/hugo a été examiné/);
  assert.equal(db.signalementParId(s.id)!.statut, 'suspendu');
  await assert.rejects(() => traiter(env, fetchFaux, s.id, 'sans-suite', '', O.page), /déjà traité/);

  // Une suppression à la demande de la personne part sans e-mail ; une suppression motivée, avec.
  envois.length = 0;
  await supprimerMotive(env, fetchFaux, hugo.id, '');
  assert.equal(envois.length, 0);
  assert.equal(db.compteParId(hugo.id), undefined);
  assert.equal(db.listerSignalements().some(x => x.compte === hugo.id), false, 'les signalements du compte partent avec lui');
  const lea = db.creerCompte('lea@exemple.fr', 'lea');
  await supprimerMotive(env, fetchFaux, lea.id, 'Usurpation d’identité.');
  assert.deepEqual(envois.map(e => e.to[0]), ['lea@exemple.fr']);
});

test('offre Pro : estPro lit le statut, la fin de période et la grâce', async () => {
  const { estPro, GRACE_JOURS } = await import('../lib/abonnement.ts');
  const t = Date.parse('2026-10-17T12:00:00Z'), jour = 86_400_000;
  assert.equal(estPro({ statut: '', finPeriode: null }, t), false);
  assert.equal(estPro({ statut: 'active', finPeriode: t + 10 * jour }, t), true);
  assert.equal(estPro({ statut: 'active', finPeriode: t - (GRACE_JOURS - 1) * jour }, t), true, 'un renouvellement sans nouvelles garde quelques jours');
  assert.equal(estPro({ statut: 'active', finPeriode: t - (GRACE_JOURS + 1) * jour }, t), false);
  assert.equal(estPro({ statut: 'scheduled_cancel', finPeriode: t + jour }, t), true);
  assert.equal(estPro({ statut: 'scheduled_cancel', finPeriode: t - 1 }, t), false, 'une résiliation s’arrête net à la fin de la période');
  assert.equal(estPro({ statut: 'past_due', finPeriode: t + jour }, t), true);
  for (const statut of ['canceled', 'expired', 'unpaid', 'paused']) assert.equal(estPro({ statut, finPeriode: t + jour }, t), false, statut);
});

test('offre Pro : webhooks Creem signés, idempotents, dans le désordre', async () => {
  const { createHmac } = await import('node:crypto');
  const creem = await import('./creem.ts');
  const env = { CREEM_API_KEY: 'creem_test_x', CREEM_WEBHOOK_SECRET: 'whsec_test', CREEM_PRODUIT_MOIS: 'prod_mois', CREEM_PRODUIT_AN: 'prod_an' };
  const t = Date.parse('2026-10-17T12:00:00Z'), jour = 86_400_000;
  const signe = (corps: string, secret = env.CREEM_WEBHOOK_SECRET) => createHmac('sha256', secret).update(corps).digest('hex');
  const envoyer = (e: object, secret?: string) => { const corps = JSON.stringify(e); return creem.traiterWebhook(env, corps, signe(corps, secret), t); };
  const lea = db.creerCompte('lea@exemple.fr', 'lea');
  assert.equal(db.compteEstPro(lea.id, t), false);
  assert.equal(db.compteEstPro(P, t), true, 'le compte principal est toujours Pro');

  // Sans configuration, mauvaise signature, JSON cassé : rien ne s'applique.
  assert.equal(creem.traiterWebhook({}, '{}', 'x', t).status, 503);
  const achat = { id: 'evt_1', eventType: 'checkout.completed', created_at: t, object: { id: 'ch_1', metadata: { compte: lea.id }, customer: { id: 'cust_1' }, subscription: { id: 'sub_1', status: 'active', current_period_end_date: new Date(t + 30 * jour).toISOString() } } };
  assert.equal(envoyer(achat, 'autre secret').status, 401);
  assert.equal(creem.traiterWebhook(env, '{', signe('{'), t).status, 400);
  assert.equal(creem.traiterWebhook(env, JSON.stringify(achat), null, t).status, 401);
  assert.equal(db.compteEstPro(lea.id, t), false);

  // Le paiement : le compte voyage dans les métadonnées.
  assert.equal(envoyer(achat).status, 200);
  assert.equal(db.compteEstPro(lea.id, t), true);
  const c = db.compteParId(lea.id)!;
  assert.equal(c.creem_client, 'cust_1');
  assert.equal(c.creem_abonnement, 'sub_1');
  assert.equal(db.abonnement(c, t).portail, true);
  assert.equal(envoyer(achat).message, 'déjà traité', 'un même événement ne s’applique qu’une fois');

  // La résiliation, retrouvée par l'abonnement seul ; un événement plus ancien arrivé après est ignoré.
  envoyer({ id: 'evt_2', eventType: 'subscription.scheduled_cancel', created_at: t + 2 * jour, object: { id: 'sub_1', status: 'scheduled_cancel', customer: 'cust_1', current_period_end_date: new Date(t + 30 * jour).toISOString() } });
  envoyer({ id: 'evt_0', eventType: 'subscription.active', created_at: t + jour, object: { id: 'sub_1', status: 'active', customer: 'cust_1' } });
  assert.equal(db.compteParId(lea.id)!.abonnement_statut, 'scheduled_cancel');
  assert.equal(db.compteEstPro(lea.id, t + 29 * jour), true);
  assert.equal(db.compteEstPro(lea.id, t + 31 * jour), false, 'en gratuit dès la fin de la période payée');

  // Un nouvel abonnement remplace l'ancien ; la fin tardive de l'ancien ne l'éteint pas.
  envoyer({ id: 'evt_3', eventType: 'subscription.active', created_at: t + 40 * jour, object: { id: 'sub_2', status: 'active', customer: 'cust_1', metadata: { compte: lea.id }, current_period_end_date: new Date(t + 405 * jour).toISOString() } });
  assert.equal(envoyer({ id: 'evt_4', eventType: 'subscription.expired', created_at: t + 41 * jour, object: { id: 'sub_1', status: 'expired', customer: 'cust_1' } }).message, 'ancien abonnement');
  assert.equal(db.compteEstPro(lea.id, t + 41 * jour), true);

  // Des métadonnées qui visent le compte principal ou un compte inconnu n'accordent rien.
  assert.equal(envoyer({ id: 'evt_5', eventType: 'subscription.active', created_at: t, object: { id: 'sub_x', status: 'active', customer: 'cust_x', metadata: { compte: P } } }).message, 'aucun compte');
  assert.equal(envoyer({ id: 'evt_6', eventType: 'refund.created', created_at: t, object: {} }).message, 'ignoré : refund.created');

  // Le Pro débloque la place pour les images ; la liste du back office le montre.
  const gros = new Uint8Array(30 * 1024 * 1024);
  const max = db.creerCompte('max@exemple.fr', 'max');
  assert.throws(() => db.ajouterMedia(max.id, gros, 'webp'), /Plus de place/);
  assert.ok(db.ajouterMedia(lea.id, gros, 'webp'));
  assert.equal(db.listerComptes().find(x => x.id === lea.id)?.pro, true);
  assert.equal(db.listerComptes().find(x => x.id === max.id)?.pro, false);
  assert.equal(db.exporter(lea.id).compte.abonnement?.creemAbonnement, 'sub_2');
});

test('offre Pro : la page de paiement et le portail passent par l’API Creem', async () => {
  const creem = await import('./creem.ts');
  const env = { CREEM_API_KEY: 'creem_test_x', CREEM_WEBHOOK_SECRET: 'whsec_test', CREEM_PRODUIT_MOIS: 'prod_mois', CREEM_PRODUIT_AN: 'prod_an', CREEM_TEST: '1' };
  const appels: { url: string; cle: string | null; corps: any }[] = [];
  const fetchFaux = (async (url: string, init: RequestInit) => {
    appels.push({ url, cle: new Headers(init.headers).get('x-api-key'), corps: JSON.parse(String(init.body)) });
    return Response.json(url.endsWith('/checkouts') ? { checkout_url: 'https://checkout.creem.io/ch_1' } : { customer_portal_link: 'https://creem.io/portal/x' });
  }) as typeof fetch;
  const noa = db.creerCompte('noa@exemple.fr', 'noa');
  assert.equal(await creem.ouvrirPaiement(env, fetchFaux, noa, 'an', O.admin, 5), 'https://checkout.creem.io/ch_1');
  assert.equal(appels[0].url, 'https://test-api.creem.io/v1/checkouts');
  assert.equal(appels[0].cle, 'creem_test_x');
  assert.deepEqual(appels[0].corps, { product_id: 'prod_an', request_id: `${noa.id}-5`, success_url: 'https://app.hopla.page/admin?paiement=ok', customer: { email: 'noa@exemple.fr' }, metadata: { compte: noa.id } });
  await assert.rejects(creem.ouvrirPortail(env, fetchFaux, noa), /Aucun abonnement/);
  await assert.rejects(creem.ouvrirPaiement({}, fetchFaux, noa, 'mois', 'https://x.fr'), /pas encore branché/);
  await assert.rejects(creem.ouvrirPaiement(env, fetchFaux, db.compteParId(P)!, 'mois', 'https://x.fr'), /principal/);
  db.appliquerAbonnement(noa.id, { client: 'cust_9', abonnement: 'sub_9', statut: 'active', finPeriode: null, maj: 1 });
  assert.equal(await creem.ouvrirPortail(env, fetchFaux, db.compteParId(noa.id)!), 'https://creem.io/portal/x');
  assert.deepEqual(appels.at(-1)!.corps, { customer_id: 'cust_9' });
});
