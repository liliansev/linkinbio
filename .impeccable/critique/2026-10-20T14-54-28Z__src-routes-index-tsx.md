---
target: accueil hopla.page
total_score: 33
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/home/claude/linkinbio/src/routes/index.tsx"
target_fingerprint: "sha256:a383754f350de5bbf4ee70d726514489e8d0e118b79bf3ad59e5ebd82c820c77"
target_path: /home/claude/linkinbio/src/routes/index.tsx
timestamp: 2026-10-20T14-54-28Z
slug: src-routes-index-tsx
---
# Critique Impeccable de l'accueil hopla.page (20 octobre 2026, sixième passage)

Method: dual-agent (A : revue de design isolée, sans détecteur ni critique précédente ; B : détecteur CLI, overlay dans le navigateur et contrôles scriptés), puis synthèse.

## Note de santé : 33/40 (bon), contre 30/40 au cinquième passage

| # | Heuristique | Note | Point clé |
|---|---|---|---|
| 1 | État du système | 3 | Nom vérifié en direct, téléphone qui affiche l'adresse, carte d'envoi explicite, état gardé au rechargement. Chaque état annoncé deux fois aux lecteurs d'écran (deux régions vivantes). |
| 2 | Langage du monde réel | 3 | Français parlé, stats en phrases. Le renvoi parle de « back office », le nom affiché perd ses accents, une céramiste avec « Dernier épisode ». |
| 3 | Contrôle et liberté | 3 | Changer de nom, corriger l'e-mail pendant 29 minutes, Annuler, Échap. Les démos Sans / Avec et Créer / Modifier basculent seules. |
| 4 | Cohérence | 3 | Un seul appel, un formulaire partagé, icônes bien séparées. « 7 jours » puis « 15 minutes », quatre « Revoir » au même nom. |
| 5 | Prévention des erreurs | 4 | Normalisation à la frappe, coupure à 30 caractères dite, alphabet expliqué, faute de domaine signalée une fois. |
| 6 | Reconnaître plutôt que se souvenir | 4 | Nom rappelé à l'étape e-mail, adresse et e-mail rappelés dans la carte, équivalent mensuel du prix annuel. |
| 7 | Souplesse | 3 | Entrée à chaque étape, bouton de barre qui focalise le champ. La personnalisation s'arrête au héros. |
| 8 | Esthétique et sobriété | 3 | Noir et blanc tenu. Page longue, et la tournée du héros redite par « Selon le réseau ». |
| 9 | Sortir des erreurs | 4 | Messages humains et réparables. Seul trou : un nom en emojis vidé sans un mot. |
| 10 | Aide | 3 | Neuf questions, réassurance sous le champ e-mail. « Questions » absent de la barre du bureau. |

## Détecteur (B)

Scan du code propre (0 constat, exit 0, aussi avec `--no-config`). Dans le navigateur, 29 éléments au bureau et 14 au téléphone, tous dans les maquettes `.hl-tel` sauf deux : le recadrage voulu de `.hl` (sans perte de contenu) et une vraie alerte `layout-transition` sur le bouton de la barre (largeur, marge et bordure animées). Aucun débordement horizontal, aucun contraste insuffisant (le plus bas : 4,54:1), console vide, aucun contrôle sans nom, aucune annonce sans geste.

## Problèmes prioritaires (corrigés à la septième passe, la dernière avant publication)

- **[P1] Chaque état annoncé deux fois.** Seul le formulaire dont on se sert parle désormais aux lecteurs d'écran ; l'autre affiche le même état en silence.
- **[P2] Le renvoi rétrécit la promesse.** Une page pas encore ouverte reçoit de nouveau son e-mail de bienvenue, valable 7 jours ; la carte dit « Le premier marche toujours ». Une page déjà ouverte reçoit un lien de connexion, dit de 15 minutes. Test serveur ajouté.
- **[P2] Au téléphone, la rangée « Boutons » ne montrait presque rien.** L'aperçu laisse voir les deux premiers boutons.
- **[P2] La page se répète.** Le chapitre « Selon le réseau » est retiré : la tournée du héros le montre déjà. Il reste « Selon l'heure » et « Des drops », avec des liens de céramiste.
- **[P3] Le nom affiché perdait ses accents.** Le téléphone montre le nom tel qu'on l'a tapé (« Zoé Martin »).
- **Détecteur.** Le bouton de la barre ne s'anime plus en largeur : il est posé au bord, et Connexion glisse à sa place par une translation.
- **Détails.** Un nom en emojis est expliqué, « e‑mail » ne se coupe plus, chaque « Revoir » dit ce qu'il rejoue, « Questions » rejoint la barre du bureau, la marque garde sa majuscule dans le nom du téléphone du héros.

## Restés en l'état

Bascule automatique des démos Sans / Avec et Créer / Modifier (le soulignement en barre de progression prévient) ; compte à rebours des drops qui avance quand on le lit ; personnalisation limitée au héros ; preuve humaine limitée à « Voir une vraie page » ; cartes de prix non alignées au bureau.
