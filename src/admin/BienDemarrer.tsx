import { useState } from 'react';
import type { Bloc, ComptePage, Reglages } from '../lib/types.ts';
import { urlPage } from '../lib/types.ts';
import { etapesDemarrage } from '../lib/demarrage.ts';
import type { Destination } from '../lib/demarrage.ts';
import { Icone } from '../components/Icone.tsx';
import { vibrer } from './ui.tsx';

/*
 * Le haut de l'onglet Liens : l'adresse de la page, à copier ou partager en un
 * geste, et, tant que la page n'est pas prête, les étapes qui restent. Ce que
 * le navigateur retient ici (page partagée, liste masquée) n'est qu'un confort.
 */

const CLE_PARTAGE = 'hopla-page-partagee';
const CLE_MASQUE = 'hopla-demarrage-masque';
const lire = (cle: string) => { try { return localStorage.getItem(cle) === '1'; } catch { return false; } };
const noter = (cle: string) => { try { localStorage.setItem(cle, '1'); } catch { /* stockage refusé */ } };

export function HautLiens({ compte, reglages, blocs, aller }: { compte: ComptePage; reglages: Reglages; blocs: Bloc[]; aller: (d: Destination) => void }) {
  const adresse = urlPage(compte);
  const courte = adresse.replace(/^https?:\/\//, '');
  const [partagee, setPartagee] = useState(() => lire(CLE_PARTAGE));
  const [masque, setMasque] = useState(() => lire(CLE_MASQUE));
  const [copie, setCopie] = useState(false);
  const etapes = etapesDemarrage(reglages, blocs, partagee);
  const faites = etapes.filter(e => e.faite).length;
  const peutPartager = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  function marquerPartagee() { noter(CLE_PARTAGE); setPartagee(true); }
  async function copier() {
    try { await navigator.clipboard.writeText(adresse); vibrer(8); setCopie(true); marquerPartagee(); setTimeout(() => setCopie(false), 1800); } catch { /* presse-papiers refusé */ }
  }
  async function partager() {
    try { await navigator.share({ title: reglages.profil.nom || 'Ma page', url: adresse }); marquerPartagee(); } catch { /* partage annulé */ }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1 pl-3">
        <span className="relative flex h-2 w-2 shrink-0" title="En ligne">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60 motion-reduce:hidden" />
          <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-white" translate="no">{courte}</span>
        <button type="button" onClick={copier} aria-label="Copier l’adresse de ta page"
          className="flex min-h-8 items-center gap-1.5 rounded-full bg-white/[0.07] px-3 text-[13px] font-medium text-white transition active:scale-95">
          <Icone nom={copie ? 'ui-ok' : 'ui-copier'} taille={16} />{copie ? 'Copié' : 'Copier'}
        </button>
        {peutPartager && (
          <button type="button" onClick={partager} aria-label="Partager ta page"
            className="grid h-8 w-8 place-items-center rounded-full bg-white text-nuit transition active:scale-95"><Icone nom="partage" taille={18} /></button>
        )}
      </div>

      {!masque && faites < etapes.length && (
        <section className="adm-cascade rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5" aria-label="Bien démarrer">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-medium text-white">Bien démarrer</h2>
              <p className="text-[12.5px] text-white/45">Encore {etapes.length - faites} {etapes.length - faites > 1 ? 'étapes' : 'étape'} pour une page prête à partager.</p>
            </div>
            <button type="button" onClick={() => { noter(CLE_MASQUE); setMasque(true); }} aria-label="Masquer ces étapes"
              className="-mt-1 -mr-1 grid h-9 w-9 place-items-center rounded-full text-white/45 hover:bg-white/[0.06] hover:text-white"><Icone nom="ui-fermer" taille={18} /></button>
          </div>
          <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar" aria-valuemin={0} aria-valuemax={etapes.length} aria-valuenow={faites}>
            <div className="h-full rounded-full bg-white transition-[width] duration-500" style={{ width: `${(faites / etapes.length) * 100}%` }} />
          </div>
          <ol className="-mx-1.5 flex flex-col">
            {etapes.filter(e => !e.faite).map(e => (
              <li key={e.id}>
                <button type="button" onClick={() => (e.id === 'partage' ? (peutPartager ? partager() : copier()) : aller(e.id))}
                  className="group flex w-full items-center gap-3 rounded-xl px-1.5 py-2 text-left transition hover:bg-white/[0.05] active:scale-[0.99]">
                  <span className="h-5 w-5 shrink-0 rounded-full border-[1.5px] border-white/25 transition group-hover:border-white/30" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium text-white">{e.nom}</span>
                    <span className="block text-[12.5px] leading-snug text-white/45">{e.aide}</span>
                  </span>
                  <Icone nom="ui-chevron" taille={16} className="-rotate-90 text-white/30 group-hover:text-white/60" />
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
