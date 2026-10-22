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
`http://localhost:<port>`. La feuille qui propose Safari ou Chrome ne se montre qu'avec une
origine en https (les deux à `https://hopla.page` en local) et un user agent d'app (LinkedIn,
Instagram…) ; la démo le montre avec `#sortie=<thème>` ou `#sortie-android=<thème>`.

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
- `server/auth.ts` (liens magiques de 15 minutes, sessions de 90 jours),
  `server/courriel.ts` (Resend), `server/analytique.ts` (stats sans cookie, IP
  jamais stockée), `server/moderation.ts` (DSA), `server/creem.ts` (paiement, changement d'offre au prorata,
  résiliation, webhooks signés), `server/suppression.ts` (supprimer un compte résilie d'abord son abonnement Creem ;
  si Creem ne répond pas, refusé une fois, puis supprimé et signalé à Lilian par e-mail pour le résilier à la main),
  `server/apercu.ts` (aperçu de site, anti-SSRF : l'adresse se vérifie au moment de la connexion ; lu en voix d'aperçu puis
  de navigateur, jusqu'au `</head>`, dans le jeu de caractères annoncé, par l'oEmbed pour YouTube, Vimeo, Spotify et
  SoundCloud ; une page de vérification, de consentement ou d'erreur ne donne jamais son titre ; `image: false` pour le
  titre seul), `server/droits.ts` (`droits()` d'un compte, `verifierDates` avant d'enregistrer un bloc, `joursLisibles`
  pour les stats).
- `server/limites.ts` : les limites anti-abus en mémoire (`limiteur`, `cleIp` qui
  compte une IPv6 pour son /64) et `destinataireSature`, cinq e-mails par heure et
  dix par jour vers une adresse tapée par un inconnu. `server/turnstile.ts` vérifie
  le jeton Turnstile des formulaires publics, que `lib/turnstile.ts` obtient dans la
  page (`avecJeton`) ; en sommeil sans `TURNSTILE_SITE_KEY` et `TURNSTILE_SECRET`.
- `lib/` : `types.ts` (origines, `cheminPage`, `urlPage`), `valider.ts`, `themes.ts`, `legal.ts` (`VERSION_CGU`),
  `abonnement.ts` (les quatre offres Gratuit, Starter, Pro, Premium : prix, `FONCTIONS`, `peut()`, `joursStats()`, `estPaye()` ;
  `offreSuivante()` et ses `ACCROCHES` pour l'appel à l'offre du dessus, `sensDuChangement()`, `accesAbonnement()`), `droits.ts`
  (`selonDroits` retire de la page publique ce que l'offre ne comprend pas, sans rien effacer ; `nouvellesDates`),
  `mots.ts` (les mots de la page publique, au « tu » ou au « vous »), `stats.ts` (les quatre chiffres de l'onglet Stats, leurs écarts,
  l'échelle de la courbe, et `COULEURS_SOURCES`, la couleur de chaque réseau), `resume.ts` (« En bref », et le résumé du lundi), `comptes.ts` (statut, dernière connexion et recherche de l'onglet Comptes),
  `achat.ts` (le retour d'un paiement : la note posée avant Creem, puis « On active », « C'est fait » ou l'attente, d'après l'abonnement relu),
  `sortie.ts` (depuis le navigateur intégré de LinkedIn, Instagram, Facebook, Messenger ou Threads, l'adresse qui rouvre la page
  dans Safari ou Chrome, app par app ; TikTok, X et Snapchat n'en ont pas).
- `admin/` : onglets Ma page, Stats, Comptes (principal seulement), Réglages. Sur un grand écran (22 octobre 2026), la
  barre latérale et l'espace de travail (`adm-travail`) tiennent dans un cadre centré de 1600 px au plus (`--adm-cadre`),
  les premiers pas dans 1200 px (`adm-premiers`). Réglages tient sur une seule page de lignes
  (`Groupe`, `Ligne`, `LigneLien` dans `ui.tsx`) ; un détail s'y ouvre en sous-page (`SousPage`), avec un fil dans l'en-tête,
  comme `Facturation.tsx`, « Mon abonnement » (l'offre, son échéance, la carte et les factures au portail client de Creem,
  puis « Résilier mon abonnement »). Dans le groupe Abonnement, « Mes factures » ouvre ce portail pour tout compte que Creem
  connaît, même redevenu Gratuit (`accesAbonnement`). Les offres s'ouvrent dans une fenêtre par-dessus l'écran en cours, depuis
  une fonction réservée (`Reserve`, `voirOffres(fonction)` dans `offre.tsx`), les stats, Réglages ou l'appel à l'offre du dessus
  (`AppelOffre` dans `offre.tsx` : au bureau au-dessus du compte, au téléphone sous la page ; rien pour le compte principal, Pro,
  une résiliation ou un impayé) : `Offres.tsx` (`FenetreOffres`, le récapitulatif avant Creem, `RepasserGratuit` qui résilie pour
  la fin de la période payée, `RetourPaiement` au retour, dont le geste ramène où servir l'offre ; parti d'une règle de bloc, au bloc,
  la règle ouverte par `RegleAOuvrir` dans `ReglesBloc.tsx`).
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
  et 86 % de l'écran (`plafond`), et garde sa hauteur d'une page à l'autre : ses réglages
  rares s'ouvrent en pages (« Plus de réglages », puis chaque règle, `PagesBloc` dans
  `ReglesBloc.tsx`), avec une flèche dans l'en-tête de la feuille (`useFilFeuille`). Un bloc
  neuf revient au choix des blocs par sa flèche ; ce choix s'ouvre sur « Colle une adresse ».
  Le retour du téléphone referme une couche à la fois (`couches.ts` : chaque feuille,
  page de bloc, tiroir du design, sous-page de Réglages ou aperçu pose une entrée dans
  l'historique, que le routeur ne voit pas). En tête, `BienDemarrer.tsx` :
  l'adresse à copier ou partager, et les étapes d'une page prête (`lib/demarrage.ts`) ;
  au téléphone, un anneau dans l'en-tête ouvre ces étapes dans une feuille, et Ajouter
  et Personnaliser se posent sur la barre des onglets : la page commence sous l'en-tête.
  Un compte neuf, juste après les CGU, passe par `PremiersPas.tsx` (nom et bio, liens,
  réseaux, ambiance, page en ligne), avec sa page en miniature qui se remplit ; une
  seule fois, et seulement tant que la page est vide (`pageNeuve`).
- `components/PageLiens.tsx` : la page publique. Ouverte dans une app qui laisse sortir, une feuille monte
  par-dessus la page, voilée et `inert` (`FeuilleSortie`, rendue par le serveur, réglage `ouvrirNavigateur`,
  actif par défaut ; 21 octobre 2026, demandé par Lilian) : ouvrir dans Safari ou le navigateur, copier le
  lien, continuer ici (le voile et Échap aussi). L'adresse rouverte porte `?suite=<minute>`,
  valable 15 minutes à l'heure du serveur : pas de feuille, et la visite, déjà comptée dans l'app, ne l'est
  pas deux fois ; copié puis partagé, le lien redevient une visite comme une autre.
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
  rejoue l'arrivée d'un nouvel inscrit, `#sortie=<thème>` montre la feuille qui propose Safari.

## Règles

- Tout le texte est en français, sans tiret cadratin. Le service s'appelle Hopla.
- Toute modification des CGU ou de l'accord de traitement change `VERSION_CGU`.
- Pas de DataFast sur Hopla tant qu'il n'a pas son propre site DataFast.
- QA : agent-browser (headless). Playwright est interdit.
- Chaque thème ajouté ou retouché passe par la vérification typographique d'Impeccable (`typeset`) et par une planche de captures de tous les thèmes (`demo`, `#page=<id>`) avant d'être poussé : un nom sur une ligne, des cartes lisibles.
- Le back office est en noir et blanc (19 octobre 2026) : dans `.adm`, `white` est l'encre et `nuit` le papier (voir `src/styles/admin.css`). Un texte posé sur un bouton noir s'écrit donc `text-nuit` ; sur un bouton rouge, `text-nuit` aussi. Pas d'accent de couleur hors des alertes et des réseaux de l'onglet Stats (22 octobre 2026, demandé par Lilian : dans « Réseaux », comme sur l'accueil, le logo d'un réseau dans sa couleur et sa barre dans une teinte claire de celle-ci, `COULEURS_SOURCES`, le nom toujours à l'encre ; Direct, QR code et les sources sans marque restent gris) ; les thèmes de la page publique n'en dépendent pas.
- Pictos Phosphor pleins, d'une seule couleur (sans dégradé ni duotone), jamais d'emojis. Les signes de commande du back office (`ui-*` : fermer, ajouter, chevrons, coche, flèches, copier) restent au trait, et les deux ne se mêlent pas dans une même rangée. Une icône nommée qui n'existe pas fait échouer `pnpm test` (`src/lib/icones.test.ts`).
- Le suivi des clics Resend reste désactivé : il casse les liens magiques.
- Un formulaire public qui fait partir un e-mail ou garde une adresse passe par Turnstile (`avecJeton` dans la page, `verifierTurnstile` sur le serveur), et tout e-mail vers une adresse tapée par un inconnu par `destinataireSature`. Une limite par adresse IP passe par `limites.ts`.
- Chez Cloudflare, ni cookie ni défi : Bot Fight Mode éteint, des règles qui bloquent sans défier (voir `deploy/README.md`, « Cloudflare »).
- Une offre payante (Starter, Pro, Premium) n'est accordée que par un webhook Creem signé, jamais par le retour du paiement. Les produits Creem se créent depuis l'onglet Comptes (« Créer les offres dans Creem ») : la clé a besoin des droits Products et Subscriptions.
- L'abonnement suit le compte (21 octobre 2026) : changer d'offre passe par Creem au prorata (`proration-charge-immediately`, payé ou rendu tout de suite) ; repasser en Gratuit résilie pour la fin de la période payée, et un abonnement résilié ne change plus d'offre ; supprimer un compte, par son titulaire ou depuis Comptes, résilie l'abonnement tout de suite, sans remboursement automatique (`server/suppression.ts`), et la purge des comptes jamais connectés épargne ceux qui ont un abonnement.
- Les offres (20 octobre 2026), avec `FONCTIONS` pour seule source : Gratuit garde des liens sans limite, la page selon le réseau du visiteur et les vingt thèmes ; Starter ajoute la page sans mention, les couleurs, la programmation (début, fin, compte à rebours), les avis et 30 jours de stats ; Pro le créneau selon l'heure, les drops, la liste e-mail et un an de stats ; Premium (pas en vente) le nom de domaine et trois pages. Ce que l'offre ne comprend pas s'efface de la page publique (`selonDroits`) sans rien effacer de la base. Les dates d'un bloc tiennent toujours, mais sans Starter le serveur refuse d'en poser de nouvelles (`verifierDates`). Les stats se comptent pour tous ; leur lecture et le résumé du lundi sont réservés. Les pages créées avant `BASCULE_OFFRES` (21 octobre 2026) gardent tout sauf la page sans mention, avec 7 jours de stats. La place pour les images (`quota`) est un garde-fou qu'on n'annonce pas. La page en plusieurs langues a été retirée le 20 octobre 2026 : `valider.ts` laisse de côté les anciennes traductions.
- Aucun secret dans le dépôt ; ils vivent dans `/opt/linkinbio/secrets/runtime.env`.
- Ne jamais tuer un serveur local avec un `pkill -f` dont le motif correspond à sa propre commande.
