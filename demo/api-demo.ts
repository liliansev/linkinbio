import type { Api, Bloc, CleApi, CompteResume, EtatAdmin, FournisseurListe, IntegrationListe, ListeFournisseur, Reglages, Reservation, SignalementResume, Stats } from '../src/lib/types.ts';
import { estWebhook, nouveauBloc } from '../src/lib/types.ts';
import { ADRESSE_WEBHOOK, LISTE_CHEZ, NOMS_FOURNISSEURS, adresseWebhook } from '../src/lib/integrations.ts';
import { REGLAGES_DEFAUT, blocsDefaut, reglagesNouveauCompte } from '../src/lib/defauts.ts';
import { CONTACT_LEGAL } from '../src/lib/legal.ts';
import type { Droits } from '../src/lib/droits.ts';
import type { Abonnement, Fonction, OffreOfferte, Periode, PlanPayant } from '../src/lib/abonnement.ts';
import type { PeriodeStats } from '../src/lib/periode.ts';
import { ajouterJours, jourDe, joursEntre, longueur, plageDe } from '../src/lib/periode.ts';
import { FONCTIONS, OFFRES, echeance, effetOffert, finOfferte, peut, plusMois, rang } from '../src/lib/abonnement.ts';
import avatar from '../public/avatar.webp?inline';

/*
 * L'aperçu publié en Artifact n'a pas de serveur : cette version de l'API
 * garde tout dans le navigateur (localStorage) et invente des statistiques
 * plausibles. Rien de tout ça n'est dans l'application réelle.
 */

const CLE = 'liens-demo-v3';
const SANS_ABONNEMENT: Abonnement = { plan: 'gratuit', payee: 'gratuit', statut: '', finPeriode: null, periode: null, portail: false, offerte: null };
/** Sans paiement, rien n'est réservé : l'aperçu montre toutes les fonctions (seule la mention reste sans offre). */
const DROITS_APERCU: Droits = { sansMention: false, vitrine: true, couleurs: true, programmation: true, avis: true, stats: true, heure: true, drops: true, listeEmail: true, formulaire: true, galerie: true, utm: true, redirection: true, fond: true, grandePhoto: true, grille: true, pays: true, cadeau: true, flux: true, api: true };
let n = 0;
const id = () => `d${Date.now().toString(36)}${n++}`;

function lire(): { reglages: Reglages; blocs: Bloc[] } {
  try { const v = localStorage.getItem(CLE); if (v) { const e = JSON.parse(v); return { ...e, reglages: { ...REGLAGES_DEFAUT, ...e.reglages } }; } } catch { /* stockage indisponible */ }
  return { reglages: { ...REGLAGES_DEFAUT, profil: { ...REGLAGES_DEFAUT.profil, avatar } }, blocs: blocsDefaut(id) };
}
let etat = lire();
const ecrire = () => { try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch { /* idem */ } };
const pause = () => new Promise(r => setTimeout(r, 180));

// Un générateur pseudo-aléatoire fixe : les mêmes chiffres à chaque visite.
function hasard(graine: number) { return () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647; }; }

/**
 * Deux ans de chiffres inventés, le dernier jour étant aujourd'hui : une période (les derniers jours, ou des
 * dates choisies dans le calendrier) en prend sa part, et la période d'avant la part qui la précède.
 */
function statsFictives(periode: PeriodeStats, blocs: Bloc[] = etat.blocs): Stats {
  const r = hasard(42);
  const serieComplete = Array.from({ length: 730 }, (_, i) => {
    const base = 60 + 40 * Math.sin(i / 9) + i * 0.08;
    const vues = Math.max(5, Math.round(base * (0.7 + r() * 0.6)));
    return { vues, visiteurs: Math.round(vues * (0.7 + r() * 0.08)), clics: Math.round(vues * (0.28 + r() * 0.2)) };
  });
  const aujourdhui = jourDe(Date.now());
  const { du, au } = plageDe(periode, aujourdhui);
  const jours = longueur({ du, au });
  // L'indice du lendemain du dernier jour, dans les deux ans : 730 pour aujourd'hui.
  const fin = 730 - joursEntre(au, aujourdhui);
  const serie = serieComplete.slice(fin - jours, fin).map((s, i) => ({ jour: ajouterJours(du, i), ...s }));
  const avant = serieComplete.slice(Math.max(0, fin - 2 * jours), fin - jours);
  type Cle = 'vues' | 'visiteurs' | 'clics';
  const somme = (l: Record<Cle, number>[], k: Cle) => l.reduce((t, s) => t + s[k], 0);
  const vues = somme(serie, 'vues'), clics = somme(serie, 'clics'), clicsAvant = somme(avant, 'clics'), vuesAvant = somme(avant, 'vues');
  const liens = blocs.filter(b => b.type === 'lien');
  const poids = liens.map((_, i) => 1 / (i + 1.4));
  const total = poids.reduce((a, b) => a + b, 0);
  return {
    jours, plage: typeof periode !== 'number', vues, clics, visiteurs: somme(serie, 'visiteurs'),
    serie,
    blocs: liens.map((b, i) => ({ id: b.id, titre: b.titre || b.url, clics: Math.round((clics * poids[i]) / total), avant: Math.round((clicsAvant * poids[i]) / total) })).sort((a, b) => b.clics - a.clics),
    sources: [['Instagram', 0.38, 0.33], ['LinkedIn', 0.22, 0.24], ['YouTube', 0.18, 0.2], ['Direct', 0.12, 0.13], ['QR code', 0.06, 0.06], ['Google', 0.04, 0.04]]
      .map(([nom, p, q]) => ({ nom: String(nom), vues: Math.round(vues * Number(p)), avant: Math.round(vuesAvant * Number(q)) })),
    apps: { integres: Math.round(clics * 0.46), versApp: Math.round(clics * 0.31), ouverts: Math.round(clics * 0.29) },
    appareils: [{ nom: 'Mobile', vues: Math.round(vues * 0.81) }, { nom: 'Ordinateur', vues: Math.round(vues * 0.16) }, { nom: 'Tablette', vues: Math.round(vues * 0.03) }],
    pays: [['FR', 0.71], ['BE', 0.09], ['CH', 0.06], ['CA', 0.05], ['MA', 0.03], ['', 0.02]].map(([code, part]) => ({ code: code as string, vues: Math.round(vues * (part as number)), avant: Math.round(vues * (part as number) * 0.9) })),
    precedent: { vues: vuesAvant, clics: clicsAvant, visiteurs: somme(avant, 'visiteurs') },
    dejaVue: true,
  };
}

/** Un compte neuf : personne n'a encore vu sa page. */
function statsVides(periode: PeriodeStats): Stats {
  const { du, au } = plageDe(periode, jourDe(Date.now()));
  const jours = longueur({ du, au });
  const serie = Array.from({ length: jours }, (_, i) => ({ jour: ajouterJours(du, i), vues: 0, visiteurs: 0, clics: 0 }));
  return { jours, plage: typeof periode !== 'number', vues: 0, visiteurs: 0, clics: 0, serie, blocs: [], sources: [], appareils: [], pays: [], apps: { integres: 0, versApp: 0, ouverts: 0 }, precedent: { vues: 0, visiteurs: 0, clics: 0 }, dejaVue: false };
}

/* ---- « Rejoins ma liste » : des inscrits inventés, et la liste branchée (Brevo au départ) ---- */

function inscritsDemo() {
  const prenoms = ['Camille', 'Hugo', 'Sarah', 'Léa', 'Malik', 'Inès', 'Tom', 'Jade'];
  return prenoms.map((p, i) => ({ id: `c${i}`, email: `${p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@exemple.fr`, prenom: p, ts: Date.now() - i * 7_200_000, source: ['Instagram', 'TikTok', 'LinkedIn'][i % 3], synchro: 'ok' as const }));
}
// `#liste` : rien de branché, pour jouer le parcours « Où vont tes inscrits ? » (25 octobre 2026).
let integrationDemo: IntegrationListe | null = typeof location !== 'undefined' && location.hash.startsWith('#liste') ? null : { fournisseur: 'brevo', liste: '7', nom: 'Newsletter', cle: '•••• a91f' };
// Les inscrits gardés chez Hopla avant le branchement, qui attendent de partir.
let inscritsEnAttente = 0;
/** Ce que les newsletters répondraient à « tes listes » : de quoi choisir par le nom. */
const LISTES_DEMO: Record<Exclude<FournisseurListe, 'make' | 'zapier' | 'n8n'>, ListeFournisseur[]> = {
  brevo: [{ id: '7', nom: 'Newsletter' }, { id: '12', nom: 'Clients' }, { id: '3', nom: 'Atelier de janvier' }],
  mailchimp: [{ id: 'a1b2c3d4e5', nom: 'Ma newsletter' }, { id: 'f6a7b8c9d0', nom: 'Clients' }],
  kit: [{ id: '7123456', nom: 'Inscription à la newsletter' }, { id: '7123457', nom: 'Guide gratuit' }],
  mailerlite: [{ id: '131072415', nom: 'Newsletter' }, { id: '131072416', nom: 'Clients' }],
  beehiiv: [{ id: 'pub_3f0c2b1e-5d1a-4c7e-9b52-8a6f0e4d2c11', nom: 'Les lettres de Lilian' }],
  systeme: [{ id: '', nom: 'Sans tag' }, { id: '4521', nom: 'Hopla' }, { id: '4522', nom: 'Clients' }],
  mailcheap: [{ id: '', nom: 'Ta newsletter' }],
  loops: [{ id: '', nom: 'Toute ton audience' }, { id: 'cm2k8j4h6g0f8d6s4a2b0z8', nom: 'Newsletter' }],
};

/** Les clés d'API de l'aperçu (Réglages, API et MCP). */
let clesDemo: CleApi[] = [{ id: 'c1', nom: 'Claude', debut: 'hopla_4fQa', ecriture: true, cree: Date.now() - 9 * 86_400_000, utilisee: Date.now() - 3_600_000 }];

export const apiDemo: Api = {
  async charger(): Promise<EtatAdmin> {
    const s = statsFictives(30);
    return { ...etat, clics: Object.fromEntries(s.blocs.map(b => [b.id, b.clics])), places: {}, stockageEphemere: false, cguAJour: true, dejaVue: true, compte: { pseudo: 'lilian', principal: true, email: CONTACT_LEGAL, plan: 'premium' },
      abonnement: { plan: 'premium', payee: 'gratuit', statut: '', finPeriode: null, periode: null, portail: false, offerte: null }, paiement: false, enVente: [], droits: DROITS_APERCU };
  },
  async enregistrerBloc(bloc) {
    await pause();
    const existe = etat.blocs.some(b => b.id === bloc.id);
    etat.blocs = existe ? etat.blocs.map(b => (b.id === bloc.id ? bloc : b)) : [bloc, ...etat.blocs];
    ecrire();
    return bloc;
  },
  async supprimerBloc(i) { await pause(); etat.blocs = etat.blocs.filter(b => b.id !== i); ecrire(); },
  async ordonner(ids) { await pause(); etat.blocs = ids.map(i => etat.blocs.find(b => b.id === i)).filter((b): b is Bloc => !!b); ecrire(); },
  async enregistrerReglages(reglages) { await pause(); etat.reglages = reglages; ecrire(); return reglages; },
  async envoyerImage(dataUrl) { await pause(); return dataUrl; },
  // Dans l'aperçu, pas de serveur pour lire le site : une vignette dessinée en tient lieu. Une boutique donne un produit d'exemple.
  async apercuSite(url, image = true) {
    await pause();
    // Une page qui déclare un prix sans que son adresse le dise (un site d'atelier) : en ligne, le serveur le lit dans ses balises.
    const atelier = /atelier/.test(url);
    if (image === 'partage') return { titre: atelier ? 'Stage de poterie, une journée' : 'Carnet de recettes illustré', description: '', image: photoProduitDemo(), prix: atelier ? '85 €' : '24 €', visuel: 'partage' };
    const description = 'Un aperçu de démonstration : en ligne, le serveur lit la vraie description du site.';
    const vend = atelier ? { titre: 'Stage de poterie, une journée', prix: '85 €' } : { titre: '', prix: '' };
    // La vignette d'un bouton : en ligne, l'image de partage si elle est carrée, sinon le logo du site, comme ici.
    if (image === 'logo' || image === 'vignette') return { ...vend, description, image: logoDemo(url), visuel: 'logo' };
    return { ...vend, description, image: image ? vignetteDemo(url) : null, visuel: image ? 'partage' : undefined };
  },
  // Les flux aussi : des articles d'exemple, datés de ces derniers jours ; une vidéo garde une vignette dessinée.
  async flux(url, video) {
    await pause();
    const jour = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
    if (video) return [{ titre: 'J’automatise ma prospection avec n8n, de A à Z', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', date: jour(2), image: vignetteDemo(url), video: 'dQw4w9WgXcQ' }];
    return [
      { titre: 'Trois automatisations qui m’ont rendu dix heures par semaine', url: `${url.replace(/\/$/, '')}/dix-heures`, date: jour(1), image: '', video: '' },
      { titre: 'Make ou n8n : ce que j’ai appris en un an de projets clients', url: `${url.replace(/\/$/, '')}/make-ou-n8n`, date: jour(6), image: '', video: '' },
      { titre: 'Le tableau de bord que je montre à chaque client', url: `${url.replace(/\/$/, '')}/tableau-de-bord`, date: jour(13), image: '', video: '' },
    ];
  },
  async stats(periode) { await pause(); return statsFictives(periode); },
  async deconnexion() { localStorage.removeItem(CLE); etat = lire(); },
  async accepterCgu() { await pause(); },
  async supprimerMonCompte() { await pause(); return { ok: false, message: 'Le compte principal ne se supprime pas.' }; },
  urlExport: null,
  // Le compte principal n'a pas d'abonnement : l'aperçu n'ouvre jamais de paiement.
  async ouvrirPaiement() { throw new Error('Pas de paiement dans l’aperçu.'); },
  async ouvrirPortail() { throw new Error('Pas de paiement dans l’aperçu.'); },
  async resilierAbonnement() { throw new Error('Pas de paiement dans l’aperçu.'); },
  async liste() {
    await pause();
    return { total: 184, semaine: 23, derniers: inscritsDemo(), integration: integrationDemo, enAttente: integrationDemo ? inscritsEnAttente : 0 };
  },
  async listesFournisseur({ fournisseur, cle }) {
    await pause();
    if (estWebhook(fournisseur)) return { ok: false, message: 'Un webhook n’a pas de liste.', listes: [] };
    if (!cle && integrationDemo?.fournisseur !== fournisseur) return { ok: false, message: 'Colle ta clé d’API.', listes: [] };
    return { ok: true, message: '', listes: LISTES_DEMO[fournisseur] };
  },
  async brancherListe(i) {
    await pause();
    if (!i) { integrationDemo = null; return { ok: true, message: 'Ta liste reste chez Hopla seulement.' }; }
    inscritsEnAttente = 184;
    const nom = NOMS_FOURNISSEURS[i.fournisseur];
    if (estWebhook(i.fournisseur)) {
      const u = adresseWebhook(i.fournisseur, i.cle);
      if (!u) return { ok: false, message: ADRESSE_WEBHOOK[i.fournisseur] };
      integrationDemo = { fournisseur: i.fournisseur, liste: '', nom: u.host, cle: `${u.host}/…${i.cle.replace(/\/+$/, '').slice(-4)}` };
      return { ok: true, message: `Branché sur ${nom}. Dans l’aperçu, rien n’y part pour de vrai.` };
    }
    const choisie = LISTES_DEMO[i.fournisseur].find(l => l.id === i.liste);
    if (!choisie) return { ok: false, message: `Choisis ${LISTE_CHEZ[i.fournisseur].la} où vont tes inscrits.` };
    integrationDemo = { fournisseur: i.fournisseur, liste: i.liste, nom: choisie?.id ? choisie.nom : '', cle: i.cle ? `•••• ${i.cle.slice(-4)}` : integrationDemo?.cle ?? '•••• a91f' };
    return { ok: true, message: `Branché sur ${nom}${choisie?.id ? `, ${LISTE_CHEZ[i.fournisseur].la} « ${choisie.nom} »` : ''}. Dans l’aperçu, rien n’y part pour de vrai.` };
  },
  async supprimerContact() { await pause(); },
  async resynchroniser() { await pause(); const envoyes = inscritsEnAttente; inscritsEnAttente = 0; return { envoyes, erreurs: 0 }; },
  async adresses() { await pause(); return inscritsDemo().map(c => c.email); },
  urlContacts: null,
  cles: {
    async lister() { await pause(); return clesDemo; },
    async creer(nom, ecriture) {
      await pause();
      const infos = { id: `c${Date.now()}`, nom: nom || 'Ma clé', debut: 'hopla_Xq7v', ecriture, cree: Date.now(), utilisee: null };
      clesDemo = [infos, ...clesDemo];
      return { cle: 'hopla_Xq7vK2mPz9TfLw4sRb8nYc1hJd6uAe3G', infos };
    },
    async revoquer(id) { await pause(); clesDemo = clesDemo.filter(c => c.id !== id); },
  },
  comptes: {
    async lister() { await pause(); return comptesDemo; },
    async offres() { await pause(); return []; },
    async creerOffres() { throw new Error('Pas de Creem dans l’aperçu.'); },
    async inviter(email, pseudo) {
      await pause();
      if (comptesDemo.some(c => c.pseudo === pseudo)) return { ok: false, message: 'Ce pseudo est déjà pris.' };
      comptesDemo.splice(1, 0, { id: id(), email, pseudo, statut: 'actif', cree: Date.now(), connexion: null, blocs: 0, vues: 0, principal: false, plan: 'gratuit', abonnement: SANS_ABONNEMENT });
      return { ok: true, message: `Invitation envoyée à ${email} (dans l’aperçu, rien ne part vraiment).` };
    },
    async attente() { await pause(); return attenteDemo; },
    async inviterAttente(i) {
      await pause();
      const k = attenteDemo.findIndex(r => r.id === i);
      if (k < 0) return { ok: false, message: 'Cette réservation n’existe plus.' };
      const [r] = attenteDemo.splice(k, 1);
      comptesDemo.splice(1, 0, { id: id(), email: r.email, pseudo: r.pseudo, statut: 'actif', cree: Date.now(), connexion: null, blocs: 0, vues: 0, principal: false, plan: 'gratuit', abonnement: SANS_ABONNEMENT });
      return { ok: true, message: `Invitation envoyée à ${r.email} (dans l’aperçu, rien ne part vraiment).` };
    },
    async retirerAttente(i) { await pause(); const k = attenteDemo.findIndex(r => r.id === i); if (k >= 0) attenteDemo.splice(k, 1); },
    async renvoyer(i) {
      await pause();
      const c = compteDemo(i);
      return { ok: true, message: c.connexion ? `Lien de connexion envoyé à ${c.email}, valable 24 heures (dans l’aperçu, rien ne part vraiment).` : `Lien envoyé à ${c.email} : il ouvre sa page, pendant 7 jours (dans l’aperçu, rien ne part vraiment).` };
    },
    // Comme Creem : l'offre payée court jusqu'à la fin de la période, puis s'arrête.
    async resilier(i) {
      await pause();
      const c = compteDemo(i);
      if (c.abonnement.payee === 'gratuit') throw new Error(`${c.pseudo} n’a pas d’abonnement à résilier.`);
      c.abonnement = { ...c.abonnement, statut: 'scheduled_cancel' };
      const fin = c.abonnement.finPeriode;
      return { ok: true, message: `L’abonnement ${OFFRES[c.abonnement.payee].nom} de ${c.pseudo} est résilié : il s’arrête ${fin ? `le ${dateLongue(fin)}` : 'à la fin de la période payée'}. Dans l’aperçu, aucun e-mail ne part.` };
    },
    async offrir(i, plan, duree) {
      await pause();
      const c = compteDemo(i);
      const jusqu = finOfferte(Date.now(), duree);
      const effet = effetOffert(c.abonnement, plan, jusqu);
      const avant = c.abonnement.payee;
      if (!effet) throw new Error(`${c.pseudo} paie déjà ${OFFRES[c.abonnement.payee].nom} : offrir ${OFFRES[plan].nom} ne lui donnerait rien de plus.`);
      c.abonnement = { ...c.abonnement, offerte: { plan, jusqu }, plan: rang(plan) > rang(c.abonnement.payee) ? plan : c.abonnement.payee };
      c.plan = c.abonnement.plan;
      const pendant = jusqu ? `jusqu’au ${dateLongue(jusqu)}` : 'sans limite de durée';
      const fin = c.abonnement.finPeriode;
      return { ok: true, message: `${effet === 'maintenant' ? `${c.pseudo} a ${OFFRES[plan].nom}, offert ${pendant}.` : `Après son abonnement, qui s’arrête ${fin ? `le ${dateLongue(fin)}` : 'à la fin de la période payée'}, ${c.pseudo} ${plan === avant ? 'garde' : 'passe en'} ${OFFRES[plan].nom}, offert ${pendant}.`} Dans l’aperçu, aucun e-mail ne part.` };
    },
    async retirerOffre(i) {
      await pause();
      const c = compteDemo(i);
      const offerte = c.abonnement.offerte;
      if (!offerte) throw new Error(`${c.pseudo} n’a pas d’offre offerte.`);
      const dessus = rang(offerte.plan) > rang(c.abonnement.payee);
      c.abonnement = { ...c.abonnement, offerte: null, plan: c.abonnement.payee };
      c.plan = c.abonnement.plan;
      return { ok: true, message: dessus ? `${c.pseudo} n’a plus ${OFFRES[offerte.plan].nom} offert : sa page repasse en ${OFFRES[c.plan].nom}.` : `${c.pseudo} n’a plus ${OFFRES[offerte.plan].nom} offert. Son abonnement ${OFFRES[c.abonnement.payee].nom} ne change pas.` };
    },
    async changerStatut(i, statut) { await pause(); const c = comptesDemo.find(x => x.id === i); if (c) c.statut = statut; },
    // Dans l'aperçu, rien ne part chez Creem : l'abonnement s'arrête avec le compte.
    async supprimer(i) {
      await pause();
      const k = comptesDemo.findIndex(x => x.id === i);
      const paye = k > 0 && comptesDemo[k].abonnement.payee !== 'gratuit';
      if (k > 0) comptesDemo.splice(k, 1);
      return paye ? 'faite' : 'aucune';
    },
    async signalements() { await pause(); return signalementsDemo; },
    async traiterSignalement(i, statut, decision) {
      await pause();
      const s = signalementsDemo.find(x => x.id === i);
      if (s) { s.statut = statut; s.decision = decision; }
      if (s && statut === 'suspendu') { const c = comptesDemo.find(x => x.id === s.compte); if (c) c.statut = 'suspendu'; }
    },
  },
};

/** Des comptes inventés, pour voir l'onglet Comptes dans l'aperçu : un abonnement Pro, une offre offerte, une page jamais ouverte, une suspendue. */
const jour = 86_400_000;
const comptesDemo: CompteResume[] = [
  { id: 'principal', email: CONTACT_LEGAL, pseudo: 'lilian', statut: 'actif', cree: Date.now() - 40 * jour, connexion: Date.now(), blocs: 8, vues: 2140, principal: true, plan: 'premium',
    abonnement: { ...SANS_ABONNEMENT, plan: 'premium' } },
  { id: 'demo1', email: 'camille@exemple.fr', pseudo: 'camille-studio', statut: 'actif', cree: Date.now() - 36 * jour, connexion: Date.now() - jour, blocs: 7, vues: 312, principal: false, plan: 'pro',
    abonnement: { plan: 'pro', payee: 'pro', statut: 'active', finPeriode: Date.now() + 18 * jour, periode: 'mois', portail: true, offerte: null } },
  { id: 'demo4', email: 'ines@exemple.fr', pseudo: 'ines-yoga', statut: 'actif', cree: Date.now() - 20 * jour, connexion: Date.now() - 2 * jour, blocs: 5, vues: 141, principal: false, plan: 'starter',
    abonnement: { ...SANS_ABONNEMENT, plan: 'starter', offerte: { plan: 'starter', jusqu: Date.now() + 41 * jour } } },
  { id: 'demo2', email: 'hugo@exemple.fr', pseudo: 'hugo-podcast', statut: 'actif', cree: Date.now() - 4 * jour, connexion: null, blocs: 0, vues: 0, principal: false, plan: 'gratuit', abonnement: SANS_ABONNEMENT },
  { id: 'demo3', email: 'sarah@exemple.fr', pseudo: 'sarah-coach', statut: 'suspendu', cree: Date.now() - 12 * jour, connexion: Date.now() - 9 * jour, blocs: 4, vues: 58, principal: false, plan: 'gratuit', abonnement: SANS_ABONNEMENT },
];
function compteDemo(i: string): CompteResume {
  const c = comptesDemo.find(x => x.id === i && !x.principal);
  if (!c) throw new Error('Compte introuvable.');
  return c;
}
const dateLongue = (ms: number) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

const attenteDemo: Reservation[] = [
  { id: 'r1', email: 'lea@exemple.fr', pseudo: 'lea-ceramique', ts: Date.now() - 2 * jour },
  { id: 'r2', email: 'tom@exemple.fr', pseudo: 'tom-velo', ts: Date.now() - 5 * 3_600_000 },
];

const signalementsDemo: SignalementResume[] = [
  { id: 's1', compte: 'demo2', pseudo: 'hugo-podcast', motif: 'arnaque', details: 'Le lien « Gagne un iPhone » mène à une fausse page de connexion Instagram.', contact: true, ts: Date.now() - 3 * 3_600_000, statut: 'ouvert', decision: '' },
  { id: 's2', compte: 'demo1', pseudo: 'camille-studio', motif: 'droits', details: 'Une photo de mon portfolio est utilisée sans autorisation en tête de page.', contact: true, ts: Date.now() - 5 * jour, statut: 'sans-suite', decision: 'La photo a été retirée par la personne.' },
];

function vignetteDemo(url: string): string {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 675;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 1200, 675); g.addColorStop(0, '#1c2639'); g.addColorStop(1, '#4a2f3a');
  x.fillStyle = g; x.fillRect(0, 0, 1200, 675);
  x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(80, 80, 1040, 515);
  x.fillStyle = '#ffb38a'; x.fillRect(140, 200, 420, 34); x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(140, 260, 640, 18); x.fillRect(140, 296, 520, 18);
  x.fillStyle = '#ffb38a'; x.beginPath(); x.roundRect(140, 360, 220, 64, 32); x.fill();
  x.fillStyle = '#f4f1ec'; x.font = '600 40px system-ui'; let hote = url; try { hote = new URL(url).hostname.replace(/^www\./, ''); } catch { /* adresse brute */ } x.fillText(hote, 140, 540);
  return c.toDataURL('image/png');
}

/** Le logo d'un site, dessiné : l'initiale de son domaine dans un rond, sur un fond transparent. */
function logoDemo(url: string): string {
  const c = document.createElement('canvas'); c.width = 180; c.height = 180;
  const x = c.getContext('2d')!;
  let hote = url; try { hote = new URL(url).hostname.replace(/^www\./, ''); } catch { /* adresse brute */ }
  x.fillStyle = '#292bff'; x.beginPath(); x.arc(90, 90, 84, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#e3fc96'; x.font = '700 96px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText((hote[0] ?? 'h').toUpperCase(), 90, 96);
  return c.toDataURL('image/png');
}

/** La photo d'un produit, dessinée : un carnet posé sur un fond chaud. */
function photoProduitDemo(): string {
  const c = document.createElement('canvas'); c.width = 800; c.height = 800;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 800, 800); g.addColorStop(0, '#f3dcc8'); g.addColorStop(1, '#d9a98b');
  x.fillStyle = g; x.fillRect(0, 0, 800, 800);
  x.fillStyle = 'rgba(60,30,20,0.18)'; x.beginPath(); x.roundRect(232, 182, 360, 470, 22); x.fill();
  x.fillStyle = '#2f4a3a'; x.beginPath(); x.roundRect(210, 160, 360, 470, 22); x.fill();
  x.fillStyle = '#f4ead8'; x.beginPath(); x.roundRect(262, 250, 256, 120, 12); x.fill();
  x.fillStyle = '#2f4a3a'; x.fillRect(296, 286, 188, 14); x.fillRect(320, 318, 140, 10);
  x.fillStyle = '#e9b44c'; x.fillRect(250, 160, 18, 470);
  return c.toDataURL('image/png');
}

/**
 * La vitrine d'exemple (`#vitrine=<thème>`), pour la planche de captures : un produit en bandeau et un en carte,
 * « Me soutenir » chez PayPal et chez Ko-fi, deux prises de rendez-vous, deux liens partenaires.
 */
let vitrine: Bloc[] | null = null;
export function blocsVitrine(): Bloc[] {
  if (vitrine) return vitrine;
  const b = (type: Bloc['type'], champs: Partial<Bloc>): Bloc => ({ ...nouveauBloc(type, id()), ...champs });
  const photo = photoProduitDemo();
  return vitrine = [
    b('produit', { titre: 'Carnet de recettes illustré', url: 'https://www.etsy.com/fr/listing/123/carnet', prix: '24 €', image: photo }),
    b('produit', { titre: 'Atelier céramique, une journée', url: 'https://atelier-camille.fr/products/journee', prix: 'Dès 89 €', image: photo, vedette: true, description: 'Une journée pour tourner ton premier bol, émail et cuisson compris.' }),
    b('lien', { titre: 'Ma gourde préférée', url: 'https://exemple-gourdes.fr/?ref=camille', partenariat: { mention: 'publicite', code: 'CAMILLE10' } }),
    b('lien', { titre: 'Mon appareil photo', url: 'https://exemple-photo.fr/boitier', partenariat: { mention: 'collaboration', code: '' }, vedette: true, format: 'bandeau', sousTitre: 'Celui de toutes mes vidéos' }),
    b('reservation', { url: 'https://calendly.com/camille/decouverte', sousTitre: 'Un appel de 30 minutes, offert' }),
    b('reservation', { titre: 'Réserver au salon', url: 'https://www.planity.com/salon-camille-75011-paris', vedette: true }),
    b('soutien', { url: 'https://paypal.me/camille', sousTitre: 'Pour m’aider à continuer, si le cœur t’en dit.' }),
    b('soutien', { titre: 'Un café pour la route', url: 'https://ko-fi.com/camille' }),
  ];
}

/** Une photo d'exemple pour la galerie : un aplat dégradé et une forme, dans une teinte. */
function photoDemo(teinte: number, l = 800, h = 1000): string {
  const c = document.createElement('canvas');
  c.width = l; c.height = h;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, l, h);
  g.addColorStop(0, `hsl(${teinte} 45% 72%)`); g.addColorStop(1, `hsl(${teinte + 30} 40% 38%)`);
  x.fillStyle = g; x.fillRect(0, 0, l, h);
  x.fillStyle = `hsl(${teinte + 180} 50% 88% / 0.85)`; x.beginPath(); x.arc(l * 0.62, h * 0.4, l * 0.22, 0, Math.PI * 2); x.fill();
  x.fillStyle = `hsl(${teinte} 30% 22% / 0.6)`; x.fillRect(0, h * 0.72, l, h * 0.28);
  return c.toDataURL('image/jpeg', 0.8);
}

/**
 * Les blocs venus de Linktree (`#blocs=<thème>`, 24 octobre 2026), pour la planche de captures : une vidéo Vimeo et
 * une TikTok, deux lecteurs de musique, une galerie, des questions fréquentes, une carte de visite, une adresse et
 * « Me contacter ».
 */
let linktree: Bloc[] | null = null;
export function blocsLinktree(): Bloc[] {
  if (linktree) return linktree;
  const b = (type: Bloc['type'], champs: Partial<Bloc>): Bloc => ({ ...nouveauBloc(type, id()), ...champs });
  return linktree = [
    b('musique', { titre: 'Mon premier EP, «\u00a0Lueurs\u00a0»', url: 'https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3', image: photoDemo(20, 400, 400) }),
    b('musique', { titre: 'Le podcast de l’atelier', url: 'https://soundcloud.com/camille/episode-12', sousTitre: 'Épisode 12, la cuisson raku', vedette: true }),
    b('galerie', { titre: 'Mes dernières pièces', images: [photoDemo(20), photoDemo(160), photoDemo(220), photoDemo(330)] }),
    b('video', { titre: 'Tourner un bol en cinq minutes', url: 'https://vimeo.com/76979871', image: photoDemo(200, 960, 540) }),
    b('faq', { questions: [
      { question: 'Tu livres où ?', reponse: 'Partout en France, en 48 heures. En Europe, compte une semaine.' },
      { question: 'Les pièces passent au lave-vaisselle ?', reponse: 'Oui, toutes, sauf celles en raku : un coup d’éponge suffit.' },
      { question: 'Tu prends des commandes sur mesure ?', reponse: 'Avec plaisir, écris-moi en dessous.' },
    ] }),
    b('coordonnees', { titre: 'Camille Martin', url: 'https://atelier-camille.fr', adressePostale: '12 rue des Lilas\n75011 Paris',
      coordonnees: { telephone: '06 12 34 56 78', email: 'camille@atelier-camille.fr', societe: 'Atelier Camille', poste: 'Céramiste' } }),
    b('lieu', { titre: 'L’atelier', adressePostale: '12 rue des Lilas\n75011 Paris' }),
    b('lien', { titre: 'Soirée dégustation à l’atelier', url: 'https://cave-des-lilas.fr/degustation', sousTitre: 'Vins nature et céramiques', sensible: true }),
    b('formulaire', { sousTitre: 'Une question, une commande : je réponds sous 48 heures.' }),
    b('video', { titre: 'Les coulisses d’une cuisson', url: 'https://www.tiktok.com/@camille/video/7234567890123456789' }),
  ];
}

/**
 * Le lot 4 (`#flux=<thème>`, 24 octobre 2026), pour la planche de captures : la dernière vidéo d'une chaîne, les
 * derniers articles d'un blog, et une liste e-mail qui offre un cadeau.
 */
let lot4: Bloc[] | null = null;
export function blocsFlux(): Bloc[] {
  if (lot4) return lot4;
  const b = (type: Bloc['type'], champs: Partial<Bloc>): Bloc => ({ ...nouveauBloc(type, id()), ...champs });
  return lot4 = [
    b('derniere-video', { url: 'https://www.youtube.com/@camille' }),
    b('flux', { titre: 'Le journal de l’atelier', url: 'https://atelier-camille.fr/journal/' }),
    b('inscription', { titre: 'La lettre du dimanche', sousTitre: 'Une pièce, une histoire, une fois par semaine.', cadeau: { nom: 'Mon guide pour débuter la céramique', url: 'https://atelier-camille.fr/guide.pdf' } }),
    b('lien', { titre: 'Ma boutique', url: 'https://atelier-camille.fr' }),
  ];
}

/**
 * Le design du lot 3 (`#design=<thème>[,<police>]`, 24 octobre 2026), pour la planche de captures : une photo de fond,
 * la photo de profil en grand, une police choisie, et une collection en grille sous un titre, puis une liste.
 */
let collection: Bloc[] | null = null;
export function blocsCollection(): Bloc[] {
  if (collection) return collection;
  const b = (type: Bloc['type'], champs: Partial<Bloc>): Bloc => ({ ...nouveauBloc(type, id()), ...champs });
  return collection = [
    b('lien', { titre: 'Ma nouvelle collection', url: 'https://atelier-camille.fr/automne', vedette: true, icone: 'etoile' }),
    b('titre', { titre: 'Mes boutiques', disposition: 'grille' }),
    b('lien', { titre: 'Etsy', url: 'https://www.etsy.com/shop/camille', image: photoDemo(20, 400, 400) }),
    b('lien', { titre: 'Ma boutique en ligne', url: 'https://atelier-camille.fr', image: photoDemo(160, 400, 400) }),
    b('lien', { titre: 'Les ateliers du samedi', url: 'https://atelier-camille.fr/ateliers', icone: 'agenda' }),
    b('lien', { titre: 'Cartes cadeaux', url: 'https://atelier-camille.fr/cadeaux', image: photoDemo(330, 400, 400) }),
    b('titre', { titre: 'Me suivre' }),
    b('lien', { titre: 'Ma chaîne YouTube', url: 'https://www.youtube.com/@camille', icone: 'youtube' }),
    b('lien', { titre: 'Ma newsletter du dimanche', url: 'https://camille.substack.com', icone: 'courrier' }),
  ];
}
let fond: string | null = null;
export function fondDemo(): string {
  if (fond) return fond;
  // Une photo floue d'exemple : un dégradé chaud et deux lueurs, comme un atelier au soleil.
  const c = document.createElement('canvas');
  c.width = 1200; c.height = 1600;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 1200, 1600);
  g.addColorStop(0, '#e8a87c'); g.addColorStop(0.5, '#c06c54'); g.addColorStop(1, '#3d5a80');
  x.fillStyle = g; x.fillRect(0, 0, 1200, 1600);
  for (const [cx, cy, r, couleur] of [[300, 400, 520, 'rgba(255,230,180,0.75)'], [950, 1150, 600, 'rgba(120,180,200,0.6)']] as const) {
    const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, couleur); rg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = rg; x.fillRect(0, 0, 1200, 1600);
  }
  return fond = c.toDataURL('image/jpeg', 0.85);
}

export const etatDemo = () => apiDemo.charger();
export const pageDemo = () => ({ reglages: etat.reglages, blocs: etat.blocs, compte: { pseudo: 'lilian', principal: true, plan: 'premium' as const } });

/* ---- L'arrivée d'un nouvel inscrit : un compte vide, ses CGU à accepter ---- */

const CLE_NOUVEAU = 'liens-demo-nouveau-v1';
// Les marques que le back office pose dans le navigateur, effacées quand on recommence.
const MARQUES = ['hopla-premiers-pas', 'hopla-page-partagee', 'hopla-demarrage-masque', 'hopla-vue-ma-page'];
const neuf = () => ({ reglages: reglagesNouveauCompte('camille'), blocs: [] as Bloc[], cgu: false });
function lireNouveau(): ReturnType<typeof neuf> {
  try { const v = localStorage.getItem(CLE_NOUVEAU); if (v) return JSON.parse(v); } catch { /* stockage indisponible */ }
  return neuf();
}
let nouveau = lireNouveau();
const ecrireNouveau = () => { try { localStorage.setItem(CLE_NOUVEAU, JSON.stringify(nouveau)); } catch { /* idem */ } };

export function recommencerNouveau() {
  nouveau = neuf();
  try { localStorage.removeItem(CLE_NOUVEAU); for (const m of MARQUES) localStorage.removeItem(m); } catch { /* idem */ }
  // L'étape où l'on s'était arrêté aussi : on repart de la première question.
  try { sessionStorage.removeItem('hopla-premiers-pas-etape'); } catch { /* idem */ }
}

export const apiNouveau: Api = {
  ...apiDemo,
  async charger(): Promise<EtatAdmin> {
    return { reglages: nouveau.reglages, blocs: nouveau.blocs, clics: {}, places: {}, stockageEphemere: false, cguAJour: nouveau.cgu, dejaVue: false, compte: { pseudo: 'camille', principal: false, email: 'camille@exemple.fr', plan: 'gratuit' },
      abonnement: SANS_ABONNEMENT, paiement: false, enVente: [], droits: DROITS_APERCU };
  },
  async enregistrerBloc(bloc) {
    await pause();
    const existe = nouveau.blocs.some(b => b.id === bloc.id);
    nouveau.blocs = existe ? nouveau.blocs.map(b => (b.id === bloc.id ? bloc : b)) : [bloc, ...nouveau.blocs];
    ecrireNouveau();
    return bloc;
  },
  async supprimerBloc(i) { await pause(); nouveau.blocs = nouveau.blocs.filter(b => b.id !== i); ecrireNouveau(); },
  async ordonner(ids) { await pause(); nouveau.blocs = ids.map(i => nouveau.blocs.find(b => b.id === i)).filter((b): b is Bloc => !!b); ecrireNouveau(); },
  async enregistrerReglages(reglages) { await pause(); nouveau.reglages = reglages; ecrireNouveau(); return reglages; },
  async stats(periode) { await pause(); return statsVides(periode); },
  async liste() { await pause(); return { total: 0, semaine: 0, derniers: [], integration: null, enAttente: 0 }; },
  async deconnexion() { recommencerNouveau(); },
  async accepterCgu() { await pause(); nouveau.cgu = true; ecrireNouveau(); },
  async supprimerMonCompte() { await pause(); return { ok: false, message: 'Pas de suppression dans l’aperçu.' }; },
  comptes: undefined,
};
export const pageNouveau = () => ({ reglages: nouveau.reglages, blocs: nouveau.blocs, compte: { pseudo: 'camille', principal: false, plan: 'gratuit' as const } });

/* ---- Un compte ordinaire en Gratuit, pour voir ce que l'offre réserve, et la prendre (#gratuit) ---- */

const CLE_GRATUIT = 'liens-demo-gratuit-v2';
interface CompteGratuit { reglages: Reglages; blocs: Bloc[]; abonnement: Abonnement; achat?: { plan: PlanPayant; periode: Periode; ts: number } }
function gratuitNeuf(): CompteGratuit {
  const bloc = (titre: string, url: string, icone: string): Bloc => ({ ...nouveauBloc('lien', id()), titre, url, icone });
  return {
    reglages: { ...reglagesNouveauCompte('sarah-coach'), profil: { nom: 'Sarah Martin', bio: 'Coach sportive à Lyon. Séances en salle et en ligne.', avatar: '', badge: false, photo: 'ronde' } },
    blocs: [bloc('Réserver une séance', 'https://exemple.fr/reserver', 'agenda'), bloc('Mes programmes', 'https://exemple.fr/programmes', 'flamme'), bloc('Ma chaîne YouTube', 'https://www.youtube.com/@exemple', 'youtube')],
    abonnement: SANS_ABONNEMENT,
  };
}
let gratuit: CompteGratuit = (() => { try { const v = localStorage.getItem(CLE_GRATUIT); if (v) return { abonnement: SANS_ABONNEMENT, ...JSON.parse(v) } as CompteGratuit; } catch { /* stockage indisponible */ } return gratuitNeuf(); })();
const ecrireGratuit = () => { try { localStorage.setItem(CLE_GRATUIT, JSON.stringify(gratuit)); } catch { /* idem */ } };
const droitsDe = (a: Abonnement) => Object.fromEntries((Object.keys(FONCTIONS) as Fonction[]).map(f => [f, peut(a.plan, f)])) as Droits;

/** `#gratuit=offert` : le même compte, avec Pro offert pour trois mois par-dessus ce qu'il paie. */
const OFFERTE_DEMO: OffreOfferte = { plan: 'pro', jusqu: plusMois(Date.now(), 3) };
function avecOffre(a: Abonnement): Abonnement {
  if (location.hash !== '#gratuit=offert') return a;
  return { ...a, plan: rang(OFFERTE_DEMO.plan) > rang(a.payee) ? OFFERTE_DEMO.plan : a.payee, offerte: OFFERTE_DEMO };
}

/**
 * Le paiement simulé : « Payer » note l'achat et revient aussitôt, comme Creem, sur `?paiement=<offre>`.
 * Le faux webhook passe quatre secondes plus tard : jusque-là, l'abonnement relu n'a pas changé. Sans achat
 * noté (`?paiement=pro#gratuit` tapé à la main), rien n'arrive : on voit l'attente.
 */
function webhookSimule() {
  const a = gratuit.achat;
  if (!a || Date.now() - a.ts < 4000) return;
  gratuit.abonnement = { ...gratuit.abonnement, plan: a.plan, payee: a.plan, statut: 'active', finPeriode: echeance(a.ts, a.periode), periode: a.periode, portail: true };
  delete gratuit.achat;
  ecrireGratuit();
}

export const apiGratuit: Api = {
  ...apiDemo,
  async charger(): Promise<EtatAdmin> {
    webhookSimule();
    const a = avecOffre(gratuit.abonnement);
    return { reglages: gratuit.reglages, blocs: gratuit.blocs, clics: {}, places: {}, stockageEphemere: false, cguAJour: true, dejaVue: true, compte: { pseudo: 'sarah-coach', principal: false, email: 'sarah@exemple.fr', plan: a.plan },
      abonnement: a, paiement: true, enVente: ['starter', 'pro'], droits: droitsDe(a) };
  },
  async ouvrirPaiement(plan, periode) {
    await pause();
    gratuit.achat = { plan, periode, ts: Date.now() };
    ecrireGratuit();
    return `${location.pathname}?paiement=${plan}#gratuit`;
  },
  async ouvrirPortail() { await pause(); throw new Error('Dans l’aperçu, le portail de Creem ne s’ouvre pas : en vrai, ta carte et tes factures sont là-bas.'); },
  // Repasser en Gratuit : comme Creem, l'offre court jusqu'à la fin de la période payée, puis s'arrête.
  async resilierAbonnement() {
    await pause();
    const a = gratuit.abonnement;
    if (a.payee === 'gratuit') throw new Error('Aucun abonnement à résilier.');
    gratuit.abonnement = { ...a, statut: 'scheduled_cancel' };
    ecrireGratuit();
    return avecOffre(gratuit.abonnement);
  },
  async enregistrerBloc(bloc) {
    await pause();
    const existe = gratuit.blocs.some(b => b.id === bloc.id);
    gratuit.blocs = existe ? gratuit.blocs.map(b => (b.id === bloc.id ? bloc : b)) : [bloc, ...gratuit.blocs];
    ecrireGratuit();
    return bloc;
  },
  async supprimerBloc(i) { await pause(); gratuit.blocs = gratuit.blocs.filter(b => b.id !== i); ecrireGratuit(); },
  async ordonner(ids) { await pause(); gratuit.blocs = ids.map(i => gratuit.blocs.find(b => b.id === i)).filter((b): b is Bloc => !!b); ecrireGratuit(); },
  async enregistrerReglages(reglages) { await pause(); gratuit.reglages = reglages; ecrireGratuit(); return reglages; },
  async liste() { await pause(); return { total: 0, semaine: 0, derniers: [], integration: null, enAttente: 0 }; },
  // Une fois l'offre prise, les stats fictives parlent des liens de Sarah.
  async stats(periode) { await pause(); return statsFictives(periode, gratuit.blocs); },
  // Se déconnecter remet le compte d'essai à zéro, abonnement compris : on peut rejouer l'achat.
  async deconnexion() { try { localStorage.removeItem(CLE_GRATUIT); } catch { /* idem */ } gratuit = gratuitNeuf(); },
  async supprimerMonCompte() { await pause(); return { ok: false, message: 'Pas de suppression dans l’aperçu.' }; },
  comptes: undefined,
};
