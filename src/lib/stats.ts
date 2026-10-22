import type { Stats } from './types.ts';

/*
 * Ce que l'onglet Stats calcule pour sa courbe : le chiffre de chaque jour
 * pour la mesure choisie, l'écart avec la période d'avant (en pourcentage,
 * en points pour un taux), et une échelle aux nombres ronds.
 */

export const MESURES = ['vues', 'visiteurs', 'clics', 'taux'] as const;
export type Mesure = (typeof MESURES)[number];
export const NOMS_MESURES: Record<Mesure, string> = { vues: 'Vues', visiteurs: 'Visiteurs', clics: 'Clics', taux: 'Taux de clic' };

type Jour = Stats['serie'][number];
type Totaux = Pick<Stats, 'vues' | 'visiteurs' | 'clics'>;

/** L'espace fine insécable qui précède « % » et sépare les milliers en français. */
const FINE = ' ';
/** Le vrai signe moins, pas le trait d'union. */
const MOINS = '−';

/** Le taux de clic en pourcentage arrondi ; null sans vue, il n'y a rien à mesurer. */
export const taux = (clics: number, vues: number) => (vues ? Math.round((clics / vues) * 100) : null);

/** Le chiffre d'un jour pour une mesure. Sur la courbe, le taux d'un jour sans vue vaut 0. */
export const valeurDuJour = (j: Jour, m: Mesure) => (m === 'taux' ? taux(j.clics, j.vues) ?? 0 : j[m]);

/** Le chiffre de toute la période (le taux de toute la période), null quand il n'y a rien à mesurer. */
export const totalDe = (s: Totaux, m: Mesure) => (m === 'taux' ? taux(s.clics, s.vues) : s[m]);

/** Un chiffre à la française : « 2 877 », « 38 % ». */
export const chiffre = (n: number, m: Mesure) => `${n.toLocaleString('fr-FR')}${m === 'taux' ? `${FINE}%` : ''}`;

/**
 * L'écart avec la période d'avant. `court` se lit à côté du chiffre (« −33 % »,
 * « +1 pt » pour le taux, « stable », « nouveau ») ; `long` le dit en entier
 * pour un lecteur d'écran. Rien quand il n'y a rien à comparer.
 */
export function ecart(s: Totaux & Pick<Stats, 'precedent'>, m: Mesure): { court: string; long: string } {
  const rien = { court: '', long: '' };
  if (m === 'taux') {
    const actuel = taux(s.clics, s.vues), avant = taux(s.precedent.clics, s.precedent.vues);
    if (actuel === null || avant === null) return rien;
    const d = actuel - avant;
    if (d === 0) return { court: 'stable', long: 'stable par rapport à la période d’avant' };
    const pts = `${Math.abs(d)}${FINE}${Math.abs(d) > 1 ? 'pts' : 'pt'}`;
    return { court: `${d > 0 ? '+' : MOINS}${pts}`, long: `${d > 0 ? 'en hausse' : 'en baisse'} de ${Math.abs(d)} point${Math.abs(d) > 1 ? 's' : ''} par rapport à la période d’avant` };
  }
  const actuel = s[m], avant = s.precedent[m];
  if (!avant) return actuel ? { court: 'nouveau', long: 'rien sur la période d’avant' } : rien;
  const e = Math.round(((actuel - avant) / avant) * 100);
  if (e === 0) return { court: 'stable', long: 'stable par rapport à la période d’avant' };
  return { court: `${e > 0 ? '+' : MOINS}${Math.abs(e)}${FINE}%`, long: `${e > 0 ? 'en hausse' : 'en baisse'} de ${Math.abs(e)}${FINE}% par rapport à la période d’avant` };
}

/**
 * Une échelle aux nombres ronds pour l'axe vertical : quatre intervalles au
 * plus, d'un pas de 1, 2, 2,5 ou 5 fois une puissance de dix (jamais 2,5 pour
 * des chiffres entiers sous 10). `haut` est la dernière graduation, au-dessus
 * ou au niveau du plus grand chiffre.
 */
export function graduation(max: number): { haut: number; pas: number } {
  if (max <= 4) return { haut: 4, pas: 1 };
  const brut = max / 4;
  const ordre = 10 ** Math.floor(Math.log10(brut));
  const pas = [1, 2, 2.5, 5, 10].map(k => k * ordre).filter(p => Number.isInteger(p)).find(p => p >= brut) ?? 10 * ordre;
  return { haut: Math.ceil(max / pas) * pas, pas };
}

/** Un point de la courbe : un jour, ou une semaine (`fin`, son dernier jour). */
export type Point = Jour & { fin?: string };

/**
 * Un an jour par jour fait une courbe en dents de scie : au-delà de 92 jours,
 * la courbe et son tableau passent à la semaine (les sommes de sept jours, le
 * taux recalculé dessus), la dernière finissant aujourd'hui. Une semaine
 * incomplète au début de la période est laissée de côté.
 */
export function parSemaine(serie: Jour[]): Point[] {
  const semaines: Point[] = [];
  for (let fin = serie.length; fin >= 7; fin -= 7) {
    const t = serie.slice(fin - 7, fin);
    const somme = (k: 'vues' | 'visiteurs' | 'clics') => t.reduce((n, j) => n + j[k], 0);
    semaines.unshift({ jour: t[0].jour, fin: t[6].jour, vues: somme('vues'), visiteurs: somme('visiteurs'), clics: somme('clics') });
  }
  return semaines;
}

/**
 * La couleur de chaque réseau dans « D'où viennent les visites », au back
 * office comme sur l'accueil (22 octobre 2026, demandé par Lilian) : son logo
 * dans la couleur de sa marque, et sa barre dans une teinte claire de cette
 * couleur, toutes de la même clarté, pour que le nom écrit dessus reste noir et
 * se lise (plus de 10:1). Une barre pleine ferait écrire le nom en blanc, et
 * une barre courte le couperait en deux couleurs. Le jaune de Snapchat, trop
 * clair pour un logo, le porte en noir, et sa barre reste plus claire que les
 * autres : assombri, il tournerait au kaki. Les provenances sans marque (Direct,
 * QR code, e-mail, newsletter, un site) restent grises.
 */
export const COULEURS_SOURCES: Record<string, { picto: string; barre: string }> = {
  Instagram: { picto: '#d62976', barre: '#f5c9dd' }, TikTok: { picto: '#111111', barre: '#d5d5d5' },
  YouTube: { picto: '#e00000', barre: '#f9cbcb' }, LinkedIn: { picto: '#0a66c2', barre: '#c1d8ef' },
  X: { picto: '#111111', barre: '#d5d5d5' }, Facebook: { picto: '#0866ff', barre: '#bcd6ff' },
  Threads: { picto: '#111111', barre: '#d5d5d5' }, Snapchat: { picto: '#0a0a0a', barre: '#fffd73' },
  Google: { picto: '#1a73e8', barre: '#bed7f8' },
};

/**
 * Les points qui portent une date sous la courbe : chaque jour jusqu'à 8,
 * une semaine sur 30, deux sur 90 ; par semaine, celle où commence un mois.
 */
export function reperes(points: Point[]): number[] {
  const n = points.length;
  const tous = points.map((_, i) => i);
  if (points[0]?.fin) return tous.filter(i => i > 0 && points[i].fin!.slice(0, 7) !== points[i - 1].fin!.slice(0, 7));
  if (n <= 8) return tous;
  const pas = n <= 31 ? 7 : 14;
  return tous.filter(i => i % pas === 0);
}
