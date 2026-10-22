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
const { BASCULE_OFFRES, OFFRES } = await import('../lib/abonnement.ts');

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

test('la vitrine : un prix pour un produit, des montants pour un soutien, une mention pour un lien partenaire', () => {
  const produit = validerBloc({ type: 'produit', titre: 'Carnet', url: 'etsy.com/listing/1', prix: ' 24 € ', partenariat: { mention: 'rien', code: ' CAMILLE10 ' } }, 'p');
  assert.equal(produit.prix, '24 €');
  assert.deepEqual(produit.partenariat, { mention: 'publicite', code: 'CAMILLE10' }, 'une mention inconnue redevient « Publicité »');
  assert.equal(produit.montants.length, 0);
  // Ce qui n'est pas de son type ne s'enregistre pas.
  assert.equal(validerBloc({ type: 'lien', url: 'a.fr', prix: '12 €' }, 'l').prix, '');
  assert.equal(validerBloc({ type: 'soutien', url: 'paypal.me/camille', partenariat: { mention: 'publicite' } }, 's').partenariat, null);
  assert.deepEqual(validerBloc({ type: 'soutien', url: 'paypal.me/camille', montants: [10, 3, 3, 0, 2.5, 5000, '5', 20, 50] }, 's').montants, [3, 5, 10, 20]);
  assert.deepEqual(validerBloc({ type: 'lien', url: 'a.fr', partenariat: { mention: 'collaboration', code: 'x'.repeat(60) } }, 'l').partenariat, { mention: 'collaboration', code: 'x'.repeat(40) });
  assert.equal(validerBloc({ type: 'lien', url: 'a.fr' }, 'l').partenariat, null, 'un lien ordinaire n’est pas partenaire');
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
  assert.equal(s.serie.length, 7); assert.equal(s.serie[6].vues, 3); assert.equal(s.serie[6].visiteurs, 2);
  assert.equal(s.precedent.vues, 1);
  assert.equal(s.dejaVue, true);
  assert.deepEqual(s.blocs.map(b => b.id), [id]);
  assert.equal(s.sources[0].nom, 'Direct');
  assert.equal(s.plage, false);
  // Des dates choisies dans le calendrier : leurs jours, comparés à la période d'avant de même longueur, qui finit la veille.
  const plage = db.stats(P, { du: '2026-10-06', au: '2026-10-10' }, maintenant);
  assert.equal(plage.plage, true);
  assert.equal(plage.jours, 5);
  assert.deepEqual(plage.serie.map(j => j.jour), ['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10']);
  assert.equal(plage.vues, 1); assert.equal(plage.serie[0].vues, 1); assert.equal(plage.clics, 0);
  assert.equal(plage.precedent.vues, 0);
  const apres = db.stats(P, { du: '2026-10-11', au: '2026-10-16' }, maintenant);
  assert.equal(apres.vues, 3);
  assert.equal(apres.precedent.vues, 1, 'la période d’avant va du 5 au 10 octobre');
  assert.equal(db.stats(P, { du: '2026-10-16', au: '2026-10-16' }, maintenant).serie.length, 1, 'un seul jour');
});

test('comptes : chaque page est isolée des autres', async () => {
  const camille = db.creerCompte('Camille@Exemple.fr', 'camille');
  assert.equal(camille.email, 'camille@exemple.fr');
  assert.throws(() => db.creerCompte('camille@exemple.fr', 'autre'), /déjà un compte/);
  assert.throws(() => db.creerCompte('autre@exemple.fr', 'camille'), /déjà pris/);
  assert.equal(db.lireBlocs(camille.id).length, 0, 'une page neuve est vide');
  assert.equal(db.lireReglages(camille.id).profil.nom, 'Camille');
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
  assert.equal(db.stats(camille.id, 7, t).dejaVue, false, 'une page que personne n’a vue n’a que son état vide');
  assert.equal(enregistrer({ page: 'camille', type: 'vue', bloc: null, utm: '', referent: '' }, { ip: '9.9.9.1', ua: iphone, session: null }, t), true);
  assert.equal(enregistrer({ page: 'camille', type: 'clic', bloc: 'c1', utm: '', referent: '' }, { ip: '9.9.9.1', ua: iphone, session: null }, t), true);
  assert.equal(enregistrer({ page: 'camille', type: 'clic', bloc: aLilian.id, utm: '', referent: '' }, { ip: '9.9.9.1', ua: iphone, session: null }, t), false);
  assert.equal(enregistrer({ page: 'camille', type: 'vue', bloc: null, utm: '', referent: '' }, { ip: '9.9.9.2', ua: iphone, session: camille.id }, t), false, 'Camille connectée ne se compte pas');
  assert.equal(enregistrer({ page: 'inconnu', type: 'vue', bloc: null, utm: '', referent: '' }, { ip: '9.9.9.3', ua: iphone, session: null }, t), false);
  assert.equal(db.stats(camille.id, 7, t).vues, 1);
  assert.equal(db.stats(camille.id, 7, t).clics, 1);
  assert.equal(db.stats(camille.id, 7, t + 30 * 86_400_000).vues, 0);
  assert.equal(db.stats(camille.id, 7, t + 30 * 86_400_000).dejaVue, true, 'une période calme n’efface pas la première visite');
  assert.equal(db.stats(P, 7, t).vues, 0);

  // Les images comptent dans le quota du compte.
  const media = db.ajouterMedia(camille.id, new Uint8Array(10), 'webp');
  assert.ok(db.lireMedia(media, 'webp'));
  assert.throws(() => db.ajouterMedia(camille.id, new Uint8Array(OFFRES.gratuit.quota), 'webp'), /Plus de place/);

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

test('conservation : une page où personne n’est jamais entré s’efface un mois après sa création', () => {
  const jour = 86_400_000, maintenant = Date.now(), ilYa = maintenant - 31 * jour;
  const oubliee = db.creerCompte('oubliee@exemple.fr', 'oubliee', ilYa);
  const ouverte = db.creerCompte('ouverte@exemple.fr', 'ouverte', ilYa);
  db.noterConnexion(ouverte.id, ilYa + jour);
  const remplie = db.creerCompte('remplie@exemple.fr', 'remplie', ilYa);
  db.enregistrerBloc(remplie.id, validerBloc({ type: 'lien', titre: 'Boutique', url: 'remplie.fr' }, 'r1'));
  const relancee = db.creerCompte('relancee@exemple.fr', 'relancee', ilYa);
  db.ajouterJeton('empreinte-relance', 'connexion', 7 * jour, relancee.id);
  const suspendue = db.creerCompte('suspendue@exemple.fr', 'suspendue', ilYa);
  db.changerStatut(suspendue.id, 'suspendu');
  db.creerCompte('recente@exemple.fr', 'recente', maintenant - 29 * jour);

  db.purger(maintenant);
  assert.equal(db.compteParId(oubliee.id), undefined);
  assert.equal(db.nomPris('oubliee'), false, 'le nom redevient libre');
  assert.equal(db.dejaInscrit('oubliee@exemple.fr'), null, 'l’adresse aussi');
  assert.throws(() => db.lireReglages(oubliee.id));
  for (const pseudo of ['ouverte', 'remplie', 'relancee', 'suspendue', 'recente']) assert.ok(db.compteParPseudo(pseudo), `${pseudo} reste`);
  assert.ok(db.compteParId(P));
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

test('offres : estPaye lit le statut, la fin de période et la grâce', async () => {
  const { estPaye, GRACE_JOURS } = await import('../lib/abonnement.ts');
  const t = Date.parse('2026-10-17T12:00:00Z'), jour = 86_400_000;
  assert.equal(estPaye({ statut: '', finPeriode: null }, t), false);
  assert.equal(estPaye({ statut: 'active', finPeriode: t + 10 * jour }, t), true);
  assert.equal(estPaye({ statut: 'active', finPeriode: t - (GRACE_JOURS - 1) * jour }, t), true, 'un renouvellement sans nouvelles garde quelques jours');
  assert.equal(estPaye({ statut: 'active', finPeriode: t - (GRACE_JOURS + 1) * jour }, t), false);
  assert.equal(estPaye({ statut: 'scheduled_cancel', finPeriode: t + jour }, t), true);
  assert.equal(estPaye({ statut: 'scheduled_cancel', finPeriode: t - 1 }, t), false, 'une résiliation s’arrête net à la fin de la période');
  assert.equal(estPaye({ statut: 'past_due', finPeriode: t + jour }, t), true);
  assert.equal(estPaye({ statut: 'canceled', finPeriode: t + jour }, t), true, 'résilié depuis le portail : Pro jusqu’à la fin payée');
  assert.equal(estPaye({ statut: 'canceled', finPeriode: t - 1 }, t), false);
  assert.equal(estPaye({ statut: 'canceled', finPeriode: null }, t), false, 'sans date de fin, une résiliation arrête le Pro');
  for (const statut of ['expired', 'unpaid', 'paused']) assert.equal(estPaye({ statut, finPeriode: t + jour }, t), false, statut);
});

test('offres : webhooks Creem signés, idempotents, dans le désordre', async () => {
  const { createHmac } = await import('node:crypto');
  const creem = await import('./creem.ts');
  const env = { CREEM_API_KEY: 'creem_test_x', CREEM_WEBHOOK_SECRET: 'whsec_test', CREEM_PRODUIT_MOIS: 'prod_mois', CREEM_PRODUIT_AN: 'prod_an' };
  const t = Date.parse('2026-10-17T12:00:00Z'), jour = 86_400_000;
  const signe = (corps: string, secret = env.CREEM_WEBHOOK_SECRET) => createHmac('sha256', secret).update(corps).digest('hex');
  const envoyer = (e: object, secret?: string) => { const corps = JSON.stringify(e); return creem.traiterWebhook(env, corps, signe(corps, secret), t); };
  const lea = db.creerCompte('lea@exemple.fr', 'lea');
  assert.equal(db.planDuCompte(lea.id, t), 'gratuit');
  assert.equal(db.planDuCompte(P, t), 'premium', 'le compte principal a tout, sans abonnement');

  // Sans configuration, mauvaise signature, JSON cassé : rien ne s'applique.
  assert.equal(creem.traiterWebhook({}, '{}', 'x', t).status, 503);
  const achat = { id: 'evt_1', eventType: 'checkout.completed', created_at: t, object: { id: 'ch_1', metadata: { compte: lea.id }, customer: { id: 'cust_1' }, subscription: { id: 'sub_1', status: 'active', current_period_end_date: new Date(t + 30 * jour).toISOString() } } };
  assert.equal(envoyer(achat, 'autre secret').status, 401);
  assert.equal(creem.traiterWebhook(env, '{', signe('{'), t).status, 400);
  assert.equal(creem.traiterWebhook(env, JSON.stringify(achat), null, t).status, 401);
  assert.equal(db.planDuCompte(lea.id, t), 'gratuit');

  // Le paiement : le compte voyage dans les métadonnées.
  assert.equal(envoyer(achat).status, 200);
  assert.equal(db.planDuCompte(lea.id, t), 'pro');
  const c = db.compteParId(lea.id)!;
  assert.equal(c.creem_client, 'cust_1');
  assert.equal(c.creem_abonnement, 'sub_1');
  assert.equal(db.abonnement(c, t).portail, true);
  assert.equal(envoyer(achat).message, 'déjà traité', 'un même événement ne s’applique qu’une fois');

  // La résiliation, retrouvée par l'abonnement seul ; un événement plus ancien arrivé après est ignoré.
  envoyer({ id: 'evt_2', eventType: 'subscription.scheduled_cancel', created_at: t + 2 * jour, object: { id: 'sub_1', status: 'scheduled_cancel', customer: 'cust_1', current_period_end_date: new Date(t + 30 * jour).toISOString() } });
  envoyer({ id: 'evt_0', eventType: 'subscription.active', created_at: t + jour, object: { id: 'sub_1', status: 'active', customer: 'cust_1' } });
  assert.equal(db.compteParId(lea.id)!.abonnement_statut, 'scheduled_cancel');
  assert.equal(db.planDuCompte(lea.id, t + 29 * jour), 'pro');
  assert.equal(db.planDuCompte(lea.id, t + 31 * jour), 'gratuit', 'en gratuit dès la fin de la période payée');

  // Résilié depuis le portail Creem : `subscription.canceled`, statut `canceled`, le Pro tient jusqu'à la fin payée.
  envoyer({ id: 'evt_2b', eventType: 'subscription.canceled', created_at: t + 3 * jour, object: { id: 'sub_1', status: 'canceled', customer: 'cust_1', current_period_end_date: new Date(t + 30 * jour).toISOString() } });
  assert.equal(db.compteParId(lea.id)!.abonnement_statut, 'canceled');
  assert.equal(db.planDuCompte(lea.id, t + 3 * jour), 'pro');
  assert.equal(db.abonnement(db.compteParId(lea.id)!, t + 3 * jour).plan, 'pro');
  assert.equal(db.planDuCompte(lea.id, t + 31 * jour), 'gratuit');

  // Un nouvel abonnement remplace l'ancien ; la fin tardive de l'ancien ne l'éteint pas.
  envoyer({ id: 'evt_3', eventType: 'subscription.active', created_at: t + 40 * jour, object: { id: 'sub_2', status: 'active', customer: 'cust_1', metadata: { compte: lea.id }, current_period_end_date: new Date(t + 405 * jour).toISOString() } });
  assert.equal(envoyer({ id: 'evt_4', eventType: 'subscription.expired', created_at: t + 41 * jour, object: { id: 'sub_1', status: 'expired', customer: 'cust_1' } }).message, 'ancien abonnement');
  assert.equal(db.planDuCompte(lea.id, t + 41 * jour), 'pro');

  // Un autre produit de la boutique, payé par le même client, ne touche pas à son Pro.
  const autre = { id: 'sub_f', status: 'active', customer: 'cust_1', product: { id: 'prod_formation' } };
  assert.equal(envoyer({ id: 'evt_f1', eventType: 'subscription.active', created_at: t + 42 * jour, object: autre }).message, 'ignoré : autre produit (prod_formation)');
  assert.equal(envoyer({ id: 'evt_f2', eventType: 'checkout.completed', created_at: t + 42 * jour, object: { product: 'prod_formation', customer: 'cust_1', subscription: { ...autre, product: undefined } } }).message, 'ignoré : autre produit (prod_formation)');
  assert.equal(db.compteParId(lea.id)!.creem_abonnement, 'sub_2');
  assert.equal(envoyer({ id: 'evt_f3', eventType: 'subscription.paid', created_at: t + 42 * jour, object: { id: 'sub_2', status: 'active', customer: 'cust_1', product: 'prod_an' } }).status, 200, 'les produits Hopla passent');

  // Des métadonnées qui visent le compte principal ou un compte inconnu n'accordent rien.
  assert.equal(envoyer({ id: 'evt_5', eventType: 'subscription.active', created_at: t, object: { id: 'sub_x', status: 'active', customer: 'cust_x', metadata: { compte: P } } }).message, 'aucun compte');
  assert.equal(envoyer({ id: 'evt_6', eventType: 'refund.created', created_at: t, object: {} }).message, 'ignoré : refund.created');

  // Le Pro débloque la place pour les images ; la liste du back office le montre.
  const gros = new Uint8Array(30 * 1024 * 1024);
  const max = db.creerCompte('max@exemple.fr', 'max');
  assert.throws(() => db.ajouterMedia(max.id, gros, 'webp'), /Plus de place/);
  assert.ok(db.ajouterMedia(lea.id, gros, 'webp'));
  assert.equal(db.listerComptes().find(x => x.id === lea.id)?.plan, 'pro');
  assert.equal(db.listerComptes().find(x => x.id === max.id)?.plan, 'gratuit');
  assert.equal(db.exporter(lea.id).compte.abonnement?.creemAbonnement, 'sub_2');

  // Un changement d'offre arrive par webhook : le produit du catalogue dit l'offre et la période.
  const { droits } = await import('./droits.ts');
  db.ecrireCatalogue([{ id: 'prod_starter_an', plan: 'starter', periode: 'an', prix: 3600, actuel: true }]);
  assert.equal(envoyer({ id: 'evt_7', eventType: 'subscription.update', created_at: t + 43 * jour, object: { id: 'sub_2', status: 'active', customer: 'cust_1', product: { id: 'prod_starter_an' }, current_period_end_date: new Date(t + 408 * jour).toISOString() } }).status, 200);
  const passe = db.abonnement(db.compteParId(lea.id)!, t + 43 * jour);
  assert.equal(passe.plan, 'starter');
  assert.equal(passe.periode, 'an');
  assert.equal(db.listerComptes(t + 43 * jour).find(x => x.id === lea.id)?.plan, 'starter');

  // Ce que l'offre permet : Starter ouvre la page sans mention, les couleurs, les dates, les avis et les stats ; pas l'heure ni les drops.
  const { joursLisibles } = await import('./droits.ts');
  const neuve = { ...db.compteParId(lea.id)!, cree: BASCULE_OFFRES + 1 };
  const d = droits(neuve, env, t + 43 * jour);
  for (const f of ['sansMention', 'couleurs', 'programmation', 'avis', 'stats'] as const) assert.equal(d[f], true, f);
  for (const f of ['heure', 'drops', 'listeEmail'] as const) assert.equal(d[f], false, f);
  assert.equal(joursLisibles(neuve, env, t + 43 * jour), 30);
  // Gratuit : des liens sans limite, la page selon le réseau et les thèmes ; rien de réservé, pas de stats à lire.
  const gratuite = { ...db.compteParId(max.id)!, cree: BASCULE_OFFRES + 1 };
  assert.ok(Object.values(droits(gratuite, env, t)).every(v => !v));
  assert.equal(joursLisibles(gratuite, env, t), 0);
  // Une page d'avant les offres garde tout, sauf la page sans mention, et ses sept jours de stats.
  const ancienne = { ...db.compteParId(max.id)!, cree: BASCULE_OFFRES - 1 };
  for (const f of ['couleurs', 'programmation', 'avis', 'stats', 'heure', 'drops', 'listeEmail'] as const) assert.equal(droits(ancienne, env, t)[f], true, f);
  assert.equal(droits(ancienne, env, t).sansMention, false);
  assert.equal(joursLisibles(ancienne, env, t), 7);
  // Sans paiement branché (en local), rien n'est réservé, sauf la page sans mention.
  const libre = droits(gratuite, {}, t);
  assert.equal(libre.drops, true);
  assert.equal(libre.sansMention, false);
  assert.equal(joursLisibles(gratuite, {}, t), 365);
  // Le compte principal a tout.
  assert.ok(Object.values(droits(db.compteParId(P)!, env, t)).every(Boolean));
  assert.equal(joursLisibles(db.compteParId(P)!, env, t), 365);
  // La période demandée, ramenée à ce que l'offre laisse lire : 90 jours en Starter en font 30, des dates trop anciennes se resserrent.
  const { periodeLisible } = await import('./droits.ts');
  const { ajouterJours, jourDe } = await import('../lib/periode.ts');
  const ici = t + 43 * jour, auj = jourDe(ici);
  assert.equal(periodeLisible(neuve, 90, env, ici), 30);
  assert.equal(periodeLisible(neuve, 14, env, ici), 14);
  assert.deepEqual(periodeLisible(neuve, { du: ajouterJours(auj, -60), au: ajouterJours(auj, -10) }, env, ici), { du: ajouterJours(auj, -29), au: ajouterJours(auj, -10) });
  assert.deepEqual(periodeLisible(neuve, { du: ajouterJours(auj, -3), au: ajouterJours(auj, 5) }, env, ici), { du: ajouterJours(auj, -3), au: auj }, 'pas de jours à venir');
  assert.equal(periodeLisible(neuve, { du: ajouterJours(auj, -90), au: ajouterJours(auj, -40) }, env, ici), null, 'des dates toutes plus anciennes que l’historique');
  assert.equal(periodeLisible(gratuite, 7, env, t), null);
  assert.equal(periodeLisible(ancienne, 30, env, t), 7);
  assert.deepEqual(periodeLisible(gratuite, { du: '2025-11-01', au: '2025-11-30' }, {}, t), { du: '2025-11-01', au: '2025-11-30' }, 'sans paiement branché, un an se lit');
});

test('programmer un bloc demande Starter : refusé en Gratuit, permis en Starter, gardé par une page d’avant les offres', async () => {
  const { verifierDates } = await import('./droits.ts');
  const { REFUS_PROGRAMMATION } = await import('../lib/droits.ts');
  const env = { CREEM_API_KEY: 'creem_test_x', CREEM_WEBHOOK_SECRET: 'whsec_test', CREEM_PRODUIT_MOIS: 'prod_mois', CREEM_PRODUIT_AN: 'prod_an' };
  const t = BASCULE_OFFRES + 86_400_000, jour = 86_400_000;
  const refus = { message: REFUS_PROGRAMMATION };
  // Comme le serveur, qui valide un bloc avant de le vérifier : les dates y sont déjà au format ISO.
  const bloc = (o: object, id = 'l1') => validerBloc({ type: 'lien', titre: 'Lancement', url: 'exemple.fr', ...o }, id);
  const lien = bloc({});
  const lancement = { debut: '2099-01-01T10:00:00Z', compteARebours: true };
  const date = bloc(lancement);

  // Gratuit : un bloc sans dates s'enregistre ; un début, une fin ou un compte à rebours, non.
  const noa = db.creerCompte('noa@exemple.fr', 'noa', t);
  assert.doesNotThrow(() => verifierDates(noa, lien, env, t));
  db.enregistrerBloc(noa.id, lien);
  assert.throws(() => verifierDates(noa, date, env, t), refus);
  assert.throws(() => verifierDates(noa, bloc({ fin: '2099-01-01T10:00:00Z' }), env, t), refus);
  assert.throws(() => verifierDates(noa, bloc(lancement, 'l2'), env, t), refus, 'un bloc neuf non plus');
  // Des dates posées avant (une offre quittée) se gardent et se retirent, mais ne se changent pas.
  db.enregistrerBloc(noa.id, date);
  assert.doesNotThrow(() => verifierDates(noa, bloc({ ...lancement, titre: 'Lancement !' }), env, t));
  assert.doesNotThrow(() => verifierDates(noa, bloc({ ...lancement, compteARebours: false }), env, t));
  assert.doesNotThrow(() => verifierDates(noa, lien, env, t));
  assert.throws(() => verifierDates(noa, bloc({ ...lancement, debut: '2099-02-01T10:00:00Z' }), env, t), refus);

  // Starter : tout est permis.
  db.ecrireCatalogue([{ id: 'prod_starter_an', plan: 'starter', periode: 'an', prix: 3600, actuel: true }]);
  const sam = db.creerCompte('sam@exemple.fr', 'sam', t);
  db.appliquerAbonnement(sam.id, { client: 'cust_s', abonnement: 'sub_s', statut: 'active', finPeriode: t + 365 * jour, maj: t, produit: 'prod_starter_an' });
  assert.doesNotThrow(() => verifierDates(db.compteParId(sam.id)!, bloc({ ...lancement, fin: '2099-02-01T10:00:00Z' }), env, t));

  // Une page d'avant les offres programme sans abonnement ; sans paiement branché, rien n'est réservé.
  const zoe = db.creerCompte('zoe@exemple.fr', 'zoe', BASCULE_OFFRES - jour);
  assert.doesNotThrow(() => verifierDates(zoe, date, env, t));
  assert.doesNotThrow(() => verifierDates(noa, bloc(lancement, 'l3'), {}, t));
});

test('offres : la page de paiement, le changement d’offre et le portail passent par l’API Creem', async () => {
  const creem = await import('./creem.ts');
  const env = { CREEM_API_KEY: 'creem_test_x', CREEM_WEBHOOK_SECRET: 'whsec_test', CREEM_PRODUIT_MOIS: 'prod_mois', CREEM_PRODUIT_AN: 'prod_an', CREEM_TEST: '1' };
  const appels: { url: string; cle: string | null; corps: any }[] = [];
  const fetchFaux = (async (url: string, init: RequestInit) => {
    appels.push({ url, cle: new Headers(init.headers).get('x-api-key'), corps: JSON.parse(String(init.body)) });
    return Response.json(url.endsWith('/checkouts') ? { checkout_url: 'https://checkout.creem.io/ch_1' } : url.endsWith('/upgrade') ? { id: 'sub_9' } : { customer_portal_link: 'https://creem.io/portal/x' });
  }) as typeof fetch;
  const noa = db.creerCompte('noa@exemple.fr', 'noa');
  assert.equal(await creem.ouvrirPaiement(env, fetchFaux, noa, 'pro', 'an', O.admin, 5), 'https://checkout.creem.io/ch_1');
  assert.equal(appels[0].url, 'https://test-api.creem.io/v1/checkouts');
  assert.equal(appels[0].cle, 'creem_test_x');
  assert.deepEqual(appels[0].corps, { product_id: 'prod_an', request_id: `${noa.id}-5`, success_url: 'https://app.hopla.page/admin?paiement=pro', customer: { email: 'noa@exemple.fr' }, metadata: { compte: noa.id } });
  await assert.rejects(creem.ouvrirPortail(env, fetchFaux, noa), /Aucun abonnement/);
  await assert.rejects(creem.ouvrirPaiement({}, fetchFaux, noa, 'pro', 'mois', 'https://x.fr'), /pas encore branché/);
  await assert.rejects(creem.ouvrirPaiement(env, fetchFaux, db.compteParId(P)!, 'pro', 'mois', 'https://x.fr'), /principal/);
  // Une offre sans produit dans Creem, ou pas encore en vente, ne s'achète pas.
  await assert.rejects(creem.ouvrirPaiement(env, fetchFaux, noa, 'starter', 'mois', 'https://x.fr'), /arrive bientôt/);
  await assert.rejects(creem.ouvrirPaiement(env, fetchFaux, noa, 'premium', 'an', 'https://x.fr'), /arrive bientôt/);
  assert.deepEqual(creem.offresEnVente(env), ['pro']);
  db.appliquerAbonnement(noa.id, { client: 'cust_9', abonnement: 'sub_9', statut: 'active', finPeriode: null, maj: 1 });
  assert.equal(await creem.ouvrirPortail(env, fetchFaux, db.compteParId(noa.id)!), 'https://creem.io/portal/x');
  assert.deepEqual(appels.at(-1)!.corps, { customer_id: 'cust_9' });
  // Un abonné change d'offre sans repasser par la caisse : Creem facture la différence au prorata.
  assert.equal(await creem.ouvrirPaiement(env, fetchFaux, db.compteParId(noa.id)!, 'pro', 'mois', O.admin), 'https://app.hopla.page/admin?paiement=pro');
  assert.equal(appels.at(-1)!.url, 'https://test-api.creem.io/v1/subscriptions/sub_9/upgrade');
  assert.deepEqual(appels.at(-1)!.corps, { product_id: 'prod_mois', update_behavior: 'proration-charge-immediately' });
  db.appliquerAbonnement(noa.id, { client: 'cust_9', abonnement: 'sub_9', statut: 'active', finPeriode: null, maj: 2, produit: 'prod_mois' });
  await assert.rejects(creem.ouvrirPaiement(env, fetchFaux, db.compteParId(noa.id)!, 'pro', 'mois', O.admin), /déjà ton offre/);
  // Résilié, l'abonnement ne change plus d'offre : rien ne part chez Creem, on en reprend une à la fin de la période.
  const avant = appels.length;
  db.appliquerAbonnement(noa.id, { client: 'cust_9', abonnement: 'sub_9', statut: 'scheduled_cancel', finPeriode: Date.now() + 86_400_000, maj: 3, produit: 'prod_mois' });
  await assert.rejects(creem.ouvrirPaiement(env, fetchFaux, db.compteParId(noa.id)!, 'pro', 'an', O.admin), /résiliée/);
  assert.equal(appels.length, avant);
});

/** Une boutique Creem pour les tests : ses produits se relisent, se listent et se créent comme par l'API. */
function boutiqueCreem(produits: Record<string, { price: number; billing_period: string; name?: string; status?: string; billing_type?: string }>) {
  const appels: { chemin: string; methode: string; cle: string | null; corps: any }[] = [];
  let n = 0;
  const decrire = (id: string) => ({ id, name: '', currency: 'EUR', billing_type: 'recurring', status: 'active', ...produits[id] });
  const fetchFaux = (async (url: string, init: RequestInit) => {
    const chemin = new URL(url).pathname, methode = String(init.method);
    const corps = init.body ? JSON.parse(String(init.body)) : null;
    appels.push({ chemin, methode, cle: new Headers(init.headers).get('Idempotency-Key'), corps });
    if (methode === 'POST' && chemin === '/v1/products') {
      const id = `prod_neuf_${++n}`;
      produits[id] = { price: corps.price, billing_period: corps.billing_period, name: corps.name };
      return Response.json(decrire(id));
    }
    if (chemin === '/v1/products/search') return Response.json({ items: Object.keys(produits).map(decrire), pagination: { current_page: 1, next_page: null } });
    const id = chemin.replace('/v1/products/', '');
    return produits[id] ? Response.json(decrire(id)) : new Response('not found', { status: 404 });
  }) as typeof fetch;
  return { appels, fetchFaux, produits, crees: () => appels.filter(a => a.methode === 'POST') };
}

test('offres : « Créer les offres dans Creem » crée ce qui manque, une fois, et reprend l’ancien Pro au bon prix', async () => {
  const creem = await import('./creem.ts');
  const env = { CREEM_API_KEY: 'creem_test_x', CREEM_WEBHOOK_SECRET: 'whsec_test', CREEM_PRODUIT_MOIS: 'prod_mois', CREEM_PRODUIT_AN: 'prod_an', CREEM_TEST: '1' };
  // L'ancien Pro mensuel a été remis à 19 € dans Creem ; l'ancien annuel est resté à 86,40 €.
  const { appels, fetchFaux, crees } = boutiqueCreem({
    prod_mois: { price: 1900, billing_period: 'every-month', name: 'Hopla Pro mensuel' },
    prod_an: { price: 8640, billing_period: 'every-year', name: 'Hopla Pro annuel' },
  });
  const etat = await creem.creerOffres(env, fetchFaux);
  assert.deepEqual(crees().map(a => a.corps.name), ['Hopla Starter mensuel', 'Hopla Starter annuel', 'Hopla Pro annuel'], 'Premium n’est pas en vente : aucun produit');
  assert.deepEqual(crees().map(a => a.corps.price), [900, 7900, 16900]);
  assert.deepEqual(crees().map(a => a.cle), ['hopla-starter-mois-900', 'hopla-starter-an-7900', 'hopla-pro-an-16900']);
  assert.equal(crees()[0].corps.billing_period, 'every-month');
  assert.equal(crees()[0].corps.tax_mode, 'inclusive');
  assert.equal(etat.find(e => e.plan === 'pro' && e.periode === 'mois')?.produit, 'prod_mois', 'l’ancien Pro au bon prix est repris');
  assert.equal(etat.find(e => e.plan === 'pro' && e.periode === 'an')?.produit, 'prod_neuf_3');
  assert.equal(etat.find(e => e.plan === 'premium' && e.periode === 'an')?.produit, null);
  assert.deepEqual(creem.offresEnVente(env), ['starter', 'pro']);
  // L'ancien annuel reste connu : ses abonnés gardent le Pro, ses webhooks passent.
  assert.equal(db.produitConnu('prod_an')?.plan, 'pro');
  assert.equal(db.produitConnu('prod_an')?.actuel, false);
  // Rejouer relit Creem, mais ne crée rien.
  const avant = appels.length;
  await creem.creerOffres(env, fetchFaux);
  assert.ok(appels.length > avant);
  assert.equal(crees().length, 3);
  // Une clé sans le droit « Products » : le message dit quoi faire.
  db.ecrireCatalogue([]);
  const refuse = (async () => new Response('forbidden', { status: 403 })) as unknown as typeof fetch;
  await assert.rejects(creem.creerOffres({ CREEM_API_KEY: 'k', CREEM_WEBHOOK_SECRET: 's' }, refuse), /droit de créer des produits/);
  db.ecrireCatalogue([{ id: 'prod_x', plan: 'starter', periode: 'mois', prix: 900, actuel: true }]);
  await assert.rejects(creem.relireCatalogue({ CREEM_API_KEY: 'k', CREEM_WEBHOOK_SECRET: 's' }, refuse), /droit de lire des produits/);
});

test('offres : un prix changé dans Creem est repris, sans rien créer en double', async () => {
  const creem = await import('./creem.ts');
  const env = { CREEM_API_KEY: 'creem_test_x', CREEM_WEBHOOK_SECRET: 'whsec_test', CREEM_PRODUIT_MOIS: 'prod_mois', CREEM_PRODUIT_AN: 'prod_an', CREEM_TEST: '1' };
  // Le catalogue d'avant (Starter 4 € et 36 €, Pro 9 € et 79 €), et Creem tel que Lilian l'a ajusté le 21 octobre 2026.
  db.ecrireCatalogue([
    { id: 'prod_s_mois', plan: 'starter', periode: 'mois', prix: 400, actuel: true },
    { id: 'prod_s_an', plan: 'starter', periode: 'an', prix: 3600, actuel: true },
    { id: 'prod_mois', plan: 'pro', periode: 'mois', prix: 900, actuel: true },
    { id: 'prod_an', plan: 'pro', periode: 'an', prix: 8640, actuel: false },
    { id: 'prod_p_an', plan: 'pro', periode: 'an', prix: 7900, actuel: true },
  ]);
  const { fetchFaux, produits, crees } = boutiqueCreem({
    prod_s_mois: { price: 900, billing_period: 'every-month' },
    prod_s_an: { price: 7900, billing_period: 'every-year' },
    prod_mois: { price: 1900, billing_period: 'every-month' },
    prod_an: { price: 8640, billing_period: 'every-year' },
    prod_p_an: { price: 16900, billing_period: 'every-year' },
  });
  // Tant que Hopla n'a pas relu Creem, rien n'est vendu à un prix qu'il n'affiche pas.
  assert.deepEqual(creem.offresEnVente(env), []);
  assert.equal(creem.etatOffres(env).find(e => e.plan === 'starter' && e.periode === 'mois')?.prixCreem, 4);
  const etat = await creem.relireCatalogue(env, fetchFaux);
  assert.equal(crees().length, 0, 'rien n’est créé ni changé chez Creem');
  assert.deepEqual(creem.offresEnVente(env), ['starter', 'pro']);
  assert.deepEqual(etat.filter(e => e.enVente).map(e => [e.plan, e.periode, e.produit, e.prixCreem]), [
    ['starter', 'mois', 'prod_s_mois', null], ['starter', 'an', 'prod_s_an', null], ['pro', 'mois', 'prod_mois', null], ['pro', 'an', 'prod_p_an', null],
  ]);
  assert.equal(db.produitConnu('prod_s_mois')?.prix, 900);
  // « Créer les offres dans Creem » n'a alors plus rien à créer.
  await creem.creerOffres(env, fetchFaux);
  assert.equal(crees().length, 0);

  // Un prix que le code n'affiche pas : l'offre ne se vend plus, et l'onglet Comptes dit le prix de Creem.
  produits.prod_p_an.price = 17900;
  await creem.relireCatalogue(env, fetchFaux);
  assert.deepEqual(creem.offresEnVente(env), ['starter']);
  assert.equal(creem.etatOffres(env).find(e => e.plan === 'pro' && e.periode === 'an')?.prixCreem, 179);
  produits.prod_p_an.price = 16900;

  // Un produit archivé dans Creem ne se vend plus ; le créer à nouveau ne refait que lui.
  produits.prod_s_an.status = 'archived';
  await creem.relireCatalogue(env, fetchFaux);
  assert.deepEqual(creem.offresEnVente(env), ['pro']);
  assert.equal(db.produitConnu('prod_s_an')?.plan, 'starter', 'ses abonnés gardent Starter');
  await creem.creerOffres(env, fetchFaux);
  assert.deepEqual(crees().map(a => a.corps.name), ['Hopla Starter annuel']);
  assert.deepEqual(creem.offresEnVente(env), ['starter', 'pro']);

  // Creem injoignable : le catalogue reste tel qu'il était, l'erreur remonte.
  const avant = db.lireCatalogue();
  const panne = (async () => new Response('erreur', { status: 500 })) as unknown as typeof fetch;
  await assert.rejects(creem.relireCatalogue(env, panne), /ne répond pas/);
  assert.deepEqual(db.lireCatalogue(), avant);
  await assert.rejects(creem.relireCatalogue({}, fetchFaux), /pas encore branché/);
});

test('offres : un produit fait à la main dans Creem, au nom et au prix de l’offre, est repris', async () => {
  const creem = await import('./creem.ts');
  const env = { CREEM_API_KEY: 'creem_test_x', CREEM_WEBHOOK_SECRET: 'whsec_test', CREEM_TEST: '1' };
  db.ecrireCatalogue([{ id: 'prod_s_mois', plan: 'starter', periode: 'mois', prix: 400, actuel: true }]);
  const { fetchFaux, crees } = boutiqueCreem({
    prod_s_mois: { price: 400, billing_period: 'every-month', name: 'Hopla Starter mensuel' },
    // La boutique vend aussi des formations, et parfois à un prix qui tombe juste : seuls les produits nommés Hopla comptent.
    prod_n8n: { price: 900, billing_period: 'every-month', name: 'Formation n8n' },
    prod_main: { price: 900, billing_period: 'every-month', name: 'Hopla Starter (mensuel)' },
    prod_main_an: { price: 7900, billing_period: 'every-year', name: 'HOPLA starter annuel' },
    prod_pro_vieux: { price: 1900, billing_period: 'every-month', name: 'Hopla Pro mensuel', status: 'archived' },
    prod_premium: { price: 1900, billing_period: 'every-month', name: 'Hopla Premium mensuel' },
  });
  await creem.relireCatalogue(env, fetchFaux);
  assert.equal(crees().length, 0);
  assert.equal(creem.etatOffres(env).find(e => e.plan === 'starter' && e.periode === 'mois')?.produit, 'prod_main');
  assert.equal(creem.etatOffres(env).find(e => e.plan === 'starter' && e.periode === 'an')?.produit, 'prod_main_an');
  assert.equal(db.produitConnu('prod_s_mois')?.actuel, false, 'l’ancien produit reste connu, sans plus se vendre');
  // Ni un produit archivé ni celui d'une autre offre ne passent pour Pro.
  assert.equal(creem.etatOffres(env).find(e => e.plan === 'pro' && e.periode === 'mois')?.produit, null);
  assert.equal(db.produitConnu('prod_n8n'), undefined);
  assert.deepEqual(creem.offresEnVente(env), ['starter']);
});

test('statistiques : un navigateur intégré sans référent est rangé sous son app', () => {
  const tiktok = 'Mozilla/5.0 (iPhone) Mobile/15E148 musical_ly_36.0 BytedanceWebview/d8a21c6';
  assert.equal(source('', '', tiktok), 'TikTok');
  assert.equal(source('', 'https://www.linkedin.com/', tiktok), 'LinkedIn', 'le site d’origine passe avant');
  assert.equal(source('', '', 'Mozilla/5.0 (Macintosh) Safari/605'), 'Direct');
});

test('statistiques : les clics ouverts dans leur app, depuis un navigateur intégré', () => {
  const insta = 'Mozilla/5.0 (Linux; Android 14) Chrome/129.0 Mobile Safari/537.36 Instagram 350.0.0.0 Android';
  db.enregistrerBloc(P, validerBloc({ type: 'lien', titre: 'YouTube', url: 'https://youtube.com/@moi' }, 'yt'));
  db.enregistrerBloc(P, validerBloc({ type: 'lien', titre: 'Site', url: 'https://exemple.fr' }, 'site'));
  const ctx = (ip: string, ua: string) => ({ ip, ua, session: null });
  enregistrer({ type: 'clic', bloc: 'yt', utm: '', referent: '', app: true }, ctx('9.9.9.1', insta));
  enregistrer({ type: 'clic', bloc: 'site', utm: '', referent: '', app: false }, ctx('9.9.9.2', insta));
  enregistrer({ type: 'clic', bloc: 'yt', utm: '', referent: '', app: true }, ctx('9.9.9.3', 'Mozilla/5.0 (Macintosh) Safari/605'));
  assert.deepEqual(db.stats(P, 7).apps, { integres: 2, versApp: 1, ouverts: 1 }, 'un navigateur ordinaire ne compte pas, même s’il le prétend');
});

test('Rejoins ma liste : inscrit gardé, envoyé chez Brevo, export CSV sans formule', async () => {
  const liste = await import('./liste.ts');
  const env = { LIENS_CLE_INTEGRATIONS: 'test' };
  const chiffre = liste.chiffrer(env, 'xkeysib-secret');
  assert.notEqual(chiffre, 'xkeysib-secret');
  assert.equal(liste.dechiffrer(env, chiffre), 'xkeysib-secret');
  assert.equal(liste.dechiffrer({ LIENS_CLE_INTEGRATIONS: 'autre' }, chiffre), '', 'une autre clé ne lit rien');
  db.enregistrerBloc(P, validerBloc({ type: 'inscription', titre: 'Rejoins ma liste', demanderPrenom: true }, 'liste'));
  const appels: { url: string; corps: any; headers: any }[] = [];
  const fetchFaux = (async (url: string, init: RequestInit) => { appels.push({ url, corps: init.body ? JSON.parse(String(init.body)) : null, headers: init.headers }); return new Response('{"name":"Ma liste"}', { status: url.includes('/lists/') ? 200 : 201 }); }) as typeof fetch;
  assert.equal((await liste.verifier('brevo', 'xkeysib-secret', '7', fetchFaux)).nom, 'Ma liste');
  assert.equal((await liste.verifier('brevo', 'xkeysib-secret', '../7', fetchFaux)).ok, false, 'un identifiant de liste farfelu ne part pas');
  assert.equal((await liste.verifier('mailchimp', 'cle-sans-centre', 'abc123', fetchFaux)).ok, false);
  db.ecrireIntegration(P, { fournisseur: 'brevo', cle: liste.chiffrer(env, 'xkeysib-secret'), liste: '7', nom: 'Ma liste' });
  const ctx = { ip: '5.5.5.5', ua: 'Mozilla/5.0', referent: '' };
  const r = await liste.inscrire(env, fetchFaux, { page: '', bloc: 'liste', email: 'Camille@Exemple.fr', prenom: '=HYPERLINK("x")' }, ctx);
  assert.equal(r.status, 200);
  const envoi = appels.at(-1)!;
  assert.equal(envoi.url, 'https://api.brevo.com/v3/contacts');
  assert.deepEqual(envoi.corps.listIds, [7]);
  assert.equal(envoi.corps.email, 'camille@exemple.fr');
  assert.equal(db.resumeContacts(P).total, 1);
  assert.equal(db.resumeContacts(P).enAttente, 0, 'envoyé chez Brevo');
  await liste.inscrire(env, fetchFaux, { page: '', bloc: 'liste', email: 'camille@exemple.fr' }, ctx);
  assert.equal(db.resumeContacts(P).total, 1, 'pas de doublon');
  assert.equal((await liste.inscrire(env, fetchFaux, { page: '', bloc: 'liste', email: 'robot@exemple.fr', website: 'spam' }, ctx)).status, 200);
  assert.equal(db.resumeContacts(P).total, 1, 'le champ piège écarte le robot');
  assert.equal((await liste.inscrire(env, fetchFaux, { page: '', bloc: 'inconnu', email: 'a@exemple.fr' }, ctx)).status, 404);
  assert.match(liste.csv(P), /camille@exemple\.fr;"'=HYPERLINK\(""x""\)"/, 'une formule devient du texte');
  assert.equal(db.exporter(P).inscrits.length, 1);
});

test('le résumé de la semaine part le lundi matin, une fois, seulement après des visites', async () => {
  const { envoyerResumes, heureDuResume } = await import('./resume.ts');
  const lundi10h = Date.parse('2026-10-19T08:00:00Z');
  assert.equal(heureDuResume(lundi10h), true);
  assert.equal(heureDuResume(Date.parse('2026-10-19T06:00:00Z')), false, '8 h, trop tôt');
  assert.equal(heureDuResume(Date.parse('2026-10-20T08:00:00Z')), false, 'mardi');
  const envois: any[] = [];
  const fetchFaux = (async (_: string, init: RequestInit) => { envois.push(JSON.parse(String(init.body))); return new Response('{}'); }) as typeof fetch;
  const env = { RESEND_API_KEY: 'cle', LIENS_ADMIN_EMAIL: 'moi@exemple.fr' };
  assert.equal(await envoyerResumes(env, fetchFaux, lundi10h), 0, 'pas de visite, pas d’e-mail');
  db.fermer();
  db.ajouterEvenement({ compte: P, type: 'vue', bloc: null, visiteur: 'v', source: 'TikTok', appareil: 'Mobile', ts: lundi10h - 86_400_000 });
  assert.equal(await envoyerResumes(env, fetchFaux, lundi10h), 1);
  assert.deepEqual(envois[0].to, ['moi@exemple.fr']);
  assert.match(envois[0].subject, /^Ta semaine sur Hopla/);
  assert.equal(await envoyerResumes(env, fetchFaux, lundi10h + 3_600_000), 0, 'une fois par semaine');
});

test('le résumé du lundi ne part qu’aux pages qui lisent leurs stats', async () => {
  const { envoyerResumes } = await import('./resume.ts');
  const lundi10h = Date.parse('2026-10-26T09:00:00Z'), jour = 86_400_000;
  const envois: { to: string[] }[] = [];
  const fetchFaux = (async (_: string, init: RequestInit) => { envois.push(JSON.parse(String(init.body))); return new Response('{}'); }) as typeof fetch;
  const env = { RESEND_API_KEY: 'cle', LIENS_ADMIN_EMAIL: 'moi@exemple.fr', CREEM_API_KEY: 'creem_test_x', CREEM_WEBHOOK_SECRET: 'whsec_test', CREEM_PRODUIT_MOIS: 'prod_mois', CREEM_PRODUIT_AN: 'prod_an' };
  db.ecrireCatalogue([{ id: 'prod_starter_an', plan: 'starter', periode: 'an', prix: 3600, actuel: true }]);
  const gratuite = db.creerCompte('noa@exemple.fr', 'noa', BASCULE_OFFRES + jour);
  const starter = db.creerCompte('sam@exemple.fr', 'sam', BASCULE_OFFRES + jour);
  db.appliquerAbonnement(starter.id, { client: 'cust_s', abonnement: 'sub_s', statut: 'active', finPeriode: lundi10h + 300 * jour, maj: lundi10h - 3 * jour, produit: 'prod_starter_an' });
  const ancienne = db.creerCompte('zoe@exemple.fr', 'zoe', BASCULE_OFFRES - jour);
  for (const c of [gratuite, starter, ancienne]) db.ajouterEvenement({ compte: c.id, type: 'vue', bloc: null, visiteur: 'v', source: 'TikTok', appareil: 'Mobile', ts: lundi10h - jour });
  // Les visites se comptent pour tout le monde ; seul le résumé est réservé aux offres qui montrent les stats.
  assert.equal(db.stats(gratuite.id, 7, lundi10h).vues, 1);
  assert.equal(await envoyerResumes(env, fetchFaux, lundi10h), 2);
  assert.deepEqual(envois.flatMap(e => e.to).sort(), ['sam@exemple.fr', 'zoe@exemple.fr']);
});

test('mode drop : le bon code, une place par visiteur, puis complet', async () => {
  const { debloquer } = await import('./acces.ts');
  const { masquerAcces } = await import('../lib/acces.ts');
  db.enregistrerBloc(P, validerBloc({ type: 'lien', titre: 'Prévente', url: 'https://secret.exemple/billet', acces: { code: 'VIP 2026', places: 2 } }, 'drop'));
  const publie = masquerAcces(db.lireBlocs(P), id => db.placesParBloc(P)[id] ?? 0).find(b => b.id === 'drop')!;
  // La page ne reçoit ni l'adresse ni le code.
  assert.equal(publie.url, ''); assert.equal(publie.acces?.code, '•'); assert.equal(publie.restantes, 2);
  assert.ok(!JSON.stringify(publie).includes('secret.exemple') && !JSON.stringify(publie).includes('VIP'));
  const a = { ip: '1.1.1.1', ua: 'Mozilla/5.0 A' }, b = { ip: '2.2.2.2', ua: 'Mozilla/5.0 B' }, c = { ip: '3.3.3.3', ua: 'Mozilla/5.0 C' };
  assert.equal(debloquer({ page: '', bloc: 'drop', code: 'mauvais' }, a).status, 403);
  const ok = debloquer({ page: '', bloc: 'drop', code: ' vip 2026 ' }, a);
  assert.equal(ok.status, 200); assert.equal(ok.url, 'https://secret.exemple/billet'); assert.equal(ok.restantes, 1);
  // Le même visiteur retrouve son lien sans reprendre de place.
  assert.equal(debloquer({ page: '', bloc: 'drop', code: 'VIP 2026' }, a).restantes, 1);
  assert.equal(debloquer({ page: '', bloc: 'drop', code: 'VIP 2026' }, b).restantes, 0);
  const plein = debloquer({ page: '', bloc: 'drop', code: 'VIP 2026' }, c);
  assert.equal(plein.status, 410); assert.equal(plein.url, undefined);
  // Un lien sans drop ne passe pas par là, et les essais à la chaîne sont freinés.
  assert.equal(debloquer({ page: '', bloc: 'inconnu' }, a).status, 404);
  let dernier = 0;
  for (let i = 0; i < 12; i++) dernier = debloquer({ page: '', bloc: 'drop', code: 'x' }, { ip: '9.9.9.9', ua: 'z' }).status;
  assert.equal(dernier, 429);
});

test('les traductions d’avant (retirées le 20 octobre 2026) se lisent sans casser la page', () => {
  const d = db.base();
  const brut = (id: string) => (d.prepare('SELECT donnees FROM blocs WHERE id = ?').get(id) as { donnees: string }).donnees;
  // Une base qui garde des traductions : sur un bloc, et la liste des langues avec la bio traduite dans les réglages.
  db.enregistrerBloc(P, validerBloc({ type: 'lien', titre: 'Mon cours', url: 'x.fr' }, 't'));
  d.prepare('UPDATE blocs SET donnees = ? WHERE id = ?').run(JSON.stringify({ ...JSON.parse(brut('t')), traductions: { en: { titre: 'My course' } } }), 't');
  d.prepare('UPDATE pages SET valeur = ? WHERE compte = ?').run(JSON.stringify({ ...db.lireReglages(P), langues: ['en'], bioTraduite: { en: 'Hi' } }), P);
  // La page se lit en français, telle que la personne l'a écrite ; les traductions sont laissées de côté.
  const bloc = db.lireBlocs(P).find(b => b.id === 't')!;
  assert.equal(bloc.titre, 'Mon cours');
  assert.equal('traductions' in bloc, false);
  const reglages = db.lireReglages(P);
  assert.equal('langues' in reglages, false);
  assert.equal('bioTraduite' in reglages, false);
  // Réenregistrés, le bloc et les réglages les perdent pour de bon.
  db.enregistrerBloc(P, bloc);
  assert.doesNotMatch(brut('t'), /traductions/);
  db.ecrireReglages(P, reglages);
  assert.doesNotMatch((d.prepare('SELECT valeur FROM pages WHERE compte = ?').get(P) as { valeur: string }).valeur, /langues|bioTraduite/);
});

test('avis et preuves : la note bornée, le genre vérifié', () => {
  const p = validerBloc({ type: 'preuve', titre: 'Avis', preuve: { genre: 'note', note: 7.26, nombre: -3, source: 'Google'.repeat(10) } }, 'p').preuve!;
  assert.equal(p.note, 5); assert.equal(p.nombre, 0); assert.equal(p.source.length, 30);
  assert.equal(validerBloc({ type: 'preuve', preuve: { genre: 'faux', note: 4.44 } }, 'q').preuve?.genre, 'note');
  assert.equal(validerBloc({ type: 'preuve', preuve: { note: 4.44 } }, 'q').preuve?.note, 4.4);
  // Un drop n'existe que sur un lien.
  assert.equal(validerBloc({ type: 'texte', titre: 'x', acces: { code: 'a' } }, 'r').acces, null);
  assert.equal(validerBloc({ type: 'lien', url: 'x.fr', acces: { code: '', places: 0 } }, 'r').acces, null);
});

test('liste d’attente : nom vérifié, réservé, gardé, puis invité jusqu’à la session', async () => {
  const attente = await import('./attente.ts');
  const envois: any[] = [];
  const fetchFaux = (async (_url: string, init: RequestInit) => { envois.push(JSON.parse(String(init.body))); return new Response('{}', { status: 200 }); }) as typeof fetch;
  const env = { RESEND_API_KEY: 'cle', NODE_ENV: 'production' };

  assert.equal((await import('../lib/valider.ts')).nomSaisi('Marie Dupont'), 'marie-dupont');
  assert.deepEqual(attente.verifierNom('Marie Dupont'), { etat: 'libre', nom: 'marie-dupont', suggestions: [] });
  assert.equal(attente.verifierNom('admin').etat, 'pris', 'un nom réservé par Hopla se dit pris');
  assert.equal(attente.verifierNom('lilian').suggestions.length, 2);
  assert.equal(attente.verifierNom('ab').etat, 'invalide');

  const r = await attente.reserverNom(O, env, { nom: 'marie-dupont', email: 'Marie@Exemple.fr' }, fetchFaux, 2_000_000, '9.9.9.1');
  assert.equal(r.ok, true);
  assert.match(r.message, /marie@exemple\.fr/);
  assert.equal(envois.at(-1).subject, 'Ton nom Hopla est réservé');
  assert.match(envois.at(-1).text, /hopla\.page\/marie-dupont est à toi/);
  assert.equal(envois.at(-1).reply_to, 'bonjour@liliansevoumian.fr', 'on répond au message pour faire effacer son adresse');

  // Le nom réservé n'est plus libre, et deux variantes sont proposées.
  const pris = attente.verifierNom('marie-dupont');
  assert.equal(pris.etat, 'pris');
  assert.equal(pris.suggestions.length, 2);
  assert.ok(pris.suggestions.every(s => pseudo(s) === s));
  const vole = await attente.reserverNom(O, env, { nom: 'marie-dupont', email: 'autre@exemple.fr' }, fetchFaux, 2_000_100, '9.9.9.2');
  assert.equal(vole.ok, false);

  // La même adresse ne prend pas un deuxième nom, et la réponse ne le révèle pas : seul l'e-mail le dit.
  const encore = await attente.reserverNom(O, env, { nom: 'marie-bis', email: 'marie@exemple.fr' }, fetchFaux, 2_000_200, '9.9.9.3');
  assert.deepEqual(encore, r);
  assert.equal(envois.at(-1).subject, 'Ton nom Hopla est déjà réservé');
  assert.equal(attente.verifierNom('marie-bis').etat, 'libre');

  // Une invitation à la main ne prend pas un nom réservé par quelqu'un d'autre.
  assert.throws(() => db.creerCompte('x@exemple.fr', 'marie-dupont'), /liste d’attente/);

  // Cinq réservations par heure depuis une même adresse IP.
  for (let i = 0; i < 5; i++) await attente.reserverNom(O, env, { nom: `essai-${i}`, email: `e${i}@exemple.fr` }, fetchFaux, 3_000_000 + i, '7.7.7.7');
  assert.equal((await attente.reserverNom(O, env, { nom: 'essai-6', email: 'e6@exemple.fr' }, fetchFaux, 3_000_010, '7.7.7.7')).ok, false);

  // Lilian invite : la page existe, la réservation part, le lien ouvre une session du nouveau compte.
  const reservation = db.listerAttente().find(x => x.pseudo === 'marie-dupont')!;
  const invite = await attente.inviterReservation(O, env, reservation.id, fetchFaux);
  assert.equal(invite.ok, true);
  assert.equal(envois.at(-1).subject, 'Ta page Hopla est prête');
  assert.match(envois.at(-1).text, /Tu avais réservé https:\/\/hopla\.page\/marie-dupont/);
  assert.equal(db.reservationParId(reservation.id), undefined);
  const compte = db.compteParPseudo('marie-dupont')!;
  assert.equal(compte.email, 'marie@exemple.fr');
  const jeton = /jeton=([\w-]+)/.exec(envois.at(-1).text)![1];
  const session = auth.ouvrirSession(jeton)!;
  assert.equal(auth.compteDeSession(session), compte.id);
  assert.equal(auth.ouvrirSession(jeton), null, 'le lien d’invitation ne sert qu’une fois');
  assert.equal((await attente.inviterReservation(O, env, reservation.id, fetchFaux)).ok, false);

  // Une adresse qui a déjà sa page reçoit un rappel, rien de plus.
  await attente.reserverNom(O, env, { nom: 'marie-trois', email: 'marie@exemple.fr' }, fetchFaux, 4_000_000, '9.9.9.4');
  assert.equal(envois.at(-1).subject, 'Tu as déjà une page Hopla');
  assert.equal(attente.verifierNom('marie-trois').etat, 'libre');

  // Sans invitation, une réservation s'efface au bout d'un an.
  db.purger(3_000_000 + 366 * 86_400_000);
  assert.equal(db.listerAttente().length, 0);
});

test('inscription directe : la page se crée sous le nom choisi et le lien part aussitôt', async () => {
  const attente = await import('./attente.ts');
  const envois: any[] = [];
  let enPanne = false;
  const fetchFaux = (async (_url: string, init: RequestInit) => { if (enPanne) return new Response('{}', { status: 500 }); envois.push(JSON.parse(String(init.body))); return new Response('{}', { status: 200 }); }) as typeof fetch;
  const env = { RESEND_API_KEY: 'cle', NODE_ENV: 'production' };

  assert.equal(attente.inscriptionLibre({}), true, 'libre par défaut');
  assert.equal(attente.inscriptionLibre({ LIENS_INSCRIPTION: 'attente' }), false);

  const r = await attente.creerHopla(O, env, { nom: 'paul-martin', email: 'Paul@Exemple.fr' }, fetchFaux, 5_000_000, '8.8.8.1');
  assert.equal(r.ok, true);
  assert.match(r.message, /paul@exemple\.fr/);
  const compte = db.compteParPseudo('paul-martin')!;
  assert.equal(compte.email, 'paul@exemple.fr');
  assert.equal(envois.at(-1).subject, 'Ta page Hopla est prête');
  assert.match(envois.at(-1).text, /Ta page https:\/\/hopla\.page\/paul-martin est créée/);
  const jeton = /jeton=([\w-]+)/.exec(envois.at(-1).text)![1];
  assert.equal(auth.compteDeSession(auth.ouvrirSession(jeton)!), compte.id, 'le lien ouvre la page qu’on vient de créer');
  assert.equal(attente.verifierNom('paul-martin').etat, 'pris');

  // Un nom déjà pris ne se crée pas deux fois ; une adresse qui a sa page reçoit un rappel, et la même réponse.
  assert.equal((await attente.creerHopla(O, env, { nom: 'paul-martin', email: 'autre@exemple.fr' }, fetchFaux, 5_000_100, '8.8.8.2')).ok, false);
  const encore = await attente.creerHopla(O, env, { nom: 'paul-bis', email: 'paul@exemple.fr' }, fetchFaux, 5_000_200, '8.8.8.3');
  assert.deepEqual(encore, r);
  assert.equal(envois.at(-1).subject, 'Tu as déjà une page Hopla');
  assert.equal(db.compteParPseudo('paul-bis'), undefined);

  // Qui avait réservé pendant la liste d'attente reçoit la page de ce nom-là.
  await attente.reserverNom(O, env, { nom: 'jeanne-reserve', email: 'jeanne@exemple.fr' }, fetchFaux, 5_000_300, '8.8.8.4');
  assert.equal((await attente.creerHopla(O, env, { nom: 'jeanne-autre', email: 'jeanne@exemple.fr' }, fetchFaux, 5_000_400, '8.8.8.5')).ok, true);
  assert.equal(db.compteParPseudo('jeanne-reserve')?.email, 'jeanne@exemple.fr');
  assert.equal(db.compteParPseudo('jeanne-autre'), undefined);
  assert.match(envois.at(-1).text, /Tu avais réservé https:\/\/hopla\.page\/jeanne-reserve/);

  // Si l'e-mail ne part pas, la page s'efface et le nom redevient libre.
  enPanne = true;
  assert.equal((await attente.creerHopla(O, env, { nom: 'lea-panne', email: 'lea@exemple.fr' }, fetchFaux, 5_000_500, '8.8.8.6')).ok, false);
  assert.equal(db.compteParPseudo('lea-panne'), undefined);
  assert.equal(attente.verifierNom('lea-panne').etat, 'libre');
  enPanne = false;

  // Cinq pages par heure depuis une même adresse IP.
  for (let i = 0; i < 5; i++) await attente.creerHopla(O, env, { nom: `page-${i}`, email: `p${i}@exemple.fr` }, fetchFaux, 6_000_000 + i, '6.6.6.6');
  assert.equal((await attente.creerHopla(O, env, { nom: 'page-6', email: 'p6@exemple.fr' }, fetchFaux, 6_000_010, '6.6.6.6')).ok, false);
});

test('une adresse mal tapée se corrige juste après l’inscription, tant que la page n’a pas été ouverte', async () => {
  const attente = await import('./attente.ts');
  const envois: any[] = [];
  const fetchFaux = (async (_url: string, init: RequestInit) => { envois.push(JSON.parse(String(init.body))); return new Response('{}', { status: 200 }); }) as typeof fetch;
  const env = { RESEND_API_KEY: 'cle', NODE_ENV: 'production' };
  const t = 7_000_000;

  await attente.creerHopla(O, env, { nom: 'nina-faute', email: 'nina@gmial.com' }, fetchFaux, t, '5.5.5.1');
  const premier = /jeton=([\w-]+)/.exec(envois.at(-1).text)![1];

  // Sans l'ancienne adresse exacte, rien ne bouge.
  assert.equal((await attente.corrigerAdresse(O, env, { nom: 'nina-faute', ancienne: 'pirate@exemple.fr', nouvelle: 'pirate@exemple.fr' }, fetchFaux, t + 1000, '5.5.5.2')).ok, false);
  assert.equal(db.compteParPseudo('nina-faute')!.email, 'nina@gmial.com');

  const r = await attente.corrigerAdresse(O, env, { nom: 'nina-faute', ancienne: 'nina@gmial.com', nouvelle: 'Nina@Gmail.com' }, fetchFaux, t + 2000, '5.5.5.3');
  assert.equal(r.ok, true);
  assert.match(r.message, /nina@gmail\.com/);
  assert.equal(db.compteParPseudo('nina-faute')!.email, 'nina@gmail.com');
  assert.deepEqual(envois.at(-1).to, ['nina@gmail.com']);
  assert.equal(auth.ouvrirSession(premier), null, 'le lien parti à la mauvaise adresse ne sert plus');
  const second = /jeton=([\w-]+)/.exec(envois.at(-1).text)![1];
  assert.ok(auth.ouvrirSession(second), 'le nouveau lien ouvre la page');

  // Une page déjà ouverte, ou trop ancienne, ne change plus d'adresse ici.
  assert.equal((await attente.corrigerAdresse(O, env, { nom: 'nina-faute', ancienne: 'nina@gmail.com', nouvelle: 'autre@exemple.fr' }, fetchFaux, t + 3000, '5.5.5.4')).ok, false);
  await attente.creerHopla(O, env, { nom: 'omar-tard', email: 'omar@exemple.fr' }, fetchFaux, t, '5.5.5.5');
  assert.equal((await attente.corrigerAdresse(O, env, { nom: 'omar-tard', ancienne: 'omar@exemple.fr', nouvelle: 'omar@exemple.com' }, fetchFaux, t + attente.DELAI_CORRECTION + 1, '5.5.5.6')).ok, false);
  assert.equal(db.compteParPseudo('omar-tard')!.email, 'omar@exemple.fr');

  // En liste d'attente, la réservation change d'adresse de la même façon.
  const enAttente = { ...env, LIENS_INSCRIPTION: 'attente' };
  await attente.reserverNom(O, enAttente, { nom: 'ines-attente', email: 'ines@hotmial.fr' }, fetchFaux, t, '5.5.5.7');
  assert.equal((await attente.corrigerAdresse(O, enAttente, { nom: 'ines-attente', ancienne: 'ines@hotmial.fr', nouvelle: 'ines@hotmail.fr' }, fetchFaux, t + 1000, '5.5.5.8')).ok, true);
  assert.equal(db.reservationParEmail('ines@hotmail.fr')?.pseudo, 'ines-attente');
  assert.equal(envois.at(-1).subject, 'Ton nom Hopla est réservé');
});

test('« renvoie-le » redonne le lien de bienvenue d’une page pas encore ouverte', async () => {
  const attente = await import('./attente.ts');
  const envois: any[] = [];
  const fetchFaux = (async (_url: string, init: RequestInit) => { envois.push(JSON.parse(String(init.body))); return new Response('{}', { status: 200 }); }) as typeof fetch;
  const env = { RESEND_API_KEY: 'cle', NODE_ENV: 'production' };
  const t = Date.now();
  await attente.creerHopla(O, env, { nom: 'lea-renvoi', email: 'lea@exemple.fr' }, fetchFaux, t, '5.5.6.1');
  const premier = /jeton=([\w-]+)/.exec(envois.at(-1).text)![1];
  const n = envois.length;

  // Moins d'une minute après le premier : rien ne repart, la réponse ne change pas.
  const tot = await attente.renvoyerInscription(O, env, { nom: 'lea-renvoi', email: 'lea@exemple.fr' }, fetchFaux, t + 1000, '5.5.6.2');
  assert.equal(tot.ok, true);
  assert.equal(envois.length, n);

  const r = await attente.renvoyerInscription(O, env, { nom: 'lea-renvoi', email: 'Lea@Exemple.fr' }, fetchFaux, Date.now() + 61_000, '5.5.6.3');
  assert.equal(r.ok, true);
  assert.match(r.message, /7 jours/);
  assert.equal(envois.length, n + 1);
  assert.equal(envois.at(-1).subject, 'Ta page Hopla est prête');
  assert.ok(auth.ouvrirSession(premier), 'le premier lien marche toujours');

  // La page ouverte, c'est un lien de connexion.
  const c = await attente.renvoyerInscription(O, env, { nom: 'lea-renvoi', email: 'lea@exemple.fr' }, fetchFaux, Date.now() + 122_000, '5.5.6.4');
  assert.equal(c.ok, true);
  assert.match(c.message, /15 minutes/);
  assert.equal(envois.at(-1).subject, 'Ton lien de connexion');
});

test('un nom mal tapé se change juste après l’inscription, tant que la page n’a pas été ouverte', async () => {
  const attente = await import('./attente.ts');
  const envois: any[] = [];
  const fetchFaux = (async (_url: string, init: RequestInit) => { envois.push(JSON.parse(String(init.body))); return new Response('{}', { status: 200 }); }) as typeof fetch;
  const env = { RESEND_API_KEY: 'cle', NODE_ENV: 'production' };
  const t = 8_000_000;

  await attente.creerHopla(O, env, { nom: 'pual-faute', email: 'paul@exemple.fr' }, fetchFaux, t, '7.7.7.1');
  const premier = /jeton=([\w-]+)/.exec(envois.at(-1).text)![1];

  // Sans l'adresse exacte, ou vers un nom pris, rien ne bouge.
  assert.equal((await attente.renommerPage(O, env, { ancien: 'pual-faute', nouveau: 'paul-juste', email: 'pirate@exemple.fr' }, fetchFaux, t + 1000, '7.7.7.2')).ok, false);
  assert.equal((await attente.renommerPage(O, env, { ancien: 'pual-faute', nouveau: 'lilian', email: 'paul@exemple.fr' }, fetchFaux, t + 1000, '7.7.7.3')).ok, false);
  assert.ok(db.compteParPseudo('pual-faute'));

  const r = await attente.renommerPage(O, env, { ancien: 'pual-faute', nouveau: 'Paul Juste', email: 'paul@exemple.fr' }, fetchFaux, t + 2000, '7.7.7.4');
  assert.equal(r.ok, true);
  assert.equal((r as { nom?: string }).nom, 'paul-juste');
  assert.equal(db.compteParPseudo('pual-faute'), undefined);
  assert.equal(db.compteParPseudo('paul-juste')!.email, 'paul@exemple.fr');
  assert.match(envois.at(-1).text, /paul-juste/);
  assert.equal(auth.ouvrirSession(premier), null, 'le lien parti sous l’ancien nom ne sert plus');
  assert.ok(auth.ouvrirSession(/jeton=([\w-]+)/.exec(envois.at(-1).text)![1]), 'le nouveau lien ouvre la page');

  // Une page ouverte, ou trop ancienne, garde son nom.
  assert.equal((await attente.renommerPage(O, env, { ancien: 'paul-juste', nouveau: 'paul-autre', email: 'paul@exemple.fr' }, fetchFaux, t + 3000, '7.7.7.5')).ok, false);
  await attente.creerHopla(O, env, { nom: 'lea-tard', email: 'lea@exemple.fr' }, fetchFaux, t, '7.7.7.6');
  assert.equal((await attente.renommerPage(O, env, { ancien: 'lea-tard', nouveau: 'lea-tot', email: 'lea@exemple.fr' }, fetchFaux, t + attente.DELAI_CORRECTION + 1, '7.7.7.7')).ok, false);
  assert.ok(db.compteParPseudo('lea-tard'));

  // En liste d'attente, la réservation change de nom de la même façon.
  const enAttente = { ...env, LIENS_INSCRIPTION: 'attente' };
  await attente.reserverNom(O, enAttente, { nom: 'mila-atente', email: 'mila@exemple.fr' }, fetchFaux, t, '7.7.7.8');
  assert.equal((await attente.renommerPage(O, enAttente, { ancien: 'mila-atente', nouveau: 'mila-attente', email: 'mila@exemple.fr' }, fetchFaux, t + 1000, '7.7.7.9')).ok, true);
  assert.equal(db.reservationParEmail('mila@exemple.fr')?.pseudo, 'mila-attente');
});

/* ---- Supprimer un compte abonné, repasser en Gratuit ---- */

const ENV_CREEM = { CREEM_API_KEY: 'creem_test_x', CREEM_WEBHOOK_SECRET: 'whsec_test', CREEM_PRODUIT_MOIS: 'prod_mois', CREEM_PRODUIT_AN: 'prod_an', CREEM_TEST: '1' };

/** Un faux Creem (et un faux Resend) : `panne` fait échouer les prochains appels à Creem, `statut` change sa réponse. */
function fauxCreem(reponse: (url: string) => object = () => ({ id: 'sub', status: 'canceled' })) {
  const etat = { panne: 0, statut: 200, creem: [] as { url: string; corps: any }[], courriels: [] as any[] };
  const fetchFaux = (async (url: string, init: RequestInit) => {
    const corps = JSON.parse(String(init.body));
    if (url.startsWith('https://api.resend.com')) { etat.courriels.push(corps); return new Response('{}'); }
    etat.creem.push({ url, corps });
    if (etat.panne > 0) { etat.panne--; return new Response('{"error":"down"}', { status: 503 }); }
    return Response.json(reponse(url), { status: etat.statut });
  }) as typeof fetch;
  return { etat, fetchFaux };
}

test('supprimer un compte résilie son abonnement Creem tout de suite, avant d’effacer quoi que ce soit', async () => {
  const { supprimerAvecAbonnement } = await import('./suppression.ts');
  const { supprimerMotive } = await import('./moderation.ts');
  const env = { ...ENV_CREEM, RESEND_API_KEY: 'cle', NODE_ENV: 'production', LIENS_ADMIN_EMAIL: 'lilian@exemple.fr' };
  const { etat, fetchFaux } = fauxCreem();
  const t = Date.parse('2026-11-02T10:00:00Z'), jour = 86_400_000;
  const abonne = (pseudo: string, statut = 'active') => {
    const c = db.creerCompte(`${pseudo}@exemple.fr`, pseudo);
    db.appliquerAbonnement(c.id, { client: `cust_${pseudo}`, abonnement: `sub_${pseudo}`, statut, finPeriode: t + 20 * jour, maj: 1 });
    return db.compteParId(c.id)!;
  };

  // Un abonné : Creem résilie tout de suite (sans remboursement automatique), puis le compte disparaît.
  const ana = abonne('ana');
  assert.deepEqual(await supprimerAvecAbonnement(env, fetchFaux, ana, t), { ok: true, resiliation: 'faite' });
  assert.equal(etat.creem.length, 1);
  assert.equal(etat.creem[0].url, 'https://test-api.creem.io/v1/subscriptions/sub_ana/cancel');
  assert.deepEqual(etat.creem[0].corps, { mode: 'immediate' });
  assert.equal(db.compteParId(ana.id), undefined);

  // Sans abonnement, ou un abonnement déjà terminé chez Creem : rien à lui demander.
  const sans = db.creerCompte('bob@exemple.fr', 'bob');
  for (const c of [sans, abonne('fini', 'canceled'), abonne('expire', 'expired')]) {
    assert.deepEqual(await supprimerAvecAbonnement(env, fetchFaux, db.compteParId(c.id)!, t), { ok: true, resiliation: 'aucune' });
    assert.equal(db.compteParId(c.id), undefined);
  }
  assert.equal(etat.creem.length, 1);

  // Creem ne connaît pas l'abonnement : rien à résilier, le compte part.
  etat.statut = 404;
  const inconnu = abonne('inconnu');
  assert.deepEqual(await supprimerAvecAbonnement(env, fetchFaux, inconnu, t), { ok: true, resiliation: 'aucune' });
  assert.equal(db.compteParId(inconnu.id), undefined);
  etat.statut = 200;

  // Creem en panne : au premier échec rien n'est supprimé ; au deuxième, dans la journée, le compte part quand même,
  // et Lilian reçoit de quoi résilier à la main (le pseudo et les identifiants Creem, pas l'adresse e-mail).
  const cleo = abonne('cleo');
  etat.panne = 2;
  assert.deepEqual(await supprimerAvecAbonnement(env, fetchFaux, cleo, t), { ok: false });
  assert.ok(db.compteParId(cleo.id), 'rien n’est supprimé au premier échec');
  assert.equal(etat.courriels.length, 0);
  assert.deepEqual(await supprimerAvecAbonnement(env, fetchFaux, db.compteParId(cleo.id)!, t + 60_000), { ok: true, resiliation: 'a-la-main' });
  assert.equal(db.compteParId(cleo.id), undefined);
  assert.equal(etat.courriels.length, 1);
  assert.deepEqual(etat.courriels[0].to, ['lilian@exemple.fr']);
  assert.match(etat.courriels[0].subject, /résilier à la main : cleo/);
  assert.match(etat.courriels[0].text, /sub_cleo/);
  assert.match(etat.courriels[0].text, /cust_cleo/);
  assert.match(etat.courriels[0].text, /22 novembre 2026/);
  assert.doesNotMatch(etat.courriels[0].text, /cleo@exemple\.fr/);

  // Un échec de plus d'un jour ne compte plus : on refuse de nouveau, puis Creem répond.
  const dan = abonne('dan');
  etat.panne = 2;
  assert.equal((await supprimerAvecAbonnement(env, fetchFaux, dan, t)).ok, false);
  assert.equal((await supprimerAvecAbonnement(env, fetchFaux, dan, t + 2 * jour)).ok, false);
  assert.deepEqual(await supprimerAvecAbonnement(env, fetchFaux, dan, t + 2 * jour + 60_000), { ok: true, resiliation: 'faite' });

  // Déjà résilié pour la fin de la période : plus rien ne sera prélevé, un refus de Creem ne retient rien.
  const eve = abonne('eve', 'scheduled_cancel');
  etat.panne = 1;
  assert.deepEqual(await supprimerAvecAbonnement(env, fetchFaux, eve, t), { ok: true, resiliation: 'aucune' });
  assert.equal(db.compteParId(eve.id), undefined);

  // Depuis Comptes : même règle ; la personne apprend que son abonnement s'arrête avec la page.
  etat.courriels.length = 0;
  const fred = abonne('fred');
  assert.equal(await supprimerMotive(env, fetchFaux, fred.id, 'Arnaque au faux concours.', t), 'faite');
  assert.equal(etat.courriels.length, 1);
  assert.deepEqual(etat.courriels[0].to, ['fred@exemple.fr']);
  assert.match(etat.courriels[0].text, /Ton abonnement s’arrête avec : plus aucun paiement ne sera prélevé/);
  const gus = abonne('gus');
  etat.panne = 1;
  await assert.rejects(supprimerMotive(env, fetchFaux, gus.id, '', t), /n’est pas supprimé/);
  assert.ok(db.compteParId(gus.id));
});

test('la purge des pages jamais ouvertes ne touche pas un compte qui a un abonnement', () => {
  const jour = 86_400_000, maintenant = Date.now(), ilYa = maintenant - 40 * jour;
  const payeur = db.creerCompte('payeur@exemple.fr', 'payeur', ilYa);
  // Un abonnement sans client connu (un webhook incomplet) : la purge le garde quand même.
  db.appliquerAbonnement(payeur.id, { client: '', abonnement: 'sub_payeur', statut: 'active', finPeriode: null, maj: 1 });
  db.purger(maintenant);
  assert.ok(db.compteParId(payeur.id));
});

test('repasser en Gratuit : Creem résilie pour la fin de la période payée, l’offre court jusque-là', async () => {
  const creem = await import('./creem.ts');
  const t = Date.parse('2026-11-02T10:00:00Z'), jour = 86_400_000, fin = t + 20 * jour;
  const { etat, fetchFaux } = fauxCreem(() => ({ id: 'sub_ines', status: 'scheduled_cancel', current_period_end_date: new Date(fin).toISOString(), customer: { id: 'cust_ines' } }));
  const ines = db.creerCompte('ines@exemple.fr', 'ines');
  await assert.rejects(creem.resilierEnFinDePeriode(ENV_CREEM, fetchFaux, ines, t), /Aucun abonnement/);
  await assert.rejects(creem.resilierEnFinDePeriode({}, fetchFaux, ines, t), /pas encore branché/);
  await assert.rejects(creem.resilierEnFinDePeriode(ENV_CREEM, fetchFaux, db.compteParId(P)!, t), /Aucun abonnement/);
  assert.equal(etat.creem.length, 0);

  db.appliquerAbonnement(ines.id, { client: 'cust_ines', abonnement: 'sub_ines', statut: 'active', finPeriode: fin, maj: t - jour, produit: 'prod_mois' });
  await creem.resilierEnFinDePeriode(ENV_CREEM, fetchFaux, db.compteParId(ines.id)!, t);
  assert.equal(etat.creem[0].url, 'https://test-api.creem.io/v1/subscriptions/sub_ines/cancel');
  // `scheduled` toujours écrit : sans lui, Creem suivrait le réglage de la boutique, peut-être « tout de suite ».
  assert.deepEqual(etat.creem[0].corps, { mode: 'scheduled', onExecute: 'cancel' });
  const a = db.abonnement(db.compteParId(ines.id)!, t);
  assert.deepEqual({ plan: a.plan, statut: a.statut, finPeriode: a.finPeriode, portail: a.portail }, { plan: 'pro', statut: 'scheduled_cancel', finPeriode: fin, portail: true });
  assert.equal(db.abonnement(db.compteParId(ines.id)!, fin + 1).plan, 'gratuit', 'puis Gratuit, sans jours de grâce');
  assert.equal(db.abonnement(db.compteParId(ines.id)!, fin + 1).portail, true, 'les factures restent accessibles');

  // Un double toucher ne rappelle pas Creem.
  await creem.resilierEnFinDePeriode(ENV_CREEM, fetchFaux, db.compteParId(ines.id)!, t + 1000);
  assert.equal(etat.creem.length, 1);

  // Creem refuse (clé sans le droit) : le message renvoie au portail, rien ne change.
  const { createHmac } = await import('node:crypto');
  const jo = db.creerCompte('jo@exemple.fr', 'jo');
  db.appliquerAbonnement(jo.id, { client: 'cust_jo', abonnement: 'sub_jo', statut: 'active', finPeriode: fin, maj: 1, produit: 'prod_mois' });
  etat.statut = 403;
  await assert.rejects(creem.resilierEnFinDePeriode(ENV_CREEM, fetchFaux, db.compteParId(jo.id)!, t), /portail Creem/);
  assert.equal(db.compteParId(jo.id)!.abonnement_statut, 'active');
  etat.statut = 200;

  // Le webhook de Creem dit la même chose, même si l'objet garde « active » jusqu'à la fin de la période.
  const corps = JSON.stringify({ id: 'evt_sc', eventType: 'subscription.scheduled_cancel', created_at: t, object: { id: 'sub_jo', status: 'active', customer: { id: 'cust_jo' }, current_period_end_date: new Date(fin).toISOString() } });
  assert.equal(creem.traiterWebhook(ENV_CREEM, corps, createHmac('sha256', ENV_CREEM.CREEM_WEBHOOK_SECRET).update(corps).digest('hex'), t).status, 200);
  assert.equal(db.compteParId(jo.id)!.abonnement_statut, 'scheduled_cancel');
});
