import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
import type { Api } from '../../lib/types.ts';
import { Admin } from '../../admin/Admin.tsx';
import { Connexion } from '../../admin/Connexion.tsx';
import * as fn from '../../server/fonctions.ts';

export const Route = createFileRoute('/admin/')({
  loader: () => fn.lireAdmin(),
  head: () => ({ meta: [{ title: 'Hopla · back office' }, { name: 'robots', content: 'noindex, nofollow' }, { name: 'theme-color', content: '#0c121f' }] }),
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
    apercuSite: url => fn.apercuSite({ data: url }),
    stats: jours => fn.lireStats({ data: jours }),
    deconnexion: async () => { await fn.deconnecter(); },
    accepterCgu: async () => { await fn.accepterCgu(); },
    supprimerMonCompte: confirmation => fn.supprimerMonCompte({ data: confirmation }),
    urlExport: '/api/export',
    ouvrirPaiement: periode => fn.ouvrirPaiement({ data: periode }),
    ouvrirPortail: () => fn.ouvrirPortail(),
    liste: () => fn.lireListe(),
    brancherListe: i => fn.brancherListe({ data: i }),
    supprimerContact: async id => { await fn.supprimerContact({ data: id }); },
    resynchroniser: () => fn.resynchroniser(),
    urlContacts: '/api/contacts',
    comptes: acces.connecte && acces.etat.compte.principal ? {
      lister: () => fn.listerComptes(),
      inviter: (email, pseudo) => fn.inviterCompte({ data: { email, pseudo } }),
      renvoyer: id => fn.renvoyerInvitation({ data: id }),
      changerStatut: async (id, statut, motif) => { await fn.changerStatutCompte({ data: { id, statut, motif } }); },
      supprimer: async (id, motif) => { await fn.supprimerCompte({ data: { id, motif } }); },
      signalements: () => fn.listerSignalements(),
      traiterSignalement: async (id, statut, decision) => { await fn.traiterSignalement({ data: { id, statut, decision } }); },
    } : undefined,
  }), [acces.connecte]);
  if (!acces.connecte) return <Connexion demander={email => fn.demanderLien({ data: email })} />;
  return <Admin api={api} initial={acces.etat} />;
}
