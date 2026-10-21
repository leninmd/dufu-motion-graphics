/**
 * 12 · 八大山人写意 · 湘江孤舟 / Bada Shanren Minimalism & Water Shader · 768
 *
 * 85% of the frame is untouched paper. Six dry marks make a leaf of a boat with
 * five lives inside it; one pale moon; one arrogant white eye. In the lower half
 * a Canvas2D approximation of a sine-normal water surface turns the Xiang into
 * broken silver, and the couplet condenses down the right margin character by
 * character, on the water's beat. Everything is achieved with absence.
 *
 * Techniques
 *   · Bada composition: negative space as subject; six or seven decisive
 *     dry-brush marks (flying white, uneven pressure) for hull / canopy / oar.
 *   · Water shader: y = base + Σ Aᵢ sin(kᵢx + ωᵢt + φᵢ) per perspective row,
 *     analytic slope → surface normal → specular only where the normal faces the
 *     moon. Runs are merged into dashes: cool silver-grey outside the cone,
 *     white-hot inside it. No blur, no bitmap.
 *   · Moon path: seeded broken flecks inside the moon cone, not a white triangle.
 *   · Gull: 180 deterministic stipple particles on a ruled wing surface
 *     (chord = lerp(leading edge, trailing edge)), plus dry wing-tip strokes and
 *     one white eye with a black rim and a high, contemptuous pupil.
 *   · Bar 3: the far-right water rows electrify into green CRT scanlines, the
 *     leading edge of era 13 arriving on paper.
 */
import KIT from '../kit/index.js';
import {
  clamp, clamp01, lerp, smoothstep, easeOut, hash, unit, mulberry32, TAU,
} from '../kit/math.js';
import { markText } from '../kit/debug.js';

const W = 1920, H = 1080;
const HORIZON = 604;
const PAPER = '#f6f2e8';
const INK = '#1b1812';
const SILVER = '#aebfbe';
const MOONC = '#f5eedb';
const SEAL = '#a52a22';
const GREEN = '#38ff88';
const MOON = { x: 1238, y: 312, r: 54 };

const POEM = [
  { text: '星垂平野阔，月涌大江流。', x: 1734, y0: 232 },
  { text: '飘飘何所似，天地一沙鸥', x: 1642, y0: 232 },
];
const POEM_SIZE = 42;
const POEM_GAP = POEM_SIZE * 1.13;

/* ------------------------------------------------------------------ helpers */
function poly(ctx, pts, close = false) {
  if (!pts || pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}

function fillPts(ctx, pts, style) {
  poly(ctx, pts, true);
  ctx.fillStyle = style;
  ctx.fill();
}

const smooth = (pts, n = 6) => KIT.smoothPath(pts, n);

/* ---------------------------------------------------------------- the paper */
let BASE = null;

function buildBase() {
  if (BASE) return BASE;
  BASE = KIT.layer('s12:base', W, H, (ctx) => {
    const pp = KIT.paper.ricePaper(W, H, {
      tone: PAPER, seed: 768, fibers: 900, stains: 5, mottle: 0.3, edgeBurn: 0.12, fiberAlpha: 0.09,
    });
    ctx.drawImage(pp, 0, 0);

    // The breath of the scroll: a vertical wash so faint it is only felt.
    ctx.save();
    ctx.fillStyle = KIT.linear(ctx, 0, 0, 0, H, [
      [0, 'rgba(146,134,110,0.05)'],
      [0.3, 'rgba(146,134,110,0.012)'],
      [0.58, 'rgba(146,134,110,0.0)'],
      [1, 'rgba(116,104,82,0.05)'],
    ]);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // The river is a shade cooler than the paper, so silver has something to sit on.
    ctx.save();
    ctx.fillStyle = KIT.linear(ctx, 0, HORIZON - 2, 0, H, [
      [0, 'rgba(60,90,92,0.0)'],
      [0.03, 'rgba(60,90,92,0.40)'],
      [0.24, 'rgba(70,100,100,0.33)'],
      [0.7, 'rgba(84,110,108,0.17)'],
      [0.92, 'rgba(100,120,116,0.07)'],
      [1, 'rgba(110,128,122,0.015)'],
    ]);
    ctx.fillRect(-4, HORIZON - 2, W + 8, H - HORIZON + 2);
    ctx.restore();

    // the wash is uneven: soft pools and a lifted band near the far shore
    ctx.save();
    const rw = mulberry32(7693);
    for (let i = 0; i < 11; i++) {
      const y = HORIZON + 30 + rw() * (H - HORIZON - 60);
      const x = rw() * W;
      const rx = 240 + rw() * 520;
      const ry = 26 + rw() * 70;
      const dark = rw() < 0.6;
      const g = KIT.radial(ctx, x, y, 10, x, y, rx, [
        [0, dark ? 'rgba(58,86,86,0.055)' : 'rgba(250,248,238,0.075)'],
        [0.55, dark ? 'rgba(58,86,86,0.025)' : 'rgba(250,248,238,0.035)'],
        [1, 'rgba(58,86,86,0)'],
      ]);
      ctx.fillStyle = g;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, ry / rx);
      ctx.translate(-x, -y);
      ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
      ctx.restore();
    }
    ctx.restore();

    // distant shore: two cool, almost-cancelled washes, left of centre only
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 3; i++) {
      const y = HORIZON - 12 - i * 9;
      const cx = 430 - i * 60, rx = 520 - i * 90;
      const g = KIT.radial(ctx, cx, y, 8, cx, y, rx, [
        [0, 'rgba(104,104,88,0)'],
        [0.5, `rgba(104,104,88,${0.055 - i * 0.012})`],
        [1, 'rgba(104,104,88,0)'],
      ]);
      ctx.fillStyle = g;
      ctx.fillRect(0, y - 44, W, 88);
    }
    ctx.restore();
    // a hairline of far bank, drier than the horizon
    KIT.ink.brushStroke(ctx, smooth([
      [60, HORIZON - 13], [250, HORIZON - 17], [470, HORIZON - 12], [640, HORIZON - 15],
    ], 3), {
      color: INK, width: 2.2, dry: 0.95, alpha: 0.2, taper: 0.8, seed: 1210, paperColor: PAPER,
    });

    // one dry ink horizon — the only line the eye needs
    KIT.ink.brushStroke(ctx, smooth([
      [-40, HORIZON - 2], [220, HORIZON - 5], [520, HORIZON - 1],
      [820, HORIZON + 1], [1120, HORIZON - 3], [1420, HORIZON - 1], [1720, HORIZON + 3],
    ], 3), {
      color: INK, width: 3.6, dry: 0.86, alpha: 0.5, taper: 0.5, seed: 1201, paperColor: PAPER,
    });
    KIT.ink.brushStroke(ctx, smooth([
      [120, HORIZON + 5], [400, HORIZON + 3], [700, HORIZON + 6], [980, HORIZON + 4],
    ], 3), {
      color: INK, width: 1.8, dry: 0.95, alpha: 0.26, taper: 0.7, seed: 1207, paperColor: PAPER,
    });
    // a darker distant bank, left of centre, to unbalance the composition
    KIT.ink.brushStroke(ctx, smooth([
      [258, HORIZON + 2], [330, HORIZON - 4], [430, HORIZON - 2], [520, HORIZON + 3],
    ], 4), {
      color: INK, width: 7.5, dry: 0.55, alpha: 0.30, taper: 0.85, seed: 1213, paperColor: PAPER,
    });

    // the moon: paper made luminous, a broken rim, no shadow
    const disc = KIT.radial(ctx, MOON.x - MOON.r * 0.3, MOON.y - MOON.r * 0.34, 3, MOON.x, MOON.y, MOON.r * 1.04, [
      [0, 'rgba(255,254,247,1)'],
      [0.55, 'rgba(253,250,239,0.98)'],
      [0.88, 'rgba(246,240,222,0.94)'],
      [1, 'rgba(238,231,212,0.86)'],
    ]);
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(MOON.x, MOON.y, MOON.r, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.strokeStyle = 'rgba(96,104,92,0.26)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a0 = 2.05 + i * 0.5;
      ctx.lineWidth = 1.3 - i * 0.3;
      ctx.beginPath();
      ctx.arc(MOON.x, MOON.y, MOON.r - 0.6, a0, a0 + 1.05 - i * 0.2);
      ctx.stroke();
    }
    ctx.restore();
    // cold breath around it, barely there
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = KIT.radial(ctx, MOON.x, MOON.y, MOON.r * 0.85, MOON.x, MOON.y, MOON.r * 3.2, [
      [0, 'rgba(122,124,110,0)'],
      [0.34, 'rgba(122,124,110,0.045)'],
      [1, 'rgba(122,124,110,0)'],
    ]);
    ctx.fillRect(MOON.x - MOON.r * 3.2, MOON.y - MOON.r * 3.2, MOON.r * 6.4, MOON.r * 6.4);
    ctx.restore();

    // deckle edge: the sheet is a sheet
    ctx.save();
    ctx.strokeStyle = 'rgba(92,78,52,0.20)';
    ctx.lineWidth = 1;
    const r2 = mulberry32(7690);
    for (let side = 0; side < 4; side++) {
      for (let i = 0; i < 70; i++) {
        const p = (i + r2() * 0.7) / 70;
        const d = 6 + r2() * 12;
        ctx.globalAlpha = 0.1 + r2() * 0.3;
        ctx.beginPath();
        if (side === 0) { const x = p * W; ctx.moveTo(x, 0); ctx.lineTo(x + (r2() - 0.5) * 7, d); }
        else if (side === 1) { const x = p * W; ctx.moveTo(x, H); ctx.lineTo(x + (r2() - 0.5) * 7, H - d); }
        else if (side === 2) { const y = p * H; ctx.moveTo(0, y); ctx.lineTo(d, y + (r2() - 0.5) * 7); }
        else { const y = p * H; ctx.moveTo(W, y); ctx.lineTo(W - d, y + (r2() - 0.5) * 7); }
        ctx.stroke();
      }
    }
    ctx.restore();

    // paper grain, baked in so the per-frame cost stays flat
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.20;
    const grain = KIT.grainLayer(640, 360, 7682, { amp: 0.28 });
    ctx.drawImage(grain, 0, 0, W, H);
    ctx.restore();
  });
  return BASE;
}

/* ------------------------------------------------------------- water shader */
const ROWS = (() => {
  const n = 48;
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = Math.pow((i + 1) / n, 1.5);
    const y = HORIZON + 5 + (H - HORIZON) * d;
    const wl = 62 + 720 * d;
    const ph = unit(768, i, 1) * TAU;
    out.push({
      y, d,
      amp: 1.1 + 26 * Math.pow(d, 1.25),
      wl,
      k1: TAU / wl,
      k2: TAU / (wl * 0.53),
      k3: TAU / (wl * 1.92),
      a2: 0.44, a3: 0.52,
      w1: 0.55 + 2.1 * d,
      w2: 0.9 + 3.4 * d,
      w3: 0.4 + 1.4 * d,
      p1: ph, p2: ph * 1.71 + 1.2, p3: ph * 0.53 + 2.6,
      alpha: 0.24 + 0.76 * Math.pow(d, 0.55),
    });
  }
  return out;
})();

const GLITTER = (() => {
  const r = mulberry32(hash('s12glitter', 768));
  const out = [];
  for (let i = 0; i < ROWS.length; i++) {
    const row = ROWS[i];
    const n = 3 + Math.round(13 * row.d);
    const rowList = [];
    for (let k = 0; k < n; k++) {
      // offsets bunch toward the centre of the column
      const raw = r() * 2 - 1;
      rowList.push({
        u: Math.sign(raw) * Math.pow(Math.abs(raw), 1.55),
        len: 7 + Math.pow(r(), 1.7) * (18 + 86 * row.d),
        sp: 1.2 + r() * 3.2,
        ph: r() * TAU,
        a: 0.30 + Math.pow(r(), 1.4) * 0.70,
        off: (r() - 0.5) * 3,
      });
    }
    out.push(rowList);
  }
  return out;
})();

/** Surface height (normalised) and slope, for one row at x. */
function wave(row, x, t) {
  const q1 = row.k1 * x + row.w1 * t + row.p1;
  const q2 = row.k2 * x + row.w2 * t + row.p2;
  const q3 = row.k3 * x + row.w3 * t + row.p3;
  const h = Math.sin(q1) + row.a2 * Math.sin(q2) + row.a3 * Math.sin(q3);
  const dh = row.k1 * Math.cos(q1) + row.a2 * row.k2 * Math.cos(q2) + row.a3 * row.k3 * Math.cos(q3);
  const norm = row.k1 + row.a2 * row.k2 + row.a3 * row.k3;
  return { h, q: dh / norm };
}

function drawWater(ctx, u, greenP, greenEdge) {
  const t = u;
  // the water is already breathing in bar 1 — then it wakes at exactly 2.0
  const ampK = 0.18 + 0.82 * smoothstep(2.0, 2.42, u);
  const specK = 0.24 + 0.76 * smoothstep(1.96, 2.44, u);

  // 2. drawn surface: broken contours, far half only — the river is also ink
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 30; i++) {
    const row = ROWS[i];
    if (i % 2 !== 0) continue;
    const a = (0.05 + 0.05 * (1 - row.d)) * (0.6 + 0.4 * specK);
    ctx.strokeStyle = KIT.rgba('#3f5754', a);
    ctx.lineWidth = 0.5 + 0.8 * row.d;
    ctx.beginPath();
    let pen = false;
    for (let x = -30; x <= W + 30; x += 26) {
      const w = wave(row, x, t);
      const y = row.y + row.amp * w.h * 0.3 * ampK;
      if (w.h <= -0.5) { pen = false; continue; }
      if (!pen) { ctx.moveTo(x, y); pen = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();

  // 3. the moon path: brush dashes on the surface. Only the slopes that face the
  //    moon are lit; the rest of the dash stays under the water's tone.
  ctx.save();
  ctx.lineCap = 'round';
  const lit = [[], [], []];
  const shadow = [[], [], []];
  for (let i = 0; i < ROWS.length; i++) {
    const row = ROWS[i];
    const pathW = 42 + 290 * row.d;
    for (const g of GLITTER[i]) {
      const x = MOON.x + g.u * pathW;
      const w = wave(row, x, t);
      const qT = clamp(g.u * 1.4, -1, 1) * 0.5;
      const spec = Math.pow(clamp01(1 - Math.abs(w.q - qT) / 0.54), 2);
      const cone = Math.exp(-(g.u * g.u) * 1.2);
      const tw = 0.55 + 0.45 * Math.sin(t * g.sp + g.ph);
      const fade = 1 - 0.45 * smoothstep(0.82, 1.0, row.d);
      const a = (0.34 + 0.66 * spec) * cone * (0.42 + 0.58 * g.a) * (0.72 + 0.28 * tw) * Math.pow(row.alpha, 0.6) * specK * fade;
      if (a < 0.055) continue;
      const y = row.y + row.amp * w.h * ampK + g.off;
      const x0 = x - g.len / 2, x1 = x + g.len / 2;
      const b = a > 0.58 ? 2 : a > 0.34 ? 1 : 0;
      lit[b].push(x0, x1, y);
      if (b === 2) shadow[b].push(x0 + 1, x1 - 1, y + 1.8);
      else if (b === 1) shadow[b].push(x0 + 1, x1 - 1, y + 1.6);
    }
  }
  for (let b = 0; b < 3; b++) {
    const list = shadow[b];
    if (!list.length) continue;
    ctx.strokeStyle = KIT.rgba('#43605c', [0.10, 0.16, 0.22][b]);
    ctx.lineWidth = [1.4, 1.8, 2.2][b];
    ctx.beginPath();
    for (let k = 0; k < list.length; k += 3) {
      const x0 = list[k], x1 = Math.min(list[k + 1], greenEdge - 1), y = list[k + 2];
      if (x1 <= x0) continue;
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
    }
    ctx.stroke();
  }
  for (let b = 0; b < 3; b++) {
    const list = lit[b];
    if (!list.length) continue;
    ctx.strokeStyle = KIT.rgba(b === 2 ? '#ffffff' : '#fdfcf5', [0.52, 0.76, 1.0][b]);
    ctx.lineWidth = [1.6, 2.4, 3.4][b];
    ctx.beginPath();
    for (let k = 0; k < list.length; k += 3) {
      const x0 = list[k], x1 = Math.min(list[k + 1], greenEdge - 1), y = list[k + 2];
      if (x1 <= x0) continue;
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
    }
    ctx.stroke();
  }
  ctx.restore();

  // 4. outside the cone: a handful of cool dashes in the middle distance only
  const cool = [[], []];
  const STEP = 12;
  for (let i = 0; i < ROWS.length; i++) {
    const row = ROWS[i];
    if (row.d < 0.16 || row.d > 0.78 || i % 2 !== 0) continue;
    let runStart = -1;
    let runEnd = -1;
    let runAcc = 0;
    let runN = 0;
    const flush = () => {
      const mean = runAcc / Math.max(1, runN);
      const xm = (runStart + runEnd) / 2;
      const coneW = 40 + 250 * row.d;
      const cone = Math.exp(-Math.pow((xm - MOON.x) / coneW, 2) * 2.1);
      if (cone < 0.12 && mean > 0.42) {
        const yA = row.y + row.amp * wave(row, runStart, t).h * ampK;
        const yB = row.y + row.amp * wave(row, runEnd, t).h * ampK;
        cool[mean > 0.62 ? 1 : 0].push(runStart, runEnd, yA, yB);
      }
    };
    for (let x = -40; x <= W + 40; x += STEP) {
      const w = wave(row, x, t);
      const dir = clamp((x - MOON.x) / (150 + 760 * row.d), -1, 1);
      const qT = dir * 0.60;
      const spec = Math.pow(clamp01(1 - Math.abs(w.q - qT) / 0.40), 3);
      if (spec > 0.06) {
        if (runStart < 0) { runStart = x; runAcc = 0; runN = 0; }
        runEnd = x; runAcc += spec; runN++;
      } else if (runStart >= 0) {
        if (runEnd - runStart >= STEP) flush();
        runStart = -1;
      }
    }
    if (runStart >= 0 && runEnd - runStart >= STEP) flush();
  }
  ctx.save();
  ctx.lineCap = 'round';
  for (let b = 0; b < 2; b++) {
    const list = cool[b];
    if (!list.length) continue;
    ctx.strokeStyle = KIT.rgba('#3d5855', [0.075, 0.13][b]);
    ctx.lineWidth = [1.0, 1.4][b];
    ctx.beginPath();
    for (let k = 0; k < list.length; k += 4) {
      const x0 = list[k], x1 = list[k + 1], y0 = list[k + 2], y1 = list[k + 3];
      const xe = x1 < greenEdge ? x1 : greenEdge - 1;
      if (xe <= x0) continue;
      ctx.moveTo(x0, y0);
      ctx.lineTo(xe, x1 < greenEdge ? y1 : y0);
    }
    ctx.stroke();
  }
  ctx.restore();

  // 5. greens take over the far-right rows
  if (greenP > 0.002) {
    ctx.save();
    ctx.lineCap = 'round';
    for (let b = 0; b < 3; b++) {
      const list = lit[b];
      if (!list.length) continue;
      ctx.strokeStyle = KIT.rgba(GREEN, (0.34 + b * 0.22) * greenP);
      ctx.lineWidth = [1.2, 1.7, 2.3][b];
      ctx.beginPath();
      for (let k = 0; k < list.length; k += 3) {
        const x0 = Math.max(list[k], greenEdge), x1 = list[k + 1], y = list[k + 2];
        if (x1 <= x0) continue;
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ boat */
function drawBoat(ctx, u) {
  const enter = easeOut(clamp01((u - 0.15) / 1.5));
  const drift = smoothstep(1.4, 6.0, u);
  const alpha = smoothstep(0.12, 1.05, u);
  if (alpha <= 0.002) return;
  const P = KIT.rig.boatPose({ t: u, phase: u * 1.18 });
  const bx = lerp(516, 634, enter) + drift * 96;
  const by = 740 + Math.sin(u * 1.15 + 0.6) * 2.0;
  const S = 0.74;
  const place = { x: bx, y: by, scale: S };
  const pos = KIT.rig.placed(P, place);
  const T = (x, y) => [place.x + x * S, place.y + y * S];

  ctx.save();
  ctx.globalAlpha = alpha;

  // reflection: three or four broken grey strokes, only after the water wakes
  if (u > 2.0) {
    for (let i = 0; i < 6; i++) {
      const y = by + 27 + i * 5;
      const w2 = (222 - i * 24) * (0.85 + 0.15 * Math.sin(u * 2.2 + i));
      ctx.fillStyle = KIT.rgba('#43514f', 0.11 - i * 0.014);
      ctx.fillRect(bx - w2 / 2 + Math.sin(u * 1.7 + i * 1.3) * 4, y, w2, 1.4);
    }
  }

  // --- the six marks -------------------------------------------------------
  const hullPart = pos.parts.find((p) => p.id === 'boatHull');
  if (hullPart && hullPart.pts) {
    const hp = hullPart.pts;
    // 1 · the bottom of the hull: one heavy, dry, uneven stroke
    KIT.ink.brushStroke(ctx, hp.slice(0, 7), {
      color: INK, width: 6.4, dry: 0.48, alpha: 0.94, taper: 0.5, seed: 121, paperColor: PAPER, bleed: 0.045,
    });
    // 2 · the gunwale, thinner, drawn with the tip
    KIT.ink.brushStroke(ctx, hp.slice(6), {
      color: INK, width: 3.4, dry: 0.62, alpha: 0.82, taper: 0.66, seed: 122, paperColor: PAPER, bleed: 0.03,
    });
    // 3 · the interior: a light wash that stops short of the ends
    ctx.save();
    poly(ctx, hp, true);
    ctx.clip();
    ctx.fillStyle = KIT.linear(ctx, bx - 240 * S, by, bx + 280 * S, by, [
      [0, 'rgba(27,24,18,0.02)'], [0.42, 'rgba(27,24,18,0.16)'], [0.8, 'rgba(27,24,18,0.09)'], [1, 'rgba(27,24,18,0.02)'],
    ]);
    ctx.fillRect(bx - 300, by - 60, 640, 120);
    ctx.restore();
  }

  const deck = pos.parts.find((p) => p.id === 'deck');
  if (deck) {
    KIT.ink.brushStroke(ctx, deck.pts, {
      color: INK, width: 1.7, dry: 0.78, alpha: 0.44, taper: 0.5, seed: 123, paperColor: PAPER, bleed: 0,
    });
  }

  // 4 · the canopy: a low awning, two strokes, three ribs, almost no fill
  const canopy = smooth([T(-14, -76), T(16, -104), T(116, -108), T(156, -78)], 6);
  ctx.save();
  ctx.fillStyle = 'rgba(27,24,18,0.05)';
  poly(ctx, [...canopy, T(156, -76), T(-14, -72)], true);
  ctx.fill();
  ctx.restore();
  KIT.ink.brushStroke(ctx, canopy, {
    color: INK, width: 2.4, dry: 0.68, alpha: 0.6, taper: 0.6, seed: 124, paperColor: PAPER, bleed: 0.02,
  });
  for (let i = 0; i < 3; i++) {
    const t = 0.24 + i * 0.27;
    const xt = lerp(-14, 116, t);
    KIT.ink.brushStroke(ctx, [T(xt, -106 + i * 1.5), T(xt + 4, -78 + i * 2)], {
      color: INK, width: 1.1, dry: 0.88, alpha: 0.22 - i * 0.03, taper: 0.9, seed: 125 + i, paperColor: PAPER, bleed: 0,
    });
  }

  // 5 · the family: five lives in a few dabs
  const passengers = pos.parts.filter((p) => p.id && p.id.startsWith('passenger'));
  for (const p of passengers) {
    if (p.kind === 'poly') fillPts(ctx, p.pts, 'rgba(27,24,18,0.88)');
    else if (p.kind === 'circle') {
      ctx.fillStyle = 'rgba(27,24,18,0.93)';
      ctx.beginPath(); ctx.arc(p.c[0], p.c[1], p.r, 0, TAU); ctx.fill();
    }
  }
  // a fourth body, and the baby swaddled against the middle passenger
  ctx.fillStyle = 'rgba(27,24,18,0.86)';
  poly(ctx, [T(160, -58), T(190, -64), T(199, -36), T(179, -30)], true);
  ctx.fill();
  const f4h = T(173, -70);
  ctx.beginPath(); ctx.arc(f4h[0], f4h[1], 6.6, 0, TAU); ctx.fill();
  ctx.save();
  const bb = T(52, -52);
  ctx.fillStyle = 'rgba(246,242,232,0.94)';
  ctx.beginPath(); ctx.ellipse(bb[0], bb[1], 8.4, 5.6, -0.22, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(27,24,18,0.5)';
  ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.ellipse(bb[0], bb[1], 8.4, 5.6, -0.22, 0.25, 3.0); ctx.stroke();
  ctx.restore();

  // the old man at the stern: cloak, wide hat, head, and one oar
  const cloak = pos.parts.find((p) => p.id === 'boatCloak');
  const hat = pos.parts.find((p) => p.id === 'boatmanHat');
  const head = pos.parts.find((p) => p.id === 'boatmanHead');
  if (cloak) {
    fillPts(ctx, cloak.pts, 'rgba(27,24,18,0.80)');
    // two dry folds inside the cloak keep it brush, not silhouette
    const cf = cloak.pts;
    KIT.ink.brushStroke(ctx, [cf[2], cf[4], cf[5]], {
      color: PAPER, width: 1.5, dry: 0.4, alpha: 0.16, taper: 0.8, seed: 128, paperColor: INK, bleed: 0,
    });
  }
  if (hat) fillPts(ctx, hat.pts, 'rgba(27,24,18,0.95)');
  if (head) {
    ctx.fillStyle = 'rgba(27,24,18,0.95)';
    ctx.beginPath(); ctx.arc(head.c[0], head.c[1], head.r * 0.94, 0, TAU); ctx.fill();
  }
  const oar = pos.parts.find((p) => p.id === 'oar');
  const blade = pos.parts.find((p) => p.id === 'oarBlade');
  const arm = pos.parts.find((p) => p.id === 'boatArm');
  if (oar) {
    KIT.ink.brushStroke(ctx, oar.pts, {
      color: INK, width: 2.4, dry: 0.75, alpha: 0.66, taper: 0.6, seed: 126, paperColor: PAPER, bleed: 0,
    });
  }
  if (blade) fillPts(ctx, blade.pts, 'rgba(27,24,18,0.62)');
  if (arm) {
    KIT.ink.brushStroke(ctx, arm.pts, {
      color: INK, width: 3.0, dry: 0.62, alpha: 0.72, taper: 0.6, seed: 127, paperColor: PAPER, bleed: 0,
    });
  }

  // 6 · the lantern on the bow: the only warm pixel in the era
  const lx = pos.lantern.x, ly = pos.lantern.y;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = KIT.radial(ctx, lx, ly, 1, lx, ly, 30, [
    [0, 'rgba(255,196,120,0.5)'], [0.4, 'rgba(255,176,96,0.12)'], [1, 'rgba(255,160,80,0)'],
  ]);
  ctx.beginPath(); ctx.arc(lx, ly, 30, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,206,138,0.82)';
  ctx.fillRect(lx - 1.8, ly - 2.4, 3.6, 4.8);

  ctx.restore();
}

/* ------------------------------------------------------------------- gull */
/**
 * Wing = span curve + chord band. Each wing is a centreline sweeping away from
 * the shoulder plus a chord that runs *along the flight direction*, so the wing
 * reads as a bird and not as a leaf. 180 deterministic particles fill the band
 * (P = centre ± chordDir · halfChord); the dry brush cuts the leading edge and
 * the primaries, and one white eye is cut into the head.
 */
const QUAD = (p0, p1, p2, t) => {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
  ];
};

/**
 * Each wing is a tapered curved ribbon: a quadratic spine from the shoulder to a
 * wingtip that hooks back down, with a half-width that thins to a point. The
 * outline is the ribbon boundary; the 180 particles live at (span, chord)
 * coordinates inside it, so a wing beat warps the stipple instead of scattering
 * it. The near wing is heavier and in front, the far wing is foreshortened.
 */
function gullGeom(flap) {
  const up = clamp(flap, -1, 1);
  const beat = -0.26 * up;
  const n0 = [0.16, -0.02], n1 = [-0.50, -0.72 + beat * 0.55], n2 = [-1.24, -0.28 + beat * 1.0];
  const f0 = [0.08, -0.10], f1 = [0.44, -0.56 + beat * 0.5], f2 = [0.82, -0.20 + beat * 0.85];
  const nS = (t) => QUAD(n0, n1, n2, t);
  const fS = (t) => QUAD(f0, f1, f2, t);
  const nW = (t) => 0.205 * Math.pow(1 - t, 0.55) + 0.014;
  const fW = (t) => 0.140 * Math.pow(1 - t, 0.55) + 0.012;
  // body: a slim spindle from tail to shoulder, head on the nose
  const bodyX = (t) => -0.58 + 0.94 * t;
  const bodyH = (t) => 0.072 * Math.pow(Math.sin(Math.PI * clamp01(0.1 + 0.8 * t)), 0.62) + 0.005;
  const bodyY = (t) => 0.02 - 0.05 * t;
  const head = { c: [0.52, -0.062], r: 0.085 };
  const tail = [[-0.54, 0.012], [-0.78, -0.06], [-0.84, 0.008], [-0.74, 0.062], [-0.52, 0.05]];
  return { nS, fS, nW, fW, bodyX, bodyH, bodyY, head, tail, up, beat };
}

/** Span t ∈ [0,1], chord s ∈ [−1 leading … +1 trailing]. */
function wingPoint(S, W, t, s) {
  const p = S(t);
  const a = S(Math.min(1, t + 0.012));
  const b = S(Math.max(0, t - 0.012));
  const dx = a[0] - b[0], dy = a[1] - b[1];
  const len = Math.hypot(dx, dy) || 1;
  const w = W(t) * s;
  return [p[0] - (dy / len) * w, p[1] + (dx / len) * w];
}

function wingOutline(S, W, steps = 14) {
  const pts = [];
  for (let i = 0; i <= steps; i++) pts.push(wingPoint(S, W, i / steps, -1));
  for (let i = steps; i >= 0; i--) pts.push(wingPoint(S, W, i / steps, 1));
  return pts;
}

const GULLPART = (() => {
  const r = mulberry32(hash('s12gull', 768));
  const out = [];
  // 98 on the near wing: leading edge teeth, trailing edge teeth, inner grain
  for (let i = 0; i < 98; i++) {
    const t = Math.pow(r(), 0.7);
    const roll = r();
    const s = roll < 0.34 ? -1 + r() * 0.14 : roll < 0.62 ? 1 - r() * 0.16 : (r() * 2 - 1) * 0.82;
    out.push({ k: 0, t, s, size: 1.7 + Math.pow(r(), 1.4) * 2.6, a: 0.48 + r() * 0.5, ph: r() * TAU });
  }
  // 30 on the far wing
  for (let i = 0; i < 30; i++) {
    const t = Math.pow(r(), 0.78);
    const s = r() < 0.5 ? -1 + r() * 0.3 : (r() * 2 - 1) * 0.8;
    out.push({ k: 1, t, s, size: 1.2 + Math.pow(r(), 1.7) * 1.9, a: 0.26 + r() * 0.34, ph: r() * TAU });
  }
  // 30 on the body
  for (let i = 0; i < 30; i++) {
    out.push({ k: 2, t: 0.04 + r() * 0.92, s: (r() * 2 - 1) * 0.92, size: 1.4 + r() * 2.0, a: 0.42 + r() * 0.5, ph: r() * TAU });
  }
  // 14 around the head
  for (let i = 0; i < 14; i++) {
    out.push({ k: 3, t: r(), s: r(), size: 1.3 + r() * 1.7, a: 0.45 + r() * 0.5, ph: r() * TAU });
  }
  // 8 on the tail
  for (let i = 0; i < 8; i++) {
    out.push({ k: 4, t: r(), s: r() * 2 - 1, size: 1.2 + r() * 1.5, a: 0.35 + r() * 0.4, ph: r() * TAU });
  }
  return out;
})();

function gullPos(u) {
  const p = clamp01((u - 2.0) / 1.72);
  const e = p * p * (3 - 2 * p);
  const p0 = [872, 736], p1 = [1210, 700], p2 = [1748, 456];
  const x = (1 - e) * (1 - e) * p0[0] + 2 * (1 - e) * e * p1[0] + e * e * p2[0];
  const y = (1 - e) * (1 - e) * p0[1] + 2 * (1 - e) * e * p1[1] + e * e * p2[1];
  const dx = 2 * (1 - e) * (p1[0] - p0[0]) + 2 * e * (p2[0] - p1[0]);
  const dy = 2 * (1 - e) * (p1[1] - p0[1]) + 2 * e * (p2[1] - p1[1]);
  const rot = Math.atan2(dy, dx) * 0.36 - 0.06;
  const scale = 118 + 14 * Math.sin(Math.PI * e);
  return { x, y, rot, scale, p };
}

function drawGull(ctx, u) {
  if (u < 1.99) return;
  if (u > 4.3) { drawFeather(ctx, u); return; }
  const gp = gullPos(u);
  const flap = Math.sin((u - 2.0) * TAU * 1.36 - 0.4);
  const G = gullGeom(flap);
  const alpha = smoothstep(1.99, 2.12, u) * (1 - smoothstep(3.36, 3.76, u));
  if (alpha <= 0.002) return;
  const c = Math.cos(gp.rot), s = Math.sin(gp.rot);
  const S = gp.scale;
  const L2W = (x, y) => [gp.x + (x * c - y * s) * S, gp.y + (x * s + y * c) * S];
  const toScreen = (pts) => pts.map((q) => L2W(q[0], q[1]));

  const nearS = toScreen(wingOutline(G.nS, G.nW));
  const farS = toScreen(wingOutline(G.fS, G.fW));

  ctx.save();
  ctx.globalAlpha = alpha;

  // far wing, behind and paler
  const fRoot = L2W(G.fS(0)[0], G.fS(0)[1]);
  const fTip = L2W(G.fS(1)[0], G.fS(1)[1]);
  const fg = ctx.createLinearGradient(fRoot[0], fRoot[1], fTip[0], fTip[1]);
  fg.addColorStop(0, 'rgba(27,24,18,0.40)');
  fg.addColorStop(0.7, 'rgba(27,24,18,0.24)');
  fg.addColorStop(1, 'rgba(27,24,18,0.10)');
  ctx.fillStyle = fg;
  poly(ctx, farS, true);
  ctx.fill();

  // near wing: a gradient from the heavy shoulder to the dry tip
  const nRoot = L2W(G.nS(0)[0], G.nS(0)[1]);
  const nTip = L2W(G.nS(1)[0], G.nS(1)[1]);
  const ng = ctx.createLinearGradient(nRoot[0], nRoot[1], nTip[0], nTip[1]);
  ng.addColorStop(0, 'rgba(27,24,18,0.86)');
  ng.addColorStop(0.5, 'rgba(27,24,18,0.70)');
  ng.addColorStop(0.86, 'rgba(27,24,18,0.42)');
  ng.addColorStop(1, 'rgba(27,24,18,0.16)');
  ctx.fillStyle = ng;
  poly(ctx, nearS, true);
  ctx.fill();

  // body in front of the wing root: spindle + tail fan
  ctx.beginPath();
  for (let i = 0; i <= 9; i++) {
    const t = i / 9;
    const q = L2W(G.bodyX(t), G.bodyY(t) - G.bodyH(t));
    if (i === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
  }
  for (let i = 9; i >= 0; i--) {
    const t = i / 9;
    const q = L2W(G.bodyX(t), G.bodyY(t) + G.bodyH(t));
    ctx.lineTo(q[0], q[1]);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(27,24,18,0.93)';
  ctx.fill();
  ctx.fillStyle = 'rgba(27,24,18,0.78)';
  poly(ctx, toScreen(G.tail), true);
  ctx.fill();
  // a pale belly line so the spindle keeps its form
  ctx.strokeStyle = 'rgba(246,242,232,0.22)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i <= 8; i++) {
    const t = 0.1 + (i / 8) * 0.78;
    const q = L2W(G.bodyX(t), G.bodyY(t) + G.bodyH(t) * 0.35);
    if (i === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
  }
  ctx.stroke();

  // flying white: two dry bands scratched along the span
  for (let i = 0; i < 2; i++) {
    const pa = wingPoint(G.nS, G.nW, 0.12, -0.15 + i * 0.5);
    const pb = wingPoint(G.nS, G.nW, 0.82, -0.25 + i * 0.55);
    KIT.ink.brushStroke(ctx, [L2W(pa[0], pa[1]), L2W(pb[0], pb[1])], {
      color: PAPER, width: 7 - i * 2, dry: 0.72, alpha: 0.17 - i * 0.04, taper: 0.55,
      seed: 141 + i, paperColor: INK, bleed: 0,
    });
  }
  // feather separations near the tip, carved out of the mass
  for (let i = 0; i < 3; i++) {
    const pa = wingPoint(G.nS, G.nW, 0.62 + i * 0.1, 0.55);
    const pb = wingPoint(G.nS, G.nW, 0.92 + i * 0.02, -0.15);
    KIT.ink.brushStroke(ctx, [L2W(pa[0], pa[1]), L2W(pb[0], pb[1])], {
      color: PAPER, width: 2.4 - i * 0.4, dry: 0.8, alpha: 0.20, taper: 0.8,
      seed: 145 + i, paperColor: INK, bleed: 0,
    });
  }
  ctx.restore();

  // 180 particles: the grain of the ink, the teeth of the silhouette
  ctx.save();
  ctx.globalAlpha = alpha;
  for (const part of GULLPART) {
    let lx, ly;
    if (part.k === 0 || part.k === 1) {
      const q = wingPoint(part.k === 0 ? G.nS : G.fS, part.k === 0 ? G.nW : G.fW, part.t, part.s);
      lx = q[0]; ly = q[1];
    } else if (part.k === 2) {
      lx = G.bodyX(part.t); ly = G.bodyY(part.t) + part.s * G.bodyH(part.t);
    } else if (part.k === 3) {
      const ang = part.t * TAU;
      const rr = Math.sqrt(part.s) * G.head.r;
      lx = G.head.c[0] + Math.cos(ang) * rr;
      ly = G.head.c[1] + Math.sin(ang) * rr * 0.9;
    } else {
      lx = lerp(G.tail[0][0], G.tail[1][0] + 0.04, part.t) + part.s * 0.02;
      ly = lerp(G.tail[0][1], G.tail[1][1], part.t) + part.s * 0.03;
    }
    const wob = Math.sin(u * 5.4 + part.ph) * 0.01;
    const q = L2W(lx + wob, ly + wob * 0.5);
    const tw = 0.72 + 0.28 * Math.sin(u * 7.2 + part.ph);
    ctx.fillStyle = KIT.rgba(INK, part.a * tw);
    const sz = part.size * (S / 118);
    ctx.fillRect(q[0] - sz / 2, q[1] - sz / 2, sz, sz * 0.84);
  }
  ctx.restore();

  // the brush returns: leading edge, trailing edge, primaries
  ctx.save();
  ctx.globalAlpha = alpha;
  const tipA = 0.58 + 0.34 * smoothstep(2.0, 2.6, u);
  const lead = [];
  for (let i = 0; i <= 10; i++) {
    const q = wingPoint(G.nS, G.nW, i / 10, -1);
    lead.push(L2W(q[0], q[1]));
  }
  KIT.ink.brushStroke(ctx, lead, {
    color: INK, width: 2.7, dry: 0.6, alpha: tipA, taper: 0.86, seed: 131, paperColor: PAPER, bleed: 0.02,
  });
  const trail = [];
  for (let i = 3; i <= 10; i++) {
    const q = wingPoint(G.nS, G.nW, i / 10, 1);
    trail.push(L2W(q[0], q[1]));
  }
  KIT.ink.brushStroke(ctx, trail, {
    color: INK, width: 1.4, dry: 0.88, alpha: tipA * 0.5, taper: 0.92, seed: 132, paperColor: PAPER, bleed: 0,
  });
  for (let i = 0; i < 3; i++) {
    const a = wingPoint(G.nS, G.nW, 0.9, -0.7 + i * 0.4);
    const b = wingPoint(G.nS, G.nW, 1.0, -0.45 + i * 0.34);
    const pa = L2W(a[0], a[1]);
    const pb = L2W(b[0] - 0.045 - i * 0.03, b[1] + 0.02 + i * 0.02);
    KIT.ink.brushStroke(ctx, [pa, pb], {
      color: INK, width: 1.3 - i * 0.2, dry: 0.9, alpha: tipA * (0.6 - i * 0.1), taper: 0.96,
      seed: 133 + i, paperColor: PAPER, bleed: 0,
    });
  }
  const lead2 = [];
  for (let i = 0; i <= 7; i++) {
    const q = wingPoint(G.fS, G.fW, i / 7, -1);
    lead2.push(L2W(q[0], q[1]));
  }
  KIT.ink.brushStroke(ctx, lead2, {
    color: INK, width: 1.5, dry: 0.76, alpha: tipA * 0.55, taper: 0.88, seed: 137, paperColor: PAPER, bleed: 0,
  });
  ctx.restore();

  // Bada's eye: white sclera, broken black rim, pupil pushed to the top
  const hc = L2W(G.head.c[0], G.head.c[1]);
  const er = G.head.r * S;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(27,24,18,0.95)';
  ctx.beginPath(); ctx.ellipse(hc[0], hc[1], er * 1.24, er * 1.02, -0.12, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(27,24,18,0.92)';
  ctx.lineWidth = Math.max(1.3, er * 0.24);
  ctx.beginPath();
  ctx.moveTo(hc[0] + er * 0.85, hc[1] - er * 0.02);
  ctx.lineTo(hc[0] + er * 2.0, hc[1] + er * 0.36);
  ctx.moveTo(hc[0] + er * 0.9, hc[1] + er * 0.32);
  ctx.lineTo(hc[0] + er * 1.7, hc[1] + er * 0.56);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,253,246,0.99)';
  ctx.beginPath(); ctx.ellipse(hc[0] + er * 0.18, hc[1] - er * 0.06, er * 0.72, er * 0.74, -0.12, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(27,24,18,0.95)';
  ctx.lineWidth = Math.max(1.2, er * 0.18);
  ctx.beginPath();
  ctx.ellipse(hc[0] + er * 0.18, hc[1] - er * 0.06, er * 0.72, er * 0.74, -0.12, 0.35, 5.75);
  ctx.stroke();
  ctx.fillStyle = 'rgba(19,17,13,0.98)';
  ctx.beginPath(); ctx.arc(hc[0] + er * 0.38, hc[1] - er * 0.42, er * 0.25, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,250,0.9)';
  ctx.beginPath(); ctx.arc(hc[0] + er * 0.45, hc[1] - er * 0.53, er * 0.07, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawFeather(ctx, u) {
  const p = clamp01((u - 4.24) / 1.2);
  if (p >= 1) return;
  const x = lerp(1214, 1300, p) + Math.sin(p * 7) * 9;
  const y = lerp(612, 726, p * p);
  ctx.save();
  ctx.globalAlpha = (1 - p) * 0.8;
  ctx.strokeStyle = 'rgba(27,24,18,0.7)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 9, y - 8, x + 17, y - 1);
  ctx.stroke();
  ctx.fillStyle = 'rgba(27,24,18,0.4)';
  ctx.fillRect(x + 3, y - 4, 1.4, 5);
  ctx.restore();
}

/* ------------------------------------------------------------------- poem */
function drawPoem(ctx, u) {
  const r = mulberry32(hash('s12poem', 768));
  ctx.save();
  ctx.font = `500 ${POEM_SIZE}px ${KIT.FONT.display}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let c = 0; c < POEM.length; c++) {
    const col = POEM[c];
    const chars = [...col.text];
    for (let i = 0; i < chars.length; i++) {
      const st = 2.0 + i * 0.082 + c * 0.05;
      const a = smoothstep(st, st + 0.32, u);
      if (a <= 0.004) continue;
      const jx = (r() - 0.5) * POEM_SIZE * 0.06;
      const jy = (r() - 0.5) * POEM_SIZE * 0.06;
      const lift = (1 - a) * 7;
      ctx.save();
      ctx.globalAlpha = a * 0.98;
      ctx.translate(col.x + jx, col.y0 + i * POEM_GAP + jy - lift);
      ctx.rotate((r() - 0.5) * 0.016);
      ctx.fillStyle = INK;
      ctx.fillText(chars[i], 0, 0);
      ctx.globalAlpha = a * 0.10;
      ctx.fillText(chars[i], 0.8, 0.9);
      ctx.restore();
    }
  }
  ctx.restore();
  markText('s12-poem', POEM.map((c) => c.text).join(''),
    POEM[1].x - POEM_SIZE / 2, POEM[0].y0 - POEM_SIZE / 2,
    (POEM[0].x - POEM[1].x) + POEM_SIZE, POEM_GAP * 12,
    { size: POEM_SIZE, align: 'center', color: INK });
}

function drawAttribution(ctx, u) {
  const a = smoothstep(2.5, 3.2, u) * 0.86;
  if (a <= 0.004) return;
  ctx.save();
  ctx.globalAlpha = a;
  KIT.drawText(ctx, '八大山人 · 写意', 1746, 840, {
    size: 24, font: KIT.FONT.serif, weight: 500, color: 'rgba(27,24,18,0.78)',
    align: 'right', letterSpacing: 1.2,
  });
  KIT.drawText(ctx, '大历三年 · 湘江', 1746, 872, {
    size: 24, font: KIT.FONT.serif, weight: 500, color: 'rgba(27,24,18,0.56)',
    align: 'right', letterSpacing: 1.2,
  });
  ctx.restore();
}

function drawSeal(ctx, u) {
  const p = clamp01((u - 2.36) / 0.16);
  if (p <= 0) return;
  const sc = 0.86 + 0.14 * easeOut(p) + Math.exp(-p * 7) * 0.06;
  ctx.save();
  ctx.globalAlpha = 0.94 * easeOut(p);
  ctx.translate(1714, 914);
  ctx.scale(sc, sc);
  ctx.translate(-1714, -914);
  KIT.ink.sealStamp(ctx, 1692, 892, 44, '少陵', {
    seed: 768, color: SEAL, vertical: true, border: true, inset: 4.4, rotate: -0.012,
  });
  ctx.restore();
}

/** A specimen label, small enough to be a whisper. */
function drawSpecimenLabel(ctx, u) {
  const a = smoothstep(4.55, 5.05, u) * 0.32;
  if (a <= 0.004) return;
  ctx.save();
  ctx.globalAlpha = a;
  KIT.drawText(ctx, 'SINE-NORMAL WATER · 48 ROWS · 180-PARTICLE GULL', 84, 1010, {
    size: 11, font: KIT.FONT.mono, weight: 500, color: 'rgba(27,24,18,0.62)', letterSpacing: 1.4,
  });
  ctx.fillStyle = 'rgba(27,24,18,0.28)';
  ctx.fillRect(84, 1022, 210, 1);
  ctx.restore();
}

/* ------------------------------------------------------------ CRT leak */
function drawCrtLeak(ctx, u, edge) {
  const p = smoothstep(5.5, 5.86, u);
  if (p <= 0.001) return;
  const band = W - edge;
  ctx.save();
  ctx.fillStyle = KIT.linear(ctx, edge, 0, W, 0, [
    [0, KIT.rgba('#03170d', 0.28 * p)],
    [0.55, KIT.rgba('#03170d', 0.50 * p)],
    [1, KIT.rgba('#010d07', 0.64 * p)],
  ]);
  ctx.fillRect(edge, HORIZON - 2, band, H - HORIZON + 2);
  for (let i = 0; i < ROWS.length; i++) {
    const row = ROWS[i];
    const flick = 0.55 + 0.45 * Math.sin(u * 46 + i * 1.7);
    ctx.fillStyle = KIT.rgba(GREEN, p * (0.10 + 0.46 * Math.pow(row.d, 0.5)) * flick);
    ctx.fillRect(edge, row.y, band, 1 + row.d * 1.3);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = KIT.linear(ctx, edge - 4, 0, edge + 26, 0, [
    [0, KIT.rgba(GREEN, 0)], [0.2, KIT.rgba(GREEN, 0.55 * p)],
    [0.55, KIT.rgba('#9dffbe', 0.22 * p)], [1, KIT.rgba(GREEN, 0)],
  ]);
  ctx.fillRect(edge - 4, HORIZON - 4, 30, H - HORIZON + 4);
  ctx.fillStyle = KIT.rgba('#c8ffd8', 0.55 * p);
  ctx.fillRect(edge + 0.4, HORIZON - 4, 1.2, H - HORIZON + 4);
  for (let i = 0; i < 5; i++) {
    const yy = HORIZON + 40 + unit(7699, i, 2) * (H - HORIZON - 80);
    const ww = 12 + unit(7699, i, 3) * (band * 0.9);
    ctx.fillStyle = KIT.rgba(GREEN, p * (0.05 + unit(7699, i, 4) * 0.22));
    ctx.fillRect(edge + 3, yy, ww, 1 + unit(7699, i, 5) * 2);
  }
  ctx.restore();
  ctx.restore();
}

/* --------------------------------------------------------------- render */
export function renderAt(ctx, u, beat, env = {}) {
  const base = buildBase();
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(base, 0, 0);

  const greenP = smoothstep(5.5, 5.86, u);
  const greenEdge = 1788 - greenP * 12;
  drawWater(ctx, u, greenP, greenEdge);

  // harbour light on the far shore: bar 3 asks a question and does not answer it
  if (u > 4.2) {
    const hp = smoothstep(4.2, 5.4, u);
    const hx = 1318, hy = HORIZON - 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = KIT.radial(ctx, hx, hy, 0, hx, hy, 26 + 8 * hp, [
      [0, `rgba(255,214,150,${0.5 * hp})`],
      [0.28, `rgba(255,190,110,${0.15 * hp})`],
      [1, 'rgba(255,180,90,0)'],
    ]);
    ctx.fillRect(hx - 40, hy - 40, 80, 80);
    ctx.fillStyle = `rgba(255,229,178,${0.9 * hp})`;
    ctx.fillRect(hx - 1, hy - 2, 2, 2.4);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = `rgba(255,208,140,${(0.30 - i * 0.08) * hp})`;
      ctx.fillRect(hx - 8 + i * 2, hy + 10 + i * 11, 16 - i * 4, 1.2);
    }
    ctx.restore();
  }

  drawBoat(ctx, u);
  drawGull(ctx, u);
  drawPoem(ctx, u);
  drawAttribution(ctx, u);
  drawSeal(ctx, u);
  drawSpecimenLabel(ctx, u);
  drawCrtLeak(ctx, u, greenEdge);

  ctx.save();
  ctx.fillStyle = KIT.radial(ctx, W / 2, H * 0.46, H * 0.42, W / 2, H * 0.5, W * 0.66, [
    [0, 'rgba(60,48,30,0)'], [1, 'rgba(60,48,30,0.10)'],
  ]);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.restore();
  void beat; void env;
}

export default { renderAt };






