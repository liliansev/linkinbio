import type { Fonction } from './abonnement.ts';
import { BLOCS_GRATUITS, GALERIE_GRATUITE, SANS_COULEURS, TYPES_VITRINE, compteDansLaLimite } from './types.ts';
import type { Bloc, Reglages } from './types.ts';

/** Ce qu'un compte peut faire de sa page, fonction par fonction (voir `FONCTIONS` dans abonnement.ts). */
export type Droits = Record<Fonction, boolean>;

/**
 * La page telle que son offre permet de la montrer. Une fonction qui n'est pas
 * (ou plus) comprise s'efface sans rien casser : la page reprend les couleurs
 * de son thème (et sa police, son fond, sa photo ronde), une collection en grille repasse en liste, un bloc réglé selon l'heure redevient un bloc de tous les
 * jours, un compte à rebours se tait (le bloc attend sa date sans rien montrer),
 * et ce qui ne peut pas s'afficher autrement disparaît (un drop, dont l'adresse
 * doit rester cachée ; un formulaire de liste ou de contact ; un avis ; un bloc de la vitrine). Une galerie ne montre
 * que ses trois premières photos, un bloc selon le pays se montre partout, une liste e-mail n'offre plus de cadeau, et
 * les derniers articles d'un flux RSS s'en vont. Les liens perdent leurs UTM, et la page ne renvoie plus ailleurs.
 * Sans `blocs`, la page ne montre que ses cinq premiers blocs (`BLOCS_GRATUITS`, titres et textes à part).
 * Un lien partenaire garde sa mention « Publicité », que la loi demande à tous,
 * et perd son code promo. La page selon le réseau du visiteur reste à tous.
 * Les dates d'un bloc tiennent toujours : un lien
 * programmé ne se montre jamais avant son heure. Rien n'est effacé de la base :
 * reprendre l'offre remet tout comme avant.
 */
export function selonDroits<T extends Bloc>(reglages: Reglages, blocs: T[], d: Droits): { reglages: Reglages; blocs: T[] } {
  let places = d.blocs ? Number.POSITIVE_INFINITY : BLOCS_GRATUITS;
  return {
    // Une page qui a tout garde ses réglages tels quels.
    reglages: d.couleurs && d.utm && d.redirection && d.fond && d.grandePhoto ? reglages : {
      ...reglages,
      ...(d.couleurs ? {} : { couleurs: SANS_COULEURS, police: '' as const }),
      ...(d.fond ? {} : { imageFond: '' }),
      ...(d.grandePhoto ? {} : { profil: { ...reglages.profil, photo: 'ronde' as const } }),
      ...(d.utm ? {} : { utm: false }),
      ...(d.redirection ? {} : { redirection: { url: '', fin: '' } }),
    },
    blocs: blocs.flatMap(b => {
      if ((!d.drops && b.acces) || (!d.listeEmail && b.type === 'inscription') || (!d.avis && b.type === 'preuve') || (!d.vitrine && TYPES_VITRINE.includes(b.type))
        || (!d.formulaire && b.type === 'formulaire') || (!d.flux && b.type === 'flux')) return [];
      if (compteDansLaLimite(b) && places-- <= 0) return [];
      let bloc = b;
      if (!d.heure && bloc.creneau) bloc = { ...bloc, creneau: null };
      if (!d.programmation && bloc.compteARebours) bloc = { ...bloc, compteARebours: false };
      if (!d.vitrine && bloc.partenariat?.code) bloc = { ...bloc, partenariat: { ...bloc.partenariat, code: '' } };
      if (!d.galerie && bloc.images.length > GALERIE_GRATUITE) bloc = { ...bloc, images: bloc.images.slice(0, GALERIE_GRATUITE) };
      if (!d.grille && bloc.disposition === 'grille') bloc = { ...bloc, disposition: 'liste' };
      if (!d.pays && bloc.pays) bloc = { ...bloc, pays: null };
      if (!d.cadeau && bloc.cadeau) bloc = { ...bloc, cadeau: null };
      return [bloc];
    }),
  };
}

/*
 * Le design s'essaie avant de payer (24 octobre 2026, proposé après les parcours joués, choisi par Lilian) : sans
 * Starter, couleurs, police, image de fond et grande photo se règlent quand même ; le back office les montre, la page
 * publique non (`selonDroits`), et Ma page le dit, avec le chemin vers Starter ou le retour au thème.
 */
export const avecEssai = (d: Droits): Droits => ({ ...d, couleurs: true, fond: true, grandePhoto: true });

/** Ce qui est à l'essai sur cette page : réglé, et pas compris dans l'offre. */
export function enEssai(r: Reglages, d: Droits): Fonction[] {
  const essais: [boolean, Fonction][] = [
    [!d.couleurs && (Object.values(r.couleurs).some(Boolean) || !!r.police), 'couleurs'],
    [!d.fond && !!r.imageFond, 'fond'],
    [!d.grandePhoto && r.profil.photo === 'grande', 'grandePhoto'],
  ];
  return essais.flatMap(([oui, f]) => (oui ? [f] : []));
}

/** Le design rendu à ce que l'offre comprend : l'essai retiré, le reste tel quel. */
export function sansEssai(r: Reglages, d: Droits): Reglages {
  return {
    ...r,
    ...(d.couleurs ? {} : { couleurs: SANS_COULEURS, police: '' as const }),
    ...(d.fond ? {} : { imageFond: '' }),
    ...(d.grandePhoto ? {} : { profil: { ...r.profil, photo: 'ronde' as const } }),
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

/** Les blocs visibles que la page ne montre pas faute de Starter : ceux qui passent les cinq premiers, par leur id. */
export function horsLimite(reglages: Reglages, blocs: Bloc[], d: Droits): ReadonlySet<string> {
  if (d.blocs) return new Set();
  const montres = new Set(selonDroits(reglages, blocs, d).blocs.map(b => b.id));
  return new Set(selonDroits(reglages, blocs, { ...d, blocs: true }).blocs.filter(b => compteDansLaLimite(b) && !montres.has(b.id)).map(b => b.id));
}

/** Le refus du serveur, que le back office reconnaît pour proposer les offres. */
export const REFUS_PROGRAMMATION = 'Programmer un bloc à l’avance demande Hopla Starter.';
