import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, request } from 'node:http';
import { createLiensServer, deCloudflare } from './server.mjs';
async function ecouter(t, server) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  return `http://127.0.0.1:${server.address().port}`;
}
const APP = "export default { fetch: async r => new Response('app ' + new URL(r.url).pathname + ' ' + (r.headers.get('x-real-ip') ?? '-') + ' ' + (r.body ? await r.text() : ''), { headers: { 'content-type': 'text/html', 'set-cookie': 'a=1; Path=/' } }) };";
async function fixture(t, options = {}, app = APP) {
  const dir = await mkdtemp(join(tmpdir(), 'linkinbio-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, 'client/assets'), { recursive: true }); await mkdir(join(dir, 'server'));
  await writeFile(join(dir, 'client/assets/a.js'), 'js'); await writeFile(join(dir, 'client/avatar.webp'), 'image');
  await writeFile(join(dir, 'server/server.js'), app);
  return ecouter(t, createLiensServer({ appDir: dir, ...options }));
}
/** Une requête telle quelle : fetch() normaliserait le chemin et refuserait l'en-tête Host. */
function brut(url, path, headers = {}, method = 'GET') {
  return new Promise((ok, ko) => request(url, { path, headers, method }, r => { let body = ''; r.on('data', c => { body += c; }); r.on('end', () => ok({ status: r.statusCode, location: r.headers.location, body })); }).on('error', ko).end());
}
test('les anciennes adresses /liens mènent à la racine, /healthz répond', async t => {
  const url = await fixture(t);
  for (const [path, location] of [['/liens?s=qr', '/lilian?s=qr'], ['/liens/?s=qr', '/lilian?s=qr'], ['/liens/camille', '/camille'], ['/liens/admin/connexion?jeton=abc', '/admin/connexion?jeton=abc'], ['/liens/media/x.webp', '/media/x.webp']]) {
    const r = await fetch(url + path, { redirect: 'manual' }); assert.equal(r.status, 308, path); assert.equal(r.headers.get('location'), location);
  }
  assert.equal(await (await fetch(`${url}/healthz`)).text(), 'ok');
});
test('les anciennes pages /fonctions mènent aux fonctionnalités', async t => {
  const url = await fixture(t);
  for (const [path, location] of [['/fonctions', '/fonctionnalites'], ['/fonctions/drops?s=ig', '/fonctionnalites/drops?s=ig']]) {
    const r = await fetch(url + path, { redirect: 'manual' }); assert.equal(r.status, 301, path); assert.equal(r.headers.get('location'), location);
  }
});
test('les pages sur hopla.page, le back office sur app.hopla.page', async t => {
  const url = await fixture(t);
  const pub = { host: 'hopla.page' }, adm = { host: 'app.hopla.page' };
  assert.deepEqual(await brut(url, '/admin?paiement=ok', pub), { status: 308, location: 'https://app.hopla.page/admin?paiement=ok', body: '' });
  assert.equal((await brut(url, '/admin/connexion?jeton=abc', pub)).location, 'https://app.hopla.page/admin/connexion?jeton=abc');
  assert.equal((await brut(url, '/camille', pub)).body, 'app /camille - ');
  assert.equal((await brut(url, '/', pub)).body, 'app / - ');
  assert.equal((await brut(url, '/administrateur', pub)).body, 'app /administrateur - ');
  assert.deepEqual(await brut(url, '/', adm), { status: 302, location: '/admin', body: '' });
  assert.equal((await brut(url, '/camille?s=qr', adm)).location, 'https://hopla.page/camille?s=qr');
  assert.equal((await brut(url, '/legal/cgu', adm)).location, 'https://hopla.page/legal/cgu');
  for (const path of ['/admin', '/admin/connexion', '/_serverFn/abc', '/api/export', '/media/x.webp', '/api/v1/page', '/mcp']) assert.equal((await brut(url, path, adm)).status, 200, path);
  assert.equal((await brut(url, '/mcpx', adm)).location, 'https://hopla.page/mcpx');
  assert.equal((await brut(url, '/avatar.webp', adm)).body, 'image');
  // Les noms courts renvoient vers hopla.page, chemin et requête gardés.
  assert.deepEqual(await brut(url, '/camille?s=ig', { host: 'hpla.art' }), { status: 301, location: 'https://hopla.page/camille?s=ig', body: '' });
  assert.equal((await brut(url, '/camille', { host: 'www.hpla.store' })).location, 'https://hopla.page/camille');
  assert.equal((await brut(url, '/', { host: 'HPLA.EU' })).location, 'https://hopla.page');
  // Un autre nom (localhost en dev) : tout est servi tel quel.
  assert.equal((await brut(url, '/admin', { host: 'localhost:4400' })).body, 'app /admin - ');
});
test("l'app reçoit l'IP, ses cookies passent, les en-têtes anti-iframe sont posés", async t => {
  const url = await fixture(t);
  const page = await fetch(`${url}/camille`, { headers: { 'X-Real-IP': '9.9.9.9' } });
  assert.equal(await page.text(), 'app /camille 9.9.9.9 '); assert.equal(page.headers.get('set-cookie'), 'a=1; Path=/');
  assert.equal(page.headers.get('cache-control'), 'no-store'); assert.equal(page.headers.get('x-frame-options'), 'DENY');
  assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  const admin = await fetch(`${url}/admin`, { headers: { 'X-Real-IP': 'pas une ip' } });
  assert.equal(await admin.text(), 'app /admin - '); assert.equal(admin.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(await (await fetch(`${url}/api/evenement`, { method: 'POST', body: 'x' })).text(), 'app /api/evenement - x');
});
test('les fichiers statiques sont servis, sans sortir du dossier', async t => {
  const url = await fixture(t);
  const asset = await fetch(`${url}/assets/a.js`); assert.equal(await asset.text(), 'js'); assert.match(asset.headers.get('cache-control'), /immutable/);
  assert.equal(await (await fetch(`${url}/avatar.webp`)).text(), 'image');
  assert.equal((await fetch(`${url}/assets/absent.js`)).status, 404);
  assert.equal((await brut(url, '/%2e%2e/package.json')).status, 400);
  assert.equal((await fetch(`${url}/api/evenement`, { method: 'POST', body: 'a'.repeat(3_000_001) })).status, 413);
});
test("l'API du site de Lilian est relayée, avec l'origine du site pour la page publique", async t => {
  const recues = [];
  const site = await ecouter(t, createServer((req, res) => {
    let body = ''; req.on('data', c => { body += c; });
    req.on('end', () => { recues.push({ url: req.url, origin: req.headers.origin, ip: req.headers['x-real-ip'], body }); res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': 'pas=1' }); res.end('{"ok":true}'); });
  }));
  const url = await fixture(t, { site });
  const video = await fetch(`${url}/api/derniere-video`, { headers: { 'X-Real-IP': '9.9.9.9' } });
  assert.equal(await video.text(), '{"ok":true}'); assert.equal(video.headers.get('content-type'), 'application/json'); assert.equal(video.headers.get('set-cookie'), null);
  await fetch(`${url}/api/newsletter`, { method: 'POST', headers: { Origin: 'https://hopla.page', 'Content-Type': 'application/json' }, body: '{"email":"a@b.fr"}' });
  await fetch(`${url}/api/newsletter`, { method: 'POST', headers: { Origin: 'https://ailleurs.example' }, body: '{}' });
  assert.deepEqual(recues.map(r => [r.url, r.origin ?? '', r.ip ?? '']), [['/api/derniere-video', '', '9.9.9.9'], ['/api/newsletter', 'https://liliansevoumian.fr', ''], ['/api/newsletter', 'https://ailleurs.example', '']]);
  assert.equal(recues[1].body, '{"email":"a@b.fr"}');
  assert.equal((await fetch(`${url}/api/derniere-video/vignette?v=abc`)).status, 200);
  assert.equal(recues.at(-1).url, '/api/derniere-video/vignette?v=abc');
});
test("sans LIENS_SITE, l'API du site n'existe pas", async t => {
  const url = await fixture(t, { site: undefined });
  assert.equal((await fetch(`${url}/api/derniere-video`)).status, 404);
});
test("derrière Cloudflare, l'IP du visiteur vient de CF-Connecting-IP, que seul Cloudflare peut écrire", async t => {
  const url = await fixture(t);
  const ip = async headers => (await brut(url, '/camille', { host: 'hopla.page', ...headers })).body;
  assert.equal(await ip({ 'x-real-ip': '173.245.48.1', 'cf-connecting-ip': '9.9.9.9' }), 'app /camille 9.9.9.9 ');
  assert.equal(await ip({ 'x-real-ip': '2606:4700::1', 'cf-connecting-ip': '2001:db8::5' }), 'app /camille 2001:db8::5 ');
  assert.equal(await ip({ 'x-real-ip': '::ffff:162.158.1.1', 'cf-connecting-ip': '9.9.9.9' }), 'app /camille 9.9.9.9 ');
  assert.equal(await ip({ 'x-real-ip': '8.8.8.8', 'cf-connecting-ip': '1.1.1.1' }), 'app /camille 8.8.8.8 ', 'hors de Cloudflare, cet en-tête ne compte pas');
  assert.equal(await ip({ 'x-real-ip': '173.245.48.1', 'cf-connecting-ip': 'pas une ip' }), 'app /camille - ');
  assert.equal(await ip({ 'cf-connecting-ip': '1.1.1.1' }), 'app /camille - ');
  for (const [adresse, attendu] of [['104.16.0.1', true], ['2a06:98c0::1', true], ['9.9.9.9', false], ['2001:db8::1', false], ['pas une ip', false]]) assert.equal(deCloudflare(adresse), attendu, adresse);
  // L'app ne lit que X-Real-IP : l'en-tête de Cloudflare ne lui parvient pas.
  const echo = await fixture(t, {}, "export default { fetch: async r => new Response(r.headers.get('cf-connecting-ip') ?? '-') };");
  assert.equal((await brut(echo, '/camille', { host: 'hopla.page', 'x-real-ip': '173.245.48.1', 'cf-connecting-ip': '9.9.9.9' })).body, '-');
  // Le pays du visiteur, seulement quand c'est Cloudflare qui le dit : un visiteur ne le choisit pas en passant à côté.
  const pays = await fixture(t, {}, "export default { fetch: async r => new Response(r.headers.get('cf-ipcountry') ?? '-') };");
  assert.equal((await brut(pays, '/camille', { host: 'hopla.page', 'x-real-ip': '173.245.48.1', 'cf-ipcountry': 'BE' })).body, 'BE');
  assert.equal((await brut(pays, '/camille', { host: 'hopla.page', 'x-real-ip': '8.8.8.8', 'cf-ipcountry': 'BE' })).body, '-');
});
test('avec LIENS_CLOUDFLARE=exclusif, ce qui vient de Caddy sans passer par Cloudflare est refusé', async t => {
  const url = await fixture(t, { cloudflare: 'exclusif' });
  assert.equal((await brut(url, '/camille', { host: 'hopla.page', 'x-real-ip': '8.8.8.8' })).status, 403);
  assert.equal((await brut(url, '/camille', { host: 'hopla.page', 'x-real-ip': '8.8.8.8', 'cf-connecting-ip': '9.9.9.9' })).status, 403);
  assert.equal((await brut(url, '/camille', { host: 'hopla.page', 'x-real-ip': '173.245.48.1', 'cf-connecting-ip': '8.8.8.8' })).body, 'app /camille 8.8.8.8 ');
  assert.equal((await brut(url, '/healthz', { 'x-real-ip': '8.8.8.8' })).body, 'ok', 'le healthcheck répond toujours');
  // Sans X-Real-IP, la requête vient du réseau interne (le contrôle du déploiement) : elle passe.
  assert.equal((await brut(url, '/lilian', { host: 'hopla.page' })).status, 200);
  const ouvert = await fixture(t);
  assert.equal((await brut(ouvert, '/camille', { host: 'hopla.page', 'x-real-ip': '8.8.8.8' })).status, 200, 'sans la variable, rien ne change');
});
test('en production, chaque réponse demande HTTPS (HSTS)', async t => {
  const dev = await fixture(t);
  assert.equal((await fetch(`${dev}/healthz`)).headers.get('strict-transport-security'), null);
  const avant = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  t.after(() => { if (avant === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = avant; });
  const url = await fixture(t);
  for (const chemin of ['/healthz', '/camille', '/assets/a.js', '/liens/camille']) {
    const r = await fetch(url + chemin, { redirect: 'manual' });
    assert.equal(r.headers.get('strict-transport-security'), 'max-age=31536000', chemin);
  }
});
test('la documentation se sert telle quelle sur /docs, une adresse inconnue reçoit sa page 404', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'linkinbio-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, 'server'), { recursive: true }); await mkdir(join(dir, 'docs/_next/static/chunks'), { recursive: true }); await mkdir(join(dir, 'docs/api'));
  await writeFile(join(dir, 'server/server.js'), APP);
  await writeFile(join(dir, 'docs/index.html'), 'accueil'); await writeFile(join(dir, 'docs/mcp.html'), 'mcp'); await writeFile(join(dir, 'docs/404.html'), 'perdu');
  await writeFile(join(dir, 'docs/mcp.txt'), 'rsc'); await writeFile(join(dir, 'docs/api/search'), '{}'); await writeFile(join(dir, 'docs/openapi.json'), '{}');
  await writeFile(join(dir, 'docs/_next/static/chunks/a.js'), 'js');
  const url = await ecouter(t, createLiensServer({ appDir: dir }));
  for (const [path, corps, type] of [['/docs', 'accueil', 'text/html'], ['/docs/mcp', 'mcp', 'text/html'], ['/docs/mcp.txt', 'rsc', 'text/plain'], ['/docs/api/search', '{}', 'application/json'], ['/docs/openapi.json', '{}', 'application/json']]) {
    const r = await fetch(url + path); assert.equal(r.status, 200, path); assert.equal(await r.text(), corps, path); assert.match(r.headers.get('content-type'), new RegExp(type), path);
  }
  const chunk = await fetch(`${url}/docs/_next/static/chunks/a.js`);
  assert.match(chunk.headers.get('cache-control'), /immutable/);
  assert.equal((await fetch(`${url}/docs/mcp`)).headers.get('x-frame-options'), 'DENY');
  const perdu = await fetch(`${url}/docs/nulle-part`); assert.equal(perdu.status, 404); assert.equal(await perdu.text(), 'perdu');
  const barre = await fetch(`${url}/docs/mcp/`, { redirect: 'manual' }); assert.equal(barre.status, 308); assert.equal(barre.headers.get('location'), '/docs/mcp');
  const ancienne = await fetch(`${url}/docs/demarrage`, { redirect: 'manual' }); assert.equal(ancienne.status, 308); assert.equal(ancienne.headers.get('location'), '/docs/quickstart');
  assert.equal((await brut(url, '/docs/%2e%2e/server/server.js')).status, 400);
});
test('sans documentation construite, /docs répond 404 sans passer par l’app', async t => {
  const url = await fixture(t);
  const r = await fetch(`${url}/docs/mcp`); assert.equal(r.status, 404); assert.doesNotMatch(await r.text(), /^app /);
});
test("l'instance se lit au démarrage : l'app la trouve dans globalThis, le navigateur en tête de page", async t => {
  const app = "export default { fetch: async r => new Response(new URL(r.url).pathname === '/x.json' ? '{}' : '<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"utf-8\"></head><body>' + JSON.stringify(globalThis.__HOPLA_INSTANCE__) + '</body></html>', { headers: { 'content-type': new URL(r.url).pathname === '/x.json' ? 'application/json' : 'text/html; charset=utf-8' } }) };";
  const instance = { origine: 'https://liens.example.org', editeur: 'Exemple </script><script>alert(1)' };
  const url = await fixture(t, { instance }, app);
  const page = await (await fetch(`${url}/camille`)).text();
  assert.ok(page.startsWith('<!DOCTYPE html><html lang="fr"><head><script>globalThis.__HOPLA_INSTANCE__={"origine":"https://liens.example.org","editeur":"Exemple \\u003c/script>\\u003cscript>alert(1)"}</script><meta charset="utf-8">'), page);
  assert.ok(page.endsWith(`<body>${JSON.stringify(instance)}</body></html>`), "l'app a reçu l'instance avant d'être chargée");
  assert.equal(await (await fetch(`${url}/x.json`)).text(), '{}', 'seul le HTML reçoit le script');
});
test("sans rien de posé, l'instance est hopla.page et aucune page ne change", async t => {
  const { instanceDe, scriptInstance } = await import('./server.mjs');
  assert.deepEqual(instanceDe({ LIENS_ORIGINE: ' ', PORT: '3000', LIENS_DIRECTEUR: 'Camille' }), { directeur: 'Camille' });
  assert.equal(scriptInstance(instanceDe({})), '');
});
