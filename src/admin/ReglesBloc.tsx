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
import { chercherPays, listePays, nomPays } from '../lib/pays.ts';
import { MAX_PAYS } from '../lib/types.ts';
import type { EffetPays } from '../lib/types.ts';

/*
 * Les réglages d'un bloc : sa visibilité, une ligne de sa première page,
 * l'animation dans l'apparence d'un bloc mis en avant, l'accès réservé, rare,
 * derrière « Plus de réglages ».
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
 * ouvre, rien tant que rien n'est réglé. Ailleurs, le groupe bordé avec
 * son picto.
 */
export const RangeesCompactes = createContext(false);

/**
 * Au bureau, dans la rangée d'un bloc : Visibilité et Apparence se déplient un à la fois (23 octobre 2026). En ouvrir un
 * replie l'autre, et la rangée ne s'allonge pas de deux réglages ouverts. `ouvert` : le titre de celui qui l'est.
 */
export const ReplisExclusifs = createContext<{ ouvert: string | null; poser: (titre: string | null) => void } | null>(null);

/** De retour des offres pour régler ce bloc (« Programmer ce bloc ») : la règle qu'on vient de débloquer s'ouvre d'elle-même. */
export const RegleAOuvrir = createContext<'moment' | 'acces' | null>(null);

/**
 * Les réglages qui s'ouvrent en sous-page, dans la feuille d'un bloc au téléphone : la visibilité et l'apparence d'un bloc
 * mis en avant depuis la première page, l'animation depuis cette apparence, l'accès réservé depuis « Plus de réglages ».
 */
export type PageRegle = 'visibilite' | 'apparence' | 'acces' | 'animation';
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
export function Repli({ id, depuis = 'plus', titre, icone, resume, regle = false, ouvert: depart, etiquette, montrer = false, sous = false, children }: { id?: PageRegle; depuis?: 'plus' | PageRegle; titre: string; icone?: string; resume?: string; regle?: boolean; ouvert: boolean; etiquette?: ReactNode; montrer?: boolean; sous?: boolean; children: ReactNode }) {
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
    // Dans la page d'où elle part : une ligne qui dit ce qui est réglé, et mène à la page de la règle. La même que Visibilité
    // sur la première page du bloc : sans picto, la règle posée en bleu.
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
      <LigneRepli sous={sous} titre={titre} etiquette={etiquette} resume={resume} regle={regle} ouvert={ouvert} onClick={() => setOuvert(!ouvert)} />
      {/* Ce que la ligne ouvre, en retrait sous son nom : on voit où finit la visibilité et où reprend « Mis en avant ». */}
      {ouvert && <div className="flex flex-col gap-3 pb-3 pl-6 pt-1.5">{children}</div>}
    </div>
  );
  return (
    <div ref={racine} className="adm-groupe">
      <button type="button" onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert} className="flex min-h-12 w-full items-center gap-2.5 px-4 text-left text-[14.5px] font-medium text-white/85">
        {icone && <Icone nom={icone} taille={17} />}
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

/**
 * Une ligne de la rangée d'un bloc, au bureau (24 octobre 2026, critique du grand écran) : la même forme que « Mis en
 * avant » et « Plus de réglages », son nom à gauche, ce qui est réglé au gris (en bleu quand une règle est posée) et un
 * chevron au bord droit, là où se pose l'interrupteur de la ligne voisine. Ni cadre ni bouton dans la ligne.
 */
export function LigneRepli({ titre, etiquette, resume, regle = false, ouvert, onClick, controle, sous = false }: { titre: string; etiquette?: ReactNode; resume?: string; regle?: boolean; ouvert: boolean; onClick: () => void; controle?: string; sous?: boolean }) {
  return (
    <button type="button" onClick={() => { vibrer(4); onClick(); }} aria-expanded={ouvert} aria-controls={controle}
      className="group flex min-h-11 w-full items-center gap-2 text-left bureau:min-h-9">
      <span className={`min-w-0 shrink-0 text-[13.5px] ${sous ? 'text-white/70' : 'text-white'}`}>{titre}</span>
      {etiquette}
      <span className={`ml-auto min-w-0 truncate text-right text-[13.5px] ${regle ? 'font-medium text-bleu' : 'text-white/55'}`}>{resume}</span>
      <Icone nom="ui-chevron" taille={14} className={`shrink-0 text-white/55 transition duration-300 group-hover:text-white ${ouvert ? 'rotate-180' : ''}`} />
    </button>
  );
}

const JOURS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
const NOMS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const fuseauNavigateur = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || FUSEAU_DEFAUT; } catch { return FUSEAU_DEFAUT; } };

/** « 12 nov. », « 1er déc. » : un jour d'un bloc, en court, pour les résumés. */
const jourCourt = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace(/^1(\s)/, '1er$1');
/** « mer. 12 nov., 10:00 » : une date d'un bloc, dans sa ligne. */
const dateLigne = (iso: string) => new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** « du 12 au 20 nov. », « du 28 oct. au 3 nov. », « à partir du 12 nov. » : les dates d'un bloc, en court. */
function datesCourtes(debut: string, fin: string): string {
  if (debut && fin) {
    const d = new Date(debut), f = new Date(fin);
    const memeMois = d.getFullYear() === f.getFullYear() && d.getMonth() === f.getMonth();
    return `du ${memeMois ? (d.getDate() === 1 ? '1er' : d.getDate()) : jourCourt(debut)} au ${jourCourt(fin)}`;
  }
  return debut ? `à partir du ${jourCourt(debut)}` : fin ? `jusqu’au ${jourCourt(fin)}` : '';
}

/*
 * La visibilité d'un bloc (24 octobre 2026, demandé par Lilian : « un sous-menu qui s'appelle visibilité […] je clique et
 * là, je peux customiser tout ça »). Une seule ligne de sa première page, qui dit ce qui est réglé, mène à sa page : le
 * bloc est-il sur la page, puis ce qui en décide, selon la date, selon l'heure, selon le réseau du visiteur, avec les mots
 * des offres. Les gestes de « vraiment simple » (22 octobre 2026) y sont tous : le montrer ou non, le programmer, le
 * mettre en avant selon l'heure ou selon le réseau.
 */

/**
 * Ce que « Visibilité » dit sans s'ouvrir : « Visible », « Masqué », ou ce qui en décide, avec le nom de ses parties
 * (« Du 12 au 20 nov., selon le réseau »). `heure` : un créneau que l'offre ne comprend pas ne s'applique pas, il ne se dit pas.
 */
export function resumeVisibilite(b: Bloc, heure: boolean, pays = heure): string {
  if (!b.public) return 'Masqué';
  const reseau = !!(b.audience?.sources.length || b.cache?.length);
  return majuscule([datesCourtes(b.debut, b.fin), heure && b.creneau ? 'selon l’heure' : '', reseau ? 'selon le réseau' : '', pays && b.pays ? 'selon le pays' : ''].filter(Boolean).join(', ')) || 'Visible';
}

/**
 * Une date d'un bloc, comme dans le calendrier du téléphone : son nom, et sa valeur à droite (« Maintenant », « Jamais »), un
 * chevron tant qu'elle est vide, une croix pour la retirer ensuite.
 * Le sélecteur natif couvre la ligne, invisible : un toucher l'ouvre tout de suite, sans champ à viser. Sans l'offre, la
 * ligne mène aux offres (son badge est au titre de la partie) ; une date gardée d'une offre passée se retire toujours.
 */
function LigneDate({ id, nom, vide, valeur, min, permis, invalide, onChange, retirer, nu = false }: { id?: string; nom: string; vide: string; valeur: string; min?: string; permis: boolean; invalide?: boolean; onChange: (iso: string) => void; retirer: () => void; nu?: boolean }) {
  const voir = useVoirOffres();
  return (
    <div className={`relative flex min-h-12 items-center gap-3 transition bureau:min-h-10 bureau:gap-2 ${nu ? 'bureau:min-h-9' : 'px-4 focus-within:bg-white/[0.05] hover:bg-white/[0.03] bureau:px-3'}`}>
      <span className={`shrink-0 text-[14.5px] font-medium bureau:text-[13.5px] bureau:font-normal ${nu ? 'text-white/70' : 'text-white'}`}>{nom}</span>
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

/** Une partie de la visibilité : son nom au-dessus, et le badge de son offre à côté de lui quand toute la partie l'attend. */
function Partie({ titre, etiquette, children }: { titre: string; etiquette?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 flex items-center gap-2 text-[13px] font-medium text-white/70">{titre}{etiquette}</h3>
      {children}
    </div>
  );
}

/**
 * « Visibilité » : « Visible sur ma page », puis trois parties. Selon la date : Apparaît (Maintenant) et Disparaît (Jamais),
 * et le compte à rebours d'un lancement. Selon l'heure : le créneau qui revient chaque semaine. Selon le réseau : d'où
 * vient le visiteur. Selon le pays (24 octobre 2026) : partout, seulement dans quelques pays, ou partout sauf eux. Starter
 * pour les dates, Pro pour l'heure et le pays : sans l'offre, les mêmes lignes portent son badge et mènent aux offres ; le
 * réseau, à tous, dès Gratuit.
 */
export function ReglageVisibilite({ b, maj, erreur, reseaux }: { b: Bloc; maj: (c: Partial<Bloc>) => void; erreur?: string; reseaux: Audience[] }) {
  const c = b.creneau;
  const dates = usePermis('programmation');
  const semaine = usePermis('heure');
  const paysPermis = usePermis('pays');
  const voir = useVoirOffres();
  const compact = useContext(RangeesCompactes);
  // Un premier jour touché pose le créneau que le serveur prendrait de lui-même : 9 h à 18 h, en avant. Il ne retire rien de la
  // page ; « Affiché seulement », qui la retire le reste du temps, se choisit exprès.
  const majCreneau = (champs: Partial<Creneau>) => maj({ creneau: { ...(c ?? { jours: [1, 2, 3, 4, 5], de: '09:00', a: '18:00', fuseau: fuseauNavigateur(), effet: 'avant' }), ...champs, fuseau: fuseauNavigateur() } });
  const lancement = b.type === 'lien' && dates && !!b.debut && Date.parse(b.debut) > Date.now();
  // Au bureau, les trois parties sont trois lignes qui disent ce qui est réglé et s'ouvrent une à une (24 octobre 2026).
  const aOuvrir = useContext(RegleAOuvrir);
  const [partie, setPartie] = useState<'date' | 'heure' | 'reseau' | 'pays' | null>(erreur || aOuvrir === 'moment' ? 'date' : null);
  const visible = <Interrupteur compact={compact} label="Visible sur ma page" actif={b.public} onChange={v => maj({ public: v })} />;
  const contenuDate = (
    <>
      {/* Au bureau, dans la rangée, Apparaît et Disparaît sont deux lignes de plus, sans cadre : un cadre de plus dans un repli était un troisième niveau. */}
      <div className={compact ? 'flex flex-col' : 'adm-groupe flex flex-col divide-y divide-white/[0.06]'}>
        <LigneDate nom="Apparaît" vide="Maintenant" valeur={b.debut} permis={dates} nu={compact}
          onChange={debut => maj({ debut, ...(debut ? {} : { compteARebours: false }) })} retirer={() => maj({ debut: '', compteARebours: false })} />
        <LigneDate id="bloc-fin" nom="Disparaît" vide="Jamais" valeur={b.fin} min={versLocal(b.debut) || undefined} permis={dates} invalide={!!erreur} nu={compact}
          onChange={fin => maj({ fin })} retirer={() => maj({ fin: '' })} />
        {/* Un lien qui n'est pas encore là peut compter les jours jusqu'à son arrivée : la ligne suit sa date. */}
        {lancement && (
          <div className={`grid min-h-12 items-center bureau:min-h-10 ${compact ? 'bureau:min-h-9' : 'px-4 bureau:px-3'}`}>
            <Interrupteur compact={compact} label="Compte à rebours" actif={b.compteARebours} onChange={v => maj({ compteARebours: v })} />
          </div>
        )}
      </div>
      {erreur && <p role="alert" className="mt-1.5 text-[13px] font-medium text-red-300">{erreur}</p>}
    </>
  );
  const contenuHeure = (
    <>
      {!semaine && c ? (
        // Un créneau gardé d'une offre passée : il ne s'applique plus, il se retire.
        <Reserve fonction="heure" phrase={`Ce bloc devait s’afficher ${decrireCreneau(c)}. Sans Hopla Pro, il s’affiche tout le temps.`}>
          <button type="button" onClick={() => maj({ creneau: null })} className="text-[13px] text-white/55 underline">Retirer le créneau</button>
        </Reserve>
      ) : (
        // Sept cases qui se cochent à plusieurs, chacune bordée : elles se lisent comme des boutons, sans la piste grise des segments (un seul choix).
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
              }} className={`min-h-11 rounded-[9px] border text-[14px] font-semibold transition duration-200 active:scale-95 bureau:min-h-8 bureau:rounded-lg bureau:text-[13px] ${actif ? 'border-bleu bg-bleu text-nuit' : 'border-white/15 text-white/70 hover:border-white/30 hover:text-white'}`}>{j}</button>
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
    </>
  );
  const contenuReseau = <ListeReseaux b={b} maj={maj} reseaux={reseaux} />;
  const contenuPays = <ChoixPays b={b} maj={maj} permis={paysPermis} />;
  if (compact) {
    const quand = datesCourtes(b.debut, b.fin);
    const ligne = (id: 'date' | 'heure' | 'reseau' | 'pays', titre: string, resume: string, regle: boolean, etiquette: ReactNode, contenu: ReactNode) => (
      <div key={id}>
        <LigneRepli sous titre={titre} etiquette={etiquette} resume={resume} regle={regle} ouvert={partie === id} controle={`visibilite-${id}`}
          onClick={() => setPartie(partie === id ? null : id)} />
        {partie === id && <div id={`visibilite-${id}`} className="pb-3 pl-4 pt-1">{contenu}</div>}
      </div>
    );
    return (
      // Une ligne n'écrit rien tant que rien n'est réglé, ce qui l'est se dit en bleu, comme « Plus de réglages » (critique série 2).
      <div className="flex flex-col [&>div>label>span]:text-white/70">
        {visible}
        {ligne('date', 'Selon la date', quand ? majuscule(quand) : '', !!quand, !dates && <Etiquette fonction="programmation" />, contenuDate)}
        {ligne('heure', 'Selon l’heure', semaine && c ? majuscule(decrireCreneau(c)) : '', !!(semaine && c), !semaine && <Etiquette fonction="heure" />, contenuHeure)}
        {ligne('reseau', 'Selon le réseau', resumeReseaux(b), !!resumeReseaux(b), null, contenuReseau)}
        {ligne('pays', 'Selon le pays', resumePays(b), !!resumePays(b), !paysPermis && <Etiquette fonction="pays" />, contenuPays)}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="adm-groupe px-4">{visible}</div>
      <Partie titre="Selon la date" etiquette={!dates && <Etiquette fonction="programmation" />}>{contenuDate}</Partie>
      <Partie titre="Selon l’heure" etiquette={!semaine && <Etiquette fonction="heure" />}>{contenuHeure}</Partie>
      <Partie titre="Selon le réseau">{contenuReseau}</Partie>
      <Partie titre="Selon le pays" etiquette={!paysPermis && <Etiquette fonction="pays" />}>{contenuPays}</Partie>
    </div>
  );
}

/** Ce que règle « Selon le pays », en peu de mots : « Seulement France et Belgique », « Sauf 4 pays ». */
const resumePays = (b: Bloc) => (b.pays?.codes.length ? `${b.pays.effet === 'seulement' ? 'Seulement' : 'Sauf'} ${listePays(b.pays.codes)}` : '');

const MODES_PAYS: { id: 'partout' | EffetPays; nom: string }[] = [{ id: 'partout', nom: 'Partout' }, { id: 'seulement', nom: 'Seulement' }, { id: 'sauf', nom: 'Sauf' }];

/**
 * Selon le pays du visiteur, lu chez Cloudflare (Pro) : partout, seulement dans les pays choisis, ou partout sauf eux. Les
 * pays choisis en lignes, chacun avec sa croix, puis un champ qui les cherche par leur nom (« belg », « états »). Ni drapeau
 * ni pastille : le nom seul. Un réglage gardé d'une offre passée ne s'applique plus, il se retire.
 */
function ChoixPays({ b, maj, permis }: { b: Bloc; maj: (c: Partial<Bloc>) => void; permis: boolean }) {
  const voir = useVoirOffres();
  const compact = useContext(RangeesCompactes);
  const codes = b.pays?.codes ?? [];
  // « Seulement » choisi sans pays encore : le choix tient ici, le bloc reste partout tant qu'aucun pays n'est pris.
  const [mode, setMode] = useState<'partout' | EffetPays>(b.pays?.effet ?? 'partout');
  const [mot, setMot] = useState('');
  if (!permis && b.pays) {
    return (
      <Reserve fonction="pays" phrase={`Ce bloc devait ${b.pays.effet === 'seulement' ? 's’afficher seulement' : 'se cacher'} pour les visiteurs de ces pays : ${listePays(b.pays.codes)}. Sans Hopla Pro, il s’affiche partout.`}>
        <button type="button" onClick={() => maj({ pays: null })} className="text-[13px] text-white/55 underline">Retirer le réglage</button>
      </Reserve>
    );
  }
  const changerMode = (m: 'partout' | EffetPays) => {
    if (!permis) { voir?.('pays'); return; }
    setMode(m);
    maj({ pays: m === 'partout' || !codes.length ? null : { codes, effet: m } });
  };
  const poser = (liste: string[]) => maj({ pays: liste.length && mode !== 'partout' ? { codes: liste, effet: mode } : null });
  const trouves = mot.trim() ? chercherPays(mot).filter(c => !codes.includes(c)).slice(0, 6) : [];
  const ajouter = (c: string) => { vibrer(4); poser([...codes, c]); setMot(''); };
  const rang = 'flex min-h-12 items-center gap-3 px-4 bureau:min-h-10 bureau:gap-2 bureau:px-3';
  return (
    <div className="flex flex-col gap-2.5">
      <Segments label="Selon le pays du visiteur" valeur={mode} options={MODES_PAYS} onChange={changerMode} />
      {mode !== 'partout' && (
        <div className="adm-groupe">
          {codes.length > 0 && (
            <ul className="divide-y divide-white/[0.06]" aria-label={mode === 'seulement' ? 'Affiché seulement dans ces pays' : 'Caché dans ces pays'}>
              {codes.map(c => (
                <li key={c} className={rang}>
                  <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-white bureau:text-[13.5px] bureau:font-normal">{nomPays(c)}</span>
                  <button type="button" onClick={() => { vibrer(6); poser(codes.filter(x => x !== c)); }} aria-label={`Retirer ${nomPays(c)}`} title="Retirer"
                    className="-mr-2 grid h-11 w-9 shrink-0 place-items-center text-white/45 transition hover:text-white bureau:h-8 bureau:w-7">
                    <Icone nom="ui-fermer" taille={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {codes.length < MAX_PAYS && (
            <div className={codes.length ? 'border-t border-white/[0.06]' : ''}>
              <label className={`${rang} adm-champ-ligne cursor-text`}>
                <Icone nom="ui-plus" taille={16} className="shrink-0 text-white/55" />
                <input value={mot} onChange={e => setMot(e.target.value)} placeholder={codes.length ? 'Ajouter un pays' : 'Chercher un pays'} aria-label="Chercher un pays"
                  autoComplete="off" autoCorrect="off" spellCheck={false}
                  onKeyDown={e => { if (e.key === 'Enter' && trouves[0]) { e.preventDefault(); ajouter(trouves[0]); } else if (e.key === 'Escape' && mot) { e.preventDefault(); e.stopPropagation(); setMot(''); } }}
                  className="min-w-0 flex-1 bg-transparent text-[16px] text-white outline-none placeholder:text-white/45 bureau:text-[13.5px]" />
              </label>
              {mot.trim() && (
                <ul className="divide-y divide-white/[0.06] border-t border-white/[0.06]" aria-label="Pays trouvés">
                  {trouves.length ? trouves.map(c => (
                    <li key={c}>
                      <button type="button" onClick={() => ajouter(c)} className={`${rang} w-full text-left text-[14.5px] text-white/85 transition hover:bg-white/[0.03] hover:text-white bureau:text-[13.5px]`}>{nomPays(c)}</button>
                    </li>
                  )) : <li className={`${rang} text-[13.5px] text-white/55`}>Aucun pays de ce nom.</li>}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
      {mode !== 'partout' && !compact && codes.length === 0 && <p className="text-[12.5px] leading-snug text-white/55">Tant qu’aucun pays n’est choisi, le bloc s’affiche partout.</p>}
    </div>
  );
}

/** Ce que « Selon le réseau » dit sans s'ouvrir : « Seulement Instagram », « En avant pour TikTok, masqué pour X », ou rien. */
function resumeReseaux(b: Bloc): string {
  const noms = (l: Audience[]) => l.map(s => NOMS_AUDIENCES[s]).join(', ');
  if (b.audience?.effet === 'seulement' && b.audience.sources.length) return `Seulement ${noms(b.audience.sources)}`;
  const avant = b.audience?.effet === 'avant' ? b.audience.sources : [];
  const cache = b.cache ?? [];
  return majuscule([avant.length ? `en avant pour ${noms(avant)}` : '', cache.length ? `masqué pour ${noms(cache)}` : ''].filter(Boolean).join(', '));
}

/**
 * Selon le réseau : une seule liste, chacun avec deux interrupteurs côte à côte, Affiché et En avant (en tête de la page,
 * mis en avant, pour ceux qui arrivent de là). Le réglage porte sur d'où vient le visiteur, pas sur le réseau où le bloc
 * serait publié : la colonne le dit, « Venus de » (23 octobre 2026). À tous, dès Gratuit : c'est la promesse de Hopla.
 */
function ListeReseaux({ b, maj, reseaux }: { b: Bloc; maj: (c: Partial<Bloc>) => void; reseaux: Audience[] }) {
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
      <ul className="divide-y divide-white/[0.06]" aria-label="Selon le réseau">
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
  const compact = useContext(RangeesCompactes);
  const majAcces = (champs: Partial<Acces>) => {
    const suite = { code: a?.code ?? '', places: a?.places ?? 0, ...champs };
    maj({ acces: suite.code || suite.places ? suite : null });
  };
  const resume = a ? [a.code ? `code « ${a.code} »` : '', a.places ? `${prises}/${a.places} places prises` : ''].filter(Boolean).join(', ') : '';
  if (!permis) return (
    <Repli id="acces" sous titre="Accès réservé" icone="cadenas" etiquette={<Etiquette fonction="drops" />} resume={a ? 'Pas montré' : ''} ouvert={false}>
      <Reserve fonction="drops" phrase={a ? 'Sans Hopla Pro, ce lien réservé n’est pas montré : son adresse serait sinon à la vue de tous.' : 'Avec Hopla Pro, un lien ne s’ouvre qu’avec un code, ou pour les premiers arrivés.'}>
        {a && <button type="button" onClick={() => { vibrer(6); maj({ acces: null }); }} className="text-[13px] text-white/55 underline">Retirer l’accès réservé</button>}
      </Reserve>
    </Repli>
  );
  return (
    <Repli id="acces" sous titre="Accès réservé" icone="cadenas" resume={resume || (compact ? '' : 'Ouvert à tous')} regle={!!a} ouvert={!!a || aOuvrir} montrer={aOuvrir}>
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
export function ChampsPreuve({ b, maj, erreurDe = () => undefined, lien }: { b: Bloc; maj: (c: Partial<Bloc>) => void; erreurDe?: (champ: string) => string | undefined; lien?: ReactNode }) {
  const p = b.preuve ?? { genre: 'note' as const, note: 0, nombre: 0, source: '' };
  const majP = (champs: Partial<Preuve>) => maj({ preuve: { ...p, ...champs } });
  // La note se tape comme on l'écrit (« 4,8 ») et ne se lit qu'en quittant le champ : rien ne s'arrondit sous les doigts.
  const [note, setNote] = useState(p.note ? String(p.note).replace('.', ',') : '');
  const [trop, setTrop] = useState(false);
  // Une note lue sur la page des avis (`LienAvis`) remplace ce qui était tapé.
  useEffect(() => { setNote(n => (lireNote(n) === p.note ? n : p.note ? String(p.note).replace('.', ',') : '')); }, [p.note]);
  const lireNote = (v: string) => { const n = Math.round(Number(v.replace(',', '.')) * 10) / 10; return Number.isFinite(n) ? Math.max(0, n) : 0; };
  return (
    <>
      <div>
        <span className="mb-1.5 block text-[13px] font-medium text-white/70">Type de preuve</span>
        <Segments label="Genre de preuve" valeur={p.genre} onChange={genre => maj({ preuve: { ...p, genre }, ...(genre !== 'note' && b.titre === TITRE_AVIS ? { titre: '' } : genre === 'note' && !b.titre.trim() ? { titre: TITRE_AVIS } : {}) })}
          options={[{ id: 'note', nom: 'Note' }, { id: 'compteur', nom: 'Chiffre' }, { id: 'temoignage', nom: 'Témoignage' }]} />
      </div>
      {/* Le lien des avis d'une note vient juste après le type : il remplit la note et le nombre dessous. */}
      {p.genre === 'note' && lien}
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
              placeholder="« Grâce à Camille, j’ai lancé ma boutique en deux semaines. »" />
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
