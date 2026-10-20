/*
 * Le logo de Hopla : un « h » dont l'épaule dessine le saut, et la balle qui
 * en rebondit. Le même dessin que public/favicon.svg et les icônes de l'écran
 * d'accueil. Le carré prend la couleur du texte (`currentColor`), la lettre et
 * la balle celle du papier : sur fond blanc, carré noir et dessin blanc.
 */
export function Symbole({ className = '', dessin = '#fff' }: { className?: string; dessin?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="currentColor" />
      <path d="M17 15v34M17 37a10.5 10.5 0 0 1 21 0v12" fill="none" stroke={dessin} strokeWidth="7" strokeLinecap="round" />
      <circle cx="47" cy="23" r="4.5" fill={dessin} />
    </svg>
  );
}
