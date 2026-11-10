import { useState } from 'react';
import type { ApiPages, PageDuCompte } from '../lib/types.ts';
import { NOM_PUBLIC } from '../lib/types.ts';
import { focusAuto } from '../lib/clavier';
import { nomSaisi } from '../lib/valider.ts';
import { Champ, Feuille, Groupe, LigneLien, classeBouton, classeSaisie } from './ui.tsx';
import { choix, useLangue } from '../accueil/langue.ts';

/*
 * Mes pages, en tête de Réglages (10 novembre 2026, lot 6 d'après Taap.it, Premium) : jusqu'à trois pages pour un même
 * compte, chacune avec son nom, ses blocs, ses stats et ses réglages. Un toucher passe de l'une à l'autre : le back
 * office se recharge sur la page choisie. Une page ajoutée s'ouvre sur ses premiers pas.
 */

/** Recharge le back office sur la page où la session vient de passer. */
const recharger = () => location.assign(location.pathname);

export function MesPages({ pages, max, api }: { pages: PageDuCompte[]; max: number; api: ApiPages }) {
  const tr = choix(useLangue());
  const [ajout, setAjout] = useState(false);
  const [passage, setPassage] = useState('');
  const [erreur, setErreur] = useState('');

  async function passer(id: string) {
    setPassage(id); setErreur('');
    try { if ((await api.changer(id)).ok) return recharger(); } catch { /* dit dessous */ }
    setPassage('');
    setErreur(tr('Cette page ne s’ouvre pas. Réessaie dans un instant.', 'This page won’t open. Try again in a moment.'));
  }

  return (
    <>
      <Groupe titre={tr('Mes pages', 'My pages')}>
        {pages.map(p => (
          <LigneLien key={p.id} nom={<span translate="no">{NOM_PUBLIC}/{p.pseudo}</span>} courant={p.courante} disabled={!!passage}
            valeur={p.courante ? tr('Celle que tu règles', 'The one you’re editing') : !p.enLigne ? tr('Hors ligne : demande Premium', 'Offline: needs Premium') : passage === p.id ? tr('Un instant…', 'One moment…') : tr('Passer sur cette page', 'Switch to this page')}
            onClick={p.courante ? undefined : () => void passer(p.id)} label={p.courante ? undefined : tr(`Passer sur la page ${p.pseudo}`, `Switch to the page ${p.pseudo}`)} />
        ))}
        {pages.length < max && (
          <LigneLien nom={tr('Ajouter une page', 'Add a page')} valeur={tr(`Encore ${max - pages.length} sur ${max}, chacune avec son nom et ses stats`, `${max - pages.length} of ${max} left, each with its own name and analytics`)}
            onClick={() => setAjout(true)} />
        )}
      </Groupe>
      {erreur && <p role="alert" className="-mt-3 text-[13.5px] text-red-300">{erreur}</p>}
      <Feuille petite ouverte={ajout} onFermer={() => setAjout(false)} titre={tr('Ajouter une page', 'Add a page')}>
        {fermer => <NouvellePage api={api} annuler={() => fermer()} />}
      </Feuille>
    </>
  );
}

function NouvellePage({ api, annuler }: { api: ApiPages; annuler: () => void }) {
  const tr = choix(useLangue());
  const [nom, setNom] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  async function creer() {
    setEnvoi(true); setErreur('');
    try {
      const r = await api.creer(nom.trim());
      if (r.ok) return recharger();
      setErreur(r.message);
    } catch { setErreur(tr('Le serveur ne répond pas. Réessaie dans un instant.', 'The server isn’t responding. Try again in a moment.')); }
    setEnvoi(false);
  }
  return (
    <form onSubmit={e => { e.preventDefault(); if (nom.trim()) void creer(); }} className="flex flex-col gap-4 pb-1">
      <p className="text-[14px] leading-snug text-white/75">{tr('Une autre page, pour un autre projet : son adresse, ses liens, son thème et ses stats à elle. Ton offre vaut pour toutes.', 'Another page, for another project: its own address, links, theme and analytics. Your plan covers them all.')}</p>
      <Champ label={tr('Son nom', 'Its name')} aide={<span translate="no">{NOM_PUBLIC}/{nomSaisi(nom).replace(/-$/, '') || tr('son-nom', 'its-name')}</span>} erreur={erreur || undefined}>
        <input className={classeSaisie} value={nom} maxLength={30} onChange={e => { setNom(e.target.value); setErreur(''); }} autoFocus={focusAuto()} autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} required />
      </Champ>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={annuler} className={classeBouton.discret}>{tr('Annuler', 'Cancel')}</button>
        <button type="submit" disabled={envoi || !nom.trim()} className={classeBouton.principal}>{envoi ? tr('Un instant…', 'One moment…') : tr('Créer cette page', 'Create this page')}</button>
      </div>
    </form>
  );
}
