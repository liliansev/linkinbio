import { useEffect, useState } from 'react';
import type { ApiCles, CleApi } from '../lib/types.ts';
import { ORIGINE_ADMIN, ORIGINE_PUBLIQUE, sansSchema } from '../lib/types.ts';
import { focusAuto } from '../lib/clavier';
import { BoutonCopier, BoutonPrincipal, BoutonSecondaire, Champ, Feuille, Groupe, Interrupteur, Ligne, LigneLien, classeBouton, classeSaisie } from './ui.tsx';
import { Etiquette, Reserve, usePermis } from './offre.tsx';

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
const jour = (ms: number) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(new Date(ms).getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' }) });

/** « Lit et modifie · utilisée le 30 oct. » : ce qu'elle peut, et quand elle a servi (sa création au survol). */
const resume = (c: CleApi) => `${c.ecriture ? 'Lit et modifie' : 'Lit seulement'} · ${c.utilisee ? `utilisée le ${jour(c.utilisee)}` : 'jamais utilisée'}`;

const commandeClaude = (cle: string) => `claude mcp add --transport http hopla ${ADRESSE_MCP} --header "Authorization: Bearer ${cle}"`;

export function ApiEtMcp({ api }: { api?: ApiCles }) {
  const permis = usePermis('api');
  const [cles, setCles] = useState<CleApi[] | null>(null);
  const [erreur, setErreur] = useState('');
  const [creation, setCreation] = useState(false);
  const [aRevoquer, setARevoquer] = useState<CleApi | null>(null);

  function charger() {
    if (!api) { setCles([]); return; }
    api.lister().then(setCles, () => { setCles([]); setErreur('Tes clés ne se chargent pas. Réessaie dans un instant.'); });
  }
  useEffect(charger, [api]);

  return (
    <>
      <p className="text-[14px] leading-snug text-white/75">Ton agent IA (Claude, ChatGPT, Cursor…) ou ton code gèrent ta page avec une clé : profil, thème, blocs, stats.</p>

      <Groupe titre="Adresses">
        <Ligne nom="Serveur MCP" valeur={<span translate="no">{sansSchema(ADRESSE_MCP)}</span>}>
          <BoutonCopier texte={ADRESSE_MCP} label="Copier l’adresse du serveur MCP" />
        </Ligne>
        <Ligne nom="API REST" valeur={<span translate="no">{sansSchema(ADRESSE_API)}</span>}>
          <BoutonCopier texte={ADRESSE_API} label="Copier l’adresse de l’API" />
        </Ligne>
        <LigneLien nom="Documentation" valeur="Les outils, les adresses, des exemples" externe onClick={() => open(ADRESSE_DOCS, '_blank', 'noopener')} label="Lire la documentation, dans un nouvel onglet" />
      </Groupe>

      <Groupe titre="Mes clés" apres={permis ? undefined : <Etiquette fonction="api" />}>
        {cles === null
          ? <Ligne nom={<span className="text-white/60">Chargement…</span>} />
          : cles.length === 0
            ? <Ligne nom="Aucune clé pour l’instant" valeur={permis ? 'Crée-en une pour brancher ton agent IA.' : undefined} />
            : cles.map(c => (
              <Ligne key={c.id} nom={c.nom} valeur={<span title={`Créée le ${jour(c.cree)}`}><span translate="no">{c.debut}…</span> · {resume(c)}</span>}>
                <BoutonSecondaire onClick={() => setARevoquer(c)} aria-haspopup="dialog" aria-label={`Révoquer la clé ${c.nom}`} className="!text-red-300">Révoquer</BoutonSecondaire>
              </Ligne>
            ))}
      </Groupe>
      {erreur && <p role="alert" className="-mt-3 text-[13.5px] text-red-300">{erreur}</p>}

      {permis
        ? <div><BoutonPrincipal onClick={() => setCreation(true)} aria-haspopup="dialog" disabled={!api}>Créer une clé</BoutonPrincipal></div>
        : <Reserve phrase="L’API et le serveur MCP viennent avec Hopla Pro." fonction="api" />}

      <Feuille petite ouverte={creation} onFermer={() => { setCreation(false); charger(); }} titre="Nouvelle clé">
        {fermer => api && <CreerCle api={api} fermer={() => fermer()} />}
      </Feuille>

      <Feuille petite ouverte={!!aRevoquer} onFermer={() => setARevoquer(null)} titre="Révoquer la clé">
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

  async function creer() {
    setEnvoi(true);
    setErreur('');
    try { setCle((await api.creer(nom.trim(), ecriture)).cle); }
    catch (error) { setErreur((error as Error).message || 'La clé ne s’est pas créée. Réessaie dans un instant.'); }
    setEnvoi(false);
  }

  if (cle) return (
    <div className="flex flex-col gap-4 pb-1">
      <p role="status" className="text-[14px] font-medium leading-snug text-white">Copie ta clé maintenant : elle ne s’affichera plus.</p>
      <div className="flex items-center gap-2">
        <code translate="no" className="min-w-0 flex-1 [overflow-wrap:anywhere] rounded-xl border border-white/15 bg-nuit px-3.5 py-3 font-mono text-[13.5px] text-white">{cle}</code>
        <BoutonCopier texte={cle} label="Copier la clé" />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-[13.5px] leading-snug text-white/70">Pour Claude Code, colle cette commande dans ton terminal :</p>
        <div className="flex items-center gap-2">
          <code translate="no" className="min-w-0 flex-1 [overflow-wrap:anywhere] rounded-xl border border-white/15 bg-nuit px-3.5 py-3 font-mono text-[12.5px] leading-relaxed text-white/80">{commandeClaude(cle)}</code>
          <BoutonCopier texte={commandeClaude(cle)} label="Copier la commande pour Claude Code" />
        </div>
        <p className="text-[13.5px] leading-snug text-white/70">Pour les autres, la documentation dit où la mettre.</p>
      </div>
      <div className="flex justify-end"><BoutonPrincipal onClick={fermer}>J’ai copié ma clé</BoutonPrincipal></div>
    </div>
  );

  return (
    <form onSubmit={e => { e.preventDefault(); void creer(); }} className="flex flex-col gap-4 pb-1">
      <Champ label="Nom" aide="Pour la reconnaître : l’agent ou le script qui s’en sert." erreur={erreur || undefined}>
        <input className={classeSaisie} value={nom} maxLength={60} placeholder="Claude, mon script…" onChange={e => { setNom(e.target.value); setErreur(''); }} autoFocus={focusAuto()} autoComplete="off" />
      </Champ>
      <Interrupteur label="Peut modifier ma page" aide={ecriture ? 'Elle lit et modifie ton profil, ton thème et tes blocs.' : 'Elle lit ta page et tes stats, sans rien changer.'} actif={ecriture} onChange={setEcriture} />
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={fermer} className={classeBouton.discret}>Annuler</button>
        <button type="submit" disabled={envoi} className={classeBouton.principal}>{envoi ? 'Création…' : 'Créer la clé'}</button>
      </div>
    </form>
  );
}

function Revoquer({ cle, annuler, revoquer }: { cle: CleApi; annuler: () => void; revoquer: () => Promise<void> }) {
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  return (
    <div className="flex flex-col gap-4 pb-1">
      <p className="text-[14px] leading-snug text-white/75">Ce qui se sert de « {cle.nom} » perd l’accès à ta page tout de suite. Rien ne se récupère : il faudra une nouvelle clé.</p>
      {erreur && <p role="alert" className="text-[13.5px] text-red-300">{erreur}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={annuler} className={classeBouton.discret}>Annuler</button>
        <button type="button" disabled={envoi} className={classeBouton.danger}
          onClick={async () => { setEnvoi(true); try { await revoquer(); } catch { setErreur('La clé ne s’est pas révoquée. Réessaie dans un instant.'); setEnvoi(false); } }}>
          {envoi ? 'Révocation…' : 'Révoquer'}
        </button>
      </div>
    </div>
  );
}
