---
target: accueil hopla.page
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/home/claude/linkinbio/src/routes/index.tsx"
target_fingerprint: "sha256:2b9fe8e036acfa1f23aa68640862134e59e6047d1fa153b6d87310f68f7a9cbb"
target_path: /home/claude/linkinbio/src/routes/index.tsx
timestamp: 2026-10-20T12-18-37Z
slug: src-routes-index-tsx
---
# Critique Impeccable de l'accueil hopla.page (20 octobre 2026, troisième passage)

Méthode : deux revues indépendantes en parallèle (A : revue de design ; B : détecteur et navigateur), puis synthèse.

## Note de santé : 30/40 (bon), contre 29/40 au deuxième passage et 28/40 au premier

| # | Heuristique | Note | Point clé |
|---|---|---|---|
| 1 | État du système | 3 | Verdict libre ou pris en direct, téléphone qui reprend le nom, envoi annoncé. Mais le focus tombe sur la page après l'envoi, la démo « Dans l'app » démarre au téléphone avant que son onglet soit à l'écran, et « ab » donne un aperçu qui semble valable. |
| 2 | Langage du monde réel | 3 | Français simple et concret. « Créer ma hopla » emploie la marque comme nom commun sans l'avoir définie ; « drops » n'est pas expliqué ; l'e-mail dit « lundi 9:00 » quand le texte dit « 9 h ». |
| 3 | Contrôle et liberté | 3 | Changer de nom, corriger l'adresse, Annuler, Revoir, Échap. Mais un inscrit qui revient retape son nom et lit « déjà pris », sans issue ; l'état « envoyé » ne survit pas à un rechargement. |
| 4 | Cohérence | 3 | Deux formes pour le même formulaire (haut et bas), un message noir qui ressemble à un bouton, une bascule mois ou an qui ne répond pas aux flèches. |
| 5 | Prévention des erreurs | 3 | Normalisation, vérification pendant la frappe, faute de domaine signalée. Une saisie en alphabet non latin est vidée sans un mot ; « ab » n'est refusé qu'à l'envoi. |
| 6 | Reconnaître plutôt que se souvenir | 3 | Le préfixe hopla.page/ et le nom redit à l'étape e-mail. Le message d'envoi ne redit pas l'adresse réservée ; le thème de l'aperçu des couleurs n'est pas nommé. |
| 7 | Souplesse | 3 | Entrée pour avancer, suggestions en un toucher, bouton de barre vers le champ le plus proche. Aucun raccourci « c'est le mien » ; 12 000 px à traverser au téléphone. |
| 8 | Esthétique et sobriété | 3 | Noir et blanc tenu. « Vivante » occupe 1 900 px pour trois paragraphes, un vide de 170 px sous le chapô de « Prise », et « Autour » répète la liste de l'offre gratuite. |
| 9 | Sortir des erreurs | 3 | Le cas « déjà pris » est exemplaire. « Choisis le nom de ta page » n'explique rien après une saisie non latine ; l'inscrit qui revient n'a que des noms de remplacement. |
| 10 | Aide | 3 | Neuf réponses, rassurance au bon moment. Le lien « Confidentialité » ne se voit pas comme un lien ; le renvoi parle de 15 minutes sans contexte. |

## Spécificité

Le premier écran est propre à Hopla : on tape son nom, le téléphone devient sa page, un nom pris grise la page et barre l'adresse. La démo Sans et Avec Hopla montre un problème propre aux pages de liens, et la couleur réservée aux vrais thèmes fait du produit la seule chose en couleur. Le milieu et la fin suivent encore le gabarit du genre : une grille de fonctions, deux cartes de prix, une FAQ, et la seule vraie page (hopla.page/lilian) arrive en dernier lien gris.

Détecteur : le scan du code est propre (0). Dans le navigateur, 57 signalements au bureau et 41 au téléphone, presque tous dans les vraies pages de thème des téléphones (faux positifs). Sur l'interface de l'accueil : bordure fine et grande ombre sur le cadre des téléphones (voulu, c'est un appareil), et une légende de « Prise » qui s'annonçait aux lecteurs d'écran sans action (corrigé). Aucun débordement, aucun contraste sous le seuil, aucune erreur de console, aucun contrôle sans nom ; cinq onglets ou liens faisaient 33 à 41 px de large (corrigé).

## Ce qui marche

1. Le champ qui pilote le téléphone : l'appel est la démonstration.
2. La couleur réservée au produit, vingt thèmes en vrais rendus dans un cadre noir et blanc.
3. Une parole honnête : « Chiffres d'exemple », faute de domaine signalée une fois, correction d'adresse qui dit ce que devient l'ancien lien.

## Problèmes prioritaires

- **[P1] L'inscrit qui revient lit « déjà pris » sur son propre nom.** Ajouter « C'est le tien ? Connecte-toi » au verdict et garder l'état envoyé au rechargement. Commandes : harden, clarify.
- **[P2] L'après-envoi est le moment le plus plat, et le focus se perd.** Focus sur le message, adresse réservée redite en tête, téléphone qui passe « en ligne ». Commandes : delight, harden.
- **[P2] Au téléphone, les démos démarrent avant leur légende.** Onglets et légende au-dessus du téléphone ; aperçu des couleurs au-dessus des pastilles. Commande : adapt.
- **[P2] Page longue, milieu générique, preuve enterrée.** Retirer « Autour » (ses fonctions sont dans l'offre gratuite), raccourcir « Vivante », lien « Voir une vraie page » sous le champ du héros. Commandes : distill, layout.
- **[P3] Erreurs du nom incohérentes.** « ab » et l'alphabet non latin : message, champ marqué invalide, aperçu seulement à partir de 3 caractères. Commande : harden.

## Personas

- **Jordan (première fois)** : « une hopla » n'est défini nulle part ; au téléphone, la démo « Sans » se lit comme le produit.
- **Riley (teste les limites)** : « ab » promis puis refusé, « 日本語 » vidé en silence, son nom « déjà pris » après un rechargement.
- **Casey (téléphone, interrompue)** : revient et lit « déjà pris » ; liens dans les messages hauts de 22 px.
- **Sam (clavier, lecteur d'écran)** : focus perdu après l'envoi, bascule des prix sans flèches, « Confidentialité » sans soulignement.

## Détails

Le message noir « Ton visiteur est reparti » ressemble à un bouton ; « Jeanne Céramique » perd son accent dans le téléphone ; « Par mois » et « Par an » passent à la ligne à 320 px ; les titres des pages intégrées gonflent le plan de la page.
