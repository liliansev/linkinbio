import { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import type { FormEvent } from 'react';
import { Icone } from '../components/Icone.tsx';
import { nomSaisi } from '../lib/valider.ts';
import { adresseSuggeree } from './adresse.ts';
import { MOTS, appel, useInscription } from './textes.ts';

/*
 * « Créer ma hopla » (ou « Réserver mon nom » en liste d'attente), en
 * ouverture et en fin de page. On tape le nom, Hopla dit pendant la frappe
 * s'il est libre ; le même champ demande ensuite l'adresse e-mail, et la
 * demande part. Les deux champs de la page partagent le même état : un nom
 * pris en haut l'est aussi en bas, et le téléphone d'ouverture affiche le nom
 * tapé dans sa barre d'adresse et sur sa page.
 *
 * Une phrase rassure à chaque étape. Avant l'envoi, un domaine mal tapé est
 * signalé une fois (`adresse.ts`) ; après, l'e-mail peut se renvoyer, une
 * minute plus tard, le temps que le premier arrive.
 */

export type EtatNom = { etat: 'libre' | 'pris' | 'invalide'; nom: string; suggestions: string[] };
export interface ApiAccueil {
  verifier(nom: string): Promise<EtatNom>;
  reserver(nom: string, email: string): Promise<{ ok: boolean; message: string }>;
  /** Le lien repart à la même adresse : un lien de connexion, ou le rappel de la réservation. */
  renvoyer(nom: string, email: string): Promise<{ ok: boolean; message: string }>;
}

type Etape = 'nom' | 'email' | 'fait';
type Renvoi = 'bientot' | 'pret' | 'envoi' | 'fait';
interface Etat {
  nom: string; verif: EtatNom | null; etape: Etape; email: string; message: string; erreur: string; envoi: boolean; focus: string;
  /** L'adresse dont on a déjà signalé le domaine : renvoyée telle quelle, elle part. */
  signalee: string;
  renvoi: Renvoi;
}

let etat: Etat = { nom: '', verif: null, etape: 'nom', email: '', message: '', erreur: '', envoi: false, focus: '', signalee: '', renvoi: 'bientot' };
const abonnes = new Set<() => void>();
const changer = (m: Partial<Etat>) => { etat = { ...etat, ...m }; abonnes.forEach(f => f()); };
const abonner = (f: () => void) => { abonnes.add(f); return () => { abonnes.delete(f); }; };
export const useReservation = () => useSyncExternalStore(abonner, () => etat, () => etat);

let minuterie: ReturnType<typeof setTimeout> | undefined;
let demande = 0;
async function verifier(api: ApiAccueil, nom: string): Promise<EtatNom | null> {
  const ici = ++demande;
  try {
    const r = await api.verifier(nom);
    if (ici === demande && etat.nom === nom) changer({ verif: r });
    return r;
  } catch { return null; }
}

function taper(api: ApiAccueil, valeur: string) {
  const nom = nomSaisi(valeur);
  changer({ nom, verif: null, erreur: '' });
  clearTimeout(minuterie);
  if (nom.replace(/-$/, '').length >= 3) minuterie = setTimeout(() => verifier(api, nom.replace(/-$/, '')), 280);
}

/** Un e-mail renvoyé trop tôt croise le premier : le bouton n'arrive qu'au bout d'une minute. */
const DELAI_RENVOI = 60_000;
const attendreRenvoi = () => setTimeout(() => changer({ renvoi: 'pret' }), DELAI_RENVOI);

async function renvoyer(api: ApiAccueil) {
  changer({ renvoi: 'envoi', erreur: '' });
  try {
    const r = await api.renvoyer(etat.nom, etat.email);
    if (r.ok) { changer({ renvoi: 'fait' }); attendreRenvoi(); } else changer({ renvoi: 'pret', erreur: r.message });
  } catch { changer({ renvoi: 'pret', erreur: 'Le serveur ne répond pas. Réessaie dans un instant.' }); }
}

export function Reserver({ api, note, id, grand }: { api: ApiAccueil; note?: string; id?: string; grand?: boolean }) {
  const e = useReservation();
  const mode = useInscription();
  const classe = `hl-reserver${grand ? ' hl-reserver-grand' : ''}`;
  const moi = useId();
  const champ = useRef<HTMLInputElement>(null);
  const idEtat = `${moi}-etat`;

  // Le champ qui a fait avancer l'étape garde la main ; l'autre ne vole pas le focus.
  useEffect(() => { if (e.focus === moi) { champ.current?.focus({ preventScroll: true }); changer({ focus: '' }); } }, [e.focus, e.etape, moi]);

  async function envoyer(ev: FormEvent) {
    ev.preventDefault();
    if (e.envoi) return;
    if (e.etape === 'nom') {
      const nom = e.nom.replace(/-$/, '');
      if (nom.length < 3) { changer({ erreur: nom ? 'Il faut au moins 3 caractères.' : 'Choisis le nom de ta page.' }); champ.current?.focus(); return; }
      clearTimeout(minuterie);
      const v = e.verif?.nom === nom ? e.verif : await verifier(api, nom);
      if (!v) { changer({ erreur: 'Le serveur ne répond pas. Réessaie dans un instant.' }); return; }
      if (v.etat === 'libre') changer({ nom, etape: 'email', erreur: '', focus: moi });
      else champ.current?.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.email.trim())) { changer({ erreur: 'Il manque une adresse e-mail complète, comme marie@exemple.fr.' }); champ.current?.focus(); return; }
    // Un domaine qui ressemble à une faute : on le dit une fois, puis l'adresse part telle quelle.
    if (adresseSuggeree(e.email) && e.signalee !== e.email) { changer({ signalee: e.email }); champ.current?.focus(); return; }
    changer({ envoi: true, erreur: '' });
    try {
      const r = await api.reserver(e.nom, e.email.trim());
      if (r.ok) { changer({ etape: 'fait', message: r.message, envoi: false, renvoi: 'bientot' }); attendreRenvoi(); }
      else if (/pris/.test(r.message)) { changer({ etape: 'nom', envoi: false, erreur: r.message, verif: null, focus: moi }); verifier(api, e.nom); }
      else changer({ envoi: false, erreur: r.message });
    } catch { changer({ envoi: false, erreur: 'Le serveur ne répond pas. Réessaie dans un instant.' }); }
  }

  if (e.etape === 'fait') {
    return (
      <div className={classe} id={id}>
        <div className="hl-reserver-fait" role="status">
          <Icone nom="check" taille={20} />
          <div>
            <p>{e.message}</p>
            <p className="hl-reserver-renvoi">
              {e.renvoi === 'fait' ? MOTS[mode].renvoi
                : e.renvoi === 'bientot' ? 'Pas reçu ? Regarde dans tes indésirables. Tu pourras le renvoyer dans une minute.'
                : <>Pas reçu ? Regarde dans tes indésirables, ou{' '}
                  <button type="button" className="hl-lien-texte" disabled={e.renvoi === 'envoi'} onClick={() => renvoyer(api)}>{e.renvoi === 'envoi' ? 'envoi…' : 'renvoie-le'}</button>.</>}
            </p>
            {e.erreur && <p className="hl-reserver-erreur" role="alert">{e.erreur}</p>}
          </div>
        </div>
      </div>
    );
  }

  const v = e.verif;
  const pris = e.etape === 'nom' && (v?.etat === 'pris' || v?.etat === 'invalide');
  const suggeree = e.etape === 'email' ? adresseSuggeree(e.email) : null;
  const corriger = (adresse: string) => { changer({ email: adresse, signalee: '', erreur: '' }); champ.current?.focus(); };
  return (
    <form className={classe} id={id} onSubmit={envoyer} noValidate data-pris={pris || undefined}>
      <div className="hl-reserver-ligne">
        {e.etape === 'nom' ? (
          <label className="hl-champ">
            <span className="hl-champ-prefixe" aria-hidden="true">hopla.page/</span>
            <span className="hl-cache">Le nom de ta page, après hopla.page/</span>
            <input ref={champ} value={e.nom} onChange={ev => taper(api, ev.target.value)} placeholder="ton-nom" maxLength={30}
              autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" aria-describedby={idEtat}
              aria-invalid={pris || undefined} data-champ-nom />
          </label>
        ) : (
          <label className="hl-champ">
            <span className="hl-cache">Ton adresse e-mail</span>
            <input ref={champ} type="email" value={e.email} onChange={ev => changer({ email: ev.target.value, erreur: '' })} placeholder="ton@adresse.fr" maxLength={200}
              autoComplete="email" inputMode="email" enterKeyHint="send" required aria-describedby={idEtat} />
          </label>
        )}
        <button type="submit" className="hl-btn" disabled={e.envoi}>{e.envoi ? 'Envoi…' : appel(mode)}</button>
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
            </p>
          )
          : v?.etat === 'invalide' ? <p className="hl-reserver-pris">Ce nom ne peut pas servir d’adresse : 3 à 30 caractères, lettres, chiffres et tirets.</p>
          : null}
      </div>
      {e.etape === 'email'
        ? <p className="hl-reserver-note">{MOTS[mode].rassure} <a href="/legal/confidentialite">Confidentialité</a></p>
        : note && <p className="hl-reserver-note">{note}</p>}
    </form>
  );
}

/** Le bouton de la barre : remonte au champ d'ouverture et lui donne la main. */
export function allerAuChamp() {
  const cible = document.getElementById('reserver');
  if (!cible) return;
  cible.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  cible.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
}
