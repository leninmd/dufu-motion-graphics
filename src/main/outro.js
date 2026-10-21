/**
 * outro.js — 01:54 – 02:18 (12 bars)
 *
 * The camera pulls back from the code editor into a 5 × 4 history wall:
 * eighteen framed eras and one large, empty 19th seat at the Xiang river dock.
 * On the final bars the frames turn to gold dust and 1,455 characters stream
 * into the empty seat; the traveller walks past it, boards his boat, and leaves
 * only a vermilion 詩史 seal in the star river.
 */
import KIT from '../kit/index.js';
import { clamp, clamp01, lerp, smoothstep, smootherstep, easeOut, easeInOut, easeInOutCubic, easeOutCubic, hash, mulberry32 } from '../kit/math.js';
import { rgba, linear, radial, withClip, makeCanvas } from '../kit/canvas.js';
import { roughRect, sealStamp } from '../kit/ink-engine.js';
import { markText } from '../kit/debug.js';
import { FONT } from '../kit/type.js';

const W = 1920, H = 1080;
const WALL = { x: 96, y: 154, w: 1728, h: 888, gap: 20, cols: 5 };
const TILE_W = 329.6, TILE_H = 185.4;
const ROW_GAP = 24;
const BOTTOM_Y = 782;
const BIG = { x: 616, y: 782, w: 690, h: 238 };

function cellRect(index) {
  if (index < 15) {
    const col = index % 5, row = Math.floor(index / 5);
    return {
      x: WALL.x + col * (TILE_W + WALL.gap),
      y: WALL.y + row * (TILE_H + ROW_GAP),
      w: TILE_W, h: TILE_H,
    };
  }
  // Bottom row: 16, 17, the big empty seat, 18.
  if (index === 15) return { x: WALL.x, y: BOTTOM_Y, w: 200, h: 112 };
  if (index === 16) return { x: WALL.x + 216, y: BOTTOM_Y, w: 200, h: 112 };
  if (index === 17) return { x: 1536, y: BOTTOM_Y, w: 200, h: 112 };
  return BIG;
}

const CELLS = Array.from({ length: 19 }, (_, i) => cellRect(i));
const BIG_CENTER = [BIG.x + BIG.w / 2, BIG.y + BIG.h / 2];
const TILE18 = cellRect(17);

function wallTangent(t, p0, p1, p2, p3) {
  return KIT.cubicPoint(p0, p1, p2, p3, clamp01(t));
}

/** Camera: close on the code editor, pull back, then push into the empty seat. */
function camera(u) {
  let cx = W / 2, cy = H / 2, zoom = 1;
  if (u < 4.1) {
    const p = easeOutCubic(clamp01(u / 4.1));
    const start = [TILE18.x + TILE18.w / 2, TILE18.y + TILE18.h / 2];
    cx = lerp(start[0], W / 2, p);
    cy = lerp(start[1], H / 2 - 8, p);
    zoom = lerp(2.65, 1.0, p);
    // initial micro hold, then acceleration
    if (u < 0.22) { cx = start[0]; cy = start[1]; zoom = 2.65; }
  } else if (u < 8.0) {
    cx = W / 2; cy = H / 2 - 8; zoom = 1.0;
  } else if (u < 14.0) {
    const p = easeInOut(clamp01((u - 8.0) / 5.4));
    cx = lerp(W / 2, BIG_CENTER[0], p);
    cy = lerp(H / 2 - 8, BIG_CENTER[1], p);
    zoom = lerp(1.0, 1.82, p);
  } else if (u < 18.4) {
    cx = BIG_CENTER[0]; cy = BIG_CENTER[1]; zoom = 1.82;
  } else if (u < 20.2) {
    const p = easeInOut(clamp01((u - 18.4) / 1.8));
    cx = BIG_CENTER[0]; cy = BIG_CENTER[1];
    zoom = lerp(1.82, 1.26, p);
  } else {
    const p = easeInOutCubic(clamp01((u - 20.2) / 3.6));
    cx = BIG_CENTER[0]; cy = BIG_CENTER[1];
    zoom = lerp(1.26, 1.62, p);
  }
  return { cx, cy, zoom };
}

function screen(cam, x, y) {
  return [(x - cam.cx) * cam.zoom + W / 2, (y - cam.cy) * cam.zoom + H / 2];
}

/* --------------------------------------------------------------- wall base */
function drawGallery(ctx, cam, u) {
  // dark museum wall
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#090a09');
  g.addColorStop(0.45, '#141310');
  g.addColorStop(1, '#070706');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // faint plaster / paper tooth
  const plaster = KIT.layer('outro:plaster', W / 2, H / 2, (c) => {
    c.fillStyle = '#191713'; c.fillRect(0, 0, W / 2, H / 2);
    const r = mulberry32(hash('outroplaster', 5));
    for (let i = 0; i < 3800; i++) {
      const x = r() * W / 2, y = r() * H / 2;
      c.fillStyle = r() < 0.5 ? `rgba(228,210,176,${r() * 0.03})` : `rgba(0,0,0,${r() * 0.04})`;
      c.fillRect(x, y, 1 + r() * 2, 1);
    }
  });
  ctx.save(); ctx.globalAlpha = 0.9; ctx.drawImage(plaster, 0, 0, W, H); ctx.restore();
  // spotlights washing down the wall
  const beam = (cx, width, alpha) => {
    const gg = ctx.createLinearGradient(0, 0, 0, H);
    gg.addColorStop(0, `rgba(255,229,182,${alpha})`);
    gg.addColorStop(0.55, `rgba(255,229,182,${alpha * 0.22})`);
    gg.addColorStop(1, 'rgba(255,229,182,0)');
    ctx.save();
    ctx.translate(cx, 0);
    ctx.scale(width / H, 1);
    ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.lineTo(H * 0.55, H); ctx.lineTo(-H * 0.2, H); ctx.closePath();
    ctx.fillStyle = gg; ctx.fill();
    ctx.restore();
  };
  beam(W * 0.24, 340, 0.075);
  beam(W * 0.52, 430, 0.09);
  beam(W * 0.78, 300, 0.06);
  // floor
  const fl = ctx.createLinearGradient(0, H * 0.78, 0, H);
  fl.addColorStop(0, 'rgba(0,0,0,0)');
  fl.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = fl; ctx.fillRect(0, H * 0.78, W, H * 0.22);
  // intro title ghost at the top
  const titleA = smoothstep(2.1, 3.0, u) * (1 - smoothstep(8.6, 9.6, u));
  if (titleA > 0) {
    KIT.drawText(ctx, '大唐詩史 · 歷史展牆', W / 2, 72 + (1 - smoothstep(2.1, 3.0, u)) * 12, {
      size: 18, font: FONT.display, weight: 500, color: `rgba(231,216,184,${0.55 * titleA})`,
      align: 'center', letterSpacing: 9,
    });
  }
  // wall floor line under the frames
  const yline = WALL.y + 3 * (TILE_H + ROW_GAP) + TILE_H - 6;
  ctx.strokeStyle = 'rgba(216,186,122,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(70, yline); ctx.lineTo(W - 70, yline); ctx.stroke();
  // camera vignette
  const v = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.38, W / 2, H * 0.5, W * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.48)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

/* ---------------------------------------------------------------- empty seat */
function drawSeatLayer() {
  return KIT.layer('outro:seat', 1340, 520, (ctx) => {
    ctx.save();
    ctx.scale(2, 2);
    const w = 670, h = 260;
    // night on the Xiang
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#071417');
    sky.addColorStop(0.52, '#0d2224');
    sky.addColorStop(0.72, '#092122');
    sky.addColorStop(1, '#050d0d');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    // stars
    const r = mulberry32(hash('seatstars', 3));
    for (let i = 0; i < 150; i++) {
      const x = r() * w, y = r() * h * 0.54;
      const a = 0.1 + Math.pow(r(), 2) * 0.6;
      ctx.fillStyle = `rgba(240,230,204,${a})`;
      ctx.fillRect(x, y, r() < 0.12 ? 1.8 : 0.8, r() < 0.12 ? 1.8 : 0.8);
    }
    const moon = ctx.createRadialGradient(555, 72, 2, 555, 72, 75);
    moon.addColorStop(0, 'rgba(245,233,203,0.85)');
    moon.addColorStop(0.12, 'rgba(245,233,203,0.3)');
    moon.addColorStop(1, 'rgba(245,233,203,0)');
    ctx.fillStyle = moon; ctx.beginPath(); ctx.arc(555, 72, 78, 0, KIT.TAU); ctx.fill();
    // distant karst ridges
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = `rgba(${15 + layer * 5},${34 + layer * 7},${33 + layer * 4},${0.5 + layer * 0.1})`;
      ctx.beginPath();
      ctx.moveTo(0, 150);
      for (let x = 0; x <= w; x += 18) {
        const y = 150 - 20 - layer * 7 - KIT.fbm1(x * 0.006 + layer * 2.7, 4, 21 + layer) * 56;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, 178); ctx.lineTo(0, 178); ctx.closePath(); ctx.fill();
    }
    // river
    const river = ctx.createLinearGradient(0, 134, 0, h);
    river.addColorStop(0, '#133536');
    river.addColorStop(0.5, '#0d2b2d');
    river.addColorStop(1, '#061718');
    ctx.fillStyle = river; ctx.fillRect(0, 136, w, h - 136);
    // moon path on the water
    for (let i = 0; i < 34; i++) {
      const y = 142 + i * 3.2;
      const half = 18 + i * 2.8;
      ctx.strokeStyle = `rgba(233,222,195,${0.05 + (1 - i / 34) * 0.13})`;
      ctx.lineWidth = 0.7 + (i % 3) * 0.4;
      ctx.beginPath();
      ctx.moveTo(555 - half * (0.5 + (i % 5) * 0.08), y);
      ctx.lineTo(555 + half * (0.5 + (i % 4) * 0.1), y + 1);
      ctx.stroke();
    }
    // shore and dock
    ctx.fillStyle = '#1a1711';
    ctx.beginPath(); ctx.moveTo(0, 205); ctx.lineTo(460, 187); ctx.lineTo(670, 205); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 12; i++) {
      const y = 196 + i * 6.5;
      ctx.strokeStyle = `rgba(184,145,86,${0.08 + i * 0.012})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y + 4); ctx.lineTo(470 - i * 25, y); ctx.stroke();
    }
    // pavilion columns, framing the empty seat
    const wood = ctx.createLinearGradient(36, 0, 74, 0);
    wood.addColorStop(0, '#28160d'); wood.addColorStop(0.45, '#5b2d15'); wood.addColorStop(1, '#1b0e08');
    ctx.fillStyle = wood; ctx.fillRect(36, 20, 18, 210);
    ctx.fillRect(340, 34, 15, 190);
    ctx.fillStyle = '#1e110b';
    ctx.fillRect(28, 19, 34, 8);
    ctx.fillRect(332, 33, 31, 7);
    // plaque
    ctx.fillStyle = 'rgba(23,15,9,0.94)';
    ctx.fillRect(122, 34, 160, 38);
    ctx.strokeStyle = 'rgba(198,158,82,0.46)'; ctx.lineWidth = 1;
    ctx.strokeRect(126, 38, 152, 30);
    ctx.font = `500 12px ${FONT.serif}`;
    ctx.fillStyle = 'rgba(224,200,151,0.8)';
    ctx.textAlign = 'center';
    ctx.fillText('凌 烟 阁 · 第 廿 四 席', 202, 58);
    // overhead lantern
    const lanternX = 320, lanternY = 74;
    ctx.strokeStyle = 'rgba(172,132,71,0.3)'; ctx.beginPath(); ctx.moveTo(320, 0); ctx.lineTo(320, 48); ctx.stroke();
    const lg = ctx.createRadialGradient(lanternX, lanternY, 2, lanternX, lanternY, 30);
    lg.addColorStop(0, 'rgba(255,201,105,0.95)');
    lg.addColorStop(0.25, 'rgba(240,156,60,0.35)');
    lg.addColorStop(1, 'rgba(240,156,60,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lanternX, lanternY, 32, 0, KIT.TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,213,136,0.9)';
    ctx.fillRect(lanternX - 7, lanternY - 10, 14, 20);
    ctx.fillStyle = 'rgba(97,41,14,0.75)';
    ctx.fillRect(lanternX - 7, lanternY - 8, 14, 3);
    ctx.fillRect(lanternX - 7, lanternY + 5, 14, 3);
    // desk with scrolls and brushes
    const dx = 100, dy = 166;
    const desk = linear(ctx, 0, dy, 0, dy + 60, [[0, '#5b3a21'], [0.08, '#7b512b'], [0.5, '#331b0f'], [1, '#1b0e08']]);
    ctx.fillStyle = desk;
    ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx + 330, dy - 3); ctx.lineTo(dx + 345, dy + 16); ctx.lineTo(dx + 324, h); ctx.lineTo(dx - 8, h); ctx.closePath(); ctx.fill();
    // scrolls
    for (let i = 0; i < 5; i++) {
      const sx = dx + 30 + i * 42, sy = dy + 2 + (i % 2) * 4;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(-0.18 + i * 0.02);
      ctx.fillStyle = '#cfc0a1'; ctx.fillRect(0, 0, 60, 7);
      ctx.fillStyle = 'rgba(93,65,36,0.7)'; ctx.fillRect(0, 0, 4, 7); ctx.fillRect(56, 0, 4, 7);
      ctx.strokeStyle = 'rgba(91,68,42,0.35)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(9, 3.5); ctx.lineTo(50, 3.5); ctx.stroke();
      ctx.restore();
    }
    // brush rest + brushes
    ctx.strokeStyle = 'rgba(192,152,86,0.7)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(206, dy + 34); ctx.lineTo(276, dy + 30); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const bx = 216 + i * 14;
      ctx.strokeStyle = 'rgba(221,186,116,0.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx, dy + 32); ctx.lineTo(bx + 8, dy - 31 + i * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(20,15,10,0.9)';
      ctx.beginPath(); ctx.ellipse(bx + 8, dy - 34 + i * 2, 2.2, 6, 0.2, 0, KIT.TAU); ctx.fill();
    }
    // ink stone
    ctx.fillStyle = '#0c0b09';
    ctx.beginPath(); ctx.ellipse(304, dy + 31, 18, 7, 0.1, 0, KIT.TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(160,127,71,0.45)'; ctx.lineWidth = 1; ctx.stroke();
    // empty chair
    drawEmptyChair(ctx, 246, 176, 0.9);
    // nameplate
    ctx.save();
    ctx.translate(150, 215); ctx.rotate(-0.02);
    ctx.fillStyle = 'rgba(24,16,10,0.92)';
    ctx.fillRect(0, 0, 172, 27);
    ctx.strokeStyle = 'rgba(200,163,93,0.55)'; ctx.lineWidth = 1; ctx.strokeRect(2, 2, 168, 23);
    ctx.font = `500 10.5px ${FONT.serif}`; ctx.fillStyle = 'rgba(232,211,167,0.88)'; ctx.textAlign = 'center';
    ctx.fillText('唐左拾遗 · 杜甫（本人）', 86, 18);
    ctx.restore();
    // mooring post, rope implied; boat drawn live
    ctx.fillStyle = '#2b1b0f';
    ctx.fillRect(604, 172, 8, 40);
    ctx.beginPath(); ctx.ellipse(608, 171, 6, 3, 0, 0, KIT.TAU); ctx.fill();
    // warm seat spotlight
    const sp = ctx.createRadialGradient(250, 150, 4, 250, 160, 100);
    sp.addColorStop(0, 'rgba(255,205,123,0.24)');
    sp.addColorStop(1, 'rgba(255,205,123,0)');
    ctx.fillStyle = sp; ctx.fillRect(100, 70, 340, 180);
    // corner marks / plate number
    ctx.strokeStyle = 'rgba(205,168,101,0.3)'; ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.font = `500 9px ${FONT.mono}`; ctx.fillStyle = 'rgba(217,189,132,0.5)'; ctx.textAlign = 'right';
    ctx.fillText('PLATE 19 / ABSENT', w - 18, 24);
    ctx.textAlign = 'left';
    ctx.fillText('XIANG RIVER · DOCK 19', 18, 24);
    ctx.restore();
  });
}

function drawEmptyChair(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 46, 52, 9, 0, 0, KIT.TAU); ctx.fill();
  const wood = linear(ctx, -36, -60, 36, 46, [[0, '#5f3d23'], [0.45, '#8c5e33'], [1, '#2a170c']]);
  ctx.strokeStyle = wood; ctx.lineCap = 'round';
  // back posts
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-31, 10); ctx.lineTo(-34, -72); ctx.moveTo(31, 10); ctx.lineTo(34, -72); ctx.stroke();
  // back splat
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-30, -60); ctx.quadraticCurveTo(0, -70, 30, -60); ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-26, -34); ctx.lineTo(26, -34); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-23, -14); ctx.lineTo(23, -14); ctx.stroke();
  // seat
  ctx.fillStyle = 'rgba(63,36,19,0.95)';
  ctx.beginPath(); ctx.moveTo(-42, 5); ctx.lineTo(42, 5); ctx.lineTo(33, 19); ctx.lineTo(-32, 19); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(190,142,78,0.4)'; ctx.lineWidth = 1.2; ctx.stroke();
  // legs
  ctx.strokeStyle = wood; ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(-32, 19); ctx.lineTo(-38, 49); ctx.moveTo(30, 19); ctx.lineTo(37, 49);
  ctx.moveTo(-32, 15); ctx.lineTo(-20, 44); ctx.moveTo(30, 15); ctx.lineTo(19, 44);
  ctx.stroke();
  // armrests
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-34, -42); ctx.quadraticCurveTo(-46, -30, -40, 4); ctx.moveTo(34, -42); ctx.quadraticCurveTo(46, -30, 40, 4); ctx.stroke();
  // gold rim light
  ctx.strokeStyle = 'rgba(235,184,92,0.45)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-31, 10); ctx.lineTo(-34, -72); ctx.quadraticCurveTo(0, -82, 34, -72); ctx.stroke();
  ctx.restore();
}

function drawBoatLive(ctx, cell, u) {
  // The moored boat, then the departure into the star river.
  const depart = smoothstep(20.7, 23.1, u);
  const x = cell.x + 540 + depart * (260 + 120);
  const y = cell.y + 186 - depart * (80 + 40);
  const s = 0.64;
  const opacity = 1 - smoothstep(23.0, 23.7, u) * 0.55;
  const bob = Math.sin(u * 1.7) * 1.2 * (1 - depart);
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x, y + bob);
  ctx.scale(s, s);
  // hull
  const hull = KIT.smoothLoop([
    [-120, -4], [-98, 9], [-40, 16], [38, 15], [95, 5], [126, -13],
    [115, -8], [52, 1], [-22, 3], [-92, -2], [-116, -9],
  ], 7);
  ctx.fillStyle = '#120d08';
  ctx.strokeStyle = 'rgba(218,167,83,0.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(hull[0][0], hull[0][1]);
  for (let i = 1; i < hull.length; i++) ctx.lineTo(hull[i][0], hull[i][1]);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // planks
  ctx.strokeStyle = 'rgba(195,146,75,0.28)'; ctx.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-105 + i * 5, -1 + i * 4); ctx.lineTo(105 - i * 3, -4 + i * 4); ctx.stroke(); }
  // boatman, facing the far shore
  const P = KIT.rig.boatPose({ t: u, phase: u * 2.2 });
  const boat = KIT.rig.placed(P, { x: 0, y: 0, scale: 0.58, rot: 0 });
  // only the boatman and oar, not the entire boat (hull already painted)
  for (const p of boat.parts) {
    if (!['boatman', 'boatman-detail', 'skin', 'cap', 'oar', 'rope'].includes(p.role)) continue;
    KIT.rig.drawSilhouette(ctx, { parts: [p] }, { color: 'rgba(6,6,5,0.94)' });
  }
  ctx.strokeStyle = 'rgba(219,171,88,0.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-126, -14); ctx.quadraticCurveTo(-170, -28, -198, -12); ctx.stroke();
  // lantern on the boat
  ctx.fillStyle = 'rgba(243,173,70,0.8)';
  ctx.beginPath(); ctx.arc(92, -46, 3.5, 0, KIT.TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,205,115,0.12)';
  ctx.beginPath(); ctx.arc(92, -46, 23, 0, KIT.TAU); ctx.fill();
  ctx.restore();
  // Wake
  if (depart > 0) {
    ctx.save();
    ctx.strokeStyle = `rgba(205,232,229,${0.15 * (1 - smoothstep(23.1, 23.8, u))})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 150 - i * 22, y + 24 + i * 3);
      ctx.lineTo(x - 240 - i * 35, y + 20 + i * 4);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawEmptyCell(ctx, cam, u) {
  const cell = BIG;
  const [sx, sy] = screen(cam, cell.x, cell.y);
  const sw = cell.w * cam.zoom, sh = cell.h * cam.zoom;
  if (sx > W || sy > H || sx + sw < 0 || sy + sh < 0) return;
  // deep shadow box
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 28 * cam.zoom;
  ctx.shadowOffsetY = 10 * cam.zoom;
  ctx.fillStyle = '#080a09';
  ctx.fillRect(sx - 12, sy - 12, sw + 24, sh + 24);
  ctx.restore();
  const seat = drawSeatLayer();
  ctx.save();
  ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip();
  ctx.drawImage(seat, sx, sy, sw, sh);
  // tint and glow behind glass
  const l = smoothstep(8, 12, u);
  const glow = smoothstep(18, 20, u) * 0.32;
  if (glow > 0) {
    ctx.fillStyle = `rgba(229,170,70,${glow * 0.32})`;
    ctx.fillRect(sx, sy, sw, sh);
  }
  // live boat, draw in screen coords
  ctx.save();
  const cellScale = cam.zoom;
  ctx.translate(sx, sy);
  ctx.scale(cellScale, cellScale);
  ctx.translate(-cell.x, -cell.y);
  drawBoatLive(ctx, cell, u);
  // walking silhouette on final bars
  drawFinalWalk(ctx, cell, u);
  // The diorama dissolves into the star river as the migration completes.
  const space = smoothstep(21.0, 22.5, u);
  if (space > 0) {
    const voidG = ctx.createLinearGradient(0, cell.y, 0, cell.y + cell.h);
    voidG.addColorStop(0, `rgba(2,7,10,${(0.72 * space).toFixed(3)})`);
    voidG.addColorStop(0.6, `rgba(1,5,8,${(0.86 * space).toFixed(3)})`);
    voidG.addColorStop(1, `rgba(1,4,6,${(0.94 * space).toFixed(3)})`);
    ctx.fillStyle = voidG;
    ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
  }
  // stars gathering inside the cell
  if (u > 19.1) drawCellStars(ctx, cell, u);
  ctx.restore();
  // glass reflection
  const sheen = ctx.createLinearGradient(sx, sy, sx + sw, sy + sh);
  sheen.addColorStop(0, 'rgba(255,255,255,0.09)');
  sheen.addColorStop(0.28, 'rgba(255,255,255,0.01)');
  sheen.addColorStop(0.55, 'rgba(255,255,255,0.045)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen; ctx.fillRect(sx, sy, sw, sh);
  // flash on the golden beat
  const flash = Math.exp(-Math.max(0, u - 10.5) * 6) + Math.exp(-Math.max(0, u - 12.0) * 6) + Math.exp(-Math.max(0, u - 13.5) * 6);
  if (u >= 10.5 && u < 13.8) {
    ctx.fillStyle = `rgba(255,224,158,${0.09 * flash})`;
    ctx.fillRect(sx, sy, sw, sh);
  }
  ctx.restore();
  // frame and plaque
  KIT.frames.galleryFrame(ctx, sx, sy, sw, sh, { style: 'wood', accent: '#d4af37' });
  // empty-seat label
  ctx.save();
  ctx.globalAlpha = 1 - smoothstep(21.1, 22.5, u) * 0.82;
  ctx.fillStyle = 'rgba(5,6,5,0.75)';
  ctx.fillRect(sx, sy + sh - 26, sw, 26);
  KIT.drawText(ctx, '第 19 格　·　缺席者席位 / THE EMPTY SEAT', sx + 12, sy + sh - 13, { size: 11, font: FONT.mono, color: 'rgba(232,209,163,0.72)', letterSpacing: 1.1, mark: 'outro-seat' });
  ctx.restore();
  markText('outro-empty-seat', '第19格 · 缺席者席位', sx, sy, sw, sh, { size: 11 });
  void l;
}

function drawFinalWalk(ctx, cell, u) {
  if (u < 19.5) return;
  const p = smoothstep(19.7, 21.2, u);
  if (p >= 1) return;
  const x = lerp(cell.x + 330, cell.x + 572, easeInOutCubic(p));
  const y = cell.y + 222;
  const P = KIT.rig.pose({ t: u, phase: u * 2.6, wind: 0.25, staff: false, elder: true, look: 0.6 });
  const pos = KIT.rig.placed(P, { x, y, scale: 0.43, rot: 0 });
  ctx.save();
  ctx.globalAlpha = 0.9 * (1 - smoothstep(21.15, 21.35, u));
  KIT.rig.drawSilhouette(ctx, pos, { color: 'rgba(4,5,4,0.96)' });
  // gold rim
  ctx.globalCompositeOperation = 'lighter';
  KIT.rig.drawWire(ctx, pos, { color: 'rgba(235,184,90,0.22)', width: 0.9 });
  ctx.restore();
}

function drawWallTile(ctx, cam, index, spec, tile, u) {
  const cell = cellRect(index);
  const [sx, sy] = screen(cam, cell.x, cell.y);
  const sw = cell.w * cam.zoom, sh = cell.h * cam.zoom;
  if (sx > W + 50 || sy > H + 50 || sx + sw < -50 || sy + sh < -50) return;
  const gold = smoothstep(18, 19.7, u);
  const dim = smoothstep(9, 14, u) * (1 - smoothstep(18.2, 20.3, u)) * 0.22;
  ctx.save();
  // recess
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(sx - 6, sy - 6, sw + 12, sh + 12);
  if (tile) {
    ctx.drawImage(tile, sx, sy, sw, sh);
  } else {
    const g = linear(ctx, sx, sy, sx + sw, sy + sh, [[0, spec.palette[0]], [1, spec.palette[1]]]);
    ctx.fillStyle = g; ctx.fillRect(sx, sy, sw, sh);
    KIT.drawText(ctx, spec.no, sx + sw / 2, sy + sh / 2, { size: Math.max(12, sw * 0.18), font: FONT.mono, color: spec.palette[2], align: 'center' });
  }
  // subdued frame and label
  KIT.frames.galleryFrame(ctx, sx, sy, sw, sh, { style: 'wood', accent: spec.accent, light: 1 - gold * 0.15 });
  // label band
  ctx.fillStyle = 'rgba(4,4,4,0.68)';
  ctx.fillRect(sx, sy + sh - 22 * cam.zoom, sw, 22 * cam.zoom);
  KIT.drawText(ctx, `${spec.no}  ${spec.zh}`, sx + 8 * cam.zoom, sy + sh - 11 * cam.zoom, {
    size: Math.max(7, 9.3 * cam.zoom), font: FONT.serif, color: 'rgba(236,224,201,0.78)', letterSpacing: 0.6,
  });
  KIT.drawText(ctx, spec.year.replace(' · ', ' '), sx + sw - 8 * cam.zoom, sy + sh - 11 * cam.zoom, {
    size: Math.max(6, 7.4 * cam.zoom), font: FONT.mono, color: 'rgba(236,224,201,0.38)', align: 'right',
  });
  // dim while camera is on the empty seat
  if (dim > 0) { ctx.fillStyle = `rgba(0,0,0,${dim})`; ctx.fillRect(sx, sy, sw, sh); }
  // golden beat
  if (gold > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(229,168,65,${gold * (0.09 + 0.05 * Math.sin(u * 6 + index))})`;
    ctx.fillRect(sx, sy, sw, sh);
    // particles per tile
    drawTileSparks(ctx, index, cell, u, gold);
  }
  // As the 1,455 characters complete their migration, the 18 frames fall dark;
  // only the 19th cell keeps the star river.
  const finalDark = smoothstep(20.6, 22.4, u) * 0.82;
  if (finalDark > 0) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(2,4,5,${finalDark.toFixed(3)})`;
    ctx.fillRect(sx, sy, sw, sh);
  }
  ctx.restore();
}

function drawTileSparks(ctx, index, cell, u, gold) {
  const p = smoothstep(18.5, 19.7, u);
  if (p <= 0) return;
  const r = mulberry32(hash('tilesparks', index));
  for (let i = 0; i < 18; i++) {
    const px = cell.x + cell.w * (0.15 + r() * 0.7);
    const py = cell.y + cell.h * (0.15 + r() * 0.7);
    const a = gold * (0.25 + r() * 0.55) * (0.6 + 0.4 * Math.sin(u * 8 + i));
    ctx.fillStyle = `rgba(248,204,118,${a})`;
    ctx.fillRect(px + (u - 18.5) * (8 + i * 2), py - (u - 18.5) * (18 + r() * 30), 1.2 + r() * 2, 1.2 + r() * 2);
  }
}

/* ----------------------------------------------------------- 1,455 stars */
function drawCellStars(ctx, cell, u) {
  const p = smoothstep(19.1, 21.8, u);
  if (p <= 0) return;
  const cx = cell.x + cell.w * 0.56;
  const cy = cell.y + cell.h * 0.44;
  const r = mulberry32(hash('cellstars', 1455));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 520; i++) {
    const a = r() * KIT.TAU;
    const dist = Math.pow(r(), 0.55) * 340;
    const spin = (1 - p) * 3.2 + 0.2;
    const x = cx + Math.cos(a + spin) * dist * p;
    const y = cy + Math.sin(a + spin) * dist * 0.42 * p;
    const tw = 0.3 + r() * 0.7;
    ctx.fillStyle = `rgba(248,207,120,${(0.12 + tw * 0.72) * p})`;
    const s = 0.8 + tw * 2.4;
    ctx.fillRect(x, y, s, s);
    if (i % 37 === 0) {
      ctx.font = `${9 + tw * 9}px "Noto Serif SC", serif`;
      ctx.fillStyle = `rgba(255,222,150,${0.32 * p})`;
      ctx.fillText(['杜', '甫', '詩', '史', '唐'][i % 5], x, y);
    }
  }
  ctx.restore();
}

function drawStarStream(ctx, cam, u) {
  if (u < 18.3) return;
  const p = smoothstep(18.3, 21.4, u);
  if (p <= 0) return;
  const target = [BIG.x + BIG.w * 0.55, BIG.y + BIG.h * 0.46];
  const r = mulberry32(hash('starmigration', 1455));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 1455; i++) {
    const idx = i % 18;
    const cell = indexCell(idx);
    const delay = (i / 1455) * 0.34 + (idx / 18) * 0.26 + r() * 0.14;
    const t = clamp01((p - delay) / 0.52);
    if (t <= 0) continue;
    const sx = cell.x + cell.w * (0.2 + r() * 0.6);
    const sy = cell.y + cell.h * (0.2 + r() * 0.6);
    const tx = target[0] + (r() - 0.5) * 190;
    const ty = target[1] + (r() - 0.5) * 110;
    const e = easeInOut(t);
    const midX = (sx + tx) / 2 + (r() - 0.5) * 180;
    const midY = Math.min(sy, ty) - 80 - r() * 180;
    const x = KIT.quadPoint([sx, sy], [midX, midY], [tx, ty], e);
    const [px, py] = screen(cam, x[0], x[1]);
    if (px < -10 || px > W + 10 || py < -10 || py > H + 10) continue;
    const tw = 0.3 + r() * 0.7;
    const a = (1 - smoothstep(21.5, 22.3, u)) * (0.18 + tw * 0.8) * Math.min(1, t * 3);
    ctx.fillStyle = `rgba(248,204,116,${a})`;
    const sz = (1 + tw * 2.6) * Math.min(1.5, cam.zoom);
    ctx.fillRect(px, py, sz, sz);
    if (i % 43 === 0) {
      ctx.font = `${7 + tw * 8}px ${FONT.serif}`;
      ctx.fillStyle = `rgba(255,222,150,${a * 0.9})`;
      ctx.fillText(['杜', '甫', '詩', '史', '唐'][i % 5], px, py);
    }
  }
  ctx.restore();
}

const CELLS_IDX = Array.from({ length: 18 }, (_, i) => cellRect(i));
const indexCell = (i) => CELLS_IDX[i];

/* ------------------------------------------------------------- typography */
function drawOutroText(ctx, u) {
  // A thin top-serif mark
  const titleA = smoothstep(4.1, 5.0, u) * (1 - smoothstep(15.5, 16.5, u));
  if (titleA > 0) {
    KIT.drawText(ctx, 'THE END OF THE ROAD · 4739 KM', W / 2, 62, { size: 10, font: FONT.mono, weight: 500, color: `rgba(231,214,180,${0.42 * titleA})`, align: 'center', letterSpacing: 2.6 });
  }
  // caption 1
  const c1 = smoothstep(4.15, 4.65, u) * (1 - smoothstep(8.3, 9.0, u));
  if (c1 > 0) {
    const y = 1046;
    ctx.save();
    ctx.globalAlpha = c1;
    ctx.strokeStyle = 'rgba(217,184,115,0.38)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W / 2 - 280, y - 34); ctx.lineTo(W / 2 + 280, y - 34); ctx.stroke();
    KIT.drawText(ctx, '截至大历五年冬，杜甫共走完 4,739 公里，向人间提交了 1,455 首答卷。', W / 2, y, {
      size: 23, font: FONT.display, weight: 500, color: 'rgba(239,229,211,0.92)', align: 'center', letterSpacing: 1.1, mark: 'outro-caption-1',
    });
    KIT.drawText(ctx, 'BY WINTER 770, HE HAD WALKED 4,739 KM AND FILED 1,455 POEMS WITH THE WORLD.', W / 2, y + 22, {
      size: 9, font: FONT.mono, weight: 500, color: 'rgba(232,216,186,0.42)', align: 'center', letterSpacing: 1.2,
    });
    ctx.restore();
  }
  // caption 2 (cold court verdict)
  const c2 = smoothstep(14.0, 14.45, u) * (1 - smoothstep(18.2, 18.8, u));
  if (c2 > 0) {
    ctx.save();
    ctx.globalAlpha = c2;
    KIT.drawText(ctx, '他在世时，大唐朝廷对此尚未发表任何评论。', W / 2, 1047, {
      size: 24, font: FONT.display, weight: 500, color: 'rgba(237,225,204,0.92)', align: 'center', letterSpacing: 1.1, mark: 'outro-caption-2',
    });
    KIT.drawText(ctx, 'DURING HIS LIFETIME, THE TANG COURT ISSUED NO COMMENT.', W / 2, 1068, {
      size: 8.5, font: FONT.mono, color: 'rgba(232,216,186,0.38)', align: 'center', letterSpacing: 1.4,
    });
    // a tiny empty comment tick, like a refused metadata field
    ctx.strokeStyle = 'rgba(160,45,37,0.45)';
    ctx.beginPath(); ctx.moveTo(W / 2 - 328, 1047); ctx.lineTo(W / 2 - 306, 1047); ctx.stroke();
    ctx.restore();
  }
  // final tiny dedication
  const c3 = smoothstep(21.6, 22.5, u);
  if (c3 > 0) {
    ctx.save();
    ctx.globalAlpha = c3 * (1 - smoothstep(23.8, 24.0, u));
    KIT.drawText(ctx, '少陵测试　/　THE DU FU TEST', W / 2, 1044, {
      size: 10, font: FONT.mono, weight: 500, color: 'rgba(230,211,173,0.4)', align: 'center', letterSpacing: 3.2,
    });
    ctx.restore();
  }
}

function drawFinalSeal(ctx, u) {
  const p = smoothstep(22.35, 22.85, u);
  if (p <= 0) return;
  const size = 210;
  ctx.save();
  ctx.globalAlpha = p;
  // star halo
  const halo = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 270);
  halo.addColorStop(0, 'rgba(255,211,134,0.18)');
  halo.addColorStop(0.5, 'rgba(255,211,134,0.035)');
  halo.addColorStop(1, 'rgba(255,211,134,0)');
  ctx.fillStyle = halo; ctx.fillRect(W / 2 - 300, H / 2 - 300, 600, 600);
  // tiny stars
  const r = mulberry32(hash('finalseal', 2));
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 90; i++) {
    const a = r() * KIT.TAU, d = 100 + r() * 410;
    ctx.fillStyle = `rgba(247,209,135,${0.16 + r() * 0.5})`;
    ctx.fillRect(W / 2 + Math.cos(a) * d, H / 2 + Math.sin(a) * d * 0.7, 1 + r() * 2, 1 + r() * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  KIT.ink.sealStamp(ctx, W / 2 - size / 2, H / 2 - size / 2, size, '詩史', {
    seed: 770, color: '#b12720', alpha: 0.94, vertical: true, font: FONT.display, border: true, inset: 14,
  });
  KIT.drawText(ctx, '詩　史', W / 2, H / 2 + 138, {
    size: 12, font: FONT.mono, color: 'rgba(238,215,170,0.5)', align: 'center', letterSpacing: 4,
  });
  ctx.restore();
}

/* --------------------------------------------------------------- main */
export function renderOutro(ctx, t, env = {}) {
  const u = clamp(t - 114, 0, 24);
  const cam = camera(u);
  const tiles = env.tiles || [];
  const specs = env.specs || [];

  drawGallery(ctx, cam, u);

  // wall in camera space
  ctx.save();
  for (let i = 0; i < 18; i++) {
    drawWallTile(ctx, cam, i, specs[i] || { index: i, no: String(i + 1).padStart(2, '0'), zh: '', year: '', palette: ['#222', '#111', '#aaa'], accent: '#d4af37' }, tiles[i], u);
  }
  drawEmptyCell(ctx, cam, u);
  ctx.restore();

  // golden particles travel across the wall, between frames
  drawStarStream(ctx, cam, u);

  // a soft vignette and gold flash on the wall during the migration
  if (u > 18 && u < 22) {
    const f = Math.sin(clamp01((u - 18) / 4) * Math.PI) * 0.16;
    ctx.fillStyle = `rgba(229,175,74,${f * 0.16})`;
    ctx.fillRect(0, 0, W, H);
  }

  // final empty-seat flashes
  for (const ft of [10.5, 12.0, 13.5]) {
    if (u >= ft && u < ft + 0.5) {
      const p = (u - ft) / 0.5;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const [sx, sy] = screen(cam, BIG.x, BIG.y);
      const sw = BIG.w * cam.zoom, sh = BIG.h * cam.zoom;
      const g = ctx.createRadialGradient(sx + sw / 2, sy + sh / 2, 10, sx + sw / 2, sy + sh / 2, sw * 0.7);
      g.addColorStop(0, `rgba(255,225,158,${0.22 * (1 - p)})`);
      g.addColorStop(1, 'rgba(255,225,158,0)');
      ctx.fillStyle = g; ctx.fillRect(sx - 80, sy - 80, sw + 160, sh + 160);
      ctx.restore();
    }
  }

  const finalVeil = smoothstep(21.6, 22.8, u) * 0.42;
  if (finalVeil > 0) {
    const fv = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, W * 0.7);
    fv.addColorStop(0, `rgba(3,8,10,${(finalVeil * 0.22).toFixed(3)})`);
    fv.addColorStop(1, `rgba(2,4,6,${finalVeil.toFixed(3)})`);
    ctx.fillStyle = fv;
    ctx.fillRect(0, 0, W, H);
  }
  drawOutroText(ctx, u);
  drawFinalSeal(ctx, u);

  // film-wide registration + grain
  ctx.save();
  const grain = KIT.layer('outro:grain', 480, 270, (c) => KIT.grainLayer(480, 270, 707, { amp: 0.09 }));
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.14;
  ctx.drawImage(grain, 0, 0, W, H);
  ctx.restore();
  KIT.frames.registrationMarks(ctx, 40, 40, W - 80, H - 80, { color: 'rgba(218,185,118,0.14)', len: 14, inset: 0 });
  if (u > 22.2) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  markText('outro-caption-1', '截至大历五年冬，杜甫共走完 4,739 公里，向人间提交了 1,455 首答卷。', 300, 996, 1320, 50, { size: 25 });
  if (u >= 22.4) markText('outro-seal', '詩史', W / 2 - 105, H / 2 - 105, 210, 210, { size: 50 });
  void env;
}

