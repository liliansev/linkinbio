import type { Bloc } from './types.ts';
import { NOMS_AUDIENCES } from './provenance.ts';

const noms = (l: (keyof typeof NOMS_AUDIENCES)[]) => l.map(a => NOMS_AUDIENCES[a]).join(', ');

/** Les règles qu'un bloc applique sur la page publique, en mots courts pour le back office. */
export function etiquettes(bloc: Bloc): string[] {
  const l: string[] = [];
  if (bloc.compteARebours && bloc.debut && Date.parse(bloc.debut) > Date.now()) l.push('Compte à rebours');
  if (bloc.creneau) l.push('Selon l’heure');
  const a = bloc.audience;
  if (a?.sources.length) l.push(a.effet === 'avant' ? `En tête sur ${noms(a.sources)}` : `Seulement ${noms(a.sources)}`);
  if (bloc.cache?.length) l.push(`Pas sur ${noms(bloc.cache)}`);
  if (bloc.acces) l.push(bloc.acces.code ? 'Avec un code' : `${bloc.acces.places} places`);
  if (Object.keys(bloc.traductions ?? {}).length) l.push('Traduit');
  return l;
}
