import { request } from 'node:https';
import { isIP } from 'node:net';
import { estPrivee, resolutionPublique } from './apercu.ts';

/*
 * Les requêtes des intégrations. L'adresse d'un webhook (Make, Zapier, n8n) est
 * collée par l'utilisateur : elle ne doit jamais viser le serveur lui-même ni
 * son réseau. Elle part donc en https seulement, vers une adresse publique
 * vérifiée au moment de la connexion (`resolutionPublique`, comme l'aperçu des
 * sites), sans suivre de redirection, et la réponse se lit sur 2 Mo au plus.
 * Les API des newsletters, sur des hôtes fixes, gardent le `fetch` ordinaire.
 */

const LIMITE = 2_000_000;
/** Ces réponses n'ont pas de corps (`new Response` refuserait d'en porter un). */
const SANS_CORPS = new Set([204, 205, 304]);

const refus = () => new TypeError('Adresse refusée.');

/** Un `fetch` qui ne se connecte qu'à une adresse publique, en https, sans redirection. */
export function requetePublique(entree: string | URL | Request, init: RequestInit = {}): Promise<Response> {
  let url: URL;
  try { url = new URL(entree instanceof Request ? entree.url : entree); } catch { return Promise.reject(refus()); }
  if (url.protocol !== 'https:' || url.username || url.password) return Promise.reject(refus());
  // Une adresse IP écrite telle quelle ne passe pas par la résolution : elle se vérifie ici.
  const hote = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(hote) && estPrivee(hote)) return Promise.reject(refus());
  const corps = init.body == null ? null : typeof init.body === 'string' ? init.body : init.body instanceof URLSearchParams ? init.body.toString() : undefined;
  if (corps === undefined) return Promise.reject(new TypeError('Corps non pris en charge.'));
  const entetes: Record<string, string> = Object.fromEntries(new Headers(init.headers).entries());
  if (corps !== null) entetes['content-length'] = String(Buffer.byteLength(corps));
  const signal = init.signal ?? undefined;
  return new Promise((ok, ko) => {
    let fini = false;
    const echec = (e: unknown) => { if (!fini) { fini = true; ko(signal?.aborted ? signal.reason : e); } };
    const requete = request(url, { method: init.method ?? 'GET', agent: false, lookup: resolutionPublique(), signal, headers: entetes }, reponse => {
      const morceaux: Buffer[] = [];
      let total = 0;
      reponse.on('data', (morceau: Buffer) => {
        total += morceau.length;
        if (total > LIMITE) reponse.destroy(new Error('Réponse trop lourde.'));
        else morceaux.push(morceau);
      });
      reponse.on('error', echec);
      reponse.on('end', () => {
        if (fini) return;
        const statut = reponse.statusCode ?? 0;
        const entetesReponse = new Headers();
        for (const [nom, valeur] of Object.entries(reponse.headers)) if (valeur !== undefined) entetesReponse.set(nom, Array.isArray(valeur) ? valeur.join(', ') : valeur);
        try {
          const r = new Response(SANS_CORPS.has(statut) ? null : Buffer.concat(morceaux), { status: statut, headers: entetesReponse });
          fini = true;
          ok(r);
        } catch (e) { echec(e); }
      });
      // Coupée en route (délai, connexion perdue) : la réponse se ferme sans finir.
      reponse.on('close', () => { if (!reponse.complete) echec(new Error('Réponse coupée.')); });
    });
    requete.on('error', echec);
    if (corps !== null) requete.write(corps);
    requete.end();
  });
}

/** Les API des newsletters (et Turnstile) : des hôtes fixes, que l'utilisateur ne choisit pas. */
const HOTES_FIXES = /^(api\.brevo\.com|[a-z]{2,4}\d{1,3}\.api\.mailchimp\.com|api\.kit\.com|connect\.mailerlite\.com|api\.beehiiv\.com|api\.systeme\.io|mailcheap\.ai|app\.loops\.so|challenges\.cloudflare\.com)$/;

/** Le transport des intégrations en production : les hôtes fixes par `fetch`, tout le reste par `requetePublique`. */
export const requeteSortante: typeof fetch = (entree, init) => {
  let url: URL;
  try { url = new URL(entree instanceof Request ? entree.url : entree); } catch { return Promise.reject(refus()); }
  return url.protocol === 'https:' && HOTES_FIXES.test(url.hostname) ? fetch(entree, init) : requetePublique(entree, init);
};
