/*
 * Vingt-six thèmes prêts à l'emploi, chacun en trois rôles : un fond, des
 * boutons d'une valeur nette, et un accent d'une autre teinte pour la carte
 * mise en avant, les titres de section et la lueur derrière le portrait.
 * Chacun est vérifié pour le contraste (voir `themes.test.ts`). Les cinq styles
 * de bouton se déduisent de ces couleurs (voir `page.css`) ; `conseil` dit
 * celui qui va avec le thème, appliqué quand on le choisit.
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
  /** L'accent : la carte mise en avant, dans tous les styles de bouton. */
  vedette: string;
  vedetteTexte: string;
  police: Police;
  decor?: Decor;
  /** Les boutons qui vont avec : appliqués quand on choisit le thème, modifiables ensuite. */
  conseil: { style: StyleBouton; forme: FormeBouton };
}

interface Options { police?: Police; fondUni?: string; decor?: Decor; conseil?: [StyleBouton, FormeBouton] }

const t = (id: string, nom: string, famille: Famille, fond: string, texte: string, doux: string, surface: [string, string], vedette: [string, string], o: Options = {}): Theme => ({
  id, nom, famille, fond, fondUni: o.fondUni ?? fond, texte, doux, surface: surface[0], surfaceTexte: surface[1],
  vedette: vedette[0], vedetteTexte: vedette[1], police: o.police ?? 'geist',
  ...(o.decor ? { decor: o.decor } : {}),
  conseil: { style: o.conseil?.[0] ?? 'plein', forme: o.conseil?.[1] ?? 'pilule' },
});

/** Une lumière douce en haut de page, sur un fond uni. */
const lueur = (haut: string, bas: string) => `radial-gradient(120% 65% at 50% -8%, ${haut} 0%, ${bas} 62%)`;

export const THEMES: Theme[] = [
  // Premium : de la matière, des polices de caractère, peu de couleurs mais justes.
  t('onyx', 'Onyx et or', 'premium', lueur('#2a261f', '#0b0b0a'), '#f3efe6', '#b5ad9c', ['#1e1c19', '#f3efe6'], ['#d8b56a', '#17130a'], { fondUni: '#0b0b0a', police: 'elegante', decor: 'grain', conseil: ['plein', 'arrondi'] }),
  t('champagne', 'Champagne', 'premium', '#f4efe6', '#1d1a15', '#6b6255', ['#fffdf8', '#1d1a15'], ['#6e1f2b', '#fbf3ea'], { police: 'editoriale', decor: 'grain', conseil: ['plein', 'arrondi'] }),
  t('velours', 'Velours', 'premium', lueur('#17544a', '#06201c'), '#eef6f1', '#9fc2b5', ['#0f3a32', '#eef6f1'], ['#e9d8a6', '#0b231e'], { fondUni: '#06201c', police: 'elegante', decor: 'grain', conseil: ['verre', 'pilule'] }),
  t('studio', 'Studio', 'premium', '#0e0e0e', '#f2f2f2', '#9a9a9a', ['#f2f2f2', '#0e0e0e'], ['#ff4d00', '#0e0e0e'], { police: 'grotesque', conseil: ['plein', 'carre'] }),

  // Décalés : pour les pages qui veulent qu'on s'en souvienne.
  t('brutal', 'Brutaliste', 'decale', '#f2f0e6', '#0a0a0a', '#4a4a44', ['#ffe14d', '#0a0a0a'], ['#ff4fd8', '#0a0a0a'], { police: 'grotesque', decor: 'grille', conseil: ['relief', 'carre'] }),
  t('y2k', 'Y2K', 'decale', 'linear-gradient(180deg, #c9d6ff 0%, #f0c9ff 50%, #c9fff1 100%)', '#1a0f3d', '#4a3d70', ['#1a0f3d', '#ffffff'], ['#b8009b', '#ffffff'], { fondUni: '#f0c9ff', police: 'display', decor: 'points' }),
  t('arcade', 'Arcade', 'decale', '#0d0221', '#f8f4ff', '#b7a6e0', ['#ff2a6d', '#0d0221'], ['#05d9e8', '#0d0221'], { police: 'display', decor: 'scanlines', conseil: ['relief', 'carre'] }),
  t('acide', 'Acide', 'decale', '#c6ff00', '#0a0a0a', '#2f3a00', ['#0a0a0a', '#c6ff00'], ['#6b00e0', '#ffffff'], { police: 'display', decor: 'points', conseil: ['plein', 'carre'] }),
  t('cosmos', 'Cosmos', 'decale', 'radial-gradient(120% 80% at 50% 0%, #2a1660 0%, #090418 70%)', '#f4f0ff', '#b9aee0', ['#1f1440', '#f4f0ff'], ['#ffd23f', '#1a0f00'], { fondUni: '#090418', police: 'display', decor: 'etoiles', conseil: ['verre', 'pilule'] }),
  t('lave', 'Lampe à lave', 'decale', '#1a0500', '#fff1e6', '#e0b9a0', ['#2e0d03', '#fff1e6'], ['#ff6a00', '#1a0500'], { police: 'grotesque', decor: 'lave', conseil: ['verre', 'pilule'] }),
  t('terminal', 'Terminal', 'decale', '#0a0f0a', '#b8f5c4', '#7cb487', ['#0f1f12', '#b8f5c4'], ['#3ddc84', '#052010'], { police: 'mono', decor: 'scanlines', conseil: ['contour', 'carre'] }),

  // Sombres : des boutons qui se détachent du fond, un accent chaud ou lumineux.
  t('nuit-peche', 'Nuit et pêche', 'sombre', lueur('#3a2733', '#0c121f'), '#f4f1ec', '#aab2c5', ['#1f2a40', '#f4f1ec'], ['#ffb38a', '#111827'], { fondUni: '#0c121f', decor: 'grain' }),
  t('minuit', 'Minuit', 'sombre', lueur('#1b2233', '#07090f'), '#f5f7fb', '#9aa3b5', ['#1c2130', '#f5f7fb'], ['#c7c9ff', '#07090f'], { fondUni: '#07090f', decor: 'grain' }),
  t('encre', 'Encre et papier', 'sombre', lueur('#17306b', '#0b1d3a'), '#eef3ff', '#a9bce0', ['#f3ead7', '#0b1d3a'], ['#ff7a59', '#0b1d3a'], { fondUni: '#0b1d3a', police: 'serif', conseil: ['plein', 'arrondi'] }),
  t('foret', 'Forêt', 'sombre', lueur('#1f4a33', '#0f1f17'), '#ecf5ee', '#9fbca9', ['#1c3a2b', '#ecf5ee'], ['#f2b84b', '#1a1200'], { fondUni: '#0f1f17', decor: 'grain', conseil: ['plein', 'arrondi'] }),
  t('bordeaux', 'Bordeaux', 'sombre', lueur('#5a1a30', '#2a0d14'), '#fbeff1', '#d8aeb6', ['#451a26', '#fbeff1'], ['#e9c46a', '#2a0d14'], { fondUni: '#2a0d14', police: 'serif' }),

  // Clairs : des boutons francs sur un fond doux, et un accent d'une autre famille.
  t('neige', 'Neige', 'clair', '#ffffff', '#111111', '#5b6270', ['#111111', '#ffffff'], ['#2f5bff', '#ffffff']),
  t('papier', 'Papier', 'clair', '#f7f4ee', '#1b1b1b', '#5f5a54', ['#1b1b1b', '#f7f4ee'], ['#c2410c', '#ffffff'], { police: 'serif', decor: 'grain', conseil: ['plein', 'arrondi'] }),
  t('menthe', 'Menthe et corail', 'clair', '#e8f6ef', '#0f3d2e', '#46705f', ['#0f3d2e', '#e8f6ef'], ['#ff6f59', '#2a0a00']),
  t('rose', 'Rose', 'clair', '#fde8ef', '#4a1028', '#86475e', ['#ffffff', '#4a1028'], ['#1f6f50', '#ffffff'], { police: 'rond' }),

  // Couleurs franches : la couleur au fond, des boutons noirs ou blancs, un accent contraire.
  t('orange', 'Orange franc', 'couleur', '#ff5f1f', '#1a0a00', '#3a1505', ['#1a0a00', '#fff1e6'], ['#fff1e6', '#1a0a00'], { decor: 'grain' }),
  t('jaune', 'Jaune et bleu', 'couleur', '#ffe27a', '#111111', '#4a4210', ['#111111', '#ffffff'], ['#1b2bd1', '#ffffff'], { police: 'rond' }),
  t('klein', 'Bleu Klein', 'couleur', '#1f3bff', '#ffffff', '#dfe3ff', ['#ffffff', '#1f3bff'], ['#ffd400', '#111111'], { decor: 'grain' }),

  // Dégradés : des boutons de verre, un accent plein.
  t('aurore', 'Aurore', 'degrade', 'linear-gradient(165deg, #1a1033 0%, #4b1d6b 50%, #a8445e 100%)', '#ffffff', '#f0dcf6', ['#ffffff', '#2a0f3d'], ['#ffd27a', '#2a0f3d'], { fondUni: '#3a1758', decor: 'grain', conseil: ['verre', 'pilule'] }),
  t('ocean', 'Océan', 'degrade', 'linear-gradient(180deg, #02203a 0%, #03516b 60%, #087f86 100%)', '#f0fbff', '#bfe3ec', ['#f0fbff', '#02203a'], ['#ff9e7a', '#02203a'], { fondUni: '#03415c', decor: 'grain', conseil: ['verre', 'arrondi'] }),
  t('coucher', 'Coucher de soleil', 'degrade', 'linear-gradient(170deg, #ffc49e 0%, #ff8fa6 55%, #c7a2f0 100%)', '#1c0b1f', '#4a2b45', ['#ffffff', '#1c0b1f'], ['#1c0b1f', '#ffffff'], { police: 'rond', fondUni: '#ff9fa8', decor: 'grain' }),
];

/** Les thèmes retirés le 18 octobre 2026, et celui qui les remplace : une page enregistrée garde un thème proche. */
export const REMPLACES: Record<string, string> = {
  ardoise: 'minuit', givre: 'minuit', aubergine: 'cosmos', cafe: 'onyx', neon: 'arcade', 'peche-nuit': 'nuit-peche',
  ivoire: 'champagne', sable: 'champagne', marbre: 'champagne', ciel: 'neige', lavande: 'neige', citron: 'papier',
  abricot: 'rose', bonbon: 'rose', rouge: 'orange', pomme: 'acide', holo: 'y2k', damier: 'brutal',
};

export const THEME_DEFAUT = 'nuit-peche';
/** L'identifiant d'un thème existant : un ancien passe sur son remplaçant, un inconnu sur le thème par défaut. */
export const idTheme = (id: unknown): string =>
  typeof id === 'string' && THEMES.some(theme => theme.id === id) ? id : (typeof id === 'string' && REMPLACES[id]) || THEME_DEFAUT;
export const themeParId = (id: string) => THEMES.find(theme => theme.id === idTheme(id))!;

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

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** Le contraste WCAG entre deux couleurs `#rrggbb`. */
export const contraste = (a: string, b: string) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

/** Les titres de section prennent l'accent quand il se lit sur le fond, sinon le texte doux. */
export const titreSection = (theme: Theme) => (contraste(theme.vedette, theme.fondUni) >= 4.5 ? theme.vedette : theme.doux);

/** Les variables CSS d'un thème, posées sur l'enveloppe de la page. */
export function variablesTheme(theme: Theme): Record<string, string> {
  return {
    '--fond': theme.fond, '--fond-uni': theme.fondUni, '--texte': theme.texte, '--doux': theme.doux, '--titre-section': titreSection(theme),
    '--surface': theme.surface, '--surface-texte': theme.surfaceTexte, '--vedette': theme.vedette, '--vedette-texte': theme.vedetteTexte,
    '--police': POLICES[theme.police].corps, '--police-titre': POLICES[theme.police].titre,
  };
}
