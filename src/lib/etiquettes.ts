import type { Bloc } from './types.ts';
import type { Droits } from './droits.ts';
import type { Audience } from './provenance.ts';
import { deReseau, NOMS_AUDIENCES } from './provenance.ts';
import type { Langue } from './types.ts';

/** « venus d'Instagram, de TikTok » : le réglage porte sur d'où vient le visiteur, comme « Selon le réseau » le dit. */
const venus = (l: Audience[], langue: Langue = 'fr') => langue === 'en'
  ? `from ${l.map(a => a === 'qr' ? 'a QR code' : a === 'email' ? 'an email' : a === 'newsletter' ? 'the newsletter' : NOMS_AUDIENCES[a]).join(', ')}`
  : `venus ${l.map(deReseau).join(', ')}`;

/**
 * Les règles qu'un bloc applique sur la page publique, en mots courts pour le
 * back office. Avec `droits`, une règle que l'offre ne comprend pas (gardée
 * d'une offre passée, elle reste enregistrée) n'est pas dite : la page ne
 * l'applique pas.
 */
export function etiquettes(bloc: Bloc, droits?: Droits, langue: Langue = 'fr'): string[] {
  const en = langue === 'en';
  const l: string[] = [];
  if (compteEnCours(bloc, droits)) l.push(en ? 'Countdown' : 'Compte à rebours');
  if (bloc.creneau && droits?.heure !== false) l.push(en ? 'By time of day' : 'Selon l’heure');
  const a = bloc.audience;
  if (a?.sources.length) l.push(a.effet === 'avant' ? `${en ? 'Featured' : 'En avant'} ${venus(a.sources, langue)}` : `${en ? 'Only' : 'Seulement'} ${venus(a.sources, langue)}`);
  if (bloc.cache?.length) l.push(`${en ? 'Except' : 'Sauf'} ${venus(bloc.cache, langue)}`);
  if (bloc.acces) l.push(bloc.acces.code ? (en ? 'With a code' : 'Avec un code') : `${bloc.acces.places} ${en ? 'spots' : 'places'}`);
  return l;
}

/** Un compte à rebours qui court : la date de début n'est pas passée et l'offre le comprend. */
export function compteEnCours(bloc: Bloc, droits?: Droits): boolean {
  return !!(bloc.compteARebours && bloc.debut && Date.parse(bloc.debut) > Date.now() && droits?.programmation !== false);
}
