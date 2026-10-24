---
target: choix ajouter un bloc (série 1)
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/user/linkinbio/src/admin/OngletLiens.tsx"
target_fingerprint: "sha256:f65dbd56995184f24b0563b0f08a372cd34ce123395db9530024fc78d034d9ac"
target_path: /home/user/linkinbio/src/admin/OngletLiens.tsx
timestamp: 2026-10-24T02-07-16Z
slug: src-admin-ongletliens-tsx
---
Method: dual-agent (A : revue de design · B : détecteur et navigateur), deux sous-agents isolés, lancés en parallèle. Première série.

# Critique Impeccable : le choix « Ajouter un bloc », série 1 (24 octobre 2026)

Cible : le choix des blocs simplifié (`FeuilleAjout` au téléphone, `MenuAjout` au bureau, dans `src/admin/OngletLiens.tsx`), le bloc neuf qui suit son adresse et la proposition « En faire… » d'un lien déjà posé (`src/admin/EditeurBloc.tsx`), le champ « Colle une adresse » de Ma page (`src/admin/MaPage.tsx`). État : l'arbre de travail avant commit, avec six entrées (cinq pour un compte ordinaire) au lieu de douze.

## Note de santé (Nielsen)

| # | Heuristique | Note | Point clé |
|---|---|---|---|
| 1 | Visibilité de l'état | 3 | L'aperçu suit chaque frappe et le titre devient « Nouveau bloc : Prise de rendez-vous », mais rien n'annonce le changement de type aux lecteurs d'écran, et les champs perdus à la conversion disparaissent sans un mot |
| 2 | Correspondance avec le réel | 3 | Les noms sont ceux des créateurs, mais un mot tapé (« rendez-vous ») reçoit un diagnostic d'adresse : « Il manque la fin de l'adresse » |
| 3 | Contrôle et liberté | 2 | L'aller-retour de type efface des champs, enregistré en 650 ms au bureau ; en Gratuit, « Voir les offres » pose le lien sans qu'on l'ait demandé |
| 4 | Cohérence | 2 | Le champ ne dit pas la même chose au téléphone et au bureau ; Me soutenir garde le libellé « Adresse » ; le choix des blocs et Intégrations ne montrent pas les mêmes blocs ; le focus revient tantôt au bouton, tantôt nulle part |
| 5 | Prévention des erreurs | 2 | Convertir un lien posé n'avertit pas de ce qui part ; un mot tapé est refusé |
| 6 | Reconnaissance | 2 | Produit, Prise de rendez-vous, Me soutenir, Vidéo et Lien partenaire ne se trouvent plus qu'en sachant qu'il faut coller une adresse, ou par Intégrations |
| 7 | Flexibilité | 3 | Touche A, collage partout, Cmd/Ctrl + Entrée, lettre dans le menu ; mais aucune recherche, et la lettre ne voit que les six entrées |
| 8 | Esthétique et minimalisme | 3 | La liste est calme ; au bureau, le champ et l'aide du lien neuf disent la même phrase l'un sous l'autre |
| 9 | Récupération | 2 | La personne qui cherche un bloc par son nom reçoit une erreur qui ne mène nulle part |
| 10 | Aide | 2 | Au téléphone, rien n'annonce la détection avant d'avoir choisi Lien ; l'interrupteur du lien partenaire, qui porte une obligation légale, est nu |
| **Total** | | **24/40** | **Acceptable** : le dédoublonnage est réussi, mais il a cassé la recherche d'un bloc par son nom et la fin du parcours d'achat |

## Spécificité du design

**Regard du design (A).** La liste est générique par sa forme (picto seul, nom, chevron, badge d'offre), et c'est juste pour une surface de travail : ni familles, ni sous-titres, ni pastille derrière un picto, et le doublon « Ma newsletter » / « Liste e-mail » a disparu. Le geste, lui, est propre à Hopla : un Calendly collé devient une prise de rendez-vous sous les yeux, l'aperçu montre « Prendre rendez-vous » avant toute validation. Mais ce geste est invisible au départ : au téléphone, le champ dit seulement « Colle une adresse », et la vitrine que Starter vend n'a plus aucune trace dans le choix. L'occasion manquée : faire du champ le cœur du choix (« colle ou cherche »), comme la feuille de Linktree envoyée par Lilian.

**Scan déterministe (B).** Le CLI ne trouve rien sur `OngletLiens.tsx`, `EditeurBloc.tsx` et `MaPage.tsx` (exit 0, aussi sans la configuration du projet ; un fichier témoin prouve que le moteur fonctionne). Dans le navigateur, 6 à 8 constats par vue, aucun dans la feuille d'ajout ni dans la feuille ou la rangée d'un bloc neuf. Faux positifs, avec leur raison : le titre « Ma page » réservé aux lecteurs d'écran (`sr-only`), la toile arrondie qui coupe ses enfants positionnés (voulu), un contraste mesuré sur le mauvais calque (7,5:1 en réalité), les lueurs, le halo et la carte imbriquée du thème public rendu dans l'éditeur (hors périmètre, règle de frontière des thèmes), l'étiquette « Mis en avant » centrée par sa hauteur, l'adresse de l'en-tête coupée d'une ellipse comme prévu, et l'ombre du menu, motif documenté dans DESIGN.md. Un constat à peser : l'anneau de sélection de l'aperçu passe à 3 px de la légende d'une vidéo, qui touche le bas de son bloc.

**Calques visibles.** Le détecteur a été injecté dans les cinq vues des sessions sans tête de B, refermées depuis : aucun calque n'est resté ouvert à l'écran.

## Impression d'ensemble

La liste courte soulage et la détection est le meilleur moment du parcours. Mais en retirant cinq entrées, on a retiré leur seul nom : celle qui cherche « prise de rendez-vous » ne la trouve plus, et celle qui vient de payer pour la vitrine tombe sur une liste où la vitrine n'est pas. La plus grande occasion : un champ « Colle une adresse ou cherche un bloc », qui garde la liste de six comme état vide.

## Ce qui marche

1. **La détection avec conversion en place** : le bloc change de nom, de libellé, de texte et d'aperçu sous les yeux, le geste reste réversible, et la flèche de retour rend l'adresse au choix.
2. **Une liste dédoublonnée qui respecte les goûts de Lilian** : pas de familles ni de sous-titres, des badges seulement pour les offres.
3. **Une offre honnête et un clavier solide** : en Gratuit, l'adresse reste un lien qui marche, avec la phrase juste (« ton agenda Calendly s'ouvre dans ta page, sans la quitter ») ; au bureau, le menu boucle aux flèches, une lettre y mène, Échap et Tab rendent le focus.

## Problèmes prioritaires

- **[P1] Après l'achat de Starter, « Remplir ta vitrine » ouvre un choix sans vitrine.** `actionApres` (`Admin.tsx`) ouvre le choix des blocs, qui n'a plus la vitrine ; le bloc d'origine se perd (au téléphone, « Voir les offres » venait de poser le lien) ; parti d'un lien déjà posé, le geste s'appellerait « Ajouter ton code promo ». **Pourquoi** : la personne vient de payer, et l'écran suivant ne montre pas ce qu'elle a acheté. **Correctif** : garder le bloc d'origine jusqu'au retour, y revenir avec la conversion faite et un geste qui la nomme (« Ouvrir ton agenda dans ta page ») ; « Ajouter ton code promo » pour un lien partenaire seulement ; sans bloc d'origine, mener à Intégrations, « Sur ta page ». **Commande** : /impeccable harden
- **[P1] Les blocs sortis de la liste ne se trouvent plus que par le rappel.** Le champ ne prend qu'une adresse et refuse un mot ; la lettre du menu ne voit que six entrées ; la phrase qui annonce la détection n'arrive qu'après avoir choisi Lien. **Pourquoi** : Lilian a demandé de dédoublonner, pas de cacher ; une créatrice cherche « rendez-vous » par son nom. **Correctif** : « Colle une adresse ou cherche un bloc », au téléphone et dans le menu du bureau ; un mot filtre tous les blocs, ceux sortis de la liste compris, avec leurs mots courants (rdv, agenda, don, boutique, affiliation…) ; la liste de six reste l'état vide. **Commande** : /impeccable shape, puis /impeccable clarify
- **[P2] Changer le type d'un lien déjà posé efface sans le dire.** `versType` a été écrit pour un bloc neuf : sous-titre, description et image partent, la page dit « Calendly / Calendly », et au bureau la perte est en ligne en 650 ms. **Pourquoi** : le lien est en ligne et cliqué, « En faire… » se lit comme un essai sans risque. **Correctif** : rendre le bloc à l'identique quand on revient en arrière, garder le sous-titre là où le type l'a, prendre le texte du type quand celui du lien n'était que le nom du site. **Commande** : /impeccable harden
- **[P2] Le détour par les offres perd le fil.** Au téléphone, « Voir les offres » pose le lien neuf et son retour « Ajouté en haut de ta page » couvre la croix des offres ; au bureau, une entrée réservée ou un bloc ouvert depuis Intégrations rendent le focus à la page entière. **Pourquoi** : la fenêtre des offres doit ramener à l'écran d'où l'on vient, focus compris. **Correctif** : le bloc neuf reste ouvert sous les offres, et l'on y revient ; le focus revient au bouton ou à la ligne d'origine. **Commande** : /impeccable harden
- **[P2] Le lien partenaire, obligation légale, est caché à deux niveaux.** L'entrée et son aide ont disparu ; il reste un interrupteur nu dans « Plus de réglages ». **Pourquoi** : la loi du 9 juin 2023 impose la mention, et l'affiliation est courante. **Correctif** : reconnaître une adresse d'affiliation (amzn.to, `tag=`, Awin, `ref=`…) et proposer « C'est un lien partenaire ? » sous le champ, comme « En faire… » ; « partenaire », « affiliation », « code promo » dans la recherche. **Commande** : /impeccable clarify

## Signaux d'alerte par persona

**Alex (habitué pressé)** : la lettre « p » ne trouve ni Produit ni Prise de rendez-vous ; aucun bloc de la vitrine sans adresse depuis Ma page, il faut changer d'onglet ; le menu de l'en-tête n'a pas de champ ; il replie vite ses rangées, et la perte du sous-titre est en ligne avant qu'il la voie.

**Sam (lecteur d'écran, clavier)** : le focus tombe sur la page entière dans trois cas (une entrée réservée, Annuler depuis Intégrations, « Annuler mes changements ») ; rien n'annonce le changement de type ; le bouton qui a le focus change de libellé sans prévenir ; « avec une offre » dans Intégrations, « avec Hopla Starter » dans le menu ; le « Voir les offres » d'un encart ne dit pas pour quoi.

**Casey (téléphone, une main)** : le champ ne dit pas qu'une adresse deviendra le bon bloc ; après la flèche de retour, l'adresse attend sans bouton pour la poser ; en Gratuit, l'encart Starter pousse « Texte du bouton » sous le pli ; le retour couvre la croix des offres ; l'interrupteur partenaire est à deux niveaux.

## Observations mineures

- Me soutenir garde le libellé « Adresse » ; les autres types nomment la leur.
- Les lignes cochées sous l'adresse sont irrégulières : aucune pour la vidéo ni pour un soutien.
- Au bureau, le champ « Colle une adresse : un site, une vidéo, un agenda, un produit… » et l'aide du lien neuf disent la même chose l'un sous l'autre.
- « Ce lien s'ouvre directement dans l'app YouTube » côtoie « En faire une vidéo » sans dire ce que la vidéo ajoute.
- Un lien posé vers une page qui déclare un prix n'est jamais relu, donc jamais proposé en produit.
- Au bureau, la rangée saute quand « Plus de réglages » disparaît (un lien devenu prise de rendez-vous).
- Chez Lilian, « Ma dernière vidéo YouTube » est la seule entrée vidéo visible.
- Hors du changement : « C'est fait » pose sa coche dans un rond plein, contre la règle « jamais d'icône sur un fond » ; Cal.com figure parmi les logos de la ligne Prise de rendez-vous d'Intégrations, alors que DESIGN.md l'écarte (illisible à 16 px).
- Détecteur : l'anneau de sélection de l'aperçu touche presque la légende d'une vidéo (3 px).

## Questions à se poser

1. Et si le champ était toute la fonction (« colle une adresse ou cherche un bloc »), avec la liste de six pour seul état vide ?
2. Pourquoi garder secrète, au téléphone, jusqu'au choix de Lien, la chose la plus propre à Hopla de ce parcours ?
3. Après avoir payé pour la vitrine, quel écran prouve que ça valait le coup ?
