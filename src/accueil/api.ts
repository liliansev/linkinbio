import { avecJeton, preparerTurnstile } from '../lib/turnstile.ts';
import { corrigerAdresse, renommerPage, renvoyerLien, reserverNom, verifierNom } from '../server/fonctions.ts';
import type { ApiAccueil } from './Reserver.tsx';
import type { Inscription } from './textes.ts';

/* Ce que le champ du nom demande au serveur, sur l'accueil comme sur les pages par fonction et les comparatifs. */

// Chaque envoi part avec son jeton anti-robot (lib/turnstile.ts), préparé dès qu'on tape un nom.
const api = (mode: Inscription): ApiAccueil => ({
  verifier: nom => { preparerTurnstile('accueil'); return verifierNom({ data: nom }); },
  reserver: (nom, email) => avecJeton('accueil', jeton => reserverNom({ data: { nom, email, jeton } })),
  // Une page pas encore ouverte reçoit de nouveau sa bienvenue (sinon un lien de connexion). En liste d'attente, la réservation se rappelle.
  renvoyer: (nom, email) => avecJeton('accueil', jeton => (mode === 'libre' ? renvoyerLien({ data: { nom, email, jeton } }) : reserverNom({ data: { nom, email, jeton } }))),
  corriger: (nom, ancienne, nouvelle) => avecJeton('accueil', jeton => corrigerAdresse({ data: { nom, ancienne, nouvelle, jeton } })),
  renommer: (ancien, nouveau, email) => avecJeton('accueil', jeton => renommerPage({ data: { ancien, nouveau, email, jeton } })),
});
export const API = { libre: api('libre'), attente: api('attente') };
