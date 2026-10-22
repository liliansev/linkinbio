/*
 * Le tracé des courbes de stats, le même au back office et sur l'accueil
 * (22 octobre 2026, demandé par Lilian : des courbes lisses, avec un dégradé
 * dessous). La ligne passe par chaque point sans jamais le dépasser
 * (interpolation monotone de Fritsch et Carlson) : ni bosse sous zéro, ni pic
 * inventé entre deux jours. L'aire dessous se referme sur la ligne de base.
 */

export type PointTrace = [x: number, y: number];

const n1 = (v: number) => v.toFixed(1);

/** La ligne en chemin SVG : des traits droits sous trois points, une suite de courbes de Bézier au-delà. */
export function lisse(p: PointTrace[]): string {
  const n = p.length;
  if (n < 3) return p.map(([a, b], i) => `${i ? 'L' : 'M'}${n1(a)},${n1(b)}`).join(' ');
  const d = p.slice(1).map(([a, b], i) => (b - p[i][1]) / (a - p[i][0]));
  const m = p.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], t = a * a + b * b;
    if (t > 9) { const k = 3 / Math.sqrt(t); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  let chemin = `M${n1(p[0][0])},${n1(p[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = p[i], [x1, y1] = p[i + 1], h = (x1 - x0) / 3;
    chemin += ` C${n1(x0 + h)},${n1(y0 + m[i] * h)} ${n1(x1 - h)},${n1(y1 - m[i + 1] * h)} ${n1(x1)},${n1(y1)}`;
  }
  return chemin;
}

/** L'aire sous la ligne, refermée sur la ligne de base `base` (son y). */
export function aireSous(p: PointTrace[], base: number): string {
  if (!p.length) return '';
  return `${lisse(p)} L${n1(p[p.length - 1][0])},${n1(base)} L${n1(p[0][0])},${n1(base)} Z`;
}

/**
 * Le dégradé de l'aire, de haut en bas : le bleu Hopla, dense sous le point le
 * plus haut, qui s'efface avant la ligne de base. Les arrêts d'un `linearGradient`
 * vertical, à poser en `objectBoundingBox`.
 */
export const DEGRADE_COURBE = [
  { arret: 0, opacite: 0.26 },
  { arret: 0.55, opacite: 0.09 },
  { arret: 1, opacite: 0 },
] as const;
