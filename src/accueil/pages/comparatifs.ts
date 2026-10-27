/*
 * Une page de comparaison par outil du marché (26 octobre 2026, demandé par
 * Lilian : « Hopla vs Linktree, etc., avec un beau tableau et un peu de texte
 * pour le SEO »). Les prix des autres sont leurs prix publics, en dollars, relevés
 * le 26 octobre 2026 (`RELEVE`) : à relire avant de les changer, et à dater de
 * nouveau. Un tableau ne dit d'un autre que ce qu'il annonce lui-même : ce qu'il
 * n'annonce pas s'écrit « Pas annoncé », jamais « Non ».
 */

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

export const COMPARATIFS: Comparatif[] = [
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

export const comparatif = (slug: string) => COMPARATIFS.find(c => c.slug === slug);
