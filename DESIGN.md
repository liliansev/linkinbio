---
name: Hopla back office
description: Système de l’espace de travail Hopla, extrait de la branche design/back-office-harmonise ; l’encre sur le papier, avec les couleurs de l’accueil (bleu, citron, papier crème) depuis le 22 octobre 2026.
colors:
  ink: "#0a0a0a"
  shell-ink: "#18191b"
  paper: "#ffffff"
  workspace: "#f6f5ef"
  quiet-paper: "#fdfdfc"
  divider: "#e5e5e1"
  control-border: "#deded9"
  secondary: "#656560"
  muted-text: "#666666"
  nav-hover: "#3e40ff"
  nav-current: "#ffffff"
  sidebar: "#292bff"
  shell-divider: "#ececea"
  control-hover: "#f4f4f0"
  error: "#c62828"
  pending: "#d97706"
  blue: "#292bff"
  blue-hover: "#1d1fd6"
  blue-pale: "#e4e4ff"
  blue-veil: "#f3f3ff"
  on-blue: "#dcdcff"
  lime: "#e3fc96"
  lime-hover: "#d4f57c"
  lime-ink: "#233016"
  cream: "#f3eee5"
typography:
  headline:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  panel-title:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: 1.6
  label:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
  caption:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11.5px"
    fontWeight: 500
  field:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
  metric:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  wordmark:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "23px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.035em"
  wordmark-desk:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
  screen-title-desk:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "-0.015em"
  body-desk:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13.5px"
    lineHeight: 1.5
rounded:
  nav: "7px"
  control-desk: "8px"
  segment: "7px"
  segment-group: "10px"
  control: "12px"
  compact-surface: "14px"
  surface: "16px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  control-x: "14px"
  md: "16px"
  mobile-card: "18px"
  lg: "20px"
  card: "22px"
  xl: "24px"
  section: "28px"
  wide: "32px"
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.blue-hover}"
  button-on-blue:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.lime-ink}"
    rounded: "{rounded.control}"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-quiet:
    textColor: "{colors.secondary}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  button-icon:
    textColor: "{colors.secondary}"
    rounded: "{rounded.control}"
    width: "44px"
    height: "44px"
  badge:
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.segment}"
    padding: "2px 6px"
  field:
    backgroundColor: "{colors.quiet-paper}"
    textColor: "{colors.ink}"
    typography: "{typography.field}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.surface}"
    padding: "22px"
  button-desk:
    rounded: "{rounded.control-desk}"
    padding: "0 14px"
    height: "36px"
  button-icon-desk:
    rounded: "{rounded.control-desk}"
    width: "32px"
    height: "32px"
  field-desk:
    typography: "{typography.body-desk}"
    rounded: "{rounded.control-desk}"
    padding: "8px 12px"
    height: "40px"
  nav-item:
    textColor: "{colors.on-blue}"
    rounded: "{rounded.nav}"
    padding: "0 10px"
    height: "44px"
  nav-item-desk:
    typography: "{typography.body-desk}"
    height: "32px"
  nav-item-current:
    backgroundColor: "{colors.nav-current}"
    textColor: "{colors.blue}"
  sidebar:
    backgroundColor: "{colors.sidebar}"
    width: "216px"
  header-desk:
    backgroundColor: "{colors.paper}"
    height: "56px"
  segment:
    textColor: "{colors.muted-text}"
    rounded: "{rounded.segment}"
    padding: "0 10px"
    height: "40px"
  segment-current:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.blue}"
  settings-row:
    textColor: "{colors.ink}"
    padding: "6px 16px"
    height: "56px"
  settings-row-desk:
    textColor: "{colors.ink}"
    padding: "6px 16px"
    height: "48px"
  table-row-desk:
    textColor: "{colors.ink}"
    padding: "0 12px"
    height: "48px"
  switch:
    backgroundColor: "{colors.blue}"
    rounded: "{rounded.pill}"
    width: "40px"
    height: "24px"
  switch-desk:
    backgroundColor: "{colors.blue}"
    rounded: "{rounded.pill}"
    width: "32px"
    height: "18px"
  offer-window-desk:
    backgroundColor: "{colors.paper}"
    rounded: "14px"
    width: "1000px"
  offer-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "14px"
    padding: "19px"
  offer-card-desk:
    rounded: "12px"
    padding: "20px"
  offer-card-featured:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.paper}"
    rounded: "14px"
  offer-price:
    typography: "{typography.metric}"
  badge-offer-for:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.paper}"
    typography: "{typography.caption}"
    rounded: "{rounded.segment}"
  badge-gain:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.lime-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.segment}"
  chart-line:
    backgroundColor: "{colors.blue}"
---

# Design System: Hopla back office

## Overview

**Creative North Star: "Un même espace de travail"**

Ce nom reprend le principe déjà inscrit dans le code : l'édition, les statistiques, les réglages et la connexion appartiennent au même espace. Le système est sobre, clair et compact, avec des surfaces blanches sur un fond de papier doux et une hiérarchie obtenue par la typographie, les espacements et les traits.

Le 22 octobre 2026, Lilian a demandé que le back office soit aussi coloré que l'accueil : il en reprend la palette (le bleu Hopla, le citron, les papiers crème) et sa règle, l'appel prend l'accent de sa surface, bleu sur le papier, citron sur le bleu. Chaque couleur y a un rôle ; aucune n'habille une section.

Cette documentation décrit le système observable de la branche `design/back-office-harmonise`, au 19 octobre 2026, resserré le soir même par la revue finale : un seul jeu de boutons sans pilule, une seule marque, un seul titre d'écran, des pictos sans tuile et aucun sous-titre sous les titres. Elle ne propose pas de nouvelle identité et ne prouve aucune mise en production. Son périmètre est le back office : les thèmes publics rendus dans l'éditeur ou dans un aperçu conservent leurs propres couleurs et fontes. La stratégie des écrans est dans `.impeccable/surfaces/back-office.md`.

**Key Characteristics:**
- Encre noire sur papier blanc, et les couleurs de l'accueil : le bleu pour agir, choisir et lire les chiffres, le citron pour ce qui se gagne, le crème pour la page qu'on regarde.
- Geist pour une hiérarchie de travail compacte.
- Bordures fines et surfaces arrondies, sans ombre sur les cartes ordinaires.
- Pictogrammes pleins, retours visibles et gestes courts.

## Colors

La palette du back office repose sur une encre noire, des neutres légèrement chauds et les trois couleurs de l'accueil. Les valeurs normatives sont dans le frontmatter ; dans le code, ce sont les variables `--adm-*` de `src/styles/admin.css`.

Dans le code hérité, `.adm` inverse les noms de couleur : `white` désigne l’encre, `nuit` le papier et `peche` l’encre. Un texte sur bouton noir utilise donc `text-nuit`. Cette compatibilité est locale au back office. Les rampes du sidecar sont des aides de visualisation synthétiques ; elles ne sont pas des couleurs supplémentaires implémentées dans l’app.

### Primary

- **Encre** (`ink`) : textes explicites et pictogrammes.

### Accents (les couleurs de l'accueil)

- **Bleu Hopla** (`blue`, 7,3:1 sur le blanc) : l'action, la sélection et les données. Le bouton principal (son survol en `blue-hover`), l'interrupteur allumé, le focus, l'onglet ouvert (un trait de (2px) et son nom), le segment choisi, la rangée ouverte de Ma page (sur `blue-veil`), les liens, la courbe des stats et les barres des liens et des appareils (sur `blue-pale`, où le bleu garde 5,8:1). Il fait aussi les surfaces qui repèrent : la barre latérale du bureau, l'en-tête du téléphone et les écrans d'entrée (connexion, lien reçu, CGU).
- **Sur le bleu** : le texte est blanc (7,3:1), le texte secondaire `on-blue` (5,4:1), l'onglet courant une pastille blanche au texte bleu, le survol un voile blanc, et le focus passe au citron (6,5:1).
- **Citron** (`lime`, avec son encre `lime-ink`, 12,4:1) : ce qui se gagne et ce qui ressort. « Mis en avant », les mois offerts et l'économie de l'annuel, un écart en hausse, « +23 cette semaine », et l'appel posé sur le bleu (le bouton de l'offre mise en avant, le diamant de l'offre du dessus).
- **Crème** (`cream`) : la page qu'on regarde, à part de l'édition. La colonne de la page au bureau, la page en miniature des premiers pas, l'aperçu du récapitulatif d'achat.
- **Offres** : Starter en bleu sur `blue-pale`, Pro en blanc sur le bleu, Premium en lilas sur la nuit de l'accueil (`#eee0fa` sur `#292530`), partout où leur nom se montre.

### Neutral

- **Encre de l'espace** (`shell-ink`) : couleur du shell et des éléments de navigation actifs.
- **Papier** (`paper`) : cartes, feuilles, navigation mobile et texte sur action noire.
- **Fond de travail** (`workspace`) : arrière-plan qui distingue le shell des cartes.
- **Papier calme** (`quiet-paper`) : barre supérieure, barre latérale et champs.
- **Trait** (`divider`) et **Contour de contrôle** (`control-border`) : séparation des régions et limites des boutons secondaires.
- **Secondaire** (`secondary`) et **Texte atténué** (`muted-text`) : descriptions et aides lisibles ; le second correspond aux utilitaires corrigés pour le fond clair.
- **Survol de contrôle** (`control-hover`) : réponse locale sans nouvel accent.
- **Onglet courant** (`nav-current`) : la pastille blanche de la section ouverte dans la barre latérale bleue ; le survol (`nav-hover`, un voile blanc à 10 %) reste dans le bleu, pour que l'endroit où l'on est se voie mieux que celui qu'on survole.
- **Barre latérale** (`sidebar`, le bleu) et **Trait de la coquille** (`shell-divider`) : la barre latérale du bureau et les traits qui séparent l'en-tête du contenu.

Les tokens `error` et `pending` correspondent aux états d'erreur et d'enregistrement en cours. Ils ne constituent pas des accents de marque : le rouge reste au danger et aux erreurs, l'ambre aux alertes (un signalement à traiter). Un écart en baisse prend un rose pâle au texte rouge foncé (`#fdeaea` et `#a51f1f`).

### Named Rules

**The Surface Accent Rule.** Comme sur l'accueil, l'appel prend l'accent de sa surface : bleu sur le papier, citron sur le bleu. Jamais deux appels pleins côte à côte.

**The Role Rule.** Une couleur a un rôle (agir ou se repérer en bleu, gagner en citron, regarder la page sur le crème, alerter en ambre, effacer en rouge) ; aucune n'habille une section. Une information ne tient jamais à la couleur seule : un écart porte son signe, un onglet ouvert son trait, une offre son nom.

**The Public Theme Boundary Rule.** Les couleurs de l'espace de travail ne remplacent pas les variables des pages publiques et de leurs aperçus.

## Typography

**Display Font:** aucune fonte d'affichage distincte dans ce périmètre.
**Body Font:** Geist Variable, avec replis sans empattement définis dans `src/styles/app.css`.

**Character:** une seule famille de travail, avec des tailles proches pour les labels, aides et contenus. Les titres et chiffres structurent l'écran sans prendre la place des actions.

### Hierarchy

- **Headline** : titre d'écran, le même pour les onglets, la connexion, les CGU et les premiers pas (classe `.adm-titre`) ; réduit à (28px) sous (640px). Au téléphone, Ma page ne montre pas le sien : l'en-tête et la barre du bas disent déjà où l'on est, et il reste pour les lecteurs d'écran.
- **Panel title** : nom d'une feuille d'édition, du détail d'un réglage ou d'un prix.
- **Title** : nom d'une carte ou d'un groupe de réglages.
- **Body** : contenu courant ; les composants utilisent aussi des variations locales entre (13px) et (14.5px).
- **Label** : nom de champ et aide courte.
- **Caption** : légende d'onglet mobile, nom sous un picto, axe de courbe, compteur, et badge en semi-gras.
- **Field** : texte saisi, conservé à une taille lisible sur mobile.
- **Metric** : chiffre clé, (24px) à toutes les largeurs ; dans les onglets de la courbe des stats (`.adm-courbe-chiffre`), en chiffres proportionnels. Le prix d'une offre le reprend, au téléphone comme au bureau (`.adm-offre-prix`). Les listes et les tableaux gardent des chiffres tabulaires, alignés à droite.
- **Wordmark** : « Hopla » dans la marque, et nulle part ailleurs ; en petit (`wordmark-desk`) dans la barre latérale du bureau.

### Au bureau

Sur un écran d'au moins (1024px) tenu à la souris ou au pavé (variante Tailwind `bureau:`, `@media (min-width: 1024px) and (pointer: fine)`), le texte se range sur cinq marches : (12px) pour les libellés, légendes et aides, (13.5px) pour le texte courant, (15px) pour les titres de carte, de panneau et d'écran, (18px) pour un titre de dialogue, (24px) pour un chiffre clé. Les tailles écrites pour le doigt se rangent sur la marche la plus proche (`admin.css`) ; une classe `bureau:text-…` posée sur l'élément garde la main. La page publique n'utilise aucune de ces classes et garde sa typographie.

### Named Rules

**The Working Hierarchy Rule.** Le titre nomme l'endroit et le contrôle porte le geste. Aucun sous-titre ne répète un titre d'onglet ; une aide ne paraît que là où le geste ne se comprend pas seul.

## Layout

Au téléphone, le shell partage une barre supérieure d'au moins (72px) et un contenu centré, avec une largeur maximale de (1120px) et des gouttières de (16px).

À partir de (1024px), une barre latérale fixe de (216px) remplace la navigation basse : la petite marque à la hauteur de l'en-tête, les sections (Comptes à part, après un écart de (14px)) et, en bas, le compte, qui s'ouvre sur un menu avec « Me déconnecter ». L'en-tête du bureau est une seule rangée de (56px) : le nom de l'écran à gauche (rôle `screen-title-desk`, c'est le seul titre de l'écran), puis ce qui sert ici, à droite. Ma page y met l'état d'enregistrement, l'adresse courte avec Copier, Voir ma page et le bouton noir Ajouter un bloc ; Réglages, l'état ; Stats, la période ; Comptes, Inviter. Chaque onglet y pose son geste par `ActionEntete`. Pas de barre vide, pas de titre qui répète le menu. Le contenu est posé sur le blanc. Un détail qui ne tient pas dans une ligne de réglage s'ouvre en sous-page (`SousPage`, `PoserFil`) : l'en-tête devient un fil court, « ‹ Réglages / Facturation », dont le premier terme ramène à l'écran et rend le focus à la ligne qui l'a ouvert ; au téléphone, un retour se pose au-dessus du titre. Comptes pose sa barre d'onglets et sa recherche sur toute la largeur, sous l'en-tête, puis son tableau.

La forme suit la largeur et la densité suit la souris : une tablette en paysage a la barre latérale, avec des cibles de (44px).

La navigation mobile tient compte de la zone sûre inférieure et réserve (64px) à ses boutons. Le contenu garde un espace bas pour rester accessible au-dessus d'elle. Sous (1024px), les gestes de Ma page (Ajouter un bloc, Personnaliser) se posent sur cette barre, à portée du pouce : les deux font un seul socle blanc sous un seul trait, et la page commence juste sous l'en-tête. Dans ce même en-tête, tant que la page n'est pas prête, l'anneau de Bien démarrer prend la place de la photo et ouvre ses étapes dans une feuille. Le rythme récurrent utilise de petits écarts entre contrôles et des écarts plus larges entre groupes, selon les tokens de spacing.

Les cartes courantes passent de leur padding desktop au token `mobile-card` sous (640px). Les feuilles montent du bas sur téléphone, deviennent centrées ou latérales à partir de (640px), et suivent l'espace réellement visible avec le clavier. Les compositions propres à Ma page, aux statistiques, aux réglages et à la connexion sont décrites dans le contrat de surface.

## Elevation & Depth

Les cartes ordinaires sont plates : leur papier, leur bordure et le fond de travail établissent la profondeur. Les ombres sont réservées à la page éditée, aux feuilles, aux retours flottants et à la sélection dans un contrôle segmenté. Elles restent diffuses. Le sidecar conserve les valeurs exactes que le frontmatter ne peut pas exprimer.

### Shadow Vocabulary

- **Page éditée** : l'ombre légère détache la vraie page du shell ; au bureau, la page dans un téléphone collé à droite : un cadre `#141414` de (9px) autour de (390px) d'écran, arrondi (54px), ombre `0 24px 60px -24px` à 35 %.
- **Feuille** : l'ombre signale une surface temporaire au-dessus du travail.
- **Segment choisi** : petite ombre locale sur le choix actif.
- **Retour flottant** : contraste inversé et ombre pour le message, sans masquer l'action de la feuille.

### Named Rules

**The Flat Card Rule.** Une carte ordinaire se distingue par son fond et son trait ; ne pas lui attribuer une ombre de fenêtre.

## Shapes

Les contrôles et la navigation utilisent l'arrondi `control`, les cartes et feuilles l'arrondi `surface`. L'adresse, la liste de démarrage, les groupes de lignes et les cartes de choix utilisent `compact-surface`. Les segments, les compteurs et les badges ont une courbure plus serrée (`segment`).

### Named Rules

**The No Pill Rule.** Aucun bouton, lien d'action ou badge en pilule : ce sont des rectangles arrondis. Restent ronds les avatars, les points d'état, les interrupteurs, les pastilles de couleur, la poignée de déplacement, les boutons radio et les pistes de progression.

Les bordures de surface sont fines (1px). Le focus observable est un contour bleu (2px), décalé de (2px) ; sur le bleu, il passe au citron. Les cadres de page et les miniatures ont des rayons propres à leur fonction ; ils ne redéfinissent pas la forme des cartes ordinaires.

## Components

### Buttons

Actions nettes, avec un libellé court et un picto plein lorsque cela aide à reconnaître le geste. Les cinq variantes viennent d'une seule source, `classeBouton` dans `src/admin/ui.tsx`, pour qu'un lien prenne la même allure qu'un bouton. Ne pas ajouter derrière elles un padding ou une hauteur qui les contredit.

- **Primary (`principal`):** bleu Hopla, texte blanc, semi-gras, un bleu plus foncé au survol ; cible minimale (44px), avec pression à l'échelle (0.98) et opacité réduite si désactivé. Il porte l'action principale de la vue. Posé sur le bleu (la carte de l'offre mise en avant), il passe au citron, son texte à l'encre citron.
- **Au bureau (`bureau:`):** chaque variante descend à (36px) de haut, arrondi (8px), graisse moyenne ; le bouton icône à (32px). Un bouton écrit à la main avec `min-h-11` suit la même règle.
- **Secondary (`secondaire`):** papier blanc, contour léger, texte noir et graisse moyenne. Le survol modifie le fond et le trait.
- **Danger (`danger`):** rouge plein, texte blanc ; réservé à l'effacement définitif, après une confirmation.
- **Quiet (`discret`):** texte secondaire sans fond ; Annuler, Plus tard, Me déconnecter.
- **Icon (`icone`):** carré de (44px) au picto secondaire, pour fermer, revenir ou retirer.
- **Focus:** contour commun explicite. Les transitions de couleur durent généralement (150ms).

### Cards / Containers

Conteneurs blancs, arrondis et bordés. Un titre de carte et son action éventuelle occupent la même rangée. Dans les stats, les encarts (`.adm-encart`) sont un trait fin sur le blanc, arrondi (12px), (10px) à partir de (1024px). La phrase du haut écrit son nombre de vues en bleu. Les chiffres clés sont les onglets de leur courbe, dans un seul encart : deux par rangée et (72px) de haut au téléphone, quatre de front et (84px) à partir de (640px) ; l'onglet choisi passe au blanc avec un trait bleu de (2px) en bas, et son écart se lit en citron s'il monte, en rose s'il baisse, en gris s'il ne bouge pas, toujours avec son signe. La courbe est lisse et ne dépasse jamais ses points (interpolation monotone, `src/lib/courbe.ts`, la même que sur l'accueil) : un trait bleu de (2.25px) sur un dégradé du même bleu, dense sous le point le plus haut (26 %) et effacé sur la ligne de base, le dernier chiffre écrit en bleu au bout. Une répartition (liens, réseaux, appareils) est une liste dont chaque libellé porte derrière lui une barre pâle, à la longueur de sa part : le bleu pâle pour les liens et les appareils, une teinte claire de sa marque pour un réseau (son logo dans sa couleur, son nom à l'encre), le gris `#efefec` pour une provenance sans marque ; le nombre et le pourcentage à droite au gris secondaire (6,5:1).

Dans une feuille, une liste de lignes est un groupe bordé sans fond (`.adm-groupe`). Dans une carte, les groupes deviennent de simples traits de séparation : jamais de boîte grise dans une carte. Un choix entre cartes (formule, période) est marqué par un contour bleu de (2px) sur le voile bleu, et par sa coche.

### Badges

Rectangle à l'arrondi `segment`, fond d'encre à 7 %, texte au rôle `caption` en semi-gras (`classeBadge`). Le badge d'une offre prend ses couleurs (Starter, Pro, Premium, voir Colors). Dans la fenêtre des offres, celui de l'offre qui débloque la fonction demandée est bleu plein (« Pour tes couleurs »), celui de son offre actuelle bleu pâle, et les mois offerts et l'économie de l'annuel s'écrivent dans l'étiquette citron. Un état d'alerte n'est pas un badge : dans Comptes, « Signalé » et « Suspendu » s'écrivent à l'ambre, précédés de leur picto, et seul le compteur des signalements à traiter prend un fond ambre ; le compteur de l'onglet ouvert passe au bleu pâle.

### Inputs / Fields

Fond calme, contour discret, arrondi de contrôle et texte de saisie au rôle `field`. Hauteur minimale observée (48px) ; au bureau, (40px), arrondi (8px) et texte de (13.5px) (`field-desk`). Le contour se renforce au survol et au focus. Une erreur est attachée au champ par `aria-invalid` et `aria-describedby` et s'affiche sous lui.

### Navigation

La marque (`Marque.tsx`) est la même partout : le symbole de (28px), puis « Hopla » au rôle `wordmark`, sans accroche. Sur le bleu (la barre latérale, les écrans d'entrée), elle passe en blanc, le dessin du symbole en bleu (`surBleu`). La connexion, les CGU et le lien de connexion périmé la reprennent telle quelle ; la barre latérale du bureau la prend en petit (`petite` : (22px) et `wordmark-desk`). Aucun fil d'Ariane ne répète la navigation : seule une sous-page en montre un, d'un seul cran, à la place du titre de l'en-tête.

Sur desktop, la barre latérale est bleue : une rangée de (32px) à la souris ((44px) au doigt) associe un picto plein MingCute (16px, `nav-*` dans `icones.ts`) et un nom en `on-blue`, sans compteur. Le choix actif est une pastille blanche au texte bleu, en semi-gras (`nav-current`) ; le survol, un voile blanc (`nav-hover`). L'offre du dessus s'y lit en une ligne, son diamant en citron. Sur mobile, l'en-tête est bleu (l'adresse en blanc, Copier en picto seul et blanc, Aperçu sur un voile blanc puis, sous (390px), son œil seul, sans voile, l'anneau de « Bien démarrer » en citron) et la navigation devient une barre basse blanche avec picto (21px) et label court ; l'onglet courant se reconnaît à son picto et à son label en bleu, en semi-gras, sans pastille de fond.

### Segments

Groupe de choix exclusifs neutre, composé de boutons avec une cible minimale de (40px). La sélection gagne un papier blanc, son nom en bleu et une ombre courte. Le motif radio conserve un seul arrêt de tabulation et se parcourt avec les flèches.

### Settings rows

Réglages tient sur une seule page, (680px) au plus : des groupes titrés (`Groupe`), chacun une liste bordée de lignes (`.adm-lignes`, arrondi (12px), (10px) au bureau). Une ligne (`Ligne`, `LigneBascule`, `LigneLien` dans `ui.tsx`) porte son nom à gauche, sa valeur au gris secondaire, son contrôle à droite : un bouton au contour, une bascule ou un chevron. Elle mesure (56px), (48px) au bureau, sous un trait de (1px) `#efefec`. À partir de (640px), la valeur se range à droite du nom et se coupe d'une ellipse ; plus étroit, elle passe dessous, sur deux lignes au plus. Pas de picto, pas de tiroir : ce qui ne tient pas dans une ligne s'ouvre dans une fenêtre ou une sous-page. Une fonction réservée montre le badge de son offre (« Starter ») et un chevron qui ouvre la fenêtre des offres ; le badge s'écrit sans picto décoratif. Les liens légaux et l'adresse de contact passent en pied de page, au rôle `caption`.

Intégrations (22 octobre 2026) reprend cette page de lignes, (680px) au plus, en trois groupes : Newsletter, Automatisations, Sur ta page. Ici, chaque ligne commence par le logo de son outil, seul, dans une boîte de (20px) : la couleur de la marque, foncée s'il le faut pour se lire à 4,5:1 sur le blanc, ou l'encre quand la marque est noire ou jaune (Mailchimp, Kit, Patreon) ; l'enveloppe Phosphor, un peu plus grande, pour un outil sans logo libre, et (4px) de plus pour les logos bas (le mot de Kit, le graphe de n8n). Jamais un logo sur un fond ou dans un cadre : de Brevo, le B sans son rond ; de Zapier, son astérisque, pas le mot dans un carré. Une ligne de Sur ta page porte le picto plein du bloc, puis, avant le chevron, jusqu'à trois logos de (16px) des outils qu'il accueille (deux sous (380px)) : des symboles, jamais un mot illisible à cette taille (Malt, son symbole seul ; Cal.com, absent), ni un logo pris dans son carré (Google Agenda, absent). L'outil branché dit « Branché » en valeur, avec sa liste. Un outil s'ouvre en sous-page (« ‹ Intégrations / Brevo ») : la clé, puis la liste choisie par son nom dans une liste à coche (`ListeChoix`), sans identifiant à recopier ; branché, un groupe de lignes (la liste, la clé masquée, les inscrits à renvoyer, Débrancher en rouge).

### Tables

Au bureau, Comptes est un tableau (`.adm-tableau`, colonnes fixes) : en-têtes de (12px) au gris secondaire, rangées de (48px) séparées d'un trait, survol `#fafaf9`, nombres alignés à droite en chiffres tabulaires, menu « … » de (32px) en bout de ligne. Page, e-mail, offre, vues sur 30 jours, dernière connexion en mots (« Aujourd’hui », « 11 oct. »), statut. Les onglets du tableau portent un compteur ; la recherche ignore les accents et les majuscules. Sous (1024px), le tableau devient une liste : une ligne de (64px) au moins par compte, le pseudo, puis l'e-mail et le reste en gris, et le statut seulement s'il alerte.

### Switches

Piste de (40px) sur (24px), pastille blanche de (18px), cible tactile étendue ; au bureau, (32px) sur (18px), pastille de (14px) (`switch-desk`). Allumée, la piste est bleue ; éteinte, à 45 % d'encre, soit 3:1 sur le papier, pour qu'on voie l'interrupteur et son état (WCAG 1.4.11). Le déplacement et l'étirement à la pression répondent au geste. L'état est porté par `role="switch"` et `aria-checked`.

### Sheets and feedback

Les feuilles nomment leur tâche, gardent la fermeture accessible et gèrent le focus. Les mouvements d'entrée et de sortie sont courts et décélérés ; `prefers-reduced-motion` retire les animations prévues. Les retours utilisent un message explicite, et proposent Annuler lorsque l'action le permet. L'état d'enregistrement est le même au téléphone et au bureau : une coche suivie de « Enregistré », un point gris qui bat pendant l'envoi ; seul l'échec passe au rouge. Au bureau, il ne se montre que sur les écrans où l'on écrit (Ma page, Réglages), ou quand il a quelque chose à dire.

Une confirmation ou un formulaire court (Inviter, Supprimer mon compte, Suspendre, Retirer de la liste) s'ouvre dans une petite fenêtre (`Feuille` avec `petite`) : (440px) de large, arrondi (12px), titre de (15px) au bureau, le geste définitif à droite. Au téléphone, elle monte du bas comme les autres feuilles.

Au bureau, Ma page met l'édition à gauche et la page à droite (direction A, 21 octobre 2026). La colonne d'édition mesure (760px) au plus ; ses onglets Contenu et Design, de (44px), restent collés sous l'en-tête, l'onglet choisi en bleu, souligné d'un trait bleu de (2px). La liste des blocs est un seul encart au trait fin, arrondi (10px) : une rangée de (44px) par bloc ((52px) au doigt), séparée d'un trait `#efefec`, survol `#fafaf9`, la rangée ouverte sur le voile bleu (`blue-veil`), son picto en bleu. On y lit la poignée, le picto plein du bloc, son nom en (13.5px) moyen, son adresse en gris, « Mis en avant » en étiquette citron de (20px), les pictos d'état, les clics, puis deux gestes de (28px) au trait : l'œil et le menu « … ». Sous (480px) de colonne, l'adresse s'efface et l'étiquette devient une étoile. Les réglages d'un bloc se déplient dans sa rangée, alignés sous son nom : les champs (deux de front à partir de (560px) de colonne), « Visible sur ma page » et « Mis en avant », puis « Plus de réglages » derrière une seule ligne qui dit ce qui est réglé, avec ses sections titrées en (12px) semi-gras et ses rangées de (36px), le libellé à gauche et la valeur à droite (`.adm-valeur`, (32px)). Pas de Terminé : ce qui est valable s'enregistre seul. La colonne de la page, sur le papier crème de l'accueil (`cream`), garde le téléphone collé sous l'en-tête, réduit pour tenir dans la hauteur. Sur la page, la sélection est un anneau de (2px) à la couleur du texte du thème, jamais une couleur du shell : il se lit sur tous les thèmes.

Le parcours d'achat (20 octobre 2026). Une fonction réservée, les stats ou Réglages ouvrent les offres dans une fenêtre par-dessus l'écran en cours (`FenetreOffres` dans `Offres.tsx`, une `Feuille` `large` et `nue`) : la fermer rend l'écran tel qu'il était, rangée ouverte comprise. Au bureau, elle mesure (1000px) au plus, arrondi (14px), avec une ombre de fenêtre ; son en-tête porte le titre, le badge « 3 mois offerts », la bascule Mensuel / Annuel (un segment) et la croix. Dessous, les quatre offres de front, en cartes au trait de (1px) : le nom, le prix au rôle `metric`, puis, à l'année, « au lieu de 108 € » au gris lisible (`#5f5f5a`, 6,4:1, jamais barré) et l'économie réelle dans l'étiquette citron (« 29 € d'économie », calculée depuis `OFFRES`), le bouton, et ce que l'offre ajoute, ses coches en bleu. L'offre qui débloque la fonction demandée est la carte bleue de l'accueil (`offer-card-featured`) : ses mots en blanc et en `on-blue`, ses coches, son badge et son bouton en citron, sa ligne en semi-gras ; sans fonction, c'est l'offre juste au-dessus de la sienne qui passe devant. Premium dit « Bientôt ». Au téléphone, la fenêtre prend l'écran : la bascule, quatre onglets, une carte à la fois dans un rail qui s'aimante (la suivante dépasse, les autres sont inertes), et un seul bouton en bas, celui de l'offre en vue, avec son prix. Posée sur une autre fenêtre (les offres par-dessus Ajouter), une `Feuille` ne rajoute pas de voile : un seul assombrissement, celui du dessous.

Choisir ouvre le récapitulatif dans la même fenêtre : « ‹ Les offres », la période en deux cartes, ce qu'on paie aujourd'hui (pour un abonné qui change d'offre, la différence au prorata), la prochaine échéance, l'absence d'engagement, ce qu'on débloque et, au bureau, la page telle qu'elle sera ; puis « Payer avec Creem », au signe `ui-ouvrir`, et dessous la note au gris (prix TTC, ce que fait Creem, le lien vers les conditions d'utilisation). Au retour, une fenêtre moyenne dit « On active ton offre… » tant que le webhook signé n'est pas passé, puis « C'est fait, tu es en Starter », ce qui vient de s'ouvrir (la fonction demandée en tête) et un geste pour s'en servir (« Essayer tes couleurs » ouvre le Design sur Couleurs ; « Programmer ce bloc » rouvre le bloc d'où l'on était parti, sur la règle tout juste débloquée). Après trente secondes sans webhook, elle dit que l'offre arrive et qu'on peut fermer. L'offre ne s'accorde jamais d'après l'adresse de retour. Facturation est une sous-page de Réglages, en lignes : l'offre et « Changer d'offre », le prix, la prochaine échéance (ou la fin d'une offre résiliée), puis la carte, les factures et « Résilier mon abonnement » (le nom que lui donnent les conditions d'utilisation), qui mènent au portail client de Creem ; au téléphone, ce dernier bouton passe sous sa phrase (`.adm-ligne-pile`).

Un menu (le compte, puis les actions d'un bloc ou d'une ligne, la période) est une petite surface blanche bordée, avec une ombre courte : les flèches le parcourent, Échap le referme et rend le focus à son bouton (`Menu` dans `ui.tsx`). Les durées et courbes observées figurent dans le sidecar.

## Do's and Don'ts

### Do:

- **Do** conserver l'encre sur le papier, le blanc sur le bleu et l'encre citron sur le citron, aux contrastes mesurés (Colors).
- **Do** donner son rôle à chaque couleur : le bleu pour agir, choisir et lire les chiffres, le citron pour ce qui se gagne, le crème pour la page.
- **Do** reprendre Geist et la hiérarchie des rôles déjà utilisés.
- **Do** conserver un focus visible, les libellés et les états d'enregistrement explicites.
- **Do** utiliser les pictogrammes Phosphor pleins et monochromes pour ce qu'on montre (un réseau, un bloc, une règle, un état), et les signes de commande au trait (`ui-*`) pour les gestes (fermer, ajouter, déplier, copier, ouvrir), sans mêler les deux dans une même rangée. La barre de navigation prend les pictos pleins MingCute (`nav-*`, 22 octobre 2026).
- **Do** poser une icône seule : en couleur quand elle doit ressortir (le bleu d'un choix, la couleur d'un réseau), à l'encre sinon. Le choix pris se dit par sa couleur, un trait ou un point dessous, jamais par un rond plein derrière lui.
- **Do** garder les transitions brèves et respecter le mouvement réduit.

### Don't:

- **Don't** poser une couleur pour décorer, ni un dégradé ailleurs que sous une courbe de stats.
- **Don't** mettre deux appels pleins côte à côte, ni un bouton bleu sur le bleu : sur le bleu, l'appel est citron.
- **Don't** remplacer les couleurs ou la typographie des thèmes publics par celles du shell.
- **Don't** transformer chaque carte en fenêtre ombrée.
- **Don't** utiliser d'emoji ou de picto en duotone dans cet espace.
- **Don't** faire un bouton en pilule, ni poser une icône sur un fond (tuile, pastille, rond, voile au survol) ou dans un cadre (22 octobre 2026, Lilian : « juste l'icône, d'une couleur ou pas »). Un bouton ou une étiquette qui porte un libellé garde sa forme ; une photo, un avatar et une pastille de couleur sont du contenu, pas des fonds d'icône.
- **Don't** écrire un sous-titre explicatif sous un titre d'onglet, ni un fil d'Ariane qui répète la navigation.
- **Don't** dire « en ligne » ou « réussi » en vert : l'encre suffit, et le citron dit ce qui se gagne, pas ce qui a marché.
- **Don't** imbriquer une boîte grise dans une carte.
- **Don't** présenter une capture locale ou ce document comme une preuve de mise en production.
