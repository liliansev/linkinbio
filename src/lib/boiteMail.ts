/**
 * La boîte mail d'une adresse, pour l'ouvrir d'un geste une fois le lien parti (24 octobre 2026, parcours
 * joué de bout en bout : entre « Ouvre l'e-mail » et l'e-mail, il fallait quitter la page et chercher sa
 * boîte). Seulement les messageries qu'on reconnaît à coup sûr par leur domaine ; sinon rien, et la page
 * dit seulement d'aller voir. Gmail s'ouvre sur la recherche des e-mails de Hopla, indésirables compris.
 */
export interface BoiteMail { nom: string; url: string }

const GMAIL = { nom: 'Gmail', url: 'https://mail.google.com/mail/u/0/#search/from%3Ahopla.page+in%3Aanywhere' };
const OUTLOOK = { nom: 'Outlook', url: 'https://outlook.live.com/mail/0/' };
const YAHOO = { nom: 'Yahoo Mail', url: 'https://mail.yahoo.com/' };
const ICLOUD = { nom: 'iCloud Mail', url: 'https://www.icloud.com/mail/' };
const PROTON = { nom: 'Proton Mail', url: 'https://mail.proton.me/' };

const BOITES: Record<string, BoiteMail> = {
  'gmail.com': GMAIL, 'googlemail.com': GMAIL,
  'outlook.com': OUTLOOK, 'outlook.fr': OUTLOOK, 'hotmail.com': OUTLOOK, 'hotmail.fr': OUTLOOK, 'live.com': OUTLOOK, 'live.fr': OUTLOOK, 'msn.com': OUTLOOK,
  'yahoo.com': YAHOO, 'yahoo.fr': YAHOO, 'ymail.com': YAHOO,
  'icloud.com': ICLOUD, 'me.com': ICLOUD, 'mac.com': ICLOUD,
  'proton.me': PROTON, 'protonmail.com': PROTON, 'pm.me': PROTON,
  'orange.fr': { nom: 'Mail Orange', url: 'https://mail.orange.fr/' }, 'wanadoo.fr': { nom: 'Mail Orange', url: 'https://mail.orange.fr/' },
  'free.fr': { nom: 'Zimbra Free', url: 'https://zimbra.free.fr/' },
  'sfr.fr': { nom: 'SFR Mail', url: 'https://webmail.sfr.fr/' }, 'neuf.fr': { nom: 'SFR Mail', url: 'https://webmail.sfr.fr/' },
  'laposte.net': { nom: 'La Poste', url: 'https://www.laposte.net/accueil' },
};

export function boiteMail(email: string): BoiteMail | null {
  const domaine = email.trim().toLowerCase().split('@')[1] ?? '';
  return BOITES[domaine] ?? null;
}
