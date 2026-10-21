/**
 * 04 · 盛唐泥金界画 · 初入长安 / Gold-Green Ruled Painting + 3D TypeField · 746
 *
 * A minutely ruled界画 of Chang'an's palace gate in one-point perspective:
 * raised platform, dougong bracket sets, tiled eaves, lacquered columns, gold
 * studs. The ground is a 40×40 field of 1,600 poem tiles. The doors slam at
 * u=2.0, the edict seal falls, and the sentence on the floor scatters.
 */
import KIT from '../kit/index.js';
import {
  clamp01, lerp, smoothstep, easeOut, easeInBack, easeInOut, hash, unit, mulberry32, TAU,
} from '../kit/math.js';
import { markText } from '../kit/debug.js';

const W = 1920, H = 1080;
// one-point perspective: camera at eye height, horizon at HZ
const CX = 960, HZ = 452, F = 980, CAMY = 236;

const GOLD = '#d4af37';
const GOLD_HI = '#f0dda4';
const GOLD_DK = '#8d6c1c';
const JADE = '#1b4d3e';
const JADE_HI = '#2d6b57';
const JADE_DK = '#071712';
const CINNABAR = '#b4261e';
const PAPER = '#e9dfc6';

function proj(X, Y, Z) {
  const s = F / Z;
  return [CX + X * s, HZ + (CAMY - Y) * s, s];
}

function quad(ctx, a, b, c, d, fill) {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.lineTo(c[0], c[1]);
  ctx.lineTo(d[0], d[1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
}

function line(ctx, a, b, color, width) {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

/* ============================================================ architecture */
function archLayer() {
  return KIT.layer('s04:arch:v2', W, H, (c) => {
    const r = mulberry32(hash('s04arch', 746));

    // ---------- sky: mineral green with a low gold haze
    const sky = c.createLinearGradient(0, 0, 0, HZ + 300);
    sky.addColorStop(0, '#04120e');
    sky.addColorStop(0.4, '#0b2a21');
    sky.addColorStop(0.76, '#1d4d3e');
    sky.addColorStop(1, '#3d7057');
    c.fillStyle = sky;
    c.fillRect(0, 0, W, HZ + 300);

    // gold dust in the air
    c.save();
    for (let i = 0; i < 900; i++) {
      const x = r() * W, y = r() * (HZ + 240);
      const s = 0.6 + Math.pow(r(), 2.6) * 2.6;
      c.fillStyle = `rgba(228,196,116,${(0.03 + r() * 0.22).toFixed(3)})`;
      c.fillRect(x, y, s, s);
    }
    c.restore();

    // ---------- distant wall + roofline
    const dZ = 2600;
    const dTop = proj(0, 260, dZ)[1];
    const dBase = proj(0, 0, dZ)[1];
    quad(c, proj(-2600, 260, dZ), proj(2600, 260, dZ), proj(2600, 0, dZ), proj(-2600, 0, dZ),
      'rgba(10,34,27,0.9)');
    for (let x = -2600; x < 2600; x += 170) {
      const a = proj(x, 260, dZ), b = proj(x + 120, 300, dZ), d = proj(x + 240, 260, dZ);
      c.beginPath();
      c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]);
      c.fillStyle = 'rgba(15,44,34,0.92)';
      c.fill();
    }
    const haze = c.createLinearGradient(0, dTop - 140, 0, dBase + 200);
    haze.addColorStop(0, 'rgba(62,116,90,0)');
    haze.addColorStop(0.55, 'rgba(62,116,90,0.30)');
    haze.addColorStop(1, 'rgba(62,116,90,0)');
    c.fillStyle = haze;
    c.fillRect(0, dTop - 140, W, dBase - dTop + 340);

    // ---------- the platform
    const pz0 = 470, pz1 = 700, py = 44, pxw = 524;
    quad(c, proj(-pxw, py, pz0), proj(pxw, py, pz0), proj(pxw, 0, pz0), proj(-pxw, 0, pz0),
      'rgba(18,52,41,0.98)');
    quad(c, proj(-pxw, py, pz0), proj(pxw, py, pz0), proj(pxw, py, pz1), proj(-pxw, py, pz1),
      'rgba(27,74,57,1)');
    for (let i = 1; i < 5; i++) {
      const y = (i / 5) * py;
      line(c, proj(-pxw, y, pz0), proj(pxw, y, pz0), 'rgba(198,170,96,0.20)', 1);
    }
    for (let i = -9; i <= 9; i++) {
      line(c, proj(i * 58, py, pz0), proj(i * 58, 0, pz0), 'rgba(198,170,96,0.10)', 1);
    }
    line(c, proj(-pxw, py, pz0), proj(pxw, py, pz0), 'rgba(236,210,140,0.6)', 2);
    line(c, proj(-pxw, py, pz0), proj(-pxw, py, pz1), 'rgba(236,210,140,0.3)', 1.4);
    line(c, proj(pxw, py, pz0), proj(pxw, py, pz1), 'rgba(236,210,140,0.3)', 1.4);
    // stairs
    for (let k = 0; k < 3; k++) {
      const z0 = 470 - k * 22 - 6, y1 = (k + 1) * 11;
      quad(c, proj(-160, y1, z0), proj(160, y1, z0), proj(160, 0, z0 + 6), proj(-160, 0, z0 + 6),
        `rgba(${28 + k * 7},${76 + k * 10},${60 + k * 8},0.98)`);
      line(c, proj(-160, y1, z0), proj(160, y1, z0), 'rgba(236,210,140,0.32)', 1.2);
    }

    // ---------- the gate wall
    const wz = 660, wTop = 250, wHalf = 520;
    const openHalf = 152, openTop = 206;
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? -wHalf : openHalf;
      const x1 = side < 0 ? -openHalf : wHalf;
      quad(c, proj(x0, wTop, wz), proj(x1, wTop, wz), proj(x1, py, wz), proj(x0, py, wz),
        'rgba(88,30,22,0.98)');
      for (let i = 0; i < 3; i++) {
        const bx0 = x0 + (x1 - x0) * (0.05 + i * 0.32);
        const bx1 = bx0 + (x1 - x0) * 0.26;
        quad(c, proj(bx0, wTop - 12, wz - 1), proj(bx1, wTop - 12, wz - 1),
          proj(bx1, py + 44, wz - 1), proj(bx0, py + 44, wz - 1), 'rgba(116,36,25,0.96)');
        for (let s = 0; s < 3; s++) {
          for (let t = 0; t < 3; t++) {
            const gx = bx0 + (bx1 - bx0) * (0.28 + s * 0.22);
            const gy = py + 56 + t * 44;
            const q = proj(gx, gy, wz - 2);
            const rad = 2.6 * q[2];
            const gg = c.createRadialGradient(q[0] - rad * 0.3, q[1] - rad * 0.3, rad * 0.1, q[0], q[1], rad);
            gg.addColorStop(0, GOLD_HI);
            gg.addColorStop(0.6, GOLD);
            gg.addColorStop(1, GOLD_DK);
            c.fillStyle = gg;
            c.beginPath(); c.arc(q[0], q[1], rad, 0, TAU); c.fill();
          }
        }
      }
    }
    // lintel
    quad(c, proj(-openHalf - 26, wTop, wz), proj(openHalf + 26, wTop, wz),
      proj(openHalf + 26, openTop, wz), proj(-openHalf - 26, openTop, wz), 'rgba(118,38,26,0.98)');
    for (let i = 0; i < 9; i++) {
      const x = -openHalf + i * (openHalf * 2 / 8);
      line(c, proj(x, wTop, wz - 1), proj(x, openTop, wz - 1), 'rgba(236,210,140,0.16)', 1);
    }
    line(c, proj(-openHalf - 26, wTop, wz), proj(openHalf + 26, wTop, wz), 'rgba(236,210,140,0.6)', 2);
    line(c, proj(-openHalf - 26, openTop, wz), proj(openHalf + 26, openTop, wz), 'rgba(236,210,140,0.3)', 1.2);

    // ---------- the dark passage behind the doors
    quad(c, proj(-openHalf, openTop, wz + 4), proj(openHalf, openTop, wz + 4),
      proj(openHalf, py, wz + 4), proj(-openHalf, py, wz + 4), 'rgba(3,10,8,0.99)');
    for (let k = 0; k < 4; k++) {
      const yy = openTop - 22 - k * 38;
      line(c, proj(-openHalf + 14, yy, wz + 8), proj(openHalf - 14, yy, wz + 8), 'rgba(214,186,112,0.09)', 1);
    }
    const glowY = proj(0, 120, wz + 6)[1];
    const glow = c.createRadialGradient(CX, glowY, 10, CX, glowY, 220);
    glow.addColorStop(0, 'rgba(232,196,116,0.22)');
    glow.addColorStop(1, 'rgba(232,196,116,0)');
    c.fillStyle = glow;
    c.fillRect(CX - 240, glowY - 220, 480, 440);

    // ---------- columns
    const colXs = [-500, -330, -176, 176, 330, 500];
    for (const cxp of colXs) {
      const bot = proj(cxp, py, wz - 6), top = proj(cxp, wTop + 10, wz - 6);
      const w = 13 * top[2];
      const g = c.createLinearGradient(bot[0] - w, 0, bot[0] + w, 0);
      g.addColorStop(0, 'rgba(70,18,13,0.99)');
      g.addColorStop(0.3, 'rgba(166,56,36,0.99)');
      g.addColorStop(0.52, 'rgba(208,88,56,0.99)');
      g.addColorStop(0.78, 'rgba(128,38,26,0.99)');
      g.addColorStop(1, 'rgba(54,14,10,0.99)');
      c.fillStyle = g;
      c.fillRect(bot[0] - w, top[1], w * 2, bot[1] - top[1]);
      c.fillStyle = 'rgba(28,74,58,1)';
      c.fillRect(bot[0] - w * 1.35, bot[1] - 7 * bot[2], w * 2.7, 9 * bot[2]);
      c.fillStyle = 'rgba(196,164,88,0.92)';
      c.fillRect(top[0] - w * 1.25, top[1] - 3 * top[2], w * 2.5, 4 * top[2]);
      line(c, [bot[0] + w * 0.55, top[1]], [bot[0] + w * 0.55, bot[1]], 'rgba(244,216,150,0.30)', 1.4);
    }

    // ---------- dougong bracket sets
    const dgY0 = wTop + 10, dgY1 = wTop + 62;
    for (let i = 0; i < 16; i++) {
      const x = -500 + i * 66;
      quad(c, proj(x, dgY1, wz - 4), proj(x + 44, dgY1, wz - 4),
        proj(x + 30, dgY0, wz - 4), proj(x + 14, dgY0, wz - 4), 'rgba(24,68,54,0.99)');
      quad(c, proj(x - 8, dgY1 - 14, wz - 6), proj(x + 52, dgY1 - 14, wz - 6),
        proj(x + 46, dgY1 - 4, wz - 6), proj(x, dgY1 - 4, wz - 6), 'rgba(198,164,88,0.94)');
      quad(c, proj(x + 8, dgY0 + 26, wz - 8), proj(x + 34, dgY0 + 26, wz - 8),
        proj(x + 34, dgY0 + 36, wz - 8), proj(x + 8, dgY0 + 36, wz - 8), 'rgba(198,164,88,0.8)');
    }

    // ---------- eave + tiled roofs
    const ez0 = wz - 92, ez1 = wz + 26;
    quad(c, proj(-640, dgY1 + 8, ez0), proj(640, dgY1 + 8, ez0),
      proj(640, dgY1 - 6, ez1), proj(-640, dgY1 - 6, ez1), 'rgba(16,48,38,0.99)');
    for (let i = -38; i <= 38; i++) {
      const x = i * 17;
      line(c, proj(x, dgY1 + 10, ez0), proj(x, dgY1 - 8, ez1), 'rgba(214,180,104,0.28)', 1);
    }
    line(c, proj(-640, dgY1 - 6, ez1), proj(640, dgY1 - 6, ez1), 'rgba(232,202,124,0.6)', 2);

    const roofTiers = [
      { y0: dgY1 + 74, y1: dgY1 + 12, z0: ez0 - 8, z1: ez0 - 130, half: 700, inner: 560 },
      { y0: dgY1 + 148, y1: dgY1 + 80, z0: ez0 - 96, z1: ez0 - 230, half: 580, inner: 420 },
    ];
    for (let k = 0; k < roofTiers.length; k++) {
      const t = roofTiers[k];
      quad(c, proj(-t.half, t.y1, t.z0), proj(t.half, t.y1, t.z0),
        proj(t.half * 0.64, t.y0, t.z1), proj(-t.half * 0.64, t.y0, t.z1), 'rgba(7,24,19,0.99)');
      const rg = c.createLinearGradient(0, proj(0, t.y1, t.z0)[1], 0, proj(0, t.y0, t.z1)[1]);
      rg.addColorStop(0, '#33705a');
      rg.addColorStop(0.5, '#215743');
      rg.addColorStop(1, '#123c30');
      quad(c, proj(-t.half, t.y1, t.z0), proj(t.half, t.y1, t.z0),
        proj(t.half * 0.64, t.y0, t.z1), proj(-t.half * 0.64, t.y0, t.z1), rg);
      for (let i = -20; i <= 20; i++) {
        const p = i / 20;
        line(c, proj(t.half * p, t.y1, t.z0), proj(t.half * 0.64 * p, t.y0, t.z1),
          `rgba(160,206,182,${(0.09 + (i % 2 ? 0.05 : 0)).toFixed(3)})`, 1.2);
      }
      line(c, proj(-t.half, t.y1, t.z0), proj(t.half, t.y1, t.z0), 'rgba(226,196,116,0.8)', 3);
      line(c, proj(-t.half * 0.64, t.y0, t.z1), proj(t.half * 0.64, t.y0, t.z1), 'rgba(226,196,116,0.55)', 2);
      for (const sgn of [-1, 1]) {
        line(c, proj(sgn * t.half, t.y1, t.z0), proj(sgn * (t.half + 30), t.y1 + 26, t.z0 - 14),
          'rgba(232,202,124,0.85)', 3);
        line(c, proj(sgn * t.half * 0.64, t.y0, t.z1), proj(sgn * (t.half * 0.64 + 26), t.y0 + 20, t.z1 - 8),
          'rgba(232,202,124,0.6)', 2.4);
      }
    }
    // ridge ornament
    const rc = proj(0, dgY1 + 160, ez0 - 230);
    c.fillStyle = 'rgba(226,196,116,0.92)';
    c.beginPath();
    c.moveTo(rc[0] - 15 * rc[2], rc[1]);
    c.lineTo(rc[0], rc[1] - 26 * rc[2]);
    c.lineTo(rc[0] + 15 * rc[2], rc[1]);
    c.closePath();
    c.fill();

    // ---------- floor
    const floor = c.createLinearGradient(0, HZ + 60, 0, H);
    floor.addColorStop(0, 'rgba(16,48,39,1)');
    floor.addColorStop(0.45, 'rgba(10,32,26,1)');
    floor.addColorStop(1, 'rgba(5,17,14,1)');
    c.fillStyle = floor;
    c.fillRect(0, HZ + 60, W, H - HZ - 60);
    // paving joints in perspective
    c.save();
    c.strokeStyle = 'rgba(150,196,172,0.10)';
    c.lineWidth = 1;
    for (let i = -10; i <= 10; i++) {
      const a = proj(i * 150, 0, 470), b = proj(i * 320, 0, 3000);
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    }
    for (let z = 500; z < 3000; z += 170) {
      const a = proj(-2600, 0, z), b = proj(2600, 0, z);
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    }
    c.restore();
    // shadow of the gate on the floor
    const sh = c.createLinearGradient(0, proj(0, 0, 470)[1], 0, proj(0, 0, 470)[1] + 130);
    sh.addColorStop(0, 'rgba(2,8,7,0.75)');
    sh.addColorStop(1, 'rgba(2,8,7,0)');
    c.fillStyle = sh;
    c.fillRect(0, proj(0, 0, 470)[1] - 4, W, 150);
  });
}

/* ============================================================ the doors */
function doorTheta(u) {
  // 1.02 rad open → 0 closed, in 0.12 s, with an overshoot spring
  if (u < 1.995) return 0.62;
  const t = clamp01((u - 1.995) / 0.12);
  const over = Math.exp(-t * 5.5) * Math.sin(t * 26) * 0.06;
  return (0.62 * (1 - easeOut(t))) * (1 + over);
}

function drawDoors(ctx, u) {
  const th = doorTheta(u);
  const wz = 662;
  for (const side of [-1, 1]) {
    const hingeX = side * 152;
    const tipX = side * (152 - 152 * Math.cos(th));
    const tipZ = wz + 152 * Math.sin(th);
    const p0 = proj(hingeX, 206, wz);
    const p1 = proj(tipX, 206, tipZ);
    const p2 = proj(tipX, 48, tipZ);
    const p3 = proj(hingeX, 48, wz);
    quad(ctx, p0, p1, p2, p3, 'rgba(56,18,13,0.99)');
    // lacquer sheen follows the panel angle
    const sx = (p0[0] + p1[0]) / 2;
    const g = ctx.createLinearGradient(sx - 60, 0, sx + 60, 0);
    g.addColorStop(0, `rgba(152,52,32,${0.42 + 0.3 * Math.cos(th)})`);
    g.addColorStop(0.45, 'rgba(92,24,17,0.95)');
    g.addColorStop(1, 'rgba(34,9,7,0.98)');
    ctx.fillStyle = g;
    quad(ctx, p0, p1, p2, p3, g);
    // gold nail array in the door's own space
    const cols = 4, rows = 5;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const fx = (i + 0.5) / cols, fy = (j + 0.5) / rows;
        const X = lerp(hingeX, tipX, fx);
        const Z = lerp(wz, tipZ, fx);
        const Y = lerp(206, 48, fy);
        const q = proj(X, Y, Z);
        const rad = 4.2 * q[2] * (1 - 0.25 * Math.abs(Math.sin(th)));
        const gg = ctx.createRadialGradient(q[0] - rad * 0.4, q[1] - rad * 0.4, rad * 0.1, q[0], q[1], rad);
        gg.addColorStop(0, GOLD_HI);
        gg.addColorStop(0.65, GOLD);
        gg.addColorStop(1, GOLD_DK);
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.ellipse(q[0], q[1], rad, rad * 0.9, 0, 0, TAU); ctx.fill();
      }
    }
    // edge rules
    line(ctx, p0, p1, 'rgba(238,212,144,0.6)', 2);
    line(ctx, p3, p2, 'rgba(238,212,144,0.4)', 1.6);
    line(ctx, p1, p2, 'rgba(238,212,144,0.7)', 2.2);
  }
  // the hot weld seam once the doors are shut
  if (u > 2.05) {
    const weld = smoothstep(2.05, 2.5, u) * (1 - smoothstep(4.2, 5.0, u));
    const a = proj(0, 206, wz - 1), b = proj(0, 48, wz - 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,196,96,${(0.5 * weld).toFixed(3)})`;
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.strokeStyle = `rgba(255,248,224,${(0.85 * weld).toFixed(3)})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    // sparks crawling down the seam
    const sr = mulberry32(hash('s04spark', 5));
    for (let i = 0; i < 24; i++) {
      const t = ((sr() + u * 0.4) % 1);
      const y = lerp(a[1], b[1], t);
      const x = a[0] + (sr() - 0.5) * 14;
      ctx.fillStyle = `rgba(255,214,140,${(0.3 + sr() * 0.5) * weld})`;
      ctx.fillRect(x, y, 1.6, 3 + sr() * 5);
    }
    ctx.restore();
  }
}

/* ============================================================ type field */
const GRID = 40;
const TILE_TEXT = '致君尧舜上';
let TILES = null;
let SPRITES = null;
const DICT = '致君尧舜上再使风俗淳读书破万卷下笔如有神长安宫阙九重门金榜题名落第';

function buildTiles() {
  if (TILES) return TILES;
  const r = mulberry32(hash('s04tiles', 746));
  // glyph mask for the phrase (5 chars × 8 cols, 8 rows deep)
  // the phrase is laid on the floor in 13×13-cell characters: 3 across, then 2
  const CELL = 8, CW = GRID * CELL, CH = GRID * CELL;
  const maskCanvas = KIT.makeCanvas(CW, CH);
  const mc = maskCanvas.getContext('2d');
  mc.fillStyle = '#000';
  mc.fillRect(0, 0, CW, CH);
  mc.fillStyle = '#fff';
  mc.font = `800 ${7.4 * CELL}px ${KIT.FONT.display}`;
  mc.textAlign = 'center';
  mc.textBaseline = 'middle';
  for (let i = 0; i < 5; i++) mc.fillText(TILE_TEXT[i], (i * 8 + 4) * CELL, 4.2 * CELL);
  
  const md = mc.getImageData(0, 0, CW, CH).data;
  const lit = [];
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      let acc = 0;
      for (let yy = 0; yy < CELL; yy += 2) {
        for (let xx = 0; xx < CELL; xx += 2) {
          acc += md[((j * CELL + yy) * CW + (i * CELL + xx)) * 4];
        }
      }
      lit.push(acc > 16 * 255 * 0.5);
    }
  }
  TILES = [];
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const X = (i - (GRID - 1) / 2) * 27;
      const Z = 760 + j * 44;
      const isLit = j < 8 && lit[j * GRID + i];
      TILES.push({
        i, j, X, Z,
        ch: DICT[Math.floor(r() * DICT.length)],
        lit: isLit,
        delay: (j / GRID) * 0.55 + r() * 0.18,
        wob: r(),
        tumble: [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1],
        seed: r(),
      });
    }
  }
  return TILES;
}

function buildSprites() {
  if (SPRITES) return SPRITES;
  SPRITES = new Map();
  const set = new Set(DICT + TILE_TEXT);
  for (const ch of set) {
    const cv = KIT.makeCanvas(48, 48);
    const c = cv.getContext('2d');
    c.fillStyle = '#f6e2b4';
    c.font = `700 40px ${KIT.FONT.display}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(ch, 24, 25);
    SPRITES.set(ch, cv);
  }
  return SPRITES;
}

function drawTypeField(ctx, u, breakP) {
  const tiles = buildTiles();
  const sprites = buildSprites();
  const rise = smoothstep(0.15, 1.5, u);
  // buckets: front-to-back so nearer tiles paint over
  const buckets = new Map();
  for (const t of tiles) {
    const rr = clamp01((rise - t.delay) / 0.5);
    if (rr <= 0.001) continue;
    let h = (t.lit ? 64 : 30) * rr;
    let X = t.X, Z = t.Z, Y0 = 0;
    // bar 3: the sentence tumbles apart
    if (breakP > 0.001) {
      const k = breakP * (0.4 + t.wob);
      X += t.tumble[0] * 90 * k + Math.sin(u * 2 + t.seed * 8) * 26 * k;
      Z += t.tumble[1] * 70 * k;
      Y0 += Math.abs(t.tumble[2]) * 40 * k;
      h *= 1 - 0.4 * k;
    }
    const half = 12.2;
    const a = proj(X - half, Y0, Z - half);
    const b = proj(X + half, Y0, Z - half);
    const c = proj(X + half, Y0 + h, Z - half);
    const d = proj(X - half, Y0 + h, Z - half);
    if (a[1] > H + 40 || a[0] < -60 || a[0] > W + 60) continue;
    const key = t.lit
      ? `L${Math.round(a[1] / 26)}`
      : `D${Math.round(a[1] / 34)}`;
    let arr = buckets.get(key);
    if (!arr) { arr = []; buckets.set(key, arr); }
    arr.push([a, b, c, d, t, rr, h]);
    t._screen = a;
  }
  const keys = [...buckets.keys()].sort((p, q) => +p.slice(1) - +q.slice(1));
  for (const key of keys) {
    const arr = buckets.get(key);
    const isLit = key[0] === 'L';
    const depth = +key.slice(1);
    // one path for the whole bucket — 1,600 quads stay cheap
    ctx.beginPath();
    for (const [a, b, c, d] of arr) {
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(c[0], c[1]);
      ctx.lineTo(d[0], d[1]);
      ctx.closePath();
    }
    if (isLit) {
      const al = clamp01(0.95 - depth * 0.016);
      ctx.fillStyle = `rgba(214,60,36,${al.toFixed(3)})`;
    } else {
      const al = clamp01(0.82 - depth * 0.02);
      ctx.fillStyle = `rgba(22,66,52,${al.toFixed(3)})`;
    }
    ctx.fill();
    // the top rim catches the gold light
    ctx.beginPath();
    for (const [aa, bb, cc, dd] of arr) {
      ctx.moveTo(dd[0], dd[1]);
      ctx.lineTo(cc[0], cc[1]);
      void aa; void bb;
    }
    ctx.strokeStyle = isLit ? 'rgba(255,214,150,0.55)' : 'rgba(206,176,104,0.30)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
  // glyph sprites on the near tiles only
  ctx.save();
  for (const t of tiles) {
    const rr = clamp01((rise - t.delay) / 0.5);
    if (rr < 0.6) continue;
    if (!t.lit && t.j > 26) continue;
    let X = t.X, Z = t.Z;
    let h = (t.lit ? 64 : 30) * rr;
    if (breakP > 0.001) {
      const k = breakP * (0.4 + t.wob);
      X += t.tumble[0] * 90 * k;
      Z += t.tumble[1] * 70 * k;
      h *= 1 - 0.4 * k;
    }
    const q = proj(X, h, Z);
    const size = 17 * q[2];
    if (size < 6 || q[1] > H) continue;
    if (t.lit) {
      const spr = sprites.get(t.ch);
      if (!spr) continue;
      ctx.globalAlpha = clamp01((size - 5) / 8) * 0.96;
      ctx.drawImage(spr, q[0] - size / 2, q[1] - size * 0.78, size, size);
    } else {
      ctx.globalAlpha = clamp01((size - 5) / 8) * 0.32;
      ctx.fillStyle = 'rgba(226,196,116,0.9)';
      ctx.fillRect(q[0] - 1, q[1] - 2.4, 1.8, 1.8);
    }
  }
  ctx.restore();

  // the vermilion glow of the lit phrase
  const glowA = rise * (1 - breakP);
  if (glowA > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(CX, 700, 20, CX, 700, 640);
    g.addColorStop(0, `rgba(226,64,32,${(0.16 * glowA).toFixed(3)})`);
    g.addColorStop(1, 'rgba(226,64,32,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 420, W, 660);
    ctx.restore();
  }
}

/* =============================================================== Du Fu */
function drawDuFu(ctx, u, x, z, pose) {
  const p = proj(x, 0, z);
  const s = p[2] * 0.42;
  const P = KIT.rig.pose({
    t: u, phase: (u / 1.0) * TAU, mode: 'walk', wind: 0.4,
    lean: pose.lean ?? 0, look: pose.look ?? 0, staff: true, beard: 0.4,
  });
  const pos = KIT.rig.placed(P, { x: p[0], y: p[1], scale: s });
  // contact shadow
  ctx.save();
  ctx.fillStyle = 'rgba(2,8,7,0.55)';
  ctx.beginPath();
  ctx.ellipse(p[0], p[1] + 2, 44 * s, 9 * s, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  // gold outline figure
  KIT.rig.drawSilhouette(ctx, pos, { color: 'rgba(9,28,22,0.85)', alpha: 1 });
  KIT.rig.drawWire(ctx, pos, { color: 'rgba(238,212,146,0.92)', width: 1.5, alpha: 1 });
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  KIT.rig.drawWire(ctx, pos, { color: 'rgba(226,180,90,0.25)', width: 4, alpha: 1 });
  ctx.restore();
  return pos;
}

/* ================================================================ edict */
/**
 * The decree is a palm-sized cinnabar seal-plaque that quivers under the eave,
 * NOT a full-width banner. It hangs at y = 230 (h = 110) so the closed vermilion
 * gate and its gold studs stay legible underneath for the whole beat.
 */
function drawEdict(ctx, u) {
  const t = u - 2.06;
  if (t < 0) return;
  const drop = clamp01(t / 0.30);
  const settle = Math.max(0, t - 0.30);
  const quiver = Math.sin(settle * 26) * Math.exp(-settle * 6.5);
  const y = 230 + (1 - easeOut(drop)) * -420 + quiver * 7;
  const w = 560, h = 110;
  ctx.save();
  ctx.translate(960, y);
  const rot = (1 - easeOut(drop)) * -0.06 + quiver * 0.026;
  ctx.rotate(rot);
  // shadow into the gate roof
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = 'rgba(2,8,7,0.9)';
  ctx.fillRect(-w / 2 + 12, -h / 2 + 16, w, h);
  ctx.restore();
  // the seal: a carved vermilion block
  const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  g.addColorStop(0, '#a8271c');
  g.addColorStop(0.42, '#c2352a');
  g.addColorStop(0.6, '#9c2118');
  g.addColorStop(1, '#7d1a13');
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  // seal-paste texture
  const r = mulberry32(hash('s04seal', 3));
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  for (let i = 0; i < 900; i++) {
    const px = -w / 2 + r() * w, py = -h / 2 + r() * h;
    ctx.fillStyle = r() < 0.5 ? `rgba(255,190,150,${(0.03 + r() * 0.1).toFixed(3)})` : `rgba(70,10,6,${(0.04 + r() * 0.14).toFixed(3)})`;
    ctx.fillRect(px, py, 1 + r() * 3, 1 + r() * 2);
  }
  ctx.restore();
  // gold frame
  ctx.strokeStyle = 'rgba(240,214,140,0.9)';
  ctx.lineWidth = 2.6;
  ctx.strokeRect(-w / 2 + 9, -h / 2 + 9, w - 18, h - 18);
  ctx.strokeStyle = 'rgba(240,214,140,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(-w / 2 + 16, -h / 2 + 16, w - 32, h - 32);
  // the decree
  KIT.drawText(ctx, '诏下，无一人中第', 0, -8, {
    size: 47, font: KIT.FONT.display, weight: 800, color: '#f6e7c2',
    align: 'center', letterSpacing: 4.5,
    shadow: { color: 'rgba(60,6,4,0.8)', blur: 0, x: 2, y: 3 },
  });
  KIT.drawText(ctx, 'IMPERIAL DECREE · NOT ONE PASSED · 746', 0, 32, {
    size: 9.5, font: KIT.FONT.mono, weight: 600, color: 'rgba(246,225,190,0.66)', align: 'center', letterSpacing: 2.6,
  });
  // hairline fractures that open on the impact
  const cr = smoothstep(2.30, 2.62, u);
  if (cr > 0.01) {
    ctx.save();
    ctx.strokeStyle = `rgba(58,8,5,${(0.75 * cr).toFixed(3)})`;
    ctx.lineWidth = 1.6;
    const cracks = [
      [[-w / 2 + 40, -h / 2 + 6], [-w / 2 + 74, -6], [-w / 2 + 58, 30], [-w / 2 + 96, h / 2 - 6]],
      [[w / 2 - 48, -h / 2 + 4], [w / 2 - 88, 4], [w / 2 - 70, 38], [w / 2 - 104, h / 2 - 4]],
      [[-10, h / 2 - 2], [4, 16], [-16, -h / 2 + 3]],
    ];
    for (const pts of cracks) {
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const k = 0.35 + 0.65 * cr;
        const px = pts[i][0] * k, py = pts[i][1] * k;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  // chips
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 34; i++) {
    const px = -w / 2 + r() * w, py = -h / 2 + r() * h;
    ctx.beginPath(); ctx.arc(px, py, 0.8 + r() * 2.8, 0, TAU); ctx.fill();
  }
  ctx.restore();
  void u;
}

/* ============================================================ impact fx */
const MOTES = [];
function initMotes() {
  if (MOTES.length) return;
  const r = mulberry32(hash('s04motes', 5));
  for (let i = 0; i < 420; i++) {
    MOTES.push({ x: r() * W, y: r() * H * 0.9, s: 0.7 + Math.pow(r(), 2) * 3, a: 0.12 + r() * 0.6, v: 30 + r() * 120 });
  }
}
function drawDust(ctx, u) {
  const t = u - 2.0;
  if (t < 0 || t > 3.2) return;
  const k = Math.exp(-t * 0.7);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const m of MOTES) {
    const y = m.y + t * m.v;
    if (y > H + 20) continue;
    ctx.fillStyle = `rgba(238,206,128,${(m.a * k).toFixed(3)})`;
    ctx.fillRect(m.x + Math.sin(t * 2 + m.s * 9) * 8 * t, y, m.s, m.s);
  }
  ctx.restore();
}

function drawShock(ctx, u) {
  const t = u - 2.0;
  if (t < 0 || t > 1.1) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const p = clamp01(t / 1.1);
  const cx = CX, cy = proj(0, 90, 660)[1];
  ctx.strokeStyle = `rgba(246,216,140,${(0.55 * (1 - p)).toFixed(3)})`;
  ctx.lineWidth = 8 * (1 - p) + 1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 80 + p * 900, (80 + p * 900) * 0.42, 0, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,244,214,${(0.3 * (1 - p)).toFixed(3)})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 40 + p * 620, (40 + p * 620) * 0.42, 0, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

/* ============================================================ gate crown */
/**
 * A vertical three-tier gate crown painted over the wide wall. The base plate
 * read as a low horizontal band; this screen-space altar roof gives the palace
 * the vertical pressure the scene needs without changing the 1-point camera.
 */
function drawCrown(ctx, u) {
  const cx = 960;
  const tiers = [
    { top: 306, bottom: 354, half: 430, inner: 332, fill: '#12372b' },
    { top: 232, bottom: 306, half: 306, inner: 226, fill: '#174638' },
    { top: 148, bottom: 232, half: 202, inner: 142, fill: '#1d5140' },
  ];
  ctx.save();
  ctx.globalAlpha = 0.97;
  for (let k = 0; k < tiers.length; k++) {
    const t = tiers[k];
    // shadow under the eave
    ctx.fillStyle = 'rgba(2,8,6,0.42)';
    ctx.beginPath();
    ctx.moveTo(cx - t.half - 18, t.bottom + 20);
    ctx.lineTo(cx + t.half + 18, t.bottom + 20);
    ctx.lineTo(cx + t.half * 0.78, t.top + 34);
    ctx.lineTo(cx - t.half * 0.78, t.top + 34);
    ctx.closePath(); ctx.fill();
    // red bracket wall between tiers
    const wallY = t.bottom;
    const wg = ctx.createLinearGradient(0, wallY, 0, wallY + 46);
    wg.addColorStop(0, '#7f291e');
    wg.addColorStop(1, '#3b110d');
    ctx.fillStyle = wg;
    ctx.fillRect(cx - t.inner, wallY, t.inner * 2, 34);
    // columns
    ctx.fillStyle = 'rgba(203,74,45,0.9)';
    ctx.fillRect(cx - t.inner, wallY, 7, 36);
    ctx.fillRect(cx + t.inner - 7, wallY, 7, 36);
    // gold bracket teeth under the eave
    for (let i = -4; i <= 4; i++) {
      ctx.fillStyle = 'rgba(212,175,55,0.8)';
      ctx.fillRect(cx + (i / 4) * t.inner * 0.74 - 12, t.bottom - 6, 24, 5);
      ctx.fillRect(cx + (i / 4) * t.inner * 0.74 - 6, t.bottom - 15, 12, 10);
    }
    // roof surface
    const grad = ctx.createLinearGradient(0, t.top, 0, t.bottom);
    grad.addColorStop(0, '#2c6a54');
    grad.addColorStop(0.48, t.fill);
    grad.addColorStop(1, '#071a13');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - t.half, t.bottom);
    ctx.lineTo(cx - t.half * 0.67, t.top);
    ctx.lineTo(cx + t.half * 0.67, t.top);
    ctx.lineTo(cx + t.half, t.bottom);
    ctx.lineTo(cx + t.half + 30, t.bottom - 22);
    ctx.lineTo(cx + t.half * 0.67 + 18, t.top + 8);
    ctx.lineTo(cx - t.half * 0.67 - 18, t.top + 8);
    ctx.lineTo(cx - t.half - 30, t.bottom - 22);
    ctx.closePath();
    ctx.fill();
    // tile ribs in perspective
    ctx.strokeStyle = 'rgba(140,193,168,0.23)';
    ctx.lineWidth = 1.1;
    for (let i = -22; i <= 22; i++) {
      const p = i / 22;
      ctx.beginPath();
      ctx.moveTo(cx + p * t.half, t.bottom - 3);
      ctx.lineTo(cx + p * t.half * 0.67, t.top + 10);
      ctx.stroke();
    }
    // gold eave edges and upturned corners
    ctx.strokeStyle = 'rgba(236,203,124,0.78)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cx - t.half - 30, t.bottom - 22);
    ctx.lineTo(cx - t.half, t.bottom);
    ctx.lineTo(cx + t.half, t.bottom);
    ctx.lineTo(cx + t.half + 30, t.bottom - 22);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(236,203,124,0.38)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - t.half * 0.67, t.top);
    ctx.lineTo(cx + t.half * 0.67, t.top);
    ctx.stroke();
  }
  // finial and ridge
  ctx.fillStyle = 'rgba(228,196,116,0.9)';
  ctx.beginPath();
  ctx.moveTo(cx - 14, 148);
  ctx.lineTo(cx, 118);
  ctx.lineTo(cx + 14, 148);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(cx - 2, 100, 4, 20);
  // two hanging lanterns on the lowest eave
  for (const lx of [cx - 335, cx + 335]) {
    const glow = ctx.createRadialGradient(lx, 381, 2, lx, 381, 42);
    glow.addColorStop(0, 'rgba(255,193,98,0.32)');
    glow.addColorStop(1, 'rgba(255,193,98,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(lx, 381, 42, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c24b2e'; ctx.fillRect(lx - 8, 366, 16, 24);
    ctx.strokeStyle = 'rgba(238,203,124,0.7)'; ctx.lineWidth = 1;
    ctx.strokeRect(lx - 8, 366, 16, 24);
    ctx.fillStyle = 'rgba(224,195,122,0.6)'; ctx.fillRect(lx - 1, 350, 2, 16);
  }
  ctx.restore();
  void u;
}

/* ============================================================ hero blocks */
/**
 * The five core characters of the floor sentence, cut as real 3-D blocks at
 * 2.2× the tile height (140.8 px world). Each block exposes a bright gold top
 * face, a lacquered jade front and a shaded side so the TypeField reads as
 * volume, not as a decal. On the decree impact they quiver and sink.
 */
const HERO_TEXT = ['致', '君', '尧', '舜', '上'];
const HERO_H = 64 * 2.2;          // 140.8
const HERO_HW = 57;               // half width
const HERO_HD = 46;               // half depth
const HERO_Z = 930;
const HERO_STEP = 128;

function drawHeroBlocks(ctx, u, breakP) {
  const rise = smoothstep(0.55, 1.75, u);
  if (rise <= 0.001) return;
  const imp = u >= 2.06 ? clamp01((u - 2.06) / 0.6) : 0;
  const quake = u >= 2.06 ? Math.exp(-(u - 2.06) * 5.2) : 0;
  ctx.save();
  for (let i = 0; i < HERO_TEXT.length; i++) {
    const ch = HERO_TEXT[i];
    const Xc = (i - 2) * HERO_STEP;
    const local = clamp01((rise - i * 0.07) / 0.55);
    if (local <= 0.001) continue;
    // sink and lateral jitter on the decree impact
    const sink = imp * (0.30 + 0.16 * (i % 3) / 2) * HERO_H;
    const jx = Math.sin(u * 74 + i * 2.1) * 10 * quake;
    const jy = Math.cos(u * 63 + i * 1.7) * 8 * quake;
    const Y0 = -sink;
    const Hh = HERO_H * local;
    const Zc = HERO_Z - (2.2 - local) * 60;
    const a = proj(Xc - HERO_HW, Y0, Zc - HERO_HD);
    const b = proj(Xc + HERO_HW, Y0, Zc - HERO_HD);
    const c = proj(Xc + HERO_HW, Y0 + Hh, Zc - HERO_HD);
    const d = proj(Xc - HERO_HW, Y0 + Hh, Zc - HERO_HD);
    const bt = proj(Xc + HERO_HW, Y0 + Hh, Zc + HERO_HD);
    const at = proj(Xc - HERO_HW, Y0 + Hh, Zc + HERO_HD);
    const bf = proj(Xc + HERO_HW, Y0, Zc + HERO_HD);
    const af = proj(Xc - HERO_HW, Y0, Zc + HERO_HD);
    const ox = jx, oy = jy;
    const shift = (p) => [p[0] + ox, p[1] + oy];
    if (b[1] > H + 80) continue;
    ctx.save();
    ctx.globalAlpha = smoothstep(0, 0.5, local) * (1 - breakP * 0.35);
    // ---- top face: the sunlit gold plane
    const topG = ctx.createLinearGradient(at[0], at[1], bt[0], bt[1]);
    topG.addColorStop(0, 'rgba(250,230,170,0.98)');
    topG.addColorStop(0.5, 'rgba(226,190,104,0.96)');
    topG.addColorStop(1, 'rgba(178,140,58,0.94)');
    quad(ctx, shift(d), shift(c), shift(bt), shift(at), topG);
    // ---- side face (the one facing the camera axis)
    const sideG = ctx.createLinearGradient(0, c[1], 0, b[1]);
    sideG.addColorStop(0, 'rgba(30,84,66,0.99)');
    sideG.addColorStop(1, 'rgba(4,18,14,0.99)');
    if (Xc < 0) quad(ctx, shift(b), shift(bf), shift(bt), shift(c), sideG);
    else quad(ctx, shift(a), shift(af), shift(at), shift(d), sideG);
    // ---- front face: lacquered jade
    const frontG = ctx.createLinearGradient(a[0], d[1], b[0], a[1]);
    frontG.addColorStop(0, '#17493b');
    frontG.addColorStop(0.42, '#0d2f27');
    frontG.addColorStop(1, '#071c17');
    quad(ctx, shift(a), shift(b), shift(c), shift(d), frontG);
    // gold rim
    ctx.strokeStyle = 'rgba(236,205,132,0.92)';
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(a[0] + ox, a[1] + oy); ctx.lineTo(b[0] + ox, b[1] + oy);
    ctx.lineTo(c[0] + ox, c[1] + oy); ctx.lineTo(d[0] + ox, d[1] + oy);
    ctx.closePath(); ctx.stroke();
    // seam highlight on the top-front edge
    ctx.strokeStyle = 'rgba(255,246,214,0.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(d[0] + ox, d[1] + oy); ctx.lineTo(c[0] + ox, c[1] + oy);
    ctx.stroke();
    // the glyph, struck on the front plane (no perspective shear: it is parallel)
    const fw = Math.abs(b[0] - a[0]);
    const fh = Math.abs(a[1] - d[1]);
    if (fw > 18 && fh > 18) {
      const gs = Math.min(fw, fh) * 0.78;
      KIT.drawText(ctx, ch, (a[0] + b[0]) / 2 + ox, (a[1] + d[1]) / 2 + oy, {
        size: gs, font: KIT.FONT.display, weight: 800, color: 'rgba(250,232,182,0.97)',
        align: 'center',
        shadow: { color: 'rgba(255,214,130,0.55)', blur: 10, x: 0, y: 0 },
      });
      if (imp > 0.25) {
        // fracture across the face
        ctx.strokeStyle = `rgba(226,120,70,${(0.7 * imp).toFixed(3)})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(a[0] + fw * 0.18 + ox, a[1] - fh * 0.12 + oy);
        ctx.lineTo(a[0] + fw * 0.46 + ox, a[1] - fh * 0.6 + oy);
        ctx.lineTo(a[0] + fw * 0.38 + ox, a[1] - fh * 0.95 + oy);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  ctx.restore();
  // a gold rule on the floor under the block row
  const ruleA = smoothstep(0.9, 1.8, u) * (1 - breakP);
  if (ruleA > 0.01) {
    const p0 = proj(-2 * HERO_STEP - HERO_HW - 30, 0, HERO_Z);
    const p1 = proj(2 * HERO_STEP + HERO_HW + 30, 0, HERO_Z);
    ctx.save();
    ctx.globalAlpha = ruleA * 0.7;
    ctx.strokeStyle = 'rgba(232,196,116,0.8)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(p0[0], p0[1] - 4); ctx.lineTo(p1[0], p1[1] - 4); ctx.stroke();
    ctx.restore();
  }
  const bx0 = proj(-2 * HERO_STEP - HERO_HW, 0, HERO_Z)[0];
  const bx1 = proj(2 * HERO_STEP + HERO_HW, 0, HERO_Z)[0];
  const bTop = proj(0, HERO_H, HERO_Z - HERO_HD)[1];
  const bBot = proj(0, 0, HERO_Z - HERO_HD)[1];
  markText('s04-zhi', '致君尧舜上', bx0, bTop, bx1 - bx0, bBot - bTop,
    { size: Math.round(HERO_H), align: 'center', color: '#f0dda4' });
}

/* ================================================================ render */
export function renderAt(ctx, u, beat, env = {}) {
  initMotes();
  buildTiles();
  const arch = archLayer();

  const impact = u >= 2.0 ? Math.exp(-(u - 2.0) * 5.2) : 0;
  const shake = impact * (u < 2 ? 0 : 1);
  const shx = Math.sin((u - 2.0) * 92) * 9 * shake;
  const shy = Math.cos((u - 2.0) * 68) * 7 * shake;

  ctx.save();
  ctx.translate(shx, shy);

  ctx.drawImage(arch, -6, -6, W + 12, H + 12);
  drawCrown(ctx, u);

  // ---- doors (closed plane) then the poem field laid over the ground
  drawDoors(ctx, u);

  const breakP = smoothstep(4.12, 5.2, u);
  drawTypeField(ctx, u, breakP);
  drawHeroBlocks(ctx, u, breakP);

  // ---- Du Fu
  const walk = smoothstep(0.0, 2.05, u);
  let dfX = lerp(-400, -112, easeInOut(walk));
  let dfZ = lerp(880, 820, walk);
  let lean = 0.01;
  // the shockwave knocks him back three steps
  const knock = smoothstep(2.02, 2.42, u);
  dfX -= 108 * easeOut(knock);
  dfZ += 36 * easeOut(knock);
  lean = lerp(0.01, -0.2, knock) + 0.14 * Math.sin(clamp01((u - 2.0) / 0.6) * 12) * Math.exp(-Math.max(0, u - 2) * 4);
  if (u > 4.3) {
    const turn = smoothstep(4.3, 5.4, u);
    dfX = lerp(dfX, 690, turn);
    dfZ = lerp(dfZ, 760, turn);
    lean = lerp(lean, 0.02, turn);
  }
  drawDuFu(ctx, u, dfX, dfZ, { lean, look: u > 4.4 ? 0.6 : 0.2 });

  drawShock(ctx, u);
  drawDust(ctx, u);
  drawEdict(ctx, u);
  ctx.restore();

  // ---- vermilion inscription on the platform fascia
  ctx.save();
  const insP = smoothstep(0.5, 1.4, u);
  ctx.globalAlpha = insP * 0.9;
  KIT.drawText(ctx, '天宝五载 · 长安', 1650, 940, {
    size: 27, font: KIT.FONT.display, weight: 600, color: 'rgba(240,214,146,0.9)',
    align: 'right', letterSpacing: 7,
  });
  KIT.drawText(ctx, 'DANFENG GATE  /  丹凤门', 1650, 972, {
    size: 14, font: KIT.FONT.mono, weight: 500, color: 'rgba(232,204,140,0.55)',
    align: 'right', letterSpacing: 2.4,
  });
  KIT.drawText(ctx, '界画 · 1,600 TILES', 270, 940, {
    size: 14, font: KIT.FONT.mono, weight: 500, color: 'rgba(232,204,140,0.5)', letterSpacing: 2.4,
  });
  ctx.restore();

  // gold dust settling over everything
  const grain = KIT.layer('s04:grain', 480, 270, (c) => KIT.grainLayer(480, 270, 46, { amp: 0.11 }));
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.16;
  ctx.drawImage(grain, 0, 0, W, H);
  ctx.restore();

  // impact flash
  if (impact > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = impact * 0.22;
    ctx.fillStyle = '#f7e4b4';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // QA marks
  if (u >= 2.36) {
    markText('s04-edict', '诏下，无一人中第', 680, 175, 560, 110,
      { size: 47, align: 'center', color: '#f6e7c2' });
  }
  void beat; void env;
}

export default { renderAt };
