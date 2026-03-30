/**
 * Capture real PWA screenshots (mobile + wide) using Playwright.
 * Ensures the app is built and served, then captures / and /dashboard.
 *
 * Usage:
 *   npm run build && node scripts/capture-pwa-screenshots.js
 * Or with app already running at BASE_URL:
 *   BASE_URL=http://localhost:3000 node scripts/capture-pwa-screenshots.js
 *
 * Requires: npm i -D playwright
 * First run: npx playwright install chromium
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

const OUT_DIR = path.join(__dirname, '../public');
const WIDE_SIZE = { width: 1536, height: 1024 };
const MOBILE_SIZE = { width: 1024, height: 1536 };
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const WAIT_MS = 4000;
const SERVE_PORT = 3000;

function waitForServer(url, maxAttempts = 30) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const tryFetch = () => {
            attempts++;
            const req = http.get(url, (res) => {
                res.resume();
                resolve();
            });
            req.on('error', () => {
                if (attempts >= maxAttempts) reject(new Error(`Server not ready at ${url} after ${maxAttempts} attempts`));
                else setTimeout(tryFetch, 500);
            });
        };
        tryFetch();
    });
}

async function main() {
    let serveProcess = null;
    const useExternalServer = !!process.env.BASE_URL;

    if (!useExternalServer) {
        const buildDir = path.join(__dirname, '../build');
        if (!fs.existsSync(path.join(buildDir, 'index.html'))) {
            console.error('No build found. Run: npm run build');
            process.exit(1);
        }
        console.log('Starting static server on port', SERVE_PORT, '...');
        serveProcess = spawn('npx', ['serve', '-s', buildDir, '-l', String(SERVE_PORT)], {
            cwd: path.join(__dirname, '..'),
            stdio: 'ignore',
            shell: true,
        });
        await waitForServer(BASE_URL);
        await new Promise((r) => setTimeout(r, 1500));
    }

    let playwright;
    try {
        playwright = require('playwright');
    } catch (e) {
        console.error('Install Playwright: npm i -D playwright && npx playwright install chromium');
        process.exit(1);
    }

    const browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });

    try {
        // Wide screenshot (dashboard for "Desktop View")
        const pageWide = await context.newPage();
        await pageWide.setViewportSize(WIDE_SIZE);
        await pageWide.goto(`${BASE_URL}`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => pageWide.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 }));
        await new Promise((r) => setTimeout(r, WAIT_MS));
        const widePath = path.join(OUT_DIR, 'screenshot-wide.png');
        await pageWide.screenshot({ path: widePath, type: 'png' });
        console.log('Wrote', widePath);
        await pageWide.close();

        // Mobile screenshot (feed for "Mobile View")
        const pageMobile = await context.newPage();
        await pageMobile.setViewportSize(MOBILE_SIZE);
        await pageMobile.goto(`${BASE_URL}`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => pageMobile.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 }));
        await new Promise((r) => setTimeout(r, WAIT_MS));
        const mobilePath = path.join(OUT_DIR, 'screenshot-mobile.png');
        await pageMobile.screenshot({ path: mobilePath, type: 'png' });
        console.log('Wrote', mobilePath);
        await pageMobile.close();
    } finally {
        await browser.close();
        if (serveProcess) serveProcess.kill();
    }

    console.log('Done.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
