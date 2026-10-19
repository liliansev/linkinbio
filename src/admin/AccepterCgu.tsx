import { useState } from 'react';
import { BoutonPrincipal } from './ui.tsx';

/*
 * Avant le premier usage, et à chaque nouvelle version : accepter les CGU et
 * l'accord de traitement des données. Le serveur garde la version et la date ;
 * rien d'autre ne s'enregistre tant que ce n'est pas fait.
 */
export function AccepterCgu({ accepter, deconnexion }: { accepter: () => Promise<void>; deconnexion: () => void }) {
  const [coche, setCoche] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  async function valider() {
    setEnvoi(true);
    setErreur('');
    try { await accepter(); } catch { setErreur('Pas enregistré. Vérifie ta connexion et réessaie.'); setEnvoi(false); }
  }
  const lien = (doc: string, texte: string) => <a href={`/legal/${doc}`} target="_blank" rel="noopener" className="text-white underline">{texte}</a>;
  return (
    <main className="adm grid min-h-dvh place-items-center bg-nuit px-5 font-sans text-white antialiased">
      <div className="adm-onglet w-full max-w-md">
        {/* La marque d'abord : le premier écran dit chez qui l'on arrive et ce qui vient ensuite. */}
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 256 256" className="h-9 w-9" aria-hidden="true"><rect width="256" height="256" rx="64" fill="#ffb38a" /><g fill="#0c121f" transform="translate(40 40) scale(0.6875)"><path d="M165.66,90.34a8,8,0,0,1,0,11.32l-64,64a8,8,0,0,1-11.32-11.32l64-64A8,8,0,0,1,165.66,90.34ZM215.6,40.4a56,56,0,0,0-79.2,0L106.34,70.45a8,8,0,0,0,11.32,11.32l30.06-30a40,40,0,0,1,56.57,56.56l-30.07,30.06a8,8,0,0,0,11.31,11.32L215.6,119.6a56,56,0,0,0,0-79.2ZM138.34,174.22l-30.06,30.06a40,40,0,1,1-56.56-56.57l30.05-30.05a8,8,0,0,0-11.32-11.32L40.4,136.4a56,56,0,0,0,79.2,79.2l30.06-30.07a8,8,0,0,0-11.32-11.31Z" /></g></svg>
          <span className="text-[17px] font-semibold tracking-[-0.01em]">Hopla</span>
        </div>
        <h1 className="mt-6 text-[26px] font-semibold tracking-tight">Ta page de liens, en deux minutes</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-white/65">
          Encore une case à cocher, puis cinq questions et ta page est en ligne. Hopla l’héberge et mesure ses visites pour toi, sans cookie.
        </p>
        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl bg-white/[0.05] p-4 text-[15px] leading-snug">
          <input type="checkbox" checked={coche} onChange={e => setCoche(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-white" />
          <span>J’accepte les {lien('cgu', 'conditions d’utilisation')} et l’{lien('traitement-des-donnees', 'accord de traitement des données')}, et j’ai lu la {lien('confidentialite', 'politique de confidentialité')}.</span>
        </label>
        <BoutonPrincipal type="button" className="mt-4 w-full" disabled={!coche || envoi} onClick={valider}>{envoi ? 'Un instant…' : 'Continuer'}</BoutonPrincipal>
        {erreur && <p role="alert" className="mt-3 text-[14px] text-red-300">{erreur}</p>}
        <button type="button" onClick={deconnexion} className="mt-4 min-h-11 w-full text-center text-[14px] text-white/60 hover:text-white">Me déconnecter</button>
      </div>
    </main>
  );
}
