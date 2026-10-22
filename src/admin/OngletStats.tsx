import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Bloc, Stats } from '../lib/types.ts';
import { sansSchema } from '../lib/types.ts';
import { ActionEntete, BoutonCopier, Menu, classeBouton, useGrandEcran, vibrer } from './ui.tsx';
import type { ElementMenu } from './ui.tsx';
import { Icone } from '../components/Icone.tsx';
import { enUnePhrase } from '../lib/resume.ts';
import type { Mesure, Point } from '../lib/stats.ts';
import { COULEURS_SOURCES, MESURES, NOMS_MESURES, chiffre, ecart, graduation, parSemaine, reperes, totalDe, valeurDuJour } from '../lib/stats.ts';
import { OFFRES, PLANS_PAYANTS } from '../lib/abonnement.ts';
import type { Fonction, PlanPayant } from '../lib/abonnement.ts';
import { noterPartage } from './BienDemarrer.tsx';
import { CodeQR } from './CodeQR.tsx';
import { Etiquette } from './offre.tsx';
import { TYPES } from './OngletLiens.tsx';

/*
 * Stats (direction B, 20 octobre 2026) : une phrase qui dit l'essentiel, les
 * quatre chiffres clés en une rangée qui sert d'onglets à une grande courbe,
 * puis d'où viennent les clics et les visiteurs, en listes à barre pâle avec
 * les chiffres à droite. Les couleurs de l'accueil (22 octobre 2026) : la
 * courbe et les barres des liens et des appareils en bleu Hopla, chaque réseau
 * dans la couleur de sa marque (une provenance sans marque en gris, pour ne pas
 * se confondre avec les bleus de LinkedIn, Facebook ou Google), un écart en
 * citron quand il monte, en rose quand il baisse. La période se choisit dans
 * un petit menu, dans l'en-tête au bureau, en tête de l'écran au téléphone.
 */

const PERIODES = [
  { jours: 7, nom: '7 derniers jours' },
  { jours: 30, nom: '30 derniers jours' },
  { jours: 90, nom: '90 derniers jours' },
  { jours: 365, nom: '12 derniers mois' },
];
const nombre = (n: number) => n.toLocaleString('fr-FR');
const pluriel = (n: number, mot: string) => `${nombre(n)} ${mot}${n > 1 ? 's' : ''}`;
const jourCourt = (jour: string) => new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const jourLong = (jour: string) => new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const mois = (jour: string) => new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', { month: 'short' });
/** Le nom d'un point : « mardi 29 septembre », ou « semaine du 26 août ». */
const nomPoint = (p: Point) => (p.fin ? `semaine du ${new Date(`${p.jour}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : jourLong(p.jour));

/** Un chiffre du jour avec son nom : « 138 vues », « Taux de clic : 38 % ». */
function dire(v: number, m: Mesure) {
  if (m === 'taux') return `Taux de clic : ${chiffre(v, m)}`;
  return pluriel(v, m === 'vues' ? 'vue' : m === 'visiteurs' ? 'visiteur' : 'clic');
}

/** La largeur d'un élément, suivie : la courbe se dessine au pixel près, sans texte étiré. */
function useLargeur() {
  const ref = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setLargeur(Math.round(el.getBoundingClientRect().width));
    const suivi = new ResizeObserver(([e]) => setLargeur(Math.round(e.contentRect.width)));
    suivi.observe(el);
    return () => suivi.disconnect();
  }, []);
  return [ref, largeur] as const;
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

/**
 * La courbe de la mesure choisie, jour par jour : une échelle ronde à gauche,
 * une date par semaine dessous, le dernier chiffre écrit au bout. Au survol ou
 * aux flèches, le jour se lit dans une bulle. Elle se dessine à sa vraie
 * largeur, pour des textes et des traits nets.
 */
function Courbe({ serie, mesure }: { serie: Point[]; mesure: Mesure }) {
  const [boite, largeur] = useLargeur();
  // L'aire sous la courbe : un bleu qui s'efface vers le bas. Son id sert dans `url(#…)`, sans les signes que React y met.
  const degrade = `degrade-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [survol, setSurvol] = useState<number | null>(null);
  const etroit = largeur > 0 && largeur < 600;
  const h = etroit ? 220 : 288;
  const valeurs = serie.map(j => valeurDuJour(j, mesure));
  const { haut: max, pas } = graduation(Math.max(...valeurs));
  const graduations = Array.from({ length: Math.round(max / pas) + 1 }, (_, i) => i * pas);
  // La marge de gauche suit le plus long chiffre de l'échelle ; le haut laisse sa place à « Voir en tableau ».
  const x0 = Math.max(etroit ? 36 : 48, 16 + 7 * chiffre(max, mesure).length);
  const x1 = largeur - (etroit ? 14 : 24);
  const yHaut = 48, yBas = h - 31.5;
  const n = serie.length;
  const x = (i: number) => (n > 1 ? x0 + (i * (x1 - x0)) / (n - 1) : (x0 + x1) / 2);
  const y = (v: number) => yBas - (v / max) * (yBas - yHaut);
  const ligne = lisse(valeurs.map((v, i) => [x(i), y(v)]));
  const aire = `${ligne} L${x(n - 1).toFixed(1)},${yBas} L${x(0).toFixed(1)},${yBas} Z`;
  let dates = reperes(serie);
  // Au téléphone, une date sur deux : elles ne se touchent pas.
  if (etroit && dates.length > 3) dates = dates.filter((_, k) => k % 2 === 0);
  const nomDate = (i: number) => (serie[i].fin ? mois(serie[i].fin!) : jourCourt(serie[i].jour));
  const dernier = valeurs[n - 1];
  // Le dernier chiffre s'écrit du côté où la courbe n'arrive pas : dessous quand elle descend vers lui, dessus sinon,
  // et jamais hors du cadre (dessous quand le point touche le haut, dessus quand il touche le bas).
  const avant = n > 1 ? valeurs[n - 2] : dernier;
  const placeDessus = y(dernier) - 12 >= yHaut - 4, placeDessous = y(dernier) + 22 <= yBas - 2;
  const yDernier = (!placeDessus || (avant > dernier && placeDessous)) ? y(dernier) + 22 : y(dernier) - 12;
  const point = survol === null ? null : { x: x(survol), y: y(valeurs[survol]), v: valeurs[survol], nom: nomPoint(serie[survol]) };
  const aGauche = point && point.x + 170 > largeur;

  function lire(clientX: number, rect: DOMRect) {
    const i = Math.round(((clientX - rect.left - x0) / Math.max(1, x1 - x0)) * (n - 1));
    setSurvol(Math.min(n - 1, Math.max(0, i)));
  }

  return (
    <div ref={boite} className="relative" style={{ height: h }}>
      {largeur > 0 && (
        <svg width={largeur} height={h} viewBox={`0 0 ${largeur} ${h}`} className="adm-courbe-svg block touch-pan-y" tabIndex={0} role="img"
          aria-label={`${NOMS_MESURES[mesure]} par ${serie[0].fin ? 'semaine' : 'jour'}, du ${jourLong(serie[0].jour)} au ${jourLong(serie[n - 1].fin ?? serie[n - 1].jour)} : ${chiffre(valeurs[0], mesure)} au début, ${chiffre(dernier, mesure)} à la fin. Flèches gauche et droite pour lire chaque ${serie[0].fin ? 'semaine' : 'jour'}.`}
          onKeyDown={e => {
            const pas = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity }[e.key];
            if (pas === undefined) return;
            e.preventDefault();
            setSurvol(v => (pas === -Infinity ? 0 : pas === Infinity ? n - 1 : Math.min(n - 1, Math.max(0, (v ?? (pas > 0 ? -1 : n)) + pas))));
          }}
          onBlur={() => setSurvol(null)}
          onPointerMove={e => lire(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerDown={e => lire(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={e => { if (e.pointerType === 'mouse') setSurvol(null); }}>
          <g stroke="#efefec" strokeWidth="1">
            {graduations.slice(1).map(t => <line key={t} x1={x0} x2={x1} y1={Math.round(y(t)) + 0.5} y2={Math.round(y(t)) + 0.5} />)}
          </g>
          <line x1={x0} x2={x1} y1={Math.round(yBas) + 0.5} y2={Math.round(yBas) + 0.5} stroke="#dcdcd7" strokeWidth="1" />
          <g className="adm-courbe-texte" textAnchor="end">
            {graduations.map(t => <text key={t} x={x0 - 10} y={y(t) + 4}>{chiffre(t, mesure)}</text>)}
          </g>
          <g className="adm-courbe-texte">
            {dates.map((i, k) => (
              <text key={i} x={x(i)} y={h - 10} textAnchor={k === 0 && i === 0 ? 'start' : x(i) > x1 - 30 ? 'end' : 'middle'}>{nomDate(i)}</text>
            ))}
          </g>
          <defs>
            <linearGradient id={degrade} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#292bff" stopOpacity="0.16" />
              <stop offset="1" stopColor="#292bff" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={aire} fill={`url(#${degrade})`} />
          <path d={ligne} fill="none" stroke="#292bff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {point && <line x1={point.x} x2={point.x} y1={yHaut - 8} y2={yBas} stroke="#b9baf5" strokeWidth="1" />}
          {point && <circle cx={point.x} cy={point.y} r="4" fill="#292bff" stroke="#ffffff" strokeWidth="2" />}
          {survol !== n - 1 && <circle cx={x(n - 1)} cy={y(dernier)} r="4" fill="#292bff" stroke="#ffffff" strokeWidth="2" />}
          <text x={x(n - 1)} y={yDernier} textAnchor="middle" className="adm-courbe-dernier">{chiffre(dernier, mesure)}</text>
        </svg>
      )}
      {point && (
        <div aria-hidden="true" className="adm-bulle pointer-events-none absolute" style={{ left: aGauche ? point.x - 13 : point.x + 13, top: yHaut - 6, transform: aGauche ? 'translateX(-100%)' : undefined }}>
          <span className="block font-semibold">{dire(point.v, mesure)}</span>
          <span className="block text-[12px] text-[#5f5f5a]">{point.nom}</span>
        </div>
      )}
      <p className="sr-only" aria-live="polite">{point ? `${point.nom} : ${dire(point.v, mesure)}` : ''}</p>
    </div>
  );
}

/** Les mêmes chiffres en tableau, le plus récent en haut : pour lire un jour précis, ou sans la courbe. */
function TableauJours({ serie, hauteur }: { serie: Point[]; hauteur: number }) {
  const semaine = !!serie[0]?.fin;
  return (
    <div className="overflow-y-auto overscroll-contain" style={{ height: hauteur }} tabIndex={0} role="region" aria-label={`Les chiffres ${semaine ? 'semaine par semaine' : 'jour par jour'}`}>
      <table className="adm-tableau-jours w-full">
        <thead>
          <tr><th scope="col">{semaine ? 'Semaine' : 'Jour'}</th><th scope="col">Vues</th><th scope="col">Visiteurs</th><th scope="col">Clics</th><th scope="col">Taux de clic</th></tr>
        </thead>
        <tbody>
          {[...serie].reverse().map(j => (
            <tr key={j.jour}>
              <th scope="row">{semaine ? `Du ${jourCourt(j.jour)} au ${jourCourt(j.fin!)}` : jourLong(j.jour)}</th>
              <td>{nombre(j.vues)}</td><td>{nombre(j.visiteurs)}</td><td>{nombre(j.clics)}</td>
              <td>{j.vues ? chiffre(valeurDuJour(j, 'taux'), 'taux') : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** La phrase des stats, son chiffre de vues en bleu, comme un mot de titre sur l'accueil. */
function Phrase({ texte }: { texte: string }) {
  const m = /\d[\d\s\u202f\u00a0]*\svues?\b/.exec(texte);
  if (!m) return <>{texte}</>;
  return <>{texte.slice(0, m.index)}<span className="adm-stats-chiffre">{m[0]}</span>{texte.slice(m.index + m[0].length)}</>;
}

/** Les quatre chiffres clés, qui choisissent la courbe dessous (motif ARIA des onglets, flèches et Début/Fin). */
function CourbeAOnglets({ stats }: { stats: Stats }) {
  const [mesure, setMesure] = useState<Mesure>('vues');
  const [tableau, setTableau] = useState(false);
  const id = useId();
  const grand = useGrandEcran();
  const points: Point[] = stats.serie.length > 92 ? parSemaine(stats.serie) : stats.serie;
  function fleches(e: React.KeyboardEvent<HTMLDivElement>) {
    const i = MESURES.indexOf(mesure);
    const pas = { ArrowRight: 1, ArrowLeft: -1, Home: -i, End: MESURES.length - 1 - i }[e.key];
    if (pas === undefined) return;
    e.preventDefault();
    const m = MESURES[(i + pas + MESURES.length) % MESURES.length];
    setMesure(m);
    e.currentTarget.querySelector<HTMLElement>(`[data-mesure="${m}"]`)?.focus();
  }
  return (
    <section aria-label="Les chiffres clés et leur courbe" className="adm-encart adm-courbe">
      <div role="tablist" aria-label="Chiffre affiché" className="adm-courbe-onglets" onKeyDown={fleches}>
        {MESURES.map(m => {
          const total = totalDe(stats, m);
          const e = ecart(stats, m);
          return (
            <button key={m} type="button" role="tab" id={`${id}-${m}`} data-mesure={m} aria-selected={mesure === m} aria-controls={`${id}-panneau`} tabIndex={mesure === m ? 0 : -1}
              onClick={() => { if (mesure !== m) { vibrer(4); setMesure(m); } }}>
              <span className="adm-courbe-nom">{NOMS_MESURES[m]}</span>
              <span className="flex items-baseline gap-2">
                {/* Chiffres proportionnels : en Geist, le 1 tabulaire prend un pied qui, à cette taille, se lit comme une autre fonte. */}
                <span className={total === null ? 'adm-courbe-vide' : 'adm-courbe-chiffre'}>{total === null ? 'pas encore' : chiffre(total, m)}</span>
                {e.court && <span className="adm-courbe-ecart" data-sens={e.sens}><span aria-hidden="true">{e.court}</span><span className="sr-only">, {e.long}</span></span>}
              </span>
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`${id}-panneau`} aria-labelledby={`${id}-${mesure}`} className="relative">
        {tableau ? (
          <>
            <div className="flex justify-end px-3 pt-2.5"><button type="button" onClick={() => setTableau(false)} className="adm-voir-tableau">Voir la courbe</button></div>
            <TableauJours serie={points} hauteur={grand ? 248 : 260} />
          </>
        ) : (
          <>
            <Courbe serie={points} mesure={mesure} />
            <button type="button" onClick={() => setTableau(true)} className="adm-voir-tableau absolute right-3 top-2.5 z-[1]">Voir en tableau</button>
          </>
        )}
      </div>
    </section>
  );
}

/** Le picto d'une provenance : le logo du réseau, le QR code, une enveloppe ; un site inconnu prend le globe. */
const ICONES_SOURCES: Record<string, string> = {
  Instagram: 'instagram', TikTok: 'tiktok', YouTube: 'youtube', LinkedIn: 'linkedin', X: 'x', Facebook: 'facebook', Threads: 'threads',
  Snapchat: 'snapchat', 'QR code': 'qr', Newsletter: 'courrier', 'E-mail': 'email', Google: 'google', Direct: 'lien',
};
const ICONES_APPAREILS: Record<string, string> = { Mobile: 'mobile', Tablette: 'mobile', Ordinateur: 'ordinateur' };
/** Une provenance sans marque (Direct, QR code, e-mail, un site) : en gris, à côté des réseaux en couleur. Les liens et les appareils prennent le bleu (voir admin.css). */
const SANS_MARQUE = { picto: '#3d3d39', barre: '#efefec' };

type Ligne = { cle: string; nom: string; icone: string; valeur: number; couleur?: { picto: string; barre: string } };

/**
 * Une répartition : le libellé sur une barre pâle à la mesure du premier, le
 * chiffre et la part à droite, dans leurs colonnes, en gris lisible sur le
 * blanc (et non plus posés sur la barre, à 4,27:1). Huit lignes, puis « Tout voir ».
 */
function Repartition({ titre, unite, lignes, total, vide = 'Pas encore de données.' }: { titre: string; unite: string; lignes: Ligne[]; total: number; vide?: string }) {
  const id = useId();
  const [tout, setTout] = useState(false);
  const max = Math.max(1, ...lignes.map(l => l.valeur));
  const vues = tout ? lignes : lignes.slice(0, 8);
  return (
    <section aria-labelledby={id} className="adm-encart adm-repartition">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-[15px] font-semibold tracking-[-0.015em]">{titre}</h2>
        <span className="text-[12px] text-[#5f5f5a]" aria-hidden="true">{unite}</span>
      </div>
      {!lignes.length ? <p className="py-2 text-[14px] text-[#5f5f5a]">{vide}</p> : (
        <ol className="flex flex-col gap-1">
          {vues.map(l => (
            <li key={l.cle}>
              <span className="adm-repartition-nom" style={l.couleur && { '--picto': l.couleur.picto, '--barre': l.couleur.barre } as CSSProperties}>
                <span aria-hidden="true" className="adm-repartition-barre adm-barre origin-left" style={{ width: `${(l.valeur / max) * 100}%` }} />
                <Icone nom={l.icone} taille={14} className="relative shrink-0" />
                <span className="relative truncate">{l.nom}</span>
              </span>
              <span className="adm-repartition-valeur">{nombre(l.valeur)}<span className="sr-only"> {unite.toLowerCase()}</span></span>
              <span className="adm-repartition-part">{total ? `${Math.round((l.valeur / total) * 100)} %` : ''}</span>
            </li>
          ))}
        </ol>
      )}
      {lignes.length > 8 && (
        <button type="button" onClick={() => setTout(t => !t)} aria-expanded={tout} className="mt-1.5 min-h-11 text-[13px] font-medium text-bleu underline decoration-bleu/35 underline-offset-2 hover:text-[#1d1fd6] bureau:min-h-8">
          {tout ? 'Voir moins' : `Tout voir (${lignes.length})`}
        </button>
      )}
    </section>
  );
}

/** Le gain des liens ouverts dans leur app : la promesse de Hopla, en chiffres. */
function OuvertsDansLApp({ apps, actif, onActiver }: { apps: Stats['apps']; actif: boolean; onActiver?: () => void }) {
  if (!apps.integres) return null;
  const part = apps.versApp ? Math.round((apps.ouverts / apps.versApp) * 100) : 0;
  return (
    <section aria-labelledby="stats-apps" className="adm-encart adm-repartition">
      <h2 id="stats-apps" className="mb-3 text-[15px] font-semibold tracking-[-0.015em]">Ouverts dans leur app</h2>
      <div className="flex items-end gap-3">
        <p className="text-[24px] font-semibold leading-none tracking-[-0.02em] proportional-nums">{nombre(apps.ouverts)}</p>
        <p className="text-[13.5px] leading-snug text-[#5f5f5a]">clic{apps.ouverts > 1 ? 's' : ''} ouvert{apps.ouverts > 1 ? 's' : ''} directement dans YouTube, Spotify, Instagram…</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e4e4ff]"><div className="adm-barre h-full origin-left rounded-full bg-bleu" style={{ width: `${part}%` }} /></div>
      <p className="mt-1.5 text-[12px] text-[#5f5f5a]">{part}{' '}% des {nombre(apps.versApp)} clics vers une app depuis Instagram ou TikTok</p>
      {!actif && (
        <p className="mt-3 border-t border-[#efefec] pt-3 text-[13px] leading-snug text-[#3d3d39]">
          L’ouverture dans les apps est coupée sur ta page. {onActiver && <button type="button" onClick={onActiver} className="font-semibold text-bleu underline underline-offset-2 hover:text-[#1d1fd6]">La rallumer</button>}
        </p>
      )}
    </section>
  );
}

/** Une page que personne n'a encore vue : pas de zéros ni de courbe plate, mais de quoi amener le premier visiteur. */
function PageJamaisVue({ adresse, pseudo }: { adresse: string; pseudo: string }) {
  return (
    <section aria-labelledby="stats-vide" className="adm-encart px-5 py-7">
      <div className="flex flex-col items-center gap-5 text-center">
        <div>
          <h2 id="stats-vide" className="text-[18px] font-semibold tracking-[-0.02em]">Personne n’a encore vu ta page</h2>
          <p className="mt-1.5 text-[14px] leading-snug text-[#5f5f5a]">Les chiffres arrivent avec le premier visiteur.</p>
        </div>
        <div className="adm-address flex w-full max-w-sm items-center gap-2 p-1.5 pl-3.5 text-left">
          <span className="min-w-0 flex-1 truncate text-[15px] font-medium" translate="no">{sansSchema(adresse)}</span>
          <BoutonCopier texte={adresse} onCopie={noterPartage} label="Copier l’adresse de ta page" />
        </div>
        <CodeQR adresse={adresse} pseudo={pseudo} />
      </div>
    </section>
  );
}

/** L'historique qu'ouvre une offre : Starter lit 30 jours, Pro un an (d'après `OFFRES`). */
const duree = (jours: number) => (jours >= 365 ? 'un an' : `${jours} jours`);

/** Ce que lire ses stats apporte, pour une offre qui ne les montre pas (Gratuit) : elles se comptent déjà, Starter les ouvre. */
function StatsReservees({ onOffres, liste }: { onOffres?: Proprietes['onOffres']; liste?: ReactNode }) {
  const lignes = ['Tes vues, tes visiteurs et tes clics, jour par jour', 'Tes liens les plus cliqués', 'D’où viennent tes visiteurs, et sur quel appareil', 'Le résumé de ta semaine, chaque lundi par e-mail'];
  return (
    <div className="flex flex-col gap-5">
      <p className="adm-stats-phrase">Tes visites se comptent déjà, sans cookie. Il ne reste qu’à les lire.</p>
      <section aria-labelledby="stats-reservees" className="adm-encart p-5 bureau:px-6">
        <div className="flex items-center gap-2">
          <h2 id="stats-reservees" className="text-[15px] font-semibold tracking-[-0.015em]">Tes stats</h2>
          <Etiquette fonction="stats" />
        </div>
        <p className="mt-1.5 text-[14px] leading-snug text-[#5f5f5a]">Avec Hopla {OFFRES.starter.nom}, tu les lis sur {duree(OFFRES.starter.jours)}, et sur {duree(OFFRES.pro.jours)} avec {OFFRES.pro.nom} :</p>
        <ul className="mt-4 flex flex-col gap-2">
          {lignes.map(l => (
            <li key={l} className="flex gap-2.5 text-[14px] leading-snug">
              <span className="mt-0.5 shrink-0" aria-hidden="true"><Icone nom="ui-ok" taille={16} /></span>{l}
            </li>
          ))}
        </ul>
        {onOffres && <button type="button" onClick={() => onOffres('stats')} aria-haspopup="dialog" className={`${classeBouton.principal} mt-5`}>Voir les offres</button>}
      </section>
      {liste}
    </div>
  );
}

type Proprietes = {
  charger: (jours: number) => Promise<Stats>; adresse: string; pseudo: string; joursMax?: number;
  /** Ouvre les offres par-dessus les stats, sur celle qui débloque `pour`, ou sur `vers` (un an de stats : Pro). */
  onOffres?: (pour?: Fonction, vers?: PlanPayant) => void;
  ouvrirApps?: boolean; onActiverApps?: () => void; liste?: ReactNode;
  /** Les blocs de la page : chaque lien de la liste prend son picto. */
  blocs?: Bloc[];
};

/**
 * `joursMax` : l'historique que l'offre laisse lire (aucun en Gratuit, 30 jours en Starter, un an en Pro ;
 * 7 pour une page d'avant les offres). Sans historique, rien ne se charge : l'onglet dit ce que Starter ouvre.
 * `onOffres` mène aux offres.
 */
export function OngletStats(props: Proprietes) {
  if (props.joursMax !== undefined && props.joursMax <= 0) return <StatsReservees onOffres={props.onOffres} liste={props.liste} />;
  return <TableauStats {...props} />;
}

function TableauStats({ charger, adresse, pseudo, joursMax = 365, onOffres, ouvrirApps = true, onActiverApps, liste, blocs = [] }: Proprietes) {
  const grand = useGrandEcran();
  const ouvertes = PERIODES.filter(p => p.jours <= joursMax);
  const [choix, setJours] = useState(Math.min(30, joursMax));
  const jours = ouvertes.some(p => p.jours === choix) ? choix : ouvertes[ouvertes.length - 1].jours;
  const [stats, setStats] = useState<Stats | null>(null);
  const [erreur, setErreur] = useState(false);
  // Pendant qu'une autre période se charge, les chiffres d'avant pâlissent : on voit qu'ils vont changer.
  const [charge, setCharge] = useState(true);
  const [essai, setEssai] = useState(0);
  useEffect(() => {
    let annule = false;
    setErreur(false); setCharge(true);
    charger(jours).then(s => { if (!annule) setStats(s); }).catch(() => { if (!annule) setErreur(true); }).finally(() => { if (!annule) setCharge(false); });
    return () => { annule = true; };
  }, [jours, charger, essai]);

  // Les périodes que l'offre n'ouvre pas restent dans le menu, au nom de l'offre qui les ouvre : elles mènent aux offres.
  const elements: ElementMenu[] = PERIODES.flatMap((p): ElementMenu[] => {
    if (p.jours <= joursMax) return [{ nom: p.nom, coche: p.jours === jours, action: () => setJours(p.jours) }];
    const offre = PLANS_PAYANTS.find(o => OFFRES[o].enVente && OFFRES[o].jours >= p.jours);
    return onOffres && offre ? [{ nom: p.nom, etiquette: OFFRES[offre].nom, offre, action: () => onOffres(undefined, offre) }] : [];
  });
  const nomPeriode = PERIODES.find(p => p.jours === jours)!.nom;
  // La période ne se montre qu'à une page déjà vue : avant, il n'y a rien à comparer. Pendant le premier chargement, elle reste.
  const periode = stats && !stats.dejaVue ? null : (
    <Menu label="Période" elements={elements} aligne={grand ? 'droite' : 'gauche'} className={`adm-periode ${classeBouton.secondaire}`}>
      <span className="sr-only">Période : </span>{nomPeriode}<Icone nom="ui-chevron" taille={14} className="shrink-0 text-[#55554f]" />
    </Menu>
  );

  const lignesLiens: Ligne[] = (stats?.blocs ?? []).map(b => {
    const bloc = blocs.find(x => x.id === b.id);
    return { cle: b.id, nom: b.titre, valeur: b.clics, icone: bloc?.icone || TYPES.find(t => t.type === bloc?.type)?.picto || 'bloc-lien' };
  });
  const lignesSources: Ligne[] = (stats?.sources ?? []).map(s => ({ cle: s.nom, nom: s.nom, valeur: s.vues, icone: ICONES_SOURCES[s.nom] ?? 'site', couleur: COULEURS_SOURCES[s.nom] ?? SANS_MARQUE }));
  const lignesAppareils: Ligne[] = (stats?.appareils ?? []).map(s => ({ cle: s.nom, nom: s.nom, valeur: s.vues, icone: ICONES_APPAREILS[s.nom] ?? 'ordinateur' }));
  const note = <p className="text-[12px] leading-snug text-[#5f5f5a]">Sans cookie : un visiteur compte une fois par jour, toi jamais.</p>;

  return (
    <div className="adm-stats mx-auto flex w-full max-w-[1200px] flex-col gap-5">
      {periode && (grand ? <ActionEntete>{periode}</ActionEntete> : <div className="-mt-2 flex">{periode}</div>)}
      {erreur && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-red-500/15 py-1.5 pr-1.5 pl-3.5 text-[14px] text-red-200">
          Les statistiques ne se chargent pas.
          <button type="button" onClick={() => setEssai(n => n + 1)} className={`${classeBouton.secondaire} shrink-0`}>Réessayer</button>
        </div>
      )}
      {!stats ? (!erreur && <div className="h-[420px] animate-pulse rounded-xl bg-[#f4f4f2] motion-reduce:animate-none" role="status" aria-label="Chargement des statistiques" />) : !stats.dejaVue ? (
        <>
          <PageJamaisVue adresse={adresse} pseudo={pseudo} />
          {liste}
          {note}
        </>
      ) : (
        <div className={`flex flex-col gap-5 transition-opacity duration-200 ${charge ? 'opacity-50' : ''}`} aria-busy={charge}>
          <p className="adm-stats-phrase"><Phrase texte={enUnePhrase(stats)} /></p>
          <CourbeAOnglets stats={stats} />
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <Repartition titre="Liens" unite="Clics" lignes={lignesLiens} total={stats.clics} vide="Aucun clic sur cette période." />
            <Repartition titre="Réseaux" unite="Vues" lignes={lignesSources} total={stats.vues} />
            <Repartition titre="Appareils" unite="Vues" lignes={lignesAppareils} total={stats.vues} />
            <OuvertsDansLApp apps={stats.apps} actif={ouvrirApps} onActiver={onActiverApps} />
          </div>
          {liste}
          {note}
        </div>
      )}
    </div>
  );
}
