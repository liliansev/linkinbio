import { createFileRoute, notFound } from '@tanstack/react-router';
import type { NomDocument } from '../../lib/legal.ts';
import { DOCUMENTS, LEGAL } from '../../lib/legal.ts';
import { Pied } from '../../accueil/Fin.tsx';

/* Les textes légaux de Hopla (CGU, accord de traitement, confidentialité, sous-traitants, mentions). */
export const Route = createFileRoute('/legal/$document')({
  loader: ({ params }) => {
    if (!DOCUMENTS.includes(params.document as NomDocument)) throw notFound();
    return params.document as NomDocument;
  },
  head: ({ loaderData }) => ({ meta: loaderData ? [{ title: `${LEGAL[loaderData].titre} · Hopla` }, { name: 'description', content: LEGAL[loaderData].resume }, { name: 'theme-color', content: '#0c121f' }] : [] }),
  component: PageLegale,
});

function PageLegale() {
  const nom = Route.useLoaderData();
  const doc = LEGAL[nom];
  return (
    <div className="adm min-h-dvh bg-nuit font-sans text-white antialiased">
      <main className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
        <a href="/" className="text-[14px] text-white/55 hover:text-white">Hopla</a>
        <h1 className="mt-4 text-[32px] font-semibold leading-tight tracking-[-0.025em]">{doc.titre}</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-white/65">{doc.resume}</p>
        {doc.sections.map(s => (
          <section key={s.titre} className="mt-9">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em]">{s.titre}</h2>
            {s.texte.map((t, i) => <p key={i} className="mt-3 max-w-[66ch] text-[15.5px] leading-[1.7] text-white/75">{t}</p>)}
          </section>
        ))}
        <nav className="mt-14 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[0.08] pt-6 text-[14px]" aria-label="Textes légaux">
          {DOCUMENTS.map(d => (
            <a key={d} href={`/legal/${d}`} aria-current={d === nom ? 'page' : undefined} className={d === nom ? 'text-peche' : 'text-white/55 hover:text-white'}>{LEGAL[d].titre}</a>
          ))}
        </nav>
      </main>
      <div className="hl hl-humain"><Pied /></div>
    </div>
  );
}
