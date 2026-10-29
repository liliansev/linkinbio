/*
 * La documentation de l'API et du serveur MCP (28 octobre 2026), servie telle quelle, sans clé, sur
 * GET https://app.hopla.page/api/v2 (et la v1, `DOC_API_V1`) : lisible par un humain dans le navigateur, et par un agent IA. La version complète,
 * guides et référence, est dans documentation/ (hopla.page/docs). Elles suivent `server/api.ts` et `server/mcp.ts` :
 * un changement là-bas se reporte ici, dans documentation/content/docs et dans documentation/scripts/openapi.ts.
 */
import { NOM_ADMIN, ORIGINE_ADMIN, ORIGINE_PUBLIQUE } from './types.ts';

export const DOC_API_V1 = `# Hopla API v1 (legacy)

This version keeps the French names of 28 October 2026 and remains supported for existing integrations.
New integrations should use API v2, with English names: ${ORIGINE_ADMIN}/api/v2

## Hopla API and MCP server (v1)

Manage a Hopla page from your code or an AI agent (Claude, ChatGPT, Cursor…), with nearly the same
features as the admin panel: profile, theme, social links, blocks, images, analytics, email list, QR code,
and metadata fetching for websites, feeds and review pages.

- REST API (v1): ${ORIGINE_ADMIN}/api/v1
- MCP server (Streamable HTTP): ${ORIGINE_ADMIN}/mcp
- Full documentation (guides and API reference): ${ORIGINE_PUBLIQUE}/docs
- OpenAPI spec: ${ORIGINE_PUBLIQUE}/docs/openapi.json

Requires the Pro plan (or the 14-day trial). Requests and responses are JSON, UTF-8 encoded.

Identifiers (routes, fields, values) are in French. Common terms: page = page, blocs = blocks,
reglages = settings, titre = title, profil = profile, reseaux = social links, inscrits = subscribers,
liste = email list, cles = API keys, compte = account, offre = plan, erreur = error.

## Authentication

Create an API key in the admin panel: ${NOM_ADMIN}, Réglages (Settings), "API et MCP". The key is shown
only once: copy it immediately. A read-only key cannot modify any data.
Send it with every request:

    Authorization: Bearer hopla_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

A key can only access the page of its own account. Revoke unused or leaked keys in Réglages.
If the account leaves the Pro plan, its keys are suspended, then reactivated when it returns to Pro.

## Rate limits

120 requests per minute and 5,000 per day per key. Above that: 429, with a Retry-After header.

## Errors

Errors return an HTTP status and:

    { "erreur": { "code": "cle_invalide", "message": "…" } }

- 400: invalid request (field, URL, period, block type…)
- 401: missing or invalid API key
- 403: read-only key, plan does not include the feature, terms of service not accepted, account suspended
- 404: block, subscriber or route not found
- 409: no newsletter integration connected (POST /inscrits/envoyer)
- 413: payload too large (256 KB; images: 1.5 MB)
- 415: image format other than WebP, JPEG or PNG
- 422: URL could not be fetched (POST /apercu)
- 429: rate limit exceeded

## Endpoints

Page and settings: GET /page, GET /reglages, PATCH /reglages
Blocks: GET /blocs, POST /blocs, GET /blocs/{id}, PATCH /blocs/{id}, DELETE /blocs/{id},
  POST /blocs/{id}/dupliquer, PUT /ordre
Images: POST /medias
Analytics: GET /stats, GET /stats/semaine, GET /stats/resume
Sharing: GET /qr
Email list: GET /liste, GET /inscrits, DELETE /inscrits/{id}, POST /inscrits/envoyer
Web fetching: POST /apercu, POST /flux, POST /avis
Account: GET /compte, GET /cles, GET /export
Reference values: GET /themes, GET /reseaux, GET /pictos, GET /types

Read endpoints (GET, plus the three web fetching endpoints) work with a read-only key.

## REST API

### GET /api/v1/page

Full page: URL, plan, settings and blocks in display order.

    curl ${ORIGINE_ADMIN}/api/v1/page -H "Authorization: Bearer $HOPLA_API_KEY"

### PATCH /api/v1/reglages

Partially update settings; omitted fields are unchanged. profil, bouton, seo, couleurs and redirection
are merged field by field; reseaux is replaced as a whole.

    curl -X PATCH ${ORIGINE_ADMIN}/api/v1/reglages \\
      -H "Authorization: Bearer $HOPLA_API_KEY" -H "Content-Type: application/json" \\
      -d '{"profil": {"bio": "Coach sportive à Lyon"}, "theme": "onyx"}'

Settings fields:

- profil: { nom (name), bio, avatar (https image URL), photo ("ronde" = round or "grande" = large) }
- theme: an id from GET /api/v1/themes
- reseaux: [{ reseau, url }], 20 maximum. reseau: youtube, linkedin, instagram, tiktok, x, github,
  facebook, threads, twitch, spotify, email, site, whatsapp, telegram, discord, pinterest, snapchat,
  bluesky, mastodon, reddit, substack, medium, patreon, soundcloud, deezer, applemusic, applepodcasts,
  bandcamp, vimeo, behance, dribbble, malt, etsy
- reseauxPosition: "haut" (top) or "bas" (bottom)
- couleurs: { fond (background), boutons (buttons), accent } as #rrggbb; empty: theme default
- bouton: { style: "plein", "contour", "doux", "relief" or "verre"; forme: "pilule", "arrondi" or "carre";
  ombre: "aucune", "subtile" or "marquee" }
- seo: { titre, description }
- partage: show the Share button (boolean)
- vouvoiement: page copy uses the formal "vous" (boolean)
- redirection: { url, fin } to redirect the whole page, { "url": "" } to stop

### GET /api/v1/blocs

Blocks, in display order.

### POST /api/v1/blocs

Create a block at the top of the page, or at "position" (zero-based, 0 = top).

    curl -X POST ${ORIGINE_ADMIN}/api/v1/blocs \\
      -H "Authorization: Bearer $HOPLA_API_KEY" -H "Content-Type: application/json" \\
      -d '{"type": "lien", "titre": "Mon nouveau podcast", "url": "https://exemple.fr/podcast", "position": 2}'

Block fields:

- type: lien (link, default), titre (section heading), texte (text), video, derniere-video (latest
  YouTube video), inscription (email signup), preuve (reviews), produit (product), soutien (tips),
  reservation (booking), musique (music), faq, coordonnees (contact card), lieu (location),
  galerie (gallery), formulaire (contact form), flux (RSS feed). Immutable after creation.
- titre: button label, section heading or paragraph text
- url: target URL (https://…, mailto:, tel:)
- sousTitre, description: secondary text
- icone: icon or social network name (youtube, fusee…)
- image: thumbnail https URL
- public: visible on the page (default: true); false hides it
- vedette: featured; format: "bouton" (button), "bandeau" (banner) or "carte" (card)
- debut, fin: ISO 8601 display window; compteARebours: true to show a countdown before the start
- prix: product price; montants: tip amounts for soutien ([5, 10, 20])
- questions: FAQ items, [{ question, reponse }]
- preuve: rating for preuve blocks, { genre: "note", note: 4.8, nombre: 120, source: "Google" }

### GET /api/v1/blocs/{id}

Get a block.

### PATCH /api/v1/blocs/{id}

Partially update a block; omitted fields are unchanged.

    curl -X PATCH ${ORIGINE_ADMIN}/api/v1/blocs/a1b2c3d4e5f6 \\
      -H "Authorization: Bearer $HOPLA_API_KEY" -H "Content-Type: application/json" \\
      -d '{"public": false}'

### DELETE /api/v1/blocs/{id}

Permanently delete a block.

### PUT /api/v1/ordre

New order of all blocks: every block id exactly once.

    { "ids": ["a1b2c3d4e5f6", "f6e5d4c3b2a1"] }

### GET /api/v1/stats

Views, visitors and clicks, by day, block, referrer, device and country, compared with the previous
period. ?periode=7, 14, 30 (default), 90 or 365; or ?du=2026-10-01&au=2026-10-15.
Cookieless: visitor IP addresses are never stored.

### GET /api/v1/stats/semaine

Views for the last 7 days and the 7 days before, on all plans: { semaine: { vues, avant, dejaVue } }.

### GET /api/v1/stats/resume

One-sentence summary of the period (in French) and its highlights ({ texte, ton }). Same period parameters as /stats.

### GET /api/v1/qr

QR code of the page, linking to its URL with ?s=qr. ?format=svg (default) or png, ?taille=120 to 2000 (size in pixels).

### POST /api/v1/blocs/{id}/dupliquer

Duplicate a block right below the original. {"masquer": true} creates the copy hidden.

### POST /api/v1/medias

Upload a WebP, JPEG or PNG image, 1.5 MB maximum: raw bytes (Content-Type: image/png…) or
{"image": "data:image/png;base64,…"}. Returns { media: { chemin, url } }: use chemin (path) in
profil.avatar, imageFond, a block image or gallery images.

    curl -X POST ${ORIGINE_ADMIN}/api/v1/medias \
      -H "Authorization: Bearer $HOPLA_API_KEY" -H "Content-Type: image/jpeg" --data-binary @portrait.jpg

### GET /api/v1/liste

Email list summary: { liste: { inscrits, semaine, enAttente, branchee } }.

### GET /api/v1/inscrits

Subscribers, newest first: ?limite=1 to 500 (default 100), ?depart=0, then the returned "suivant" (next offset).
?format=csv returns the full CSV export (email,prenom,inscrit,source).

### DELETE /api/v1/inscrits/{id}

Delete a subscriber from the Hopla list (the copy in the connected newsletter is kept).

### POST /api/v1/inscrits/envoyer

Push pending subscribers to the connected newsletter or webhook: { envoyes, erreurs } (sent, failed).

### POST /api/v1/apercu, /flux, /avis

Fetch web metadata, as the admin panel does when a URL is pasted: {"url": "https://…"}. 30 requests per 10 minutes.
- /apercu: { apercu: { titre, description, prix, image (data URL) } }; "image": false, "partage", "logo" or "vignette"
- /flux: { articles: [{ titre, url, date, image, video }] }, the latest three posts of a blog or podcast;
  "video": true for the latest video of a YouTube channel
- /avis: { note: { note, nombre, source } } or { note: null }, a rating normalized to 5

### GET /api/v1/compte

Plan, trial, subscription, complimentary plan, and for each gated feature { incluse, offre } (included, required plan).

### GET /api/v1/cles

API keys of the account (never the secret): nom, debut (prefix), ecriture (write access), cree, utilisee, courante (current key).

### GET /api/v1/export

Full JSON export of the account data (GDPR right of access), images excluded.

### GET /api/v1/themes, /reseaux, /pictos, /types

Valid values for themes, social networks, block icons and block types.

## MCP server

The MCP server (${ORIGINE_ADMIN}/mcp) now lists its tools with English names and fields: see ${ORIGINE_ADMIN}/api/v2.
The former French tool names (lire_page, ajouter_bloc…) are still accepted, with French field names.
`;

export const DOC_API = `# Hopla API and MCP server

Manage a Hopla page from your code or an AI agent (Claude, ChatGPT, Cursor…), with nearly the same
features as the admin panel: profile, theme, social links, blocks, images, analytics, email list, QR code,
and metadata fetching for websites, feeds and review pages.

- REST API: ${ORIGINE_ADMIN}/api/v2
- MCP server (Streamable HTTP): ${ORIGINE_ADMIN}/mcp
- Full documentation (guides and API reference): ${ORIGINE_PUBLIQUE}/docs
- OpenAPI spec: ${ORIGINE_PUBLIQUE}/docs/openapi.json

Requires the Pro plan (or the 14-day trial). Requests and responses are JSON, UTF-8 encoded.
API v1 (${ORIGINE_ADMIN}/api/v1, French field names) remains supported for existing integrations.

## Authentication

Create an API key in the admin panel: ${NOM_ADMIN}, Settings, "API et MCP". The key is shown
only once: copy it immediately. A read-only key cannot modify any data.
Send it with every request:

    Authorization: Bearer hopla_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

A key can only access the page of its own account. Revoke unused or leaked keys in Settings.
If the account leaves the Pro plan, its keys are suspended, then reactivated when it returns to Pro.

## Rate limits

120 requests per minute and 5,000 per day per key. Above that: 429, with a Retry-After header.

## Errors

Errors return an HTTP status and:

    { "error": { "code": "invalid_api_key", "message": "…" } }

- 400: invalid request (field, URL, period, block type…)
- 401: missing or invalid API key
- 403: read-only key, plan does not include the feature, terms of service not accepted, account suspended
- 404: block, subscriber or route not found
- 409: no newsletter integration connected (POST /subscribers/sync)
- 413: payload too large (256 KB; images: 1.5 MB)
- 415: image format other than WebP, JPEG or PNG
- 422: URL could not be fetched (POST /fetch/preview)
- 429: rate limit exceeded

## Endpoints

Page and settings: GET /page, GET /settings, PATCH /settings
Blocks: GET /blocks, POST /blocks, GET /blocks/{id}, PATCH /blocks/{id}, DELETE /blocks/{id},
  POST /blocks/{id}/duplicate, PUT /blocks/order
Images: POST /media
Analytics: GET /analytics, GET /analytics/week, GET /analytics/summary
Sharing: GET /qr-code
Email list: GET /email-list, GET /subscribers, DELETE /subscribers/{id}, POST /subscribers/sync
Web fetching: POST /fetch/preview, POST /fetch/feed, POST /fetch/rating
Account: GET /account, GET /api-keys, GET /export
Reference values: GET /themes, GET /social-networks, GET /icons, GET /block-types

Read endpoints (GET, plus the three web fetching endpoints) work with a read-only key.

## REST API

### GET /api/v2/page

Full page: URL, plan, settings and blocks in display order.

    curl ${ORIGINE_ADMIN}/api/v2/page -H "Authorization: Bearer $HOPLA_API_KEY"

### PATCH /api/v2/settings

Partially update settings; omitted fields are unchanged. profile, button, seo, colors and redirect
are merged field by field; socialLinks is replaced as a whole.

    curl -X PATCH ${ORIGINE_ADMIN}/api/v2/settings \\
      -H "Authorization: Bearer $HOPLA_API_KEY" -H "Content-Type: application/json" \\
      -d '{"profile": {"bio": "Coach sportive à Lyon"}, "theme": "onyx"}'

Settings fields:

- profile: { name, bio, avatar (https image URL or /media/ path), photo ("round" or "large") }
- theme: an id from GET /api/v2/themes
- socialLinks: [{ network, url }], 20 maximum. network: an id from GET /api/v2/social-networks
  (youtube, linkedin, instagram, tiktok, x, github, email, site, whatsapp…)
- socialLinksPosition: "top" or "bottom"
- colors: { background, buttons, accent } as #rrggbb; empty: theme default
- button: { style: "solid", "outline", "soft", "raised" or "glass"; shape: "pill", "rounded" or "square";
  shadow: "none", "subtle" or "strong" }
- seo: { title, description }
- shareButton: show the Share button (boolean)
- formal: page copy addresses visitors formally ("vous" instead of "tu") (boolean)
- font, backgroundImage, desktopLayout ("column", "profile" or "one-page")
- redirect: { url, endsAt } to redirect the whole page, { "url": "" } to stop

### GET /api/v2/blocks

Blocks, in display order.

### POST /api/v2/blocks

Create a block at the top of the page, or at "position" (zero-based, 0 = top).

    curl -X POST ${ORIGINE_ADMIN}/api/v2/blocks \\
      -H "Authorization: Bearer $HOPLA_API_KEY" -H "Content-Type: application/json" \\
      -d '{"type": "link", "title": "Mon nouveau podcast", "url": "https://example.com/podcast", "position": 2}'

Block fields:

- type: link (default), heading, text, video, latest-video, email-signup, proof (reviews), product,
  tip, booking, music, faq, contact-card, location, gallery, contact-form, feed. Immutable after creation.
- title: button label, section heading or paragraph text
- url: target URL (https://…, mailto:, tel:)
- subtitle, description: secondary text
- icon: icon id or social network id (GET /api/v2/icons)
- image: thumbnail https URL or /media/ path
- visible: shown on the page (default: true); false hides it
- featured: highlighted; format: "button", "banner" or "card"
- startsAt, endsAt: ISO 8601 display window; countdown: true to show a countdown before the start
- price: product price; amounts: tip amounts ([5, 10, 20])
- questions: FAQ items, [{ question, answer }]
- proof: rating for proof blocks, { kind: "rating", rating: 4.8, count: 120, source: "Google" }

### GET /api/v2/blocks/{id}

Get a block.

### PATCH /api/v2/blocks/{id}

Partially update a block; omitted fields are unchanged.

    curl -X PATCH ${ORIGINE_ADMIN}/api/v2/blocks/a1b2c3d4e5f6 \\
      -H "Authorization: Bearer $HOPLA_API_KEY" -H "Content-Type: application/json" \\
      -d '{"visible": false}'

### DELETE /api/v2/blocks/{id}

Permanently delete a block.

### PUT /api/v2/blocks/order

New order of all blocks: every block id exactly once.

    { "ids": ["a1b2c3d4e5f6", "f6e5d4c3b2a1"] }

### POST /api/v2/blocks/{id}/duplicate

Duplicate a block right below the original. {"hidden": true} creates the copy hidden.

### GET /api/v2/analytics

Views, visitors and clicks, by day, block, referrer, device and country, compared with the previous
period. ?period=7, 14, 30 (default), 90 or 365; or ?from=2026-10-01&to=2026-10-15.
Cookieless: visitor IP addresses are never stored.

### GET /api/v2/analytics/week

Views for the last 7 days and the 7 days before, on all plans: { week: { views, previous, everViewed } }.

### GET /api/v2/analytics/summary

One-sentence summary of the period (in French) and its highlights. Same period parameters as /analytics.

### GET /api/v2/qr-code

QR code of the page, linking to its URL with ?s=qr. ?format=svg (default) or png, ?size=120 to 2000 (pixels).

### POST /api/v2/media

Upload a WebP, JPEG or PNG image, 1.5 MB maximum: raw bytes (Content-Type: image/png…) or
{"image": "data:image/png;base64,…"}. Returns { media: { path, url } }: use path in
profile.avatar, backgroundImage, a block image or gallery images.

    curl -X POST ${ORIGINE_ADMIN}/api/v2/media \\
      -H "Authorization: Bearer $HOPLA_API_KEY" -H "Content-Type: image/jpeg" --data-binary @portrait.jpg

### GET /api/v2/email-list

Email list summary: { list: { subscribers, thisWeek, pending, connected } }.

### GET /api/v2/subscribers

Subscribers, newest first: ?limit=1 to 500 (default 100), ?offset=0, then the returned "next" offset.
?format=csv returns the full CSV export (email,first_name,subscribed_at,source).

### DELETE /api/v2/subscribers/{id}

Delete a subscriber from the Hopla list (the copy in the connected newsletter is kept).

### POST /api/v2/subscribers/sync

Push pending subscribers to the connected newsletter or webhook: { synced, failed }.

### POST /api/v2/fetch/preview, /fetch/feed, /fetch/rating

Fetch web metadata, as the admin panel does when a URL is pasted: {"url": "https://…"}. 30 requests per 10 minutes.
- /fetch/preview: { preview: { title, description, price, image (data URL) } }; "image": false, "share", "logo" or "thumbnail"
- /fetch/feed: { articles: [{ title, url, date, image, video }] }, the latest three posts of a blog or podcast;
  "video": true for the latest video of a YouTube channel
- /fetch/rating: { rating: { rating, count, source } } or { rating: null }, a rating normalized to 5

### GET /api/v2/account

Plan, trial, subscription, complimentary plan, and for each gated feature { included, plan }.

### GET /api/v2/api-keys

API keys of the account (never the secret): name, prefix, writeAccess, createdAt, lastUsedAt, current.

### GET /api/v2/export

Full JSON export of the account data (GDPR right of access), images excluded.

### GET /api/v2/themes, /social-networks, /icons, /block-types

Valid values for themes, social networks, block icons and block types.

## MCP server

Endpoint: ${ORIGINE_ADMIN}/mcp (Streamable HTTP transport, JSON responses, stateless).
Authenticate with the Authorization header, as for the REST API.

Claude Code:

    claude mcp add --transport http hopla ${ORIGINE_ADMIN}/mcp --header "Authorization: Bearer hopla_…"

Cursor, Windsurf and other clients that read an mcp.json file:

    {
      "mcpServers": {
        "hopla": {
          "url": "${ORIGINE_ADMIN}/mcp",
          "headers": { "Authorization": "Bearer hopla_…" }
        }
      }
    }

Read tools (the only tools exposed to a read-only key):

- get_page, get_account: full page; plan and included features
- get_analytics, get_weekly_views, get_analytics_summary: analytics, weekly views, one-sentence summary
- get_email_list, list_subscribers: email list
- get_qr_code: QR code image
- fetch_url_preview, fetch_feed, fetch_review_rating: website metadata, feed or YouTube channel, review rating
- list_themes, list_social_networks, list_icons, list_block_types, list_api_keys: reference values and API keys

Write tools:

- update_settings: profile, theme, social links, colors, SEO…
- create_block, update_block, duplicate_block, delete_block, reorder_blocks: page blocks
- upload_image: upload a data URL image
- delete_subscriber, sync_subscribers: email list

Tools and fields use the same English names as API v2. The former French tool names (lire_page,
ajouter_bloc…) are still accepted, with French field names.
`;
