/**
 * 14 · Matter.js 刚体坍塌 · 跨时空叩问 / Pre-Baked Rigid-Body Collapse · modern black
 *
 * A black gallery, almost empty. Three heavy typographic slabs hang from cables.
 * On the bar-2 downbeat the locks release and the pre-baked Matter.js bodies
 * (src/generated/collapse.js, 64 glyphs × 240 frames) fall, collide and settle
 * into a rubble pile of readable characters. Two rough red rings scrawl around
 * the pile, the annotation 失意者 / ——世人眼中的废物 surfaces, and the film asks:
 * 「你还肯为这个人间，流一滴眼泪吗？」
 *
 * No live physics: every position/angle is read from the baked data and
 * interpolated. All decorative randomness is seeded.
 */
import KIT from '../kit/index.js';
import {
  clamp01, lerp, smoothstep, hash, unit, mulberry32, TAU,
} from '../kit/math.js';
import { markText } from '../kit/debug.js';
import { COLLAPSE } from '../generated/collapse.js';

const W = 1920, H = 1080;
const BONE = '#f1e6cf';
const RED = '#a52a22';
const DEEP = '#5b1114';

const SHIFT_Y = 36;                     // clears the era card, keeps the pile inside frame
const SHIFT_X = 100;                    // the baked hold rows start under the card otherwise
const FLOOR = COLLAPSE.floorY + SHIFT_Y; // 1050
const RELEASE = 2.0;
const FLY = 2.15;                       // 240 baked frames over 2.15 s
const FRAMES = COLLAPSE.frames;
const BODIES = COLLAPSE.bodies;

const RING = { cx: 1095, cy: 748, rx: 336, ry: 158 };
const TEAR_X = 1520;

/** Horizontal framing: the baked field is nudged off the era card, and the far
 *  right of the pile is gently compressed so no sentence exits the frame. */
function mapX(x) {
  const v = x + SHIFT_X;
  return v > 1620 ? 1620 + (v - 1620) * 0.55 : v;
}

let S = null;

/* --------------------------------------------------------------- geometry */
function frameAt(fRaw) {
  const i0 = Math.max(0, Math.min(FRAMES - 1, Math.floor(fRaw)));
  const i1 = Math.min(FRAMES - 1, i0 + 1);
  return { i0, i1, t: Math.max(0, Math.min(1, fRaw - i0)) };
}

function sampleBody(i, fRaw) {
  const b = BODIES[i];
  const { i0, i1, t } = frameAt(fRaw);
  const p0 = b.path[i0];
  const p1 = b.path[i1];
  return {
    x: mapX(p0[0] + (p1[0] - p0[0]) * t),
    y: p0[1] + (p1[1] - p0[1]) * t + SHIFT_Y,
    a: p0[2] + (p1[2] - p0[2]) * t,
  };
}

function makeGlyph(b) {
  const pad = Math.max(12, b.size * 0.22);
  const w = Math.ceil(b.w + pad * 2);
  const h = Math.ceil(b.h + pad * 2);
  const c = KIT.makeCanvas(w, h);
  const x = c.getContext('2d');
  x.font = `600 ${b.size}px ${KIT.FONT.display}`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillStyle = b.red ? '#c8412f' : BONE;
  // if the measured text is wider than the physics box, keep it in frame
  const tw = x.measureText(b.text).width;
  const scale = Math.min(1, (w - 8) / Math.max(1, tw));
  x.translate(w / 2, h / 2);
  x.scale(scale, 1);
  x.fillText(b.text, 0, 0);
  // a whisper of warm bloom keeps the type from sitting flat on the black
  x.globalCompositeOperation = 'lighter';
  x.globalAlpha = 0.22;
  x.fillText(b.text, -1.2, -1);
  return { c, w, h };
}

function paintBg(c) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#080706');
  g.addColorStop(0.5, '#0a0908');
  g.addColorStop(1, '#030303');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);

  // the only light in the room: a soft warm gallery spot
  const rl = c.createRadialGradient(980, 280, 30, 980, 300, 1010);
  rl.addColorStop(0, 'rgba(241,230,207,0.085)');
  rl.addColorStop(0.4, 'rgba(241,230,207,0.028)');
  rl.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = rl;
  c.fillRect(0, 0, W, H);

  // concrete mottle
  const cloud = KIT.cloudLayer(480, 270, 1414, {
    tint: '#8d8375', alpha: 0.5, octaves: 5, smallW: 96, smallH: 54,
  });
  c.save();
  c.globalCompositeOperation = 'screen';
  c.globalAlpha = 0.05;
  c.drawImage(cloud, 0, 0, W, H);
  c.restore();

  // floor sheen, so contact shadows have something to bite into
  const fg = c.createLinearGradient(0, FLOOR - 190, 0, H);
  fg.addColorStop(0, 'rgba(241,230,207,0)');
  fg.addColorStop(0.62, 'rgba(241,230,207,0.030)');
  fg.addColorStop(1, 'rgba(241,230,207,0.010)');
  c.fillStyle = fg;
  c.fillRect(0, FLOOR - 190, W, H - FLOOR + 190);
  c.fillStyle = 'rgba(241,230,207,0.11)';
  c.fillRect(0, FLOOR, W, 1);
  c.fillStyle = 'rgba(241,230,207,0.04)';
  c.fillRect(0, FLOOR + 4, W, 1);

  // hairline editorial grid
  c.strokeStyle = 'rgba(241,230,207,0.055)';
  c.lineWidth = 1;
  for (const x of [96, 1824]) {
    c.beginPath(); c.moveTo(x + 0.5, 236); c.lineTo(x + 0.5, FLOOR - 24); c.stroke();
  }
  c.strokeStyle = 'rgba(241,230,207,0.075)';
  c.beginPath(); c.moveTo(96, 1010.5); c.lineTo(1824, 1010.5); c.stroke();

  // faint gallery wall seams
  const r = mulberry32(1414);
  for (let i = 0; i < 90; i++) {
    const x = r() * W;
    c.strokeStyle = `rgba(241,230,207,${0.012 + r() * 0.022})`;
    c.lineWidth = 0.6 + r() * 1.2;
    c.beginPath();
    c.moveTo(x, 150 + r() * 200);
    c.lineTo(x + (r() - 0.5) * 8, 900 + r() * 140);
    c.stroke();
  }

  c.drawImage(KIT.vignetteLayer(W, H, { strength: 0.82, inner: 0.22, outer: 0.92 }), 0, 0);
  c.save();
  c.globalCompositeOperation = 'screen';
  c.globalAlpha = 0.05;
  c.drawImage(KIT.grainLayer(480, 270, 1414, { amp: 0.18 }), 0, 0, W, H);
  c.restore();
}

function ensure() {
  if (S) return S;
  const glyphs = BODIES.map(makeGlyph);

  // group the three heavy sentence slabs from the baked hold positions
  const big = [];
  BODIES.forEach((b, i) => { if (b.size >= 60) big.push(i); });
  const rows = [];
  for (const i of big) {
    const y = BODIES[i].path[0][1];
    let row = rows.find((q) => Math.abs(q.y - y) < 6);
    if (!row) { row = { y, items: [] }; rows.push(row); }
    row.items.push(i);
  }
  // a slab is a full sentence row; the loose big glyphs are single-item rows
  const slabs = rows.filter((row) => row.items.length >= 5)
    .sort((a, b) => a.y - b.y)
    .map((row, k) => {
    row.items.sort((a, b) => BODIES[a].path[0][0] - BODIES[b].path[0][0]);
    const first = BODIES[row.items[0]];
    const last = BODIES[row.items[row.items.length - 1]];
    const x0 = mapX(first.path[0][0] - first.w / 2);
    const x1 = mapX(last.path[0][0] + last.w / 2);
    const hh = Math.max(...row.items.map((i) => BODIES[i].h));
    return {
      k,
      items: row.items,
      text: row.items.map((i) => BODIES[i].text).join(''),
      x0, x1,
      top: row.y - hh / 2,
      bottom: row.y + hh / 2,
      cx: (x0 + x1) / 2,
    };
  });

  // first floor contact per body → dust event
  const land = BODIES.map((b) => {
    const th = COLLAPSE.floorY - b.h / 2 - 8;
    for (let f = 1; f < FRAMES; f++) {
      if (b.path[f][1] >= th) return { frame: f, x: mapX(b.path[f][0]), size: b.size };
    }
    return null;
  });

  // draw order: chips behind big slabs, the red 失意者 glyphs last for legibility
  const order = BODIES.map((b, i) => ({ i, s: b.size }))
    .sort((a, b) => b.s - a.s)
    .map((o) => o.i);
  const KEY = new Set(['失', '意', '者']);
  for (const i of order.slice()) {
    if (KEY.has(BODIES[i].text) && BODIES[i].size > 40) {
      order.splice(order.indexOf(i), 1);
      order.push(i);
    }
  }

  const ringSpecks = [];
  {
    const rr = mulberry32(1471);
    for (let i = 0; i < 42; i++) {
      ringSpecks.push({
        a: rr() * TAU, o: 0.5 + rr() * 0.9, l: 2 + rr() * 7, w: 0.6 + rr() * 1.6, al: 0.08 + rr() * 0.3,
      });
    }
  }
  const releaseDust = [];
  {
    const rr = mulberry32(1472);
    for (let i = 0; i < 26; i++) {
      const slab = slabs[i % slabs.length];
      releaseDust.push({
        x: slab.x0 + 30 + rr() * (slab.x1 - slab.x0 - 60),
        y: slab.bottom + SHIFT_Y + 4 + rr() * 10,
        r: 40 + rr() * 90,
        ph: rr() * TAU,
      });
    }
  }
  const dropSpecks = [];
  {
    const rr = mulberry32(1473);
    for (let i = 0; i < 30; i++) {
      dropSpecks.push({ a: rr() * TAU, d: 0.2 + rr() * 1.0, s: 1 + rr() * 2.6 });
    }
  }

  const puff = KIT.layer('scene14:puff', 160, 160, (c) => {
    const g = c.createRadialGradient(80, 80, 1, 80, 80, 78);
    g.addColorStop(0, 'rgba(226,212,186,0.55)');
    g.addColorStop(0.3, 'rgba(206,192,166,0.24)');
    g.addColorStop(0.68, 'rgba(176,162,140,0.08)');
    g.addColorStop(1, 'rgba(150,138,118,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 160, 160);
    const rr = mulberry32(1415);
    for (let i = 0; i < 40; i++) {
      const a = rr() * TAU;
      const d = 18 + rr() * 54;
      c.fillStyle = `rgba(230,216,190,${0.05 + rr() * 0.16})`;
      c.beginPath();
      c.arc(80 + Math.cos(a) * d, 80 + Math.sin(a) * d * 0.7, 1 + rr() * 4, 0, TAU);
      c.fill();
    }
  });

  const shadow = KIT.layer('scene14:contact', 200, 80, (c) => {
    c.save();
    c.translate(100, 40);
    c.scale(1, 0.4);
    c.translate(-100, -40);
    const g = c.createRadialGradient(100, 40, 2, 100, 40, 96);
    g.addColorStop(0, 'rgba(0,0,0,0.78)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.34)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(100, 40, 96, 0, TAU);
    c.fill();
    c.restore();
  });

  const grain = KIT.layer('scene14:grain', 480, 270, (c) => KIT.grainLayer(480, 270, 1414, { amp: 0.1 }));

  // the floor of the gallery: a low warm haze and the first debris that the
  // falling glyphs kick up. Baked once, faded in as the pile forms.
  const ground = KIT.layer('scene14:ground', W, 330, (c) => {
    const hz = c.createLinearGradient(0, 40, 0, 330);
    hz.addColorStop(0, 'rgba(141,131,117,0)');
    hz.addColorStop(0.55, 'rgba(141,131,117,0.045)');
    hz.addColorStop(1, 'rgba(160,148,128,0.10)');
    c.fillStyle = hz;
    c.fillRect(0, 0, W, 330);
    const rr = mulberry32(1462);
    // pebble / slab shards along the floor line
    for (let i = 0; i < 260; i++) {
      const x = rr() * W;
      const y = 208 + Math.pow(rr(), 0.7) * 116;
      const w = 5 + Math.pow(rr(), 2) * 58;
      const h = 2 + rr() * 9;
      const tone = 16 + Math.floor(rr() * 18);
      c.fillStyle = `rgb(${tone + 8},${tone + 6},${tone + 2})`;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + w * 0.2, y - h);
      c.lineTo(x + w, y - h * (0.4 + rr() * 0.6));
      c.lineTo(x + w * 0.86, y + h * 0.5);
      c.lineTo(x + w * 0.1, y + h * 0.36);
      c.closePath();
      c.fill();
      c.fillStyle = `rgba(241,230,207,${0.03 + rr() * 0.1})`;
      c.fillRect(x + w * 0.12, y - h * 0.7, w * 0.7, 0.8);
    }
    // dust settled in the air just above the floor
    for (let i = 0; i < 420; i++) {
      const x = rr() * W;
      const y = 150 + rr() * 170;
      c.fillStyle = `rgba(222,208,184,${(0.02 + rr() * 0.09).toFixed(3)})`;
      c.fillRect(x, y, 0.8 + rr() * 2, 0.8 + rr() * 1.4);
    }
  });

  S = {
    bg: KIT.layer('scene14:bg', W, H, paintBg),
    glyphs, slabs, land, order, ringSpecks, releaseDust, dropSpecks,
    puff, shadow, grain, ground,
  };
  return S;
}

/* --------------------------------------------------------------- drawing */
function drawMeta(ctx, u) {
  const a = smoothstep(0.15, 0.7, u);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a * 0.9;
  const pulse = 0.45 + 0.55 * Math.pow(0.5 + 0.5 * Math.sin(u * TAU / 0.75), 3);
  ctx.fillStyle = `rgba(165,42,34,${0.55 + pulse * 0.4})`;
  ctx.fillRect(96, 205, 7, 7);
  KIT.drawText(ctx, 'CASE 14 / STRUCTURAL FAILURE', 113, 209, {
    size: 11.5, font: KIT.FONT.mono, weight: 600, color: 'rgba(241,230,207,0.52)', letterSpacing: 2.1,
  });
  KIT.drawText(ctx, 'GRAVITY 9.80 · BODIES 64 · FRAMES 240 · PRE-BAKED', 96, 1004, {
    size: 9.5, font: KIT.FONT.mono, weight: 500, color: 'rgba(241,230,207,0.26)', letterSpacing: 1.1,
  });
  KIT.drawText(ctx, '14 / 18', 1824, 209, {
    size: 13, font: KIT.FONT.mono, weight: 500, color: 'rgba(241,230,207,0.5)', align: 'right', letterSpacing: 2.4,
  });
  // a thin off-white rule, broken once
  ctx.strokeStyle = 'rgba(241,230,207,0.20)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(96, 232.5); ctx.lineTo(1002, 232.5);
  ctx.moveTo(1016, 232.5); ctx.lineTo(1824, 232.5);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(165,42,34,0.55)';
  ctx.beginPath(); ctx.moveTo(1002, 232.5); ctx.lineTo(1016, 232.5); ctx.stroke();

  // structural survey: a drop-test rule and its graduations
  const dA = a * (1 - smoothstep(2.0, 3.1, u));
  if (dA > 0.01) {
    ctx.globalAlpha = dA * 0.5;
    ctx.strokeStyle = 'rgba(241,230,207,0.3)';
    ctx.beginPath(); ctx.moveTo(300.5, 205); ctx.lineTo(300.5, FLOOR - 22); ctx.stroke();
    for (let y = 240; y < FLOOR - 22; y += 80) {
      ctx.beginPath(); ctx.moveTo(294, y + 0.5); ctx.lineTo(307, y + 0.5); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(165,42,34,0.9)';
    ctx.fillRect(296, 205, 9, 2);
    ctx.save();
    ctx.translate(282, 560);
    ctx.rotate(-Math.PI / 2);
    KIT.drawText(ctx, 'DROP TEST · 860 MM · LOCKED', 0, 0, {
      size: 9.5, font: KIT.FONT.mono, weight: 600, color: 'rgba(241,230,207,0.42)', letterSpacing: 2.1,
    });
    ctx.restore();
    // a faint horizontal datum at the floor
    ctx.globalAlpha = dA * 0.35;
    ctx.strokeStyle = 'rgba(241,230,207,0.22)';
    ctx.beginPath();
    for (let x = 300; x < 1780; x += 18) { ctx.moveTo(x, FLOOR - 22.5); ctx.lineTo(x + 9, FLOOR - 22.5); }
    ctx.stroke();
  }
  ctx.restore();
}

function cable(ctx, x, topY, bottomY, alpha, whip) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = 'rgba(241,230,207,0.22)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(x, topY);
  const n = 10;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const y = lerp(topY, bottomY, t);
    const bend = whip * Math.sin(t * Math.PI) * (1 - t) * 26;
    ctx.lineTo(x + bend, y);
  }
  ctx.stroke();
  // hook
  ctx.fillStyle = 'rgba(241,230,207,0.32)';
  ctx.fillRect(x - 2.5, bottomY - 3, 5, 3);
  ctx.restore();
}

function drawHang(ctx, u) {
  const { slabs } = ensure();
  const holdA = 1 - smoothstep(RELEASE, RELEASE + 0.1, u);
  const plateA = 1 - smoothstep(RELEASE, RELEASE + 0.17, u);
  const crack = smoothstep(RELEASE, RELEASE + 0.14, u);
  if (holdA > 0.001) {
    for (const slab of slabs) {
      const top = slab.top + SHIFT_Y;
      const bottom = slab.bottom + SHIFT_Y;
      const cw = slab.x1 - slab.x0;
      const lx = slab.cx - cw * 0.34;
      const rx = slab.cx + cw * 0.34;
      const slack = (u < RELEASE ? Math.sin(u * 1.1 + slab.k) * 1.4 : 0);
      cable(ctx, lx, 0, top - 18 + slack, 0.55 * holdA, 0);
      cable(ctx, rx, 0, top - 18 + slack, 0.4 * holdA, 0);
      // faint warm bloom behind the slab
      const rg = ctx.createRadialGradient(slab.cx, (top + bottom) / 2, 20, slab.cx, (top + bottom) / 2, cw * 0.62);
      rg.addColorStop(0, `rgba(241,230,207,${0.036 * holdA})`);
      rg.addColorStop(1, 'rgba(241,230,207,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(slab.x0 - 130, top - 90, cw + 260, (bottom - top) + 190);
    }
  }
  if (plateA > 0.001) {
    for (const slab of slabs) {
      const pad = 24;
      const x = slab.x0 - pad;
      const y = slab.top + SHIFT_Y - 20;
      const w = (slab.x1 - slab.x0) + pad * 2;
      const h = (slab.bottom - slab.top) + 40;
      ctx.save();
      ctx.globalAlpha = plateA;
      // heavy contact shadow
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 54;
      ctx.shadowOffsetY = 30;
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, '#16140f');
      g.addColorStop(0.55, '#0e0c0a');
      g.addColorStop(1, '#080706');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      // bevel
      ctx.fillStyle = 'rgba(241,230,207,0.16)';
      ctx.fillRect(x, y, w, 1.4);
      ctx.fillStyle = 'rgba(241,230,207,0.06)';
      ctx.fillRect(x, y, 1, h);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(x, y + h - 2.5, w, 2.5);
      // matte tooth
      const rr = mulberry32(1400 + slab.k);
      ctx.globalAlpha = plateA * 0.5;
      for (let i = 0; i < 46; i++) {
        ctx.fillStyle = `rgba(241,230,207,${0.008 + rr() * 0.02})`;
        ctx.fillRect(x + rr() * w, y + rr() * h, 6 + rr() * 60, 0.7);
      }
      ctx.globalAlpha = plateA;
      // red spine + index
      ctx.fillStyle = DEEP;
      ctx.fillRect(x, y, 5, h);
      KIT.drawText(ctx, `0${slab.k + 1}`, x + 17, y + 20, {
        size: 10.5, font: KIT.FONT.mono, weight: 600, color: 'rgba(165,42,34,0.85)', letterSpacing: 1.5,
      });
      KIT.drawText(ctx, `${slab.items.length} GLYPHS`, x + w - 17, y + 20, {
        size: 9, font: KIT.FONT.mono, weight: 500, color: 'rgba(241,230,207,0.22)', align: 'right', letterSpacing: 1.2,
      });
      // fracture flash on release
      if (crack > 0 && crack < 1) {
        const rr2 = mulberry32(1420 + slab.k);
        ctx.globalAlpha = (1 - crack) * 0.85;
        ctx.strokeStyle = 'rgba(255,244,220,0.8)';
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 5; i++) {
          let px = x + w * (0.12 + rr2() * 0.76);
          let py = y + 4;
          ctx.beginPath();
          ctx.moveTo(px, py);
          for (let k = 0; k < 4; k++) {
            px += (rr2() - 0.5) * 70;
            py += h / 4;
            ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = (1 - crack) * 0.5;
        ctx.fillStyle = 'rgba(255,246,224,0.4)';
        ctx.fillRect(x, y + h - 6, w, 4);
      }
      ctx.restore();
    }
  }
}

function drawHoldGlyphs(ctx, u) {
  const { glyphs, slabs } = ensure();
  if (u >= RELEASE) return;
  const a = smoothstep(0.1, 0.85, u);
  if (a <= 0) return;
  ctx.save();
  for (const slab of slabs) {
    for (const i of slab.items) {
      const b = BODIES[i];
      const g = glyphs[i];
      ctx.save();
      ctx.translate(mapX(b.path[0][0]), b.path[0][1] + SHIFT_Y);
      ctx.globalAlpha = a * 0.96;
      ctx.drawImage(g.c, -g.w / 2, -g.h / 2, g.w, g.h);
      ctx.restore();
    }
  }
  ctx.restore();
}

/** The loose words suspended around the slabs — drawn behind them. */
function drawSuspendedFragments(ctx, u) {
  const { glyphs, slabs } = ensure();
  if (u >= RELEASE) return;
  const hidden = (b) => {
    const x = mapX(b.path[0][0]);
    const y = b.path[0][1] + SHIFT_Y;
    for (const s of slabs) {
      if (x > s.x0 - 30 && x < s.x1 + 30 && y > s.top + SHIFT_Y - 34 && y < s.bottom + SHIFT_Y + 34) return true;
    }
    return false;
  };
  ctx.save();
  for (let i = 0; i < BODIES.length; i++) {
    const b = BODIES[i];
    if (b.size >= 60 || hidden(b)) continue;
    const g = glyphs[i];
    const appear = smoothstep(0.45 + unit(1421, i) * 0.9, 1.1 + unit(1421, i) * 0.9, u);
    if (appear <= 0) continue;
    ctx.globalAlpha = appear * 0.42;
    ctx.save();
    ctx.translate(mapX(b.path[0][0]), b.path[0][1] + SHIFT_Y + Math.sin(u * 0.7 + i) * 1.5);
    ctx.rotate((unit(1422, i) - 0.5) * 0.04);
    ctx.drawImage(g.c, -g.w / 2, -g.h / 2, g.w, g.h);
    ctx.restore();
  }
  ctx.restore();
}

function drawBodies(ctx, u) {
  const { glyphs, order, shadow, puff, land, releaseDust } = ensure();
  if (u < RELEASE) return;
  const p = clamp01((u - RELEASE) / FLY);
  const fRaw = p * (FRAMES - 1);
  const { i0 } = frameAt(fRaw);
  const settle = smoothstep(0.55, 1, p);
  const burst = Math.exp(-(u - RELEASE) * 5.5);

  // contact shadows + release streaks, behind the bodies
  ctx.save();
  for (let i = 0; i < BODIES.length; i++) {
    const b = BODIES[i];
    const pos = sampleBody(i, fRaw);
    if (pos.y > 470) {
      const above = FLOOR - (pos.y + b.h / 2);
      const k = clamp01(1 - above / 620);
      if (k > 0.01) {
        const sw = b.w * (1.5 + (1 - k) * 1.4);
        ctx.globalAlpha = 0.34 * k;
        ctx.drawImage(shadow, pos.x - sw / 2, FLOOR - 18, sw, 30 + 24 * k);
      }
    }
    if (i0 < 14 && b.size >= 60) {
      const prev = sampleBody(i, Math.max(0, fRaw - 2.4));
      const dx = pos.x - prev.x;
      const dy = pos.y - prev.y;
      if (Math.hypot(dx, dy) > 4) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(241,230,207,${burst * 0.4})`;
        ctx.lineWidth = 1.1 + (b.size > 70 ? 1.2 : 0);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x - dx * 1.9, pos.y - dy * 1.9);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }
  ctx.restore();

  // bodies
  ctx.save();
  for (const i of order) {
    const g = glyphs[i];
    const pos = sampleBody(i, fRaw);
    let a = 1;
    let rot = pos.a;
    let lift = 0;
    if (u > 5.15) {
      // after the tear lands, the fragments lean toward the light
      const lean = smoothstep(5.15, 5.75, u);
      const d = Math.hypot(pos.x - TEAR_X, pos.y - 790);
      const wgt = lean * Math.exp(-d / 360);
      a = 1 + wgt * 0.15;
      rot += wgt * 0.055 * (TEAR_X > pos.x ? 1 : -1);
      lift = wgt * 5;
    }
    ctx.save();
    ctx.translate(pos.x, pos.y - lift);
    ctx.rotate(rot);
    ctx.globalAlpha = Math.min(1, a);
    if (pos.y > 540 && settle > 0.35) {
      ctx.shadowColor = 'rgba(0,0,0,0.92)';
      ctx.shadowBlur = 7;
      ctx.shadowOffsetY = 4;
    }
    ctx.drawImage(g.c, -g.w / 2, -g.h / 2, g.w, g.h);
    ctx.restore();
  }
  ctx.restore();

  // kinetic dust at release
  if (u < RELEASE + 1.15) {
    const t = u - RELEASE;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const d of releaseDust) {
      const ph = clamp01((t - 0.02) / 0.9);
      if (ph <= 0 || ph >= 1) continue;
      const wob = Math.sin(t * 3 + d.ph) * 8 * ph;
      ctx.globalAlpha = (1 - ph) * (1 - ph) * 0.18;
      const r = d.r * (0.26 + ph * 0.95);
      ctx.drawImage(puff, d.x - r + wob, d.y - r * 0.55 + ph * 64, r * 1.9, r * 1.3);
    }
    ctx.restore();
  }

  // landing dust, driven by the baked contact frames
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const e of land) {
    if (!e) continue;
    const tLand = RELEASE + (e.frame / (FRAMES - 1)) * FLY;
    const t = u - tLand;
    if (t < 0 || t > 1.05) continue;
    const ph = t / 1.05;
    const rr = mulberry32(hash('land', e.frame, e.x));
    const r = (e.size * 0.7 + 26) * (0.5 + ph * 1.9);
    ctx.globalAlpha = (1 - ph) * (1 - ph) * 0.34;
    ctx.drawImage(puff, e.x - r, FLOOR - 30 - r * 0.55 + Math.sin(t * 7) * 3, r * 2, r * 1.3);
    ctx.fillStyle = `rgba(241,230,207,${(1 - ph) * 0.5})`;
    for (let k = 0; k < 3; k++) {
      const px = e.x + (rr() - 0.5) * 150 * (0.4 + ph);
      const py = FLOOR - 10 - ph * (30 + rr() * 90);
      ctx.fillRect(px, py, 1 + rr() * 2, 1 + rr() * 2);
    }
  }
  ctx.restore();
}

function drawReleaseFlash(ctx, u) {
  if (u < RELEASE - 0.02 || u > RELEASE + 0.9) return;
  const t = u - RELEASE;
  const { slabs } = ensure();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const f = Math.exp(-t * 16);
  const g = ctx.createLinearGradient(0, 120, 0, 900);
  g.addColorStop(0, 'rgba(241,230,207,0.03)');
  g.addColorStop(0.5, `rgba(241,230,207,${0.09 * f})`);
  g.addColorStop(1, 'rgba(241,230,207,0)');
  ctx.globalAlpha = 0.35 + f * 0.65;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // the locks snap: a hot line at each slab's underside
  ctx.globalAlpha = f * 0.85;
  ctx.fillStyle = 'rgba(255,246,224,0.9)';
  for (const s of slabs) {
    const y = s.bottom + SHIFT_Y;
    ctx.fillRect(s.x0, y - 1, s.x1 - s.x0, 1.5 + f * 2);
  }
  // shockwave on the floor
  const wv = clamp01(t / 0.7);
  if (wv > 0 && wv < 1) {
    ctx.globalAlpha = (1 - wv) * 0.16;
    ctx.strokeStyle = 'rgba(241,230,207,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(W / 2, FLOOR - 6, 200 + wv * 760, 40 + wv * 150, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRings(ctx, u) {
  if (u < 3.16) return;
  const { ringSpecks } = ensure();
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const rings = [
    { cx: RING.cx, cy: RING.cy, rx: RING.rx, ry: RING.ry, seed: 1481, start: 3.16, w: 1, rot: -0.035 },
    { cx: RING.cx + 12, cy: RING.cy + 8, rx: RING.rx + 16, ry: RING.ry + 10, seed: 1482, start: 3.34, w: 0.86, rot: 0.028 },
  ];
  const fade = 1 - smoothstep(5.85, 6.0, u) * 0.35;
  for (const R of rings) {
    const p = smoothstep(R.start, R.start + 0.52, u);
    if (p <= 0) continue;
    const n = 168;
    const drawn = Math.max(3, Math.floor(n * p));
    const pts = [];
    for (let i = 0; i <= drawn; i++) {
      const t = i / n;
      const a = -Math.PI * 0.62 + t * TAU * 1.04;
      const wob = 1
        + 0.036 * Math.sin(a * 3.1 + R.seed * 0.7)
        + 0.022 * Math.sin(a * 7.7 - R.seed)
        + 0.012 * Math.sin(a * 15.3 + 2);
      const x = R.cx + Math.cos(a) * R.rx * wob;
      const y = R.cy + Math.sin(a) * R.ry * wob + Math.sin(a * 2 + 1) * 3;
      pts.push([x, y]);
    }
    const drawPath = (ox, oy) => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0] + ox, pts[0][1] + oy);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] + ox, pts[i][1] + oy);
      ctx.stroke();
    };
    // three pressures of a red grease pencil
    const passes = [
      { w: 11 * R.w, a: 0.085, ox: 0, oy: 0 },
      { w: 4.4 * R.w, a: 0.3, ox: 1.1, oy: -0.8 },
      { w: 1.9 * R.w, a: 0.8, ox: -0.8, oy: 0.9 },
    ];
    for (const q of passes) {
      ctx.globalAlpha = q.a * fade * (0.6 + p * 0.4);
      ctx.strokeStyle = q.w < 2.2 ? '#b2362a' : RED;
      ctx.lineWidth = q.w;
      drawPath(q.ox, q.oy);
    }
    // chalk teeth along the stroke
    ctx.strokeStyle = '#b2362a';
    for (const sp of ringSpecks) {
      if (sp.a > Math.PI * 2 * p) continue;
      const c = Math.cos(sp.a), s = Math.sin(sp.a);
      const x = R.cx + c * R.rx * (sp.o * 0.06 + 0.98);
      const y = R.cy + s * R.ry * 1.01;
      ctx.globalAlpha = sp.al * 0.8 * fade;
      ctx.lineWidth = sp.w;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + c * sp.l * 1.6, y + s * sp.l * 0.55);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawVerdict(ctx, u) {
  const p = smoothstep(3.46, 3.95, u);
  if (p <= 0) return;
  const { cx } = RING;
  const cy = 628;
  ctx.save();
  // a dark breath under the ink so it reads over black-on-black rubble
  const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 230);
  g.addColorStop(0, 'rgba(0,0,0,0.6)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.26)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - 240, cy - 100, 480, 200);

  const ink = clamp01(p * 1.05);
  ctx.globalAlpha = ink;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 4;
  KIT.ink.roughText(ctx, '失意者', cx, cy + 2, {
    size: 58, font: KIT.FONT.brush, weight: 400, color: 'rgba(196,62,48,0.5)', align: 'center', seed: 1431, letterSpacing: 12,
  });
  ctx.restore();
  KIT.ink.roughText(ctx, '失意者', cx, cy, {
    size: 58, font: KIT.FONT.brush, weight: 400, color: '#c2402f', align: 'center', seed: 1430, letterSpacing: 12,
  });
  // a dry brush rule under the word
  ctx.globalAlpha = ink * 0.8;
  const rr = mulberry32(1432);
  for (let k = 0; k < 3; k++) {
    ctx.strokeStyle = `rgba(194,64,47,${0.25 + k * 0.16})`;
    ctx.lineWidth = 2.2 - k * 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - 88, cy + 42 + k * 2);
    for (let x = -88; x <= 90; x += 14) {
      ctx.lineTo(cx + x + rr() * 3, cy + 42 + k * 2 + (rr() - 0.5) * 3);
    }
    ctx.stroke();
  }
  markText('s14-verdict', '失意者', cx - 102, cy - 40, 204, 80, { size: 58, align: 'center', color: '#c2402f' });

  // the note, tucked between the verdict and the rubble
  const np = smoothstep(3.8, 4.2, u);
  if (np > 0) {
    ctx.globalAlpha = np * 0.95;
    const noteY = 692;
    const dashW = KIT.measure(ctx, '——', { size: 25, font: KIT.FONT.serif, weight: 500 });
    const rest = '世人眼中的废物';
    const restW = KIT.measure(ctx, rest, { size: 25, font: KIT.FONT.serif, weight: 500, letterSpacing: 3.4 });
    const total = dashW + restW + 14;
    const x0 = cx - total / 2;
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 2;
    KIT.drawText(ctx, '——', x0, noteY, {
      size: 25, font: KIT.FONT.serif, weight: 500, color: 'rgba(186,58,44,0.98)',
    });
    KIT.drawText(ctx, rest, x0 + dashW + 14, noteY, {
      size: 25, font: KIT.FONT.serif, weight: 500, color: 'rgba(212,201,180,0.9)', letterSpacing: 3.4,
    });
    ctx.shadowColor = 'transparent';
    markText('s14-note', `——${rest}`, x0, noteY - 22, total, 44, { size: 25, align: 'center' });
  }
  ctx.restore();
}

function drawQuestion(ctx, u) {
  const p = smoothstep(3.42, 4.06, u);
  if (p <= 0) return;
  const text = '「你还肯为这个人间，流一滴眼泪吗？」';
  const chars = [...text];
  const size = 48;
  const spacing = 2.5 + 9 * (1 - p);
  const widths = chars.map((ch) => KIT.measure(ctx, ch, { size, font: KIT.FONT.display, weight: 500 }));
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  const y = 392;
  let x = 960 - total / 2;
  // a warm breath behind the line
  const g = ctx.createRadialGradient(960, y, 20, 960, y, 640);
  g.addColorStop(0, `rgba(241,230,207,${0.075 * p})`);
  g.addColorStop(0.55, `rgba(241,230,207,${0.02 * p})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(300, y - 190, 1320, 380);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  for (let i = 0; i < chars.length; i++) {
    const cp = clamp01((p - (i / chars.length) * 0.34) / 0.66);
    if (cp <= 0) { x += widths[i] + spacing; continue; }
    const a = Math.pow(cp, 1.5);
    ctx.globalAlpha = a;
    ctx.font = `500 ${size}px ${KIT.FONT.display}`;
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = i === 0 || i === chars.length - 1 ? 'rgba(241,230,207,0.7)' : BONE;
    ctx.fillText(chars[i], x + widths[i] / 2, y + 12 * (1 - cp));
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    x += widths[i] + spacing;
  }
  ctx.restore();
  markText('s14-question', text, 960 - total / 2, y - size * 0.7, total, size * 1.4, {
    size, align: 'center', color: BONE,
  });
}

function drawTear(ctx, u) {
  if (u < 4.28) return;
  const fall = clamp01((u - 4.28) / 0.86);
  const ease = fall * fall * (3 - 2 * fall);
  const y = lerp(196, 782, ease);
  const x = TEAR_X;
  const hit = smoothstep(5.1, 5.2, u);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // tapered trail
  const trailTop = y - 280;
  const tg = ctx.createLinearGradient(0, trailTop, 0, y + 4);
  tg.addColorStop(0, 'rgba(255,240,210,0)');
  tg.addColorStop(0.6, 'rgba(255,240,210,0.045)');
  tg.addColorStop(1, 'rgba(255,246,224,0.30)');
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(x - 1.1, trailTop);
  ctx.quadraticCurveTo(x - 2.6, y - 110, x - 5.5, y + 3);
  ctx.lineTo(x + 5.5, y + 3);
  ctx.quadraticCurveTo(x + 2.6, y - 110, x + 1.1, trailTop);
  ctx.closePath();
  ctx.fill();
  // the drop
  const r = 6.5 + 3 * Math.sin(u * 6);
  const dg = ctx.createRadialGradient(x, y, 0, x, y, 44);
  dg.addColorStop(0, 'rgba(255,250,235,0.9)');
  dg.addColorStop(0.16, 'rgba(255,238,204,0.4)');
  dg.addColorStop(1, 'rgba(255,230,190,0)');
  ctx.fillStyle = dg;
  ctx.beginPath();
  ctx.ellipse(x, y, 44, 48, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,252,242,0.95)';
  ctx.beginPath();
  ctx.moveTo(x, y - r * 2.4);
  ctx.quadraticCurveTo(x + r, y - r * 0.6, x, y + r * 1.1);
  ctx.quadraticCurveTo(x - r, y - r * 0.6, x, y - r * 2.4);
  ctx.fill();
  // impact
  if (hit > 0) {
    const hp = clamp01((u - 5.15) / 0.8);
    ctx.globalAlpha = (1 - hp) * 0.55;
    ctx.strokeStyle = 'rgba(255,244,218,0.8)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(x, 786, 20 + hp * 190, 6 + hp * 46, 0, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = (1 - hp) * 0.3;
    ctx.beginPath();
    ctx.ellipse(x, 786, 10 + hp * 120, 4 + hp * 28, 0, 0, TAU);
    ctx.stroke();
    const bg = ctx.createRadialGradient(x, 790, 4, x, 790, 230 * (0.4 + hp));
    bg.addColorStop(0, `rgba(255,238,200,${0.22 * (1 - hp)})`);
    bg.addColorStop(1, 'rgba(255,230,180,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(x - 260, 570, 520, 420);
    // splashed droplets
    ctx.fillStyle = 'rgba(255,244,218,0.7)';
    for (const s of ensure().dropSpecks) {
      const px = x + Math.cos(s.a) * (40 + hp * 210 * s.d);
      const py = 786 - Math.sin(s.a) * (10 + hp * 90 * s.d) + hp * hp * 110;
      ctx.globalAlpha = (1 - hp) * 0.65;
      ctx.fillRect(px, py, s.s, s.s);
    }
  }
  ctx.restore();
}

function drawGate(ctx, u) {
  const p = smoothstep(4.55, 5.25, u);
  if (p <= 0) return;
  const x = 1792, top = 288, bot = 828;
  const slit = 2 + 24 * p;
  ctx.save();
  // the inner leaf of the door, matte black
  ctx.fillStyle = '#0a0908';
  ctx.fillRect(x - slit - 13, top - 12, slit * 2 + 26, bot - top + 24);
  // warm spill into the gallery
  const g = ctx.createLinearGradient(x - slit * 3.6, 0, x + slit * 3.6, 0);
  g.addColorStop(0, 'rgba(255,226,170,0)');
  g.addColorStop(0.5, `rgba(255,228,176,${0.09 + 0.16 * p})`);
  g.addColorStop(1, 'rgba(255,226,170,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - slit * 3.6, top - 30, slit * 7.2, bot - top + 60);
  ctx.globalCompositeOperation = 'lighter';
  // core seam
  const sg = ctx.createLinearGradient(0, top, 0, bot);
  sg.addColorStop(0, 'rgba(255,246,226,0)');
  sg.addColorStop(0.12, `rgba(255,246,226,${0.24 + 0.55 * p})`);
  sg.addColorStop(0.35, `rgba(255,250,236,${0.3 + 0.6 * p})`);
  sg.addColorStop(0.86, `rgba(255,246,226,${0.2 + 0.45 * p})`);
  sg.addColorStop(1, 'rgba(255,246,226,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(x - slit / 2, top, slit, bot - top);
  // the bright heart of the slit
  ctx.fillStyle = `rgba(255,252,240,${0.3 + 0.5 * p})`;
  ctx.fillRect(x - slit * 0.16, top + 34, slit * 0.32, bot - top - 68);
  // light pool on the floor and in the haze
  const pool = ctx.createRadialGradient(x, bot + 6, 4, x, bot + 6, 300);
  pool.addColorStop(0, `rgba(255,232,184,${0.14 * p})`);
  pool.addColorStop(1, 'rgba(255,226,170,0)');
  ctx.fillStyle = pool;
  ctx.fillRect(x - 310, bot - 120, 620, 260);
  ctx.restore();
  // door jamb: matte black with a bone edge
  ctx.save();
  ctx.globalAlpha = p;
  ctx.fillStyle = '#0b0a08';
  ctx.fillRect(x - slit - 15, top - 14, 15, bot - top + 28);
  ctx.fillRect(x + slit, top - 14, 15, bot - top + 28);
  ctx.fillStyle = 'rgba(241,230,207,0.22)';
  ctx.fillRect(x - slit - 15, top - 14, 1, bot - top + 28);
  ctx.fillRect(x + slit + 14, top - 14, 1, bot - top + 28);
  ctx.fillStyle = 'rgba(255,226,170,0.2)';
  ctx.fillRect(x - slit - 1, top - 14, 1, bot - top + 28);
  ctx.fillRect(x + slit, top - 14, 1, bot - top + 28);
  ctx.restore();
}

/* ---------------------------------------------------------------- render */
export function renderAt(ctx, u, beat, env) {
  void beat; void env;
  const st = ensure();
  const shake = u >= RELEASE ? Math.exp(-(u - RELEASE) * 7) : 0;
  const sx = Math.sin((u - RELEASE) * 92) * 7 * shake;
  const sy = Math.cos((u - RELEASE) * 71) * 4 * shake;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.drawImage(st.bg, -4, -4, W + 8, H + 8);

  // low breathing light, keyed to the score's bar pulse
  const barPulse = beat && Number.isFinite(beat.barPulse) ? beat.barPulse : 0;
  const breath = 0.5 + 0.5 * Math.sin(u * TAU / 0.75);
  const glow = ctx.createRadialGradient(960, 330, 30, 960, 330, 900);
  glow.addColorStop(0, `rgba(241,230,207,${0.020 + 0.020 * breath + 0.02 * barPulse})`);
  glow.addColorStop(1, 'rgba(241,230,207,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  drawGate(ctx, u);
  drawMeta(ctx, u);
  ctx.save();
  ctx.globalAlpha = smoothstep(2.04, 3.05, u) * 0.96;
  ctx.drawImage(st.ground, 0, H - st.ground.height);
  ctx.restore();
  drawSuspendedFragments(ctx, u);
  drawHang(ctx, u);
  drawHoldGlyphs(ctx, u);
  drawBodies(ctx, u);
  drawReleaseFlash(ctx, u);
  drawRings(ctx, u);
  drawVerdict(ctx, u);
  drawTear(ctx, u);
  drawQuestion(ctx, u);

  // a last, very faint grade so the black never goes flat
  const vg = ctx.createRadialGradient(980, 520, 260, 980, 520, 1080);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(3,3,3,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.075;
  ctx.drawImage(st.grain, 0, 0, W, H);
  ctx.restore();
}

export default { renderAt };
