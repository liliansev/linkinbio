import { useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { Icone } from '../components/Icone.tsx';
import { AVANTAGES_PRO, TARIFS, euros } from '../lib/abonnement.ts';
import type { Periode } from '../lib/abonnement.ts';
import { Marque } from './Ouverture.tsx';
import { Reserver, allerAuChamp } from './Reserver.tsx';
import type { ApiAccueil } from './Reserver.tsx';
import { appel, questions, useInscription } from './textes.ts';

/* 09 · Les prix ; 10 · les questions ; 11 · le dernier appel et le pied de page. */

const GRATUIT = [
  'Ta page selon le réseau et l’heure',
  'Les drops, avec code ou places comptées',
  'Ta liste e-mail, vers Brevo ou Mailchimp',
  'Avis, vidéos et QR code',
  'Cinq langues',
  'Vingt thèmes et tes couleurs',
  'Stats sur 7 jours et résumé du lundi',
  '25 Mo d’images',
];

export function Prix() {
  const [periode, setPeriode] = useState<Periode>('mois');
  const libelle = appel(useInscription());
  const reserver = (ev: MouseEvent) => { ev.preventDefault(); allerAuChamp(); };
  return (
    <section className="hl-section" id="prix" aria-labelledby="titre-prix">
      <div className="hl-tete-section hl-entre">
        <h2 id="titre-prix" className="hl-h2">Gratuit pour tout faire. Pro pour aller plus loin.</h2>
      </div>
      <div className="hl-periode hl-entre" role="radiogroup" aria-label="Période de facturation du Pro">
        <button type="button" role="radio" aria-checked={periode === 'mois'} onClick={() => setPeriode('mois')}>Par mois</button>
        <button type="button" role="radio" aria-checked={periode === 'an'} onClick={() => setPeriode('an')}>Par an · {TARIFS.an.economie}</button>
      </div>
      <div className="hl-offres">
        <article className="hl-offre hl-entre">
          <h3 className="hl-h3">Gratuit</h3>
          <p className="hl-prix"><b>0 €</b> <span className="hl-gris">pour toujours</span></p>
          <ul>{GRATUIT.map(g => <li key={g}><Icone nom="check" taille={18} />{g}</li>)}</ul>
          <a href="#reserver" className="hl-btn" onClick={reserver}>{libelle}</a>
        </article>
        <article className="hl-offre hl-offre-pro hl-entre" style={{ '--d': '80ms' } as CSSProperties}>
          <h3 className="hl-h3">Pro</h3>
          <p className="hl-prix" aria-live="polite">
            <b key={periode} className="hl-prix-glisse">{euros(TARIFS[periode].prix)}</b>{' '}
            <span className="hl-gris">{periode === 'mois' ? 'par mois' : `par an, soit ${euros(Math.round((TARIFS.an.prix / 12) * 100) / 100)} par mois`}</span>
          </p>
          <ul>{['Tout le gratuit', ...AVANTAGES_PRO].map(g => <li key={g}><Icone nom="check" taille={18} />{g}</li>)}</ul>
          <a href="#reserver" className="hl-btn hl-btn-contour" onClick={reserver}>{libelle}</a>
        </article>
      </div>
      <p className="hl-gris hl-petit hl-centre">Prix TTC. Tu résilies quand tu veux depuis ton compte ; le Pro reste jusqu’à la fin de la période payée.</p>
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
  return (
    <section className="hl-section hl-dernier" aria-labelledby="dernier">
      <h2 id="dernier" className="hl-h2 hl-h2-grand hl-entre">Ton nom est <span className="hl-insecable">peut-être</span> encore libre.</h2>
      <div className="hl-entre" style={{ '--d': '120ms' } as CSSProperties}><Reserver api={api} /></div>
      <a href="/lilian" className="hl-lien-gris">Voir la page de Lilian</a>
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
      </nav>
    </footer>
  );
}
