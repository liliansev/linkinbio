import { createFileRoute } from '@tanstack/react-router';
import { Icone } from '../components/Icone.tsx';

/*
 * hopla.page : l'accueil du service, sobre tant qu'il est en bêta sur
 * invitation. Chaque page vit sur /<pseudo> ; celle de Lilian sert d'exemple.
 */
export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Hopla · une page pour tous tes liens' },
      { name: 'description', content: 'Hopla publie une page qui rassemble tous tes liens, éditable depuis ton téléphone. En bêta, sur invitation.' },
      { name: 'theme-color', content: '#0c121f' },
      { property: 'og:title', content: 'Hopla' },
      { property: 'og:description', content: 'Une page pour tous tes liens. En bêta, sur invitation.' },
    ],
    links: [{ rel: 'canonical', href: 'https://hopla.page/' }],
  }),
  component: Accueil,
});

function Accueil() {
  return (
    <div className="adm grid min-h-dvh place-items-center bg-nuit px-5 font-sans text-white antialiased">
      <main className="w-full max-w-md py-16 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-peche/15 text-peche"><Icone nom="lien" taille={28} /></span>
        <h1 className="mt-5 text-[34px] font-semibold tracking-[-0.025em]">Hopla</h1>
        <p className="mt-3 text-[17px] leading-relaxed text-white/70">Une page pour tous tes liens, que tu modifies depuis ton téléphone.</p>
        <p className="mt-6 inline-flex rounded-full bg-white/[0.07] px-4 py-2 text-[14px] text-white/70">En bêta, sur invitation</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href="/lilian" className="inline-flex min-h-12 items-center rounded-full bg-peche px-6 font-semibold text-nuit">Voir un exemple</a>
          <a href="/admin" className="inline-flex min-h-12 items-center rounded-full bg-white/[0.08] px-6 font-medium text-white hover:bg-white/[0.13]">Se connecter</a>
        </div>
        <nav className="mt-16 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] text-white/45" aria-label="Textes légaux">
          <a href="/legal/cgu" className="hover:text-white">Conditions d’utilisation</a>
          <a href="/legal/confidentialite" className="hover:text-white">Confidentialité</a>
          <a href="/legal/mentions-legales" className="hover:text-white">Mentions légales</a>
        </nav>
      </main>
    </div>
  );
}
