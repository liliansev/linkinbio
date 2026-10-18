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
  { type: 'inscription', nom: 'Rejoins ma liste', aide: 'Récolte des e-mails, export, Brevo, Mailchimp', picto: 'bloc-inscription' },
  { type: 'preuve', nom: 'Avis et preuves', aide: 'Ta note Google, un chiffre, un témoignage', picto: 'bloc-preuve' },
  { type: 'newsletter', nom: 'Inscription newsletter', aide: 'Branchée sur Lumail', picto: 'bloc-newsletter' },
];

export function FeuilleAjout({ ouverte, onFermer, onChoisir, principal }: { ouverte: boolean; onFermer: () => void; onChoisir: (type: TypeBloc) => void; principal: boolean }) {
  const types = principal ? TYPES : TYPES.filter(t => !TYPES_PRINCIPAL.includes(t.type));
  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Ajouter un bloc">
      {fermer => (
        <>
        <svg width="0" height="0" className="absolute" aria-hidden="true">
          <linearGradient id="hopla-degrade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffe3d1" />
            <stop offset="0.55" stopColor="#ffb38a" />
            <stop offset="1" stopColor="#ff8a5c" />
          </linearGradient>
        </svg>
        <ul className="adm-cascade -mx-2 flex flex-col pb-2">
          {types.map((t, i) => (
            <li key={t.type} style={{ '--i': i } as CSSProperties}>
              <button type="button" onClick={() => fermer(() => onChoisir(t.type))}
                className="group flex w-full items-center gap-3.5 rounded-2xl px-2 py-2.5 text-left transition duration-150 hover:bg-white/[0.05] active:scale-[0.985] active:bg-white/[0.07]">
                {/* Pas de pastille : le picto plein, en dégradé de pêche, se suffit. */}
                <span className="grid h-12 w-10 shrink-0 place-items-center transition duration-150 group-hover:scale-105">
                  <Icone nom={t.picto} taille={30} className="picto-degrade" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold text-white">{t.nom}</span>
                  <span className="block text-[13.5px] leading-snug text-white/55">{t.aide}</span>
                </span>
                <Icone nom="ui-chevron" taille={18} className="-rotate-90 text-white/30" />
              </button>
            </li>
          ))}
        </ul>
        </>
      )}
    </Feuille>
  );
}
