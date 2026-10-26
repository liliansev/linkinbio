import { Avatar } from './Profils.tsx';
import { useState } from 'react';
import { useRouterState } from '@tanstack/react-router';
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import { Icone } from '../components/Icone.tsx';
import { ESSAI_JOURS, FONCTIONS, OFFRES, PLANS, PLANS_PAYANTS, PLAN_ESSAI, economie, euros, parMoisAnnuel, rang } from '../lib/abonnement.ts';
import { CONTACT_LEGAL } from '../lib/legal.ts';
import type { Fonction, Periode, Plan } from '../lib/abonnement.ts';
import { Marque } from './Ouverture.tsx';
import { PAGES_FONCTIONS } from './pages/fonctions.ts';
import { COMPARATIFS } from './pages/comparatifs.ts';
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
  'Ta page selon le réseau du visiteur': '/fonctionnalites/selon-le-reseau',
  'Les vingt thèmes': '/fonctionnalites/themes',
  'Tes couleurs, ta police, ton fond': '/fonctionnalites/themes',
  'Ta vitrine : produits, rendez-vous, dons': '/fonctionnalites/vitrine',
  'Tes liens programmés à l’avance': '/fonctionnalites/lancement',
  'Les avis de tes clients': '/fonctionnalites/avis',
  'Tes stats sur 30 jours': '/fonctionnalites/stats',
  'Ta page selon l’heure et le pays': '/fonctionnalites/page-selon-l-heure',
  'Les drops : un code, des places comptées': '/fonctionnalites/drops',
  'Ta liste e-mail, vers ta newsletter': '/fonctionnalites/liste-email',
  'Tes stats sur un an': '/fonctionnalites/stats',
};

/**
 * Ce qu'une carte montre d'abord (26 octobre 2026, retours d'un ami relayés par Lilian : « on ne comprend pas la
 * différence entre le gratuit, le starter et le pro ») : ce qui sépare l'offre de celle d'avant, quatre lignes au
 * plus ; le reste attend derrière « Et N autres ». Pro n'en a que cinq : tout se lit.
 */
const EN_AVANT: Partial<Record<Plan, string[]>> = {
  starter: ['Tes couleurs, ta police, ton fond', 'Ta vitrine : produits, rendez-vous, dons', 'Tes stats sur 30 jours', 'Sans la mention Hopla'],
};

/**
 * Le tableau des offres (26 octobre 2026, demandé par Lilian : « faut pas préciser sur quel plan on a quelle
 * feature, cela doit être détaillé dans un tableau dans la section pricing ») : le seul endroit du site qui dit
 * quelle offre donne quelle fonction. Une ligne nomme sa fonction réservée (`FONCTIONS`, la seule source) et la
 * coche se calcule ; `valeurs` pour ce qui se compte (blocs, stats), une valeur par offre en vente.
 */
type LigneTableau = { nom: string; page?: string } & ({ fonction?: Fonction; valeurs?: never } | { fonction?: never; valeurs: [string, string, string] });
const TABLEAU: { groupe: string; lignes: LigneTableau[] }[] = [
  { groupe: 'Ta page', lignes: [
    { nom: 'Ta page selon le réseau du visiteur', page: 'selon-le-reseau' },
    { nom: 'Tes liens ouverts dans leur app', page: 'ouvrir-dans-l-app' },
    { nom: 'Les vingt thèmes', page: 'themes' },
    { nom: 'Blocs sur ta page', valeurs: ['5', 'Sans limite', 'Sans limite'] },
    { nom: 'Ta page sans la mention Hopla', fonction: 'sansMention' },
  ] },
  { groupe: 'Ton style', lignes: [
    { nom: 'Tes couleurs, ta police, ton fond', fonction: 'couleurs', page: 'themes' },
    { nom: 'Grande photo, liens en grille', fonction: 'grille' },
    { nom: 'Photos par galerie', valeurs: ['3', '12', '12'] },
    { nom: 'Ton formulaire de contact', fonction: 'formulaire' },
  ] },
  { groupe: 'Vendre', lignes: [
    { nom: 'Ta vitrine : produits, rendez-vous, dons', fonction: 'vitrine', page: 'vitrine' },
    { nom: 'Les avis de tes clients', fonction: 'avis', page: 'avis' },
    { nom: 'Liens partenaires, mention « Publicité »' },
  ] },
  { groupe: 'Au bon moment', lignes: [
    { nom: 'Tes liens programmés à l’avance', fonction: 'programmation', page: 'lancement' },
    { nom: 'Ta page selon l’heure et le pays', fonction: 'heure', page: 'page-selon-l-heure' },
    { nom: 'Les drops : un code, des places comptées', fonction: 'drops', page: 'drops' },
  ] },
  { groupe: 'Ton audience', lignes: [
    { nom: 'Ta liste e-mail, vers ta newsletter', fonction: 'listeEmail', page: 'liste-email' },
    { nom: 'Un cadeau contre l’e-mail', fonction: 'cadeau' },
    { nom: 'Tes derniers articles, en RSS', fonction: 'flux' },
  ] },
  { groupe: 'Tes stats, sans cookie', lignes: [
    { nom: 'Tes vues', valeurs: ['7 jours', '30 jours', 'Un an'], page: 'stats' },
    { nom: 'Clics, réseaux et pays de tes visiteurs', fonction: 'stats', page: 'stats' },
    { nom: 'L’essentiel chaque lundi par e-mail', fonction: 'stats' },
    { nom: 'Redirection et suivi UTM', fonction: 'utm' },
  ] },
];
const EN_VENTE = PLANS.filter(plan => OFFRES[plan].enVente);
/** Le visage de chaque offre, celui de sa carte au-dessus. */
const VISAGE = { gratuit: 'camille', starter: 'ines', pro: 'malik', premium: 'malik' } as const;

function Case({ ligne, plan }: { ligne: LigneTableau; plan: Plan }) {
  if (ligne.valeurs) return <td>{ligne.valeurs[EN_VENTE.indexOf(plan)]}</td>;
  const inclus = !ligne.fonction || rang(plan) >= rang(FONCTIONS[ligne.fonction]);
  return inclus
    ? <td><Icone nom="check" taille={20} className="hl-tableau-oui" /><span className="hl-cache">Inclus</span></td>
    : <td><span className="hl-tableau-non" aria-hidden="true" /><span className="hl-cache">Non inclus</span></td>;
}

/**
 * En tête, chaque offre avec son visage et son prix de la période choisie au-dessus (Pro sur le bleu, comme sa carte) ;
 * au pied, le même bouton que sa carte : on choisit là où l'on a fini de comparer.
 */
function TableauOffres({ periode, reserver, action }: { periode: Periode; reserver: (ev: MouseEvent, plan: Plan) => void; action: (plan: Plan) => string | null }) {
  return (
    <div className="hl-tableau hl-entre">
      <h3 className="hl-h3 hl-tableau-titre">Tout comparer</h3>
      <table>
        <caption className="hl-cache">Ce que comprend chaque offre</caption>
        <thead>
          <tr>
            <td><span className="hl-cache">Fonction</span></td>
            {EN_VENTE.map(plan => (
              <th key={plan} scope="col" className={plan === 'pro' ? 'hl-tableau-pro' : ''}>
                <span className="hl-tableau-offre"><Avatar profil={VISAGE[plan]} />{OFFRES[plan].nom}</span>
                <span className="hl-tableau-prix"><b>{plan === 'gratuit' ? '0 €' : euros(OFFRES[plan].prix[periode])}</b> {plan === 'gratuit' ? 'pour toujours' : periode === 'an' ? 'par an' : 'par mois'}</span>
                {plan === PLAN_ESSAI && <span className="hl-tableau-essai">{ESSAI_JOURS} jours offerts</span>}
              </th>
            ))}
          </tr>
        </thead>
        {TABLEAU.map(({ groupe, lignes }) => (
          <tbody key={groupe}>
            <tr className="hl-tableau-groupe"><th scope="rowgroup">{groupe}</th>{EN_VENTE.map(plan => <td key={plan} />)}</tr>
            {lignes.map(l => (
              <tr key={l.nom}>
                <th scope="row">{l.page ? <a href={`/fonctionnalites/${l.page}`}>{l.nom}<span className="hl-cache">, voir la fonctionnalité</span></a> : l.nom}</th>
                {EN_VENTE.map(plan => <Case key={plan} ligne={l} plan={plan} />)}
              </tr>
            ))}
          </tbody>
        ))}
        {EN_VENTE.some(plan => action(plan)) && (
          <tfoot>
            <tr>
              <td />
              {EN_VENTE.map(plan => (
                <td key={plan}>
                  {action(plan) && <a href="#reserver" className={`hl-btn ${plan === 'pro' ? '' : 'hl-btn-contour'}`} onClick={ev => reserver(ev, plan)}>{action(plan)}</a>}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

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
      <div className="hl-prix-cartes">
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
                {(EN_AVANT[plan] ?? o.avantages).map(g => <Avantage key={g} g={g} />)}
              </ul>
              {EN_AVANT[plan] && (
                <details className="hl-offre-reste">
                  <summary>Et {o.avantages.length - EN_AVANT[plan].length} autres<Icone nom="ui-plus" taille={16} /></summary>
                  <ul data-ouvert="">{o.avantages.filter(g => !EN_AVANT[plan]?.includes(g)).map(g => <Avantage key={g} g={g} />)}</ul>
                </details>
              )}
              {/* On commence toujours par l'essai de Pro : l'offre se prend ensuite depuis les réglages. */}
              {!envoye && o.enVente && (
                <div className="hp-offre-action">
                  <a href="#reserver" className={`hl-btn ${plan === 'gratuit' ? '' : 'hl-btn-contour'}`} onClick={ev => reserver(ev, plan)}>
                    {plan === 'gratuit' || mode !== 'libre' ? libelle : 'Créer mon compte'}
                  </a>
                  {plan !== 'gratuit' && mode === 'libre' && <p>{plan === PLAN_ESSAI ? `${ESSAI_JOURS} jours offerts, puis active ${o.nom}${periode === 'an' ? ' à l’année' : ''} dans tes réglages.` : `Puis active ${o.nom}${periode === 'an' ? ' à l’année' : ''} dans tes réglages.`}</p>}
                </div>
              )}
            </article>
          );
        })}
      </div>
      </div>
      <TableauOffres periode={periode} reserver={reserver} action={plan => envoye || !OFFRES[plan].enVente ? null : 'Choisir'} />
      <p className="hl-gris hl-petit hl-centre">Prix TTC. Ta page commence par {ESSAI_JOURS} jours de {OFFRES[PLAN_ESSAI].nom} offerts, sans carte bancaire ; ensuite elle reste en ligne en Gratuit, ou tu prends une offre depuis tes réglages. Résiliable à tout moment : l’offre reste jusqu’à la fin de la période payée.</p>
    </section>
  );
}

function Avantage({ g }: { g: string }) {
  return (
    <li><Icone nom="check" taille={18} /><span>{DEMOS[g]
      ? <a className="hl-offre-demo" href={DEMOS[g]}>{insecables(g)}<span className="hl-cache">, voir la fonctionnalité</span></a>
      : insecables(g)}</span></li>
  );
}

/** Les six questions qu'on lit d'abord (26 octobre 2026 : onze à la suite allongeaient trop la page). */
const ESSENTIELLES = ['C’est quoi, Hopla', 'C’est vraiment gratuit', 'Combien de temps', 'Quand aurai-je', 'Quelle sera mon adresse', QUESTION_LINKTREE, 'Mes visiteurs sont-ils pistés'];

const essentielle = ([q]: [string, string]) => ESSENTIELLES.some(e => q.startsWith(e));

function question([q, r]: [string, string]) {
  return (
    <details key={q} className="hl-question">
      <summary>{q}<Icone nom="ui-plus" taille={18} /></summary>
      <p>{r}{q === QUESTION_LINKTREE && <> <button type="button" className="hl-lien-texte" onClick={() => allerAuChamp()}>Coller mon adresse Linktree</button></>}</p>
    </details>
  );
}

export function Questions() {
  const liste = questions(useInscription());
  const autres = liste.filter(q => !essentielle(q));
  return (
    <section className="hl-section hl-etroite" id="questions" aria-labelledby="titre-questions">
      <div className="hl-questions-tete hl-entre">
        <h2 id="titre-questions" className="hl-h2">Questions</h2>
        {/* Qui répond, dit avant d'écrire : l'adresse est celle de Lilian, qui fait Hopla. */}
        <p>Une autre question ? <a href={`mailto:${CONTACT_LEGAL}`}>Écris à Lilian</a>, qui fait Hopla.</p>
      </div>
      <div className="hl-questions">
        {liste.filter(essentielle).map(question)}
        {/* Les autres restent dans la page (et dans les données structurées), repliées : la page reste courte. */}
        <details className="hl-questions-plus">
          <summary>Les {autres.length} autres questions<Icone nom="ui-plus" taille={18} /></summary>
          {autres.map(question)}
        </details>
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

/**
 * Le pied de toutes les pages publiques de hopla.page (26 octobre 2026, demandé par Lilian : « il manque un vrai footer,
 * avec toutes les pages, les vs ») : la marque et sa promesse, puis quatre colonnes, Hopla, les dix fonctions, les six
 * comparatifs, l'aide et les textes légaux ; sur la nuit, sous le dernier appel en bleu. Aucun prix : les tarifs se lisent
 * dans leur section.
 */
const COLONNES: { titre: string; liens: [string, string][] }[] = [
  { titre: 'Découvrir', liens: [
    ['Toutes les fonctionnalités', '/fonctionnalites'],
    ['Tarifs', '/#prix'],
    ['Questions', '/#questions'],
    ['Voir une vraie page', '/lilian'],
    ['Connexion', '/admin'],
  ] },
  { titre: 'Fonctionnalités', liens: PAGES_FONCTIONS.map(f => [f.nom, `/fonctionnalites/${f.slug}`]) },
  { titre: 'Comparatifs', liens: [
    ...COMPARATIFS.map((c): [string, string] => [`Hopla vs ${c.nom}`, `/comparatif/${c.slug}`]),
    ['Tous les comparatifs', '/comparatif'],
  ] },
  { titre: 'Aide et légal', liens: [
    ['Écrire à Lilian', `mailto:${CONTACT_LEGAL}`],
    ['Signaler un contenu', '/signaler'],
    ['Conditions d’utilisation', '/legal/cgu'],
    ['Confidentialité', '/legal/confidentialite'],
    ['Traitement des données', '/legal/traitement-des-donnees'],
    ['Sous-traitants', '/legal/sous-traitants'],
    ['Mentions légales', '/legal/mentions-legales'],
  ] },
];

export function Pied() {
  // Le lien de la page où l'on est se dit, et se lit à l'encre.
  const chemin = useRouterState({ select: st => st.location.pathname });
  return (
    <footer className="hl-pied" data-teinte="nuit">
      <div className="hl-pied-dedans">
        <div className="hl-pied-marque">
          <Marque />
          <p>Un lien qui te ressemble, et s’adapte à chaque visiteur.</p>
        </div>
        {COLONNES.map((c, i) => (
          <nav key={c.titre} className="hl-pied-colonne" aria-labelledby={`pied-${i}`}>
            <h2 id={`pied-${i}`}>{c.titre}</h2>
            <ul>{c.liens.map(([nom, href]) => <li key={href}><a href={href} aria-current={href === chemin ? 'page' : undefined}>{nom}</a></li>)}</ul>
          </nav>
        ))}
        <p className="hl-pied-bas">© 2026 Hopla, édité par AURA GROUP</p>
      </div>
    </footer>
  );
}
