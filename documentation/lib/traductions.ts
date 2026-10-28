/*
 * Les mots de Fumadocs, en français. Ses clés portent la note de leur composant (« Search(search trigger) ») :
 * chaque mot est décliné sous toutes les notes que Fumadocs emploie.
 */
const MOTS: Record<string, string> = {
  Search: 'Rechercher',
  'Open Search': 'Rechercher',
  'Close Search': 'Fermer',
  'On this page': 'Sur cette page',
  'Table of Contents': 'Sommaire',
  'No Headings': 'Pas de titres',
  'Last updated on': 'Mis à jour le',
  'Previous Page': 'Page précédente',
  'Next Page': 'Page suivante',
  'Edit on GitHub': 'Modifier sur GitHub',
  'Copy Markdown': 'Copier en Markdown',
  'Copied Markdown': 'Markdown copié',
  'View as Markdown': 'Voir en Markdown',
  'Copy Text': 'Copier',
  'Copied Text': 'Copié',
  'Copy Link': 'Copier le lien',
  'Copied Link': 'Lien copié',
  'Copy Anchor Link': 'Copier le lien',
  'Copied Anchor Link': 'Lien copié',
  'Open in ChatGPT': 'Ouvrir dans ChatGPT',
  'Open in Claude': 'Ouvrir dans Claude',
  'Open in Cursor': 'Ouvrir dans Cursor',
  'Open in GitHub': 'Ouvrir sur GitHub',
  'Open in Scira AI': 'Ouvrir dans Scira AI',
  'Read {url}, I want to ask questions about it.': 'Lis {url}, j’ai des questions à te poser dessus.',
  Options: 'Options',
  Open: 'Ouvrir',
  Close: 'Fermer',
  'Open Sidebar': 'Ouvrir le menu',
  'Close Sidebar': 'Fermer le menu',
  'Collapse Sidebar': 'Replier le menu',
  'Show Sidebar': 'Afficher le menu',
  'Hide Sidebar': 'Masquer le menu',
  'Toggle Menu': 'Menu',
  'Page Not Found': 'Page introuvable',
  'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.': 'Cette page a peut-être changé d’adresse ou n’existe plus.',
  'Back to Home': 'Retour à l’accueil',
  Parameters: 'Paramètres',
  Returns: 'Renvoie',
  Type: 'Type',
  Prop: 'Champ',
  Default: 'Par défaut',
  'Image Viewer': 'Image',
  'Next Image': 'Image suivante',
  'Previous Image': 'Image précédente',
};

const NOTES = [
  '', '(search trigger)', '(search dialog)', '(search dialog)(aria-label)', '(search trigger)(aria-label)', '(table of contents)',
  '(inline table of contents)', '(page footer)', '(edit page)', '(pagination)', '(page actions)', '(code block)(aria-label)',
  '(heading anchor)(aria-label)', '(accordion)(aria-label)', '(aria-label)', '(sidebar)', '(sidebar)(aria-label)',
  '(home layout header)(aria-label)', '(404 not found page)', '(type table)', '(image zoom)(aria-label)',
];

export const TRADUCTIONS: Record<string, string> = Object.fromEntries(
  Object.entries(MOTS).flatMap(([mot, fr]) => NOTES.map(note => [`${mot}${note}`, fr])),
);
