---
target: accueil Hopla (des visages)
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/home/claude/linkinbio/src/routes/index.tsx"
target_fingerprint: "sha256:dc39495bbbc50058fe6e9e0f526f6fbf50181d4e100ef0319bc0f34493686443"
target_path: /home/claude/linkinbio/src/routes/index.tsx
timestamp: 2026-10-21T11-51-02Z
slug: src-routes-index-tsx
---
# Critique Impeccable de l'accueil Hopla, 21 octobre 2026

Method: dual-agent (A : revue design · B : détecteur et navigateur)

Cible : `src/routes/index.tsx` (composants `src/accueil/`), version « des visages » en ligne depuis la PR #35. Vue en local à 1440 × 900, 1024, 390 × 844 et 320, avec et sans mouvement réduit.

## Note de départ : 30/40 (bonne, bande 28 à 35)

| # | Heuristique | Note | Point clé |
|---|---|---|---|
| 1 | État du système | 3 | La vérification du nom est excellente, mais le nom tapé ne se retrouve nulle part ailleurs, et au téléphone les scènes partent à peine visibles : on arrive souvent sur la fin |
| 2 | Langage du visiteur | 3 | « Analytics » contre « stats », « Youtube » et « Linkedin » sur les cartes, « la page de Inès », « 18:00 » affiché et « 18 h » annoncé |
| 3 | Contrôle et liberté | 3 | « Changer de nom » disparaît pendant une erreur d'e-mail ; l'aperçu d'un profil ne mène nulle part |
| 4 | Cohérence | 2 | Bouton noir dans la barre et citron dans le hero ; Hugo est Starter puis Pro, Inès Gratuit puis Starter ; une pastille choisie ressemble à une pastille qui a le focus |
| 5 | Prévention des erreurs | 3 | Le champ du nom prévient tout ; le choix d'une offre payante se perd jusqu'aux réglages |
| 6 | Reconnaître plutôt que retenir | 3 | La roue repose sur des libellés de 8 px tronqués, et ses premières lignes ont toutes la même couleur au repos |
| 7 | Efficacité | 3 | « Voir une vraie page » n'arrive qu'à la toute fin ; les questions ne sont pas dans la barre |
| 8 | Esthétique et sobriété | 3 | Palette et typographie fortes, mais du texte porteur de sens entre 6 et 12 px et cinq démonstrations de suite sur la même mise en page |
| 9 | Récupération des erreurs | 4 | Messages précis et constructifs : suggestions de noms, faute de domaine, nom trop long, serveur absent |
| 10 | Aide | 3 | Neuf réponses honnêtes, mais la règle du nom libéré au bout d'un mois n'apparaît qu'en FAQ |

## Spécificité

Le cœur est propre à Hopla : un vrai champ `hopla.page/` en guise de bouton, des aperçus rendus par le vrai composant de page, la roue des réseaux, la comparaison Sans et Avec Hopla, un e-mail du lundi dont les chiffres suivent le dashboard. Le cadre l'est moins : collage de cartes inclinées, galerie de portraits, trois offres et FAQ. Le plus grand manque est au premier écran : le titre promet « Et s'adapte à chaque visiteur », mais rien ne s'y adapte, ni au réseau, ni au nom que l'on tape.

Détecteur : 0 constat dans le code (`impeccable detect`). Dans le navigateur, une soixantaine de signalements, presque tous des faux positifs dans les maquettes inertes (thèmes, téléphones, roue) ; restent vrais le texte minuscule des cartes du hero et de la ligne du bas (11 px, 9 px au téléphone), la transition de hauteur de la roue, et « Trouve l'inspiration » à 43 px de haut au téléphone. Aucun débordement, aucune erreur de console, aucun contraste en échec, aucun tiret cadratin, aucune capitale.

## Ce qui marche

1. Le champ du nom est le premier geste du produit, à toutes les largeurs, avec une validation exemplaire.
2. Les preuves viennent du produit lui-même et restent honnêtes (vrais thèmes, « chiffres d'exemple »).
3. Une base solide : contrastes, focus, Échap partout, mouvement réduit qui montre l'état final.

## Problèmes prioritaires

- **[P1] Le premier écran promet l'adaptation sans la montrer, et ignore le nom tapé.** Correction : la carte de Camille change son premier lien selon le réseau, une fois, à l'arrivée ; « Et bientôt, toi » devient l'adresse tapée quand elle est libre ; la composition ne saute plus pendant la frappe. (animate)
- **[P2] Signaux d'offre incohérents.** Une offre par personnage, partout ; un badge Starter sur « Tes couleurs ». (clarify)
- **[P2] L'aperçu d'un profil déborde sur les petits téléphones et ne mène nulle part.** Correction : un téléphone à la largeur du dialogue, un appel « Créer ma page » et le profil suivant. (adapt)
- **[P2] Le sens repose sur du texte de 6 à 12 px.** Correction : 13 px au moins pour tout ce qui porte du sens, la couleur du réseau gardée au repos dans la roue. (typeset)
- **[P2] Libellés et couleurs du bouton d'appel qui varient.** Correction : la même couleur de bouton dans la barre et dans le hero. Les libellés « Réserver mon nom » et « Créer mon compte » sont des choix de Lilian : gardés. (clarify)
- **[P3] Cinq démonstrations de suite avant les prix.** Correction : la preuve « Voir une vraie page » remonte, les questions entrent dans la barre, les scènes du téléphone attendent d'être bien à l'écran. (distill)

## Personas

- **Jordan (première fois)** ne voit rien s'adapter avant la roue, lit « Analytics » et « drops » sans explication, et ne trouve la preuve d'une vraie page qu'à la fin.
- **Riley (testeur)** fait déborder l'aperçu d'un profil à 320 et 375 px, voit Hugo changer d'offre, et perd « Changer de nom » sur une adresse invalide.
- **Casey (téléphone, pressé)** voit les scènes finir avant d'arriver dessus et lit du 9 px sous le hero.

Questions skipped : Lilian a déjà fixé le périmètre (corriger avec les passes utiles jusqu'à 35/40, puis publier).
