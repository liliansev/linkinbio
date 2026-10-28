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
  content: { 'application/json': { schema: ref('Erreur'), example: { erreur: { code, message } } } },
});
const ERREURS = {
  401: erreur('Clé absente, mal formée ou révoquée.', 'cle_invalide', 'Cette clé n’existe pas ou a été révoquée.'),
  403: erreur('Clé en lecture seule, offre sans l’API, conditions à accepter ou compte suspendu.', 'offre', 'L’API et le serveur MCP demandent Hopla Pro. Ta clé reprendra du service dès que ta page y repasse.'),
  429: {
    ...erreur('Trop d’appels avec cette clé : 120 par minute, 5 000 par jour.', 'trop_d_appels', 'Trop d’appels avec cette clé. Réessaie dans une minute.'),
    headers: { 'Retry-After': { description: 'Les secondes à attendre.', schema: { type: 'integer', example: 60 } } },
  },
};
const ecriture = { 400: erreur('Requête refusée : un champ, une date ou un type de bloc.', 'bloc_refuse', 'La date de fin vient avant celle du début.'), ...ERREURS };

const json = (description: string, schema: unknown, example?: unknown) => ({ description, content: { 'application/json': { schema, ...(example === undefined ? {} : { example }) } } });
const objetDe = (proprietes: Record<string, unknown>) => ({ type: 'object', properties: proprietes });
const entier = (description: string, example?: number) => ({ type: 'integer', description, ...(example === undefined ? {} : { example }) });
const lectureWeb = { 400: erreur('L’adresse n’est pas une adresse http(s).', 'adresse', 'Donne une adresse https:// (ou http://).'), ...ERREURS,
  429: erreur('Trop de lectures du web : 30 par 10 minutes et par compte.', 'trop_de_lectures', 'Trop de lectures de sites. Réessaie dans quelques minutes.') };
const corpsUrl = (exemple: string, extra: Record<string, unknown> = {}) => ({
  required: true,
  content: { 'application/json': { schema: { type: 'object', required: ['url'], properties: { url: texte('L’adresse à lire, en https://.', { example: exemple }), ...extra } }, example: { url: exemple } } },
});
const PERIODE = [
  { name: 'periode', in: 'query', description: 'Les derniers jours.', schema: { type: 'integer', enum: [7, 14, 30, 90, 365], default: 30 } },
  { name: 'du', in: 'query', description: 'Premier jour, AAAA-MM-JJ, avec `au`.', schema: { type: 'string', format: 'date', example: '2026-10-01' } },
  { name: 'au', in: 'query', description: 'Dernier jour, AAAA-MM-JJ.', schema: { type: 'string', format: 'date', example: '2026-10-15' } },
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
  titre: texte('Le libellé du bouton, le titre de section ou le texte du paragraphe.', { example: 'Mon nouveau podcast' }),
  url: texte('L’adresse : https://…, mailto: ou tel:.', { example: 'https://exemple.fr/podcast' }),
  sousTitre: texte('Une ligne sous le titre.'),
  description: texte('Un texte plus long, sous le titre d’un bandeau ou d’une carte.'),
  icone: texte('Le nom d’un picto ou d’un réseau : youtube, instagram, fusee…', { example: 'micro' }),
  image: texte('L’adresse https de la vignette.'),
  public: oui('Visible sur la page. false le garde dans le back office, masqué.'),
  vedette: oui('Mis en avant.'),
  format: { type: 'string', enum: [...FORMATS_VEDETTE], description: 'La forme d’un bloc mis en avant.' },
  teinte: { type: 'string', enum: [...TEINTES_VEDETTE], description: 'Sa couleur : l’accent du thème, ou celle des autres boutons.' },
  animation: { type: 'string', enum: [...ANIMATIONS_BLOC], description: 'Le mouvement d’un bloc mis en avant ; auto suit les réglages.' },
  debut: texte('Date ISO 8601 à partir de laquelle le bloc s’affiche ; vide : tout de suite. Demande Starter.', { example: '' }),
  fin: texte('Date ISO 8601 où le bloc disparaît ; vide : jamais. Demande Starter.', { example: '' }),
  compteARebours: oui('Avant son début, montrer un compte à rebours plutôt que rien.'),
  prix: texte('Pour un produit, tel qu’il s’affiche : « 29 € », « Dès 12 € ».'),
  montants: { type: 'array', items: { type: 'number' }, description: 'Pour « soutien » : les montants proposés, en euros.', example: [5, 10, 20] },
  questions: { type: 'array', items: ref('Question'), description: 'Pour une FAQ, dans l’ordre. 20 au plus.' },
  preuve: { anyOf: [ref('Preuve'), { type: 'null' }], description: 'Pour un bloc preuve : une note, un compteur ou un témoignage.' },
  partenariat: { anyOf: [ref('Partenariat'), { type: 'null' }], description: 'Un lien partenaire : sa mention (toujours affichée) et son code promo.' },
  adressePostale: texte('L’adresse d’un lieu ou d’une carte de visite, telle qu’on l’écrit sur une enveloppe.'),
  sensible: oui('Réservé aux plus de 18 ans : la page demande confirmation avant d’ouvrir le lien.'),
  disposition: { type: 'string', enum: [...DISPOSITIONS], description: 'Pour un titre de section : les liens qui le suivent en liste ou en grille.' },
};

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'API de Hopla',
    version: '1.1.0',
    summary: 'Lire et modifier sa page Hopla depuis son code.',
    description: 'Ta page Hopla se gère aussi depuis ton code : tout ce que fait le back office, ou presque. Profil, thème, réseaux, blocs, '
      + 'images, statistiques, liste e-mail, QR code, et la lecture d’un site, d’un blog ou d’une page d’avis. '
      + 'Réservé à l’offre Pro (et aux 14 jours d’essai). Les échanges sont en JSON, en UTF-8.\n\n'
      + 'Crée une clé dans Réglages, « API et MCP », sur [app.hopla.page](https://app.hopla.page/admin), puis envoie-la dans '
      + 'l’en-tête `Authorization: Bearer hopla_…`. Les guides : [hopla.page/docs](https://hopla.page/docs).',
    contact: { name: 'Hopla', url: 'https://hopla.page/docs' },
    license: { name: 'AGPL-3.0', identifier: 'AGPL-3.0-only' },
  },
  servers: [{ url: 'https://app.hopla.page/api/v1', description: 'Production' }],
  security: [{ cle: [] }],
  tags: [
    { name: 'Page', description: 'La page entière et ses réglages : profil, thème, réseaux, couleurs, référencement.' },
    { name: 'Blocs', description: 'Les blocs de la page : liens, titres, textes, vidéos, produits, FAQ…' },
    { name: 'Statistiques', description: 'Vues, visiteurs et clics, sans cookie : l’adresse IP des visiteurs n’est jamais gardée.' },
    { name: 'Partage', description: 'Le QR code de la page.' },
    { name: 'Images', description: 'Envoyer une image chez Hopla, pour une photo de profil, une vignette, une galerie ou un fond.' },
    { name: 'Liste e-mail', description: 'Les inscrits du bloc « Rejoins ma liste » : les lire, les exporter, les supprimer, les envoyer à ta newsletter.' },
    { name: 'Lire le web', description: 'Ce que le back office lit d’une adresse collée : le titre et l’image d’un site, les articles d’un blog, la note d’une page d’avis.' },
    { name: 'Compte', description: 'L’offre, l’essai, ce qu’elle comprend, les clés d’API et l’export de tes données.' },
    { name: 'Référence', description: 'Les listes que la page connaît : thèmes, réseaux, pictos, types de bloc.' },
  ],
  paths: {
    '/page': {
      get: {
        tags: ['Page'], operationId: 'lirePage', summary: 'Lire la page',
        description: 'La page entière : son adresse et son offre, ses réglages, ses blocs dans l’ordre, avec leurs id.',
        responses: {
          200: { description: 'La page.', content: { 'application/json': { schema: ref('Page'), example: { page: { pseudo: 'camille', adresse: 'https://hopla.page/camille', offre: 'pro' }, reglages: REGLAGES_EXEMPLE, blocs: [BLOC_EXEMPLE] } } } },
          ...ERREURS,
        },
      },
    },
    '/reglages': {
      get: {
        tags: ['Page'], operationId: 'lireReglages', summary: 'Lire les réglages',
        description: 'Les réglages seuls, sans les blocs : profil, réseaux, thème, couleurs, boutons, référencement, redirection.',
        responses: { 200: json('Les réglages.', objetDe({ reglages: ref('Reglages') }), { reglages: REGLAGES_EXEMPLE }), ...ERREURS },
      },
      patch: {
        tags: ['Page'], operationId: 'modifierReglages', summary: 'Modifier les réglages',
        description: 'Change une partie des réglages ; le reste est gardé. `profil`, `bouton`, `seo`, `couleurs` et `redirection` se complètent '
          + 'champ par champ ; `reseaux` se remplace en entier. Une clé en lecture seule reçoit 403.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: ref('ReglagesPartiels'), example: { profil: { bio: 'Coach sportive à Lyon' }, theme: 'onyx' } } },
        },
        responses: {
          200: { description: 'Les réglages, après le changement.', content: { 'application/json': { schema: { type: 'object', properties: { reglages: ref('Reglages') } }, example: { reglages: REGLAGES_EXEMPLE } } } },
          ...ecriture,
        },
      },
    },
    '/blocs': {
      get: {
        tags: ['Blocs'], operationId: 'listerBlocs', summary: 'Lister les blocs', description: 'Les blocs, dans l’ordre de la page.',
        responses: {
          200: { description: 'Les blocs.', content: { 'application/json': { schema: { type: 'object', properties: { blocs: { type: 'array', items: ref('Bloc') } } }, example: { blocs: [BLOC_EXEMPLE] } } } },
          ...ERREURS,
        },
      },
      post: {
        tags: ['Blocs'], operationId: 'ajouterBloc', summary: 'Ajouter un bloc',
        description: 'Ajoute un bloc, en haut de la page ou à `position` (0 : en haut). Sans `type`, c’est un lien.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: ref('NouveauBloc'), example: { type: 'lien', titre: 'Mon nouveau podcast', url: 'https://exemple.fr/podcast', position: 2 } } },
        },
        responses: {
          201: { description: 'Le bloc ajouté, avec son id.', content: { 'application/json': { schema: { type: 'object', properties: { bloc: ref('Bloc') } }, example: { bloc: BLOC_EXEMPLE } } } },
          ...ecriture,
        },
      },
    },
    '/blocs/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, description: 'L’id du bloc, lu avec GET /page ou GET /blocs.', schema: { type: 'string', example: 'a1b2c3d4e5f6' } }],
      get: {
        tags: ['Blocs'], operationId: 'lireBloc', summary: 'Lire un bloc',
        responses: {
          200: { description: 'Le bloc.', content: { 'application/json': { schema: { type: 'object', properties: { bloc: ref('Bloc') } }, example: { bloc: BLOC_EXEMPLE } } } },
          404: erreur('Aucun bloc de ta page n’a cet id.', 'bloc_introuvable', 'Aucun bloc de ta page n’a cet id.'),
          ...ERREURS,
        },
      },
      patch: {
        tags: ['Blocs'], operationId: 'modifierBloc', summary: 'Modifier un bloc',
        description: 'Change une partie d’un bloc ; le reste est gardé. Son type et son id ne changent pas. `{"public": false}` le masque sans le supprimer.',
        requestBody: { required: true, content: { 'application/json': { schema: ref('BlocPartiel'), example: { public: false } } } },
        responses: {
          200: { description: 'Le bloc, après le changement.', content: { 'application/json': { schema: { type: 'object', properties: { bloc: ref('Bloc') } }, example: { bloc: { ...BLOC_EXEMPLE, public: false } } } } },
          404: erreur('Aucun bloc de ta page n’a cet id.', 'bloc_introuvable', 'Aucun bloc de ta page n’a cet id.'),
          ...ecriture,
        },
      },
      delete: {
        tags: ['Blocs'], operationId: 'supprimerBloc', summary: 'Supprimer un bloc',
        description: 'Supprime un bloc, pour de bon. Pour le cacher sans le perdre, préfère PATCH avec `{"public": false}`.',
        responses: {
          200: { description: 'Le bloc est supprimé.', content: { 'application/json': { schema: { type: 'object', properties: { supprime: { type: 'string' } } }, example: { supprime: 'a1b2c3d4e5f6' } } } },
          404: erreur('Aucun bloc de ta page n’a cet id.', 'bloc_introuvable', 'Aucun bloc de ta page n’a cet id.'),
          ...ERREURS,
        },
      },
    },
    '/blocs/{id}/dupliquer': {
      parameters: [{ name: 'id', in: 'path', required: true, description: 'L’id du bloc à copier.', schema: { type: 'string', example: 'a1b2c3d4e5f6' } }],
      post: {
        tags: ['Blocs'], operationId: 'dupliquerBloc', summary: 'Dupliquer un bloc',
        description: 'Une copie du bloc, posée juste sous lui, avec un nouvel id. `masquer: true` la garde hors de la page, le temps de la retoucher.',
        requestBody: { required: false, content: { 'application/json': { schema: objetDe({ masquer: oui('Poser la copie masquée.') }), example: { masquer: true } } } },
        responses: {
          201: json('La copie.', objetDe({ bloc: ref('Bloc') }), { bloc: { ...BLOC_EXEMPLE, id: 'f6e5d4c3b2a1', public: false } }),
          404: erreur('Aucun bloc de ta page n’a cet id.', 'bloc_introuvable', 'Aucun bloc de ta page n’a cet id.'),
          ...ecriture,
        },
      },
    },
    '/ordre': {
      put: {
        tags: ['Blocs'], operationId: 'ordonnerBlocs', summary: 'Réordonner les blocs',
        description: 'Le nouvel ordre de tous les blocs : chaque id une fois, le premier en haut.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' } } } }, example: { ids: ['a1b2c3d4e5f6', 'f6e5d4c3b2a1'] } } },
        },
        responses: {
          200: { description: 'Les blocs, dans leur nouvel ordre.', content: { 'application/json': { schema: { type: 'object', properties: { blocs: { type: 'array', items: ref('Bloc') } } } } } },
          400: erreur('Un id manque, se répète ou n’est pas à ta page.', 'ordre_incomplet', 'Donne les id de tous les blocs de ta page, chacun une fois, dans le nouvel ordre.'),
          ...ERREURS,
        },
      },
    },
    '/stats': {
      get: {
        tags: ['Statistiques'], operationId: 'lireStats', summary: 'Lire les statistiques',
        description: 'Les vues, visiteurs et clics, par jour, par bloc, par réseau, par appareil et par pays, comparés à la période d’avant. '
          + 'Une période, ou deux dates. La période est bornée à l’historique de ton offre.',
        parameters: PERIODE,
        responses: {
          200: { description: 'Les statistiques.', content: { 'application/json': { schema: { type: 'object', properties: { stats: ref('Stats') } } } } },
          400: erreur('Période refusée, ou plus ancienne que ton historique.', 'periode', 'Période refusée : 7, 14, 30, 90 ou 365 jours, ou des dates du et au (AAAA-MM-JJ).'),
          ...ERREURS,
        },
      },
    },
    '/stats/semaine': {
      get: {
        tags: ['Statistiques'], operationId: 'lireSemaine', summary: 'Les vues de la semaine',
        description: 'Les vues des 7 derniers jours et celles des 7 d’avant. Pour toutes les offres, même sans historique.',
        responses: {
          200: json('La semaine.', objetDe({ semaine: objetDe({ vues: entier('Vues des 7 derniers jours.'), avant: entier('Vues des 7 jours d’avant.'), dejaVue: oui('La page a déjà eu au moins une vue.') }) }),
            { semaine: { vues: 412, avant: 377, dejaVue: true } }),
          ...ERREURS,
        },
      },
    },
    '/stats/resume': {
      get: {
        tags: ['Statistiques'], operationId: 'lireResume', summary: 'Le résumé en une phrase',
        description: 'Ce que disent les stats, en français, comme « En bref » dans le back office : une phrase, et les faits qui la portent.',
        parameters: PERIODE,
        responses: {
          200: json('Le résumé.', objetDe({ resume: objetDe({ phrase: texte('Une phrase à montrer telle quelle.'), faits: { type: 'array', items: objetDe({ texte: { type: 'string' }, ton: { type: 'string', enum: ['hausse', 'baisse', 'neutre'] } }) }, jours: entier('La période lue, en jours.') }) }),
            { resume: { phrase: 'En 30 jours, 1 284 vues, 12 % de plus que les 30 jours d’avant.', faits: [{ texte: 'Ta page a eu 1 284 vues, 12 % de plus que les 30 jours d’avant.', ton: 'hausse' }], jours: 30 } }),
          ...ERREURS,
        },
      },
    },
    '/qr': {
      get: {
        tags: ['Partage'], operationId: 'lireQrCode', summary: 'Le QR code de la page',
        description: 'Il mène à l’adresse de la page, marquée `?s=qr` : ses scans se comptent à part dans les stats.',
        parameters: [
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['svg', 'png'], default: 'svg' } },
          { name: 'taille', in: 'query', description: 'Le côté, en pixels.', schema: { type: 'integer', minimum: 120, maximum: 2000, default: 720 } },
        ],
        responses: {
          200: { description: 'L’image.', content: { 'image/svg+xml': { schema: { type: 'string' } }, 'image/png': { schema: { type: 'string', format: 'binary' } } } },
          ...ERREURS,
        },
      },
    },
    '/medias': {
      post: {
        tags: ['Images'], operationId: 'envoyerImage', summary: 'Envoyer une image',
        description: 'Une image WebP, JPEG ou PNG de 1,5 Mo au plus, gardée chez Hopla. Envoie ses octets tels quels (`Content-Type: image/png`…), '
          + 'ou du JSON `{"image": "data:image/png;base64,…"}`. Le `chemin` rendu se pose dans `profil.avatar`, `image` d’un bloc, `images` d’une galerie ou `imageFond`.',
        requestBody: {
          required: true,
          content: {
            'image/png': { schema: { type: 'string', format: 'binary' } }, 'image/jpeg': { schema: { type: 'string', format: 'binary' } }, 'image/webp': { schema: { type: 'string', format: 'binary' } },
            'application/json': { schema: { type: 'object', required: ['image'], properties: { image: texte('Une data URL.', { example: 'data:image/png;base64,iVBORw0KGgo…' }) } } },
          },
        },
        responses: {
          201: json('L’image est gardée.', objetDe({ media: objetDe({ chemin: texte('À poser dans un bloc ou les réglages.'), url: texte('Son adresse complète.') }) }),
            { media: { chemin: '/media/054a3c6991bc.png', url: 'https://hopla.page/media/054a3c6991bc.png' } }),
          400: erreur('Rien d’envoyé.', 'image_absente', 'Le champ « image » attend une data URL : data:image/webp;base64,…'),
          413: erreur('Plus de 1,5 Mo, ou plus de place pour ce compte.', 'image_trop_grosse', 'Image trop grosse : 1,5 Mo au plus.'),
          415: erreur('Ni WebP, ni JPEG, ni PNG.', 'format_image', 'Format refusé : WebP, JPEG ou PNG.'),
          ...ERREURS,
        },
      },
    },
    '/liste': {
      get: {
        tags: ['Liste e-mail'], operationId: 'lireListe', summary: 'Le résumé de la liste',
        description: 'Combien d’inscrits, combien cette semaine, combien pas encore envoyés à ta newsletter, et où ils partent. La clé de la newsletter ne revient jamais.',
        responses: {
          200: json('La liste.', objetDe({ liste: objetDe({ inscrits: entier('Tous les inscrits.'), semaine: entier('Inscrits ces 7 derniers jours.'), enAttente: entier('Pas encore envoyés.'),
            branchee: { anyOf: [objetDe({ outil: texte('brevo, mailchimp, kit, make…'), liste: texte('Le nom de la liste choisie.'), cle: texte('Le début de la clé, masqué.') }), { type: 'null' }] } }) }),
            { liste: { inscrits: 128, semaine: 9, enAttente: 0, branchee: { outil: 'brevo', liste: 'Newsletter', cle: 'xkeysib-…a3f' } } }),
          ...ERREURS,
        },
      },
    },
    '/inscrits': {
      get: {
        tags: ['Liste e-mail'], operationId: 'listerInscrits', summary: 'Lister les inscrits',
        description: 'Les inscrits, du plus récent au plus ancien, par pages. `format=csv` rend tout le fichier (email, prenom, inscrit, source).',
        parameters: [
          { name: 'limite', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 500, default: 100 } },
          { name: 'depart', in: 'query', description: 'Le `suivant` de la page d’avant ; 0 au début.', schema: { type: 'integer', minimum: 0, default: 0 } },
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'csv'], default: 'json' } },
        ],
        responses: {
          200: {
            description: 'Une page d’inscrits, ou le CSV.',
            content: {
              'application/json': {
                schema: objetDe({ inscrits: { type: 'array', items: ref('Inscrit') }, total: entier('Tous les inscrits.'), suivant: { type: ['integer', 'null'], description: 'À passer en `depart` ; null à la dernière page.' } }),
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
        tags: ['Liste e-mail'], operationId: 'supprimerInscrit', summary: 'Supprimer un inscrit',
        description: 'Retire un inscrit de ta liste chez Hopla, pour de bon (une demande d’effacement, par exemple). Ta newsletter garde sa copie.',
        responses: {
          200: json('L’inscrit est supprimé.', objetDe({ supprime: { type: 'string' } }), { supprime: '92c5ca872beb' }),
          404: erreur('Aucun inscrit de ta liste n’a cet id.', 'inscrit_introuvable', 'Aucun inscrit de ta liste n’a cet id.'),
          ...ERREURS,
        },
      },
    },
    '/inscrits/envoyer': {
      post: {
        tags: ['Liste e-mail'], operationId: 'envoyerInscrits', summary: 'Envoyer les inscrits en attente',
        description: 'Pousse vers la newsletter branchée (Brevo, Mailchimp, Kit…) ou le webhook (Make, Zapier, n8n) les inscrits pas encore partis.',
        responses: {
          200: json('Ce qui est parti.', objetDe({ envoyes: entier('Inscrits envoyés.'), erreurs: entier('Inscrits refusés par l’outil.') }), { envoyes: 9, erreurs: 0 }),
          409: erreur('Rien de branché.', 'rien_de_branche', 'Aucune newsletter ni automatisation n’est branchée : branche-la dans Intégrations, sur app.hopla.page.'),
          ...ERREURS,
          429: erreur('Trop d’envois : 20 par 10 minutes.', 'trop_d_appels', 'Trop d’envois. Réessaie dans quelques minutes.'),
        },
      },
    },
    '/apercu': {
      post: {
        tags: ['Lire le web'], operationId: 'lireSite', summary: 'Lire un site',
        description: 'Le titre, la description, le prix (pour une fiche de boutique) et l’image d’une adresse, comme quand on la colle dans le back office. '
          + '`image` : `true` (l’image de partage ou le favicon), `false`, `"partage"`, `"logo"` ou `"vignette"`.',
        requestBody: corpsUrl('https://exemple.fr', { image: { description: 'L’image voulue.', oneOf: [{ type: 'boolean' }, { type: 'string', enum: ['partage', 'logo', 'vignette'] }] } }),
        responses: {
          200: json('Ce que le site dit de lui.', objetDe({ apercu: objetDe({ titre: { type: 'string' }, description: { type: 'string' }, prix: { type: 'string' }, image: { type: ['string', 'null'], description: 'L’image, en data URL ; null sans image.' } }) }),
            { apercu: { titre: 'Example Domain', description: '', prix: '', image: null } }),
          422: erreur('Le site ne répond pas, ou pas en HTML.', 'site_illisible', 'Impossible de lire ce site.'),
          ...lectureWeb,
        },
      },
    },
    '/flux': {
      post: {
        tags: ['Lire le web'], operationId: 'lireFlux', summary: 'Lire un blog, un podcast ou une chaîne',
        description: 'Les trois derniers articles d’un blog ou d’un podcast (RSS, Atom, ou la page qui annonce son flux), ou avec `video: true` la dernière vidéo longue d’une chaîne YouTube.',
        requestBody: corpsUrl('https://exemple.fr/blog', { video: oui('Une chaîne YouTube : sa dernière vidéo.') }),
        responses: {
          200: json('Les articles ; une liste vide si rien n’a pu être lu.', objetDe({ articles: { type: 'array', items: objetDe({ titre: { type: 'string' }, url: { type: 'string' }, date: { type: 'string' }, image: { type: 'string' }, video: { type: 'string' } }) } }),
            { articles: [{ titre: 'Mon dernier épisode', url: 'https://exemple.fr/blog/episode-12', date: '2026-10-27T08:00:00.000Z', image: '', video: '' }] }),
          ...lectureWeb,
        },
      },
    },
    '/avis': {
      post: {
        tags: ['Lire le web'], operationId: 'lireNoteAvis', summary: 'Lire la note d’une page d’avis',
        description: 'La note d’une page Trustpilot, ou de toute page qui la déclare (JSON-LD `aggregateRating`), ramenée sur 5. `null` si la page ne la dit pas.',
        requestBody: corpsUrl('https://fr.trustpilot.com/review/exemple.fr'),
        responses: {
          200: json('La note.', objetDe({ note: { anyOf: [objetDe({ note: { type: 'number' }, nombre: { type: 'integer' }, source: { type: 'string' } }), { type: 'null' }] } }),
            { note: { note: 4.6, nombre: 1820, source: 'Trustpilot' } }),
          ...lectureWeb,
        },
      },
    },
    '/compte': {
      get: {
        tags: ['Compte'], operationId: 'lireCompte', summary: 'Lire le compte',
        description: 'L’offre de la page, l’essai, l’abonnement, une offre offerte, et pour chaque fonction réservée : si elle est incluse, et l’offre qui la donne.',
        responses: {
          200: json('Le compte.', objetDe({ compte: ref('Compte') }), {
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
        tags: ['Compte'], operationId: 'listerCles', summary: 'Lister les clés',
        description: 'Les clés du compte, jamais elles-mêmes : leur nom, leur début, ce qu’elles peuvent et quand elles ont servi. `courante` marque celle de l’appel.',
        responses: {
          200: json('Les clés.', objetDe({ cles: { type: 'array', items: objetDe({ id: { type: 'string' }, nom: { type: 'string' }, debut: { type: 'string' }, ecriture: { type: 'boolean' }, cree: { type: 'string' }, utilisee: { type: ['string', 'null'] }, courante: { type: 'boolean' } }) } }),
            { cles: [{ id: '2916f190dae2', nom: 'Mon script', debut: 'hopla_hT-a', ecriture: true, cree: '2026-10-28T10:00:00.000Z', utilisee: '2026-10-28T21:40:00.000Z', courante: true }] }),
          ...ERREURS,
        },
      },
    },
    '/export': {
      get: {
        tags: ['Compte'], operationId: 'exporterCompte', summary: 'Exporter ses données',
        description: 'Tout ce que Hopla garde du compte, en un fichier JSON (le droit d’accès du RGPD), sans les images.',
        responses: { 200: json('Le fichier, servi en pièce jointe.', { type: 'object', additionalProperties: true }), ...ERREURS },
      },
    },
    '/reseaux': {
      get: {
        tags: ['Référence'], operationId: 'listerReseaux', summary: 'Lister les réseaux',
        responses: { 200: json('Les réseaux, avec leur nom.', objetDe({ reseaux: { type: 'array', items: objetDe({ id: { type: 'string', enum: [...RESEAUX] }, nom: { type: 'string' } }) } }), { reseaux: [{ id: 'instagram', nom: 'Instagram' }] }), ...ERREURS },
      },
    },
    '/pictos': {
      get: {
        tags: ['Référence'], operationId: 'listerPictos', summary: 'Lister les pictos',
        description: 'Les noms à poser dans `icone` d’un bloc.',
        responses: { 200: json('Les pictos.', objetDe({ pictos: { type: 'array', items: objetDe({ nom: { type: 'string' }, libelle: { type: 'string' } }) } }), { pictos: [{ nom: 'micro', libelle: 'Micro' }] }), ...ERREURS },
      },
    },
    '/types': {
      get: {
        tags: ['Référence'], operationId: 'listerTypes', summary: 'Lister les types de bloc',
        description: 'Les types que ce compte peut poser.',
        responses: { 200: json('Les types.', objetDe({ types: { type: 'array', items: { type: 'string', enum: [...typesPublics] } } }), { types: typesPublics }), ...ERREURS },
      },
    },
    '/themes': {
      get: {
        tags: ['Référence'], operationId: 'listerThemes', summary: 'Lister les thèmes',
        responses: {
          200: {
            description: 'Les thèmes.',
            content: { 'application/json': { schema: { type: 'object', properties: { themes: { type: 'array', items: ref('Theme') } } }, example: { themes: THEMES.slice(0, 3).map(t => ({ id: t.id, nom: t.nom, humeur: t.humeur, famille: t.famille })) } } },
          },
          ...ERREURS,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      cle: { type: 'http', scheme: 'bearer', bearerFormat: 'hopla_…', description: 'Ta clé d’API, créée dans Réglages, « API et MCP », sur app.hopla.page.' },
    },
    schemas: {
      Erreur: {
        type: 'object', required: ['erreur'],
        properties: { erreur: { type: 'object', required: ['code', 'message'], properties: { code: texte('Un code stable, à tester dans ton code.'), message: texte('Une phrase en français, à montrer telle quelle.') } } },
      },
      Page: {
        type: 'object',
        properties: {
          page: { type: 'object', properties: { pseudo: texte('Le pseudo de la page.'), adresse: texte('L’adresse à partager.'), offre: { type: 'string', enum: ['gratuit', 'starter', 'pro', 'premium'] } } },
          reglages: ref('Reglages'),
          blocs: { type: 'array', items: ref('Bloc') },
        },
      },
      Reseau: {
        type: 'object', required: ['reseau', 'url'],
        properties: { reseau: { type: 'string', enum: [...RESEAUX] }, url: texte('L’adresse du profil, ou un numéro pour WhatsApp.') },
      },
      Reglages: {
        type: 'object', description: 'Les réglages de la page.',
        properties: {
          profil: {
            type: 'object',
            properties: {
              nom: texte('Le nom en haut de la page.'), bio: texte('La phrase sous le nom.'), avatar: texte('L’adresse https de la photo.'),
              badge: oui('Le badge vérifié, posé par Hopla.'), photo: { type: 'string', enum: [...FORMES_PHOTO], description: 'La photo en rond, ou en grand (Starter).' },
            },
          },
          reseaux: { type: 'array', items: ref('Reseau'), maxItems: MAX_RESEAUX },
          reseauxPosition: { type: 'string', enum: ['haut', 'bas'] },
          theme: { type: 'string', enum: THEMES.map(t => t.id) },
          couleurs: { type: 'object', description: 'En #rrggbb ; vide, celle du thème (Starter).', properties: { fond: { type: 'string' }, boutons: { type: 'string' }, accent: { type: 'string' } } },
          bouton: {
            type: 'object',
            properties: { style: { type: 'string', enum: [...STYLES_BOUTON] }, forme: { type: 'string', enum: [...FORMES_BOUTON] }, ombre: { type: 'string', enum: [...OMBRES_BOUTON] } },
          },
          seo: { type: 'object', properties: { titre: { type: 'string' }, description: { type: 'string' }, indexable: { type: 'boolean' } } },
          partage: oui('Le bouton Partager en haut de la page.'),
          vouvoiement: oui('Les mots de la page vouvoient le visiteur.'),
          animation: { type: 'string', enum: [...ANIMATIONS], description: 'Le mouvement des blocs mis en avant.' },
          redirection: { type: 'object', description: 'Toute la page envoyée vers une adresse jusqu’à `fin` ; `url` vide pour arrêter (Starter).', properties: { url: { type: 'string' }, fin: { type: 'string' } } },
        },
        additionalProperties: true,
        example: REGLAGES_EXEMPLE,
      },
      ReglagesPartiels: {
        description: 'Les seuls réglages à changer. Les autres sont gardés.',
        allOf: [ref('Reglages')],
      },
      Bloc: {
        type: 'object', description: 'Un bloc de la page.',
        properties: {
          id: texte('Son id, donné par Hopla.', { readOnly: true }),
          type: { type: 'string', enum: [...typesPublics], description: 'Il ne change plus une fois le bloc posé.' },
          ...blocChamps,
        },
        additionalProperties: true,
        example: BLOC_EXEMPLE,
      },
      NouveauBloc: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: [...typesPublics], default: 'lien' },
          ...blocChamps,
          position: { type: 'integer', minimum: 0, description: 'Sa place, 0 en haut (par défaut).' },
        },
      },
      BlocPartiel: { type: 'object', description: 'Les seuls champs à changer.', properties: blocChamps },
      Inscrit: objetDe({
        id: { type: 'string' }, email: { type: 'string', format: 'email' }, prenom: { type: 'string' }, inscrit: { type: 'string', format: 'date-time' },
        source: texte('D’où venait le visiteur : instagram, direct, qr…'), envoye: oui('Déjà parti vers la newsletter branchée.'),
      }),
      Compte: objetDe({
        pseudo: { type: 'string' }, adresse: texte('L’adresse à partager.'), cree: { type: 'string', format: 'date-time' },
        offre: { type: 'string', enum: ['gratuit', 'starter', 'pro', 'premium'], description: 'L’offre de la page : ce qu’elle peut, essai compris.' },
        essai: { anyOf: [objetDe({ jusqu: { type: 'string', format: 'date-time' } }), { type: 'null' }] },
        abonnement: { anyOf: [objetDe({ offre: { type: 'string' }, statut: { type: 'string' }, periode: { type: 'string' }, finPeriode: { type: 'string', format: 'date-time' } }), { type: 'null' }] },
        offreOfferte: { anyOf: [objetDe({ offre: { type: 'string' }, jusqu: { type: ['string', 'null'] } }), { type: 'null' }] },
        fonctions: { type: 'object', description: 'Chaque fonction réservée.', properties: Object.fromEntries(Object.keys(FONCTIONS).map(f => [f, objetDe({ incluse: { type: 'boolean' }, offre: { type: 'string' } })])) },
        historiqueStats: entier('Les jours de stats que l’offre laisse lire.', 365),
      }),
      Question: { type: 'object', properties: { question: { type: 'string' }, reponse: { type: 'string' } } },
      Preuve: {
        type: 'object',
        properties: {
          genre: { type: 'string', enum: [...GENRES_PREUVE] }, note: { type: 'number', description: 'Sur 5.', example: 4.8 },
          nombre: { type: 'number', description: 'Le nombre d’avis, ou le chiffre affiché.', example: 120 }, source: { type: 'string', example: 'Google' },
        },
      },
      Partenariat: { type: 'object', properties: { mention: { type: 'string', enum: [...MENTIONS_PARTENAIRE] }, code: texte('Le code promo, vide s’il n’y en a pas.') } },
      Theme: { type: 'object', properties: { id: { type: 'string' }, nom: { type: 'string' }, humeur: { type: 'string' }, famille: { type: 'string' } } },
      Stats: {
        type: 'object',
        properties: {
          jours: { type: 'integer' }, vues: { type: 'integer' }, visiteurs: { type: 'integer' }, clics: { type: 'integer' },
          serie: { type: 'array', items: { type: 'object', properties: { jour: { type: 'string', format: 'date' }, vues: { type: 'integer' }, visiteurs: { type: 'integer' }, clics: { type: 'integer' } } } },
          blocs: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, titre: { type: 'string' }, clics: { type: 'integer' }, avant: { type: 'integer' } } } },
          sources: { type: 'array', items: { type: 'object', properties: { nom: { type: 'string' }, vues: { type: 'integer' }, avant: { type: 'integer' } } } },
          appareils: { type: 'array', items: { type: 'object', properties: { nom: { type: 'string' }, vues: { type: 'integer' } } } },
          pays: { type: 'array', items: { type: 'object', properties: { code: { type: 'string', example: 'FR' }, vues: { type: 'integer' }, avant: { type: 'integer' } } } },
          precedent: { type: 'object', description: 'Les mêmes totaux sur la période d’avant.', properties: { vues: { type: 'integer' }, visiteurs: { type: 'integer' }, clics: { type: 'integer' } } },
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
console.log('public/openapi.json et lib/genere.json écrits');
