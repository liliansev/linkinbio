import { avecJeton, preparerTurnstile } from '../lib/turnstile.ts';
import { corrigerAdresse, renommerPage, renvoyerLien, reserverNom, verifierNom } from '../server/fonctions.ts';
import type { Langue } from '../lib/types.ts';
import type { ApiAccueil } from './Reserver.tsx';
import type { Inscription } from './textes.ts';

/*
 * Ce que le champ du nom demande au serveur, sur l'accueil comme sur les pages par fonction et les comparatifs.
 * La langue de l'accueil part avec chaque demande (8 novembre 2026) : la réponse est dans cette langue, et une page
 * créée depuis l'accueil anglais est en anglais.
 */

// Chaque envoi part avec son jeton anti-robot (lib/turnstile.ts), préparé dès qu'on tape un nom.
const api = (mode: Inscription, langue: Langue): ApiAccueil => ({
  verifier: nom => { preparerTurnstile('accueil'); return verifierNom({ data: nom }); },
  reserver: (nom, email) => avecJeton('accueil', jeton => reserverNom({ data: { nom, email, jeton, langue } })),
  // Une page pas encore ouverte reçoit de nouveau sa bienvenue (sinon un lien de connexion). En liste d'attente, la réservation se rappelle.
  renvoyer: (nom, email) => avecJeton('accueil', jeton => (mode === 'libre' ? renvoyerLien({ data: { nom, email, jeton, langue } }) : reserverNom({ data: { nom, email, jeton, langue } }))),
  corriger: (nom, ancienne, nouvelle) => avecJeton('accueil', jeton => corrigerAdresse({ data: { nom, ancienne, nouvelle, jeton, langue } })),
  renommer: (ancien, nouveau, email) => avecJeton('accueil', jeton => renommerPage({ data: { ancien, nouveau, email, jeton, langue } })),
});
/** Les quatre jeux : le mode d'inscription, puis la langue. Sans langue, le français, comme les pages d'avant. */
export const APIS = {
  libre: { en: api('libre', 'en'), fr: api('libre', 'fr') },
  attente: { en: api('attente', 'en'), fr: api('attente', 'fr') },
};
export const API = { libre: APIS.libre.fr, attente: APIS.attente.fr };
