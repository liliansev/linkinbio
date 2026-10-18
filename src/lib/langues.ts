import { LANGUES } from './types.ts';
import type { Langue, LangueVisiteur, PagePublique } from './types.ts';

/*
 * La page en plusieurs langues : la personne choisit les langues qu'elle
 * propose et traduit ses textes ; le visiteur voit la page dans la sienne
 * (celle de son navigateur, ou celle qu'il choisit en bas de page). Ce qui
 * n'est pas traduit reste en français. Les mots de la page elle-même (le
 * formulaire, le compte à rebours, les places d'un drop) sont traduits ici.
 */

export const NOMS_LANGUES: Record<LangueVisiteur, string> = { fr: 'Français', en: 'English', es: 'Español', de: 'Deutsch', it: 'Italiano' };
export const LOCALES: Record<LangueVisiteur, string> = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES', de: 'de-DE', it: 'it-IT' };

const estLangue = (v: string): v is Langue => (LANGUES as readonly string[]).includes(v);

/**
 * La langue de la page pour ce visiteur : celle qu'il a choisie (`?lang=`),
 * sinon la première de son navigateur que la page parle. Un visiteur qui ne
 * lit aucune d'elles voit l'anglais s'il est proposé, sinon le français.
 */
export function langueDuVisiteur(entete: string, proposees: readonly Langue[], choisie = ''): LangueVisiteur {
  if (!proposees.length) return 'fr';
  const c = choisie.toLowerCase();
  if (c === 'fr') return 'fr';
  if (estLangue(c) && proposees.includes(c)) return c;
  const voulues = entete.split(',').map((morceau, i) => {
    const [tag, ...params] = morceau.trim().toLowerCase().split(';');
    const q = Number(params.find(p => p.trim().startsWith('q='))?.split('=')[1] ?? 1);
    return { langue: tag.split('-')[0], q: Number.isFinite(q) ? q : 0, i };
  }).filter(v => v.langue && v.q > 0).sort((a, b) => b.q - a.q || a.i - b.i);
  for (const { langue } of voulues) {
    if (langue === 'fr') return 'fr';
    if (estLangue(langue) && proposees.includes(langue)) return langue;
  }
  return voulues.length && proposees.includes('en') ? 'en' : 'fr';
}

/** La page avec les textes traduits dans cette langue, là où la personne les a écrits. */
export function traduirePage(page: PagePublique, langue: LangueVisiteur): PagePublique {
  if (langue === 'fr') return { ...page, langue };
  const bio = page.reglages.bioTraduite?.[langue];
  return {
    ...page,
    langue,
    reglages: bio ? { ...page.reglages, profil: { ...page.reglages.profil, bio } } : page.reglages,
    blocs: page.blocs.map(b => {
      const t = b.traductions?.[langue];
      if (!t) return b;
      return { ...b, titre: t.titre || b.titre, sousTitre: t.sousTitre || b.sousTitre, description: t.description || b.description };
    }),
  };
}

const fr = {
  rien: 'Rien ici pour l’instant.',
  partager: 'Partager cette page', copie: 'Lien copié', reseaux: 'Réseaux', verifie: 'Compte vérifié',
  confidentialite: 'Confidentialité', signaler: 'Signaler', hopla: 'Une page faite avec Hopla', langue: 'Langue',
  bientot: 'Bientôt', ouvert: 'C’est ouvert', ouvreLe: (quand: string) => `Ouvre le ${quand}`,
  prenom: 'Prénom', prenomAria: 'Ton prénom', email: 'ton@email.fr', emailAria: 'Ton adresse e-mail', inscrire: 'Je m’inscris',
  mention: 'Ton adresse sert seulement à recevoir ces e-mails. Désinscription en un clic, quand tu veux.',
  merci: 'C’est noté, merci !', emailInvalide: 'Cette adresse e-mail ne semble pas valide.', tropDEssais: 'Trop d’essais. Réessaie dans quelques minutes.',
  echec: 'Ça n’est pas passé. Réessaie.', apercu: 'Dans l’aperçu, rien n’est envoyé.',
  code: 'Code d’accès', debloquer: 'Débloquer', reserver: 'Prendre ma place', ouvrir: 'Ouvrir le lien', mauvaisCode: 'Ce n’est pas le bon code.',
  complet: 'Complet', plusQueUne: 'Plus qu’une place', plusQue: (n: string) => `Plus que ${n} places`, places: (n: string) => `${n} places`,
  reserve: 'Accès réservé', debloque: 'C’est débloqué.', garde: 'Ta place est gardée.', indisponible: 'Ce lien n’est plus disponible.',
  avis: (n: string, source: string) => `${n} avis${source ? ` ${source}` : ''}`, sur5: 'sur 5', noteAria: (note: string) => `Noté ${note} sur 5`,
};
export type Textes = typeof fr;

const en: Textes = {
  rien: 'Nothing here yet.',
  partager: 'Share this page', copie: 'Link copied', reseaux: 'Socials', verifie: 'Verified account',
  confidentialite: 'Privacy', signaler: 'Report', hopla: 'A page made with Hopla', langue: 'Language',
  bientot: 'Coming soon', ouvert: 'It’s open', ouvreLe: quand => `Opens ${quand}`,
  prenom: 'First name', prenomAria: 'Your first name', email: 'you@email.com', emailAria: 'Your email address', inscrire: 'Sign me up',
  mention: 'Your address is only used to send you these emails. Unsubscribe in one click, any time.',
  merci: 'You’re in, thanks!', emailInvalide: 'This email address doesn’t look right.', tropDEssais: 'Too many tries. Try again in a few minutes.',
  echec: 'That didn’t go through. Try again.', apercu: 'Nothing is sent from the preview.',
  code: 'Access code', debloquer: 'Unlock', reserver: 'Claim my spot', ouvrir: 'Open the link', mauvaisCode: 'That’s not the right code.',
  complet: 'Sold out', plusQueUne: 'Only one spot left', plusQue: n => `Only ${n} spots left`, places: n => `${n} spots`,
  reserve: 'Exclusive access', debloque: 'Unlocked.', garde: 'Your spot is saved.', indisponible: 'This link is no longer available.',
  avis: (n, source) => `${n} ${source ? `${source} ` : ''}reviews`, sur5: 'out of 5', noteAria: note => `Rated ${note} out of 5`,
};

const es: Textes = {
  rien: 'Nada por aquí todavía.',
  partager: 'Compartir esta página', copie: 'Enlace copiado', reseaux: 'Redes', verifie: 'Cuenta verificada',
  confidentialite: 'Privacidad', signaler: 'Denunciar', hopla: 'Una página hecha con Hopla', langue: 'Idioma',
  bientot: 'Muy pronto', ouvert: 'Ya está abierto', ouvreLe: quand => `Abre el ${quand}`,
  prenom: 'Nombre', prenomAria: 'Tu nombre', email: 'tu@email.com', emailAria: 'Tu correo electrónico', inscrire: 'Me apunto',
  mention: 'Tu correo solo sirve para recibir estos emails. Date de baja con un clic cuando quieras.',
  merci: '¡Listo, gracias!', emailInvalide: 'Este correo no parece válido.', tropDEssais: 'Demasiados intentos. Vuelve a intentarlo en unos minutos.',
  echec: 'No ha funcionado. Inténtalo de nuevo.', apercu: 'En la vista previa no se envía nada.',
  code: 'Código de acceso', debloquer: 'Desbloquear', reserver: 'Reservar mi plaza', ouvrir: 'Abrir el enlace', mauvaisCode: 'Ese no es el código.',
  complet: 'Agotado', plusQueUne: 'Solo queda una plaza', plusQue: n => `Solo quedan ${n} plazas`, places: n => `${n} plazas`,
  reserve: 'Acceso reservado', debloque: 'Desbloqueado.', garde: 'Tu plaza está guardada.', indisponible: 'Este enlace ya no está disponible.',
  avis: (n, source) => `${n} opiniones${source ? ` en ${source}` : ''}`, sur5: 'de 5', noteAria: note => `Valorado con ${note} de 5`,
};

const de: Textes = {
  rien: 'Hier gibt es noch nichts.',
  partager: 'Seite teilen', copie: 'Link kopiert', reseaux: 'Netzwerke', verifie: 'Verifiziertes Konto',
  confidentialite: 'Datenschutz', signaler: 'Melden', hopla: 'Eine Seite gemacht mit Hopla', langue: 'Sprache',
  bientot: 'Demnächst', ouvert: 'Jetzt offen', ouvreLe: quand => `Öffnet am ${quand}`,
  prenom: 'Vorname', prenomAria: 'Dein Vorname', email: 'du@email.de', emailAria: 'Deine E-Mail-Adresse', inscrire: 'Eintragen',
  mention: 'Deine Adresse dient nur dazu, diese E-Mails zu bekommen. Abmeldung jederzeit mit einem Klick.',
  merci: 'Eingetragen, danke!', emailInvalide: 'Diese E-Mail-Adresse sieht nicht richtig aus.', tropDEssais: 'Zu viele Versuche. Versuch es in ein paar Minuten noch einmal.',
  echec: 'Das hat nicht geklappt. Versuch es noch einmal.', apercu: 'In der Vorschau wird nichts gesendet.',
  code: 'Zugangscode', debloquer: 'Freischalten', reserver: 'Platz sichern', ouvrir: 'Link öffnen', mauvaisCode: 'Das ist nicht der richtige Code.',
  complet: 'Ausgebucht', plusQueUne: 'Nur noch ein Platz', plusQue: n => `Nur noch ${n} Plätze`, places: n => `${n} Plätze`,
  reserve: 'Exklusiver Zugang', debloque: 'Freigeschaltet.', garde: 'Dein Platz ist gesichert.', indisponible: 'Dieser Link ist nicht mehr verfügbar.',
  avis: (n, source) => `${n} Bewertungen${source ? ` auf ${source}` : ''}`, sur5: 'von 5', noteAria: note => `Mit ${note} von 5 bewertet`,
};

const it: Textes = {
  rien: 'Ancora niente qui.',
  partager: 'Condividi questa pagina', copie: 'Link copiato', reseaux: 'Social', verifie: 'Account verificato',
  confidentialite: 'Privacy', signaler: 'Segnala', hopla: 'Una pagina fatta con Hopla', langue: 'Lingua',
  bientot: 'Prossimamente', ouvert: 'È aperto', ouvreLe: quand => `Apre il ${quand}`,
  prenom: 'Nome', prenomAria: 'Il tuo nome', email: 'tu@email.it', emailAria: 'Il tuo indirizzo email', inscrire: 'Mi iscrivo',
  mention: 'Il tuo indirizzo serve solo a ricevere queste email. Disiscrizione con un clic, quando vuoi.',
  merci: 'Fatto, grazie!', emailInvalide: 'Questo indirizzo email non sembra valido.', tropDEssais: 'Troppi tentativi. Riprova tra qualche minuto.',
  echec: 'Non è andato a buon fine. Riprova.', apercu: 'Nell’anteprima non viene inviato nulla.',
  code: 'Codice di accesso', debloquer: 'Sblocca', reserver: 'Prendo il mio posto', ouvrir: 'Apri il link', mauvaisCode: 'Non è il codice giusto.',
  complet: 'Esaurito', plusQueUne: 'Resta un solo posto', plusQue: n => `Restano ${n} posti`, places: n => `${n} posti`,
  reserve: 'Accesso riservato', debloque: 'Sbloccato.', garde: 'Il tuo posto è tenuto.', indisponible: 'Questo link non è più disponibile.',
  avis: (n, source) => `${n} recensioni${source ? ` su ${source}` : ''}`, sur5: 'su 5', noteAria: note => `Valutato ${note} su 5`,
};

export const TEXTES: Record<LangueVisiteur, Textes> = { fr, en, es, de, it };
export const textes = (langue?: LangueVisiteur) => TEXTES[langue ?? 'fr'] ?? fr;
