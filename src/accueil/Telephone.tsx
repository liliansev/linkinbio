import type { CSSProperties, ReactNode } from 'react';
import type { PagePublique } from '../lib/types.ts';
import { PageLiens } from '../components/PageLiens.tsx';

/*
 * Le téléphone de l'accueil : un cadre arrondi, une barre d'adresse facultative,
 * et un écran qu'on ne touche pas (`inert`) ; les démos se pilotent de dehors.
 * Une vraie page s'y affiche à 390 px puis se réduit à la largeur du cadre.
 */

export function Telephone({ largeur = 300, adresse, label, children, className = '', style }: {
  largeur?: number; adresse?: ReactNode; label: string; children: ReactNode; className?: string; style?: CSSProperties;
}) {
  return (
    <figure className={`hl-tel ${className}`} style={{ '--l': `${largeur}px`, '--z': largeur / 390, ...style } as CSSProperties} role="img" aria-label={label}>
      {adresse !== undefined && <div className="hl-tel-barre" aria-hidden="true"><span>{adresse}</span></div>}
      <div className="hl-tel-ecran" inert>{children}</div>
    </figure>
  );
}

/** Une page Hopla, la vraie, dans l'écran. */
export function EcranPage({ page }: { page: PagePublique }) {
  return <div className="hl-tel-page"><PageLiens page={page} apercu /></div>;
}

/*
 * Les croquis : des écrans dessinés en gris, le lien mis en avant en noir,
 * pour lire un mouvement sans être distrait par un thème.
 */

export function CroquisTete({ nom = 'Marie Lambert', etiquette }: { nom?: string; etiquette?: ReactNode }) {
  return (
    <div className="hl-cq-tete">
      <span className="hl-cq-avatar" />
      <span className="hl-cq-nom">{nom}</span>
      <span className="hl-cq-trait" style={{ width: '62%' }} />
      {etiquette}
    </div>
  );
}

export function CroquisLien({ titre, vedette, picto, cle, ...reste }: { titre: ReactNode; vedette?: boolean; picto?: ReactNode; cle?: string } & Record<`data-${string}`, unknown>) {
  return <div className="hl-cq-lien" data-vedette={vedette || undefined} data-cle={cle} {...reste}>{picto}<span>{titre}</span></div>;
}
