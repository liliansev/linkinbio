---
target: back office sur grand écran
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/user/linkinbio/src/admin/Admin.tsx"
target_fingerprint: "sha256:5d9dbd4db5a59c6d24af793103202d6b6b63a484943e6ac104faed10313dc2f3"
target_path: /home/user/linkinbio/src/admin/Admin.tsx
timestamp: 2026-10-24T13-25-34Z
slug: src-admin-admin-tsx
---
# Critique Impeccable : le back office sur grand écran, série 1 (24 octobre 2026)

Cible : le back office de Hopla au bureau (`src/admin/`, `src/styles/admin.css`), à 1280, 1440, 1920, 2560 et 3440 px de large, le téléphone (390 px) en contrôle. Angles demandés par Lilian : critique, layout, polish, distill. État : `main` au commit 2543eb6 (après la PR #70, Visibilité). Démo locale, données fictives.

Condition de mesure découverte en route : le Chrome sans écran se déclare sans souris (`pointer: none`), et toutes les règles du bureau (`bureau:`, rangées de 32 px, champs de 40, échelle 12 / 13,5 / 15 / 18 / 24) attendent `pointer: fine`. Les captures et les mesures ont été refaites avec un Chrome à pointeur fin. Captures : `avant/`.

## Note de santé (Nielsen)

| # | Heuristique | Note | Point clé |
|---|---|---|---|
| 1 | Visibilité de l'état | 3 | « Enregistré », l'anneau du bloc ouvert dans le téléphone, la bulle avec Annuler ; mais la vue « Sur un ordinateur » rend le texte à 5,7 px : l'état existe, il ne se lit pas |
| 2 | Correspondance avec le réel | 3 | Tutoiement, mots concrets, la page dans un vrai téléphone ; « Affiché / En avant » par réseau reste abstrait |
| 3 | Contrôle et liberté | 3 | Annuler, Échap, bloc neuf gardé masqué, fil « ‹ Comptes / camille-studio » |
| 4 | Cohérence | 2 | Trois formes pour trois réglages qui se suivent dans un bloc ouvert ; lignes de Design à 52 px avec pictos, de Réglages à 48 sans ; le bouton d'une ligne à 6 px du bord, sa valeur à 16 ; badge d'offre à côté du titre ici, au bord droit là ; deux téléphones (avec et sans cadre) |
| 5 | Prévention des erreurs | 3 | Confirmations, bloc neuf masqué ; risque : 23 commandes ouvertes d'un coup dans Visibilité |
| 6 | Reconnaissance | 3 | Chaque ligne dit sa valeur ; mais les sept jours de « Selon l'heure » ne ressemblent pas à des boutons |
| 7 | Flexibilité | 3 | Touche A, Cmd ou Ctrl + Entrée, une adresse collée choisit le bloc ; pas de tri dans Comptes |
| 8 | Esthétique et minimalisme | 3 | Sobre et fin ; poches de bruit : rangée ouverte de 957 px, crème vide sous le téléphone, trois portes vers les offres dans Stats en Gratuit |
| 9 | Récupération | 3 | Messages clairs, Réessayer dans la bulle |
| 10 | Aide | 2 | Peu d'aide là où les mots sont abstraits (créneau, « En avant » par réseau) ; sans sous-titres, l'aide doit passer par les libellés et les valeurs |
| **Total** | | **28/40** | **Bon**, à sa limite basse : solide de 1280 à 1920, il se défait sur les écrans hauts et larges |

## Spécificité du design

**Regard du design (A).** Propre à Hopla par ses rôles (le bleu pour agir, le citron pour ce qui se gagne, le crème pour la page qu'on regarde, et surtout l'édition en face de la vraie page, avec l'anneau du bloc ouvert), générique par sa charpente (barre latérale, colonne centrée, lignes de réglages, tableau). En mode Operate, cette familiarité est un atout. La spécificité se perd sur grand écran : la colonne se centre et s'arrête là, et le seul objet propre au produit, la page, reste un téléphone de 408 × 778 px et une vignette d'ordinateur de 452 × 473 px, à 1920 comme à 3440. À 3440, Hopla ressemble à une app de téléphone posée au milieu d'un écran vide, au moment où il pourrait montrer la page en grand.

**Scan déterministe (B).** Le CLI ne trouve presque rien sur `src/admin` (code 0) : un seul avis, la taille de 10,5 px des légendes de la barre du bas sous 360 px (`Admin.tsx:860`), une exception documentée dans DESIGN.md ; le scan de mise en page est propre. Dans le navigateur, 0 à 5 constats par vue, le même nombre à toutes les largeurs. Réels : l'étiquette « Mis en avant » tassée (20 px de haut pour un texte de 18, `admin.css:429`) ; la valeur de l'aperçu Google coupée sans moyen de la lire en entier. À peser : la hiérarchie plate (le titre de l'écran fait 15 px, comme les titres des cartes), un choix documenté du bureau. Faux positifs, avec leur raison : la lueur, le halo et la carte imbriquée viennent du thème public rendu dans l'aperçu, qui garde son système ; l'encart de la courbe a ses enfants bord à bord par construction ; à 390, le titre « Ma page » est réservé aux lecteurs d'écran, la toile coupe ses décors exprès, et le contraste de l'aide « Touche pour modifier » a été mesuré sur le mauvais fond (6,5:1 en réalité).

**Ce que les mesures ajoutent.** Aucun débordement horizontal de 390 à 3440. Le « … » du dernier bloc s'ouvre toujours vers le bas et sort de l'écran sur un écran court (64 px à 1280 × 720). La fenêtre des offres se centre sur tout l'écran, 108 px à gauche du centre des colonnes. La bulle se pose à 24 px du bord : à 3440, à 547 px de la colonne ; à 1280, sur le bas du téléphone. `scrollbar-gutter: stable` laisse une bande de 15 px au bord droit, visible sur les écrans bleus.

**Calques visibles.** Le détecteur a été injecté dans les sessions sans écran des deux revues, refermées depuis : aucun calque n'est resté ouvert.

## Impression d'ensemble

De 1280 à 1920, c'est un bon SaaS : en-tête et contenu alignés au pixel, une mesure juste par onglet, l'édition en face de la page. Au-delà, rien ne grandit sauf le vide : la carte crème prend toute la hauteur pour un téléphone qui reste à 778 px, les premiers pas perdent leur miniature dans une scène de 1360 px, et la vue ordinateur reste illisible. La plus grande occasion : laisser la page grandir avec l'écran, et serrer ce qui l'entoure.

## Ce qui marche

1. **En-tête et contenu alignés au pixel**, à toutes les largeurs : le titre au bord gauche de la colonne, le dernier geste à son bord droit (Ma page 411 → 1711 à 1920, Stats 501 → 1621, Intégrations 721 → 1401).
2. **L'édition en face de la page vivante** : la page suit chaque frappe, l'anneau marque le bloc ouvert, l'en-tête de la rangée reste collé, A et Cmd ou Ctrl + Entrée, l'adresse collée choisit son bloc.
3. **Stats et Intégrations au niveau d'un bon SaaS** : la phrase en clair, les chiffres qui sont les onglets de la courbe, les logos sans cadre, une ligne de 48 px par outil.

## Problèmes prioritaires

- **[P1] Sur grand écran, la page reste petite pendant que la place reste vide.** Le téléphone est bloqué à 408 × 778 (`Telephone`, `MaPage.tsx:814`, il ne fait que réduire) alors que la carte crème prend toute la hauteur (`.adm-apercu-colle`, `admin.css:464`) : 493 px de crème vide sous lui à 1440 px de haut. La vue ordinateur rend la page de 1280 px à l'échelle 0,353, texte courant à 5,7 px, à 1920 comme à 3440. **Pourquoi** : la promesse du produit, voir la page qu'on partage, est la plus faible là où la place est la plus grande. **Correctif** : l'écran du téléphone grandit en hauteur sur un écran haut (390 px de large, jusqu'à 932 de haut, un grand iPhone) ; la carte crème épouse le téléphone ; la vue ordinateur prend la place que l'écran offre, la colonne de l'édition gardant ses 760 px ; la légende qui répète la bascule part. **Commande** : /impeccable adapt, puis /impeccable layout
- **[P1] Un bloc ouvert : trois formes, puis un mur de 23 commandes.** « Visibilité » est un bouton pleine largeur dont la valeur « Visible ⌄ » ressemble à un menu, « Mis en avant » un interrupteur, « Plus de réglages » une barre bordée qui pèse plus que les deux réglages courants. Visibilité dépliée, la rangée passe à 957 px et 35 commandes : les trois parties s'ouvrent ensemble, les sept jours n'ont ni bord ni fond, six réseaux × deux interrupteurs. **Pourquoi** : c'est le seul endroit où le back office cesse d'être « vraiment simple ». **Correctif** : une seule forme de ligne (libellé à gauche, valeur au gris et chevron ou interrupteur au même bord droit) ; « Plus de réglages » en simple ligne ; dans Visibilité, « Visible sur ma page » puis trois lignes qui disent ce qui est réglé et s'ouvrent une à une ; des jours qui ressemblent à des boutons. **Commande** : /impeccable distill, puis /impeccable polish
- **[P2] Deux grammaires de lignes d'un écran de réglage à l'autre.** Design : lignes de 52 px avec pictos, « Badge vérifié » hors du groupe ; Réglages : 48 px sans picto, mais un bouton à 6 px du bord quand valeurs et interrupteurs sont à 16 ; badge d'offre au bord droit de « Ta liste » ; la fiche d'un compte dit « Pro » deux fois ; la miniature des premiers pas n'a pas le cadre du téléphone de Ma page. **Pourquoi** : en mode Operate, la constance fait la vitesse. **Correctif** : les lignes de Design construites comme celles de Réglages, « Badge vérifié » dans le groupe ; un seul retrait à droite ; le badge à côté du titre ; une ligne d'offre dans la fiche ; un seul téléphone. **Commande** : /impeccable polish
- **[P2] Stats : une grille en escalier, et un écran Gratuit étiré.** `items-start` laisse chaque encart à sa hauteur (36 px d'écart entre Liens et Réseaux). En Gratuit, une carte de 1120 px pour 400 px de contenu, et trois portes vers les offres (deux « Voir les offres » et l'appel de la barre latérale). **Correctif** : des encarts de même hauteur par rangée ; en Gratuit, « Tes stats » et « Ta liste » côte à côte, un seul bouton plein. **Commande** : /impeccable layout, /impeccable distill
- **[P2] Premiers pas sur grand écran : le formulaire et la page ne se répondent plus.** La scène crème s'étire sur toute la hauteur (716 × 1360 à 3440 × 1440) autour d'une miniature de 640 px, le formulaire collé en haut, 1000 px de blanc dessous. **Correctif** : le formulaire et la scène sur la même médiane, la scène à la hauteur de sa miniature, la miniature à sa vraie taille quand la hauteur le permet. **Commande** : /impeccable layout

## Signaux d'alerte par persona

**Alex (habitué pressé)** : régler un bloc pour trois réseaux, c'est chercher ses lignes parmi douze interrupteurs ; pas de sélection multiple dans les blocs ; le tableau des comptes ne se trie pas.

**Sam (clavier, basse vision)** : un jour non choisi n'a aucune limite visible ; la vue ordinateur rend le texte à 5,7 px et le zoom n'y change rien ; les deux vues de l'aperçu sont des icônes seules ; le « … » du dernier bloc sort de l'écran sur un écran court.

**Inès (créatrice sur un écran de 34 pouces, 3440 × 1440)** : sa page reste un téléphone de 778 px avec 493 px de crème vide dessous ; la vue ordinateur reste une vignette ; la bulle s'affiche à 547 px de son travail ; aux premiers pas, 1000 px de blanc sous le formulaire.

## Observations mineures

- À 1280, la première rangée coupe le nom du bloc (« Parlons de votre pr… ») en même temps que son adresse : le nom devrait passer d'abord.
- L'étiquette « Mis en avant » est tassée : 20 px de haut pour un texte de 18.
- La valeur de l'aperçu Google, coupée d'une ellipse, ne se lit en entier nulle part sans l'ouvrir.
- Le « … » d'une rangée ne se retourne pas vers le haut quand la place manque dessous (`Menu`, `ui.tsx`).
- La fenêtre des offres se centre sur l'écran entier, pas sur l'espace de travail.
- La bulle se pose à 24 px du bord de l'écran, loin de la colonne sur un grand écran.
- `scrollbar-gutter: stable` montre une bande de 15 px du fond de la page au bord droit, visible sur les écrans bleus (connexion, CGU).
- La fenêtre des offres floute l'arrière-plan : décoratif, et coûteux sur 3440 × 1440.
- Un compte sans photo montre le picto « image » dans le profil, qui se lit comme une image cassée.
- La galerie des thèmes montre six vignettes à la fois à 1080 px de haut, la moitié basse de chacune vide.
- Stats : la phrase du haut fait environ 115 caractères par ligne à 1920, à la limite haute.
- Stats : sur les petites parts (Google 4 %, Tablette 3 %), le libellé dépasse sa barre.
- Le titre de l'en-tête change de place d'un onglet à l'autre, parce que chaque onglet a sa mesure (1300, 1120, 680).
- Comptes : six styles de pastilles sur un écran ; la colonne Offre mêle texte nu et badges.
- Le bouton « Ajouter un bloc » de l'en-tête et le champ « Colle une adresse ou cherche un bloc » font la même chose à 240 px l'un de l'autre.
- Détecteur : légende de 10,5 px de la barre du bas sous 360 px (exception documentée).

## Questions à se poser

1. Pourquoi l'écran du téléphone fait-il 760 px de haut quand l'écran en offre 1270 ? Une page de liens se juge en entier.
2. La vue ordinateur à 5,7 px sert-elle à autre chose qu'à rassurer ?
3. Combien de créateurs règlent vraiment six réseaux un par un ?
4. Le crème est « la page qu'on regarde » : doit-il s'étendre là où il n'y a rien à regarder ?
5. Trois portes vers les offres sur l'écran Stats d'un compte Gratuit vendent-elles mieux Starter qu'une seule ?

---
