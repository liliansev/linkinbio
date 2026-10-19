import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { CONTACT_LEGAL } from '../lib/legal.ts';
import type { ComptePage, Reglages } from '../lib/types.ts';
import { LANGUES, urlPage } from '../lib/types.ts';
import type { Abonnement as EtatAbonnement, Periode } from '../lib/abonnement.ts';
import { AVANTAGES_PRO, TARIFS, estResilie, euros } from '../lib/abonnement.ts';
import { Icone } from '../components/Icone.tsx';
import { BoutonCopier, BoutonSecondaire, Carte, Champ, Interrupteur, classeSaisie, flechesRadio, vibrer } from './ui.tsx';

export function OngletReglages({ reglages, compte, onChange, onDeconnexion, urlExport, supprimerMonCompte, abonnement, paiement, ouvrirPaiement, ouvrirPortail }: {
  reglages: Reglages; compte: ComptePage; onChange: (r: Reglages) => void; onDeconnexion: () => void;
  urlExport: string | null; supprimerMonCompte: (confirmation: string) => Promise<{ ok: boolean; message: string }>;
  abonnement: EtatAbonnement & { pro: boolean }; paiement: boolean;
  ouvrirPaiement: (periode: Periode) => Promise<string>; ouvrirPortail: () => Promise<string>;
}) {
  const URL_PUBLIQUE = urlPage(compte);
  const [qr, setQr] = useState('');
  const [ouverte, setOuverte] = useState<Section | null>(null);
  // Ouvrir ou quitter une section déplace le focus : sur son retour en entrant, sur sa ligne en sortant.
  const retour = useRef<HTMLButtonElement>(null);
  const derniere = useRef<Section | null>(null);
  useEffect(() => {
    if (ouverte) { derniere.current = ouverte; retour.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions); }
    else if (derniere.current) document.getElementById(`reglage-${derniere.current}`)?.focus({ preventScroll: true });
  }, [ouverte]);
  const seo = (champs: Partial<Reglages['seo']>) => onChange({ ...reglages, seo: { ...reglages.seo, ...champs } });
  useEffect(() => {
    QRCode.toDataURL(`${URL_PUBLIQUE}?s=qr`, { width: 720, margin: 2, color: { dark: '#0c121f', light: '#ffffff' }, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr(''));
  }, [URL_PUBLIQUE]);

  const pro = !compte.principal && paiement;
  // Un titre et une icône par ligne, sans sous-titre (Lilian, 18 octobre 2026).
  const sections: { id: Section; nom: string; icone: string }[] = [
    { id: 'partager', nom: 'Partager ma page', icone: 'partage' },
    ...(pro ? [{ id: 'abonnement' as const, nom: 'Abonnement', icone: 'diamant' }] : []),
    { id: 'partage', nom: 'Titre et description', icone: 'document' },
    { id: 'langues', nom: 'Langues', icone: 'globe' },
    { id: 'donnees', nom: 'Mes données', icone: 'cadenas' },
  ];
  const bascules: { nom: string; icone: string; actif: boolean; changer: (v: boolean) => void }[] = [
    { nom: 'Ouvrir YouTube, Spotify… dans leur app', icone: 'lienExterne', actif: reglages.ouvrirApps, changer: v => onChange({ ...reglages, ouvrirApps: v }) },
    { nom: 'Mes stats par e-mail chaque lundi', icone: 'courrier', actif: reglages.resumeHebdo, changer: v => onChange({ ...reglages, resumeHebdo: v }) },
  ];

  if (ouverte) return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-14 z-10 -mx-4 bg-nuit/95 px-3 py-1 backdrop-blur lg:top-0">
        {/* Un seul titre : le retour porte le nom de la section, la carte dessous n'en répète pas. */}
        <button ref={retour} type="button" onClick={() => setOuverte(null)} aria-label={`${sections.find(x => x.id === ouverte)?.nom ?? ''}, revenir à tous les réglages`}
          className="flex min-h-11 items-center gap-1 rounded-full pr-3 text-[15px] font-medium text-white hover:text-white/80">
          <Icone nom="ui-chevron" taille={18} className="rotate-90 text-white/60" /> {sections.find(x => x.id === ouverte)?.nom}
        </button>
      </div>
      {ouverte === 'abonnement' && <Abonnement abonnement={abonnement} ouvrirPaiement={ouvrirPaiement} ouvrirPortail={ouvrirPortail} />}
      {ouverte === 'partager' && <Carte>
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.06] p-1.5 pl-3.5">
          <span className="min-w-0 flex-1 truncate text-[15px] text-white">{URL_PUBLIQUE.replace(/^https:\/\//, '').replace(/\/$/, '')}</span>
          <BoutonCopier texte={URL_PUBLIQUE} />
        </div>
        {qr && (
          <div className="mt-4 flex flex-col items-center gap-3">
            <img src={qr} alt="QR code vers ta page" className="h-44 w-44 rounded-2xl bg-white p-1.5" />
            <a href={qr} download={`qr-${compte.pseudo}-hopla.png`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/[0.08] px-4 text-[14px] font-medium text-white"><Icone nom="telecharger" taille={16} /> Télécharger le QR code</a>
          </div>
        )}
        <div className="mt-4 border-t border-white/[0.06]">
          <Interrupteur label="Bouton Partager sur ma page" actif={reglages.partage} onChange={v => onChange({ ...reglages, partage: v })} />
        </div>
      </Carte>}
      {ouverte === 'partage' && <Carte>
        <div className="flex flex-col gap-3">
          {/* Ce que ces deux champs deviennent : la carte qu'affichent Google, WhatsApp ou iMessage quand on partage ta page. */}
          <p className="text-[13px] leading-snug text-white/60">Ce que montrent Google et l’aperçu quand tu partages ton lien :</p>
          <div className="overflow-hidden rounded-2xl bg-white/[0.05] ring-1 ring-white/[0.06]" aria-hidden="true">
            {reglages.profil.avatar && <img src={reglages.profil.avatar} alt="" className="h-24 w-full object-cover opacity-90" />}
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
            <textarea className={`${classeSaisie} min-h-20`} value={reglages.seo.description} maxLength={200} onChange={e => seo({ description: e.target.value })} />
          </Champ>
          <div className="divide-y divide-white/[0.06]">
            {compte.principal
              ? <Interrupteur label="Page visible par Google" actif={reglages.seo.indexable} onChange={v => seo({ indexable: v })} />
              : <p className="py-3 text-[13.5px] leading-snug text-white/55">Pendant la bêta, ta page n’apparaît pas dans Google. Le titre et la description servent aux aperçus quand tu partages ton lien.</p>}
          </div>
        </div>
      </Carte>}
      {ouverte === 'langues' && <Langues reglages={reglages} onChange={onChange} adresse={URL_PUBLIQUE} />}
      {ouverte === 'donnees' && <TesDonnees compte={compte} urlExport={urlExport} supprimerMonCompte={supprimerMonCompte} />}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Une ligne par sujet, qui s'ouvre à la place de la liste ; les réglages d'un seul interrupteur restent dans la liste. */}
      <ul className="overflow-hidden rounded-xl bg-white/[0.03] ring-1 ring-white/[0.07]">
        {sections.map((l, i) => (
          <li key={l.id} className={i > 0 ? 'border-t border-white/[0.07]' : ''}>
            <button id={`reglage-${l.id}`} type="button" onClick={() => { setOuverte(l.id); scrollTo({ top: 0 }); }} className="flex min-h-14 w-full items-center gap-3.5 px-4 text-left transition hover:bg-white/[0.04] active:bg-white/[0.06]">
              <Icone nom={l.icone} taille={20} className="shrink-0 text-white/80" />
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-white">{l.nom}</span>
              <Icone nom="ui-chevron" taille={16} className="-rotate-90 text-white/30" />
            </button>
          </li>
        ))}
        {bascules.map(l => (
          <li key={l.nom} className="border-t border-white/[0.07]">
            <div className="flex min-h-14 items-center gap-3.5 px-4">
              <Icone nom={l.icone} taille={20} className="shrink-0 text-white/80" />
              <span className="min-w-0 flex-1 text-[15px] font-medium text-white">{l.nom}</span>
              <button type="button" role="switch" aria-checked={l.actif} aria-label={l.nom} onClick={() => { vibrer(); l.changer(!l.actif); }}
                className={`adm-interrupteur relative h-6 w-10 shrink-0 rounded-full before:absolute before:-inset-2 before:content-[''] ${l.actif ? 'bg-white' : 'bg-white/15'}`}>
                <span className={`absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] ${l.actif ? 'translate-x-4 bg-nuit' : 'bg-white'}`} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <a href={`mailto:${CONTACT_LEGAL}?subject=${encodeURIComponent('Hopla : une question')}`}
        className="flex min-h-14 items-center gap-3.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 text-[15px] font-medium text-white transition hover:bg-white/[0.05]">
        <Icone nom="message" taille={20} className="shrink-0 text-white/80" />
        <span className="flex-1">Une question ? Écris-nous</span>
        <Icone nom="ui-chevron" taille={16} className="-rotate-90 text-white/30" />
      </a>

      <BoutonSecondaire onClick={onDeconnexion} className="self-center">Me déconnecter</BoutonSecondaire>
    </div>
  );
}

type Section = 'partager' | 'abonnement' | 'partage' | 'langues' | 'donnees';

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
        <Carte titre="Ton abonnement" action={<span className="inline-flex items-center gap-1 text-[13px] font-semibold text-white"><Icone nom="sparkle" taille={14} />Pro</span>}>
          <p className={`text-[14px] leading-snug ${etat.alerte ? 'text-amber-200' : 'text-white/75'}`}>{etat.texte}</p>
          {abonnement.portail && (
            <>
              <button type="button" disabled={envoi} onClick={() => aller(ouvrirPortail)} className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/[0.08] px-4 text-[14px] font-medium text-white hover:bg-white/[0.13] disabled:opacity-50">
                {envoi ? 'Ouverture…' : 'Gérer mon abonnement'} <Icone nom="ui-ouvrir" taille={15} />
              </button>
              <p className="mt-2 text-[12.5px] leading-snug text-white/55">Ta carte et tes factures, sur la page sécurisée de Creem.</p>
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
        <div role="radiogroup" onKeyDown={e => flechesRadio(e)} aria-label="Formule" className="mt-4 grid grid-cols-2 gap-2">
          {(Object.keys(TARIFS) as Periode[]).map(p => {
            const t = TARIFS[p], choisi = periode === p;
            return (
              <button key={p} type="button" role="radio" aria-checked={choisi} onClick={() => setPeriode(p)}
                className={`flex flex-col items-start rounded-2xl border px-3.5 py-3 text-left transition ${choisi ? 'border-white/30 bg-white/10' : 'border-white/10 bg-white/[0.03] hover:border-white/20'}`}>
                <span className="text-[13px] text-white/55">{p === 'an' ? 'Annuel' : 'Mensuel'}</span>
                <span className="mt-0.5 text-[20px] font-semibold tracking-tight text-white tabular-nums">{euros(t.prix)}<span className="text-[13px] font-normal text-white/50"> / {p === 'an' ? 'an' : 'mois'}</span></span>
                {'economie' in t && <span className="mt-1 text-[12.5px] font-semibold text-emerald-300">{t.economie}</span>}
              </button>
            );
          })}
        </div>
        <button type="button" disabled={envoi} onClick={() => aller(() => ouvrirPaiement(periode))} className="mt-3 min-h-11 w-full rounded-full bg-white px-4 text-[15px] font-semibold text-nuit transition hover:brightness-105 disabled:opacity-60">
          {envoi ? 'Ouverture du paiement…' : `Passer en Pro, ${TARIFS[periode].libelle}`}
        </button>
        {erreur && <p role="alert" className="mt-3 text-[13.5px] text-red-300">{erreur}</p>}
        <p className="mt-3 text-[12.5px] leading-snug text-white/55">
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
  const lien = 'inline-flex min-h-11 items-center text-white/60 underline decoration-white/25 underline-offset-2 hover:text-white';
  return (
    <Carte>
      <p className="text-[13.5px] leading-snug text-white/60">Ta page, tes liens, tes images et tes statistiques, dans un fichier que tu peux garder ou importer ailleurs.</p>
      {urlExport
        ? <a href={urlExport} download className="mt-3 inline-flex min-h-11 items-center rounded-full bg-white/[0.08] px-4 text-[14px] font-medium text-white hover:bg-white/[0.13]">Télécharger mes données</a>
        : <p className="mt-3 text-[13px] text-white/55">L’export n’existe pas dans l’aperçu.</p>}
      {!compte.principal && (
        <div className="mt-5 border-t border-white/[0.06] pt-4">
          {ouvert ? (
            <div className="flex flex-col gap-3">
              <p className="text-[13.5px] leading-snug text-red-200/90">Ta page disparaît tout de suite, avec tes liens, tes images et tes statistiques. Rien ne se récupère. Pour confirmer, tape ton pseudo, <strong className="text-white">{compte.pseudo}</strong>.</p>
              <input className={classeSaisie} value={saisie} onChange={e => setSaisie(e.target.value)} autoCapitalize="none" autoComplete="off" spellCheck={false} aria-label="Ton pseudo, pour confirmer" />
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={envoi || saisie.trim().toLowerCase() !== compte.pseudo} onClick={supprimer} className="min-h-11 rounded-full bg-red-500 px-4 text-[14px] font-medium text-white disabled:opacity-40">{envoi ? 'Suppression…' : 'Supprimer définitivement'}</button>
                <button type="button" onClick={() => { setOuvert(false); setSaisie(''); }} className="min-h-11 rounded-full px-4 text-[14px] text-white/60 hover:text-white">Annuler</button>
              </div>
              {erreur && <p role="alert" className="text-[13.5px] text-red-300">{erreur}</p>}
            </div>
          ) : (
            <button type="button" onClick={() => setOuvert(true)} className="min-h-11 rounded-full px-1 text-[14px] font-medium text-red-300 hover:text-red-200">Supprimer mon compte</button>
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

const EN_FRANCAIS = { en: 'Anglais', es: 'Espagnol', de: 'Allemand', it: 'Italien' } as const;

/** Les langues de la page : le visiteur la voit dans la sienne, là où les textes sont traduits. */
function Langues({ reglages, onChange, adresse }: { reglages: Reglages; onChange: (r: Reglages) => void; adresse: string }) {
  const actives = reglages.langues ?? [];
  const basculer = (l: (typeof LANGUES)[number]) => onChange({ ...reglages, langues: actives.includes(l) ? actives.filter(x => x !== l) : LANGUES.filter(x => x === l || actives.includes(x)) });
  return (
    <Carte>
      <p className="text-[13.5px] leading-snug text-white/60">Ta page s’affiche dans la langue du visiteur. Les boutons, le formulaire et les dates sont traduits tout seuls ; tes textes se traduisent en touchant un bloc de ta page, dans « Plus de réglages ».</p>
      <div className="mt-3 divide-y divide-white/[0.06] rounded-2xl bg-white/[0.035] px-4" role="group" aria-label="Langues proposées">
        <div className="flex items-center justify-between gap-4 py-3">
          <span className="text-[15px] font-medium text-white">Français</span>
          <span className="text-[13px] text-white/55">Langue de ta page</span>
        </div>
        {LANGUES.map(l => (
          <Interrupteur key={l} label={EN_FRANCAIS[l]} actif={actives.includes(l)} onChange={() => basculer(l)} />
        ))}
      </div>
      {actives.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          {actives.map(l => (
            <Champ key={l} label={`Ta bio en ${EN_FRANCAIS[l].toLowerCase()}`} aide={<a href={`${adresse}?lang=${l}`} target="_blank" rel="noopener" className="underline decoration-white/25 underline-offset-2 hover:text-white">Voir ma page en {EN_FRANCAIS[l].toLowerCase()}</a>}>
              <textarea className={`${classeSaisie} min-h-16`} lang={l} maxLength={300} value={reglages.bioTraduite?.[l] ?? ''} placeholder={reglages.profil.bio}
                onChange={e => onChange({ ...reglages, bioTraduite: { ...reglages.bioTraduite, [l]: e.target.value } })} />
            </Champ>
          ))}
        </div>
      )}
    </Carte>
  );
}

