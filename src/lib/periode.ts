/*
 * La période des stats (22 octobre 2026, demandé par Lilian : « juste appuyer
 * pour avoir 7 jours, 14 jours », et choisir ses dates « d'une date A à une
 * date Z ») : les derniers jours, d'un toucher, ou des dates choisies dans un
 * calendrier. Les jours sont ceux de Paris, comme les événements qu'ils
 * comptent (colonne `jour` de la base) : le calendrier du navigateur et le
 * serveur s'arrêtent au même aujourd'hui. Un jour s'écrit `2026-10-12`, et ses
 * calculs se font en UTC, à l'abri des changements d'heure.
 */

/** Les périodes d'un toucher, en jours : chacune finit aujourd'hui. */
export const DUREES = [7, 14, 30, 90, 365] as const;

/** Des dates choisies, du premier au dernier jour compris. */
export interface Plage { du: string; au: string }

/** Ce que l'onglet Stats demande : les derniers jours (une des `DUREES`), ou une plage. */
export type PeriodeStats = number | Plage;

const PARIS = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Le jour de Paris d'un instant : `2026-10-22`. */
export function jourDe(ts: number): string {
  const p = Object.fromEntries(PARIS.formatToParts(ts).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

const JOUR = 86_400_000;
const enUTC = (jour: string) => Date.parse(`${jour}T00:00:00Z`);
const versJour = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Le jour `n` jours après (ou avant, `n` négatif). */
export const ajouterJours = (jour: string, n: number) => versJour(enUTC(jour) + n * JOUR);

/** Le nombre de jours de `du` à `au` (0 pour le même jour). */
export const joursEntre = (du: string, au: string) => Math.round((enUTC(au) - enUTC(du)) / JOUR);

/** Une vraie date au format `2026-10-12` : ni 31 septembre, ni `2026-9-3`. */
export function estJour(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const t = enUTC(v);
  return Number.isFinite(t) && versJour(t) === v;
}

/** Les jours que couvre une période : les derniers jours finissent aujourd'hui. */
export const plageDe = (p: PeriodeStats, aujourdhui: string): Plage =>
  (typeof p === 'number' ? { du: ajouterJours(aujourdhui, -(p - 1)), au: aujourdhui } : p);

/** Le nombre de jours d'une plage, le premier et le dernier compris. */
export const longueur = (p: Plage) => joursEntre(p.du, p.au) + 1;

/** La clé d'une période, pour comparer deux périodes ou les ranger : `30`, `2026-10-12/2026-10-18`. */
export const cleDe = (p: PeriodeStats) => (typeof p === 'number' ? String(p) : `${p.du}/${p.au}`);

/**
 * Une période venue du navigateur, lue sans lui faire confiance : une des
 * `DUREES`, ou deux vraies dates dans l'ordre. Rien sinon.
 */
export function lirePeriode(v: unknown): PeriodeStats | null {
  if (typeof v === 'number' || (typeof v === 'string' && /^\d{1,3}$/.test(v))) {
    const n = Number(v);
    return (DUREES as readonly number[]).includes(n) ? n : null;
  }
  if (!v || typeof v !== 'object') return null;
  const { du, au } = v as Record<string, unknown>;
  return estJour(du) && estJour(au) && du <= au ? { du, au } : null;
}

/** Le premier jour qu'un historique de `jours` laisse lire. */
export const premierJour = (jours: number, aujourdhui: string) => ajouterJours(aujourdhui, -(Math.max(1, jours) - 1));

/**
 * Une plage ramenée à l'historique d'un compte, ses `jours` jusqu'à aujourd'hui :
 * des dates qui en sortent se resserrent dessus. Rien quand il n'en reste aucun jour.
 */
export function borner(p: Plage, jours: number, aujourdhui: string): Plage | null {
  const premier = premierJour(jours, aujourdhui);
  const du = p.du < premier ? premier : p.du;
  const au = p.au > aujourdhui ? aujourdhui : p.au;
  return du <= au ? { du, au } : null;
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const morceaux = (jour: string) => ({ annee: jour.slice(0, 4), mois: Number(jour.slice(5, 7)) - 1, quantieme: Number(jour.slice(8, 10)) });

/** Le nom d'un mois et son année, pour le titre d'un calendrier : « Octobre 2026 ». */
export function nomMois(jour: string): string {
  const { annee, mois } = morceaux(jour);
  return `${MOIS[mois].charAt(0).toUpperCase()}${MOIS[mois].slice(1)} ${annee}`;
}

/**
 * Une plage en mots, avec l'année seulement quand ce n'est pas celle
 * d'aujourd'hui : « Le 12 octobre », « Du 1er au 18 octobre », « Du 28
 * septembre au 4 octobre », « Du 28 décembre 2025 au 4 janvier 2026 ».
 */
export function nomPlage({ du, au }: Plage, aujourdhui: string): string {
  const a = morceaux(du), b = morceaux(au);
  const cetteAnnee = aujourdhui.slice(0, 4);
  const jour = (m: ReturnType<typeof morceaux>) => (m.quantieme === 1 ? '1er' : String(m.quantieme));
  const annee = (m: ReturnType<typeof morceaux>) => (m.annee === cetteAnnee ? '' : ` ${m.annee}`);
  if (du === au) return `Le ${jour(a)} ${MOIS[a.mois]}${annee(a)}`;
  if (a.annee !== b.annee) return `Du ${jour(a)} ${MOIS[a.mois]} ${a.annee} au ${jour(b)} ${MOIS[b.mois]} ${b.annee}`;
  if (a.mois === b.mois) return `Du ${jour(a)} au ${jour(b)} ${MOIS[b.mois]}${annee(b)}`;
  return `Du ${jour(a)} ${MOIS[a.mois]} au ${jour(b)} ${MOIS[b.mois]}${annee(b)}`;
}

/** La même plage en peu de place, sur un bouton : « 12 oct. », « 12–18 oct. », « 28 sept. – 4 oct. ». */
export function nomCourt({ du, au }: Plage, aujourdhui: string): string {
  const a = morceaux(du), b = morceaux(au);
  const cetteAnnee = aujourdhui.slice(0, 4);
  const annee = (m: ReturnType<typeof morceaux>) => (m.annee === cetteAnnee ? '' : ` ${m.annee}`);
  if (du === au) return `${a.quantieme} ${MOIS_COURTS[a.mois]}${annee(a)}`;
  if (a.annee === b.annee && a.mois === b.mois) return `${a.quantieme}–${b.quantieme} ${MOIS_COURTS[b.mois]}${annee(b)}`;
  const finDu = a.annee === b.annee ? '' : ` ${a.annee}`;
  return `${a.quantieme} ${MOIS_COURTS[a.mois]}${finDu} – ${b.quantieme} ${MOIS_COURTS[b.mois]}${a.annee === b.annee ? annee(b) : ` ${b.annee}`}`;
}
