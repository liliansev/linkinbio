import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Bloc, Reglages } from '../lib/types.ts';
import { ANIMATIONS_BLOC, idYoutube } from '../lib/types.ts';
import { RESEAUX } from '../lib/types.ts';
import { adresse } from '../lib/valider.ts';
import { themeParId, variablesTheme } from '../lib/themes.ts';
import { ICONES } from '../lib/icones.ts';
import { Icone, NOMS_RESEAUX, PICTOS } from '../components/Icone.tsx';
import { BlocPublic } from '../components/PageLiens.tsx';
import { BoutonPrincipal, Champ, Feuille, Interrupteur, NOMS_ANIMATIONS, classeSaisie, preparerImage, vibrer } from './ui.tsx';
import { TYPES } from './OngletLiens.tsx';

/** Une date ISO vers la valeur d'un `<input type="datetime-local">`, en heure locale. */
const versLocal = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const depuisLocal = (v: string) => (v ? new Date(v).toISOString() : '');

export function EditeurBloc({ bloc, reglages, nouveau, onFermer, onEnregistrer, onSupprimer, onDupliquer, envoyerImage, clics }: {
  bloc: Bloc | null;
  reglages: Reglages;
  nouveau: boolean;
  onFermer: () => void;
  onEnregistrer: (bloc: Bloc) => void;
  onSupprimer: (bloc: Bloc) => void;
  onDupliquer: (bloc: Bloc) => void;
  envoyerImage: (dataUrl: string) => Promise<string>;
  clics: number;
}) {
  const [b, setB] = useState<Bloc | null>(bloc);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [plus, setPlus] = useState(false);
  const fichier = useRef<HTMLInputElement>(null);
  useEffect(() => { setB(bloc); setErreur(''); setPlus(!!bloc && (!!bloc.debut || !!bloc.fin)); }, [bloc]);
  if (!b) return null;
  const maj = (champs: Partial<Bloc>) => setB({ ...b, ...champs });
  const type = TYPES.find(t => t.type === b.type)!;
  const avecUrl = b.type === 'lien' || b.type === 'video';

  /** Vérifie le bloc ; renvoie la version à enregistrer, ou rien si un champ manque. */
  function valider(): Bloc | null {
    if (!b) return null;
    const url = adresse(b.url);
    if (b.type === 'lien' && !url) { setErreur('Indique l’adresse du lien.'); return null; }
    if (b.type === 'video' && !idYoutube(url)) { setErreur('Colle l’adresse d’une vidéo YouTube.'); return null; }
    if ((b.type === 'titre' || b.type === 'texte') && !b.titre.trim()) { setErreur('Écris le texte du bloc.'); return null; }
    return { ...b, url };
  }
  const theme = themeParId(reglages.theme);
  const nomAuto = 'Par défaut';

  async function choisirImage(f: File | undefined) {
    if (!f) return;
    setEnvoi(true); setErreur('');
    try { maj({ image: await envoyerImage(await preparerImage(f, b!.vedette ? 'large' : 'carre')) }); }
    catch { setErreur('L’image n’est pas passée. Essaie une autre photo.'); }
    finally { setEnvoi(false); if (fichier.current) fichier.current.value = ''; }
  }

  return (
    <Feuille ouverte onFermer={onFermer} titre={nouveau ? `Nouveau : ${type.nom.toLowerCase()}` : type.nom}
      pied={fermer => (
        <div className="flex items-center gap-2">
          {!nouveau && (
            <>
              <button type="button" onClick={() => fermer(() => onSupprimer(b))} className="grid h-12 w-12 place-items-center rounded-full bg-red-500/[0.08] text-red-300 transition hover:bg-red-500/15 active:scale-90" aria-label="Supprimer">
                <Icone nom="ui-corbeille" taille={20} />
              </button>
              <button type="button" onClick={() => onDupliquer(b)} className="grid h-12 w-12 place-items-center rounded-full bg-white/[0.06] text-white/70 transition hover:bg-white/10 active:scale-90" aria-label="Dupliquer">
                <Icone nom="ui-copier" taille={20} />
              </button>
            </>
          )}
          <BoutonPrincipal className="flex-1" disabled={envoi} onClick={() => { const v = valider(); if (v) { vibrer(12); fermer(() => onEnregistrer(v)); } }}>
            {nouveau ? 'Ajouter à ma page' : 'Enregistrer'}
          </BoutonPrincipal>
        </div>
      )}>
      <div className="flex flex-col gap-4 pt-1">
        {b.type === 'lien' && (
          <div className="lp lp-mini -mx-1 rounded-[20px] p-4 ring-1 ring-white/[0.06]" style={variablesTheme(theme) as CSSProperties}
            data-bouton={reglages.bouton.style} data-forme={reglages.bouton.forme} data-police={theme.police} aria-label="Aperçu du bouton">
            <div className="pointer-events-none" inert>
              <BlocPublic bloc={{ ...b, url: b.url || '#', titre: b.titre || 'Texte du bouton', public: true }} reglages={reglages} clic={() => {}} cible={{}} apercu />
            </div>
          </div>
        )}
        {erreur && <p role="alert" className="rounded-xl bg-red-500/15 px-3.5 py-2.5 text-[14px] text-red-200">{erreur}</p>}

        {avecUrl && (
          <Champ label={b.type === 'video' ? 'Adresse de la vidéo YouTube' : 'Adresse'}>
            <input className={classeSaisie} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder={b.type === 'video' ? 'https://youtu.be/…' : 'https://…'}
              value={b.url} onChange={e => maj({ url: e.target.value })} autoFocus={nouveau} />
          </Champ>
        )}

        {b.type !== 'derniere-video' && (
          <Champ label={b.type === 'lien' ? 'Texte du bouton' : b.type === 'texte' ? 'Texte' : 'Titre'}>
            {b.type === 'texte'
              ? <textarea className={`${classeSaisie} min-h-28`} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={1000} autoFocus={nouveau} />
              : <input className={classeSaisie} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={160} placeholder={b.type === 'lien' ? 'Mon super lien' : ''} autoFocus={nouveau && !avecUrl} />}
          </Champ>
        )}
        {b.type === 'derniere-video' && (
          <Champ label="Petit titre au-dessus" aide="La vidéo elle-même change toute seule à chaque nouvelle publication sur la chaîne.">
            <input className={classeSaisie} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={160} />
          </Champ>
        )}

        {(b.type === 'lien' || b.type === 'newsletter') && (
          <Champ label="Sous-titre (facultatif)">
            <input className={classeSaisie} value={b.sousTitre} onChange={e => maj({ sousTitre: e.target.value })} maxLength={240} />
          </Champ>
        )}

        {b.type === 'lien' && (
          <>
            <div>
              <span className="mb-1.5 flex items-baseline justify-between text-[13px] font-medium text-white/70">
                Icône{b.icone && <span className="font-normal text-white/45">{NOMS_RESEAUX[b.icone] ?? PICTOS.find(p => p.nom === b.icone)?.libelle ?? ''}</span>}
              </span>
              <div role="radiogroup" aria-label="Icône" className="grid max-h-[176px] grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1.5 overflow-y-auto rounded-2xl bg-white/[0.035] p-2 [scrollbar-width:thin]">
                {[{ nom: '', libelle: 'Sans icône' }, ...RESEAUX.map(r => ({ nom: r as string, libelle: NOMS_RESEAUX[r] })), ...PICTOS].map(p => {
                  const choisi = b.icone === p.nom;
                  return (
                    <button key={p.nom || 'sans'} type="button" role="radio" aria-checked={choisi} aria-label={p.libelle} title={p.libelle} onClick={() => { vibrer(4); maj({ icone: p.nom }); }}
                      className={`grid aspect-square place-items-center rounded-xl transition duration-150 active:scale-90 ${choisi ? 'bg-peche text-nuit' : 'text-white/80 hover:bg-white/[0.08]'}`}>
                      <Icone nom={p.nom || 'ui-aucun'} taille={20} />
                    </button>
                  );
                })}
                {b.icone && !ICONES[b.icone] && <span className="grid aspect-square place-items-center rounded-xl bg-peche text-xl" aria-label="Emoji actuel">{b.icone}</span>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {b.image ? <img src={b.image} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <span className="grid h-14 w-14 place-items-center rounded-xl border border-dashed border-white/20 text-white/35"><Icone nom="ui-image" taille={22} /></span>}
              <div className="flex flex-1 flex-wrap gap-2">
                <button type="button" onClick={() => fichier.current?.click()} disabled={envoi} className="min-h-10 rounded-full bg-white/[0.08] px-4 text-[14px] font-medium text-white hover:bg-white/[0.13]">{envoi ? 'Envoi…' : b.image ? 'Changer l’image' : 'Ajouter une image'}</button>
                {b.image && <button type="button" onClick={() => maj({ image: '' })} className="min-h-10 rounded-full px-3 text-[14px] text-white/55 hover:text-white">Retirer</button>}
              </div>
              <input ref={fichier} type="file" accept="image/*" hidden onChange={e => choisirImage(e.target.files?.[0])} />
            </div>
          </>
        )}

        <div className="divide-y divide-white/[0.06] rounded-2xl bg-white/[0.035] px-4">
          <Interrupteur label="Public" aide={b.public ? 'Visible sur ta page.' : 'Privé : gardé ici, invisible sur ta page.'} actif={b.public} onChange={v => maj({ public: v })} />
          {b.type !== 'titre' && b.type !== 'texte' && b.type !== 'newsletter' && (
            <Interrupteur label="Mis en avant" aide="Une grande carte, plus visible que les autres." actif={b.vedette} onChange={v => maj({ vedette: v })} />
          )}
          {b.type === 'lien' && (
            <Interrupteur label="Visible par Google" aide={b.indexable ? 'Lien suivi par les moteurs de recherche.' : 'Lien en nofollow, exclu des extraits et des données structurées.'} actif={b.indexable} onChange={v => maj({ indexable: v })} />
          )}
        </div>

        {b.type === 'lien' && (
          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-white/70">Animation pour attirer l’œil</span>
            <div role="radiogroup" aria-label="Animation" className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
              {ANIMATIONS_BLOC.map(a => (
                <button key={a} type="button" role="radio" aria-checked={b.animation === a} onClick={() => { vibrer(4); maj({ animation: a }); }}
                  className={`min-h-10 shrink-0 rounded-full px-4 text-[14px] font-medium transition duration-150 active:scale-95 ${b.animation === a ? 'bg-white text-nuit' : 'bg-white/[0.07] text-white/70 hover:text-white'}`}>
                  {a === 'auto' ? nomAuto : NOMS_ANIMATIONS[a].nom}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[12.5px] leading-snug text-white/45">
              {b.animation === 'auto' ? (b.vedette ? `Comme tous les liens mis en avant : ${NOMS_ANIMATIONS[reglages.animation].nom.toLowerCase()} (à changer dans Apparence).` : 'Immobile, sauf si tu mets ce lien en avant.') : NOMS_ANIMATIONS[b.animation].aide}
            </p>
          </div>
        )}

        <button type="button" onClick={() => setPlus(!plus)} aria-expanded={plus} className="flex min-h-11 items-center justify-between rounded-xl px-1 text-[14px] font-medium text-white/70">
          <span className="flex items-center gap-2"><Icone nom="ui-horloge" taille={17} />Programmer l’affichage</span>
          <Icone nom="ui-chevron" taille={18} className={`transition-transform duration-300 ${plus ? 'rotate-180' : ''}`} />
        </button>
        {plus && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ label="Afficher à partir du">
              <input type="datetime-local" className={classeSaisie} value={versLocal(b.debut)} onChange={e => maj({ debut: depuisLocal(e.target.value) })} />
            </Champ>
            <Champ label="Masquer à partir du">
              <input type="datetime-local" className={classeSaisie} value={versLocal(b.fin)} onChange={e => maj({ fin: depuisLocal(e.target.value) })} />
            </Champ>
            {(b.debut || b.fin) && <button type="button" onClick={() => maj({ debut: '', fin: '' })} className="text-left text-[13px] text-white/55 underline">Retirer la programmation</button>}
          </div>
        )}

        {!nouveau && b.type === 'lien' && <p className="text-center text-[13px] text-white/45">{clics} clic{clics > 1 ? 's' : ''} ces 30 derniers jours</p>}
      </div>
    </Feuille>
  );
}
