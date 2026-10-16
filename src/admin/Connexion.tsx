import { useState } from 'react';
import { BoutonPrincipal } from './ui.tsx';

/* L'écran de connexion : un bouton, et le lien arrive par e-mail. */
export function Connexion({ adresse, demander }: { adresse: string; demander: () => Promise<{ ok: boolean; message: string; lienDev?: string }> }) {
  const [etat, setEtat] = useState<{ type: 'repos' | 'envoi' | 'ok' | 'erreur'; message?: string; lienDev?: string }>({ type: 'repos' });
  async function envoyer() {
    setEtat({ type: 'envoi' });
    try {
      const r = await demander();
      setEtat({ type: r.ok ? 'ok' : 'erreur', message: r.message, lienDev: r.lienDev });
    } catch { setEtat({ type: 'erreur', message: 'Le serveur ne répond pas. Réessaie dans un instant.' }); }
  }
  return (
    <main className="adm grid min-h-dvh place-items-center bg-nuit px-5 font-sans text-white antialiased">
      <div className="w-full max-w-sm text-center">
        <img src="/liens/avatar.webp" alt="" className="mx-auto h-20 w-20 rounded-full object-cover ring-4 ring-white/10" />
        <h1 className="mt-5 text-[26px] font-semibold tracking-tight">Mes liens</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-white/60">Pas de mot de passe : un lien de connexion part sur {adresse}. Il marche une fois, pendant 15 minutes.</p>
        {etat.type === 'ok' ? (
          <div className="mt-7 rounded-2xl bg-emerald-400/10 px-4 py-4 text-[15px] text-emerald-100" role="status">
            📬 {etat.message}
            {etat.lienDev && <a href={etat.lienDev} className="mt-3 block break-all text-[13px] text-peche underline">{etat.lienDev}</a>}
          </div>
        ) : (
          <BoutonPrincipal className="mt-7 w-full" onClick={envoyer} disabled={etat.type === 'envoi'}>{etat.type === 'envoi' ? 'Envoi…' : 'Recevoir mon lien de connexion'}</BoutonPrincipal>
        )}
        {etat.type === 'erreur' && <p className="mt-4 text-[14px] text-red-300" role="alert">{etat.message}</p>}
        <a href="/liens/" className="mt-8 inline-block text-[14px] text-white/45 hover:text-white">← Voir la page publique</a>
      </div>
    </main>
  );
}
