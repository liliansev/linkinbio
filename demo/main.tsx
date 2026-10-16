import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/styles/app.css';
import type { EtatAdmin } from '../src/lib/types.ts';
import { estEnLigne } from '../src/lib/types.ts';
import { Admin } from '../src/admin/Admin.tsx';
import { PageLiens } from '../src/components/PageLiens.tsx';
import { apiDemo, pageDemo } from './api-demo.ts';

/* L'aperçu navigable : le vrai back office et la vraie page, sans serveur. */
function Demo() {
  const [vue, setVue] = useState(location.hash === '#page' ? 'page' : 'admin');
  const [etat, setEtat] = useState<EtatAdmin | null>(null);
  useEffect(() => { const f = () => setVue(location.hash === '#page' ? 'page' : 'admin'); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  useEffect(() => { if (vue === 'admin') apiDemo.charger().then(setEtat); }, [vue]);
  if (vue === 'page') {
    const p = pageDemo();
    return (
      <>
        <PageLiens page={{ reglages: p.reglages, blocs: p.blocs.filter(b => estEnLigne(b)) }} apercu />
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
