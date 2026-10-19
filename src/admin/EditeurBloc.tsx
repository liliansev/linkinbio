import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Api, Bloc, Reglages } from '../lib/types.ts';
import { ANIMATIONS_BLOC, estEnLigne, idYoutube } from '../lib/types.ts';
import { RESEAUX } from '../lib/types.ts';
import { adresse, adresseSaisie, pourquoiPasAdresse } from '../lib/valider.ts';
import { nomSite, reseauDeUrl } from '../lib/demarrage.ts';
import { themeDe, variablesTheme } from '../lib/themes.ts';
import { ICONES } from '../lib/icones.ts';
import { Icone, NOMS_RESEAUX, PICTOS } from '../components/Icone.tsx';
import { BlocPublic } from '../components/PageLiens.tsx';
import { BoutonPrincipal, BoutonSecondaire, Champ, Feuille, Interrupteur, ListeChoix, NOMS_ANIMATIONS, Segments, classeSaisie, flechesRadio, preparerImage, vibrer } from './ui.tsx';
import { TYPES } from './OngletLiens.tsx';
import { appDe } from '../lib/ouvrirApp.ts';
import { ChampsPreuve, RegleAcces, RegleMoment, RegleReseaux, RegleTraductions, Repli } from './ReglesBloc.tsx';
import { reseauxDePartage } from '../lib/provenance.ts';
import { etiquettes } from '../lib/etiquettes.ts';

export function EditeurBloc({ bloc, reglages, nouveau, onFermer, onEnregistrer, onSupprimer, onDupliquer, envoyerImage, apercuSite, clics, adressePage, prises = 0, principal = false }: {
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
  /** Le compte principal, seul visible par Google pendant la bêta. */
  principal?: boolean;
}) {
  const [b, setB] = useState<Bloc | null>(bloc);
  // Une erreur dit sur quel champ elle porte : elle s'affiche dessous, et part dès qu'on y touche.
  type ChampErreur = 'url' | 'titre' | 'description' | 'dates' | 'image' | 'note' | 'nombre' | 'source';
  // Plusieurs champs peuvent manquer à la fois (une note, son nombre d'avis, sa source) : chacun dit le sien.
  const [erreurs, setErreurs] = useState<Partial<Record<ChampErreur, string>>>({});
  const setErreur = (texte: string, champ: ChampErreur = 'url') => setErreurs(texte ? { [champ]: texte } : {});
  const erreurDe = (champ: string) => erreurs[champ as ChampErreur];
  const erreur = Object.keys(erreurs).length > 0;
  const [envoi, setEnvoi] = useState(false);
  const [lecture, setLecture] = useState(false);
  const [icones, setIcones] = useState(false);
  // L'essentiel d'abord, neuf ou pas ; le reste attend derrière « Plus de réglages », sauf ce qui est déjà réglé.
  const [plus, setPlus] = useState(false);
  const fichier = useRef<HTMLInputElement>(null);
  useEffect(() => { setB(bloc); setErreur(''); }, [bloc]);
  // Clavier ouvert, l'aperçu collant se replie : la place va au champ et à son erreur.
  const [clavier, setClavier] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const lire = () => setClavier(vv.height < window.innerHeight * 0.75 || vv.height < 560);
    lire(); vv.addEventListener('resize', lire);
    return () => vv.removeEventListener('resize', lire);
  }, []);
  if (!b) return null;
  const maj = (champs: Partial<Bloc>) => { setB({ ...b, ...champs }); if (erreur) setErreurs({}); };
  const type = TYPES.find(t => t.type === b.type)!;
  const avecUrl = b.type === 'lien' || b.type === 'video';

  /** Vérifie le bloc ; renvoie la version à enregistrer, ou rien si un champ manque. */
  function valider(): Bloc | null {
    if (!b) return null;
    const url = b.type === 'lien' ? adresseSaisie(b.url) : adresse(b.url);
    if (b.type === 'lien' && !url) { setErreur(b.url.trim() ? pourquoiPasAdresse(b.url) : 'Indique l’adresse du lien.'); return null; }
    if (b.type === 'video' && !idYoutube(url)) { setErreur('Colle l’adresse d’une vidéo YouTube.'); return null; }
    if ((b.type === 'titre' || b.type === 'texte') && !b.titre.trim()) { setErreur('Écris le texte.', 'titre'); return null; }
    if (b.type === 'preuve' && b.preuve?.genre === 'temoignage' && !b.description.trim()) { setErreur('Écris le témoignage.', 'description'); return null; }
    if (b.type === 'preuve' && b.preuve?.genre === 'compteur' && !b.preuve.nombre) { setErreur('Indique le chiffre à montrer.', 'nombre'); return null; }
    // Une note n'est jamais inventée : elle se tape, avec son nombre d'avis et sa source.
    if (b.type === 'preuve' && b.preuve?.genre === 'note') {
      const manque: Partial<Record<ChampErreur, string>> = {};
      if (!b.preuve.note) manque.note = 'Indique ta note, par exemple 4,8.';
      else if (b.preuve.note > 5) manque.note = 'La note va de 0 à 5. Sur 10, divise-la par deux.';
      if (!b.preuve.nombre) manque.nombre = 'Indique le nombre d’avis.';
      if (!b.preuve.source.trim()) manque.source = 'Indique où les avis sont publiés, par exemple Google.';
      if (Object.keys(manque).length) { setErreurs(manque); return null; }
    }
    if (b.debut && b.fin && new Date(b.fin) <= new Date(b.debut)) {
      setPlus(true); setErreur('La fin doit venir après le début.', 'dates');
      setTimeout(() => { const f = document.getElementById('bloc-fin'); f?.scrollIntoView({ block: 'center' }); f?.focus({ preventScroll: true }); }, 60);
      return null;
    }
    // Un lien sans texte prend le nom du site, comme dans les premiers pas : jamais une adresse brute sur la page.
    return { ...b, url, titre: b.type === 'lien' && !b.titre.trim() ? (nomSite(url) || b.titre) : b.titre };
  }
  const theme = themeDe(reglages);
  // Une preuve ne s'aperçoit qu'une fois commencée : pas de « 0,0 sur 5 » avant d'avoir rien tapé.
  const preuveRemplie = !!b.preuve && (b.preuve.genre === 'note' ? b.preuve.note > 0 && b.preuve.note <= 5 : b.preuve.genre === 'compteur' ? b.preuve.nombre > 0 : !!b.description.trim());
  // Ce qui est réglé derrière « Plus de réglages », nommé à droite de la ligne : on sait quoi sans ouvrir.
  const reglages_ = ([[!b.public, 'Masqué'], [b.vedette, 'Mis en avant'], [!!b.sousTitre, 'Sous-titre'], [!!b.icone, 'Icône'], [!!b.image, 'Image'], [b.vedette && b.animation !== 'auto', 'Animation'],
    [!!b.acces, 'Accès réservé'], [!!(b.debut || b.fin || b.creneau), 'Programmé'], [!!(b.cache.length || b.audience), 'Réseaux'], [Object.keys(b.traductions ?? {}).length > 0, 'Traduit']] as [boolean, string][])
    .filter(([oui]) => oui).map(([, nom]) => nom);
  const reglees = reglages_.length > 2 ? `${reglages_.slice(0, 2).join(', ')} et ${reglages_.length - 2} de plus` : reglages_.join(', ');
  const nomAuto = `Comme ma page (${NOMS_ANIMATIONS[reglages.animation].nom})`;

  async function choisirImage(f: File | undefined) {
    if (!f) return;
    setEnvoi(true); setErreur('');
    try { maj({ image: await envoyerImage(await preparerImage(f, b!.vedette && b!.format === 'carte' ? 'large' : 'carre')) }); }
    catch { setErreur('L’image n’est pas passée. Essaie une autre photo.', 'image'); }
    finally { setEnvoi(false); if (fichier.current) fichier.current.value = ''; }
  }

  /** Lit le site du lien : son image de partage (ou une capture), sa description et son titre. */
  async function recupererApercu() {
    const url = adresseSaisie(b!.url);
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
      if (!image && !site.description) setErreur('Ce site ne donne ni image ni description. Ajoute-les à la main.', 'image');
    } catch { setErreur('Impossible de lire ce site pour l’instant.', 'image'); }
    finally { setLecture(false); }
  }

  /** En quittant l'adresse d'un lien sans texte, le texte se remplit du nom du site, puis de son vrai titre. */
  async function titreDepuisSite() {
    if (b?.type !== 'lien') return;
    const url = adresseSaisie(b.url);
    // L'adresse se vérifie en quittant le champ, comme aux premiers pas ; un profil de réseau prend son icône.
    if (b.url.trim() && !url) { setErreur(pourquoiPasAdresse(b.url)); return; }
    const reseau = url && !b.icone ? reseauDeUrl(url) : null;
    if (reseau) setB(avant => avant && (avant.icone ? avant : { ...avant, icone: reseau }));
    if (b.titre.trim()) return;
    const repli = url && nomSite(url);
    if (!repli) return;
    setB(avant => avant && (avant.titre.trim() ? avant : { ...avant, titre: repli }));
    try {
      const site = await apercuSite(url);
      if (site.titre) setB(avant => avant && (avant.titre === repli ? { ...avant, titre: site.titre.slice(0, 80) } : avant));
    } catch { /* le nom du site suffit */ }
  }

  /**
   * Fermer d'un glissé, d'Échap ou d'un toucher à côté garde ce qui a changé, comme partout
   * ailleurs, y compris un bloc neuf : une adresse collée ne se perd pas d'un geste.
   */
  // Commencé veut dire touché : un titre proposé par défaut n'en fait pas un travail à garder.
  const commence = () => !!b && !!bloc && JSON.stringify(b) !== JSON.stringify(bloc);
  function fermerEnGardant() {
    if (commence()) {
      const v = valider();
      if (v) return onEnregistrer(v);
    }
    onFermer();
  }
  /** Un changement pas valable, neuf ou pas : la feuille reste ouverte et l'erreur dit quoi faire, rien ne se perd en silence. */
  const retenir = () => commence() && !valider();

  return (
    <Feuille ouverte onFermer={fermerEnGardant} retenir={retenir} titre={nouveau ? `Ajouter : ${type.nom}` : [type.nom, !b.public && 'masqué', b.public && !estEnLigne(b) && 'programmé'].filter(Boolean).join(' · ')}
      pied={fermer => (
        <div className="flex items-center gap-2">
          {/* Fermer garde les changements ; ce bouton est la seule façon de les oublier (un bloc neuf n'est pas ajouté). */}
          {commence() && (
            <BoutonSecondaire onClick={() => fermer(() => onFermer())}>Annuler</BoutonSecondaire>
          )}
          <BoutonPrincipal className="flex-1" disabled={envoi} onClick={() => { const v = valider(); if (v) { vibrer(12); fermer(() => onEnregistrer(v)); } }}>
            {nouveau ? 'Ajouter à ma page' : 'Terminé'}
          </BoutonPrincipal>
        </div>
      )}>
      <div className="flex flex-col gap-4 pt-1">
        {/* Ce que le bloc a de particulier, en clair : les pictos du coin de la page ne se lisent pas au toucher. */}
        {!nouveau && etiquettes(b).length > 0 && <p className="text-[13px] leading-snug text-white/60">{etiquettes(b).join(' · ')}</p>}
        {(b.type === 'lien' || (b.type === 'preuve' && preuveRemplie)) && !clavier && (
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
        {avecUrl && (
          <Champ label={b.type === 'video' ? 'Adresse de la vidéo YouTube' : 'Adresse'} erreur={erreurDe('url')}
            aide={b.type === 'lien' && reglages.ouvrirApps && appDe(adresse(b.url)) ? <span className="inline-flex items-center gap-1.5 text-white/75"><Icone nom="ui-ok" taille={13} />Ce lien s’ouvre directement dans l’app {appDe(adresse(b.url))}, même depuis Instagram ou TikTok.</span> : undefined}>
            <input className={classeSaisie} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder={b.type === 'video' ? 'https://youtu.be/…' : 'https://…'}
              value={b.url} onChange={e => maj({ url: e.target.value })} onBlur={titreDepuisSite} autoFocus={nouveau}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('bloc-titre')?.focus(); } }} />
          </Champ>
        )}

        {b.type === 'preuve' && <ChampsPreuve b={b} maj={maj} erreurDe={erreurDe} />}
        {b.type === 'preuve' && (
          <Champ label="Lien vers les avis (facultatif)" aide="Ta fiche Google, ta page Trustpilot : le bloc devient cliquable, et la preuve vérifiable.">
            <input className={classeSaisie} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="https://…" value={b.url} onChange={e => maj({ url: e.target.value })} />
          </Champ>
        )}

        {b.type !== 'derniere-video' && !(b.type === 'preuve' && b.preuve?.genre === 'temoignage') && (
          <Champ erreur={erreurDe('titre')} label={b.type === 'lien' ? 'Texte du bouton' : b.type === 'texte' ? 'Texte' : b.type === 'preuve' ? (b.preuve?.genre === 'compteur' ? 'Ce que compte ce chiffre' : 'Petit titre (facultatif)') : 'Titre'}>
            {b.type === 'texte'
              ? <textarea className={`${classeSaisie} min-h-28`} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={1000} autoFocus={nouveau} />
              : <input id="bloc-titre" className={classeSaisie} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={160} placeholder={b.type === 'lien' ? 'Mon super lien' : b.type === 'preuve' && b.preuve?.genre === 'compteur' ? 'abonnés sur YouTube' : ''} autoFocus={nouveau && !avecUrl && b.type !== 'preuve'} />}
          </Champ>
        )}
        {b.type === 'derniere-video' && (
          <Champ label="Petit titre au-dessus" aide="La vidéo elle-même change toute seule à chaque nouvelle publication sur la chaîne.">
            <input className={classeSaisie} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={160} />
          </Champ>
        )}

        {plus ? (<>
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
              <button type="button" onClick={() => setIcones(!icones)} aria-expanded={icones}
                className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-white/[0.035] px-4 text-left">
                <span className="text-white"><Icone nom={b.icone && ICONES[b.icone] ? b.icone : 'ui-aucun'} taille={20} /></span>
                <span className="flex-1 text-[14.5px] font-medium text-white/85">Icône</span>
                <span className="text-[13px] text-white/50">{b.icone ? NOMS_RESEAUX[b.icone] ?? PICTOS.find(p => p.nom === b.icone)?.libelle ?? '' : 'Aucune'}</span>
                <Icone nom="ui-chevron" taille={16} className={`text-white/55 transition ${icones ? 'rotate-180' : ''}`} />
              </button>
              {icones && <div role="radiogroup" onKeyDown={e => flechesRadio(e, false)} aria-label="Icône" className="mt-1.5 grid max-h-[208px] grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1.5 overflow-y-auto rounded-2xl bg-white/[0.035] p-2 [scrollbar-width:thin]">
                {[{ nom: '', libelle: 'Sans icône' }, ...RESEAUX.map(r => ({ nom: r as string, libelle: NOMS_RESEAUX[r] })), ...PICTOS].map(p => {
                  const choisi = b.icone === p.nom;
                  return (
                    <button key={p.nom || 'sans'} type="button" role="radio" aria-checked={choisi} aria-label={p.libelle} title={p.libelle} onClick={() => { vibrer(4); maj({ icone: p.nom }); setIcones(false); }}
                      className={`grid aspect-square place-items-center rounded-xl transition duration-150 active:scale-90 ${choisi ? 'bg-white text-nuit' : 'text-white/80 hover:bg-white/[0.08]'}`}>
                      <Icone nom={p.nom || 'ui-aucun'} taille={20} />
                    </button>
                  );
                })}
                {b.icone && !ICONES[b.icone] && <span className="grid aspect-square place-items-center rounded-xl bg-white text-xl" aria-label="Emoji actuel">{b.icone}</span>}
              </div>}
            </div>
            <div className="flex items-center gap-3">
              {b.image && <img src={b.image} alt="" className="h-14 w-14 rounded-xl object-cover" />}
              <div className="flex flex-1 flex-wrap gap-2">
                <button type="button" onClick={() => fichier.current?.click()} disabled={envoi} className="min-h-11 rounded-full bg-white/[0.08] px-4 text-[14px] font-medium text-white hover:bg-white/[0.13]">{envoi ? 'Envoi…' : b.image ? 'Changer l’image' : 'Ajouter une image'}</button>
                {b.url && (
                  <button type="button" onClick={recupererApercu} disabled={lecture || envoi} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/10 px-4 text-[14px] font-medium text-white hover:bg-white/10 disabled:opacity-60">
                    <Icone nom="sparkle" taille={16} />{lecture ? 'Lecture du site…' : 'Remplir depuis le site'}
                  </button>
                )}
                {b.image && <button type="button" onClick={() => maj({ image: '' })} className="min-h-11 rounded-full px-3 text-[14px] text-white/55 hover:text-white">Retirer</button>}
              </div>
              <input ref={fichier} type="file" accept="image/*" hidden onChange={e => choisirImage(e.target.files?.[0])} />
            </div>
            {erreurDe('image') && <p role="alert" className="-mt-2 text-[13px] font-medium text-red-300">{erreurDe('image')}</p>}
          </>
        )}

        <div className="divide-y divide-white/[0.06] rounded-2xl bg-white/[0.035] px-4">
          <Interrupteur label="Visible sur ma page" actif={b.public} onChange={v => maj({ public: v })} />
          {b.type === 'inscription' && (
            <Interrupteur label="Demander le prénom" actif={b.demanderPrenom} onChange={v => maj({ demanderPrenom: v })} />
          )}
          {b.type !== 'titre' && b.type !== 'texte' && b.type !== 'newsletter' && b.type !== 'inscription' && b.type !== 'preuve' && (
            <Interrupteur label="Mis en avant" aide="En plus grand, de la couleur d’accent de ta page." actif={b.vedette} onChange={v => maj({ vedette: v })} />
          )}
          {b.type === 'lien' && principal && (
            <Interrupteur label="Visible par Google" actif={b.indexable} onChange={v => maj({ indexable: v })} />
          )}
        </div>

        {b.type === 'lien' && b.vedette && (
          <div className="grid gap-3">
            <div>
              <span className="mb-1.5 block text-[13px] font-medium text-white/70">Forme</span>
              <Segments label="Forme du lien mis en avant" valeur={b.format} onChange={v => maj({ format: v })}
                options={[{ id: 'bouton', nom: 'Bouton' }, { id: 'bandeau', nom: 'Bandeau' }, { id: 'carte', nom: 'Carte' }]} />
            </div>
            <div>
              <span className="mb-1.5 block text-[13px] font-medium text-white/70">Couleur</span>
              <Segments label="Couleur du lien mis en avant" valeur={b.teinte} onChange={v => maj({ teinte: v })}
                options={[{ id: 'accent', nom: 'Accent' }, { id: 'theme', nom: 'Comme les autres' }]} />
            </div>
          </div>
        )}

        {b.type === 'lien' && b.vedette && (
          <Repli key={`animation-${b.id}`} titre="Animation" icone="sparkle" resume={b.animation === 'auto' ? '' : NOMS_ANIMATIONS[b.animation].nom} ouvert={false}>
            {/* Une liste, pas une rangée de pastilles : l'aperçu en haut de la feuille joue l'animation choisie. */}
            <ListeChoix label="Animation" valeur={b.animation} onChange={a => maj({ animation: a })}
              options={ANIMATIONS_BLOC.map(a => a === 'auto'
                ? { id: a, nom: nomAuto }
                : { id: a, nom: NOMS_ANIMATIONS[a].nom })} />
          </Repli>
        )}

        {b.type === 'lien' && <RegleAcces key={`acces-${b.id}`} b={b} maj={maj} prises={prises} />}
        <RegleMoment key={`moment-${b.id}`} b={b} maj={maj} erreur={erreurDe('dates')} />
        <RegleReseaux key={`reseaux-${b.id}`} b={b} maj={maj} reseaux={reseauxDePartage(reglages.vuesReseaux)} />
        <RegleTraductions key={`langues-${b.id}`} b={b} maj={maj} langues={reglages.langues ?? []} />
        <button type="button" onClick={() => { vibrer(4); setPlus(false); }}
          className="flex min-h-11 items-center justify-center gap-1.5 text-[14px] font-medium text-white/60 hover:text-white">
          <Icone nom="ui-chevron" taille={16} className="rotate-180" /> Moins de réglages
        </button>
        </>) : (
          <button type="button" onClick={() => { vibrer(4); setPlus(true); }}
            className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-white/[0.035] px-4 text-left transition hover:bg-white/[0.06]">
            <Icone nom="reglage" taille={20} className="text-white/70" />
            <span className="flex-1 text-[14.5px] font-medium text-white/85">Plus de réglages</span>
            {reglees && <span className="min-w-0 truncate text-[13px] text-white/55">{reglees}</span>}
            <Icone nom="ui-chevron" taille={16} className="text-white/55" />
          </button>
        )}

        {!nouveau && b.type === 'lien' && <p className="text-center text-[13px] text-white/55">{clics} clic{clics > 1 ? 's' : ''} ces 30 derniers jours</p>}

        {/* Les deux gestes rares, nommés en toutes lettres, au bout de la feuille plutôt qu'en pictos à côté de Terminé. */}
        {!nouveau && (
          <div className="flex flex-col divide-y divide-white/[0.06] rounded-2xl bg-white/[0.035]">
            <button type="button" onClick={() => onDupliquer(b)} className="flex min-h-12 items-center gap-3 px-4 text-left text-[14.5px] font-medium text-white/85 transition hover:bg-white/[0.04]">
              <Icone nom="ui-copier" taille={18} className="text-white/70" /> Dupliquer
            </button>
            <button type="button" onClick={() => onSupprimer(b)} className="flex min-h-12 items-center gap-3 px-4 text-left text-[14.5px] font-medium text-red-300 transition hover:bg-red-500/[0.06]">
              <Icone nom="ui-corbeille" taille={18} /> Retirer de ma page
            </button>
          </div>
        )}
      </div>
    </Feuille>
  );
}
