import { createContext, useContext } from 'react';

/*
 * Les mots de l'accueil qui dépendent du mode d'inscription (voir
 * `server/attente.ts`) : en mode libre, on crée sa page tout de suite ; en
 * liste d'attente, on réserve son nom. Les questions vivent ici aussi : la
 * page les affiche et le <head> les reprend en données structurées.
 */

export type Inscription = 'libre' | 'attente';
export const ModeInscription = createContext<Inscription>('libre');
export const useInscription = () => useContext(ModeInscription);

/** Le bouton d'appel, en deux morceaux : la barre ne garde que le premier sur un petit écran. */
export const APPEL: Record<Inscription, [string, string]> = { libre: ['Créer', ' ma hopla'], attente: ['Réserver', ' mon nom'] };
export const appel = (m: Inscription) => APPEL[m].join('');

/**
 * `note` rassure sous le champ du nom ; `rassure` prend sa place à l'étape de
 * l'e-mail, au moment où l'on hésite ; `renvoi` suit un nouvel envoi.
 */
export const MOTS: Record<Inscription, { note: string; adresse: string; rassure: string; renvoi: string }> = {
  libre: {
    note: 'Gratuit, toutes les fonctions comprises. En ligne en deux minutes.',
    adresse: 'À quelle adresse t’envoyer le lien de ta page ?',
    rassure: 'Ni mot de passe ni carte bancaire : un lien arrive par e-mail, et l’on ne t’écrit que pour ta page.',
    renvoi: 'C’est renvoyé. Ce nouveau lien marche pendant 15 minutes.',
  },
  attente: {
    note: 'Gratuit, toutes les fonctions comprises.',
    adresse: 'À quelle adresse t’envoyer ton invitation ?',
    rassure: 'Ni carte bancaire ni engagement : on ne t’écrit que pour ton invitation.',
    renvoi: 'C’est renvoyé.',
  },
};

export const DESCRIPTION = 'Ta page de liens sur hopla.page/ton-nom : elle se réorganise selon le réseau et l’heure, ouvre tes liens dans leurs apps et se modifie depuis ton téléphone. Gratuit, toutes les fonctions comprises.';

/** Ce que fait Hopla, en une liste, pour les données structurées et llms.txt : les fonctions de l'offre gratuite. */
export const FONCTIONS = [
  'Ordre des liens selon le réseau d’origine du visiteur (Instagram, TikTok, YouTube…)',
  'Liens mis en avant selon l’heure et le jour, compte à rebours avant un lancement',
  'Liens YouTube, Spotify et autres ouverts dans leur app depuis Instagram ou TikTok',
  'Drops : liens débloqués avec un code ou pour un nombre de places',
  'Collecte d’e-mails vers Brevo, Mailchimp ou un fichier CSV',
  'Avis, vidéos lues sur la page et QR code',
  'Page en cinq langues',
  'Vingt thèmes et couleurs personnalisées',
  'Statistiques sans cookie, résumées en phrases, et e-mail du lundi',
  'Modification de la page depuis le téléphone',
];

export function questions(m: Inscription): [string, string][] {
  return [
    ['C’est quoi, Hopla ?', 'Une page de liens à mettre dans ta bio Instagram, TikTok ou YouTube, sur hopla.page/ton-nom. Elle change l’ordre de ses liens selon le réseau d’où l’on vient et l’heure qu’il est, ouvre tes liens dans leurs apps et se modifie depuis ton téléphone.'],
    ['C’est vraiment gratuit ?', 'Oui, et toutes les fonctions sont comprises. Pro enlève la mention « Une page faite avec Hopla » et garde tes stats sur 30 jours, 90 jours et un an.'],
    m === 'libre'
      ? ['Combien de temps pour avoir ma page ?', 'Deux minutes. Tu choisis ton nom, tu laisses ton adresse, et le lien pour entrer dans ta page arrive par e-mail. Quatre questions plus tard, elle est en ligne.']
      : ['Quand aurai-je ma page ?', 'On ouvre les pages petit à petit, dans l’ordre des réservations. Ton invitation arrive par e-mail, avec un lien valable une semaine ; quatre questions plus tard, ta page est en ligne.'],
    m === 'libre'
      ? ['Quelle sera mon adresse ?', 'hopla.page/ suivi du nom que tu choisis ici : 3 à 30 caractères, lettres, chiffres et tirets. Une fois pris, un nom n’est donné à personne d’autre.']
      : ['Quelle sera mon adresse ?', 'hopla.page/ suivi du nom que tu réserves ici : 3 à 30 caractères, lettres, chiffres et tirets. Un nom réservé n’est donné à personne d’autre.'],
    ['En quoi Hopla change d’une page de liens classique ?', 'Ta page se réorganise toute seule selon le réseau et l’heure, tes liens s’ouvrent dans leurs apps plutôt que dans le navigateur d’Instagram, et tes stats se lisent en une phrase, sans cookie. Et tout ça est gratuit.'],
    ['Comment Hopla sait d’où vient un visiteur ?', 'Instagram, TikTok et les autres apps se signalent quand elles ouvrent ta page. Tu mets un seul lien dans toutes tes bios, Hopla fait le tri. Quand rien ne le dit, par exemple un lien envoyé sur WhatsApp ou tapé dans Safari, ta page garde l’ordre que tu as choisi.'],
    ['Mes visiteurs sont-ils pistés ?', 'Non. Aucun cookie, aucune publicité, aucun traceur d’un site à l’autre. Les stats comptent les visites sans garder l’adresse IP : pas de bannière à imposer à tes visiteurs.'],
    ['Je peux partir avec mes données ?', 'Oui. Ta page, tes stats et ta liste e-mail s’exportent en un clic depuis Réglages, et ton compte se supprime de la même façon.'],
    ['Comment résilier Pro ?', 'Depuis ton compte, à tout moment. Le Pro reste actif jusqu’à la fin de la période payée, puis ta page repasse en gratuit avec tous ses liens.'],
  ];
}
