import type { CSSProperties, ReactNode } from 'react';
import type { PagePublique } from '../lib/types.ts';
import { PROFILS } from './exemples.ts';
import type { ProfilExemple } from './exemples.ts';
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
 * pour lire un mouvement sans être distrait par un thème. Dans « Le bon lien,
 * au bon moment » (`.hl-tel-vivante`), ce que Hopla vient de faire passe au bleu.
 */

export function CroquisTete({ profil }: { profil: ProfilExemple }) {
  const p = PROFILS[profil];
  return <div className="hl-cq-tete">
    <img className="hl-cq-avatar" src={p.avatar} alt="" width="62" height="62" loading="lazy" />
    <span className="hl-cq-nom">{p.nom}</span>
    <span className="hp-cq-bio">{p.bio}</span>
  </div>;
}

export function CroquisLien({ titre, vedette, picto, cle, ...reste }: { titre: ReactNode; vedette?: boolean; picto?: ReactNode; cle?: string } & Record<`data-${string}`, unknown>) {
  return <div className="hl-cq-lien" data-vedette={vedette || undefined} data-cle={cle} {...reste}>{picto}<span>{titre}</span></div>;
}
