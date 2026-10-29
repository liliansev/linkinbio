import { NOM_PUBLIC, RESEAUX, TYPES_BLOC } from '../lib/types.ts';
import { THEMES } from '../lib/themes.ts';
import type { Appelant } from './api.ts';
import {
  ENTETES_CORS, ErreurApi, ajouterBloc, authentifier, dupliquerBloc, envoyerInscrits, envoyerMedia, ipDe, json, lireApercu, lireCompte, lireFlux,
  lireListe, lireNoteAvis, lirePage, lireResume, lireSemaine, lireStats, listerCles, listerInscrits, listerPictos, listerReseaux, listerThemes,
  listerTypes, modifierBloc, modifierReglages, octetsDeDataUrl, ordonnerBlocs, qrCode, reponseErreur, supprimerBloc, supprimerInscrit,
} from './api.ts';

/*
 * Le serveur MCP de Hopla (28 octobre 2026) : https://app.hopla.page/mcp, transport HTTP « streamable », sans
 * session ni flux SSE : chaque requête POST porte un message JSON-RPC (ou un lot), la réponse revient en JSON.
 * La clé d'API passe dans `Authorization: Bearer`, comme pour l'API REST, et les outils appellent les mêmes
 * gestes (`api.ts`). Une clé en lecture seule ne voit que les outils qui lisent.
 */

const VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const VERSION_SERVEUR = '1.1.0';

const INSTRUCTIONS = `Hopla is a link-in-bio page service (like Linktree) at ${NOM_PUBLIC}/<username>. These tools read and update the page `
  + 'of the API key owner: profile, theme, social links, blocks (links, headings, text, videos, products…), analytics, email list, '
  + 'images and QR code; they can also fetch metadata from a website, a feed or a review page. Call lire_page first to get block ids. '
  + 'Field names and values are in French (titre = title, blocs = blocks, reglages = settings). Write page content in French, '
  + 'addressing visitors with "tu" unless the vouvoiement setting is true.';

interface Outil {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint: false };
  appeler: (a: Appelant, args: Record<string, unknown>) => unknown;
  /** Une image à rendre telle quelle (le QR code), plutôt que du JSON. */
  image?: true;
}

const vide = { type: 'object', properties: {}, additionalProperties: false };

const PERIODE = {
  type: 'object', additionalProperties: false,
  properties: {
    jours: { type: 'integer', enum: [7, 14, 30, 90, 365], description: 'Number of past days (default: 30).' },
    du: { type: 'string', description: 'Start date, YYYY-MM-DD (use with au, instead of jours).' },
    au: { type: 'string', description: 'End date, YYYY-MM-DD.' },
  },
};
const periodeMcp = (args: Record<string, unknown>) => (args.du || args.au ? { du: args.du, au: args.au } : args.jours);

const PROPRIETES_BLOC = {
  titre: { type: 'string', description: 'Button label, section heading or paragraph text.' },
  url: { type: 'string', description: 'https://, mailto: or tel: URL.' },
  sousTitre: { type: 'string' },
  description: { type: 'string' },
  icone: { type: 'string', description: 'Icon name or social network id: youtube, instagram, fusee…' },
  image: { type: 'string', description: 'Thumbnail: path returned by envoyer_image (/media/…), or an https URL.' },
  public: { type: 'boolean', description: 'Visible on the page (default: true).' },
  vedette: { type: 'boolean', description: 'Featured (highlighted) block.' },
  format: { type: 'string', enum: ['bouton', 'bandeau', 'carte'], description: 'Layout of a featured block.' },
  debut: { type: 'string', description: 'ISO 8601 date when the block starts showing; empty: immediately.' },
  fin: { type: 'string', description: 'ISO 8601 date when the block stops showing; empty: never.' },
  compteARebours: { type: 'boolean', description: 'Show a countdown before the start date.' },
  prix: { type: 'string', description: 'Product price, for example "29 €".' },
  montants: { type: 'array', items: { type: 'number' }, description: 'For soutien (tip) blocks: suggested amounts in euros.' },
  questions: { type: 'array', items: { type: 'object', properties: { question: { type: 'string' }, reponse: { type: 'string' } } }, description: 'FAQ items (question, reponse = answer).' },
};

const OUTILS: Outil[] = [
  {
    name: 'lire_page', title: 'Get page',
    description: 'Full page: URL, plan, settings (profile, theme, social links, colors…) and blocks in display order, with their ids.',
    inputSchema: vide, annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: a => lirePage(a),
  },
  {
    name: 'lister_themes', title: 'List themes',
    description: 'Available themes: id, name (nom), mood (humeur), family (famille).',
    inputSchema: vide, annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: () => ({ themes: listerThemes() }),
  },
  {
    name: 'lire_stats', title: 'Get analytics',
    description: 'Page views, visitors and clicks for a period, broken down by day, block, referrer, device and country, compared with the previous period.',
    inputSchema: PERIODE,
    annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: (a, args) => ({ stats: lireStats(a, periodeMcp(args)) }),
  },
  {
    name: 'lire_compte', title: 'Get account',
    description: 'Account details: page URL, plan, trial, subscription, and for each feature whether the current plan includes it.',
    inputSchema: vide, annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: a => lireCompte(a),
  },
  {
    name: 'lire_semaine', title: 'Get weekly views',
    description: 'Views for the last 7 days and the 7 days before, available on all plans.',
    inputSchema: vide, annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: a => lireSemaine(a),
  },
  {
    name: 'lire_resume', title: 'Get analytics summary',
    description: 'One-sentence summary of the period (in French) and its highlights, as shown in the admin panel.',
    inputSchema: PERIODE, annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: (a, args) => lireResume(a, periodeMcp(args)),
  },
  {
    name: 'lire_liste', title: 'Get email list',
    description: 'Subscriber count, new subscribers this week, pending sync count, and the connected integration (Brevo, Mailchimp, Make…).',
    inputSchema: vide, annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: a => lireListe(a),
  },
  {
    name: 'lister_inscrits', title: 'List subscribers',
    description: 'Email list subscribers, newest first: email, first name, date, source. Paginated.',
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: { limite: { type: 'integer', minimum: 1, maximum: 500, description: 'Page size (default: 100).' }, depart: { type: 'integer', minimum: 0, description: 'Offset: the suivant (next) value from the previous page.' } },
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: (a, args) => listerInscrits(a, args.limite, args.depart),
  },
  {
    name: 'lire_qr_code', title: 'Get QR code',
    description: 'QR code of the page as a PNG image. Scans are tracked separately in analytics (QR code source).',
    inputSchema: vide, annotations: { readOnlyHint: true, openWorldHint: false }, image: true,
    appeler: async a => qrCode(a, 'png', 720),
  },
  {
    name: 'lire_site', title: 'Fetch URL metadata',
    description: 'Metadata of a web page: title, description, product price and image, as used when a URL is pasted in Hopla.',
    inputSchema: { type: 'object', required: ['url'], additionalProperties: false, properties: { url: { type: 'string' }, image: { type: 'boolean', description: 'false: title only, faster.' } } },
    annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: (a, args) => lireApercu(a, { url: args.url, image: args.image === true ? 'partage' : false }),
  },
  {
    name: 'lire_flux', title: 'Fetch feed',
    description: 'Latest posts of a blog or podcast feed, or the latest video of a YouTube channel (video: true).',
    inputSchema: { type: 'object', required: ['url'], additionalProperties: false, properties: { url: { type: 'string' }, video: { type: 'boolean' } } },
    annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: (a, args) => lireFlux(a, args),
  },
  {
    name: 'lire_note_avis', title: 'Fetch review rating',
    description: 'Rating of a review page (Trustpilot, or any page declaring it in JSON-LD), out of 5, with the review count.',
    inputSchema: { type: 'object', required: ['url'], additionalProperties: false, properties: { url: { type: 'string' } } },
    annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: (a, args) => lireNoteAvis(a, args),
  },
  {
    name: 'lister_reseaux', title: 'List social networks',
    description: 'Social networks a page can display as icons (id and name).',
    inputSchema: vide, annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: () => listerReseaux(),
  },
  {
    name: 'lister_pictos', title: 'List icons',
    description: 'Icons available for the icone field of a block.',
    inputSchema: vide, annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: () => listerPictos(),
  },
  {
    name: 'lister_types', title: 'List block types',
    description: 'Block types available for this page.',
    inputSchema: vide, annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: a => listerTypes(a),
  },
  {
    name: 'lister_cles', title: 'List API keys',
    description: 'API keys of the account (never the secret): name, prefix, permissions, last used.',
    inputSchema: vide, annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: a => listerCles(a),
  },
  {
    name: 'modifier_reglages', title: 'Update settings',
    description: 'Partially update page settings; omitted fields are unchanged. profil, bouton, seo, couleurs and redirection are merged field by field; reseaux is replaced as a whole.',
    inputSchema: {
      type: 'object', required: ['reglages'], additionalProperties: false,
      properties: {
        reglages: {
          type: 'object', additionalProperties: true,
          properties: {
            profil: { type: 'object', properties: { nom: { type: 'string' }, bio: { type: 'string' }, avatar: { type: 'string', description: 'Profile photo: path returned by envoyer_image (/media/…), or an https URL.' } } },
            theme: { type: 'string', enum: THEMES.map(t => t.id) },
            reseaux: { type: 'array', items: { type: 'object', required: ['reseau', 'url'], properties: { reseau: { type: 'string', enum: [...RESEAUX] }, url: { type: 'string' } } } },
            reseauxPosition: { type: 'string', enum: ['haut', 'bas'] },
            couleurs: { type: 'object', description: '#rrggbb values; empty: theme default.', properties: { fond: { type: 'string' }, boutons: { type: 'string' }, accent: { type: 'string' } } },
            bouton: { type: 'object', properties: { style: { type: 'string', enum: ['plein', 'contour', 'doux', 'relief', 'verre'] }, forme: { type: 'string', enum: ['pilule', 'arrondi', 'carre'] }, ombre: { type: 'string', enum: ['aucune', 'subtile', 'marquee'] } } },
            seo: { type: 'object', properties: { titre: { type: 'string' }, description: { type: 'string' } } },
            partage: { type: 'boolean', description: 'Show the Share button at the top of the page.' },
            vouvoiement: { type: 'boolean' },
            redirection: { type: 'object', description: 'Redirect the whole page to a URL; empty url to stop.', properties: { url: { type: 'string' }, fin: { type: 'string' } } },
          },
        },
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    appeler: (a, args) => ({ reglages: modifierReglages(a, args.reglages) }),
  },
  {
    name: 'ajouter_bloc', title: 'Create block',
    description: 'Create a block at the top of the page or at a given position. Defaults to a link (lien).',
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: {
        type: { type: 'string', enum: TYPES_BLOC.filter(t => t !== 'newsletter'), description: 'lien (link, default), titre (heading), texte (text), video, produit (product), faq…' },
        ...PROPRIETES_BLOC,
        position: { type: 'integer', minimum: 0, description: 'Zero-based position, 0 = top (default).' },
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    appeler: (a, { position, ...bloc }) => ({ bloc: ajouterBloc(a, bloc, position) }),
  },
  {
    name: 'modifier_bloc', title: 'Update block',
    description: 'Partially update a block; omitted fields are unchanged. The type cannot change. public: false hides the block without deleting it.',
    inputSchema: {
      type: 'object', required: ['id'], additionalProperties: false,
      properties: { id: { type: 'string', description: 'Block id, from lire_page.' }, ...PROPRIETES_BLOC },
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    appeler: (a, { id, ...partiel }) => ({ bloc: modifierBloc(a, String(id ?? ''), partiel) }),
  },
  {
    name: 'supprimer_bloc', title: 'Delete block',
    description: 'Permanently delete a block. To hide it instead, use modifier_bloc with public: false.',
    inputSchema: { type: 'object', required: ['id'], additionalProperties: false, properties: { id: { type: 'string' } } },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    appeler: (a, { id }) => supprimerBloc(a, String(id ?? '')),
  },
  {
    name: 'ordonner_blocs', title: 'Reorder blocks',
    description: 'New order of all blocks: every block id exactly once, first = top.',
    inputSchema: { type: 'object', required: ['ids'], additionalProperties: false, properties: { ids: { type: 'array', items: { type: 'string' } } } },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    appeler: (a, { ids }) => ({ blocs: ordonnerBlocs(a, ids) }),
  },
];

OUTILS.push(
  {
    name: 'dupliquer_bloc', title: 'Duplicate block',
    description: 'Duplicate a block and insert the copy right below it. masquer: true creates the copy hidden.',
    inputSchema: { type: 'object', required: ['id'], additionalProperties: false, properties: { id: { type: 'string' }, masquer: { type: 'boolean' } } },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    appeler: (a, { id, masquer }) => ({ bloc: dupliquerBloc(a, String(id ?? ''), { masquer }) }),
  },
  {
    name: 'envoyer_image', title: 'Upload image',
    description: 'Upload an image (WebP, JPEG or PNG data URL, 1.5 MB max) and return its path, for use as avatar, block thumbnail (image) or in a gallery.',
    inputSchema: { type: 'object', required: ['image'], additionalProperties: false, properties: { image: { type: 'string', description: 'data:image/png;base64,…' } } },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    appeler: (a, { image }) => envoyerMedia(a, octetsDeDataUrl(image)),
  },
  {
    name: 'supprimer_inscrit', title: 'Delete subscriber',
    description: 'Permanently delete a subscriber from the Hopla email list (not from the connected integration).',
    inputSchema: { type: 'object', required: ['id'], additionalProperties: false, properties: { id: { type: 'string' } } },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    appeler: (a, { id }) => supprimerInscrit(a, String(id ?? '')),
  },
  {
    name: 'envoyer_inscrits', title: 'Sync subscribers',
    description: 'Push pending subscribers to the connected integration (Brevo, Mailchimp, Make…).',
    inputSchema: vide,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    appeler: a => envoyerInscrits(a),
  },
);

const outilsPour = (a: Appelant) => OUTILS.filter(o => a.ecriture || o.annotations.readOnlyHint);

type Id = string | number | null;
interface Message { jsonrpc?: unknown; id?: Id; method?: unknown; params?: unknown }

const resultat = (id: Id, result: unknown) => ({ jsonrpc: '2.0', id, result });
const erreurRpc = (id: Id, code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } });

async function traiter(m: Message, a: Appelant): Promise<object | null> {
  const id = typeof m.id === 'string' || typeof m.id === 'number' ? m.id : null;
  const notification = !('id' in m);
  if (m.jsonrpc !== '2.0' || typeof m.method !== 'string') return notification ? null : erreurRpc(id, -32600, 'Invalid JSON-RPC request.');
  if (notification) return null;
  const params = (m.params && typeof m.params === 'object' ? m.params : {}) as Record<string, unknown>;
  switch (m.method) {
    case 'initialize': {
      const demandee = String(params.protocolVersion ?? '');
      return resultat(id, {
        protocolVersion: VERSIONS.includes(demandee) ? demandee : VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'hopla', title: 'Hopla', version: VERSION_SERVEUR },
        instructions: INSTRUCTIONS,
      });
    }
    case 'ping': return resultat(id, {});
    case 'tools/list':
      return resultat(id, { tools: outilsPour(a).map(({ appeler: _, ...o }) => o) });
    case 'tools/call': {
      const outil = outilsPour(a).find(o => o.name === params.name);
      if (!outil) {
        const existe = OUTILS.some(o => o.name === params.name);
        return resultat(id, { isError: true, content: [{ type: 'text', text: existe ? 'This API key is read-only. Use a key with write access.' : `Unknown tool: ${String(params.name)}.` }] });
      }
      const args = (params.arguments && typeof params.arguments === 'object' && !Array.isArray(params.arguments) ? params.arguments : {}) as Record<string, unknown>;
      try {
        const sortie = await outil.appeler(a, args) as Record<string, unknown>;
        if (outil.image) {
          const { type, corps } = sortie as { type: string; corps: Uint8Array };
          return resultat(id, { content: [{ type: 'image', mimeType: type, data: Buffer.from(corps).toString('base64') }] });
        }
        return resultat(id, { content: [{ type: 'text', text: JSON.stringify(sortie) }], structuredContent: sortie });
      } catch (error) {
        if (!(error instanceof ErreurApi)) console.error('[mcp]', error);
        const message = error instanceof ErreurApi ? error.message : 'Internal server error. Retry shortly.';
        return resultat(id, { isError: true, content: [{ type: 'text', text: message }] });
      }
    }
    case 'resources/list': return resultat(id, { resources: [] });
    case 'prompts/list': return resultat(id, { prompts: [] });
    default: return erreurRpc(id, -32601, `Method not found: ${m.method}.`);
  }
}

export async function repondreMcp(requete: Request, env: Record<string, string | undefined> = process.env): Promise<Response> {
  const methode = requete.method.toUpperCase();
  if (methode === 'OPTIONS') return new Response(null, { status: 204, headers: ENTETES_CORS });
  // Pas de flux ouvert par le serveur, ni de session à fermer : seul POST répond.
  if (methode !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST, OPTIONS', ...ENTETES_CORS } });
  let a: Appelant;
  try { a = authentifier(requete.headers.get('authorization'), ipDe(requete), env); }
  catch (error) { return reponseErreur(error); }
  const texte = await requete.text();
  // Assez pour une image de 1,5 Mo en base64 (envoyer_image), et ses quelques champs autour.
  if (texte.length > 2_200_000) return json(413, erreurRpc(null, -32600, 'Message too large (2 MB maximum).'));
  let corps: unknown;
  try { corps = JSON.parse(texte); }
  catch { return json(400, erreurRpc(null, -32700, 'Message is not valid JSON.')); }
  const lot = Array.isArray(corps);
  const messages = (lot ? corps as unknown[] : [corps]).slice(0, 50).map(m => (m && typeof m === 'object' ? m : {}) as Message);
  if (!messages.length) return json(400, erreurRpc(null, -32600, 'Empty batch.'));
  const reponses = (await Promise.all(messages.map(m => traiter(m, a)))).filter((r): r is object => r !== null);
  // Que des notifications (notifications/initialized…) : rien à répondre.
  if (!reponses.length) return new Response(null, { status: 202, headers: ENTETES_CORS });
  return json(200, lot ? reponses : reponses[0]);
}
