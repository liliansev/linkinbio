import test from 'node:test';
import assert from 'node:assert/strict';
import { adresseOembed, decoderPage, ecrirePrix, estBarrage, estPrivee, lireMeta, lireOembed, montant, titreCourt } from './apercu.ts';

test('lit le titre, la description et l’image de partage, adresse relative comprise', () => {
  const html = `<head><title>Repli</title><meta property="og:title" content="Agence AFK &amp; co">
    <meta name="description" content='Automatisation &#233;l&#xe9;gante'><meta property="og:image" content="/partage.png"></head>`;
  assert.deepEqual(lireMeta(html, 'https://agenceafk.fr/offres'), {
    titre: 'Agence AFK & co', description: 'Automatisation élégante', image: 'https://agenceafk.fr/partage.png', oembed: '', rafraichir: '', prix: '',
  });
  assert.equal(lireMeta('<title>Seul titre</title>', 'https://x.fr').titre, 'Seul titre');
});

test('lit les balises écrites sans guillemets, les entités françaises et les replis (itemprop, image_src)', () => {
  const html = `<head><meta property=og:title content=Boulangerie><meta itemprop="description" content="Pain d&eacute;licieux, croissants &laquo;&nbsp;maison&nbsp;&raquo; &ndash; depuis 1950&hellip;">
    <link rel="image_src" href="//cdn.boulangerie.fr/vitrine.jpg"><title>Accueil</title></head>`;
  const m = lireMeta(html, 'https://boulangerie.fr/');
  assert.equal(m.titre, 'Boulangerie');
  assert.equal(m.description, 'Pain délicieux, croissants « maison » – depuis 1950…');
  assert.equal(m.image, 'https://cdn.boulangerie.fr/vitrine.jpg');
  // Une majuscule accentuée reste majuscule.
  assert.equal(lireMeta('<title>&Eacute;cole &amp; atelier</title>', 'https://x.fr').titre, 'École & atelier');
});

test('lit un montant écrit à la façon de n’importe quel pays', () => {
  assert.equal(montant('24,00'), 24);
  assert.equal(montant('1.234,56'), 1234.56);
  assert.equal(montant('1,234.56'), 1234.56);
  assert.equal(montant('1 234,50 €'), 1234.5);
  assert.equal(montant('$1,299'), 1299);
  assert.equal(montant('12.5'), 12.5);
  assert.equal(montant('€9.99'), 9.99);
  for (const rien of ['', 'Gratuit', '0', '0,00']) assert.equal(montant(rien), null, rien);
  assert.equal(ecrirePrix(24, 'EUR'), '24\u00a0€');
  assert.equal(ecrirePrix(1234.5, 'EUR'), '1\u202f234,50\u00a0€');
  assert.equal(ecrirePrix(10, 'USD'), '10\u00a0$');
  assert.equal(ecrirePrix(10, 'eur'), '');
});

test('lit le prix d’un produit : Shopify, WooCommerce, Etsy, Gumroad, une étiquette Twitter ou le JSON-LD', () => {
  const prix = (head: string) => lireMeta(`<head><title>Le carnet</title>${head}</head>`, 'https://boutique.fr/p').prix;
  assert.equal(prix(`<meta property="og:price:amount" content="24,00"><meta property="og:price:currency" content="EUR">`), '24\u00a0€');
  assert.equal(prix(`<meta property="product:price:amount" content="12.50"><meta property="product:price:currency" content="eur">`), '12,50\u00a0€');
  assert.equal(prix(`<meta property="etsymarketplace:price_value" content="45.00"><meta property="etsymarketplace:currency_code" content="USD">`), '45\u00a0$');
  assert.equal(prix(`<meta name="twitter:label1" content="Price"><meta name="twitter:data1" content="€19">`), '19\u00a0€');
  assert.equal(prix(`<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage"},{"@type":"Product","name":"Carnet","offers":{"@type":"Offer","price":"29.90","priceCurrency":"EUR"}}]}</script>`), '29,90\u00a0€');
  assert.equal(prix(`<script type="application/ld+json">{"@type":"Product","offers":[{"price":15,"priceCurrency":"EUR"},{"price":9,"priceCurrency":"EUR"}]}</script>`), 'Dès 9\u00a0€');
  assert.equal(prix(`<script type="application/ld+json">{"@type":"Product","offers":{"@type":"AggregateOffer","lowPrice":"12","highPrice":"30","priceCurrency":"EUR"}}</script>`), 'Dès 12\u00a0€');
  // Ni montant, ni devise connue, ni JSON lisible : pas de prix plutôt qu'un faux.
  assert.equal(prix(`<meta property="og:price:amount" content="24">`), '');
  assert.equal(prix(`<meta property="og:price:amount" content="0"><meta property="og:price:currency" content="EUR">`), '');
  assert.equal(prix(`<script type="application/ld+json">{ cassé </script>`), '');
  assert.equal(prix(''), '');
});

test('repère l’oEmbed annoncé par la page et la page qui renvoie ailleurs', () => {
  const m = lireMeta(`<link rel="alternate" type="application/json+oembed" href="/oembed?url=x"><meta http-equiv="refresh" content="0; url=/vraie-page">`, 'https://site.fr/a');
  assert.equal(m.oembed, 'https://site.fr/oembed?url=x');
  assert.equal(m.rafraichir, 'https://site.fr/vraie-page');
});

test('une page de vérification, de consentement ou d’erreur ne donne jamais son titre au lien', () => {
  for (const t of ['Just a moment...', 'Attention Required! | Cloudflare', 'Avant d’accéder à YouTube', 'Before you continue to YouTube', '403 Forbidden', '404', 'Access Denied', 'Robot Check', 'Login • Instagram', 'Connexion', 'Erreur 503', 'Un instant…'])
    assert.ok(estBarrage(t), t);
  for (const t of ['500 recettes faciles', 'Connexions humaines, le podcast', 'Erreurs de jeunesse', 'Inscriptions ouvertes pour l’atelier', 'Mes ateliers'])
    assert.ok(!estBarrage(t), t);
  const m = lireMeta(`<title>Just a moment...</title><meta name="description" content="Checking your browser"><meta property="og:image" content="/x.png">`, 'https://x.fr');
  assert.deepEqual([m.titre, m.description, m.image], ['', '', '']);
});

test('lit une page dans le jeu de caractères qu’elle annonce, ou en Windows-1252 si l’UTF-8 casse', () => {
  const latin1 = Buffer.from('<head><meta charset="iso-8859-1"><title>Caf\xe9 cr\xe8me</title></head>', 'latin1');
  assert.match(decoderPage(latin1), /Café crème/);
  assert.match(decoderPage(Buffer.from('<title>Caf\xe9</title>', 'latin1'), 'text/html; charset=ISO-8859-1'), /Café/);
  // Rien d'annoncé, de l'UTF-8 cassé : du Windows-1252 (l'apostrophe courbe en 0x92 comprise).
  assert.match(decoderPage(Buffer.from('<title>L\x92\xe9t\xe9</title>', 'latin1')), /L’été/);
  assert.match(decoderPage(Buffer.from('<title>L’été</title>', 'utf8')), /L’été/);
  // Un jeu inconnu ne casse rien : l'UTF-8 prend le relais.
  assert.match(decoderPage(Buffer.from('<title>Été</title>', 'utf8'), 'text/html; charset=nimporte'), /Été/);
});

test('les sites de vidéo et de musique passent par leur oEmbed', () => {
  assert.equal(adresseOembed('https://youtu.be/abc'), 'https://www.youtube.com/oembed?format=json&url=https%3A%2F%2Fyoutu.be%2Fabc');
  assert.match(adresseOembed('https://www.youtube.com/watch?v=abc') ?? '', /^https:\/\/www\.youtube\.com\/oembed/);
  assert.match(adresseOembed('https://open.spotify.com/show/xyz') ?? '', /^https:\/\/open\.spotify\.com\/oembed/);
  assert.match(adresseOembed('https://www.tiktok.com/@marie') ?? '', /^https:\/\/www\.tiktok\.com\/oembed/);
  assert.equal(adresseOembed('https://boulangerie.fr'), null);
  assert.deepEqual(lireOembed('{"title":"Ma vid\\u00e9o &amp; moi","thumbnail_url":"https://i.ytimg.com/vi/abc/hqdefault.jpg"}'), { titre: 'Ma vidéo & moi', image: 'https://i.ytimg.com/vi/abc/hqdefault.jpg' });
  assert.deepEqual(lireOembed('{"author_name":"Marie"}'), { titre: 'Marie', image: '' });
  assert.deepEqual(lireOembed('<html>pas du json</html>'), { titre: '', image: '' });
});

test('le titre d’un lien perd le nom du site collé derrière', () => {
  assert.equal(titreCourt('Agence IA & automatisation pour PME et petites équipes | AFK'), 'Agence IA & automatisation pour PME et petites équipes');
  assert.equal(titreCourt('Mes ateliers – Atelier Camille'), 'Mes ateliers');
  assert.equal(titreCourt('Prendre rendez-vous · Calendly'), 'Prendre rendez-vous');
  // « Accueil » seul ne dit rien : le nom du site le remplace.
  assert.equal(titreCourt('Accueil - Boulangerie Martin'), 'Boulangerie Martin');
  // Un trait d'union dans un mot n'est pas un séparateur.
  assert.equal(titreCourt('Jean-Pierre Durand'), 'Jean-Pierre Durand');
  assert.equal(titreCourt('x'.repeat(200)).length, 80);
});

test('refuse les adresses du réseau local', () => {
  for (const ip of ['127.0.0.1', '10.2.3.4', '192.168.1.1', '172.20.0.1', '169.254.169.254', '::1', 'fd00::1', '::ffff:127.0.0.1']) assert.ok(estPrivee(ip), ip);
  for (const ip of ['147.93.52.144', '8.8.8.8', '2a00:1450::1']) assert.ok(!estPrivee(ip), ip);
});

test('refuse les adresses privées, réservées ou glissées dans une IPv6', () => {
  for (const ip of ['10.1.2.3', '172.20.0.1', '198.18.1.1', '169.254.169.254', '::1', '::ffff:127.0.0.1', '::127.0.0.1', '::7f00:1', '::ffff:0:7f00:1', '64:ff9b::a00:1', '64:ff9b:1::a00:1', '2001::1', 'fd00::1', 'pas-une-ip']) assert.equal(estPrivee(ip), true, ip);
  for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700::1111']) assert.equal(estPrivee(ip), false, ip);
});
