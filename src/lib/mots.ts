/*
 * Les mots de la page publique elle-même (les formulaires, le compte à rebours,
 * les places d'un drop, le pied de page, la vitrine, les lecteurs, la galerie, un lien pour adultes),
 * au « tu » ou au « vous » selon ce que la personne a choisi pour ses visiteurs.
 */

/** Les dates et les nombres de la page, à la française. */
export const LOCALE = 'fr-FR';

const tu = {
  j: 'j', h: 'h', ouTrouver: 'Le code est donné en story, en live ou dans la newsletter.',
  rien: 'Rien ici pour l’instant.',
  partager: 'Partager cette page', copie: 'Lien copié', reseaux: 'Réseaux', verifie: 'Compte vérifié',
  confidentialite: 'Confidentialité', signaler: 'Signaler', signalerPage: 'Signaler cette page', creeTaPage: 'Crée ta page avec',
  // La barre Hopla des pages en Gratuit, à la première personne comme la mention d'avant : au tu comme au vous.
  barreHopla: 'Créer ma page gratuitement',
  bientot: 'Bientôt', ouvert: 'C’est ouvert', ouvreLe: (quand: string) => `Ouvre le ${quand}`,
  prenom: 'Prénom', prenomAria: 'Ton prénom', email: 'ton@email.fr', emailAria: 'Ton adresse e-mail', inscrire: 'Je m’inscris',
  mention: 'Ton adresse sert seulement à recevoir ces e-mails. Désinscription en un clic, quand tu veux.',
  merci: 'C’est noté, merci !', emailInvalide: 'Cette adresse e-mail ne semble pas valide.', tropDEssais: 'Trop d’essais. Réessaie dans quelques minutes.',
  echec: 'Ça n’est pas passé. Réessaie.', apercu: 'Dans l’aperçu, rien n’est envoyé.',
  code: 'Code d’accès', debloquer: 'Débloquer', reserver: 'Prendre ma place', ouvrir: 'Ouvrir le lien', mauvaisCode: 'Ce n’est pas le bon code.',
  complet: 'Complet', plusQueUne: 'Plus qu’une place', plusQue: (n: string) => `Plus que ${n} places`, places: (n: string) => `${n} places`,
  reserve: 'Accès réservé', debloque: 'C’est débloqué.', garde: 'Ta place est gardée.', indisponible: 'Ce lien n’est plus disponible.',
  avis: (n: string, source: string) => `${n} avis${source ? ` ${source}` : ''}`, sur5: 'sur 5', noteAria: (note: string) => `Noté ${note} sur 5`,
  // La vitrine : la mention d'un lien partenaire (loi du 9 juin 2023), son code promo, « Me soutenir » et la réservation.
  publicite: 'Publicité', collaboration: 'Collaboration commerciale',
  codePromo: 'Code', codeCopie: (code: string) => `Code ${code} copié`, copierCode: (code: string) => `Copier le code ${code}`, copieRatee: 'La copie n’a pas marché.',
  autreMontant: 'Autre montant', paiementSur: (site: string) => `Le paiement se fait sur ${site}.`, soutenirSur: (site: string) => `Soutenir sur ${site}`,
  ouvrirSur: (site: string) => `Ouvrir sur ${site}`, fermer: 'Fermer', chargement: 'Chargement…',
  // Les blocs venus de Linktree (24 octobre 2026) : un lecteur, une galerie, une carte de visite, une adresse, « Me contacter ».
  ecouter: (titre: string, service: string) => `Écouter ${titre} sur ${service}`, lireVideo: (titre: string) => `Lire la vidéo : ${titre}`,
  photo: (n: number, total: number) => `Photo ${n} sur ${total}`, photoPrecedente: 'Photo précédente', photoSuivante: 'Photo suivante',
  enregistrerContact: 'Enregistrer le contact', appeler: 'Appeler', ecrire: 'Écrire',
  itineraire: 'Itinéraire', voirCarte: 'Voir la carte', carteDe: (lieu: string) => `Carte : ${lieu}`,
  nom: 'Ton nom', nomAria: 'Ton nom (facultatif)', message: 'Ton message', messageAria: 'Ton message', envoyer: 'Envoyer',
  envoye: 'Message envoyé, merci ! Tu recevras la réponse par e-mail.', messageVide: 'Écris ton message.',
  mentionMessage: 'Ton adresse sert seulement à te répondre. Hopla ne garde pas ton message.',
  // Un lien réservé aux plus de 18 ans (24 octobre 2026) : sa mention, et la confirmation avant de l'ouvrir.
  adultes: '18+', reserveAdultes: 'Réservé aux plus de 18 ans', contenuAdultes: 'Ce lien mène à un contenu pour adultes.',
  dixHuitAns: 'J’ai 18 ans ou plus', revenir: 'Revenir',
  // Le lot 4 (24 octobre 2026) : les derniers articles d'un flux, le cadeau d'une liste e-mail.
  derniersArticles: 'Mes derniers articles', lireSur: (site: string) => `Lire sur ${site}`,
  enCadeau: (nom: string) => `En cadeau : ${nom}`, unCadeau: 'Un cadeau à l’inscription', ouvrirCadeau: 'Ouvrir mon cadeau', cadeauPret: 'C’est noté, merci ! Ton cadeau t’attend.',
};
export type Textes = typeof tu;

/** Pour une page qui vouvoie ses visiteurs. */
const vous: Textes = {
  ...tu,
  prenomAria: 'Votre prénom', email: 'votre@email.fr', emailAria: 'Votre adresse e-mail', inscrire: 'Je m’inscris',
  mention: 'Votre adresse sert seulement à recevoir ces e-mails. Désinscription en un clic, quand vous voulez.',
  tropDEssais: 'Trop d’essais. Réessayez dans quelques minutes.', echec: 'Ça n’est pas passé. Réessayez.',
  garde: 'Votre place est gardée.', reserver: 'Réserver ma place',
  nom: 'Votre nom', nomAria: 'Votre nom (facultatif)', message: 'Votre message', messageAria: 'Votre message',
  envoye: 'Message envoyé, merci ! Vous recevrez la réponse par e-mail.', messageVide: 'Écrivez votre message.',
  mentionMessage: 'Votre adresse sert seulement à vous répondre. Hopla ne garde pas votre message.',
  creeTaPage: 'Créez votre page avec',
  ouvrirCadeau: 'Ouvrir votre cadeau', cadeauPret: 'C’est noté, merci ! Votre cadeau vous attend.',
};

export const textes = (vouvoiement = false): Textes => (vouvoiement ? vous : tu);
