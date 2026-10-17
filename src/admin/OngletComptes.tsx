import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { ApiComptes, CompteResume } from '../lib/types.ts';
import { cheminPage } from '../lib/types.ts';
import { BoutonPrincipal, Carte, Champ, classeSaisie } from './ui.tsx';

/*
 * Les comptes, dans le back office de Lilian seulement. Pendant la bêta on
 * n'entre que sur invitation : Lilian saisit l'adresse et le pseudo, la
 * personne reçoit un lien valable une semaine.
 */

type Message = { ok: boolean; texte: string; lienDev?: string };

const date = (ts: number | null) => (ts ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(ts) : 'jamais');

export function OngletComptes({ api }: { api: ApiComptes }) {
  const [comptes, setComptes] = useState<CompteResume[] | null>(null);
  const [erreur, setErreur] = useState('');
  const [email, setEmail] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const recharger = useCallback(() => api.lister().then(setComptes).catch(() => setErreur('La liste ne s’est pas chargée. Recharge la page.')), [api]);
  useEffect(() => { recharger(); }, [recharger]);

  async function inviter(e: FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setMessage(null);
    try {
      const r = await api.inviter(email, pseudo);
      setMessage({ ok: r.ok, texte: r.message, lienDev: r.lienDev });
      if (r.ok) { setEmail(''); setPseudo(''); }
      await recharger();
    } catch { setMessage({ ok: false, texte: 'Le serveur ne répond pas. Réessaie dans un instant.' }); }
    setEnvoi(false);
  }

  const autres = comptes?.filter(c => !c.principal) ?? [];
  const actifs = autres.filter(c => c.statut === 'actif').length;

  return (
    <div className="flex flex-col gap-4">
      <Carte titre="Inviter quelqu’un">
        <form onSubmit={inviter} className="flex flex-col gap-3">
          <Champ label="Son adresse e-mail">
            <input type="email" required className={classeSaisie} value={email} onChange={e => setEmail(e.target.value)} placeholder="prenom@exemple.fr" autoComplete="off" />
          </Champ>
          <Champ label="Son pseudo" aide={<>Sa page : liliansevoumian.fr/liens/<span className="text-white">{pseudo || 'pseudo'}</span></>}>
            <input required className={classeSaisie} value={pseudo} maxLength={30} placeholder="prenom-nom" autoComplete="off" autoCapitalize="none" spellCheck={false}
              onChange={e => setPseudo(e.target.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-'))} />
          </Champ>
          <BoutonPrincipal type="submit" disabled={envoi}>{envoi ? 'Envoi…' : 'Créer la page et envoyer l’invitation'}</BoutonPrincipal>
          {message && (
            <p role={message.ok ? 'status' : 'alert'} className={`rounded-xl px-3.5 py-2.5 text-[14px] ${message.ok ? 'bg-emerald-400/10 text-emerald-100' : 'bg-red-400/10 text-red-200'}`}>
              {message.texte}
              {message.lienDev && <a href={message.lienDev} className="mt-2 block break-all text-[12.5px] text-peche underline">{message.lienDev}</a>}
            </p>
          )}
        </form>
      </Carte>

      <Carte titre="Les comptes" action={comptes && <span className="text-[13px] text-white/50">{autres.length ? `${actifs} actif${actifs > 1 ? 's' : ''} sur ${autres.length}` : 'Aucun invité'}</span>}>
        {erreur && <p className="text-[14px] text-red-300" role="alert">{erreur}</p>}
        {!comptes && !erreur && <p className="text-[14px] text-white/50">Chargement…</p>}
        {comptes && (
          <ul className="-mx-1 flex flex-col divide-y divide-white/[0.06]">
            {comptes.map(c => <LigneCompte key={c.id} compte={c} api={api} onChange={recharger} onMessage={setMessage} />)}
          </ul>
        )}
      </Carte>
    </div>
  );
}

function LigneCompte({ compte, api, onChange, onMessage }: { compte: CompteResume; api: ApiComptes; onChange: () => void; onMessage: (m: Message) => void }) {
  const [confirmer, setConfirmer] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const suspendu = compte.statut === 'suspendu';

  async function agir(action: () => Promise<unknown>) {
    setOccupe(true);
    try { await action(); } catch { onMessage({ ok: false, texte: 'L’action n’a pas abouti. Réessaie.' }); }
    setOccupe(false);
    setConfirmer(false);
    onChange();
  }

  const bouton = 'min-h-9 rounded-full px-3.5 text-[13.5px] font-medium transition disabled:opacity-50';
  return (
    <li className="flex flex-col gap-2.5 px-1 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[15.5px] font-semibold">
            <span className="truncate">{compte.principal ? 'Toi' : compte.pseudo}</span>
            {suspendu && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11.5px] font-medium text-amber-200">Suspendu</span>}
          </p>
          <p className="truncate text-[13px] text-white/50">{compte.principal ? 'Ta page, liliansevoumian.fr/liens' : compte.email}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[15px] font-semibold tabular-nums">{compte.vues}</p>
          <p className="text-[11.5px] text-white/45">vues en 30 j</p>
        </div>
      </div>
      {!compte.principal && (
        <>
          <p className="text-[12.5px] text-white/45">{compte.blocs} bloc{compte.blocs > 1 ? 's' : ''} · invité le {date(compte.cree)} · dernière connexion {date(compte.connexion)}</p>
          <div className="flex flex-wrap gap-2">
            <a href={cheminPage({ pseudo: compte.pseudo, principal: false })} target="_blank" rel="noopener" className={`${bouton} inline-flex items-center bg-white/[0.08] text-white hover:bg-white/[0.13]`}>Voir la page</a>
            {!suspendu && (
              <button type="button" disabled={occupe} className={`${bouton} bg-white/[0.08] text-white hover:bg-white/[0.13]`}
                onClick={() => agir(async () => { const r = await api.renvoyer(compte.id); onMessage({ ok: r.ok, texte: r.ok ? `Nouveau lien envoyé à ${compte.email}.` : r.message, lienDev: r.lienDev }); })}>Renvoyer un lien</button>
            )}
            <button type="button" disabled={occupe} className={`${bouton} bg-white/[0.08] text-white hover:bg-white/[0.13]`}
              onClick={() => agir(() => api.changerStatut(compte.id, suspendu ? 'actif' : 'suspendu'))}>{suspendu ? 'Réactiver' : 'Suspendre'}</button>
            {confirmer ? (
              <>
                <button type="button" disabled={occupe} className={`${bouton} bg-red-500 text-white hover:bg-red-400`} onClick={() => agir(() => api.supprimer(compte.id))}>Supprimer définitivement</button>
                <button type="button" className={`${bouton} text-white/60 hover:text-white`} onClick={() => setConfirmer(false)}>Annuler</button>
              </>
            ) : (
              <button type="button" disabled={occupe} className={`${bouton} text-red-300 hover:bg-red-400/10`} onClick={() => setConfirmer(true)}>Supprimer</button>
            )}
          </div>
          {confirmer && <p className="text-[12.5px] text-red-200/80">Sa page, ses liens, ses images et ses statistiques seront effacés. Rien ne se récupère.</p>}
        </>
      )}
    </li>
  );
}
