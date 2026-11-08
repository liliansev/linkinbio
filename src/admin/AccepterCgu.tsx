import { useState } from 'react';
import { BoutonPrincipal, classeBouton } from './ui.tsx';
import { Marque } from './Marque.tsx';
import { useL, useLangue } from '../accueil/langue.ts';
import { cheminLegal } from '../lib/legal-en.ts';
import type { NomDocument } from '../lib/legal.ts';

/*
 * Avant le premier usage, et à chaque nouvelle version : accepter les CGU et
 * l'accord de traitement des données. Le serveur garde la version et la date ;
 * rien d'autre ne s'enregistre tant que ce n'est pas fait.
 */
export function AccepterCgu({ accepter, deconnexion }: { accepter: () => Promise<void>; deconnexion: () => void }) {
  const l = useL();
  const langue = useLangue();
  const [coche, setCoche] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  async function valider() {
    // Le bouton reste actif : sans la case, il dit ce qui manque au lieu de rester gris sans un mot.
    if (!coche) { setErreur(l('Coche la case pour continuer.', 'Tick the box to continue.')); document.getElementById('cgu-case')?.focus(); return; }
    setEnvoi(true);
    setErreur('');
    try { await accepter(); } catch { setErreur(l('Pas enregistré. Vérifie ta connexion et réessaie.', 'Not saved. Check your connection and try again.')); setEnvoi(false); }
  }
  const lien = (doc: NomDocument, texte: string) => <a href={cheminLegal(doc, langue)} target="_blank" rel="noopener" className="text-bleu underline decoration-bleu/35 underline-offset-2 hover:text-[#1d1fd6] hover:decoration-current">{texte}</a>;
  return (
    <main className="adm adm-shell adm-entree grid min-h-dvh place-items-center px-5 py-10 font-sans text-white antialiased">
      <div className="adm-onglet w-full max-w-[420px]">
        {/* La marque d'abord, sur le bleu, comme à la connexion : le premier écran dit chez qui l'on arrive et ce qui vient ensuite. */}
        <Marque className="mb-8 justify-center" surBleu />
        <div className="adm-card p-6 sm:p-8">
          <h1 className="adm-titre">{l('Ta page de liens, en deux minutes', 'Your link page, in two minutes')}</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-white/65">
            {l('Encore une case à cocher, puis quatre questions et ta page est en ligne. Hopla l’héberge et mesure ses visites pour toi, sans cookie.', 'One box to tick, then four questions and your page is live. Hopla hosts it and counts its visits for you, without cookies.')}
          </p>
          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-white/15 p-4 text-[14.5px] leading-snug transition hover:border-white/30 has-[:checked]:border-bleu has-[:checked]:bg-[#f3f3ff]">
            <input id="cgu-case" type="checkbox" checked={coche} onChange={e => { setCoche(e.target.checked); setErreur(''); }} aria-describedby={erreur ? 'cgu-erreur' : undefined} aria-invalid={erreur && !coche ? true : undefined} className="mt-0.5 h-5 w-5 shrink-0 accent-bleu" />
            <span>{l(<>J’accepte les {lien('cgu', 'conditions d’utilisation')} et l’{lien('traitement-des-donnees', 'accord de traitement des données')}, et j’ai lu la {lien('confidentialite', 'politique de confidentialité')}.</>, <>I accept the {lien('cgu', 'terms of use')} and the {lien('traitement-des-donnees', 'data processing agreement')}, and I have read the {lien('confidentialite', 'privacy policy')}.</>)}</span>
          </label>
          {/* L'erreur sous la case qu'elle concerne, pas sous le bouton. */}
          {erreur && <p id="cgu-erreur" role="alert" className="mt-2 text-[14px] text-red-300">{erreur}</p>}
          <BoutonPrincipal type="button" className="mt-4 w-full" disabled={envoi} onClick={valider}>{envoi ? l('Un instant…', 'One moment…') : l('Continuer', 'Continue')}</BoutonPrincipal>
          <button type="button" onClick={deconnexion} className={`${classeBouton.discret} mt-3 w-full`}>{l('Me déconnecter', 'Sign out')}</button>
        </div>
      </div>
    </main>
  );
}
