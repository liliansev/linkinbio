import test from 'node:test';
import assert from 'node:assert/strict';
import { CHOIX, TYPES, aideSaisie, chercherBlocs, choixAjout, choixPour, typeDe } from './catalogue.ts';
import { nouveauBloc } from './types.ts';

const noms = (entrees: { nom: string }[]) => entrees.map(e => e.nom);
const premier = (texte: string, principal = false) => chercherBlocs(texte, principal)[0]?.nom;

test('le choix de départ n’a qu’une entrée par chose qu’on écrit ou que Hopla tient', () => {
  assert.deepEqual(noms(choixPour(true)), ['Lien', 'Titre de section', 'Texte', 'Galerie', 'Questions fréquentes', 'Avis et preuves', 'Liste e-mail', 'Me contacter', 'Carte de visite', 'Adresse', 'Ma dernière vidéo YouTube']);
  assert.deepEqual(noms(choixPour(false)), ['Lien', 'Titre de section', 'Texte', 'Galerie', 'Questions fréquentes', 'Avis et preuves', 'Liste e-mail', 'Me contacter', 'Carte de visite', 'Adresse']);
  // Une vidéo, une musique, un agenda, un soutien, un produit viennent de leur adresse ; un lien partenaire est un lien.
  for (const nom of ['Vidéo', 'Musique ou podcast', 'Produit', 'Prise de rendez-vous', 'Me soutenir', 'Lien partenaire', 'Ma newsletter']) assert.equal(CHOIX.some(t => t.nom === nom), false, nom);
});

test('un bloc se trouve par son nom ou par les mots qu’on emploie pour lui', () => {
  assert.equal(premier('rdv'), 'Prise de rendez-vous');
  assert.equal(premier('agenda'), 'Prise de rendez-vous');
  assert.equal(premier('Calendly'), 'Prise de rendez-vous');
  assert.equal(premier('vous'), 'Prise de rendez-vous');
  assert.equal(premier('don'), 'Me soutenir');
  assert.equal(premier('pourboire'), 'Me soutenir');
  assert.equal(premier('buy me a coffee'), 'Me soutenir');
  assert.equal(premier('boutique'), 'Produit');
  assert.equal(premier('affiliation'), 'Lien partenaire');
  assert.equal(premier('code promo'), 'Lien partenaire');
  assert.equal(premier('Témoignage'), 'Avis et preuves');
  assert.equal(premier('mail'), 'Liste e-mail');
  assert.equal(premier('section'), 'Titre de section');
  // L'ancienne newsletter ne s'ajoute plus : la chercher mène à la liste e-mail.
  assert.deepEqual(noms(chercherBlocs('newsletter', true)), ['Liste e-mail']);
});

test('on cherche avec ce qu’on veut faire : un mot suffit, les petits mots ne comptent pas, le pluriel non plus', () => {
  assert.equal(premier('prendre rendez-vous'), 'Prise de rendez-vous');
  assert.equal(premier('je veux prendre un rdv'), 'Prise de rendez-vous');
  assert.equal(premier('réserver une séance'), 'Prise de rendez-vous');
  assert.equal(premier('vendre mes ebooks'), 'Produit');
  assert.equal(premier('acheter'), 'Produit');
  assert.equal(premier('dons'), 'Me soutenir');
  assert.equal(premier('vidéos'), 'Vidéo');
  assert.equal(premier('mon insta'), 'Lien');
  assert.equal(premier('les étoiles'), 'Avis et preuves');
  assert.equal(premier('collecter des e-mails'), 'Liste e-mail');
  // « Payer » va aux deux blocs où l'on paie ; seuls, les petits mots cherchent quand même.
  assert.deepEqual(noms(chercherBlocs('payer', false)), ['Produit', 'Me soutenir']);
  assert.equal(premier('me'), 'Me soutenir');
});

test('le nom passe avant les mots ; une lettre seule ne cherche que les noms', () => {
  assert.deepEqual(noms(chercherBlocs('p', false)), ['Produit', 'Prise de rendez-vous', 'Lien partenaire', 'Musique ou podcast', 'Avis et preuves']);
  assert.deepEqual(noms(chercherBlocs('youtube', true)), ['Ma dernière vidéo YouTube', 'Vidéo']);
  assert.deepEqual(noms(chercherBlocs('youtube', false)), ['Vidéo']);
  // Les blocs venus de Linktree se trouvent par ce qu'on veut montrer.
  assert.equal(premier('spotify'), 'Musique ou podcast');
  assert.equal(premier('photos'), 'Galerie');
  assert.equal(premier('formulaire'), 'Me contacter');
  assert.equal(premier('vcard'), 'Carte de visite');
  assert.equal(premier('itinéraire'), 'Adresse');
  assert.deepEqual(chercherBlocs('', true), []);
  assert.deepEqual(chercherBlocs('zzz', true), []);
});

test('une adresse tapée propose le bloc qu’elle appelle, puis ce qu’elle peut être d’autre', () => {
  const rdv = choixAjout('https://calendly.com/lilian/30min', { principal: false, vitrine: true });
  assert.equal(rdv.mode, 'adresse');
  assert.deepEqual(rdv.lignes.map(l => [l.entree.nom, !!l.auto, l.detail]), [['Prise de rendez-vous', true, 'calendly.com'], ['Lien', false, undefined]]);
  assert.ok(rdv.lignes.every(l => l.url === 'https://calendly.com/lilian/30min'));
  // Sans Starter, l'agenda reste un lien qui marche ; la prise de rendez-vous suit, avec son offre.
  const sans = choixAjout('https://calendly.com/lilian/30min', { principal: false, vitrine: false });
  assert.deepEqual(sans.lignes.map(l => [l.entree.nom, !!l.auto]), [['Lien', true], ['Prise de rendez-vous', false]]);
  // Une vidéo est pour tous.
  assert.equal(choixAjout('https://www.youtube.com/watch?v=dQw4w9WgXcQ', { principal: false, vitrine: false }).lignes[0].entree.nom, 'Vidéo');
  // Une adresse ordinaire, sans « https:// » : un lien, sans « Lien partenaire », qui ne vaut que pour une adresse d'affiliation.
  assert.deepEqual(noms(choixAjout('monsite.fr/blog', { principal: false, vitrine: true }).lignes.map(l => l.entree)), ['Lien']);
  // Un e-mail devient un lien qui écrit, avec son texte.
  const mail = choixAjout('lilian@exemple.fr', { principal: false, vitrine: true });
  assert.deepEqual(mail.lignes.map(l => [l.entree.nom, l.url, !!l.auto, l.detail, l.entree.modele?.titre]), [['Lien e-mail', 'mailto:lilian@exemple.fr', false, 'lilian@exemple.fr', 'M’écrire']]);
});

test('« Lien partenaire » ne suit qu’une adresse d’affiliation, juste sous le bloc qu’elle appelle', () => {
  const amazon = choixAjout('https://www.amazon.fr/dp/B0C1234567?tag=lilian-21', { principal: false, vitrine: true });
  assert.deepEqual(amazon.lignes.map(l => [l.entree.nom, !!l.auto]), [['Lien', true], ['Lien partenaire', false]]);
  for (const t of ['https://calendly.com/lilian/30min', 'https://ko-fi.com/lilian', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ']) {
    assert.equal(choixAjout(t, { principal: false, vitrine: true }).lignes.some(l => l.entree.nom === 'Lien partenaire'), false, t);
  }
});

test('un numéro devient un lien d’appel ; un pseudo rejoint les réseaux', () => {
  for (const t of ['0612345678', '06 12 34 56 78', '+33 6 12 34 56 78', '06.12.34.56.78']) {
    const r = choixAjout(t, { principal: false, vitrine: true });
    assert.equal(r.mode, 'numero', t);
    assert.equal(r.lignes[0].entree.nom, 'Lien d’appel');
    assert.equal(r.lignes[0].entree.modele?.titre, 'M’appeler');
    assert.match(r.lignes[0].url!, /^tel:\+?\d{10,11}$/);
  }
  assert.equal(choixAjout('+33 6 12 34 56 78', { principal: false, vitrine: true }).lignes[0].url, 'tel:+33612345678');
  // Pas fini, il attend, et dit ce qu'il deviendra ; jamais une adresse IP.
  assert.deepEqual(choixAjout('0612', { principal: false, vitrine: true }), { mode: 'saisie', lignes: [] });
  assert.match(aideSaisie('0612'), /lien d’appel/);
  assert.match(aideSaisie('0612', true), /au moins 8 chiffres/);
  const pseudo = choixAjout('@lilian.sev', { principal: false, vitrine: true });
  assert.equal(pseudo.mode, 'pseudo');
  assert.deepEqual(pseudo.lignes.map(l => [l.entree.nom, l.pseudo]), [['Ajouter @lilian.sev à tes réseaux', 'lilian.sev']]);
  assert.deepEqual(choixAjout('@', { principal: false, vitrine: true }), { mode: 'saisie', lignes: [] });
  assert.match(aideSaisie('@'), /pseudo/);
});

test('un domaine seul se cherche aussi par son nom : « cal.com », « ko-fi.com », « systeme.io »', () => {
  const cal = choixAjout('cal.com', { principal: false, vitrine: true });
  assert.deepEqual(cal.lignes.map(l => [l.entree.nom, !!l.url]), [['Lien', true], ['Prise de rendez-vous', false]]);
  assert.ok(noms(choixAjout('ko-fi.com', { principal: false, vitrine: true }).lignes.map(l => l.entree)).includes('Me soutenir'));
  assert.ok(noms(choixAjout('systeme.io', { principal: false, vitrine: true }).lignes.map(l => l.entree)).includes('Liste e-mail'));
});

test('une adresse en train de se taper n’affiche rien encore, mais le dit ; des mots cherchent', () => {
  for (const t of ['ht', 'https:/', 'www', 'calendly.', '/media']) assert.deepEqual(choixAjout(t, { principal: false, vitrine: true }), { mode: 'saisie', lignes: [] }, t);
  assert.equal(aideSaisie('calendly.'), 'Termine l’adresse : elle choisira son bloc.');
  assert.match(aideSaisie('calendly', true), /\.fr ou \.com/);
  const mots = choixAjout('  rdv ', { principal: false, vitrine: true });
  assert.equal(mots.mode, 'mots');
  assert.equal(mots.lignes[0].entree.nom, 'Prise de rendez-vous');
  assert.deepEqual(choixAjout('   ', { principal: true, vitrine: true }).mode, 'vide');
});

test('chaque bloc retrouve son entrée, un lien partenaire la sienne', () => {
  assert.equal(typeDe(nouveauBloc('lien', 'x')).nom, 'Lien');
  assert.equal(typeDe({ ...nouveauBloc('lien', 'x'), partenariat: { mention: 'publicite', code: '' } }).nom, 'Lien partenaire');
  assert.equal(typeDe(nouveauBloc('newsletter', 'x')).nom, 'Ma newsletter');
  for (const t of TYPES) assert.ok(t.picto.startsWith('bloc-'), t.nom);
});
