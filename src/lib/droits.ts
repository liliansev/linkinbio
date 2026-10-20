import type { Fonction } from './abonnement.ts';
import type { Bloc, Reglages } from './types.ts';

/** Ce qu'un compte peut faire de sa page, fonction par fonction (voir `FONCTIONS` dans abonnement.ts). */
export type Droits = Record<Fonction, boolean>;

/**
 * La page telle que son offre permet de la montrer. Une fonction qui n'est pas
 * (ou plus) comprise s'efface sans rien casser : un bloc réglé selon le réseau
 * ou l'heure redevient un bloc simple, les langues se taisent, et ce qui ne
 * peut pas s'afficher autrement disparaît (un drop, dont l'adresse doit rester
 * cachée ; un formulaire de liste ; un avis). Rien n'est effacé de la base :
 * reprendre l'offre remet tout comme avant.
 */
export function selonDroits<T extends Bloc>(reglages: Reglages, blocs: T[], d: Droits): { reglages: Reglages; blocs: T[] } {
  return {
    reglages: d.langues ? reglages : { ...reglages, langues: [] },
    blocs: blocs.flatMap(b => {
      if ((!d.drops && b.acces) || (!d.listeEmail && b.type === 'inscription') || (!d.avis && b.type === 'preuve')) return [];
      return d.reseauHeure ? [b] : [{ ...b, audience: null, cache: [], creneau: null }];
    }),
  };
}
