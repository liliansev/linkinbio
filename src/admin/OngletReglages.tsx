import { useEffect, useRef, useState } from 'react';
import { CONTACT_LEGAL } from '../lib/legal.ts';
import { LIEN_SOURCE } from '../lib/instance.ts';
import type { ApiCles, ComptePage, DomaineCourt, Reglages } from '../lib/types.ts';
import { DOMAINES_COURTS, adressePartage, sansSchema, urlPage } from '../lib/types.ts';
import { adresseSaisie } from '../lib/valider.ts';
import { redirectionActive } from '../lib/sorties.ts';
import type { Abonnement as EtatAbonnement, Fonction, Plan } from '../lib/abonnement.ts';
import { OFFRES, accesAbonnement, apresOffre, estPaye, estResilie, euros, offerteAuDessus, planHorsEssai, nomOffre as nomPlan } from '../lib/abonnement.ts';
import type { Langue } from '../lib/types.ts';
import { useL, useLangue } from '../accueil/langue.ts';
import { BoutonCopier, BoutonPrincipal, BoutonSecondaire, Champ, Feuille, Groupe, Interrupteur, Ligne, LigneBascule, LigneLien, PanneauDetail, Segments, SousPage, classeBouton, classeSaisie, useGrandEcran } from './ui.tsx';
import { Facturation, nomAbonnement, nomApres, nomOffre } from './Facturation.tsx';
import { Etiquette, usePermis } from './offre.tsx';
import { telechargerQR } from './CodeQR.tsx';
import { noterPartage } from './BienDemarrer.tsx';
import { focusAuto } from '../lib/clavier';
import { Icone } from '../components/Icone.tsx';
import { ApiEtMcp } from './ApiEtMcp.tsx';

/*
 * Réglages sur une seule page (direction B, 20 octobre 2026) : trois groupes,
 * Page, Compte et Abonnement, une ligne par réglage, le libellé à gauche, le
 * contrôle à droite. Rien ne se cache dans un tiroir : ce qui demande plus
 * qu'un geste (l'aperçu dans Google, supprimer son compte) s'ouvre dans une
 * fenêtre, les offres aussi, par-dessus ; « Gérer mon abonnement » est une
 * sous-page, avec le fil « Réglages / Mon abonnement » dans l'en-tête (au
 * bureau, à droite, dans `PanneauDetail`). Les factures se lisent d'un
 * toucher, chez Creem, pour tout compte qui a payé.
 */

const dateLongue = (ms: number, langue: Langue = 'fr') => new Date(ms).toLocaleDateString(langue === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });

export function OngletReglages({ reglages, compte, onChange, onDeconnexion, urlExport, supprimerMonCompte, abonnement, onOffres, ouvrirPortail, onResilier, cles }: {
  reglages: Reglages; compte: ComptePage & { email?: string; plan: Plan }; onChange: (r: Reglages) => void; onDeconnexion: () => void;
  urlExport: string | null; supprimerMonCompte: (confirmation: string) => Promise<{ ok: boolean; message: string; aLaMain?: boolean }>;
  abonnement: EtatAbonnement;
  /** Ouvre les offres par-dessus Réglages ; absent quand le compte ne peut pas s'abonner (compte principal, paiement pas branché). */
  onOffres?: (pour?: Fonction) => void;
  ouvrirPortail: () => Promise<string>;
  /** Ouvre les offres sur « Repasser en Gratuit » : la résiliation se fait dans Hopla, pour la fin de la période payée. */
  onResilier?: () => void;
  /** Les clés d'API, pour l'API et le serveur MCP ; absent dans l'aperçu sans serveur. */
  cles?: ApiCles;
}) {
  const l = useL();
  const langue = reglages.langue;
  const date = (ms: number) => dateLongue(ms, langue);
  // La page vit sur hopla.page ; on partage son nom court s'il en a choisi un.
  const adresse = urlPage(compte);
  const partage = adressePartage(compte, reglages.domaine);
  const [sous, setSous] = useState<'abonnement' | 'api' | null>(null);
  const [fenetre, setFenetre] = useState<'apercu' | 'supprimer' | 'redirection' | 'domaine' | null>(null);
  const [portail, setPortail] = useState<'' | 'ouverture' | string>('');
  // Ce qui a ouvert la sous-page reprend le focus quand on en revient (la page se redessine : on le retrouve par son id).
  const ouvreur = useRef('');
  const grand = useGrandEcran();
  const ouvrirSous = (id: string, quoi: 'abonnement' | 'api' = 'abonnement') => () => { ouvreur.current = id; setSous(quoi); if (!grand) scrollTo({ top: 0 }); };
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
  const avecApi = usePermis('api');
  const versAilleurs = redirectionActive(reglages.redirection, Date.now(), adresse);
  const seo = (champs: Partial<Reglages['seo']>) => onChange({ ...reglages, seo: { ...reglages.seo, ...champs } });

  async function versPortail() {
    setPortail('ouverture');
    try { location.href = await ouvrirPortail(); }
    catch (error) { setPortail((error as Error).message || l('Creem ne répond pas. Réessaie dans un instant.', 'Creem isn’t responding. Try again in a moment.')); }
  }

  const facturation = <Facturation abonnement={abonnement} onOffres={offres ? () => onOffres?.() : undefined} ouvrirPortail={ouvrirPortail} onResilier={offres ? onResilier : undefined} />;
  if (sous === 'abonnement' && !grand) return (
    <div className="adm-reglages">
      <SousPage nom={l('Mon abonnement', 'My subscription')} retour={() => setSous(null)} />
      {facturation}
    </div>
  );
  if (sous === 'api' && !grand) return (
    <div className="adm-reglages">
      <SousPage nom={l('API et MCP', 'API and MCP')} retour={() => setSous(null)} />
      <ApiEtMcp api={cles} />
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
      <Groupe titre={l('Page', 'Page')}>
        <Ligne nom={l('Mon lien', 'My link')} valeur={<span translate="no">{sansSchema(partage)}</span>}>
          <BoutonCopier texte={partage} label={l('Copier l’adresse de ta page', 'Copy your page’s address')} onCopie={noterPartage} />
        </Ligne>
        <LigneLien nom={l('Domaine', 'Domain')} valeur={<span translate="no">{reglages.domaine || sansSchema(adresse).split('/')[0]}</span>}
          onClick={() => setFenetre('domaine')} label={l('Choisir le nom de domaine de mon adresse', 'Choose the domain of my address')} />
        <Ligne nom="QR code">
          <BoutonSecondaire onClick={() => { void telechargerQR(partage, compte.pseudo); }} aria-label={l('Télécharger le QR code', 'Download the QR code')}>{l('Télécharger', 'Download')}</BoutonSecondaire>
        </Ligne>
        {/* Coupée au bureau, la valeur se lit en entier au survol. */}
        {/* Une ligne à chevron, comme les autres ouvertures de Réglages (critique série 2 : un bouton bordé faisait exception). */}
        <LigneLien nom={l('Référencement', 'SEO')} onClick={() => setFenetre('apercu')}
          valeur={<span title={[titreSeo, descriptionSeo].filter(Boolean).join(' · ') || undefined}>{[titreSeo, descriptionSeo].filter(Boolean).join(' · ') || l('Rien pour l’instant', 'Nothing yet')}</span>} />
        {/* Une langue pour le compte (8 novembre 2026) : les mots que Hopla pose sur la page (formulaires, compte à rebours,
            pied) et tout le back office. L'anglais d'abord. Son nom se lit dans les deux langues, pour qui s'y est perdu. */}
        <Ligne nom="Langue · Language" valeur={l('Ta page et ton espace Hopla', 'Your page and your Hopla dashboard')}>
          <Segments label="Langue · Language" valeur={reglages.langue} onChange={langue => onChange({ ...reglages, langue })}
            options={[{ id: 'en', nom: 'English' }, { id: 'fr', nom: 'Français' }]} />
        </Ligne>
        <LigneBascule nom={l('Bouton Partager sur ma page', 'Share button on my page')} actif={reglages.partage} changer={v => onChange({ ...reglages, partage: v })} />
        <LigneBascule nom="Deeplink" valeur={l('Ouvrir les liens dans leurs apps : YouTube, Spotify, etc.', 'Open links in their apps: YouTube, Spotify, and more.')} actif={reglages.ouvrirApps} changer={v => onChange({ ...reglages, ouvrirApps: v })} />
        {/* Starter : sans l'offre, pas d'interrupteur qui ne ferait rien, son nom et le chemin vers les offres. */}
        {utm
          ? <LigneBascule nom={l('Suivi UTM sur mes liens', 'UTM tracking on my links')} valeur={l('Tes sites voient que leurs visites viennent de Hopla', 'Your sites see that their visits come from Hopla')} actif={reglages.utm} changer={v => onChange({ ...reglages, utm: v })} />
          : <LigneLien nom={l('Suivi UTM sur mes liens', 'UTM tracking on my links')} valeur={l('Tes sites voient que leurs visites viennent de Hopla', 'Your sites see that their visits come from Hopla')} apres={<Etiquette fonction="utm" />} onClick={offres ? () => onOffres?.('utm') : undefined}
              label={offres ? l('Suivi UTM sur mes liens, avec Starter : voir les offres', 'UTM tracking on my links, with Starter: see plans') : undefined} />}
        {rediriger ? (
          <Ligne nom={l('Redirection', 'Redirect')} valeur={versAilleurs ? <span className="font-medium text-bleu">{resumeRedirection(versAilleurs, reglages.redirection.fin, true, langue)}</span> : l('Aucune', 'None')}>
            <BoutonSecondaire onClick={() => setFenetre('redirection')} aria-haspopup="dialog" aria-label={versAilleurs ? l('Modifier la redirection', 'Edit the redirect') : l('Rediriger ma page', 'Redirect my page')}>{versAilleurs ? l('Modifier', 'Edit') : l('Rediriger', 'Redirect')}</BoutonSecondaire>
          </Ligne>
        ) : (
          <LigneLien nom={l('Redirection', 'Redirect')} apres={<Etiquette fonction="redirection" />} onClick={offres ? () => onOffres?.('redirection') : undefined}
            label={offres ? l('Redirection, avec Starter : voir les offres', 'Redirect, with Starter: see plans') : undefined} />
        )}
      </Groupe>

      <Groupe titre={l('Compte', 'Account')}>
        {compte.email && <Ligne nom={l('Adresse de connexion', 'Sign-in email')} valeur={compte.email} />}
        {stats
          ? <LigneBascule nom={l('Mes stats par e-mail chaque lundi', 'My analytics by email every Monday')} actif={reglages.resumeHebdo} changer={v => onChange({ ...reglages, resumeHebdo: v })} />
          // Réservée : pas d'interrupteur qui ne ferait rien, l'offre qui la débloque à la place, et le chemin vers les offres.
          : <LigneLien nom={l('Mes stats par e-mail chaque lundi', 'My analytics by email every Monday')} apres={<Etiquette fonction="stats" />} onClick={offres ? () => onOffres?.('stats') : undefined}
              label={offres ? l('Mes stats par e-mail chaque lundi, avec Starter : voir les offres', 'My analytics by email every Monday, with Starter: see plans') : undefined} />}
        <Ligne nom={l('Mes données', 'My data')} valeur={urlExport ? undefined : l('Pas dans l’aperçu', 'Not in the preview')}>
          {urlExport && <a href={urlExport} download className={classeBouton.secondaire} aria-label={l('Télécharger mes données', 'Download my data')}>{l('Télécharger', 'Download')}</a>}
        </Ligne>
        {/* Le compte principal ne se supprime pas. */}
        {!compte.principal && (
          <Ligne nom={l('Supprimer mon compte', 'Delete my account')}>
            <BoutonSecondaire onClick={() => setFenetre('supprimer')} aria-haspopup="dialog" className="!text-red-300">{l('Supprimer', 'Delete')}</BoutonSecondaire>
          </Ligne>
        )}
      </Groupe>

      {/* L'API et le serveur MCP (28 octobre 2026) : la sous-page s'ouvre aussi sans Pro, pour révoquer une clé déjà créée. */}
      <Groupe titre={l('Agents IA', 'AI agents')}>
        <LigneLien id="reglage-api" nom={l('API et MCP', 'API and MCP')} valeur={l('Ta page pilotée par Claude, ChatGPT, Cursor…', 'Your page run by Claude, ChatGPT, Cursor…')} apres={avecApi ? undefined : <Etiquette fonction="api" />}
          courant={sous === 'api'} onClick={ouvrirSous('reglage-api', 'api')} />
      </Groupe>

      {offres && (
        <Groupe titre={l('Abonnement', 'Subscription')}>
          <Ligne nom={l('Offre', 'Plan')} valeur={<strong>{nomOffre(abonnement, langue)}</strong>}>
            {!resilie && <BoutonSecondaire onClick={() => onOffres?.()} aria-haspopup="dialog">{paye ? l('Changer d’offre', 'Change plan') : l('Voir les offres', 'See plans')}</BoutonSecondaire>}
          </Ligne>
          {/* L'essai de Pro : sa fin, et ce que la page garde ensuite. */}
          {abonnement.essai && (
            <Ligne nom={l('Fin de l’essai', 'Trial ends')} valeur={<span className="tabular-nums">{`${date(abonnement.essai)}, ${l('puis', 'then')} ${nomPlan(planHorsEssai(abonnement), langue)}`}</span>} />
          )}
          {offerte && (
            <Ligne nom={l('Fin de l’offre', 'Plan ends')} valeur={<span className="tabular-nums">{offerte.jusqu ? `${date(offerte.jusqu)}, ${l('puis', 'then')} ${nomPlan(apresOffre(abonnement), langue)}` : l('Sans limite de durée', 'No end date')}</span>} />
          )}
          {offerte && paye && <Ligne nom={l('Abonnement', 'Subscription')} valeur={nomAbonnement(abonnement, langue)} />}
          {paye && abonnement.statut === 'past_due' ? (
            <Ligne nom={l('Paiement', 'Payment')} valeur={<span data-alerte="">{l('Le dernier paiement n’est pas passé', 'The last payment didn’t go through')}</span>}>
              {abonnement.portail && <BoutonSecondaire onClick={versPortail} disabled={portail === 'ouverture'}>{l('Mettre à jour ma carte', 'Update my card')}</BoutonSecondaire>}
            </Ligne>
          ) : paye && abonnement.finPeriode ? (
            <Ligne nom={resilie ? (offerte ? l('Fin de l’abonnement', 'Subscription ends') : l('Fin de l’offre', 'Plan ends')) : l('Prochaine échéance', 'Next payment')}
              valeur={<span className="tabular-nums">{resilie ? (offerte ? date(abonnement.finPeriode) : `${date(abonnement.finPeriode)}, ${l('puis', 'then')} ${nomApres(abonnement, abonnement.finPeriode, langue)}`) : `${date(abonnement.finPeriode)}${prix ? ` · ${euros(prix, langue)}` : ''}`}</span>} />
          ) : null}
          {acces.gerer && <LigneLien id="reglage-abonnement" nom={l('Gérer mon abonnement', 'Manage my subscription')} courant={sous === 'abonnement'} onClick={ouvrirSous('reglage-abonnement')} />}
          {acces.factures && (
            <LigneLien nom={l('Mes factures', 'My invoices')} valeur={l('Chez Creem', 'At Creem')} externe onClick={versPortail} disabled={portail === 'ouverture'} label={l('Mes factures, chez Creem', 'My invoices, at Creem')} />
          )}
        </Groupe>
      )}
      {portail && portail !== 'ouverture' && <p role="alert" className="-mt-3 text-[13.5px] text-red-300">{portail}</p>}

      <footer className="adm-reglages-pied">
        <p>{l('Une question\u202f?', 'A question?')} <a href={`mailto:${CONTACT_LEGAL}?subject=${encodeURIComponent(l('Hopla : une question', 'Hopla: a question'))}`}>{l('Écris-nous', 'Write to us')}</a></p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <a href="/legal/cgu" target="_blank" rel="noopener">{l('Conditions d’utilisation', 'Terms of use')}</a>
          <a href="/legal/confidentialite" target="_blank" rel="noopener">{l('Confidentialité', 'Privacy')}</a>
          <a href="/legal/traitement-des-donnees" target="_blank" rel="noopener">{l('Accord de traitement', 'Data processing agreement')}</a>
          {LIEN_SOURCE && <a href={LIEN_SOURCE} target="_blank" rel="noopener">{l('Code source', 'Source code')}</a>}
        </p>
      </footer>
      {sous === 'abonnement' && (
        <PanneauDetail titre={l('Mon abonnement', 'My subscription')} fermer={() => setSous(null)}>
          <div className="adm-reglages">{facturation}</div>
        </PanneauDetail>
      )}
      {sous === 'api' && (
        <PanneauDetail titre={l('API et MCP', 'API and MCP')} fermer={() => setSous(null)}>
          <div className="adm-reglages"><ApiEtMcp api={cles} /></div>
        </PanneauDetail>
      )}
      {/* Au bureau, « Me déconnecter » est dans le menu du compte, en bas de la barre latérale. */}
      <BoutonSecondaire onClick={onDeconnexion} className="w-full lg:hidden">{l('Me déconnecter', 'Sign out')}</BoutonSecondaire>

      <Feuille ouverte={fenetre === 'apercu'} onFermer={() => setFenetre(null)} titre={l('Aperçu dans Google et les réseaux', 'Preview in Google and on social media')}
        pied={fermer => <div className="flex justify-end"><BoutonPrincipal onClick={() => fermer()} className="w-full sm:w-auto">{l('Terminé', 'Done')}</BoutonPrincipal></div>}>
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
          <Champ label={l('Titre', 'Title')} aide={l(`${reglages.seo.titre.length}/60 caractères conseillés. Vide : ton nom.`, `${reglages.seo.titre.length}/60 characters recommended. Empty: your name.`)}>
            <input className={classeSaisie} value={reglages.seo.titre} maxLength={80} placeholder={reglages.profil.nom} onChange={e => seo({ titre: e.target.value })} />
          </Champ>
          <Champ label="Description" aide={l(`${reglages.seo.description.length}/160 caractères conseillés. Vide : ta bio.`, `${reglages.seo.description.length}/160 characters recommended. Empty: your bio.`)}>
            <textarea rows={3} className={classeSaisie} value={reglages.seo.description} maxLength={200} placeholder={reglages.profil.bio} onChange={e => seo({ description: e.target.value })} />
          </Champ>
          {compte.principal
            ? <Interrupteur label={l('Page visible par Google', 'Page visible to Google')} actif={reglages.seo.indexable} onChange={v => seo({ indexable: v })} />
            : <p className="text-[13px] leading-snug text-white/60">{l('Pendant la bêta, ta page n’apparaît pas dans Google. Le titre et la description servent aux aperçus quand tu partages ton lien.', 'During the beta, your page doesn’t appear in Google. The title and description are used for previews when you share your link.')}</p>}
        </div>
      </Feuille>

      <Feuille petite ouverte={fenetre === 'domaine'} onFermer={() => setFenetre(null)} titre={l('Domaine', 'Domain')}>
        {fermer => <ChoixDomaine compte={compte} valeur={reglages.domaine} choisir={d => { onChange({ ...reglages, domaine: d }); fermer(); }} />}
      </Feuille>

      <Feuille petite ouverte={fenetre === 'redirection'} onFermer={() => setFenetre(null)} titre={l('Rediriger ma page', 'Redirect my page')}>
        {fermer => <Redirection valeur={versAilleurs ? reglages.redirection : { url: '', fin: '' }} ici={adresse}
          poser={r => { onChange({ ...reglages, redirection: r }); fermer(); }} annuler={() => fermer()} />}
      </Feuille>

      {!compte.principal && (
        <Feuille petite ouverte={fenetre === 'supprimer'} onFermer={() => setFenetre(null)} titre={l('Supprimer mon compte', 'Delete my account')}>
          {fermer => <SupprimerCompte pseudo={compte.pseudo} abonnement={paye && estPaye(abonnement) ? { nom: nomPlan(abonnement.payee, langue), resilie, fin: abonnement.finPeriode } : null}
            supprimerMonCompte={supprimerMonCompte} annuler={() => fermer()} />}
        </Feuille>
      )}
    </div>
  );
}

/**
 * Le nom de l'adresse à partager (24 octobre 2026, demandé par Lilian) : hopla.page, ou un nom plus court. Toutes les
 * adresses mènent à la même page, et les anciennes continuent de marcher : changer ne casse aucun lien déjà posé.
 */
function ChoixDomaine({ compte, valeur, choisir }: { compte: ComptePage; valeur: DomaineCourt | ''; choisir: (d: DomaineCourt | '') => void }) {
  const l = useL();
  const choix: (DomaineCourt | '')[] = ['', ...DOMAINES_COURTS];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px] leading-snug text-white/75">{l('Toutes mènent à ta page. Tes liens déjà partagés continuent de marcher.', 'They all lead to your page. Links you’ve already shared keep working.')}</p>
      <div role="radiogroup" aria-label={l('Nom de domaine', 'Domain name')} className="flex flex-col">
        {choix.map(d => {
          const pris = d === valeur;
          return (
            <button key={d || 'hopla'} type="button" role="radio" aria-checked={pris} onClick={() => choisir(d)}
              className={`flex min-h-12 items-center justify-between gap-3 border-b border-white/10 text-left text-[15px] last:border-b-0 ${pris ? 'font-medium text-bleu' : 'text-white'}`}>
              <span translate="no">{sansSchema(adressePartage(compte, d))}</span>
              {pris && <Icone nom="ui-ok" taille={16} className="shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** « Vers monsite.fr, jusqu’au 30 octobre » : où part la page, et jusqu'à quand ; `court`, le site seul, pour la ligne de Réglages. */
export function resumeRedirection(url: string, fin: string, court = false, langue: Langue = 'fr') {
  const site = (court ? new URL(url).hostname : sansSchema(url)).replace(/^www\./, '').replace(/\/$/, '');
  const jour = fin ? new Date(fin).toLocaleDateString(langue === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long' }) : '';
  return langue === 'fr' ? `Vers ${site}${jour ? `, jusqu’au ${jour}` : ''}` : `To ${site}${jour ? `, until ${jour}` : ''}`;
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
  const l = useL();
  const [url, setUrl] = useState(valeur.url);
  const [fin, setFin] = useState(versLocal(valeur.fin));
  const [erreur, setErreur] = useState('');
  const [erreurFin, setErreurFin] = useState('');
  function valider() {
    const propre = adresseSaisie(url);
    if (!/^https?:/.test(propre)) { setErreur(l('Cette adresse n’a pas l’air complète, par exemple monsite.fr/lancement', 'This address doesn’t look complete, for example mysite.com/launch')); return; }
    if (!redirectionActive({ url: propre, fin: '' }, Date.now(), ici)) { setErreur(l('C’est l’adresse de ta page : choisis-en une autre.', 'That’s your page’s address: pick another one.')); return; }
    const iso = fin ? new Date(fin).toISOString() : '';
    if (iso && Date.parse(iso) <= Date.now()) { setErreurFin(l('Cette date est déjà passée.', 'This date has already passed.')); return; }
    poser({ url: propre, fin: iso });
  }
  return (
    // `noValidate` : « monsite.fr » se tape sans https://, Hopla le complète ; le navigateur, lui, le refuserait.
    <form noValidate onSubmit={e => { e.preventDefault(); valider(); }} className="flex flex-col gap-4 pb-1">
      <p className="text-[14px] leading-snug text-white/75">{l('Tes visiteurs partent tout de suite vers cette adresse, sans voir ta page.', 'Your visitors go straight to this address, without seeing your page.')}</p>
      <Champ label={l('Adresse', 'Address')} erreur={erreur || undefined}>
        <input className={classeSaisie} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={url} placeholder={l('monsite.fr/lancement', 'mysite.com/launch')}
          onChange={e => { setUrl(e.target.value); setErreur(''); }} autoFocus={focusAuto()} />
      </Champ>
      <Champ label={l('Jusqu’au (facultatif)', 'Until (optional)')} erreur={erreurFin || undefined} aide={fin ? undefined : l('Vide : jusqu’à ce que tu l’arrêtes.', 'Empty: until you stop it.')}>
        <input className={classeSaisie} type="datetime-local" value={fin} min={versLocal(new Date().toISOString())} onChange={e => { setFin(e.target.value); setErreurFin(''); }} />
      </Champ>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {valeur.url
          ? <button type="button" onClick={() => poser({ url: '', fin: '' })} className={`${classeBouton.discret} mr-auto !text-red-300`}>{l('Arrêter la redirection', 'Stop the redirect')}</button>
          : <button type="button" onClick={annuler} className={classeBouton.discret}>{l('Annuler', 'Cancel')}</button>}
        <button type="submit" disabled={!url.trim()} className={classeBouton.principal}>{valeur.url ? l('Enregistrer', 'Save') : l('Rediriger', 'Redirect')}</button>
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
  const l = useL();
  const langue = useLangue();
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
    } catch { setErreur(l('Le serveur ne répond pas. Réessaie dans un instant.', 'The server isn’t responding. Try again in a moment.')); }
    setEnvoi(false);
  }
  if (fin) return (
    <div className="flex flex-col gap-4 pb-1">
      <p role="status" className="text-[14px] leading-snug text-white/75">{fin}</p>
      <div className="flex justify-end"><button type="button" onClick={() => location.replace('/')} className={classeBouton.principal}>{l('Terminé', 'Done')}</button></div>
    </div>
  );
  return (
    <form onSubmit={e => { e.preventDefault(); if (saisie.trim().toLowerCase() === pseudo) void supprimer(); }} className="flex flex-col gap-4 pb-1">
      <p className="text-[14px] leading-snug text-white/75">{l('Ta page disparaît tout de suite, avec tes liens, tes images et tes statistiques. Rien ne se récupère.', 'Your page disappears right away, with your links, images and analytics. Nothing can be recovered.')}</p>
      {/* L'abonnement s'arrête avec la page : plus rien n'est prélevé pour une page qui n'existe plus. */}
      {abonnement && (
        <p className="text-[14px] font-medium leading-snug text-amber-200">
          {abonnement.resilie
            ? l(`Ton offre ${abonnement.nom} s’arrête avec, sans attendre ${abonnement.fin ? `le ${dateLongue(abonnement.fin)}` : 'la fin de la période payée'}. Tes factures restent chez Creem.`,
              `Your ${abonnement.nom} plan ends with it, without waiting for ${abonnement.fin ? dateLongue(abonnement.fin, langue) : 'the end of the paid period'}. Your invoices stay at Creem.`)
            : l(`Ton abonnement ${abonnement.nom} est résilié avec, tout de suite : plus aucun prélèvement, sans remboursement automatique des jours déjà payés. Tes factures restent chez Creem.`,
              `Your ${abonnement.nom} subscription is canceled with it, right away: no more charges, and no automatic refund of days already paid. Your invoices stay at Creem.`)}
        </p>
      )}
      <Champ label={l(`Pour confirmer, tape ton pseudo, ${pseudo}`, `To confirm, type your username, ${pseudo}`)} erreur={erreur || undefined}>
        <input className={classeSaisie} value={saisie} onChange={e => setSaisie(e.target.value)} autoFocus={focusAuto()} autoCapitalize="none" autoComplete="off" spellCheck={false} />
      </Champ>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={annuler} className={classeBouton.discret}>{l('Annuler', 'Cancel')}</button>
        <button type="submit" disabled={envoi || saisie.trim().toLowerCase() !== pseudo} className={classeBouton.danger}>{envoi ? l('Suppression…', 'Deleting…') : l('Supprimer définitivement', 'Delete for good')}</button>
      </div>
    </form>
  );
}
