import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { Fonction, OffreSuivante } from '../lib/abonnement.ts';
import { FONCTIONS, FONCTIONS_EN_MOTS, OFFRES, PLAN_ESSAI, joursRestants } from '../lib/abonnement.ts';
import type { Droits } from '../lib/droits.ts';
import type { SuiteAchat } from '../lib/achat.ts';
import type { TypeVitrine } from '../lib/types.ts';
import { Icone } from '../components/Icone.tsx';
import { classeBadge, classeBouton } from './ui.tsx';

/*
 * Ce que l'offre du compte permet, partout dans le back office. Une fonction
 * réservée se montre quand même, avec le nom de l'offre qui la débloque et un
 * seul geste pour aller la voir : on sait ce qui existe, sans être bloqué.
 */

interface ContexteOffre {
  droits: Droits;
  /**
   * Ouvre les offres dans une fenêtre, par-dessus l'écran en cours ; `pour` : la fonction réservée d'où l'on vient,
   * dont l'offre passe devant ; `suite` : ce à quoi l'on revient après l'achat (le bloc ouvert, le bloc de la vitrine
   * qu'on voulait). Absent quand le compte ne peut pas s'abonner (aperçu, compte principal).
   */
  voirOffres?: (pour?: Fonction, suite?: SuiteAchat) => void;
}

const TOUT = Object.fromEntries(Object.keys(FONCTIONS).map(f => [f, true])) as Droits;
const Contexte = createContext<ContexteOffre>({ droits: TOUT });
export const FournisseurOffre = Contexte.Provider;

/** Le compte peut-il se servir de cette fonction ? */
export const usePermis = (f: Fonction) => useContext(Contexte).droits[f];
export const useDroits = () => useContext(Contexte).droits;
export const useVoirOffres = () => useContext(Contexte).voirOffres;

/** Le nom de l'offre qui débloque une fonction : « Starter », « Pro ». */
export const offreDe = (f: Fonction) => OFFRES[FONCTIONS[f]].nom;

/** Une petite étiquette au nom de l'offre, à côté d'un titre, dans les couleurs de l'offre (celles de l'accueil). */
export function Etiquette({ fonction }: { fonction: Fonction }) {
  return <span className={classeBadge} data-offre={FONCTIONS[fonction]}>{offreDe(fonction)}</span>;
}

/**
 * À la place des réglages d'une fonction réservée : une phrase qui nomme l'offre, et le chemin vers les offres,
 * ouvertes sur celle qui débloque `fonction`. `bouton={false}` quand ce chemin est déjà juste au-dessus : un seul
 * « Voir les offres » par endroit. `type` : le bloc de la vitrine que l'offre en ferait, retrouvé au retour de l'achat.
 * Le bouton dit pour quoi aux lecteurs d'écran (« Voir les offres, pour ta vitrine »).
 */
export function Reserve({ phrase, fonction, type, bouton = true, children }: { phrase: string; fonction: Fonction; type?: TypeVitrine; bouton?: boolean; children?: ReactNode }) {
  const voir = useVoirOffres();
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-[13.5px] leading-snug text-white/70">{phrase}</p>
      {voir && bouton && (
        <button type="button" onClick={() => voir(fonction, type ? { type } : undefined)} aria-haspopup="dialog" aria-label={`Voir les offres, ${FONCTIONS_EN_MOTS[fonction].pour.toLowerCase()}`} className={classeBouton.secondaire}>Voir les offres</button>
      )}
      {children}
    </div>
  );
}

/**
 * L'offre du dessus, en une ligne (Lilian, 21 octobre 2026) : son nom et ce qu'elle apporte de plus parlant,
 * « Passer en Starter : sans la mention Hopla ». Au bureau en bas de la barre latérale bleue, au-dessus du
 * compte ; au téléphone sous la page, sur une carte du même bleu. Le diamant en citron, l'offre en blanc, et
 * les offres s'ouvrent sur elle. Le calcul (qui la voit, laquelle) est dans `offreSuivante`.
 */
export function AppelOffre({ suivante, onClick, className = '' }: { suivante: OffreSuivante; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-haspopup="dialog" className={`adm-appel ${className}`}>
      <Icone nom="diamant" taille={16} className="adm-appel-picto shrink-0" />
      {/* Les espaces insécables gardent les deux-points avec le nom de l'offre, et le premier mot de l'accroche
          (« ta », « tes », « sans ») avec le suivant, quand la ligne se replie dans la barre latérale. */}
      <span className="min-w-0 flex-1"><strong>Passer en {OFFRES[suivante.plan].nom}</strong>{'\u00a0'}: {suivante.texte.replace(' ', '\u00a0')}</span>
    </button>
  );
}

/**
 * L'essai de Pro, à la place de l'offre du dessus (25 octobre 2026) : les jours qui restent, et les offres pour garder
 * ce que l'essai ouvre. Même place et même forme que `AppelOffre`.
 */
export function AppelEssai({ fin, onClick, className = '' }: { fin: number; onClick: () => void; className?: string }) {
  const jours = joursRestants(fin);
  return (
    <button type="button" onClick={onClick} aria-haspopup="dialog" className={`adm-appel ${className}`}>
      <Icone nom="diamant" taille={16} className="adm-appel-picto shrink-0" />
      <span className="min-w-0 flex-1"><strong>Essai {OFFRES[PLAN_ESSAI].nom}{'\u00a0'}: {jours === 1 ? 'dernier jour' : `encore ${jours}\u00a0jours`}</strong>. Choisir mon offre</span>
    </button>
  );
}
