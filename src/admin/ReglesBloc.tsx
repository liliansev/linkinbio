import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Acces, Bloc, Langue, Preuve, Traduction } from '../lib/types.ts';
import type { Creneau } from '../lib/moments.ts';
import { FUSEAU_DEFAUT, decrireCreneau } from '../lib/moments.ts';
import { Icone } from '../components/Icone.tsx';
import { NOMS_AUDIENCES, RESEAUX_SOCIAUX, basculerPour, deReseau, enTetePour } from '../lib/provenance.ts';
import type { Audience } from '../lib/provenance.ts';
import { Bascule, Champ, Interrupteur, Segments, classeSaisie, vibrer } from './ui.tsx';

/*
 * Les règles d'un bloc, rangées sous la feuille d'édition : chacune se replie
 * et ne s'ouvre d'elle-même que si elle est réglée.
 */

/** Une date ISO vers la valeur d'un `<input type="datetime-local">`, en heure locale. */
const versLocal = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const depuisLocal = (v: string) => (v ? new Date(v).toISOString() : '');

/** Une section qui se replie, avec un résumé de ce qui est réglé. */
export function Repli({ titre, icone, resume, ouvert: depart, children }: { titre: string; icone: string; resume?: string; ouvert: boolean; children: ReactNode }) {
  const [ouvert, setOuvert] = useState(depart);
  return (
    <div className="adm-groupe">
      <button type="button" onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert} className="flex min-h-12 w-full items-center gap-2.5 px-4 text-left text-[14.5px] font-medium text-white/85">
        <Icone nom={icone} taille={17} />
        <span className="shrink-0">{titre}</span>
        {/* Ce qui est réglé se lit à droite, comme une valeur, jamais en sous-titre sous le nom. */}
        <span className="min-w-0 flex-1 truncate text-right text-[13px] font-normal text-white/55">{!ouvert && resume}</span>
        <Icone nom="ui-chevron" taille={18} className={`shrink-0 transition-transform duration-300 ${ouvert ? 'rotate-180' : ''}`} />
      </button>
      {ouvert && <div className="flex flex-col gap-3 px-4 pb-4">{children}</div>}
    </div>
  );
}

/** Les langues nommées en français, comme dans Réglages > Langues. */
export const LANGUES_FR = { en: 'Anglais', es: 'Espagnol', de: 'Allemand', it: 'Italien' } as const;

const JOURS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
const NOMS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const fuseauNavigateur = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || FUSEAU_DEFAUT; } catch { return FUSEAU_DEFAUT; } };

/** Quand le bloc s'affiche : des dates, un compte à rebours, un créneau qui revient chaque semaine. */
export function RegleMoment({ b, maj, erreur }: { b: Bloc; maj: (c: Partial<Bloc>) => void; erreur?: string }) {
  const c = b.creneau;
  const majCreneau = (champs: Partial<Creneau>) => maj({ creneau: { ...(c ?? { jours: [1, 2, 3, 4, 5], de: '09:00', a: '12:00', fuseau: fuseauNavigateur(), effet: 'afficher' }), ...champs, fuseau: fuseauNavigateur() } });
  const resume = [b.debut || b.fin ? 'Dates' : '', b.compteARebours && b.debut ? 'compte à rebours' : '', c ? decrireCreneau(c) : ''].filter(Boolean).join(', ');
  return (
    <Repli key={erreur ? 'erreur' : 'calme'} titre="Quand l’afficher" icone="ui-horloge" resume={resume || 'Toujours'} ouvert={!!(b.debut || b.fin || c || erreur)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ label="À partir du">
          <input type="datetime-local" className={classeSaisie} value={versLocal(b.debut)} onChange={e => maj({ debut: depuisLocal(e.target.value) })} />
        </Champ>
        <Champ label="Jusqu’au" erreur={erreur}>
          <input id="bloc-fin" type="datetime-local" className={classeSaisie} min={versLocal(b.debut) || undefined} value={versLocal(b.fin)} onChange={e => maj({ fin: depuisLocal(e.target.value) })} />
        </Champ>
      </div>
      {b.type === 'lien' && b.debut && (
        <Interrupteur label="Compte à rebours avant l’ouverture" aide="Le lien s’annonce avec le temps qui reste, sans dévoiler son adresse. Parfait pour un lancement." actif={b.compteARebours} onChange={v => maj({ compteARebours: v })} />
      )}
      {(b.debut || b.fin) && <button type="button" onClick={() => maj({ debut: '', fin: '', compteARebours: false })} className="self-start text-[13px] text-white/55 underline">Retirer les dates</button>}

      <div className="border-t border-white/[0.06] pt-3">
        <span className="mb-1.5 block text-[13px] font-medium text-white/70">Chaque semaine</span>
        <div role="group" aria-label="Jours" className="grid grid-cols-7 gap-0.5 rounded-[10px] bg-white/[0.05] p-[3px]">
          {JOURS.map((j, i) => {
            const actif = !!c?.jours.includes(i + 1);
            return (
              <button key={i} type="button" aria-pressed={actif} aria-label={NOMS[i]} onClick={() => {
                vibrer(4);
                const jours = actif ? c!.jours.filter(n => n !== i + 1) : [...(c?.jours ?? []), i + 1];
                if (!jours.length) maj({ creneau: null }); else majCreneau({ jours: jours.sort() });
              }} className={`min-h-11 rounded-[7px] text-[14px] font-semibold transition duration-200 active:scale-95 ${actif ? 'bg-white text-nuit' : 'text-white/55 hover:text-white'}`}>{j}</button>
            );
          })}
        </div>
        {c ? (
          <div className="mt-3 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Champ label="De"><input type="time" className={classeSaisie} value={c.de} onChange={e => e.target.value && majCreneau({ de: e.target.value })} /></Champ>
              <Champ label="À"><input type="time" className={classeSaisie} value={c.a} onChange={e => e.target.value && majCreneau({ a: e.target.value })} /></Champ>
            </div>
            <Segments label="Ce que fait le créneau" valeur={c.effet} onChange={effet => majCreneau({ effet })}
              options={[{ id: 'afficher', nom: 'Seulement à ces heures' }, { id: 'avant', nom: 'En tête à ces heures' }]} />
            <p className="text-[12.5px] leading-snug text-white/50">
              {c.effet === 'avant' ? `Ce bloc passe en tête de ta page, mis en avant, ${decrireCreneau(c)}.` : `Ce bloc n’apparaît que ${decrireCreneau(c)}.`} Heure de {c.fuseau.split('/').pop()?.replace(/_/g, ' ')}.
            </p>
          </div>
        ) : <p className="mt-1.5 text-[12.5px] leading-snug text-white/55">Choisis des jours : par exemple « Réserver » en tête en semaine le matin, « Mon live » le dimanche soir.</p>}
      </div>
    </Repli>
  );
}

/** Sur quels réseaux le bloc s'affiche (tout coché par défaut), et pour lesquels il passe en tête. */
export function RegleReseaux({ b, maj, reseaux }: { b: Bloc; maj: (c: Partial<Bloc>) => void; reseaux: Audience[] }) {
  const cache = b.cache ?? [];
  const reserve = b.audience?.effet === 'seulement' ? b.audience.sources : null;
  const visible = (s: Audience) => !cache.includes(s) && (!reserve || reserve.includes(s));
  const tete = (s: Audience) => b.audience?.effet === 'avant' && b.audience.sources.includes(s);
  const autres = RESEAUX_SOCIAUX.filter(s => !reseaux.includes(s));
  const [plus, setPlus] = useState(() => autres.some(s => !visible(s) || tete(s)));
  const liste = plus ? [...reseaux, ...autres] : reseaux;
  const tous = [...reseaux, ...autres];
  const caches = tous.filter(s => !visible(s));
  const enTete = tous.filter(tete);
  const noms = (l: Audience[]) => l.map(s => NOMS_AUDIENCES[s]).join(', ');
  const resume = [caches.length ? `Pas sur ${noms(caches)}` : 'Partout', enTete.length ? `en tête sur ${noms(enTete)}` : ''].filter(Boolean).join(', ');
  const [premier, setPremier] = useState(enTete.length > 0);
  return (
    <Repli titre="Afficher sur" icone="cible" resume={resume} ouvert={false}>
      <p className="text-[12.5px] leading-snug text-white/55">Coupe un réseau : ceux qui arrivent de là ne verront pas ce bloc. Les autres le voient toujours.</p>
      <ul className="-my-1 divide-y divide-white/[0.06]" aria-label="Réseaux où ce bloc s’affiche">
        {liste.map(s => {
          const vu = visible(s);
          return (
            <li key={s} className="flex min-h-12 items-center gap-3">
              <span className="flex w-4 justify-center text-white/75">{ICONE_AUDIENCE[s] && <Icone nom={ICONE_AUDIENCE[s]} taille={16} />}</span>
              <span className="flex-1 text-[14.5px] font-medium text-white">{NOMS_AUDIENCES[s]}</span>
              <Bascule actif={vu} label={`Afficher sur ${NOMS_AUDIENCES[s]}`} onClick={() => { vibrer(); maj(basculerPour({ ...b, ...(vu ? enTetePour(b, s, false) : {}) }, s, !vu)); }} />
            </li>
          );
        })}
      </ul>
      {!plus && autres.length > 0 && (
        <button type="button" onClick={() => setPlus(true)} className="inline-flex min-h-11 items-center gap-1.5 self-start text-[14px] font-medium text-white/80 hover:text-white"><Icone nom="ui-plus" taille={15} />Autres réseaux</button>
      )}
      {!reserve && (
        <div className="border-t border-white/[0.06] pt-1">
          {/* Le même rang que la liste du dessus (picto, nom, interrupteur), replié tant qu'on ne s'en sert pas. */}
          <button type="button" onClick={() => setPremier(!premier)} aria-expanded={premier}
            className="flex min-h-12 w-full items-center gap-3 text-left text-[14.5px] font-medium text-white">
            <span className="flex w-4 justify-center text-white/75"><Icone nom="drapeau" taille={16} /></span>
            <span className="flex-1">En tête de ta page pour</span>
            <span className="min-w-0 truncate text-[13px] font-normal text-white/55">{!premier && (enTete.length ? noms(enTete) : 'Aucun réseau')}</span>
            <Icone nom="ui-chevron" taille={18} className={`shrink-0 text-white/75 transition-transform duration-300 ${premier ? 'rotate-180' : ''}`} />
          </button>
          {premier && <p className="-mt-1 mb-1 text-[12.5px] leading-snug text-white/55">Ce bloc passe en tête de ta page pour ceux qui arrivent de ces réseaux.</p>}
          {premier && (
            <ul className="-mt-1 divide-y divide-white/[0.06]" aria-label="En tête pour ces visiteurs">
              {liste.filter(visible).map(s => (
                <li key={s} className="flex min-h-12 items-center gap-3">
                  <span className="flex w-4 justify-center text-white/75">{ICONE_AUDIENCE[s] && <Icone nom={ICONE_AUDIENCE[s]} taille={16} />}</span>
                  <span className="flex-1 text-[14.5px] font-medium text-white">{NOMS_AUDIENCES[s]}</span>
                  <Bascule actif={tete(s)} label={`En tête pour ceux qui viennent ${deReseau(s)}`} onClick={() => { vibrer(4); maj(enTetePour(b, s, !tete(s))); }} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Repli>
  );
}

const ICONE_AUDIENCE: Partial<Record<Audience, string>> = { instagram: 'instagram', tiktok: 'tiktok', youtube: 'youtube', linkedin: 'linkedin', x: 'x', facebook: 'facebook', threads: 'threads', snapchat: 'snapchat', qr: 'qr', newsletter: 'courrier', email: 'email', google: 'google' };

/** Le petit titre par défaut d'un bloc d'avis : il n'a de sens que pour une note. */
const TITRE_AVIS = 'Ce qu’ils en disent';

/** Le mode drop : un code à taper, des places comptées, ou les deux. */
export function RegleAcces({ b, maj, prises }: { b: Bloc; maj: (c: Partial<Bloc>) => void; prises: number }) {
  const a = b.acces;
  const majAcces = (champs: Partial<Acces>) => {
    const suite = { code: a?.code ?? '', places: a?.places ?? 0, ...champs };
    maj({ acces: suite.code || suite.places ? suite : null });
  };
  const resume = a ? [a.code ? `code « ${a.code} »` : '', a.places ? `${prises}/${a.places} places prises` : ''].filter(Boolean).join(', ') : '';
  return (
    <Repli titre="Accès réservé" icone="cadenas" resume={resume || 'Ouvert à tous'} ouvert={!!a}>
      <p className="text-[13px] leading-snug text-white/55">L’adresse du lien n’est jamais dans ta page : elle ne s’ouvre qu’avec le bon code, ou pour les premiers arrivés.</p>
      <Champ label="Code à taper (facultatif)" aide="Donne-le en story, en live ou dans ta newsletter. Majuscules et espaces ne comptent pas.">
        <input className={classeSaisie} value={a?.code ?? ''} maxLength={40} autoCapitalize="characters" autoComplete="off" spellCheck={false}
          placeholder="VIP2026" onChange={e => majAcces({ code: e.target.value })} />
      </Champ>
      <Champ label="Nombre de places (facultatif)" aide={a?.places ? `${prises} prise${prises > 1 ? 's' : ''} pour l’instant. Ta page affiche « Plus que 3 places », puis « Complet ».` : 'Vide : pas de limite. Une place par personne.'}>
        <input className={classeSaisie} type="number" inputMode="numeric" min={0} max={100000} value={a?.places || ''} placeholder="Sans limite"
          onChange={e => majAcces({ places: Math.max(0, Math.min(100_000, Math.round(Number(e.target.value) || 0))) })} />
      </Champ>
      {a && <button type="button" onClick={() => { vibrer(6); maj({ acces: null }); }} className="self-start text-[13.5px] font-medium text-white/55 hover:text-white">Retirer l’accès réservé</button>}
    </Repli>
  );
}

/** Le texte du bloc dans les langues que la page propose. */
export function RegleTraductions({ b, maj, langues, ouvert = false }: { b: Bloc; maj: (c: Partial<Bloc>) => void; langues: Langue[]; ouvert?: boolean }) {
  if (!langues.length) return null;
  const champs: { cle: keyof Traduction; label: string; long?: boolean }[] = b.type === 'preuve' && b.preuve?.genre === 'temoignage'
    ? [{ cle: 'description', label: 'Témoignage', long: true }, { cle: 'sousTitre', label: 'Qui le dit' }]
    : [{ cle: 'titre', label: b.type === 'lien' ? 'Texte du bouton' : b.type === 'texte' ? 'Texte' : 'Titre', long: b.type === 'texte' },
      ...(['lien', 'newsletter', 'inscription'].includes(b.type) ? [{ cle: 'sousTitre' as const, label: 'Sous-titre' }] : []),
      ...(b.type === 'lien' && b.vedette ? [{ cle: 'description' as const, label: 'Description', long: true }] : [])];
  const traduites = langues.filter(l => b.traductions[l]);
  const majLangue = (l: Langue, cle: keyof Traduction, v: string) => {
    const t = { titre: '', sousTitre: '', description: '', ...b.traductions[l], [cle]: v };
    const suite = { ...b.traductions };
    if (t.titre || t.sousTitre || t.description) suite[l] = t; else delete suite[l];
    maj({ traductions: suite });
  };
  return (
    <Repli titre="Traductions" icone="globe" resume={traduites.length === langues.length ? 'Tout est traduit' : `À traduire : ${langues.filter(l => !b.traductions[l]).map(l => LANGUES_FR[l]).join(', ')}`} ouvert={ouvert}>
      {langues.map(l => (
        <div key={l} className="flex flex-col gap-2.5 border-t border-white/[0.06] pt-3">
          <span className="text-[13px] font-semibold text-white/80">{LANGUES_FR[l]}</span>
          {champs.map(c => (
            <Champ key={c.cle} label={c.label}>
              {c.long
                ? <textarea className={`${classeSaisie} min-h-20`} lang={l} value={b.traductions[l]?.[c.cle] ?? ''} placeholder={b[c.cle]} onChange={e => majLangue(l, c.cle, e.target.value)} />
                : <input className={classeSaisie} lang={l} value={b.traductions[l]?.[c.cle] ?? ''} placeholder={b[c.cle]} onChange={e => majLangue(l, c.cle, e.target.value)} />}
            </Champ>
          ))}
        </div>
      ))}
      <p className="text-[12.5px] leading-snug text-white/55">Un champ vide garde le texte en français.</p>
    </Repli>
  );
}

const SOURCES_PREUVE = ['Google', 'Trustpilot', 'Malt', 'Avis Vérifiés', 'YouTube', 'Instagram', 'TikTok', 'LinkedIn'];

/** Un avis, un chiffre, un témoignage : ce que le bloc `preuve` montre. */
export function ChampsPreuve({ b, maj, erreurDe = () => undefined }: { b: Bloc; maj: (c: Partial<Bloc>) => void; erreurDe?: (champ: string) => string | undefined }) {
  const p = b.preuve ?? { genre: 'note' as const, note: 0, nombre: 0, source: '' };
  const majP = (champs: Partial<Preuve>) => maj({ preuve: { ...p, ...champs } });
  // La note se tape comme on l'écrit (« 4,8 ») et ne se lit qu'en quittant le champ : rien ne s'arrondit sous les doigts.
  const [note, setNote] = useState(p.note ? String(p.note).replace('.', ',') : '');
  const [trop, setTrop] = useState(false);
  const lireNote = (v: string) => { const n = Math.round(Number(v.replace(',', '.')) * 10) / 10; return Number.isFinite(n) ? Math.max(0, n) : 0; };
  return (
    <>
      <div>
        <span className="mb-1.5 block text-[13px] font-medium text-white/70">Type de preuve</span>
        <Segments label="Genre de preuve" valeur={p.genre} onChange={genre => maj({ preuve: { ...p, genre }, ...(genre !== 'note' && b.titre === TITRE_AVIS ? { titre: '' } : genre === 'note' && !b.titre.trim() ? { titre: TITRE_AVIS } : {}) })}
          options={[{ id: 'note', nom: 'Note' }, { id: 'compteur', nom: 'Chiffre' }, { id: 'temoignage', nom: 'Témoignage' }]} />
      </div>
      {p.genre === 'note' && (
        // Le petit titre se lit au-dessus de la note : il se tape juste après le type.
        <Champ erreur={erreurDe('titre')} label="Petit titre (facultatif)">
          <input id="bloc-titre" className={classeSaisie} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={160} />
        </Champ>
      )}
      {p.genre === 'note' && (
        <div className="grid grid-cols-2 gap-3">
          <Champ label="Note sur 5" erreur={erreurDe('note') ?? (trop ? 'La note va de 0 à 5. Sur 10, divise-la par deux.' : undefined)}>
            <input className={classeSaisie} type="text" inputMode="decimal" value={note} placeholder="Ex. 4,8"
              onChange={e => { const v = e.target.value.replace(/[^\d.,]/g, '').slice(0, 4); setNote(v); setTrop(false); majP({ note: lireNote(v) }); }}
              onBlur={() => { const n = lireNote(note); setNote(n ? String(n).replace('.', ',') : ''); setTrop(n > 5); }} />
          </Champ>
          <Champ label="Nombre d’avis" erreur={erreurDe('nombre')}>
            <input className={classeSaisie} type="number" inputMode="numeric" min={0} value={p.nombre || ''} placeholder="Ex. 132"
              onChange={e => majP({ nombre: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
          </Champ>
        </div>
      )}
      {p.genre === 'compteur' && (
        <Champ label="Le chiffre" erreur={erreurDe('nombre')}>
          <input className={classeSaisie} type="number" inputMode="numeric" min={0} value={p.nombre || ''} placeholder="Ex. 12400"
            onChange={e => majP({ nombre: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
        </Champ>
      )}
      {p.genre === 'compteur' && (
        // Ce que compte le chiffre, juste sous lui : les deux se lisent ensemble sur la page.
        <Champ erreur={erreurDe('titre')} label="Ce que compte ce chiffre">
          <input id="bloc-titre" className={classeSaisie} value={b.titre} onChange={e => maj({ titre: e.target.value })} maxLength={160} placeholder="abonnés sur YouTube" />
        </Champ>
      )}
      {p.genre === 'temoignage' && (
        <>
          <Champ label="Le témoignage" erreur={erreurDe('description')}>
            <textarea className={`${classeSaisie} min-h-24`} value={b.description} maxLength={400} onChange={e => maj({ description: e.target.value })}
              placeholder="« Grâce à Camille, j’ai lancé ma boutique en deux semaines. »" />
          </Champ>
          <Champ label="Qui le dit">
            <input className={classeSaisie} value={b.sousTitre} maxLength={240} onChange={e => maj({ sousTitre: e.target.value })} placeholder="Marie, fondatrice de Bloom" />
          </Champ>
        </>
      )}
      <Champ label={p.genre === 'note' ? 'Où sont publiés les avis' : p.genre === 'compteur' ? 'Source (facultatif)' : 'Où l’avis a été donné (facultatif)'} erreur={erreurDe('source')}>
        {/* Les sources courantes en suggestions du champ, plutôt qu'une rangée de pastilles. */}
        <input className={classeSaisie} value={p.source} maxLength={30} onChange={e => majP({ source: e.target.value })} placeholder={p.genre === 'compteur' ? 'Ex. YouTube' : 'Ex. Google'} list="sources-preuve" />
      </Champ>
      <datalist id="sources-preuve">{SOURCES_PREUVE.map(s => <option key={s} value={s} />)}</datalist>
    </>
  );
}
