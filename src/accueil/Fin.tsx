import { Avatar } from './Profils.tsx';
import { useState } from 'react';
import { useRouterState } from '@tanstack/react-router';
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import { Icone } from '../components/Icone.tsx';
import { ESSAI_JOURS, FONCTIONS, OFFRES, PLANS, PLANS_PAYANTS, PLAN_ESSAI, economie, euros, parMoisAnnuel, rang } from '../lib/abonnement.ts';
import { CONTACT_LEGAL } from '../lib/legal.ts';
import { LIEN_SOURCE, NOM_EDITEUR } from '../lib/instance.ts';
import type { Fonction, Periode, Plan } from '../lib/abonnement.ts';
import { Marque } from './Ouverture.tsx';
import { PAGES_FONCTIONS } from './pages/fonctions.ts';
import { COMPARATIFS } from './pages/comparatifs.ts';
import { Reserver, allerAuChamp, choisirOffre, useReservation } from './Reserver.tsx';
import type { ApiAccueil } from './Reserver.tsx';
import { NOM_PUBLIC } from '../lib/types.ts';
import { MOTS, QUESTION_LINKTREE, appel, questions, useInscription } from './textes.ts';

/* 09 · Les prix ; 10 · les questions ; 11 · le dernier appel et le pied de page. */

/** Mensuel d'abord : c'est la période choisie à l'arrivée, l'annuel se lit à côté avec ce qu'il fait gagner. */
const PERIODES: Periode[] = ['mois', 'an'];
/** Ce que l'annuel fait gagner au mieux, pour l'onglet (27 % sur Starter). */
const MEILLEURE = Math.max(...PLANS_PAYANTS.filter(p => OFFRES[p].enVente).map(economie));

/** Un avantage ne laisse ni guillemet, ni deux-points, ni dernier mot seul sur sa ligne (« ta newsletter »). */
const insecables = (g: string) => g.replace(/« /g, '«\u00a0').replace(/ »/g, '\u00a0»').replace(/ ([:;?!])/g, '\u00a0$1').replace(/ (\S+)$/, '\u00a0$1');

/** Ce que la page a déjà montré : l'avantage ramène à sa démonstration (un chapitre de la page vivante s'ouvre en arrivant). */
const DEMOS: Record<string, string> = {
  'Ta page selon le réseau du visiteur': '/fonctionnalites/selon-le-reseau',
  'Les vingt-quatre thèmes': '/fonctionnalites/themes',
  'Tes couleurs, ta police, ton fond': '/fonctionnalites/themes',
  'Ta vitrine : produits, rendez-vous, dons': '/fonctionnalites/vitrine',
  'Tes liens programmés à l’avance': '/fonctionnalites/lancement',
  'Les avis de tes clients': '/fonctionnalites/avis',
  'Tes stats sur 30 jours': '/fonctionnalites/stats',
  'Ta page selon l’heure et le pays': '/fonctionnalites/page-selon-l-heure',
  'Des liens à code ou à places comptées': '/fonctionnalites/drops',
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
    { nom: 'Les vingt-quatre thèmes', page: 'themes' },
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
    { nom: 'Des liens à code ou à places comptées', fonction: 'drops', page: 'drops' },
  ] },
  { groupe: 'Ton audience', lignes: [
    { nom: 'Ta liste e-mail, vers ta newsletter', fonction: 'listeEmail', page: 'liste-email' },
    { nom: 'Un cadeau contre l’e-mail', fonction: 'cadeau' },
    { nom: 'Tes derniers articles de blog ou de podcast', fonction: 'flux' },
  ] },
  { groupe: 'Tes stats, sans cookie', lignes: [
    { nom: 'Tes vues', valeurs: ['7 jours', '30 jours', 'Un an'], page: 'stats' },
    { nom: 'Clics, réseaux et pays de tes visiteurs', fonction: 'stats', page: 'stats' },
    { nom: 'L’essentiel chaque lundi par e-mail', fonction: 'stats' },
    { nom: 'Redirection, clics suivis jusqu’à ton site', fonction: 'utm' },
  ] },
];
const EN_VENTE = PLANS.filter(plan => OFFRES[plan].enVente);
/** Le visage de chaque offre, celui de sa carte au-dessus. */
const VISAGE = { gratuit: 'camille', starter: 'ines', pro: 'nadia', premium: 'nadia' } as const;

function Case({ ligne, plan }: { ligne: LigneTableau; plan: Plan }) {
  if (ligne.valeurs) return <td role="cell">{ligne.valeurs[EN_VENTE.indexOf(plan)]}</td>;
  const inclus = !ligne.fonction || rang(plan) >= rang(FONCTIONS[ligne.fonction]);
  return inclus
    ? <td role="cell"><Icone nom="coche" taille={20} className="hl-tableau-oui" /><span className="hl-cache">Inclus</span></td>
    : <td role="cell"><span className="hl-tableau-non" aria-hidden="true" /><span className="hl-cache">Non inclus</span></td>;
}

/**
 * En tête, chaque offre avec son visage et son prix de la période choisie au-dessus (Pro sur le bleu, comme sa carte) ;
 * au pied, le même bouton que sa carte : on choisit là où l'on a fini de comparer.
 */
function TableauOffres({ periode, reserver, action }: { periode: Periode; reserver: (ev: MouseEvent, plan: Plan) => void; action: (plan: Plan) => string | null }) {
  return (
    // Replié (critique du 27 octobre 2026) : les cartes disent déjà l'essentiel, le détail s'ouvre pour qui compare.
    <details className="hl-tableau hl-entre">
      <summary className="hl-tableau-titre"><span className="hl-h3">Tout comparer</span><span className="hl-gris">fonction par fonction</span><Icone nom="ui-plus" taille={20} /></summary>
      {/* Les rôles gardent le tableau lisible au lecteur d'écran quand, au téléphone, ses rangées passent en grille. */}
      <table role="table">
        <caption className="hl-cache">Ce que comprend chaque offre</caption>
        <thead role="rowgroup">
          <tr role="row">
            <td role="cell"><span className="hl-cache">Fonction</span></td>
            {EN_VENTE.map(plan => (
              <th key={plan} scope="col" role="columnheader" className={plan === 'pro' ? 'hl-tableau-pro' : ''}>
                <span className="hl-tableau-offre"><Avatar profil={VISAGE[plan]} />{OFFRES[plan].nom}</span>
                <span className="hl-tableau-prix"><b>{plan === 'gratuit' ? '0 €' : euros(OFFRES[plan].prix[periode])}</b> {plan === 'gratuit' ? 'pour toujours' : periode === 'an' ? 'par an' : 'par mois'}</span>
                {plan === PLAN_ESSAI && <span className="hl-tableau-essai">{ESSAI_JOURS} jours offerts</span>}
              </th>
            ))}
          </tr>
        </thead>
        {TABLEAU.map(({ groupe, lignes }) => (
          <tbody key={groupe} role="rowgroup">
            <tr className="hl-tableau-groupe" role="row"><th scope="rowgroup" role="rowheader">{groupe}</th>{EN_VENTE.map(plan => <td key={plan} role="cell" />)}</tr>
            {lignes.map(l => (
              <tr key={l.nom} role="row">
                <th scope="row" role="rowheader">{l.page ? <a href={`/fonctionnalites/${l.page}`}>{insecables(l.nom)}<span className="hl-cache">, voir la fonctionnalité</span></a> : insecables(l.nom)}</th>
                {EN_VENTE.map(plan => <Case key={plan} ligne={l} plan={plan} />)}
              </tr>
            ))}
          </tbody>
        ))}
        {EN_VENTE.some(plan => action(plan)) && (
          <tfoot role="rowgroup">
            <tr role="row">
              <td role="cell" />
              {EN_VENTE.map(plan => (
                <td key={plan} role="cell">
                  {action(plan) && <a href="#reserver" className={`hl-btn ${plan === 'pro' ? '' : 'hl-btn-contour'}`} onClick={ev => reserver(ev, plan)}>{action(plan)} <span className="hl-tableau-btn-offre">{OFFRES[plan].nom}</span></a>}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </details>
  );
}

/** L'e-mail est parti (ou se corrige) : la page ne propose plus de créer. */
function useEnvoye() {
  const { etape, ancien, correction } = useReservation();
  return etape === 'fait' || !!ancien || correction;
}

/** Où vit la page : chez nous, ou sur son propre serveur (29 octobre 2026, demandé par Lilian). */
type Hebergement = 'hopla' | 'serveur';
const HEBERGEMENTS: [Hebergement, string][] = [['hopla', 'Hébergé'], ['serveur', 'Auto-hébergé']];

/** Un groupe de boutons radio : un seul arrêt de tabulation, les flèches passent de l'un à l'autre. */
function flechesRadio<T extends string>(valeurs: readonly T[], courante: T, choisir: (v: T) => void, attribut: string) {
  return (ev: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(ev.key)) return;
    ev.preventDefault();
    const pas = ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1 : 1;
    const suivante = valeurs[(valeurs.indexOf(courante) + pas + valeurs.length) % valeurs.length];
    choisir(suivante);
    ev.currentTarget.querySelector<HTMLButtonElement>(`[${attribut}="${suivante}"]`)?.focus();
  };
}

/** Ce qu'apporte une instance à soi : tout Hopla, sans offre à prendre (voir `sansPaiement` dans server/db.ts). */
const SUR_TON_SERVEUR = [
  'Toutes les fonctionnalités de l’offre Pro',
  'Pages et blocs illimités',
  'API REST et serveur MCP',
  'Base SQLite sur ton infrastructure',
  'Code source sous licence AGPL-3.0',
];
const A_TA_CHARGE = ['Un serveur avec Docker et un nom de domaine', 'Les mises à jour et les sauvegardes', 'Un compte Resend pour l’envoi des e-mails'];

function SurTonServeur() {
  const guide = `${LIEN_SOURCE}/blob/main/docs/AUTO-HEBERGEMENT.md`;
  return (
    <div className="hl-offres hl-offres-serveur">
      <article className="hl-offre hl-entre">
        <div className="hl-offre-tete"><h3 className="hl-h3">Open source</h3></div>
        <div>
          <p className="hl-prix"><b>0 €</b></p>
          <p className="hl-gris hl-petit hl-prix-an">Infrastructure non comprise</p>
        </div>
        <p className="hl-offre-phrase">Déploiement par Docker Compose, compatible avec Coolify et Dokploy.</p>
        <ul data-ouvert="">{SUR_TON_SERVEUR.map(g => <Avantage key={g} g={g} />)}</ul>
        <div className="hp-offre-action">
          <a href={LIEN_SOURCE} className="hl-btn"><Icone nom="github" taille={18} />Voir le dépôt GitHub</a>
          <p><a href={guide}>Guide d’installation</a></p>
        </div>
      </article>
      <article className="hl-offre hl-offre-charge hl-entre" style={{ '--d': '60ms' } as CSSProperties}>
        <div className="hl-offre-tete"><h3 className="hl-h3">Prérequis</h3></div>
        <p className="hl-offre-phrase">À la charge de l’administrateur de l’instance, compris dans l’offre hébergée sur {NOM_PUBLIC} :</p>
        <ul data-ouvert="">{A_TA_CHARGE.map(g => <li key={g}><span className="hl-puce" aria-hidden="true" /><span>{insecables(g)}</span></li>)}</ul>
      </article>
    </div>
  );
}

export function Prix() {
  const [periode, setPeriode] = useState<Periode>('mois');
  const [hebergement, setHebergement] = useState<Hebergement>('hopla');
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
  const fleches = flechesRadio(PERIODES, periode, changer, 'data-periode');
  // Les cartes de l'autre hébergement naissent sous les yeux, après le passage de l'observateur des entrées : elles se montrent tout de suite.
  const heberger = (h: Hebergement) => {
    setHebergement(h);
    requestAnimationFrame(() => document.querySelectorAll<HTMLElement>('#prix .hl-entre:not([data-vu])').forEach(e => { e.dataset.vu = ''; }));
  };
  const flechesHebergement = flechesRadio(HEBERGEMENTS.map(([h]) => h), hebergement, heberger, 'data-hebergement');
  // Le choix « Auto-hébergé » n'existe que si le code se lit quelque part (LIEN_SOURCE : le dépôt public, ou une instance).
  const serveur = !!LIEN_SOURCE && hebergement === 'serveur';
  return (
    <section className="hl-section" id="prix" aria-labelledby="titre-prix">
      <div className="hl-tete-section hl-entre">
        <h2 id="titre-prix" className="hl-h2">Ta place sur internet<br /><span className="hl-cache">. </span><span>À ton rythme</span></h2>
        {LIEN_SOURCE && (
          <div className="hl-hebergement" role="radiogroup" aria-label="Hébergement" onKeyDown={flechesHebergement}>
            {HEBERGEMENTS.map(([h, nom]) => (
              <button key={h} type="button" role="radio" data-hebergement={h} aria-checked={hebergement === h} tabIndex={hebergement === h ? 0 : -1} onClick={() => heberger(h)}>{nom}</button>
            ))}
          </div>
        )}
      </div>
      {serveur ? <SurTonServeur /> : <>
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
              <div className="hp-offre-personne"><Avatar profil={plan === 'gratuit' ? 'camille' : plan === 'starter' ? 'ines' : 'nadia'} /><span>{plan === 'gratuit' ? 'Pour partager ce que tu fais' : plan === 'starter' ? 'Pour affirmer ton univers' : 'Pour une page qui travaille avec toi'}</span></div>
              <div className="hl-offre-tete">
                <h3 className="hl-h3">{o.nom}</h3>
                {plan === 'pro' && <span className="hl-offre-badge">Conseillé</span>}
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
              {/* Un seul geste, un seul mot (critique du 27 octobre 2026) : toutes les cartes créent la page, qui commence
                  par l'essai de Pro ; seule l'offre conseillée a le bouton plein. La ligne dessous dit ce que la carte change. */}
              {!envoye && o.enVente && (
                <div className="hp-offre-action">
                  <a href="#reserver" className={`hl-btn ${plan === PLAN_ESSAI ? '' : 'hl-btn-contour'}`} onClick={ev => reserver(ev, plan)}>{libelle}</a>
                  <p>{plan === 'gratuit' ? 'En ligne pour toujours, sans carte bancaire.' : plan === PLAN_ESSAI ? `${ESSAI_JOURS} jours offerts, sans carte bancaire.` : `${ESSAI_JOURS} jours de ${OFFRES[PLAN_ESSAI].nom} offerts, puis ${o.nom}.`}</p>
                </div>
              )}
            </article>
          );
        })}
      </div>
      </div>
      <TableauOffres periode={periode} reserver={reserver} action={plan => envoye || !OFFRES[plan].enVente ? null : 'Choisir'} />
      </>}
      {!serveur && <p className="hl-gris hl-petit hp-prix-note">Prix TTC. Ta page commence par {ESSAI_JOURS} jours de {OFFRES[PLAN_ESSAI].nom} offerts, sans carte bancaire&nbsp;; ensuite elle reste en ligne en Gratuit, ou tu prends une offre depuis tes réglages. Résiliable à tout moment&nbsp;: l’offre reste jusqu’à la fin de la période payée.</p>}
    </section>
  );
}

function Avantage({ g }: { g: string }) {
  return (
    <li><Icone nom="coche" taille={18} /><span>{DEMOS[g]
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
        {/* Sur le site, on écrit « nous », jamais un prénom (26 octobre 2026, demandé par Lilian). */}
        <p>Une autre question ? <a href={`mailto:${CONTACT_LEGAL}`}>Écris-nous</a>.</p>
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
      <h2 id="dernier" className="hl-h2 hl-h2-grand hl-entre">{envoye ? MOTS[mode].fin : mode === 'libre' ? <>À toi <br className="hl-br-large" />de partager</> : <>Réserve ton nom <br className="hl-br-large" />en premier</>}</h2>
      {/* La fin redit la promesse de l'ouverture, avec le même bouton (critique du 27 octobre 2026 : « Réserver mon nom » sonnait liste d'attente). */}
      <div className="hl-entre" style={{ '--d': '120ms' } as CSSProperties} data-zone-appel=""><Reserver api={api} id="reserver-fin" grand note={MOTS[mode].note} /></div>
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
    ['API et MCP', '/docs'],
    ['Connexion', '/admin'],
  ] },
  { titre: 'Fonctionnalités', liens: PAGES_FONCTIONS.map(f => [f.nom, `/fonctionnalites/${f.slug}`]) },
  { titre: 'Comparatifs', liens: [
    ...COMPARATIFS.map((c): [string, string] => [`Hopla vs ${c.nom}`, `/comparatif/${c.slug}`]),
    ['Tous les comparatifs', '/comparatif'],
  ] },
  { titre: 'Aide et légal', liens: [
    ['Nous écrire', `mailto:${CONTACT_LEGAL}`],
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
        <div className="hl-pied-bas">
          <p>© 2026 Hopla, édité par {NOM_EDITEUR}</p>
          {LIEN_SOURCE && <a href={LIEN_SOURCE} className="hl-pied-github" aria-label="Le code de Hopla sur GitHub"><Icone nom="github" taille={22} /></a>}
        </div>
      </div>
    </footer>
  );
}
