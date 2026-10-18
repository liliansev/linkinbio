import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Bloc } from '../lib/types.ts';
import type { Creneau } from '../lib/moments.ts';
import { FUSEAU_DEFAUT, decrireCreneau } from '../lib/moments.ts';
import { Icone } from '../components/Icone.tsx';
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
          {resume && !ouvert && <span className="block truncate text-[12.5px] font-normal text-peche/85">{resume}</span>}
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
              }} className={`grid aspect-square place-items-center rounded-full text-[14px] font-semibold transition active:scale-90 ${actif ? 'bg-peche text-nuit' : 'bg-white/[0.07] text-white/70'}`}>{j}</button>
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
