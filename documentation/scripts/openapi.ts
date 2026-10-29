/*
 * Le fichier OpenAPI de l'API de Hopla (28 octobre 2026), écrit dans public/openapi.json avant chaque build de la
 * documentation : la référence (Scalar, /docs/reference) le lit, et chacun peut le télécharger pour générer un client.
 * Les listes (types de bloc, réseaux, thèmes, styles) viennent du code de l'app, pour ne jamais s'en écarter ; les
 * routes et leurs erreurs suivent `src/server/api.ts` : un changement là-bas se reporte ici.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import {
  ANIMATIONS, ANIMATIONS_BLOC, DISPOSITIONS, FORMATS_VEDETTE, FORMES_BOUTON, FORMES_PHOTO, GENRES_PREUVE, MAX_RESEAUX, MENTIONS_PARTENAIRE,
  OMBRES_BOUTON, RESEAUX, STYLES_BOUTON, TEINTES_VEDETTE, TYPES_BLOC, TYPES_PRINCIPAL,
} from '../../src/lib/types.ts';
import { THEMES } from '../../src/lib/themes.ts';
import { FONCTIONS } from '../../src/lib/abonnement.ts';
import { NOMS_RESEAUX, PICTOS } from '../../src/lib/pictos.ts';

const ref = (nom: string) => ({ $ref: `#/components/schemas/${nom}` });
const texte = (description: string, extra: Record<string, unknown> = {}) => ({ type: 'string', description, ...extra });
const oui = (description: string) => ({ type: 'boolean', description });
const typesPublics = TYPES_BLOC.filter(t => !TYPES_PRINCIPAL.includes(t));

const erreur = (description: string, code: string, message: string) => ({
  description,
  content: { 'application/json': { schema: ref('Error'), example: { erreur: { code, message } } } },
});
const ERREURS = {
  401: erreur('Missing, malformed or revoked API key.', 'cle_invalide', 'Invalid or revoked API key.'),
  403: erreur('Read-only key, plan without API access, terms of service not accepted, or account suspended.', 'offre', 'The API and MCP server require the Pro plan. The key is reactivated when the account is back on Pro.'),
  429: {
    ...erreur('Rate limit exceeded: 120 requests per minute, 5,000 per day per key.', 'trop_d_appels', 'Rate limit exceeded for this API key. Retry in one minute.'),
    headers: { 'Retry-After': { description: 'Seconds to wait before retrying.', schema: { type: 'integer', example: 60 } } },
  },
};
const ecriture = { 400: erreur('Invalid request: field, date or block type.', 'bloc_refuse', 'Scheduling a block (start or end date) requires the Starter plan or higher.'), ...ERREURS };

const json = (description: string, schema: unknown, example?: unknown) => ({ description, content: { 'application/json': { schema, ...(example === undefined ? {} : { example }) } } });
const objetDe = (proprietes: Record<string, unknown>) => ({ type: 'object', properties: proprietes });
const entier = (description: string, example?: number) => ({ type: 'integer', description, ...(example === undefined ? {} : { example }) });
const lectureWeb = { 400: erreur('url is not an http(s) URL.', 'adresse', 'url must be an https:// or http:// URL.'), ...ERREURS,
  429: erreur('Web fetch rate limit exceeded: 30 requests per 10 minutes per account.', 'trop_de_lectures', 'Too many web fetch requests. Retry in a few minutes.') };
const corpsUrl = (exemple: string, extra: Record<string, unknown> = {}) => ({
  required: true,
  content: { 'application/json': { schema: { type: 'object', required: ['url'], properties: { url: texte('URL to fetch (https://).', { example: exemple }), ...extra } }, example: { url: exemple } } },
});
const PERIODE = [
  { name: 'periode', in: 'query', description: 'Number of past days.', schema: { type: 'integer', enum: [7, 14, 30, 90, 365], default: 30 } },
  { name: 'du', in: 'query', description: 'Start date, YYYY-MM-DD, used with `au`.', schema: { type: 'string', format: 'date', example: '2026-10-01' } },
  { name: 'au', in: 'query', description: 'End date, YYYY-MM-DD.', schema: { type: 'string', format: 'date', example: '2026-10-15' } },
];
const INSCRIT_EXEMPLE = { id: '92c5ca872beb', email: 'ana@exemple.fr', prenom: 'Ana', inscrit: '2026-10-27T18:02:11.000Z', source: 'instagram', envoye: false };

const BLOC_EXEMPLE = {
  id: 'a1b2c3d4e5f6', type: 'lien', titre: 'Mon nouveau podcast', url: 'https://exemple.fr/podcast', sousTitre: '', description: '',
  icone: 'micro', image: '', public: true, indexable: true, vedette: false, format: 'bandeau', teinte: 'accent', animation: 'auto',
  debut: '', fin: '', compteARebours: false, creneau: null, audience: null, cache: [], demanderPrenom: false, acces: null, preuve: null,
  prix: '', montants: [], partenariat: null, questions: [], images: [], coordonnees: null, adressePostale: '', sensible: false,
  disposition: 'liste', pays: null, cadeau: null,
};

const REGLAGES_EXEMPLE = {
  profil: { nom: 'Camille Durand', bio: 'Coach sportive à Lyon', avatar: 'https://hopla.page/media/k3v9.webp', badge: false, photo: 'ronde' },
  reseaux: [{ reseau: 'instagram', url: 'https://instagram.com/camille' }, { reseau: 'youtube', url: 'https://youtube.com/@camille' }],
  reseauxPosition: 'haut', theme: 'onyx', couleurs: { fond: '', boutons: '', accent: '' },
  bouton: { style: 'plein', forme: 'pilule', ombre: 'subtile' }, seo: { titre: '', description: '', indexable: true },
  partage: true, ouvrirApps: true, resumeHebdo: true, vouvoiement: false, animation: 'reflet', vuesReseaux: [], bureau: 'colonne',
  utm: false, redirection: { url: '', fin: '' }, police: '', imageFond: '', domaine: '',
};

const blocChamps = {
  titre: texte('Title: button label, section heading or paragraph text.', { example: 'Mon nouveau podcast' }),
  url: texte('Target URL: https://…, mailto: or tel:.', { example: 'https://exemple.fr/podcast' }),
  sousTitre: texte('Subtitle, one line below the title.'),
  description: texte('Longer text below the title of a banner or card.'),
  icone: texte('Icon or social network name: youtube, instagram, fusee…', { example: 'micro' }),
  image: texte('Thumbnail https URL.'),
  public: oui('Visible on the page. false keeps the block hidden in the admin panel.'),
  vedette: oui('Featured (highlighted) block.'),
  format: { type: 'string', enum: [...FORMATS_VEDETTE], description: 'Layout of a featured block: button, banner or card.' },
  teinte: { type: 'string', enum: [...TEINTES_VEDETTE], description: 'Color of a featured block: theme accent, or same as other buttons.' },
  animation: { type: 'string', enum: [...ANIMATIONS_BLOC], description: 'Animation of a featured block; auto follows the page settings.' },
  debut: texte('ISO 8601 date when the block starts showing; empty: immediately. Requires Starter.', { example: '' }),
  fin: texte('ISO 8601 date when the block stops showing; empty: never. Requires Starter.', { example: '' }),
  compteARebours: oui('Show a countdown before the start date instead of hiding the block.'),
  prix: texte('Product price, as displayed: "29 €", "Dès 12 €".'),
  montants: { type: 'array', items: { type: 'number' }, description: 'For soutien (tip) blocks: suggested amounts, in euros.', example: [5, 10, 20] },
  questions: { type: 'array', items: ref('Question'), description: 'FAQ items, in order. 20 maximum.' },
  preuve: { anyOf: [ref('Proof'), { type: 'null' }], description: 'For preuve blocks: a rating, a counter or a testimonial.' },
  partenariat: { anyOf: [ref('Partnership'), { type: 'null' }], description: 'Affiliate link: disclosure label (always displayed) and promo code.' },
  adressePostale: texte('Postal address of a location or contact card.'),
  sensible: oui('Adult content (18+): visitors must confirm before opening the link.'),
  disposition: { type: 'string', enum: [...DISPOSITIONS], description: 'For section headings: display the following links as a list or a grid.' },
};

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Hopla API',
    version: '1.1.0',
    summary: 'Read and update a Hopla page programmatically.',
    description: 'Manage a Hopla page from your code, with the features of the admin panel: profile, theme, social links, blocks, '
      + 'images, analytics, email list, QR code, and metadata fetching for websites, feeds and review pages. '
      + 'Requires the Pro plan (or the 14-day trial). Requests and responses are JSON, UTF-8 encoded.\n\n'
      + 'Create an API key in Réglages (Settings), "API et MCP", on [app.hopla.page](https://app.hopla.page/admin), then send it in the '
      + '`Authorization: Bearer hopla_…` header. Guides: [hopla.page/docs](https://hopla.page/docs).\n\n'
      + 'Identifiers (paths, fields, values) are in French: see the [glossary](https://hopla.page/docs/glossary).',
    contact: { name: 'Hopla', url: 'https://hopla.page/docs' },
    license: { name: 'AGPL-3.0', identifier: 'AGPL-3.0-only' },
  },
  servers: [{ url: 'https://app.hopla.page/api/v1', description: 'Production' }],
  security: [{ cle: [] }],
  tags: [
    { name: 'Page', description: 'Full page and its settings: profile, theme, social links, colors, SEO.' },
    { name: 'Blocks', description: 'Page blocks: links, headings, text, videos, products, FAQ…' },
    { name: 'Analytics', description: 'Views, visitors and clicks, cookieless: visitor IP addresses are never stored.' },
    { name: 'Sharing', description: 'QR code of the page.' },
    { name: 'Images', description: 'Upload images for profile photos, thumbnails, galleries or backgrounds.' },
    { name: 'Email list', description: 'Subscribers collected by the email signup block: list, export, delete, sync to a newsletter.' },
    { name: 'Web fetching', description: 'Metadata the admin panel reads from a pasted URL: website title and image, feed posts, review rating.' },
    { name: 'Account', description: 'Plan, trial, included features, API keys and data export.' },
    { name: 'Reference values', description: 'Valid values for themes, social networks, icons and block types.' },
  ],
  paths: {
    '/page': {
      get: {
        tags: ['Page'], operationId: 'getPage', summary: 'Get page',
        description: 'Full page: URL, plan, settings, and blocks in display order with their ids.',
        responses: {
          200: { description: 'Page.', content: { 'application/json': { schema: ref('Page'), example: { page: { pseudo: 'camille', adresse: 'https://hopla.page/camille', offre: 'pro' }, reglages: REGLAGES_EXEMPLE, blocs: [BLOC_EXEMPLE] } } } },
          ...ERREURS,
        },
      },
    },
    '/reglages': {
      get: {
        tags: ['Page'], operationId: 'getSettings', summary: 'Get settings',
        description: 'Settings only, without blocks: profile, social links, theme, colors, buttons, SEO, redirect.',
        responses: { 200: json('Settings.', objetDe({ reglages: ref('Settings') }), { reglages: REGLAGES_EXEMPLE }), ...ERREURS },
      },
      patch: {
        tags: ['Page'], operationId: 'updateSettings', summary: 'Update settings',
        description: 'Partially update settings; omitted fields are unchanged. `profil`, `bouton`, `seo`, `couleurs` and `redirection` are merged '
          + 'field by field; `reseaux` is replaced as a whole. Requires a key with write access.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: ref('SettingsUpdate'), example: { profil: { bio: 'Coach sportive à Lyon' }, theme: 'onyx' } } },
        },
        responses: {
          200: { description: 'Updated settings.', content: { 'application/json': { schema: { type: 'object', properties: { reglages: ref('Settings') } }, example: { reglages: REGLAGES_EXEMPLE } } } },
          ...ecriture,
        },
      },
    },
    '/blocs': {
      get: {
        tags: ['Blocks'], operationId: 'listBlocks', summary: 'List blocks', description: 'Blocks, in display order.',
        responses: {
          200: { description: 'Blocks.', content: { 'application/json': { schema: { type: 'object', properties: { blocs: { type: 'array', items: ref('Block') } } }, example: { blocs: [BLOC_EXEMPLE] } } } },
          ...ERREURS,
        },
      },
      post: {
        tags: ['Blocks'], operationId: 'createBlock', summary: 'Create block',
        description: 'Create a block at the top of the page, or at `position` (zero-based, 0 = top). Without `type`, creates a link.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: ref('BlockCreate'), example: { type: 'lien', titre: 'Mon nouveau podcast', url: 'https://exemple.fr/podcast', position: 2 } } },
        },
        responses: {
          201: { description: 'Created block, with its id.', content: { 'application/json': { schema: { type: 'object', properties: { bloc: ref('Block') } }, example: { bloc: BLOC_EXEMPLE } } } },
          ...ecriture,
        },
      },
    },
    '/blocs/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Block id, from GET /page or GET /blocs.', schema: { type: 'string', example: 'a1b2c3d4e5f6' } }],
      get: {
        tags: ['Blocks'], operationId: 'getBlock', summary: 'Get block',
        responses: {
          200: { description: 'Block.', content: { 'application/json': { schema: { type: 'object', properties: { bloc: ref('Block') } }, example: { bloc: BLOC_EXEMPLE } } } },
          404: erreur('Block not found.', 'bloc_introuvable', 'Block not found.'),
          ...ERREURS,
        },
      },
      patch: {
        tags: ['Blocks'], operationId: 'updateBlock', summary: 'Update block',
        description: 'Partially update a block; omitted fields are unchanged. Type and id are immutable. `{"public": false}` hides the block without deleting it.',
        requestBody: { required: true, content: { 'application/json': { schema: ref('BlockUpdate'), example: { public: false } } } },
        responses: {
          200: { description: 'Updated block.', content: { 'application/json': { schema: { type: 'object', properties: { bloc: ref('Block') } }, example: { bloc: { ...BLOC_EXEMPLE, public: false } } } } },
          404: erreur('Block not found.', 'bloc_introuvable', 'Block not found.'),
          ...ecriture,
        },
      },
      delete: {
        tags: ['Blocks'], operationId: 'deleteBlock', summary: 'Delete block',
        description: 'Permanently delete a block. To hide it instead, use PATCH with `{"public": false}`.',
        responses: {
          200: { description: 'Block deleted.', content: { 'application/json': { schema: { type: 'object', properties: { supprime: { type: 'string' } } }, example: { supprime: 'a1b2c3d4e5f6' } } } },
          404: erreur('Block not found.', 'bloc_introuvable', 'Block not found.'),
          ...ERREURS,
        },
      },
    },
    '/blocs/{id}/dupliquer': {
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Id of the block to duplicate.', schema: { type: 'string', example: 'a1b2c3d4e5f6' } }],
      post: {
        tags: ['Blocks'], operationId: 'duplicateBlock', summary: 'Duplicate block',
        description: 'Create a copy of the block right below it, with a new id. `masquer: true` creates the copy hidden.',
        requestBody: { required: false, content: { 'application/json': { schema: objetDe({ masquer: oui('Create the copy hidden.') }), example: { masquer: true } } } },
        responses: {
          201: json('Copy.', objetDe({ bloc: ref('Block') }), { bloc: { ...BLOC_EXEMPLE, id: 'f6e5d4c3b2a1', public: false } }),
          404: erreur('Block not found.', 'bloc_introuvable', 'Block not found.'),
          ...ecriture,
        },
      },
    },
    '/ordre': {
      put: {
        tags: ['Blocks'], operationId: 'reorderBlocks', summary: 'Reorder blocks',
        description: 'New order of all blocks: every block id exactly once, first = top.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' } } } }, example: { ids: ['a1b2c3d4e5f6', 'f6e5d4c3b2a1'] } } },
        },
        responses: {
          200: { description: 'Blocks, in their new order.', content: { 'application/json': { schema: { type: 'object', properties: { blocs: { type: 'array', items: ref('Block') } } } } } },
          400: erreur('An id is missing, duplicated or does not belong to the page.', 'ordre_incomplet', 'ids must list every block id exactly once, in the new order.'),
          ...ERREURS,
        },
      },
    },
    '/stats': {
      get: {
        tags: ['Analytics'], operationId: 'getAnalytics', summary: 'Get analytics',
        description: 'Views, visitors and clicks, by day, block, referrer, device and country, compared with the previous period. '
          + 'Use a period or a date range. The period is capped to the analytics retention of the current plan.',
        parameters: PERIODE,
        responses: {
          200: { description: 'Analytics.', content: { 'application/json': { schema: { type: 'object', properties: { stats: ref('Analytics') } } } } },
          400: erreur('Invalid period, or outside the retention period.', 'periode', 'Invalid period: use 7, 14, 30, 90 or 365 days, or du and au dates (YYYY-MM-DD).'),
          ...ERREURS,
        },
      },
    },
    '/stats/semaine': {
      get: {
        tags: ['Analytics'], operationId: 'getWeeklyViews', summary: 'Get weekly views',
        description: 'Views for the last 7 days and the 7 days before. Available on all plans, including those without analytics history.',
        responses: {
          200: json('Weekly views.', objetDe({ semaine: objetDe({ vues: entier('Views in the last 7 days.'), avant: entier('Views in the previous 7 days.'), dejaVue: oui('The page has had at least one view.') }) }),
            { semaine: { vues: 412, avant: 377, dejaVue: true } }),
          ...ERREURS,
        },
      },
    },
    '/stats/resume': {
      get: {
        tags: ['Analytics'], operationId: 'getAnalyticsSummary', summary: 'Get analytics summary',
        description: 'Human-readable summary of the period, in French, as shown in the admin panel: one sentence and its highlights.',
        parameters: PERIODE,
        responses: {
          200: json('Summary.', objetDe({ resume: objetDe({ phrase: texte('Summary sentence, ready to display.'), faits: { type: 'array', items: objetDe({ texte: { type: 'string' }, ton: { type: 'string', enum: ['hausse', 'baisse', 'neutre'], description: 'Trend: up, down or neutral.' } }) }, jours: entier('Period length, in days.') }) }),
            { resume: { phrase: 'En 30 jours, 1 284 vues, 12 % de plus que les 30 jours d’avant.', faits: [{ texte: 'Ta page a eu 1 284 vues, 12 % de plus que les 30 jours d’avant.', ton: 'hausse' }], jours: 30 } }),
          ...ERREURS,
        },
      },
    },
    '/qr': {
      get: {
        tags: ['Sharing'], operationId: 'getQrCode', summary: 'Get QR code',
        description: 'Links to the page URL with `?s=qr`, so scans are tracked separately in analytics.',
        parameters: [
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['svg', 'png'], default: 'svg' } },
          { name: 'taille', in: 'query', description: 'Size, in pixels.', schema: { type: 'integer', minimum: 120, maximum: 2000, default: 720 } },
        ],
        responses: {
          200: { description: 'Image.', content: { 'image/svg+xml': { schema: { type: 'string' } }, 'image/png': { schema: { type: 'string', format: 'binary' } } } },
          ...ERREURS,
        },
      },
    },
    '/medias': {
      post: {
        tags: ['Images'], operationId: 'uploadImage', summary: 'Upload image',
        description: 'Upload a WebP, JPEG or PNG image, 1.5 MB maximum, hosted by Hopla. Send the raw bytes (`Content-Type: image/png`…), '
          + 'or JSON `{"image": "data:image/png;base64,…"}`. Use the returned `chemin` (path) in `profil.avatar`, a block `image`, gallery `images` or `imageFond`.',
        requestBody: {
          required: true,
          content: {
            'image/png': { schema: { type: 'string', format: 'binary' } }, 'image/jpeg': { schema: { type: 'string', format: 'binary' } }, 'image/webp': { schema: { type: 'string', format: 'binary' } },
            'application/json': { schema: { type: 'object', required: ['image'], properties: { image: texte('Data URL.', { example: 'data:image/png;base64,iVBORw0KGgo…' }) } } },
          },
        },
        responses: {
          201: json('Image uploaded.', objetDe({ media: objetDe({ chemin: texte('Path to use in a block or in settings.'), url: texte('Absolute URL.') }) }),
            { media: { chemin: '/media/054a3c6991bc.png', url: 'https://hopla.page/media/054a3c6991bc.png' } }),
          400: erreur('No image in the request.', 'image_absente', 'The image field must be a data URL: data:image/webp;base64,…'),
          413: erreur('Image over 1.5 MB, or storage quota exceeded.', 'image_trop_grosse', 'Image too large: 1.5 MB maximum.'),
          415: erreur('Format other than WebP, JPEG or PNG.', 'format_image', 'Unsupported image format: WebP, JPEG or PNG only.'),
          ...ERREURS,
        },
      },
    },
    '/liste': {
      get: {
        tags: ['Email list'], operationId: 'getEmailList', summary: 'Get email list summary',
        description: 'Total subscribers, new subscribers this week, subscribers pending sync, and the connected integration. The integration credential is never returned.',
        responses: {
          200: json('Email list.', objetDe({ liste: objetDe({ inscrits: entier('Total subscribers.'), semaine: entier('Subscribers in the last 7 days.'), enAttente: entier('Not yet synced.'),
            branchee: { anyOf: [objetDe({ outil: texte('Integration: brevo, mailchimp, kit, make…'), liste: texte('Name of the selected list.'), cle: texte('Masked credential prefix.') }), { type: 'null' }] } }) }),
            { liste: { inscrits: 128, semaine: 9, enAttente: 0, branchee: { outil: 'brevo', liste: 'Newsletter', cle: 'xkeysib-…a3f' } } }),
          ...ERREURS,
        },
      },
    },
    '/inscrits': {
      get: {
        tags: ['Email list'], operationId: 'listSubscribers', summary: 'List subscribers',
        description: 'Subscribers, newest first, paginated. `format=csv` returns the full CSV export (email, prenom, inscrit, source).',
        parameters: [
          { name: 'limite', in: 'query', description: 'Page size.', schema: { type: 'integer', minimum: 1, maximum: 500, default: 100 } },
          { name: 'depart', in: 'query', description: 'Offset: the `suivant` value from the previous page; 0 for the first page.', schema: { type: 'integer', minimum: 0, default: 0 } },
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'csv'], default: 'json' } },
        ],
        responses: {
          200: {
            description: 'A page of subscribers, or the CSV file.',
            content: {
              'application/json': {
                schema: objetDe({ inscrits: { type: 'array', items: ref('Subscriber') }, total: entier('Total subscribers.'), suivant: { type: ['integer', 'null'], description: 'Next offset, to pass as `depart`; null on the last page.' } }),
                example: { inscrits: [INSCRIT_EXEMPLE], total: 128, suivant: 100 },
              },
              'text/csv': { schema: { type: 'string' }, example: 'email,prenom,inscrit,source\nana@exemple.fr,Ana,2026-10-27T18:02:11.000Z,instagram\n' },
            },
          },
          ...ERREURS,
        },
      },
    },
    '/inscrits/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', example: '92c5ca872beb' } }],
      delete: {
        tags: ['Email list'], operationId: 'deleteSubscriber', summary: 'Delete subscriber',
        description: 'Permanently delete a subscriber from Hopla (for example on an erasure request). The copy already synced to the newsletter is kept.',
        responses: {
          200: json('Subscriber deleted.', objetDe({ supprime: { type: 'string' } }), { supprime: '92c5ca872beb' }),
          404: erreur('Subscriber not found.', 'inscrit_introuvable', 'Subscriber not found.'),
          ...ERREURS,
        },
      },
    },
    '/inscrits/envoyer': {
      post: {
        tags: ['Email list'], operationId: 'syncSubscribers', summary: 'Sync pending subscribers',
        description: 'Push pending subscribers to the connected newsletter (Brevo, Mailchimp, Kit…) or webhook (Make, Zapier, n8n).',
        responses: {
          200: json('Sync result.', objetDe({ envoyes: entier('Subscribers sent.'), erreurs: entier('Subscribers rejected by the integration.') }), { envoyes: 9, erreurs: 0 }),
          409: erreur('No integration connected.', 'rien_de_branche', 'No newsletter or automation is connected. Connect one in Intégrations (Integrations) on app.hopla.page.'),
          ...ERREURS,
          429: erreur('Sync rate limit exceeded: 20 requests per 10 minutes.', 'trop_d_appels', 'Too many sync requests. Retry in a few minutes.'),
        },
      },
    },
    '/apercu': {
      post: {
        tags: ['Web fetching'], operationId: 'fetchUrlMetadata', summary: 'Fetch URL metadata',
        description: 'Title, description, price (for product pages) and image of a URL, as the admin panel does when a URL is pasted. '
          + '`image`: `true` (social sharing image or favicon), `false`, `"partage"` (sharing image), `"logo"` or `"vignette"` (thumbnail).',
        requestBody: corpsUrl('https://exemple.fr', { image: { description: 'Image to return.', oneOf: [{ type: 'boolean' }, { type: 'string', enum: ['partage', 'logo', 'vignette'] }] } }),
        responses: {
          200: json('Page metadata.', objetDe({ apercu: objetDe({ titre: { type: 'string' }, description: { type: 'string' }, prix: { type: 'string' }, image: { type: ['string', 'null'], description: 'Image as a data URL; null if none.' } }) }),
            { apercu: { titre: 'Example Domain', description: '', prix: '', image: null } }),
          422: erreur('The site did not respond, or did not return HTML.', 'site_illisible', 'Unable to fetch this URL.'),
          ...lectureWeb,
        },
      },
    },
    '/flux': {
      post: {
        tags: ['Web fetching'], operationId: 'fetchFeed', summary: 'Fetch feed',
        description: 'Latest three posts of a blog or podcast (RSS, Atom, or a page that declares its feed), or with `video: true` the latest long-form video of a YouTube channel.',
        requestBody: corpsUrl('https://exemple.fr/blog', { video: oui('YouTube channel URL: return its latest video.') }),
        responses: {
          200: json('Posts; an empty list if nothing could be read.', objetDe({ articles: { type: 'array', items: objetDe({ titre: { type: 'string' }, url: { type: 'string' }, date: { type: 'string' }, image: { type: 'string' }, video: { type: 'string' } }) } }),
            { articles: [{ titre: 'Mon dernier épisode', url: 'https://exemple.fr/blog/episode-12', date: '2026-10-27T08:00:00.000Z', image: '', video: '' }] }),
          ...lectureWeb,
        },
      },
    },
    '/avis': {
      post: {
        tags: ['Web fetching'], operationId: 'fetchReviewRating', summary: 'Fetch review rating',
        description: 'Rating of a Trustpilot page, or of any page declaring it (JSON-LD `aggregateRating`), normalized to 5. `null` if the page has no rating.',
        requestBody: corpsUrl('https://fr.trustpilot.com/review/exemple.fr'),
        responses: {
          200: json('Rating.', objetDe({ note: { anyOf: [objetDe({ note: { type: 'number' }, nombre: { type: 'integer' }, source: { type: 'string' } }), { type: 'null' }] } }),
            { note: { note: 4.6, nombre: 1820, source: 'Trustpilot' } }),
          ...lectureWeb,
        },
      },
    },
    '/compte': {
      get: {
        tags: ['Account'], operationId: 'getAccount', summary: 'Get account',
        description: 'Current plan, trial, subscription, complimentary plan, and for each gated feature whether it is included and which plan unlocks it.',
        responses: {
          200: json('Account.', objetDe({ compte: ref('Account') }), {
            compte: {
              pseudo: 'camille', adresse: 'https://hopla.page/camille', cree: '2026-10-20T09:12:00.000Z', offre: 'pro', essai: null,
              abonnement: { offre: 'pro', statut: 'active', periode: 'mois', finPeriode: '2026-11-20T09:12:00.000Z' }, offreOfferte: null,
              fonctions: { api: { incluse: true, offre: 'pro' }, couleurs: { incluse: true, offre: 'starter' } }, historiqueStats: 365,
            },
          }),
          ...ERREURS,
        },
      },
    },
    '/cles': {
      get: {
        tags: ['Account'], operationId: 'listApiKeys', summary: 'List API keys',
        description: 'API keys of the account, never the secret itself: name, prefix, permissions and last use. `courante` marks the key used for this request.',
        responses: {
          200: json('API keys.', objetDe({ cles: { type: 'array', items: objetDe({ id: { type: 'string' }, nom: { type: 'string' }, debut: { type: 'string' }, ecriture: { type: 'boolean' }, cree: { type: 'string' }, utilisee: { type: ['string', 'null'] }, courante: { type: 'boolean' } }) } }),
            { cles: [{ id: '2916f190dae2', nom: 'Mon script', debut: 'hopla_hT-a', ecriture: true, cree: '2026-10-28T10:00:00.000Z', utilisee: '2026-10-28T21:40:00.000Z', courante: true }] }),
          ...ERREURS,
        },
      },
    },
    '/export': {
      get: {
        tags: ['Account'], operationId: 'exportAccount', summary: 'Export account data',
        description: 'All data Hopla stores for the account, as a JSON file (GDPR right of access), images excluded.',
        responses: { 200: json('JSON file, served as an attachment.', { type: 'object', additionalProperties: true }), ...ERREURS },
      },
    },
    '/reseaux': {
      get: {
        tags: ['Reference values'], operationId: 'listSocialNetworks', summary: 'List social networks',
        responses: { 200: json('Social networks, with their display names.', objetDe({ reseaux: { type: 'array', items: objetDe({ id: { type: 'string', enum: [...RESEAUX] }, nom: { type: 'string' } }) } }), { reseaux: [{ id: 'instagram', nom: 'Instagram' }] }), ...ERREURS },
      },
    },
    '/pictos': {
      get: {
        tags: ['Reference values'], operationId: 'listIcons', summary: 'List icons',
        description: 'Valid values for the `icone` field of a block.',
        responses: { 200: json('Icons.', objetDe({ pictos: { type: 'array', items: objetDe({ nom: { type: 'string' }, libelle: { type: 'string' } }) } }), { pictos: [{ nom: 'micro', libelle: 'Micro' }] }), ...ERREURS },
      },
    },
    '/types': {
      get: {
        tags: ['Reference values'], operationId: 'listBlockTypes', summary: 'List block types',
        description: 'Block types available to this account.',
        responses: { 200: json('Block types.', objetDe({ types: { type: 'array', items: { type: 'string', enum: [...typesPublics] } } }), { types: typesPublics }), ...ERREURS },
      },
    },
    '/themes': {
      get: {
        tags: ['Reference values'], operationId: 'listThemes', summary: 'List themes',
        responses: {
          200: {
            description: 'Themes.',
            content: { 'application/json': { schema: { type: 'object', properties: { themes: { type: 'array', items: ref('Theme') } } }, example: { themes: THEMES.slice(0, 3).map(t => ({ id: t.id, nom: t.nom, humeur: t.humeur, famille: t.famille })) } } },
          },
          ...ERREURS,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      cle: { type: 'http', scheme: 'bearer', bearerFormat: 'hopla_…', description: 'API key, created in Réglages (Settings), "API et MCP", on app.hopla.page.' },
    },
    schemas: {
      Error: {
        type: 'object', required: ['erreur'],
        properties: { erreur: { type: 'object', required: ['code', 'message'], properties: { code: texte('Stable error code, for programmatic handling.'), message: texte('Human-readable message, in English.') } } },
      },
      Page: {
        type: 'object',
        properties: {
          page: { type: 'object', properties: { pseudo: texte('Page username.'), adresse: texte('Public page URL.'), offre: { type: 'string', enum: ['gratuit', 'starter', 'pro', 'premium'], description: 'Plan (gratuit = free).' } } },
          reglages: ref('Settings'),
          blocs: { type: 'array', items: ref('Block') },
        },
      },
      SocialLink: {
        type: 'object', required: ['reseau', 'url'],
        properties: { reseau: { type: 'string', enum: [...RESEAUX] }, url: texte('Profile URL, or a phone number for WhatsApp.') },
      },
      Settings: {
        type: 'object', description: 'Page settings.',
        properties: {
          profil: {
            type: 'object',
            properties: {
              nom: texte('Name at the top of the page.'), bio: texte('Bio below the name.'), avatar: texte('Profile photo https URL.'),
              badge: oui('Verified badge, set by Hopla.'), photo: { type: 'string', enum: [...FORMES_PHOTO], description: 'Profile photo layout: round (ronde) or large (grande, Starter).' },
            },
          },
          reseaux: { type: 'array', items: ref('SocialLink'), maxItems: MAX_RESEAUX },
          reseauxPosition: { type: 'string', enum: ['haut', 'bas'], description: 'Social icons position: top (haut) or bottom (bas).' },
          theme: { type: 'string', enum: THEMES.map(t => t.id) },
          couleurs: { type: 'object', description: 'Custom colors as #rrggbb; empty: theme default (Starter).', properties: { fond: { type: 'string', description: 'Background.' }, boutons: { type: 'string', description: 'Buttons.' }, accent: { type: 'string' } } },
          bouton: {
            type: 'object',
            properties: { style: { type: 'string', enum: [...STYLES_BOUTON] }, forme: { type: 'string', enum: [...FORMES_BOUTON], description: 'Shape.' }, ombre: { type: 'string', enum: [...OMBRES_BOUTON], description: 'Shadow.' } },
          },
          seo: { type: 'object', properties: { titre: { type: 'string' }, description: { type: 'string' }, indexable: { type: 'boolean' } } },
          partage: oui('Show the Share button at the top of the page.'),
          vouvoiement: oui('Page copy uses the formal "vous" form.'),
          animation: { type: 'string', enum: [...ANIMATIONS], description: 'Animation of featured blocks.' },
          redirection: { type: 'object', description: 'Redirect the whole page to a URL until `fin`; empty `url` to stop (Starter).', properties: { url: { type: 'string' }, fin: { type: 'string' } } },
        },
        additionalProperties: true,
        example: REGLAGES_EXEMPLE,
      },
      SettingsUpdate: {
        description: 'Settings to change. Omitted settings are unchanged.',
        allOf: [ref('Settings')],
      },
      Block: {
        type: 'object', description: 'A page block.',
        properties: {
          id: texte('Block id, assigned by Hopla.', { readOnly: true }),
          type: { type: 'string', enum: [...typesPublics], description: 'Block type. Immutable after creation.' },
          ...blocChamps,
        },
        additionalProperties: true,
        example: BLOC_EXEMPLE,
      },
      BlockCreate: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: [...typesPublics], default: 'lien' },
          ...blocChamps,
          position: { type: 'integer', minimum: 0, description: 'Zero-based position, 0 = top (default).' },
        },
      },
      BlockUpdate: { type: 'object', description: 'Fields to change.', properties: blocChamps },
      Subscriber: objetDe({
        id: { type: 'string' }, email: { type: 'string', format: 'email' }, prenom: { type: 'string', description: 'First name.' }, inscrit: { type: 'string', format: 'date-time', description: 'Signup date.' },
        source: texte('Referrer: instagram, direct, qr…'), envoye: oui('Already synced to the connected newsletter.'),
      }),
      Account: objetDe({
        pseudo: { type: 'string' }, adresse: texte('Public page URL.'), cree: { type: 'string', format: 'date-time' },
        offre: { type: 'string', enum: ['gratuit', 'starter', 'pro', 'premium'], description: 'Effective plan, trial included.' },
        essai: { anyOf: [objetDe({ jusqu: { type: 'string', format: 'date-time' } }), { type: 'null' }], description: 'Trial, with its end date.' },
        abonnement: { anyOf: [objetDe({ offre: { type: 'string' }, statut: { type: 'string' }, periode: { type: 'string' }, finPeriode: { type: 'string', format: 'date-time' } }), { type: 'null' }], description: 'Paid subscription.' },
        offreOfferte: { anyOf: [objetDe({ offre: { type: 'string' }, jusqu: { type: ['string', 'null'] } }), { type: 'null' }], description: 'Complimentary plan.' },
        fonctions: { type: 'object', description: 'Gated features.', properties: Object.fromEntries(Object.keys(FONCTIONS).map(f => [f, objetDe({ incluse: { type: 'boolean' }, offre: { type: 'string' } })])) },
        historiqueStats: entier('Analytics retention of the current plan, in days.', 365),
      }),
      Question: { type: 'object', properties: { question: { type: 'string' }, reponse: { type: 'string', description: 'Answer.' } } },
      Proof: {
        type: 'object',
        properties: {
          genre: { type: 'string', enum: [...GENRES_PREUVE] }, note: { type: 'number', description: 'Rating out of 5.', example: 4.8 },
          nombre: { type: 'number', description: 'Review count, or the displayed number.', example: 120 }, source: { type: 'string', example: 'Google' },
        },
      },
      Partnership: { type: 'object', properties: { mention: { type: 'string', enum: [...MENTIONS_PARTENAIRE], description: 'Disclosure label.' }, code: texte('Promo code; empty if none.') } },
      Theme: { type: 'object', properties: { id: { type: 'string' }, nom: { type: 'string' }, humeur: { type: 'string', description: 'Mood.' }, famille: { type: 'string', description: 'Family.' } } },
      Analytics: {
        type: 'object',
        properties: {
          jours: { type: 'integer' }, vues: { type: 'integer' }, visiteurs: { type: 'integer' }, clics: { type: 'integer' },
          serie: { type: 'array', items: { type: 'object', properties: { jour: { type: 'string', format: 'date' }, vues: { type: 'integer' }, visiteurs: { type: 'integer' }, clics: { type: 'integer' } } } },
          blocs: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, titre: { type: 'string' }, clics: { type: 'integer' }, avant: { type: 'integer' } } } },
          sources: { type: 'array', items: { type: 'object', properties: { nom: { type: 'string' }, vues: { type: 'integer' }, avant: { type: 'integer' } } } },
          appareils: { type: 'array', items: { type: 'object', properties: { nom: { type: 'string' }, vues: { type: 'integer' } } } },
          pays: { type: 'array', items: { type: 'object', properties: { code: { type: 'string', example: 'FR' }, vues: { type: 'integer' }, avant: { type: 'integer' } } } },
          precedent: { type: 'object', description: 'Same totals for the previous period.', properties: { vues: { type: 'integer' }, visiteurs: { type: 'integer' }, clics: { type: 'integer' } } },
        },
        example: {
          jours: 7, vues: 1284, visiteurs: 902, clics: 311,
          serie: [{ jour: '2026-10-22', vues: 170, visiteurs: 121, clics: 40 }],
          blocs: [{ id: 'a1b2c3d4e5f6', titre: 'Mon nouveau podcast', clics: 96, avant: 71 }],
          sources: [{ nom: 'instagram', vues: 640, avant: 512 }], appareils: [{ nom: 'mobile', vues: 1101 }],
          pays: [{ code: 'FR', vues: 1050, avant: 930 }], precedent: { vues: 1120, visiteurs: 801, clics: 260 },
        },
      },
    },
  },
};

mkdirSync(new URL('../public/', import.meta.url), { recursive: true });
writeFileSync(new URL('../public/openapi.json', import.meta.url), `${JSON.stringify(spec, null, 2)}\n`);
// Les listes que les guides montrent (thèmes, réseaux, types de bloc), tirées du même code.
writeFileSync(new URL('../lib/genere.json', import.meta.url), `${JSON.stringify({
  themes: THEMES.map(t => ({ id: t.id, nom: t.nom, humeur: t.humeur, famille: t.famille })),
  reseaux: RESEAUX.map(id => ({ id, nom: NOMS_RESEAUX[id] ?? id })),
  pictos: PICTOS,
  types: typesPublics,
}, null, 2)}\n`);
console.log('public/openapi.json and lib/genere.json written');
