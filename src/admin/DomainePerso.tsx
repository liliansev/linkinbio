import { useEffect, useState } from 'react';
import type { ApiDomaine, ComptePage } from '../lib/types.ts';
import { NOM_PUBLIC, cheminPage } from '../lib/types.ts';
import type { EtatDomainePerso } from '../lib/domaines.ts';
import { estRacine, nomChezLeRegistrar } from '../lib/domaines.ts';
import { focusAuto } from '../lib/clavier';
import { BoutonCopier, BoutonPrincipal, Champ, Groupe, Ligne, classeBouton, classeSaisie } from './ui.tsx';
import { choix, useLangue } from '../accueil/langue.ts';

/*
 * Mon nom de domaine, sous-page de Réglages (10 novembre 2026, lot 6 d'après Taap.it, Premium) : `liens.marie.fr`
 * montre la page de Marie. Trois temps : taper le nom, poser un enregistrement chez qui gère le domaine, vérifier.
 * L'adresse sur hopla.page continue de marcher ; `surDomaine` dit à l'écran le nom qui répond, pour l'adresse partagée.
 */

export function DomainePerso({ api, compte, surDomaine }: { api: ApiDomaine; compte: ComptePage; surDomaine: (hote: string) => void }) {
  const tr = choix(useLangue());
  // `undefined` : pas encore lu ; `null` : aucun nom relié.
  const [domaine, setDomaine] = useState<EtatDomainePerso | null | undefined>(undefined);
  const [nom, setNom] = useState('');
  const [envoi, setEnvoi] = useState<'' | 'relier' | 'verifier' | 'retirer'>('');
  const [erreur, setErreur] = useState('');
  const [vu, setVu] = useState(false);
  const [retrait, setRetrait] = useState(false);

  const poser = (d: EtatDomainePerso | null) => { setDomaine(d); surDomaine(d?.etat === 'actif' ? d.hote : ''); };
  useEffect(() => {
    api.lire().then(setDomaine, () => { setDomaine(null); setErreur(tr('Ton nom de domaine ne se charge pas. Réessaie dans un instant.', 'Your domain won’t load. Try again in a moment.')); });
  }, [api]);
  // Le certificat arrive tout seul, en quelques minutes : l'écran le guette, sans qu'on ait à recliquer « Vérifier ».
  const enCertificat = domaine?.etat === 'certificat';
  useEffect(() => {
    if (!enCertificat) return;
    const guet = setInterval(() => { api.verifier().then(d => { if (d) poser(d); }, () => {}); }, 20_000);
    return () => clearInterval(guet);
  }, [api, enCertificat]);

  async function geste(quoi: 'relier' | 'verifier' | 'retirer') {
    setEnvoi(quoi); setErreur(''); setVu(false);
    try {
      if (quoi === 'relier') poser(await api.brancher(nom.trim()));
      else if (quoi === 'verifier') { poser(await api.verifier()); setVu(true); }
      else { await api.retirer(); poser(null); setNom(''); setRetrait(false); }
    } catch (error) { setErreur((error as Error).message || tr('Ça n’a pas marché. Réessaie dans un instant.', 'That didn’t work. Try again in a moment.')); }
    setEnvoi('');
  }

  const intro = (
    <p className="text-[14px] leading-snug text-white/75">
      {tr('Ton adresse ', 'Your address ')}<span translate="no">{NOM_PUBLIC}{cheminPage(compte)}</span>{tr(' marche toujours.', ' keeps working.')}
    </p>
  );

  if (domaine === undefined) return <>{intro}<Groupe titre={tr('Mon nom de domaine', 'My domain')}><Ligne nom={<span className="text-white/60">{tr('Chargement…', 'Loading…')}</span>} /></Groupe></>;

  if (!domaine) return (
    <>
      {intro}
      <form onSubmit={e => { e.preventDefault(); void geste('relier'); }} className="flex flex-col gap-4">
        <Champ label={tr('Ton nom de domaine', 'Your domain name')} aide={tr('Un sous-domaine d’un domaine à toi, comme liens.ton-site.fr. Tu le gardes chez ton registrar.', 'A subdomain of a domain you own, like links.your-site.com. It stays with your registrar.')}>
          <input className={classeSaisie} value={nom} maxLength={253} inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off"
            placeholder={tr('liens.ton-site.fr', 'links.your-site.com')} onChange={e => { setNom(e.target.value); setErreur(''); }} autoFocus={focusAuto()} required />
        </Champ>
        {erreur && <p role="alert" className="text-[13.5px] text-red-300">{erreur}</p>}
        <div><button type="submit" disabled={!!envoi || !nom.trim()} className={classeBouton.principal}>{envoi ? tr('Un instant…', 'One moment…') : tr('Relier ce nom', 'Connect this domain')}</button></div>
      </form>
    </>
  );

  const actif = domaine.etat === 'actif';
  const racine = estRacine(domaine.hote);
  const etat = actif
    ? tr('En ligne : ta page y répond.', 'Live: your page answers there.')
    : domaine.etat === 'certificat'
      ? tr('Enregistrement vu. Le certificat de sécurité arrive, d’ici quelques minutes.', 'Record found. The security certificate is on its way, within a few minutes.')
      : tr('En attente de l’enregistrement ci-dessous.', 'Waiting for the record below.');

  return (
    <>
      {intro}
      <Groupe titre={tr('Mon nom de domaine', 'My domain')}>
        <Ligne nom={<span translate="no">{domaine.hote}</span>} valeur={<span role="status">{etat}</span>}>
          {actif && <BoutonCopier compact texte={`https://${domaine.hote}`} label={tr(`Copier ${domaine.hote}`, `Copy ${domaine.hote}`)} />}
        </Ligne>
      </Groupe>

      {!actif && (
        <Groupe titre={tr('À poser chez qui gère ton domaine', 'To add where your domain is managed')}>
          {racine
            ? <>
              <Ligne nom={tr('Type', 'Type')} valeur="TXT" />
              <Ligne nom={tr('Nom', 'Name')} valeur={<span translate="no">_hopla</span>}><BoutonCopier compact texte="_hopla" label={tr('Copier le nom', 'Copy the name')} /></Ligne>
              <Ligne nom={tr('Valeur', 'Value')} valeur={<span translate="no" className="break-all">{domaine.texte.valeur}</span>}><BoutonCopier compact texte={domaine.texte.valeur} label={tr('Copier la valeur', 'Copy the value')} /></Ligne>
            </>
            : <>
              <Ligne nom={tr('Type', 'Type')} valeur="CNAME" />
              <Ligne nom={tr('Nom', 'Name')} valeur={<span translate="no">{nomChezLeRegistrar(domaine.hote)}</span>}><BoutonCopier compact texte={nomChezLeRegistrar(domaine.hote)} label={tr('Copier le nom', 'Copy the name')} /></Ligne>
              <Ligne nom={tr('Valeur', 'Value')} valeur={<span translate="no" className="break-all">{domaine.cible}</span>}><BoutonCopier compact texte={domaine.cible} label={tr('Copier la valeur', 'Copy the value')} /></Ligne>
            </>}
        </Groupe>
      )}
      {!actif && racine && <p className="-mt-3 text-[13.5px] leading-snug text-white/65">{tr('Un domaine sans sous-domaine se prouve par ce TXT, et doit aussi mener à Hopla : un enregistrement ALIAS ou CNAME aplati vers ', 'A domain without a subdomain is proven with this TXT, and must also lead to Hopla: an ALIAS or flattened CNAME record to ')}<span translate="no">{domaine.cible}</span>{tr('. Plus simple : un sous-domaine, comme liens.', '. Simpler: a subdomain, like links.')}<span translate="no">{domaine.hote}</span>.</p>}

      {vu && !erreur && domaine.etat === 'attente' && <p role="status" className="-mt-3 text-[13.5px] leading-snug text-white/75">{tr('Pas encore visible. Un enregistrement tout juste posé met parfois une heure à se voir : reviens vérifier.', 'Not visible yet. A record you just added can take up to an hour to show: come back and check.')}</p>}
      {erreur && <p role="alert" className="-mt-3 text-[13.5px] text-red-300">{erreur}</p>}

      {retrait
        ? (
          <div className="flex flex-col gap-3">
            <p className="text-[14px] leading-snug text-white/75">{tr(`${domaine.hote} ne montrera plus ta page. Ton adresse sur ${NOM_PUBLIC} ne change pas.`, `${domaine.hote} will no longer show your page. Your address on ${NOM_PUBLIC} doesn’t change.`)}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setRetrait(false)} className={classeBouton.discret}>{tr('Annuler', 'Cancel')}</button>
              <button type="button" disabled={!!envoi} onClick={() => void geste('retirer')} className={classeBouton.danger}>{envoi === 'retirer' ? tr('Retrait…', 'Removing…') : tr('Retirer ce nom', 'Remove this domain')}</button>
            </div>
          </div>
        )
        : (
          <div className="flex flex-wrap items-center gap-2">
            {!actif && <BoutonPrincipal disabled={!!envoi} onClick={() => void geste('verifier')}>{envoi === 'verifier' ? tr('Vérification…', 'Checking…') : tr('Vérifier', 'Check')}</BoutonPrincipal>}
            <button type="button" disabled={!!envoi} onClick={() => setRetrait(true)} className={`${classeBouton.discret} !text-red-300`}>{tr('Retirer ce nom', 'Remove this domain')}</button>
          </div>
        )}
    </>
  );
}
