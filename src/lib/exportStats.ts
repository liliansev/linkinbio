import type { Langue, Stats } from './types.ts';

/*
 * Les stats d'une période en CSV (10 novembre 2026, lot 4 d'après Taap.it) : un seul fichier, une ligne par chiffre,
 * rangée par tableau (jours, liens, provenances, pays, villes, appareils, systèmes, navigateurs, langues). Un tableur
 * filtre sur la première colonne. Point-virgule et marque d'ordre des octets, comme la liste des inscrits : Excel l'ouvre
 * sans réglage.
 */

/** Une cellule sûre : entre guillemets s'il le faut, et jamais lue comme une formule (une provenance est écrite par qui veut). */
const cellule = (v: string | number) => {
  if (typeof v === 'number') return String(v);
  const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function csvStats(stats: Stats, langue: Langue = 'fr'): string {
  const l = (fr: string, en: string) => (langue === 'fr' ? fr : en);
  const inconnu = l('Inconnu', 'Unknown');
  const lignes: (string | number)[][] = [[l('tableau', 'table'), l('nom', 'name'), l('vues', 'views'), l('visiteurs', 'visitors'), l('clics', 'clicks')]];
  for (const j of stats.serie) lignes.push([l('jour', 'day'), j.jour, j.vues, j.visiteurs, j.clics]);
  for (const b of stats.blocs) lignes.push([l('lien', 'link'), b.titre, '', '', b.clics]);
  const vues = (tableau: string, liste: { nom: string; vues: number }[]) => { for (const x of liste) lignes.push([tableau, x.nom || inconnu, x.vues, '', '']); };
  vues(l('provenance', 'source'), stats.sources);
  vues(l('pays', 'country'), stats.pays.map(p => ({ nom: p.code, vues: p.vues })));
  vues(l('ville', 'city'), stats.villes.map(v => ({ nom: v.code ? `${v.nom} (${v.code})` : v.nom, vues: v.vues })));
  vues(l('appareil', 'device'), stats.appareils);
  vues(l('système', 'operating system'), stats.systemes);
  vues(l('navigateur', 'browser'), stats.navigateurs);
  vues(l('langue', 'language'), stats.langues);
  return `﻿${lignes.map(c => c.map(cellule).join(';')).join('\n')}\n`;
}
