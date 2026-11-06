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

/**
 * Un logo que le back office avait posé sur du blanc (du 26 octobre au 5 novembre 2026, `preparerLogo`) : opaque, un
 * pourtour blanc, le logo au centre, sur 64 % du carré. Vrai pour une telle image ; la page n'en montre que le logo.
 */
export function surBlanc(img: HTMLImageElement): boolean {
  const toile = document.createElement('canvas');
  toile.width = 50; toile.height = 50;
  const ctx = toile.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(img, 0, 0, 50, 50);
  const px = ctx.getImageData(0, 0, 50, 50).data;
  const blanc = (x: number, y: number) => { const i = (y * 50 + x) * 4; return px[i + 3] > 250 && px[i] > 244 && px[i + 1] > 244 && px[i + 2] > 244; };
  // Le pourtour : les 6 premiers pixels de chaque bord (le logo commence à 18 %), tous blancs.
  for (let y = 0; y < 50; y++) for (let x = 0; x < 50; x++) {
    if ((x < 6 || y < 6 || x > 43 || y > 43) && !blanc(x, y)) return false;
  }
  // Le centre : quelque chose d'autre que du blanc.
  let autre = 0;
  for (let y = 12; y < 38; y++) for (let x = 12; x < 38; x++) if (!blanc(x, y)) autre++;
  return autre > 40;
}

/** Ce que la page fait d'une vignette, une fois lue : à l'encre, ou le logo seul, sans le blanc autour. */
type Rendu = 'encre' | 'recadre';

export function Vignette({ src, className }: { src: string; className: string }) {
  const ref = useRef<HTMLImageElement>(null);
  /** Le rendu choisi, et l'adresse lue pour lui : une autre adresse se relit. */
  const [rendu, setRendu] = useState<{ src: string; rendu: Rendu } | null>(null);
  const choisi = rendu?.src === src ? rendu.rendu : null;
  useEffect(() => {
    const img = ref.current;
    if (!img) return;
    const lire = () => {
      try {
        if (surBlanc(img)) setRendu({ src, rendu: 'recadre' });
        else if (seConfond(img)) setRendu({ src, rendu: 'encre' });
      } catch { /* une image d'un autre site ne se lit pas : elle reste telle quelle */ }
    };
    if (img.complete && img.naturalWidth) lire();
    else img.addEventListener('load', lire, { once: true });
    return () => img.removeEventListener('load', lire);
  }, [src]);
  if (choisi) return <span className={`${className} lp-vignette-${choisi}`} aria-hidden="true" style={{ '--logo': `url("${src}")` } as CSSProperties} />;
  return <img ref={ref} className={className} src={src} alt="" width={40} height={40} loading="lazy" />;
}
