import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Icone } from '../components/Icone.tsx';
import { POLICES, THEMES } from '../lib/themes.ts';
import { NOMS_AUDIENCES, composerAudience } from '../lib/provenance.ts';
import { PROFILS, BLOCS_EXEMPLES } from './exemples.ts';
import { mouvementReduit, useEnVue, useGlisse } from './mouvement.ts';

/*
 * La roue de « Camille partage, Hopla s'adapte » (20 octobre 2026, refaite le
 * 26 octobre 2026 à la demande de Lilian : « trop petites les pages, police
 * trop petite, roue trop grosse ») : une petite roue des réseaux, la photo de
 * Camille au moyeu, son lien dessous, et une seule page, en grand, dans le
 * thème Couchant. Chaque visiteur part de son réseau, passe par le moyeu
 * et le lien, plonge dans la page : elle dit d'où il vient et range ses liens
 * pour lui, en glissant. Les quatre réseaux passent à tour de rôle, en boucle,
 * tant que la scène est à l'écran ; hors de l'écran ou après « Pause », le
 * temps s'arrête et reprend là où il en était. Avec moins de mouvement, la
 * page rangée pour Instagram reste posée.
 *
 * Le dessin est en HTML ; les chemins et la traînée sont dans un SVG mesuré
 * sur la scène ; le visiteur se déplace hors de React, image par image.
 */

const RESEAUX = ['instagram', 'tiktok', 'youtube', 'linkedin'] as const;
type Reseau = (typeof RESEAUX)[number];
const COULEURS: Record<Reseau, string> = { instagram: '#d62976', tiktok: '#111111', youtube: '#e00000', linkedin: '#0a66c2' };
const BLOCS = BLOCS_EXEMPLES.camille;
/** Les liens de la page pour chaque réseau, et pour un visiteur venu d'ailleurs (avant le premier). */
const PAGES = Object.fromEntries(RESEAUX.map(r => [r, composerAudience(BLOCS, r)])) as Record<Reseau, typeof BLOCS>;
const DIRECT = composerAudience(BLOCS, '');
const PROFIL = PROFILS.camille;
/** Le thème de la scène : Couchant, la lumière de fin de journée d'une photographe (29 octobre 2026, Lilian n'aimait pas Onyx ici). */
const THEME = THEMES.find(t => t.id === 'coucher')!;
const POLICE = POLICES[THEME.police];
const IMAGES = ['/exemple-camille-dune.svg', '/exemple-camille-miroir.svg', '/exemple-camille-pins.svg'];

/** Le trajet d'un visiteur, puis le temps de lire la page rangée (ms). */
const TRAJET = 1150, TENUE = 1950, CYCLE = TRAJET + TENUE;
/** Degrés par seconde : la roue tourne doucement, le visiteur part de là où elle a amené son réseau. */
const VITESSE = 16;

const facile = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

interface Point { x: number; y: number }
interface Geo { cx: number; cy: number; r: number; lien: Point; sortie: Point; entree: Point; bas: boolean }

export function Roue() {
  const [refVu, enVue] = useEnVue<HTMLDivElement>(0.5);
  const [pause, setPause] = useState(false);
  const joue = useRef(false);
  joue.current = enVue && !pause;
  const reprendre = useRef<(() => void) | null>(null);
  const scene = useRef<HTMLDivElement>(null);
  const anneau = useRef<HTMLDivElement>(null);
  const lien = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const liens = useRef<HTMLDivElement>(null);
  const point = useRef<HTMLSpanElement>(null);
  const icones = useRef<(HTMLSpanElement | null)[]>([]);
  const traine = useRef<SVGPathElement>(null);
  const geo = useRef<Geo | null>(null);
  const [traces, setTraces] = useState<{ w: number; h: number; d: string } | null>(null);
  const [actif, setActif] = useState<Reseau | null>(null);
  const [lancee, setLancee] = useState(false);

  const blocs = actif ? PAGES[actif] : DIRECT;
  useGlisse(liens, blocs.map(b => b.titre).join('|'), 520);

  // Les positions du moyeu, du lien et de la page, relues à chaque changement de taille.
  useLayoutEffect(() => {
    const el = scene.current;
    if (!el) return;
    const mesurer = () => {
      const s = el.getBoundingClientRect();
      const a = anneau.current!.getBoundingClientRect();
      const l = lien.current!.getBoundingClientRect();
      const p = page.current!.getBoundingClientRect();
      const cx = a.left - s.left + a.width / 2, cy = a.top - s.top + a.height / 2;
      const lx = l.left - s.left, ly = l.top - s.top;
      // La page est sous le lien (téléphone) ou à sa droite (bureau) : le chemin sort par le bas ou par le côté.
      const bas = p.top - s.top > ly + l.height;
      const sortie = bas ? { x: lx + l.width / 2, y: ly + l.height } : { x: lx + l.width, y: ly + l.height / 2 };
      const entree = bas ? { x: p.left - s.left + p.width / 2, y: p.top - s.top + 28 } : { x: p.left - s.left + 28, y: p.top - s.top + p.height * 0.42 };
      const g: Geo = { cx, cy, r: a.width / 2, lien: { x: lx + l.width / 2, y: ly + l.height / 2 }, sortie, entree, bas };
      geo.current = g;
      setTraces({ w: s.width, h: s.height, d: `M${cx} ${cy}L${g.lien.x} ${g.lien.y}${voie(g)}` });
    };
    mesurer();
    if (typeof ResizeObserver !== 'function') return;
    const o = new ResizeObserver(mesurer);
    o.observe(el);
    return () => o.disconnect();
  }, []);

  // Le trafic : un réseau après l'autre, en boucle, tant que la scène joue.
  useEffect(() => {
    if (mouvementReduit()) { setActif('instagram'); return; }
    let image = 0, t = 0, prec = 0, depart = -1, long = 0;
    let angle = 0;
    const pas = (now: number) => {
      // En pause ou hors de l'écran, le temps de la scène s'arrête : `reprendre` le relance là où il en était.
      if (!joue.current) { image = 0; prec = 0; return; }
      if (prec) t += Math.min(now - prec, 100);
      prec = now;
      angle = (VITESSE * t) / 1000;
      anneau.current?.style.setProperty('--a', `${angle}deg`);
      const g = geo.current, chemin = traine.current, p = point.current;
      const tour = Math.floor(t / CYCLE), i = tour % RESEAUX.length, local = t - tour * CYCLE;
      if (g && chemin && p) {
        if (local < TRAJET) {
          // Un nouveau visiteur : son chemin part du logo de son réseau, là où la roue l'a amené.
          if (depart !== tour) {
            depart = tour;
            const a = ((45 + i * 90 + angle) * Math.PI) / 180;
            chemin.setAttribute('d', `M${g.cx + g.r * Math.sin(a)} ${g.cy - g.r * Math.cos(a)}L${g.cx} ${g.cy}L${g.lien.x} ${g.lien.y}${voie(g)}`);
            long = chemin.getTotalLength();
            icones.current.forEach((ic, k) => { if (ic) ic.style.display = k === i ? '' : 'none'; });
            p.style.color = COULEURS[RESEAUX[i]];
          }
          const d = facile(local / TRAJET) * long;
          const q = chemin.getPointAtLength(d);
          p.style.transform = `translate(${q.x}px, ${q.y}px)`;
          p.style.opacity = '1';
          chemin.style.strokeDasharray = `${Math.min(56, d)} ${long + 56}`;
          chemin.style.strokeDashoffset = `${-Math.max(0, d - 56)}`;
          chemin.style.opacity = '1';
        } else if (depart === tour) {
          // Arrivé : la page se range pour son réseau.
          depart = -1;
          p.style.opacity = '0';
          chemin.style.opacity = '0';
          setActif(RESEAUX[i]);
          page.current?.animate(
            [{ transform: 'none' }, { transform: 'scale(1.025)', offset: 0.3 }, { transform: 'none' }],
            { duration: 520, easing: 'cubic-bezier(.2,.7,.2,1)' },
          );
        }
      }
      image = requestAnimationFrame(pas);
    };
    reprendre.current = () => { if (!image) image = requestAnimationFrame(pas); };
    if (joue.current) reprendre.current();
    return () => { reprendre.current = null; cancelAnimationFrame(image); };
  }, []);

  useEffect(() => {
    if (enVue) setLancee(true);
    if (joue.current) reprendre.current?.();
  }, [enVue, pause]);

  const adresse = `hopla.page/${PROFIL.pseudo}`;
  const style = {
    '--fond': THEME.fond, '--texte': THEME.texte, '--doux': THEME.doux, '--surface': THEME.surface, '--surface-texte': THEME.surfaceTexte,
    '--vedette': THEME.vedette, '--vedette-texte': THEME.vedetteTexte, '--police-titre': POLICE.titre, '--police': POLICE.corps,
    '--ombre': THEME.ombre, '--rayon': THEME.conseil?.forme === 'pilule' ? '99px' : '12px', '--graisse-nom': THEME.typo?.nom?.graisse ?? 600,
  } as CSSProperties;

  return (
    <div ref={refVu} className="hl-roue-cadre">
      <div ref={scene} className="hl-roue" role="img"
        aria-label={`Des visiteurs arrivent d’Instagram, de TikTok, de YouTube et de LinkedIn par le même lien, ${adresse}. La page de ${PROFIL.nom} se range pour chacun : ${RESEAUX.map(r => `« ${PAGES[r][0].titre} » en tête depuis ${NOMS_AUDIENCES[r]}`).join(', ')}.`}>
        {traces && (
          <svg className="hl-roue-traces" width={traces.w} height={traces.h} viewBox={`0 0 ${traces.w} ${traces.h}`} aria-hidden="true">
            <path d={traces.d} className="hl-roue-voie" />
            <path ref={traine} className="hl-roue-traine" style={{ opacity: 0 }} />
          </svg>
        )}
        <span ref={point} className="hl-roue-point" style={{ opacity: 0 }} aria-hidden="true">
          {RESEAUX.map((r, k) => <span key={r} ref={el => { icones.current[k] = el; }}><Icone nom={r} taille={18} /></span>)}
        </span>
        <div className="hl-roue-source-zone">
          <div className="hl-roue-haut">
            <div ref={anneau} className="hl-roue-anneau">
              {RESEAUX.map((r, i) => (
                <span key={r} className="hl-roue-badge" style={{ '--b': `${45 + i * 90}deg`, color: COULEURS[r] } as CSSProperties}>
                  <Icone nom={r} taille={22} />
                </span>
              ))}
            </div>
            <img className="hl-roue-moyeu" src={PROFIL.avatar} alt="" width="120" height="120" loading="lazy" />
          </div>
          <div ref={lien} className="hl-roue-lien">{adresse}</div>
        </div>
        <div className="hl-roue-ecran">
          <span className="hl-roue-depuis" key={actif ?? 'direct'} data-vide={!actif || undefined}>
            {actif && <><span style={{ color: COULEURS[actif] }}><Icone nom={actif} taille={18} /></span>Depuis {NOMS_AUDIENCES[actif]}</>}
          </span>
          <div ref={page} className="hl-roue-page" style={style}>
            <img className="hl-roue-avatar" src={PROFIL.avatar} alt="" width="120" height="120" loading="lazy" />
            <b className="hl-roue-nom">{PROFIL.nom}</b>
            <span className="hl-roue-bio">{PROFIL.bio}</span>
            <div ref={liens} className="hl-roue-liens">
              {blocs.map((b, k) => (
                <div key={b.titre} data-cle="" className="hl-roue-ligne" data-vedette={(actif ? k === 0 : b.vedette) || undefined}>
                  <Icone nom={b.icone} taille={16} /><span>{b.titre}</span>
                </div>
              ))}
            </div>
            <div className="hl-roue-images">
              {IMAGES.map(src => <img key={src} src={src} alt="" width="120" height="120" loading="lazy" />)}
            </div>
          </div>
        </div>
      </div>
      <p className="hl-roue-pied">
        {!mouvementReduit() && lancee && (
          <button type="button" className="hl-revoir" onClick={() => setPause(p => !p)}>{pause ? 'Reprendre l’animation' : 'Mettre l’animation en pause'}</button>
        )}
      </p>
    </div>
  );
}

/** De la sortie du lien à l'entrée de la page : une courbe qui part droit du lien et arrive droit dans la page. */
function voie(g: Geo) {
  const { sortie: a, entree: b } = g;
  if (g.bas) { const k = (b.y - a.y) * 0.5; return `L${a.x} ${a.y}C${a.x} ${a.y + k} ${b.x} ${b.y - k} ${b.x} ${b.y}`; }
  const k = (b.x - a.x) * 0.5;
  return `L${a.x} ${a.y}C${a.x + k} ${a.y} ${b.x - k} ${b.y} ${b.x} ${b.y}`;
}
