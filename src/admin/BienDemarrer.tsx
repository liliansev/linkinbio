import { useState, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import type { Bloc, ComptePage, Reglages } from '../lib/types.ts';
import { urlPage } from '../lib/types.ts';
import { etapesDemarrage } from '../lib/demarrage.ts';
import type { Destination, Etape } from '../lib/demarrage.ts';
import { Icone } from '../components/Icone.tsx';
import { BoutonCopier, Feuille, classeBouton, copierTexte, vibrer } from './ui.tsx';

/*
 * « Bien démarrer » : l'adresse de la page, à copier ou partager en un geste,
 * et, tant que la page n'est pas prête, les étapes qui restent. Sur
 * ordinateur, en tête de Ma page ; sur téléphone, un anneau dans l'en-tête
 * ouvre la liste dans une feuille, pour que la page commence juste sous
 * l'en-tête. Ce que le navigateur retient ici (page partagée, liste masquée,
 * thèmes vus) n'est qu'un confort.
 */

const CLE_PARTAGE = 'hopla-page-partagee';
const CLE_MASQUE = 'hopla-demarrage-masque';
const CLE_THEME = 'hopla-themes-vus';
const CHANGE = 'hopla-demarrage';
const lire = (cle: string) => { try { return localStorage.getItem(cle) === '1'; } catch { return false; } };
const noter = (cle: string) => { try { localStorage.setItem(cle, '1'); } catch { /* stockage refusé */ } dispatchEvent(new Event(CHANGE)); };
/** L'adresse a été copiée ou partagée : « Partage ta page » se coche partout où la liste s'affiche. */
export const noterPartage = () => noter(CLE_PARTAGE);

// L'en-tête et le haut de la page lisent les mêmes marques : une étape cochée ici l'est aussi là. Le serveur n'en sait rien.
const EVENEMENTS = [CHANGE, CLE_THEME, 'storage'];
const ecouter = (f: () => void) => { for (const e of EVENEMENTS) addEventListener(e, f); return () => { for (const e of EVENEMENTS) removeEventListener(e, f); }; };
const marques = () => [CLE_PARTAGE, CLE_MASQUE, CLE_THEME].map(c => (lire(c) ? '1' : '0')).join('');

/** Les étapes et leur compte ; `actif` tant que la page n'est pas prête et que la liste n'a pas été masquée. */
export function useDemarrage(reglages: Reglages, blocs: Bloc[]) {
  const m = useSyncExternalStore(ecouter, marques, () => '000');
  const etapes = etapesDemarrage(reglages, blocs, m[0] === '1', m[2] === '1');
  const faites = etapes.filter(e => e.faite).length;
  return { etapes, faites, actif: m[1] !== '1' && faites < etapes.length };
}

/** L'anneau de progression : un trait d'encre sur un trait pâle, sans couleur. */
function Anneau({ faites, total, taille, epaisseur }: { faites: number; total: number; taille: number; epaisseur: number }) {
  const trait = (epaisseur * 24) / taille, r = 12 - trait / 2 - 0.25, tour = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 24 24" width={taille} height={taille} className="-rotate-90" aria-hidden="true">
      <circle cx="12" cy="12" r={r} fill="none" stroke="rgb(0 0 0 / 0.1)" strokeWidth={trait} />
      <circle cx="12" cy="12" r={r} fill="none" stroke="#0a0a0a" strokeWidth={trait} strokeLinecap="round" strokeDasharray={`${(faites / total) * tour} ${tour}`} />
    </svg>
  );
}

/** Au téléphone, dans l'en-tête, à la place de la photo : l'anneau et son compte, qui ouvrent la liste. */
export function AnneauDemarrage({ faites, total, onClick, className = '' }: { faites: number; total: number; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={() => { vibrer(5); onClick(); }} aria-haspopup="dialog" aria-label={`Bien démarrer, ${faites} sur ${total}`}
      className={`relative -m-1 grid h-11 w-11 shrink-0 place-items-center rounded-full transition active:scale-95 ${className}`}>
      <Anneau faites={faites} total={total} taille={36} epaisseur={2.5} />
      <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-[11.5px] font-semibold tracking-[-0.02em] text-white tabular-nums">{faites}/{total}</span>
    </button>
  );
}

/** Les étapes qui restent, chacune menant à l'endroit de la page où elle se fait. */
function ListeEtapes({ etapes, choisir, feuille = false }: { etapes: Etape[]; choisir: (e: Etape) => void; feuille?: boolean }) {
  return (
    <ol className={feuille ? 'adm-cascade -mx-2 flex flex-col' : 'flex flex-col px-2 pb-2'}>
      {etapes.filter(e => !e.faite).map((e, i) => (
        <li key={e.id} style={{ '--i': i } as CSSProperties}>
          <button type="button" onClick={() => choisir(e)}
            className={`group flex w-full items-center gap-3 rounded-xl text-left transition hover:bg-white/[0.05] active:scale-[0.99] ${feuille ? 'min-h-12 px-2 py-1' : 'min-h-11 px-1.5 py-1.5'}`}>
            <span className="h-5 w-5 shrink-0 rounded-full border-[1.5px] border-white/25 transition group-hover:border-white/30" />
            <span className={`min-w-0 flex-1 font-medium text-white ${feuille ? 'text-[14.5px]' : 'text-[14px]'}`}>{e.nom}</span>
            <Icone nom="ui-chevron" taille={16} className="-rotate-90 text-white/30 group-hover:text-white/60" />
          </button>
        </li>
      ))}
    </ol>
  );
}

/**
 * Le haut de Ma page sur ordinateur (l'adresse, puis la liste repliée sur une
 * ligne) et, au téléphone, la feuille que l'anneau de l'en-tête ouvre.
 */
export function HautLiens({ compte, reglages, blocs, aller, annoncer, feuille, fermerFeuille }: {
  compte: ComptePage; reglages: Reglages; blocs: Bloc[]; aller: (d: Destination) => void; annoncer?: (t: { texte: string }) => void;
  /** La liste ouverte depuis l'en-tête du téléphone. */
  feuille: boolean; fermerFeuille: () => void;
}) {
  const adresse = urlPage(compte);
  const courte = adresse.replace(/^https?:\/\//, '');
  const { etapes, faites, actif } = useDemarrage(reglages, blocs);
  const [ouvert, setOuvert] = useState(false);
  const peutPartager = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  async function copier() {
    if (await copierTexte(adresse)) { vibrer(8); noterPartage(); annoncer?.({ texte: 'Adresse copiée : colle-la dans ta bio' }); }
  }
  async function partager() {
    try { await navigator.share({ title: reglages.profil.nom || 'Ma page', url: adresse }); noterPartage(); } catch { /* partage annulé */ }
  }
  function faire(e: Etape) {
    if (e.id === 'theme') noter(CLE_THEME);
    if (e.id === 'partage') { if (peutPartager) partager(); else copier(); } else aller(e.id);
  }

  return (
    <>
      {/* Sur téléphone, l'adresse, Copier et l'anneau sont dans l'en-tête : rien ne passe ici avant la page. */}
      <div className="hidden flex-col gap-3 lg:flex">
        <div className="adm-address flex items-center gap-2 p-1 pl-4">
          <a href={adresse} target="_blank" rel="noopener" title="Ouvrir ma page" className="min-w-0 flex-1 truncate text-[14px] font-medium text-white underline-offset-4 hover:underline" translate="no">{courte}</a>
          <BoutonCopier texte={adresse} onCopie={noterPartage} label="Copier l’adresse de ta page" />
          {peutPartager && (
            <button type="button" onClick={partager} aria-label="Partager ta page"
              className="adm-button-primary grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-nuit transition active:scale-95"><Icone nom="partage" taille={19} /></button>
          )}
        </div>

        {/* Une seule ligne tant qu'on ne l'ouvre pas : la page qu'on modifie reste dans le premier écran. */}
        {actif && (
          <section className="adm-checklist adm-cascade" aria-label="Bien démarrer">
            <div className="flex items-center">
              {/* Le titre porte le bouton, pas l'inverse : un lecteur d'écran trouve « Bien démarrer » parmi les titres. */}
              <h2 className="flex min-w-0 flex-1">
                <button type="button" onClick={() => setOuvert(o => !o)} aria-expanded={ouvert}
                  className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl pl-3.5 text-left">
                  <Anneau faites={faites} total={etapes.length} taille={24} epaisseur={2.5} />
                  <span className="min-w-0 flex-1 text-[14px] font-medium text-white">Bien démarrer</span>
                  <span className="shrink-0 text-[13px] text-white/55">{faites} sur {etapes.length}</span>
                  <Icone nom="ui-chevron" taille={16} className={`shrink-0 text-white/55 transition ${ouvert ? 'rotate-180' : ''}`} />
                </button>
              </h2>
              <button type="button" onClick={() => noter(CLE_MASQUE)} aria-label="Masquer ces étapes"
                className={classeBouton.icone}><Icone nom="ui-fermer" taille={18} /></button>
            </div>
            {ouvert && <ListeEtapes etapes={etapes} choisir={faire} />}
          </section>
        )}
      </div>

      <Feuille ouverte={feuille && actif} onFermer={fermerFeuille} titre="Bien démarrer">
        {fermer => (
          <>
            {/* La photo et le partage ouvrent une fenêtre du téléphone : ils partent dans le geste même, la feuille se range ensuite. */}
            <ListeEtapes feuille etapes={etapes} choisir={e => { if (e.id === 'photo' || e.id === 'partage') { faire(e); fermer(); } else fermer(() => { fermerFeuille(); faire(e); }); }} />
            <button type="button" onClick={() => fermer(() => { fermerFeuille(); noter(CLE_MASQUE); })} className={`${classeBouton.discret} -ml-3 mt-2`}>Masquer ces étapes</button>
          </>
        )}
      </Feuille>
    </>
  );
}
