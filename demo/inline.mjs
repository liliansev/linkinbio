import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
// L'Artifact enveloppe lui-même la page : on ne garde que le titre, le style, la racine et le script.
const dir = join(import.meta.dirname, 'dist');
const html = readFileSync(join(dir, 'index.html'), 'utf8');
const js = readFileSync(join(dir, /src="\.\/(assets\/[^"]+\.js)"/.exec(html)[1]), 'utf8').replace(/<\/script/g, '<\\/script');
const css = readFileSync(join(dir, /href="\.\/(assets\/[^"]+\.css)"/.exec(html)[1]), 'utf8');
const page = `<title>Hopla</title>
<style>:root{color-scheme:dark;background:#0c121f}body{background:#0c121f;color:#f4f1ec}</style>
<style>${css}</style>
<div id="app"></div>
<script type="module">${js}</script>
`;
writeFileSync(join(dir, 'liens-apercu.html'), page);
console.log('ok', (page.length / 1024).toFixed(0), 'Ko');
