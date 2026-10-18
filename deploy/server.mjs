import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isIP } from 'node:net';
import { createHash } from 'node:crypto';
/* Le serveur de production de Hopla. L'app (TanStack Start) est un simple
   `fetch(Request)`, chargée à la première visite ; ses fichiers statiques
   (scripts, styles, avatar) se servent directement. Deux noms, une seule app :
   les pages sur l'origine publique (hopla.page), le back office sur celle de
   l'admin (app.hopla.page). Chacun renvoie vers l'autre ce qui ne le concerne
   pas. Sur un autre nom (localhost en dev), tout est servi tel quel. */
const origin = process.env.LIENS_ORIGINE ?? 'https://hopla.page';
const originAdmin = process.env.LIENS_ORIGINE_ADMIN ?? 'https://app.hopla.page';
const hostPublic = new URL(origin).host;
const hostAdmin = new URL(originAdmin).host;
const STATIQUE = /^\/(assets\/[\w.-]+|[\w-]+\.(webp|png|svg|ico))$/;
/* Les blocs « dernière vidéo » et « newsletter » de la page de Lilian lisent
   l'API de son site. Elle est relayée par le réseau interne (LIENS_SITE, par
   exemple http://liliansevoumian-app:3000) : la page reste sur une seule
   origine, et l'inscription, qui n'accepte que l'origine du site, la reçoit. */
const SITE_PUBLIC = 'https://liliansevoumian.fr';
const DU_SITE = /^\/api\/(newsletter|derniere-video(\/vignette)?)$/;
/** Ce que le back office sert lui-même ; le reste (pages, textes légaux) vit sur l'origine publique. */
const DU_BACK_OFFICE = /^\/(admin(\/|$)|_serverFn\/|api\/|assets\/|media\/)/;
const appRoot = fileURLToPath(new URL('../dist', import.meta.url));
const mime = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript', json: 'application/json', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif', ico: 'image/x-icon', woff: 'font/woff', woff2: 'font/woff2' };
const etagOf = bytes => `"${createHash('sha1').update(bytes).digest('base64url').slice(0, 27)}"`;
class HttpError extends Error { constructor(status) { super(`HTTP ${status}`); this.status = status; } }
async function readBody(req, limit) {
  if (Number(req.headers['content-length']) > limit) throw new HttpError(413);
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > limit) throw new HttpError(413); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
/** À n'exposer que derrière Caddy, qui doit écraser X-Real-IP avec l'IP du visiteur. */
export function createLiensServer({ appDir = appRoot, site = process.env.LIENS_SITE } = {}) {
  let appPromise;
  async function liens(req, url, ip, send) {
    const local = url.pathname;
    if (STATIQUE.test(local)) {
      const base = await realpath(resolve(appDir, 'client'));
      try {
        const filename = await realpath(resolve(base, `.${local}`));
        if (filename.startsWith(base + sep) && (await stat(filename)).isFile()) {
          const bytes = await readFile(filename); const ext = extname(filename).slice(1).toLowerCase();
          const immutable = local.startsWith('/assets/');
          return send(200, bytes, { 'Content-Type': mime[ext] ?? 'application/octet-stream', 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=86400', ETag: etagOf(bytes) });
        }
      } catch (error) { if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error; }
      if (local.startsWith('/assets/')) return send(404, 'Not found', { 'Cache-Control': 'no-store' });
    }
    appPromise ??= import(pathToFileURL(resolve(appDir, 'server/server.js')).href);
    const app = (await appPromise).default;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) if (typeof value === 'string' && !key.startsWith(':')) headers.set(key, value);
    if (ip) headers.set('x-real-ip', ip); else headers.delete('x-real-ip');
    const host = /^[\w.-]+(:\d+)?$/.test(req.headers.host ?? '') ? req.headers.host : new URL(origin).host;
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readBody(req, 3_000_000);
    const response = await app.fetch(new Request(`${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://${host}${req.url}`, { method: req.method, headers, body }));
    const out = {};
    response.headers.forEach((value, key) => { if (key !== 'set-cookie' && key !== 'content-length') out[key.replace(/(^|-)\w/g, c => c.toUpperCase())] = value; });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) out['Set-Cookie'] = cookies;
    out['Cache-Control'] ??= 'no-store';
    // La page et le back office ne s'affichent jamais dans le cadre d'un autre site.
    out['Content-Security-Policy'] ??= "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'";
    out['X-Frame-Options'] ??= 'DENY';
    out['Referrer-Policy'] ??= local.startsWith('/admin') ? 'no-referrer' : 'strict-origin-when-cross-origin';
    return send(response.status, Buffer.from(await response.arrayBuffer()), out);
  }
  async function relaisSite(req, url, ip, send) {
    if (!site) return send(404, 'Not found', { 'Cache-Control': 'no-store' });
    const headers = new Headers();
    for (const key of ['user-agent', 'content-type']) if (typeof req.headers[key] === 'string') headers.set(key, req.headers[key]);
    if (req.headers.origin) headers.set('origin', req.headers.origin === origin ? SITE_PUBLIC : req.headers.origin);
    if (ip) headers.set('x-real-ip', ip);
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readBody(req, 4096);
    let response;
    try { response = await fetch(`${site}${url.pathname}${url.search}`, { method: req.method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(10_000) }); }
    catch { throw new HttpError(502); }
    const out = {};
    for (const key of ['content-type', 'cache-control', 'etag', 'allow']) { const v = response.headers.get(key); if (v) out[key.replace(/(^|-)\w/g, c => c.toUpperCase())] = v; }
    return send(response.status, Buffer.from(await response.arrayBuffer()), out);
  }
  const server = createServer((req, res) => {
    function send(status, value = '', headers = {}) {
      const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
      res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Content-Length': bytes.length, ...headers });
      res.end(req.method === 'HEAD' ? undefined : bytes);
    }
    async function handle() {
      if (!req.url?.startsWith('/') || req.url.startsWith('//')) throw new HttpError(400);
      let decoded;
      try { decoded = decodeURIComponent(req.url.split('?')[0]); } catch { throw new HttpError(400); }
      if (decoded.includes('\0') || decoded.includes('\\') || decoded.split('/').some(p => p === '..' || p === '.')) throw new HttpError(400);
      const url = new URL(req.url, origin);
      const ip = typeof req.headers['x-real-ip'] === 'string' && isIP(req.headers['x-real-ip']) ? req.headers['x-real-ip'] : null;
      const chemin = url.pathname;
      if (chemin === '/healthz') return send(200, 'ok', { 'Cache-Control': 'no-store' });
      // Les anciennes adresses, liliansevoumian.fr/liens/... : la page de Lilian est /lilian, le reste garde son chemin.
      if (chemin === '/liens' || chemin === '/liens/') return send(308, '', { Location: `/lilian${url.search}` });
      if (chemin.startsWith('/liens/')) return send(308, '', { Location: `${chemin.slice(6)}${url.search}` });
      // Un seul nom pour les deux (un essai en local) : rien à renvoyer d'un côté à l'autre.
      const host = hostPublic === hostAdmin ? '' : (req.headers.host ?? '').toLowerCase();
      if (host === hostPublic && /^\/admin(\/|$)/.test(chemin)) return send(308, '', { Location: `${originAdmin}${chemin}${url.search}` });
      if (host === hostAdmin && chemin === '/') return send(302, '', { Location: '/admin', 'Cache-Control': 'no-store' });
      if (host === hostAdmin && !DU_BACK_OFFICE.test(chemin) && !STATIQUE.test(chemin)) return send(308, '', { Location: `${origin}${chemin}${url.search}` });
      if (DU_SITE.test(chemin)) return relaisSite(req, url, ip, send);
      return liens(req, url, ip, send);
    }
    handle().catch(error => { if (!res.headersSent) send(error instanceof HttpError ? error.status : 500, error instanceof HttpError ? error.message : 'Internal server error', { 'Cache-Control': 'no-store' }); else res.destroy(); if (!(error instanceof HttpError)) console.error(error); });
  });
  server.requestTimeout = 30_000; server.headersTimeout = 15_000;
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const server = createLiensServer();
  server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Linkinbio server listening'));
  process.once('SIGTERM', () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(1), 10_000).unref(); });
}
