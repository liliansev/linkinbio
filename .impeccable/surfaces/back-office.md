# Back office Hopla

## Scope and mode

Mode **Operate**. Ce contrat consigne l'expression observée de la refonte sur `design/back-office-harmonise` ; il ne crée pas une identité et ne prouve pas un déploiement. Il couvre Ma page, Statistiques, Réglages, la gestion de comptes lorsqu'elle est autorisée, les feuilles de personnalisation et la connexion.

## User and task

La personne travaille sur sa propre page, observe son activité ou règle son compte. L'action principale de Ma page est l'ajout d'un bloc ; le rendu éditable donne immédiatement le contexte des modifications. La navigation et l'état de sauvegarde restent communs aux écrans.

## Direction contract

**THESIS:** un seul espace de travail accompagne la création et l'entretien de la page. Les vues de données et de réglages occupent leur surface utile.

**OWN-WORLD:** le système monochrome, Geist, les traits fins et les contrôles arrondis déjà présents dans `DESIGN.md` unifient le shell. La vraie page conserve son thème public dans son propre cadre.

**STORY:** la personne voit où elle est, comprend si son travail est enregistré et accède au geste utile. Elle modifie directement sa page, consulte les données ou ouvre le groupe de réglages concerné.

**FIRST VIEWPORT:** sur desktop, la marque et la navigation à gauche, la barre supérieure et le contenu sous un titre explicite, sans description sous le titre ni fil d'Ariane. Dans Ma page, contenu éditable à gauche et outils à droite. Sur mobile, adresse, sauvegarde et Bien démarrer dans l'en-tête, la page juste dessous, ses deux gestes posés sur la navigation basse. Les statistiques et réglages utilisent l'espace sans téléphone décoratif permanent.

**FORM:** continuation code-led du patch existant, reprise du brief et de l'implémentation. Aucun tirage de direction, classement ou seed n'a été créé pour cette documentation.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Screen invariants

- **Ma page:** la vraie page est éditable. Les outils sont en colonne à droite à partir de (1024px), avec une largeur de (248px) et une position sticky ; sous ce seuil, Ajouter un bloc et Personnaliser forment une rangée posée sur la barre des onglets, et le titre Ma page n'est lu que par les lecteurs d'écran. Bien démarrer y devient un anneau dans l'en-tête, à la place de la photo, qui ouvre ses étapes dans une feuille : la page commence juste sous l'en-tête. Les réseaux restent accessibles par la page et les feuilles. Le nom, la bio, les blocs et leurs gestes ne sont pas remplacés par une seconde maquette.
- **Personnalisation:** les feuilles Design et Réseaux laissent juger le résultat. Sur mobile, un aperçu en direct occupe l'espace au-dessus de la feuille ; sur desktop, une feuille latérale de (400px) garde la page visible. Annuler revient à l'état conservé à l'ouverture ; Terminé ferme la feuille.
- **Statistiques:** KPI en premier, jusqu'à quatre colonnes ; activité et résumé se mettent côte à côte sur grand écran, puis viennent les répartitions. La courbe, les tendances et les chiffres restent interprétables sans dépendre d'une couleur.
- **Réglages:** les groupes s'appellent Ta page, Préférences et Ton compte. Une ligne mène au détail ou porte une bascule. Le détail conserve un retour explicite et restitue le focus. L'abonnement s'affiche selon les droits et la configuration.
- **Connexion:** marque et carte centrées, largeur maximale (420px), champ d'adresse et action principale, puis état d'envoi, confirmation ou erreur. Les CGU et le lien de connexion périmé reprennent la même enveloppe : le fond de l'espace, la même marque, une carte et le même titre d'écran.
- **Premiers pas:** le titre de chaque question au rôle de titre d'écran, les mêmes boutons que le reste du back office et une progression qui respecte le mouvement réduit.
- **Comptes:** l'entrée n'est visible que si l'API du compte principal existe. Le cas ordinaire garde trois onglets.

## States and constraints

Conserver l'enregistrement automatique, ses états Enregistrement…, Enregistré et Non enregistré, les toasts d'annulation, les erreurs de formulaire et le chargement. L'aperçu mobile plein écran reste accessible depuis l'en-tête et sa fermeture est séparée du contenu.

Le périmètre conserve le français, le tutoiement, les pictogrammes pleins et la séparation des thèmes publics. Les contenus de démonstration servent au rendu. L'existence d'une interface ou d'un état simulé ne démontre pas le fonctionnement d'un paiement, d'un e-mail ou d'une écriture en production.

## Evidence

Sources : `src/admin/Admin.tsx`, `MaPage.tsx`, `OngletStats.tsx`, `OngletReglages.tsx`, `Connexion.tsx`, `ui.tsx`, `src/styles/admin.css` et `../reprise/REPRISE-LOCAL.md`.

Captures locales dans `../../outputs/` : page, stats, réglages, design et connexion sur desktop et mobile, plus `reglages-320.png` et `compte-ordinaire-mobile.png`. Le contrôle visuel indépendant final a demandé la documentation produit manquante sans relever de défaut visuel matériel ; l'état de livraison et les validations exécutées sont à relire dans le rapport de vérification, sans en déduire une publication.
