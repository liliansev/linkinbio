import { createHash, timingSafeEqual } from 'node:crypto';
import { MINUTE, cleIp, limiteur } from './limites.ts';
import { PRINCIPAL } from '../lib/types.ts';
import { composerMoment } from '../lib/moments.ts';
import { normaliserCode } from '../lib/acces.ts';
import * as db from './db.ts';
import { droits } from './droits.ts';

/*
 * `/api/acces` : le lien d'un drop, rendu à qui tape le bon code et tant
 * qu'il reste des places. Une place par visiteur : une empreinte du bloc, de
 * l'IP et du navigateur, propre à ce bloc (on ne peut pas suivre quelqu'un d'un
 * drop à l'autre). Le même visiteur qui revient retrouve son lien sans
 * reprendre de place.
 */

/** Au plus 10 essais par 10 minutes et par adresse IP, un /64 en IPv6 : un code ne se devine pas à la chaîne. */
const essais = limiteur([10, 10 * MINUTE]);
const tropDEssais = (ip: string, maintenant: number) => essais(cleIp(ip), maintenant);

const empreinte = (texte: string) => createHash('sha256').update(texte).digest();
const memeCode = (a: string, b: string) => timingSafeEqual(empreinte(normaliserCode(a)), empreinte(normaliserCode(b)));

export interface Deblocage { status: number; message: string; url?: string; restantes?: number | null }

export function debloquer(entree: Record<string, unknown>, contexte: { ip: string; ua: string }, maintenant = Date.now()): Deblocage {
  const page = typeof entree.page === 'string' ? entree.page : '';
  const compte = page ? db.compteParPseudo(page) : db.compteParId(PRINCIPAL);
  if (!compte || compte.statut !== 'actif') return { status: 404, message: 'Cette page n’existe plus.' };
  // Un drop n'existe que dans l'offre qui le comprend (la page publique ne le montre pas sans elle).
  if (!droits(compte, process.env, maintenant).drops) return { status: 404, message: 'Ce lien n’est plus disponible.' };
  // Le bloc tel que la page le montre à cet instant : un drop pas encore ouvert, ou fini, ne se débloque pas.
  const bloc = composerMoment(db.lireBlocs(compte.id), maintenant).find(b => b.id === entree.bloc && b.type === 'lien' && b.acces && b.url);
  if (!bloc?.acces) return { status: 404, message: 'Ce lien n’est plus disponible.' };
  if (tropDEssais(contexte.ip || 'inconnu', maintenant)) return { status: 429, message: 'Trop d’essais. Réessaie dans quelques minutes.' };
  const { code, places } = bloc.acces;
  if (code && !memeCode(typeof entree.code === 'string' ? entree.code.slice(0, 80) : '', code)) return { status: 403, message: 'Ce n’est pas le bon code.' };
  const visiteur = createHash('sha256').update(`${db.secret()}|acces|${bloc.id}|${contexte.ip}|${contexte.ua}`).digest('base64url').slice(0, 22);
  const prise = db.prendrePlace(compte.id, bloc.id, visiteur, places, maintenant);
  if (prise === 'complet') return { status: 410, message: 'C’est complet.', restantes: 0 };
  const restantes = places ? Math.max(0, places - (db.placesParBloc(compte.id)[bloc.id] ?? 0)) : null;
  return { status: 200, message: prise === 'deja' ? 'Ta place est gardée.' : 'C’est débloqué.', url: bloc.url, restantes };
}
