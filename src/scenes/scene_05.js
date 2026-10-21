/**
 * 05 · 宋代尺页账簿 · 困守长安 / Song Album Leaf & Counting Rods · 751
 *
 * A mounted album leaf used as a cold accounting book of failure: red ledger
 * columns, counting rods carrying the day count up to 3650, a thin donkey in
 * the rain. On the bar-2 downbeat the ten characters of the poem fall onto the
 * donkey's back and physically bend its spine.
 */
import KIT from '../kit/index.js';
import {
  clamp01, lerp, smoothstep, easeOut, easeInBack, easeInOut, hash, unit, mulberry32, TAU,
} from '../kit/math.js';
import { markText } from '../kit/debug.js';

const W = 1920, H = 1080;
const PAPER = '#e9dfc4';
const INK = '#33281a';
const RED = '#9d3024';
const RAIN = '#8e958c';
const OCHRE = '#a7834f';

const GROUND = 900;

/* ================================================================ helpers */
function poly(ctx, pts, close = true) {
  if (!pts || pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}

function tapered(ctx, pts, w0, w1, color, seed = 1) {
  const r = mulberry32(hash('s05tap', seed));
  const left = [], right = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l;
    const t = i / (pts.length - 1);
    const w = lerp(w0, w1, t) * (0.85 + r() * 0.3) * 0.5;
    left.push([p[0] + nx * w, p[1] + ny * w]);
    right.push([p[0] - nx * w, p[1] - ny * w]);
  }
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i][0], left[i][1]);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/* ================================================================== paper */
function leafLayer() {
  return KIT.layer('s05:leaf', W, H, (c) => {
    // silk mount
    const mount = c.createLinearGradient(0, 0, W, H);
    mount.addColorStop(0, '#7d6a45');
    mount.addColorStop(0.4, '#8f7b52');
    mount.addColorStop(1, '#6a593a');
    c.fillStyle = mount;
    c.fillRect(0, 0, W, H);
    const mr = mulberry32(hash('s05mount', 3));
    for (let i = 0; i < 2600; i++) {
      const x = mr() * W, y = mr() * H;
      c.strokeStyle = `rgba(${mr() < 0.5 ? '52,42,26' : '196,176,134'},${(0.02 + mr() * 0.06).toFixed(3)})`;
      c.lineWidth = 0.5 + mr() * 0.9;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 6 + mr() * 48, y + (mr() - 0.5) * 1.4);
      c.stroke();
    }

    // the leaf itself
    const paper = KIT.paper.ricePaper(W, H, { tone: PAPER, seed: 751, fibers: 2200, stains: 12, deckle: 1, edgeBurn: 0.3 });
    const ix = 34, iy = 30, iw = W - 68, ih = H - 60;
    c.save();
    c.beginPath();
    c.rect(ix, iy, iw, ih);
    c.clip();
    c.drawImage(paper, ix, iy, iw, ih);
    // a paler sheet tone toward the middle
    const g = c.createRadialGradient(W * 0.46, H * 0.5, 120, W * 0.5, H * 0.52, 900);
    g.addColorStop(0, 'rgba(255,250,236,0.22)');
    g.addColorStop(1, 'rgba(120,96,60,0.10)');
    c.fillStyle = g;
    c.fillRect(ix, iy, iw, ih);

    const r = mulberry32(hash('s05leaf', 751));

    // ---- red ledger columns
    const cols = [96, 178, 260, 342, 424, 506];
    c.strokeStyle = 'rgba(157,48,36,0.42)';
    c.lineWidth = 1.6;
    for (const x of cols) {
      c.beginPath(); c.moveTo(x, 210); c.lineTo(x, 962); c.stroke();
    }
    // pale ruled grid
    c.strokeStyle = 'rgba(120,88,52,0.16)';
    c.lineWidth = 1;
    for (let y = 210; y <= 962; y += 68) {
      c.beginPath(); c.moveTo(74, y); c.lineTo(1546, y); c.stroke();
    }
    for (let x = 620; x <= 1540; x += 76) {
      c.beginPath(); c.moveTo(x, 210); c.lineTo(x, 962); c.stroke();
    }
    // heavy top rule
    c.strokeStyle = 'rgba(157,48,36,0.55)';
    c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(74, 206); c.lineTo(1546, 206); c.stroke();
    c.beginPath(); c.moveTo(74, 966); c.lineTo(1546, 966); c.stroke();

    // ---- foxing, water stains, handling
    for (let i = 0; i < 34; i++) {
      const x = r() * W, y = r() * H;
      const rad = 6 + Math.pow(r(), 2) * 120;
      const gg = c.createRadialGradient(x, y, 0, x, y, rad);
      gg.addColorStop(0, `rgba(146,104,54,${(0.03 + r() * 0.07).toFixed(3)})`);
      gg.addColorStop(0.7, `rgba(146,104,54,${(0.01 + r() * 0.03).toFixed(3)})`);
      gg.addColorStop(1, 'rgba(146,104,54,0)');
      c.fillStyle = gg;
      c.beginPath(); c.ellipse(x, y, rad, rad * (0.5 + r() * 0.6), r() * 3, 0, TAU); c.fill();
    }
    for (let i = 0; i < 260; i++) {
      const x = r() * W, y = r() * H;
      c.fillStyle = `rgba(122,84,42,${(0.03 + r() * 0.12).toFixed(3)})`;
      c.beginPath(); c.arc(x, y, 0.5 + r() * 1.8, 0, TAU); c.fill();
    }

    // ---- insect holes at the edges (they multiply in bar 3)
    const holes = [];
    for (let i = 0; i < 90; i++) {
      const edge = i % 4;
      const t = r();
      let x, y;
      if (edge === 0) { x = lerp(ix, ix + iw, t); y = iy + r() * 46; }
      else if (edge === 1) { x = lerp(ix, ix + iw, t); y = iy + ih - r() * 52; }
      else if (edge === 2) { x = ix + r() * 54; y = lerp(iy, iy + ih, t); }
      else { x = ix + iw - r() * 60; y = lerp(iy, iy + ih, t); }
      const rad = 0.8 + Math.pow(r(), 2) * 6.5;
      holes.push([x, y, rad]);
      c.fillStyle = `rgba(46,32,18,${(0.35 + r() * 0.55).toFixed(3)})`;
      c.beginPath(); c.arc(x, y, rad, 0, TAU); c.fill();
      c.strokeStyle = `rgba(122,84,42,${(0.1 + r() * 0.2).toFixed(3)})`;
      c.lineWidth = 0.8;
      c.beginPath(); c.arc(x, y, rad + 1.4 + r() * 2.4, 0, TAU); c.stroke();
      if (r() < 0.3) {
        c.strokeStyle = `rgba(96,66,34,${(0.08 + r() * 0.16).toFixed(3)})`;
        c.lineWidth = 0.6;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + (r() - 0.5) * 22, y + (r() - 0.5) * 16);
        c.stroke();
      }
    }
    c.restore();

    // album-leaf frame (double rule + silk joint)
    c.strokeStyle = 'rgba(72,54,30,0.6)';
    c.lineWidth = 2;
    c.strokeRect(ix + 0.5, iy + 0.5, iw - 1, ih - 1);
    c.strokeStyle = 'rgba(72,54,30,0.24)';
    c.lineWidth = 1;
    c.strokeRect(ix + 7.5, iy + 7.5, iw - 15, ih - 15);
    // the leaf's shadow on the mount
    c.save();
    c.shadowColor = 'rgba(30,20,10,0.45)';
    c.shadowBlur = 16;
    c.shadowOffsetY = 3;
    c.strokeStyle = 'rgba(0,0,0,0.01)';
    c.strokeRect(ix, iy, iw, ih);
    c.restore();
    // scorched edge burns in during bar 3 — draw a static base
    const burn = c.createLinearGradient(W - 260, 0, W - 34, 0);
    burn.addColorStop(0, 'rgba(70,34,10,0)');
    burn.addColorStop(0.72, 'rgba(84,38,12,0.12)');
    burn.addColorStop(1, 'rgba(48,22,8,0.30)');
    c.fillStyle = burn;
    c.fillRect(W - 260, 0, 226, H);
  });
}

/* ============================================================ counting rods */
function drawRod(ctx, x, y, len, vertical, color, alpha, seed) {
  const r = mulberry32(hash('s05rod', seed));
  ctx.save();
  ctx.globalAlpha = alpha;
  if (vertical) {
    tapered(ctx, [[x, y - len / 2], [x + (r() - 0.5) * 1.4, y + len / 2]], 3.4, 3.0, color, seed);
  } else {
    tapered(ctx, [[x - len / 2, y], [x + len / 2, y + (r() - 0.5) * 1.4]], 3.4, 3.0, color, seed);
  }
  ctx.restore();
}

/** Chinese counting rods: units vertical, tens horizontal, hundreds vertical… */
function drawRods(ctx, n, cx, cy, opts = {}) {
  const color = opts.color || INK;
  const alpha = opts.alpha ?? 0.92;
  const unit = opts.unit ?? 13;
  const gap = opts.gap ?? 5.2;
  const digits = String(Math.max(0, Math.floor(n)));
  const step = opts.step ?? (unit + 9);
  const startX = cx + ((digits.length - 1) / 2) * step;
  for (let k = 0; k < digits.length; k++) {
    const d = +digits[digits.length - 1 - k];
    if (d === 0) continue;
    const vertical = k % 2 === 0;
    const px = startX - k * step;
    let rods = [];
    if (d <= 5) {
      for (let i = 0; i < d; i++) rods.push({ vertical, off: (i - (d - 1) / 2) * gap });
    } else {
      rods.push({ vertical: !vertical, off: -(5 - 0.5) * gap * 0.6 });
      for (let i = 0; i < d - 5; i++) rods.push({ vertical, off: (i - (d - 6) / 2) * gap + gap });
    }
    for (let i = 0; i < rods.length; i++) {
      const rd = rods[i];
      const x = vertical ? px + rd.off : px;
      const y = vertical ? cy : cy + rd.off;
      drawRod(ctx, x, y, unit * (rd.vertical ? 1 : 1.18), rd.vertical, color, alpha, k * 17 + i);
    }
  }
}

/* ================================================================ donkey */
/**
 * A thin donkey whose spine bends under a load.
 * sag: 0 (free) … 1 (crushed by the ten characters).
 */
function drawDonkey(ctx, cx, gy, s, phase, sag, u) {
  ctx.save();
  ctx.translate(cx, gy);
  ctx.scale(s, s);
  const bob = Math.sin(phase * 2) * 1.6;
  const sway = Math.sin(phase) * 2.2;
  const S = sag;
  const bodyY = -150 + S * 16;

  // ---- spine: from the withers to the croup, bowed by the load
  const spine = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const x = lerp(52, -78, t);
    const y = bodyY - Math.sin(Math.PI * t) * 8 + S * 30 * Math.sin(Math.PI * t) + bob;
    spine.push([x, y]);
  }
  // ---- belly
  const belly = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const x = lerp(46, -72, t);
    const y = bodyY + 44 + Math.sin(Math.PI * t) * 12 + S * 12 * Math.sin(Math.PI * t) + bob;
    belly.push([x, y]);
  }
  const outline = [...spine, ...belly.slice().reverse()];
  poly(ctx, outline, true);
  const bodyGrad = ctx.createLinearGradient(0, bodyY - 12, 0, bodyY + 52);
  bodyGrad.addColorStop(0, 'rgba(108,92,68,0.72)');
  bodyGrad.addColorStop(0.55, 'rgba(139,121,94,0.58)');
  bodyGrad.addColorStop(1, 'rgba(170,151,120,0.46)');
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.8;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // rib lines
  ctx.save();
  poly(ctx, outline, true);
  ctx.clip();
  const rr = mulberry32(hash('s05rib', 5));
  for (let k = 0; k < 7; k++) {
    const bx = 44 - k * 17;
    ctx.strokeStyle = `rgba(51,40,26,${(0.1 + rr() * 0.14).toFixed(3)})`;
    ctx.lineWidth = 1.2 + rr() * 0.8;
    ctx.beginPath();
    ctx.moveTo(bx, bodyY - 2);
    ctx.quadraticCurveTo(bx + 9, bodyY + 26, bx - 2, bodyY + 46);
    ctx.stroke();
  }
  ctx.restore();

  // ---- legs (thin, compressed by the load)
  const legPairs = [
    { x: 34, ph: phase, near: false },
    { x: 18, ph: phase + Math.PI * 0.9, near: true },
    { x: -58, ph: phase + Math.PI * 0.5, near: false },
    { x: -44, ph: phase + Math.PI * 1.4, near: true },
  ];
  for (const lg of legPairs) {
    const swing = Math.sin(lg.ph) * 20;
    const lift = Math.max(0, Math.cos(lg.ph)) * 9;
    const hip = [lg.x, bodyY + 34 + S * 8];
    const knee = [lg.x + swing * 0.7, -74 + S * 12 + lift * 0.4];
    const ankle = [lg.x + swing, -12 - lift];
    const foot = [lg.x + swing + 9, -3 - lift];
    tapered(ctx, [hip, knee, ankle], lg.near ? 7.5 : 5.5, 3.4,
      lg.near ? INK : 'rgba(51,40,26,0.5)', lg.x + 30);
    ctx.fillStyle = lg.near ? INK : 'rgba(51,40,26,0.5)';
    ctx.beginPath();
    ctx.ellipse(foot[0] - 2, foot[1], 7, 2.6, 0, 0, TAU);
    ctx.fill();
  }

  // ---- neck + head, lowered by the load
  const neckBase = spine[0];
  const headX = neckBase[0] + 46 + S * 10;
  const headY = neckBase[1] - 26 + S * 26 + bob;
  ctx.beginPath();
  ctx.moveTo(neckBase[0] - 2, neckBase[1] - 12);
  ctx.quadraticCurveTo(neckBase[0] + 26, neckBase[1] - 34 + S * 16, headX - 6, headY + 4);
  ctx.lineTo(headX + 4, headY + 16);
  ctx.quadraticCurveTo(neckBase[0] + 22, neckBase[1] - 2 + S * 20, neckBase[0] - 4, neckBase[1] + 16);
  ctx.closePath();
  ctx.fillStyle = 'rgba(150,132,104,0.34)';
  ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke();
  // head
  ctx.beginPath();
  ctx.moveTo(headX - 8, headY + 2);
  ctx.quadraticCurveTo(headX + 16, headY - 4, headX + 30, headY + 12);
  ctx.quadraticCurveTo(headX + 34, headY + 24, headX + 22, headY + 26);
  ctx.quadraticCurveTo(headX + 2, headY + 26, headX - 8, headY + 18);
  ctx.closePath();
  ctx.fillStyle = 'rgba(150,132,104,0.4)';
  ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke();
  // long ears
  tapered(ctx, [[headX - 2, headY + 2], [headX - 14, headY - 40]], 5, 1.6, INK, 11);
  tapered(ctx, [[headX + 6, headY + 1], [headX + 2, headY - 44]], 5, 1.6, INK, 12);
  // eye + muzzle
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(headX + 9, headY + 10, 1.8, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(headX + 29, headY + 16, 1.4, 0, TAU); ctx.fill();
  // tail
  const tailPts = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    tailPts.push([spine[10][0] - t * 16 - Math.sin(t * 2 + u) * 5, spine[10][1] + 6 + t * 62]);
  }
  tapered(ctx, tailPts, 8, 1.4, INK, 13);

  // ---- the pack: a rolled bedroll + a book bundle
  ctx.save();
  ctx.translate(-16, bodyY - 6 + S * 20 + bob);
  ctx.rotate(-0.06 + sway * 0.004);
  ctx.fillStyle = 'rgba(168,132,88,0.55)';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(-44, -20, 88, 26, 12) : ctx.rect(-44, -20, 88, 26);
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-30, 4); ctx.lineTo(-24, 22); ctx.lineTo(20, 22); ctx.lineTo(28, 4);
  ctx.fillStyle = 'rgba(210,192,158,0.6)';
  ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.restore();
  return { spine };
}

/* ============================================================== the rider */
function drawRider(ctx, x, y, s, u, sag) {
  const P = KIT.rig.pose({
    t: u, phase: (u / 1.0) * TAU, mode: 'ride', mount: 'donkey',
    wind: 0.2, lean: 0.12 + sag * 0.16, look: 0.2, beard: 0.55, staff: false,
  });
  const pos = KIT.rig.placed(P, { x, y, scale: s });
  const parts = KIT.rig.rigParts(pos);
  // robe wash
  ctx.save();
  for (const p of parts) {
    if (p.role !== 'body' && p.role !== 'sleeve-near' && p.role !== 'sleeve-far') continue;
    if (p.kind !== 'poly') continue;
    poly(ctx, p.pts, true);
    ctx.fillStyle = 'rgba(219,209,187,0.96)';
    ctx.fill();
  }
  ctx.restore();
  for (const p of parts) {
    if (p.role === 'mount') continue;
    if (p.kind === 'poly') {
      poly(ctx, p.pts, p.closed !== false);
      ctx.strokeStyle = p.role === 'detail' ? 'rgba(51,40,26,0.5)' : INK;
      ctx.lineWidth = p.role === 'detail' ? 1.2 : 2.2;
      ctx.lineJoin = 'round';
      ctx.stroke();
    } else if (p.kind === 'line') {
      ctx.beginPath();
      ctx.moveTo(p.pts[0][0], p.pts[0][1]);
      for (let i = 1; i < p.pts.length; i++) ctx.lineTo(p.pts[i][0], p.pts[i][1]);
      ctx.strokeStyle = p.role === 'detail' ? 'rgba(51,40,26,0.45)' : INK;
      ctx.lineWidth = Math.max(1.1, Math.min(5, (p.width || 2) * 0.34));
      ctx.lineCap = 'round';
      ctx.stroke();
    } else if (p.kind === 'circle' || p.kind === 'ellipse') {
      ctx.beginPath();
      if (p.kind === 'circle') ctx.arc(p.c[0], p.c[1], p.r, 0, TAU);
      else ctx.ellipse(p.c[0], p.c[1], p.rx, p.ry, 0, 0, TAU);
      ctx.fillStyle = 'rgba(240,232,212,0.9)';
      ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
    } else if (p.kind === 'dot') {
      ctx.beginPath(); ctx.arc(p.c[0], p.c[1], p.r * 1.5, 0, TAU);
      ctx.fillStyle = INK; ctx.fill();
    }
  }
  return pos;
}

/* ================================================================== rain */
const DROPS = [];
function initRain() {
  if (DROPS.length) return;
  const r = mulberry32(hash('s05rain', 47));
  for (let i = 0; i < 460; i++) {
    DROPS.push({
      x: r(), y: r(), depth: 0.2 + Math.pow(r(), 1.6) * 1.1,
      len: 14 + r() * 54, w: 0.7 + r() * 2.2, sp: 0.55 + r() * 0.9, ph: r() * TAU,
    });
  }
}
function drawRain(ctx, u, alpha) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (const d of DROPS) {
    const t = u * (420 + d.depth * 620) * d.sp;
    const x = ((d.x * (W + 700) + t) % (W + 700)) - 340;
    const y = ((d.y * (H + 300) + t * 0.86) % (H + 300)) - 150;
    const a = alpha * (0.1 + d.depth * 0.4);
    ctx.strokeStyle = `rgba(${Math.round(lerp(120, 78, d.depth))},${Math.round(lerp(128, 88, d.depth))},${Math.round(lerp(120, 84, d.depth))},${a.toFixed(3)})`;
    ctx.lineWidth = d.w * (0.6 + d.depth * 0.8);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - d.len * 0.30, y - d.len);
    ctx.stroke();
  }
  ctx.restore();
}

/* ============================================================== stamps */
function drawStamps(ctx, u) {
  const list = [
    { t: 0.55, text: '落第', x: 300, y: 300, w: 92 },
    { t: 1.55, text: '干谒', x: 300, y: 480, w: 92 },
    { t: 2.55, text: '不报', x: 300, y: 660, w: 92 },
    { t: 3.6, text: '落第', x: 380, y: 828, w: 76 },
  ];
  for (const s of list) {
    const dt = u - s.t;
    if (dt < 0) continue;
    const drop = clamp01(dt / 0.22);
    const y = s.y - (1 - easeInBack(drop)) * 90;
    const a = clamp01(dt / 0.08);
    ctx.save();
    ctx.globalAlpha = a * 0.94;
    KIT.ink.sealStamp(ctx, s.x - s.w / 2, y - s.w / 2, s.w, s.text, {
      seed: 40 + Math.round(s.t * 10), color: '#9d3024', rotate: (hash('s05stamp', s.t) % 100 - 50) / 1600,
      vertical: true, h: s.w * 1.02,
    });
    ctx.restore();
  }
}

/* ============================================================== ledger */
function dayCount(u) {
  const p = clamp01((u - 0.15) / 2.35);
  const e = easeInOut(p);
  return Math.round(1 + 3649 * e);
}

function drawLedger(ctx, u) {
  const day = dayCount(u);
  const dayText = String(day).padStart(4, '0');
  // column heads
  ctx.save();
  ctx.globalAlpha = 0.9;
  const heads = [
    { x: 137, zh: '日', en: 'DAYS' },
    { x: 219, zh: '谒', en: 'CALLS' },
    { x: 301, zh: '米', en: 'RICE' },
    { x: 383, zh: '钱', en: 'CASH' },
    { x: 465, zh: '薪', en: 'FUEL' },
  ];
  for (const h of heads) {
    KIT.drawText(ctx, h.zh, h.x, 236, {
      size: 26, font: KIT.FONT.display, weight: 700, color: 'rgba(51,40,26,0.9)', align: 'center',
    });
    KIT.drawText(ctx, h.en, h.x, 260, {
      size: 10, font: KIT.FONT.mono, weight: 500, color: 'rgba(122,84,42,0.72)', align: 'center', letterSpacing: 1.4,
    });
  }
  ctx.restore();

  // rods
  drawRods(ctx, day, 137, 330, { unit: 15, step: 22 });
  drawRods(ctx, Math.round(day * 0.06) + 7, 219, 330, { unit: 13, step: 20, alpha: 0.8 });
  drawRods(ctx, Math.max(1, Math.round(day / 900)), 301, 330, { unit: 13, step: 20, alpha: 0.8 });
  drawRods(ctx, Math.round(day * 0.03) + 3, 383, 330, { unit: 13, step: 20, alpha: 0.8 });
  drawRods(ctx, Math.max(1, Math.round(day / 1400)), 465, 330, { unit: 13, step: 20, alpha: 0.8 });

  // rows of entries with rods
  const r = mulberry32(hash('s05entries', 9));
  for (let row = 0; row < 6; row++) {
    const y = 420 + row * 78;
    for (let col = 0; col < 5; col++) {
      const n = 3 + Math.floor(r() * 42);
      drawRods(ctx, n, 137 + col * 82, y, { unit: 9, step: 13, alpha: 0.42, gap: 4 });
    }
  }

  // the big day counter
  ctx.save();
  ctx.globalAlpha = 0.94;
  KIT.drawText(ctx, 'Day ' + dayText, 88, 762, {
    size: 46, font: KIT.FONT.mono, weight: 600, color: 'rgba(51,40,26,0.94)', letterSpacing: 1.2,
  });
  ctx.fillStyle = 'rgba(157,48,36,0.8)';
  ctx.fillRect(88, 786, 260, 2);
  KIT.drawText(ctx, '长安 · 客舍簿', 88, 812, {
    size: 22, font: KIT.FONT.display, weight: 500, color: 'rgba(51,40,26,0.72)', letterSpacing: 3,
  });
  KIT.drawText(ctx, 'REJECTIONS 37  ·  AUDIENCES 0', 88, 842, {
    size: 11, font: KIT.FONT.mono, weight: 500, color: 'rgba(122,84,42,0.66)', letterSpacing: 1.6,
  });
  ctx.restore();
}

/* ============================================================== captions */
const CAPTION = '困守长安十年，他在权贵的酒席边写讨好诗';
const WEIGHTS = '朝扣富儿门，残杯与冷炙';

function drawCaption(ctx, u) {
  const dt = u - 2.0;
  if (dt < 0) return;
  const drop = clamp01(dt / 0.16);
  const y = lerp(96, 206, easeOut(drop));
  const a = clamp01(dt / 0.06);
  ctx.save();
  ctx.globalAlpha = a;
  // a clean paper slip pressed onto the leaf
  ctx.save();
  ctx.shadowColor = 'rgba(40,26,12,0.35)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = 'rgba(250,246,234,0.98)';
  ctx.fillRect(556, y, 1004, 96);
  ctx.restore();
  ctx.strokeStyle = 'rgba(122,84,42,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(556.5, y + 0.5, 1003, 95);
  ctx.fillStyle = RED;
  ctx.fillRect(556, y, 5, 96);
  KIT.drawText(ctx, CAPTION, 584, y + 44, {
    size: 38, font: KIT.FONT.display, weight: 600, color: '#241d13', letterSpacing: 1.2,
  });
  KIT.drawText(ctx, 'VERNACULAR RECORD  ·  751  ·  CHANG’AN', 584, y + 74, {
    size: 12, font: KIT.FONT.mono, weight: 500, color: 'rgba(122,84,42,0.8)', letterSpacing: 2.2,
  });
  ctx.restore();
}

/** The ten characters, dropping onto the donkey's back as physical blocks. */
function drawWeights(ctx, u, donX = 1010, groundY = 900) {
  const chars = [...WEIGHTS];
  const spacing = 52;
  const startX = donX - ((chars.length - 1) * spacing) / 2;
  const baseY = groundY - 158;
  const r = mulberry32(hash('s05w', 5));
  // a dark harness / load shadow physically connects the row to the animal
  ctx.save();
  ctx.globalAlpha = u >= 2.15 ? 0.36 : 0.12;
  ctx.strokeStyle = 'rgba(51,36,20,0.8)';
  ctx.lineWidth = 3;
  for (const ex of [startX - 26, startX + (chars.length - 1) * spacing + 26]) {
    ctx.beginPath();
    ctx.moveTo(ex, baseY - 18);
    ctx.quadraticCurveTo(ex + (ex < donX ? 8 : -8), baseY + 40, donX + (ex < donX ? -58 : 58), baseY + 48);
    ctx.stroke();
  }
  ctx.restore();
  for (let i = 0; i < chars.length; i++) {
    const t0 = 2.02 + i * 0.07;
    const dt = u - t0;
    if (dt < 0) continue;
    const drop = clamp01(dt / 0.26);
    const fall = easeInBack(drop);
    const x = startX + i * spacing;
    const y = lerp(baseY - 240, baseY, fall) - (1 - fall) * 20;
    if (y < -80) continue;
    const press = clamp01((u - 2.3) * 1.6);
    ctx.save();
    ctx.translate(x, y - 20);
    ctx.rotate((r() - 0.5) * 0.06 * (1 - drop));
    // cast shadow onto the paper
    ctx.save();
    ctx.globalAlpha = 0.22 * drop;
    ctx.fillStyle = 'rgba(40,26,12,1)';
    ctx.fillRect(-22 + 5, -22 + 7, 44, 46);
    ctx.restore();
    // ink block
    const g = ctx.createLinearGradient(-22, -24, 22, 24);
    g.addColorStop(0, 'rgba(38,29,19,0.96)');
    g.addColorStop(1, 'rgba(26,19,12,0.98)');
    ctx.fillStyle = g;
    ctx.fillRect(-22, -24, 44, 46);
    // paper-coloured character cut into the block
    KIT.drawText(ctx, chars[i], 0, -1, {
      size: 38, font: KIT.FONT.display, weight: 700, color: '#f0e7cf', align: 'center',
    });
    // chipped edge
    ctx.globalCompositeOperation = 'destination-out';
    for (let k = 0; k < 5; k++) {
      const px = -22 + r() * 44, py = -24 + r() * 46;
      ctx.beginPath(); ctx.arc(px, py, 0.6 + r() * 1.6, 0, TAU); ctx.fill();
    }
    ctx.restore();
    void press;
  }
}

/* ================================================================ render */
export function renderAt(ctx, u, beat, env = {}) {
  initRain();
  const leaf = leafLayer();

  const sag = smoothstep(2.15, 2.7, u) * (0.72 + 0.28 * (1 - smoothstep(4.0, 4.8, u)));
  const exit = smoothstep(4.55, 6.0, u);
  const donX = lerp(1010, 2110, easeInOut(exit)) + Math.sin(u * 0.8) * 6;
  const donY = GROUND;

  ctx.save();
  const shake = u > 2.0 ? Math.exp(-(u - 2.0) * 7) : 0;
  ctx.translate(Math.sin((u - 2.0) * 88) * 6 * shake, Math.cos((u - 2.0) * 64) * 4 * shake);

  ctx.drawImage(leaf, -4, -4, W + 8, H + 8);

  // wet paper darkening where the rain lands
  const wet = ctx.createLinearGradient(0, 700, 0, H);
  wet.addColorStop(0, 'rgba(142,149,140,0)');
  wet.addColorStop(0.55, 'rgba(142,149,140,0.10)');
  wet.addColorStop(1, 'rgba(120,126,118,0.16)');
  ctx.fillStyle = wet;
  ctx.fillRect(0, 700, W, H - 700);

  // background rain (behind everything)
  drawRain(ctx, u, 0.5);

  // ---- ledger
  drawLedger(ctx, u);
  drawStamps(ctx, u);

  // A fainter continuation of the accounting book keeps the right-hand page
  // from becoming a dead sheet, without competing with the animal.
  ctx.save();
  ctx.globalAlpha = 0.26;
  const er = mulberry32(hash('s05echo', 7));
  for (let col = 0; col < 3; col++) {
    const x = 1110 + col * 128;
    ctx.strokeStyle = 'rgba(157,48,36,0.24)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, 300); ctx.lineTo(x, 760); ctx.stroke();
    for (let row = 0; row < 10; row++) {
      const y = 340 + row * 38;
      const n = 1 + Math.floor(er() * 5);
      for (let k = 0; k < n; k++) {
        ctx.strokeStyle = `rgba(51,40,26,${(0.10 + er() * 0.12).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x - 12 + k * 5, y); ctx.lineTo(x - 12 + k * 5, y + 4 + er() * 10); ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 0.065;
  KIT.drawText(ctx, '十年', 1510, 520, {
    size: 188, font: KIT.FONT.display, weight: 800, color: '#3d2b19', align: 'center', letterSpacing: 10,
  });
  ctx.restore();

  // ---- a cast shadow anchors the animal to the album leaf
  ctx.save();
  const shadow = ctx.createRadialGradient(donX, GROUND - 2, 10, donX, GROUND - 2, 250);
  shadow.addColorStop(0, 'rgba(40,26,12,0.25)');
  shadow.addColorStop(1, 'rgba(40,26,12,0)');
  ctx.fillStyle = shadow;
  ctx.beginPath(); ctx.ellipse(donX, GROUND - 2, 250, 26, 0, 0, TAU); ctx.fill();
  ctx.restore();

  // ---- donkey + rider
  drawDonkey(ctx, donX, donY, 1.12, (u / 1.0) * TAU, sag, u);
  drawRider(ctx, donX - 26, donY - 52 + sag * 16, 0.64, u, sag);

  // ---- the ten characters, physically riding the animal
  drawWeights(ctx, u, donX, donY);

  // ---- caption
  drawCaption(ctx, u);

  // ---- foreground rain
  drawRain(ctx, u + 0.4, 0.32);

  // ---- scorched edge in bar 3
  const burn = smoothstep(4.05, 5.5, u);
  if (burn > 0.01) {
    ctx.save();
    const bg = ctx.createLinearGradient(W - 40 - burn * 300, 0, W - 30, 0);
    bg.addColorStop(0, 'rgba(70,32,10,0)');
    bg.addColorStop(0.62, `rgba(96,42,12,${(0.30 * burn).toFixed(3)})`);
    bg.addColorStop(0.9, `rgba(52,22,8,${(0.66 * burn).toFixed(3)})`);
    bg.addColorStop(1, `rgba(22,10,4,${(0.9 * burn).toFixed(3)})`);
    ctx.fillStyle = bg;
    ctx.fillRect(W - 40 - burn * 300, 0, 340 + burn * 300, H);
    // charred scallops on the edge
    const br = mulberry32(hash('s05burn', 3));
    ctx.beginPath();
    ctx.moveTo(W - 40, 0);
    for (let y = 0; y <= H; y += 18) {
      const x = W - 40 - burn * 60 - Math.sin(y * 0.03 + u) * 18 * burn - br() * 26 * burn;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W + 20, H);
    ctx.lineTo(W + 20, 0);
    ctx.closePath();
    ctx.fillStyle = `rgba(26,12,5,${(0.86 * burn).toFixed(3)})`;
    ctx.fill();
    // embers
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40 * burn; i++) {
      const y = (br() * H + u * 40) % H;
      const x = W - 70 - br() * 190 * burn;
      ctx.fillStyle = `rgba(236,132,44,${(0.25 + br() * 0.55) * burn})`;
      ctx.fillRect(x, y, 1.6 + br() * 3, 1.6 + br() * 2);
    }
    ctx.restore();
  }

  // ---- the date seal
  const sealP = smoothstep(0.9, 1.5, u);
  ctx.save();
  ctx.globalAlpha = sealP * 0.92;
  KIT.ink.sealStamp(ctx, 1470, 706, 104, '天宝十载', {
    seed: 71, color: '#9d3024', rotate: 0.04, vertical: false, h: 66,
  });
  ctx.restore();

  // ---- small album-leaf label
  ctx.save();
  ctx.globalAlpha = smoothstep(0.5, 1.2, u) * 0.86;
  KIT.drawText(ctx, '宋人尺页 · 客舍簿', 1546, 992, {
    size: 22, font: KIT.FONT.display, weight: 500, color: 'rgba(51,40,26,0.72)', align: 'right', letterSpacing: 3,
  });
  KIT.drawText(ctx, 'ALBUM LEAF  ·  COUNTING RODS  ·  751', 1546, 1018, {
    size: 11, font: KIT.FONT.mono, weight: 500, color: 'rgba(122,84,42,0.66)', align: 'right', letterSpacing: 1.8,
  });
  ctx.restore();

  // grain
  const grain = KIT.layer('s05:grain', 480, 270, (c) => KIT.grainLayer(480, 270, 21, { amp: 0.10 }));
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.15;
  ctx.drawImage(grain, 0, 0, W, H);
  ctx.restore();
  ctx.restore();

  // QA marks
  if (u >= 2.12) {
    markText('s05-caption', CAPTION, 584, 216, 960, 60, { size: 38, align: 'left', color: '#241d13' });
  }
  if (u >= 2.4) {
    markText('s05-weights', WEIGHTS, 776, 676, 560, 72, { size: 38, align: 'left', color: '#f0e7cf' });
  }
  void beat; void env;
}

export default { renderAt };
