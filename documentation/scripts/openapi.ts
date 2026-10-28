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
    version: '1.0.0',
    summary: 'Lire et modifier sa page Hopla depuis son code.',
    description: 'Ta page Hopla se gère aussi depuis ton code : profil, thème, réseaux, blocs, ordre des blocs et statistiques. '
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
    { name: 'Thèmes', description: 'Les thèmes que la page peut prendre.' },
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
        parameters: [
          { name: 'periode', in: 'query', description: 'Les derniers jours.', schema: { type: 'integer', enum: [7, 14, 30, 90, 365], default: 30 } },
          { name: 'du', in: 'query', description: 'Premier jour, AAAA-MM-JJ, avec `au`.', schema: { type: 'string', format: 'date', example: '2026-10-01' } },
          { name: 'au', in: 'query', description: 'Dernier jour, AAAA-MM-JJ.', schema: { type: 'string', format: 'date', example: '2026-10-15' } },
        ],
        responses: {
          200: { description: 'Les statistiques.', content: { 'application/json': { schema: { type: 'object', properties: { stats: ref('Stats') } } } } },
          400: erreur('Période refusée, ou plus ancienne que ton historique.', 'periode', 'Période refusée : 7, 14, 30, 90 ou 365 jours, ou des dates du et au (AAAA-MM-JJ).'),
          ...ERREURS,
        },
      },
    },
    '/themes': {
      get: {
        tags: ['Thèmes'], operationId: 'listerThemes', summary: 'Lister les thèmes',
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
  reseaux: RESEAUX,
  types: typesPublics,
}, null, 2)}\n`);
console.log('public/openapi.json et lib/genere.json écrits');
