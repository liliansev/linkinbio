import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
import type { Api } from '../../lib/types.ts';
import { Admin } from '../../admin/Admin.tsx';
import { Connexion } from '../../admin/Connexion.tsx';
import * as fn from '../../server/fonctions.ts';

export const Route = createFileRoute('/admin/')({
  loader: () => fn.lireAdmin(),
  head: () => ({ meta: [{ title: 'Mes liens · back office' }, { name: 'robots', content: 'noindex, nofollow' }, { name: 'theme-color', content: '#0c121f' }] }),
  component: PageAdmin,
});

function PageAdmin() {
  const acces = Route.useLoaderData();
  const api = useMemo<Api>(() => ({
    charger: () => fn.chargerEtat(),
    enregistrerBloc: bloc => fn.enregistrerBloc({ data: bloc }),
    supprimerBloc: async id => { await fn.supprimerBloc({ data: id }); },
    ordonner: async ids => { await fn.ordonner({ data: ids }); },
    enregistrerReglages: reglages => fn.enregistrerReglages({ data: reglages }),
    envoyerImage: dataUrl => fn.envoyerImage({ data: dataUrl }),
    stats: jours => fn.lireStats({ data: jours }),
    deconnexion: async () => { await fn.deconnecter(); },
  }), []);
  if (!acces.connecte) return <Connexion adresse={acces.adresse} demander={() => fn.demanderLien()} />;
  return <Admin api={api} initial={acces.etat} />;
}
