import { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import type { FormEvent } from 'react';
import { Icone } from '../components/Icone.tsx';
import { nomSaisi } from '../lib/valider.ts';

/*
 * « Réserver mon nom », en ouverture et en fin de page. On tape le nom, Hopla
 * dit pendant la frappe s'il est libre ; le même champ demande ensuite
 * l'adresse e-mail, et la réservation part. Les deux champs de la page
 * partagent le même état : un nom réservé en haut l'est aussi en bas, et le
 * téléphone d'ouverture affiche le nom tapé dans sa barre d'adresse.
 */

export type EtatNom = { etat: 'libre' | 'pris' | 'invalide'; nom: string; suggestions: string[] };
export interface ApiAccueil {
  verifier(nom: string): Promise<EtatNom>;
  reserver(nom: string, email: string): Promise<{ ok: boolean; message: string }>;
}

type Etape = 'nom' | 'email' | 'fait';
interface Etat { nom: string; verif: EtatNom | null; etape: Etape; email: string; message: string; erreur: string; envoi: boolean; focus: string }

let etat: Etat = { nom: '', verif: null, etape: 'nom', email: '', message: '', erreur: '', envoi: false, focus: '' };
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

export function Reserver({ api, note, id }: { api: ApiAccueil; note?: string; id?: string }) {
  const e = useReservation();
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
    changer({ envoi: true, erreur: '' });
    try {
      const r = await api.reserver(e.nom, e.email);
      if (r.ok) changer({ etape: 'fait', message: r.message, envoi: false });
      else if (/pris/.test(r.message)) { changer({ etape: 'nom', envoi: false, erreur: r.message, verif: null, focus: moi }); verifier(api, e.nom); }
      else changer({ envoi: false, erreur: r.message });
    } catch { changer({ envoi: false, erreur: 'Le serveur ne répond pas. Réessaie dans un instant.' }); }
  }

  if (e.etape === 'fait') {
    return (
      <div className="hl-reserver" id={id}>
        <p className="hl-reserver-fait" role="status"><Icone nom="check" taille={20} /><span>{e.message}</span></p>
      </div>
    );
  }

  const v = e.verif;
  return (
    <form className="hl-reserver" id={id} onSubmit={envoyer} noValidate>
      <div className="hl-reserver-ligne">
        {e.etape === 'nom' ? (
          <label className="hl-champ">
            <span className="hl-champ-prefixe" aria-hidden="true">hopla.page/</span>
            <span className="hl-cache">Le nom de ta page, après hopla.page/</span>
            <input ref={champ} value={e.nom} onChange={ev => taper(api, ev.target.value)} placeholder="ton-nom" maxLength={30}
              autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" aria-describedby={idEtat}
              aria-invalid={v?.etat === 'pris' || v?.etat === 'invalide' || undefined} data-champ-nom />
          </label>
        ) : (
          <label className="hl-champ">
            <span className="hl-cache">Ton adresse e-mail</span>
            <input ref={champ} type="email" value={e.email} onChange={ev => changer({ email: ev.target.value, erreur: '' })} placeholder="ton@adresse.fr" maxLength={200}
              autoComplete="email" inputMode="email" enterKeyHint="send" required aria-describedby={idEtat} />
          </label>
        )}
        <button type="submit" className="hl-btn" disabled={e.envoi}>{e.envoi ? 'Envoi…' : 'Réserver mon nom'}</button>
      </div>
      <div className="hl-reserver-etat" id={idEtat} aria-live="polite">
        {e.erreur ? <p className="hl-reserver-erreur" role="alert">{e.erreur}</p>
          : e.etape === 'email' ? (
            <p>
              <Icone nom="check" taille={16} /><span><b>hopla.page/{e.nom}</b> est libre. À quelle adresse t’envoyer ton invitation ?</span>{' '}
              <button type="button" className="hl-lien-texte" onClick={() => changer({ etape: 'nom', focus: moi })}>Changer de nom</button>
            </p>
          )
          : v?.etat === 'libre' ? <p><Icone nom="check" taille={16} /><span><b>hopla.page/{v.nom}</b> est libre</span></p>
          : v?.etat === 'pris' ? (
            <p>
              <span><b>hopla.page/{v.nom}</b> est déjà pris.{v.suggestions.length > 0 && ' Essaie '}</span>
              {v.suggestions.map((s, i) => (
                <span key={s}>{i > 0 && ' ou '}<button type="button" className="hl-lien-texte" onClick={() => { changer({ nom: s, verif: { etat: 'libre', nom: s, suggestions: [] } }); champ.current?.focus(); verifier(api, s); }}>{s}</button></span>
              ))}
            </p>
          )
          : v?.etat === 'invalide' ? <p>Ce nom ne peut pas servir d’adresse : 3 à 30 caractères, lettres, chiffres et tirets.</p>
          : note ? <p className="hl-gris">{note}</p> : null}
      </div>
      {e.etape === 'email' && <p className="hl-reserver-legal">On ne t’écrit que pour ton invitation. <a href="/legal/confidentialite">Confidentialité</a></p>}
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
