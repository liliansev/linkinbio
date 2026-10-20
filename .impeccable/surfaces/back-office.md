# Back office Hopla

## Scope and mode

Mode **Operate**. Ce contrat consigne l'expression observée de la refonte sur `design/back-office-harmonise` ; il ne crée pas une identité et ne prouve pas un déploiement. Il couvre Ma page, Stats, Réglages, la gestion de comptes lorsqu'elle est autorisée, les feuilles de personnalisation et la connexion.

## User and task

La personne travaille sur sa propre page, observe son activité ou règle son compte. L'action principale de Ma page est l'ajout d'un bloc ; le rendu éditable donne immédiatement le contexte des modifications. La navigation et l'état de sauvegarde restent communs aux écrans.

## Direction contract

**THESIS:** un seul espace de travail accompagne la création et l'entretien de la page. Les vues de données et de réglages occupent leur surface utile.

**OWN-WORLD:** le système monochrome, Geist, les traits fins et les contrôles arrondis déjà présents dans `DESIGN.md` unifient le shell. La vraie page conserve son thème public dans son propre cadre.

**STORY:** la personne voit où elle est, comprend si son travail est enregistré et accède au geste utile. Elle modifie directement sa page, consulte les données ou ouvre le groupe de réglages concerné.

**FIRST VIEWPORT:** sur desktop, la marque et la navigation à gauche, la barre supérieure et le contenu sous un titre explicite, sans description sous le titre ni fil d'Ariane ; seule une sous-page de Réglages remplace le titre par un fil d'un cran (« ‹ Réglages / Les offres »). Dans Ma page, la page au centre d'une toile, en vraie largeur de téléphone, et ses réglages dans un panneau à droite quand on en ouvre un. Sur mobile, adresse, sauvegarde et Bien démarrer dans l'en-tête, la page juste dessous, ses deux gestes posés sur la navigation basse. Les statistiques et réglages utilisent l'espace sans téléphone décoratif permanent.

**FORM:** continuation code-led du patch existant, reprise du brief et de l'implémentation. Aucun tirage de direction, classement ou seed n'a été créé pour cette documentation.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Screen invariants

- **Ma page (direction B, « la page au centre », 20 octobre 2026):** la vraie page est éditable. À partir de (1024px), elle tient dans un cadre de (390px) (arrondi (28px), ombre de page éditée) au centre d'une toile `#f3f3f1`, sous une petite barre collante : Design, puis la vue téléphone (à modifier) ou ordinateur (aperçu en lecture, la page à (1280px) réduite). Survoler une rangée de la toile montre les gestes du bloc hors du cadre : la poignée à gauche, l'œil et le menu « … » (Modifier, Dupliquer, Retirer) à droite, des raccourcis à la souris ; le clavier passe par le bloc et son panneau. Cliquer un bloc le sélectionne (anneau de (2px) à la couleur du texte du thème, décalé de (3px) ; le survol, (1px) à 55 %) et ouvre ses réglages dans un panneau NON modal de (380px) à droite : la page reste visible et vivante, chaque frappe s'y voit, une version valable s'enregistre seule (650 ms), sans Terminé ; un champ faux garde le panneau ouvert sur son erreur. Design et Réseaux s'ouvrent dans le même panneau. Un clic sur la toile vide le referme. Bien démarrer se pose au-dessus du cadre, à sa largeur. Sous ce seuil, Ajouter un bloc et Personnaliser forment une rangée posée sur la barre des onglets, et le titre Ma page n'est lu que par les lecteurs d'écran ; un bloc touché ouvre une feuille en bas, le bloc remonté sous l'en-tête au-dessus d'elle, avec Terminé. Bien démarrer y devient un anneau dans l'en-tête, à la place de la photo, qui ouvre ses étapes dans une feuille : la page commence juste sous l'en-tête. Il ne se montre jamais au compte principal, ni à une page déjà vue ou qui a des blocs (faits du serveur). Le nom et la bio n'ont pas de trait permanent : un voile et un trait au survol, l'anneau du thème au focus. Le nom, la bio, les blocs et leurs gestes ne sont pas remplacés par une seconde maquette.
- **Personnalisation:** Design et Réseaux laissent juger le résultat. Sur mobile, un aperçu en direct occupe l'espace au-dessus de la feuille ; sur desktop, ils prennent le panneau de droite de Ma page, à côté de la vraie page. « Annuler mes changements » (menu « … ») revient à l'état conservé à l'ouverture ; fermer garde ce qui a changé, avec un retour qui propose Annuler.
- **Stats (20 octobre 2026):** en tête, « En bref » en une phrase (`enUnePhrase`), sans carte. Puis un seul encart : Vues, Visiteurs, Clics et Taux de clic en une rangée (deux par deux au téléphone) qui sert d'onglets à une grande courbe ; chaque chiffre dit son écart avec la période d'avant. La courbe se parcourt aux flèches et « Voir en tableau » donne les mêmes chiffres jour par jour (par semaine au-delà de 92 jours). La période se choisit dans un petit menu de l'en-tête ; une période que l'offre ne comprend pas porte le nom de l'offre et mène aux offres. Viennent ensuite les répartitions (Liens, Réseaux, Appareils) : une barre pâle derrière le libellé, le nombre et la part à droite, au gris lisible. Rien ne dépend d'une couleur. Tant que personne n'a vu la page, un seul état vide remplace les chiffres : l'adresse à copier et le QR code, sans période ni zéros. Sans Starter, l'écran est réservé : une phrase (les visites se comptent déjà), ce que Starter et Pro ouvrent, « Voir les offres » ; rien ne se charge.
- **Réglages (20 octobre 2026):** une seule page de (680px) au plus, sans tiroirs : les groupes Page (adresse, QR code, aperçu dans Google et les réseaux, deux bascules), Compte (adresse de connexion, stats du lundi, mes données, supprimer) et Abonnement (offre, échéance, facturation), le libellé à gauche et le contrôle à droite. Plus de réglage Langues. L'aperçu Google s'édite dans une fenêtre, la suppression du compte se confirme dans une petite fenêtre en tapant son pseudo. Une sous-page garde un retour explicite et rend le focus à la ligne qui l'a ouverte. Le compte principal n'a ni Abonnement ni suppression ; l'abonnement ne paraît que si le paiement est configuré. Les liens légaux et le contact sont au pied, « Me déconnecter » au téléphone seulement (au bureau, il est dans le menu du compte).
- **Connexion:** marque et carte centrées, largeur maximale (420px), champ d'adresse et action principale, puis état d'envoi, confirmation ou erreur. Les CGU et le lien de connexion périmé reprennent la même enveloppe : le fond de l'espace, la même marque, une carte et le même titre d'écran.
- **Premiers pas:** quatre questions (nom et bio, liens, réseaux, thème), le titre de chaque question au rôle de titre d'écran, les mêmes boutons que le reste du back office et une progression qui respecte le mouvement réduit. Où l'on mettra son lien ne se demande pas : chaque bloc se règle réseau par réseau. Une page encore sans lien termine sur « Ajouter mon premier lien » plutôt que sur le partage.
- **Comptes (20 octobre 2026):** l'entrée n'est visible que si l'API du compte principal existe. Une barre pleine largeur porte trois onglets avec leur compteur (Comptes, Liste d'attente, Signalements, ce dernier à l'ambre tant qu'il en reste à traiter) et la recherche. Au bureau, un tableau : page, e-mail, offre, vues sur 30 jours, dernière connexion, statut et menu « … » (Voir sa page, Renvoyer un lien, Suspendre ou Réactiver, Supprimer). « Inviter » est dans l'en-tête et s'ouvre dans une petite fenêtre ; Suspendre et Supprimer demandent un motif (obligatoire pour suspendre) avant d'agir. Sous (1024px), le tableau devient une liste. Le compte principal n'a pas de menu.

## States and constraints

Conserver l'enregistrement automatique, ses états Enregistrement…, Enregistré et Non enregistré, les toasts d'annulation, les erreurs de formulaire et le chargement. L'aperçu mobile plein écran reste accessible depuis l'en-tête et sa fermeture est séparée du contenu.

Le périmètre conserve le français, le tutoiement, les pictogrammes pleins et la séparation des thèmes publics. Les contenus de démonstration servent au rendu. L'existence d'une interface ou d'un état simulé ne démontre pas le fonctionnement d'un paiement, d'un e-mail ou d'une écriture en production.

## Evidence

Sources : `src/admin/Admin.tsx`, `MaPage.tsx`, `OngletStats.tsx`, `OngletReglages.tsx`, `OngletComptes.tsx`, `Connexion.tsx`, `ui.tsx`, `src/lib/stats.ts`, `src/lib/comptes.ts`, `src/styles/admin.css` et `../reprise/REPRISE-LOCAL.md`.

Captures locales dans `../../outputs/` : page, stats, réglages, design et connexion sur desktop et mobile, plus `reglages-320.png` et `compte-ordinaire-mobile.png`. Le contrôle visuel indépendant final a demandé la documentation produit manquante sans relever de défaut visuel matériel ; l'état de livraison et les validations exécutées sont à relire dans le rapport de vérification, sans en déduire une publication.
