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
pnpm start       # deploy/server.mjs sur dist/ (PORT, LIENS_DB, LIENS_ORIGINE, LIENS_ORIGINE_ADMIN, CONTACT_TO)
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
- `admin/` : onglets Liens, Apparence, Stats, Comptes (principal seulement), Réglages.
  En tête des Liens, `BienDemarrer.tsx` : l'adresse à copier ou partager, et les étapes
  d'une page prête (`lib/demarrage.ts`), qui se cochent seules.
- `components/PageLiens.tsx` : la page publique ; `routes/index.tsx` : l'accueil de hopla.page.
- `demo/` : aperçu statique avec une API simulée, publié en Artifact.

## Règles

- Tout le texte est en français, sans tiret cadratin. Le service s'appelle Hopla.
- Toute modification des CGU ou de l'accord de traitement change `VERSION_CGU`.
- Pas de DataFast sur Hopla tant qu'il n'a pas son propre site DataFast.
- QA : agent-browser (headless). Playwright est interdit.
- Pictos Phosphor duotone, jamais d'emojis.
- Le suivi des clics Resend reste désactivé : il casse les liens magiques.
- Le Pro n'est accordé que par un webhook Creem signé, jamais par le retour du paiement.
- Aucun secret dans le dépôt ; ils vivent dans `/opt/linkinbio/secrets/runtime.env`.
- Ne jamais tuer un serveur local avec un `pkill -f` dont le motif correspond à sa propre commande.
