---
name: Hopla back office
description: Système monochrome de l’espace de travail Hopla, extrait de la branche design/back-office-harmonise.
colors:
  ink: "#0a0a0a"
  shell-ink: "#18191b"
  paper: "#ffffff"
  workspace: "#f7f7f5"
  quiet-paper: "#fdfdfc"
  divider: "#e5e5e1"
  control-border: "#deded9"
  secondary: "#656560"
  muted-text: "#666666"
  nav-hover: "#f2f2ef"
  nav-current: "#ebebe7"
  sidebar: "#fafaf9"
  shell-divider: "#ececea"
  control-hover: "#f4f4f0"
  error: "#c62828"
  pending: "#d97706"
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
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.03em"
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
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "#30302e"
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
    textColor: "#55554f"
    rounded: "{rounded.nav}"
    padding: "0 10px"
    height: "44px"
  nav-item-desk:
    typography: "{typography.body-desk}"
    height: "32px"
  nav-item-current:
    backgroundColor: "{colors.nav-current}"
    textColor: "{colors.ink}"
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
    textColor: "{colors.ink}"
  settings-row:
    textColor: "{colors.ink}"
    padding: "12px 16px"
    height: "68px"
  switch:
    backgroundColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    width: "40px"
    height: "24px"
  switch-desk:
    backgroundColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    width: "32px"
    height: "18px"
---

# Design System: Hopla back office

## Overview

**Creative North Star: "Un même espace de travail"**

Ce nom reprend le principe déjà inscrit dans le code : l'édition, les statistiques, les réglages et la connexion appartiennent au même espace. Le système est sobre, clair et compact, avec des surfaces blanches sur un fond gris doux et une hiérarchie obtenue par la typographie, les espacements et les traits.

Cette documentation décrit le système observable de la branche `design/back-office-harmonise`, au 19 octobre 2026, resserré le soir même par la revue finale : un seul jeu de boutons sans pilule, une seule marque, un seul titre d'écran, des pictos sans tuile et aucun sous-titre sous les titres. Elle ne propose pas de nouvelle identité et ne prouve aucune mise en production. Son périmètre est le back office : les thèmes publics rendus dans l'éditeur ou dans un aperçu conservent leurs propres couleurs et fontes. La stratégie des écrans est dans `.impeccable/surfaces/back-office.md`.

**Key Characteristics:**
- Encre noire, papier blanc et gris neutres.
- Geist pour une hiérarchie de travail compacte.
- Bordures fines et surfaces arrondies, sans ombre sur les cartes ordinaires.
- Pictogrammes pleins, retours visibles et gestes courts.

## Colors

La palette du back office repose sur une encre noire et des neutres légèrement chauds. Les valeurs normatives sont dans le frontmatter.

Dans le code hérité, `.adm` inverse les noms de couleur : `white` désigne l’encre, `nuit` le papier et `peche` l’encre. Un texte sur bouton noir utilise donc `text-nuit`. Cette compatibilité est locale au back office. Les rampes du sidecar sont des aides de visualisation synthétiques ; elles ne sont pas des couleurs supplémentaires implémentées dans l’app.

### Primary

- **Encre** (`ink`) : textes explicites, pictogrammes, boutons principaux, focus et courbe principale.

### Neutral

- **Encre de l'espace** (`shell-ink`) : couleur du shell et des éléments de navigation actifs.
- **Papier** (`paper`) : cartes, feuilles, navigation mobile et texte sur action noire.
- **Fond de travail** (`workspace`) : arrière-plan qui distingue le shell des cartes.
- **Papier calme** (`quiet-paper`) : barre supérieure, barre latérale et champs.
- **Trait** (`divider`) et **Contour de contrôle** (`control-border`) : séparation des régions et limites des boutons secondaires.
- **Secondaire** (`secondary`) et **Texte atténué** (`muted-text`) : descriptions et aides lisibles ; le second correspond aux utilitaires corrigés pour le fond clair.
- **Survol de navigation** (`nav-hover`) et **Survol de contrôle** (`control-hover`) : réponse locale sans nouvel accent.
- **Onglet courant** (`nav-current`) : le gris uni de la section ouverte dans la barre latérale ; le survol (`nav-hover`) est plus pâle que lui, pour que l'endroit où l'on est se voie mieux que celui qu'on survole.
- **Barre latérale** (`sidebar`) et **Trait de la coquille** (`shell-divider`) : la barre latérale du bureau et les traits qui la séparent de l'en-tête et du contenu.

Les tokens `error` et `pending` correspondent aux états d'erreur et d'enregistrement en cours. Ils ne constituent pas des accents de marque. Les variantes d'alerte déjà présentes dans le code restent contextuelles.

### Named Rules

**The Monochrome Rule.** Le back office garde des actions et contenus neutres ; la couleur est réservée aux alertes, jamais à décorer une section.

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
- **Metric** : valeur statistique, (30px) à toutes les largeurs, avec chiffres tabulaires.
- **Wordmark** : « Hopla » dans la marque, et nulle part ailleurs ; en petit (`wordmark-desk`) dans la barre latérale du bureau.

### Au bureau

Sur un écran d'au moins (1024px) tenu à la souris ou au pavé (variante Tailwind `bureau:`, `@media (min-width: 1024px) and (pointer: fine)`), le texte se range sur cinq marches : (12px) pour les libellés, légendes et aides, (13.5px) pour le texte courant, (15px) pour les titres de carte, de panneau et d'écran, (18px) pour un titre de dialogue, (24px) pour un chiffre clé. Les tailles écrites pour le doigt se rangent sur la marche la plus proche (`admin.css`) ; une classe `bureau:text-…` posée sur l'élément garde la main. La page publique n'utilise aucune de ces classes et garde sa typographie.

### Named Rules

**The Working Hierarchy Rule.** Le titre nomme l'endroit et le contrôle porte le geste. Aucun sous-titre ne répète un titre d'onglet ; une aide ne paraît que là où le geste ne se comprend pas seul.

## Layout

Au téléphone, le shell partage une barre supérieure d'au moins (72px) et un contenu centré, avec une largeur maximale de (1120px) et des gouttières de (16px).

À partir de (1024px), une barre latérale fixe de (216px) remplace la navigation basse : la petite marque à la hauteur de l'en-tête, les sections (Comptes à part, après un écart de (14px)) et, en bas, le compte, qui s'ouvre sur un menu avec « Me déconnecter ». L'en-tête du bureau est une seule rangée de (56px) : le nom de l'écran à gauche (rôle `screen-title-desk`, c'est le seul titre de l'écran), puis ce qui sert ici, à droite. Ma page y met l'état d'enregistrement, l'adresse courte avec Copier, Voir ma page et le bouton noir Ajouter un bloc ; Réglages, l'état ; Stats, la période ; Comptes, Inviter. Chaque onglet y pose son geste par `ActionEntete`. Pas de barre vide, pas de titre qui répète le menu. Le contenu est posé sur le blanc.

La forme suit la largeur et la densité suit la souris : une tablette en paysage a la barre latérale, avec des cibles de (44px).

La navigation mobile tient compte de la zone sûre inférieure et réserve (64px) à ses boutons. Le contenu garde un espace bas pour rester accessible au-dessus d'elle. Sous (1024px), les gestes de Ma page (Ajouter un bloc, Personnaliser) se posent sur cette barre, à portée du pouce : les deux font un seul socle blanc sous un seul trait, et la page commence juste sous l'en-tête. Dans ce même en-tête, tant que la page n'est pas prête, l'anneau de Bien démarrer prend la place de la photo et ouvre ses étapes dans une feuille. Le rythme récurrent utilise de petits écarts entre contrôles et des écarts plus larges entre groupes, selon les tokens de spacing.

Les cartes courantes passent de leur padding desktop au token `mobile-card` sous (640px). Les feuilles montent du bas sur téléphone, deviennent centrées ou latérales à partir de (640px), et suivent l'espace réellement visible avec le clavier. Les compositions propres à Ma page, aux statistiques, aux réglages et à la connexion sont décrites dans le contrat de surface.

## Elevation & Depth

Les cartes ordinaires sont plates : leur papier, leur bordure et le fond de travail établissent la profondeur. Les ombres sont réservées à la page éditée, aux feuilles, aux retours flottants et à la sélection dans un contrôle segmenté. Elles restent diffuses. Le sidecar conserve les valeurs exactes que le frontmatter ne peut pas exprimer.

### Shadow Vocabulary

- **Page éditée** : l'ombre légère détache la vraie page du shell.
- **Feuille** : l'ombre signale une surface temporaire au-dessus du travail.
- **Segment choisi** : petite ombre locale sur le choix actif.
- **Retour flottant** : contraste inversé et ombre pour le message, sans masquer l'action de la feuille.

### Named Rules

**The Flat Card Rule.** Une carte ordinaire se distingue par son fond et son trait ; ne pas lui attribuer une ombre de fenêtre.

## Shapes

Les contrôles et la navigation utilisent l'arrondi `control`, les cartes et feuilles l'arrondi `surface`. L'adresse, la liste de démarrage, les groupes de lignes et les cartes de choix utilisent `compact-surface`. Les segments, les compteurs et les badges ont une courbure plus serrée (`segment`).

### Named Rules

**The No Pill Rule.** Aucun bouton, lien d'action ou badge en pilule : ce sont des rectangles arrondis. Restent ronds les avatars, les points d'état, les interrupteurs, les pastilles de couleur, la poignée de déplacement, les boutons radio et les pistes de progression.

Les bordures de surface sont fines (1px). Le focus observable est un contour noir (2px), décalé de (2px). Les cadres de page et les miniatures ont des rayons propres à leur fonction ; ils ne redéfinissent pas la forme des cartes ordinaires.

## Components

### Buttons

Actions nettes, avec un libellé court et un picto plein lorsque cela aide à reconnaître le geste. Les cinq variantes viennent d'une seule source, `classeBouton` dans `src/admin/ui.tsx`, pour qu'un lien prenne la même allure qu'un bouton. Ne pas ajouter derrière elles un padding ou une hauteur qui les contredit.

- **Primary (`principal`):** noir, texte blanc, semi-gras ; cible minimale (44px), avec pression à l'échelle (0.98) et opacité réduite si désactivé. Il porte l'action principale de la vue.
- **Au bureau (`bureau:`):** chaque variante descend à (36px) de haut, arrondi (8px), graisse moyenne ; le bouton icône à (32px). Un bouton écrit à la main avec `min-h-11` suit la même règle.
- **Secondary (`secondaire`):** papier blanc, contour léger, texte noir et graisse moyenne. Le survol modifie le fond et le trait.
- **Danger (`danger`):** rouge plein, texte blanc ; réservé à l'effacement définitif, après une confirmation.
- **Quiet (`discret`):** texte secondaire sans fond ; Annuler, Plus tard, Me déconnecter.
- **Icon (`icone`):** carré de (44px) au picto secondaire, pour fermer, revenir ou retirer.
- **Focus:** contour commun explicite. Les transitions de couleur durent généralement (150ms).

### Cards / Containers

Conteneurs blancs, arrondis et bordés. Un titre de carte et son action éventuelle occupent la même rangée. Les KPI partagent la forme des cartes avec un padding plus compact : (20px), puis (16px) sous (640px).

Dans une feuille, une liste de lignes est un groupe bordé sans fond (`.adm-groupe`). Dans une carte, les groupes deviennent de simples traits de séparation : jamais de boîte grise dans une carte. Un choix entre cartes (formule, aperçu de bureau) est marqué par un contour noir de (2px), pas par une couleur.

### Badges

Rectangle à l'arrondi `segment`, fond d'encre à 7 %, texte au rôle `caption` en semi-gras (`classeBadge`). Seul « Suspendu » prend l'ambre des alertes.

### Inputs / Fields

Fond calme, contour discret, arrondi de contrôle et texte de saisie au rôle `field`. Hauteur minimale observée (48px) ; au bureau, (40px), arrondi (8px) et texte de (13.5px) (`field-desk`). Le contour se renforce au survol et au focus. Une erreur est attachée au champ par `aria-invalid` et `aria-describedby` et s'affiche sous lui.

### Navigation

La marque (`Marque.tsx`) est la même partout : le carré noir au lien blanc de (28px), puis « Hopla » au rôle `wordmark`, sans accroche. La connexion, les CGU et le lien de connexion périmé la reprennent telle quelle ; la barre latérale du bureau la prend en petit (`petite` : (22px) et `wordmark-desk`). Aucun fil d'Ariane ne répète la navigation.

Sur desktop, une rangée de (32px) à la souris ((44px) au doigt) associe un picto plein (16px) et un nom, sans compteur. Le choix actif est un gris uni (`nav-current`), sans bordure ni graisse de plus ; le survol, plus pâle (`nav-hover`). Sur mobile, la même navigation devient une barre basse avec picto (21px) et label court ; l'onglet courant se reconnaît à son picto noir et à son label en semi-gras, sans pastille de fond.

### Segments

Groupe de choix exclusifs neutre, composé de boutons avec une cible minimale de (40px). La sélection gagne un papier blanc et une ombre courte. Le motif radio conserve un seul arrêt de tabulation et se parcourt avec les flèches.

### Settings rows

Une ligne de réglage porte un picto plein nu, sans tuile de fond, dans une case de (24px) au gris secondaire, puis son nom et un chevron ou une bascule. Les badges « Pro » s'écrivent sans picto décoratif.

### Switches

Piste de (40px) sur (24px), pastille blanche de (18px), cible tactile étendue ; au bureau, (32px) sur (18px), pastille de (14px) (`switch-desk`). Allumée, la piste est à l'encre ; éteinte, à 45 % d'encre, soit 3:1 sur le papier, pour qu'on voie l'interrupteur et son état (WCAG 1.4.11). Le déplacement et l'étirement à la pression répondent au geste. L'état est porté par `role="switch"` et `aria-checked`.

### Sheets and feedback

Les feuilles nomment leur tâche, gardent la fermeture accessible et gèrent le focus. Les mouvements d'entrée et de sortie sont courts et décélérés ; `prefers-reduced-motion` retire les animations prévues. Les retours utilisent un message explicite, et proposent Annuler lorsque l'action le permet. L'état d'enregistrement est le même au téléphone et au bureau : une coche suivie de « Enregistré », un point gris qui bat pendant l'envoi ; seul l'échec passe au rouge. Au bureau, il ne se montre que sur les écrans où l'on écrit (Ma page, Réglages), ou quand il a quelque chose à dire.

Un menu (le compte, puis les actions d'un bloc ou d'une ligne, la période) est une petite surface blanche bordée, avec une ombre courte : les flèches le parcourent, Échap le referme et rend le focus à son bouton (`Menu` dans `ui.tsx`). Les durées et courbes observées figurent dans le sidecar.

## Do's and Don'ts

### Do:

- **Do** conserver le contraste noir sur papier, et du papier sur une action noire.
- **Do** reprendre Geist et la hiérarchie des rôles déjà utilisés.
- **Do** conserver un focus visible, les libellés et les états d'enregistrement explicites.
- **Do** utiliser les pictogrammes Phosphor pleins et monochromes pour ce qu'on montre (un réseau, un bloc, une règle, un état), et les signes de commande au trait (`ui-*`) pour les gestes (fermer, ajouter, déplier, copier, ouvrir), sans mêler les deux dans une même rangée.
- **Do** garder les transitions brèves et respecter le mouvement réduit.

### Don't:

- **Don't** ajouter d'accent décoratif dans le back office.
- **Don't** remplacer les couleurs ou la typographie des thèmes publics par celles du shell.
- **Don't** transformer chaque carte en fenêtre ombrée.
- **Don't** utiliser d'emoji ou de picto en duotone dans cet espace.
- **Don't** faire un bouton en pilule, ni poser un picto sur une tuile de fond.
- **Don't** écrire un sous-titre explicatif sous un titre d'onglet, ni un fil d'Ariane qui répète la navigation.
- **Don't** dire « en ligne » ou « réussi » en vert : le noir suffit, la couleur reste aux alertes.
- **Don't** imbriquer une boîte grise dans une carte.
- **Don't** présenter une capture locale ou ce document comme une preuve de mise en production.
