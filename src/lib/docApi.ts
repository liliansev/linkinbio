/*
 * La documentation de l'API et du serveur MCP (28 octobre 2026), servie telle quelle, sans clé, sur
 * GET https://app.hopla.page/api/v1 : lisible par un humain dans le navigateur, et par un agent IA.
 * Elle suit `server/api.ts` et `server/mcp.ts` : un changement là-bas se reporte ici.
 */
export const DOC_API = `# API et serveur MCP de Hopla

Ta page Hopla se gère aussi depuis ton code ou ton agent IA (Claude, ChatGPT, Cursor…) :
profil, thème, réseaux, blocs, ordre des blocs, statistiques.

- API REST : https://app.hopla.page/api/v1
- Serveur MCP (HTTP « streamable ») : https://app.hopla.page/mcp

Réservé à l'offre Pro (et à l'essai de 14 jours). Les échanges sont en JSON, en UTF-8.

## Clé d'API

Crée une clé dans le back office : app.hopla.page, Réglages, « API et MCP ». Elle ne s'affiche
qu'une fois : copie-la tout de suite. Une clé « lecture seule » lit sans rien modifier.
Envoie-la dans chaque requête :

    Authorization: Bearer hopla_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Une clé ne touche qu'à ta page. Révoque-la dans Réglages dès qu'elle ne sert plus, ou si elle a fuité.
Si ta page quitte l'offre Pro, tes clés s'arrêtent et reprennent quand elle y revient.

## Limites

120 appels par minute et 5 000 par jour pour une clé. Au-delà : 429, avec Retry-After.

## Erreurs

Toute erreur répond un statut HTTP et :

    { "erreur": { "code": "cle_invalide", "message": "…" } }

- 400 : requête refusée (champ, période, type de bloc…)
- 401 : clé absente ou invalide
- 403 : clé en lecture seule, offre insuffisante, conditions à accepter, compte suspendu
- 404 : bloc ou adresse introuvable
- 429 : trop d'appels

## API REST

### GET /api/v1/page

La page entière : son adresse et son offre, ses réglages, ses blocs dans l'ordre.

    curl https://app.hopla.page/api/v1/page -H "Authorization: Bearer $HOPLA_CLE"

### PATCH /api/v1/reglages

Change une partie des réglages ; le reste est gardé. profil, bouton, seo, couleurs et redirection
se complètent champ par champ ; reseaux se remplace en entier.

    curl -X PATCH https://app.hopla.page/api/v1/reglages \\
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

    curl -X POST https://app.hopla.page/api/v1/blocs \\
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

    curl -X PATCH https://app.hopla.page/api/v1/blocs/a1b2c3d4e5f6 \\
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

### GET /api/v1/themes

Les thèmes de la page : id, nom, humeur, famille.

## Serveur MCP

Adresse : https://app.hopla.page/mcp (transport HTTP « streamable », réponses JSON, sans session).
La clé passe dans l'en-tête Authorization, comme pour l'API.

Claude Code :

    claude mcp add --transport http hopla https://app.hopla.page/mcp --header "Authorization: Bearer hopla_…"

Cursor, Windsurf et les clients qui lisent un fichier mcp.json :

    {
      "mcpServers": {
        "hopla": {
          "url": "https://app.hopla.page/mcp",
          "headers": { "Authorization": "Bearer hopla_…" }
        }
      }
    }

Les outils :

- lire_page : la page entière, réglages et blocs
- lister_themes : les thèmes possibles
- lire_stats : les statistiques d'une période
- modifier_reglages : profil, thème, réseaux, couleurs, référencement…
- ajouter_bloc, modifier_bloc, supprimer_bloc, ordonner_blocs : les blocs de la page

Avec une clé en lecture seule, seuls les trois premiers sont proposés.
`;
