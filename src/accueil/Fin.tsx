import { useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import { Icone } from '../components/Icone.tsx';
import { AVANTAGES_PRO, TARIFS, euros } from '../lib/abonnement.ts';
import { CONTACT_LEGAL } from '../lib/legal.ts';
import type { Periode } from '../lib/abonnement.ts';
import { Marque } from './Ouverture.tsx';
import { Reserver, allerAuChamp, useReservation } from './Reserver.tsx';
import type { ApiAccueil } from './Reserver.tsx';
import { MOTS, appel, questions, useInscription } from './textes.ts';

/* 09 · Les prix ; 10 · les questions ; 11 · le dernier appel et le pied de page. */

/** Tout ce que fait l'offre gratuite ; les fonctions que la page ne montre pas plus haut y sont dites en une ligne. */
const GRATUIT = [
  'Ta page selon le réseau et l’heure, et les drops',
  'Ta liste e-mail, vers Brevo, Mailchimp ou un fichier CSV',
  'Avis de tes clients, vidéos intégrées, QR code, page en cinq langues',
  'Vingt thèmes et tes couleurs',
  'Stats sur 7 jours et résumé du lundi',
  'Tes données exportées en un clic',
  '25 Mo d’images',
];
const PERIODES: Periode[] = ['mois', 'an'];

/** L'e-mail est parti (ou se corrige) : la page ne propose plus de créer. */
function useEnvoye() {
  const { etape, ancien, correction } = useReservation();
  return etape === 'fait' || !!ancien || correction;
}

export function Prix() {
  const [periode, setPeriode] = useState<Periode>('mois');
  const mode = useInscription();
  const envoye = useEnvoye();
  const libelle = appel(mode);
  const reserver = (ev: MouseEvent) => { ev.preventDefault(); allerAuChamp(); };
  // Un groupe de boutons radio : un seul arrêt de tabulation, les flèches changent de période.
  const fleches = (ev: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(ev.key)) return;
    ev.preventDefault();
    const suivante = periode === 'mois' ? 'an' : 'mois';
    setPeriode(suivante);
    ev.currentTarget.querySelector<HTMLButtonElement>(`[data-periode="${suivante}"]`)?.focus();
  };
  return (
    <section className="hl-section" id="prix" aria-labelledby="titre-prix">
      <div className="hl-tete-section hl-entre">
        <h2 id="titre-prix" className="hl-h2">Gratuit pour tout faire. Pro, sans la mention Hopla.</h2>
      </div>
      <div className="hl-offres">
        <article className="hl-offre hl-entre">
          <h3 className="hl-h3">Gratuit</h3>
          <p className="hl-prix"><b>0 €</b> <span className="hl-gris">pour toujours</span></p>
          <ul>{GRATUIT.map(g => <li key={g}><Icone nom="check" taille={18} />{g}</li>)}</ul>
          {!envoye && <a href="#reserver" className="hl-btn" onClick={reserver}>{libelle}</a>}
        </article>
        <article className="hl-offre hl-offre-pro hl-entre" style={{ '--d': '80ms' } as CSSProperties}>
          <h3 className="hl-h3">Pro</h3>
          <div className="hl-periode" role="radiogroup" aria-label="Période de facturation du Pro" onKeyDown={fleches}>
            {PERIODES.map(p => (
              <button key={p} type="button" role="radio" data-periode={p} aria-checked={periode === p} tabIndex={periode === p ? 0 : -1} onClick={() => setPeriode(p)}>
                {p === 'mois' ? 'Par mois' : `Par an, ${TARIFS.an.economie}`}
              </button>
            ))}
          </div>
          <p className="hl-prix" aria-live="polite">
            <b key={periode} className="hl-prix-glisse">{euros(TARIFS[periode].prix)}</b>{' '}
            <span className="hl-gris">{periode === 'mois' ? 'par mois' : `par an, soit ${euros(Math.round((TARIFS.an.prix / 12) * 100) / 100)} par mois`}</span>
          </p>
          <ul>{['Tout le gratuit', ...AVANTAGES_PRO].map(g => <li key={g}><Icone nom="check" taille={18} />{g}</li>)}</ul>
          {!envoye && <a href="#reserver" className="hl-btn hl-btn-contour" onClick={reserver}>{mode === 'libre' ? 'Commencer gratuitement' : libelle}</a>}
          <p className="hl-gris hl-petit hl-centre">Le Pro s’active ensuite depuis tes réglages.</p>
        </article>
      </div>
      <p className="hl-gris hl-petit hl-centre">Prix TTC. Tu résilies quand tu veux depuis ton compte ; le Pro reste jusqu’à la fin de la période payée.</p>
    </section>
  );
}

export function Questions() {
  const liste = questions(useInscription());
  return (
    <section className="hl-section hl-etroite" aria-labelledby="questions">
      <h2 id="questions" className="hl-h2 hl-entre">Questions</h2>
      <div className="hl-questions">
        {liste.map(([q, r]) => (
          <details key={q} className="hl-question">
            <summary>{q}<Icone nom="ui-plus" taille={18} /></summary>
            <p>{r}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function DernierAppel({ api }: { api: ApiAccueil }) {
  const mode = useInscription();
  // Pour qui vient d'envoyer, la fin dit où l'attend la suite au lieu de relancer.
  const envoye = useEnvoye();
  return (
    <section className="hl-section hl-dernier" aria-labelledby="dernier">
      <h2 id="dernier" className="hl-h2 hl-h2-grand hl-entre">{envoye ? MOTS[mode].fin : <>Ton nom est <span className="hl-insecable">peut-être</span> <span className="hl-insecable">encore libre.</span></>}</h2>
      <div className="hl-entre" style={{ '--d': '120ms' } as CSSProperties} data-zone-appel=""><Reserver api={api} id="reserver-fin" grand note={MOTS[mode].note} /></div>
      <a href="/lilian" className="hl-lien-gris">Voir une vraie page</a>
    </section>
  );
}

export function Pied() {
  return (
    <footer className="hl-pied">
      <Marque />
      <nav aria-label="Liens utiles">
        <a href="/admin">Connexion</a>
        <a href="/legal/cgu">Conditions</a>
        <a href="/legal/confidentialite">Confidentialité</a>
        <a href="/legal/mentions-legales">Mentions légales</a>
        <a href="/signaler">Signaler un contenu</a>
        <a href={`mailto:${CONTACT_LEGAL}`}>Contact</a>
      </nav>
    </footer>
  );
}
