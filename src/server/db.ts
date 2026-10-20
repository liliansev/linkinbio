import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Bloc, CompteResume, Contact, FournisseurListe, Reglages, Stats } from '../lib/types.ts';
import { PRINCIPAL } from '../lib/types.ts';
import { REGLAGES_DEFAUT, blocsDefaut, reglagesNouveauCompte } from '../lib/defauts.ts';
import { validerBloc, validerReglages } from '../lib/valider.ts';
import type { Abonnement } from '../lib/abonnement.ts';
import { QUOTA_GRATUIT, QUOTA_PRO, estPro } from '../lib/abonnement.ts';
import { appDe } from '../lib/ouvrirApp.ts';

/*
 * Toutes les pages tiennent dans un fichier SQLite (`node:sqlite`, rien à
 * installer). En production il vit sur le volume `/data` du conteneur. Si le
 * dossier n'est pas inscriptible (volume pas encore branché, ou contrôle avant
 * déploiement), la base s'ouvre en mémoire et le back office le signale : rien
 * n'y survivrait à un redémarrage.
 *
 * Plusieurs comptes : chaque page, bloc, média, événement et jeton porte le
 * `compte` qui le possède, et chaque fonction ci-dessous le prend en premier
 * argument. Le compte `principal` est celui de Lilian ; chaque page est servie
 * sur hopla.page/<pseudo> (la sienne sur /lilian).
 */

let db: DatabaseSync | null = null;
let ephemere = false;

export const nouvelId = () => randomUUID().replace(/-/g, '').slice(0, 12);

/** Ce qu'un compte invité gratuit peut stocker en images ; le compte principal n'a pas de plafond. */
export const QUOTA_MEDIAS = QUOTA_GRATUIT;
const MAX_BLOCS = 200;

function chemin() {
  if (process.env.LIENS_DB) return process.env.LIENS_DB;
  return process.env.NODE_ENV === 'production' ? '/data/liens.db' : resolve(process.cwd(), '.data/liens.db');
}

/** Ajoute une colonne à une table qui date d'avant les comptes. */
function colonne(d: DatabaseSync, table: string, nom: string, definition: string) {
  const colonnes = d.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!colonnes.some(c => c.name === nom)) d.exec(`ALTER TABLE ${table} ADD COLUMN ${nom} ${definition}`);
}

export function base(): DatabaseSync {
  if (db) return db;
  const fichier = chemin();
  try {
    if (fichier === ':memory:') throw new Error('mémoire demandée');
    mkdirSync(dirname(fichier), { recursive: true });
    db = new DatabaseSync(fichier);
    db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 3000;');
  } catch (error) {
    if (fichier !== ':memory:') console.error('[liens] base en mémoire :', (error as Error).message);
    db = new DatabaseSync(':memory:');
    ephemere = true;
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS reglages (cle TEXT PRIMARY KEY, valeur TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS comptes (
      id TEXT PRIMARY KEY, email TEXT NOT NULL, pseudo TEXT NOT NULL UNIQUE, statut TEXT NOT NULL DEFAULT 'actif',
      cree INTEGER NOT NULL, connexion INTEGER
    );
    CREATE TABLE IF NOT EXISTS pages (compte TEXT PRIMARY KEY, valeur TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS blocs (id TEXT PRIMARY KEY, position INTEGER NOT NULL, donnees TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS medias (id TEXT PRIMARY KEY, extension TEXT NOT NULL, octets BLOB NOT NULL, cree INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS evenements (
      id INTEGER PRIMARY KEY, type TEXT NOT NULL, bloc TEXT, jour TEXT NOT NULL, ts INTEGER NOT NULL,
      visiteur TEXT NOT NULL, source TEXT NOT NULL, appareil TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS jetons (hash TEXT PRIMARY KEY, type TEXT NOT NULL, expire INTEGER NOT NULL, cree INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS webhooks (id TEXT PRIMARY KEY, recu INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY, compte TEXT NOT NULL, email TEXT NOT NULL, prenom TEXT NOT NULL DEFAULT '', ts INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT '', bloc TEXT NOT NULL DEFAULT '', synchro TEXT NOT NULL DEFAULT '', UNIQUE (compte, email)
    );
    CREATE TABLE IF NOT EXISTS acces (bloc TEXT NOT NULL, compte TEXT NOT NULL, visiteur TEXT NOT NULL, ts INTEGER NOT NULL, PRIMARY KEY (bloc, visiteur));
    CREATE TABLE IF NOT EXISTS resumes (compte TEXT NOT NULL, semaine TEXT NOT NULL, envoye INTEGER NOT NULL, PRIMARY KEY (compte, semaine));
    CREATE TABLE IF NOT EXISTS integrations (
      compte TEXT PRIMARY KEY, fournisseur TEXT NOT NULL, cle TEXT NOT NULL, liste TEXT NOT NULL, nom TEXT NOT NULL DEFAULT '', maj INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS signalements (
      id TEXT PRIMARY KEY, compte TEXT NOT NULL, motif TEXT NOT NULL, details TEXT NOT NULL, email TEXT NOT NULL DEFAULT '',
      ts INTEGER NOT NULL, statut TEXT NOT NULL DEFAULT 'ouvert', decision TEXT NOT NULL DEFAULT '', traite INTEGER
    );
  `);
  // Les tables d'avant les comptes : tout ce qu'elles contiennent est à Lilian.
  for (const table of ['blocs', 'medias', 'evenements', 'jetons']) colonne(db, table, 'compte', `TEXT NOT NULL DEFAULT '${PRINCIPAL}'`);
  // Les conditions acceptées : leur version (une date) et le moment.
  colonne(db, 'comptes', 'cgu', "TEXT NOT NULL DEFAULT ''");
  colonne(db, 'comptes', 'cgu_le', 'INTEGER');
  // L'abonnement Pro, tel que Creem le décrit dans ses webhooks.
  colonne(db, 'comptes', 'creem_client', "TEXT NOT NULL DEFAULT ''");
  colonne(db, 'comptes', 'creem_abonnement', "TEXT NOT NULL DEFAULT ''");
  colonne(db, 'comptes', 'abonnement_statut', "TEXT NOT NULL DEFAULT ''");
  colonne(db, 'comptes', 'fin_periode', 'INTEGER');
  colonne(db, 'comptes', 'abonnement_maj', 'INTEGER NOT NULL DEFAULT 0');
  // Vu depuis le navigateur intégré d'une app (Instagram, TikTok…), et pour un clic, ouvert dans l'app visée.
  colonne(db, 'evenements', 'integre', 'INTEGER NOT NULL DEFAULT 0');
  colonne(db, 'evenements', 'app', 'INTEGER NOT NULL DEFAULT 0');
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS comptes_email ON comptes (email);
    CREATE INDEX IF NOT EXISTS blocs_compte ON blocs (compte, position);
    CREATE INDEX IF NOT EXISTS medias_compte ON medias (compte);
    DROP INDEX IF EXISTS evenements_jour;
    CREATE INDEX IF NOT EXISTS evenements_compte ON evenements (compte, jour, type);
    CREATE INDEX IF NOT EXISTS evenements_ts ON evenements (ts);
    CREATE INDEX IF NOT EXISTS signalements_statut ON signalements (statut, ts);
  `);
  if (!db.prepare('SELECT 1 FROM comptes WHERE id = ?').get(PRINCIPAL)) {
    // L'adresse du compte principal vient de l'environnement (voir auth.ts) : on n'en garde qu'un repère.
    db.prepare('INSERT INTO comptes (id, email, pseudo, cree) VALUES (?, ?, ?, ?)').run(PRINCIPAL, '', 'lilian', Date.now());
  }
  const ancienne = db.prepare('SELECT valeur FROM reglages WHERE cle = ?').get('page') as { valeur: string } | undefined;
  if (ancienne) {
    db.prepare('INSERT OR IGNORE INTO pages (compte, valeur) VALUES (?, ?)').run(PRINCIPAL, ancienne.valeur);
    db.prepare('DELETE FROM reglages WHERE cle = ?').run('page');
  }
  if (!db.prepare('SELECT 1 FROM pages WHERE compte = ?').get(PRINCIPAL)) {
    db.prepare('INSERT INTO pages (compte, valeur) VALUES (?, ?)').run(PRINCIPAL, JSON.stringify(REGLAGES_DEFAUT));
    const inserer = db.prepare('INSERT INTO blocs (id, position, donnees, compte) VALUES (?, ?, ?, ?)');
    blocsDefaut(nouvelId).forEach((bloc, i) => inserer.run(bloc.id, i, JSON.stringify(bloc), PRINCIPAL));
  }
  // Le passage sur hopla.page (18 octobre 2026) : l'app quitte /liens, les images aussi. Sans effet ensuite.
  for (const [table, col] of [['blocs', 'donnees'], ['pages', 'valeur']]) {
    db.prepare(`UPDATE ${table} SET ${col} = REPLACE(REPLACE(${col}, '"/liens/media/', '"/media/'), '"/liens/avatar.webp"', '"/avatar.webp"') WHERE ${col} LIKE '%"/liens/%'`).run();
  }
  purger(Date.now(), db);
  return db;
}

/** Ce qu'on garde, annoncé dans la politique de confidentialité (`lib/legal.ts`). */
export const CONSERVATION = { statistiquesJours: 395, signalementsJours: 365 };
let derniere = 0;

/**
 * Efface ce qui a passé sa durée de conservation : les statistiques de plus de
 * treize mois, les jetons expirés, les signalements traités depuis un an. Au
 * démarrage, puis au plus une fois toutes les six heures (voir `ajouterEvenement`).
 */
export function purger(maintenant = Date.now(), d = base()) {
  derniere = maintenant;
  d.prepare('DELETE FROM evenements WHERE ts < ?').run(maintenant - CONSERVATION.statistiquesJours * 86_400_000);
  d.prepare('DELETE FROM jetons WHERE expire < ?').run(maintenant);
  d.prepare("DELETE FROM signalements WHERE statut != 'ouvert' AND traite < ?").run(maintenant - CONSERVATION.signalementsJours * 86_400_000);
  d.prepare('DELETE FROM webhooks WHERE recu < ?').run(maintenant - 30 * 86_400_000);
  d.prepare('DELETE FROM resumes WHERE envoye < ?').run(maintenant - 60 * 86_400_000);
  d.prepare('DELETE FROM acces WHERE ts < ?').run(maintenant - CONSERVATION.statistiquesJours * 86_400_000);
}

export const stockageEphemere = () => (base(), ephemere);

/** Le secret du serveur (signature des visiteurs anonymes), créé au premier lancement. */
export function secret(): string {
  const ligne = base().prepare('SELECT valeur FROM reglages WHERE cle = ?').get('secret') as { valeur: string } | undefined;
  if (ligne) return ligne.valeur;
  const valeur = randomBytes(32).toString('base64url');
  base().prepare('INSERT INTO reglages (cle, valeur) VALUES (?, ?)').run('secret', valeur);
  return valeur;
}

/* ---- Comptes ---- */

export interface Compte {
  id: string; email: string; pseudo: string; statut: 'actif' | 'suspendu'; cree: number; connexion: number | null; cgu: string; cgu_le: number | null;
  creem_client: string; creem_abonnement: string; abonnement_statut: string; fin_periode: number | null; abonnement_maj: number;
}

const LIRE_COMPTE = 'SELECT id, email, pseudo, statut, cree, connexion, cgu, cgu_le, creem_client, creem_abonnement, abonnement_statut, fin_periode, abonnement_maj FROM comptes';
export const compteParId = (id: string) => base().prepare(`${LIRE_COMPTE} WHERE id = ?`).get(id) as Compte | undefined;
export const compteParPseudo = (pseudo: string) => base().prepare(`${LIRE_COMPTE} WHERE pseudo = ?`).get(pseudo.toLowerCase()) as Compte | undefined;
/** Jamais le compte principal : son adresse se lit dans l'environnement. */
export const compteParEmail = (email: string) => base().prepare(`${LIRE_COMPTE} WHERE email = ? AND id != ?`).get(email.toLowerCase(), PRINCIPAL) as Compte | undefined;

export function creerCompte(email: string, pseudo: string, maintenant = Date.now()): Compte {
  const d = base();
  const e = email.toLowerCase(), p = pseudo.toLowerCase();
  if (d.prepare('SELECT 1 FROM comptes WHERE email = ? AND id != ?').get(e, PRINCIPAL)) throw new Error('Cette adresse a déjà un compte.');
  if (d.prepare('SELECT 1 FROM comptes WHERE pseudo = ?').get(p)) throw new Error('Ce pseudo est déjà pris.');
  const id = nouvelId();
  d.exec('BEGIN');
  try {
    d.prepare('INSERT INTO comptes (id, email, pseudo, cree) VALUES (?, ?, ?, ?)').run(id, e, p, maintenant);
    d.prepare('INSERT INTO pages (compte, valeur) VALUES (?, ?)').run(id, JSON.stringify(reglagesNouveauCompte(p)));
    d.exec('COMMIT');
  } catch (error) { d.exec('ROLLBACK'); throw error; }
  return compteParId(id)!;
}

export function changerStatut(id: string, statut: Compte['statut']) {
  if (id === PRINCIPAL) throw new Error('Le compte principal ne se suspend pas.');
  base().prepare('UPDATE comptes SET statut = ? WHERE id = ?').run(statut, id);
  // Suspendre ferme aussi les sessions ouvertes.
  if (statut === 'suspendu') base().prepare('DELETE FROM jetons WHERE compte = ?').run(id);
}

/** Supprime un compte et tout ce qu'il possède. */
export function supprimerCompte(id: string) {
  if (id === PRINCIPAL) throw new Error('Le compte principal ne se supprime pas.');
  const d = base();
  d.exec('BEGIN');
  try {
    for (const table of ['blocs', 'medias', 'evenements', 'jetons', 'signalements', 'contacts', 'integrations', 'resumes', 'acces']) d.prepare(`DELETE FROM ${table} WHERE compte = ?`).run(id);
    d.prepare('DELETE FROM pages WHERE compte = ?').run(id);
    d.prepare('DELETE FROM comptes WHERE id = ?').run(id);
    d.exec('COMMIT');
  } catch (error) { d.exec('ROLLBACK'); throw error; }
}

/* ---- Abonnement Pro ---- */

/** Où en est l'abonnement d'un compte. Le compte principal est Pro sans abonnement. */
export function abonnement(c: Compte, maintenant = Date.now()): Abonnement {
  if (c.id === PRINCIPAL) return { plan: 'pro', statut: '', finPeriode: null, portail: false };
  const lu = { statut: c.abonnement_statut, finPeriode: c.fin_periode };
  return { plan: estPro(lu, maintenant) ? 'pro' : 'gratuit', statut: c.abonnement_statut, finPeriode: c.fin_periode, portail: !!c.creem_client };
}

export const compteEstPro = (id: string, maintenant = Date.now()) => {
  const c = compteParId(id);
  return !!c && abonnement(c, maintenant).plan === 'pro';
};

export const compteParAbonnement = (id: string) => (id ? base().prepare(`${LIRE_COMPTE} WHERE creem_abonnement = ?`).get(id) as Compte | undefined : undefined);
export const compteParClientCreem = (id: string) => (id ? base().prepare(`${LIRE_COMPTE} WHERE creem_client = ? AND id != ?`).get(id, PRINCIPAL) as Compte | undefined : undefined);

/**
 * Inscrit ce que Creem dit de l'abonnement. Les webhooks peuvent arriver dans
 * le désordre : un événement plus ancien que le dernier appliqué est ignoré.
 * Un nouvel abonnement repart de sa propre fin de période, jamais de celle de
 * l'ancien. Vrai si l'état a changé.
 */
export function appliquerAbonnement(id: string, a: { client: string; abonnement: string; statut: string; finPeriode: number | null; maj: number }): boolean {
  if (id === PRINCIPAL) return false;
  const r = base().prepare(`UPDATE comptes SET
      creem_client = CASE WHEN $client != '' THEN $client ELSE creem_client END,
      fin_periode = CASE WHEN $abonnement != '' AND $abonnement != creem_abonnement THEN $fin ELSE COALESCE($fin, fin_periode) END,
      creem_abonnement = CASE WHEN $abonnement != '' THEN $abonnement ELSE creem_abonnement END,
      abonnement_statut = $statut, abonnement_maj = $maj
    WHERE id = $id AND abonnement_maj <= $maj`).run({ client: a.client, abonnement: a.abonnement, fin: a.finPeriode, statut: a.statut, maj: a.maj, id });
  return Number(r.changes) > 0;
}

/** Un webhook déjà traité (Creem peut l'envoyer plusieurs fois) ; sinon il est noté. */
export function webhookDejaRecu(idEvenement: string, maintenant = Date.now()): boolean {
  const r = base().prepare('INSERT OR IGNORE INTO webhooks (id, recu) VALUES (?, ?)').run(idEvenement, maintenant);
  return Number(r.changes) === 0;
}
export const oublierWebhook = (idEvenement: string) => base().prepare('DELETE FROM webhooks WHERE id = ?').run(idEvenement);

export const accepterCgu = (id: string, version: string, maintenant = Date.now()) => base().prepare('UPDATE comptes SET cgu = ?, cgu_le = ? WHERE id = ?').run(version, maintenant, id);

export const noterConnexion = (id: string, maintenant = Date.now()) => base().prepare('UPDATE comptes SET connexion = ? WHERE id = ?').run(maintenant, id);

/** La liste du back office de Lilian, avec de quoi juger l'activité de chaque page. */
export function listerComptes(maintenant = Date.now()): CompteResume[] {
  const lignes = base().prepare(`
    SELECT c.id, c.email, c.pseudo, c.statut, c.cree, c.connexion, c.abonnement_statut, c.fin_periode,
      (SELECT COUNT(*) FROM blocs b WHERE b.compte = c.id) AS blocs,
      (SELECT COUNT(*) FROM evenements e WHERE e.compte = c.id AND e.type = 'vue' AND e.ts > ?) AS vues
    FROM comptes c ORDER BY c.id = ? DESC, c.cree DESC`).all(maintenant - 30 * 86_400_000, PRINCIPAL) as (Omit<CompteResume, 'principal' | 'pro'> & { abonnement_statut: string; fin_periode: number | null })[];
  return lignes.map(({ abonnement_statut, fin_periode, ...l }) => ({
    ...l, principal: l.id === PRINCIPAL, pro: l.id !== PRINCIPAL && estPro({ statut: abonnement_statut, finPeriode: fin_periode }, maintenant),
  }));
}

/* ---- Pages et blocs ---- */

export function lireReglages(compte: string): Reglages {
  const ligne = base().prepare('SELECT valeur FROM pages WHERE compte = ?').get(compte) as { valeur: string } | undefined;
  if (!ligne) throw new Error('Compte inconnu.');
  return validerReglages(JSON.parse(ligne.valeur), REGLAGES_DEFAUT);
}

export function ecrireReglages(compte: string, reglages: Reglages) {
  base().prepare('UPDATE pages SET valeur = ? WHERE compte = ?').run(JSON.stringify(reglages), compte);
}

export function lireBlocs(compte: string): Bloc[] {
  const lignes = base().prepare('SELECT id, donnees FROM blocs WHERE compte = ? ORDER BY position, rowid').all(compte) as { id: string; donnees: string }[];
  return lignes.map(ligne => validerBloc(JSON.parse(ligne.donnees), ligne.id));
}

/** Un bloc nouveau s'ajoute en tête, comme on l'attend d'une page de liens. */
export function enregistrerBloc(compte: string, bloc: Bloc) {
  const d = base();
  const proprietaire = d.prepare('SELECT compte FROM blocs WHERE id = ?').get(bloc.id) as { compte: string } | undefined;
  if (proprietaire && proprietaire.compte !== compte) throw new Error('Bloc introuvable.');
  if (proprietaire) {
    d.prepare('UPDATE blocs SET donnees = ? WHERE id = ? AND compte = ?').run(JSON.stringify(bloc), bloc.id, compte);
  } else {
    if ((d.prepare('SELECT COUNT(*) AS n FROM blocs WHERE compte = ?').get(compte) as { n: number }).n >= MAX_BLOCS) throw new Error('Deux cents blocs au plus.');
    const { min } = d.prepare('SELECT COALESCE(MIN(position), 0) AS min FROM blocs WHERE compte = ?').get(compte) as { min: number };
    d.prepare('INSERT INTO blocs (id, position, donnees, compte) VALUES (?, ?, ?, ?)').run(bloc.id, min - 1, JSON.stringify(bloc), compte);
  }
}

export function supprimerBloc(compte: string, id: string) {
  base().prepare('DELETE FROM blocs WHERE id = ? AND compte = ?').run(id, compte);
}

export function ordonner(compte: string, ids: string[]) {
  const d = base();
  const maj = d.prepare('UPDATE blocs SET position = ? WHERE id = ? AND compte = ?');
  d.exec('BEGIN');
  try { ids.forEach((id, i) => maj.run(i, id, compte)); d.exec('COMMIT'); } catch (error) { d.exec('ROLLBACK'); throw error; }
}

/* ---- Médias ---- */

export function ajouterMedia(compte: string, octets: Uint8Array, extension: 'webp' | 'jpg'): string {
  const d = base();
  if (compte !== PRINCIPAL) {
    const quota = compteEstPro(compte) ? QUOTA_PRO : QUOTA_MEDIAS;
    const { total } = d.prepare('SELECT COALESCE(SUM(LENGTH(octets)), 0) AS total FROM medias WHERE compte = ?').get(compte) as { total: number };
    if (total + octets.length > quota) throw new Error('Plus de place pour les images : supprime-en ou réutilise une image déjà envoyée.');
  }
  const id = nouvelId();
  d.prepare('INSERT INTO medias (id, extension, octets, cree, compte) VALUES (?, ?, ?, ?, ?)').run(id, extension, octets, Date.now(), compte);
  return id;
}

/** Les images sont publiques (elles s'affichent sur les pages) : leur identifiant suffit à les lire. */
export function lireMedia(id: string, extension: string): Uint8Array | null {
  const ligne = base().prepare('SELECT octets FROM medias WHERE id = ? AND extension = ?').get(id, extension) as { octets: Uint8Array } | undefined;
  return ligne?.octets ?? null;
}

/* ---- Jetons de connexion et sessions (on ne garde que leur empreinte) ---- */

export function ajouterJeton(hash: string, type: 'connexion' | 'session', dureeMs: number, compte: string) {
  base().prepare('INSERT INTO jetons (hash, type, expire, cree, compte) VALUES (?, ?, ?, ?, ?)').run(hash, type, Date.now() + dureeMs, Date.now(), compte);
}

/**
 * Le compte d'un jeton valide (bon type, pas expiré, compte actif), ou null.
 * `consommer` l'efface.
 */
export function verifierJeton(hash: string, type: 'connexion' | 'session', consommer = false): string | null {
  const d = base();
  const ligne = d.prepare(`SELECT j.compte FROM jetons j JOIN comptes c ON c.id = j.compte
    WHERE j.hash = ? AND j.type = ? AND j.expire > ? AND c.statut = 'actif'`).get(hash, type, Date.now()) as { compte: string } | undefined;
  if (ligne && consommer) d.prepare('DELETE FROM jetons WHERE hash = ?').run(hash);
  return ligne?.compte ?? null;
}

export const supprimerJeton = (hash: string) => base().prepare('DELETE FROM jetons WHERE hash = ?').run(hash);

/** Combien de liens de connexion envoyés depuis `depuis`, pour un compte ou pour tous (limites anti-abus). */
export function jetonsRecents(depuis: number, compte?: string): { n: number; dernier: number } {
  const filtre = compte ? ' AND compte = ?' : '';
  return base().prepare(`SELECT COUNT(*) AS n, COALESCE(MAX(cree), 0) AS dernier FROM jetons WHERE type = 'connexion' AND cree > ?${filtre}`)
    .get(...(compte ? [depuis, compte] : [depuis])) as { n: number; dernier: number };
}

/* ---- Statistiques ---- */

const formatJour = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' });
export const jourDe = (ts: number) => formatJour.format(ts);

/** Les événements du jour, pour un compte ou pour tout le serveur. */
export function evenementsDuJour(maintenant = Date.now(), compte?: string): number {
  const filtre = compte ? ' AND compte = ?' : '';
  return (base().prepare(`SELECT COUNT(*) AS n FROM evenements WHERE jour = ?${filtre}`).get(...(compte ? [jourDe(maintenant), compte] : [jourDe(maintenant)])) as { n: number }).n;
}

export function ajouterEvenement(e: { compte: string; type: 'vue' | 'clic'; bloc: string | null; visiteur: string; source: string; appareil: string; ts?: number; integre?: boolean; app?: boolean }) {
  const ts = e.ts ?? Date.now();
  if (Date.now() - derniere > 6 * 3_600_000) purger();
  base().prepare('INSERT INTO evenements (compte, type, bloc, jour, ts, visiteur, source, appareil, integre, app) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(e.compte, e.type, e.bloc, jourDe(ts), ts, e.visiteur, e.source, e.appareil, e.integre ? 1 : 0, e.app ? 1 : 0);
}

export function clicsParBloc(compte: string, jours = 30): Record<string, number> {
  const lignes = base().prepare("SELECT bloc, COUNT(*) AS n FROM evenements WHERE compte = ? AND type = 'clic' AND ts > ? GROUP BY bloc").all(compte, Date.now() - jours * 86_400_000) as { bloc: string; n: number }[];
  return Object.fromEntries(lignes.map(l => [l.bloc, l.n]));
}

export function stats(compte: string, jours: number, maintenant = Date.now()): Stats {
  const d = base();
  const jourListe: string[] = [];
  for (let i = jours - 1; i >= 0; i--) jourListe.push(jourDe(maintenant - i * 86_400_000));
  const debut = jourListe[0], fin = jourListe[jourListe.length - 1];
  const debutPrecedent = jourDe(maintenant - (2 * jours - 1) * 86_400_000);
  const totaux = (de: string, a: string) => d.prepare(`
    SELECT SUM(type = 'vue') AS vues, SUM(type = 'clic') AS clics, COUNT(DISTINCT CASE WHEN type = 'vue' THEN visiteur END) AS visiteurs
    FROM evenements WHERE compte = ? AND jour BETWEEN ? AND ?`).get(compte, de, a) as { vues: number | null; clics: number | null; visiteurs: number };
  const actuel = totaux(debut, fin);
  const avant = totaux(debutPrecedent, jourListe.length > 1 ? jourDe(maintenant - jours * 86_400_000) : debutPrecedent);
  const parJour = new Map((d.prepare(`SELECT jour, SUM(type = 'vue') AS vues, SUM(type = 'clic') AS clics FROM evenements WHERE compte = ? AND jour BETWEEN ? AND ? GROUP BY jour`).all(compte, debut, fin) as { jour: string; vues: number; clics: number }[]).map(l => [l.jour, l]));
  const titres = new Map(lireBlocs(compte).map(b => [b.id, b.titre || b.url]));
  const finPrecedent = jourListe.length > 1 ? jourDe(maintenant - jours * 86_400_000) : debutPrecedent;
  // La période d'avant, pour dire ce qui monte : « ton lien YouTube a fait +40 % ».
  const avantPar = (sql: string) => new Map((d.prepare(sql).all(compte, debutPrecedent, finPrecedent) as { cle: string; n: number }[]).map(l => [l.cle, l.n]));
  const clicsAvant = avantPar(`SELECT bloc AS cle, COUNT(*) AS n FROM evenements WHERE compte = ? AND type = 'clic' AND jour BETWEEN ? AND ? GROUP BY bloc`);
  const vuesAvant = avantPar(`SELECT source AS cle, COUNT(*) AS n FROM evenements WHERE compte = ? AND type = 'vue' AND jour BETWEEN ? AND ? GROUP BY source`);
  const blocs = (d.prepare(`SELECT bloc, COUNT(*) AS n FROM evenements WHERE compte = ? AND type = 'clic' AND jour BETWEEN ? AND ? GROUP BY bloc ORDER BY n DESC LIMIT 20`).all(compte, debut, fin) as { bloc: string; n: number }[])
    .map(l => ({ id: l.bloc, titre: titres.get(l.bloc) ?? 'Bloc supprimé', clics: l.n, avant: clicsAvant.get(l.bloc) ?? 0 }));
  // Les clics venus du navigateur intégré d'une app : vers un lien qui a son app, et ouverts dedans.
  const urls = new Map(lireBlocs(compte).map(b => [b.id, b.url]));
  const integres = d.prepare(`SELECT bloc, SUM(app) AS ouverts, COUNT(*) AS n FROM evenements WHERE compte = ? AND type = 'clic' AND integre = 1 AND jour BETWEEN ? AND ? GROUP BY bloc`).all(compte, debut, fin) as { bloc: string; ouverts: number; n: number }[];
  const apps = { integres: 0, versApp: 0, ouverts: 0 };
  for (const l of integres) {
    apps.integres += l.n;
    apps.ouverts += l.ouverts;
    if (appDe(urls.get(l.bloc) ?? '')) apps.versApp += l.n;
  }
  // Une page que personne n'a jamais vue n'a pas de courbe à montrer : sans vue sur les deux périodes, on regarde plus loin.
  const dejaVue = !!(actuel.vues || avant.vues) || !!d.prepare("SELECT 1 FROM evenements WHERE compte = ? AND type = 'vue' LIMIT 1").get(compte);
  const groupe = (colonne: 'source' | 'appareil') => (d.prepare(`SELECT ${colonne} AS nom, COUNT(*) AS n FROM evenements WHERE compte = ? AND type = 'vue' AND jour BETWEEN ? AND ? GROUP BY ${colonne} ORDER BY n DESC LIMIT 8`).all(compte, debut, fin) as { nom: string; n: number }[])
    .map(l => ({ nom: l.nom, vues: l.n, avant: colonne === 'source' ? vuesAvant.get(l.nom) ?? 0 : 0 }));
  return {
    jours,
    vues: actuel.vues ?? 0, visiteurs: actuel.visiteurs ?? 0, clics: actuel.clics ?? 0,
    serie: jourListe.map(jour => ({ jour, vues: parJour.get(jour)?.vues ?? 0, clics: parJour.get(jour)?.clics ?? 0 })),
    blocs, sources: groupe('source'), appareils: groupe('appareil'), apps,
    precedent: { vues: avant.vues ?? 0, visiteurs: avant.visiteurs ?? 0, clics: avant.clics ?? 0 },
    dejaVue,
  };
}

/* ---- « Rejoins ma liste » : les inscrits et le fournisseur branché ---- */

/** Un nouvel inscrit, ou null s'il l'était déjà. */
export function ajouterContact(compte: string, c: { email: string; prenom: string; source: string; bloc: string }, maintenant = Date.now()): { id: string; email: string; prenom: string } | null {
  const id = nouvelId();
  const r = base().prepare('INSERT OR IGNORE INTO contacts (id, compte, email, prenom, ts, source, bloc) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, compte, c.email.toLowerCase(), c.prenom, maintenant, c.source, c.bloc);
  return Number(r.changes) ? { id, email: c.email.toLowerCase(), prenom: c.prenom } : null;
}

export const contactsDuJour = (compte: string, maintenant = Date.now()) => (base().prepare('SELECT COUNT(*) AS n FROM contacts WHERE compte = ? AND ts > ?').get(compte, maintenant - 86_400_000) as { n: number }).n;
export const noterSynchro = (id: string, etat: 'ok' | 'erreur') => base().prepare('UPDATE contacts SET synchro = ? WHERE id = ?').run(etat, id);
export const supprimerContact = (compte: string, id: string) => base().prepare('DELETE FROM contacts WHERE id = ? AND compte = ?').run(id, compte);

const LIRE_CONTACT = 'SELECT id, email, prenom, ts, source, synchro FROM contacts WHERE compte = ?';
export const tousLesContacts = (compte: string) => base().prepare(`${LIRE_CONTACT} ORDER BY ts DESC`).all(compte) as unknown as Contact[];

export function resumeContacts(compte: string, maintenant = Date.now()) {
  const d = base();
  const { total, semaine, attente } = d.prepare(`SELECT COUNT(*) AS total, SUM(ts > ?) AS semaine, SUM(synchro != 'ok') AS attente FROM contacts WHERE compte = ?`).get(maintenant - 7 * 86_400_000, compte) as { total: number; semaine: number | null; attente: number | null };
  return { total, semaine: semaine ?? 0, enAttente: attente ?? 0, derniers: d.prepare(`${LIRE_CONTACT} ORDER BY ts DESC LIMIT 50`).all(compte) as unknown as Contact[] };
}

/** Les inscrits pas encore chez le fournisseur, du plus ancien au plus récent. */
export const contactsAEnvoyer = (compte: string, limite = 200) => base().prepare(`SELECT id, email, prenom FROM contacts WHERE compte = ? AND synchro != 'ok' ORDER BY ts LIMIT ?`).all(compte, limite) as { id: string; email: string; prenom: string }[];

export interface Integration { fournisseur: FournisseurListe; cle: string; liste: string; nom: string }
export const lireIntegration = (compte: string) => base().prepare('SELECT fournisseur, cle, liste, nom FROM integrations WHERE compte = ?').get(compte) as Integration | undefined;
export function ecrireIntegration(compte: string, i: Integration | null, maintenant = Date.now()) {
  const d = base();
  if (!i) { d.prepare('DELETE FROM integrations WHERE compte = ?').run(compte); return; }
  d.prepare('INSERT INTO integrations (compte, fournisseur, cle, liste, nom, maj) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (compte) DO UPDATE SET fournisseur = excluded.fournisseur, cle = excluded.cle, liste = excluded.liste, nom = excluded.nom, maj = excluded.maj')
    .run(compte, i.fournisseur, i.cle, i.liste, i.nom, maintenant);
  // Une autre liste : tous les inscrits sont à y envoyer.
  d.prepare("UPDATE contacts SET synchro = '' WHERE compte = ?").run(compte);
}

/** Réserve le résumé de la semaine d'un compte : faux s'il est déjà parti. */
export const reserverResume = (compte: string, semaine: string, maintenant = Date.now()) =>
  Number(base().prepare('INSERT OR IGNORE INTO resumes (compte, semaine, envoye) VALUES (?, ?, ?)').run(compte, semaine, maintenant).changes) > 0;

/* ---- Export (droit d'accès et de portabilité) ---- */

/**
 * Tout ce que le serveur garde d'un compte, lisible par un humain et par une
 * machine. Les événements sortent sans l'empreinte du visiteur, qui ne dit
 * rien à personne.
 */
export function exporter(compte: string) {
  const d = base();
  const c = compteParId(compte);
  if (!c) throw new Error('Compte inconnu.');
  const medias = (d.prepare('SELECT id, extension, octets, cree FROM medias WHERE compte = ? ORDER BY cree').all(compte) as { id: string; extension: string; octets: Uint8Array; cree: number }[])
    .map(m => ({ fichier: `${m.id}.${m.extension}`, cree: new Date(m.cree).toISOString(), donnees: `data:image/${m.extension === 'jpg' ? 'jpeg' : 'webp'};base64,${Buffer.from(m.octets).toString('base64')}` }));
  const evenements = d.prepare('SELECT ts, type, bloc, source, appareil FROM evenements WHERE compte = ? ORDER BY ts').all(compte) as { ts: number; type: string; bloc: string | null; source: string; appareil: string }[];
  return {
    exporte: new Date().toISOString(),
    compte: {
      pseudo: c.pseudo, email: c.email || null, statut: c.statut, cree: new Date(c.cree).toISOString(),
      derniereConnexion: c.connexion ? new Date(c.connexion).toISOString() : null,
      conditionsAcceptees: c.cgu ? { version: c.cgu, le: c.cgu_le ? new Date(c.cgu_le).toISOString() : null } : null,
      abonnement: c.creem_abonnement ? { statut: c.abonnement_statut, finPeriode: c.fin_periode ? new Date(c.fin_periode).toISOString() : null, creemClient: c.creem_client, creemAbonnement: c.creem_abonnement } : null,
    },
    reglages: lireReglages(compte),
    blocs: lireBlocs(compte),
    images: medias,
    statistiques: evenements.map(e => ({ ...e, ts: new Date(e.ts).toISOString() })),
    inscrits: tousLesContacts(compte).map(c => ({ ...c, ts: new Date(c.ts).toISOString() })),
    listeBranchee: lireIntegration(compte) ? { fournisseur: lireIntegration(compte)!.fournisseur, liste: lireIntegration(compte)!.liste } : null,
  };
}

/* ---- Signalements (DSA, article 16) ---- */

export interface Signalement { id: string; compte: string; pseudo: string; motif: string; details: string; email: string; ts: number; statut: 'ouvert' | 'sans-suite' | 'suspendu'; decision: string; traite: number | null }

export function ajouterSignalement(s: { compte: string; motif: string; details: string; email: string }, maintenant = Date.now()): string {
  const id = nouvelId();
  base().prepare('INSERT INTO signalements (id, compte, motif, details, email, ts) VALUES (?, ?, ?, ?, ?, ?)').run(id, s.compte, s.motif, s.details, s.email, maintenant);
  return id;
}

export const signalementsDepuis = (depuis: number) => (base().prepare('SELECT COUNT(*) AS n FROM signalements WHERE ts > ?').get(depuis) as { n: number }).n;

/** Les signalements ouverts d'abord, puis les derniers traités. */
export function listerSignalements(): Signalement[] {
  return base().prepare(`SELECT s.id, s.compte, COALESCE(c.pseudo, '') AS pseudo, s.motif, s.details, s.email, s.ts, s.statut, s.decision, s.traite
    FROM signalements s LEFT JOIN comptes c ON c.id = s.compte ORDER BY s.statut = 'ouvert' DESC, s.ts DESC LIMIT 100`).all() as unknown as Signalement[];
}

export const signalementParId = (id: string) => base().prepare(`SELECT s.*, COALESCE(c.pseudo, '') AS pseudo FROM signalements s LEFT JOIN comptes c ON c.id = s.compte WHERE s.id = ?`).get(id) as Signalement | undefined;

export function traiterSignalement(id: string, statut: 'sans-suite' | 'suspendu', decision: string, maintenant = Date.now()) {
  base().prepare("UPDATE signalements SET statut = ?, decision = ?, traite = ? WHERE id = ? AND statut = 'ouvert'").run(statut, decision, maintenant, id);
}

/** Pour les tests : repartir d'une base neuve. */
export function fermer() { db?.close(); db = null; ephemere = false; derniere = 0; }

/* Le mode drop : une place par visiteur (une empreinte propre au bloc, voir `server/acces.ts`). */
export function placesParBloc(compte: string): Record<string, number> {
  const lignes = base().prepare('SELECT bloc, COUNT(*) AS n FROM acces WHERE compte = ? GROUP BY bloc').all(compte) as { bloc: string; n: number }[];
  return Object.fromEntries(lignes.map(l => [l.bloc, l.n]));
}

export function prendrePlace(compte: string, bloc: string, visiteur: string, places: number, maintenant = Date.now()): 'ok' | 'deja' | 'complet' {
  const d = base();
  if (d.prepare('SELECT 1 FROM acces WHERE bloc = ? AND visiteur = ?').get(bloc, visiteur)) return 'deja';
  if (places) {
    const { n } = d.prepare('SELECT COUNT(*) AS n FROM acces WHERE bloc = ?').get(bloc) as { n: number };
    if (n >= places) return 'complet';
  }
  d.prepare('INSERT OR IGNORE INTO acces (bloc, compte, visiteur, ts) VALUES (?, ?, ?, ?)').run(bloc, compte, visiteur, maintenant);
  return 'ok';
}

export const remettrePlaces = (compte: string, bloc: string) => base().prepare('DELETE FROM acces WHERE compte = ? AND bloc = ?').run(compte, bloc);
