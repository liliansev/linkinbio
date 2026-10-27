import type { Fonction } from '../../lib/abonnement.ts';

/*
 * Une page par fonction (26 octobre 2026, demandé par Lilian : « une page par
 * feature, comme ça on la détaille bien, avec l'animation qui va bien »). Les
 * mots vivent ici, la scène de chaque page dans `PageFonction.tsx`. Chaque page
 * se lit en défilant : chaque étape fait avancer la scène, sans rien à toucher.
 * Le plan du site et llms.txt reprennent cette liste.
 */

export type Offre = 'gratuit' | 'starter' | 'pro';

export interface PageFonction {
  slug: string;
  /** Le nom court, dans les listes et les liens. */
  nom: string;
  /** Le titre de la page, en deux lignes. */
  titre: [string, string];
  chapo: string;
  /** Pour les résultats de recherche : moins de 160 caractères. */
  resume: string;
  offre: Offre;
  /** La fonction qui la réserve, si elle l'est : l'offre doit être la sienne (`FONCTIONS` de lib/abonnement.ts). */
  droit?: Fonction;
  /** Les étapes de la scène, une par écran de défilement. */
  etapes: { titre: string; texte: string }[];
  /** Pourquoi c'est utile, en trois points. */
  points: { titre: string; texte: string }[];
  questions: [string, string][];
}

export const PAGES_FONCTIONS: PageFonction[] = [
  {
    slug: 'selon-le-reseau',
    nom: 'Ta page selon le réseau',
    titre: ['Un seul lien', 'Le bon ordre pour chacun'],
    chapo: 'Tu mets le même lien dans toutes tes bios. Hopla reconnaît le réseau d’où vient ton visiteur et met en premier le lien qu’il cherche.',
    resume: 'Une page de liens qui se range selon le réseau du visiteur : Instagram, TikTok, YouTube ou LinkedIn voient chacun le bon lien en premier. Gratuit.',
    offre: 'gratuit',
    etapes: [
      { titre: 'Un lien dans toutes tes bios', texte: 'Camille est photographe. Sa page Hopla est la même partout, son ordre ne l’est pas.' },
      { titre: 'Depuis Instagram', texte: 'On vient de voir ses photos : son portfolio passe en premier.' },
      { titre: 'Depuis TikTok', texte: 'On vient de ses vidéos : les coulisses passent devant.' },
      { titre: 'Depuis YouTube', texte: 'On vient de son tuto : la suite est en tête.' },
      { titre: 'Depuis LinkedIn', texte: 'Un client potentiel : « Parlons de ton projet » s’affiche, rien que pour lui.' },
    ],
    points: [
      { titre: 'Moins de clics perdus', texte: 'Ton visiteur n’a pas à chercher : le lien qui prolonge ce qu’il vient de voir est déjà en haut.' },
      { titre: 'Rien à dupliquer', texte: 'Une seule page à tenir à jour, un seul lien à partager, quelle que soit la plateforme.' },
      { titre: 'Toi qui choisis', texte: 'Pour chaque lien, tu dis d’où il passe en avant, ou pour qui il est le seul à s’afficher.' },
    ],
    questions: [
      ['Comment Hopla sait d’où vient mon visiteur ?', 'Par le navigateur intégré de l’app d’où il arrive (Instagram, TikTok, LinkedIn… se nomment), par le site qu’il quittait, ou par un petit repère que tu ajoutes à ton lien, comme ?s=tiktok. Rien n’est gardé sur lui.'],
      ['Et s’il arrive d’ailleurs ?', 'Il voit ta page dans l’ordre que tu as choisi. Le réseau ne fait que mettre un lien en avant, il ne cache rien sans que tu le demandes.'],
    ],
  },
  {
    slug: 'ouvrir-dans-l-app',
    nom: 'Tes liens ouverts dans leur app',
    titre: ['Moins de détours', 'Plus d’abonnés'],
    chapo: 'Depuis Instagram ou TikTok, un lien s’ouvre d’habitude dans un petit navigateur où personne n’est connecté. Avec Hopla, ton clip s’ouvre dans YouTube.',
    resume: 'Depuis Instagram ou TikTok, Hopla ouvre tes liens YouTube, Spotify et autres directement dans leur app, où ton visiteur est déjà connecté. Gratuit.',
    offre: 'gratuit',
    etapes: [
      { titre: 'Un clic sur le clip de Sacha', texte: 'Son visiteur arrive d’Instagram et touche « Les jours bleus, le clip ».' },
      { titre: 'Sans Hopla : le navigateur d’Instagram', texte: 'La vidéo s’ouvre dans une fenêtre d’Instagram, où il n’est connecté à rien.' },
      { titre: 'On lui demande de se connecter', texte: 'Il ferme la fenêtre et repart. Sacha a perdu un abonné.' },
      { titre: 'Avec Hopla : l’app YouTube', texte: 'Le même clic ouvre YouTube, si l’app est installée. Son compte y est déjà.' },
      { titre: 'Le clip démarre', texte: 'Pas de mot de passe, pas de page blanche : il regarde.' },
      { titre: 'Il s’abonne', texte: 'D’un toucher, parce qu’il est chez lui. C’est ce qui compte pour Sacha.' },
    ],
    points: [
      { titre: 'Des abonnés, pas des vues perdues', texte: 'Ton visiteur peut s’abonner, liker ou enregistrer, parce qu’il est connecté dans son app.' },
      { titre: 'Sans rien régler', texte: 'Hopla reconnaît YouTube, Spotify, TikTok, Instagram et les autres : colle ton lien, c’est tout.' },
      { titre: 'Et si l’app manque', texte: 'Le lien s’ouvre dans le navigateur, comme avant. Personne ne tombe sur une impasse.' },
    ],
    questions: [
      ['Quelles apps sont reconnues ?', 'YouTube, YouTube Music, Spotify, Instagram, TikTok, Threads, X, LinkedIn, Facebook, Pinterest, Snapchat, Twitch, WhatsApp et Telegram. La liste grandit avec les demandes.'],
      ['Ça marche sur iPhone et Android ?', 'Oui, sur les deux, depuis les navigateurs intégrés d’Instagram, de TikTok, de Facebook, de LinkedIn, de Threads et de Snapchat.'],
    ],
  },
  {
    slug: 'page-selon-l-heure',
    nom: 'Ta page selon l’heure',
    titre: ['Le midi, le menu', 'Le soir, la réservation'],
    chapo: 'Tu choisis des horaires, Hopla met le bon lien en tête au bon moment. Ta page suit ta journée sans que tu y touches.',
    resume: 'Ta page de liens change selon l’heure : le menu du jour le midi, la réservation le soir. Des créneaux par jour de la semaine avec Hopla.',
    offre: 'pro',
    droit: 'heure',
    etapes: [
      { titre: '9 h, la journée commence', texte: 'Malik est chef. Le matin, sa page met le menu du jour en premier.' },
      { titre: 'Les heures passent', texte: 'Tu n’as rien à faire : le créneau est réglé une fois pour toutes.' },
      { titre: '18 h, le soir arrive', texte: '« Réserver un dîner » monte en tête, le menu passe derrière.' },
    ],
    points: [
      { titre: 'Un créneau par lien', texte: 'Du lundi au vendredi de 9 h à 18 h, le week-end, le soir : tu choisis les jours et les heures.' },
      { titre: 'En avant ou caché', texte: 'Un lien peut passer en tête pendant son créneau, ou ne s’afficher que pendant celui-ci.' },
      { titre: 'À ton heure', texte: 'Hopla suit ton fuseau horaire, été comme hiver.' },
    ],
    questions: [
      ['Je peux régler plusieurs créneaux ?', 'Oui, un par lien, et chaque lien a le sien.'],
      ['Que voit un visiteur hors créneau ?', 'Le lien reprend sa place habituelle, ou disparaît si tu l’as réglé pour ne s’afficher que pendant son créneau.'],
    ],
  },
  {
    slug: 'lancement',
    nom: 'Tes lancements programmés',
    titre: ['Un compte à rebours', 'Puis le lien s’ouvre'],
    chapo: 'Annonce ta nouvelle collection sans dévoiler son adresse. À l’heure dite, le lien s’ouvre tout seul, même si tu es occupée ailleurs.',
    resume: 'Programme un lien sur ta page : un compte à rebours, puis il s’ouvre à l’heure dite. Des dates de début et de fin avec Hopla.',
    offre: 'starter',
    droit: 'programmation',
    etapes: [
      { titre: 'L’annonce', texte: 'Inès lance ses nouvelles pièces ce soir à 18 h. Sa page montre le compte à rebours, pas l’adresse.' },
      { titre: 'Les dernières secondes', texte: 'Ses visiteurs reviennent voir. Le compteur se tient à jour tout seul.' },
      { titre: '18 h : c’est ouvert', texte: 'Le lien remplace le compte à rebours, en tête de page. Personne n’a eu l’adresse avant.' },
    ],
    points: [
      { titre: 'Une date de début, une date de fin', texte: 'Un lien apparaît et disparaît quand tu l’as dit : un soldes, un live, une inscription.' },
      { titre: 'Le compte à rebours, si tu veux', texte: 'Il fait revenir tes visiteurs, et rien ne fuit avant l’heure.' },
      { titre: 'Programmé depuis ton téléphone', texte: 'Deux dates à choisir dans le bloc, c’est fait.' },
    ],
    questions: [
      ['L’adresse peut-elle fuiter avant l’heure ?', 'Non : tant que le lien n’est pas ouvert, son adresse n’est pas dans la page.'],
      ['Et après la date de fin ?', 'Le lien disparaît de ta page. Il reste dans ton back office, prêt à resservir.'],
    ],
  },
  {
    slug: 'drops',
    nom: 'Tes places comptées',
    titre: ['Un lien réservé', 'Des places comptées'],
    chapo: 'Une édition limitée, une avant-première, une liste d’invités : le lien s’ouvre avec un code, pour le nombre de places que tu choisis.',
    resume: 'Les places comptées de Hopla : un lien de ta page qui s’ouvre avec un code, pour un nombre de places choisi, avec un compteur à jour.',
    offre: 'pro',
    droit: 'drops',
    etapes: [
      { titre: 'Un lien sous cadenas', texte: 'Hugo sort une affiche en édition limitée. Sa page montre le lien, fermé, et les places qui restent.' },
      { titre: 'Le code', texte: 'Ses abonnés l’ont reçu dans sa newsletter. Ils le tapent sur la page.' },
      { titre: 'Débloqué', texte: 'Le lien s’ouvre pour eux, et pour eux seuls.' },
      { titre: 'Une place de moins', texte: 'Le compteur se met à jour tout seul. À zéro, le lien se ferme.' },
    ],
    points: [
      { titre: 'L’exclusivité, simplement', texte: 'Pas de boutique à part ni de liste à gérer : un code et un nombre de places.' },
      { titre: 'Un compteur qui crée l’envie', texte: '« Plus que 3 places » se lit sur ta page et se tient à jour.' },
      { titre: 'Pour tes fidèles', texte: 'Donne le code à ta liste e-mail ou en story, ce sont eux qui passent en premier.' },
    ],
    questions: [
      ['Le code peut-il circuler ?', 'Oui, comme tout code. Le nombre de places, lui, ne bouge pas : une fois atteint, le lien se ferme.'],
      ['Je peux rouvrir un drop ?', 'Oui, en changeant le nombre de places ou le code, depuis le bloc.'],
    ],
  },
  {
    slug: 'avis',
    nom: 'Les avis de tes clients',
    titre: ['Ta note sur 5', 'En bonne place'],
    chapo: 'Ta note Google ou Trustpilot, le nombre d’avis et le mot d’un client, sur ta page. Hopla les reprend chaque jour, tu n’as rien à recopier.',
    resume: 'Affiche ta note Google ou Trustpilot et le mot d’un client sur ta page de liens. Hopla la relit chaque jour.',
    offre: 'starter',
    droit: 'avis',
    etapes: [
      { titre: 'Tes étoiles', texte: 'Inès colle l’adresse de sa page d’avis. Ses étoiles s’affichent.' },
      { titre: 'Ta note et le nombre d’avis', texte: '4,9 sur 5 pour 87 avis : un chiffre qui rassure avant d’acheter.' },
      { titre: 'Le mot d’une cliente', texte: 'Une phrase choisie par toi, sous la note.' },
    ],
    points: [
      { titre: 'Tenue à jour', texte: 'La note est relue chaque jour sur la page collée. Si elle ne se lit pas, tu la tapes une fois.' },
      { titre: 'Là où l’on décide', texte: 'Ton visiteur hésite entre ton lien et un autre : ta note l’aide à choisir.' },
      { titre: 'Sur 5, partout', texte: 'Une note sur 10 ou sur 20 est ramenée sur 5, pour se lire d’un coup d’œil.' },
    ],
    questions: [
      ['Quelles plateformes ?', 'Toute page qui publie sa note dans ses données (Trustpilot, beaucoup de boutiques et de sites d’avis). Pour une fiche Google, tu tapes ta note toi-même.'],
      ['Je choisis le mot affiché ?', 'Oui, tu choisis la phrase et le prénom.'],
    ],
  },
  {
    slug: 'liste-email',
    nom: 'Ta liste e-mail',
    titre: ['Garde le contact', 'Avec tes visiteurs'],
    chapo: 'Un visiteur laisse son e-mail sur ta page et rejoint ta liste. Il part tout seul vers ta newsletter si tu l’as branchée.',
    resume: 'Un champ e-mail sur ta page de liens : tes inscrits partent vers Brevo, Mailchimp, Kit, MailerLite, beehiiv ou un webhook.',
    offre: 'pro',
    droit: 'listeEmail',
    etapes: [
      { titre: 'Une recette chaque dimanche', texte: 'Malik propose sa newsletter sur sa page. Un visiteur tape son adresse.' },
      { titre: '« C’est noté »', texte: 'Un toucher, et c’est fait. Pas de page à part, pas de formulaire à remplir.' },
      { titre: 'Direction ta newsletter', texte: 'L’inscrit part vers Brevo, où Malik écrit déjà. Il le retrouve aussi dans Hopla.' },
    ],
    points: [
      { titre: 'Tes inscrits t’appartiennent', texte: 'Exporte-les quand tu veux, en CSV, et pour Substack.' },
      { titre: 'Branchée en deux gestes', texte: 'Brevo, Mailchimp, Kit, MailerLite, beehiiv, Systeme.io, MailCheap, Loops, ou Make, Zapier et n8n par un webhook.' },
      { titre: 'Un cadeau, si tu veux', texte: 'Un guide ou une remise, envoyé une fois l’e-mail donné, jamais avant.' },
    ],
    questions: [
      ['Et sans newsletter ?', 'Tes inscrits restent dans Hopla, prêts à exporter le jour où tu en choisis une.'],
      ['Mes clés d’API sont-elles protégées ?', 'Elles sont chiffrées et ne reviennent jamais dans ton navigateur.'],
    ],
  },
  {
    slug: 'stats',
    nom: 'Tes stats, en clair',
    titre: ['Tes chiffres', 'En phrases'],
    chapo: 'Tes vues, tes clics et d’où viennent tes visiteurs, dans un tableau de bord. Et chaque lundi à 9 h, l’essentiel par e-mail, écrit comme on le dirait.',
    resume: 'Les stats de ta page de liens : vues, clics, réseaux et pays, sans cookie. Et chaque lundi, l’essentiel par e-mail en phrases.',
    offre: 'starter',
    droit: 'stats',
    etapes: [
      { titre: 'Ta semaine', texte: 'Chaque lundi, Inès reçoit un e-mail. Il commence par ses vues.' },
      { titre: 'D’où viennent tes visiteurs', texte: 'Instagram lui amène le plus de monde : elle sait où poster.' },
      { titre: 'Ton meilleur jour', texte: 'Jeudi, avec 88 vues. Un post ce jour-là ?' },
      { titre: 'Ton lien qui marche', texte: '« Mes pièces du moment » a fait 40 % de clics en plus.' },
      { titre: 'Ce que Hopla a sauvé', texte: '38 clics se sont ouverts dans leur app, sans rester coincés dans Instagram.' },
    ],
    points: [
      { titre: 'Sans cookie ni bannière', texte: 'L’adresse IP de tes visiteurs n’est jamais gardée. Tu n’as rien à déclarer.' },
      { titre: 'Les bons chiffres', texte: 'Vues, visiteurs, clics, taux de clic, réseaux, pays et liens les plus cliqués.' },
      { titre: 'Trente jours ou un an', texte: 'Jusqu’à un an d’historique, pour voir ce qui marche d’une saison à l’autre.' },
    ],
    questions: [
      ['L’e-mail du lundi, je peux l’arrêter ?', 'Oui, d’un interrupteur dans tes réglages.'],
    ],
  },
  {
    slug: 'vitrine',
    nom: 'Ta vitrine',
    titre: ['Ta page qui vend', 'Sans boutique à part'],
    chapo: 'Tes produits avec leur photo et leur prix, ta prise de rendez-vous, un bouton pour te soutenir. Chaque bloc mène au site qui encaisse, Hopla ne prend rien.',
    resume: 'La vitrine Hopla : produits avec photo et prix, prise de rendez-vous, dons et liens partenaires avec code promo, sur ta page de liens.',
    offre: 'starter',
    droit: 'vitrine',
    etapes: [
      { titre: 'Un produit', texte: 'Inès colle l’adresse d’une pièce de sa boutique. Photo, nom et prix se lisent tout seuls.' },
      { titre: 'Un rendez-vous', texte: 'Son agenda Calendly s’ouvre dans la page, sans quitter Hopla.' },
      { titre: 'Un soutien', texte: 'Des montants pour PayPal.Me, ou un bouton pour Ko-fi, Tipeee, Lydia.' },
      { titre: 'Un lien partenaire', texte: 'Avec la mention « Publicité » que demande la loi, et son code promo copié d’un toucher.' },
    ],
    points: [
      { titre: 'Zéro commission', texte: 'Hopla n’encaisse rien : ton client paie sur ta boutique, ton agenda ou ta cagnotte.' },
      { titre: 'Une adresse suffit', texte: 'Hopla reconnaît une fiche produit, un agenda ou une page de soutien, et prend le bon bloc.' },
      { titre: 'Dans les règles', texte: 'La mention « Publicité » d’un lien partenaire s’affiche toujours, comme le demande la loi.' },
    ],
    questions: [
      ['Quelles boutiques sont reconnues ?', 'Shopify, Etsy, WooCommerce et toute page qui déclare son prix. Sinon, tu tapes le prix toi-même.'],
      ['Quels agendas ?', 'Calendly, Cal.com et Google Agenda s’ouvrent dans la page ; Doctolib, Planity, TidyCal et les autres sur leur site.'],
    ],
  },
  {
    slug: 'themes',
    nom: 'Vingt-quatre thèmes',
    titre: ['Une page à toi', 'Ça se voit'],
    chapo: 'Vingt-quatre thèmes, des plus sobres aux plus audacieux, chacun avec sa typographie réglée à la main. Change d’ambiance en un geste.',
    resume: 'Vingt-quatre thèmes pour ta page de liens, chacun avec sa typographie réglée à la main, tous gratuits. Et tes couleurs, ta police et ton fond.',
    offre: 'gratuit',
    etapes: [
      { titre: 'Sobres', texte: 'Pour que tes photos parlent.' },
      { titre: 'Chaleureux', texte: 'Des tons de papier et d’argile.' },
      { titre: 'Audacieux', texte: 'Pour qu’on te reconnaisse au premier coup d’œil.' },
      { titre: 'À toi', texte: 'Tes couleurs, ta police et ton fond, sur la typographie du thème.' },
    ],
    points: [
      { titre: 'Pour toutes les pages', texte: 'Les vingt-quatre thèmes sont là dès ta première page.' },
      { titre: 'Lisibles partout', texte: 'Chaque thème est vérifié pour ses contrastes, ses tailles et sa lecture sur un petit écran.' },
      { titre: 'Un geste pour changer', texte: 'Ton contenu ne bouge pas : seule l’ambiance change.' },
    ],
    questions: [
      ['Je peux mettre mes couleurs ?', 'Oui : le fond, les boutons, l’accent, la police et une image de fond.'],
      ['Mes visiteurs voient-ils un changement brusque ?', 'Non, ta page change dès que tu valides, sans rien casser.'],
    ],
  },
];

export const pageFonction = (slug: string) => PAGES_FONCTIONS.find(p => p.slug === slug);
