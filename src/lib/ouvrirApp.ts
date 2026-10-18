/*
 * Ouvrir un lien dans son app plutôt que dans le navigateur intégré
 * d'Instagram, de TikTok… Ces navigateurs ignorent les liens universels : un
 * lien YouTube y reste dans la vue web, sans compte connecté ni abonnement
 * possible. Sur Android, une adresse `intent://` nomme l'app par son paquet,
 * avec l'adresse web en repli si elle n'est pas installée. Sur iOS, le schéma
 * de l'app, quand on sait le construire ; la page repasse sur l'adresse web si
 * rien ne s'est ouvert. Dans Safari ou Chrome, rien ne change : ils ouvrent
 * déjà les apps d'eux-mêmes.
 */

/** Les navigateurs intégrés des apps où se partagent les pages de liens. */
const NAVIGATEUR_INTEGRE = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|musical_ly|BytedanceWebview|TikTok|LinkedInApp|Snapchat|Pinterest|Barcelona|Threads|Line\//i;

/** L'hôte du lien (sans `www.` ni `m.`) et le paquet Android de son app. */
const PAQUETS: [RegExp, string][] = [
  [/^music\.youtube\.com$/, 'com.google.android.apps.youtube.music'],
  [/^(youtube\.com|youtu\.be)$/, 'com.google.android.youtube'],
  [/^instagram\.com$/, 'com.instagram.android'],
  [/^tiktok\.com$/, 'com.zhiliaoapp.musically'],
  [/^open\.spotify\.com$/, 'com.spotify.music'],
  [/^(x|twitter)\.com$/, 'com.twitter.android'],
  [/^linkedin\.com$/, 'com.linkedin.android'],
  [/^(facebook\.com|fb\.me)$/, 'com.facebook.katana'],
  [/^threads\.(net|com)$/, 'com.instagram.barcelona'],
  [/^twitch\.tv$/, 'tv.twitch.android.app'],
  [/^snapchat\.com$/, 'com.snapchat.android'],
  [/^(pinterest\.(com|fr)|pin\.it)$/, 'com.pinterest'],
  [/^(wa\.me|whatsapp\.com|api\.whatsapp\.com)$/, 'com.whatsapp'],
  [/^t\.me$/, 'org.telegram.messenger'],
];

/** Sur iOS, le schéma de l'app pour les liens dont on connaît la traduction. */
function schemaIos(u: URL, hote: string): string | null {
  const segments = u.pathname.split('/').filter(Boolean);
  const seul = segments.length === 1 ? decodeURIComponent(segments[0]) : '';
  if (hote === 'youtu.be' && seul) return `youtube://www.youtube.com/watch?v=${encodeURIComponent(seul)}`;
  if (hote === 'youtube.com') return `youtube://www.youtube.com${u.pathname}${u.search}`;
  if (hote === 'open.spotify.com') {
    const [type, id] = segments[0]?.startsWith('intl-') ? segments.slice(1) : segments;
    if (type && id && /^(track|album|playlist|artist|show|episode)$/.test(type)) return `spotify:${type}:${id}`;
  }
  if (hote === 'instagram.com' && /^[\w.]+$/.test(seul)) return `instagram://user?username=${seul}`;
  if ((hote === 'x.com' || hote === 'twitter.com') && /^\w+$/.test(seul)) return `twitter://user?screen_name=${seul}`;
  if (hote === 'wa.me' && /^\d+$/.test(seul)) return `whatsapp://send?phone=${seul}${u.searchParams.has('text') ? `&text=${encodeURIComponent(u.searchParams.get('text')!)}` : ''}`;
  if (hote === 't.me' && /^\w+$/.test(seul)) return `tg://resolve?domain=${seul}`;
  return null;
}

/**
 * L'adresse qui ouvre ce lien dans son app, ou `null` pour le laisser tel quel :
 * hors navigateur intégré, hors Android et iOS, ou pour un site sans app connue.
 */
export function lienApp(url: string, userAgent: string): { adresse: string; repli: boolean } | null {
  if (!NAVIGATEUR_INTEGRE.test(userAgent)) return null;
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const hote = u.hostname.toLowerCase().replace(/^(www|m|mobile)\./, '');
  if (/Android/i.test(userAgent)) {
    const paquet = PAQUETS.find(([motif]) => motif.test(hote))?.[1];
    if (!paquet) return null;
    // Le repli est porté par l'adresse elle-même : Android ouvre le site si l'app manque.
    return { adresse: `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.slice(0, -1)};package=${paquet};S.browser_fallback_url=${encodeURIComponent(url)};end`, repli: false };
  }
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    const adresse = schemaIos(u, hote);
    return adresse ? { adresse, repli: true } : null;
  }
  return null;
}
