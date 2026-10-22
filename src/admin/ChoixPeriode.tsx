import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import { Icone } from '../components/Icone.tsx';
import { OFFRES, PLANS_PAYANTS } from '../lib/abonnement.ts';
import type { PlanPayant } from '../lib/abonnement.ts';
import type { PeriodeStats, Plage } from '../lib/periode.ts';
import { DUREES, ajouterJours, borner, jourDe, joursEntre, longueur, nomCourt, nomMois, nomPlage, plageDe, premierJour } from '../lib/periode.ts';
import { BoutonPrincipal, Feuille, arretRadio, classeBadge, classeBouton, flechesRadio, vibrer } from './ui.tsx';

/*
 * La période des stats (22 octobre 2026, demandé par Lilian : « juste appuyer
 * pour avoir 7 jours, 14 jours », plutôt qu'un menu, et choisir ses dates
 * « d'une date A à une date Z » dans un calendrier). Des boutons collés sur un
 * rail gris, comme Mensuel et Annuel dans les offres : 7 j, 14 j, 30 j, 90 j,
 * 12 mois, puis, après un trait, le calendrier. La période prise est blanche,
 * son nom en bleu ; l'agenda seul, sans fond ni cadre, passe juste au bleu
 * (au bureau, les dates écrites à côté, il redevient un bouton blanc). Au-delà
 * de l'historique de l'offre, un bouton par offre qui
 * va plus loin, à son étiquette (« 30 j Starter », « 12 mois Pro ») : il ouvre
 * les offres sur elle.
 *
 * Le calendrier monte en feuille au téléphone (un mois, qu'on change d'un
 * glissé ou des flèches) et s'ouvre sous son bouton au bureau (deux mois). On
 * touche le premier jour, puis le dernier ; les jours s'arrêtent à
 * l'historique de l'offre, et à aujourd'hui.
 */

/** Chaque durée en entier, pour un lecteur d'écran : le bouton dit « 7 j ». */
const NOMS: Record<number, string> = { 7: '7 derniers jours', 14: '14 derniers jours', 30: '30 derniers jours', 90: '90 derniers jours', 365: '12 derniers mois' };
const libelle = (j: number) => (j === 365 ? '12 mois' : `${j} j`);
const duree = (jours: number) => (jours >= 365 ? 'un an' : `${jours} jours`);

export function ChoixPeriode({ periode, joursMax, onChoisir, onOffres, grand }: {
  periode: PeriodeStats;
  /** L'historique que l'offre laisse lire, en jours. */
  joursMax: number;
  onChoisir: (p: PeriodeStats) => void;
  /** Ouvre les offres sur `vers` ; absent quand le compte ne peut pas s'abonner (aperçu, compte principal). */
  onOffres?: (vers: PlanPayant) => void;
  grand: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [choix, setChoix] = useState<Choix>({ du: null, au: null });
  const bouton = useRef<HTMLButtonElement>(null);
  const aujourdhui = jourDe(Date.now());
  const min = premierJour(joursMax, aujourdhui);
  const plage = typeof periode === 'number' ? null : periode;
  const ouvertes = DUREES.filter(j => j <= joursMax);
  // Plus loin que l'historique : une durée par offre en vente qui l'allonge, la plus longue qu'elle ouvre.
  const fermees = onOffres ? PLANS_PAYANTS.filter(o => OFFRES[o].enVente && OFFRES[o].jours > joursMax)
    .map(o => ({ offre: o, jours: Math.max(...DUREES.filter(j => j <= OFFRES[o].jours)) }))
    .filter((f, i, l) => f.jours > joursMax && l.findIndex(g => g.jours === f.jours) === i) : [];

  function ouvrir() {
    // Le calendrier s'ouvre sur la période qu'on regarde : on voit ce qu'on change.
    const p = borner(plageDe(periode, aujourdhui), joursMax, aujourdhui) ?? { du: aujourdhui, au: aujourdhui };
    setChoix({ du: p.du, au: p.au });
    setOuvert(true);
  }
  function toucher(jour: string) {
    vibrer(4);
    setChoix(c => (!c.du || c.au ? { du: jour, au: null } : jour < c.du ? { du: jour, au: c.du } : { du: c.du, au: jour }));
  }
  const pret: Plage | null = choix.du ? { du: choix.du, au: choix.au ?? choix.du } : null;
  function valider() {
    if (!pret) return;
    setOuvert(false);
    // Les derniers jours choisis à la main redeviennent leur bouton : « 7 j », et « En 7 jours » dans la phrase.
    const n = longueur(pret);
    onChoisir(pret.au === aujourdhui && (ouvertes as readonly number[]).includes(n) ? n : pret);
  }
  const jours = pret ? longueur(pret) : 0;
  const geste = jours === 1 ? 'Voir ce jour' : `Voir ces ${jours} jours`;
  const plusLoin = fermees[0]?.offre;

  const calendrier = (fermer: (apres?: () => void) => void) => (
    <Calendrier min={min} max={aujourdhui} aujourdhui={aujourdhui} choix={choix} onToucher={toucher}
      mois={grand && min.slice(0, 7) !== aujourdhui.slice(0, 7) ? 2 : 1}
      plusLoin={plusLoin && (
        <button type="button" aria-haspopup="dialog" onClick={() => fermer(() => onOffres?.(plusLoin))} className="adm-cal-plus">
          Tes stats sur {duree(OFFRES[plusLoin].jours)} avec {OFFRES[plusLoin].nom}
        </button>
      )} />
  );

  return (
    <div className="relative">
      <div className="adm-periodes">
        <div role="radiogroup" aria-label="Période" onKeyDown={e => flechesRadio(e)} className="adm-periodes-groupe" style={{ '--n': ouvertes.length } as CSSProperties}>
          {ouvertes.map((j, i) => (
            <button key={j} type="button" role="radio" aria-checked={periode === j} aria-label={NOMS[j]}
              tabIndex={arretRadio(periode === j, i === 0, !ouvertes.some(o => o === periode))}
              onClick={() => { if (periode !== j) { vibrer(4); onChoisir(j); } }}>
              {libelle(j)}
            </button>
          ))}
        </div>
        {fermees.length > 0 && (
          <div className="adm-periodes-groupe" style={{ '--n': fermees.length } as CSSProperties}>
            {fermees.map(f => (
              <button key={f.offre} type="button" data-verrou="" aria-haspopup="dialog" aria-label={`${NOMS[f.jours]}, avec ${OFFRES[f.offre].nom} : voir les offres`} onClick={() => onOffres?.(f.offre)}>
                {libelle(f.jours)}<span className={classeBadge} data-offre={f.offre}>{OFFRES[f.offre].nom}</span>
              </button>
            ))}
          </div>
        )}
        <span aria-hidden="true" className="adm-periodes-trait" />
        <button ref={bouton} type="button" className="adm-periodes-dates" data-pris={plage ? '' : undefined} data-texte={plage && grand ? '' : undefined} aria-haspopup="dialog" aria-expanded={ouvert}
          title={grand ? (plage ? 'Changer de dates' : 'Choisir des dates') : undefined}
          onClick={() => (ouvert ? setOuvert(false) : ouvrir())}>
          <Icone nom="agenda" taille={16} className="shrink-0" />
          {plage && grand && <span aria-hidden="true">{nomCourt(plage, aujourdhui)}</span>}
          <span className="sr-only">{plage ? `Dates choisies : ${nomPlage(plage, aujourdhui).toLowerCase()}. Changer de dates` : 'Choisir des dates'}</span>
        </button>
      </div>
      {grand ? ouvert && (
        <Bulle ancre={bouton} onFermer={() => setOuvert(false)} label="Choisir des dates">
          {calendrier(apres => { setOuvert(false); apres?.(); })}
          <div className="adm-cal-pied">
            <button type="button" onClick={() => { setOuvert(false); bouton.current?.focus(); }} className={classeBouton.discret}>Annuler</button>
            <BoutonPrincipal disabled={!pret} onClick={() => { valider(); bouton.current?.focus(); }}>{geste}</BoutonPrincipal>
          </div>
        </Bulle>
      ) : (
        <Feuille ouverte={ouvert} onFermer={() => setOuvert(false)} titre="Choisir des dates"
          pied={fermer => <BoutonPrincipal disabled={!pret} onClick={() => fermer(valider)} className="w-full">{geste}</BoutonPrincipal>}>
          {fermer => calendrier(fermer)}
        </Feuille>
      )}
    </div>
  );
}

/** Le choix en cours : le premier jour touché, puis le dernier (rien tant qu'il n'est pas touché). */
interface Choix { du: string | null; au: string | null }

/** Le premier du mois d'un jour : `2026-10-01`. */
const moisDe = (jour: string) => `${jour.slice(0, 7)}-01`;
/** Le premier du mois, `n` mois plus tard (ou plus tôt). */
function decalerMois(mois: string, n: number) {
  const m = Number(mois.slice(0, 4)) * 12 + Number(mois.slice(5, 7)) - 1 + n;
  return `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, '0')}-01`;
}
/** Le même quantième dans `mois`, ou son dernier jour s'il n'existe pas (le 31 octobre, en novembre : le 30). */
function dansMois(mois: string, jour: string) {
  const dernier = joursEntre(mois, decalerMois(mois, 1));
  return `${mois.slice(0, 8)}${String(Math.min(Number(jour.slice(8)), dernier)).padStart(2, '0')}`;
}
/** Les semaines d'un mois, du lundi au dimanche : `null` pour les cases d'avant le 1er et d'après le dernier. */
function semaines(mois: string): (string | null)[][] {
  const decalage = (new Date(`${mois}T00:00:00Z`).getUTCDay() + 6) % 7;
  const nombre = joursEntre(mois, decalerMois(mois, 1));
  const cases = Array.from({ length: Math.ceil((decalage + nombre) / 7) * 7 }, (_, i) => (i >= decalage && i < decalage + nombre ? ajouterJours(mois, i - decalage) : null));
  return Array.from({ length: cases.length / 7 }, (_, s) => cases.slice(s * 7, s * 7 + 7));
}
const JOURS_SEMAINE = [['L', 'lundi'], ['M', 'mardi'], ['M', 'mercredi'], ['J', 'jeudi'], ['V', 'vendredi'], ['S', 'samedi'], ['D', 'dimanche']];
const nomJour = (jour: string) => new Date(`${jour}T12:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Un ou deux mois à la suite. Le premier et le dernier jour du choix en bleu
 * plein, ceux d'entre eux sur une bande pâle ; tant que le dernier n'est pas
 * touché, la bande s'esquisse jusqu'au jour sous la souris. Au clavier, les
 * flèches vont de jour en jour (motif ARIA de la grille), Page précédente et
 * Page suivante de mois en mois. Un mois a toujours la hauteur de six
 * semaines : la fenêtre ne saute pas d'un mois à l'autre.
 */
function Calendrier({ min, max, aujourdhui, choix, onToucher, mois: nombre, plusLoin }: {
  min: string; max: string; aujourdhui: string; choix: Choix; onToucher: (jour: string) => void; mois: 1 | 2; plusLoin?: ReactNode;
}) {
  const id = useId();
  const cible = choix.au ?? choix.du ?? max;
  // Le premier mois montré : celui du dernier jour choisi (au bureau, avec le mois d'avant), sans sortir de l'historique.
  const caler = (m: string) => {
    const dernier = decalerMois(moisDe(max), 1 - nombre);
    return m > dernier ? dernier : m < moisDe(min) ? moisDe(min) : m;
  };
  const [vue, setVue] = useState(() => caler(decalerMois(moisDe(cible), 1 - nombre)));
  const [focus, setFocus] = useState(cible);
  const [survol, setSurvol] = useState<string | null>(null);
  const grilles = useRef<HTMLDivElement>(null);
  // Le focus suit le jour pris au clavier, une fois le mois affiché. À l'ouverture, il va sur le dernier jour choisi, une
  // image plus tard : la feuille note d'abord d'où vient le focus, pour l'y rendre en se refermant.
  const clavier = useRef(false);
  const ouverture = useRef(true);
  useLayoutEffect(() => {
    const jour = () => grilles.current?.querySelector<HTMLButtonElement>(`[data-jour="${focus}"]`);
    if (ouverture.current) {
      const image = requestAnimationFrame(() => { ouverture.current = false; jour()?.focus({ preventScroll: true }); });
      return () => cancelAnimationFrame(image);
    }
    if (!clavier.current && grilles.current?.contains(document.activeElement)) return;
    clavier.current = false;
    jour()?.focus({ preventScroll: true });
  }, [focus, vue]);

  const moisVus = Array.from({ length: nombre }, (_, i) => decalerMois(vue, i));
  const avant = vue > moisDe(min), apres = moisVus[nombre - 1] < moisDe(max);
  const borne = (jour: string) => (jour < min ? min : jour > max ? max : jour);

  function aller(jour: string) {
    const j = borne(jour);
    clavier.current = true;
    setFocus(j);
    if (moisDe(j) < vue) setVue(moisDe(j));
    else if (moisDe(j) > moisVus[nombre - 1]) setVue(decalerMois(moisDe(j), 1 - nombre));
  }
  function touche(e: React.KeyboardEvent) {
    if (!(e.target as HTMLElement).dataset.jour) return;
    const lundi = (new Date(`${focus}T00:00:00Z`).getUTCDay() + 6) % 7;
    const pas: Record<string, () => string> = {
      ArrowLeft: () => ajouterJours(focus, -1), ArrowRight: () => ajouterJours(focus, 1),
      ArrowUp: () => ajouterJours(focus, -7), ArrowDown: () => ajouterJours(focus, 7),
      Home: () => ajouterJours(focus, -lundi), End: () => ajouterJours(focus, 6 - lundi),
      PageUp: () => dansMois(decalerMois(moisDe(focus), -1), focus), PageDown: () => dansMois(decalerMois(moisDe(focus), 1), focus),
    };
    if (!pas[e.key]) return;
    e.preventDefault();
    aller(pas[e.key]());
  }
  function changerMois(n: number) {
    vibrer(4);
    const v = decalerMois(vue, n);
    setVue(v);
    setSurvol(null);
    // Le jour qui garde la tabulation passe dans le mois montré.
    setFocus(borne(dansMois(v, focus)));
  }

  // Un glissé de côté au téléphone change de mois, comme dans le calendrier d'iOS ; le toucher qui le finit ne choisit pas de jour.
  const glisse = useRef<{ x: number; y: number } | null>(null);
  const glisseFini = useRef(0);
  const glisser = {
    onPointerDown: (e: React.PointerEvent) => { if (e.pointerType !== 'mouse') glisse.current = { x: e.clientX, y: e.clientY }; },
    onPointerUp: (e: React.PointerEvent) => {
      const g = glisse.current;
      glisse.current = null;
      if (!g) return;
      const dx = e.clientX - g.x, dy = e.clientY - g.y;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      glisseFini.current = performance.now();
      if (dx > 0 && avant) changerMois(-1);
      if (dx < 0 && apres) changerMois(1);
    },
    onPointerCancel: () => { glisse.current = null; },
  };

  // La bande : le choix entier, ou son esquisse jusqu'au jour sous la souris tant que le dernier jour manque.
  const esquisse = !!choix.du && !choix.au;
  const [de, a] = choix.du && choix.au ? [choix.du, choix.au]
    : choix.du && survol && survol !== choix.du ? (survol < choix.du ? [survol, choix.du] : [choix.du, survol])
    : [null, null];
  const bande = (jour: string) => (!de || !a || de === a || jour < de || jour > a ? undefined : jour === de ? 'debut' : jour === a ? 'fin' : 'milieu');
  const choisi = (jour: string) => (!choix.du ? false : choix.au ? jour >= choix.du && jour <= choix.au : jour === choix.du);

  const resume = !choix.du ? '' : choix.au ? nomPlage({ du: choix.du, au: choix.au }, aujourdhui) : `${nomPlage({ du: choix.du, au: choix.du }, aujourdhui).replace(/^Le /, 'Du ')} au …`;

  return (
    <div className="adm-cal-boite">
      <p className="adm-cal-resume" aria-live="polite">{resume}</p>
      <div ref={grilles} className="adm-cal-mois" data-nombre={nombre} onKeyDown={touche} onPointerLeave={() => setSurvol(null)} {...glisser}>
        {moisVus.map((m, k) => {
          const lignes = semaines(m);
          return (
            <div key={m} className="min-w-0">
              <div className="adm-cal-entete">
                {k === 0 ? (
                  <button type="button" onClick={() => changerMois(-1)} disabled={!avant} aria-label="Mois précédent" className={`${classeBouton.icone} adm-cal-fleche`}>
                    <Icone nom="ui-chevron" taille={18} className="rotate-90" />
                  </button>
                ) : <span aria-hidden="true" className="adm-cal-place" />}
                <h3 id={`${id}-${k}`} className="adm-cal-titre" aria-live={k === 0 ? 'polite' : undefined}>{nomMois(m)}</h3>
                {k === nombre - 1 ? (
                  <button type="button" onClick={() => changerMois(1)} disabled={!apres} aria-label="Mois suivant" className={`${classeBouton.icone} adm-cal-fleche`}>
                    <Icone nom="ui-chevron" taille={18} className="-rotate-90" />
                  </button>
                ) : <span aria-hidden="true" className="adm-cal-place" />}
              </div>
              <table role="grid" aria-labelledby={`${id}-${k}`} aria-multiselectable="true" className="adm-cal" style={{ '--semaines': lignes.length } as CSSProperties}>
                <thead>
                  <tr>{JOURS_SEMAINE.map(([court, long]) => <th key={long} scope="col"><span aria-hidden="true">{court}</span><span className="sr-only">{long}</span></th>)}</tr>
                </thead>
                <tbody>
                  {lignes.map((semaine, s) => (
                    <tr key={s}>
                      {semaine.map((jour, c) => {
                        if (!jour) return <td key={c} />;
                        const hors = jour < min || jour > max;
                        const bout = jour === choix.du || jour === choix.au;
                        // La bande s'arrondit au bout des semaines et du mois.
                        const bordG = c === 0 || jour.endsWith('-01'), bordD = c === 6 || moisDe(ajouterJours(jour, 1)) !== m;
                        return (
                          <td key={c} role="gridcell" aria-selected={choisi(jour)} data-bande={bande(jour)} data-esquisse={esquisse || undefined}
                            data-bout={bout || undefined} data-vise={(esquisse && jour === survol && !bout) || undefined}
                            data-bord-g={bordG || undefined} data-bord-d={bordD || undefined}>
                            <button type="button" data-jour={jour} disabled={hors} tabIndex={jour === focus ? 0 : -1}
                              aria-current={jour === aujourdhui ? 'date' : undefined}
                              aria-label={`${nomJour(jour)}${bout && choix.au && choix.du !== choix.au ? (jour === choix.du ? ', premier jour' : ', dernier jour') : ''}`}
                              onClick={() => { if (performance.now() - glisseFini.current < 400) return; setFocus(jour); onToucher(jour); }}
                              onPointerEnter={e => { if (e.pointerType === 'mouse' && !hors) setSurvol(jour); }}
                              className="adm-cal-jour">
                              {Number(jour.slice(8))}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
      {plusLoin}
    </div>
  );
}

/**
 * Une fenêtre posée sous son bouton, au bureau : un clic ailleurs ou Échap la
 * referme (le focus revient au bouton), et la touche Tab y tourne en rond.
 */
function Bulle({ ancre, onFermer, label, children }: { ancre: RefObject<HTMLButtonElement | null>; onFermer: () => void; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const fermerRef = useRef(onFermer);
  fermerRef.current = onFermer;
  useEffect(() => {
    const dehors = (e: PointerEvent) => { const t = e.target as Node; if (!ref.current?.contains(t) && !ancre.current?.contains(t)) fermerRef.current(); };
    document.addEventListener('pointerdown', dehors);
    return () => document.removeEventListener('pointerdown', dehors);
  }, [ancre]);
  function touche(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fermerRef.current(); ancre.current?.focus(); return; }
    if (e.key !== 'Tab' || !ref.current) return;
    const cibles = [...ref.current.querySelectorAll<HTMLElement>('button:not([disabled])')].filter(b => b.tabIndex >= 0);
    const premier = cibles[0], dernier = cibles[cibles.length - 1];
    if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier?.focus(); }
    else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier?.focus(); }
  }
  return (
    <div ref={ref} role="dialog" aria-label={label} onKeyDown={touche} className="adm-menu adm-fondu adm-cal-bulle absolute right-0 top-full z-50 mt-2">
      {children}
    </div>
  );
}
