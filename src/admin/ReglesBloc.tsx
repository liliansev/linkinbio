import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Acces, Bloc, Preuve } from '../lib/types.ts';
import type { Creneau } from '../lib/moments.ts';
import { FUSEAU_DEFAUT, decrireCreneau } from '../lib/moments.ts';
import { Icone } from '../components/Icone.tsx';
import { NOMS_AUDIENCES, RESEAUX_SOCIAUX, basculerPour, deReseau, enTetePour } from '../lib/provenance.ts';
import type { Audience } from '../lib/provenance.ts';
import { Bascule, Champ, Interrupteur, Segments, classeSaisie, vibrer } from './ui.tsx';
import { Etiquette, Reserve, usePermis, useVoirOffres } from './offre.tsx';
import { COULEURS_SOURCES } from '../lib/stats.ts';

/*
 * Les réglages d'un bloc : Quand et Pour qui sur sa première page, l'animation
 * dans l'apparence d'un bloc mis en avant, l'accès réservé, rare, derrière
 * « Plus de réglages ».
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

/**
 * Au bureau, dans la rangée d'un bloc : Apparence, Quand et Pour qui se déplient un à la fois (23 octobre 2026). En ouvrir un
 * replie l'autre, et la rangée ne s'allonge pas de trois réglages ouverts. `ouvert` : le titre de celui qui l'est.
 */
export const ReplisExclusifs = createContext<{ ouvert: string | null; poser: (titre: string | null) => void } | null>(null);

/** De retour des offres pour régler ce bloc (« Programmer ce bloc ») : la règle qu'on vient de débloquer s'ouvre d'elle-même. */
export const RegleAOuvrir = createContext<'moment' | 'acces' | null>(null);

/**
 * Les réglages qui s'ouvrent en sous-page, dans la feuille d'un bloc au téléphone : Quand, Pour qui et l'apparence d'un bloc
 * mis en avant depuis la première page, l'animation depuis cette apparence, l'accès réservé depuis « Plus de réglages ».
 */
export type PageRegle = 'quand' | 'public' | 'apparence' | 'acces' | 'animation';
/**
 * Au téléphone, la feuille d'un bloc mène de page en page (22 octobre 2026) :
 * « Plus de réglages » montre une ligne par règle, qui s'ouvre à la place de la
 * liste, avec la flèche de retour dans l'en-tête. `page` dit ce qui est ouvert.
 */
export const PagesBloc = createContext<{ page: 'plus' | PageRegle | null; ouvrir: (p: PageRegle) => void } | null>(null);

/**
 * Une section qui se replie, avec un résumé de ce qui est réglé. `montrer` l'amène sous les yeux en arrivant. Au téléphone,
 * `depuis` est la page où se pose sa ligne : « Plus de réglages », ou l'apparence d'un bloc mis en avant. `regle` : le résumé
 * dit une règle posée, il s'écrit en bleu, comme sur la première page du bloc.
 */
export function Repli({ id, depuis = 'plus', titre, icone, resume, regle = false, ouvert: depart, etiquette, montrer = false, children }: { id?: PageRegle; depuis?: 'plus' | PageRegle; titre: string; icone: string; resume?: string; regle?: boolean; ouvert: boolean; etiquette?: ReactNode; montrer?: boolean; children: ReactNode }) {
  const [seul, setSeul] = useState(depart);
  const compact = useContext(RangeesCompactes);
  const pages = useContext(PagesBloc);
  const exclusifs = useContext(ReplisExclusifs);
  const ouvert = exclusifs ? exclusifs.ouvert === titre : seul;
  const setOuvert = (v: boolean) => (exclusifs ? exclusifs.poser(v ? titre : null) : setSeul(v));
  // Arrivé ouvert (une erreur de dates, « Mis en avant » qu'on vient d'allumer) : il prend la place de celui qui l'était.
  useLayoutEffect(() => { if (depart && exclusifs) exclusifs.poser(titre); }, []); // eslint-disable-line react-hooks/exhaustive-deps
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
    if (pages.page !== depuis) return null;
    // Dans la page d'où elle part : une ligne qui dit ce qui est réglé, et mène à la page de la règle. La même que Quand et
    // Pour qui sur la première page du bloc : sans picto, la règle posée en bleu.
    return (
      <button id={`regle-${id}`} type="button" onClick={() => { vibrer(4); pages.ouvrir(id); }}
        className="flex min-h-12 w-full items-center gap-3 px-4 text-left transition hover:bg-white/[0.03] active:bg-white/[0.05]">
        <span className="shrink-0 text-[14.5px] font-medium text-white">{titre}</span>
        {etiquette}
        <span className={`min-w-0 flex-1 truncate text-right text-[13.5px] ${regle ? 'font-medium text-bleu' : 'text-white/55'}`}>{resume}</span>
        <Icone nom="ui-chevron" taille={16} className="-rotate-90 shrink-0 text-white/55" />
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
          <span className={`min-w-0 truncate ${regle ? 'font-medium text-bleu' : ''}`}>{resume || 'Régler'}</span>
          <Icone nom="ui-chevron" taille={14} className={`shrink-0 transition-transform duration-300 ${ouvert ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {/* Ce que la ligne ouvre, en retrait sous son nom : on voit où finit l'apparence et où commence Quand. */}
      {ouvert && <div className="flex flex-col gap-3 pb-3 pl-4 pt-1.5">{children}</div>}
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

/** « 12 nov. » : un jour d'un bloc, en court, pour les résumés. */
const jourCourt = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
/** « mer. 12 nov., 10:00 » : une date d'un bloc, dans sa ligne. */
const dateLigne = (iso: string) => new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/*
 * Les quatre gestes qu'on fait le plus sur un bloc (Lilian, 22 octobre 2026 : « il faut que ce soit vraiment simple ») :
 * le programmer, le mettre en avant, le montrer ou non selon le réseau, le mettre en avant selon le réseau. Ils se
 * règlent depuis la première page du bloc, en deux lignes qui disent ce qui est réglé : « Quand » et « Pour qui ».
 */

/** Ce que « Quand » dit sans s'ouvrir. `heure` : un créneau que l'offre ne comprend pas ne s'applique pas, il ne se dit pas. */
export function resumeQuand(b: Bloc, heure: boolean): string {
  const dates = b.debut && b.fin ? `du ${jourCourt(b.debut)} au ${jourCourt(b.fin)}` : b.debut ? `à partir du ${jourCourt(b.debut)}` : b.fin ? `jusqu’au ${jourCourt(b.fin)}` : '';
  const semaine = heure && b.creneau ? `${b.creneau.effet === 'avant' ? 'en avant ' : 'seulement '}${decrireCreneau(b.creneau)}` : '';
  return majuscule([dates, semaine].filter(Boolean).join(', ')) || 'Tout le temps';
}

/**
 * Ce que « Pour qui » dit sans s'ouvrir : « Tout le monde », « Sauf venus de TikTok, en avant venus d'Instagram ». Le
 * réglage porte sur d'où vient le visiteur, pas sur le réseau où le bloc serait publié : la phrase le dit (23 octobre 2026).
 */
export function resumePourQui(b: Bloc): string {
  const venus = (l: Audience[]) => `venus ${l.map(deReseau).join(', ')}`;
  const a = b.audience?.sources.length ? b.audience : null;
  return majuscule([
    a?.effet === 'seulement' ? `seulement ${venus(a.sources)}` : '',
    b.cache?.length ? `sauf ${venus(b.cache)}` : '',
    a?.effet === 'avant' ? `en avant ${venus(a.sources)}` : '',
  ].filter(Boolean).join(', ')) || 'Tout le monde';
}

/**
 * Une date d'un bloc, comme dans le calendrier du téléphone : son nom, et sa valeur à droite (« Maintenant », « Jamais »), un
 * chevron tant qu'elle est vide, une croix pour la retirer ensuite.
 * Le sélecteur natif couvre la ligne, invisible : un toucher l'ouvre tout de suite, sans champ à viser. Sans l'offre, la
 * ligne mène aux offres ; une date gardée d'une offre passée se retire toujours.
 */
function LigneDate({ id, nom, vide, valeur, min, permis, invalide, onChange, retirer }: { id?: string; nom: string; vide: string; valeur: string; min?: string; permis: boolean; invalide?: boolean; onChange: (iso: string) => void; retirer: () => void }) {
  const voir = useVoirOffres();
  return (
    <div className="relative flex min-h-12 items-center gap-3 px-4 transition focus-within:bg-white/[0.05] hover:bg-white/[0.03] bureau:min-h-10 bureau:gap-2 bureau:px-3">
      <span className="shrink-0 text-[14.5px] font-medium text-white bureau:text-[13.5px] bureau:font-normal">{nom}</span>
      {!permis && <Etiquette fonction="programmation" />}
      <span className={`ml-auto min-w-0 truncate text-[14px] tabular-nums bureau:text-[13.5px] ${invalide ? 'text-red-300' : valeur ? 'font-medium text-bleu' : 'text-white/55'}`}>{valeur ? dateLigne(valeur) : vide}</span>
      {permis ? (
        <input id={id} type="datetime-local" aria-label={nom} aria-invalid={invalide || undefined} value={versLocal(valeur)} min={min}
          onChange={e => onChange(depuisLocal(e.target.value))}
          onClick={e => { try { e.currentTarget.showPicker(); } catch { /* le navigateur ouvre le sien */ } }}
          className="absolute inset-0 h-full w-full cursor-pointer text-[16px] opacity-0" />
      ) : (
        <button type="button" onClick={() => voir?.('programmation')} aria-haspopup="dialog" aria-label={`${nom} : ${valeur ? dateLigne(valeur) : vide}. Voir les offres`} className="absolute inset-0" />
      )}
      {valeur ? (
        <button type="button" onClick={() => { vibrer(6); retirer(); }} aria-label={`Retirer la date : ${nom}`} title="Retirer"
          className="relative z-10 -mr-2 grid h-11 w-9 shrink-0 place-items-center text-white/45 transition hover:text-white bureau:h-8 bureau:w-7">
          <Icone nom="ui-fermer" taille={15} />
        </button>
      ) : (
        // Sans date, un chevron dit que la ligne s'ouvre : « Maintenant » et « Jamais » ne sont pas du simple texte.
        <Icone nom="ui-chevron" taille={15} className="pointer-events-none shrink-0 text-white/55" />
      )}
    </div>
  );
}

/**
 * « Quand » : deux lignes, Apparaît (Maintenant) et Disparaît (Jamais), le compte à rebours d'un lancement, puis le
 * créneau qui revient chaque semaine. Starter pour les dates, Pro pour la semaine : sans l'offre, les mêmes lignes
 * portent leur étiquette et mènent aux offres.
 */
export function ReglageQuand({ b, maj, erreur }: { b: Bloc; maj: (c: Partial<Bloc>) => void; erreur?: string }) {
  const c = b.creneau;
  const dates = usePermis('programmation');
  const semaine = usePermis('heure');
  const voir = useVoirOffres();
  const compact = useContext(RangeesCompactes);
  // Un premier jour touché pose le créneau que le serveur prendrait de lui-même : 9 h à 18 h, en avant. Il ne retire rien de la
  // page ; « Affiché seulement », qui la retire le reste du temps, se choisit exprès.
  const majCreneau = (champs: Partial<Creneau>) => maj({ creneau: { ...(c ?? { jours: [1, 2, 3, 4, 5], de: '09:00', a: '18:00', fuseau: fuseauNavigateur(), effet: 'avant' }), ...champs, fuseau: fuseauNavigateur() } });
  const lancement = b.type === 'lien' && dates && !!b.debut && Date.parse(b.debut) > Date.now();
  return (
    <div className="flex flex-col gap-4 bureau:gap-3">
      <div>
        <div className="adm-groupe flex flex-col divide-y divide-white/[0.06]">
          <LigneDate nom="Apparaît" vide="Maintenant" valeur={b.debut} permis={dates}
            onChange={debut => maj({ debut, ...(debut ? {} : { compteARebours: false }) })} retirer={() => maj({ debut: '', compteARebours: false })} />
          <LigneDate id="bloc-fin" nom="Disparaît" vide="Jamais" valeur={b.fin} min={versLocal(b.debut) || undefined} permis={dates} invalide={!!erreur}
            onChange={fin => maj({ fin })} retirer={() => maj({ fin: '' })} />
        </div>
        {erreur && <p role="alert" className="mt-1.5 text-[13px] font-medium text-red-300">{erreur}</p>}
      </div>
      {lancement && (
        <div className="adm-groupe px-4 bureau:px-3">
          <Interrupteur compact={compact} label="Compte à rebours" actif={b.compteARebours} onChange={v => maj({ compteARebours: v })} />
        </div>
      )}

      <div>
        <span className="mb-1.5 flex items-center gap-2 text-[13px] font-medium text-white/70">Chaque semaine {!semaine && <Etiquette fonction="heure" />}</span>
        {!semaine && c ? (
          // Un créneau gardé d'une offre passée : il ne s'applique plus, il se retire.
          <Reserve fonction="heure" phrase={`Ce bloc devait s’afficher ${decrireCreneau(c)}. Sans Hopla Pro, il s’affiche tout le temps.`}>
            <button type="button" onClick={() => maj({ creneau: null })} className="text-[13px] text-white/55 underline">Retirer le créneau</button>
          </Reserve>
        ) : (
          // Sept cases qui se cochent à plusieurs, sans la piste grise des segments (un seul choix) : chacune se lit seule.
          <div role="group" aria-label="Jours" className="grid grid-cols-7 gap-1">
            {JOURS.map((j, i) => {
              const actif = !!c?.jours.includes(i + 1);
              return (
                // Sans Hopla Pro, les jours se montrent quand même : un toucher ouvre les offres.
                <button key={i} type="button" aria-pressed={semaine ? actif : undefined} aria-haspopup={semaine ? undefined : 'dialog'} aria-label={NOMS[i]} onClick={() => {
                  if (!semaine) { voir?.('heure'); return; }
                  vibrer(4);
                  const jours = actif ? c!.jours.filter(n => n !== i + 1) : [...(c?.jours ?? []), i + 1];
                  if (!jours.length) maj({ creneau: null }); else majCreneau({ jours: jours.sort() });
                }} className={`min-h-11 rounded-[9px] text-[14px] font-semibold transition duration-200 active:scale-95 bureau:min-h-8 bureau:text-[13px] ${actif ? 'bg-bleu text-nuit' : 'text-white/70 hover:text-white'}`}>{j}</button>
              );
            })}
          </div>
        )}
        {semaine && c && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Champ label="De"><input type="time" className={classeSaisie} value={c.de} onChange={e => e.target.value && majCreneau({ de: e.target.value })} /></Champ>
              <Champ label="À"><input type="time" className={classeSaisie} value={c.a} onChange={e => e.target.value && majCreneau({ a: e.target.value })} /></Champ>
            </div>
            <div>
              <span className="mb-1.5 block text-[13px] font-medium text-white/70">À ces heures</span>
              <Segments label="Ce que fait le créneau" valeur={c.effet} onChange={effet => majCreneau({ effet })}
                options={[{ id: 'afficher', nom: 'Affiché seulement' }, { id: 'avant', nom: 'En avant' }]} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * « Pour qui » : une seule liste de réseaux, chacun avec deux interrupteurs côte à côte, Affiché et En avant (en tête de
 * la page, mis en avant, pour ceux qui arrivent de là). À tous, dès Gratuit : c'est la promesse de Hopla.
 */
export function ReglagePourQui({ b, maj, reseaux }: { b: Bloc; maj: (c: Partial<Bloc>) => void; reseaux: Audience[] }) {
  const cache = b.cache ?? [];
  const reserve = b.audience?.effet === 'seulement' ? b.audience.sources : null;
  const visible = (s: Audience) => !cache.includes(s) && (!reserve || reserve.includes(s));
  const tete = (s: Audience) => b.audience?.effet === 'avant' && b.audience.sources.includes(s);
  const autres = RESEAUX_SOCIAUX.filter(s => !reseaux.includes(s));
  const [plus, setPlus] = useState(() => autres.some(s => !visible(s) || tete(s)));
  const liste = plus ? [...reseaux, ...autres] : reseaux;
  const colonne = 'flex w-[60px] shrink-0 justify-center whitespace-nowrap max-[359px]:w-12 bureau:w-14';
  // Au plus petit téléphone (320 px), les colonnes et les marges se resserrent : « Instagram » se lit en entier.
  const rang = 'gap-3 px-4 max-[359px]:gap-2 max-[359px]:px-3 bureau:gap-2 bureau:px-3';
  return (
    <div className="adm-groupe">
      {/* Le nom des trois colonnes, une fois en haut : d'où vient le visiteur, puis les deux interrupteurs. */}
      <div aria-hidden="true" className={`flex items-center pb-0.5 pt-2.5 text-[12px] font-medium text-white/55 bureau:pt-2 ${rang}`}>
        <span className="flex-1">Venus de</span>
        <span className={colonne}>Affiché</span>
        <span className={colonne}>En avant</span>
      </div>
      <ul className="divide-y divide-white/[0.06]" aria-label="Pour qui">
        {liste.map(s => {
          const vu = visible(s);
          return (
            <li key={s} className={`flex min-h-12 items-center bureau:min-h-10 ${rang}`}>
              {/* Le logo seul, dans la couleur de son réseau, comme dans les stats. */}
              <span className="flex w-5 shrink-0 justify-center" style={{ color: COULEURS_SOURCES[NOMS_AUDIENCES[s]]?.picto }}>{ICONE_AUDIENCE[s] && <Icone nom={ICONE_AUDIENCE[s]} taille={18} />}</span>
              <span className={`min-w-0 flex-1 truncate text-[14.5px] font-medium bureau:text-[13.5px] bureau:font-normal ${vu ? 'text-white' : 'text-white/55'}`}>{NOMS_AUDIENCES[s]}</span>
              <span className={colonne}>
                <Bascule actif={vu} label={`Affiché pour ceux qui viennent ${deReseau(s)}`} onClick={() => { vibrer(); maj(basculerPour({ ...b, ...(vu ? enTetePour(b, s, false) : {}) }, s, !vu)); }} />
              </span>
              <span className={colonne}>
                <Bascule actif={vu && tete(s)} disabled={!vu || !!reserve} label={`En avant pour ceux qui viennent ${deReseau(s)}`} onClick={() => { vibrer(4); maj(enTetePour(b, s, !tete(s))); }} />
              </span>
            </li>
          );
        })}
      </ul>
      {!plus && autres.length > 0 && (
        <button type="button" onClick={() => setPlus(true)} className="flex min-h-12 w-full items-center gap-3 border-t border-white/[0.06] px-4 text-left text-[14px] font-medium text-white/75 transition hover:text-white bureau:min-h-10 bureau:px-3 bureau:text-[13.5px]">
          <span className="flex w-5 shrink-0 justify-center"><Icone nom="ui-plus" taille={16} /></span>Autres réseaux
        </button>
      )}
    </div>
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
    <Repli id="acces" titre="Accès réservé" icone="cadenas" resume={resume || 'Ouvert à tous'} regle={!!a} ouvert={!!a || aOuvrir} montrer={aOuvrir}>
      {/* Un code, des places, ou les deux : les champs se suffisent. Seul ce qui ne se devine pas se dit, le nombre de places
          prises tant qu'il y en a, et ce que fait l'accès quand rien n'est rempli. */}
      <Champ label="Code à taper" aide="Majuscules et espaces ne comptent pas.">
        <input className={classeSaisie} value={a?.code ?? ''} maxLength={40} autoCapitalize="characters" autoComplete="off" spellCheck={false}
          placeholder="VIP2026" onChange={e => majAcces({ code: e.target.value })} />
      </Champ>
      <Champ label="Nombre de places" aide={a?.places ? `${prises} prise${prises > 1 ? 's' : ''} pour l’instant.` : undefined}>
        <input className={classeSaisie} type="number" inputMode="numeric" min={0} max={100000} value={a?.places || ''} placeholder="Sans limite"
          onChange={e => majAcces({ places: Math.max(0, Math.min(100_000, Math.round(Number(e.target.value) || 0))) })} />
      </Champ>
      {a ? <button type="button" onClick={() => { vibrer(6); maj({ acces: null }); }} className="self-start text-[13.5px] font-medium text-white/55 hover:text-white">Retirer l’accès réservé</button>
        : <p className="text-[13px] leading-snug text-white/55">Sans code ni places, le lien reste ouvert à tous.</p>}
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
