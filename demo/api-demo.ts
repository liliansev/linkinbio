import type { Api, Bloc, CompteResume, EtatAdmin, Reglages, SignalementResume, Stats } from '../src/lib/types.ts';
import { REGLAGES_DEFAUT, blocsDefaut } from '../src/lib/defauts.ts';
import avatar from '../public/avatar.webp?inline';

/*
 * L'aperçu publié en Artifact n'a pas de serveur : cette version de l'API
 * garde tout dans le navigateur (localStorage) et invente des statistiques
 * plausibles. Rien de tout ça n'est dans l'application réelle.
 */

const CLE = 'liens-demo-v3';
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

function statsFictives(jours: number): Stats {
  const r = hasard(42);
  const serieComplete = Array.from({ length: 730 }, (_, i) => {
    const base = 60 + 40 * Math.sin(i / 9) + i * 0.08;
    const vues = Math.max(5, Math.round(base * (0.7 + r() * 0.6)));
    return { vues, clics: Math.round(vues * (0.28 + r() * 0.2)) };
  });
  const jour = (decalage: number) => new Date(Date.now() - decalage * 86_400_000).toISOString().slice(0, 10);
  const serie = serieComplete.slice(730 - jours).map((s, i) => ({ jour: jour(jours - 1 - i), ...s }));
  const avant = serieComplete.slice(730 - 2 * jours, 730 - jours);
  const somme = (l: { vues: number; clics: number }[], k: 'vues' | 'clics') => l.reduce((t, s) => t + s[k], 0);
  const vues = somme(serie, 'vues'), clics = somme(serie, 'clics');
  const liens = etat.blocs.filter(b => b.type === 'lien');
  const poids = liens.map((_, i) => 1 / (i + 1.4));
  const total = poids.reduce((a, b) => a + b, 0);
  return {
    jours, vues, clics, visiteurs: Math.round(vues * 0.74),
    serie,
    blocs: liens.map((b, i) => ({ id: b.id, titre: b.titre || b.url, clics: Math.round((clics * poids[i]) / total) })).sort((a, b) => b.clics - a.clics),
    sources: [['Instagram', 0.38], ['LinkedIn', 0.22], ['YouTube', 0.18], ['Direct', 0.12], ['QR code', 0.06], ['Google', 0.04]].map(([nom, p]) => ({ nom: String(nom), vues: Math.round(vues * Number(p)) })),
    appareils: [{ nom: 'Mobile', vues: Math.round(vues * 0.81) }, { nom: 'Ordinateur', vues: Math.round(vues * 0.16) }, { nom: 'Tablette', vues: Math.round(vues * 0.03) }],
    precedent: { vues: somme(avant, 'vues'), clics: somme(avant, 'clics'), visiteurs: Math.round(somme(avant, 'vues') * 0.74) },
  };
}

export const apiDemo: Api = {
  async charger(): Promise<EtatAdmin> {
    const s = statsFictives(30);
    return { ...etat, clics: Object.fromEntries(s.blocs.map(b => [b.id, b.clics])), stockageEphemere: false, cguAJour: true, compte: { pseudo: 'lilian', principal: true, email: '' } };
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
  // Dans l'aperçu, pas de serveur pour lire le site : une vignette dessinée en tient lieu.
  async apercuSite(url) { await pause(); return { titre: '', description: 'Un aperçu de démonstration : en ligne, le serveur lit la vraie description du site.', image: vignetteDemo(url) }; },
  async stats(jours) { await pause(); return statsFictives(jours); },
  async deconnexion() { localStorage.removeItem(CLE); etat = lire(); },
  async accepterCgu() { await pause(); },
  async supprimerMonCompte() { await pause(); return { ok: false, message: 'Le compte principal ne se supprime pas.' }; },
  urlExport: null,
  comptes: {
    async lister() { await pause(); return comptesDemo; },
    async inviter(email, pseudo) {
      await pause();
      if (comptesDemo.some(c => c.pseudo === pseudo)) return { ok: false, message: 'Ce pseudo est déjà pris.' };
      comptesDemo.splice(1, 0, { id: id(), email, pseudo, statut: 'actif', cree: Date.now(), connexion: null, blocs: 0, vues: 0, principal: false });
      return { ok: true, message: `Invitation envoyée à ${email} (dans l’aperçu, rien ne part vraiment).` };
    },
    async renvoyer() { await pause(); return { ok: true, message: '' }; },
    async changerStatut(i, statut) { await pause(); const c = comptesDemo.find(x => x.id === i); if (c) c.statut = statut; },
    async supprimer(i) { await pause(); const k = comptesDemo.findIndex(x => x.id === i); if (k > 0) comptesDemo.splice(k, 1); },
    async signalements() { await pause(); return signalementsDemo; },
    async traiterSignalement(i, statut, decision) {
      await pause();
      const s = signalementsDemo.find(x => x.id === i);
      if (s) { s.statut = statut; s.decision = decision; }
      if (s && statut === 'suspendu') { const c = comptesDemo.find(x => x.id === s.compte); if (c) c.statut = 'suspendu'; }
    },
  },
};

/** Des comptes inventés, pour voir l'onglet Comptes dans l'aperçu. */
const jour = 86_400_000;
const comptesDemo: CompteResume[] = [
  { id: 'principal', email: '', pseudo: 'lilian', statut: 'actif', cree: Date.now() - 40 * jour, connexion: Date.now(), blocs: 8, vues: 2140, principal: true },
  { id: 'demo1', email: 'camille@exemple.fr', pseudo: 'camille-studio', statut: 'actif', cree: Date.now() - 6 * jour, connexion: Date.now() - jour, blocs: 7, vues: 312, principal: false },
  { id: 'demo2', email: 'hugo@exemple.fr', pseudo: 'hugo-podcast', statut: 'actif', cree: Date.now() - 4 * jour, connexion: null, blocs: 0, vues: 0, principal: false },
  { id: 'demo3', email: 'sarah@exemple.fr', pseudo: 'sarah-coach', statut: 'suspendu', cree: Date.now() - 12 * jour, connexion: Date.now() - 9 * jour, blocs: 4, vues: 58, principal: false },
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

export const etatDemo = () => apiDemo.charger();
export const pageDemo = () => ({ reglages: etat.reglages, blocs: etat.blocs, compte: { pseudo: 'lilian', principal: true } });
