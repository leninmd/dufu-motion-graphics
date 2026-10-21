/**
 * 03 · 三维水墨点云 · 望岳 / 3D Point Cloud Perspective · 736
 *
 * 35,000 ink particles describe the Tai Shan range. Bar 1 is the naive
 * panorama: layer after layer of peaks, a young man on the road, the horizon
 * endless. On the bar-2 downbeat the camera orbits 90° in orthographic space;
 * the range collapses into one vertical peak. The famous couplet appears in the
 * negative space at the right — not as a caption, but as the only thing left
 * standing.
 */
import KIT from '../kit/index.js';
import { clamp01, lerp, smoothstep, easeInOut, easeOut, hash, unit, mulberry32, TAU } from '../kit/math.js';
import { markText } from '../kit/debug.js';

const W = 1920, H = 1080;
const POINT_COUNT = 35000;
const CAM_TARGET = [200, -180, 0];
const CAM_CY = 570;
const ORTHO = 0.66;
const PEAK_X = 760;

let CLOUD = null;
let STARS = null;
let SPECKS = null;

function buildCloud() {
  if (CLOUD) return CLOUD;
  const raw = KIT.geometry3d.mountainCloud({
    count: POINT_COUNT, seed: 736, spread: 1010, baseY: 440, depth: 46,
    peaks: [
      { x: -980, h: 240, w: 210 }, { x: -775, h: 335, w: 230 },
      { x: -555, h: 420, w: 250 }, { x: -300, h: 520, w: 270 },
      { x: -40, h: 390, w: 280 }, { x: 220, h: 300, w: 260 },
      { x: 430, h: 170, w: 210 },
    ],
  });
  const r = mulberry32(hash('scene3cloud', 736));
  CLOUD = raw.map((p) => {
    // Fill a substantial part of the mountain volume, not just the ridge.
    // Without this, 35k surface points read as a glowing arch instead of mass.
    const volume = r() < 0.62 ? (0.18 + 0.82 * Math.pow(r(), 0.85)) : 0;
    const filled = p.y + (440 - p.y) * volume * 0.92;
    const y = -filled; // world Y grows up
    const depth = (p.z + 50) / 100;
    const glow = clamp01(1 - Math.abs(p.x + 250) / 1500);
    const ridge = clamp01((y - 40) / 530);
    const side = (r() * 2 - 1) * (0.35 + 0.65 * Math.abs(r() * 2 - 1));
    const tone = clamp01(0.10 + ridge * 0.54 + (1 - depth) * 0.20 + glow * 0.12 + (1 - volume) * 0.08);
    return {
      p: [p.x, y, p.z], x: p.x, y, z: p.z,
      tone, side, layer: p.layer, twinkle: r(), surface: volume < 0.1, volume,
    };
  });
  const sr = mulberry32(2026);
  STARS = [];
  for (let i = 0; i < 170; i++) {
    STARS.push({ x: sr() * W, y: sr() * H * 0.74, s: 0.5 + Math.pow(sr(), 3) * 2.3, a: 0.12 + Math.pow(sr(), 2) * 0.55, ph: sr() * TAU });
  }
  SPECKS = [];
  for (let i = 0; i < 220; i++) {
    SPECKS.push({ x: sr() * W, y: 500 + sr() * 460, r: 0.6 + sr() * 2.2, a: 0.05 + sr() * 0.2, sp: 0.3 + sr() * 0.9 });
  }
  return CLOUD;
}

function sky(ctx, u, morph) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#030908');
  g.addColorStop(0.38, '#0a1a16');
  g.addColorStop(0.7, '#18312b');
  g.addColorStop(0.86, '#1f3a32');
  g.addColorStop(1, '#07100d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  // Three ink-wash ridge masses behind the particles. Their silhouettes make
  // the point cloud read as terrain, not as a cloud of fireflies. The fill
  // fades to zero horizontally so there is no hard cut in the right-hand
  // negative space reserved for the poem.
  for (let layer = 0; layer < 3; layer++) {
    const alpha = (0.58 - layer * 0.14) * (1 - morph * 0.75);
    const baseY = 790 + layer * 22;
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, `rgba(${8 + layer * 5},${24 + layer * 7},${21 + layer * 6},${alpha})`);
    grad.addColorStop(0.68, `rgba(${8 + layer * 5},${24 + layer * 7},${21 + layer * 6},${alpha})`);
    grad.addColorStop(0.84, `rgba(${8 + layer * 5},${24 + layer * 7},${21 + layer * 6},${alpha * 0.38})`);
    grad.addColorStop(1, `rgba(${8 + layer * 5},${24 + layer * 7},${21 + layer * 6},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    for (let x = 0; x <= W; x += 14) {
      const px = x / 1540;
      let y = 620 - layer * 30;
      const peaks = layer === 0 ? [[0.04, 0.25], [0.17, 0.6], [0.31, 0.45], [0.45, 0.86], [0.61, 0.62], [0.76, 0.34], [0.9, 0.18]]
        : layer === 1 ? [[0.08, 0.3], [0.4, 0.52], [0.58, 0.72], [0.8, 0.35]]
          : [[0.15, 0.14], [0.55, 0.4], [0.86, 0.24]];
      for (const [cxp, hh] of peaks) y -= hh * (240 - layer * 40) * Math.exp(-Math.pow((px - cxp) / 0.18, 2));
      y -= (KIT.noise2(px * 8.2 + layer, 0.4, 71) - 0.5) * 36;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, 940); ctx.lineTo(0, 940); ctx.closePath();
    ctx.fill();
  }
  // foreground valley
  const fg = ctx.createLinearGradient(0, 700, 0, H);
  fg.addColorStop(0, 'rgba(3,10,8,0)');
  fg.addColorStop(0.55, 'rgba(2,7,6,0.62)');
  fg.addColorStop(1, 'rgba(1,4,3,0.92)');
  ctx.fillStyle = fg; ctx.fillRect(0, 640, W, H - 640);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of STARS) {
    const tw = 0.55 + 0.45 * Math.sin(u * 1.7 + s.ph);
    ctx.fillStyle = `rgba(218,234,224,${s.a * tw * 0.55})`;
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }
  ctx.restore();
}

function peakOutline() {
  const top = 196;
  const base = 770;
  const right = [
    [PEAK_X + 8, 318], [PEAK_X + 44, 400], [PEAK_X + 72, 470], [PEAK_X + 152, 560],
    [PEAK_X + 248, 644], [PEAK_X + 360, 710], [PEAK_X + 470, 760], [PEAK_X + 540, 778],
  ];
  const left = [
    [PEAK_X - 16, 330], [PEAK_X - 44, 418], [PEAK_X - 58, 512], [PEAK_X - 124, 590],
    [PEAK_X - 220, 652], [PEAK_X - 330, 710], [PEAK_X - 430, 752], [PEAK_X - 505, 772],
  ];
  return { top, base, right, left };
}

function drawWaistClouds(ctx, u, a, morph) {
  // Two horizontal ink-wash cloud belts at the waist of the peak. They dissolve
  // the hard polygon base: the mountain no longer sits on a cut-out silhouette
  // but melts into weather.
  ctx.save();
  ctx.globalAlpha = a * (1 - 0.45 * morph);
  const bands = [
    { y: 636, h: 58, drift: 46, alpha: 0.5, seed: 3 },
    { y: 742, h: 76, drift: -34, alpha: 0.62, seed: 8 },
  ];
  for (const band of bands) {
    for (let i = 0; i < 9; i++) {
      const rt = KIT.unit('s03cloud', band.seed, i);
      const r2 = KIT.unit('s03cloudb', band.seed, i);
      const r3 = KIT.unit('s03cloudc', band.seed, i);
      const px = rt * (W + 520) - 260 + Math.sin(u * 0.35 + i * 0.9) * band.drift;
      const py = band.y + Math.sin(i * 1.7 + band.seed) * band.h * 0.42;
      const rx = 170 + r2 * 240;
      const ry = band.h * (0.5 + r3 * 0.45);
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, `rgba(206,232,220,${(0.30 * band.alpha).toFixed(3)})`);
      g.addColorStop(0.45, `rgba(140,188,172,${(0.19 * band.alpha).toFixed(3)})`);
      g.addColorStop(0.82, `rgba(70,116,104,${(0.09 * band.alpha).toFixed(3)})`);
      g.addColorStop(1, 'rgba(30,64,56,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, rx, 0, KIT.TAU); ctx.fill();
      ctx.restore();
    }
    // a thin dragging filament makes the belt read as moving weather
    ctx.strokeStyle = `rgba(200,230,217,${(0.18 * band.alpha).toFixed(3)})`;
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      const y0 = band.y + (i - 1) * band.h * 0.36;
      const off = ((u * 26 * (i % 2 ? 1 : -1)) % 420);
      ctx.beginPath();
      for (let x = -40; x <= W + 40; x += 40) {
        const y = y0 + Math.sin((x + off) * 0.006 + i * 2.1 + band.seed) * band.h * 0.34;
        if (x === -40) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawCentralPeak(ctx, u, morph) {
  if (morph <= 0.01) return;
  const a = smoothstep(0.2, 0.9, morph);
  const { top, right, left } = peakOutline();
  ctx.save();
  ctx.globalAlpha = a;
  // Vertical wash: deep ink-green at the waist, dissolving to an empty cloud
  // bottom. No hard geometric silhouette edge survives below y≈800.
  const g = ctx.createLinearGradient(0, 190, 0, 992);
  g.addColorStop(0, 'rgba(9,24,20,0.30)');
  g.addColorStop(0.16, 'rgba(4,13,12,0.82)');
  g.addColorStop(0.44, 'rgba(2,8,7,0.93)');
  g.addColorStop(0.60, 'rgba(5,23,19,0.84)');
  g.addColorStop(0.72, 'rgba(7,30,24,0.54)');
  g.addColorStop(0.84, 'rgba(9,36,29,0.24)');
  g.addColorStop(0.94, 'rgba(11,42,34,0.05)');
  g.addColorStop(1, 'rgba(11,42,34,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(PEAK_X, top);
  for (const [x, y] of right) ctx.lineTo(x, y);
  ctx.lineTo(PEAK_X + 500, 980);
  ctx.lineTo(PEAK_X - 480, 980);
  for (let i = left.length - 1; i >= 0; i--) ctx.lineTo(left[i][0], left[i][1]);
  ctx.closePath();
  ctx.fill();
  // right face gets one soft reflected light
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(PEAK_X + 10, 300); ctx.lineTo(PEAK_X + 470, 760); ctx.lineTo(PEAK_X + 520, 980);
  ctx.lineTo(PEAK_X + 30, 980); ctx.closePath();
  const face = ctx.createLinearGradient(PEAK_X + 100, 330, PEAK_X + 300, 760);
  face.addColorStop(0, 'rgba(126,181,163,0.05)');
  face.addColorStop(0.6, 'rgba(96,151,135,0.13)');
  face.addColorStop(1, 'rgba(50,93,82,0.03)');
  ctx.fillStyle = face; ctx.fill();
  ctx.restore();
  // dry-brush contour / fault lines
  ctx.globalAlpha = a * 0.34;
  ctx.strokeStyle = 'rgba(145,197,181,0.55)';
  const r = mulberry32(736);
  for (let k = 0; k < 15; k++) {
    const t = 0.1 + r() * 0.9;
    const side = r() < 0.55 ? -1 : 1;
    const pts = [];
    for (let i = 0; i < 12; i++) {
      const p = t + i * 0.015 * side;
      const x = PEAK_X + side * (12 + 180 * Math.pow(clamp01(p), 1.15));
      const y = lerp(300, 750, p) + Math.sin(i * 0.9 + k) * 5;
      pts.push([x, y]);
    }
    ctx.strokeStyle = `rgba(146,199,183,${0.05 + r() * 0.16})`;
    ctx.lineWidth = 0.8 + r() * 1.4;
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.stroke();
  }
  // ridge light
  ctx.globalAlpha = a * 0.75;
  ctx.strokeStyle = 'rgba(171,222,205,0.36)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(PEAK_X, top);
  for (const [x, y] of left) ctx.lineTo(x, y);
  ctx.stroke();
  // measuring axis
  ctx.globalAlpha = a * 0.3;
  ctx.strokeStyle = 'rgba(180,222,209,0.5)';
  ctx.setLineDash([2, 8]);
  ctx.beginPath(); ctx.moveTo(PEAK_X, top - 30); ctx.lineTo(PEAK_X, 808); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function projectPoint(cam, pt, morph, u) {
  const q = cam.project(pt.p);
  let sx = q.x;
  let sy = q.y;
  const h = clamp01((sy - 210) / 560);
  if (morph > 0.001) {
    const side = pt.side;
    const edge = Math.abs(side);
    const leftW = 468 * Math.pow(h, 1.05) * (0.72 + 0.28 * h);
    const rightW = 548 * Math.pow(h, 0.98) * (0.72 + 0.28 * h);
    const center = PEAK_X + 18 * h * h;
    const ridgeBump = 34 * Math.exp(-Math.pow((h - 0.56) / 0.1, 2)) * (side < 0 ? 1 : -0.25);
    const targetX = center + (side < 0 ? -leftW * edge : rightW * edge) + ridgeBump * edge
      + Math.sin(h * 11 + u * 0.8 + side * 3) * 2.0;
    sx = lerp(sx, targetX, morph);
    sy = lerp(sy, 196 + h * 580, morph * 0.32);
  }
  sx += Math.sin(u * 0.28 + pt.z * 0.02) * 2.2 * (1 - morph);
  return { sx, sy, h, edge: Math.abs(pt.side) };
}

function drawPoints(ctx, u, yaw, morph) {
  const cam = new KIT.geometry3d.Camera3D({
    cx: W / 2, cy: CAM_CY, target: CAM_TARGET,
    ortho: true, orthoScale: ORTHO, yaw, pitch: 0.02, roll: 0,
  });
  const buckets = new Map();
  for (let i = 0; i < CLOUD.length; i++) {
    const pt = CLOUD[i];
    const { sx, sy, h, edge } = projectPoint(cam, pt, morph, u);
    if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) continue;
    // Edge particles catch the light; the interior stays ink-dark.
    const glow = morph > 0.2 ? (0.10 + edge * 0.26) : 0;
    const l = clamp01(pt.tone * 0.76 + glow + (pt.surface ? 0.05 : 0));
    const size = 0.8 + (1 - h) * 0.9 + (pt.layer ? 0.3 : 0) + (pt.twinkle > 0.94 ? 1.05 : 0);
    const key = Math.round(l * 7) + ':' + Math.round(size * 2) / 2;
    let arr = buckets.get(key);
    if (!arr) { arr = []; buckets.set(key, arr); }
    arr.push(sx, sy);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [key, arr] of buckets) {
    const [lq, sz] = key.split(':').map(Number);
    const l = lq / 7;
    const r = Math.round(lerp(54, 211, l));
    const g = Math.round(lerp(94, 238, l));
    const b = Math.round(lerp(87, 221, l));
    ctx.fillStyle = `rgba(${r},${g},${b},${(0.14 + l * 0.68).toFixed(3)})`;
    const s = Math.max(0.65, sz);
    for (let k = 0; k < arr.length; k += 2) ctx.fillRect(arr[k], arr[k + 1], s, s);
  }
  ctx.restore();
  // beacon points, always along the ridge during the single-peak state
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 240; i++) {
    const pt = CLOUD[Math.floor(unit(736, i, 2) * CLOUD.length)];
    const { sx, sy, edge } = projectPoint(cam, pt, morph, u);
    if (sx < 0 || sx > W || sy < 0 || sy > H) continue;
    ctx.fillStyle = `rgba(215,243,232,${0.22 + 0.38 * unit(736, i, 3) + edge * 0.18})`;
    const r = 1.0 + edge * 1.2 + unit(736, i, 4) * 1.9;
    ctx.fillRect(sx - r / 2, sy - r / 2, r, r);
  }
  ctx.restore();
  return cam;
}

function drawMist(ctx, u, morph) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let b = 0; b < 5; b++) {
    const y = 610 + b * 39;
    const a = (0.035 + b * 0.012) * (1 - morph * 0.45);
    const g = ctx.createLinearGradient(0, y - 80, 0, y + 100);
    g.addColorStop(0, 'rgba(172,214,200,0)');
    g.addColorStop(0.52, `rgba(172,214,200,${a})`);
    g.addColorStop(1, 'rgba(172,214,200,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-40, y + 70);
    for (let x = -40; x <= W + 40; x += 42) {
      const yy = y + Math.sin(x * 0.006 + b * 1.7 + u * 0.2) * 19
        + (KIT.noise2(x * 0.004, b * 3.7, 41) - 0.5) * 44;
      ctx.lineTo(x, yy);
    }
    ctx.lineTo(W + 40, y + 170); ctx.lineTo(-40, y + 170); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawTraveler(ctx, u, phase, morph) {
  const P = KIT.rig.pose({ t: u, phase, wind: 0.34, lean: 0.02, look: 0.15, staff: true });
  let x = lerp(455, 548, smoothstep(0, 4.2, u));
  let y = 826;
  let scale = 0.72;
  if (morph > 0) {
    x = lerp(x, 412, morph * 0.7);
    scale = lerp(scale, 0.56, morph);
  }
  const exit = smoothstep(4.9, 6.0, u);
  if (exit > 0) {
    x = lerp(x, 1782, easeInOut(exit));
    y = lerp(y, 792, exit);
    scale = lerp(scale, 0.62, exit);
  }
  const pos = KIT.rig.placed(P, { x, y, scale, rot: 0 });
  const pts = KIT.rig.sampleRig(pos, { edgeStep: 4.6, fill: true, fillStep: 12, seed: 31 });
  ctx.save();
  // The figure needs a dark body mass, or the dots read as a constellation.
  const silhouette = {
    ...pos,
    parts: pos.parts.filter((p) => ['body', 'sleeve-near', 'sleeve-far', 'skin', 'cap', 'leg-near', 'leg-far', 'staff', 'beard', 'hair'].includes(p.role)),
  };
  KIT.rig.drawSilhouette(ctx, silhouette, { color: 'rgba(3,10,8,0.82)', alpha: 0.92 });
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(x, y - 245 * scale, 2, x, y - 245 * scale, 70);
  glow.addColorStop(0, 'rgba(196,232,218,0.20)');
  glow.addColorStop(1, 'rgba(196,232,218,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 90, y - 340, 180, 260);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    ctx.fillStyle = `rgba(187,227,212,${(0.20 + 0.45 * unit(31, i, 2)).toFixed(3)})`;
    const s = 0.8 + unit(31, i, 3) * 1.9;
    ctx.fillRect(p[0], p[1], s, s);
  }
  ctx.globalCompositeOperation = 'source-over';
  KIT.rig.drawWire(ctx, pos, { color: 'rgba(208,237,224,0.24)', width: 1, alpha: 0.8 });
  ctx.fillStyle = 'rgba(0,7,6,0.4)';
  ctx.beginPath(); ctx.ellipse(x, y + 2, 38 * scale, 7 * scale, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawBarOne(ctx, u) {
  const a = smoothstep(0.12, 0.6, u) * (1 - smoothstep(2.04, 2.3, u));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(3,9,8,0.4)';
  ctx.fillRect(94, 854, 830, 116);
  ctx.fillStyle = 'rgba(196,55,44,0.92)';
  ctx.fillRect(112, 885, 52, 3);
  KIT.drawText(ctx, '廿四岁，他以为盛世永远不会落幕', 112, 916, {
    size: 34, font: KIT.FONT.display, weight: 500, color: 'rgba(229,239,229,0.92)', letterSpacing: 1.2, mark: 's03-bar1',
  });
  KIT.drawText(ctx, 'THE HORIZON LOOKED LIKE FOREVER · 736 CE', 114, 947, {
    size: 8.5, font: KIT.FONT.mono, weight: 500, color: 'rgba(191,218,204,0.45)', letterSpacing: 1.6,
  });
  ctx.restore();
}

function drawPoem(ctx, u) {
  const p = smoothstep(2.52, 2.9, u);
  if (p <= 0) return;
  const lines = [
    { text: '会当凌绝顶，', x: 1688 },
    { text: '一览众山小。', x: 1602 },
  ];
  ctx.save();
  ctx.globalAlpha = p;
  ctx.translate(0, (1 - easeOut(p)) * 26);
  ctx.strokeStyle = 'rgba(193,226,211,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(1744, 232); ctx.lineTo(1744, 748); ctx.stroke();
  const clipH = 540 * easeOut(smoothstep(2.5, 3.4, u));
  ctx.save();
  ctx.beginPath(); ctx.rect(1510, 198, 290, clipH + 10); ctx.clip();
  for (const line of lines) {
    const chars = [...line.text];
    for (let i = 0; i < chars.length; i++) {
      const alpha = smoothstep(0, 0.5, p) * clamp01((u - 2.52 - i * 0.035) * 5);
      KIT.drawText(ctx, chars[i], line.x, 264 + i * 67, {
        size: 61, font: KIT.FONT.brush, weight: 400, color: `rgba(231,245,234,${(0.92 * alpha).toFixed(3)})`,
        align: 'center', letterSpacing: 0,
        shadow: { color: 'rgba(122,210,185,0.28)', blur: 18, x: 0, y: 0 },
      });
    }
  }
  ctx.restore();
  KIT.drawText(ctx, '望 岳 · 七三六', 1662, 774, { size: 12, font: KIT.FONT.serif, weight: 500, color: 'rgba(213,235,222,0.6)', align: 'center', letterSpacing: 3.6 });
  KIT.drawText(ctx, 'DU FU · AGE 24 · ORTHOGRAPHIC 90°', 1662, 798, { size: 8, font: KIT.FONT.mono, weight: 500, color: 'rgba(190,220,204,0.34)', align: 'center', letterSpacing: 1.4 });
  ctx.restore();
  markText('s03-poem', '会当凌绝顶，一览众山小。', 1538, 218, 222, 560, { size: 61, align: 'center', color: '#e7f5ea' });
}

function comma(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

function drawTechnical(ctx, u, morph) {
  const angle = Math.round(90 * smoothstep(2.0, 2.65, u));
  ctx.save();
  ctx.globalAlpha = smoothstep(0.8, 1.4, u) * (1 - smoothstep(5.4, 5.9, u));
  ctx.strokeStyle = 'rgba(187,219,204,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(1370, 930); ctx.lineTo(1778, 930); ctx.stroke();
  KIT.drawText(ctx, `POINTS ${comma(POINT_COUNT)}   ·   ORTHO ${String(angle).padStart(2, '0')}°`, 1370, 950, { size: 8.5, font: KIT.FONT.mono, color: 'rgba(187,219,204,0.42)', letterSpacing: 1.1 });
  KIT.drawText(ctx, morph > 0.6 ? 'SINGLE PEAK / ONE SILHOUETTE' : 'RANGE / DEPTH FIELD', 1778, 950, { size: 8.5, font: KIT.FONT.mono, color: 'rgba(187,219,204,0.42)', align: 'right', letterSpacing: 1.1 });
  ctx.restore();
}

function drawGate(ctx, u) {
  const p = smoothstep(5.0, 5.35, u);
  if (p <= 0) return;
  ctx.save();
  ctx.globalAlpha = p;
  ctx.fillStyle = 'rgba(1,4,3,0.55)';
  ctx.fillRect(1810, 166, 106, 784);
  KIT.frames.drawPortal(ctx, 1810, 166, 106, 784, { style: 'ink', accent: '#8fcfc2', alpha: 1, seed: 736, t: u });
  ctx.restore();
}

export function renderAt(ctx, u, beat, env = {}) {
  buildCloud();
  const rotate = smoothstep(2.0, 2.68, u);
  const yaw = easeInOut(rotate) * Math.PI * 0.5;
  const morph = smoothstep(0.46, 0.94, rotate);
  const flash = u >= 2.0 ? Math.exp(-(u - 2.0) * 12) : 0;
  ctx.save();
  const camShift = (1 - rotate) * Math.sin(u * 0.25) * 4;
  ctx.translate(0, camShift);
  sky(ctx, u, morph);
  drawMist(ctx, u, morph);
  drawCentralPeak(ctx, u, morph);
  drawPoints(ctx, u, yaw, morph);
  drawWaistClouds(ctx, u, 0.55 + 0.45 * smoothstep(0.3, 1.2, u), morph);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const s of SPECKS) {
    const a = s.a * (0.5 + 0.5 * Math.sin(u * 1.1 + s.sp * 10));
    ctx.fillStyle = `rgba(180,217,202,${a.toFixed(3)})`;
    ctx.fillRect(s.x + Math.sin(u * 0.3 + s.r) * 8, s.y + Math.cos(u * 0.4 + s.r) * 5, s.r, s.r);
  }
  ctx.restore();
  drawTraveler(ctx, u, (u / 1.0) * Math.PI * 2, morph);
  drawGate(ctx, u);
  ctx.restore();

  drawBarOne(ctx, u);
  drawPoem(ctx, u);
  drawTechnical(ctx, u, morph);
  if (flash > 0.01) {
    ctx.save();
    ctx.globalAlpha = flash * 0.32;
    ctx.fillStyle = 'rgba(214,241,228,1)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (u >= 2.0 && u < 2.7) {
    const spl = 1 - smoothstep(2.0, 2.7, u);
    KIT.ink.inkSplatter(ctx, 880, 600, { n: 32, radius: 220, seed: 7361, color: '#b8dfcf', alpha: 0.25 * spl, pow: 2.4 });
  }
  const v = ctx.createRadialGradient(920, 500, 260, 960, 540, 1150);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(0.7, 'rgba(0,5,4,0.10)');
  v.addColorStop(1, 'rgba(0,4,3,0.4)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  const grain = KIT.layer('scene3:grain', 480, 270, (c) => KIT.grainLayer(480, 270, 33, { amp: 0.09 }));
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.13; ctx.drawImage(grain, 0, 0, W, H); ctx.restore();
  void beat; void env;
}
