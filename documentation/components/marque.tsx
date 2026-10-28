/* Le symbole de Hopla (le même dessin que src/components/Logo.tsx) et le nom de la documentation. */
export function Symbole({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="currentColor" />
      <path d="M17 15v34M17 37a10.5 10.5 0 0 1 21 0v12" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <circle cx="47" cy="23" r="4.5" fill="#fff" />
    </svg>
  );
}

export function Marque() {
  return (
    <span className="hd-marque">
      <Symbole className="hd-symbole" />
      <span className="hd-nom">Hopla</span>
      <span className="hd-docs">Docs</span>
    </span>
  );
}
