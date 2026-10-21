import { GalerieProfils } from './Profils.tsx';
import { Barre, Ouverture, Selon } from './Ouverture.tsx';
import { DansApp, Stats, Vivante } from './Fonctions.tsx';
import { Themes } from './Themes.tsx';
import { Prise } from './Prise.tsx';
import { DernierAppel, Pied, Prix, Questions } from './Fin.tsx';
import type { ApiAccueil } from './Reserver.tsx';
import { useEntrees } from './mouvement.ts';
import { ModeInscription } from './textes.ts';
import type { Inscription } from './textes.ts';

/*
 * L'accueil de hopla.page (20 octobre 2026, d'après les wireframes validés par
 * Lilian) : un papier blanc, et des sections posées sur les couleurs des
 * thèmes Hopla (le bleu Klein de l'ouverture, la nuit, la pêche, la menthe,
 * le lilas, le rose du Couchant) ; chaque mouvement se joue une fois, et
 * « moins de mouvement » montre l'état final. On y prend son nom : la page se crée tout de suite, ou le nom se
 * réserve quand Hopla ouvre sur invitation (`mode`, voir `server/attente.ts`).
 */
export function Accueil({ api, mode = 'libre' }: { api: ApiAccueil; mode?: Inscription }) {
  useEntrees();
  return (
    <ModeInscription.Provider value={mode}>
    <div className="hl hl-humain">
      <a href="#contenu" className="hl-evitement">Aller au contenu</a>
      <Barre />
      <main id="contenu">
        <Ouverture api={api} />
        <GalerieProfils />
        <Selon />
        <DansApp />
        <Vivante />
        <Stats />
        <Themes />
        <Prise />
        <Prix />
        <Questions />
        <DernierAppel api={api} />
      </main>
      <Pied />
    </div>
    </ModeInscription.Provider>
  );
}
