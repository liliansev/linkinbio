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

const INSTRUCTIONS = `Hopla est une page de liens (comme Linktree) sur ${NOM_PUBLIC}/<pseudo>. Ces outils lisent et modifient la page `
  + 'de la personne qui a créé la clé : son profil, son thème, ses réseaux, ses blocs (liens, titres, textes, vidéos, produits…), '
  + 'leurs statistiques, sa liste e-mail et ses images, son QR code ; ils savent aussi lire un site, un blog ou une page d’avis. Commence par lire_page pour connaître les id des blocs. Écris en français, au tutoiement, sauf si la page vouvoie.';

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
    jours: { type: 'integer', enum: [7, 14, 30, 90, 365], description: 'Les derniers jours (30 par défaut).' },
    du: { type: 'string', description: 'Premier jour, AAAA-MM-JJ (avec « au », à la place de « jours »).' },
    au: { type: 'string', description: 'Dernier jour, AAAA-MM-JJ.' },
  },
};
const periodeMcp = (args: Record<string, unknown>) => (args.du || args.au ? { du: args.du, au: args.au } : args.jours);

const PROPRIETES_BLOC = {
  titre: { type: 'string', description: 'Libellé du bouton, titre de section ou texte du paragraphe.' },
  url: { type: 'string', description: 'Adresse https://, mailto: ou tel:.' },
  sousTitre: { type: 'string' },
  description: { type: 'string' },
  icone: { type: 'string', description: 'Nom d’un picto ou d’un réseau : youtube, instagram, fusee…' },
  image: { type: 'string', description: 'La vignette : le chemin rendu par envoyer_image (/media/…), ou une adresse https.' },
  public: { type: 'boolean', description: 'Visible sur la page (vrai par défaut).' },
  vedette: { type: 'boolean', description: 'Mis en avant.' },
  format: { type: 'string', enum: ['bouton', 'bandeau', 'carte'], description: 'Forme d’un bloc mis en avant.' },
  debut: { type: 'string', description: 'Date ISO 8601 à partir de laquelle le bloc s’affiche ; vide : tout de suite.' },
  fin: { type: 'string', description: 'Date ISO 8601 où le bloc disparaît ; vide : jamais.' },
  compteARebours: { type: 'boolean', description: 'Avant le début, montrer un compte à rebours.' },
  prix: { type: 'string', description: 'Pour un produit : « 29 € ».' },
  montants: { type: 'array', items: { type: 'number' }, description: 'Pour « soutien » : les montants proposés en euros.' },
  questions: { type: 'array', items: { type: 'object', properties: { question: { type: 'string' }, reponse: { type: 'string' } } }, description: 'Pour une FAQ.' },
};

const OUTILS: Outil[] = [
  {
    name: 'lire_page', title: 'Lire la page',
    description: 'La page entière : son adresse, son offre, ses réglages (profil, thème, réseaux, couleurs…) et ses blocs dans l’ordre, avec leurs id.',
    inputSchema: vide, annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: a => lirePage(a),
  },
  {
    name: 'lister_themes', title: 'Lister les thèmes',
    description: 'Les thèmes que la page peut prendre : id, nom, humeur, famille.',
    inputSchema: vide, annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: () => ({ themes: listerThemes() }),
  },
  {
    name: 'lire_stats', title: 'Lire les statistiques',
    description: 'Vues, visiteurs et clics de la page sur une période, par jour, par bloc, par réseau, par appareil et par pays, comparés à la période d’avant.',
    inputSchema: PERIODE,
    annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: (a, args) => ({ stats: lireStats(a, periodeMcp(args)) }),
  },
  {
    name: 'lire_compte', title: 'Lire le compte',
    description: 'Le compte : adresse de la page, offre, essai, abonnement, et pour chaque fonction de Hopla si l’offre l’inclut.',
    inputSchema: vide, annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: a => lireCompte(a),
  },
  {
    name: 'lire_semaine', title: 'Lire les vues de la semaine',
    description: 'Les vues des 7 derniers jours et celles des 7 d’avant, pour toutes les offres.',
    inputSchema: vide, annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: a => lireSemaine(a),
  },
  {
    name: 'lire_resume', title: 'Résumer les statistiques',
    description: 'La période en une phrase (« En 30 jours, ta page a eu… ») et ses faits marquants, comme « En bref » dans Stats.',
    inputSchema: PERIODE, annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: (a, args) => lireResume(a, periodeMcp(args)),
  },
  {
    name: 'lire_liste', title: 'Lire la liste e-mail',
    description: 'Le nombre d’inscrits, ceux de la semaine, ceux pas encore envoyés, et l’outil où ils partent (Brevo, Mailchimp, Make…).',
    inputSchema: vide, annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: a => lireListe(a),
  },
  {
    name: 'lister_inscrits', title: 'Lister les inscrits',
    description: 'Les inscrits de la liste e-mail, du plus récent au plus ancien : e-mail, prénom, date, provenance. Par pages.',
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: { limite: { type: 'integer', minimum: 1, maximum: 500, description: '100 par défaut.' }, depart: { type: 'integer', minimum: 0, description: 'Le « suivant » de la page d’avant.' } },
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: (a, args) => listerInscrits(a, args.limite, args.depart),
  },
  {
    name: 'lire_qr_code', title: 'QR code de la page',
    description: 'Le QR code de la page, en image PNG. Ses scans se comptent à part dans les stats (source « QR code »).',
    inputSchema: vide, annotations: { readOnlyHint: true, openWorldHint: false }, image: true,
    appeler: async a => qrCode(a, 'png', 720),
  },
  {
    name: 'lire_site', title: 'Lire un site',
    description: 'Ce qu’un site dit de lui : titre, description, prix d’un produit et image, comme quand on colle une adresse dans Hopla.',
    inputSchema: { type: 'object', required: ['url'], additionalProperties: false, properties: { url: { type: 'string' }, image: { type: 'boolean', description: 'Faux : le titre seul, plus rapide.' } } },
    annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: (a, args) => lireApercu(a, { url: args.url, image: args.image === true ? 'partage' : false }),
  },
  {
    name: 'lire_flux', title: 'Lire un blog ou une chaîne',
    description: 'Les derniers articles d’un blog ou d’un podcast, ou la dernière vidéo d’une chaîne YouTube (video: true).',
    inputSchema: { type: 'object', required: ['url'], additionalProperties: false, properties: { url: { type: 'string' }, video: { type: 'boolean' } } },
    annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: (a, args) => lireFlux(a, args),
  },
  {
    name: 'lire_note_avis', title: 'Lire une note d’avis',
    description: 'La note d’une page d’avis (Trustpilot, ou une page qui la déclare), sur 5, et le nombre d’avis.',
    inputSchema: { type: 'object', required: ['url'], additionalProperties: false, properties: { url: { type: 'string' } } },
    annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: (a, args) => lireNoteAvis(a, args),
  },
  {
    name: 'lister_reseaux', title: 'Lister les réseaux',
    description: 'Les réseaux qu’une page peut afficher en icônes (id et nom).',
    inputSchema: vide, annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: () => listerReseaux(),
  },
  {
    name: 'lister_pictos', title: 'Lister les pictos',
    description: 'Les pictos qu’un bloc peut prendre dans son champ « icone ».',
    inputSchema: vide, annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: () => listerPictos(),
  },
  {
    name: 'lister_types', title: 'Lister les types de blocs',
    description: 'Les types de blocs que cette page peut poser.',
    inputSchema: vide, annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: a => listerTypes(a),
  },
  {
    name: 'lister_cles', title: 'Lister les clés d’API',
    description: 'Les clés du compte (jamais la clé elle-même) : nom, début, droits, dernière utilisation.',
    inputSchema: vide, annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: a => listerCles(a),
  },
  {
    name: 'modifier_reglages', title: 'Modifier les réglages',
    description: 'Change une partie des réglages de la page ; le reste est gardé. profil, bouton, seo, couleurs et redirection se complètent champ par champ, reseaux se remplace en entier.',
    inputSchema: {
      type: 'object', required: ['reglages'], additionalProperties: false,
      properties: {
        reglages: {
          type: 'object', additionalProperties: true,
          properties: {
            profil: { type: 'object', properties: { nom: { type: 'string' }, bio: { type: 'string' }, avatar: { type: 'string', description: 'La photo : le chemin rendu par envoyer_image (/media/…), ou une adresse https.' } } },
            theme: { type: 'string', enum: THEMES.map(t => t.id) },
            reseaux: { type: 'array', items: { type: 'object', required: ['reseau', 'url'], properties: { reseau: { type: 'string', enum: [...RESEAUX] }, url: { type: 'string' } } } },
            reseauxPosition: { type: 'string', enum: ['haut', 'bas'] },
            couleurs: { type: 'object', description: 'En #rrggbb ; vide : la couleur du thème.', properties: { fond: { type: 'string' }, boutons: { type: 'string' }, accent: { type: 'string' } } },
            bouton: { type: 'object', properties: { style: { type: 'string', enum: ['plein', 'contour', 'doux', 'relief', 'verre'] }, forme: { type: 'string', enum: ['pilule', 'arrondi', 'carre'] }, ombre: { type: 'string', enum: ['aucune', 'subtile', 'marquee'] } } },
            seo: { type: 'object', properties: { titre: { type: 'string' }, description: { type: 'string' } } },
            partage: { type: 'boolean', description: 'Le bouton Partager en haut de la page.' },
            vouvoiement: { type: 'boolean' },
            redirection: { type: 'object', description: 'Toute la page envoyée vers une adresse ; url vide pour arrêter.', properties: { url: { type: 'string' }, fin: { type: 'string' } } },
          },
        },
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    appeler: (a, args) => ({ reglages: modifierReglages(a, args.reglages) }),
  },
  {
    name: 'ajouter_bloc', title: 'Ajouter un bloc',
    description: 'Ajoute un bloc à la page, en haut ou à une position. Un lien par défaut.',
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: {
        type: { type: 'string', enum: TYPES_BLOC.filter(t => t !== 'newsletter'), description: 'lien (par défaut), titre de section, texte, video, produit, faq…' },
        ...PROPRIETES_BLOC,
        position: { type: 'integer', minimum: 0, description: 'Sa place, 0 en haut (par défaut).' },
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    appeler: (a, { position, ...bloc }) => ({ bloc: ajouterBloc(a, bloc, position) }),
  },
  {
    name: 'modifier_bloc', title: 'Modifier un bloc',
    description: 'Change une partie d’un bloc ; le reste est gardé. Son type ne change pas. « public: false » le masque sans le supprimer.',
    inputSchema: {
      type: 'object', required: ['id'], additionalProperties: false,
      properties: { id: { type: 'string', description: 'L’id du bloc, lu avec lire_page.' }, ...PROPRIETES_BLOC },
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    appeler: (a, { id, ...partiel }) => ({ bloc: modifierBloc(a, String(id ?? ''), partiel) }),
  },
  {
    name: 'supprimer_bloc', title: 'Supprimer un bloc',
    description: 'Supprime un bloc de la page, pour de bon. Pour le cacher sans le perdre, préfère modifier_bloc avec « public: false ».',
    inputSchema: { type: 'object', required: ['id'], additionalProperties: false, properties: { id: { type: 'string' } } },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    appeler: (a, { id }) => supprimerBloc(a, String(id ?? '')),
  },
  {
    name: 'ordonner_blocs', title: 'Réordonner les blocs',
    description: 'Le nouvel ordre de tous les blocs de la page : chaque id une fois, le premier en haut.',
    inputSchema: { type: 'object', required: ['ids'], additionalProperties: false, properties: { ids: { type: 'array', items: { type: 'string' } } } },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    appeler: (a, { ids }) => ({ blocs: ordonnerBlocs(a, ids) }),
  },
];

OUTILS.push(
  {
    name: 'dupliquer_bloc', title: 'Dupliquer un bloc',
    description: 'Copie un bloc et la pose juste sous lui. masquer: true la garde masquée le temps de la modifier.',
    inputSchema: { type: 'object', required: ['id'], additionalProperties: false, properties: { id: { type: 'string' }, masquer: { type: 'boolean' } } },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    appeler: (a, { id, masquer }) => ({ bloc: dupliquerBloc(a, String(id ?? ''), { masquer }) }),
  },
  {
    name: 'envoyer_image', title: 'Envoyer une image',
    description: 'Envoie une image chez Hopla (data URL WebP, JPEG ou PNG, 1,5 Mo au plus) et rend son adresse, à poser en avatar, en vignette (image) ou dans une galerie.',
    inputSchema: { type: 'object', required: ['image'], additionalProperties: false, properties: { image: { type: 'string', description: 'data:image/png;base64,…' } } },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    appeler: (a, { image }) => envoyerMedia(a, octetsDeDataUrl(image)),
  },
  {
    name: 'supprimer_inscrit', title: 'Supprimer un inscrit',
    description: 'Retire un inscrit de la liste e-mail chez Hopla (pas chez l’outil branché), pour de bon.',
    inputSchema: { type: 'object', required: ['id'], additionalProperties: false, properties: { id: { type: 'string' } } },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    appeler: (a, { id }) => supprimerInscrit(a, String(id ?? '')),
  },
  {
    name: 'envoyer_inscrits', title: 'Envoyer les inscrits',
    description: 'Envoie à l’outil branché (Brevo, Mailchimp, Make…) les inscrits qui n’y sont pas encore.',
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
  if (m.jsonrpc !== '2.0' || typeof m.method !== 'string') return notification ? null : erreurRpc(id, -32600, 'Requête JSON-RPC invalide.');
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
        return resultat(id, { isError: true, content: [{ type: 'text', text: existe ? 'Cette clé est en lecture seule : crée une clé qui peut modifier ta page.' : `Outil inconnu : ${String(params.name)}.` }] });
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
        const message = error instanceof ErreurApi ? error.message : 'Le serveur a eu un souci. Réessaie dans un instant.';
        return resultat(id, { isError: true, content: [{ type: 'text', text: message }] });
      }
    }
    case 'resources/list': return resultat(id, { resources: [] });
    case 'prompts/list': return resultat(id, { prompts: [] });
    default: return erreurRpc(id, -32601, `Méthode inconnue : ${m.method}.`);
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
  if (texte.length > 2_200_000) return json(413, erreurRpc(null, -32600, 'Message trop gros (2 Mo au plus).'));
  let corps: unknown;
  try { corps = JSON.parse(texte); }
  catch { return json(400, erreurRpc(null, -32700, 'Le message n’est pas du JSON valide.')); }
  const lot = Array.isArray(corps);
  const messages = (lot ? corps as unknown[] : [corps]).slice(0, 50).map(m => (m && typeof m === 'object' ? m : {}) as Message);
  if (!messages.length) return json(400, erreurRpc(null, -32600, 'Lot vide.'));
  const reponses = (await Promise.all(messages.map(m => traiter(m, a)))).filter((r): r is object => r !== null);
  // Que des notifications (notifications/initialized…) : rien à répondre.
  if (!reponses.length) return new Response(null, { status: 202, headers: ENTETES_CORS });
  return json(200, lot ? reponses : reponses[0]);
}
