/*
 * Son propre nom de domaine (10 novembre 2026, lot 6 d'après Taap.it, Premium) : `liens.marie.fr` montre la page de
 * Marie, à la racine. Ici, ce qui se dit du nom sans le serveur : sa forme, et ce qu'il faut poser chez son registrar.
 */
import { DOMAINES_COURTS, NOM_ADMIN, NOM_PUBLIC } from './types.ts';

/** Ce que le back office montre du nom d'un compte. `cible` : là où pointer le CNAME ; `texte` : le TXT d'un domaine racine. */
export interface EtatDomainePerso {
  hote: string;
  etat: 'attente' | 'certificat' | 'actif';
  cible: string;
  texte: { nom: string; valeur: string };
}

/** Les noms qui ne sont à personne : ceux de l'instance, les noms courts, et ce qui n'est pas un nom public. */
const reserve = (hote: string, autres: string[] = []) =>
  [NOM_PUBLIC, NOM_ADMIN, ...DOMAINES_COURTS, ...autres].map(n => n.replace(/:\d+$/, '').toLowerCase()).some(n => hote === n || hote.endsWith(`.${n}`))
  || /(^|\.)(localhost|local|internal|test|invalid|example)$/.test(hote);

/**
 * Le nom tapé, remis au propre : sans `https://`, sans chemin, en minuscules, en ASCII (un nom accentué devient son
 * `xn--`). Vide quand ce n'est pas un nom de domaine public, ou que c'est un nom de Hopla. `autres` : la cible des CNAME.
 */
export function hoteDomaine(saisie: unknown, autres: string[] = []): string {
  const brut = (typeof saisie === 'string' ? saisie : '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/[/?#].*$/, '').replace(/\.$/, '');
  if (!brut || brut.length > 253 || /[\s@:]/.test(brut)) return '';
  let hote: string;
  try { hote = new URL(`http://${brut}`).hostname; } catch { return ''; }
  const parties = hote.split('.');
  if (parties.length < 2 || parties.some(p => !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(p))) return '';
  if (!/^([a-z]{2,24}|xn--[a-z0-9-]{2,59})$/.test(parties[parties.length - 1])) return '';
  return reserve(hote, autres) ? '' : hote;
}

/** Combien de parties fait le domaine qu'on achète : deux (`marie.fr`), trois sous `co.uk`, `com.au`… */
const partiesDuDomaine = (hote: string) => (/\.(co|com|org|net|gouv|ac)\.[a-z]{2}$/.test(hote) ? 3 : 2);
/** Un nom sans sous-domaine (`marie.fr`) : chez la plupart des registrars, il ne prend pas de CNAME. */
export const estRacine = (hote: string) => hote.split('.').length <= partiesDuDomaine(hote);
/** Ce qu'on tape dans la colonne « nom » de son registrar : `liens` pour `liens.marie.fr`, `@` pour un domaine racine. */
export const nomChezLeRegistrar = (hote: string) => hote.split('.').slice(0, -partiesDuDomaine(hote)).join('.') || '@';
