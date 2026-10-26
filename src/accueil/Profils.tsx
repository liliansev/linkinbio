import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Icone, NOMS_RESEAUX } from '../components/Icone.tsx';
import { Symbole } from '../components/Logo.tsx';
import { OFFRES, euros, peut } from '../lib/abonnement.ts';
import type { Plan } from '../lib/abonnement.ts';
import { NOMS_AUDIENCES, composerAudience, deReseau } from '../lib/provenance.ts';
import { BLOCS_EXEMPLES, IDS_PROFILS, PROFILS, de, pageExemple } from './exemples.ts';
import type { ProfilExemple } from './exemples.ts';
import { mouvementReduit, useGlisse, useVu } from './mouvement.ts';
import { allerAuChamp, useReservation } from './Reserver.tsx';
import { EcranPage, Telephone } from './Telephone.tsx';
import { appel, useInscription } from './textes.ts';

export function Avatar({ profil, className = '', prioritaire = false }: { profil: ProfilExemple; className?: string; prioritaire?: boolean }) {
  return <img className={`hp-avatar ${className}`} src={PROFILS[profil].avatar} alt="" width="512" height="512" loading={prioritaire ? 'eager' : 'lazy'} />;
}

/** `long` : « Offre Starter », là où la pastille paraît seule, sans phrase pour la définir. */
export function BadgeOffre({ offre, long = false }: { offre: 'starter' | 'pro'; long?: boolean }) {
  return <span className="hp-badge-offre" data-offre={offre}>{long ? 'Offre ' : ''}{OFFRES[offre].nom}</span>;
}

/**
 * L'offre qui comprend une fonction, dite au même endroit et dans les mêmes
 * mots pour toutes : « Inclus dans l'offre gratuite », ou l'offre payante et
 * son prix au mois, celui que les tarifs montrent en arrivant, qui y mène.
 */
export function OffreFonction({ offre, quoi = '' }: { offre: Plan; quoi?: string }) {
  return (
    <p className="hp-inclus">
      <Icone nom="check" taille={18} />
      {offre === 'gratuit'
        ? <span>{quoi ? `${quoi}, inclus` : 'Inclus'} dans l’offre gratuite</span>
        : <span>{quoi ? `${quoi}, inclus` : 'Inclus'} dans l’offre {OFFRES[offre].nom}, <a href="#prix">{euros(OFFRES[offre].prix.mois)} par mois</a></span>}
    </p>
  );
}

/** `badge` : la pastille de son offre ; là où la fonction dit déjà la sienne, elle se tait. */
export function Personne({ profil, badge = true }: { profil: ProfilExemple; badge?: boolean }) {
  const p = PROFILS[profil];
  return <div className="hp-personne"><Avatar profil={profil} /><span><b>{p.nom}</b><small>{p.metier} · {p.ville}</small></span>{badge && p.offre !== 'gratuit' && <BadgeOffre offre={p.offre} />}</div>;
}

/*
 * L'ouverture tient sa promesse sous les yeux : la carte d'Inès, au premier
 * plan, arrive d'Instagram, ses pièces en tête, puis un visiteur de YouTube la
 * fait se ranger, ses coulisses en vidéo en premier. Une fois, quand la
 * composition est à l'écran (au téléphone, elle est sous le champ) ; avec moins
 * de mouvement, la carte est déjà rangée pour YouTube. Une pastille du réseau
 * marque le lien monté, et une légende lisible le dit en clair. Les notes en
 * serif italique (« Ton visage », « Et bientôt, toi ») sont retirées le 26 octobre 2026 : elles faisaient
 * « page générée ».
 */
const SOURCES = ['instagram', 'youtube'] as const;
const AVANT_YOUTUBE = 2200;

/** Des cartes compactes composées avec les mêmes données que les vraies pages de démonstration. */
export function HeroProfils() {
  const [source, setSource] = useState(0);
  const liens = useRef<HTMLDivElement>(null);
  const [scene, vu] = useVu<HTMLDivElement>(0.6);
  useEffect(() => {
    if (mouvementReduit()) { setSource(1); return; }
    if (!vu) return;
    const t = setTimeout(() => setSource(1), AVANT_YOUTUBE);
    return () => clearTimeout(t);
  }, [vu]);
  const reseau = SOURCES[source];
  const blocsInes = composerAudience(BLOCS_EXEMPLES.ines, reseau);
  useGlisse(liens, blocsInes.map(b => b.id).join(), 600);
  return <div className="hp-figure"><div ref={scene} className="hp-composition" role="img" aria-label={`Les pages de Sacha, Inès et Camille. Ouverte depuis ${NOMS_AUDIENCES[reseau]}, celle d’Inès met « ${blocsInes[0].titre} » en premier.`}>
    {(['sacha', 'ines', 'camille'] as const).map(id => {
      const p = PROFILS[id];
      const page = pageExemple(id);
      const blocs = id === 'ines' ? blocsInes : page.blocs;
      return <div key={id} className={`hp-page hp-page-${id}`}>
        {id === 'ines' && <Avatar profil={id} className="hp-couverture" prioritaire />}
        <div className="hp-page-corps">
          <Avatar profil={id} prioritaire />
          <b className="hp-page-nom">{p.nom}</b>
          <p>{p.bio}</p>
          <small>{page.reglages.reseaux.map(r => NOMS_RESEAUX[r.reseau] ?? r.reseau).join(' · ')}</small>
          <div className="hp-page-liens" ref={id === 'ines' ? liens : undefined}>
            {blocs.map((b, i) => <div key={b.id} data-cle={b.id} data-premier={i === 0 || undefined}><span>{b.titre}</span>{id === 'ines' && i === 0
              ? <span key={reseau} className="hp-lien-source" data-reseau={reseau}><Icone nom={reseau} taille={16} /></span>
              : <Icone nom="ui-fleche" taille={14} />}</div>)}
          </div>
          {/* Inès est en Starter : sa page n'a plus la mention. */}
          {!peut(p.offre, 'sansMention') && <span className="hp-page-marque"><Symbole /> fait avec Hopla</span>}
        </div>
      </div>;
    })}
    <span key={reseau} className="hp-source" data-reseau={reseau}><Icone nom={reseau} taille={16} />Depuis {NOMS_AUDIENCES[reseau]}</span>
    <Avatar profil="lea" className="hp-visage-libre hp-visage-lea" prioritaire />
    <Avatar profil="hugo" className="hp-visage-libre hp-visage-hugo" prioritaire />
  </div>
    {/* La composition se dit déjà aux lecteurs d'écran : la légende est pour les yeux. */}
    <p key={reseau} className="hp-preuve" aria-hidden="true">Venu {deReseau(reseau)}, le visiteur voit d’abord <b>« {blocsInes[0].titre} »</b></p>
  </div>;
}

export function GalerieProfils() {
  const [profil, setProfil] = useState<ProfilExemple>('ines');
  const [largeur, setLargeur] = useState(300);
  const boite = useRef<HTMLDialogElement>(null);
  const galerie = useRef<HTMLDivElement>(null);
  // À la fermeture, le focus revient à la carte du profil qu'on regardait, sauf quand le bouton d'appel l'emmène au champ.
  const retour = useRef(true);
  const mode = useInscription();
  const { etape, ancien, correction } = useReservation();
  const envoye = etape === 'fait' || !!ancien || correction;
  // Le téléphone tient dans le dialogue en largeur (la largeur utile, pas celle de la fenêtre : rien ne déborde à 320 px, même avec une
  // barre de défilement classique). En hauteur, il tient quand l'écran le permet (1,744 : le rapport du téléphone court), mais jamais
  // sous 280 px : sur un petit téléphone, la page reste lisible et le dialogue défile plutôt que de la réduire.
  const ouvrir = (id: ProfilExemple) => { setProfil(id); setLargeur(Math.min(document.documentElement.clientWidth - 80, Math.max(280, Math.min(300, Math.floor((innerHeight - 290) / 1.744))))); boite.current?.showModal(); };
  const i = IDS_PROFILS.indexOf(profil);
  const voisin = (pas: number) => IDS_PROFILS[(i + pas + IDS_PROFILS.length) % IDS_PROFILS.length];
  const fleches = (ev: KeyboardEvent<HTMLDialogElement>) => {
    if (ev.key === 'ArrowRight') setProfil(voisin(1));
    else if (ev.key === 'ArrowLeft') setProfil(voisin(-1));
  };
  const p = PROFILS[profil];
  return <section id="inspiration" className="hl-section hp-inspiration" aria-labelledby="titre-inspiration">
    <div className="hp-inspiration-tete"><div><h2 id="titre-inspiration" className="hl-h2">Il y a tout un monde<br />derrière un lien</h2></div><p>Ton activité ne ressemble à aucune autre.<br />Ta page non plus.<small>Explore ces six profils imaginés pour te donner des idées.</small></p></div>
    <div ref={galerie} className="hp-galerie">{IDS_PROFILS.map(id => <button key={id} className="hp-profil" type="button" data-profil={id} onClick={() => ouvrir(id)} aria-label={`Découvrir la page ${de(PROFILS[id].nom)}, ${PROFILS[id].metier.toLowerCase()} à ${PROFILS[id].ville}`}><span className="hp-profil-photo"><Avatar profil={id} /></span><b className="hp-profil-nom">{PROFILS[id].nom}<Icone nom="ui-oeil" taille={18} /></b><small>{PROFILS[id].metier} · {PROFILS[id].ville}</small></button>)}</div>
    <dialog ref={boite} className="hp-dialogue" aria-labelledby="profil-titre" onKeyDown={fleches}
      onClose={() => { if (retour.current) galerie.current?.querySelector<HTMLButtonElement>(`[data-profil="${profil}"]`)?.focus(); retour.current = true; }} onClick={e => { if (e.target === e.currentTarget) boite.current?.close(); }}>
      <div className="hp-dialogue-tete">
        <h3 id="profil-titre" aria-live="polite">La page {de(p.nom)} <span className="hp-dialogue-rang">{i + 1} sur {IDS_PROFILS.length}</span></h3>
        <button type="button" autoFocus onClick={() => boite.current?.close()} aria-label="Fermer l’aperçu"><Icone nom="ui-fermer" taille={24} /></button>
      </div>
      <Telephone largeur={largeur} className="hl-tel-court" adresse={`hopla.page/${p.pseudo}`} label={`Exemple de page ${de(p.nom)}`}><EcranPage page={pageExemple(profil)} /></Telephone>
      <p className="hp-dialogue-qui">{p.metier} à {p.ville}{p.offre !== 'gratuit' && <BadgeOffre offre={p.offre} long />}</p>
      <div className="hp-dialogue-pied">
        <button type="button" className="hp-dialogue-voisin" onClick={() => setProfil(voisin(-1))} aria-label={`Page précédente : ${PROFILS[voisin(-1)].nom}`}><Icone nom="ui-chevron" taille={20} className="hl-gauche" /></button>
        {!envoye && <button type="button" className="hl-btn" onClick={() => { retour.current = false; boite.current?.close(); allerAuChamp(); }}>{appel(mode)}</button>}
        <button type="button" className="hp-dialogue-voisin" onClick={() => setProfil(voisin(1))} aria-label={`Page suivante : ${PROFILS[voisin(1)].nom}`}><Icone nom="ui-chevron" taille={20} className="hl-droite" /></button>
      </div>
    </dialog>
  </section>;
}
