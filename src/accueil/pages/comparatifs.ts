/*
 * Une page de comparaison par outil du marché (26 octobre 2026, demandé par
 * Lilian : « Hopla vs Linktree, etc., avec un beau tableau et un peu de texte
 * pour le SEO »). Les prix des autres sont leurs prix publics, en dollars, relevés
 * le 26 octobre 2026 (`RELEVE`) : à relire avant de les changer, et à dater de
 * nouveau. Un tableau ne dit d'un autre que ce qu'il annonce lui-même : ce qu'il
 * n'annonce pas s'écrit « Pas annoncé », jamais « Non ».
 */

import type { Langue } from '../../lib/types.ts';

export const RELEVE = '26 octobre 2026';

/** Une ligne du tableau : le critère, ce que fait Hopla, ce que fait l'autre. */
export type Ligne = [critere: string, hopla: string, eux: string];

export interface Comparatif {
  slug: string;
  nom: string;
  /** D'où il vient, en quelques mots. */
  qui: string;
  chapo: string;
  /** Pour les résultats de recherche : moins de 160 caractères. */
  resume: string;
  lignes: Ligne[];
  /** Le texte : un titre et ses paragraphes. */
  parties: { titre: string; texte: string[] }[];
  /** Quand l'autre est le meilleur choix : on le dit. */
  pourEux: string;
  questions: [string, string][];
}

/** Les lignes que Hopla tient pour tous : sa promesse, sur laquelle les autres ne disent rien. */
const PROMESSE = (nom: string): Ligne[] => [
  ['Page rangée selon le réseau du visiteur', 'Oui, gratuit', `Pas annoncé par ${nom}`],
  ['Liens ouverts dans leur app (YouTube, Spotify…)', 'Oui, gratuit', `Pas annoncé par ${nom}`],
];
const HOPLA_PRIX = 'Gratuit, puis deux offres au mois ou à l’année';
const HOPLA_COMMISSION = 'Aucune : Hopla n’encaisse rien';

const FR: Comparatif[] = [
  {
    slug: 'linktree',
    nom: 'Linktree',
    qui: 'le plus connu des liens en bio, né en Australie en 2016',
    chapo: 'Linktree a inventé la page de liens en bio. Hopla part de la même idée, et la page change selon d’où vient le visiteur : le réseau, l’heure, l’app.',
    resume: 'Hopla vs Linktree, le comparatif : prix, commissions, stats, et ce que Hopla fait de plus, une page qui s’adapte au réseau de chaque visiteur.',
    lignes: [
      ['Prix', HOPLA_PRIX, 'Gratuit, puis 8 $, 15 $ ou 35 $ par mois'],
      ['Offre gratuite', 'Oui, cinq blocs, les vingt-quatre thèmes', 'Oui, liens sans limite'],
      ['Commission sur tes ventes', HOPLA_COMMISSION, '12 % en gratuit, 9 % en Starter et Pro, 0 % en Premium'],
      ['Retirer la marque', 'Oui', 'Avec Pro, 15 $ par mois'],
      ['Programmer un lien', 'Oui', 'Avec Starter'],
      ['Historique des stats', 'Jusqu’à un an', '28 jours en gratuit, 90 jours en Starter'],
      ...PROMESSE('Linktree'),
      ['Résumé des stats chaque lundi, en phrases', 'Oui', 'Pas annoncé par Linktree'],
    ],
    parties: [
      { titre: 'La même page pour tous, ou la bonne page pour chacun', texte: [
        'Sur Linktree, ton visiteur voit la même liste, qu’il arrive d’Instagram, de TikTok ou de LinkedIn. À lui de chercher le lien qui prolonge ce qu’il vient de voir.',
        'Hopla reconnaît le réseau d’où il vient et met ce lien en premier : ton portfolio pour Instagram, tes coulisses pour TikTok, « Parlons de ton projet » pour LinkedIn. Un seul lien dans toutes tes bios, l’ordre change tout seul. C’est gratuit, pour toujours.',
      ] },
      { titre: 'Des liens qui ne restent pas coincés', texte: [
        'Depuis Instagram ou TikTok, un lien s’ouvre d’habitude dans un petit navigateur où personne n’est connecté : ton visiteur ne peut pas s’abonner à ta chaîne YouTube ni ajouter ton titre sur Spotify. Hopla ouvre ces liens directement dans leur app.',
      ] },
      { titre: 'Ce que tu paies vraiment', texte: [
        'Linktree prend une part de ce que tu vends par sa page tant que tu n’es pas en Premium, à 35 $ par mois. Hopla n’encaisse rien : chaque bloc mène à ta boutique, ton agenda ou ta cagnotte, et tu gardes tout.',
      ] },
    ],
    pourEux: 'Si tu vends des produits numériques directement depuis ta page, sans boutique à toi, Linktree le fait et Hopla non : Hopla mène à ta boutique, il ne la remplace pas.',
    questions: [
      ['Comment passer de Linktree à Hopla ?', 'Colle ton adresse Linktree dans le champ de l’accueil : Hopla en garde le nom, s’il est libre. Ensuite, colle les adresses de tes liens, Hopla retrouve leurs titres tout seul. Il ne reste qu’à changer le lien de tes bios.'],
      ['Hopla est-il gratuit comme Linktree ?', 'Oui. L’offre gratuite garde la page selon le réseau, les liens ouverts dans leur app et les vingt-quatre thèmes, avec cinq blocs. Chaque compte commence par 14 jours avec toutes les fonctions, sans carte.'],
      ['Puis-je garder mon nom ?', 'Si personne ne l’a pris sur Hopla, oui : ta page sera hopla.page/ton-nom.'],
    ],
  },
  {
    slug: 'beacons',
    nom: 'Beacons',
    qui: 'une page de liens doublée d’une boutique et d’outils pour créateurs, née aux États-Unis',
    chapo: 'Beacons veut tout faire : boutique, kit média, e-mails, IA. Hopla fait une chose : une page de liens qui s’adapte à chaque visiteur, et qui mène à tes outils.',
    resume: 'Hopla vs Beacons, le comparatif : prix, commission de 9 % sur les ventes, et une page de liens qui se range selon le réseau du visiteur avec Hopla.',
    lignes: [
      ['Prix', HOPLA_PRIX, 'Gratuit, puis 10 $, 30 $ ou 100 $ par mois'],
      ['Offre gratuite', 'Oui, cinq blocs, les vingt-quatre thèmes', 'Oui, liens sans limite'],
      ['Commission sur tes ventes', HOPLA_COMMISSION, '9 % en gratuit et en Creator, 0 % dès 30 $ par mois'],
      ['Retirer la marque', 'Oui', 'Avec Creator Plus, 30 $ par mois'],
      ['Boutique intégrée', 'Non : Hopla mène à la tienne', 'Oui'],
      ['Liste e-mail', 'Oui, vers Brevo, Mailchimp, Kit…', 'Oui, avec ses propres envois'],
      ...PROMESSE('Beacons'),
    ],
    parties: [
      { titre: 'Un outil de plus, ou une page qui marche mieux', texte: [
        'Beacons regroupe beaucoup d’outils, et tu les paies en temps de réglage ou en commission. Si tu as déjà ta boutique, ton agenda et ta newsletter, Hopla les relie sans rien remplacer.',
        'Ce que Hopla ajoute, c’est l’ordre : ta page se range selon le réseau d’où vient chaque visiteur, et ses liens s’ouvrent dans leur app.',
      ] },
      { titre: 'Ta liste e-mail reste la tienne', texte: [
        'Avec Hopla, un visiteur qui s’inscrit part vers ta newsletter : Brevo, Mailchimp, Kit, MailerLite, beehiiv, Systeme.io, ou un webhook Make, Zapier, n8n. Tu changes d’outil quand tu veux, la liste te suit.',
      ] },
    ],
    pourEux: 'Si tu n’as encore ni boutique ni newsletter et que tu veux tout au même endroit, Beacons te les donne d’un coup.',
    questions: [
      ['Hopla prend-il une commission ?', 'Non. Hopla n’encaisse rien : ton client paie sur ta boutique, ton agenda ou ta cagnotte.'],
      ['Puis-je vendre avec Hopla ?', 'Oui, avec la vitrine : tes produits avec leur photo et leur prix, ta prise de rendez-vous, un bouton de soutien. Chaque bloc mène au site qui encaisse.'],
    ],
  },
  {
    slug: 'stan',
    nom: 'Stan',
    qui: 'une boutique en lien de bio pour vendre des formations et des rendez-vous, née aux États-Unis',
    chapo: 'Stan est une boutique : formations, rendez-vous payants, abonnements. Hopla est une page de liens qui s’adapte à chaque visiteur, avec une offre gratuite.',
    resume: 'Hopla vs Stan Store, le comparatif : Stan démarre à 29 $ par mois sans offre gratuite ; Hopla est gratuit, puis 9 € par mois, sans commission.',
    lignes: [
      ['Prix', HOPLA_PRIX, '29 $ ou 99 $ par mois'],
      ['Offre gratuite', 'Oui, cinq blocs, les vingt-quatre thèmes', 'Non, 14 jours d’essai'],
      ['Essai', '14 jours avec toutes les fonctions, sans carte', '14 jours'],
      ['Commission sur tes ventes', HOPLA_COMMISSION, '0 % de Stan, frais de paiement en plus'],
      ['Vendre des formations', 'Non : Hopla mène à ta plateforme', 'Oui'],
      ['Prise de rendez-vous', 'Oui, ton Calendly ou Cal.com dans la page', 'Oui, avec son agenda'],
      ...PROMESSE('Stan'),
    ],
    parties: [
      { titre: 'Une boutique, ou une page de liens', texte: [
        'Stan remplace ta boutique : tu y vends tes formations et tes rendez-vous. Si tu vends déjà ailleurs, ou si tu ne vends pas encore, tu paies 29 $ par mois pour une page de liens.',
        'Hopla commence gratuit. Ta page se range selon le réseau du visiteur, ouvre tes liens dans leur app, et mène à l’outil qui encaisse, que tu as déjà.',
      ] },
    ],
    pourEux: 'Si tu vends une formation en ligne ou des appels payants et que tu n’as pas de plateforme, Stan est fait pour ça.',
    questions: [
      ['Hopla a-t-il une offre gratuite ?', 'Oui, pour toujours. Et chaque compte commence par 14 jours avec toutes les fonctions, sans carte.'],
      ['Mon agenda peut-il s’ouvrir dans ma page ?', 'Oui : Calendly, Cal.com et Google Agenda s’ouvrent dans la page, sans quitter Hopla.'],
    ],
  },
  {
    slug: 'lnk-bio',
    nom: 'Lnk.Bio',
    qui: 'une page de liens à petit prix, payée une fois pour toutes, née en Italie',
    chapo: 'Lnk.Bio vend sa page de liens pour presque rien, une fois pour toutes. Hopla coûte plus cher passé l’offre gratuite, et fait ce que les autres ne font pas : s’adapter à chaque visiteur.',
    resume: 'Hopla vs Lnk.Bio, le comparatif : prix à vie contre abonnement, et une page de liens qui se range selon le réseau du visiteur avec Hopla, gratuitement.',
    lignes: [
      ['Prix', HOPLA_PRIX, 'Gratuit, puis 0,99 $ par mois, ou 9,99 $ et 24,99 $ à vie'],
      ['Offre gratuite', 'Oui, cinq blocs, les vingt-quatre thèmes', 'Oui, liens sans limite'],
      ['Retirer la marque', 'Oui', 'Avec Unique, 24,99 $ à vie'],
      ['Programmer un lien', 'Oui', 'Avec Mini'],
      ['Commission sur tes ventes', HOPLA_COMMISSION, 'Pas annoncé par Lnk.Bio'],
      ...PROMESSE('Lnk.Bio'),
      ['Résumé des stats chaque lundi, en phrases', 'Oui', 'Pas annoncé par Lnk.Bio'],
    ],
    parties: [
      { titre: 'Le moins cher, ou celui qui fait cliquer', texte: [
        'Pour une liste de liens qui ne bouge pas, Lnk.Bio est difficile à battre sur le prix.',
        'Hopla part d’une autre question : combien de tes visiteurs trouvent le lien qu’ils cherchent ? Ta page se range selon le réseau d’où ils viennent et ouvre tes liens dans leur app, gratuitement. Les offres payantes ajoutent ta vitrine, tes stats en clair et une page qui suit l’heure.',
      ] },
    ],
    pourEux: 'Si tu veux une liste de liens sans rien de plus, au plus bas prix et payée une fois, Lnk.Bio est un bon choix.',
    questions: [
      ['Hopla a-t-il un prix à vie ?', 'Non : Hopla a une offre gratuite, puis des offres au mois ou à l’année. Le détail est dans les tarifs.'],
    ],
  },
  {
    slug: 'taplink',
    nom: 'Taplink',
    qui: 'une mini-page à blocs avec formulaires et paiements, très utilisée en Europe de l’Est',
    chapo: 'Taplink construit une mini-page avec des blocs, des formulaires et des paiements. Hopla construit une page de liens qui change selon le visiteur.',
    resume: 'Hopla vs Taplink, le comparatif : prix, blocs, paiements, et une page de liens qui se range selon le réseau de chaque visiteur avec Hopla.',
    lignes: [
      ['Prix', HOPLA_PRIX, 'Gratuit, puis environ 3 $ ou 9 $ par mois'],
      ['Offre gratuite', 'Oui, cinq blocs, les vingt-quatre thèmes', 'Oui, avec moins de blocs'],
      ['Paiements dans la page', 'Non : Hopla mène à ta boutique', 'Oui, avec Business'],
      ['Commission sur tes ventes', HOPLA_COMMISSION, 'Aucune de Taplink, frais de paiement en plus'],
      ...PROMESSE('Taplink'),
      ['Avis Google ou Trustpilot recopiés', 'Oui', 'Pas annoncé par Taplink'],
    ],
    parties: [
      { titre: 'Une mini-page, ou une page qui s’adapte', texte: [
        'Taplink est pratique pour monter un petit site avec un formulaire et un bouton de paiement. Hopla, lui, se concentre sur ce que voit chaque visiteur : le lien qui l’intéresse en premier, selon son réseau, et des liens qui s’ouvrent dans leur app.',
      ] },
    ],
    pourEux: 'Si tu veux encaisser directement dans ta page, sans boutique à toi, Taplink le permet avec son offre Business.',
    questions: [
      ['Hopla gère-t-il les paiements ?', 'Non. Hopla mène à ta boutique, ton agenda ou ta cagnotte, qui encaissent. Il n’y touche pas.'],
    ],
  },
  {
    slug: 'later',
    nom: 'Later Linkin.bio',
    qui: 'la page de liens de Later, l’outil de programmation de posts, née au Canada',
    chapo: 'Linkin.bio est la page de liens de Later, comprise dans ses offres de programmation de posts. Hopla est une page de liens seule, qui s’adapte à chaque visiteur.',
    resume: 'Hopla vs Later Linkin.bio, le comparatif : Linkin.bio vient avec Later, dès 25 $ par mois ; Hopla est une page de liens seule, gratuite, puis 9 € par mois.',
    lignes: [
      ['Prix', HOPLA_PRIX, 'Compris dans Later, dès 25 $ par mois'],
      ['Vendu seul', 'Oui', 'Non, avec la programmation de posts'],
      ['Page reprise de ton fil Instagram', 'Non', 'Oui'],
      ...PROMESSE('Later'),
      ['Commission sur tes ventes', HOPLA_COMMISSION, 'Pas annoncé par Later'],
    ],
    parties: [
      { titre: 'Un outil de programmation, ou une page de liens', texte: [
        'Linkin.bio reprend ton fil Instagram et rend chaque post cliquable : c’est utile si tu programmes déjà tes posts avec Later. Sinon, tu paies un outil de programmation pour avoir une page de liens.',
        'Hopla est une page de liens seule, gratuite pour commencer, qui se range selon le réseau du visiteur et ouvre tes liens dans leur app.',
      ] },
    ],
    pourEux: 'Si tu programmes déjà tes posts avec Later, Linkin.bio est compris : garde-le.',
    questions: [
      ['Puis-je utiliser Hopla avec Later ?', 'Oui : tu programmes tes posts où tu veux, et tu mets hopla.page/ton-nom dans ta bio.'],
    ],
  },
];



/*
 * Les mêmes comparatifs en anglais (8 novembre 2026, Hopla anglais d'abord), rangés par slug : le slug
 * et le nom de l'outil ne changent pas d'une langue à l'autre.
 */
const PROMESSE_EN = (nom: string): Ligne[] => [
  ['Page ordered by the visitor’s network', 'Yes, free', `Not advertised by ${nom}`],
  ['Links open in their app (YouTube, Spotify…)', 'Yes, free', `Not advertised by ${nom}`],
];
const HOPLA_PRIX_EN = 'Free, then two plans, monthly or yearly';
const HOPLA_COMMISSION_EN = 'None: Hopla takes no payment';
const GRATUIT_EN = 'Yes, five blocks, all twenty-four themes';

const EN: Record<string, Omit<Comparatif, 'slug' | 'nom'>> = {
  linktree: {
    qui: 'the best known link in bio, born in Australia in 2016',
    chapo: 'Linktree invented the link in bio page. Hopla starts from the same idea, and the page changes with where the visitor comes from: the network, the time, the app.',
    resume: 'Hopla vs Linktree: pricing, commissions, analytics, and what Hopla adds, a page that adapts to each visitor’s network.',
    lignes: [
      ['Price', HOPLA_PRIX_EN, 'Free, then $8, $15 or $35 a month'],
      ['Free plan', GRATUIT_EN, 'Yes, unlimited links'],
      ['Commission on your sales', HOPLA_COMMISSION_EN, '12% on Free, 9% on Starter and Pro, 0% on Premium'],
      ['Remove the branding', 'Yes', 'With Pro, $15 a month'],
      ['Schedule a link', 'Yes', 'With Starter'],
      ['Analytics history', 'Up to a year', '28 days on Free, 90 days on Starter'],
      ...PROMESSE_EN('Linktree'),
      ['Analytics summary every Monday, in sentences', 'Yes', 'Not advertised by Linktree'],
    ],
    parties: [
      { titre: 'The same page for everyone, or the right page for each', texte: [
        'On Linktree, your visitor sees the same list whether they come from Instagram, TikTok or LinkedIn. It’s up to them to find the link that follows what they just saw.',
        'Hopla recognizes the network they come from and puts that link first: your portfolio for Instagram, behind the scenes for TikTok, “Let’s talk about your project” for LinkedIn. One link in every bio, the order changes on its own. It’s free, forever.',
      ] },
      { titre: 'Links that don’t get stuck', texte: [
        'From Instagram or TikTok, a link usually opens in a small browser where nobody is signed in: your visitor can’t subscribe to your YouTube channel or save your track on Spotify. Hopla opens these links right in their app.',
      ] },
      { titre: 'What you really pay', texte: [
        'Linktree takes a cut of what you sell through its page unless you’re on Premium, at $35 a month. Hopla takes no payment: each block leads to your store, your calendar or your tip page, and you keep everything.',
      ] },
    ],
    pourEux: 'If you sell digital products directly from your page, without a store of your own, Linktree does it and Hopla doesn’t: Hopla leads to your store, it doesn’t replace it.',
    questions: [
      ['How do I switch from Linktree to Hopla?', 'Paste your Linktree address in the field on the home page: Hopla keeps the name, if it’s free. Then paste your links’ addresses, Hopla finds their titles on its own. All that’s left is changing the link in your bios.'],
      ['Is Hopla free like Linktree?', 'Yes. The free plan keeps the page by network, links opening in their app and all twenty-four themes, with five blocks. Every account starts with 14 days of every feature, no card needed.'],
      ['Can I keep my name?', 'If nobody has taken it on Hopla, yes: your page will be hopla.page/your-name.'],
    ],
  },
  beacons: {
    qui: 'a link in bio page with a store and creator tools on top, born in the United States',
    chapo: 'Beacons wants to do everything: store, media kit, emails, AI. Hopla does one thing: a link in bio page that adapts to each visitor, and leads to your tools.',
    resume: 'Hopla vs Beacons: pricing, a 9% commission on sales, and a link in bio page that reorders itself by the visitor’s network with Hopla.',
    lignes: [
      ['Price', HOPLA_PRIX_EN, 'Free, then $10, $30 or $100 a month'],
      ['Free plan', GRATUIT_EN, 'Yes, unlimited links'],
      ['Commission on your sales', HOPLA_COMMISSION_EN, '9% on Free and Creator, 0% from $30 a month'],
      ['Remove the branding', 'Yes', 'With Creator Plus, $30 a month'],
      ['Built-in store', 'No: Hopla leads to yours', 'Yes'],
      ['Email list', 'Yes, to Brevo, Mailchimp, Kit…', 'Yes, with its own sending'],
      ...PROMESSE_EN('Beacons'),
    ],
    parties: [
      { titre: 'One more tool, or a page that works better', texte: [
        'Beacons bundles a lot of tools, and you pay for them in setup time or in commission. If you already have your store, your calendar and your newsletter, Hopla connects them without replacing anything.',
        'What Hopla adds is the order: your page reorders itself by the network each visitor comes from, and its links open in their app.',
      ] },
      { titre: 'Your email list stays yours', texte: [
        'With Hopla, a visitor who signs up goes to your newsletter: Brevo, Mailchimp, Kit, MailerLite, beehiiv, Systeme.io, or a Make, Zapier or n8n webhook. Switch tools whenever you want, the list follows you.',
      ] },
    ],
    pourEux: 'If you don’t have a store or a newsletter yet and want everything in one place, Beacons gives you all of it at once.',
    questions: [
      ['Does Hopla take a commission?', 'No. Hopla takes no payment: your customer pays on your store, your calendar or your tip page.'],
      ['Can I sell with Hopla?', 'Yes, with the storefront: your products with their photo and price, your booking link, a tip button. Each block leads to the site that takes the payment.'],
    ],
  },
  stan: {
    qui: 'a link in bio store to sell courses and bookings, born in the United States',
    chapo: 'Stan is a store: courses, paid calls, memberships. Hopla is a link in bio page that adapts to each visitor, with a free plan.',
    resume: 'Hopla vs Stan Store: Stan starts at $29 a month with no free plan; Hopla is free, then €9 a month, with no commission.',
    lignes: [
      ['Price', HOPLA_PRIX_EN, '$29 or $99 a month'],
      ['Free plan', GRATUIT_EN, 'No, a 14-day trial'],
      ['Trial', '14 days of every feature, no card needed', '14 days'],
      ['Commission on your sales', HOPLA_COMMISSION_EN, '0% from Stan, plus payment fees'],
      ['Sell courses', 'No: Hopla leads to your platform', 'Yes'],
      ['Bookings', 'Yes, your Calendly or Cal.com inside the page', 'Yes, with its own calendar'],
      ...PROMESSE_EN('Stan'),
    ],
    parties: [
      { titre: 'A store, or a link in bio page', texte: [
        'Stan replaces your store: you sell your courses and your calls there. If you already sell elsewhere, or don’t sell yet, you pay $29 a month for a link in bio page.',
        'Hopla starts free. Your page reorders itself by the visitor’s network, opens your links in their app, and leads to the tool that takes the payment, the one you already have.',
      ] },
    ],
    pourEux: 'If you sell an online course or paid calls and don’t have a platform, Stan is built for that.',
    questions: [
      ['Does Hopla have a free plan?', 'Yes, forever. And every account starts with 14 days of every feature, no card needed.'],
      ['Can my calendar open inside my page?', 'Yes: Calendly, Cal.com and Google Calendar open inside the page, without leaving Hopla.'],
    ],
  },
  'lnk-bio': {
    qui: 'a low-cost link in bio page, paid once and for all, born in Italy',
    chapo: 'Lnk.Bio sells its link in bio page for almost nothing, once and for all. Hopla costs more past the free plan, and does what the others don’t: adapt to each visitor.',
    resume: 'Hopla vs Lnk.Bio: lifetime price versus subscription, and a link in bio page that reorders itself by the visitor’s network with Hopla, for free.',
    lignes: [
      ['Price', HOPLA_PRIX_EN, 'Free, then $0.99 a month, or $9.99 and $24.99 for life'],
      ['Free plan', GRATUIT_EN, 'Yes, unlimited links'],
      ['Remove the branding', 'Yes', 'With Unique, $24.99 for life'],
      ['Schedule a link', 'Yes', 'With Mini'],
      ['Commission on your sales', HOPLA_COMMISSION_EN, 'Not advertised by Lnk.Bio'],
      ...PROMESSE_EN('Lnk.Bio'),
      ['Analytics summary every Monday, in sentences', 'Yes', 'Not advertised by Lnk.Bio'],
    ],
    parties: [
      { titre: 'The cheapest, or the one that gets clicks', texte: [
        'For a list of links that never changes, Lnk.Bio is hard to beat on price.',
        'Hopla starts from another question: how many of your visitors find the link they’re looking for? Your page reorders itself by the network they come from and opens your links in their app, for free. The paid plans add your storefront, analytics in plain words and a page that follows the time of day.',
      ] },
    ],
    pourEux: 'If you want a list of links and nothing more, at the lowest price and paid once, Lnk.Bio is a good choice.',
    questions: [
      ['Does Hopla have a lifetime price?', 'No: Hopla has a free plan, then monthly or yearly plans. The details are in the pricing.'],
    ],
  },
  taplink: {
    qui: 'a block-based mini page with forms and payments, widely used in Eastern Europe',
    chapo: 'Taplink builds a mini page with blocks, forms and payments. Hopla builds a link in bio page that changes with the visitor.',
    resume: 'Hopla vs Taplink: pricing, blocks, payments, and a link in bio page that reorders itself by each visitor’s network with Hopla.',
    lignes: [
      ['Price', HOPLA_PRIX_EN, 'Free, then about $3 or $9 a month'],
      ['Free plan', GRATUIT_EN, 'Yes, with fewer blocks'],
      ['Payments inside the page', 'No: Hopla leads to your store', 'Yes, with Business'],
      ['Commission on your sales', HOPLA_COMMISSION_EN, 'None from Taplink, plus payment fees'],
      ...PROMESSE_EN('Taplink'),
      ['Google or Trustpilot reviews shown', 'Yes', 'Not advertised by Taplink'],
    ],
    parties: [
      { titre: 'A mini page, or a page that adapts', texte: [
        'Taplink is handy for putting together a small site with a form and a payment button. Hopla focuses on what each visitor sees: the link they care about first, based on their network, and links that open in their app.',
      ] },
    ],
    pourEux: 'If you want to take payments directly in your page, without a store of your own, Taplink allows it with its Business plan.',
    questions: [
      ['Does Hopla handle payments?', 'No. Hopla leads to your store, your calendar or your tip page, which take the payment. It never touches it.'],
    ],
  },
  later: {
    qui: 'the link in bio page from Later, the post scheduling tool, born in Canada',
    chapo: 'Linkin.bio is Later’s link in bio page, included in its post scheduling plans. Hopla is a standalone link in bio page that adapts to each visitor.',
    resume: 'Hopla vs Later Linkin.bio: Linkin.bio comes with Later, from $25 a month; Hopla is a standalone link in bio page, free, then €9 a month.',
    lignes: [
      ['Price', HOPLA_PRIX_EN, 'Included in Later, from $25 a month'],
      ['Sold on its own', 'Yes', 'No, with post scheduling'],
      ['Page built from your Instagram feed', 'No', 'Yes'],
      ...PROMESSE_EN('Later'),
      ['Commission on your sales', HOPLA_COMMISSION_EN, 'Not advertised by Later'],
    ],
    parties: [
      { titre: 'A scheduling tool, or a link in bio page', texte: [
        'Linkin.bio mirrors your Instagram feed and makes each post clickable: useful if you already schedule your posts with Later. Otherwise, you pay for a scheduling tool to get a link in bio page.',
        'Hopla is a standalone link in bio page, free to start, that reorders itself by the visitor’s network and opens your links in their app.',
      ] },
    ],
    pourEux: 'If you already schedule your posts with Later, Linkin.bio is included: keep it.',
    questions: [
      ['Can I use Hopla with Later?', 'Yes: schedule your posts wherever you like, and put hopla.page/your-name in your bio.'],
    ],
  },
};

const LISTES: Record<Langue, Comparatif[]> = {
  fr: FR,
  en: FR.map(c => ({ ...c, ...EN[c.slug] })),
};

/** Les comparatifs dans une langue. */
export const comparatifs = (langue: Langue) => LISTES[langue];
/** Les comparatifs en français : ce qui n'a pas encore de langue. */
export const COMPARATIFS = FR;
export const comparatif = (slug: string, langue: Langue = 'fr') => LISTES[langue].find(c => c.slug === slug);

/** Le chemin des comparatifs dans une langue : `/compare` en anglais, `/comparatif` en français. */
export const CHEMIN_COMPARATIFS: Record<Langue, string> = { en: '/compare', fr: '/comparatif' };
/** Les mots qui entourent les prix relevés : « Pas annoncé » s'écrit dans la langue. */
export const pasAnnonce = (eux: string) => eux.startsWith('Pas annoncé') || eux.startsWith('Not advertised');
