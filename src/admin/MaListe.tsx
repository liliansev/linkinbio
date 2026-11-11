import { useCallback, useEffect, useRef, useState } from 'react';
import type { Api, Contact, Langue, Liste } from '../lib/types.ts';
import { destination } from '../lib/integrations.ts';
import { Icone } from '../components/Icone.tsx';
import { Carte, Feuille, classeBouton } from './ui.tsx';
import { Etiquette, Reserve, usePermis, useVoirOffres } from './offre.tsx';
import { choix, useLangue } from '../accueil/langue.ts';

/*
 * Les inscrits de « Rejoins ma liste », dans l'onglet Stats : combien, les
 * derniers, l'export CSV, et où ils partent. La newsletter se branche dans
 * l'onglet Intégrations (22 octobre 2026) : la carte y mène.
 */

const loc = (langue: Langue) => (langue === 'fr' ? 'fr-FR' : 'en-US');
const quand = (ts: number, langue: Langue) => {
  const h = (Date.now() - ts) / 3_600_000;
  if (h < 1) return langue === 'fr' ? 'à l’instant' : 'just now';
  if (h < 24) return langue === 'fr' ? `il y a ${Math.floor(h)} h` : `${Math.floor(h)}h ago`;
  return new Date(ts).toLocaleDateString(loc(langue), { day: 'numeric', month: 'short' });
};
const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

type ApiListe = Pick<Api, 'liste' | 'supprimerContact' | 'resynchroniser' | 'urlContacts'>;

/** `onIntegrations` : ouvre l'onglet Intégrations, où la newsletter se branche. */
export function MaListe({ api, onIntegrations }: { api: ApiListe; onIntegrations?: () => void }) {
  const [liste, setListe] = useState<Liste | null>(null);
  const [ouverte, setOuverte] = useState(false);
  const recharger = useCallback(() => api.liste().then(setListe).catch(() => {}), [api]);
  useEffect(() => { recharger(); }, [recharger]);
  const permis = usePermis('listeEmail');
  const voir = useVoirOffres();
  const langue = useLangue();
  const tr = choix(langue);
  const nombre = (n: number) => n.toLocaleString(loc(langue));
  if (!liste) return null;
  // Sans l'offre et sans inscrit, la carte dit ce que la liste ferait ; des inscrits déjà là restent à toi (export, ta newsletter).
  if (!permis && !liste.total) return (
    // Le même encart que « Tes stats », à côté : un seul bouton plein (celui des stats), ici un lien discret vers Pro.
    <Carte nu titre={tr('Ta liste', 'Your list')} etiquette={<Etiquette fonction="listeEmail" />} className="adm-encart p-5 bureau:px-6">
      <Reserve fonction="listeEmail" bouton={false} phrase={tr('Tes visiteurs laissent leur e-mail sur ta page.', 'Visitors leave their email on your page.')}>
        {voir && <button type="button" onClick={() => voir('listeEmail')} aria-haspopup="dialog" className="adm-lien -ml-1.5">{tr('Voir Hopla Pro', 'See Hopla Pro')}</button>}
      </Reserve>
    </Carte>
  );
  // Sans inscrit, rien à lire ni à gérer : la carte attend le premier (le bloc « Liste e-mail » se pose depuis Ma page).
  if (!liste.total) return null;
  return (
    <>
      <Carte titre={tr('Ta liste', 'Your list')} action={<button type="button" onClick={() => setOuverte(true)} className={classeBouton.secondaire}>{tr('Gérer', 'Manage')}</button>}>
        {liste.total ? (
          <>
            <div className="flex items-end gap-3">
              <p className="text-[24px] font-semibold leading-none tracking-[-0.02em] tabular-nums">{nombre(liste.total)}</p>
              <p className="pb-1 text-[13.5px] text-white/60">{tr('inscrit', 'subscriber')}{liste.total > 1 ? 's' : ''}{liste.semaine ? <>{tr(', dont ', ', ')}<span className="adm-gain">+{nombre(liste.semaine)}</span>{tr(' cette semaine', ' this week')}</> : ''}</p>
            </div>
            <p className="mt-2.5 flex items-center gap-1.5 text-[13px] text-white/55">
              <Icone nom={liste.integration ? 'ui-ok' : 'courrier'} taille={14} />
              {liste.integration ? tr(`Envoyés aussi ${destination(liste.integration)}.`, `Also sent ${destination(liste.integration, 'en')}.`) : tr('Gardés chez Hopla.', 'Kept at Hopla.')}
            </p>
          </>
        ) : null}
        {!permis && liste.total > 0 && <p className="mt-2.5 text-[13px] leading-snug text-white/55">{tr('Formulaire retiré de ta page sans Hopla Pro.', 'Form removed from your page without Hopla Pro.')}</p>}
      </Carte>
      {ouverte && <FeuilleListe liste={liste} api={api} onFermer={() => setOuverte(false)} onChange={recharger} onIntegrations={onIntegrations} />}
    </>
  );
}

function FeuilleListe({ liste, api, onFermer, onChange, onIntegrations }: { liste: Liste; api: ApiListe; onFermer: () => void; onChange: () => void; onIntegrations?: () => void }) {
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>(liste.derniers);
  // Un inscrit retiré attend cinq secondes avant de partir pour de bon : le temps d'annuler.
  const [retire, setRetire] = useState<Contact | null>(null);
  const attente = useRef<{ id: string; t: ReturnType<typeof setTimeout> } | null>(null);
  const confirmer = useCallback(() => {
    const a = attente.current; if (!a) return;
    clearTimeout(a.t); attente.current = null; setRetire(null);
    void api.supprimerContact(a.id).then(onChange);
  }, [api, onChange]);
  useEffect(() => confirmer, [confirmer]);
  function retirer(c: Contact) {
    confirmer();
    setContacts(l => l.filter(x => x.id !== c.id)); setRetire(c);
    attente.current = { id: c.id, t: setTimeout(confirmer, 5000) };
  }
  function annulerRetrait() {
    const a = attente.current; if (!a || !retire) return;
    clearTimeout(a.t); attente.current = null;
    const c = retire; setRetire(null);
    setContacts(l => [...l, c].sort((x, y) => y.ts - x.ts));
  }
  const branche = liste.integration;
  const langue = useLangue();
  const tr = choix(langue);
  const nombre = (n: number) => n.toLocaleString(loc(langue));

  async function renvoyer() {
    setEnvoi(true);
    try {
      const r = await api.resynchroniser();
      setMessage({ ok: !r.erreurs, texte: r.erreurs ? tr(`${nombre(r.envoyes)} envoyés, ${nombre(r.erreurs)} refusés : vérifie ton branchement dans Intégrations.`, `${nombre(r.envoyes)} sent, ${nombre(r.erreurs)} refused: check your connection in Integrations.`) : tr(`${nombre(r.envoyes)} inscrit${r.envoyes > 1 ? 's' : ''} envoyé${r.envoyes > 1 ? 's' : ''}.`, `${nombre(r.envoyes)} subscriber${r.envoyes > 1 ? 's' : ''} sent.`) });
      onChange();
    } catch { setMessage({ ok: false, texte: tr('Le serveur ne répond pas.', 'The server is not responding.') }); }
    setEnvoi(false);
  }

  return (
    <Feuille ouverte onFermer={onFermer} titre={tr('Ta liste', 'Your list')}>
      <div className="flex flex-col gap-5 pt-1">
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="min-w-0 flex-1 basis-52">
              <span className="block text-[13px] font-medium text-white/70">{tr('Où vont les inscrits', 'Where subscribers go')}</span>
              <span className="mt-0.5 block text-[14.5px] text-white">{branche ? majuscule(destination(branche, langue)) : tr('Ici seulement', 'Here only')}</span>
            </p>
            {onIntegrations && (
              <button type="button" onClick={() => { onFermer(); onIntegrations(); }} className={classeBouton.secondaire}>{branche ? tr('Changer', 'Change') : tr('Brancher ma newsletter', 'Connect my newsletter')}</button>
            )}
          </div>
          {message && <p role="status" className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[13.5px] ${message.ok ? 'bg-white/[0.05] text-white' : 'bg-red-500/15 text-red-200'}`}>{message.ok && <span className="mt-px shrink-0" aria-hidden="true"><Icone nom="ui-ok" taille={16} /></span>}{message.texte}</p>}
          {branche && liste.enAttente > 0 && (
            <button type="button" disabled={envoi} onClick={renvoyer} className="self-start text-[13.5px] font-medium text-white underline underline-offset-2">
              {liste.enAttente > 1 ? tr(`Envoyer les ${nombre(liste.enAttente)} inscrits pas encore partis`, `Send the ${nombre(liste.enAttente)} subscribers not sent yet`) : tr('Envoyer l’inscrit pas encore parti', 'Send the subscriber not sent yet')} {destination({ fournisseur: branche.fournisseur, nom: '' }, langue)}
            </button>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-medium text-white/70">{nombre(liste.total)} {tr('inscrit', 'subscriber')}{liste.total > 1 ? 's' : ''}</span>
            {api.urlContacts && liste.total > 0 && <a href={api.urlContacts} download className={classeBouton.secondaire}><Icone nom="telecharger" taille={16} />{tr('Exporter en CSV', 'Export as CSV')}</a>}
          </div>
          {retire && (
            <p role="status" className="mb-2 flex min-h-11 items-center gap-3 rounded-xl bg-white/[0.05] pl-3.5 text-[13.5px] text-white">
              <span className="min-w-0 flex-1 truncate">{retire.email} {tr('retiré de ta liste', 'removed from your list')}</span>
              <button type="button" onClick={annulerRetrait} className="min-h-11 shrink-0 rounded-xl px-3.5 font-medium underline underline-offset-2">{tr('Annuler', 'Undo')}</button>
            </p>
          )}
          {contacts.length ? (
            <ul className="adm-groupe divide-y divide-white/[0.06]">
              {contacts.map(c => (
                <li key={c.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] text-white">{c.prenom ? `${c.prenom} · ` : ''}{c.email}</span>
                    <span className="block text-[12px] text-white/55">{quand(c.ts, langue)}{c.source && c.source !== 'Direct' ? ` · ${c.source}` : ''}{c.synchro === 'erreur' ? tr(' · pas envoyé', ' · not sent') : ''}</span>
                  </span>
                  <button type="button" aria-label={tr(`Retirer ${c.email}`, `Remove ${c.email}`)} onClick={() => retirer(c)}
                    className={`${classeBouton.icone} hover:!text-red-300`}><Icone nom="ui-corbeille" taille={17} /></button>
                </li>
              ))}
            </ul>
          ) : <p className="text-[13.5px] text-white/55">{tr('Personne pour l’instant.', 'No one yet.')}</p>}
          {liste.total > contacts.length && contacts.length >= 50 && <p className="mt-2 text-[12.5px] text-white/55">{tr('Les 50 derniers ; l’export CSV contient tout le monde.', 'The latest 50; the CSV export has everyone.')}</p>}
        </section>
      </div>
    </Feuille>
  );
}
