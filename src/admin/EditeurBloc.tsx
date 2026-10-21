import { useContext, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, MutableRefObject } from 'react';
import type { Api, Bloc, Reglages } from '../lib/types.ts';
import { ANIMATIONS_BLOC, SANS_COULEURS, estEnLigne } from '../lib/types.ts';
import { RESEAUX } from '../lib/types.ts';
import { adresse, adresseSaisie, pourquoiPasAdresse } from '../lib/valider.ts';
import { nomSite, reseauDeUrl } from '../lib/demarrage.ts';
import { memeBloc, verifierBloc } from '../lib/editionBloc.ts';
import type { ChampErreur, Erreurs } from '../lib/editionBloc.ts';
import { themeDe, variablesTheme } from '../lib/themes.ts';
import { ICONES } from '../lib/icones.ts';
import { Icone, NOMS_RESEAUX, PICTOS } from '../components/Icone.tsx';
import { BlocPublic } from '../components/PageLiens.tsx';
import { BoutonPrincipal, BoutonSecondaire, Champ, Feuille, Interrupteur, ListeChoix, NOMS_ANIMATIONS, Segments, choisirFichier, classeBouton, classeSaisie, flechesRadio, preparerImage, vibrer } from './ui.tsx';
import { TYPES } from './OngletLiens.tsx';
import { appDe } from '../lib/ouvrirApp.ts';
import { ChampsPreuve, RangeesCompactes, RegleAOuvrir, RegleAcces, RegleMoment, RegleReseaux, Repli } from './ReglesBloc.tsx';
import { reseauxDePartage } from '../lib/provenance.ts';
import { etiquettes } from '../lib/etiquettes.ts';
import { FournisseurOffre, Reserve, offreDe, useDroits, useVoirOffres } from './offre.tsx';
import type { Fonction } from '../lib/abonnement.ts';

export interface OptionsEnregistrement {
  /** L'éditeur reste ouvert sur le bloc enregistré (sa rangée dépliée, au bureau). */
  garder?: boolean;
  /** Enregistré en route : pas de message « Modifications enregistrées » ; un bloc ajouté en passant à un autre ne fait pas défiler la page. */
  discret?: boolean;
}

/*
 * L'éditeur d'un bloc. Au bureau (direction A, 21 octobre 2026), il se déplie
 * dans la rangée du bloc, dans la liste à gauche de la page : l'essentiel
 * d'abord, le reste derrière « Plus de réglages ». Il s'enregistre tout seul une
 * fraction de seconde après la dernière frappe (seule une version valable
 * s'écrit) ; Échap le replie. Au téléphone, une feuille du bas qui laisse voir
 * la page au-dessus, avec son « Terminé ». Dans les deux cas, le bloc se
 * redessine sur la page à chaque frappe (`onBrouillon`).
 */
export function EditeurBloc({ bloc, reglages, nouveau, bureau = false, garde, onBrouillon, onFermer, onEnregistrer, onSupprimer, onDupliquer, onDeplacer, place, envoyerImage, apercuSite, clics, prises = 0, principal = false }: {
  bloc: Bloc;
  reglages: Reglages;
  nouveau: boolean;
  /** Au bureau : déplié dans la rangée du bloc, il s'enregistre tout seul. Sinon, la feuille du bas. */
  bureau?: boolean;
  /** Ce que la page appelle avant de passer à autre chose (un autre bloc, le design, un autre onglet) : vrai si l'on peut. */
  garde?: MutableRefObject<(() => boolean) | null>;
  /** Le bloc tel qu'il se tape (vide quand rien n'attend d'être écrit), pour que la page le montre en direct. */
  onBrouillon?: (b: Bloc | null) => void;
  onFermer: () => void;
  onEnregistrer: (bloc: Bloc, options?: OptionsEnregistrement) => void;
  onSupprimer: (bloc: Bloc) => void;
  onDupliquer: (bloc: Bloc) => void;
  /** Monter ou descendre le bloc d'un cran, sans glisser : la place est donnée par la page. */
  onDeplacer?: (bloc: Bloc, sens: -1 | 1) => void;
  place?: { rang: number; total: number };
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
  const [b, setB] = useState<Bloc>(bloc);
  // Une erreur dit sur quel champ elle porte : elle s'affiche dessous, et part dès qu'on y touche.
  // Plusieurs champs peuvent manquer à la fois (une note, son nombre d'avis, sa source) : chacun dit le sien.
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const setErreur = (texte: string, champ: ChampErreur = 'url') => setErreurs(texte ? { [champ]: texte } : {});
  const erreurDe = (champ: string) => erreurs[champ as ChampErreur];
  const erreur = Object.keys(erreurs).length > 0;
  const [envoi, setEnvoi] = useState(false);
  const [lecture, setLecture] = useState(false);
  const droits = useDroits();
  const voir = useVoirOffres();
  const [icones, setIcones] = useState(false);
  // L'essentiel d'abord, neuf ou pas ; le reste attend derrière « Plus de réglages ».
  // Ouvert pour y régler une règle tout juste débloquée (au retour des offres), il arrive déplié.
  const aRegler = useContext(RegleAOuvrir) !== null;
  const [plus, setPlus] = useState(aRegler);
  const idPlus = useId();
  const racine = useRef<HTMLDivElement>(null);
  const fichier = useRef<HTMLInputElement>(null);
  // Ce qui est écrit : la saisie telle qu'elle était au dernier enregistrement (ou à l'ouverture), et sa version enregistrée.
  const brut = useRef<Bloc>(bloc);
  const enregistre = useRef<Bloc | null>(nouveau ? null : bloc);
  // Le bloc tel qu'il était en ouvrant l'éditeur : « Annuler mes changements » y revient.
  const depart = useRef<Bloc | null>(nouveau ? null : bloc);
  const enregistrerRef = useRef(onEnregistrer);
  enregistrerRef.current = onEnregistrer;
  const brouillonRef = useRef(onBrouillon);
  brouillonRef.current = onBrouillon;

  // Chaque frappe se voit sur la page ; au bureau, une version valable s'écrit 650 ms après la dernière.
  // Une saisie pas valable (une adresse effacée) laisse voir la dernière version écrite : le bloc ne disparaît pas de la page.
  useEffect(() => {
    const change = !memeBloc(b, brut.current);
    const v = verifierBloc(b).bloc;
    brouillonRef.current?.(change ? v ?? enregistre.current ?? b : null);
    if (!bureau || nouveau || !change || !v) return;
    if (memeBloc(v, enregistre.current)) { brut.current = b; return; }
    const t = setTimeout(() => { brut.current = b; enregistre.current = v; enregistrerRef.current(v, { garder: true, discret: true }); }, 650);
    return () => clearTimeout(t);
  }, [b, bureau, nouveau]);

  // Clavier ouvert, l'aperçu collant se replie : la place va au champ et à son erreur.
  const [clavier, setClavier] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const lire = () => setClavier(vv.height < window.innerHeight * 0.75 || vv.height < 560);
    lire(); vv.addEventListener('resize', lire);
    return () => vv.removeEventListener('resize', lire);
  }, []);

  // Une erreur s'efface quand on touche à son champ, pas aux autres : celles qui restent vraies restent affichées.
  const maj = (champs: Partial<Bloc>) => {
    const p = champs.preuve, q = b.preuve;
    const touches: ChampErreur[] = [
      ...(['url', 'titre', 'description', 'image'] as const).filter(k => k in champs),
      ...('debut' in champs || 'fin' in champs || 'creneau' in champs ? ['dates' as const] : []),
      ...(p && q ? (['note', 'nombre', 'source'] as const).filter(k => p[k] !== q[k]) : []),
      ...(p && p.genre !== q?.genre ? (['note', 'nombre', 'source'] as const) : []),
    ];
    setB({ ...b, ...champs });
    if (erreur && touches.some(k => erreurs[k])) setErreurs(e => Object.fromEntries(Object.entries(e).filter(([k]) => !touches.includes(k as ChampErreur))));
  };
  const type = TYPES.find(t => t.type === b.type)!;
  const avecUrl = b.type === 'lien' || b.type === 'video';

  /** Vérifie le bloc ; renvoie la version à enregistrer, ou montre ce qui manque et mène au champ. */
  function valider(): Bloc | null {
    const r = verifierBloc(b);
    if (r.bloc) return r.bloc;
    setErreurs(r.erreurs);
    if (r.erreurs.dates) {
      setPlus(true);
      setTimeout(() => { const f = document.getElementById('bloc-fin'); f?.scrollIntoView({ block: 'center' }); f?.focus({ preventScroll: true }); }, 60);
    } else if (r.erreurs.note || r.erreurs.nombre || r.erreurs.source || bureau) {
      setTimeout(() => document.querySelector<HTMLElement>('.adm-editeur [aria-invalid="true"]')?.focus());
    }
    return null;
  }
  /** Ce qui est tapé n'est pas encore écrit. */
  const commence = () => !memeBloc(b, brut.current);
  /** Avant de passer à autre chose : ce qui est valable s'écrit ; un champ faux garde l'éditeur ouvert et dit quoi faire. */
  function liberer(): boolean {
    if (!commence()) return true;
    const v = valider();
    if (!v) { vibrer(20); return false; }
    brut.current = b;
    if (!memeBloc(v, enregistre.current)) { enregistre.current = v; onEnregistrer(v, { garder: true, discret: true }); }
    return true;
  }
  useEffect(() => {
    if (!garde || !bureau) return;
    garde.current = liberer;
    return () => { garde.current = null; };
  });

  // L'aperçu montre le bouton comme la page le montrera : sans Starter, aux couleurs du thème.
  const vue = droits.couleurs ? reglages : { ...reglages, couleurs: SANS_COULEURS };
  const theme = themeDe(vue);
  // Une preuve ne s'aperçoit qu'une fois commencée : pas de « 0,0 sur 5 » avant d'avoir rien tapé.
  const preuveRemplie = !!b.preuve && (b.preuve.genre === 'note' ? b.preuve.note > 0 && b.preuve.note <= 5 : b.preuve.genre === 'compteur' ? b.preuve.nombre > 0 : !!b.description.trim());
  // Ce qui est réglé derrière « Plus de réglages », nommé à droite de la ligne : on sait quoi sans ouvrir.
  // Au bureau, « Mis en avant » se règle dehors, à côté de « Visible sur ma page » : la ligne ne le répète pas.
  const reglages_ = ([[b.vedette && !bureau, 'Mis en avant'], [!!b.sousTitre, 'Sous-titre'], [!!b.icone, 'Icône'], [!!b.image, 'Image'], [b.vedette && b.animation !== 'auto', 'Animation'],
    [!!b.acces, 'Accès réservé'], [!!(b.debut || b.fin || b.creneau), 'Quand l’afficher'], [!!(b.cache.length || b.audience), 'Afficher sur']] as [boolean, string][])
    .filter(([oui]) => oui).map(([, nom]) => nom);
  const reglees = reglages_.length > 2 ? `${reglages_.slice(0, 2).join(', ')} et ${reglages_.length - 2} de plus` : reglages_.join(', ');
  // Rien de réglé : la ligne dit ce qu'elle cache.
  const cache = b.type === 'lien' ? 'Icône, image, règles' : (b.type === 'video' || b.type === 'derniere-video') && !bureau ? 'Mise en avant, règles' : b.type === 'newsletter' ? 'Sous-titre, règles' : b.type === 'inscription' ? 'Sous-titre, prénom, règles' : 'Règles';
  const nomAuto = `Comme ma page (${NOMS_ANIMATIONS[reglages.animation].nom})`;
  const nomIcone = b.icone ? NOMS_RESEAUX[b.icone] ?? PICTOS.find(p => p.nom === b.icone)?.libelle ?? '' : 'Aucune';

  async function choisirImage(f: File | undefined) {
    if (!f) return;
    setEnvoi(true); setErreur('');
    try { maj({ image: await envoyerImage(await preparerImage(f, b.vedette && b.format === 'carte' ? 'large' : 'carre')) }); }
    catch { setErreur('L’image n’est pas passée. Essaie une autre photo.', 'image'); }
    finally { setEnvoi(false); if (fichier.current) fichier.current.value = ''; }
  }

  /** Lit le site du lien : son image de partage (ou une capture), sa description et son titre. */
  async function recupererApercu() {
    const url = adresseSaisie(b.url);
    if (!url) { setErreur('Indique d’abord l’adresse du lien.'); return; }
    setLecture(true); setErreur('');
    try {
      const site = await apercuSite(url);
      let image = '';
      if (site.image) image = await envoyerImage(await preparerImage(await (await fetch(site.image)).blob(), 'large'));
      setB(avant => ({
        ...avant,
        image: image || avant.image,
        description: avant.description || site.description,
        titre: avant.titre || site.titre,
      }));
      vibrer(10);
      if (!image && !site.description) setErreur('Ce site ne donne ni image ni description. Ajoute-les à la main.', 'image');
    } catch { setErreur('Impossible de lire ce site pour l’instant. Ajoute l’image et la description à la main.', 'image'); }
    finally { setLecture(false); }
  }

  /** En quittant l'adresse d'un lien sans texte, le texte se remplit du nom du site, puis de son vrai titre. */
  async function titreDepuisSite() {
    if (b.type !== 'lien') return;
    const url = adresseSaisie(b.url);
    // L'adresse se vérifie en quittant le champ, comme aux premiers pas ; un profil de réseau prend son icône.
    if (b.url.trim() && !url) { setErreur(pourquoiPasAdresse(b.url)); return; }
    const reseau = url && !b.icone ? reseauDeUrl(url) : null;
    if (reseau) setB(avant => (avant.icone ? avant : { ...avant, icone: reseau }));
    if (b.titre.trim()) return;
    const repli = url && nomSite(url);
    if (!repli) return;
    setB(avant => (avant.titre.trim() ? avant : { ...avant, titre: repli }));
    try {
      const site = await apercuSite(url);
      if (site.titre) setB(avant => (avant.titre === repli ? { ...avant, titre: site.titre.slice(0, 80) } : avant));
    } catch { /* le nom du site suffit */ }
  }

  /**
   * Fermer d'un glissé, d'Échap, de la croix ou d'un toucher à côté garde ce qui a changé, comme partout
   * ailleurs, y compris un bloc neuf : une adresse collée ne se perd pas d'un geste.
   */
  function fermerEnGardant() {
    if (commence()) {
      const v = valider();
      if (!v) { vibrer(20); return; }
      if (!memeBloc(v, enregistre.current)) { brut.current = b; return onEnregistrer(v, bureau ? { discret: true } : undefined); }
    }
    onFermer();
  }
  // Au bureau, Échap replie la rangée en gardant ce qui a changé, où que soit le focus (sauf dans un autre champ de la page,
  // une fenêtre ouverte ou un bloc qu'on déplace au clavier : Échap y a déjà son sens).
  const fermerRef = useRef(fermerEnGardant);
  fermerRef.current = fermerEnGardant;
  useEffect(() => {
    if (!bureau) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('[role="dialog"][aria-modal="true"], .adm-rangee[data-glisse]')) return;
      const ici = document.activeElement;
      if (ici?.closest('input, textarea, select, [contenteditable]') && !racine.current?.contains(ici)) return;
      e.preventDefault();
      fermerRef.current();
    };
    document.addEventListener('keydown', touche);
    return () => document.removeEventListener('keydown', touche);
  }, [bureau]);
  /** Un changement pas valable, neuf ou pas : la feuille reste ouverte et l'erreur dit quoi faire, rien ne se perd en silence. */
  const retenir = () => commence() && !valider();
  // « Voir les offres » ouvre les offres par-dessus. Au téléphone, la feuille du bloc se ferme d'abord comme un glissé, en gardant
  // ce qui a changé ; au bureau, la rangée reste dépliée derrière la fenêtre, et ce qui y est tapé part avant le paiement.
  const offre = { droits, voirOffres: voir && ((f?: Fonction) => { if (retenir()) return; if (!bureau) fermerEnGardant(); voir(f); }) };

  /** Une copie juste en dessous : ce qui est tapé s'écrit d'abord, la copie le reprend. */
  function dupliquer() {
    const v = commence() ? valider() : enregistre.current ?? bloc;
    if (!v) return;
    if (commence()) { brut.current = b; if (!memeBloc(v, enregistre.current)) { enregistre.current = v; onEnregistrer(v, { garder: true, discret: true }); } }
    onDupliquer(v);
  }
  // Retirer reprend la version enregistrée : « Annuler » dans le message remet celle-là, jamais un champ à moitié tapé.
  const retirer = () => onSupprimer(enregistre.current ?? bloc);
  /** Au bureau, « Ajouter à ma page » pose le bloc et garde sa rangée dépliée : on continue de le régler. */
  function ajouter() {
    const v = valider();
    if (!v) return;
    vibrer(12);
    setB(v); brut.current = v; enregistre.current = v; depart.current = v;
    onEnregistrer(v, { garder: true });
  }

  const titre = nouveau ? `Ajouter : ${type.nom}` : [type.nom, !b.public && 'masqué', b.public && !estEnLigne(b) && 'programmé'].filter(Boolean).join(' · ');
  const ligne = 'flex min-h-11 items-center gap-2 bureau:min-h-9';

  // Un bloc neuf n'est pas encore sur la page : au téléphone, son aperçu reste collé en haut de la feuille, chaque réglage se voit sans remonter.
  // Au bureau, il se voit sur la page, à droite, à la place qu'il prendra (voir MaPage).
  const apercu = nouveau && !bureau && (b.type === 'lien' || (b.type === 'preuve' && preuveRemplie)) && !clavier && (
    <div className="sticky top-0 z-10 -mx-5 bg-nuit px-5 pb-3 pt-1 shadow-[0_14px_14px_-12px_#ffffff]">
      <div className="lp lp-mini -mx-1 rounded-[20px] p-4 ring-1 ring-white/[0.06]" style={variablesTheme(theme) as CSSProperties}
        data-bouton={reglages.bouton.style} data-forme={reglages.bouton.forme} data-ombre={reglages.bouton.ombre} data-police={theme.police} data-decor={theme.decor} aria-label="Aperçu du bouton">
        <div className="pointer-events-none" inert>
          {/* Sans Starter, un compte à rebours gardé se tait sur la page : l'aperçu montre le bouton tel qu'il s'ouvrira. */}
          <BlocPublic key={`${b.format}-${b.teinte}-${b.animation}-${b.vedette}`} bloc={{ ...b, url: b.type === 'preuve' ? b.url : b.url || '#', titre: b.titre || (b.type === 'lien' ? 'Texte du bouton' : ''), public: true, restantes: b.acces?.places ? Math.max(0, b.acces.places - prises) : null, compteARebours: b.compteARebours && droits.programmation }} reglages={vue} clic={() => {}} cible={{}} apercu />
        </div>
      </div>
    </div>
  );

  const grilleIcones = icones && (
    <div role="radiogroup" onKeyDown={e => flechesRadio(e, false)} aria-label="Icône" className="adm-groupe mt-1.5 grid max-h-[208px] grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1.5 overflow-y-auto p-2 [scrollbar-width:thin] bureau:grid-cols-[repeat(auto-fill,minmax(36px,1fr))]">
      {[{ nom: '', libelle: 'Sans icône' }, ...RESEAUX.map(r => ({ nom: r as string, libelle: NOMS_RESEAUX[r] })), ...PICTOS].map(p => {
        const choisi = b.icone === p.nom;
        return (
          <button key={p.nom || 'sans'} type="button" role="radio" aria-checked={choisi} aria-label={p.libelle} title={p.libelle} onClick={() => { vibrer(4); maj({ icone: p.nom }); setIcones(false); }}
            className={`grid aspect-square place-items-center rounded-xl transition duration-150 active:scale-90 bureau:rounded-lg ${choisi ? 'bg-white text-nuit' : 'text-white/80 hover:bg-white/[0.08]'}`}>
            <Icone nom={p.nom || 'ui-aucun'} taille={20} />
          </button>
        );
      })}
      {b.icone && !ICONES[b.icone] && <span className="grid aspect-square place-items-center rounded-xl bg-white text-xl" aria-label="Emoji actuel">{b.icone}</span>}
    </div>
  );
  const champFichier = <input ref={fichier} type="file" accept="image/*" className="adm-fichier" tabIndex={-1} aria-hidden="true" onChange={e => choisirImage(e.target.files?.[0])} />;
  const erreurImage = erreurDe('image') && <p role="alert" className="text-[13px] font-medium text-red-300">{erreurDe('image')}</p>;
  const description = b.type === 'lien' && b.vedette && b.format !== 'bouton' && (
    <Champ label="Description (facultatif)" aide={b.format === 'carte' ? 'Trois lignes au plus sous le titre de la carte.' : 'Deux lignes au plus sous le titre.'}>
      <textarea className={`${classeSaisie} min-h-20`} value={b.description} onChange={e => maj({ description: e.target.value })} maxLength={400}
        placeholder="Ce qu’on trouve en cliquant, en une ou deux phrases." />
    </Champ>
  );
  const formeCouleur = b.type === 'lien' && b.vedette && (
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
  );
  const animation = b.type === 'lien' && b.vedette && (
    <Repli key={`animation-${b.id}`} titre="Animation" icone="eclair" resume={b.animation === 'auto' ? 'Comme ma page' : NOMS_ANIMATIONS[b.animation].nom} ouvert={false}>
      {/* Une liste, pas une rangée de pastilles : le bloc sur la page (ou l'aperçu en haut) joue l'animation choisie. */}
      <ListeChoix label="Animation" valeur={b.animation} onChange={a => maj({ animation: a })}
        options={ANIMATIONS_BLOC.map(a => a === 'auto'
          ? { id: a, nom: nomAuto }
          : { id: a, nom: NOMS_ANIMATIONS[a].nom })} />
    </Repli>
  );
  const enAvant = !['titre', 'texte', 'newsletter', 'inscription', 'preuve'].includes(b.type);
  const vedette = (compact: boolean) => enAvant && <Interrupteur key="vedette" compact={compact} label="Mis en avant" aide="En plus grand, de la couleur d’accent de ta page." actif={b.vedette} onChange={v => maj({ vedette: v })} />;
  const bascules = (compact: boolean, sansVedette = false) => [
    b.type === 'inscription' && <Interrupteur key="prenom" compact={compact} label="Demander le prénom" actif={b.demanderPrenom} onChange={v => maj({ demanderPrenom: v })} />,
    !sansVedette && vedette(compact),
    b.type === 'lien' && principal && <Interrupteur key="google" compact={compact} label="Visible par Google" actif={b.indexable} onChange={v => maj({ indexable: v })} />,
  ].filter(Boolean);
  const regles = (
    <>
      {/* Quand, où, pour qui : l'ordre des maquettes du 20 octobre. */}
      <RegleMoment key={`moment-${b.id}`} b={b} maj={maj} erreur={erreurDe('dates')} />
      <RegleReseaux key={`reseaux-${b.id}`} b={b} maj={maj} reseaux={reseauxDePartage(reglages.vuesReseaux)} />
      {b.type === 'lien' && <RegleAcces key={`acces-${b.id}`} b={b} maj={maj} prises={prises} />}
    </>
  );
  // Au téléphone seulement : au bureau, la rangée se déplace par sa poignée, à la souris ou au clavier.
  const fleche = (sens: -1 | 1) => place && onDeplacer && (
    <button type="button" disabled={sens < 0 ? place.rang === 0 : place.rang === place.total - 1} onClick={() => onDeplacer(enregistre.current ?? b, sens)} aria-label={sens < 0 ? 'Monter d’un cran' : 'Descendre d’un cran'}
      className="grid h-11 w-10 place-items-center text-white/75 hover:text-white disabled:text-white/25">
      <Icone nom={sens < 0 ? 'ui-monter' : 'ui-descendre'} taille={18} />
    </button>
  );

  const champUrl = avecUrl && (
    <Champ label={b.type === 'video' ? 'Adresse de la vidéo YouTube' : 'Adresse'} erreur={erreurDe('url')}
      aide={b.type === 'lien' && reglages.ouvrirApps && appDe(adresse(b.url)) ? <span className="inline-flex items-center gap-1.5 text-white/75"><Icone nom="ui-ok" taille={13} />Ce lien s’ouvre directement dans l’app {appDe(adresse(b.url))}, même depuis {['Instagram', 'TikTok'].filter(n => n !== appDe(adresse(b.url))).join(' ou ')}.</span> : undefined}>
      <input className={classeSaisie} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder={b.type === 'video' ? 'https://youtu.be/…' : 'https://…'}
        value={b.url} onChange={e => maj({ url: e.target.value })} onBlur={titreDepuisSite} autoFocus={nouveau}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('bloc-titre')?.focus(); } }} />
    </Champ>
  );
  const champTitre = b.type !== 'derniere-video' && b.type !== 'preuve' && (
    <Champ erreur={erreurDe('titre')} label={b.type === 'lien' ? 'Texte du bouton' : b.type === 'texte' ? 'Texte' : 'Titre'}>
      {b.type === 'texte'
        ? <textarea className={`${classeSaisie} min-h-28`} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={1000} autoFocus={nouveau} />
        : <input id="bloc-titre" className={classeSaisie} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={160} placeholder={b.type === 'lien' ? 'Mon super lien' : ''} autoFocus={nouveau && !avecUrl} />}
    </Champ>
  );
  // Au bureau, l'adresse et son texte côte à côte, comme dans la maquette A2 : la rangée dépliée reste courte.
  const paire = bureau && !!champUrl && !!champTitre;

  /** Le haut, commun aux deux formes : à quoi sert le bloc, ce qu'il a de particulier, puis ses champs essentiels. */
  const essentiel = (
    <>
      {/* Un bloc neuf dit d'abord à quoi il sert, en une ligne ; un bloc existant, ce qu'il a de particulier, en clair. */}
      {nouveau && <p className="text-[13.5px] leading-snug text-white/60">{type.aide}.</p>}
      {!nouveau && etiquettes(b, droits).length > 0 && <p className="text-[13px] leading-snug text-white/60">{etiquettes(b, droits).join(' · ')}</p>}
      {/* Un avis ou une liste gardés d'une offre passée : ils attendent, rien n'est perdu. */}
      {type.fonction && !droits[type.fonction] && <Reserve fonction={type.fonction} phrase={`Ce bloc n’est pas montré sur ta page sans Hopla ${offreDe(type.fonction)}. Il revient tel quel dès que tu la prends.`} />}
      {apercu}
      {b.type === 'preuve' && nouveau && !bureau && !preuveRemplie && !clavier && (
        // La place de l'aperçu est gardée dès l'ouverture : le formulaire ne saute pas quand la première valeur arrive.
        <div className="lp lp-mini grid min-h-[112px] place-items-center rounded-[20px] p-4 text-center ring-1 ring-white/[0.06]" style={variablesTheme(theme) as CSSProperties} data-police={theme.police} data-decor={theme.decor}>
          <p className="text-[13.5px]" style={{ color: 'var(--doux)' }}>L’aperçu s’affiche ici dès ta première valeur.</p>
        </div>
      )}
      {paire ? <div className="adm-paire">{champUrl}{champTitre}</div> : champUrl}

      {b.type === 'preuve' && <ChampsPreuve b={b} maj={maj} erreurDe={erreurDe} />}

      {b.type === 'preuve' && (
        <Champ label={b.preuve?.genre === 'compteur' ? 'Lien vers la source (facultatif)' : 'Lien vers les avis (facultatif)'}
          aide={b.preuve?.genre === 'compteur' ? 'Ta chaîne, ton profil : le bloc devient cliquable, et le chiffre vérifiable.' : 'Ta fiche Google, ta page Trustpilot : le bloc devient cliquable, et la preuve vérifiable.'}>
          <input className={classeSaisie} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="https://…" value={b.url} onChange={e => maj({ url: e.target.value })} />
        </Champ>
      )}
      {b.type === 'preuve' && <p className="text-[12.5px] leading-snug text-white/55">Des chiffres vrais, des avis réels, avec l’accord de leurs auteurs.</p>}

      {!paire && champTitre}
      {b.type === 'derniere-video' && (
        <Champ label="Petit titre au-dessus" aide="La vidéo elle-même change toute seule à chaque nouvelle publication sur la chaîne.">
          <input className={classeSaisie} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={160} />
        </Champ>
      )}
    </>
  );

  if (bureau) {
    // L'allure : le sous-titre, l'icône et l'image d'un lien, le prénom d'une liste ; « Mis en avant » est dehors.
    const aApparence = b.type === 'lien' || b.type === 'newsletter' || b.type === 'inscription';
    // Les deux côtés passent par la même vérification : une adresse rangée sans sa barre finale n'est pas un changement.
    const norme = (x: Bloc) => verifierBloc(x).bloc ?? x;
    const annulable = !nouveau && !!depart.current && !memeBloc(norme(b), norme(depart.current));
    return (
      <FournisseurOffre value={offre}>
      <RangeesCompactes.Provider value>
      <div ref={racine} className="adm-editeur adm-editeur-ligne">
        {essentiel}
        {/* Les deux gestes les plus courants après le texte : le montrer ou non, le mettre en avant. */}
        <div className="adm-paire">
          <Interrupteur compact label="Visible sur ma page" actif={b.public} onChange={v => maj({ public: v })} />
          {vedette(true)}
        </div>

        {/* Le reste attend derrière une seule ligne, qui dit ce qui est réglé : on sait quoi sans ouvrir. */}
        <div className="adm-plus-groupe">
          <button type="button" onClick={() => { vibrer(4); setPlus(!plus); }} aria-expanded={plus} aria-controls={idPlus} className="adm-plus">
            <span className="shrink-0 font-medium text-white">Plus de réglages</span>
            {!plus && <span className="min-w-0 flex-1 truncate text-white/55">{reglees || cache}</span>}
            <Icone nom="ui-chevron" taille={14} className={`ml-auto shrink-0 text-white/55 transition-transform ${plus ? 'rotate-180' : ''}`} />
          </button>
          {plus && (
            <div id={idPlus} className="adm-plus-contenu">
              {aApparence && (
                <section aria-label="Apparence" className="flex flex-col">
                  <h3 className="adm-section-panneau">Apparence</h3>
                  <label className={ligne}>
                    <span className="flex-1 text-[13.5px] text-white">Sous-titre</span>
                    <input className={`${classeSaisie} adm-field-ligne max-w-[260px]`} value={b.sousTitre} onChange={e => maj({ sousTitre: e.target.value })} maxLength={240} placeholder="Facultatif" />
                  </label>
                  {b.type === 'lien' && (
                    <div>
                      <div className={ligne}>
                        <span className="flex-1 text-[13.5px] text-white">Icône</span>
                        <button type="button" onClick={() => setIcones(!icones)} aria-expanded={icones} aria-label={`Icône : ${nomIcone}`} className="adm-valeur">
                          {b.icone && <Icone nom={ICONES[b.icone] ? b.icone : 'ui-aucun'} taille={14} className="shrink-0" />}
                          <span className="truncate">{nomIcone}</span>
                        </button>
                      </div>
                      {grilleIcones}
                    </div>
                  )}
                  {b.type === 'lien' && (
                    <div className={ligne}>
                      <span className="flex-1 text-[13.5px] text-white">Image</span>
                      {b.image && <img src={b.image} alt="" className="h-8 w-8 rounded-md object-cover" />}
                      {!b.image && !!adresseSaisie(b.url) && (
                        <button type="button" onClick={recupererApercu} disabled={lecture || envoi} className="adm-valeur">{lecture ? 'Lecture du site…' : 'Depuis le site'}</button>
                      )}
                      <button type="button" onClick={e => choisirFichier(fichier.current, e.currentTarget)} disabled={envoi} className="adm-valeur">{envoi ? 'Envoi…' : b.image ? 'Changer' : 'Ajouter'}</button>
                      {b.image && <button type="button" onClick={() => maj({ image: '' })} aria-label="Retirer l’image" title="Retirer l’image" className={classeBouton.icone}><Icone nom="ui-corbeille" taille={15} /></button>}
                      {champFichier}
                    </div>
                  )}
                  {erreurImage}
                  {bascules(true, true)}
                  {description && <div className="pt-2">{description}</div>}
                  {formeCouleur && <div className="pt-2">{formeCouleur}</div>}
                  {animation}
                </section>
              )}
              <section aria-label="Règles" className="flex flex-col">
                <h3 className="adm-section-panneau">Règles</h3>
                {regles}
              </section>
            </div>
          )}
        </div>

        {/* Le bas de la rangée : un bloc neuf s'ajoute ou s'oublie ; un bloc posé se duplique ou se retire, et revient d'un geste à ce qu'il était. */}
        <div className="adm-editeur-pied">
          {!nouveau && b.type === 'lien' && clics > 0 && <p className="mr-auto text-[12px] tabular-nums text-white/55">{clics.toLocaleString('fr-FR')} clic{clics > 1 ? 's' : ''} ces 30 derniers jours</p>}
          {nouveau ? (
            <div className="ml-auto flex items-center gap-2">
              {/* Le seul moyen d'oublier un bloc neuf : replier la rangée, elle, l'ajoute s'il est valable. */}
              <BoutonSecondaire onClick={onFermer}>Annuler</BoutonSecondaire>
              <BoutonPrincipal disabled={envoi} onClick={ajouter}>Ajouter à ma page</BoutonPrincipal>
            </div>
          ) : (
            <div className="ml-auto flex flex-wrap items-center justify-end gap-0.5">
              {annulable && (
                <button type="button" onClick={() => { setB(depart.current!); setErreurs({}); vibrer(6); }} className={classeBouton.discret}>
                  <Icone nom="ui-retour" taille={15} className="shrink-0" />Annuler mes changements
                </button>
              )}
              <button type="button" onClick={dupliquer} className={classeBouton.discret}><Icone nom="ui-copier" taille={15} className="shrink-0" />Dupliquer</button>
              <button type="button" onClick={retirer} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-[14px] font-medium text-red-300 transition hover:bg-red-500/[0.06] bureau:min-h-9 bureau:rounded-lg bureau:px-2.5">
                <Icone nom="ui-corbeille" taille={15} className="shrink-0" />Retirer
              </button>
            </div>
          )}
        </div>
      </div>
      </RangeesCompactes.Provider>
      </FournisseurOffre>
    );
  }

  return (
    <FournisseurOffre value={offre}>
    {/* `cote` : la page reste visible au-dessus de la feuille, et le bloc s'y redessine à chaque frappe. */}
    <Feuille ouverte cote onFermer={fermerEnGardant} retenir={retenir} titre={titre}
      pied={fermer => (
        <div className="flex items-center gap-2">
          {/* Fermer garde les changements ; ce bouton est la seule façon de les oublier (un bloc neuf n'est pas ajouté). */}
          {commence() && (
            <BoutonSecondaire onClick={() => fermer(() => onFermer())}>Annuler</BoutonSecondaire>
          )}
          {/* Rien de touché : Terminé referme, sans réécrire le bloc ni annoncer des modifications qui n'existent pas. */}
          <BoutonPrincipal className="flex-1" disabled={envoi} onClick={() => { if (!nouveau && !commence()) { vibrer(12); fermer(() => onFermer()); return; } const v = valider(); if (v) { vibrer(12); fermer(() => onEnregistrer(v)); } }}>
            {nouveau ? 'Ajouter à ma page' : 'Terminé'}
          </BoutonPrincipal>
        </div>
      )}>
      <div className="adm-editeur flex flex-col gap-4 pt-1">
        {essentiel}

        {/* Masquer un bloc un temps est le geste le plus courant après le texte : il reste à portée, hors de « Plus de réglages ». */}
        <div className="-mt-1 border-b border-white/[0.07]">
          <Interrupteur label="Visible sur ma page" actif={b.public} onChange={v => maj({ public: v })} />
        </div>

        {plus ? (<>
        {/* Deux groupes nommés, l'allure puis les règles : on trouve sans tout lire. */}
        {['lien', 'video', 'newsletter', 'inscription'].includes(b.type) && <h3 className="-mb-1 pt-1 text-[13px] font-medium text-white/55">Apparence</h3>}
        {(b.type === 'lien' || b.type === 'newsletter' || b.type === 'inscription') && (
          <Champ label="Sous-titre (facultatif)">
            <input className={classeSaisie} value={b.sousTitre} onChange={e => maj({ sousTitre: e.target.value })} maxLength={240} />
          </Champ>
        )}

        {description}

        {b.type === 'lien' && (
          <>
            <div>
              <button type="button" onClick={() => setIcones(!icones)} aria-expanded={icones}
                className="adm-groupe flex min-h-12 w-full items-center gap-3 px-4 text-left transition hover:bg-white/[0.03]">
                <span className="text-white"><Icone nom={b.icone && ICONES[b.icone] ? b.icone : 'ui-aucun'} taille={20} /></span>
                <span className="flex-1 text-[14.5px] font-medium text-white/85">Icône</span>
                <span className="text-[13px] text-white/50">{nomIcone}</span>
                <Icone nom="ui-chevron" taille={16} className={`text-white/55 transition ${icones ? 'rotate-180' : ''}`} />
              </button>
              {grilleIcones}
            </div>
            <div className="flex items-center gap-3">
              {b.image && <img src={b.image} alt="" className="h-14 w-14 rounded-xl object-cover" />}
              <div className="flex flex-1 flex-wrap gap-2">
                <button type="button" onClick={e => choisirFichier(fichier.current, e.currentTarget)} disabled={envoi} className={classeBouton.secondaire}>{envoi ? 'Envoi…' : b.image ? 'Changer l’image' : 'Ajouter une image'}</button>
                {!!adresseSaisie(b.url) && (
                  <button type="button" onClick={recupererApercu} disabled={lecture || envoi} className={classeBouton.secondaire}>
                    {lecture ? 'Lecture du site…' : 'Remplir depuis le site'}
                  </button>
                )}
                {b.image && <button type="button" onClick={() => maj({ image: '' })} className={classeBouton.discret}>Retirer</button>}
              </div>
              {champFichier}
            </div>
            {erreurImage && <div className="-mt-2">{erreurImage}</div>}
          </>
        )}

        {bascules(false).length > 0 && <div className="adm-groupe divide-y divide-white/[0.06] px-4">{bascules(false)}</div>}
        {formeCouleur}
        {animation}

        <h3 className="-mb-1 pt-1 text-[13px] font-medium text-white/55">Règles</h3>
        {regles}
        <button type="button" onClick={() => { vibrer(4); setPlus(false); }}
          className={classeBouton.discret}>
          <Icone nom="ui-chevron" taille={16} className="rotate-180" /> Moins de réglages
        </button>
        </>) : (
          <button type="button" onClick={() => { vibrer(4); setPlus(true); }}
            className="-mt-2 flex min-h-12 w-full items-center gap-3 text-left">
            <span className="shrink-0 whitespace-nowrap text-[14.5px] font-medium text-white">Plus de réglages</span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-white/55">{reglees || cache}</span>
            <Icone nom="ui-chevron" taille={16} className="shrink-0 text-white/55" />
          </button>
        )}

        {!nouveau && b.type === 'lien' && clics > 0 && <p className="text-center text-[13px] text-white/55">{clics} clic{clics > 1 ? 's' : ''} ces 30 derniers jours</p>}

        {/* Les gestes rares, nommés en toutes lettres, au bout de la feuille plutôt qu'en pictos à côté de Terminé. */}
        {!nouveau && (
          <div className="adm-groupe flex flex-col divide-y divide-white/[0.06]">
            {onDeplacer && place && place.total > 1 && (
              <div className="flex min-h-12 items-center gap-2 pl-4 pr-1.5">
                <span className="flex-1 text-[14.5px] font-medium text-white/85">Place sur ta page</span>
                <span className="text-[13px] tabular-nums text-white/55">{place.rang + 1} sur {place.total}</span>
                {fleche(-1)}{fleche(1)}
              </div>
            )}
            <button type="button" onClick={dupliquer} className="flex min-h-12 items-center gap-3 px-4 text-left text-[14.5px] font-medium text-white/85 transition hover:bg-white/[0.04]">
              <Icone nom="ui-copier" taille={18} className="text-white/70" /> Dupliquer
            </button>
            <button type="button" onClick={retirer} className="flex min-h-12 items-center gap-3 px-4 text-left text-[14.5px] font-medium text-red-300 transition hover:bg-red-500/[0.06]">
              <Icone nom="ui-corbeille" taille={18} /> Retirer de ma page
            </button>
          </div>
        )}
      </div>
    </Feuille>
    </FournisseurOffre>
  );
}
