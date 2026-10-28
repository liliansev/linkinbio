import { NOM_PUBLIC, RESEAUX, TYPES_BLOC } from '../lib/types.ts';
import { THEMES } from '../lib/themes.ts';
import type { Appelant } from './api.ts';
import {
  ENTETES_CORS, ErreurApi, ajouterBloc, authentifier, ipDe, json, lirePage, lireStats, listerThemes, modifierBloc, modifierReglages,
  ordonnerBlocs, reponseErreur, supprimerBloc,
} from './api.ts';

/*
 * Le serveur MCP de Hopla (28 octobre 2026) : https://app.hopla.page/mcp, transport HTTP « streamable », sans
 * session ni flux SSE : chaque requête POST porte un message JSON-RPC (ou un lot), la réponse revient en JSON.
 * La clé d'API passe dans `Authorization: Bearer`, comme pour l'API REST, et les outils appellent les mêmes
 * gestes (`api.ts`). Une clé en lecture seule ne voit que les outils qui lisent.
 */

const VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const VERSION_SERVEUR = '1.0.0';

const INSTRUCTIONS = `Hopla est une page de liens (comme Linktree) sur ${NOM_PUBLIC}/<pseudo>. Ces outils lisent et modifient la page `
  + 'de la personne qui a créé la clé : son profil, son thème, ses réseaux, ses blocs (liens, titres, textes, vidéos, produits…) '
  + 'et leurs statistiques. Commence par lire_page pour connaître les id des blocs. Écris en français, au tutoiement, sauf si la page vouvoie.';

interface Outil {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint: false };
  appeler: (a: Appelant, args: Record<string, unknown>) => unknown;
}

const vide = { type: 'object', properties: {}, additionalProperties: false };

const PROPRIETES_BLOC = {
  titre: { type: 'string', description: 'Libellé du bouton, titre de section ou texte du paragraphe.' },
  url: { type: 'string', description: 'Adresse https://, mailto: ou tel:.' },
  sousTitre: { type: 'string' },
  description: { type: 'string' },
  icone: { type: 'string', description: 'Nom d’un picto ou d’un réseau : youtube, instagram, fusee…' },
  image: { type: 'string', description: 'Adresse https de la vignette.' },
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
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: {
        jours: { type: 'integer', enum: [7, 14, 30, 90, 365], description: 'Les derniers jours (30 par défaut).' },
        du: { type: 'string', description: 'Premier jour, AAAA-MM-JJ (avec « au », à la place de « jours »).' },
        au: { type: 'string', description: 'Dernier jour, AAAA-MM-JJ.' },
      },
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    appeler: (a, args) => ({ stats: lireStats(a, args.du || args.au ? { du: args.du, au: args.au } : args.jours) }),
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
            profil: { type: 'object', properties: { nom: { type: 'string' }, bio: { type: 'string' }, avatar: { type: 'string', description: 'Adresse https d’une image.' } } },
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

const outilsPour = (a: Appelant) => OUTILS.filter(o => a.ecriture || o.annotations.readOnlyHint);

type Id = string | number | null;
interface Message { jsonrpc?: unknown; id?: Id; method?: unknown; params?: unknown }

const resultat = (id: Id, result: unknown) => ({ jsonrpc: '2.0', id, result });
const erreurRpc = (id: Id, code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } });

function traiter(m: Message, a: Appelant): object | null {
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
        const sortie = outil.appeler(a, args) as Record<string, unknown>;
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
  if (texte.length > 256_000) return json(413, erreurRpc(null, -32600, 'Message trop gros (256 Ko au plus).'));
  let corps: unknown;
  try { corps = JSON.parse(texte); }
  catch { return json(400, erreurRpc(null, -32700, 'Le message n’est pas du JSON valide.')); }
  const lot = Array.isArray(corps);
  const messages = (lot ? corps as unknown[] : [corps]).slice(0, 50).map(m => (m && typeof m === 'object' ? m : {}) as Message);
  if (!messages.length) return json(400, erreurRpc(null, -32600, 'Lot vide.'));
  const reponses = messages.map(m => traiter(m, a)).filter((r): r is object => r !== null);
  // Que des notifications (notifications/initialized…) : rien à répondre.
  if (!reponses.length) return new Response(null, { status: 202, headers: ENTETES_CORS });
  return json(200, lot ? reponses : reponses[0]);
}
