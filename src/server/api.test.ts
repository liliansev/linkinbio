import test from 'node:test';
import assert from 'node:assert/strict';

process.env.LIENS_DB = ':memory:';
const db = await import('./db.ts');
const { nouvelleCle, repondreApi } = await import('./api.ts');
const { repondreMcp } = await import('./mcp.ts');
const { VERSION_CGU } = await import('../lib/legal.ts');

/* Avec Creem branché, les offres comptent : sans lui, tout serait permis. */
const ENV = { CREEM_API_KEY: 'creem_test_x', CREEM_WEBHOOK_SECRET: 'whsec_test' };

test.beforeEach(() => { db.fermer(); });

/** Un compte qui a accepté les CGU, à l'essai de Pro (comme à l'inscription), et une clé. */
function compteAvecCle(pseudo: string, o: { ecriture?: boolean; gratuit?: boolean } = {}) {
  const c = db.creerCompte(`${pseudo}@exemple.fr`, pseudo);
  db.accepterCgu(c.id, VERSION_CGU);
  if (o.gratuit) db.retirerEssai(c.id);
  const neuve = nouvelleCle();
  db.ajouterCleApi(c.id, { nom: 'Test', hash: neuve.hash, debut: neuve.debut, ecriture: o.ecriture ?? true });
  return { id: c.id, cle: neuve.cle };
}

const appel = (cle: string | null, methode: string, chemin: string, corps?: unknown) => repondreApi(new Request(`https://app.hopla.page/api/v1${chemin}`, {
  method: methode,
  headers: { ...(cle ? { authorization: `Bearer ${cle}` } : {}), 'content-type': 'application/json', 'x-real-ip': '203.0.113.7' },
  body: corps === undefined ? undefined : JSON.stringify(corps),
}), ENV);

const mcp = (cle: string, message: unknown) => repondreMcp(new Request('https://app.hopla.page/mcp', {
  method: 'POST', headers: { authorization: `Bearer ${cle}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: JSON.stringify(message),
}), ENV);

const LECTURE_MCP = ['lire_page', 'lister_themes', 'lire_stats', 'lire_compte', 'lire_semaine', 'lire_resume', 'lire_liste', 'lister_inscrits',
  'lire_qr_code', 'lire_site', 'lire_flux', 'lire_note_avis', 'lister_reseaux', 'lister_pictos', 'lister_types', 'lister_cles'];

/** Une petite image PNG (1 × 1), pour les envois. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test('une clé neuve : le préfixe, 32 caractères tirés au hasard, seule son empreinte est gardée', () => {
  const a = nouvelleCle(), b = nouvelleCle();
  assert.match(a.cle, /^hopla_[\w-]{32}$/);
  assert.notEqual(a.cle, b.cle);
  assert.equal(a.hash.length, 64);
  assert.ok(!a.hash.includes(a.cle));
  assert.equal(a.debut, a.cle.slice(0, 10));
});

test('la documentation se lit sans clé ; le reste demande une clé valide', async () => {
  const doc = await appel(null, 'GET', '');
  assert.equal(doc.status, 200);
  assert.match(await doc.text(), /# API et serveur MCP de Hopla/);
  assert.equal((await appel(null, 'GET', '/page')).status, 401);
  const fausse = await appel('hopla_' + 'x'.repeat(32), 'GET', '/page');
  assert.equal(fausse.status, 401);
  assert.equal((await fausse.json()).erreur.code, 'cle_invalide');
});

test('une clé lit et modifie la page de son compte, et seulement elle', async () => {
  const camille = compteAvecCle('camille');
  const autre = compteAvecCle('bastien');
  const page = await (await appel(camille.cle, 'GET', '/page')).json();
  assert.equal(page.page.pseudo, 'camille');
  assert.equal(page.page.adresse, 'https://hopla.page/camille');
  assert.equal(page.page.offre, 'pro');

  const r = await appel(camille.cle, 'PATCH', '/reglages', { profil: { bio: 'Coach à Lyon', badge: true }, theme: 'onyx' });
  assert.equal(r.status, 200);
  const reglages = db.lireReglages(camille.id);
  assert.equal(reglages.profil.bio, 'Coach à Lyon');
  assert.equal(reglages.profil.badge, false, 'le badge vérifié reste au compte principal');
  assert.equal(reglages.theme, 'onyx');
  assert.equal(reglages.profil.nom, page.reglages.profil.nom, 'le reste du profil est gardé');
  assert.equal((await appel(camille.cle, 'PATCH', '/reglages', { theme: 'inexistant' })).status, 400);

  const cree = await appel(camille.cle, 'POST', '/blocs', { type: 'lien', titre: 'Mon podcast', url: 'exemple.fr/podcast' });
  assert.equal(cree.status, 201);
  const { bloc } = await cree.json();
  assert.equal(bloc.url, 'https://exemple.fr/podcast');
  assert.equal(db.lireBlocs(camille.id)[0].id, bloc.id);
  // Le bloc de Camille n'existe pas pour une autre clé.
  assert.equal((await appel(autre.cle, 'GET', `/blocs/${bloc.id}`)).status, 404);
  assert.equal((await appel(autre.cle, 'PATCH', `/blocs/${bloc.id}`, { titre: 'Volé' })).status, 404);
  assert.equal((await appel(autre.cle, 'DELETE', `/blocs/${bloc.id}`)).status, 404);
  assert.equal(db.lireBlocs(camille.id)[0].titre, 'Mon podcast');

  const modifie = await (await appel(camille.cle, 'PATCH', `/blocs/${bloc.id}`, { public: false, type: 'produit' })).json();
  assert.equal(modifie.bloc.public, false);
  assert.equal(modifie.bloc.type, 'lien', 'le type ne change pas');
  assert.equal(modifie.bloc.titre, 'Mon podcast');

  assert.equal((await appel(camille.cle, 'POST', '/blocs', { type: 'newsletter', titre: 'x' })).status, 400, 'les blocs de Lilian restent à Lilian');
  assert.equal((await appel(camille.cle, 'DELETE', `/blocs/${bloc.id}`)).status, 200);
  assert.ok(!db.lireBlocs(camille.id).some(b => b.id === bloc.id));
});

test('l’ordre : tous les blocs, chacun une fois ; une position à l’ajout', async () => {
  const { cle, id } = compteAvecCle('dora');
  for (const titre of ['Un', 'Deux', 'Trois']) await appel(cle, 'POST', '/blocs', { titre, url: 'exemple.fr' });
  const ids = db.lireBlocs(id).map(b => b.id);
  assert.equal((await appel(cle, 'PUT', '/ordre', { ids: ids.slice(1) })).status, 400);
  assert.equal((await appel(cle, 'PUT', '/ordre', { ids: [ids[0], ids[0], ids[1]] })).status, 400);
  const r = await (await appel(cle, 'PUT', '/ordre', { ids: [...ids].reverse() })).json();
  assert.deepEqual(r.blocs.map((b: { id: string }) => b.id), [...ids].reverse());
  const { bloc } = await (await appel(cle, 'POST', '/blocs', { titre: 'Au milieu', url: 'exemple.fr', position: 1 })).json();
  assert.equal(db.lireBlocs(id)[1].id, bloc.id);
});

test('une clé en lecture seule lit, et ne modifie rien', async () => {
  const { cle } = compteAvecCle('elise', { ecriture: false });
  assert.equal((await appel(cle, 'GET', '/blocs')).status, 200);
  const r = await appel(cle, 'POST', '/blocs', { titre: 'Non', url: 'exemple.fr' });
  assert.equal(r.status, 403);
  assert.equal((await r.json()).erreur.code, 'lecture_seule');
});

test('sans Pro, la clé s’arrête ; elle reprend avec l’offre', async () => {
  const { cle, id } = compteAvecCle('farid', { gratuit: true });
  const r = await appel(cle, 'GET', '/page');
  assert.equal(r.status, 403);
  assert.equal((await r.json()).erreur.code, 'offre');
  db.offrir(id, 'pro', null);
  assert.equal((await appel(cle, 'GET', '/page')).status, 200);
});

test('une clé révoquée, un compte suspendu ou supprimé ne passent plus', async () => {
  const { cle, id } = compteAvecCle('gael');
  const [infos] = db.clesApi(id);
  db.changerStatut(id, 'suspendu');
  assert.equal((await appel(cle, 'GET', '/page')).status, 403);
  db.changerStatut(id, 'actif');
  assert.equal(db.revoquerCleApi('principal', infos.id), false, 'un autre compte ne révoque pas la clé');
  assert.equal(db.revoquerCleApi(id, infos.id), true);
  assert.equal((await appel(cle, 'GET', '/page')).status, 401);
  const autre = compteAvecCle('gaelle');
  db.supprimerCompte(autre.id);
  assert.equal((await appel(autre.cle, 'GET', '/page')).status, 401);
});

test('les stats : une période permise, refusée sinon', async () => {
  const { cle } = compteAvecCle('hugo');
  const r = await (await appel(cle, 'GET', '/stats?periode=7')).json();
  assert.equal(r.stats.jours, 7);
  assert.equal((await appel(cle, 'GET', '/stats?periode=8')).status, 400);
  assert.equal((await appel(cle, 'GET', '/stats?du=2026-10-01&au=2026-10-03')).status, 200);
});

test('les adresses inconnues et les méthodes refusées', async () => {
  const { cle } = compteAvecCle('ines');
  assert.equal((await appel(cle, 'GET', '/rien')).status, 404);
  assert.equal((await appel(cle, 'DELETE', '/page')).status, 405);
  assert.equal((await appel(cle, 'PATCH', '/reglages', {})).status, 400);
  const options = await appel(null, 'OPTIONS', '/page');
  assert.equal(options.status, 204);
  assert.equal(options.headers.get('access-control-allow-origin'), '*');
});

test('dix clés au plus par compte', () => {
  const { id } = compteAvecCle('jade');
  for (let i = 1; i < db.MAX_CLES_API; i++) { const n = nouvelleCle(); db.ajouterCleApi(id, { nom: `${i}`, hash: n.hash, debut: n.debut, ecriture: true }); }
  const n = nouvelleCle();
  assert.throws(() => db.ajouterCleApi(id, { nom: 'de trop', hash: n.hash, debut: n.debut, ecriture: true }), /10 clés au plus/);
});

test('le serveur MCP : initialisation, outils, appels', async () => {
  const { cle, id } = compteAvecCle('karim');
  const init = await (await mcp(cle, { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } } })).json();
  assert.equal(init.result.protocolVersion, '2025-06-18');
  assert.equal(init.result.serverInfo.name, 'hopla');
  assert.ok(init.result.capabilities.tools);

  assert.equal((await mcp(cle, { jsonrpc: '2.0', method: 'notifications/initialized' })).status, 202);

  const liste = await (await mcp(cle, { jsonrpc: '2.0', id: 2, method: 'tools/list' })).json();
  const noms = liste.result.tools.map((t: { name: string }) => t.name);
  assert.deepEqual(noms, [...LECTURE_MCP, 'modifier_reglages', 'ajouter_bloc', 'modifier_bloc', 'supprimer_bloc', 'ordonner_blocs',
    'dupliquer_bloc', 'envoyer_image', 'supprimer_inscrit', 'envoyer_inscrits']);
  for (const t of liste.result.tools) { assert.equal(t.inputSchema.type, 'object'); assert.ok(!('appeler' in t)); }

  const ajout = await (await mcp(cle, { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'ajouter_bloc', arguments: { titre: 'Par Claude', url: 'exemple.fr' } } })).json();
  assert.equal(ajout.result.isError, undefined);
  assert.equal(ajout.result.structuredContent.bloc.titre, 'Par Claude');
  assert.equal(JSON.parse(ajout.result.content[0].text).bloc.titre, 'Par Claude');
  assert.equal(db.lireBlocs(id)[0].titre, 'Par Claude');

  const raté = await (await mcp(cle, { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'supprimer_bloc', arguments: { id: 'inconnu' } } })).json();
  assert.equal(raté.result.isError, true);

  const lot = await (await mcp(cle, [{ jsonrpc: '2.0', id: 5, method: 'ping' }, { jsonrpc: '2.0', id: 6, method: 'inconnue' }])).json();
  assert.deepEqual(lot[0], { jsonrpc: '2.0', id: 5, result: {} });
  assert.equal(lot[1].error.code, -32601);

  const sansCle = await repondreMcp(new Request('https://app.hopla.page/mcp', { method: 'POST', body: '{}' }), ENV);
  assert.equal(sansCle.status, 401);
  assert.match(sansCle.headers.get('www-authenticate') ?? '', /Bearer/);
  assert.equal((await repondreMcp(new Request('https://app.hopla.page/mcp'), ENV)).status, 405);
});

test('le serveur MCP en lecture seule ne propose que la lecture', async () => {
  const { cle } = compteAvecCle('lena', { ecriture: false });
  const liste = await (await mcp(cle, { jsonrpc: '2.0', id: 1, method: 'tools/list' })).json();
  assert.deepEqual(liste.result.tools.map((t: { name: string }) => t.name), LECTURE_MCP);
  const r = await (await mcp(cle, { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'ajouter_bloc', arguments: { titre: 'Non' } } })).json();
  assert.equal(r.result.isError, true);
  assert.match(r.result.content[0].text, /lecture seule/);
});

test('le compte, les réglages, les listes de référence', async () => {
  const { cle } = compteAvecCle('mona');
  const { compte } = await (await appel(cle, 'GET', '/compte')).json();
  assert.equal(compte.pseudo, 'mona');
  assert.equal(compte.offre, 'pro');
  assert.ok(compte.essai.jusqu);
  assert.deepEqual(compte.fonctions.api, { incluse: true, offre: 'pro' });
  assert.equal(compte.historiqueStats, 365);
  const { reglages } = await (await appel(cle, 'GET', '/reglages')).json();
  assert.ok('profil' in reglages && 'theme' in reglages);
  const { reseaux } = await (await appel(cle, 'GET', '/reseaux')).json();
  assert.deepEqual(reseaux.find((r: { id: string }) => r.id === 'linkedin'), { id: 'linkedin', nom: 'LinkedIn' });
  const { pictos } = await (await appel(cle, 'GET', '/pictos')).json();
  assert.ok(pictos.some((p: { nom: string }) => p.nom === 'micro'));
  const { types } = await (await appel(cle, 'GET', '/types')).json();
  assert.ok(types.includes('lien') && !types.includes('newsletter'));
  const { cles } = await (await appel(cle, 'GET', '/cles')).json();
  assert.equal(cles.length, 1);
  assert.equal(cles[0].courante, true);
  assert.ok(!JSON.stringify(cles).includes(cle));
});

test('le QR code, en SVG ou en PNG', async () => {
  const { cle } = compteAvecCle('noor');
  const svg = await appel(cle, 'GET', '/qr');
  assert.equal(svg.headers.get('content-type'), 'image/svg+xml');
  assert.match(await svg.text(), /^<svg/);
  const png = await appel(cle, 'GET', '/qr?format=png&taille=300');
  assert.equal(png.headers.get('content-type'), 'image/png');
  assert.equal(Buffer.from(await png.arrayBuffer()).subarray(1, 4).toString(), 'PNG');
});

test('dupliquer un bloc : la copie juste sous lui, masquée si demandé', async () => {
  const { cle, id } = compteAvecCle('olga');
  const a = (await (await appel(cle, 'POST', '/blocs', { titre: 'A', url: 'https://a.fr' })).json()).bloc;
  await appel(cle, 'POST', '/blocs', { titre: 'B', url: 'https://b.fr', position: 1 });
  const r = await appel(cle, 'POST', `/blocs/${a.id}/dupliquer`, { masquer: true });
  assert.equal(r.status, 201);
  const copie = (await r.json()).bloc;
  assert.notEqual(copie.id, a.id);
  assert.equal(copie.public, false);
  assert.deepEqual(db.lireBlocs(id).map(b => b.titre), ['A', 'A', 'B']);
  assert.equal((await appel(cle, 'POST', '/blocs/inconnu/dupliquer')).status, 404);
});

test('envoyer une image : brute ou en data URL ; un autre format est refusé', async () => {
  const { cle, id } = compteAvecCle('pia');
  const brute = await repondreApi(new Request('https://app.hopla.page/api/v1/medias', {
    method: 'POST', headers: { authorization: `Bearer ${cle}`, 'content-type': 'image/png' }, body: PNG,
  }), ENV);
  assert.equal(brute.status, 201);
  const { media } = await brute.json();
  assert.match(media.chemin, /^\/media\/[\w-]+\.png$/);
  assert.equal(media.url, `https://hopla.page${media.chemin}`);
  const enData = await appel(cle, 'POST', '/medias', { image: `data:image/png;base64,${PNG.toString('base64')}` });
  assert.equal(enData.status, 201);
  // L'adresse rendue se pose en avatar.
  await appel(cle, 'PATCH', '/reglages', { profil: { avatar: media.chemin } });
  assert.equal(db.lireReglages(id).profil.avatar, media.chemin);
  const gif = await appel(cle, 'POST', '/medias', { image: 'data:image/png;base64,' + Buffer.from('GIF89a').toString('base64') });
  assert.equal(gif.status, 415);
  assert.equal((await appel(cle, 'POST', '/medias', {})).status, 400);
});

test('les stats de la semaine (toutes les offres) et le résumé', async () => {
  const { cle } = compteAvecCle('quentin');
  const { semaine } = await (await appel(cle, 'GET', '/stats/semaine')).json();
  assert.deepEqual(semaine, { vues: 0, avant: 0, dejaVue: false });
  const { resume } = await (await appel(cle, 'GET', '/stats/resume?periode=7')).json();
  assert.equal(typeof resume.phrase, 'string');
  assert.ok(Array.isArray(resume.faits));
  assert.equal(resume.jours, 7);
  assert.equal((await appel(cle, 'GET', '/stats/resume?periode=8')).status, 400);
});

test('une adresse que la validation écarte est refusée, pas enregistrée vide', async () => {
  const { cle } = compteAvecCle('adresses');
  const r = await appel(cle, 'POST', '/blocs', { type: 'lien', titre: 'Mon site', url: 'pas une adresse' });
  assert.equal(r.status, 400);
  assert.equal((await r.json()).erreur.code, 'adresse_invalide');
  const { bloc } = await (await appel(cle, 'POST', '/blocs', { type: 'lien', titre: 'Mon site', url: 'example.com' })).json();
  assert.equal(bloc.url, 'https://example.com/');
  assert.equal((await appel(cle, 'PATCH', `/blocs/${bloc.id}`, { url: 'javascript:alert(1)' })).status, 400);
  const gif = await appel(cle, 'POST', '/medias', { image: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' });
  assert.equal(gif.status, 415);
});

test('une image en data URL passe au-delà des 256 Ko d’un corps JSON, jusqu’à 1,5 Mo', async () => {
  const { cle } = compteAvecCle('grande-image');
  const grosse = Buffer.concat([PNG, Buffer.alloc(600_000)]);
  const r = await appel(cle, 'POST', '/medias', { image: 'data:image/png;base64,' + grosse.toString('base64') });
  assert.equal(r.status, 201);
  const reponse = await mcp(cle, { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'envoyer_image', arguments: { image: 'data:image/png;base64,' + grosse.toString('base64') } } });
  assert.equal((await reponse.json()).result.isError, undefined);
});

test('la liste e-mail : le résumé, les inscrits par pages, en CSV, la suppression', async () => {
  const { cle, id } = compteAvecCle('rose');
  for (const [i, email] of ['a@exemple.fr', 'b@exemple.fr', 'c@exemple.fr'].entries()) {
    db.ajouterContact(id, { email, prenom: i === 1 ? 'Bea, "B"' : '', source: 'instagram', bloc: '' }, Date.now() - i * 1000);
  }
  const { liste } = await (await appel(cle, 'GET', '/liste')).json();
  assert.deepEqual(liste, { inscrits: 3, semaine: 3, enAttente: 3, branchee: null });
  const page = await (await appel(cle, 'GET', '/inscrits?limite=2')).json();
  assert.deepEqual(page.inscrits.map((c: { email: string }) => c.email), ['a@exemple.fr', 'b@exemple.fr']);
  assert.equal(page.total, 3);
  assert.equal(page.suivant, 2);
  const fin = await (await appel(cle, 'GET', '/inscrits?limite=2&depart=2')).json();
  assert.equal(fin.suivant, null);
  const csv = await appel(cle, 'GET', '/inscrits?format=csv');
  assert.match(csv.headers.get('content-type') ?? '', /text\/csv/);
  const texte = await csv.text();
  assert.match(texte, /^email,prenom,inscrit,source\n/);
  assert.match(texte, /b@exemple\.fr,"Bea, ""B""",/);
  const cible = page.inscrits[0].id;
  assert.equal((await appel(cle, 'DELETE', `/inscrits/${cible}`)).status, 200);
  assert.equal((await appel(cle, 'DELETE', `/inscrits/${cible}`)).status, 404);
  assert.equal(db.tousLesContacts(id).length, 2);
  const rien = await appel(cle, 'POST', '/inscrits/envoyer');
  assert.equal(rien.status, 409);
  assert.equal((await rien.json()).erreur.code, 'rien_de_branche');
});

test('lire un site, un flux, une note : une adresse web est demandée', async () => {
  const { cle } = compteAvecCle('sami');
  for (const chemin of ['/apercu', '/flux', '/avis']) {
    const r = await appel(cle, 'POST', chemin, { url: 'ftp://exemple.fr' });
    assert.equal(r.status, 400, chemin);
    assert.equal((await r.json()).erreur.code, 'adresse');
  }
});

test('l’export : tout ce que Hopla garde du compte', async () => {
  const { cle } = compteAvecCle('tess');
  const r = await appel(cle, 'GET', '/export');
  assert.equal(r.status, 200);
  const e = await r.json();
  assert.equal(e.compte.pseudo, 'tess');
  assert.ok(Array.isArray(e.blocs) && Array.isArray(e.inscrits));
  assert.equal(e.clesApi.length, 1);
});

test('une clé en lecture seule lit tout, n’écrit rien', async () => {
  const { cle } = compteAvecCle('ugo', { ecriture: false });
  for (const chemin of ['/compte', '/reglages', '/qr', '/stats/semaine', '/liste', '/inscrits', '/cles', '/export', '/reseaux', '/pictos', '/types']) {
    assert.equal((await appel(cle, 'GET', chemin)).status, 200, chemin);
  }
  for (const [methode, chemin, corps] of [['POST', '/medias', { image: `data:image/png;base64,${PNG.toString('base64')}` }], ['POST', '/blocs/x/dupliquer', {}], ['DELETE', '/inscrits/x', undefined], ['POST', '/inscrits/envoyer', {}]] as const) {
    const r = await appel(cle, methode, chemin, corps);
    assert.equal(r.status, 403, chemin);
    assert.equal((await r.json()).erreur.code, 'lecture_seule');
  }
});

test('le serveur MCP : les outils ajoutés', async () => {
  const { cle } = compteAvecCle('vera');
  const appelOutil = async (name: string, args: unknown = {}) => (await (await mcp(cle, { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } })).json()).result;
  assert.equal((await appelOutil('lire_compte')).structuredContent.compte.pseudo, 'vera');
  assert.equal((await appelOutil('lire_liste')).structuredContent.liste.inscrits, 0);
  const qr = await appelOutil('lire_qr_code');
  assert.equal(qr.content[0].type, 'image');
  assert.equal(qr.content[0].mimeType, 'image/png');
  const image = await appelOutil('envoyer_image', { image: `data:image/png;base64,${PNG.toString('base64')}` });
  assert.match(image.structuredContent.media.chemin, /^\/media\//);
  const ajout = await appelOutil('ajouter_bloc', { titre: 'Original', url: 'https://exemple.fr' });
  const copie = await appelOutil('dupliquer_bloc', { id: ajout.structuredContent.bloc.id });
  assert.equal(copie.structuredContent.bloc.titre, 'Original');
  assert.equal((await appelOutil('lire_site', { url: 'pas une adresse' })).isError, true);
});
