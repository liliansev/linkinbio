import { useState } from 'react';
import type { Abonnement as EtatAbonnement, Periode, Plan, PlanPayant } from '../lib/abonnement.ts';
import { OFFRES, PLANS, estResilie, euros, libellePrix, parMoisAnnuel } from '../lib/abonnement.ts';
import { Icone } from '../components/Icone.tsx';
import { Carte, classeBadge, classeBouton, flechesRadio, vibrer } from './ui.tsx';

/*
 * Réglages, Abonnement : les quatre offres côte à côte, à la façon de
 * Linktree (Lilian, 20 octobre 2026). Un onglet Annuel ou Mensuel, une carte
 * par offre (son prix, sa phrase, ses avantages repliés), et un seul bouton
 * qui suit le choix. Un abonné voit d'abord son abonnement, puis peut en
 * changer : Creem facture la différence au prorata.
 */

const date = (ms: number) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const lien = 'text-white/60 underline decoration-white/25 underline-offset-2 hover:text-white';

export function Abonnement({ abonnement, enVente, ouvrirPaiement, ouvrirPortail }: {
  abonnement: EtatAbonnement; enVente: PlanPayant[];
  ouvrirPaiement: (plan: PlanPayant, periode: Periode) => Promise<string>; ouvrirPortail: () => Promise<string>;
}) {
  const actuelle = abonnement.plan;
  const paye = actuelle !== 'gratuit';
  const resilie = paye && estResilie(abonnement.statut);
  const [periode, setPeriode] = useState<Periode>(abonnement.periode ?? 'an');
  const [choix, setChoix] = useState<PlanPayant | null>(null);
  const [ouverts, setOuverts] = useState<Plan[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  /** Une offre se prend si elle est en vente, et si ce n'est pas déjà la sienne sur cette période. */
  const prenable = (p: Plan): p is PlanPayant => p !== 'gratuit' && enVente.includes(p) && !resilie
    && !(p === actuelle && (abonnement.periode === null || abonnement.periode === periode));
  const pris = choix && prenable(choix) ? choix : null;

  async function aller(ouvrir: () => Promise<string>) {
    setEnvoi(true);
    setErreur('');
    try { location.href = await ouvrir(); return; }
    catch (error) { setErreur((error as Error).message || 'Le paiement ne répond pas. Réessaie dans un instant.'); }
    setEnvoi(false);
  }

  const libelle = !pris ? 'Choisis ton offre'
    : envoi ? (paye ? 'Changement d’offre…' : 'Ouverture du paiement…')
    : pris === actuelle ? `Passer à l’${periode === 'an' ? 'annuel' : 'mensuel'}, ${libellePrix(pris, periode)}`
    : `Passer en ${OFFRES[pris].nom}, ${libellePrix(pris, periode)}`;

  return (
    <div id="abonnement" className="scroll-mt-24 flex flex-col gap-5">
      {paye && <TonAbonnement abonnement={abonnement} envoi={envoi} gerer={() => aller(ouvrirPortail)} />}
      {!paye && ['canceled', 'expired', 'unpaid', 'paused'].includes(abonnement.statut) && (
        <p className="text-[13.5px] leading-snug text-white/60">Ton abonnement est terminé. Ta page est en Gratuit, avec tout son contenu.</p>
      )}

      {!resilie && (
        <section aria-labelledby="offres-titre" className="flex flex-col gap-4">
          <h3 id="offres-titre" className={paye ? 'text-[15px] font-semibold' : 'sr-only'}>{paye ? 'Changer d’offre' : 'Les offres'}</h3>
          {/* Deux onglets soulignés, comme sur Linktree : l'annuel d'abord, il revient moins cher. */}
          <div role="radiogroup" aria-label="Paiement" onKeyDown={e => flechesRadio(e)} className="adm-offres-onglets">
            {(['an', 'mois'] as Periode[]).map(p => (
              <button key={p} type="button" role="radio" aria-checked={periode === p} tabIndex={periode === p ? 0 : -1}
                onClick={() => { vibrer(4); setPeriode(p); }}>{p === 'an' ? 'Annuel' : 'Mensuel'}</button>
            ))}
          </div>

          <div role="radiogroup" aria-label="Offre" onKeyDown={e => flechesRadio(e)} className="flex flex-col gap-3">
            {PLANS.map(p => (
              <CarteOffre key={p} plan={p} periode={periode} actuelle={p === actuelle} pris={pris === p} prenable={prenable(p)}
                enVente={p === 'gratuit' || enVente.includes(p)} premier={!pris && PLANS.find(prenable) === p}
                ouvert={ouverts.includes(p)} basculer={() => setOuverts(o => (o.includes(p) ? o.filter(x => x !== p) : [...o, p]))}
                choisir={() => { if (prenable(p)) { vibrer(6); setChoix(p); } }} />
            ))}
          </div>

          <div className="adm-offres-pied">
            <button type="button" disabled={!pris || envoi} onClick={() => pris && aller(() => ouvrirPaiement(pris, periode))} className={`${classeBouton.principal} w-full`}>
              {libelle}
            </button>
            {erreur && <p role="alert" className="mt-2 text-[13.5px] text-red-300">{erreur}</p>}
          </div>

          <p className="text-[12.5px] leading-snug text-white/55">
            Prix TTC. Paiement sécurisé par Creem, revendeur officiel de l’abonnement : il encaisse, envoie la facture et gère la TVA.{' '}
            {paye ? 'Un changement d’offre compte tout de suite : Creem facture ou rembourse la différence au prorata.' : 'Résiliable à tout moment, effet à la fin de la période payée.'}{' '}
            {abonnement.portail && <button type="button" onClick={() => aller(ouvrirPortail)} className={lien}>Mes factures</button>}
          </p>
        </section>
      )}
    </div>
  );
}

/** L'abonnement en cours : son état, le portail Creem, la résiliation nommée comme telle. */
function TonAbonnement({ abonnement, envoi, gerer }: { abonnement: EtatAbonnement; envoi: boolean; gerer: () => void }) {
  const nom = OFFRES[abonnement.plan].nom;
  const fin = abonnement.finPeriode ? date(abonnement.finPeriode) : '';
  const etat = estResilie(abonnement.statut)
    ? { texte: fin ? `Résilié. Ton offre ${nom} reste active jusqu’au ${fin}, puis ta page repasse en Gratuit, avec tout son contenu.` : `Résilié. Ton offre ${nom} reste active jusqu’à la fin de la période payée.`, alerte: false }
    : abonnement.statut === 'past_due'
      ? { texte: `Le dernier paiement n’est pas passé. Mets à jour ta carte pour garder ton offre ${nom}.`, alerte: true }
      : { texte: fin ? `${abonnement.periode === 'an' ? 'Annuel' : abonnement.periode === 'mois' ? 'Mensuel' : 'Actif'}, se renouvelle le ${fin}.` : 'Ton abonnement est actif.', alerte: false };
  return (
    <Carte titre="Ton abonnement" action={<span className={classeBadge}>{nom}</span>}>
      <p className={`text-[14px] leading-snug ${etat.alerte ? 'text-amber-200' : 'text-white/75'}`}>{etat.texte}</p>
      {abonnement.portail && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button type="button" disabled={envoi} onClick={gerer} className={classeBouton.secondaire}>
            Gérer mon abonnement <Icone nom="ui-ouvrir" taille={15} />
          </button>
          {/* La loi demande une résiliation nommée comme telle, accessible sans détour. */}
          {!estResilie(abonnement.statut) && <button type="button" disabled={envoi} onClick={gerer} className={`min-h-11 text-[13px] ${lien}`}>Résilier mon abonnement</button>}
        </div>
      )}
    </Carte>
  );
}

function CarteOffre({ plan, periode, actuelle, pris, prenable, enVente, premier, ouvert, basculer, choisir }: {
  plan: Plan; periode: Periode; actuelle: boolean; pris: boolean; prenable: boolean; enVente: boolean; premier: boolean;
  ouvert: boolean; basculer: () => void; choisir: () => void;
}) {
  const o = OFFRES[plan];
  const avant = plan === 'gratuit' ? null : OFFRES[PLANS[PLANS.indexOf(plan) - 1]].nom;
  const badge = actuelle ? 'Offre actuelle' : !enVente ? 'Bientôt' : plan === 'pro' ? 'Recommandé' : null;
  const tete = (
    <>
      <span className="flex min-h-6 items-center gap-2">
        <span className="text-[17px] font-semibold tracking-[-0.02em] text-white">{o.nom}</span>
        <span className="ml-auto flex items-center gap-2.5">
          {badge && <span className={badge === 'Recommandé' ? 'adm-offre-reco' : classeBadge}>{badge}</span>}
          {prenable && <span className="adm-offre-radio" aria-hidden="true">{pris && <Icone nom="ui-ok" taille={14} />}</span>}
        </span>
      </span>
      {plan !== 'gratuit' && (
        periode === 'an' ? (
          <>
            <span className="mt-2 flex items-baseline gap-1.5"><span className="text-[26px] font-semibold leading-none tracking-[-0.03em] text-white tabular-nums">{euros(parMoisAnnuel(plan))}</span><span className="text-[14px] text-white/60">par mois</span></span>
            <span className="mt-1.5 text-[13.5px] text-white/60 tabular-nums">{euros(o.prix.an)} par an <s className="text-white/40">{euros(o.prix.mois * 12)}</s></span>
          </>
        ) : (
          <span className="mt-2 flex items-baseline gap-1.5"><span className="text-[26px] font-semibold leading-none tracking-[-0.03em] text-white tabular-nums">{euros(o.prix.mois)}</span><span className="text-[14px] text-white/60">par mois</span></span>
        )
      )}
      <span className="mt-2 text-[14px] leading-snug text-white/65">{o.phrase}</span>
    </>
  );
  return (
    <div className="adm-offre" data-pris={pris || undefined} data-actuelle={actuelle || undefined}>
      {prenable
        ? <button type="button" role="radio" aria-checked={pris} tabIndex={pris || premier ? 0 : -1} onClick={choisir} className="adm-offre-tete">{tete}</button>
        : <div className="adm-offre-tete">{tete}</div>}
      <button type="button" onClick={basculer} aria-expanded={ouvert} aria-controls={`avantages-${plan}`} className="adm-offre-plus">
        Découvre les avantages <Icone nom="ui-chevron" taille={16} className={`transition-transform duration-300 ${ouvert ? 'rotate-180' : ''}`} />
      </button>
      <div id={`avantages-${plan}`} hidden={!ouvert} className="px-[18px] pb-4">
        {avant && <p className="mb-2 text-[13px] text-white/55">Tout {avant}, et :</p>}
        <ul className="flex flex-col gap-2">
          {o.avantages.map(a => (
            <li key={a} className="flex gap-2.5 text-[14px] leading-snug text-white/80">
              <span className="mt-0.5 shrink-0 text-white" aria-hidden="true"><Icone nom="ui-ok" taille={16} /></span>{a}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
