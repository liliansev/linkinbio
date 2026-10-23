import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/styles/app.css';
import type { EtatAdmin, MiseEnPageBureau } from '../src/lib/types.ts';
import { estEnLigne } from '../src/lib/types.ts';
import { Admin } from '../src/admin/Admin.tsx';
import { THEMES } from '../src/lib/themes.ts';
import { PageLiens } from '../src/components/PageLiens.tsx';
import { apiDemo, apiGratuit, apiNouveau, blocsVitrine, pageDemo, recommencerNouveau } from './api-demo.ts';

/* L'aperçu navigable : le vrai back office et la vraie page, sans serveur. */
function Demo() {
  const lireVue = () => (/^#(page|vitrine|mention)/.test(location.hash) ? 'page' : location.hash === '#nouveau' ? 'nouveau' : location.hash === '#gratuit' ? 'gratuit' : 'admin');
  const [vue, setVue] = useState(lireVue);
  // Passer de `#page=klein` à `#page=riso` ne change pas de vue : l'adresse elle-même redessine la page.
  const [hash, setHash] = useState(() => location.hash);
  const [etat, setEtat] = useState<EtatAdmin | null>(null);
  // Chaque « Recommencer » remonte le back office du nouvel inscrit à zéro.
  const [tour, setTour] = useState(0);
  // Dans l'aperçu, on passe d'une mise en page à l'autre sans repasser par le back office.
  const [bureauChoisi, choisirBureau] = useState<MiseEnPageBureau | null>(null);
  useEffect(() => { const f = () => { setEtat(null); setVue(lireVue()); setHash(location.hash); }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  useEffect(() => { if (vue !== 'page') (vue === 'nouveau' ? apiNouveau : vue === 'gratuit' ? apiGratuit : apiDemo).charger().then(setEtat); }, [vue, tour]);
  if (vue === 'page') {
    const p = pageDemo();
    const bureau = bureauChoisi ?? p.reglages.bureau;
    // `#page=klein` montre la page dans un autre thème, avec ses boutons conseillés : pour revoir chaque thème d'un coup d'œil.
    const autre = THEMES.find(t => t.id === hash.split('=')[1]);
    if (autre) p.reglages = { ...p.reglages, theme: autre.id, couleurs: { fond: '', boutons: '', accent: '' }, bouton: { ...p.reglages.bouton, ...autre.conseil } };
    // `#vitrine=klein` : la vitrine d'exemple dans un thème, pour la planche de captures.
    if (hash.startsWith('#vitrine')) {
      return <PageLiens key={hash} page={{ reglages: { ...p.reglages, bureau }, blocs: blocsVitrine(), compte: p.compte }} apercu />;
    }
    // `#mention=klein` : une page courte (deux liens) d'un compte Gratuit, pour la planche du pied de page : la mention Hopla et les liens légaux.
    const mention = hash.startsWith('#mention');
    const liens = p.blocs.filter(b => b.type === 'lien' && estEnLigne(b));
    return (
      <>
        {mention
          ? <PageLiens key={hash} page={{ reglages: { ...p.reglages, bureau }, blocs: [liens[0], liens[1]].filter(Boolean), compte: { pseudo: 'camille', principal: false, plan: 'gratuit' } }} apercu />
          : <PageLiens page={{ reglages: { ...p.reglages, bureau }, blocs: p.blocs.filter(b => estEnLigne(b)), compte: p.compte }} apercu />}
        <div className="fixed left-1/2 top-4 z-50 hidden -translate-x-1/2 gap-1 rounded-xl border border-black/10 bg-white/90 p-1 font-sans text-[13px] font-semibold text-[#0a0a0a] shadow-lg backdrop-blur lg:flex" role="radiogroup" aria-label="Mise en page sur ordinateur">
          {([['colonne', 'Colonne'], ['profil', 'Profil'], ['onepage', 'One page']] as const).map(([id, nom]) => (
            <button key={id} type="button" role="radio" aria-checked={bureau === id} onClick={() => choisirBureau(id)} className={`rounded-lg px-4 py-2 ${bureau === id ? 'bg-[#0a0a0a] text-white' : 'hover:bg-black/5'}`}>{nom}</button>
          ))}
        </div>
        {!mention && <a href="#" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-xl bg-[#0a0a0a] px-5 py-3 font-sans text-[14px] font-semibold text-white shadow-lg">← Retour au back office</a>}
      </>
    );
  }
  if (!etat) return null;
  if (vue === 'nouveau') {
    return (
      <>
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[#0a0a0a] px-4 py-2 text-center font-sans text-[13px] font-medium text-white">
          <span>L’arrivée d’un nouvel inscrit, juste après son lien d’invitation.</span>
          <button type="button" className="underline" onClick={() => { recommencerNouveau(); setEtat(null); setTour(t => t + 1); }}>Recommencer</button>
          <a href="#" className="underline">Retour à la démo</a>
        </p>
        <Admin key={tour} api={apiNouveau} initial={etat} demo />
      </>
    );
  }
  if (vue === 'gratuit') {
    return (
      <>
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[#0a0a0a] px-4 py-2 text-center font-sans text-[13px] font-medium text-white">
          <span>Un compte en Gratuit et le chemin vers les offres. Paiement simulé ; se déconnecter remet tout à zéro.</span>
          <a href="#" className="underline">Retour à la démo</a>
        </p>
        <Admin api={apiGratuit} initial={etat} demo />
      </>
    );
  }
  return (
    <>
      <p className="bg-[#0a0a0a] px-4 py-2 text-center font-sans text-[13px] font-medium text-white">Aperçu de démonstration : tes modifications restent dans ce navigateur, les statistiques sont fictives. <a href="#nouveau" className="underline">Voir l’arrivée d’un nouvel inscrit</a></p>
      <Admin api={apiDemo} initial={etat} demo />
    </>
  );
}

createRoot(document.getElementById('app')!).render(<StrictMode><Demo /></StrictMode>);
