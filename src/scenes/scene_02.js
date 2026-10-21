/**
 * 02 · 吴道子白描 · 吴带当风 / Bezier Ribbon Dynamics · 731 · 吴越
 *
 * Sized silk. Fifty-two variable-width ink ribbons ride one turbulent field;
 * the same field drives the horse's mane and the rider's sleeves. On the bar-2
 * downbeat the wind compresses and the ribbons bend onto a shared typographic
 * spine, drawing 【读书破万卷】. In bar 3 the strokes unravel into ink rain.
 */
import KIT from '../kit/index.js';
import {
  clamp01, lerp, smoothstep, easeOut, easeInOut, hash, unit, mulberry32, TAU,
} from '../kit/math.js';
import { markText } from '../kit/debug.js';

const W = 1920, H = 1080;
const INK = '#231c14';
const INK_SOFT = 'rgba(35,28,20,0.55)';
const SEAL = '#a52a22';

const TEXT = '读书破万卷';
const T_SIZE = 164;
const T_X = 508;                        // left edge of the type block
const T_CY = 414;                       // optical centre of the written block
const T_BASE = T_CY + T_SIZE * 0.38;    // baseline
const T_MASK_Y = T_BASE - T_SIZE * 1.04; // top-left of the glyph sampling sprite

/* ================================================================ helpers */
function poly(ctx, pts, close = true) {
  if (!pts || pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}

function resample(pts, step) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(d / step));
    for (let k = 1; k <= n; k++) out.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]);
  }
  return out;
}

/** Variable-width ink ribbon with a dry edge. */
function inkRibbon(ctx, spine, wAt, opts = {}) {
  if (!spine || spine.length < 2) return;
  const color = opts.color || INK;
  const alpha = opts.alpha ?? 0.95;
  const seed = opts.seed ?? 1;
  const left = [], right = [];
  for (let i = 0; i < spine.length; i++) {
    const p = spine[i];
    const a = spine[Math.max(0, i - 1)], b = spine[Math.min(spine.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l;
    const w = wAt(i / (spine.length - 1), i) * 0.5;
    left.push([p[0] + nx * w, p[1] + ny * w]);
    right.push([p[0] - nx * w, p[1] - ny * w]);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i][0], left[i][1]);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  // dry-brush separation
  if (opts.dry !== 0) {
    ctx.save();
    ctx.clip();
    const r = mulberry32(hash('s02dry', seed));
    const n = opts.dry ?? 3;
    for (let k = 0; k < n; k++) {
      ctx.strokeStyle = `rgba(246,242,232,${(0.10 + r() * 0.3).toFixed(3)})`;
      ctx.lineWidth = 0.6 + r() * Math.max(1, (opts.width ?? 10) * 0.07);
      const off = (r() - 0.5) * 0.9;
      ctx.beginPath();
      for (let i = 1; i < spine.length; i++) {
        const p = spine[i];
        const a = spine[Math.max(0, i - 1)], b = spine[Math.min(spine.length - 1, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const l = Math.hypot(dx, dy) || 1;
        const w = wAt(i / (spine.length - 1), i) * 0.5 * off;
        const x = p[0] - (dy / l) * w, y = p[1] + (dx / l) * w;
        if (i === 1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

/* ================================================================== silk */
function silkLayer() {
  return KIT.layer('s02:silk', W, H, (c) => {
    const base = KIT.paper.silk(W, H, { seed: 731, tone: '#f5f1e6' });
    c.drawImage(base, 0, 0);
    const r = mulberry32(hash('s02silk', 9));
    // woven weft — a faint regular grid that catches the light
    c.save();
    c.strokeStyle = 'rgba(120,104,76,0.055)';
    c.lineWidth = 0.7;
    for (let y = 0; y < H; y += 4) {
      c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
    }
    c.strokeStyle = 'rgba(255,252,244,0.16)';
    for (let x = 0; x < W; x += 5) {
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
    }
    c.restore();
    // sizing stains: the silk was washed with alum
    c.save();
    for (let i = 0; i < 26; i++) {
      const x = r() * W, y = r() * H;
      const rad = 60 + r() * 260;
      const g = c.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(178,152,108,${(0.02 + r() * 0.05).toFixed(3)})`);
      g.addColorStop(0.7, `rgba(178,152,108,${(0.008 + r() * 0.02).toFixed(3)})`);
      g.addColorStop(1, 'rgba(178,152,108,0)');
      c.fillStyle = g;
      c.beginPath(); c.ellipse(x, y, rad, rad * (0.5 + r() * 0.6), r() * 3, 0, TAU); c.fill();
    }
    c.restore();
    // tideline / cockling near the edges
    c.save();
    const edge = c.createLinearGradient(0, 0, 0, H);
    edge.addColorStop(0, 'rgba(122,104,74,0.16)');
    edge.addColorStop(0.14, 'rgba(122,104,74,0)');
    edge.addColorStop(0.86, 'rgba(122,104,74,0)');
    edge.addColorStop(1, 'rgba(122,104,74,0.20)');
    c.fillStyle = edge; c.fillRect(0, 0, W, H);
    const edge2 = c.createLinearGradient(0, 0, W, 0);
    edge2.addColorStop(0, 'rgba(122,104,74,0.18)');
    edge2.addColorStop(0.1, 'rgba(122,104,74,0)');
    edge2.addColorStop(0.9, 'rgba(122,104,74,0)');
    edge2.addColorStop(1, 'rgba(122,104,74,0.22)');
    c.fillStyle = edge2; c.fillRect(0, 0, W, H);
    c.restore();
    // silk fibres
    c.save();
    for (let i = 0; i < 900; i++) {
      const x = r() * W, y = r() * H;
      c.strokeStyle = r() < 0.5 ? `rgba(255,253,246,${(0.1 + r() * 0.3).toFixed(3)})`
        : `rgba(132,112,80,${(0.03 + r() * 0.08).toFixed(3)})`;
      c.lineWidth = 0.4 + r() * 0.8;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 10 + r() * 90, y + (r() - 0.5) * 2.2);
      c.stroke();
    }
    c.restore();
  });
}

function silkFrame(ctx, u) {
  const p = smoothstep(0.05, 0.8, u);
  ctx.save();
  ctx.globalAlpha = p * 0.55;
  ctx.strokeStyle = 'rgba(84,70,48,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(34.5, 30.5, W - 69, H - 61);
  ctx.globalAlpha = p * 0.3;
  ctx.strokeStyle = 'rgba(140,36,30,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(44.5, 40.5, W - 89, H - 81);
  ctx.restore();
}

/* ============================================================ wind field */
function fieldAngle(x, y, t, k) {
  const n1 = KIT.fbm2(x * 0.0017 + t * 0.12, y * 0.0017 - t * 0.05, 4, 71 + (k % 7));
  const n2 = KIT.noise2(x * 0.0062 - t * 0.22, y * 0.0062 + 3.1, 92 + (k % 5));
  const gust = Math.sin((x * 0.0032 - t * 1.35) + y * 0.0011 + k * 0.7);
  let a = 0.34 * gust + (n1 - 0.5) * 0.95 + (n2 - 0.5) * 0.42;
  // global west→east drift
  a = lerp(a, -0.02, 0.34);
  return a;
}

function traceRibbon(x, y, n, step, t, k, curl) {
  const pts = [[x, y]];
  let px = x, py = y;
  for (let i = 0; i < n; i++) {
    const a = fieldAngle(px, py, t, k) + Math.sin(i * 0.22 + k) * curl;
    px += Math.cos(a) * step;
    py += Math.sin(a) * step * 0.85;
    pts.push([px, py]);
  }
  return pts;
}

/* ============================================================ the ribbons */
let RIBBONS = null;
let MASK = null;
function buildRibbons() {
  if (RIBBONS) return RIBBONS;
  const r = mulberry32(hash('s02ribbons', 731));
  RIBBONS = [];
  for (let i = 0; i < 48; i++) {
    let a0;
    if (i < 26) a0 = { x: -90 - r() * 320, y: -60 + (i / 26) * 1200 + r() * 30 };
    else if (i < 34) a0 = { x: 180 + ((i - 26) / 8) * 1500, y: -130 - r() * 300 };
    else if (i < 41) a0 = { x: 260 + ((i - 34) / 7) * 1400, y: 1210 + r() * 220 };
    else a0 = { x: 2000 + r() * 300, y: 120 + ((i - 41) / 7) * 860 };
    RIBBONS.push({
      i,
      x0: a0.x, y0: a0.y,
      n: 30 + Math.floor(r() * 16),
      step: 34 + r() * 30,
      width: i % 6 === 0 ? 30 + r() * 16 : i % 3 === 0 ? 15 + r() * 12 : 4 + r() * 9,
      curl: 0.06 + r() * 0.2,
      phase: r() * TAU,
      speed: 0.45 + r() * 1.15,
      delay: r() * 0.6,
    });
  }
  const textSample = KIT.sampleTextPoints(TEXT, {
    size: T_SIZE, font: KIT.FONT.brush, weight: 400, density: 1400,
  });
  MASK = textSample;
  // assign a glyph point to each ribbon so they end on the writing
  for (const rb of RIBBONS) {
    const p = textSample.pts[Math.floor(r() * textSample.pts.length)] || [0, 0];
    rb.tx = T_X - T_SIZE * 0.05 + p[0];
    rb.ty = T_MASK_Y + p[1];
  }
  return RIBBONS;
}

function ribbonSpine(rb, u) {
  const t = u * rb.speed;
  return traceRibbon(rb.x0, rb.y0, rb.n, rb.step, t, rb.i, rb.curl);
}

function ribbonTarget(rb, base) {
  // a quadratic from the anchor to the assigned point inside the writing
  const start = base[0];
  const end = [rb.tx, rb.ty];
  const mid = [lerp(start[0], end[0], 0.55), lerp(start[1], end[1], 0.55) + (rb.i % 2 ? 1 : -1) * 120];
  const out = [];
  const n = base.length;
  for (let i = 0; i < n; i++) {
    const p = i / (n - 1);
    const a = (1 - p) * (1 - p), b = 2 * (1 - p) * p, c = p * p;
    out.push([
      a * start[0] + b * mid[0] + c * end[0],
      a * start[1] + b * mid[1] + c * end[1],
    ]);
  }
  return out;
}

function drawRibbons(ctx, u) {
  const ribbons = buildRibbons();
  const compress = smoothstep(2.0, 2.66, u);
  const release = smoothstep(4.05, 5.1, u);
  // bar 3: everything sweeps right and out
  for (const rb of ribbons) {
    const base = ribbonSpine(rb, u);
    const c = clamp01(compress - rb.delay * 0.22);
    let spine = base;
    if (c > 0.001) {
      const target = ribbonTarget(rb, base);
      const k = easeInOut(clamp01(c));
      spine = base.map((p, i) => [lerp(p[0], target[i][0], k), lerp(p[1], target[i][1], k)]);
    }
    if (release > 0.001) {
      const rr = easeInOut(release);
      spine = spine.map((p, i) => {
        const q = i / (spine.length - 1);
        return [p[0] + q * q * 1350 * rr, p[1] - q * 190 * rr + Math.sin(u * 3 + rb.phase + q * 5) * 42 * rr];
      });
    }
    const w = rb.width * (1 - 0.3 * compress) * (1 + release * 0.4);
    const alpha = (0.94 - 0.56 * compress) * (1 - release * 0.9);
    const prof = (p) => {
      const taper = Math.pow(Math.sin(Math.PI * clamp01(p * 0.92 + 0.04)), 0.34);
      const swell = 0.72 + 0.42 * Math.sin(p * 5.4 + rb.phase) + 0.16 * Math.sin(p * 13 + rb.phase * 2);
      return Math.max(0.8, w * taper * swell);
    };
    inkRibbon(ctx, spine, prof, { color: INK, alpha, seed: rb.i + 3, dry: 3, width: w });
    // a dry second pass riding the centre of the wide ribbons
    if (rb.width > 20) {
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < spine.length; i++) {
        const q = i / (spine.length - 1);
        const p = spine[i];
        if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
        void q;
      }
      ctx.strokeStyle = `rgba(247,244,235,${(0.24 * alpha).toFixed(3)})`;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    }
    // the ribbon's tail: two hair-fine tendrils trailing off the tip
    if (rb.width > 14) {
      const tip = spine[spine.length - 1];
      const prev = spine[spine.length - 3] || tip;
      const dx = tip[0] - prev[0], dy = tip[1] - prev[1];
      const l = Math.hypot(dx, dy) || 1;
      for (let k = 0; k < 2; k++) {
        const off = (k - 0.5) * 9;
        const q = [
          [tip[0], tip[1]],
          [tip[0] + dx * 1.6 - (dy / l) * off, tip[1] + dy * 1.6 + (dx / l) * off],
          [tip[0] + dx * 3.4 - (dy / l) * off * 2.2, tip[1] + dy * 3.4 + (dx / l) * off * 2.2],
        ];
        const sm = KIT.smoothPath(q, 6);
        ctx.beginPath();
        ctx.moveTo(sm[0][0], sm[0][1]);
        for (let z = 1; z < sm.length; z++) ctx.lineTo(sm[z][0], sm[z][1]);
        ctx.strokeStyle = `rgba(35,28,20,${(0.55 * alpha).toFixed(3)})`;
        ctx.lineWidth = 1.3 + k * 0.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }
  }
}

/* ================================================================ the horse */
/** A real galloping horse in baimiao line: shoulder, barrel, neck, four legs. */
function baiMiaoHorse(ctx, cx, gy, s, phase, u) {
  ctx.save();
  ctx.translate(cx, gy);
  ctx.scale(s, s);
  const D1 = 'rgba(35,28,20,0.96)';

  const outline = (pts, w, seed) => {
    const rs = resample([...pts, pts[0]], 4.5);
    inkRibbon(ctx, rs, (q) => w * (0.5 + 0.95 * Math.pow(Math.sin(Math.PI * clamp01(q * 0.9 + 0.06)), 0.5)),
      { color: INK, alpha: 0.96, seed, dry: 1, width: w });
  };
  const fillPoly = (pts, col) => { poly(ctx, pts, true); ctx.fillStyle = col; ctx.fill(); };

  // ---- tail: streams on the same field as the ribbons
  const tailPts = [[-94, -140]];
  for (let k = 1; k <= 7; k++) {
    const t = k / 7;
    const a = fieldAngle(-94 + t * 60, -140 + t * 30, u * 1.4, 9);
    tailPts.push([-94 - t * 54 - Math.cos(a) * t * 30, -140 + t * 66 + Math.sin(a) * t * 26]);
  }
  ctx.beginPath();
  ctx.moveTo(tailPts[0][0], tailPts[0][1]);
  for (let k = 1; k < tailPts.length; k++) ctx.lineTo(tailPts[k][0], tailPts[k][1]);
  ctx.strokeStyle = 'rgba(35,28,20,0.42)';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.stroke();
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    for (let m = 0; m < tailPts.length; m++) {
      const q = tailPts[m];
      const x = q[0] - k * 3 + m * 0.6, y = q[1] + k * 5;
      if (m === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(35,28,20,0.34)';
    ctx.lineWidth = 2.6 - k * 0.4;
    ctx.stroke();
  }

  // ---- far legs
  const legFar = (x, ph, front) => {
    const kn = [x + Math.sin(ph) * 26, -54 + (front ? 0 : 6)];
    const fe = [x + Math.sin(ph) * 52, -14 - Math.max(0, Math.cos(ph)) * 14];
    return [[x, -94], kn, fe, [fe[0] + 12, fe[1] + 2]];
  };
  for (const lg of [legFar(-74, phase + Math.PI * 0.8, false), legFar(34, phase + Math.PI * 1.7, true)]) {
    ctx.beginPath();
    ctx.moveTo(lg[0][0], lg[0][1]);
    for (let k = 1; k < lg.length; k++) ctx.lineTo(lg[k][0], lg[k][1]);
    ctx.strokeStyle = 'rgba(35,28,20,0.38)';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // ---- body
  const body = [
    [-92, -122], [-86, -148], [-46, -158], [-2, -156], [36, -152],
    [62, -138], [64, -116], [46, -92], [6, -84], [-42, -88], [-80, -104],
  ];
  fillPoly(body, 'rgba(226,217,197,0.96)');
  outline(body, 4.6, 71);
  ctx.save();
  poly(ctx, body, true);
  ctx.clip();
  for (let k = 0; k < 7; k++) {
    const bx = -84 + k * 24;
    ctx.strokeStyle = 'rgba(35,28,20,0.16)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(bx, -154);
    ctx.quadraticCurveTo(bx + 9, -120, bx - 3, -88);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(-52, -124, 30, -1.2, 1.4);
  ctx.strokeStyle = 'rgba(35,28,20,0.28)';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.restore();

  // ---- near legs
  const legNear = (x, ph, front) => {
    const kn = [x + Math.sin(ph) * 30, -52 + (front ? 0 : 8)];
    const fe = [x + Math.sin(ph) * 60, -12 - Math.max(0, Math.cos(ph)) * 16];
    return [[x, -92], kn, fe, [fe[0] + 14, fe[1] + 2]];
  };
  const nearLegs = [legNear(-56, phase + Math.PI * 0.3, false), legNear(52, phase, true)];
  for (let k = 0; k < nearLegs.length; k++) {
    const lg = nearLegs[k];
    const rs = resample(lg, 4);
    inkRibbon(ctx, rs, (q) => 9.5 * (0.45 + 0.95 * Math.pow(Math.sin(Math.PI * clamp01(q * 0.86 + 0.1)), 0.5)),
      { color: INK, alpha: 0.95, seed: 80 + k, dry: 1, width: 9 });
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(lg[3][0] - 5, lg[3][1], 9, 5, 0, 0, TAU);
    ctx.fill();
  }

  // ---- neck + head
  const neck = [[34, -148], [52, -178], [70, -198], [92, -200], [96, -184], [76, -166], [60, -140], [46, -126]];
  fillPoly(neck, 'rgba(226,217,197,0.96)');
  outline(neck, 4.4, 72);
  const head = [[86, -204], [114, -208], [130, -196], [126, -182], [104, -178], [86, -188]];
  fillPoly(head, 'rgba(232,224,205,0.97)');
  outline(head, 4.2, 73);
  outline([[86, -206], [80, -226], [94, -210]], 3.6, 74);
  outline([[98, -210], [102, -228], [110, -212]], 3.6, 75);
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(106, -196, 2.6, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(126, -190, 1.8, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(35,28,20,0.5)';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(92, -184); ctx.quadraticCurveTo(108, -176, 122, -184); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(124, -196); ctx.quadraticCurveTo(90, -176, 40, -172);
  ctx.strokeStyle = 'rgba(35,28,20,0.45)'; ctx.lineWidth = 1.8; ctx.stroke();

  // ---- mane on the wind field
  for (let k = 0; k < 8; k++) {
    const t = k / 7;
    const bx = lerp(38, 92, t), by = lerp(-152, -202, t);
    const a = fieldAngle(bx + 900, by + 500, u * 1.5, k);
    const len = 26 + k * 4;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx - Math.cos(a) * len * 0.5, by + Math.sin(a) * len * 0.3,
      bx - Math.cos(a + 0.4) * len, by + Math.sin(a + 0.4) * len * 0.6);
    ctx.strokeStyle = 'rgba(35,28,20,' + (0.6 - k * 0.03).toFixed(2) + ')';
    ctx.lineWidth = 3.4 - k * 0.2;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  // saddle blanket
  ctx.beginPath();
  ctx.moveTo(-38, -150); ctx.lineTo(18, -154); ctx.lineTo(24, -128); ctx.lineTo(-32, -124);
  ctx.closePath();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke();
  void D1;
  ctx.restore();
}

function riderInk(ctx, pos) {
  const parts = KIT.rig.rigParts(pos);
  // fill the robe with a pale wash so the figure reads against the ribbons
  ctx.save();
  for (const p of parts) {
    if (p.role !== 'body' && p.role !== 'sleeve-near' && p.role !== 'sleeve-far') continue;
    if (p.kind !== 'poly') continue;
    poly(ctx, p.pts, true);
    ctx.fillStyle = 'rgba(252,250,244,0.9)';
    ctx.fill();
  }
  ctx.restore();
  for (const p of parts) {
    if (p.role === 'mount') continue;
    if (p.role === 'detail' && p.kind === 'line') continue;
    if (p.kind === 'poly') {
      const pts = resample([...p.pts, p.pts[0]], 4.5);
      const base = p.role === 'body' || p.role === 'sleeve-near' ? 3.1 : 2.1;
      inkRibbon(ctx, pts, (q) => base * (0.45 + 1.3 * Math.pow(Math.sin(Math.PI * clamp01(q * 0.92 + 0.04)), 0.55)),
        { color: INK, alpha: 0.94, seed: 21, dry: 1, width: 5 });
    } else if (p.kind === 'line') {
      const pts = resample(p.pts, 4);
      const base = Math.max(1.2, (p.width || 2) * 0.28);
      inkRibbon(ctx, pts, (q) => base * (0.5 + 1.2 * Math.pow(Math.sin(Math.PI * clamp01(q * 0.9 + 0.05)), 0.6)),
        { color: INK, alpha: p.role === 'robe-tail' || p.role === 'sleeve-tail' ? 0.7 : 0.92, seed: 22, dry: 1, width: base });
    } else if (p.kind === 'circle') {
      ctx.beginPath();
      ctx.arc(p.c[0], p.c[1], p.r, 0, TAU);
      ctx.fillStyle = 'rgba(248,245,236,0.8)';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.1;
      ctx.stroke();
    } else if (p.kind === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse(p.c[0], p.c[1], p.rx, p.ry, 0, 0, TAU);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
    } else if (p.kind === 'dot') {
      ctx.beginPath(); ctx.arc(p.c[0], p.c[1], p.r * 1.4, 0, TAU);
      ctx.fillStyle = INK; ctx.fill();
    }
  }
}

/* ================================================================== type */
function typeLayer() {
  return KIT.layer('s02:type', 1200, 340, (c) => {
    c.font = `400 ${T_SIZE}px ${KIT.FONT.brush}`;
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    c.fillStyle = '#1d1710';
    c.fillText(TEXT, T_SIZE * 0.05, T_SIZE * 1.04);
  });
}

/** Ink tendrils that fuse into the written strokes during bar 2. */
function drawTendrils(ctx, u) {
  if (!MASK) return;
  const p = smoothstep(2.5, 3.5, u);
  if (p <= 0) return;
  const r = mulberry32(hash('s02tendril', 4));
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const pt = MASK.pts[Math.floor(r() * MASK.pts.length)];
    const x = T_X - T_SIZE * 0.05 + pt[0];
    const y = T_MASK_Y + pt[1];
    const a = r() * TAU;
    const len = 40 + r() * 150;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(a) * len * 0.5 - Math.sin(a) * 30,
      y + Math.sin(a) * len * 0.5 + Math.cos(a) * 24,
      x + Math.cos(a) * len, y + Math.sin(a) * len,
    );
    ctx.strokeStyle = `rgba(29,23,16,${(0.35 * p).toFixed(3)})`;
    ctx.lineWidth = 1 + r() * 3;
    ctx.stroke();
  }
  ctx.restore();
}

/* =============================================================== ink rain */
const RAIN = [];
function initRain() {
  if (RAIN.length) return;
  const r = mulberry32(hash('s02rain', 313));
  for (let i = 0; i < 430; i++) {
    RAIN.push({
      x: r(), y: r(), depth: 0.2 + r() * 1.0, len: 22 + r() * 96,
      w: 0.7 + r() * 2.8, ph: r() * TAU, ink: r() < 0.7,
    });
  }
}

function drawInkRain(ctx, u) {
  const p = smoothstep(4.0, 4.7, u);
  if (p <= 0) return;
  ctx.save();
  for (const d of RAIN) {
    const t = (u - 4.0) * (90 + d.depth * 260);
    const x = ((d.x * W + t) % (W + 700)) - 260;
    const y = d.y * H + Math.sin(u * 2 + d.ph) * 18 * d.depth;
    const alpha = p * (0.08 + d.depth * 0.26);
    ctx.strokeStyle = d.ink ? `rgba(30,24,17,${alpha.toFixed(3)})` : `rgba(120,100,70,${(alpha * 0.45).toFixed(3)})`;
    ctx.lineWidth = d.w * (0.5 + d.depth);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - d.len * (0.6 + d.depth * 0.7), y + d.len * 0.16);
    ctx.stroke();
  }
  ctx.restore();
}

/* ================================================================ portal */
function drawGate(ctx, u) {
  const p = smoothstep(5.05, 5.5, u);
  if (p <= 0) return;
  ctx.save();
  ctx.globalAlpha = p;
  // a torn silk opening at the right edge
  ctx.fillStyle = 'rgba(12,10,8,0.10)';
  ctx.fillRect(1792, 0, W - 1792, H);
  KIT.frames.drawPortal(ctx, 1796, 118, 104, 842, { style: 'ink', accent: '#a52a22', alpha: 1, seed: 731, t: u });
  const r = mulberry32(hash('s02gate', 7));
  ctx.strokeStyle = 'rgba(35,28,20,0.55)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 22; i++) {
    const y = r() * H;
    ctx.beginPath();
    ctx.moveTo(1790 - r() * 26, y);
    ctx.lineTo(1792, y + (r() - 0.5) * 16);
    ctx.stroke();
  }
  ctx.restore();
}

/* ================================================================ render */
export function renderAt(ctx, u, beat, env = {}) {
  initRain();
  buildRibbons();
  const silk = silkLayer();
  const type = typeLayer();

  ctx.save();
  // a slow camera breath
  const zoom = 1 + 0.012 * Math.sin(u * 0.5);
  ctx.translate(W / 2, H / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2, -H / 2);

  ctx.drawImage(silk, 0, 0);
  silkFrame(ctx, u);

  // ---- collector's seal, bar 1
  const sealP = smoothstep(0.25, 0.9, u);
  ctx.save();
  ctx.globalAlpha = sealP * 0.9;
  KIT.ink.sealStamp(ctx, 1766, 866, 78, '吴', { seed: 33, color: SEAL, rotate: 0.03, vertical: false, h: 78 });
  ctx.restore();

  // ---- ribbons
  drawRibbons(ctx, u);

  // ---- horse + rider (lower left → centre)
  const rideX = lerp(330, 790, easeInOut(smoothstep(0.2, 4.8, u)));
  const rideY = 1046;
  const exit = smoothstep(5.0, 6.0, u);
  const rx = lerp(rideX, 1800, easeInOut(exit));
  const ry = lerp(rideY, 940, exit * 0.9);
  const scale = 1.0;
  const phase = (u / 1.0) * TAU;
  const P = KIT.rig.pose({
    t: u, phase, mode: 'ride', mount: 'horse',
    wind: 0.62, lean: 0.02, look: smoothstep(4.3, 4.6, u) * 0.9 - smoothstep(4.85, 5.0, u) * 0.5,
    beard: 0.5, staff: false,
  });
  // the rig drapes the rider's robe to the ground, which would swallow the
  // horse; draw the mount large and lift the rider onto its back instead.
  const anchor = ctx.createRadialGradient(rx + 10, ry - 170, 20, rx + 10, ry - 170, 300);
  anchor.addColorStop(0, 'rgba(96,84,62,0.13)');
  anchor.addColorStop(0.6, 'rgba(96,84,62,0.05)');
  anchor.addColorStop(1, 'rgba(96,84,62,0)');
  ctx.fillStyle = anchor;
  ctx.fillRect(rx - 320, ry - 480, 660, 560);
  baiMiaoHorse(ctx, rx, ry, scale * 1.45, phase, u);
  const rScale = scale * 0.8;
  const riderPos = KIT.rig.placed(P, { x: rx - 14, y: ry - 100, scale: rScale });
  riderInk(ctx, riderPos);
  // the sword
  ctx.save();
  const sx = rx + 6, sy = ry - 252;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(sx - 42, sy + 78, sx - 70, sy + 152);
  ctx.stroke();
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(sx + 9, sy - 5);
  ctx.lineTo(sx - 10, sy + 15);
  ctx.stroke();
  ctx.restore();
  // sleeve ribbons trailing in the field
  ctx.save();
  for (let k = 0; k < 4; k++) {
    const bx = rx - 40 * scale - k * 9, by = ry - 300 * scale + k * 16;
    const a = fieldAngle(bx * 0.8, by, u * 1.3, k + 3);
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      pts.push([
        bx - Math.cos(a + t * 1.1) * t * (150 + k * 40),
        by + Math.sin(a + t * 0.9) * t * (70 + k * 22) - t * 26,
      ]);
    }
    inkRibbon(ctx, pts, (q) => (5 - q * 3.4) * (1 - k * 0.12), {
      color: INK, alpha: 0.55 - k * 0.08, seed: 60 + k, dry: 1, width: 5,
    });
  }
  ctx.restore();

  // ---- the writing: comes out of the compressed field
  const typeP = smoothstep(2.32, 2.78, u);
  if (typeP > 0) {
    ctx.save();
    ctx.globalAlpha = typeP * (1 - 0.25 * smoothstep(4.6, 5.6, u));
    ctx.drawImage(type, T_X - T_SIZE * 0.05, T_MASK_Y);
    // a wet halo of ink wicked into the silk
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = typeP * 0.22;
    ctx.drawImage(type, T_X - T_SIZE * 0.05 - 2, T_MASK_Y - 1, 1200 * 1.004, 340 * 1.006);
    ctx.restore();
    drawTendrils(ctx, u);
  }

  // ---- the horse's gallop throws ink
  const splP = smoothstep(1.2, 1.7, u) * (1 - smoothstep(4.2, 4.7, u));
  if (splP > 0.02) {
    KIT.ink.inkSplatter(ctx, rx + 120 * scale, ry - 24, {
      n: 26, radius: 120, seed: 731, color: '#241d15', alpha: 0.35 * splP, pow: 2.2,
    });
  }

  drawInkRain(ctx, u);
  drawGate(ctx, u);
  ctx.restore();

  // ---- the small top register (kept clear of card + HUD)
  ctx.save();
  ctx.globalAlpha = smoothstep(0.3, 1.0, u);
  KIT.drawText(ctx, '开元十九年 · 吴越壮游', 604, 92, {
    size: 26, font: KIT.FONT.serif, weight: 500, color: 'rgba(38,30,20,0.78)', letterSpacing: 6,
  });
  ctx.fillStyle = 'rgba(38,30,20,0.4)';
  ctx.fillRect(604, 110, 300, 1);
  KIT.drawText(ctx, 'WU DAOZI LINE STUDY  ·  RIBBON FIELD 52', 604, 128, {
    size: 13, font: KIT.FONT.mono, weight: 500, color: 'rgba(48,38,26,0.5)', letterSpacing: 2.2,
  });
  KIT.ink.sealStamp(ctx, 946, 68, 54, '杜', { seed: 21, color: SEAL, rotate: -0.04, vertical: false, h: 54 });
  ctx.restore();

  // ---- the wild key line, marked for QA
  const shown = typeP;
  markText('s02-poem', TEXT, T_X - 14, T_CY - T_SIZE * 0.62, T_SIZE * 4.9, T_SIZE * 1.16,
    { size: T_SIZE, align: 'left', color: '#1d1710' });
  void shown;

  // faint vignette to hold the silk's edge
  const v = ctx.createRadialGradient(W * 0.5, H * 0.46, H * 0.32, W * 0.5, H * 0.5, W * 0.72);
  v.addColorStop(0, 'rgba(120,100,70,0)');
  v.addColorStop(1, 'rgba(96,78,50,0.22)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  void beat; void env;
}

export default { renderAt };
