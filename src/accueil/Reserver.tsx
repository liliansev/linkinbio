import { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Icone } from '../components/Icone.tsx';
import { nomSaisi } from '../lib/valider.ts';
import { adresseSuggeree } from './adresse.ts';
import { MOTS, appel, useInscription } from './textes.ts';

/*
 * « Créer ma page » (ou « Réserver mon nom » en liste d'attente), en
 * ouverture et en fin de page. On tape le nom, Hopla dit pendant la frappe
 * s'il est libre ; le même champ demande ensuite l'adresse e-mail, et la
 * demande part. Les deux champs de la page partagent le même état : un nom
 * pris en haut l'est aussi en bas, et le téléphone d'ouverture affiche le nom
 * tapé dans sa barre d'adresse et sur sa page.
 *
 * Une phrase rassure à chaque étape. Avant l'envoi, un domaine mal tapé est
 * signalé une fois (`adresse.ts`), quand on quitte le champ ou qu'on valide ;
 * après, l'e-mail peut se renvoyer, une minute plus tard, le temps que le
 * premier arrive, et un e-mail faux ou un nom mal tapé se corrigent tant que
 * la page n'a pas été ouverte (`corrigerAdresse`, `renommerPage`).
 *
 * L'état envoyé survit à un rechargement (sessionStorage), et un nom pris
 * propose aussi la connexion : c'est peut-être le sien.
 */

/** `reserve` : un nom gardé par Hopla (admin, aide…), pris sans être la page de personne. */
export type EtatNom = { etat: 'libre' | 'pris' | 'invalide'; nom: string; suggestions: string[]; reserve?: boolean };
export interface ApiAccueil {
  verifier(nom: string): Promise<EtatNom>;
  reserver(nom: string, email: string): Promise<{ ok: boolean; message: string }>;
  /** Le lien repart à la même adresse : un lien de connexion, ou le rappel de la réservation. */
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
}

let etat: Etat = { nom: '', verif: null, etape: 'nom', email: '', message: '', erreur: '', envoi: false, focus: '', signalee: '', renvoi: 'bientot', envoyee: '', correction: false, ancien: '', quitte: '', verifie: '' };
const abonnes = new Set<() => void>();
const changer = (m: Partial<Etat>) => { etat = { ...etat, ...m }; abonnes.forEach(f => f()); };
const abonner = (f: () => void) => { abonnes.add(f); return () => { abonnes.delete(f); }; };
export const useReservation = () => useSyncExternalStore(abonner, () => etat, () => etat);

/** L'envoi fait, gardé pour l'onglet : un rechargement ne le fait pas oublier. */
const CLE = 'hopla-envoi';
function garder() {
  try { sessionStorage.setItem(CLE, JSON.stringify({ nom: etat.nom, message: etat.message, envoyee: etat.envoyee })); } catch { /* stockage indisponible */ }
}
let repris = false;
function reprendre() {
  if (repris) return;
  repris = true;
  try {
    const g = JSON.parse(sessionStorage.getItem(CLE) ?? 'null');
    if (g?.nom && g.envoyee && g.message) { changer({ nom: g.nom, message: g.message, envoyee: g.envoyee, email: g.envoyee, etape: 'fait', renvoi: 'bientot' }); attendreRenvoi(); }
  } catch { /* rien à reprendre */ }
}

/** Une lettre d'un autre alphabet ne passe pas dans une adresse : on le dit au lieu de l'effacer en silence. */
const AUTRE_ALPHABET = /[^\P{L}\p{Script=Latin}]/u;
const MOT_ALPHABET = 'Une adresse ne prend que des lettres latines, des chiffres et des tirets.';

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

function taper(api: ApiAccueil, valeur: string) {
  const nom = nomSaisi(valeur);
  changer({ nom, verif: null, erreur: AUTRE_ALPHABET.test(valeur) ? MOT_ALPHABET : '' });
  clearTimeout(minuterie);
  if (nom.replace(/-$/, '').length >= 3) minuterie = setTimeout(() => verifier(api, nom.replace(/-$/, '')), 280);
}

/** Un e-mail renvoyé trop tôt croise le premier : le bouton n'arrive qu'au bout d'une minute. */
const DELAI_RENVOI = 60_000;
let attente: ReturnType<typeof setTimeout> | undefined;
const attendreRenvoi = () => { clearTimeout(attente); attente = setTimeout(() => changer({ renvoi: 'pret' }), DELAI_RENVOI); };
/** Le lien est parti à `adresse` : l'état final, qui prend le focus du formulaire `qui`, puis une minute avant de pouvoir le renvoyer. */
const parti = (message: string, adresse: string, qui: string) => {
  changer({ etape: 'fait', message, envoi: false, renvoi: 'bientot', envoyee: adresse, correction: false, ancien: '', erreur: '', focus: qui });
  garder();
  attendreRenvoi();
};

async function renvoyer(api: ApiAccueil) {
  changer({ renvoi: 'envoi', erreur: '' });
  try {
    const r = await api.renvoyer(etat.nom, etat.envoyee);
    if (r.ok) { changer({ renvoi: 'fait' }); attendreRenvoi(); } else changer({ renvoi: 'pret', erreur: r.message });
  } catch { changer({ renvoi: 'pret', erreur: 'Le serveur ne répond pas. Réessaie dans un instant.' }); }
}

export function Reserver({ api, note, id, grand }: { api: ApiAccueil; note?: ReactNode; id?: string; grand?: boolean }) {
  const e = useReservation();
  const mode = useInscription();
  const classe = `hl-reserver${grand ? ' hl-reserver-grand' : ''}`;
  const moi = useId();
  const champ = useRef<HTMLInputElement>(null);
  const fait = useRef<HTMLDivElement>(null);
  const idEtat = `${moi}-etat`;

  useEffect(reprendre, []);
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
      if (r.ok) parti(r.message, adresse, moi);
      else if (/pris/.test(r.message)) { changer({ etape: 'nom', envoi: false, erreur: r.message, verif: null, focus: moi }); verifier(api, e.nom); }
      else changer({ envoi: false, erreur: r.message });
    } catch { changer({ envoi: false, erreur: 'Le serveur ne répond pas. Réessaie dans un instant.' }); }
  }

  if (e.etape === 'fait') {
    return (
      <div className={classe} id={id}>
        <div ref={fait} className="hl-reserver-fait" role="status" tabIndex={-1}>
          <Icone nom="check" taille={20} />
          <div>
            <p className="hl-reserver-adresse">hopla.page/{e.nom}</p>
            <p>{avecAdresse(e.message, e.envoyee)}</p>
            <p className="hl-reserver-renvoi">
              {e.renvoi === 'fait' ? MOTS[mode].renvoi
                : e.renvoi === 'bientot' ? 'Pas reçu ? Regarde dans tes indésirables. Tu pourras le renvoyer dans une minute.'
                : <>Pas reçu ? Regarde dans tes indésirables, ou{' '}
                  <button type="button" className="hl-lien-texte" disabled={e.renvoi === 'envoi'} onClick={() => renvoyer(api)}>{e.renvoi === 'envoi' ? 'envoi…' : 'renvoie-le'}</button>.</>}
              {' '}Une faute ?{' '}
              <button type="button" className="hl-lien-texte" onClick={() => changer({ etape: 'email', correction: true, email: e.envoyee, signalee: '', quitte: '', erreur: '', focus: moi })}>Corrige ton e-mail</button>
              {' '}ou{' '}
              <button type="button" className="hl-lien-texte" onClick={() => changer({ etape: 'nom', ancien: e.nom, verif: null, erreur: '', focus: moi })}>change de nom</button>.
            </p>
            {e.erreur && <p className="hl-reserver-erreur" role="alert">{e.erreur}</p>}
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
  // La faute de domaine attend la fin de la frappe : on a quitté le champ, ou validé une première fois.
  const suggeree = e.etape === 'email' && (e.quitte === e.email || e.signalee === e.email) ? adresseSuggeree(e.email) : null;
  const revenir = () => changer({ etape: 'fait', correction: false, nom: e.ancien || e.nom, ancien: '', email: e.envoyee, verif: null, signalee: '', erreur: '', focus: moi });
  const corriger = (adresse: string) => { changer({ email: adresse, signalee: '', erreur: '' }); champ.current?.focus(); };
  return (
    <form className={classe} id={id} onSubmit={envoyer} noValidate data-pris={pris || undefined}>
      <div className="hl-reserver-ligne">
        {e.etape === 'nom' ? (
          <label className="hl-champ">
            <span className="hl-champ-prefixe" aria-hidden="true">hopla.page/</span>
            <span className="hl-cache">Le nom de ta page, après hopla.page/</span>
            <input ref={champ} value={e.nom} onChange={ev => taper(api, ev.target.value)} placeholder="ton-nom" maxLength={30}
              onBlur={() => { if (/-$/.test(etat.nom)) changer({ nom: etat.nom.replace(/-+$/, '') }); }}
              autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" aria-describedby={idEtat}
              aria-invalid={pris || undefined} data-champ-nom />
          </label>
        ) : (
          <label className="hl-champ">
            <span className="hl-cache">Ton adresse e-mail</span>
            <input ref={champ} type="email" value={e.email} onChange={ev => changer({ email: ev.target.value, erreur: '' })} placeholder="ton@adresse.fr" maxLength={200}
              onBlur={() => changer({ quitte: etat.email })}
              autoComplete="email" inputMode="email" enterKeyHint="send" required aria-describedby={idEtat} />
          </label>
        )}
        <button type="submit" className="hl-btn" disabled={e.envoi}>{e.envoi ? (e.etape === 'nom' && !e.ancien ? 'Vérification…' : 'Envoi…') : e.correction ? 'Corriger' : e.ancien ? 'Changer' : appel(mode)}</button>
      </div>
      <div className="hl-reserver-etat" id={idEtat} aria-live="polite">
        {e.erreur ? <p className="hl-reserver-erreur" role="alert">{e.erreur}</p>
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
              {v?.etat === 'libre' && v.nom !== e.ancien && <><Icone nom="check" taille={16} /><span><b>hopla.page/{v.nom}</b> est libre. </span></>}
              <span>{e.nom.replace(/-$/, '') === e.ancien ? 'Tape le bon nom.' : <>Ta page prendra ce nom ; le lien envoyé pour <b>hopla.page/{e.ancien}</b> ne marchera plus.</>}</span>{' '}
              <button type="button" className="hl-lien-texte" onClick={revenir}>Annuler</button>
            </p>
          )
          : e.etape === 'email' ? (
            <p>
              <Icone nom="check" taille={16} /><span><b>hopla.page/{e.nom}</b> est libre. {MOTS[mode].adresse}</span>{' '}
              <button type="button" className="hl-lien-texte" onClick={() => changer({ etape: 'nom', focus: moi })}>Changer de nom</button>
            </p>
          )
          : v?.etat === 'libre' ? <p><Icone nom="check" taille={16} /><span><b>hopla.page/{v.nom}</b> est libre</span></p>
          : v?.etat === 'pris' ? (
            <p className="hl-reserver-pris">
              <span><b>hopla.page/{v.nom}</b> est déjà pris.{v.suggestions.length > 0 && ' Essaie '}</span>
              {v.suggestions.map((s, i) => (
                <span key={s}>{i > 0 && ' ou '}<button type="button" className="hl-lien-texte" onClick={() => { changer({ nom: s, verif: { etat: 'libre', nom: s, suggestions: [] } }); champ.current?.focus(); verifier(api, s); }}>{s}</button></span>
              ))}
              {v.suggestions.length > 0 && '.'}{' '}
              {!v.reserve && !e.ancien && <span className="hl-reserver-tien">C’est le tien ? <a href="/admin">Connecte-toi</a>.</span>}
            </p>
          )
          : v?.etat === 'invalide' ? <p className="hl-reserver-pris">Ce nom ne peut pas servir d’adresse : 3 à 30 caractères, lettres, chiffres et tirets.</p>
          : e.verifie && e.verifie === e.nom.replace(/-$/, '') ? <p className="hl-reserver-attente">Vérification de <b>hopla.page/{e.verifie}</b>…</p>
          : null}
      </div>
      {e.etape === 'email'
        ? <p className="hl-reserver-note">{MOTS[mode].rassure} <a href="/legal/confidentialite">Confidentialité</a></p>
        : note && <p className="hl-reserver-note">{note}</p>}
    </form>
  );
}

/** Une adresse e-mail ne se coupe pas sur ses tirets. */
const insecable = (adresse: string) => adresse.replaceAll('-', '\u2011');

/** L'adresse e-mail du message, en gras et sans coupure sur ses tirets. */
function avecAdresse(message: string, adresse: string): ReactNode {
  const i = adresse ? message.indexOf(adresse) : -1;
  if (i < 0) return message;
  return <>{message.slice(0, i)}<b className="hl-courriel">{insecable(adresse)}</b>{message.slice(i + adresse.length)}</>;
}

/** Les boutons de la barre et des prix : vont au champ le plus proche (celui de l'ouverture ou celui de la fin) et lui donnent la main. */
export function allerAuChamp() {
  const distance = (el: HTMLElement) => Math.abs(el.getBoundingClientRect().top + el.offsetHeight / 2 - innerHeight / 2);
  const cible = ['reserver', 'reserver-fin'].map(id => document.getElementById(id)).filter((el): el is HTMLElement => !!el)
    .sort((a, b) => distance(a) - distance(b))[0];
  if (!cible) return;
  cible.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  cible.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
}
