import test from 'node:test';
import assert from 'node:assert/strict';
import { estPrivee, lireMeta } from './apercu.ts';

test('lit le titre, la description et l’image de partage, adresse relative comprise', () => {
  const html = `<head><title>Repli</title><meta property="og:title" content="Agence AFK &amp; co">
    <meta name="description" content='Automatisation &#233;l&#xe9;gante'><meta property="og:image" content="/partage.png"></head>`;
  assert.deepEqual(lireMeta(html, 'https://agenceafk.fr/offres'), {
    titre: 'Agence AFK & co', description: 'Automatisation élégante', image: 'https://agenceafk.fr/partage.png',
  });
  assert.equal(lireMeta('<title>Seul titre</title>', 'https://x.fr').titre, 'Seul titre');
});

test('refuse les adresses du réseau local', () => {
  for (const ip of ['127.0.0.1', '10.2.3.4', '192.168.1.1', '172.20.0.1', '169.254.169.254', '::1', 'fd00::1', '::ffff:127.0.0.1']) assert.ok(estPrivee(ip), ip);
  for (const ip of ['147.93.52.144', '8.8.8.8', '2a00:1450::1']) assert.ok(!estPrivee(ip), ip);
});

test('refuse les adresses privées, réservées ou glissées dans une IPv6', () => {
  for (const ip of ['10.1.2.3', '172.20.0.1', '198.18.1.1', '169.254.169.254', '::1', '::ffff:127.0.0.1', '::127.0.0.1', '64:ff9b::a00:1', 'fd00::1', 'pas-une-ip']) assert.equal(estPrivee(ip), true, ip);
  for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700::1111']) assert.equal(estPrivee(ip), false, ip);
});
