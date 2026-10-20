import { useState } from 'react';
import { BoutonPrincipal, classeBouton } from './ui.tsx';
import { Marque } from './Marque.tsx';

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
    // Le bouton reste actif : sans la case, il dit ce qui manque au lieu de rester gris sans un mot.
    if (!coche) { setErreur('Coche la case pour continuer.'); document.getElementById('cgu-case')?.focus(); return; }
    setEnvoi(true);
    setErreur('');
    try { await accepter(); } catch { setErreur('Pas enregistré. Vérifie ta connexion et réessaie.'); setEnvoi(false); }
  }
  const lien = (doc: string, texte: string) => <a href={`/legal/${doc}`} target="_blank" rel="noopener" className="text-white underline">{texte}</a>;
  return (
    <main className="adm adm-shell grid min-h-dvh place-items-center px-5 py-10 font-sans text-white antialiased">
      <div className="adm-onglet w-full max-w-[420px]">
        {/* La marque d'abord, comme à la connexion : le premier écran dit chez qui l'on arrive et ce qui vient ensuite. */}
        <Marque className="mb-8 justify-center" />
        <div className="adm-card p-6 sm:p-8">
          <h1 className="adm-titre">Ta page de liens, en deux minutes</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-white/65">
            Encore une case à cocher, puis cinq questions et ta page est en ligne. Hopla l’héberge et mesure ses visites pour toi, sans cookie.
          </p>
          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-white/15 p-4 text-[14.5px] leading-snug transition hover:border-white/30">
            <input id="cgu-case" type="checkbox" checked={coche} onChange={e => { setCoche(e.target.checked); setErreur(''); }} aria-describedby={erreur ? 'cgu-erreur' : undefined} aria-invalid={erreur && !coche ? true : undefined} className="mt-0.5 h-5 w-5 shrink-0 accent-white" />
            <span>J’accepte les {lien('cgu', 'conditions d’utilisation')} et l’{lien('traitement-des-donnees', 'accord de traitement des données')}, et j’ai lu la {lien('confidentialite', 'politique de confidentialité')}.</span>
          </label>
          {/* L'erreur sous la case qu'elle concerne, pas sous le bouton. */}
          {erreur && <p id="cgu-erreur" role="alert" className="mt-2 text-[14px] text-red-300">{erreur}</p>}
          <BoutonPrincipal type="button" className="mt-4 w-full" disabled={envoi} onClick={valider}>{envoi ? 'Un instant…' : 'Continuer'}</BoutonPrincipal>
          <button type="button" onClick={deconnexion} className={`${classeBouton.discret} mt-3 w-full`}>Me déconnecter</button>
        </div>
      </div>
    </main>
  );
}
