#!/usr/bin/env node
/**
 * Contact-sheet gate. Renders key frames from each era and tiles them into one
 * review image. Use it after every batch of scenes.
 *
 *   node tools/contact-sheet.mjs                     # every era, 3 bars each (54 frames)
 *   node tools/contact-sheet.mjs --eras              # 18-era highlight sheet
 *   node tools/contact-sheet.mjs --scenes 1,2,3,4    # a batch
 *   node tools/contact-sheet.mjs --cols 6 --thumb 500
 */
import fs from 'node:fs';
import path from 'node:path';
import { startServer, ROOT } from './server.mjs';
import { launch, openPage } from './browser.mjs';

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
const cols = Math.max(2, parseInt(a.cols || '6', 10));
const thumb = Math.max(220, parseInt(a.thumb || '480', 10));
const only = a.scenes ? String(a.scenes).split(',').map((x) => parseInt(x, 10)).filter((n) => n >= 1 && n <= 18) : null;
const mode = a.eras ? 'eras' : 'beats';
// Hand-picked high points for the final 18-era sheet. A gallery panel should
// show each era at its most legible / spectacular, not necessarily at the
// freeze-frame used for the outro wall.
const HIGHLIGHTS = {
  1: 2.7, 2: 3.5, 3: 3.15, 4: 2.85, 5: 2.95, 6: 2.45,
  7: 2.6, 8: 2.85, 9: 3.2, 10: 3.25, 11: 3.4, 12: 2.85,
  13: 3.35, 14: 4.35, 15: 3.25, 16: 2.8, 17: 2.8, 18: 3.2,
};
const outFile = path.resolve(ROOT, a.out || (mode === 'eras'
  ? 'output/v6_pelican_paradigm/contact_sheet_18_eras.png'
  : 'output/v6_qa/contact_sheet_beats.png'));
fs.mkdirSync(path.dirname(outFile), { recursive: true });

const stamp = `${process.pid}-${Date.now()}`;
const tmpDir = path.join(ROOT, 'output', 'v6_work', `_sheet_${stamp}`);
fs.mkdirSync(tmpDir, { recursive: true });
const relTmp = path.relative(ROOT, tmpDir).replace(/\\/g, '/');

const srv = await startServer(0);
const { browser, close } = await launch();

const scenes = [];
for (let i = 0; i < 18; i++) {
  if (only && !only.includes(i + 1)) continue;
  scenes.push(i);
}
if (!scenes.length) throw new Error('no scenes selected');

const items = [];
for (const i of scenes) {
  const spec = (await import('../src/main/manifest.js')).SCENE_SPECS[i];
  const start = 6 + i * 6;
  if (mode === 'eras') {
    const u = a.u ? parseFloat(a.u) : (HIGHLIGHTS[i + 1] ?? spec.freezeU ?? 2.6);
    items.push({ i, u, t: start + u, label: `${spec.no}  ${spec.zh}`, sub: `HIGHLIGHT · u ${u.toFixed(2)}s · ${spec.year}` });
  } else {
    const beats = [
      { u: 0.85, name: 'BAR 1 · 入画' },
      { u: 2.55, name: 'BAR 2 · 奇观' },
      { u: 4.65, name: 'BAR 3 · 诗眼' },
    ];
    for (const b of beats) {
      items.push({ i, u: b.u, t: start + b.u, label: `${spec.no}  ${spec.zh}`, sub: `${b.name} · u ${b.u.toFixed(2)}s` });
    }
  }
}

const t0 = Date.now();
let failures = 0;
try {
  const { page, errors } = await openPage(browser, `${srv.url}/film.html?render=1`, { quiet: true });
  await page.waitForFunction("!document.getElementById('loading')");
  for (let n = 0; n < items.length; n++) {
    const it = items[n];
    const res = await page.evaluate(async (t) => await window.renderAt(t), it.t);
    if (res?.error) { failures++; console.error('render error', it.label, res.error); }
    const file = path.join(tmpDir, `${String(n).padStart(3, '0')}.jpg`);
    await page.screenshot({
      path: file, type: 'jpeg', quality: 93,
      clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 0.5 },
      animations: 'disabled',
    });
    it.src = `/${relTmp}/${String(n).padStart(3, '0')}.jpg`;
    if (n % 6 === 5) process.stdout.write(`  captured ${n + 1}/${items.length}\n`);
  }
  if (errors.length) console.warn('page errors:', errors.slice(0, 4));

  // Build the sheet as a real page, then screenshot it.
  const rows = Math.ceil(items.length / cols);
  const capSize = Math.max(11, Math.round(thumb * 0.0215));
  const numSize = Math.max(10, Math.round(thumb * 0.0205));
  const subSize = Math.max(8, Math.round(thumb * 0.014));
  const sheetTitle = mode === 'eras' ? '少陵测试 · 18 个时代接触表' : '少陵测试 · 每版块三小节核查表';
  const sheetSub = mode === 'eras'
    ? '18 ERAS / ONE CONTINUOUS 4,739 KM SCROLL · DETERMINISTIC FRAME SAMPLES'
    : 'EACH ERA · BAR 1 ENTRY / BAR 2 WONDER / BAR 3 POET\'S EYE';
  const cells = items.map((it, n) => `
    <figure class="cell">
      <div class="img-wrap"><img src="${it.src}" alt="${escapeHtml(it.label)}"></div>
      <figcaption>
        <span class="num">${String(it.i + 1).padStart(2, '0')}</span>
        <span class="label">${escapeHtml(it.label.replace(/^\d+\s+/, ''))}</span>
        <span class="sub">${escapeHtml(it.sub)}</span>
      </figcaption>
    </figure>`).join('');
  const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<link rel="stylesheet" href="/styles/fonts.css">
<style>
  :root { --paper:#eadfc8; --dim:#877d6c; --red:#c23a2b; --gold:#c6a45f; --line:rgba(225,210,182,.16); }
  * { box-sizing:border-box; }
  html,body { margin:0; background:#0b0a08; color:var(--paper); }
  body { padding:44px 48px 34px; font-family:"Noto Serif SC",serif; }
  header { display:flex; justify-content:space-between; align-items:flex-end; padding-bottom:18px; border-bottom:1px solid var(--line); }
  .kicker { font:500 10px/1 "Cascadia Mono",monospace; letter-spacing:.28em; color:var(--red); margin-bottom:12px; }
  h1 { margin:0; font-family:"Source Han Serif SC",serif; font-weight:700; font-size:34px; letter-spacing:.1em; }
  .sub { margin-top:10px; font:500 9px/1.5 "Cascadia Mono",monospace; letter-spacing:.18em; color:var(--dim); }
  .right { text-align:right; font:500 9px/1.9 "Cascadia Mono",monospace; letter-spacing:.12em; color:var(--dim); }
  .right strong { color:var(--gold); font-weight:500; }
  main { display:grid; grid-template-columns:repeat(${cols}, 1fr); gap:18px 14px; padding-top:24px; }
  .cell { margin:0; min-width:0; }
  .img-wrap { position:relative; background:#050505; border:1px solid rgba(202,166,99,.36); outline:1px solid rgba(0,0,0,.85); outline-offset:0; box-shadow:0 8px 24px rgba(0,0,0,.36); }
  .img-wrap::after { content:""; position:absolute; inset:0; box-shadow:inset 0 0 0 1px rgba(235,220,190,.06); pointer-events:none; }
  img { display:block; width:100%; height:auto; }
  figcaption { display:flex; align-items:baseline; gap:9px; padding:8px 1px 0; font-size:${capSize}px; }
  .num { font:500 ${numSize}px/1 "Cascadia Mono",monospace; color:var(--red); letter-spacing:.04em; min-width:2.2em; }
  .label { font-family:"Source Han Serif SC",serif; font-weight:600; letter-spacing:.09em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  figcaption .sub { margin-left:auto; font:400 ${subSize}px/1 "Cascadia Mono",monospace; letter-spacing:.05em; color:var(--dim); white-space:nowrap; }
  footer { display:flex; justify-content:space-between; margin-top:30px; padding-top:14px; border-top:1px solid var(--line); font:500 9px/1.6 "Cascadia Mono",monospace; letter-spacing:.12em; color:var(--dim); }
  .seal { display:inline-grid; place-items:center; width:22px; height:22px; border:1px solid var(--red); color:var(--red); font-family:"Source Han Serif SC",serif; font-size:10px; margin-right:8px; transform:rotate(-2deg); }
</style></head><body>
<header>
  <div><div class="kicker">THE DU FU TEST · CONTACT SHEET</div><h1>${escapeHtml(sheetTitle)}</h1><div class="sub">${escapeHtml(sheetSub)}</div></div>
  <div class="right"><strong>${items.length} FRAMES</strong><br>1920 × 1080 · 60 FPS · 120 BPM<br>ALL PIXELS DRAWN BY CODE · NO EXTERNAL ART</div>
</header>
<main>${cells}</main>
<footer><div><span class="seal">少陵</span>18 ERAS + 1 EMPTY SEAT · 4,739 KM · 1,455 POEMS</div><div>REVIEW COPY · RENDERED FROM renderAt(t)</div></footer>
</body></html>`;
  const sheetFile = path.join(tmpDir, 'sheet.html');
  fs.writeFileSync(sheetFile, html, 'utf8');
  await page.goto(`${srv.url}/${relTmp}/sheet.html`, { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode().catch(() => null)));
  });
  await page.waitForTimeout(120);
  const width = Math.min(4096, cols * (thumb + 18) + 96);
  await page.setViewportSize({ width: Math.max(1200, width), height: 1200 });
  await page.screenshot({ path: outFile, fullPage: true, type: 'png', animations: 'disabled' });
  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n${path.relative(ROOT, outFile)}  (${items.length} frames, ${sec}s, ${failures} errors)`);
  if (failures) process.exitCode = 2;
  if (!a.keep) fs.rmSync(tmpDir, { recursive: true, force: true });
} finally {
  await close();
  await srv.close();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
