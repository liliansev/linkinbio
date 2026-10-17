import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Bloc, Reglages, Stats } from '../lib/types.ts';
import { REGLAGES_DEFAUT, blocsDefaut } from '../lib/defauts.ts';
import { validerBloc, validerReglages } from '../lib/valider.ts';

/*
 * Toute la page tient dans un fichier SQLite (`node:sqlite`, rien à installer).
 * En production il vit sur le volume `/data` du conteneur. Si le dossier n'est
 * pas inscriptible (volume pas encore branché, ou contrôle avant déploiement),
 * la base s'ouvre en mémoire et le back office le signale : rien n'y survivrait
 * à un redémarrage.
 */

let db: DatabaseSync | null = null;
let ephemere = false;

export const nouvelId = () => randomUUID().replace(/-/g, '').slice(0, 12);

function chemin() {
  if (process.env.LIENS_DB) return process.env.LIENS_DB;
  return process.env.NODE_ENV === 'production' ? '/data/liens.db' : resolve(process.cwd(), '.data/liens.db');
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
    CREATE TABLE IF NOT EXISTS blocs (id TEXT PRIMARY KEY, position INTEGER NOT NULL, donnees TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS medias (id TEXT PRIMARY KEY, extension TEXT NOT NULL, octets BLOB NOT NULL, cree INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS evenements (
      id INTEGER PRIMARY KEY, type TEXT NOT NULL, bloc TEXT, jour TEXT NOT NULL, ts INTEGER NOT NULL,
      visiteur TEXT NOT NULL, source TEXT NOT NULL, appareil TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS evenements_jour ON evenements (jour, type);
    CREATE TABLE IF NOT EXISTS jetons (hash TEXT PRIMARY KEY, type TEXT NOT NULL, expire INTEGER NOT NULL, cree INTEGER NOT NULL);
  `);
  if (!db.prepare('SELECT 1 FROM reglages WHERE cle = ?').get('page')) {
    db.prepare('INSERT INTO reglages (cle, valeur) VALUES (?, ?)').run('page', JSON.stringify(REGLAGES_DEFAUT));
    const inserer = db.prepare('INSERT INTO blocs (id, position, donnees) VALUES (?, ?, ?)');
    blocsDefaut(nouvelId).forEach((bloc, i) => inserer.run(bloc.id, i, JSON.stringify(bloc)));
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

export function lireReglages(): Reglages {
  const ligne = base().prepare('SELECT valeur FROM reglages WHERE cle = ?').get('page') as { valeur: string };
  return validerReglages(JSON.parse(ligne.valeur), REGLAGES_DEFAUT);
}

export function ecrireReglages(reglages: Reglages) {
  base().prepare('UPDATE reglages SET valeur = ? WHERE cle = ?').run(JSON.stringify(reglages), 'page');
}

export function lireBlocs(): Bloc[] {
  const lignes = base().prepare('SELECT id, donnees FROM blocs ORDER BY position, rowid').all() as { id: string; donnees: string }[];
  return lignes.map(ligne => validerBloc(JSON.parse(ligne.donnees), ligne.id));
}

/** Un bloc nouveau s'ajoute en tête, comme on l'attend d'une page de liens. */
export function enregistrerBloc(bloc: Bloc) {
  const d = base();
  if (d.prepare('SELECT 1 FROM blocs WHERE id = ?').get(bloc.id)) {
    d.prepare('UPDATE blocs SET donnees = ? WHERE id = ?').run(JSON.stringify(bloc), bloc.id);
  } else {
    if ((d.prepare('SELECT COUNT(*) AS n FROM blocs').get() as { n: number }).n >= 200) throw new Error('Deux cents blocs au plus.');
    const { min } = d.prepare('SELECT COALESCE(MIN(position), 0) AS min FROM blocs').get() as { min: number };
    d.prepare('INSERT INTO blocs (id, position, donnees) VALUES (?, ?, ?)').run(bloc.id, min - 1, JSON.stringify(bloc));
  }
}

export function supprimerBloc(id: string) {
  base().prepare('DELETE FROM blocs WHERE id = ?').run(id);
}

export function ordonner(ids: string[]) {
  const d = base();
  const maj = d.prepare('UPDATE blocs SET position = ? WHERE id = ?');
  d.exec('BEGIN');
  try { ids.forEach((id, i) => maj.run(i, id)); d.exec('COMMIT'); } catch (error) { d.exec('ROLLBACK'); throw error; }
}

export function ajouterMedia(octets: Uint8Array, extension: 'webp' | 'jpg'): string {
  const id = nouvelId();
  base().prepare('INSERT INTO medias (id, extension, octets, cree) VALUES (?, ?, ?, ?)').run(id, extension, octets, Date.now());
  return id;
}

export function lireMedia(id: string, extension: string): Uint8Array | null {
  const ligne = base().prepare('SELECT octets FROM medias WHERE id = ? AND extension = ?').get(id, extension) as { octets: Uint8Array } | undefined;
  return ligne?.octets ?? null;
}

/* ---- Jetons de connexion et sessions (on ne garde que leur empreinte) ---- */

export function ajouterJeton(hash: string, type: 'connexion' | 'session', dureeMs: number) {
  base().prepare('INSERT INTO jetons (hash, type, expire, cree) VALUES (?, ?, ?, ?)').run(hash, type, Date.now() + dureeMs, Date.now());
}

/** Vrai si le jeton existe, est de ce type et n'a pas expiré. `consommer` l'efface. */
export function verifierJeton(hash: string, type: 'connexion' | 'session', consommer = false): boolean {
  const d = base();
  const ok = !!d.prepare('SELECT 1 FROM jetons WHERE hash = ? AND type = ? AND expire > ?').get(hash, type, Date.now());
  if (ok && consommer) d.prepare('DELETE FROM jetons WHERE hash = ?').run(hash);
  return ok;
}

export const supprimerJeton = (hash: string) => base().prepare('DELETE FROM jetons WHERE hash = ?').run(hash);

/** Combien de liens de connexion envoyés depuis `depuis` (limite anti-abus). */
export function jetonsRecents(depuis: number): { n: number; dernier: number } {
  return base().prepare("SELECT COUNT(*) AS n, COALESCE(MAX(cree), 0) AS dernier FROM jetons WHERE type = 'connexion' AND cree > ?").get(depuis) as { n: number; dernier: number };
}

/* ---- Statistiques ---- */

const formatJour = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' });
export const jourDe = (ts: number) => formatJour.format(ts);

export function evenementsDuJour(maintenant = Date.now()): number {
  return (base().prepare('SELECT COUNT(*) AS n FROM evenements WHERE jour = ?').get(jourDe(maintenant)) as { n: number }).n;
}

export function ajouterEvenement(e: { type: 'vue' | 'clic'; bloc: string | null; visiteur: string; source: string; appareil: string; ts?: number }) {
  const ts = e.ts ?? Date.now();
  base().prepare('INSERT INTO evenements (type, bloc, jour, ts, visiteur, source, appareil) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(e.type, e.bloc, jourDe(ts), ts, e.visiteur, e.source, e.appareil);
}

export function clicsParBloc(jours = 30): Record<string, number> {
  const lignes = base().prepare("SELECT bloc, COUNT(*) AS n FROM evenements WHERE type = 'clic' AND ts > ? GROUP BY bloc").all(Date.now() - jours * 86_400_000) as { bloc: string; n: number }[];
  return Object.fromEntries(lignes.map(l => [l.bloc, l.n]));
}

export function stats(jours: number, maintenant = Date.now()): Stats {
  const d = base();
  const jourListe: string[] = [];
  for (let i = jours - 1; i >= 0; i--) jourListe.push(jourDe(maintenant - i * 86_400_000));
  const debut = jourListe[0], fin = jourListe[jourListe.length - 1];
  const debutPrecedent = jourDe(maintenant - (2 * jours - 1) * 86_400_000);
  const totaux = (de: string, a: string) => d.prepare(`
    SELECT SUM(type = 'vue') AS vues, SUM(type = 'clic') AS clics, COUNT(DISTINCT CASE WHEN type = 'vue' THEN visiteur END) AS visiteurs
    FROM evenements WHERE jour BETWEEN ? AND ?`).get(de, a) as { vues: number | null; clics: number | null; visiteurs: number };
  const actuel = totaux(debut, fin);
  const avant = totaux(debutPrecedent, jourListe.length > 1 ? jourDe(maintenant - jours * 86_400_000) : debutPrecedent);
  const parJour = new Map((d.prepare(`SELECT jour, SUM(type = 'vue') AS vues, SUM(type = 'clic') AS clics FROM evenements WHERE jour BETWEEN ? AND ? GROUP BY jour`).all(debut, fin) as { jour: string; vues: number; clics: number }[]).map(l => [l.jour, l]));
  const titres = new Map(lireBlocs().map(b => [b.id, b.titre || b.url]));
  const blocs = (d.prepare(`SELECT bloc, COUNT(*) AS n FROM evenements WHERE type = 'clic' AND jour BETWEEN ? AND ? GROUP BY bloc ORDER BY n DESC LIMIT 20`).all(debut, fin) as { bloc: string; n: number }[])
    .map(l => ({ id: l.bloc, titre: titres.get(l.bloc) ?? 'Bloc supprimé', clics: l.n }));
  const groupe = (colonne: 'source' | 'appareil') => (d.prepare(`SELECT ${colonne} AS nom, COUNT(*) AS n FROM evenements WHERE type = 'vue' AND jour BETWEEN ? AND ? GROUP BY ${colonne} ORDER BY n DESC LIMIT 8`).all(debut, fin) as { nom: string; n: number }[])
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
