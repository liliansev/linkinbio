import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';
import type { Api } from '../../lib/types.ts';
import { Admin } from '../../admin/Admin.tsx';
import { Connexion } from '../../admin/Connexion.tsx';
import { COULEUR_NAVIGATEUR } from '../../admin/ui.tsx';
import * as fn from '../../server/fonctions.ts';
import { avecJeton, preparerTurnstile } from '../../lib/turnstile.ts';

export const Route = createFileRoute('/admin/')({
  loader: () => fn.lireAdmin(),
  head: () => ({ meta: [{ title: 'Hopla · back office' }, { name: 'robots', content: 'noindex, nofollow' }, { name: 'theme-color', content: COULEUR_NAVIGATEUR }] }),
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
    apercuSite: (url, image = true) => fn.apercuSite({ data: { url, image } }),
    flux: (url, video) => fn.lireFlux({ data: { url, video } }),
    stats: periode => fn.lireStats({ data: periode }),
    deconnexion: async () => { await fn.deconnecter(); },
    accepterCgu: async () => { await fn.accepterCgu(); },
    supprimerMonCompte: confirmation => fn.supprimerMonCompte({ data: confirmation }),
    urlExport: '/api/export',
    ouvrirPaiement: (plan, periode) => fn.ouvrirPaiement({ data: { plan, periode } }),
    ouvrirPortail: () => fn.ouvrirPortail(),
    resilierAbonnement: () => fn.resilierAbonnement(),
    liste: () => fn.lireListe(),
    listesFournisseur: i => fn.listesFournisseur({ data: i }),
    brancherListe: i => fn.brancherListe({ data: i }),
    supprimerContact: async id => { await fn.supprimerContact({ data: id }); },
    resynchroniser: () => fn.resynchroniser(),
    adresses: () => fn.lireAdresses(),
    urlContacts: '/api/contacts',
    comptes: acces.connecte && acces.etat.compte.principal ? {
      lister: () => fn.listerComptes(),
      offres: () => fn.lireOffresCreem(),
      creerOffres: () => fn.creerOffresCreem(),
      attente: () => fn.listerAttente(),
      inviterAttente: id => fn.inviterAttente({ data: id }),
      retirerAttente: async id => { await fn.retirerAttente({ data: id }); },
      inviter: (email, pseudo) => fn.inviterCompte({ data: { email, pseudo } }),
      renvoyer: id => fn.renvoyerInvitation({ data: id }),
      resilier: (id, mot) => fn.resilierAbonnementCompte({ data: { id, mot } }),
      offrir: (id, plan, duree, mot) => fn.offrirOffreCompte({ data: { id, plan, duree, mot } }),
      retirerOffre: id => fn.retirerOffreCompte({ data: id }),
      changerStatut: async (id, statut, motif) => { await fn.changerStatutCompte({ data: { id, statut, motif } }); },
      supprimer: (id, motif) => fn.supprimerCompte({ data: { id, motif } }),
      signalements: () => fn.listerSignalements(),
      traiterSignalement: async (id, statut, decision) => { await fn.traiterSignalement({ data: { id, statut, decision } }); },
    } : undefined,
  }), [acces.connecte]);
  // Sur la page de connexion, la vérification anti-robot se prépare pendant qu'on tape son adresse.
  useEffect(() => { if (!acces.connecte) preparerTurnstile('connexion'); }, [acces.connecte]);
  if (!acces.connecte) return <Connexion demander={email => avecJeton('connexion', jeton => fn.demanderLien({ data: { email, jeton } }))} />;
  return <Admin api={api} initial={acces.etat} />;
}
