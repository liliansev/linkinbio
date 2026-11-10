import { createFileRoute } from '@tanstack/react-router';
import { ajouterMedia, compteParId, lireReglages } from '../../server/db.ts';
import { COOKIE_SESSION, compteDeSession, lireCookie } from '../../server/auth.ts';
import { limiteur } from '../../server/limites.ts';
import { MAX_FICHIER, typeFichier } from '../../lib/fichiers.ts';

/** Trente fichiers par heure et par compte : de quoi refaire sa note vocale, pas de quoi remplir le disque. */
const envois = limiteur([30, 3_600_000]);
const refus = (status: number, message: string) => new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });

/*
 * Un PDF ou un son envoyé depuis le back office (blocs Document et Note vocale, 10 novembre 2026) : le corps de la
 * requête est le fichier, 10 Mo au plus (`deploy/server.mjs` ne laisse passer cette taille que pour cette adresse).
 * Son type se lit dans ses octets ; la réponse est son adresse, `/media/<id>.<extension>`.
 */
export const Route = createFileRoute('/api/fichier')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const site = request.headers.get('sec-fetch-site');
        if (site && site !== 'same-origin') return new Response(null, { status: 403 });
        const id = compteDeSession(lireCookie(request.headers.get('cookie'), COOKIE_SESSION));
        const compte = id ? compteParId(id) : undefined;
        if (!compte || compte.statut !== 'actif') return refus(401, 'Connecte-toi pour envoyer un fichier.');
        const en = lireReglages(compte.id).langue === 'en';
        if (envois(compte.id, Date.now())) return refus(429, en ? 'Too many files in an hour. Try again later.' : 'Trop de fichiers en une heure. Réessaie plus tard.');
        const octets = new Uint8Array(await request.arrayBuffer());
        if (octets.length > MAX_FICHIER) return refus(413, en ? 'This file is over 10 MB.' : 'Ce fichier dépasse 10 Mo.');
        const extension = typeFichier(octets);
        if (!extension) return refus(415, en ? 'Only a PDF or an audio file (MP3, M4A, WAV, OGG) goes here.' : 'Seul un PDF ou un son (MP3, M4A, WAV, OGG) se pose ici.');
        try { return refus(200, `/media/${ajouterMedia(compte.id, octets, extension)}.${extension}`); }
        catch { return refus(507, en ? 'No room left for this file: pick a lighter one.' : 'Plus de place pour ce fichier : choisis-en un plus léger.'); }
      },
    },
  },
});
