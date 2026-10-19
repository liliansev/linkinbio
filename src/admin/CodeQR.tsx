import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Icone } from '../components/Icone.tsx';
import { classeBouton } from './ui.tsx';

/**
 * Le QR code de la page, à télécharger. Il mène à l'adresse marquée `?s=qr` :
 * ceux qui le scannent se comptent à part dans Stats.
 */
export function CodeQR({ adresse, pseudo }: { adresse: string; pseudo: string }) {
  const [qr, setQr] = useState('');
  useEffect(() => {
    QRCode.toDataURL(`${adresse}?s=qr`, { width: 720, margin: 2, color: { dark: '#0a0a0a', light: '#ffffff' }, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr(''));
  }, [adresse]);
  if (!qr) return null;
  return (
    <div className="flex flex-col items-center gap-3">
      <img src={qr} alt="QR code vers ta page" className="h-44 w-44 rounded-2xl border border-white/10 bg-nuit p-1.5" />
      <a href={qr} download={`qr-${pseudo}-hopla.png`} className={classeBouton.secondaire}><Icone nom="telecharger" taille={16} />Télécharger le QR code</a>
    </div>
  );
}
