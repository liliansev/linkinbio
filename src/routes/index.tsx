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

const ATOUTS = [
  { picto: 'lienExterne', titre: 'Tes liens s’ouvrent dans l’app', texte: 'Depuis Instagram ou TikTok, YouTube et Spotify s’ouvrent dans leur app, pas dans un navigateur coincé. Tes stats montrent le gain.' },
  { picto: 'boussole', titre: 'Elle s’adapte à d’où l’on vient', texte: 'Ton lien TikTok passe en tête pour qui arrive de TikTok, ta chaîne pour qui vient de YouTube.' },
  { picto: 'horloge', titre: 'Elle change selon le moment', texte: 'Ton agenda le matin en semaine, un compte à rebours avant un lancement.' },
  { picto: 'cadenas', titre: 'Des drops réservés', texte: 'Un lien qui s’ouvre avec un code, ou pour les cinquante premiers seulement.' },
  { picto: 'courrier', titre: 'Ta liste e-mail, sans outil en plus', texte: 'Les inscrits arrivent chez toi, en CSV, ou dans Brevo et Mailchimp.' },
  { picto: 'courbe', titre: 'Tes stats en une phrase', texte: 'Chaque lundi, ce qui a marché, dit simplement. Et ta page parle la langue de tes visiteurs.' },
];

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
        <section className="mt-14 text-left" aria-labelledby="atouts">
          <h2 id="atouts" className="text-center text-[15px] font-semibold text-white/85">Ce que ta page fait toute seule</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {ATOUTS.map(a => (
              <li key={a.titre} className="flex gap-3 rounded-2xl bg-white/[0.04] p-3.5 ring-1 ring-white/[0.06]">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-peche/15 text-peche"><Icone nom={a.picto} taille={20} /></span>
                <span>
                  <span className="block text-[15px] font-medium text-white">{a.titre}</span>
                  <span className="block text-[13.5px] leading-snug text-white/60">{a.texte}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <nav className="mt-16 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] text-white/45" aria-label="Textes légaux">
          <a href="/legal/cgu" className="hover:text-white">Conditions d’utilisation</a>
          <a href="/legal/confidentialite" className="hover:text-white">Confidentialité</a>
          <a href="/legal/mentions-legales" className="hover:text-white">Mentions légales</a>
        </nav>
      </main>
    </div>
  );
}
