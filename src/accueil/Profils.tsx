import { useRef, useState } from 'react';
import { Icone } from '../components/Icone.tsx';
import { Symbole } from '../components/Logo.tsx';
import { IDS_PROFILS, PROFILS, pageExemple } from './exemples.ts';
import type { ProfilExemple } from './exemples.ts';
import { EcranPage, Telephone } from './Telephone.tsx';

export function Avatar({ profil, className = '', prioritaire = false }: { profil: ProfilExemple; className?: string; prioritaire?: boolean }) {
  return <img className={`hp-avatar ${className}`} src={PROFILS[profil].avatar} alt="" width="512" height="512" loading={prioritaire ? 'eager' : 'lazy'} />;
}

export function BadgeOffre({ offre }: { offre: 'starter' | 'pro' }) {
  return <span className="hp-badge-offre" data-offre={offre}>{offre === 'pro' ? 'Pro' : 'Starter'}</span>;
}

export function Personne({ profil, offre }: { profil: ProfilExemple; offre?: 'starter' | 'pro' }) {
  const p = PROFILS[profil];
  return <div className="hp-personne"><Avatar profil={profil} /><span><b>{p.nom}</b><small>{p.metier} · {p.ville}</small></span>{offre && <BadgeOffre offre={offre} />}</div>;
}

/** Des cartes compactes composées avec les mêmes données que les vraies pages de démonstration. */
export function HeroProfils() {
  return <div className="hp-composition" aria-label="Les pages de Sacha, Inès et Camille">
    {(['sacha', 'ines', 'camille'] as const).map(id => {
      const p = PROFILS[id];
      const page = pageExemple(id);
      return <div key={id} className={`hp-page hp-page-${id}`}>
        {id === 'ines' && <Avatar profil={id} className="hp-couverture" prioritaire />}
        <div className="hp-page-corps">
          <Avatar profil={id} prioritaire />
          <b className="hp-page-nom">{p.nom}</b>
          <p>{p.bio}</p>
          <small>{page.reglages.reseaux.map(r => r.reseau[0].toUpperCase() + r.reseau.slice(1)).join(' · ')}</small>
          <div className="hp-page-liens">{page.blocs.map((b, i) => <div key={b.id} data-premier={i === 0 || undefined}><span>{b.titre}</span><Icone nom="ui-fleche" taille={14} /></div>)}</div>
          <span className="hp-page-marque"><Symbole /> fait avec Hopla</span>
        </div>
      </div>;
    })}
    <span className="hp-note hp-note-haut">Ton visage<br />Tout ton univers</span>
    <span className="hp-note hp-note-bas">Et bientôt,<span className="hp-note-fin"> toi</span></span>
    <Avatar profil="lea" className="hp-visage-libre hp-visage-lea" prioritaire />
    <Avatar profil="hugo" className="hp-visage-libre hp-visage-hugo" prioritaire />
  </div>;
}

export function GalerieProfils() {
  const [profil, setProfil] = useState<ProfilExemple>('ines');
  const boite = useRef<HTMLDialogElement>(null);
  const ouvrir = (id: ProfilExemple) => { setProfil(id); boite.current?.showModal(); };
  const p = PROFILS[profil];
  return <section id="inspiration" className="hl-section hp-inspiration" aria-labelledby="titre-inspiration">
    <div className="hp-inspiration-tete"><div><h2 id="titre-inspiration" className="hl-h2">Il y a tout un monde<br />derrière un lien</h2></div><p>Ton activité ne ressemble à aucune autre.<br />Ta page non plus.<small>Explore ces six profils imaginés pour te donner des idées.</small></p></div>
    <div className="hp-galerie">{IDS_PROFILS.map(id => <button key={id} className="hp-profil" type="button" onClick={() => ouvrir(id)} aria-label={`Découvrir la page de ${PROFILS[id].nom}`}><span className="hp-profil-photo"><Avatar profil={id} /><span><Icone nom="ui-fleche" taille={18} /></span></span><b>{PROFILS[id].nom}</b><small>{PROFILS[id].metier} · {PROFILS[id].ville}</small></button>)}</div>
    <dialog ref={boite} className="hp-dialogue" aria-labelledby="profil-titre" onClick={e => { if (e.target === e.currentTarget) boite.current?.close(); }}>
      <div className="hp-dialogue-tete"><h3 id="profil-titre">La page de {p.nom}</h3><button type="button" autoFocus onClick={() => boite.current?.close()} aria-label="Fermer l’aperçu"><Icone nom="ui-fermer" taille={24} /></button></div>
      <Telephone largeur={300} adresse={`hopla.page/${p.pseudo}`} label={`Exemple de page de ${p.nom}`}><EcranPage page={pageExemple(profil)} /></Telephone>
      <p>{p.metier} à {p.ville}</p>
    </dialog>
  </section>;
}

export function RubanProfils() {
  return <div className="hp-ruban" aria-hidden="true">{IDS_PROFILS.map((id) => <Avatar key={id} profil={id} className="hp-ruban-avatar" />)}</div>;
}
