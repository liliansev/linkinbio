import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Icone, NOMS_RESEAUX } from '../components/Icone.tsx';
import { NOMS_AUDIENCES, composerAudience, deReseau } from '../lib/provenance.ts';
import { IDS_PROFILS, PROFILS, blocsExemples, de, pageDe, pageExemple, pageProfil, profilDe } from './exemples.ts';
import { useL, useLangue } from './langue.ts';
import type { ProfilExemple } from './exemples.ts';
import { mouvementReduit, useEnVue, useGlisse } from './mouvement.ts';
import { allerAuChamp, useReservation } from './Reserver.tsx';
import { EcranPage, Telephone } from './Telephone.tsx';
import { appel, useInscription } from './textes.ts';

export function Avatar({ profil, className = '', prioritaire = false }: { profil: ProfilExemple; className?: string; prioritaire?: boolean }) {
  return <img className={`hp-avatar ${className}`} src={PROFILS[profil].avatar} alt="" width="512" height="512" loading={prioritaire ? 'eager' : 'lazy'} />;
}

/** Une personne d'exemple : son visage, son nom, son métier. Jamais son offre : elle ne se lit que dans les tarifs. */
export function Personne({ profil }: { profil: ProfilExemple }) {
  const p = profilDe(profil, useLangue());
  return <div className="hp-personne"><Avatar profil={profil} /><span><b>{p.nom}</b><small>{p.metier} · {p.ville}</small></span></div>;
}

/*
 * L'ouverture tient sa promesse sous les yeux : la carte d'Inès, au premier
 * plan, arrive d'Instagram, ses pièces en tête, puis un visiteur de YouTube la
 * fait se ranger, ses coulisses en vidéo en premier. Une seconde après que la
 * composition arrive à l'écran (au téléphone, elle est sous le champ), et de
 * nouveau à chaque retour : quittée, elle se remet sur Instagram ; avec moins
 * de mouvement, la carte est déjà rangée pour YouTube. Une pastille du réseau
 * marque le lien monté, et une légende lisible le dit en clair. Les notes en
 * serif italique (« Ton visage », « Et bientôt, toi ») sont retirées le 26 octobre 2026 : elles faisaient
 * « page générée ».
 */
const SOURCES = ['instagram', 'youtube'] as const;
const AVANT_YOUTUBE = 1000;

/** Des cartes compactes composées avec les mêmes données que les vraies pages de démonstration. */
export function HeroProfils() {
  const langue = useLangue();
  const l = useL();
  const [source, setSource] = useState(0);
  const liens = useRef<HTMLDivElement>(null);
  const [scene, enVue] = useEnVue<HTMLDivElement>(0.5);
  useEffect(() => {
    if (mouvementReduit()) { setSource(1); return; }
    if (!enVue) { setSource(0); return; }
    const t = setTimeout(() => setSource(1), AVANT_YOUTUBE);
    return () => clearTimeout(t);
  }, [enVue]);
  const reseau = SOURCES[source];
  const blocsInes = composerAudience(blocsExemples('ines', langue), reseau);
  useGlisse(liens, blocsInes.map(b => b.id).join(), 600);
  return <div className="hp-figure"><div ref={scene} className="hp-composition" role="img" aria-label={l(`Les pages de Sacha, Inès et Camille. Ouverte depuis ${NOMS_AUDIENCES[reseau]}, celle d’Inès met « ${blocsInes[0].titre} » en premier.`, `Pages by Sacha, Ines and Camille. Opened from ${NOMS_AUDIENCES[reseau]}, Ines’s page puts “${blocsInes[0].titre}” first.`)}>
    {(['sacha', 'ines', 'camille'] as const).map(id => {
      const p = profilDe(id, langue);
      const page = pageExemple(id, undefined, { langue });
      const blocs = id === 'ines' ? blocsInes : composerAudience(blocsExemples(id, langue), '');
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
        </div>
      </div>;
    })}
    <span key={reseau} className="hp-source" data-reseau={reseau}><Icone nom={reseau} taille={16} />{l('Depuis', 'From')} {NOMS_AUDIENCES[reseau]}</span>
    <Avatar profil="yanis" className="hp-visage-libre hp-visage-yanis" prioritaire />
    <Avatar profil="theo" className="hp-visage-libre hp-visage-theo" prioritaire />
  </div>
    {/* La composition se dit déjà aux lecteurs d'écran : la légende est pour les yeux. */}
    <p key={reseau} className="hp-preuve" aria-hidden="true">{l(<>Venu {deReseau(reseau)}, le visiteur voit d’abord <b>« {blocsInes[0].titre} »</b></>, <>Coming from {NOMS_AUDIENCES[reseau]}, the visitor first sees <b>“{blocsInes[0].titre}”</b></>)}</p>
  </div>;
}

export function GalerieProfils() {
  const [profil, setProfil] = useState<ProfilExemple>('ines');
  const langue = useLangue();
  const l = useL();
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
  // Neuf profils (27 octobre 2026) : la galerie défile en rail, ses flèches disent où l'on en est.
  const [bouts, setBouts] = useState({ debut: true, fin: false });
  const lireBouts = () => { const g = galerie.current; if (g) setBouts({ debut: g.scrollLeft < 4, fin: g.scrollLeft + g.clientWidth > g.scrollWidth - 4 }); };
  useEffect(() => { lireBouts(); addEventListener('resize', lireBouts); return () => removeEventListener('resize', lireBouts); }, []);
  const defiler = (sens: number) => { const g = galerie.current; if (g) g.scrollBy({ left: sens * g.clientWidth * .8, behavior: mouvementReduit() ? 'auto' : 'smooth' }); };
  const p = profilDe(profil, langue);
  return <section id="inspiration" className="hl-section hp-inspiration" aria-labelledby="titre-inspiration">
    <div className="hp-inspiration-tete"><div><h2 id="titre-inspiration" className="hl-h2">{l(<>Il y a tout un monde<br />derrière un lien</>, <>There’s a whole world<br />behind a link</>)}</h2></div><p>{l(<>Ton activité ne ressemble à aucune autre.<br />Ta page non plus.<small>Explore ces neuf profils imaginés pour te donner des idées.</small></>, <>Your work is like no one else’s.<br />Your page shouldn’t be either.<small>Browse these nine made-up profiles for ideas.</small></>)}</p></div>
    <div className="hl-fleches hp-galerie-fleches">
      <button type="button" onClick={() => { if (!bouts.debut) defiler(-1); }} aria-disabled={bouts.debut || undefined} aria-label={l('Profils précédents', 'Previous profiles')}><Icone nom="ui-chevron" taille={18} className="hl-gauche" /></button>
      <button type="button" onClick={() => { if (!bouts.fin) defiler(1); }} aria-disabled={bouts.fin || undefined} aria-label={l('Profils suivants', 'Next profiles')}><Icone nom="ui-chevron" taille={18} className="hl-droite" /></button>
    </div>
    <div ref={galerie} className="hp-galerie" onScroll={lireBouts}>{IDS_PROFILS.map(id => <button key={id} className="hp-profil" type="button" data-profil={id} onClick={() => ouvrir(id)} aria-label={l(`Découvrir la page ${de(PROFILS[id].nom)}, ${PROFILS[id].metier.toLowerCase()} à ${PROFILS[id].ville}`, `See ${pageDe(profilDe(id, 'en').nom, 'en')}, ${profilDe(id, 'en').metier.toLowerCase()} in ${profilDe(id, 'en').ville}`)}><span className="hp-profil-photo"><Avatar profil={id} /></span><b className="hp-profil-nom">{profilDe(id, langue).nom}<Icone nom="ui-oeil" taille={18} /></b><small>{profilDe(id, langue).metier} · {profilDe(id, langue).ville}</small></button>)}</div>
    <dialog ref={boite} className="hp-dialogue" aria-labelledby="profil-titre" onKeyDown={fleches}
      onClose={() => { if (retour.current) galerie.current?.querySelector<HTMLButtonElement>(`[data-profil="${profil}"]`)?.focus(); retour.current = true; }} onClick={e => { if (e.target === e.currentTarget) boite.current?.close(); }}>
      <div className="hp-dialogue-tete">
        <h3 id="profil-titre" aria-live="polite">{pageDe(p.nom, langue)} <span className="hp-dialogue-rang">{l(`${i + 1} sur ${IDS_PROFILS.length}`, `${i + 1} of ${IDS_PROFILS.length}`)}</span></h3>
        <button type="button" autoFocus onClick={() => boite.current?.close()} aria-label={l('Fermer l’aperçu', 'Close preview')}><Icone nom="ui-fermer" taille={24} /></button>
      </div>
      <Telephone largeur={largeur} defile className="hl-tel-court" adresse={`hopla.page/${p.pseudo}`} label={l(`Exemple de page ${de(p.nom)}`, `Example page by ${p.nom}`)}><EcranPage page={pageProfil(profil, langue)} /></Telephone>
      <p className="hp-dialogue-qui">{l(`${p.metier} à ${p.ville}`, `${p.metier} in ${p.ville}`)}</p>
      <div className="hp-dialogue-pied">
        <button type="button" className="hp-dialogue-voisin" onClick={() => setProfil(voisin(-1))} aria-label={l(`Page précédente : ${PROFILS[voisin(-1)].nom}`, `Previous page: ${profilDe(voisin(-1), 'en').nom}`)}><Icone nom="ui-chevron" taille={20} className="hl-gauche" /></button>
        {!envoye && <button type="button" className="hl-btn" onClick={() => { retour.current = false; boite.current?.close(); allerAuChamp(); }}>{appel(mode, langue)}</button>}
        <button type="button" className="hp-dialogue-voisin" onClick={() => setProfil(voisin(1))} aria-label={l(`Page suivante : ${PROFILS[voisin(1)].nom}`, `Next page: ${profilDe(voisin(1), 'en').nom}`)}><Icone nom="ui-chevron" taille={20} className="hl-droite" /></button>
      </div>
    </dialog>
  </section>;
}
