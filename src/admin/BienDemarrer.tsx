import { useState } from 'react';
import type { Bloc, ComptePage, Reglages } from '../lib/types.ts';
import { urlPage } from '../lib/types.ts';
import { etapesDemarrage } from '../lib/demarrage.ts';
import type { Destination } from '../lib/demarrage.ts';
import { Icone } from '../components/Icone.tsx';
import { BoutonCopier, vibrer } from './ui.tsx';

/*
 * Le haut de l'onglet Liens : l'adresse de la page, à copier ou partager en un
 * geste, et, tant que la page n'est pas prête, les étapes qui restent. Ce que
 * le navigateur retient ici (page partagée, liste masquée) n'est qu'un confort.
 */

const CLE_PARTAGE = 'hopla-page-partagee';
const CLE_MASQUE = 'hopla-demarrage-masque';
const CLE_THEME = 'hopla-themes-vus';
const lire = (cle: string) => { try { return localStorage.getItem(cle) === '1'; } catch { return false; } };
const noter = (cle: string) => { try { localStorage.setItem(cle, '1'); } catch { /* stockage refusé */ } };

export function HautLiens({ compte, reglages, blocs, aller }: { compte: ComptePage; reglages: Reglages; blocs: Bloc[]; aller: (d: Destination) => void }) {
  const adresse = urlPage(compte);
  const courte = adresse.replace(/^https?:\/\//, '');
  const [partagee, setPartagee] = useState(() => lire(CLE_PARTAGE));
  const [masque, setMasque] = useState(() => lire(CLE_MASQUE));
  const [themeVu, setThemeVu] = useState(() => lire(CLE_THEME));
  const [ouvert, setOuvert] = useState(false);
  const etapes = etapesDemarrage(reglages, blocs, partagee, themeVu);
  const faites = etapes.filter(e => e.faite).length;
  const peutPartager = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  function marquerPartagee() { noter(CLE_PARTAGE); setPartagee(true); }
  async function copier() {
    try { await navigator.clipboard.writeText(adresse); vibrer(8); marquerPartagee(); } catch { /* presse-papiers refusé */ }
  }
  async function partager() {
    try { await navigator.share({ title: reglages.profil.nom || 'Ma page', url: adresse }); marquerPartagee(); } catch { /* partage annulé */ }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Sur téléphone, l'adresse et Copier sont dans l'en-tête ; ici, seulement sur ordinateur. */}
      <div className="hidden items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1 pl-3 lg:flex">
        <span className="relative flex h-2 w-2 shrink-0" title="En ligne">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60 motion-reduce:hidden" />
          <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-white" translate="no">{courte}</span>
        <BoutonCopier texte={adresse} onCopie={marquerPartagee} label="Copier l’adresse de ta page" />
        {peutPartager && (
          <button type="button" onClick={partager} aria-label="Partager ta page"
            className="grid h-11 w-11 place-items-center rounded-full bg-white text-nuit transition active:scale-95"><Icone nom="partage" taille={19} /></button>
        )}
      </div>

      {/* Une seule ligne tant qu'on ne l'ouvre pas : la page qu'on modifie reste dans le premier écran du téléphone. */}
      {!masque && faites < etapes.length && (
        <section className="adm-cascade rounded-xl border border-white/[0.07] bg-white/[0.03]" aria-label="Bien démarrer">
          <div className="flex items-center">
            <button type="button" onClick={() => setOuvert(o => !o)} aria-expanded={ouvert}
              className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl pl-3.5 text-left">
              <span className="relative grid h-6 w-6 shrink-0 place-items-center">
                <svg viewBox="0 0 24 24" className="absolute inset-0 -rotate-90" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="2.5" />
                  <circle cx="12" cy="12" r="10" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"
                    strokeDasharray={`${(faites / etapes.length) * 62.8} 62.8`} />
                </svg>
              </span>
              <h2 className="min-w-0 flex-1 text-[14px] font-medium text-white">Bien démarrer</h2>
              <span className="shrink-0 text-[13px] text-white/55">{faites} sur {etapes.length}</span>
              <Icone nom="ui-chevron" taille={16} className={`shrink-0 text-white/55 transition ${ouvert ? 'rotate-180' : ''}`} />
            </button>
            <button type="button" onClick={() => { noter(CLE_MASQUE); setMasque(true); }} aria-label="Masquer ces étapes"
              className="grid h-12 w-11 shrink-0 place-items-center rounded-full text-white/55 hover:text-white"><Icone nom="ui-fermer" taille={18} /></button>
          </div>
          {ouvert && (
            <ol className="flex flex-col px-2 pb-2">
              {etapes.filter(e => !e.faite).map(e => (
                <li key={e.id}>
                  <button type="button" onClick={() => { if (e.id === 'theme') { noter(CLE_THEME); setThemeVu(true); } if (e.id === 'partage') { if (peutPartager) partager(); else copier(); } else aller(e.id); }}
                    className="group flex min-h-11 w-full items-center gap-3 rounded-xl px-1.5 py-1.5 text-left transition hover:bg-white/[0.05] active:scale-[0.99]">
                    <span className="h-5 w-5 shrink-0 rounded-full border-[1.5px] border-white/25 transition group-hover:border-white/30" />
                    <span className="min-w-0 flex-1 text-[14px] font-medium text-white">{e.nom}</span>
                    <Icone nom="ui-chevron" taille={16} className="-rotate-90 text-white/30 group-hover:text-white/60" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
