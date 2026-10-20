import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { Fonction } from '../lib/abonnement.ts';
import { FONCTIONS, OFFRES } from '../lib/abonnement.ts';
import type { Droits } from '../lib/droits.ts';
import { classeBadge, classeBouton } from './ui.tsx';

/*
 * Ce que l'offre du compte permet, partout dans le back office. Une fonction
 * réservée se montre quand même, avec le nom de l'offre qui la débloque et un
 * seul geste pour aller la voir : on sait ce qui existe, sans être bloqué.
 */

interface ContexteOffre {
  droits: Droits;
  /** Ouvre Réglages, Abonnement. Absent quand le compte ne peut pas s'abonner (aperçu, compte principal). */
  voirOffres?: () => void;
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

/** Une petite étiquette au nom de l'offre, à côté d'un titre. */
export function Etiquette({ fonction }: { fonction: Fonction }) {
  return <span className={classeBadge}>{offreDe(fonction)}</span>;
}

/**
 * À la place des réglages d'une fonction réservée : une phrase qui nomme l'offre, et le chemin vers les offres.
 * `bouton={false}` quand ce chemin est déjà juste au-dessus : un seul « Voir les offres » par endroit.
 */
export function Reserve({ phrase, bouton = true, children }: { phrase: string; bouton?: boolean; children?: ReactNode }) {
  const voir = useVoirOffres();
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-[13.5px] leading-snug text-white/70">{phrase}</p>
      {voir && bouton && <button type="button" onClick={voir} className={classeBouton.secondaire}>Voir les offres</button>}
      {children}
    </div>
  );
}
