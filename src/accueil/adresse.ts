/*
 * Une faute dans le domaine d'une adresse e-mail (« gmial.com », « hotmail.fe »)
 * envoie le lien de la page dans le vide, et le nom choisi avec. Avant l'envoi,
 * l'accueil propose donc le domaine courant le plus proche, sans jamais
 * corriger tout seul : une adresse rare mais juste doit pouvoir partir.
 */

const COURANTS = [
  'gmail.com', 'hotmail.com', 'hotmail.fr', 'outlook.com', 'outlook.fr', 'live.com', 'live.fr', 'msn.com',
  'yahoo.com', 'yahoo.fr', 'icloud.com', 'me.com', 'orange.fr', 'wanadoo.fr', 'free.fr', 'sfr.fr', 'neuf.fr',
  'laposte.net', 'bbox.fr', 'gmx.fr', 'gmx.com', 'aol.com', 'protonmail.com', 'proton.me',
];
/** Des domaines justes à l'œil, mais qui n'existent pas. */
const CONNUS: Record<string, string> = { 'gmail.fr': 'gmail.com', 'icloud.fr': 'icloud.com', 'googlemail.fr': 'gmail.com' };

/** La distance de Damerau-Levenshtein : une lettre en trop, en moins, changée ou deux lettres inversées comptent pour un. */
function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** L'adresse corrigée si son domaine ressemble de près à un domaine courant, sinon null. */
export function adresseSuggeree(saisie: string): string | null {
  const email = saisie.trim().toLowerCase();
  const m = /^([^\s@]+)@([^\s@]+\.[a-z]{2,})$/.exec(email);
  if (!m) return null;
  const [, local, domaine] = m;
  if (COURANTS.includes(domaine)) return null;
  if (CONNUS[domaine]) return `${local}@${CONNUS[domaine]}`;
  // Un écart d'une lettre sur un domaine court, de deux au-delà de huit lettres.
  let meilleur: string | null = null, plusPres = Infinity;
  for (const c of COURANTS) {
    const n = distance(domaine, c);
    if (n < plusPres && n <= (c.length >= 8 ? 2 : 1)) { meilleur = c; plusPres = n; }
  }
  return meilleur ? `${local}@${meilleur}` : null;
}

/**
 * Ce qu'on colle dans le champ du nom : une adresse entière ne garde que son
 * nom, le premier morceau de son chemin (hopla.page/marie, https://linktr.ee/marie,
 * instagram.com/@marie), et une adresse e-mail ce qui précède son @.
 */
export function nomDansAdresse(valeur: string): string {
  const v = valeur.trim();
  if (/^(?:https?:\/\/)?(?:www\.)?hopla\.page\/*$/i.test(v)) return '';
  const chemin = v.match(/^(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\/+@?([^/?#\s]+)/i);
  if (chemin) return chemin[1];
  const courriel = v.match(/^([^\s@/]+)@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i);
  return courriel ? courriel[1] : valeur;
}
