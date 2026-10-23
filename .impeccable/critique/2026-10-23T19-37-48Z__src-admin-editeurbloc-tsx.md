---
target: ajouter un bloc, ouvrir un bloc (série 2)
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/home/user/linkinbio/src/admin/EditeurBloc.tsx"
target_fingerprint: "sha256:9fac9c3ff938dcb24b120216154aaca76d05bbcbef2f322e852172312fa5aec2"
target_path: /home/user/linkinbio/src/admin/EditeurBloc.tsx
timestamp: 2026-10-23T19-37-48Z
slug: src-admin-editeurbloc-tsx
---
Method: dual-agent (A : revue de design · B : détecteur et navigateur), deux sous-agents isolés, lancés en parallèle. Deuxième et dernière série (règle de Lilian : deux séries au plus ; toutes les corrections relevées se font, sans troisième série).

# Critique Impeccable : ajouter un bloc, ouvrir un bloc, série 2 (23 octobre 2026)

Cible : les mêmes deux parcours que la série 1, après ses corrections (a67b631). Ajouter un bloc (le choix du type, le bloc neuf posé sur la page, sa feuille au téléphone, sa rangée au bureau) et ouvrir un bloc posé (première page, Quand, Pour qui, Apparence, Plus de réglages).

## Note de santé (Nielsen)

| # | Heuristique | Note | Point clé |
|---|---|---|---|
| 1 | Visibilité de l'état | 3 | La puce d'état passait sous l'en-tête ; au bureau, replier une rangée modifiée ne disait rien |
| 2 | Correspondance avec le réel | 3 | Deux noms et deux places pour le texte sous le titre (sous-titre, description) |
| 3 | Contrôle et liberté | 3 | Fermer ajoutait, gardait ou se taisait selon la surface ; la flèche partait à la première frappe |
| 4 | Cohérence | 2 | Interrupteurs empilés au téléphone, côte à côte au bureau ; « Plus de réglages » donnait un sommaire, pas un état |
| 5 | Prévention des erreurs | 3 | Au bureau, l'interrupteur de « Visible » touchait le libellé « Mis en avant » |
| 6 | Reconnaissance | 3 | Sommaire de « Plus de réglages » coupé au téléphone |
| 7 | Flexibilité | 3 | Pas de Cmd/Ctrl+Entrée dans la rangée d'un bloc neuf ; douze entrées d'un seul tenant |
| 8 | Esthétique et minimalisme | 3 | Ligne d'explication sous le titre d'un bloc neuf ; au bureau, sections ouvertes ensemble |
| 9 | Récupération | 3 | Miniature YouTube cassée sans repli |
| 10 | Aide | 2 | « Mis en avant » et la grille de Pour qui sans explication (gardé : pas de sous-titres explicatifs) |
| **Total** | | **28/40** | Même note qu'en série 1, regard plus sévère sur les règles d'interaction |

## Problèmes prioritaires, tous corrigés

- **P1** Au bureau, « Visible sur ma page » et « Mis en avant » côte à côte : chaque interrupteur finissait contre le libellé de l'autre. Corrigé : l'un sous l'autre, comme au téléphone.
- **P2** Fermer ne voulait pas dire la même chose partout. Corrigé : au bureau, replier une rangée modifiée dit « Modifications enregistrées » avec Annuler, qui rend l'état d'ouverture ; le message reste tant qu'Annuler a le focus au clavier ; la flèche d'un bloc neuf reste et ramène au choix des blocs avec l'adresse tapée dans « Colle une adresse » ; choisir un autre type y reprend le brouillon, fermer le choix l'ajoute.
- **P2** La description lue sur le site arrivait sur la page sans que son champ soit en vue. Corrigé : son champ est sur la première page dès que la forme la montre ; Apparence ne garde que forme, couleur et animation.
- **P2** « Plus de réglages » donnait un sommaire gris, coupé au téléphone. Corrigé : rien quand rien n'est réglé, ce qui l'est en bleu.
- **P3** La puce d'état passait sous l'en-tête. Corrigé : la hauteur des puces compte dans la place de la feuille.

Observations mineures, toutes corrigées : jours de Quand en cases séparées ; aide de Me soutenir dans le champ de l'adresse ; exemple des montants seulement quand les quatre cases sont vides ; choix des blocs en trois familles séparées d'un filet (ce qui part d'une adresse, ce qu'on écrit, ce que Hopla branche) ; picto de Lien en chaîne (Phosphor en gras, la chaîne pleine est posée sur un carré) ; miniature YouTube cassée remplacée par le cadre et son bouton ; « Place sur ma page » ; titre de section vide avec un texte d'exemple ; Accès réservé sans les deux « facultatif » ; filet sous l'en-tête d'une rangée seulement quand il colle ; au bureau, un seul de Apparence, Quand et Pour qui déplié à la fois ; Cmd/Ctrl+Entrée ajoute un bloc neuf au bureau.

Gardés tels quels, par décision : pas d'explication sous « Mis en avant » ni sous la grille de Pour qui (règle de Lilian, pas de sous-titres explicatifs) ; la feuille garde sa hauteur maximale ; le crayon de la vignette. Proposé à part : garder un bloc neuf commencé après un rechargement.

## Détecteur (B)

`impeccable detect --json` sur EditeurBloc, MaPage, ReglesBloc, OngletLiens, Admin : code 0, un seul avis (Admin.tsx, `max-[359px]:text-[10.5px]`). Mesuré à 320 px, ce palier est nécessaire (« Intégrations » déborderait à 11,5 px) : documenté dans DESIGN.md comme légende compacte. Superposition au navigateur : rien dans les feuilles ni dans les rangées dépliées.
