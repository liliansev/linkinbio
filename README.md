# Hopla

**L'alternative open source et européenne à Linktree.** Une page de liens par
personne, éditée depuis un back office pensé d'abord pour le téléphone.

- La version hébergée, prête à l'emploi : [hopla.page](https://hopla.page)
  (exemple : [hopla.page/lilian](https://hopla.page/lilian)).
- Ce dépôt : tout le code de cette version, sous licence AGPL-3.0, que chacun
  peut lire, auto-héberger et améliorer.

> **English.** Hopla is an open source, EU-hosted alternative to Linktree: one
> link-in-bio page per person, edited from a mobile-first back office. The hosted
> service runs at hopla.page; this repository holds its full source under the
> AGPL-3.0. The product and its docs are in French. Self-hosting guide:
> [`docs/AUTO-HEBERGEMENT.md`](docs/AUTO-HEBERGEMENT.md).

## Ce que fait Hopla

- **Ta vraie page, éditée en place** : au téléphone, on touche son nom, sa bio
  ou un bloc pour le changer ; au bureau, l'édition à gauche et la page dans un
  iPhone à droite, qui suit chaque frappe.
- **Une adresse collée choisit son bloc** : une vidéo YouTube devient un
  lecteur, un agenda Calendly une prise de rendez-vous, une fiche produit une
  vitrine avec sa photo et son prix.
- **Des blocs pour tout** : liens, titres, textes, vidéos, musique, galeries,
  FAQ, carte de visite (vCard), lieu, formulaire de contact, avis, liste e-mail,
  derniers articles d'un flux RSS, dernière vidéo d'une chaîne.
- **Une page qui s'adapte** : selon le réseau d'où arrive le visiteur, l'heure,
  la date ou son pays ; liens programmés, comptes à rebours, drops.
- **Des stats sans cookie** : vues, clics, provenance, pays, appareil. L'adresse
  IP n'est jamais enregistrée.
- **Ta liste e-mail branchée** sur Brevo, Mailchimp, Kit, MailerLite, beehiiv,
  Systeme.io, MailCheap, Loops, ou Make, Zapier et n8n par webhook. Les clés
  sont chiffrées au repos (AES-256-GCM).
- **Vingt thèmes**, une police, une image de fond, des liens en grille.
- **Connexion sans mot de passe**, par un lien reçu par e-mail.

## Pourquoi open source

- **Confiance** : on voit ce que le service fait de tes données et de celles de
  tes visiteurs. Rien de caché, rien de revendu.
- **Liberté** : tes données s'exportent depuis Réglages, et le code peut tourner
  sur ton propre serveur.
- **Européen** : édité en France, chez un hébergeur établi dans l'Union
  européenne, conçu pour le RGPD et le DSA (signalements, modération motivée).

## Hébergé ou auto-hébergé

| | [hopla.page](https://hopla.page) | Auto-hébergé |
| --- | --- | --- |
| Prix | Gratuit, puis Starter, Pro | Gratuit, ton serveur à ta charge |
| Mise en route | Deux minutes | Un serveur Node 24 et un nom de domaine |
| Mises à jour, sauvegardes, e-mails | Faits pour toi | À ta charge |
| Support | Oui | Les issues de ce dépôt |

Le guide : [`docs/AUTO-HEBERGEMENT.md`](docs/AUTO-HEBERGEMENT.md).

## Démarrer en local

Node 24 et pnpm 10.

```bash
pnpm install
pnpm dev          # http://localhost:4400
pnpm build && pnpm typecheck && pnpm test
```

Sans `RESEND_API_KEY`, les liens de connexion s'affichent dans la console.
Toutes les variables : [`.env.example`](.env.example).

## La pile

TanStack Start (React 19, Vite), Tailwind CSS v4, SQLite par `node:sqlite`.
En production, un seul processus Node (`deploy/server.mjs`) sert la page
publique et le back office ; l'image Docker n'a pas de `node_modules`.

La carte du code et les conventions sont dans [`CLAUDE.md`](CLAUDE.md) : une
grande partie de Hopla a été écrite avec Claude Code, et ce fichier est celui
que lisent aussi bien les humains que les agents.

## Contribuer

Les issues et les pull requests sont les bienvenues : voir
[`CONTRIBUTING.md`](CONTRIBUTING.md). Une faille de sécurité se signale en
privé : [`SECURITY.md`](SECURITY.md).

## Licence et marque

Le code est sous [GNU Affero General Public License v3.0](LICENSE) : tu peux
l'utiliser, le modifier et le redistribuer, y compris pour un service en ligne,
à condition de publier tes modifications sous la même licence pour les
personnes qui utilisent ton service.

Le nom **Hopla**, son logo et le domaine hopla.page ne sont pas couverts par la
licence : une instance auto-hébergée ou un fork public doit porter un autre nom
et un autre logo. Les portraits des profils d'exemple sont des images générées,
fournies pour la démonstration.

© 2026 AURA GROUP.
