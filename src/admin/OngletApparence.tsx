import { useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Couleurs, FormeBouton, MiseEnPageBureau, OmbreBouton, Reglages, Reseau, StyleBouton } from '../lib/types.ts';
import { ANIMATIONS, RESEAUX, SANS_COULEURS } from '../lib/types.ts';
import { THEMES, themeDe, themeParId, variablesTheme } from '../lib/themes.ts';
import type { Theme } from '../lib/themes.ts';
import { Icone, NOMS_RESEAUX } from '../components/Icone.tsx';
import { Carte, Champ, Interrupteur, NOMS_ANIMATIONS, Segments, classeSaisie, preparerImage, vibrer } from './ui.tsx';

const STYLES: { id: StyleBouton; nom: string }[] = [
  { id: 'plein', nom: 'Plein' }, { id: 'contour', nom: 'Contour' }, { id: 'doux', nom: 'Doux' }, { id: 'relief', nom: 'Relief' }, { id: 'verre', nom: 'Verre' },
];
const OMBRES: { id: OmbreBouton; nom: string }[] = [{ id: 'aucune', nom: 'Aucune' }, { id: 'subtile', nom: 'Subtile' }, { id: 'marquee', nom: 'Marquée' }];
const FORMES: { id: FormeBouton; nom: string }[] = [{ id: 'pilule', nom: 'Pilule' }, { id: 'arrondi', nom: 'Arrondi' }, { id: 'carre', nom: 'Net' }];
const EXEMPLES: Record<Reseau, string> = {
  youtube: 'https://youtube.com/@…', linkedin: 'https://linkedin.com/in/…', instagram: 'https://instagram.com/…', tiktok: 'https://tiktok.com/@…',
  x: 'https://x.com/…', github: 'https://github.com/…', facebook: 'https://facebook.com/…', threads: 'https://threads.net/@…', twitch: 'https://twitch.tv/…',
  spotify: 'https://open.spotify.com/…', email: 'toi@exemple.fr', site: 'https://…',
};

/** Un thème en miniature : sa police, son accent et ses boutons, dans leur vrai style. */
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
export function OngletApparence({ reglages, onChange, envoyerImage, principal = true, parties = TOUTES }: { reglages: Reglages; onChange: (r: Reglages) => void; envoyerImage: (d: string) => Promise<string>; principal?: boolean; parties?: PartieApparence[] }) {
  const voir = (p: PartieApparence) => parties.includes(p);
  const [envoi, setEnvoi] = useState(false);
  const fichier = useRef<HTMLInputElement>(null);
  const theme = themeDe(reglages);
  const maj = (champs: Partial<Reglages>) => onChange({ ...reglages, ...champs });
  const profil = (champs: Partial<Reglages['profil']>) => maj({ profil: { ...reglages.profil, ...champs } });
  const absents = RESEAUX.filter(r => !reglages.reseaux.some(x => x.reseau === r));

  async function avatar(f: File | undefined) {
    if (!f) return;
    setEnvoi(true);
    try { profil({ avatar: await envoyerImage(await preparerImage(f, 'carre')) }); } finally { setEnvoi(false); if (fichier.current) fichier.current.value = ''; }
  }

  return (
    <div className="flex flex-col gap-4">
      {voir('profil') && <Carte titre="Profil" id="profil">
        <div className="mb-4 flex items-center gap-4">
          <button type="button" onClick={() => fichier.current?.click()} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-white/10" aria-label="Changer la photo">
            {reglages.profil.avatar && <img src={reglages.profil.avatar} alt="" className="h-full w-full object-cover" />}
            <span className="absolute inset-0 grid place-items-center bg-black/45 text-[12px] font-medium text-white opacity-0 transition group-hover:opacity-100">{envoi ? '…' : 'Changer'}</span>
          </button>
          <div className="flex flex-col items-start gap-1">
            <button type="button" onClick={() => fichier.current?.click()} className="min-h-10 rounded-full bg-white/[0.08] px-4 text-[14px] font-medium text-white">{envoi ? 'Envoi…' : 'Changer la photo'}</button>
            {reglages.profil.avatar && <button type="button" onClick={() => profil({ avatar: '' })} className="px-1 text-[13px] text-white/50">Sans photo</button>}
          </div>
          <input ref={fichier} type="file" accept="image/*" hidden onChange={e => avatar(e.target.files?.[0])} />
        </div>
        <div className="flex flex-col gap-3">
          <Champ label="Nom"><input className={classeSaisie} value={reglages.profil.nom} maxLength={80} onChange={e => profil({ nom: e.target.value })} /></Champ>
          <Champ label="Bio"><textarea className={`${classeSaisie} min-h-24`} value={reglages.profil.bio} maxLength={300} onChange={e => profil({ bio: e.target.value })} /></Champ>
          {principal && <Interrupteur label="Badge vérifié" aide="La petite coche à côté de ton nom." actif={reglages.profil.badge} onChange={v => profil({ badge: v })} />}
        </div>
      </Carte>}

      {voir('theme') && <Carte titre="Thème" id="theme" action={<span className="text-[13px] text-white/50">{theme.nom}</span>}>
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {THEMES.map(t => (
            <li key={t.id}>
              {/* Choisir un thème pose aussi ses boutons et ses couleurs ; on peut les changer ensuite. */}
              <button type="button" onClick={() => maj({ theme: t.id, bouton: t.conseil, couleurs: SANS_COULEURS })} aria-pressed={theme.id === t.id}
                className={`flex w-full flex-col items-center gap-1.5 rounded-2xl p-1.5 transition ${theme.id === t.id ? 'bg-white/10 ring-2 ring-white' : 'hover:bg-white/[0.05]'}`}>
                <Pastille theme={t} />
                <span className="flex w-full flex-col text-center leading-tight">
                  <span className="truncate text-[12.5px] font-medium text-white/85">{t.nom}</span>
                  <span className="truncate text-[11.5px] text-white/50">{t.humeur}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Carte>}

      {voir('couleurs') && <Carte titre="Couleurs" action={reglages.couleurs.fond || reglages.couleurs.boutons || reglages.couleurs.accent
        ? <button type="button" onClick={() => maj({ couleurs: SANS_COULEURS })} className="text-[13px] font-medium text-white/60 hover:text-white">Tout remettre</button> : undefined}>
        <p className="-mt-1 mb-4 text-[13px] leading-snug text-white/55">Pars de {themeParId(reglages.theme).nom} et change ce que tu veux. Les textes s’ajustent pour rester lisibles.</p>
        <div className="flex flex-col gap-5">
          {CLES_COULEURS.map(c => (
            <ChoixCouleur key={c.id} nom={c.nom} valeur={reglages.couleurs[c.id]} duTheme={c.duTheme(themeParId(reglages.theme))}
              onChange={v => maj({ couleurs: { ...reglages.couleurs, [c.id]: v } })} />
          ))}
        </div>
      </Carte>}

      {voir('animation') && <Carte titre="Liens mis en avant" action={<span className="text-[13px] text-white/50">{NOMS_ANIMATIONS[reglages.animation].nom}</span>}>
        <p className="-mt-1 mb-3 text-[13px] leading-snug text-white/55">Le mouvement qui attire l’œil sur tes liens en avant. Un lien peut aussi choisir le sien.</p>
        <div className="lp lp-mini rounded-2xl p-2.5" style={variablesTheme(theme) as CSSProperties} data-bouton={reglages.bouton.style} data-forme={reglages.bouton.forme} data-ombre={reglages.bouton.ombre} data-police={theme.police} data-decor={theme.decor}>
          <ul role="radiogroup" aria-label="Animation des liens mis en avant" className="grid grid-cols-2 gap-2">
            {ANIMATIONS.map(a => {
              const choisi = reglages.animation === a;
              return (
                <li key={a}>
                  <button type="button" role="radio" aria-checked={choisi} onClick={() => { vibrer(5); maj({ animation: a }); }}
                    className={`flex w-full flex-col gap-2 rounded-[18px] p-2 pb-2.5 text-left transition duration-200 ${choisi ? 'bg-white/[0.12] ring-2 ring-white' : 'hover:bg-white/[0.06]'}`}>
                    <span className={`lp-btn lp-btn-vedette lp-accent ${a !== 'aucune' ? `lp-anim-${a}` : ''}`} style={{ minHeight: 52, padding: '8px 12px', fontSize: 15 }}>
                      {NOMS_ANIMATIONS[a].nom}
                    </span>
                    <span className="px-1 text-[12px] leading-snug" style={{ color: 'var(--doux)' }}>{NOMS_ANIMATIONS[a].aide}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </Carte>}

      {voir('boutons') && <Carte titre="Boutons">
        <div className="lp lp-mini rounded-2xl p-3" style={variablesTheme(theme) as CSSProperties} data-forme={reglages.bouton.forme} data-ombre={reglages.bouton.ombre} data-police={theme.police} data-decor={theme.decor}>
          <ul className="grid grid-cols-1 gap-2.5">
            {STYLES.map(s => (
              <li key={s.id} data-bouton={s.id} className="lp-style">
                <button type="button" onClick={() => maj({ bouton: { ...reglages.bouton, style: s.id } })} aria-pressed={reglages.bouton.style === s.id}
                  className={`w-full rounded-[calc(var(--rc)+6px)] p-1.5 transition ${reglages.bouton.style === s.id ? 'ring-2 ring-white' : ''}`}>
                  <span className="lp-btn" style={{ minHeight: 48 }}><span className="lp-btn-texte"><span className="lp-btn-titre">{s.nom}</span></span></span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4">
          <span className="mb-1.5 block text-[13px] font-medium text-white/70">Forme</span>
          <Segments label="Forme des boutons" valeur={reglages.bouton.forme} options={FORMES} onChange={v => maj({ bouton: { ...reglages.bouton, forme: v } })} />
        </div>
        <div className="mt-4">
          <span className="mb-1.5 block text-[13px] font-medium text-white/70">Ombre</span>
          <Segments label="Ombre des boutons" valeur={reglages.bouton.ombre} options={OMBRES} onChange={v => maj({ bouton: { ...reglages.bouton, ombre: v } })} />
          {reglages.bouton.style === 'relief' && <p className="mt-1.5 text-[12.5px] leading-snug text-white/50">Le style Relief garde son ombre franche, dessinée au trait.</p>}
        </div>
      </Carte>}

      {voir('bureau') && <Carte titre="Sur ordinateur">
        <p className="mb-3 text-[13px] leading-snug text-white/55">Sur téléphone, ta page reste une colonne. Sur un grand écran, elle prend la mise en page choisie.</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Mise en page sur ordinateur">
          {BUREAUX.map(b => {
            const actif = reglages.bureau === b.id;
            return (
              <button key={b.id} type="button" role="radio" aria-checked={actif} onClick={() => { vibrer(); maj({ bureau: b.id }); }}
                className={`flex flex-col gap-2 rounded-2xl p-2 text-left transition ${actif ? 'bg-white/[0.1] ring-2 ring-white' : 'bg-white/[0.04] ring-1 ring-white/[0.08] hover:bg-white/[0.07]'}`}>
                <SchemaBureau id={b.id} />
                <span className="px-1 text-[13px] font-semibold text-white">{b.nom}</span>
                <span className="px-1 pb-1 text-[12px] leading-snug text-white/55">{b.aide}</span>
              </button>
            );
          })}
        </div>
      </Carte>}

      {voir('reseaux') && <Carte titre="Réseaux" id="reseaux">
        <ul className="flex flex-col gap-2">
          {reglages.reseaux.map((r, i) => (
            <li key={r.reseau} className="flex items-center gap-2">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[0.07] text-white"><Icone nom={r.reseau} taille={20} /></span>
              <input className={`${classeSaisie} py-2.5`} value={r.url} aria-label={NOMS_RESEAUX[r.reseau]} placeholder={EXEMPLES[r.reseau]} inputMode={r.reseau === 'email' ? 'email' : 'url'} autoCapitalize="none"
                onChange={e => maj({ reseaux: reglages.reseaux.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
              <div className="flex shrink-0 flex-col">
                <button type="button" disabled={i === 0} aria-label="Monter" onClick={() => { const l = [...reglages.reseaux]; [l[i - 1], l[i]] = [l[i], l[i - 1]]; maj({ reseaux: l }); }} className="grid h-5 w-7 place-items-center text-white/50 disabled:opacity-20"><Icone nom="ui-chevron" taille={14} className="rotate-180" /></button>
                <button type="button" disabled={i === reglages.reseaux.length - 1} aria-label="Descendre" onClick={() => { const l = [...reglages.reseaux]; [l[i + 1], l[i]] = [l[i], l[i + 1]]; maj({ reseaux: l }); }} className="grid h-5 w-7 place-items-center text-white/50 disabled:opacity-20"><Icone nom="ui-chevron" taille={14} /></button>
              </div>
              <button type="button" aria-label={`Retirer ${NOMS_RESEAUX[r.reseau]}`} onClick={() => maj({ reseaux: reglages.reseaux.filter((_, j) => j !== i) })} className="grid h-10 w-9 shrink-0 place-items-center text-white/40 hover:text-white"><Icone nom="ui-fermer" taille={18} /></button>
            </li>
          ))}
        </ul>
        {absents.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {absents.map(r => (
              <button key={r} type="button" onClick={() => maj({ reseaux: [...reglages.reseaux, { reseau: r, url: '' }] })} className="flex min-h-9 items-center gap-1.5 rounded-full bg-white/[0.06] px-3 text-[13px] text-white/75 hover:bg-white/[0.1]">
                <Icone nom={r} taille={14} /> {NOMS_RESEAUX[r]}
              </button>
            ))}
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
  { id: 'onepage', nom: 'One page', aide: 'Ton nom en grand, les liens en cartes.' },
];

/** Un petit croquis de chaque mise en page, dessiné en blocs. */
function SchemaBureau({ id }: { id: MiseEnPageBureau }) {
  const b = 'rgb(255 255 255 / 0.16)', p = 'var(--color-peche, #ffb38a)';
  return (
    <svg viewBox="0 0 120 76" className="w-full rounded-xl bg-[#0c121f]" aria-hidden="true">
      {id === 'colonne' && (<>
        <rect x="38" y="6" width="44" height="64" rx="6" fill="rgb(255 255 255 / 0.05)" />
        <circle cx="60" cy="17" r="5" fill={b} /><rect x="48" y="26" width="24" height="3" rx="1.5" fill={b} />
        <rect x="44" y="34" width="32" height="7" rx="3.5" fill={p} />
        {[44, 52, 60].map(y => <rect key={y} x="44" y={y} width="32" height="6" rx="3" fill={b} />)}
      </>)}
      {id === 'profil' && (<>
        <circle cx="22" cy="20" r="8" fill={b} /><rect x="14" y="33" width="28" height="4" rx="2" fill={b} /><rect x="14" y="41" width="22" height="3" rx="1.5" fill="rgb(255 255 255 / 0.1)" />
        <rect x="54" y="10" width="58" height="9" rx="4.5" fill={p} />
        {[24, 34, 44, 54].map(y => [54, 85].map(x => <rect key={`${x}-${y}`} x={x} y={y} width="27" height="7" rx="3.5" fill={b} />))}
      </>)}
      {id === 'onepage' && (<>
        <rect x="10" y="12" width="52" height="8" rx="2" fill="rgb(255 255 255 / 0.3)" /><rect x="10" y="24" width="38" height="3" rx="1.5" fill={b} />
        <rect x="84" y="8" width="26" height="24" rx="6" fill={b} />
        <rect x="10" y="38" width="100" height="1" fill="rgb(255 255 255 / 0.1)" />
        <rect x="10" y="44" width="100" height="8" rx="4" fill={p} />
        {[10, 44, 78].map(x => <rect key={x} x={x} y="56" width="32" height="14" rx="4" fill={b} />)}
      </>)}
    </svg>
  );
}

type Tiroir = 'theme' | 'couleurs' | 'boutons' | 'animation' | 'bureau';

/**
 * Le design en liste à tiroirs : chaque ligne dit ce qui est choisi, un toucher
 * l'ouvre à la place de la liste, la flèche ramène. On voit tout d'un coup
 * d'œil sans dérouler quatre cartes.
 */
export function DesignTiroirs({ reglages, onChange, envoyerImage, principal, pied }: { reglages: Reglages; onChange: (r: Reglages) => void; envoyerImage: (d: string) => Promise<string>; principal: boolean; pied?: ReactNode }) {
  const [ouvert, setOuvert] = useState<Tiroir | null>(null);
  const theme = themeDe(reglages);
  const nom = <T extends string>(liste: { id: T; nom: string }[], id: T) => liste.find(x => x.id === id)?.nom ?? '';
  const lignes: { id: Tiroir; nom: string; valeur: string; vignette?: ReactNode }[] = [
    { id: 'theme', nom: 'Thème', valeur: theme.nom, vignette: <span className="block w-7"><Pastille theme={theme} /></span> },
    { id: 'couleurs', nom: 'Couleurs', valeur: resumeCouleurs(reglages.couleurs), vignette: <span className="flex w-7 -space-x-1.5" aria-hidden="true">{[theme.fondUni, theme.surface, theme.vedette].map((c, i) => <span key={i} className="h-4 w-4 shrink-0 rounded-full ring-1 ring-white/25" style={{ background: c }} />)}</span> },
    { id: 'boutons', nom: 'Boutons', valeur: [nom(STYLES, reglages.bouton.style), nom(FORMES, reglages.bouton.forme), `ombre ${nom(OMBRES, reglages.bouton.ombre).toLowerCase()}`].join(', ') },
    { id: 'animation', nom: 'Liens mis en avant', valeur: NOMS_ANIMATIONS[reglages.animation].nom },
    { id: 'bureau', nom: 'Sur ordinateur', valeur: nom(BUREAUX, reglages.bureau) },
  ];

  if (ouvert) return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => { vibrer(4); setOuvert(null); }} className="-ml-1 flex min-h-10 items-center gap-1 self-start rounded-full pr-3 text-[14px] font-medium text-white/70 hover:text-white">
        <Icone nom="ui-chevron" taille={18} className="rotate-90" /> Retour
      </button>
      <OngletApparence reglages={reglages} onChange={onChange} envoyerImage={envoyerImage} principal={principal} parties={[ouvert]} />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <ul className="overflow-hidden rounded-xl bg-white/[0.03] ring-1 ring-white/[0.07]">
        {lignes.map((l, i) => (
          <li key={l.id} className={i > 0 ? 'border-t border-white/[0.07]' : ''}>
            <button type="button" onClick={() => { vibrer(4); setOuvert(l.id); }} className="flex min-h-[52px] w-full items-center gap-3 px-3.5 py-2 text-left transition hover:bg-white/[0.04] active:bg-white/[0.06]">
              {l.vignette}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[14px] font-medium text-white">{l.nom}</span>
                <span className="truncate text-[12.5px] text-white/45">{l.valeur}</span>
              </span>
              <Icone nom="ui-chevron" taille={16} className="-rotate-90 text-white/30" />
            </button>
          </li>
        ))}
      </ul>
      {pied}
    </div>
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

function resumeCouleurs(c: Couleurs) {
  const changes = CLES_COULEURS.filter(k => c[k.id]).map(k => k.nom.toLowerCase());
  return changes.length ? `${changes.join(', ').replace(/^./, m => m.toUpperCase())} à ton goût` : 'Celles du thème';
}

/** Une couleur : celle du thème, une de la palette, ou n'importe laquelle au sélecteur. */
function ChoixCouleur({ nom, valeur, duTheme, onChange }: { nom: string; valeur: string; duTheme: string; onChange: (v: string) => void }) {
  const actuelle = valeur || duTheme;
  const pastille = (c: string, choisie: boolean, etiquette: string, action: () => void) => (
    <button type="button" onClick={() => { vibrer(4); action(); }} aria-pressed={choisie} aria-label={etiquette} title={etiquette}
      className={`h-8 w-8 shrink-0 rounded-full ring-1 ring-inset ring-white/20 transition active:scale-90 ${choisie ? 'outline-2 outline-offset-2 outline-white' : ''}`} style={{ background: c }} />
  );
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[13.5px] font-medium text-white/85">{nom}</span>
        <span className="text-[12.5px] text-white/45">{valeur ? valeur.toUpperCase() : 'Celle du thème'}</span>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {pastille(duTheme, !valeur, `${nom} : celle du thème`, () => onChange(''))}
        <span className="mx-0.5 h-8 w-px self-center bg-white/10" aria-hidden="true" />
        {PALETTE.filter(c => c !== duTheme.toLowerCase()).map(c => pastille(c, valeur === c, `${nom} : ${c}`, () => onChange(c)))}
        <label className={`relative grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full bg-white/[0.08] text-white/80 ring-1 ring-inset ring-white/20 transition hover:bg-white/[0.14] ${valeur && !PALETTE.includes(valeur) ? 'outline-2 outline-offset-2 outline-white' : ''}`}
          title="Une autre couleur" style={valeur && !PALETTE.includes(valeur) ? { background: valeur } : undefined}>
          <Icone nom="ui-plus" taille={16} />
          <input type="color" value={actuelle} onChange={e => onChange(e.target.value.toLowerCase())} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={`${nom} : une autre couleur`} />
        </label>
      </div>
    </div>
  );
}
