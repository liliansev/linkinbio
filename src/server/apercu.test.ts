import test from 'node:test';
import assert from 'node:assert/strict';
import { estPrivee, lireMeta, titreCourt } from './apercu.ts';

test('lit le titre, la description et l’image de partage, adresse relative comprise', () => {
  const html = `<head><title>Repli</title><meta property="og:title" content="Agence AFK &amp; co">
    <meta name="description" content='Automatisation &#233;l&#xe9;gante'><meta property="og:image" content="/partage.png"></head>`;
  assert.deepEqual(lireMeta(html, 'https://agenceafk.fr/offres'), {
    titre: 'Agence AFK & co', description: 'Automatisation élégante', image: 'https://agenceafk.fr/partage.png',
  });
  assert.equal(lireMeta('<title>Seul titre</title>', 'https://x.fr').titre, 'Seul titre');
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
