# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Les personnes invitées sur Hopla publient et entretiennent une page qui rassemble leurs liens, depuis leur téléphone ou un ordinateur. Chaque compte possède sa page sous son pseudo.

Le compte principal de Lilian dispose en plus de la gestion des comptes et des signalements. Les comptes ordinaires n'ont pas ces accès. Les blocs reliés à sa chaîne YouTube et à sa newsletter sont réservés à la page du compte principal.

## Product Purpose

Hopla permet de réunir un profil, des réseaux sociaux et des blocs de contenu sur une page publique, puis de modifier cette page directement depuis le back office. Le résultat attendu est une page personnelle prête à être partagée et dont l'activité peut être consultée.

## Positioning

Le mécanisme déjà implémenté est l'édition de la vraie page : le nom et la bio se modifient en place, les autres éléments ouvrent leur éditeur, et les blocs se déplacent. L'aperçu utilise le même composant de page que le rendu public.

## Operating Context

- Le service est présenté comme une bêta sur invitation dans `src/routes/index.tsx`.
- Les origines configurées sont `hopla.page/<pseudo>` pour les pages et `app.hopla.page` pour le back office. La page principale utilise `/lilian`.
- La connexion se fait par lien reçu par e-mail, sans mot de passe. `CLAUDE.md` documente des liens de 15 minutes et des sessions de 90 jours. La route de connexion consomme le jeton depuis le navigateur par POST.
- Les comptes neufs passent par les CGU en vigueur, puis par les premiers pas si leur page est encore vide. Le compte principal est traité séparément.
- La démo locale rend les composants réels avec une API simulée. Elle sert à examiner les états et le rendu sans utiliser les données de production.

## Capabilities and Constraints

- Profil, réseaux, thème, formes de boutons, couleurs, SEO, partage et langues sont portés par les réglages de la page.
- Les blocs comprennent liens, titres, texte, vidéo, inscription et preuves. Leur disponibilité dépend du type de compte. Visibilité, ordre, programmation et adaptations à la provenance sont des données du modèle.
- Le back office conserve l'enregistrement automatique, un état explicite d'enregistrement, les possibilités d'annulation et l'aperçu. Les réglages attendent la fin d'une courte pause de saisie, les blocs sont enregistrés à la validation de leur feuille, l'ordre au déplacement.
- Les statistiques portent sur vues, visiteurs, clics, sources, appareils et ouvertures dans les apps. Le code indique une mesure sans cookie ; `CLAUDE.md` précise que l'IP n'est jamais stockée. Cela ne constitue pas un audit de conformité.
- Les réglages proposent notamment adresse et QR code, aperçu de partage, langues, préférences, données et déconnexion. Les entrées d'abonnement dépendent du compte et de la configuration du paiement.
- Les offres Gratuit et Pro sont représentées dans le produit. Le paiement et le portail sont fournis par Creem. Le Pro est accordé seulement par un webhook Creem signé, jamais par le retour de paiement. Aucun état de configuration locale ne prouve une activation en production.
- Les comptes ordinaires ont une page non indexée pendant la bêta ; les métadonnées de partage restent configurables.
- Une base SQLite porte les comptes et leurs données. L'interface signale un éventuel stockage éphémère. Aucun secret ou jeu de données de production n'est nécessaire à cette refonte.

## Brand Commitments

- Le service s'appelle Hopla.
- Le back office s'adresse en français à la personne en la tutoyant. Aucun tiret cadratin dans les textes.
- Le back office est noir et blanc. La couleur est réservée aux alertes.
- Les pictogrammes sont des Phosphor pleins et monochromes, sans emoji, dégradé ni duotone.
- Les thèmes et la typographie de la page publique gardent leur propre système. La refonte du back office ne les remplace pas.

## Evidence on Hand

Cette fiche est extraite de `CLAUDE.md`, `../reprise/REPRISE-LOCAL.md`, `src/lib/types.ts`, des composants de `src/admin/` et des routes. Elle consigne l'état de la branche `design/back-office-harmonise` au 19 octobre 2026, sans prouver une mise en production.

Les captures locales finalisées sont dans `../../outputs/` : `page-desktop.png`, `page-mobile.png`, `stats-desktop.png`, `stats-mobile.png`, `reglages-desktop.png`, `reglages-mobile.png`, `reglages-320.png`, `design-desktop.png`, `design-mobile.png`, `connexion-desktop.png`, `connexion-mobile.png` et `compte-ordinaire-mobile.png`. Elles montrent des états de démonstration, pas des mesures d'usage réel. Aucune nouvelle promesse commerciale ou donnée de performance n'est établie par cette documentation.

## Product Principles

1. Modifier la page que l'on partage, en conservant la correspondance avec le rendu public.
2. Rendre les changements et leur enregistrement compréhensibles, avec des retours et une annulation quand elle est prévue.
3. Maintenir le même travail possible sur téléphone et ordinateur, avec des contrôles adaptés à l'espace disponible.
4. Respecter les droits et possibilités de chaque compte, y compris dans la démo et les aperçus.
5. Préserver l'expression de chaque page publique lors des évolutions du back office.

## Accessibility & Inclusion

Le code inclut des libellés de champs et de boutons, un focus visible, des feuilles avec gestion du focus et fermeture par Échap, des actions de déplacement au clavier et des alternatives au glisser. Les mouvements tiennent compte de `prefers-reduced-motion`. Ce sont des comportements à conserver ; aucune conformité WCAG globale n'a été établie par cette extraction.
