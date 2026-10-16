import { useEffect, useState } from 'react';
import type { Stats } from '../lib/types.ts';
import { Carte, Segments } from './ui.tsx';
import { Icone } from '../components/Icone.tsx';

const PERIODES = [{ id: '7', nom: '7 j' }, { id: '30', nom: '30 j' }, { id: '90', nom: '90 j' }, { id: '365', nom: '1 an' }];
const nombre = (n: number) => n.toLocaleString('fr-FR');

function Tendance({ actuel, avant }: { actuel: number; avant: number }) {
  if (!avant) return actuel ? <span className="text-[12px] text-white/40">nouveau</span> : null;
  const ecart = Math.round(((actuel - avant) / avant) * 100);
  if (ecart === 0) return <span className="text-[12px] text-white/40">stable</span>;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[12px] font-semibold tabular-nums ${ecart > 0 ? 'text-emerald-300' : 'text-red-300'}`}>
      <Icone nom={ecart > 0 ? 'ui-fleche' : 'ui-baisse'} taille={13} />{Math.abs(ecart)} %
    </span>
  );
}

function Kpi({ nom, valeur, avant, suffixe = '' }: { nom: string; valeur: number; avant?: number; suffixe?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3.5">
      <p className="text-[12.5px] text-white/55">{nom}</p>
      <p className="mt-1 text-[24px] font-semibold tracking-tight text-white tabular-nums">{nombre(valeur)}{suffixe}</p>
      {avant !== undefined && <Tendance actuel={valeur} avant={avant} />}
    </div>
  );
}

/** Les vues en aire, les clics en ligne, jour par jour. */
function Courbe({ serie }: { serie: Stats['serie'] }) {
  const [survol, setSurvol] = useState<number | null>(null);
  const w = 600, h = 180, pad = 6;
  const max = Math.max(4, ...serie.map(s => Math.max(s.vues, s.clics)));
  const x = (i: number) => pad + (i * (w - 2 * pad)) / Math.max(1, serie.length - 1);
  const y = (v: number) => h - pad - (v / max) * (h - 2 * pad);
  const ligne = (cle: 'vues' | 'clics') => serie.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s[cle]).toFixed(1)}`).join(' ');
  const aire = `${ligne('vues')} L${x(serie.length - 1)},${h - pad} L${x(0)},${h - pad} Z`;
  const point = survol !== null ? serie[survol] : null;
  const date = (jour: string) => new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[12.5px]">
        <span className="flex gap-3 text-white/60">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-peche" />Vues</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-300" />Clics</span>
        </span>
        <span className="text-white/70 tabular-nums">{point ? `${date(point.jour)} · ${point.vues} vues · ${point.clics} clics` : ''}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full touch-none" preserveAspectRatio="none" role="img" aria-label="Vues et clics par jour"
        onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); setSurvol(Math.round(((e.clientX - r.left) / r.width) * (serie.length - 1))); }}
        onPointerLeave={() => setSurvol(null)}>
        <defs><linearGradient id="adm-aire" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ffb38a" stopOpacity="0.35" /><stop offset="1" stopColor="#ffb38a" stopOpacity="0" /></linearGradient></defs>
        {[0.25, 0.5, 0.75].map(f => <line key={f} x1={0} x2={w} y1={h * f} y2={h * f} stroke="white" strokeOpacity="0.06" vectorEffect="non-scaling-stroke" />)}
        <path d={aire} fill="url(#adm-aire)" />
        <path d={ligne('vues')} fill="none" stroke="#ffb38a" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        <path d={ligne('clics')} fill="none" stroke="#7dd3fc" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {survol !== null && <line x1={x(survol)} x2={x(survol)} y1={0} y2={h} stroke="white" strokeOpacity="0.3" vectorEffect="non-scaling-stroke" />}
      </svg>
      <div className="mt-1 flex justify-between text-[11.5px] text-white/40"><span>{date(serie[0].jour)}</span><span>{date(serie[serie.length - 1].jour)}</span></div>
    </div>
  );
}

function Barres({ lignes, total, unite }: { lignes: { nom: string; valeur: number }[]; total: number; unite: string }) {
  if (!lignes.length) return <p className="py-3 text-[14px] text-white/45">Pas encore de données.</p>;
  const max = Math.max(...lignes.map(l => l.valeur));
  return (
    <ul className="flex flex-col gap-2">
      {lignes.map(l => (
        <li key={l.nom} className="relative overflow-hidden rounded-xl bg-white/[0.035] px-3 py-2.5">
          <span className="adm-barre absolute inset-y-0 left-0 origin-left bg-peche/15" style={{ width: `${(l.valeur / max) * 100}%` }} />
          <span className="relative flex items-center justify-between gap-3 text-[14px]">
            <span className="truncate text-white">{l.nom}</span>
            <span className="shrink-0 tabular-nums text-white/70">{nombre(l.valeur)} {unite}{total ? <span className="ml-1.5 text-white/40">{Math.round((l.valeur / total) * 100)} %</span> : null}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function OngletStats({ charger }: { charger: (jours: number) => Promise<Stats> }) {
  const [jours, setJours] = useState('30');
  const [stats, setStats] = useState<Stats | null>(null);
  const [erreur, setErreur] = useState(false);
  useEffect(() => {
    let annule = false;
    setErreur(false);
    charger(Number(jours)).then(s => { if (!annule) setStats(s); }).catch(() => { if (!annule) setErreur(true); });
    return () => { annule = true; };
  }, [jours, charger]);

  return (
    <div className="flex flex-col gap-4">
      <Segments label="Période" valeur={jours} options={PERIODES} onChange={setJours} />
      {erreur && <p className="rounded-xl bg-red-500/15 px-3.5 py-2.5 text-[14px] text-red-200">Les statistiques ne se chargent pas. Réessaie dans un instant.</p>}
      {!stats ? <div className="h-64 animate-pulse rounded-2xl bg-white/[0.04]" /> : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <Kpi nom="Vues" valeur={stats.vues} avant={stats.precedent.vues} />
            <Kpi nom="Visiteurs" valeur={stats.visiteurs} avant={stats.precedent.visiteurs} />
            <Kpi nom="Clics" valeur={stats.clics} avant={stats.precedent.clics} />
            <Kpi nom="Taux de clic" valeur={stats.vues ? Math.round((stats.clics / stats.vues) * 100) : 0} suffixe=" %" />
          </div>
          <Carte><Courbe serie={stats.serie} /></Carte>
          <Carte titre="Liens les plus cliqués"><Barres lignes={stats.blocs.map(b => ({ nom: b.titre, valeur: b.clics }))} total={stats.clics} unite="clics" /></Carte>
          <Carte titre="D’où viennent les visiteurs"><Barres lignes={stats.sources.map(s => ({ nom: s.nom, valeur: s.vues }))} total={stats.vues} unite="vues" /></Carte>
          <Carte titre="Appareils"><Barres lignes={stats.appareils.map(s => ({ nom: s.nom, valeur: s.vues }))} total={stats.vues} unite="vues" /></Carte>
          <p className="px-2 text-center text-[12.5px] leading-snug text-white/40">
            Sans cookie : un visiteur est compté une fois par jour. Tes propres visites, une fois connecté, ne comptent pas.
            Ajoute <span className="text-white/70">?s=instagram</span> à ton lien pour suivre une source précise.
          </p>
        </>
      )}
    </div>
  );
}
