#!/usr/bin/env node
/**
 * Frame renderer: several headless Chromium workers render deterministic
 * 1920×1080 JPEG frames. The film is a pure function of time, so frames can be
 * rendered out of order, resumed, or split across machines.
 *
 *   node tools/render.mjs                       # all 8,280 frames
 *   node tools/render.mjs --from 0 --to 599     # frame numbers, inclusive
 *   node tools/render.mjs --workers 4 --resume
 *   node tools/render.mjs --draft               # 1280×720 JPEGs in frames_draft
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer, ROOT } from './server.mjs';
import { launch, openPage } from './browser.mjs';
import { FPS, FRAMES } from '../src/beat/clock.js';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    out[k] = v;
  }
  return out;
}
const a = parseArgs(process.argv.slice(2));
const draft = !!a.draft;
const from = Math.max(0, parseInt(a.from ?? '0', 10));
const to = Math.min(FRAMES - 1, parseInt(a.to ?? String(FRAMES - 1), 10));
const workers = Math.max(1, Math.min(8, parseInt(a.workers ?? '4', 10)));
const restartEvery = Math.max(300, parseInt(a.restartEvery ?? '1800', 10));
const outDir = path.resolve(ROOT, a.out || (draft ? 'output/v6_work/frames_draft' : 'output/v6_work/frames'));
const quality = parseInt(a.quality ?? '95', 10);
fs.mkdirSync(outDir, { recursive: true });
const ext = 'jpg';
const fileOf = (n) => path.join(outDir, `f${String(n).padStart(5, '0')}.${ext}`);
const todo = [];
for (let n = from; n <= to; n++) {
  if (a.resume && fs.existsSync(fileOf(n)) && fs.statSync(fileOf(n)).size > 2 * 1024) continue;
  todo.push(n);
}
if (!todo.length) {
  console.log('all frames already rendered.');
  process.exit(0);
}
console.log(`rendering ${todo.length} frames [${from}..${to}] with ${workers} worker(s) → ${path.relative(ROOT, outDir)}`);

const srv = await startServer(0);
const t0 = Date.now();
let done = 0, failed = 0;
const errors = new Map();

async function worker(k) {
  const mine = todo.filter((_, i) => i % workers === k);
  if (!mine.length) return;
  let workerBrowser = null;
  let page = null;
  let pageErrors = [];
  const closeBrowser = async () => {
    if (!workerBrowser) return;
    try { await workerBrowser.close(); } catch {}
    workerBrowser = null; page = null;
  };
  const open = async () => {
    await closeBrowser();
    workerBrowser = await launch();
    const opened = await openPage(workerBrowser.browser, `${srv.url}/film.html?render=1`, { quiet: true });
    page = opened.page;
    pageErrors = opened.errors;
    await page.waitForFunction("!document.getElementById('loading')", { timeout: 20000 }).catch(() => {});
    if (to >= 112 * FPS) {
      // Contact prints for the final wall are needed before the outro frames.
      await page.evaluate(async () => { await window.__DFT.prepare(114); });
    }
    await page.evaluate(() => window.__DFT.seek(0));
  };
  await open();
  try {
    for (let idx = 0; idx < mine.length; idx++) {
      const n = mine[idx];
      let ok = false;
      for (let attempt = 0; attempt < 3 && !ok; attempt++) {
        try {
          if (idx > 0 && idx % restartEvery === 0) await open();
          const res = await page.evaluate((f) => window.renderFrame(f), n);
          if (res?.error) {
            const key = String(res.error).split('\n')[0];
            errors.set(key, res.error);
          }
          const clip = { x: 0, y: 0, width: 1920, height: 1080 };
          if (draft) clip.scale = 2 / 3;
          await page.screenshot({
            path: fileOf(n), type: 'jpeg', quality,
            clip, animations: 'disabled',
          });
          ok = true;
        } catch (e) {
          if (attempt === 2) {
            failed++;
            console.error(`frame ${n} failed: ${String(e.message || e).slice(0, 200)}`);
          } else {
            await new Promise((r) => setTimeout(r, 300));
            try { await open(); } catch (err) { console.error('reopen failed', err.message); }
          }
        }
      }
      done++;
      if (done % 120 === 0 || done === todo.length) {
        const elapsed = (Date.now() - t0) / 1000;
        const speed = done / elapsed;
        const eta = (todo.length - done) / Math.max(0.001, speed);
        console.log(`  ${done}/${todo.length}  ${speed.toFixed(2)} fps  elapsed ${Math.round(elapsed)}s  eta ${Math.round(eta)}s`);
      }
    }
  } finally {
    await closeBrowser();
  }
  if (pageErrors.length) {
    for (const e of pageErrors.filter((x) => !/404|favicon/i.test(x))) errors.set(e, e);
  }
}

try {
  await Promise.all(Array.from({ length: workers }, (_, k) => worker(k)));
} finally {
  await srv.close();
}
const elapsed = (Date.now() - t0) / 1000;
console.log(`\nframes done in ${elapsed.toFixed(1)}s · ${(todo.length / elapsed).toFixed(2)} fps · ${failed} failed`);
for (const e of errors.values()) console.error('  scene error:', String(e).split('\n')[0]);
if (failed || errors.size) {
  if (!failed) console.log('non-fatal scene messages are listed above; run qa-gate for details.');
  if (failed) process.exitCode = 1;
}
