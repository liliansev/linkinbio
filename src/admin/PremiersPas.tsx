import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Api, Bloc, PagePublique, Reglages, Reseau } from '../lib/types.ts';
import { SANS_COULEURS, nouveauBloc, urlPage } from '../lib/types.ts';
import { adresseSaisie, pourquoiPasAdresse, pourquoiPasReseau } from '../lib/valider.ts';
import { THEMES } from '../lib/themes.ts';
import { RESEAUX_ACCUEIL, THEMES_ACCUEIL, nomSite, urlReseau } from '../lib/demarrage.ts';
import { PageLiens } from '../components/PageLiens.tsx';
import { RESEAUX_SOCIAUX } from '../lib/provenance.ts';
import { typeDeAdresse } from '../lib/detection.ts';
import { Icone, NOMS_RESEAUX } from '../components/Icone.tsx';
import { Pastille } from './OngletApparence.tsx';
import { BoutonPrincipal, choisirFichier, classeBouton, classeSaisie, flechesRadio, preparerImage, vibrer } from './ui.tsx';
import { useDroits } from './offre.tsx';
import { focusSaisie } from '../lib/clavier';

/*
 * L'arrivée d'un compte neuf, juste après les CGU : quatre questions, et la
 * page se construit sous les yeux à chaque réponse. Tout s'enregistre au fil
 * de l'eau ; chaque étape se passe, et « Plus tard » mène tout de suite à
 * l'éditeur. Les étapes laissées de côté restent dans « Bien démarrer ».
 * Où l'on mettra son lien ne se demande pas : la page voit d'où arrive
 * chaque visiteur, et chaque bloc se règle réseau par réseau (« Selon le réseau », dans sa visibilité).
 */

type Etape = 'profil' | 'liens' | 'reseaux' | 'style' | 'fin';
const ETAPES: Etape[] = ['profil', 'liens', 'reseaux', 'style', 'fin'];
const QUESTIONS = 4;

/** Ce que le navigateur retient : les premiers pas sont faits (ou remis à plus tard). */
export const CLE_PREMIERS_PAS = 'hopla-premiers-pas';
const CLE_ETAPE = 'hopla-premiers-pas-etape';
const noter = (cle: string) => { try { localStorage.setItem(cle, '1'); } catch { /* stockage refusé */ } };
export const premiersPasFaits = () => { try { return localStorage.getItem(CLE_PREMIERS_PAS) === '1'; } catch { return false; } };

/*
 * Ce qu'on met sur sa page, choisi d'un toucher (24 octobre 2026, Lilian : « on demande absolument des liens ? ») :
 * chaque choix ouvre son champ, et l'adresse collée décide du bloc (une vidéo se lit dans la page, une fiche de
 * boutique devient un produit avec la vitrine). Le choix ne sert qu'à dire quoi coller.
 */
const GENRES = [
  { id: 'site', nom: 'Mon site', picto: 'site', exemple: 'ton-site.fr' },
  { id: 'boutique', nom: 'Ma boutique', picto: 'boutique', exemple: 'ta-boutique.fr' },
  { id: 'rdv', nom: 'Mon agenda', picto: 'agenda', exemple: 'calendly.com/toi' },
  { id: 'video', nom: 'Une vidéo', picto: 'bloc-video', exemple: 'youtube.com/watch?v=…' },
  { id: 'musique', nom: 'Ma musique', picto: 'bloc-musique', exemple: 'open.spotify.com/…' },
  { id: 'autre', nom: 'Un autre lien', picto: 'bloc-lien', exemple: 'Colle une adresse' },
] as const;
type Genre = (typeof GENRES)[number]['id'];
const genreDe = (id: Genre) => GENRES.find(g => g.id === id)!;
const MAX_LIGNES = 6;

interface Ligne { id: string; genre: Genre; url: string; titre: string; lecture: boolean; image: string; prix: string }
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
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const vitrine = !!useDroits().vitrine;
  // Les réseaux ouverts, et ce qui a été tapé pour chacun (un pseudo ou une adresse).
  const [saisies, setSaisies] = useState<Partial<Record<Reseau, string>>>({});
  const [envoi, setEnvoi] = useState(false);
  const [photoRatee, setPhotoRatee] = useState(false);
  // Les champs qu'on a quittés : une adresse ou un pseudo qui ne mène nulle part le dit seulement là.
  const [quittes, setQuittes] = useState<Set<string>>(() => new Set());
  const [tous, setTous] = useState(false);
  // Un Continuer sur un champ faux s'arrête une fois et montre le champ ; le second passe sans lui.
  const [ignorer, setIgnorer] = useState(false);
  const [nomVide, setNomVide] = useState(false);
  const fichier = useRef<HTMLInputElement>(null);

  // Le titre de l'onglet suit le nom tant qu'il est celui donné à la création (« Marie Test · Hopla »).
  const profil = (champs: Partial<Reglages['profil']>) => onReglages({
    ...reglages, profil: { ...reglages.profil, ...champs },
    ...(champs.nom !== undefined && reglages.seo.titre === `${reglages.profil.nom} · Hopla` ? { seo: { ...reglages.seo, titre: `${champs.nom} · Hopla` } } : {}),
  });

  async function photo(f: File | undefined) {
    if (!f) return;
    setEnvoi(true); setPhotoRatee(false);
    try { profil({ avatar: await envoyerImage(await preparerImage(f, 'photo')) }); } catch { setPhotoRatee(true); } finally { setEnvoi(false); if (fichier.current) fichier.current.value = ''; }
  }

  /* ---- Les liens : l'adresse collée, le titre se remplit tout seul ---- */
  const brouillons = useMemo(() => lignes.flatMap(l => {
    const url = adresseSaisie(l.url);
    if (!url) return [];
    const type = typeDeAdresse(url, vitrine);
    const deja = blocs.find(b => b.id === l.id);
    const titre = l.titre.trim() || (type === 'lien' || type === 'produit' ? nomSite(url) : nouveauBloc(type, l.id).titre);
    return [{ ...(deja?.type === type ? deja : nouveauBloc(type, l.id)), url, titre, ...(type === 'produit' ? { image: l.image, prix: l.prix } : {}) }];
  }), [lignes, blocs, vitrine]);
  const majLigne = (id: string, champs: Partial<Ligne>) => setLignes(ls => ls.map(l => (l.id === id ? { ...l, ...champs } : l)));
  async function lireSite(l: Ligne) {
    const url = adresseSaisie(l.url);
    if (!url || l.titre.trim()) return;
    const type = typeDeAdresse(url, vitrine);
    // Un agenda ou une page de soutien garde le nom de son bloc (« Prendre rendez-vous ») : le nom du
    // service (« Calendly »), déjà écrit dessous, le doublerait. Une vidéo ou un morceau prend son titre.
    if (type === 'reservation' || type === 'soutien') return;
    const produit = type === 'produit';
    const repli = nomSite(url);
    majLigne(l.id, { titre: repli, lecture: true });
    try {
      // Un produit vient avec sa photo et son prix, lus sur sa fiche.
      const site = await apercuSite(url, produit ? 'partage' : false);
      // On ne remplace que le nom de repli : un titre tapé entre-temps reste.
      if (site.titre) setLignes(ls => ls.map(x => (x.id === l.id && x.titre === repli ? { ...x, titre: site.titre.slice(0, 80) } : x)));
      if (produit) {
        const image = site.image ? await envoyerImage(site.image).catch(() => '') : '';
        majLigne(l.id, { image, prix: site.prix });
      }
    } catch { /* le nom du site suffit */ } finally { majLigne(l.id, { lecture: false }); }
  }
  function ajouterLigne(genre: Genre) {
    vibrer(5);
    const id = nouvelId();
    setLignes(ls => [...ls, { id, genre, url: '', titre: '', lecture: false, image: '', prix: '' }]);
    setTimeout(() => focusSaisie(document.getElementById(`lien-${id}`)), 30);
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
    setTimeout(() => focusSaisie(document.getElementById(`reseau-${r}`)), 30);
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
    // Les réseaux qu'on vient de relier sont ceux où l'on mettra son lien : la fin les nomme, et « Selon le réseau » les propose d'abord dans chaque bloc.
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

  // L'aperçu : la vraie page, avec les liens en cours de saisie, et des exemples pour juger un thème quand il n'y en a pas.
  const visibles = useMemo(() => {
    const liste = [...brouillons, ...blocs.filter(b => !brouillons.some(x => x.id === b.id))].filter(b => b.public);
    return etape === 'style' && !liste.some(b => b.type === 'lien') ? [...liste, ...EXEMPLES] : liste;
  }, [brouillons, blocs, etape]);

  const rempli = etape === 'profil' ? true : etape === 'liens' ? brouillons.length > 0 || lignes.some(l => l.url.trim()) : etape === 'reseaux' ? reglages.reseaux.some(r => r.url) || ouverts.some(r => (saisies[r] ?? '').trim()) : true;
  const libelle = ignorer && fautifs.length
    ? (etape === 'liens' ? (fautifs.length > 1 ? 'Continuer sans ces liens' : 'Continuer sans ce lien') : (fautifs.length > 1 ? 'Continuer sans ces réseaux' : 'Continuer sans ce réseau'))
    : etape === 'style' ? 'C’est parti' : rempli ? 'Continuer' : 'Passer cette étape';

  // Le dernier écran dit bravo et mène à l'éditeur : on veut d'abord peaufiner sa page, la partager vient après (Lilian,
  // 24 octobre 2026). Sans rien sur la page, il propose d'y mettre un premier lien.
  const sansLien = !blocs.some(b => b.public && b.url);
  const contenu: Record<Etape, { titre: string; aide: string; corps: ReactNode }> = {
    profil: {
      titre: 'Ta page, à ton nom',
      aide: 'Ton nom et une phrase sur ce que tu fais. Tout se change ensuite.',
      corps: (
        // Une seule colonne, un seul bord gauche : la photo, puis le nom, puis la bio (Lilian, 24 octobre 2026 : « tout aligner »).
        <div className="flex flex-col gap-4">
          <button type="button" onClick={e => choisirFichier(fichier.current, e.currentTarget)} className="group flex items-center gap-3 self-start rounded-xl text-left transition active:scale-[0.98]">
            {/* Sans photo, l'icône seule à sa place : pas de rond vide autour. */}
            <span className={`relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full text-white/60 ${reglages.profil.avatar ? '' : '-ml-[5px]'}`}>
              {reglages.profil.avatar ? <img src={reglages.profil.avatar} alt="" className="h-full w-full object-cover" /> : <Icone nom="utilisateur" taille={56} />}
              {envoi && <span className="absolute inset-0 grid place-items-center bg-black/55 text-[12px] text-nuit">…</span>}
            </span>
            <span className="flex flex-col">
              <span className="text-[15px] font-semibold text-bleu group-hover:underline">{reglages.profil.avatar ? 'Changer de photo' : 'Ajouter une photo'}</span>
              <span className="text-[13px] text-white/55">En haut de ta page, si tu veux</span>
            </span>
          </button>
          {photoRatee && <p className="-mt-2 text-[13px] text-red-300" role="alert">La photo n’est pas passée. Essaie une autre image, en JPG ou PNG.</p>}
          <label>
            <span className="mb-1 block text-[13px] font-medium text-white/60">Ton nom</span>
            <input id="premiers-nom" className={classeSaisie} value={reglages.profil.nom} maxLength={80} autoComplete="name" onFocus={e => e.currentTarget.select()} onChange={e => { setNomVide(false); profil({ nom: e.target.value }); }}
              aria-invalid={nomVide || undefined} aria-describedby={nomVide ? 'erreur-nom' : undefined} />
            {nomVide && <p id="erreur-nom" role="alert" className="mt-1.5 text-[13px] font-medium text-red-300">Écris ton nom : il s’affiche en haut de ta page.</p>}
          </label>
          <label>
            <span className="mb-1 block text-[13px] font-medium text-white/60">Ta bio</span>
            <textarea className={`${classeSaisie} min-h-[76px] resize-none`} rows={2} maxLength={300} placeholder="Céramiste à Lyon. Pièces uniques et ateliers le samedi."
              value={reglages.profil.bio} onChange={e => profil({ bio: e.target.value })} />
          </label>
        </div>
      ),
    },
    liens: {
      titre: 'Qu’est-ce que tu veux montrer ?',
      aide: lignes.length ? 'Colle l’adresse : Hopla en fait le bon bouton, avec son titre.' : 'Touche ce que tu as à partager. Tu en ajouteras d’autres quand tu veux.',
      corps: (
        <div className="flex flex-col gap-4">
          {lignes.length > 0 && (
            <ul className="flex flex-col gap-2.5">
              {lignes.map(l => {
                const g = genreDe(l.genre);
                const url = adresseSaisie(l.url);
                const fausse = quittes.has(l.id) && !!l.url.trim() && !url;
                const type = url ? typeDeAdresse(url, vitrine) : null;
                return (
                  <li key={l.id} className="adm-pop rounded-xl border border-white/15 bg-nuit p-1.5 transition hover:border-white/30 focus-within:border-white focus-within:ring-1 focus-within:ring-white">
                    <div className="flex items-center gap-1">
                      <span className="grid h-9 w-9 shrink-0 place-items-center text-bleu"><Icone nom={g.picto} taille={22} /></span>
                      <input id={`lien-${l.id}`} aria-label={`Adresse : ${g.nom}`} className="min-h-11 min-w-0 flex-1 bg-transparent px-1 text-[16px] text-white outline-none placeholder:text-white/55 focus-visible:!outline-none"
                        type="url" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder={g.id === 'autre' ? g.exemple : `Ex. ${g.exemple}`}
                        value={l.url} aria-invalid={fausse || undefined} aria-describedby={fausse ? `erreur-${l.id}` : undefined}
                        onChange={e => majLigne(l.id, { url: e.target.value })} onBlur={() => { setQuittes(q => new Set(q).add(l.id)); lireSite(l); }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} />
                      <button type="button" onClick={() => setLignes(ls => ls.filter(x => x.id !== l.id))} aria-label={`Retirer : ${g.nom}`} className={classeBouton.icone}><Icone nom="ui-fermer" taille={16} /></button>
                    </div>
                    {fausse && <p id={`erreur-${l.id}`} role="alert" className="px-2 pb-1.5 text-[13px] font-medium text-red-300">{pourquoiPasAdresse(l.url)}</p>}
                    {url && (
                      <label className="mt-1 flex items-center gap-1 border-t border-white/[0.06] pt-1">
                        <span className="w-9 shrink-0 text-center text-[12px] text-white/55">Titre</span>
                        <input className="min-h-10 min-w-0 flex-1 bg-transparent px-1 text-[15px] text-white outline-none placeholder:text-white/55 focus-visible:!outline-none" maxLength={80}
                          placeholder={l.lecture ? 'Lecture du site…' : brouillons.find(b => b.id === l.id)?.titre} value={l.titre} onChange={e => majLigne(l.id, { titre: e.target.value })} />
                      </label>
                    )}
                    {(type === 'video' || type === 'musique') && <p className="px-2 pt-0.5 pb-1 text-[12.5px] text-white/55">{type === 'video' ? 'La vidéo se regarde sur ta page.' : 'Elle s’écoute sur ta page.'}</p>}
                  </li>
                );
              })}
            </ul>
          )}
          {lignes.length < MAX_LIGNES && (
            <div>
              {lignes.length > 0 && <p className="mb-2 text-[13px] font-medium text-white/60">Ajouter aussi</p>}
              {/* Chaque choix est un bouton avec son nom : l'icône se pose seule dedans, en bleu, sans pastille. */}
              <ul className="grid grid-cols-3 gap-2">
                {GENRES.map(g => (
                  <li key={g.id}>
                    <button type="button" onClick={() => ajouterLigne(g.id)}
                      className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/12 bg-nuit text-white transition hover:-translate-y-0.5 hover:border-bleu/50 active:scale-95 motion-reduce:hover:translate-y-0 ${lignes.length ? 'min-h-[68px] py-2' : 'min-h-[88px] py-3'}`}>
                      <Icone nom={g.picto} taille={lignes.length ? 22 : 28} className="text-bleu" />
                      <span className="text-[13px] font-medium leading-tight">{g.nom}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
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
                  <span className={`line-clamp-2 w-full text-center lg:whitespace-nowrap text-[11.5px] leading-tight ${choisi ? 'font-semibold text-white' : 'text-white/70'}`}>{t.nom}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ),
    },
    fin: {
      titre: 'Bravo, ta page est en ligne',
      aide: sansLien ? 'Il ne lui manque plus qu’un lien : ton site, ta boutique ou ta prise de rendez-vous.'
        : 'Ajoute, change, déplace : tout s’enregistre et s’affiche aussitôt.',
      corps: null,
    },
  };
  const c = contenu[etape];

  return (
    <div className="adm adm-premiers flex h-dvh flex-col overflow-hidden bg-nuit font-sans text-white antialiased lg:grid lg:grid-cols-[minmax(0,480px)_1fr] lg:grid-rows-[max(72px,calc(50dvh_-_381px))_auto_minmax(0,auto)_1fr]">
      {/* Au bureau, la progression et « Plus tard » se posent au-dessus de la question, dans sa colonne, à la hauteur du haut
          du téléphone : elles ne bougent plus d'une étape à l'autre, quelle que soit la longueur de la question (24 octobre
          2026 ; centrées sur la médiane de la scène, elles sautaient de 120 px). */}
      <header className="flex h-14 shrink-0 items-center gap-2 px-3 lg:col-start-1 lg:row-start-2 lg:px-6">
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
      <div className="adm-premiers-scene flex min-h-[16dvh] max-h-[38dvh] flex-1 justify-center px-6 pt-1 pb-4 lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:max-h-none lg:min-h-0 lg:items-center lg:self-center lg:p-8" aria-hidden="true" inert>
        <div className={`adm-miroir adm-apercu adm-toile pointer-events-none relative max-h-[640px] select-none lg:max-h-none lg:h-[min(calc(744px*var(--z)),calc(100dvh-10rem))] overflow-hidden rounded-[26px] transition-shadow duration-700 ${etape === 'fin' ? 'adm-miroir-fin' : ''}`}>
          <div className="adm-miroir-page"><PageLiens page={{ reglages, blocs: visibles, compte }} apercu /></div>
        </div>
      </div>

      {/* Les questions, sous le pouce. Le bouton reste visible ; c'est le contenu qui défile s'il déborde. */}
      <section key={etape} className="adm-onglet flex min-h-0 flex-1 flex-col lg:col-start-1 lg:row-start-3 lg:flex-none rounded-t-2xl border-t border-white/[0.08] bg-nuit lg:max-h-none lg:min-h-0 lg:rounded-none lg:border-t-0 lg:bg-transparent"
        aria-labelledby="premiers-pas-titre">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 lg:px-8 lg:pt-4">
          {etape === 'fin' && <Icone nom="coche" taille={30} className="adm-pop mb-2 text-bleu" />}
          <h1 id="premiers-pas-titre" ref={titre} tabIndex={-1} className="adm-titre outline-none">{c.titre}</h1>
          <p className="mt-1 mb-4 text-[14.5px] leading-snug text-white/60">{c.aide}</p>
          {c.corps}
        </div>
        <div className="flex shrink-0 flex-col gap-2 px-5 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] lg:px-8 lg:pb-8">
          {etape === 'fin' ? (
            <>
              {sansLien
                ? <BoutonPrincipal className="w-full" onClick={() => terminer('lien')}><Icone nom="ui-plus" taille={18} />Ajouter mon premier lien</BoutonPrincipal>
                : <BoutonPrincipal className="w-full" onClick={() => terminer()}><Icone nom="ui-crayon" taille={18} />Modifier ma page</BoutonPrincipal>}
              <a href={urlPage(compte)} target="_blank" rel="noopener" className={classeBouton.discret}>Voir ma page<Icone nom="ui-ouvrir" taille={16} /></a>
            </>
          ) : (
            <BoutonPrincipal className={`w-full ${rempli ? '' : '!bg-white/[0.09] !text-white'}`} onClick={suivant}>{libelle}</BoutonPrincipal>
          )}
        </div>
      </section>
      {etape === 'fin' && <FeuDArtifice />}
      <input ref={fichier} type="file" accept="image/*" className="adm-fichier" tabIndex={-1} aria-hidden="true" onChange={e => photo(e.target.files?.[0])} />
    </div>
  );
}

/*
 * Le bravo de la fin (24 octobre 2026, demandé par Lilian) : trois gerbes aux couleurs du back office, jouées une fois,
 * par-dessus tout et sans rien attraper. Rien du tout quand le mouvement est réduit.
 */
const GERBES = [{ x: 22, y: 26, retard: 0 }, { x: 74, y: 18, retard: 320 }, { x: 54, y: 40, retard: 640 }];
const ETINCELLES = 18;
function FeuDArtifice() {
  useEffect(() => { vibrer(20); }, []);
  return (
    <div className="adm-feu" aria-hidden="true">
      {GERBES.map((g, n) => (
        <span key={n} className="adm-feu-gerbe" style={{ left: `${g.x}%`, top: `${g.y}%`, animationDelay: `${g.retard}ms` }}>
          {Array.from({ length: ETINCELLES }, (_, k) => (
            <span key={k} className="adm-feu-etincelle"
              style={{ '--angle': `${(360 / ETINCELLES) * k + n * 11}deg`, '--loin': `${90 + ((k * 37) % 60)}px`, animationDelay: `${g.retard}ms` } as CSSProperties} data-teinte={(k + n) % 3} />
          ))}
        </span>
      ))}
    </div>
  );
}
