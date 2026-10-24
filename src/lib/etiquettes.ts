import type { Bloc } from './types.ts';
import type { Droits } from './droits.ts';
import type { Audience } from './provenance.ts';
import { deReseau } from './provenance.ts';

/** « venus d'Instagram, de TikTok » : le réglage porte sur d'où vient le visiteur, comme « Selon le réseau » le dit. */
const venus = (l: Audience[]) => `venus ${l.map(deReseau).join(', ')}`;

/**
 * Les règles qu'un bloc applique sur la page publique, en mots courts pour le
 * back office. Avec `droits`, une règle que l'offre ne comprend pas (gardée
 * d'une offre passée, elle reste enregistrée) n'est pas dite : la page ne
 * l'applique pas.
 */
export function etiquettes(bloc: Bloc, droits?: Droits): string[] {
  const l: string[] = [];
  if (bloc.compteARebours && bloc.debut && Date.parse(bloc.debut) > Date.now() && droits?.programmation !== false) l.push('Compte à rebours');
  if (bloc.creneau && droits?.heure !== false) l.push('Selon l’heure');
  const a = bloc.audience;
  if (a?.sources.length) l.push(a.effet === 'avant' ? `En avant ${venus(a.sources)}` : `Seulement ${venus(a.sources)}`);
  if (bloc.cache?.length) l.push(`Sauf ${venus(bloc.cache)}`);
  if (bloc.acces) l.push(bloc.acces.code ? 'Avec un code' : `${bloc.acces.places} places`);
  return l;
}
