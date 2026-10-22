import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import type { ApiComptes, CompteResume, Reservation, SignalementResume } from '../lib/types.ts';
import { nomMotif } from '../lib/legal.ts';
import { cheminPage } from '../lib/types.ts';
import type { EtatOffre } from '../lib/abonnement.ts';
import { OFFRES, euros } from '../lib/abonnement.ts';
import type { StatutCompte } from '../lib/comptes.ts';
import { NOMS_STATUTS, quand, statutCompte, trouve } from '../lib/comptes.ts';
import { Icone } from '../components/Icone.tsx';
import type { ElementMenu } from './ui.tsx';
import { ActionEntete, Champ, Feuille, Menu, classeBadge, classeBouton, classeSaisie } from './ui.tsx';
import { focusAuto } from '../lib/clavier';

/*
 * Les comptes, dans le back office de Lilian seulement (direction B, 20
 * octobre 2026). Trois onglets avec leur compte (Comptes, Liste d'attente,
 * Signalements), une recherche, puis un tableau : la page, l'e-mail, l'offre,
 * les vues sur 30 jours, la dernière connexion, le statut, et « … » pour les
 * gestes. « Inviter » s'ouvre dans une petite fenêtre. Au téléphone, le
 * tableau devient une liste.
 *
 * Pendant la bêta on n'entre que sur invitation : Lilian invite une personne
 * de la liste d'attente (son nom réservé depuis l'accueil), ou saisit
 * l'adresse et le pseudo ; la personne reçoit un lien valable une semaine.
 * Suspendre et supprimer demandent un motif, envoyé à la personne (DSA,
 * article 17).
 */

type Message = { ok: boolean; texte: string; lienDev?: string };
type Vue = 'comptes' | 'attente' | 'signalements';
type Resultat = { ok: boolean; message: string; lienDev?: string };

const nombre = (n: number) => n.toLocaleString('fr-FR');
const dateCourte = (ts: number) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(ts);
const voirPage = (pseudo: string) => window.open(cheminPage({ pseudo, principal: false }), '_blank', 'noopener');

/** Une décision qui part avec un motif : suspendre ou supprimer un compte, traiter un signalement. */
interface Decision {
  titre: string; label: string; aide: string; requis: boolean; bouton: string; danger?: boolean; avertissement?: string;
  valider: (motif: string) => Promise<unknown>;
}

export function OngletComptes({ api, avatar }: { api: ApiComptes; avatar?: string }) {
  const [vue, setVue] = useState<Vue>('comptes');
  const [comptes, setComptes] = useState<CompteResume[] | null>(null);
  const [attente, setAttente] = useState<Reservation[] | null>(null);
  const [signalements, setSignalements] = useState<SignalementResume[] | null>(null);
  const [erreur, setErreur] = useState('');
  const [recherche, setRecherche] = useState('');
  const [message, setMessage] = useState<Message | null>(null);
  const [inviter, setInviter] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [aRetirer, setARetirer] = useState<Reservation | null>(null);
  const id = useId();

  const chargerComptes = useCallback(() => api.lister().then(setComptes).catch(() => setErreur('La liste ne s’est pas chargée. Recharge la page.')), [api]);
  const chargerAttente = useCallback(() => api.attente().then(setAttente).catch(() => setAttente([])), [api]);
  const chargerSignalements = useCallback(() => api.signalements().then(setSignalements).catch(() => setSignalements([])), [api]);
  const toutRecharger = useCallback(() => Promise.all([chargerComptes(), chargerAttente(), chargerSignalements()]), [chargerComptes, chargerAttente, chargerSignalements]);
  useEffect(() => { void toutRecharger(); }, [toutRecharger]);

  /** Un geste sur un compte ou une réservation : son résultat s'affiche en haut, puis tout se relit. */
  async function agir(faire: () => Promise<Resultat | void>) {
    setMessage(null);
    try {
      const r = await faire();
      if (r) setMessage({ ok: r.ok, texte: r.message, lienDev: r.lienDev });
    } catch (error) { setMessage({ ok: false, texte: (error as Error).message || 'L’action n’a pas abouti. Réessaie.' }); }
    await toutRecharger();
  }

  const ouverts = signalements?.filter(s => s.statut === 'ouvert') ?? [];
  // Au téléphone, « Attente » : les trois onglets et le compte des signalements tiennent sur la largeur.
  const onglets: { id: Vue; nom: string; court?: string; compte: number | null; alerte?: boolean }[] = [
    { id: 'comptes', nom: 'Comptes', compte: comptes?.length ?? null },
    { id: 'attente', nom: 'Liste d’attente', court: 'Attente', compte: attente?.length ?? null },
    { id: 'signalements', nom: 'Signalements', compte: signalements ? ouverts.length : null, alerte: ouverts.length > 0 },
  ];
  // Les flèches passent d'un onglet à l'autre (motif ARIA des onglets).
  const liste = useRef<HTMLDivElement>(null);
  function fleches(e: KeyboardEvent) {
    const pas = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity }[e.key];
    if (pas === undefined) return;
    e.preventDefault();
    const i = onglets.findIndex(o => o.id === vue);
    const n = pas === -Infinity ? 0 : pas === Infinity ? onglets.length - 1 : (i + pas + onglets.length) % onglets.length;
    if (onglets[n].id !== vue) { setVue(onglets[n].id); setMessage(null); }
    liste.current?.querySelectorAll<HTMLElement>('[role=tab]')[n]?.focus();
  }

  const boutonInviter = (classe: string) => (
    <button type="button" onClick={() => setInviter(true)} aria-haspopup="dialog" className={`${classeBouton.principal} ${classe}`}>
      <Icone nom="ui-plus" taille={16} className="shrink-0" />Inviter
    </button>
  );

  const gestesCompte = (c: CompteResume): ElementMenu[] => {
    const suspendu = c.statut === 'suspendu';
    return [
      { nom: 'Voir sa page', icone: 'ui-ouvrir', action: () => voirPage(c.pseudo) },
      ...(suspendu ? [] : [{ nom: 'Renvoyer un lien', icone: 'ui-fleche', action: () => void agir(async () => { const r = await api.renvoyer(c.id); return r.ok ? { ...r, message: `Nouveau lien envoyé à ${c.email}.` } : r; }) }]),
      suspendu
        ? { nom: 'Réactiver', icone: 'ui-oeil', action: () => void agir(async () => { await api.changerStatut(c.id, 'actif', ''); return { ok: true, message: `${c.pseudo} est de nouveau en ligne.` }; }) }
        : { nom: 'Suspendre…', icone: 'ui-masque', action: () => setDecision({
          titre: `Suspendre ${c.pseudo}`, label: 'Motif de la suspension', requis: true, bouton: 'Suspendre et prévenir',
          aide: 'Envoyé à la personne par e-mail : les faits, la règle des CGU en cause. Elle peut contester en répondant.',
          valider: m => agir(async () => { await api.changerStatut(c.id, 'suspendu', m); return { ok: true, message: `${c.pseudo} est suspendu, la personne est prévenue.` }; }),
        }) },
      { nom: 'Supprimer…', icone: 'ui-corbeille', danger: true, action: () => setDecision({
        titre: `Supprimer ${c.pseudo}`, label: 'Motif de la suppression (facultatif)', requis: false, bouton: 'Supprimer définitivement', danger: true,
        aide: 'Laisse vide si la personne l’a demandé. Sinon, le motif lui est envoyé par e-mail.',
        // Un abonnement en cours est résilié d'abord, tout de suite : la phrase le dit à côté de ce qui s'efface.
        avertissement: c.plan === 'gratuit'
          ? 'Sa page, ses liens, ses images et ses statistiques seront effacés. Rien ne se récupère.'
          : `Sa page, ses liens, ses images et ses statistiques seront effacés, et son abonnement ${OFFRES[c.plan].nom} résilié tout de suite chez Creem, sans remboursement automatique. Rien ne se récupère.`,
        valider: m => agir(async () => {
          const r = await api.supprimer(c.id, m);
          // Creem n'a pas confirmé deux fois de suite : le compte est parti, l'abonnement reste à résilier à la main.
          if (r === 'a-la-main') return { ok: false, message: `${c.pseudo} est supprimé, mais Creem n’a pas confirmé la résiliation : résilie son abonnement à la main, les détails sont dans ta boîte mail.` };
          return { ok: true, message: r === 'faite' ? `${c.pseudo} est supprimé, son abonnement résilié chez Creem.` : `${c.pseudo} est supprimé.` };
        }),
      }) },
    ];
  };

  const comptesVus = (comptes ?? []).filter(c => trouve(recherche, c.pseudo, c.email));
  const attenteVue = (attente ?? []).filter(r => trouve(recherche, r.pseudo, r.email));
  const signalementsVus = (signalements ?? []).filter(s => trouve(recherche, s.pseudo, nomMotif(s.motif)));
  const rien = (quoi: string) => <p className="py-6 text-[14px] text-white/60">{recherche.trim() ? `Aucun ${quoi} ne correspond à « ${recherche.trim()} ».` : ''}</p>;

  return (
    <div className="adm-comptes flex flex-col gap-4 lg:gap-0">
      <ActionEntete>{boutonInviter('')}</ActionEntete>

      <div className="adm-comptes-barre">
        <div ref={liste} role="tablist" aria-label="Comptes" onKeyDown={fleches} className="adm-comptes-onglets">
          {onglets.map(o => (
            <button key={o.id} type="button" role="tab" id={`${id}-${o.id}`} aria-selected={vue === o.id} aria-controls={`${id}-panneau`} tabIndex={vue === o.id ? 0 : -1}
              aria-label={o.alerte ? `${o.nom}, ${o.compte} à traiter` : undefined} onClick={() => { if (o.id !== vue) { setVue(o.id); setMessage(null); } }}>
              {o.court ? <><span className="max-sm:hidden">{o.nom}</span><span className="sm:hidden">{o.court}</span></> : o.nom}
              {o.compte !== null && <span className="adm-compteur" data-alerte={o.alerte || undefined} aria-hidden={o.alerte || undefined}>{o.compte}</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="adm-recherche">
            <Icone nom="ui-recherche" taille={15} />
            <input type="search" value={recherche} onChange={e => setRecherche(e.target.value)} aria-label="Chercher un compte" placeholder="Pseudo ou e-mail" autoComplete="off" spellCheck={false} />
          </label>
          {boutonInviter('lg:hidden')}
        </div>
      </div>

      <div id={`${id}-panneau`} role="tabpanel" aria-labelledby={`${id}-${vue}`} className="adm-comptes-contenu flex flex-col gap-4">
        {message && <Bandeau message={message} fermer={() => setMessage(null)} />}

        {vue === 'comptes' && (
          <>
            <OffresCreem api={api} />
            {erreur && <p className="text-[14px] text-red-300" role="alert">{erreur}</p>}
            {!comptes && !erreur && <p className="py-6 text-[14px] text-white/60">Chargement…</p>}
            {comptes && (comptesVus.length === 0 ? rien('compte') : (
              <>
                <table className="adm-tableau hidden lg:table">
                  <colgroup>
                    <col style={{ width: '22%' }} /><col style={{ width: '24%' }} /><col style={{ width: '11%' }} /><col style={{ width: '9.5%' }} />
                    <col style={{ width: '15.5%' }} /><col style={{ width: '13%' }} /><col style={{ width: 48 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col">Page</th><th scope="col">E-mail</th><th scope="col">Offre</th><th scope="col" className="adm-nombre">Vues 30&#8239;j</th>
                      <th scope="col">Dernière connexion</th><th scope="col">Statut</th><th scope="col"><span className="sr-only">Gestes</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {comptesVus.map(c => {
                      const statut = statutCompte(c, signalements ?? []);
                      return (
                        <tr key={c.id}>
                          <td><NomCompte compte={c} avatar={avatar} /></td>
                          <td className="adm-gris" title={c.email}>{c.email}</td>
                          <td className="text-[#3d3d39]">{c.principal ? 'Principal' : <Offre plan={c.plan} />}</td>
                          <td className="adm-nombre">{nombre(c.vues)}</td>
                          <td className="adm-gris">{quand(c.connexion)}</td>
                          <td><Statut statut={statut} /></td>
                          <td>{!c.principal && <MenuGestes nom={c.pseudo} elements={gestesCompte(c)} />}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <ul className="adm-liste-comptes lg:hidden">
                  {comptesVus.map(c => {
                    const statut = statutCompte(c, signalements ?? []);
                    return (
                      <li key={c.id}>
                        <Pastille pseudo={c.pseudo} avatar={c.principal ? avatar : undefined} />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-[15px] font-medium"><span className="truncate">{c.pseudo}</span>{c.principal ? <span className={classeBadge}>Toi</span> : c.plan !== 'gratuit' && <Offre plan={c.plan} />}</p>
                          <p className="truncate text-[13px] text-white/60">{c.email}</p>
                          <p className="text-[13px] text-white/60">{c.principal ? 'Principal · ' : c.plan === 'gratuit' ? 'Gratuit · ' : ''}{nombre(c.vues)} vue{c.vues > 1 ? 's' : ''} en 30&#8239;j · {quand(c.connexion)}</p>
                          {statut !== 'actif' && <p className="mt-0.5 text-[13px]"><Statut statut={statut} /></p>}
                        </div>
                        {!c.principal && <MenuGestes nom={c.pseudo} elements={gestesCompte(c)} />}
                      </li>
                    );
                  })}
                </ul>
              </>
            ))}
          </>
        )}

        {vue === 'attente' && attente && (
          attente.length === 0 ? <p className="py-6 text-[14px] text-white/60">Les noms réservés depuis hopla.page arrivent ici, dans l’ordre d’arrivée.</p>
          : attenteVue.length === 0 ? rien('nom')
          : (
            <>
              <table className="adm-tableau hidden lg:table">
                <colgroup><col style={{ width: '30%' }} /><col style={{ width: '34%' }} /><col style={{ width: '18%' }} /><col /><col style={{ width: 48 }} /></colgroup>
                <thead><tr><th scope="col">Nom réservé</th><th scope="col">E-mail</th><th scope="col">Réservé</th><th scope="col"><span className="sr-only">Inviter</span></th><th scope="col"><span className="sr-only">Gestes</span></th></tr></thead>
                <tbody>
                  {attenteVue.map(r => (
                    <tr key={r.id}>
                      <td><span className="flex min-w-0 items-center gap-2.5"><Pastille pseudo={r.pseudo} /><span className="truncate font-medium" translate="no">{r.pseudo}</span></span></td>
                      <td className="adm-gris" title={r.email}>{r.email}</td>
                      <td className="adm-gris">{quand(r.ts)}</td>
                      <td className="text-right"><BoutonInviterAttente r={r} agir={agir} api={api} /></td>
                      <td><MenuGestes nom={r.pseudo} elements={[{ nom: 'Retirer de la liste…', icone: 'ui-corbeille', danger: true, action: () => setARetirer(r) }]} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="adm-liste-comptes lg:hidden">
                {attenteVue.map(r => (
                  <li key={r.id}>
                    <Pastille pseudo={r.pseudo} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium" translate="no">{r.pseudo}</p>
                      <p className="truncate text-[13px] text-white/60">{r.email} · {quand(r.ts)}</p>
                    </div>
                    <BoutonInviterAttente r={r} agir={agir} api={api} />
                    <MenuGestes nom={r.pseudo} elements={[{ nom: 'Retirer de la liste…', icone: 'ui-corbeille', danger: true, action: () => setARetirer(r) }]} />
                  </li>
                ))}
              </ul>
            </>
          )
        )}

        {vue === 'signalements' && signalements && (
          <Signalements liste={signalementsVus} vide={signalements.length === 0} recherche={recherche} decider={setDecision} api={api} agir={agir} />
        )}
      </div>

      <Feuille petite ouverte={inviter} onFermer={() => setInviter(false)} titre="Inviter quelqu’un">
        {fermer => <FormInviter inviter={(email, pseudo) => api.inviter(email, pseudo)} fini={r => fermer(() => { setInviter(false); setMessage({ ok: true, texte: r.message, lienDev: r.lienDev }); void toutRecharger(); })} />}
      </Feuille>

      <Feuille petite ouverte={!!decision} onFermer={() => setDecision(null)} titre={decision?.titre ?? ''}>
        {fermer => decision && <FormMotif decision={decision} annuler={() => fermer()} fini={() => fermer(() => setDecision(null))} />}
      </Feuille>

      <Feuille petite ouverte={!!aRetirer} onFermer={() => setARetirer(null)} titre={`Retirer ${aRetirer?.pseudo ?? ''}`}>
        {fermer => aRetirer && (
          <div className="flex flex-col gap-4 pb-1">
            <p className="text-[14px] leading-snug text-white/75">La réservation de {aRetirer.email} est effacée, sans prévenir la personne. Le nom redevient libre.</p>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => fermer()} className={classeBouton.discret}>Annuler</button>
              <button type="button" className={classeBouton.danger} onClick={() => { const r = aRetirer; fermer(() => { setARetirer(null); void agir(async () => { await api.retirerAttente(r.id); return { ok: true, message: `${r.pseudo} n’est plus sur la liste.` }; }); }); }}>Retirer de la liste</button>
            </div>
          </div>
        )}
      </Feuille>
    </div>
  );
}

const TEINTES = ['bleu', 'citron', 'lilas', 'menthe', 'creme'] as const;
/** Une des teintes de l'accueil, tirée du pseudo : un compte garde la sienne d'une visite à l'autre. */
const teinteDe = (pseudo: string) => TEINTES[[...pseudo].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % TEINTES.length];

/** La photo du compte principal, l'initiale sur une teinte de l'accueil pour les autres. */
function Pastille({ pseudo, avatar }: { pseudo: string; avatar?: string }) {
  return <span className="adm-pastille" data-teinte={avatar ? undefined : teinteDe(pseudo)} aria-hidden="true">{avatar ? <img src={avatar} alt="" /> : pseudo.slice(0, 1)}</span>;
}

/** L'offre d'un compte : une étiquette aux couleurs de l'offre quand elle est payante, le mot seul pour Gratuit. */
function Offre({ plan }: { plan: CompteResume['plan'] }) {
  return plan === 'gratuit' ? <>{OFFRES.gratuit.nom}</> : <span className={classeBadge} data-offre={plan}>{OFFRES[plan].nom}</span>;
}

function NomCompte({ compte, avatar }: { compte: CompteResume; avatar?: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Pastille pseudo={compte.pseudo} avatar={compte.principal ? avatar : undefined} />
      <span className="truncate font-medium" translate="no">{compte.pseudo}</span>
      {compte.principal && <span className={classeBadge}>Toi</span>}
    </span>
  );
}

/** Actif en gris ; Signalé et Suspendu en ambre, avec un picto, pour qu'ils se lisent sans la couleur. */
function Statut({ statut }: { statut: StatutCompte }) {
  if (statut === 'actif') return <span className="adm-statut">{NOMS_STATUTS.actif}</span>;
  return (
    <span className="adm-statut" data-alerte="">
      {statut === 'signale' ? <Icone nom="alerte" taille={15} className="shrink-0" /> : <Icone nom="pause" taille={15} className="shrink-0" />}
      {NOMS_STATUTS[statut]}
    </span>
  );
}

function MenuGestes({ nom, elements }: { nom: string; elements: ElementMenu[] }) {
  return (
    <Menu label={`Gestes pour ${nom}`} titre={`Gestes pour ${nom}`} elements={elements} className="adm-points">
      <Icone nom="ui-points" taille={18} />
    </Menu>
  );
}

function BoutonInviterAttente({ r, agir, api }: { r: Reservation; agir: (faire: () => Promise<Resultat | void>) => Promise<void>; api: ApiComptes }) {
  const [envoi, setEnvoi] = useState(false);
  return (
    <button type="button" disabled={envoi} className={classeBouton.secondaire} aria-label={`Inviter ${r.pseudo}`}
      onClick={async () => { setEnvoi(true); await agir(() => api.inviterAttente(r.id)); setEnvoi(false); }}>
      {envoi ? 'Envoi…' : 'Inviter'}
    </button>
  );
}

/** Le résultat du dernier geste, en haut du tableau ; un lien de connexion en développement (sans Resend) s'y lit en entier. */
function Bandeau({ message, fermer }: { message: Message; fermer: () => void }) {
  return (
    <div role={message.ok ? 'status' : 'alert'} className="adm-bandeau" data-erreur={message.ok ? undefined : ''}>
      <p className="min-w-0 flex-1 pt-1">
        {message.texte}
        {message.lienDev && <a href={message.lienDev} className="mt-1 block break-all text-[12.5px] text-white underline">{message.lienDev}</a>}
      </p>
      <button type="button" onClick={fermer} className={classeBouton.icone} aria-label="Fermer le message"><Icone nom="ui-fermer" taille={16} /></button>
    </div>
  );
}

function FormInviter({ inviter, fini }: { inviter: (email: string, pseudo: string) => Promise<Resultat>; fini: (r: Resultat) => void }) {
  const [email, setEmail] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const idPseudo = useId();
  async function envoyer(e: FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreur('');
    try {
      const r = await inviter(email, pseudo);
      if (r.ok) { fini(r); return; }
      setErreur(r.message);
    } catch { setErreur('Le serveur ne répond pas. Réessaie dans un instant.'); }
    setEnvoi(false);
  }
  return (
    <form onSubmit={envoyer} className="flex flex-col gap-4 pb-1">
      <Champ label="Son adresse e-mail">
        <input type="email" required autoFocus={focusAuto()} className={classeSaisie} value={email} onChange={e => setEmail(e.target.value)} placeholder="prenom@exemple.fr" autoComplete="off" />
      </Champ>
      <div>
        <label htmlFor={idPseudo} className="mb-1.5 block text-[12.5px] font-medium text-white/60 bureau:text-white/75">Son pseudo</label>
        <div className="adm-champ-prefixe">
          <span aria-hidden="true">hopla.page/</span>
          <input id={idPseudo} required value={pseudo} maxLength={30} placeholder="prenom-nom" autoComplete="off" autoCapitalize="none" spellCheck={false}
            onChange={e => setPseudo(e.target.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-'))} />
        </div>
      </div>
      {erreur && <p role="alert" className="text-[13.5px] font-medium text-red-300">{erreur}</p>}
      <div className="flex justify-end pt-1">
        <button type="submit" disabled={envoi} className={classeBouton.principal}>{envoi ? 'Envoi…' : 'Envoyer l’invitation'}</button>
      </div>
    </form>
  );
}

function FormMotif({ decision, annuler, fini }: { decision: Decision; annuler: () => void; fini: () => void }) {
  const [motif, setMotif] = useState('');
  const [envoi, setEnvoi] = useState(false);
  async function valider(e: FormEvent) {
    e.preventDefault();
    if (decision.requis && !motif.trim()) return;
    setEnvoi(true);
    await decision.valider(motif.trim());
    fini();
  }
  return (
    <form onSubmit={valider} className="flex flex-col gap-4 pb-1">
      <Champ label={decision.label} aide={decision.aide}>
        <textarea autoFocus={focusAuto()} className={`${classeSaisie} min-h-24`} value={motif} maxLength={2000} required={decision.requis} onChange={e => setMotif(e.target.value)} />
      </Champ>
      {decision.avertissement && <p className="text-[13.5px] font-medium leading-snug text-red-300">{decision.avertissement}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={annuler} className={classeBouton.discret}>Annuler</button>
        <button type="submit" disabled={envoi || (decision.requis && !motif.trim())} className={decision.danger ? classeBouton.danger : classeBouton.principal}>{envoi ? 'Envoi…' : decision.bouton}</button>
      </div>
    </form>
  );
}

/** Les signalements reçus par le formulaire des pages : ceux à traiter d'abord, puis l'historique. */
function Signalements({ liste, vide, recherche, decider, api, agir }: {
  liste: SignalementResume[]; vide: boolean; recherche: string; decider: (d: Decision) => void; api: ApiComptes;
  agir: (faire: () => Promise<Resultat | void>) => Promise<void>;
}) {
  const ouverts = liste.filter(s => s.statut === 'ouvert');
  const traites = liste.filter(s => s.statut !== 'ouvert');
  if (vide) return <p className="py-6 text-[14px] text-white/60">Quand quelqu’un signale une page, le signalement arrive ici et dans ta boîte mail.</p>;
  if (!liste.length) return <p className="py-6 text-[14px] text-white/60">Aucun signalement ne correspond à « {recherche.trim()} ».</p>;
  const traiter = (s: SignalementResume, statut: 'sans-suite' | 'suspendu'): Decision => statut === 'suspendu'
    ? { titre: `Suspendre ${s.pseudo}`, label: 'Motif de la suspension, envoyé au compte', aide: 'Les faits et la règle des CGU ou la loi en cause.', requis: true, bouton: 'Suspendre la page',
      valider: m => agir(async () => { await api.traiterSignalement(s.id, 'suspendu', m); return { ok: true, message: `${s.pseudo} est suspendu.` }; }) }
    : { titre: 'Classer sans suite', label: 'Réponse à la personne qui a signalé (facultatif)', aide: 'Vide : « la page ne nous paraît pas enfreindre la loi ni nos conditions ».', requis: false, bouton: 'Classer sans suite',
      valider: m => agir(async () => { await api.traiterSignalement(s.id, 'sans-suite', m); return { ok: true, message: 'Signalement classé sans suite.' }; }) };
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="signalements-ouverts" className="flex flex-col gap-3">
        <h2 id="signalements-ouverts" className="text-[15px] font-semibold">À traiter</h2>
        {ouverts.length === 0 && <p className="text-[14px] text-white/60">Rien à traiter.</p>}
        {ouverts.map(s => (
          <article key={s.id} className="adm-encart flex flex-col gap-2 p-4">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-semibold">
              <Icone nom="alerte" taille={16} className="shrink-0 text-amber-200" />
              {nomMotif(s.motif)} <span className="font-normal text-white/60">sur</span>
              <a href={cheminPage({ pseudo: s.pseudo, principal: false })} target="_blank" rel="noopener" className="underline decoration-white/30 underline-offset-2" translate="no">{s.pseudo}</a>
            </p>
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-white/75">{s.details}</p>
            <p className="text-[12.5px] text-white/60">Reçu le {dateCourte(s.ts)} · {s.contact ? 'la personne recevra la décision par e-mail' : 'anonyme'}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={() => decider(traiter(s, 'sans-suite'))} aria-haspopup="dialog" className={classeBouton.secondaire}>Sans suite</button>
              <button type="button" onClick={() => decider(traiter(s, 'suspendu'))} aria-haspopup="dialog" className={classeBouton.secondaire}>Suspendre la page</button>
            </div>
          </article>
        ))}
      </section>
      {traites.length > 0 && (
        <section aria-labelledby="signalements-traites" className="flex flex-col gap-1">
          <h2 id="signalements-traites" className="text-[15px] font-semibold">Déjà traités</h2>
          <table className="adm-tableau hidden lg:table">
            <colgroup><col style={{ width: '22%' }} /><col style={{ width: '20%' }} /><col style={{ width: '15%' }} /><col /></colgroup>
            <thead><tr><th scope="col">Page</th><th scope="col">Motif</th><th scope="col">Reçu</th><th scope="col">Décision</th></tr></thead>
            <tbody>
              {traites.map(s => (
                <tr key={s.id}>
                  <td className="truncate font-medium" translate="no">{s.pseudo || 'compte supprimé'}</td>
                  <td className="adm-gris" title={nomMotif(s.motif)}>{nomMotif(s.motif)}</td>
                  <td className="adm-gris">{dateCourte(s.ts)}</td>
                  <td className="adm-gris" title={s.decision || undefined}>{s.statut === 'suspendu' ? 'Page suspendue' : 'Sans suite'}{s.decision ? ` : ${s.decision}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="adm-liste-comptes lg:hidden">
            {traites.map(s => (
              <li key={s.id}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium" translate="no">{s.pseudo || 'compte supprimé'}</p>
                  <p className="text-[13px] text-white/60">{nomMotif(s.motif)} · {dateCourte(s.ts)} · {s.statut === 'suspendu' ? 'page suspendue' : 'sans suite'}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * Les offres dans Creem : pour chaque offre et chaque période, le produit qui
 * la vend, relu dans Creem à l'ouverture de l'onglet. Un prix changé dans Creem
 * y est repris ; s'il diffère de celui de `OFFRES`, la ligne dit le prix de
 * Creem. « Créer les offres dans Creem » fabrique ceux qui manquent, au prix
 * de `OFFRES` ; un prix changé dans le code donne un nouveau produit, et
 * l'ancien reste en place pour les abonnés qui l'ont. L'encart ne se montre
 * que s'il reste un produit à créer (ou juste après la création, pour le dire).
 */
function OffresCreem({ api }: { api: ApiComptes }) {
  const [offres, setOffres] = useState<EtatOffre[] | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  useEffect(() => { api.offres().then(setOffres).catch(() => setOffres([])); }, [api]);
  const manquent = offres?.filter(o => o.enVente && !o.produit) ?? [];

  async function creer() {
    setEnvoi(true);
    setMessage(null);
    try {
      const o = await api.creerOffres();
      setOffres(o);
      setMessage({ ok: true, texte: 'Les offres sont en vente dans Creem.' });
    } catch (error) { setMessage({ ok: false, texte: (error as Error).message || 'Creem ne répond pas. Réessaie dans un instant.' }); }
    setEnvoi(false);
  }

  if (!offres || (!manquent.length && !message)) return null;
  return (
    <section aria-labelledby="offres-creem" className="adm-encart flex flex-col gap-2 p-4">
      <h2 id="offres-creem" className="flex items-center justify-between gap-3 text-[15px] font-semibold">
        Les offres dans Creem {manquent.length > 0 && <span className="text-[13px] font-normal text-white/60">{manquent.length} à créer</span>}
      </h2>
      <ul className="flex flex-col divide-y divide-white/[0.06]">
        {offres.map(o => (
          <li key={`${o.plan}-${o.periode}`} className="flex min-h-11 items-center gap-3 py-2 bureau:min-h-9">
            <span className="min-w-0 flex-1 text-[14px]">{OFFRES[o.plan].nom} {o.periode === 'an' ? 'annuel' : 'mensuel'}</span>
            <span className="text-[13.5px] tabular-nums text-white/60">{euros(o.prix)}</span>
            <span className={`w-32 text-right text-[13px] ${o.produit ? 'text-white' : 'text-white/60'}`}>{o.produit ? 'En vente' : o.prixCreem !== null ? `${euros(o.prixCreem)} dans Creem` : o.enVente ? 'À créer' : 'Plus tard'}</span>
          </li>
        ))}
      </ul>
      {manquent.length > 0 && (
        <div><button type="button" disabled={envoi} onClick={creer} className={classeBouton.principal}>{envoi ? 'Création…' : 'Créer les offres dans Creem'}</button></div>
      )}
      {message && <p role={message.ok ? 'status' : 'alert'} className={`text-[13.5px] ${message.ok ? 'text-white/75' : 'text-red-300'}`}>{message.texte}</p>}
    </section>
  );
}

