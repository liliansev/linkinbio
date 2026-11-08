import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Icone } from '../components/Icone.tsx';
import { classeBouton } from './ui.tsx';
import { useL } from '../accueil/langue.ts';

/**
 * Le QR code de la page, à télécharger. Il mène à l'adresse marquée `?s=qr` :
 * ceux qui le scannent se comptent à part dans Stats.
 */
const dessiner = (adresse: string) => QRCode.toDataURL(`${adresse}?s=qr`, { width: 720, margin: 2, color: { dark: '#0a0a0a', light: '#ffffff' }, errorCorrectionLevel: 'M' });

/** Télécharge le QR code sans l'afficher (la ligne QR code de Réglages). */
export async function telechargerQR(adresse: string, pseudo: string) {
  const lien = document.createElement('a');
  lien.href = await dessiner(adresse);
  lien.download = `qr-${pseudo}-hopla.png`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
}

export function CodeQR({ adresse, pseudo }: { adresse: string; pseudo: string }) {
  const [qr, setQr] = useState('');
  const l = useL();
  useEffect(() => { dessiner(adresse).then(setQr).catch(() => setQr('')); }, [adresse]);
  if (!qr) return null;
  return (
    <div className="flex flex-col items-center gap-3">
      <img src={qr} alt={l('QR code vers ta page', 'QR code to your page')} className="h-44 w-44 rounded-2xl border border-white/10 bg-nuit p-1.5" />
      <a href={qr} download={`qr-${pseudo}-hopla.png`} className={classeBouton.secondaire}><Icone nom="telecharger" taille={16} />{l('Télécharger le QR code', 'Download the QR code')}</a>
    </div>
  );
}
