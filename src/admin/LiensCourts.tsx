import { useEffect, useState } from 'react';
import type { ApiCourts, ComptePage, DomaineCourt, Langue } from '../lib/types.ts';
import { sansSchema } from '../lib/types.ts';
import type { LienCourt } from '../lib/courts.ts';
import { adresseCourte, codeCourt } from '../lib/courts.ts';
import { appDe } from '../lib/ouvrirApp.ts';
import { focusAuto } from '../lib/clavier';
import { BoutonCopier, BoutonPrincipal, BoutonSecondaire, Champ, Feuille, Groupe, Ligne, classeBouton, classeSaisie } from './ui.tsx';
import { useVoirOffres } from './offre.tsx';
import { choix, useLangue } from '../accueil/langue.ts';

/*
 * Liens courts, sous-page de Réglages (10 novembre 2026, lot 2 d'après Taap.it, demandé par Lilian) : des adresses à
 * soi, `hopla.page/<pseudo>/<nom>`, pour une story, un post ou un e-mail. Chacune mène où l'on veut, ouvre YouTube,
 * Spotify ou Instagram dans leur app, compte ses clics, et change de destination sans changer d'adresse.
 */

/** « 12 clics, dont 3 cette semaine » ; rien de compté se dit aussi. */
const clics = (l: LienCourt, langue: Langue) => {
  if (!l.clics) return langue === 'fr' ? 'Aucun clic' : 'No clicks yet';
  const total = langue === 'fr' ? `${l.clics} clic${l.clics > 1 ? 's' : ''}` : `${l.clics} click${l.clics > 1 ? 's' : ''}`;
  return l.semaine ? (langue === 'fr' ? `${total}, dont ${l.semaine} cette semaine` : `${total}, ${l.semaine} this week`) : total;
};

/** La destination en court : son hôte et le début de son chemin. */
const versOu = (url: string) => { try { const u = new URL(url); return `${u.hostname.replace(/^www\./, '')}${u.pathname === '/' ? '' : u.pathname}`.slice(0, 48); } catch { return url; } };

export function LiensCourts({ api, compte, domaine }: { api?: ApiCourts; compte: ComptePage; domaine: DomaineCourt | '' }) {
  const [etat, setEtat] = useState<{ liens: LienCourt[]; max: number } | null>(null);
  const [erreur, setErreur] = useState('');
  // `'neuf'` : un lien à créer ; un lien : celui qu'on modifie.
  const [ouvert, setOuvert] = useState<LienCourt | 'neuf' | null>(null);
  const langue = useLangue();
  const tr = choix(langue);
  const voirOffres = useVoirOffres();

  function charger() {
    if (!api) { setEtat({ liens: [], max: 0 }); return; }
    api.lister().then(setEtat, () => { setEtat({ liens: [], max: 0 }); setErreur(tr('Tes liens courts ne se chargent pas. Réessaie dans un instant.', 'Your short links won’t load. Try again in a moment.')); });
  }
  useEffect(charger, [api]);

  const plein = !!etat && etat.liens.length >= etat.max;
  const base = sansSchema(adresseCourte(compte, '', domaine));

  return (
    <>
      <p className="text-[14px] leading-snug text-white/75">{tr('Une adresse courte pour une story, un post ou un e-mail.', 'A short address for a story, a post or an email.')}</p>

      <Groupe titre={tr('Mes liens courts', 'My short links')} apres={etat && etat.max > 0 ? <span className="text-[13px] tabular-nums text-white/60">{etat.liens.length} / {etat.max}</span> : undefined}>
        {etat === null
          ? <Ligne nom={<span className="text-white/60">{tr('Chargement…', 'Loading…')}</span>} />
          : etat.liens.length === 0
            ? <Ligne nom={tr('Aucun lien court pour l’instant', 'No short links yet')} valeur={tr('Crée le premier : il est prêt à partager tout de suite.', 'Create the first one: it’s ready to share right away.')} />
            : etat.liens.map(l => {
              const adresse = adresseCourte(compte, l.code, domaine);
              return (
                <Ligne key={l.id} nom={l.titre || <span translate="no">{sansSchema(adresse)}</span>}
                  valeur={<>{l.titre && <span translate="no" className="block truncate">{sansSchema(adresse)}</span>}<span className="block truncate" title={l.url}><span className="tabular-nums">{clics(l, langue)}</span> · <span translate="no">{versOu(l.url)}</span></span></>}>
                  <span className="flex shrink-0 items-center gap-1">
                    <BoutonCopier compact texte={adresse} label={tr(`Copier ${sansSchema(adresse)}`, `Copy ${sansSchema(adresse)}`)} />
                    <BoutonSecondaire onClick={() => setOuvert(l)} aria-haspopup="dialog" aria-label={tr(`Modifier le lien court ${l.code}`, `Edit the short link ${l.code}`)}>{tr('Modifier', 'Edit')}</BoutonSecondaire>
                  </span>
                </Ligne>
              );
            })}
      </Groupe>
      {erreur && <p role="alert" className="-mt-3 text-[13.5px] text-red-300">{erreur}</p>}

      {plein && etat.max > 0
        ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-[14px] leading-snug text-white/75">{tr(`Ton offre va jusqu’à ${etat.max} liens courts. Supprimes-en un, ou passe à l’offre du dessus pour en avoir plus.`, `Your plan goes up to ${etat.max} short links. Delete one, or move up a plan to get more.`)}</p>
            {voirOffres && etat.max < 500 && <BoutonPrincipal onClick={() => voirOffres()} aria-haspopup="dialog">{tr('Voir les offres', 'See plans')}</BoutonPrincipal>}
          </div>
        )
        : <div><BoutonPrincipal onClick={() => setOuvert('neuf')} aria-haspopup="dialog" disabled={!api || !etat}>{tr('Créer un lien court', 'Create a short link')}</BoutonPrincipal></div>}

      <Feuille petite ouverte={!!ouvert} onFermer={() => setOuvert(null)} titre={ouvert === 'neuf' ? tr('Nouveau lien court', 'New short link') : tr('Modifier le lien court', 'Edit short link')}>
        {fermer => ouvert && api && (
          <Editeur api={api} lien={ouvert === 'neuf' ? null : ouvert} base={base} fermer={() => fermer()}
            apres={() => { charger(); fermer(); }} />
        )}
      </Feuille>
    </>
  );
}

/** La destination, le nom dans l'adresse, un titre pour s'y retrouver ; et, pour un lien déjà créé, le supprimer. */
function Editeur({ api, lien, base, fermer, apres }: { api: ApiCourts; lien: LienCourt | null; base: string; fermer: () => void; apres: () => void }) {
  const tr = choix(useLangue());
  const [url, setUrl] = useState(lien?.url ?? '');
  const [code, setCode] = useState(lien?.code ?? '');
  const [titre, setTitre] = useState(lien?.titre ?? '');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [suppression, setSuppression] = useState(false);
  const app = appDe(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);

  async function enregistrer() {
    setEnvoi(true); setErreur('');
    try { await api.enregistrer({ ...(lien ? { id: lien.id } : {}), url: url.trim(), code: code.trim(), titre: titre.trim() }); apres(); }
    catch (error) { setErreur((error as Error).message || tr('Le lien ne s’est pas enregistré. Réessaie dans un instant.', 'The link wasn’t saved. Try again in a moment.')); setEnvoi(false); }
  }

  if (suppression && lien) return (
    <div className="flex flex-col gap-4 pb-1">
      <p className="text-[14px] leading-snug text-white/75">{tr(`L’adresse ${base}${lien.code} ne mènera plus nulle part, partout où tu l’as partagée, et ses clics sont effacés.`, `The address ${base}${lien.code} will lead nowhere, everywhere you shared it, and its clicks are erased.`)}</p>
      {erreur && <p role="alert" className="text-[13.5px] text-red-300">{erreur}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => setSuppression(false)} className={classeBouton.discret}>{tr('Annuler', 'Cancel')}</button>
        <button type="button" disabled={envoi} className={classeBouton.danger}
          onClick={async () => { setEnvoi(true); try { await api.supprimer(lien.id); apres(); } catch { setErreur(tr('Le lien ne s’est pas supprimé. Réessaie dans un instant.', 'The link wasn’t deleted. Try again in a moment.')); setEnvoi(false); } }}>
          {envoi ? tr('Suppression…', 'Deleting…') : tr('Supprimer', 'Delete')}
        </button>
      </div>
    </div>
  );

  return (
    <form onSubmit={e => { e.preventDefault(); void enregistrer(); }} className="flex flex-col gap-4 pb-1">
      <Champ label={tr('Mène à', 'Leads to')} aide={app ? tr(`Depuis Instagram ou TikTok, il s’ouvrira dans l’app ${app}.`, `From Instagram or TikTok, it will open in the ${app} app.`) : lien ? tr('Tu peux la changer : l’adresse courte reste la même.', 'You can change it: the short address stays the same.') : undefined}>
        <input className={classeSaisie} value={url} maxLength={2000} inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="https://" onChange={e => { setUrl(e.target.value); setErreur(''); }} autoFocus={focusAuto()} autoComplete="off" required />
      </Champ>
      <Champ label={tr('Son adresse', 'Its address')} aide={!lien ? tr('Laisse vide pour un nom tiré au hasard.', 'Leave empty for a random name.') : code.trim() !== lien.code ? tr('Changer ce nom casse l’adresse déjà partagée.', 'Changing this name breaks the address you already shared.') : undefined}>
        <div className="adm-champ-prefixe">
          <span translate="no" aria-hidden="true">{base}</span>
          <input value={code} maxLength={40} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder={tr('ma-video', 'my-video')}
            onChange={e => { setCode(e.target.value); setErreur(''); }} onBlur={() => setCode(c => (c.trim() ? codeCourt(c) || c : ''))} autoComplete="off" aria-label={tr('Le nom dans l’adresse', 'The name in the address')} />
        </div>
      </Champ>
      <Champ label={tr('Titre', 'Title')} aide={tr('Pour toi seulement, pour le reconnaître dans la liste.', 'For you only, to recognize it in the list.')}>
        <input className={classeSaisie} value={titre} maxLength={80} placeholder={tr('Story du lancement', 'Launch story')} onChange={e => setTitre(e.target.value)} autoComplete="off" />
      </Champ>
      {erreur && <p role="alert" className="text-[13.5px] text-red-300">{erreur}</p>}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {lien && <button type="button" onClick={() => setSuppression(true)} className={`${classeBouton.discret} mr-auto !text-red-300`}>{tr('Supprimer', 'Delete')}</button>}
        <button type="button" onClick={fermer} className={classeBouton.discret}>{tr('Annuler', 'Cancel')}</button>
        <button type="submit" disabled={envoi || !url.trim()} className={classeBouton.principal}>{envoi ? tr('Enregistrement…', 'Saving…') : lien ? tr('Enregistrer', 'Save') : tr('Créer le lien', 'Create the link')}</button>
      </div>
    </form>
  );
}
