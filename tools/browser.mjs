/**
 * Playwright helpers shared by every render tool.
 * Uses the locally installed Chromium from the Playwright cache; set
 * CHROME_PATH to override. Each worker gets its own browser process.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

function latestChromium() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const candidates = [];
  try {
    const ep = chromium.executablePath();
    if (ep && fs.existsSync(ep)) candidates.push(ep);
  } catch { /* ignore */ }
  const roots = [
    path.join(process.env.LOCALAPPDATA || '', 'ms-playwright'),
    path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright'),
    '/root/.cache/ms-playwright',
    path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'),
  ].filter(Boolean);
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const dir of fs.readdirSync(root)) {
      if (!dir.startsWith('chromium-')) continue;
      for (const rel of [
        ['chrome-win64', 'chrome.exe'],
        ['chrome-win', 'chrome.exe'],
        ['chrome-linux', 'chrome'],
        ['chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'],
        ['chrome-mac-arm64', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'],
      ]) {
        const p = path.join(root, dir, ...rel);
        if (fs.existsSync(p)) candidates.push(p);
      }
    }
  }
  candidates.sort((a, b) => b.localeCompare(a));
  return candidates[0] || null;
}

export const CHROME = latestChromium();

export async function launch({ width = 1920, height = 1080, headless = true } = {}) {
  if (!CHROME) throw new Error('No Chromium executable found. Set CHROME_PATH.');
  const args = [
    '--force-color-profile=srgb',
    '--disable-lcd-text',
    '--font-render-hinting=none',
    '--disable-features=Translate',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--autoplay-policy=no-user-gesture-required',
    '--window-size=' + width + ',' + height,
  ];
  if (process.platform === 'win32') args.push('--use-angle=d3d11');
  const browser = await chromium.launch({ executablePath: CHROME, headless, args });
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const close = async () => {
    try { await context.close(); } catch {}
    try { await browser.close(); } catch {}
  };
  return { browser, context, close };
}

export async function openPage(browser, url, { timeout = 300000, quiet = false } = {}) {
  const context = browser.contexts()[0] || await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => { errors.push(String(e)); if (!quiet) console.log('[pageerror]', e.message); });
  page.on('console', (m) => {
    if (m.type() === 'error') {
      errors.push(m.text());
      if (!quiet) console.log('[page error]', m.text());
    }
  });
  await page.goto(url, { waitUntil: 'load', timeout });
  await page.waitForFunction('window.READY === true || !!window.__FATAL', { timeout, polling: 150 });
  const fatal = await page.evaluate(() => window.__FATAL || null);
  if (fatal) throw new Error('page failed to initialise: ' + fatal);
  return { page, errors };
}

export async function openFilm(browser, url) {
  return openPage(browser, url);
}
