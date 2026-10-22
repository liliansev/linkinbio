# Reprise de la landing Hopla

Branche : `codex/lp-profils-humains`, depuis `main` (`509f14d`).

Prototype de référence choisi par Lilian : https://hopla-des-visages-21oct.lilian-sevoumian.chatgpt.site.

## Ce qui est intégré

- Ouverture bleue, accent citron, trois pages superposées et saisie directe du nom avec le vrai formulaire `Reserver`.
- Galerie de six profils avec aperçu dans un dialogue natif : Inès Laurent (céramiste), Sacha Diop (musicien), Camille Nguyen (photographe), Malik Benali (chef), Léa Morel (yoga), Hugo Perrin (illustrateur).
- Portraits WebP locaux utilisés dans les pages, miniatures, thèmes, démos d’édition, statistiques et tarifs. Données centrales dans `src/accueil/exemples.ts` et composants dans `Profils.tsx`.
- Animation des visiteurs reprise de `Roue.tsx`, appliquée à Camille avec le tri réel `composerAudience`. Lecture unique, bouton Revoir, état lisible avec moins de mouvement.
- Parcours Sans/Avec Hopla conservé et incarné par Sacha : clic, navigateur intégré ou app YouTube, connexion ou abonnement. Animation illustrative, sans lecture vidéo réelle.
- Démos heure/lancement/drop compactées en trois onglets rejouables avec Malik, Inès et Hugo. Badges Starter/Pro contrastés.
- Thèmes et édition conservés avec les six visages. Prix en trois colonnes, Pro bleu, mensuel/annuel, montants issus de `OFFRES` uniquement. Premium, non commercialisé, n’est plus présenté dans les prix de la LP.
- Retrait des points de ponctuation dans l’ouverture et de la légende sous la galerie. La phrase « six profils imaginés » donne le contexte des exemples.

## Retours sur l’aperçu local

- Sacha : séquence raccourcie de 3,15 à 2,6 secondes, pause avant Avec ramenée à 2,8 secondes.
- Statistiques : dashboard visible par défaut, avec courbe, quatre mesures, sources et liens. Le résumé du lundi reste accessible par un sélecteur et revient au dashboard par son bouton. Les chiffres restent des exemples.
- Tarifs : avantages avec guillemets insécables ; les offres payantes affichent « Créer mon compte », puis « Puis active Starter/Pro dans tes réglages ». Aucun nouveau parcours de paiement.
- Dernier appel : « Réserve ton nom en premier » et bouton « Réserver mon nom », sans changer la suite du formulaire.

## Limites de périmètre

Aucun déploiement, changement de main, facture, base de production ou modification du back office. Les styles sont limités à `.hl-humain`. Les thèmes publics restent ceux du produit. Les portraits sont des personnages de démonstration, sans témoignages clients inventés. Mobbin est devenu accessible en fin d’intégration. Les sections de tarifs Height et Tines ont servi à vérifier la comparaison des offres et le contraste.

## Vérifications

`pnpm build`, `pnpm typecheck`, `pnpm test` : 103 tests applicatifs et 6 tests du serveur. Vérifications navigateur locales sur desktop 1432 × 1225 et mobile 390 × 844 : chargement des portraits, galerie/Escape, tarifs mensuels et annuels, animations et commandes de reprise, absence de débordement horizontal, validation du nom disponible et passage à l’étape e-mail sans envoi.

Les retours locaux ont été vérifiés aux mêmes tailles : bascule dashboard/e-mail dans les deux sens, retour des offres payantes au champ du nom, guillemets non isolés, nouveau dernier appel. La scène Avec Hopla atteint son état Abonné en 2,604 secondes mesurées dans le navigateur. La courbe garde ses jours lisibles sur mobile.

Le serveur local de QA utilise une base séparée :

```sh
PORT=4418 LIENS_DB=.data/lp-qa.sqlite LIENS_ORIGINE=http://localhost:4418 LIENS_ORIGINE_ADMIN=http://localhost:4418 pnpm start
```

Lancer `pnpm build` avant ce serveur. Les captures locales sont dans `.impeccable/review/` et les PNG sont ignorés par Git.

Les images sont à la racine de `public/` : le serveur de production n’expose pas des sous-dossiers arbitraires de `public/`. Le prompt de génération est conservé dans `docs/portraits-prompt.txt`, avec un fichier de provenance à côté de chaque WebP.

## Références Mobbin consultées

- [Height](https://mobbin.com/sites/sections/1974c03f-c0ff-4f8e-ae30-250355677442) : trois offres comparables, avantages supplémentaires explicites.
- [Tines](https://mobbin.com/sites/sections/df8da153-7a8d-45c0-a894-47c0a1abb090) : contraste entre offres dans une identité colorée.

Aucun contenu ni asset de ces sites n’a été repris.

## Relecture finale

Verdict visuel : `ship` après deux corrections demandées par la relecture indépendante : resserrement du premier écran mobile (portraits vers 630 px à 390 × 844) et approche des titres à −0,04 em. Le système de la LP est documenté dans `docs/DESIGN-LP.md` ; `DESIGN.md` continue de décrire le back office.
