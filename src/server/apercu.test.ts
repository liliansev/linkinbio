import test from 'node:test';
import assert from 'node:assert/strict';
import { adresseOembed, decoderPage, ecrirePrix, estBarrage, estPrivee, lireMeta, lireOembed, montant, pngDeIco, tailleImage, titreCourt } from './apercu.ts';

test('lit le titre, la description et l’image de partage, adresse relative comprise', () => {
  const html = `<head><title>Repli</title><meta property="og:title" content="Agence AFK &amp; co">
    <meta name="description" content='Automatisation &#233;l&#xe9;gante'><meta property="og:image" content="/partage.png"></head>`;
  assert.deepEqual(lireMeta(html, 'https://agenceafk.fr/offres'), {
    titre: 'Agence AFK & co', description: 'Automatisation élégante', image: 'https://agenceafk.fr/partage.png', oembed: '', rafraichir: '', prix: '', icones: [], manifeste: '',
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

test('repère les icônes d’une page et son manifeste, sans les SVG ni l’icône de Safari', () => {
  const html = `<head><link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
    <link rel="shortcut icon" href="/favicon.ico"><link rel="apple-touch-icon" href="/apple.png">
    <link rel="icon" type="image/png" sizes="16x16 192x192" href="https://cdn.atelier.fr/192.png">
    <link rel="icon" type="image/svg+xml" href="/logo.svg"><link rel="mask-icon" href="/masque.svg" color="#000">
    <link rel="apple-touch-icon-precomposed" sizes="152x152" href="/apple-152.png"><link rel="manifest" href="/site.webmanifest"></head>`;
  const m = lireMeta(html, 'https://atelier.fr/boutique/');
  assert.deepEqual(m.icones, [
    { url: 'https://atelier.fr/favicon-32.png', taille: 32, accueil: false },
    { url: 'https://atelier.fr/favicon.ico', taille: 0, accueil: false },
    { url: 'https://atelier.fr/apple.png', taille: 180, accueil: true },
    { url: 'https://cdn.atelier.fr/192.png', taille: 192, accueil: false },
    { url: 'https://atelier.fr/apple-152.png', taille: 152, accueil: true },
  ]);
  assert.equal(m.manifeste, 'https://atelier.fr/site.webmanifest');
  // Une page de vérification ne donne pas ses icônes : ce sont celles du garde, pas du site.
  assert.deepEqual(lireMeta('<title>Just a moment...</title><link rel="icon" href="/cf.png">', 'https://x.fr').icones, []);
});

/** Un PNG réduit à son en-tête : sa signature et son IHDR, qui donne sa taille. */
const png = (l: number, h: number) => {
  const b = Buffer.alloc(33);
  b.writeUInt32BE(0x89504e47, 0); b.writeUInt32BE(0x0d0a1a0a, 4); b.writeUInt32BE(13, 8); b.write('IHDR', 12, 'latin1');
  b.writeUInt32BE(l, 16); b.writeUInt32BE(h, 20);
  return b;
};

test('lit la taille d’une image dans ses octets : PNG, GIF, JPEG, WebP et ICO', () => {
  assert.deepEqual(tailleImage(png(180, 120)), { l: 180, h: 120 });
  const gif = Buffer.from('GIF89a\x40\x00\x20\x00\x00\x00\x00', 'latin1');
  assert.deepEqual(tailleImage(gif), { l: 64, h: 32 });
  // Un JPEG : son début, un segment APP0, puis le SOF0 (hauteur 400, largeur 600).
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0x90, 0x02, 0x58, 0x03, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(tailleImage(jpeg), { l: 600, h: 400 });
  const webp = Buffer.alloc(30);
  webp.write('RIFF', 0, 'latin1'); webp.write('WEBP', 8, 'latin1'); webp.write('VP8X', 12, 'latin1');
  webp.writeUIntLE(1199, 24, 3); webp.writeUIntLE(629, 27, 3);
  assert.deepEqual(tailleImage(webp), { l: 1200, h: 630 });
  assert.equal(tailleImage(Buffer.from('<html></html>')), null);
});

test('un favicon.ico donne sa plus grande icône, et la sert en PNG quand elle l’est déjà', () => {
  const grande = png(256, 256);
  const ico = Buffer.alloc(6 + 32);
  ico.writeUInt16LE(0, 0); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(2, 4);
  // Une icône de 32 (rangée en BMP, ici quelques octets), puis une de 256 (écrite 0), rangée en PNG.
  ico[6] = 32; ico[7] = 32; ico.writeUInt32LE(4, 6 + 8); ico.writeUInt32LE(38, 6 + 12);
  ico[22] = 0; ico[23] = 0; ico.writeUInt32LE(grande.length, 22 + 8); ico.writeUInt32LE(42, 22 + 12);
  const fichier = Buffer.concat([ico, Buffer.from([0x28, 0, 0, 0]), grande]);
  assert.deepEqual(tailleImage(fichier), { l: 256, h: 256 });
  assert.deepEqual(pngDeIco(fichier), grande);
  // Sa plus grande icône rangée en BMP : pas de PNG à en tirer, le navigateur lira l'ICO tel quel.
  const ancien = Buffer.from(fichier);
  ancien.writeUInt32LE(4, 22 + 8); ancien.writeUInt32LE(38, 22 + 12);
  assert.equal(pngDeIco(ancien), null);
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
