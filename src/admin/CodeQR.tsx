import { useEffect, useMemo, useState } from 'react';
import { Icone } from '../components/Icone.tsx';
import { Interrupteur, Segments, classeBouton, vibrer } from './ui.tsx';
import { useL } from '../accueil/langue.ts';
import type { StyleQR } from '../lib/qr.ts';
import { COULEURS_QR, STYLE_QR, lisibleQR, styleQR, svgQR } from '../lib/qr.ts';

/**
 * Le QR code de la page, à télécharger. Il mène à l'adresse marquée `?s=qr` : ceux qui le scannent se comptent à part
 * dans Stats. Depuis le 10 novembre 2026 (lot 3 d'après Taap.it), il se règle : sa couleur, ses modules en carrés ou
 * en points, la photo de profil au centre, en PNG ou en SVG. Le style choisi se garde sur l'appareil.
 */

/** Les noms des couleurs proposées, lus à voix haute : jamais un code hexadécimal. */
const NOMS: Record<string, [string, string]> = { '#0a0a0a': ['Noir', 'Black'], '#0c121f': ['Nuit', 'Midnight'], '#1f35ff': ['Bleu', 'Blue'], '#6a3df5': ['Violet', 'Purple'], '#23704f': ['Vert sapin', 'Pine green'], '#b3261e': ['Rouge', 'Red'] };

const cle = (pseudo: string) => `hopla-qr:${pseudo}`;
function lireStyle(pseudo: string): StyleQR {
  try { return styleQR(JSON.parse(localStorage.getItem(cle(pseudo)) ?? 'null')); } catch { return STYLE_QR; }
}
function garderStyle(pseudo: string, style: StyleQR) {
  try { localStorage.setItem(cle(pseudo), JSON.stringify(style)); } catch { /* le style ne se garde pas, le QR se télécharge quand même */ }
}

const enImage = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const charger = (src: string) => new Promise<HTMLImageElement>((ok, non) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => non(new Error('image')); i.src = src; });

/** La photo de profil, réduite et mise dans une adresse `data:` : le fichier SVG la porte en lui, sans dépendre de Hopla. */
async function photoPourQR(url: string): Promise<string> {
  const image = await charger(url);
  const c = document.createElement('canvas');
  c.width = c.height = 240;
  const cote = Math.min(image.naturalWidth, image.naturalHeight);
  c.getContext('2d')!.drawImage(image, (image.naturalWidth - cote) / 2, (image.naturalHeight - cote) / 2, cote, cote, 0, 0, 240, 240);
  return c.toDataURL('image/jpeg', 0.9);
}

/** Le SVG rendu en PNG, assez grand pour une affiche. */
async function pngDe(svg: string, taille = 1440): Promise<string> {
  const image = await charger(enImage(svg));
  const c = document.createElement('canvas');
  c.width = c.height = taille;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(image, 0, 0, taille, taille);
  return c.toDataURL('image/png');
}

function telecharger(nom: string, href: string) {
  const lien = document.createElement('a');
  lien.href = href;
  lien.download = nom;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
}

/** Le QR tel qu'il est réglé sur cet appareil, et de quoi le télécharger. `avatar` : la photo de profil, pour le centre. */
function useQR(adresse: string, pseudo: string, avatar = '') {
  const [style, setStyle] = useState<StyleQR>(STYLE_QR);
  const [photo, setPhoto] = useState('');
  useEffect(() => { setStyle(lireStyle(pseudo)); }, [pseudo]);
  useEffect(() => {
    let vivant = true;
    setPhoto('');
    if (avatar) photoPourQR(avatar).then(p => { if (vivant) setPhoto(p); }, () => {});
    return () => { vivant = false; };
  }, [avatar]);
  const svg = useMemo(() => svgQR(`${adresse}?s=qr`, style, photo), [adresse, style, photo]);
  const changer = (s: StyleQR) => { setStyle(s); garderStyle(pseudo, s); };
  const fichier = `qr-${pseudo}-hopla`;
  return {
    style, changer, svg, photo,
    png: async () => telecharger(`${fichier}.png`, await pngDe(svg)),
    vectoriel: () => telecharger(`${fichier}.svg`, enImage(svg)),
  };
}

/** Le QR code seul et son bouton (la page que personne n'a encore vue, dans Stats). */
export function CodeQR({ adresse, pseudo }: { adresse: string; pseudo: string }) {
  const l = useL();
  const qr = useQR(adresse, pseudo);
  return (
    <div className="flex flex-col items-center gap-3">
      <img src={enImage(qr.svg)} alt={l('QR code vers ta page', 'QR code to your page')} className="h-44 w-44 rounded-2xl border border-white/10 bg-nuit p-1.5" />
      <button type="button" onClick={() => { void qr.png(); }} className={classeBouton.secondaire}><Icone nom="telecharger" taille={16} />{l('Télécharger le QR code', 'Download the QR code')}</button>
    </div>
  );
}

/** Régler son QR code (Réglages, « QR code ») : l'aperçu, la couleur, la forme, la photo au centre, puis le fichier. */
export function ReglerQR({ adresse, pseudo, avatar }: { adresse: string; pseudo: string; avatar: string }) {
  const l = useL();
  const qr = useQR(adresse, pseudo, avatar);
  const [erreur, setErreur] = useState('');
  const { style } = qr;
  const perso = !COULEURS_QR.includes(style.couleur);
  const couleur = (c: string) => {
    if (!lisibleQR(c)) { setErreur(l('Cette couleur est trop claire : un appareil photo ne lirait pas le code. Choisis-en une plus foncée.', 'This color is too light: a camera couldn’t read the code. Pick a darker one.')); return; }
    setErreur(''); qr.changer({ ...style, couleur: c });
  };
  const pastille = 'relative h-8 w-8 shrink-0 rounded-full ring-1 ring-inset ring-white/20 transition before:absolute before:-inset-1 before:content-[\'\'] active:scale-90';
  return (
    <div className="flex flex-col gap-5 pb-1">
      <img src={enImage(qr.svg)} alt={l('Aperçu de ton QR code', 'Preview of your QR code')} className="mx-auto h-52 w-52 rounded-2xl border border-white/10 bg-nuit p-2" />

      <div>
        <p className="mb-2 text-[13.5px] font-medium text-white/85">{l('Couleur', 'Color')}</p>
        <div className="flex flex-wrap gap-2.5">
          {COULEURS_QR.map(c => (
            <button key={c} type="button" onClick={() => { vibrer(4); couleur(c); }} aria-pressed={style.couleur === c} aria-label={l(...NOMS[c])} title={l(...NOMS[c])}
              className={`${pastille} ${style.couleur === c ? 'outline-2 outline-offset-2 outline-white' : ''}`} style={{ background: c }} />
          ))}
          <label className={`${perso ? `${pastille} outline-2 outline-offset-2 outline-white` : 'relative grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-white/60 transition hover:text-white'}`}
            title={l('Une autre couleur', 'Another color')} style={perso ? { background: style.couleur } : undefined}>
            {!perso && <Icone nom="ui-plus" taille={20} />}
            <input type="color" value={style.couleur} onChange={e => couleur(e.target.value.toLowerCase())} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={l('Une autre couleur', 'Another color')} />
          </label>
        </div>
        {erreur && <p role="alert" className="mt-2 text-[13.5px] text-red-300">{erreur}</p>}
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="text-[13.5px] font-medium text-white/85">{l('Forme', 'Shape')}</span>
        <Segments label={l('Forme', 'Shape')} valeur={style.forme} onChange={forme => qr.changer({ ...style, forme })}
          options={[{ id: 'carres', nom: l('Carrés', 'Squares') }, { id: 'points', nom: l('Points', 'Dots') }]} />
      </div>

      <Interrupteur label={l('Ma photo au centre', 'My photo in the center')} actif={style.logo && !!avatar} disabled={!avatar} onChange={logo => qr.changer({ ...style, logo })}
        aide={avatar ? undefined : l('Ajoute d’abord une photo de profil à ta page.', 'Add a profile photo to your page first.')} />

      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={qr.vectoriel} className={classeBouton.secondaire}>{l('Télécharger en SVG', 'Download as SVG')}</button>
        <button type="button" onClick={() => { void qr.png(); }} className={classeBouton.principal}>{l('Télécharger en PNG', 'Download as PNG')}</button>
      </div>
    </div>
  );
}
