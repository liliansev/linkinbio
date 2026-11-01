// Sauvegarde nocturne de la base de Hopla vers un stockage S3 (Cloudflare R2 pour hopla.page).
//
// Lancée dans le conteneur de l'app, par une tâche planifiée de Coolify (ou cron + `docker exec`) :
//   node --disable-warning=ExperimentalWarning deploy/sauvegarde.mjs
//
// 1. Une copie cohérente de la base (VACUUM INTO : la base reste ouverte et servie pendant la copie).
// 2. Vérifiée : elle s'ouvre et contient le compte principal, sinon rien n'est envoyé.
// 3. Compressée puis envoyée sous <préfixe>liens-AAAA-MM-JJ.db.gz.
// 4. Les copies de plus de R2_BACKUP_JOURS jours (30 par défaut) sont effacées du stockage.
//
// Variables : R2_BACKUP_ENDPOINT (https://<compte>.r2.cloudflarestorage.com), R2_BACKUP_BUCKET,
// R2_BACKUP_ACCESS_KEY_ID, R2_BACKUP_SECRET_ACCESS_KEY ; facultatives : R2_BACKUP_PREFIX (« hopla/ »),
// R2_BACKUP_JOURS (30), R2_BACKUP_REGION (« auto »), LIENS_DB (/data/liens.db).
//
// La clé LIENS_CLE_INTEGRATIONS ne part jamais avec la base : sans elle, les clés d'API et les inscrits
// chiffrés d'une sauvegarde restent illisibles, et c'est voulu. Elle se garde à part.
//
// Sans dépendance : l'image de production n'a pas de node_modules.

import { DatabaseSync } from 'node:sqlite';
import { createHash, createHmac } from 'node:crypto';
import { createReadStream, createWriteStream, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createGzip } from 'node:zlib';

const sha256 = data => createHash('sha256').update(data).digest('hex');
const hmac = (cle, data) => createHmac('sha256', cle).update(data).digest();
const encoder = s => encodeURIComponent(s).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/** Un client S3 minimal (signature v4, adresses par chemin), assez pour R2, MinIO ou AWS. */
export function clientS3({ endpoint, bucket, accessKeyId, secretAccessKey, region = 'auto' }) {
  const base = new URL(endpoint);
  async function requete(methode, cle = '', { query = {}, corps, taille, type } = {}) {
    const chemin = `${base.pathname.replace(/\/$/, '')}/${encoder(bucket)}${cle ? `/${cle.split('/').map(encoder).join('/')}` : ''}`;
    const qs = Object.keys(query).sort().map(k => `${encoder(k)}=${encoder(query[k])}`).join('&');
    const maintenant = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const jour = maintenant.slice(0, 8);
    const entetes = { host: base.host, 'x-amz-content-sha256': 'UNSIGNED-PAYLOAD', 'x-amz-date': maintenant };
    if (taille !== undefined) entetes['content-length'] = String(taille);
    if (type) entetes['content-type'] = type;
    const noms = Object.keys(entetes).sort();
    const canonique = [methode, chemin, qs, ...noms.map(n => `${n}:${entetes[n]}`), '', noms.join(';'), 'UNSIGNED-PAYLOAD'].join('\n');
    const portee = `${jour}/${region}/s3/aws4_request`;
    const aSigner = ['AWS4-HMAC-SHA256', maintenant, portee, sha256(canonique)].join('\n');
    const cleSignature = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, jour), region), 's3'), 'aws4_request');
    const signature = createHmac('sha256', cleSignature).update(aSigner).digest('hex');
    const { host, ...envoyes } = entetes;
    envoyes.authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${portee}, SignedHeaders=${noms.join(';')}, Signature=${signature}`;
    const reponse = await fetch(`${base.origin}${chemin}${qs ? `?${qs}` : ''}`, {
      method: methode, headers: envoyes, body: corps, ...(corps ? { duplex: 'half' } : {}),
    });
    const texte = await reponse.text();
    if (!reponse.ok) throw new Error(`${methode} ${cle || bucket} : ${reponse.status} ${texte.slice(0, 300)}`);
    return texte;
  }
  return {
    envoyer: (cle, fichier, type) => {
      const taille = statSync(fichier).size;
      return requete('PUT', cle, { corps: Readable.toWeb(createReadStream(fichier)), taille, type });
    },
    async lister(prefixe) {
      const objets = [];
      let suite;
      do {
        const xml = await requete('GET', '', { query: { 'list-type': '2', prefix: prefixe, ...(suite ? { 'continuation-token': suite } : {}) } });
        for (const [, bloc] of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
          objets.push({ cle: /<Key>([\s\S]*?)<\/Key>/.exec(bloc)?.[1] ?? '', date: new Date(/<LastModified>(.*?)<\/LastModified>/.exec(bloc)?.[1] ?? 0) });
        }
        suite = /<IsTruncated>true<\/IsTruncated>/.test(xml) ? /<NextContinuationToken>(.*?)<\/NextContinuationToken>/.exec(xml)?.[1] : undefined;
      } while (suite);
      return objets;
    },
    effacer: cle => requete('DELETE', cle),
  };
}

/** Copie la base, la vérifie et la compresse ; rend le chemin du .gz, que l'appelant efface. */
export async function copierBase(fichier) {
  const dossier = dirname(fichier);
  const copie = join(dossier, `.sauvegarde-${process.pid}.db`);
  rmSync(copie, { force: true });
  const source = new DatabaseSync(fichier, { readOnly: true });
  try {
    source.exec(`VACUUM INTO '${copie.replace(/'/g, "''")}'`);
  } finally {
    source.close();
  }
  try {
    const verif = new DatabaseSync(copie, { readOnly: true });
    const { n } = verif.prepare("SELECT count(*) AS n FROM comptes WHERE id = 'principal'").get();
    verif.close();
    if (n !== 1) throw new Error('copie illisible : pas de compte principal');
    await pipeline(createReadStream(copie), createGzip({ level: 9 }), createWriteStream(`${copie}.gz`));
    return `${copie}.gz`;
  } finally {
    rmSync(copie, { force: true });
  }
}

export async function sauvegarder(env = process.env, maintenant = new Date()) {
  const manque = ['R2_BACKUP_ENDPOINT', 'R2_BACKUP_BUCKET', 'R2_BACKUP_ACCESS_KEY_ID', 'R2_BACKUP_SECRET_ACCESS_KEY'].filter(n => !env[n]);
  if (manque.length) throw new Error(`variables manquantes : ${manque.join(', ')}`);
  const s3 = clientS3({
    endpoint: env.R2_BACKUP_ENDPOINT, bucket: env.R2_BACKUP_BUCKET, region: env.R2_BACKUP_REGION || 'auto',
    accessKeyId: env.R2_BACKUP_ACCESS_KEY_ID, secretAccessKey: env.R2_BACKUP_SECRET_ACCESS_KEY,
  });
  const prefixe = env.R2_BACKUP_PREFIX ?? 'hopla/';
  const jours = Number(env.R2_BACKUP_JOURS) || 30;
  const gz = await copierBase(env.LIENS_DB || '/data/liens.db');
  const cle = `${prefixe}liens-${maintenant.toISOString().slice(0, 10)}.db.gz`;
  try {
    await s3.envoyer(cle, gz, 'application/gzip');
    const taille = statSync(gz).size;
    const limite = maintenant.getTime() - jours * 86_400_000;
    const anciennes = (await s3.lister(prefixe)).filter(o => /liens-\d{4}-\d{2}-\d{2}\.db\.gz$/.test(o.cle) && o.date.getTime() < limite);
    for (const o of anciennes) await s3.effacer(o.cle);
    return { cle, taille, effacees: anciennes.length };
  } finally {
    rmSync(gz, { force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  sauvegarder().then(
    r => console.log(`[sauvegarde] ${r.cle} envoyée (${Math.round(r.taille / 1024)} Ko), ${r.effacees} ancienne(s) effacée(s)`),
    e => { console.error(`[sauvegarde] échec : ${e.message}`); process.exit(1); },
  );
}
