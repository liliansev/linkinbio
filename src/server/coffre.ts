import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';
import { secret } from './db.ts';

/*
 * Le coffre : ce que Hopla garde sans le laisser lisible dans la base. Les clés
 * d'API et les adresses des webhooks (22 octobre 2026), puis les e-mails et les
 * prénoms des inscrits d'une liste (25 octobre 2026, demandé par Lilian) :
 * chiffrés en AES-256-GCM. Une copie de la base ou d'une sauvegarde ne donne
 * rien sans la clé, qui vit dans l'environnement du serveur
 * (`LIENS_CLE_INTEGRATIONS`, dans `runtime.env`). Sans elle, le secret de la
 * base sert de clé, comme avant : ce qu'il a chiffré se relit toujours, et
 * passe sous la clé de l'environnement au démarrage suivant (`db.rechiffrer`).
 */

type Cles = Record<string, string | undefined>;

const deriver = (base: string) => createHash('sha256').update(base).digest();

/** Les clés qui ouvrent, la première chiffre : celle de l'environnement, puis le secret de la base. */
function cles(env: Cles): Buffer[] {
  const base = deriver(secret());
  return env.LIENS_CLE_INTEGRATIONS ? [deriver(env.LIENS_CLE_INTEGRATIONS), base] : [base];
}

/** Un repère de la clé qui chiffre, pour savoir au démarrage si elle a changé (jamais la clé elle-même). */
export const repereCle = (env: Cles = process.env) => createHmac('sha256', cles(env)[0]).update('repere').digest('hex').slice(0, 16);

export function chiffrer(env: Cles, texte: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', cles(env)[0], iv);
  const donnees = Buffer.concat([c.update(texte, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), donnees.toString('base64url')].join(':');
}

/** Le texte, ou vide si aucune clé ne l'ouvre. */
export function dechiffrer(env: Cles, valeur: string): string {
  const [v, iv, tag, donnees] = valeur.split(':');
  if (v !== 'v1' || !iv || !tag || donnees === undefined) return '';
  for (const cle of cles(env)) {
    try {
      const d = createDecipheriv('aes-256-gcm', cle, Buffer.from(iv, 'base64url'));
      d.setAuthTag(Buffer.from(tag, 'base64url'));
      return Buffer.concat([d.update(Buffer.from(donnees, 'base64url')), d.final()]).toString('utf8');
    } catch { /* la clé suivante */ }
  }
  return '';
}

export const estChiffre = (valeur: string) => valeur.startsWith('v1:');

/**
 * L'empreinte d'un e-mail dans un compte : la même adresse donne la même, ce qui évite les doublons sans garder
 * l'adresse en clair. Sans la clé, elle ne se retrouve pas en essayant des adresses.
 */
export const empreinte = (env: Cles, compte: string, email: string) =>
  createHmac('sha256', cles(env)[0]).update(`${compte}\n${email.trim().toLowerCase()}`).digest('base64url');
