import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { createLiensServer } from './server.mjs';
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'linkinbio-'));
  await mkdir(join(dir, 'client/assets'), { recursive: true }); await mkdir(join(dir, 'server'));
  await writeFile(join(dir, 'client/assets/a.js'), 'js'); await writeFile(join(dir, 'client/avatar.webp'), 'image');
  await writeFile(join(dir, 'server/server.js'), "export default { fetch: async r => new Response('app ' + new URL(r.url).pathname + ' ' + (r.headers.get('x-real-ip') ?? '-') + ' ' + (r.body ? await r.text() : ''), { headers: { 'content-type': 'text/html', 'set-cookie': 'a=1; Path=/liens' } }) };");
  const server = createLiensServer({ appDir: dir });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(dir, { recursive: true, force: true }); });
  return `http://127.0.0.1:${server.address().port}`;
}
test('la racine et /liens mènent à /liens/, /healthz répond', async t => {
  const url = await fixture(t);
  for (const path of ['/?s=qr', '/liens?s=qr']) { const r = await fetch(url + path, { redirect: 'manual' }); assert.equal(r.status, 308); assert.equal(r.headers.get('location'), '/liens/?s=qr'); }
  assert.equal(await (await fetch(`${url}/healthz`)).text(), 'ok');
  assert.equal((await fetch(`${url}/ailleurs`)).status, 404);
});
test("l'app reçoit l'IP, ses cookies passent, les en-têtes anti-iframe sont posés", async t => {
  const url = await fixture(t);
  const page = await fetch(`${url}/liens/`, { headers: { 'X-Real-IP': '9.9.9.9' } });
  assert.equal(await page.text(), 'app /liens/ 9.9.9.9 '); assert.equal(page.headers.get('set-cookie'), 'a=1; Path=/liens');
  assert.equal(page.headers.get('cache-control'), 'no-store'); assert.equal(page.headers.get('x-frame-options'), 'DENY');
  assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(await (await fetch(`${url}/liens/admin`, { headers: { 'X-Real-IP': 'pas une ip' } })).text(), 'app /liens/admin - ');
  assert.equal(await (await fetch(`${url}/liens/api/evenement`, { method: 'POST', body: 'x' })).text(), 'app /liens/api/evenement - x');
});
test('les fichiers statiques sont servis, sans sortir du dossier', async t => {
  const url = await fixture(t);
  const asset = await fetch(`${url}/liens/assets/a.js`); assert.equal(await asset.text(), 'js'); assert.match(asset.headers.get('cache-control'), /immutable/);
  assert.equal(await (await fetch(`${url}/liens/avatar.webp`)).text(), 'image');
  assert.equal((await fetch(`${url}/liens/assets/absent.js`)).status, 404);
  // fetch() normaliserait le chemin : la requête part telle quelle.
  const raw = await new Promise((ok, ko) => request(url, { path: "/liens/%2e%2e/package.json" }, r => { r.resume(); ok(r.statusCode); }).on('error', ko).end());
  assert.equal(raw, 400);
  assert.equal((await fetch(`${url}/liens/api/evenement`, { method: 'POST', body: 'a'.repeat(3_000_001) })).status, 413);
});
