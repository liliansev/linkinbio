import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Icone } from '../components/Icone.tsx';
import { Symbole } from '../components/Logo.tsx';
import { POLICES, THEMES } from '../lib/themes.ts';
import { NOMS_AUDIENCES, composerAudience } from '../lib/provenance.ts';
import { PROFILS, BLOCS_EXEMPLES } from './exemples.ts';
import { mouvementReduit, useVu } from './mouvement.ts';

/*
 * La roue de l'ouverture (20 octobre 2026, à la demande de Lilian) : les
 * réseaux tournent sur une roue, et chaque visiteur en part, passe par le
 * même lien Hopla, puis descend vers la page rangée pour son réseau. À son
 * arrivée, la page fait un petit bond ; la première fois, le lien de ce
 * réseau se glisse en tête, dans la couleur du réseau, qu'il garde : au repos,
 * on lit encore quel réseau a rangé chaque page. Camille Nguyen, une photographe inventée, dans le thème
 * Neige. Le trafic se joue
 * une fois, puis la roue ralentit et s'arrête ; « Passer » le saute, « Revoir » le rejoue. Avec
 * moins de mouvement, les quatre pages sont déjà rangées.
 *
 * Le dessin est en HTML (roue, lien, pages) ; les chemins et les traînées sont
 * dans un SVG mesuré sur la scène ; les visiteurs se déplacent hors de React,
 * image par image, le long de ces chemins.
 */

const RESEAUX = ['instagram', 'tiktok', 'youtube', 'linkedin'] as const;
type Reseau = (typeof RESEAUX)[number];
const COULEURS: Record<Reseau, string> = { instagram: '#d62976', tiktok: '#111111', youtube: '#e00000', linkedin: '#0a66c2' };
/** Le lien que la page met en tête pour chaque réseau. */
const PAGES = Object.fromEntries(RESEAUX.map(r => [r, composerAudience(BLOCS_EXEMPLES.camille, r)])) as Record<Reseau, typeof BLOCS_EXEMPLES.camille>;
const EN_TETE = Object.fromEntries(RESEAUX.map(r => [r, PAGES[r][0]])) as Record<Reseau, typeof BLOCS_EXEMPLES.camille[number]>;
const THEME = THEMES.find(t => t.id === 'neige')!;
const POLICE = POLICES[THEME.police];

/** Qui arrive, et quand (ms) : les quatre premiers un par un, le temps de voir chaque page se ranger, puis la foule. */
const VISITES: [number, Reseau][] = [
  [300, 'instagram'], [1050, 'tiktok'], [1800, 'youtube'], [2550, 'linkedin'],
  [3150, 'tiktok'], [3500, 'instagram'], [3800, 'tiktok'], [4150, 'youtube'], [4450, 'instagram'],
  [4800, 'tiktok'], [5100, 'linkedin'], [5450, 'youtube'], [5750, 'instagram'], [6100, 'tiktok'],
];
const TRAJET = 1650;
/** Degrés par seconde pendant le trafic ; ensuite la roue ralentit et s'arrête. */
const VITESSE = 26, FREIN = 0.7;
const PAR_RESEAU = 4;

const facile = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

interface Geo { cx: number; cy: number; r: number; bas: number; pages: { x: number; y: number }[]; w: number; h: number; base: number[] }

export function Roue() {
  const [refVu, vu] = useVu<HTMLDivElement>(0.6);
  const scene = useRef<HTMLDivElement>(null);
  const anneau = useRef<HTMLDivElement>(null);
  const lien = useRef<HTMLDivElement>(null);
  const pages = useRef<(HTMLDivElement | null)[]>([]);
  const ondes = useRef<(HTMLSpanElement | null)[]>([]);
  const points = useRef<(HTMLSpanElement | null)[]>([]);
  const traines = useRef<(SVGPathElement | null)[]>([]);
  const geo = useRef<Geo | null>(null);
  // L'angle où la roue s'est arrêtée : « Revoir » repart de là.
  const arret = useRef(0);
  const [traces, setTraces] = useState<{ w: number; h: number; tige: string; voies: string[] } | null>(null);
  const [rangees, setRangees] = useState<Reseau[]>([]);
  const [fini, setFini] = useState(false);
  const [tour, setTour] = useState(0);
  // « Passer » pose la roue sur sa fin, les quatre pages rangées ; « Revoir » rejoue le trafic.
  const [passe, setPasse] = useState(false);

  // Les positions de la roue, du lien et des pages, relues à chaque changement de taille.
  useLayoutEffect(() => {
    const el = scene.current;
    if (!el) return;
    const mesurer = () => {
      const s = el.getBoundingClientRect();
      const a = anneau.current!.getBoundingClientRect();
      const l = lien.current!.getBoundingClientRect();
      const cx = a.left - s.left + a.width / 2, cy = a.top - s.top + a.height / 2;
      const bas = l.bottom - s.top;
      const ps = pages.current.map(p => { const r = p!.getBoundingClientRect(); return { x: r.left - s.left + r.width / 2, y: r.top - s.top + 6 }; });
      const g: Geo = { cx, cy, r: a.width / 2, bas, pages: ps, w: s.width, h: s.height, base: RESEAUX.map((_, i) => 45 + i * 90) };
      geo.current = g;
      setTraces({ w: s.width, h: s.height, tige: `M${cx} ${cy}L${cx} ${bas}`, voies: ps.map(p => voie(g, p)) });
    };
    mesurer();
    if (typeof ResizeObserver !== 'function') return;
    const o = new ResizeObserver(mesurer);
    o.observe(el);
    return () => o.disconnect();
  }, []);

  // Le trafic : une fois, quand la roue est à l'écran ; « Revoir » le relance.
  useEffect(() => {
    if (!vu) return;
    if (mouvementReduit() || passe) { setRangees([...RESEAUX]); setFini(true); return; }
    setRangees([]);
    setFini(false);
    const libres = RESEAUX.map((_, i) => Array.from({ length: PAR_RESEAU }, (_, k) => i * PAR_RESEAU + k));
    const vols: { reseau: number; case: number; depart: number; long: number }[] = [];
    let suivante = 0, image = 0, debut = 0, fin = 0, dernier = arret.current;
    const vus = new Set<Reseau>();
    // À chaque arrivée, la ligne du réseau prend sa couleur un instant (`data-arrive`), puis celle du thème.
    const teintes: ReturnType<typeof setTimeout>[] = [];
    const tourner = (t: number) => {
      // Vitesse constante pendant le trafic, puis un freinage exponentiel.
      const s = t / 1000;
      const a = arret.current + (!fin || t < fin ? VITESSE * s : VITESSE * (fin / 1000) + VITESSE * FREIN * (1 - Math.exp(-(t - fin) / 1000 / FREIN)));
      anneau.current?.style.setProperty('--a', `${a}deg`);
      dernier = a;
      return a;
    };
    const arriver = (i: number) => {
      const reseau = RESEAUX[i];
      pages.current[i]?.animate(
        [{ transform: 'none' }, { transform: 'translateY(-7px) scale(1.045)', offset: 0.32 }, { transform: 'none' }],
        { duration: 560, easing: 'cubic-bezier(.2,.7,.2,1)' },
      );
      ondes.current[i]?.animate(
        [{ opacity: 0.9, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.16)' }],
        { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)' },
      );
      const page = pages.current[i];
      if (page) {
        clearTimeout(teintes[i]);
        page.dataset.arrive = '';
        teintes[i] = setTimeout(() => { delete page.dataset.arrive; }, 1200);
      }
      if (!vus.has(reseau)) { vus.add(reseau); setRangees(r => [...r, reseau]); }
    };
    const pas = (now: number) => {
      if (!debut) debut = now;
      const t = now - debut;
      const g = geo.current;
      const a = tourner(t);
      // Un visiteur part de son réseau, là où la roue l'a amené.
      while (g && suivante < VISITES.length && VISITES[suivante][0] <= t) {
        const [quand, reseau] = VISITES[suivante++];
        const i = RESEAUX.indexOf(reseau);
        const c = libres[i].shift();
        const chemin = c === undefined ? null : traines.current[c];
        if (c === undefined || !chemin) continue;
        const angle = ((g.base[i] + a) * Math.PI) / 180;
        const bx = g.cx + g.r * Math.sin(angle), by = g.cy - g.r * Math.cos(angle);
        chemin.setAttribute('d', `M${bx} ${by}L${g.cx} ${g.cy}L${g.cx} ${g.bas}${voie(g, g.pages[i]).replace(/^M[^C]*/, '')}`);
        vols.push({ reseau: i, case: c, depart: quand, long: chemin.getTotalLength() });
      }
      for (let k = vols.length - 1; k >= 0; k--) {
        const v = vols[k];
        const p = Math.min(1, (t - v.depart) / TRAJET);
        const point = points.current[v.case], chemin = traines.current[v.case];
        if (!point || !chemin) continue;
        if (p >= 1) {
          point.style.opacity = '0';
          chemin.style.opacity = '0';
          libres[v.reseau].push(v.case);
          vols.splice(k, 1);
          arriver(v.reseau);
          continue;
        }
        const d = facile(p) * v.long;
        const q = chemin.getPointAtLength(d);
        point.style.transform = `translate(${q.x}px, ${q.y}px)`;
        point.style.opacity = '1';
        // La traînée : les 48 px de chemin derrière le visiteur.
        chemin.style.strokeDasharray = `${Math.min(48, d)} ${v.long + 48}`;
        chemin.style.strokeDashoffset = `${-Math.max(0, d - 48)}`;
        chemin.style.opacity = '1';
      }
      if (!fin && suivante >= VISITES.length && !vols.length) fin = t;
      if (fin && t - fin > FREIN * 4000) { setFini(true); return; }
      image = requestAnimationFrame(pas);
    };
    const depart = setTimeout(() => { image = requestAnimationFrame(pas); }, 700);
    return () => {
      clearTimeout(depart);
      cancelAnimationFrame(image);
      teintes.forEach(clearTimeout);
      pages.current.forEach(p => { if (p) delete p.dataset.arrive; });
      arret.current = dernier % 360;
      points.current.forEach(p => { if (p) p.style.opacity = '0'; });
      traines.current.forEach(c => { if (c) c.style.opacity = '0'; });
    };
  }, [vu, tour, passe]);

  const adresse = `hopla.page/${PROFILS.camille.pseudo}`;
  const qui = PROFILS.camille.nom;
  const page = {
    '--fond': THEME.fond, '--texte': THEME.texte, '--surface': THEME.surface, '--surface-texte': THEME.surfaceTexte,
    '--vedette': THEME.vedette, '--vedette-texte': THEME.vedetteTexte, '--police': POLICE.titre,
  } as CSSProperties;

  return (
    <div ref={refVu} className="hl-roue-cadre">
      <div ref={scene} className="hl-roue" role="img"
        aria-label={`Des visiteurs arrivent d’Instagram, de TikTok, de YouTube et de LinkedIn par le même lien, ${adresse}. Chacun tombe sur la page de ${qui} rangée pour son réseau : ${RESEAUX.map(r => `« ${EN_TETE[r].titre} » en tête depuis ${NOMS_AUDIENCES[r]}`).join(', ')}.`}>
        {traces && (
          <svg className="hl-roue-traces" width={traces.w} height={traces.h} viewBox={`0 0 ${traces.w} ${traces.h}`} aria-hidden="true">
            <path d={traces.tige} className="hl-roue-voie" />
            {traces.voies.map((d, i) => <path key={i} d={d} className="hl-roue-voie" />)}
            {Array.from({ length: RESEAUX.length * PAR_RESEAU }, (_, c) => (
              <path key={c} ref={el => { traines.current[c] = el; }} className="hl-roue-traine" style={{ opacity: 0 }} />
            ))}
          </svg>
        )}
        <div className="hl-roue-points" aria-hidden="true">
          {Array.from({ length: RESEAUX.length * PAR_RESEAU }, (_, c) => {
            const r = RESEAUX[Math.floor(c / PAR_RESEAU)];
            return (
              <span key={c} ref={el => { points.current[c] = el; }} className="hl-roue-point" style={{ color: COULEURS[r], opacity: 0 }}>
                <Icone nom={r} taille={12} />
              </span>
            );
          })}
        </div>
        <div className="hl-roue-haut">
          <div ref={anneau} className="hl-roue-anneau">
            {RESEAUX.map((r, i) => (
              <span key={r} className="hl-roue-badge" style={{ '--b': `${45 + i * 90}deg`, color: COULEURS[r] } as CSSProperties}>
                <Icone nom={r} taille={20} />
              </span>
            ))}
          </div>
          <span className="hl-roue-moyeu"><Symbole /></span>
        </div>
        <div ref={lien} className="hl-roue-lien">{adresse}</div>
        <div className="hl-roue-pages">
          {RESEAUX.map((r, i) => {
            const rangee = rangees.includes(r);
            return (
              <div key={r} className="hl-roue-colonne" style={{ '--reseau': COULEURS[r] } as CSSProperties}>
                <span ref={el => { ondes.current[i] = el; }} className="hl-roue-onde" />
                <div ref={el => { pages.current[i] = el; }} className="hl-roue-page" style={page} data-rangee={rangee || undefined}>
                  <img className="hl-roue-avatar" src={PROFILS.camille.avatar} alt="" width="64" height="64" loading="lazy" />
                  <b className="hl-roue-nom">{qui}</b>
                  <div className="hl-roue-liens">
                    <div className="hl-roue-ligne hl-roue-nouvelle" data-vedette={rangee || undefined}>
                      <Icone nom={EN_TETE[r].icone} taille={10} /><span>{EN_TETE[r].titre}</span>
                    </div>
                    {PAGES[r].slice(1).map((l, k) => (
                      <div key={l.titre} className="hl-roue-ligne" data-vedette={(!rangee && k === 0) || undefined}>
                        <Icone nom={l.icone} taille={10} /><span>{l.titre}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <span className="hl-roue-source" style={{ background: COULEURS[r] }}><Icone nom={r} taille={12} />{NOMS_AUDIENCES[r]}</span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="hl-roue-pied">
        {!mouvementReduit() && vu && (fini
          ? <button type="button" className="hl-revoir" onClick={() => { setPasse(false); setTour(t => t + 1); }}>Revoir les visiteurs</button>
          : <button type="button" className="hl-revoir" onClick={() => setPasse(true)}>Passer l’animation</button>)}
      </p>
    </div>
  );
}

/** Du bas du lien au haut d'une page : une courbe qui descend droit, s'écarte, puis retombe droit dans la page. */
function voie(g: Geo, p: { x: number; y: number }) {
  const k = (p.y - g.bas) * 0.55;
  return `M${g.cx} ${g.bas}C${g.cx} ${g.bas + k} ${p.x} ${p.y - k} ${p.x} ${p.y}`;
}
