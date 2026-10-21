import test from 'node:test';
import assert from 'node:assert/strict';
import { DUREE_SUITE, lienDeSuite, minuteDe, sortieDuNavigateur, suiteRecente } from './sortie.ts';

// Des user agents relevés dans les apps (inapp-spy, inappdebugger.com).
const IOS_LINKEDIN = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.30.1753';
const IOS_INSTA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22F76 Instagram 393.1.0.36.70 (iPhone15,3; iOS 18_5; fr_FR; fr; scale=3.00; 1290x2796; IABMV/1; 776538208) Safari/604.1';
const IOS_FACEBOOK = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22B83 [FBAN/FBIOS;FBAV/488.0.0.68.101;FBBV/658219612;FBDV/iPhone12,8;FBMD/iPhone;FBSN/iOS;FBSV/18.1;FBSS/2;FBID/phone;FBLC/fr_FR;FBOP/5;FBRV/0;IABMV/1]';
const IOS_FACEBOOK_META = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22G100 Safari/604.1 MetaIAB Facebook';
const IOS_MESSENGER = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/440.0.0.31.105;FBBV/552817310;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.2;FBSS/3;FBCR/;FBID/phone;FBLC/fr_FR;FBOP/0]';
const IOS_THREADS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Barcelona 355.0.0.39.109 (iPhone15,2; iOS 18_0; fr_FR; fr; scale=3.00; 1179x2556; 657318936)';
const IOS_TIKTOK = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 BytedanceWebview/d8a21c6 musical_ly_33.2.1 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/fr Region/FR';
const IOS_X = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Twitter for iPhone/10.60';
const IOS_SNAPCHAT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/13.10.0.40 (like Safari/8618.1.15.10.15, panda)';
const IOS_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const ANDROID_INSTA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240905.003; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.58 Mobile Safari/537.36 Instagram 355.1.0.44.103 Android (34/14; 420dpi; 1080x2205; Google/google; Pixel 8; shiba; shiba; fr_FR; 658190016)';
const ANDROID_FACEBOOK = 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240905.003; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.83 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/488.0.0.62.79;IABMV/1;]';
const ANDROID_THREADS = 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240905.003; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.58 Mobile Safari/537.36 Barcelona 355.0.0.39.109 Android (34/14; 420dpi; 1080x2205; Google/google; Pixel 8; shiba; shiba; fr_FR; 657318936)';
const ANDROID_TIKTOK = 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UQ1A.240105.004; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/121.0.6167.143 Mobile Safari/537.36 musical_ly_2023303040 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/33.3.4 BytedanceWebview/d8a21c6';
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const MAC_SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';

const INSTANT = Date.UTC(2026, 9, 21, 12, 0, 30);
const MINUTE = minuteDe(INSTANT);
const LIEN = `https://hopla.page/camille?s=linkedin&suite=${MINUTE}`;

test('la page rouverte garde sa provenance et dit que la visite est comptée, à la minute près', () => {
  assert.equal(lienDeSuite('https://hopla.page/camille', 'linkedin', INSTANT), LIEN);
  assert.equal(lienDeSuite('https://hopla.page/camille', 'nl', INSTANT), `https://hopla.page/camille?s=nl&suite=${MINUTE}`, 'le paramètre de la bio, tel quel');
  assert.equal(lienDeSuite('https://hopla.page/camille', '', INSTANT), `https://hopla.page/camille?suite=${MINUTE}`);
});

test('le repère périme : un lien copié puis partagé redevient une visite comme une autre', () => {
  const plus = (minutes: number) => INSTANT + minutes * 60_000;
  assert.equal(suiteRecente(MINUTE, INSTANT), true, 'tout de suite');
  assert.equal(suiteRecente(String(MINUTE), plus(DUREE_SUITE - 1)), true, 'lu dans l’adresse, juste avant la fin');
  assert.equal(suiteRecente(MINUTE, plus(DUREE_SUITE)), false, 'quinze minutes après');
  assert.equal(suiteRecente(MINUTE + 1, INSTANT), false, 'posé dans le futur');
  for (const v of ['1', 1, 'abc', '', undefined, null, MINUTE + 0.5]) assert.equal(suiteRecente(v, INSTANT), false, String(v));
});

test('hors d’une app, rien à proposer : Safari, Chrome, un ordinateur', () => {
  for (const ua of [IOS_SAFARI, ANDROID_CHROME, MAC_SAFARI, '']) assert.equal(sortieDuNavigateur(LIEN, ua), null);
});

test('iPhone : Safari par le lien depuis LinkedIn et Messenger, par une fenêtre depuis Facebook et Threads', () => {
  assert.deepEqual(sortieDuNavigateur(LIEN, IOS_LINKEDIN), { adresse: `x-safari-${LIEN}`, fenetre: false, safari: true, android: false, lien: LIEN });
  assert.equal(sortieDuNavigateur(LIEN, IOS_MESSENGER)?.fenetre, false);
  for (const ua of [IOS_FACEBOOK, IOS_FACEBOOK_META, IOS_THREADS]) {
    assert.deepEqual(sortieDuNavigateur(LIEN, ua), { adresse: `x-safari-${LIEN}`, fenetre: true, safari: true, android: false, lien: LIEN });
  }
});

test('iPhone : Instagram ouvre le navigateur par sa propre adresse', () => {
  assert.deepEqual(sortieDuNavigateur(LIEN, IOS_INSTA), { adresse: `instagram://extbrowser/?url=${encodeURIComponent(LIEN)}`, fenetre: false, safari: false, android: false, lien: LIEN });
});

test('Android : une adresse intent vers le navigateur par défaut, sans paquet', () => {
  for (const ua of [ANDROID_INSTA, ANDROID_FACEBOOK, ANDROID_THREADS]) {
    assert.deepEqual(sortieDuNavigateur(LIEN, ua), { adresse: `intent://hopla.page/camille?s=linkedin&suite=${MINUTE}#Intent;scheme=https;end`, fenetre: false, safari: false, android: true, lien: LIEN });
  }
});

test('les apps qui ne laissent pas sortir n’ont pas d’écran', () => {
  for (const ua of [IOS_TIKTOK, IOS_X, IOS_SNAPCHAT, ANDROID_TIKTOK]) assert.equal(sortieDuNavigateur(LIEN, ua), null);
});

test('seule une page en https se rouvre', () => {
  assert.equal(sortieDuNavigateur('http://hopla.page/camille', IOS_LINKEDIN), null);
  assert.equal(sortieDuNavigateur('pas une adresse', IOS_LINKEDIN), null);
});
