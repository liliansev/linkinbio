import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Stats } from '../lib/types.ts';
import { Carte, Segments } from './ui.tsx';
import { Icone } from '../components/Icone.tsx';
import { resumer } from '../lib/resume.ts';

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

/**
 * Une courbe lisse qui passe par chaque point sans jamais les dépasser
 * (interpolation monotone de Fritsch et Carlson) : pas de bosse sous zéro
 * ni de pic inventé entre deux jours.
 */
function lisse(p: [number, number][]): string {
  const n = p.length;
  if (n < 3) return p.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join(' ');
  const d = p.slice(1).map(([a, b], i) => (b - p[i][1]) / (a - p[i][0]));
  const m = p.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], t = a * a + b * b;
    if (t > 9) { const k = 3 / Math.sqrt(t); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  let chemin = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = p[i], [x1, y1] = p[i + 1], h = (x1 - x0) / 3;
    chemin += ` C${(x0 + h).toFixed(1)},${(y0 + m[i] * h).toFixed(1)} ${(x1 - h).toFixed(1)},${(y1 - m[i + 1] * h).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return chemin;
}

/** Les vues en aire, les clics en ligne, jour par jour. */
function Courbe({ serie }: { serie: Stats['serie'] }) {
  const [survol, setSurvol] = useState<number | null>(null);
  const w = 600, h = 180, pad = 6;
  const max = Math.max(4, ...serie.map(s => Math.max(s.vues, s.clics)));
  const x = (i: number) => pad + (i * (w - 2 * pad)) / Math.max(1, serie.length - 1);
  const y = (v: number) => h - pad - (v / max) * (h - 2 * pad);
  const ligne = (cle: 'vues' | 'clics') => lisse(serie.map((s, i) => [x(i), y(s[cle])]));
  const aire = `${ligne('vues')} L${x(serie.length - 1)},${h - pad} L${x(0)},${h - pad} Z`;
  const point = survol !== null ? serie[survol] : null;
  const date = (jour: string) => new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[12.5px]">
        <span className="flex gap-3 text-white/60">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#ffb38a]" />Vues</span>
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
        <path d={ligne('vues')} fill="none" stroke="#ffb38a" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        <path d={ligne('clics')} fill="none" stroke="#7dd3fc" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
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
          <span className="adm-barre absolute inset-y-0 left-0 origin-left bg-white/10" style={{ width: `${(l.valeur / max) * 100}%` }} />
          <span className="relative flex items-center justify-between gap-3 text-[14px]">
            <span className="truncate text-white">{l.nom}</span>
            <span className="shrink-0 tabular-nums text-white/70">{nombre(l.valeur)} {unite}{total ? <span className="ml-1.5 text-white/40">{Math.round((l.valeur / total) * 100)} %</span> : null}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** L'essentiel en quelques phrases, avant les chiffres. */
function EnBref({ stats }: { stats: Stats }) {
  const phrases = resumer(stats);
  return (
    <section aria-label="En bref" className="rounded-[22px] bg-white/[0.05] p-4 ring-1 ring-white/10">
      <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-white"><Icone nom="sparkle" taille={15} />En bref</p>
      <ul className="flex flex-col gap-2">
        {phrases.map(p => (
          <li key={p.texte} className="flex gap-2.5 text-[15px] leading-snug text-white/90">
            <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${p.ton === 'hausse' ? 'bg-emerald-300' : p.ton === 'baisse' ? 'bg-red-300' : 'bg-white/40'}`} />{p.texte}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Le gain des liens ouverts dans leur app : la promesse de Hopla, en chiffres. */
function OuvertsDansLApp({ apps, actif, onActiver }: { apps: Stats['apps']; actif: boolean; onActiver?: () => void }) {
  if (!apps.integres) return null;
  const part = apps.versApp ? Math.round((apps.ouverts / apps.versApp) * 100) : 0;
  return (
    <Carte titre="Ouverts dans leur app">
      <div className="flex items-end gap-3">
        <p className="text-[34px] font-semibold leading-none tracking-tight text-white tabular-nums">{nombre(apps.ouverts)}</p>
        <p className="pb-1 text-[13.5px] leading-snug text-white/60">clic{apps.ouverts > 1 ? 's' : ''} ouvert{apps.ouverts > 1 ? 's' : ''} directement dans YouTube, Spotify, Instagram…</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.07]"><div className="adm-barre h-full origin-left rounded-full bg-white" style={{ width: `${part}%` }} /></div>
      <p className="mt-2.5 text-[13px] leading-snug text-white/55">
        {nombre(apps.integres)} clic{apps.integres > 1 ? 's' : ''} venaient du navigateur intégré d’Instagram, TikTok ou Facebook, dont {nombre(apps.versApp)} vers un lien qui a son app.
        {actif ? ' Sans Hopla, ils seraient restés coincés dans la page web, sans compte connecté.' : ''}
      </p>
      {!actif && (
        <p className="mt-2.5 rounded-xl bg-white/10 px-3 py-2.5 text-[13px] leading-snug text-white/75">
          L’ouverture dans les apps est coupée sur ta page. {onActiver && <button type="button" onClick={onActiver} className="font-semibold text-white underline underline-offset-2">La rallumer</button>}
        </p>
      )}
    </Carte>
  );
}

/** `limite` : un compte gratuit ne voit que les sept derniers jours ; `onPro` mène à l'abonnement. */
export function OngletStats({ charger, limite = false, onPro, ouvrirApps = true, onActiverApps, liste }: { charger: (jours: number) => Promise<Stats>; limite?: boolean; onPro?: () => void; ouvrirApps?: boolean; onActiverApps?: () => void; liste?: ReactNode }) {
  const [choix, setJours] = useState('30');
  const jours = limite ? '7' : choix;
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
      {limite ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
          <p className="text-[14px] leading-snug text-white/80">Les 7 derniers jours. <span className="text-white/55">Avec Pro, jusqu’à un an d’historique : tout est déjà enregistré.</span></p>
          {onPro && <button type="button" onClick={onPro} className="min-h-9 shrink-0 rounded-full bg-white px-4 text-[13.5px] font-semibold text-nuit">Passer en Pro</button>}
        </div>
      ) : <Segments label="Période" valeur={jours} options={PERIODES} onChange={setJours} />}
      {erreur && <p className="rounded-xl bg-red-500/15 px-3.5 py-2.5 text-[14px] text-red-200">Les statistiques ne se chargent pas. Réessaie dans un instant.</p>}
      {!stats ? <div className="h-64 animate-pulse rounded-2xl bg-white/[0.04]" /> : (
        <>
          <EnBref stats={stats} />
          <div className="grid grid-cols-2 gap-2.5">
            <Kpi nom="Vues" valeur={stats.vues} avant={stats.precedent.vues} />
            <Kpi nom="Visiteurs" valeur={stats.visiteurs} avant={stats.precedent.visiteurs} />
            <Kpi nom="Clics" valeur={stats.clics} avant={stats.precedent.clics} />
            <Kpi nom="Taux de clic" valeur={stats.vues ? Math.round((stats.clics / stats.vues) * 100) : 0} suffixe=" %" />
          </div>
          <Carte><Courbe serie={stats.serie} /></Carte>
          {liste}
          <OuvertsDansLApp apps={stats.apps} actif={ouvrirApps} onActiver={onActiverApps} />
          <Carte titre="Liens les plus cliqués"><Barres lignes={stats.blocs.map(b => ({ nom: b.titre, valeur: b.clics }))} total={stats.clics} unite="clics" /></Carte>
          <Carte titre="D’où viennent les visiteurs"><Barres lignes={stats.sources.map(s => ({ nom: s.nom, valeur: s.vues }))} total={stats.vues} unite="vues" /></Carte>
          <Carte titre="Appareils"><Barres lignes={stats.appareils.map(s => ({ nom: s.nom, valeur: s.vues }))} total={stats.vues} unite="vues" /></Carte>
          <p className="px-2 text-center text-[12.5px] leading-snug text-white/40">
            Sans cookie : un visiteur est compté une fois par jour. Tes propres visites, une fois connecté, ne comptent pas.
          </p>
        </>
      )}
    </div>
  );
}
