import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Api, Bloc, PagePublique, Reglages, Reseau } from '../lib/types.ts';
import { nouveauBloc, sansSchema, urlPage } from '../lib/types.ts';
import { adresse } from '../lib/valider.ts';
import { THEMES } from '../lib/themes.ts';
import { RESEAUX_ACCUEIL, THEMES_ACCUEIL, nomSite, urlReseau } from '../lib/demarrage.ts';
import { PageLiens } from '../components/PageLiens.tsx';
import { Icone, NOMS_RESEAUX } from '../components/Icone.tsx';
import { Pastille } from './OngletApparence.tsx';
import { BoutonPrincipal, classeSaisie, preparerImage, vibrer } from './ui.tsx';

/*
 * L'arrivée d'un compte neuf, juste après les CGU : quatre questions, et la
 * page se construit sous les yeux à chaque réponse. Tout s'enregistre au fil
 * de l'eau ; chaque étape se passe, et « Plus tard » mène tout de suite à
 * l'éditeur. Les étapes laissées de côté restent dans « Bien démarrer ».
 */

type Etape = 'profil' | 'liens' | 'reseaux' | 'style' | 'fin';
const ETAPES: Etape[] = ['profil', 'liens', 'reseaux', 'style', 'fin'];
const QUESTIONS = 4;

/** Ce que le navigateur retient : les premiers pas sont faits (ou remis à plus tard). */
export const CLE_PREMIERS_PAS = 'hopla-premiers-pas';
const CLE_PARTAGE = 'hopla-page-partagee';
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
  const [i, setI] = useState(0);
  const etape = ETAPES[i];
  const [lignes, setLignes] = useState<Ligne[]>(() => [0, 1, 2].map(() => ({ id: nouvelId(), url: '', titre: '', lecture: false })));
  // Les réseaux ouverts, et ce qui a été tapé pour chacun (un pseudo ou une adresse).
  const [saisies, setSaisies] = useState<Partial<Record<Reseau, string>>>({});
  const [envoi, setEnvoi] = useState(false);
  const [copie, setCopie] = useState(false);
  const [tous, setTous] = useState(false);
  const fichier = useRef<HTMLInputElement>(null);
  const adressePage = urlPage(compte);
  const peutPartager = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const profil = (champs: Partial<Reglages['profil']>) => onReglages({ ...reglages, profil: { ...reglages.profil, ...champs } });

  async function photo(f: File | undefined) {
    if (!f) return;
    setEnvoi(true);
    try { profil({ avatar: await envoyerImage(await preparerImage(f, 'carre')) }); } finally { setEnvoi(false); if (fichier.current) fichier.current.value = ''; }
  }

  /* ---- Les liens : l'adresse collée, le titre se remplit tout seul ---- */
  const brouillons = useMemo(() => lignes.flatMap(l => {
    const url = adresse(l.url);
    return url ? [{ ...nouveauBloc('lien', l.id), ...blocs.find(b => b.id === l.id), url, titre: l.titre.trim() || nomSite(url) }] : [];
  }), [lignes, blocs]);
  const majLigne = (id: string, champs: Partial<Ligne>) => setLignes(ls => ls.map(l => (l.id === id ? { ...l, ...champs } : l)));
  async function lireSite(l: Ligne) {
    const url = adresse(l.url);
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

  /* ---- La marche ---- */
  function suivant() {
    vibrer(8);
    if (etape === 'liens') poserLiens();
    setI(n => Math.min(n + 1, ETAPES.length - 1));
    scrollTo({ top: 0 });
  }
  function terminer() {
    if (etape === 'liens') poserLiens();
    noter(CLE_PREMIERS_PAS);
    onFin();
  }
  async function copier() {
    try { await navigator.clipboard.writeText(adressePage); vibrer(8); setCopie(true); noter(CLE_PARTAGE); setTimeout(() => setCopie(false), 1800); } catch { /* presse-papiers refusé */ }
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

  const rempli = etape === 'profil' ? true : etape === 'liens' ? brouillons.length > 0 : etape === 'reseaux' ? reglages.reseaux.some(r => r.url) : true;
  const libelle = etape === 'style' ? 'Mettre ma page en ligne' : rempli ? 'Continuer' : 'Passer cette étape';

  const contenu: Record<Etape, { titre: string; aide: string; corps: ReactNode }> = {
    profil: {
      titre: 'Ta page, à ton nom',
      aide: 'Ton nom et une phrase sur ce que tu fais. Tout se change ensuite.',
      corps: (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => fichier.current?.click()} aria-label={reglages.profil.avatar ? 'Changer ta photo' : 'Ajouter ta photo'}
              className="relative grid h-[60px] w-[60px] shrink-0 place-items-center overflow-hidden rounded-full bg-white/[0.08] text-white/70 transition active:scale-95">
              {reglages.profil.avatar ? <img src={reglages.profil.avatar} alt="" className="h-full w-full object-cover" /> : <Icone nom="camera" taille={24} />}
              {envoi && <span className="absolute inset-0 grid place-items-center bg-black/55 text-[12px] text-white">…</span>}
            </button>
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-[13px] font-medium text-white/60">Ton nom</span>
              <input className={classeSaisie} value={reglages.profil.nom} maxLength={80} autoComplete="name" onFocus={e => e.currentTarget.select()} onChange={e => profil({ nom: e.target.value })} />
            </label>
          </div>
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
            const valide = !!adresse(l.url);
            return (
              <li key={l.id} className="rounded-2xl bg-white/[0.04] p-1.5 transition focus-within:bg-white/[0.07] focus-within:ring-2 focus-within:ring-white/30">
                <div className="flex items-center gap-2">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[14px] font-semibold ${valide ? 'bg-white text-nuit' : 'bg-white/[0.07] text-white/55'}`}>
                    {valide ? <Icone nom="ui-ok" taille={16} /> : n + 1}
                  </span>
                  <input aria-label={`Adresse du lien ${n + 1}`} className="min-h-11 min-w-0 flex-1 bg-transparent px-1 text-[16px] text-white outline-none placeholder:text-white/45 focus-visible:!outline-none"
                    type="url" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder={['ton-site.fr', 'calendly.com/toi', 'ta-boutique.fr'][n]}
                    value={l.url} onChange={e => majLigne(l.id, { url: e.target.value })} onBlur={() => lireSite(l)} />
                </div>
                {valide && (
                  <label className="mt-1 flex items-center gap-2 border-t border-white/[0.06] pt-1">
                    <span className="w-9 shrink-0 text-center text-[12px] text-white/45">Titre</span>
                    <input className="min-h-10 min-w-0 flex-1 bg-transparent px-1 text-[15px] text-white outline-none placeholder:text-white/45 focus-visible:!outline-none" maxLength={80}
                      placeholder={l.lecture ? 'Lecture du site…' : nomSite(adresse(l.url))} value={l.titre} onChange={e => majLigne(l.id, { titre: e.target.value })} />
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
                return (
                  <li key={r} className="flex items-center gap-2 rounded-2xl bg-white/[0.04] p-1.5 pl-3 transition focus-within:bg-white/[0.07] focus-within:ring-2 focus-within:ring-white/30">
                    <span className={ok ? 'text-white' : 'text-white/60'}><Icone nom={r} taille={20} /></span>
                    <input id={`reseau-${r}`} aria-label={`Ton ${NOMS_RESEAUX[r]}`} className="min-h-11 min-w-0 flex-1 bg-transparent px-1 text-[16px] text-white outline-none placeholder:text-white/45 focus-visible:!outline-none"
                      autoCapitalize="off" autoCorrect="off" spellCheck={false} inputMode={r === 'email' ? 'email' : 'text'}
                      placeholder={r === 'email' ? 'toi@exemple.fr' : r === 'spotify' ? 'Adresse de ta page Spotify' : `Ton pseudo ${NOMS_RESEAUX[r]}`}
                      value={saisies[r] ?? ''} onChange={e => majReseau(r, e.target.value)} />
                    <button type="button" onClick={() => majReseau(r, null)} aria-label={`Retirer ${NOMS_RESEAUX[r]}`}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white/40 transition hover:bg-white/[0.06] hover:text-white"><Icone nom="ui-fermer" taille={16} /></button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            {RESEAUX_ACCUEIL.filter((r, n) => !ouverts.includes(r) && (tous || n < 5)).map(r => (
              <button key={r} type="button" onClick={() => ouvrirReseau(r)}
                className="flex min-h-10 items-center gap-1.5 rounded-full bg-white/[0.07] pr-3.5 pl-3 text-[14px] font-medium text-white/85 transition hover:bg-white/[0.12] active:scale-95">
                <Icone nom={r} taille={16} /> {NOMS_RESEAUX[r]}
              </button>
            ))}
            {!tous && <button type="button" onClick={() => setTous(true)} className="flex min-h-10 items-center rounded-full px-3.5 text-[14px] font-medium text-white/60 transition hover:bg-white/[0.07] hover:text-white">Autres réseaux</button>}
          </div>
        </div>
      ),
    },
    style: {
      titre: 'Choisis une ambiance',
      aide: 'Les couleurs, la police et les boutons suivent. Vingt-six thèmes t’attendent ensuite dans Design.',
      corps: (
        <ul className="-mx-5 flex snap-x scroll-px-5 gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-4 lg:px-0" role="radiogroup" aria-label="Thème">
          {THEMES_ACCUEIL.map(id => THEMES.find(t => t.id === id)!).map(t => {
            const choisi = reglages.theme === t.id;
            return (
              <li key={t.id} className="w-[84px] shrink-0 snap-start lg:w-auto">
                <button type="button" role="radio" aria-checked={choisi} onClick={() => { vibrer(5); onReglages({ ...reglages, theme: t.id, bouton: t.conseil }); }}
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
      aide: 'Colle son adresse dans ta bio Instagram ou TikTok : tout ce que tu y changes ensuite s’affiche aussitôt.',
      corps: (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-2xl bg-white/[0.05] p-1.5 pl-4">
            <span className="relative flex h-2 w-2 shrink-0" title="En ligne">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60 motion-reduce:hidden" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[16px] font-semibold text-white" translate="no">{sansSchema(adressePage)}</span>
            <button type="button" onClick={copier} className="flex min-h-10 items-center gap-1.5 rounded-full bg-white/[0.08] px-3.5 text-[14px] font-medium text-white transition active:scale-95">
              <Icone nom={copie ? 'ui-ok' : 'ui-copier'} taille={16} />{copie ? 'Copié' : 'Copier'}
            </button>
          </div>
        </div>
      ),
    },
  };
  const c = contenu[etape];

  return (
    <div className="adm flex h-dvh flex-col overflow-hidden bg-nuit font-sans text-white antialiased lg:grid lg:grid-cols-[minmax(0,460px)_1fr] lg:grid-rows-[auto_1fr]">
      <header className="flex h-14 shrink-0 items-center gap-2 px-3 lg:col-span-2 lg:px-6">
        <button type="button" onClick={() => setI(n => n - 1)} aria-label="Étape précédente" disabled={i === 0 || etape === 'fin'}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white/70 transition hover:bg-white/[0.07] disabled:invisible"><Icone nom="ui-chevron" taille={20} className="rotate-90" /></button>
        <div className="flex flex-1 justify-center gap-1.5" role="progressbar" aria-label="Premiers pas" aria-valuemin={0} aria-valuemax={QUESTIONS} aria-valuenow={Math.min(i, QUESTIONS)}>
          {Array.from({ length: QUESTIONS }, (_, n) => (
            <span key={n} className="h-1.5 w-9 overflow-hidden rounded-full bg-white/[0.1]">
              <span className="block h-full rounded-full bg-white transition-[width] duration-500" style={{ width: n < i ? '100%' : n === i ? '40%' : '0%' }} />
            </span>
          ))}
        </div>
        <button type="button" onClick={terminer} className={`min-h-10 shrink-0 rounded-full px-3.5 text-[14px] font-medium text-white/60 transition hover:bg-white/[0.07] hover:text-white ${etape === 'fin' ? 'invisible' : ''}`}>Plus tard</button>
      </header>

      {/* L'aperçu : la vraie page, en petit, qui se remplit à chaque réponse. */}
      <div className="flex min-h-[16dvh] flex-1 justify-center px-6 pt-1 pb-4 lg:order-last lg:min-h-0 lg:items-center lg:p-8" aria-hidden="true">
        <div className={`adm-miroir adm-apercu adm-toile pointer-events-none relative max-h-[640px] select-none lg:h-[min(640px,calc(100dvh-8rem))] overflow-hidden rounded-[26px] ring-1 ring-white/10 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)] transition-shadow duration-700 ${etape === 'fin' ? 'adm-miroir-fin' : ''}`}>
          <div className="adm-miroir-page"><PageLiens page={{ reglages, blocs: visibles, compte }} apercu /></div>
        </div>
      </div>

      {/* Les questions, sous le pouce. Le bouton reste visible ; c'est le contenu qui défile s'il déborde. */}
      <section key={etape} className="adm-onglet flex max-h-[72dvh] shrink-0 flex-col rounded-t-[28px] border-t border-white/[0.08] bg-[#121a2b] lg:max-h-none lg:min-h-0 lg:rounded-none lg:border-t-0 lg:border-r lg:bg-transparent"
        aria-labelledby="premiers-pas-titre">
        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pt-5 lg:px-8 lg:pt-10">
          {etape === 'fin' && <span className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-emerald-400/15 text-emerald-300"><Icone nom="ui-ok" taille={22} /></span>}
          <h1 id="premiers-pas-titre" className="text-[23px] font-semibold tracking-[-0.02em]">{c.titre}</h1>
          <p className="mt-1 mb-4 text-[14.5px] leading-snug text-white/60">{c.aide}</p>
          {c.corps}
        </div>
        <div className="flex shrink-0 flex-col gap-2 px-5 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] lg:px-8 lg:pb-8">
          {etape === 'fin' ? (
            <>
              <BoutonPrincipal className="w-full" onClick={partager}><Icone nom="partage" taille={18} /> {peutPartager ? 'Partager ma page' : copie ? 'Adresse copiée' : 'Copier l’adresse'}</BoutonPrincipal>
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
