import { ICONES } from '../lib/icones.ts';

export function Icone({ nom, taille = 20, className }: { nom: string; taille?: number; className?: string }) {
  const icone = ICONES[nom];
  if (!icone) return null;
  return (
    <svg className={className} width={taille} height={taille} viewBox={`0 0 ${icone.w} ${icone.h}`} aria-hidden="true" focusable="false"
      dangerouslySetInnerHTML={{ __html: icone.body }} />
  );
}

export { NOMS_RESEAUX, PICTOS } from '../lib/pictos.ts';
