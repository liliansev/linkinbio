import type { Bloc } from './types.ts';
import { idYoutube } from './types.ts';
import { adresse, adresseSaisie, pourquoiPasAdresse } from './valider.ts';
import { nomSite } from './demarrage.ts';

/*
 * Ce qu'on tape dans l'éditeur d'un bloc, vérifié sans rien toucher : la même
 * règle sert au bouton « Ajouter à ma page », au repli de la rangée et à
 * l'enregistrement automatique du bureau, qui n'écrit qu'une version valable.
 */

/** Le champ sur lequel porte une erreur : elle s'affiche dessous. */
export type ChampErreur = 'url' | 'titre' | 'description' | 'dates' | 'image' | 'note' | 'nombre' | 'source';
export type Erreurs = Partial<Record<ChampErreur, string>>;

/**
 * La version à enregistrer, ou ce qui manque, champ par champ. Une adresse
 * tapée sans https le prend ; un lien sans texte prend le nom du site, jamais
 * une adresse brute sur la page.
 */
export function verifierBloc(b: Bloc): { bloc: Bloc; erreurs?: undefined } | { bloc?: undefined; erreurs: Erreurs } {
  const url = b.type === 'lien' ? adresseSaisie(b.url) : adresse(b.url);
  if (b.type === 'lien' && !url) return { erreurs: { url: b.url.trim() ? pourquoiPasAdresse(b.url) : 'Indique l’adresse du lien.' } };
  if (b.type === 'video' && !idYoutube(url)) return { erreurs: { url: 'Colle l’adresse d’une vidéo YouTube.' } };
  if ((b.type === 'titre' || b.type === 'texte') && !b.titre.trim()) return { erreurs: { titre: b.type === 'titre' ? 'Écris le titre.' : 'Écris le texte.' } };
  if (b.type === 'preuve' && b.preuve?.genre === 'temoignage' && !b.description.trim()) return { erreurs: { description: 'Écris le témoignage.' } };
  if (b.type === 'preuve' && b.preuve?.genre === 'compteur' && !b.preuve.nombre) return { erreurs: { nombre: 'Indique le chiffre à montrer.' } };
  // Une note n'est jamais inventée : elle se tape, avec son nombre d'avis et sa source.
  if (b.type === 'preuve' && b.preuve?.genre === 'note') {
    const manque: Erreurs = {};
    if (!b.preuve.note) manque.note = 'Indique ta note, par exemple 4,8.';
    else if (b.preuve.note > 5) manque.note = 'La note va de 0 à 5. Sur 10, divise-la par deux.';
    if (!b.preuve.nombre) manque.nombre = 'Indique le nombre d’avis.';
    if (!b.preuve.source.trim()) manque.source = 'Indique où les avis sont publiés, par exemple Google.';
    if (Object.keys(manque).length) return { erreurs: manque };
  }
  if (b.debut && b.fin && new Date(b.fin) <= new Date(b.debut)) return { erreurs: { dates: 'La fin doit venir après le début.' } };
  return { bloc: { ...b, url, titre: b.type === 'lien' && !b.titre.trim() ? (nomSite(url) || b.titre) : b.titre } };
}

/** Deux versions d'un bloc identiques : rien à enregistrer. */
export const memeBloc = (a: Bloc | null | undefined, b: Bloc | null | undefined) => !!a && !!b && JSON.stringify(a) === JSON.stringify(b);
