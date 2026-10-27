import { useRef, useState } from 'react';
import type { Bloc, Coordonnees, Question } from '../lib/types.ts';
import { GALERIE_GRATUITE, MAX_IMAGES, MAX_QUESTIONS } from '../lib/types.ts';
import { Icone } from '../components/Icone.tsx';
import { Champ, choisirFichier, classeSaisie, preparerImage, vibrer } from './ui.tsx';
import { Reserve } from './offre.tsx';
import { focusAuto } from '../lib/clavier';

/*
 * Les champs des blocs venus de Linktree (24 octobre 2026) : les questions fréquentes, la carte de visite, l'adresse et
 * la galerie. Le texte du bloc (le titre de la FAQ, le nom sur la carte, le nom du lieu, la légende de la galerie) reste
 * le champ commun de l'éditeur ; ici, ce que chacun a de propre.
 */

type Maj = (c: Partial<Bloc>) => void;
type ErreurDe = (champ: string) => string | undefined;

const libelle = 'mb-1.5 block text-[13px] font-semibold text-white';
const erreurClasse = 'mt-1.5 block text-[13px] font-medium leading-snug text-red-300';
const lienAjout = '-my-1.5 flex min-h-11 items-center gap-2 self-start text-[13.5px] font-medium text-white/70 transition hover:text-white bureau:min-h-8';
const petitBouton = 'grid h-9 w-9 place-items-center rounded-lg text-white/55 transition hover:text-white disabled:opacity-30 bureau:h-7 bureau:w-7';

/** Monter, descendre et retirer une rangée : trois gestes au trait, à droite de son libellé. */
function Gestes({ nom, i, total, deplacer, retirer }: { nom: string; i: number; total: number; deplacer: (de: number, vers: number) => void; retirer: () => void }) {
  return (
    <span className="flex items-center">
      <button type="button" className={petitBouton} disabled={i === 0} onClick={() => deplacer(i, i - 1)} aria-label={`Monter ${nom}`}><Icone nom="ui-monter" taille={15} /></button>
      <button type="button" className={petitBouton} disabled={i === total - 1} onClick={() => deplacer(i, i + 1)} aria-label={`Descendre ${nom}`}><Icone nom="ui-descendre" taille={15} /></button>
      <button type="button" className={petitBouton} onClick={retirer} aria-label={`Retirer ${nom}`}><Icone nom="ui-fermer" taille={14} /></button>
    </span>
  );
}

const deplace = <T,>(liste: T[], de: number, vers: number) => { const l = [...liste]; const [x] = l.splice(de, 1); l.splice(vers, 0, x); return l; };

/** Les questions et leurs réponses, l'une sous l'autre, dans l'ordre de la page. */
export function ChampsFaq({ b, maj, erreurDe }: { b: Bloc; maj: Maj; erreurDe: ErreurDe }) {
  const questions = b.questions.length ? b.questions : [{ question: '', reponse: '' }];
  const majQ = (i: number, champs: Partial<Question>) => maj({ questions: questions.map((q, j) => (j === i ? { ...q, ...champs } : q)) });
  const erreur = erreurDe('questions');
  return (
    <div className="flex flex-col gap-4">
      {questions.map((q, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className={libelle.replace('mb-1.5 ', '')}>Question {i + 1}</span>
            {questions.length > 1 && <Gestes nom={`la question ${i + 1}`} i={i} total={questions.length}
              deplacer={(de, vers) => maj({ questions: deplace(questions, de, vers) })} retirer={() => maj({ questions: questions.filter((_, j) => j !== i) })} />}
          </div>
          <input className={classeSaisie} value={q.question} onChange={e => majQ(i, { question: e.target.value })} maxLength={200}
            placeholder={i === 0 ? 'Tu livres où ?' : ''} aria-label={`Question ${i + 1}`} aria-invalid={erreur && !q.question.trim() && q.reponse.trim() ? true : undefined} />
          <textarea className={`${classeSaisie} min-h-20`} value={q.reponse} onChange={e => majQ(i, { reponse: e.target.value })} maxLength={1500}
            placeholder={i === 0 ? 'Partout en France, en 48 heures.' : 'La réponse'} aria-label={`Réponse ${i + 1}`} aria-invalid={erreur && q.question.trim() && !q.reponse.trim() ? true : undefined} />
        </div>
      ))}
      {erreur && <span role="alert" className={erreurClasse}>{erreur}</span>}
      {questions.length < MAX_QUESTIONS && (
        <button type="button" className={lienAjout} onClick={() => { vibrer(4); maj({ questions: [...questions, { question: '', reponse: '' }] }); }}>
          <Icone nom="ui-plus" taille={15} className="shrink-0" />Ajouter une question
        </button>
      )}
    </div>
  );
}

/** La carte de visite, après le nom : le poste et la société, le numéro, l'adresse e-mail, le site et l'adresse postale. */
export function ChampsCoordonnees({ b, maj, erreurDe, bureau }: { b: Bloc; maj: Maj; erreurDe: ErreurDe; bureau: boolean }) {
  const c: Coordonnees = b.coordonnees ?? { telephone: '', email: '', societe: '', poste: '' };
  const majC = (champs: Partial<Coordonnees>) => maj({ coordonnees: { ...c, ...champs } });
  const paire = (enfants: React.ReactNode) => (bureau ? <div className="adm-paire">{enfants}</div> : enfants);
  return (
    <>
      {paire(<>
        <Champ label="Poste (facultatif)">
          <input className={classeSaisie} value={c.poste} onChange={e => majC({ poste: e.target.value })} maxLength={80} autoComplete="organization-title" placeholder="Photographe" />
        </Champ>
        <Champ label="Société (facultatif)">
          <input className={classeSaisie} value={c.societe} onChange={e => majC({ societe: e.target.value })} maxLength={80} autoComplete="organization" />
        </Champ>
      </>)}
      {paire(<>
        <Champ label="Téléphone" erreur={erreurDe('telephone')}>
          <input className={classeSaisie} type="tel" inputMode="tel" autoComplete="tel" value={c.telephone} onChange={e => majC({ telephone: e.target.value })} maxLength={30} placeholder="06 12 34 56 78" />
        </Champ>
        <Champ label="E-mail" erreur={erreurDe('email')}>
          <input className={classeSaisie} type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" autoComplete="email" value={c.email} onChange={e => majC({ email: e.target.value })} maxLength={200} placeholder="toi@exemple.fr" />
        </Champ>
      </>)}
      <Champ label="Site (facultatif)" erreur={erreurDe('url')}>
        <input className={classeSaisie} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" value={b.url} onChange={e => maj({ url: e.target.value })} placeholder="monsite.fr" />
      </Champ>
      <Champ label="Adresse (facultatif)">
        <textarea className={`${classeSaisie} min-h-20`} value={b.adressePostale} onChange={e => maj({ adressePostale: e.target.value })} maxLength={200} autoComplete="street-address" />
      </Champ>
    </>
  );
}

/** L'adresse d'un lieu, comme sur une enveloppe : la page en fait un itinéraire et une carte. */
export function ChampLieu({ b, maj, erreurDe, nouveau = false }: { b: Bloc; maj: Maj; erreurDe: ErreurDe; nouveau?: boolean }) {
  return (
    <Champ label="Adresse" erreur={erreurDe('adresse')} aide="Tes visiteurs ont l’itinéraire d’un toucher, et la carte s’ils la demandent.">
      <textarea className={`${classeSaisie} min-h-20`} value={b.adressePostale} onChange={e => maj({ adressePostale: e.target.value })} maxLength={200}
        autoComplete="street-address" placeholder={'12 rue des Lilas\n75011 Paris'} autoFocus={focusAuto(nouveau)} />
    </Champ>
  );
}

/**
 * Les photos d'une galerie, en vignettes dans l'ordre de la page : ajouter (plusieurs à la fois), déplacer, retirer.
 * Sans Starter, la page n'en montre que trois : les autres restent là, et l'offre le dit.
 */
export function ChampsGalerie({ b, maj, erreurDe, envoyerImage, droit }: { b: Bloc; maj: Maj; erreurDe: ErreurDe; envoyerImage: (d: string) => Promise<string>; droit: boolean }) {
  const fichier = useRef<HTMLInputElement>(null);
  const ajout = useRef<HTMLButtonElement>(null);
  const [envoi, setEnvoi] = useState(0);
  const [erreur, setErreur] = useState('');
  // Les photos ajoutées pendant l'envoi s'ajoutent à la liste du moment, pas à celle d'avant.
  const images = useRef(b.images);
  images.current = b.images;
  async function ajouter(liste: FileList | null) {
    const place = MAX_IMAGES - images.current.length;
    const choisies = [...(liste ?? [])].slice(0, Math.max(0, place));
    if (!choisies.length) return;
    setErreur(''); setEnvoi(choisies.length);
    for (const f of choisies) {
      try {
        const url = await envoyerImage(await preparerImage(f, 'galerie'));
        maj({ images: [...images.current, url] });
        images.current = [...images.current, url];
      } catch (e) { setErreur(e instanceof Error && /place/.test(e.message) ? e.message : 'Une photo n’est pas passée. Essaie une autre image.'); }
      setEnvoi(n => n - 1);
    }
    if (fichier.current) fichier.current.value = '';
  }
  const trop = !droit && b.images.length > GALERIE_GRATUITE;
  const message = erreurDe('images') ?? erreur;
  return (
    <div>
      <span className={libelle}>Photos, dans l’ordre de ta page</span>
      <ul className="grid grid-cols-3 gap-2 bureau:grid-cols-4">
        {b.images.map((src, i) => (
          <li key={src} className="flex flex-col gap-1">
            <img src={src} alt="" className={`aspect-[4/5] w-full rounded-lg object-cover outline outline-1 -outline-offset-1 outline-white/10 ${!droit && i >= GALERIE_GRATUITE ? 'opacity-40' : ''}`} />
            <Gestes nom={`la photo ${i + 1}`} i={i} total={b.images.length}
              deplacer={(de, vers) => maj({ images: deplace(b.images, de, vers) })} retirer={() => maj({ images: b.images.filter((_, j) => j !== i) })} />
          </li>
        ))}
        {Array.from({ length: envoi }, (_, i) => (
          <li key={`envoi-${i}`} aria-hidden="true" className="grid aspect-[4/5] place-items-center rounded-lg border border-white/10">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/15 border-t-white/60 motion-reduce:animate-none" />
          </li>
        ))}
        {b.images.length + envoi < MAX_IMAGES && (
          <li className="relative">
            <button ref={ajout} type="button" onClick={() => choisirFichier(fichier.current, ajout.current)} aria-invalid={message ? true : undefined}
              className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-white/20 text-[12.5px] font-medium text-white/70 transition hover:border-white/60 hover:text-white aria-[invalid=true]:border-red-400/70">
              <Icone nom="ui-image-plus" taille={20} />Ajouter
            </button>
            <input ref={fichier} type="file" accept="image/*" multiple className="absolute h-px w-px opacity-0" tabIndex={-1} aria-hidden="true" onChange={e => void ajouter(e.target.files)} />
          </li>
        )}
      </ul>
      {message && <span role="alert" className={erreurClasse}>{message}</span>}
      {trop && <div className="mt-2"><Reserve fonction="galerie" phrase={`Ta page montre les ${GALERIE_GRATUITE} premières photos. Avec Hopla Starter, elle les montre toutes, jusqu’à ${MAX_IMAGES}.`} /></div>}
    </div>
  );
}
