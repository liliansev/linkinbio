import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, KeyboardEvent as ToucheClavier, RefObject } from 'react';
import type { Bloc, TypeBloc, TypeVitrine } from '../lib/types.ts';
import { TYPES_VITRINE } from '../lib/types.ts';
import { DEVENU, aideSaisie, choixAjout, choixPour, seColle } from '../lib/catalogue.ts';
import type { LigneAjout } from '../lib/catalogue.ts';
import type { TypeAdresse } from '../lib/detection.ts';
import { reseauDeUrl } from '../lib/demarrage.ts';
import { logoAdresse } from '../lib/vitrine.ts';
import { COULEURS_LOGOS } from '../lib/integrations.ts';
import { focusAuto, focusSaisie } from '../lib/clavier';
import { Icone } from '../components/Icone.tsx';
import { Feuille, classeSaisie, couleurReseau } from './ui.tsx';
import { Etiquette, offreDe, useDroits, useVoirOffres } from './offre.tsx';

/*
 * Le choix des blocs (24 octobre 2026, demandé par Lilian : « vraiment réfléchir à quoi sert chaque lien ») : un seul
 * champ, « Colle une adresse ou cherche un bloc », au-dessus de la liste de départ, une entrée par chose qu'on écrit ou
 * que Hopla tient (`lib/catalogue.ts`). Une adresse collée devient un bloc d'un coup, celui qu'elle appelle (une vidéo,
 * un agenda, une page de soutien, une fiche de boutique) ; tapée, elle propose ce bloc en premier, sous le logo du site,
 * puis ce qu'elle peut être d'autre. Des mots cherchent parmi tous les blocs, par leur nom, les mots qu'on emploie pour
 * eux et ce qu'on veut en faire (« rdv », « prendre rendez-vous », « vendre », « don ») ; un numéro devient un lien
 * d'appel, un pseudo rejoint les réseaux. Au téléphone, une feuille ; au bureau, le champ au-dessus des blocs, seule
 * entrée, que le bouton de l'en-tête et la touche A ouvrent.
 */

/** Ce que fait une ligne prise : un bloc neuf de ce type (avec l'adresse tapée), l'adresse posée comme si on l'avait collée, ou un pseudo envoyé aux réseaux. Faux : quelque chose l'a retenue. */
export interface GestesAjout {
  onChoisir: (type: TypeBloc, modele?: Partial<Bloc>, url?: string) => boolean | void;
  onColler: (url: string) => boolean | void;
  onReseau: (pseudo: string) => boolean | void;
}

/** Une ligne sous le champ : en rouge ce qui empêche d'aller plus loin (`faute`), en gris ce qui aide. */
interface Note { texte: string; faute?: true }

/** Le logo du site d'une ligne que son adresse appelle (Calendly, Ko-fi, Instagram…), dans la couleur de sa marque. */
function logoDe(l: LigneAjout): { nom: string; couleur?: string } | undefined {
  const nom = l.auto && l.url ? logoAdresse(l.url) ?? reseauDeUrl(l.url) ?? undefined : undefined;
  return nom ? { nom, couleur: COULEURS_LOGOS[nom] ?? couleurReseau(nom) } : undefined;
}

/**
 * Ce qui est tapé, et ce qu'il donne : les lignes trouvées, puis la liste de départ quand rien ne vient (et au
 * téléphone, toujours, sous un filet : la feuille ne rapetisse pas et ne laisse pas de vide), la ligne sous le champ, ce
 * qu'Entrée prend. `depart` : ce que le champ montre en s'ouvrant.
 */
function useChoix(principal: boolean, { onChoisir, onColler, onReseau }: GestesAjout, { depart = '', suiteToujours = false, ordre }: { depart?: string; suiteToujours?: boolean;
  /** L'ordre de la liste de départ, celui où elle se lit (au bureau, les tuiles puis les familles) : les flèches le suivent. */
  ordre?: (lignes: LigneAjout[]) => LigneAjout[] }) {
  const droits = useDroits();
  const voirOffres = useVoirOffres();
  const [texte, setTexte] = useState(depart);
  const [note, setNote] = useState<Note | null>(null);
  const changer = (t: string) => { setTexte(t); setNote(null); };
  const options = { principal, vitrine: !!droits.vitrine };
  const trouve = choixAjout(texte, options);
  const { mode } = trouve;
  const lignes = mode === 'vide' && ordre ? ordre(trouve.lignes) : trouve.lignes;
  // Un bloc réservé reste dans la liste, avec le nom de son offre : le prendre mène aux offres.
  const reserve = (l: LigneAjout) => !!l.entree.fonction && !droits[l.entree.fonction];
  const permise = (l: LigneAjout) => !reserve(l) || !!voirOffres;
  const aucun = mode === 'mots' && !lignes.length;
  const suite = mode !== 'vide' && (suiteToujours || aucun) ? choixPour(principal).filter(e => !lignes.some(l => l.entree === e)).map((entree): LigneAjout => ({ entree })) : [];
  const toutes = [...lignes, ...suite];
  // Entrée prend la première ligne trouvée qui pose un bloc ; une ligne réservée ne mène aux offres que choisie.
  const premiere = texte.trim() ? lignes.findIndex(l => !reserve(l)) : -1;
  const [actif, poser, bouger] = useActif(texte, toutes, permise, premiere);
  const message: Note | null = note ?? (mode === 'saisie' ? { texte: aideSaisie(texte) }
    : aucun ? { texte: `Aucun bloc pour « ${texte.trim()} ». Colle une adresse, ou choisis dans la liste.` } : null);

  /** Prend une ligne. Réservée, elle ouvre les offres sur ce qu'on voulait en faire : après l'achat, ce bloc-là attend. */
  function agir(l: LigneAjout): boolean | void {
    const { entree, url, auto, pseudo } = l;
    if (pseudo) return onReseau(pseudo);
    if (reserve(l)) {
      const type = TYPES_VITRINE.includes(entree.type) ? entree.type as TypeVitrine : undefined;
      voirOffres?.(entree.fonction, type ? { type, ...(url ? { url } : {}) } : undefined);
      return;
    }
    if (auto && url) return onColler(url);
    return onChoisir(entree.type, entree.modele, url);
  }
  /** Entrée : la ligne active ; une adresse pas finie dit ce qui manque ; des lignes toutes réservées le disent, sans ouvrir les offres. */
  function entree(prendre: (l: LigneAjout) => void) {
    const l = toutes[actif];
    if (l) { prendre(l); return; }
    if (!texte.trim()) return;
    if (mode === 'saisie') { setNote({ texte: aideSaisie(texte, true), faute: true }); return; }
    const r = lignes.find(reserve);
    if (r?.entree.fonction) setNote({ texte: `${r.entree.nom} vient avec Hopla ${offreDe(r.entree.fonction)} : choisis la ligne pour voir les offres.` });
  }
  const nomDe = (l: LigneAjout) => [l.entree.nom, l.detail, reserve(l) && l.entree.fonction && `avec Hopla ${offreDe(l.entree.fonction)} : voir les offres`]
    .filter(Boolean).join(', ');
  // Ce que le choix devient, dit aux lecteurs d'écran quand on cesse de taper (une faute, elle, se dit tout de suite).
  const devient = (l: LigneAjout) => (/^mailto:/i.test(l.url ?? '') ? 'un lien e-mail' : l.entree.type === 'lien' ? 'un lien' : DEVENU[l.entree.type as TypeAdresse]);
  const dire = note ? (note.faute ? '' : note.texte)
    : mode === 'adresse' ? `Cette adresse devient ${devient(lignes[0])}.`
      : mode === 'numero' ? 'Ce numéro devient un lien d’appel.'
        : mode === 'pseudo' ? 'Ce pseudo peut rejoindre tes réseaux.'
          : mode === 'mots' && lignes.length ? `${lignes.length} bloc${lignes.length > 1 ? 's' : ''} trouvé${lignes.length > 1 ? 's' : ''}.`
            : message?.texte ?? '';
  const [annonce, setAnnonce] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setAnnonce(dire), 400);
    return () => clearTimeout(t);
  }, [dire]);
  return { texte, changer, note, setNote, mode, lignes, suite, toutes, actif, poser, bouger, message, reserve, permise, agir, entree, nomDe, annonce, lire: (s: string) => choixAjout(s, options) };
}
type Choix = ReturnType<typeof useChoix>;

/**
 * La ligne active : `premiere` dès qu'on tape, aucune sur la liste de départ tant qu'on n'a pas bougé. Elle y revient
 * quand ce qu'on tape change ; les flèches passent les lignes qu'on ne peut pas prendre, et bouclent.
 */
function useActif(texte: string, lignes: LigneAjout[], permise: (l: LigneAjout) => boolean, premiere: number) {
  const [etat, setEtat] = useState({ texte, i: premiere });
  const i = etat.texte === texte && etat.i < lignes.length ? etat.i : premiere;
  const poser = (j: number) => setEtat({ texte, i: j });
  function bouger(sens: 1 | -1) {
    const n = lignes.length;
    let j = i < 0 ? (sens > 0 ? -1 : n) : i;
    for (let k = 0; k < n; k++) {
      j = (j + sens + n) % n;
      if (permise(lignes[j])) { poser(j); return; }
    }
  }
  return [i, poser, bouger] as const;
}

/** Ce que dit le champ vide, du plus complet au plus court : au téléphone, le plus long qui tient sans être coupé, « Coller » compris. */
const AIDES = ['Colle une adresse ou cherche un bloc', 'Adresse ou nom d’un bloc', 'Une adresse'];
function useAide(champ: RefObject<HTMLInputElement | null>) {
  const [aide, setAide] = useState(AIDES[0]);
  useLayoutEffect(() => {
    const i = champ.current;
    if (!i) return;
    const mesure = document.createElement('canvas').getContext('2d');
    const mesurer = () => {
      if (!mesure) return;
      const s = getComputedStyle(i);
      mesure.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
      const place = i.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
      setAide(AIDES.find(t => mesure.measureText(t).width <= place) ?? AIDES[AIDES.length - 1]);
    };
    mesurer();
    // La police arrive après le premier dessin, et la marge de droite change avec « Coller » : on remesure.
    void document.fonts?.ready.then(mesurer);
    const suivi = new ResizeObserver(mesurer);
    suivi.observe(i);
    return () => suivi.disconnect();
  }, [champ]);
  return aide;
}

/** Le picto d'une ligne, ou le logo du site que son adresse appelle, sans fond ni cadre. */
function PictoLigne({ l, taille, className }: { l: LigneAjout; taille: number; className: string }) {
  const logo = logoDe(l);
  return (
    <span className={`${className} ${logo?.couleur ? '' : 'text-white/80'}`} style={logo?.couleur ? { color: logo.couleur } : undefined}>
      <Icone nom={logo?.nom ?? l.entree.picto} taille={taille} />
    </span>
  );
}

/** Ce que porte une option du choix au bureau : son id pour `aria-activedescendant`, son état, et le clic qui la prend sans ôter la main au champ. */
function attributsOption(id: string, choix: Choix, prendre: (l: LigneAjout) => void, l: LigneAjout, i: number) {
  return {
    id: `${id}-o${i}`, role: 'option', 'aria-selected': i === choix.actif, 'aria-disabled': !choix.permise(l) || undefined, 'aria-label': choix.nomDe(l),
    onMouseDown: (e: { preventDefault: () => void }) => e.preventDefault(), onPointerMove: () => { if (i !== choix.actif && choix.permise(l)) choix.poser(i); }, onClick: () => prendre(l),
  } as const;
}

/** Au bureau : les lignes du choix, sous le champ. Le champ garde la main ; la ligne active se dit par `aria-activedescendant`. */
function Options({ id, choix, prendre }: { id: string; choix: Choix; prendre: (l: LigneAjout) => void }) {
  const { actif } = choix;
  // La ligne active reste en vue quand les flèches la font sortir de la liste.
  useEffect(() => { document.getElementById(`${id}-o${actif}`)?.scrollIntoView({ block: 'nearest' }); }, [id, actif]);
  if (choix.mode === 'vide') return <DepartBureau id={id} choix={choix} prendre={prendre} />;
  return (
    <div id={`${id}-liste`} role="listbox" aria-label="Blocs" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {choix.toutes.map((l, i) => (
        // Un clic ne prend pas le focus au champ : il prend la ligne, et le champ reste où il était.
        <div key={l.entree.nom} {...attributsOption(id, choix, prendre, l, i)} className="adm-menu-item text-white">
          <PictoLigne l={l} taille={17} className="flex shrink-0" />
          <span className="min-w-0 flex-1 truncate">{l.entree.nom}</span>
          {l.detail && <span className="adm-menu-hote">{l.detail}</span>}
          {choix.reserve(l) && l.entree.fonction && <Etiquette fonction={l.entree.fonction} />}
        </div>
      ))}
    </div>
  );
}

/**
 * Au téléphone : la feuille « Ajouter un bloc ». Le champ ne prend pas la main tout seul (le clavier ne monte pas) ;
 * « Coller », dans le champ vide, prend le presse-papiers d'un toucher, et une adresse collée devient un bloc d'un coup.
 * Absent là où le navigateur ne lit pas le presse-papiers.
 */
export function FeuilleAjout({ ouverte, onFermer, adresse, principal, ...gestes }: GestesAjout & { ouverte: boolean; onFermer: () => void;
  /** L'adresse du bloc neuf d'où l'on revient par sa flèche : elle attend dans le champ. */
  adresse?: string;
  principal: boolean }) {
  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Ajouter un bloc">
      {fermer => <ChoixTelephone key={adresse ?? ''} depart={adresse ?? ''} principal={principal} gestes={gestes} fermer={fermer} />}
    </Feuille>
  );
}

function ChoixTelephone({ depart, principal, gestes, fermer }: { depart: string; principal: boolean; gestes: GestesAjout; fermer: (apres?: () => void) => void }) {
  const choix = useChoix(principal, gestes, { depart, suiteToujours: true });
  // La liste de départ entre en cascade, une fois : les lignes d'une recherche arrivent sans bouger.
  const [aTape, setATape] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  const avaitFocus = useRef(false);
  const idMessage = useId();
  const lisible = typeof navigator !== 'undefined' && !!navigator.clipboard?.readText;
  const aide = useAide(champ);
  const { texte, message } = choix;
  const changer = (t: string) => { choix.changer(t); setATape(true); };
  /** Une ligne réservée ouvre les offres par-dessus la feuille, qu'on retrouve en les fermant ; les autres ferment la feuille, puis font leur geste. */
  function prendre(l: LigneAjout) {
    if (!choix.permise(l)) return;
    if (choix.reserve(l)) { choix.agir(l); return; }
    fermer(() => { choix.agir(l); });
  }
  /** Une adresse ou un numéro collés deviennent un bloc d'un coup ; le reste attend dans le champ. */
  function poser(t: string) {
    changer(t.trim());
    const r = choix.lire(t);
    if (seColle(r.mode)) prendre(r.lignes[0]);
    else if (r.mode === 'saisie') choix.setNote({ texte: aideSaisie(t, true), faute: true });
  }
  async function coller() {
    let t = '';
    // Refusé par le navigateur : le geste habituel reste, dans le champ. Rien n'y est faux : la ligne reste grise.
    try { t = (await navigator.clipboard.readText()).trim(); } catch { choix.setNote({ texte: 'Le presse-papiers n’a pas pu être lu : appuie longuement dans le champ, puis choisis Coller.' }); return; }
    if (!t) { choix.setNote({ texte: 'Rien à coller : copie d’abord une adresse.' }); return; }
    poser(t);
  }
  const ligne = (l: LigneAjout, i: number) => {
    const reserve = choix.reserve(l);
    return (
      <li key={l.entree.nom} style={{ '--i': i } as CSSProperties}>
        {/* La ligne qu'Entrée prendrait est teintée, comme au survol. */}
        <button type="button" disabled={!choix.permise(l)} onClick={() => prendre(l)} aria-label={choix.nomDe(l)} data-actif={i === choix.actif || undefined}
          className="adm-ligne-ajout group flex w-full items-center gap-3 rounded-xl px-2 py-1 text-left transition duration-150 hover:bg-white/[0.05] active:scale-[0.985] active:bg-white/[0.07] data-[actif]:bg-white/[0.05]">
          {/* Pas de pastille ni d'effet : le picto plein, d'une couleur, ou le logo du site, se suffit. */}
          <PictoLigne l={l} taille={22} className="grid h-10 w-9 shrink-0 place-items-center" />
          <span className="adm-ligne-ajout-nom min-w-0 flex-1 truncate font-medium text-white">{l.entree.nom}</span>
          {l.detail && <span className="min-w-0 max-w-[45%] truncate text-[13px] text-white/55">{l.detail}</span>}
          {/* Une ligne réservée garde son chevron : elle mène quelque part, aux offres. */}
          {reserve && l.entree.fonction && <Etiquette fonction={l.entree.fonction} />}
          <Icone nom="ui-chevron" taille={16} className="-rotate-90 shrink-0 text-white/25" />
        </button>
      </li>
    );
  };
  return (
    <>
      <div className="pb-2">
        <div className="relative flex items-center">
          <Icone nom="ui-recherche" taille={17} className="pointer-events-none absolute left-3.5 text-white/55" />
          <input ref={champ} className={`${classeSaisie} pl-10 ${texte ? 'pr-12' : lisible ? 'pr-[68px]' : ''}`} type="text" enterKeyHint="go" autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
            value={texte} placeholder={aide} aria-label="Colle une adresse ou cherche un bloc" autoFocus={focusAuto()}
            aria-invalid={choix.note?.faute} aria-describedby={message ? idMessage : undefined}
            onChange={e => changer(e.target.value)}
            onPaste={e => {
              if (texte.trim()) return;
              const t = e.clipboardData.getData('text');
              if (!seColle(choix.lire(t).mode)) return;
              e.preventDefault();
              poser(t);
            }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); choix.entree(prendre); } }} />
          {/* Effacer ne prend pas la main au champ : le clavier reste comme il était, levé ou baissé. */}
          {texte ? (
            <button type="button" aria-label="Effacer" onPointerDown={e => { avaitFocus.current = document.activeElement === champ.current; e.preventDefault(); }} onMouseDown={e => e.preventDefault()}
              onClick={() => { changer(''); if (avaitFocus.current) champ.current?.focus(); }}
              className="absolute inset-y-0 right-0 grid w-12 place-items-center text-white/55 transition hover:text-white active:opacity-60">
              <Icone nom="ui-fermer" taille={16} />
            </button>
          ) : lisible && (
            <button type="button" onClick={() => void coller()} className="absolute inset-y-0 right-0 flex min-w-11 items-center px-3 text-[14px] font-semibold text-bleu transition active:opacity-60">Coller</button>
          )}
        </div>
        {/* Une seule ligne sous le champ : ce qui manque (en rouge, après Entrée), ce que deviendra ce qu'on tape, ou « aucun bloc ». */}
        {message && <p id={idMessage} role={message.faute ? 'alert' : undefined} className={`mt-1.5 text-[13px] leading-snug ${message.faute ? 'font-medium text-red-300' : 'text-white/60'}`}>{message.texte}</p>}
      </div>
      {/* Rien de tapé : les suggestions en tuiles, puis le reste rangé par familles (`Depart`). Sinon, les lignes trouvées,
          puis la liste de départ sous un filet : la feuille garde sa hauteur, sans vide sous un seul résultat. */}
      {!texte.trim() ? <Depart lignes={choix.toutes} ligne={ligne} prendre={prendre} reserve={choix.reserve} permise={choix.permise} nomDe={choix.nomDe} /> : <div className="pb-2">
        {choix.lignes.length > 0 && <ul className={`${aTape ? '' : 'adm-cascade'} -mx-2 flex flex-col`}>{choix.lignes.map(ligne)}</ul>}
        {choix.suite.length > 0 && (
          <ul className={`-mx-2 flex flex-col ${choix.lignes.length ? 'mt-1.5 border-t border-white/10 pt-1.5' : ''}`}>
            {choix.suite.map((l, i) => ligne(l, choix.lignes.length + i))}
          </ul>
        )}
      </div>}
      <span className="sr-only" aria-live="polite">{choix.annonce}</span>
    </>
  );
}

/*
 * Le départ du choix au téléphone (24 octobre 2026, Lilian : « trop de liens, faut regrouper, des sous-menus, des
 * recommandations, quelques widgets carrés en 2×2 comme sur Linktree, un peu de couleur ») : quatre suggestions en
 * tuiles de couleur, un bloc gratuit et un réservé de chaque offre pour qu'on les découvre, puis chaque famille sur une
 * ligne qui se déplie, une à la fois. Une tuile est un bouton avec son nom : sa couleur est celle du bouton, l'icône y
 * reste seule.
 */
// `bref` : ce qu'en dit la tuile, au bureau comme au téléphone, en deux lignes au plus et jamais coupé.
const SUGGESTIONS: { type: TypeBloc; fond: string; bref: string }[] = [
  { type: 'lien', fond: 'var(--adm-bleu-pale)', bref: 'Site, boutique, agenda' },
  { type: 'galerie', fond: 'var(--adm-creme)', bref: 'Tes photos, qui défilent' },
  { type: 'preuve', fond: 'var(--adm-citron)', bref: 'Ta note, tes témoignages' },
  { type: 'inscription', fond: '#ffe3da', bref: 'Les e-mails de tes visiteurs' },
];
const FAMILLES: { nom: string; types: TypeBloc[] }[] = [
  { nom: 'Liens', types: ['lien', 'derniere-video'] },
  { nom: 'Texte et titres', types: ['titre', 'texte'] },
  { nom: 'Photos et infos', types: ['galerie', 'faq', 'preuve'] },
  { nom: 'Pour te joindre', types: ['formulaire', 'coordonnees', 'lieu', 'inscription'] },
];

/** Une ligne de départ qui se montre en tuile : un bloc des suggestions, sans modèle. */
const estTuile = (l: LigneAjout) => !l.entree.modele && SUGGESTIONS.some(s => s.type === l.entree.type);
const familleDe = (l: LigneAjout) => FAMILLES.find(f => f.types.includes(l.entree.type))?.nom ?? 'Autres';
/** Au bureau, la liste de départ dans l'ordre où elle se lit : les suggestions en tuiles, puis chaque famille, sans redire une tuile. */
function ordreBureau(lignes: LigneAjout[]): LigneAjout[] {
  const tuiles = SUGGESTIONS.flatMap(s => lignes.find(l => l.entree.type === s.type && !l.entree.modele) ?? []);
  const reste = lignes.filter(l => !tuiles.includes(l));
  return [...tuiles, ...[...FAMILLES.map(f => f.nom), 'Autres'].flatMap(nom => reste.filter(l => familleDe(l) === nom))];
}

/*
 * Le départ du choix au bureau (24 octobre 2026, Lilian : « la page desktop aussi faut qu'elle soit impeccable ») : les
 * quatre suggestions du téléphone en tuiles de couleur sur une rangée, puis les autres blocs rangés par famille sur deux
 * colonnes, tout en vue d'un coup d'œil. Une seule liste pour le clavier, dans l'ordre de lecture (`ordreBureau`).
 */
function DepartBureau({ id, choix, prendre }: { id: string; choix: Choix; prendre: (l: LigneAjout) => void }) {
  const { toutes } = choix;
  const n = toutes.filter(estTuile).length;
  const familles: { nom: string; lignes: [LigneAjout, number][] }[] = [];
  toutes.slice(n).forEach((l, k) => {
    const nom = familleDe(l);
    const f = familles.find(x => x.nom === nom);
    if (f) f.lignes.push([l, n + k]); else familles.push({ nom, lignes: [[l, n + k]] });
  });
  return (
    <div id={`${id}-liste`} role="listbox" aria-label="Blocs" className="adm-depart min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div role="group" aria-label="Suggestions" className="adm-depart-tuiles">
        {toutes.slice(0, n).map((l, i) => {
          const s = SUGGESTIONS.find(x => x.type === l.entree.type);
          return (
            <div key={l.entree.nom} {...attributsOption(id, choix, prendre, l, i)} className="adm-depart-tuile" style={{ background: s?.fond }}>
              <Icone nom={l.entree.picto} taille={22} className="text-bleu" />
              {choix.reserve(l) && l.entree.fonction && <span className="absolute top-2.5 right-2.5"><Etiquette fonction={l.entree.fonction} /></span>}
              <span className="mt-auto text-[13.5px] leading-tight font-semibold">{l.entree.nom}</span>
              {s && <span className="line-clamp-2 text-[12px] leading-snug text-white/65">{s.bref}</span>}
            </div>
          );
        })}
      </div>
      <p className="adm-depart-aide">Une vidéo, un agenda, une boutique ? Colle son adresse : Hopla en fait le bon bloc.</p>
      <div className="adm-depart-familles">
        {familles.map(f => (
          <div key={f.nom} role="group" aria-label={f.nom} className="break-inside-avoid pb-1.5">
            <p aria-hidden="true" className="adm-depart-famille">{f.nom}</p>
            {f.lignes.map(([l, i]) => (
              <div key={l.entree.nom} {...attributsOption(id, choix, prendre, l, i)} className="adm-menu-item text-white">
                <PictoLigne l={l} taille={17} className="flex shrink-0" />
                <span className="min-w-0 flex-1 truncate">{l.entree.nom}</span>
                {choix.reserve(l) && l.entree.fonction && <Etiquette fonction={l.entree.fonction} />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Depart({ lignes, ligne, prendre, reserve, permise, nomDe }: {
  lignes: LigneAjout[]; ligne: (l: LigneAjout, i: number) => ReactNode; prendre: (l: LigneAjout) => void;
  reserve: (l: LigneAjout) => boolean; permise: (l: LigneAjout) => boolean; nomDe: (l: LigneAjout) => string;
}) {
  const [ouverte, setOuverte] = useState<string | null>(null);
  const de = (type: TypeBloc) => lignes.find(l => l.entree.type === type && !l.entree.modele);
  const tuiles = SUGGESTIONS.flatMap(s => { const l = de(s.type); return l ? [{ l, fond: s.fond, sous: s.bref }] : []; });
  const familles = FAMILLES.map(f => ({ ...f, lignes: f.types.flatMap(t => de(t) ?? []) })).filter(f => f.lignes.length);
  return (
    <div className="flex flex-col gap-4 pb-2">
      <ul className="adm-cascade grid grid-cols-2 gap-2.5 pt-1" aria-label="Suggestions">
        {tuiles.map(({ l, fond, sous }, i) => (
          <li key={l.entree.nom} style={{ '--i': i } as CSSProperties}>
            <button type="button" disabled={!permise(l)} onClick={() => prendre(l)} aria-label={nomDe(l)} style={{ background: fond }}
              className="adm-tuile-ajout relative flex h-full w-full flex-col rounded-2xl text-left text-white transition duration-150 hover:brightness-[0.97] active:scale-[0.97]">
              <Icone nom={l.entree.picto} taille={24} className="text-bleu" />
              {reserve(l) && l.entree.fonction && <span className="absolute top-3 right-3"><Etiquette fonction={l.entree.fonction} /></span>}
              <span className="adm-tuile-ajout-nom font-semibold">{l.entree.nom}</span>
              <span className="adm-tuile-ajout-bref text-white/65">{sous}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="adm-ajout-aide text-white/60">Une vidéo, un agenda, une boutique ? Colle son adresse : Hopla en fait le bon bloc.</p>
      <ul className="-mx-2 flex flex-col">
        {familles.map(f => {
          const ici = ouverte === f.nom;
          return (
            <li key={f.nom} className="border-t border-white/10 first:border-t-0">
              <button type="button" aria-expanded={ici} onClick={() => setOuverte(ici ? null : f.nom)}
                className="adm-famille-ajout flex w-full items-center gap-3 rounded-xl px-2 text-left transition hover:bg-white/[0.05]">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="adm-famille-ajout-nom font-semibold text-white">{f.nom}</span>
                  {!ici && <span className="adm-famille-ajout-liste truncate text-white/55">{f.lignes.map(l => l.entree.nom).join(', ')}</span>}
                </span>
                <Icone nom="ui-chevron" taille={18} className={`shrink-0 text-white/40 transition-transform ${ici ? 'rotate-180' : ''}`} />
              </button>
              {ici && <ul className="adm-cascade flex flex-col pb-1.5 pl-2">{f.lignes.map((l, i) => ligne(l, i))}</ul>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Au bureau, au-dessus de la liste des blocs, la seule entrée du choix (24 octobre 2026) : le bouton « Ajouter un bloc »
 * de l'en-tête, la touche A et le bouton d'une page vide y mènent (`demande`), le champ vient en vue et prend la main.
 * Au focus, la liste de départ se déroule sous le champ ; une adresse collée devient un bloc neuf, qu'on règle dans sa
 * rangée avant de l'ajouter ; tapée, ou des mots, les lignes trouvées prennent sa place. Les flèches parcourent, Entrée
 * prend, Échap efface puis replie (et rend la main là d'où l'on venait), Tab passe à la suite sans rien jeter. Une ligne
 * réservée ouvre les offres : en revenant, le champ a gardé ce qu'on avait tapé, et sa liste se rouvre.
 */
export function ChampAjout({ principal, demande = false, demandeVue, ...gestes }: GestesAjout & { principal: boolean;
  /** Le bouton de l'en-tête ou la touche A le demandent ; `demandeVue` dit que c'est fait. */
  demande?: boolean; demandeVue?: () => void }) {
  const choix = useChoix(principal, gestes, { ordre: ordreBureau });
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<HTMLDivElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  // Là où l'on était avant le bouton de l'en-tête ou la touche A : Échap y rend la main.
  const retour = useRef<HTMLElement | null>(null);
  const id = useId();
  const { texte, message, toutes } = choix;
  const montre = ouvert && (toutes.length > 0 || !!message);
  const deroulee = montre && toutes.length > 0;
  useEffect(() => {
    const i = champ.current;
    if (!demande || !i) return;
    const ici = document.activeElement as HTMLElement | null;
    retour.current = ici && ici !== i && ici !== document.body ? ici : null;
    // Le champ en haut de l'écran s'il le faut, sous l'en-tête collé : sa liste a la place de se dérouler.
    const r = i.getBoundingClientRect(), marge = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    if (r.top < marge || r.bottom + 340 > innerHeight) i.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    focusSaisie(i, { preventScroll: true });
    setOuvert(true);
    demandeVue?.();
  }, [demande]); // eslint-disable-line react-hooks/exhaustive-deps
  // Un toucher hors du champ et de sa liste les replie (sur un écran tactile, le champ n'a pas forcément la main).
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: PointerEvent) => { if (!boite.current?.contains(e.target as Node)) setOuvert(false); };
    document.addEventListener('pointerdown', dehors);
    return () => document.removeEventListener('pointerdown', dehors);
  }, [ouvert]);
  function prendre(l: LigneAjout) {
    if (!choix.permise(l)) return;
    if (choix.reserve(l)) { choix.agir(l); return; }
    if (choix.agir(l) !== false) { choix.changer(''); retour.current = null; setOuvert(false); champ.current?.blur(); }
  }
  function touche(e: ToucheClavier<HTMLInputElement>) {
    if (e.key === 'Escape' && (texte || ouvert)) {
      e.preventDefault(); e.stopPropagation();
      if (texte) { choix.changer(''); return; }
      setOuvert(false);
      const r = retour.current;
      retour.current = null;
      if (r?.isConnected) r.focus({ preventScroll: true });
    } else if (e.key === 'Tab') setOuvert(false);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (ouvert) choix.bouger(e.key === 'ArrowDown' ? 1 : -1); else setOuvert(true);
    } else if (e.key === 'Enter') { e.preventDefault(); setOuvert(true); choix.entree(prendre); }
  }
  return (
    <div ref={boite} className="adm-coller">
      <div className="adm-coller-champ">
        <Icone nom="ui-plus" taille={15} className="adm-coller-signe" />
        <input ref={champ} type="text" role="combobox" aria-expanded={deroulee} aria-controls={deroulee ? `${id}-liste` : undefined} aria-autocomplete="list"
          aria-activedescendant={deroulee && choix.actif >= 0 ? `${id}-o${choix.actif}` : undefined}
          aria-label="Ajouter un bloc : colle une adresse ou cherche un bloc" placeholder="Colle une adresse ou cherche un bloc"
          aria-invalid={choix.note?.faute} aria-describedby={montre && message ? `${id}-message` : undefined}
          autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} value={texte}
          onChange={e => { choix.changer(e.target.value); setOuvert(true); }}
          onFocus={() => setOuvert(true)} onClick={() => setOuvert(true)} onBlur={() => setOuvert(false)}
          onPaste={e => {
            if (texte.trim()) return;
            const r = choix.lire(e.clipboardData.getData('text'));
            if (!seColle(r.mode)) return;
            e.preventDefault();
            prendre(r.lignes[0]);
          }}
          onKeyDown={touche} />
        {montre && (
          // Un clic dans la liste (sa barre de défilement comprise) laisse la main au champ.
          <div className="adm-menu adm-coller-liste" onMouseDown={e => e.preventDefault()}>
            {message && <p id={`${id}-message`} role={message.faute ? 'alert' : undefined} className={message.faute ? 'adm-menu-erreur' : 'adm-menu-vide'}>{message.texte}</p>}
            {deroulee && <Options id={id} choix={choix} prendre={prendre} />}
          </div>
        )}
      </div>
      <span className="sr-only" aria-live="polite">{ouvert ? choix.annonce : ''}</span>
    </div>
  );
}
