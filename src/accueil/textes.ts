import { createContext, useContext } from 'react';
import type { Langue } from '../lib/types.ts';

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
export const APPEL: Record<Langue, Record<Inscription, [string, string]>> = {
  fr: { libre: ['Créer', ' ma page'], attente: ['Réserver', ' mon nom'] },
  en: { libre: ['Create', ' my page'], attente: ['Claim', ' my name'] },
};
export const appel = (m: Inscription, langue: Langue = 'fr') => APPEL[langue][m].join('');

type Mots = { note: string; adresse: string; rassure: string; envoyer: string; duree: string; renvoi: string; fin: string };
/**
 * `note` rassure sous le champ du nom ; `rassure` prend sa place à l'étape de
 * l'e-mail, au moment où l'on hésite, et `envoyer` y nomme le bouton ; `duree`
 * dit combien de temps marche le lien parti, `renvoi` suit un nouvel envoi ;
 * `fin` titre la fin de page une fois l'e-mail parti.
 */
export const MOTS: Record<Langue, Record<Inscription, Mots>> = {
  fr: {
    libre: {
      note: '14 jours avec toutes les fonctions, sans carte. En ligne en deux minutes.',
      adresse: 'À quelle adresse e‑mail t’envoyer le lien de ta page ?',
      rassure: 'Ni mot de passe ni carte bancaire : un lien arrive par e‑mail, et on ne t’écrit que pour ta page.',
      envoyer: 'Recevoir mon lien',
      duree: 'Le lien marche 7 jours.',
      renvoi: 'C’est renvoyé.',
      fin: 'Ton lien t’attend dans ta boîte.',
    },
    attente: {
      note: '14 jours avec toutes les fonctions, sans carte bancaire.',
      adresse: 'À quelle adresse e‑mail t’envoyer ton invitation ?',
      rassure: 'Ni carte bancaire ni engagement : on ne t’écrit que pour ton invitation.',
      envoyer: 'Garder ce nom',
      duree: '',
      renvoi: 'C’est renvoyé.',
      fin: 'Ton nom est gardé pour toi.',
    },
  },
  en: {
    libre: {
      note: '14 days with every feature, no card. Live in two minutes.',
      adresse: 'Which email should we send your page link to?',
      rassure: 'No password, no credit card: a link arrives by email, and we only write to you about your page.',
      envoyer: 'Get my link',
      duree: 'The link works for 7 days.',
      renvoi: 'Sent again.',
      fin: 'Your link is waiting in your inbox.',
    },
    attente: {
      note: '14 days with every feature, no credit card.',
      adresse: 'Which email should we send your invite to?',
      rassure: 'No credit card, no commitment: we only write to you about your invite.',
      envoyer: 'Save this name',
      duree: '',
      renvoi: 'Sent again.',
      fin: 'Your name is saved for you.',
    },
  },
};

export const DESCRIPTION: Record<Langue, string> = {
  fr: 'Ta page de liens sur hopla.page/ton-nom : elle se réorganise selon le réseau d’où arrive ton visiteur, ouvre tes liens dans leurs apps et se modifie depuis ton téléphone. 14 jours avec toutes les fonctions à l’inscription, puis gratuit pour toujours.',
  en: 'Your link in bio page at hopla.page/your-name: it reorders itself based on the network your visitor comes from, opens your links in their apps and is edited from your phone. 14 days with every feature when you sign up, then free forever.',
};

/**
 * Ce que fait Hopla, en une liste, pour les données structurées et llms.txt ;
 * l'offre qui débloque une fonction est dite entre parenthèses (comme dans
 * `OFFRES`, lib/abonnement.ts), le reste est dans Gratuit.
 */
export const FONCTIONS: Record<Langue, string[]> = {
  fr: [
    'Ordre des liens selon le réseau d’origine du visiteur',
    'Liens YouTube, Spotify et autres ouverts dans leur app depuis Instagram ou TikTok',
    'Cinq blocs, vidéos lues sur la page et QR code',
    'Quatorze jours de Pro offerts à l’inscription, sans carte bancaire',
    'Vingt-quatre thèmes',
    'Modification de la page depuis le téléphone',
    'Liens partenaires avec la mention « Publicité » que demande la loi',
    'Page sans la barre Hopla (Starter)',
    'Blocs sans limite (Starter)',
    'Vitrine sans commission : produits avec leur photo et leur prix lus sur la boutique, prise de rendez-vous Calendly ou Cal.com dans la page, bouton de soutien PayPal ou Ko‑fi, code promo copié d’un geste (Starter)',
    'Couleurs personnalisées par-dessus le thème (Starter)',
    'Liens programmés à l’avance, compte à rebours avant un lancement (Starter)',
    'Avis de clients (Starter)',
    'Statistiques sans cookie sur 30 jours, résumées en phrases, et e-mail du lundi (Starter)',
    'Ordre des liens selon l’heure (Pro)',
    'Drops : liens débloqués avec un code ou pour un nombre de places (Pro)',
    'Collecte d’e-mails vers ta newsletter (Brevo, Mailchimp, Kit, MailerLite, beehiiv, Systeme.io, Substack), vers Make, Zapier ou n8n, ou en fichier CSV (Pro)',
    'Statistiques sur un an (Pro)',
  ],
  en: [
    'Links reordered based on the network the visitor comes from',
    'YouTube, Spotify and other links opened in their app from Instagram or TikTok',
    'Five blocks, videos played on the page, and a QR code',
    'Fourteen days of Pro free when you sign up, no credit card',
    'Twenty-four themes',
    'Edit your page from your phone',
    'Affiliate links with the “Ad” disclosure the FTC requires',
    'Page without the Hopla bar (Starter)',
    'Unlimited blocks (Starter)',
    'Storefront with no commission: products with the photo and price read from your store, Calendly or Cal.com booking inside the page, PayPal or Ko‑fi tip button, promo code copied in one tap (Starter)',
    'Custom colors on top of the theme (Starter)',
    'Scheduled links and a countdown before a launch (Starter)',
    'Customer reviews (Starter)',
    'Cookie-free analytics over 30 days, summed up in plain sentences, plus a Monday email (Starter)',
    'Links reordered by time of day (Pro)',
    'Drops: links unlocked with a code or for a limited number of spots (Pro)',
    'Email collection to your newsletter (Mailchimp, Kit, beehiiv, MailerLite, Brevo, Systeme.io, Substack), to Make, Zapier or n8n, or as a CSV file (Pro)',
    'One year of analytics (Pro)',
  ],
};

/** La question de celui qui a déjà un Linktree : sa réponse mène au champ. */
export const QUESTION_LINKTREE: Record<Langue, string> = {
  fr: 'J’ai déjà un Linktree. Comment passer à Hopla ?',
  en: 'I already have a Linktree. How do I switch to Hopla?',
};

export function questions(m: Inscription, langue: Langue = 'fr'): [string, string][] {
  if (langue === 'en') return [
    ['What is Hopla?', 'A link in bio page for your Instagram, TikTok or YouTube, at hopla.page/your-name. It changes the order of its links based on the network your visitor comes from, opens your links in their apps, and you edit it from your phone.'],
    ['Is it really free?', 'Yes. Your page starts with 14 days of every feature, no credit card. After that it stays online for free, forever, with a page that reorders itself by network and all twenty-four themes. The pricing table shows what each plan adds.'],
    m === 'libre'
      ? ['How long does it take to get my page?', 'Two minutes. Pick your name, leave your email, and the link to your page arrives by email. Four questions later, it’s live.']
      : ['When will I get my page?', 'We’re opening pages a few at a time, in the order names were claimed. Your invite arrives by email with a link valid for a week; four questions later, your page is live.'],
    m === 'libre'
      ? ['What will my address be?', 'hopla.page/ followed by the name you choose here: 3 to 30 characters, letters, numbers and hyphens. Once taken, a name is never given to anyone else, unless nobody ever opens the page: it’s deleted after a month. Made a typo? Right after sending, as long as you haven’t opened your page, you can still change it.']
      : ['What will my address be?', 'hopla.page/ followed by the name you claim here: 3 to 30 characters, letters, numbers and hyphens. A claimed name is never given to anyone else. Made a typo? Right after claiming it, you can still change it.'],
    ['Can I sell from my page?', 'Yes. Paste a product link (Etsy, Shopify, Gumroad, Payhip…) and Hopla shows its photo and price. Add your Calendly or Cal.com booking, and a tip button to PayPal, Ko‑fi or Buy Me a Coffee. Payment happens on their side: Hopla takes no commission. Your affiliate links carry the “Ad” disclosure, and their promo code copies in one tap.'],
    ['How is Hopla different from a regular link in bio?', 'Your page reorders itself based on the network your visitor comes from, your links open in their apps instead of Instagram’s browser, and your analytics read as a sentence, with no cookies.'],
    [QUESTION_LINKTREE.en, 'Paste your Linktree address into the field: Hopla keeps the name, if it’s free here. Then, in your page, paste your links and Hopla finds their titles on its own. All that’s left is to put hopla.page/your-name in your bios instead of the old link.'],
    ['How does Hopla know where a visitor comes from?', 'Instagram, TikTok and the other apps identify themselves when they open your page. You put one link in every bio, and Hopla sorts it out. When nothing says where they came from, for example a link sent over WhatsApp or typed into Safari, your page keeps the order you chose.'],
    ['Are my visitors tracked?', 'No. No cookies, no ads, no cross-site trackers. Analytics count visits without storing IP addresses: no cookie banner to force on your visitors.'],
    ['Can I take my data with me?', 'Yes. Your page, your analytics and your email list export in one click from Settings, and your account deletes the same way.'],
    ['How do I change plans or cancel?', 'From your settings, anytime. A plan change applies right away; a cancellation keeps your plan active until the end of the paid period, then your page goes back to Free with all its links.'],
  ];
  return [
    ['C’est quoi, Hopla ?', 'Une page de liens à mettre dans ta bio Instagram, TikTok ou YouTube, sur hopla.page/ton-nom. Elle change l’ordre de ses liens selon le réseau d’où arrive ton visiteur ouvre tes liens dans leurs apps et se modifie depuis ton téléphone.'],
    ['C’est vraiment gratuit ?', 'Oui. Ta page commence par 14 jours avec toutes les fonctions, sans carte bancaire. Ensuite, elle reste en ligne gratuitement, pour toujours, avec une page qui se réorganise selon le réseau du visiteur et les vingt-quatre thèmes. Ce que chaque offre ajoute se lit dans le tableau des tarifs.'],
    m === 'libre'
      ? ['Combien de temps pour avoir ma page ?', 'Deux minutes. Tu choisis ton nom, tu laisses ton e‑mail, et le lien pour entrer dans ta page arrive par e‑mail. Quatre questions plus tard, elle est en ligne.']
      : ['Quand aurai-je ma page ?', 'On ouvre les pages petit à petit, dans l’ordre des réservations. Ton invitation arrive par e‑mail, avec un lien valable une semaine ; quatre questions plus tard, ta page est en ligne.'],
    m === 'libre'
      ? ['Quelle sera mon adresse ?', 'hopla.page/ suivi du nom que tu choisis ici : 3 à 30 caractères, lettres, chiffres et tirets. Une fois pris, un nom n’est donné à personne d’autre, sauf si personne n’entre jamais dans la page : elle s’efface au bout d’un mois. Une faute de frappe ? Juste après l’envoi, tant que tu n’es pas entré dans ta page, tu peux encore le changer.']
      : ['Quelle sera mon adresse ?', 'hopla.page/ suivi du nom que tu réserves ici : 3 à 30 caractères, lettres, chiffres et tirets. Un nom réservé n’est donné à personne d’autre. Une faute de frappe ? Juste après la réservation, tu peux encore le changer.'],
    ['Je peux vendre depuis ma page ?', 'Oui. Colle l’adresse d’un produit (Etsy, Shopify, Gumroad, Payhip…) : Hopla affiche sa photo et son prix. Ajoute ta prise de rendez-vous Calendly, Cal.com ou Planity, et un bouton « Me soutenir » vers PayPal, Ko‑fi ou Tipeee. Le paiement se fait chez eux : Hopla ne prend aucune commission. Tes liens partenaires portent la mention « Publicité », et leur code promo se copie d’un geste.'],
    ['En quoi Hopla change d’une page de liens classique ?', 'Ta page se réorganise toute seule selon le réseau d’où arrive ton visiteur, tes liens s’ouvrent dans leurs apps plutôt que dans le navigateur d’Instagram, et tes stats se lisent en une phrase, sans cookie.'],
    [QUESTION_LINKTREE.fr, 'Colle ton adresse Linktree dans le champ : Hopla en garde le nom, s’il est libre ici. Ensuite, dans ta page, colle les adresses de tes liens, Hopla retrouve leurs titres tout seul. Il ne reste qu’à mettre hopla.page/ton-nom à la place de l’ancien lien dans tes bios.'],
    ['Comment Hopla sait d’où vient un visiteur ?', 'Instagram, TikTok et les autres apps se signalent quand elles ouvrent ta page. Tu mets un seul lien dans toutes tes bios, Hopla fait le tri. Quand rien ne le dit, par exemple un lien envoyé sur WhatsApp ou tapé dans Safari, ta page garde l’ordre que tu as choisi.'],
    ['Mes visiteurs sont-ils pistés ?', 'Non. Aucun cookie, aucune publicité, aucun traceur d’un site à l’autre. Les stats comptent les visites sans garder l’adresse IP : pas de bannière à imposer à tes visiteurs.'],
    ['Je peux partir avec mes données ?', 'Oui. Ta page, tes stats et ta liste e‑mail s’exportent en un clic depuis Réglages, et ton compte se supprime de la même façon.'],
    ['Comment changer d’offre ou résilier ?', 'Depuis tes réglages, à tout moment. Un changement d’offre compte tout de suite ; une résiliation laisse ton offre active jusqu’à la fin de la période payée, puis ta page repasse en Gratuit avec tous ses liens.'],
  ];
}
