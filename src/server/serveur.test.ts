import test from 'node:test';
import assert from 'node:assert/strict';

process.env.LIENS_DB = ':memory:';
const db = await import('./db.ts');
const auth = await import('./auth.ts');
const { source, appareil, enregistrer } = await import('./analytique.ts');
const { validerBloc, validerReglages, adresse, pseudo, email } = await import('../lib/valider.ts');
const P = 'principal';
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
  const r = validerReglages({ theme: 'inconnu', bouton: { style: 'rien' }, reseaux: [{ reseau: 'youtube', url: '' }, { reseau: 'x', url: 'x.com/moi' }] }, REGLAGES_DEFAUT);
  assert.equal(r.theme, 'nuit-peche'); assert.equal(r.bouton.style, 'plein'); assert.deepEqual(r.reseaux, [{ reseau: 'x', url: 'https://x.com/moi' }]);
});

test('connexion par lien : envoi par Resend, usage unique, limite d’envoi', async () => {
  const envois: { url: string; corps: any }[] = [];
  const fetchFaux = (async (url: string, init: RequestInit) => { envois.push({ url, corps: JSON.parse(String(init.body)) }); return new Response('{}', { status: 200 }); }) as typeof fetch;
  const env = { RESEND_API_KEY: 'cle', NODE_ENV: 'production' };
  const r = await auth.demanderConnexion('https://liliansevoumian.fr', env, 'Bonjour@liliansevoumian.fr', fetchFaux, 1_000_000, '1.1.1.1');
  assert.equal(r.ok, true);
  assert.deepEqual(envois[0].corps.to, ['bonjour@liliansevoumian.fr']);
  const jeton = /jeton=([\w-]+)/.exec(envois[0].corps.text)![1];
  const encore = await auth.demanderConnexion('https://liliansevoumian.fr', env, 'bonjour@liliansevoumian.fr', fetchFaux, 1_030_000, '1.1.1.2');
  assert.equal(encore.ok, true, 'même réponse…');
  assert.equal(envois.length, 1, '… mais un seul lien par minute');
  const inconnu = await auth.demanderConnexion('https://liliansevoumian.fr', env, 'personne@exemple.fr', fetchFaux, 1_100_000, '1.1.1.3');
  assert.equal(inconnu.message, `Si personne@exemple.fr a un compte, le lien vient de partir. Il marche une fois, pendant 15 minutes.`, 'une adresse inconnue reçoit la même réponse');
  assert.equal(envois.length, 1, 'et rien ne part');
  const session = auth.ouvrirSession(jeton);
  assert.ok(session);
  assert.equal(auth.compteDeSession(session), P);
  assert.equal(auth.ouvrirSession(jeton), null, 'le lien ne sert qu’une fois');
  auth.fermerSession(session);
  assert.equal(auth.compteDeSession(session), null);
  assert.equal(auth.compteDeSession('n’importe quoi'), null);
  const sansCle = await auth.demanderConnexion('https://liliansevoumian.fr', { NODE_ENV: 'production' }, 'bonjour@liliansevoumian.fr', fetchFaux, 9_000_000, '1.1.1.4');
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
  await auth.demanderConnexion('https://liliansevoumian.fr', env, 'camille@exemple.fr', fetchFaux, Date.now(), '9.9.9.4');
  assert.deepEqual(envois[0].to, ['camille@exemple.fr']);
  const session = auth.ouvrirSession(/jeton=([\w-]+)/.exec(envois[0].text)![1])!;
  assert.equal(auth.compteDeSession(session), camille.id);
  assert.ok(db.compteParId(camille.id)!.connexion);

  // L'invitation part à la bonne adresse avec l'adresse de la page.
  const inv = await auth.inviter('https://liliansevoumian.fr', env, camille, fetchFaux);
  assert.equal(inv.ok, true);
  assert.match(envois[1].text, /liliansevoumian\.fr\/liens\/camille/);

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
  ancienne.prepare('INSERT INTO reglages VALUES (?, ?)').run('page', JSON.stringify({ ...REGLAGES_DEFAUT, profil: { ...REGLAGES_DEFAUT.profil, nom: 'Ancien nom' } }));
  ancienne.prepare('INSERT INTO blocs VALUES (?, ?, ?)').run('vieux', 0, JSON.stringify(validerBloc({ type: 'lien', titre: 'Vieux lien', url: 'a.fr' }, 'vieux')));
  ancienne.prepare('INSERT INTO jetons VALUES (?, ?, ?, ?)').run(auth.empreinte('session-d-avant-les-comptes-0000'), 'session', Date.now() + 86_400_000, Date.now());
  ancienne.close();
  process.env.LIENS_DB = fichier;
  db.fermer();
  try {
    assert.equal(db.lireReglages(P).profil.nom, 'Ancien nom');
    assert.deepEqual(db.lireBlocs(P).map(b => b.id), ['vieux']);
    assert.equal(auth.compteDeSession('session-d-avant-les-comptes-0000'), P, 'la session ouverte reste valable');
    db.fermer();
    assert.deepEqual(db.lireBlocs(P).map(b => b.id), ['vieux'], 'une seconde ouverture ne change rien');
  } finally { db.fermer(); process.env.LIENS_DB = ':memory:'; }
});
