import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { MOTIFS_SIGNALEMENT } from '../lib/legal.ts';
import { envoyerSignalement } from '../server/fonctions.ts';
import { avecJeton, preparerTurnstile } from '../lib/turnstile.ts';
import { Pied } from '../accueil/Fin.tsx';
import { Barre } from '../accueil/Ouverture.tsx';

/*
 * « Signaler cette page » (DSA, article 16) : le motif, l'explication, une
 * adresse facultative pour recevoir la décision, et la déclaration de bonne foi.
 */
export const Route = createFileRoute('/signaler')({
  validateSearch: (s: Record<string, unknown>) => ({ page: typeof s.page === 'string' ? s.page.toLowerCase().slice(0, 40) : '' }),
  head: () => ({ meta: [{ title: 'Signaler une page · Hopla' }, { name: 'robots', content: 'noindex, nofollow' }, { name: 'theme-color', content: '#292bff' }] }),
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

  // Le gabarit des pages publiques (26 octobre 2026, audit des alignements), comme les textes légaux.
  return (
    <div className="hl hl-humain hf">
      <a href="#contenu" className="hl-evitement">Aller au contenu</a>
      <Barre ailleurs />
      <main id="contenu">
        <section className="hl-heros hf-heros" data-teinte="klein" aria-labelledby="titre">
          <nav className="hf-fil" aria-label="Fil d’Ariane"><a href="/">Hopla</a></nav>
          <h1 id="titre" className="hl-h1 hf-titre">Signaler une page</h1>
          <p className="hl-chapo">
            {page ? <>Page <a href={`/${page}`}>hopla.page/{page}</a>. </> : null}
            Chaque signalement est lu par une personne. Pour un contenu qui menace quelqu’un, préviens aussi les autorités (17 ou internet-signalement.gouv.fr).
          </p>
        </section>
        <div className="hl-section hl-etroite hf-signaler">
          {resultat?.ok ? (
            <p role="status" className="hf-signaler-fait">{resultat.message}</p>
          ) : (
            <form onSubmit={envoyer}>
              <fieldset>
                <legend>Motif</legend>
                <div className="hf-motifs">
                  {MOTIFS_SIGNALEMENT.map(([id, nom]) => (
                    <label key={id}>
                      <input type="radio" name="motif" value={id} checked={motif === id} onChange={() => setMotif(id)} required />{nom}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="hf-champ">
                <span>Ce qui pose problème</span>
                <small>Où sur la page (le lien ou le texte en cause) et pourquoi c’est illégal ou interdit.</small>
                <textarea required minLength={10} maxLength={2000} value={details} onChange={e => setDetails(e.target.value)} />
              </label>
              <label className="hf-champ">
                <span>Ton adresse e-mail (facultatif)</span>
                <small>Pour recevoir un accusé de réception et la décision. Obligatoire en pratique si tu signales une atteinte à tes droits.</small>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="toi@exemple.fr" />
              </label>
              <label className="hf-bonne-foi">
                <input type="checkbox" checked={bonneFoi} onChange={e => setBonneFoi(e.target.checked)} required />
                Je déclare de bonne foi que les informations de ce signalement sont exactes et complètes.
              </label>
              <button type="submit" className="hl-btn" disabled={envoi}>{envoi ? 'Envoi…' : 'Envoyer le signalement'}</button>
              {resultat && <p role="alert" className="hf-signaler-erreur">{resultat.message}</p>}
            </form>
          )}
          <nav className="hf-legal-docs" aria-label="Textes légaux">
            <a href="/legal/cgu">Conditions d’utilisation</a>
            <a href="/legal/confidentialite">Confidentialité</a>
          </nav>
        </div>
      </main>
      <Pied />
    </div>
  );
}
