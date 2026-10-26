import { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import type { FocusEvent, FormEvent, ReactNode } from 'react';
import { Icone } from '../components/Icone.tsx';
import { OFFRES } from '../lib/abonnement.ts';
import type { Periode, PlanPayant } from '../lib/abonnement.ts';
import { nomSaisi } from '../lib/valider.ts';
import { adresseSuggeree, nomDansAdresse, nomDansLien } from './adresse.ts';
import { mouvementReduit } from './mouvement.ts';
import { MOTS, appel, useInscription } from './textes.ts';
import { focusSaisie } from '../lib/clavier';
import { boiteMail } from '../lib/boiteMail.ts';

/*
 * « Créer ma page » (ou « Réserver mon nom » en liste d'attente), en
 * ouverture et en fin de page. On tape le nom, Hopla dit pendant la frappe
 * s'il est libre ; le même champ demande ensuite l'adresse e-mail, avec son
 * propre bouton, et la demande part. Une adresse collée (hopla.page/marie, un
 * lien d'une autre page de liens, un e-mail) ne garde que le nom. Les deux champs de la page partagent le même état : un nom
 * pris en haut l'est aussi en bas, et le téléphone d'ouverture affiche le nom
 * tapé dans sa barre d'adresse et sur sa page.
 *
 * Une phrase rassure à chaque étape. Avant l'envoi, un domaine mal tapé est
 * signalé une fois (`adresse.ts`), quand on quitte le champ ou qu'on valide ;
 * après, l'e-mail peut se renvoyer, une minute plus tard, le temps que le
 * premier arrive, et un e-mail faux ou un nom mal tapé se corrigent pendant
 * 30 minutes, tant que la page n'a pas été ouverte (`corrigerAdresse`,
 * `renommerPage`) : la carte dit jusqu'à quelle heure, puis renvoie au contact.
 *
 * Les deux formulaires affichent le même état, mais seul celui dont on se
 * sert l'annonce aux lecteurs d'écran (`actif`). Le nom tapé et l'état envoyé
 * survivent à un rechargement (sessionStorage),
 * et un nom pris propose aussi la connexion : c'est peut-être le sien. Au
 * téléphone, le champ remonte sous la barre quand il prend la main : le
 * clavier laisse voir sa réponse.
 */

/** `reserve` : un nom gardé par Hopla (admin, aide…), pris sans être la page de personne. */
export type EtatNom = { etat: 'libre' | 'pris' | 'invalide'; nom: string; suggestions: string[]; reserve?: boolean };
export interface ApiAccueil {
  verifier(nom: string): Promise<EtatNom>;
  reserver(nom: string, email: string): Promise<{ ok: boolean; message: string }>;
  /** Le lien repart à la même adresse : la bienvenue d'une page pas encore ouverte (sinon un lien de connexion), ou le rappel de la réservation. */
  renvoyer(nom: string, email: string): Promise<{ ok: boolean; message: string }>;
  /** Le lien repart à la bonne adresse ; celui parti à l'ancienne ne sert plus. */
  corriger(nom: string, ancienne: string, nouvelle: string): Promise<{ ok: boolean; message: string }>;
  /** La page prend le nouveau nom, et le lien repart à la même adresse. */
  renommer(ancien: string, nouveau: string, email: string): Promise<{ ok: boolean; message: string; nom?: string }>;
}

type Etape = 'nom' | 'email' | 'fait';
type Renvoi = 'bientot' | 'pret' | 'envoi' | 'fait';
interface Etat {
  nom: string; verif: EtatNom | null; etape: Etape; email: string; message: string; erreur: string; envoi: boolean; focus: string;
  /** L'adresse dont on a déjà signalé le domaine : renvoyée telle quelle, elle part. */
  signalee: string;
  renvoi: Renvoi;
  /** L'adresse où le lien est parti ; `correction` rouvre le champ pour la corriger. */
  envoyee: string;
  correction: boolean;
  /** Le nom sous lequel la page est partie, quand on rouvre le champ du nom pour le changer. */
  ancien: string;
  /** L'e-mail tel qu'il était en quittant le champ : la faute de domaine ne se signale qu'une fois la frappe finie. */
  quitte: string;
  /** Le nom parti à la vérification : une ligne le dit, si la réponse tarde. */
  verifie: string;
  /** La saisie dépassait 30 caractères : la fin est coupée, et on le dit. */
  coupe: boolean;
  /** La saisie avait un emoji ou une lettre d'un autre alphabet : retirés, et on le dit, sans en faire une erreur. */
  retire: boolean;
  /** L'heure du premier envoi, et la fin du temps pour corriger. */
  le: number;
  fermee: boolean;
  /** Le nom tel qu'il a été tapé, accents et majuscules compris : le téléphone d'ouverture l'affiche. */
  saisie: string;
  /** Ce que le serveur a dit du renvoi (un lien de bienvenue d'une semaine, ou de connexion). */
  renvoye: string;
  /** Le formulaire dont on se sert : lui seul parle aux lecteurs d'écran, l'autre affiche le même état en silence. */
  actif: string;
  /** L'offre payante dont on a pris le bouton dans les prix : on commence en Gratuit, le champ dit où l'activer ensuite. */
  offre: PlanPayant | '';
  /** La période lue dans les prix au moment du choix : la note la reprend. */
  periode: Periode;
}

let etat: Etat = { nom: '', verif: null, etape: 'nom', email: '', message: '', erreur: '', envoi: false, focus: '', signalee: '', renvoi: 'bientot', envoyee: '', correction: false, ancien: '', quitte: '', verifie: '', coupe: false, retire: false, le: 0, fermee: false, saisie: '', renvoye: '', actif: '', offre: '', periode: 'mois' };
const abonnes = new Set<() => void>();
const changer = (m: Partial<Etat>) => { etat = { ...etat, ...m }; abonnes.forEach(f => f()); };
const abonner = (f: () => void) => { abonnes.add(f); return () => { abonnes.delete(f); }; };
export const useReservation = () => useSyncExternalStore(abonner, () => etat, () => etat);

/** Le bouton d'une offre, dans les prix : `''` pour Gratuit ; la période est celle qu'on lisait. */
export const choisirOffre = (offre: PlanPayant | '', periode: Periode = 'mois') => changer({ offre, periode });
/** « Pro », ou « Pro à l'année » : l'offre choisie, telle que les prix la montraient. */
const offreLue = (e: Etat) => e.offre ? `${OFFRES[e.offre].nom}${e.periode === 'an' ? ' à l’année' : ''}` : '';

/** L'envoi fait, gardé pour l'onglet : un rechargement ne le fait pas oublier. Avant l'envoi, le nom tapé. */
const CLE = 'hopla-envoi';
const CLE_NOM = 'hopla-nom';
function garder() {
  try { sessionStorage.setItem(CLE, JSON.stringify({ nom: etat.nom, message: etat.message, envoyee: etat.envoyee, le: etat.le })); } catch { /* stockage indisponible */ }
}
function retenir(nom: string) {
  try { sessionStorage.setItem(CLE_NOM, nom); } catch { /* stockage indisponible */ }
}
let repris = false;
function reprendre(api: ApiAccueil) {
  if (repris) return;
  repris = true;
  try {
    const g = JSON.parse(sessionStorage.getItem(CLE) ?? 'null');
    if (g?.nom && g.envoyee && g.message) {
      changer({ nom: g.nom, message: g.message, envoyee: g.envoyee, email: g.envoyee, etape: 'fait', renvoi: 'bientot', le: g.le || Date.now() });
      attendreRenvoi();
      attendreFin();
      return;
    }
    const nom = sessionStorage.getItem(CLE_NOM) ?? '';
    if (nom.length >= 3 && !etat.nom) { changer({ nom }); verifier(api, nom.replace(/-$/, '')); }
  } catch { /* rien à reprendre */ }
}

/** Le temps de corriger, compté par le serveur depuis le premier envoi (`DELAI_CORRECTION`) ; la carte le ferme un peu avant. */
const FENETRE = 29 * 60_000;
let fin: ReturnType<typeof setTimeout> | undefined;
function attendreFin() {
  clearTimeout(fin);
  const reste = etat.le + FENETRE - Date.now();
  if (reste <= 0) { changer({ fermee: true }); return; }
  changer({ fermee: false });
  fin = setTimeout(() => changer({ fermee: true }), reste);
}

/** Une lettre d'un autre alphabet ne passe pas dans une adresse : on le dit au lieu de l'effacer en silence. */
const AUTRE_ALPHABET = /[^\P{L}\p{Script=Latin}]/u;
const MOT_ALPHABET = 'Une adresse ne prend que des lettres latines, des chiffres et des tirets : les accents sont simplifiés, le reste est retiré.';
/** Un emoji non plus : effacé sans un mot, le champ aurait l'air cassé. */
const PICTOGRAMME = /\p{Extended_Pictographic}/u;

let minuterie: ReturnType<typeof setTimeout> | undefined;
let demande = 0;
async function verifier(api: ApiAccueil, nom: string): Promise<EtatNom | null> {
  const ici = ++demande;
  changer({ verifie: nom });
  try {
    const r = await api.verifier(nom);
    // « lilian » suivi d'une espace s'écrit « lilian- » pendant la frappe : c'est le même nom.
    if (ici === demande && etat.nom.replace(/-$/, '') === nom) changer({ verif: r });
    return r;
  } catch { return null; } finally { if (ici === demande) changer({ verifie: '' }); }
}

/**
 * Le champ montre le nom déjà mis en forme (« zoe-martin ») : la saisie brute (« Zoé Martin ») se reconstruit
 * frappe après frappe, ce qui s'ajoute au bout ou ce qui s'efface au bout ; autrement elle repart de ce que montre le champ.
 */
function suite(avant: string, brut: string, valeur: string) {
  // Le nom a changé sans la frappe (une variante touchée) : la saisie repart du nom.
  if (nomSaisi(brut, 200).replace(/-$/, '') !== avant.replace(/-$/, '')) brut = avant;
  if (valeur.startsWith(avant)) return brut + valeur.slice(avant.length);
  if (!avant.startsWith(valeur)) return valeur;
  let b = brut;
  while (b && nomSaisi(b, 200).length > valeur.length) b = b.slice(0, -1);
  return nomSaisi(b, 200) === valeur ? b : valeur;
}

function taper(api: ApiAccueil, valeur: string) {
  let colle = nomDansAdresse(valeur);
  let saisie = suite(etat.nom, etat.saisie, colle);
  // Une adresse tapée lettre à lettre (https://linktr.ee/zoe) se lit sur la saisie entière, comme si on l'avait collée.
  const lien = colle === valeur ? nomDansLien(saisie) : '';
  if (lien) colle = saisie = lien;
  const nom = nomSaisi(colle);
  changer({ nom, saisie, verif: null, coupe: nomSaisi(colle, 200).replace(/-$/, '').length > 30, retire: AUTRE_ALPHABET.test(valeur) || PICTOGRAMME.test(valeur), erreur: '' });
  retenir(nom);
  clearTimeout(minuterie);
  if (nom.replace(/-$/, '').length >= 3) minuterie = setTimeout(() => verifier(api, nom.replace(/-$/, '')), 280);
}

/** Un e-mail renvoyé trop tôt croise le premier : le bouton n'arrive qu'au bout d'une minute. */
const DELAI_RENVOI = 60_000;
let attente: ReturnType<typeof setTimeout> | undefined;
const attendreRenvoi = () => { clearTimeout(attente); attente = setTimeout(() => changer({ renvoi: 'pret' }), DELAI_RENVOI); };
/**
 * Le lien est parti à `adresse` : l'état final, qui prend le focus du formulaire `qui`, puis une minute avant de pouvoir le renvoyer.
 * `premier` : une page vient d'être créée, le temps de corriger part de là ; une correction ne le relance pas.
 */
const parti = (message: string, adresse: string, qui: string, premier = false) => {
  changer({ etape: 'fait', message, envoi: false, renvoi: 'bientot', envoyee: adresse, correction: false, ancien: '', erreur: '', focus: qui, ...(premier ? { le: Date.now() } : {}) });
  garder();
  retenir('');
  attendreRenvoi();
  attendreFin();
};

/** Au téléphone, le clavier cache le bas de l'écran : le formulaire remonte sous la barre, sa réponse reste visible. */
function remonter(ev: FocusEvent<HTMLInputElement>) {
  if (!matchMedia('(max-width: 1023px) and (pointer: coarse)').matches) return;
  const formulaire = ev.currentTarget.form;
  setTimeout(() => {
    if (!formulaire || (document.activeElement as HTMLInputElement | null)?.form !== formulaire) return;
    const ecart = formulaire.getBoundingClientRect().top - 72;
    if (Math.abs(ecart) > 8) scrollTo({ top: scrollY + ecart, behavior: mouvementReduit() ? 'auto' : 'smooth' });
  }, 250);
}

/**
 * `apercu` : ce qui suit la réponse du champ, avant la note (au téléphone, la carte qui reprend le nom tapé).
 * `premier` : le formulaire qui parle aux lecteurs d'écran tant qu'on ne s'est servi d'aucun des deux.
 */
export function Reserver({ api, note, apercu, id, grand, premier, libelleNom }: { api: ApiAccueil; note?: ReactNode; apercu?: ReactNode; id?: string; grand?: boolean; premier?: boolean; libelleNom?: string }) {
  const e = useReservation();
  const mode = useInscription();
  const classe = `hl-reserver${grand ? ' hl-reserver-grand' : ''}`;
  const moi = useId();
  const champ = useRef<HTMLInputElement>(null);
  const fait = useRef<HTMLDivElement>(null);
  const idEtat = `${moi}-etat`;
  // Les deux formulaires montrent le même état ; seul celui dont on se sert l'annonce (au départ, celui de l'ouverture).
  const parle = e.actif ? e.actif === moi : !!premier;
  const prendre = () => { if (etat.actif !== moi) changer({ actif: moi }); };

  useEffect(() => reprendre(api), [api]);
  // Le formulaire qui a fait avancer l'étape garde la main (le champ, ou le message une fois envoyé) ; l'autre ne vole pas le focus.
  useEffect(() => {
    if (e.focus !== moi) return;
    (e.etape === 'fait' ? fait.current : champ.current)?.focus({ preventScroll: true });
    changer({ focus: '' });
  }, [e.focus, e.etape, moi]);

  async function envoyer(ev: FormEvent) {
    ev.preventDefault();
    if (e.envoi) return;
    if (e.etape === 'nom') {
      const nom = e.nom.replace(/-$/, '');
      if (nom.length < 3) { changer({ erreur: nom ? 'Il faut au moins 3 caractères.' : 'Choisis le nom de ta page.' }); champ.current?.focus(); return; }
      clearTimeout(minuterie);
      // Le même nom qu'avant : rien à changer.
      if (e.ancien && nom === e.ancien) { changer({ etape: 'fait', ancien: '', verif: null, erreur: '', focus: moi }); return; }
      changer({ envoi: true });
      const v = e.verif?.nom === nom ? e.verif : await verifier(api, nom);
      changer({ envoi: false });
      if (!v) { changer({ erreur: 'Le serveur ne répond pas. Réessaie dans un instant.' }); return; }
      // Pris ou impossible : le verdict s'affiche, avec ses variantes, et la main reste au champ.
      if (v.etat !== 'libre') { changer({ nom, verif: v }); champ.current?.focus(); return; }
      if (!e.ancien) { changer({ nom, etape: 'email', erreur: '', focus: moi }); return; }
      // Un nom changé après l'envoi : la page le prend, et le lien repart.
      changer({ envoi: true, erreur: '' });
      try {
        const r = await api.renommer(e.ancien, nom, e.envoyee);
        if (r.ok) { changer({ nom: r.nom ?? nom, verif: null }); parti(r.message, e.envoyee, moi); } else changer({ envoi: false, erreur: r.message });
      } catch { changer({ envoi: false, erreur: 'Le serveur ne répond pas. Réessaie dans un instant.' }); }
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.email.trim())) { changer({ erreur: 'Il manque une adresse e-mail complète, comme marie@exemple.fr.' }); champ.current?.focus(); return; }
    // Un domaine qui ressemble à une faute : on le dit une fois, puis l'adresse part telle quelle.
    if (adresseSuggeree(e.email) && e.signalee !== e.email) { changer({ signalee: e.email }); champ.current?.focus(); return; }
    const adresse = e.email.trim();
    changer({ envoi: true, erreur: '' });
    try {
      if (e.correction) {
        const r = await api.corriger(e.nom, e.envoyee, adresse);
        if (r.ok) parti(r.message, adresse, moi); else changer({ envoi: false, erreur: r.message });
        return;
      }
      const r = await api.reserver(e.nom, adresse);
      if (r.ok) parti(r.message, adresse, moi, true);
      else if (/pris/.test(r.message)) { changer({ etape: 'nom', envoi: false, erreur: r.message, verif: null, focus: moi }); verifier(api, e.nom); }
      else changer({ envoi: false, erreur: r.message });
    } catch { changer({ envoi: false, erreur: 'Le serveur ne répond pas. Réessaie dans un instant.' }); }
  }

  if (e.etape === 'fait') {
    // Une messagerie qu'on reconnaît s'ouvre d'ici : le lien est à un geste.
    const boite = boiteMail(e.envoyee);
    return (
      <div className={classe} id={id} onFocusCapture={prendre} onPointerDownCapture={prendre}>
        <div ref={fait} className="hl-reserver-fait" role={parle ? 'status' : undefined} tabIndex={-1}>
          <Icone nom="coche" taille={20} />
          <div>
            <p className="hl-reserver-adresse">hopla.page/{insecable(e.nom)}</p>
            <p>{avecAdresse(e.message, e.envoyee)}</p>
            {boite && <a className="hl-btn hl-btn-petit hl-reserver-boite" href={boite.url} target="_blank" rel="noopener">Ouvrir {boite.nom}<Icone nom="ui-ouvrir" taille={16} /></a>}
            {/* Ce qu'il faut savoir, et rien d'autre (Lilian, 24 octobre 2026) : combien de temps marche le lien ; une faute de frappe se corrige d'un toucher. */}
            <p className="hl-reserver-renvoi">
              {MOTS[mode].duree}
              {!e.fermee && <>{MOTS[mode].duree && ' '}<button type="button" className="hl-lien-texte" onClick={() => changer({ etape: 'email', correction: true, email: e.envoyee, signalee: '', quitte: '', erreur: '', focus: moi })}>Mauvaise adresse ?</button></>}
            </p>
            {e.offre && mode === 'libre' && <p className="hl-reserver-renvoi">Ensuite, active {offreLue(e)} dans tes réglages.</p>}
            {e.erreur && <p className="hl-reserver-erreur" role={parle ? 'alert' : undefined}>{e.erreur}</p>}
          </div>
        </div>
      </div>
    );
  }

  const v = e.verif;
  // Un nom pris, impossible ou refusé à l'envoi marque le champ.
  // Pendant un changement de nom, l'ancien nom est le sien : il n'est pas « pris ».
  const sien = !!e.ancien && v?.nom === e.ancien;
  const pris = e.etape === 'nom' && !sien && (v?.etat === 'pris' || v?.etat === 'invalide' || !!e.erreur);
  // Une adresse e-mail refusée marque le champ de la même façon.
  const emailFautif = e.etape === 'email' && !!e.erreur;
  // La faute de domaine attend la fin de la frappe : on a quitté le champ, ou validé une première fois.
  const suggeree = e.etape === 'email' && (e.quitte === e.email || e.signalee === e.email) ? adresseSuggeree(e.email) : null;
  const revenir = () => changer({ etape: 'fait', correction: false, nom: e.ancien || e.nom, ancien: '', email: e.envoyee, verif: null, signalee: '', erreur: '', focus: moi });
  const corriger = (adresse: string) => { changer({ email: adresse, signalee: '', erreur: '' }); champ.current?.focus(); };
  return (
    <form className={classe} id={id} onSubmit={envoyer} noValidate data-pris={pris || emailFautif || undefined} onFocusCapture={prendre} onPointerDownCapture={prendre}>
      <div className="hl-reserver-ligne">
        {e.etape === 'nom' ? (
          <label className="hl-champ">
            <span className="hl-champ-prefixe" aria-hidden="true">hopla.page/</span>
            <span className="hl-cache">Le nom de ta page, après hopla.page/</span>
            <input ref={champ} value={e.nom} onChange={ev => taper(api, ev.target.value)} placeholder="ton-nom" maxLength={200} onFocus={remonter}
              onBlur={() => { if (/-$/.test(etat.nom)) changer({ nom: etat.nom.replace(/-+$/, '') }); }}
              autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" aria-describedby={idEtat}
              aria-invalid={pris || undefined} data-champ-nom />
          </label>
        ) : (
          <label className="hl-champ">
            <span className="hl-champ-prefixe hl-champ-picto" aria-hidden="true"><Icone nom="courrier" taille={18} /></span>
            <span className="hl-cache">Ton adresse e-mail, pour recevoir le lien</span>
            <input ref={champ} type="email" value={e.email} onChange={ev => changer({ email: ev.target.value, erreur: '' })} placeholder="ton@adresse.fr" maxLength={200} onFocus={remonter}
              onBlur={() => changer({ quitte: etat.email })}
              autoComplete="email" inputMode="email" enterKeyHint="send" required aria-describedby={idEtat} aria-invalid={emailFautif || undefined} />
          </label>
        )}
        <button type="submit" className="hl-btn" disabled={e.envoi}>{e.envoi ? (e.etape === 'nom' && !e.ancien ? 'Vérification…' : 'Envoi…') : e.correction ? 'Corriger' : e.ancien ? 'Changer' : e.etape === 'email' ? MOTS[mode].envoyer : libelleNom ?? appel(mode)}</button>
      </div>
      <div className="hl-reserver-etat" id={idEtat} aria-live={parle ? 'polite' : 'off'}>
        {/* La zone annonce déjà ce qui change : pas de role="alert" en plus, le message serait lu deux fois. */}
        {e.erreur ? <p className="hl-reserver-erreur"><Icone nom="alerte" taille={18} />{e.erreur}</p>
          : suggeree ? (
            <p data-signale={e.signalee === e.email || undefined}>
              <span>Tu voulais dire </span>
              <button type="button" className="hl-lien-texte" onClick={() => corriger(suggeree)}>{suggeree}</button>
              <span>{e.signalee === e.email ? ' ? Si ton adresse est juste, valide de nouveau.' : ' ?'}</span>
            </p>
          )
          : e.correction ? (
            <p>
              <span>Le lien partira à cette adresse ; celui envoyé à <b className="hl-courriel">{insecable(e.envoyee)}</b> ne marchera plus.</span>{' '}
              <button type="button" className="hl-lien-texte" onClick={revenir}>Annuler</button>
            </p>
          )
          : e.ancien && (sien || (v?.etat !== 'pris' && v?.etat !== 'invalide')) ? (
            <p>
              {v?.etat === 'libre' && v.nom !== e.ancien && <><Icone nom="coche" taille={16} /><span><b>hopla.page/{insecable(v.nom)}</b> est libre. </span></>}
              <span>{e.nom.replace(/-$/, '') === e.ancien ? 'Tape le bon nom.' : <>Ta page prendra ce nom ; le lien envoyé pour <b>hopla.page/{insecable(e.ancien)}</b> ne marchera plus.</>}</span>{' '}
              <button type="button" className="hl-lien-texte" onClick={revenir}>Annuler</button>
            </p>
          )
          : e.etape === 'email' ? (
            <p>
              <Icone nom="coche" taille={16} /><span><b>hopla.page/{insecable(e.nom)}</b> est libre. {MOTS[mode].adresse}</span>{' '}
              <button type="button" className="hl-lien-texte" onClick={() => changer({ etape: 'nom', focus: moi })}>Changer de nom</button>
            </p>
          )
          : v?.etat === 'libre' ? <p><Icone nom="coche" taille={16} /><span><b>hopla.page/{insecable(v.nom)}</b> est libre</span></p>
          : v?.etat === 'pris' ? (
            <p className="hl-reserver-pris">
              <Icone nom="cadenas" taille={16} /><span><b>hopla.page/{insecable(v.nom)}</b> est déjà pris.{v.suggestions.length > 0 && ' Essaie '}</span>
              {v.suggestions.map((s, i) => (
                <span key={s}>{i > 0 && ' ou '}<button type="button" className="hl-lien-texte" onClick={() => { changer({ nom: s, verif: { etat: 'libre', nom: s, suggestions: [] } }); champ.current?.focus(); verifier(api, s); }}>{s}</button></span>
              ))}
              {v.suggestions.length > 0 && '.'}{' '}
              {!v.reserve && !e.ancien && <span className="hl-reserver-tien">C’est le tien ? <a href="/admin">Connecte-toi</a>.</span>}
            </p>
          )
          : v?.etat === 'invalide' ? <p className="hl-reserver-pris"><Icone nom="alerte" taille={16} />Ce nom ne peut pas servir d’adresse : 3 à 30 caractères, lettres, chiffres et tirets.</p>
          : e.verifie && e.verifie === e.nom.replace(/-$/, '') ? <p className="hl-reserver-attente">Vérification de <b>hopla.page/{insecable(e.verifie)}</b>…</p>
          : null}
        {e.etape === 'nom' && e.coupe && !e.erreur && <p className="hl-reserver-coupe">Un nom tient en 30 caractères : la fin est coupée.</p>}
        {/* Un nom nettoyé reste un nom valable : une note, comme pour la coupe, pas l'anneau d'une erreur. */}
        {e.etape === 'nom' && e.retire && !e.erreur && <p className="hl-reserver-coupe">{MOT_ALPHABET}</p>}
        {/* Une adresse refusée ou une faute signalée n'enferment pas : le nom se change toujours d'ici. */}
        {e.etape === 'email' && !e.correction && (e.erreur || suggeree) && <p><button type="button" className="hl-lien-texte" onClick={() => changer({ etape: 'nom', erreur: '', focus: moi })}>Changer de nom</button></p>}
      </div>
      {apercu}
      {e.etape === 'email'
        ? <p className="hl-reserver-note">{MOTS[mode].rassure} <a href="/legal/confidentialite">Confidentialité</a></p>
        : note && !e.ancien && <p className="hl-reserver-note">{e.offre && mode === 'libre'
          // Le chemin du retour vers les prix : on n'a pas à remonter toute la page pour changer d'avis.
          ? <>Tu commences en Gratuit, puis tu actives {offreLue(e)} dans tes réglages. <a href="#prix">Revoir les offres</a></>
          : note}</p>}
    </form>
  );
}

/** Une adresse ne se coupe pas sur ses tirets. */
const insecable = (adresse: string) => adresse.replaceAll('-', '\u2011');

/** L'adresse e-mail du message, en gras et sans coupure sur ses tirets. */
function avecAdresse(message: string, adresse: string): ReactNode {
  const i = adresse ? message.indexOf(adresse) : -1;
  if (i < 0) return message;
  return <>{message.slice(0, i)}<b className="hl-courriel">{insecable(adresse)}</b>{message.slice(i + adresse.length)}</>;
}

/** Les boutons de la barre et des prix : vont au champ le plus proche (celui de l'ouverture ou celui de la fin) et lui donnent la main ; une fois l'e-mail parti, à la carte qui le dit. */
export function allerAuChamp() {
  const distance = (el: HTMLElement) => Math.abs(el.getBoundingClientRect().top + el.offsetHeight / 2 - innerHeight / 2);
  const cible = ['reserver', 'reserver-fin'].map(id => document.getElementById(id)).filter((el): el is HTMLElement => !!el)
    .sort((a, b) => distance(a) - distance(b))[0];
  if (!cible) return;
  cible.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  const champ = cible.querySelector<HTMLElement>('input, .hl-reserver-fait');
  if (champ?.tagName === 'INPUT') focusSaisie(champ, { preventScroll: true }); else champ?.focus({ preventScroll: true });
}
