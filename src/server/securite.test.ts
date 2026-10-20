import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo, LookupFunction } from 'node:net';

process.env.LIENS_DB = ':memory:';
const db = await import('./db.ts');
const auth = await import('./auth.ts');
const attente = await import('./attente.ts');
const { cleIp, limiteur, destinataireSature, MINUTE, HEURE, JOUR } = await import('./limites.ts');
const turnstile = await import('./turnstile.ts');
const { apercuSite, resolutionPublique } = await import('./apercu.ts');
const { validerBloc } = await import('../lib/valider.ts');
const P = 'principal';
const O = { page: 'https://hopla.page', admin: 'https://app.hopla.page' };

/* Les limites vivent en mémoire pour tout le fichier : chaque test prend ses propres adresses. */

test.beforeEach(() => { db.fermer(); });

/** Un faux Resend qui garde chaque e-mail. */
function boite() {
  const envois: { to: string[]; subject: string; text: string }[] = [];
  const fetchFaux = (async (_url: string, init: RequestInit) => { envois.push(JSON.parse(String(init.body))); return new Response('{}'); }) as typeof fetch;
  return { envois, fetchFaux };
}
const env = { RESEND_API_KEY: 'cle', NODE_ENV: 'production' };

test('une IPv4 compte pour elle-même, une IPv6 pour son /64', () => {
  assert.equal(cleIp('203.0.113.7'), '203.0.113.7');
  assert.equal(cleIp(' ::FFFF:203.0.113.7 '), '203.0.113.7');
  assert.equal(cleIp('2001:db8:1:2:3:4:5:6'), '2001:db8:1:2::/64');
  assert.equal(cleIp('2001:DB8:1:2::5'), '2001:db8:1:2::/64');
  assert.equal(cleIp('2001:0db8:0001:0002::'), '2001:db8:1:2::/64');
  assert.equal(cleIp('2001:db8::1'), '2001:db8:0:0::/64');
  assert.equal(cleIp('fe80::1%eth0'), 'fe80:0:0:0::/64');
  assert.equal(cleIp(''), '');
});

test('le limiteur glisse, ne compte pas les refus et ne se vide jamais d’un coup', () => {
  const l = limiteur([2, MINUTE], [3, HEURE]);
  assert.equal(l('a', 0), false);
  assert.equal(l('a', 1000), false);
  assert.equal(l('a', 2000), true, 'deux par minute');
  for (let i = 0; i < 10; i++) l('a', 3000 + i);
  assert.equal(l('a', MINUTE + 500), false, 'les refus ne comptent pas : la place du premier se libère');
  assert.equal(l('a', MINUTE + 1500), true, 'trois par heure');
  assert.equal(l('b', MINUTE + 1500), false, 'chaque clé a son compte');
  assert.equal(l('a', HEURE + 100), false, 'une heure après, le premier passage est oublié');

  // Plein, le registre oublie d'abord les clés servies il y a le plus longtemps : une clé récente reste bloquée.
  const u = limiteur([1, HEURE]);
  u('vieille', 0);
  for (let i = 1; i < 20_000; i++) u(`k${i}`, i);
  u('recente', 20_000);
  u('encore', 20_001);
  assert.equal(u('recente', 20_002), true);
  assert.equal(u('k19999', 20_003), true);
  assert.equal(u('vieille', 20_004), false, 'la plus ancienne a été oubliée');
});

test('cinq e-mails par heure et dix par jour vers une même adresse, quelle que soit sa casse', () => {
  const t = 10 * JOUR;
  for (let i = 0; i < 5; i++) assert.equal(destinataireSature(i % 2 ? 'Cible@Exemple.fr' : ' cible@exemple.fr ', t + i), false);
  assert.equal(destinataireSature('CIBLE@exemple.fr', t + 10), true, 'cinq par heure');
  assert.equal(destinataireSature('voisine@exemple.fr', t + 10), false, 'chaque adresse a son compte');
  for (let i = 0; i < 5; i++) assert.equal(destinataireSature('cible@exemple.fr', t + 2 * HEURE + i), false);
  assert.equal(destinataireSature('cible@exemple.fr', t + 4 * HEURE), true, 'dix par jour');
  assert.equal(destinataireSature('cible@exemple.fr', t + JOUR + 10), false, 'le lendemain, ça repart');
});

test('l’accueil ne sert pas à inonder une boîte, ni à créer des pages en changeant d’IPv6', async () => {
  const { envois, fetchFaux } = boite();
  const t = 20 * JOUR;
  db.creerCompte('victime@exemple.fr', 'victime', t);
  // Chaque demande vient d'une autre adresse IP : seule la limite par destinataire les arrête.
  for (let i = 0; i < 5; i++) {
    const r = await attente.creerHopla(O, env, { nom: `essai-${i}`, email: 'Victime@Exemple.fr' }, fetchFaux, t + i, `198.51.100.${i + 1}`);
    assert.equal(r.ok, true, 'la même réponse que pour une page neuve');
  }
  assert.equal(envois.length, 5);
  assert.ok(envois.every(e => e.to[0] === 'victime@exemple.fr' && e.subject === 'Tu as déjà une page Hopla'));
  const sixieme = await attente.creerHopla(O, env, { nom: 'essai-6', email: 'victime@exemple.fr' }, fetchFaux, t + 10, '198.51.100.9');
  assert.equal(sixieme.ok, false);
  assert.match(sixieme.message, /Trop d’e-mails/);
  assert.equal(envois.length, 5, 'le sixième ne part pas');

  // Une IPv6 compte pour son /64 : changer la fin de l'adresse ne donne pas cinq pages de plus.
  for (let i = 0; i < 5; i++) await attente.creerHopla(O, env, { nom: `six-${i}`, email: `six${i}@exemple.fr` }, fetchFaux, t + 100 + i, `2001:db8:aa:bb::${i + 1}`);
  const r = await attente.creerHopla(O, env, { nom: 'six-5', email: 'six5@exemple.fr' }, fetchFaux, t + 200, '2001:db8:aa:bb:ffff::1');
  assert.equal(r.ok, false);
  assert.match(r.message, /Trop de pages/);
});

test('le plafond du jour des liens de connexion ne compte pas les bienvenues de sept jours', async () => {
  const { envois, fetchFaux } = boite();
  const avecAdmin = { ...env, LIENS_ADMIN_EMAIL: 'admin@exemple.fr' };
  const maintenant = Date.now();
  db.ajouterJeton('h-test', 'connexion', 15 * MINUTE, P, 1234);
  assert.equal(db.jetonsRecents(0, P, 15 * MINUTE).n, 1, 'un lien de 15 minutes se compte, à la milliseconde près');
  db.fermer();
  // Deux cents pages créées depuis l'accueil : autant de liens de sept jours.
  for (let i = 0; i < 200; i++) db.ajouterJeton(`bienvenue-${i}`, 'connexion', 7 * JOUR, `compte-${i}`, maintenant - 1000);
  assert.equal((await auth.demanderConnexion(O, avecAdmin, 'admin@exemple.fr', fetchFaux, maintenant, '192.0.2.10')).ok, true);
  assert.equal(envois.length, 1, 'le lien part encore');
  // Avec celui qui vient de partir, deux cents liens de connexion ferment la porte jusqu'au lendemain.
  for (let i = 0; i < 199; i++) db.ajouterJeton(`connexion-${i}`, 'connexion', 15 * MINUTE, `compte-${i}`, maintenant - 1000);
  const plein = await auth.demanderConnexion(O, avecAdmin, 'admin@exemple.fr', fetchFaux, maintenant + 1, '192.0.2.11');
  assert.equal(plein.ok, false);
  assert.match(plein.message, /aujourd’hui/);
  assert.equal(envois.length, 1);
});

test('les images d’un compte suspendu ne sont plus servies', () => {
  const c = db.creerCompte('images@exemple.fr', 'images-test');
  const id = db.ajouterMedia(c.id, new Uint8Array([1, 2, 3]), 'webp');
  assert.deepEqual([...db.lireMedia(id, 'webp')!], [1, 2, 3]);
  db.changerStatut(c.id, 'suspendu');
  assert.equal(db.lireMedia(id, 'webp'), null);
  db.changerStatut(c.id, 'actif');
  assert.ok(db.lireMedia(id, 'webp'));
  const lilian = db.ajouterMedia(P, new Uint8Array([4]), 'jpg');
  assert.ok(db.lireMedia(lilian, 'jpg'), 'celles de la page de Lilian aussi');
});

test('les événements du jour se comptent sur les dernières heures', () => {
  const maintenant = Date.now();
  const vue = (ts: number, compte = P) => db.ajouterEvenement({ compte, type: 'vue', bloc: null, visiteur: 'v', source: '', appareil: 'mobile', ts });
  vue(maintenant - 1000);
  vue(maintenant - 2000, 'autre');
  vue(maintenant - 3 * JOUR);
  assert.equal(db.evenementsDuJour(maintenant), 2);
  assert.equal(db.evenementsDuJour(maintenant, P), 1);
});

test('Turnstile : rien sans les deux clés, et avec elles un jeton bon, de la bonne action, pris sur Hopla', async t => {
  const erreurs = t.mock.method(console, 'error', () => {});
  const rien = (() => { throw new Error('rien ne doit partir'); }) as unknown as typeof fetch;
  assert.equal(await turnstile.verifierTurnstile({}, rien, { jeton: '', action: 'connexion', ip: '1.2.3.4', hotes: new Set() }), true);
  assert.equal(turnstile.cleTurnstile({ TURNSTILE_SITE_KEY: '0xpublique' }), '', 'une seule clé ne branche rien');
  assert.equal(turnstile.turnstileActif({ TURNSTILE_SECRET: 'secret' }), false);
  const actif = { TURNSTILE_SITE_KEY: ' 0xpublique ', TURNSTILE_SECRET: ' secret ', NODE_ENV: 'production' };
  assert.equal(turnstile.cleTurnstile(actif), '0xpublique');

  // En production, les noms de Hopla et jamais localhost ; ailleurs, celui de la requête.
  assert.deepEqual([...turnstile.hotesTurnstile(actif, 'http://localhost:3000/_serverFn/x')].sort(), ['app.hopla.page', 'hopla.page']);
  assert.deepEqual([...turnstile.hotesTurnstile({ ...actif, LIENS_ORIGINE: 'https://exemple.fr' }, 'http://localhost:3000/')].sort(), ['app.hopla.page', 'exemple.fr']);
  assert.deepEqual([...turnstile.hotesTurnstile({}, 'http://localhost:4400/admin')], ['localhost']);

  const appels: { url: string; corps: URLSearchParams }[] = [];
  let reponse: unknown = { success: true, action: 'connexion', hostname: 'app.hopla.page' };
  let statut = 200;
  const siteverify = (async (url: string, init: RequestInit) => {
    appels.push({ url, corps: new URLSearchParams(String(init.body)) });
    return new Response(JSON.stringify(reponse), { status: statut });
  }) as typeof fetch;
  const hotes = turnstile.hotesTurnstile(actif, 'https://app.hopla.page/');
  const demande = (jeton: unknown, ip = '203.0.113.50') => ({ jeton, action: 'connexion' as const, ip, hotes });

  assert.equal(await turnstile.verifierTurnstile(actif, siteverify, demande('jeton-bon')), true);
  assert.equal(appels[0].url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  assert.deepEqual(Object.fromEntries(appels[0].corps), { secret: 'secret', response: 'jeton-bon', remoteip: '203.0.113.50' });

  for (const [r, pourquoi] of [
    [{ success: true, action: 'liste', hostname: 'app.hopla.page' }, 'un jeton pris pour un autre formulaire'],
    [{ success: true, action: 'connexion', hostname: 'localhost' }, 'un jeton pris ailleurs que sur Hopla'],
    [{ success: true, action: 'connexion' }, 'sans nom'],
    [{ success: false, 'error-codes': ['timeout-or-duplicate'] }, 'un jeton déjà servi'],
    [{ success: 'true', action: 'connexion', hostname: 'hopla.page' }, 'un succès qui n’en est pas un'],
  ] as const) {
    reponse = r;
    assert.equal(await turnstile.verifierTurnstile(actif, siteverify, demande('jeton')), false, pourquoi);
  }

  reponse = { success: true, action: 'connexion', hostname: 'hopla.page' };
  statut = 500;
  assert.equal(await turnstile.verifierTurnstile(actif, siteverify, demande('jeton')), false, 'Cloudflare en panne : on refuse');
  statut = 200;
  const injoignable = (async () => { throw new Error('réseau'); }) as unknown as typeof fetch;
  assert.equal(await turnstile.verifierTurnstile(actif, injoignable, demande('jeton')), false, 'injoignable : on refuse');

  const avant = appels.length;
  for (const jeton of ['', 42, null, 'x'.repeat(2049)]) assert.equal(await turnstile.verifierTurnstile(actif, siteverify, demande(jeton)), false);
  assert.equal(appels.length, avant, 'un jeton absent ou trop long ne part pas chez Cloudflare');

  // Trente vérifications par minute depuis une même adresse (un /64 en IPv6).
  const t0 = 50 * JOUR;
  for (let i = 0; i < 30; i++) await turnstile.verifierTurnstile(actif, siteverify, demande('jeton', `2001:db8:5:6::${i + 1}`), t0 + i);
  const n = appels.length;
  assert.equal(await turnstile.verifierTurnstile(actif, siteverify, demande('jeton', '2001:db8:5:6::ff'), t0 + 100), false);
  assert.equal(appels.length, n);

  // Une clé secrète refusée se voit dans les journaux du serveur.
  reponse = { success: false, 'error-codes': ['invalid-input-secret'] };
  assert.equal(await turnstile.verifierTurnstile(actif, siteverify, demande('jeton')), false);
  assert.ok(erreurs.mock.calls.some(c => String(c.arguments[0]).includes('clé secrète')));
});

test('« Rejoins ma liste » ne garde rien sans jeton quand Turnstile est branché', async () => {
  const liste = await import('./liste.ts');
  db.enregistrerBloc(P, validerBloc({ type: 'inscription', titre: 'Rejoins ma liste' }, 'liste'));
  const appels: string[] = [];
  const fetchFaux = (async (url: string) => { appels.push(url); return new Response(JSON.stringify({ success: true, action: 'liste', hostname: 'hopla.page' })); }) as typeof fetch;
  const actif = { TURNSTILE_SITE_KEY: '0xpublique', TURNSTILE_SECRET: 'secret', NODE_ENV: 'production' };
  const ctx = { ip: '198.51.100.20', ua: 'Mozilla/5.0', referent: '', hotes: new Set(['hopla.page', 'app.hopla.page']) };
  const sans = await liste.inscrire(actif, fetchFaux, { page: '', bloc: 'liste', email: 'robot@exemple.fr' }, ctx);
  assert.equal(sans.status, 403);
  assert.equal(appels.length, 0);
  assert.equal(db.resumeContacts(P).total, 0);
  const avec = await liste.inscrire(actif, fetchFaux, { page: '', bloc: 'liste', email: 'camille@exemple.fr', jeton: 'jeton-bon' }, ctx);
  assert.equal(avec.status, 200);
  assert.equal(db.resumeContacts(P).total, 1);
});

test('l’aperçu de site vérifie chaque adresse au moment de se connecter', async () => {
  type Adresse = { address: string; family: number };
  const dns = (adresses: Adresse[]) => ((_hote: string, _options: unknown, rappel: (e: null, a: Adresse[]) => void) => rappel(null, adresses)) as never;
  const resoudre = (lookup: LookupFunction, options: object) => new Promise<{ erreur: NodeJS.ErrnoException | null; adresse: unknown; famille?: number }>(ok => {
    lookup('exemple.fr', options as never, (erreur, adresse, famille) => ok({ erreur, adresse, famille }));
  });

  const unePrivee = await resoudre(resolutionPublique(dns([{ address: '93.184.215.14', family: 4 }, { address: '127.0.0.1', family: 4 }])), {});
  assert.equal(unePrivee.erreur?.code, 'EREFUSEE', 'une seule adresse privée suffit');
  assert.equal((await resoudre(resolutionPublique(dns([{ address: '::ffff:10.0.0.1', family: 6 }])), {})).erreur?.code, 'EREFUSEE');
  assert.equal((await resoudre(resolutionPublique(dns([])), {})).erreur?.code, 'EREFUSEE');
  const publiques = [{ address: '2606:2800:21f:cb07:6820:80da:af6b:8b2c', family: 6 }, { address: '93.184.215.14', family: 4 }];
  assert.deepEqual(await resoudre(resolutionPublique(dns(publiques)), { family: 4 }), { erreur: null, adresse: '93.184.215.14', famille: 4 });
  assert.deepEqual(await resoudre(resolutionPublique(dns(publiques)), { family: 'IPv6' }), { erreur: null, adresse: publiques[0].address, famille: 6 });
  assert.deepEqual(await resoudre(resolutionPublique(dns(publiques)), { all: true }), { erreur: null, adresse: publiques, famille: undefined });
});

test('l’aperçu ne joint ni la machine ni le réseau local, même par un nom', async t => {
  let recues = 0;
  const serveur = createServer((_req, res) => { recues++; res.end('<title>interne</title>'); });
  await new Promise<void>(ok => serveur.listen(0, '127.0.0.1', ok));
  t.after(() => new Promise<void>(ok => serveur.close(() => ok())));
  const port = (serveur.address() as AddressInfo).port;
  await assert.rejects(apercuSite(`http://127.0.0.1:${port}/`), /refusée/);
  await assert.rejects(apercuSite(`http://[::ffff:127.0.0.1]:${port}/`), /refusée/);
  await assert.rejects(apercuSite(`http://2130706433:${port}/`), /refusée/);
  await assert.rejects(apercuSite(`http://localhost:${port}/`));
  await assert.rejects(apercuSite('file:///etc/passwd'), /refusée/);
  assert.equal(recues, 0, 'le serveur local n’a rien reçu');
});
