import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import { COULEURS_QR, STYLE_QR, lisibleQR, styleQR, svgQR } from './qr.ts';

const ADRESSE = 'https://hopla.page/camille?s=qr';

test('le QR en carrés dessine exactement les modules du code', () => {
  const { modules } = QRCode.create(ADRESSE, { errorCorrectionLevel: 'M' });
  const svg = svgQR(ADRESSE);
  assert.equal((svg.match(/h1v1h-1z/g) ?? []).length, [...modules.data].filter(Boolean).length);
  assert.match(svg, new RegExp(`viewBox="0 0 ${modules.size + 4} ${modules.size + 4}"`));
  assert.match(svg, /fill="#0a0a0a"/);
  assert.doesNotMatch(svg, /<image/);
});

test('en points, les trois repères restent pleins et les modules deviennent des ronds', () => {
  const svg = svgQR(ADRESSE, { ...STYLE_QR, forme: 'points', couleur: '#1f35ff' });
  assert.doesNotMatch(svg, /h1v1h-1z/);
  assert.equal((svg.match(/a2 2 0 0 1 2 2/g) ?? []).length, 3);
  assert.match(svg, /fill="#1f35ff"/);
});

test('avec une image au centre, le code passe en correction haute et lui laisse la place', () => {
  const image = 'data:image/png;base64,AAAA';
  const svg = svgQR(ADRESSE, { ...STYLE_QR, logo: true }, image);
  const haut = QRCode.create(ADRESSE, { errorCorrectionLevel: 'H' }).modules;
  assert.match(svg, new RegExp(`viewBox="0 0 ${haut.size + 4} `));
  assert.match(svg, /<image href="data:image\/png;base64,AAAA"/);
  const pleins = [...haut.data].filter(Boolean).length, dessines = (svg.match(/h1v1h-1z/g) ?? []).length;
  // Ce que l'image cache reste sous ce que la correction haute sait retrouver (30 %), avec de la marge.
  assert.ok(dessines < pleins && dessines > pleins * 0.9, `${dessines} sur ${pleins}`);
  // Sans image à montrer, rien ne change.
  assert.equal(svgQR(ADRESSE, { ...STYLE_QR, logo: true }, ''), svgQR(ADRESSE));
});

test('une couleur trop claire ne se garde pas', () => {
  for (const c of COULEURS_QR) assert.ok(lisibleQR(c), c);
  assert.equal(lisibleQR('#ffd400'), false);
  assert.equal(lisibleQR('rouge'), false);
  assert.deepEqual(styleQR({ couleur: '#FFD400', forme: 'points', logo: true }), { couleur: '#0a0a0a', forme: 'points', logo: true });
  assert.deepEqual(styleQR(null), STYLE_QR);
});
