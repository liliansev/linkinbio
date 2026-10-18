import { useState } from 'react';
import { BoutonPrincipal } from './ui.tsx';
import { Icone } from '../components/Icone.tsx';

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
        <Icone nom="lien" taille={32} className="text-white" />
        <h1 className="mt-5 text-[26px] font-semibold tracking-tight">Avant de commencer</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-white/65">
          Hopla héberge ta page et mesure ses visites pour toi, sans cookie.
        </p>
        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl bg-white/[0.05] p-4 text-[15px] leading-snug">
          <input type="checkbox" checked={coche} onChange={e => setCoche(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#ffb38a]" />
          <span>J’accepte les {lien('cgu', 'conditions d’utilisation')} et l’{lien('traitement-des-donnees', 'accord de traitement des données')}, et j’ai lu la {lien('confidentialite', 'politique de confidentialité')}.</span>
        </label>
        <BoutonPrincipal type="button" className="mt-4 w-full" disabled={!coche || envoi} onClick={valider}>{envoi ? 'Un instant…' : 'Continuer'}</BoutonPrincipal>
        {erreur && <p role="alert" className="mt-3 text-[14px] text-red-300">{erreur}</p>}
        <button type="button" onClick={deconnexion} className="mt-4 min-h-11 w-full text-center text-[14px] text-white/60 hover:text-white">Me déconnecter</button>
      </div>
    </main>
  );
}
