import { useEffect, useState } from 'react';
import type { ApiCles, CleApi } from '../lib/types.ts';
import { ORIGINE_ADMIN, ORIGINE_PUBLIQUE, sansSchema } from '../lib/types.ts';
import { focusAuto } from '../lib/clavier';
import { BoutonCopier, BoutonPrincipal, BoutonSecondaire, Champ, Feuille, Groupe, Interrupteur, Ligne, LigneLien, classeBouton, classeSaisie } from './ui.tsx';
import { Etiquette, Reserve, usePermis } from './offre.tsx';
import { choix, useLangue } from '../accueil/langue.ts';
import type { Langue } from '../lib/types.ts';

/*
 * API et MCP, sous-page de Réglages (28 octobre 2026, demandé par Lilian) : les adresses de l'API et du serveur
 * MCP, la documentation, puis les clés du compte. Une clé se crée avec un nom et ce qu'elle peut (lire, ou lire et
 * modifier), se montre une seule fois avec la commande pour Claude Code, et se révoque après une confirmation.
 * Réservé à Pro (`FONCTIONS.api`) : sans l'offre, les clés déjà créées se lisent et se révoquent, rien de plus.
 */

export const ADRESSE_MCP = `${ORIGINE_ADMIN}/mcp`;
export const ADRESSE_API = `${ORIGINE_ADMIN}/api/v2`;
/** La documentation (documentation/, servie sur hopla.page/docs). */
export const ADRESSE_DOCS = `${ORIGINE_PUBLIQUE}/docs`;

/** « 28 oct. », avec l'année quand ce n'est pas celle-ci. */
const jour = (ms: number, langue: Langue) => new Date(ms).toLocaleDateString(langue === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', ...(new Date(ms).getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' }) });

/** « Lit et modifie · utilisée le 30 oct. » : ce qu'elle peut, et quand elle a servi (sa création au survol). */
const resume = (c: CleApi, langue: Langue) => langue === 'fr'
  ? `${c.ecriture ? 'Lit et modifie' : 'Lit seulement'} · ${c.utilisee ? `utilisée le ${jour(c.utilisee, langue)}` : 'jamais utilisée'}`
  : `${c.ecriture ? 'Reads and edits' : 'Read only'} · ${c.utilisee ? `used ${jour(c.utilisee, langue)}` : 'never used'}`;

const commandeClaude = (cle: string) => `claude mcp add --transport http hopla ${ADRESSE_MCP} --header "Authorization: Bearer ${cle}"`;

export function ApiEtMcp({ api }: { api?: ApiCles }) {
  const permis = usePermis('api');
  const [cles, setCles] = useState<CleApi[] | null>(null);
  const [erreur, setErreur] = useState('');
  const [creation, setCreation] = useState(false);
  const [aRevoquer, setARevoquer] = useState<CleApi | null>(null);
  const langue = useLangue();
  const tr = choix(langue);

  function charger() {
    if (!api) { setCles([]); return; }
    api.lister().then(setCles, () => { setCles([]); setErreur(tr('Tes clés ne se chargent pas. Réessaie dans un instant.', 'Your keys won’t load. Try again in a moment.')); });
  }
  useEffect(charger, [api]);

  return (
    <>
      <p className="text-[14px] leading-snug text-white/75">{tr('Ta page pilotée par ton agent IA ou ton code, avec une clé.', 'Your page run by your AI agent or your code, with a key.')}</p>

      <Groupe titre={tr('Adresses', 'Addresses')}>
        <Ligne nom={tr('Serveur MCP', 'MCP server')} valeur={<span translate="no">{sansSchema(ADRESSE_MCP)}</span>}>
          <BoutonCopier texte={ADRESSE_MCP} label={tr('Copier l’adresse du serveur MCP', 'Copy the MCP server address')} />
        </Ligne>
        <Ligne nom="API REST" valeur={<span translate="no">{sansSchema(ADRESSE_API)}</span>}>
          <BoutonCopier texte={ADRESSE_API} label={tr('Copier l’adresse de l’API', 'Copy the API address')} />
        </Ligne>
        <LigneLien nom={tr('Documentation', 'Docs')} valeur={tr('Les outils, les adresses, des exemples', 'Tools, addresses, examples')} externe onClick={() => open(ADRESSE_DOCS, '_blank', 'noopener')} label={tr('Lire la documentation, dans un nouvel onglet', 'Read the docs, in a new tab')} />
      </Groupe>

      <Groupe titre={tr('Mes clés', 'My keys')} apres={permis ? undefined : <Etiquette fonction="api" />}>
        {cles === null
          ? <Ligne nom={<span className="text-white/60">{tr('Chargement…', 'Loading…')}</span>} />
          : cles.length === 0
            ? <Ligne nom={tr('Aucune clé pour l’instant', 'No keys yet')} valeur={permis ? tr('Crée-en une pour brancher ton agent IA.', 'Create one to connect your AI agent.') : undefined} />
            : cles.map(c => (
              <Ligne key={c.id} nom={c.nom} valeur={<span title={tr(`Créée le ${jour(c.cree, langue)}`, `Created ${jour(c.cree, langue)}`)}><span translate="no">{c.debut}…</span> · {resume(c, langue)}</span>}>
                <BoutonSecondaire onClick={() => setARevoquer(c)} aria-haspopup="dialog" aria-label={tr(`Révoquer la clé ${c.nom}`, `Revoke the key ${c.nom}`)} className="!text-red-300">{tr('Révoquer', 'Revoke')}</BoutonSecondaire>
              </Ligne>
            ))}
      </Groupe>
      {erreur && <p role="alert" className="-mt-3 text-[13.5px] text-red-300">{erreur}</p>}

      {permis
        ? <div><BoutonPrincipal onClick={() => setCreation(true)} aria-haspopup="dialog" disabled={!api}>{tr('Créer une clé', 'Create a key')}</BoutonPrincipal></div>
        : <Reserve phrase={tr('L’API et le serveur MCP viennent avec Hopla Pro.', 'The API and the MCP server come with Hopla Pro.')} fonction="api" />}

      <Feuille petite ouverte={creation} onFermer={() => { setCreation(false); charger(); }} titre={tr('Nouvelle clé', 'New key')}>
        {fermer => api && <CreerCle api={api} fermer={() => fermer()} />}
      </Feuille>

      <Feuille petite ouverte={!!aRevoquer} onFermer={() => setARevoquer(null)} titre={tr('Révoquer la clé', 'Revoke key')}>
        {fermer => aRevoquer && api && <Revoquer cle={aRevoquer} annuler={() => fermer()}
          revoquer={async () => { await api.revoquer(aRevoquer.id); setCles(l => l?.filter(c => c.id !== aRevoquer.id) ?? null); fermer(); }} />}
      </Feuille>
    </>
  );
}

/** Un nom, ce que la clé peut ; puis la clé, une seule fois, et de quoi la brancher. */
function CreerCle({ api, fermer }: { api: ApiCles; fermer: () => void }) {
  const [nom, setNom] = useState('');
  const [ecriture, setEcriture] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [cle, setCle] = useState('');
  const tr = choix(useLangue());

  async function creer() {
    setEnvoi(true);
    setErreur('');
    try { setCle((await api.creer(nom.trim(), ecriture)).cle); }
    catch (error) { setErreur((error as Error).message || tr('La clé ne s’est pas créée. Réessaie dans un instant.', 'The key wasn’t created. Try again in a moment.')); }
    setEnvoi(false);
  }

  if (cle) return (
    <div className="flex flex-col gap-4 pb-1">
      <p role="status" className="text-[14px] font-medium leading-snug text-white">{tr('Copie ta clé maintenant : elle ne s’affichera plus.', 'Copy your key now: it won’t be shown again.')}</p>
      <div className="flex items-center gap-2">
        <code translate="no" className="min-w-0 flex-1 [overflow-wrap:anywhere] rounded-xl border border-white/15 bg-nuit px-3.5 py-3 font-mono text-[13.5px] text-white">{cle}</code>
        <BoutonCopier texte={cle} label={tr('Copier la clé', 'Copy the key')} />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-[13.5px] leading-snug text-white/70">{tr('Pour Claude Code, colle cette commande dans ton terminal :', 'For Claude Code, paste this command in your terminal:')}</p>
        <div className="flex items-center gap-2">
          <code translate="no" className="min-w-0 flex-1 [overflow-wrap:anywhere] rounded-xl border border-white/15 bg-nuit px-3.5 py-3 font-mono text-[12.5px] leading-relaxed text-white/80">{commandeClaude(cle)}</code>
          <BoutonCopier texte={commandeClaude(cle)} label={tr('Copier la commande pour Claude Code', 'Copy the command for Claude Code')} />
        </div>
        <p className="text-[13.5px] leading-snug text-white/70">{tr('Pour les autres, la documentation dit où la mettre.', 'For other tools, the docs say where to put it.')}</p>
      </div>
      <div className="flex justify-end"><BoutonPrincipal onClick={fermer}>{tr('J’ai copié ma clé', 'I’ve copied my key')}</BoutonPrincipal></div>
    </div>
  );

  return (
    <form onSubmit={e => { e.preventDefault(); void creer(); }} className="flex flex-col gap-4 pb-1">
      <Champ label={tr('Nom', 'Name')} aide={tr('Pour la reconnaître : l’agent ou le script qui s’en sert.', 'To recognize it: the agent or script that uses it.')} erreur={erreur || undefined}>
        <input className={classeSaisie} value={nom} maxLength={60} placeholder={tr('Claude, mon script…', 'Claude, my script…')} onChange={e => { setNom(e.target.value); setErreur(''); }} autoFocus={focusAuto()} autoComplete="off" />
      </Champ>
      <Interrupteur label={tr('Peut modifier ma page', 'Can edit my page')} aide={ecriture ? tr('Elle lit et modifie ton profil, ton thème et tes blocs.', 'It reads and edits your profile, theme and blocks.') : tr('Elle lit ta page et tes stats, sans rien changer.', 'It reads your page and stats, without changing anything.')} actif={ecriture} onChange={setEcriture} />
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={fermer} className={classeBouton.discret}>{tr('Annuler', 'Cancel')}</button>
        <button type="submit" disabled={envoi} className={classeBouton.principal}>{envoi ? tr('Création…', 'Creating…') : tr('Créer la clé', 'Create the key')}</button>
      </div>
    </form>
  );
}

function Revoquer({ cle, annuler, revoquer }: { cle: CleApi; annuler: () => void; revoquer: () => Promise<void> }) {
  const tr = choix(useLangue());
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  return (
    <div className="flex flex-col gap-4 pb-1">
      <p className="text-[14px] leading-snug text-white/75">{tr(`Ce qui se sert de « ${cle.nom} » perd l’accès à ta page tout de suite. Rien ne se récupère : il faudra une nouvelle clé.`, `Anything using “${cle.nom}” loses access to your page right away. This can’t be undone: you’ll need a new key.`)}</p>
      {erreur && <p role="alert" className="text-[13.5px] text-red-300">{erreur}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={annuler} className={classeBouton.discret}>{tr('Annuler', 'Cancel')}</button>
        <button type="button" disabled={envoi} className={classeBouton.danger}
          onClick={async () => { setEnvoi(true); try { await revoquer(); } catch { setErreur(tr('La clé ne s’est pas révoquée. Réessaie dans un instant.', 'The key wasn’t revoked. Try again in a moment.')); setEnvoi(false); } }}>
          {envoi ? tr('Révocation…', 'Revoking…') : tr('Révoquer', 'Revoke')}
        </button>
      </div>
    </div>
  );
}
