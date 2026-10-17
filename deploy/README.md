# Production (Hostinger)

VPS srv1870777 (147.93.52.144), le même que le site. Projet Compose
`/docker/linkinbio`, fichiers d'exploitation dans `/opt/linkinbio`.

## Ce que le dépôt contient

- `Dockerfile` : build, typecheck et tests, puis une image sans `node_modules`.
- `compose.yaml` : le conteneur `linkinbio-app`, lecture seule, publié sur
  `127.0.0.1:3101`, sur le réseau `edge` du Caddy partagé (`/opt/edge`).
- `deploy.sh` et `receive.sh` : le receveur SSH à commande forcée, copie de celui
  du site. Il construit l'image, vérifie un conteneur candidat, bascule, et
  revient à l'image précédente si la bascule échoue.
- `.github/workflows/deploy-hostinger.yml` : ne part que si la variable
  `HOSTINGER_HOST` est définie dans le dépôt. Tant qu'elle ne l'est pas, le site
  sert toujours `/liens/` depuis le dépôt `liliansevoumian`.

Ces scripts et le Compose sont installés à la main sur le VPS : un commit ne
change pas le receveur installé.

## Secrets

`/opt/linkinbio/secrets/runtime.env` : `RESEND_API_KEY`, `CONTACT_TO`,
`LIENS_ADMIN_EMAIL` (facultatif), `LIENS_ORIGINE`, et pour l'offre Pro
`CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, `CREEM_PRODUIT_MOIS`,
`CREEM_PRODUIT_AN` (plus `CREEM_TEST=1` avec une clé de test). Webhook Creem :
`<origine>/liens/api/creem`, événements `checkout.completed` et `subscription.*`.

## Base

`/data/liens.db` sur le volume `liliansevoumian_liens-data`, repris tel quel
(déclaré `external` dans `compose.yaml`). Deux conteneurs ne doivent jamais
écrire en même temps dans la même base : la bascule se fait en une fois.

## Bascule depuis le site

1. Installer `/opt/linkinbio` (secrets, `bin/deploy.sh`, `bin/receive.sh`,
   `releases/`), le Compose dans `/docker/linkinbio`, une clé SSH à commande
   forcée vers `receive.sh`, puis `HOSTINGER_HOST`, `HOSTINGER_DEPLOY_KEY` et
   `HOSTINGER_KNOWN_HOSTS` dans ce dépôt.
2. Premier déploiement : le conteneur démarre sur le volume existant.
3. Dans `/opt/edge/caddy/sites/liliansevoumian.caddy`, envoyer `/liens` et
   `/liens/*` vers `linkinbio-app:3000` avant le reste, valider, recharger Caddy.
4. Retirer `liens/` du dépôt du site et le volume de son Compose.

Le nouveau domaine viendra ensuite : `base` de `vite.config.ts` et `BASE` de
`server.mjs` passeront à `/`, avec une redirection depuis liliansevoumian.fr/liens.

## Reste à faire

- Sauvegarde nocturne de la base hors du VPS, avec un test de restauration.
- HSTS côté Caddy.
