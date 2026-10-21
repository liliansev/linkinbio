import { Symbole } from '../components/Logo.tsx';

/*
 * La marque du back office, la même sur chaque écran : le logo de Hopla, puis
 * son nom. La barre latérale, la connexion, les CGU et le lien de connexion
 * périmé la reprennent telle quelle, à la même taille.
 */
export function Marque({ className = '', petite = false }: { className?: string; petite?: boolean }) {
  // `petite` : dans la barre latérale du bureau, la marque se tient à la hauteur de l'en-tête (22 px), sans prendre la vedette aux sections.
  return (
    <div className={`flex items-center text-white ${petite ? 'gap-2' : 'gap-3'} ${className}`}>
      <Symbole className={`${petite ? 'h-[22px] w-[22px]' : 'h-7 w-7'} shrink-0`} />
      <span className={`font-semibold leading-none ${petite ? 'text-[15px] tracking-[-0.02em]' : 'text-[23px] tracking-[-0.035em]'}`}>Hopla</span>
    </div>
  );
}
