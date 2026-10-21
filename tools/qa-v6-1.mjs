#!/usr/bin/env node
/**
 * qa-v6-1.mjs — the V6.1 surgical-polish gate.
 *
 * The V6 gate (tools/qa-gate.mjs) verifies the film's contract: timing, the 18
 * era modules, non-empty frames, deterministic double renders, all 17 crossings.
 * It cannot see a seal landing on a subtitle, a crack eating two characters, or
 * 1,455 stars collapsing into a rectangle. This gate does exactly that: it pins
 * the ten repaired timecodes with pixel + metadata assertions, and it renders
 * the full 54-cell (18 eras × 3 bars) collision table.
 *
 *   node tools/qa-v6-1.mjs
 *   node tools/qa-v6-1.mjs --shots      # write failing frames to disk
 *   node tools/qa-v6-1.mjs --json path  # override the report path
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
const args = parseArgs(process.argv.slice(2));
const wantShots = !!args.shots;
const outDir = path.join(ROOT, 'output', 'v6_1_qa');
fs.mkdirSync(outDir, { recursive: true });
const reportPath = path.resolve(ROOT, args.json || 'output/v6_1_qa/qa_v6_1_report.json');

const report = {
  generatedBy: 'tools/qa-v6-1.mjs',
  version: '6.1',
  startedAt: new Date().toISOString(),
  errors: [],
  warnings: [],
  probes: [],
  table54: [],
  stats: {},
};
const error = (probe, msg) => {
  const line = `[${probe}] ${msg}`;
  report.errors.push(line);
  console.error('ERROR', line);
};
const warn = (probe, msg) => {
  const line = `[${probe}] ${msg}`;
  report.warnings.push(line);
  console.warn('WARN ', line);
};

/* ------------------------------------------------------------------ helpers */
const overlapY = (a, b) => Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const overlapX = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
const area = (b) => Math.max(1, b.w * b.h);
function box(boxes, id) {
  return boxes.find((b) => b.id === id) || null;
}
function textBox(texts, id) {
  return texts.find((t) => t.id === id) || null;
}

const srv = await startServer(0);
const { browser, close } = await launch();
let page = null;
const pageErrors = [];
const t0 = Date.now();

/** Render t, then return metadata boxes + the requested pixel regions. */
const PROBE_EVAL = async ([t, regions]) => {
  const res = await window.renderAt(t);
  const dbg = window.__DFT.debug();
  const stage = document.getElementById('stage');
  const c = stage.getContext('2d');
  const sampled = [];
  for (const r of regions || []) {
    const [x, y, w, h] = r;
    const d = c.getImageData(x, y, w, h).data;
    let n = 0, sum = 0, sum2 = 0, nearWhite = 0, nearBlack = 0, gold = 0, cinnabar = 0, numGreen = 0, bright = 0, warm = 0;
    const cols = new Array(24).fill(0);
    let goldCount = 0;
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const o = (py * w + px) * 4;
        const R = d[o], G = d[o + 1], B = d[o + 2];
        const l = 0.2126 * R + 0.7152 * G + 0.0722 * B;
        n++; sum += l; sum2 += l * l;
        if (l > 236) nearWhite++;
        if (l < 10) nearBlack++;
        if (l > 150) bright++;
        // warm gold (star river / lintel studs / seal paste)
        if (R > 176 && G > 132 && B < 150 && R - B > 46) { gold++; goldCount++; cols[Math.floor((px / w) * 24)]++; }
        // cinnabar red
        if (R > 128 && R - G > 54 && R - B > 54) cinnabar++;
        // the editor's number token colour #7bdc9a
        if (Math.abs(R - 123) < 46 && Math.abs(G - 220) < 42 && Math.abs(B - 154) < 52) numGreen++;
        if (R > 150 && G > 130 && R >= B) warm++;
      }
    }
    const mean = sum / n;
    sampled.push({
      region: r,
      mean: +mean.toFixed(2),
      std: +Math.sqrt(Math.max(0, sum2 / n - mean * mean)).toFixed(2),
      nearWhite: +(nearWhite / n).toFixed(4),
      nearBlack: +(nearBlack / n).toFixed(4),
      gold: +(gold / n).toFixed(4),
      goldCount,
      cinnabar: +(cinnabar / n).toFixed(4),
      numGreen: +(numGreen / n).toFixed(4),
      bright: +(bright / n).toFixed(4),
      warm: +(warm / n).toFixed(4),
      cols,
      _n: n,
    });
  }
  return {
    section: res.section,
    error: res.error,
    ms: +res.ms.toFixed(1),
    texts: dbg.texts,
    boxes: dbg.boxes,
    eraCard: res.eraCard,
    hud: res.hud,
    sampled,
  };
};

async function probe(t, regions = []) {
  return page.evaluate(PROBE_EVAL, [t, regions]);
}

function record(name, t, ok, detail, extra = {}) {
  report.probes.push({ name, t, ok, detail, ...extra });
  if (!ok) error(name, detail);
  return ok;
}

try {
  const opened = await openPage(browser, `${srv.url}/film.html?render=1`, { quiet: true });
  page = opened.page;
  pageErrors.push(...opened.errors);
  await page.waitForFunction("!document.getElementById('loading')", { timeout: 20000 }).catch(() => {});
  await page.evaluate(async () => { await window.__DFT.prepare(114); });

  /* =====================================================================
   * 01 · 00:04.5 — the vermilion seal must never touch the subtitle
   * ===================================================================== */
  {
    const name = 'F01 intro-seal-vs-subtitle';
    const r = await probe(4.5, [[700, 400, 700, 140]]);
    const caption = textBox(r.texts, 'intro-caption');
    const l2 = textBox(r.texts, 'intro-line-2');
    const l2b = textBox(r.texts, 'intro-line-2b');
    const src = textBox(r.texts, 'intro-source');
    const seal = box(r.boxes, 'intro-seal-block');
    const problems = [];
    if (!seal) problems.push('no intro-seal-block probe');
    if (!l2 || !l2b) problems.push('subtitle not marked');
    if (seal && l2 && l2b) {
      const subTop = Math.min(l2.y, l2b.y);
      const subBottom = Math.max(l2.y + l2.h, l2b.y + l2b.h, src ? src.y + src.h : -Infinity);
      const gap = seal.y - subBottom;
      if (gap < 45) problems.push(`seal/subtitle gap ${gap.toFixed(1)} < 45px`);
      if (overlapY(seal, l2) > 0 || overlapY(seal, l2b) > 0) problems.push('seal intersects a subtitle line');
      if (caption) {
        const capGap = subTop - (caption.y + caption.h);
        if (capGap < 45) problems.push(`title/subtitle gap ${capGap.toFixed(1)} < 45px`);
      }
      const px = r.sampled[0];
      // the subtitle band must be paper + ink, not cinnabar paste
      if (px.cinnabar > 0.02) problems.push(`cinnabar covers ${(px.cinnabar * 100).toFixed(1)}% of the subtitle band`);
    }
    record(name, 4.5, problems.length === 0, problems.join('; ') || 'title/subtitle/seal stacked with ≥45 px clearance', {
      seal, l2, l2b, src,
    });
  }

  /* =====================================================================
   * 02 · 00:06-00:17 — bright cinnabar caption + ink field never crosses the
   *      top register (spines hard-clamped to y ∈ [185, 960])
   * ===================================================================== */
  {
    const name = 'F02a scene01-cinnabar-caption';
    const r = await probe(10.2, [[560, 84, 400, 70]]);
    const px = r.sampled[0];
    const ok = px.cinnabar >= 0.012 && px.mean > 14;
    record(name, 10.2, ok, ok
      ? `caption band reads as cinnabar (${(px.cinnabar * 100).toFixed(2)}% of pixels)`
      : `caption band is too dark/desaturated (cinnabar ${(px.cinnabar * 100).toFixed(2)}%)`, { px });
  }
  {
    const name = 'F02b scene02-ink-band-limit';
    for (const t of [12.4, 13.0, 14.0, 15.0, 16.0]) {
      const r = await probe(t);
      const b = box(r.boxes, 's02-ink-band');
      if (!b) { record(`${name}@${t}`, t, false, 'no s02-ink-band probe'); continue; }
      const ok = b.minY >= 185 - 0.5 && b.maxY <= 960 + 0.5;
      record(`${name}@${t}`, t, ok,
        ok ? `spines inside [${b.minY.toFixed(1)}, ${b.maxY.toFixed(1)}]` :
          `spine reached y=${b.minY.toFixed(1)}..${b.maxY.toFixed(1)}, outside [185, 960]`, { band: b });
    }
    // and the register itself stays clean on the render
    const r = await probe(13.0, [[600, 74, 360, 40]]);
    const px = r.sampled[0];
    const ok = px.nearBlack < 0.10;
    record('F02c scene02-title-register-clean', 13.0, ok,
      ok ? `title register clean (${(px.nearBlack * 100).toFixed(1)}% ink)` :
        `${(px.nearBlack * 100).toFixed(1)}% dark pixels cross the title register`, { px });
  }

  /* =====================================================================
   * 03 · 00:20-00:29 — dissolving mountain base, decree plaque, 2.2× blocks
   * ===================================================================== */
  {
    const name = 'F03a scene03-mountain-base-softened';
    const r = await probe(22.0, [[700, 880, 600, 120]]);
    const px = r.sampled[0];
    const ok = px.nearBlack < 0.72 && px.mean > 9;
    record(name, 22.0, ok, ok
      ? `base band is washed (${(px.nearBlack * 100).toFixed(1)}% pure black, mean ${px.mean})`
      : `base is still a hard black polygon (${(px.nearBlack * 100).toFixed(1)}% pure black)`, { px });
  }
  {
    const name = 'F03b scene04-decree-plaque-and-blocks';
    const r = await probe(26.4, [[760, 420, 400, 110]]);
    const edict = textBox(r.texts, 's04-edict');
    const zhi = textBox(r.texts, 's04-zhi');
    const problems = [];
    if (!edict) problems.push('decree plaque not marked');
    if (edict) {
      if (edict.y < 168 || edict.y + edict.h > 292) problems.push(`plaque not at y≈230/h110 (${edict.y.toFixed(0)}..${(edict.y + edict.h).toFixed(0)})`);
      if (edict.w > 620) problems.push(`plaque still banner-wide (${edict.w.toFixed(0)}px)`);
    }
    if (!zhi) problems.push('3-D type field not marked');
    else if (zhi.h < 130) problems.push(`core blocks are ${zhi.h.toFixed(0)}px tall, expected ≥130 (2.2×64)`);
    const px = r.sampled[0];
    if (px.goldCount < 24) problems.push(`gate studs not visible under the plaque (${px.goldCount} gold px)`);
    record(name, 26.4, problems.length === 0, problems.join('; ') || 'plaque hangs at y≈230, gate studs visible, blocks 2.2×', { edict, zhi, px });
  }

  /* =====================================================================
   * 04 · 00:30-00:35 — the ten slabs ride above the traveller's head
   * ===================================================================== */
  {
    const name = 'F04 scene05-ledger-slabs-clear-figure';
    const r = await probe(33.2, [[880, 590, 180, 260]]);
    const weights = textBox(r.texts, 's05-weights');
    const load = box(r.boxes, 's05-load-band');
    const figure = box(r.boxes, 's05-figure');
    const problems = [];
    if (!weights || !load || !figure) problems.push('probe boxes missing');
    if (load && figure && overlapY(load, figure) > 0) problems.push('the load still crosses the figure band');
    if (load && load.y + load.h > 580) problems.push(`slab band ends at ${(load.y + load.h).toFixed(0)}, needs ≤580`);
    const px = r.sampled[0];
    if (px.nearBlack > 0.42) problems.push(`figure band is ${(px.nearBlack * 100).toFixed(1)}% black — the slabs still cover him`);
    record(name, 33.2, problems.length === 0, problems.join('; ') || 'slab load sits in y∈[455,556], silhouette exposed', { weights, load, figure, px });
  }

  /* =====================================================================
   * 05 · 00:36-00:47 — no leaked 07 tag, legible construct card,
   *      【国破】/【山河在】 carved on either side of the abyss
   * ===================================================================== */
  {
    const name = 'F05a scene06-no-leaked-corner-tag';
    const r = await probe(36.6);
    const stray = r.texts.filter((b) => b.x < 620 && b.y > 880 && !/^era-/.test(b.id));
    const ok = stray.length === 0;
    record(name, 36.6, ok, ok ? 'bottom-left corner is free of era-07 type' :
      `leaked labels in the SW corner: ${stray.map((s) => s.id).join(', ')}`, { stray });
    const cardTitle = r.texts.find((b) => b.id === 'era-06');
    const cardOk = !!cardTitle && cardTitle.w > 90;
    record('F05b scene06-era-card-legible', 36.6, cardOk,
      cardOk ? `era card title box ${cardTitle.w.toFixed(0)}×${cardTitle.h.toFixed(0)}` : 'era-06 title box missing or clipped', { cardTitle });
  }
  {
    const name = 'F05c scene07-split-couplet';
    const r = await probe(46.2);
    const left = textBox(r.texts, 's07-split-left');
    const right = textBox(r.texts, 's07-split-right');
    const crack = box(r.boxes, 's07-crack');
    const plate = box(r.boxes, 's07-nameplate');
    const problems = [];
    if (!left || !right || !crack) problems.push('split probes missing');
    if (left && crack && left.x + left.w > crack.x + 1) problems.push('【国破】 crosses the crack');
    if (right && crack && right.x < crack.x + crack.w - 1) problems.push('【山河在】 crosses the crack');
    if (left && right && right.x - (left.x + left.w) < 20) problems.push('the two halves are not separated');
    if (!plate) problems.push('no nameplate');
    else if (plate.y < 820 || plate.y > 940) problems.push(`nameplate sits at y=${plate.y.toFixed(0)}, expected ≈880`);
    record(name, 46.2, problems.length === 0,
      problems.join('; ') || `【国破】 ends at ${(left.x + left.w).toFixed(0)}, 【山河在】 starts at ${right.x.toFixed(0)}, crack ${crack.x.toFixed(0)}..${(crack.x + crack.w).toFixed(0)}`,
      { left, right, crack, plate });
  }

  /* =====================================================================
   * 06 · 00:48-00:53 — one couplet, ivory paper, no vertical column
   * ===================================================================== */
  {
    const name = 'F06 scene08-letter-single-couplet';
    const r = await probe(51.8, [[880, 400, 180, 200]]);
    const full = textBox(r.texts, 's08-poem-full');
    const problems = [];
    if (!full) problems.push('subtitle banner not marked');
    else {
      const cx = full.x + full.w / 2;
      if (Math.abs(cx - 960) > 8) problems.push(`banner centre ${cx.toFixed(0)} ≠ 960`);
      const cy = full.y + full.h / 2;
      if (Math.abs(cy - 840) > 26) problems.push(`banner centre y ${cy.toFixed(0)} ≠ 840`);
    }
    const px = r.sampled[0];
    if (px.nearBlack > 0.30) problems.push(`envelope is ${(px.nearBlack * 100).toFixed(1)}% dark — still metal grey`);
    if (px.mean < 120) problems.push(`envelope mean luma ${px.mean} — not ivory paper`);
    record(name, 51.8, problems.length === 0,
      problems.join('; ') || `single banner at (${(full.x + full.w / 2).toFixed(0)}, ${(full.y + full.h / 2).toFixed(0)}), paper luma ${px.mean}`,
      { full, px });
  }

  /* =====================================================================
   * 07 · 01:00-01:05 — no particle-built duplicate of the headline
   * ===================================================================== */
  {
    const name = 'F07 scene10-bullet-time-clean';
    const r = await probe(63.4, [[300, 360, 120, 260]]);
    const field = box(r.boxes, 's10-particle-field');
    const problems = [];
    if (!field) problems.push('particle-field probe missing');
    else {
      if (field.particleHeadline !== 0) problems.push('background still assembles a particle headline');
      if (field.frozen !== 1) problems.push('bullet time not active');
      if (!(field.beads >= 400)) problems.push(`only ${field.beads} frozen beads`);
    }
    const px = r.sampled[0];
    if (px.bright > 0.05) problems.push(`${(px.bright * 100).toFixed(1)}% bright pixels in the clear strip beside the quote`);
    record(name, 63.4, problems.length === 0,
      problems.join('; ') || `field is suspended straw + ${field.beads} beads, no ghost headline`, { field, px });
  }

  /* =====================================================================
   * 08 · 01:06-01:17 — a real cataract, and an egret clear of the poem
   * ===================================================================== */
  {
    const name = 'F08a scene11-waterfall';
    const r = await probe(67.5, [[1150, 620, 200, 360]]);
    const px = r.sampled[0];
    const ok = px.nearWhite < 0.24 && px.bright > 0.02;
    record(name, 67.5, ok, ok
      ? `cataract is mist + threads (${(px.nearWhite * 100).toFixed(1)}% white, ${(px.bright * 100).toFixed(1)}% lit, std ${px.std})`
      : `cataract reads as a solid tape (${(px.nearWhite * 100).toFixed(1)}% white, ${(px.bright * 100).toFixed(1)}% lit)`, { px });
  }
  {
    const name = 'F08b scene12-egret-clearance';
    const r = await probe(75.6);
    const gull = textBox(r.texts, 's12-gull');
    const poem = textBox(r.texts, 's12-poem');
    const problems = [];
    if (!gull) problems.push('egret not marked');
    if (!poem) problems.push('couplet not marked');
    if (gull && poem) {
      const gx = gull.x + gull.w / 2;
      const gap = poem.x - gx;
      if (gx > 1220) problems.push(`egret ends at x=${gx.toFixed(0)}, must stop by 1220`);
      if (gap < 240) problems.push(`only ${gap.toFixed(0)}px of clean paper to the couplet`);
    }
    record(name, 75.6, problems.length === 0,
      problems.join('; ') || `egret centre x=${(gull.x + gull.w / 2).toFixed(0)}, ${(poem.x - (gull.x + gull.w / 2)).toFixed(0)}px clear`, { gull, poem });
  }

  /* =====================================================================
   * 09 · 01:24-01:35 — separated rubble, three text decks, four flat cards
   * ===================================================================== */
  for (const t of [88.8, 89.4]) {
    const name = `F09a scene14-rubble-separation@${t}`;
    const r = await probe(t);
    const rub = box(r.boxes, 's14-rubble');
    const verdict = textBox(r.texts, 's14-verdict');
    const question = textBox(r.texts, 's14-question');
    const problems = [];
    if (!rub) problems.push('rubble probe missing');
    else {
      // the literal spec metric: every pair of centres ≥ 0.75 × fontSize
      if (rub.minPairRatioMin < 0.75) problems.push(`closest block pair is ${rub.minPairRatioMin}× fontSize (< 0.75)`);
      // the physical metric: separation circles of fontSize × 0.58 never overlap
      if (rub.separation < 0.9) problems.push(`glyphs interpenetrate (separation ${rub.separation})`);
      if (rub.y < 700) problems.push(`rubble tops out at y=${rub.y.toFixed(0)}, expected ≈740–820`);
      if (rub.y + rub.h > 1034) problems.push(`rubble sinks below ${(rub.y + rub.h).toFixed(0)}`);
      if (!(rub.floor >= 820 && rub.floor <= 1030)) problems.push(`floor at ${rub.floor}, outside [820,1030]`);
      if (verdict && verdict.y + verdict.h > rub.y - 20) problems.push('the verdict deck collides with the rubble');
    }
    if (verdict && Math.abs(verdict.y + verdict.h / 2 - 512) > 24) problems.push(`verdict centre y ${(verdict.y + verdict.h / 2).toFixed(0)} ≠ 510`);
    if (question && Math.abs(question.y + question.h / 2 - 280) > 22) problems.push(`question centre y ${(question.y + question.h / 2).toFixed(0)} ≠ 280`);
    record(name, t, problems.length === 0,
      problems.join('; ') || `min pair ${rub.minPairRatioMin}× fs (sep ${rub.separation}), rubble y=${rub.y.toFixed(0)}..${(rub.y + rub.h).toFixed(0)}`,
      { rub, verdict, question });
  }
  {
    const name = 'F09b scene15-four-cards-stay';
    for (const t of [93.0, 94.8, 95.6]) {
      const r = await probe(t, [[300, 540, 1320, 300]]);
      const cards = r.boxes.filter((b) => /^s15-card-/.test(b.id));
      const problems = [];
      if (cards.length !== 4) problems.push(`${cards.length}/4 cards present`);
      if (cards.some((c) => c.front !== 1)) problems.push('a card is not showing its face');
      if (cards.some((c) => c.alpha < 0.9)) problems.push('a card is fading out');
      const sorted = [...cards].sort((a, b) => a.x - b.x);
      for (let i = 1; i < sorted.length; i++) {
        if (overlapX(sorted[i - 1], sorted[i]) > 24) problems.push(`cards ${i - 1}/${i} fan into each other`);
      }
      if (sorted.length) {
        const span = sorted[sorted.length - 1].x + sorted[sorted.length - 1].w - sorted[0].x;
        if (span < 900) problems.push(`the four cards only span ${span.toFixed(0)}px — they are folding up`);
      }
      const px = r.sampled[0];
      if (px.bright < 0.06) problems.push(`card band only ${(px.bright * 100).toFixed(1)}% bright`);
      record(`${name}@${t}`, t, problems.length === 0,
        problems.join('; ') || `${cards.length} cards side by side, span ${(sorted[sorted.length - 1].x + sorted[sorted.length - 1].w - sorted[0].x).toFixed(0)}px`,
        { cards, px });
    }
  }

  /* =====================================================================
   * 10 · 01:48-02:18 — crisp code line + the 19th cell as a star river
   * ===================================================================== */
  {
    const name = 'F10a scene18-code-crisp';
    const r = await probe(111.0, [[160, 388, 860, 30]]);
    const m = box(r.boxes, 's18-code-metrics');
    const problems = [];
    if (!m) problems.push('code metrics probe missing');
    else {
      if (m.integerLeading !== 1) problems.push(`line height ${m.lineH} is fractional`);
      if (m.integerOrigin !== 1) problems.push('glyph origin is on a half pixel');
    }
    const px = r.sampled[0];
    if (px.numGreen < 0.004) problems.push(`number tokens not rendered (${(px.numGreen * 100).toFixed(2)}% green)`);
    record(name, 111.0, problems.length === 0,
      problems.join('; ') || `integer leading ${m.lineH}, ${(px.numGreen * 100).toFixed(2)}% number-token ink`, { m, px });
  }
  {
    const name = 'F10b outro-19-milky-way';
    for (const t of [134.4, 135.2, 136.0]) {
      const r = await probe(t);
      const seat = textBox(r.texts, 'outro-empty-seat');
      if (!seat) { record(`${name}@${t}`, t, false, 'no 19th-cell probe'); continue; }
      const band = [Math.round(seat.x + 8), Math.round(seat.y + seat.h * 0.18), Math.round(seat.w - 16), Math.round(seat.h * 0.66)];
      const r2 = await probe(t, [band]);
      const px = r2.sampled[0];
      const cols = px.cols;
      const total = cols.reduce((a, b) => a + b, 0) || 1;
      const used = cols.filter((c) => c > total * 0.004).length;
      const maxShare = Math.max(...cols) / total;
      // a central rectangle concentrates in a handful of bins; a ribbon spans
      const span = used / cols.length;
      const problems = [];
      if (px.goldCount < 400) problems.push(`only ${px.goldCount} gold pixels in the star river`);
      if (span < 0.75) problems.push(`star river only covers ${(span * 100).toFixed(0)}% of the cell width`);
      if (maxShare > 0.22) problems.push(`star river is a central blob (${(maxShare * 100).toFixed(0)}% in one slice)`);
      record(`${name}@${t}`, t, problems.length === 0,
        problems.join('; ') || `ribbon spans ${(span * 100).toFixed(0)}% of the cell, peak slice ${(maxShare * 100).toFixed(0)}%`,
        { seat, px: { ...px, cols: undefined } });
    }
  }

  /* =====================================================================
   * The 54-cell table: 18 eras × 3 bars, rendered and collision-checked
   * ===================================================================== */
  for (let i = 0; i < 18; i++) {
    const start = 6 + i * 6;
    for (const [bar, u] of [[1, 0.9], [2, 2.9], [3, 4.9]]) {
      const t = +(start + u).toFixed(2);
      const r = await probe(t, [[0, 0, 480, 270]]);
      const boxesOut = [];
      const cells = { i: i + 1, bar, t, ok: true, issues: [] };
      if (r.error) cells.issues.push('render error: ' + r.error);
      const px = r.sampled[0];
      if (px.std < 5) cells.issues.push(`flat frame (std ${px.std})`);
      // collision check across marked type (era cards and HUD furniture are
      // drawn on top by design, so they are excluded; duplicate ids are fused)
      const seen = new Map();
      for (const b of r.texts) {
        if (/^era-/.test(b.id) || b.id === 'era-year') continue;
        const cur = seen.get(b.id);
        if (!cur) seen.set(b.id, { ...b });
        else {
          cur.x = Math.min(cur.x, b.x); cur.y = Math.min(cur.y, b.y);
          cur.w = Math.max(cur.x + cur.w, b.x + b.w) - cur.x;
          cur.h = Math.max(cur.y + cur.h, b.y + b.h) - cur.y;
        }
      }
      const ts = [...seen.values()].filter((b) => b.w > 20 && b.h > 10);
      for (let a = 0; a < ts.length; a++) {
        for (let b = a + 1; b < ts.length; b++) {
          const ox = overlapX(ts[a], ts[b]);
          const oy = overlapY(ts[a], ts[b]);
          if (ox > 0 && oy > 0) {
            const frac = (ox * oy) / Math.min(area(ts[a]), area(ts[b]));
            if (frac > 0.55) cells.issues.push(`text collision ${ts[a].id}×${ts[b].id} (${(frac * 100).toFixed(0)}%)`);
          }
        }
      }
      // out-of-frame type
      for (const b of ts) {
        if (b.x < -2 || b.y < -2 || b.x + b.w > 1922 || b.y + b.h > 1082) cells.issues.push(`text ${b.id} off-frame`);
      }
      cells.ok = cells.issues.length === 0;
      if (!cells.ok) error(`table54 ${i + 1}/${bar}`, cells.issues.join('; '));
      report.table54.push(cells);
      void boxesOut;
    }
  }

  /* ---------------------------------------------------------------- shots */
  if (wantShots && report.errors.length) {
    const failDir = path.join(outDir, 'fails');
    fs.mkdirSync(failDir, { recursive: true });
    for (const p of report.probes.filter((p) => !p.ok).slice(0, 6)) {
      await page.evaluate((tt) => window.renderAt(tt), p.t);
      const file = path.join(failDir, `${String(p.name).replace(/[^a-z0-9]+/gi, '_')}_${p.t}.png`);
      await page.screenshot({ path: file, type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } });
      console.log('shot', path.relative(ROOT, file));
    }
  }
} catch (e) {
  error('fatal', e && (e.stack || e.message) || e);
} finally {
  const fatal = pageErrors.filter((e) => !/404|favicon|Failed to load resource/i.test(e));
  for (const e of fatal) error('page', e);
  await close();
  await srv.close();
}

report.stats.elapsedSeconds = +((Date.now() - t0) / 1000).toFixed(1);
report.stats.probes = report.probes.length;
report.stats.passed = report.probes.filter((p) => p.ok).length;
report.stats.table54 = {
  cells: report.table54.length,
  passed: report.table54.filter((c) => c.ok).length,
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

const err = report.errors.length;
const warnN = report.warnings.length;
console.log(`\nV6.1 QA ${err ? 'FAIL' : 'PASS'} · ${err} errors · ${warnN} warnings`);
console.log(`  probes   ${report.stats.passed}/${report.stats.probes}`);
console.log(`  54-cell  ${report.stats.table54.passed}/${report.stats.table54.cells}`);
console.log(`  elapsed  ${report.stats.elapsedSeconds}s`);
console.log(`  report: ${path.relative(ROOT, reportPath)}`);
if (err) process.exitCode = 1;
