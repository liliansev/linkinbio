import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Bloc, CompteResume, Reglages, Stats } from '../lib/types.ts';
import { PRINCIPAL } from '../lib/types.ts';
import { REGLAGES_DEFAUT, blocsDefaut, reglagesNouveauCompte } from '../lib/defauts.ts';
import { validerBloc, validerReglages } from '../lib/valider.ts';

/*
 * Toutes les pages tiennent dans un fichier SQLite (`node:sqlite`, rien à
 * installer). En production il vit sur le volume `/data` du conteneur. Si le
 * dossier n'est pas inscriptible (volume pas encore branché, ou contrôle avant
 * déploiement), la base s'ouvre en mémoire et le back office le signale : rien
 * n'y survivrait à un redémarrage.
 *
 * Plusieurs comptes : chaque page, bloc, média, événement et jeton porte le
 * `compte` qui le possède, et chaque fonction ci-dessous le prend en premier
 * argument. Le compte `principal` est celui de Lilian, servi sur /liens/ ; les
 * autres sur /liens/<pseudo>.
 */

let db: DatabaseSync | null = null;
let ephemere = false;

export const nouvelId = () => randomUUID().replace(/-/g, '').slice(0, 12);

/** Ce qu'un compte invité peut stocker en images ; le compte principal n'a pas de plafond. */
export const QUOTA_MEDIAS = 25 * 1024 * 1024;
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
  `);
  // Les tables d'avant les comptes : tout ce qu'elles contiennent est à Lilian.
  for (const table of ['blocs', 'medias', 'evenements', 'jetons']) colonne(db, table, 'compte', `TEXT NOT NULL DEFAULT '${PRINCIPAL}'`);
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS comptes_email ON comptes (email);
    CREATE INDEX IF NOT EXISTS blocs_compte ON blocs (compte, position);
    CREATE INDEX IF NOT EXISTS medias_compte ON medias (compte);
    DROP INDEX IF EXISTS evenements_jour;
    CREATE INDEX IF NOT EXISTS evenements_compte ON evenements (compte, jour, type);
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
  // On garde treize mois de statistiques.
  db.prepare('DELETE FROM evenements WHERE ts < ?').run(Date.now() - 400 * 86_400_000);
  db.prepare('DELETE FROM jetons WHERE expire < ?').run(Date.now());
  return db;
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

export interface Compte { id: string; email: string; pseudo: string; statut: 'actif' | 'suspendu'; cree: number; connexion: number | null }

const LIRE_COMPTE = 'SELECT id, email, pseudo, statut, cree, connexion FROM comptes';
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
    for (const table of ['blocs', 'medias', 'evenements', 'jetons']) d.prepare(`DELETE FROM ${table} WHERE compte = ?`).run(id);
    d.prepare('DELETE FROM pages WHERE compte = ?').run(id);
    d.prepare('DELETE FROM comptes WHERE id = ?').run(id);
    d.exec('COMMIT');
  } catch (error) { d.exec('ROLLBACK'); throw error; }
}

export const noterConnexion = (id: string, maintenant = Date.now()) => base().prepare('UPDATE comptes SET connexion = ? WHERE id = ?').run(maintenant, id);

/** La liste du back office de Lilian, avec de quoi juger l'activité de chaque page. */
export function listerComptes(maintenant = Date.now()): CompteResume[] {
  const lignes = base().prepare(`
    SELECT c.id, c.email, c.pseudo, c.statut, c.cree, c.connexion,
      (SELECT COUNT(*) FROM blocs b WHERE b.compte = c.id) AS blocs,
      (SELECT COUNT(*) FROM evenements e WHERE e.compte = c.id AND e.type = 'vue' AND e.ts > ?) AS vues
    FROM comptes c ORDER BY c.id = ? DESC, c.cree DESC`).all(maintenant - 30 * 86_400_000, PRINCIPAL) as (Omit<CompteResume, 'principal'>)[];
  return lignes.map(l => ({ ...l, principal: l.id === PRINCIPAL }));
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
    const { total } = d.prepare('SELECT COALESCE(SUM(LENGTH(octets)), 0) AS total FROM medias WHERE compte = ?').get(compte) as { total: number };
    if (total + octets.length > QUOTA_MEDIAS) throw new Error('Plus de place pour les images : supprime-en ou réutilise une image déjà envoyée.');
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

export function ajouterEvenement(e: { compte: string; type: 'vue' | 'clic'; bloc: string | null; visiteur: string; source: string; appareil: string; ts?: number }) {
  const ts = e.ts ?? Date.now();
  base().prepare('INSERT INTO evenements (compte, type, bloc, jour, ts, visiteur, source, appareil) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(e.compte, e.type, e.bloc, jourDe(ts), ts, e.visiteur, e.source, e.appareil);
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
  const blocs = (d.prepare(`SELECT bloc, COUNT(*) AS n FROM evenements WHERE compte = ? AND type = 'clic' AND jour BETWEEN ? AND ? GROUP BY bloc ORDER BY n DESC LIMIT 20`).all(compte, debut, fin) as { bloc: string; n: number }[])
    .map(l => ({ id: l.bloc, titre: titres.get(l.bloc) ?? 'Bloc supprimé', clics: l.n }));
  const groupe = (colonne: 'source' | 'appareil') => (d.prepare(`SELECT ${colonne} AS nom, COUNT(*) AS n FROM evenements WHERE compte = ? AND type = 'vue' AND jour BETWEEN ? AND ? GROUP BY ${colonne} ORDER BY n DESC LIMIT 8`).all(compte, debut, fin) as { nom: string; n: number }[])
    .map(l => ({ nom: l.nom, vues: l.n }));
  return {
    jours,
    vues: actuel.vues ?? 0, visiteurs: actuel.visiteurs ?? 0, clics: actuel.clics ?? 0,
    serie: jourListe.map(jour => ({ jour, vues: parJour.get(jour)?.vues ?? 0, clics: parJour.get(jour)?.clics ?? 0 })),
    blocs, sources: groupe('source'), appareils: groupe('appareil'),
    precedent: { vues: avant.vues ?? 0, visiteurs: avant.visiteurs ?? 0, clics: avant.clics ?? 0 },
  };
}

/** Pour les tests : repartir d'une base neuve. */
export function fermer() { db?.close(); db = null; ephemere = false; }
