import type { Fonction } from '../../lib/abonnement.ts';
import type { Langue } from '../../lib/types.ts';

/*
 * Une page par fonction (26 octobre 2026, demandé par Lilian : « une page par
 * feature, comme ça on la détaille bien, avec l'animation qui va bien »). Les
 * mots vivent ici, la scène de chaque page dans `PageFonction.tsx`. Chaque page
 * se lit en défilant : chaque étape fait avancer la scène, sans rien à toucher.
 * Le plan du site et llms.txt reprennent cette liste.
 */

export type Offre = 'gratuit' | 'starter' | 'pro';

export interface PageFonction {
  /** Le même dans les deux langues : le slug français, qui choisit la scène et la capture. */
  id: string;
  /** L'adresse dans sa langue : `/features/<slug>` en anglais, `/fonctionnalites/<slug>` en français. */
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

const FR: Omit<PageFonction, 'id'>[] = [
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
    resume: 'Ta page de liens change selon l’heure : le podcast le matin, la prise de rendez-vous le soir. Des créneaux par jour de la semaine avec Hopla.',
    offre: 'pro',
    droit: 'heure',
    etapes: [
      { titre: '9 h, la journée commence', texte: 'Nadia forme à la gestion de budget. Le matin, sa page met son podcast en premier.' },
      { titre: 'Les heures passent', texte: 'Tu n’as rien à faire : le créneau est réglé une fois pour toutes.' },
      { titre: '18 h, le soir arrive', texte: '« Réserver un bilan » monte en tête, le podcast passe derrière.' },
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
      { titre: 'Un lien sous cadenas', texte: 'Théo ouvre un stage d’ouvertures à 30 places. Sa page montre le lien, fermé, et les places qui restent.' },
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
      { titre: 'Une astuce chaque dimanche', texte: 'Nadia propose sa newsletter sur sa page. Un visiteur tape son adresse.' },
      { titre: '« C’est noté »', texte: 'Un toucher, et c’est fait. Pas de page à part, pas de formulaire à remplir.' },
      { titre: 'Direction ta newsletter', texte: 'L’inscrit part vers Brevo, où Nadia écrit déjà. Il le retrouve aussi dans Hopla.' },
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


/*
 * Les mêmes pages en anglais (8 novembre 2026, Hopla anglais d'abord), rangées par le slug
 * français : l'offre et le droit restent ceux de la page française.
 */
type Texte = Pick<PageFonction, 'slug' | 'nom' | 'titre' | 'chapo' | 'resume' | 'etapes' | 'points' | 'questions'>;

const EN: Record<string, Texte> = {
  'selon-le-reseau': {
    slug: 'by-network',
    nom: 'Your page by network',
    titre: ['One link', 'The right order for everyone'],
    chapo: 'You put the same link in every bio. Hopla recognizes the network your visitor comes from and puts the link they’re looking for first.',
    resume: 'A link in bio page that reorders itself by your visitor’s network: Instagram, TikTok, YouTube or LinkedIn each see the right link first. Free.',
    etapes: [
      { titre: 'One link in every bio', texte: 'Camille is a photographer. Her Hopla page is the same everywhere, its order isn’t.' },
      { titre: 'From Instagram', texte: 'They just saw her photos: her portfolio comes first.' },
      { titre: 'From TikTok', texte: 'They come from her videos: behind the scenes moves up.' },
      { titre: 'From YouTube', texte: 'They come from her tutorial: the next part is on top.' },
      { titre: 'From LinkedIn', texte: 'A potential client: “Let’s talk about your project” shows up, just for them.' },
    ],
    points: [
      { titre: 'Fewer lost clicks', texte: 'Your visitor doesn’t have to search: the link that follows what they just saw is already on top.' },
      { titre: 'Nothing to duplicate', texte: 'One page to keep up to date, one link to share, whatever the platform.' },
      { titre: 'You decide', texte: 'For each link, you choose where it moves up, or who is the only one to see it.' },
    ],
    questions: [
      ['How does Hopla know where my visitor comes from?', 'From the in-app browser they arrive in (Instagram, TikTok, LinkedIn… identify themselves), from the site they were leaving, or from a small tag you add to your link, like ?s=tiktok. Nothing about them is stored.'],
      ['What if they come from somewhere else?', 'They see your page in the order you chose. The network only moves a link up, it hides nothing unless you ask it to.'],
    ],
  },
  'ouvrir-dans-l-app': {
    slug: 'open-in-app',
    nom: 'Your links open in their app',
    titre: ['Fewer detours', 'More followers'],
    chapo: 'From Instagram or TikTok, a link usually opens in a small browser where nobody is signed in. With Hopla, your music video opens in YouTube.',
    resume: 'From Instagram or TikTok, Hopla opens your YouTube, Spotify and other links right in their app, where your visitor is already signed in. Free.',
    etapes: [
      { titre: 'A tap on Sacha’s video', texte: 'Their visitor comes from Instagram and taps “Blue days, the video”.' },
      { titre: 'Without Hopla: Instagram’s browser', texte: 'The video opens in an Instagram window, where they aren’t signed in to anything.' },
      { titre: 'They’re asked to sign in', texte: 'They close the window and leave. Sacha just lost a subscriber.' },
      { titre: 'With Hopla: the YouTube app', texte: 'The same tap opens YouTube, if the app is installed. Their account is already there.' },
      { titre: 'The video starts', texte: 'No password, no blank page: they watch.' },
      { titre: 'They subscribe', texte: 'With one tap, because they’re at home. That’s what matters to Sacha.' },
    ],
    points: [
      { titre: 'Subscribers, not lost views', texte: 'Your visitor can subscribe, like or save, because they’re signed in to their app.' },
      { titre: 'Nothing to set up', texte: 'Hopla recognizes YouTube, Spotify, TikTok, Instagram and the rest: paste your link, that’s it.' },
      { titre: 'And if the app is missing', texte: 'The link opens in the browser, as before. Nobody hits a dead end.' },
    ],
    questions: [
      ['Which apps are recognized?', 'YouTube, YouTube Music, Spotify, Instagram, TikTok, Threads, X, LinkedIn, Facebook, Pinterest, Snapchat, Twitch, WhatsApp and Telegram. The list grows with requests.'],
      ['Does it work on iPhone and Android?', 'Yes, on both, from the in-app browsers of Instagram, TikTok, Facebook, LinkedIn, Threads and Snapchat.'],
    ],
  },
  'page-selon-l-heure': {
    slug: 'by-time-of-day',
    nom: 'Your page by time of day',
    titre: ['At noon, the menu', 'At night, the booking'],
    chapo: 'You pick the hours, Hopla puts the right link on top at the right time. Your page follows your day without you touching it.',
    resume: 'Your link in bio page changes with the time of day: your podcast in the morning, your booking link at night. Time slots per weekday with Hopla.',
    etapes: [
      { titre: '9 am, the day begins', texte: 'Nadia teaches budgeting. In the morning, her page puts her podcast first.' },
      { titre: 'The hours go by', texte: 'You have nothing to do: the time slot is set once and for all.' },
      { titre: '6 pm, evening comes', texte: '“Book a session” moves to the top, the podcast steps back.' },
    ],
    points: [
      { titre: 'One time slot per link', texte: 'Monday to Friday from 9 am to 6 pm, weekends, evenings: you choose the days and hours.' },
      { titre: 'Moved up or hidden', texte: 'A link can move to the top during its time slot, or only show up during it.' },
      { titre: 'On your time', texte: 'Hopla follows your time zone, summer and winter.' },
    ],
    questions: [
      ['Can I set several time slots?', 'Yes, one per link, and each link has its own.'],
      ['What does a visitor see outside the time slot?', 'The link goes back to its usual place, or disappears if you set it to show only during its time slot.'],
    ],
  },
  lancement: {
    slug: 'scheduled-launches',
    nom: 'Your scheduled launches',
    titre: ['A countdown', 'Then the link opens'],
    chapo: 'Announce your new collection without revealing its address. At the set time, the link opens on its own, even if you’re busy elsewhere.',
    resume: 'Schedule a link on your page: a countdown, then it opens at the set time. Start and end dates with Hopla.',
    etapes: [
      { titre: 'The announcement', texte: 'Inès launches her new pieces tonight at 6 pm. Her page shows the countdown, not the address.' },
      { titre: 'The last seconds', texte: 'Her visitors come back to check. The countdown keeps itself up to date.' },
      { titre: '6 pm: it’s open', texte: 'The link replaces the countdown, at the top of the page. Nobody had the address before.' },
    ],
    points: [
      { titre: 'A start date, an end date', texte: 'A link appears and disappears when you said so: a sale, a live, a signup.' },
      { titre: 'The countdown, if you want', texte: 'It brings your visitors back, and nothing leaks before the time.' },
      { titre: 'Scheduled from your phone', texte: 'Two dates to pick in the block, done.' },
    ],
    questions: [
      ['Can the address leak before the time?', 'No: until the link is open, its address isn’t in the page.'],
      ['And after the end date?', 'The link disappears from your page. It stays in your dashboard, ready to be used again.'],
    ],
  },
  drops: {
    slug: 'drops',
    nom: 'Your limited spots',
    titre: ['A private link', 'Limited spots'],
    chapo: 'A limited edition, an early access, a guest list: the link opens with a code, for the number of spots you choose.',
    resume: 'Hopla drops: a link on your page that opens with a code, for a chosen number of spots, with a live counter.',
    etapes: [
      { titre: 'A locked link', texte: 'Théo opens a 30-spot chess openings course. His page shows the link, locked, and the spots left.' },
      { titre: 'The code', texte: 'His subscribers got it in his newsletter. They type it on the page.' },
      { titre: 'Unlocked', texte: 'The link opens for them, and for them only.' },
      { titre: 'One spot fewer', texte: 'The counter updates itself. At zero, the link closes.' },
    ],
    points: [
      { titre: 'Exclusivity, simply', texte: 'No separate store or list to manage: a code and a number of spots.' },
      { titre: 'A counter that builds desire', texte: '“Only 3 spots left” shows on your page and keeps itself up to date.' },
      { titre: 'For your regulars', texte: 'Give the code to your email list or in a story, they get in first.' },
    ],
    questions: [
      ['Can the code get around?', 'Yes, like any code. The number of spots doesn’t move: once reached, the link closes.'],
      ['Can I reopen a drop?', 'Yes, by changing the number of spots or the code, from the block.'],
    ],
  },
  avis: {
    slug: 'reviews',
    nom: 'Your customer reviews',
    titre: ['Your rating out of 5', 'Front and center'],
    chapo: 'Your Google or Trustpilot rating, your number of reviews and a customer’s words, on your page. Hopla reads them every day, nothing to copy.',
    resume: 'Show your Google or Trustpilot rating and a customer’s words on your link in bio page. Hopla reads it again every day.',
    etapes: [
      { titre: 'Your stars', texte: 'Inès pastes the address of her reviews page. Her stars show up.' },
      { titre: 'Your rating and number of reviews', texte: '4.9 out of 5 from 87 reviews: a number that reassures before buying.' },
      { titre: 'A customer’s words', texte: 'A sentence you choose, under the rating.' },
    ],
    points: [
      { titre: 'Kept up to date', texte: 'The rating is read again every day on the pasted page. If it can’t be read, you type it once.' },
      { titre: 'Where people decide', texte: 'Your visitor hesitates between your link and another one: your rating helps them choose.' },
      { titre: 'Out of 5, everywhere', texte: 'A rating out of 10 or 20 is brought back to 5, to be read at a glance.' },
    ],
    questions: [
      ['Which platforms?', 'Any page that publishes its rating in its data (Trustpilot, many stores and review sites). For a Google listing, you type your rating yourself.'],
      ['Do I choose the words shown?', 'Yes, you choose the sentence and the first name.'],
    ],
  },
  'liste-email': {
    slug: 'email-list',
    nom: 'Your email list',
    titre: ['Stay in touch', 'With your visitors'],
    chapo: 'A visitor leaves their email on your page and joins your list. It goes straight to your newsletter if you connected it.',
    resume: 'An email field on your link in bio page: your subscribers go to Brevo, Mailchimp, Kit, MailerLite, beehiiv or a webhook.',
    etapes: [
      { titre: 'A tip every Sunday', texte: 'Nadia offers her newsletter on her page. A visitor types their address.' },
      { titre: '“Got it”', texte: 'One tap, done. No separate page, no form to fill in.' },
      { titre: 'Off to your newsletter', texte: 'The subscriber goes to Brevo, where Nadia already writes. They also show up in Hopla.' },
    ],
    points: [
      { titre: 'Your subscribers are yours', texte: 'Export them whenever you want, as CSV, and for Substack.' },
      { titre: 'Connected in two steps', texte: 'Brevo, Mailchimp, Kit, MailerLite, beehiiv, Systeme.io, MailCheap, Loops, or Make, Zapier and n8n through a webhook.' },
      { titre: 'A gift, if you want', texte: 'A guide or a discount, sent once the email is given, never before.' },
    ],
    questions: [
      ['And without a newsletter?', 'Your subscribers stay in Hopla, ready to export the day you pick one.'],
      ['Are my API keys protected?', 'They’re encrypted and never come back to your browser.'],
    ],
  },
  stats: {
    slug: 'analytics',
    nom: 'Your analytics, in plain words',
    titre: ['Your numbers', 'In sentences'],
    chapo: 'Your views, your clicks and where your visitors come from, in a dashboard. And every Monday at 9 am, the highlights by email, written the way you’d say them.',
    resume: 'Analytics for your link in bio page: views, clicks, networks and countries, without cookies. And every Monday, the highlights by email in sentences.',
    etapes: [
      { titre: 'Your week', texte: 'Every Monday, Inès gets an email. It starts with her views.' },
      { titre: 'Where your visitors come from', texte: 'Instagram brings her the most people: she knows where to post.' },
      { titre: 'Your best day', texte: 'Thursday, with 88 views. A post that day?' },
      { titre: 'Your link that works', texte: '“My pieces of the moment” got 40% more clicks.' },
      { titre: 'What Hopla saved', texte: '38 clicks opened in their app, instead of getting stuck in Instagram.' },
    ],
    points: [
      { titre: 'No cookies, no banner', texte: 'Your visitors’ IP address is never stored. Nothing to declare.' },
      { titre: 'The right numbers', texte: 'Views, visitors, clicks, click rate, networks, countries and most clicked links.' },
      { titre: 'Thirty days or a year', texte: 'Up to a year of history, to see what works from one season to the next.' },
    ],
    questions: [
      ['Can I turn off the Monday email?', 'Yes, with a switch in your settings.'],
    ],
  },
  vitrine: {
    slug: 'storefront',
    nom: 'Your storefront',
    titre: ['A page that sells', 'Without a separate store'],
    chapo: 'Your products with their photo and price, your booking link, a button to support you. Each block leads to the site that takes the payment, Hopla takes nothing.',
    resume: 'The Hopla storefront: products with photo and price, bookings, tips and affiliate links with promo codes, on your link in bio page.',
    etapes: [
      { titre: 'A product', texte: 'Inès pastes the address of a piece from her store. Photo, name and price are read on their own.' },
      { titre: 'A booking', texte: 'Her Calendly opens inside the page, without leaving Hopla.' },
      { titre: 'A tip', texte: 'Amounts for PayPal.Me, or a button for Ko-fi, Buy Me a Coffee, Patreon.' },
      { titre: 'An affiliate link', texte: 'With the “Ad” label the law requires, and its promo code copied with one tap.' },
    ],
    points: [
      { titre: 'Zero commission', texte: 'Hopla takes no payment: your customer pays on your store, your calendar or your tip page.' },
      { titre: 'An address is enough', texte: 'Hopla recognizes a product page, a calendar or a tip page, and picks the right block.' },
      { titre: 'By the rules', texte: 'The “Ad” label on an affiliate link always shows, as the law requires.' },
    ],
    questions: [
      ['Which stores are recognized?', 'Shopify, Etsy, WooCommerce and any page that declares its price. Otherwise, you type the price yourself.'],
      ['Which calendars?', 'Calendly, Cal.com and Google Calendar open inside the page; Acuity, TidyCal and the others on their own site.'],
    ],
  },
  themes: {
    slug: 'themes',
    nom: 'Twenty-four themes',
    titre: ['A page of your own', 'It shows'],
    chapo: 'Twenty-four themes, from the most understated to the boldest, each with typography tuned by hand. Change the mood in one tap.',
    resume: 'Twenty-four themes for your link in bio page, each with hand-tuned typography, all free. Plus your colors, your font and your background.',
    etapes: [
      { titre: 'Understated', texte: 'So your photos do the talking.' },
      { titre: 'Warm', texte: 'Paper and clay tones.' },
      { titre: 'Bold', texte: 'So people recognize you at first glance.' },
      { titre: 'Yours', texte: 'Your colors, your font and your background, on the theme’s typography.' },
    ],
    points: [
      { titre: 'For every page', texte: 'All twenty-four themes are there from your very first page.' },
      { titre: 'Readable everywhere', texte: 'Every theme is checked for contrast, sizes and reading on a small screen.' },
      { titre: 'One tap to change', texte: 'Your content stays put: only the mood changes.' },
    ],
    questions: [
      ['Can I use my own colors?', 'Yes: the background, the buttons, the accent, the font and a background image.'],
      ['Do my visitors see a sudden change?', 'No, your page changes as soon as you confirm, without breaking anything.'],
    ],
  },
};

const PAGES: Record<Langue, PageFonction[]> = {
  fr: FR.map(p => ({ ...p, id: p.slug })),
  en: FR.map(p => ({ ...p, ...EN[p.slug], id: p.slug })),
};

/** Les pages des fonctions dans une langue. */
export const pagesFonctions = (langue: Langue) => PAGES[langue];
/** Les pages en français : le plan du site et ce qui n'a pas encore de langue. */
export const PAGES_FONCTIONS = PAGES.fr;
/** La page d'un slug, dans sa langue. */
export const pageFonction = (slug: string, langue: Langue = 'fr') => PAGES[langue].find(p => p.slug === slug);
/** La même page dans l'autre langue, par son id. */
export const pageParId = (id: string, langue: Langue) => PAGES[langue].find(p => p.id === id);

/** Le chemin des fonctions dans une langue : `/features` en anglais, `/fonctionnalites` en français. */
export const CHEMIN_FONCTIONS: Record<Langue, string> = { en: '/features', fr: '/fonctionnalites' };
/** L'adresse d'une fonction, par son id, dans une langue. */
export const cheminFonction = (id: string, langue: Langue) => `${CHEMIN_FONCTIONS[langue]}/${pageParId(id, langue)?.slug ?? id}`;
