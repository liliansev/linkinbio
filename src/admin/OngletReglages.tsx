import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CONTACT_LEGAL } from '../lib/legal.ts';
import type { ComptePage, Reglages } from '../lib/types.ts';
import { urlPage } from '../lib/types.ts';
import type { Abonnement as EtatAbonnement, Periode, PlanPayant } from '../lib/abonnement.ts';
import { OFFRES } from '../lib/abonnement.ts';
import { Icone } from '../components/Icone.tsx';
import { Bascule, BoutonCopier, BoutonSecondaire, Carte, Champ, Interrupteur, classeBouton, classeSaisie, vibrer } from './ui.tsx';
import { Abonnement } from './Offres.tsx';
import { Etiquette, usePermis, useVoirOffres } from './offre.tsx';
import { CodeQR } from './CodeQR.tsx';

export function OngletReglages({ reglages, compte, onChange, onDeconnexion, urlExport, supprimerMonCompte, abonnement, paiement, enVente = [], ouvrirPaiement, ouvrirPortail, sectionInitiale }: {
  reglages: Reglages; compte: ComptePage; onChange: (r: Reglages) => void; onDeconnexion: () => void;
  urlExport: string | null; supprimerMonCompte: (confirmation: string) => Promise<{ ok: boolean; message: string }>;
  abonnement: EtatAbonnement; paiement: boolean; enVente?: PlanPayant[];
  ouvrirPaiement: (plan: PlanPayant, periode: Periode) => Promise<string>; ouvrirPortail: () => Promise<string>;
  sectionInitiale?: 'abonnement';
}) {
  const URL_PUBLIQUE = urlPage(compte);
  const [ouverte, setOuverte] = useState<Section | null>(sectionInitiale ?? null);
  // Ouvrir ou quitter une section déplace le focus : sur son retour en entrant, sur sa ligne en sortant.
  const retour = useRef<HTMLButtonElement>(null);
  const derniere = useRef<Section | null>(null);
  useEffect(() => {
    if (ouverte) { derniere.current = ouverte; retour.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions); }
    else if (derniere.current) document.getElementById(`reglage-${derniere.current}`)?.focus({ preventScroll: true });
  }, [ouverte]);
  const seo = (champs: Partial<Reglages['seo']>) => onChange({ ...reglages, seo: { ...reglages.seo, ...champs } });

  const offres = !compte.principal && paiement;
  // Le résumé du lundi fait partie des stats : sans elles, la ligne porte le nom de l'offre et mène aux offres.
  const stats = usePermis('stats');
  const voirOffres = useVoirOffres();
  // Un titre et une icône par ligne, sans sous-titre (Lilian, 18 octobre 2026). À droite, une valeur : l'offre en cours, ou celle qui débloque.
  const sections: { id: Section; nom: string; icone: string; valeur?: ReactNode }[] = [
    { id: 'partager', nom: 'QR code et adresse', icone: 'qr' },
    ...(offres ? [{ id: 'abonnement' as const, nom: 'Abonnement', icone: 'diamant', valeur: <span className="text-[13px] text-white/55">{OFFRES[abonnement.plan].nom}</span> }] : []),
    { id: 'partage', nom: 'Aperçu dans Google', icone: 'google' },
    { id: 'donnees', nom: 'Mes données', icone: 'cadenas' },
  ];
  const bascules: { nom: string; icone: string; actif: boolean; changer: (v: boolean) => void; reservee?: 'stats' }[] = [
    { nom: 'Ouvrir YouTube, Spotify… dans leur app', icone: 'lienExterne', actif: reglages.ouvrirApps, changer: v => onChange({ ...reglages, ouvrirApps: v }) },
    { nom: 'Mes stats par e-mail chaque lundi', icone: 'courrier', actif: reglages.resumeHebdo, changer: v => onChange({ ...reglages, resumeHebdo: v }), reservee: stats ? undefined : 'stats' },
  ];

  if (ouverte) return (
    <div className="adm-settings-detail flex flex-col gap-4">
      <div>
        <button ref={retour} type="button" onClick={() => setOuverte(null)} aria-label={`${sections.find(x => x.id === ouverte)?.nom ?? ''}, revenir à tous les réglages`}
          className="-ml-2 mb-3 flex min-h-11 items-center gap-1 rounded-xl px-2 text-[13px] font-medium text-white/60 hover:bg-white/[0.05] hover:text-white">
          <Icone nom="ui-chevron" taille={16} className="rotate-90" /> Tous les réglages
        </button>
        <h2 className="text-[18px] font-semibold tracking-[-0.025em]">{sections.find(x => x.id === ouverte)?.nom}</h2>
      </div>
      {ouverte === 'abonnement' && <Abonnement abonnement={abonnement} enVente={enVente} ouvrirPaiement={ouvrirPaiement} ouvrirPortail={ouvrirPortail} />}
      {ouverte === 'partager' && <Carte>
        <div className="adm-address flex items-center gap-2 p-1.5 pl-3.5">
          <span className="min-w-0 flex-1 truncate text-[15px] text-white">{URL_PUBLIQUE.replace(/^https:\/\//, '').replace(/\/$/, '')}</span>
          <BoutonCopier texte={URL_PUBLIQUE} />
        </div>
        <div className="mt-4 empty:hidden"><CodeQR adresse={URL_PUBLIQUE} pseudo={compte.pseudo} /></div>
        <div className="mt-4 border-t border-white/[0.06]">
          <Interrupteur label="Bouton Partager sur ma page" actif={reglages.partage} onChange={v => onChange({ ...reglages, partage: v })} />
        </div>
      </Carte>}
      {ouverte === 'partage' && <Carte>
        <div className="flex flex-col gap-3">
          {/* Ce que ces deux champs deviennent : la carte qu'affichent Google, WhatsApp ou iMessage quand on partage ta page. */}
          <p className="text-[13px] leading-snug text-white/60">Ce que montrent Google et l’aperçu quand tu partages ton lien :</p>
          <div className="w-full max-w-[420px] overflow-hidden rounded-[14px] border border-white/10 bg-white/[0.03]" aria-hidden="true">
            {reglages.profil.avatar && <img src={reglages.profil.avatar} alt="" className="aspect-[1.91/1] w-full object-cover" />}
            <div className="px-3.5 py-2.5">
              <span className="block text-[12px] text-white/50" translate="no">{URL_PUBLIQUE.replace(/^https?:\/\//, '').split('/')[0]}</span>
              <span className="block truncate text-[14.5px] font-semibold text-white">{reglages.seo.titre || reglages.profil.nom}</span>
              <span className="line-clamp-2 text-[13px] leading-snug text-white/60">{reglages.seo.description || reglages.profil.bio}</span>
            </div>
          </div>
          <Champ label="Titre dans Google et sur les réseaux" aide={`${reglages.seo.titre.length}/60 caractères conseillés`}>
            <input className={classeSaisie} value={reglages.seo.titre} maxLength={80} onChange={e => seo({ titre: e.target.value })} />
          </Champ>
          <Champ label="Description" aide={`${reglages.seo.description.length}/160 caractères conseillés`}>
            <textarea rows={4} className={classeSaisie} value={reglages.seo.description} maxLength={200} onChange={e => seo({ description: e.target.value })} />
          </Champ>
          <div className="divide-y divide-white/[0.06]">
            {compte.principal
              ? <Interrupteur label="Page visible par Google" actif={reglages.seo.indexable} onChange={v => seo({ indexable: v })} />
              : <p className="py-3 text-[13.5px] leading-snug text-white/55">Pendant la bêta, ta page n’apparaît pas dans Google. Le titre et la description servent aux aperçus quand tu partages ton lien.</p>}
          </div>
        </div>
      </Carte>}
      {ouverte === 'donnees' && <TesDonnees compte={compte} urlExport={urlExport} supprimerMonCompte={supprimerMonCompte} />}
    </div>
  );

  const lignes = (ids: Section[]) => sections.filter(l => ids.includes(l.id)).map(l => (
    <li key={l.id}>
      <button id={`reglage-${l.id}`} type="button" onClick={() => { setOuverte(l.id); scrollTo({ top: 0 }); }} className="adm-settings-row">
        <span className="adm-settings-icon"><Icone nom={l.icone} taille={19} /></span>
        <span className="min-w-0 flex-1 text-[14px] font-medium">{l.nom}</span>
        {l.valeur}
        <Icone nom="ui-chevron" taille={16} className="-rotate-90 text-white/55" />
      </button>
    </li>
  ));

  return (
    <div className="adm-settings flex flex-col gap-7">
      <section aria-labelledby="reglages-page">
        <h2 id="reglages-page" className="mb-3 text-[15px] font-semibold">Ta page</h2>
        <ul className="adm-settings-list">{lignes(['partager', 'partage'])}</ul>
      </section>
      <section aria-labelledby="reglages-preferences">
        <h2 id="reglages-preferences" className="mb-3 text-[15px] font-semibold">Préférences</h2>
        <ul className="adm-settings-list">
          {bascules.map(l => (
            <li key={l.nom}>
              {l.reservee ? (
                // Réservée : pas d'interrupteur qui ne ferait rien, l'offre qui la débloque à la place, et le chemin vers elle.
                <button type="button" onClick={voirOffres} disabled={!voirOffres} aria-label={`${l.nom}, avec Hopla Starter${voirOffres ? ' : voir les offres' : ''}`} className="adm-settings-row">
                  <span className="adm-settings-icon"><Icone nom={l.icone} taille={19} /></span>
                  <span className="min-w-0 flex-1 text-[14px] font-medium">{l.nom}</span>
                  <Etiquette fonction={l.reservee} />
                  {voirOffres && <Icone nom="ui-chevron" taille={16} className="-rotate-90 text-white/55" />}
                </button>
              ) : (
                <div className="adm-settings-row">
                  <span className="adm-settings-icon"><Icone nom={l.icone} taille={19} /></span>
                  <span className="min-w-0 flex-1 text-[14px] font-medium">{l.nom}</span>
                  <Bascule actif={l.actif} label={l.nom} onClick={() => { vibrer(); l.changer(!l.actif); }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="reglages-compte">
        <h2 id="reglages-compte" className="mb-3 text-[15px] font-semibold">Ton compte</h2>
        <ul className="adm-settings-list">{lignes(['abonnement', 'donnees'])}</ul>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
      <a href={`mailto:${CONTACT_LEGAL}?subject=${encodeURIComponent('Hopla : une question')}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-[13px] font-medium text-white/60 hover:text-white">
        <Icone nom="message" taille={18} />Une question ? Écris-nous
      </a>
      <BoutonSecondaire onClick={onDeconnexion}>Me déconnecter</BoutonSecondaire>
      </div>
    </div>
  );
}

type Section = 'partager' | 'abonnement' | 'partage' | 'donnees';

/** Le RGPD en libre-service : tout télécharger, ou tout effacer (sauf le compte principal). */
function TesDonnees({ compte, urlExport, supprimerMonCompte }: { compte: ComptePage; urlExport: string | null; supprimerMonCompte: (confirmation: string) => Promise<{ ok: boolean; message: string }> }) {
  const [ouvert, setOuvert] = useState(false);
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
  const lien = 'inline-flex min-h-11 items-center text-white/60 underline decoration-white/25 underline-offset-2 hover:text-white';
  return (
    <Carte>
      <p className="text-[13.5px] leading-snug text-white/60">Ta page, tes liens, tes images et tes statistiques, dans un fichier que tu peux garder ou importer ailleurs.</p>
      {urlExport
        ? <a href={urlExport} download className={`${classeBouton.secondaire} mt-3`}><Icone nom="telecharger" taille={16} />Télécharger mes données</a>
        : <p className="mt-3 text-[13px] text-white/55">L’export n’existe pas dans l’aperçu.</p>}
      {!compte.principal && (
        <div className="mt-5 border-t border-white/[0.06] pt-4">
          {ouvert ? (
            <div className="flex flex-col gap-3">
              <p className="text-[13.5px] leading-snug text-red-200/90">Ta page disparaît tout de suite, avec tes liens, tes images et tes statistiques. Rien ne se récupère. Pour confirmer, tape ton pseudo, <strong className="text-white">{compte.pseudo}</strong>.</p>
              <input className={classeSaisie} value={saisie} onChange={e => setSaisie(e.target.value)} autoCapitalize="none" autoComplete="off" spellCheck={false} aria-label="Ton pseudo, pour confirmer" />
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={envoi || saisie.trim().toLowerCase() !== compte.pseudo} onClick={supprimer} className={classeBouton.danger}>{envoi ? 'Suppression…' : 'Supprimer définitivement'}</button>
                <button type="button" onClick={() => { setOuvert(false); setSaisie(''); }} className={classeBouton.discret}>Annuler</button>
              </div>
              {erreur && <p role="alert" className="text-[13.5px] text-red-300">{erreur}</p>}
            </div>
          ) : (
            <button type="button" onClick={() => setOuvert(true)} className="min-h-11 rounded-xl px-1 text-[14px] font-medium text-red-300 hover:text-red-200">Supprimer mon compte</button>
          )}
        </div>
      )}
      <p className="mt-3 flex flex-wrap gap-x-4 text-[13.5px]">
        <a href="/legal/cgu" target="_blank" rel="noopener" className={lien}>Conditions d’utilisation</a>
        <a href="/legal/confidentialite" target="_blank" rel="noopener" className={lien}>Confidentialité</a>
        <a href="/legal/traitement-des-donnees" target="_blank" rel="noopener" className={lien}>Accord de traitement</a>
      </p>
    </Carte>
  );
}
