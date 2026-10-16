import test from 'node:test';
import assert from 'node:assert/strict';

process.env.LIENS_DB = ':memory:';
const db = await import('./db.ts');
const auth = await import('./auth.ts');
const { source, appareil, enregistrer } = await import('./analytique.ts');
const { validerBloc, validerReglages, adresse } = await import('../lib/valider.ts');
const { REGLAGES_DEFAUT } = await import('../lib/defauts.ts');

test.beforeEach(() => { db.fermer(); });

test('la base se remplit une fois, puis ajoute en tête, réordonne et supprime', () => {
  const depart = db.lireBlocs();
  assert.ok(depart.length >= 5);
  assert.equal(db.stockageEphemere(), true);
  const bloc = validerBloc({ type: 'lien', titre: 'Nouveau', url: 'exemple.fr' }, 'abc');
  db.enregistrerBloc(bloc);
  assert.equal(db.lireBlocs()[0].id, 'abc');
  assert.equal(db.lireBlocs()[0].url, 'https://exemple.fr/');
  db.enregistrerBloc({ ...bloc, titre: 'Renommé' });
  assert.equal(db.lireBlocs()[0].titre, 'Renommé');
  const ids = db.lireBlocs().map(b => b.id).reverse();
  db.ordonner(ids);
  assert.deepEqual(db.lireBlocs().map(b => b.id), ids);
  db.supprimerBloc('abc');
  assert.equal(db.lireBlocs().length, depart.length);
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
  const r = await auth.demanderConnexion('https://liliansevoumian.fr', env, fetchFaux, 1_000_000);
  assert.equal(r.ok, true);
  assert.deepEqual(envois[0].corps.to, ['bonjour@liliansevoumian.fr']);
  const jeton = /jeton=([\w-]+)/.exec(envois[0].corps.text)![1];
  const encore = await auth.demanderConnexion('https://liliansevoumian.fr', env, fetchFaux, 1_030_000);
  assert.equal(encore.ok, false, 'un seul lien par minute');
  const session = auth.ouvrirSession(jeton);
  assert.ok(session);
  assert.equal(auth.sessionValide(session), true);
  assert.equal(auth.ouvrirSession(jeton), null, 'le lien ne sert qu’une fois');
  auth.fermerSession(session);
  assert.equal(auth.sessionValide(session), false);
  assert.equal(auth.sessionValide('n’importe quoi'), false);
  const sansCle = await auth.demanderConnexion('https://liliansevoumian.fr', { NODE_ENV: 'production' }, fetchFaux, 9_000_000);
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
  assert.equal(enregistrer({ type: 'vue', bloc: null, utm: '', referent: '' }, { ip: '1.1.1.1', ua: 'Googlebot/2.1', admin: false }, maintenant), false);
  assert.equal(enregistrer({ type: 'vue', bloc: null, utm: '', referent: '' }, { ip: '1.1.1.1', ua: iphone, admin: true }, maintenant), false);
  enregistrer({ type: 'vue', bloc: null, utm: '', referent: 'https://www.instagram.com/' }, { ip: '1.1.1.1', ua: iphone, admin: false }, maintenant);
  enregistrer({ type: 'vue', bloc: null, utm: '', referent: '' }, { ip: '1.1.1.1', ua: iphone, admin: false }, maintenant + 1000);
  enregistrer({ type: 'vue', bloc: null, utm: '', referent: '' }, { ip: '2.2.2.2', ua: iphone, admin: false }, maintenant);
  const id = db.lireBlocs()[0].id;
  enregistrer({ type: 'clic', bloc: id, utm: '', referent: '' }, { ip: '2.2.2.2', ua: iphone, admin: false }, maintenant);
  assert.equal(enregistrer({ type: 'clic', bloc: '../x', utm: '', referent: '' }, { ip: '2.2.2.2', ua: iphone, admin: false }, maintenant), false);
  enregistrer({ type: 'vue', bloc: null, utm: '', referent: '' }, { ip: '3.3.3.3', ua: iphone, admin: false }, maintenant - 10 * 86_400_000);
  const s = db.stats(7, maintenant);
  assert.equal(s.vues, 3); assert.equal(s.visiteurs, 2); assert.equal(s.clics, 1);
  assert.equal(s.serie.length, 7); assert.equal(s.serie[6].vues, 3);
  assert.equal(s.precedent.vues, 1);
  assert.deepEqual(s.blocs.map(b => b.id), [id]);
  assert.equal(s.sources[0].nom, 'Direct');
});
