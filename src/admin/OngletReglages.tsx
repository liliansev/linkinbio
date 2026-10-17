import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { ComptePage, Reglages } from '../lib/types.ts';
import { urlPage } from '../lib/types.ts';
import { BoutonSecondaire, Carte, Champ, Interrupteur, classeSaisie } from './ui.tsx';

export function OngletReglages({ reglages, compte, onChange, onDeconnexion, urlExport, supprimerMonCompte }: {
  reglages: Reglages; compte: ComptePage; onChange: (r: Reglages) => void; onDeconnexion: () => void;
  urlExport: string | null; supprimerMonCompte: (confirmation: string) => Promise<{ ok: boolean; message: string }>;
}) {
  const URL_PUBLIQUE = urlPage(compte);
  const [qr, setQr] = useState('');
  const [copie, setCopie] = useState(false);
  const seo = (champs: Partial<Reglages['seo']>) => onChange({ ...reglages, seo: { ...reglages.seo, ...champs } });
  useEffect(() => {
    QRCode.toDataURL(`${URL_PUBLIQUE}?s=qr`, { width: 720, margin: 2, color: { dark: '#0c121f', light: '#ffffff' }, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr(''));
  }, [URL_PUBLIQUE]);
  async function copier() {
    try { await navigator.clipboard.writeText(URL_PUBLIQUE); setCopie(true); setTimeout(() => setCopie(false), 1800); } catch { /* presse-papiers refusé */ }
  }

  return (
    <div className="flex flex-col gap-4">
      <Carte titre="Ta page">
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.06] p-1.5 pl-3.5">
          <span className="min-w-0 flex-1 truncate text-[15px] text-white">{URL_PUBLIQUE.replace(/^https:\/\//, '').replace(/\/$/, '')}</span>
          <button type="button" onClick={copier} className="min-h-10 rounded-full bg-white px-4 text-[14px] font-semibold text-nuit">{copie ? 'Copié' : 'Copier'}</button>
        </div>
        {qr && (
          <div className="mt-4 flex items-center gap-4">
            <img src={qr} alt="QR code vers ta page" className="h-28 w-28 rounded-xl bg-white p-1" />
            <div className="flex flex-col gap-2">
              <p className="text-[13.5px] leading-snug text-white/60">À imprimer sur une carte ou à projeter en fin de conférence. Les scans apparaissent dans tes stats, source « QR code ».</p>
              <a href={qr} download={`qr-${compte.principal ? 'liliansevoumian' : compte.pseudo}-liens.png`} className="inline-flex min-h-10 w-fit items-center rounded-full bg-white/[0.08] px-4 text-[14px] font-medium text-white">Télécharger le QR code</a>
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
            {compte.principal
              ? <Interrupteur label="Page visible par Google" aide={reglages.seo.indexable ? 'La page peut apparaître dans les résultats de recherche.' : 'La page demande aux moteurs de ne pas l’indexer.'} actif={reglages.seo.indexable} onChange={v => seo({ indexable: v })} />
              : <p className="py-3 text-[13.5px] leading-snug text-white/55">Pendant la bêta, ta page n’apparaît pas dans Google. Le titre et la description servent aux aperçus quand tu partages ton lien.</p>}
            <Interrupteur label="Bouton Partager" aide="En haut à droite de ta page." actif={reglages.partage} onChange={v => onChange({ ...reglages, partage: v })} />
          </div>
        </div>
      </Carte>

      <TesDonnees compte={compte} urlExport={urlExport} supprimerMonCompte={supprimerMonCompte} />

      <BoutonSecondaire onClick={onDeconnexion} className="self-center">Me déconnecter</BoutonSecondaire>
    </div>
  );
}

/** Le RGPD en libre-service : tout télécharger, ou tout effacer (sauf le compte principal). */
function TesDonnees({ compte, urlExport, supprimerMonCompte }: { compte: ComptePage; urlExport: string | null; supprimerMonCompte: (confirmation: string) => Promise<{ ok: boolean; message: string }> }) {
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  async function supprimer() {
    setEnvoi(true);
    setErreur('');
    try {
      const r = await supprimerMonCompte(saisie);
      if (r.ok) { location.replace('/liens/'); return; }
      setErreur(r.message);
    } catch { setErreur('Le serveur ne répond pas. Réessaie dans un instant.'); }
    setEnvoi(false);
  }
  const lien = 'text-white/60 underline decoration-white/25 underline-offset-2 hover:text-white';
  return (
    <Carte titre="Tes données">
      <p className="text-[13.5px] leading-snug text-white/60">Ta page, tes liens, tes images et tes statistiques, dans un fichier que tu peux garder ou importer ailleurs.</p>
      {urlExport
        ? <a href={urlExport} download className="mt-3 inline-flex min-h-10 items-center rounded-full bg-white/[0.08] px-4 text-[14px] font-medium text-white hover:bg-white/[0.13]">Télécharger mes données</a>
        : <p className="mt-3 text-[13px] text-white/45">L’export n’existe pas dans l’aperçu.</p>}
      {!compte.principal && (
        <div className="mt-5 border-t border-white/[0.06] pt-4">
          {ouvert ? (
            <div className="flex flex-col gap-3">
              <p className="text-[13.5px] leading-snug text-red-200/90">Ta page disparaît tout de suite, avec tes liens, tes images et tes statistiques. Rien ne se récupère. Pour confirmer, tape ton pseudo, <strong className="text-white">{compte.pseudo}</strong>.</p>
              <input className={classeSaisie} value={saisie} onChange={e => setSaisie(e.target.value)} autoCapitalize="none" autoComplete="off" spellCheck={false} aria-label="Ton pseudo, pour confirmer" />
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={envoi || saisie.trim().toLowerCase() !== compte.pseudo} onClick={supprimer} className="min-h-10 rounded-full bg-red-500 px-4 text-[14px] font-medium text-white disabled:opacity-40">{envoi ? 'Suppression…' : 'Supprimer définitivement'}</button>
                <button type="button" onClick={() => { setOuvert(false); setSaisie(''); }} className="min-h-10 rounded-full px-4 text-[14px] text-white/60 hover:text-white">Annuler</button>
              </div>
              {erreur && <p role="alert" className="text-[13.5px] text-red-300">{erreur}</p>}
            </div>
          ) : (
            <button type="button" onClick={() => setOuvert(true)} className="min-h-10 rounded-full px-1 text-[14px] font-medium text-red-300 hover:text-red-200">Supprimer mon compte</button>
          )}
        </div>
      )}
      <p className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
        <a href="/liens/legal/cgu" target="_blank" rel="noopener" className={lien}>Conditions d’utilisation</a>
        <a href="/liens/legal/confidentialite" target="_blank" rel="noopener" className={lien}>Confidentialité</a>
        <a href="/liens/legal/traitement-des-donnees" target="_blank" rel="noopener" className={lien}>Accord de traitement</a>
      </p>
    </Carte>
  );
}
