import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ToucheClavier } from 'react';
import type { Bloc, TypeBloc } from '../lib/types.ts';
import { TYPES_PRINCIPAL } from '../lib/types.ts';
import { adresseSaisie, pourquoiPasAdresse } from '../lib/valider.ts';
import { Icone } from '../components/Icone.tsx';
import { Feuille, classeSaisie } from './ui.tsx';
import type { Fonction } from '../lib/abonnement.ts';
import { Etiquette, offreDe, useDroits, useVoirOffres } from './offre.tsx';

/**
 * Ce qu'on ajoute à sa page. `aide` : la ligne qu'un bloc neuf dit en tête de sa feuille, seulement quand elle apprend
 * quelque chose (23 octobre 2026) ; un lien, un titre, un texte se passent d'elle. `modele` : ce qu'un bloc neuf a déjà
 * (un lien partenaire est un lien, avec sa mention) ; `fonction` : l'offre qu'il demande. `groupe` : trois familles,
 * séparées d'un filet sans titre dans le choix des blocs (23 octobre 2026) : ce qui part d'une adresse, ce qu'on
 * écrit, ce que Hopla branche tout seul.
 */
export interface TypeAjout { type: TypeBloc; nom: string; aide?: string; picto: string; fonction?: Fonction; modele?: Partial<Bloc>; groupe: 'adresse' | 'ecrit' | 'branche' }

export const TYPES: TypeAjout[] = [
  { type: 'lien', nom: 'Lien', picto: 'bloc-lien', groupe: 'adresse' },
  { type: 'lien', nom: 'Lien partenaire', aide: 'Affiliation ou collaboration payée : la mention « Publicité », et ton code promo', picto: 'bloc-partenaire', modele: { partenariat: { mention: 'publicite', code: '' } }, groupe: 'adresse' },
  { type: 'video', nom: 'Vidéo YouTube', picto: 'bloc-video', groupe: 'adresse' },
  // La vitrine : Hopla n'encaisse rien, chaque bloc mène au site qui vend, réserve ou reçoit.
  { type: 'produit', nom: 'Produit', aide: 'Sa photo et son prix, lus sur ta boutique', picto: 'bloc-produit', fonction: 'vitrine', groupe: 'adresse' },
  { type: 'reservation', nom: 'Prise de rendez-vous', aide: 'Ton agenda Calendly, Cal.com, Doctolib ou Planity', picto: 'bloc-reservation', fonction: 'vitrine', groupe: 'adresse' },
  { type: 'soutien', nom: 'Me soutenir', aide: 'Un bouton vers PayPal, Ko-fi, Tipeee ou Lydia', picto: 'bloc-soutien', fonction: 'vitrine', groupe: 'adresse' },
  { type: 'titre', nom: 'Titre de section', picto: 'bloc-titre', groupe: 'ecrit' },
  { type: 'texte', nom: 'Texte', picto: 'bloc-texte', groupe: 'ecrit' },
  { type: 'preuve', nom: 'Avis et preuves', aide: 'Ta note Google, un chiffre clé ou un témoignage, avec sa source', picto: 'bloc-preuve', fonction: 'avis', groupe: 'ecrit' },
  { type: 'derniere-video', nom: 'Ma dernière vidéo YouTube', picto: 'bloc-derniere-video', groupe: 'branche' },
  { type: 'inscription', nom: 'Ma liste d’inscrits', aide: 'Tes visiteurs laissent leur e-mail, que tu exportes ou envoies vers ta newsletter', picto: 'bloc-inscription', fonction: 'listeEmail', groupe: 'branche' },
  { type: 'newsletter', nom: 'Ma newsletter Lumail', picto: 'bloc-newsletter', groupe: 'branche' },
];

/** Vrai pour le premier type d'une famille, sauf la première : un filet le précède. */
const ouvreGroupe = (types: TypeAjout[], i: number) => i > 0 && types[i].groupe !== types[i - 1].groupe;

/** L'entrée de la liste qui décrit un bloc : un lien partenaire a la sienne. */
export const typeDe = (b: Pick<Bloc, 'type' | 'partenariat'>): TypeAjout =>
  TYPES.find(t => t.type === b.type && !!t.modele?.partenariat === !!b.partenariat) ?? TYPES.find(t => t.type === b.type)!;

/**
 * Au téléphone, en tête du choix : une adresse collée (ou tapée, puis Entrée)
 * devient un lien d'un coup, son texte lu sur le site. Une saisie qui n'est pas
 * une adresse dit pourquoi. « Coller », dans le champ vide, la prend d'un toucher
 * (23 octobre 2026) : le champ ne prend pas la main tout seul, le clavier ne monte
 * pas, et coller ne demande plus trois gestes. Absent là où le navigateur ne lit
 * pas le presse-papiers.
 */
function CollerAdresse({ ajouter, adresse = '' }: { ajouter: (url: string) => void; adresse?: string }) {
  const [valeur, setValeur] = useState(adresse);
  const [erreur, setErreur] = useState('');
  const id = useId();
  const lisible = typeof navigator !== 'undefined' && !!navigator.clipboard?.readText;
  const poser = (texte: string) => {
    const url = adresseSaisie(texte);
    if (!url) { setErreur(pourquoiPasAdresse(texte)); return; }
    ajouter(url);
  };
  async function coller() {
    let texte = '';
    try { texte = (await navigator.clipboard.readText()).trim(); } catch {
      // Refusé par le navigateur : le geste habituel reste, dans le champ.
      setErreur('Le presse-papiers n’a pas pu être lu : appuie longuement dans le champ, puis choisis Coller.');
      return;
    }
    if (!texte) { setErreur('Rien à coller : copie d’abord une adresse.'); return; }
    setValeur(texte);
    poser(texte);
  }
  return (
    <div className="pb-2">
      <div className="relative flex items-center">
        <Icone nom="ui-plus" taille={16} className="pointer-events-none absolute left-3.5 text-white/55" />
        <input className={`${classeSaisie} pl-10 ${lisible && !valeur ? 'pr-24' : ''}`} type="url" inputMode="url" enterKeyHint="go" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={valeur}
          placeholder="Colle une adresse" aria-label="Ajouter un lien depuis son adresse" aria-invalid={erreur ? true : undefined} aria-describedby={erreur ? id : undefined}
          onChange={e => { setValeur(e.target.value); if (erreur) setErreur(''); }}
          onPaste={e => {
            if (valeur.trim()) return;
            const texte = e.clipboardData.getData('text');
            if (!adresseSaisie(texte)) return;
            e.preventDefault();
            setValeur(texte);
            poser(texte);
          }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (valeur.trim()) poser(valeur); } }} />
        {lisible && !valeur && (
          <button type="button" onClick={() => void coller()} className="absolute inset-y-0 right-0 flex min-w-11 items-center px-4 text-[14px] font-semibold text-bleu transition active:opacity-60">Coller</button>
        )}
      </div>
      {erreur && <p id={id} role="alert" className="mt-1.5 text-[13px] font-medium leading-snug text-red-300">{erreur}</p>}
    </div>
  );
}

export function FeuilleAjout({ ouverte, onFermer, onChoisir, onColler, adresse, principal }: { ouverte: boolean; onFermer: () => void; onChoisir: (type: TypeBloc, modele?: Partial<Bloc>) => void;
  /** Au téléphone : une adresse collée en tête de la liste devient un lien neuf. */
  onColler?: (url: string) => void;
  /** L'adresse du bloc neuf d'où l'on revient par sa flèche : elle attend dans le champ. */
  adresse?: string;
  principal: boolean }) {
  const types = principal ? TYPES : TYPES.filter(t => !TYPES_PRINCIPAL.includes(t.type));
  const droits = useDroits();
  const voirOffres = useVoirOffres();
  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Ajouter un bloc">
      {fermer => (
        <>
        {onColler && <CollerAdresse key={adresse ?? ''} adresse={adresse} ajouter={url => fermer(() => onColler(url))} />}
        <ul className="adm-cascade -mx-2 flex flex-col pb-2">
          {types.map((t, i) => {
            // Un bloc réservé reste dans la liste, avec le nom de son offre : le toucher mène aux offres.
            const reserve = !!t.fonction && !droits[t.fonction];
            return (
            <li key={t.nom} style={{ '--i': i } as CSSProperties}>
              {ouvreGroupe(types, i) && <div aria-hidden className="adm-filet mx-2 my-1.5" />}
              <button type="button" disabled={reserve && !voirOffres} onClick={() => fermer(() => (reserve ? voirOffres?.(t.fonction) : onChoisir(t.type, t.modele)))}
                className="group flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-1 text-left transition duration-150 hover:bg-white/[0.05] active:scale-[0.985] active:bg-white/[0.07]">
                {/* Pas de pastille ni d'effet : le picto plein, d'une couleur, se suffit. */}
                <span className="grid h-10 w-9 shrink-0 place-items-center transition duration-150 ">
                  <Icone nom={t.picto} taille={22} className="text-white/80" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-white">{t.nom}</span>
                {reserve && t.fonction ? <Etiquette fonction={t.fonction} /> : <Icone nom="ui-chevron" taille={16} className="-rotate-90 text-white/25" />}
              </button>
            </li>
            );
          })}
        </ul>
        </>
      )}
    </Feuille>
  );
}

/** Une lettre tapée mène à la ligne qui commence par elle ; la même, retapée, à la suivante. Sans accents ni majuscules. */
const sansAccents = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/**
 * Au bureau, le choix des blocs se pose en menu sous le bouton qui l'ouvre (23 octobre 2026) : douze lignes ne demandent
 * ni fenêtre ni fond flouté. Les flèches parcourent la liste, une lettre mène au bloc qui commence par elle, Échap et Tab
 * la referment, un clic ailleurs la range ; le focus revient au bouton. `ancre` : le bouton qui l'a ouverte, ou celui de
 * l'en-tête pour la touche A. Rendu hors de la colonne d'édition, dont le conteneur de requêtes retiendrait `fixed`.
 */
export function MenuAjout({ ancre, onFermer, onChoisir, principal }: { ancre: HTMLElement | null; onFermer: () => void; onChoisir: (type: TypeBloc, modele?: Partial<Bloc>) => void; principal: boolean }) {
  const types = principal ? TYPES : TYPES.filter(t => !TYPES_PRINCIPAL.includes(t.type));
  const droits = useDroits();
  const voirOffres = useVoirOffres();
  const boite = useRef<HTMLDivElement>(null);
  // Collé au bouton, son bord droit sur le sien, dessous s'il y a la place, sinon au-dessus ; il suit la page qui défile.
  // Placé dès le premier rendu : sa première ligne prend le focus tout de suite.
  const calculer = (): CSSProperties => {
    const r = ancre?.getBoundingClientRect();
    if (!r) return { right: 24, top: 96, width: 280 };
    const largeur = 280;
    const left = Math.min(Math.max(12, r.right - largeur), innerWidth - largeur - 12);
    const dessous = innerHeight - r.bottom - 18, dessus = r.top - 18;
    return dessous >= 360 || dessous >= dessus
      ? { left, width: largeur, top: r.bottom + 6, maxHeight: dessous }
      : { left, width: largeur, bottom: innerHeight - r.top + 6, maxHeight: dessus };
  };
  const [place, setPlace] = useState<CSSProperties>(calculer);
  const tape = useRef({ texte: '', quand: 0 });
  const fermerRef = useRef(onFermer);
  fermerRef.current = onFermer;
  useLayoutEffect(() => {
    const placer = () => setPlace(calculer());
    addEventListener('resize', placer);
    addEventListener('scroll', placer, true);
    return () => { removeEventListener('resize', placer); removeEventListener('scroll', placer, true); };
  }, [ancre]); // eslint-disable-line react-hooks/exhaustive-deps
  const lignes = () => [...(boite.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])];
  const fermer = (rendre = true) => { fermerRef.current(); if (rendre) ancre?.focus({ preventScroll: true }); };
  useEffect(() => {
    lignes()[0]?.focus({ preventScroll: true });
    const dehors = (e: PointerEvent) => { const t = e.target as Node; if (!boite.current?.contains(t) && !ancre?.contains(t)) fermerRef.current(); };
    document.addEventListener('pointerdown', dehors);
    return () => document.removeEventListener('pointerdown', dehors);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  function touche(e: ToucheClavier) {
    const l = lignes();
    const i = l.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fermer(); }
    else if (e.key === 'Tab') { e.preventDefault(); fermer(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); l[(i + (e.key === 'ArrowDown' ? 1 : -1) + l.length) % l.length]?.focus(); }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); l[e.key === 'Home' ? 0 : l.length - 1]?.focus(); }
    else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && e.key !== ' ') {
      e.preventDefault();
      const t = tape.current, maintenant = Date.now();
      t.texte = (maintenant - t.quand < 700 ? t.texte : '') + sansAccents(e.key);
      t.quand = maintenant;
      const seule = [...t.texte].every(c => c === t.texte[0]);
      const ordre = seule ? [...l.slice(i + 1), ...l.slice(0, i + 1)] : l;
      ordre.find(x => sansAccents(x.textContent ?? '').startsWith(seule ? t.texte[0] : t.texte))?.focus();
    }
  }
  return (
    <div ref={boite} onKeyDown={touche} className="adm-menu adm-fondu fixed z-50 overflow-y-auto overscroll-contain" style={place}>
      <div role="menu" aria-label="Ajouter un bloc">
        {types.map((t, i) => {
          const reserve = !!t.fonction && !droits[t.fonction];
          return (
            <Fragment key={t.nom}>
            {ouvreGroupe(types, i) && <div role="separator" className="adm-filet mx-1.5 my-1" />}
            <button type="button" role="menuitem" tabIndex={-1} disabled={reserve && !voirOffres}
              aria-label={reserve && t.fonction ? `${t.nom}, avec Hopla ${offreDe(t.fonction)} : voir les offres` : undefined}
              onClick={() => { fermer(false); if (reserve) voirOffres?.(t.fonction); else onChoisir(t.type, t.modele); }}
              className="adm-menu-item text-white">
              <Icone nom={t.picto} taille={17} className="shrink-0 text-white/80" />
              <span className="min-w-0 flex-1 truncate text-left">{t.nom}</span>
              {reserve && t.fonction && <Etiquette fonction={t.fonction} />}
            </button>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
