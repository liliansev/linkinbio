import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Acces, Bloc, Preuve } from '../lib/types.ts';
import type { Creneau } from '../lib/moments.ts';
import { FUSEAU_DEFAUT, decrireCreneau } from '../lib/moments.ts';
import { Icone } from '../components/Icone.tsx';
import { NOMS_AUDIENCES, RESEAUX_SOCIAUX, basculerPour, deReseau, enTetePour } from '../lib/provenance.ts';
import type { Audience } from '../lib/provenance.ts';
import { Bascule, Champ, Interrupteur, Segments, classeSaisie, vibrer } from './ui.tsx';
import { Etiquette, Reserve, usePermis } from './offre.tsx';

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

/**
 * Au bureau, dans la rangée dépliée d'un bloc, chaque règle tient sur une
 * ligne : son nom à gauche, ce qui est réglé à droite comme une valeur qu'on
 * ouvre (« Toujours », « Tous les réseaux »). Ailleurs, le groupe bordé avec
 * son picto.
 */
export const RangeesCompactes = createContext(false);

/** De retour des offres pour régler ce bloc (« Programmer ce bloc ») : la règle qu'on vient de débloquer s'ouvre d'elle-même. */
export const RegleAOuvrir = createContext<'moment' | 'acces' | null>(null);

/** Les règles qui s'ouvrent en sous-page, dans la feuille d'un bloc au téléphone. */
export type PageRegle = 'moment' | 'reseaux' | 'acces' | 'animation';
/**
 * Au téléphone, la feuille d'un bloc mène de page en page (22 octobre 2026) :
 * « Plus de réglages » montre une ligne par règle, qui s'ouvre à la place de la
 * liste, avec la flèche de retour dans l'en-tête. `page` dit ce qui est ouvert.
 */
export const PagesBloc = createContext<{ page: 'plus' | PageRegle | null; ouvrir: (p: PageRegle) => void } | null>(null);

/** Une section qui se replie, avec un résumé de ce qui est réglé. `montrer` l'amène sous les yeux en arrivant. */
export function Repli({ id, titre, icone, resume, ouvert: depart, etiquette, montrer = false, children }: { id?: PageRegle; titre: string; icone: string; resume?: string; ouvert: boolean; etiquette?: ReactNode; montrer?: boolean; children: ReactNode }) {
  const [ouvert, setOuvert] = useState(depart);
  const compact = useContext(RangeesCompactes);
  const pages = useContext(PagesBloc);
  const racine = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!montrer || !racine.current || pages) return;
    // Le défilement de la feuille, pas celui de la page : la section remonte juste assez pour se lire en entier.
    // Au bureau, la rangée dépliée est dans la page même : c'est elle qui défile, sous l'en-tête et les onglets collés.
    let boite = racine.current.parentElement;
    while (boite && !(/(auto|scroll)/.test(getComputedStyle(boite).overflowY) && boite.scrollHeight > boite.clientHeight)) boite = boite.parentElement;
    if (!boite) { racine.current.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); return; }
    const r = racine.current.getBoundingClientRect(), b = boite.getBoundingClientRect();
    const ecart = Math.min(r.bottom + 16 - b.bottom, r.top - b.top - 8);
    if (ecart > 0) boite.scrollBy({ top: ecart, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (pages && id) {
    // Sa propre page : le contenu seul, le titre est dans l'en-tête de la feuille.
    if (pages.page === id) return <div className="flex flex-col gap-3 pb-1">{children}</div>;
    if (pages.page !== 'plus') return null;
    // Dans « Plus de réglages » : une ligne qui dit ce qui est réglé, et mène à la page de la règle.
    return (
      <button id={`regle-${id}`} type="button" onClick={() => { vibrer(4); pages.ouvrir(id); }}
        className="flex min-h-[52px] w-full items-center gap-3 px-3.5 py-2 text-left transition hover:bg-white/[0.04] active:bg-white/[0.06]">
        <Icone nom={icone} taille={20} className="shrink-0 text-white/70" />
        <span className="shrink-0 text-[14.5px] font-medium text-white">{titre}</span>
        {etiquette}
        <span className="min-w-0 flex-1 truncate text-right text-[13px] text-white/55">{resume}</span>
        <Icone nom="ui-chevron" taille={16} className="-rotate-90 shrink-0 text-white/30" />
      </button>
    );
  }
  if (compact) return (
    <div ref={racine}>
      <button type="button" onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert} className="group flex min-h-11 w-full items-center gap-2 text-left bureau:min-h-9">
        <span className="min-w-0 shrink-0 text-[13.5px] text-white">{titre}</span>
        {etiquette}
        {/* La valeur se lit comme un menu qu'on ouvre : le résumé, puis un chevron. */}
        <span className="adm-valeur ml-auto">
          <span className="min-w-0 truncate">{resume || 'Régler'}</span>
          <Icone nom="ui-chevron" taille={14} className={`shrink-0 transition-transform duration-300 ${ouvert ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {ouvert && <div className="flex flex-col gap-3 pb-2 pt-1.5">{children}</div>}
    </div>
  );
  return (
    <div ref={racine} className="adm-groupe">
      <button type="button" onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert} className="flex min-h-12 w-full items-center gap-2.5 px-4 text-left text-[14.5px] font-medium text-white/85">
        <Icone nom={icone} taille={17} />
        <span className="shrink-0">{titre}</span>
        {etiquette}
        {/* Ce qui est réglé se lit à droite, comme une valeur, jamais en sous-titre sous le nom. */}
        <span className="min-w-0 flex-1 truncate text-right text-[13px] font-normal text-white/55">{!ouvert && resume}</span>
        <Icone nom="ui-chevron" taille={18} className={`shrink-0 transition-transform duration-300 ${ouvert ? 'rotate-180' : ''}`} />
      </button>
      {ouvert && <div className="flex flex-col gap-3 px-4 pb-4">{children}</div>}
    </div>
  );
}

const JOURS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
const NOMS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const fuseauNavigateur = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || FUSEAU_DEFAUT; } catch { return FUSEAU_DEFAUT; } };

/** « 12 novembre à 10:00 » : une date d'un bloc, dite en clair. */
const quand = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

/**
 * Quand le bloc s'affiche : des dates et un compte à rebours (Starter), un
 * créneau qui revient chaque semaine (Pro). Sans l'offre, la règle se montre
 * quand même, avec ce qu'elle ferait ; des dates déjà posées tiennent toujours
 * et peuvent se retirer, pas se changer.
 */
export function RegleMoment({ b, maj, erreur }: { b: Bloc; maj: (c: Partial<Bloc>) => void; erreur?: string }) {
  const c = b.creneau;
  const dates = usePermis('programmation');
  const semaine = usePermis('heure');
  const aOuvrir = useContext(RegleAOuvrir) === 'moment';
  const majCreneau = (champs: Partial<Creneau>) => maj({ creneau: { ...(c ?? { jours: [1, 2, 3, 4, 5], de: '09:00', a: '12:00', fuseau: fuseauNavigateur(), effet: 'afficher' }), ...champs, fuseau: fuseauNavigateur() } });
  const avecDates = !!(b.debut || b.fin);
  // Le résumé dit ce qui s'applique vraiment : un créneau ou un compte à rebours hors offre ne compte pas.
  const resume = [avecDates ? 'Dates' : '', dates && b.compteARebours && b.debut ? 'compte à rebours' : '', semaine && c ? decrireCreneau(c) : ''].filter(Boolean).join(', ');
  // Sans aucune des deux offres et sans rien de réglé : une seule phrase, un seul chemin vers les offres.
  const rienARegler = !dates && !semaine && !avecDates && !c;
  const retirerDates = avecDates && <button type="button" onClick={() => maj({ debut: '', fin: '', compteARebours: false })} className="self-start text-[13px] text-white/55 underline">Retirer les dates</button>;
  return (
    <Repli id="moment" key={erreur ? 'erreur' : 'calme'} titre="Quand l’afficher" icone="horloge" etiquette={!dates ? <Etiquette fonction="programmation" /> : undefined} resume={resume || (dates ? 'Toujours' : '')} ouvert={!!(avecDates || c || erreur) || aOuvrir} montrer={aOuvrir}>
      {rienARegler ? (
        <Reserve fonction="programmation" phrase="Avec Hopla Starter, ce bloc apparaît et disparaît aux dates que tu choisis, avec un compte à rebours avant un lancement. Avec Hopla Pro, il revient aussi à heure fixe, chaque semaine." />
      ) : dates ? (<>
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
        {retirerDates}
      </>) : avecDates ? (
        // Des dates posées avec une offre passée : elles tiennent toujours, la page ne montre jamais le bloc avant son heure.
        <Reserve fonction="programmation" phrase={`Ce bloc s’affiche ${[b.debut && `à partir du ${quand(b.debut)}`, b.fin && `jusqu’au ${quand(b.fin)}`].filter(Boolean).join(' et ')}${b.compteARebours && b.debut ? ', sans compte à rebours' : ''}. Pour changer ses dates, il faut Hopla Starter.`}>
          {retirerDates}
        </Reserve>
      ) : (
        <Reserve fonction="programmation" phrase="Avec Hopla Starter, ce bloc apparaît et disparaît aux dates que tu choisis, avec un compte à rebours avant un lancement." />
      )}

      {rienARegler ? null : !semaine ? (
        <div className="border-t border-white/[0.06] pt-3">
          <span className="mb-2 flex items-center gap-2 text-[13px] font-medium text-white/70">Chaque semaine <Etiquette fonction="heure" /></span>
          {/* Le chemin vers les offres est déjà au-dessus quand les dates sont réservées aussi. */}
          {c || dates ? (
            <Reserve fonction="heure" phrase={c ? `Ce bloc devait s’afficher ${decrireCreneau(c)}. Sans Hopla Pro, il s’affiche tout le temps.` : 'Avec Hopla Pro, un bloc revient à heure fixe, ou passe en tête de ta page aux bonnes heures.'} bouton={dates}>
              {c && <button type="button" onClick={() => maj({ creneau: null })} className="text-[13px] text-white/55 underline">Retirer le créneau</button>}
            </Reserve>
          ) : <p className="text-[13.5px] leading-snug text-white/70">Avec Hopla Pro, un bloc revient à heure fixe, ou passe en tête de ta page aux bonnes heures.</p>}
        </div>
      ) : (
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
      )}
    </Repli>
  );
}

/** Sur quels réseaux le bloc s'affiche (tout coché par défaut), et pour lesquels il passe en tête. À tous, dès Gratuit : c'est la promesse de Hopla. */
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
  const resume = [caches.length ? `Pas sur ${noms(caches)}` : 'Tous les réseaux', enTete.length ? `en tête sur ${noms(enTete)}` : ''].filter(Boolean).join(', ');
  const [premier, setPremier] = useState(enTete.length > 0);
  return (
    <Repli id="reseaux" titre="Afficher sur" icone="cible" resume={resume} ouvert={false}>
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
  const permis = usePermis('drops');
  const aOuvrir = useContext(RegleAOuvrir) === 'acces';
  const majAcces = (champs: Partial<Acces>) => {
    const suite = { code: a?.code ?? '', places: a?.places ?? 0, ...champs };
    maj({ acces: suite.code || suite.places ? suite : null });
  };
  const resume = a ? [a.code ? `code « ${a.code} »` : '', a.places ? `${prises}/${a.places} places prises` : ''].filter(Boolean).join(', ') : '';
  if (!permis) return (
    <Repli id="acces" titre="Accès réservé" icone="cadenas" etiquette={<Etiquette fonction="drops" />} resume={a ? 'Pas montré' : ''} ouvert={false}>
      <Reserve fonction="drops" phrase={a ? 'Sans Hopla Pro, ce lien réservé n’est pas montré : son adresse serait sinon à la vue de tous.' : 'Avec Hopla Pro, un lien ne s’ouvre qu’avec un code, ou pour les premiers arrivés.'}>
        {a && <button type="button" onClick={() => { vibrer(6); maj({ acces: null }); }} className="text-[13px] text-white/55 underline">Retirer l’accès réservé</button>}
      </Reserve>
    </Repli>
  );
  return (
    <Repli id="acces" titre="Accès réservé" icone="cadenas" resume={resume || 'Ouvert à tous'} ouvert={!!a || aOuvrir} montrer={aOuvrir}>
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
