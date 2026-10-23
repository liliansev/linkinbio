import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import type { Abonnement as EtatAbonnement, Fonction, Periode, Plan, PlanPayant } from '../lib/abonnement.ts';
import { FONCTIONS, FONCTIONS_EN_MOTS, OFFRES, PLANS, apresAbonnement, avantagesEntre, echeance, economieAnnuelle, estResilie, euros, moisOfferts, offerteAuDessus, rang, sensDuChangement } from '../lib/abonnement.ts';
import type { Achat, EtapeRetour, NoteAchat } from '../lib/achat.ts';
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

const dateLongue = (ms: number) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const dateCourte = (ms: number) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const par = (p: Periode) => (p === 'an' ? 'par an' : 'par mois');
const reduit = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Ce que la carte d'une offre propose : un bouton, ou un simple état (l'offre en cours, bientôt). */
type Geste = { bouton: true; texte: string; plan: Plan } | { bouton: false; texte: string };
/** L'étiquette d'une carte : `fort`, l'offre qui débloque la fonction d'où l'on vient (en bleu) ; `actuelle`, la sienne (bleu pâle). */
type Badge = { texte: string; fort?: boolean; actuelle?: boolean };

interface ProprietesOffres {
  onFermer: () => void;
  abonnement: EtatAbonnement;
  /** Les offres qu'on peut acheter maintenant (un produit Creem pour chaque période). */
  enVente: PlanPayant[];
  /** La fonction réservée d'où l'on vient : son offre est mise en avant, sa ligne en gras. */
  pour?: Fonction;
  /** Sans fonction, l'offre à mettre en avant quand on la connaît (un an de stats : Pro). */
  vers?: PlanPayant;
  /** Le bloc d'où l'on vient (une règle réservée) : noté pour y revenir au retour de Creem. */
  bloc?: string;
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

export function FenetreOffres({ onFermer, abonnement, enVente, pour, vers, bloc, ouvrirPaiement, avantDePartir, apercu, resilier, ouvrirPortail, resiliation }: ProprietesOffres) {
  const grand = useGrandEcran();
  // L'offre de la page (une offre offerte peut passer devant l'abonnement), et celle qu'on paie, que Creem change ou résilie.
  const actuelle = abonnement.plan;
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
  const mois = Math.min(...PLANS.filter(vendable).map(p => moisOfferts(p)), 12);

  function geste(p: Plan): Geste {
    if (p === 'gratuit') {
      if (paye && !resilie) return resilier ? { bouton: true, texte: 'Repasser en Gratuit', plan: 'gratuit' } : { bouton: false, texte: 'Comprise dans ton offre' };
      if (!paye && !offerteVue) return { bouton: false, texte: 'Ton offre actuelle' };
      // Gratuit vient après l'abonnement résilié et l'offre offerte, la plus lointaine des deux ; jamais après une offre sans fin.
      if (offerteVue && offerteVue.jusqu === null) return { bouton: false, texte: 'Comprise dans ton offre' };
      const fin = Math.max(resilie ? abonnement.finPeriode ?? 0 : 0, offerteVue?.jusqu ?? 0);
      return { bouton: false, texte: fin ? `Dès le ${dateCourte(fin)}` : 'À la fin de ton offre' };
    }
    // L'offre offerte ne s'achète pas : sa carte dit jusqu'à quand. Celles du dessous y sont comprises, sauf celle qu'on paie.
    if (offerte?.plan === p) return { bouton: false, texte: offerte.jusqu ? `Offert jusqu’au ${dateCourte(offerte.jusqu)}` : 'Offert sans limite' };
    if (suite?.plan === p && p !== payee && abonnement.finPeriode) return { bouton: false, texte: `Offert dès le ${dateCourte(abonnement.finPeriode)}` };
    if (offerte && rang(p) < rang(offerte.plan) && p !== payee) return { bouton: false, texte: 'Comprise dans ton offre' };
    if (!vendable(p)) return { bouton: false, texte: 'Bientôt disponible' };
    if (p === payee && (!abonnement.periode || abonnement.periode === periode)) return { bouton: false, texte: offerte ? 'Ton abonnement' : 'Ton offre actuelle' };
    // Une offre résiliée court jusqu'à sa fin : on en reprend une ensuite.
    if (resilie) return { bouton: false, texte: abonnement.finPeriode ? `Après le ${dateCourte(abonnement.finPeriode)}` : 'Après ta résiliation' };
    if (p === payee) return { bouton: true, texte: periode === 'an' ? 'Passer à l’annuel' : 'Passer au mensuel', plan: p };
    return { bouton: true, texte: `Passer en ${OFFRES[p].nom}`, plan: p };
  }
  const badge = (p: Plan): Badge | null =>
    p === actuelle ? { texte: 'Ton offre', actuelle: true }
      : pour && p === FONCTIONS[pour] ? { texte: FONCTIONS_EN_MOTS[pour].pour, fort: true }
        : p !== 'gratuit' && !OFFRES[p].enVente ? { texte: 'Bientôt' } : null;
  const offert = offerteVue ? `${OFFRES[offerteVue.plan].nom} t’est offert${offerteVue.jusqu ? ` jusqu’au ${dateLongue(offerteVue.jusqu)}` : ''}` : '';
  const note = resilie && abonnement.finPeriode
    ? `Ton offre ${OFFRES[payee].nom} s’arrête le ${dateLongue(abonnement.finPeriode)}${offert ? `, et ${offert}.` : ' : tu pourras en prendre une autre ensuite.'}`
    : offert ? `${offert}. Prix TTC, paiement chez Creem.`
      : 'Prix TTC. Paiement sécurisé chez Creem, résiliable à tout moment.';

  // Revenir aux offres rend le focus au bouton de l'offre choisie ; entrer dans le récapitulatif le pose sur son titre.
  const dernierChoix = useRef<Plan | null>(null);
  useEffect(() => {
    if (choix) { dernierChoix.current = choix; document.getElementById(`${idTitre}-recap`)?.focus({ preventScroll: true }); return; }
    if (dernierChoix.current) document.getElementById(`${idTitre}-${dernierChoix.current}-geste`)?.focus({ preventScroll: true });
  }, [choix, idTitre]);

  function choisir(p: Plan) { vibrer(6); setErreur(''); setChoix(p); }

  async function payer() {
    if (!choix || choix === 'gratuit') return;
    setEnvoi(true);
    setErreur('');
    try {
      await avantDePartir?.();
      const url = await ouvrirPaiement(choix, periode);
      // De quoi dire au retour ce qui vient de s'ouvrir. Rien n'est accordé d'après cette note.
      const n: NoteAchat = { plan: choix, periode, ...(pour ? { pour } : {}), avant: payee, ...(abonnement.periode ? { periodeAvant: abonnement.periode } : {}), ...(offerte ? { deja: offerte.plan } : {}), ...(bloc ? { bloc } : {}), ts: Date.now() };
      try { sessionStorage.setItem(CLE_ACHAT, JSON.stringify(n)); } catch { /* onglet privé : le retour dira seulement l'offre */ }
      location.href = url;
      return;
    } catch (error) { setErreur((error as Error).message || 'Le paiement ne répond pas. Réessaie dans un instant.'); }
    setEnvoi(false);
  }

  return (
    <Feuille ouverte large nue titre={choix === 'gratuit' ? 'Repasser en Gratuit' : choix ? `Passer en ${OFFRES[choix].nom}` : 'Les offres'} onFermer={onFermer}>
      {fermer => choix === 'gratuit' && resilier ? (
        <RepasserGratuit abonnement={abonnement} grand={grand} id={idTitre} retour={() => setChoix(null)} fermer={() => fermer()} resilier={resilier} ouvrirPortail={abonnement.portail ? ouvrirPortail : undefined} />
      ) : choix && choix !== 'gratuit' ? (
        <Recapitulatif plan={choix} periode={periode} setPeriode={setPeriode} abonnement={abonnement} grand={grand} id={idTitre} mois={moisOfferts(choix)}
          retour={() => setChoix(null)} fermer={() => fermer()} payer={payer} envoi={envoi} erreur={erreur} apercu={apercu} />
      ) : (
        <div className="adm-offres" aria-labelledby={idTitre}>
          <header className="adm-offres-tete">
            <h2 id={idTitre} className="adm-offres-titre">Les offres</h2>
            {grand && <span className="flex-1" />}
            {grand && mois > 0 && <span className="adm-offres-badge" data-gain>{mois} mois offerts</span>}
            {grand && <Periodes periode={periode} onChange={setPeriode} />}
            <button type="button" onClick={() => fermer()} className={`${classeBouton.icone} ml-auto lg:ml-1.5`} aria-label="Fermer"><Icone nom="ui-fermer" taille={18} /></button>
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
              miseEnAvant={miseEnAvant} geste={geste} onChoisir={choisir} note={resilie || offerteVue ? note : 'Prix TTC, paiement chez Creem.'} />
          )}
        </div>
      )}
    </Feuille>
  );
}

/** Mensuel ou Annuel : un seul arrêt de tabulation, les flèches passent de l'un à l'autre. */
function Periodes({ periode, onChange, mois = 0 }: { periode: Periode; onChange: (p: Periode) => void; mois?: number }) {
  return (
    <div role="radiogroup" aria-label="Paiement" onKeyDown={e => flechesRadio(e)} className="adm-offres-periodes">
      {(['mois', 'an'] as Periode[]).map(p => (
        <button key={p} type="button" role="radio" aria-checked={periode === p} tabIndex={periode === p ? 0 : -1} onClick={() => { vibrer(4); onChange(p); }}>
          {p === 'an' ? 'Annuel' : 'Mensuel'}
          {p === 'an' && mois > 0 && <span className="adm-offres-badge" data-gain>{mois} mois offerts</span>}
        </button>
      ))}
    </div>
  );
}

/** Le prix d'une offre : à l'année, le prix de douze mois en gris lisible, et l'économie réelle en euros. */
function Tarif({ plan, periode }: { plan: Plan; periode: Periode }) {
  if (plan === 'gratuit') return (
    <div className="adm-offre-tarif">
      <p><span className="adm-offre-prix">{euros(0)}</span></p>
      <p className="adm-offre-sous">pour toujours</p>
    </div>
  );
  const o = OFFRES[plan];
  return (
    <div className="adm-offre-tarif">
      <p><span className="adm-offre-prix">{euros(o.prix[periode])}</span><span className="adm-offre-unite">{par(periode)}</span></p>
      {periode === 'an' ? (
        <>
          <p className="adm-offre-sous">au lieu de {euros(o.prix.mois * 12)}</p>
          <p className="adm-offre-gain">{euros(economieAnnuelle(plan))} d’économie</p>
        </>
      ) : <p className="adm-offre-sous">ou {euros(o.prix.an)} par an</p>}
    </div>
  );
}

function CarteOffre({ id, plan, periode, badge, mis, pour, geste, onChoisir, panneau = false }: {
  id: string; plan: Plan; periode: Periode; badge: Badge | null; mis: boolean; pour?: Fonction;
  geste?: Geste; onChoisir?: (p: Plan) => void; panneau?: boolean;
}) {
  const o = OFFRES[plan];
  const fort = pour ? FONCTIONS_EN_MOTS[pour].avantage : '';
  return (
    <section id={id} role={panneau ? 'tabpanel' : undefined} aria-labelledby={`${id}-nom`} className="adm-offre" data-mis={mis || undefined}>
      <div className="adm-offre-tete">
        <h3 id={`${id}-nom`} className="adm-offre-nom">{o.nom}</h3>
        {badge && <span className="adm-offres-badge" data-fort={badge.fort || undefined} data-actuelle={badge.actuelle || undefined}>{badge.texte}</span>}
      </div>
      <Tarif plan={plan} periode={periode} />
      {geste && (geste.bouton
        ? <button id={`${id}-geste`} type="button" onClick={() => onChoisir?.(geste.plan)} className={`${mis ? classeBouton.principal : classeBouton.secondaire} w-full`}>{geste.texte}</button>
        : <p id={`${id}-geste`} tabIndex={-1} className="adm-offre-etat">{geste.texte}</p>)}
      <div>
        <p className="adm-offre-inclus">{plan === 'gratuit' ? 'Inclus :' : `Tout ${OFFRES[PLANS[rang(plan) - 1]].nom}, et :`}</p>
        <ul className="adm-offre-liste">
          {o.avantages.map(a => (
            <li key={a} data-fort={a === fort || undefined}><Icone nom="ui-ok" taille={16} />{a}</li>
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
      <div role="tablist" aria-label="Offres" onKeyDown={fleches} className="adm-offres-onglets">
        {PLANS.map(p => (
          <button key={p} id={`${id}-onglet-${p}`} type="button" role="tab" aria-selected={vue === p} aria-controls={`${id}-${p}`} tabIndex={vue === p ? 0 : -1} onClick={() => aller(p)}>
            {OFFRES[p].nom}
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
            : <button type="button" onClick={() => onChoisir(g.plan)} className={`${classeBouton.principal} w-full`}>{g.texte}, {euros(OFFRES[g.plan].prix[periode])} {par(periode)}</button>
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
  // Ce qu'on paie décide du chemin chez Creem (changer d'abonnement ou en prendre un) ; l'offre de la page, de ce qui s'ouvre.
  const actuelle = abonnement.plan;
  const payee = abonnement.payee;
  const changement = payee !== 'gratuit' && !estResilie(abonnement.statut);
  const meme = plan === payee;
  const deja = meme && abonnement.periode === periode;
  const o = OFFRES[plan];
  const titre = meme ? (periode === 'an' ? 'Passer à l’annuel' : 'Passer au mensuel') : `Passer en ${o.nom}`;
  const monte = rang(plan) > rang(actuelle);
  // Un abonné qui descend se fait rendre la différence, qui monte la paie ; changer aussi de période, Creem en décide.
  const sens = changement ? sensDuChangement({ plan: payee, periode: abonnement.periode }, { plan, periode }) : null;
  const liste = meme ? [] : avantagesEntre(actuelle, plan);
  // La page telle qu'elle sera se montre quand on monte, pas quand on descend : sans savoir ce qu'une page d'avant
  // les offres garde, l'aperçu montrerait encore ce qui s'arrête. La liste « Ce qui s'arrête » le dit à sa place.
  const vue = monte || meme ? apercu : undefined;
  const lignes: [string, string, boolean?][] = changement
    ? [[sens === 'rendu' ? 'Rendu aujourd’hui' : 'Aujourd’hui', 'La différence, au prorata'], ['Ensuite', `${euros(o.prix[periode])} ${par(periode)}`], ['Engagement', 'Aucun, résiliable à tout moment']]
    : [['Dû aujourd’hui', euros(o.prix[periode]), true], ['Prochaine échéance', dateLongue(echeance(Date.now(), periode))], ['Engagement', 'Aucun, résiliable à tout moment']];

  const revenir = (classe: string) => (
    <button type="button" onClick={retour} className={`adm-fil-retour ${classe}`}><Icone nom="ui-chevron" taille={16} className="rotate-90" />Les offres</button>
  );
  const corps = (
    <>
      {grand && revenir('-ml-2 self-start')}
      <h2 id={`${id}-recap`} tabIndex={-1} className="adm-recap-titre">{titre}</h2>
      <fieldset className="adm-recap-periodes">
        <legend className="sr-only">Paiement</legend>
        {(['an', 'mois'] as Periode[]).map(p => (
          <label key={p} data-choisi={periode === p || undefined}>
            <input type="radio" name={`${id}-periode`} value={p} checked={periode === p} onChange={() => { vibrer(4); setPeriode(p); }} />
            <span>
              <span className="adm-recap-periode-nom">{p === 'an' ? 'À l’année' : 'Au mois'}</span>
              <span className="adm-recap-periode-detail">{p === 'an' ? `${euros(o.prix.an)} par an${mois > 0 ? `, ${mois} mois offerts` : ''}` : `${euros(o.prix.mois)} par mois`}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <dl className="adm-recap-lignes">
        {lignes.map(([nom, valeur, fort]) => <div key={nom}><dt>{nom}</dt><dd data-fort={fort || undefined}>{valeur}</dd></div>)}
      </dl>
      {liste.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h3 className="adm-recap-sous-titre">{monte ? 'Ce que tu débloques' : 'Ce qui s’arrête'}</h3>
          <ul className="adm-offre-liste adm-recap-liste" data-perte={!monte || undefined}>
            {liste.map(a => <li key={a}>{monte && <Icone nom="ui-ok" taille={16} />}{a}</li>)}
          </ul>
        </div>
      )}
      {meme && !deja && <p className="adm-recap-periode-detail">Tu gardes tout {o.nom}, payé {periode === 'an' ? 'à l’année' : 'au mois'}.</p>}
    </>
  );
  const paiement = (
    <div className="flex flex-col gap-2.5">
      <button type="button" onClick={payer} disabled={envoi || deja} className={`${classeBouton.principal} w-full`}>
        {envoi ? (changement ? 'Changement d’offre…' : 'Ouverture du paiement…')
          : deja ? 'C’est ton offre actuelle'
            : changement ? titre : <>Payer avec Creem<Icone nom="ui-ouvrir" taille={15} className="shrink-0" /></>}
      </button>
      <p className="adm-offres-note">
        {changement ? `Prix TTC. Creem ${sens === 'rendu' ? 'rembourse' : sens === 'facture' ? 'facture' : 'facture ou rembourse'} la différence au prorata, sur ta carte enregistrée.` : 'Prix TTC. Creem encaisse, envoie la facture et gère la TVA.'}
        {' '}Voir les <a href="/legal/cgu" target="_blank" rel="noopener">conditions d’utilisation</a>.
      </p>
      {erreur && <p role="alert" className="text-[13.5px] text-red-300">{erreur}</p>}
    </div>
  );

  if (!grand) return (
    <div className="adm-offres" aria-labelledby={`${id}-recap`}>
      <header className="adm-offres-tete">
        {revenir('-ml-2')}
        <button type="button" onClick={fermer} className={`${classeBouton.icone} ml-auto`} aria-label="Fermer"><Icone nom="ui-fermer" taille={18} /></button>
      </header>
      <div className="adm-offres-corps"><div className="adm-recap-corps">{corps}</div></div>
      <footer className="adm-offres-pied">{paiement}</footer>
    </div>
  );
  return (
    <div className="adm-recap" data-apercu={vue ? '' : undefined} data-seul={vue ? undefined : ''} aria-labelledby={`${id}-recap`}>
      <div className="adm-recap-corps">{corps}<div className="mt-1">{paiement}</div></div>
      {vue ? (
        <aside className="adm-recap-apercu" aria-label={`Ta page avec ${o.nom}`}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] font-medium text-[#5f5f5a]">Ta page avec {o.nom}</p>
            <button type="button" onClick={fermer} className={classeBouton.icone} aria-label="Fermer"><Icone nom="ui-fermer" taille={18} /></button>
          </div>
          {/* La vraie page, rendue à 390 px puis réduite : sans la mention, avec ce que l'offre ouvre. On la regarde, on n'y touche pas. */}
          <div className="adm-recap-cadre" inert>
            <div className="adm-apercu" style={{ width: 390, height: 880, transform: 'scale(0.6)', transformOrigin: '0 0' }}>
              <PageLiens page={vue(plan)} apercu />
            </div>
          </div>
        </aside>
      ) : <button type="button" onClick={fermer} className={`${classeBouton.icone} absolute right-3 top-3`} aria-label="Fermer"><Icone nom="ui-fermer" taille={18} /></button>}
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
  const [envoi, setEnvoi] = useState<'' | 'resiliation' | 'portail'>('');
  const [erreur, setErreur] = useState('');
  const nom = OFFRES[abonnement.payee].nom;
  const fin = abonnement.finPeriode;
  // Une offre offerte qui court encore après la période payée prend la suite : on ne perd que ce qu'elle ne comprend pas.
  const apres = apresAbonnement(abonnement, fin);
  const pertes = rang(abonnement.payee) > rang(apres) ? avantagesEntre(apres, abonnement.payee) : [];

  async function confirmer() {
    setEnvoi('resiliation');
    setErreur('');
    try { await resilier(); vibrer(8); fermer(); return; }
    catch (error) { setErreur((error as Error).message || 'Creem ne répond pas. Réessaie dans un instant.'); }
    setEnvoi('');
  }
  async function versPortail() {
    if (!ouvrirPortail) return;
    setEnvoi('portail');
    try { location.href = await ouvrirPortail(); return; }
    catch (error) { setErreur((error as Error).message || 'Le portail ne répond pas. Réessaie dans un instant.'); }
    setEnvoi('');
  }

  const revenir = (classe: string) => (
    <button type="button" onClick={retour} className={`adm-fil-retour ${classe}`}><Icone nom="ui-chevron" taille={16} className="rotate-90" />Les offres</button>
  );
  const corps = (
    <>
      {grand && revenir('-ml-2 self-start')}
      <h2 id={`${id}-recap`} tabIndex={-1} className="adm-recap-titre">Repasser en Gratuit</h2>
      <dl className="adm-recap-lignes">
        <div><dt>Ton offre {nom}</dt><dd data-fort>{fin ? `Jusqu’au ${dateLongue(fin)}` : 'Jusqu’à la fin de la période payée'}</dd></div>
        <div><dt>Ensuite</dt><dd>{apres === 'gratuit' ? 'Gratuit' : `${OFFRES[apres].nom} offert`}, plus aucun prélèvement</dd></div>
      </dl>
      {pertes.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h3 className="adm-recap-sous-titre">{fin ? `Ce qui s’arrête le ${dateCourte(fin)}` : 'Ce qui s’arrête ensuite'}</h3>
          <ul className="adm-offre-liste adm-recap-liste" data-perte>
            {pertes.map(a => <li key={a}>{a}</li>)}
          </ul>
        </div>
      )}
      <p className="adm-recap-periode-detail">Rien n’est effacé : reprendre une offre remet tout en place.</p>
    </>
  );
  const geste = (
    <div className="flex flex-col gap-2.5">
      <button type="button" onClick={confirmer} disabled={!!envoi} className={`${classeBouton.principal} w-full`}>
        {envoi === 'resiliation' ? 'Résiliation…' : 'Résilier mon abonnement'}
      </button>
      <p className="adm-offres-note">Sans frais. Tes factures restent chez Creem.</p>
      {erreur && <p role="alert" className="text-[13.5px] text-red-300">{erreur}</p>}
      {/* Creem refuse : son portail résilie aussi, d'un lien à usage unique. */}
      {erreur && ouvrirPortail && (
        <button type="button" onClick={versPortail} disabled={!!envoi} className={`${classeBouton.secondaire} w-full`}>
          {envoi === 'portail' ? 'Ouverture…' : <>Résilier chez Creem<Icone nom="ui-ouvrir" taille={15} className="shrink-0" /></>}
        </button>
      )}
    </div>
  );

  if (!grand) return (
    <div className="adm-offres" aria-labelledby={`${id}-recap`}>
      <header className="adm-offres-tete">
        {revenir('-ml-2')}
        <button type="button" onClick={fermer} className={`${classeBouton.icone} ml-auto`} aria-label="Fermer"><Icone nom="ui-fermer" taille={18} /></button>
      </header>
      <div className="adm-offres-corps"><div className="adm-recap-corps">{corps}</div></div>
      <footer className="adm-offres-pied">{geste}</footer>
    </div>
  );
  return (
    <div className="adm-recap" data-seul="" aria-labelledby={`${id}-recap`}>
      <div className="adm-recap-corps">{corps}<div className="mt-1">{geste}</div></div>
      <button type="button" onClick={fermer} className={`${classeBouton.icone} absolute right-3 top-3`} aria-label="Fermer"><Icone nom="ui-fermer" taille={18} /></button>
    </div>
  );
}

/* ---- Le retour du paiement ---- */

/** Le picto de chaque avantage, celui que la fonction porte ailleurs dans le back office. Un avantage inconnu prend la coche. */
const PICTOS: { avantage: string; picto: string }[] = [
  { avantage: 'Sans la mention « Crée ta page avec Hopla »', picto: 'check' },
  { avantage: 'Tes couleurs', picto: 'pinceau' },
  { avantage: 'Tes liens programmés à l’avance', picto: 'agenda' },
  { avantage: 'Les avis de tes clients', picto: 'etoile' },
  { avantage: 'Tes stats sur 30 jours', picto: 'courbe' },
  { avantage: 'Ta page selon l’heure', picto: 'horloge' },
  { avantage: 'Les drops : un code, des places comptées', picto: 'cadenas' },
  { avantage: 'Ta liste e-mail, vers ta newsletter', picto: 'courrier' },
  { avantage: 'Tes stats sur un an', picto: 'courbe' },
  { avantage: 'Ton propre nom de domaine', picto: 'globe' },
  { avantage: 'Jusqu’à trois pages', picto: 'document' },
];
const pictoDe = (a: string) => PICTOS.find(x => x.avantage === a)?.picto ?? 'check';

/**
 * Au retour de Creem : « On active ton offre… » tant que le webhook n'est pas
 * passé (le back office relit l'abonnement, il ne l'accorde jamais), puis
 * « C'est fait » et ce qui vient de s'ouvrir. Sans nouvelles au bout de trente
 * secondes, on le dit, sans rien promettre de plus : l'offre arrivera seule.
 */
export function RetourPaiement({ achat, etape, onFermer, action }: { achat: Achat; etape: EtapeRetour; onFermer: () => void; action?: { texte: string; faire: () => void } }) {
  const id = useId();
  const nom = OFFRES[achat.plan].nom;
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
    ? (meme && achat.periode ? `C’est fait, tu passes ${achat.periode === 'an' ? 'à l’annuel' : 'au mensuel'}` : `C’est fait, tu es en ${nom}`)
    : etape === 'attente' ? `Ton offre ${nom} arrive` : `On active ton offre ${nom}…`;
  const mention = FONCTIONS_EN_MOTS.sansMention.avantage;
  return (
    <Feuille ouverte moyenne nue titre={titre} onFermer={onFermer}>
      {fermer => (
        <div className="adm-retour" aria-labelledby={id}>
          <div className="adm-retour-tete" aria-live="polite">
            {etape === 'fait' ? <Icone nom="check" taille={44} />
              : etape === 'attente' ? <Icone nom="horloge" taille={44} />
                : <span className="adm-retour-roue" aria-hidden="true" />}
            <h2 id={id} className="adm-recap-titre">{titre}</h2>
            {etape === 'fait' ? (
              <ol className="adm-retour-etapes" aria-label="Étapes">
                <li><Icone nom="ui-ok" taille={16} />{changement ? 'Changement confirmé' : 'Paiement reçu'}</li>
                <li><Icone nom="ui-ok" taille={16} />Offre activée</li>
              </ol>
            ) : etape === 'attente' ? (
              <p className="adm-retour-texte">Creem ne nous a pas encore confirmé {changement ? 'le changement' : 'ton paiement'}. Ton offre s’activera d’elle-même dès que ce sera fait : tu peux fermer cette fenêtre. Si rien n’a changé dans une heure, <a href={`mailto:${CONTACT_LEGAL}?subject=${encodeURIComponent(`Hopla : mon offre ${nom}`)}`}>écris-nous</a>.</p>
            ) : <p className="adm-retour-texte">Creem nous confirme {changement ? 'le changement' : 'ton paiement'}. Ça prend quelques secondes.</p>}
          </div>
          {ouvertes.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="adm-recap-sous-titre">Ce qui vient de s’ouvrir</h3>
              <ul className="adm-retour-liste">
                {ouvertes.map(a => (
                  <li key={a}><Icone nom={pictoDe(a)} taille={16} /><span className="flex-1">{a}</span>{a === mention && <span className="adm-retour-deja">déjà sur ta page</span>}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <div className="adm-retour-gestes">
              {etape === 'fait' && action ? (
                <>
                  <button type="button" onClick={() => fermer()} className={classeBouton.secondaire}>Fermer</button>
                  <button type="button" onClick={() => fermer(() => { onFermer(); action.faire(); })} className={classeBouton.principal}>{action.texte}</button>
                </>
              ) : <button type="button" onClick={() => fermer()} className={etape === 'fait' ? classeBouton.principal : classeBouton.secondaire}>Fermer</button>}
            </div>
            {etape === 'fait' && (
              <p className="adm-offres-note">
                {!changement ? 'Ta facture arrive par e-mail, envoyée par Creem.'
                  : sens === 'rendu' ? 'Creem te rend la différence au prorata, sur ta carte.'
                    : sens === 'facture' ? 'Creem facture la différence au prorata ; ta facture arrive par e-mail.'
                      : 'Creem facture ou rend la différence au prorata, sur ta carte.'}
              </p>
            )}
          </div>
        </div>
      )}
    </Feuille>
  );
}
