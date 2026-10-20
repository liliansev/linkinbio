---
target: accueil hopla.page
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
target_identity: "file:/home/claude/linkinbio/src/routes/index.tsx"
target_fingerprint: "sha256:6a598627285d29bd56142c3f3980cfea87e58d1b729e4b8a98f819fa238141c9"
target_path: /home/claude/linkinbio/src/routes/index.tsx
timestamp: 2026-10-20T14-11-44Z
slug: src-routes-index-tsx
---
# Critique Impeccable de l'accueil hopla.page (20 octobre 2026, cinquième passage)

Method: dual-agent (A : revue de design isolée, sans détecteur ni critique précédente ; B : détecteur CLI, overlay dans le navigateur et contrôles scriptés), puis synthèse.

## Note de santé : 30/40 (bon), contre 31/40 au quatrième passage

Le relecteur A est neuf à chaque passage : il ne voit pas les notes d'avant, et un regard neuf trouve d'autres trous. La note baisse d'un point parce qu'il a creusé le champ du nom (ce qu'on y colle) et la vie de la page après l'envoi.

| # | Heuristique | Note | Point clé |
|---|---|---|---|
| 1 | État du système | 3 | Nom vérifié en direct, téléphone qui devient la page, adresse barrée ou cochée. Le reste de la page ne change pas après l'envoi, et les délais (30 minutes pour corriger, durée du lien) ne sont jamais dits. |
| 2 | Langage du monde réel | 3 | Français parlé, scènes reconnaissables. Une poignée de main pour « Maintenir pour déplacer », « Avis, vidéos sur la page, QR code et cinq langues » obscur. |
| 3 | Contrôle et liberté | 3 | « Annuler » sur la correction et le changement de nom, « Revoir », Échap. Les liens de correction restent proposés après la fenêtre de 30 minutes, puis échouent. |
| 4 | Cohérence | 3 | Un seul appel partout. Le même libellé pour vérifier le nom et envoyer l'e-mail, « Voir mes stats » qui a l'air d'un lien, « Connecte-toi » non souligné. |
| 5 | Prévention des erreurs | 3 | Normalisation en direct, faute de domaine, alphabet, noms réservés. Le trou : une adresse collée devient un nom absurde, coupé sans un mot et déclaré libre. |
| 6 | Reconnaître plutôt que se souvenir | 3 | Préfixe dans le champ, nom rappelé à l'étape e-mail. Au téléphone, ces rappels passent sous le clavier. |
| 7 | Souplesse | 2 | Entrée à chaque étape, boutons qui mènent au champ le plus proche. Un seul chemin, et le raccourci naturel (coller son adresse) casse. |
| 8 | Esthétique et sobriété | 3 | Coquille noir et blanc rigoureuse. Neuf sections, et cinq démonstrations qui empilent leurs commandes (familles, flèches, 12 pastilles, « Revoir »). |
| 9 | Sortir des erreurs | 4 | Messages précis et réparables, saisie gardée, conséquence dite avant de corriger. Seule impasse : passé 30 minutes, « Écris-nous ». |
| 10 | Aide | 3 | Aide au bon moment, neuf questions. Rien sur ce qui suit le clic dans l'e-mail, ni sur la durée du lien. |

## Spécificité

Écrite pour Hopla dans ce qu'elle montre, générique dans sa charpente. Chaque démonstration est le mécanisme du produit (le champ relié au téléphone, Sans / Avec Hopla, l'e-mail du lundi, vingt thèmes rendus par le vrai composant). La charpente reste celle d'une landing SaaS : héros scindé, cinq sections au même gabarit, prix en deux colonnes, FAQ en accordéon.

Détecteur (B) : le scan du code est propre (0, exit 0, vérifié par un fichier témoin et par `--no-config`). Dans le navigateur, 29 éléments au bureau et 14 au téléphone, tous dans les maquettes `.hl-tel` ou sur `body` à cause d'elles, sauf `overflow-x: clip` sur `.hl` et sur `.hl-couleurs-tel`, voulus et sans perte de contenu. Aucun débordement horizontal, aucune erreur de console, aucun contraste insuffisant, aucun contrôle sans nom.

## Ce qui marche

1. Le formulaire est la démonstration : taper son nom fait du téléphone sa page, un nom pris barre l'adresse, l'envoi la coche.
2. Une récupération d'erreurs exemplaire : variantes, « C'est le tien ? Connecte-toi. », faute de domaine corrigée d'un toucher, conséquence dite avant de corriger, carte d'envoi qui survit au rechargement.
3. Des démonstrations qui sont le produit, chaque mouvement joué une fois, et un état final d'emblée en mouvement réduit.

## Problèmes prioritaires (tous corrigés à la sixième passe, commit f4f8e86)

- **[P2] Une adresse collée devient un faux nom.** Le nom se lit maintenant dans l'adresse, le lien ou l'e-mail collé ; un nom de plus de 30 caractères est coupé et on le dit ; le préfixe passe à l'encre. Commande : harden.
- **[P2] Après l'envoi, la page ignore la réussite.** La fin dit « Ton lien t'attend dans ta boîte. », la barre et les prix cachent leur bouton, le bouton des prix donne le focus à la carte, la note commerciale disparaît pendant un changement de nom. Commande : clarify.
- **[P2] Le passage à l'e-mail se fait en silence.** Le bouton devient « Recevoir mon lien », le champ prend une enveloppe, l'aperçu passe juste sous la réponse, et au téléphone le formulaire remonte sous la barre au toucher sans bouger pendant la frappe. Commande : adapt, clarify.
- **[P2] Les délais restent invisibles.** La carte dit « Le lien marche 7 jours. » et « Jusqu'à 14 h 38, tu peux corriger ton e-mail ou changer de nom » ; passé ce délai, « Écris-nous, on la corrige pour toi ». Commande : harden.
- **[P3] Une poignée de main pour « Maintenir pour déplacer ».** Remplacée par une main qui saisit (picto `deplacer`). Commande : polish.

## Personas

- **Jordan (première fois)** : croit sa page créée au premier bouton, lit « Ton nom est peut-être encore libre » au-dessus de sa propre carte.
- **Riley (teste les limites)** : colle une adresse et obtient un nom absurde ; lit « depuis ta connexion » comme « depuis que tu t'es connecté » (devenu « depuis ce réseau »).
- **Casey (téléphone, une main)** : la réponse du champ passe sous le clavier ; les onglets des démos sortent de l'écran quand la scène joue.
- **Sam (clavier et lecteur d'écran)** : « Connecte-toi » distingué par la seule graisse, « Voir mes stats » qui ressemble à un lien sans en être un.

## Détails

Deux boutons noirs au premier écran du bureau ; « Voir une vraie page » coupé sur deux lignes ; adresses coupées sur leurs tirets dans la ligne d'état ; accents perdus dans le nom affiché ; puce YouTube à la ligne à 320 px ; familles de thèmes à sept onglets.
