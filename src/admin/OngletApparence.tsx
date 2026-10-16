import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { FormeBouton, Reglages, Reseau, StyleBouton } from '../lib/types.ts';
import { ANIMATIONS, RESEAUX } from '../lib/types.ts';
import { FAMILLES, THEMES, themeParId, variablesTheme } from '../lib/themes.ts';
import type { Famille } from '../lib/themes.ts';
import { Icone, NOMS_RESEAUX } from '../components/Icone.tsx';
import { Carte, Champ, Interrupteur, NOMS_ANIMATIONS, Segments, classeSaisie, preparerImage, vibrer } from './ui.tsx';

const STYLES: { id: StyleBouton; nom: string }[] = [
  { id: 'plein', nom: 'Plein' }, { id: 'contour', nom: 'Contour' }, { id: 'doux', nom: 'Doux' }, { id: 'relief', nom: 'Relief' }, { id: 'verre', nom: 'Verre' },
];
const FORMES: { id: FormeBouton; nom: string }[] = [{ id: 'pilule', nom: 'Pilule' }, { id: 'arrondi', nom: 'Arrondi' }, { id: 'carre', nom: 'Net' }];
const EXEMPLES: Record<Reseau, string> = {
  youtube: 'https://youtube.com/@…', linkedin: 'https://linkedin.com/in/…', instagram: 'https://instagram.com/…', tiktok: 'https://tiktok.com/@…',
  x: 'https://x.com/…', github: 'https://github.com/…', facebook: 'https://facebook.com/…', threads: 'https://threads.net/@…', twitch: 'https://twitch.tv/…',
  spotify: 'https://open.spotify.com/…', email: 'toi@exemple.fr', site: 'https://…',
};

export function OngletApparence({ reglages, onChange, envoyerImage }: { reglages: Reglages; onChange: (r: Reglages) => void; envoyerImage: (d: string) => Promise<string> }) {
  const [famille, setFamille] = useState<Famille | 'tous'>('tous');
  const [envoi, setEnvoi] = useState(false);
  const fichier = useRef<HTMLInputElement>(null);
  const theme = themeParId(reglages.theme);
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
      <Carte titre="Profil">
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
          <Interrupteur label="Badge vérifié" aide="La petite coche à côté de ton nom." actif={reglages.profil.badge} onChange={v => profil({ badge: v })} />
        </div>
      </Carte>

      <Carte titre="Thème" action={<span className="text-[13px] text-white/50">{theme.nom}</span>}>
        <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {[{ id: 'tous' as const, nom: `Tous · ${THEMES.length}` }, ...FAMILLES].map(f => (
            <button key={f.id} type="button" onClick={() => setFamille(f.id)}
              className={`min-h-9 shrink-0 rounded-full px-3.5 text-[13.5px] font-medium transition ${famille === f.id ? 'bg-white text-nuit' : 'bg-white/[0.07] text-white/70'}`}>{f.nom}</button>
          ))}
        </div>
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {THEMES.filter(t => famille === 'tous' || t.famille === famille).map(t => (
            <li key={t.id}>
              <button type="button" onClick={() => maj({ theme: t.id })} aria-pressed={reglages.theme === t.id}
                className={`flex w-full flex-col items-center gap-1.5 rounded-2xl p-1.5 transition ${reglages.theme === t.id ? 'bg-peche/15 ring-2 ring-peche' : 'hover:bg-white/[0.05]'}`}>
                <span className="relative flex aspect-[4/5] w-full flex-col items-center gap-[6%] overflow-hidden rounded-xl pt-[12%] shadow-inner ring-1 ring-white/10" style={{ background: t.fond }}>
                  <span className="h-[18%] w-[26%] rounded-full" style={{ background: t.doux, opacity: 0.6 }} />
                  <span className="h-[5%] w-[44%] rounded-full" style={{ background: t.texte }} />
                  <span className="mt-[4%] h-[11%] w-[76%] rounded-full" style={{ background: t.vedette }} />
                  <span className="h-[11%] w-[76%] rounded-full" style={{ background: t.surface }} />
                  <span className="h-[11%] w-[76%] rounded-full" style={{ background: t.surface, opacity: 0.85 }} />
                </span>
                <span className="w-full truncate text-center text-[12.5px] text-white/75">{t.nom}</span>
              </button>
            </li>
          ))}
        </ul>
      </Carte>

      <Carte titre="Liens mis en avant" action={<span className="text-[13px] text-white/50">{NOMS_ANIMATIONS[reglages.animation].nom}</span>}>
        <p className="-mt-1 mb-3 text-[13px] leading-snug text-white/55">Le mouvement qui attire l’œil sur tes liens en avant. Un lien peut aussi choisir le sien.</p>
        <div className="lp lp-mini rounded-2xl p-2.5" style={variablesTheme(theme) as CSSProperties} data-bouton={reglages.bouton.style} data-forme={reglages.bouton.forme} data-police={theme.police}>
          <ul role="radiogroup" aria-label="Animation des liens mis en avant" className="grid grid-cols-2 gap-2">
            {ANIMATIONS.map(a => {
              const choisi = reglages.animation === a;
              return (
                <li key={a}>
                  <button type="button" role="radio" aria-checked={choisi} onClick={() => { vibrer(5); maj({ animation: a }); }}
                    className={`flex w-full flex-col gap-2 rounded-[18px] p-2 pb-2.5 text-left transition duration-200 ${choisi ? 'bg-white/[0.12] ring-2 ring-peche' : 'hover:bg-white/[0.06]'}`}>
                    <span className={`lp-carte ${a !== 'aucune' ? `lp-anim-${a}` : ''}`} style={{ minHeight: 52, justifyContent: 'center', alignItems: 'center', fontWeight: 600, fontSize: 15 }}>
                      {NOMS_ANIMATIONS[a].nom}
                    </span>
                    <span className="px-1 text-[12px] leading-snug" style={{ color: 'var(--doux)' }}>{NOMS_ANIMATIONS[a].aide}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </Carte>

      <Carte titre="Boutons">
        <div className="lp lp-mini rounded-2xl p-3" style={variablesTheme(theme) as CSSProperties} data-forme={reglages.bouton.forme} data-police={theme.police}>
          <ul className="grid grid-cols-1 gap-2.5">
            {STYLES.map(s => (
              <li key={s.id} data-bouton={s.id} className="lp-style">
                <button type="button" onClick={() => maj({ bouton: { ...reglages.bouton, style: s.id } })} aria-pressed={reglages.bouton.style === s.id}
                  className={`w-full rounded-[calc(var(--rc)+6px)] p-1.5 transition ${reglages.bouton.style === s.id ? 'ring-2 ring-peche' : ''}`}>
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
      </Carte>

      <Carte titre="Réseaux">
        <ul className="flex flex-col gap-2">
          {reglages.reseaux.map((r, i) => (
            <li key={r.reseau} className="flex items-center gap-2">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[0.07] text-white"><Icone nom={r.reseau} taille={20} /></span>
              <input className={`${classeSaisie} py-2.5`} value={r.url} aria-label={NOMS_RESEAUX[r.reseau]} placeholder={EXEMPLES[r.reseau]} inputMode={r.reseau === 'email' ? 'email' : 'url'} autoCapitalize="none"
                onChange={e => maj({ reseaux: reglages.reseaux.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
              <div className="flex shrink-0 flex-col">
                <button type="button" disabled={i === 0} aria-label="Monter" onClick={() => { const l = [...reglages.reseaux]; [l[i - 1], l[i]] = [l[i], l[i - 1]]; maj({ reseaux: l }); }} className="h-5 px-1.5 text-[11px] text-white/50 disabled:opacity-20">▲</button>
                <button type="button" disabled={i === reglages.reseaux.length - 1} aria-label="Descendre" onClick={() => { const l = [...reglages.reseaux]; [l[i + 1], l[i]] = [l[i], l[i + 1]]; maj({ reseaux: l }); }} className="h-5 px-1.5 text-[11px] text-white/50 disabled:opacity-20">▼</button>
              </div>
              <button type="button" aria-label={`Retirer ${NOMS_RESEAUX[r.reseau]}`} onClick={() => maj({ reseaux: reglages.reseaux.filter((_, j) => j !== i) })} className="grid h-10 w-9 shrink-0 place-items-center text-white/40 hover:text-white">✕</button>
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
      </Carte>
    </div>
  );
}
