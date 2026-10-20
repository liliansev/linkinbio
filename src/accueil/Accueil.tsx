import { Barre, Ouverture } from './Ouverture.tsx';
import { Autour, DansApp, Stats, Vivante } from './Fonctions.tsx';
import { Themes } from './Themes.tsx';
import { Arrivee, Toucher } from './Prise.tsx';
import { DernierAppel, Pied, Prix, Questions } from './Fin.tsx';
import type { ApiAccueil } from './Reserver.tsx';
import { useEntrees } from './mouvement.ts';

/*
 * L'accueil de hopla.page (20 octobre 2026, d'après les wireframes validés par
 * Lilian) : noir et blanc, la seule couleur est celle des pages elles-mêmes ;
 * chaque mouvement se joue une fois, et « moins de mouvement » montre l'état
 * final. On y réserve son nom : Hopla ouvre les pages sur invitation.
 */
export function Accueil({ api }: { api: ApiAccueil }) {
  useEntrees();
  return (
    <div className="hl">
      <a href="#contenu" className="hl-evitement">Aller au contenu</a>
      <Barre />
      <main id="contenu">
        <Ouverture api={api} />
        <DansApp />
        <Vivante />
        <Autour />
        <Stats />
        <Themes />
        <Arrivee />
        <Toucher />
        <Prix />
        <Questions />
        <DernierAppel api={api} />
      </main>
      <Pied />
    </div>
  );
}
