import { useState } from 'react';
import type { FormEvent } from 'react';
import { BoutonPrincipal, classeSaisie } from './ui.tsx';
import { Icone } from '../components/Icone.tsx';

/* L'écran de connexion : son adresse, et le lien arrive par e-mail. */
export function Connexion({ demander }: { demander: (email: string) => Promise<{ ok: boolean; message: string; lienDev?: string }> }) {
  const [email, setEmail] = useState('');
  const [etat, setEtat] = useState<{ type: 'repos' | 'envoi' | 'ok' | 'erreur'; message?: string; lienDev?: string }>({ type: 'repos' });
  async function envoyer(e: FormEvent) {
    e.preventDefault();
    setEtat({ type: 'envoi' });
    try {
      const r = await demander(email);
      setEtat({ type: r.ok ? 'ok' : 'erreur', message: r.message, lienDev: r.lienDev });
    } catch { setEtat({ type: 'erreur', message: 'Le serveur ne répond pas. Réessaie dans un instant.' }); }
  }
  return (
    <main className="adm adm-shell grid min-h-dvh place-items-center px-5 py-10 font-sans text-white antialiased">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex items-center justify-center gap-2.5 text-[23px] font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-nuit"><Icone nom="lien" taille={21} /></span>Hopla.
        </div>
        <div className="adm-card p-6 sm:p-8">
        <h1 className="text-[26px] font-semibold tracking-tight">Ton espace Hopla</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-white/60">Pas de mot de passe : entre l’adresse de ton compte, un lien de connexion part dans ta boîte.</p>
        {etat.type === 'ok' ? (
          <div className="adm-onglet mt-6 text-[14px] leading-relaxed" role="status">
            <span className="mb-3 flex items-center gap-2 font-semibold"><Icone nom="courrier" taille={20} />Regarde ta boîte mail</span>
            <p>{etat.message}</p>
            {etat.lienDev && <a href={etat.lienDev} className="mt-3 block break-all text-[13px] text-white underline">{etat.lienDev}</a>}
            <button type="button" onClick={() => setEtat({ type: 'repos' })} className="mt-4 min-h-11 rounded-lg text-[13px] font-medium text-white/60 underline underline-offset-4 hover:text-white">Utiliser une autre adresse</button>
          </div>
        ) : (
          <form onSubmit={envoyer} aria-busy={etat.type === 'envoi'} className="mt-6 flex flex-col gap-3">
            <label className="text-[13px] font-medium" htmlFor="email">Adresse e-mail</label>
            <input id="email" type="email" required autoComplete="email" autoCapitalize="none" inputMode="email" placeholder="toi@exemple.fr" value={email} onChange={e => setEmail(e.target.value)} className={classeSaisie} />
            <BoutonPrincipal type="submit" className="w-full" disabled={etat.type === 'envoi'}>{etat.type === 'envoi' ? 'Envoi…' : 'Recevoir mon lien de connexion'}</BoutonPrincipal>
          </form>
        )}
        {etat.type === 'erreur' && <p className="mt-4 text-[14px] text-red-300" role="alert">{etat.message}</p>}
        </div>
      </div>
    </main>
  );
}
