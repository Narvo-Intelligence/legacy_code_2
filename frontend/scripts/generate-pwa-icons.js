/**
 * Generate PWA PNG icons (192, 512) from public/narvo_logo.svg.
 * Run from repo root: node frontend/scripts/generate-pwa-icons.js
 * Requires: npm i @resvg/resvg-js --save-dev
 */
const fs = require('fs');
const path = require('path');

const SVG_PATH = path.join(__dirname, '../public/narvo_logo.svg');
const OUT_DIR = path.join(__dirname, '../public');

const sizes = [192, 512];

function main() {
  let Resvg;
  try {
    Resvg = require('@resvg/resvg-js').Resvg;
  } catch (e) {
    console.error('Install @resvg/resvg-js: npm i @resvg/resvg-js --save-dev');
    process.exit(1);
  }

  const svg = fs.readFileSync(SVG_PATH, 'utf8');

  for (const size of sizes) {
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
    const pngBuffer = resvg.render().asPng();
    const outPath = path.join(OUT_DIR, `narvo-icon-${size}.png`);
    fs.writeFileSync(outPath, pngBuffer);
    console.log('Wrote', outPath);
  }
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
