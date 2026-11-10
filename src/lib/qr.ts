import QRCode from 'qrcode';
import { contraste } from './themes.ts';

/*
 * Le QR code d'une page, dessiné en SVG (10 novembre 2026, lot 3 d'après Taap.it, demandé par Lilian) : sa couleur, ses
 * modules en carrés ou en points, et la photo de profil au centre. Le même dessin sert à l'aperçu, au fichier SVG et au
 * PNG. Avec une image au centre, le code passe au niveau de correction le plus haut : il se lit malgré ce qu'elle cache.
 */

export type FormeQR = 'carres' | 'points';
export interface StyleQR { couleur: string; forme: FormeQR; logo: boolean }
export const STYLE_QR: StyleQR = { couleur: '#0a0a0a', forme: 'carres', logo: false };

/** Les couleurs proposées d'un toucher : toutes se lisent sur le blanc. */
export const COULEURS_QR = ['#0a0a0a', '#0c121f', '#1f35ff', '#6a3df5', '#23704f', '#b3261e'];

/** Un QR code se lit quand ses modules tranchent sur le blanc : en dessous de 4 pour 1, les appareils photo peinent. */
export const lisibleQR = (couleur: string) => /^#[0-9a-f]{6}$/i.test(couleur) && contraste(couleur, '#ffffff') >= 4;

/** Le style gardé sur l'appareil, remis au propre : une couleur trop claire revient au noir. */
export function styleQR(v: unknown): StyleQR {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const couleur = typeof o.couleur === 'string' && lisibleQR(o.couleur) ? o.couleur.toLowerCase() : STYLE_QR.couleur;
  return { couleur, forme: o.forme === 'points' ? 'points' : 'carres', logo: o.logo === true };
}

const MARGE = 2;
const n2 = (x: number) => +x.toFixed(2);

/** Un rectangle aux coins ronds, en tracé : pour l'additionner à d'autres dans un seul `path`. */
const arrondi = (x: number, y: number, c: number, r: number) =>
  `M${n2(x + r)} ${y}h${n2(c - 2 * r)}a${r} ${r} 0 0 1 ${r} ${r}v${n2(c - 2 * r)}a${r} ${r} 0 0 1 -${r} ${r}h-${n2(c - 2 * r)}a${r} ${r} 0 0 1 -${r} -${r}v-${n2(c - 2 * r)}a${r} ${r} 0 0 1 ${r} -${r}z`;

/**
 * Le QR code de `texte` en SVG. `image` : l'adresse (une `data:` pour un fichier qui se suffit) de l'image du centre,
 * montrée seulement si `style.logo`. `rond` : l'image est découpée en rond, comme une photo de profil.
 */
export function svgQR(texte: string, style: StyleQR = STYLE_QR, image = '', rond = true): string {
  const avecImage = style.logo && !!image;
  const { modules } = QRCode.create(texte, { errorCorrectionLevel: avecImage ? 'H' : 'M' });
  const n = modules.size, cote = n + 2 * MARGE;
  const sombre = (x: number, y: number) => !!modules.data[y * n + x];
  // Les trois repères, aux coins : dessinés à part quand les modules sont des points.
  const repere = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  // La place de l'image : un carré au centre, d'un quart du code au plus, de la parité du code pour rester centré.
  let trou = avecImage ? Math.floor(n * 0.26) : 0;
  if (trou && trou % 2 !== n % 2) trou -= 1;
  const debut = (n - trou) / 2;
  const cache = (x: number, y: number) => trou > 0 && x >= debut && x < debut + trou && y >= debut && y < debut + trou;

  const points = style.forme === 'points';
  let trace = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (!sombre(x, y) || cache(x, y) || (points && repere(x, y))) continue;
    const X = x + MARGE, Y = y + MARGE;
    // Des ronds qui se touchent : plus petits, certains lecteurs ne retrouvent plus le code.
    trace += points ? `M${X} ${Y + 0.5}a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0z` : `M${X} ${Y}h1v1h-1z`;
  }
  if (points) for (const [x, y] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
    const X = x + MARGE, Y = y + MARGE;
    trace += arrondi(X, Y, 7, 2) + arrondi(X + 1, Y + 1, 5, 1.2) + arrondi(X + 2, Y + 2, 3, 0.9);
  }

  let centre = '';
  if (avecImage) {
    const c = trou - 1, o = debut + MARGE + 0.5, href = image.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    centre = `<defs><clipPath id="qr-centre"><rect x="${o}" y="${o}" width="${c}" height="${c}" rx="${rond ? c / 2 : c * 0.22}"/></clipPath></defs>`
      + `<image href="${href}" x="${o}" y="${o}" width="${c}" height="${c}" preserveAspectRatio="xMidYMid slice" clip-path="url(#qr-centre)"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cote} ${cote}" width="${cote * 20}" height="${cote * 20}" shape-rendering="${points ? 'geometricPrecision' : 'crispEdges'}">`
    + `<rect width="${cote}" height="${cote}" fill="#ffffff"/><path fill="${style.couleur}" fill-rule="evenodd" d="${trace}"/>${centre}</svg>`;
}
