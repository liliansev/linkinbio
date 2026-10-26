import handler, { createServerEntry } from '@tanstack/react-start/server-entry';
import { planifierResumes } from './server/resume.ts';
import { planifierAvis } from './server/avis.ts';
import { planifierFinsDEssai } from './server/essai.ts';
import * as creem from './server/creem.ts';

/*
 * L'entrée du serveur (26 octobre 2026). Les tâches planifiées démarrent ici,
 * et non plus en tête de fonctions.ts : un appel au chargement d'un module
 * gardait ses imports (la base, l'authentification, Creem…) dans le
 * JavaScript du navigateur.
 */

// Le résumé de la semaine part le lundi matin (voir resume.ts).
planifierResumes();
planifierAvis();
// La fin de l'essai de Pro se dit par e-mail, trois jours avant puis le jour venu (voir essai.ts).
planifierFinsDEssai();
// Les prix des produits sont relus dans Creem au démarrage, puis toutes les heures (voir creem.ts).
creem.planifierRelecture();

export default createServerEntry({ fetch: handler.fetch });
