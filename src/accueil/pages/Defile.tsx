import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { mouvementReduit } from '../mouvement.ts';

/*
 * Une scène qui se joue en défilant (26 octobre 2026, idée de Lilian : « à un
 * moment, l'animation prend toute la page, il scrolle pour descendre, et
 * pendant qu'il scrolle, l'animation se joue »). La section est haute d'un
 * écran par étape ; sa scène reste collée à l'écran pendant qu'on la traverse.
 * `rendu(i, t)` dessine l'étape i, avancée de t (de 0 à 1). Avec moins de
 * mouvement, rien ne colle : chaque étape s'affiche avec sa scène, à la suite.
 */

export interface Etape { titre: string; texte: string }

/** Où en est la section : l'étape, et son avancée de 0 à 1. */
function useAvancee(n: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ i: 0, t: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let image = 0;
    const lire = () => {
      image = 0;
      const r = el.getBoundingClientRect();
      const course = r.height - innerHeight;
      const p = course > 0 ? Math.min(1, Math.max(0, -r.top / course)) : 0;
      const x = Math.min(n - 1e-6, p * n);
      const i = Math.floor(x);
      setPos(a => (a.i === i && Math.abs(a.t - (x - i)) < 0.01 ? a : { i, t: x - i }));
    };
    const f = () => { if (!image) image = requestAnimationFrame(lire); };
    lire();
    addEventListener('scroll', f, { passive: true });
    addEventListener('resize', f);
    return () => { cancelAnimationFrame(image); removeEventListener('scroll', f); removeEventListener('resize', f); };
  }, [n]);
  return [ref, pos] as const;
}

/** La largeur du téléphone : il tient dans l'écran avec sa légende, au téléphone comme au bureau. */
function useLargeur(ratio: number) {
  const [l, setL] = useState(300);
  useEffect(() => {
    const f = () => {
      const bureau = innerWidth >= 1024;
      const place = innerHeight - (bureau ? 150 : 250);
      setL(Math.round(Math.max(200, Math.min(bureau ? 320 : 290, place / ratio))));
    };
    f();
    addEventListener('resize', f);
    return () => removeEventListener('resize', f);
  }, [ratio]);
  return l;
}

export function Defile({ etapes, rendu, titre, ratio = 680 / 390 }: {
  etapes: Etape[]; rendu: (i: number, t: number, largeur: number) => ReactNode; titre: string; ratio?: number;
}) {
  const [ref, { i, t }] = useAvancee(etapes.length);
  const largeur = useLargeur(ratio);
  const [reduit, setReduit] = useState(false);
  useEffect(() => setReduit(mouvementReduit()), []);

  if (reduit) {
    return (
      <section className="hf-defile-plat" aria-label={titre}>
        {etapes.map((e, k) => (
          <div key={e.titre} className="hf-defile-plat-etape">
            <div><span className="hf-num">{k + 1}</span><h3 className="hl-h3">{e.titre}</h3><p>{e.texte}</p></div>
            {rendu(k, 1, largeur)}
          </div>
        ))}
      </section>
    );
  }

  return (
    <section ref={ref} className="hf-defile" style={{ '--n': etapes.length } as CSSProperties} aria-label={titre}>
      <div className="hf-defile-colle">
        <ol className="hf-etapes">
          {etapes.map((e, k) => (
            <li key={e.titre} data-lu={k === i || undefined} data-passe={k < i || undefined} aria-current={k === i ? 'step' : undefined}>
              <span className="hf-num">{k + 1}</span>
              <span><b>{e.titre}</b><span className="hf-etape-texte">{e.texte}</span></span>
            </li>
          ))}
        </ol>
        <div className="hf-scene">
          {rendu(i, t, largeur)}
          <div className="hf-segments" aria-hidden="true">
            {etapes.map((e, k) => <i key={e.titre} style={{ '--plein': k < i ? 1 : k === i ? t : 0 } as CSSProperties} />)}
          </div>
        </div>
        <p className="hf-indice" data-cache={i > 0 || t > 0.15 || undefined} aria-hidden="true">Fais défiler, la scène se joue</p>
      </div>
    </section>
  );
}
