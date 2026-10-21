#!/usr/bin/env node
/**
 * Still frames from the film surface.
 *   node tools/shot.mjs --t 5.8,12.5,48 --out output/v6_stills
 *   node tools/shot.mjs --scene 3 --u 0,2.2,4.6 --out output/v6_stills
 */
import fs from 'node:fs';
import path from 'node:path';
import { startServer, ROOT } from './server.mjs';
import { launch, openPage } from './browser.mjs';

function args() {
  const a = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith('--')) {
      const key = k.slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      a[key] = v;
    }
  }
  return a;
}
const a = args();
const out = path.resolve(ROOT, a.out || 'output/v6_stills');
fs.mkdirSync(out, { recursive: true });

const srv = await startServer(0);
const { browser, close } = await launch();
try {
  const { page } = await openPage(browser, `${srv.url}/film.html?render=1`);
  await page.waitForFunction("!document.getElementById('loading')", { timeout: 15000 }).catch(() => {});
  let items = [];
  if (a.scene != null) {
    const i = parseInt(a.scene, 10) - 1;
    const us = String(a.u || '0,2,4').split(',').map(Number);
    items = us.map((u) => ({ t: 6 + i * 6 + u, label: `scene_${i + 1}_u${u}` }));
  } else {
    const ts = String(a.t || '0,6,12,60,114,137').split(',').map(Number);
    items = ts.map((t) => ({ t, label: `t${t.toFixed(2)}` }));
  }
  for (const it of items) {
    const res = await page.evaluate(async (t) => await window.renderAt(t), it.t);
    const file = path.join(out, `${it.label}.png`);
    await page.screenshot({ path: file, type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    console.log(`${file}  ${JSON.stringify({ section: res.section, error: res.error, texts: res.texts.length })}`);
  }
} finally {
  await close();
  await srv.close();
}
