/**
 * 11 · 北宋巨碑山水 · 夔州登高 / Monumental Landscape Micro-Scale · 766
 *
 * A Fan Kuan-sized ink monolith fills the frame; at its base, on a cliff ledge,
 * Du Fu is an eight-pixel brush mark. On the bar-2 downbeat the camera makes a
 * violent fifteen-fold push into the cliff — the wide painting is only a map,
 * the close-up is drawn again as vector ink at screen resolution — and finds
 * the white-haired old man alone in the wind, with
 * 【无边落木萧萧下，不尽长江滚滚来】 written into the void beside him.
 */
import KIT from '../kit/index.js';
import { clamp01, clamp, lerp, smoothstep, easeOut, easeIn, hash, unit, mulberry32, TAU } from '../kit/math.js';
import { markText } from '../kit/debug.js';

const W = 1920, H = 1080;
const PAPER = '#e8dfc9';
const INK = '#191711';
const WARM = '#6e6554';
const MOSS = '#3e4636';
const SEAL = '#a52a22';
const MIST = '#f1e9d5';

/** World point the camera dives into (the ledge / pavilion), and where it lands. */
const FOCUS = { x: 930, y: 800 };
const LAND = { x: 762, y: 800 };

/* ------------------------------------------------------------------ terrain */
/** Hand-authored silhouette: a high plateau, two shoulders, a valley notch. */
const PROFILE = [
  [-80, 486], [40, 430], [140, 372], [230, 318], [320, 286], [400, 310],
  [470, 262], [540, 206], [610, 162], [680, 126], [760, 104], [840, 92],
  [920, 88], [1000, 104], [1070, 134], [1140, 182], [1200, 244], [1260, 310],
  [1310, 372], [1360, 424], [1420, 470], [1480, 520], [1550, 572],
  [1630, 640], [1710, 706], [1810, 782], [1920, 852],
];
function profileY(x) {
  if (x <= PROFILE[0][0]) return PROFILE[0][1];
  for (let i = 1; i < PROFILE.length; i++) {
    const a = PROFILE[i - 1], b = PROFILE[i];
    if (x <= b[0]) {
      const t = (x - a[0]) / (b[0] - a[0]);
      const s = t * t * (3 - 2 * t);
      return lerp(a[1], b[1], s);
    }
  }
  return PROFILE[PROFILE.length - 1][1];
}
function massTop(x) {
  const n = (KIT.ridged2(x * 0.0062, 0.71, 4, 7661) - 0.45) * 34
    + (KIT.noise2(x * 0.031, 1.3, 7662) - 0.5) * 9
    + (KIT.noise2(x * 0.115, 2.3, 7663) - 0.5) * 3.4;
  return profileY(x) + n;
}

/* ------------------------------------------------------------------- cunfa */
/**
 * Multi-scale axe-cut strokes. Each stroke: [x, y, angle, length, width, tone].
 * Tones are batched so a whole layer costs four fill-style changes.
 */
function buildCunfa(box, cell, seed, opts = {}) {
  const tones = [[], [], [], []];
  const wMul = opts.wMul ?? 1;
  const lenMul = opts.lenMul ?? 1.4;
  const skip = opts.skip ?? 0.26;
  const inside = opts.inside || ((x, y) => y > massTop(x) + 10);
  for (let y = box.y0; y < box.y1; y += cell) {
    for (let x = box.x0; x < box.x1; x += cell) {
      const h = unit(seed, x, y);
      if (h < skip) continue;
      const px = x + (unit(seed, x, y, 1) - 0.5) * cell * 1.1;
      const py = y + (unit(seed, x, y, 2) - 0.5) * cell * 1.1;
      if (!inside(px, py)) continue;
      const slope = (massTop(px + 6) - massTop(px - 6)) / 12;
      const fall = Math.atan2(1, -slope);
      const wob = (unit(seed, x, y, 3) - 0.5) * 1.15;
      const ang = fall * 0.55 - Math.PI * 0.5 * 0.45 + wob;
      const len = cell * (0.62 + unit(seed, x, y, 4) * lenMul);
      const wdt = cell * 0.1 * wMul * (0.45 + unit(seed, x, y, 5) * 1.15);
      const t = Math.min(3, Math.floor(unit(seed, x, y, 6) * 3.35));
      tones[t].push([px, py, ang, len, wdt, t]);
    }
  }
  return tones;
}
const TONE_RGBA = [
  'rgba(25,23,17,0.075)',
  'rgba(25,23,17,0.14)',
  'rgba(25,23,17,0.24)',
  'rgba(25,23,17,0.4)',
];
function drawCunfa(ctx, tones, view) {
  for (let t = 0; t < 4; t++) {
    const arr = tones[t];
    if (!arr || !arr.length) continue;
    ctx.fillStyle = TONE_RGBA[t];
    for (let i = 0; i < arr.length; i++) {
      const s = arr[i];
      if (view && (s[0] < view.x0 || s[0] > view.x1 || s[1] < view.y0 || s[1] > view.y1)) continue;
      const ca = Math.cos(s[2]), sa = Math.sin(s[2]);
      const nx = -sa, ny = ca;
      const hw = s[4] * 0.5;
      const x1 = s[0] + ca * s[3], y1 = s[1] + sa * s[3];
      ctx.beginPath();
      ctx.moveTo(s[0] + nx * hw, s[1] + ny * hw);
      ctx.lineTo(x1 + nx * hw * 0.16, y1 + ny * hw * 0.16);
      ctx.lineTo(x1 - nx * hw * 0.16, y1 - ny * hw * 0.16);
      ctx.lineTo(s[0] - nx * hw, s[1] - ny * hw);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/* ---------------------------------------------------------------- paper/wash */
function paperLayer() {
  return KIT.paper.ricePaper(W, H, {
    tone: PAPER, seed: 766, fibers: 1700, stains: 12, mottle: 0.55, edgeBurn: 0.26,
  });
}

/* --------------------------------------------------------------- the massif */
function ridgePath(ctx, step = 6) {
  ctx.beginPath();
  for (let x = -30; x <= W + 30; x += step) {
    const y = massTop(x);
    if (x === -30) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.lineTo(W + 30, H + 40);
  ctx.lineTo(-30, H + 40);
  ctx.closePath();
}

function drawMassif(ctx) {
  // one solid mass of ink, deepest at the valley floor
  ridgePath(ctx);
  const g = ctx.createLinearGradient(0, 60, 0, H);
  g.addColorStop(0, 'rgba(72,65,48,0.55)');
  g.addColorStop(0.2, 'rgba(54,49,36,0.72)');
  g.addColorStop(0.5, 'rgba(31,29,21,0.9)');
  g.addColorStop(0.78, 'rgba(24,22,15,0.94)');
  g.addColorStop(1, 'rgba(15,13,8,0.98)');
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  ridgePath(ctx);
  ctx.clip();

  // a dark cap of rock just under the crest, so the ridge cuts hard
  ctx.beginPath();
  for (let x = -30; x <= W + 30; x += 8) {
    const y = massTop(x) + 84 + (KIT.noise2(x * 0.014, 4.4, 7665) - 0.5) * 46;
    if (x === -30) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let x = W + 30; x >= -30; x -= 8) {
    ctx.lineTo(x, massTop(x) - 20);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(12,11,7,0.3)';
  ctx.fill();

  // rock ribs: vertical folds hanging off the crest
  const rv = mulberry32(76631);
  for (let i = 0; i < 28; i++) {
    const x = -40 + i * 62 + (rv() - 0.5) * 40;
    const top = massTop(x) + 16;
    const len = 220 + rv() * 600;
    const wd = 12 + rv() * 52;
    const dx = (rv() - 0.5) * 120;
    ctx.beginPath();
    ctx.moveTo(x - wd * 0.35, top);
    ctx.quadraticCurveTo(x + dx * 0.5 - wd * 0.55, top + len * 0.5, x + dx - wd * 0.12, top + len);
    ctx.lineTo(x + dx + wd * 0.5, top + len);
    ctx.quadraticCurveTo(x + dx * 0.5 + wd * 0.42, top + len * 0.45, x + wd * 0.42, top);
    ctx.closePath();
    ctx.fillStyle = `rgba(11,10,6,${(0.06 + rv() * 0.2).toFixed(3)})`;
    ctx.fill();
    // paper light along one fold edge
    ctx.beginPath();
    ctx.moveTo(x + wd * 0.44, top + 6);
    ctx.quadraticCurveTo(x + dx * 0.5 + wd * 0.46, top + len * 0.46, x + dx + wd * 0.52, top + len * 0.96);
    ctx.strokeStyle = `rgba(243,236,217,${(0.015 + rv() * 0.05).toFixed(3)})`;
    ctx.lineWidth = 0.7 + rv() * 1.2;
    ctx.stroke();
  }

  // rain-drop grooves on the faces
  for (let i = 0; i < 520; i++) {
    const x = -20 + rv() * 1660;
    const top = massTop(x);
    const y = top + 24 + rv() * 620;
    const len = 6 + rv() * 26;
    const slant = -0.7 + rv() * 1.2;
    ctx.strokeStyle = `rgba(10,9,6,${(0.05 + rv() * 0.2).toFixed(3)})`;
    ctx.lineWidth = 0.6 + rv() * 2.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(slant) * len, y + Math.sin(slant) * len * 1.7);
    ctx.stroke();
  }

  // a few hard facets near the summit only
  const rf = mulberry32(7664);
  for (let i = 0; i < 14; i++) {
    const x = 180 + rf() * 1200;
    const top = massTop(x);
    const wd = 30 + rf() * 110;
    const ht = 40 + rf() * 130;
    ctx.beginPath();
    ctx.moveTo(x, top + 16 + rf() * 40);
    ctx.lineTo(x + wd, top + 44 + rf() * 50);
    ctx.lineTo(x + wd * 0.6, top + ht);
    ctx.lineTo(x - wd * 0.18, top + ht * 0.7);
    ctx.closePath();
    ctx.fillStyle = rf() < 0.7
      ? `rgba(8,7,4,${(0.08 + rf() * 0.14).toFixed(3)})`
      : `rgba(240,232,212,${(0.03 + rf() * 0.05).toFixed(3)})`;
    ctx.fill();
  }
  ctx.restore();

  // the ridge itself, carved, with paper light just below
  ctx.beginPath();
  for (let x = -20; x <= W + 20; x += 5) {
    const y = massTop(x);
    if (x === -20) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = 'rgba(10,9,6,0.9)';
  ctx.lineWidth = 3.8;
  ctx.stroke();
  ctx.beginPath();
  for (let x = -20; x <= W + 20; x += 5) {
    const y = massTop(x) + 5;
    if (x === -20) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = 'rgba(245,238,220,0.4)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

/** Paper mist at the foot of the massif (run after the brushwork). */
function drawMassifMist(ctx) {
  ctx.save();
  ridgePath(ctx);
  ctx.clip();
  const g = ctx.createLinearGradient(0, 790, 0, 1080);
  g.addColorStop(0, 'rgba(241,233,213,0)');
  g.addColorStop(0.4, 'rgba(241,233,213,0.5)');
  g.addColorStop(0.75, 'rgba(241,233,213,0.62)');
  g.addColorStop(1, 'rgba(243,236,217,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 760, W, 330);
  // soft cloud puffs where the mountain meets the valley
  for (let p = 0; p < 6; p++) {
    const cy = 812 + p * 26;
    const cx = 90 + p * 350;
    const rad = 210 + (p % 3) * 120;
    const cg = ctx.createRadialGradient(cx, cy, 16, cx, cy, rad);
    cg.addColorStop(0, `rgba(243,236,217,${(0.5 - p * 0.04).toFixed(3)})`);
    cg.addColorStop(0.5, `rgba(241,233,213,${(0.24 - p * 0.02).toFixed(3)})`);
    cg.addColorStop(1, 'rgba(241,233,213,0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rad, rad * 0.26, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/* --------------------------------------------------------------- the river */
function riverSpine() {
  const spine = [
    [1322, 648], [1292, 706], [1308, 764], [1264, 822], [1216, 878],
    [1208, 940], [1162, 1002], [1150, 1080],
  ];
  return KIT.smoothPath(spine, 12);
}

/**
 * A real hanging cataract: no solid tape ribbon and no thick black outline.
 * 1,200半透明 water-mist particles + fine vertical flying-white silk threads,
 * widening as the water falls, and a splash pool at the foot.
 */
function drawRiver(ctx, u = 0) {
  const pts = riverSpine();
  ctx.save();
  // ---- soft body of water (very low alpha, no hard edge)
  const left = [], right = [];
  for (let i = 0; i < pts.length; i++) {
    const t = i / (pts.length - 1);
    const w = 5 + Math.pow(t, 0.7) * 27 + Math.sin(t * Math.PI) * 7;
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(pts.length - 1, i + 1)];
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
    const l = Math.hypot(dx, dy) || 1;
    left.push([pts[i][0] - (dy / l) * w, pts[i][1] + (dx / l) * w]);
    right.push([pts[i][0] + (dy / l) * w, pts[i][1] - (dx / l) * w]);
  }
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i][0], left[i][1]);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  const bodyG = ctx.createLinearGradient(0, 640, 0, H);
  bodyG.addColorStop(0, 'rgba(247,241,225,0.62)');
  bodyG.addColorStop(0.45, 'rgba(247,241,225,0.40)');
  bodyG.addColorStop(0.85, 'rgba(250,245,232,0.26)');
  bodyG.addColorStop(1, 'rgba(250,245,232,0.05)');
  ctx.fillStyle = bodyG;
  ctx.fill();
  ctx.restore();

  // ---- 1,200 water-mist droplets suspended along the fall
  const dr = mulberry32(7666);
  ctx.save();
  for (let i = 0; i < 1200; i++) {
    const t = dr();
    const idx = t * (pts.length - 1);
    const i0 = Math.min(pts.length - 2, Math.floor(idx));
    const f = idx - i0;
    const cxp = lerp(pts[i0][0], pts[i0 + 1][0], f);
    const cyp = lerp(pts[i0][1], pts[i0 + 1][1], f);
    const w = 5 + Math.pow(t, 0.7) * 27;
    const off = (dr() - 0.5) * 2 * w * (0.35 + dr() * 0.9);
    const fall = (u * (26 + dr() * 60) + dr() * 240) % 240;
    const x = cxp + off;
    const y = cyp + (dr() - 0.5) * 30 + fall * 0.16;
    const a = 0.10 + dr() * 0.42;
    const size = 0.7 + Math.pow(dr(), 2) * 2.1;
    ctx.fillStyle = `rgba(250,246,233,${a.toFixed(3)})`;
    ctx.fillRect(x, y, size, size + dr() * 2.4);
  }
  // ---- fine vertical flying-white threads
  for (let i = 0; i < 64; i++) {
    const t = dr();
    const idx = Math.min(pts.length - 1, Math.round(t * (pts.length - 1)));
    const p = pts[idx];
    const w = 5 + Math.pow(t, 0.7) * 27;
    const sx = p[0] + (dr() - 0.5) * 2 * w * 0.92;
    const len = 30 + dr() * 120;
    const sy = p[1] + (dr() - 0.5) * 26;
    ctx.strokeStyle = `rgba(252,247,234,${(0.10 + dr() * 0.34).toFixed(3)})`;
    ctx.lineWidth = 0.6 + dr() * 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + (dr() - 0.5) * 6, sy + len * 0.5, sx + (dr() - 0.5) * 10, sy + len);
    ctx.stroke();
  }
  ctx.restore();

  // ---- splash mist at the foot of the fall
  const foot = pts[pts.length - 4];
  ctx.save();
  const splash = ctx.createRadialGradient(foot[0], foot[1] - 30, 6, foot[0], foot[1] - 30, 150);
  splash.addColorStop(0, 'rgba(250,247,236,0.32)');
  splash.addColorStop(0.55, 'rgba(244,239,224,0.14)');
  splash.addColorStop(1, 'rgba(244,239,224,0)');
  ctx.fillStyle = splash;
  ctx.fillRect(foot[0] - 160, foot[1] - 190, 320, 320);
  ctx.restore();

  // ---- sparse dark accents in the stream, never an outline
  const r = mulberry32(7665);
  ctx.strokeStyle = 'rgba(40,36,26,0.32)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const idx = Math.floor(r() * (pts.length - 2)) + 1;
    const p = pts[idx];
    const t = idx / (pts.length - 1);
    const w = (5 + Math.pow(t, 0.7) * 27) * (r() * 1.1 - 0.55);
    ctx.lineWidth = 0.6 + r() * 0.9;
    ctx.beginPath();
    ctx.moveTo(p[0] + w - 3, p[1] - 2);
    ctx.quadraticCurveTo(p[0] + w, p[1] + 1, p[0] + w + 3 + r() * 6, p[1] - 1);
    ctx.stroke();
  }
  for (let i = 0; i < 12; i++) {
    const idx = Math.floor(r() * (pts.length - 4)) + 2;
    const p = pts[idx];
    const side = r() < 0.5 ? 1 : -1;
    ctx.beginPath();
    ctx.ellipse(p[0] + side * (20 + r() * 18), p[1] + (r() - 0.5) * 16, 3 + r() * 9, 2 + r() * 5, r(), 0, TAU);
    ctx.fillStyle = `rgba(18,16,10,${(0.16 + r() * 0.22).toFixed(3)})`;
    ctx.fill();
  }
}

/**
 * Fan Kuan's 「雨点皴」 and axe-cut strokes, laid over the massif in two denser
 * strata, plus two horizontal cloud bands drifting across the peak.
 */function drawFanKuanTexture(ctx, u = 0) {
  const inside = (x, y) => y > massTop(x) + 8 && y < 1080;
  ctx.save();
  ridgePath(ctx);
  ctx.clip();
  // dense rain-drop cun: short vertical clusters
  const rp = mulberry32(7674);
  for (let i = 0; i < 2600; i++) {
    const x = -30 + rp() * 1700;
    const top = massTop(x);
    const y = top + 10 + Math.pow(rp(), 0.8) * 700;
    if (!inside(x, y)) continue;
    const len = 3 + rp() * 13;
    const wd = 0.7 + rp() * 1.9;
    ctx.fillStyle = `rgba(18,16,11,${(0.05 + rp() * 0.24).toFixed(3)})`;
    ctx.fillRect(x, y, wd, len);
  }
  // axe-cut wedges, denser than the base pass
  const axeTones = buildCunfa({ x0: -20, y0: 90, x1: 1680, y1: 1080 }, 15, 6009, { wMul: 1.4, lenMul: 1.9, skip: 0.12 });
  drawCunfa(ctx, axeTones);
  // two flowing horizontal cloud bands: patchy mist puffs, never hard bars
  for (const band of [{ y: 372, h: 46, sp: 18, a: 0.5, seed: 31 }, { y: 604, h: 58, sp: -13, a: 0.56, seed: 47 }]) {
    for (let i = 0; i < 15; i++) {
      const r1 = KIT.unit(band.seed, i, 1);
      const r2 = KIT.unit(band.seed, i, 2);
      const r3 = KIT.unit(band.seed, i, 3);
      const px = r1 * (W + 420) - 210;
      const py = band.y + (r2 - 0.5) * band.h * 1.3;
      const rx = 150 + r3 * 210;
      const ry = band.h * (0.55 + r2 * 0.6);
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(1, ry / rx);
      const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      gg.addColorStop(0, `rgba(248,243,229,${(0.16 * band.a).toFixed(3)})`);
      gg.addColorStop(0.5, `rgba(244,238,222,${(0.10 * band.a).toFixed(3)})`);
      gg.addColorStop(1, 'rgba(244,238,222,0)');
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
      ctx.restore();
    }
    const br = mulberry32(band.y);
    for (let i = 0; i < 18; i++) {
      const y0 = band.y + (br() - 0.5) * band.h * 1.3;
      const off = (band.sp + br() * 900) % 2100;
      ctx.strokeStyle = `rgba(250,246,234,${(0.04 + br() * 0.1).toFixed(3)})`;
      ctx.lineWidth = 0.8 + br() * 1.8;
      ctx.beginPath();
      for (let x = -60; x <= W + 60; x += 44) {
        const yy = y0 + Math.sin((x + off) * 0.0042 + i) * band.h * 0.4;
        if (x === -60) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------- pavilion and poet */
function drawPavilion(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(24,21,15,0.9)';
  // base
  ctx.fillRect(-34, 54, 68, 7);
  // posts
  ctx.fillRect(-24, 6, 4, 50);
  ctx.fillRect(20, 6, 4, 50);
  // two-tier roof
  ctx.beginPath();
  ctx.moveTo(-44, 8);
  ctx.quadraticCurveTo(-10, -14, 0, -30);
  ctx.quadraticCurveTo(10, -14, 44, 8);
  ctx.quadraticCurveTo(16, 0, 0, 2);
  ctx.quadraticCurveTo(-16, 0, -44, 8);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-30, -16);
  ctx.quadraticCurveTo(-6, -30, 0, -40);
  ctx.quadraticCurveTo(6, -30, 30, -16);
  ctx.quadraticCurveTo(10, -22, 0, -20);
  ctx.quadraticCurveTo(-10, -22, -30, -16);
  ctx.closePath();
  ctx.fill();
  // railing
  ctx.strokeStyle = 'rgba(24,21,15,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-28, 34);
  ctx.lineTo(28, 34);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(-26 + i * 10, 34);
    ctx.lineTo(-26 + i * 10, 44);
    ctx.stroke();
  }
  ctx.restore();
  // the tiny poet, eight pixels of ink
  ctx.fillStyle = 'rgba(20,18,12,0.94)';
  ctx.fillRect(x + 52, y + 34, 3, 8);
  ctx.beginPath();
  ctx.arc(x + 53.5, y + 32, 2.1, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,18,12,0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 55, y + 34);
  ctx.lineTo(x + 58, y + 43);
  ctx.stroke();
}

function drawPines(ctx) {
  const spots = [
    { x: 286, y: 520, s: 1.15, seed: 11 },
    { x: 1246, y: 604, s: 0.9, seed: 12 },
    { x: 690, y: 676, s: 0.7, seed: 13 },
    { x: 1524, y: 748, s: 0.7, seed: 14 },
  ];
  for (const p of spots) {
    const r = mulberry32(7666 + p.seed);
    ctx.strokeStyle = 'rgba(22,20,14,0.9)';
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.6 * p.s;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + 24 * p.s);
    ctx.quadraticCurveTo(p.x - 4 * p.s, p.y - 8 * p.s, p.x + 3 * p.s, p.y - 34 * p.s);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const bx = p.x + 2 * p.s + t * 8 * p.s;
      const by = p.y - (8 + t * 30) * p.s;
      const dir = i % 2 ? 1 : -1;
      ctx.lineWidth = 1.5 * p.s;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + dir * 16 * p.s, by - 4 * p.s, bx + dir * 26 * p.s, by - 1 * p.s);
      ctx.stroke();
      // needle fans
      for (let k = 0; k < 5; k++) {
        const a = -1.1 + dir * (k / 5) * 1.1;
        ctx.strokeStyle = 'rgba(28,26,18,0.55)';
        ctx.lineWidth = 1.1 * p.s;
        ctx.beginPath();
        ctx.moveTo(bx + dir * 18 * p.s, by - 1 * p.s);
        ctx.lineTo(bx + dir * 18 * p.s + Math.cos(a) * (9 + r() * 8) * p.s, by - 1 * p.s + Math.sin(a) * 8 * p.s);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(22,20,14,0.9)';
    }
  }
}

/* ------------------------------------------------------------------ mist */
function mistBand(ctx, y, h, alpha, color = MIST) {
  const g = ctx.createLinearGradient(0, y - h, 0, y + h);
  g.addColorStop(0, 'rgba(241,233,213,0)');
  g.addColorStop(0.5, `rgba(241,233,213,${alpha})`);
  g.addColorStop(1, 'rgba(241,233,213,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, y - h, W, h * 2 + 0.5);
  void color;
}

/* ------------------------------------------------------------- wide shot */
function wideLayer() {
  return KIT.layer('scene11:wide', W, H, (ctx) => {
    ctx.drawImage(paperLayer(), 0, 0);

    // sky: paper negative space, warmed at the top right
    const glow = ctx.createRadialGradient(1740, 260, 40, 1740, 260, 620);
    glow.addColorStop(0, 'rgba(250,244,228,0.85)');
    glow.addColorStop(0.55, 'rgba(238,230,209,0.4)');
    glow.addColorStop(1, 'rgba(232,223,201,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(1180, -60, 800, 800);
    const sky = ctx.createLinearGradient(0, 0, 0, 420);
    sky.addColorStop(0, 'rgba(196,186,164,0.20)');
    sky.addColorStop(1, 'rgba(214,204,182,0)');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, 420);
    // far ranges seen through the gap at the right
    const far = [
      { y: 470, a: 0.14, seed: 71, amp: 74, x0: 1120 },
      { y: 540, a: 0.19, seed: 72, amp: 62, x0: 1240 },
    ];
    for (const f of far) {
      ctx.beginPath();
      ctx.moveTo(f.x0 - 80, 900);
      for (let x = f.x0 - 80; x <= W + 20; x += 10) {
        ctx.lineTo(x, f.y - KIT.fbm1(x * 0.0032, 4, f.seed) * f.amp - Math.sin(x * 0.0045) * 26);
      }
      ctx.lineTo(W + 20, 900);
      ctx.closePath();
      ctx.fillStyle = `rgba(62,70,54,${f.a})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(48,55,42,${f.a + 0.16})`;
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }

    drawMassif(ctx);
    drawFanKuanTexture(ctx, 0);
    drawCunfa(ctx, buildCunfa({ x0: -20, y0: 60, x1: 1660, y1: 1080 }, 25, 6001, { wMul: 1.15, lenMul: 1.6 }));
    // a finer, blacker pass over the cliff face above the shelf
    drawCunfa(ctx, buildCunfa({ x0: 520, y0: 430, x1: 1240, y1: 960 }, 10, 6002, { wMul: 0.6, lenMul: 1.5 }));
    drawRiver(ctx, 0);
    drawMassifMist(ctx);
    drawPines(ctx);

    // the cliff shelf: a peninsula running in from the left, dropping into the gorge
    const shelfTop = [
      [-30, 908], [96, 884], [214, 862], [332, 846], [452, 832], [566, 814],
      [672, 800], [770, 792], [858, 796], [936, 812], [1002, 840], [1034, 864],
    ];
    const shelfBody = [
      ...shelfTop,
      [1010, 936], [940, 1000], [860, 1080], [-30, 1080],
    ];
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(shelfBody[0][0], shelfBody[0][1]);
    for (let i = 1; i < shelfBody.length; i++) ctx.lineTo(shelfBody[i][0], shelfBody[i][1]);
    ctx.closePath();
    const sgd = ctx.createLinearGradient(0, 790, 0, 1080);
    sgd.addColorStop(0, 'rgba(30,27,19,0.72)');
    sgd.addColorStop(0.32, 'rgba(20,18,12,0.9)');
    sgd.addColorStop(1, 'rgba(12,10,6,0.97)');
    ctx.fillStyle = sgd;
    ctx.fill();
    ctx.clip();
    const shn = mulberry32(7675);
    for (let i = 0; i < 220; i++) {
      const x = -20 + shn() * 1060;
      const y = 786 + shn() * 294;
      const len = 5 + shn() * 30;
      ctx.strokeStyle = shn() < 0.55
        ? `rgba(5,4,2,${(0.18 + shn() * 0.34).toFixed(3)})`
        : `rgba(243,236,217,${(0.02 + shn() * 0.09).toFixed(3)})`;
      ctx.lineWidth = 0.7 + shn() * 2.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (shn() - 0.5) * 16, y + len);
      ctx.stroke();
    }
    ctx.restore();
    // lit walkway
    ctx.beginPath();
    ctx.moveTo(shelfTop[0][0], shelfTop[0][1]);
    for (let i = 1; i < shelfTop.length; i++) ctx.lineTo(shelfTop[i][0], shelfTop[i][1]);
    ctx.strokeStyle = 'rgba(11,9,6,0.94)';
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(shelfTop[0][0], shelfTop[0][1] + 3);
    for (let i = 1; i < shelfTop.length; i++) ctx.lineTo(shelfTop[i][0], shelfTop[i][1] + 3);
    ctx.strokeStyle = 'rgba(245,238,220,0.4)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // grasses on the lip
    const gp = mulberry32(7673);
    for (let i = 0; i < 34; i++) {
      const t = gp();
      const idx = Math.min(shelfTop.length - 2, Math.floor(t * (shelfTop.length - 1)));
      const gx = lerp(shelfTop[idx][0], shelfTop[idx + 1][0], gp());
      const gy = lerp(shelfTop[idx][1], shelfTop[idx + 1][1], gp()) + 2;
      const hh = 6 + gp() * 16;
      ctx.strokeStyle = `rgba(24,30,20,${(0.3 + gp() * 0.35).toFixed(3)})`;
      ctx.lineWidth = 0.8 + gp() * 0.9;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + (gp() - 0.5) * 6, gy - hh * 0.6, gx + (gp() - 0.5) * 12, gy - hh);
      ctx.stroke();
    }
    drawPavilion(ctx, 806, 726, 0.92);
    // eight pixels of Du Fu, standing on the lip
    ctx.fillStyle = 'rgba(18,16,10,0.96)';
    ctx.fillRect(898, 798, 3, 9);
    ctx.beginPath();
    ctx.arc(899.5, 795.5, 2.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(18,16,10,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(901, 799);
    ctx.lineTo(904, 809);
    ctx.stroke();

    // foreground rocks at the very bottom
    ctx.beginPath();
    ctx.moveTo(-20, 1016);
    for (let x = -20; x <= W + 20; x += 26) {
      ctx.lineTo(x, 1000 - KIT.noise2(x * 0.006, 2.2, 7671) * 52);
    }
    ctx.lineTo(W + 20, H + 20);
    ctx.lineTo(-20, H + 20);
    ctx.closePath();
    ctx.fillStyle = 'rgba(14,12,8,0.68)';
    ctx.fill();
    // ink splashes
    const r = mulberry32(7672);
    for (let i = 0; i < 22; i++) {
      const x = 120 + r() * 1500, y = 220 + r() * 760;
      if (y < massTop(x) + 20) continue;
      ctx.fillStyle = `rgba(25,23,17,${(0.04 + r() * 0.12).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 1 + r() * 5, 1 + r() * 3, r() * TAU, 0, TAU);
      ctx.fill();
    }
  });
}

/* ------------------------------------------------------------ close-up art */
function rockFace(ctx, pts, opts = {}) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  const g = ctx.createLinearGradient(opts.gx0 ?? 0, opts.gy0 ?? 0, opts.gx1 ?? 600, opts.gy1 ?? 1080);
  g.addColorStop(0, opts.c0 || 'rgba(46,42,32,0.55)');
  g.addColorStop(0.55, opts.c1 || 'rgba(28,25,18,0.72)');
  g.addColorStop(1, opts.c2 || 'rgba(20,18,12,0.86)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // facets
  const r = mulberry32(hash('rockface', opts.seed || 1));
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const p of pts) {
    x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]);
    y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]);
  }
  const n = opts.facets ?? 26;
  for (let i = 0; i < n; i++) {
    const cx = lerp(x0, x1, r());
    const cy = lerp(y0, y1, r());
    const wd = 30 + r() * 150;
    const ht = 40 + r() * 220;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + wd, cy + ht * 0.25);
    ctx.lineTo(cx + wd * 0.7, cy + ht);
    ctx.lineTo(cx - wd * 0.2, cy + ht * 0.66);
    ctx.closePath();
    ctx.fillStyle = r() < 0.5 ? `rgba(232,224,204,${(0.02 + r() * 0.05).toFixed(3)})` : `rgba(12,11,7,${(0.05 + r() * 0.13).toFixed(3)})`;
    ctx.fill();
  }
  // cunfa clipped to the rock
  const tones = buildCunfa(
    { x0: x0 - 10, y0: y0 - 10, x1: x1 + 10, y1: y1 + 10 },
    opts.cell ?? 15, opts.seed + 21,
    { wMul: opts.wMul ?? 0.9, lenMul: 1.5, skip: 0.18, inside: (x, y) => KIT.pointInPoly([x, y], pts) },
  );
  drawCunfa(ctx, tones);
  // dark cracks
  for (let i = 0; i < (opts.cracks ?? 9); i++) {
    let x = lerp(x0, x1, r()), y = lerp(y0, y1, r());
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += (r() - 0.5) * 26;
      y += 12 + r() * 34;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(12,10,6,${(0.2 + r() * 0.3).toFixed(3)})`;
    ctx.lineWidth = 0.8 + r() * 2;
    ctx.stroke();
  }
  ctx.restore();
  // carved outline
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(18,16,10,0.8)';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  void opts;
}

const CLIFF = [
  [-40, -40], [560, -40], [548, 60], [512, 150], [534, 232], [492, 318],
  [512, 400], [470, 486], [486, 560], [430, 636], [388, 700], [300, 742],
  [160, 764], [-40, 776],
];
const SHELF = [
  [300, 742], [430, 712], [560, 716], [690, 730], [790, 752], [880, 776],
  [962, 800], [1010, 846], [988, 1080], [120, 1080], [80, 860], [160, 780],
];

function closeupLayer() {
  return KIT.layer('scene11:close', W, H, (ctx) => {
    ctx.drawImage(paperLayer(), 0, 0);

    // the gorge: pale mist, two distant ranges, a thread of river far below
    const vg = ctx.createRadialGradient(1480, 620, 120, 1480, 620, 980);
    vg.addColorStop(0, 'rgba(243,236,217,0.34)');
    vg.addColorStop(0.5, 'rgba(241,233,213,0.22)');
    vg.addColorStop(1, 'rgba(241,233,213,0)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    // distant peaks
    const far = [
      { y: 596, a: 0.15, seed: 81, amp: 78, x0: -60, x1: 1920 },
      { y: 686, a: 0.22, seed: 82, amp: 66, x0: -60, x1: 1920 },
      { y: 782, a: 0.14, seed: 83, amp: 52, x0: -60, x1: 1920 },
    ];
    for (const f of far) {
      ctx.beginPath();
      ctx.moveTo(f.x0 - 40, 1080);
      for (let x = f.x0 - 40; x <= f.x1 + 40; x += 12) {
        ctx.lineTo(x, f.y - KIT.fbm1(x * 0.0045, 4, f.seed) * f.amp - Math.sin(x * 0.006 + f.seed) * 26);
      }
      ctx.lineTo(f.x1 + 40, 1080);
      ctx.closePath();
      ctx.fillStyle = `rgba(48,58,44,${f.a})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(30,36,26,${f.a + 0.14})`;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    // far river
    ctx.beginPath();
    ctx.moveTo(880, 1010);
    ctx.bezierCurveTo(1160, 996, 1440, 1046, 1920, 1024);
    ctx.lineTo(1920, 1064);
    ctx.bezierCurveTo(1440, 1086, 1160, 1038, 880, 1048);
    ctx.closePath();
    ctx.fillStyle = 'rgba(245,238,220,0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,36,26,0.42)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    const rv = mulberry32(7681);
    ctx.strokeStyle = 'rgba(52,48,36,0.35)';
    for (let i = 0; i < 26; i++) {
      const x = 940 + rv() * 940;
      const y = 1024 + rv() * 30;
      ctx.lineWidth = 0.8 + rv() * 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 8 + rv() * 22, y - 1);
      ctx.stroke();
    }
    mistBand(ctx, 900, 90, 0.5);
    mistBand(ctx, 980, 60, 0.35);

    // the cliff we are standing on
    rockFace(ctx, CLIFF, {
      seed: 71, c0: 'rgba(58,56,42,0.62)', c1: 'rgba(30,28,20,0.8)', c2: 'rgba(22,20,13,0.9)',
      facets: 22, cracks: 10, cell: 17, wMul: 1.1, gx0: 0, gy0: 0, gx1: 620, gy1: 800,
    });
    rockFace(ctx, SHELF, {
      seed: 72, c0: 'rgba(44,42,31,0.7)', c1: 'rgba(26,24,16,0.82)', c2: 'rgba(18,16,10,0.94)',
      facets: 30, cracks: 12, cell: 14, wMul: 0.95, gx0: 300, gy0: 720, gx1: 1000, gy1: 1080,
    });
    // the lit top surface of the shelf
    ctx.beginPath();
    ctx.moveTo(300, 742);
    ctx.quadraticCurveTo(560, 700, 800, 752);
    ctx.quadraticCurveTo(900, 782, 962, 800);
    ctx.quadraticCurveTo(700, 830, 430, 812);
    ctx.quadraticCurveTo(340, 800, 300, 742);
    ctx.closePath();
    ctx.fillStyle = 'rgba(238,230,209,0.35)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,17,11,0.75)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // ink lip
    ctx.beginPath();
    ctx.moveTo(300, 742);
    ctx.quadraticCurveTo(560, 700, 800, 752);
    ctx.quadraticCurveTo(902, 784, 962, 800);
    ctx.strokeStyle = 'rgba(16,14,9,0.9)';
    ctx.lineWidth = 3.4;
    ctx.stroke();
    // grass tufts along the lip
    const gt = mulberry32(7682);
    for (let i = 0; i < 42; i++) {
      const x = 300 + gt() * 660;
      const t = (x - 300) / 660;
      const y = lerp(742, 800, t);
      const hh = 8 + gt() * 26;
      ctx.strokeStyle = `rgba(28,34,22,${(0.35 + gt() * 0.4).toFixed(3)})`;
      ctx.lineWidth = 0.9 + gt() * 1.1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + (gt() - 0.5) * 8, y - hh * 0.6, x + (gt() - 0.5) * 16, y - hh);
      ctx.stroke();
    }
    // pine leaning out of the cliff
    ctx.strokeStyle = 'rgba(24,22,15,0.92)';
    ctx.lineCap = 'round';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(360, 300);
    ctx.quadraticCurveTo(520, 236, 700, 252);
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(470, 266);
    ctx.quadraticCurveTo(520, 200, 610, 186);
    ctx.stroke();
    const pn = mulberry32(7683);
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const bx = lerp(400, 690, t) + (pn() - 0.5) * 22;
      const by = lerp(288, 254, t) + (pn() - 0.5) * 20;
      // a short twig
      ctx.strokeStyle = 'rgba(22,20,14,0.85)';
      ctx.lineWidth = 1.4 + pn() * 1.4;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + 14, by - 10 - pn() * 10, bx + 26 + pn() * 16, by - 16 - pn() * 22);
      ctx.stroke();
      // needle fan
      for (let k = 0; k < 12; k++) {
        const ang = -2.5 + (k / 11) * 2.0 + (pn() - 0.5) * 0.2;
        const len = 12 + pn() * 22;
        ctx.strokeStyle = `rgba(24,26,17,${(0.3 + pn() * 0.32).toFixed(3)})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(bx + 14, by - 6);
        ctx.lineTo(bx + 14 + Math.cos(ang) * len, by - 6 + Math.sin(ang) * len * 0.7);
        ctx.stroke();
      }
    }
    // moss and small growth on the cliff
    const ms = mulberry32(7684);
    for (let i = 0; i < 90; i++) {
      const x = 40 + ms() * 520;
      const y = 200 + ms() * 620;
      ctx.fillStyle = `rgba(62,70,54,${(0.06 + ms() * 0.16).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 3 + ms() * 16, 2 + ms() * 7, ms() * TAU, 0, TAU);
      ctx.fill();
    }
    // (the couplet supplies its own soft wash at draw time)

  });
}

/* ------------------------------------------------------------- falling leaves */
const LEAVES = [];
function leafData() {
  if (LEAVES.length) return LEAVES;
  const r = mulberry32(7667);
  for (let i = 0; i < 132; i++) {
    LEAVES.push({
      x: r() * (W + 240) - 120,
      y: r() * (H + 120) - 60,
      sp: 30 + r() * 86,
      fall: 14 + r() * 40,
      size: 3.2 + r() * 9,
      rot: r() * TAU,
      spin: (r() - 0.5) * 1.4,
      ph: r() * TAU,
      a: 0.16 + r() * 0.5,
      tone: r(),
    });
  }
  return LEAVES;
}
function drawLeaves(ctx, u, scale = 1, alpha = 1, count = 120) {
  const arr = leafData();
  for (let i = 0; i < count; i++) {
    const l = arr[i];
    const span = W + 260;
    const x = ((l.x + u * l.sp + Math.sin(u * 0.7 + l.ph) * 26 + span) % span) - 130;
    const y = ((l.y + u * l.fall + Math.cos(u * 0.5 + l.ph) * 14 + H + 120) % (H + 160)) - 80;
    const rot = l.rot + u * l.spin + Math.sin(u * 0.9 + l.ph) * 0.5;
    const s = l.size * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha * l.a;
    ctx.fillStyle = l.tone > 0.78 ? 'rgba(112,72,36,0.92)' : 'rgba(28,26,18,0.92)';
    // a tapered brush leaf
    ctx.beginPath();
    ctx.moveTo(-s, 0);
    ctx.quadraticCurveTo(-s * 0.15, -s * 0.3, s, 0);
    ctx.quadraticCurveTo(-s * 0.15, s * 0.3, -s, 0);
    ctx.closePath();
    ctx.fill();
    if (s > 5) {
      ctx.strokeStyle = 'rgba(20,18,12,0.5)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-s * 0.9, 0);
      ctx.lineTo(s * 0.8, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/* --------------------------------------------------------------- close-up poet */
function drawCloseupPoet(ctx, u) {
  const wind = 0.55 + 0.28 * Math.sin(u * 0.9) + 0.1 * Math.sin(u * 2.3);
  const pose = KIT.rig.pose({ t: u, phase: (u / 1.0) * TAU, wind: clamp01(wind + 0.2), lean: 0.06, look: 0.55, staff: true, elder: true });
  const s = 0.47;
  const pos = KIT.rig.placed(pose, { x: 762, y: 800, scale: s, rot: -0.02 });
  const keep = ['body', 'sleeve-near', 'sleeve-far', 'skin', 'cap', 'hair', 'beard', 'leg-near', 'leg-far', 'staff', 'robe-tail', 'sleeve-tail', 'sash'];
  const parts = pos.parts.filter((p) => keep.includes(p.role));
  const shape = { ...pos, parts };
  ctx.save();
  // ink silhouette
  KIT.rig.drawSilhouette(ctx, shape, { color: 'rgba(24,21,15,0.94)' });
  // paper edge on the windward side (rim light from the gorge)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(-1.4, -1.2);
  KIT.rig.drawWire(ctx, shape, { color: 'rgba(238,230,210,0.28)', width: 0.9, alpha: 0.9 });
  ctx.restore();
  // white hair and beard, cut out of the ink
  ctx.save();
  ctx.fillStyle = 'rgba(238,232,216,0.96)';
  ctx.strokeStyle = 'rgba(238,232,216,0.96)';
  for (const p of parts) {
    if (p.role !== 'beard' && p.role !== 'hair') continue;
    if (p.kind === 'poly') {
      ctx.beginPath();
      ctx.moveTo(p.pts[0][0], p.pts[0][1]);
      for (let i = 1; i < p.pts.length; i++) ctx.lineTo(p.pts[i][0], p.pts[i][1]);
      ctx.closePath();
      ctx.fill();
    } else if (p.kind === 'line') {
      ctx.beginPath();
      for (let i = 0; i < p.pts.length; i++) {
        if (i === 0) ctx.moveTo(p.pts[i][0], p.pts[i][1]);
        else ctx.lineTo(p.pts[i][0], p.pts[i][1]);
      }
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }
  ctx.restore();
  // ink re-drawn on the face so it is not a white blob
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = 'rgba(232,223,201,0.5)';
  for (const p of parts) {
    if (p.role !== 'skin') continue;
    if (p.kind === 'circle') {
      ctx.beginPath();
      ctx.ellipse(p.c[0] + 2, p.c[1] - 3, p.r * 0.5, p.r * 0.34, 0.1, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
  // robe folds in paper white
  ctx.save();
  ctx.strokeStyle = 'rgba(232,223,201,0.4)';
  ctx.lineWidth = 1;
  for (const p of pos.parts) {
    if (p.role !== 'detail') continue;
    ctx.beginPath();
    for (let i = 0; i < p.pts.length; i++) {
      if (i === 0) ctx.moveTo(p.pts[i][0], p.pts[i][1]);
      else ctx.lineTo(p.pts[i][0], p.pts[i][1]);
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

/* ------------------------------------------------------------------- type */
function paperStrip(ctx, x, y, w, h, alpha) {
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const r = mulberry32(7686);
  ctx.beginPath();
  ctx.moveTo(x, y + 6);
  for (let i = 0; i <= 10; i++) ctx.lineTo(x + (i / 10) * w, y + (r() - 0.5) * 6);
  for (let i = 0; i <= 14; i++) ctx.lineTo(x + w + (r() - 0.5) * 5, y + (i / 14) * h);
  for (let i = 10; i >= 0; i--) ctx.lineTo(x + (i / 10) * w, y + h + (r() - 0.5) * 6);
  for (let i = 14; i >= 0; i--) ctx.lineTo(x + (r() - 0.5) * 5, y + (i / 14) * h);
  ctx.closePath();
  ctx.fillStyle = 'rgba(241,233,213,0.72)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,110,88,0.16)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawCouplet(ctx, u) {
  const a = smoothstep(2.86, 3.2, u);
  if (a <= 0.003) return;
  const size = 62, gap = 70;
  const cols = [{ t: '无边落木萧萧下', x: 1568 }, { t: '不尽长江滚滚来', x: 1462 }];
  const y0 = 262;
  const wg = ctx.createRadialGradient(1500, 470, 40, 1500, 470, 400);
  wg.addColorStop(0, `rgba(243,236,217,${(0.6 * a).toFixed(3)})`);
  wg.addColorStop(0.6, `rgba(243,236,217,${(0.28 * a).toFixed(3)})`);
  wg.addColorStop(1, 'rgba(243,236,217,0)');
  ctx.fillStyle = wg;
  ctx.fillRect(1180, 140, 720, 680);
  ctx.save();
  const rr = mulberry32(hash('s11poem', 766));
  ctx.font = `500 ${size}px ${KIT.FONT.display}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let c = 0; c < cols.length; c++) {
    const chars = [...cols[c].t];
    for (let i = 0; i < chars.length; i++) {
      const st = 2.88 + i * 0.072 + c * 0.09;
      const ca = smoothstep(st, st + 0.34, u) * a;
      if (ca <= 0.004) continue;
      const lift = (1 - ca) * 10;
      ctx.save();
      ctx.translate(cols[c].x + (rr() - 0.5) * 4, y0 + i * gap + (rr() - 0.5) * 4 - lift);
      ctx.rotate((rr() - 0.5) * 0.02);
      ctx.globalAlpha = ca;
      ctx.fillStyle = 'rgba(25,23,17,0.94)';
      ctx.fillText(chars[i], 0, 0);
      ctx.globalAlpha = ca * 0.2;
      ctx.fillStyle = 'rgba(90,82,66,0.9)';
      ctx.fillText(chars[i], 1.6, 1.8);
      ctx.restore();
    }
  }
  // seal + colophon
  const sa = smoothstep(3.5, 3.8, u);
  if (sa > 0.01) {
    ctx.globalAlpha = sa * 0.95;
    KIT.ink.sealStamp(ctx, 1604, 736, 46, '少陵', {
      seed: 766, color: SEAL, vertical: true, border: true, inset: 5, rotate: 0.01, alpha: 0.95,
    });
    ctx.globalAlpha = sa * 0.8;
    ctx.font = `500 22px ${KIT.FONT.display}`;
    ctx.fillStyle = 'rgba(30,26,19,0.85)';
    const ins = '夔州 · 大历元年';
    for (let i = 0; i < ins.length; i++) ctx.fillText(ins[i], 1732, 282 + i * 26);
  }
  ctx.restore();
  markText('s11-poem', '无边落木萧萧下，不尽长江滚滚来', 1424, 246, 190, 500, { size, align: 'center', color: INK });
}

function drawWideInscription(ctx, u) {
  const a = (1 - smoothstep(2.5, 2.9, u)) * smoothstep(0.3, 0.9, u);
  if (a <= 0.004) return;
  ctx.save();
  // a collector's label pinned over the mountain, mid-left
  paperStrip(ctx, 84, 586, 216, 106, a * 0.82);
  ctx.globalAlpha = a * 0.92;
  KIT.drawText(ctx, '溪山行旅 · 摹本', 104, 614, {
    size: 23, font: KIT.FONT.display, weight: 500, color: 'rgba(30,26,19,0.88)', letterSpacing: 2.6,
  });
  ctx.globalAlpha = a * 0.82;
  KIT.drawText(ctx, '大历元年 · 夔州', 104, 646, {
    size: 18, font: KIT.FONT.display, weight: 500, color: 'rgba(52,45,34,0.9)', letterSpacing: 2.2,
  });
  ctx.globalAlpha = a * 0.66;
  KIT.drawText(ctx, 'MONUMENTAL LANDSCAPE · 15× PUSH', 104, 674, {
    size: 9.5, font: KIT.FONT.mono, weight: 500, color: 'rgba(70,61,46,0.85)', letterSpacing: 1.3,
  });
  ctx.globalAlpha = a * 0.9;
  const ins = '夔州 · 大历元年';
  ctx.font = `500 26px ${KIT.FONT.display}`;
  ctx.fillStyle = 'rgba(30,26,19,0.88)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < ins.length; i++) ctx.fillText(ins[i], 1724, 232 + i * 31);
  ctx.globalAlpha = a * 0.9;
  KIT.ink.sealStamp(ctx, 1704, 500, 40, '夔州', {
    seed: 767, color: SEAL, vertical: true, border: true, inset: 4, alpha: 0.9,
  });
  ctx.restore();
}

function drawPushMarks(ctx, u) {
  const p = clamp01((u - 2.0) / 0.5);
  if (p <= 0 || p >= 1) return;
  const a = Math.sin(p * Math.PI);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  for (let i = 0; i < 26; i++) {
    const ang = (i / 26) * TAU + 0.2;
    const r0 = 120 + i * 9;
    const len = 220 + (i % 5) * 120;
    const x0 = FOCUS.x + Math.cos(ang) * r0;
    const y0 = FOCUS.y + Math.sin(ang) * r0;
    ctx.strokeStyle = `rgba(40,35,26,${(0.02 + (i % 3) * 0.02) * a})`;
    ctx.lineWidth = 1 + (i % 4) * 1.4;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len);
    ctx.stroke();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------- main */
function drawLiveDetail(ctx, z, u, landX, landY) {
  const a = smoothstep(2.0, 2.4, z) * (1 - smoothstep(2.45, 2.85, u));
  if (a <= 0.004) return;
  // visible world rect
  const x0 = FOCUS.x - landX / z;
  const x1 = FOCUS.x + (W - landX) / z;
  const y0 = FOCUS.y - landY / z;
  const y1 = FOCUS.y + (H - landY) / z;
  const view = { x0: x0 - 20, x1: x1 + 20, y0: y0 - 20, y1: y1 + 20 };
  ctx.save();
  ctx.globalAlpha = a;
  drawCunfa(ctx, LIVE_NEAR, view);
  drawCunfa(ctx, LIVE_FAR, view);
  // crisp ridge edge over the bitmap
  ctx.beginPath();
  for (let x = Math.max(-30, view.x0); x <= view.x1; x += Math.max(2, 6 / z)) {
    const y = massTop(x);
    if (x <= Math.max(-30, view.x0) + 0.001) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = 'rgba(16,14,9,0.55)';
  ctx.lineWidth = 2.2 / z;
  ctx.stroke();
  ctx.restore();
}

let LIVE_NEAR = null;
let LIVE_FAR = null;

/** Live, animated weather layered over the baked wide plate. */
function drawLiveWeather(ctx, u) {
  // two soft cloud belts sliding across the massif
  for (const band of [{ y: 372, h: 48, sp: 22, a: 0.13, seed: 3 }, { y: 604, h: 62, sp: -16, a: 0.12, seed: 9 }]) {
    ctx.save();
    for (let i = 0; i < 9; i++) {
      const r1 = KIT.unit(band.seed, i, 11);
      const r2 = KIT.unit(band.seed, i, 12);
      const px = ((r1 + (u * band.sp) / 2600) % 1) * (W + 500) - 250;
      const py = band.y + (r2 - 0.5) * band.h * 1.4;
      const rx = 170 + r2 * 220;
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(1, (band.h * 0.8) / rx);
      const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      gg.addColorStop(0, `rgba(250,246,233,${(band.a * 1.5).toFixed(3)})`);
      gg.addColorStop(0.55, `rgba(246,241,226,${band.a.toFixed(3)})`);
      gg.addColorStop(1, 'rgba(246,241,226,0)');
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  // animated spray drifting off the cataract
  const pts = riverSpine();
  const sp = mulberry32(7679);
  ctx.save();
  for (let i = 0; i < 260; i++) {
    const t = sp();
    const idx = Math.min(pts.length - 1, Math.round(t * (pts.length - 1)));
    const p = pts[idx];
    const w = 5 + Math.pow(t, 0.7) * 27;
    const life = (sp() + u * (0.16 + sp() * 0.3)) % 1;
    const x = p[0] + (sp() - 0.5) * 2.3 * w + Math.sin(u * 1.4 + i) * 5 * life;
    const y = p[1] - life * 130 + 15;
    const a = (1 - life) * (0.12 + sp() * 0.4);
    ctx.fillStyle = `rgba(252,248,238,${a.toFixed(3)})`;
    ctx.fillRect(x, y, 0.9 + sp() * 1.8, 0.9 + sp() * 1.8);
  }
  ctx.restore();
}

export function renderAt(ctx, u, beat, env = {}) {
  if (!LIVE_NEAR) {
    LIVE_NEAR = buildCunfa({ x0: 560, y0: 470, x1: 1220, y1: 960 }, 8, 6101, { wMul: 0.5, lenMul: 1.6 });
    LIVE_FAR = buildCunfa({ x0: 700, y0: 600, x1: 1080, y1: 900 }, 3.4, 6102, { wMul: 0.3, lenMul: 1.6 });
  }
  const push = clamp01((u - 2.0) / 0.3);
  const z = 1 + 14 * easeOut(push);
  const wideA = 1 - smoothstep(2.1, 2.42, u);
  const closeA = smoothstep(2.08, 2.44, u);
  const veil = smoothstep(2.0, 2.16, u) * (1 - smoothstep(2.22, 2.54, u));

  // ---- the wide painting / the push ----
  if (wideA > 0.002) {
    const k = smoothstep(1.15, 4.6, z);
    const landX = lerp(FOCUS.x, LAND.x, k);
    const landY = lerp(FOCUS.y, LAND.y, k);
    ctx.save();
    ctx.globalAlpha = wideA;
    const shake = u >= 2 ? Math.exp(-(u - 2) * 7) * 8 : 0;
    ctx.translate(Math.sin(u * 91) * shake, Math.cos(u * 73) * shake * 0.6);
    ctx.translate(landX, landY);
    ctx.scale(z, z);
    ctx.translate(-FOCUS.x, -FOCUS.y);
    ctx.drawImage(wideLayer(), 0, 0);
    // live weather over the painted plate: two drifting cloud belts and the
    // spray of the cataract
    drawLiveWeather(ctx, u);
    drawLiveDetail(ctx, z, u, landX, landY);
    ctx.restore();
    drawPushMarks(ctx, u);
    if (u < 2.3) drawLeaves(ctx, u, 1, 1 - smoothstep(2.1, 2.3, u));
  }

  // ---- the close-up ----
  if (closeA > 0.002) {
    ctx.save();
    ctx.globalAlpha = closeA;
    const drift = 1 + 0.028 * smoothstep(3.0, 6.0, u);
    const dx = 14 * smoothstep(3.0, 6.0, u);
    ctx.translate(960, 600);
    ctx.scale(drift, drift);
    ctx.translate(-960 - dx, -600);
    ctx.drawImage(closeupLayer(), 0, 0);
    drawLeaves(ctx, u, 1.9, 0.85, 74);
    // drifting mist
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 4; i++) {
      const y = 700 + i * 96;
      const ox = Math.sin(u * 0.16 + i * 1.7) * 90;
      const g = ctx.createLinearGradient(0, y - 46, 0, y + 46);
      g.addColorStop(0, 'rgba(241,233,213,0)');
      g.addColorStop(0.5, `rgba(241,233,213,${(0.16 - i * 0.028).toFixed(3)})`);
      g.addColorStop(1, 'rgba(241,233,213,0)');
      ctx.fillStyle = g;
      ctx.fillRect(560 + ox, y - 46, 1400, 92);
    }
    ctx.restore();
    drawCloseupPoet(ctx, u);
    drawCouplet(ctx, u);
    // the gate at the right edge
    const gp = smoothstep(5.15, 5.5, u);
    if (gp > 0.002) {
      ctx.save();
      ctx.globalAlpha = gp;
      const gg = ctx.createLinearGradient(1780, 0, 1920, 0);
      gg.addColorStop(0, 'rgba(241,233,213,0)');
      gg.addColorStop(1, 'rgba(241,233,213,0.9)');
      ctx.fillStyle = gg;
      ctx.fillRect(1780, 250, 140, 700);
      KIT.frames.drawPortal(ctx, 1834, 300, 82, 620, {
        style: 'ink', accent: SEAL, alpha: 1, seed: 766, t: u,
      });
      ctx.restore();
    }
    ctx.restore();
  }

  // ---- ink flood at the cut ----
  if (veil > 0.002) {
    ctx.save();
    ctx.globalAlpha = veil;
    const g = ctx.createRadialGradient(930, 560, 60, 930, 560, 1200);
    g.addColorStop(0, 'rgba(16,14,9,0.2)');
    g.addColorStop(0.55, 'rgba(16,14,9,0.72)');
    g.addColorStop(1, 'rgba(10,9,6,0.95)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  drawWideInscription(ctx, u);
  KIT.debug.markBox('s11-fall', 1120, 600, 260, 480, { role: 'waterfall', ribbons: 64, mist: 1200 });

  // ---- paper grain + vignette ----
  const grain = KIT.layer('scene11:grain', 480, 270, (c) => KIT.grainLayer(480, 270, 766, { amp: 0.1 }));
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.13;
  ctx.drawImage(grain, 0, 0, W, H);
  ctx.restore();
  const v = ctx.createRadialGradient(940, 500, 420, 960, 520, 1220);
  v.addColorStop(0, 'rgba(60,50,32,0)');
  v.addColorStop(1, 'rgba(60,50,32,0.24)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  void beat; void env; void easeIn;
}

export default { renderAt };
