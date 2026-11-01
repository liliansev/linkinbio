import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { gunzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { sauvegarder } from './sauvegarde.mjs';

/** Un faux stockage S3 : garde les objets envoyés, les liste et les efface. */
async function fauxS3(t, objets = new Map()) {
  const requetes = [];
  const serveur = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    requetes.push({ methode: req.method, chemin: url.pathname, auth: req.headers.authorization ?? '' });
    const cle = decodeURIComponent(url.pathname.replace(/^\/seau\/?/, ''));
    if (req.method === 'PUT') {
      const morceaux = [];
      for await (const m of req) morceaux.push(m);
      objets.set(cle, { corps: Buffer.concat(morceaux), date: new Date() });
      return res.end();
    }
    if (req.method === 'DELETE') { objets.delete(cle); res.statusCode = 204; return res.end(); }
    const prefixe = url.searchParams.get('prefix') ?? '';
    const contenu = [...objets].filter(([k]) => k.startsWith(prefixe))
      .map(([k, o]) => `<Contents><Key>${k}</Key><LastModified>${o.date.toISOString()}</LastModified></Contents>`).join('');
    res.end(`<?xml version="1.0"?><ListBucketResult><IsTruncated>false</IsTruncated>${contenu}</ListBucketResult>`);
  });
  await new Promise(r => serveur.listen(0, '127.0.0.1', r));
  t.after(() => new Promise(r => serveur.close(r)));
  return { endpoint: `http://127.0.0.1:${serveur.address().port}`, objets, requetes };
}

async function baseEssai(t, principal = true) {
  const dossier = await mkdtemp(join(tmpdir(), 'hopla-sauvegarde-'));
  t.after(() => rm(dossier, { recursive: true, force: true }));
  const fichier = join(dossier, 'liens.db');
  const d = new DatabaseSync(fichier);
  d.exec('CREATE TABLE comptes (id TEXT PRIMARY KEY)');
  if (principal) d.exec("INSERT INTO comptes VALUES ('principal')");
  d.close();
  return { dossier, fichier };
}

const env = (endpoint, fichier) => ({
  R2_BACKUP_ENDPOINT: endpoint, R2_BACKUP_BUCKET: 'seau', R2_BACKUP_ACCESS_KEY_ID: 'id', R2_BACKUP_SECRET_ACCESS_KEY: 'secret',
  LIENS_DB: fichier,
});

test('la sauvegarde envoie une copie lisible, signée, et efface les copies trop vieilles', async t => {
  const vieille = new Date(Date.now() - 40 * 86_400_000);
  const s3 = await fauxS3(t, new Map([
    ['hopla/liens-2026-09-01.db.gz', { corps: Buffer.alloc(1), date: vieille }],
    ['hopla/autre-chose.txt', { corps: Buffer.alloc(1), date: vieille }],
  ]));
  const { dossier, fichier } = await baseEssai(t);
  const r = await sauvegarder(env(s3.endpoint, fichier), new Date('2026-11-01T02:30:00Z'));
  assert.equal(r.cle, 'hopla/liens-2026-11-01.db.gz');
  assert.equal(r.effacees, 1);
  assert.deepEqual([...s3.objets.keys()].sort(), ['hopla/autre-chose.txt', 'hopla/liens-2026-11-01.db.gz']);
  // La copie se rouvre et contient le compte principal.
  const copie = join(dossier, 'relue.db');
  const { writeFileSync } = await import('node:fs');
  writeFileSync(copie, gunzipSync(s3.objets.get(r.cle).corps));
  assert.equal(new DatabaseSync(copie, { readOnly: true }).prepare('SELECT id FROM comptes').get().id, 'principal');
  assert.ok(s3.requetes.every(q => q.auth.startsWith('AWS4-HMAC-SHA256 Credential=id/')));
  // Rien ne traîne à côté de la base.
  assert.deepEqual((await readdir(dossier)).sort(), ['liens.db', 'relue.db']);
});

test('une base sans compte principal ne part pas', async t => {
  const s3 = await fauxS3(t);
  const { dossier, fichier } = await baseEssai(t, false);
  await assert.rejects(sauvegarder(env(s3.endpoint, fichier)), /pas de compte principal/);
  assert.equal(s3.objets.size, 0);
  assert.deepEqual(await readdir(dossier), ['liens.db']);
});

test('sans ses variables, la sauvegarde le dit', async () => {
  await assert.rejects(sauvegarder({}), /R2_BACKUP_ENDPOINT, R2_BACKUP_BUCKET/);
});
