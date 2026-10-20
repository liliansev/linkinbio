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
- `.github/workflows/deploy-hostinger.yml` : part à chaque push sur `main`, si
  la variable `HOSTINGER_HOST` est définie dans le dépôt.

Ces scripts et le Compose sont installés à la main sur le VPS : un commit ne
change pas le receveur installé.

## Secrets

`/opt/linkinbio/secrets/runtime.env` : `RESEND_API_KEY`, `CONTACT_TO`,
`LIENS_ADMIN_EMAIL` (facultatif), `LIENS_ORIGINE` (`https://hopla.page` par
défaut), `LIENS_ORIGINE_ADMIN` (`https://app.hopla.page` par défaut),
`CONTACT_FROM` (`connexion@hopla.page` par défaut, envoyé sous le nom Hopla), et
pour l'offre Pro `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, `CREEM_PRODUIT_MOIS`,
`CREEM_PRODUIT_AN` (plus `CREEM_TEST=1` avec une clé de test). Webhook Creem :
`https://app.hopla.page/api/creem`, événements `checkout.completed` et
`subscription.*`.

`LIENS_INSCRIPTION` (facultatif) : vide, chacun crée sa page depuis l'accueil ;
`attente` remet la liste d'attente (on réserve son nom, l'invitation part à la main).

`TURNSTILE_SITE_KEY` et `TURNSTILE_SECRET` (facultatifs, les deux ou aucune) et
`LIENS_CLOUDFLARE` : voir « Cloudflare ».

`LIENS_SITE` (dans `compose.yaml`, rien de secret) : l'adresse interne du site de
Lilian, dont l'API sert les blocs « dernière vidéo » et « newsletter » de sa page.

## Base

`/data/liens.db` sur le volume `liliansevoumian_liens-data`, repris tel quel
(déclaré `external` dans `compose.yaml`). Deux conteneurs ne doivent jamais
écrire en même temps dans la même base : la bascule se fait en une fois.

## Adresses

Caddy (`/opt/edge/caddy/sites/hopla.caddy`) envoie `hopla.page` et
`app.hopla.page` au conteneur, et redirige `www.hopla.page`. `server.mjs` range
le reste : `/admin` sur hopla.page part vers app.hopla.page, les pages demandées
à app.hopla.page repartent vers hopla.page, et les anciennes adresses `/liens/...`
mènent à leur équivalent (`/liens/` à `/lilian`). Le cookie de session n'a pas
de `domain` : il reste sur app.hopla.page.

Dans `liliansevoumian.caddy`, l'ancienne route vers l'app est remplacée par une
redirection, qui garde le chemin et la requête :

```
@liens path /liens /liens/*
redir @liens https://hopla.page{uri} permanent
```

## Cloudflare

Le code est prêt ; rien ne change tant que ces réglages ne sont pas posés.

- **Turnstile**, la vérification anti-robot de la connexion, de l'accueil, du
  signalement et de « Rejoins ma liste » : `TURNSTILE_SITE_KEY` (la clé publique,
  `0x…`) et `TURNSTILE_SECRET` dans `runtime.env`. Widget « managé » sur
  `hopla.page` et `app.hopla.page` (plus `localhost` pour le développement : en
  production, le serveur n'accepte qu'un jeton pris sur les deux noms de Hopla).
  Sans pré-autorisation (« pre-clearance »), qui poserait un cookie.
- **Proxy** : une fois les enregistrements `hopla.page` et `app.hopla.page` passés
  en orange, Caddy ne voit plus que des adresses de Cloudflare. `server.mjs` lit
  alors celle du visiteur dans `CF-Connecting-IP`, qu'il ne croit que venant d'une
  adresse de Cloudflare (liste de https://www.cloudflare.com/ips/, relevée le
  20 octobre 2026 dans `server.mjs`). Chiffrement « Full (strict) », jamais
  « Flexible » ; les enregistrements des e-mails (Resend) restent en gris.
- **Verrou** : `LIENS_CLOUDFLARE=exclusif` dans `runtime.env`, après la bascule.
  Une requête arrivée par Caddy sans passer par Cloudflare reçoit alors 403 ;
  `/healthz` et le réseau interne (sans `X-Real-IP`, comme le contrôle de
  `deploy.sh`) passent toujours.
- **Ni cookie ni défi** : Bot Fight Mode reste éteint (il poserait `__cf_bm` et
  bloquerait les webhooks Creem), les règles du pare-feu bloquent sans jamais
  défier (`cf_clearance`), et les limites de débit n'utilisent pas
  `cf.unique_visitor_id` (`_cfuvid`).

HSTS : `server.mjs` envoie `Strict-Transport-Security: max-age=31536000` en
production. Le domaine `.page` est de toute façon préchargé en HTTPS par les
navigateurs.

## Historique : la sortie du site (17 octobre 2026)

1. Installer `/opt/linkinbio` (secrets, `bin/deploy.sh`, `bin/receive.sh`,
   `releases/`), le Compose dans `/docker/linkinbio`, une clé SSH à commande
   forcée vers `receive.sh`, puis `HOSTINGER_HOST`, `HOSTINGER_DEPLOY_KEY` et
   `HOSTINGER_KNOWN_HOSTS` dans ce dépôt.
2. Premier déploiement : le conteneur démarre sur le volume existant.
3. Dans `/opt/edge/caddy/sites/liliansevoumian.caddy`, ajouter dans le bloc
   `liliansevoumian.fr`, avant le `reverse_proxy` du site :

   ```
   reverse_proxy /liens* linkinbio-app:3000 {
           header_up X-Real-IP {remote_host}
   }
   ```

   Caddy fait passer un `reverse_proxy` avec chemin avant celui sans chemin.
   Valider, puis recharger Caddy.
4. Retirer `liens/` du dépôt du site et le volume de son Compose.

Le 18 octobre 2026, l'app est passée à la racine de hopla.page (voir « Adresses »).

## Reste à faire

- Sauvegarde nocturne de la base hors du VPS, avec un test de restauration.
- Brancher Cloudflare (voir « Cloudflare »).
