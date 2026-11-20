import { spawn } from 'node:child_process';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createRequire } from 'node:module';

const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const screenshotsDir = path.join(repo, 'screenshots');
const require = createRequire('/home/hatch/workspace/shot/package.json');
const { chromium } = require('/home/hatch/workspace/shot/node_modules/playwright');
const server = spawn(process.execPath, [path.join(repo, 'tools', 'serve.mjs')], {
  cwd: repo,
  stdio: ['ignore', 'pipe', 'inherit'],
});

let serverOutput = '';
let port;
const ready = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Timed out waiting for the local HTTP server.')), 10000);
  server.stdout.setEncoding('utf8');
  server.stdout.on('data', (chunk) => {
    serverOutput += chunk;
    const match = serverOutput.match(/PORT=([0-9]+)/);
    if (match && !port) {
      port = Number(match[1]);
      clearTimeout(timeout);
      resolve();
    }
  });
  server.once('error', (error) => {
    clearTimeout(timeout);
    reject(error);
  });
  server.once('exit', (code) => {
    if (!port) {
      clearTimeout(timeout);
      reject(new Error('Local server exited before becoming ready (code ' + code + ').'));
    }
  });
});

async function requireCount(locator, label, minimum) {
  await locator.first().waitFor({ state: 'visible' });
  const count = await locator.count();
  if (count < minimum) throw new Error(label + ': expected at least ' + minimum + ', found ' + count + '.');
}

let browser;
try {
  await ready;
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(10000);
  const base = 'http://127.0.0.1:' + port;
  const captures = [
    { file: '1-cover.jpg', tab: null, path: '/?seed=13' },
    { file: '2-roadmap.jpg', tab: 'roadmap' },
    { file: '3-missables.jpg', tab: 'missables' },
    { file: '4-sources.jpg', tab: 'sources' },
  ];

  for (let index = 0; index < captures.length; index++) {
    const capture = captures[index];
    if (index === 0) {
      await page.goto(base + capture.path, { waitUntil: 'networkidle' });
      await requireCount(page.locator('.trophy-list .trophy-row'), 'Trophy checklist', 55);
      await page.locator('.detail-panel h2').waitFor({ state: 'visible' });
      await page.waitForFunction(() => document.querySelector('#auditStrip')?.textContent.includes('55 official'));
      const earnedCount = await page.locator('#earnedCount').textContent();
      if (!earnedCount.includes('13 / 55 earned')) throw new Error('Seeded cover did not show 13 earned trophies.');
    } else {
      await page.locator('.tab[data-tab="' + capture.tab + '"]').click();
      await page.locator('.tab[data-tab="' + capture.tab + '"].active').waitFor({ state: 'visible' });
    }

    if (capture.tab === 'roadmap') {
      await requireCount(page.locator('.roadmap-list .stage-card'), 'Roadmap stages', 7);
      await requireCount(page.locator('.compact-check .task-row'), '100% checklist tasks', 35);
    }
    if (capture.tab === 'missables') {
      await requireCount(page.locator('.flag-groups .flag-card'), 'Missable and method status groups', 4);
    }
    if (capture.tab === 'sources') {
      await requireCount(page.locator('.source-matrix tbody tr'), 'Source matrix rows', 7);
    }
    await delay(350);

    let bytes;
    let quality;
    for (quality of [82, 76, 70, 64, 58, 52]) {
      const image = await page.screenshot({
        path: path.join(screenshotsDir, capture.file),
        type: 'jpeg',
        quality,
        fullPage: false,
        animations: 'disabled',
      });
      bytes = image.length;
      if (bytes <= 256 * 1024) break;
    }
    if (bytes > 256 * 1024) throw new Error(capture.file + ' still exceeds 256 KiB at the minimum quality.');
    console.log(capture.file + ': ' + bytes + ' bytes at JPEG quality ' + quality);
  }
} finally {
  if (browser) await browser.close();
  if (server.exitCode === null && !server.killed) {
    server.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => server.once('exit', resolve)),
      delay(3000).then(() => { if (server.exitCode === null) server.kill('SIGKILL'); }),
    ]);
  }
}
