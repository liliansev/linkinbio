import type { FournisseurListe, IntegrationListe, Newsletter, Webhook } from './types.ts';
import { estWebhook } from './types.ts';

/*
 * Où partent les inscrits de « Rejoins ma liste » (22 octobre 2026, demandé par
 * Lilian : chacun a sa newsletter). Six newsletters se branchent par leur API :
 * une clé, puis la liste choisie parmi celles du compte, sans chercher
 * d'identifiant. Make, Zapier et n8n se branchent par l'adresse d'un webhook,
 * qui reçoit chaque inscrit. Substack n'a pas d'API : ses inscrits se copient
 * ou s'importent en fichier, depuis l'onglet Intégrations.
 */

export const NOMS_FOURNISSEURS: Record<FournisseurListe, string> = {
  brevo: 'Brevo', mailchimp: 'Mailchimp', kit: 'Kit', mailerlite: 'MailerLite', beehiiv: 'beehiiv', systeme: 'Systeme.io',
  make: 'Make', zapier: 'Zapier', n8n: 'n8n',
};

/**
 * Comment chaque newsletter appelle l'endroit où vont les inscrits : « la liste » chez Brevo, « le formulaire »
 * chez Kit… `vide` : ce que dit le choix quand le compte n'en a aucune (un tag Systeme.io est facultatif).
 */
export const LISTE_CHEZ: Record<Newsletter, { mot: string; la: string; cette: string; vide: string }> = {
  brevo: { mot: 'Liste', la: 'la liste', cette: 'cette liste', vide: 'Aucune liste chez Brevo. Crées-en une, puis réessaie.' },
  mailchimp: { mot: 'Audience', la: 'l’audience', cette: 'cette audience', vide: 'Aucune audience chez Mailchimp. Crées-en une, puis réessaie.' },
  kit: { mot: 'Formulaire', la: 'le formulaire', cette: 'ce formulaire', vide: 'Aucun formulaire chez Kit. Crées-en un, puis réessaie.' },
  mailerlite: { mot: 'Groupe', la: 'le groupe', cette: 'ce groupe', vide: 'Aucun groupe chez MailerLite. Crées-en un, puis réessaie.' },
  beehiiv: { mot: 'Publication', la: 'la publication', cette: 'cette publication', vide: 'Aucune publication chez beehiiv.' },
  systeme: { mot: 'Tag', la: 'le tag', cette: 'ce tag', vide: '' },
};

/** Où partent les inscrits, en quelques mots : « chez Brevo, la liste « Newsletter » », « vers Make ». */
export function destination(i: Pick<IntegrationListe, 'fournisseur' | 'nom'>): string {
  const nom = NOMS_FOURNISSEURS[i.fournisseur];
  if (estWebhook(i.fournisseur)) return `vers ${nom}`;
  return i.nom ? `chez ${nom}, ${LISTE_CHEZ[i.fournisseur].la} « ${i.nom} »` : `chez ${nom}`;
}

/** Le logo de chaque outil, une icône de `icones.ts` : le vrai, celui de la marque (la bulle de MailerLite, l'abeille de beehiiv, le rond de Systeme.io). */
export const LOGOS_OUTILS: Record<FournisseurListe | 'substack', string> = {
  brevo: 'brevo', mailchimp: 'mailchimp', kit: 'kit', mailerlite: 'mailerlite', beehiiv: 'beehiiv', systeme: 'systeme', substack: 'substack',
  make: 'make', zapier: 'zapier', n8n: 'n8n',
};

/**
 * Les blocs qui accueillent un outil sur la page, et quelques-uns de ces outils, en exemple : des symboles, jamais un mot
 * illisible en 16 px ni un logo pris dans son carré (Google Agenda n'en a pas d'autre : il n'y figure pas).
 */
export const OUTILS_DES_BLOCS: { type: 'preuve' | 'reservation' | 'soutien' | 'produit'; logos: string[] }[] = [
  { type: 'preuve', logos: ['google', 'trustpilot', 'malt'] },
  { type: 'reservation', logos: ['calendly'] },
  { type: 'soutien', logos: ['paypal', 'kofi', 'patreon'] },
  { type: 'produit', logos: ['stripe', 'shopify', 'etsy'] },
];

/**
 * La couleur de chaque logo : celle de la marque, foncée s'il le faut pour se lire à 4,5:1 sur le blanc (comme
 * `COULEURS_SOURCES`) ; absent, l'encre (une marque noire ou jaune : Mailchimp, Kit, Patreon).
 */
export const COULEURS_LOGOS: Record<string, string> = {
  brevo: '#0a8560', mailerlite: '#047a42', systeme: '#0070b8', substack: '#c84b08', make: '#6d00cc', zapier: '#d24000', n8n: '#d33660',
  google: '#1a73e8', trustpilot: '#00845a', malt: '#d63b3b', calendly: '#006bff',
  paypal: '#002991', kofi: '#c94a22', stripe: '#635bff', shopify: '#4a8030', etsy: '#c4511a', spotify: '#117a37',
};

/** Ce qui tourne derrière un webhook, à activer pour qu'il reçoive. */
export const OUVRAGE_WEBHOOK: Record<Webhook, string> = { make: 'ton scénario', zapier: 'ton Zap', n8n: 'ton workflow' };

/** Les champs envoyés à un webhook pour chaque inscrit : les colonnes du CSV, plus la page et `exemple`. */
export const CHAMPS_WEBHOOK = ['email', 'prenom', 'inscrit_le', 'provenance', 'page', 'exemple'] as const;

/**
 * L'adresse d'un webhook, si elle a la forme qu'attend son outil : Make sur `hook.<région>.make.com`, Zapier
 * sur `hooks.zapier.com`, n8n sur son instance, où qu'elle soit (le serveur refuse le réseau interne à la
 * connexion, voir server/sortante.ts).
 */
export function adresseWebhook(outil: Webhook, cle: string): URL | null {
  let u: URL;
  try { u = new URL(cle.trim()); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password) return null;
  if (outil === 'make') return !u.port && /^hook\.([a-z0-9-]+\.)?(make\.com|make\.celonis\.com|integromat\.com)$/.test(u.hostname) ? u : null;
  if (outil === 'zapier') return !u.port && u.hostname === 'hooks.zapier.com' ? u : null;
  return u;
}

/** Ce que dit le back office d'une adresse qui n'a pas la forme attendue. */
export const ADRESSE_WEBHOOK: Record<Webhook, string> = {
  make: 'Colle l’adresse de ton webhook Make, du type https://hook.eu1.make.com/…',
  zapier: 'Colle l’adresse de ton webhook Zapier, du type https://hooks.zapier.com/hooks/catch/…',
  n8n: 'Colle l’adresse de ton webhook n8n, en https://…',
};
