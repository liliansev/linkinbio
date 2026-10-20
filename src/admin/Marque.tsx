/*
 * La marque du back office, la même sur chaque écran : le carré noir au lien
 * blanc, puis « Hopla. ». La barre latérale, la connexion, les CGU et le lien
 * de connexion périmé la reprennent telle quelle, à la même taille.
 */
export function Marque({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg viewBox="0 0 256 256" className="h-7 w-7 shrink-0" aria-hidden="true"><rect width="256" height="256" rx="64" fill="#0a0a0a" /><g fill="#ffffff" transform="translate(40 40) scale(0.6875)"><path d="M165.66,90.34a8,8,0,0,1,0,11.32l-64,64a8,8,0,0,1-11.32-11.32l64-64A8,8,0,0,1,165.66,90.34ZM215.6,40.4a56,56,0,0,0-79.2,0L106.34,70.45a8,8,0,0,0,11.32,11.32l30.06-30a40,40,0,0,1,56.57,56.56l-30.07,30.06a8,8,0,0,0,11.31,11.32L215.6,119.6a56,56,0,0,0,0-79.2ZM138.34,174.22l-30.06,30.06a40,40,0,1,1-56.56-56.57l30.05-30.05a8,8,0,0,0-11.32-11.32L40.4,136.4a56,56,0,0,0,79.2,79.2l30.06-30.07a8,8,0,0,0-11.32-11.31Z" /></g></svg>
      <span className="text-[23px] font-semibold leading-none tracking-[-0.035em] text-white">Hopla<span className="text-white/40">.</span></span>
    </div>
  );
}
