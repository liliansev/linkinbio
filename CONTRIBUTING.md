# Contribuer à Hopla

Merci de passer par ici. Hopla est un petit projet : une issue avant une grosse
pull request évite de travailler pour rien.

## Signaler un problème ou proposer une idée

Ouvre une issue avec ce que tu as fait, ce que tu attendais et ce qui s'est
passé (navigateur, téléphone ou ordinateur, capture si possible). Une faille de
sécurité ne s'ouvre jamais en issue publique : voir [`SECURITY.md`](SECURITY.md).

## Proposer une modification

```bash
pnpm install
pnpm dev                                  # http://localhost:4400
pnpm build && pnpm typecheck && pnpm test # ce que la CI vérifie
```

- Une pull request par sujet, partie de `main`.
- Les tests passent, et un comportement nouveau vient avec son test
  (`src/**/*.test.ts`, `deploy/server.test.mjs`).
- Lis [`CLAUDE.md`](CLAUDE.md) avant de toucher au code : la carte de `src/` et
  les règles du projet y sont, et [`DESIGN.md`](DESIGN.md) pour l'interface.

## Les règles de la maison

- **Tout le texte de l'interface est en français**, sans tiret cadratin. Le
  service s'appelle Hopla.
- **Mobile d'abord** : chaque écran se vérifie au téléphone puis au bureau.
- **Pas de nouvelle dépendance** sans en parler dans une issue : l'image de
  production n'a pas de `node_modules`, tout est embarqué au build.
- **Données des visiteurs** : ni cookie, ni adresse IP enregistrée, ni outil de
  suivi tiers sur les pages publiques.
- **Icônes** : Phosphor pleins, jamais d'emoji, jamais d'icône sur un fond.
- **Navigateur de test** : agent-browser. Playwright n'est pas utilisé dans ce dépôt.
- Toute modification des CGU ou de l'accord de traitement change `VERSION_CGU`.

## Licence de tes contributions

Le projet est sous [AGPL-3.0](LICENSE). En proposant une pull request, tu
confirmes que tu as le droit de publier ce code, et tu acceptes qu'il soit
distribué sous l'AGPL-3.0 et utilisé par AURA GROUP, éditeur de Hopla, dans la
version hébergée sur hopla.page, y compris sous d'autres conditions de licence.
Signe chaque commit (`git commit -s`), selon le
[Developer Certificate of Origin](https://developercertificate.org).
