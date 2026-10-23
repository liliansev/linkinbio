# CLAUDE.md

Hopla (dépôt `linkinbio`) : une page publique de liens par personne, à la
Linktree, éditée depuis un back office pensé d'abord pour le mobile. Né dans le
dossier `liens/` du dépôt `liliansev/liliansevoumian` (PR #43 à #49), sorti ici
avec son historique le 17 octobre 2026, passé sur hopla.page le 18 octobre 2026.

Les pages vivent sur `hopla.page/<pseudo>` (celle de Lilian, le compte
principal, sur `/lilian`), le back office sur `app.hopla.page`, l'accueil sur
`hopla.page`. Les anciennes adresses `liliansevoumian.fr/liens/...` redirigent.

## Commandes

```bash
pnpm dev         # vite sur localhost:4400
pnpm build       # dist/client et dist/server ; régénère src/routeTree.gen.ts (ignoré par git)
pnpm typecheck   # après un build
pnpm test        # tests de l'app (src/**/*.test.ts) puis du serveur (deploy/server.test.mjs)
pnpm start       # deploy/server.mjs sur dist/ (PORT, LIENS_DB, LIENS_ORIGINE, LIENS_ORIGINE_ADMIN, CONTACT_TO, LIENS_INSCRIPTION, LIENS_CLOUDFLARE)
```

Sans `RESEND_API_KEY` ni `NODE_ENV=production`, les liens de connexion s'affichent
dans la console. Le bundle se croit toujours en production : pour un essai de
`pnpm start` en local, donner `LIENS_ORIGINE` et `LIENS_ORIGINE_ADMIN` à
`http://localhost:<port>`.

## Pile

TanStack Start (React 19, Vite 8), Tailwind v4, SQLite via
`node:sqlite`, pnpm. En production, `deploy/server.mjs` sert les fichiers de
`dist/client`, range les requêtes entre hopla.page et app.hopla.page, relaie
l'API du site de Lilian (`LIENS_SITE`) et passe le reste à l'app (un `fetch(Request)`). Le bundle serveur
embarque tout : l'image n'a pas de `node_modules`.

## Carte de `src/`

- `server/db.ts` : toute la base. Une seule base, une colonne `compte` partout ;
  le compte de Lilian a l'id `'principal'`. Purge (`CONSERVATION`, `purger()`),
  abonnement, signalements, `exporter()`.
- `server/fonctions.ts` : server functions. `sessionBrute` lit le compte sans les
  CGU, `session` les vérifie, `proprietaire` réserve au compte principal.
- `server/auth.ts` (liens magiques de 15 minutes, sessions de 90 jours ; `renvoyerLienCompte`, « Renvoyer son lien » depuis
  Comptes : l'invitation de 7 jours pour une page jamais ouverte, un lien de connexion de 24 heures sinon, un par minute),
  `server/courriel.ts` (Resend), `server/analytique.ts` (stats sans cookie, IP
  jamais stockée), `server/moderation.ts` (DSA), `server/creem.ts` (paiement, changement d'offre au prorata,
  résiliation, webhooks signés), `server/suppression.ts` (supprimer un compte résilie d'abord son abonnement Creem ;
  si Creem ne répond pas, refusé une fois, puis supprimé et signalé à Lilian par e-mail pour le résilier à la main),
  `server/gestes.ts` (les gestes de Lilian sur l'abonnement d'un compte, 23 octobre 2026 : `resilierPourLeCompte` pour la fin
  de la période payée, `offrirAuCompte` et `retirerAuCompte` ; résilier et offrir préviennent la personne par e-mail, avec son mot),
  `server/apercu.ts` (aperçu de site, anti-SSRF : l'adresse se vérifie au moment de la connexion ; lu en voix d'aperçu puis
  de navigateur, jusqu'au `</head>`, dans le jeu de caractères annoncé, par l'oEmbed pour YouTube, Vimeo, Spotify et
  SoundCloud ; une page de vérification, de consentement ou d'erreur ne donne jamais son titre ; `image: false` pour le
  titre seul ; le prix d'un produit, lu dans les balises des boutiques puis dans le JSON-LD, et `image: 'partage'` pour sa
  photo : l'image de partage ou rien, jamais une capture ; `'logo'` pour le logo du site, cherché dans ses icônes déclarées,
  son manifeste, `/apple-touch-icon.png` puis le favicon (un ICO rendu en PNG), et `'vignette'` pour la vignette d'un
  bouton : l'image de partage si elle est carrée, sinon le logo, `visuel` dit laquelle est venue), `server/droits.ts` (`droits()` d'un compte, `verifierDates`
  avant d'enregistrer un bloc, `joursLisibles` pour les stats).
- `server/liste.ts` : « Rejoins ma liste ». Les inscrits restent chez Hopla (export CSV) et partent là où la personne a
  branché sa liste (22 octobre 2026) : six newsletters par leur API (Brevo, Mailchimp, Kit, MailerLite, beehiiv,
  Systeme.io ; `listes()` pour choisir la liste par son nom, `verifier()`, `pousser()`), ou Make, Zapier et n8n par un
  webhook, qui reçoit un inscrit d'exemple au branchement. Substack n'a pas d'API : `adressesSubstack` et `csvSubstack`
  (`/api/contacts?format=substack`). La clé, ou l'adresse du webhook, est chiffrée au repos et ne revient jamais au
  navigateur. Un inscrit n'attend pas un fournisseur lent plus de 4 secondes. `server/sortante.ts` : `requeteSortante`, le
  transport des intégrations en production ; les API des newsletters (hôtes fixes) par `fetch`, tout autre hôte par
  `requetePublique` : https seulement, une adresse publique vérifiée à la connexion (`resolutionPublique`), sans
  redirection, 2 Mo au plus. Brancher demande Pro et passe par `tropDAppels` (20 appels par 10 minutes et par compte).
- `server/limites.ts` : les limites anti-abus en mémoire (`limiteur`, `cleIp` qui
  compte une IPv6 pour son /64) et `destinataireSature`, cinq e-mails par heure et
  dix par jour vers une adresse tapée par un inconnu. `server/turnstile.ts` vérifie
  le jeton Turnstile des formulaires publics, que `lib/turnstile.ts` obtient dans la
  page (`avecJeton`) ; en sommeil sans `TURNSTILE_SITE_KEY` et `TURNSTILE_SECRET`.
- `lib/` : `types.ts` (origines, `cheminPage`, `urlPage`), `valider.ts`, `themes.ts`, `legal.ts` (`VERSION_CGU`),
  `abonnement.ts` (les quatre offres Gratuit, Starter, Pro, Premium : prix, `FONCTIONS`, `peut()`, `joursStats()`, `estPaye()` ;
  `offreSuivante()` et ses `ACCROCHES` pour l'appel à l'offre du dessus, `sensDuChangement()`, `accesAbonnement()` ; dans `Abonnement`,
  `plan` est l'offre de la page, la plus haute de `payee`, ce que Creem facture, et d'`offerte`, une offre offerte depuis Comptes
  qui court : les droits suivent `plan`, tout ce qui touche à Creem suit `payee` ; `effetOffert`, `offresAOffrir`, `apresAbonnement`,
  `apresOffre`), `droits.ts`
  (`selonDroits` retire de la page publique ce que l'offre ne comprend pas, sans rien effacer ; `nouvellesDates`),
  `mots.ts` (les mots de la page publique, au « tu » ou au « vous »), `stats.ts` (les quatre chiffres de l'onglet Stats, leurs écarts,
  l'échelle de la courbe, et `COULEURS_SOURCES`, la couleur de chaque réseau), `courbe.ts` (le tracé lisse des courbes de stats
  et leur dégradé, au back office comme sur l'accueil), `periode.ts` (la période des stats : une durée de `DUREES` ou des dates
  `{ du, au }`, en jours de Paris ; `lirePeriode`, `borner` à l'historique de l'offre, `nomPlage`), `resume.ts` (« En bref », et le
  résumé du lundi), `comptes.ts` (statut,
  dernière connexion et recherche de l'onglet Comptes),
  `achat.ts` (le retour d'un paiement : la note posée avant Creem, puis « On active », « C'est fait » ou l'attente, d'après l'abonnement relu),
  `integrations.ts` (le nom de chaque outil, le mot qu'il emploie pour sa liste, `adresseWebhook` pour la forme d'une adresse
  de webhook, `destination` : « chez Brevo, la liste « Newsletter » »),
  `vitrine.ts` (les sites de soutien et les agendas que la page sait nommer, Doctolib, TidyCal, Acuity, HubSpot… compris,
  l'adresse PayPal.Me d'un montant, et `adresseIntegree` : Calendly, Cal.com et Google Agenda s'ouvrent dans la page, les
  autres sur leur site), `detection.ts` (`typeDeAdresse` : ce qu'est une adresse collée, vidéo YouTube, agenda, fiche
  d'une boutique, page de soutien ou simple lien, et `versType` qui fait passer un bloc de l'un à l'autre).
- `admin/` : onglets Ma page, Stats, Intégrations, Comptes (principal seulement), Réglages. Dans Comptes (23 octobre 2026,
  demandé par Lilian : « tout faire sur un compte »), un compte s'ouvre en fiche (`FicheCompte` dans `OngletComptes.tsx`, une
  sous-page en lignes comme Réglages, 680 px au bureau) : sa page, « Renvoyer son lien », son offre (offrir avec `FormOffrir`, retirer,
  résilier l'abonnement), la modération et la suppression, chaque geste après une confirmation. Sur un grand écran (22 octobre 2026, d'après MailCheap et
  Resend), l'app prend toute la largeur, la barre latérale collée au bord gauche, et l'en-tête comme le contenu de chaque
  onglet tiennent dans une colonne centrée (`adm-colonne`, largeur `--adm-colonne` selon `data-onglet` : 1120 px, 680 pour
  Réglages et Intégrations, 1300 pour Ma page) ; les premiers pas dans 1200 px (`adm-premiers`). Réglages tient sur une seule page de lignes
  (`Groupe`, `Ligne`, `LigneLien` dans `ui.tsx`) ; un détail s'y ouvre en sous-page (`SousPage`), avec un fil dans l'en-tête,
  comme `Facturation.tsx`, « Mon abonnement » (l'offre, son échéance, la carte et les factures au portail client de Creem,
  puis « Résilier mon abonnement »). Dans le groupe Abonnement, « Mes factures » ouvre ce portail pour tout compte que Creem
  connaît, même redevenu Gratuit (`accesAbonnement`). Les offres s'ouvrent dans une fenêtre par-dessus l'écran en cours, depuis
  une fonction réservée (`Reserve`, `voirOffres(fonction)` dans `offre.tsx`), les stats, Réglages ou l'appel à l'offre du dessus
  (`AppelOffre` dans `offre.tsx` : au bureau au-dessus du compte, au téléphone sous la page ; rien pour le compte principal, Pro,
  une résiliation ou un impayé) : `Offres.tsx` (`FenetreOffres`, le récapitulatif avant Creem, `RepasserGratuit` qui résilie pour
  la fin de la période payée, `RetourPaiement` au retour, dont le geste ramène où servir l'offre ; parti d'une règle de bloc, au bloc,
  la règle ouverte par `RegleAOuvrir` dans `ReglesBloc.tsx`).
  Intégrations (`OngletIntegrations.tsx`, 22 octobre 2026, demandé par Lilian) reprend les lignes de Réglages, une par outil,
  son vrai logo seul dans la couleur de sa marque (la bulle de MailerLite, l'abeille de beehiiv, le rond de Systeme.io). Un bloc ouvert depuis Intégrations y ramène quand on le referme (croix, Annuler, retour du téléphone), sur la sous-page d'où l'on venait ; le retour du téléphone depuis un autre onglet que Ma page ramène à Ma page : Newsletter (une clé, puis la liste
  choisie par son nom ; Substack par la copie des adresses ou le fichier), Sur ta page (avis, rendez-vous, soutien, produit :
  un toucher ajoute le bloc à Ma page, ou l'y ouvre), puis en dernier Automatisations (Make, Zapier, n8n, par l'adresse d'un webhook).
  Chaque outil s'ouvre en sous-page, avec le fil « Intégrations / Brevo ». La carte « Ta liste » des stats y mène.
  Dans Stats (22 octobre 2026, demandé par Lilian), la période se choisit d'un toucher sur un rail (7 j, 14 j, 30 j, 90 j,
  12 mois, selon l'historique de l'offre ; au-delà, un bouton verrouillé par offre, avec son badge, ouvre les offres) ou en
  dates : `ChoixPeriode.tsx`, un calendrier dans une feuille au téléphone (un mois, glissé ou fléché), dans une bulle au bureau
  (deux mois). Le serveur borne toute période à l'historique de l'offre (`periodeLisible` dans `server/droits.ts`).
  `MaPage.tsx`, au bureau (direction A, 21 octobre 2026, choisie par Lilian) : l'édition
  à gauche, la page à droite. À gauche, deux onglets collés : Contenu (le profil, une
  adresse à coller, puis les blocs en rangées, déplacées par leur poignée avec dnd-kit,
  souris ou clavier, et dépliées en place sur `EditeurBloc` `bureau`, une à la fois ;
  un bloc neuf a sa rangée en haut ou en bas) et Design (`DesignTiroirs`). À droite,
  `PageLiens` reçoit `liste` et se montre dans un téléphone de 390 px, collé et réduit
  s'il le faut : elle suit chaque frappe, un bloc neuf y prend déjà sa place, un clic
  sur un bloc ouvre sa rangée. Au téléphone, `MaPage` édite la page elle-même :
  `PageLiens` reçoit `edition` (nom et bio tapés en place, photo, réseaux et blocs
  ouverts d'un toucher, blocs déplacés en les maintenant), le design s'ouvre dans une
  feuille `cote` qui laisse voir la page, et la liste d'avant (`OngletLiens`) reste à
  un toucher. La feuille d'un bloc (22 octobre 2026) s'arrête sous lui, entre la moitié
  et 86 % de l'écran (`plafond`), et garde sa hauteur d'une page à l'autre ; elle porte le nom du bloc
  (« Le blog · masqué · programmé »), le type seul pour un bloc neuf. Ce que la page montre se règle
  sur la première page du bloc, seul ce qu'elle ne montre pas attend derrière « Plus de réglages »
  (23 octobre 2026, revue pilote-design-produit, demandée par Lilian) : le texte, la description d'un lien dont la
  forme la montre, le sous-titre (replié derrière « Ajouter un sous-titre » tant qu'il est vide), les montants de
  « Me soutenir », puis les quatre gestes
  courants (22 octobre 2026, demandé par Lilian : « vraiment simple ») :
  Visible, Mis en avant, puis Quand (`ReglageQuand` : Apparaît « Maintenant », Disparaît « Jamais »,
  le sélecteur natif posé sur la ligne ; le créneau de la semaine dessous, du lundi au vendredi de 9 h à 18 h,
  en avant, au premier jour touché, comme le serveur) et Pour qui (`ReglagePourQui` :
  une seule liste de réseaux sous « Venus de », deux interrupteurs Affiché et En avant), chacune une ligne qui dit ce qui
  est réglé (`resumeQuand`, `resumePourQui`, « Seulement venus d'Instagram ») et mène à sa page ; « Mis en avant »
  allumé fait paraître Apparence dessous (forme, couleur, animation ; l'animation seule pour un produit ou une prise
  de rendez-vous). Au bureau, ces lignes se déplient en place, une seule à la fois (`ReplisExclusifs`), et
  Visible et Mis en avant s'empilent comme au téléphone. Un bloc que son créneau ou ses dates retirent en ce moment se grise sur la page éditée
  (`horsCreneauOuDates` dans `lib/moments.ts`). « Plus de réglages » ne garde que le rare (lien partenaire,
  accès réservé, Visible par Google, demander le prénom ; absent pour un bloc qui n'a rien de tout cela ; sa ligne
  n'écrit rien tant que rien n'est réglé, ce qui l'est en bleu), en pages (`PagesBloc` dans `ReglesBloc.tsx`), avec une flèche dans l'en-tête de la feuille (`useFilFeuille`).
  Au téléphone, un bloc neuf se pose tout de suite sur la page (en haut, ou en bas depuis « Ajouter un bloc »
  sous les blocs) avec sa feuille dessous ; sa flèche ramène au choix des blocs avec son brouillon : l'adresse
  tapée attend dans « Colle une adresse », un autre type choisi reprend adresse et texte (`versType`), et fermer
  le choix ajoute le bloc, avec Annuler, comme la croix et le retour du téléphone. Ce choix est une feuille qui
  s'ouvre sur « Colle une adresse » et son bouton Coller ; au bureau, un menu sous « Ajouter un bloc »
  (`MenuAjout` dans `OngletLiens.tsx` : flèches, Échap, une lettre pour aller au type). Ses types vont en trois
  familles séparées d'un filet sans titre (`groupe` de `TYPES`) : ce qui part d'une adresse, ce qu'on écrit, ce
  que Hopla branche. Au bureau, un bloc neuf s'ajoute aussi de Cmd ou Ctrl + Entrée ; la rangée ouverte garde son
  en-tête collé en haut tant qu'on la fait défiler, un filet dessous tant qu'il colle ; la replier après un
  changement dit « Modifications enregistrées », dont Annuler rend le bloc tel qu'il était à l'ouverture.
  Un bloc neuf commencé se garde sur l'appareil à chaque frappe (23 octobre 2026, `hopla-bloc-commence:<pseudo>`) et
  s'efface quand il est ajouté, annulé, rendu à la liste par sa flèche ou laissé vide : une page rechargée ou refermée le
  rouvre une fois sur Ma page, à sa place, « Repris là où tu l'avais laissé » (`relireBlocCommence` dans
  `lib/editionBloc.ts`, une semaine au plus). Rouvert ainsi, ou par la même adresse recollée, il est `repris` : déjà
  commencé (fermer l'ajoute), il garde son type et son adresse ne se relit pas.
  Une adresse collée dans un bloc neuf prend le bloc qui lui va (23 octobre 2026, demandé par Lilian : « que ça détecte
  automatiquement de quoi il s'agit ») : une vidéo, un agenda, une fiche de boutique (et une page qui déclare un prix) ;
  « En faire un simple lien », sous l'adresse, la rend à un lien. Le site se lit tout seul, et une autre adresse le relit
  dès qu'on cesse de taper (22 octobre 2026) : le texte, l'image et la description qui venaient de l'ancienne adresse
  (vides, lus par Hopla, ou l'adresse effacée puis retapée) prennent ceux de la nouvelle ; une icône choisie reste.
  L'image d'un lien ou la photo d'un produit tient dans une vignette au début du champ de son texte (23 octobre 2026,
  « une icône très discrète, un crayon ») : l'image, l'icône ou un picto, et un petit crayon, qui ouvrent un menu
  (image du site, logo du site, une photo, une icône, retirer) ; un logo se pose sur du blanc (`preparerLogo` dans `ui.tsx`).
  Le retour du téléphone referme une couche à la fois (`couches.ts` : chaque feuille,
  page de bloc, tiroir du design, sous-page de Réglages ou aperçu pose une entrée dans
  l'historique, que le routeur ne voit pas). En tête, `BienDemarrer.tsx` :
  l'adresse à copier ou partager, et les étapes d'une page prête (`lib/demarrage.ts`) ;
  au téléphone, un anneau dans l'en-tête ouvre ces étapes dans une feuille, et Ajouter
  et Personnaliser se posent sur la barre des onglets : la page commence sous l'en-tête.
  Un compte neuf, juste après les CGU, passe par `PremiersPas.tsx` (nom et bio, liens,
  réseaux, ambiance, page en ligne), avec sa page en miniature qui se remplit ; une
  seule fois, et seulement tant que la page est vide (`pageNeuve`).
- `components/PageLiens.tsx` : la page publique. Ouverte dans le navigateur intégré d'une app (LinkedIn,
  Instagram…), elle se montre directement : la feuille qui proposait Safari ou Chrome (21 octobre 2026) a été
  retirée le 22 octobre 2026, à la demande de Lilian. La vitrine (22 octobre 2026,
  choisie par Lilian) : `Produit` (photo, nom et prix lus sur la boutique), `Soutien` (des montants pour
  PayPal.Me, un bouton pour Ko-fi, Tipeee, Lydia…), `Reservation` (l'agenda dans une feuille, `FeuilleAgenda`,
  quand il se laisse intégrer), et pour un lien partenaire (`partenariat` sur un lien ou un produit), `Mention`
  et `CodePromo`, copié d'un geste. Hopla n'encaisse et ne réserve rien : chaque bloc mène au site qui le fait.
  Le pied (23 octobre 2026, demandé par Lilian, d'après Linktree) : « Créer ma page avec Hopla » (comptes Gratuit) à
  l'accent du thème (`--mention-hopla`, `mentionPied` le pousse vers le texte juste assez pour se lire), puis loin
  dessous, au bas de l'écran sur une page courte, Confidentialité · Signaler en petit (`--pied-legal`), sur toutes les
  pages, celle de Lilian comprise : chaque lien a sa cible de 44 px et aucune ne touche l'autre. Le damier et les
  étoiles s'effacent dans la dernière bande de l'écran, où se posent ces liens.
- `accueil/` : l'accueil de hopla.page (`routes/index.tsx`, styles dans `styles/accueil.css` et, pour la
  version « des visages » du 21 octobre 2026, `styles/accueil-profils.css` sous `.hl-humain`), en bleu, vert
  citron et papiers crème, autour de six profils imaginés (portraits générés, provenance en `.webp.json`) ;
  sa charte est `docs/DESIGN-LP.md`. Chaque mouvement est joué une fois (les onglets Sans / Avec Hopla
  rejouent leur scène). On y prend
  son nom : par défaut la page se crée aussitôt et le lien part (`creerHopla` dans `server/attente.ts`) ;
  avec `LIENS_INSCRIPTION=attente`, on retrouve la liste d'attente (table `attente`, un an au plus,
  invitée depuis l'onglet Comptes). Les mots qui changent d'un mode à l'autre et les questions vivent
  dans `accueil/textes.ts`, repris par les données structurées et `llms.txt`.
- Marque : `components/Logo.tsx` (le symbole, un « h » et sa balle) ; favicon, icônes, manifeste et
  image de partage dans `public/`. `server/referencement.ts` écrit `robots.txt`, `sitemap.xml` et
  `llms.txt` (routes `robots[.]txt.ts`…) ; le back office ne s'indexe pas.
- `demo/` : aperçu statique avec une API simulée, publié en Artifact ; `#nouveau` y
  rejoue l'arrivée d'un nouvel inscrit, `#page=<thème>` montre la page dans un thème, `#vitrine=<thème>`
  la vitrine d'exemple (produits, liens partenaires, réservations, soutiens), `#mention=<thème>` une page courte d'un
  compte Gratuit, pour la planche du pied.

## Règles

- Tout le texte est en français, sans tiret cadratin. Le service s'appelle Hopla.
- Toute modification des CGU ou de l'accord de traitement change `VERSION_CGU`.
- Pas de DataFast sur Hopla tant qu'il n'a pas son propre site DataFast.
- QA : agent-browser (headless). Playwright est interdit.
- Chaque thème ajouté ou retouché passe par la vérification typographique d'Impeccable (`typeset`) et par une planche de captures de tous les thèmes (`demo`, `#page=<id>`) avant d'être poussé : un nom sur une ligne, des cartes lisibles.
- Le back office prend les couleurs de l'accueil (22 octobre 2026, demandé par Lilian ; il était en noir et blanc depuis le 19) : dans `.adm`, `white` reste l'encre et `nuit` le papier (voir `src/styles/admin.css`), et `--adm-bleu`, `--adm-citron` et `--adm-creme` portent la palette de l'accueil. Le bleu Hopla est l'action, la sélection et les données (bouton principal `bg-bleu`, interrupteur, focus, onglet ouvert, courbe et barres des stats) et fait la barre latérale, l'en-tête du téléphone et les écrans d'entrée ; le citron, ce qui se gagne (Mis en avant, mois offerts, une hausse) ; le crème, la page qu'on regarde. L'appel prend l'accent de sa surface : bleu sur le papier, citron sur le bleu (son texte en `--adm-citron-encre`). Un texte posé sur un bouton bleu ou rouge s'écrit `text-nuit`. Dans « Réseaux », comme sur l'accueil, le logo d'un réseau dans sa couleur et sa barre dans une teinte claire de celle-ci (`COULEURS_SOURCES`), le nom toujours à l'encre ; Direct, QR code et les sources sans marque restent gris. Les courbes des stats, au back office comme sur l'accueil, se tracent avec `lib/courbe.ts` : lisses sans dépasser leurs points, sur un dégradé bleu. Le rouge reste au danger, l'ambre aux alertes ; les thèmes de la page publique n'en dépendent pas.
- Pictos Phosphor pleins, d'une seule couleur (sans dégradé ni duotone), jamais d'emojis. La barre de navigation du back office prend des pictos MingCute pleins (`nav-*`, 22 octobre 2026). Les signes de commande du back office (`ui-*` : fermer, ajouter, chevrons, coche, flèches, copier) restent au trait, et les deux ne se mêlent pas dans une même rangée. Une icône nommée qui n'existe pas fait échouer `pnpm test` (`src/lib/icones.test.ts`).
- Jamais d'icône sur un fond ni dans un cadre (22 octobre 2026, demandé par Lilian), au back office, sur la page publique et sur l'accueil : ni pastille, ni tuile, ni rond, ni voile au survol derrière une icône seule. L'icône seule, en couleur (un réseau dans la sienne, un choix en bleu) ou à l'encre ; le choix pris se dit par sa couleur, un trait ou un point dessous. Un bouton ou une étiquette avec un libellé garde sa forme ; photos, avatars et pastilles de couleur sont du contenu. Sur la page publique, le picto d'une carte se pose seul (`--picto-carte`, `pictoCarte`), et les puces d'état d'un bloc en édition se posent au-dessus de lui, hors du voile.
- La place de l'icône est toujours gardée (22 octobre 2026, demandé par Lilian) : sur la page publique, un bandeau a une colonne de 50 px à gauche (`--lp-place`) qui reçoit la vignette, la photo d'un produit ou le picto, centré, et reste vide sans eux ; un bouton centré garde 60 px de chaque côté, icône ou pas. Le texte commence ainsi au même endroit d'un bloc à l'autre, et jamais contre le bord.
- Ouvrir un menu, une feuille ou une fenêtre ne donne jamais la main à un champ de texte sur un écran tactile (22 octobre 2026, demandé par Lilian : le clavier monte) : `autoFocus={focusAuto(...)}` et `focusSaisie(el)` de `lib/clavier.ts`, jamais un `autoFocus` nu ni un `.focus()` sur un champ. Au bureau le premier champ peut la prendre. Seule exception : renvoyer au champ fautif après un envoi refusé.
- Le suivi des clics Resend reste désactivé : il casse les liens magiques.
- Un formulaire public qui fait partir un e-mail ou garde une adresse passe par Turnstile (`avecJeton` dans la page, `verifierTurnstile` sur le serveur), et tout e-mail vers une adresse tapée par un inconnu par `destinataireSature`. Une limite par adresse IP passe par `limites.ts`.
- Chez Cloudflare, ni cookie ni défi : Bot Fight Mode éteint, des règles qui bloquent sans défier (voir `deploy/README.md`, « Cloudflare »).
- Une offre payante (Starter, Pro, Premium) n'est accordée que par un webhook Creem signé, jamais par le retour du paiement, ou offerte par Lilian depuis Comptes (23 octobre 2026), sans Creem ni facture : `offrir()` dans `db.ts`, pour une durée ou sans fin, ne touche jamais à l'abonnement Creem, qui continue d'être prélevé. Faire payer une offre au-dessus passe toujours par la personne, depuis ses offres : rien n'est prélevé sans elle. Les produits Creem se créent depuis l'onglet Comptes (« Créer les offres dans Creem ») : la clé a besoin des droits Products et Subscriptions.
- L'abonnement suit le compte (21 octobre 2026) : changer d'offre passe par Creem au prorata (`proration-charge-immediately`, payé ou rendu tout de suite) ; repasser en Gratuit résilie pour la fin de la période payée, et un abonnement résilié ne change plus d'offre ; supprimer un compte, par son titulaire ou depuis Comptes, résilie l'abonnement tout de suite, sans remboursement automatique (`server/suppression.ts`), et la purge des comptes jamais connectés épargne ceux qui ont un abonnement ou une offre offerte qui court. Résilier depuis Comptes fait comme « Repasser en Gratuit » ; une offre offerte qui dure au-delà de la période payée prend alors sa suite.
- Les offres (20 octobre 2026), avec `FONCTIONS` pour seule source : Gratuit garde des liens sans limite, la page selon le réseau du visiteur et les vingt thèmes ; Starter ajoute la page sans mention, les couleurs, la programmation (début, fin, compte à rebours), les avis, la vitrine (produits, prise de rendez-vous, Me soutenir, code promo d'un lien partenaire) et 30 jours de stats ; Pro le créneau selon l'heure, les drops, la liste e-mail et un an de stats ; Premium (pas en vente) le nom de domaine et trois pages. Ce que l'offre ne comprend pas s'efface de la page publique (`selonDroits`) sans rien effacer de la base. Les dates d'un bloc tiennent toujours, mais sans Starter le serveur refuse d'en poser de nouvelles (`verifierDates`). Les stats se comptent pour tous ; leur lecture et le résumé du lundi sont réservés. Les pages créées avant `BASCULE_OFFRES` (21 octobre 2026) gardent tout sauf la page sans mention et la vitrine, venue après, avec 7 jours de stats. La place pour les images (`quota`) est un garde-fou qu'on n'annonce pas. La page en plusieurs langues a été retirée le 20 octobre 2026 : `valider.ts` laisse de côté les anciennes traductions.
- La mention « Publicité » (ou « Collaboration commerciale ») d'un lien partenaire s'affiche dans toutes les offres, Gratuit compris : la loi du 9 juin 2023 la demande. Sans Starter, `selonDroits` retire le code promo et les blocs de la vitrine, jamais la mention.
- Aucun secret dans le dépôt ; ils vivent dans `/opt/linkinbio/secrets/runtime.env`.
- Ne jamais tuer un serveur local avec un `pkill -f` dont le motif correspond à sa propre commande.
