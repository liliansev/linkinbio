import { useEffect, useRef, useState } from 'react';
import type { Bloc, Coordonnees, Question } from '../lib/types.ts';
import { GALERIE_GRATUITE, MAX_IMAGES, MAX_QUESTIONS } from '../lib/types.ts';
import { Icone } from '../components/Icone.tsx';
import { Champ, choisirFichier, classeBouton, classeSaisie, preparerImage, vibrer } from './ui.tsx';
import { MAX_FICHIER, MAX_NOTE_VOCALE, dureeLisible } from '../lib/fichiers.ts';
import { Reserve } from './offre.tsx';
import { focusAuto } from '../lib/clavier';
import { choix, useL, useLangue } from '../accueil/langue.ts';
import type { Choix } from '../accueil/langue.ts';

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
  const tr = useL();
  const questions = b.questions.length ? b.questions : [{ question: '', reponse: '' }];
  const majQ = (i: number, champs: Partial<Question>) => maj({ questions: questions.map((q, j) => (j === i ? { ...q, ...champs } : q)) });
  const erreur = erreurDe('questions');
  return (
    <div className="flex flex-col gap-4">
      {questions.map((q, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className={libelle.replace('mb-1.5 ', '')}>{tr('Question', 'Question')}{' '}{i + 1}</span>
            {questions.length > 1 && <Gestes nom={`la question ${i + 1}`} i={i} total={questions.length}
              deplacer={(de, vers) => maj({ questions: deplace(questions, de, vers) })} retirer={() => maj({ questions: questions.filter((_, j) => j !== i) })} />}
          </div>
          <input className={classeSaisie} value={q.question} onChange={e => majQ(i, { question: e.target.value })} maxLength={200}
            placeholder={i === 0 ? tr('Tu livres où ?', 'Where do you ship?') : ''} aria-label={`Question ${i + 1}`} aria-invalid={erreur && !q.question.trim() && q.reponse.trim() ? true : undefined} />
          <textarea className={`${classeSaisie} min-h-20`} value={q.reponse} onChange={e => majQ(i, { reponse: e.target.value })} maxLength={1500}
            placeholder={i === 0 ? tr('Partout en France, en 48 heures.', 'Anywhere in the US, within 48 hours.') : tr('La réponse', 'The answer')} aria-label={`Réponse ${i + 1}`} aria-invalid={erreur && q.question.trim() && !q.reponse.trim() ? true : undefined} />
        </div>
      ))}
      {erreur && <span role="alert" className={erreurClasse}>{erreur}</span>}
      {questions.length < MAX_QUESTIONS && (
        <button type="button" className={lienAjout} onClick={() => { vibrer(4); maj({ questions: [...questions, { question: '', reponse: '' }] }); }}>
          <Icone nom="ui-plus" taille={15} className="shrink-0" />{tr('Ajouter une question', 'Add a question')}
        </button>
      )}
    </div>
  );
}

/** La carte de visite, après le nom : le poste et la société, le numéro, l'adresse e-mail, le site et l'adresse postale. */
export function ChampsCoordonnees({ b, maj, erreurDe, bureau }: { b: Bloc; maj: Maj; erreurDe: ErreurDe; bureau: boolean }) {
  const tr = useL();
  const c: Coordonnees = b.coordonnees ?? { telephone: '', email: '', societe: '', poste: '' };
  const majC = (champs: Partial<Coordonnees>) => maj({ coordonnees: { ...c, ...champs } });
  const paire = (enfants: React.ReactNode) => (bureau ? <div className="adm-paire">{enfants}</div> : enfants);
  return (
    <>
      {paire(<>
        <Champ label={tr('Poste (facultatif)', 'Job title (optional)')}>
          <input className={classeSaisie} value={c.poste} onChange={e => majC({ poste: e.target.value })} maxLength={80} autoComplete="organization-title" placeholder={tr('Photographe', 'Photographer')} />
        </Champ>
        <Champ label={tr('Société (facultatif)', 'Company (optional)')}>
          <input className={classeSaisie} value={c.societe} onChange={e => majC({ societe: e.target.value })} maxLength={80} autoComplete="organization" />
        </Champ>
      </>)}
      {paire(<>
        <Champ label={tr('Téléphone', 'Phone')} erreur={erreurDe('telephone')}>
          <input className={classeSaisie} type="tel" inputMode="tel" autoComplete="tel" value={c.telephone} onChange={e => majC({ telephone: e.target.value })} maxLength={30} placeholder="06 12 34 56 78" />
        </Champ>
        <Champ label={tr('E-mail', 'Email')} erreur={erreurDe('email')}>
          <input className={classeSaisie} type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" autoComplete="email" value={c.email} onChange={e => majC({ email: e.target.value })} maxLength={200} placeholder="toi@exemple.fr" />
        </Champ>
      </>)}
      <Champ label={tr('Site (facultatif)', 'Website (optional)')} erreur={erreurDe('url')}>
        <input className={classeSaisie} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" value={b.url} onChange={e => maj({ url: e.target.value })} placeholder="monsite.fr" />
      </Champ>
      <Champ label={tr('Adresse (facultatif)', 'Address (optional)')}>
        <textarea className={`${classeSaisie} min-h-20`} value={b.adressePostale} onChange={e => maj({ adressePostale: e.target.value })} maxLength={200} autoComplete="street-address" />
      </Champ>
    </>
  );
}

/** L'adresse d'un lieu, comme sur une enveloppe : la page en fait un itinéraire et une carte. */
export function ChampLieu({ b, maj, erreurDe, nouveau = false }: { b: Bloc; maj: Maj; erreurDe: ErreurDe; nouveau?: boolean }) {
  const tr = useL();
  return (
    <Champ label={tr('Adresse', 'Address')} erreur={erreurDe('adresse')} aide={tr('Tes visiteurs ont l’itinéraire d’un toucher, et la carte s’ils la demandent.', 'Your visitors get directions in one tap, and the map if they ask for it.')}>
      <textarea className={`${classeSaisie} min-h-20`} value={b.adressePostale} onChange={e => maj({ adressePostale: e.target.value })} maxLength={200}
        autoComplete="street-address" placeholder={tr('12 rue des Lilas\n75011 Paris', '123 Main Street\nBrooklyn, NY 11201')} autoFocus={focusAuto(nouveau)} />
    </Champ>
  );
}

/**
 * Les photos d'une galerie, en vignettes dans l'ordre de la page : ajouter (plusieurs à la fois), déplacer, retirer.
 * Sans Starter, la page n'en montre que trois : les autres restent là, et l'offre le dit.
 */
export function ChampsGalerie({ b, maj, erreurDe, envoyerImage, droit }: { b: Bloc; maj: Maj; erreurDe: ErreurDe; envoyerImage: (d: string) => Promise<string>; droit: boolean }) {
  const tr = useL();
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
      } catch (e) { setErreur(e instanceof Error && /place/.test(e.message) ? e.message : tr('Une photo n’est pas passée. Essaie une autre image.', 'A photo didn’t go through. Try another image.')); }
      setEnvoi(n => n - 1);
    }
    if (fichier.current) fichier.current.value = '';
  }
  const trop = !droit && b.images.length > GALERIE_GRATUITE;
  const message = erreurDe('images') ?? erreur;
  return (
    <div>
      <span className={libelle}>{tr('Photos, dans l’ordre de ta page', 'Photos, in your page’s order')}</span>
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
              <Icone nom="ui-image-plus" taille={20} />{tr('Ajouter', 'Add')}
            </button>
            <input ref={fichier} type="file" accept="image/*" multiple className="absolute h-px w-px opacity-0" tabIndex={-1} aria-hidden="true" onChange={e => void ajouter(e.target.files)} />
          </li>
        )}
      </ul>
      {message && <span role="alert" className={erreurClasse}>{message}</span>}
      {trop && <div className="mt-2"><Reserve fonction="galerie" phrase={tr(`Ta page montre les ${GALERIE_GRATUITE} premières photos. Avec Hopla Starter, elle les montre toutes, jusqu’à ${MAX_IMAGES}.`, `Your page shows the first ${GALERIE_GRATUITE} photos. With Hopla Starter, it shows them all, up to ${MAX_IMAGES}.`)} /></div>}
    </div>
  );
}

/* ---- Document et note vocale (10 novembre 2026, lot 5 d'après Taap.it) ---- */

type Envoyer = (fichier: Blob) => Promise<string>;
const sablier = <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/15 border-t-white/60 motion-reduce:animate-none" />;
const rangeeFichier = 'flex min-h-14 items-center gap-3 rounded-xl border border-white/15 px-3.5 py-2';

/** Un PDF choisi sur l'appareil : son envoi, puis une rangée qui dit qu'il est là, avec de quoi l'ouvrir ou le remplacer. */
export function ChampDocument({ b, maj, erreurDe, envoyerFichier }: { b: Bloc; maj: Maj; erreurDe: ErreurDe; envoyerFichier: Envoyer }) {
  const tr = useL();
  const champ = useRef<HTMLInputElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  async function choisir(f: File | undefined) {
    if (champ.current) champ.current.value = '';
    if (!f) return;
    if (f.size > MAX_FICHIER) { setErreur(tr('Ce PDF dépasse 10 Mo. Allège-le, ou mets-le en lien depuis ton Drive.', 'This PDF is over 10 MB. Compress it, or link to it from your Drive.')); return; }
    setErreur(''); setEnvoi(true);
    // Sans texte tapé, le bouton prend le nom du fichier : « Tarifs 2026 ».
    const nom = f.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim().slice(0, 80).replace(/^./, c => c.toUpperCase());
    try { maj({ fichier: await envoyerFichier(f), ...(b.titre.trim() ? {} : { titre: nom }) }); }
    catch (e) { setErreur(e instanceof Error && e.message && e.message.length < 160 ? e.message : tr('Le PDF n’est pas passé. Réessaie.', 'The PDF didn’t go through. Try again.')); }
    setEnvoi(false);
  }
  const message = erreurDe('fichier') ?? erreur;
  return (
    <div>
      <span className={libelle}>{tr('Ton document', 'Your document')}</span>
      <div className="relative">
        {b.fichier && !envoi ? (
          <div className={rangeeFichier}>
            <Icone nom="document" taille={20} className="shrink-0 text-bleu" />
            <a href={b.fichier} target="_blank" rel="noopener" className="min-w-0 flex-1 truncate text-[14px] font-medium text-white underline decoration-white/25 underline-offset-2">{tr('Ouvrir le PDF', 'Open the PDF')}</a>
            <button ref={bouton} type="button" className={classeBouton.discret} onClick={() => choisirFichier(champ.current, bouton.current)}>{tr('Remplacer', 'Replace')}</button>
          </div>
        ) : (
          <button ref={bouton} type="button" disabled={envoi} aria-invalid={message ? true : undefined} onClick={() => choisirFichier(champ.current, bouton.current)}
            className={`${rangeeFichier} w-full justify-center text-[14px] font-medium text-white/80 transition hover:border-white/60 hover:text-white aria-[invalid=true]:border-red-400/70`}>
            {envoi ? <>{sablier}{tr('Envoi du PDF…', 'Uploading the PDF…')}</> : <><Icone nom="document" taille={18} />{tr('Choisir un PDF', 'Choose a PDF')}</>}
          </button>
        )}
        <input ref={champ} type="file" accept="application/pdf,.pdf" className="absolute h-px w-px opacity-0" tabIndex={-1} aria-hidden="true" onChange={e => void choisir(e.target.files?.[0])} />
      </div>
      {message ? <span role="alert" className={erreurClasse}>{message}</span>
        : <span className="mt-1.5 block text-[12.5px] leading-snug text-white/55">{tr('Un menu, une plaquette, des tarifs : 10 Mo au plus. Il s’ouvre d’un toucher depuis ta page.', 'A menu, a brochure, a price list: 10 MB at most. It opens with one tap from your page.')}</span>}
    </div>
  );
}

/** Le format qu'enregistre ce navigateur : le MP4 en AAC d'abord, que tous relisent, sinon le WebM. */
const formatEnregistre = () => (typeof MediaRecorder === 'undefined' ? '' : ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(t => MediaRecorder.isTypeSupported(t)) ?? '');

/** La durée d'un son choisi sur l'appareil, lue par le navigateur ; 0 s'il ne la donne pas. */
function dureeDe(f: Blob): Promise<number> {
  return new Promise(fin => {
    const url = URL.createObjectURL(f), a = new Audio();
    const rendre = (d: number) => { URL.revokeObjectURL(url); fin(Number.isFinite(d) ? Math.round(d) : 0); };
    a.preload = 'metadata';
    a.onloadedmetadata = () => rendre(a.duration);
    a.onerror = () => rendre(0);
    setTimeout(() => rendre(0), 4000);
    a.src = url;
  });
}

/**
 * Une note vocale : enregistrée ici, au micro (cinq minutes au plus, elle s'arrête seule), ou choisie parmi ses fichiers.
 * Une fois posée, elle se réécoute dans l'éditeur, et se refait d'un geste.
 */
export function ChampNoteVocale({ b, maj, erreurDe, envoyerFichier }: { b: Bloc; maj: Maj; erreurDe: ErreurDe; envoyerFichier: Envoyer }) {
  const tr = useL();
  const champ = useRef<HTMLInputElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  const micro = useRef<{ enregistreur: MediaRecorder; flux: MediaStream; depart: number } | null>(null);
  const [etat, setEtat] = useState<'repos' | 'enregistre' | 'envoi'>('repos');
  const [secondes, setSecondes] = useState(0);
  const [erreur, setErreur] = useState('');
  const peutEnregistrer = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && !!formatEnregistre();

  async function poser(f: Blob, duree: number) {
    if (f.size > MAX_FICHIER) { setErreur(tr('Ce son dépasse 10 Mo. Choisis-en un plus court.', 'This audio is over 10 MB. Pick a shorter one.')); return; }
    setErreur(''); setEtat('envoi');
    try { maj({ fichier: await envoyerFichier(f), duree }); }
    catch (e) { setErreur(e instanceof Error && e.message && e.message.length < 160 ? e.message : tr('Le son n’est pas passé. Réessaie.', 'The audio didn’t go through. Try again.')); }
    setEtat('repos');
  }
  const couper = () => { micro.current?.flux.getTracks().forEach(p => p.stop()); micro.current = null; };
  async function enregistrer() {
    setErreur('');
    let flux: MediaStream;
    try { flux = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { setErreur(tr('Le micro n’est pas autorisé. Autorise-le dans ton navigateur, ou choisis un fichier.', 'The microphone isn’t allowed. Allow it in your browser, or choose a file.')); return; }
    const type = formatEnregistre();
    const enregistreur = new MediaRecorder(flux, { mimeType: type });
    const morceaux: Blob[] = [];
    const depart = Date.now();
    enregistreur.ondataavailable = e => { if (e.data.size) morceaux.push(e.data); };
    enregistreur.onstop = () => {
      const duree = Math.max(1, Math.round((Date.now() - depart) / 1000));
      couper();
      void poser(new Blob(morceaux, { type: type.split(';')[0] }), duree);
    };
    micro.current = { enregistreur, flux, depart };
    enregistreur.start(1000);
    setSecondes(0); setEtat('enregistre'); vibrer();
  }
  const arreter = () => { if (micro.current?.enregistreur.state === 'recording') micro.current.enregistreur.stop(); };
  // Le chrono de l'enregistrement, qui s'arrête seul à cinq minutes.
  useEffect(() => {
    if (etat !== 'enregistre') return;
    const t = setInterval(() => {
      const s = Math.round((Date.now() - (micro.current?.depart ?? Date.now())) / 1000);
      setSecondes(s);
      if (s >= MAX_NOTE_VOCALE) arreter();
    }, 500);
    return () => clearInterval(t);
  }, [etat]);
  // L'éditeur refermé en plein enregistrement : le micro se coupe, rien n'est envoyé.
  useEffect(() => () => { const m = micro.current; if (m) { m.enregistreur.onstop = null; if (m.enregistreur.state === 'recording') m.enregistreur.stop(); m.flux.getTracks().forEach(p => p.stop()); } }, []);

  async function choisir(f: File | undefined) {
    if (champ.current) champ.current.value = '';
    if (f) await poser(f, await dureeDe(f));
  }
  const message = erreurDe('fichier') ?? erreur;
  const choisirUnFichier = (
    <button ref={bouton} type="button" className={classeBouton.discret} onClick={() => choisirFichier(champ.current, bouton.current)}>
      {b.fichier ? tr('Choisir un fichier', 'Choose a file') : peutEnregistrer ? tr('ou choisir un fichier', 'or choose a file') : tr('Choisir un fichier son', 'Choose an audio file')}
    </button>
  );
  return (
    <div>
      <span className={libelle}>{tr('Ta note vocale', 'Your voice note')}</span>
      <div className="relative flex flex-col gap-2">
        {etat === 'enregistre' ? (
          <div className={rangeeFichier} role="status">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500 motion-reduce:animate-none" />
            <span className="flex-1 text-[14px] font-medium tabular-nums text-white">{tr('Enregistrement', 'Recording')} · {dureeLisible(secondes)}</span>
            <button type="button" className={classeBouton.principal} onClick={arreter}>{tr('Arrêter', 'Stop')}</button>
          </div>
        ) : etat === 'envoi' ? (
          <div className={`${rangeeFichier} justify-center text-[14px] font-medium text-white/80`} role="status">{sablier}{tr('Envoi de la note…', 'Uploading the note…')}</div>
        ) : b.fichier ? (
          <>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls preload="metadata" src={b.fichier} className="w-full" />
            <div className="flex flex-wrap items-center gap-1">
              {peutEnregistrer && <button type="button" className={classeBouton.discret} onClick={() => void enregistrer()}><Icone nom="micro" taille={16} />{tr('Refaire', 'Record again')}</button>}
              {choisirUnFichier}
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {peutEnregistrer && (
              <button type="button" aria-invalid={message ? true : undefined} onClick={() => void enregistrer()}
                className={`${rangeeFichier} flex-1 justify-center text-[14px] font-medium text-white/80 transition hover:border-white/60 hover:text-white aria-[invalid=true]:border-red-400/70`}>
                <Icone nom="micro" taille={18} />{tr('Enregistrer', 'Record')}
              </button>
            )}
            {choisirUnFichier}
          </div>
        )}
        <input ref={champ} type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg" className="absolute h-px w-px opacity-0" tabIndex={-1} aria-hidden="true" onChange={e => void choisir(e.target.files?.[0])} />
      </div>
      {message ? <span role="alert" className={erreurClasse}>{message}</span>
        : <span className="mt-1.5 block text-[12.5px] leading-snug text-white/55">{tr('Un mot d’accueil, une présentation, un extrait : cinq minutes au micro, 10 Mo pour un fichier. Elle s’écoute dans ta page.', 'A welcome, an intro, a sample: five minutes at the mic, 10 MB for a file. It plays right on your page.')}</span>}
    </div>
  );
}
