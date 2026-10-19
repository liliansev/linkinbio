import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Api, Bloc, PagePublique, Reglages, Reseau } from '../lib/types.ts';
import { SANS_COULEURS, nouveauBloc, sansSchema, urlPage } from '../lib/types.ts';
import { adresseSaisie, pourquoiPasAdresse, pourquoiPasReseau } from '../lib/valider.ts';
import { THEMES } from '../lib/themes.ts';
import { RESEAUX_ACCUEIL, THEMES_ACCUEIL, nomSite, urlReseau } from '../lib/demarrage.ts';
import { PageLiens } from '../components/PageLiens.tsx';
import { NOMS_AUDIENCES, reseauxDePartage } from '../lib/provenance.ts';
import type { Audience } from '../lib/provenance.ts';
import { Icone, NOMS_RESEAUX } from '../components/Icone.tsx';
import { Pastille } from './OngletApparence.tsx';
import { Bascule, BoutonCopier, BoutonPrincipal, copierTexte, classeSaisie, flechesRadio, preparerImage, vibrer } from './ui.tsx';

/*
 * L'arrivée d'un compte neuf, juste après les CGU : cinq questions, et la
 * page se construit sous les yeux à chaque réponse. Tout s'enregistre au fil
 * de l'eau ; chaque étape se passe, et « Plus tard » mène tout de suite à
 * l'éditeur. Les étapes laissées de côté restent dans « Bien démarrer ».
 */

type Etape = 'profil' | 'liens' | 'reseaux' | 'partage' | 'style' | 'fin';
const ETAPES: Etape[] = ['profil', 'liens', 'reseaux', 'partage', 'style', 'fin'];
const QUESTIONS = 5;

/** Les réseaux où l'on peut coller son lien, proposés à l'arrivée. */
const OU_PARTAGER: Audience[] = ['instagram', 'tiktok', 'youtube', 'linkedin', 'x', 'facebook', 'threads', 'qr'];

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
  onFin: () => void;
}) {
  // L'étape survit à un rechargement ou à un passage par une autre app : ce qui est tapé est déjà enregistré, la place aussi.
  const [i, setI] = useState(() => { try { const n = Number(sessionStorage.getItem(CLE_ETAPE)); return n > 0 && n < ETAPES.length ? n : 0; } catch { return 0; } });
  useEffect(() => { try { sessionStorage.setItem(CLE_ETAPE, String(i)); } catch { /* stockage refusé */ } }, [i]);
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
  const [dernierSeul, setDernierSeul] = useState(false);
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

  const profil = (champs: Partial<Reglages['profil']>) => onReglages({ ...reglages, profil: { ...reglages.profil, ...champs } });

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
      const site = await apercuSite(url);
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

  // L'ambiance déjà choisie se montre d'emblée, même au bout de la rangée.
  useEffect(() => {
    if (etape !== 'style') return;
    document.querySelector('[aria-label="Thème"] [aria-checked="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [etape]);

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
    // Où mettre le lien : on part des réseaux qu'on vient de relier, pas d'une liste toute cochée.
    if (etape === 'reseaux' && !reglages.vuesReseaux.length) {
      const relies = OU_PARTAGER.filter(a => reglages.reseaux.some(r => r.reseau === a && r.url));
      if (relies.length) onReglages({ ...reglages, vuesReseaux: relies });
    }
    setI(n => Math.min(n + 1, ETAPES.length - 1));
    scrollTo({ top: 0 });
  }
  function terminer() {
    if (!reglages.profil.nom.trim()) profil({ nom: compte.pseudo });
    if (etape === 'liens') poserLiens();
    noter(CLE_PREMIERS_PAS);
    try { sessionStorage.removeItem(CLE_ETAPE); } catch { /* stockage refusé */ }
    onFin();
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

  // Le dernier écran nomme le réseau choisi à l'étape d'avant.
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
            <button type="button" onClick={() => fichier.current?.click()} className="flex shrink-0 flex-col items-center gap-1 self-start transition active:scale-95">
              <span className="relative grid h-[60px] w-[60px] place-items-center overflow-hidden rounded-full bg-white/[0.08] text-white/70">
                {reglages.profil.avatar ? <img src={reglages.profil.avatar} alt="" className="h-full w-full object-cover" /> : <Icone nom="photo" taille={24} />}
                {envoi && <span className="absolute inset-0 grid place-items-center bg-black/55 text-[12px] text-white">…</span>}
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
              <li key={l.id} className="rounded-2xl bg-white/[0.04] p-1.5 transition focus-within:bg-white/[0.07] focus-within:ring-2 focus-within:ring-white/30">
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
      titre: 'Où te suivre ?',
      aide: 'Touche un réseau et tape ton pseudo. Les icônes s’affichent sous ton nom.',
      corps: (
        <div className="flex flex-col gap-3">
          {ouverts.length > 0 && (
            <ul className="flex flex-col gap-2">
              {ouverts.map(r => {
                const ok = !!urlReseau(r, saisies[r] ?? '');
                const faux = quittes.has(r) && !!(saisies[r] ?? '').trim() && !ok;
                return (
                  <li key={r} className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/[0.04] p-1.5 pl-3 transition focus-within:bg-white/[0.07] focus-within:ring-2 focus-within:ring-white/30">
                    <span className={ok ? 'text-white' : 'text-white/60'}><Icone nom={r} taille={20} /></span>
                    <input id={`reseau-${r}`} aria-label={`Ton ${NOMS_RESEAUX[r]}`} className="min-h-11 min-w-0 flex-1 bg-transparent px-1 text-[16px] text-white outline-none placeholder:text-white/55 focus-visible:!outline-none"
                      autoCapitalize="off" autoCorrect="off" spellCheck={false} inputMode={r === 'email' ? 'email' : 'text'}
                      placeholder={r === 'email' ? 'toi@exemple.fr' : r === 'spotify' ? 'Adresse de ta page Spotify' : `Ton pseudo ${NOMS_RESEAUX[r]}`}
                      value={saisies[r] ?? ''} onChange={e => majReseau(r, e.target.value)} onBlur={() => setQuittes(q => new Set(q).add(r))}
                      aria-invalid={faux || undefined} aria-describedby={faux ? `erreur-${r}` : undefined} />
                    <button type="button" onClick={() => majReseau(r, null)} aria-label={`Retirer ${NOMS_RESEAUX[r]}`}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white/55 transition hover:bg-white/[0.06] hover:text-white"><Icone nom="ui-fermer" taille={16} /></button>
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
    partage: {
      titre: 'Où vas-tu mettre ton lien ?',
      aide: 'Ta page saura d’où viennent tes visiteurs : tu pourras, par exemple, montrer ta boutique d’abord à ceux qui arrivent d’Instagram.',
      corps: (<>
        <ul className="flex flex-col divide-y divide-white/[0.06] rounded-2xl bg-white/[0.04] px-3.5">
          {OU_PARTAGER.map(a => {
            // « Ailleurs » (site, e-mail, QR code) compte comme un choix : personne n'a à cocher un réseau qu'il n'utilise pas.
            const pris = reglages.vuesReseaux.filter(x => OU_PARTAGER.includes(x));
            const choisis = pris.length ? pris : reseauxDePartage([]);
            const coche = choisis.includes(a);
            const seul = coche && choisis.length === 1;
            return (
              <li key={a} className="flex min-h-12 flex-wrap items-center gap-x-3">
                <span className="flex w-5 justify-center text-white/75"><Icone nom={a} taille={18} /></span>
                <span className="flex-1 text-[15px] font-medium text-white">{a === 'qr' ? 'Ailleurs : site, e-mail, QR code' : NOMS_AUDIENCES[a]}</span>
                <Bascule actif={coche} label={a === 'qr' ? 'Mon lien ailleurs : site, e-mail, QR code' : `Mon lien sur ${NOMS_AUDIENCES[a]}`} decrit={seul && dernierSeul ? 'au-moins-un' : undefined}
                  onClick={() => { if (seul) { vibrer(20); setDernierSeul(true); return; } setDernierSeul(false); vibrer(4); onReglages({ ...reglages, vuesReseaux: OU_PARTAGER.filter(x => (x === a ? !coche : choisis.includes(x))) }); }} />
                {/* Le refus se dit sous la ligne touchée : visible sans faire défiler. */}
                {seul && dernierSeul && <p id="au-moins-un" role="alert" className="w-full pb-2 pl-8 text-[13px] font-medium text-white/75">Garde au moins un endroit : active d’abord un autre.</p>}
              </li>
            );
          })}
        </ul>
      </>),
    },
    style: {
      titre: 'Choisis ton thème',
      aide: 'Les couleurs, la police et les boutons suivent. Les autres t’attendent dans Design.',
      corps: (
        <ul onKeyDown={e => flechesRadio(e)} className="-mx-5 flex snap-x scroll-px-5 gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-4 lg:px-0" role="radiogroup" aria-label="Thème">
          {THEMES_ACCUEIL.map(id => THEMES.find(t => t.id === id)!).map(t => {
            const choisi = reglages.theme === t.id;
            return (
              <li key={t.id} className="w-[98px] shrink-0 snap-start lg:w-auto">
                <button type="button" role="radio" aria-checked={choisi} onClick={e => { vibrer(5); e.currentTarget.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); onReglages({ ...reglages, theme: t.id, bouton: t.conseil, couleurs: SANS_COULEURS }); }}
                  className={`flex w-full flex-col items-center gap-1.5 rounded-2xl p-1.5 transition ${choisi ? 'bg-white/10 ring-2 ring-white' : 'hover:bg-white/[0.05]'}`}>
                  <Pastille theme={t} />
                  <span className="w-full truncate text-center text-[12px] text-white/75">{t.nom}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ),
    },
    fin: {
      titre: 'Ta page est en ligne',
      aide: bioOu ? `Colle son adresse dans ta bio ${bioOu} : tout ce que tu changes sur ta page s’affiche aussitôt.` : 'Colle son adresse là où tu la partages : tout ce que tu changes sur ta page s’affiche aussitôt.',
      corps: (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-2xl bg-white/[0.05] p-1.5 pl-4">
            <span className="relative flex h-2 w-2 shrink-0" title="En ligne">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60 motion-reduce:hidden" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[16px] font-semibold text-white" translate="no">{sansSchema(adressePage)}</span>
            {/* Sans partage natif, le grand bouton copie déjà : pas de second « Copier ». */}
            {peutPartager && (
              <BoutonCopier texte={adressePage} onCopie={() => noter(CLE_PARTAGE)} />
            )}
          </div>
        </div>
      ),
    },
  };
  const c = contenu[etape];

  return (
    <div className="adm flex h-dvh flex-col overflow-hidden bg-nuit font-sans text-white antialiased lg:grid lg:grid-cols-[minmax(0,460px)_1fr] lg:grid-rows-[auto_1fr]">
      <header className="flex h-14 shrink-0 items-center gap-2 px-3 lg:col-span-2 lg:px-6">
        <button type="button" onClick={() => { setIgnorer(false); setI(n => n - 1); }} aria-label="Étape précédente" disabled={i === 0 || etape === 'fin'}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white/70 transition hover:bg-white/[0.07] disabled:invisible"><Icone nom="ui-chevron" taille={20} className="rotate-90" /></button>
        <div className="flex flex-1 justify-center gap-1.5" role="progressbar" aria-label="Premiers pas" aria-valuemin={0} aria-valuemax={QUESTIONS} aria-valuenow={Math.min(i, QUESTIONS)} aria-valuetext={i < QUESTIONS ? `Question ${i + 1} sur ${QUESTIONS}` : 'Terminé'}>
          {Array.from({ length: QUESTIONS }, (_, n) => (
            <span key={n} className="h-1.5 min-w-3 max-w-9 flex-1 overflow-hidden rounded-full bg-white/[0.1]">
              <span className="block h-full rounded-full bg-white transition-[width] duration-500" style={{ width: n < i ? '100%' : n === i ? '40%' : '0%' }} />
            </span>
          ))}
        </div>
        <button type="button" onClick={terminer} className={`min-h-11 shrink-0 rounded-full px-3.5 text-[14px] font-medium text-white/60 transition hover:bg-white/[0.07] hover:text-white ${etape === 'fin' ? 'invisible' : ''}`}>Plus tard</button>
      </header>

      {/* L'aperçu : la vraie page, en petit, qui se remplit à chaque réponse. */}
      <div className="flex min-h-[16dvh] max-h-[38dvh] flex-1 justify-center px-6 pt-1 pb-4 lg:max-h-none lg:order-last lg:min-h-0 lg:items-center lg:p-8" aria-hidden="true" inert>
        <div className={`adm-miroir adm-apercu adm-toile pointer-events-none relative max-h-[640px] select-none lg:h-[min(640px,calc(100dvh-8rem))] overflow-hidden rounded-[26px] ring-1 ring-white/10 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)] transition-shadow duration-700 ${etape === 'fin' ? 'adm-miroir-fin' : ''}`}>
          <div className="adm-miroir-page"><PageLiens page={{ reglages, blocs: visibles, compte }} apercu /></div>
        </div>
      </div>

      {/* Les questions, sous le pouce. Le bouton reste visible ; c'est le contenu qui défile s'il déborde. */}
      <section key={etape} className="adm-onglet flex min-h-0 flex-1 flex-col lg:flex-none rounded-t-[28px] border-t border-white/[0.08] bg-[#121a2b] lg:max-h-none lg:min-h-0 lg:rounded-none lg:border-t-0 lg:border-r lg:bg-transparent"
        aria-labelledby="premiers-pas-titre">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 lg:flex-none lg:px-8 lg:pt-10">
          {etape === 'fin' && <Icone nom="check" taille={30} className="mb-2 text-emerald-300" />}
          <h1 id="premiers-pas-titre" ref={titre} tabIndex={-1} className="text-[23px] font-semibold tracking-[-0.02em] outline-none">{c.titre}</h1>
          <p className="mt-1 mb-4 text-[14.5px] leading-snug text-white/60">{c.aide}</p>
          {c.corps}
        </div>
        <div className="flex shrink-0 flex-col gap-2 px-5 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] lg:px-8 lg:pb-8">
          {etape === 'fin' ? (
            <>
              <BoutonPrincipal className="w-full" onClick={partager}><Icone nom={peutPartager ? 'partage' : copie ? 'ui-ok' : 'ui-copier'} taille={18} /> {peutPartager ? 'Partager ma page' : copie ? 'Adresse copiée' : 'Copier l’adresse'}</BoutonPrincipal>
              <div className="grid grid-cols-2 gap-2">
                <a href={urlPage(compte)} target="_blank" rel="noopener" className="flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-white/[0.07] text-[15px] font-medium text-white transition hover:bg-white/[0.12]">Voir ma page<Icone nom="ui-ouvrir" taille={16} /></a>
                <button type="button" onClick={terminer} className="min-h-12 rounded-full text-[15px] font-medium text-white/75 transition hover:bg-white/[0.06] hover:text-white">Peaufiner ma page</button>
              </div>
            </>
          ) : (
            <BoutonPrincipal className={`w-full ${rempli ? '' : '!bg-white/[0.09] !text-white'}`} onClick={suivant}>{libelle}</BoutonPrincipal>
          )}
        </div>
      </section>
      <input ref={fichier} type="file" accept="image/*" hidden onChange={e => photo(e.target.files?.[0])} />
    </div>
  );
}
