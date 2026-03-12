/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const deps = Object.keys(PKG.dependencies || {});

function getFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFiles(full));
    } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const files = getFiles(SRC_DIR);
const contents = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');

const unused = deps.filter((dep) => !contents.includes(`'${dep}'`) && !contents.includes(`\"${dep}\"`));

if (unused.length === 0) {
  console.log('No unused dependencies detected.');
  process.exit(0);
}

console.log('Potentially unused dependencies:');
unused.forEach((dep) => console.log(`- ${dep}`));
process.exit(1);

