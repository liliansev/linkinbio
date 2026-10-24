/*
 * Les derniers articles d'un blog, les derniers épisodes d'un podcast, la dernière vidéo d'une chaîne YouTube (24 octobre
 * 2026, lot 4 venu de Linktree) : lus dans leur flux RSS ou Atom, que le serveur va chercher et garde un moment. Ici, ce qui
 * se lit sans réseau : un flux en articles, l'adresse du flux annoncée par une page, celle d'une chaîne YouTube.
 */

/** Un article d'un flux, tel que la page le montre : son titre, son adresse, sa date (ISO, vide sans date), son image. */
export interface ArticleFlux {
  titre: string;
  url: string;
  date: string;
  image: string;
  /** L'identifiant d'une vidéo YouTube, pour la lire dans la page. */
  video: string;
}

const ENTITES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ', rsquo: '’', lsquo: '‘', laquo: '«', raquo: '»', hellip: '…', eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç' };
const decoder = (t: string) => t
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch { return ''; } })
  .replace(/&#(\d+);/g, (_, d) => { try { return String.fromCodePoint(Number(d)); } catch { return ''; } })
  .replace(/&([a-z]+);/gi, (m, n) => ENTITES[n.toLowerCase()] ?? m);

/** Le texte d'une balise : sans CDATA, sans balises HTML, ses entités décodées, sur une ligne. */
function texteDe(brut: string): string {
  const sansCdata = brut.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  // Un titre en HTML échappé (`&lt;b&gt;`) se décode d'abord, puis perd ses balises.
  return decoder(decoder(sansCdata).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

const balise = (bloc: string, nom: string) => new RegExp(`<${nom}(?:\\s[^>]*)?>([\\s\\S]*?)</${nom}>`, 'i').exec(bloc)?.[1] ?? '';
const attribut = (tag: string, nom: string) => decoder(new RegExp(`\\s${nom}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag)?.slice(1).find(v => v !== undefined) ?? '');

/** Une adresse absolue en http(s), ou rien. */
function absolue(url: string, base: string): string {
  // Une adresse vide n'est pas la page du flux.
  if (!url.trim()) return '';
  try {
    const u = new URL(url.trim(), base);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch { return ''; }
}

/** Une date lue dans un flux (RFC 822 en RSS, ISO en Atom), en ISO ; vide si elle ne se lit pas. */
function dateDe(brut: string): string {
  const t = Date.parse(texteDe(brut));
  return Number.isNaN(t) ? '' : new Date(t).toISOString();
}

/** Ce texte est-il un flux RSS ou Atom ? */
export const estFlux = (texte: string) => /<(rss|feed|rdf:RDF)[\s>]/i.test(texte.slice(0, 5000));

/** L'image d'un article : sa vignette média, son enclosure image, ou la première image de son contenu. */
function imageDe(bloc: string, base: string): string {
  for (const tag of bloc.match(/<media:(?:thumbnail|content)\b[^>]*>/gi) ?? []) {
    const url = attribut(tag, 'url');
    const type = attribut(tag, 'type');
    if (url && (!type || type.startsWith('image/')) && (/thumbnail/i.test(tag) || /^image\//.test(type) || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url))) return absolue(url, base);
  }
  for (const tag of bloc.match(/<enclosure\b[^>]*>/gi) ?? []) if (attribut(tag, 'type').startsWith('image/')) return absolue(attribut(tag, 'url'), base);
  const contenu = decoder(balise(bloc, 'content:encoded') || balise(bloc, 'description') || balise(bloc, 'content') || balise(bloc, 'summary'));
  const img = /<img\b[^>]*\ssrc\s*=\s*["']([^"']+)["']/i.exec(contenu.replace(/<!\[CDATA\[|\]\]>/g, ''))?.[1];
  return img ? absolue(img, base) : '';
}

/** L'adresse d'un article Atom : son `<link rel="alternate">`, ou son premier lien. */
function lienAtom(bloc: string, base: string): string {
  const liens = bloc.match(/<link\b[^>]*>/gi) ?? [];
  const alt = liens.find(l => !/\srel\s*=/i.test(l) || /\srel\s*=\s*["']alternate["']/i.test(l)) ?? liens[0];
  return alt ? absolue(attribut(alt, 'href'), base) : '';
}

/**
 * Les articles d'un flux RSS 2.0, RSS 1.0 ou Atom, du plus récent au plus ancien, `max` au plus. Un article sans titre ni
 * adresse n'est pas gardé ; sans date, il garde sa place dans le flux.
 */
export function lireFlux(xml: string, base: string, max = 10): ArticleFlux[] {
  const atom = /<feed[\s>]/i.test(xml.slice(0, 5000));
  const blocs = xml.match(atom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  const articles = blocs.map((bloc, rang) => {
    const video = /<yt:videoId>([\w-]{11})<\/yt:videoId>/.exec(bloc)?.[1] ?? '';
    const url = atom ? lienAtom(bloc, base) : absolue(texteDe(balise(bloc, 'link')) || attribut(/<item\b[^>]*>/i.exec(bloc)?.[0] ?? '', 'rdf:about') || texteDe(balise(bloc, 'guid')), base);
    const date = dateDe(balise(bloc, 'published') || balise(bloc, 'pubDate') || balise(bloc, 'dc:date') || balise(bloc, 'updated'));
    return { rang, article: { titre: texteDe(balise(bloc, 'title')).slice(0, 200), url, date, image: video ? `https://i.ytimg.com/vi/${video}/hqdefault.jpg` : imageDe(bloc, base), video } };
  }).filter(x => x.article.url && x.article.titre);
  // Le plus récent d'abord : la plupart des flux le sont déjà, certains non (un podcast rangé du premier épisode au dernier).
  if (articles.every(x => x.article.date)) articles.sort((a, b) => b.article.date.localeCompare(a.article.date) || a.rang - b.rang);
  return articles.slice(0, max).map(x => x.article);
}

/**
 * L'adresse du flux qu'une page annonce dans son `<head>` (`<link rel="alternate" type="application/rss+xml">`), RSS ou
 * Atom, en préférant celui qui n'est pas celui des commentaires. Vide si elle n'en annonce pas.
 */
export function fluxAnnonce(html: string, base: string): string {
  const liens = (html.match(/<link\b[^>]*>/gi) ?? []).filter(l => /\srel\s*=\s*["']?alternate/i.test(l) && /application\/(rss|atom)\+xml/i.test(attribut(l, 'type')));
  const choisi = liens.find(l => !/comment/i.test(attribut(l, 'title') + attribut(l, 'href'))) ?? liens[0];
  return choisi ? absolue(attribut(choisi, 'href'), base) : '';
}

/** L'identifiant d'une chaîne YouTube (`UC…`) lu dans son adresse, ou dans sa page : son flux, son lien canonique, ses données. */
export function idChaine(texte: string): string {
  return /(?:channel_id=|youtube\.com\/channel\/|"(?:channelId|externalId|browseId)"\s*:\s*")(UC[\w-]{22})/.exec(texte)?.[1]
    ?? /<meta\s+itemprop=["'](?:identifier|channelId)["']\s+content=["'](UC[\w-]{22})["']/i.exec(texte)?.[1] ?? '';
}

/** Le flux des vidéos d'une chaîne, et celui de ses seules vidéos longues (sans les Shorts ni les directs), la liste `UULF`. */
export const fluxChaine = (id: string) => `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`;
export const fluxVideosLongues = (id: string) => `https://www.youtube.com/feeds/videos.xml?playlist_id=UULF${id.slice(2)}`;
