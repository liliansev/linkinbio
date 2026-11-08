import { Avatar } from './Profils.tsx';
import { useState } from 'react';
import { useRouterState } from '@tanstack/react-router';
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import { Icone } from '../components/Icone.tsx';
import { ESSAI_JOURS, FONCTIONS, OFFRES, OFFRES_EN, PLANS, PLANS_PAYANTS, PLAN_ESSAI, avantage, economie, euros as eurosFr, nomOffre, parMoisAnnuel, rang } from '../lib/abonnement.ts';
import { CONTACT_LEGAL } from '../lib/legal.ts';
import { cheminLegal } from '../lib/legal-en.ts';
import { LIEN_SOURCE, NOM_EDITEUR } from '../lib/instance.ts';
import type { Fonction, Periode, Plan } from '../lib/abonnement.ts';
import { Marque } from './Ouverture.tsx';
import { CHEMIN_FONCTIONS, cheminFonction, pagesFonctions } from './pages/fonctions.ts';
import { CHEMIN_COMPARATIFS, comparatifs } from './pages/comparatifs.ts';
import { Reserver, allerAuChamp, choisirOffre, useReservation } from './Reserver.tsx';
import type { ApiAccueil } from './Reserver.tsx';
import { NOM_PUBLIC } from '../lib/types.ts';
import { MOTS, QUESTION_LINKTREE, appel, questions, useInscription } from './textes.ts';
import { prefixe, useL, useLangue } from './langue.ts';
import type { Langue } from '../lib/types.ts';

/**
 * Les mots des données de cette section en anglais (8 novembre 2026, Hopla anglais d'abord) : le français reste la clé,
 * `tr` donne le mot de la langue du site.
 */
const TR: Record<string, string> = {
  'Ta page': 'Your page', 'Ton style': 'Your style', 'Vendre': 'Selling', 'Au bon moment': 'Right on time',
  'Ton audience': 'Your audience', 'Tes stats, sans cookie': 'Your stats, no cookies',
  'Tes liens ouverts dans leur app': 'Your links open in their app', 'Blocs sur ta page': 'Blocks on your page',
  'Sans limite': 'Unlimited', 'Ta page sans la mention Hopla': 'Your page without Hopla branding', 'Photos par galerie': 'Photos per gallery',
  'Ton formulaire de contact': 'Your contact form', 'Liens partenaires, mention « Publicité »': 'Affiliate links, with the “Ad” disclosure',
  'Un cadeau contre l’e-mail': 'A freebie for an email', 'Tes derniers articles de blog ou de podcast': 'Your latest blog posts or podcast episodes',
  'Tes vues': 'Your views', '7 jours': '7 days', '30 jours': '30 days', 'Un an': 'One year',
  'Clics, réseaux et pays de tes visiteurs': 'Clicks, networks and countries of your visitors', 'L’essentiel chaque lundi par e-mail': 'The essentials every Monday by email',
  'Toutes les fonctionnalités de l’offre Pro': 'Every feature of the Pro plan', 'Pages et blocs illimités': 'Unlimited pages and blocks',
  'API REST et serveur MCP': 'REST API and MCP server', 'Base SQLite sur ton infrastructure': 'SQLite database on your infrastructure',
  'Code source sous licence AGPL-3.0': 'Source code under the AGPL-3.0 license', 'Un serveur avec Docker et un nom de domaine': 'A server with Docker and a domain name',
  'Les mises à jour et les sauvegardes': 'Updates and backups', 'Un compte Resend pour l’envoi des e-mails': 'A Resend account for sending email',
  'Hébergé': 'Hosted', 'Auto-hébergé': 'Self-hosted',
  'Découvrir': 'Explore', 'Fonctionnalités': 'Features', 'Comparatifs': 'Comparisons', 'Aide et légal': 'Help and legal',
  'Toutes les fonctionnalités': 'All features', 'Tarifs': 'Pricing', 'Questions': 'FAQ', 'Voir une vraie page': 'See a real page',
  'API et MCP': 'API and MCP', 'Connexion': 'Log in', 'Tous les comparatifs': 'All comparisons', 'Nous écrire': 'Contact us',
  'Signaler un contenu': 'Report content', 'Conditions d’utilisation': 'Terms of use', 'Confidentialité': 'Privacy',
  'Traitement des données': 'Data processing', 'Sous-traitants': 'Subprocessors', 'Mentions légales': 'Legal notice',
};
const traduire = (langue: Langue) => (s: string) => (langue === 'en' && TR[s]) || s;
/** Le nom d'une ligne du tableau : un mot de cette section ou un avantage d'offre. */
const nomLigne = (nom: string, langue: Langue) => (langue === 'en' && TR[nom]) || avantage(nom, langue);
/** Les questions qu'on lit d'abord, en anglais. */
const ESSENTIELLES_EN = ['What is Hopla', 'Is it really free', 'How long does it take', 'When will I get', 'What will my address be', QUESTION_LINKTREE.en, 'Are my visitors tracked'];

/* 09 · Les prix ; 10 · les questions ; 11 · le dernier appel et le pied de page. */

/** Mensuel d'abord : c'est la période choisie à l'arrivée, l'annuel se lit à côté avec ce qu'il fait gagner. */
const PERIODES: Periode[] = ['mois', 'an'];
/** Ce que l'annuel fait gagner au mieux, pour l'onglet (27 % sur Starter). */
const MEILLEURE = Math.max(...PLANS_PAYANTS.filter(p => OFFRES[p].enVente).map(economie));

/** Un avantage ne laisse ni guillemet, ni deux-points, ni dernier mot seul sur sa ligne (« ta newsletter »). */
const insecables = (g: string) => g.replace(/« /g, '«\u00a0').replace(/ »/g, '\u00a0»').replace(/ ([:;?!])/g, '\u00a0$1').replace(/ (\S+)$/, '\u00a0$1');

/** Ce que la page a déjà montré : l'avantage ramène à sa démonstration (un chapitre de la page vivante s'ouvre en arrivant). */
/* L'id de la fonction, son adresse suit la langue (`cheminFonction`). */
const DEMOS: Record<string, string> = {
  'Ta page selon le réseau du visiteur': 'selon-le-reseau',
  'Les vingt-quatre thèmes': 'themes',
  'Tes couleurs, ta police, ton fond': 'themes',
  'Ta vitrine : produits, rendez-vous, dons': 'vitrine',
  'Tes liens programmés à l’avance': 'lancement',
  'Les avis de tes clients': 'avis',
  'Tes stats sur 30 jours': 'stats',
  'Ta page selon l’heure et le pays': 'page-selon-l-heure',
  'Des liens à code ou à places comptées': 'drops',
  'Ta liste e-mail, vers ta newsletter': 'liste-email',
  'Tes stats sur un an': 'stats',
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
  const l = useL();
  const tr = traduire(useLangue());
  if (ligne.valeurs) return <td role="cell">{tr(ligne.valeurs[EN_VENTE.indexOf(plan)])}</td>;
  const inclus = !ligne.fonction || rang(plan) >= rang(FONCTIONS[ligne.fonction]);
  return inclus
    ? <td role="cell"><Icone nom="coche" taille={20} className="hl-tableau-oui" /><span className="hl-cache">{l('Inclus', 'Included')}</span></td>
    : <td role="cell"><span className="hl-tableau-non" aria-hidden="true" /><span className="hl-cache">{l('Non inclus', 'Not included')}</span></td>;
}

/**
 * En tête, chaque offre avec son visage et son prix de la période choisie au-dessus (Pro sur le bleu, comme sa carte) ;
 * au pied, le même bouton que sa carte : on choisit là où l'on a fini de comparer.
 */
function TableauOffres({ periode, reserver, action }: { periode: Periode; reserver: (ev: MouseEvent, plan: Plan) => void; action: (plan: Plan) => string | null }) {
  const langue = useLangue();
  const l = useL();
  const tr = traduire(langue);
  const euros = (n: number) => eurosFr(n, langue);
  return (
    // Replié (critique du 27 octobre 2026) : les cartes disent déjà l'essentiel, le détail s'ouvre pour qui compare.
    <details className="hl-tableau hl-entre">
      <summary className="hl-tableau-titre"><span className="hl-h3">{l('Tout comparer', 'Compare everything')}</span><span className="hl-gris">{l('fonction par fonction', 'feature by feature')}</span><Icone nom="ui-plus" taille={20} /></summary>
      {/* Les rôles gardent le tableau lisible au lecteur d'écran quand, au téléphone, ses rangées passent en grille. */}
      <table role="table">
        <caption className="hl-cache">{l('Ce que comprend chaque offre', 'What each plan includes')}</caption>
        <thead role="rowgroup">
          <tr role="row">
            <td role="cell"><span className="hl-cache">{l('Fonction', 'Feature')}</span></td>
            {EN_VENTE.map(plan => (
              <th key={plan} scope="col" role="columnheader" className={plan === 'pro' ? 'hl-tableau-pro' : ''}>
                <span className="hl-tableau-offre"><Avatar profil={VISAGE[plan]} />{nomOffre(plan, langue)}</span>
                <span className="hl-tableau-prix"><b>{euros(OFFRES[plan].prix[periode])}</b> {plan === 'gratuit' ? l('pour toujours', 'forever') : periode === 'an' ? l('par an', 'per year') : l('par mois', 'per month')}</span>
                {plan === PLAN_ESSAI && <span className="hl-tableau-essai">{l(`${ESSAI_JOURS} jours offerts`, `${ESSAI_JOURS}-day free trial`)}</span>}
              </th>
            ))}
          </tr>
        </thead>
        {TABLEAU.map(({ groupe, lignes }) => (
          <tbody key={groupe} role="rowgroup">
            <tr className="hl-tableau-groupe" role="row"><th scope="rowgroup" role="rowheader">{tr(groupe)}</th>{EN_VENTE.map(plan => <td key={plan} role="cell" />)}</tr>
            {lignes.map(ligne => (
              <tr key={ligne.nom} role="row">
                <th scope="row" role="rowheader">{ligne.page ? <a href={cheminFonction(ligne.page, langue)}>{insecables(nomLigne(ligne.nom, langue))}<span className="hl-cache">{l(', voir la fonctionnalité', ', see the feature')}</span></a> : insecables(nomLigne(ligne.nom, langue))}</th>
                {EN_VENTE.map(plan => <Case key={plan} ligne={ligne} plan={plan} />)}
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
                  {action(plan) && <a href="#reserver" className={`hl-btn ${plan === 'pro' ? '' : 'hl-btn-contour'}`} onClick={ev => reserver(ev, plan)}>{action(plan)} <span className="hl-tableau-btn-offre">{nomOffre(plan, langue)}</span></a>}
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
  const l = useL();
  const tr = traduire(useLangue());
  const guide = `${LIEN_SOURCE}/blob/main/docs/SELF-HOSTING.md`;
  return (
    <div className="hl-offres hl-offres-serveur">
      <article className="hl-offre hl-entre">
        <div className="hl-offre-tete"><h3 className="hl-h3">Open source</h3></div>
        <div>
          <p className="hl-prix"><b>0 €</b></p>
          <p className="hl-gris hl-petit hl-prix-an">{l('Infrastructure non comprise', 'Infrastructure not included')}</p>
        </div>
        <p className="hl-offre-phrase">{l('Déploiement par Docker Compose, compatible avec Coolify et Dokploy.', 'Deploys with Docker Compose, works with Coolify and Dokploy.')}</p>
        <ul data-ouvert="">{SUR_TON_SERVEUR.map(g => <Avantage key={g} g={g} texte={tr(g)} />)}</ul>
        <div className="hp-offre-action">
          <a href={LIEN_SOURCE} className="hl-btn"><Icone nom="github" taille={18} />{l('Voir le dépôt GitHub', 'View the GitHub repository')}</a>
          <p><a href={guide}>{l('Guide d’installation', 'Installation guide')}</a></p>
        </div>
      </article>
      <article className="hl-offre hl-offre-charge hl-entre" style={{ '--d': '60ms' } as CSSProperties}>
        <div className="hl-offre-tete"><h3 className="hl-h3">{l('Prérequis', 'Requirements')}</h3></div>
        <p className="hl-offre-phrase">{l(`À la charge de l’administrateur de l’instance, compris dans l’offre hébergée sur ${NOM_PUBLIC} :`, `Handled by the instance administrator, included in the hosted plan on ${NOM_PUBLIC}:`)}</p>
        <ul data-ouvert="">{A_TA_CHARGE.map(g => <li key={g}><span className="hl-puce" aria-hidden="true" /><span>{insecables(tr(g))}</span></li>)}</ul>
      </article>
    </div>
  );
}

export function Prix() {
  const langue = useLangue();
  const l = useL();
  const tr = traduire(langue);
  const euros = (n: number) => eurosFr(n, langue);
  const [periode, setPeriode] = useState<Periode>('mois');
  const [hebergement, setHebergement] = useState<Hebergement>('hopla');
  // Les prix changent sous les yeux ; aux lecteurs d'écran, une phrase les redit, seulement quand on change de période.
  const [annonce, setAnnonce] = useState('');
  const changer = (p: Periode) => {
    setPeriode(p);
    const payants = PLANS_PAYANTS.filter(plan => OFFRES[plan].enVente).map(plan => `${nomOffre(plan, langue)} ${euros(OFFRES[plan].prix[p])}`).join(', ');
    setAnnonce(p === 'an' ? l(`À l’année : ${payants} par an.`, `Yearly: ${payants} per year.`) : l(`Au mois : ${payants} par mois.`, `Monthly: ${payants} per month.`));
  };
  const mode = useInscription();
  const envoye = useEnvoye();
  const libelle = appel(mode, langue);
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
        <h2 id="titre-prix" className="hl-h2">{l(<>Ta place sur internet<br /><span className="hl-cache">. </span><span>À ton rythme</span></>, <>Your place online<br /><span className="hl-cache">. </span><span>At your own pace</span></>)}</h2>
        {LIEN_SOURCE && (
          <div className="hl-hebergement" role="radiogroup" aria-label={l('Hébergement', 'Hosting')} onKeyDown={flechesHebergement}>
            {HEBERGEMENTS.map(([h, nom]) => (
              <button key={h} type="button" role="radio" data-hebergement={h} aria-checked={hebergement === h} tabIndex={hebergement === h ? 0 : -1} onClick={() => heberger(h)}>{tr(nom)}</button>
            ))}
          </div>
        )}
      </div>
      {serveur ? <SurTonServeur /> : <>
      <div className="hl-prix-cartes">
      <div className="hl-periode hl-entre" role="radiogroup" aria-label={l('Paiement', 'Billing')} onKeyDown={fleches}>
        {PERIODES.map(p => (
          <button key={p} type="button" role="radio" data-periode={p} aria-checked={periode === p} tabIndex={periode === p ? 0 : -1} onClick={() => changer(p)}>
            {p === 'mois' ? l('Mensuel', 'Monthly') : <>{l('Annuel', 'Yearly')} <span className="hl-periode-gain">{l(<>jusqu’à −{MEILLEURE}&nbsp;%</>, <>save up to {MEILLEURE}%</>)}</span></>}
          </button>
        ))}
      </div>
      <p className="hl-cache" aria-live="polite">{annonce}</p>
      <div className="hl-offres">
        {PLANS.filter(plan => OFFRES[plan].enVente).map((plan, i) => {
          const o = OFFRES[plan];
          const avant = i ? nomOffre(PLANS[i - 1], langue) : null;
          return (
            <article key={plan} className={`hl-offre hl-entre ${plan === 'pro' ? 'hl-offre-pro' : ''}`} style={{ '--d': `${i * 60}ms` } as CSSProperties}>
              <div className="hp-offre-personne"><Avatar profil={plan === 'gratuit' ? 'camille' : plan === 'starter' ? 'ines' : 'nadia'} /><span>{plan === 'gratuit' ? l('Pour partager ce que tu fais', 'To share what you do') : plan === 'starter' ? l('Pour affirmer ton univers', 'To make it unmistakably yours') : l('Pour une page qui travaille avec toi', 'For a page that works with you')}</span></div>
              <div className="hl-offre-tete">
                <h3 className="hl-h3">{nomOffre(plan, langue)}</h3>
                {plan === 'pro' && <span className="hl-offre-badge">{l('Conseillé', 'Recommended')}</span>}
                {!o.enVente && <span className="hl-offre-badge hl-offre-badge-pale">{l('Bientôt', 'Coming soon')}</span>}
              </div>
              {plan === 'gratuit' ? (
                <div>
                  <p className="hl-prix"><b>{euros(0)}</b></p>
                  <p className="hl-gris hl-petit hl-prix-an">{l('Pour toujours, sans carte bancaire', 'Forever, no credit card')}</p>
                </div>
              ) : (
                <div>
                  {/* À l'année, le prix qu'on paie en grand ; ce qu'il fait par mois vient dessous. */}
                  <p className="hl-prix"><b key={periode} className="hl-prix-glisse">{euros(o.prix[periode])}</b> <span className="hl-gris">{periode === 'an' ? l('par an', 'per year') : l('par mois', 'per month')}</span></p>
                  <p className="hl-gris hl-petit hl-prix-an">{periode === 'an' ? l(<>Au lieu de <s>{euros(o.prix.mois * 12)}</s>, soit {euros(parMoisAnnuel(plan))} par mois</>, <>Instead of <s>{euros(o.prix.mois * 12)}</s>, that’s {euros(parMoisAnnuel(plan))} per month</>) : l('Sans engagement', 'Cancel anytime')}</p>
                </div>
              )}
              <p className="hl-offre-phrase">{langue === 'en' ? OFFRES_EN[plan].phrase : o.phrase}</p>
              <ul id={`offre-${plan}`} data-ouvert="">
                {avant && <li className="hl-offre-avant">{l(`Tout ${avant}, et :`, `Everything in ${avant}, plus:`)}</li>}
                {(EN_AVANT[plan] ?? o.avantages).map(g => <Avantage key={g} g={g} />)}
              </ul>
              {EN_AVANT[plan] && (
                <details className="hl-offre-reste">
                  <summary>{l(`Et ${o.avantages.length - EN_AVANT[plan].length} autres`, `And ${o.avantages.length - EN_AVANT[plan].length} more`)}<Icone nom="ui-plus" taille={16} /></summary>
                  <ul data-ouvert="">{o.avantages.filter(g => !EN_AVANT[plan]?.includes(g)).map(g => <Avantage key={g} g={g} />)}</ul>
                </details>
              )}
              {/* Un seul geste, un seul mot (critique du 27 octobre 2026) : toutes les cartes créent la page, qui commence
                  par l'essai de Pro ; seule l'offre conseillée a le bouton plein. La ligne dessous dit ce que la carte change. */}
              {!envoye && o.enVente && (
                <div className="hp-offre-action">
                  <a href="#reserver" className={`hl-btn ${plan === PLAN_ESSAI ? '' : 'hl-btn-contour'}`} onClick={ev => reserver(ev, plan)}>{libelle}</a>
                  <p>{plan === 'gratuit' ? l('En ligne pour toujours, sans carte bancaire.', 'Online forever, no credit card.') : plan === PLAN_ESSAI ? l(`${ESSAI_JOURS} jours offerts, sans carte bancaire.`, `${ESSAI_JOURS}-day free trial, no credit card.`) : l(`${ESSAI_JOURS} jours de ${OFFRES[PLAN_ESSAI].nom} offerts, puis ${o.nom}.`, `${ESSAI_JOURS} days of ${nomOffre(PLAN_ESSAI, langue)} free, then ${nomOffre(plan, langue)}.`)}</p>
                </div>
              )}
            </article>
          );
        })}
      </div>
      </div>
      <TableauOffres periode={periode} reserver={reserver} action={plan => envoye || !OFFRES[plan].enVente ? null : l('Choisir', 'Choose')} />
      </>}
      {!serveur && <p className="hl-gris hl-petit hp-prix-note">{l(<>Prix TTC. Ta page commence par {ESSAI_JOURS} jours de {OFFRES[PLAN_ESSAI].nom} offerts, sans carte bancaire&nbsp;; ensuite elle reste en ligne en Gratuit, ou tu prends une offre depuis tes réglages. Résiliable à tout moment&nbsp;: l’offre reste jusqu’à la fin de la période payée.</>, <>Prices include VAT. Your page starts with {ESSAI_JOURS} days of {nomOffre(PLAN_ESSAI, langue)} for free, no credit card; after that it stays online on Free, or you pick a plan from your settings. Cancel anytime: your plan stays active until the end of the paid period.</>)}</p>}
    </section>
  );
}

function Avantage({ g, texte }: { g: string; texte?: string }) {
  const langue = useLangue();
  const l = useL();
  const mots = texte ?? avantage(g, langue);
  return (
    <li><Icone nom="coche" taille={18} /><span>{DEMOS[g]
      ? <a className="hl-offre-demo" href={cheminFonction(DEMOS[g], langue)}>{insecables(mots)}<span className="hl-cache">{l(', voir la fonctionnalité', ', see the feature')}</span></a>
      : insecables(mots)}</span></li>
  );
}

/** Les six questions qu'on lit d'abord (26 octobre 2026 : onze à la suite allongeaient trop la page). */
const ESSENTIELLES = ['C’est quoi, Hopla', 'C’est vraiment gratuit', 'Combien de temps', 'Quand aurai-je', 'Quelle sera mon adresse', QUESTION_LINKTREE.fr, 'Mes visiteurs sont-ils pistés'];

const essentielle = ([q]: [string, string]) => [...ESSENTIELLES, ...ESSENTIELLES_EN].some(e => q.startsWith(e));

function Question({ q, r }: { q: string; r: string }) {
  const l = useL();
  return (
    <details key={q} className="hl-question">
      <summary>{q}<Icone nom="ui-plus" taille={18} /></summary>
      <p>{r}{(q === QUESTION_LINKTREE.fr || q === QUESTION_LINKTREE.en) && <> <button type="button" className="hl-lien-texte" onClick={() => allerAuChamp()}>{l('Coller mon adresse Linktree', 'Paste my Linktree address')}</button></>}</p>
    </details>
  );
}

const question = ([q, r]: [string, string]) => <Question key={q} q={q} r={r} />;

export function Questions() {
  const langue = useLangue();
  const l = useL();
  const liste = questions(useInscription(), langue);
  const autres = liste.filter(q => !essentielle(q));
  return (
    <section className="hl-section hl-etroite" id="questions" aria-labelledby="titre-questions">
      <div className="hl-questions-tete hl-entre">
        <h2 id="titre-questions" className="hl-h2">{l('Questions', 'Questions')}</h2>
        {/* Sur le site, on écrit « nous », jamais un prénom (26 octobre 2026, demandé par Lilian). */}
        <p>{l('Une autre question ?', 'Another question?')} <a href={`mailto:${CONTACT_LEGAL}`}>{l('Écris-nous', 'Write to us')}</a>.</p>
      </div>
      <div className="hl-questions">
        {liste.filter(essentielle).map(question)}
        {/* Les autres restent dans la page (et dans les données structurées), repliées : la page reste courte. */}
        <details className="hl-questions-plus">
          <summary>{l(`Les ${autres.length} autres questions`, `${autres.length} more questions`)}<Icone nom="ui-plus" taille={18} /></summary>
          {autres.map(question)}
        </details>
      </div>
    </section>
  );
}

export function DernierAppel({ api }: { api: ApiAccueil }) {
  const langue = useLangue();
  const l = useL();
  const mode = useInscription();
  // Pour qui vient d'envoyer, la fin dit où l'attend la suite au lieu de relancer.
  const envoye = useEnvoye();
  return (
    <section className="hl-section hl-dernier" data-teinte="klein" aria-labelledby="dernier">
      <h2 id="dernier" className="hl-h2 hl-h2-grand hl-entre">{envoye ? MOTS[langue][mode].fin : mode === 'libre' ? l(<>À toi <br className="hl-br-large" />de partager</>, <>Your turn <br className="hl-br-large" />to share</>) : l(<>Réserve ton nom <br className="hl-br-large" />en premier</>, <>Claim your name <br className="hl-br-large" />first</>)}</h2>
      {/* La fin redit la promesse de l'ouverture, avec le même bouton (critique du 27 octobre 2026 : « Réserver mon nom » sonnait liste d'attente). */}
      <div className="hl-entre" style={{ '--d': '120ms' } as CSSProperties} data-zone-appel=""><Reserver api={api} id="reserver-fin" grand note={MOTS[langue][mode].note} /></div>
      <a href="/lilian" className="hl-lien-gris">{l('Voir une vraie page', 'See a real page')}</a>
    </section>
  );
}

/**
 * Le pied de toutes les pages publiques de hopla.page (26 octobre 2026, demandé par Lilian : « il manque un vrai footer,
 * avec toutes les pages, les vs ») : la marque et sa promesse, puis quatre colonnes, Hopla, les dix fonctions, les six
 * comparatifs, l'aide et les textes légaux ; sur la nuit, sous le dernier appel en bleu. Aucun prix : les tarifs se lisent
 * dans leur section.
 */
const colonnes = (langue: Langue): { titre: string; liens: [string, string][] }[] => [
  { titre: 'Découvrir', liens: [
    ['Toutes les fonctionnalités', CHEMIN_FONCTIONS[langue]],
    ['Tarifs', `${prefixe(langue) || '/'}#prix`],
    ['Questions', `${prefixe(langue) || '/'}#questions`],
    ['Voir une vraie page', '/lilian'],
    ['API et MCP', '/docs'],
    ['Connexion', '/admin'],
  ] },
  { titre: 'Fonctionnalités', liens: pagesFonctions(langue).map(f => [f.nom, `${CHEMIN_FONCTIONS[langue]}/${f.slug}`]) },
  { titre: 'Comparatifs', liens: [
    ...comparatifs(langue).map((c): [string, string] => [`Hopla vs ${c.nom}`, `${CHEMIN_COMPARATIFS[langue]}/${c.slug}`]),
    ['Tous les comparatifs', CHEMIN_COMPARATIFS[langue]],
  ] },
  { titre: 'Aide et légal', liens: [
    ['Nous écrire', `mailto:${CONTACT_LEGAL}`],
    ['Signaler un contenu', '/signaler'],
    ['Conditions d’utilisation', cheminLegal('cgu', langue)],
    ['Confidentialité', cheminLegal('confidentialite', langue)],
    ['Traitement des données', cheminLegal('traitement-des-donnees', langue)],
    ['Sous-traitants', cheminLegal('sous-traitants', langue)],
    ['Mentions légales', cheminLegal('mentions-legales', langue)],
  ] },
];

export function Pied() {
  const langue = useLangue();
  const l = useL();
  const tr = traduire(langue);
  // Le lien de la page où l'on est se dit, et se lit à l'encre.
  const chemin = useRouterState({ select: st => st.location.pathname });
  return (
    <footer className="hl-pied" data-teinte="nuit">
      <div className="hl-pied-dedans">
        <div className="hl-pied-marque">
          <Marque />
          <p>{l('Un lien qui te ressemble, et s’adapte à chaque visiteur.', 'A link that looks like you, and adapts to every visitor.')}</p>
        </div>
        {colonnes(langue).map((c, i) => (
          <nav key={c.titre} className="hl-pied-colonne" aria-labelledby={`pied-${i}`}>
            <h2 id={`pied-${i}`}>{tr(c.titre)}</h2>
            <ul>{c.liens.map(([nom, href]) => <li key={href}><a href={href} aria-current={href === chemin ? 'page' : undefined}>{tr(nom)}</a></li>)}</ul>
          </nav>
        ))}
        <div className="hl-pied-bas">
          <p>{l(`© 2026 Hopla, édité par ${NOM_EDITEUR}`, `© 2026 Hopla, published by ${NOM_EDITEUR}`)}</p>
          {LIEN_SOURCE && <a href={LIEN_SOURCE} className="hl-pied-github" aria-label={l('Le code de Hopla sur GitHub', 'Hopla’s source code on GitHub')}><Icone nom="github" taille={22} /></a>}
        </div>
      </div>
    </footer>
  );
}
