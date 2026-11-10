import test from 'node:test';
import assert from 'node:assert/strict';

process.env.LIENS_DB = ':memory:';
const db = await import('./db.ts');
const { brancher, verifier, retirer, compteDeHote, domaineActif, etatDomaine, cibleDomaines, dnsEnPlace, hoteActif, pageDuCompte } = await import('./domaines.ts');
type Resolveur = import('./domaines.ts').Resolveur;

test.beforeEach(() => { db.fermer(); });

/** Une instance qui sert les noms de domaine, sans paiement : chaque compte a tout. */
const ENV = { LIENS_DOMAINES: 'cname.hopla.page' };
/** La même avec Creem : le nom de domaine demande Premium. */
const PAYANT = { ...ENV, CREEM_API_KEY: 'creem_test_x', CREEM_WEBHOOK_SECRET: 'whsec_x' };
const dns = (cname: Record<string, string[]> = {}, txt: Record<string, string[][]> = {}): Resolveur => ({
  cname: async h => cname[h] ?? Promise.reject(new Error('ENODATA')),
  txt: async h => txt[h] ?? Promise.reject(new Error('ENODATA')),
});

test('sans LIENS_DOMAINES, tout dort', async () => {
  const c = db.creerCompte('marie@exemple.fr', 'marie');
  assert.equal(cibleDomaines({}), null);
  assert.equal(cibleDomaines({ LIENS_DOMAINES: 'pas un nom' }), null);
  assert.deepEqual(await brancher(c, 'liens.marie.fr', {}), { ok: false, refus: 'ferme' });
  db.poserDomaine(c.id, 'liens.marie.fr'); db.noterDomaine(c.id, 'actif', '');
  assert.equal(compteDeHote('liens.marie.fr', {}), null);
  assert.equal(domaineActif(c, {}), '');
  assert.equal(etatDomaine(c.id, {}), null);
});

test('un nom se relie, se vérifie par son CNAME, répond, puis se retire', async () => {
  const c = db.creerCompte('marie@exemple.fr', 'marie');
  assert.deepEqual(await brancher(c, 'pas un nom', ENV), { ok: false, refus: 'nom' });
  assert.deepEqual(await brancher(c, 'abc.cname.hopla.page', ENV), { ok: false, refus: 'nom' });
  assert.deepEqual(await brancher(c, 'https://Liens.Marie.fr/', ENV), { ok: true });
  assert.deepEqual(etatDomaine(c.id, ENV), { hote: 'liens.marie.fr', etat: 'attente', cible: `${c.id}.cname.hopla.page`, texte: { nom: '_hopla.liens.marie.fr', valeur: `hopla=${c.id}` } });
  // Posé, pas encore vérifié : le nom est connu, mais ne montre rien.
  assert.deepEqual(compteDeHote('liens.marie.fr', ENV), { ailleurs: db.compteParId(c.id) });
  assert.equal(hoteActif('liens.marie.fr', ENV), false);

  // Un CNAME vers le nom d'un autre compte, ou vers la cible nue, ne prouve rien.
  assert.equal((await verifier(c, ENV, { resolveur: dns({ 'liens.marie.fr': ['autre.cname.hopla.page'] }) }))?.etat, 'attente');
  assert.equal((await verifier(c, ENV, { resolveur: dns({ 'liens.marie.fr': ['cname.hopla.page'] }) }))?.etat, 'attente');
  assert.equal((await verifier(c, ENV, { resolveur: dns({ 'liens.marie.fr': [`${c.id}.CNAME.hopla.page.`] }) }))?.etat, 'actif');
  assert.deepEqual(compteDeHote('LIENS.marie.fr:443', ENV), { page: db.compteParId(c.id) });
  assert.equal(hoteActif('liens.marie.fr', ENV), true);
  assert.deepEqual(pageDuCompte(db.compteParId(c.id)!, ENV), { pseudo: 'marie', principal: false, domaine: 'liens.marie.fr' });

  // Le DNS a changé : le nom ne répond plus.
  assert.equal((await verifier(c, ENV, { resolveur: dns() }))?.etat, 'attente');
  assert.equal(domaineActif(db.compteParId(c.id)!, ENV), '');

  await retirer(c.id, ENV);
  assert.equal(compteDeHote('liens.marie.fr', ENV), null);
  assert.equal(await verifier(c, ENV, { resolveur: dns() }), null);
});

test('un domaine racine se prouve par son TXT', async () => {
  const c = db.creerCompte('marie@exemple.fr', 'marie');
  assert.equal(await dnsEnPlace('marie.fr', c.id, 'cname.hopla.page', dns({}, { '_hopla.marie.fr': [['autre chose'], ['hopla=', c.id]] })), true);
  assert.equal(await dnsEnPlace('marie.fr', c.id, 'cname.hopla.page', dns({}, { '_hopla.marie.fr': [['hopla=un-autre']] })), false);
});

test('un nom n’est qu’à une page, et suit le compte', async () => {
  const marie = db.creerCompte('marie@exemple.fr', 'marie'), paul = db.creerCompte('paul@exemple.fr', 'paul');
  await brancher(marie, 'liens.marie.fr', ENV);
  assert.deepEqual(await brancher(paul, 'liens.marie.fr', ENV), { ok: false, refus: 'pris' });
  // Changer de nom libère l'ancien.
  assert.deepEqual(await brancher(marie, 'page.marie.fr', ENV), { ok: true });
  assert.deepEqual(await brancher(paul, 'liens.marie.fr', ENV), { ok: true });
  await verifier(marie, ENV, { resolveur: dns({ 'page.marie.fr': [`${marie.id}.cname.hopla.page`] }) });
  // Suspendu, le compte ne montre plus rien sur son nom ; supprimé, le nom est libre.
  db.changerStatut(marie.id, 'suspendu');
  assert.deepEqual(compteDeHote('page.marie.fr', ENV), { ailleurs: null });
  db.changerStatut(marie.id, 'actif');
  db.supprimerCompte(marie.id);
  assert.equal(db.domaineParHote('page.marie.fr'), undefined);
});

test('avec le paiement, le nom de domaine demande Premium, et se tait quand l’offre s’en va', async () => {
  const c = db.creerCompte('marie@exemple.fr', 'marie');
  assert.deepEqual(await brancher(c, 'liens.marie.fr', PAYANT), { ok: false, refus: 'offre' });
  db.offrir(c.id, 'premium', null);
  const premium = db.compteParId(c.id)!;
  assert.deepEqual(await brancher(premium, 'liens.marie.fr', PAYANT), { ok: true });
  await verifier(premium, PAYANT, { resolveur: dns({ 'liens.marie.fr': [`${c.id}.cname.hopla.page`] }) });
  assert.equal(domaineActif(premium, PAYANT), 'liens.marie.fr');
  db.retirerOffre(c.id); db.retirerEssai(c.id);
  // L'offre partie, le nom reste posé mais renvoie à la page sur hopla.page.
  assert.deepEqual(compteDeHote('liens.marie.fr', PAYANT), { ailleurs: db.compteParId(c.id) });
});

test('derrière Cloudflare, le nom vérifié est déclaré, attend son certificat, puis est retiré', async () => {
  const c = db.creerCompte('marie@exemple.fr', 'marie');
  const CF = { ...ENV, LIENS_CF_JETON: 'jeton', LIENS_CF_ZONE: 'a'.repeat(32) };
  const appels: string[] = [];
  let ssl = 'pending_validation';
  let connu = false;
  const requete = (async (url: string | URL | Request, init?: RequestInit) => {
    const methode = init?.method ?? 'GET';
    appels.push(`${methode} ${String(url).replace(`https://api.cloudflare.com/client/v4/zones/${'a'.repeat(32)}/custom_hostnames`, '')}`);
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer jeton');
    const nom = { id: 'cf1', hostname: 'liens.marie.fr', status: ssl === 'active' ? 'active' : 'pending', ssl: { status: ssl } };
    if (methode === 'GET') return Response.json({ success: true, result: connu ? [nom] : [] });
    if (methode === 'POST') { assert.deepEqual(JSON.parse(String(init?.body)), { hostname: 'liens.marie.fr', ssl: { method: 'http', type: 'dv' } }); connu = true; return Response.json({ success: true, result: nom }); }
    return Response.json({ success: true, result: { id: 'cf1' } });
  }) as typeof fetch;
  const resolveur = dns({ 'liens.marie.fr': [`${c.id}.cname.hopla.page`] });
  await brancher(c, 'liens.marie.fr', CF, requete);
  // Tant que le DNS n'y est pas, rien n'est demandé à Cloudflare.
  await verifier(c, CF, { resolveur: dns(), requete });
  assert.deepEqual(appels, []);
  assert.equal((await verifier(c, CF, { resolveur, requete }))?.etat, 'certificat');
  assert.deepEqual(appels, ['GET ?hostname=liens.marie.fr', 'POST ']);
  assert.equal(hoteActif('liens.marie.fr', CF), false);
  ssl = 'active';
  assert.equal((await verifier(c, CF, { resolveur, requete }))?.etat, 'actif');
  assert.equal(db.domaineDuCompte(c.id)?.cf, 'cf1');
  await retirer(c.id, CF, requete);
  assert.equal(appels.at(-1), 'DELETE /cf1');
  assert.equal(db.domaineDuCompte(c.id), undefined);

  // Cloudflare en panne : la vérification échoue, le nom garde son état.
  await brancher(c, 'liens.marie.fr', CF, requete);
  await assert.rejects(verifier(c, CF, { resolveur, requete: (async () => new Response('non', { status: 500 })) as typeof fetch }), /Cloudflare 500/);
  assert.equal(db.domaineDuCompte(c.id)?.etat, 'attente');
});
