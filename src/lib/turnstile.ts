/*
 * Turnstile côté navigateur (la vérification, côté serveur, est dans
 * `server/turnstile.ts`). Le script de Cloudflare ne se charge qu'au moment où
 * l'on se sert d'un formulaire qui en a besoin, et seulement si le serveur a une
 * clé (`/api/turnstile`) ; sans clé, rien ne se charge et les formulaires
 * partent tels quels. En mode « managé », la vérification se fait sans rien
 * montrer ; quand Cloudflare demande un geste, la case apparaît en bas de
 * l'écran. Un jeton ne sert qu'une fois : le suivant se prépare aussitôt.
 */

export type ActionTurnstile = 'connexion' | 'accueil' | 'signalement' | 'liste';

interface Turnstile {
  render(conteneur: HTMLElement, options: Record<string, unknown>): string | null | undefined;
  reset(id: string): void;
}
declare global { interface Window { turnstile?: Turnstile; hoplaTurnstile?: () => void } }

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=hoplaTurnstile';
const ECHEC_CHARGEMENT = 'La vérification anti-robot ne s’est pas chargée. Réessaie dans un instant, ou désactive ton bloqueur de contenus sur cette page.';
const ECHEC_VERIFICATION = 'La vérification anti-robot n’a pas abouti. Réessaie.';

let cle: Promise<string> | undefined;
/** La clé publique du widget, ou '' quand le serveur n'en a pas. */
function lireCle(): Promise<string> {
  if (!cle) {
    cle = fetch('/api/turnstile')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(ECHEC_CHARGEMENT))))
      .then((d: { cle?: unknown }) => (typeof d.cle === 'string' ? d.cle : ''));
    // Une panne de réseau ne se retient pas : la prochaine fois, on redemande.
    cle.catch(() => { cle = undefined; });
  }
  return cle;
}

let script: Promise<Turnstile> | undefined;
function chargerScript(): Promise<Turnstile> {
  script ??= new Promise<Turnstile>((resoudre, rejeter) => {
    if (window.turnstile) { resoudre(window.turnstile); return; }
    window.hoplaTurnstile = () => resoudre(window.turnstile!);
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.onerror = () => { s.remove(); script = undefined; rejeter(new Error(ECHEC_CHARGEMENT)); };
    document.head.append(s);
  });
  return script;
}

/** Une place pour un widget, en bas de l'écran et au-dessus de tout : on ne la voit que si Cloudflare demande un geste. */
function place(): HTMLElement {
  let boite = document.getElementById('hopla-turnstile');
  if (!boite) {
    boite = document.createElement('div');
    boite.id = 'hopla-turnstile';
    boite.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483000';
    document.body.append(boite);
  }
  const p = document.createElement('div');
  boite.append(p);
  return p;
}

interface Attente { ok: (jeton: string) => void; ko: (erreur: Error) => void }
interface Widget { id: string; jeton: string; attente: Attente[] }
const widgets = new Map<ActionTurnstile, Promise<Widget>>();

async function creer(action: ActionTurnstile, sitekey: string): Promise<Widget> {
  const ts = await chargerScript();
  const w: Widget = { id: '', jeton: '', attente: [] };
  const finir = (f: (a: Attente) => void) => { for (const a of w.attente.splice(0)) f(a); };
  const echec = () => { w.jeton = ''; finir(a => a.ko(new Error(ECHEC_VERIFICATION))); };
  const id = ts.render(place(), {
    sitekey, action, appearance: 'interaction-only', 'refresh-expired': 'auto', 'response-field': false,
    callback: (jeton: string) => { w.jeton = jeton; finir(a => a.ok(jeton)); },
    'expired-callback': () => { w.jeton = ''; },
    // Après une erreur, ou une case laissée sans réponse, Cloudflare relance de lui-même la vérification.
    'error-callback': () => { echec(); return true; },
    'timeout-callback': echec,
  });
  if (!id) throw new Error(ECHEC_CHARGEMENT);
  w.id = id;
  return w;
}

async function widget(action: ActionTurnstile): Promise<Widget | null> {
  const sitekey = await lireCle();
  if (!sitekey) return null;
  let w = widgets.get(action);
  if (!w) {
    w = creer(action, sitekey);
    widgets.set(action, w);
    w.catch(() => widgets.delete(action));
  }
  return w;
}

/** Dès qu'on se sert d'un formulaire : le jeton est prêt quand on l'envoie. */
export function preparerTurnstile(action: ActionTurnstile) {
  widget(action).catch(() => {});
}

/**
 * Un jeton neuf pour `action`, ou '' quand Turnstile n'est pas branché. Le délai
 * couvre tout, du chargement du script à la case cochée : un formulaire ne reste
 * jamais suspendu à Cloudflare.
 */
export async function jetonTurnstile(action: ActionTurnstile, delai = 60_000): Promise<string> {
  let minuterie: ReturnType<typeof setTimeout> | undefined;
  const expire = new Promise<never>((_, ko) => { minuterie = setTimeout(() => ko(new Error(ECHEC_VERIFICATION)), delai); });
  expire.catch(() => {});
  try {
    const w = await Promise.race([widget(action), expire]);
    if (!w) return '';
    const jeton = w.jeton || await Promise.race([new Promise<string>((ok, ko) => { w.attente.push({ ok, ko }); }), expire]);
    w.jeton = '';
    window.turnstile?.reset(w.id);
    return jeton;
  } finally { clearTimeout(minuterie); }
}

/** Un formulaire qui part avec son jeton ; si la vérification ne peut pas se faire, la réponse le dit et rien ne part. */
export async function avecJeton<T>(action: ActionTurnstile, envoi: (jeton: string) => Promise<T>): Promise<T | { ok: false; message: string }> {
  let jeton: string;
  try { jeton = await jetonTurnstile(action); } catch (error) { return { ok: false, message: (error as Error).message }; }
  return envoi(jeton);
}
