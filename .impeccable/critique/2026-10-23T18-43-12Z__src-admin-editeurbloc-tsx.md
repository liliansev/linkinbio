---
target: ajouter un bloc, ouvrir un bloc (série 1)
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/user/linkinbio/src/admin/EditeurBloc.tsx"
target_fingerprint: "sha256:180aa8d45a01a1d796a03d2b3c8620f101baf81e5dd29950ab2e9d1d3c1355fe"
target_path: /home/user/linkinbio/src/admin/EditeurBloc.tsx
timestamp: 2026-10-23T18-43-12Z
slug: src-admin-editeurbloc-tsx
---
Method: dual-agent (A : revue de design · B : détecteur et navigateur), deux sous-agents isolés, lancés en parallèle. Première série (règle de Lilian : deux séries au plus ; toutes les corrections relevées se font).

# Critique Impeccable : ajouter un bloc, ouvrir un bloc, série 1 (23 octobre 2026)

Cible : le back office de Hopla, deux parcours. Ajouter un bloc (le choix du type, le bloc neuf posé sur la page avec sa feuille dessous au téléphone, sa rangée dépliée au bureau) et ouvrir un bloc déjà posé (sa feuille, les lignes Quand, Pour qui, Apparence, Plus de réglages). Après la revue pilote-design-produit du jour (bloc neuf posé sur la page, sous-titre et montants sur la première page, ligne Apparence).

## Note de santé (Nielsen)

| # | Heuristique | Note | Point clé |
|---|---|---|---|
| 1 | Visibilité de l'état | 3 | Un bloc que son créneau retire en ce moment restait normal sur la page éditée |
| 2 | Correspondance avec le réel | 3 | « Pour qui » sans « venus de » se lisait « publier sur Instagram » ; « Ajouter à ma page » pour trois choses |
| 3 | Contrôle et liberté | 2 | Sur un bloc neuf, la flèche et le retour du téléphone effaçaient tout sans Annuler ; au bureau, rien de visible pour replier après l'ajout |
| 4 | Cohérence | 2 | Deux dessins de ligne ; « Plus de réglages » hors de son groupe ; deux créneaux par défaut (interface et serveur) |
| 5 | Prévention des erreurs | 2 | Un jour touché posait « Affiché seulement, lundi de 9 h à 12 h » |
| 6 | Reconnaissance | 3 | Résumé de Quand sans « seulement », menu de la vignette sans la source en place |
| 7 | Flexibilité | 3 | Pas de filtre au clavier dans les 12 types, pas de bouton Coller au téléphone |
| 8 | Esthétique et minimalisme | 3 | Sous-titre toujours ouvert, aides dans Accès réservé, astuce de la fenêtre du bureau |
| 9 | Récupération | 4 | Erreurs sous le champ, Annuler sur chaque ajout, modification ou retrait |
| 10 | Aide | 3 | Manque là où le sens ne se devine pas (Pour qui), déborde dans Accès réservé |
| **Total** | | **28/40** | Bon, en bas de la fourchette |

## Problèmes prioritaires

- **P1** Flèche et retour du téléphone d'un bloc neuf : effaçaient ce qui était tapé, alors que la croix l'ajoute. Corrigé : la flèche disparaît dès qu'on a tapé, le retour fait comme la croix.
- **P1** Quand : un jour touché retirait le bloc presque toute la semaine, sans que la page éditée le montre. Corrigé : créneau par défaut du serveur (du lundi au vendredi, 9 h à 18 h, en avant), résumé « seulement », bloc grisé sur la page et « programmé » dans le titre quand son créneau le retire (`horsCreneauOuDates`).
- **P2** Deux dessins de ligne, « Plus de réglages » hors de son groupe, replis sans hiérarchie au bureau. Corrigé : lignes harmonisées, groupe à part, replis en cadre.
- **P2** Sous-titre toujours ouvert. Corrigé : replié derrière « Ajouter un sous-titre » tant qu'il est vide.
- **P2** « Pour qui » ne disait pas de qui il s'agit. Corrigé : en-tête « Venus de », résumés « Seulement venus de… », « Sauf venus de… ».

Observations mineures, toutes corrigées : titre « Ajouter un bloc » pour la liste ; astuce et aides retirées ; source en place cochée dans le menu de la vignette ; grille d'icônes sans boîte qui défile ; textes d'exemple des quatre montants ; titre de la feuille au nom du bloc ; nom du site en texte d'exemple pendant la lecture ; focus rendu à la rangée après l'ajout au bureau, en-tête de rangée collé ; dates vides avec un chevron ; bouton Coller au téléphone ; frappe pour filtrer et menu ancré sous « Ajouter un bloc » au bureau, à la place de la fenêtre centrée.

Gardés tels quels, par décision : la feuille garde sa hauteur maximale (Lilian, 22 octobre) ; pas de « Terminé » au bureau (l'en-tête collé règle le repli) ; Lien partenaire reste un type et un interrupteur ; le crayon de la vignette (demande de Lilian). Hors champ, proposé à part : garder un bloc neuf commencé après un rechargement.

## Détecteur (B)

`impeccable detect --json` sur EditeurBloc, MaPage, ReglesBloc, OngletLiens, Admin : code 0, un seul avis hors parcours (Admin.tsx, `max-[359px]:text-[10.5px]` sous le pas `caption` de DESIGN.md). Superposition au navigateur sur cinq vues (trois au téléphone, deux au bureau) : rien dans les feuilles ni dans les rangées dépliées ; les autres constats viennent du thème de la page publique en aperçu ou de l'en-tête de la page.
