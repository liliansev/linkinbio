// Le site d'une page d'avis, d'après son adresse : le serveur le pose sous la note lue, l'éditeur sous la note tapée.

/** Le nom à montrer sous la note, d'après le site des avis ; sinon celui que la page se donne, ou rien. */
const SITES: [RegExp, string][] = [
  [/(^|\.)trustpilot\.[a-z.]+$/, 'Trustpilot'],
  [/(^|\.)(avis-verifies\.com|netreviews\.com)$/, 'Avis Vérifiés'],
  [/(^|\.)malt\.[a-z.]+$/, 'Malt'],
  [/(^|\.)google\.[a-z.]+$|^g\.page$|^maps\.app\.goo\.gl$/, 'Google'],
  [/(^|\.)tripadvisor\.[a-z.]+$/, 'Tripadvisor'],
  [/(^|\.)yelp\.[a-z.]+$/, 'Yelp'],
  [/(^|\.)etsy\.com$/, 'Etsy'],
  [/(^|\.)societe-des-avis-garantis\.fr$|(^|\.)guaranteed-reviews\.com$/, 'Avis Garantis'],
];
export function sourceDe(url: string): string {
  let hote = '';
  try { hote = new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; }
  return SITES.find(([motif]) => motif.test(hote))?.[1] ?? '';
}
