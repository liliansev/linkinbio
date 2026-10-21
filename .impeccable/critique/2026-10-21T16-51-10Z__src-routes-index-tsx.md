---
target_identity: "file:/home/claude/linkinbio/src/routes/index.tsx"
target_fingerprint: "sha256:dc39495bbbc50058fe6e9e0f526f6fbf50181d4e100ef0319bc0f34493686443"
target_path: /home/claude/linkinbio/src/routes/index.tsx
timestamp: 2026-10-21T16-51-10Z
slug: src-routes-index-tsx
---
---
target: accueil Hopla (des visages), après la cinquième série
total_score: 32
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
---
# Critique Impeccable de l'accueil Hopla, après les corrections (21 octobre 2026)

Method: dual-agent (A : revue design · B : détecteur et navigateur)

Vue en local à 1440 × 900, 1024 × 768, 390 × 844 et 320 × 640, avec et sans mouvement réduit. Publiée par la PR #36 de `liliansev/linkinbio`.

## Note finale : 32/40 (bonne, bande 28 à 35)

La cible était 35/40. Elle n'est pas atteinte : la série s'arrête ici, à la demande de Lilian (deux regards de plus, puis publication).

- **Parcours de la journée (regard A)** : 30, 30, 30, 32, 34, puis 32 à la dernière série.
- **Dernière série** :
  - regard A (design) : 32/40 ;
  - regard B (détecteur et navigateur) : 33/40.
- **Pourquoi la note baisse de 34 à 32** : la dernière série a noté la version d'avant ses propres corrections. Elle relève aussi des points nouveaux : la barre marquait la mauvaise section, et Prise restait figé au téléphone en mouvement réduit.
- **Après correction** : la plupart de ses constats sont corrigés dans la PR (voir plus bas). Aucune note n'a été reprise depuis.

| # | Heuristique | Note | Point clé |
|---|---|---|---|
| 1 | État du système | 3 | Le champ répond en direct et chaque scène dit où elle en est. La barre marquait « Thèmes » pendant Prise (corrigé). |
| 2 | Langage du visiteur | 3 | Français simple au tu, prix TTC. Deux phrases fausses corrigées : « le reste est retiré » et « Regarde le trajet » en mouvement réduit. |
| 3 | Contrôle et liberté | 3 | Revoir, Échap, retour vers les prix. Au téléphone en mouvement réduit, les étapes de Prise ne se choisissaient pas (corrigé). |
| 4 | Cohérence | 3 | Système tenu. Écarts relevés, presque tous corrigés : accent vert, cadre carré au focus, badge à 12 px. |
| 5 | Prévention des erreurs | 4 | Nom vérifié à la frappe, lien Linktree réduit au nom, accents et emoji traités, faute de domaine signalée. |
| 6 | Reconnaître plutôt que retenir | 3 | L'offre et le nom suivent le visiteur. Deux avantages payants ne sont montrés nulle part. |
| 7 | Efficacité | 3 | Avantages liés à leur démo, flèches, lien d'évitement. La réponse Linktree mène maintenant au champ. |
| 8 | Esthétique et sobriété | 3 | Direction forte. La preuve du hero tient dans un texte de 6 à 9 px, et la page est longue au téléphone. |
| 9 | Récupération des erreurs | 4 | Chaque message dit quoi, pourquoi et comment en sortir. |
| 10 | Aide | 3 | FAQ, « Inclus dans l'offre… », « Chiffres d'exemple ». Les avis et la liste e-mail ne sont jamais expliqués. |

## Corrigé après la dernière série

**Mise en page des titres**
- Plus de ligne vide dans les titres au téléphone (6 titres).
- Titres réduits sous 360 px : plus de ligne d'un seul mot.

**Navigation et clavier**
- La barre ne marque plus « Thèmes » pendant Prise ni « Questions » au dernier appel.
- « Thèmes » reste dans la barre de 900 à 1099 px. Mesuré à 900 px : les liens finissent à 578 px, Connexion commence à 640 px.
- Plus de cadre carré quand un lien de la barre pose le focus sur un titre.
- Le rail des thèmes est atteignable au clavier sous 1024 px.

**Lisibilité et cibles**
- Aperçu des profils lisible sur un petit téléphone : 280 px au moins, et le dialogue défile (vérifié à 375 × 667).
- Liens des avantages à 44 px de haut.
- Badge « jusqu'à −27 % » à 13 px à 320 px.
- Horloge stable entre « le matin » et « le soir ».
- Un seul bleu d'accent : plus de vert dans Stats, plus de deuxième bleu dans Prise.

**Mouvement réduit**
- Au téléphone, les étapes de Prise se lisent en liste et se montrent d'un toucher.
- Le chapô de « Moins de détours » ne parle plus d'un trajet qui bouge.

**Textes et champ**
- « Les accents sont simplifiés, le reste est retiré. »
- Un emoji en fin de nom ne laisse plus de tiret.
- La réponse « J'ai déjà un Linktree » a un bouton qui mène au champ.
- Le faux tableau de bord n'ajoute plus de titres au plan de la page.
- Les cartes de la galerie disent métier et ville aux lecteurs d'écran.
- « Voir une vraie page » est souligné.

## Restent ouverts (pas rapides, à décider)

1. **Preuve du hero.** Le premier écran promet « Et s'adapte à chaque visiteur », mais le lien qui monte est écrit en 6 à 9 px. Pour régler ça : une légende visible sous la composition au moment du changement, et une petite pastille YouTube sur le lien monté.
2. **Avis clients et liste e-mail** (Starter et Pro) : ni démonstration ni explication sur la page.
3. **Mensuel/Annuel au téléphone** : loin de la carte Pro. Le sélecteur pourrait rester collé en haut des prix.
4. **Rail des thèmes** : la teinte suit un thème à moitié caché au lieu du premier thème entier.
5. **« Moins de détours »** : pas de bouton Revoir, alors que ses onglets rejouent la scène.
6. **« Déjà pris »** : pas de picto, contrairement à « libre ».
7. **Petits mouvements** :
   - la roue anime sa hauteur ;
   - une réponse lente sur un nom pris fait descendre le hero de 46 px.
8. **À vérifier sur un vrai téléphone** : les coins du téléphone dans « Modifier » sortent carrés dans le navigateur sans tête, probablement un défaut du rendu logiciel.

## Vérifications

- `pnpm typecheck` : propre.
- `pnpm test` : 112 tests de l'app et 6 du serveur, tous verts.
- `pnpm build` : propre.
- Contrôle visuel après la reconstruction : barre à 900, 1024 et 1099 px ; titres à 390 et 320 px ; dialogue à 375 × 667 ; Prise en mouvement réduit à 390 px.
- Instantanés de chaque série : `.impeccable/critique/` dans le dépôt.
