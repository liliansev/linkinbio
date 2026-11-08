import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import type { Abonnement as EtatAbonnement, Fonction, Periode, Plan, PlanPayant } from '../lib/abonnement.ts';
import { FONCTIONS, FONCTIONS_EN_MOTS, OFFRES, PLANS, PLAN_ESSAI, apresAbonnement, avantage, planHorsEssai, avantagesEntre, echeance, economieAnnuelle, estResilie, euros, moisOfferts, nomOffre, offerteAuDessus, pourQuoi, rang, sensDuChangement } from '../lib/abonnement.ts';
import { choix as choixLangue, useLangue } from '../accueil/langue.ts';
import type { Choix as ChoixLangue } from '../accueil/langue.ts';
import type { Langue } from '../lib/types.ts';
import type { Achat, EtapeRetour, NoteAchat, SuiteAchat } from '../lib/achat.ts';
import { CLE_ACHAT } from '../lib/achat.ts';
import type { PagePublique } from '../lib/types.ts';
import { CONTACT_LEGAL } from '../lib/legal.ts';
import { PageLiens } from '../components/PageLiens.tsx';
import { Icone } from '../components/Icone.tsx';
import { Feuille, classeBouton, flechesRadio, useGrandEcran, vibrer } from './ui.tsx';

/*
 * Le parcours d'achat (direction B, 20 octobre 2026). D'une fonction réservée,
 * des stats ou de Réglages, les offres s'ouvrent dans une fenêtre par-dessus
 * l'écran en cours : les quatre côte à côte au bureau, une à la fois sous des
 * onglets au téléphone, Mensuel ou Annuel, et celle qui débloque la fonction
 * demandée mise en avant. Choisir mène au récapitulatif (ce qu'on paie
 * aujourd'hui, la prochaine échéance, ce qu'on débloque, et au bureau la page
 * telle qu'elle sera), puis chez Creem. Au retour, `RetourPaiement` dit où en
 * est l'offre : elle n'arrive qu'avec le webhook signé, jamais par l'adresse.
 * Un abonné repasse en Gratuit depuis la même fenêtre (`RepasserGratuit`) :
 * l'abonnement est résilié pour la fin de la période payée, sans quitter Hopla.
 * Une offre offerte depuis Comptes (23 octobre 2026) se lit sur sa carte, avec
 * sa fin ; celles du dessous y sont comprises, celles du dessus s'achètent.
 */

const loc = (l: Langue) => (l === 'fr' ? 'fr-FR' : 'en-US');
const dateLongue = (ms: number, l: Langue) => new Date(ms).toLocaleDateString(loc(l), { day: 'numeric', month: 'long', year: 'numeric' });
const dateCourte = (ms: number, l: Langue) => new Date(ms).toLocaleDateString(loc(l), { day: 'numeric', month: 'short' });
const par = (p: Periode, l: Langue) => (l === 'fr' ? (p === 'an' ? 'par an' : 'par mois') : (p === 'an' ? 'per year' : 'per month'));
/** Les mots d'un écran des offres dans la langue du compte : dates, prix, noms d'offre. */
function useMots() {
  const L = useLangue();
  const tr: ChoixLangue = choixLangue(L);
  return {
    L, tr,
    dl: (ms: number) => dateLongue(ms, L), dc: (ms: number) => dateCourte(ms, L), pr: (p: Periode) => par(p, L),
    eu: (n: number) => euros(n, L), nm: (p: Plan) => nomOffre(p, L), av: (a: string) => avantage(a, L),
  };
}
const reduit = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Ce que la carte d'une offre propose : un bouton, ou un simple état (l'offre en cours, bientôt). */
type Geste = { bouton: true; texte: string; plan: Plan } | { bouton: false; texte: string };
/** L'étiquette d'une carte : `fort`, l'offre qui débloque la fonction d'où l'on vient (en bleu). */
type Badge = { texte: string; fort?: boolean };

interface ProprietesOffres {
  onFermer: () => void;
  abonnement: EtatAbonnement;
  /** Les offres qu'on peut acheter maintenant (un produit Creem pour chaque période). */
  enVente: PlanPayant[];
  /** La fonction réservée d'où l'on vient : son offre est mise en avant, sa ligne en gras. */
  pour?: Fonction;
  /** Sans fonction, l'offre à mettre en avant quand on la connaît (un an de stats : Pro). */
  vers?: PlanPayant;
  /** Ce à quoi l'on revient après l'achat (le bloc d'où l'on vient, le bloc de la vitrine qu'on voulait) : noté pour le retour de Creem. */
  apresAchat?: SuiteAchat;
  ouvrirPaiement: (plan: PlanPayant, periode: Periode) => Promise<string>;
  /** Avant de partir chez Creem : ce qui attend d'être écrit (un bloc ouvert, le design) part d'abord. */
  avantDePartir?: () => Promise<void>;
  /** La page telle qu'elle sera avec une offre, montrée au bureau dans le récapitulatif. */
  apercu?: (plan: PlanPayant) => PagePublique;
  /** Repasser en Gratuit : résilie l'abonnement pour la fin de la période payée. Absent, la carte Gratuit ne le propose pas. */
  resilier?: () => Promise<void>;
  /** Le portail de Creem, si Hopla ne peut pas résilier lui-même. */
  ouvrirPortail?: () => Promise<string>;
  /** Ouvrir directement sur « Repasser en Gratuit » (depuis « Résilier mon abonnement »). */
  resiliation?: boolean;
}

export function FenetreOffres({ onFermer, abonnement, enVente, pour, vers, apresAchat, ouvrirPaiement, avantDePartir, apercu, resilier, ouvrirPortail, resiliation }: ProprietesOffres) {
  const { L, tr, dl, dc, nm } = useMots();
  const grand = useGrandEcran();
  // L'offre de la page hors essai (une offre offerte peut passer devant l'abonnement), et celle qu'on paie, que Creem change
  // ou résilie. L'essai de Pro ne s'achète ni ne se résilie : pendant qu'il court, toutes les offres se prennent.
  const actuelle = planHorsEssai(abonnement);
  const essai = abonnement.essai ?? null;
  const payee = abonnement.payee;
  const paye = payee !== 'gratuit';
  const resilie = paye && estResilie(abonnement.statut);
  const offerte = offerteAuDessus(abonnement);
  // Une offre offerte qui court après un abonnement résilié prend sa suite : sa carte et la note le disent.
  const suite = resilie && !offerte && abonnement.offerte && apresAbonnement(abonnement, abonnement.finPeriode) !== 'gratuit' ? abonnement.offerte : null;
  const offerteVue = offerte ?? suite;
  const [periode, setPeriode] = useState<Periode>(abonnement.periode ?? 'an');
  const [choix, setChoix] = useState<Plan | null>(resiliation && resilier && paye && !resilie ? 'gratuit' : null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const idTitre = useId();

  const vendable = (p: Plan): p is PlanPayant => p !== 'gratuit' && OFFRES[p].enVente && enVente.includes(p);
  const cible: Plan | null = pour ? FONCTIONS[pour] : vers ?? null;
  // Sans fonction demandée, l'offre juste au-dessus de la sienne passe devant.
  const miseEnAvant: Plan | null = cible ?? (resilie ? null : PLANS.find(p => rang(p) > rang(actuelle) && vendable(p)) ?? null);
  // Les mois offerts de l'annuel, les moins généreux des offres en vente ; aucune en vente, la bascule n'en promet pas.
  const enVenteIci = PLANS.filter(vendable);
  const mois = enVenteIci.length ? Math.min(...enVenteIci.map(p => moisOfferts(p))) : 0;

  function geste(p: Plan): Geste {
    if (p === 'gratuit') {
      if (paye && !resilie) return resilier ? { bouton: true, texte: tr('Repasser en Gratuit', 'Switch to Free'), plan: 'gratuit' } : { bouton: false, texte: tr('Comprise dans ton offre', 'Included in your plan') };
      if (!paye && !offerteVue) return essai ? { bouton: false, texte: tr(`Dès le ${dc(essai)}`, `From ${dc(essai)}`) } : { bouton: false, texte: tr('Ton offre actuelle', 'Your current plan') };
      // Gratuit vient après l'abonnement résilié et l'offre offerte, la plus lointaine des deux ; jamais après une offre sans fin.
      if (offerteVue && offerteVue.jusqu === null) return { bouton: false, texte: tr('Comprise dans ton offre', 'Included in your plan') };
      const fin = Math.max(resilie ? abonnement.finPeriode ?? 0 : 0, offerteVue?.jusqu ?? 0);
      return { bouton: false, texte: fin ? tr(`Dès le ${dc(fin)}`, `From ${dc(fin)}`) : tr('À la fin de ton offre', 'When your plan ends') };
    }
    // L'offre offerte ne s'achète pas : sa carte dit jusqu'à quand. Celles du dessous y sont comprises, sauf celle qu'on paie.
    if (offerte?.plan === p) return { bouton: false, texte: offerte.jusqu ? tr(`Offert jusqu’au ${dc(offerte.jusqu)}`, `Free until ${dc(offerte.jusqu)}`) : tr('Offert sans limite', 'Free, no end date') };
    if (suite?.plan === p && p !== payee && abonnement.finPeriode) return { bouton: false, texte: tr(`Offert dès le ${dc(abonnement.finPeriode)}`, `Free from ${dc(abonnement.finPeriode)}`) };
    if (offerte && rang(p) < rang(offerte.plan) && p !== payee) return { bouton: false, texte: tr('Comprise dans ton offre', 'Included in your plan') };
    if (!vendable(p)) return { bouton: false, texte: tr('Bientôt disponible', 'Coming soon') };
    if (p === payee && (!abonnement.periode || abonnement.periode === periode)) return { bouton: false, texte: offerte ? tr('Ton abonnement', 'Your subscription') : tr('Ton offre actuelle', 'Your current plan') };
    // Une offre résiliée court jusqu'à sa fin : on en reprend une ensuite.
    if (resilie) return { bouton: false, texte: abonnement.finPeriode ? tr(`Après le ${dc(abonnement.finPeriode)}`, `After ${dc(abonnement.finPeriode)}`) : tr('Après ta résiliation', 'After your cancellation') };
    if (p === payee) return { bouton: true, texte: periode === 'an' ? tr('Passer à l’annuel', 'Switch to yearly') : tr('Passer au mensuel', 'Switch to monthly'), plan: p };
    return { bouton: true, texte: tr(`Passer en ${nm(p)}`, `Upgrade to ${nm(p)}`), plan: p };
  }
  // Une seule étiquette, celle de l'offre qui débloque la fonction d'où l'on vient : « Ton offre » et « Bientôt » redisaient
  // le bouton (« Ton offre actuelle », « Bientôt disponible »), retirés le 24 octobre 2026 (critique série 2).
  const badge = (p: Plan): Badge | null => (pour && p === FONCTIONS[pour] ? { texte: pourQuoi(pour, L), fort: true } : null);
  const offert = offerteVue ? tr(`${nm(offerteVue.plan)} t’est offert${offerteVue.jusqu ? ` jusqu’au ${dl(offerteVue.jusqu)}` : ''}`, `${nm(offerteVue.plan)} is free for you${offerteVue.jusqu ? ` until ${dl(offerteVue.jusqu)}` : ''}`) : '';
  const note = resilie && abonnement.finPeriode
    ? tr(`Ton offre ${nm(payee)} s’arrête le ${dl(abonnement.finPeriode)}${offert ? `, et ${offert}.` : ' : tu pourras en prendre une autre ensuite.'}`, `Your ${nm(payee)} plan ends on ${dl(abonnement.finPeriode)}${offert ? `, and ${offert}.` : ': you can pick another one after that.'}`)
    : offert ? tr(`${offert}. Prix TTC, paiement chez Creem.`, `${offert}. Prices include tax, payment with Creem.`)
      : essai ? tr(`Ton essai ${nm(PLAN_ESSAI)} court jusqu’au ${dl(essai)}, puis ta page passe en ${nm(actuelle)}. Prix TTC, paiement chez Creem.`, `Your ${nm(PLAN_ESSAI)} trial runs until ${dl(essai)}, then your page moves to ${nm(actuelle)}. Prices include tax, payment with Creem.`)
        : tr('Prix TTC. Paiement sécurisé chez Creem, résiliable à tout moment.', 'Prices include tax. Secure payment with Creem, cancel anytime.');

  // Revenir aux offres rend le focus au bouton de l'offre choisie ; entrer dans le récapitulatif le pose sur son titre.
  const dernierChoix = useRef<Plan | null>(null);
  useEffect(() => {
    if (choix) { dernierChoix.current = choix; document.getElementById(`${idTitre}-recap`)?.focus({ preventScroll: true }); return; }
    if (dernierChoix.current) document.getElementById(`${idTitre}-${dernierChoix.current}-geste`)?.focus({ preventScroll: true });
  }, [choix, idTitre]);

  function choisir(p: Plan) { vibrer(6); setErreur(''); setChoix(p); }
  // Revenue de Creem par le bouton retour du navigateur, la page sort du cache telle qu'on l'avait quittée : le bouton de
  // paiement se relâche, au lieu de dire « Ouverture du paiement… » pour toujours.
  useEffect(() => {
    const revenu = (e: PageTransitionEvent) => { if (e.persisted) setEnvoi(false); };
    addEventListener('pageshow', revenu);
    return () => removeEventListener('pageshow', revenu);
  }, []);

  async function payer() {
    if (!choix || choix === 'gratuit') return;
    setEnvoi(true);
    setErreur('');
    try {
      await avantDePartir?.();
      const url = await ouvrirPaiement(choix, periode);
      // De quoi dire au retour ce qui vient de s'ouvrir. Rien n'est accordé d'après cette note.
      const n: NoteAchat = { plan: choix, periode, ...(pour ? { pour } : {}), avant: payee, ...(abonnement.periode ? { periodeAvant: abonnement.periode } : {}), ...(offerte ? { deja: offerte.plan } : essai ? { deja: PLAN_ESSAI } : {}), ...apresAchat, ts: Date.now() };
      try { sessionStorage.setItem(CLE_ACHAT, JSON.stringify(n)); } catch { /* onglet privé : le retour dira seulement l'offre */ }
      location.href = url;
      return;
    } catch (error) { setErreur((error as Error).message || tr('Le paiement ne répond pas. Réessaie dans un instant.', 'Payment is not responding. Try again in a moment.')); }
    setEnvoi(false);
  }

  return (
    <Feuille ouverte large nue titre={choix === 'gratuit' ? tr('Repasser en Gratuit', 'Switch to Free') : choix ? tr(`Passer en ${nm(choix)}`, `Upgrade to ${nm(choix)}`) : tr('Les offres', 'Plans')} onFermer={onFermer}>
      {fermer => choix === 'gratuit' && resilier ? (
        <RepasserGratuit abonnement={abonnement} grand={grand} id={idTitre} retour={() => setChoix(null)} fermer={() => fermer()} resilier={resilier} ouvrirPortail={abonnement.portail ? ouvrirPortail : undefined} />
      ) : choix && choix !== 'gratuit' ? (
        <Recapitulatif plan={choix} periode={periode} setPeriode={setPeriode} abonnement={abonnement} grand={grand} id={idTitre} mois={moisOfferts(choix)}
          retour={() => setChoix(null)} fermer={() => fermer()} payer={payer} envoi={envoi} erreur={erreur} apercu={apercu} />
      ) : (
        <div className="adm-offres" aria-labelledby={idTitre}>
          <header className="adm-offres-tete">
            <h2 id={idTitre} className="adm-offres-titre">{tr('Les offres', 'Plans')}</h2>
            {grand && <span className="flex-1" />}
            {grand && mois > 0 && <span className="adm-offres-badge" data-gain>{tr(`${mois} mois offerts`, `${mois} months free`)}</span>}
            {grand && <Periodes periode={periode} onChange={setPeriode} />}
            <button type="button" onClick={() => fermer()} className={`${classeBouton.icone} ml-auto lg:ml-1.5`} aria-label={tr('Fermer', 'Close')}><Icone nom="ui-fermer" taille={18} /></button>
          </header>
          {grand ? (
            <div className="adm-offres-corps">
              <div className="adm-offres-grille">
                {PLANS.map(p => (
                  <CarteOffre key={p} id={`${idTitre}-${p}`} plan={p} periode={periode} badge={badge(p)} mis={p === miseEnAvant} pour={pour}
                    geste={geste(p)} onChoisir={choisir} />
                ))}
              </div>
              <p className="adm-offres-note">{note}</p>
            </div>
          ) : (
            <OffresMobile id={idTitre} periode={periode} setPeriode={setPeriode} mois={mois} depart={miseEnAvant ?? actuelle}
              carte={(p, mis) => <CarteOffre id={`${idTitre}-${p}`} plan={p} periode={periode} badge={badge(p)} mis={mis} pour={pour} panneau />}
              miseEnAvant={miseEnAvant} geste={geste} onChoisir={choisir} note={resilie || offerteVue || essai ? note : tr('Prix TTC, paiement chez Creem.', 'Prices include tax, payment with Creem.')} />
          )}
        </div>
      )}
    </Feuille>
  );
}

/** Mensuel ou Annuel : un seul arrêt de tabulation, les flèches passent de l'un à l'autre. */
function Periodes({ periode, onChange, mois = 0 }: { periode: Periode; onChange: (p: Periode) => void; mois?: number }) {
  const { tr } = useMots();
  return (
    <div role="radiogroup" aria-label={tr('Paiement', 'Billing')} onKeyDown={e => flechesRadio(e)} className="adm-offres-periodes">
      {(['mois', 'an'] as Periode[]).map(p => (
        <button key={p} type="button" role="radio" aria-checked={periode === p} tabIndex={periode === p ? 0 : -1} onClick={() => { vibrer(4); onChange(p); }}>
          {p === 'an' ? tr('Annuel', 'Yearly') : tr('Mensuel', 'Monthly')}
          {p === 'an' && mois > 0 && <span className="adm-offres-badge" data-gain>{tr(`${mois} mois offerts`, `${mois} months free`)}</span>}
        </button>
      ))}
    </div>
  );
}

/** Le prix d'une offre : à l'année, l'économie réelle en euros ; au mois, le prix de l'année à côté. */
function Tarif({ plan, periode }: { plan: Plan; periode: Periode }) {
  const { tr, pr, eu } = useMots();
  if (plan === 'gratuit') return (
    <div className="adm-offre-tarif">
      <p><span className="adm-offre-prix">{eu(0)}</span></p>
      <p className="adm-offre-sous">{tr('pour toujours', 'forever')}</p>
    </div>
  );
  const o = OFFRES[plan];
  return (
    <div className="adm-offre-tarif">
      <p><span className="adm-offre-prix">{eu(o.prix[periode])}</span><span className="adm-offre-unite">{pr(periode)}</span></p>
      {/* À l'année, l'économie en euros, une fois : les mois offerts sont déjà dits par la bascule (24 octobre 2026). */}
      {periode === 'an'
        ? <p className="adm-offre-gain">{tr(`${eu(economieAnnuelle(plan))} d’économie`, `Save ${eu(economieAnnuelle(plan))}`)}</p>
        : <p className="adm-offre-sous">{tr(`ou ${eu(o.prix.an)} par an`, `or ${eu(o.prix.an)} per year`)}</p>}
    </div>
  );
}

function CarteOffre({ id, plan, periode, badge, mis, pour, geste, onChoisir, panneau = false }: {
  id: string; plan: Plan; periode: Periode; badge: Badge | null; mis: boolean; pour?: Fonction;
  geste?: Geste; onChoisir?: (p: Plan) => void; panneau?: boolean;
}) {
  const { tr, nm, av } = useMots();
  const o = OFFRES[plan];
  const fort = pour ? FONCTIONS_EN_MOTS[pour].avantage : '';
  return (
    <section id={id} role={panneau ? 'tabpanel' : undefined} aria-labelledby={`${id}-nom`} className="adm-offre" data-mis={mis || undefined}>
      <div className="adm-offre-tete">
        <h3 id={`${id}-nom`} className="adm-offre-nom">{nm(plan)}</h3>
        {badge && <span className="adm-offres-badge" data-fort={badge.fort || undefined}>{badge.texte}</span>}
      </div>
      <Tarif plan={plan} periode={periode} />
      {geste && (geste.bouton
        ? <button id={`${id}-geste`} type="button" onClick={() => onChoisir?.(geste.plan)} className={`${mis ? classeBouton.principal : classeBouton.secondaire} w-full`}>{geste.texte}</button>
        : <p id={`${id}-geste`} tabIndex={-1} className="adm-offre-etat">{geste.texte}</p>)}
      <div>
        <p className="adm-offre-inclus">{plan === 'gratuit' ? tr('Inclus :', 'Includes:') : tr(`Tout ${nm(PLANS[rang(plan) - 1])}, et :`, `Everything in ${nm(PLANS[rang(plan) - 1])}, plus:`)}</p>
        <ul className="adm-offre-liste">
          {o.avantages.map(a => (
            <li key={a} data-fort={a === fort || undefined}><Icone nom="ui-ok" taille={16} />{av(a)}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Au téléphone : Mensuel ou Annuel, les quatre offres en onglets, une carte à la
 * fois (la suivante dépasse, on la fait glisser), et un seul bouton en bas, celui
 * de l'offre en vue.
 */
function OffresMobile({ id, periode, setPeriode, mois, depart, carte, miseEnAvant, geste, onChoisir, note }: {
  id: string; periode: Periode; setPeriode: (p: Periode) => void; mois: number; depart: Plan;
  carte: (p: Plan, mis: boolean) => ReactNode; miseEnAvant: Plan | null; geste: (p: Plan) => Geste; onChoisir: (p: Plan) => void; note: string;
}) {
  const { tr, pr, eu, nm } = useMots();
  const rail = useRef<HTMLDivElement>(null);
  const [vue, setVue] = useState<Plan>(depart);
  const position = (p: Plan) => (document.getElementById(`${id}-${p}`)?.offsetLeft ?? 0) - 16;
  // L'offre mise en avant est déjà en vue à l'ouverture, sans glisser jusqu'à elle.
  useLayoutEffect(() => { if (rail.current) rail.current.scrollLeft = position(depart); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const suivre = () => {
    const r = rail.current;
    if (!r) return;
    const proche = PLANS.reduce((a, p) => (Math.abs(position(p) - r.scrollLeft) < Math.abs(position(a) - r.scrollLeft) ? p : a), PLANS[0]);
    if (proche !== vue) setVue(proche);
  };
  const aller = (p: Plan) => { setVue(p); rail.current?.scrollTo({ left: position(p), behavior: reduit() ? 'auto' : 'smooth' }); };
  function fleches(e: KeyboardEvent<HTMLDivElement>) {
    const pas = { ArrowRight: 1, ArrowLeft: -1, Home: -9, End: 9 }[e.key];
    if (pas === undefined) return;
    e.preventDefault();
    const p = PLANS[Math.max(0, Math.min(PLANS.length - 1, rang(vue) + pas))];
    aller(p);
    document.getElementById(`${id}-onglet-${p}`)?.focus();
  }
  const g = geste(vue);
  return (
    <>
      <div className="adm-offres-entete-mobile">
        <Periodes periode={periode} onChange={setPeriode} mois={mois} />
      </div>
      <div role="tablist" aria-label={tr('Offres', 'Plans')} onKeyDown={fleches} className="adm-offres-onglets">
        {PLANS.map(p => (
          <button key={p} id={`${id}-onglet-${p}`} type="button" role="tab" aria-selected={vue === p} aria-controls={`${id}-${p}`} tabIndex={vue === p ? 0 : -1} onClick={() => aller(p)}>
            {nm(p)}
          </button>
        ))}
      </div>
      <div className="adm-offres-corps">
        <div ref={rail} onScroll={suivre} className="adm-offres-rail">
          {/* Seule l'offre en vue est lue : les autres dépassent à l'écran, comme des onglets fermés. */}
          {PLANS.map(p => <div key={p} className="contents" inert={p !== vue || undefined}>{carte(p, p === miseEnAvant)}</div>)}
        </div>
      </div>
      <footer className="adm-offres-pied">
        {/* Repasser en Gratuit ne se pousse pas : un bouton au trait, sans prix. */}
        {g.bouton
          ? g.plan === 'gratuit'
            ? <button type="button" onClick={() => onChoisir(g.plan)} className={`${classeBouton.secondaire} w-full`}>{g.texte}</button>
            : <button type="button" onClick={() => onChoisir(g.plan)} className={`${classeBouton.principal} w-full`}>{g.texte}, {eu(OFFRES[g.plan].prix[periode])} {pr(periode)}</button>
          : <p className="adm-offre-etat">{g.texte}</p>}
        <p className="adm-offres-note">{note}</p>
      </footer>
    </>
  );
}

/**
 * Le récapitulatif, avant Creem : la période, ce qu'on paie aujourd'hui et
 * ensuite, l'absence d'engagement, ce qu'on débloque (ou ce qui s'arrête), et au
 * bureau, la page telle qu'elle sera. Un abonné qui change d'offre ne repasse pas
 * par la page de paiement : Creem facture ou rembourse la différence au prorata.
 */
function Recapitulatif({ plan, periode, setPeriode, abonnement, grand, id, mois, retour, fermer, payer, envoi, erreur, apercu }: {
  plan: PlanPayant; periode: Periode; setPeriode: (p: Periode) => void; abonnement: EtatAbonnement; grand: boolean; id: string; mois: number;
  retour: () => void; fermer: () => void; payer: () => void; envoi: boolean; erreur: string; apercu?: (plan: PlanPayant) => PagePublique;
}) {
  const { tr, dl, pr, eu, nm, av } = useMots();
  // Ce qu'on paie décide du chemin chez Creem (changer d'abonnement ou en prendre un) ; l'offre de la page hors essai, de ce
  // qui s'ouvre : pendant l'essai, on choisit ce qu'on garde ensuite.
  const actuelle = planHorsEssai(abonnement);
  const payee = abonnement.payee;
  const changement = payee !== 'gratuit' && !estResilie(abonnement.statut);
  const meme = plan === payee;
  const deja = meme && abonnement.periode === periode;
  const o = OFFRES[plan];
  const titre = meme ? (periode === 'an' ? tr('Passer à l’annuel', 'Switch to yearly') : tr('Passer au mensuel', 'Switch to monthly')) : tr(`Passer en ${nm(plan)}`, `Upgrade to ${nm(plan)}`);
  const monte = rang(plan) > rang(actuelle);
  // Un abonné qui descend se fait rendre la différence, qui monte la paie ; changer aussi de période, Creem en décide.
  const sens = changement ? sensDuChangement({ plan: payee, periode: abonnement.periode }, { plan, periode }) : null;
  const liste = meme ? [] : avantagesEntre(actuelle, plan);
  // La page telle qu'elle sera se montre quand on monte, pas quand on descend : sans savoir ce qu'une page d'avant
  // les offres garde, l'aperçu montrerait encore ce qui s'arrête. La liste « Ce qui s'arrête » le dit à sa place.
  const vue = monte || meme ? apercu : undefined;
  const lignes: [string, string, boolean?][] = changement
    ? [[sens === 'rendu' ? tr('Rendu aujourd’hui', 'Refunded today') : tr('Aujourd’hui', 'Today'), tr('La différence, au prorata', 'The prorated difference')], [tr('Ensuite', 'Then'), `${eu(o.prix[periode])} ${pr(periode)}`], [tr('Engagement', 'Commitment'), tr('Aucun, résiliable à tout moment', 'None, cancel anytime')]]
    : [[tr('Dû aujourd’hui', 'Due today'), eu(o.prix[periode]), true], [tr('Prochaine échéance', 'Next payment'), dl(echeance(Date.now(), periode))], [tr('Engagement', 'Commitment'), tr('Aucun, résiliable à tout moment', 'None, cancel anytime')]];

  const revenir = (classe: string) => (
    <button type="button" onClick={retour} className={`adm-fil-retour ${classe}`}><Icone nom="ui-chevron" taille={16} className="rotate-90" />{tr('Les offres', 'Plans')}</button>
  );
  const corps = (
    <>
      {grand && revenir('-ml-2 self-start')}
      <h2 id={`${id}-recap`} tabIndex={-1} className="adm-recap-titre">{titre}</h2>
      <fieldset className="adm-recap-periodes">
        <legend className="sr-only">{tr('Paiement', 'Billing')}</legend>
        {(['an', 'mois'] as Periode[]).map(p => (
          <label key={p} data-choisi={periode === p || undefined}>
            <input type="radio" name={`${id}-periode`} value={p} checked={periode === p} onChange={() => { vibrer(4); setPeriode(p); }} />
            <span>
              <span className="adm-recap-periode-nom">{p === 'an' ? tr('À l’année', 'Yearly') : tr('Au mois', 'Monthly')}</span>
              <span className="adm-recap-periode-detail">{p === 'an' ? tr(`${eu(o.prix.an)} par an${mois > 0 ? `, ${mois} mois offerts` : ''}`, `${eu(o.prix.an)} per year${mois > 0 ? `, ${mois} months free` : ''}`) : tr(`${eu(o.prix.mois)} par mois`, `${eu(o.prix.mois)} per month`)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <dl className="adm-recap-lignes">
        {lignes.map(([nom, valeur, fort]) => <div key={nom}><dt>{nom}</dt><dd data-fort={fort || undefined}>{valeur}</dd></div>)}
      </dl>
      {/* Creem ne décale pas un premier paiement : pris pendant l'essai, l'abonnement commence le jour même. */}
      {abonnement.essai && !changement && (
        <p className="adm-recap-periode-detail">
          {rang(plan) >= rang(PLAN_ESSAI)
            ? tr('Ton abonnement commence aujourd’hui, l’essai s’arrête là.', 'Your subscription starts today, and the trial ends there.')
            : tr(`Ton abonnement commence aujourd’hui. Ton essai ${nm(PLAN_ESSAI)} continue jusqu’au ${dl(abonnement.essai)}, puis ${nm(plan)} prend la suite.`, `Your subscription starts today. Your ${nm(PLAN_ESSAI)} trial goes on until ${dl(abonnement.essai)}, then ${nm(plan)} takes over.`)}
        </p>
      )}
      {liste.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h3 className="adm-recap-sous-titre">{!monte ? tr('Ce qui s’arrête', 'What stops') : abonnement.essai ? tr('Ce que tu gardes après l’essai', 'What you keep after the trial') : tr('Ce que tu débloques', 'What you unlock')}</h3>
          <ul className="adm-offre-liste adm-recap-liste" data-perte={!monte || undefined}>
            {liste.map(a => <li key={a}>{monte && <Icone nom="ui-ok" taille={16} />}{av(a)}</li>)}
          </ul>
        </div>
      )}
      {meme && !deja && <p className="adm-recap-periode-detail">{tr(`Tu gardes tout ${nm(plan)}, payé ${periode === 'an' ? 'à l’année' : 'au mois'}.`, `You keep everything in ${nm(plan)}, billed ${periode === 'an' ? 'yearly' : 'monthly'}.`)}</p>}
    </>
  );
  const paiement = (
    <div className="flex flex-col gap-2.5">
      <button type="button" onClick={payer} disabled={envoi || deja} className={`${classeBouton.principal} w-full`}>
        {envoi ? (changement ? tr('Changement d’offre…', 'Changing plan…') : tr('Ouverture du paiement…', 'Opening payment…'))
          : deja ? tr('C’est ton offre actuelle', 'This is your current plan')
            : changement ? titre : <>{tr('Payer avec Creem', 'Pay with Creem')}<Icone nom="ui-ouvrir" taille={15} className="shrink-0" /></>}
      </button>
      <p className="adm-offres-note">
        {changement ? tr(`Prix TTC. Creem ${sens === 'rendu' ? 'rembourse' : sens === 'facture' ? 'facture' : 'facture ou rembourse'} la différence au prorata, sur ta carte enregistrée.`, `Prices include tax. Creem ${sens === 'rendu' ? 'refunds' : sens === 'facture' ? 'charges' : 'charges or refunds'} the prorated difference on your saved card.`) : tr('Prix TTC. Creem encaisse, envoie la facture et gère la TVA.', 'Prices include tax. Creem takes the payment, sends the invoice and handles VAT.')}
        {' '}{tr('Voir les', 'See the')} <a href={tr('/legal/cgu', '/legal/terms')} target="_blank" rel="noopener">{tr('conditions d’utilisation', 'terms of use')}</a>.
      </p>
      {erreur && <p role="alert" className="text-[13.5px] text-red-300">{erreur}</p>}
    </div>
  );

  if (!grand) return (
    <div className="adm-offres" aria-labelledby={`${id}-recap`}>
      <header className="adm-offres-tete">
        {revenir('-ml-2')}
        <button type="button" onClick={fermer} className={`${classeBouton.icone} ml-auto`} aria-label={tr('Fermer', 'Close')}><Icone nom="ui-fermer" taille={18} /></button>
      </header>
      <div className="adm-offres-corps"><div className="adm-recap-corps">{corps}</div></div>
      <footer className="adm-offres-pied">{paiement}</footer>
    </div>
  );
  return (
    <div className="adm-recap" data-apercu={vue ? '' : undefined} data-seul={vue ? undefined : ''} aria-labelledby={`${id}-recap`}>
      <div className="adm-recap-corps">{corps}<div className="mt-1">{paiement}</div></div>
      {vue ? (
        <aside className="adm-recap-apercu" aria-label={tr(`Ta page avec ${nm(plan)}`, `Your page with ${nm(plan)}`)}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] font-medium text-[#5f5f5a]">{tr(`Ta page avec ${nm(plan)}`, `Your page with ${nm(plan)}`)}</p>
            <button type="button" onClick={fermer} className={classeBouton.icone} aria-label={tr('Fermer', 'Close')}><Icone nom="ui-fermer" taille={18} /></button>
          </div>
          {/* La vraie page, rendue à 390 px puis réduite : sans la mention, avec ce que l'offre ouvre. On la regarde, on n'y touche pas. */}
          <div className="adm-recap-cadre" inert>
            <div className="adm-apercu" style={{ width: 390, height: 880, transform: 'scale(0.6)', transformOrigin: '0 0' }}>
              <PageLiens page={vue(plan)} apercu />
            </div>
          </div>
        </aside>
      ) : <button type="button" onClick={fermer} className={`${classeBouton.icone} absolute right-3 top-3`} aria-label={tr('Fermer', 'Close')}><Icone nom="ui-fermer" taille={18} /></button>}
    </div>
  );
}

/**
 * Repasser en Gratuit, sans quitter Hopla : l'offre court jusqu'au bout de ce
 * qui est payé, puis plus rien n'est prélevé. Ce qui s'arrête est dit avant le
 * geste, et que rien n'est effacé. Si Creem refuse, son portail prend le relais
 * (Creem y résilie tout de suite ; Hopla garde l'offre jusqu'à la fin payée).
 */
function RepasserGratuit({ abonnement, grand, id, retour, fermer, resilier, ouvrirPortail }: {
  abonnement: EtatAbonnement; grand: boolean; id: string; retour: () => void; fermer: () => void;
  resilier: () => Promise<void>; ouvrirPortail?: () => Promise<string>;
}) {
  const { tr, dl, dc, nm, av } = useMots();
  const [envoi, setEnvoi] = useState<'' | 'resiliation' | 'portail'>('');
  const [erreur, setErreur] = useState('');
  const nom = nm(abonnement.payee);
  const fin = abonnement.finPeriode;
  // Une offre offerte qui court encore après la période payée prend la suite : on ne perd que ce qu'elle ne comprend pas.
  const apres = apresAbonnement(abonnement, fin);
  const pertes = rang(abonnement.payee) > rang(apres) ? avantagesEntre(apres, abonnement.payee) : [];

  async function confirmer() {
    setEnvoi('resiliation');
    setErreur('');
    try { await resilier(); vibrer(8); fermer(); return; }
    catch (error) { setErreur((error as Error).message || tr('Creem ne répond pas. Réessaie dans un instant.', 'Creem is not responding. Try again in a moment.')); }
    setEnvoi('');
  }
  async function versPortail() {
    if (!ouvrirPortail) return;
    setEnvoi('portail');
    try { location.href = await ouvrirPortail(); return; }
    catch (error) { setErreur((error as Error).message || tr('Le portail ne répond pas. Réessaie dans un instant.', 'The portal is not responding. Try again in a moment.')); }
    setEnvoi('');
  }

  const revenir = (classe: string) => (
    <button type="button" onClick={retour} className={`adm-fil-retour ${classe}`}><Icone nom="ui-chevron" taille={16} className="rotate-90" />{tr('Les offres', 'Plans')}</button>
  );
  const corps = (
    <>
      {grand && revenir('-ml-2 self-start')}
      <h2 id={`${id}-recap`} tabIndex={-1} className="adm-recap-titre">{tr('Repasser en Gratuit', 'Switch to Free')}</h2>
      <dl className="adm-recap-lignes">
        <div><dt>{tr(`Ton offre ${nom}`, `Your ${nom} plan`)}</dt><dd data-fort>{fin ? tr(`Jusqu’au ${dl(fin)}`, `Until ${dl(fin)}`) : tr('Jusqu’à la fin de la période payée', 'Until the end of the paid period')}</dd></div>
        <div><dt>{tr('Ensuite', 'Then')}</dt><dd>{apres === 'gratuit' ? nm('gratuit') : tr(`${nm(apres)} offert`, `${nm(apres)} for free`)}{tr(', plus aucun prélèvement', ', no more charges')}</dd></div>
      </dl>
      {pertes.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h3 className="adm-recap-sous-titre">{fin ? tr(`Ce qui s’arrête le ${dc(fin)}`, `What stops on ${dc(fin)}`) : tr('Ce qui s’arrête ensuite', 'What stops next')}</h3>
          <ul className="adm-offre-liste adm-recap-liste" data-perte>
            {pertes.map(a => <li key={a}>{av(a)}</li>)}
          </ul>
        </div>
      )}
      <p className="adm-recap-periode-detail">{tr('Rien n’est effacé : reprendre une offre remet tout en place.', 'Nothing is deleted: picking a plan again brings everything back.')}</p>
    </>
  );
  const geste = (
    <div className="flex flex-col gap-2.5">
      <button type="button" onClick={confirmer} disabled={!!envoi} className={`${classeBouton.principal} w-full`}>
        {envoi === 'resiliation' ? tr('Résiliation…', 'Canceling…') : tr('Résilier mon abonnement', 'Cancel my subscription')}
      </button>
      <p className="adm-offres-note">{tr('Sans frais. Tes factures restent chez Creem.', 'No fees. Your invoices stay with Creem.')}</p>
      {erreur && <p role="alert" className="text-[13.5px] text-red-300">{erreur}</p>}
      {/* Creem refuse : son portail résilie aussi, d'un lien à usage unique. */}
      {erreur && ouvrirPortail && (
        <button type="button" onClick={versPortail} disabled={!!envoi} className={`${classeBouton.secondaire} w-full`}>
          {envoi === 'portail' ? tr('Ouverture…', 'Opening…') : <>{tr('Résilier chez Creem', 'Cancel with Creem')}<Icone nom="ui-ouvrir" taille={15} className="shrink-0" /></>}
        </button>
      )}
    </div>
  );

  if (!grand) return (
    <div className="adm-offres" aria-labelledby={`${id}-recap`}>
      <header className="adm-offres-tete">
        {revenir('-ml-2')}
        <button type="button" onClick={fermer} className={`${classeBouton.icone} ml-auto`} aria-label={tr('Fermer', 'Close')}><Icone nom="ui-fermer" taille={18} /></button>
      </header>
      <div className="adm-offres-corps"><div className="adm-recap-corps">{corps}</div></div>
      <footer className="adm-offres-pied">{geste}</footer>
    </div>
  );
  return (
    <div className="adm-recap" data-seul="" aria-labelledby={`${id}-recap`}>
      <div className="adm-recap-corps">{corps}<div className="mt-1">{geste}</div></div>
      <button type="button" onClick={fermer} className={`${classeBouton.icone} absolute right-3 top-3`} aria-label={tr('Fermer', 'Close')}><Icone nom="ui-fermer" taille={18} /></button>
    </div>
  );
}

/* ---- Le retour du paiement ---- */

/**
 * Le picto de chaque avantage, celui que la fonction porte ailleurs dans le back office, plein comme les autres (la mention
 * ôtée, l'œil barré des blocs masqués, pas une coche au trait). Un avantage inconnu prend la coche.
 */
const PICTOS: { avantage: string; picto: string }[] = [
  { avantage: 'Sans la mention Hopla', picto: 'masque' },
  { avantage: 'Ta vitrine : produits, rendez-vous, dons', picto: 'boutique' },
  { avantage: 'Tes couleurs, ta police, ton fond', picto: 'pinceau' },
  { avantage: 'Grande photo, liens en grille', picto: 'photo' },
  { avantage: 'Tes liens programmés à l’avance', picto: 'agenda' },
  { avantage: 'Les avis de tes clients', picto: 'etoile' },
  { avantage: 'Tes stats sur 30 jours', picto: 'courbe' },
  { avantage: 'Ta page selon l’heure et le pays', picto: 'horloge' },
  { avantage: 'Des liens à code ou à places comptées', picto: 'cadenas' },
  { avantage: 'Ta liste e-mail, vers ta newsletter', picto: 'courrier' },
  { avantage: 'Un cadeau contre l’e-mail, tes derniers articles', picto: 'cadeau' },
  { avantage: 'Tes stats sur un an', picto: 'courbe' },
  { avantage: 'Ton propre nom de domaine', picto: 'globe' },
  { avantage: 'Jusqu’à trois pages', picto: 'document' },
];
const pictoDe = (a: string) => PICTOS.find(x => x.avantage === a)?.picto ?? 'coche';

/**
 * Au retour de Creem : « On active ton offre… » tant que le webhook n'est pas
 * passé (le back office relit l'abonnement, il ne l'accorde jamais), puis
 * « C'est fait » et ce qui vient de s'ouvrir. Sans nouvelles au bout de trente
 * secondes, on le dit, sans rien promettre de plus : l'offre arrivera seule.
 */
export function RetourPaiement({ achat, etape, onFermer, action }: { achat: Achat; etape: EtapeRetour; onFermer: () => void; action?: { texte: string; detail?: string; faire: () => void } }) {
  const { tr, nm, av } = useMots();
  const id = useId();
  const nom = nm(achat.plan);
  const meme = achat.avant === achat.plan;
  // Un abonné qui change d'offre ne paie pas sur une page Creem : la différence est facturée, ou rendue s'il descend.
  const changement = !!achat.avant && achat.avant !== 'gratuit';
  const sens = changement && achat.avant && achat.periode ? sensDuChangement({ plan: achat.avant, periode: achat.periodeAvant ?? null }, { plan: achat.plan, periode: achat.periode }) : null;
  // Ce qui s'ouvre se compte depuis ce que la page avait déjà : une offre offerte au-dessus de l'abonnement d'avant compte.
  const base = achat.deja ?? achat.avant;
  const toutes = etape !== 'fait' || meme ? [] : base ? (rang(achat.plan) > rang(base) ? avantagesEntre(base, achat.plan) : []) : OFFRES[achat.plan].avantages;
  // Ce qu'on était venu chercher passe en tête (« Tes couleurs »), le reste dans l'ordre de l'offre.
  const voulu = achat.pour ? FONCTIONS_EN_MOTS[achat.pour].avantage : '';
  const ouvertes = [...toutes.filter(a => a === voulu), ...toutes.filter(a => a !== voulu)];
  const titre = etape === 'fait'
    ? (meme && achat.periode ? tr(`C’est fait, tu passes ${achat.periode === 'an' ? 'à l’annuel' : 'au mensuel'}`, `Done, you’re now billed ${achat.periode === 'an' ? 'yearly' : 'monthly'}`) : tr(`C’est fait, tu es en ${nom}`, `Done, you’re on ${nom}`))
    : etape === 'attente' ? tr(`Ton offre ${nom} arrive`, `Your ${nom} plan is on its way`) : tr(`On active ton offre ${nom}…`, `Activating your ${nom} plan…`);
  const mention = FONCTIONS_EN_MOTS.sansMention.avantage;
  return (
    <Feuille ouverte moyenne nue titre={titre} onFermer={onFermer}>
      {fermer => (
        <div className="adm-retour" aria-labelledby={id}>
          <div className="adm-retour-tete" aria-live="polite">
            {etape === 'fait' ? <Icone nom="coche" taille={44} />
              : etape === 'attente' ? <Icone nom="horloge" taille={44} />
                : <span className="adm-retour-roue" aria-hidden="true" />}
            <h2 id={id} className="adm-recap-titre">{titre}</h2>
            {etape === 'fait' ? (
              <ol className="adm-retour-etapes" aria-label={tr('Étapes', 'Steps')}>
                <li><Icone nom="coche" taille={16} />{changement ? tr('Changement confirmé', 'Change confirmed') : tr('Paiement reçu', 'Payment received')}</li>
                <li><Icone nom="coche" taille={16} />{tr('Offre activée', 'Plan activated')}</li>
              </ol>
            ) : etape === 'attente' ? (
              <p className="adm-retour-texte">{tr(`Creem ne nous a pas encore confirmé ${changement ? 'le changement' : 'ton paiement'}. Ton offre s’activera d’elle-même dès que ce sera fait : tu peux fermer cette fenêtre. Si rien n’a changé dans une heure, `, `Creem hasn’t confirmed ${changement ? 'the change' : 'your payment'} yet. Your plan will activate on its own as soon as it does: you can close this window. If nothing has changed in an hour, `)}<a href={`mailto:${CONTACT_LEGAL}?subject=${encodeURIComponent(tr(`Hopla : mon offre ${nom}`, `Hopla: my ${nom} plan`))}`}>{tr('écris-nous', 'email us')}</a>.</p>
            ) : <p className="adm-retour-texte">{tr(`Creem nous confirme ${changement ? 'le changement' : 'ton paiement'}. Ça prend quelques secondes.`, `Creem is confirming ${changement ? 'the change' : 'your payment'}. It takes a few seconds.`)}</p>}
          </div>
          {/* Pris pendant l'essai (ou sous une offre offerte au-dessus) : rien de neuf ne s'ouvre, l'offre attend son tour. */}
          {etape === 'fait' && !meme && base && rang(achat.plan) <= rang(base) && (
            <p className="adm-retour-texte">{tr(`Tout ce que ta page a aujourd’hui reste ouvert, puis ${nom} prend la suite.`, `Everything your page has today stays on, then ${nom} takes over.`)}</p>
          )}
          {ouvertes.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="adm-recap-sous-titre">{tr('Ce qui vient de s’ouvrir', 'What you just unlocked')}</h3>
              <ul className="adm-retour-liste">
                {ouvertes.map(a => (
                  <li key={a}><Icone nom={pictoDe(a)} taille={16} /><span className="flex-1">{av(a)}</span>{a === mention && <span className="adm-retour-deja">{tr('Déjà fait', 'Already done')}</span>}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-col gap-3">
            {/* Le bloc que le geste touche, nommé : on sait lequel de ses liens devient une prise de rendez-vous. */}
            {etape === 'fait' && action?.detail && <p id={`${id}-objet`} className="adm-retour-objet">{action.detail}</p>}
            <div className="adm-retour-gestes">
              {etape === 'fait' && action ? (
                <>
                  <button type="button" onClick={() => fermer()} className={classeBouton.secondaire}>{tr('Fermer', 'Close')}</button>
                  <button type="button" onClick={() => fermer(() => { onFermer(); action.faire(); })} aria-describedby={action.detail ? `${id}-objet` : undefined} className={classeBouton.principal}>{action.texte}</button>
                </>
              ) : <button type="button" onClick={() => fermer()} className={etape === 'fait' ? classeBouton.principal : classeBouton.secondaire}>{tr('Fermer', 'Close')}</button>}
            </div>
            {etape === 'fait' && (
              <p className="adm-offres-note">
                {!changement ? tr('Ta facture arrive par e-mail, envoyée par Creem.', 'Your invoice arrives by email, sent by Creem.')
                  : sens === 'rendu' ? tr('Creem te rend la différence au prorata, sur ta carte.', 'Creem refunds the prorated difference to your card.')
                    : sens === 'facture' ? tr('Creem facture la différence au prorata ; ta facture arrive par e-mail.', 'Creem charges the prorated difference; your invoice arrives by email.')
                      : tr('Creem facture ou rend la différence au prorata, sur ta carte.', 'Creem charges or refunds the prorated difference on your card.')}
              </p>
            )}
          </div>
        </div>
      )}
    </Feuille>
  );
}
