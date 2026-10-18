import type { CSSProperties } from 'react';
import type { TypeBloc } from '../lib/types.ts';
import { TYPES_PRINCIPAL } from '../lib/types.ts';
import { Icone } from '../components/Icone.tsx';
import { Feuille } from './ui.tsx';

export const TYPES: { type: TypeBloc; nom: string; aide: string; picto: string }[] = [
  { type: 'lien', nom: 'Lien', aide: 'Un bouton vers n’importe quelle adresse', picto: 'bloc-lien' },
  { type: 'titre', nom: 'Titre de section', aide: 'Pour regrouper les liens', picto: 'bloc-titre' },
  { type: 'texte', nom: 'Texte', aide: 'Un court paragraphe', picto: 'bloc-texte' },
  { type: 'video', nom: 'Vidéo YouTube', aide: 'La vidéo s’affiche dans la page', picto: 'bloc-video' },
  { type: 'derniere-video', nom: 'Ma dernière vidéo', aide: 'Se met à jour toute seule', picto: 'bloc-derniere-video' },
  { type: 'inscription', nom: 'Ma liste d’inscrits', aide: 'Récolte des e-mails, export, Brevo, Mailchimp', picto: 'bloc-inscription' },
  { type: 'preuve', nom: 'Avis et preuves', aide: 'Ta note Google, un chiffre, un témoignage', picto: 'bloc-preuve' },
  { type: 'newsletter', nom: 'Ma newsletter Lumail', aide: 'Branchée sur Lumail', picto: 'bloc-newsletter' },
];

export function FeuilleAjout({ ouverte, onFermer, onChoisir, principal }: { ouverte: boolean; onFermer: () => void; onChoisir: (type: TypeBloc) => void; principal: boolean }) {
  const types = principal ? TYPES : TYPES.filter(t => !TYPES_PRINCIPAL.includes(t.type));
  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Ajouter à ma page">
      {fermer => (
        <>
        <ul className="adm-cascade -mx-2 flex flex-col pb-2">
          {types.map((t, i) => (
            <li key={t.type} style={{ '--i': i } as CSSProperties}>
              <button type="button" onClick={() => fermer(() => onChoisir(t.type))}
                className="group flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-1 text-left transition duration-150 hover:bg-white/[0.05] active:scale-[0.985] active:bg-white/[0.07]">
                {/* Pas de pastille ni d'effet : le picto plein, d'une couleur, se suffit. */}
                <span className="grid h-10 w-9 shrink-0 place-items-center transition duration-150 ">
                  <Icone nom={t.picto} taille={22} className="text-white/80" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-white">{t.nom}</span>
                <Icone nom="ui-chevron" taille={16} className="-rotate-90 text-white/25" />
              </button>
            </li>
          ))}
        </ul>
        </>
      )}
    </Feuille>
  );
}
