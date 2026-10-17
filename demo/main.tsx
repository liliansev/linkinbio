import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/styles/app.css';
import type { EtatAdmin, MiseEnPageBureau } from '../src/lib/types.ts';
import { estEnLigne } from '../src/lib/types.ts';
import { Admin } from '../src/admin/Admin.tsx';
import { PageLiens } from '../src/components/PageLiens.tsx';
import { apiDemo, pageDemo } from './api-demo.ts';

/* L'aperçu navigable : le vrai back office et la vraie page, sans serveur. */
function Demo() {
  const [vue, setVue] = useState(location.hash === '#page' ? 'page' : 'admin');
  const [etat, setEtat] = useState<EtatAdmin | null>(null);
  // Dans l'aperçu, on passe d'une mise en page à l'autre sans repasser par le back office.
  const [bureauChoisi, choisirBureau] = useState<MiseEnPageBureau | null>(null);
  useEffect(() => { const f = () => setVue(location.hash === '#page' ? 'page' : 'admin'); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  useEffect(() => { if (vue === 'admin') apiDemo.charger().then(setEtat); }, [vue]);
  if (vue === 'page') {
    const p = pageDemo();
    const bureau = bureauChoisi ?? p.reglages.bureau;
    return (
      <>
        <PageLiens page={{ reglages: { ...p.reglages, bureau }, blocs: p.blocs.filter(b => estEnLigne(b)) }} apercu />
        <div className="fixed left-1/2 top-4 z-50 hidden -translate-x-1/2 gap-1 rounded-full bg-white/90 p-1 font-sans text-[13px] font-semibold text-[#0c121f] shadow-2xl backdrop-blur lg:flex" role="radiogroup" aria-label="Mise en page sur ordinateur">
          {([['colonne', 'Colonne'], ['profil', 'Profil'], ['onepage', 'One page']] as const).map(([id, nom]) => (
            <button key={id} type="button" role="radio" aria-checked={bureau === id} onClick={() => choisirBureau(id)} className={`rounded-full px-4 py-2 ${bureau === id ? 'bg-[#0c121f] text-white' : 'hover:bg-black/5'}`}>{nom}</button>
          ))}
        </div>
        <a href="#" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-5 py-3 font-sans text-[14px] font-semibold text-[#0c121f] shadow-2xl">← Retour au back office</a>
      </>
    );
  }
  if (!etat) return null;
  return (
    <>
      <p className="bg-peche px-4 py-2 text-center font-sans text-[13px] font-medium text-nuit">Aperçu de démonstration : tes modifications restent dans ce navigateur, les statistiques sont fictives.</p>
      <Admin api={apiDemo} initial={etat} demo />
    </>
  );
}

createRoot(document.getElementById('app')!).render(<StrictMode><Demo /></StrictMode>);
