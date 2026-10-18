import { useCallback, useEffect, useState } from 'react';
import type { Api, Contact, FournisseurListe, Liste } from '../lib/types.ts';
import { Icone } from '../components/Icone.tsx';
import { BoutonPrincipal, Carte, Champ, Feuille, Segments, classeSaisie } from './ui.tsx';

/*
 * Les inscrits de « Rejoins ma liste », dans l'onglet Stats : combien, les
 * derniers, l'export CSV, et le branchement sur Brevo ou Mailchimp.
 */

const nombre = (n: number) => n.toLocaleString('fr-FR');
const quand = (ts: number) => {
  const h = (Date.now() - ts) / 3_600_000;
  if (h < 1) return 'à l’instant';
  if (h < 24) return `il y a ${Math.floor(h)} h`;
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};
const NOMS: Record<FournisseurListe, string> = { brevo: 'Brevo', mailchimp: 'Mailchimp' };

export function MaListe({ api }: { api: Pick<Api, 'liste' | 'brancherListe' | 'supprimerContact' | 'resynchroniser' | 'urlContacts'> }) {
  const [liste, setListe] = useState<Liste | null>(null);
  const [ouverte, setOuverte] = useState(false);
  const recharger = useCallback(() => api.liste().then(setListe).catch(() => {}), [api]);
  useEffect(() => { recharger(); }, [recharger]);
  if (!liste) return null;
  return (
    <>
      <Carte titre="Ta liste" action={<button type="button" onClick={() => setOuverte(true)} className="min-h-11 rounded-full bg-white/[0.08] px-3.5 text-[13.5px] font-medium text-white hover:bg-white/[0.13]">Gérer</button>}>
        {liste.total ? (
          <>
            <div className="flex items-end gap-3">
              <p className="text-[34px] font-semibold leading-none tracking-tight tabular-nums">{nombre(liste.total)}</p>
              <p className="pb-1 text-[13.5px] text-white/60">inscrit{liste.total > 1 ? 's' : ''}{liste.semaine ? <>, dont <span className="text-emerald-300">+{nombre(liste.semaine)}</span> cette semaine</> : ''}</p>
            </div>
            <p className="mt-2.5 flex items-center gap-1.5 text-[13px] text-white/55">
              <Icone nom={liste.integration ? 'ui-ok' : 'courrier'} taille={14} />
              {liste.integration ? `Envoyés aussi chez ${NOMS[liste.integration.fournisseur]}${liste.integration.nom ? `, liste « ${liste.integration.nom} »` : ''}.` : 'Gardés ici. Exporte-les en CSV, ou branche Brevo ou Mailchimp.'}
            </p>
          </>
        ) : <p className="text-[14px] leading-snug text-white/60">Ajoute « Ma liste d’inscrits » à ta page : chaque adresse arrive ici, et chez Brevo ou Mailchimp si tu les branches. Inclus dans l’offre gratuite.</p>}
      </Carte>
      {ouverte && <FeuilleListe liste={liste} api={api} onFermer={() => setOuverte(false)} onChange={recharger} />}
    </>
  );
}

function FeuilleListe({ liste, api, onFermer, onChange }: { liste: Liste; api: Parameters<typeof MaListe>[0]['api']; onFermer: () => void; onChange: () => void }) {
  const [choix, setChoix] = useState<'hopla' | FournisseurListe>(liste.integration?.fournisseur ?? 'hopla');
  const [cle, setCle] = useState('');
  const [id, setId] = useState(liste.integration?.liste ?? '');
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>(liste.derniers);
  const memeFournisseur = liste.integration?.fournisseur === choix;

  async function brancher() {
    setEnvoi(true); setMessage(null);
    try {
      const r = await api.brancherListe(choix === 'hopla' ? null : { fournisseur: choix, cle, liste: id });
      setMessage({ ok: r.ok, texte: r.message });
      if (r.ok) { setCle(''); onChange(); }
    } catch { setMessage({ ok: false, texte: 'Le serveur ne répond pas. Réessaie dans un instant.' }); }
    setEnvoi(false);
  }
  async function renvoyer() {
    setEnvoi(true);
    try {
      const r = await api.resynchroniser();
      setMessage({ ok: !r.erreurs, texte: r.erreurs ? `${r.envoyes} envoyés, ${r.erreurs} refusés : vérifie ta clé et ta liste.` : `${r.envoyes} inscrit${r.envoyes > 1 ? 's' : ''} envoyé${r.envoyes > 1 ? 's' : ''}.` });
      onChange();
    } catch { setMessage({ ok: false, texte: 'Le serveur ne répond pas.' }); }
    setEnvoi(false);
  }

  return (
    <Feuille ouverte onFermer={onFermer} titre="Ta liste">
      <div className="flex flex-col gap-5 pt-1">
        <section className="flex flex-col gap-3">
          <span className="text-[13px] font-medium text-white/70">Où vont les inscrits</span>
          <Segments label="Fournisseur" valeur={choix} onChange={v => { setChoix(v); setMessage(null); }}
            options={[{ id: 'hopla', nom: 'Ici seulement' }, { id: 'brevo', nom: 'Brevo' }, { id: 'mailchimp', nom: 'Mailchimp' }]} />
          {choix !== 'hopla' && (
            <>
              <Champ label="Clé d’API" aide={choix === 'brevo' ? 'Brevo : Paramètres, SMTP et API, Clés API.' : 'Mailchimp : Profil, Extras, Clés API. Elle finit par …-us21.'}>
                <input className={classeSaisie} value={cle} onChange={e => setCle(e.target.value)} autoComplete="off" spellCheck={false} autoCapitalize="none"
                  placeholder={memeFournisseur && liste.integration?.cle ? `Enregistrée (${liste.integration.cle})` : choix === 'brevo' ? 'xkeysib-…' : '…-us21'} />
              </Champ>
              <Champ label={choix === 'brevo' ? 'Numéro de la liste' : 'Identifiant de l’audience'} aide={choix === 'brevo' ? 'Contacts, Listes : le numéro dans la colonne ID.' : 'Audience, Paramètres, « Audience name and defaults ».'}>
                <input className={classeSaisie} value={id} onChange={e => setId(e.target.value)} inputMode={choix === 'brevo' ? 'numeric' : 'text'} autoCapitalize="none" spellCheck={false} />
              </Champ>
              <p className="text-[12.5px] leading-snug text-white/55">Ta clé est chiffrée sur le serveur et ne s’affiche plus jamais. Hopla s’en sert seulement pour ajouter tes inscrits.</p>
            </>
          )}
          {(choix !== 'hopla' || liste.integration) && (
            <BoutonPrincipal disabled={envoi || (choix !== 'hopla' && (!id || (!cle && !memeFournisseur)))} onClick={brancher}>
              {envoi ? 'Vérification…' : choix === 'hopla' ? 'Débrancher' : memeFournisseur ? 'Mettre à jour' : `Brancher ${NOMS[choix]}`}
            </BoutonPrincipal>
          )}
          {message && <p role="status" className={`rounded-xl px-3.5 py-2.5 text-[13.5px] ${message.ok ? 'bg-emerald-400/10 text-emerald-200' : 'bg-red-500/15 text-red-200'}`}>{message.texte}</p>}
          {liste.integration && liste.enAttente > 0 && (
            <button type="button" disabled={envoi} onClick={renvoyer} className="self-start text-[13.5px] font-medium text-white underline underline-offset-2">
              Envoyer les {nombre(liste.enAttente)} inscrit{liste.enAttente > 1 ? 's' : ''} pas encore chez {NOMS[liste.integration.fournisseur]}
            </button>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-medium text-white/70">{nombre(liste.total)} inscrit{liste.total > 1 ? 's' : ''}</span>
            {api.urlContacts && liste.total > 0 && <a href={api.urlContacts} download className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/[0.08] px-3.5 text-[13.5px] font-medium text-white">Exporter en CSV</a>}
          </div>
          {contacts.length ? (
            <ul className="divide-y divide-white/[0.06] rounded-2xl bg-white/[0.035]">
              {contacts.map(c => (
                <li key={c.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] text-white">{c.prenom ? `${c.prenom} · ` : ''}{c.email}</span>
                    <span className="block text-[12px] text-white/55">{quand(c.ts)}{c.source && c.source !== 'Direct' ? ` · ${c.source}` : ''}{c.synchro === 'erreur' ? ' · pas envoyé' : ''}</span>
                  </span>
                  <button type="button" aria-label={`Retirer ${c.email}`} onClick={async () => { await api.supprimerContact(c.id); setContacts(l => l.filter(x => x.id !== c.id)); onChange(); }}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white/55 hover:bg-white/[0.06] hover:text-red-300"><Icone nom="ui-corbeille" taille={17} /></button>
                </li>
              ))}
            </ul>
          ) : <p className="text-[13.5px] text-white/55">Personne pour l’instant.</p>}
          {liste.total > contacts.length && contacts.length >= 50 && <p className="mt-2 text-[12.5px] text-white/55">Les 50 derniers ; l’export CSV contient tout le monde.</p>}
        </section>
      </div>
    </Feuille>
  );
}
