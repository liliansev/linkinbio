import { Symbole } from '../components/Logo.tsx';

/*
 * La marque du back office, la même sur chaque écran : le logo de Hopla, puis
 * son nom. La barre latérale, la connexion, les CGU et le lien de connexion
 * périmé la reprennent telle quelle, à la même taille.
 */
export function Marque({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 text-white ${className}`}>
      <Symbole className="h-7 w-7 shrink-0" />
      <span className="text-[23px] font-semibold leading-none tracking-[-0.035em]">Hopla</span>
    </div>
  );
}
