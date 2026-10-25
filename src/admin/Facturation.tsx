import { useState } from 'react';
import type { Abonnement, Periode } from '../lib/abonnement.ts';
import { OFFRES, apresAbonnement, estResilie, euros, offerteAuDessus } from '../lib/abonnement.ts';
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

const dateLongue = (ms: number) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
export const NOM_PERIODE: Record<Periode, string> = { mois: 'mensuel', an: 'annuel' };

/** « Starter, annuel », « Gratuit » : l'offre de l'abonnement. */
export const nomAbonnement = (a: Abonnement) => `${OFFRES[a.payee].nom}${a.payee !== 'gratuit' && a.periode ? `, ${NOM_PERIODE[a.periode]}` : ''}`;
/** L'offre du compte : « Pro, à l'essai » pendant l'essai, « Pro, offert » quand l'offre offerte passe devant son abonnement, l'abonnement sinon. */
export const nomOffre = (a: Abonnement) => (a.essai ? `${OFFRES[a.plan].nom}, à l’essai` : offerteAuDessus(a) ? `${OFFRES[a.plan].nom}, offert` : a.plan === a.payee ? nomAbonnement(a) : OFFRES[a.plan].nom);
/** Ce que la page devient après l'abonnement arrêté à `fin` : « Gratuit », ou « Starter offert ». */
export const nomApres = (a: Abonnement, fin: number | null) => { const p = apresAbonnement(a, fin); return p === 'gratuit' ? OFFRES.gratuit.nom : `${OFFRES[p].nom} offert`; };

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

  async function versPortail(ou: string) {
    setOuverture(true);
    setErreur(null);
    try { location.href = await ouvrirPortail(); }
    catch (error) { setOuverture(false); setErreur({ ou, texte: (error as Error).message || 'Creem ne répond pas. Réessaie dans un instant.' }); }
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
      <Groupe titre="Ton offre">
        <Ligne nom="Offre" valeur={<strong>{nomAbonnement(abonnement)}</strong>}>
          {onOffres && !resilie && <BoutonSecondaire onClick={onOffres} aria-haspopup="dialog">{paye ? 'Changer d’offre' : 'Voir les offres'}</BoutonSecondaire>}
        </Ligne>
        {offerte && <Ligne nom="Offert en plus" valeur={`${OFFRES[offerte.plan].nom}, ${offerte.jusqu ? `jusqu’au ${dateLongue(offerte.jusqu)}` : 'sans limite de durée'}`} />}
        {prix !== null && abonnement.periode && <Ligne nom="Prix" valeur={<span className="tabular-nums">{euros(prix)} {abonnement.periode === 'an' ? 'par an' : 'par mois'} TTC</span>} />}
        {impaye ? (
          <Ligne nom="Paiement" valeur={<span data-alerte="">Le dernier paiement n’est pas passé</span>}>
            {abonnement.portail && chezCreem('offre', 'Mettre à jour ma carte')}
          </Ligne>
        ) : paye && fin ? (
          <Ligne nom={resilie ? 'Fin de l’offre' : 'Prochaine échéance'} valeur={<span className="tabular-nums">{resilie ? `${dateLongue(fin)}, puis ${nomApres(abonnement, fin)}` : dateLongue(fin)}</span>} />
        ) : null}
      </Groupe>
      {alerte('offre')}

      {abonnement.portail && (
        <>
          <Groupe titre="Moyen de paiement">
            <Ligne nom="Carte bancaire" valeur="Gérée chez Creem">{chezCreem('carte', 'Modifier chez Creem')}</Ligne>
          </Groupe>
          {alerte('carte')}
          <Groupe titre="Factures">
            <Ligne nom="Tes factures" valeur="Une à chaque paiement, en PDF">{chezCreem('factures', 'Voir chez Creem')}</Ligne>
          </Groupe>
          {alerte('factures')}
        </>
      )}

      {/* L'offre court jusqu'au bout de ce qui est payé, la page garde tout. Le récapitulatif dit ce qui s'arrête avant le geste. */}
      {paye && !resilie && onResilier && (
        <Groupe titre="Résilier">
          <Ligne className="adm-ligne-pile" nom={<span className="text-[#3d3d39]">Ta page repasse en {nomApres(abonnement, fin)} {fin ? `le ${dateLongue(fin)}` : 'à la fin de la période payée'}, avec tout son contenu.</span>}>
            <BoutonSecondaire onClick={onResilier} aria-haspopup="dialog" className="shrink-0 whitespace-nowrap">Résilier mon abonnement</BoutonSecondaire>
          </Ligne>
        </Groupe>
      )}

      <footer className="adm-reglages-pied">
        <p>Creem, revendeur officiel de Hopla, encaisse les paiements, émet les factures et gère la TVA.</p>
      </footer>
    </>
  );
}
