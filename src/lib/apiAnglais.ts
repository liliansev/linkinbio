/*
 * L'API en anglais (29 octobre 2026, demandé par Lilian : « tout en anglais, anciens noms acceptés »). Les gestes
 * (`server/api.ts`) et la base gardent leurs noms français ; l'API v2 et les outils MCP en anglais passent par ce
 * dictionnaire à l'entrée (`versFrancais`) et à la sortie (`versAnglais`). L'API v1 et les anciens noms des outils MCP
 * gardent les noms français, tels quels, pour les intégrations déjà branchées.
 *
 * Un nom se traduit selon son parent quand il change de sens (`debut` d'une clé d'API est son préfixe, pas une date) ;
 * une valeur ne se traduit que sous les clés qui portent une liste fermée (type, format, offre…), jamais un texte libre.
 * La documentation (documentation/, `lib/docApi.ts`) et le guide de passage de la v1 à la v2 s'écrivent avec ces noms.
 */

type Dico = Record<string, string>;

/** Les noms de champs, du français à l'anglais : ceux qu'on envoie et ceux qu'on lit. */
export const CHAMPS: Dico = {
  // Page, réglages, compte
  reglages: 'settings', blocs: 'blocks', bloc: 'block', compte: 'account', pseudo: 'username', offre: 'plan',
  profil: 'profile', nom: 'name', reseaux: 'socialLinks', reseau: 'network', reseauxPosition: 'socialLinksPosition',
  couleurs: 'colors', fond: 'background', boutons: 'buttons', bouton: 'button', forme: 'shape', ombre: 'shadow',
  titre: 'title', partage: 'shareButton', ouvrirApps: 'openInApps', resumeHebdo: 'weeklySummary', vouvoiement: 'formal',
  vuesReseaux: 'networkViews', bureau: 'desktopLayout', redirection: 'redirect', police: 'font', imageFond: 'backgroundImage',
  domaine: 'domain',
  // Blocs
  sousTitre: 'subtitle', 'icone': 'icon', public: 'visible', vedette: 'featured', teinte: 'tint', debut: 'startsAt', fin: 'endsAt',
  compteARebours: 'countdown', creneau: 'schedule', jours: 'days', de: 'from', a: 'to', fuseau: 'timezone', effet: 'effect',
  cache: 'hiddenFor', demanderPrenom: 'askFirstName', acces: 'access', places: 'seats', restantes: 'remaining',
  preuve: 'proof', genre: 'kind', note: 'rating', nombre: 'count', prix: 'price', montants: 'amounts',
  partenariat: 'partnership', mention: 'disclosure', reponse: 'answer', coordonnees: 'contact', telephone: 'phone',
  societe: 'company', poste: 'jobTitle', adressePostale: 'address', sensible: 'sensitive', disposition: 'layout', pays: 'countries',
  cadeau: 'gift', masquer: 'hidden',
  // Compte et abonnement
  adresse: 'url', cree: 'createdAt', essai: 'trial', jusqu: 'until', abonnement: 'subscription', statut: 'status', periode: 'period',
  finPeriode: 'periodEnd', offreOfferte: 'complimentaryPlan', fonctions: 'features', incluse: 'included',
  historiqueStats: 'analyticsRetentionDays',
  // Stats
  stats: 'analytics', semaine: 'week', avant: 'previous', dejaVue: 'everViewed', resume: 'summary', phrase: 'sentence', faits: 'highlights',
  texte: 'text', ton: 'trend', plage: 'customRange', vues: 'views', visiteurs: 'visitors', clics: 'clicks', serie: 'daily', jour: 'date',
  appareils: 'devices', integres: 'inAppBrowser', versApp: 'openedInApp', ouverts: 'opened', precedent: 'previousPeriod',
  // Liste e-mail
  liste: 'list', inscrits: 'subscribers', enAttente: 'pending', branchee: 'connected', outil: 'tool', cle: 'key', prenom: 'firstName',
  inscrit: 'subscribedAt', envoye: 'synced', envoyes: 'synced', erreurs: 'failed', suivant: 'next', supprime: 'deleted',
  // Images, lecture du web, clés, listes
  chemin: 'path', apercu: 'preview', cles: 'apiKeys', ecriture: 'writeAccess', utilisee: 'lastUsedAt', courante: 'current',
  humeur: 'mood', famille: 'family', pictos: 'icons', libelle: 'label', erreur: 'error', limite: 'limit', depart: 'offset',
  // L'export du compte
  exporte: 'exportedAt', derniereConnexion: 'lastSignInAt', conditionsAcceptees: 'termsAccepted', le: 'at', creemClient: 'creemCustomerId',
  creemAbonnement: 'creemSubscriptionId', statistiques: 'events', appareil: 'device', synchro: 'syncStatus', clesApi: 'apiKeys',
  listeBranchee: 'connectedList', fournisseur: 'provider',
};

/** Les noms qui changent de sens selon leur parent : `parent` puis le nom. `''` : à la racine de la réponse. */
const SELON_PARENT: Record<string, Dico> = {
  cles: { debut: 'prefix' },
  clesApi: { debut: 'prefix' },
  liste: { semaine: 'thisWeek' },
  statistiques: { type: 'event', bloc: 'blockId', pays: 'country' },
  '': { reseaux: 'socialNetworks' },
};

/** Les droits de l'offre (`fonctions` du compte), par leur nom. */
export const FONCTIONS_EN: Dico = {
  sansMention: 'noBranding', blocs: 'unlimitedBlocks', vitrine: 'storefront', couleurs: 'customColors', programmation: 'scheduling',
  avis: 'reviews', stats: 'analytics', formulaire: 'contactForm', galerie: 'gallery', utm: 'utm', redirection: 'redirect',
  fond: 'backgroundImage', grandePhoto: 'largeProfilePhoto', grille: 'gridLayout', heure: 'timeSchedule', drops: 'drops',
  listeEmail: 'emailList', pays: 'countryTargeting', cadeau: 'leadMagnet', flux: 'feed', api: 'api',
};

/** Les types de blocs. */
export const TYPES_EN: Dico = {
  lien: 'link', titre: 'heading', texte: 'text', video: 'video', 'derniere-video': 'latest-video', newsletter: 'newsletter',
  inscription: 'email-signup', preuve: 'proof', produit: 'product', soutien: 'tip', reservation: 'booking', musique: 'music',
  faq: 'faq', coordonnees: 'contact-card', lieu: 'location', galerie: 'gallery', formulaire: 'contact-form', flux: 'feed',
};

/** Les valeurs des listes fermées, par le nom (français) de leur champ, ou `parent.champ` quand il compte. */
export const VALEURS: Record<string, Dico> = {
  type: TYPES_EN,
  types: TYPES_EN,
  format: { bouton: 'button', bandeau: 'banner', carte: 'card' },
  animation: { aucune: 'none', reflet: 'shine', orbite: 'orbit', lueur: 'glow', onde: 'wave', respiration: 'breathe', rebond: 'bounce', secousse: 'shake' },
  photo: { ronde: 'round', grande: 'large' },
  reseauxPosition: { haut: 'top', bas: 'bottom' },
  style: { plein: 'solid', contour: 'outline', doux: 'soft', relief: 'raised', verre: 'glass' },
  forme: { pilule: 'pill', arrondi: 'rounded', carre: 'square' },
  ombre: { aucune: 'none', subtile: 'subtle', marquee: 'strong' },
  genre: { note: 'rating', compteur: 'counter', temoignage: 'testimonial' },
  mention: { publicite: 'advertising', collaboration: 'collaboration' },
  disposition: { liste: 'list', grille: 'grid' },
  effet: { avant: 'highlight', afficher: 'show', seulement: 'only', sauf: 'except' },
  bureau: { colonne: 'column', profil: 'profile', onepage: 'one-page' },
  police: { geometrique: 'geometric', technique: 'technical', condensee: 'condensed', elegante: 'elegant', editoriale: 'editorial' },
  offre: { gratuit: 'free' },
  periode: { mois: 'month', an: 'year' },
  ton: { hausse: 'up', baisse: 'down', neutre: 'neutral' },
  famille: { sombre: 'dark', clair: 'light', couleur: 'color', degrade: 'gradient', premium: 'premium', decale: 'quirky' },
  humeur: {
    Audacieux: 'Bold', Brut: 'Raw', Chaleureux: 'Warm', Cosmique: 'Cosmic', Doux: 'Soft', Frais: 'Fresh', Graphique: 'Graphic',
    Géométrique: 'Geometric', Imprimé: 'Print', Joueur: 'Playful', Lumineux: 'Bright', Luxe: 'Luxury', Minimal: 'Minimal',
    Nature: 'Nature', Net: 'Crisp', Néon: 'Neon', Pop: 'Pop', Psyché: 'Psychedelic', Rétro: 'Retro', Sobre: 'Understated',
    Solaire: 'Sunny', Terre: 'Earthy', Éditorial: 'Editorial',
  },
  image: { partage: 'share', vignette: 'thumbnail' },
  'statistiques.type': { vue: 'view', clic: 'click' },
  synchro: { erreur: 'error' },
};

/** Les codes d'erreur. */
export const CODES_EN: Dico = {
  cle_absente: 'missing_api_key', cle_invalide: 'invalid_api_key', trop_d_essais: 'too_many_invalid_keys', compte_suspendu: 'account_suspended',
  conditions: 'terms_not_accepted', offre: 'plan_required', trop_d_appels: 'rate_limited', lecture_seule: 'read_only_key',
  rien_a_changer: 'empty_update', theme_inconnu: 'unknown_theme', bloc_introuvable: 'block_not_found', type_reserve: 'block_type_unavailable',
  bloc_refuse: 'block_rejected', adresse_invalide: 'invalid_url', type_inconnu: 'unknown_block_type', ordre_incomplet: 'invalid_order',
  periode: 'invalid_period', image_absente: 'missing_image', image_trop_grosse: 'image_too_large', format_image: 'unsupported_image_format',
  plus_de_place: 'storage_quota_exceeded', inscrit_introuvable: 'subscriber_not_found', rien_de_branche: 'no_integration',
  adresse: 'invalid_url', trop_de_lectures: 'rate_limited', site_illisible: 'fetch_failed', serveur: 'internal_error', trop_gros: 'payload_too_large',
  json: 'invalid_json', methode: 'method_not_allowed', introuvable: 'not_found',
};

/** Les adresses de la v2, et celles de la v1 qu'elles servent. */
export const ROUTES_EN: Dico = {
  '/page': '/page', '/account': '/compte', '/settings': '/reglages', '/qr-code': '/qr', '/blocks': '/blocs', '/blocks/:id': '/blocs/:id',
  '/blocks/:id/duplicate': '/blocs/:id/dupliquer', '/blocks/order': '/ordre', '/media': '/medias', '/analytics': '/stats',
  '/analytics/week': '/stats/semaine', '/analytics/summary': '/stats/resume', '/email-list': '/liste', '/subscribers': '/inscrits',
  '/subscribers/:id': '/inscrits/:id', '/subscribers/sync': '/inscrits/envoyer', '/fetch/preview': '/apercu', '/fetch/feed': '/flux',
  '/fetch/rating': '/avis', '/api-keys': '/cles', '/export': '/export', '/themes': '/themes', '/social-networks': '/reseaux', '/icons': '/pictos',
  '/block-types': '/types',
};

/** Les paramètres d'adresse de la v2, et ceux de la v1. */
export const PARAMETRES_EN: Dico = { period: 'periode', from: 'du', to: 'au', size: 'taille', limit: 'limite', offset: 'depart', format: 'format' };

const inverse = (d: Dico): Dico => Object.fromEntries(Object.entries(d).map(([fr, en]) => [en, fr]));
// `adresse` (l'adresse de la page) ne s'envoie jamais : `url` reste `url` à l'entrée.
const { url: _url, ...CHAMPS_FR } = inverse(CHAMPS);
const VALEURS_FR = Object.fromEntries(Object.entries(VALEURS).map(([cle, d]) => [cle, inverse(d)]));
export const TYPES_FR = inverse(TYPES_EN);

const estObjet = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function valeur(dico: Dico | undefined, v: unknown): unknown {
  if (!dico) return v;
  if (Array.isArray(v)) return v.map(x => (typeof x === 'string' ? dico[x] ?? x : x));
  return typeof v === 'string' ? dico[v] ?? v : v;
}

/** Une réponse des gestes, du français à l'anglais. */
export function versAnglais(v: unknown, parent = ''): unknown {
  if (Array.isArray(v)) return v.map(x => versAnglais(x, parent));
  if (!estObjet(v)) return v;
  const sortie: Record<string, unknown> = {};
  for (const [cle, x] of Object.entries(v)) {
    const nom = SELON_PARENT[parent]?.[cle] ?? CHAMPS[cle] ?? cle;
    if (cle === 'fonctions' && estObjet(x)) {
      sortie[nom] = Object.fromEntries(Object.entries(x).map(([f, d]) => [FONCTIONS_EN[f] ?? f, versAnglais(d, f)]));
    } else {
      sortie[nom] = versAnglais(valeur(VALEURS[`${parent}.${cle}`] ?? VALEURS[cle], x), cle);
    }
  }
  return sortie;
}

/** Ce qu'envoie un appel en anglais, vers les noms des gestes. Un nom français passe tel quel : les anciens noms restent acceptés. */
export function versFrancais(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(versFrancais);
  if (!estObjet(v)) return v;
  const sortie: Record<string, unknown> = {};
  for (const [cle, x] of Object.entries(v)) {
    const nom = CHAMPS_FR[cle] ?? cle;
    sortie[nom] = versFrancais(valeur(VALEURS_FR[nom], x));
  }
  return sortie;
}

/** Un schéma JSON (les entrées d'un outil MCP) écrit avec les noms français, mis en anglais : propriétés, `required` et `enum`. */
export function schemaEnAnglais(schema: unknown, nom = ''): unknown {
  if (Array.isArray(schema)) return schema.map(s => schemaEnAnglais(s, nom));
  if (!estObjet(schema)) return schema;
  const sortie: Record<string, unknown> = {};
  for (const [cle, x] of Object.entries(schema)) {
    if (cle === 'properties' && estObjet(x)) sortie[cle] = Object.fromEntries(Object.entries(x).map(([p, s]) => [CHAMPS[p] ?? p, schemaEnAnglais(s, p)]));
    else if (cle === 'required' && Array.isArray(x)) sortie[cle] = x.map(p => CHAMPS[p] ?? p);
    else if (cle === 'enum' && Array.isArray(x)) sortie[cle] = valeur(VALEURS[nom], x);
    else if (cle === 'items') sortie[cle] = schemaEnAnglais(x, nom);
    else sortie[cle] = schemaEnAnglais(x, nom);
  }
  return sortie;
}

/** Les outils MCP, de leur ancien nom français à leur nom anglais (`server/mcp.ts` les nomme ainsi, un test le vérifie). */
export const OUTILS_EN: Dico = {
  lire_page: 'get_page', lire_compte: 'get_account', lire_stats: 'get_analytics', lire_semaine: 'get_weekly_views',
  lire_resume: 'get_analytics_summary', lire_liste: 'get_email_list', lister_inscrits: 'list_subscribers', lire_qr_code: 'get_qr_code',
  lire_site: 'fetch_url_preview', lire_flux: 'fetch_feed', lire_note_avis: 'fetch_review_rating', lister_themes: 'list_themes',
  lister_reseaux: 'list_social_networks', lister_pictos: 'list_icons', lister_types: 'list_block_types', lister_cles: 'list_api_keys',
  modifier_reglages: 'update_settings', ajouter_bloc: 'create_block', modifier_bloc: 'update_block', dupliquer_bloc: 'duplicate_block',
  supprimer_bloc: 'delete_block', ordonner_blocs: 'reorder_blocks', envoyer_image: 'upload_image', supprimer_inscrit: 'delete_subscriber',
  envoyer_inscrits: 'sync_subscribers',
};
