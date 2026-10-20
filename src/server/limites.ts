import { isIP } from 'node:net';

/*
 * Les limites anti-abus, en mémoire : combien de fois une même clé (une
 * adresse IP, une adresse e-mail) a servi dans une fenêtre de temps. Une
 * adresse IPv6 compte pour son /64 : un abonné en reçoit des milliards, qu'il
 * peut faire tourner à chaque requête. Plein, le registre oublie d'abord les
 * clés expirées, puis les plus anciennes ; il ne se vide jamais d'un coup, ce
 * qui rendrait la main à tout le monde, à commencer par qui l'a rempli.
 */

/** Les groupes d'une moitié d'IPv6 ; une IPv4 glissée à la fin en vaut deux. */
const groupes = (moitie: string) => (moitie ? moitie.split(':') : []).flatMap(g => (g.includes('.') ? ['0', '0'] : [g]));

/** La clé d'une adresse IP : une IPv4 telle quelle (y compris glissée dans une IPv6), le /64 d'une IPv6. */
export function cleIp(ip: string): string {
  const brute = ip.trim().toLowerCase().replace(/%.*$/, '');
  const v4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(brute);
  if (v4) return v4[1];
  if (isIP(brute) !== 6) return brute;
  const [tete, queue] = brute.split('::');
  const gauche = groupes(tete);
  const droite = queue === undefined ? [] : groupes(queue);
  const tous = [...gauche, ...Array(Math.max(0, 8 - gauche.length - droite.length)).fill('0'), ...droite];
  return `${tous.slice(0, 4).map(g => g.replace(/^0+(?=.)/, '')).join(':')}::/64`;
}

/** Au-delà, un registre oublie : de quoi tenir une attaque répartie sans remplir la mémoire. */
const PLAFOND = 20_000;

/**
 * Un compteur à fenêtres glissantes : `limiteur([3, HEURE])` laisse passer
 * trois fois par heure, `limiteur([5, HEURE], [10, JOUR])` cinq par heure et
 * dix par jour. Il répond vrai quand c'est trop, et ne compte alors pas la
 * tentative refusée.
 */
export function limiteur(...regles: [max: number, fenetre: number][]) {
  const plusLongue = Math.max(...regles.map(([, fenetre]) => fenetre));
  const vus = new Map<string, number[]>();
  return (cle: string, maintenant = Date.now()): boolean => {
    const recents = (vus.get(cle) ?? []).filter(t => maintenant - t < plusLongue);
    if (regles.some(([max, fenetre]) => recents.filter(t => maintenant - t < fenetre).length >= max)) {
      vus.set(cle, recents);
      return true;
    }
    recents.push(maintenant);
    // Remise en fin de registre : la tête garde les clés servies il y a le plus longtemps, les expirées d'abord.
    vus.delete(cle);
    vus.set(cle, recents);
    for (const [k, l] of vus) {
      if (vus.size <= PLAFOND && maintenant - l[l.length - 1] < plusLongue) break;
      vus.delete(k);
    }
    return false;
  };
}

export const MINUTE = 60_000;
export const HEURE = 3_600_000;
export const JOUR = 86_400_000;

const courriels = limiteur([5, HEURE], [10, JOUR]);

/**
 * Un e-mail qu'un inconnu peut faire partir vers une adresse qui n'est pas la
 * sienne (rappel, bienvenue, correction, accusé de réception) : cinq par heure
 * et dix par jour au plus vers une même adresse. Vrai quand c'est trop : rien
 * ne part, et personne ne se sert de Hopla pour inonder une boîte.
 */
export const destinataireSature = (adresse: string, maintenant = Date.now()) => courriels(adresse.trim().toLowerCase(), maintenant);
