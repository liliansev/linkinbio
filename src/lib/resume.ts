import type { Stats } from './types.ts';

/*
 * Les statistiques en quelques phrases, plutôt qu'en graphiques : ce qui a
 * bougé, d'où vient le monde, le jour qui a compté. Rien n'est dit sur trop
 * peu de chiffres : une hausse de 2 à 3 clics n'est pas une nouvelle.
 */

const nombre = (n: number) => n.toLocaleString('fr-FR');
const pourcent = (actuel: number, avant: number) => Math.round(((actuel - avant) / avant) * 100);
const periode = (jours: number) => (jours === 7 ? 'la semaine d’avant' : `les ${jours} jours d’avant`);
const pluriel = (n: number, mot: string) => `${nombre(n)} ${mot}${n > 1 ? 's' : ''}`;

export interface Phrase { texte: string; ton: 'hausse' | 'baisse' | 'neutre' }

export function resumer(s: Stats): Phrase[] {
  const phrases: Phrase[] = [];
  if (!s.vues) return [{ texte: s.jours === 7 ? 'Pas encore de visite cette semaine. Partage ton lien en bio pour lancer la machine.' : 'Pas encore de visite sur cette période.', ton: 'neutre' }];

  // L'ensemble.
  if (s.precedent.vues >= 10) {
    const e = pourcent(s.vues, s.precedent.vues);
    if (Math.abs(e) >= 10) phrases.push({ texte: `Ta page a eu ${pluriel(s.vues, 'vue')}, ${e > 0 ? `${e} % de plus` : `${-e} % de moins`} que ${periode(s.jours)}.`, ton: e > 0 ? 'hausse' : 'baisse' });
    else phrases.push({ texte: `Ta page tient le rythme : ${pluriel(s.vues, 'vue')}, comme ${periode(s.jours)}.`, ton: 'neutre' });
  } else phrases.push({ texte: `Ta page a eu ${pluriel(s.vues, 'vue')} et ${pluriel(s.clics, 'clic')}.`, ton: 'neutre' });

  // Le lien qui bouge le plus (au moins 5 clics, et un écart qui compte).
  const lien = s.blocs
    .filter(b => b.clics >= 5 && b.titre !== 'Bloc supprimé')
    .map(b => ({ ...b, ecart: b.avant ? pourcent(b.clics, b.avant) : Infinity }))
    .filter(b => b.ecart === Infinity ? b.clics >= 8 : b.avant >= 3 && Math.abs(b.ecart) >= 25)
    .sort((a, b) => Math.abs(b.clics - b.avant) - Math.abs(a.clics - a.avant))[0];
  if (lien) {
    const nom = `« ${lien.titre.length > 40 ? `${lien.titre.slice(0, 39)}…` : lien.titre} »`;
    if (lien.ecart === Infinity) phrases.push({ texte: `${nom} démarre fort : ${pluriel(lien.clics, 'clic')}.`, ton: 'hausse' });
    else phrases.push({ texte: `Ton lien ${nom} a fait ${lien.ecart > 0 ? '+' : ''}${lien.ecart} % de clics (${nombre(lien.clics)} contre ${nombre(lien.avant)}).`, ton: lien.ecart > 0 ? 'hausse' : 'baisse' });
  }

  // Le jour qui a compté : nettement au-dessus de la moyenne.
  const moyenne = s.vues / s.serie.length;
  const pic = s.serie.reduce((a, b) => (b.vues > a.vues ? b : a), s.serie[0]);
  if (s.serie.length >= 5 && pic.vues >= 10 && pic.vues >= moyenne * 1.8) {
    const jour = new Date(`${pic.jour}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    phrases.push({ texte: `Ton meilleur jour : ${jour}, avec ${pluriel(pic.vues, 'vue')}. Un post ce jour-là ?`, ton: 'hausse' });
  }

  // D'où vient le monde.
  const source = s.sources.find(x => x.nom !== 'Direct');
  if (source && source.vues >= 5) {
    const part = Math.round((source.vues / s.vues) * 100);
    const double = source.avant >= 3 && source.vues >= 2 * source.avant;
    phrases.push({ texte: double ? `${source.nom} t’a amené ${pluriel(source.vues, 'visite')}, deux fois plus que ${periode(s.jours)}.` : `${source.nom} t’amène le plus de monde : ${part} % des visites.`, ton: double ? 'hausse' : 'neutre' });
  }

  if (s.apps.ouverts >= 3) phrases.push({ texte: `${pluriel(s.apps.ouverts, 'clic')} se sont ouverts directement dans leur app, sans rester coincés dans Instagram ou TikTok.`, ton: 'neutre' });

  return phrases.slice(0, 4);
}

/** « la semaine d’avant », « les 30 jours d’avant », « l’année d’avant ». */
const avantPeriode = (jours: number) => (jours === 365 ? 'l’année d’avant' : periode(jours));
/** D'où vient le monde, en mots : « Instagram t’amène… », « ton QR code t’amène… », « les e-mails t’amènent… ». */
const AMENE: Record<string, string> = { 'QR code': 'ton QR code t’amène', Newsletter: 'ta newsletter t’amène', 'E-mail': 'les e-mails t’amènent' };

/**
 * Les stats en une seule phrase, en tête de l'onglet (Lilian, 20 octobre 2026) :
 * le total, ce qui a bougé s'il y a de quoi comparer, et d'où vient le monde.
 * « En 30 jours, ta page a eu 2 877 vues, 33 % de moins que les 30 jours d’avant,
 * et Instagram t’amène le plus de monde. »
 */
export function enUnePhrase(s: Stats): string {
  const sur = s.jours === 365 ? 'En un an' : `En ${s.jours} jours`;
  if (!s.vues) return `${sur}, pas encore de visite. Partage ton lien en bio pour lancer la machine.`;
  let comparaison = '';
  if (s.precedent.vues >= 10) {
    const e = pourcent(s.vues, s.precedent.vues);
    comparaison = Math.abs(e) >= 10 ? `${Math.abs(e)}\u202f% de ${e > 0 ? 'plus' : 'moins'} que ${avantPeriode(s.jours)}` : `à peu près autant que ${avantPeriode(s.jours)}`;
  }
  const source = s.sources.find(x => x.nom !== 'Direct' && x.vues >= 5);
  const qui = source ? `${AMENE[source.nom] ?? `${source.nom} t’amène`} le plus de monde` : '';
  const debut = `${sur}, ta page a eu ${pluriel(s.vues, 'vue')}`;
  if (comparaison) return `${debut}, ${comparaison}${qui ? `, et ${qui}` : ''}.`;
  return `${debut} et ${qui || pluriel(s.clics, 'clic')}.`;
}
