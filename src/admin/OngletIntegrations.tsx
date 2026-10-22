import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Api, Bloc, FournisseurListe, Liste, ListeFournisseur, Newsletter, TypeBloc, Webhook } from '../lib/types.ts';
import { NEWSLETTERS, WEBHOOKS, estWebhook } from '../lib/types.ts';
import type { Fonction } from '../lib/abonnement.ts';
import { ADRESSE_WEBHOOK, CHAMPS_WEBHOOK, COULEURS_LOGOS, LISTE_CHEZ, LOGOS_OUTILS, NOMS_FOURNISSEURS, OUTILS_DES_BLOCS, OUVRAGE_WEBHOOK, adresseWebhook, destination } from '../lib/integrations.ts';
import { Icone } from '../components/Icone.tsx';
import { BoutonPrincipal, BoutonSecondaire, Champ, Groupe, Ligne, LigneLien, ListeChoix, SousPage, classeBouton, classeSaisie, copierTexte } from './ui.tsx';
import { Etiquette, useDroits } from './offre.tsx';
import { TYPES } from './OngletLiens.tsx';

/*
 * Intégrations (22 octobre 2026, demandé par Lilian) : là où l'on branche ses
 * outils. D'abord sa newsletter, où partent les inscrits de « Ma liste
 * d'inscrits » : six se branchent par une clé, puis la liste choisie par son
 * nom, sans chercher d'identifiant ; Substack, qui n'a pas d'API, par la
 * copie des adresses. Puis Make, Zapier et n8n, par un webhook. Enfin, ce qui
 * vit sur la page (avis, rendez-vous, soutien, produit) : un toucher l'ajoute
 * à Ma page, ou l'y ouvre. Une ligne par outil, son logo seul, dans sa
 * couleur ; le détail s'ouvre en sous-page, avec le fil « Intégrations /
 * Brevo » dans l'en-tête, comme Réglages.
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

/** Où trouver sa clé, chez chaque newsletter. */
const OU_EST_LA_CLE: Record<Newsletter, string> = {
  brevo: 'Dans Brevo : Paramètres, SMTP et API, Clés API.',
  mailchimp: 'Dans Mailchimp : Profil, Extras, Clés API. Elle finit par son centre, comme -us21.',
  kit: 'Dans Kit : Settings, Developer, clés de l’API v4.',
  mailerlite: 'Dans MailerLite : Intégrations, API, Générer un jeton.',
  beehiiv: 'Dans beehiiv : Settings, Workspace, API.',
  systeme: 'Dans Systeme.io : Profil, Paramètres, Clés API publiques.',
};
const EXEMPLE_CLE: Partial<Record<Newsletter, string>> = { brevo: 'xkeysib-…', mailchimp: '…-us21' };

/** Où trouver l'adresse de son webhook. */
const OU_EST_LE_WEBHOOK: Record<Webhook, string> = {
  make: 'Dans Make : un scénario qui commence par Webhooks, Custom webhook. Copie son adresse.',
  zapier: 'Dans Zapier : un Zap qui commence par Webhooks by Zapier, Catch Hook. Copie son adresse.',
  n8n: 'Dans n8n : un workflow qui commence par un nœud Webhook en POST, activé. Copie son adresse de production.',
};

export function OngletIntegrations({ api, blocs, onAjouter, onOuvrir, onOffres }: {
  api: ApiIntegrations;
  blocs: Bloc[];
  /** Ajoute un bloc de ce type à Ma page (l'onglet change), ou ouvre celui qui y est déjà. */
  onAjouter: (type: TypeBloc) => void;
  onOuvrir: (bloc: Bloc) => void;
  /** Ouvre les offres par-dessus ; absent quand le compte ne peut pas s'abonner (compte principal, aperçu). */
  onOffres?: (pour?: Fonction) => void;
}) {
  const [liste, setListe] = useState<Liste | null>(null);
  const [sous, setSous] = useState<Outil | null>(null);
  const recharger = useCallback(() => api.liste().then(setListe).catch(() => {}), [api]);
  useEffect(() => { void recharger(); }, [recharger]);
  const droits = useDroits();
  // Ce qui a ouvert la sous-page reprend le focus quand on en revient (la liste se redessine : on le retrouve par son id).
  const ouvreur = useRef('');
  const ouvrir = (o: Outil) => { ouvreur.current = `integration-${o}`; setSous(o); scrollTo({ top: 0 }); };
  useEffect(() => {
    if (sous || !ouvreur.current) return;
    document.getElementById(ouvreur.current)?.focus({ preventScroll: true });
    ouvreur.current = '';
  }, [sous]);

  const branche = liste?.integration ?? null;
  const formulaire = {
    present: blocs.some(b => b.type === 'inscription'),
    ajouter: () => onAjouter('inscription'),
  };

  if (sous) return (
    <div className="adm-reglages">
      <SousPage nom={nomOutil(sous)} retour={() => setSous(null)} />
      {sous === 'substack'
        ? <PageSubstack liste={liste} api={api} />
        : estWebhook(sous)
          ? <PageWebhook outil={sous} liste={liste} api={api} onChange={recharger} formulaire={formulaire} />
          : <PageNewsletter outil={sous} liste={liste} api={api} onChange={recharger} formulaire={formulaire} />}
    </div>
  );

  /** Une newsletter ou une automatisation : réservée à Pro, sauf celle qui est déjà branchée (pour la débrancher). */
  const ligneOutil = (o: Outil) => {
    const ici = branche?.fournisseur === o;
    const libre = droits.listeEmail || ici;
    return (
      <LigneLien key={o} id={`integration-${o}`} avant={<Logo nom={LOGOS_OUTILS[o]} className="w-5" />} nom={nomOutil(o)}
        valeur={ici && branche ? <><strong>Branché</strong>{branche.nom && !estWebhook(branche.fournisseur) ? ` · ${branche.nom}` : ''}</> : undefined}
        apres={libre ? undefined : <Etiquette fonction="listeEmail" />}
        onClick={libre ? () => ouvrir(o) : onOffres ? () => onOffres('listeEmail') : undefined}
        label={libre ? undefined : `${nomOutil(o)}, avec Pro : voir les offres`} />
    );
  };

  return (
    <div className="adm-reglages">
      <Groupe titre="Newsletter">{[...NEWSLETTERS, 'substack' as const].map(ligneOutil)}</Groupe>
      <Groupe titre="Automatisations">{WEBHOOKS.map(ligneOutil)}</Groupe>
      <Groupe titre="Sur ta page">
        {OUTILS_DES_BLOCS.map(r => {
          const t = TYPES.find(x => x.type === r.type)!;
          const presents = blocs.filter(b => b.type === r.type);
          // Un bloc déjà là s'ouvre toujours ; un nouveau demande l'offre qui le comprend.
          const libre = !t.fonction || droits[t.fonction] || presents.length > 0;
          return (
            <LigneLien key={r.type} id={`raccourci-${r.type}`}
              avant={<span className="flex w-5 shrink-0 justify-center"><Icone nom={t.picto} taille={20} /></span>} nom={t.nom}
              valeur={presents.length ? (presents.length > 1 ? `${presents.length} sur ta page` : 'Sur ta page') : undefined}
              apres={libre
                ? <span className="flex shrink-0 items-center gap-2.5">{r.logos.map((l, i) => <Logo key={l} nom={l} taille={16} className={i === 2 ? 'max-[379px]:hidden' : ''} />)}</span>
                : <Etiquette fonction={t.fonction!} />}
              onClick={libre ? () => (presents.length ? onOuvrir(presents[0]) : onAjouter(r.type)) : onOffres ? () => onOffres(t.fonction) : undefined}
              label={libre ? undefined : `${t.nom}, avec une offre : voir les offres`} />
          );
        })}
      </Groupe>
    </div>
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

function LignesBranchees({ fournisseur, liste, envoi, renvoyer, debrancher, formulaire, children }: {
  fournisseur: FournisseurListe; liste: Liste; envoi: boolean; renvoyer: () => void; debrancher: () => void; formulaire: Formulaire; children: ReactNode;
}) {
  return (
    <>
      {children}
      {liste.enAttente > 0 && (
        <Ligne nom={`${pluriel(liste.enAttente, 'inscrit')} pas encore parti${liste.enAttente > 1 ? 's' : ''} ${destination({ fournisseur, nom: '' })}`}>
          <BoutonSecondaire onClick={renvoyer} disabled={envoi}>Envoyer</BoutonSecondaire>
        </Ligne>
      )}
      {!formulaire.present && (
        <Ligne nom="Ma liste d’inscrits n’est pas sur ta page">
          <BoutonSecondaire onClick={formulaire.ajouter}>L’ajouter</BoutonSecondaire>
        </Ligne>
      )}
      <Ligne nom="Débrancher">
        <BoutonSecondaire onClick={debrancher} disabled={envoi} className="!text-red-300">Débrancher</BoutonSecondaire>
      </Ligne>
    </>
  );
}

/** Quand une autre liste est branchée : la remplacer se dit avant. */
function Remplace({ liste, nom }: { liste: Liste | null; nom: string }) {
  const autre = liste?.integration;
  if (!autre) return null;
  return <p className="adm-bandeau">Tes inscrits partent aujourd’hui chez {nomOutil(autre.fournisseur)}. Brancher {nom} le remplace.</p>;
}

/** Une newsletter : la clé, puis la liste choisie parmi celles du compte. Branchée : la liste, la clé, renvoyer, débrancher. */
function PageNewsletter({ outil, liste, api, onChange, formulaire }: { outil: Newsletter; liste: Liste | null; api: ApiIntegrations; onChange: () => Promise<unknown>; formulaire: Formulaire }) {
  const nom = NOMS_FOURNISSEURS[outil];
  const mots = LISTE_CHEZ[outil];
  const branche = liste?.integration?.fournisseur === outil ? liste.integration : null;
  // 'cle' : coller sa clé ; 'liste' : choisir où vont les inscrits ; null : branchée, rien d'ouvert.
  const [etape, setEtape] = useState<'cle' | 'liste' | null>(branche ? null : 'cle');
  const [cle, setCle] = useState('');
  const [listes, setListes] = useState<ListeFournisseur[]>([]);
  const [choix, setChoix] = useState(branche?.liste ?? '');
  const { envoi, message, setMessage, faire, renvoyer } = useBranchement(api, onChange, `vérifie ta clé et ${mots.la}`);
  // Un tag Systeme.io est facultatif : « Sans tag » vient en premier.
  const options = outil === 'systeme' ? [{ id: '', nom: 'Sans tag' }, ...listes] : listes;

  /** Les listes du compte ; `avec` vide : la clé déjà enregistrée. */
  const lireListes = (avec: string) => faire(async () => {
    const r = await api.listesFournisseur({ fournisseur: outil, cle: avec });
    if (!r.ok) return { ok: false, texte: r.message };
    setListes(r.listes);
    setChoix(c => (r.listes.some(l => l.id === c) ? c : outil === 'systeme' ? '' : r.listes[0]?.id ?? ''));
    setEtape('liste');
    return r.message ? { ok: false, texte: r.message } : null;
  });
  const brancher = () => faire(async () => {
    const r = await api.brancherListe({ fournisseur: outil, cle: cle.trim(), liste: choix });
    if (r.ok) { setCle(''); setEtape(null); await onChange(); }
    return { ok: r.ok, texte: r.message };
  });
  const debrancher = () => faire(async () => {
    const r = await api.brancherListe(null);
    if (r.ok) { setEtape('cle'); setChoix(''); await onChange(); }
    return { ok: r.ok, texte: r.message };
  });

  return (
    <>
      {branche && liste && (
        <Groupe titre="Ta liste">
          <LignesBranchees fournisseur={outil} liste={liste} envoi={envoi} renvoyer={renvoyer} debrancher={debrancher} formulaire={formulaire}>
            <Ligne nom={mots.mot} valeur={branche.nom || (branche.liste ? branche.liste : 'Sans tag')}>
              <BoutonSecondaire onClick={() => lireListes('')} disabled={envoi || etape === 'liste'}>Changer</BoutonSecondaire>
            </Ligne>
            <Ligne nom="Clé d’API" valeur={branche.cle}>
              <BoutonSecondaire onClick={() => { setEtape('cle'); setMessage(null); }} disabled={envoi || etape === 'cle'}>Changer</BoutonSecondaire>
            </Ligne>
          </LignesBranchees>
        </Groupe>
      )}

      {etape === 'cle' && (
        <section className="flex flex-col gap-3">
          {!branche && <Remplace liste={liste} nom={nom} />}
          <Champ label="Clé d’API" aide={`${OU_EST_LA_CLE[outil]} Chiffrée sur le serveur, elle ne s’affiche plus jamais.`}>
            <input className={classeSaisie} value={cle} onChange={e => setCle(e.target.value)} placeholder={EXEMPLE_CLE[outil]}
              onKeyDown={e => { if (e.key === 'Enter' && cle.trim() && !envoi) void lireListes(cle.trim()); }}
              autoComplete="off" spellCheck={false} autoCapitalize="none" autoCorrect="off" />
          </Champ>
          <div className="flex flex-wrap gap-2">
            <BoutonPrincipal onClick={() => lireListes(cle.trim())} disabled={!cle.trim() || envoi}>{envoi ? 'Lecture de ton compte…' : 'Continuer'}</BoutonPrincipal>
            {branche && <BoutonSecondaire onClick={() => { setEtape(null); setCle(''); setMessage(null); }}>Annuler</BoutonSecondaire>}
          </div>
        </section>
      )}

      {etape === 'liste' && (
        <section className="flex flex-col gap-3" aria-labelledby="choix-liste">
          <span id="choix-liste" className="text-[13px] font-medium text-white/70">{mots.mot} où vont tes inscrits</span>
          {options.length > 0 && (
            <div className="max-h-[360px] overflow-y-auto rounded-xl">
              <ListeChoix label={`${mots.mot} chez ${nom}`} valeur={choix} options={options} onChange={setChoix} />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {options.length > 0
              ? <BoutonPrincipal onClick={brancher} disabled={envoi || (!choix && outil !== 'systeme')}>{envoi ? 'Vérification…' : branche ? 'Enregistrer' : `Brancher ${nom}`}</BoutonPrincipal>
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
function PageWebhook({ outil, liste, api, onChange, formulaire }: { outil: Webhook; liste: Liste | null; api: ApiIntegrations; onChange: () => Promise<unknown>; formulaire: Formulaire }) {
  const nom = NOMS_FOURNISSEURS[outil];
  const branche = liste?.integration?.fournisseur === outil ? liste.integration : null;
  const [changer, setChanger] = useState(!branche);
  const [adresse, setAdresse] = useState('');
  const { envoi, message, setMessage, faire, renvoyer } = useBranchement(api, onChange, `vérifie l’adresse, et que ${OUVRAGE_WEBHOOK[outil]} est actif`);

  const brancher = () => faire(async () => {
    const u = adresse.trim();
    if (!adresseWebhook(outil, u)) return { ok: false, texte: ADRESSE_WEBHOOK[outil] };
    const r = await api.brancherListe({ fournisseur: outil, cle: u, liste: '' });
    if (r.ok) { setAdresse(''); setChanger(false); await onChange(); }
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
          <LignesBranchees fournisseur={outil} liste={liste} envoi={envoi} renvoyer={renvoyer} debrancher={debrancher} formulaire={formulaire}>
            <Ligne nom="Adresse" valeur={<span translate="no">{branche.cle}</span>}>
              <BoutonSecondaire onClick={() => { setChanger(true); setMessage(null); }} disabled={envoi || changer}>Changer</BoutonSecondaire>
            </Ligne>
          </LignesBranchees>
        </Groupe>
      )}

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
          <div className="flex flex-wrap gap-2">
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
