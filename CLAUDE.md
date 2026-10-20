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
pnpm start       # deploy/server.mjs sur dist/ (PORT, LIENS_DB, LIENS_ORIGINE, LIENS_ORIGINE_ADMIN, CONTACT_TO, LIENS_INSCRIPTION)
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
- `server/auth.ts` (liens magiques de 15 minutes, sessions de 90 jours),
  `server/courriel.ts` (Resend), `server/analytique.ts` (stats sans cookie, IP
  jamais stockée), `server/moderation.ts` (DSA), `server/creem.ts` (paiement,
  webhooks signés), `server/apercu.ts` (aperçu de site, anti-SSRF).
- `lib/` : `types.ts` (origines, `cheminPage`, `urlPage`), `valider.ts`, `themes.ts`, `legal.ts` (`VERSION_CGU`),
  `abonnement.ts` (prix, `estPro()`).
- `admin/` : onglets Ma page, Stats, Comptes (principal seulement), Réglages.
  `MaPage.tsx` édite la page elle-même : `PageLiens` reçoit `edition` (nom et bio
  tapés en place, photo, réseaux et blocs ouverts d'un toucher, blocs déplacés en
  les maintenant), le design s'ouvre dans une feuille `cote` qui laisse voir la page,
  et la liste d'avant (`OngletLiens`) reste à un toucher. En tête, `BienDemarrer.tsx` :
  l'adresse à copier ou partager, et les étapes d'une page prête (`lib/demarrage.ts`) ;
  au téléphone, un anneau dans l'en-tête ouvre ces étapes dans une feuille, et Ajouter
  et Personnaliser se posent sur la barre des onglets : la page commence sous l'en-tête.
  Un compte neuf, juste après les CGU, passe par `PremiersPas.tsx` (nom et bio, liens,
  réseaux, ambiance, page en ligne), avec sa page en miniature qui se remplit ; une
  seule fois, et seulement tant que la page est vide (`pageNeuve`).
- `components/PageLiens.tsx` : la page publique.
- `accueil/` : l'accueil de hopla.page (`routes/index.tsx`, styles dans `styles/accueil.css`), en noir et
  blanc, chaque mouvement joué une fois (les onglets Sans / Avec Hopla rejouent leur scène). On y prend
  son nom : par défaut la page se crée aussitôt et le lien part (`creerHopla` dans `server/attente.ts`) ;
  avec `LIENS_INSCRIPTION=attente`, on retrouve la liste d'attente (table `attente`, un an au plus,
  invitée depuis l'onglet Comptes). Les mots qui changent d'un mode à l'autre et les questions vivent
  dans `accueil/textes.ts`, repris par les données structurées et `llms.txt`.
- Marque : `components/Logo.tsx` (le symbole, un « h » et sa balle) ; favicon, icônes, manifeste et
  image de partage dans `public/`. `server/referencement.ts` écrit `robots.txt`, `sitemap.xml` et
  `llms.txt` (routes `robots[.]txt.ts`…) ; le back office ne s'indexe pas.
- `demo/` : aperçu statique avec une API simulée, publié en Artifact ; `#nouveau` y
  rejoue l'arrivée d'un nouvel inscrit.

## Règles

- Tout le texte est en français, sans tiret cadratin. Le service s'appelle Hopla.
- Toute modification des CGU ou de l'accord de traitement change `VERSION_CGU`.
- Pas de DataFast sur Hopla tant qu'il n'a pas son propre site DataFast.
- QA : agent-browser (headless). Playwright est interdit.
- Chaque thème ajouté ou retouché passe par la vérification typographique d'Impeccable (`typeset`) et par une planche de captures de tous les thèmes (`demo`, `#page=<id>`) avant d'être poussé : un nom sur une ligne, des cartes lisibles.
- Le back office est en noir et blanc (19 octobre 2026) : dans `.adm`, `white` est l'encre et `nuit` le papier (voir `src/styles/admin.css`). Un texte posé sur un bouton noir s'écrit donc `text-nuit` ; sur un bouton rouge, `text-nuit` aussi. Pas d'accent de couleur hors des alertes ; les thèmes de la page publique n'en dépendent pas.
- Pictos Phosphor pleins, d'une seule couleur (sans dégradé ni duotone), jamais d'emojis. Les signes de commande du back office (`ui-*` : fermer, ajouter, chevrons, coche, flèches, copier) restent au trait, et les deux ne se mêlent pas dans une même rangée. Une icône nommée qui n'existe pas fait échouer `pnpm test` (`src/lib/icones.test.ts`).
- Le suivi des clics Resend reste désactivé : il casse les liens magiques.
- Le Pro n'est accordé que par un webhook Creem signé, jamais par le retour du paiement.
- Aucun secret dans le dépôt ; ils vivent dans `/opt/linkinbio/secrets/runtime.env`.
- Ne jamais tuer un serveur local avec un `pkill -f` dont le motif correspond à sa propre commande.
