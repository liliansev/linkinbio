import { useEffect, useRef, useState } from 'react';
import { CONTACT_LEGAL } from '../lib/legal.ts';
import type { ComptePage, Reglages } from '../lib/types.ts';
import { sansSchema, urlPage } from '../lib/types.ts';
import { adresseSaisie } from '../lib/valider.ts';
import { redirectionActive } from '../lib/sorties.ts';
import type { Abonnement as EtatAbonnement, Fonction, Plan } from '../lib/abonnement.ts';
import { OFFRES, accesAbonnement, apresOffre, estPaye, estResilie, euros, offerteAuDessus } from '../lib/abonnement.ts';
import { BoutonCopier, BoutonPrincipal, BoutonSecondaire, Champ, Feuille, Groupe, Interrupteur, Ligne, LigneBascule, LigneLien, SousPage, classeBouton, classeSaisie } from './ui.tsx';
import { Facturation, nomAbonnement, nomApres, nomOffre } from './Facturation.tsx';
import { Etiquette, usePermis } from './offre.tsx';
import { telechargerQR } from './CodeQR.tsx';
import { noterPartage } from './BienDemarrer.tsx';
import { focusAuto } from '../lib/clavier';

/*
 * Réglages sur une seule page (direction B, 20 octobre 2026) : trois groupes,
 * Page, Compte et Abonnement, une ligne par réglage, le libellé à gauche, le
 * contrôle à droite. Rien ne se cache dans un tiroir : ce qui demande plus
 * qu'un geste (l'aperçu dans Google, supprimer son compte) s'ouvre dans une
 * fenêtre, les offres aussi, par-dessus ; « Gérer mon abonnement » est une
 * sous-page, avec le fil « Réglages / Mon abonnement » dans l'en-tête. Les
 * factures se lisent d'un toucher, chez Creem, pour tout compte qui a payé.
 */

const dateLongue = (ms: number) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export function OngletReglages({ reglages, compte, onChange, onDeconnexion, urlExport, supprimerMonCompte, abonnement, onOffres, ouvrirPortail, onResilier }: {
  reglages: Reglages; compte: ComptePage & { email?: string; plan: Plan }; onChange: (r: Reglages) => void; onDeconnexion: () => void;
  urlExport: string | null; supprimerMonCompte: (confirmation: string) => Promise<{ ok: boolean; message: string; aLaMain?: boolean }>;
  abonnement: EtatAbonnement;
  /** Ouvre les offres par-dessus Réglages ; absent quand le compte ne peut pas s'abonner (compte principal, paiement pas branché). */
  onOffres?: (pour?: Fonction) => void;
  ouvrirPortail: () => Promise<string>;
  /** Ouvre les offres sur « Repasser en Gratuit » : la résiliation se fait dans Hopla, pour la fin de la période payée. */
  onResilier?: () => void;
}) {
  const adresse = urlPage(compte);
  const [sous, setSous] = useState<'abonnement' | null>(null);
  const [fenetre, setFenetre] = useState<'apercu' | 'supprimer' | 'redirection' | null>(null);
  const [portail, setPortail] = useState<'' | 'ouverture' | string>('');
  // Ce qui a ouvert la sous-page reprend le focus quand on en revient (la page se redessine : on le retrouve par son id).
  const ouvreur = useRef('');
  const ouvrirSous = (id: string) => () => { ouvreur.current = id; setSous('abonnement'); scrollTo({ top: 0 }); };
  useEffect(() => {
    if (sous || !ouvreur.current) return;
    document.getElementById(ouvreur.current)?.focus({ preventScroll: true });
    ouvreur.current = '';
  }, [sous]);

  const offres = !compte.principal && !!onOffres;
  // Le résumé du lundi fait partie des stats : sans elles, la ligne porte le nom de l'offre et mène aux offres.
  const stats = usePermis('stats');
  const utm = usePermis('utm');
  const rediriger = usePermis('redirection');
  const versAilleurs = redirectionActive(reglages.redirection, Date.now(), adresse);
  const seo = (champs: Partial<Reglages['seo']>) => onChange({ ...reglages, seo: { ...reglages.seo, ...champs } });

  async function versPortail() {
    setPortail('ouverture');
    try { location.href = await ouvrirPortail(); }
    catch (error) { setPortail((error as Error).message || 'Creem ne répond pas. Réessaie dans un instant.'); }
  }

  if (sous === 'abonnement') return (
    <div className="adm-reglages">
      <SousPage nom="Mon abonnement" retour={() => setSous(null)} />
      <Facturation abonnement={abonnement} onOffres={offres ? () => onOffres?.() : undefined} ouvrirPortail={ouvrirPortail} onResilier={offres ? onResilier : undefined} />
    </div>
  );

  const paye = abonnement.payee !== 'gratuit';
  const resilie = paye && estResilie(abonnement.statut);
  const prix = paye && abonnement.periode ? OFFRES[abonnement.payee].prix[abonnement.periode] : null;
  // Une offre offerte depuis Comptes passe devant ce qu'on paie : sa fin se lit, puis l'abonnement s'il y en a un.
  const offerte = offerteAuDessus(abonnement);
  // Gérer son abonnement tant qu'il y en a un ; ses factures dès qu'on a payé une fois, même revenu en Gratuit.
  const acces = accesAbonnement(abonnement);
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
        {/* Starter : sans l'offre, pas d'interrupteur qui ne ferait rien, son nom et le chemin vers les offres. */}
        {utm
          ? <LigneBascule nom="Suivi UTM sur mes liens" actif={reglages.utm} changer={v => onChange({ ...reglages, utm: v })} />
          : <LigneLien nom="Suivi UTM sur mes liens" apres={<Etiquette fonction="utm" />} onClick={offres ? () => onOffres?.('utm') : undefined}
              label={offres ? 'Suivi UTM sur mes liens, avec Starter : voir les offres' : undefined} />}
        {rediriger ? (
          <Ligne nom="Redirection" valeur={versAilleurs ? <span className="font-medium text-bleu">{resumeRedirection(versAilleurs, reglages.redirection.fin, true)}</span> : 'Aucune'}>
            <BoutonSecondaire onClick={() => setFenetre('redirection')} aria-haspopup="dialog" aria-label={versAilleurs ? 'Modifier la redirection' : 'Rediriger ma page'}>{versAilleurs ? 'Modifier' : 'Rediriger'}</BoutonSecondaire>
          </Ligne>
        ) : (
          <LigneLien nom="Redirection" apres={<Etiquette fonction="redirection" />} onClick={offres ? () => onOffres?.('redirection') : undefined}
            label={offres ? 'Redirection, avec Starter : voir les offres' : undefined} />
        )}
      </Groupe>

      <Groupe titre="Compte">
        {compte.email && <Ligne nom="Adresse de connexion" valeur={compte.email} />}
        {stats
          ? <LigneBascule nom="Mes stats par e-mail chaque lundi" actif={reglages.resumeHebdo} changer={v => onChange({ ...reglages, resumeHebdo: v })} />
          // Réservée : pas d'interrupteur qui ne ferait rien, l'offre qui la débloque à la place, et le chemin vers les offres.
          : <LigneLien nom="Mes stats par e-mail chaque lundi" apres={<Etiquette fonction="stats" />} onClick={offres ? () => onOffres?.('stats') : undefined}
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
          <Ligne nom="Offre" valeur={<strong>{nomOffre(abonnement)}</strong>}>
            {!resilie && <BoutonSecondaire onClick={() => onOffres?.()} aria-haspopup="dialog">{paye ? 'Changer d’offre' : 'Voir les offres'}</BoutonSecondaire>}
          </Ligne>
          {offerte && (
            <Ligne nom="Fin de l’offre" valeur={<span className="tabular-nums">{offerte.jusqu ? `${dateLongue(offerte.jusqu)}, puis ${OFFRES[apresOffre(abonnement)].nom}` : 'Sans limite de durée'}</span>} />
          )}
          {offerte && paye && <Ligne nom="Abonnement" valeur={nomAbonnement(abonnement)} />}
          {paye && abonnement.statut === 'past_due' ? (
            <Ligne nom="Paiement" valeur={<span data-alerte="">Le dernier paiement n’est pas passé</span>}>
              {abonnement.portail && <BoutonSecondaire onClick={versPortail} disabled={portail === 'ouverture'}>Mettre à jour ma carte</BoutonSecondaire>}
            </Ligne>
          ) : paye && abonnement.finPeriode ? (
            <Ligne nom={resilie ? (offerte ? 'Fin de l’abonnement' : 'Fin de l’offre') : 'Prochaine échéance'}
              valeur={<span className="tabular-nums">{resilie ? (offerte ? dateLongue(abonnement.finPeriode) : `${dateLongue(abonnement.finPeriode)}, puis ${nomApres(abonnement, abonnement.finPeriode)}`) : `${dateLongue(abonnement.finPeriode)}${prix ? ` · ${euros(prix)}` : ''}`}</span>} />
          ) : null}
          {acces.gerer && <LigneLien id="reglage-abonnement" nom="Gérer mon abonnement" onClick={ouvrirSous('reglage-abonnement')} />}
          {acces.factures && (
            <LigneLien nom="Mes factures" valeur="Chez Creem" externe onClick={versPortail} disabled={portail === 'ouverture'} label="Mes factures, chez Creem" />
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

      <Feuille petite ouverte={fenetre === 'redirection'} onFermer={() => setFenetre(null)} titre="Rediriger ma page">
        {fermer => <Redirection valeur={versAilleurs ? reglages.redirection : { url: '', fin: '' }} ici={adresse}
          poser={r => { onChange({ ...reglages, redirection: r }); fermer(); }} annuler={() => fermer()} />}
      </Feuille>

      {!compte.principal && (
        <Feuille petite ouverte={fenetre === 'supprimer'} onFermer={() => setFenetre(null)} titre="Supprimer mon compte">
          {fermer => <SupprimerCompte pseudo={compte.pseudo} abonnement={paye && estPaye(abonnement) ? { nom: OFFRES[abonnement.payee].nom, resilie, fin: abonnement.finPeriode } : null}
            supprimerMonCompte={supprimerMonCompte} annuler={() => fermer()} />}
        </Feuille>
      )}
    </div>
  );
}

/** « Vers monsite.fr, jusqu’au 30 octobre » : où part la page, et jusqu'à quand ; `court`, le site seul, pour la ligne de Réglages. */
export function resumeRedirection(url: string, fin: string, court = false) {
  const site = (court ? new URL(url).hostname : sansSchema(url)).replace(/^www\./, '').replace(/\/$/, '');
  return `Vers ${site}${fin ? `, jusqu’au ${new Date(fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : ''}`;
}

/** Une date ISO vers la valeur d'un `<input type="datetime-local">`, en heure locale. */
const versLocal = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

/**
 * Toute la page renvoie vers une adresse (Starter, rattrapé de Linktree le 24 octobre 2026) : un lancement, une sortie,
 * une vidéo du jour. Jusqu'à une date, ou jusqu'à ce qu'on l'arrête. L'adresse de la page elle-même ferait tourner le
 * visiteur en rond : refusée.
 */
function Redirection({ valeur, ici, poser, annuler }: { valeur: Reglages['redirection']; ici: string; poser: (r: Reglages['redirection']) => void; annuler: () => void }) {
  const [url, setUrl] = useState(valeur.url);
  const [fin, setFin] = useState(versLocal(valeur.fin));
  const [erreur, setErreur] = useState('');
  const [erreurFin, setErreurFin] = useState('');
  function valider() {
    const propre = adresseSaisie(url);
    if (!/^https?:/.test(propre)) { setErreur('Cette adresse n’a pas l’air complète, par exemple monsite.fr/lancement'); return; }
    if (!redirectionActive({ url: propre, fin: '' }, Date.now(), ici)) { setErreur('C’est l’adresse de ta page : choisis-en une autre.'); return; }
    const iso = fin ? new Date(fin).toISOString() : '';
    if (iso && Date.parse(iso) <= Date.now()) { setErreurFin('Cette date est déjà passée.'); return; }
    poser({ url: propre, fin: iso });
  }
  return (
    // `noValidate` : « monsite.fr » se tape sans https://, Hopla le complète ; le navigateur, lui, le refuserait.
    <form noValidate onSubmit={e => { e.preventDefault(); valider(); }} className="flex flex-col gap-4 pb-1">
      <p className="text-[14px] leading-snug text-white/75">Tes visiteurs partent tout de suite vers cette adresse, sans voir ta page.</p>
      <Champ label="Adresse" erreur={erreur || undefined}>
        <input className={classeSaisie} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={url} placeholder="monsite.fr/lancement"
          onChange={e => { setUrl(e.target.value); setErreur(''); }} autoFocus={focusAuto()} />
      </Champ>
      <Champ label="Jusqu’au (facultatif)" erreur={erreurFin || undefined} aide={fin ? undefined : 'Vide : jusqu’à ce que tu l’arrêtes.'}>
        <input className={classeSaisie} type="datetime-local" value={fin} min={versLocal(new Date().toISOString())} onChange={e => { setFin(e.target.value); setErreurFin(''); }} />
      </Champ>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {valeur.url
          ? <button type="button" onClick={() => poser({ url: '', fin: '' })} className={`${classeBouton.discret} mr-auto !text-red-300`}>Arrêter la redirection</button>
          : <button type="button" onClick={annuler} className={classeBouton.discret}>Annuler</button>}
        <button type="submit" disabled={!url.trim()} className={classeBouton.principal}>{valeur.url ? 'Enregistrer' : 'Rediriger'}</button>
      </div>
    </form>
  );
}

/**
 * Tout effacer, pour de bon : le pseudo tapé en entier confirme. Un abonnement en cours est résilié avec, tout de
 * suite (voir `server/suppression.ts`) ; si Creem ne l'a pas confirmé, on le dit avant de quitter le back office.
 */
function SupprimerCompte({ pseudo, abonnement, supprimerMonCompte, annuler }: {
  pseudo: string; abonnement: { nom: string; resilie: boolean; fin: number | null } | null;
  supprimerMonCompte: (confirmation: string) => Promise<{ ok: boolean; message: string; aLaMain?: boolean }>; annuler: () => void;
}) {
  const [saisie, setSaisie] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [fin, setFin] = useState('');
  // Le compte n'existe plus : fermer la fenêtre, d'un geste ou d'un autre, quitte le back office.
  const supprime = useRef(false);
  useEffect(() => () => { if (supprime.current) location.replace('/'); }, []);
  async function supprimer() {
    setEnvoi(true);
    setErreur('');
    try {
      const r = await supprimerMonCompte(saisie);
      if (r.ok && r.aLaMain) { supprime.current = true; setFin(r.message); return; }
      if (r.ok) { location.replace('/'); return; }
      setErreur(r.message);
    } catch { setErreur('Le serveur ne répond pas. Réessaie dans un instant.'); }
    setEnvoi(false);
  }
  if (fin) return (
    <div className="flex flex-col gap-4 pb-1">
      <p role="status" className="text-[14px] leading-snug text-white/75">{fin}</p>
      <div className="flex justify-end"><button type="button" onClick={() => location.replace('/')} className={classeBouton.principal}>Terminé</button></div>
    </div>
  );
  return (
    <form onSubmit={e => { e.preventDefault(); if (saisie.trim().toLowerCase() === pseudo) void supprimer(); }} className="flex flex-col gap-4 pb-1">
      <p className="text-[14px] leading-snug text-white/75">Ta page disparaît tout de suite, avec tes liens, tes images et tes statistiques. Rien ne se récupère.</p>
      {/* L'abonnement s'arrête avec la page : plus rien n'est prélevé pour une page qui n'existe plus. */}
      {abonnement && (
        <p className="text-[14px] font-medium leading-snug text-amber-200">
          {abonnement.resilie
            ? `Ton offre ${abonnement.nom} s’arrête avec, sans attendre ${abonnement.fin ? `le ${dateLongue(abonnement.fin)}` : 'la fin de la période payée'}. Tes factures restent chez Creem.`
            : `Ton abonnement ${abonnement.nom} est résilié avec, tout de suite : plus aucun prélèvement, sans remboursement automatique des jours déjà payés. Tes factures restent chez Creem.`}
        </p>
      )}
      <Champ label={`Pour confirmer, tape ton pseudo, ${pseudo}`} erreur={erreur || undefined}>
        <input className={classeSaisie} value={saisie} onChange={e => setSaisie(e.target.value)} autoFocus={focusAuto()} autoCapitalize="none" autoComplete="off" spellCheck={false} />
      </Champ>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={annuler} className={classeBouton.discret}>Annuler</button>
        <button type="submit" disabled={envoi || saisie.trim().toLowerCase() !== pseudo} className={classeBouton.danger}>{envoi ? 'Suppression…' : 'Supprimer définitivement'}</button>
      </div>
    </form>
  );
}
