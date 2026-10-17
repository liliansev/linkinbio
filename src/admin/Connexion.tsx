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
    <main className="adm grid min-h-dvh place-items-center bg-nuit px-5 font-sans text-white antialiased">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-peche/15 text-peche"><Icone nom="lien" taille={28} /></span>
        <h1 className="mt-5 text-[26px] font-semibold tracking-tight">Mes liens</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-white/60">Pas de mot de passe : entre l’adresse de ton compte, un lien de connexion part dans ta boîte.</p>
        {etat.type === 'ok' ? (
          <div className="adm-onglet mt-7 rounded-2xl bg-emerald-400/10 px-4 py-4 text-[15px] text-emerald-100" role="status">
            <span className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-emerald-400/15"><Icone nom="courrier" taille={20} /></span>
            {etat.message}
            {etat.lienDev && <a href={etat.lienDev} className="mt-3 block break-all text-[13px] text-peche underline">{etat.lienDev}</a>}
          </div>
        ) : (
          <form onSubmit={envoyer} className="mt-7 flex flex-col gap-3 text-left">
            <label className="sr-only" htmlFor="email">Adresse e-mail</label>
            <input id="email" type="email" required autoComplete="email" inputMode="email" placeholder="toi@exemple.fr" value={email} onChange={e => setEmail(e.target.value)} className={classeSaisie} />
            <BoutonPrincipal type="submit" className="w-full" disabled={etat.type === 'envoi'}>{etat.type === 'envoi' ? 'Envoi…' : 'Recevoir mon lien de connexion'}</BoutonPrincipal>
          </form>
        )}
        {etat.type === 'erreur' && <p className="mt-4 text-[14px] text-red-300" role="alert">{etat.message}</p>}
      </div>
    </main>
  );
}
