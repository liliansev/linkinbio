/*
 * La documentation de l'API et du serveur MCP (28 octobre 2026), servie telle quelle, sans clé, sur
 * GET https://app.hopla.page/api/v1 : lisible par un humain dans le navigateur, et par un agent IA. La version complète,
 * guides et référence, est dans documentation/ (hopla.page/docs). Elles suivent `server/api.ts` et `server/mcp.ts` :
 * un changement là-bas se reporte ici, dans documentation/content/docs et dans documentation/scripts/openapi.ts.
 */
import { NOM_ADMIN, ORIGINE_ADMIN, ORIGINE_PUBLIQUE } from './types.ts';

export const DOC_API = `# API et serveur MCP de Hopla

Une page Hopla se gère depuis votre code ou un agent IA (Claude, ChatGPT, Cursor…), avec les mêmes
fonctionnalités que le back office, ou presque. Profil, thème, réseaux, blocs, images, statistiques, liste e-mail, QR code, et la
lecture d'un site, d'un blog ou d'une page d'avis.

- API REST : ${ORIGINE_ADMIN}/api/v1
- Serveur MCP (HTTP « streamable ») : ${ORIGINE_ADMIN}/mcp
- Documentation complète, guides et référence : ${ORIGINE_PUBLIQUE}/docs
- Fichier OpenAPI : ${ORIGINE_PUBLIQUE}/docs/openapi.json

Réservé à l'offre Pro (et à l'essai de 14 jours). Les échanges sont en JSON, en UTF-8.

## Clé d'API

Créez une clé dans le back office : ${NOM_ADMIN}, Réglages, « API et MCP ». Elle ne s'affiche
qu'une fois : copiez-la immédiatement. Une clé « lecture seule » ne modifie aucune donnée.
Envoyez-la dans chaque requête :

    Authorization: Bearer hopla_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Une clé n'a accès qu'à la page de son compte. Révoquez-la dans Réglages dès qu'elle n'est plus utilisée, ou en cas de fuite.
Si le compte quitte l'offre Pro, ses clés sont suspendues, puis réactivées au retour sur l'offre.

## Limites

120 appels par minute et 5 000 par jour pour une clé. Au-delà : 429, avec Retry-After.

## Erreurs

Toute erreur répond un statut HTTP et :

    { "erreur": { "code": "cle_invalide", "message": "…" } }

- 400 : requête refusée (champ, adresse, période, type de bloc…)
- 401 : clé absente ou invalide
- 403 : clé en lecture seule, offre insuffisante, conditions à accepter, compte suspendu
- 404 : bloc, inscrit ou adresse introuvable
- 409 : aucune newsletter branchée (POST /inscrits/envoyer)
- 413 : corps trop gros (256 Ko ; une image : 1,5 Mo)
- 415 : image ni WebP, ni JPEG, ni PNG
- 422 : site illisible (POST /apercu)
- 429 : trop d'appels

## Toutes les routes

Page et réglages : GET /page, GET /reglages, PATCH /reglages
Blocs : GET /blocs, POST /blocs, GET /blocs/{id}, PATCH /blocs/{id}, DELETE /blocs/{id},
  POST /blocs/{id}/dupliquer, PUT /ordre
Images : POST /medias
Statistiques : GET /stats, GET /stats/semaine, GET /stats/resume
Partage : GET /qr
Liste e-mail : GET /liste, GET /inscrits, DELETE /inscrits/{id}, POST /inscrits/envoyer
Lire le web : POST /apercu, POST /flux, POST /avis
Compte : GET /compte, GET /cles, GET /export
Référence : GET /themes, GET /reseaux, GET /pictos, GET /types

Les routes qui lisent (GET, et les trois qui lisent le web) marchent avec une clé en lecture seule.

## API REST

### GET /api/v1/page

La page entière : son adresse et son offre, ses réglages, ses blocs dans l'ordre.

    curl ${ORIGINE_ADMIN}/api/v1/page -H "Authorization: Bearer $HOPLA_CLE"

### PATCH /api/v1/reglages

Change une partie des réglages ; le reste est gardé. profil, bouton, seo, couleurs et redirection
se complètent champ par champ ; reseaux se remplace en entier.

    curl -X PATCH ${ORIGINE_ADMIN}/api/v1/reglages \\
      -H "Authorization: Bearer $HOPLA_CLE" -H "Content-Type: application/json" \\
      -d '{"profil": {"bio": "Coach sportive à Lyon"}, "theme": "onyx"}'

Les réglages utiles :

- profil : { nom, bio, avatar (adresse https d'une image), photo ("ronde" ou "grande") }
- theme : un id de GET /api/v1/themes
- reseaux : [{ reseau, url }], 20 au plus. reseau : youtube, linkedin, instagram, tiktok, x, github,
  facebook, threads, twitch, spotify, email, site, whatsapp, telegram, discord, pinterest, snapchat,
  bluesky, mastodon, reddit, substack, medium, patreon, soundcloud, deezer, applemusic, applepodcasts,
  bandcamp, vimeo, behance, dribbble, malt, etsy
- reseauxPosition : "haut" ou "bas"
- couleurs : { fond, boutons, accent } en #rrggbb ; vide, celle du thème
- bouton : { style: "plein", "contour", "doux", "relief" ou "verre" ; forme: "pilule", "arrondi" ou "carre" ;
  ombre: "aucune", "subtile" ou "marquee" }
- seo : { titre, description }
- partage : le bouton Partager (true ou false)
- vouvoiement : les mots de la page vouvoient le visiteur (true ou false)
- redirection : { url, fin } pour envoyer toute la page ailleurs, { "url": "" } pour l'arrêter

### GET /api/v1/blocs

Les blocs, dans l'ordre de la page.

### POST /api/v1/blocs

Ajoute un bloc, en haut de la page, ou à "position" (0 : en haut).

    curl -X POST ${ORIGINE_ADMIN}/api/v1/blocs \\
      -H "Authorization: Bearer $HOPLA_CLE" -H "Content-Type: application/json" \\
      -d '{"type": "lien", "titre": "Mon nouveau podcast", "url": "https://exemple.fr/podcast", "position": 2}'

Les champs d'un bloc :

- type : lien (par défaut), titre (titre de section), texte, video, derniere-video, inscription
  (liste e-mail), preuve (avis), produit, soutien, reservation, musique, faq, coordonnees, lieu,
  galerie, formulaire, flux. Il ne change plus ensuite.
- titre : le libellé du bouton, le titre de section ou le texte du paragraphe
- url : l'adresse (https://…, mailto:, tel:)
- sousTitre, description : textes sous le titre
- icone : le nom d'un picto ou d'un réseau (youtube, fusee…)
- image : adresse https de la vignette
- public : visible sur la page (true par défaut) ; false le garde masqué
- vedette : mis en avant ; format : "bouton", "bandeau" ou "carte"
- debut, fin : dates ISO 8601 entre lesquelles le bloc s'affiche ; compteARebours : true pour
  annoncer le bloc avant son début
- prix : pour un produit ; montants : pour soutien ([5, 10, 20])
- questions : pour faq, [{ question, reponse }]
- preuve : pour preuve, { genre: "note", note: 4.8, nombre: 120, source: "Google" }

### GET /api/v1/blocs/{id}

Un bloc.

### PATCH /api/v1/blocs/{id}

Change une partie d'un bloc ; le reste est gardé.

    curl -X PATCH ${ORIGINE_ADMIN}/api/v1/blocs/a1b2c3d4e5f6 \\
      -H "Authorization: Bearer $HOPLA_CLE" -H "Content-Type: application/json" \\
      -d '{"public": false}'

### DELETE /api/v1/blocs/{id}

Supprime un bloc, pour de bon.

### PUT /api/v1/ordre

Le nouvel ordre de tous les blocs : chaque id une fois.

    { "ids": ["a1b2c3d4e5f6", "f6e5d4c3b2a1"] }

### GET /api/v1/stats

Les vues, visiteurs et clics, par jour, par bloc, par réseau, par appareil et par pays, comparés à la
période d'avant. ?periode=7, 14, 30 (par défaut), 90 ou 365 ; ou ?du=2026-10-01&au=2026-10-15.
Sans cookie : l'adresse IP des visiteurs n'est jamais gardée.

### GET /api/v1/stats/semaine

Les vues des 7 derniers jours et des 7 d'avant, pour toutes les offres : { semaine: { vues, avant, dejaVue } }.

### GET /api/v1/stats/resume

La période en une phrase, comme « En bref » dans Stats, et ses faits ({ texte, ton }). Même période que /stats.

### GET /api/v1/qr

Le QR code de la page, qui mène à son adresse marquée ?s=qr. ?format=svg (par défaut) ou png, ?taille=120 à 2000.

### POST /api/v1/blocs/{id}/dupliquer

Une copie juste sous le bloc. {"masquer": true} la garde hors de la page.

### POST /api/v1/medias

Une image WebP, JPEG ou PNG de 1,5 Mo au plus : ses octets (Content-Type: image/png…) ou
{"image": "data:image/png;base64,…"}. Rend { media: { chemin, url } } : pose le chemin dans
profil.avatar, imageFond, l'image d'un bloc ou les images d'une galerie.

    curl -X POST ${ORIGINE_ADMIN}/api/v1/medias \
      -H "Authorization: Bearer $HOPLA_CLE" -H "Content-Type: image/jpeg" --data-binary @portrait.jpg

### GET /api/v1/liste

Le résumé de la liste e-mail : { liste: { inscrits, semaine, enAttente, branchee } }.

### GET /api/v1/inscrits

Les inscrits, du plus récent au plus ancien : ?limite=1 à 500 (100), ?depart=0, puis le "suivant" rendu.
?format=csv rend tout le fichier (email,prenom,inscrit,source).

### DELETE /api/v1/inscrits/{id}

Supprime un inscrit de la liste chez Hopla (sa copie reste dans la newsletter).

### POST /api/v1/inscrits/envoyer

Envoie les inscrits en attente vers la newsletter ou le webhook branché : { envoyes, erreurs }.

### POST /api/v1/apercu, /flux, /avis

Lire le web, comme le back office quand on colle une adresse : {"url": "https://…"}. 30 lectures par 10 minutes.
- /apercu : { apercu: { titre, description, prix, image (data URL) } } ; "image": false, "partage", "logo" ou "vignette"
- /flux : { articles: [{ titre, url, date, image, video }] }, les trois derniers d'un blog ou d'un podcast ;
  "video": true pour la dernière vidéo d'une chaîne YouTube
- /avis : { note: { note, nombre, source } } ou { note: null }, une note ramenée sur 5

### GET /api/v1/compte

L'offre, l'essai, l'abonnement, une offre offerte, et pour chaque fonction réservée { incluse, offre }.

### GET /api/v1/cles

Les clés du compte (jamais la clé elle-même) : nom, début, ecriture, cree, utilisee, courante.

### GET /api/v1/export

Tout ce que Hopla garde du compte, en JSON (droit d'accès), sans les images.

### GET /api/v1/themes, /reseaux, /pictos, /types

Les valeurs possibles d'un thème, d'un réseau, d'une icône de bloc et d'un type de bloc.

## Serveur MCP

Adresse : ${ORIGINE_ADMIN}/mcp (transport HTTP « streamable », réponses JSON, sans session).
La clé passe dans l'en-tête Authorization, comme pour l'API.

Claude Code :

    claude mcp add --transport http hopla ${ORIGINE_ADMIN}/mcp --header "Authorization: Bearer hopla_…"

Cursor, Windsurf et les clients qui lisent un fichier mcp.json :

    {
      "mcpServers": {
        "hopla": {
          "url": "${ORIGINE_ADMIN}/mcp",
          "headers": { "Authorization": "Bearer hopla_…" }
        }
      }
    }

Les outils qui lisent (une clé en lecture seule ne voit qu'eux) :

- lire_page, lire_compte : la page entière ; l'offre et ce qu'elle comprend
- lire_stats, lire_semaine, lire_resume : les statistiques, la semaine, le résumé en une phrase
- lire_liste, lister_inscrits : la liste e-mail
- lire_qr_code : le QR code, en image
- lire_site, lire_flux, lire_note_avis : un site, un blog ou une chaîne, une page d'avis
- lister_themes, lister_reseaux, lister_pictos, lister_types, lister_cles : les listes, et les clés

Les outils qui modifient :

- modifier_reglages : profil, thème, réseaux, couleurs, référencement…
- ajouter_bloc, modifier_bloc, dupliquer_bloc, supprimer_bloc, ordonner_blocs : les blocs de la page
- envoyer_image : une image en data URL, gardée chez Hopla
- supprimer_inscrit, envoyer_inscrits : la liste e-mail
`;
