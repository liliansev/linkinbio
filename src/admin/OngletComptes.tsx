import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { ApiComptes, CompteResume, SignalementResume } from '../lib/types.ts';
import { nomMotif } from '../lib/legal.ts';
import { cheminPage, sansSchema, urlPage } from '../lib/types.ts';
import { BoutonPrincipal, Carte, Champ, classeBadge, classeBouton, classeSaisie } from './ui.tsx';

/*
 * Les comptes, dans le back office de Lilian seulement. Pendant la bêta on
 * n'entre que sur invitation : Lilian saisit l'adresse et le pseudo, la
 * personne reçoit un lien valable une semaine.
 */

type Message = { ok: boolean; texte: string; lienDev?: string };

const date = (ts: number) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(ts);
const nombre = (n: number) => n.toLocaleString('fr-FR');

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
  const enPro = autres.filter(c => c.pro).length;

  return (
    <div className="flex flex-col gap-4">
      <Signalements api={api} onChange={recharger} />

      <Carte titre="Inviter quelqu’un">
        <form onSubmit={inviter} className="flex max-w-md flex-col gap-3">
          <Champ label="Son adresse e-mail">
            <input type="email" required className={classeSaisie} value={email} onChange={e => setEmail(e.target.value)} placeholder="prenom@exemple.fr" autoComplete="off" />
          </Champ>
          <Champ label="Son pseudo" aide={<>Sa page : hopla.page/<span className="text-white">{pseudo || 'pseudo'}</span></>}>
            <input required className={classeSaisie} value={pseudo} maxLength={30} placeholder="prenom-nom" autoComplete="off" autoCapitalize="none" spellCheck={false}
              onChange={e => setPseudo(e.target.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-'))} />
          </Champ>
          <BoutonPrincipal type="submit" disabled={envoi}>{envoi ? 'Envoi…' : 'Créer la page et envoyer l’invitation'}</BoutonPrincipal>
          {message && (
            <p role={message.ok ? 'status' : 'alert'} className={`rounded-xl px-3.5 py-2.5 text-[14px] ${message.ok ? 'bg-white/[0.05] text-white' : 'bg-red-400/10 text-red-200'}`}>
              {message.texte}
              {message.lienDev && <a href={message.lienDev} className="mt-2 block break-all text-[12.5px] text-white underline">{message.lienDev}</a>}
            </p>
          )}
        </form>
      </Carte>

      <Carte titre="Les comptes" action={comptes && <span className="text-[13px] text-white/50">{autres.length ? `${actifs} actif${actifs > 1 ? 's' : ''} sur ${autres.length}${enPro ? `, ${enPro} en Pro` : ''}` : 'Aucun invité'}</span>}>
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
  // Suspendre et supprimer demandent un motif, envoyé à la personne (DSA, article 17).
  const [action, setAction] = useState<null | 'suspendre' | 'supprimer'>(null);
  const [motif, setMotif] = useState('');
  const [occupe, setOccupe] = useState(false);
  const suspendu = compte.statut === 'suspendu';

  async function agir(faire: () => Promise<unknown>) {
    setOccupe(true);
    try { await faire(); } catch (error) { onMessage({ ok: false, texte: (error as Error).message || 'L’action n’a pas abouti. Réessaie.' }); }
    setOccupe(false);
    setAction(null);
    setMotif('');
    onChange();
  }

  return (
    <li className="flex flex-col gap-2.5 px-1 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[15.5px] font-semibold">
            <span className="truncate">{compte.principal ? 'Toi' : compte.pseudo}</span>
            {!compte.principal && compte.pro && <span className={classeBadge}>Pro</span>}
            {suspendu && <span className="inline-flex items-center rounded-[7px] bg-amber-400/15 px-1.5 py-0.5 text-[11.5px] font-semibold text-amber-200">Suspendu</span>}
          </p>
          <p className="truncate text-[13px] text-white/50">{compte.principal ? `Ta page, ${sansSchema(urlPage(compte))}` : compte.email}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[15px] font-semibold tabular-nums">{nombre(compte.vues)}</p>
          <p className="text-[11.5px] text-white/55">vues en 30 j</p>
        </div>
      </div>
      {!compte.principal && (
        <>
          <p className="text-[12.5px] text-white/55">{compte.blocs} bloc{compte.blocs > 1 ? 's' : ''} · invité le {date(compte.cree)} · {compte.connexion ? `dernière connexion le ${date(compte.connexion)}` : 'aucune connexion'}</p>
          {action ? (
            <div className="flex flex-col gap-2.5">
              <Champ label={action === 'suspendre' ? 'Motif de la suspension' : 'Motif de la suppression (facultatif)'}
                aide={action === 'suspendre' ? 'Envoyé à la personne par e-mail : les faits, la règle des CGU en cause. Elle peut contester en répondant.' : 'Laisse vide si la personne l’a demandé. Sinon, le motif lui est envoyé par e-mail.'}>
                <textarea className={`${classeSaisie} min-h-24`} value={motif} maxLength={2000} onChange={e => setMotif(e.target.value)} />
              </Champ>
              {action === 'supprimer' && <p className="text-[12.5px] text-red-200/80">Sa page, ses liens, ses images et ses statistiques seront effacés. Rien ne se récupère.</p>}
              <div className="flex flex-wrap gap-2">
                {action === 'suspendre'
                  ? <button type="button" disabled={occupe || !motif.trim()} className={classeBouton.principal} onClick={() => agir(() => api.changerStatut(compte.id, 'suspendu', motif))}>Suspendre et prévenir</button>
                  : <button type="button" disabled={occupe} className={classeBouton.danger} onClick={() => agir(() => api.supprimer(compte.id, motif))}>Supprimer définitivement</button>}
                <button type="button" className={classeBouton.discret} onClick={() => { setAction(null); setMotif(''); }}>Annuler</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <a href={cheminPage({ pseudo: compte.pseudo, principal: false })} target="_blank" rel="noopener" className={classeBouton.secondaire}>Voir la page</a>
              {!suspendu && (
                <button type="button" disabled={occupe} className={classeBouton.secondaire}
                  onClick={() => agir(async () => { const r = await api.renvoyer(compte.id); onMessage({ ok: r.ok, texte: r.ok ? `Nouveau lien envoyé à ${compte.email}.` : r.message, lienDev: r.lienDev }); })}>Renvoyer un lien</button>
              )}
              {suspendu
                ? <button type="button" disabled={occupe} className={classeBouton.secondaire} onClick={() => agir(() => api.changerStatut(compte.id, 'actif', ''))}>Réactiver</button>
                : <button type="button" disabled={occupe} className={classeBouton.secondaire} onClick={() => setAction('suspendre')}>Suspendre</button>}
              <button type="button" disabled={occupe} className={`${classeBouton.discret} !text-red-300 hover:!bg-red-400/10`} onClick={() => setAction('supprimer')}>Supprimer</button>
            </div>
          )}
        </>
      )}
    </li>
  );
}

/** Les signalements reçus par le formulaire des pages : ouverts d'abord, puis l'historique. */
function Signalements({ api, onChange }: { api: ApiComptes; onChange: () => void }) {
  const [liste, setListe] = useState<SignalementResume[] | null>(null);
  const [voirTout, setVoirTout] = useState(false);
  const recharger = useCallback(() => api.signalements().then(setListe).catch(() => setListe([])), [api]);
  useEffect(() => { recharger(); }, [recharger]);
  if (!liste) return null;
  const ouverts = liste.filter(s => s.statut === 'ouvert');
  const traites = liste.filter(s => s.statut !== 'ouvert');
  return (
    <Carte titre="Signalements" action={<span className={`text-[13px] ${ouverts.length ? 'text-amber-200' : 'text-white/50'}`}>{ouverts.length ? `${ouverts.length} à traiter` : 'Rien à traiter'}</span>}>
      {ouverts.length === 0 && <p className="text-[13.5px] text-white/50">Quand quelqu’un signale une page, le signalement arrive ici et dans ta boîte mail.</p>}
      <ul className="-mx-1 flex flex-col divide-y divide-white/[0.06]">
        {ouverts.map(s => <LigneSignalement key={s.id} s={s} api={api} onChange={() => { recharger(); onChange(); }} />)}
      </ul>
      {traites.length > 0 && (
        <>
          <button type="button" onClick={() => setVoirTout(v => !v)} className="mt-1 min-h-11 text-[13.5px] text-white/55 hover:text-white">{voirTout ? 'Masquer l’historique' : `Voir l’historique (${traites.length})`}</button>
          {voirTout && (
            <ul className="mt-1 flex flex-col divide-y divide-white/[0.06] border-t border-white/[0.06]">
              {traites.map(s => (
                <li key={s.id} className="px-1 py-2.5 text-[13px] text-white/60">
                  <span className="text-white/85">{s.pseudo || 'compte supprimé'}</span> · {nomMotif(s.motif)} · {date(s.ts)} · {s.statut === 'suspendu' ? 'page suspendue' : 'sans suite'}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Carte>
  );
}

function LigneSignalement({ s, api, onChange }: { s: SignalementResume; api: ApiComptes; onChange: () => void }) {
  const [action, setAction] = useState<null | 'sans-suite' | 'suspendu'>(null);
  const [decision, setDecision] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');
  async function valider() {
    if (!action) return;
    setOccupe(true);
    setErreur('');
    try { await api.traiterSignalement(s.id, action, decision); onChange(); }
    catch (error) { setErreur((error as Error).message || 'L’action n’a pas abouti.'); setOccupe(false); }
  }
  return (
    <li className="flex flex-col gap-2 px-1 py-3.5">
      <p className="text-[15px] font-semibold">{nomMotif(s.motif)} <span className="font-normal text-white/50">sur</span> <a href={cheminPage({ pseudo: s.pseudo, principal: false })} target="_blank" rel="noopener" className="underline decoration-white/30 underline-offset-2">{s.pseudo}</a></p>
      <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-white/75">{s.details}</p>
      <p className="text-[12.5px] text-white/55">Reçu le {date(s.ts)} · {s.contact ? 'la personne recevra la décision par e-mail' : 'anonyme'}</p>
      {action ? (
        <div className="flex flex-col gap-2.5">
          <Champ label={action === 'suspendu' ? 'Motif de la suspension, envoyé au compte' : 'Réponse à la personne qui a signalé (facultatif)'}
            aide={action === 'suspendu' ? 'Les faits et la règle des CGU ou la loi en cause.' : 'Vide : « la page ne nous paraît pas enfreindre la loi ni nos conditions ».'}>
            <textarea className={`${classeSaisie} min-h-20`} value={decision} maxLength={2000} onChange={e => setDecision(e.target.value)} />
          </Champ>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={occupe || (action === 'suspendu' && !decision.trim())} onClick={valider} className={classeBouton.principal}>{action === 'suspendu' ? 'Suspendre la page' : 'Classer sans suite'}</button>
            <button type="button" onClick={() => { setAction(null); setDecision(''); }} className={classeBouton.discret}>Annuler</button>
          </div>
          {erreur && <p role="alert" className="text-[13px] text-red-300">{erreur}</p>}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setAction('sans-suite')} className={classeBouton.secondaire}>Sans suite</button>
          <button type="button" onClick={() => setAction('suspendu')} className={classeBouton.secondaire}>Suspendre la page</button>
        </div>
      )}
    </li>
  );
}
