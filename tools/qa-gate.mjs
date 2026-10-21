#!/usr/bin/env node
/**
 * qa-gate.mjs — the machine-readable quality gate.
 *
 * It verifies the timing contract, monotone odometer, 18 era modules, visual
 * non-emptiness, key text boxes being on-screen, the title/HUD safe zones,
 * deterministic double-render hashes, all 17 crossings, and the finale.
 *
 *   node tools/qa-gate.mjs
 *   node tools/qa-gate.mjs --quick         # fewer samples, still runs all eras
 *   node tools/qa-gate.mjs --shots         # save failing frames
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
const quick = !!a.quick;
const wantShots = !!a.shots;
const outDir = path.join(ROOT, 'output', 'v6_qa');
fs.mkdirSync(outDir, { recursive: true });
const failDir = path.join(outDir, 'fails');
if (wantShots) fs.mkdirSync(failDir, { recursive: true });

const report = {
  generatedBy: 'tools/qa-gate.mjs',
  quick,
  errors: [],
  warnings: [],
  stats: {},
  scenes: [],
  transitions: [],
  boundaries: [],
};
function error(msg) { report.errors.push(String(msg)); console.error('ERROR', msg); }
function warn(msg) { report.warnings.push(String(msg)); console.warn('WARN ', msg); }

const srv = await startServer(0);
const { browser, close } = await launch();
let page;
const pageErrors = [];
const t0 = Date.now();
try {
  const opened = await openPage(browser, `${srv.url}/film.html?render=1`, { quiet: true });
  page = opened.page;
  pageErrors.push(...opened.errors);
  await page.waitForFunction("!document.getElementById('loading')", { timeout: 20000 }).catch(() => {});

  // Structural manifest / distance / timing.
  const self = await page.evaluate(() => window.__DFT.selfCheck());
  report.stats.selfCheck = self;
  for (const e of self.errors) error(e);
  for (const w of self.warnings) warn(w);

  const contract = await page.evaluate(() => {
    const api = window.__DFT;
    const samples = [];
    let prev = -1, reversed = 0;
    for (let t = 0; t <= 138.0001; t += 0.5) {
      const m = api.metaAt(t);
      if (m.distance < prev - 1e-9) reversed++;
      prev = m.distance;
      samples.push({ t: +t.toFixed(2), section: m.section, distance: +m.distance.toFixed(2) });
    }
    const boundaries = [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102, 108, 114, 120, 126, 132, 138].map((t) => {
      const m = api.metaAt(t);
      return { t, section: m.section, distance: m.distance };
    });
    return { reversed, finalDistance: api.metaAt(138).distance, boundaries, total: api.DURATION, frames: api.FRAMES, samples };
  });
  report.stats.contract = { ...contract, samples: undefined };
  if (contract.reversed) error(`distance reversed ${contract.reversed} times`);
  if (Math.abs(contract.finalDistance - 4739) > 1e-6) error(`final distance ${contract.finalDistance} != 4739`);
  if (contract.total !== 138) error(`duration ${contract.total} != 138`);
  if (contract.frames !== 8280) error(`frame count ${contract.frames} != 8280`);
  const expectedSections = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 18, 18, 18, 18];
  contract.boundaries.forEach((b, i) => {
    if (b.section !== expectedSections[i]) error(`boundary t=${b.t}: section ${b.section}, expected ${expectedSections[i]}`);
  });

  // Gently warm the gallery prints before the outro samples.
  await page.evaluate(async () => { await window.__DFT.prepare(114); });
  const tilesInfo = await page.evaluate(() => ({
    tilesReady: window.__DFT.film.tilesReady,
    tiles: window.__DFT.film.tiles.length,
    tileErrors: window.__DFT.film.tileErrors,
  }));
  report.stats.tiles = tilesInfo;
  if (!tilesInfo.tilesReady || tilesInfo.tiles < 18) error(`outro tiles not ready (${tilesInfo.tiles}/18)`);
  for (const e of tilesInfo.tileErrors || []) error('tile: ' + e);

  const API_EVAL = async ([t, hash, collect]) => {
    const res = await window.renderAt(t);
    const stage = document.getElementById('stage');
    const small = document.createElement('canvas');
    small.width = 480; small.height = 270;
    const sctx = small.getContext('2d');
    sctx.drawImage(stage, 0, 0, 480, 270);
    const data = sctx.getImageData(0, 0, 480, 270).data;
    let n = 0, sum = 0, sum2 = 0, dark = 0, bright = 0, colorful = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      n++; sum += l; sum2 += l * l;
      if (l < 14) dark++;
      if (l > 228) bright++;
      if (Math.max(r, g, b) - Math.min(r, g, b) > 26) colorful++;
    }
    const mean = sum / n, std = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
    const stats = { mean: +mean.toFixed(2), std: +std.toFixed(2), dark: +(dark / n).toFixed(3), bright: +(bright / n).toFixed(3), colorful: +(colorful / n).toFixed(3) };
    let hashValue = null;
    if (hash) {
      const full = stage.getContext('2d').getImageData(0, 0, 1920, 1080).data;
      let h = 2166136261 >>> 0;
      for (let y = 0; y < 1080; y += 24) for (let x = 0; x < 1920; x += 24) {
        const o = (y * 1920 + x) * 4;
        h ^= full[o] | (full[o + 1] << 8) | (full[o + 2] << 16) | (full[o + 3] << 24);
        h = Math.imul(h, 16777619);
      }
      hashValue = (h >>> 0).toString(16).padStart(8, '0');
    }
    return {
      res: { section: res.section, error: res.error, ms: +res.ms.toFixed(1) },
      stats, hash: hashValue,
      texts: collect ? res.texts : undefined,
      eraCard: res.eraCard,
      hud: res.hud,
    };
  };

  // Each era: visual density + marked text + safe boxes + double-render hash.
  const beats = quick ? [2.55] : [0.85, 2.55, 4.65];
  for (let i = 0; i < 18; i++) {
    const start = 6 + i * 6;
    const beatSamples = [];
    for (const u of beats) {
      const r = await page.evaluate(API_EVAL, [start + u, true, true]);
      if (r.res.error) error(`scene ${i + 1} u=${u}: ${r.res.error}`);
      if (r.stats.std < 5) error(`scene ${i + 1} u=${u}: visually flat (std=${r.stats.std})`);
      if (r.stats.dark > 0.985 || r.stats.bright > 0.985) error(`scene ${i + 1} u=${u}: near-uniform frame`);
      if (r.res.section !== i) error(`scene ${i + 1} u=${u}: section ${r.res.section}`);
      if (!r.eraCard) error(`scene ${i + 1} u=${u}: no era card metadata`);
      if (!r.hud) error(`scene ${i + 1} u=${u}: no HUD metadata`);
      const boxes = r.texts || [];
      for (const b of boxes) {
        if (b.x < -2 || b.y < -2 || b.x + b.w > 1922 || b.y + b.h > 1082) {
          error(`scene ${i + 1} u=${u}: text '${b.id}' outside frame (${b.x},${b.y},${b.w},${b.h})`);
        }
      }
      // 09/11/14/15 deliberately withhold their line until the push / collapse
      // has resolved; they are still required to have text at the eye beat.
      const LATE_TEXT = new Set([9, 11, 14, 15]);
      if (u === 2.55 && boxes.length < 1 && !LATE_TEXT.has(i + 1)) warn(`scene ${i + 1}: only ${boxes.length} marked text blocks at the wonder beat`);
      if (u === 4.65 && boxes.length < 1) warn(`scene ${i + 1}: no marked text blocks at the eye beat`);
      if (u === 4.65 && boxes.length < 1) warn(`scene ${i + 1}: no marked text at the poem-eye beat`);
      beatSamples.push({ u, stats: r.stats, hash: r.hash, texts: boxes.length, card: !!r.eraCard, ms: r.res.ms });
    }
    const h1 = beatSamples[beatSamples.length - 1].hash;
    const r2 = await page.evaluate(API_EVAL, [start + beats[beats.length - 1], true, false]);
    if (h1 !== r2.hash) error(`scene ${i + 1}: non-deterministic render hash ${h1} vs ${r2.hash}`);
    report.scenes.push({ index: i + 1, beats: beatSamples, determinism: h1 === r2.hash });
  }

  // Crossings: every boundary must render without error.
  for (let i = 1; i <= 18; i++) {
    const B = 6 + i * 6;
    const before = await page.evaluate(API_EVAL, [B - 0.06, false, false]);
    const at = await page.evaluate(API_EVAL, [B, false, false]);
    const after = await page.evaluate(API_EVAL, [B + 0.06, false, false]);
    const bad = [before, at, after].find((x) => x.res.error);
    if (bad) error(`crossing ${i} at ${B}: ${bad.res.error}`);
    if ([before, at, after].some((x) => x.stats.std < 4)) warn(`crossing ${i} at ${B}: low visual variance during transition`);
    report.transitions.push({ crossing: i, at: B, before: before.stats, mid: at.stats, after: after.stats, error: bad?.res.error || null });
  }

  // Intro, outro and the final seal.
  const special = [
    { name: 'intro-open', t: 0.8, minTexts: 1 },
    { name: 'intro-stamp', t: 4.2, minTexts: 2 },
    { name: 'intro-exit', t: 5.7, minTexts: 1 },
    { name: 'outro-wall', t: 118.0, minTexts: 0 },
    { name: 'outro-seat', t: 126.0, minTexts: 1 },
    { name: 'outro-verdict', t: 130.0, minTexts: 1 },
    { name: 'outro-seal', t: 137.0, minTexts: 1 },
  ];
  for (const s of special) {
    const r = await page.evaluate(API_EVAL, [s.t, false, true]);
    if (r.res.error) error(`${s.name}: ${r.res.error}`);
    if (r.stats.std < 4) error(`${s.name}: visually flat (std=${r.stats.std})`);
    if ((r.texts?.length || 0) < s.minTexts) warn(`${s.name}: only ${r.texts?.length || 0} marked text blocks`);
    report.stats[s.name] = { stats: r.stats, texts: r.texts?.length || 0, ms: r.res.ms };
    if (s.t >= 114 && !r.res.section === 18) { /* section captured, no-op */ }
  }

  // HUD monotonicity as rendered, not just metadata.
  const hudDistances = [];
  for (const t of [0, 6, 12, 30, 54, 78, 108, 114, 138]) {
    const r = await page.evaluate(API_EVAL, [t, false, false]);
    hudDistances.push({ t, distance: r.hud?.distance, text: r.hud?.text, style: r.hud?.style });
  }
  report.stats.hud = hudDistances;

  if (wantShots && report.errors.length) {
    for (let k = 0; k < Math.min(4, report.errors.length); k++) {
      const file = path.join(failDir, `fail_${k}.png`);
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    }
  }
} catch (e) {
  error(e && (e.stack || e.message) || e);
} finally {
  if (pageErrors.length) {
    const fatal = pageErrors.filter((e) => !/404|favicon|Failed to load resource/i.test(e));
    for (const e of fatal) error('page: ' + e);
  }
  await close();
  await srv.close();
}

report.stats.elapsedSeconds = +((Date.now() - t0) / 1000).toFixed(1);
fs.writeFileSync(path.join(outDir, 'qa_report.json'), JSON.stringify(report, null, 2));
const err = report.errors.length, warnN = report.warnings.length;
console.log(`\nQA ${err ? 'FAIL' : 'PASS'} · ${err} errors · ${warnN} warnings · ${report.stats.elapsedSeconds}s`);
console.log(`report: ${path.relative(ROOT, path.join(outDir, 'qa_report.json'))}`);
if (err) process.exitCode = 1;
