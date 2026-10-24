import { Avatar } from './Profils.tsx';
import { useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import { Icone } from '../components/Icone.tsx';
import { OFFRES, PLANS, PLANS_PAYANTS, economie, euros, parMoisAnnuel } from '../lib/abonnement.ts';
import { CONTACT_LEGAL } from '../lib/legal.ts';
import type { Periode, Plan } from '../lib/abonnement.ts';
import { Marque } from './Ouverture.tsx';
import { Reserver, allerAuChamp, choisirOffre, useReservation } from './Reserver.tsx';
import type { ApiAccueil } from './Reserver.tsx';
import { MOTS, QUESTION_LINKTREE, appel, questions, useInscription } from './textes.ts';

/* 09 · Les prix ; 10 · les questions ; 11 · le dernier appel et le pied de page. */

/** Mensuel d'abord : c'est la période choisie à l'arrivée, l'annuel se lit à côté avec ce qu'il fait gagner. */
const PERIODES: Periode[] = ['mois', 'an'];
/** Ce que l'annuel fait gagner au mieux, pour l'onglet (27 % sur Starter). */
const MEILLEURE = Math.max(...PLANS_PAYANTS.filter(p => OFFRES[p].enVente).map(economie));

/** Un avantage ne laisse ni guillemet ni dernier mot seul sur sa ligne (« ta newsletter »). */
const insecables = (g: string) => g.replace(/« /g, '«\u00a0').replace(/ »/g, '\u00a0»').replace(/ (\S+)$/, '\u00a0$1');

/** Ce que la page a déjà montré : l'avantage ramène à sa démonstration (un chapitre de la page vivante s'ouvre en arrivant). */
const DEMOS: Record<string, string> = {
  'Ta page selon le réseau du visiteur': '#fonctionnement',
  'Les vingt thèmes': '#themes',
  'Tes couleurs, ta police, ton fond': '#couleurs',
  'Tes liens programmés à l’avance': '#vivante-lancement',
  'Les avis de tes clients': '#vivante-avis',
  'Tes stats sur 30 jours': '#stats',
  'Ta page selon l’heure et le pays': '#vivante-heure',
  'Les drops : un code, des places comptées': '#vivante-drops',
  'Ta liste e-mail, vers ta newsletter': '#vivante-liste',
  'Tes stats sur un an': '#stats',
};

/** L'e-mail est parti (ou se corrige) : la page ne propose plus de créer. */
function useEnvoye() {
  const { etape, ancien, correction } = useReservation();
  return etape === 'fait' || !!ancien || correction;
}

export function Prix() {
  const [periode, setPeriode] = useState<Periode>('mois');
  // Les prix changent sous les yeux ; aux lecteurs d'écran, une phrase les redit, seulement quand on change de période.
  const [annonce, setAnnonce] = useState('');
  const changer = (p: Periode) => {
    setPeriode(p);
    const payants = PLANS_PAYANTS.filter(plan => OFFRES[plan].enVente).map(plan => `${OFFRES[plan].nom} ${euros(OFFRES[plan].prix[p])}`).join(', ');
    setAnnonce(p === 'an' ? `À l’année : ${payants} par an.` : `Au mois : ${payants} par mois.`);
  };
  const mode = useInscription();
  const envoye = useEnvoye();
  const libelle = appel(mode);
  // L'offre choisie suit le visiteur jusqu'au champ : il lit qu'il commence en Gratuit et où l'activer ensuite.
  const reserver = (ev: MouseEvent, plan: Plan) => { ev.preventDefault(); choisirOffre(plan === 'gratuit' ? '' : plan, periode); allerAuChamp(); };
  // Un groupe de boutons radio : un seul arrêt de tabulation, les flèches changent de période.
  const fleches = (ev: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(ev.key)) return;
    ev.preventDefault();
    const suivante = periode === 'mois' ? 'an' : 'mois';
    changer(suivante);
    ev.currentTarget.querySelector<HTMLButtonElement>(`[data-periode="${suivante}"]`)?.focus();
  };
  return (
    <section className="hl-section" id="prix" aria-labelledby="titre-prix">
      <div className="hl-tete-section hl-entre">
        <h2 id="titre-prix" className="hl-h2">Ta place sur internet<br /><span className="hl-cache">. </span><span>À ton rythme</span></h2>
      </div>
      <div className="hl-periode hl-entre" role="radiogroup" aria-label="Paiement" onKeyDown={fleches}>
        {PERIODES.map(p => (
          <button key={p} type="button" role="radio" data-periode={p} aria-checked={periode === p} tabIndex={periode === p ? 0 : -1} onClick={() => changer(p)}>
            {p === 'mois' ? 'Mensuel' : <>Annuel <span className="hl-periode-gain">jusqu’à −{MEILLEURE}&nbsp;%</span></>}
          </button>
        ))}
      </div>
      <p className="hl-cache" aria-live="polite">{annonce}</p>
      <div className="hl-offres">
        {PLANS.filter(plan => OFFRES[plan].enVente).map((plan, i) => {
          const o = OFFRES[plan];
          const avant = i ? OFFRES[PLANS[i - 1]].nom : null;
          return (
            <article key={plan} className={`hl-offre hl-entre ${plan === 'pro' ? 'hl-offre-pro' : ''}`} style={{ '--d': `${i * 60}ms` } as CSSProperties}>
              <div className="hp-offre-personne"><Avatar profil={plan === 'gratuit' ? 'camille' : plan === 'starter' ? 'ines' : 'malik'} /><span>{plan === 'gratuit' ? 'Pour partager ce que tu fais' : plan === 'starter' ? 'Pour affirmer ton univers' : 'Pour une page qui travaille avec toi'}</span></div>
              <div className="hl-offre-tete">
                <h3 className="hl-h3">{o.nom}</h3>
                {plan === 'pro' && <span className="hl-offre-badge">Le plus complet</span>}
                {!o.enVente && <span className="hl-offre-badge hl-offre-badge-pale">Bientôt</span>}
              </div>
              {plan === 'gratuit' ? (
                <div>
                  <p className="hl-prix"><b>0 €</b></p>
                  <p className="hl-gris hl-petit hl-prix-an">Pour toujours, sans carte bancaire</p>
                </div>
              ) : (
                <div>
                  {/* À l'année, le prix qu'on paie en grand ; ce qu'il fait par mois vient dessous. */}
                  <p className="hl-prix"><b key={periode} className="hl-prix-glisse">{euros(o.prix[periode])}</b> <span className="hl-gris">{periode === 'an' ? 'par an' : 'par mois'}</span></p>
                  <p className="hl-gris hl-petit hl-prix-an">{periode === 'an' ? <>Au lieu de <s>{euros(o.prix.mois * 12)}</s>, soit {euros(parMoisAnnuel(plan))} par mois</> : 'Sans engagement'}</p>
                </div>
              )}
              <p className="hl-offre-phrase">{o.phrase}</p>
              <ul id={`offre-${plan}`} data-ouvert="">
                {avant && <li className="hl-offre-avant">Tout {avant}, et :</li>}
                {o.avantages.map(g => <li key={g}><Icone nom="check" taille={18} /><span>{DEMOS[g]
                  ? <a className="hl-offre-demo" href={DEMOS[g]}>{insecables(g)}<span className="hl-cache">, à revoir plus haut</span></a>
                  : insecables(g)}</span></li>)}
              </ul>
              {/* On commence toujours en Gratuit : l'offre se prend ensuite depuis les réglages. */}
              {!envoye && o.enVente && (
                <div className="hp-offre-action">
                  <a href="#reserver" className={`hl-btn ${plan === 'gratuit' ? '' : 'hl-btn-contour'}`} onClick={ev => reserver(ev, plan)}>
                    {plan === 'gratuit' || mode !== 'libre' ? libelle : 'Créer mon compte'}
                  </a>
                  {plan !== 'gratuit' && mode === 'libre' && <p>Puis active {o.nom}{periode === 'an' ? ' à l’année' : ''} dans tes réglages.</p>}
                </div>
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
    <section className="hl-section hl-etroite" id="questions" aria-labelledby="titre-questions">
      <div className="hl-questions-tete hl-entre">
        <h2 id="titre-questions" className="hl-h2">Questions</h2>
        {/* Qui répond, dit avant d'écrire : l'adresse est celle de Lilian, qui fait Hopla. */}
        <p>Une autre question ? <a href={`mailto:${CONTACT_LEGAL}`}>Écris à Lilian</a>, qui fait Hopla.</p>
      </div>
      <div className="hl-questions">
        {liste.map(([q, r]) => (
          <details key={q} className="hl-question">
            <summary>{q}<Icone nom="ui-plus" taille={18} /></summary>
            <p>{r}{q === QUESTION_LINKTREE && <> <button type="button" className="hl-lien-texte" onClick={() => allerAuChamp()}>Coller mon adresse Linktree</button></>}</p>
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
    <section className="hl-section hl-dernier" data-teinte="klein" aria-labelledby="dernier">
      <h2 id="dernier" className="hl-h2 hl-h2-grand hl-entre">{envoye ? MOTS[mode].fin : <>Réserve ton nom <br className="hl-br-large" />en premier</>}</h2>
      <div className="hl-entre" style={{ '--d': '120ms' } as CSSProperties} data-zone-appel=""><Reserver api={api} id="reserver-fin" grand libelleNom={mode === 'libre' ? 'Réserver mon nom' : undefined} note={MOTS[mode].note} /></div>
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
