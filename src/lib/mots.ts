/*
 * Les mots de la page publique elle-même (le formulaire, le compte à rebours,
 * les places d'un drop, le pied de page, l'écran qui propose le navigateur,
 * la vitrine),
 * au « tu » ou au « vous » selon ce que la personne a choisi pour ses visiteurs.
 */

/** Les dates et les nombres de la page, à la française. */
export const LOCALE = 'fr-FR';

const tu = {
  j: 'j', h: 'h', ouTrouver: 'Le code est donné en story, en live ou dans la newsletter.',
  rien: 'Rien ici pour l’instant.',
  partager: 'Partager cette page', copie: 'Lien copié', reseaux: 'Réseaux', verifie: 'Compte vérifié',
  confidentialite: 'Confidentialité', signaler: 'Signaler', hopla: 'Une page faite avec Hopla',
  bientot: 'Bientôt', ouvert: 'C’est ouvert', ouvreLe: (quand: string) => `Ouvre le ${quand}`,
  prenom: 'Prénom', prenomAria: 'Ton prénom', email: 'ton@email.fr', emailAria: 'Ton adresse e-mail', inscrire: 'Je m’inscris',
  mention: 'Ton adresse sert seulement à recevoir ces e-mails. Désinscription en un clic, quand tu veux.',
  merci: 'C’est noté, merci !', emailInvalide: 'Cette adresse e-mail ne semble pas valide.', tropDEssais: 'Trop d’essais. Réessaie dans quelques minutes.',
  echec: 'Ça n’est pas passé. Réessaie.', apercu: 'Dans l’aperçu, rien n’est envoyé.',
  code: 'Code d’accès', debloquer: 'Débloquer', reserver: 'Prendre ma place', ouvrir: 'Ouvrir le lien', mauvaisCode: 'Ce n’est pas le bon code.',
  complet: 'Complet', plusQueUne: 'Plus qu’une place', plusQue: (n: string) => `Plus que ${n} places`, places: (n: string) => `${n} places`,
  reserve: 'Accès réservé', debloque: 'C’est débloqué.', garde: 'Ta place est gardée.', indisponible: 'Ce lien n’est plus disponible.',
  avis: (n: string, source: string) => `${n} avis${source ? ` ${source}` : ''}`, sur5: 'sur 5', noteAria: (note: string) => `Noté ${note} sur 5`,
  // L'écran qui propose d'ouvrir la page hors de l'app (LinkedIn, Instagram…) : `safari` quand le bouton ouvre Safari.
  // Le bouton parle à la première personne, comme « Prendre ma place ».
  sortieTexte: (safari: boolean) => `Dans ${safari ? 'Safari' : 'ton navigateur habituel'}, tes\u00a0comptes sont déjà connectés.`,
  ouvrirDans: (safari: boolean) => (safari ? 'Ouvrir dans Safari' : 'Ouvrir mon navigateur'),
  copierLien: 'Copier le lien', copieRatee: 'La copie n’a pas marché.', continuerIci: 'Continuer ici',
  aideAvant: 'Rien ne s’ouvre ? Touche', aideApres: 'en haut à droite et choisis d’ouvrir dans le navigateur.', troisPoints: 'les trois points',
  // La vitrine : la mention d'un lien partenaire (loi du 9 juin 2023), son code promo, « Me soutenir » et la réservation.
  publicite: 'Publicité', collaboration: 'Collaboration commerciale',
  codePromo: 'Code', codeCopie: (code: string) => `Code ${code} copié`, copierCode: (code: string) => `Copier le code ${code}`,
  autreMontant: 'Autre montant', paiementSur: (site: string) => `Le paiement se fait sur ${site}.`, soutenirSur: (site: string) => `Soutenir sur ${site}`,
  ouvrirSur: (site: string) => `Ouvrir sur ${site}`, fermer: 'Fermer', chargement: 'Chargement…',
};
export type Textes = typeof tu;

/** Pour une page qui vouvoie ses visiteurs. */
const vous: Textes = {
  ...tu,
  prenomAria: 'Votre prénom', email: 'votre@email.fr', emailAria: 'Votre adresse e-mail', inscrire: 'Je m’inscris',
  mention: 'Votre adresse sert seulement à recevoir ces e-mails. Désinscription en un clic, quand vous voulez.',
  tropDEssais: 'Trop d’essais. Réessayez dans quelques minutes.', echec: 'Ça n’est pas passé. Réessayez.',
  garde: 'Votre place est gardée.', reserver: 'Réserver ma place',
  sortieTexte: (safari: boolean) => `Dans ${safari ? 'Safari' : 'votre navigateur habituel'}, vos\u00a0comptes sont déjà connectés.`,
  aideAvant: 'Rien ne s’ouvre ? Touchez', aideApres: 'en haut à droite et choisissez d’ouvrir dans le navigateur.',
};

export const textes = (vouvoiement = false): Textes => (vouvoiement ? vous : tu);
