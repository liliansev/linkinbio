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
export const APPEL: Record<Inscription, [string, string]> = { libre: ['Créer', ' ma page'], attente: ['Réserver', ' mon nom'] };
export const appel = (m: Inscription) => APPEL[m].join('');

/**
 * `note` rassure sous le champ du nom ; `rassure` prend sa place à l'étape de
 * l'e-mail, au moment où l'on hésite, et `envoyer` y nomme le bouton ; `duree`
 * dit combien de temps marche le lien parti, `renvoi` suit un nouvel envoi ;
 * `fin` titre la fin de page une fois l'e-mail parti.
 */
export const MOTS: Record<Inscription, { note: string; adresse: string; rassure: string; envoyer: string; duree: string; renvoi: string; fin: string }> = {
  libre: {
    note: 'Gratuit pour toujours. En ligne en deux minutes.',
    adresse: 'À quelle adresse e‑mail t’envoyer le lien de ta page ?',
    rassure: 'Ni mot de passe ni carte bancaire : un lien arrive par e‑mail, et on ne t’écrit que pour ta page.',
    envoyer: 'Recevoir mon lien',
    duree: 'Le lien marche 7 jours ; entre dans ta page dans le mois pour garder ton nom.',
    renvoi: 'C’est renvoyé.',
    fin: 'Ton lien t’attend dans ta boîte.',
  },
  attente: {
    note: 'Gratuit pour toujours, sans carte bancaire.',
    adresse: 'À quelle adresse e‑mail t’envoyer ton invitation ?',
    rassure: 'Ni carte bancaire ni engagement : on ne t’écrit que pour ton invitation.',
    envoyer: 'Garder ce nom',
    duree: '',
    renvoi: 'C’est renvoyé.',
    fin: 'Ton nom est gardé pour toi.',
  },
};

export const DESCRIPTION = 'Ta page de liens sur hopla.page/ton-nom : elle se réorganise selon le réseau d’où arrive ton visiteur, ouvre tes liens dans leurs apps et se modifie depuis ton téléphone. Gratuit pour toujours ; Starter et Pro y ajoutent ta vitrine, tes couleurs, tes liens programmés, la page selon l’heure et tes stats.';

/**
 * Ce que fait Hopla, en une liste, pour les données structurées et llms.txt ;
 * l'offre qui débloque une fonction est dite entre parenthèses (comme dans
 * `OFFRES`, lib/abonnement.ts), le reste est dans Gratuit.
 */
export const FONCTIONS = [
  'Ordre des liens selon le réseau d’origine du visiteur',
  'Liens YouTube, Spotify et autres ouverts dans leur app depuis Instagram ou TikTok',
  'Liens sans limite, vidéos lues sur la page et QR code',
  'Vingt thèmes',
  'Modification de la page depuis le téléphone',
  'Liens partenaires avec la mention « Publicité » que demande la loi',
  'Page sans la mention « Une page faite avec Hopla » (Starter)',
  'Vitrine sans commission : produits avec leur photo et leur prix lus sur la boutique, prise de rendez-vous Calendly ou Cal.com dans la page, bouton de soutien PayPal ou Ko‑fi, code promo copié d’un geste (Starter)',
  'Couleurs personnalisées par-dessus le thème (Starter)',
  'Liens programmés à l’avance, compte à rebours avant un lancement (Starter)',
  'Avis de clients (Starter)',
  'Statistiques sans cookie sur 30 jours, résumées en phrases, et e-mail du lundi (Starter)',
  'Ordre des liens selon l’heure (Pro)',
  'Drops : liens débloqués avec un code ou pour un nombre de places (Pro)',
  'Collecte d’e-mails vers ta newsletter (Brevo, Mailchimp, Kit, MailerLite, beehiiv, Systeme.io, Substack), vers Make, Zapier ou n8n, ou en fichier CSV (Pro)',
  'Statistiques sur un an (Pro)',
];

/** La question de celui qui a déjà un Linktree : sa réponse mène au champ. */
export const QUESTION_LINKTREE = 'J’ai déjà un Linktree. Comment passer à Hopla ?';

export function questions(m: Inscription): [string, string][] {
  return [
    ['C’est quoi, Hopla ?', 'Une page de liens à mettre dans ta bio Instagram, TikTok ou YouTube, sur hopla.page/ton-nom. Elle change l’ordre de ses liens selon le réseau d’où arrive ton visiteur (et selon l’heure, avec Pro), ouvre tes liens dans leurs apps et se modifie depuis ton téléphone.'],
    ['C’est vraiment gratuit ?', 'Oui, pour toujours : des liens sans limite, une page qui se réorganise selon le réseau du visiteur, et les vingt thèmes. Starter retire la mention « Une page faite avec Hopla » et ajoute tes couleurs, tes liens programmés à l’avance, les avis de tes clients et tes stats sur 30 jours ; Pro réorganise ta page selon l’heure, avec les drops, ta liste e‑mail et un an de stats.'],
    m === 'libre'
      ? ['Combien de temps pour avoir ma page ?', 'Deux minutes. Tu choisis ton nom, tu laisses ton e‑mail, et le lien pour entrer dans ta page arrive par e‑mail. Quatre questions plus tard, elle est en ligne.']
      : ['Quand aurai-je ma page ?', 'On ouvre les pages petit à petit, dans l’ordre des réservations. Ton invitation arrive par e‑mail, avec un lien valable une semaine ; quatre questions plus tard, ta page est en ligne.'],
    m === 'libre'
      ? ['Quelle sera mon adresse ?', 'hopla.page/ suivi du nom que tu choisis ici : 3 à 30 caractères, lettres, chiffres et tirets. Une fois pris, un nom n’est donné à personne d’autre, sauf si personne n’entre jamais dans la page : elle s’efface au bout d’un mois. Une faute de frappe ? Juste après l’envoi, tant que tu n’es pas entré dans ta page, tu peux encore le changer.']
      : ['Quelle sera mon adresse ?', 'hopla.page/ suivi du nom que tu réserves ici : 3 à 30 caractères, lettres, chiffres et tirets. Un nom réservé n’est donné à personne d’autre. Une faute de frappe ? Juste après la réservation, tu peux encore le changer.'],
    ['Je peux vendre depuis ma page ?', 'Oui, avec Starter. Colle l’adresse d’un produit (Etsy, Shopify, Gumroad, Payhip…) : Hopla affiche sa photo et son prix. Ajoute ta prise de rendez-vous Calendly, Cal.com ou Planity, et un bouton « Me soutenir » vers PayPal, Ko‑fi ou Tipeee. Le paiement se fait chez eux : Hopla ne prend aucune commission. Tes liens partenaires portent la mention « Publicité » dans toutes les versions, et leur code promo se copie d’un geste.'],
    ['En quoi Hopla change d’une page de liens classique ?', 'Ta page se réorganise toute seule selon le réseau d’où arrive ton visiteur (et selon l’heure, avec Pro), tes liens s’ouvrent dans leurs apps plutôt que dans le navigateur d’Instagram, et tes stats se lisent en une phrase, sans cookie (avec Starter).'],
    [QUESTION_LINKTREE, 'Colle ton adresse Linktree dans le champ : Hopla en garde le nom, s’il est libre ici. Ensuite, dans ta page, colle les adresses de tes liens, Hopla retrouve leurs titres tout seul. Il ne reste qu’à mettre hopla.page/ton-nom à la place de l’ancien lien dans tes bios.'],
    ['Comment Hopla sait d’où vient un visiteur ?', 'Instagram, TikTok et les autres apps se signalent quand elles ouvrent ta page. Tu mets un seul lien dans toutes tes bios, Hopla fait le tri. Quand rien ne le dit, par exemple un lien envoyé sur WhatsApp ou tapé dans Safari, ta page garde l’ordre que tu as choisi.'],
    ['Mes visiteurs sont-ils pistés ?', 'Non. Aucun cookie, aucune publicité, aucun traceur d’un site à l’autre. Les stats comptent les visites sans garder l’adresse IP : pas de bannière à imposer à tes visiteurs.'],
    ['Je peux partir avec mes données ?', 'Oui. Ta page, tes stats et ta liste e‑mail s’exportent en un clic depuis Réglages, et ton compte se supprime de la même façon.'],
    ['Comment changer d’offre ou résilier ?', 'Depuis tes réglages, à tout moment. Un changement d’offre compte tout de suite ; une résiliation laisse ton offre active jusqu’à la fin de la période payée, puis ta page repasse en Gratuit avec tous ses liens.'],
  ];
}
