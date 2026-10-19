import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { connecter } from '../../server/fonctions.ts';
import { Marque } from '../../admin/Marque.tsx';
import { classeBouton } from '../../admin/ui.tsx';

/*
 * Le lien reçu par e-mail arrive ici. La connexion part du navigateur (POST),
 * jamais du simple affichage : un antivirus de messagerie qui ouvre le lien
 * pour l'inspecter ne consomme pas le jeton.
 */
export const Route = createFileRoute('/admin/connexion')({
  validateSearch: (s: Record<string, unknown>) => ({ jeton: typeof s.jeton === 'string' ? s.jeton : '' }),
  head: () => ({ meta: [{ title: 'Connexion' }, { name: 'robots', content: 'noindex, nofollow' }, { name: 'referrer', content: 'no-referrer' }, { name: 'theme-color', content: '#f7f7f5' }] }),
  component: PageConnexion,
});

function PageConnexion() {
  const { jeton } = Route.useSearch();
  const [erreur, setErreur] = useState('');
  useEffect(() => {
    connecter({ data: { jeton } })
      .then(r => { if (r.ok) location.replace('/admin'); else setErreur(r.message); })
      .catch(() => setErreur('Le serveur ne répond pas. Réessaie dans un instant.'));
  }, [jeton]);
  return (
    <main className="adm adm-shell grid min-h-dvh place-items-center px-5 py-10 font-sans text-white antialiased">
      {/* Le même écran que la connexion : la marque, puis une carte qui dit ce qui se passe. */}
      <div className="w-full max-w-[420px]">
        <Marque className="mb-8 justify-center" />
        {erreur ? (
          <div className="adm-card p-6 sm:p-8">
            <h1 className="adm-titre">Connexion impossible</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-pretty text-white/60" role="alert">{erreur}</p>
            <a href="/admin" className={`${classeBouton.principal} mt-6 w-full`}>Demander un nouveau lien</a>
          </div>
        ) : <p className="text-center text-[14px] text-white/60" role="status">Connexion…</p>}
      </div>
    </main>
  );
}
