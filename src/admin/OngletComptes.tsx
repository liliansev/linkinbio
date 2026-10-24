import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import type { ApiComptes, CompteResume, Reservation, SignalementResume } from '../lib/types.ts';
import { nomMotif } from '../lib/legal.ts';
import { cheminPage, sansSchema, urlPage } from '../lib/types.ts';
import type { Abonnement, DureeOfferte, EtatOffre, PlanPayant } from '../lib/abonnement.ts';
import { DUREES_OFFERTES, OFFRES, effetOffert, estResilie, euros, finOfferte, offerteAuDessus, offresAOffrir, rang } from '../lib/abonnement.ts';
import type { StatutCompte } from '../lib/comptes.ts';
import { NOMS_STATUTS, quand, statutCompte, trouve } from '../lib/comptes.ts';
import { Icone } from '../components/Icone.tsx';
import type { ElementMenu } from './ui.tsx';
import { ActionEntete, BoutonSecondaire, Champ, Feuille, Groupe, Ligne, Menu, Segments, SousPage, classeBadge, classeBouton, classeSaisie } from './ui.tsx';
import { nomApres } from './Facturation.tsx';
import { focusAuto } from '../lib/clavier';

/*
 * Les comptes, dans le back office de Lilian seulement (direction B, 20
 * octobre 2026). Trois onglets avec leur compte (Comptes, Liste d'attente,
 * Signalements), une recherche, puis un tableau : la page, l'e-mail, l'offre,
 * les vues sur 30 jours, la dernière connexion, le statut, et « … » pour les
 * gestes. « Inviter » s'ouvre dans une petite fenêtre. Au téléphone, le
 * tableau devient une liste.
 *
 * Un compte s'ouvre sur sa fiche (23 octobre 2026, demandé par Lilian : « tout
 * faire sur un compte ») : renvoyer son lien, lui offrir une offre ou la lui
 * retirer, résilier son abonnement, le suspendre, le supprimer. Les mêmes
 * gestes restent sous « … ».
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
const dateLongue = (ts: number) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(ts);
const voirPage = (pseudo: string) => window.open(cheminPage({ pseudo, principal: false }), '_blank', 'noopener');

/**
 * Une décision prise dans une petite fenêtre : suspendre ou supprimer un compte, résilier son abonnement, retirer
 * une offre offerte, traiter un signalement. `label` pose le champ du motif (ou du mot pour la personne) ; sans
 * lui, la fenêtre n'a que sa phrase et ses boutons. `danger` : effacer pour de bon, le bouton et la phrase en rouge.
 */
interface Decision {
  titre: string; bouton: string; label?: string; aide?: string; requis?: boolean; danger?: boolean; avertissement?: string;
  valider: (motif: string) => Promise<unknown>;
}

/** Ce qu'on peut faire d'un compte, selon son état : la fiche et le menu « … » en tirent leurs boutons. */
interface Gestes {
  voir: () => void;
  renvoyer?: () => Promise<void>;
  offrir?: () => void;
  retirer?: () => void;
  resilier?: () => void;
  suspendre?: () => void;
  reactiver?: () => void;
  supprimer: () => void;
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
  const [aOffrir, setAOffrir] = useState<CompteResume | null>(null);
  // La fiche ouverte, par l'id du compte : elle se relit avec la liste après chaque geste.
  const [fiche, setFiche] = useState<string | null>(null);
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

  // Revenir de la fiche rend le focus au compte qui l'a ouverte, dans le tableau ou dans la liste (celui qu'on voit).
  const ouvreur = useRef('');
  const ouvrirFiche = (c: CompteResume) => { ouvreur.current = c.id; setMessage(null); setFiche(c.id); scrollTo({ top: 0 }); };
  const fermerFiche = () => { setFiche(null); setMessage(null); };
  useEffect(() => {
    if (fiche || !ouvreur.current) return;
    const b = [...document.querySelectorAll<HTMLElement>(`[data-fiche="${CSS.escape(ouvreur.current)}"]`)].find(x => x.offsetParent);
    ouvreur.current = '';
    if (!b) return;
    b.focus({ preventScroll: true });
    b.scrollIntoView({ block: 'center' });
  }, [fiche]);
  const ouvert = fiche ? comptes?.find(c => c.id === fiche) : undefined;
  // Un compte supprimé depuis sa fiche la referme : le message reste, au-dessus de la liste.
  useEffect(() => { if (fiche && comptes && !comptes.some(c => c.id === fiche)) setFiche(null); }, [fiche, comptes]);

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

  const gestesDe = (c: CompteResume): Gestes => {
    const suspendu = c.statut === 'suspendu';
    const a = c.abonnement;
    const offerte = a.offerte;
    const paye = a.payee !== 'gratuit';
    return {
      voir: () => voirPage(c.pseudo),
      // Une page jamais ouverte reçoit de nouveau son premier e-mail, les autres un lien de connexion d'un jour.
      renvoyer: suspendu ? undefined : () => agir(() => api.renvoyer(c.id)),
      offrir: suspendu || !offresAOffrir(a).length ? undefined : () => setAOffrir(c),
      retirer: offerte ? () => setDecision({
        titre: `Retirer ${OFFRES[offerte.plan].nom} offert`, bouton: 'Retirer l’offre',
        // Sous l'abonnement, l'offre ne faisait que prendre sa suite : rien ne change aujourd'hui.
        avertissement: offerteAuDessus(a)
          ? `Sa page repasse tout de suite en ${OFFRES[a.payee].nom}, sans rien perdre de son contenu. Aucun e-mail ne part.`
          : `Son abonnement ${OFFRES[a.payee].nom} ne change pas${estResilie(a.statut) ? ' : à sa fin, sa page repassera en Gratuit' : ''}. Aucun e-mail ne part.`,
        valider: () => agir(() => api.retirerOffre(c.id)),
      }) : undefined,
      // Pour la fin de la période payée, comme « Repasser en Gratuit » : l'offre court jusque-là, puis plus rien n'est prélevé.
      resilier: paye && !estResilie(a.statut) ? () => setDecision({
        titre: `Résilier l’abonnement de ${c.pseudo}`, bouton: 'Résilier l’abonnement',
        label: 'Un mot pour la personne (facultatif)', aide: 'Il part dans l’e-mail qui la prévient.',
        avertissement: `Son abonnement ${OFFRES[a.payee].nom} s’arrête ${a.finPeriode ? `le ${dateLongue(a.finPeriode)}` : 'à la fin de la période payée'} : rien n’est prélevé ensuite, et sa page repasse en ${nomApres(a, a.finPeriode)}, sans rien perdre. Creem ne rembourse rien de lui-même.`,
        valider: mot => agir(() => api.resilier(c.id, mot)),
      }) : undefined,
      suspendre: suspendu ? undefined : () => setDecision({
        titre: `Suspendre ${c.pseudo}`, label: 'Motif de la suspension', requis: true, bouton: 'Suspendre et prévenir',
        aide: 'Envoyé à la personne par e-mail : les faits, la règle des CGU en cause. Elle peut contester en répondant.',
        valider: m => agir(async () => { await api.changerStatut(c.id, 'suspendu', m); return { ok: true, message: `${c.pseudo} est suspendu, la personne est prévenue.` }; }),
      }),
      reactiver: suspendu ? () => void agir(async () => { await api.changerStatut(c.id, 'actif', ''); return { ok: true, message: `${c.pseudo} est de nouveau en ligne.` }; }) : undefined,
      supprimer: () => setDecision({
        titre: `Supprimer ${c.pseudo}`, label: 'Motif de la suppression (facultatif)', requis: false, bouton: 'Supprimer définitivement', danger: true,
        aide: 'Laisse vide si la personne l’a demandé. Sinon, le motif lui est envoyé par e-mail.',
        // Un abonnement en cours est résilié d'abord, tout de suite : la phrase le dit à côté de ce qui s'efface.
        avertissement: !paye
          ? 'Sa page, ses liens, ses images et ses statistiques seront effacés. Rien ne se récupère.'
          : estResilie(a.statut)
            ? `Sa page, ses liens, ses images et ses statistiques seront effacés, et son abonnement ${OFFRES[a.payee].nom}, déjà résilié, s’arrête avec elle, sans remboursement automatique. Rien ne se récupère.`
            : `Sa page, ses liens, ses images et ses statistiques seront effacés, et son abonnement ${OFFRES[a.payee].nom} résilié tout de suite chez Creem, sans remboursement automatique. Rien ne se récupère.`,
        valider: m => agir(async () => {
          const r = await api.supprimer(c.id, m);
          // Creem n'a pas confirmé deux fois de suite : le compte est parti, l'abonnement reste à résilier à la main.
          if (r === 'a-la-main') return { ok: false, message: `${c.pseudo} est supprimé, mais Creem n’a pas confirmé la résiliation : résilie son abonnement à la main, les détails sont dans ta boîte mail.` };
          return { ok: true, message: r === 'faite' ? `${c.pseudo} est supprimé, son abonnement résilié chez Creem.` : `${c.pseudo} est supprimé.` };
        }),
      }),
    };
  };

  /** Le menu « … » d'un compte : les gestes de sa fiche, dans le même ordre. */
  const menuDe = (g: Gestes): ElementMenu[] => [
    { nom: 'Voir sa page', icone: 'ui-ouvrir', action: g.voir },
    ...(g.renvoyer ? [{ nom: 'Renvoyer son lien', icone: 'ui-fleche', action: () => void g.renvoyer?.() }] : []),
    ...(g.offrir ? [{ nom: 'Offrir une offre…', icone: 'ui-monter', action: g.offrir }] : []),
    ...(g.retirer ? [{ nom: 'Retirer l’offre offerte…', icone: 'ui-descendre', action: g.retirer }] : []),
    ...(g.resilier ? [{ nom: 'Résilier l’abonnement…', icone: 'ui-aucun', action: g.resilier }] : []),
    ...(g.reactiver ? [{ nom: 'Réactiver', icone: 'ui-oeil', action: g.reactiver }] : g.suspendre ? [{ nom: 'Suspendre…', icone: 'ui-masque', action: g.suspendre }] : []),
    { nom: 'Supprimer…', icone: 'ui-corbeille', danger: true, action: g.supprimer },
  ];

  // Toute la rangée ouvre la fiche, sauf ses boutons (le nom, « … ») qui font leur propre geste.
  const surRangee = (c: CompteResume) => (e: MouseEvent) => { if (!(e.target as Element).closest('button, a, [role=menu]')) ouvrirFiche(c); };

  const comptesVus = (comptes ?? []).filter(c => trouve(recherche, c.pseudo, c.email));
  const attenteVue = (attente ?? []).filter(r => trouve(recherche, r.pseudo, r.email));
  const signalementsVus = (signalements ?? []).filter(s => trouve(recherche, s.pseudo, nomMotif(s.motif)));
  const rien = (quoi: string) => <p className="py-6 text-[14px] text-white/60">{recherche.trim() ? `Aucun ${quoi} ne correspond à « ${recherche.trim()} ».` : ''}</p>;

  return (
    <div className="adm-comptes flex flex-col gap-4 lg:gap-0">
      {ouvert ? (
        <FicheCompte compte={ouvert} statut={statutCompte(ouvert, signalements ?? [])} gestes={gestesDe(ouvert)} fermer={fermerFiche}
          message={message && <Bandeau message={message} fermer={() => setMessage(null)} />} />
      ) : (
        <>
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
                            <tr key={c.id} onClick={c.principal ? undefined : surRangee(c)} data-ouvrable={c.principal ? undefined : ''}>
                              <td>
                                {c.principal ? <NomCompte compte={c} avatar={avatar} /> : (
                                  <button type="button" data-fiche={c.id} onClick={() => ouvrirFiche(c)} className="adm-nom-compte" aria-label={`${c.pseudo}, ouvrir sa fiche`}>
                                    <NomCompte compte={c} />
                                  </button>
                                )}
                              </td>
                              <td className="adm-gris" title={c.email}>{c.email}</td>
                              <td className="text-[#3d3d39]">{c.principal ? 'Principal' : <Offre compte={c} />}</td>
                              <td className="adm-nombre">{nombre(c.vues)}</td>
                              <td className="adm-gris">{quand(c.connexion)}</td>
                              <td><Statut statut={statut} /></td>
                              <td>{!c.principal && <MenuGestes nom={c.pseudo} elements={menuDe(gestesDe(c))} />}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <ul className="adm-liste-comptes lg:hidden">
                      {comptesVus.map(c => {
                        const statut = statutCompte(c, signalements ?? []);
                        const corps = (
                          <>
                            <Pastille pseudo={c.pseudo} avatar={c.principal ? avatar : undefined} />
                            <div className="min-w-0 flex-1">
                              <p className="flex items-center gap-2 text-[15px] font-medium"><span className="truncate">{c.pseudo}</span>{c.principal ? <span className={classeBadge}>Toi</span> : c.plan !== 'gratuit' && <Offre compte={c} />}</p>
                              <p className="truncate text-[13px] text-white/60">{c.email}</p>
                              <p className="text-[13px] text-white/60">{c.principal ? 'Principal · ' : c.plan === 'gratuit' ? 'Gratuit · ' : ''}{nombre(c.vues)} vue{c.vues > 1 ? 's' : ''} en 30&#8239;j · {quand(c.connexion)}</p>
                              {statut !== 'actif' && <p className="mt-0.5 text-[13px]"><Statut statut={statut} /></p>}
                            </div>
                          </>
                        );
                        return (
                          <li key={c.id}>
                            {c.principal ? corps : <button type="button" data-fiche={c.id} onClick={() => ouvrirFiche(c)} className="adm-compte-ouvrir">{corps}</button>}
                            {!c.principal && <MenuGestes nom={c.pseudo} elements={menuDe(gestesDe(c))} />}
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
        </>
      )}

      <Feuille petite ouverte={inviter} onFermer={() => setInviter(false)} titre="Inviter quelqu’un">
        {fermer => <FormInviter inviter={(email, pseudo) => api.inviter(email, pseudo)} fini={r => fermer(() => { setInviter(false); setMessage({ ok: true, texte: r.message, lienDev: r.lienDev }); void toutRecharger(); })} />}
      </Feuille>

      <Feuille petite ouverte={!!decision} onFermer={() => setDecision(null)} titre={decision?.titre ?? ''}>
        {fermer => decision && <FormMotif decision={decision} annuler={() => fermer()} fini={() => fermer(() => setDecision(null))} />}
      </Feuille>

      <Feuille petite ouverte={!!aOffrir} onFermer={() => setAOffrir(null)} titre={aOffrir ? `Offrir une offre à ${aOffrir.pseudo}` : ''}>
        {fermer => aOffrir && (
          <FormOffrir compte={aOffrir} annuler={() => fermer()} fini={() => fermer(() => setAOffrir(null))}
            offrir={(plan, duree, mot) => agir(() => api.offrir(aOffrir.id, plan, duree, mot))} />
        )}
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

/** L'abonnement Creem d'un compte, en une ligne : l'offre, sa période, puis où il en est. */
function enMots(a: Abonnement): string {
  const nom = `${OFFRES[a.payee].nom}${a.periode ? `, ${a.periode === 'an' ? 'annuel' : 'mensuel'}` : ''}`;
  if (a.statut === 'past_due') return `${nom} · paiement en retard`;
  if (estResilie(a.statut)) return `${nom} · résilié${a.finPeriode ? `, s’arrête le ${dateCourte(a.finPeriode)}` : ''}`;
  return a.finPeriode ? `${nom} · prochaine échéance le ${dateCourte(a.finPeriode)}` : nom;
}

/**
 * La fiche d'un compte : une sous-page de Comptes, le fil « Comptes / pseudo » dans l'en-tête, en lignes comme
 * Réglages. Sa page, son compte et son lien, son offre (celle qu'il a, celle qu'on lui offre, son abonnement),
 * puis la modération. Ce qui change quelque chose pour la personne s'ouvre dans une petite fenêtre qui le dit
 * avant de le faire ; renvoyer son lien part d'un toucher.
 */
function FicheCompte({ compte: c, statut, gestes, fermer, message }: { compte: CompteResume; statut: StatutCompte; gestes: Gestes; fermer: () => void; message: ReactNode }) {
  const [envoi, setEnvoi] = useState(false);
  const a = c.abonnement;
  const offerte = a.offerte;
  async function renvoyer() {
    if (!gestes.renvoyer) return;
    setEnvoi(true);
    await gestes.renvoyer();
    setEnvoi(false);
  }
  return (
    <div className="adm-reglages lg:pt-7">
      <SousPage nom={c.pseudo} retour={fermer} />
      {message}
      <Groupe titre="Page">
        <Ligne nom="Adresse" valeur={<span translate="no">{sansSchema(urlPage(c))}</span>}>
          <BoutonSecondaire onClick={gestes.voir}>Voir sa page<Icone nom="ui-ouvrir" taille={14} className="shrink-0" /></BoutonSecondaire>
        </Ligne>
        <Ligne nom="Activité" valeur={`${nombre(c.blocs)} bloc${c.blocs > 1 ? 's' : ''} · ${nombre(c.vues)} vue${c.vues > 1 ? 's' : ''} en 30 j`} />
      </Groupe>

      <Groupe titre="Compte">
        <Ligne nom="E-mail" valeur={c.email} />
        <Ligne nom="Créé le" valeur={dateLongue(c.cree)} />
        <Ligne nom="Dernière connexion" valeur={quand(c.connexion)}>
          {gestes.renvoyer && <BoutonSecondaire onClick={renvoyer} disabled={envoi}>{envoi ? 'Envoi…' : 'Renvoyer son lien'}</BoutonSecondaire>}
        </Ligne>
      </Groupe>

      <Groupe titre="Offre">
        {/* Payée sans rien d'offert, l'abonnement dit déjà l'offre : une seule ligne, pas « Pro » deux fois. */}
        {(a.payee === 'gratuit' || offerte) ? (
          <Ligne nom="Actuelle" valeur={<Offre compte={c} />}>
            {gestes.offrir && <BoutonSecondaire onClick={gestes.offrir} aria-haspopup="dialog">Offrir une offre</BoutonSecondaire>}
          </Ligne>
        ) : gestes.offrir && (
          <Ligne nom="Offrir une offre">
            <BoutonSecondaire onClick={gestes.offrir} aria-haspopup="dialog">Offrir</BoutonSecondaire>
          </Ligne>
        )}
        {offerte && (
          <Ligne nom="Offerte" valeur={`${OFFRES[offerte.plan].nom}, ${offerteAuDessus(a) ? '' : 'après l’abonnement, '}${offerte.jusqu ? `jusqu’au ${dateLongue(offerte.jusqu)}` : 'sans fin'}`}>
            {gestes.retirer && <BoutonSecondaire onClick={gestes.retirer} aria-haspopup="dialog">Retirer</BoutonSecondaire>}
          </Ligne>
        )}
        {a.payee !== 'gratuit' && (
          <Ligne nom="Abonnement" valeur={enMots(a)}>
            {gestes.resilier && <BoutonSecondaire onClick={gestes.resilier} aria-haspopup="dialog">Résilier</BoutonSecondaire>}
          </Ligne>
        )}
      </Groupe>

      <Groupe titre="Modération">
        <Ligne nom="Statut" valeur={<Statut statut={statut} />}>
          {gestes.reactiver
            ? <BoutonSecondaire onClick={gestes.reactiver}>Réactiver</BoutonSecondaire>
            : gestes.suspendre && <BoutonSecondaire onClick={gestes.suspendre} aria-haspopup="dialog">Suspendre</BoutonSecondaire>}
        </Ligne>
        <Ligne nom="Supprimer le compte">
          <BoutonSecondaire onClick={gestes.supprimer} aria-haspopup="dialog" className="!text-red-300">Supprimer</BoutonSecondaire>
        </Ligne>
      </Groupe>
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

/**
 * L'offre d'un compte : une étiquette aux couleurs de l'offre quand elle est payante, le mot seul pour Gratuit.
 * Une offre offerte qui passe devant l'abonnement le dit à côté : « offert ».
 */
function Offre({ compte }: { compte: Pick<CompteResume, 'plan' | 'abonnement'> }) {
  const plan = compte.plan;
  if (plan === 'gratuit') return <>{OFFRES.gratuit.nom}</>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={classeBadge} data-offre={plan}>{OFFRES[plan].nom}</span>
      {offerteAuDessus(compte.abonnement) && <span className="text-[12.5px] font-normal text-white/60">offert</span>}
    </span>
  );
}

function NomCompte({ compte, avatar }: { compte: CompteResume; avatar?: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Pastille pseudo={compte.pseudo} avatar={compte.principal ? avatar : undefined} />
      <span className="adm-nom-texte truncate font-medium" translate="no">{compte.pseudo}</span>
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
      {decision.label && (
        <Champ label={decision.label} aide={decision.aide}>
          <textarea autoFocus={focusAuto()} className={`${classeSaisie} min-h-24`} value={motif} maxLength={2000} required={decision.requis} onChange={e => setMotif(e.target.value)} />
        </Champ>
      )}
      {decision.avertissement && <p className={`text-[13.5px] leading-snug ${decision.danger ? 'font-medium text-red-300' : 'text-white/75'}`}>{decision.avertissement}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={annuler} className={classeBouton.discret}>Annuler</button>
        <button type="submit" disabled={envoi || (decision.requis && !motif.trim())} className={decision.danger ? classeBouton.danger : classeBouton.principal}>{envoi ? 'Envoi…' : decision.bouton}</button>
      </div>
    </form>
  );
}

/**
 * Offrir une offre à un compte, sans paiement : l'offre quand il y a le choix, la durée, un mot pour la personne.
 * La phrase du bas dit ce qui va se passer avant le geste : tout de suite, ou après un abonnement résilié, sans rien
 * payer, ce que l'offre remplace, l'abonnement qui continue d'être prélevé. Une offre qui ne donnerait rien ne part pas.
 */
function FormOffrir({ compte: c, offrir, annuler, fini }: { compte: CompteResume; offrir: (plan: PlanPayant, duree: DureeOfferte, mot: string) => Promise<void>; annuler: () => void; fini: () => void }) {
  const a = c.abonnement;
  const choix = offresAOffrir(a);
  // L'offre juste au-dessus de celle qu'il a, d'abord ; la plus haute s'il l'a déjà (offerte, ou payée jusqu'à une résiliation).
  const [plan, setPlan] = useState<PlanPayant>(() => choix.find(p => rang(p) > rang(c.plan)) ?? choix[choix.length - 1]);
  const [duree, setDuree] = useState<DureeOfferte>('1m');
  const [mot, setMot] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const jusqu = finOfferte(Date.now(), duree);
  const effet = effetOffert(a, plan, jusqu);
  const nom = OFFRES[plan].nom;
  const paye = OFFRES[a.payee].nom;
  const pendant = jusqu ? `jusqu’au ${dateLongue(jusqu)}` : 'sans limite de durée';
  const resume = !effet
    ? `Son abonnement ${paye} court jusqu’au ${a.finPeriode ? dateLongue(a.finPeriode) : 'bout de la période payée'} : une offre qui finit avant ne lui donnerait rien. Choisis une durée plus longue.`
    : [
      effet === 'maintenant'
        ? `${c.pseudo} a ${nom} tout de suite, ${pendant}, sans rien payer. Un e-mail le lui dit.`
        : `Son abonnement ${paye} s’arrête ${a.finPeriode ? `le ${dateLongue(a.finPeriode)}` : 'à la fin de la période payée'} : ensuite, ${c.pseudo} ${plan === a.payee ? 'garde' : 'passe en'} ${nom}, ${pendant}, sans rien payer. Un e-mail le lui dit.`,
      a.offerte ? `Cette offre remplace ${OFFRES[a.offerte.plan].nom} offert${a.offerte.jusqu ? ` jusqu’au ${dateLongue(a.offerte.jusqu)}` : ''}.` : '',
      a.payee !== 'gratuit' && !estResilie(a.statut) ? `Son abonnement ${paye} continue d’être prélevé : le résilier est un autre geste.` : '',
    ].filter(Boolean).join(' ');
  const titre = 'mb-1.5 block text-[12.5px] font-medium text-white/60 bureau:text-white/75';
  async function valider(e: FormEvent) {
    e.preventDefault();
    if (!effet) return;
    setEnvoi(true);
    await offrir(plan, duree, mot.trim());
    fini();
  }
  return (
    <form onSubmit={valider} className="flex flex-col gap-4 pb-1">
      {choix.length > 1 && (
        <div>
          <span className={titre} aria-hidden="true">Offre</span>
          <Segments label="Offre" valeur={plan} options={choix.map(p => ({ id: p, nom: OFFRES[p].nom }))} onChange={setPlan} />
        </div>
      )}
      <div>
        <span className={titre} aria-hidden="true">Durée</span>
        <Segments label="Durée" valeur={duree} options={DUREES_OFFERTES.map(d => ({ id: d.id, nom: d.nom }))} onChange={setDuree} />
      </div>
      <Champ label="Un mot pour la personne (facultatif)" aide="Il part dans l’e-mail qui la prévient.">
        <textarea className={`${classeSaisie} min-h-20`} value={mot} maxLength={2000} onChange={e => setMot(e.target.value)} />
      </Champ>
      <p className="text-[13.5px] leading-snug text-white/75" aria-live="polite">{resume}</p>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={annuler} className={classeBouton.discret}>Annuler</button>
        <button type="submit" disabled={envoi || !effet} className={classeBouton.principal}>{envoi ? 'Envoi…' : `Offrir ${nom}`}</button>
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

