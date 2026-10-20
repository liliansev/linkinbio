import { useEffect, useRef, useState } from 'react';
import { CONTACT_LEGAL } from '../lib/legal.ts';
import type { ComptePage, Reglages } from '../lib/types.ts';
import { sansSchema, urlPage } from '../lib/types.ts';
import type { Abonnement as EtatAbonnement, Periode, Plan, PlanPayant } from '../lib/abonnement.ts';
import { OFFRES, estPaye, estResilie, euros } from '../lib/abonnement.ts';
import { BoutonCopier, BoutonPrincipal, BoutonSecondaire, Champ, Feuille, Groupe, Interrupteur, Ligne, LigneBascule, LigneLien, SousPage, classeBouton, classeSaisie } from './ui.tsx';
import { Abonnement } from './Offres.tsx';
import { Etiquette, usePermis } from './offre.tsx';
import { telechargerQR } from './CodeQR.tsx';
import { noterPartage } from './BienDemarrer.tsx';

/*
 * Réglages sur une seule page (direction B, 20 octobre 2026) : trois groupes,
 * Page, Compte et Abonnement, une ligne par réglage, le libellé à gauche, le
 * contrôle à droite. Rien ne se cache dans un tiroir : ce qui demande plus
 * qu'un geste (l'aperçu dans Google, supprimer son compte) s'ouvre dans une
 * fenêtre, et les offres dans une sous-page, avec le fil « Réglages / Les
 * offres » dans l'en-tête.
 */

const dateLongue = (ms: number) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const NOM_PERIODE: Record<Periode, string> = { mois: 'mensuel', an: 'annuel' };

export function OngletReglages({ reglages, compte, onChange, onDeconnexion, urlExport, supprimerMonCompte, abonnement, paiement, enVente = [], ouvrirPaiement, ouvrirPortail, sectionInitiale }: {
  reglages: Reglages; compte: ComptePage & { email?: string; plan: Plan }; onChange: (r: Reglages) => void; onDeconnexion: () => void;
  urlExport: string | null; supprimerMonCompte: (confirmation: string) => Promise<{ ok: boolean; message: string }>;
  abonnement: EtatAbonnement; paiement: boolean; enVente?: PlanPayant[];
  ouvrirPaiement: (plan: PlanPayant, periode: Periode) => Promise<string>; ouvrirPortail: () => Promise<string>;
  sectionInitiale?: 'abonnement';
}) {
  const adresse = urlPage(compte);
  const [sous, setSous] = useState<'offres' | null>(sectionInitiale === 'abonnement' ? 'offres' : null);
  const [fenetre, setFenetre] = useState<'apercu' | 'supprimer' | null>(null);
  const [portail, setPortail] = useState<'' | 'ouverture' | string>('');
  // Ce qui a ouvert la sous-page reprend le focus quand on en revient (la page se redessine : on le retrouve par son id).
  const ouvreur = useRef('');
  const ouvrirSous = (id: string) => () => { ouvreur.current = id; setSous('offres'); scrollTo({ top: 0 }); };
  useEffect(() => {
    if (sous || !ouvreur.current) return;
    document.getElementById(ouvreur.current)?.focus({ preventScroll: true });
    ouvreur.current = '';
  }, [sous]);

  const offres = !compte.principal && paiement;
  // Le résumé du lundi fait partie des stats : sans elles, la ligne porte le nom de l'offre et mène aux offres.
  const stats = usePermis('stats');
  const seo = (champs: Partial<Reglages['seo']>) => onChange({ ...reglages, seo: { ...reglages.seo, ...champs } });

  async function versPortail() {
    setPortail('ouverture');
    try { location.href = await ouvrirPortail(); }
    catch (error) { setPortail((error as Error).message || 'Creem ne répond pas. Réessaie dans un instant.'); }
  }

  if (sous === 'offres') return (
    <div className="adm-reglages">
      <SousPage nom="Les offres" retour={() => setSous(null)} />
      <Abonnement abonnement={abonnement} enVente={enVente} ouvrirPaiement={ouvrirPaiement} ouvrirPortail={ouvrirPortail} />
    </div>
  );

  const paye = abonnement.plan !== 'gratuit';
  const resilie = paye && estResilie(abonnement.statut);
  const nomOffre = `${OFFRES[abonnement.plan].nom}${paye && abonnement.periode ? `, ${NOM_PERIODE[abonnement.periode]}` : ''}`;
  const prix = paye && abonnement.periode ? OFFRES[abonnement.plan].prix[abonnement.periode] : null;
  const titreSeo = reglages.seo.titre || reglages.profil.nom;
  const descriptionSeo = reglages.seo.description || reglages.profil.bio;

  return (
    <div className="adm-reglages">
      <Groupe titre="Page">
        <Ligne nom="Adresse" valeur={<span translate="no">{sansSchema(adresse)}</span>}>
          <BoutonCopier texte={adresse} label="Copier l’adresse de ta page" onCopie={noterPartage} />
        </Ligne>
        <Ligne nom="QR code">
          <BoutonSecondaire onClick={() => { void telechargerQR(adresse, compte.pseudo); }} aria-label="Télécharger le QR code">Télécharger</BoutonSecondaire>
        </Ligne>
        <Ligne nom="Aperçu dans Google et les réseaux" valeur={[titreSeo, descriptionSeo].filter(Boolean).join(' · ') || 'Rien pour l’instant'}>
          <BoutonSecondaire onClick={() => setFenetre('apercu')} aria-haspopup="dialog" aria-label="Modifier l’aperçu dans Google et les réseaux">Modifier</BoutonSecondaire>
        </Ligne>
        <LigneBascule nom="Bouton Partager sur ma page" actif={reglages.partage} changer={v => onChange({ ...reglages, partage: v })} />
        <LigneBascule nom="Ouvrir YouTube, Spotify… dans leur app" actif={reglages.ouvrirApps} changer={v => onChange({ ...reglages, ouvrirApps: v })} />
      </Groupe>

      <Groupe titre="Compte">
        {compte.email && <Ligne nom="Adresse de connexion" valeur={compte.email} />}
        {stats
          ? <LigneBascule nom="Mes stats par e-mail chaque lundi" actif={reglages.resumeHebdo} changer={v => onChange({ ...reglages, resumeHebdo: v })} />
          // Réservée : pas d'interrupteur qui ne ferait rien, l'offre qui la débloque à la place, et le chemin vers les offres.
          : <LigneLien id="reglage-lundi" nom="Mes stats par e-mail chaque lundi" apres={<Etiquette fonction="stats" />} onClick={offres ? ouvrirSous('reglage-lundi') : undefined}
              label={offres ? 'Mes stats par e-mail chaque lundi, avec Starter : voir les offres' : undefined} />}
        <Ligne nom="Mes données" valeur={urlExport ? undefined : 'Pas dans l’aperçu'}>
          {urlExport && <a href={urlExport} download className={classeBouton.secondaire} aria-label="Télécharger mes données">Télécharger</a>}
        </Ligne>
        {/* Le compte principal ne se supprime pas. */}
        {!compte.principal && (
          <Ligne nom="Supprimer mon compte">
            <BoutonSecondaire onClick={() => setFenetre('supprimer')} aria-haspopup="dialog" className="!text-red-300">Supprimer</BoutonSecondaire>
          </Ligne>
        )}
      </Groupe>

      {offres && (
        <Groupe titre="Abonnement">
          <Ligne nom="Offre" valeur={<strong>{nomOffre}</strong>}>
            {!resilie && <BoutonSecondaire id="reglage-offre" onClick={ouvrirSous('reglage-offre')}>{paye ? 'Changer d’offre' : 'Voir les offres'}</BoutonSecondaire>}
          </Ligne>
          {paye && abonnement.statut === 'past_due' ? (
            <Ligne nom="Paiement" valeur={<span data-alerte="">Le dernier paiement n’est pas passé</span>}>
              {abonnement.portail && <BoutonSecondaire onClick={versPortail} disabled={portail === 'ouverture'}>Mettre à jour ma carte</BoutonSecondaire>}
            </Ligne>
          ) : paye && abonnement.finPeriode ? (
            <Ligne nom={resilie ? 'Fin de l’offre' : 'Prochaine échéance'}
              valeur={<span className="tabular-nums">{resilie ? `${dateLongue(abonnement.finPeriode)}, puis Gratuit` : `${dateLongue(abonnement.finPeriode)}${prix ? ` · ${euros(prix)}` : ''}`}</span>} />
          ) : null}
          {abonnement.portail && (
            <LigneLien nom="Facturation" valeur={portail === 'ouverture' ? 'Ouverture…' : 'Factures et moyen de paiement'} onClick={versPortail} disabled={portail === 'ouverture'} />
          )}
        </Groupe>
      )}
      {portail && portail !== 'ouverture' && <p role="alert" className="-mt-3 text-[13.5px] text-red-300">{portail}</p>}

      <footer className="adm-reglages-pied">
        <p>Une question&#8239;? <a href={`mailto:${CONTACT_LEGAL}?subject=${encodeURIComponent('Hopla : une question')}`}>Écris-nous</a></p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <a href="/legal/cgu" target="_blank" rel="noopener">Conditions d’utilisation</a>
          <a href="/legal/confidentialite" target="_blank" rel="noopener">Confidentialité</a>
          <a href="/legal/traitement-des-donnees" target="_blank" rel="noopener">Accord de traitement</a>
        </p>
      </footer>
      {/* Au bureau, « Me déconnecter » est dans le menu du compte, en bas de la barre latérale. */}
      <BoutonSecondaire onClick={onDeconnexion} className="w-full lg:hidden">Me déconnecter</BoutonSecondaire>

      <Feuille ouverte={fenetre === 'apercu'} onFermer={() => setFenetre(null)} titre="Aperçu dans Google et les réseaux"
        pied={fermer => <div className="flex justify-end"><BoutonPrincipal onClick={() => fermer()} className="w-full sm:w-auto">Terminé</BoutonPrincipal></div>}>
        <div className="flex flex-col gap-4">
          {/* Ce que ces deux champs deviennent : la carte qu'affichent Google, WhatsApp ou iMessage quand on partage ta page. */}
          <div className="w-full overflow-hidden rounded-[12px] border border-[#e3e3df] bg-[#fafaf9]" aria-hidden="true">
            {reglages.profil.avatar && <img src={reglages.profil.avatar} alt="" className="aspect-[1.91/1] w-full object-cover" />}
            <div className="px-3.5 py-2.5">
              <span className="block text-[12px] text-white/55" translate="no">{sansSchema(adresse).split('/')[0]}</span>
              <span className="block truncate text-[14.5px] font-semibold text-white">{titreSeo}</span>
              <span className="line-clamp-2 text-[13px] leading-snug text-white/60">{descriptionSeo}</span>
            </div>
          </div>
          <Champ label="Titre" aide={`${reglages.seo.titre.length}/60 caractères conseillés. Vide : ton nom.`}>
            <input className={classeSaisie} value={reglages.seo.titre} maxLength={80} placeholder={reglages.profil.nom} onChange={e => seo({ titre: e.target.value })} />
          </Champ>
          <Champ label="Description" aide={`${reglages.seo.description.length}/160 caractères conseillés. Vide : ta bio.`}>
            <textarea rows={3} className={classeSaisie} value={reglages.seo.description} maxLength={200} placeholder={reglages.profil.bio} onChange={e => seo({ description: e.target.value })} />
          </Champ>
          {compte.principal
            ? <Interrupteur label="Page visible par Google" actif={reglages.seo.indexable} onChange={v => seo({ indexable: v })} />
            : <p className="text-[13px] leading-snug text-white/60">Pendant la bêta, ta page n’apparaît pas dans Google. Le titre et la description servent aux aperçus quand tu partages ton lien.</p>}
        </div>
      </Feuille>

      {!compte.principal && (
        <Feuille petite ouverte={fenetre === 'supprimer'} onFermer={() => setFenetre(null)} titre="Supprimer mon compte">
          {fermer => <SupprimerCompte pseudo={compte.pseudo} abonnement={paye && !resilie && estPaye(abonnement) ? OFFRES[abonnement.plan].nom : null} supprimerMonCompte={supprimerMonCompte} annuler={() => fermer()} />}
        </Feuille>
      )}
    </div>
  );
}

/** Tout effacer, pour de bon : le pseudo tapé en entier confirme. */
function SupprimerCompte({ pseudo, abonnement, supprimerMonCompte, annuler }: { pseudo: string; abonnement: string | null; supprimerMonCompte: (confirmation: string) => Promise<{ ok: boolean; message: string }>; annuler: () => void }) {
  const [saisie, setSaisie] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  async function supprimer() {
    setEnvoi(true);
    setErreur('');
    try {
      const r = await supprimerMonCompte(saisie);
      if (r.ok) { location.replace('/'); return; }
      setErreur(r.message);
    } catch { setErreur('Le serveur ne répond pas. Réessaie dans un instant.'); }
    setEnvoi(false);
  }
  return (
    <form onSubmit={e => { e.preventDefault(); if (saisie.trim().toLowerCase() === pseudo) void supprimer(); }} className="flex flex-col gap-4 pb-1">
      <p className="text-[14px] leading-snug text-white/75">Ta page disparaît tout de suite, avec tes liens, tes images et tes statistiques. Rien ne se récupère.</p>
      {/* Supprimer la page ne touche pas à Creem : un abonnement en cours continuerait d'être payé. */}
      {abonnement && <p className="text-[14px] font-medium leading-snug text-amber-200">Ton abonnement {abonnement} continue tant que tu ne le résilies pas : résilie-le d’abord, depuis Facturation.</p>}
      <Champ label={`Pour confirmer, tape ton pseudo, ${pseudo}`} erreur={erreur || undefined}>
        <input className={classeSaisie} value={saisie} onChange={e => setSaisie(e.target.value)} autoFocus autoCapitalize="none" autoComplete="off" spellCheck={false} />
      </Champ>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={annuler} className={classeBouton.discret}>Annuler</button>
        <button type="submit" disabled={envoi || saisie.trim().toLowerCase() !== pseudo} className={classeBouton.danger}>{envoi ? 'Suppression…' : 'Supprimer définitivement'}</button>
      </div>
    </form>
  );
}
