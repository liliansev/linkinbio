import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Couleurs, FormeBouton, MiseEnPageBureau, OmbreBouton, Reglages, Reseau, StyleBouton } from '../lib/types.ts';
import { ANIMATIONS, RESEAUX, SANS_COULEURS } from '../lib/types.ts';
import { THEMES, themeDe, themeParId, variablesTheme } from '../lib/themes.ts';
import type { Theme } from '../lib/themes.ts';
import { Icone, NOMS_RESEAUX } from '../components/Icone.tsx';
import { Carte, Champ, Interrupteur, NOMS_ANIMATIONS, Segments, choisirFichier, classeBouton, classeSaisie, couleurReseau, flechesRadio, preparerImage, useFilFeuille, vibrer } from './ui.tsx';
import { useCouche } from './couches.ts';
import { pseudoReseau, urlReseau } from '../lib/demarrage.ts';
import { adresseSaisie, pourquoiPasReseau } from '../lib/valider.ts';
import { Etiquette, Reserve, usePermis, useVoirOffres } from './offre.tsx';

const STYLES: { id: StyleBouton; nom: string }[] = [
  { id: 'plein', nom: 'Plein' }, { id: 'contour', nom: 'Contour' }, { id: 'doux', nom: 'Doux' }, { id: 'relief', nom: 'Relief' }, { id: 'verre', nom: 'Verre' },
];
const OMBRES: { id: OmbreBouton; nom: string }[] = [{ id: 'aucune', nom: 'Aucune' }, { id: 'subtile', nom: 'Subtile' }, { id: 'marquee', nom: 'Marquée' }];
const FORMES: { id: FormeBouton; nom: string }[] = [{ id: 'pilule', nom: 'Pilule' }, { id: 'arrondi', nom: 'Arrondi' }, { id: 'carre', nom: 'Net' }];
const EXEMPLES: Record<Reseau, string> = {
  youtube: '@pseudo ou lien', linkedin: 'pseudo ou lien', instagram: '@pseudo ou lien', tiktok: '@pseudo ou lien',
  x: '@pseudo ou lien', github: 'pseudo ou lien', facebook: 'pseudo ou lien', threads: '@pseudo ou lien', twitch: 'pseudo ou lien',
  spotify: 'https://open.spotify.com/…', email: 'toi@exemple.fr', site: 'https://…',
};

/** Un thème en miniature : sa police, son accent et ses boutons, dans leur vrai style. */
/** Regarder les thèmes coche l'étape « Choisis ton thème » : garder celui de départ est un choix. */
function themesVus() {
  try { localStorage.setItem('hopla-themes-vus', '1'); } catch { /* stockage refusé */ }
  window.dispatchEvent(new Event('hopla-themes-vus'));
}

export function Pastille({ theme }: { theme: Theme }) {
  return (
    <span className="lp-pastille flex aspect-[4/5] w-full flex-col items-center gap-[6%] rounded-xl pt-[13%] shadow-inner ring-1 ring-white/10"
      style={variablesTheme(theme) as CSSProperties} data-decor={theme.decor} data-police={theme.police} data-bouton={theme.conseil.style} data-forme={theme.conseil.forme} data-ombre={theme.conseil.ombre}>
      <span className="lp-pastille-aa" aria-hidden="true">Aa</span>
      <span className="lp-pastille-barre vedette mt-[6%]" />
      <span className="lp-pastille-barre" />
      <span className="lp-pastille-barre" />
    </span>
  );
}

export type PartieApparence = 'profil' | 'theme' | 'couleurs' | 'animation' | 'boutons' | 'bureau' | 'reseaux';
const TOUTES: PartieApparence[] = ['profil', 'theme', 'couleurs', 'animation', 'boutons', 'bureau', 'reseaux'];

/** Les réglages d'apparence, en cartes. `parties` n'en garde que certaines (les feuilles de « Ma page »). */
export function OngletApparence({ reglages, onChange, envoyerImage, principal = true, parties = TOUTES, vedettes }: { reglages: Reglages; onChange: (r: Reglages) => void; envoyerImage: (d: string) => Promise<string>; principal?: boolean; parties?: PartieApparence[]; vedettes?: number }) {
  const voir = (p: PartieApparence) => parties.includes(p);
  // Seule dans une feuille, une partie est déjà nommée par la feuille : pas de second titre.
  const titre = (t: string) => (parties.length === 1 ? undefined : t);
  const [envoi, setEnvoi] = useState(false);
  const [photoRatee, setPhotoRatee] = useState(false);
  const [enSaisie, setEnSaisie] = useState<Reseau | null>(null);
  const [ligne, setLigne] = useState<Reseau | null>(null);
  // Seule dans une feuille, la partie n'a pas de cadre : la feuille en est déjà un.
  const nu = parties.length === 1;
  // Un thème choisi par-dessus des couleurs à soi : elles partent, mais un toucher les rend.
  const [avantTheme, setAvantTheme] = useState<Reglages | null>(null);
  const fichier = useRef<HTMLInputElement>(null);
  // Tes couleurs viennent avec Starter : sans, les aperçus montrent celles du thème, comme la page.
  const couleurs = usePermis('couleurs');
  const perso = Object.values(reglages.couleurs).some(Boolean);
  const theme = themeDe(couleurs ? reglages : { ...reglages, couleurs: SANS_COULEURS });
  const maj = (champs: Partial<Reglages>) => onChange({ ...reglages, ...champs });
  const profil = (champs: Partial<Reglages['profil']>) => maj({ profil: { ...reglages.profil, ...champs } });
  const absents = RESEAUX.filter(r => !reglages.reseaux.some(x => x.reseau === r));

  async function avatar(f: File | undefined) {
    if (!f) return;
    setEnvoi(true); setPhotoRatee(false);
    try { profil({ avatar: await envoyerImage(await preparerImage(f, 'carre')) }); } catch { setPhotoRatee(true); } finally { setEnvoi(false); if (fichier.current) fichier.current.value = ''; }
  }

  return (
    <div className="flex flex-col gap-4">
      {voir('profil') && <Carte nu={nu} titre={titre('Profil')} id="profil">
        <div className="mb-4 flex items-center gap-4">
          <button type="button" onClick={e => choisirFichier(fichier.current, e.currentTarget)} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-white/10" aria-label="Changer la photo">
            {reglages.profil.avatar && <img src={reglages.profil.avatar} alt="" className="h-full w-full object-cover" />}
            <span className="absolute inset-0 grid place-items-center bg-black/45 text-[12px] font-medium text-nuit opacity-0 transition group-hover:opacity-100">{envoi ? '…' : 'Changer'}</span>
          </button>
          <div className="flex flex-col items-start gap-1">
            <button type="button" onClick={e => choisirFichier(fichier.current, e.currentTarget)} className={classeBouton.secondaire}>{envoi ? 'Envoi…' : 'Changer la photo'}</button>
            {reglages.profil.avatar && <button type="button" onClick={() => profil({ avatar: '' })} className="min-h-11 rounded-xl px-1 text-[13px] text-white/60 hover:text-white">Sans photo</button>}
          </div>
          <input ref={fichier} type="file" accept="image/*" className="adm-fichier" tabIndex={-1} aria-hidden="true" onChange={e => avatar(e.target.files?.[0])} />
        </div>
        {photoRatee && <p className="-mt-2 mb-3 text-[13px] text-red-300" role="alert">La photo n’est pas passée. Essaie une autre image, en JPG ou PNG.</p>}
        <div className="flex flex-col gap-3">
          <Champ label="Nom"><input className={classeSaisie} value={reglages.profil.nom} maxLength={80} onChange={e => profil({ nom: e.target.value })} /></Champ>
          <Champ label="Bio"><textarea className={`${classeSaisie} min-h-24`} value={reglages.profil.bio} maxLength={300} onChange={e => profil({ bio: e.target.value })} /></Champ>
          {principal && <Interrupteur label="Badge vérifié" actif={reglages.profil.badge} onChange={v => profil({ badge: v })} />}
        </div>
      </Carte>}

      {voir('theme') && <Carte nu={nu} titre={titre('Thème')} id="theme" action={titre('Thème') ? <span className="text-[13px] text-white/50">{theme.nom}</span> : undefined}>
        {avantTheme && (
          <p role="status" className="mb-3 flex items-center justify-between gap-3 text-[13px] text-white/60">
            Tes couleurs à toi ont été retirées.
            <button type="button" onClick={() => { onChange({ ...reglages, couleurs: avantTheme.couleurs, bouton: avantTheme.bouton }); setAvantTheme(null); }}
              className="min-h-11 shrink-0 font-medium text-white underline decoration-white/30 underline-offset-2">Les garder</button>
          </p>
        )}
        <ul role="radiogroup" aria-label="Thème" onKeyDown={e => flechesRadio(e)} className="grid grid-cols-3 gap-2.5">
          {THEMES.map(t => (
            <li key={t.id}>
              {/* Choisir un thème pose aussi ses boutons et ses couleurs ; on peut les changer ensuite. */}
              <button type="button" onClick={() => {
                setAvantTheme(perso ? reglages : null);
                maj({ theme: t.id, bouton: t.conseil, couleurs: SANS_COULEURS });
              }} role="radio" aria-checked={theme.id === t.id}
                className={`flex w-full flex-col items-center gap-1.5 rounded-2xl p-1.5 transition ${theme.id === t.id ? 'bg-white/10 ring-2 ring-white' : 'hover:bg-white/[0.05]'}`}>
                <Pastille theme={t} />
                <span className="line-clamp-2 w-full text-center text-[12.5px] font-medium leading-tight text-balance text-white/85">{t.nom}</span>
              </button>
            </li>
          ))}
        </ul>
      </Carte>}

      {/* Seule dans une feuille, « Réinitialiser » monte dans l'en-tête de la feuille, à côté du retour. */}
      {voir('couleurs') && <Carte nu={nu} titre={titre('Couleurs')} action={nu || !couleurs ? undefined : <Reinitialiser reglages={reglages} onChange={onChange} />}>
        {couleurs ? (
          <div className="flex flex-col gap-5">
            {CLES_COULEURS.map(c => (
              <ChoixCouleur key={c.id} nom={c.nom} valeur={reglages.couleurs[c.id]} duTheme={c.duTheme(themeParId(reglages.theme))}
                onChange={v => maj({ couleurs: { ...reglages.couleurs, [c.id]: v } })} />
            ))}
          </div>
        ) : (
          // Des couleurs gardées d'une offre passée restent en base : elles reviennent avec Starter.
          <Reserve fonction="couleurs" phrase={perso ? 'Tes couleurs attendent Hopla Starter : pour l’instant, ta page garde celles de son thème.' : 'Avec Hopla Starter, tu changes le fond, les boutons et le lien mis en avant, par-dessus ton thème.'} />
        )}
      </Carte>}

      {voir('animation') && <Carte nu={nu} titre={titre('Animation')} action={titre('Animation') ? <span className="text-[13px] text-white/50">{NOMS_ANIMATIONS[reglages.animation].nom}</span> : undefined}>
        <p className="mb-3 text-[13px] leading-snug text-white/60">{vedettes === 0
          ? 'Aucun lien n’est mis en avant pour l’instant : touche un lien sur ta page, puis « Mis en avant » dans Plus de réglages. L’animation choisie ici s’y appliquera.'
          : 'Pour les liens mis en avant. Chaque lien peut aussi choisir la sienne.'}</p>
        <div className="lp lp-mini rounded-2xl p-3" style={variablesTheme(theme) as CSSProperties} data-bouton={reglages.bouton.style} data-forme={reglages.bouton.forme} data-ombre={reglages.bouton.ombre} data-police={theme.police} data-decor={theme.decor}>
          <ul role="radiogroup" onKeyDown={e => flechesRadio(e)} aria-label="Animation des liens mis en avant" className="grid grid-cols-2 gap-2">
            {ANIMATIONS.map(a => {
              const choisi = reglages.animation === a;
              return (
                <li key={a}>
                  <button type="button" role="radio" aria-checked={choisi} onClick={() => { vibrer(5); maj({ animation: a }); }}
                    className={`flex w-full items-center gap-1.5 rounded-[18px] p-1.5 text-left transition duration-200 ${choisi ? 'ring-2 ring-[color:var(--texte)]' : 'hover:bg-white/[0.06]'}`}>
                    <span className={`lp-btn lp-btn-vedette lp-accent min-w-0 flex-1 ${a !== 'aucune' ? `lp-anim-${a}` : ''}`} style={{ minHeight: 52, padding: '8px 10px', fontSize: 15 }}>
                      {NOMS_ANIMATIONS[a].nom}
                    </span>
                    {/* Le même choix que pour les boutons : anneau, et coche à droite à la couleur du texte du thème. */}
                    <span className="grid w-5 shrink-0 place-items-center" style={{ color: 'var(--texte)' }} aria-hidden="true">{choisi && <Icone nom="ui-ok" taille={18} />}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </Carte>}

      {voir('boutons') && <Carte nu={nu} titre={titre('Boutons')}>
        <div className="lp lp-mini rounded-2xl p-3" style={variablesTheme(theme) as CSSProperties} data-forme={reglages.bouton.forme} data-ombre={reglages.bouton.ombre} data-police={theme.police} data-decor={theme.decor}>
          <ul className="grid grid-cols-1 gap-2.5" role="radiogroup" aria-label="Style des boutons" onKeyDown={e => flechesRadio(e)}>
            {STYLES.map(s => {
              const choisi = reglages.bouton.style === s.id;
              return (
              <li key={s.id} data-bouton={s.id} className="lp-style">
                <button type="button" role="radio" aria-checked={choisi} onClick={() => { vibrer(4); maj({ bouton: { ...reglages.bouton, style: s.id } }); }}
                  className={`flex w-full items-center gap-3 rounded-[calc(var(--rc)+6px)] p-1.5 transition ${choisi ? 'ring-2 ring-[color:var(--texte)]' : 'hover:bg-white/[0.05]'}`}>
                  <span className="lp-btn flex-1" style={{ minHeight: 48 }}><span className="lp-btn-texte"><span className="lp-btn-titre">{s.nom}</span></span></span>
                  {/* Un bouton blanc sous un anneau blanc ne se voit pas : la coche, dans la couleur du texte du thème, dit le choix. */}
                  <span className="grid w-6 shrink-0 place-items-center" style={{ color: 'var(--texte)' }} aria-hidden="true">{choisi && <Icone nom="ui-ok" taille={20} />}</span>
                </button>
              </li>
              );
            })}
          </ul>
        </div>
        <div className="mt-4">
          <span className="mb-1.5 block text-[13px] font-medium text-white/70">Forme</span>
          <Segments label="Forme des boutons" valeur={reglages.bouton.forme} options={FORMES} onChange={v => maj({ bouton: { ...reglages.bouton, forme: v } })} />
        </div>
        <div className="mt-4">
          <span className="mb-1.5 block text-[13px] font-medium text-white/70">Ombre</span>
          <Segments label="Ombre des boutons" valeur={reglages.bouton.ombre} options={OMBRES} onChange={v => maj({ bouton: { ...reglages.bouton, ombre: v } })} />
        </div>
      </Carte>}

      {voir('bureau') && <Carte nu={nu} titre={titre('Sur ordinateur')}>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" onKeyDown={e => flechesRadio(e)} aria-label="Mise en page sur ordinateur">
          {BUREAUX.map(b => {
            const actif = reglages.bureau === b.id;
            return (
              <button key={b.id} type="button" role="radio" aria-checked={actif} onClick={() => { vibrer(); maj({ bureau: b.id }); }}
                className={`flex flex-col gap-2 rounded-[14px] border p-2 text-left transition ${actif ? 'border-white ring-1 ring-inset ring-white' : 'border-white/15 hover:border-white/30'}`}>
                <SchemaBureau id={b.id} />
                <span className="px-1 pb-1 text-[13px] font-semibold text-white">{b.nom}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[13px] leading-snug text-white/60">{BUREAUX.find(b => b.id === reglages.bureau)?.aide} Sur téléphone, ta page reste en colonne.</p>
      </Carte>}

      {voir('reseaux') && <Carte nu={nu} titre={titre('Réseaux')} id="reseaux">
        <ul className="flex flex-col gap-2">
          {reglages.reseaux.map((r, i) => {
            // Un pseudo qui ne mène nulle part se dit sous le champ, une fois quitté ; il ne s'affiche pas sur la page.
            const faux = enSaisie !== r.reseau && !!r.url.trim() && !urlReseau(r.reseau, r.url);
            return (
            <li key={r.reseau} className="flex flex-wrap items-center gap-1.5" onFocus={() => setLigne(r.reseau)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setLigne(l => (l === r.reseau ? null : l)); }}>
              <span className="flex w-7 shrink-0 justify-center text-white" style={{ color: couleurReseau(r.reseau) }}><Icone nom={r.reseau} taille={22} /></span>
              {/* Un pseudo suffit, comme aux premiers pas : il devient l'adresse du profil en quittant le champ. */}
              <input className={`${classeSaisie} min-w-0 flex-1 py-2.5`} value={pseudoReseau(r.reseau, r.url)} onFocus={() => setEnSaisie(r.reseau)}
                aria-invalid={faux || undefined} aria-describedby={faux ? `reseau-faux-${r.reseau}` : undefined} aria-label={NOMS_RESEAUX[r.reseau]} placeholder={EXEMPLES[r.reseau]} inputMode={r.reseau === 'email' ? 'email' : 'url'} autoCapitalize="none" autoCorrect="off"
                onChange={e => maj({ reseaux: reglages.reseaux.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })}
                onBlur={e => { setEnSaisie(null); const u = urlReseau(r.reseau, e.target.value); if (u && u !== r.url) maj({ reseaux: reglages.reseaux.map((x, j) => (j === i ? { ...x, url: u } : x)) }); }} />
              {/* Monter et descendre, à la taille du pouce, sur la ligne touchée seulement : le champ garde sa largeur sur les autres. */}
              <button type="button" disabled={i === 0} aria-label={`Monter ${NOMS_RESEAUX[r.reseau]}`} onClick={() => { const l = [...reglages.reseaux]; [l[i - 1], l[i]] = [l[i], l[i - 1]]; maj({ reseaux: l }); }}
                className={`h-11 w-9 shrink-0 place-items-center text-white/50 hover:text-white disabled:invisible ${reglages.reseaux.length > 1 && ligne === r.reseau ? 'grid' : 'hidden'}`}><Icone nom="ui-chevron" taille={18} className="rotate-180" /></button>
              <button type="button" disabled={i === reglages.reseaux.length - 1} aria-label={`Descendre ${NOMS_RESEAUX[r.reseau]}`} onClick={() => { const l = [...reglages.reseaux]; [l[i + 1], l[i]] = [l[i], l[i + 1]]; maj({ reseaux: l }); }}
                className={`h-11 w-9 shrink-0 place-items-center text-white/50 hover:text-white disabled:invisible ${reglages.reseaux.length > 1 && ligne === r.reseau ? 'grid' : 'hidden'}`}><Icone nom="ui-chevron" taille={18} /></button>
              <button type="button" aria-label={`Retirer ${NOMS_RESEAUX[r.reseau]}`} onClick={() => maj({ reseaux: reglages.reseaux.filter((_, j) => j !== i) })} className="grid h-11 w-9 shrink-0 place-items-center text-white/50 hover:text-white"><Icone nom="ui-fermer" taille={18} /></button>
              {faux && <p id={`reseau-faux-${r.reseau}`} role="alert" className="w-full pl-9 text-[13px] font-medium text-red-300">{pourquoiPasReseau(r.reseau, pseudoReseau(r.reseau, r.url))}</p>}
            </li>
            );
          })}
        </ul>
        {absents.length > 0 && (
          <div className="mt-4">
            <span className="mb-1.5 block text-[13px] font-medium text-white/70">Ajouter un réseau</span>
            <div className="flex flex-wrap gap-1">
              {absents.map(r => (
                <button key={r} type="button" aria-label={`Ajouter ${NOMS_RESEAUX[r]}`} onClick={() => { vibrer(4); maj({ reseaux: [...reglages.reseaux, { reseau: r, url: '' }] }); setTimeout(() => document.querySelector<HTMLInputElement>(`[aria-label="${NOMS_RESEAUX[r]}"]`)?.focus(), 40); }}
                  className="flex w-[62px] flex-col items-center gap-1 rounded-xl py-2 text-white/80 transition hover:bg-white/[0.06] hover:text-white active:scale-95">
                  <Icone nom={r} taille={22} />
                  <span className="w-full truncate text-center text-[11.5px] text-white/55" aria-hidden="true">{NOMS_RESEAUX[r]}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-4">
          <span className="mb-1.5 block text-[13px] font-medium text-white/70">Emplacement des icônes</span>
          <Segments label="Emplacement des icônes" valeur={reglages.reseauxPosition} options={[{ id: 'haut', nom: 'Sous la bio' }, { id: 'bas', nom: 'En bas' }]} onChange={v => maj({ reseauxPosition: v })} />
        </div>
      </Carte>}
    </div>
  );
}

const BUREAUX: { id: MiseEnPageBureau; nom: string; aide: string }[] = [
  { id: 'colonne', nom: 'Colonne', aide: 'Comme sur téléphone, sur un panneau.' },
  { id: 'profil', nom: 'Profil', aide: 'Profil à gauche, liens sur deux colonnes.' },
  { id: 'onepage', nom: 'Pleine page', aide: 'Ton nom en grand, les liens en cartes.' },
];

/** Un petit croquis de chaque mise en page, dessiné en blocs. */
function SchemaBureau({ id }: { id: MiseEnPageBureau }) {
  const b = 'rgb(0 0 0 / 0.14)', p = 'rgb(0 0 0 / 0.78)';
  return (
    <svg viewBox="0 0 120 76" className="w-full rounded-xl bg-[#f4f4f4]" aria-hidden="true">
      {id === 'colonne' && (<>
        <rect x="38" y="6" width="44" height="64" rx="6" fill="rgb(0 0 0 / 0.05)" />
        <circle cx="60" cy="17" r="5" fill={b} /><rect x="48" y="26" width="24" height="3" rx="1.5" fill={b} />
        <rect x="44" y="34" width="32" height="7" rx="3.5" fill={p} />
        {[44, 52, 60].map(y => <rect key={y} x="44" y={y} width="32" height="6" rx="3" fill={b} />)}
      </>)}
      {id === 'profil' && (<>
        <circle cx="22" cy="20" r="8" fill={b} /><rect x="14" y="33" width="28" height="4" rx="2" fill={b} /><rect x="14" y="41" width="22" height="3" rx="1.5" fill="rgb(0 0 0 / 0.08)" />
        <rect x="54" y="10" width="58" height="9" rx="4.5" fill={p} />
        {[24, 34, 44, 54].map(y => [54, 85].map(x => <rect key={`${x}-${y}`} x={x} y={y} width="27" height="7" rx="3.5" fill={b} />))}
      </>)}
      {id === 'onepage' && (<>
        <rect x="10" y="12" width="52" height="8" rx="2" fill="rgb(0 0 0 / 0.3)" /><rect x="10" y="24" width="38" height="3" rx="1.5" fill={b} />
        <rect x="84" y="8" width="26" height="24" rx="6" fill={b} />
        <rect x="10" y="38" width="100" height="1" fill="rgb(0 0 0 / 0.08)" />
        <rect x="10" y="44" width="100" height="8" rx="4" fill={p} />
        {[10, 44, 78].map(x => <rect key={x} x={x} y="56" width="32" height="14" rx="4" fill={b} />)}
      </>)}
    </svg>
  );
}

export type Tiroir = 'theme' | 'couleurs' | 'boutons' | 'animation' | 'bureau';

/**
 * Le design en liste à tiroirs : une icône et un titre par ligne, un toucher
 * l'ouvre à la place de la liste, la flèche ramène.
 */
export function DesignTiroirs({ reglages, onChange, envoyerImage, principal, pied, vedettes, initial }: { reglages: Reglages; onChange: (r: Reglages) => void; envoyerImage: (d: string) => Promise<string>; principal: boolean; pied?: ReactNode; vedettes?: number;
  /** Le tiroir ouvert d'emblée. */
  initial?: Tiroir }) {
  const [ouvert, setOuvert] = useState<Tiroir | null>(initial ?? null);
  // Le focus suit le tiroir : sur son retour en entrant, sur sa ligne en revenant.
  const retour = useRef<HTMLButtonElement>(null);
  const dernier = useRef<Tiroir | null>(null);
  const racine = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Chaque tiroir, et la liste au retour, s'ouvre par son haut : la feuille ne garde pas le défilement d'avant.
    // Le thème fait exception : il amène lui-même le thème choisi en vue.
    if (ouvert !== 'theme') {
      let el: HTMLElement | null = racine.current?.parentElement ?? null;
      while (el && !(el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
      if (el) el.scrollTop = 0;
      // Au bureau, le design est dans la page même : son haut revient sous les onglets collés s'il était passé dessous.
      else if (racine.current && racine.current.getBoundingClientRect().top < (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0)) racine.current.scrollIntoView({ block: 'start' });
    }
    // Dans la feuille du téléphone, la flèche est dans l'en-tête, posée juste après ce rendu.
    if (ouvert) { dernier.current = ouvert; requestAnimationFrame(() => (retour.current ?? racine.current?.closest('.adm-feuille')?.querySelector<HTMLElement>('.adm-feuille-retour'))?.focus({ preventScroll: true, focusVisible: false } as FocusOptions)); }
    else if (dernier.current) document.getElementById(`design-${dernier.current}`)?.focus({ preventScroll: true });
  }, [ouvert]);
  const couleurs = usePermis('couleurs');
  const voirOffres = useVoirOffres();
  // Chaque ligne dit ce qui est réglé, à droite : on sait sans ouvrir. Une partie réservée porte le nom de son offre.
  // Réservées, les couleurs ouvrent les offres par-dessus le design, Starter en avant ; sans chemin vers les offres, leur tiroir dit pourquoi.
  const lignes: { id: Tiroir; nom: string; icone: string; valeur: ReactNode }[] = [
    { id: 'theme', nom: 'Thème', icone: 'palette', valeur: themeParId(reglages.theme).nom },
    { id: 'couleurs', nom: 'Couleurs', icone: 'pinceau', valeur: !couleurs ? <Etiquette fonction="couleurs" /> : Object.values(reglages.couleurs).some(Boolean) ? 'Personnalisées' : 'Celles du thème' },
    { id: 'boutons', nom: 'Boutons', icone: 'etiquette', valeur: STYLES.find(x => x.id === reglages.bouton.style)?.nom ?? '' },
    { id: 'animation', nom: 'Animation', icone: 'eclair', valeur: NOMS_ANIMATIONS[reglages.animation].nom },
    { id: 'bureau', nom: 'Sur ordinateur', icone: 'ordinateur', valeur: BUREAUX.find(x => x.id === reglages.bureau)?.nom ?? '' },
  ];

  // Dans la feuille du téléphone, le nom du tiroir et sa flèche prennent l'en-tête, comme les réglages d'un bloc ; au bureau, la ligne de retour reste collée en haut.
  const nomOuvert = lignes.find(l => l.id === ouvert)?.nom ?? '';
  const dansFeuille = useFilFeuille(ouvert ? { titre: nomOuvert, label: 'Revenir au design', retour: () => setOuvert(null) } : null);
  // Le retour du téléphone ramène à la liste des tiroirs avant de fermer le design.
  useCouche(!!ouvert, () => { setOuvert(null); return true; });

  if (ouvert) return (
    <div ref={racine} className="flex flex-col gap-3">
      {/* Le retour reste collé en haut de la feuille (au bureau, sous les onglets) : on le retrouve après avoir fait défiler vingt thèmes. */}
      {!dansFeuille ? (
        <div className="adm-tiroir-retour sticky top-0 z-10 -mx-5 flex items-center bg-nuit px-4 pb-1">
          <button ref={retour} type="button" onClick={() => { vibrer(4); setOuvert(null); }} aria-label={`${nomOuvert}, revenir au design`} className="flex min-h-11 items-center gap-1 rounded-xl pr-3 text-[14px] font-medium text-white/75 hover:text-white">
            <Icone nom="ui-chevron" taille={18} className="rotate-90" /> {nomOuvert}
          </button>
          {ouvert === 'couleurs' && couleurs && <span className="ml-auto pl-1"><Reinitialiser reglages={reglages} onChange={onChange} /></span>}
        </div>
      ) : ouvert === 'couleurs' && couleurs && <div className="-mt-1 flex justify-end"><Reinitialiser reglages={reglages} onChange={onChange} /></div>}
      <OngletApparence reglages={reglages} onChange={onChange} envoyerImage={envoyerImage} principal={principal} parties={[ouvert]} vedettes={vedettes} />
    </div>
  );

  return (
    <div ref={racine} className="flex flex-col gap-4">
      <ul className="adm-groupe">
        {lignes.map((l, i) => (
          <li key={l.id} className={i > 0 ? 'border-t border-white/[0.07]' : ''}>
            <button id={`design-${l.id}`} type="button" aria-haspopup={l.id === 'couleurs' && !couleurs && voirOffres ? 'dialog' : undefined}
              onClick={() => { vibrer(4); if (l.id === 'couleurs' && !couleurs && voirOffres) return voirOffres('couleurs'); setOuvert(l.id); if (l.id === 'theme') themesVus(); }}
              className="flex min-h-[52px] w-full items-center gap-3 rounded-[inherit] px-3.5 py-2 text-left transition hover:bg-white/[0.04] active:bg-white/[0.06]">
              <Icone nom={l.icone} taille={20} className="shrink-0 text-white/70" />
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-white">{l.nom}</span>
              <span className="min-w-0 max-w-[45%] truncate text-[13px] text-white/55">{l.valeur}</span>
              <Icone nom="ui-chevron" taille={16} className="-rotate-90 text-white/30" />
            </button>
          </li>
        ))}
      </ul>
      {pied}
    </div>
  );
}

/** Remet les trois couleurs à celles du thème. Toujours là pour qu'on le trouve, éteint tant qu'il n'y a rien à remettre. */
function Reinitialiser({ reglages, onChange }: { reglages: Reglages; onChange: (r: Reglages) => void }) {
  const perso = Object.values(reglages.couleurs).some(Boolean);
  return (
    <button type="button" disabled={!perso} onClick={() => { vibrer(4); onChange({ ...reglages, couleurs: SANS_COULEURS }); }}
      className="-my-2 min-h-11 rounded-xl px-2 text-[13px] font-medium text-white/70 transition hover:text-white disabled:text-white/30 disabled:hover:text-white/30">Réinitialiser</button>
  );
}

/** Les trois couleurs qu'on change par-dessus un thème, et où les lire dans le thème. */
const CLES_COULEURS: { id: keyof Couleurs; nom: string; duTheme: (t: Theme) => string }[] = [
  { id: 'fond', nom: 'Fond', duTheme: t => t.fondUni },
  { id: 'boutons', nom: 'Boutons', duTheme: t => t.surface },
  { id: 'accent', nom: 'Lien mis en avant', duTheme: t => t.vedette },
];
/** Une palette courte, des neutres aux couleurs franches ; le sélecteur donne tout le reste. */
const PALETTE = ['#0c121f', '#111111', '#ffffff', '#f4ece1', '#e3e9de', '#e9e2f6', '#1f35ff', '#d62e1f', '#ff8a5c', '#ffd400', '#23704f', '#ff6fae'];
/** Leurs noms, lus à voix haute et sous le nom du réglage : jamais un code hexadécimal. */
const NOMS_PALETTE: Record<string, string> = {
  '#0c121f': 'Nuit', '#111111': 'Noir', '#ffffff': 'Blanc', '#f4ece1': 'Crème', '#e3e9de': 'Sauge pâle', '#e9e2f6': 'Lilas pâle',
  '#1f35ff': 'Bleu Klein', '#d62e1f': 'Rouge', '#ff8a5c': 'Corail', '#ffd400': 'Jaune', '#23704f': 'Vert sapin', '#ff6fae': 'Rose',
};

/** Une couleur : celle du thème, une de la palette, ou n'importe laquelle au sélecteur. */
function ChoixCouleur({ nom, valeur, duTheme, onChange }: { nom: string; valeur: string; duTheme: string; onChange: (v: string) => void }) {
  const actuelle = valeur || duTheme;
  const perso = !!valeur && !PALETTE.includes(valeur);
  const pastille = (c: string, choisie: boolean, etiquette: string, action: () => void) => (
    <button type="button" onClick={() => { vibrer(4); action(); }} aria-pressed={choisie} aria-label={etiquette} title={etiquette}
      className={`relative h-8 w-8 shrink-0 rounded-full ring-1 ring-inset ring-white/20 transition before:absolute before:-inset-1 before:content-[''] active:scale-90 ${choisie ? 'outline-2 outline-offset-2 outline-white' : ''}`} style={{ background: c }} />
  );
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[13.5px] font-medium text-white/85">{nom}</span>
        <span className="text-[12.5px] text-white/55">{valeur ? NOMS_PALETTE[valeur] ?? 'Couleur choisie' : 'Celle du thème'}</span>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {pastille(duTheme, !valeur, `${nom} : celle du thème`, () => onChange(''))}
        <span className="mx-0.5 h-8 w-px self-center bg-white/10" aria-hidden="true" />
        {PALETTE.filter(c => c !== duTheme.toLowerCase()).map(c => pastille(c, valeur === c, `${nom} : ${NOMS_PALETTE[c]}`, () => onChange(c)))}
        {/* Une autre couleur : le « + » seul, sans rond autour ; prise, elle devient une pastille de couleur comme les autres. */}
        <label className={`relative grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full transition before:absolute before:-inset-1 before:content-[''] ${perso ? 'ring-1 ring-inset ring-white/20 outline-2 outline-offset-2 outline-white' : 'text-white/60 hover:text-white'}`}
          title="Une autre couleur" style={perso ? { background: valeur } : undefined}>
          {!perso && <Icone nom="ui-plus" taille={20} />}
          <input type="color" value={actuelle} onChange={e => onChange(e.target.value.toLowerCase())} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={`${nom} : une autre couleur`} />
        </label>
      </div>
    </div>
  );
}
