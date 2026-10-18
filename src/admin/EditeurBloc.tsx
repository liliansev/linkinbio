import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Api, Bloc, Reglages } from '../lib/types.ts';
import { ANIMATIONS_BLOC, idYoutube } from '../lib/types.ts';
import { RESEAUX } from '../lib/types.ts';
import { adresse } from '../lib/valider.ts';
import { themeParId, variablesTheme } from '../lib/themes.ts';
import { ICONES } from '../lib/icones.ts';
import { Icone, NOMS_RESEAUX, PICTOS } from '../components/Icone.tsx';
import { BlocPublic } from '../components/PageLiens.tsx';
import { BoutonPrincipal, Champ, Feuille, Interrupteur, NOMS_ANIMATIONS, Segments, classeSaisie, preparerImage, vibrer } from './ui.tsx';
import { TYPES } from './OngletLiens.tsx';
import { appDe } from '../lib/ouvrirApp.ts';
import { ChampsPreuve, RegleAcces, RegleAudience, RegleMoment, RegleTraductions } from './ReglesBloc.tsx';

const AIDE_FORMATS = {
  bouton: 'La taille des autres boutons, à la couleur choisie.',
  bandeau: 'Un peu plus grand : picto à gauche, flèche à droite.',
  carte: 'Un grand visuel au-dessus : l’image du lien, ou son picto en grand.',
} as const;

export function EditeurBloc({ bloc, reglages, nouveau, onFermer, onEnregistrer, onSupprimer, onDupliquer, envoyerImage, apercuSite, clics, adressePage, prises = 0 }: {
  bloc: Bloc | null;
  reglages: Reglages;
  nouveau: boolean;
  onFermer: () => void;
  onEnregistrer: (bloc: Bloc) => void;
  onSupprimer: (bloc: Bloc) => void;
  onDupliquer: (bloc: Bloc) => void;
  envoyerImage: (dataUrl: string) => Promise<string>;
  apercuSite: Api['apercuSite'];
  clics: number;
  /** L'adresse publique de la page, pour les astuces (`?s=tiktok`). */
  adressePage: string;
  /** Les places déjà prises, quand le lien est un drop. */
  prises?: number;
}) {
  const [b, setB] = useState<Bloc | null>(bloc);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [lecture, setLecture] = useState(false);
  const fichier = useRef<HTMLInputElement>(null);
  useEffect(() => { setB(bloc); setErreur(''); }, [bloc]);
  if (!b) return null;
  const maj = (champs: Partial<Bloc>) => setB({ ...b, ...champs });
  const type = TYPES.find(t => t.type === b.type)!;
  const avecUrl = b.type === 'lien' || b.type === 'video';

  /** Vérifie le bloc ; renvoie la version à enregistrer, ou rien si un champ manque. */
  function valider(): Bloc | null {
    if (!b) return null;
    const url = adresse(b.url);
    if (b.type === 'lien' && !url) { setErreur('Indique l’adresse du lien.'); return null; }
    if (b.type === 'video' && !idYoutube(url)) { setErreur('Colle l’adresse d’une vidéo YouTube.'); return null; }
    if ((b.type === 'titre' || b.type === 'texte') && !b.titre.trim()) { setErreur('Écris le texte du bloc.'); return null; }
    if (b.type === 'preuve' && b.preuve?.genre === 'temoignage' && !b.description.trim()) { setErreur('Écris le témoignage.'); return null; }
    if (b.type === 'preuve' && b.preuve?.genre === 'compteur' && !b.preuve.nombre) { setErreur('Indique le chiffre à montrer.'); return null; }
    return { ...b, url };
  }
  const theme = themeParId(reglages.theme);
  const nomAuto = 'Par défaut';

  async function choisirImage(f: File | undefined) {
    if (!f) return;
    setEnvoi(true); setErreur('');
    try { maj({ image: await envoyerImage(await preparerImage(f, b!.vedette && b!.format === 'carte' ? 'large' : 'carre')) }); }
    catch { setErreur('L’image n’est pas passée. Essaie une autre photo.'); }
    finally { setEnvoi(false); if (fichier.current) fichier.current.value = ''; }
  }

  /** Lit le site du lien : son image de partage (ou une capture), sa description et son titre. */
  async function recupererApercu() {
    const url = adresse(b!.url);
    if (!url) { setErreur('Indique d’abord l’adresse du lien.'); return; }
    setLecture(true); setErreur('');
    try {
      const site = await apercuSite(url);
      let image = '';
      if (site.image) image = await envoyerImage(await preparerImage(await (await fetch(site.image)).blob(), 'large'));
      setB(avant => avant && ({
        ...avant,
        image: image || avant.image,
        description: avant.description || site.description,
        titre: avant.titre || site.titre,
      }));
      vibrer(10);
      if (!image && !site.description) setErreur('Ce site ne donne ni image ni description. Ajoute-les à la main.');
    } catch { setErreur('Impossible de lire ce site pour l’instant.'); }
    finally { setLecture(false); }
  }

  return (
    <Feuille ouverte onFermer={onFermer} titre={nouveau ? `Nouveau : ${type.nom.toLowerCase()}` : type.nom}
      pied={fermer => (
        <div className="flex items-center gap-2">
          {!nouveau && (
            <>
              <button type="button" onClick={() => fermer(() => onSupprimer(b))} className="grid h-12 w-12 place-items-center rounded-full bg-red-500/[0.08] text-red-300 transition hover:bg-red-500/15 active:scale-90" aria-label="Supprimer">
                <Icone nom="ui-corbeille" taille={20} />
              </button>
              <button type="button" onClick={() => onDupliquer(b)} className="grid h-12 w-12 place-items-center rounded-full bg-white/[0.06] text-white/70 transition hover:bg-white/10 active:scale-90" aria-label="Dupliquer">
                <Icone nom="ui-copier" taille={20} />
              </button>
            </>
          )}
          <BoutonPrincipal className="flex-1" disabled={envoi} onClick={() => { const v = valider(); if (v) { vibrer(12); fermer(() => onEnregistrer(v)); } }}>
            {nouveau ? 'Ajouter à ma page' : 'Enregistrer'}
          </BoutonPrincipal>
        </div>
      )}>
      <div className="flex flex-col gap-4 pt-1">
        {(b.type === 'lien' || b.type === 'preuve') && (
          // L'aperçu reste collé en haut de la feuille : chaque réglage se voit sans remonter.
          <div className="sticky top-0 z-10 -mx-5 bg-[#121a2b] px-5 pb-3 pt-1 shadow-[0_14px_14px_-12px_#121a2b]">
            <div className="lp lp-mini -mx-1 rounded-[20px] p-4 ring-1 ring-white/[0.06]" style={variablesTheme(theme) as CSSProperties}
              data-bouton={reglages.bouton.style} data-forme={reglages.bouton.forme} data-ombre={reglages.bouton.ombre} data-police={theme.police} data-decor={theme.decor} aria-label="Aperçu du bouton">
              <div className="pointer-events-none" inert>
                <BlocPublic key={`${b.format}-${b.teinte}-${b.animation}-${b.vedette}`} bloc={{ ...b, url: b.type === 'preuve' ? b.url : b.url || '#', titre: b.titre || (b.type === 'lien' ? 'Texte du bouton' : ''), public: true, restantes: b.acces?.places ? Math.max(0, b.acces.places - prises) : null }} reglages={reglages} clic={() => {}} cible={{}} apercu />
              </div>
            </div>
          </div>
        )}
        {erreur && <p role="alert" className="rounded-xl bg-red-500/15 px-3.5 py-2.5 text-[14px] text-red-200">{erreur}</p>}

        {avecUrl && (
          <Champ label={b.type === 'video' ? 'Adresse de la vidéo YouTube' : 'Adresse'}
            aide={b.type === 'lien' && reglages.ouvrirApps && appDe(adresse(b.url)) ? <span className="inline-flex items-center gap-1.5 text-peche/90"><Icone nom="ui-ok" taille={13} />Depuis Instagram ou TikTok, ce lien s’ouvre dans l’app {appDe(adresse(b.url))}.</span> : undefined}>
            <input className={classeSaisie} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder={b.type === 'video' ? 'https://youtu.be/…' : 'https://…'}
              value={b.url} onChange={e => maj({ url: e.target.value })} autoFocus={nouveau} />
          </Champ>
        )}

        {b.type === 'preuve' && <ChampsPreuve b={b} maj={maj} />}
        {b.type === 'preuve' && (
          <Champ label="Lien vers les avis (facultatif)" aide="Ta fiche Google, ta page Trustpilot : le bloc devient cliquable, et la preuve vérifiable.">
            <input className={classeSaisie} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="https://…" value={b.url} onChange={e => maj({ url: e.target.value })} />
          </Champ>
        )}

        {b.type !== 'derniere-video' && !(b.type === 'preuve' && b.preuve?.genre === 'temoignage') && (
          <Champ label={b.type === 'lien' ? 'Texte du bouton' : b.type === 'texte' ? 'Texte' : b.type === 'preuve' ? (b.preuve?.genre === 'compteur' ? 'Ce que compte ce chiffre' : 'Petit titre (facultatif)') : 'Titre'}>
            {b.type === 'texte'
              ? <textarea className={`${classeSaisie} min-h-28`} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={1000} autoFocus={nouveau} />
              : <input className={classeSaisie} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={160} placeholder={b.type === 'lien' ? 'Mon super lien' : b.type === 'preuve' && b.preuve?.genre === 'compteur' ? 'abonnés sur YouTube' : ''} autoFocus={nouveau && !avecUrl} />}
          </Champ>
        )}
        {b.type === 'derniere-video' && (
          <Champ label="Petit titre au-dessus" aide="La vidéo elle-même change toute seule à chaque nouvelle publication sur la chaîne.">
            <input className={classeSaisie} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={160} />
          </Champ>
        )}

        {(b.type === 'lien' || b.type === 'newsletter' || b.type === 'inscription') && (
          <Champ label="Sous-titre (facultatif)">
            <input className={classeSaisie} value={b.sousTitre} onChange={e => maj({ sousTitre: e.target.value })} maxLength={240} />
          </Champ>
        )}

        {b.type === 'lien' && b.vedette && b.format !== 'bouton' && (
          <Champ label="Description (facultatif)" aide={b.format === 'carte' ? 'Trois lignes au plus sous le titre de la carte.' : 'Deux lignes au plus sous le titre.'}>
            <textarea className={`${classeSaisie} min-h-20`} value={b.description} onChange={e => maj({ description: e.target.value })} maxLength={400}
              placeholder="Ce qu’on trouve en cliquant, en une ou deux phrases." />
          </Champ>
        )}

        {b.type === 'lien' && (
          <>
            <div>
              <span className="mb-1.5 flex items-baseline justify-between text-[13px] font-medium text-white/70">
                Icône{b.icone && <span className="font-normal text-white/45">{NOMS_RESEAUX[b.icone] ?? PICTOS.find(p => p.nom === b.icone)?.libelle ?? ''}</span>}
              </span>
              <div role="radiogroup" aria-label="Icône" className="grid max-h-[208px] grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1.5 overflow-y-auto rounded-2xl bg-white/[0.035] p-2 [scrollbar-width:thin]">
                {[{ nom: '', libelle: 'Sans icône' }, ...RESEAUX.map(r => ({ nom: r as string, libelle: NOMS_RESEAUX[r] })), ...PICTOS].map(p => {
                  const choisi = b.icone === p.nom;
                  return (
                    <button key={p.nom || 'sans'} type="button" role="radio" aria-checked={choisi} aria-label={p.libelle} title={p.libelle} onClick={() => { vibrer(4); maj({ icone: p.nom }); }}
                      className={`grid aspect-square place-items-center rounded-xl transition duration-150 active:scale-90 ${choisi ? 'bg-peche text-nuit' : 'text-white/80 hover:bg-white/[0.08]'}`}>
                      <Icone nom={p.nom || 'ui-aucun'} taille={20} />
                    </button>
                  );
                })}
                {b.icone && !ICONES[b.icone] && <span className="grid aspect-square place-items-center rounded-xl bg-peche text-xl" aria-label="Emoji actuel">{b.icone}</span>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {b.image ? <img src={b.image} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <span className="grid h-14 w-14 place-items-center rounded-xl bg-white/[0.06] text-white/35"><Icone nom="ui-image" taille={22} /></span>}
              <div className="flex flex-1 flex-wrap gap-2">
                <button type="button" onClick={() => fichier.current?.click()} disabled={envoi} className="min-h-10 rounded-full bg-white/[0.08] px-4 text-[14px] font-medium text-white hover:bg-white/[0.13]">{envoi ? 'Envoi…' : b.image ? 'Changer l’image' : 'Ajouter une image'}</button>
                {b.url && (
                  <button type="button" onClick={recupererApercu} disabled={lecture || envoi} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-peche/15 px-4 text-[14px] font-medium text-peche hover:bg-peche/25 disabled:opacity-60">
                    <Icone nom="sparkle" taille={16} />{lecture ? 'Lecture du site…' : 'Aperçu du site'}
                  </button>
                )}
                {b.image && <button type="button" onClick={() => maj({ image: '' })} className="min-h-10 rounded-full px-3 text-[14px] text-white/55 hover:text-white">Retirer</button>}
              </div>
              <input ref={fichier} type="file" accept="image/*" hidden onChange={e => choisirImage(e.target.files?.[0])} />
            </div>
          </>
        )}

        <div className="divide-y divide-white/[0.06] rounded-2xl bg-white/[0.035] px-4">
          <Interrupteur label="Public" aide={b.public ? 'Visible sur ta page.' : 'Privé : gardé ici, invisible sur ta page.'} actif={b.public} onChange={v => maj({ public: v })} />
          {b.type === 'inscription' && (
            <Interrupteur label="Demander le prénom" aide="Pour écrire « Salut Camille » dans tes e-mails." actif={b.demanderPrenom} onChange={v => maj({ demanderPrenom: v })} />
          )}
          {b.type !== 'titre' && b.type !== 'texte' && b.type !== 'newsletter' && b.type !== 'inscription' && b.type !== 'preuve' && (
            <Interrupteur label="Mis en avant" aide="Plus visible que les autres liens : choisis sa forme et sa couleur juste dessous." actif={b.vedette} onChange={v => maj({ vedette: v })} />
          )}
          {b.type === 'lien' && (
            <Interrupteur label="Visible par Google" aide={b.indexable ? 'Lien suivi par les moteurs de recherche.' : 'Lien en nofollow, exclu des extraits et des données structurées.'} actif={b.indexable} onChange={v => maj({ indexable: v })} />
          )}
        </div>

        {b.type === 'lien' && b.vedette && (
          <div className="grid gap-3">
            <div>
              <span className="mb-1.5 block text-[13px] font-medium text-white/70">Forme</span>
              <Segments label="Forme du lien mis en avant" valeur={b.format} onChange={v => maj({ format: v })}
                options={[{ id: 'bouton', nom: 'Bouton' }, { id: 'bandeau', nom: 'Bandeau' }, { id: 'carte', nom: 'Carte' }]} />
              <p className="mt-1.5 text-[12.5px] leading-snug text-white/45">{AIDE_FORMATS[b.format]}</p>
            </div>
            <div>
              <span className="mb-1.5 block text-[13px] font-medium text-white/70">Couleur</span>
              <Segments label="Couleur du lien mis en avant" valeur={b.teinte} onChange={v => maj({ teinte: v })}
                options={[{ id: 'accent', nom: 'Accent' }, { id: 'theme', nom: 'Comme les autres' }]} />
            </div>
          </div>
        )}

        {b.type === 'lien' && (
          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-white/70">Animation pour attirer l’œil</span>
            <div role="radiogroup" aria-label="Animation" className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
              {ANIMATIONS_BLOC.map(a => (
                <button key={a} type="button" role="radio" aria-checked={b.animation === a} onClick={() => { vibrer(4); maj({ animation: a }); }}
                  className={`min-h-10 shrink-0 rounded-full px-4 text-[14px] font-medium transition duration-150 active:scale-95 ${b.animation === a ? 'bg-white text-nuit' : 'bg-white/[0.07] text-white/70 hover:text-white'}`}>
                  {a === 'auto' ? nomAuto : NOMS_ANIMATIONS[a].nom}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[12.5px] leading-snug text-white/45">
              {b.animation === 'auto' ? (b.vedette ? `Comme tous les liens mis en avant : ${NOMS_ANIMATIONS[reglages.animation].nom.toLowerCase()} (à changer dans Apparence).` : 'Immobile, sauf si tu mets ce lien en avant.') : NOMS_ANIMATIONS[b.animation].aide}
            </p>
          </div>
        )}

        {b.type === 'lien' && <RegleAcces key={`acces-${b.id}`} b={b} maj={maj} prises={prises} />}
        <RegleMoment key={`moment-${b.id}`} b={b} maj={maj} />
        <RegleAudience key={`audience-${b.id}`} b={b} maj={maj} adressePage={adressePage} />
        <RegleTraductions key={`langues-${b.id}`} b={b} maj={maj} langues={reglages.langues ?? []} />

        {!nouveau && b.type === 'lien' && <p className="text-center text-[13px] text-white/45">{clics} clic{clics > 1 ? 's' : ''} ces 30 derniers jours</p>}
      </div>
    </Feuille>
  );
}
