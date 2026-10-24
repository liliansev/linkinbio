/*
 * Le catalogue des blocs (24 octobre 2026) : ce qu'on ajoute à sa page, tel que le choix des blocs, la feuille et la
 * rangée d'un bloc, Intégrations et les stats le nomment. Le choix des blocs n'en montre d'abord qu'une partie, une
 * entrée par chose qu'on écrit ou que Hopla tient (demandé par Lilian : « vraiment réfléchir à quoi sert chaque
 * lien ») ; le reste vient d'une adresse collée, qui prend le bloc qu'elle appelle (`lib/detection.ts`), ou se cherche
 * dans le même champ, « Colle une adresse ou cherche un bloc », par son nom, ses mots courants et ce qu'on veut en
 * faire (« rdv », « prendre rendez-vous », « vendre », « don »…). Un numéro devient un lien d'appel, un pseudo
 * (« @lilian ») rejoint les réseaux.
 */
import type { Bloc, TypeBloc } from './types.ts';
import { TYPES_PRINCIPAL } from './types.ts';
import type { Fonction } from './abonnement.ts';
import { adresseSaisie, numeroAppel, pourquoiPasAdresse } from './valider.ts';
import { lienAffilie, typeDeAdresse } from './detection.ts';
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
    mots: 'site adresse url bouton page web reseau instagram tiktok facebook linkedin twitter threads spotify twitch pinterest snapchat whatsapp telegram discord podcast blog portfolio' },
  { type: 'lien', nom: 'Lien partenaire', aide: 'Affiliation ou collaboration payée : la mention « Publicité », et ton code promo', picto: 'bloc-partenaire', modele: { partenariat: { mention: 'publicite', code: '' } }, ailleurs: true,
    mots: 'affiliation affilie affiliate publicite pub sponsor sponsorise collaboration commerciale partenariat code promo reduction remise amazon awin' },
  { type: 'video', nom: 'Vidéo YouTube', picto: 'bloc-video', ailleurs: true, mots: 'film clip extrait tuto regarder' },
  // La vitrine : Hopla n'encaisse rien, chaque bloc mène au site qui vend, réserve ou reçoit.
  { type: 'produit', nom: 'Produit', aide: 'Sa photo et son prix, lus sur ta boutique', picto: 'bloc-produit', fonction: 'vitrine', ailleurs: true,
    mots: 'boutique shop vente vendre article achat acheter commander commande payer paiement prix etsy gumroad shopify payhip stan stripe ebook formation atelier vitrine' },
  { type: 'reservation', nom: 'Prise de rendez-vous', aide: 'Ton agenda Calendly, Cal.com, Doctolib ou Planity', picto: 'bloc-reservation', fonction: 'vitrine', ailleurs: true,
    mots: 'rdv agenda calendrier reservation reserver prendre booker creneau disponibilite appel visio reunion consultation seance cours calendly cal.com doctolib planity acuity tidycal hubspot google vitrine' },
  { type: 'soutien', nom: 'Me soutenir', aide: 'Un bouton vers PayPal, Ko-fi, Tipeee ou Lydia', picto: 'bloc-soutien', fonction: 'vitrine', ailleurs: true,
    mots: 'soutien soutenir aider contribuer participer don donation donner payer pourboire tip cagnotte paypal ko-fi kofi tipeee lydia patreon buy coffee cafe vitrine' },
  { type: 'titre', nom: 'Titre de section', picto: 'bloc-titre', mots: 'intertitre separateur rubrique categorie partie' },
  { type: 'texte', nom: 'Texte', picto: 'bloc-texte', mots: 'paragraphe description phrase message presentation' },
  { type: 'preuve', nom: 'Avis et preuves', aide: 'Ta note Google, un chiffre clé ou un témoignage, avec sa source', picto: 'bloc-preuve', fonction: 'avis',
    mots: 'note etoile google trustpilot malt temoignage recommandation chiffre clients' },
  { type: 'inscription', nom: 'Liste e-mail', aide: 'Tes visiteurs laissent leur e-mail, que tu exportes ou envoies vers ta newsletter', picto: 'bloc-inscription', fonction: 'listeEmail',
    mots: 'email mail newsletter lettre inscription inscrit abonne formulaire collecter brevo mailchimp kit mailerlite beehiiv substack systeme.io systeme' },
  { type: 'derniere-video', nom: 'Ma dernière vidéo YouTube', picto: 'bloc-derniere-video', mots: 'chaine automatique' },
  // L'ancienne newsletter de Lilian est la liste e-mail : ses blocs posés restent, elle ne s'ajoute plus.
  { type: 'newsletter', nom: 'Ma newsletter', picto: 'bloc-newsletter', ailleurs: true, retire: true },
];

/** L'entrée du catalogue qui décrit un bloc : un lien partenaire a la sienne. */
export const typeDe = (b: Pick<Bloc, 'type' | 'partenariat'>): TypeAjout =>
  TYPES.find(t => t.type === b.type && !!t.modele?.partenariat === !!b.partenariat) ?? TYPES.find(t => t.type === b.type)!;

/**
 * Le choix des blocs, avant qu'on tape quoi que ce soit : une entrée par chose qu'on écrit ou que Hopla tient, et une
 * seule. Une vidéo, un agenda, une page de soutien ou une fiche de boutique viennent de leur adresse ; un lien partenaire
 * est un lien, avec sa mention. Tous se cherchent aussi par leur nom.
 */
export const CHOIX = TYPES.filter(t => !t.ailleurs && !t.retire);
export const choixPour = (principal: boolean) => (principal ? CHOIX : CHOIX.filter(t => !TYPES_PRINCIPAL.includes(t.type)));

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
  'ajouter', 'ajoute', 'mettre', 'faire', 'veux', 'voudrais', 'bloc', 'blocs', 'nouveau', 'nouvelle']);

/**
 * Les blocs qu'une recherche trouve, du plus évident au plus lointain (24 octobre 2026) : on arrive avec ce qu'on veut
 * faire (« prendre rendez-vous », « vendre mes ebooks »), pas avec le nom d'un bloc. Chaque mot qui compte, au début
 * d'un mot du nom, vaut plus que dans ses mots courants ; un seul suffit, et le nom qui commence par ce qu'on tape passe
 * devant. Une lettre seule ne cherche que les noms. Un bloc retiré ne se trouve pas ; ceux du compte principal,
 * seulement chez lui.
 */
export function chercherBlocs(texte: string, principal: boolean): TypeAjout[] {
  const q = normaliser(texte);
  if (!q) return [];
  const tous = q.split(' ');
  const utiles = tous.filter(m => !MOTS_VIDES.has(m));
  const mots = utiles.length ? utiles : tous;
  return TYPES
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
const entreeDe = (type: TypeAdresse) => TYPES.find(t => t.type === type && !t.modele)!;
const hote = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
/** Le début d'une adresse qu'on tape : « ht », « https:/ », « ww ». */
const debutAdresse = (t: string) => t.length > 1 && ['https://', 'http://', 'www.'].some(d => d.startsWith(t));
/** Des chiffres, avec ce qu'on met entre eux : un numéro de téléphone, entier ou pas. */
const chiffres = (t: string) => /^\+?[\d\s.()-]+$/.test(t) && /\d/.test(t);

/** Les lignes du choix des blocs pour ce qui est tapé. `vitrine` : la page a les blocs de la vitrine (Starter). */
export function choixAjout(texte: string, { principal, vitrine }: { principal: boolean; vitrine: boolean }): { mode: ModeAjout; lignes: LigneAjout[] } {
  const t = texte.trim();
  if (!t) return { mode: 'vide', lignes: choixPour(principal).map(entree => ({ entree })) };
  const numero = numeroAppel(t);
  if (numero) return { mode: 'numero', lignes: [{ entree: APPEL, url: numero, detail: t }] };
  if (chiffres(t)) return { mode: 'saisie', lignes: [] };
  const pseudo = /^@([\w.-]{1,60})$/.exec(t)?.[1];
  if (pseudo) return { mode: 'pseudo', lignes: [{ entree: { type: 'lien', nom: `Ajouter @${pseudo} à tes réseaux`, picto: 'communaute' }, pseudo }] };
  const url = /\s/.test(t) ? '' : adresseSaisie(t);
  if (/^mailto:/i.test(url)) return { mode: 'adresse', lignes: [{ entree: ECRIRE, url, detail: decodeURIComponent(url.slice(7)) }] };
  if (/^https?:/i.test(url)) {
    const appel = typeDeAdresse(url, true);
    const detail = hote(url);
    // Sans Starter, une adresse de la vitrine reste un lien qui marche ; ce qu'elle deviendrait suit, avec son offre.
    const lignes: LigneAjout[] = appel === 'lien' ? [{ entree: LIEN, url, auto: true, detail }]
      : appel === 'video' || vitrine ? [{ entree: entreeDe(appel), url, auto: true, detail }, { entree: LIEN, url }]
        : [{ entree: LIEN, url, auto: true, detail }, { entree: entreeDe(appel), url }];
    // Une adresse d'affiliation (une régie, le tag d'Amazon) peut être un lien partenaire, juste sous ce qu'elle appelle ;
    // les autres ne le proposent pas : un agenda ou une cagnotte n'en sont pas.
    if (lienAffilie(url)) lignes.splice(1, 0, { entree: PARTENAIRE, url });
    // Un domaine seul (« cal.com », « ko-fi.com », « systeme.io ») se cherche aussi par son nom.
    if (!/[/:]/.test(t)) {
      const nom = t.replace(/^www\./i, '').replace(/\.[a-z]{2,}$/i, '');
      for (const entree of chercherBlocs(nom, principal)) if (!lignes.some(l => l.entree === entree)) lignes.push({ entree });
    }
    return { mode: 'adresse', lignes };
  }
  if (!/\s/.test(t) && (/[.:/@]/.test(t) || debutAdresse(t.toLowerCase()))) return { mode: 'saisie', lignes: [] };
  return { mode: 'mots', lignes: chercherBlocs(t, principal).map(entree => ({ entree })) };
}

/**
 * Ce que dit le choix pendant qu'une adresse, un pseudo ou un numéro se tape (`fini` : après Entrée, ce qui manque pour
 * de bon) : le champ ne se tait jamais.
 */
export function aideSaisie(texte: string, fini = false): string {
  const t = texte.trim();
  if (t === '@') return 'Tape ton pseudo après le @ : il rejoindra tes réseaux.';
  if (chiffres(t)) return fini ? 'Un numéro de téléphone s’écrit en entier, avec au moins 8 chiffres.' : 'Un numéro de téléphone : tape-le en entier, il deviendra un lien d’appel.';
  return fini ? pourquoiPasAdresse(t) : 'Termine l’adresse : elle choisira son bloc.';
}

/** Le geste qui fait prendre à un lien le bloc que son adresse appelle, dans l'éditeur et au retour d'un paiement. */
export const EN_FAIRE: Record<Exclude<TypeAdresse, 'lien'>, string> = {
  video: 'En faire une vidéo dans ta page', reservation: 'En faire une prise de rendez-vous', soutien: 'En faire un bouton « Me soutenir »', produit: 'En faire un produit',
};

/** Ce que devient un bloc qui change de type, dit en une phrase (pour les lecteurs d'écran). */
export const DEVENU: Record<TypeAdresse, string> = {
  lien: 'un simple lien', video: 'une vidéo', reservation: 'une prise de rendez-vous', soutien: 'un bouton « Me soutenir »', produit: 'un produit',
};
