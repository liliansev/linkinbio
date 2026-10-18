import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Acces, Bloc, Langue, Preuve, Traduction } from '../lib/types.ts';
import { NOMS_LANGUES } from '../lib/langues.ts';
import type { Creneau } from '../lib/moments.ts';
import { FUSEAU_DEFAUT, decrireCreneau } from '../lib/moments.ts';
import { Icone } from '../components/Icone.tsx';
import { NOMS_AUDIENCES, RESEAUX_SOCIAUX, basculerPour, enTetePour } from '../lib/provenance.ts';
import type { Audience } from '../lib/provenance.ts';
import { Champ, Interrupteur, Segments, classeSaisie, vibrer } from './ui.tsx';

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
    <div className="rounded-2xl bg-white/[0.035]">
      <button type="button" onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert} className="flex min-h-12 w-full items-center gap-2.5 px-4 text-left text-[14.5px] font-medium text-white/85">
        <Icone nom={icone} taille={17} />
        <span className="min-w-0 flex-1">
          {titre}
          {resume && !ouvert && <span className="block truncate text-[12.5px] font-normal text-white/75">{resume}</span>}
        </span>
        <Icone nom="ui-chevron" taille={18} className={`shrink-0 transition-transform duration-300 ${ouvert ? 'rotate-180' : ''}`} />
      </button>
      {ouvert && <div className="flex flex-col gap-3 px-4 pb-4">{children}</div>}
    </div>
  );
}

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const NOMS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const fuseauNavigateur = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || FUSEAU_DEFAUT; } catch { return FUSEAU_DEFAUT; } };

/** Quand le bloc s'affiche : des dates, un compte à rebours, un créneau qui revient chaque semaine. */
export function RegleMoment({ b, maj }: { b: Bloc; maj: (c: Partial<Bloc>) => void }) {
  const c = b.creneau;
  const majCreneau = (champs: Partial<Creneau>) => maj({ creneau: { ...(c ?? { jours: [1, 2, 3, 4, 5], de: '09:00', a: '12:00', fuseau: fuseauNavigateur(), effet: 'avant' }), ...champs, fuseau: fuseauNavigateur() } });
  const resume = [b.debut || b.fin ? 'Dates' : '', b.compteARebours && b.debut ? 'compte à rebours' : '', c ? decrireCreneau(c) : ''].filter(Boolean).join(', ');
  return (
    <Repli titre="Quand l’afficher" icone="ui-horloge" resume={resume} ouvert={!!(b.debut || b.fin || c)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ label="À partir du">
          <input type="datetime-local" className={classeSaisie} value={versLocal(b.debut)} onChange={e => maj({ debut: depuisLocal(e.target.value) })} />
        </Champ>
        <Champ label="Jusqu’au">
          <input type="datetime-local" className={classeSaisie} value={versLocal(b.fin)} onChange={e => maj({ fin: depuisLocal(e.target.value) })} />
        </Champ>
      </div>
      {b.type === 'lien' && b.debut && (
        <Interrupteur label="Compte à rebours avant l’ouverture" aide="Le lien s’annonce avec le temps qui reste, sans dévoiler son adresse. Parfait pour un lancement." actif={b.compteARebours} onChange={v => maj({ compteARebours: v })} />
      )}
      {(b.debut || b.fin) && <button type="button" onClick={() => maj({ debut: '', fin: '', compteARebours: false })} className="self-start text-[13px] text-white/55 underline">Retirer les dates</button>}

      <div className="border-t border-white/[0.06] pt-3">
        <span className="mb-1.5 block text-[13px] font-medium text-white/70">Chaque semaine</span>
        <div role="group" aria-label="Jours" className="grid grid-cols-7 gap-1.5">
          {JOURS.map((j, i) => {
            const actif = !!c?.jours.includes(i + 1);
            return (
              <button key={i} type="button" aria-pressed={actif} aria-label={NOMS[i]} onClick={() => {
                vibrer(4);
                const jours = actif ? c!.jours.filter(n => n !== i + 1) : [...(c?.jours ?? []), i + 1];
                if (!jours.length) maj({ creneau: null }); else majCreneau({ jours: jours.sort() });
              }} className={`grid aspect-square place-items-center rounded-full text-[14px] font-semibold transition active:scale-90 ${actif ? 'bg-white text-nuit' : 'bg-white/[0.07] text-white/70'}`}>{j}</button>
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
              options={[{ id: 'avant', nom: 'Mis en avant' }, { id: 'afficher', nom: 'Visible seulement' }]} />
            <p className="text-[12.5px] leading-snug text-white/50">
              {c.effet === 'avant' ? `Ce bloc passe en tête de ta page, mis en avant, ${decrireCreneau(c)}.` : `Ce bloc n’apparaît que ${decrireCreneau(c)}.`} Heure de {c.fuseau.split('/').pop()?.replace(/_/g, ' ')}.
            </p>
          </div>
        ) : <p className="mt-1.5 text-[12.5px] leading-snug text-white/45">Choisis des jours : par exemple « Réserver » mis en avant en semaine le matin, « Mon live » le dimanche soir.</p>}
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
  return (
    <Repli titre="Afficher sur" icone="cible" resume={resume} ouvert={false}>
      <ul className="-my-1 divide-y divide-white/[0.06]" aria-label="Réseaux où ce bloc s’affiche">
        {liste.map(s => {
          const vu = visible(s);
          return (
            <li key={s} className="flex min-h-12 items-center gap-3">
              <span className="flex w-4 justify-center text-white/75">{ICONE_AUDIENCE[s] && <Icone nom={ICONE_AUDIENCE[s]} taille={16} />}</span>
              <span className="flex-1 text-[14.5px] font-medium text-white">{NOMS_AUDIENCES[s]}</span>
              <button type="button" role="switch" aria-checked={vu} aria-label={`Afficher sur ${NOMS_AUDIENCES[s]}`}
                onClick={() => { vibrer(); maj(basculerPour({ ...b, ...(vu ? enTetePour(b, s, false) : {}) }, s, !vu)); }}
                className={`adm-interrupteur relative h-6 w-10 shrink-0 rounded-full before:absolute before:-inset-2 before:content-[''] ${vu ? 'bg-white' : 'bg-white/15'}`}>
                <span className={`absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] ${vu ? 'translate-x-4 bg-nuit' : 'bg-white'}`} />
              </button>
            </li>
          );
        })}
      </ul>
      {!plus && autres.length > 0 && (
        <button type="button" onClick={() => setPlus(true)} className="self-start text-[13.5px] font-medium text-white/55 hover:text-white">Autres réseaux</button>
      )}
      {!reserve && (
        <div className="border-t border-white/[0.06] pt-3">
          <p className="text-[14px] font-medium text-white">En premier pour ceux qui viennent de</p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-white/50">Facultatif. Ce bloc passe en tête de ta page, mis en avant, pour ces visiteurs.</p>
          <div className="mt-2 flex flex-wrap gap-1" role="group" aria-label="En premier pour">
            {liste.filter(visible).map(s => (
              <button key={s} type="button" aria-pressed={tete(s)} title={NOMS_AUDIENCES[s]}
                aria-label={tete(s) ? `En premier sur ${NOMS_AUDIENCES[s]}, toucher pour retirer` : `Mettre en premier sur ${NOMS_AUDIENCES[s]}`}
                onClick={() => { vibrer(4); maj(enTetePour(b, s, !tete(s))); }}
                className={`grid h-11 w-11 place-items-center rounded-full transition active:scale-90 ${tete(s) ? 'text-white ring-2 ring-white' : 'text-white/35 hover:text-white/70'}`}>
                {ICONE_AUDIENCE[s] ? <Icone nom={ICONE_AUDIENCE[s]} taille={20} /> : <span className="text-[12px] font-semibold">{NOMS_AUDIENCES[s].slice(0, 2)}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </Repli>
  );
}

const ICONE_AUDIENCE: Partial<Record<Audience, string>> = { instagram: 'instagram', tiktok: 'tiktok', youtube: 'youtube', linkedin: 'linkedin', x: 'x', facebook: 'facebook', threads: 'threads', email: 'email' };

/** Le mode drop : un code à taper, des places comptées, ou les deux. */
export function RegleAcces({ b, maj, prises }: { b: Bloc; maj: (c: Partial<Bloc>) => void; prises: number }) {
  const a = b.acces;
  const majAcces = (champs: Partial<Acces>) => {
    const suite = { code: a?.code ?? '', places: a?.places ?? 0, ...champs };
    maj({ acces: suite.code || suite.places ? suite : null });
  };
  const resume = a ? [a.code ? `code « ${a.code} »` : '', a.places ? `${prises}/${a.places} places prises` : ''].filter(Boolean).join(', ') : '';
  return (
    <Repli titre="Accès réservé (mode drop)" icone="cadenas" resume={resume} ouvert={!!a}>
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
export function RegleTraductions({ b, maj, langues }: { b: Bloc; maj: (c: Partial<Bloc>) => void; langues: Langue[] }) {
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
    <Repli titre="Traductions" icone="globe" resume={traduites.length ? traduites.map(l => NOMS_LANGUES[l]).join(', ') : 'Pas encore traduit : le français s’affiche'} ouvert={false}>
      {langues.map(l => (
        <div key={l} className="flex flex-col gap-2.5 rounded-xl bg-white/[0.035] p-3">
          <span className="text-[13px] font-semibold text-white/80">{NOMS_LANGUES[l]}</span>
          {champs.map(c => (
            <Champ key={c.cle} label={c.label}>
              {c.long
                ? <textarea className={`${classeSaisie} min-h-20`} lang={l} value={b.traductions[l]?.[c.cle] ?? ''} placeholder={b[c.cle]} onChange={e => majLangue(l, c.cle, e.target.value)} />
                : <input className={classeSaisie} lang={l} value={b.traductions[l]?.[c.cle] ?? ''} placeholder={b[c.cle]} onChange={e => majLangue(l, c.cle, e.target.value)} />}
            </Champ>
          ))}
        </div>
      ))}
      <p className="text-[12.5px] leading-snug text-white/45">Un champ vide garde le texte en français.</p>
    </Repli>
  );
}

const SOURCES_PREUVE = ['Google', 'Trustpilot', 'Malt', 'Avis Vérifiés', 'YouTube', 'Instagram', 'TikTok', 'LinkedIn'];

/** Un avis, un chiffre, un témoignage : ce que le bloc `preuve` montre. */
export function ChampsPreuve({ b, maj }: { b: Bloc; maj: (c: Partial<Bloc>) => void }) {
  const p = b.preuve ?? { genre: 'note' as const, note: 5, nombre: 0, source: '' };
  const majP = (champs: Partial<Preuve>) => maj({ preuve: { ...p, ...champs } });
  return (
    <>
      <div>
        <span className="mb-1.5 block text-[13px] font-medium text-white/70">Ce que tu montres</span>
        <Segments label="Genre de preuve" valeur={p.genre} onChange={genre => majP({ genre })}
          options={[{ id: 'note', nom: 'Note' }, { id: 'compteur', nom: 'Chiffre' }, { id: 'temoignage', nom: 'Témoignage' }]} />
      </div>
      {p.genre === 'note' && (
        <div className="grid grid-cols-2 gap-3">
          <Champ label="Note sur 5">
            <input className={classeSaisie} type="number" inputMode="decimal" min={0} max={5} step={0.1} value={p.note}
              onChange={e => majP({ note: Math.max(0, Math.min(5, Math.round(Number(e.target.value.replace(',', '.')) * 10) / 10 || 0)) })} />
          </Champ>
          <Champ label="Nombre d’avis">
            <input className={classeSaisie} type="number" inputMode="numeric" min={0} value={p.nombre || ''} placeholder="Ex. 132"
              onChange={e => majP({ nombre: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
          </Champ>
        </div>
      )}
      {p.genre === 'compteur' && (
        <Champ label="Le chiffre">
          <input className={classeSaisie} type="number" inputMode="numeric" min={0} value={p.nombre || ''} placeholder="Ex. 12400"
            onChange={e => majP({ nombre: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
        </Champ>
      )}
      {p.genre === 'temoignage' && (
        <>
          <Champ label="Le témoignage">
            <textarea className={`${classeSaisie} min-h-24`} value={b.description} maxLength={400} onChange={e => maj({ description: e.target.value })}
              placeholder="« Grâce à Camille, j’ai lancé ma boutique en deux semaines. »" />
          </Champ>
          <Champ label="Qui le dit">
            <input className={classeSaisie} value={b.sousTitre} maxLength={240} onChange={e => maj({ sousTitre: e.target.value })} placeholder="Marie, fondatrice de Bloom" />
          </Champ>
        </>
      )}
      <Champ label="Où ça se passe (facultatif)">
        <input className={classeSaisie} value={p.source} maxLength={30} onChange={e => majP({ source: e.target.value })} placeholder="Google" />
      </Champ>
      <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]" role="group" aria-label="Sources courantes">
        {SOURCES_PREUVE.map(s => (
          <button key={s} type="button" onClick={() => { vibrer(4); majP({ source: s }); }}
            className={`min-h-9 shrink-0 rounded-full px-3.5 text-[13.5px] font-medium transition active:scale-95 ${p.source === s ? 'bg-white text-nuit' : 'bg-white/[0.07] text-white/70 hover:text-white'}`}>{s}</button>
        ))}
      </div>
      <p className="text-[12.5px] leading-snug text-white/45">Montre des chiffres vrais et des avis réels, avec l’accord de leurs auteurs : c’est la loi, et c’est ce qui marche.</p>
    </>
  );
}
