import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { Reglages } from '../lib/types.ts';
import { BoutonSecondaire, Carte, Champ, Interrupteur, classeSaisie } from './ui.tsx';

export const URL_PUBLIQUE = 'https://liliansevoumian.fr/liens/';

export function OngletReglages({ reglages, onChange, onDeconnexion }: { reglages: Reglages; onChange: (r: Reglages) => void; onDeconnexion: () => void }) {
  const [qr, setQr] = useState('');
  const [copie, setCopie] = useState(false);
  const seo = (champs: Partial<Reglages['seo']>) => onChange({ ...reglages, seo: { ...reglages.seo, ...champs } });
  useEffect(() => {
    QRCode.toDataURL(`${URL_PUBLIQUE}?s=qr`, { width: 720, margin: 2, color: { dark: '#0c121f', light: '#ffffff' }, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr(''));
  }, []);
  async function copier() {
    try { await navigator.clipboard.writeText(URL_PUBLIQUE); setCopie(true); setTimeout(() => setCopie(false), 1800); } catch { /* presse-papiers refusé */ }
  }

  return (
    <div className="flex flex-col gap-4">
      <Carte titre="Ta page">
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.06] p-1.5 pl-3.5">
          <span className="min-w-0 flex-1 truncate text-[15px] text-white">liliansevoumian.fr/liens</span>
          <button type="button" onClick={copier} className="min-h-10 rounded-full bg-white px-4 text-[14px] font-semibold text-nuit">{copie ? 'Copié ✓' : 'Copier'}</button>
        </div>
        {qr && (
          <div className="mt-4 flex items-center gap-4">
            <img src={qr} alt="QR code vers ta page" className="h-28 w-28 rounded-xl bg-white p-1" />
            <div className="flex flex-col gap-2">
              <p className="text-[13.5px] leading-snug text-white/60">À imprimer sur une carte ou à projeter en fin de conférence. Les scans apparaissent dans tes stats, source « QR code ».</p>
              <a href={qr} download="qr-liliansevoumian-liens.png" className="inline-flex min-h-10 w-fit items-center rounded-full bg-white/[0.08] px-4 text-[14px] font-medium text-white">Télécharger le QR code</a>
            </div>
          </div>
        )}
      </Carte>

      <Carte titre="Référencement">
        <div className="flex flex-col gap-3">
          <Champ label="Titre dans Google et sur les réseaux" aide={`${reglages.seo.titre.length}/60 caractères conseillés`}>
            <input className={classeSaisie} value={reglages.seo.titre} maxLength={80} onChange={e => seo({ titre: e.target.value })} />
          </Champ>
          <Champ label="Description" aide={`${reglages.seo.description.length}/160 caractères conseillés`}>
            <textarea className={`${classeSaisie} min-h-20`} value={reglages.seo.description} maxLength={200} onChange={e => seo({ description: e.target.value })} />
          </Champ>
          <div className="divide-y divide-white/[0.06]">
            <Interrupteur label="Page visible par Google" aide={reglages.seo.indexable ? 'La page peut apparaître dans les résultats de recherche.' : 'La page demande aux moteurs de ne pas l’indexer.'} actif={reglages.seo.indexable} onChange={v => seo({ indexable: v })} />
            <Interrupteur label="Bouton Partager" aide="En haut à droite de ta page." actif={reglages.partage} onChange={v => onChange({ ...reglages, partage: v })} />
          </div>
        </div>
      </Carte>

      <BoutonSecondaire onClick={onDeconnexion} className="self-center">Me déconnecter</BoutonSecondaire>
    </div>
  );
}
