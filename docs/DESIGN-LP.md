---
name: Hopla accueil public, des liens et des visages
description: Système visuel de la landing publique sous .hl-humain, extrait de l’implémentation du 21 octobre 2026.
colors:
  hopla-blue: "#292bff"
  lime: "#e3fc96"
  lime-hover: "#d4f57c"
  lime-ink: "#233016"
  ink: "#20241f"
  secondary: "#62685f"
  paper: "#fff"
  cream: "#f3eee5"
  network-paper: "#f2f0e7"
  pricing-paper: "#f6f5ef"
  sage: "#e7edde"
  lilac: "#eee6f3"
  night: "#292530"
  night-ink: "#eee0fa"
  starter-paper: "#e4e4ff"
  card-border: "#dedfd7"
typography:
  display:
    fontFamily: "Bricolage Grotesque Variable, Geist Variable, sans-serif"
    fontSize: "clamp(52px, 5.6vw, 82px)"
    fontWeight: 650
    lineHeight: 0.99
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Bricolage Grotesque Variable, Geist Variable, sans-serif"
    fontSize: "clamp(32px, 4.4vw, 52px)"
    fontWeight: 650
    lineHeight: 1.06
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Bricolage Grotesque Variable, Geist Variable, sans-serif"
    fontSize: "21px"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    lineHeight: 1.55
  button:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
  annotation:
    fontFamily: "Instrument Serif, serif"
    fontSize: "26px"
    lineHeight: 1
  offer-label:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "0.03em"
  section-intro:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "0.09em"
rounded:
  badge: "6px"
  button: "10px"
  portrait: "14px"
  signup-group: "15px"
  offer: "20px"
  dialog: "22px"
  hero-card: "25px"
  phone: "28px"
  inset-section: "30px"
spacing:
  person-gap: "12px"
  gallery-gap: "16px"
  offer-gap: "18px"
  offer-padding: "28px"
  section-top: "100px"
components:
  button-dark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "0 20px"
  signup-button:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.lime-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "0 22px"
  offer-pro-button:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.lime-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "0 20px"
  offer-pro-button-hover:
    backgroundColor: "{colors.lime-hover}"
  badge-starter:
    backgroundColor: "{colors.starter-paper}"
    textColor: "{colors.hopla-blue}"
    typography: "{typography.offer-label}"
    rounded: "{rounded.badge}"
    padding: "7px 12px"
  badge-pro:
    backgroundColor: "{colors.hopla-blue}"
    textColor: "{colors.paper}"
    typography: "{typography.offer-label}"
    rounded: "{rounded.badge}"
    padding: "7px 12px"
  offer-card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.offer}"
    padding: "{spacing.offer-padding}"
  offer-pro-card:
    backgroundColor: "{colors.hopla-blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.offer}"
    padding: "{spacing.offer-padding}"
---

# Design System: Hopla, accueil public

## Overview

**Périmètre : ce document décrit uniquement la landing publique `src/accueil/` sous `.hl-humain`. Il ne remplace ni le [DESIGN.md du back office](../DESIGN.md), ni sa configuration `.impeccable/design.json`. Les composants de pages publiques et leurs thèmes conservent leur propre système.**

**Creative North Star: "Des liens, des visages"**

La page présente Hopla à travers des personnes et leurs activités. Les portraits chaleureux donnent une identité stable aux exemples, des premières cartes aux démonstrations. Le bleu franc porte la marque, le citron souligne l’action et les fonds doux donnent à chaque démonstration son espace. Bricolage apporte l’expression ; Geist garde les contrôles et les explications lisibles.

La composition associe des panneaux calmes et des aperçus de produit plus denses. Les superpositions du hero évoquent plusieurs univers personnels. Les autres scènes privilégient la compréhension d’un changement concret : un lien remonte, une app s’ouvre, un lancement devient disponible. La galerie représente six profils imaginés, jamais des témoignages ou une preuve d’adoption.

**Key Characteristics:**

- Une identité et un portrait constants par profil, depuis `PROFILS` dans `src/accueil/exemples.ts`.
- Des couleurs franches pour la marque et les actions, des tons doux pour les scènes.
- Des titres expressifs, des contrôles sobres, quelques annotations en serif italique.
- Des démonstrations rejouables et des aperçus issus du modèle réel des pages.

Autorité visuelle : [prototype Sites approuvé](https://hopla-des-visages-21oct.lilian-sevoumian.chatgpt.site), [direction de la LP](lp-direction.md) et [brief de surface](../.impeccable/surfaces/src-accueil-accueil-tsx.md). Les valeurs ci-dessus sont extraites de `src/styles/accueil-profils.css`, de la base `src/styles/accueil.css` et des composants actuels. Les anciens commentaires de la base CSS ne priment pas sur les surcharges `.hl-humain`. Cette extraction décrit la branche `codex/lp-profils-humains`, sans établir de mise en production.

## Colors

Le bleu Hopla et le citron forment le contraste principal, soutenu par une palette de papier, de sauge et de lilas. Les valeurs normatives sont dans le frontmatter.

### Primary

- **Bleu Hopla** (`hopla-blue`) : fond du hero, rappel des titres sur papier, carte Pro et badge Pro.
- **Citron** (`lime`) : seconde partie de la promesse, inscription sur fond bleu, bouton de l’offre Pro. Son texte utilise `lime-ink`.

### Secondary

- **Crème** (`cream`) : scène des liens qui évoluent selon l’heure, le lancement ou les places.
- **Sauge** (`sage`) et **lilas** (`lilac`) : panneaux de démonstration, sans remplacer les couleurs propres aux thèmes montrés à l’intérieur.
- **Nuit prune** (`night`) avec `night-ink` : trajet de Sacha entre la page et YouTube.
- **Lavande Starter** (`starter-paper`) : fond du badge Starter, avec texte bleu.

### Neutral

- **Papier** (`paper`) : fond global, navigation, champs et cartes ordinaires.
- **Encre végétale** (`ink`) et **gris secondaire** (`secondary`) : hiérarchie du texte hors panneaux qui redéfinissent leurs couleurs.
- **Papier réseau** (`network-paper`) et **papier tarifs** (`pricing-paper`) : scènes encadrées de Camille et des offres.
- **Bord de carte** (`card-border`) : séparation discrète des offres blanches.

**The Identité locale Rule.** Les tokens de la landing restent sous `.hl-humain`. Les couleurs de réseaux et les palettes des aperçus appartiennent à leur contenu ; elles ne deviennent pas de nouveaux accents généraux.

## Typography

**Display Font:** Bricolage Grotesque Variable, puis Geist Variable et sans-serif.

**Body Font:** Geist Variable, puis ui-sans-serif, system-ui et sans-serif.

**Annotation Font:** Instrument Serif, en italique. Elle est réservée aux notes autour des profils du hero.

### Hierarchy

- **Display** : promesse du hero, selon le rôle `display`. À moins de 600 px, sa taille est fixée à 44 px. Entre 600 et 1023 px, elle utilise `clamp(48px, 8.5vw, 76px)`. Sur un bureau d’au moins 1024 px et d’au plus 850 px de haut, elle utilise `clamp(50px, 6.8vh, 64px)`.
- **Headline** : titres de section, selon `headline`, avec retour à la ligne équilibré.
- **Title** : sous-titres, selon `title`. Les titres des offres et les explications de la scène vivante passent à 28 px.
- **Body** : explications et contrôles, selon `body`. Le chapeau du hero est limité à 40 caractères environ (`40ch`), avec un interligne de 1,7. Il passe à 14 px sur petit mobile.
- **Annotation** : notes courtes et légèrement inclinées. Elles passent à 18 px sur petit mobile.
- **Offer label** : Starter et Pro restent explicitement lisibles avec le rôle `offer-label`.
- **Section intro** : les surtitres en capitales `.hp-surtitre` font partie du prototype approuvé pour cette LP. Ils utilisent `section-intro` et passent à 10 px sous 600 px. Leur présence est propre à cette surface ; elle n’introduit pas une règle pour les écrans du produit.

**The Deux voix et une note Rule.** Bricolage structure la promesse et les titres, Geist porte la lecture et l’action, Instrument Serif ajoute une note ponctuelle. Les thèmes des pages montrées gardent leurs polices.

## Layout

Les sections ordinaires et la navigation utilisent un conteneur maximal de 1280 px. Les panneaux colorés prennent la largeur disponible, avec des marges internes calculées autour d’un contenu de 1200 px. Leur contenu est réparti en colonnes sur bureau, puis empilé sur mobile. Le rythme principal commence les sections à 100 px du contenu précédent ; il descend à 68 px sous 600 px.

Le hero place le texte et le formulaire à gauche, la composition de profils à droite à partir de 1024 px, dans un rapport `.9fr / 1.1fr`. Le mobile conserve l’ordre texte, inscription, profils. La composition utilise un carré relatif, avec Inès au premier plan, Sacha à gauche et Camille à droite. Les aperçus sont inclinés et se chevauchent, sans devenir des blocs de navigation.

Sous 600 px, le hero resserre ce parcours : 30 px de marge intérieure en haut, 16 px entre ses blocs de grille, 18 px avant le chapeau et 20 px avant l’inscription. Le surtitre conserve 16 px sous son texte. La note du formulaire passe à 12 px avec 10 px de marge supérieure ; le lien de découverte garde 12 px de marge supérieure et 10 px de marge intérieure verticale.

La galerie dispose les six portraits en six colonnes, trois sous 1024 px et deux sous 600 px. Elle garde les noms, métiers et villes avec les photos. La phrase « six profils imaginés » reste dans son introduction ; aucune légende séparée sous la galerie n’est prévue.

La scène de Camille partage le texte et la roue en deux colonnes, puis les empile sous 1024 px. La scène vivante associe un texte et un seul téléphone : ses trois sujets sont des onglets, pas trois téléphones simultanés. Les offres se présentent en trois colonnes sur bureau, puis en une colonne sous 1024 px. Leurs avantages restent visibles sur mobile.

La navigation passe au menu mobile sous 900 px. Le groupe de saisie et son bouton s’empilent sous 560 px. Les panneaux en retrait de Camille et des tarifs passent de 14 px à 8 px de marge externe sous 600 px. Ces seuils décrivent des comportements existants, pas une nouvelle grille à imposer au back office.

## Elevation & Depth

La profondeur vient d’abord du contraste des panneaux, du chevauchement des profils et des bordures. Les ombres servent les objets de démonstration. Les offres restent planes, y compris Pro.

### Shadow Vocabulary

- **Profils du hero** : `0 25px 60px -35px #0c0e4f80`, sous les trois cartes bordées de blanc.
- **Téléphone** : `0 0 0 1px #dcdcdc, 0 28px 56px -28px rgb(0 0 0 / .22)`, pour détacher l’aperçu de sa scène.
- **Moyeu réseau** : `0 14px 28px -10px #292bff38`, pour soutenir le centre de la roue de Camille.
- **Dialogue** : fond de voile `#151728aa` et flou de 4 px derrière l’aperçu ouvert depuis la galerie.

**The Objet démontré Rule.** Les ombres soutiennent les profils et téléphones représentés. Elles ne sont pas un effet à ajouter systématiquement aux panneaux, titres ou offres.

## Shapes

Les angles sont arrondis, avec des rayons distincts selon l’objet : petits badges, contrôles, portraits, offres, puis téléphones et panneaux. Les rayons normatifs figurent dans `rounded`. Les avatars sont circulaires dans les scènes et les rubans ; les portraits de galerie restent carrés avec coins arrondis.

Les cartes du hero ont une bordure blanche de 6 px, réduite à 3 px sous 600 px. Les mini-liens utilisent un fond blanc translucide, sauf le premier lien qui reprend la couleur du profil. Les croquis des démonstrations conservent des cadres lisibles et laissent l’action en cours porter l’accent.

## Components

### Buttons

Les boutons sont compacts et identifiables. La base `.hl-btn` a une hauteur minimale de 48 px, un filet d’un pixel et le rôle typographique `button`. Le formulaire principal monte à 54 px et utilise le citron sur fond bleu ; dans le hero sous 600 px, le champ et le bouton reviennent à un minimum de 48 px. Le bouton Pro reprend le citron ; les boutons des offres blanches restent blancs avec bord gris.

Le survol du bouton sombre utilise `#2a2a2a`. Le bouton Pro utilise `lime-hover`. L’appui réduit le bouton à `.98` ; l’état désactivé baisse son opacité à `.6`. Le focus visible général est un contour de 2 px dans l’encre locale, décalé de 3 px. Ne pas supposer qu’un survol défini sur un bouton s’applique à toutes ses variantes : les surcharges de la scène restent déterminantes.

### Inputs / Fields

L’inscription commence par le nom de la page, dans le composant `Reserver` existant. Le groupe principal réunit le champ et l’action sur fond blanc, avec 6 px de marge intérieure et le rayon `signup-group`. Le préfixe et le texte saisi font 17 px. Un focus dans le groupe renforce la bordure avec un second trait d’un pixel. Les états d’erreur, de disponibilité et d’envoi restent gérés par le formulaire réel.

Les CTA secondaires reviennent à ce champ. La direction visuelle ne remplace ni son API, ni les modes d’inscription libre et sur invitation.

Le dernier appel dit « Réserve ton nom en premier ». Son bouton « Réserver mon nom » ne remplace que le libellé de la première étape ; les étapes e-mail, correction et confirmation conservent leurs actions réelles.

### Navigation

La barre blanche est fixe au défilement avec `position: sticky`. Son contenu fait 60 px de haut. Les liens sont en Geist à 15 px ; le logo et l’action principale restent visibles. Le menu mobile regroupe les mêmes ancres que la navigation large : inspiration, fonctionnement et tarifs.

### Portraits and profile previews

`PROFILS`, `IDS_PROFILS` et `pageExemple` constituent la source commune. Chaque personnage conserve son nom, sa photo, son activité et sa bio dans les cartes, les croquis et les vraies pages miniatures.

| Profil fictif | Activité et ville | Fichier |
| --- | --- | --- |
| Inès Laurent | Céramiste, Lyon | `public/profil-ines.webp` |
| Sacha Diop | Musicien, Paris | `public/profil-sacha.webp` |
| Camille Nguyen | Photographe, Bordeaux | `public/profil-camille.webp` |
| Malik Benali | Chef et créateur, Marseille | `public/profil-malik.webp` |
| Léa Morel | Prof de yoga, Nantes | `public/profil-lea.webp` |
| Hugo Perrin | Illustrateur, Lille | `public/profil-hugo.webp` |

Les six portraits sont générés. Chaque WebP possède un fichier `.webp.json` de provenance ; le prompt de la planche est conservé dans [portraits-prompt.txt](portraits-prompt.txt). Les images du hero chargent en priorité, les autres utilisent le chargement différé. La galerie ouvre un dialogue natif avec le titre de la personne, une fermeture dédiée et un aperçu de `PageLiens`.

### Offer badges and pricing cards

`BadgeOffre` affiche explicitement Starter ou Pro, avec les variantes du frontmatter. Starter accompagne le lancement programmé d’Inès et les autres démonstrations concernées ; Pro accompagne les horaires de Malik et les drops d’Hugo.

Les cartes utilisent `OFFRES` et les plans en vente de `src/lib/abonnement.ts` pour les noms, prix et avantages. Le sélecteur mensuel ou annuel modifie les montants. Les avantages restent affichés, sans accordéon, à toutes les largeurs. L’offre Pro utilise un fond bleu et un CTA citron, sans ombre. Les portraits d’Inès, Hugo et Malik contextualisent respectivement Gratuit, Starter et Pro. Les montants et les droits ne doivent pas être recopiés dans un décor figé ou déduits de cette documentation. Les références de comparaison Height et Tines consultées sur Mobbin sont consignées dans [la note de reprise](lp-reprise-claude.md).

Sur les offres payantes, « Créer mon compte » décrit l’étape suivante et « Puis active Starter/Pro dans tes réglages » précise la suite. Le choix de l’offre ne déclenche aucun paiement depuis la LP. Les espaces à l’intérieur des guillemets sont insécables et les avantages utilisent une césure équilibrée pour éviter un guillemet isolé.

### Statistics preview

Le dashboard est l’aperçu par défaut, avec Hugo et son badge Starter. Il reprend les quatre mesures du produit : vues, visiteurs, clics et taux de clic, puis une courbe hebdomadaire, les sources et les liens les plus cliqués. Les chiffres sont illustratifs et annoncés comme tels. Le sélecteur « Le dashboard / L’e-mail du lundi » donne accès au résumé animé existant ; « Voir le dashboard » ramène au premier aperçu. Ces contrôles mesurent au moins 44 px. Sur mobile, les mesures passent sur deux colonnes et les listes sur une colonne.

### Demonstrations and motion

La roue réutilise Camille et ses liens adaptés à la provenance. Elle joue son trajet puis s’arrête ; « Revoir » relance la démonstration. La scène de Sacha conserve les choix « Sans Hopla » et « Avec Hopla » : sélectionner un côté redémarre sa séquence.

Après le retour de Lilian, la scène de Sacha dure 2,6 secondes, puis laisse une pause de 2,8 secondes avant le passage automatique de Sans à Avec. Les transitions restent rejouables et l’état final reste immédiat avec moins de mouvement.

La scène vivante garde un seul téléphone compact avec les onglets « L’heure », « Le lancement » et « Les drops ». Le texte, le personnage, le badge et l’écran changent ensemble. Les contrôles restent à l’extérieur des téléphones : les écrans sont `inert` et accompagnés d’un libellé descriptif. `EcranPage` rend le véritable `PageLiens` lorsque la scène doit montrer un thème réel.

Les animations de démonstration démarrent avec l’entrée dans le champ de vision et disposent d’une reprise volontaire. `prefers-reduced-motion` présente l’état final des séquences. La courbe commune est `cubic-bezier(.2, .7, .2, 1)` ; les boutons utilisent des transitions de 150 ms et le léger zoom des portraits de galerie une transition de 250 ms. Ce sont des règles de mouvement observées, sans promesse de performance ou de conformité globale.

## Do's and Don'ts

### Do:

- **Do** conserver le même portrait et la même identité à chaque réapparition d’une personne.
- **Do** montrer l’activité et les liens propres au profil pour rendre la démonstration compréhensible.
- **Do** garder la mention introductive des six profils imaginés.
- **Do** maintenir les démonstrations rejouables, leurs libellés, le focus visible et leur état à mouvement réduit.
- **Do** lire les prix et droits dans les données du produit, et rendre les thèmes via les composants publics existants.
- **Do** limiter toute extension de ces règles au périmètre de la landing publique.

### Don't:

- **Don't** réintroduire les points retirés de l’ouverture ou la légende séparée retirée sous la galerie.
- **Don't** transformer les profils générés, adresses d’exemple ou chiffres de démonstration en preuve client.
- **Don't** remplacer le formulaire d’inscription réel par un formulaire factice pour reproduire le prototype.
- **Don't** propager cette palette au back office monochrome, ni imposer Bricolage aux thèmes des pages publiques.
- **Don't** prendre les captures de revue pour une preuve de déploiement ou un instantané permanent des tarifs et droits.

**Limites de l’extraction :** les anciennes teintes et certains effets spécifiques des démonstrations subsistent dans la feuille de base ; la palette du frontmatter décrit les surcharges de cette LP, sans réécrire ces composants ni le système du back office. Les écarts détectés par comparaison avec le système monochrome du back office ne constituent pas à eux seuls des défauts de la LP approuvée. Aucune mesure d’accessibilité, de conversion ou de performance n’est déduite de cette extraction.
