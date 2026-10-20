import { useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import { Icone } from '../components/Icone.tsx';
import { OFFRES, PLANS, PLANS_PAYANTS, economie, euros, parMoisAnnuel } from '../lib/abonnement.ts';
import { CONTACT_LEGAL } from '../lib/legal.ts';
import type { Periode, Plan } from '../lib/abonnement.ts';
import { Marque } from './Ouverture.tsx';
import { Reserver, allerAuChamp, useReservation } from './Reserver.tsx';
import type { ApiAccueil } from './Reserver.tsx';
import { MOTS, appel, questions, useInscription } from './textes.ts';

/* 09 · Les prix ; 10 · les questions ; 11 · le dernier appel et le pied de page. */

const PERIODES: Periode[] = ['an', 'mois'];
/** Ce que l'annuel fait gagner au mieux, pour l'onglet (27 % sur le Pro). */
const MEILLEURE = Math.max(...PLANS_PAYANTS.filter(p => OFFRES[p].enVente).map(economie));

/** L'e-mail est parti (ou se corrige) : la page ne propose plus de créer. */
function useEnvoye() {
  const { etape, ancien, correction } = useReservation();
  return etape === 'fait' || !!ancien || correction;
}

export function Prix() {
  const [periode, setPeriode] = useState<Periode>('an');
  // Au téléphone, les avantages se replient sous chaque carte ; au bureau, ils sont toujours ouverts.
  const [ouverts, setOuverts] = useState<Plan[]>([]);
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
        <h2 id="titre-prix" className="hl-h2">Gratuit pour commencer. Une offre quand ta page grandit.</h2>
      </div>
      <div className="hl-periode hl-entre" role="radiogroup" aria-label="Paiement" onKeyDown={fleches}>
        {PERIODES.map(p => (
          <button key={p} type="button" role="radio" data-periode={p} aria-checked={periode === p} tabIndex={periode === p ? 0 : -1} onClick={() => setPeriode(p)}>
            {p === 'mois' ? 'Mensuel' : <>Annuel <span className="hl-periode-gain">jusqu’à −{MEILLEURE} %</span></>}
          </button>
        ))}
      </div>
      <div className="hl-offres">
        {PLANS.map((plan, i) => {
          const o = OFFRES[plan];
          const ouvert = ouverts.includes(plan);
          const avant = i ? OFFRES[PLANS[i - 1]].nom : null;
          return (
            <article key={plan} className={`hl-offre hl-entre ${plan === 'pro' ? 'hl-offre-pro' : ''}`} style={{ '--d': `${i * 60}ms` } as CSSProperties}>
              <div className="hl-offre-tete">
                <h3 className="hl-h3">{o.nom}</h3>
                {plan === 'pro' && <span className="hl-offre-badge">Recommandé</span>}
                {!o.enVente && <span className="hl-offre-badge hl-offre-badge-pale">Bientôt</span>}
              </div>
              {plan === 'gratuit' ? (
                <div>
                  <p className="hl-prix"><b>0 €</b></p>
                  <p className="hl-gris hl-petit hl-prix-an">Pour toujours, sans carte bancaire</p>
                </div>
              ) : (
                <div>
                  <p className="hl-prix"><b key={periode} className="hl-prix-glisse">{euros(periode === 'an' ? parMoisAnnuel(plan) : o.prix.mois)}</b> <span className="hl-gris">par mois</span></p>
                  <p className="hl-gris hl-petit hl-prix-an">{periode === 'an' ? <>{euros(o.prix.an)} par an, au lieu de <s>{euros(o.prix.mois * 12)}</s></> : 'Sans engagement'}</p>
                </div>
              )}
              <p className="hl-offre-phrase">{o.phrase}</p>
              <button type="button" className="hl-offre-plus" aria-expanded={ouvert} aria-controls={`offre-${plan}`}
                onClick={() => setOuverts(l => (l.includes(plan) ? l.filter(x => x !== plan) : [...l, plan]))}>
                Ce qu’elle comprend <Icone nom="ui-chevron" taille={16} />
              </button>
              <ul id={`offre-${plan}`} data-ouvert={ouvert || undefined}>
                {avant && <li className="hl-offre-avant">Tout {avant}, et :</li>}
                {o.avantages.map(g => <li key={g}><Icone nom="check" taille={18} />{g}</li>)}
              </ul>
              {/* On commence toujours en Gratuit : l'offre se prend ensuite depuis les réglages. */}
              {!envoye && o.enVente && (
                <a href="#reserver" className={`hl-btn ${plan === 'gratuit' ? '' : 'hl-btn-contour'}`} onClick={reserver}>
                  {plan === 'gratuit' || mode !== 'libre' ? libelle : 'Commencer gratuitement'}
                </a>
              )}
            </article>
          );
        })}
      </div>
      <p className="hl-gris hl-petit hl-centre">Prix TTC. Tu commences en Gratuit, puis tu prends une offre depuis tes réglages, quand tu veux. Résiliable à tout moment : l’offre reste jusqu’à la fin de la période payée.</p>
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
    <section className="hl-section hl-dernier" data-teinte="rose" aria-labelledby="dernier">
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
