import { Symbole } from '../components/Logo.tsx';

/*
 * La marque du back office, la même sur chaque écran : le logo de Hopla, puis
 * son nom. La barre latérale, la connexion, les CGU et le lien de connexion
 * périmé la reprennent telle quelle, à la même taille. Sur le bleu (la barre
 * latérale, les écrans d'entrée), elle passe en blanc, le dessin du logo en bleu.
 */
export function Marque({ className = '', petite = false, surBleu = false }: { className?: string; petite?: boolean; surBleu?: boolean }) {
  // `petite` : dans la barre latérale du bureau, la marque se tient à la hauteur de l'en-tête (22 px), sans prendre la vedette aux sections.
  return (
    <div className={`flex items-center ${surBleu ? 'text-[#fff]' : 'text-white'} ${petite ? 'gap-2' : 'gap-3'} ${className}`}>
      <Symbole className={`${petite ? 'h-[22px] w-[22px]' : 'h-7 w-7'} shrink-0`} dessin={surBleu ? '#292bff' : '#fff'} />
      <span className={`font-semibold leading-none ${petite ? 'text-[15px] tracking-[-0.02em]' : 'text-[23px] tracking-[-0.035em]'}`}>Hopla</span>
    </div>
  );
}
