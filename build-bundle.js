// Bundle-Skript: schreibt eine einzige `Raumkalender.html`-Datei, die alle
// nötigen Assets (CSS, Daten, App-Logik, Word-/Excel-Libraries) inline enthält.
// So lässt sie sich per Mail verschicken und lokal mit Browser öffnen — kein
// Server nötig.
//
// Aufruf: `node build-bundle.js`

import fs from 'node:fs';

const files = {
  html:   'index.html',
  css:    'style.css',
  data:   'data.js',
  script: 'script.js',
  xlsx:   'xlsx.bundle.js',
  docx:   'docx.umd.js',
};

for (const path of Object.values(files)) {
  if (!fs.existsSync(path)) {
    console.error(`FEHLT: ${path}`);
    process.exit(1);
  }
}

const read = (p) => fs.readFileSync(p, 'utf8');
const html   = read(files.html);
const css    = read(files.css);
const data   = read(files.data);
const script = read(files.script);
const xlsx   = read(files.xlsx);
const docx   = read(files.docx);

// </script>-Sequenzen im JS-Inhalt entschärfen, damit der HTML-Parser nicht aussteigt
const inlineScript = (content, label = '') => {
  const safe = content.replace(/<\/script>/g, '<\\/script>');
  const prefix = label ? `    <!-- ${label} -->\n    ` : '';
  return `${prefix}<script>\n${safe}\n</script>`;
};

let out = html;
out = out.replace(/<link rel="stylesheet" href="style\.css[^"]*">/, `<style>\n${css}\n</style>`);
out = out.replace(/<script src="xlsx\.bundle\.js"><\/script>/, inlineScript(xlsx, 'xlsx-js-style v1.2.0 (Excel-Export mit Styles)'));
out = out.replace(/<script src="docx\.umd\.js"><\/script>/,   inlineScript(docx, 'docx v9.x (Word-Export)'));
out = out.replace(/<script src="data\.js[^"]*"><\/script>/,   inlineScript(data, 'PHBern-Raumdaten Snapshot'));
out = out.replace(/<script src="script\.js[^"]*"><\/script>/, inlineScript(script, 'Raumkalender-App'));

// Cache-Buster-Query-Strings sind in einer Single-File irrelevant — entfernen
out = out.replace(/\?v=[A-Za-z0-9]+/g, '');

// Banner mit Build-Zeitpunkt
const d = new Date();
const pad = (n) => String(n).padStart(2, '0');
const dateStr = `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const banner = `<!--
  Raumkalender (Single-File) — gebaut am ${dateStr}
  Per Mail verschicken, lokal mit Browser öffnen — kein Server nötig.
  Quelle der Daten: https://apps.phbern.ch/raumkalender/
-->
`;
out = banner + out;

fs.writeFileSync('Raumkalender.html', out);
const kb = (fs.statSync('Raumkalender.html').size / 1024).toFixed(1);
console.log(`✓ Raumkalender.html (${kb} KB)`);
