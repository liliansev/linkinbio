import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isIP } from 'node:net';
import { createHash } from 'node:crypto';
/* Le serveur de production de la page de liens. L'app (TanStack Start) est un
   simple `fetch(Request)`, chargée à la première visite ; ses fichiers statiques
   (scripts, styles, avatar) se servent directement. Tout vit sous BASE, comme
   le `base` de vite.config.ts. */
const BASE = '/liens';
const origin = process.env.LIENS_ORIGINE ?? 'https://liliansevoumian.fr';
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
export function createLiensServer({ appDir = appRoot } = {}) {
  let appPromise;
  async function liens(req, url, ip, send) {
    const local = url.pathname.slice(BASE.length);
    if (/^\/(assets\/[\w.-]+|[\w-]+\.(webp|png|svg|ico))$/.test(local)) {
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
      if (url.pathname === '/healthz') return send(200, 'ok', { 'Cache-Control': 'no-store' });
      if (url.pathname === '/' || url.pathname === BASE) return send(308, '', { Location: `${BASE}/${url.search}` });
      if (url.pathname.startsWith(`${BASE}/`)) return liens(req, url, ip, send);
      return send(404, 'Not found', { 'Cache-Control': 'no-store' });
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
