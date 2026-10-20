---
target: accueil hopla.page
total_score: 31
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/home/claude/linkinbio/src/routes/index.tsx"
target_fingerprint: "sha256:2b9fe8e036acfa1f23aa68640862134e59e6047d1fa153b6d87310f68f7a9cbb"
target_path: /home/claude/linkinbio/src/routes/index.tsx
timestamp: 2026-10-20T13-06-20Z
slug: src-routes-index-tsx
closed: true
---
# Critique Impeccable de l'accueil hopla.page (20 octobre 2026, quatrième passage)

Method: dual-agent (A : revue de design isolée, sans détecteur ni critique précédente ; B : détecteur CLI, overlay dans le navigateur et contrôles scriptés), puis synthèse.

## Note de santé : 31/40 (bon), contre 30/40 au troisième passage

| # | Heuristique | Note | Point clé |
|---|---|---|---|
| 1 | État du système | 3 | Le téléphone prend le nom tapé, le verdict s'affiche sous le champ, la carte d'envoi prend le focus. Rien ne s'affiche pendant la vérification du nom ; au téléphone, l'onglet de famille choisi peut sortir de la bande. |
| 2 | Langage du monde réel | 3 | Tutoiement simple. Accrocs : « adresse » pour l'URL et pour l'e-mail, une famille « Premium » sur une page gratuite, « en une phrase » au-dessus de cinq, « jeudi 16 octobre » qui tombe un vendredi. |
| 3 | Contrôle et liberté | 3 | « Changer de nom », « Annuler », Échap, « Revoir ». Une fois l'e-mail parti, le nom ne se change plus. |
| 4 | Cohérence | 3 | Un seul système d'onglets. La légende est au-dessus du téléphone dans deux démos et dessous dans la troisième ; deux libellés pour la page de Lilian. |
| 5 | Prévention des erreurs | 4 | Normalisation en direct, alphabet expliqué, faute de domaine signalée une fois, nom confirmé trois fois, renvoi retenu une minute. |
| 6 | Reconnaître plutôt que se souvenir | 3 | Le nom reste lisible à l'étape e-mail. Le champ e-mail n'a pas d'étiquette visible ; au téléphone, les pastilles agissent hors de l'écran. |
| 7 | Souplesse | 3 | Entrée à chaque étape, bouton de barre qui va au champ le plus proche, flèches sur la période. Démos qui enchaînent seules, prix à 7 800 px au téléphone. |
| 8 | Esthétique et sobriété | 3 | Retenue tenue. Stats en double (liste et e-mail), deux boutons noirs au premier écran mobile, milieu long. |
| 9 | Sortir des erreurs | 3 | Messages exemplaires. Aucune issue pour une faute dans le nom après l'envoi ; « Une faute dans l'adresse ? » corrige l'e-mail. |
| 10 | Aide | 3 | Neuf questions, réassurance au bon moment. Rien sur le changement de nom, aucun contact. |

## Spécificité

Spécifique, posée sur le squelette de la catégorie. Le cadre noir et blanc où seules les vraies pages portent la couleur, et le téléphone qui prend le nom du visiteur, n'appartiennent qu'à Hopla. Seule zone générique : les téléphones en croquis gris de « Vivante ».

Détecteur : le scan du code est propre (0, exit 0, vérifié par un fichier témoin). Dans le navigateur, 29 éléments au bureau et 13 au téléphone, tous dans les maquettes `.hl-tel` ou sur `body` à cause d'elles, sauf `overflow-x: clip` sur `.hl`, voulu. Aucun débordement à 320, 390 et 1440 ; aucun texte sous le seuil de contraste (le plus bas : 4,89:1) ; aucune annonce vocale sans geste ; aucune erreur de console. Une vraie faute : au téléphone, les onglets des familles de thèmes rétrécissent à 44 px et leurs libellés se touchent.

## Ce qui marche

1. Le formulaire personnalise le produit avant l'inscription, et l'état est partagé entre le haut et le bas de page, rechargement compris.
2. Le produit est la seule couleur : vrai composant de page, vingt thèmes, pastilles qui repeignent une vraie page.
3. Soin du formulaire et de l'accessibilité : erreurs précises, annonces seulement après un geste, focus sur la carte d'envoi, cibles de 44 px, mouvement réduit complet.

## Problèmes prioritaires

- **[P1] Une faute dans le nom ne se rattrape plus après l'envoi.** Rendre le nom modifiable tant que la page est vierge, dire « e-mail » dans la correction, répondre dans la FAQ. Commandes : harden, clarify.
- **[P2] Au téléphone, les onglets des familles s'écrasent.** `flex: none` sur les onglets, l'onglet choisi glisse dans la bande. Commande : adapt.
- **[P2] Au téléphone, les pastilles agissent hors de l'écran.** Rogner le téléphone des couleurs à son haut. Commande : adapt.
- **[P2] Le milieu est long et se répète.** Une seule forme pour les stats, chapitres moins hauts. Commande : distill.
- **[P3] Des mots qui contredisent la promesse.** « Premium », « en une phrase », la date, « adresse » à deux sens. Commande : clarify.

## Personas

- **Jordan (première fois)** : hésite sur le nom, croit des thèmes payants, une faute après l'envoi mène au champ e-mail.
- **Riley (teste les limites)** : « admin » propose de se connecter, la date fausse, l'expiration du lien n'est dite qu'au renvoi.
- **Casey (téléphone, une main)** : deux boutons noirs au premier écran, onglets collés, pastilles qui changent ce qu'on ne voit pas.
- **Sam (clavier et lecteur d'écran)** : focus du champ principal faible, suggestion de domaine annoncée avant la fin de la frappe.

## Détails

Bouton « Revenir aux couleurs » désactivé qui ressemble à du texte ; « Par an · −20 % » ; titre de fin qui laisse un mot seul ; barre translucide ; ancienne adresse coupée sur son tiret en correction ; « l'on » trois fois ; bouton du formulaire sur la ligne de flottaison à 320 × 640.
