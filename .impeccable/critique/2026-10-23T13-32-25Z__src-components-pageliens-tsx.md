---
target: pied de la page publique (mention Hopla et liens légaux)
total_score: 28
max_score: 36
na_heuristics: 7
p0_count: 0
p1_count: 0
target_identity: "file:/home/user/linkinbio/src/components/PageLiens.tsx"
target_fingerprint: "sha256:6f0519e685c24b3e964110fd62a765732d757ad33abb91ef8cf3b1eafb4d249d"
target_path: /home/user/linkinbio/src/components/PageLiens.tsx
timestamp: 2026-10-23T13-32-25Z
slug: src-components-pageliens-tsx
---
Method: dual-agent (A : revue de design · B : détecteur et navigateur), deux sous-agents isolés, lancés en parallèle, une seule série.

# Critique Impeccable : le pied de la page publique (23 octobre 2026)

Cible : `.lp-fin` dans `src/components/PageLiens.tsx`, section « Le pied » de `src/styles/page.css`, couleurs `--mention-hopla` et `--pied-legal` (`src/lib/themes.ts`). Demande de Lilian : « Une page faite avec Hopla » et « Confidentialité · Signaler » trop collés ; la mention un peu en avant, à l'accent du thème ; puis le texte « Crée ta page avec Hopla ».

## Note de santé (Nielsen)

| # | Heuristique | Note | Point clé |
|---|---|---|---|
| 1 | Visibilité de l'état | 3 | Survol et focus nets ; au toucher, le flash gris par défaut d'iOS |
| 2 | Correspondance avec le réel | 3 | Convention Linktree reconnue ; « Crée ta page » tutoie sous un contenu qui vouvoie |
| 3 | Contrôle et liberté | 3 | Même onglet, retour possible ; les liens répondaient dans l'éditeur du téléphone (corrigé) |
| 4 | Cohérence | 3 | Même logique partout ; taille apparente variable selon la police (corrigé) |
| 5 | Prévention des erreurs | 4 | 171 à 193 px entre la mention et Signaler sur une page courte, 48 px sur une longue, cibles de 44 px |
| 6 | Reconnaissance | 3 | Tout est écrit ; liens légaux reconnus à la convention seule |
| 7 | Flexibilité | n/a | Trois liens au bout d'une page de présentation |
| 8 | Esthétique et minimalisme | 3 | Sobre, un point, un accent ; le décor passe sous le texte sur lampe, skate, galaxie |
| 9 | Récupération | 3 | /signaler ramène à la page, rien ne part sans motif |
| 10 | Aide | 3 | « Signaler » seul ne disait pas quoi au lecteur d'écran (corrigé) |
| **Total** | | **28/36** | **Bon** (l'heuristique 7 en n/a) |

## Spécificité

A : un pied conventionnel à dessein (structure Linktree), propre à Hopla par la couleur calculée de chaque thème et par trois pieds différents au bureau (centré en Colonne, au bord des blocs en Profil, pied de site sous un trait en One page). Ni pilule, ni icône, ni pointillé. Ce qui manquait : la typographie (le pied rapetissait de 17 à 18 % en Garamond et en Fraunces) et le décor (la lave).

Détecteur : `impeccable detect --json src/components/PageLiens.tsx` rend 0 trouvaille (code 0), aussi sans configuration. L'overlay, injecté sur sept vues, ne relève rien sur le pied ; il signale au niveau de la page `dark-glow` et `radial-halo` (le halo de `.lp-tete::before` et l'ombre de la carte d'accent, déjà là avant), dont « on dark page » sur des thèmes clairs (faux positif), et `ai-color-palette` sur lampe, dont le dégradé violet est le thème lui-même (faux positif). Les mesures de B ont trouvé ce que le détecteur ne voit pas : en Colonne au bureau, la mention tombait à 4,21 sur lin, 4,27 sur sauge, 4,41 sur lilas (le panneau teinté n'était pas compté), et sur lampe à 3,46 quand la lave passe derrière (A et B s'accordent).

## Ce qui marche

1. Le défaut est réglé, mesures à l'appui : sur Klein, mention à 544-588 px, Signaler à 772-816 px sur 844 ; aucune cible ne touche l'autre, sur les 20 thèmes, au téléphone et au bureau.
2. La couleur est calculée : l'accent tel quel sur 13 thèmes (le jaune #ffd400 de Klein), poussé vers le texte juste assez sur les autres, le texte en dernier recours (argile), sans opacité.
3. Au bureau, chaque mise en page a son pied, aligné au pixel près.

## Problèmes et suite donnée

- **[P2] Le pied rapetissait sur les thèmes à empattements.** Corrigé : `font-size-adjust: 0.53` sur `.lp-fin` (0,5 pour EB Garamond, déjà à 1,06em), le pied garde l'œil de Geist dans toutes les polices.
- **[P2] Contraste sous 4,5 sur la lave (lampe) et sur le panneau de Colonne (lin, sauge, lilas).** Corrigé : `fondsDuPied` compte le panneau (le texte à 4 %) et la bulle la plus vive de la lave ; la mention de lampe passe à #ffc38c (mesuré sur un cycle de lave : 4,95 au pire pixel). Le test vérifie ces fonds.
- **[P2] La variante au vous (« Créez votre page avec Hopla ») n'est atteignable que par les pages d'avant le 18 octobre**, l'interrupteur du vouvoiement ayant quitté le back office. Laissé tel quel : le texte est celui choisi par Lilian.
- **[P3] Dans l'éditeur du téléphone, les liens du pied répondaient.** Corrigé : le pied est inerte en édition. Idée non faite : que la mention y ouvre les offres (« sans la mention »).
- **[P3] Sur argile, mention et liens légaux ont presque la même crème.** Laissé : l'avance tient à la taille et au gras de « Hopla ».

## Corrections mineures faites

`flex-wrap` sur les liens légaux (texte agrandi), `text-wrap: balance` sur la mention, survol limité à `(hover: hover)`, approche négative retirée, `aria-label="Signaler cette page"`.

## Personas

- Casey (téléphone, depuis Instagram) : plus de confusion possible ; Signaler est au bas de l'écran, sous le pouce, à 28 px de la barre du navigateur.
- Sam (lecteur d'écran) : `<footer>` hors de `<main>`, point en `aria-hidden`, focus visible ; « Signaler cette page » désormais.
- Riley (cas limites) : la page principale de Lilian n'a que « liliansevoumian.fr », sans liens légaux (comme avant ce lot) ; une étoile de galaxie passe au-dessus de « Confidentialité ».
- Camille (page Gratuit) : la mention prend son accent, le même jaune que son lien vedette sur Klein ; c'est l'argument pour Starter.

Questions skipped: Lilian a fixé la direction (Linktree, accent du thème, « Crée ta page avec Hopla ») ; règle du projet, une série puis on publie.
