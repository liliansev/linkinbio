/*
 * Les pays d'un visiteur (24 octobre 2026, lot 4 venu de Linktree) : Cloudflare dit d'où il vient (`CF-IPCountry`,
 * deux lettres), et un bloc peut ne s'afficher que pour quelques pays, ou partout sauf eux (Pro). Les codes ISO 3166-1,
 * Kosovo compris (XK, que Cloudflare emploie) ; les noms viennent du navigateur ou de Node, en français.
 */

export const PAYS = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD',
  'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY', 'BZ', 'CA',
  'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE',
  'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA',
  'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK',
  'HM', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP',
  'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT',
  'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS',
  'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ',
  'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS',
  'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST',
  'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW',
  'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'XK', 'YE', 'YT',
  'ZA', 'ZM', 'ZW',
] as const;

const CODES = new Set<string>(PAYS);
export const estPays = (code: unknown): code is string => typeof code === 'string' && CODES.has(code);

let noms: Intl.DisplayNames | null = null;
/** Le nom d'un pays en français (« Belgique »), son code s'il n'en a pas. */
export function nomPays(code: string): string {
  try { return (noms ??= new Intl.DisplayNames(['fr'], { type: 'region' })).of(code) ?? code; } catch { return code; }
}

/** Les pays rangés par leur nom, sans tenir compte des accents (« Égypte » avec les E). */
export const paysParNom = () => [...PAYS].sort((a, b) => nomPays(a).localeCompare(nomPays(b), 'fr', { sensitivity: 'base' }));

/** Chercher un pays par son nom ou son code, sans accents ni majuscules : « belg », « etats », « US ». */
export function chercherPays(mot: string): string[] {
  const plat = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const m = plat(mot.trim());
  if (!m) return paysParNom();
  return paysParNom().filter(c => plat(nomPays(c)).split(/[\s'’-]+/).some(w => w.startsWith(m)) || plat(nomPays(c)).startsWith(m) || c.toLowerCase() === m);
}

/**
 * Un bloc s'affiche-t-il pour un visiteur de ce pays (`''` : on ne sait pas, en local ou hors de Cloudflare) ? Un bloc
 * réservé à quelques pays ne se montre pas à qui n'a pas de pays connu ; un bloc « sauf » se montre.
 */
export function pourPays(b: { pays?: { codes: string[]; effet: 'seulement' | 'sauf' } | null }, code: string): boolean {
  if (!b.pays?.codes.length) return true;
  const dedans = !!code && b.pays.codes.includes(code);
  return b.pays.effet === 'seulement' ? dedans : !dedans;
}

/** « France, Belgique et Suisse », « 5 pays ». */
export function listePays(codes: string[]): string {
  if (codes.length > 3) return `${codes.length} pays`;
  const noms = codes.map(nomPays);
  return noms.length > 1 ? `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}` : noms[0] ?? '';
}
