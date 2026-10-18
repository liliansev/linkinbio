import type { Bloc } from './types.ts';

/** Les règles qu'un bloc applique sur la page publique, en mots courts pour le back office. */
export function etiquettes(bloc: Bloc): string[] {
  const l: string[] = [];
  if (bloc.compteARebours && bloc.debut && Date.parse(bloc.debut) > Date.now()) l.push('Compte à rebours');
  if (bloc.creneau) l.push('Selon l’heure');
  if (bloc.audience) l.push('Selon la provenance');
  return l;
}
