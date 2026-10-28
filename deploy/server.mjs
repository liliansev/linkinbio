import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BlockList, isIP } from 'node:net';
import { createHash } from 'node:crypto';
/* Le serveur de production de Hopla. L'app (TanStack Start) est un simple
   `fetch(Request)`, chargée à la première visite ; ses fichiers statiques
   (scripts, styles, avatar) se servent directement. Deux noms, une seule app :
   les pages sur l'origine publique (hopla.page), le back office sur celle de
   l'admin (app.hopla.page). Chacun renvoie vers l'autre ce qui ne le concerne
   pas. Sur un autre nom (localhost en dev), tout est servi tel quel. */
const origin = (process.env.LIENS_ORIGINE || 'https://hopla.page').replace(/\/+$/, '');
// Une instance auto-hébergée sans adresse de back office le sert sur le même nom (comme src/lib/instance.ts).
const originAdmin = (process.env.LIENS_ORIGINE_ADMIN || (origin === 'https://hopla.page' ? 'https://app.hopla.page' : origin)).replace(/\/+$/, '');
const hostPublic = new URL(origin).host;
const hostAdmin = new URL(originAdmin).host;
/** Les mêmes que `DOMAINES_COURTS` dans src/lib/types.ts. */
const DOMAINES_COURTS = new Set(['hpla.eu', 'hpla.art', 'hpla.pro', 'hpla.store']);
/* Les fichiers de dist/client : les scripts et styles, les icônes, le manifeste.
   robots.txt, sitemap.xml et llms.txt n'y sont pas : l'app les écrit selon le nom
   demandé, et ils passent par ici pour que le back office réponde aussi le sien. */
const STATIQUE = /^\/(assets\/[\w.-]+|[\w-]+\.(webp|png|svg|ico|webmanifest|txt|xml))$/;
/* Les blocs « dernière vidéo » et « newsletter » de la page de Lilian lisent
   l'API de son site. Elle est relayée par le réseau interne (LIENS_SITE, par
   exemple http://liliansevoumian-app:3000) : la page reste sur une seule
   origine, et l'inscription, qui n'accepte que l'origine du site, la reçoit. */
const SITE_PUBLIC = 'https://liliansevoumian.fr';
const DU_SITE = /^\/api\/(newsletter|derniere-video(\/vignette)?)$/;
/** Ce que le back office sert lui-même (et l'API, le serveur MCP) ; le reste (pages, textes légaux) vit sur l'origine publique. */
const DU_BACK_OFFICE = /^\/(admin(\/|$)|_serverFn\/|api\/|assets\/|media\/|mcp$)/;
const appRoot = fileURLToPath(new URL('../dist', import.meta.url));
/* L'instance (src/lib/instance.ts), lue dans l'environnement au démarrage et non au build : une même image sert
   hopla.page ou n'importe quelle instance auto-hébergée. L'app la trouve dans globalThis, posé avant de la charger ;
   le navigateur, dans un script en tête de chaque page HTML. Rien de posé : hopla.page, et aucun script. */
export function instanceDe(env) {
  const valeurs = { origine: env.LIENS_ORIGINE, origineAdmin: env.LIENS_ORIGINE_ADMIN, contact: env.LIENS_CONTACT_LEGAL, editeur: env.LIENS_EDITEUR, hebergeur: env.LIENS_HEBERGEUR, directeur: env.LIENS_DIRECTEUR, depot: env.LIENS_DEPOT_SOURCE };
  return Object.fromEntries(Object.entries(valeurs).filter(([, v]) => v?.trim()));
}
/** Le script qui donne l'instance au navigateur ; `<` échappé, rien ne referme la balise. */
export const scriptInstance = valeurs => Object.keys(valeurs).length ? `<script>globalThis.__HOPLA_INSTANCE__=${JSON.stringify(valeurs).replace(/</g, '\\u003c')}</script>` : '';
const mime = { md: 'text/markdown; charset=utf-8', html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript', json: 'application/json', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif', ico: 'image/x-icon', woff: 'font/woff', woff2: 'font/woff2', webmanifest: 'application/manifest+json', txt: 'text/plain; charset=utf-8', xml: 'application/xml; charset=utf-8' };
const etagOf = bytes => `"${createHash('sha1').update(bytes).digest('base64url').slice(0, 27)}"`;
class HttpError extends Error { constructor(status) { super(`HTTP ${status}`); this.status = status; } }
/* Derrière Cloudflare, Caddy voit une adresse de Cloudflare (X-Real-IP) et celle
   du visiteur arrive dans CF-Connecting-IP. On ne croit cet en-tête que s'il vient
   d'une adresse de Cloudflare (https://www.cloudflare.com/ips/, relevées le
   20 octobre 2026) : n'importe qui d'autre peut l'écrire. Avec
   LIENS_CLOUDFLARE=exclusif, ce qui ne passe pas par Cloudflare est refusé :
   personne ne contourne son pare-feu en visant directement le serveur. */
const CLOUDFLARE = new BlockList();
for (const [type, reseaux] of [
  ['ipv4', ['173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22']],
  ['ipv6', ['2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32']],
]) for (const reseau of reseaux) { const [adresse, bits] = reseau.split('/'); CLOUDFLARE.addSubnet(adresse, Number(bits), type); }
/** Une adresse IP valide, une IPv4 glissée dans une IPv6 remise à plat ; null sinon. */
const adresseIp = valeur => { const ip = typeof valeur === 'string' ? valeur.trim().replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/i, '') : ''; return isIP(ip) ? ip : null; };
export const deCloudflare = ip => { const v = isIP(ip); return v !== 0 && CLOUDFLARE.check(ip, v === 4 ? 'ipv4' : 'ipv6'); };
async function readBody(req, limit) {
  if (Number(req.headers['content-length']) > limit) throw new HttpError(413);
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > limit) throw new HttpError(413); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
/** À n'exposer que derrière Caddy, qui doit écraser X-Real-IP avec l'IP du visiteur. */
export function createLiensServer({ appDir = appRoot, site = process.env.LIENS_SITE, cloudflare = process.env.LIENS_CLOUDFLARE, instance = instanceDe(process.env) } = {}) {
  const exclusif = cloudflare === 'exclusif';
  const enTete = scriptInstance(instance);
  let appPromise;
  /* La documentation (28 octobre 2026) : un site statique, construit à part (documentation/, Next en export) et
     copié dans dist/docs. /docs/mcp se lit dans mcp.html, /docs dans index.html ; l'index de recherche n'a pas
     d'extension. Rien d'autre ne passe : une adresse inconnue reçoit la page 404 de la documentation. */
  async function docs(req, chemin, send) {
    const local = chemin.slice('/docs'.length) || '/';
    if (local !== '/' && local.endsWith('/')) return send(308, '', { Location: `/docs${local.replace(/\/+$/, '')}` });
    const base = await realpath(resolve(appDir, 'docs')).catch(() => null);
    if (!base) return send(404, 'Not found', { 'Cache-Control': 'no-store' });
    const essais = local === '/' ? ['index.html'] : [local.slice(1), `${local.slice(1)}.html`];
    for (const essai of essais) {
      try {
        const filename = await realpath(resolve(base, essai));
        if (!filename.startsWith(base + sep) || !(await stat(filename)).isFile()) continue;
        const bytes = await readFile(filename); const ext = extname(filename).slice(1).toLowerCase();
        const immutable = local.startsWith('/_next/static/');
        return send(200, bytes, {
          'Content-Type': mime[ext] ?? (ext ? 'application/octet-stream' : 'application/json'),
          'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
          ETag: etagOf(bytes),
          ...(ext === 'html' ? { 'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'self'; object-src 'none'", 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin' } : {}),
          ...(ext === 'json' ? { 'Access-Control-Allow-Origin': '*' } : {}),
        });
      } catch (error) { if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error; }
    }
    const introuvable = await readFile(resolve(base, '404.html')).catch(() => Buffer.from('Not found'));
    return send(404, introuvable, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  }
  async function liens(req, url, ip, send, parCloudflare = false) {
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
    if (!appPromise) { globalThis.__HOPLA_INSTANCE__ = instance; appPromise = import(pathToFileURL(resolve(appDir, 'server/server.js')).href); }
    const app = (await appPromise).default;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) if (typeof value === 'string' && !key.startsWith(':')) headers.set(key, value);
    // L'app ne lit que X-Real-IP, déjà démêlée ici ; et le pays, seulement quand c'est bien Cloudflare qui le dit.
    headers.delete('cf-connecting-ip');
    if (!parCloudflare) headers.delete('cf-ipcountry');
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
    let corps = Buffer.from(await response.arrayBuffer());
    if (enTete && /^text\/html/i.test(response.headers.get('content-type') ?? '')) corps = Buffer.from(corps.toString('utf8').replace(/<head(\s[^>]*)?>/i, tete => tete + enTete));
    return send(response.status, corps, out);
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
  const production = process.env.NODE_ENV === 'production';
  const server = createServer((req, res) => {
    function send(status, value = '', headers = {}) {
      const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
      res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...(production ? { 'Strict-Transport-Security': 'max-age=31536000' } : {}), 'Content-Length': bytes.length, ...headers });
      res.end(req.method === 'HEAD' ? undefined : bytes);
    }
    async function handle() {
      if (!req.url?.startsWith('/') || req.url.startsWith('//')) throw new HttpError(400);
      let decoded;
      try { decoded = decodeURIComponent(req.url.split('?')[0]); } catch { throw new HttpError(400); }
      if (decoded.includes('\0') || decoded.includes('\\') || decoded.split('/').some(p => p === '..' || p === '.')) throw new HttpError(400);
      const url = new URL(req.url, origin);
      // L'adresse que Caddy a vue ; derrière Cloudflare, celle du visiteur qu'il transmet.
      const pair = adresseIp(req.headers['x-real-ip']);
      const parCloudflare = pair !== null && deCloudflare(pair);
      const ip = parCloudflare ? adresseIp(req.headers['cf-connecting-ip']) : pair;
      const chemin = url.pathname;
      if (chemin === '/healthz') return send(200, 'ok', { 'Cache-Control': 'no-store' });
      // Sans X-Real-IP, la requête ne vient pas de Caddy mais du réseau interne (le healthcheck) : elle passe.
      if (exclusif && pair && !parCloudflare) return send(403, 'Forbidden', { 'Cache-Control': 'no-store' });
      // Les anciennes adresses, liliansevoumian.fr/liens/... : la page de Lilian est /lilian, le reste garde son chemin.
      if (chemin === '/liens' || chemin === '/liens/') return send(308, '', { Location: `/lilian${url.search}` });
      if (chemin.startsWith('/liens/')) return send(308, '', { Location: `${chemin.slice(6)}${url.search}` });
      // Les pages des fonctions s'appellent fonctionnalités depuis le 26 octobre 2026 (demandé par Lilian) : les anciennes adresses y mènent.
      if (chemin === '/fonctions' || chemin.startsWith('/fonctions/')) {
        return send(301, '', { Location: `/fonctionnalites${chemin.slice(10)}${url.search}`, 'Cache-Control': 'public, max-age=86400' });
      }
      // Les noms courts (hpla.art/camille…) renvoient vers hopla.page, chemin et requête gardés : la page ne vit qu'à un endroit.
      // Cloudflare le fait d'habitude par une règle de redirection ; ceci sert si la requête arrive jusqu'ici.
      if (DOMAINES_COURTS.has((req.headers.host ?? '').toLowerCase().replace(/:\d+$/, '').replace(/^www\./, ''))) {
        return send(301, '', { Location: `${origin}${chemin === '/' ? '' : chemin}${url.search}`, 'Cache-Control': 'public, max-age=86400' });
      }
      // Un seul nom pour les deux (un essai en local) : rien à renvoyer d'un côté à l'autre.
      const host = hostPublic === hostAdmin ? '' : (req.headers.host ?? '').toLowerCase();
      if (host === hostPublic && /^\/admin(\/|$)/.test(chemin)) return send(308, '', { Location: `${originAdmin}${chemin}${url.search}` });
      if (host === hostAdmin && chemin === '/') return send(302, '', { Location: '/admin', 'Cache-Control': 'no-store' });
      if (host === hostAdmin && !DU_BACK_OFFICE.test(chemin) && !STATIQUE.test(chemin)) return send(308, '', { Location: `${origin}${chemin}${url.search}` });
      if (DU_SITE.test(chemin)) return relaisSite(req, url, ip, send);
      if (chemin === '/docs' || chemin.startsWith('/docs/')) return docs(req, chemin, send);
      return liens(req, url, ip, send, parCloudflare);
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
