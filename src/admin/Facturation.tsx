import { useState } from 'react';
import type { Abonnement, Periode } from '../lib/abonnement.ts';
import { OFFRES, apresAbonnement, estResilie, montant, nomOffre as nomPlan, offerteAuDessus } from '../lib/abonnement.ts';
import type { Langue } from '../lib/types.ts';
import { useDevise, useLangue } from '../accueil/langue.ts';
import { Icone } from '../components/Icone.tsx';
import { BoutonSecondaire, Groupe, Ligne } from './ui.tsx';

/*
 * Mon abonnement, sous-page de Réglages (direction B, 20 octobre 2026) : l'offre,
 * son prix et sa prochaine échéance, puis ce que Creem garde chez lui. La carte
 * et les factures passent par le portail client de Creem (un lien à usage unique
 * que le serveur demande à Creem) : Hopla ne voit ni la carte ni les factures.
 * Résilier se fait ici même (21 octobre 2026) : les offres s'ouvrent sur
 * « Repasser en Gratuit », et Creem arrête l'abonnement à la fin de la période
 * payée. Une résiliation faite dans le portail revient par webhook. Une offre
 * offerte depuis Comptes (23 octobre 2026) ne se gère pas ici : elle ne se paie
 * pas ; elle se lit à côté de l'abonnement quand elle passe devant lui.
 */

const dateLongue = (ms: number, langue: Langue) => new Date(ms).toLocaleDateString(langue === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
export const NOM_PERIODE: Record<Periode, string> = { mois: 'mensuel', an: 'annuel' };
const NOM_PERIODE_EN: Record<Periode, string> = { mois: 'monthly', an: 'yearly' };

/** « Starter, annuel », « Gratuit » : l'offre de l'abonnement. */
export const nomAbonnement = (a: Abonnement, langue: Langue = 'fr') => `${nomPlan(a.payee, langue)}${a.payee !== 'gratuit' && a.periode ? `, ${(langue === 'fr' ? NOM_PERIODE : NOM_PERIODE_EN)[a.periode]}` : ''}`;
/** L'offre du compte : « Pro, à l'essai » pendant l'essai, « Pro, offert » quand l'offre offerte passe devant son abonnement, l'abonnement sinon. */
export const nomOffre = (a: Abonnement, langue: Langue = 'fr') => {
  const nom = nomPlan(a.plan, langue);
  if (a.essai) return langue === 'fr' ? `${nom}, à l’essai` : `${nom}, trial`;
  if (offerteAuDessus(a)) return langue === 'fr' ? `${nom}, offert` : `${nom}, free`;
  return a.plan === a.payee ? nomAbonnement(a, langue) : nom;
};
/** Ce que la page devient après l'abonnement arrêté à `fin` : « Gratuit », ou « Starter offert ». */
export const nomApres = (a: Abonnement, fin: number | null, langue: Langue = 'fr') => {
  const p = apresAbonnement(a, fin);
  return p === 'gratuit' ? nomPlan('gratuit', langue) : langue === 'fr' ? `${nomPlan(p)} offert` : `${nomPlan(p, 'en')} for free`;
};

export function Facturation({ abonnement, onOffres, ouvrirPortail, onResilier }: { abonnement: Abonnement; onOffres?: () => void; ouvrirPortail: () => Promise<string>; onResilier?: () => void }) {
  const [ouverture, setOuverture] = useState(false);
  // L'erreur s'affiche sous le groupe d'où l'on est parti : au téléphone, elle reste sous le doigt.
  const [erreur, setErreur] = useState<{ ou: string; texte: string } | null>(null);
  const paye = abonnement.payee !== 'gratuit';
  const resilie = paye && estResilie(abonnement.statut);
  const impaye = paye && abonnement.statut === 'past_due';
  const fin = abonnement.finPeriode;
  const prix = paye && abonnement.periode ? OFFRES[abonnement.payee].prix[abonnement.periode] : null;
  const offerte = offerteAuDessus(abonnement);
  const langue = useLangue();
  const devise = useDevise();
  const l = <T,>(fr: T, en: T) => (langue === 'fr' ? fr : en);
  const date = (ms: number) => dateLongue(ms, langue);

  async function versPortail(ou: string) {
    setOuverture(true);
    setErreur(null);
    try { location.href = await ouvrirPortail(); }
    catch (error) { setOuverture(false); setErreur({ ou, texte: (error as Error).message || l('Creem ne répond pas. Réessaie dans un instant.', 'Creem is not responding. Try again in a moment.') }); }
  }
  // Ce qui mène chez Creem le dit : on quitte Hopla pour son portail.
  const chezCreem = (ou: string, texte: string, label?: string) => (
    <BoutonSecondaire onClick={() => versPortail(ou)} disabled={ouverture} aria-label={label}>
      {texte}<Icone nom="ui-ouvrir" taille={14} className="shrink-0" />
    </BoutonSecondaire>
  );
  const alerte = (ou: string) => erreur?.ou === ou && <p role="alert" className="-mt-3 text-[13.5px] text-red-300">{erreur.texte}</p>;

  return (
    <>
      <Groupe titre={l('Ton offre', 'Your plan')}>
        <Ligne nom={l('Offre', 'Plan')} valeur={<strong>{nomAbonnement(abonnement, langue)}</strong>}>
          {onOffres && !resilie && <BoutonSecondaire onClick={onOffres} aria-haspopup="dialog">{paye ? l('Changer d’offre', 'Change plan') : l('Voir les offres', 'See plans')}</BoutonSecondaire>}
        </Ligne>
        {offerte && <Ligne nom={l('Offert en plus', 'Free on top')} valeur={`${nomPlan(offerte.plan, langue)}, ${offerte.jusqu ? l(`jusqu’au ${date(offerte.jusqu)}`, `until ${date(offerte.jusqu)}`) : l('sans limite de durée', 'with no end date')}`} />}
        {prix !== null && abonnement.periode && <Ligne nom={l('Prix', 'Price')} valeur={<span className="tabular-nums">{montant(prix, langue, devise)} {abonnement.periode === 'an' ? l('par an', 'per year') : l('par mois', 'per month')} {l('TTC', 'incl. tax')}</span>} />}
        {impaye ? (
          <Ligne nom={l('Paiement', 'Payment')} valeur={<span data-alerte="">{l('Le dernier paiement n’est pas passé', 'The last payment failed')}</span>}>
            {abonnement.portail && chezCreem('offre', l('Mettre à jour ma carte', 'Update my card'))}
          </Ligne>
        ) : paye && fin ? (
          <Ligne nom={resilie ? l('Fin de l’offre', 'Plan ends') : l('Prochaine échéance', 'Next payment')} valeur={<span className="tabular-nums">{resilie ? `${date(fin)}, ${l('puis', 'then')} ${nomApres(abonnement, fin, langue)}` : date(fin)}</span>} />
        ) : null}
      </Groupe>
      {alerte('offre')}

      {abonnement.portail && (
        <>
          <Groupe titre={l('Moyen de paiement', 'Payment method')}>
            <Ligne nom={l('Carte bancaire', 'Card')} valeur={l('Gérée chez Creem', 'Managed by Creem')}>{chezCreem('carte', l('Modifier chez Creem', 'Edit with Creem'))}</Ligne>
          </Groupe>
          {alerte('carte')}
          <Groupe titre={l('Factures', 'Invoices')}>
            <Ligne nom={l('Tes factures', 'Your invoices')} valeur={l('Une à chaque paiement, en PDF', 'One per payment, as PDF')}>{chezCreem('factures', l('Voir chez Creem', 'View with Creem'))}</Ligne>
          </Groupe>
          {alerte('factures')}
        </>
      )}

      {/* L'offre court jusqu'au bout de ce qui est payé, la page garde tout. Le récapitulatif dit ce qui s'arrête avant le geste. */}
      {paye && !resilie && onResilier && (
        <Groupe titre={l('Résilier', 'Cancel')}>
          <Ligne className="adm-ligne-pile" nom={<span className="text-[#3d3d39]">{l(`Ta page repasse en ${nomApres(abonnement, fin)} ${fin ? `le ${date(fin)}` : 'à la fin de la période payée'}, avec tout son contenu.`, `Your page goes back to ${nomApres(abonnement, fin, 'en')} ${fin ? `on ${date(fin)}` : 'at the end of the paid period'}, with all its content.`)}</span>}>
            <BoutonSecondaire onClick={onResilier} aria-haspopup="dialog" className="shrink-0 whitespace-nowrap">{l('Résilier mon abonnement', 'Cancel my subscription')}</BoutonSecondaire>
          </Ligne>
        </Groupe>
      )}

      <footer className="adm-reglages-pied">
        <p>{l('Creem, revendeur officiel de Hopla, encaisse les paiements, émet les factures et gère la TVA.', 'Creem, Hopla’s official reseller, takes payments, issues invoices and handles VAT.')}</p>
      </footer>
    </>
  );
}
