import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { ComptePage, Reglages } from '../lib/types.ts';
import { LANGUES, urlPage } from '../lib/types.ts';
import { NOMS_LANGUES } from '../lib/langues.ts';
import { AUDIENCES, NOMS_AUDIENCES } from '../lib/provenance.ts';
import type { Audience } from '../lib/provenance.ts';
import type { Abonnement as EtatAbonnement, Periode } from '../lib/abonnement.ts';
import { AVANTAGES_PRO, TARIFS, estResilie, euros } from '../lib/abonnement.ts';
import { Icone } from '../components/Icone.tsx';
import { BoutonSecondaire, Carte, Champ, Interrupteur, classeSaisie } from './ui.tsx';

export function OngletReglages({ reglages, compte, onChange, onDeconnexion, urlExport, supprimerMonCompte, abonnement, paiement, ouvrirPaiement, ouvrirPortail }: {
  reglages: Reglages; compte: ComptePage; onChange: (r: Reglages) => void; onDeconnexion: () => void;
  urlExport: string | null; supprimerMonCompte: (confirmation: string) => Promise<{ ok: boolean; message: string }>;
  abonnement: EtatAbonnement & { pro: boolean }; paiement: boolean;
  ouvrirPaiement: (periode: Periode) => Promise<string>; ouvrirPortail: () => Promise<string>;
}) {
  const URL_PUBLIQUE = urlPage(compte);
  const [qr, setQr] = useState('');
  const [copie, setCopie] = useState(false);
  const seo = (champs: Partial<Reglages['seo']>) => onChange({ ...reglages, seo: { ...reglages.seo, ...champs } });
  useEffect(() => {
    QRCode.toDataURL(`${URL_PUBLIQUE}?s=qr`, { width: 720, margin: 2, color: { dark: '#0c121f', light: '#ffffff' }, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr(''));
  }, [URL_PUBLIQUE]);
  async function copier() {
    try { await navigator.clipboard.writeText(URL_PUBLIQUE); setCopie(true); setTimeout(() => setCopie(false), 1800); } catch { /* presse-papiers refusé */ }
  }

  return (
    <div className="flex flex-col gap-4">
      <Carte titre="Ta page">
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.06] p-1.5 pl-3.5">
          <span className="min-w-0 flex-1 truncate text-[15px] text-white">{URL_PUBLIQUE.replace(/^https:\/\//, '').replace(/\/$/, '')}</span>
          <button type="button" onClick={copier} className="min-h-10 rounded-full bg-white px-4 text-[14px] font-semibold text-nuit">{copie ? 'Copié' : 'Copier'}</button>
        </div>
        {qr && (
          <div className="mt-4 flex items-center gap-4">
            <img src={qr} alt="QR code vers ta page" className="h-28 w-28 rounded-xl bg-white p-1" />
            <div className="flex flex-col gap-2">
              <p className="text-[13.5px] leading-snug text-white/60">À imprimer sur une carte ou à projeter en fin de conférence. Les scans apparaissent dans tes stats, source « QR code ».</p>
              <a href={qr} download={`qr-${compte.pseudo}-hopla.png`} className="inline-flex min-h-10 w-fit items-center rounded-full bg-white/[0.08] px-4 text-[14px] font-medium text-white">Télécharger le QR code</a>
            </div>
          </div>
        )}
      </Carte>

      {!compte.principal && paiement && <Abonnement abonnement={abonnement} ouvrirPaiement={ouvrirPaiement} ouvrirPortail={ouvrirPortail} />}

      <Carte titre="Référencement">
        <div className="flex flex-col gap-3">
          <Champ label="Titre dans Google et sur les réseaux" aide={`${reglages.seo.titre.length}/60 caractères conseillés`}>
            <input className={classeSaisie} value={reglages.seo.titre} maxLength={80} onChange={e => seo({ titre: e.target.value })} />
          </Champ>
          <Champ label="Description" aide={`${reglages.seo.description.length}/160 caractères conseillés`}>
            <textarea className={`${classeSaisie} min-h-20`} value={reglages.seo.description} maxLength={200} onChange={e => seo({ description: e.target.value })} />
          </Champ>
          <div className="divide-y divide-white/[0.06]">
            {compte.principal
              ? <Interrupteur label="Page visible par Google" aide={reglages.seo.indexable ? 'La page peut apparaître dans les résultats de recherche.' : 'La page demande aux moteurs de ne pas l’indexer.'} actif={reglages.seo.indexable} onChange={v => seo({ indexable: v })} />
              : <p className="py-3 text-[13.5px] leading-snug text-white/55">Pendant la bêta, ta page n’apparaît pas dans Google. Le titre et la description servent aux aperçus quand tu partages ton lien.</p>}
            <Interrupteur label="Bouton Partager" aide="En haut à droite de ta page." actif={reglages.partage} onChange={v => onChange({ ...reglages, partage: v })} />
            <Interrupteur label="Vouvoyer mes visiteurs" aide={reglages.vouvoiement ? '« Votre adresse e-mail », « Votre place est gardée ».' : '« Ton adresse e-mail », « Ta place est gardée ». À changer si ta page parle en « vous ».'} actif={!!reglages.vouvoiement} onChange={v => onChange({ ...reglages, vouvoiement: v })} />
            <Interrupteur label="Le résumé de ma semaine" aide="Chaque lundi matin, par e-mail : ce qui a marché sur ta page, en quelques phrases." actif={reglages.resumeHebdo} onChange={v => onChange({ ...reglages, resumeHebdo: v })} />
            <Interrupteur label="Ouvrir les liens dans les apps" aide="Depuis Instagram, TikTok ou Facebook, un lien YouTube, Spotify ou Instagram s’ouvre dans son app plutôt que dans leur navigateur intégré." actif={reglages.ouvrirApps} onChange={v => onChange({ ...reglages, ouvrirApps: v })} />
            <VuesReseaux reglages={reglages} onChange={onChange} />
          </div>
        </div>
      </Carte>

      <Langues reglages={reglages} onChange={onChange} adresse={URL_PUBLIQUE} />

      <TesDonnees compte={compte} urlExport={urlExport} supprimerMonCompte={supprimerMonCompte} />

      <BoutonSecondaire onClick={onDeconnexion} className="self-center">Me déconnecter</BoutonSecondaire>
    </div>
  );
}

const date = (ms: number) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/** L'offre Pro : la choisir (paiement chez Creem), ou gérer l'abonnement en cours (portail Creem). */
function Abonnement({ abonnement, ouvrirPaiement, ouvrirPortail }: {
  abonnement: EtatAbonnement & { pro: boolean }; ouvrirPaiement: (periode: Periode) => Promise<string>; ouvrirPortail: () => Promise<string>;
}) {
  const [periode, setPeriode] = useState<Periode>('an');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  async function aller(ouvrir: () => Promise<string>) {
    setEnvoi(true);
    setErreur('');
    try { location.href = await ouvrir(); return; }
    catch (error) { setErreur((error as Error).message || 'Le paiement ne répond pas. Réessaie dans un instant.'); }
    setEnvoi(false);
  }
  const lien = 'text-white/60 underline decoration-white/25 underline-offset-2 hover:text-white';

  if (abonnement.pro) {
    const fin = abonnement.finPeriode ? date(abonnement.finPeriode) : '';
    const etat = estResilie(abonnement.statut)
      ? { texte: fin ? `Résilié. Ton Pro reste actif jusqu’au ${fin}, puis ta page repasse en gratuit, avec tout son contenu.` : 'Résilié. Ton Pro reste actif jusqu’à la fin de la période payée.', alerte: false }
      : abonnement.statut === 'past_due'
        ? { texte: 'Le dernier paiement n’est pas passé. Mets à jour ta carte pour garder le Pro.', alerte: true }
        : { texte: fin ? `Se renouvelle le ${fin}.` : 'Ton abonnement est actif.', alerte: false };
    return (
      <div id="abonnement" className="scroll-mt-24">
        <Carte titre="Ton abonnement" action={<span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[12.5px] font-semibold text-nuit"><Icone nom="sparkle" taille={13} />Pro</span>}>
          <p className={`text-[14px] leading-snug ${etat.alerte ? 'text-amber-200' : 'text-white/75'}`}>{etat.texte}</p>
          {abonnement.portail && (
            <>
              <button type="button" disabled={envoi} onClick={() => aller(ouvrirPortail)} className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white/[0.08] px-4 text-[14px] font-medium text-white hover:bg-white/[0.13] disabled:opacity-50">
                {envoi ? 'Ouverture…' : 'Gérer mon abonnement'} <Icone nom="ui-ouvrir" taille={15} />
              </button>
              <p className="mt-2 text-[12.5px] leading-snug text-white/45">Ta carte et tes factures, sur la page sécurisée de Creem.</p>
              {/* La loi demande une résiliation nommée comme telle, accessible sans détour. */}
              {!estResilie(abonnement.statut) && (
                <button type="button" disabled={envoi} onClick={() => aller(ouvrirPortail)} className={`mt-3 text-[13px] ${lien}`}>Résilier mon abonnement</button>
              )}
            </>
          )}
          {erreur && <p role="alert" className="mt-3 text-[13.5px] text-red-300">{erreur}</p>}
        </Carte>
      </div>
    );
  }

  const termine = ['canceled', 'expired', 'unpaid', 'paused'].includes(abonnement.statut);
  return (
    <div id="abonnement" className="scroll-mt-24">
      <Carte titre="Passer en Pro">
        {termine && <p className="mb-3 text-[13.5px] leading-snug text-white/55">Ton abonnement Pro est terminé. Ta page est en gratuit, avec tout son contenu.</p>}
        <ul className="flex flex-col gap-2">
          {AVANTAGES_PRO.map(a => (
            <li key={a} className="flex gap-2.5 text-[14px] leading-snug text-white/80">
              <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-white/10 text-white"><Icone nom="ui-ok" taille={12} /></span>{a}
            </li>
          ))}
        </ul>
        <div role="radiogroup" aria-label="Formule" className="mt-4 grid grid-cols-2 gap-2">
          {(Object.keys(TARIFS) as Periode[]).map(p => {
            const t = TARIFS[p], choisi = periode === p;
            return (
              <button key={p} type="button" role="radio" aria-checked={choisi} onClick={() => setPeriode(p)}
                className={`flex flex-col items-start rounded-2xl border px-3.5 py-3 text-left transition ${choisi ? 'border-white/30 bg-white/10' : 'border-white/10 bg-white/[0.03] hover:border-white/20'}`}>
                <span className="text-[13px] text-white/55">{p === 'an' ? 'Annuel' : 'Mensuel'}</span>
                <span className="mt-0.5 text-[20px] font-semibold tracking-tight text-white tabular-nums">{euros(t.prix)}<span className="text-[13px] font-normal text-white/50"> / {p === 'an' ? 'an' : 'mois'}</span></span>
                {'economie' in t && <span className="mt-1 rounded-full bg-white/10 px-2 py-0.5 text-[11.5px] font-semibold text-white">{t.economie}</span>}
              </button>
            );
          })}
        </div>
        <button type="button" disabled={envoi} onClick={() => aller(() => ouvrirPaiement(periode))} className="mt-3 min-h-11 w-full rounded-full bg-white px-4 text-[15px] font-semibold text-nuit transition hover:brightness-105 disabled:opacity-60">
          {envoi ? 'Ouverture du paiement…' : `Passer en Pro, ${TARIFS[periode].libelle}`}
        </button>
        {erreur && <p role="alert" className="mt-3 text-[13.5px] text-red-300">{erreur}</p>}
        <p className="mt-3 text-[12.5px] leading-snug text-white/45">
          Prix TTC. Paiement sécurisé par Creem, revendeur officiel de l’abonnement : il encaisse, envoie la facture et gère la TVA. Résiliable à tout moment, effet à la fin de la période payée.{' '}
          {abonnement.portail && <button type="button" onClick={() => aller(ouvrirPortail)} className={lien}>Mes factures</button>}
        </p>
      </Carte>
    </div>
  );
}

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
  const lien = 'text-white/60 underline decoration-white/25 underline-offset-2 hover:text-white';
  return (
    <Carte titre="Tes données">
      <p className="text-[13.5px] leading-snug text-white/60">Ta page, tes liens, tes images et tes statistiques, dans un fichier que tu peux garder ou importer ailleurs.</p>
      {urlExport
        ? <a href={urlExport} download className="mt-3 inline-flex min-h-10 items-center rounded-full bg-white/[0.08] px-4 text-[14px] font-medium text-white hover:bg-white/[0.13]">Télécharger mes données</a>
        : <p className="mt-3 text-[13px] text-white/45">L’export n’existe pas dans l’aperçu.</p>}
      {!compte.principal && (
        <div className="mt-5 border-t border-white/[0.06] pt-4">
          {ouvert ? (
            <div className="flex flex-col gap-3">
              <p className="text-[13.5px] leading-snug text-red-200/90">Ta page disparaît tout de suite, avec tes liens, tes images et tes statistiques. Rien ne se récupère. Pour confirmer, tape ton pseudo, <strong className="text-white">{compte.pseudo}</strong>.</p>
              <input className={classeSaisie} value={saisie} onChange={e => setSaisie(e.target.value)} autoCapitalize="none" autoComplete="off" spellCheck={false} aria-label="Ton pseudo, pour confirmer" />
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={envoi || saisie.trim().toLowerCase() !== compte.pseudo} onClick={supprimer} className="min-h-10 rounded-full bg-red-500 px-4 text-[14px] font-medium text-white disabled:opacity-40">{envoi ? 'Suppression…' : 'Supprimer définitivement'}</button>
                <button type="button" onClick={() => { setOuvert(false); setSaisie(''); }} className="min-h-10 rounded-full px-4 text-[14px] text-white/60 hover:text-white">Annuler</button>
              </div>
              {erreur && <p role="alert" className="text-[13.5px] text-red-300">{erreur}</p>}
            </div>
          ) : (
            <button type="button" onClick={() => setOuvert(true)} className="min-h-10 rounded-full px-1 text-[14px] font-medium text-red-300 hover:text-red-200">Supprimer mon compte</button>
          )}
        </div>
      )}
      <p className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
        <a href="/legal/cgu" target="_blank" rel="noopener" className={lien}>Conditions d’utilisation</a>
        <a href="/legal/confidentialite" target="_blank" rel="noopener" className={lien}>Confidentialité</a>
        <a href="/legal/traitement-des-donnees" target="_blank" rel="noopener" className={lien}>Accord de traitement</a>
      </p>
    </Carte>
  );
}

const EN_FRANCAIS = { en: 'Anglais', es: 'Espagnol', de: 'Allemand', it: 'Italien' } as const;

/** Les langues de la page : le visiteur la voit dans la sienne, là où les textes sont traduits. */
function Langues({ reglages, onChange, adresse }: { reglages: Reglages; onChange: (r: Reglages) => void; adresse: string }) {
  const actives = reglages.langues ?? [];
  const basculer = (l: (typeof LANGUES)[number]) => onChange({ ...reglages, langues: actives.includes(l) ? actives.filter(x => x !== l) : LANGUES.filter(x => x === l || actives.includes(x)) });
  return (
    <Carte titre="Langues de ta page">
      <p className="text-[13.5px] leading-snug text-white/60">Ta page s’affiche dans la langue du visiteur. Les boutons, le formulaire et les dates sont traduits tout seuls ; tes textes, tu les traduis dans chaque bloc (Traductions).</p>
      <div className="mt-3 divide-y divide-white/[0.06] rounded-2xl bg-white/[0.035] px-4" role="group" aria-label="Langues proposées">
        <div className="flex items-center justify-between gap-4 py-3">
          <span className="text-[15px] font-medium text-white">Français</span>
          <span className="text-[13px] text-white/45">Langue de ta page</span>
        </div>
        {LANGUES.map(l => (
          <Interrupteur key={l} label={NOMS_LANGUES[l]} aide={EN_FRANCAIS[l]} actif={actives.includes(l)} onChange={() => basculer(l)} />
        ))}
      </div>
      {actives.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          {actives.map(l => (
            <Champ key={l} label={`Ta bio en ${NOMS_LANGUES[l].toLowerCase()}`} aide={l === actives[0] ? `Pour vérifier : ${adresse.replace(/^https:\/\//, '')}?lang=${l}` : undefined}>
              <textarea className={`${classeSaisie} min-h-16`} lang={l} maxLength={300} value={reglages.bioTraduite?.[l] ?? ''} placeholder={reglages.profil.bio}
                onChange={e => onChange({ ...reglages, bioTraduite: { ...reglages.bioTraduite, [l]: e.target.value } })} />
            </Champ>
          ))}
        </div>
      )}
    </Carte>
  );
}

/** L'option « une vue par réseau » : dans « Ma page », un onglet par réseau pour cacher ce qui ne le concerne pas. */
function VuesReseaux({ reglages, onChange }: { reglages: Reglages; onChange: (r: Reglages) => void }) {
  const vues = reglages.vuesReseaux;
  const actif = vues.length > 0;
  // À l'ouverture : les réseaux déjà en tête de page, sinon Instagram et TikTok.
  const depart = (): Audience[] => {
    const siens = AUDIENCES.filter(a => reglages.reseaux.some(r => r.reseau === a));
    return siens.length ? siens : ['instagram', 'tiktok'];
  };
  const basculer = (a: Audience) => {
    const suite = vues.includes(a) ? vues.filter(x => x !== a) : AUDIENCES.filter(x => x === a || vues.includes(x));
    onChange({ ...reglages, vuesReseaux: suite });
  };
  return (
    <div>
      <Interrupteur label="Une vue par réseau" aide="Dans « Ma page », un onglet par réseau : tu caches d’un toucher ce que ceux qui arrivent d’Instagram, de TikTok ou de LinkedIn n’ont pas besoin de voir. Un seul lien dans toutes tes bios : Hopla reconnaît d’où vient le visiteur."
        actif={actif} onChange={v => onChange({ ...reglages, vuesReseaux: v ? depart() : [] })} />
      {actif && (
        <div className="grid grid-cols-3 gap-1.5 pb-3" role="group" aria-label="Réseaux qui ont leur vue">
          {AUDIENCES.map(a => (
            <button key={a} type="button" aria-pressed={vues.includes(a)} onClick={() => basculer(a)}
              className={`min-h-9 rounded-lg px-2 text-[13px] font-medium transition ${vues.includes(a) ? 'bg-white/[0.14] text-white ring-1 ring-white/30' : 'bg-white/[0.04] text-white/55 hover:bg-white/[0.08]'}`}>
              {NOMS_AUDIENCES[a]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
