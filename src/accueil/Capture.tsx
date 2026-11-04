/*
 * Les vraies captures du back office (4 novembre 2026, demandé par Lilian : « prends des belles captures »), prises
 * sur le compte de Lilian, sans rien y changer : au bureau à 1440 × 900 (2×), au téléphone à 390 × 844 (3×), puis
 * réduites en WebP à la racine de `public/` (le serveur ne sert pas ses sous-dossiers). Les originaux sont rangés
 * dans les fichiers du projet, `hopla/captures-produit-2026-11-04/`.
 */

export interface Capture {
  /** Le nom du fichier, sans `.webp`. */
  src: string;
  alt: string;
  largeur: number;
  hauteur: number;
}

export const CAPTURE_MA_PAGE: Capture = {
  src: 'capture-ma-page', largeur: 1800, hauteur: 1125,
  alt: 'Le back office de Hopla au bureau : les blocs de la page à gauche, la page elle-même dans un iPhone à droite.',
};
export const CAPTURE_MA_PAGE_TELEPHONE: Capture = {
  src: 'capture-ma-page-telephone', largeur: 600, hauteur: 1298,
  alt: 'Le back office de Hopla au téléphone : on touche sa page pour la modifier.',
};

/** La capture de chaque page de fonction qui a son écran au back office. */
export const CAPTURES_FONCTIONS: Record<string, { texte: string; capture: Capture; telephone?: Capture }> = {
  'selon-le-reseau': {
    texte: 'Ouvre un bloc, puis Visibilité : pour chaque réseau, il s’affiche ou non, et passe en avant ou non. La page à côté suit chaque réglage.',
    capture: {
      src: 'capture-selon-le-reseau', largeur: 1800, hauteur: 1125,
      alt: 'Le réglage « Selon le réseau » d’un bloc : un interrupteur Affiché et un En avant pour Instagram, LinkedIn, TikTok, YouTube, X, Facebook, Threads et Snapchat.',
    },
    telephone: { src: 'capture-selon-le-reseau-telephone', largeur: 600, hauteur: 1298, alt: 'Au téléphone, la feuille Visibilité d’un bloc : Affiché et En avant pour Instagram, LinkedIn, TikTok, YouTube et X.' },
  },
  stats: {
    texte: 'L’onglet Stats commence par une phrase, puis tes vues, tes visiteurs et tes clics, sur 7 jours à 12 mois.',
    capture: {
      src: 'capture-stats', largeur: 1800, hauteur: 900,
      alt: 'L’onglet Stats : « En 30 jours, ta page a eu 88 vues et Instagram t’amène le plus de monde », quatre chiffres et la courbe des vues.',
    },
    telephone: {
      src: 'capture-stats-telephone', largeur: 600, hauteur: 1298,
      alt: 'L’onglet Stats au téléphone : la période d’un toucher, la phrase, les quatre chiffres et la courbe.',
    },
  },
  themes: {
    texte: 'Design, puis Thème : un toucher, et ta page change à côté. Couleurs, police et fond se règlent juste en dessous.',
    capture: {
      src: 'capture-themes', largeur: 1800, hauteur: 1125,
      alt: 'Le choix du thème au back office : les thèmes en vignettes, Bleu Klein choisi, la page dans l’iPhone à droite.',
    },
    telephone: { src: 'capture-themes-telephone', largeur: 600, hauteur: 1298, alt: 'Au téléphone, le choix du thème sous l’aperçu en direct de la page.' },
  },
  'liste-email': {
    texte: 'Dans Intégrations, tu choisis où vont tes inscrits : ta newsletter, Make, Zapier ou n8n. Les autres outils de ta page sont juste en dessous.',
    capture: {
      src: 'capture-liste-email', largeur: 1800, hauteur: 1125,
      alt: 'L’onglet Intégrations : « Où vont tes inscrits », branché à MailCheap, puis les avis, la prise de rendez-vous, Me soutenir et les produits.',
    },
    telephone: { src: 'capture-liste-email-telephone', largeur: 600, hauteur: 1298, alt: 'Au téléphone, l’onglet Intégrations : où vont tes inscrits, puis les outils de ta page.' },
  },
};

/** Une capture du bureau, dans une fenêtre fine ; sous 700 px, l'écran du téléphone la remplace. */
export function Ecran({ capture, telephone }: { capture: Capture; telephone?: Capture }) {
  return (
    <picture className="hl-capture">
      {telephone && <source media="(max-width: 699px)" srcSet={`/${telephone.src}.webp`} width={telephone.largeur} height={telephone.hauteur} />}
      <img src={`/${capture.src}.webp`} alt={capture.alt} width={capture.largeur} height={capture.hauteur} loading="lazy" decoding="async" />
    </picture>
  );
}

/** L'accueil : l'éditeur tel qu'il est, au bureau et au téléphone. */
export function Espace() {
  return (
    <section className="hl-section hp-espace" id="ton-espace" aria-labelledby="titre-espace">
      <div className="hl-tete-section hl-entre">
        <h2 id="titre-espace" className="hl-h2">Ta page,<br /><span className="hl-cache"> </span>à côté de tes réglages</h2>
        <p className="hl-chapo">Au bureau, tu modifies à gauche et ta page suit à droite, dans un vrai iPhone. Au téléphone, tu touches ta page pour la changer.</p>
      </div>
      <div className="hl-entre"><Ecran capture={CAPTURE_MA_PAGE} telephone={CAPTURE_MA_PAGE_TELEPHONE} /></div>
    </section>
  );
}
