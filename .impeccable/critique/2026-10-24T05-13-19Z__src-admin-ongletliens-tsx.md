---
target: choix ajouter un bloc (série 2)
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/user/linkinbio/src/admin/OngletLiens.tsx"
target_fingerprint: "sha256:9f04da5be43105c6f14820a82573ffc0efb1142d090272d212c34a4c439a4497"
target_path: /home/user/linkinbio/src/admin/OngletLiens.tsx
timestamp: 2026-10-24T05-13-19Z
slug: src-admin-ongletliens-tsx
---
Method: dual-agent (A : revue de design · B : détecteur et navigateur), deux sous-agents isolés, lancés en parallèle. Deuxième et dernière série. B a fini avant A, et A n'a rien vu de B.

# Critique Impeccable : le choix « Ajouter un bloc », série 2 (24 octobre 2026)

Cible : l'arbre de travail après les corrections de la série 1. Un seul champ « Colle une adresse ou cherche un bloc » (`FeuilleAjout` au téléphone, `MenuAjout` et `ChampAjout` au bureau, dans `src/admin/OngletLiens.tsx`), le catalogue et sa recherche (`src/lib/catalogue.ts`), le bloc neuf qui suit son adresse et les gestes « En faire… » (`src/admin/EditeurBloc.tsx`), le détour par les offres et ce qui suit le paiement (`src/admin/Offres.tsx`, `actionApres` dans `src/admin/Admin.tsx`), les raccourcis « Sur ta page » d'Intégrations. Parcouru en direct sur la démo, téléphone 390 px au tactile et bureau 1440 px, compte principal et compte Gratuit avec le paiement simulé : 102 captures.

## Note de santé (Nielsen)

| # | Heuristique | Note | Point clé |
|---|---|---|---|
| 1 | Visibilité de l'état | 3 | « Enregistré », l'aperçu en direct et la phrase de conséquence sont bons ; mais un bloc neuf qui part en ligne à la fermeture n'est signalé que par une bulle de 5 s, et un retour depuis Creem par le bouton retour laisse « Ouverture du paiement… » figé |
| 2 | Correspondance avec le réel | 3 | Les libellés parlent comme les gens, mais la recherche ne connaît que les noms des blocs : « prendre rendez-vous » ne trouve rien, « rdv » trouve ; « Sur ta page » est à la fois un titre de groupe et un état dans Intégrations |
| 3 | Contrôle et liberté | 2 | Sur un bloc neuf, la croix, Échap, le glissé, le retour et un toucher sur la page publient le bloc, alors que « Annuler » juste à côté le jette ; un bloc posé ne redevient plus un simple lien |
| 4 | Cohérence | 2 | Au bureau, deux entrées identiques (une loupe, un plus) ; le badge remplace le chevron dans le choix mais s'y ajoute dans Intégrations ; « Titre » ici, « Texte du bouton » là ; le titre de la feuille ne suit pas un bloc converti ; « aucun résultat » diffère entre téléphone et bureau |
| 5 | Prévention des erreurs | 2 | La page visible au-dessus de la feuille est une cible qui publie ; « Lien partenaire » est proposé sous un Calendly ; Tab jette la recherche ; « Aller » sur une ligne réservée ouvre les offres |
| 6 | Reconnaissance | 3 | Picto et nom, aperçu en direct, l'adresse nomme ce qu'elle devient ; mais l'étape après le paiement ne dit pas quel lien elle transforme, et au bureau la recherche disparaît après les offres |
| 7 | Flexibilité | 3 | « A », coller n'importe où, Cmd ou Ctrl + Entrée, les flèches, Échap qui vide puis ferme ; il manque la conversion après coup et une recherche par intention |
| 8 | Esthétique et minimalisme | 3 | Liste sobre, sans sous-titres ; mais un résultat unique laisse un grand vide dessous, et Intégrations aligne sept badges Pro en colonne |
| 9 | Récupération | 2 | « @lilian » reçoit « Il manque la fin de l'adresse » ; un numéro de téléphone donne « Aucun bloc » sans piste ; une adresse incomplète n'affiche ni n'annonce rien |
| 10 | Aide | 3 | L'aide arrive au bon endroit (une ligne sous l'adresse) ; rien ne fait découvrir « A » ni le collage hors du champ, rien n'explique pourquoi « Lien partenaire » suit chaque adresse |
| **Total** | | **26/40** | **Acceptable, haut de la bande** (24 en série 1) : le collage est réussi ; la fermeture qui publie et la recherche littérale retiennent la note |

## Spécificité du design

**Regard du design (A).** Spécifique dans le geste, standard (et c'est voulu) dans la forme. La forme reprend la feuille de Linktree envoyée par Lilian : une feuille au téléphone, un menu avec son champ au bureau, des rangées picto et nom, sans sous-titres ni fond derrière les icônes. Le geste est propre à Hopla : l'adresse choisit le bloc et le dit en une ligne (« La réservation s'ouvre dans ta page, sans la quitter. »), le prix est lu sur la boutique, les montants PayPal.Me et le bouton Ko-fi sont prêts, « En faire un simple lien » revient en arrière. C'est la réponse exacte à « s'il met le lien, ça détecte que c'est un cal.com ». Occasion manquée : les vrais logos d'Intégrations (Calendly, Ko-fi, Etsy) pourraient porter les rangées d'adresse du choix.

**Scan déterministe (B).** Le CLI ne trouve rien sur `OngletLiens.tsx`, `EditeurBloc.tsx`, `MaPage.tsx`, `Offres.tsx` et `OngletIntegrations.tsx` (exit 0, aussi sans la configuration du projet ; le fichier témoin donne 11 résultats, le moteur fonctionne). Le détecteur injecté dans les vues a à e ne relève qu'un avertissement dans le parcours, l'ombre du menu d'ajout, motif documenté dans DESIGN.md (faux positif). Autres faux positifs, avec leur raison : la consigne « Touche pour modifier, maintiens pour déplacer. » (7,32:1 mesuré sur le rendu), le titre réservé aux lecteurs d'écran, l'adresse de l'en-tête coupée d'une ellipse, la région annoncée de dnd-kit, les lueurs, le halo et les cartes du thème public, l'étiquette citron documentée. Trois vraies cibles trop petites au téléphone : les interrupteurs « Visible » et « Mis en avant » (56×40, `ui.tsx`), Mensuel et Annuel des offres (38 px de haut, sous les 40 px de DESIGN.md), les onglets des offres (89,8×43). Aucun texte sous le seuil de contraste (le plus bas : les textes d'aide, 4,66:1).

**Calques visibles.** Injectés dans les sessions sans tête de B, refermées depuis : aucun calque n'est resté ouvert.

## Impression d'ensemble

Le geste principal, coller une adresse, est léger et juste : c'est le pic du parcours. Les creux sont ailleurs : quand on parle avec ses mots (« prendre rendez-vous », « @lilian », un numéro), le champ se tait ou se trompe ; et la fin du parcours peut publier un bloc qu'on croyait laisser. La plus grande occasion : un champ qui comprend des intentions, et une fermeture qui garde sans publier.

## Ce qui marche

1. **L'adresse choisit le bloc, et le dit.** Calendly, YouTube, PayPal.Me, Ko-fi, Etsy, une page qui affiche un prix : chaque adresse prend le bon bloc, une ligne dit la conséquence, « En faire un simple lien » revient tant que le bloc est neuf.
2. **Une liste vraiment dédoublonnée.** De 12 entrées en trois groupes à 6 (5 en Gratuit), sans sous-titres ; les types sortis restent atteignables par l'adresse, les mots courants (« rdv », « video ») et Intégrations ; l'ancienne « Ma newsletter » ne s'ajoute plus.
3. **Clavier et lecteur d'écran soignés.** Un vrai combobox, le nombre de résultats annoncé, aucun clavier qui monte seul au téléphone ; au bureau « A », coller hors du champ, Cmd ou Ctrl + Entrée, Échap en deux temps ; le focus revient à la ligne d'Intégrations ; les phrases `DEVENU` disent chaque conversion.

## Problèmes prioritaires

- **[P1] Fermer un bloc neuf le publie.** La croix, Échap au bureau, le glissé, le retour du téléphone, un toucher sur la page au-dessus de la feuille et la fermeture du choix avec une adresse tapée ajoutent le bloc à la page publique ; seule « Annuler » le jette. Vu en direct : un Ko-fi collé puis un toucher sur la page, et « Me soutenir » est en ligne ; Échap sur une rangée neuve, et « Exemple » est en tête de la page de Lilian. Les deux fois, la bulle avait disparu avant d'atteindre « Annuler ». C'était un choix (« une adresse collée ne se perd pas d'un geste »), A le conteste. **Pourquoi** : le pied de la feuille promet que rien ne part sans le bouton bleu ; partout ailleurs, fermer veut dire laisser tomber ; la conséquence est publique, et c'est la fin du parcours, donc ce dont on se souvient. **Correctif** : ne publier que par « Ajouter à ma page » ou Cmd ou Ctrl + Entrée ; pour ne rien perdre, garder le brouillon sur l'appareil, ou garder le bloc masqué avec « Afficher » dans la bulle (au choix de Lilian) ; au minimum, une bulle qui tient jusqu'au geste suivant et dit « en ligne ». **Commande** : /impeccable harden
- **[P1] La recherche est littérale, et se tait.** Chaque mot tapé doit commencer un mot du nom (`catalogue.ts`) : « prendre rendez-vous » donne « Aucun bloc » ; « 0612345678 » aussi, alors qu'un lien accepte `tel:` ; « @lilian » n'affiche ni n'annonce rien, puis reçoit « Il manque la fin de l'adresse » ; le message « aucun résultat » du bureau ne donne pas de piste. **Pourquoi** : les gens arrivent avec une intention (« prendre rendez-vous », « vendre », « mon Insta »), pas avec le nom d'un type ; c'est le cas le plus fréquent après le collage. **Correctif** : classer par nombre de mots trouvés (un seul suffit), sans les petits mots ; des intentions dans les mots des types (prendre, réserver, séance, vendre, acheter, payer, don, pourboire, boutique) ; une ligne pour un `@pseudo` (« Ajouter @lilian à tes réseaux ») et pour un numéro (un lien d'appel), annoncée ; « C'est un pseudo » au lieu de l'erreur d'adresse ; un seul message « aucun résultat », avec sa piste et la liste de départ dessous. **Commande** : /impeccable clarify
- **[P2] « Lien partenaire » sous chaque adresse.** La ligne s'ajoute sous un Calendly, un Ko-fi, une vidéo, une fiche Etsy, où elle n'a aucun sens, alors que `lienAffilie` sait reconnaître une adresse d'affiliation. **Pourquoi** : une ligne qui vaut pour toutes les adresses n'aide à en choisir aucune ; c'est exactement le doublon que Lilian décrit. **Correctif** : ne l'ajouter que pour une adresse d'affiliation, juste sous le bloc proposé. **Commande** : /impeccable distill
- **[P2] Le détour par les offres perd le fil.** Après le paiement, le bouton dit « En faire une prise de rendez-vous » sans dire quel lien ; au téléphone, la feuille d'un lien converti garde l'ancien titre (« Calendly » pour « Prendre rendez-vous ») ; au bureau, fermer les offres ouvertes depuis le menu efface la recherche ; revenir de Creem par le bouton retour fige « Ouverture du paiement… ». **Pourquoi** : la personne vient de payer et veut voir son achat servir ; un bouton sans objet, un titre faux ou un bouton figé changent la récompense en doute. **Correctif** : nommer le lien ; titrer la feuille d'après le texte en cours ; garder la recherche du menu et le rouvrir au retour des offres ; relâcher le bouton de paiement quand la page revient du cache de navigation. **Commande** : /impeccable harden
- **[P2] La conversion est à sens unique une fois le bloc posé.** Une prise de rendez-vous posée ne peut plus redevenir un lien (il faut la retirer et la refaire, en perdant sa place, Quand et Pour qui) ; le geste inverse de « C'est un lien partenaire ? » est caché dans « Plus de réglages ». **Pourquoi** : la détection est une proposition, et une proposition sans retour devient une décision imposée ; un compte qui quitte Starter voit sa vitrine sortir de sa page sans moyen d'en garder un lien. **Correctif** : « En faire un simple lien » pour tout bloc d'adresse, neuf ou posé ; « Ce n'est pas un lien partenaire » sous l'adresse, à la place du geste d'origine. **Commande** : /impeccable harden

## Signaux d'alerte par persona

**Alex (habitué, au clavier)** : Échap sur une rangée neuve publie ; Tab dans le menu le ferme et jette la saisie ; fermer les offres efface sa recherche ; « prendre rendez-vous », « 0612345678 » et « @lilian » mènent à des impasses ; un bloc posé ne redevient pas un simple lien.

**Sam (lecteur d'écran, clavier seul)** : rien n'est annoncé en mode saisie (adresse incomplète, « @lilian ») ; le focus retombe au début du document après « Annuler » dans la bulle, après un bloc ouvert depuis Intégrations au téléphone, et après l'étape qui suit le paiement ; l'annulation dure 5 s, sans réglage ; la feuille d'un bloc converti s'annonce sous l'ancien nom ; un Coller refusé marque le champ en erreur alors que rien n'y est tapé.

**Casey (téléphone, une main, interrompue)** : un toucher sur la page au-dessus de la feuille publie le bloc neuf ; en Gratuit, avec « rdv », la touche « Aller » du clavier ouvre les offres ; revenir de Creem par le bouton retour fige le paiement ; après un achat lancé depuis Intégrations, la flèche dit « Revenir au choix du bloc » et non Intégrations.

## Observations mineures

1. Au téléphone, Coller coupe le texte d'aide du champ en « Colle une adresse ou cherche ».
2. La feuille et le menu gardent la hauteur de la liste pleine : sous un seul résultat ou un message, un grand vide fait croire à un chargement.
3. Un Coller refusé passe le champ en rouge et en `aria-invalid` ; le message suffit.
4. Le badge d'offre remplace le chevron dans le choix, mais s'y ajoute dans Intégrations : sans chevron, une ligne réservée se lit comme désactivée.
5. En Gratuit, deux entrées de départ sur cinq sont réservées.
6. Dans un bloc neuf en Gratuit, la phrase Starter tombe au milieu du formulaire, entre le texte et le sous-titre, au lieu de se poser sous l'adresse.
7. Sur « C'est fait », « déjà sur ta page », accolé à la mention retirée, se lit à l'envers ; « Déjà fait » serait clair.
8. Sur « C'est fait », une coche au trait côtoie des pictos pleins dans la même liste.
9. Après un achat lancé depuis Intégrations, la flèche du bloc neuf mène au choix des blocs, pas à Intégrations.
10. Bulles : 2,6 s pour un message, 5 s avec Annuler ; au bureau, la bulle couvre une rangée.
11. Le même champ s'appelle « Titre » pour une vidéo et « Texte du bouton » pour un lien.
12. Un lien mis en avant devenu « Me soutenir » perd sa mise en avant sans le dire.
13. Un lien devenu vidéo perd le texte lu par Hopla au profit de « Ma vidéo ».
14. Les guillemets des offres prennent des espaces ordinaires : « » » peut finir seul à la ligne.
15. Au bureau, deux entrées identiques à 60 px l'une de l'autre (le menu de l'en-tête avec une loupe, le champ de la liste avec un plus).
16. Au bureau, le champ de la liste ne montre pas la liste de départ au focus, quand le menu la montre tout de suite.
17. Au bureau, l'œil traverse l'écran : le menu s'ouvre en haut à droite, la rangée neuve apparaît en haut à gauche.
18. Au bureau, Échap après « A » rend le focus au bouton de l'en-tête, pas à l'endroit où l'on était.
19. Tab ferme le menu et jette la saisie.
20. Entrée ou « Aller », sur une ligne active réservée, ouvre les offres sans prévenir.
21. Une page d'atelier qui affiche un prix devient « Produit », avec « Tes visiteurs l'achètent sur… » : juste pour une boutique, étrange pour un stage.
22. Juste après l'achat de Starter, la barre latérale propose déjà Pro.
23. Dans Intégrations, « Sur ta page » est à la fois le titre du groupe et l'état d'une ligne.
24. Dans Intégrations, sept badges Pro pleins s'alignent dans le groupe Newsletter.
25. La fenêtre des offres dit la remise trois fois, et Premium « Bientôt » occupe une carte sans bouton (voulu par DESIGN.md).
26. L'ancien bloc « Ma newsletter » de Lilian s'ouvre sans chemin vers la Liste e-mail qui le remplace.
27. DESIGN.md parle encore d'un « bouton noir Ajouter un bloc », qui est bleu.
28. DESIGN.md range Intégrations dans l'ancien ordre (Newsletter, Automatisations, Sur ta page).

## Questions à se poser

1. Un bloc doit-il pouvoir être en ligne sans qu'on ait appuyé sur « Ajouter à ma page » ?
2. Et si la recherche cherchait des intentions plutôt que des noms de blocs ?
3. Au bureau, lequel garder : le bouton de l'en-tête ou le champ au-dessus de la liste ?
