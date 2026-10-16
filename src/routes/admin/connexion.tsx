import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { connecter } from '../../server/fonctions.ts';

/*
 * Le lien reçu par e-mail arrive ici. La connexion part du navigateur (POST),
 * jamais du simple affichage : un antivirus de messagerie qui ouvre le lien
 * pour l'inspecter ne consomme pas le jeton.
 */
export const Route = createFileRoute('/admin/connexion')({
  validateSearch: (s: Record<string, unknown>) => ({ jeton: typeof s.jeton === 'string' ? s.jeton : '' }),
  head: () => ({ meta: [{ title: 'Connexion' }, { name: 'robots', content: 'noindex, nofollow' }, { name: 'referrer', content: 'no-referrer' }] }),
  component: PageConnexion,
});

function PageConnexion() {
  const { jeton } = Route.useSearch();
  const [erreur, setErreur] = useState('');
  useEffect(() => {
    connecter({ data: { jeton } })
      .then(r => { if (r.ok) location.replace('/liens/admin'); else setErreur(r.message); })
      .catch(() => setErreur('Le serveur ne répond pas. Réessaie dans un instant.'));
  }, [jeton]);
  return (
    <main className="adm grid min-h-dvh place-items-center bg-nuit px-5 text-center font-sans text-white">
      {erreur ? (
        <div className="max-w-sm">
          <p className="text-[16px]">{erreur}</p>
          <a href="/liens/admin" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-peche px-6 font-semibold text-nuit">Demander un nouveau lien</a>
        </div>
      ) : <p className="text-white/60">Connexion…</p>}
    </main>
  );
}
