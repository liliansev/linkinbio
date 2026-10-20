---
target: src/routes/index.tsx
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/home/claude/linkinbio/src/routes/index.tsx"
target_fingerprint: "sha256:cec7175d9d4f3be6acc365379177a59cb5a9a8abbea36b73d51630febe2d22fa"
target_path: /home/claude/linkinbio/src/routes/index.tsx
timestamp: 2026-10-20T11-28-05Z
slug: src-routes-index-tsx
---
# Critique Impeccable de l'accueil hopla.page (20 octobre 2026, deuxième passage)

Méthode : deux revues indépendantes en parallèle (A : revue de design ; B : détecteur et navigateur), puis synthèse.

## Note de santé : 29/40 (bon), contre 28/40 au premier passage

| # | Heuristique | Note | Point clé |
|---|---|---|---|
| 1 | État du système | 3 | Disponibilité en direct, écho dans le téléphone, état final clair. Mais un nom tapé avec une espace finale (« lilian ») ne dit plus rien et le bouton semble mort ; en mouvement réduit, les chiffres des stats affichent 0 pendant deux secondes. |
| 2 | Langage du monde réel | 3 | Français simple et scènes concrètes. La page d'exemple du héros parle aux PME (« Parlons de votre projet ») alors que le texte parle aux créateurs. |
| 3 | Contrôle et liberté | 3 | « Changer de nom », suggestions, « Revoir ». Après l'envoi, impossible de corriger une adresse mal tapée ; les boutons des prix remontent de 8 000 px. |
| 4 | Cohérence | 3 | Un seul système d'onglets et de mouvement, mais deux barres d'onglets identiques empilées au téléphone, une icône de tendance qui se lit comme une image, un faux bouton dans l'e-mail. |
| 5 | Prévention des erreurs | 3 | Normalisation du nom, faute de domaine signalée une fois. Un séparateur final contourne la vérification. |
| 6 | Reconnaître plutôt que se souvenir | 3 | Le préfixe hopla.page/ apprend le format. Au téléphone, pas de menu : prix et questions se trouvent en défilant. |
| 7 | Souplesse | 2 | Bouton de barre, Entrée, suggestions en un clic. Pas de navigation au téléphone sur 12 700 px. |
| 8 | Esthétique et sobriété | 3 | Noir et blanc tenu, typographie forte. Une seule forme de section répétée neuf fois ; la grille « Autour » est du remplissage. |
| 9 | Sortir des erreurs | 3 | Messages précis avec la solution. Échec muet sur le séparateur, pas de retour sur une adresse fausse. |
| 10 | Aide | 3 | Neuf réponses utiles. Rien sur un visiteur dont la source est inconnue (WhatsApp, Safari). |

## Spécificité

Le cadre noir et blanc où seules les vraies pages Hopla portent la couleur est propre à Hopla, et le geste signature marche : on tape son nom, le téléphone devient sa page. Mais l'ouverture ne prouve pas sa promesse : le titre dit « s'adapte à chaque visiteur » et le téléphone fait défiler des thèmes, ce que tout concurrent montre. Le milieu de page (grille de cartes, prix, FAQ) suit le gabarit du genre.

Détecteur : le scan du code est propre (0). Dans le navigateur, 65 signalements au bureau et 48 au téléphone, presque tous dans les vraies pages de thème affichées par les téléphones (faux positifs). Restent dans la page elle-même : la légende du héros, posée dans l'ombre du téléphone, autour de 4,3:1 ; 23 cibles tactiles sous 44 px au téléphone ; la grille du fond du héros, un motif courant ; ombre large sur bordure fine pour le champ et l'e-mail ; onglets des familles de thèmes cachés hors écran à 320 et 390 px.

## Ce qui marche

1. L'appel est la démo : un état d'inscription partagé, la disponibilité en direct, la faute de domaine signalée sans jamais corriger tout seul, le renvoi au bout d'une minute.
2. Le cadre noir et blanc sert le produit : les seules couleurs sont de vraies pages, et « Tes couleurs » recolore vraiment celle de Marie.
3. Un soin réel : exemples étiquetés honnêtement, typographie française juste, lien d'évitement, états d'erreur annoncés, mouvement réduit respecté presque partout.

## Problèmes prioritaires

- **[P1] Le bouton principal ne fait rien pour un nom pris tapé avec une espace finale.** La vérification compare « lilian- » à « lilian ». Corriger la comparaison, afficher le verdict à l'envoi, retirer le tiret final en quittant le champ. Commande : harden.
- **[P2] L'ouverture montre ce que tout concurrent montre, sur un exemple hors cible.** Une page de créatrice au centre, et une tournée de visiteurs (arrivé d'Instagram, de TikTok, de YouTube) qui réordonne les liens à la place de la tournée des thèmes. Commandes : clarify, animate.
- **[P2] Au téléphone, le contenu avance plus vite qu'on ne lit, et les commandes sont loin de ce qu'elles changent.** Enchaînements trop rapides, bascule mois/an loin du prix, pas de menu. Commande : adapt.
- **[P2] Le milieu ressemble à un gabarit et la page est longue.** Ramasser « Autour » en une liste dense, resserrer les chapitres de « Vivante ». Commandes : distill, layout.
- **[P2] Pas de retour après l'envoi.** Corriger l'adresse tant que la page n'a pas été ouverte ; les boutons des prix vont au champ le plus proche. Commande : harden.

## Personas

- **Jordan (première fois)** : la page d'exemple parle à des clients de PME ; une adresse fausse après l'envoi, sans issue.
- **Riley (teste les limites)** : « lilian » + espace donne un bouton mort ; les stats à 0 en mouvement réduit.
- **Casey (téléphone, une main)** : pas de menu, petites cibles (« Revoir », « Connexion », pied de page), démos qui avancent pendant la lecture.
- **Sam (lecteur d'écran)** : la légende du héros annonce cinq thèmes en treize secondes sans action de sa part ; pastilles de couleur nommées par leur code hexadécimal.

## Détails

Le titre du héros saute de 26 px quand la note change de hauteur ; la note flotte sous le champ ; « 412 vues, 18 % » se lit d'un bloc ; la démo des langues finit sur un seul mot ; le filet du pied de page déborde de la colonne ; l'« app YouTube » n'est reconnaissable qu'avec sa légende.
