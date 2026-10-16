import { ICONES } from '../lib/icones.ts';

export function Icone({ nom, taille = 20, className }: { nom: string; taille?: number; className?: string }) {
  const icone = ICONES[nom];
  if (!icone) return null;
  return (
    <svg className={className} width={taille} height={taille} viewBox={`0 0 ${icone.w} ${icone.h}`} aria-hidden="true" focusable="false"
      dangerouslySetInnerHTML={{ __html: icone.body }} />
  );
}

export const NOMS_RESEAUX: Record<string, string> = {
  youtube: 'YouTube', linkedin: 'LinkedIn', instagram: 'Instagram', tiktok: 'TikTok', x: 'X', github: 'GitHub', facebook: 'Facebook',
  threads: 'Threads', twitch: 'Twitch', spotify: 'Spotify', email: 'E-mail', site: 'Site web',
};

/** Les pictos proposés pour un lien, dans l'ordre du sélecteur. */
export const PICTOS: { nom: string; libelle: string }[] = [
  { nom: 'lien', libelle: 'Lien' }, { nom: 'message', libelle: 'Message' }, { nom: 'agenda', libelle: 'Agenda' },
  { nom: 'telephone', libelle: 'Téléphone' }, { nom: 'camera', libelle: 'Vidéo' }, { nom: 'micro', libelle: 'Micro' }, { nom: 'podcast', libelle: 'Podcast' },
  { nom: 'casque', libelle: 'Casque' }, { nom: 'musique', libelle: 'Musique' }, { nom: 'photo', libelle: 'Photo' }, { nom: 'plume', libelle: 'Écriture' },
  { nom: 'livre', libelle: 'Livre' }, { nom: 'document', libelle: 'Document' }, { nom: 'diplome', libelle: 'Formation' }, { nom: 'idee', libelle: 'Idée' },
  { nom: 'cerveau', libelle: 'Cerveau' }, { nom: 'robot', libelle: 'Robot' }, { nom: 'reglage', libelle: 'Réglages' }, { nom: 'code', libelle: 'Code' },
  { nom: 'eclair', libelle: 'Éclair' }, { nom: 'fusee', libelle: 'Fusée' }, { nom: 'courbe', libelle: 'Croissance' }, { nom: 'flamme', libelle: 'Flamme' },
  { nom: 'etoile', libelle: 'Étoile' }, { nom: 'coeur', libelle: 'Cœur' }, { nom: 'main', libelle: 'Salut' }, { nom: 'boutique', libelle: 'Boutique' },
  { nom: 'cadeau', libelle: 'Cadeau' }, { nom: 'billet', libelle: 'Billet' }, { nom: 'telecharger', libelle: 'Télécharger' }, { nom: 'maison', libelle: 'Maison' },
  { nom: 'lieu', libelle: 'Lieu' },
];
