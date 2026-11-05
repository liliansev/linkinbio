/*
 * La vignette d'un bouton (5 novembre 2026, demandé par Lilian : « vaut mieux laisser l'icône prendre la place, sans
 * fond blanc derrière ») : un favicon se pose seul, de toute la place de l'icône, sans fond ni cadre. Un favicon
 * transparent dont la couleur ne se lit pas sur le bouton (un logo noir sur un thème sombre) prend l'encre du bouton,
 * comme les pictos : sa forme reste, sa couleur suit le texte. Un favicon transparent sans couleur (noir, blanc ou gris)
 * la prend toujours, pour que deux logos de ce genre aient la même encre. Une photo, opaque, ne change pas.
 */
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

type Rgb = [number, number, number];

/** La luminance relative (WCAG) d'une couleur. */
function luminance([r, g, b]: Rgb) {
  const c = (v: number) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}
const ecart = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** « rgb(1, 2, 3) » ou « rgba(1, 2, 3, 0.5) » ; null pour une couleur transparente ou illisible. */
function rgb(couleur: string): Rgb | null {
  const m = /rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?/.exec(couleur);
  if (!m) return null;
  const alpha = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  return alpha < 0.5 ? null : [+m[1], +m[2], +m[3]];
}

/** Sous ce rapport, un logo transparent se perd sur son bouton. */
const LISIBLE = 1.8;

/**
 * Lit l'image réduite à 24 pixels : vrai si elle est transparente et sans couleur, ou si sa couleur moyenne se confond avec le fond
 * du bouton (lu sur le bouton, ou deviné à l'opposé de son encre quand le bouton est en verre ou en dégradé).
 */
export function seConfond(img: HTMLImageElement): boolean {
  const toile = document.createElement('canvas');
  toile.width = 24; toile.height = 24;
  const ctx = toile.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(img, 0, 0, 24, 24);
  const px = ctx.getImageData(0, 0, 24, 24).data;
  let transparents = 0, poids = 0;
  const somme: Rgb = [0, 0, 0];
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3] / 255;
    if (a < 0.5) transparents++;
    poids += a;
    somme[0] += px[i] * a; somme[1] += px[i + 1] * a; somme[2] += px[i + 2] * a;
  }
  if (transparents < 24 * 24 * 0.08 || poids < 1) return false;
  const moyenne = somme.map(v => v / poids) as Rgb;
  // Sans couleur : la teinte moyenne et chaque pixel opaque restent près du gris.
  let colores = 0;
  for (let i = 0; i < px.length; i += 4) if (px[i + 3] >= 128 && Math.max(px[i], px[i + 1], px[i + 2]) - Math.min(px[i], px[i + 1], px[i + 2]) > 40) colores++;
  if (colores < 6) return true;
  const logo = luminance(moyenne);
  const bouton = img.closest('.lp-btn, .lp-carte') ?? img.parentElement;
  if (!bouton) return false;
  const style = getComputedStyle(bouton);
  const encre = rgb(style.color);
  const fond = rgb(style.backgroundColor);
  const lFond = fond ? luminance(fond) : encre && luminance(encre) > 0.4 ? 0 : 1;
  return ecart(logo, lFond) < LISIBLE;
}

export function Vignette({ src, className }: { src: string; className: string }) {
  const ref = useRef<HTMLImageElement>(null);
  /** L'adresse du favicon qui se dessine à l'encre : une autre adresse se relit. */
  const [encrePour, setEncrePour] = useState('');
  const encre = encrePour === src;
  useEffect(() => {
    const img = ref.current;
    if (!img) return;
    const lire = () => { try { if (seConfond(img)) setEncrePour(src); } catch { /* une image d'un autre site ne se lit pas : elle reste telle quelle */ } };
    if (img.complete && img.naturalWidth) lire();
    else img.addEventListener('load', lire, { once: true });
    return () => img.removeEventListener('load', lire);
  }, [src]);
  if (encre) return <span className={`${className} lp-vignette-encre`} aria-hidden="true" style={{ '--logo': `url("${src}")` } as CSSProperties} />;
  return <img ref={ref} className={className} src={src} alt="" width={40} height={40} loading="lazy" />;
}
