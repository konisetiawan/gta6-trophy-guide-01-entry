import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/shot/node_modules/playwright');
const port = 4177;
const baseUrl = 'http://127.0.0.1:' + port + '/';
const server = spawn(process.execPath, ['tools/serve.mjs'], {
  env: { ...process.env, PORT: String(port) },
  stdio: 'ignore',
});
let browser;

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error('Local app server did not start.');
}

async function ready(page, selector) {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 15000 });
  await delay(700);
}

async function capture(page, file) {
  await page.screenshot({
    path: 'screenshots/' + file,
    type: 'jpeg',
    quality: 82,
    fullPage: false,
    animations: 'disabled',
  });
}

try {
  await mkdir('screenshots', { recursive: true });
  await waitForServer();
  browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(baseUrl + '?seed=13', { waitUntil: 'networkidle' });
  await ready(page, '.trophy-list .trophy-row');
  await ready(page, '#auditStrip');
  await capture(page, '1-cover.jpg');

  await page.locator('.tab[data-tab="roadmap"]').click();
  await ready(page, '.roadmap-list .stage-card');
  await ready(page, '.compact-check .task-row');
  await capture(page, '2-roadmap.jpg');

  await page.locator('.tab[data-tab="missables"]').click();
  await ready(page, '.flag-groups .flag-card');
  await capture(page, '3-missables.jpg');

  await page.locator('.tab[data-tab="sources"]').click();
  await ready(page, '.source-matrix tbody tr');
  await capture(page, '4-sources.jpg');
  process.stdout.write('Captured all four app screenshots.\n');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
