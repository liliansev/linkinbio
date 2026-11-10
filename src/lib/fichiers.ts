/*
 * Les fichiers qu'une page garde chez Hopla, en plus des images (10 novembre 2026, lot 5 d'après Taap.it, demandé par
 * Lilian) : un document PDF (bloc `document`) et une note vocale (bloc `audio`). Le type se lit dans les premiers
 * octets du fichier, jamais dans son nom ni dans ce qu'annonce le navigateur.
 */

export const EXTENSIONS_AUDIO = ['mp3', 'm4a', 'ogg', 'webm', 'wav'] as const;
export type ExtensionAudio = (typeof EXTENSIONS_AUDIO)[number];
export type ExtensionFichier = 'pdf' | ExtensionAudio;

/** Dix mégaoctets par fichier : un PDF de quelques dizaines de pages, une note vocale d'une dizaine de minutes. */
export const MAX_FICHIER = 10 * 1024 * 1024;
/** Une note vocale enregistrée dans la page s'arrête seule au bout de cinq minutes. */
export const MAX_NOTE_VOCALE = 300;

export const MIME_FICHIER: Record<ExtensionFichier, string> = {
  pdf: 'application/pdf', mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg', webm: 'audio/webm', wav: 'audio/wav',
};

const ascii = (o: Uint8Array, de: number, a: number) => String.fromCharCode(...o.subarray(de, a));

/** Ce qu'est un fichier, d'après ses premiers octets ; null pour tout ce que la page ne sait pas montrer. */
export function typeFichier(o: Uint8Array): ExtensionFichier | null {
  if (o.length < 12) return null;
  if (ascii(o, 0, 5) === '%PDF-') return 'pdf';
  if (ascii(o, 0, 3) === 'ID3' || (o[0] === 0xff && (o[1] & 0xe0) === 0xe0)) return 'mp3';
  if (ascii(o, 4, 8) === 'ftyp') return 'm4a';
  if (ascii(o, 0, 4) === 'OggS') return 'ogg';
  if (o[0] === 0x1a && o[1] === 0x45 && o[2] === 0xdf && o[3] === 0xa3) return 'webm';
  if (ascii(o, 0, 4) === 'RIFF' && ascii(o, 8, 12) === 'WAVE') return 'wav';
  return null;
}

const DOCUMENT = /^\/media\/[\w-]{1,40}\.pdf$/;
const AUDIO = new RegExp(`^/media/[\\w-]{1,40}\\.(${EXTENSIONS_AUDIO.join('|')})$`);
/** L'adresse d'un PDF gardé chez Hopla (`/media/<id>.pdf`). */
export const estDocument = (v: unknown): v is string => typeof v === 'string' && DOCUMENT.test(v);
/** L'adresse d'un son gardé chez Hopla. */
export const estAudio = (v: unknown): v is string => typeof v === 'string' && AUDIO.test(v);

/** Une durée en secondes, telle qu'on la lit sur un lecteur : « 0:42 », « 3:05 ». */
export function dureeLisible(secondes: number): string {
  const s = Math.max(0, Math.round(secondes));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Une plage `Range: bytes=…` d'un fichier de `taille` octets : ses bornes, ou null si elle ne se sert pas. */
export function plage(entete: string | null, taille: number): { de: number; a: number } | null {
  const m = /^bytes=(\d*)-(\d*)$/.exec(entete?.trim() ?? '');
  if (!m || (!m[1] && !m[2]) || !taille) return null;
  // « -500 » : les 500 derniers octets.
  const de = m[1] ? Number(m[1]) : Math.max(0, taille - Number(m[2]));
  const a = m[1] && m[2] ? Math.min(Number(m[2]), taille - 1) : taille - 1;
  return de <= a && de < taille ? { de, a } : null;
}
