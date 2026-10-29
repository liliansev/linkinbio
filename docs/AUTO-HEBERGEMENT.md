# Auto-hébergement

Ce guide décrit le déploiement de Hopla sur une infrastructure propre. Pour une
page sans serveur à administrer, utiliser la version hébergée sur
[hopla.page](https://hopla.page).

Le nom Hopla et son logo sont réservés à la version hébergée : une instance
publique doit porter un autre nom (voir « Licence et marque » dans le README).

## Prérequis

- Un serveur avec Docker : 1 Go de mémoire pour la construction de l'image,
  256 Mo à l'exécution. [Coolify](https://coolify.io) et
  [Dokploy](https://dokploy.com) gèrent le domaine et le certificat TLS ;
  plusieurs hébergeurs, dont Hostinger, proposent des VPS avec l'un ou l'autre
  préinstallé.
- Un nom de domaine dont l'enregistrement DNS pointe vers ce serveur.
- Pour les e-mails de connexion, un compte [Resend](https://resend.com) avec un
  domaine vérifié (offre gratuite : 3 000 e-mails par mois). Sans Resend,
  l'instance fonctionne, mais seul l'administrateur peut se connecter (voir
  [Premier démarrage](#premier-démarrage)).

Facultatif : Cloudflare Turnstile (protection anti-robots des formulaires),
Creem (paiement des offres).

## Fonctionnalités sans paiement

Sans configuration Creem, l'instance ne vend aucune offre : chaque compte
dispose de toutes les fonctionnalités, sans période d'essai ni limite. Cela
comprend les blocs illimités, la programmation, la liste e-mail, un an de
statistiques, l'API REST et le serveur MCP. Les clés d'API se créent dans
Réglages, section « API et MCP », et s'utilisent sur le domaine de l'instance :
`LIENS_ORIGINE/api/v1` et `LIENS_ORIGINE/mcp` (ou `LIENS_ORIGINE_ADMIN` s'il est
défini).

Avec `CREEM_API_KEY` et `CREEM_WEBHOOK_SECRET`, l'instance applique les offres
de hopla.page, la période d'essai de 14 jours et leurs limites.

## Variables d'environnement

La configuration passe par les variables d'environnement, lues au démarrage :
une modification demande un redémarrage du service, pas une reconstruction de
l'image.

### Obligatoires

| Variable | Exemple | Description |
| --- | --- | --- |
| `LIENS_ORIGINE` | `https://liens.example.org` | URL publique de l'instance. Pages sur `/<pseudo>`, back office sur `/admin` |
| `LIENS_ADMIN_EMAIL` | `admin@example.org` | Adresse de l'administrateur, destinataire des signalements |

### Facultatives

| Variable | Description |
| --- | --- |
| `LIENS_PSEUDO_PRINCIPAL` | Pseudo de la page de l'administrateur (`moi` par défaut) |
| `LIENS_ORIGINE_ADMIN` | URL distincte pour le back office (voir ci-dessous) |
| `RESEND_API_KEY`, `CONTACT_FROM` | Envoi des e-mails par Resend |
| `LIENS_CLE_INTEGRATIONS` | Clé de chiffrement des clés d'API et des inscrits (`openssl rand -base64 32`). Ne plus la modifier une fois définie |
| `LIENS_EDITEUR`, `LIENS_HEBERGEUR`, `LIENS_DIRECTEUR`, `LIENS_CONTACT_LEGAL` | Mentions légales |
| `LIENS_INSCRIPTION` | Vide : inscription libre. `attente` : liste d'attente, invitations depuis l'onglet Comptes |
| `LIENS_DEPOT_SOURCE` | URL d'un fork modifié, cible du lien « Code source » (AGPL-3.0) |

La liste complète, avec ses valeurs par défaut, figure dans
[`docker-compose.yml`](../docker-compose.yml) et [`.env.example`](../.env.example).

Par défaut, le back office est servi sur le même nom de domaine que les pages.
Pour le servir sur un autre nom (`https://app.liens.example.org`), définir
`LIENS_ORIGINE_ADMIN` et faire pointer ce nom vers le même service : chaque
domaine redirige vers l'autre les requêtes qui ne le concernent pas.

## Déploiement

### Coolify

1. **New Resource**, source **Git repository** (public, ou privé via
   l'application GitHub de Coolify) : URL de ce dépôt ou d'un fork, branche
   `main`.
2. **Build Pack** : Docker Compose, fichier `/docker-compose.yml`.
3. **Environment Variables** : définir `LIENS_ORIGINE` et `LIENS_ADMIN_EMAIL`
   (Coolify signale les variables obligatoires manquantes).
4. Domaine du service `hopla` : `https://liens.example.org:3000`. Coolify route
   le domaine vers le port 3000 et émet le certificat.
5. **Deploy**. La première construction dure quelques minutes (vérification
   des types et tests compris).

### Dokploy

1. **Create Service**, type **Compose**, source Git : branche `main`, chemin
   `./docker-compose.yml`.
2. **Environment** : `LIENS_ORIGINE` et `LIENS_ADMIN_EMAIL`.
3. **Domains** : le nom de domaine, service `hopla`, port 3000, HTTPS avec
   Let's Encrypt.
4. **Deploy**.

### Docker Compose

```bash
git clone https://github.com/liliansev/linkinbio.git hopla && cd hopla
cp .env.example .env        # renseigner les variables
docker compose up -d --build
```

Le service écoute sur le port 3000 du réseau Docker. Placer un reverse proxy
HTTPS devant, par exemple Caddy, en publiant le port en local
(`ports: ['127.0.0.1:3000:3000']` dans un `compose.override.yaml`) :

```
liens.example.org {
	reverse_proxy 127.0.0.1:3000 {
		header_up X-Real-IP {remote_host}
	}
}
```

L'en-tête `X-Real-IP` transmet l'adresse IP du visiteur, utilisée par les
limites de débit ; elle n'est jamais stockée. Traefik, utilisé par Coolify et
Dokploy, le définit déjà.

### Sans Docker

Node.js 24 et pnpm :

```bash
pnpm install --frozen-lockfile && pnpm build
NODE_ENV=production LIENS_DB=/srv/hopla/liens.db pnpm start
```

avec les mêmes variables d'environnement.

## Premier démarrage

1. Au premier lancement, la base de données est créée avec le **compte
   principal** (l'administrateur de l'instance) : adresse `LIENS_ADMIN_EMAIL`,
   pseudo `LIENS_PSEUDO_PRINCIPAL`, page vide.
2. Ouvrir `https://liens.example.org/admin` et saisir cette adresse. Le lien de
   connexion est envoyé par e-mail ; sans `RESEND_API_KEY`, il est écrit dans
   les journaux du service (« Logs » dans Coolify ou Dokploy), pour le compte
   principal uniquement. Les autres comptes ne peuvent pas se connecter tant que
   l'envoi des e-mails n'est pas configuré.
3. L'onglet Comptes, réservé au compte principal, regroupe la liste des
   comptes, les signalements, la modération et la suppression.

## Sauvegarde

Toutes les données sont dans le volume `hopla-data` : la base SQLite
(`/data/liens.db`) et les images envoyées. Le script `deploy/sauvegarde.sh`
effectue une copie à chaud (`VACUUM INTO`), la vérifie, conserve 14 jours de
copies et les envoie vers un stockage distant par rclone si
`HOPLA_SAUVEGARDE_DISTANTE` est définie.

Conserver également `LIENS_CLE_INTEGRATIONS` : sans cette clé, les clés d'API
et les inscrits chiffrés dans la base sont illisibles.

## Mise à jour

Avec Coolify ou Dokploy : **Redeploy**, ou le déploiement automatique à chaque
push. Avec Docker Compose :

```bash
git pull && docker compose up -d --build
```

Les migrations de la base s'appliquent au démarrage. Effectuer une sauvegarde
avant chaque mise à jour.

## Personnalisation d'une instance publique

Hors de hopla.page, l'instance utilise ses propres URL, son compte principal,
son identité légale et son lien « Code source » ; la page, la signature et la
chaîne YouTube de l'auteur n'y apparaissent pas. Avant d'ouvrir une instance au
public, adapter :

- **Les textes légaux** (`src/lib/legal.ts`) : l'identité provient des
  variables d'environnement, mais les CGU décrivent les offres, les prix et les
  sous-traitants de hopla.page.
- **La marque et la page d'accueil** : le nom Hopla, le logo
  (`src/components/Logo.tsx`, `public/`), l'accueil (`src/accueil/`) et l'image
  de partage.
- **Les prix** des offres (`src/lib/abonnement.ts`) et le paiement par Creem.

La configuration de l'instance est centralisée dans `src/lib/instance.ts`.
