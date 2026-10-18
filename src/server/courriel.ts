/*
 * L'envoi d'un e-mail par Resend, partagé par la connexion, les signalements et
 * les décisions de modération. Sans clé hors production, le message s'écrit
 * dans la console au lieu de partir.
 */

export type Env = Record<string, string | undefined>;

export interface Courriel { to: string; subject: string; html: string; text: string; replyTo?: string }

/** `connexion@hopla.page` part sous le nom Hopla ; une valeur déjà nommée (`Hopla <...>`) est reprise telle quelle. */
export const expediteur = (env: Env) => {
  const valeur = env.CONTACT_FROM?.trim() || 'connexion@hopla.page';
  return valeur.includes('<') ? valeur : `Hopla <${valeur}>`;
};

/** Vrai si le message est parti (ou, en développement, s'il est écrit dans la console). */
export async function envoyer(env: Env, fetchImpl: typeof fetch, c: Courriel): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    if (env.NODE_ENV === 'production') return false;
    console.log(`[liens] e-mail (dev) à ${c.to} : ${c.subject}\n${c.text}`);
    return true;
  }
  try {
    const reponse = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: expediteur(env), to: [c.to], subject: c.subject, html: c.html, text: c.text, ...(c.replyTo ? { reply_to: c.replyTo } : {}) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!reponse.ok) console.error('[liens] Resend', reponse.status);
    return reponse.ok;
  } catch (error) {
    console.error('[liens] Resend', (error as Error).message);
    return false;
  }
}

/** Le texte d'un utilisateur, sûr dans un e-mail HTML. */
export const echapper = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const bouton = (lien: string, texte: string) => `<p><a href="${lien}" style="display:inline-block;background:#ffb38a;color:#111827;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">${texte}</a></p>`;
export const enveloppe = (contenu: string) => `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#111">${contenu}</div>`;
