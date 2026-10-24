/*
 * Les lecteurs qui s'ouvrent dans la page (24 octobre 2026, d'après Linktree) : une vidéo YouTube, Vimeo ou TikTok, un
 * titre, un album, une playlist ou un podcast sur Spotify, Apple Music, Apple Podcasts, Deezer ou SoundCloud. Seule
 * l'adresse compte : chacun a son adresse d'intégration, que la page ne charge qu'au toucher du visiteur (rien d'un
 * tiers avant le geste, comme l'agenda). Une adresse courte (spoti.fi, on.soundcloud.com, vm.tiktok.com) ne dit pas
 * ce qu'elle cache : elle reste un lien.
 */
import { idYoutube } from './types.ts';

/** Les services, nommés comme leur logo dans `icones.ts`. */
export type Service = 'youtube' | 'vimeo' | 'tiktok' | 'spotify' | 'applemusic' | 'applepodcasts' | 'deezer' | 'soundcloud';

/**
 * Un lecteur : son service, l'adresse à charger, et sa forme. `video` : 16:9 ; `vertical` : une vidéo TikTok, 9:16 ;
 * sinon la hauteur fixe d'un lecteur audio, en pixels (un titre est court, un album montre sa liste).
 */
export interface Lecteur { service: Service; adresse: string; forme: 'video' | 'vertical' | number; nom: string }

export const NOMS_SERVICES: Record<Service, string> = {
  youtube: 'YouTube', vimeo: 'Vimeo', tiktok: 'TikTok', spotify: 'Spotify', applemusic: 'Apple Music', applepodcasts: 'Apple Podcasts', deezer: 'Deezer', soundcloud: 'SoundCloud',
};
export const SERVICES_VIDEO: readonly Service[] = ['youtube', 'vimeo', 'tiktok'];

const lire = (url: string) => { try { const u = new URL(url); return /^https?:$/.test(u.protocol) ? u : null; } catch { return null; } };
const hoteDe = (u: URL) => u.hostname.toLowerCase().replace(/^(www|m)\./, '');

/** Le lecteur d'une adresse, ou null si elle n'en a pas. */
export function lecteurDe(url: string): Lecteur | null {
  const u = lire(url);
  if (!u) return null;
  const h = hoteDe(u);
  const c = u.pathname.split('/').filter(Boolean);
  const yt = idYoutube(url);
  if (yt) return { service: 'youtube', adresse: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`, forme: 'video', nom: NOMS_SERVICES.youtube };
  if (h === 'vimeo.com' || h === 'player.vimeo.com') {
    // vimeo.com/76979871, vimeo.com/76979871/abcd1234 (une vidéo non répertoriée et sa clé), vimeo.com/channels/x/76979871.
    const i = c.findIndex(p => /^\d{5,12}$/.test(p));
    if (i < 0) return null;
    const cle = c[i + 1] && /^[\da-f]{6,20}$/i.test(c[i + 1]) ? `&h=${c[i + 1]}` : u.searchParams.get('h') ? `&h=${encodeURIComponent(u.searchParams.get('h')!)}` : '';
    return { service: 'vimeo', adresse: `https://player.vimeo.com/video/${c[i]}?dnt=1&autoplay=1${cle}`, forme: 'video', nom: NOMS_SERVICES.vimeo };
  }
  if (h === 'tiktok.com') {
    const i = c.indexOf('video');
    const id = i >= 0 ? c[i + 1] : '';
    return id && /^\d{8,25}$/.test(id) ? { service: 'tiktok', adresse: `https://www.tiktok.com/player/v1/${id}?autoplay=1&rel=0`, forme: 'vertical', nom: NOMS_SERVICES.tiktok } : null;
  }
  if (h === 'open.spotify.com') {
    const d = /^intl-/.test(c[0] ?? '') ? c.slice(1) : c;
    const [genre, id] = d;
    if (!['track', 'album', 'playlist', 'episode', 'show', 'artist'].includes(genre) || !/^[A-Za-z0-9]{10,40}$/.test(id ?? '')) return null;
    return { service: 'spotify', adresse: `https://open.spotify.com/embed/${genre}/${id}`, forme: genre === 'track' || genre === 'episode' ? 152 : 352, nom: NOMS_SERVICES.spotify };
  }
  if (h === 'music.apple.com' || h === 'podcasts.apple.com') {
    const podcast = h === 'podcasts.apple.com';
    // music.apple.com/fr/album/nom/123?i=456 : un titre de l'album ; podcasts.apple.com/fr/podcast/nom/id123?i=456 : un épisode.
    const pays = /^[a-z]{2}$/.test(c[0] ?? '') ? 1 : 0;
    const genre = c[pays];
    if (podcast ? genre !== 'podcast' : !['album', 'playlist', 'song', 'music-video'].includes(genre ?? '')) return null;
    if (c.length < pays + 2) return null;
    const un = genre === 'song' || u.searchParams.has('i');
    const garde = u.searchParams.get('i');
    return {
      service: podcast ? 'applepodcasts' : 'applemusic',
      adresse: `https://${podcast ? 'embed.podcasts' : 'embed.music'}.apple.com${u.pathname}${garde ? `?i=${encodeURIComponent(garde)}` : ''}`,
      forme: un ? 175 : 450, nom: NOMS_SERVICES[podcast ? 'applepodcasts' : 'applemusic'],
    };
  }
  if (h === 'deezer.com') {
    const d = /^[a-z]{2}$/.test(c[0] ?? '') ? c.slice(1) : c;
    const [genre, id] = d;
    if (!['track', 'album', 'playlist', 'artist', 'show', 'episode'].includes(genre) || !/^\d{1,15}$/.test(id ?? '')) return null;
    return { service: 'deezer', adresse: `https://widget.deezer.com/widget/auto/${genre}/${id}`, forme: genre === 'track' || genre === 'episode' ? 152 : 352, nom: NOMS_SERVICES.deezer };
  }
  if (h === 'soundcloud.com') {
    // soundcloud.com/artiste/titre ou soundcloud.com/artiste/sets/album ; le profil seul, ses pages à lui (« you », « discover »), non.
    if (c.length < 2 || ['you', 'discover', 'search', 'stream', 'upload', 'pages', 'charts', 'terms-of-use'].includes(c[0])) return null;
    const liste = c[1] === 'sets' && !!c[2];
    if (c[1] === 'sets' && !liste) return null;
    if (!liste && ['tracks', 'albums', 'sets', 'reposts', 'likes', 'followers', 'following', 'popular-tracks', 'comments'].includes(c[1])) return null;
    const propre = `https://soundcloud.com/${c.slice(0, liste ? 3 : 2).join('/')}`;
    return { service: 'soundcloud', adresse: `https://w.soundcloud.com/player/?url=${encodeURIComponent(propre)}&auto_play=true&visual=false&show_comments=false`, forme: liste ? 352 : 166, nom: NOMS_SERVICES.soundcloud };
  }
  return null;
}

/** Une adresse qu'un bloc vidéo lit dans la page : YouTube, Vimeo ou TikTok. */
export const estVideo = (url: string) => { const l = lecteurDe(url); return !!l && SERVICES_VIDEO.includes(l.service); };
/** Une adresse qu'un bloc musique lit dans la page : Spotify, Apple Music, Apple Podcasts, Deezer ou SoundCloud. */
export const estMusique = (url: string) => { const l = lecteurDe(url); return !!l && !SERVICES_VIDEO.includes(l.service); };
