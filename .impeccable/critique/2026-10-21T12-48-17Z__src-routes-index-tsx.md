---
target_identity: "file:/home/claude/linkinbio/src/routes/index.tsx"
target_fingerprint: "sha256:dc39495bbbc50058fe6e9e0f526f6fbf50181d4e100ef0319bc0f34493686443"
target_path: /home/claude/linkinbio/src/routes/index.tsx
timestamp: 2026-10-21T12-48-17Z
slug: src-routes-index-tsx
---
---
target: accueil Hopla (des visages), après la première série
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
---
# Critique Impeccable de l'accueil Hopla, après la première série (21 octobre 2026)

Method: dual-agent (A : revue design · B : détecteur et navigateur)

Vue en local à 1440 × 900, 1024 × 768, 390 × 844 et 320 × 640, avec et sans mouvement réduit.

## Note : 30/40

| # | Heuristique | Note | Point clé |
|---|---|---|---|
| 1 | État du système | 3 | Vérification du nom en direct, mais les scènes se jouent hors champ pendant un saut vers une ancre ; la période choisie dans les prix se lit mal |
| 2 | Langage du visiteur | 3 | Les pastilles Starter et Pro paraissent bien avant que les offres soient définies |
| 3 | Contrôle et liberté | 3 | Les séquences se rejouent mais ne se passent pas ; « Revoir les visiteurs » n'arrive qu'après 12 s |
| 4 | Cohérence | 2 | La fonction gratuite est dite en mots, les payantes seulement par la pastille du personnage ; flèche ↗ qui ouvre un dialogue ; Annuel avant Mensuel ; pied de page décalé |
| 5 | Prévention des erreurs | 4 | Faute de domaine corrigée d'un geste, noms pris avec des suggestions, règles annoncées |
| 6 | Reconnaître plutôt que retenir | 3 | Pastilles d'offre sans définition, dialogue sans « n sur 6 » |
| 7 | Efficacité | 3 | Champ au-dessus de la ligne de flottaison partout, mais aucune scène ne se passe |
| 8 | Esthétique et sobriété | 3 | Page longue ; moitié droite des questions vide au bureau |
| 9 | Erreurs | 3 | Sur le bleu, l'erreur « Choisis le nom de ta page. » ressemble à la note |
| 10 | Aide | 3 | Rien près des fonctions ne dit quelle offre elles demandent |

Détecteur : `detect` propre sur le TSX ; sur le CSS, Geist (marque, accepté) et une transition de hauteur dans la roue (décor). 0 débordement, 0 contraste raté, 0 cible sous 44 px à 390 et 320.

## Priorités traitées dans la deuxième série

- [P1] Dire l'offre de chaque fonction, partout dans les mêmes mots (`OffreFonction`).
- [P2] Les scènes attendent 450 ms à l'écran avant de partir (`useVu`).
- [P2] Le sélecteur de période : Mensuel d'abord, rail bordé, gain en étiquette.
- [P3] Le mur de connexion d'Instagram reste 2 s, puis la croix est touchée.

Questions skipped: l'utilisateur a demandé d'itérer sans s'arrêter jusqu'à 35/40.
