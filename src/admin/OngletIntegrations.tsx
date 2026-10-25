import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Api, Bloc, FournisseurListe, IntegrationListe, Liste, ListeFournisseur, Newsletter, TypeBloc, Webhook } from '../lib/types.ts';
import { NEWSLETTERS, WEBHOOKS, estWebhook } from '../lib/types.ts';
import { FONCTIONS } from '../lib/abonnement.ts';
import type { Fonction } from '../lib/abonnement.ts';
import type { SuiteAchat } from '../lib/achat.ts';
import { ADRESSE_WEBHOOK, CHAMPS_WEBHOOK, COULEURS_LOGOS, LISTE_CHEZ, LOGOS_OUTILS, NOMS_FOURNISSEURS, OUTILS_DES_BLOCS, OUVRAGE_WEBHOOK, adresseWebhook, destination } from '../lib/integrations.ts';
import { Icone } from '../components/Icone.tsx';
import { BoutonPrincipal, BoutonSecondaire, Champ, Groupe, Ligne, LigneLien, ListeChoix, PanneauDetail, Feuille, SousPage, classeBouton, classeSaisie, copierTexte, useGrandEcran, vibrer } from './ui.tsx';
import { Etiquette, Reserve, offreDe, useDroits } from './offre.tsx';
import { TYPES } from '../lib/catalogue.ts';

/*
 * Intégrations (22 octobre 2026, demandé par Lilian) : là où l'on branche ses
 * outils. D'abord sa newsletter, où partent les inscrits de la liste
 * e-mail : six se branchent par une clé, puis la liste choisie par son
 * nom, sans chercher d'identifiant ; Substack, qui n'a pas d'API, par la
 * copie des adresses. Puis Make, Zapier et n8n, par un webhook. Enfin, ce qui
 * vit sur la page (avis, rendez-vous, soutien, produit) : un toucher l'ajoute
 * à Ma page, ou l'y ouvre. Une ligne par outil, son logo seul, dans sa
 * couleur ; le détail s'ouvre en sous-page, avec le fil « Intégrations /
 * Brevo » dans l'en-tête, comme Réglages. Au bureau (24 octobre 2026), il
 * s'ouvre à droite, dans `PanneauDetail`, et la liste reste à sa gauche.
 */

type Outil = FournisseurListe | 'substack';
type ApiIntegrations = Pick<Api, 'liste' | 'listesFournisseur' | 'brancherListe' | 'resynchroniser' | 'adresses' | 'urlContacts'>;
type Message = { ok: boolean; texte: string } | null;

const nomOutil = (o: Outil) => (o === 'substack' ? 'Substack' : NOMS_FOURNISSEURS[o]);
const nombre = (n: number) => n.toLocaleString('fr-FR');
const pluriel = (n: number, mot: string) => `${nombre(n)} ${mot}${n > 1 ? 's' : ''}`;
const HORS_LIGNE = 'Le serveur ne répond pas. Réessaie dans un instant.';

/**
 * Un logo seul, sans rien autour, dans la couleur de sa marque. Un picto Phosphor garde une marge dans sa boîte, le mot
 * de Kit et le graphe de n8n sont bas : un peu plus grands, ils pèsent autant qu'un logo.
 */
const EN_PLUS: Record<string, number> = { courrier: 2, kit: 4, n8n: 4 };
function Logo({ nom, taille = 18, className = '' }: { nom: string; taille?: number; className?: string }) {
  return (
    <span className={`flex shrink-0 justify-center text-white ${className}`} style={{ color: COULEURS_LOGOS[nom] }}>
      <Icone nom={nom} taille={taille + (EN_PLUS[nom] ?? 0)} />
    </span>
  );
}

/**
 * Où créer sa clé, chez chaque newsletter (25 octobre 2026, demandé par Lilian : « emmener l'utilisateur directement sur
 * le lien ») : la page de ses clés, qui s'ouvre à côté, et ce qu'on y touche, en une phrase.
 */
const CREER_LA_CLE: Record<Newsletter, { url: string; geste: string }> = {
  brevo: { url: 'https://app.brevo.com/settings/keys/api', geste: 'Choisis « Générer une nouvelle clé API », donne-lui un nom, puis copie-la.' },
  mailchimp: { url: 'https://admin.mailchimp.com/account/api/', geste: 'Choisis « Create A Key », puis copie-la en entier : elle finit par son centre, comme -us21.' },
  mailcheap: { url: 'https://mailcheap.ai/api-keys', geste: 'Crée une clé « Signups only » : elle sert seulement à inscrire, et ne lit rien d’autre. Copie-la.' },
  kit: { url: 'https://app.kit.com/account_settings/developer_settings', geste: 'Sous « API v4 », ajoute une clé, puis copie-la.' },
  mailerlite: { url: 'https://dashboard.mailerlite.com/integrations/api', geste: 'Choisis « Générer un nouveau jeton », donne-lui un nom, puis copie-le.' },
  beehiiv: { url: 'https://app.beehiiv.com/settings/workspace/api', geste: 'Choisis « Create New API Key », puis copie-la.' },
  loops: { url: 'https://app.loops.so/settings?page=api', geste: 'Choisis « Generate key », puis copie-la.' },
  systeme: { url: 'https://systeme.io/dashboard/profile/public-api-keys', geste: 'Crée une clé publique, puis copie-la.' },
};
const EXEMPLE_CLE: Partial<Record<Newsletter, string>> = { brevo: 'xkeysib-…', mailchimp: '…-us21', mailcheap: 'mc_…', systeme: 'Ta clé Systeme.io' };

/** Ce qui se dit quand aucune liste n'est choisie : chez Loops toute l'audience, chez MailCheap sa newsletter, ailleurs aucun tag. */
const SANS_LISTE: Partial<Record<Newsletter, string>> = { loops: 'Toute ton audience', mailcheap: 'Ta newsletter' };

/** Un geste d'appoint dans une phrase ou une tête (Changer, Brancher) : un mot souligné, toujours de la même forme. */
function LienGeste({ children, onClick, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" onClick={e => { vibrer(4); onClick?.(e); }} {...props}
      className="-my-1 min-h-11 shrink-0 rounded-lg px-2 text-[13.5px] font-semibold underline decoration-white/30 underline-offset-4 hover:decoration-white disabled:opacity-40 bureau:min-h-8">{children}</button>
  );
}

/** Où trouver l'adresse de son webhook. */
const OU_EST_LE_WEBHOOK: Record<Webhook, string> = {
  make: 'Dans Make : un scénario qui commence par Webhooks, Custom webhook. Copie son adresse.',
  zapier: 'Dans Zapier : un Zap qui commence par Webhooks by Zapier, Catch Hook. Copie son adresse.',
  n8n: 'Dans n8n : un workflow qui commence par un nœud Webhook en POST, activé. Copie son adresse de production.',
};

export function OngletIntegrations({ api, blocs, sousOuverte, sousLue, raccourci, raccourciVu, onAjouter, onOuvrir, onOffres, onListe }: {
  api: ApiIntegrations;
  blocs: Bloc[];
  /** La sous-page où revenir, quand on referme un bloc ouvert d'ici. */
  sousOuverte?: string | null;
  sousLue?: () => void;
  /** La ligne de « Sur ta page » qui reprend le focus : celle d'où l'on était parti ouvrir un bloc, ou la vitrine après son achat. */
  raccourci?: TypeBloc | null;
  raccourciVu?: () => void;
  /** Ajoute un bloc de ce type à Ma page (l'onglet change) ; `outil` : la sous-page d'où l'on part, où l'on revient. */
  onAjouter: (type: TypeBloc, outil: string | null) => void;
  onOuvrir: (bloc: Bloc) => void;
  /** Ouvre les offres par-dessus ; absent quand le compte ne peut pas s'abonner (compte principal, aperçu). `suite` : le bloc à poser après l'achat. */
  onOffres?: (pour?: Fonction, suite?: SuiteAchat) => void;
  /** La liste a changé (branchée, débranchée) : le reste du back office le sait. */
  onListe?: (l: Liste) => void;
}) {
  const [liste, setListe] = useState<Liste | null>(null);
  // Une seule sous-page, « Où vont tes inscrits » : le choix de l'outil, puis son branchement (25 octobre 2026).
  const [sous, setSous] = useState(() => !!sousOuverte);
  useEffect(() => { if (sousOuverte) sousLue?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const recharger = useCallback(() => api.liste().then(l => { setListe(l); onListe?.(l); }).catch(() => {}), [api]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void recharger(); }, [recharger]);
  const droits = useDroits();
  const grand = useGrandEcran();
  // Ce qui a ouvert la sous-page reprend le focus quand on en revient.
  const ouvreur = useRef(false);
  const ouvrir = () => { ouvreur.current = true; setSous(true); if (!grand) scrollTo({ top: 0 }); };
  useEffect(() => {
    if (sous || !ouvreur.current) return;
    document.getElementById('integration-liste')?.focus({ preventScroll: true });
    ouvreur.current = false;
  }, [sous]);
  useEffect(() => {
    if (!raccourci || sous) return;
    const ligne = document.getElementById(`raccourci-${raccourci}`);
    ligne?.focus({ preventScroll: true });
    ligne?.scrollIntoView({ block: 'center' });
    raccourciVu?.();
  }, [raccourci, sous]); // eslint-disable-line react-hooks/exhaustive-deps

  const branche = liste?.integration ?? null;
  const formulaire = {
    present: blocs.some(b => b.type === 'inscription'),
    ajouter: () => onAjouter('inscription', 'liste'),
  };

  const detail = sous && <ParcoursListe api={api} liste={liste} recharger={recharger} formulaire={formulaire} />;
  if (sous && !grand) return (
    <div className="adm-reglages">
      <SousPage nom="Où vont tes inscrits" retour={() => setSous(false)} />
      {detail}
    </div>
  );

  const raccourcis = OUTILS_DES_BLOCS.map(r => {
    const t = TYPES.find(x => x.type === r.type && !x.modele)!;
    const presents = blocs.filter(b => b.type === r.type);
    // Un bloc déjà là s'ouvre toujours ; un nouveau demande l'offre qui le comprend.
    return { r, t, presents, libre: !t.fonction || droits[t.fonction] || presents.length > 0 };
  });
  // Aucun raccourci libre, et une seule offre pour tous : son étiquette suit le titre (24 octobre 2026).
  const offreRaccourcis = raccourcis.every(x => !x.libre) && new Set(raccourcis.map(x => FONCTIONS[x.t.fonction!])).size === 1 ? raccourcis[0].t.fonction! : null;
  // Brancher demande l'offre de la liste ; une liste déjà branchée s'ouvre toujours, pour la débrancher.
  const libre = droits.listeEmail || !!branche;

  return (
    <div className="adm-reglages">
      {/* Les huit newsletters et les trois automatisations tiennent dans une seule ligne, qui ouvre leur choix (25 octobre 2026,
          demandé par Lilian : « la liste peut être longue »). Branchée, elle dit où partent les inscrits, avec le logo de l'outil. */}
      <Groupe titre="Ta liste e-mail" apres={libre ? undefined : <Etiquette fonction="listeEmail" />}>
        <LigneLien id="integration-liste" courant={sous}
          avant={branche ? <Logo nom={LOGOS_OUTILS[branche.fournisseur]} className="w-5" /> : <span className="flex w-5 shrink-0 justify-center"><Icone nom="bloc-inscription" taille={20} /></span>}
          nom="Où vont tes inscrits"
          valeur={branche ? <><strong>{NOMS_FOURNISSEURS[branche.fournisseur]}</strong>{branche.nom && !estWebhook(branche.fournisseur) ? ` · ${branche.nom}` : ''}</> : liste ? 'Gardés chez Hopla' : undefined}
          apres={branche || !libre ? undefined : <span className="flex shrink-0 items-center gap-2.5">{(['brevo', 'mailchimp', 'mailcheap'] as const).map((l, i) => <Logo key={l} nom={LOGOS_OUTILS[l]} taille={16} className={i === 2 ? 'max-[379px]:hidden' : ''} />)}</span>}
          onClick={libre ? ouvrir : onOffres ? () => onOffres('listeEmail') : undefined}
          label={libre ? undefined : `Ta liste e-mail, avec Hopla ${offreDe('listeEmail')} : voir les offres`} />
      </Groupe>
      <Groupe titre="Sur ta page" apres={offreRaccourcis ? <Etiquette fonction={offreRaccourcis} /> : undefined}>
        {raccourcis.map(({ r, t, presents, libre }) => (
          <LigneLien key={r.type} id={`raccourci-${r.type}`}
            avant={<span className="flex w-5 shrink-0 justify-center"><Icone nom={t.picto} taille={20} /></span>} nom={t.nom}
            // « Ajouté », pas « Sur ta page » : c'est déjà le titre du groupe.
            valeur={presents.length ? (presents.length > 1 ? `${presents.length} ajoutés` : 'Ajouté') : undefined}
            apres={libre || offreRaccourcis
              ? <span className="flex shrink-0 items-center gap-2.5">{r.logos.map((l, i) => <Logo key={l} nom={l} taille={16} className={i === 2 ? 'max-[379px]:hidden' : ''} />)}</span>
              : <Etiquette fonction={t.fonction!} />}
            // Pris, le bloc se pose au retour de l'achat : « Ajouter un produit ».
            onClick={libre ? () => (presents.length ? onOuvrir(presents[0]) : onAjouter(r.type, null)) : onOffres ? () => onOffres(t.fonction, r.type === 'preuve' ? undefined : { type: r.type }) : undefined}
            label={libre ? undefined : `${t.nom}, avec Hopla ${offreDe(t.fonction!)} : voir les offres`} />
        ))}
      </Groupe>
      {sous && (
        <PanneauDetail titre="Où vont tes inscrits" fermer={() => setSous(false)}>
          <div className="adm-reglages">{detail}</div>
        </PanneauDetail>
      )}
    </div>
  );
}

type Choix = Outil | 'aucun';
const NOM_CHOIX = (c: Choix) => (c === 'aucun' ? 'Pas encore de newsletter' : nomOutil(c));
/** Ce qu'on cherche aussi, pour chaque outil : son ancien nom, son type. */
const AUSSI: Partial<Record<Outil, string>> = { kit: 'convertkit', systeme: 'systeme io', make: 'integromat webhook automatisation', zapier: 'webhook automatisation', n8n: 'webhook automatisation' };
const sansAccents = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Où vont les inscrits, d'un bout à l'autre (25 octobre 2026, demandé par Lilian : « le plus simple et compréhensible
 * possible ») : l'outil choisi dans une liste qui se cherche, puis, pour une newsletter, sa page de clés qui s'ouvre à
 * côté, la clé collée, la liste choisie (prise d'office quand il n'y en a qu'une), et c'est branché. Sans outil, les
 * inscrits restent chez Hopla. Le même parcours sert dans Intégrations et dans la feuille qui s'ouvre quand on pose le bloc.
 */
export function ParcoursListe({ api, liste, recharger, formulaire, onBranche, onFin }: {
  api: ApiIntegrations; liste: Liste | null; recharger: () => Promise<unknown>; formulaire: Formulaire;
  /** Branché : la feuille passe à son bravo. */
  onBranche?: () => void;
  /** « Compris », sans outil : la feuille se referme. */
  onFin?: () => void;
}) {
  const branche = liste?.integration ?? null;
  const [choix, setChoix] = useState<Choix | null>(branche?.fournisseur ?? null);
  // Débranchée, ou un autre outil branché depuis ailleurs : on revient à ce qui est vrai.
  useEffect(() => { if (branche) setChoix(branche.fournisseur); }, [branche?.fournisseur]); // eslint-disable-line react-hooks/exhaustive-deps
  const [recherche, setRecherche] = useState('');
  const droits = useDroits();
  const changer = async () => { await recharger(); };
  const apres = async () => { await recharger(); onBranche?.(); };

  if (!choix) {
    const mots = sansAccents(recherche.trim());
    const garde = (o: Outil) => !mots || sansAccents(`${nomOutil(o)} ${AUSSI[o] ?? ''}`).includes(mots);
    const newsletters = [...NEWSLETTERS, 'substack' as const].filter(garde);
    const automatisations = WEBHOOKS.filter(garde);
    const ligne = (o: Outil) => (
      <LigneLien key={o} id={`outil-${o}`} avant={<Logo nom={LOGOS_OUTILS[o]} className="w-5" />} nom={nomOutil(o)}
        onClick={() => { vibrer(4); setChoix(o); }} />
    );
    return (
      <>
        {/* Sans l'offre, rien à choisir : on ne crée pas sa clé chez l'outil pour se la voir refuser au branchement. */}
        {!droits.listeEmail && <Reserve fonction="listeEmail" phrase={`Brancher ta newsletter demande Hopla ${offreDe('listeEmail')}. D’ici là, tes inscrits restent chez Hopla.`} />}
        {/* Jamais de focus d'office : au téléphone, le clavier ne monte pas tout seul. */}
        {droits.listeEmail && <input type="search" className={classeSaisie} value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Chercher ton outil"
          aria-label="Chercher ton outil" autoComplete="off" spellCheck={false} enterKeyHint="search" />}
        {droits.listeEmail && newsletters.length > 0 && <Groupe titre="Newsletter">{newsletters.map(ligne)}</Groupe>}
        {droits.listeEmail && automatisations.length > 0 && <Groupe titre="Automatisations">{automatisations.map(ligne)}</Groupe>}
        {droits.listeEmail && !newsletters.length && !automatisations.length && <p className="text-[13.5px] text-white/60">Hopla ne connaît pas encore cet outil. S’il reçoit un webhook, passe par Make, Zapier ou n8n.</p>}
        <Groupe titre="Sans outil">
          <LigneLien id="outil-aucun" avant={<span className="flex w-5 shrink-0 justify-center"><Icone nom="bloc-inscription" taille={20} /></span>}
            nom="Je n’ai pas encore de newsletter" onClick={() => setChoix('aucun')} />
        </Groupe>
      </>
    );
  }

  // L'outil choisi, en tête : son logo, son nom, puis « Branché » une fois branché, ou le mot pour revenir à la liste.
  const estBranche = branche?.fournisseur === choix;
  const tete = (
    <div className="flex items-center gap-3">
      {choix === 'aucun' ? <span className="flex w-5 shrink-0 justify-center"><Icone nom="bloc-inscription" taille={20} /></span> : <Logo nom={LOGOS_OUTILS[choix]} className="w-5" />}
      <span className="min-w-0 flex-1 text-[15px] font-semibold">{NOM_CHOIX(choix)}</span>
      {estBranche
        ? <span className="flex shrink-0 items-center gap-1.5 text-[13.5px] font-medium text-white/70"><Icone nom="ui-ok" taille={16} />Branché</span>
        : <LienGeste onClick={() => setChoix(null)}>{choix === 'aucun' ? 'Choisir un outil' : 'Changer'}</LienGeste>}
    </div>
  );
  return (
    <>
      {tete}
      {choix === 'aucun' ? <PageSansOutil liste={liste} api={api} onFin={onFin} />
        : choix === 'substack' ? <PageSubstack liste={liste} api={api} />
        : estWebhook(choix) ? <PageWebhook key={choix} outil={choix} liste={liste} api={api} onChange={changer} onBranche={apres} formulaire={formulaire} />
        : <PageNewsletter key={choix} outil={choix} liste={liste} api={api} onChange={changer} onBranche={apres} formulaire={formulaire} />}
    </>
  );
}

/** Sans newsletter : les inscrits restent chez Hopla, et partiront tous le jour où un outil se branche. */
function PageSansOutil({ liste, api, onFin }: { liste: Liste | null; api: ApiIntegrations; onFin?: () => void }) {
  const total = liste?.total ?? 0;
  return (
    <>
      <p className="text-[14.5px] leading-relaxed text-white/80">Tes inscrits restent chez Hopla, chiffrés, dans Stats.</p>
      <div className="flex flex-col gap-2 bureau:flex-row bureau:flex-wrap">
        {onFin && <BoutonPrincipal onClick={onFin}>Compris</BoutonPrincipal>}
        {api.urlContacts && total > 0 && <a href={api.urlContacts} download className={classeBouton.secondaire}><Icone nom="telecharger" taille={16} />Télécharger mes {pluriel(total, 'inscrit')}</a>}
      </div>
    </>
  );
}

/** Le résultat du dernier geste, sous la sous-page. */
function Resultat({ message }: { message: Message }) {
  if (!message) return null;
  return (
    <p role="status" className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[13.5px] ${message.ok ? 'bg-white/[0.05] text-white' : 'bg-red-500/15 text-red-200'}`}>
      {message.ok && <span className="mt-px shrink-0" aria-hidden="true"><Icone nom="ui-ok" taille={16} /></span>}{message.texte}
    </p>
  );
}

interface Formulaire { present: boolean; ajouter: () => void }

/**
 * Ce qu'une liste branchée laisse faire, quel que soit l'outil : renvoyer les inscrits pas encore partis, ajouter
 * le formulaire à la page s'il n'y est pas, débrancher. `conseil` : ce qu'il faut vérifier quand l'outil en refuse.
 */
function useBranchement(api: ApiIntegrations, onChange: () => Promise<unknown>, conseil: string) {
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  async function faire(geste: () => Promise<Message>) {
    setEnvoi(true);
    setMessage(null);
    try { setMessage(await geste()); } catch (e) { setMessage({ ok: false, texte: (e as Error).message || HORS_LIGNE }); }
    setEnvoi(false);
  }
  const renvoyer = () => faire(async () => {
    const r = await api.resynchroniser();
    await onChange();
    return r.erreurs
      ? { ok: false, texte: `${pluriel(r.envoyes, 'envoyé')}, ${pluriel(r.erreurs, 'refusé')} : ${conseil}.` }
      : { ok: true, texte: `${pluriel(r.envoyes, 'inscrit')} envoyé${r.envoyes > 1 ? 's' : ''}.` };
  });
  return { envoi, message, setMessage, faire, renvoyer };
}

function LignesBranchees({ fournisseur, liste, envoi, renvoyer, formulaire, children }: {
  fournisseur: FournisseurListe; liste: Liste; envoi: boolean; renvoyer: () => void; formulaire: Formulaire; children: ReactNode;
}) {
  return (
    <>
      {children}
      {liste.enAttente > 0 && (
        <Ligne nom={`${pluriel(liste.enAttente, 'inscrit')} pas encore parti${liste.enAttente > 1 ? 's' : ''} ${destination({ fournisseur, nom: '' })}`}>
          <BoutonPrincipal onClick={renvoyer} disabled={envoi}>{envoi ? 'Envoi…' : 'Envoyer'}</BoutonPrincipal>
        </Ligne>
      )}
      {!formulaire.present && (
        <Ligne nom="Ta liste e-mail n’est pas sur ta page">
          <BoutonSecondaire onClick={formulaire.ajouter}>L’ajouter</BoutonSecondaire>
        </Ligne>
      )}
    </>
  );
}

/**
 * Débrancher, en bas, en rouge, après une confirmation : la clé chiffrée ne se relit pas, il faudrait la recréer chez l'outil.
 */
function Debrancher({ fournisseur, envoi, debrancher }: { fournisseur: FournisseurListe; envoi: boolean; debrancher: () => void }) {
  const [sur, setSur] = useState(false);
  const nom = NOMS_FOURNISSEURS[fournisseur];
  if (!sur) return <button type="button" onClick={() => setSur(true)} disabled={envoi} className={`${classeBouton.discret} self-start !text-red-300`}>Débrancher {nom}</button>;
  return (
    <div role="alertdialog" aria-label={`Débrancher ${nom} ?`} className="flex flex-col gap-3 rounded-xl border border-red-400/30 px-3.5 py-3">
      <p className="text-[14px] leading-snug"><strong>Débrancher {nom} ?</strong> Tes nouveaux inscrits resteront chez Hopla.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { setSur(false); debrancher(); }} disabled={envoi} className={classeBouton.danger}>Débrancher</button>
        <BoutonSecondaire onClick={() => setSur(false)}>Annuler</BoutonSecondaire>
      </div>
    </div>
  );
}

/** Quand une autre liste est branchée : la remplacer se dit avant. */
function Remplace({ liste, nom }: { liste: Liste | null; nom: string }) {
  const autre = liste?.integration;
  if (!autre) return null;
  return <p className="adm-bandeau">Tes inscrits partent aujourd’hui chez {nomOutil(autre.fournisseur)}. Brancher {nom} le remplace.</p>;
}

/** Une newsletter : la clé, puis la liste choisie parmi celles du compte. Branchée : la liste, la clé, renvoyer, débrancher. */
function PageNewsletter({ outil, liste, api, onChange, onBranche, formulaire }: { outil: Newsletter; liste: Liste | null; api: ApiIntegrations; onChange: () => Promise<unknown>; onBranche: () => Promise<unknown>; formulaire: Formulaire }) {
  const nom = NOMS_FOURNISSEURS[outil];
  const mots = LISTE_CHEZ[outil];
  const branche = liste?.integration?.fournisseur === outil ? liste.integration : null;
  // 'cle' : coller sa clé ; 'liste' : choisir où vont les inscrits ; null : branchée, rien d'ouvert.
  const [etape, setEtape] = useState<'cle' | 'liste' | null>(branche ? null : 'cle');
  const [cle, setCle] = useState('');
  const [listes, setListes] = useState<ListeFournisseur[]>([]);
  const [choix, setChoix] = useState(branche?.liste ?? '');
  const { envoi, message, setMessage, faire, renvoyer } = useBranchement(api, onChange, `vérifie ta clé et ${mots.la}`);
  // Un choix facultatif (« Sans tag », « Toute ton audience ») vient du serveur, en premier.
  const options = listes;
  const creer = CREER_LA_CLE[outil];
  const lisible = typeof navigator !== 'undefined' && !!navigator.clipboard?.readText;

  const branchement = async (avec: string, id: string): Promise<Message> => {
    const r = await api.brancherListe({ fournisseur: outil, cle: avec, liste: id });
    // Branché, la tête le dit (« Branché ») : pas de message en plus.
    if (r.ok) { setCle(''); setEtape(null); await onBranche(); return null; }
    return { ok: false, texte: r.message };
  };
  /**
   * Les listes du compte ; `avec` vide : la clé déjà enregistrée. Une seule (la première newsletter de MailCheap, un compte
   * Systeme.io sans tag) : elle est prise d'office, et c'est branché.
   */
  const lireListes = (avec: string) => faire(async () => {
    const r = await api.listesFournisseur({ fournisseur: outil, cle: avec });
    if (!r.ok) return { ok: false, texte: r.message };
    if (r.listes.length === 1 && !branche) return branchement(avec, r.listes[0].id);
    setListes(r.listes);
    setChoix(c => (r.listes.some(l => l.id === c) ? c : r.listes[0]?.id ?? ''));
    setEtape('liste');
    return r.message ? { ok: false, texte: r.message } : null;
  });
  const brancher = () => faire(() => branchement(cle.trim(), choix));
  async function coller() {
    try {
      const t = (await navigator.clipboard.readText()).trim();
      if (t) { setCle(t); setMessage(null); } else setMessage({ ok: false, texte: `Rien à coller : copie d’abord ta clé chez ${nom}.` });
    } catch { setMessage({ ok: false, texte: 'Le presse-papiers n’a pas pu être lu : appuie longuement dans le champ, puis choisis Coller.' }); }
  }
  const debrancher = () => faire(async () => {
    const r = await api.brancherListe(null);
    if (r.ok) { setEtape('cle'); setChoix(''); await onChange(); }
    return { ok: r.ok, texte: r.message };
  });

  return (
    <>
      {branche && liste && (
        <Groupe titre="Ta liste">
          <LignesBranchees fournisseur={outil} liste={liste} envoi={envoi} renvoyer={renvoyer} formulaire={formulaire}>
            <Ligne nom={mots.mot} valeur={branche.nom || (branche.liste ? branche.liste : SANS_LISTE[outil] ?? 'Sans tag')}>
              <BoutonSecondaire onClick={() => lireListes('')} disabled={envoi || etape === 'liste'}>Changer</BoutonSecondaire>
            </Ligne>
            <Ligne nom="Clé d’API" valeur={branche.cle}>
              <BoutonSecondaire onClick={() => { setEtape('cle'); setMessage(null); }} disabled={envoi || etape === 'cle'}>Changer</BoutonSecondaire>
            </Ligne>
          </LignesBranchees>
        </Groupe>
      )}
      {branche && etape === null && <Debrancher fournisseur={outil} envoi={envoi} debrancher={debrancher} />}

      {etape === 'cle' && (
        <section className="flex flex-col gap-4">
          {!branche && <Remplace liste={liste} nom={nom} />}
          {/* Deux gestes, dans l'ordre où on les fait : créer sa clé chez l'outil, qui s'ouvre à côté, puis la coller ici. */}
          <ol className="flex flex-col gap-4">
            <li className="flex flex-col gap-2">
              <span className="text-[14.5px] font-semibold">1. Crée ta clé chez {nom}</span>
              <span className="text-[13.5px] leading-snug text-white/65">{creer.geste}</span>
              <a href={creer.url} target="_blank" rel="noopener noreferrer" className={`${classeBouton.secondaire} self-start`}>
                Ouvrir {nom}<Icone nom="ui-ouvrir" taille={15} className="shrink-0" />
              </a>
            </li>
            <li className="flex flex-col gap-2">
              <label htmlFor={`cle-${outil}`} className="text-[14.5px] font-semibold">2. Colle-la ici</label>
              <div className="flex gap-2">
                <input id={`cle-${outil}`} className={classeSaisie} value={cle} onChange={e => setCle(e.target.value)} placeholder={EXEMPLE_CLE[outil] ?? 'Ta clé'}
                  onKeyDown={e => { if (e.key === 'Enter' && cle.trim() && !envoi) void lireListes(cle.trim()); }}
                  autoComplete="off" spellCheck={false} autoCapitalize="none" autoCorrect="off" />
                {lisible && <BoutonSecondaire onClick={coller} className="shrink-0">Coller</BoutonSecondaire>}
              </div>
              <span className="text-[12.5px] leading-snug text-white/55">Chiffrée sur le serveur, elle ne s’affiche plus jamais.</span>
            </li>
          </ol>
          <div className="flex flex-col gap-2 bureau:flex-row bureau:flex-wrap">
            <BoutonPrincipal onClick={() => lireListes(cle.trim())} disabled={!cle.trim() || envoi}>{envoi ? `Connexion à ${nom}…` : `Brancher ${nom}`}</BoutonPrincipal>
            {branche && <BoutonSecondaire onClick={() => { setEtape(null); setCle(''); setMessage(null); }}>Annuler</BoutonSecondaire>}
          </div>
        </section>
      )}

      {etape === 'liste' && (
        <section className="flex flex-col gap-3" aria-labelledby="choix-liste">
          <span id="choix-liste" className="text-[13px] font-medium text-white/70">Choisis {mots.la.replace(/^la |^le |^l’/, m => ({ 'la ': 'ta ', 'le ': 'ton ', 'l’': 'ton ' })[m]!)}</span>
          {options.length > 0 && (
            <div className="max-h-[360px] overflow-y-auto rounded-xl">
              <ListeChoix label={`${mots.mot} chez ${nom}`} valeur={choix} options={options} onChange={setChoix} />
            </div>
          )}
          <div className="flex flex-col gap-2 bureau:flex-row bureau:flex-wrap">
            {options.length > 0
              ? <BoutonPrincipal onClick={brancher} disabled={envoi || !options.some(o => o.id === choix)}>{envoi ? 'Vérification…' : branche ? 'Enregistrer' : `Brancher ${nom}`}</BoutonPrincipal>
              : <BoutonPrincipal onClick={() => lireListes(cle.trim())} disabled={envoi}>Réessayer</BoutonPrincipal>}
            <BoutonSecondaire onClick={() => { setEtape(branche ? null : 'cle'); setMessage(null); }}>{branche ? 'Annuler' : 'Retour'}</BoutonSecondaire>
          </div>
        </section>
      )}

      <Resultat message={message} />
    </>
  );
}

/** Make, Zapier ou n8n : l'adresse d'un webhook, qui reçoit un inscrit d'exemple au branchement, puis chaque inscrit. */
function PageWebhook({ outil, liste, api, onChange, onBranche, formulaire }: { outil: Webhook; liste: Liste | null; api: ApiIntegrations; onChange: () => Promise<unknown>; onBranche: () => Promise<unknown>; formulaire: Formulaire }) {
  const nom = NOMS_FOURNISSEURS[outil];
  const branche = liste?.integration?.fournisseur === outil ? liste.integration : null;
  const [changer, setChanger] = useState(!branche);
  const [adresse, setAdresse] = useState('');
  const { envoi, message, setMessage, faire, renvoyer } = useBranchement(api, onChange, `vérifie l’adresse, et que ${OUVRAGE_WEBHOOK[outil]} est actif`);

  const brancher = () => faire(async () => {
    const u = adresse.trim();
    if (!adresseWebhook(outil, u)) return { ok: false, texte: ADRESSE_WEBHOOK[outil] };
    const r = await api.brancherListe({ fournisseur: outil, cle: u, liste: '' });
    if (r.ok) { setAdresse(''); setChanger(false); await onBranche(); }
    return { ok: r.ok, texte: r.message };
  });
  const debrancher = () => faire(async () => {
    const r = await api.brancherListe(null);
    if (r.ok) { setChanger(true); await onChange(); }
    return { ok: r.ok, texte: r.message };
  });

  return (
    <>
      {branche && liste && (
        <Groupe titre="Ton webhook">
          <LignesBranchees fournisseur={outil} liste={liste} envoi={envoi} renvoyer={renvoyer} formulaire={formulaire}>
            <Ligne nom="Adresse" valeur={<span translate="no">{branche.cle}</span>}>
              <BoutonSecondaire onClick={() => { setChanger(true); setMessage(null); }} disabled={envoi || changer}>Changer</BoutonSecondaire>
            </Ligne>
          </LignesBranchees>
        </Groupe>
      )}
      {branche && !changer && <Debrancher fournisseur={outil} envoi={envoi} debrancher={debrancher} />}

      {changer && (
        <section className="flex flex-col gap-3">
          {!branche && <Remplace liste={liste} nom={nom} />}
          <Champ label="Adresse du webhook" aide={OU_EST_LE_WEBHOOK[outil]}>
            <input type="url" inputMode="url" className={classeSaisie} value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="https://"
              onKeyDown={e => { if (e.key === 'Enter' && adresse.trim() && !envoi) void brancher(); }}
              autoComplete="off" spellCheck={false} autoCapitalize="none" autoCorrect="off" />
          </Champ>
          <p className="text-[12.5px] leading-snug text-white/55">
            Chaque inscrit y arrive avec {CHAMPS_WEBHOOK.filter(c => c !== 'exemple').join(', ')}. Un inscrit d’exemple part dès que tu branches.
          </p>
          <div className="flex flex-col gap-2 bureau:flex-row bureau:flex-wrap">
            <BoutonPrincipal onClick={brancher} disabled={!adresse.trim() || envoi}>{envoi ? 'Envoi de l’exemple…' : `Brancher ${nom}`}</BoutonPrincipal>
            {branche && <BoutonSecondaire onClick={() => { setChanger(false); setAdresse(''); setMessage(null); }}>Annuler</BoutonSecondaire>}
          </div>
        </section>
      )}

      <Resultat message={message} />
    </>
  );
}

/** Substack n'a pas d'API : ses inscrits se copient, ou s'importent en fichier, depuis son tableau de bord. */
function PageSubstack({ liste, api }: { liste: Liste | null; api: ApiIntegrations }) {
  const total = liste?.total ?? 0;
  const [message, setMessage] = useState<Message>(null);
  const [envoi, setEnvoi] = useState(false);
  async function copier() {
    setEnvoi(true);
    setMessage(null);
    try {
      const adresses = await api.adresses();
      const copiees = await copierTexte(adresses.join(', '));
      setMessage(copiees ? { ok: true, texte: `${pluriel(adresses.length, 'adresse')} copiée${adresses.length > 1 ? 's' : ''}. Colle-les dans Substack.` } : null);
    } catch { setMessage({ ok: false, texte: HORS_LIGNE }); }
    setEnvoi(false);
  }
  return (
    <>
      <Groupe titre="Tes inscrits">
        <Ligne nom="Les adresses" valeur={total ? pluriel(total, 'inscrit') : 'Personne pour l’instant'}>
          <BoutonSecondaire onClick={copier} disabled={!total || envoi}><Icone nom="ui-copier" taille={16} />Copier</BoutonSecondaire>
        </Ligne>
        <Ligne nom="Le fichier pour l’import" valeur={api.urlContacts ? 'CSV, une colonne email' : 'Pas dans l’aperçu'}>
          {api.urlContacts && total > 0 && <a href={`${api.urlContacts}?format=substack`} download className={classeBouton.secondaire}><Icone nom="telecharger" taille={16} />Télécharger</a>}
        </Ligne>
      </Groupe>
      <p className="adm-reglages-pied text-[13px]">
        Substack n’a pas d’API. Dans Substack : Subscribers, puis Add subscribers. Colle les adresses, ou importe le fichier, et confirme qu’elles ont accepté de te lire.
      </p>
      <Resultat message={message} />
    </>
  );
}

/**
 * Où partent les inscrits, su de tout le back office : `undefined` tant que ce n'est pas lu (ou sans l'offre),
 * `null` quand rien n'est branché. `brancher` ouvre la feuille du parcours.
 */
export const ListeBranchee = createContext<{ integration: IntegrationListe | null | undefined; brancher: () => void } | null>(null);

/**
 * Dans la liste e-mail ouverte : où partent ses inscrits, en une ligne, et le geste pour brancher sa newsletter ou en
 * changer. Rien de branché se dit en ambre : la personne croirait sinon que ses inscrits reçoivent ses e-mails.
 */
export function DestinationListe() {
  const c = useContext(ListeBranchee);
  if (!c || c.integration === undefined) return null;
  const i = c.integration;
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${i ? 'border-white/12' : 'border-amber-400/40 bg-amber-400/[0.08]'}`}>
      {i && <Logo nom={LOGOS_OUTILS[i.fournisseur]} className="w-5" />}
      <span className="min-w-0 flex-1 text-[13.5px] leading-snug">{i ? <>Tes inscrits partent {destination(i)}.</> : <>Aucune newsletter branchée : tes inscrits restent chez Hopla.</>}</span>
      <LienGeste onClick={c.brancher} aria-haspopup="dialog">{i ? 'Changer' : 'Brancher'}</LienGeste>
    </div>
  );
}

/**
 * La feuille « Où vont tes inscrits ? », qui s'ouvre quand on pose une liste e-mail sans newsletter branchée, ou depuis
 * sa ligne dans le bloc (25 octobre 2026, demandé par Lilian) : le même parcours qu'Intégrations, puis un bravo qui dit
 * où ils partent, et envoie d'un geste ceux qui attendaient.
 */
export function FenetreListe({ api, onFermer, onListe }: { api: ApiIntegrations; onFermer: () => void; onListe?: (l: Liste) => void }) {
  const [liste, setListe] = useState<Liste | null>(null);
  const [fait, setFait] = useState(false);
  const recharger = useCallback(() => api.liste().then(l => { setListe(l); onListe?.(l); }).catch(() => {}), [api]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void recharger(); }, [recharger]);
  const branche = liste?.integration ?? null;
  return (
    <Feuille ouverte titre={fait && branche ? 'C’est branché' : 'Où vont tes inscrits ?'} onFermer={onFermer}>
      {fermer => (fait && branche && liste ? <Bravo liste={liste} api={api} recharger={recharger} fermer={() => fermer()} /> : (
        <div className="adm-parcours flex flex-col gap-4">
          <ParcoursListe api={api} liste={liste} recharger={recharger} formulaire={{ present: true, ajouter: () => {} }} onBranche={() => setFait(true)} onFin={() => fermer()} />
        </div>
      ))}
    </Feuille>
  );
}

function Bravo({ liste, api, recharger, fermer }: { liste: Liste; api: ApiIntegrations; recharger: () => Promise<unknown>; fermer: () => void }) {
  const i = liste.integration!;
  const { envoi, message, renvoyer } = useBranchement(api, recharger, 'vérifie ta clé, puis réessaie depuis Intégrations');
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Logo nom={LOGOS_OUTILS[i.fournisseur]} taille={26} className="w-8" />
        <p className="text-[15px] leading-snug">Chaque nouvel inscrit part {destination(i)}{estWebhook(i.fournisseur) ? '' : ', qui lui envoie tes e-mails'}.</p>
      </div>
      {/* Ceux qui attendaient : les envoyer est le geste qui compte, Terminé passe derrière tant qu'ils sont là. */}
      {liste.enAttente > 0 && <p className="text-[14px] leading-snug text-white/75">{pluriel(liste.enAttente, 'inscrit')} gardé{liste.enAttente > 1 ? 's' : ''} chez Hopla.</p>}
      <Resultat message={message} />
      {liste.enAttente > 0 ? (
        <div className="flex flex-col gap-2">
          <BoutonPrincipal onClick={renvoyer} disabled={envoi}>{envoi ? 'Envoi…' : `Envoyer mes ${pluriel(liste.enAttente, 'inscrit')}`}</BoutonPrincipal>
          <BoutonSecondaire onClick={fermer}>Plus tard</BoutonSecondaire>
        </div>
      ) : <BoutonPrincipal onClick={fermer}>Terminé</BoutonPrincipal>}
    </div>
  );
}
