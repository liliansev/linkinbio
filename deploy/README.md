# Production (Coolify)

Depuis le 31 octobre 2026, hopla.page tourne comme une application de Coolify
Cloud (`hopla`), sur le VPS qui sert aussi les autres sites de Lilian (son adresse
et son nom restent hors du dépôt). Avant, un receveur SSH maison déployait sur le
même genre de VPS (voir « Historique »).

## Ce que le dépôt contient

- `Dockerfile` : build, typecheck et tests, puis une image sans `node_modules`.
  Coolify la construit depuis `main` (build pack Dockerfile), la vérifie sur
  `/healthz` et bascule.
- `server.mjs` : le serveur de production (fichiers, rangement entre hopla.page et
  app.hopla.page, verrou Cloudflare).
- `sauvegarde.mjs` : la sauvegarde nocturne de la base vers R2 (voir « Sauvegarde »).

## Application Coolify

- Domaines : `hopla.page`, `app.hopla.page`, `www.hopla.page` ; port 3000 ; santé
  sur `/healthz`. Le proxy est le Traefik de Coolify.
- Limites : 256 Mo, 0,5 CPU ; options `--init --read-only --cap-drop=ALL
  --security-opt=no-new-privileges` (le conteneur n'écrit que dans `/data`).
- Stockage persistant monté sur `/data` : la base `/data/liens.db` et les images.
  Deux conteneurs ne doivent jamais écrire en même temps dans la même base.

## Secrets

Dans les variables de l'application Coolify : `RESEND_API_KEY`, `CONTACT_TO`,
`LIENS_ADMIN_EMAIL` (facultatif), `LIENS_ORIGINE` (`https://hopla.page` par
défaut), `LIENS_ORIGINE_ADMIN` (`https://app.hopla.page` par défaut),
`CONTACT_FROM` (`connexion@hopla.page` par défaut, envoyé sous le nom Hopla), et
pour les offres `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, `CREEM_PRODUIT_MOIS`,
`CREEM_PRODUIT_AN` (plus `CREEM_TEST=1` avec une clé de test). Webhook Creem :
`https://app.hopla.page/api/creem`, événements `checkout.completed` et
`subscription.*`.

`LIENS_INSCRIPTION` (facultatif) : vide, chacun crée sa page depuis l'accueil ;
`attente` remet la liste d'attente (on réserve son nom, l'invitation part à la main).

`LIENS_CLE_INTEGRATIONS` (recommandé) : une valeur aléatoire (`openssl rand -base64 32`).
Elle chiffre les clés d'API des newsletters, les webhooks et les inscrits des listes
e-mail (`src/server/coffre.ts`) ; sans elle, le secret de la base sert de clé, et une
copie de la base suffirait à tout lire. Posée, elle prend la suite au démarrage
suivant (tout est rechiffré sous elle). Ne jamais la retirer ni la changer ensuite :
ce qu'elle a chiffré deviendrait illisible.

`TURNSTILE_SITE_KEY` et `TURNSTILE_SECRET` (facultatifs, les deux ou aucune) et
`LIENS_CLOUDFLARE` : voir « Cloudflare ».

`LIENS_SITE` (rien de secret) : l'adresse interne du site de Lilian, dont l'API sert
les blocs « dernière vidéo » et « newsletter » de sa page.

`R2_BACKUP_*` : voir « Sauvegarde ».

## Adresses

Traefik (Coolify) envoie `hopla.page`, `app.hopla.page` et `www.hopla.page` au
conteneur. `server.mjs` range
le reste : `/admin` sur hopla.page part vers app.hopla.page, les pages demandées
à app.hopla.page repartent vers hopla.page, et les anciennes adresses `/liens/...`
mènent à leur équivalent (`/liens/` à `/lilian`). Le cookie de session n'a pas
de `domain` : il reste sur app.hopla.page.

Les noms courts `hpla.eu`, `hpla.art`, `hpla.pro` et `hpla.store` renvoient
vers hopla.page en 301, chemin et requête gardés (`hpla.art/camille?s=ig` vers
`hopla.page/camille?s=ig`). La redirection se fait chez Cloudflare, sans toucher
au serveur : pour chaque nom, une zone, un enregistrement `A @ 192.0.2.1` et un
`AAAA @ 100::` en orange (des adresses factices, la requête ne quitte jamais
Cloudflare), la même chose pour `www`, et une règle de redirection (Rules ›
Redirect Rules) : « Toutes les requêtes », dynamique,
`concat("https://hopla.page", http.request.uri.path)`, 301, chaîne de requête
gardée. `server.mjs` fait la même chose si une requête pour ces noms arrive
jusqu'au conteneur.

Les anciennes adresses `liliansevoumian.fr/liens...` doivent rediriger vers
hopla.page en gardant le chemin et la requête (du temps de Caddy :

```
@liens path /liens /liens/*
redir @liens https://hopla.page{uri} permanent
```

).

## Cloudflare

En service depuis le 22 octobre 2026 : la zone `hopla.page` est chez Cloudflare
(serveurs de noms `cory.ns.cloudflare.com` et `crystal.ns.cloudflare.com`, posés
dans hPanel) et Turnstile protège les formulaires. Depuis le 24 octobre 2026, le
serveur refuse ce qui ne passe pas par Cloudflare (le verrou).

- **Turnstile**, la vérification anti-robot de la connexion, de l'accueil, du
  signalement et de « Rejoins ma liste » : `TURNSTILE_SITE_KEY` (la clé publique,
  `0x…`) et `TURNSTILE_SECRET` dans les variables Coolify. Widget « managé » sur
  `hopla.page` et `app.hopla.page` (plus `localhost` pour le développement : en
  production, le serveur n'accepte qu'un jeton pris sur les deux noms de Hopla).
  Sans pré-autorisation (« pre-clearance »), qui poserait un cookie.
- **Proxy** : `hopla.page`, `app.hopla.page` et `www` sont en orange, et Traefik ne
  voit plus que des adresses de Cloudflare. `server.mjs` lit alors celle du
  visiteur dans `CF-Connecting-IP`, qu'il ne croit que venant d'une
  adresse de Cloudflare (liste de https://www.cloudflare.com/ips/, relevée le
  20 octobre 2026 dans `server.mjs`). Chiffrement « Full (strict) », jamais
  « Flexible » ; les enregistrements des e-mails (Resend) restent en gris.
  « Always Use HTTPS » reste éteint : Traefik renouvelle ses certificats Let's Encrypt par le
  défi HTTP-01, sur le port 80. Le cache du navigateur suit les en-têtes de l'app.
- **Verrou** : `LIENS_CLOUDFLARE=exclusif` dans les variables Coolify, posé le
  24 octobre 2026. Une requête arrivée par le proxy sans passer par Cloudflare reçoit
  403 ; `/healthz` et le réseau interne (sans `X-Real-IP`, comme le contrôle de
  santé) passent toujours. Pour le lever, retirer la variable dans Coolify,
  puis redéployer. Le verrou tient à la liste des adresses de Cloudflare de
  `server.mjs` : si Cloudflare en publie de nouvelles, les y ajouter, car une
  requête venue d'une adresse absente de la liste reçoit 403.
- **Ni cookie ni défi** : Bot Fight Mode reste éteint (il poserait `__cf_bm` et
  bloquerait les webhooks Creem), les règles du pare-feu bloquent sans jamais
  défier (`cf_clearance`), et les limites de débit n'utilisent pas
  `cf.unique_visitor_id` (`_cfuvid`). Une règle de configuration coupe Web
  Analytics, qui se rallume d'office sur le plan gratuit et ajouterait un script ;
  une règle du pare-feu bloque les chemins en `.php`, `/.env` et `/.git`.

HSTS : `server.mjs` envoie `Strict-Transport-Security: max-age=31536000` en
production. Le domaine `.page` est de toute façon préchargé en HTTPS par les
navigateurs.

## Noms de domaine des pages

Écrit le 10 novembre 2026. Sans `LIENS_DOMAINES`, rien ne change et la ligne « Mon nom de
domaine » n'existe pas dans Réglages. Sur hopla.page, les étapes 1 et 2 sont faites
(Cloudflare for SaaS activé, `origine.hopla.page` en origine de repli, `*.cname.hopla.page`
créé) ; restent les étapes 3 à 5. Pour l'allumer (Cloudflare for SaaS, 100 noms gratuits
puis 0,10 $ par nom et par mois) :

1. Dans la zone `hopla.page`, SSL/TLS, « Custom Hostnames » : activer Cloudflare for SaaS et
   donner pour origine de repli (« fallback origin ») un nom en proxy qui mène au serveur,
   par exemple `origine.hopla.page`.
2. Créer l'enregistrement générique `*.cname.hopla.page`, un CNAME en proxy vers cette
   origine : chaque compte pointe son nom vers `<id du compte>.cname.hopla.page`.
3. Créer un jeton d'API limité à la zone, avec « SSL and Certificates : Edit », et poser
   dans les variables Coolify `LIENS_DOMAINES=cname.hopla.page`, `LIENS_CF_JETON` et
   `LIENS_CF_ZONE` (l'identifiant de la zone).
4. Dans Coolify, faire arriver à l'application Hopla les noms que Traefik ne connaît pas :
   dans les « Container Labels » de l'application, un routeur générique de priorité basse
   (`HostRegexp(`.+`)`, `priority=1`, point d'entrée `https`, `tls=true`) vers le service
   de l'application.
5. Le certificat du visiteur est celui de Cloudflare. Vers l'origine de repli, Cloudflare
   se présente sous le nom du client (en-tête `Host` et SNI) : en mode strict, il
   attendrait de Traefik un certificat à ce nom, qu'il n'a pas, et répondrait 526. Une
   règle de configuration passe donc en « Full » (chiffré, certificat du serveur non
   vérifié) pour ces seuls noms, hopla.page restant en strict (choisi par Lilian le
   10 novembre 2026) : `not (http.host eq "hopla.page" or http.host contains ".hopla.page")`,
   réglage SSL `Full`.
6. Turnstile : ajouter chaque nom de page aux noms du widget, sans quoi son formulaire de
   contact et sa liste e-mail refusent les envois. Le serveur, lui, accepte déjà un jeton
   pris sur un nom actif.

Le verrou Cloudflare tient toujours : ces noms passent par Cloudflare eux aussi. Retirer
`LIENS_DOMAINES` éteint tout : les noms posés restent en base et les pages répondent sur
hopla.page.

## Historique

Du 17 au 31 octobre 2026, l'app tournait dans un Compose sur le VPS
(`/docker/linkinbio`, secrets dans `/opt/linkinbio/secrets/runtime.env`, Caddy
partagé dans `/opt/edge`), déployée à chaque push par l'Action « Deploy to
Hostinger » et un receveur SSH à commande forcée (`deploy.sh`, `receive.sh`).
Ces fichiers ont été retirés le 1er novembre 2026 ; ils restent dans l'historique
git. Le 18 octobre 2026, l'app est passée de `liliansevoumian.fr/liens` à la racine
de hopla.page.

## Sauvegarde

Chaque nuit, une tâche planifiée de l'application Coolify lance dans le conteneur :

```
node --disable-warning=ExperimentalWarning deploy/sauvegarde.mjs
```

Le script copie la base sans l'arrêter (`VACUUM INTO`), vérifie que la copie
s'ouvre et contient le compte principal, la compresse et l'envoie dans le seau R2
`sauvegardes-coolify` (celui des sauvegardes Postgres de Coolify), sous
`hopla/liens-AAAA-MM-JJ.db.gz`. Il efface les copies de plus de 30 jours. Il échoue
bruyamment (code 1, message dans les journaux de la tâche) si quelque chose manque.

Variables de l'application : `R2_BACKUP_ENDPOINT`, `R2_BACKUP_ACCESS_KEY_ID`,
`R2_BACKUP_SECRET_ACCESS_KEY` (rangées aussi dans Infisical, projet « infra »),
`R2_BACKUP_BUCKET` ; facultatives `R2_BACKUP_PREFIX` (`hopla/`), `R2_BACKUP_JOURS`
(30).

Restaurer : télécharger la copie depuis R2, `gunzip`, arrêter l'application, poser
le fichier à la place de `/data/liens.db` dans le volume, redémarrer. La faire une
fois à blanc sur une copie avant d'en avoir besoin.

`LIENS_CLE_INTEGRATIONS` ne part jamais avec la base : sans elle, les clés d'API et
les inscrits chiffrés d'une sauvegarde sont illisibles. La garder à part, dans un
gestionnaire de mots de passe ; la perdre rend ces données illisibles pour de bon.

## Reste à faire

- Faire un test de restauration à blanc.
- Allumer les noms de domaine des pages (voir « Noms de domaine des pages ») et mettre Premium en vente.
