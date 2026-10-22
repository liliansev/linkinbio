---
target: écran Ouvrir dans le navigateur (EcranSortie, page publique)
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/home/user/linkinbio/src/components/PageLiens.tsx"
target_fingerprint: "sha256:a149ac1bee2bc7f16df6b39f0cd1a96a825ea5e9b73eee1e06f6c35c51f436eb"
target_path: /home/user/linkinbio/src/components/PageLiens.tsx
timestamp: 2026-10-21T16-28-33Z
slug: src-components-pageliens-tsx
---
Method: dual-agent (A : revue de design · B : détecteur et navigateur), deux sous-agents isolés, en parallèle.

Critique de l'écran qui passe avant une page Hopla ouverte dans le navigateur intégré de LinkedIn, Instagram, Facebook, Messenger ou Threads (`EcranSortie` dans `src/components/PageLiens.tsx`, section `.lp-sortie` de `src/styles/page.css`, interrupteur de Réglages). Vu sur le serveur local avec les user agents des apps, à 320, 375, 390, 412 et 430 px de large, et dans la démo sur les 20 thèmes.

## En bref

- **Note : 28/40**, « Bon ». L'écran est fait des pièces de la page (en-tête, boutons, thème) : vingt seuils de créateurs différents, jamais un dialogue Hopla.
- **Le détecteur ne trouve rien dans le code neuf** : CLI à zéro sur `PageLiens.tsx` et `OngletReglages.tsx` (témoin vérifié), contrastes tous au-dessus de 4,5:1. Dans le navigateur, un `dark-glow` sur le bouton d'accent vient d'une règle de thème déjà en place (`.lp[data-bouton='plein'] … .lp-accent`), et `codex-grid-background` du décor « grille » de brutal : rien à reprendre ici.
- **Les vrais trous sont ailleurs** : l'aide sort de l'écran sur un petit téléphone et montre « ••• » sur Android, « Copier le lien » passe devant l'accent dans trois thèmes, « Continuer ici » ne répond pas avant le chargement du script, et le lien copié porte un repère qui fausse les stats s'il est partagé.

## Heuristiques

| # | Heuristique | Note | Constat |
|---|---|---|---|
| 1 | Visibilité de l'état | 3 | Toast « Lien copié », aide après 1,5 s, focus rendu au nom ; l'aide peut sortir de l'écran |
| 2 | Langage de l'utilisateur | 3 | « ••• » imite le vrai bouton, mais Android montre « ⋮ » ; « s'ouvre mieux » décrit un faux problème |
| 3 | Contrôle et liberté | 3 | « Continuer ici » toujours là, `?suite` évite le retour de l'écran ; inerte avant l'hydratation |
| 4 | Cohérence et standards | 3 | Tout vient du thème ; le bouton secondaire plein concurrence l'accent |
| 5 | Prévention des erreurs | 2 | Le lien copié porte `suite=1` : partagé, la visite suivante n'est pas comptée |
| 6 | Reconnaissance plutôt que rappel | 3 | L'aide montre le signe à toucher ; pas le bon sur Android |
| 7 | Flexibilité et efficacité | 2 | L'écran revient à chaque visite (sans cookie, par promesse) |
| 8 | Esthétique et minimalisme | 3 | Propre et fidèle au thème ; « Copier le lien » plein de trop au premier regard |
| 9 | Récupération après erreur | 3 | Consigne précise si rien ne s'ouvre ; la copie ratée finit sans issue |
| 10 | Aide et documentation | 3 | L'aide vient après un échec ; l'intitulé de l'interrupteur ne nomme pas les apps |
| **Total** | | **28/40** | **Bon** |

## Verdict de spécificité

**Revue (A)** : l'habillage est propre à Hopla, la structure est celle de la catégorie (photo, nom, phrase, ouvrir, copier, continuer). La puce « ••• » de l'aide est un vrai geste signature : elle dessine le bouton à toucher au lieu de le décrire.

**Détecteur (B)** : 0 constat CLI sur le code neuf. Superposition injectée sur 5 vues (LinkedIn iPhone et Instagram Android sur le serveur, klein, brutal et champagne dans la démo) : un `dark-glow` hérité du thème sur l'accent, un `codex-grid-background` hérité du décor brutal, et un faux positif venu de la feuille du détecteur lui-même. Les mesures ne montrent ni débordement horizontal ni contraste faible.

## Ce qui marche

1. **La porte du créateur, dans son thème** : `.lp-tete`, `.lp-btn`, `.lp-accent`, polices, formes et décors repris tels quels ; l'accent va au geste voulu.
2. **Des mots honnêtes sur une mécanique cachée** : « Ouvrir dans Safari » seulement quand `x-safari-https` garantit Safari ; une sortie par app ; l'écran rendu au serveur, jamais un éclair de page avant lui.
3. **Une boucle accessible** : ordre clavier Ouvrir, Copier, Continuer ici ; focus rendu au `h1` ; zone `aria-live` présente dès le rendu ; mouvement réduit respecté.

## Problèmes prioritaires

**[P1] Un écran obligatoire par défaut, sans mémoire et sans compteur.** Actif sur toutes les pages (choix de Lilian), il revient à chaque visite, et le créateur ne voit pas ce qu'il produit. Un cookie est exclu : la politique de confidentialité promet qu'aucun cookie n'est déposé chez le visiteur. Correctif retenu : aucun dans ce lot ; un compteur « ouvertes dans Safari ou Chrome » dans Stats, à côté de « Ouverts dans l'app », est la suite logique. Commande : /impeccable shape.

**[P2] L'aide sort de l'écran sur un petit téléphone, loin du menu, et montre « ••• » sur Android.** À 320 × 568, 26 px sont coupés. Correctif : l'aide prend la place de la phrase sous le nom, dans un empilement qui réserve la hauteur la plus grande (rien ne bouge sous le doigt) ; « ⋮ » sur Android ; espace insécable dans « à droite » et espace fine avant « ? ». Commande : /impeccable layout, /impeccable clarify.

**[P2] « Copier le lien » concurrence l'accent.** Bouton plein en `--surface` : il l'emporte dans skate, lin et argile, et pèse dans bauhaus, foret, klein, lampe et marine. Correctif : sur cet écran, le secondaire passe au contour (fond transparent, trait fin à la couleur du texte) ; l'accent reste le seul objet plein. Commande : /impeccable distill.

**[P2] « Continuer ici » ne répond pas avant l'hydratation.** Un `<button>` sans lien. Correctif : un lien vers la page sans écran, que le script intercepte une fois chargé. Commande : /impeccable harden.

**[P2] Le lien copié porte un repère de suivi.** `suite=1` sans fin : partagé, la visite du destinataire n'est jamais comptée et ne voit jamais l'écran. Correctif : le repère porte la minute où il a été posé et ne vaut que 15 minutes, au serveur comme au navigateur, à l'heure du serveur. Commande : /impeccable harden.

## Signaux par persona

- **Casey, pressée, venue d'un post LinkedIn** : pour rester, le petit « Continuer ici », inerte tant que la page charge ; revenue dans LinkedIn après Safari, l'écran l'attend encore.
- **Sam, VoiceOver** : parcours bon, mais l'aide se lit « Touche, trois points, image » (le `role="img"`), et la copie ratée n'offre aucune issue.
- **Lilian, qui vérifie sa page** : l'intitulé de l'interrupteur ne dit pas pour quelles apps ; l'écran tutoie parce que sa page tutoie (réglage « vouvoyer »), alors que ses blocs vouvoient.

## Observations mineures

- À 320 px, « Ouvrir dans le navigateur » passe sur deux lignes (la place réservée au picto).
- `.lp-toast` est plafonné à la moitié de l'écran : « La copie n'a pas marché. » tient sur deux lignes.
- Au retour depuis Safari, l'écran reste affiché ; il pourrait laisser place à la page.
- Les pages gratuites perdent « Une page faite avec Hopla » sur l'écran.
- L'en-tête saute du milieu vers le haut à « Continuer ici ».

## Questions

- Et si la page passait d'abord, avec Safari proposé dans une barre basse ?
- Quelle part de visiteurs doit choisir Safari pour que l'écran reste actif par défaut, et où Lilian lira-t-il ce chiffre ?
