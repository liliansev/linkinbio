import type { Bloc, Langue, TypeBloc } from './types.ts';
import { TYPES_BLOC, TYPES_VITRINE, nouveauBloc } from './types.ts';
import { adresse, adresseSaisie, email, montants, numeroAppel, pourquoiPasAdresse, questions } from './valider.ts';
import { estMusique, estVideo } from './lecteurs.ts';
import { adresseFlux, chaineYoutube } from './detection.ts';
import { nomSite } from './demarrage.ts';

/*
 * Ce qu'on tape dans l'éditeur d'un bloc, vérifié sans rien toucher : la même
 * règle sert au bouton « Ajouter à ma page », au repli de la rangée et à
 * l'enregistrement automatique du bureau, qui n'écrit qu'une version valable.
 */

/** Le champ sur lequel porte une erreur : elle s'affiche dessous. */
export type ChampErreur = 'url' | 'titre' | 'description' | 'dates' | 'image' | 'note' | 'nombre' | 'source' | 'questions' | 'telephone' | 'email' | 'adresse' | 'images' | 'cadeau' | 'fichier';
export type Erreurs = Partial<Record<ChampErreur, string>>;

/** Les blocs qui ne vont nulle part sans leur adresse, et ce qu'on dit quand elle manque. */
const ADRESSE_MANQUANTE: Partial<Record<TypeBloc, [string, string]>> = {
  lien: ['Indique l’adresse du lien.', 'Add the link’s address.'],
  produit: ['Indique l’adresse du produit sur ta boutique.', 'Add the product’s address on your shop.'],
  soutien: ['Indique l’adresse de ta page PayPal.Me, Ko-fi ou Tipeee.', 'Add the address of your PayPal.Me, Ko-fi or Buy Me a Coffee page.'],
  reservation: ['Indique l’adresse de ton agenda.', 'Add your booking page’s address.'],
  video: ['Colle l’adresse d’une vidéo YouTube, Vimeo ou TikTok.', 'Paste the address of a YouTube, Vimeo or TikTok video.'],
  musique: ['Colle l’adresse d’un titre, d’un album ou d’un podcast.', 'Paste the address of a track, an album or a podcast.'],
  'derniere-video': ['Colle l’adresse de ta chaîne YouTube, comme youtube.com/@tonnom.', 'Paste your YouTube channel’s address, like youtube.com/@yourname.'],
  flux: ['Colle l’adresse de ton blog, ou celle de son flux RSS.', 'Paste your blog’s address, or its RSS feed.'],
};

/**
 * La version à enregistrer, ou ce qui manque, champ par champ. Une adresse
 * tapée sans https le prend ; un lien sans texte prend le nom du site, jamais
 * une adresse brute sur la page ; « Me soutenir » et une prise de rendez-vous
 * sans texte reprennent celui de départ. Un produit a toujours son nom.
 */
export function verifierBloc(b: Bloc, langue: Langue = 'fr'): { bloc: Bloc; erreurs?: undefined } | { bloc?: undefined; erreurs: Erreurs } {
  const l = (fr: string, en: string) => (langue === 'en' ? en : fr);
  const manquante = ADRESSE_MANQUANTE[b.type]?.[langue === 'en' ? 1 : 0];
  // Un numéro tapé dans l'adresse d'un lien devient un lien d'appel.
  const url = manquante ? (b.type === 'lien' && numeroAppel(b.url)) || adresseSaisie(b.url) : b.type === 'coordonnees' ? adresseSaisie(b.url) : adresse(b.url);
  if (manquante && !url) return { erreurs: { url: b.url.trim() ? pourquoiPasAdresse(b.url, langue) : manquante } };
  // Une boutique, une cagnotte, un agenda : une page web, jamais une adresse e-mail.
  if (TYPES_VITRINE.includes(b.type) && !/^https?:\/\//i.test(url)) return { erreurs: { url: l('Colle l’adresse d’une page web, qui commence par https://.', 'Paste a web page address, starting with https://.') } };
  if (b.type === 'produit' && !b.titre.trim()) return { erreurs: { titre: l('Écris le nom du produit.', 'Write the product name.') } };
  if (b.type === 'video' && !estVideo(url)) return { erreurs: { url: l('Colle l’adresse d’une vidéo YouTube, Vimeo ou TikTok.', 'Paste the address of a YouTube, Vimeo or TikTok video.') } };
  if (b.type === 'musique' && !estMusique(url)) return { erreurs: { url: l('Colle l’adresse d’un titre, d’un album, d’une playlist ou d’un podcast sur Spotify, Apple Music, Deezer ou SoundCloud.', 'Paste the address of a track, album, playlist or podcast on Spotify, Apple Music, Deezer or SoundCloud.') } };
  if (b.type === 'derniere-video' && !chaineYoutube(url) && !(adresseFlux(url) && /youtube\.com\/feeds\//.test(url))) return { erreurs: { url: l('Colle l’adresse de ta chaîne YouTube, comme youtube.com/@tonnom, pas celle d’une vidéo.', 'Paste your YouTube channel’s address, like youtube.com/@yourname, not a video’s.') } };
  if (b.type === 'flux' && !/^https?:\/\//i.test(url)) return { erreurs: { url: l('Colle l’adresse d’une page web, qui commence par https://.', 'Paste a web page address, starting with https://.') } };
  // Un cadeau commencé : son adresse, une page web ; sans rien, il n'y en a pas.
  const cadeau = b.type === 'inscription' && b.cadeau && (b.cadeau.nom.trim() || b.cadeau.url.trim()) ? { nom: b.cadeau.nom.trim(), url: adresseSaisie(b.cadeau.url) } : null;
  if (cadeau && !/^https?:/i.test(cadeau.url)) return { erreurs: { cadeau: b.cadeau!.url.trim() ? l('Colle l’adresse d’une page web, qui commence par https://.', 'Paste a web page address, starting with https://.') : l('Indique l’adresse du cadeau : un PDF, une page, une vidéo.', 'Add the freebie’s address: a PDF, a page, a video.') } };
  if (b.type === 'faq') {
    const q = questions(b.questions);
    if (!q.length) return { erreurs: { questions: l('Écris au moins une question et sa réponse.', 'Write at least one question and its answer.') } };
    if (q.some(x => !x.question)) return { erreurs: { questions: l('Chaque réponse a besoin de sa question.', 'Every answer needs its question.') } };
    if (q.some(x => !x.reponse)) return { erreurs: { questions: l('Chaque question a besoin de sa réponse.', 'Every question needs its answer.') } };
  }
  if (b.type === 'coordonnees') {
    const c = b.coordonnees, manque: Erreurs = {};
    if (!b.titre.trim()) manque.titre = l('Écris ton nom, tel qu’il s’enregistrera dans les contacts.', 'Write your name as it will be saved in contacts.');
    if (c?.telephone.trim() && !numeroAppel(c.telephone)) manque.telephone = l('Un numéro de téléphone s’écrit en entier, avec au moins 8 chiffres.', 'Write the full phone number, with at least 8 digits.');
    if (c?.email.trim() && !email(c.email)) manque.email = l('Cette adresse e-mail n’a pas l’air complète, par exemple toi@exemple.fr', 'This email address looks incomplete, for example you@example.com');
    if (!manque.telephone && !manque.email && !c?.telephone.trim() && !c?.email.trim()) manque.telephone = l('Indique au moins un numéro ou une adresse e-mail.', 'Add at least a phone number or an email address.');
    if (b.url.trim() && !/^https?:/i.test(url)) manque.url = l('Cette adresse de site n’a pas l’air complète, par exemple monsite.fr', 'This website address looks incomplete, for example mysite.com');
    if (Object.keys(manque).length) return { erreurs: manque };
  }
  if (b.type === 'lieu' && !b.adressePostale.trim()) return { erreurs: { adresse: l('Écris l’adresse, comme sur une enveloppe.', 'Write the address, as on an envelope.') } };
  if (b.type === 'document' && !b.fichier) return { erreurs: { fichier: l('Choisis ton PDF.', 'Choose your PDF.') } };
  if (b.type === 'document' && !b.titre.trim()) return { erreurs: { titre: l('Écris le texte du bouton, par exemple « Mes tarifs ».', 'Write the button text, for example “My rates”.') } };
  if (b.type === 'audio' && !b.fichier) return { erreurs: { fichier: l('Enregistre ta note vocale, ou choisis un fichier son.', 'Record your voice note, or choose an audio file.') } };
  if (b.type === 'galerie' && !b.images.length) return { erreurs: { images: l('Ajoute au moins une photo.', 'Add at least one photo.') } };
  if ((b.type === 'titre' || b.type === 'texte') && !b.titre.trim()) return { erreurs: { titre: b.type === 'titre' ? l('Écris le titre.', 'Write the heading.') : l('Écris le texte.', 'Write the text.') } };
  if (b.type === 'preuve' && b.preuve?.genre === 'temoignage' && !b.description.trim()) return { erreurs: { description: l('Écris le témoignage.', 'Write the testimonial.') } };
  if (b.type === 'preuve' && b.preuve?.genre === 'compteur' && !b.preuve.nombre) return { erreurs: { nombre: l('Indique le chiffre à montrer.', 'Add the number to show.') } };
  // Une note n'est jamais inventée : elle se tape, avec son nombre d'avis et sa source.
  if (b.type === 'preuve' && b.preuve?.genre === 'note') {
    const manque: Erreurs = {};
    if (!b.preuve.note) manque.note = l('Indique ta note, par exemple 4,8.', 'Add your rating, for example 4.8.');
    else if (b.preuve.note > 5) manque.note = l('La note va de 0 à 5. Sur 10, divise-la par deux.', 'The rating goes from 0 to 5. Out of 10, halve it.');
    if (!b.preuve.nombre) manque.nombre = l('Indique le nombre d’avis.', 'Add the number of reviews.');
    if (!b.preuve.source.trim()) manque.source = l('Indique où les avis sont publiés, par exemple Google.', 'Say where the reviews are published, for example Google.');
    if (Object.keys(manque).length) return { erreurs: manque };
  }
  if (b.debut && b.fin && new Date(b.fin) <= new Date(b.debut)) return { erreurs: { dates: l('La fin doit venir après le début.', 'The end must come after the start.') } };
  const titre = b.titre.trim() ? b.titre
    : b.type === 'lien' ? nomSite(url) || b.titre
    : b.type === 'soutien' || b.type === 'reservation' ? nouveauBloc(b.type, b.id, langue).titre
    : b.titre;
  return {
    bloc: {
      ...b, url, titre,
      // Comme le serveur les rangera : les montants triés, sans doublon ; un code promo sans espace autour.
      ...(b.type === 'soutien' ? { montants: montants(b.montants) } : {}),
      ...(b.partenariat ? { partenariat: { ...b.partenariat, code: b.partenariat.code.trim() } } : {}),
      ...(b.type === 'faq' ? { questions: questions(b.questions) } : {}),
      ...(b.type === 'inscription' ? { cadeau } : {}),
      ...(b.type === 'coordonnees' && b.coordonnees ? { coordonnees: { ...b.coordonnees, telephone: b.coordonnees.telephone.trim(), email: email(b.coordonnees.email) } } : {}),
    },
  };
}

/** Deux versions d'un bloc identiques : rien à enregistrer. */
export const memeBloc = (a: Bloc | null | undefined, b: Bloc | null | undefined) => !!a && !!b && JSON.stringify(a) === JSON.stringify(b);

/**
 * Un bloc neuf commencé, gardé sur l'appareil (23 octobre 2026) : une page rechargée ou refermée le retrouve tel qu'on
 * l'avait laissé. Rien ne part au serveur tant qu'il n'est pas ajouté ; une semaine au plus.
 */
export interface BlocCommence { bloc: Bloc; enBas: boolean; choisi: boolean; quand: number }
export const cleBlocCommence = (pseudo: string) => `hopla-bloc-commence:${pseudo}`;
export const GARDE_BLOC_COMMENCE = 7 * 24 * 3600 * 1000;

/**
 * Relit un bloc commencé : null s'il est trop vieux, abîmé, encore vide ou déjà sur la page (`ids`). Chaque champ reprend
 * celui d'un bloc neuf quand le sien manque ou n'a pas la bonne forme : un brouillon d'une version d'avant ne casse rien.
 */
export function relireBlocCommence(texte: string | null, ids: readonly string[], maintenant = Date.now()): BlocCommence | null {
  let d: unknown;
  try { d = JSON.parse(texte ?? 'null'); } catch { return null; }
  if (!d || typeof d !== 'object') return null;
  const { bloc, enBas, choisi, quand } = d as Record<string, unknown>;
  if (typeof quand !== 'number' || quand > maintenant + 60_000 || maintenant - quand > GARDE_BLOC_COMMENCE) return null;
  if (!bloc || typeof bloc !== 'object') return null;
  const brut = bloc as Record<string, unknown>;
  const { id, type } = brut;
  if (typeof id !== 'string' || !id || ids.includes(id) || !TYPES_BLOC.includes(type as TypeBloc)) return null;
  const neuf = nouveauBloc(type as TypeBloc, id);
  const repris: Record<string, unknown> = { ...neuf };
  for (const [k, attendu] of Object.entries(neuf)) {
    const v = brut[k];
    const bonneForme = attendu === null ? v === null || (typeof v === 'object' && !Array.isArray(v))
      : Array.isArray(attendu) ? Array.isArray(v) : typeof v === typeof attendu;
    if (v !== undefined && bonneForme) repris[k] = v;
  }
  if (memeBloc(repris as unknown as Bloc, neuf)) return null;
  return { bloc: repris as unknown as Bloc, enBas: enBas === true, choisi: choisi === true, quand };
}
