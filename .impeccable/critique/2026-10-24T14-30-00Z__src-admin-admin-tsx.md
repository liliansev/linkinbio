---
target: back office sur grand écran
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/home/user/linkinbio/src/admin/Admin.tsx"
target_fingerprint: "sha256:e713f9c47a7f16e26ed93114ce632f40cc71025788688a7a1c0e18f6b3f939a1"
target_path: /home/user/linkinbio/src/admin/Admin.tsx
timestamp: 2026-10-24T14-30-00Z
slug: src-admin-admin-tsx
---
# Critique Impeccable : le back office sur grand écran, série 2 (24 octobre 2026)

Mode critique Impeccable, angles critique, layout, polish, distill. Vu dans la démo (http://127.0.0.1:4500/), Chrome à pointeur fin, à 1280×720, 1440×900, 1920×1080, 2560×1440 et 3440×1440, plus un contrôle au téléphone à 390×844 (Chromium par défaut). Captures et mesures dans /tmp/claude-0/revue2-a/. Aucun fichier du dépôt modifié.

## Notes de Nielsen (sur 4)

| # | Heuristique | Note | En une phrase |
|---|---|---|---|
| 1 | Visibilité de l'état du système | 3 | « Enregistré » dans l'en-tête, rangée ouverte sur voile bleu, résumés à droite des lignes (« Visible », « Ouvert à tous ») ; mais l'aperçu « Sur un ordinateur » réduit à 30 % ne montre plus rien de lisible sous 1700 px. |
| 2 | Correspondance avec le monde réel | 3 | Le « tu », des mots simples ; trois mots différents pour un même défaut dans Visibilité (« Toujours », « Tout le temps », « Tous les réseaux », puis « Maintenant » et « Jamais » dessous). |
| 3 | Contrôle et liberté | 3 | Annuler dans les bulles, retour du fil, Échap ; un brouillon fermé est gardé masqué. |
| 4 | Cohérence et standards | 2 | Le même chevron sert à déplier, à naviguer et à ouvrir un choix ; la sélection d'un thème est noire alors que le bleu est la sélection ailleurs ; le titre de l'en-tête saute d'un onglet à l'autre. |
| 5 | Prévention des erreurs | 3 | Confirmations pour Résilier, Suspendre, Supprimer ; un bloc neuf n'est en ligne que par « Ajouter à ma page ». |
| 6 | Reconnaître plutôt que se souvenir | 3 | Chaque ligne dit sa valeur ; seuls les deux pictos téléphone et ordinateur de l'aperçu n'ont pas de mot (15 px, un `title`). |
| 7 | Flexibilité et efficacité | 2 | Pas de lien d'évitement, 9 arrêts de tabulation avant le contenu, 4 arrêts par bloc dans la liste ; la touche A et Cmd + Entrée existent mais restent seuls. |
| 8 | Esthétique et minimalisme | 3 | Très propre dans l'ensemble ; deux poches de surcharge : trois niveaux de dépli dans Visibilité, et six sortes d'étiquettes dans la fenêtre des offres. |
| 9 | Reconnaître et corriger les erreurs | 3 | Peu d'erreurs rencontrées dans la démo ; le rouge reste au danger, le champ fautif reprend la main. |
| 10 | Aide et documentation | 2 | Un « Écris-nous » au bas de Réglages ; c'est voulu (pas de sous-titres), mais rien ne dit ce que fait « Selon le réseau » avant de l'ouvrir. |
| | **Total** | **27/40** | Un produit soigné, freiné surtout par l'aperçu sur ordinateur aux largeurs de portable et par la cohérence de petits signes. |

## Ce qui marche

1. **La coquille du bureau tient sa promesse.** Barre bleue de 216 px collée à gauche, en-tête d'une seule rangée de 57 px dont le titre et les gestes s'alignent au pixel sur les bords de la colonne (Ma page : titre à x = 411, gestes jusqu'à x = 1711, carte de l'aperçu de 1211 à 1711 à 1920 px). Les colonnes mesurées respectent les largeurs décidées : 1300 (Ma page), 1120 (Stats, Comptes), 680 (Réglages, Intégrations, fiche d'un compte), 2160 en vue ordinateur. Rien n'est posé dans un cadre sur fond gris.
2. **Ma page est un vrai studio.** Liste en rangées de 44 px, réglages dépliés en place et alignés sur le picto (retrait de 40 px), aperçu collé qui suit la frappe et met en évidence le bloc ouvert (« Mon site » cerclé dans le téléphone). Les trois lignes Visibilité, Mis en avant, Plus de réglages ont une même forme, leur bord droit aligné à x = 1153. Au téléphone (390 px), la page s'édite elle-même, la barre d'onglets et « Ajouter un bloc » restent sous le pouce.
3. **Stats se lit d'abord en phrase.** « En 30 jours, ta page a eu 3 038 vues… » tient sur une mesure courte (650 px), puis quatre chiffres en onglets, une courbe lisse et des barres dans la couleur de chaque réseau ; la période vit dans l'en-tête, à sa place. Intégrations et Réglages sont des listes de lignes calmes, sans pastille ni sous-titre.

## Problèmes prioritaires

### P1. L'aperçu « Sur un ordinateur » est illisible sur un portable

- **Constat.** La page de 1280 px est réduite à la colonne de droite : échelle 0,30 à 1280×720 (382 px de large), 0,34 à 1440, 0,59 à 1920 ; 1:1 seulement à partir de 2560. Sous environ 1900 px, un texte de 16 px y devient du 5 à 9 px. Le geste a l'air cassé pour la majorité des écrans de portable.
- **Pourquoi.** La règle `max(var(--adm-apercu), 100% - 760px - var(--adm-entre))` (src/styles/admin.css, ligne 353) garde 760 px à l'édition quoi qu'il arrive ; la colonne de 2160 px (ligne 199) n'aide qu'aux très grands écrans.
- **Correctif concret.** Sous une largeur utile de page d'environ 1000 px (calculable dans `ApercuBureau`, src/admin/MaPage.tsx, vers la ligne 905, quand `taille.l / LARGEUR < 0.75`), ouvrir la vue ordinateur en plein espace de travail par-dessus l'édition (comme la fenêtre des offres, centrée à droite de la barre latérale, fermée par Échap) au lieu de la réduire ; au-dessus, garder le comportement actuel. Autre voie plus légère : ne proposer le picto ordinateur qu'au-delà de 1600 px de fenêtre. Aucune couleur touchée.

### P2. La colonne d'édition saute quand on change de vue

- **Constat.** En passant de « Sur un téléphone » à « Sur un ordinateur », la colonne passe de 1300 à 2160 px et se recentre : l'édition et le titre « Ma page » glissent de 155 px vers la gauche à 1920 (x = 411 vers 256), de 430 px à 3440 (x = 1171 vers 741). Le bloc qu'on était en train de régler change de place sous la souris.
- **Correctif.** Garder le bord gauche de l'édition fixe et ne faire grandir que la partie droite : en vue ordinateur, `margin-left` calculé comme en vue téléphone, soit `max(var(--adm-bord), (100% - 1300px) / 2)`, et la colonne qui s'étend vers la droite jusqu'à la place disponible (src/styles/admin.css, lignes 199 et 203). Le centrage décidé reste celui de la vue par défaut ; c'est une question à poser à Lilian si elle tient au recentrage dans les deux vues.

### P2. Trois niveaux de dépli dans Visibilité

- **Constat.** Rangée de bloc, puis Visibilité, puis « Selon la date », puis un cadre bordé Apparaît / Disparaît : trois replis emboîtés dans une rangée elle-même dépliée. Les sous-lignes ne sont décalées que de 16 px (x = 452 vers 468), avec la même taille et la même graisse que leurs parents ; « Mis en avant » qui suit se lit comme une quatrième sous-ligne.
- **Correctif (distill).** Ouvrir directement « Selon la date » sur ses deux lignes Apparaît et Disparaît, sans le cadre bordé (src/admin/ReglesBloc.tsx, ligne 307, `contenuDate`) ; porter le retrait des sous-lignes à 24 px et leur libellé au gris secondaire (#5f5f5a) pour que la hiérarchie se lise sans trait. Et appliquer la règle déjà en place pour « Plus de réglages » : une ligne n'écrit rien tant que rien n'est réglé, ce qui l'est se dit en bleu. Les valeurs « Toujours », « Tout le temps », « Tous les réseaux » (lignes 307 à 309) disparaissent alors, et le parent « Visible » suffit.

### P2. Le clavier traverse toute la liste

- **Constat.** Tab depuis le haut : 5 onglets, le compte, Copier, Voir ma page, Ajouter un bloc (9 arrêts) avant « Contenu » ; puis 4 arrêts par bloc (poignée, nom, œil, « … »). Avec 8 blocs, 32 arrêts avant l'aperçu ; avec 20 blocs, 80. Les anneaux de focus sont nets (2 px bleu, 7,3:1).
- **Correctif.** Un lien « Aller au contenu » visible au focus, premier élément de `.adm-shell` (src/admin/Admin.tsx, ligne 742), qui vise `#contenu-admin` ; dans la liste, un tabindex itinérant : un seul arrêt par rangée (le nom), les flèches haut et bas d'une rangée à l'autre, droite et gauche vers l'œil et « … ». La poignée garde son geste clavier (espace) depuis la rangée.

### P2. La fenêtre des offres empile les étiquettes

- **Constat.** Six étiquettes dans une fenêtre de 1000 px : « Ton offre », « Pour tes stats », « Bientôt », « 3 mois offerts », et trois « … d'économie ». Elles redisent les boutons : « Ton offre » au-dessus de « Ton offre actuelle », « Bientôt » au-dessus de « Bientôt disponible ».
- **Correctif (distill).** Garder « 3 mois offerts » à côté de la bascule et « Pour tes stats » sur l'offre recommandée ; retirer « Ton offre » et « Bientôt » (le bouton dit déjà l'état, src/admin/Offres.tsx, lignes 106 à 108) ; écrire l'économie en texte gris sous le prix, sans fond (ligne 212). La carte Premium, pas en vente, peut se demander : faut-il la montrer avec un prix ?

### P2. À 1280 px, le nom du bloc se coupe avant son adresse

- **Constat.** Colonne d'édition de 524 px : « Parlons de votre proj… » et « liliansevoum… » sont coupés tous les deux, à côté de « Mis en avant » et de « 447 clics ». La requête de conteneur qui retire l'adresse ne joue que sous 480 px.
- **Correctif.** Relever le seuil à 559 px (`@container edition (max-width: 479px)`, src/styles/admin.css, ligne 457) : sous 560 px, l'adresse s'efface et « Mis en avant » devient son picto ; le nom garde sa place entière.

### P2. Premiers pas : la progression ne s'aligne sur rien

- **Constat.** Les quatre traits de progression sont centrés sur l'en-tête qui couvre les deux colonnes, décalés par « Plus tard » : centre à x = 618 à 1280 (questions centrées à 270, scène à 858), à x = 938 à 1920 (questions à 590, scène à 1178). À 3440, « Plus tard » est à 1100 px des questions.
- **Correctif.** Poser la progression au-dessus du titre de la question, dans la colonne de 460 px (src/admin/PremiersPas.tsx, lignes 334 à 344 : l'en-tête ne couvre plus `lg:col-span-2`), avec « Plus tard » au bout de la même rangée ; la scène crème garde toute sa hauteur à droite.

### P2. Stats en Gratuit : deux fois le même bouton, deux cartes mal alignées

- **Constat.** Deux « Voir les offres », l'un plein, l'autre bordé, qui ouvrent la même fenêtre. Titres décalés de 2 px (« Tes stats » à y = 161, « Ta liste » à 163), textes de 8 px (189 contre 197), étiquette Starter pâle et Pro pleine côte à côte ; la carte de droite garde 120 px vides en bas.
- **Correctif.** Un seul bouton plein, sous la carte « Tes stats » (src/admin/OngletStats.tsx, ligne 357) ; dans « Ta liste » (src/admin/MaListe.tsx, ligne 35), un lien discret « Voir Pro » ; même composant de titre et d'étiquette pour les deux cartes, alignées en haut et non étirées.

## Observations mineures

- **Sélection d'un thème en noir.** L'anneau du thème choisi est `ring-white` (l'encre) sur `bg-white/10` (src/admin/OngletApparence.tsx, ligne 137), alors que la règle dit que le bleu est la sélection (l'onglet, la vue de l'aperçu). Question de couleur, à trancher hors d'une tâche de mise en page.
- **Un chevron, trois sens.** Chevron bas pour déplier (Visibilité), pour un choix (« Accès réservé : Ouvert à tous »), chevron droit pour une sous-page (Design, Intégrations). Garder bas pour déplier, droite pour naviguer, et donner au choix la même forme qu'ailleurs.
- **Rythme de « Plus de réglages ».** 36 px entre Lien partenaire et Visible par Google, 50 px avant Accès réservé : le `Repli` n'a pas le même pas que les interrupteurs.
- **Le titre change de place d'un onglet à l'autre** (x = 411, 501, 721 à 1920) : c'est la conséquence voulue des largeurs par onglet ; à noter seulement que l'œil le sent.
- **Bande de 15 px au bord droit.** `scrollbar-gutter: stable` (src/styles/admin.css, ligne 8) laisse une bande blanche quand la page ne défile pas, visible sur Windows et dans Chrome sans écran ; invisible avec les barres en surimpression de macOS.
- **Appareils.** Tablette prend le picto du mobile (src/admin/OngletStats.tsx, ligne 244) ; la barre de « Tablette » fait 12 px, son mot déborde à droite.
- **Intégrations, « Sur ta page ».** Prise de rendez-vous montre un seul logo quand les trois autres en montrent trois.
- **Réglages.** « Lilian Sevoumian · Tous mes liens · Mes vidéos, ma … » : l'ellipse se pose après une espace. « Modifier » ouvre une fenêtre en bouton bordé, quand les autres ouvertures sont des lignes à chevron.
- **Fiche d'un compte.** Pas de rappel de l'identité en tête (pastille, offre, statut) : on lit « camille-studio » dans le fil seul ; une ligne suffirait si Lilian la veut.
- **Pictos de l'aperçu.** Téléphone et ordinateur en 15 px, sans mot, dans des cibles de 32 × 30 : un mot au survol plus rapide que le `title` natif aiderait.
- **Écrans d'entrée et premiers pas.** Bons ; à 1920, la carte des CGU (420 px) flotte au centre d'un bleu plein, c'est voulu.

## Signaux par persona

**L'habitué pressé.** Ouvre, règle, referme. Ce qui le freine : la colonne qui saute quand il bascule l'aperçu, les trois niveaux de Visibilité pour poser une date, et la double lecture « Toujours » puis « Maintenant ». Ce qui l'aide : la touche A, le champ qui accepte une adresse collée, les rangées dépliées sur place. À 3440, chaque passage de la barre latérale (x ≈ 100) au contenu (x ≈ 1171) coûte 1000 px de souris : c'est le prix du centrage, à garder en tête sans le changer.

**Clavier et basse vision.** Les anneaux de focus sont nets, les gris secondaires tiennent 4,5:1 au moins, les cibles du bureau font 28 à 32 px (au-dessus des 24 de WCAG 2.5.8). Les freins : pas de lien d'évitement, 4 arrêts par bloc, un texte secondaire à 12 px (adresse du bloc, clics, état « Enregistré ») qui fatigue sur un 27 pouces, et l'aperçu ordinateur réduit à 30 % qu'aucun zoom de navigateur ne rend lisible (au-delà de 133 %, l'app passe en mise en page téléphone, ce qui est bien).

**La créatrice sur 3440 × 1440.** Elle a le meilleur cas : l'aperçu ordinateur à 1:1 (1280 px) à côté de 760 px d'édition, la galerie des thèmes en quatre colonnes de 182 px. Elle voit aussi le plus grand vide : 955 px de chaque côté de Ma page en vue téléphone, et un saut de 430 px de son édition quand elle bascule de vue. Question à Lilian, pas un correctif : sur un écran de plus de 2800 px, la vue ordinateur pourrait-elle être la vue par défaut, puisqu'elle remplit la place sans rien casser ?

## Questions pour Lilian (règles qui coûtent peut-être)

1. Le recentrage de la colonne quand l'aperçu passe en ordinateur : faut-il le garder, au prix du saut de l'édition ?
2. La vue ordinateur réduite à 30 % sur un portable : préfères-tu la cacher sous une certaine largeur, ou l'ouvrir en grand par-dessus l'édition ?
3. Premium, pas en vente : faut-il un prix et une carte entière dans la fenêtre des offres ?

## Suite

Toutes les corrections de cette série sont faites (voir `/mnt/project-files/hopla/back-office/grand-ecran-critique/corrections-serie-2.md`). Deuxième et dernière série : on publie.
