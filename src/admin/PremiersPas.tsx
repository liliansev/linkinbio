import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Api, Bloc, PagePublique, Reglages, Reseau } from '../lib/types.ts';
import { SANS_COULEURS, nouveauBloc, sansSchema, urlPage } from '../lib/types.ts';
import { adresseSaisie, pourquoiPasAdresse, pourquoiPasReseau } from '../lib/valider.ts';
import { THEMES } from '../lib/themes.ts';
import { RESEAUX_ACCUEIL, THEMES_ACCUEIL, nomSite, urlReseau } from '../lib/demarrage.ts';
import { PageLiens } from '../components/PageLiens.tsx';
import { NOMS_AUDIENCES, RESEAUX_SOCIAUX, reseauxDePartage } from '../lib/provenance.ts';
import { Icone, NOMS_RESEAUX } from '../components/Icone.tsx';
import { Pastille } from './OngletApparence.tsx';
import { BoutonCopier, BoutonPrincipal, choisirFichier, copierTexte, classeBouton, classeSaisie, flechesRadio, preparerImage, vibrer } from './ui.tsx';

/*
 * L'arrivée d'un compte neuf, juste après les CGU : quatre questions, et la
 * page se construit sous les yeux à chaque réponse. Tout s'enregistre au fil
 * de l'eau ; chaque étape se passe, et « Plus tard » mène tout de suite à
 * l'éditeur. Les étapes laissées de côté restent dans « Bien démarrer ».
 * Où l'on mettra son lien ne se demande pas : la page voit d'où arrive
 * chaque visiteur, et chaque bloc se règle réseau par réseau (« Afficher sur »).
 */

type Etape = 'profil' | 'liens' | 'reseaux' | 'style' | 'fin';
const ETAPES: Etape[] = ['profil', 'liens', 'reseaux', 'style', 'fin'];
const QUESTIONS = 4;

/** Ce que le navigateur retient : les premiers pas sont faits (ou remis à plus tard). */
export const CLE_PREMIERS_PAS = 'hopla-premiers-pas';
const CLE_PARTAGE = 'hopla-page-partagee';
const CLE_ETAPE = 'hopla-premiers-pas-etape';
const noter = (cle: string) => { try { localStorage.setItem(cle, '1'); } catch { /* stockage refusé */ } };
export const premiersPasFaits = () => { try { return localStorage.getItem(CLE_PREMIERS_PAS) === '1'; } catch { return false; } };

interface Ligne { id: string; url: string; titre: string; lecture: boolean }
const nouvelId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Pour juger un thème sur une page sans lien, des boutons d'exemple (jamais enregistrés). */
const EXEMPLES = ['Mon site', 'Prendre rendez-vous', 'Ma boutique'].map((titre, i) => ({ ...nouveauBloc('lien', `exemple-${i}`), titre, url: '#' }));

export function PremiersPas({ compte, reglages, blocs, onReglages, onPoserBlocs, envoyerImage, apercuSite, onFin }: {
  compte: PagePublique['compte'];
  reglages: Reglages;
  blocs: Bloc[];
  onReglages: (r: Reglages) => void;
  onPoserBlocs: (blocs: Bloc[]) => void;
  envoyerImage: (d: string) => Promise<string>;
  apercuSite: Api['apercuSite'];
  /** `suite` : « lien » ouvre aussitôt l'ajout d'un lien dans l'éditeur. */
  onFin: (suite?: 'lien') => void;
}) {
  // L'étape survit à un rechargement ou à un passage par une autre app : ce qui est tapé est déjà enregistré, la place aussi.
  // Elle est retenue par son nom : une étape ajoutée ou retirée ne décale pas celle où l'on était.
  const [i, setI] = useState(() => { try { return Math.max(0, ETAPES.indexOf(sessionStorage.getItem(CLE_ETAPE) as Etape)); } catch { return 0; } });
  useEffect(() => { try { sessionStorage.setItem(CLE_ETAPE, ETAPES[i]); } catch { /* stockage refusé */ } }, [i]);
  const etape = ETAPES[i];
  // À chaque étape, le focus va à sa question : un lecteur d'écran l'annonce, Tab repart de là.
  const titre = useRef<HTMLHeadingElement>(null);
  const premiere = useRef(true);
  useEffect(() => { if (premiere.current) { premiere.current = false; return; } titre.current?.focus({ preventScroll: true }); }, [i]);
  const [lignes, setLignes] = useState<Ligne[]>(() => [0, 1, 2].map(() => ({ id: nouvelId(), url: '', titre: '', lecture: false })));
  // Les réseaux ouverts, et ce qui a été tapé pour chacun (un pseudo ou une adresse).
  const [saisies, setSaisies] = useState<Partial<Record<Reseau, string>>>({});
  const [envoi, setEnvoi] = useState(false);
  const [photoRatee, setPhotoRatee] = useState(false);
  // Les champs qu'on a quittés : une adresse ou un pseudo qui ne mène nulle part le dit seulement là.
  const [quittes, setQuittes] = useState<Set<string>>(() => new Set());
  const [copie, setCopie] = useState(false);
  const [tous, setTous] = useState(false);
  // Un Continuer sur un champ faux s'arrête une fois et montre le champ ; le second passe sans lui.
  const [ignorer, setIgnorer] = useState(false);
  const [nomVide, setNomVide] = useState(false);
  const fichier = useRef<HTMLInputElement>(null);
  const adressePage = urlPage(compte);
  const peutPartager = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  // Le titre de l'onglet suit le nom tant qu'il est celui donné à la création (« Marie Test · Hopla »).
  const profil = (champs: Partial<Reglages['profil']>) => onReglages({
    ...reglages, profil: { ...reglages.profil, ...champs },
    ...(champs.nom !== undefined && reglages.seo.titre === `${reglages.profil.nom} · Hopla` ? { seo: { ...reglages.seo, titre: `${champs.nom} · Hopla` } } : {}),
  });

  async function photo(f: File | undefined) {
    if (!f) return;
    setEnvoi(true); setPhotoRatee(false);
    try { profil({ avatar: await envoyerImage(await preparerImage(f, 'carre')) }); } catch { setPhotoRatee(true); } finally { setEnvoi(false); if (fichier.current) fichier.current.value = ''; }
  }

  /* ---- Les liens : l'adresse collée, le titre se remplit tout seul ---- */
  const brouillons = useMemo(() => lignes.flatMap(l => {
    const url = adresseSaisie(l.url);
    return url ? [{ ...nouveauBloc('lien', l.id), ...blocs.find(b => b.id === l.id), url, titre: l.titre.trim() || nomSite(url) }] : [];
  }), [lignes, blocs]);
  const majLigne = (id: string, champs: Partial<Ligne>) => setLignes(ls => ls.map(l => (l.id === id ? { ...l, ...champs } : l)));
  async function lireSite(l: Ligne) {
    const url = adresseSaisie(l.url);
    if (!url || l.titre.trim()) return;
    const repli = nomSite(url);
    majLigne(l.id, { titre: repli, lecture: true });
    try {
      const site = await apercuSite(url, false);
      // On ne remplace que le nom de repli : un titre tapé entre-temps reste.
      if (site.titre) setLignes(ls => ls.map(x => (x.id === l.id && x.titre === repli ? { ...x, titre: site.titre.slice(0, 80) } : x)));
    } catch { /* le nom du site suffit */ } finally { majLigne(l.id, { lecture: false }); }
  }
  /** Les liens valides partent sur la page ; ceux déjà posés sont mis à jour. */
  function poserLiens() { if (brouillons.length) onPoserBlocs(brouillons); }

  /* ---- Les réseaux : un pseudo suffit ---- */
  const ouverts = Object.keys(saisies) as Reseau[];
  function majReseau(r: Reseau, saisie: string | null) {
    const suivantes = { ...saisies };
    if (saisie === null) delete suivantes[r]; else suivantes[r] = saisie;
    setSaisies(suivantes);
    // Les réseaux qu'on n'a pas touchés ici restent ; les autres prennent ce qui vient d'être tapé.
    const touches = new Set([...Object.keys(saisies), ...Object.keys(suivantes)]);
    const tapes = (Object.entries(suivantes) as [Reseau, string][]).map(([reseau, s]) => ({ reseau, url: urlReseau(reseau, s) })).filter(x => x.url);
    onReglages({ ...reglages, reseaux: [...reglages.reseaux.filter(x => !touches.has(x.reseau)), ...tapes] });
  }
  function ouvrirReseau(r: Reseau) {
    vibrer(5);
    setSaisies(s => ({ ...s, [r]: s[r] ?? '' }));
    setTimeout(() => document.getElementById(`reseau-${r}`)?.focus(), 30);
  }

  /* ---- La marche ---- */
  const fautifs: string[] = etape === 'liens' ? lignes.filter(l => l.url.trim() && !adresseSaisie(l.url)).map(l => l.id)
    : etape === 'reseaux' ? ouverts.filter(r => (saisies[r] ?? '').trim() && !urlReseau(r, saisies[r] ?? '')) : [];
  function suivant() {
    // Le nom s'affiche en haut de la page : il ne part jamais vide.
    if (etape === 'profil' && !reglages.profil.nom.trim()) { vibrer(20); setNomVide(true); document.getElementById('premiers-nom')?.focus(); return; }
    if (fautifs.length && !ignorer) {
      vibrer(20);
      setQuittes(q => new Set([...q, ...fautifs]));
      setIgnorer(true);
      document.getElementById(etape === 'liens' ? `lien-${fautifs[0]}` : `reseau-${fautifs[0]}`)?.focus();
      return;
    }
    setIgnorer(false);
    vibrer(8);
    if (etape === 'liens') poserLiens();
    // Une ambiance choisie ici compte pour l'étape « Choisis ton thème » de Bien démarrer.
    if (etape === 'style') noter('hopla-themes-vus');
    // Les réseaux qu'on vient de relier sont ceux où l'on mettra son lien : la fin les nomme, et « Afficher sur » les propose d'abord dans chaque bloc.
    if (etape === 'reseaux' && !reglages.vuesReseaux.length) {
      const relies = RESEAUX_SOCIAUX.filter(a => reglages.reseaux.some(r => r.reseau === a && r.url));
      if (relies.length) onReglages({ ...reglages, vuesReseaux: relies });
    }
    setI(n => Math.min(n + 1, ETAPES.length - 1));
    scrollTo({ top: 0 });
  }
  function terminer(suite?: 'lien') {
    if (!reglages.profil.nom.trim()) profil({ nom: compte.pseudo });
    if (etape === 'liens') poserLiens();
    noter(CLE_PREMIERS_PAS);
    try { sessionStorage.removeItem(CLE_ETAPE); } catch { /* stockage refusé */ }
    onFin(suite);
  }
  async function copier() {
    if (await copierTexte(adressePage)) { vibrer(8); setCopie(true); noter(CLE_PARTAGE); setTimeout(() => setCopie(false), 1800); }
  }
  async function partager() {
    if (!peutPartager) return copier();
    try { await navigator.share({ title: reglages.profil.nom || 'Ma page', url: adressePage }); noter(CLE_PARTAGE); } catch { /* partage annulé */ }
  }

  // L'aperçu : la vraie page, avec les liens en cours de saisie, et des exemples pour juger un thème quand il n'y en a pas.
  const visibles = useMemo(() => {
    const liste = [...brouillons, ...blocs.filter(b => !brouillons.some(x => x.id === b.id))].filter(b => b.public);
    return etape === 'style' && !liste.some(b => b.type === 'lien') ? [...liste, ...EXEMPLES] : liste;
  }, [brouillons, blocs, etape]);

  const rempli = etape === 'profil' ? true : etape === 'liens' ? brouillons.length > 0 || lignes.some(l => l.url.trim()) : etape === 'reseaux' ? reglages.reseaux.some(r => r.url) || ouverts.some(r => (saisies[r] ?? '').trim()) : true;
  const libelle = ignorer && fautifs.length
    ? (etape === 'liens' ? (fautifs.length > 1 ? 'Continuer sans ces liens' : 'Continuer sans ce lien') : (fautifs.length > 1 ? 'Continuer sans ces réseaux' : 'Continuer sans ce réseau'))
    : etape === 'style' ? 'C’est parti' : rempli ? 'Continuer' : 'Passer cette étape';

  // Le dernier écran nomme les réseaux reliés ; sans lien sur la page, il propose d'abord d'en ajouter un plutôt que de la partager vide.
  const sansLien = !blocs.some(b => b.type === 'lien' && b.public && b.url);
  const sociaux = reglages.vuesReseaux.filter(a => a !== 'qr');
  const ou = reglages.vuesReseaux.length && !sociaux.length ? [] : reseauxDePartage(sociaux);
  const bioOu = ou.slice(0, 2).map(a => NOMS_AUDIENCES[a]).join(' ou ');
  const contenu: Record<Etape, { titre: string; aide: string; corps: ReactNode }> = {
    profil: {
      titre: 'Ta page, à ton nom',
      aide: 'Ton nom et une phrase sur ce que tu fais. Tout se change ensuite.',
      corps: (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={e => choisirFichier(fichier.current, e.currentTarget)} className="flex shrink-0 flex-col items-center gap-1 self-start transition active:scale-95">
              {/* Sans photo, l'icône seule à sa place : pas de rond vide autour. */}
              <span className="relative grid h-[60px] w-[60px] place-items-center overflow-hidden rounded-full text-white/70">
                {reglages.profil.avatar ? <img src={reglages.profil.avatar} alt="" className="h-full w-full object-cover" /> : <Icone nom="photo" taille={34} />}
                {envoi && <span className="absolute inset-0 grid place-items-center bg-black/55 text-[12px] text-nuit">…</span>}
              </span>
              <span className="text-[12.5px] font-medium text-white/60">{reglages.profil.avatar ? 'Changer' : 'Ta photo'}</span>
            </button>
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-[13px] font-medium text-white/60">Ton nom</span>
              <input id="premiers-nom" className={classeSaisie} value={reglages.profil.nom} maxLength={80} autoComplete="name" onFocus={e => e.currentTarget.select()} onChange={e => { setNomVide(false); profil({ nom: e.target.value }); }}
                aria-invalid={nomVide || undefined} aria-describedby={nomVide ? 'erreur-nom' : undefined} />
              {nomVide && <p id="erreur-nom" role="alert" className="mt-1.5 text-[13px] font-medium text-red-300">Écris ton nom : il s’affiche en haut de ta page.</p>}
            </label>
          </div>
          {photoRatee && <p className="text-[13px] text-red-300" role="alert">La photo n’est pas passée. Essaie une autre image, en JPG ou PNG.</p>}
          <label>
            <span className="mb-1 block text-[13px] font-medium text-white/60">Ta bio</span>
            <textarea className={`${classeSaisie} min-h-[76px] resize-none`} rows={2} maxLength={300} placeholder="Céramiste à Lyon. Pièces uniques et ateliers le samedi."
              value={reglages.profil.bio} onChange={e => profil({ bio: e.target.value })} />
          </label>
        </div>
      ),
    },
    liens: {
      titre: 'Tes liens les plus utiles',
      aide: 'Ton site, ta prise de rendez-vous, ta boutique : colle l’adresse, le titre se remplit.',
      corps: (
        <ol className="flex flex-col gap-2.5">
          {lignes.map((l, n) => {
            const valide = !!adresseSaisie(l.url);
            const fausse = quittes.has(l.id) && !!l.url.trim() && !valide;
            return (
              <li key={l.id} className="rounded-xl border border-white/15 bg-nuit p-1.5 transition hover:border-white/30 focus-within:border-white focus-within:ring-1 focus-within:ring-white">
                <div className="flex items-center gap-2">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center text-[14px] font-semibold ${valide ? 'text-white' : 'text-white/55'}`}>
                    {valide ? <Icone nom="ui-ok" taille={16} /> : n + 1}
                  </span>
                  <input id={`lien-${l.id}`} aria-label={`Adresse du lien ${n + 1}`} className="min-h-11 min-w-0 flex-1 bg-transparent px-1 text-[16px] text-white outline-none placeholder:text-white/55 focus-visible:!outline-none"
                    type="url" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder={['Ex. ton-site.fr', 'Ex. calendly.com/toi', 'Ex. ta-boutique.fr'][n]}
                    value={l.url} aria-invalid={fausse || undefined} aria-describedby={fausse ? `erreur-${l.id}` : undefined}
                    onChange={e => majLigne(l.id, { url: e.target.value })} onBlur={() => { setQuittes(q => new Set(q).add(l.id)); lireSite(l); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget.closest('li')?.nextElementSibling?.querySelector('input') as HTMLInputElement | null)?.focus(); } }} />
                </div>
                {fausse && <p id={`erreur-${l.id}`} role="alert" className="px-2 pb-1.5 text-[13px] font-medium text-red-300">{pourquoiPasAdresse(l.url)}</p>}
                {valide && (
                  <label className="mt-1 flex items-center gap-2 border-t border-white/[0.06] pt-1">
                    <span className="w-9 shrink-0 text-center text-[12px] text-white/55">Titre</span>
                    <input className="min-h-10 min-w-0 flex-1 bg-transparent px-1 text-[15px] text-white outline-none placeholder:text-white/55 focus-visible:!outline-none" maxLength={80}
                      placeholder={l.lecture ? 'Lecture du site…' : nomSite(adresseSaisie(l.url))} value={l.titre} onChange={e => majLigne(l.id, { titre: e.target.value })} />
                  </label>
                )}
              </li>
            );
          })}
        </ol>
      ),
    },
    reseaux: {
      titre: 'Où te suivre ?',
      aide: 'Touche un réseau et tape ton pseudo. Les icônes s’affichent sous ton nom.',
      corps: (
        <div className="flex flex-col gap-3">
          {ouverts.length > 0 && (
            <ul className="flex flex-col gap-2">
              {ouverts.map(r => {
                const ok = !!urlReseau(r, saisies[r] ?? '');
                const faux = quittes.has(r) && !!(saisies[r] ?? '').trim() && !ok;
                return (
                  <li key={r} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/15 bg-nuit p-1.5 pl-3 transition hover:border-white/30 focus-within:border-white focus-within:ring-1 focus-within:ring-white">
                    <span className={ok ? 'text-white' : 'text-white/60'}><Icone nom={r} taille={20} /></span>
                    <input id={`reseau-${r}`} aria-label={`Ton ${NOMS_RESEAUX[r]}`} className="min-h-11 min-w-0 flex-1 bg-transparent px-1 text-[16px] text-white outline-none placeholder:text-white/55 focus-visible:!outline-none"
                      autoCapitalize="off" autoCorrect="off" spellCheck={false} inputMode={r === 'email' ? 'email' : 'text'}
                      placeholder={r === 'email' ? 'toi@exemple.fr' : r === 'spotify' ? 'Adresse de ta page Spotify' : `Ton pseudo ${NOMS_RESEAUX[r]}`}
                      value={saisies[r] ?? ''} onChange={e => majReseau(r, e.target.value)} onBlur={() => setQuittes(q => new Set(q).add(r))}
                      aria-invalid={faux || undefined} aria-describedby={faux ? `erreur-${r}` : undefined} />
                    <button type="button" onClick={() => majReseau(r, null)} aria-label={`Retirer ${NOMS_RESEAUX[r]}`}
                      className={classeBouton.icone}><Icone nom="ui-fermer" taille={16} /></button>
                    {faux && <p id={`erreur-${r}`} role="alert" className="w-full pr-2 pb-1 text-[13px] font-medium text-red-300">{pourquoiPasReseau(r, saisies[r] ?? '')}</p>}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-1">
            {RESEAUX_ACCUEIL.filter((r, n) => !ouverts.includes(r) && (tous || n < 5)).map(r => (
              <button key={r} type="button" onClick={() => ouvrirReseau(r)}
                className="flex w-[62px] flex-col items-center gap-1 rounded-xl py-2 text-white/85 transition hover:bg-white/[0.07] active:scale-95">
                <Icone nom={r} taille={24} />
                <span className="w-full truncate text-center text-[11.5px] text-white/60">{NOMS_RESEAUX[r]}</span>
              </button>
            ))}
            {!tous && <button type="button" onClick={() => setTous(true)} className="flex min-h-12 items-center gap-1.5 rounded-xl px-3 text-[14px] font-medium text-white/80 transition hover:bg-white/[0.07] hover:text-white"><Icone nom="ui-plus" taille={15} />Autres réseaux</button>}
          </div>
        </div>
      ),
    },
    style: {
      titre: 'Choisis ton thème',
      aide: 'Les couleurs, la police et les boutons suivent. Les autres t’attendent dans Design.',
      corps: (
        // Les dix d'un coup, en deux rangées de cinq : rien ne se cache au bout d'un défilement (Lilian, 20 octobre 2026).
        <ul onKeyDown={e => flechesRadio(e)} className="grid grid-cols-5 gap-x-2 gap-y-3.5" role="radiogroup" aria-label="Thème">
          {THEMES_ACCUEIL.map(id => THEMES.find(t => t.id === id)!).map((t, n) => {
            const choisi = reglages.theme === t.id;
            const aucun = !THEMES_ACCUEIL.includes(reglages.theme);
            return (
              <li key={t.id}>
                <button type="button" role="radio" aria-checked={choisi} tabIndex={choisi || (aucun && n === 0) ? 0 : -1}
                  onClick={() => { vibrer(5); onReglages({ ...reglages, theme: t.id, bouton: t.conseil, couleurs: SANS_COULEURS }); }}
                  className="group flex w-full flex-col items-center gap-1.5 rounded-xl transition active:scale-95">
                  {/* Le thème pris se reconnaît à son trait bleu et à son nom en gras : pas de coche dans une pastille. */}
                  <span className={`relative block w-full rounded-xl outline-offset-2 transition-[outline-color] ${choisi ? 'outline-2 outline-bleu outline' : 'outline-2 outline-transparent outline group-hover:outline-white/20'}`}>
                    <Pastille theme={t} />
                  </span>
                  <span className={`line-clamp-2 w-full text-center text-[11.5px] leading-tight ${choisi ? 'font-semibold text-white' : 'text-white/70'}`}>{t.nom}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ),
    },
    fin: {
      titre: 'Ta page est en ligne',
      aide: sansLien ? 'Il ne lui manque plus qu’un lien : ton site, ta prise de rendez-vous ou ta boutique.'
        : bioOu ? `Colle son adresse dans ta bio ${bioOu} : tout ce que tu changes sur ta page s’affiche aussitôt.` : 'Colle son adresse là où tu la partages : tout ce que tu changes sur ta page s’affiche aussitôt.',
      corps: (
        <div className="flex flex-col gap-3">
          <div className="adm-address flex items-center gap-2 p-1.5 pl-4">
            <span className="min-w-0 flex-1 truncate text-[18px] font-semibold tracking-[-0.015em] text-white" translate="no">{sansSchema(adressePage)}</span>
            {/* Le grand bouton copie déjà quand le téléphone ne sait pas partager ; sans lien, il ajoute, et Copier reste ici. */}
            {(peutPartager || sansLien) && (
              <BoutonCopier texte={adressePage} onCopie={() => noter(CLE_PARTAGE)} />
            )}
          </div>
        </div>
      ),
    },
  };
  const c = contenu[etape];

  return (
    <div className="adm adm-premiers flex h-dvh flex-col overflow-hidden bg-nuit font-sans text-white antialiased lg:grid lg:grid-cols-[minmax(0,460px)_1fr] lg:grid-rows-[auto_1fr]">
      <header className="flex h-14 shrink-0 items-center gap-2 px-3 lg:col-span-2 lg:px-6">
        <button type="button" onClick={() => { setIgnorer(false); setI(n => n - 1); }} aria-label="Étape précédente" disabled={i === 0 || etape === 'fin'}
          className={`${classeBouton.icone} disabled:invisible`}><Icone nom="ui-chevron" taille={20} className="rotate-90" /></button>
        <div className="flex flex-1 justify-center gap-1.5" role="progressbar" aria-label="Premiers pas" aria-valuemin={0} aria-valuemax={QUESTIONS} aria-valuenow={Math.min(i, QUESTIONS)} aria-valuetext={i < QUESTIONS ? `Question ${i + 1} sur ${QUESTIONS}` : 'Terminé'}>
          {Array.from({ length: QUESTIONS }, (_, n) => (
            <span key={n} className="h-1.5 min-w-3 max-w-9 flex-1 overflow-hidden rounded-full bg-[#e4e4ff]">
              <span className="block h-full origin-left rounded-full bg-bleu transition-transform duration-500 motion-reduce:transition-none" style={{ transform: `scaleX(${n < i ? 1 : n === i ? 0.4 : 0})` }} />
            </span>
          ))}
        </div>
        <button type="button" onClick={() => terminer()} className={`${classeBouton.discret} shrink-0 ${etape === 'fin' ? 'invisible' : ''}`}>Plus tard</button>
      </header>

      {/* L'aperçu : la vraie page, en petit, qui se remplit à chaque réponse. */}
      <div className="adm-premiers-scene flex min-h-[16dvh] max-h-[38dvh] flex-1 justify-center px-6 pt-1 pb-4 lg:max-h-none lg:order-last lg:min-h-0 lg:items-center lg:p-8" aria-hidden="true" inert>
        <div className={`adm-miroir adm-apercu adm-toile pointer-events-none relative max-h-[640px] select-none lg:h-[min(640px,calc(100dvh-8rem))] overflow-hidden rounded-[26px] transition-shadow duration-700 ${etape === 'fin' ? 'adm-miroir-fin' : ''}`}>
          <div className="adm-miroir-page"><PageLiens page={{ reglages, blocs: visibles, compte }} apercu /></div>
        </div>
      </div>

      {/* Les questions, sous le pouce. Le bouton reste visible ; c'est le contenu qui défile s'il déborde. */}
      <section key={etape} className="adm-onglet flex min-h-0 flex-1 flex-col lg:flex-none rounded-t-2xl border-t border-white/[0.08] bg-nuit lg:max-h-none lg:min-h-0 lg:rounded-none lg:border-t-0 lg:bg-transparent"
        aria-labelledby="premiers-pas-titre">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 lg:flex-none lg:px-8 lg:pt-10">
          {etape === 'fin' && <Icone nom="check" taille={30} className="mb-2" />}
          <h1 id="premiers-pas-titre" ref={titre} tabIndex={-1} className="adm-titre outline-none">{c.titre}</h1>
          <p className="mt-1 mb-4 text-[14.5px] leading-snug text-white/60">{c.aide}</p>
          {c.corps}
        </div>
        <div className="flex shrink-0 flex-col gap-2 px-5 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] lg:px-8 lg:pb-8">
          {etape === 'fin' && sansLien ? (
            <>
              <BoutonPrincipal className="w-full" onClick={() => terminer('lien')}><Icone nom="ui-plus" taille={18} />Ajouter mon premier lien</BoutonPrincipal>
              <button type="button" onClick={() => terminer()} className={classeBouton.discret}>Plus tard</button>
            </>
          ) : etape === 'fin' ? (
            <>
              <BoutonPrincipal className="w-full" onClick={partager}><Icone nom={peutPartager ? 'partage' : copie ? 'ui-ok' : 'ui-copier'} taille={18} /> {peutPartager ? 'Partager ma page' : copie ? 'Adresse copiée' : 'Copier l’adresse'}</BoutonPrincipal>
              <div className="grid grid-cols-2 gap-2">
                <a href={urlPage(compte)} target="_blank" rel="noopener" className={classeBouton.secondaire}>Voir ma page<Icone nom="ui-ouvrir" taille={16} /></a>
                <button type="button" onClick={() => terminer()} className={classeBouton.discret}>Peaufiner ma page</button>
              </div>
            </>
          ) : (
            <BoutonPrincipal className={`w-full ${rempli ? '' : '!bg-white/[0.09] !text-white'}`} onClick={suivant}>{libelle}</BoutonPrincipal>
          )}
        </div>
      </section>
      <input ref={fichier} type="file" accept="image/*" className="adm-fichier" tabIndex={-1} aria-hidden="true" onChange={e => photo(e.target.files?.[0])} />
    </div>
  );
}
