/*
 * Quarante-quatre thèmes prêts à l'emploi. Chacun est vérifié pour le
 * contraste : le texte sur le fond, et le texte des boutons pleins et de la
 * carte mise en avant sur leur couleur, passent au moins 4,5:1. Les cinq styles
 * de bouton se déduisent de ces couleurs (voir `page.css`), si bien qu'un thème
 * marche avec tous les styles ; `conseil` dit seulement celui qui lui va le mieux.
 */

import type { FormeBouton, StyleBouton } from './types.ts';

export type Police = 'geist' | 'serif' | 'rond' | 'mono' | 'grotesque' | 'display' | 'elegante' | 'editoriale';
export type Famille = 'sombre' | 'clair' | 'couleur' | 'degrade' | 'premium' | 'decale';
/** Une matière posée sur le fond, sous le contenu (voir `page.css`, `data-decor`). */
export type Decor = 'grain' | 'grille' | 'points' | 'damier' | 'scanlines' | 'etoiles' | 'lave';

export interface Theme {
  id: string;
  nom: string;
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
  /** La carte mise en avant, en style plein. Par défaut, la couleur des boutons. */
  vedette: string;
  vedetteTexte: string;
  police: Police;
  decor?: Decor;
  /** Les boutons qui vont avec : appliqués quand on choisit le thème, modifiables ensuite. */
  conseil?: { style: StyleBouton; forme: FormeBouton };
}

interface Options { police?: Police; fondUni?: string; vedette?: [string, string]; decor?: Decor; conseil?: [StyleBouton, FormeBouton] }

const t = (id: string, nom: string, famille: Famille, fond: string, texte: string, doux: string, surface: string, surfaceTexte: string, o: Options = {}): Theme => ({
  id, nom, famille, fond, fondUni: o.fondUni ?? fond, texte, doux, surface, surfaceTexte,
  vedette: o.vedette?.[0] ?? surface, vedetteTexte: o.vedette?.[1] ?? surfaceTexte, police: o.police ?? 'geist',
  ...(o.decor ? { decor: o.decor } : {}),
  ...(o.conseil ? { conseil: { style: o.conseil[0], forme: o.conseil[1] } } : {}),
});

/** Une lumière douce en haut de page, sur un fond uni. */
const lueur = (haut: string, bas: string) => `radial-gradient(120% 65% at 50% -8%, ${haut} 0%, ${bas} 62%)`;

export const THEMES: Theme[] = [
  // Sombres : des boutons en retrait, et une couleur d'accent pour ce qui est mis en avant.
  t('nuit-peche', 'Nuit et pêche', 'sombre', lueur('#1d2943', '#0c121f'), '#f4f1ec', '#a9b1c3', '#1c2639', '#f4f1ec', { fondUni: '#0c121f', vedette: ['#ffb38a', '#111827'], decor: 'grain' }),
  t('minuit', 'Minuit', 'sombre', '#0a0a0b', '#fafafa', '#a1a1aa', '#1a1a1d', '#fafafa', { vedette: ['#fafafa', '#0a0a0b'], decor: 'grain' }),
  t('encre', 'Encre bleue', 'sombre', lueur('#173566', '#0b1d3a'), '#eef3ff', '#a7badf', '#16294a', '#eef3ff', { fondUni: '#0b1d3a', vedette: ['#6ea8ff', '#04122a'] }),
  t('foret', 'Forêt', 'sombre', lueur('#1b3a2a', '#0f1f17'), '#ecf5ee', '#9fbca9', '#1a3226', '#ecf5ee', { fondUni: '#0f1f17', vedette: ['#7bd389', '#0b1a12'], decor: 'grain' }),
  t('bordeaux', 'Bordeaux', 'sombre', lueur('#47172a', '#2a0d14'), '#fbeff1', '#d8aeb6', '#3d1620', '#fbeff1', { fondUni: '#2a0d14', vedette: ['#f4c6cf', '#2a0d14'], police: 'serif' }),
  t('aubergine', 'Aubergine', 'sombre', lueur('#33194d', '#1d1029'), '#f5eefc', '#bfadd2', '#2c1a3f', '#f5eefc', { fondUni: '#1d1029', vedette: ['#c9a7ff', '#1d1029'] }),
  t('cafe', 'Café', 'sombre', '#1f1712', '#f6ede4', '#c5b19e', '#2e231b', '#f6ede4', { vedette: ['#e2b07a', '#1f1712'], police: 'serif', decor: 'grain' }),
  t('terminal', 'Terminal', 'sombre', '#0a0f0a', '#b8f5c4', '#7cb487', '#0f1f12', '#b8f5c4', { vedette: ['#3ddc84', '#052010'], police: 'mono', decor: 'scanlines', conseil: ['contour', 'carre'] }),
  t('ardoise', 'Ardoise', 'sombre', '#1e2430', '#e8ecf3', '#a3adbf', '#2a3241', '#e8ecf3', { vedette: ['#e8ecf3', '#1e2430'] }),
  t('neon', 'Néon', 'sombre', '#0b0b14', '#f1f0ff', '#aeacd2', '#1a1a2e', '#f1f0ff', { vedette: ['#ff3ea5', '#14000a'], police: 'rond', decor: 'grille' }),

  // Clairs : des cartes blanches qui se détachent du fond, l'accent pour la mise en avant.
  t('papier', 'Papier', 'clair', '#f7f4ee', '#1b1b1b', '#5f5a54', '#1b1b1b', '#f7f4ee', { vedette: ['#c2410c', '#ffffff'], police: 'serif', decor: 'grain' }),
  t('neige', 'Neige', 'clair', '#ffffff', '#111111', '#5b6270', '#111111', '#ffffff', { vedette: ['#2448e8', '#ffffff'] }),
  t('ivoire', 'Ivoire', 'clair', '#ece2ce', '#2b2118', '#5e4f3e', '#2b2118', '#ece2ce', { vedette: ['#7a2e1d', '#f6efe2'], police: 'serif', decor: 'grain' }),
  t('sable', 'Sable', 'clair', '#f3e9dc', '#3a2a1c', '#6e5c4a', '#fffaf3', '#3a2a1c', { vedette: ['#a8542a', '#ffffff'], decor: 'grain' }),
  t('menthe', 'Menthe', 'clair', '#e8f6ef', '#0f3d2e', '#46705f', '#ffffff', '#0f3d2e', { vedette: ['#0f3d2e', '#e8f6ef'] }),
  t('ciel', 'Ciel', 'clair', '#eaf3ff', '#0b2a52', '#4a6688', '#ffffff', '#0b2a52', { vedette: ['#1e5eff', '#ffffff'] }),
  t('lavande', 'Lavande', 'clair', '#f1ecff', '#2b1a5a', '#625489', '#ffffff', '#2b1a5a', { vedette: ['#5b3fd1', '#ffffff'] }),
  t('abricot', 'Abricot', 'clair', '#fff1e8', '#3b1f12', '#7d523d', '#ffffff', '#3b1f12', { vedette: ['#ff9b66', '#2a1206'], police: 'rond' }),
  t('rose', 'Rose', 'clair', '#fde8ef', '#4a1028', '#86475e', '#ffffff', '#4a1028', { vedette: ['#c92a62', '#ffffff'] }),
  t('citron', 'Citron', 'clair', '#fffbd6', '#2e2a00', '#615b1c', '#2e2a00', '#fffbd6', { police: 'rond', decor: 'points' }),

  // Couleurs franches.
  t('orange', 'Orange franc', 'couleur', '#ff5f1f', '#1a0a00', '#3a1505', '#1a0a00', '#ff7a42', { decor: 'grain' }),
  t('jaune', 'Jaune franc', 'couleur', '#ffd400', '#111111', '#3d3500', '#111111', '#ffd400', { police: 'rond' }),
  t('klein', 'Bleu Klein', 'couleur', '#1f3bff', '#ffffff', '#dfe3ff', '#ffffff', '#1f3bff', { decor: 'grain' }),
  t('pomme', 'Vert pomme', 'couleur', '#b6f36b', '#0f2600', '#2a4610', '#0f2600', '#b6f36b', { police: 'mono' }),
  t('rouge', 'Rouge', 'couleur', '#d92b26', '#ffffff', '#ffe0de', '#ffffff', '#a31e1a', { decor: 'grain' }),

  t('aurore', 'Aurore', 'degrade', 'linear-gradient(165deg, #1a1033 0%, #4b1d6b 50%, #a8445e 100%)', '#ffffff', '#f0dcf6', '#ffffff', '#2a0f3d', { fondUni: '#3a1758', decor: 'grain' }),
  t('ocean', 'Océan', 'degrade', 'linear-gradient(180deg, #02203a 0%, #03516b 60%, #087f86 100%)', '#f0fbff', '#bfe3ec', '#f0fbff', '#02203a', { fondUni: '#03415c', decor: 'grain' }),
  t('coucher', 'Coucher de soleil', 'degrade', 'linear-gradient(170deg, #ffc49e 0%, #ff8fa6 55%, #c7a2f0 100%)', '#1c0b1f', '#4a2b45', '#1c0b1f', '#ffffff', { police: 'rond', fondUni: '#ff9fa8', decor: 'grain' }),
  t('peche-nuit', 'Lueur de pêche', 'degrade', 'radial-gradient(120% 70% at 50% 0%, #4a2f3a 0%, #0c121f 65%)', '#f4f1ec', '#b3b8c6', '#2a2531', '#f4f1ec', { fondUni: '#0c121f', vedette: ['#ffb38a', '#111827'], decor: 'grain' }),
  t('holo', 'Holographique', 'degrade', 'linear-gradient(135deg, #dff6ff 0%, #f1e4ff 50%, #ffe7ef 100%)', '#1d1630', '#554c6e', '#1d1630', '#ffffff', { fondUni: '#f1e4ff', decor: 'grain' }),

  // Premium : de la matière, des polices de caractère, peu de couleurs.
  t('onyx', 'Onyx et or', 'premium', lueur('#24211c', '#0b0b0a'), '#f3efe6', '#b5ad9c', '#171614', '#f3efe6', { fondUni: '#0b0b0a', vedette: ['#d8b56a', '#17130a'], police: 'elegante', decor: 'grain', conseil: ['plein', 'arrondi'] }),
  t('champagne', 'Champagne', 'premium', '#f4efe6', '#1d1a15', '#6b6255', '#fffdf8', '#1d1a15', { vedette: ['#1d1a15', '#f4efe6'], police: 'editoriale', decor: 'grain', conseil: ['plein', 'arrondi'] }),
  t('velours', 'Velours', 'premium', lueur('#14483e', '#06201c'), '#eef6f1', '#9fc2b5', '#0d2e28', '#eef6f1', { fondUni: '#06201c', vedette: ['#e9d8a6', '#0b231e'], police: 'elegante', decor: 'grain', conseil: ['verre', 'pilule'] }),
  t('marbre', 'Marbre', 'premium', 'linear-gradient(160deg, #f8f8f6 0%, #e7e6e1 100%)', '#141414', '#5c5c58', '#ffffff', '#141414', { fondUni: '#efeeea', vedette: ['#141414', '#f8f8f6'], police: 'editoriale', decor: 'grain', conseil: ['contour', 'carre'] }),
  t('studio', 'Studio', 'premium', '#0e0e0e', '#f2f2f2', '#9a9a9a', '#1b1b1b', '#f2f2f2', { vedette: ['#ff4d00', '#0e0e0e'], police: 'grotesque', conseil: ['plein', 'carre'] }),
  t('givre', 'Givre', 'premium', 'radial-gradient(90% 55% at 15% 0%, #2c3753 0%, #10131c 60%), #10131c', '#f2f4fa', '#aab1c4', '#1a1f2c', '#f2f4fa', { fondUni: '#10131c', vedette: ['#dfe6ff', '#10131c'], decor: 'grain', conseil: ['verre', 'arrondi'] }),

  // Décalés : pour les pages qui veulent qu'on s'en souvienne.
  t('brutal', 'Brutaliste', 'decale', '#f2f0e6', '#0a0a0a', '#4a4a44', '#ffe14d', '#0a0a0a', { vedette: ['#ff4fd8', '#0a0a0a'], police: 'grotesque', decor: 'grille', conseil: ['relief', 'carre'] }),
  t('y2k', 'Y2K', 'decale', 'linear-gradient(180deg, #c9d6ff 0%, #f0c9ff 50%, #c9fff1 100%)', '#1a0f3d', '#4a3d70', '#1a0f3d', '#ffffff', { fondUni: '#f0c9ff', vedette: ['#b8009b', '#ffffff'], police: 'display', decor: 'points', conseil: ['plein', 'pilule'] }),
  t('arcade', 'Arcade', 'decale', '#0d0221', '#f8f4ff', '#b7a6e0', '#ff2a6d', '#0d0221', { vedette: ['#05d9e8', '#0d0221'], police: 'display', decor: 'scanlines', conseil: ['relief', 'carre'] }),
  t('acide', 'Acide', 'decale', '#c6ff00', '#0a0a0a', '#2f3a00', '#0a0a0a', '#c6ff00', { vedette: ['#6b00e0', '#ffffff'], police: 'display', decor: 'points', conseil: ['plein', 'carre'] }),
  t('damier', 'Damier', 'decale', '#111111', '#ffffff', '#bdbdbd', '#ffffff', '#111111', { vedette: ['#d40000', '#ffffff'], police: 'grotesque', decor: 'damier', conseil: ['relief', 'carre'] }),
  t('cosmos', 'Cosmos', 'decale', 'radial-gradient(120% 80% at 50% 0%, #2a1660 0%, #090418 70%)', '#f4f0ff', '#b9aee0', '#1f1440', '#f4f0ff', { fondUni: '#090418', vedette: ['#ffd23f', '#1a0f00'], police: 'display', decor: 'etoiles', conseil: ['verre', 'pilule'] }),
  t('bonbon', 'Bonbon', 'decale', '#ffd6ec', '#3a0028', '#7a3a62', '#ffffff', '#3a0028', { vedette: ['#7b2cff', '#ffffff'], police: 'rond', decor: 'points', conseil: ['relief', 'pilule'] }),
  t('lave', 'Lampe à lave', 'decale', '#1a0500', '#fff1e6', '#e0b9a0', '#2e0d03', '#fff1e6', { vedette: ['#ff6a00', '#1a0500'], police: 'grotesque', decor: 'lave', conseil: ['verre', 'pilule'] }),
];

export const THEME_DEFAUT = 'nuit-peche';
export const themeParId = (id: string) => THEMES.find(theme => theme.id === id) ?? THEMES[0];

export const FAMILLES: { id: Famille; nom: string }[] = [
  { id: 'premium', nom: 'Premium' }, { id: 'decale', nom: 'Décalés' },
  { id: 'sombre', nom: 'Sombres' }, { id: 'clair', nom: 'Clairs' }, { id: 'couleur', nom: 'Couleurs' }, { id: 'degrade', nom: 'Dégradés' },
];

const GEIST = "'Geist Variable', ui-sans-serif, system-ui, sans-serif";
const GARAMOND = "'EB Garamond Variable', ui-serif, Georgia, serif";
const ROND = "ui-rounded, 'SF Pro Rounded', 'Nunito', 'Geist Variable', system-ui, sans-serif";
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace";

/** La police du texte et celle des titres (le nom, les sections, les cartes). */
export const POLICES: Record<Police, { corps: string; titre: string }> = {
  geist: { corps: GEIST, titre: GEIST },
  serif: { corps: GARAMOND, titre: GARAMOND },
  rond: { corps: ROND, titre: ROND },
  mono: { corps: MONO, titre: MONO },
  grotesque: { corps: "'Bricolage Grotesque Variable', " + GEIST, titre: "'Bricolage Grotesque Variable', " + GEIST },
  display: { corps: GEIST, titre: "'Unbounded Variable', " + GEIST },
  elegante: { corps: "'Fraunces Variable', " + GARAMOND, titre: "'Fraunces Variable', " + GARAMOND },
  editoriale: { corps: GEIST, titre: "'Instrument Serif', " + GARAMOND },
};

/** Les variables CSS d'un thème, posées sur l'enveloppe de la page. */
export function variablesTheme(theme: Theme): Record<string, string> {
  return {
    '--fond': theme.fond, '--fond-uni': theme.fondUni, '--texte': theme.texte, '--doux': theme.doux,
    '--surface': theme.surface, '--surface-texte': theme.surfaceTexte, '--vedette': theme.vedette, '--vedette-texte': theme.vedetteTexte,
    '--police': POLICES[theme.police].corps, '--police-titre': POLICES[theme.police].titre,
  };
}
