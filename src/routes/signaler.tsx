import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { MOTIFS_SIGNALEMENT } from '../lib/legal.ts';
import { envoyerSignalement } from '../server/fonctions.ts';
import { avecJeton, preparerTurnstile } from '../lib/turnstile.ts';
import { BoutonPrincipal, Champ, classeSaisie } from '../admin/ui.tsx';
import { Pied } from '../accueil/Fin.tsx';

/*
 * « Signaler cette page » (DSA, article 16) : le motif, l'explication, une
 * adresse facultative pour recevoir la décision, et la déclaration de bonne foi.
 */
export const Route = createFileRoute('/signaler')({
  validateSearch: (s: Record<string, unknown>) => ({ page: typeof s.page === 'string' ? s.page.toLowerCase().slice(0, 40) : '' }),
  head: () => ({ meta: [{ title: 'Signaler une page · Hopla' }, { name: 'robots', content: 'noindex, nofollow' }, { name: 'theme-color', content: '#0c121f' }] }),
  component: PageSignaler,
});

function PageSignaler() {
  const { page } = Route.useSearch();
  const [motif, setMotif] = useState('');
  const [details, setDetails] = useState('');
  const [email, setEmail] = useState('');
  const [bonneFoi, setBonneFoi] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<{ ok: boolean; message: string } | null>(null);
  useEffect(() => preparerTurnstile('signalement'), []);

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    try { setResultat(await avecJeton('signalement', jeton => envoyerSignalement({ data: { page, motif, details, email, bonneFoi, jeton } }))); }
    catch { setResultat({ ok: false, message: 'Le serveur ne répond pas. Réessaie dans un instant.' }); }
    setEnvoi(false);
  }

  return (
    <div className="adm min-h-dvh bg-nuit font-sans text-white antialiased">
      <main className="mx-auto max-w-lg px-5 py-12">
        <h1 className="text-[28px] font-semibold tracking-[-0.025em]">Signaler une page</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-white/60">
          {page ? <>Page <a href={`/${page}`} className="text-white underline">hopla.page/{page}</a>. </> : null}
          Chaque signalement est lu par une personne. Pour un contenu qui menace quelqu’un, préviens aussi les autorités (17 ou internet-signalement.gouv.fr).
        </p>
        {resultat?.ok ? (
          <p role="status" className="mt-8 rounded-2xl bg-emerald-400/10 px-4 py-4 text-[15px] text-emerald-100">{resultat.message}</p>
        ) : (
          <form onSubmit={envoyer} className="mt-8 flex flex-col gap-4">
            <fieldset>
              <legend className="mb-2 text-[13px] font-medium text-white/70">Motif</legend>
              <div className="flex flex-col gap-1.5">
                {MOTIFS_SIGNALEMENT.map(([id, nom]) => (
                  <label key={id} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3.5 text-[15px] transition ${motif === id ? 'bg-peche/15 text-white' : 'bg-white/[0.04] text-white/80 hover:bg-white/[0.07]'}`}>
                    <input type="radio" name="motif" value={id} checked={motif === id} onChange={() => setMotif(id)} className="accent-[#0a0a0a]" required />{nom}
                  </label>
                ))}
              </div>
            </fieldset>
            <Champ label="Ce qui pose problème" aide="Où sur la page (le lien ou le texte en cause) et pourquoi c’est illégal ou interdit.">
              <textarea required minLength={10} maxLength={2000} className={`${classeSaisie} min-h-32`} value={details} onChange={e => setDetails(e.target.value)} />
            </Champ>
            <Champ label="Ton adresse e-mail (facultatif)" aide="Pour recevoir un accusé de réception et la décision. Obligatoire en pratique si tu signales une atteinte à tes droits.">
              <input type="email" className={classeSaisie} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="toi@exemple.fr" />
            </Champ>
            <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-snug text-white/75">
              <input type="checkbox" checked={bonneFoi} onChange={e => setBonneFoi(e.target.checked)} required className="mt-0.5 h-5 w-5 shrink-0 accent-[#0a0a0a]" />
              Je déclare de bonne foi que les informations de ce signalement sont exactes et complètes.
            </label>
            <BoutonPrincipal type="submit" disabled={envoi}>{envoi ? 'Envoi…' : 'Envoyer le signalement'}</BoutonPrincipal>
            {resultat && <p role="alert" className="text-[14px] text-red-300">{resultat.message}</p>}
          </form>
        )}
        <p className="mt-10 text-[13px] text-white/45"><a href="/legal/cgu" className="hover:text-white">Conditions d’utilisation</a> · <a href="/legal/confidentialite" className="hover:text-white">Confidentialité</a></p>
      </main>
      <div className="hl hl-humain"><Pied /></div>
    </div>
  );
}
