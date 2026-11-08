/*
 * Le catalogue des blocs (24 octobre 2026) : ce qu'on ajoute à sa page, tel que le choix des blocs, la feuille et la
 * rangée d'un bloc, Intégrations et les stats le nomment. Le choix des blocs n'en montre d'abord qu'une partie, une
 * entrée par chose qu'on écrit ou que Hopla tient (demandé par Lilian : « vraiment réfléchir à quoi sert chaque
 * lien ») ; le reste vient d'une adresse collée, qui prend le bloc qu'elle appelle (`lib/detection.ts`), ou se cherche
 * dans le même champ, « Colle une adresse ou cherche un bloc », par son nom, ses mots courants et ce qu'on veut en
 * faire (« rdv », « prendre rendez-vous », « vendre », « don »…). Un numéro devient un lien d'appel, un pseudo
 * (« @lilian ») rejoint les réseaux.
 */
import type { Bloc, Langue, TypeBloc } from './types.ts';
import { TYPES_PRINCIPAL } from './types.ts';
import type { Fonction } from './abonnement.ts';
import { adresseSaisie, numeroAppel, pourquoiPasAdresse } from './valider.ts';
import { lienAffilie, suggestion, typeDeAdresse } from './detection.ts';
import type { TypeAdresse } from './detection.ts';

/**
 * Ce qu'on ajoute à sa page. `aide` : la ligne qu'un bloc neuf dit en tête de sa feuille, seulement quand elle apprend
 * quelque chose (23 octobre 2026) ; un titre, un texte se passent d'elle. `modele` : ce qu'un bloc neuf a déjà (un lien
 * partenaire est un lien, avec sa mention) ; `fonction` : l'offre qu'il demande. `ailleurs` : hors de la liste de départ,
 * il vient d'une adresse ou se cherche ; il garde ici son nom et son picto, que sa feuille, sa rangée et Intégrations
 * montrent. `retire` : il ne s'ajoute plus du tout, ses blocs déjà posés restent tels quels. `mots` : ce qu'on tape pour
 * le trouver, en plus de son nom, sans accents ni majuscules : ses autres noms, les sites qui le font, et ce qu'on veut en
 * faire (« vendre », « prendre », « payer »).
 */
export interface TypeAjout { type: TypeBloc; nom: string; aide?: string; picto: string; fonction?: Fonction; modele?: Partial<Bloc>; ailleurs?: true; retire?: true; mots?: string }

export const TYPES: TypeAjout[] = [
  { type: 'lien', nom: 'Lien', picto: 'bloc-lien',
    mots: 'site adresse url bouton page web reseau instagram tiktok facebook linkedin twitter threads twitch pinterest snapchat whatsapp telegram discord blog portfolio' },
  { type: 'lien', nom: 'Lien partenaire', aide: 'Affiliation ou collaboration payée : la mention « Publicité », et ton code promo', picto: 'bloc-partenaire', modele: { partenariat: { mention: 'publicite', code: '' } }, ailleurs: true,
    mots: 'affiliation affilie affiliate publicite pub sponsor sponsorise collaboration commerciale partenariat code promo reduction remise amazon awin' },
  { type: 'video', nom: 'Vidéo', aide: 'Une vidéo YouTube, Vimeo ou TikTok, qui se lit dans ta page', picto: 'bloc-video', ailleurs: true, mots: 'youtube vimeo tiktok film clip extrait tuto regarder' },
  { type: 'musique', nom: 'Musique ou podcast', aide: 'Un titre, un album ou un podcast Spotify, Apple Music, Deezer ou SoundCloud, qui s’écoute dans ta page', picto: 'bloc-musique', ailleurs: true,
    mots: 'lecteur ecouter son audio chanson titre morceau album playlist ep single episode spotify deezer soundcloud apple music podcasts' },
  // La vitrine : Hopla n'encaisse rien, chaque bloc mène au site qui vend, réserve ou reçoit.
  { type: 'produit', nom: 'Produit', aide: 'Sa photo et son prix, lus sur ta boutique', picto: 'bloc-produit', fonction: 'vitrine', ailleurs: true,
    mots: 'boutique shop vente vendre article achat acheter commander commande payer paiement prix etsy gumroad shopify payhip stan stripe ebook formation atelier vitrine' },
  { type: 'reservation', nom: 'Prise de rendez-vous', aide: 'Ton agenda Calendly, Cal.com, Doctolib ou Planity', picto: 'bloc-reservation', fonction: 'vitrine', ailleurs: true,
    mots: 'rdv agenda calendrier reservation reserver prendre booker creneau disponibilite appel visio reunion consultation seance cours calendly cal.com doctolib planity acuity tidycal hubspot google vitrine' },
  { type: 'soutien', nom: 'Me soutenir', aide: 'Un bouton vers PayPal, Ko-fi, Tipeee ou Lydia', picto: 'bloc-soutien', fonction: 'vitrine', ailleurs: true,
    mots: 'soutien soutenir aider contribuer participer don donation donner payer pourboire tip cagnotte paypal ko-fi kofi tipeee lydia patreon buy coffee cafe vitrine' },
  { type: 'titre', nom: 'Titre de section', picto: 'bloc-titre', mots: 'intertitre separateur rubrique categorie partie' },
  { type: 'texte', nom: 'Texte', picto: 'bloc-texte', mots: 'paragraphe description phrase message presentation' },
  // Les blocs venus de Linktree (24 octobre 2026) : chacun montre une chose que la page ne savait pas montrer.
  { type: 'galerie', nom: 'Galerie', aide: 'Tes photos, qui défilent d’un geste', picto: 'bloc-galerie', mots: 'photo photos image images album portfolio carrousel diaporama realisations' },
  { type: 'faq', nom: 'Questions fréquentes', aide: 'Les questions qu’on te pose, et tes réponses', picto: 'bloc-faq', mots: 'faq question reponse aide infos accordeon' },
  { type: 'preuve', nom: 'Avis et preuves', aide: 'Ta note Google, un chiffre clé ou un témoignage, avec sa source', picto: 'bloc-preuve', fonction: 'avis',
    mots: 'note etoile google trustpilot malt temoignage recommandation chiffre clients' },
  { type: 'inscription', nom: 'Liste e-mail', aide: 'Tes visiteurs laissent leur e-mail, que tu exportes ou envoies vers ta newsletter', picto: 'bloc-inscription', fonction: 'listeEmail',
    mots: 'email mail newsletter lettre inscription inscrit abonne collecter brevo mailchimp kit mailerlite beehiiv substack systeme.io systeme' },
  // Pour qu'on te joigne : un message, ton contact, ton adresse.
  { type: 'formulaire', nom: 'Me contacter', aide: 'Un formulaire : le message arrive dans ta boîte, ton adresse reste cachée', picto: 'bloc-formulaire', fonction: 'formulaire',
    mots: 'formulaire contact message ecrire email devis demande' },
  { type: 'coordonnees', nom: 'Carte de visite', aide: 'Tes visiteurs enregistrent ton contact dans leur téléphone, d’un toucher', picto: 'bloc-coordonnees',
    mots: 'vcard contact coordonnees telephone numero carnet enregistrer societe entreprise poste' },
  { type: 'lieu', nom: 'Adresse', aide: 'Ton adresse, la carte et l’itinéraire', picto: 'bloc-lieu', mots: 'lieu carte plan maps google itineraire boutique magasin cabinet salon local venir' },
  // La dernière vidéo d'une chaîne et les derniers articles d'un blog (24 octobre 2026) viennent d'une adresse collée, ou se
  // cherchent ; la chaîne de Lilian garde sa place dans son choix de départ.
  { type: 'derniere-video', nom: 'Ma dernière vidéo YouTube', aide: 'Ta vidéo la plus récente, toujours à jour, sans rien changer', picto: 'bloc-derniere-video', ailleurs: true,
    mots: 'youtube chaine video videos automatique nouvelle derniere recente' },
  { type: 'flux', nom: 'Mes derniers articles', aide: 'Les trois derniers articles de ton blog ou de ton podcast, lus dans son flux RSS', picto: 'bloc-flux', fonction: 'flux', ailleurs: true,
    mots: 'rss flux atom blog articles podcast episodes actualites news substack medium wordpress ghost' },
  // L'ancienne newsletter de Lilian est la liste e-mail : ses blocs posés restent, elle ne s'ajoute plus.
  { type: 'newsletter', nom: 'Ma newsletter', picto: 'bloc-newsletter', ailleurs: true, retire: true },
];

/**
 * Le catalogue en anglais (8 novembre 2026, Hopla anglais d'abord) : le nom, l'aide et des mots anglais pour la
 * recherche, par nom français. Les mots français restent : une recherche en français trouve aussi.
 */
const EN: Record<string, { nom: string; aide?: string; mots?: string }> = {
  'Lien': { nom: 'Link', mots: 'link website button' },
  'Lien partenaire': { nom: 'Partner link', aide: 'Affiliate or paid collaboration: the “Ad” label, and your promo code', mots: 'affiliate ad advertising sponsored partnership discount coupon promo' },
  'Vidéo': { nom: 'Video', aide: 'A YouTube, Vimeo or TikTok video that plays on your page', mots: 'watch movie' },
  'Musique ou podcast': { nom: 'Music or podcast', aide: 'A Spotify, Apple Music, Deezer or SoundCloud track, album or podcast that plays on your page', mots: 'player listen song track sound' },
  'Produit': { nom: 'Product', aide: 'Its photo and price, read from your shop', mots: 'shop store sell buy order checkout price merch course' },
  'Prise de rendez-vous': { nom: 'Booking', aide: 'Your Calendly, Cal.com, Acuity or TidyCal calendar', mots: 'book booking appointment schedule calendar meeting call session consultation slot' },
  'Me soutenir': { nom: 'Support me', aide: 'A button to PayPal, Ko-fi, Patreon or Buy Me a Coffee', mots: 'support donate donation tip tips fund help' },
  'Titre de section': { nom: 'Section title', mots: 'heading header divider section category' },
  'Texte': { nom: 'Text', mots: 'paragraph description note about' },
  'Galerie': { nom: 'Gallery', aide: 'Your photos, swiped through in one gesture', mots: 'photos pictures images carousel slideshow work' },
  'Questions fréquentes': { nom: 'FAQ', aide: 'The questions people ask you, and your answers', mots: 'questions answers help accordion' },
  'Avis et preuves': { nom: 'Reviews and proof', aide: 'Your Google rating, a key number or a testimonial, with its source', mots: 'review reviews rating stars testimonial proof social' },
  'Liste e-mail': { nom: 'Email list', aide: 'Visitors leave their email, which you export or send to your newsletter', mots: 'email newsletter signup subscribe subscribers collect list' },
  'Me contacter': { nom: 'Contact me', aide: 'A form: the message lands in your inbox, your address stays hidden', mots: 'contact form message write quote request' },
  'Carte de visite': { nom: 'Contact card', aide: 'Visitors save your contact to their phone in one tap', mots: 'vcard business card phone number save company' },
  'Adresse': { nom: 'Address', aide: 'Your address, the map and directions', mots: 'location map directions place store office studio' },
  'Ma dernière vidéo YouTube': { nom: 'My latest YouTube video', aide: 'Your most recent video, always up to date, with nothing to change', mots: 'latest newest channel automatic' },
  'Mes derniers articles': { nom: 'My latest posts', aide: 'The last three posts of your blog or podcast, read from its RSS feed', mots: 'posts articles blog feed episodes news latest' },
  'Ma newsletter': { nom: 'My newsletter' },
  'Lien d’appel': { nom: 'Call link' },
  'Lien e-mail': { nom: 'Email link' },
};
/** Le titre qu'un bloc neuf reçoit déjà (« M'appeler »), en anglais. */
const MODELES_EN: Record<string, string> = { 'M’appeler': 'Call me', 'M’écrire': 'Email me' };

/** Une entrée du catalogue dans une langue ; la même entrée en français. */
export function enLangue(t: TypeAjout, langue: Langue = 'fr'): TypeAjout {
  const en = langue === 'en' ? EN[t.nom] : undefined;
  if (!en) return t;
  const titre = t.modele?.titre;
  return { ...t, nom: en.nom, ...(en.aide ? { aide: en.aide } : {}), mots: [t.mots, en.mots].filter(Boolean).join(' '),
    ...(titre && MODELES_EN[titre] ? { modele: { ...t.modele, titre: MODELES_EN[titre] } } : {}) };
}

/** L'entrée du catalogue qui décrit un bloc : un lien partenaire a la sienne. */
export const typeDe = (b: Pick<Bloc, 'type' | 'partenariat'>, langue: Langue = 'fr'): TypeAjout =>
  enLangue(TYPES.find(t => t.type === b.type && !!t.modele?.partenariat === !!b.partenariat) ?? TYPES.find(t => t.type === b.type)!, langue);

/**
 * Le choix des blocs, avant qu'on tape quoi que ce soit : une entrée par chose qu'on écrit ou que Hopla tient, et une
 * seule. Une vidéo, un agenda, une page de soutien ou une fiche de boutique viennent de leur adresse ; un lien partenaire
 * est un lien, avec sa mention. Tous se cherchent aussi par leur nom.
 */
export const CHOIX = TYPES.filter(t => !t.ailleurs && !t.retire);
export const choixPour = (principal: boolean, langue: Langue = 'fr') =>
  (principal ? [...CHOIX, TYPES.find(t => t.type === 'derniere-video')!] : CHOIX.filter(t => !TYPES_PRINCIPAL.includes(t.type))).map(t => enLangue(t, langue));

/** Une saisie comparable : sans accents ni majuscules, les apostrophes et guillemets en espaces. */
export const normaliser = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[’'«»"]/g, ' ').replace(/\s+/g, ' ').trim();

/** Le mot commence-t-il un mot de la cible ? « vous » est dans « rendez-vous », « mail » dans « e-mail ». */
function debutDeMot(cible: string, mot: string): boolean {
  for (let i = cible.indexOf(mot); i >= 0; i = cible.indexOf(mot, i + 1)) if (i === 0 || /[\s.\-/(]/.test(cible[i - 1])) return true;
  return false;
}
/** Au singulier comme au pluriel : « dons » trouve « don », « vidéos » trouve « vidéo ». */
const trouve = (cible: string, mot: string) => debutDeMot(cible, mot) || (mot.length > 3 && /[sx]$/.test(mot) && debutDeMot(cible, mot.slice(0, -1)));

/** Les petits mots d'une phrase (« je veux mettre mon agenda »), qui ne cherchent rien : seuls, ils cherchent quand même. */
const MOTS_VIDES = new Set(['a', 'au', 'aux', 'avec', 'ce', 'ces', 'cette', 'd', 'de', 'des', 'du', 'en', 'et', 'j', 'je', 'l', 'la', 'le', 'les', 'm', 'ma', 'me',
  'mes', 'moi', 'mon', 'ou', 'par', 'pour', 'qu', 'que', 'sa', 'se', 'ses', 'son', 'sur', 't', 'ta', 'te', 'tes', 'ton', 'un', 'une', 'vos', 'votre', 'y',
  'ajouter', 'ajoute', 'mettre', 'faire', 'veux', 'voudrais', 'bloc', 'blocs', 'nouveau', 'nouvelle',
  // et les mêmes en anglais
  'an', 'the', 'my', 'your', 'to', 'of', 'for', 'with', 'and', 'or', 'i', 'want', 'add', 'put', 'new', 'block', 'blocks', 'some']);

/**
 * Les blocs qu'une recherche trouve, du plus évident au plus lointain (24 octobre 2026) : on arrive avec ce qu'on veut
 * faire (« prendre rendez-vous », « vendre mes ebooks »), pas avec le nom d'un bloc. Chaque mot qui compte, au début
 * d'un mot du nom, vaut plus que dans ses mots courants ; un seul suffit, et le nom qui commence par ce qu'on tape passe
 * devant. Une lettre seule ne cherche que les noms. Un bloc retiré ne se trouve pas ; ceux du compte principal,
 * seulement chez lui.
 */
export function chercherBlocs(texte: string, principal: boolean, langue: Langue = 'fr'): TypeAjout[] {
  const q = normaliser(texte);
  if (!q) return [];
  const tous = q.split(' ');
  const utiles = tous.filter(m => !MOTS_VIDES.has(m));
  const mots = utiles.length ? utiles : tous;
  return TYPES
    .map(t => enLangue(t, langue))
    .map((t, i) => {
      const nom = normaliser(t.nom), tout = `${nom} ${t.mots ?? ''}`;
      let score = nom.startsWith(q) ? 10 : 0;
      for (const m of mots) score += trouve(nom, m) ? 3 : q.length > 1 && trouve(tout, m) ? 1 : 0;
      return { t, i, score };
    })
    .filter(x => x.score > 0 && !x.t.retire && (principal || !TYPES_PRINCIPAL.includes(x.t.type)))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map(x => x.t);
}

/**
 * Une ligne du choix des blocs : son entrée, et l'adresse tapée quand elle en vient. `auto` : la ligne que l'adresse
 * appelle, posée telle quelle (le bloc neuf suit son adresse, comme une adresse collée). `detail` : ce que la ligne montre
 * en gris, le site d'une adresse, le numéro, l'adresse e-mail. `pseudo` : un pseudo tapé, que la ligne ajoute aux
 * réseaux plutôt qu'à la page.
 */
export interface LigneAjout { entree: TypeAjout; url?: string; auto?: true; detail?: string; pseudo?: string }
/**
 * Ce que montre le choix des blocs selon ce qu'on tape : rien (la liste de départ), une adresse (le bloc qu'elle
 * appelle, puis ce qu'elle peut être d'autre), un numéro (un lien d'appel), un pseudo (les réseaux), une adresse ou un
 * numéro en train de se taper (rien encore, une ligne d'aide), ou des mots (la recherche).
 */
export type ModeAjout = 'vide' | 'adresse' | 'numero' | 'pseudo' | 'saisie' | 'mots';
/** Ce qui se pose d'un coup quand on le colle : une adresse, un numéro. */
export const seColle = (mode: ModeAjout) => mode === 'adresse' || mode === 'numero';

export const LIEN = TYPES[0];
export const PARTENAIRE = TYPES[1];
/** Un numéro tapé devient un lien qui appelle, une adresse e-mail un lien qui écrit : chacun avec son texte. */
const APPEL: TypeAjout = { type: 'lien', nom: 'Lien d’appel', picto: 'telephone', modele: { titre: 'M’appeler' } };
const ECRIRE: TypeAjout = { type: 'lien', nom: 'Lien e-mail', picto: 'courrier', modele: { titre: 'M’écrire' } };
const entreeDe = (type: TypeAdresse, langue: Langue = 'fr') => enLangue(TYPES.find(t => t.type === type && !t.modele)!, langue);
const hote = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
/** Le début d'une adresse qu'on tape : « ht », « https:/ », « ww ». */
const debutAdresse = (t: string) => t.length > 1 && ['https://', 'http://', 'www.'].some(d => d.startsWith(t));
/** Des chiffres, avec ce qu'on met entre eux : un numéro de téléphone, entier ou pas. */
const chiffres = (t: string) => /^\+?[\d\s.()-]+$/.test(t) && /\d/.test(t);

/** Les lignes du choix des blocs pour ce qui est tapé. `vitrine` : la page a les blocs de la vitrine (Starter). */
export function choixAjout(texte: string, { principal, vitrine, langue = 'fr' }: { principal: boolean; vitrine: boolean; langue?: Langue }): { mode: ModeAjout; lignes: LigneAjout[] } {
  const t = texte.trim();
  if (!t) return { mode: 'vide', lignes: choixPour(principal, langue).map(entree => ({ entree })) };
  const LIEN_ = enLangue(LIEN, langue), PARTENAIRE_ = enLangue(PARTENAIRE, langue);
  const numero = numeroAppel(t);
  if (numero) return { mode: 'numero', lignes: [{ entree: enLangue(APPEL, langue), url: numero, detail: t }] };
  if (chiffres(t)) return { mode: 'saisie', lignes: [] };
  const pseudo = /^@([\w.-]{1,60})$/.exec(t)?.[1];
  if (pseudo) return { mode: 'pseudo', lignes: [{ entree: { type: 'lien', nom: langue === 'en' ? `Add @${pseudo} to your socials` : `Ajouter @${pseudo} à tes réseaux`, picto: 'communaute' }, pseudo }] };
  const url = /\s/.test(t) ? '' : adresseSaisie(t);
  if (/^mailto:/i.test(url)) return { mode: 'adresse', lignes: [{ entree: enLangue(ECRIRE, langue), url, detail: decodeURIComponent(url.slice(7)) }] };
  if (/^https?:/i.test(url)) {
    const appel = typeDeAdresse(url, true);
    const detail = hote(url);
    // Sans Starter, une adresse de la vitrine reste un lien qui marche ; ce qu'elle deviendrait suit, avec son offre.
    // Une chaîne YouTube, un flux : un lien d'abord, ce qu'il peut devenir juste dessous.
    const propose = appel === 'lien' ? suggestion(url) : null;
    const lignes: LigneAjout[] = propose ? [{ entree: LIEN_, url, auto: true, detail }, { entree: entreeDe(propose, langue), url }]
      : appel === 'lien' ? [{ entree: LIEN_, url, auto: true, detail }]
      : appel === 'video' || vitrine ? [{ entree: entreeDe(appel, langue), url, auto: true, detail }, { entree: LIEN_, url }]
        : [{ entree: LIEN_, url, auto: true, detail }, { entree: entreeDe(appel, langue), url }];
    // Une adresse d'affiliation (une régie, le tag d'Amazon) peut être un lien partenaire, juste sous ce qu'elle appelle ;
    // les autres ne le proposent pas : un agenda ou une cagnotte n'en sont pas.
    if (lienAffilie(url)) lignes.splice(1, 0, { entree: PARTENAIRE_, url });
    // Un domaine seul (« cal.com », « ko-fi.com », « systeme.io ») se cherche aussi par son nom.
    if (!/[/:]/.test(t)) {
      const nom = t.replace(/^www\./i, '').replace(/\.[a-z]{2,}$/i, '');
      for (const entree of chercherBlocs(nom, principal, langue)) if (!lignes.some(l => l.entree.nom === entree.nom && l.entree.type === entree.type)) lignes.push({ entree });
    }
    return { mode: 'adresse', lignes };
  }
  if (!/\s/.test(t) && (/[.:/@]/.test(t) || debutAdresse(t.toLowerCase()))) return { mode: 'saisie', lignes: [] };
  return { mode: 'mots', lignes: chercherBlocs(t, principal, langue).map(entree => ({ entree })) };
}

/**
 * Ce que dit le choix pendant qu'une adresse, un pseudo ou un numéro se tape (`fini` : après Entrée, ce qui manque pour
 * de bon) : le champ ne se tait jamais.
 */
export function aideSaisie(texte: string, fini = false, langue: Langue = 'fr'): string {
  const t = texte.trim();
  const l = (fr: string, en: string) => (langue === 'en' ? en : fr);
  if (t === '@') return l('Tape ton pseudo après le @ : il rejoindra tes réseaux.', 'Type your handle after the @: it will join your socials.');
  if (chiffres(t)) return fini ? l('Un numéro de téléphone s’écrit en entier, avec au moins 8 chiffres.', 'Write the phone number in full, with at least 8 digits.') : l('Un numéro de téléphone : tape-le en entier, il deviendra un lien d’appel.', 'A phone number: type it in full and it becomes a call link.');
  return fini ? pourquoiPasAdresse(t, langue) : l('Termine l’adresse : elle choisira son bloc.', 'Finish the address: it will pick its block.');
}

/** Le geste qui fait prendre à un lien le bloc que son adresse appelle, dans l'éditeur et au retour d'un paiement. */
export const EN_FAIRE: Record<Exclude<TypeAdresse, 'lien'>, string> = {
  video: 'En faire une vidéo dans ta page', musique: 'En faire un lecteur dans ta page', reservation: 'En faire une prise de rendez-vous', soutien: 'En faire un bouton « Me soutenir »', produit: 'En faire un produit',
  'derniere-video': 'En faire ta dernière vidéo, toujours à jour', flux: 'En faire tes derniers articles',
};

export const EN_FAIRE_EN: Record<Exclude<TypeAdresse, 'lien'>, string> = {
  video: 'Make it a video on your page', musique: 'Make it a player on your page', reservation: 'Make it a booking', soutien: 'Make it a “Support me” button', produit: 'Make it a product',
  'derniere-video': 'Make it your latest video, always up to date', flux: 'Make it your latest posts',
};
export const enFaire = (type: Exclude<TypeAdresse, 'lien'>, langue: Langue = 'fr') => (langue === 'en' ? EN_FAIRE_EN : EN_FAIRE)[type];

/** Ce que devient un bloc qui change de type, dit en une phrase (pour les lecteurs d'écran). */
export const DEVENU: Record<TypeAdresse, string> = {
  lien: 'un simple lien', video: 'une vidéo', musique: 'un lecteur', reservation: 'une prise de rendez-vous', soutien: 'un bouton « Me soutenir »', produit: 'un produit',
  'derniere-video': 'ta dernière vidéo YouTube', flux: 'tes derniers articles',
};
export const DEVENU_EN: Record<TypeAdresse, string> = {
  lien: 'a simple link', video: 'a video', musique: 'a player', reservation: 'a booking', soutien: 'a “Support me” button', produit: 'a product',
  'derniere-video': 'your latest YouTube video', flux: 'your latest posts',
};
export const devenu = (type: TypeAdresse, langue: Langue = 'fr') => (langue === 'en' ? DEVENU_EN : DEVENU)[type];

/**
 * La famille d'un type de bloc, qui donne sa couleur à son picto dans la liste de Ma page (27 octobre 2026, Lilian :
 * « aider l'utilisateur à trouver l'information plus vite grâce aux couleurs ») : ce qui mène ailleurs, ce qui se
 * regarde ou s'écoute, ce qui se vend, ce qui fait venir à soi, et le texte, à l'encre.
 */
export type FamilleBloc = 'liens' | 'medias' | 'vitrine' | 'contact' | 'preuve' | 'texte';
const FAMILLE: Partial<Record<TypeBloc, FamilleBloc>> = {
  lien: 'liens',
  video: 'medias', musique: 'medias', galerie: 'medias', 'derniere-video': 'medias', flux: 'medias',
  produit: 'vitrine', reservation: 'vitrine', soutien: 'vitrine',
  inscription: 'contact', newsletter: 'contact', formulaire: 'contact', coordonnees: 'contact', lieu: 'contact',
  preuve: 'preuve',
};
export const familleBloc = (type: TypeBloc): FamilleBloc => FAMILLE[type] ?? 'texte';
