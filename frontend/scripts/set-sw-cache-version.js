/**
 * Injects build-time cache version into public/sw.js before build.
 * Reads BUILD_ID or uses timestamp so each deploy gets a new cache key.
 * Run before vite build (e.g. in package.json "build": "node scripts/set-sw-cache-version.js && vite build").
 */
const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '..', 'public', 'sw.js');
let content = fs.readFileSync(swPath, 'utf8');

const version = process.env.BUILD_ID || process.env.VITE_BUILD_ID || `v${Date.now()}`;
const cacheName = `narvo-${version}`;

content = content.replace(/const CACHE_NAME = '[^']+';/, `const CACHE_NAME = '${cacheName}';`);
fs.writeFileSync(swPath, content);
console.log('[Narvo] SW cache name set to:', cacheName);
