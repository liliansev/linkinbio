/*
 * Vingt thèmes, travaillés un par un (18 octobre 2026, à la demande de Lilian :
 * dix très soignés, un pour chaque goût, puis cinq très créatifs et cinq
 * simples et jolis). Chacun a trois
 * rôles de couleur : un fond, des boutons d'une valeur nette, et un accent
 * d'une autre teinte pour la carte mise en avant, les titres de section et la
 * lueur derrière le portrait. Chacun a aussi sa typographie réglée à la main
 * (taille, graisse, approche du nom, des sections et des boutons), sa matière,
 * et ses boutons conseillés, ombre comprise. Contrastes vérifiés dans
 * `themes.test.ts`. Les styles de bouton se déduisent des couleurs (`page.css`).
 */

import type { Couleurs, FormeBouton, OmbreBouton, StyleBouton } from './types.ts';

export type Police = 'geist' | 'serif' | 'geometrique' | 'expressive' | 'technique' | 'mono' | 'grotesque' | 'condensee' | 'display' | 'elegante' | 'editoriale';
export type Famille = 'sombre' | 'clair' | 'couleur' | 'degrade' | 'premium' | 'decale';
/** Une matière posée sur le fond, sous le contenu (voir `page.css`, `data-decor`). */
export type Decor = 'grain' | 'grille' | 'points' | 'damier' | 'scanlines' | 'etoiles' | 'lave';

/** Un rôle typographique : taille (rem), graisse, approche (em), et l'italique pour les sections. */
interface Role { taille?: number; graisse: number; approche: number; italique?: boolean }

export interface Theme {
  id: string;
  nom: string;
  /** Ce que le thème raconte, en un mot, sous son nom dans le choix. */
  humeur: string;
  famille: Famille;
  /** Une couleur ou un dégradé CSS. */
  fond: string;
  /** La couleur unie la plus proche du fond (barre du navigateur, mélanges). */
  fondUni: string;
  texte: string;
  doux: string;
  /** Le fond des boutons pleins et sa couleur de texte. */
  surface: string;
  surfaceTexte: string;
  /** L'accent : la carte mise en avant, dans tous les styles de bouton. */
  vedette: string;
  vedetteTexte: string;
  /** La teinte des ombres portées : une ombre prend la couleur du fond, jamais un gris. */
  ombre: string;
  police: Police;
  typo: { nom: Role; section: Role; bouton: Role; carte: Role };
  decor?: Decor;
  /** Les boutons qui vont avec : appliqués quand on choisit le thème, modifiables ensuite. */
  conseil: { style: StyleBouton; forme: FormeBouton; ombre: OmbreBouton };
}

/** Une lumière douce en haut de page, sur un fond uni. */
const lueur = (haut: string, bas: string) => `radial-gradient(120% 65% at 50% -8%, ${haut} 0%, ${bas} 62%)`;

export const THEMES: Theme[] = [
  {
    id: 'nuit-peche', nom: 'Nuit et pêche', humeur: 'Sobre', famille: 'sombre',
    fond: lueur('#35283b', '#0c121f'), fondUni: '#0c121f', texte: '#f4f1ec', doux: '#aab2c5',
    surface: '#1b2438', surfaceTexte: '#f4f1ec', vedette: '#ffb38a', vedetteTexte: '#111827', ombre: '#02040a',
    police: 'geist', decor: 'grain',
    typo: { nom: { taille: 1.75, graisse: 640, approche: -0.032 }, section: { taille: 0.9, graisse: 560, approche: 0 }, bouton: { graisse: 580, approche: -0.005 }, carte: { graisse: 650, approche: -0.014 } },
    conseil: { style: 'plein', forme: 'pilule', ombre: 'subtile' },
  },
  {
    id: 'onyx', nom: 'Onyx et or', humeur: 'Luxe', famille: 'premium',
    fond: lueur('#2c261c', '#0b0a08'), fondUni: '#0b0a08', texte: '#f5efe2', doux: '#b8ad97',
    surface: '#29241c', surfaceTexte: '#f5efe2', vedette: '#d9b46a', vedetteTexte: '#16110a', ombre: '#000000',
    police: 'elegante', decor: 'grain',
    typo: { nom: { taille: 2.15, graisse: 440, approche: -0.02 }, section: { taille: 1.02, graisse: 400, approche: 0, italique: true }, bouton: { graisse: 500, approche: 0.005 }, carte: { graisse: 520, approche: -0.01 } },
    conseil: { style: 'plein', forme: 'arrondi', ombre: 'marquee' },
  },
  {
    id: 'champagne', nom: 'Champagne', humeur: 'Éditorial', famille: 'premium',
    fond: '#f3ede2', fondUni: '#f3ede2', texte: '#1c1915', doux: '#665d50',
    surface: '#fffdf9', surfaceTexte: '#1c1915', vedette: '#7a1f2e', vedetteTexte: '#fbf3ea', ombre: '#5a4630',
    police: 'editoriale', decor: 'grain',
    typo: { nom: { taille: 2.5, graisse: 400, approche: -0.012 }, section: { taille: 1.22, graisse: 400, approche: 0, italique: true }, bouton: { graisse: 540, approche: -0.005 }, carte: { taille: 1.3, graisse: 400, approche: 0 } },
    conseil: { style: 'plein', forme: 'arrondi', ombre: 'subtile' },
  },
  {
    id: 'neige', nom: 'Neige', humeur: 'Minimal', famille: 'clair',
    fond: lueur('#ffffff', '#eef1f5'), fondUni: '#eef1f5', texte: '#0e1116', doux: '#565d69',
    surface: '#ffffff', surfaceTexte: '#0e1116', vedette: '#2b4dff', vedetteTexte: '#ffffff', ombre: '#1b2a4a',
    police: 'geist',
    typo: { nom: { taille: 1.8, graisse: 700, approche: -0.04 }, section: { taille: 0.86, graisse: 600, approche: -0.005 }, bouton: { graisse: 600, approche: -0.012 }, carte: { graisse: 680, approche: -0.02 } },
    conseil: { style: 'plein', forme: 'pilule', ombre: 'marquee' },
  },
  {
    id: 'foret', nom: 'Forêt', humeur: 'Nature', famille: 'sombre',
    fond: lueur('#1e4a36', '#0b1a13'), fondUni: '#0b1a13', texte: '#eef4ec', doux: '#a3bdaa',
    surface: '#efe6d2', surfaceTexte: '#0b1a13', vedette: '#f0a64a', vedetteTexte: '#1a0f00', ombre: '#000000',
    police: 'serif', decor: 'grain',
    typo: { nom: { taille: 2.2, graisse: 520, approche: -0.015 }, section: { taille: 1.1, graisse: 450, approche: 0, italique: true }, bouton: { graisse: 560, approche: 0 }, carte: { taille: 1.12, graisse: 600, approche: -0.005 } },
    conseil: { style: 'plein', forme: 'arrondi', ombre: 'subtile' },
  },
  {
    id: 'klein', nom: 'Bleu Klein', humeur: 'Graphique', famille: 'couleur',
    fond: '#1f35ff', fondUni: '#1f35ff', texte: '#ffffff', doux: '#dde2ff',
    surface: '#ffffff', surfaceTexte: '#1f35ff', vedette: '#ffd400', vedetteTexte: '#111111', ombre: '#050c5c',
    police: 'grotesque', decor: 'grain',
    typo: { nom: { taille: 2.05, graisse: 800, approche: -0.04 }, section: { taille: 0.96, graisse: 700, approche: -0.01 }, bouton: { graisse: 680, approche: -0.015 }, carte: { graisse: 760, approche: -0.025 } },
    conseil: { style: 'plein', forme: 'pilule', ombre: 'marquee' },
  },
  {
    id: 'brutal', nom: 'Brutaliste', humeur: 'Brut', famille: 'decale',
    fond: '#f1eee3', fondUni: '#f1eee3', texte: '#0a0a0a', doux: '#46443d',
    surface: '#ffe14d', surfaceTexte: '#0a0a0a', vedette: '#ff4fd8', vedetteTexte: '#0a0a0a', ombre: '#0a0a0a',
    police: 'condensee', decor: 'grille',
    typo: { nom: { taille: 2.75, graisse: 800, approche: -0.02 }, section: { taille: 1.05, graisse: 760, approche: 0.005 }, bouton: { graisse: 720, approche: 0.01 }, carte: { taille: 1.2, graisse: 800, approche: -0.005 } },
    conseil: { style: 'relief', forme: 'carre', ombre: 'aucune' },
  },
  {
    id: 'aurore', nom: 'Aurore', humeur: 'Lumineux', famille: 'degrade',
    fond: 'linear-gradient(165deg, #1a1033 0%, #4b1d6b 50%, #a8445e 100%)', fondUni: '#3a1758', texte: '#ffffff', doux: '#f0dcf6',
    surface: '#ffffff', surfaceTexte: '#2a0f3d', vedette: '#ffd27a', vedetteTexte: '#2a0f3d', ombre: '#12051f',
    police: 'geist', decor: 'grain',
    typo: { nom: { taille: 2.1, graisse: 340, approche: -0.035 }, section: { taille: 0.92, graisse: 500, approche: 0.005 }, bouton: { graisse: 540, approche: -0.005 }, carte: { graisse: 600, approche: -0.015 } },
    conseil: { style: 'verre', forme: 'pilule', ombre: 'subtile' },
  },
  {
    id: 'coucher', nom: 'Couchant', humeur: 'Pop', famille: 'degrade',
    fond: 'linear-gradient(170deg, #ffc49e 0%, #ff8fa6 55%, #c7a2f0 100%)', fondUni: '#ff9fa8', texte: '#1c0b1f', doux: '#44263f',
    surface: '#ffffff', surfaceTexte: '#1c0b1f', vedette: '#1c0b1f', vedetteTexte: '#ffffff', ombre: '#7a2e4a',
    police: 'geometrique', decor: 'grain',
    typo: { nom: { taille: 2.15, graisse: 600, approche: -0.035 }, section: { taille: 0.98, graisse: 560, approche: -0.005 }, bouton: { graisse: 540, approche: -0.01 }, carte: { graisse: 620, approche: -0.02 } },
    conseil: { style: 'plein', forme: 'pilule', ombre: 'marquee' },
  },
  {
    id: 'arcade', nom: 'Arcade', humeur: 'Néon', famille: 'decale',
    fond: '#0d0221', fondUni: '#0d0221', texte: '#f8f4ff', doux: '#b7a6e0',
    surface: '#ff2a6d', surfaceTexte: '#0d0221', vedette: '#05d9e8', vedetteTexte: '#0d0221', ombre: '#000000',
    police: 'display', decor: 'scanlines',
    typo: { nom: { taille: 1.55, graisse: 700, approche: -0.01 }, section: { taille: 0.8, graisse: 600, approche: 0.04 }, bouton: { graisse: 600, approche: 0.005 }, carte: { taille: 0.86, graisse: 600, approche: -0.01 } },
    conseil: { style: 'relief', forme: 'carre', ombre: 'aucune' },
  },
  // Cinq thèmes très créatifs (18 octobre 2026, au soir).
  {
    id: 'bauhaus', nom: 'Bauhaus', humeur: 'Géométrique', famille: 'decale',
    fond: '#f2ead8', fondUni: '#f2ead8', texte: '#141414', doux: '#4a463d',
    surface: '#b8281b', surfaceTexte: '#ffffff', vedette: '#1f4fd1', vedetteTexte: '#ffffff', ombre: '#141414',
    police: 'geometrique', decor: 'grain',
    typo: { nom: { taille: 2.6, graisse: 800, approche: -0.045 }, section: { taille: 1, graisse: 700, approche: -0.01 }, bouton: { graisse: 650, approche: -0.01 }, carte: { taille: 1.15, graisse: 780, approche: -0.03 } },
    conseil: { style: 'plein', forme: 'carre', ombre: 'marquee' },
  },
  {
    id: 'riso', nom: 'Risographie', humeur: 'Imprimé', famille: 'decale',
    fond: '#f6efe3', fondUni: '#f6efe3', texte: '#1a2b8c', doux: '#46519a',
    surface: '#ff6fae', surfaceTexte: '#16236e', vedette: '#1a2b8c', vedetteTexte: '#fff3e8', ombre: '#1a2b8c',
    police: 'expressive', decor: 'grain',
    typo: { nom: { taille: 2.05, graisse: 620, approche: -0.035 }, section: { taille: 0.98, graisse: 600, approche: -0.01 }, bouton: { graisse: 600, approche: -0.01 }, carte: { taille: 1.02, graisse: 640, approche: -0.025 } },
    conseil: { style: 'relief', forme: 'arrondi', ombre: 'aucune' },
  },
  {
    id: 'galaxie', nom: 'Galaxie', humeur: 'Cosmique', famille: 'degrade',
    fond: 'radial-gradient(130% 80% at 50% 0%, #2a1660 0%, #0f0c33 45%, #05061a 100%)', fondUni: '#0f0c33', texte: '#f4f2ff', doux: '#b9b3e6',
    surface: '#231a5c', surfaceTexte: '#f4f2ff', vedette: '#7cf5c8', vedetteTexte: '#05061a', ombre: '#000000',
    police: 'expressive', decor: 'etoiles',
    typo: { nom: { taille: 1.95, graisse: 600, approche: -0.03 }, section: { taille: 0.92, graisse: 560, approche: 0.01 }, bouton: { graisse: 540, approche: -0.005 }, carte: { graisse: 600, approche: -0.02 } },
    conseil: { style: 'verre', forme: 'pilule', ombre: 'subtile' },
  },
  {
    id: 'lampe', nom: 'Lampe à lave', humeur: 'Psyché', famille: 'degrade',
    fond: 'linear-gradient(180deg, #2b0a3d 0%, #4a0f3a 100%)', fondUni: '#3a0c3c', texte: '#fff1e6', doux: '#f0c3d6',
    surface: '#fff1e6', surfaceTexte: '#3a0c3c', vedette: '#ff8a1f', vedetteTexte: '#2b0a00', ombre: '#12020f',
    police: 'elegante', decor: 'lave',
    typo: { nom: { taille: 2.4, graisse: 600, approche: -0.025 }, section: { taille: 1.05, graisse: 500, approche: 0, italique: true }, bouton: { graisse: 560, approche: 0 }, carte: { taille: 1.12, graisse: 620, approche: -0.01 } },
    conseil: { style: 'plein', forme: 'pilule', ombre: 'marquee' },
  },
  {
    id: 'skate', nom: 'Skate', humeur: 'Rétro', famille: 'decale',
    fond: '#151515', fondUni: '#151515', texte: '#f5f3ea', doux: '#b5b2a6',
    surface: '#e4ff3a', surfaceTexte: '#151515', vedette: '#ff4f7b', vedetteTexte: '#151515', ombre: '#000000',
    police: 'technique', decor: 'damier',
    typo: { nom: { taille: 2.3, graisse: 700, approche: -0.04 }, section: { taille: 0.9, graisse: 650, approche: 0.03 }, bouton: { graisse: 620, approche: -0.005 }, carte: { taille: 1.1, graisse: 700, approche: -0.02 } },
    conseil: { style: 'relief', forme: 'carre', ombre: 'aucune' },
  },
  // Cinq thèmes simples et jolis.
  {
    id: 'sauge', nom: 'Sauge', humeur: 'Doux', famille: 'clair',
    fond: lueur('#f4f6f0', '#e3e9de'), fondUni: '#e3e9de', texte: '#1d2a22', doux: '#4c5c51',
    surface: '#ffffff', surfaceTexte: '#1d2a22', vedette: '#b5502c', vedetteTexte: '#ffffff', ombre: '#2e4a37',
    police: 'geometrique',
    typo: { nom: { taille: 1.9, graisse: 560, approche: -0.03 }, section: { taille: 0.92, graisse: 540, approche: 0 }, bouton: { graisse: 520, approche: -0.005 }, carte: { graisse: 600, approche: -0.015 } },
    conseil: { style: 'plein', forme: 'pilule', ombre: 'subtile' },
  },
  {
    id: 'lin', nom: 'Lin', humeur: 'Chaleureux', famille: 'clair',
    fond: '#f4ece1', fondUni: '#f4ece1', texte: '#2b2118', doux: '#6a5a4a',
    surface: '#2b2118', surfaceTexte: '#f8f1e7', vedette: '#c8693f', vedetteTexte: '#1f0e04', ombre: '#5a4630',
    police: 'serif',
    typo: { nom: { taille: 2.25, graisse: 500, approche: -0.015 }, section: { taille: 1.1, graisse: 450, approche: 0, italique: true }, bouton: { graisse: 520, approche: 0 }, carte: { taille: 1.12, graisse: 560, approche: -0.005 } },
    conseil: { style: 'plein', forme: 'arrondi', ombre: 'aucune' },
  },
  {
    id: 'lilas', nom: 'Lilas', humeur: 'Frais', famille: 'clair',
    fond: lueur('#f7f3fd', '#e9e2f6'), fondUni: '#e9e2f6', texte: '#231a3a', doux: '#584d70',
    surface: '#ffffff', surfaceTexte: '#231a3a', vedette: '#23704f', vedetteTexte: '#ffffff', ombre: '#3b2a66',
    police: 'geometrique',
    typo: { nom: { taille: 1.95, graisse: 600, approche: -0.035 }, section: { taille: 0.92, graisse: 560, approche: 0 }, bouton: { graisse: 540, approche: -0.01 }, carte: { graisse: 620, approche: -0.02 } },
    conseil: { style: 'plein', forme: 'pilule', ombre: 'marquee' },
  },
  {
    id: 'marine', nom: 'Marine', humeur: 'Net', famille: 'sombre',
    fond: lueur('#1d3a5c', '#0b1626'), fondUni: '#0b1626', texte: '#f2f5f9', doux: '#a7b6ca',
    surface: '#f2f5f9', surfaceTexte: '#0b1626', vedette: '#ff8a5c', vedetteTexte: '#0b1626', ombre: '#000000',
    police: 'geist',
    typo: { nom: { taille: 1.85, graisse: 620, approche: -0.035 }, section: { taille: 0.88, graisse: 560, approche: 0 }, bouton: { graisse: 560, approche: -0.01 }, carte: { graisse: 640, approche: -0.02 } },
    conseil: { style: 'plein', forme: 'arrondi', ombre: 'subtile' },
  },
  {
    id: 'argile', nom: 'Argile', humeur: 'Terre', famille: 'couleur',
    fond: lueur('#b4532f', '#9a4224'), fondUni: '#9a4224', texte: '#fff7ef', doux: '#ffe0cc',
    surface: '#fff7ef', surfaceTexte: '#5e2210', vedette: '#173b33', vedetteTexte: '#fff7ef', ombre: '#4a1606',
    police: 'serif', decor: 'grain',
    typo: { nom: { taille: 2.25, graisse: 520, approche: -0.015 }, section: { taille: 1.08, graisse: 450, approche: 0, italique: true }, bouton: { graisse: 540, approche: 0 }, carte: { taille: 1.12, graisse: 600, approche: -0.005 } },
    conseil: { style: 'plein', forme: 'pilule', ombre: 'subtile' },
  },
];

/** Les thèmes retirés (le 18 octobre 2026, deux fois), et celui qui les remplace : une page enregistrée garde un thème proche. */
export const REMPLACES: Record<string, string> = {
  // Retirés au matin.
  ardoise: 'nuit-peche', givre: 'neige', aubergine: 'aurore', cafe: 'onyx', neon: 'arcade', 'peche-nuit': 'nuit-peche',
  ivoire: 'champagne', sable: 'champagne', marbre: 'champagne', ciel: 'neige', lavande: 'neige', citron: 'coucher',
  abricot: 'coucher', bonbon: 'coucher', rouge: 'klein', pomme: 'brutal', holo: 'coucher', damier: 'brutal',
  // Retirés le soir, quand le catalogue est passé à dix.
  minuit: 'nuit-peche', encre: 'nuit-peche', bordeaux: 'onyx', velours: 'foret', studio: 'neige',
  papier: 'champagne', menthe: 'neige', rose: 'coucher', orange: 'klein', jaune: 'klein',
  y2k: 'coucher', acide: 'brutal', cosmos: 'aurore', lave: 'aurore', terminal: 'arcade', ocean: 'aurore',
};

export const THEME_DEFAUT = 'nuit-peche';
/** L'identifiant d'un thème existant : un ancien passe sur son remplaçant, un inconnu sur le thème par défaut. */
export const idTheme = (id: unknown): string =>
  typeof id === 'string' && THEMES.some(theme => theme.id === id) ? id : (typeof id === 'string' && REMPLACES[id]) || THEME_DEFAUT;
export const themeParId = (id: string) => THEMES.find(theme => theme.id === idTheme(id))!;

export const FAMILLES: { id: Famille; nom: string }[] = [
  { id: 'premium', nom: 'Élégants' }, { id: 'decale', nom: 'Décalés' },
  { id: 'sombre', nom: 'Sombres' }, { id: 'clair', nom: 'Clairs' }, { id: 'couleur', nom: 'Couleurs' }, { id: 'degrade', nom: 'Dégradés' },
];

const GEIST = "'Geist Variable', ui-sans-serif, system-ui, sans-serif";
const GARAMOND = "'EB Garamond Variable', ui-serif, Georgia, serif";
const OUTFIT = "'Outfit Variable', " + GEIST;
const BRICOLAGE = "'Bricolage Grotesque Variable', " + GEIST;
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace";

/** La police du texte et celle des titres (le nom, les sections, les cartes). */
export const POLICES: Record<Police, { corps: string; titre: string }> = {
  geist: { corps: GEIST, titre: GEIST },
  serif: { corps: GARAMOND, titre: GARAMOND },
  geometrique: { corps: OUTFIT, titre: OUTFIT },
  expressive: { corps: GEIST, titre: "'Syne Variable', " + GEIST },
  technique: { corps: "'Space Grotesk Variable', " + GEIST, titre: "'Space Grotesk Variable', " + GEIST },
  mono: { corps: MONO, titre: MONO },
  grotesque: { corps: BRICOLAGE, titre: BRICOLAGE },
  condensee: { corps: GEIST, titre: BRICOLAGE },
  display: { corps: GEIST, titre: "'Unbounded Variable', " + GEIST },
  elegante: { corps: "'Fraunces Variable', " + GARAMOND, titre: "'Fraunces Variable', " + GARAMOND },
  editoriale: { corps: GEIST, titre: "'Instrument Serif', " + GARAMOND },
};

/**
 * Les polices qu'on choisit par-dessus son thème (Starter, 24 octobre 2026, d'après Linktree), dans l'ordre du choix : celles
 * que porte au moins un thème, chacune avec son nom. Choisie, une police vient avec la typographie réglée du premier thème
 * qui la porte (tailles, graisses, approches) : l'accord vérifié par Impeccable voyage avec elle.
 */
export const POLICES_CHOIX = ['geist', 'geometrique', 'technique', 'grotesque', 'condensee', 'expressive', 'display', 'serif', 'elegante', 'editoriale'] as const satisfies readonly Police[];
export const NOMS_POLICES: Record<(typeof POLICES_CHOIX)[number], string> = {
  geist: 'Geist', geometrique: 'Outfit', technique: 'Space Grotesk', grotesque: 'Bricolage', condensee: 'Bricolage étroite',
  expressive: 'Syne', display: 'Unbounded', serif: 'Garamond', elegante: 'Fraunces', editoriale: 'Instrument Serif',
};
/** Le thème d'où vient chaque police, et donc sa typographie. */
export const themeDeLaPolice = (police: Police) => THEMES.find(t => t.police === police) ?? THEMES[0];

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** Le contraste WCAG entre deux couleurs `#rrggbb`. */
export const contraste = (a: string, b: string) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

/** Les titres de section prennent l'accent quand il se lit sur le fond, sinon le texte doux. */
export const titreSection = (theme: Theme) => (contraste(theme.vedette, theme.fondUni) >= 4.5 ? theme.vedette : theme.doux);

const enHex = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');
/** `a` mêlé de `b` dans la proportion `t` (0 : `a`, 1 : `b`). */
export const meler = (a: string, b: string, t: number) =>
  '#' + [1, 3, 5].map(i => enHex(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t)).join('');
/**
 * Le picto d'une carte (newsletter, liste, soutien), posé seul sur la carte, sans rond derrière lui
 * (22 octobre 2026, Lilian : jamais d'icône sur un fond) : l'accent quand il se voit sur la carte,
 * sinon le texte de la carte.
 */
export const pictoCarte = (theme: Theme) => (contraste(theme.vedette, theme.surface) >= 3 ? theme.vedette : theme.surfaceTexte);
/** Le texte d'une carte fondu dans sa couleur, autant que le permet un contraste de 4,5 : pour ses mentions en petit. */
export const douxSurCarte = (theme: Theme) => {
  let part = 0.45;
  while (part > 0 && contraste(meler(theme.surfaceTexte, theme.surface, part), theme.surface) < 4.5) part -= 0.03;
  return meler(theme.surfaceTexte, theme.surface, Math.max(0, part));
};
/**
 * Les fonds que le pied peut avoir derrière lui : le fond uni et chaque teinte du dégradé (la lueur d'une page courte),
 * ces mêmes teintes sous le panneau de la mise en page Colonne (le texte à 4 %, `page.css`), et la lave de son décor
 * (sa bulle la plus vive, l'accent mêlé de #ff2d55, passe sous le pied d'une page courte), et l'encre de la grille ou du
 * damier (le texte à 10 %, `--decor-encre`).
 */
export function fondsDuPied(theme: Theme): string[] {
  const teintes = [theme.fondUni, ...(theme.fond.match(/#[0-9a-f]{6}/gi) ?? [])];
  const fonds = [...teintes, ...teintes.map(f => meler(f, theme.texte, 0.04))];
  if (theme.decor === 'grille' || theme.decor === 'damier') fonds.push(...teintes.map(f => meler(f, theme.texte, 0.1)));
  if (theme.decor === 'lave') fonds.push(meler(theme.fondUni, meler(theme.vedette, '#ff2d55', 0.55), 0.5));
  return fonds;
}
/** `couleur` poussée vers le texte juste assez pour se lire en petit (4,5) sur chaque fond du pied, avec la part de texte qu'il y a fallu. */
function lisibleAuPied(theme: Theme, couleur: string): [string, number] {
  const fonds = fondsDuPied(theme);
  for (let part = 0; part < 1; part += 0.05) {
    const c = meler(couleur, theme.texte, part);
    if (fonds.every(f => contraste(c, f) >= 4.5)) return [c, part];
  }
  return [theme.texte, 1];
}
/**
 * La mention « Créer ma page avec Hopla », au pied de la page (23 octobre 2026, Lilian : un peu en avant, à la
 * couleur du thème) : l'accent, foncé ou éclairci vers le texte juste assez pour se lire ; le texte, s'il fallait l'y noyer.
 */
export const mentionPied = (theme: Theme) => { const [c, part] = lisibleAuPied(theme, theme.vedette); return part > 0.6 ? theme.texte : c; };
/** Les liens légaux du pied (Confidentialité, Signaler), en petit : le texte doux, lisible au bas de la page. */
export const legalPied = (theme: Theme) => lisibleAuPied(theme, theme.doux)[0];
/** Le texte qui se lit sur `fond` : le premier proposé qui passe 4,5, sinon le blanc ou le presque noir. */
const lisibleSur = (fond: string, ...choix: string[]) =>
  choix.find(c => contraste(c, fond) >= 4.5) ?? (contraste('#ffffff', fond) >= contraste('#111111', fond) ? '#ffffff' : '#111111');
const estCouleur = (c: string | undefined): c is string => !!c && /^#[0-9a-f]{6}$/i.test(c);

/**
 * Le thème avec les couleurs changées par-dessus (Lilian, 18 octobre 2026 :
 * on part d'un thème, puis on change le fond, les boutons ou l'accent). Les
 * textes qui vont dessus se recalculent pour rester lisibles ; la police, la
 * matière et la typographie restent celles du thème.
 */
export function personnaliser(theme: Theme, couleurs?: Partial<Couleurs>): Theme {
  const t = { ...theme };
  if (estCouleur(couleurs?.fond)) {
    const fond = couleurs.fond.toLowerCase();
    t.texte = lisibleSur(fond, theme.texte, '#ffffff', '#111111');
    t.fond = lueur(meler(fond, t.texte, 0.06), fond);
    t.fondUni = fond;
    // Le texte doux : le texte un peu fondu dans le fond, sans passer sous 3,5 de contraste.
    let part = 0.34;
    while (part > 0 && contraste(meler(t.texte, fond, part), fond) < 3.5) part -= 0.04;
    t.doux = meler(t.texte, fond, Math.max(0, part));
    t.ombre = meler(fond, '#000000', 0.7);
  }
  if (estCouleur(couleurs?.boutons)) {
    t.surface = couleurs.boutons.toLowerCase();
    t.surfaceTexte = lisibleSur(t.surface, theme.surfaceTexte, '#ffffff', '#111111');
  }
  if (estCouleur(couleurs?.accent)) {
    t.vedette = couleurs.accent.toLowerCase();
    t.vedetteTexte = lisibleSur(t.vedette, theme.vedetteTexte, '#ffffff', '#111111');
  }
  return t;
}
/** Le thème d'une page, avec ses couleurs à elle, et sa police si elle en a choisi une (avec la typographie qui va avec). */
export function themeDe(r: { theme: string; couleurs?: Partial<Couleurs>; police?: Police | '' }): Theme {
  const t = personnaliser(themeParId(r.theme), r.couleurs);
  return r.police && r.police !== t.police ? { ...t, police: r.police, typo: themeDeLaPolice(r.police).typo } : t;
}

const role = (nom: string, r: Role): Record<string, string> => ({
  ...(r.taille ? { [`--${nom}-taille`]: `${r.taille}rem` } : {}),
  [`--${nom}-graisse`]: String(r.graisse), [`--${nom}-approche`]: `${r.approche}em`,
  ...(r.italique ? { [`--${nom}-style`]: 'italic' } : {}),
});

/** Les variables CSS d'un thème, posées sur l'enveloppe de la page. */
export function variablesTheme(theme: Theme): Record<string, string> {
  return {
    '--fond': theme.fond, '--fond-uni': theme.fondUni, '--texte': theme.texte, '--doux': theme.doux, '--titre-section': titreSection(theme),
    '--surface': theme.surface, '--surface-texte': theme.surfaceTexte, '--vedette': theme.vedette, '--vedette-texte': theme.vedetteTexte,
    '--picto-carte': pictoCarte(theme), '--surface-doux': douxSurCarte(theme), '--mention-hopla': mentionPied(theme), '--pied-legal': legalPied(theme),
    // Quand l'accent ne se lit pas et que la mention prend le texte, elle passe devant les liens légaux par son poids.
    '--mention-graisse': mentionPied(theme) === theme.texte && theme.vedette !== theme.texte ? '560' : '480',
    '--police': POLICES[theme.police].corps, '--police-titre': POLICES[theme.police].titre, '--ombre-teinte': theme.ombre,
    // La typographie réglée du thème : la page la lit sur le nom, les sections, les boutons et les cartes.
    ...role('nom', theme.typo.nom), ...role('section', theme.typo.section), ...role('btn', theme.typo.bouton), ...role('carte', theme.typo.carte),
    '--titre-chasse': theme.police === 'condensee' ? '75%' : '100%',
  };
}
