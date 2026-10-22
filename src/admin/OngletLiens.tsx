import { useId, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Bloc, TypeBloc } from '../lib/types.ts';
import { TYPES_PRINCIPAL } from '../lib/types.ts';
import { adresseSaisie, pourquoiPasAdresse } from '../lib/valider.ts';
import { Icone } from '../components/Icone.tsx';
import { Feuille, classeSaisie } from './ui.tsx';
import type { Fonction } from '../lib/abonnement.ts';
import { Etiquette, useDroits, useVoirOffres } from './offre.tsx';

/**
 * Ce qu'on ajoute à sa page. `modele` : ce qu'un bloc neuf a déjà (un lien
 * partenaire est un lien, avec sa mention) ; `fonction` : l'offre qu'il demande.
 */
export interface TypeAjout { type: TypeBloc; nom: string; aide: string; picto: string; fonction?: Fonction; modele?: Partial<Bloc> }

export const TYPES: TypeAjout[] = [
  { type: 'lien', nom: 'Lien', aide: 'Un bouton vers n’importe quelle adresse', picto: 'bloc-lien' },
  { type: 'lien', nom: 'Lien partenaire', aide: 'Affiliation ou collaboration payée : la mention « Publicité », et ton code promo', picto: 'bloc-partenaire', modele: { partenariat: { mention: 'publicite', code: '' } } },
  { type: 'titre', nom: 'Titre de section', aide: 'Un intertitre pour regrouper tes liens', picto: 'bloc-titre' },
  { type: 'texte', nom: 'Texte', aide: 'Un court paragraphe', picto: 'bloc-texte' },
  { type: 'video', nom: 'Vidéo YouTube', aide: 'La vidéo s’affiche dans la page', picto: 'bloc-video' },
  { type: 'derniere-video', nom: 'Ma dernière vidéo YouTube', aide: 'Se met à jour toute seule', picto: 'bloc-derniere-video' },
  // La vitrine : Hopla n'encaisse rien, chaque bloc mène au site qui vend, réserve ou reçoit.
  { type: 'produit', nom: 'Produit', aide: 'Sa photo et son prix, lus sur ta boutique', picto: 'bloc-produit', fonction: 'vitrine' },
  { type: 'reservation', nom: 'Prise de rendez-vous', aide: 'Ton agenda Calendly, Cal.com ou Planity', picto: 'bloc-reservation', fonction: 'vitrine' },
  { type: 'soutien', nom: 'Me soutenir', aide: 'Un bouton vers PayPal, Ko-fi, Tipeee ou Lydia', picto: 'bloc-soutien', fonction: 'vitrine' },
  { type: 'inscription', nom: 'Ma liste d’inscrits', aide: 'Tes visiteurs laissent leur e-mail, que tu exportes ou envoies vers Brevo ou Mailchimp', picto: 'bloc-inscription', fonction: 'listeEmail' },
  { type: 'preuve', nom: 'Avis et preuves', aide: 'Ta note Google, un chiffre clé ou un témoignage, avec sa source', picto: 'bloc-preuve', fonction: 'avis' },
  { type: 'newsletter', nom: 'Ma newsletter Lumail', aide: 'Branchée sur Lumail', picto: 'bloc-newsletter' },
];

/** L'entrée de la liste qui décrit un bloc : un lien partenaire a la sienne. */
export const typeDe = (b: Pick<Bloc, 'type' | 'partenariat'>): TypeAjout =>
  TYPES.find(t => t.type === b.type && !!t.modele?.partenariat === !!b.partenariat) ?? TYPES.find(t => t.type === b.type)!;

/**
 * Au téléphone, en tête du choix : une adresse collée (ou tapée, puis Entrée)
 * devient un lien d'un coup, son texte lu sur le site. Une saisie qui n'est pas
 * une adresse dit pourquoi.
 */
function CollerAdresse({ ajouter }: { ajouter: (url: string) => void }) {
  const [valeur, setValeur] = useState('');
  const [erreur, setErreur] = useState('');
  const id = useId();
  const poser = (texte: string) => {
    const url = adresseSaisie(texte);
    if (!url) { setErreur(pourquoiPasAdresse(texte)); return; }
    ajouter(url);
  };
  return (
    <div className="pb-2">
      <div className="relative flex items-center">
        <Icone nom="ui-plus" taille={16} className="pointer-events-none absolute left-3.5 text-white/55" />
        <input className={`${classeSaisie} pl-10`} type="url" inputMode="url" enterKeyHint="go" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={valeur}
          placeholder="Colle une adresse" aria-label="Ajouter un lien depuis son adresse" aria-invalid={erreur ? true : undefined} aria-describedby={erreur ? id : undefined}
          onChange={e => { setValeur(e.target.value); if (erreur) setErreur(''); }}
          onPaste={e => {
            if (valeur.trim()) return;
            const texte = e.clipboardData.getData('text');
            if (!adresseSaisie(texte)) return;
            e.preventDefault();
            setValeur(texte);
            poser(texte);
          }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (valeur.trim()) poser(valeur); } }} />
      </div>
      {erreur && <p id={id} role="alert" className="mt-1.5 text-[13px] font-medium leading-snug text-red-300">{erreur}</p>}
    </div>
  );
}

export function FeuilleAjout({ ouverte, onFermer, onChoisir, onColler, principal }: { ouverte: boolean; onFermer: () => void; onChoisir: (type: TypeBloc, modele?: Partial<Bloc>) => void;
  /** Au téléphone : une adresse collée en tête de la liste devient un lien neuf. */
  onColler?: (url: string) => void;
  principal: boolean }) {
  const types = principal ? TYPES : TYPES.filter(t => !TYPES_PRINCIPAL.includes(t.type));
  const droits = useDroits();
  const voirOffres = useVoirOffres();
  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Ajouter à ma page">
      {fermer => (
        <>
        {onColler && <CollerAdresse ajouter={url => fermer(() => onColler(url))} />}
        <ul className="adm-cascade -mx-2 flex flex-col pb-2">
          {types.map((t, i) => {
            // Un bloc réservé reste dans la liste, avec le nom de son offre : le toucher mène aux offres.
            const reserve = !!t.fonction && !droits[t.fonction];
            return (
            <li key={t.nom} style={{ '--i': i } as CSSProperties}>
              <button type="button" disabled={reserve && !voirOffres} onClick={() => fermer(() => (reserve ? voirOffres?.(t.fonction) : onChoisir(t.type, t.modele)))}
                className="group flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-1 text-left transition duration-150 hover:bg-white/[0.05] active:scale-[0.985] active:bg-white/[0.07]">
                {/* Pas de pastille ni d'effet : le picto plein, d'une couleur, se suffit. */}
                <span className="grid h-10 w-9 shrink-0 place-items-center transition duration-150 ">
                  <Icone nom={t.picto} taille={22} className="text-white/80" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-white">{t.nom}</span>
                {reserve && t.fonction ? <Etiquette fonction={t.fonction} /> : <Icone nom="ui-chevron" taille={16} className="-rotate-90 text-white/25" />}
              </button>
            </li>
            );
          })}
        </ul>
        {/* Les raccourcis, dits une fois là où l'on ajoute : sans eux, ils resteraient secrets. */}
        <p className="hidden px-1 pb-1 text-[13px] leading-snug text-white/50 lg:block">Astuce : colle une adresse sur ta page pour ajouter un lien d’un coup, ou appuie sur A pour ouvrir cette liste.</p>
        </>
      )}
    </Feuille>
  );
}
