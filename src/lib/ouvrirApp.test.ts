import test from 'node:test';
import assert from 'node:assert/strict';
import { lienApp } from './ouvrirApp.ts';

const ANDROID_INSTA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 Instagram 350.0.0.0 Android';
const IOS_TIKTOK = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_36.0 BytedanceWebview/d8a21c6';
const IOS_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';

test('dans Safari ou Chrome, les liens restent tels quels', () => {
  assert.equal(lienApp('https://www.youtube.com/@lilian.sevoumian', IOS_SAFARI), null);
  assert.equal(lienApp('https://www.youtube.com/@lilian.sevoumian', ANDROID_CHROME), null);
});

test('Android : une adresse intent vers le paquet, le site en repli', () => {
  const r = lienApp('https://www.youtube.com/watch?v=abc123', ANDROID_INSTA)!;
  assert.equal(r.repli, false);
  assert.equal(r.adresse, `intent://www.youtube.com/watch?v=abc123#Intent;scheme=https;package=com.google.android.youtube;S.browser_fallback_url=${encodeURIComponent('https://www.youtube.com/watch?v=abc123')};end`);
  assert.match(lienApp('https://open.spotify.com/track/42', ANDROID_INSTA)!.adresse, /package=com\.spotify\.music;/);
  assert.match(lienApp('https://music.youtube.com/playlist?list=x', ANDROID_INSTA)!.adresse, /package=com\.google\.android\.apps\.youtube\.music;/);
  assert.equal(lienApp('https://liliansevoumian.fr/contact', ANDROID_INSTA), null, 'un site sans app reste dans le navigateur');
  assert.equal(lienApp('mailto:bonjour@exemple.fr', ANDROID_INSTA), null);
  assert.equal(lienApp('https://evil-youtube.com/x', ANDROID_INSTA), null, 'seul le vrai domaine compte');
});

test('iOS : le schéma de l’app quand on sait le construire', () => {
  assert.deepEqual(lienApp('https://youtu.be/abc123', IOS_TIKTOK), { adresse: 'youtube://www.youtube.com/watch?v=abc123', repli: true });
  assert.equal(lienApp('https://www.youtube.com/@lilian.sevoumian', IOS_TIKTOK)!.adresse, 'youtube://www.youtube.com/@lilian.sevoumian');
  assert.equal(lienApp('https://open.spotify.com/intl-fr/album/9z?si=1', IOS_TIKTOK)!.adresse, 'spotify:album:9z');
  assert.equal(lienApp('https://www.instagram.com/lilian.sevoumian/', IOS_TIKTOK)!.adresse, 'instagram://user?username=lilian.sevoumian');
  assert.equal(lienApp('https://www.instagram.com/p/Cxyz/', IOS_TIKTOK), null, 'un post Instagram reste sur le web');
  assert.equal(lienApp('https://x.com/liliansev', IOS_TIKTOK)!.adresse, 'twitter://user?screen_name=liliansev');
  assert.equal(lienApp('https://wa.me/33600000000?text=Salut', IOS_TIKTOK)!.adresse, 'whatsapp://send?phone=33600000000&text=Salut');
  assert.equal(lienApp('https://t.me/hopla', IOS_TIKTOK)!.adresse, 'tg://resolve?domain=hopla');
  assert.equal(lienApp('https://www.linkedin.com/in/lilian', IOS_TIKTOK), null);
});

test('le nom de l’app d’un lien, pour le back office et les stats', async () => {
  const { appDe } = await import('./ouvrirApp.ts');
  assert.equal(appDe('https://www.youtube.com/watch?v=abc'), 'YouTube');
  assert.equal(appDe('https://open.spotify.com/track/1'), 'Spotify');
  assert.equal(appDe('https://exemple.fr/'), null);
  assert.equal(appDe('mailto:a@b.fr'), null);
});
