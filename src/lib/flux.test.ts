import test from 'node:test';
import assert from 'node:assert/strict';
import { estFlux, fluxAnnonce, fluxChaine, fluxVideosLongues, idChaine, lireFlux } from './flux.ts';

test('un flux RSS : titres en CDATA ou échappés, adresses relatives, du plus récent au plus ancien', () => {
  const xml = `<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Le blog</title>
    <item><title><![CDATA[Make ou n8n : <b>mon choix</b>]]></title><link>/make-ou-n8n</link><pubDate>Mon, 19 Oct 2026 08:00:00 +0200</pubDate>
      <content:encoded><![CDATA[<p><img src="/img/n8n.png"></p>]]></content:encoded></item>
    <item><title>Dix heures &amp; plus</title><link>https://blog.fr/dix-heures</link><pubDate>Thu, 22 Oct 2026 08:00:00 +0200</pubDate></item>
    <item><title>Sans adresse</title></item>
    <item><title>Un lien piégé</title><link>javascript:alert(1)</link></item>
  </channel></rss>`;
  assert.equal(estFlux(xml), true);
  const articles = lireFlux(xml, 'https://blog.fr/feed');
  assert.deepEqual(articles.map(a => a.titre), ['Dix heures & plus', 'Make ou n8n : mon choix']);
  assert.equal(articles[1].url, 'https://blog.fr/make-ou-n8n');
  assert.equal(articles[1].image, 'https://blog.fr/img/n8n.png');
  assert.equal(articles[0].date, '2026-10-22T06:00:00.000Z');
  assert.equal(lireFlux(xml, 'https://blog.fr/feed', 1).length, 1);
});

test('un flux sans dates garde son ordre ; un flux Atom prend le lien « alternate »', () => {
  const sansDate = '<rss><channel><item><title>Un</title><link>https://a.fr/1</link></item><item><title>Deux</title><link>https://a.fr/2</link></item></channel></rss>';
  assert.deepEqual(lireFlux(sansDate, 'https://a.fr').map(a => a.titre), ['Un', 'Deux']);
  const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title type="html">Épisode &lt;1&gt;</title>
    <link rel="self" href="https://pod.fr/api/1"/><link rel="alternate" href="https://pod.fr/episodes/1"/><published>2026-10-20T10:00:00Z</published></entry></feed>`;
  assert.equal(estFlux(atom), true);
  assert.deepEqual(lireFlux(atom, 'https://pod.fr'), [{ titre: 'Épisode', url: 'https://pod.fr/episodes/1', date: '2026-10-20T10:00:00.000Z', image: '', video: '' }]);
  assert.equal(estFlux('<!doctype html><html><head><title>Accueil</title></head></html>'), false);
});

test('le flux d’une chaîne YouTube donne la vidéo, sa vignette, et l’adresse de la chaîne se lit', () => {
  const xml = `<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"><entry><yt:videoId>dQw4w9WgXcQ</yt:videoId><title>Ma vidéo</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"/><published>2026-10-21T17:00:00+00:00</published>
    <media:group><media:thumbnail url="https://i1.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg" width="480" height="360"/></media:group></entry></feed>`;
  const [video] = lireFlux(xml, 'https://www.youtube.com/feeds/videos.xml');
  assert.equal(video.video, 'dQw4w9WgXcQ');
  assert.equal(video.image, 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  const id = 'UCabcdefghijklmnopqrstuv';
  assert.equal(idChaine(`https://www.youtube.com/channel/${id}`), id);
  assert.equal(idChaine(`<script>var x = {"externalId":"${id}"}</script>`), id);
  assert.equal(idChaine('https://www.youtube.com/@lilian'), '');
  assert.equal(fluxChaine(id), `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`);
  assert.equal(fluxVideosLongues(id), 'https://www.youtube.com/feeds/videos.xml?playlist_id=UULFabcdefghijklmnopqrstuv');
});

test('une page annonce son flux dans son <head>, celui des commentaires passe après', () => {
  const html = `<head><link rel="alternate" type="application/rss+xml" title="Commentaires" href="/comments/feed/">
    <link rel="alternate" type="application/rss+xml" title="Le blog" href="/feed/"><link rel="alternate" hreflang="en" href="/en/"></head>`;
  assert.equal(fluxAnnonce(html, 'https://blog.fr/a-propos'), 'https://blog.fr/feed/');
  assert.equal(fluxAnnonce('<head><link rel="alternate" type="application/atom+xml" href="https://pod.fr/atom.xml"></head>', 'https://pod.fr'), 'https://pod.fr/atom.xml');
  assert.equal(fluxAnnonce('<head><title>Rien</title></head>', 'https://x.fr'), '');
});
