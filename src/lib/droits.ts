import type { Fonction } from './abonnement.ts';
import { SANS_COULEURS } from './types.ts';
import type { Bloc, Reglages } from './types.ts';

/** Ce qu'un compte peut faire de sa page, fonction par fonction (voir `FONCTIONS` dans abonnement.ts). */
export type Droits = Record<Fonction, boolean>;

/**
 * La page telle que son offre permet de la montrer. Une fonction qui n'est pas
 * (ou plus) comprise s'efface sans rien casser : la page reprend les couleurs
 * de son thème, un bloc réglé selon l'heure redevient un bloc de tous les
 * jours, un compte à rebours se tait (le bloc attend sa date sans rien montrer),
 * et ce qui ne peut pas s'afficher autrement disparaît (un drop, dont l'adresse
 * doit rester cachée ; un formulaire de liste ; un avis). La page selon le réseau
 * du visiteur reste à tous. Les dates d'un bloc tiennent toujours : un lien
 * programmé ne se montre jamais avant son heure. Rien n'est effacé de la base :
 * reprendre l'offre remet tout comme avant.
 */
export function selonDroits<T extends Bloc>(reglages: Reglages, blocs: T[], d: Droits): { reglages: Reglages; blocs: T[] } {
  return {
    reglages: d.couleurs ? reglages : { ...reglages, couleurs: SANS_COULEURS },
    blocs: blocs.flatMap(b => {
      if ((!d.drops && b.acces) || (!d.listeEmail && b.type === 'inscription') || (!d.avis && b.type === 'preuve')) return [];
      let bloc = b;
      if (!d.heure && bloc.creneau) bloc = { ...bloc, creneau: null };
      if (!d.programmation && bloc.compteARebours) bloc = { ...bloc, compteARebours: false };
      return [bloc];
    }),
  };
}

type Dates = Pick<Bloc, 'debut' | 'fin' | 'compteARebours'>;

/**
 * Le bloc reçoit-il des dates qu'il n'avait pas : un début, une fin, ou un
 * compte à rebours avant son début ? Sans `programmation` (Starter), on peut
 * retirer ses dates, pas en poser : une page qui a quitté son offre garde
 * celles qu'elle avait.
 */
export const nouvellesDates = (avant: Dates | undefined, bloc: Dates) =>
  (!!bloc.debut && bloc.debut !== avant?.debut) || (!!bloc.fin && bloc.fin !== avant?.fin) || (!!bloc.debut && bloc.compteARebours && !avant?.compteARebours);

/** Le refus du serveur, que le back office reconnaît pour proposer les offres. */
export const REFUS_PROGRAMMATION = 'Programmer un bloc à l’avance demande Hopla Starter.';
