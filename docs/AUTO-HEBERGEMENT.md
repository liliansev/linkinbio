# Auto-héberger Hopla

Ce guide fait tourner le code de ce dépôt sur ton propre serveur. Si tu veux
simplement une page, la version hébergée sur [hopla.page](https://hopla.page) le
fait pour toi, sans serveur.

Le nom Hopla et son logo restent réservés à la version hébergée : une instance
publique doit porter un autre nom (voir « Licence et marque » dans le README).

## Ce qu'il faut

- Un serveur Linux avec Docker (512 Mo de mémoire suffisent), ou Node 24 et pnpm 10.
- Un nom de domaine, et un frontal HTTPS (Caddy, Traefik, Nginx…).
- Un compte [Resend](https://resend.com) pour envoyer les liens de connexion
  (gratuit jusqu'à 3 000 e-mails par mois), avec un domaine vérifié.

Le reste est facultatif : Cloudflare Turnstile contre les robots, Creem pour
faire payer des offres.

## Les deux adresses

Hopla sert deux origines depuis le même processus :

- `LIENS_ORIGINE` : les pages publiques, `https://liens.example.org/<pseudo>` ;
- `LIENS_ORIGINE_ADMIN` : le back office, `https://app.liens.example.org/admin`.

Le serveur renvoie de l'une à l'autre ce qui ne la concerne pas. Les deux noms
pointent vers le même conteneur.

## Avec Docker

Le `Dockerfile` construit l'app, passe le typecheck et les tests, puis produit
une image sans `node_modules`.

```bash
git clone https://github.com/liliansev/linkinbio.git hopla && cd hopla
cp .env.example .env        # puis le remplir : adresses, identité légale, e-mails
docker build -t hopla .
```

Les adresses et l'identité légale sont lues **au build** : la page et le back
office en ont besoin dans le navigateur. Sans elles, le build est celui de
hopla.page. Après un changement de `.env`, reconstruis l'image.

Un `compose.yaml` minimal (celui de `deploy/` est propre à hopla.page) :

```yaml
services:
  app:
    image: hopla
    restart: unless-stopped
    init: true
    read_only: true
    env_file: .env
    environment:
      NODE_ENV: production
      PORT: '3000'
    volumes:
      - hopla-data:/data   # la base SQLite et les images envoyées
    ports:
      - '127.0.0.1:3000:3000'
volumes:
  hopla-data:
```

Et le frontal, par exemple avec Caddy, qui obtient les certificats seul :

```
liens.example.org, app.liens.example.org {
	reverse_proxy 127.0.0.1:3000 {
		header_up X-Real-IP {remote_host}
	}
}
```

`X-Real-IP` donne au serveur l'adresse du visiteur, dont dépendent les limites
anti-abus. Elle n'est jamais enregistrée.

## Sans Docker

```bash
pnpm install --frozen-lockfile
pnpm build
NODE_ENV=production LIENS_DB=/srv/hopla/liens.db pnpm start
```

## Premier démarrage

1. Au premier lancement, la base se crée avec le **compte principal**,
   l'administrateur de l'instance : son adresse est `LIENS_ADMIN_EMAIL`, son
   pseudo `LIENS_PSEUDO_PRINCIPAL` (`moi` à défaut), sa page est vide.
2. Ouvre `LIENS_ORIGINE_ADMIN/admin`, entre cette adresse : le lien de connexion
   arrive par e-mail (ou dans les journaux du conteneur sans `RESEND_API_KEY`).
3. L'onglet Comptes, réservé au compte principal, liste les comptes, les
   signalements, et permet d'offrir une offre à un compte, pour une durée ou
   sans fin. Sans Creem, c'est ainsi qu'on ouvre Starter ou Pro à quelqu'un.

## Sauvegardes

Tout l'état tient dans un fichier SQLite (`/data/liens.db`). `deploy/sauvegarde.sh`
en fait une copie à chaud (`VACUUM INTO`), vérifiée, gardée 14 nuits, et
l'envoie ailleurs par rclone si `HOPLA_SAUVEGARDE_DISTANTE` est posée. Garde
aussi `LIENS_CLE_INTEGRATIONS` en lieu sûr : sans elle, les clés d'API et les
inscrits chiffrés de la base sont illisibles.

## Mettre à jour

```bash
git pull && docker build -t hopla . && docker compose up -d
```

La base se met à jour seule au démarrage. Fais une sauvegarde avant.

## Ce qui reste propre à hopla.page

Hors de hopla.page, l'instance a ses adresses, son compte principal, son
identité légale et son lien « Code source » ; la page, la signature et la chaîne
YouTube de l'auteur n'y apparaissent pas. Restent à adapter avant d'ouvrir une
instance au public :

- **Les textes légaux** (`src/lib/legal.ts`) : l'identité vient de `.env`, mais
  les CGU décrivent les offres, les prix et les sous-traitants de hopla.page.
  Relis-les et adapte-les à ton service.
- **La marque et l'accueil** : le nom Hopla, le logo (`src/components/Logo.tsx`,
  `public/`), la page d'accueil (`src/accueil/`) et l'image de partage.
- **Les prix** des offres (`src/lib/abonnement.ts`) et le paiement par Creem.

Les réglages de l'instance vivent dans `src/lib/instance.ts`.
