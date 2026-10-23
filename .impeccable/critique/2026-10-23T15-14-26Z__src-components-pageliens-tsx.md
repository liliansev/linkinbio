---
target: pied de la page publique (série 2)
total_score: 24
max_score: 32
na_heuristics: 7,9
p0_count: 0
p1_count: 0
target_identity: "file:/home/user/linkinbio/src/components/PageLiens.tsx"
target_fingerprint: "sha256:cc2830c2a139128a619b5e189bbbe25df90d082d156adb4b60ef1e1d7055d67e"
target_path: /home/user/linkinbio/src/components/PageLiens.tsx
timestamp: 2026-10-23T15-14-26Z
slug: src-components-pageliens-tsx
---
Method: dual-agent (A : revue de design · B : détecteur et navigateur), deux sous-agents isolés, lancés en parallèle. Deuxième et dernière série (règle de Lilian : deux séries au plus, puis on publie).

# Critique Impeccable : le pied de la page publique, série 2 (23 octobre 2026)

Cible : le pied après la première série et les trois retouches promises à Lilian à 14 h 03 (un retour au toucher, le décor de Skate et de Galaxie effacé sous les liens légaux, Confidentialité · Signaler sur la page de Lilian), avec le texte « Créer ma page avec Hopla » choisi à 14 h 19.

## Note de santé (Nielsen)

| # | Heuristique | Note | Point clé |
|---|---|---|---|
| 1 | Visibilité de l'état | 3 | Retour au toucher présent, mais l'opacité à 0,55 faisait tomber le contraste à 2,12 pendant l'appui (corrigé après la série : soulignement) |
| 2 | Correspondance avec le réel | 3 | « Créer ma page avec Hopla » se lit au tu comme au vous |
| 3 | Contrôle et liberté | 3 | Même onglet, retour possible, pied inerte dans l'éditeur |
| 4 | Cohérence | 3 | `font-size-adjust` grossissait le pied au-dessus du texte de la page en Garamond (corrigé après la série : retiré, 0,82em pour les liens légaux des polices à petit œil) |
| 5 | Prévention des erreurs | 3 | Cibles de 44 px, 48 px entre la mention et les liens légaux ; le point pouvait rester seul en bout de ligne et les deux cibles se toucher (corrigé après la série) |
| 6 | Reconnaissance | 3 | Tout est écrit |
| 7 | Flexibilité | n/a | Trois liens au bout d'une page de présentation |
| 8 | Esthétique et minimalisme | 3 | Décor effacé sous les liens légaux ; sur Argile, la mention et les liens avaient la même crème (corrigé après la série : la mention passe à 560) |
| 9 | Récupération | n/a | Rien à récupérer dans un pied de trois liens |
| 10 | Aide | 3 | « Signaler cette page » pour le lecteur d'écran |
| **Total** | | **24/32** | Toutes les heuristiques notées à 3, deux en n/a |

Sur la même base que la série 1 (36 points), 24/32 vaut 27/36 : la note n'a pas monté, parce que le regard A a été plus strict sur la prévention des erreurs (4 en série 1, 3 ici) et a trouvé de nouveaux défauts créés par les corrections de la série 1.

## Détecteur (B)

`impeccable detect --json src/components/PageLiens.tsx` : 0 trouvaille sur le pied. Contrastes mesurés au navigateur sur les 20 thèmes, au téléphone et au bureau : médianes à 4,5 ou plus partout. Deux défauts trouvés à la mesure, corrigés après la série : l'appui à 0,55 d'opacité (2,12) et le point à 0,7 d'opacité (sous 4,5). Restent sur Galaxie quelques pixels d'étoiles isolés dans le haut du pied, acceptés comme décor.

## Suite donnée (après la série, sans nouvelle note)

- L'appui souligne le lien au lieu de le pâlir : le contraste ne bouge pas.
- `font-size-adjust` retiré ; liens légaux à 0,82em en Garamond et en Fraunces.
- Le point et « Signaler » restent ensemble quand la ligne se coupe, sans opacité, avec 4 px d'air de chaque côté.
- La signature de la page de Lilian prend la couleur des liens légaux (`--pied-legal`).
- Sur Argile, où l'accent ne se lit pas, la mention prend le texte en 560 (`--mention-graisse`) et passe devant les liens légaux.
- La grille et le damier sont comptés parmi les fonds du pied (`fondsDuPied`) ; le test vérifie 4,5 sur chacun.

Planche des 20 thèmes après ces corrections : `planche-apres-3.png`, captures dans `apres-3/` (dont `principal-klein.png`, la page de Lilian).

## Laissé de côté

- Donner à la mention l'allure d'un titre de section : Lilian a demandé l'accent du thème, pas un titre.
- Le logo Hopla dans la mention, un paramètre `?via=` sur le lien : Lilian ne veut pas de paramètres d'URL.
- Que la mention ouvre les offres dans l'éditeur.

Questions skipped: direction fixée par Lilian ; règle du projet, deux séries puis on publie.
