import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { BoutonPrincipal, classeBouton, classeSaisie } from './ui.tsx';
import { Marque } from './Marque.tsx';

/* L'écran de connexion : son adresse, et le lien arrive par e-mail. Sur le bleu de l'accueil, d'où l'on arrive. */
export function Connexion({ demander }: { demander: (email: string) => Promise<{ ok: boolean; message: string; lienDev?: string }> }) {
  const [email, setEmail] = useState('');
  const [etat, setEtat] = useState<{ type: 'repos' | 'envoi' | 'ok' | 'erreur'; message?: string; lienDev?: string }>({ type: 'repos' });
  // Le formulaire disparaît avec son bouton : le focus passe au titre qui le remplace, au lieu de tomber sur la page.
  const titreEnvoye = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (etat.type === 'ok') titreEnvoye.current?.focus(); }, [etat.type]);
  async function envoyer(e: FormEvent) {
    e.preventDefault();
    setEtat({ type: 'envoi' });
    try {
      const r = await demander(email);
      setEtat({ type: r.ok ? 'ok' : 'erreur', message: r.message, lienDev: r.lienDev });
    } catch { setEtat({ type: 'erreur', message: 'Le serveur ne répond pas. Réessaie dans un instant.' }); }
  }
  return (
    <main className="adm adm-shell adm-entree grid min-h-dvh place-items-center px-5 py-10 font-sans text-white antialiased">
      <div className="w-full max-w-[420px]">
        <Marque className="mb-8 justify-center" surBleu />
        {/* Une fois le lien parti, la carte ne parle plus que de lui : la consigne d'avant ne reste pas au-dessus. */}
        {etat.type === 'ok' ? (
          <div className="adm-card adm-onglet p-6 sm:p-8" role="status">
            <h1 ref={titreEnvoye} tabIndex={-1} className="adm-titre">Regarde ta boîte mail</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-white/75">{etat.message}</p>
            <p className="mt-2 text-[14px] leading-relaxed text-white/60">Rien reçu ? Regarde dans les indésirables.</p>
            {etat.lienDev && <a href={etat.lienDev} className="mt-3 block break-all text-[13px] text-bleu underline">{etat.lienDev}</a>}
            <button type="button" onClick={() => setEtat({ type: 'repos' })} className={`${classeBouton.secondaire} mt-6 w-full`}>Utiliser une autre adresse</button>
          </div>
        ) : (
          <div className="adm-card p-6 sm:p-8">
            <h1 className="adm-titre">Ton espace Hopla</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-white/60">Pas de mot de passe : entre l’adresse de ton compte, un lien de connexion part dans ta boîte.</p>
            <form onSubmit={envoyer} aria-busy={etat.type === 'envoi'} className="mt-6 flex flex-col gap-3">
              <label className="text-[13px] font-medium" htmlFor="email">Adresse e-mail</label>
              <input id="email" type="email" required autoComplete="email" autoCapitalize="none" inputMode="email" placeholder="toi@exemple.fr" value={email} onChange={e => setEmail(e.target.value)} className={classeSaisie} />
              <BoutonPrincipal type="submit" className="w-full" disabled={etat.type === 'envoi'}>{etat.type === 'envoi' ? 'Envoi…' : 'Recevoir mon lien de connexion'}</BoutonPrincipal>
            </form>
            {etat.type === 'erreur' && <p className="mt-4 text-[14px] text-red-300" role="alert">{etat.message}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
