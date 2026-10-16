/*
 * Trente thèmes prêts à l'emploi. Chacun est vérifié pour le contraste : le
 * texte sur le fond, et le texte des boutons pleins sur leur couleur, passent
 * au moins 4,5:1. Les cinq styles de bouton se déduisent de ces couleurs (voir
 * `page.css`), si bien qu'un thème marche avec tous les styles.
 */

export type Police = 'geist' | 'serif' | 'rond' | 'mono';
export type Famille = 'sombre' | 'clair' | 'couleur' | 'degrade';

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
}

const t = (id: string, nom: string, famille: Famille, fond: string, texte: string, doux: string, surface: string, surfaceTexte: string, police: Police = 'geist', fondUni = fond, vedette?: [string, string]): Theme =>
  ({ id, nom, famille, fond, fondUni, texte, doux, surface, surfaceTexte, vedette: vedette?.[0] ?? surface, vedetteTexte: vedette?.[1] ?? surfaceTexte, police });

export const THEMES: Theme[] = [
  t('nuit-peche', 'Nuit et pêche', 'sombre', '#0c121f', '#f4f1ec', '#a9b1c3', '#1c2639', '#f4f1ec', 'geist', '#0c121f', ['#ffb38a', '#111827']),
  t('minuit', 'Minuit', 'sombre', '#0a0a0b', '#fafafa', '#a1a1aa', '#fafafa', '#0a0a0b'),
  t('encre', 'Encre bleue', 'sombre', '#0b1d3a', '#eef3ff', '#a7badf', '#6ea8ff', '#04122a'),
  t('foret', 'Forêt', 'sombre', '#0f1f17', '#ecf5ee', '#9fbca9', '#7bd389', '#0b1a12'),
  t('bordeaux', 'Bordeaux', 'sombre', '#2a0d14', '#fbeff1', '#d8aeb6', '#f4c6cf', '#2a0d14', 'serif'),
  t('aubergine', 'Aubergine', 'sombre', '#1d1029', '#f5eefc', '#bfadd2', '#c9a7ff', '#1d1029'),
  t('cafe', 'Café', 'sombre', '#1f1712', '#f6ede4', '#c5b19e', '#e2b07a', '#1f1712', 'serif'),
  t('terminal', 'Terminal', 'sombre', '#0a0f0a', '#b8f5c4', '#7cb487', '#3ddc84', '#052010', 'mono'),
  t('ardoise', 'Ardoise', 'sombre', '#1e2430', '#e8ecf3', '#a3adbf', '#e8ecf3', '#1e2430'),
  t('neon', 'Néon', 'sombre', '#0b0b14', '#f1f0ff', '#aeacd2', '#ff3ea5', '#14000a', 'rond'),

  t('papier', 'Papier', 'clair', '#f7f4ee', '#1b1b1b', '#5f5a54', '#1b1b1b', '#f7f4ee', 'serif'),
  t('neige', 'Neige', 'clair', '#ffffff', '#111111', '#5b6270', '#111111', '#ffffff'),
  t('ivoire', 'Ivoire', 'clair', '#ece2ce', '#2b2118', '#5e4f3e', '#2b2118', '#ece2ce', 'serif'),
  t('sable', 'Sable', 'clair', '#f3e9dc', '#3a2a1c', '#6e5c4a', '#a8542a', '#ffffff'),
  t('menthe', 'Menthe', 'clair', '#e8f6ef', '#0f3d2e', '#46705f', '#0f3d2e', '#e8f6ef'),
  t('ciel', 'Ciel', 'clair', '#eaf3ff', '#0b2a52', '#4a6688', '#1e5eff', '#ffffff'),
  t('lavande', 'Lavande', 'clair', '#f1ecff', '#2b1a5a', '#625489', '#5b3fd1', '#ffffff'),
  t('abricot', 'Abricot', 'clair', '#fff1e8', '#3b1f12', '#7d523d', '#ff9b66', '#2a1206', 'rond'),
  t('rose', 'Rose', 'clair', '#fde8ef', '#4a1028', '#86475e', '#c92a62', '#ffffff'),
  t('citron', 'Citron', 'clair', '#fffbd6', '#2e2a00', '#615b1c', '#2e2a00', '#fffbd6', 'rond'),

  t('orange', 'Orange franc', 'couleur', '#ff5f1f', '#1a0a00', '#3a1505', '#1a0a00', '#ff7a42'),
  t('jaune', 'Jaune franc', 'couleur', '#ffd400', '#111111', '#3d3500', '#111111', '#ffd400', 'rond'),
  t('klein', 'Bleu Klein', 'couleur', '#1f3bff', '#ffffff', '#dfe3ff', '#ffffff', '#1f3bff'),
  t('pomme', 'Vert pomme', 'couleur', '#b6f36b', '#0f2600', '#2a4610', '#0f2600', '#b6f36b', 'mono'),
  t('rouge', 'Rouge', 'couleur', '#d92b26', '#ffffff', '#ffe0de', '#ffffff', '#a31e1a'),

  t('aurore', 'Aurore', 'degrade', 'linear-gradient(165deg, #1a1033 0%, #4b1d6b 50%, #a8445e 100%)', '#ffffff', '#f0dcf6', '#ffffff', '#2a0f3d', 'geist', '#3a1758'),
  t('ocean', 'Océan', 'degrade', 'linear-gradient(180deg, #02203a 0%, #03516b 60%, #087f86 100%)', '#f0fbff', '#bfe3ec', '#f0fbff', '#02203a', 'geist', '#03415c'),
  t('coucher', 'Coucher de soleil', 'degrade', 'linear-gradient(170deg, #ffc49e 0%, #ff8fa6 55%, #c7a2f0 100%)', '#1c0b1f', '#4a2b45', '#1c0b1f', '#ffffff', 'rond', '#ff9fa8'),
  t('peche-nuit', 'Lueur de pêche', 'degrade', 'radial-gradient(120% 70% at 50% 0%, #4a2f3a 0%, #0c121f 65%)', '#f4f1ec', '#b3b8c6', '#2a2531', '#f4f1ec', 'geist', '#0c121f', ['#ffb38a', '#111827']),
  t('holo', 'Holographique', 'degrade', 'linear-gradient(135deg, #dff6ff 0%, #f1e4ff 50%, #ffe7ef 100%)', '#1d1630', '#554c6e', '#1d1630', '#ffffff', 'geist', '#f1e4ff'),
];

export const THEME_DEFAUT = 'nuit-peche';
export const themeParId = (id: string) => THEMES.find(theme => theme.id === id) ?? THEMES[0];

export const FAMILLES: { id: Famille; nom: string }[] = [
  { id: 'sombre', nom: 'Sombres' }, { id: 'clair', nom: 'Clairs' }, { id: 'couleur', nom: 'Couleurs' }, { id: 'degrade', nom: 'Dégradés' },
];

export const POLICES: Record<Police, string> = {
  geist: "'Geist Variable', ui-sans-serif, system-ui, sans-serif",
  serif: "'EB Garamond Variable', ui-serif, Georgia, serif",
  rond: "ui-rounded, 'SF Pro Rounded', 'Nunito', 'Geist Variable', system-ui, sans-serif",
  mono: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace",
};

/** Les variables CSS d'un thème, posées sur l'enveloppe de la page. */
export function variablesTheme(theme: Theme): Record<string, string> {
  return {
    '--fond': theme.fond, '--fond-uni': theme.fondUni, '--texte': theme.texte, '--doux': theme.doux,
    '--surface': theme.surface, '--surface-texte': theme.surfaceTexte, '--vedette': theme.vedette, '--vedette-texte': theme.vedetteTexte,
    '--police': POLICES[theme.police],
  };
}
