# Auto-héberger Hopla

Ce guide fait tourner le code de ce dépôt sur ton propre serveur. Si tu veux
simplement une page, la version hébergée sur [hopla.page](https://hopla.page) le
fait pour toi, sans serveur.

Le nom Hopla et son logo restent réservés à la version hébergée : une instance
publique doit porter un autre nom (voir « Licence et marque » dans le README).

## Ce qu'il faut

- Un serveur avec Docker (1 Go de mémoire pour construire l'image, 256 Mo
  ensuite). Le plus simple : [Coolify](https://coolify.io) ou
  [Dokploy](https://dokploy.com), qui s'occupent du domaine et du HTTPS.
  Hostinger, entre autres, propose des VPS où l'un ou l'autre est déjà installé.
- Un nom de domaine qui pointe vers ce serveur.
- Pour les e-mails de connexion, un compte [Resend](https://resend.com)
  (gratuit jusqu'à 3 000 e-mails par mois) avec un domaine vérifié. Sans lui,
  l'instance marche, mais seul l'administrateur peut entrer (voir plus bas).

Le reste est facultatif : Cloudflare Turnstile contre les robots, Creem pour
faire payer des offres.

## Sans paiement, tout est ouvert

Sans Creem, rien ne se vend sur l'instance : chaque compte a tout, sans essai
ni limite d'offre. Blocs sans limite, programmation, liste e-mail, un an de
stats, et l'API et le serveur MCP : chacun crée ses clés dans Réglages (« API
et MCP ») et les utilise sur le domaine de l'instance, `LIENS_ORIGINE/api/v1`
et `LIENS_ORIGINE/mcp` (ou `LIENS_ORIGINE_ADMIN` s'il est posé). Avec
`CREEM_API_KEY` et `CREEM_WEBHOOK_SECRET`, l'instance retrouve les offres de
hopla.page, l'essai de 14 jours et leurs limites.

## Les variables

Tout se règle par l'environnement, lu au démarrage : changer une variable
demande un redémarrage, jamais une reconstruction de l'image. Deux sont
obligatoires :

| Variable | Exemple | Rôle |
| --- | --- | --- |
| `LIENS_ORIGINE` | `https://liens.example.org` | L'adresse de l'instance : les pages sur `/<pseudo>`, le back office sur `/admin` |
| `LIENS_ADMIN_EMAIL` | `moi@example.org` | L'adresse de l'administrateur, qui reçoit aussi les signalements |

Les autres, toutes dans [`docker-compose.yml`](../docker-compose.yml) et
[`.env.example`](../.env.example) : `RESEND_API_KEY` et `CONTACT_FROM` pour
les e-mails, `LIENS_CLE_INTEGRATIONS` pour chiffrer les clés d'API et les
inscrits, `LIENS_EDITEUR`, `LIENS_HEBERGEUR`, `LIENS_DIRECTEUR` et
`LIENS_CONTACT_LEGAL` pour les mentions légales, `LIENS_PSEUDO_PRINCIPAL` pour
le pseudo de ta page (`moi` à défaut).

Le back office vit sur le même nom que les pages. Pour le mettre ailleurs
(`https://app.liens.example.org`), pose `LIENS_ORIGINE_ADMIN` et fais pointer
ce second nom vers le même service : chacun renvoie vers l'autre ce qui ne le
concerne pas.

## Avec Coolify

1. **Nouvelle ressource**, depuis un dépôt Git (public, ou privé par
   l'application GitHub de Coolify) : colle l'adresse de ce dépôt (ou de ton
   fork), branche `main`.
2. **Build Pack** : Docker Compose, fichier `/docker-compose.yml`.
3. Dans **Environment Variables**, remplis `LIENS_ORIGINE` et
   `LIENS_ADMIN_EMAIL` (Coolify signale celles qui manquent).
4. Sur le service `hopla`, le domaine : `https://liens.example.org:3000`
   (Coolify route le domaine vers le port 3000 et pose le certificat).
5. **Deploy**. La première construction prend quelques minutes : elle passe le
   typecheck et les tests.

## Avec Dokploy

1. **Create Service**, **Compose**, puis la source : le dépôt Git, branche
   `main`, chemin `./docker-compose.yml`.
2. Dans **Environment**, `LIENS_ORIGINE` et `LIENS_ADMIN_EMAIL`.
3. Dans **Domains**, ton nom, le service `hopla`, le port 3000, HTTPS avec
   Let's Encrypt.
4. **Deploy**.

## Sur un serveur nu

```bash
git clone https://github.com/liliansev/linkinbio.git hopla && cd hopla
cp .env.example .env        # puis le remplir
docker compose up -d --build
```

Le service écoute sur le port 3000 du réseau Docker. Mets un frontal HTTPS
devant, par exemple Caddy, qui obtient les certificats seul, en publiant le
port (`ports: ['127.0.0.1:3000:3000']` dans un `compose.override.yaml`) :

```
liens.example.org {
	reverse_proxy 127.0.0.1:3000 {
		header_up X-Real-IP {remote_host}
	}
}
```

`X-Real-IP` donne au serveur l'adresse du visiteur, dont dépendent les limites
anti-abus (Traefik, chez Coolify et Dokploy, la pose déjà). Elle n'est jamais
enregistrée.

Sans Docker : `pnpm install --frozen-lockfile && pnpm build`, puis
`NODE_ENV=production LIENS_DB=/srv/hopla/liens.db pnpm start` avec les mêmes
variables.

## Premier démarrage

1. Au premier lancement, la base se crée avec le **compte principal**,
   l'administrateur de l'instance : son adresse est `LIENS_ADMIN_EMAIL`, son
   pseudo `LIENS_PSEUDO_PRINCIPAL`, sa page est vide.
2. Ouvre `https://liens.example.org/admin` et entre cette adresse. Le lien de
   connexion arrive par e-mail ; sans `RESEND_API_KEY`, il est écrit dans les
   journaux du service (« Logs » dans Coolify ou Dokploy), et lui seul : les
   autres comptes attendent que les e-mails soient branchés.
3. L'onglet Comptes, réservé au compte principal, liste les comptes, les
   signalements, la modération et la suppression d'un compte.

## Sauvegardes

Tout l'état tient dans le volume `hopla-data` : la base SQLite (`/data/liens.db`),
images envoyées comprises. `deploy/sauvegarde.sh`
en fait une copie à chaud (`VACUUM INTO`), vérifiée, gardée 14 nuits, et
l'envoie ailleurs par rclone si `HOPLA_SAUVEGARDE_DISTANTE` est posée. Garde
aussi `LIENS_CLE_INTEGRATIONS` en lieu sûr : sans elle, les clés d'API et les
inscrits chiffrés de la base sont illisibles.

## Mettre à jour

Avec Coolify ou Dokploy, **Redeploy** (ou le déploiement automatique à chaque
push). Sur un serveur nu :

```bash
git pull && docker compose up -d --build
```

La base se met à jour seule au démarrage. Fais une sauvegarde avant.

## Ce qui reste propre à hopla.page

Hors de hopla.page, l'instance a ses adresses, son compte principal, son
identité légale et son lien « Code source » ; la page, la signature et la chaîne
YouTube de l'auteur n'y apparaissent pas. Restent à adapter avant d'ouvrir une
instance au public :

- **Les textes légaux** (`src/lib/legal.ts`) : l'identité vient des variables, mais
  les CGU décrivent les offres, les prix et les sous-traitants de hopla.page.
  Relis-les et adapte-les à ton service.
- **La marque et l'accueil** : le nom Hopla, le logo (`src/components/Logo.tsx`,
  `public/`), la page d'accueil (`src/accueil/`) et l'image de partage.
- **Les prix** des offres (`src/lib/abonnement.ts`) et le paiement par Creem.

Les réglages de l'instance vivent dans `src/lib/instance.ts`.
