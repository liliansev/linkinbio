import { useState } from 'react';
import type { Abonnement, Periode } from '../lib/abonnement.ts';
import { OFFRES, estResilie, euros } from '../lib/abonnement.ts';
import { Icone } from '../components/Icone.tsx';
import { BoutonSecondaire, Groupe, Ligne } from './ui.tsx';

/*
 * Facturation, sous-page de Réglages (direction B, 20 octobre 2026) : l'offre,
 * son prix et sa prochaine échéance, puis ce que Creem garde chez lui. La carte,
 * les factures et la résiliation passent par le portail client de Creem (un lien
 * à usage unique que le serveur demande à Creem) : Hopla ne voit ni la carte ni
 * les factures, et ne recode pas ce que Creem fait déjà. Une résiliation faite
 * là-bas revient par webhook.
 */

const dateLongue = (ms: number) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
export const NOM_PERIODE: Record<Periode, string> = { mois: 'mensuel', an: 'annuel' };

/** « Starter, annuel », « Gratuit ». */
export const nomOffre = (a: Abonnement) => `${OFFRES[a.plan].nom}${a.plan !== 'gratuit' && a.periode ? `, ${NOM_PERIODE[a.periode]}` : ''}`;

export function Facturation({ abonnement, onOffres, ouvrirPortail }: { abonnement: Abonnement; onOffres?: () => void; ouvrirPortail: () => Promise<string> }) {
  const [ouverture, setOuverture] = useState(false);
  // L'erreur s'affiche sous le groupe d'où l'on est parti : au téléphone, elle reste sous le doigt.
  const [erreur, setErreur] = useState<{ ou: string; texte: string } | null>(null);
  const paye = abonnement.plan !== 'gratuit';
  const resilie = paye && estResilie(abonnement.statut);
  const impaye = paye && abonnement.statut === 'past_due';
  const fin = abonnement.finPeriode;
  const prix = paye && abonnement.periode ? OFFRES[abonnement.plan].prix[abonnement.periode] : null;

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
        <Ligne nom="Offre" valeur={<strong>{nomOffre(abonnement)}</strong>}>
          {onOffres && !resilie && <BoutonSecondaire onClick={onOffres} aria-haspopup="dialog">{paye ? 'Changer d’offre' : 'Voir les offres'}</BoutonSecondaire>}
        </Ligne>
        {prix !== null && abonnement.periode && <Ligne nom="Prix" valeur={<span className="tabular-nums">{euros(prix)} {abonnement.periode === 'an' ? 'par an' : 'par mois'} TTC</span>} />}
        {impaye ? (
          <Ligne nom="Paiement" valeur={<span data-alerte="">Le dernier paiement n’est pas passé</span>}>
            {abonnement.portail && chezCreem('offre', 'Mettre à jour ma carte')}
          </Ligne>
        ) : paye && fin ? (
          <Ligne nom={resilie ? 'Fin de l’offre' : 'Prochaine échéance'} valeur={<span className="tabular-nums">{resilie ? `${dateLongue(fin)}, puis Gratuit` : dateLongue(fin)}</span>} />
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

      {/* La résiliation se fait chez Creem ; l'offre court jusqu'au bout de ce qui est payé, la page garde tout. */}
      {paye && !resilie && abonnement.portail && (
        <Groupe titre="Résilier">
          <Ligne className="adm-ligne-pile" nom={<span className="text-[#3d3d39]">Ta page repasse en Gratuit {fin ? `le ${dateLongue(fin)}` : 'à la fin de la période payée'}, avec tout son contenu.</span>}>
            {chezCreem('resilier', 'Résilier mon abonnement', 'Résilier mon abonnement, chez Creem')}
          </Ligne>
        </Groupe>
      )}
      {alerte('resilier')}

      <footer className="adm-reglages-pied">
        <p>Creem, revendeur officiel de Hopla, encaisse les paiements, émet les factures et gère la TVA.</p>
      </footer>
    </>
  );
}
