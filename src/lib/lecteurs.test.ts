import test from 'node:test';
import assert from 'node:assert/strict';
import { estMusique, estVideo, lecteurDe } from './lecteurs.ts';
import { typeDeAdresse } from './detection.ts';
import { validerBloc } from './valider.ts';
import { verifierBloc } from './editionBloc.ts';
import { selonDroits } from './droits.ts';
import type { Droits } from './droits.ts';
import { FONCTIONS } from './abonnement.ts';
import type { Fonction } from './abonnement.ts';
import { GALERIE_GRATUITE, MAX_IMAGES, MAX_QUESTIONS, nouveauBloc } from './types.ts';
import { REGLAGES_DEFAUT } from './defauts.ts';

const RIEN = Object.fromEntries((Object.keys(FONCTIONS) as Fonction[]).map(f => [f, false])) as Droits;

test('un lecteur se trouve à l’adresse de la vidéo ou du titre, et se charge depuis le service lui-même', () => {
  assert.equal(lecteurDe('https://youtu.be/dQw4w9WgXcQ')?.adresse, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0');
  assert.equal(lecteurDe('https://vimeo.com/76979871')?.adresse, 'https://player.vimeo.com/video/76979871?dnt=1&autoplay=1');
  assert.equal(lecteurDe('https://vimeo.com/76979871/abc123def')?.adresse, 'https://player.vimeo.com/video/76979871?dnt=1&autoplay=1&h=abc123def', 'une vidéo non répertoriée garde sa clé');
  const tiktok = lecteurDe('https://www.tiktok.com/@marie/video/7234567890123456789');
  assert.equal(tiktok?.forme, 'vertical');
  assert.equal(tiktok?.adresse, 'https://www.tiktok.com/player/v1/7234567890123456789?autoplay=1&rel=0');
  const titre = lecteurDe('https://open.spotify.com/intl-fr/track/4uLU6hMCjMI75M1A2tKUQC?si=abc');
  assert.deepEqual([titre?.service, titre?.adresse, titre?.forme], ['spotify', 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC', 152]);
  assert.equal(lecteurDe('https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3')?.forme, 352, 'un album montre sa liste');
  assert.equal(lecteurDe('https://music.apple.com/fr/album/nom/1440857781?i=1440857796')?.adresse, 'https://embed.music.apple.com/fr/album/nom/1440857781?i=1440857796');
  assert.equal(lecteurDe('https://podcasts.apple.com/fr/podcast/nom/id1200361736')?.service, 'applepodcasts');
  assert.equal(lecteurDe('https://www.deezer.com/fr/album/302127')?.adresse, 'https://widget.deezer.com/widget/auto/album/302127');
  assert.equal(lecteurDe('https://soundcloud.com/artiste/titre')?.forme, 166);
  assert.equal(lecteurDe('https://soundcloud.com/artiste/sets/album')?.forme, 352);
  // Un profil, une page du service, une adresse courte : un lien, rien à lire dans la page.
  for (const url of ['https://soundcloud.com/artiste', 'https://soundcloud.com/discover/sets', 'https://open.spotify.com/user/abc', 'https://spoti.fi/3abc', 'https://vimeo.com/channels', 'https://www.tiktok.com/@marie', 'javascript:alert(1)']) {
    assert.equal(lecteurDe(url), null, url);
  }
  assert.equal(estVideo('https://vimeo.com/76979871'), true);
  assert.equal(estMusique('https://vimeo.com/76979871'), false);
  assert.equal(estMusique('https://open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk'), true);
});

test('une adresse de vidéo ou de musique collée prend son lecteur, pour tous', () => {
  assert.equal(typeDeAdresse('https://vimeo.com/76979871', false), 'video');
  assert.equal(typeDeAdresse('https://www.tiktok.com/@marie/video/7234567890123456789', false), 'video');
  assert.equal(typeDeAdresse('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC', false), 'musique');
  assert.equal(typeDeAdresse('https://soundcloud.com/artiste', false), 'lien');
});

test('les nouveaux blocs ne gardent que ce qui est à eux, borné', () => {
  const faq = validerBloc({ type: 'faq', titre: 'Questions', questions: [{ question: ' Tu livres ? ', reponse: 'Oui.' }, { question: '', reponse: '' }, ...Array.from({ length: 30 }, () => ({ question: 'q', reponse: 'r' }))], images: ['/media/a.webp'] }, 'f');
  assert.equal(faq.questions.length, MAX_QUESTIONS);
  assert.deepEqual(faq.questions[0], { question: 'Tu livres ?', reponse: 'Oui.' });
  assert.deepEqual(faq.images, [], 'une FAQ n’a pas de galerie');
  const galerie = validerBloc({ type: 'galerie', images: ['/media/a.webp', '/media/a.webp', 'https://ailleurs.fr/x.jpg', ...Array.from({ length: 20 }, (_, i) => `/media/i${i}.webp`)] }, 'g');
  assert.equal(galerie.images[0], '/media/a.webp');
  assert.equal(galerie.images.length, MAX_IMAGES);
  assert.ok(!galerie.images.includes('https://ailleurs.fr/x.jpg'), 'une image d’ailleurs ne s’enregistre pas');
  const carte = validerBloc({ type: 'coordonnees', titre: 'Marie Dupont', coordonnees: { telephone: '06 12 34 56 78', email: 'Marie@Exemple.fr', societe: 'Atelier', poste: 'Photographe', pirate: 'x' }, adressePostale: '12 rue des Lilas\n75011 Paris' }, 'c');
  assert.deepEqual(carte.coordonnees, { telephone: '06 12 34 56 78', email: 'marie@exemple.fr', societe: 'Atelier', poste: 'Photographe' });
  assert.equal(carte.adressePostale, '12 rue des Lilas\n75011 Paris');
  assert.equal(validerBloc({ type: 'lien', url: 'a.fr', coordonnees: { telephone: '0612345678' }, adressePostale: 'Paris' }, 'l').coordonnees, null);
  assert.equal(validerBloc({ type: 'lien', url: 'a.fr', adressePostale: 'Paris' }, 'l').adressePostale, '');
  assert.equal(validerBloc({ type: 'lieu', adressePostale: 'x'.repeat(400) }, 'a').adressePostale.length, 200);
});

test('l’éditeur dit ce qui manque à chaque nouveau bloc, sous son champ', () => {
  const erreurs = (o: object, type: Parameters<typeof nouveauBloc>[0]) => verifierBloc({ ...nouveauBloc(type, 'x'), ...o }).erreurs;
  assert.ok(erreurs({ url: 'https://soundcloud.com/artiste' }, 'musique')?.url);
  assert.equal(erreurs({ url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC' }, 'musique'), undefined);
  assert.ok(erreurs({ url: 'https://www.youtube.com/@chaine' }, 'video')?.url);
  assert.ok(erreurs({}, 'faq')?.questions);
  assert.ok(erreurs({ questions: [{ question: 'Tu livres ?', reponse: '' }] }, 'faq')?.questions);
  assert.equal(erreurs({ questions: [{ question: 'Tu livres ?', reponse: 'Oui.' }] }, 'faq'), undefined);
  assert.deepEqual(Object.keys(erreurs({}, 'coordonnees') ?? {}).sort(), ['telephone', 'titre']);
  assert.ok(erreurs({ titre: 'Marie', coordonnees: { telephone: '12', email: '', societe: '', poste: '' } }, 'coordonnees')?.telephone);
  assert.ok(erreurs({ titre: 'Marie', coordonnees: { telephone: '', email: 'marie@', societe: '', poste: '' } }, 'coordonnees')?.email);
  assert.ok(erreurs({ titre: 'Marie', url: 'pas un site', coordonnees: { telephone: '', email: 'marie@exemple.fr', societe: '', poste: '' } }, 'coordonnees')?.url);
  const ok = verifierBloc({ ...nouveauBloc('coordonnees', 'x'), titre: 'Marie', url: 'marie.fr', coordonnees: { telephone: '', email: ' Marie@Exemple.fr ', societe: '', poste: '' } });
  assert.equal(ok.bloc?.url, 'https://marie.fr/');
  assert.equal(ok.bloc?.coordonnees?.email, 'marie@exemple.fr');
  assert.ok(erreurs({}, 'lieu')?.adresse);
  assert.ok(erreurs({}, 'galerie')?.images);
});

test('sans Starter, « Me contacter » se retire de la page et une galerie montre ses trois premières photos', () => {
  const images = Array.from({ length: 6 }, (_, i) => `/media/i${i}.webp`);
  const blocs = [validerBloc({ type: 'galerie', images }, 'g'), validerBloc({ type: 'formulaire', titre: 'Me contacter' }, 'f'), validerBloc({ type: 'faq', questions: [{ question: 'q', reponse: 'r' }] }, 'q')];
  const gratuit = selonDroits(REGLAGES_DEFAUT, blocs, RIEN).blocs;
  assert.deepEqual(gratuit.map(b => b.type), ['galerie', 'faq']);
  assert.equal(gratuit[0].images.length, GALERIE_GRATUITE);
  const starter = selonDroits(REGLAGES_DEFAUT, blocs, { ...RIEN, galerie: true, formulaire: true }).blocs;
  assert.deepEqual(starter.map(b => b.type), ['galerie', 'formulaire', 'faq']);
  assert.equal(starter[0].images.length, 6);
  assert.equal(FONCTIONS.formulaire, 'starter');
  assert.equal(FONCTIONS.galerie, 'starter');
});
