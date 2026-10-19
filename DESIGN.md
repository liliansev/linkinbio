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
  nav-hover: "#f1f1ee"
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
  field:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
  metric:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.03em"
rounded:
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
  nav-item:
    textColor: "{colors.secondary}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "48px"
  nav-item-current:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.shell-ink}"
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
---

# Design System: Hopla back office

## Overview

**Creative North Star: "Un même espace de travail"**

Ce nom reprend le principe déjà inscrit dans le code : l'édition, les statistiques, les réglages et la connexion appartiennent au même espace. Le système est sobre, clair et compact, avec des surfaces blanches sur un fond gris doux et une hiérarchie obtenue par la typographie, les espacements et les traits.

Cette documentation décrit le système observable de la branche `design/back-office-harmonise`, au 19 octobre 2026. Elle ne propose pas de nouvelle identité et ne prouve aucune mise en production. Son périmètre est le back office : les thèmes publics rendus dans l'éditeur ou dans un aperçu conservent leurs propres couleurs et fontes. La stratégie des écrans est dans `.impeccable/surfaces/back-office.md`.

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

Les tokens `error` et `pending` correspondent aux états d'erreur et d'enregistrement en cours. Ils ne constituent pas des accents de marque. Les variantes d'alerte déjà présentes dans le code restent contextuelles.

### Named Rules

**The Monochrome Rule.** Le back office garde des actions et contenus neutres ; la couleur est réservée aux alertes, jamais à décorer une section.

**The Public Theme Boundary Rule.** Les couleurs de l'espace de travail ne remplacent pas les variables des pages publiques et de leurs aperçus.

## Typography

**Display Font:** aucune fonte d'affichage distincte dans ce périmètre.
**Body Font:** Geist Variable, avec replis sans empattement définis dans `src/styles/app.css`.

**Character:** une seule famille de travail, avec des tailles proches pour les labels, aides et contenus. Les titres et chiffres structurent l'écran sans prendre la place des actions.

### Hierarchy

- **Headline** : titre de page ; le token desktop est réduit à (28px) sous (640px).
- **Panel title** : nom d'une feuille d'édition.
- **Title** : nom d'une carte ou d'un groupe de réglages.
- **Body** : description de page et contenu courant ; les composants utilisent aussi des variations locales entre (13px) et (14.5px).
- **Label** : nom de champ et aide courte.
- **Field** : texte saisi, conservé à une taille lisible sur mobile.
- **Metric** : valeur statistique, portée à (34px) à partir de (1024px), avec chiffres tabulaires.

### Named Rules

**The Working Hierarchy Rule.** Le titre nomme l'endroit, le texte secondaire l'explique et le contrôle porte le geste. Conserver ce rôle lors de l'ajout d'un écran.

## Layout

Le shell partage une barre supérieure et un contenu centré, avec une largeur maximale observée de (1120px). Les gouttières passent de (16px) à (32px) à partir de (1024px). À cette même largeur, une navigation latérale fixe de (240px) remplace la navigation basse ; le contenu garde l'espace correspondant. La barre supérieure mesure au moins (72px), puis (80px) sur desktop.

La navigation mobile tient compte de la zone sûre inférieure et réserve (64px) à ses boutons. Le contenu garde un espace bas pour rester accessible au-dessus d'elle. Le rythme récurrent utilise de petits écarts entre contrôles et des écarts plus larges entre groupes, selon les tokens de spacing.

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

Les contrôles et la navigation utilisent l'arrondi `control`, les cartes et feuilles l'arrondi `surface`. L'adresse et la liste de démarrage utilisent `compact-surface`. Les pastilles, avatars et interrupteurs sont circulaires ou en pilule. Les segments ont une courbure plus serrée que leur groupe.

Les bordures de surface sont fines (1px). Le focus observable est un contour noir (2px), décalé de (2px). Les cadres de page et les miniatures ont des rayons propres à leur fonction ; ils ne redéfinissent pas la forme des cartes ordinaires.

## Components

### Buttons

Actions nettes, avec un libellé court et un picto plein lorsque cela aide à reconnaître le geste.

- **Primary:** noir, texte blanc, semi-gras ; cible minimale (44px), avec pression à l'échelle (0.98) et opacité réduite si désactivé.
- **Secondary:** papier blanc, contour léger, texte noir et graisse moyenne. Le survol modifie le fond et le trait.
- **Focus:** contour commun explicite. Les transitions de couleur durent généralement (150ms).

### Cards / Containers

Conteneurs blancs, arrondis et bordés. Un titre de carte et son action éventuelle occupent la même rangée. Les KPI partagent la forme des cartes avec un padding plus compact : (20px), puis (16px) sous (640px).

### Inputs / Fields

Fond calme, contour discret, arrondi de contrôle et texte de saisie au rôle `field`. Hauteur minimale observée (48px). Le contour se renforce au survol et au focus. Une erreur est attachée au champ par `aria-invalid` et `aria-describedby` et s'affiche sous lui.

### Navigation

Sur desktop, une ligne associe un picto plein (20px), un nom et éventuellement un compteur réel. Le choix actif est blanc, bordé et plus gras ; le survol utilise une surface neutre. Sur mobile, la même navigation devient une barre basse avec picto (21px), label court et pastille de fond pour l'onglet courant.

### Segments

Groupe de choix exclusifs neutre, composé de boutons avec une cible minimale de (40px). La sélection gagne un papier blanc et une ombre courte. Le motif radio conserve un seul arrêt de tabulation et se parcourt avec les flèches.

### Switches

Piste de (40px) sur (24px), pastille blanche de (18px), cible tactile étendue. Le déplacement et l'étirement à la pression répondent au geste. L'état est porté par `role="switch"` et `aria-checked`.

### Sheets and feedback

Les feuilles nomment leur tâche, gardent la fermeture accessible et gèrent le focus. Les mouvements d'entrée et de sortie sont courts et décélérés ; `prefers-reduced-motion` retire les animations prévues. Les retours utilisent un message explicite, et proposent Annuler lorsque l'action le permet. Les durées et courbes observées figurent dans le sidecar.

## Do's and Don'ts

### Do:

- **Do** conserver le contraste noir sur papier, et du papier sur une action noire.
- **Do** reprendre Geist et la hiérarchie des rôles déjà utilisés.
- **Do** conserver un focus visible, les libellés et les états d'enregistrement explicites.
- **Do** utiliser les pictogrammes Phosphor pleins et monochromes du projet.
- **Do** garder les transitions brèves et respecter le mouvement réduit.

### Don't:

- **Don't** ajouter d'accent décoratif dans le back office.
- **Don't** remplacer les couleurs ou la typographie des thèmes publics par celles du shell.
- **Don't** transformer chaque carte en fenêtre ombrée.
- **Don't** utiliser d'emoji ou de picto en duotone dans cet espace.
- **Don't** présenter une capture locale ou ce document comme une preuve de mise en production.
