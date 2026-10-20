---
target: accueil hopla.page
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/home/claude/linkinbio/src/routes/index.tsx"
target_fingerprint: "sha256:2a618713373a12ffbae509666619f145f231180236931c4bf636b9c6e10783d1"
target_path: /home/claude/linkinbio/src/routes/index.tsx
timestamp: 2026-10-20T10-38-45Z
slug: src-routes-index-tsx
---
# Critique Impeccable de l'accueil hopla.page (20 octobre 2026, avant corrections)

Méthode : deux revues indépendantes (A : revue de design ; B : détecteur et navigateur), puis synthèse.

## Note de santé : 28/40 (bon, bas de fourchette)

| # | Heuristique | Note | Point clé |
|---|---|---|---|
| 1 | État du système | 3 | La vérification du nom est excellente, mais le téléphone qui devient ta page est sous la ligne de flottaison (y≈690 au bureau, sous le clavier au téléphone). |
| 2 | Langage du monde réel | 3 | « Créer ma hopla » arrive avant que la page n'explique le mot ; le téléphone par défaut montre une page B2B. |
| 3 | Contrôle et liberté | 3 | « Changer de nom » et les onglets rejoués sont bons ; après l'envoi, ni « Renvoyer » ni « Changer d'adresse ». |
| 4 | Cohérence | 3 | Trois façons de rejouer (onglet, « Revoir », survol) ; la note rassurante n'est que sur le premier formulaire. |
| 5 | Prévention des erreurs | 2 | Une adresse mal tapée mais valide garde le nom pour toujours ; un nom pris n'a pas de style d'erreur et le téléphone le montre comme le tien. |
| 6 | Reconnaître plutôt que se souvenir | 3 | Au téléphone, les onglets et légendes de démo sortent de l'écran pendant que la scène joue. |
| 7 | Souplesse | 3 | Le bouton de la barre ramène au champ, Entrée envoie, les attributs de saisie sont posés. |
| 8 | Esthétique et sobriété | 2 | Onze sections (≈19 écrans au téléphone), stats racontées trois fois, téléphones croquis à moitié vides. |
| 9 | Sortir des erreurs | 3 | Un nom pris propose deux suggestions, mais « déjà pris » a la même allure que « libre ». |
| 10 | Aide | 3 | La FAQ est bonne ; « pas de mot de passe, un lien par e-mail » n'est dit qu'en FAQ. |

## Spécificité

Spécifique dans ce qu'elle montre (le téléphone qui devient ta page, Sans/Avec Hopla, la page qui se réorganise, les thèmes réels), générique dans son cadre (héros centré sur grille, grille de six cartes, deux prix, FAQ, bande finale). La couleur des thèmes, vraie différence de Hopla, disparaît entre le héros et la section Thèmes.

Détecteur : le scan du code est propre (0). Dans le navigateur, les vrais points sont tous dans `accueil.css` : texte d'exemple du champ à 2,5:1, réponses de FAQ trop larges au bureau (88 à 93 caractères), ombres larges sur bordure fine (champ, carte e-mail). Le reste vise les thèmes publics dans les téléphones (faux positifs).

## Ce qui marche

1. Un héros mené par le produit : la vraie page publique prend ton nom pendant que tu tapes.
2. Des démos qui racontent une histoire (le clic perdu dans Instagram) plutôt qu'une liste de fonctions.
3. Une discipline nette : noir et blanc, couleur dans les thèmes seulement, pas de pilule, focus visible, aucun débordement.

## Problèmes prioritaires

- **[P1] La personnalisation se joue hors champ.** Passer le héros en deux colonnes au bureau (texte à gauche, téléphones à droite) ; au téléphone, un aperçu compact sous le champ. Commandes : layout, onboard.
- **[P1] La réassurance disparaît au moment de l'e-mail, et une faute de frappe brûle le nom.** Note permanente, « pas de mot de passe ni de carte » à l'étape e-mail, même note sur le formulaire final, « Renvoyer » et « Changer d'adresse » après l'envoi, suggestion de domaine. Commandes : clarify, harden.
- **[P1] Au téléphone, des démos jouent hors écran ou sans leur légende.** Déclencher sur le téléphone lui-même ; légende Sans/Avec sous le téléphone. Commande : adapt.
- **[P2] Longueur et répétitions.** Retirer le graphique en barres, fondre la carte stats, réunir Arrivée et Toucher, ancrer « Fonctions » sur Sans/Avec, couper les téléphones croquis. Commandes : distill, colorize.
- **[P2] Lisibilité.** États inactifs trop pâles (≈1,5 à 3:1), préfixe « hopla.page/ » à 3,5:1, ponctuation française sans espace insécable (« ? » orphelin). Commandes : typeset, audit.

## Personas

- **Jordan (première fois)** : « Créer ma hopla » avant de savoir ce qu'est une hopla ; rate la personnalisation ; la note « Gratuit » disparaît à l'étape e-mail.
- **Riley (teste les limites)** : adresse mal tapée, compte fantôme ; nom pris fêté comme le sien ; pastilles de couleur qui débordent à 320 px ; flèches du carrousel sans état désactivé ; compte à rebours qui tourne sans fin.
- **Casey (téléphone, une main)** : suggestions et « Changer de nom » en petits liens ; pastilles de 34 px ; légendes de démo hors de portée.

## Détails

Logo vide dans la carte e-mail, carrousel coupé au lieu de déborder jusqu'au bord, alignement mixte de la fin, « Plus de mention » ambigu, « -20 % » sans vrai signe moins, picto de main qui salue pour « maintenir », « touche le téléphone » sur un ordinateur, « Avis et preuves » écrit pour un freelance.
