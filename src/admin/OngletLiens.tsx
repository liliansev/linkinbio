import type { CSSProperties } from 'react';
import type { TypeBloc } from '../lib/types.ts';
import { TYPES_PRINCIPAL } from '../lib/types.ts';
import { Icone } from '../components/Icone.tsx';
import { Feuille } from './ui.tsx';
import type { Fonction } from '../lib/abonnement.ts';
import { Etiquette, useDroits, useVoirOffres } from './offre.tsx';

export const TYPES: { type: TypeBloc; nom: string; aide: string; picto: string; fonction?: Fonction }[] = [
  { type: 'lien', nom: 'Lien', aide: 'Un bouton vers n’importe quelle adresse', picto: 'bloc-lien' },
  { type: 'titre', nom: 'Titre de section', aide: 'Un intertitre pour regrouper tes liens', picto: 'bloc-titre' },
  { type: 'texte', nom: 'Texte', aide: 'Un court paragraphe', picto: 'bloc-texte' },
  { type: 'video', nom: 'Vidéo YouTube', aide: 'La vidéo s’affiche dans la page', picto: 'bloc-video' },
  { type: 'derniere-video', nom: 'Ma dernière vidéo YouTube', aide: 'Se met à jour toute seule', picto: 'bloc-derniere-video' },
  { type: 'inscription', nom: 'Ma liste d’inscrits', aide: 'Tes visiteurs laissent leur e-mail, que tu exportes ou envoies vers Brevo ou Mailchimp', picto: 'bloc-inscription', fonction: 'listeEmail' },
  { type: 'preuve', nom: 'Avis et preuves', aide: 'Ta note Google, un chiffre clé ou un témoignage, avec sa source', picto: 'bloc-preuve', fonction: 'avis' },
  { type: 'newsletter', nom: 'Ma newsletter Lumail', aide: 'Branchée sur Lumail', picto: 'bloc-newsletter' },
];

export function FeuilleAjout({ ouverte, onFermer, onChoisir, principal }: { ouverte: boolean; onFermer: () => void; onChoisir: (type: TypeBloc) => void; principal: boolean }) {
  const types = principal ? TYPES : TYPES.filter(t => !TYPES_PRINCIPAL.includes(t.type));
  const droits = useDroits();
  const voirOffres = useVoirOffres();
  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Ajouter à ma page">
      {fermer => (
        <>
        <ul className="adm-cascade -mx-2 flex flex-col pb-2">
          {types.map((t, i) => {
            // Un bloc réservé reste dans la liste, avec le nom de son offre : le toucher mène aux offres.
            const reserve = !!t.fonction && !droits[t.fonction];
            return (
            <li key={t.type} style={{ '--i': i } as CSSProperties}>
              <button type="button" disabled={reserve && !voirOffres} onClick={() => fermer(() => (reserve ? voirOffres?.(t.fonction) : onChoisir(t.type)))}
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
