import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Bloc, Langue, Semaine, Stats } from '../lib/types.ts';
import { choix, useLangue } from '../accueil/langue.ts';
import { sansSchema } from '../lib/types.ts';
import { ActionEntete, BoutonCopier, Carte, classeBouton, useGrandEcran, vibrer } from './ui.tsx';
import { Icone } from '../components/Icone.tsx';
import { enUnePhrase } from '../lib/resume.ts';
import type { Mesure, Point } from '../lib/stats.ts';
import { COULEURS_SOURCES, MESURES, nomMesure, chiffre, ecart, graduation, parSemaine, reperes, totalDe, valeurDuJour } from '../lib/stats.ts';
import { DEGRADE_COURBE, aireSous, lisse } from '../lib/courbe.ts';
import type { PointTrace } from '../lib/courbe.ts';
import { OFFRES } from '../lib/abonnement.ts';
import type { Fonction, PlanPayant } from '../lib/abonnement.ts';
import type { PeriodeStats } from '../lib/periode.ts';
import { DUREES, borner, cleDe, jourDe } from '../lib/periode.ts';
import { ChoixPeriode } from './ChoixPeriode.tsx';
import { noterPartage } from './BienDemarrer.tsx';
import { Etiquette } from './offre.tsx';
import { typeDe } from '../lib/catalogue.ts';

/*
 * Stats (direction B, 20 octobre 2026) : une phrase qui dit l'essentiel, les
 * quatre chiffres clés en une rangée qui sert d'onglets à une grande courbe,
 * puis d'où viennent les clics et les visiteurs, en listes à barre pâle avec
 * les chiffres à droite. Les couleurs de l'accueil (22 octobre 2026) : la
 * courbe, lisse sur un dégradé, et les barres des liens et des appareils en
 * bleu Hopla, chaque réseau dans la couleur de sa marque (une provenance sans
 * marque en gris, pour ne pas se confondre avec les bleus de LinkedIn,
 * Facebook ou Google), un écart en citron quand il monte, en rose quand il
 * baisse. La période se choisit d'un toucher, ou en dates dans un calendrier
 * (`ChoixPeriode`), dans l'en-tête au bureau, en tête de l'écran au téléphone.
 */

const loc = (langue: Langue) => (langue === 'en' ? 'en-US' : 'fr-FR');
const nombre = (n: number, langue: Langue = 'fr') => n.toLocaleString(loc(langue));
const pluriel = (n: number, mot: string, langue: Langue = 'fr') => `${nombre(n, langue)} ${mot}${langue === 'en' ? (n === 1 ? '' : 's') : n > 1 ? 's' : ''}`;
const jourCourt = (jour: string, langue: Langue) => new Date(`${jour}T12:00:00`).toLocaleDateString(loc(langue), { day: 'numeric', month: 'short' });
const jourLong = (jour: string, langue: Langue) => new Date(`${jour}T12:00:00`).toLocaleDateString(loc(langue), { weekday: 'long', day: 'numeric', month: 'long' });
const mois = (jour: string, langue: Langue) => new Date(`${jour}T12:00:00`).toLocaleDateString(loc(langue), { month: 'short' });
/** Le nom d'un point : « mardi 29 septembre », ou « semaine du 26 août » ; « Tuesday, September 29 », « week of August 26 ». */
const nomPoint = (p: Point, langue: Langue) => (p.fin
  ? `${langue === 'en' ? 'week of' : 'semaine du'} ${new Date(`${p.jour}T12:00:00`).toLocaleDateString(loc(langue), { day: 'numeric', month: 'long' })}`
  : jourLong(p.jour, langue));

/** Un chiffre du jour avec son nom : « 138 vues », « Taux de clic : 38 % ». */
function dire(v: number, m: Mesure, langue: Langue) {
  if (m === 'taux') return langue === 'en' ? `Click rate: ${chiffre(v, m, langue)}` : `Taux de clic : ${chiffre(v, m)}`;
  const mot = langue === 'en' ? (m === 'vues' ? 'view' : m === 'visiteurs' ? 'visitor' : 'click') : (m === 'vues' ? 'vue' : m === 'visiteurs' ? 'visiteur' : 'clic');
  return pluriel(v, mot, langue);
}

/** Les provenances, appareils et lignes que le serveur nomme en français, dits dans la langue du compte. */
const NOMS_EN: Record<string, string> = { 'E-mail': 'Email', Tablette: 'Tablet', Ordinateur: 'Computer', 'Bloc supprimé': 'Deleted block', Autres: 'Other', Autre: 'Other', App: 'In-app browser' };
const nomServeur = (nom: string, langue: Langue) => (langue === 'en' ? NOMS_EN[nom] ?? nom : nom);

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
 * La courbe de la mesure choisie, jour par jour : une échelle ronde à gauche,
 * une date par semaine dessous, le dernier chiffre écrit au bout. Au survol ou
 * aux flèches, le jour se lit dans une bulle. Elle se dessine à sa vraie
 * largeur, pour des textes et des traits nets.
 */
function Courbe({ serie, mesure }: { serie: Point[]; mesure: Mesure }) {
  const langue = useLangue();
  const [boite, largeur] = useLargeur();
  // L'aire sous la courbe, en dégradé (`lib/courbe.ts`). Son id sert dans `url(#…)`, sans les signes que React y met.
  const degrade = `degrade-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [survol, setSurvol] = useState<number | null>(null);
  const etroit = largeur > 0 && largeur < 600;
  const h = etroit ? 220 : 288;
  const valeurs = serie.map(j => valeurDuJour(j, mesure));
  const { haut: max, pas } = graduation(Math.max(...valeurs));
  const graduations = Array.from({ length: Math.round(max / pas) + 1 }, (_, i) => i * pas);
  // La marge de gauche suit le plus long chiffre de l'échelle ; le haut laisse sa place à « Voir en tableau ».
  const x0 = Math.max(etroit ? 36 : 48, 16 + 7 * chiffre(max, mesure, langue).length);
  const x1 = largeur - (etroit ? 14 : 24);
  const yHaut = 48, yBas = h - 31.5;
  const n = serie.length;
  const x = (i: number) => (n > 1 ? x0 + (i * (x1 - x0)) / (n - 1) : (x0 + x1) / 2);
  const y = (v: number) => yBas - (v / max) * (yBas - yHaut);
  const trace = valeurs.map((v, i): PointTrace => [x(i), y(v)]);
  let dates = reperes(serie);
  // Au téléphone, une date sur deux : elles ne se touchent pas.
  if (etroit && dates.length > 3) dates = dates.filter((_, k) => k % 2 === 0);
  const nomDate = (i: number) => (serie[i].fin ? mois(serie[i].fin!, langue) : jourCourt(serie[i].jour, langue));
  const dernier = valeurs[n - 1];
  // Le dernier chiffre s'écrit du côté où la courbe n'arrive pas : dessous quand elle descend vers lui, dessus sinon,
  // et jamais hors du cadre (dessous quand le point touche le haut, dessus quand il touche le bas).
  const avant = n > 1 ? valeurs[n - 2] : dernier;
  const placeDessus = y(dernier) - 12 >= yHaut - 4, placeDessous = y(dernier) + 22 <= yBas - 2;
  const yDernier = (!placeDessus || (avant > dernier && placeDessous)) ? y(dernier) + 22 : y(dernier) - 12;
  const point = survol === null ? null : { x: x(survol), y: y(valeurs[survol]), v: valeurs[survol], nom: nomPoint(serie[survol], langue) };
  const aGauche = point && point.x + 170 > largeur;

  function lire(clientX: number, rect: DOMRect) {
    const i = Math.round(((clientX - rect.left - x0) / Math.max(1, x1 - x0)) * (n - 1));
    setSurvol(Math.min(n - 1, Math.max(0, i)));
  }

  return (
    <div ref={boite} className="relative" style={{ height: h }}>
      {largeur > 0 && (
        <svg width={largeur} height={h} viewBox={`0 0 ${largeur} ${h}`} className="adm-courbe-svg block touch-pan-y" tabIndex={0} role="img"
          aria-label={langue === 'en'
            ? `${nomMesure(mesure, langue)} by ${serie[0].fin ? 'week' : 'day'}, from ${jourLong(serie[0].jour, langue)} to ${jourLong(serie[n - 1].fin ?? serie[n - 1].jour, langue)}: ${chiffre(valeurs[0], mesure, langue)} at the start, ${chiffre(dernier, mesure, langue)} at the end. Left and right arrows read each ${serie[0].fin ? 'week' : 'day'}.`
            : `${nomMesure(mesure)} par ${serie[0].fin ? 'semaine' : 'jour'}, du ${jourLong(serie[0].jour, langue)} au ${jourLong(serie[n - 1].fin ?? serie[n - 1].jour, langue)} : ${chiffre(valeurs[0], mesure)} au début, ${chiffre(dernier, mesure)} à la fin. Flèches gauche et droite pour lire chaque ${serie[0].fin ? 'semaine' : 'jour'}.`}
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
            {graduations.map(t => <text key={t} x={x0 - 10} y={y(t) + 4}>{chiffre(t, mesure, langue)}</text>)}
          </g>
          <g className="adm-courbe-texte">
            {dates.map((i, k) => (
              <text key={i} x={x(i)} y={h - 10} textAnchor={n > 1 && k === 0 && i === 0 ? 'start' : n > 1 && x(i) > x1 - 30 ? 'end' : 'middle'}>{nomDate(i)}</text>
            ))}
          </g>
          <defs>
            <linearGradient id={degrade} x1="0" y1="0" x2="0" y2="1">
              {DEGRADE_COURBE.map(s => <stop key={s.arret} offset={s.arret} stopColor="#292bff" stopOpacity={s.opacite} />)}
            </linearGradient>
          </defs>
          <path d={aireSous(trace, yBas)} fill={`url(#${degrade})`} />
          <path d={lisse(trace)} fill="none" stroke="#292bff" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
          {point && <line x1={point.x} x2={point.x} y1={yHaut - 8} y2={yBas} stroke="#b9baf5" strokeWidth="1" />}
          {point && <circle cx={point.x} cy={point.y} r="4" fill="#292bff" stroke="#ffffff" strokeWidth="2" />}
          {survol !== n - 1 && <circle cx={x(n - 1)} cy={y(dernier)} r="4" fill="#292bff" stroke="#ffffff" strokeWidth="2" />}
          <text x={x(n - 1)} y={yDernier} textAnchor="middle" className="adm-courbe-dernier">{chiffre(dernier, mesure, langue)}</text>
        </svg>
      )}
      {point && (
        <div aria-hidden="true" className="adm-bulle pointer-events-none absolute" style={{ left: aGauche ? point.x - 13 : point.x + 13, top: yHaut - 6, transform: aGauche ? 'translateX(-100%)' : undefined }}>
          <span className="block font-semibold">{dire(point.v, mesure, langue)}</span>
          <span className="block text-[12px] text-[#5f5f5a]">{point.nom}</span>
        </div>
      )}
      <p className="sr-only" aria-live="polite">{point ? `${point.nom}${langue === 'en' ? ':' : ' :'} ${dire(point.v, mesure, langue)}` : ''}</p>
    </div>
  );
}

/** Les mêmes chiffres en tableau, le plus récent en haut : pour lire un jour précis, ou sans la courbe. */
function TableauJours({ serie, hauteur }: { serie: Point[]; hauteur: number }) {
  const langue = useLangue();
  const tr = choix(langue);
  const semaine = !!serie[0]?.fin;
  return (
    <div className="overflow-y-auto overscroll-contain" style={{ height: hauteur }} tabIndex={0} role="region" aria-label={semaine ? tr('Les chiffres semaine par semaine', 'The numbers week by week') : tr('Les chiffres jour par jour', 'The numbers day by day')}>
      <table className="adm-tableau-jours w-full">
        <thead>
          <tr><th scope="col">{semaine ? tr('Semaine', 'Week') : tr('Jour', 'Day')}</th><th scope="col">{nomMesure('vues', langue)}</th><th scope="col">{nomMesure('visiteurs', langue)}</th><th scope="col">{nomMesure('clics', langue)}</th><th scope="col">{nomMesure('taux', langue)}</th></tr>
        </thead>
        <tbody>
          {[...serie].reverse().map(j => (
            <tr key={j.jour}>
              <th scope="row">{semaine ? tr(`Du ${jourCourt(j.jour, langue)} au ${jourCourt(j.fin!, langue)}`, `${jourCourt(j.jour, langue)} to ${jourCourt(j.fin!, langue)}`) : jourLong(j.jour, langue)}</th>
              <td>{nombre(j.vues, langue)}</td><td>{nombre(j.visiteurs, langue)}</td><td>{nombre(j.clics, langue)}</td>
              <td>{j.vues ? chiffre(valeurDuJour(j, 'taux'), 'taux', langue) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** La phrase des stats, son chiffre de vues en bleu, comme un mot de titre sur l'accueil. */
function Phrase({ texte }: { texte: string }) {
  const m = /\d[\d\s,\u202f\u00a0]*\s(?:vues?|views?)\b/.exec(texte);
  if (!m) return <>{texte}</>;
  return <>{texte.slice(0, m.index)}<span className="adm-stats-chiffre">{m[0]}</span>{texte.slice(m.index + m[0].length)}</>;
}

/** Les quatre chiffres clés, qui choisissent la courbe dessous (motif ARIA des onglets, flèches et Début/Fin). */
function CourbeAOnglets({ stats }: { stats: Stats }) {
  const langue = useLangue();
  const tr = choix(langue);
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
    <section aria-label={tr('Les chiffres clés et leur courbe', 'Key numbers and their chart')} className="adm-encart adm-courbe">
      <div role="tablist" aria-label={tr('Chiffre affiché', 'Number shown')} className="adm-courbe-onglets" onKeyDown={fleches}>
        {MESURES.map(m => {
          const total = totalDe(stats, m);
          const e = ecart(stats, m, langue);
          return (
            <button key={m} type="button" role="tab" id={`${id}-${m}`} data-mesure={m} aria-selected={mesure === m} aria-controls={`${id}-panneau`} tabIndex={mesure === m ? 0 : -1}
              onClick={() => { if (mesure !== m) { vibrer(4); setMesure(m); } }}>
              <span className="adm-courbe-nom">{nomMesure(m, langue)}</span>
              <span className="flex items-baseline gap-2">
                {/* Chiffres proportionnels : en Geist, le 1 tabulaire prend un pied qui, à cette taille, se lit comme une autre fonte. */}
                <span className={total === null ? 'adm-courbe-vide' : 'adm-courbe-chiffre'}>{total === null ? tr('pas encore', 'not yet') : chiffre(total, m, langue)}</span>
                {e.court && <span className="adm-courbe-ecart" data-sens={e.sens}><span aria-hidden="true">{e.court}</span><span className="sr-only">, {e.long}</span></span>}
              </span>
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`${id}-panneau`} aria-labelledby={`${id}-${mesure}`} className="relative">
        {tableau ? (
          <>
            <div className="flex justify-end px-3 pt-2.5"><button type="button" onClick={() => setTableau(false)} className="adm-voir-tableau">{tr('Voir la courbe', 'Show the chart')}</button></div>
            <TableauJours serie={points} hauteur={grand ? 248 : 260} />
          </>
        ) : (
          <>
            <Courbe serie={points} mesure={mesure} />
            <button type="button" onClick={() => setTableau(true)} className="adm-voir-tableau absolute right-3 top-2.5 z-[1]">{tr('Voir en tableau', 'Show as a table')}</button>
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
const ICONES_APPAREILS: Record<string, string> = { Mobile: 'mobile', Tablette: 'tablette', Ordinateur: 'ordinateur' };
/** Une provenance sans marque (Direct, QR code, e-mail, un site) : en gris, à côté des réseaux en couleur. Les liens et les appareils prennent le bleu (voir admin.css). */
const SANS_MARQUE = { picto: '#3d3d39', barre: '#efefec' };

/** `code` à la place d'un logo : les deux lettres d'un pays (« FR »), qu'aucun drapeau ne remplace (jamais d'emoji). */
/** Le nom d'un pays en français, d'après ses deux lettres (« FR » : France) ; « Inconnu » quand Cloudflare ne l'a pas dit. */
function nomPays(code: string, langue: Langue) {
  if (!code) return langue === 'en' ? 'Unknown' : 'Inconnu';
  try { return new Intl.DisplayNames([langue], { type: 'region' }).of(code) ?? code; } catch { return code; }
}

/** Le nom d'une langue d'après son code (« fr » : français), dans la langue du compte. */
function nomLangue(code: string, langue: Langue) {
  try { const n = new Intl.DisplayNames([langue], { type: 'language' }).of(code); return n ? n[0].toUpperCase() + n.slice(1) : code; } catch { return code; }
}
/** Une app nommée par le serveur (« App Instagram ») se dit « Instagram app » en anglais. */
const nomNavigateur = (nom: string, langue: Langue) => (langue === 'en' && nom.startsWith('App ') ? `${nom.slice(4)} app` : nomServeur(nom, langue));

type Ligne = { cle: string; nom: string; icone?: string; code?: string; valeur: number; couleur?: { picto: string; barre: string } };

/**
 * Une répartition : le logo seul devant, le libellé sur une barre pâle à la
 * mesure du premier, le chiffre et la part à droite, dans leurs colonnes, en
 * gris lisible sur le blanc (et non plus posés sur la barre, à 4,27:1). Huit
 * lignes, puis « Tout voir ».
 */
function Repartition({ titre, unite, lignes, total, vide }: { titre: string; unite: string; lignes: Ligne[]; total: number; vide?: string }) {
  const langue = useLangue();
  const tr = choix(langue);
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
      {!lignes.length ? <p className="py-2 text-[14px] text-[#5f5f5a]">{vide ?? tr('Pas encore de données.', 'No data yet.')}</p> : (
        <ol className="flex flex-col gap-1">
          {vues.map(l => (
            <li key={l.cle} style={l.couleur && { '--picto': l.couleur.picto, '--barre': l.couleur.barre } as CSSProperties}>
              {/* Le logo devant la barre, seul : jamais posé sur elle. */}
              {l.icone ? <Icone nom={l.icone} taille={16} className="adm-repartition-picto shrink-0" /> : <span aria-hidden="true" className="adm-repartition-code">{l.code}</span>}
              <span className="adm-repartition-nom">
                <span aria-hidden="true" className="adm-repartition-barre adm-barre origin-left" style={{ width: `${(l.valeur / max) * 100}%` }} />
                <span className="relative truncate">{l.nom}</span>
              </span>
              <span className="adm-repartition-valeur">{nombre(l.valeur, langue)}<span className="sr-only"> {unite.toLowerCase()}</span></span>
              <span className="adm-repartition-part">{total ? `${Math.round((l.valeur / total) * 100)}${langue === 'en' ? '' : ' '}%` : ''}</span>
            </li>
          ))}
        </ol>
      )}
      {lignes.length > 8 && (
        <button type="button" onClick={() => setTout(t => !t)} aria-expanded={tout} className="mt-1.5 min-h-11 text-[13px] font-medium text-bleu underline decoration-bleu/35 underline-offset-2 hover:text-[#1d1fd6] bureau:min-h-8">
          {tout ? tr('Voir moins', 'Show less') : tr(`Tout voir (${lignes.length})`, `Show all (${lignes.length})`)}
        </button>
      )}
    </section>
  );
}

/** Le gain des liens ouverts dans leur app : la promesse de Hopla, en chiffres. */
function OuvertsDansLApp({ apps, actif, onActiver }: { apps: Stats['apps']; actif: boolean; onActiver?: () => void }) {
  const langue = useLangue();
  const tr = choix(langue);
  if (!apps.integres) return null;
  const part = apps.versApp ? Math.round((apps.ouverts / apps.versApp) * 100) : 0;
  return (
    <section aria-labelledby="stats-apps" className="adm-encart adm-repartition">
      <h2 id="stats-apps" className="mb-3 text-[15px] font-semibold tracking-[-0.015em]">{tr('Ouverts dans leur app', 'Opened in their app')}</h2>
      <div className="flex items-end gap-3">
        <p className="text-[24px] font-semibold leading-none tracking-[-0.02em] proportional-nums">{nombre(apps.ouverts, langue)}</p>
        <p className="text-[13.5px] leading-snug text-[#5f5f5a]">{tr(`clic${apps.ouverts > 1 ? 's' : ''} ouvert${apps.ouverts > 1 ? 's' : ''} directement dans YouTube, Spotify, Instagram…`, `click${apps.ouverts === 1 ? '' : 's'} opened straight in YouTube, Spotify, Instagram…`)}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e4e4ff]"><div className="adm-barre h-full origin-left rounded-full bg-bleu" style={{ width: `${part}%` }} /></div>
      <p className="mt-1.5 text-[12px] text-[#5f5f5a]">{tr(`${part} % des ${nombre(apps.versApp)} clics vers une app depuis Instagram ou TikTok`, `${part}% of the ${nombre(apps.versApp, langue)} clicks to an app from Instagram or TikTok`)}</p>
      {!actif && (
        <p className="mt-3 border-t border-[#efefec] pt-3 text-[13px] leading-snug text-[#3d3d39]">
          {tr('L’ouverture dans les apps est coupée sur ta page.', 'Opening in apps is turned off on your page.')} {onActiver && <button type="button" onClick={onActiver} className="font-semibold text-bleu underline underline-offset-2 hover:text-[#1d1fd6]">{tr('La rallumer', 'Turn it back on')}</button>}
        </p>
      )}
    </section>
  );
}

/** Une page que personne n'a encore vue : pas de zéros ni de courbe plate, mais de quoi amener le premier visiteur. */
function PageJamaisVue({ adresse }: { adresse: string }) {
  const tr = choix(useLangue());
  return (
    // Une ligne (critique du 10 novembre 2026) : le QR code a sa place dans la barre et dans Réglages, l'adresse se copie ici.
    <section aria-labelledby="stats-vide" className="adm-encart flex flex-wrap items-center gap-x-3 gap-y-2 py-3 pr-3 pl-4">
      <Icone nom="nav-stats" taille={18} className="shrink-0 text-[#6b6b65]" />
      <div className="min-w-[12rem] flex-1">
        <h2 id="stats-vide" className="text-[15px] font-semibold">{tr('Personne n’a encore vu ta page', 'Nobody has seen your page yet')}</h2>
        <p className="text-[13.5px] text-[#5f5f5a]" translate="no">{sansSchema(adresse)}</p>
      </div>
      <BoutonCopier texte={adresse} onCopie={noterPartage} label={tr('Copier l’adresse de ta page', 'Copy your page’s address')} />
    </section>
  );
}

/** L'historique qu'ouvre une offre : Starter lit 30 jours, Pro un an (d'après `OFFRES`). */
const duree = (jours: number, langue: Langue) => (jours >= 365 ? (langue === 'en' ? 'a year' : 'un an') : `${jours} ${langue === 'en' ? 'days' : 'jours'}`);

/** Ce que lire ses stats apporte, pour une offre qui ne les montre pas (Gratuit) : elles se comptent déjà, Starter les ouvre. */
function StatsReservees({ onOffres, liste, semaine }: { onOffres?: Proprietes['onOffres']; liste?: ReactNode; semaine?: Proprietes['semaine'] }) {
  const langue = useLangue();
  const tr = choix(langue);
  const [vues, setVues] = useState<Semaine | null>(null);
  useEffect(() => { let vivant = true; semaine?.().then(s => { if (vivant) setVues(s); }).catch(() => {}); return () => { vivant = false; }; }, [semaine]);
  const lignes = [tr('Tes vues, tes visiteurs et tes clics, jour par jour', 'Your views, visitors and clicks, day by day'), tr('Tes liens les plus cliqués', 'Your most clicked links'), tr('D’où viennent tes visiteurs, et sur quel appareil', 'Where your visitors come from, and on which device'), tr('Le résumé de ta semaine, chaque lundi par e‑mail', 'Your weekly summary, every Monday by email')];
  return (
    <div className="flex flex-col gap-5">
      {vues?.dejaVue ? <VuesSemaine semaine={vues} /> : <p className="adm-stats-phrase">{tr('Tes visites se comptent déjà, sans cookie. Il ne reste qu’à les lire.', 'Your visits are already counted, without cookies. All that’s left is to read them.')}</p>}
      {/* Au bureau, ce que Starter ouvre et la liste côte à côte : deux cartes de même hauteur, sans une carte de 1120 px à moitié vide. */}
      <div className="grid gap-5 lg:grid-cols-2">
      {/* Les deux encarts viennent du même composant : titres, badges et textes sur les mêmes lignes. */}
      <Carte nu titre={tr('Tes stats', 'Your analytics')} etiquette={<Etiquette fonction="stats" />} className="adm-encart p-5 bureau:px-6">
        <p className="text-[13.5px] leading-snug text-white/70">{tr(`Avec Hopla ${OFFRES.starter.nom}, tu les lis sur ${duree(OFFRES.starter.jours, langue)}, et sur ${duree(OFFRES.pro.jours, langue)} avec ${OFFRES.pro.nom} :`, `With Hopla ${OFFRES.starter.nom}, you read them over ${duree(OFFRES.starter.jours, langue)}, and over ${duree(OFFRES.pro.jours, langue)} with ${OFFRES.pro.nom}:`)}</p>
        <ul className="mt-4 flex flex-col gap-2">
          {lignes.map(l => (
            <li key={l} className="flex gap-2.5 text-pretty text-[14px] leading-snug">
              <span className="mt-0.5 shrink-0" aria-hidden="true"><Icone nom="ui-ok" taille={16} /></span>{l}
            </li>
          ))}
        </ul>
        {onOffres && <button type="button" onClick={() => onOffres('stats')} aria-haspopup="dialog" className={`${classeBouton.principal} mt-5`}>{tr('Voir les offres', 'See the plans')}</button>}
      </Carte>
      {liste}
      </div>
    </div>
  );
}

/**
 * Le seul chiffre que Gratuit lit (24 octobre 2026, Lilian : « oui » à « un chiffre de stats en Gratuit ») : les vues
 * des 7 derniers jours et leur écart avec les 7 d'avant. On paie plus volontiers pour lire ce qu'on voit grandir.
 */
function VuesSemaine({ semaine }: { semaine: Semaine }) {
  const langue = useLangue();
  const tr = choix(langue);
  const e = ecart({ vues: semaine.vues, visiteurs: 0, clics: 0, precedent: { vues: semaine.avant, visiteurs: 0, clics: 0 } }, 'vues', langue);
  return (
    <section aria-labelledby="stats-semaine" className="adm-encart p-5 bureau:px-6">
      <h2 id="stats-semaine" className="text-[14px] text-white/70">{tr('Vues ces 7 derniers jours', 'Views in the last 7 days')}</h2>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[40px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{chiffre(semaine.vues, 'vues', langue)}</span>
        {e.court && <span className="adm-courbe-ecart" data-sens={e.sens}><span aria-hidden="true">{e.court}</span><span className="sr-only">, {e.long}</span></span>}
      </p>
      <p className="mt-2 text-[13.5px] leading-snug text-white/70">{tr('Le détail jour par jour, tes liens et d’où viennent tes visiteurs s’ouvrent avec Starter.', 'Day-by-day detail, your links and where your visitors come from open up with Starter.')}</p>
    </section>
  );
}

type Proprietes = {
  /** Les stats des derniers jours (`30`), ou de dates choisies (`{ du, au }`). */
  charger: (periode: PeriodeStats) => Promise<Stats>; adresse: string; pseudo: string; joursMax?: number;
  /** Ouvre les offres par-dessus les stats, sur celle qui débloque `pour`, ou sur `vers` (un an de stats : Pro). */
  onOffres?: (pour?: Fonction, vers?: PlanPayant) => void;
  ouvrirApps?: boolean; onActiverApps?: () => void; liste?: ReactNode;
  /** Les blocs de la page : chaque lien de la liste prend son picto. */
  blocs?: Bloc[];
  /** Les vues de la semaine, montrées quand l'offre ne lit pas ses stats. */
  semaine?: () => Promise<Semaine>;
  /** L'adresse du fichier CSV des stats ; absente dans l'aperçu. */
  urlExport?: string | null;
};

/**
 * La période ramenée à l'historique de l'offre, s'il change en cours de route (un abonnement qui prend fin) :
 * les dates resserrées sur lui, une durée trop longue remplacée par la plus longue qu'il ouvre.
 */
function dansHistorique(p: PeriodeStats, joursMax: number): PeriodeStats {
  const ouvertes = DUREES.filter(j => j <= joursMax);
  const repli = ouvertes[ouvertes.length - 1] ?? DUREES[0];
  if (typeof p === 'number') return p <= joursMax ? p : repli;
  return borner(p, joursMax, jourDe(Date.now())) ?? repli;
}

/**
 * `joursMax` : l'historique que l'offre laisse lire (aucun en Gratuit, 30 jours en Starter, un an en Pro ;
 * 7 pour une page d'avant les offres). Sans historique, rien ne se charge : l'onglet dit ce que Starter ouvre.
 * `onOffres` mène aux offres.
 */
export function OngletStats(props: Proprietes) {
  if (props.joursMax !== undefined && props.joursMax <= 0) return <StatsReservees onOffres={props.onOffres} liste={props.liste} semaine={props.semaine} />;
  return <TableauStats {...props} />;
}

function TableauStats({ charger, adresse, pseudo, joursMax = 365, onOffres, ouvrirApps = true, onActiverApps, liste, blocs = [], urlExport }: Proprietes) {
  const langue = useLangue();
  const tr = choix(langue);
  const grand = useGrandEcran();
  const [choisie, setChoix] = useState<PeriodeStats>(() => Math.min(30, joursMax));
  const periode = dansHistorique(choisie, joursMax);
  const cle = cleDe(periode);
  const [stats, setStats] = useState<Stats | null>(null);
  const [erreur, setErreur] = useState(false);
  // Pendant qu'une autre période se charge, les chiffres d'avant pâlissent : on voit qu'ils vont changer.
  const [charge, setCharge] = useState(true);
  const [essai, setEssai] = useState(0);
  // La période se suit par sa clé (`30`, `2026-10-12/2026-10-18`) : les mêmes dates relues ne rechargent rien.
  useEffect(() => {
    let annule = false;
    setErreur(false); setCharge(true);
    charger(periode).then(s => { if (!annule) setStats(s); }).catch(() => { if (!annule) setErreur(true); }).finally(() => { if (!annule) setCharge(false); });
    return () => { annule = true; };
  }, [cle, charger, essai]); // eslint-disable-line react-hooks/exhaustive-deps

  // La période ne se montre qu'à une page déjà vue : avant, il n'y a rien à comparer. Pendant le premier chargement, elle reste.
  const choixPeriode = stats && !stats.dejaVue ? null : (
    <ChoixPeriode periode={periode} joursMax={joursMax} onChoisir={setChoix} onOffres={onOffres && (vers => onOffres(undefined, vers))} grand={grand} />
  );

  const lignesLiens: Ligne[] = (stats?.blocs ?? []).map(b => {
    const bloc = blocs.find(x => x.id === b.id);
    return { cle: b.id, nom: nomServeur(b.titre, langue), valeur: b.clics, icone: bloc?.icone || (bloc ? typeDe(bloc).picto : 'bloc-lien') };
  });
  const lignesSources: Ligne[] = (stats?.sources ?? []).map(s => ({ cle: s.nom, nom: nomServeur(s.nom, langue), valeur: s.vues, icone: ICONES_SOURCES[s.nom] ?? 'site', couleur: COULEURS_SOURCES[s.nom] ?? SANS_MARQUE }));
  const lignesAppareils: Ligne[] = (stats?.appareils ?? []).map(s => ({ cle: s.nom, nom: nomServeur(s.nom, langue), valeur: s.vues, icone: ICONES_APPAREILS[s.nom] ?? 'ordinateur' }));
  const lignesPays: Ligne[] = (stats?.pays ?? []).map(p => ({ cle: p.code || '?', nom: nomPays(p.code, langue), valeur: p.vues, code: p.code }));
  const lignesVilles: Ligne[] = (stats?.villes ?? []).map(v => ({ cle: `${v.code}/${v.nom}`, nom: v.nom, valeur: v.vues, code: v.code }));
  const lignesSystemes: Ligne[] = (stats?.systemes ?? []).map(s => ({ cle: s.nom, nom: nomServeur(s.nom, langue), valeur: s.vues, icone: s.nom === 'iOS' || s.nom === 'Android' ? 'mobile' : 'ordinateur' }));
  const lignesNavigateurs: Ligne[] = (stats?.navigateurs ?? []).map(s => ({ cle: s.nom, nom: nomNavigateur(s.nom, langue), valeur: s.vues, icone: s.nom.startsWith('App') ? 'mobile' : 'site' }));
  const lignesLangues: Ligne[] = (stats?.langues ?? []).map(s => ({ cle: s.nom, nom: nomLangue(s.nom, langue), valeur: s.vues, code: s.nom.slice(0, 2).toUpperCase() }));
  // Le fichier de la période affichée : la même durée, ou les mêmes dates.
  const fichier = urlExport ? `${urlExport}?${typeof periode === 'number' ? `periode=${periode}` : `du=${periode.du}&au=${periode.au}`}` : null;
  const note = <p className="text-[12px] leading-snug text-[#5f5f5a]">{tr('Sans cookie : un visiteur compte une fois par jour, toi jamais.', 'No cookies: a visitor counts once a day, you never do.')}</p>;

  return (
    <div className="adm-stats mx-auto flex w-full max-w-[1200px] flex-col gap-5 lg:max-w-none">
      {choixPeriode && (grand ? <ActionEntete>{choixPeriode}</ActionEntete> : <div className="-mt-2">{choixPeriode}</div>)}
      {erreur && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-red-500/15 py-1.5 pr-1.5 pl-3.5 text-[14px] text-red-200">
          {tr('Les statistiques ne se chargent pas.', 'Your analytics won’t load.')}
          <button type="button" onClick={() => setEssai(n => n + 1)} className={`${classeBouton.secondaire} shrink-0`}>{tr('Réessayer', 'Try again')}</button>
        </div>
      )}
      {!stats ? (!erreur && <div className="h-[420px] animate-pulse rounded-xl bg-[#f4f4f2] motion-reduce:animate-none" role="status" aria-label={tr('Chargement des statistiques', 'Loading analytics')} />) : !stats.dejaVue ? (
        <>
          <PageJamaisVue adresse={adresse} />
          {liste}
          {note}
        </>
      ) : (
        <div className={`flex flex-col gap-5 transition-opacity duration-200 ${charge ? 'opacity-50' : ''}`} aria-busy={charge}>
          <p className="adm-stats-phrase"><Phrase texte={enUnePhrase(stats, undefined, langue)} /></p>
          <CourbeAOnglets stats={stats} />
          {/* Deux encarts par rangée, trois sur un grand écran, de même hauteur : pas d'escalier entre Liens et Réseaux.
              Ta liste ferme la grille, à côté des autres plutôt que seule sur toute la largeur. */}
          <div className="adm-stats-grille grid gap-5">
            <Repartition titre={tr('Liens', 'Links')} unite={nomMesure('clics', langue)} lignes={lignesLiens} total={stats.clics} vide={tr('Aucun clic sur cette période.', 'No clicks in this period.')} />
            <Repartition titre={tr('Réseaux', 'Networks')} unite={nomMesure('vues', langue)} lignes={lignesSources} total={stats.vues} />
            <Repartition titre={tr('Appareils', 'Devices')} unite={nomMesure('vues', langue)} lignes={lignesAppareils} total={stats.vues} />
            <Repartition titre={tr('Pays', 'Countries')} unite={nomMesure('vues', langue)} lignes={lignesPays} total={stats.vues} />
            {/* Les villes ne viennent que lorsque le réseau les transmet : sans elles, pas d'encart vide. */}
            {lignesVilles.length > 0 && <Repartition titre={tr('Villes', 'Cities')} unite={nomMesure('vues', langue)} lignes={lignesVilles} total={stats.vues} />}
            {lignesSystemes.length > 0 && <Repartition titre={tr('Systèmes', 'Operating systems')} unite={nomMesure('vues', langue)} lignes={lignesSystemes} total={stats.vues} />}
            {lignesNavigateurs.length > 0 && <Repartition titre={tr('Navigateurs', 'Browsers')} unite={nomMesure('vues', langue)} lignes={lignesNavigateurs} total={stats.vues} />}
            {lignesLangues.length > 0 && <Repartition titre={tr('Langues', 'Languages')} unite={nomMesure('vues', langue)} lignes={lignesLangues} total={stats.vues} />}
            <OuvertsDansLApp apps={stats.apps} actif={ouvrirApps} onActiver={onActiverApps} />
            {liste}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            {note}
            {fichier && <a href={fichier} download className={classeBouton.secondaire}><Icone nom="telecharger" taille={16} />{tr('Exporter en CSV', 'Export as CSV')}</a>}
          </div>
        </div>
      )}
    </div>
  );
}
