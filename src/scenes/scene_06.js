/**
 * 06 · 构成主义双极几何切割 · 奉先咏怀 / Russian Constructivism Split · 755
 *
 * A constructivist poster about a moral distance, drawn as a diagram.
 * A fat gold slab of type 【朱门酒肉臭】 inflates and physically presses a thin
 * frost-cracked white slab 【路有冻死骨】 down into the corner. On the bar-2
 * downbeat the white slab freezes and shatters along a seeded fracture tree:
 * twelve slabs first, then ~900 frost shards, each of which carries its piece of
 * the character with it. The vernacular line is left behind in the opened space.
 *
 * Algorithms: constructivist geometry (45° beams, extruded slabs, halftone,
 * photomontage flecks), guillotine fracture tree + Voronoi cell clipping,
 * pre-baked shard sprite atlas (one drawImage per shard per frame), moving
 * specular oil film, deterministic physics (radial burst + drag + gravity).
 */
import KIT from '../kit/index.js';
import { clamp01, lerp, smoothstep, easeOut, easeInOut, hash, unit, mulberry32, TAU } from '../kit/math.js';
import { markText } from '../kit/debug.js';

const W = 1920, H = 1080;

const C = {
  red: '#d03428',
  redDeep: '#8e1e16',
  black: '#12100d',
  gold: '#d2a14d',
  goldHi: '#f4e2ac',
  goldMid: '#c4923c',
  goldLo: '#7c5a20',
  bone: '#ddd4c4',
  boneHi: '#f0e9db',
  boneLo: '#bdb19c',
  ice: '#a9cbd8',
  iceHi: '#e4f4fa',
  ink: '#201a13',
};

/* gold slab: grows from this box while it inflates */
const GOLD = { x: 120, y0: 232, y1: 204, w0: 1008, w1: 1074, h0: 296, h1: 372 };
/* white slab local size (baked texture), then placed + rotated */
const WS_W = 860, WS_H = 186, WPAD = 30;
const WS_C0 = [1180, 688], WS_C1 = [1278, 706];
const WS_ROT = -0.0145;
/* caption strip */
const CAP = { x: 498, y: 660, w: 962, h: 134 };

/* ------------------------------------------------------------------ geometry */
function polyArea(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}
function polyCentroid(p) {
  let x = 0, y = 0, a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[i], r = p[(i + 1) % p.length];
    const cr = q[0] * r[1] - r[0] * q[1];
    a += cr; x += (q[0] + r[0]) * cr; y += (q[1] + r[1]) * cr;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-6) {
    let sx = 0, sy = 0;
    for (const q of p) { sx += q[0]; sy += q[1]; }
    return [sx / p.length, sy / p.length];
  }
  return [x / (6 * a), y / (6 * a)];
}
/** Keep the part of `poly` where (p - o)·n >= 0. */
function clipHalf(poly, ox, oy, nx, ny) {
  const out = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    const da = (a[0] - ox) * nx + (a[1] - oy) * ny;
    const db = (b[0] - ox) * nx + (b[1] - oy) * ny;
    if (da >= -1e-7) out.push(a);
    if ((da > 1e-7 && db < -1e-7) || (da < -1e-7 && db > 1e-7)) {
      const t = da / (da - db);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}
function polyPath(ctx, pts) {
  if (!pts || pts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}
function band(x0, y0, x1, y1, half) {
  const dx = x1 - x0, dy = y1 - y0;
  const l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l * half, ny = dx / l * half;
  return [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]];
}

/* ------------------------------------------------------------------ 1. field */
let FIELD = null;
let BLOCK = null;
let CAP_PAPER = null;

function paintField(ctx) {
  const paper = KIT.paper.ricePaper(W, H, {
    tone: '#ded4c1', seed: 755, fibers: 1700, stains: 9, mottle: 0.42, deckle: 0, edgeBurn: 0.3,
  });
  ctx.drawImage(paper, 0, 0);

  // a wide warm-to-cold tonal shift, so the bone field is never flat
  const g = ctx.createLinearGradient(0, 0, W * 0.85, H);
  g.addColorStop(0, 'rgba(255,250,236,0.30)');
  g.addColorStop(0.42, 'rgba(255,248,232,0.02)');
  g.addColorStop(1, 'rgba(120,100,70,0.14)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // ---------------------------------------------------------- diagonal grid
  ctx.save();
  ctx.strokeStyle = 'rgba(32,26,19,0.052)';
  ctx.lineWidth = 1;
  for (let k = -H; k < W + H; k += 52) {
    ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + H * 0.72, H); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(32,26,19,0.028)';
  for (let k = -H; k < W + H; k += 208) {
    ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + H * 0.72, H); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(32,26,19,0.036)';
  for (let k = 0; k < W; k += 96) {
    ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k, H); ctx.stroke();
  }
  ctx.restore();

  // --------------------------------------------------------- black wedge (NE)
  // keeps the top-right HUD ground dark so the cream travel log stays legible
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(1452, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 250); ctx.lineTo(1614, 208);
  ctx.lineTo(1532, 50); ctx.closePath();
  ctx.fillStyle = C.black; ctx.fill();
  // faint machined hatch inside the wedge
  KIT.ink.hatch(ctx, [[1452, 0], [W, 0], [W, 250], [1614, 208], [1532, 50]], {
    color: 'rgba(221,212,196,0.5)', gap: 13, angle: -0.78, alpha: 0.10, width: 1.1, seed: 611,
  });
  // red blade edge along its lower lip
  ctx.strokeStyle = C.red; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(1532, 50); ctx.lineTo(1614, 208); ctx.lineTo(W, 250); ctx.stroke();
  ctx.strokeStyle = 'rgba(18,16,13,0.85)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(1532, 56); ctx.lineTo(1614, 216); ctx.lineTo(W, 258); ctx.stroke();
  ctx.restore();

  // ------------------------------------------------------------- red beams
  const beamA = band(-40, 1030, 1500, -50, 66);
  ctx.save();
  polyPath(ctx, beamA);
  ctx.fillStyle = C.red; ctx.fill();
  // pressure gradient inside the beam
  const bg = ctx.createLinearGradient(0, 1080, 1400, 0);
  bg.addColorStop(0, 'rgba(60,10,6,0.25)');
  bg.addColorStop(0.5, 'rgba(255,210,180,0.16)');
  bg.addColorStop(1, 'rgba(60,10,6,0.2)');
  ctx.fillStyle = bg;
  ctx.save(); polyPath(ctx, beamA); ctx.clip(); ctx.fillRect(0, 0, W, H); ctx.restore();
  // halftone dots on the beam (machine-printed poster)
  ctx.save();
  polyPath(ctx, beamA); ctx.clip();
  ctx.fillStyle = 'rgba(222,212,193,0.30)';
  for (let j = 0; j < 44; j++) {
    for (let i = 0; i < 60; i++) {
      const x = -60 + i * 26 + (j % 2) * 13;
      const y = -60 + j * 26;
      const rr = 1.5 + 1.6 * unit(755, i, j);
      ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
  // beam edge rules: misregistered print
  ctx.strokeStyle = 'rgba(18,16,13,0.9)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(beamA[0][0], beamA[0][1]); ctx.lineTo(beamA[1][0], beamA[1][1]); ctx.stroke();
  ctx.strokeStyle = 'rgba(244,236,218,0.5)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(beamA[2][0], beamA[2][1]); ctx.lineTo(beamA[3][0], beamA[3][1]); ctx.stroke();
  ctx.restore();

  // second, thinner parallel beam
  const beamB = band(-80, 1110, 1660, 60, 15);
  polyPath(ctx, beamB);
  ctx.fillStyle = 'rgba(18,16,13,0.92)'; ctx.fill();

  // horizontal red bar, bottom left
  ctx.fillStyle = C.red;
  ctx.fillRect(0, 934, 706, 46);
  ctx.fillStyle = C.black;
  ctx.fillRect(660, 920, 54, 74);
  ctx.fillStyle = 'rgba(221,212,196,0.28)';
  for (let i = 0; i < 24; i++) ctx.fillRect(18 + i * 27, 950, 12, 4);

  // ---------------------------------------------------------- gold disc
  const CX = 1436, CY = 312, R = 150;
  ctx.save();
  ctx.beginPath(); ctx.arc(CX, CY, R, 0, TAU);
  ctx.fillStyle = C.gold;
  ctx.fill();
  // flat printed tonal bands, not a sphere: constructivist discs are flat
  ctx.save();
  ctx.beginPath(); ctx.arc(CX, CY, R, 0, TAU); ctx.clip();
  const lg = ctx.createLinearGradient(CX - R * 0.9, CY - R * 0.9, CX + R * 0.8, CY + R);
  lg.addColorStop(0, 'rgba(255,243,206,0.55)');
  lg.addColorStop(0.4, 'rgba(255,252,236,0.12)');
  lg.addColorStop(0.66, 'rgba(146,104,38,0.12)');
  lg.addColorStop(1, 'rgba(86,58,16,0.26)');
  ctx.fillStyle = lg;
  ctx.fillRect(CX - R, CY - R, R * 2, R * 2);
  // printed concentric rules
  ctx.strokeStyle = 'rgba(96,68,22,0.16)';
  for (let i = 1; i <= 5; i++) {
    ctx.lineWidth = i === 3 ? 2 : 1;
    ctx.beginPath(); ctx.arc(CX, CY, R * (0.18 + i * 0.14), 0, TAU); ctx.stroke();
  }
  // printed ink speckle
  const gr = mulberry32(75519);
  for (let i = 0; i < 170; i++) {
    const a = gr() * TAU, rr = Math.sqrt(gr()) * R;
    ctx.fillStyle = gr() < 0.5 ? 'rgba(255,246,214,0.18)' : 'rgba(90,62,16,0.22)';
    ctx.fillRect(CX + Math.cos(a) * rr, CY + Math.sin(a) * rr, 1 + gr() * 3, 1 + gr() * 3);
  }
  ctx.restore();
  // rings / chord / red arc
  ctx.strokeStyle = C.black; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(CX, CY, R, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,246,214,0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(CX, CY, R - 10, 0, TAU); ctx.stroke();
  ctx.strokeStyle = C.red; ctx.lineWidth = 16;
  ctx.beginPath(); ctx.arc(CX, CY, R - 22, -0.34, 1.42); ctx.stroke();
  ctx.strokeStyle = C.black; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(CX - R * 0.98, CY + R * 0.24); ctx.lineTo(CX + R * 0.74, CY - R * 0.72); ctx.stroke();
  // tick ring
  ctx.strokeStyle = 'rgba(18,16,13,0.62)';
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * TAU;
    const inner = R + 11 + (i % 4 === 0 ? 10 : 3);
    ctx.lineWidth = i % 4 === 0 ? 2.1 : 0.9;
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(a) * (R + 9), CY + Math.sin(a) * (R + 9));
    ctx.lineTo(CX + Math.cos(a) * inner, CY + Math.sin(a) * inner);
    ctx.stroke();
  }
  ctx.restore();

  // ------------------------------------------------- black corner (SW)
  ctx.save();
  ctx.beginPath(); ctx.moveTo(0, 828); ctx.lineTo(0, H); ctx.lineTo(556, H); ctx.closePath();
  ctx.fillStyle = C.black; ctx.fill();
  KIT.ink.hatch(ctx, [[0, 828], [0, H], [556, H]], {
    color: 'rgba(221,212,196,0.6)', gap: 15, angle: 0.72, alpha: 0.09, width: 1, seed: 617,
  });
  ctx.restore();

  // ------------------------------------------------------------------ stencils
  ctx.save();
  // a cut stencil plate on the black corner: bone numerals, hard edges
  ctx.fillStyle = 'rgba(221,212,196,0.96)';
  KIT.drawText(ctx, '07', 66, 962, {
    size: 116, font: KIT.FONT.mono, weight: 800, color: 'rgba(221,212,196,0.96)', letterSpacing: -6,
  });
  ctx.fillStyle = C.red;
  ctx.fillRect(66, 1018, 126, 7);
  KIT.drawText(ctx, '755', 70, 1046, { size: 20, font: KIT.FONT.mono, weight: 700, color: 'rgba(221,212,196,0.8)', letterSpacing: 3 });
  KIT.drawText(ctx, 'ФЭНСЯНЬ / 奉先', 206, 1046, { size: 13, font: KIT.FONT.mono, weight: 500, color: 'rgba(221,212,196,0.55)', letterSpacing: 1.2 });
  ctx.restore();

  // ------------------------------------------------- mechanical scales / rules
  ctx.save();
  // left vertical scale
  ctx.strokeStyle = 'rgba(18,16,13,0.4)';
  ctx.fillStyle = 'rgba(18,16,13,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(64, 372); ctx.lineTo(64, 902); ctx.stroke();
  for (let y = 372, i = 0; y <= 902; y += 12, i++) {
    const len = i % 5 === 0 ? 14 : 7;
    ctx.beginPath(); ctx.moveTo(64, y); ctx.lineTo(64 + len, y); ctx.stroke();
  }
  // bottom scale
  ctx.beginPath(); ctx.moveTo(600, 1028); ctx.lineTo(1418, 1028); ctx.stroke();
  for (let x = 600, i = 0; x <= 1418; x += 14, i++) {
    const len = i % 5 === 0 ? 12 : 6;
    ctx.beginPath(); ctx.moveTo(x, 1028); ctx.lineTo(x, 1028 - len); ctx.stroke();
  }
  KIT.drawText(ctx, 'SCALE 1:100 · GRID 45°', 604, 1050, { size: 10.5, font: KIT.FONT.mono, weight: 500, color: 'rgba(18,16,13,0.55)', letterSpacing: 1.1 });
  KIT.drawText(ctx, 'Ø 376', 1414, 1050, { size: 10.5, font: KIT.FONT.mono, weight: 500, color: 'rgba(18,16,13,0.55)', align: 'right', letterSpacing: 1.1 });
  ctx.restore();

  // --------------------------------------------------------- diagonal rules
  ctx.save();
  const dashBand = band(300, 1080, 1620, 220, 1);
  ctx.strokeStyle = 'rgba(18,16,13,0.42)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([16, 12]);
  ctx.beginPath(); ctx.moveTo(dashBand[0][0], dashBand[0][1]); ctx.lineTo(dashBand[1][0], dashBand[1][1]); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // ------------------------------------------------------------ solid arrow
  ctx.save();
  const ax = 1252, ay = 446, bx = 1392, by = 566;
  ctx.strokeStyle = 'rgba(18,16,13,0.85)'; ctx.lineWidth = 14; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx - 24, by - 22); ctx.stroke();
  ctx.fillStyle = 'rgba(18,16,13,0.85)';
  ctx.beginPath();
  ctx.moveTo(bx + 26, by + 24); ctx.lineTo(bx - 48, by - 2); ctx.lineTo(bx - 4, by - 48); ctx.closePath(); ctx.fill();
  ctx.restore();

  // --------------------------------------------------- photomontage flecks
  // paper chips torn from the beam edges, not confetti
  const fr = mulberry32(7551);
  for (let i = 0; i < 22; i++) {
    const t = 0.04 + fr() * 0.9;
    const along = band(-40, 1030, 1500, -50, 66);
    const ax = lerp(along[0][0], along[1][0], t), ay = lerp(along[0][1], along[1][1], t);
    const nx = 0.569, ny = 0.822;
    const off = (fr() < 0.5 ? -1 : 1) * (66 + 6 + fr() * 26) * (fr() < 0.4 ? 1 : 1.8);
    const x = ax + nx * off + (fr() - 0.5) * 50;
    const y = ay + ny * off + (fr() - 0.5) * 30;
    if (x > 1160 && y < 520) continue;
    const w = 7 + fr() * 34, h = 3 + fr() * 12;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((fr() - 0.5) * 0.7);
    ctx.fillStyle = 'rgba(18,16,13,0.22)';
    ctx.beginPath(); ctx.moveTo(-w / 2 + 3, -h / 2 + 4); ctx.lineTo(w / 2 + 3, -h / 2 + 4);
    ctx.lineTo(w / 2 - 2 + 3, h / 2 + 4); ctx.lineTo(-w / 2 + 2 + 3, h / 2 + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = fr() < 0.5 ? 'rgba(240,233,219,0.9)' : 'rgba(28,24,18,0.72)';
    ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2 + 2);
    ctx.lineTo(w / 2 - 4, h / 2); ctx.lineTo(-w / 2 + 3, h / 2 - 2); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // registration marks, frame corners
  KIT.frames.registrationMarks(ctx, 26, 26, W - 52, H - 52, { color: 'rgba(18,16,13,0.5)', len: 22, inset: 0, width: 1.2 });
  // the wall the white block is being crushed into: a hard black corner bracket
  ctx.fillStyle = C.black;
  ctx.fillRect(1600, 1024, 276, 14);
  ctx.fillRect(1862, 806, 14, 232);
  ctx.fillStyle = 'rgba(221,212,196,0.55)';
  ctx.fillRect(1612, 1028, 52, 4);
  ctx.fillRect(1866, 820, 4, 52);
  ctx.fillStyle = C.red;
  ctx.fillRect(1600, 1008, 276, 4);
  ctx.fillStyle = 'rgba(18,16,13,0.55)';
  for (let i = 0; i < 13; i++) ctx.fillRect(1612 + i * 20, 1042, 10, 3);
  // corner crop ticks (bone on the black wedge)
  ctx.fillStyle = 'rgba(221,212,196,0.5)';
  ctx.fillRect(1700, 196, 92, 1.2);
  ctx.fillRect(1700, 196, 1.2, 44);
  ctx.fillStyle = 'rgba(18,16,13,0.55)';
  ctx.fillRect(600, 858, 1.4, 54);
  ctx.fillRect(600, 858, 64, 1.4);
}

/* ------------------------------------------------------------------ 2. block */
function frostCracks() {
  const r = mulberry32(75513);
  const out = [];
  for (let i = 0; i < 16; i++) {
    const edge = i % 4;
    let x, y, ang;
    if (edge === 0) { x = 40 + r() * (WS_W - 80); y = 4; ang = Math.PI / 2 + (r() - 0.5) * 0.9; }
    else if (edge === 1) { x = WS_W - 6; y = 30 + r() * (WS_H - 60); ang = Math.PI + (r() - 0.5) * 0.9; }
    else if (edge === 2) { x = 30 + r() * (WS_W - 60); y = WS_H - 5; ang = -Math.PI / 2 + (r() - 0.5) * 0.9; }
    else { x = 6; y = 20 + r() * (WS_H - 40); ang = (r() - 0.5) * 0.9; }
    const pts = [[x, y]];
    let len = 24 + r() * 130;
    const steps = 5 + Math.floor(r() * 8);
    for (let k = 0; k < steps; k++) {
      ang += (r() - 0.5) * 0.75;
      x += Math.cos(ang) * (len / steps);
      y += Math.sin(ang) * (len / steps);
      pts.push([x, y]);
      if (r() < 0.28) {
        // branch
        const b = [[x, y]];
        let bx = x, by = y, ba = ang + (r() < 0.5 ? 0.7 : -0.7);
        const bl = 12 + r() * 44;
        for (let q = 0; q < 3; q++) {
          ba += (r() - 0.5) * 0.5;
          bx += Math.cos(ba) * (bl / 3);
          by += Math.sin(ba) * (bl / 3);
          b.push([bx, by]);
        }
        out.push({ pts: b, w: 0.55 + r() * 0.7, a: 0.4 + r() * 0.4 });
      }
    }
    out.push({ pts, w: 0.8 + r() * 1.4, a: 0.35 + r() * 0.5 });
  }
  return out;
}
let CRACKS = null;

function paintBlock(ctx) {
  const Wb = WS_W + WPAD * 2, Hb = WS_H + WPAD * 2;
  ctx.translate(WPAD, WPAD);
  // hard constructivist drop shadow of the slab
  ctx.fillStyle = 'rgba(10,8,6,0.32)';
  ctx.fillRect(15, 17, WS_W, WS_H);
  // slab face: bone paper with a cold blue shadow that pools at the base
  const g = ctx.createLinearGradient(0, 0, WS_W * 0.28, WS_H);
  g.addColorStop(0, '#f9f5ea');
  g.addColorStop(0.55, '#f1ecdf');
  g.addColorStop(0.82, '#e7e1d2');
  g.addColorStop(0.94, '#d3d8d7');
  g.addColorStop(1, '#bcc8cc');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WS_W, WS_H);
  // thickness edge on the bottom and right (the slab is a body, not a card)
  ctx.fillStyle = '#9fb1b8';
  ctx.fillRect(0, WS_H - 9, WS_W, 9);
  ctx.fillStyle = '#7d939b';
  ctx.fillRect(WS_W - 7, 0, 7, WS_H);
  ctx.fillStyle = 'rgba(24,42,50,0.5)';
  ctx.fillRect(0, WS_H - 2, WS_W, 2);
  ctx.fillRect(WS_W - 2, 0, 2, WS_H);
  // inner cold rim
  ctx.strokeStyle = 'rgba(146,187,204,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(3.5, 3.5, WS_W - 10, WS_H - 10);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(3, WS_H - 12); ctx.lineTo(3, 3); ctx.lineTo(WS_W - 10, 3); ctx.stroke();
  // printed grain + fibre
  const r = mulberry32(7552);
  ctx.save();
  for (let i = 0; i < 520; i++) {
    const x = r() * WS_W, y = r() * WS_H;
    ctx.fillStyle = r() < 0.5 ? `rgba(255,255,255,${0.05 + r() * 0.16})` : `rgba(120,145,155,${0.03 + r() * 0.1})`;
    ctx.fillRect(x, y, 1 + r() * 16, 0.8);
  }
  ctx.restore();

  // type: thin frosted serif, cold ink, slightly embossed
  const size = 104;
  const spacing = 26;
  ctx.save();
  KIT.drawText(ctx, '路有冻死骨', WS_W * 0.5 + 2, WS_H * 0.5 + 3, {
    size, font: KIT.FONT.serif, weight: 300, color: 'rgba(255,255,255,0.9)', align: 'center', letterSpacing: spacing,
  });
  KIT.drawText(ctx, '路有冻死骨', WS_W * 0.5, WS_H * 0.5, {
    size, font: KIT.FONT.serif, weight: 500, color: '#1f2b32', align: 'center', letterSpacing: spacing,
  });
  ctx.restore();
  // a printed rule: more fragments carry marks
  ctx.strokeStyle = 'rgba(31,43,50,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(80, 150); ctx.lineTo(WS_W - 80, 150); ctx.stroke();
  ctx.strokeStyle = 'rgba(31,43,50,0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80, 34); ctx.lineTo(WS_W - 80, 34); ctx.stroke();
  // a stamped red index at the right end
  ctx.fillStyle = 'rgba(166,42,34,0.78)';
  ctx.fillRect(WS_W - 96, 54, 34, 34);
  ctx.fillStyle = 'rgba(246,242,230,0.92)';
  ctx.fillRect(WS_W - 89, 62, 20, 2.5);
  ctx.fillRect(WS_W - 89, 69, 20, 2.5);
  ctx.fillRect(WS_W - 89, 76, 20, 2.5);
  // small stencil label + red index
  KIT.drawText(ctx, '路有凍死骨 / 天寶十四載', 34, 26, {
    size: 11.5, font: KIT.FONT.mono, weight: 600, color: 'rgba(50,66,74,0.72)', letterSpacing: 1.6,
  });
  KIT.drawText(ctx, 'COLD BLOCK ↗  76.4° N', WS_W - 34, WS_H - 24, {
    size: 10.5, font: KIT.FONT.mono, weight: 500, color: 'rgba(50,66,74,0.6)', align: 'right', letterSpacing: 1.2,
  });
  ctx.fillStyle = '#b3281f';
  ctx.fillRect(WS_W - 62, 26, 26, 26);
  ctx.fillStyle = 'rgba(243,239,229,0.9)';
  ctx.fillRect(WS_W - 57, 31, 16, 2);
  ctx.fillRect(WS_W - 57, 36, 16, 2);
  ctx.fillRect(WS_W - 57, 41, 16, 2);
  // hairline rules top & bottom
  ctx.strokeStyle = 'rgba(41,58,66,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(32, WS_H - 34); ctx.lineTo(WS_W * 0.5 - 250, WS_H - 34); ctx.stroke();

  // frost rime: crystals growing from the lower and right edges
  const fr = mulberry32(75521);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 150; i++) {
    const edge = fr() < 0.62 ? 2 : 1;
    let x, y, nx, ny;
    if (edge === 2) { x = 8 + fr() * (WS_W - 16); y = WS_H - 3 - fr() * 6; nx = (fr() - 0.5) * 0.6; ny = -1; }
    else { x = WS_W - 3 - fr() * 6; y = 8 + fr() * (WS_H - 16); nx = -1; ny = (fr() - 0.5) * 0.6; }
    const len = 4 + Math.pow(fr(), 1.6) * 26;
    const w = 0.7 + fr() * 1.4;
    for (let k = 0; k < 2; k++) {
      const a = Math.atan2(ny, nx) + (k - 0.5) * 0.9 + (fr() - 0.5) * 0.4;
      ctx.strokeStyle = k === 0 ? `rgba(255,255,255,${0.35 + fr() * 0.5})` : `rgba(157,203,219,${0.3 + fr() * 0.4})`;
      ctx.lineWidth = w * (k === 0 ? 1 : 0.7);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
      if (len > 12 && fr() < 0.6) {
        const mx = x + Math.cos(a) * len * 0.55, my = y + Math.sin(a) * len * 0.55;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(a + 0.8) * len * 0.4, my + Math.sin(a + 0.8) * len * 0.4);
        ctx.stroke();
      }
    }
  }
  ctx.restore();

  // hairline crack network
  if (!CRACKS) CRACKS = frostCracks();
  ctx.save();
  ctx.lineCap = 'round';
  for (const ck of CRACKS) {
    ctx.strokeStyle = `rgba(38,56,66,${(0.12 + ck.a * 0.24).toFixed(3)})`;
    ctx.lineWidth = ck.w + 0.5;
    ctx.beginPath();
    ck.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    ctx.strokeStyle = `rgba(233,248,252,${(0.3 + ck.a * 0.35).toFixed(3)})`;
    ctx.lineWidth = Math.max(0.4, ck.w * 0.5);
    ctx.beginPath();
    ck.pts.forEach((p, i) => (i ? ctx.lineTo(p[0] + 1.1, p[1] - 1.1) : ctx.moveTo(p[0] + 1.1, p[1] - 1.1)));
    ctx.stroke();
  }
  ctx.restore();
  // cold blue edge light along the left rim
  const rim = ctx.createLinearGradient(0, 0, 26, 0);
  rim.addColorStop(0, 'rgba(255,255,255,0.55)');
  rim.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, 26, WS_H);
}

/* --------------------------------------------------------------- 3. fracture */
const FRAC = { atlas: null, shards: null, parents: null, w: 2048, h: 2048 };
const FRAC_SWAP = 0.10;

function buildParents(r, count) {
  let pieces = [[[0, 0], [WS_W, 0], [WS_W, WS_H], [0, WS_H]]];
  let guard = 0;
  while (pieces.length < count && guard++ < 400) {
    let bi = 0, ba = -1;
    for (let i = 0; i < pieces.length; i++) {
      const a = Math.abs(polyArea(pieces[i]));
      if (a > ba) { ba = a; bi = i; }
    }
    const poly = pieces[bi];
    const c = polyCentroid(poly);
    const cx = c[0] + (r() - 0.5) * 60;
    const cy = c[1] + (r() - 0.5) * 26;
    const ang = (r() < 0.4 ? Math.PI / 4 : (r() - 0.5) * 2.4) + (r() - 0.5) * 0.5;
    const nx = Math.cos(ang), ny = Math.sin(ang);
    const a = clipHalf(poly, cx, cy, nx, ny);
    const b = clipHalf(poly, cx, cy, -nx, -ny);
    if (a.length >= 3 && b.length >= 3 && Math.abs(polyArea(a)) > 2400 && Math.abs(polyArea(b)) > 2400) {
      pieces.splice(bi, 1, a, b);
    }
  }
  return pieces;
}

function voronoi(poly, spacing, seed) {
  const r = mulberry32(seed);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of poly) {
    x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]);
    y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]);
  }
  const sites = [];
  const cols = Math.max(1, Math.ceil((x1 - x0) / spacing));
  const rows = Math.max(1, Math.ceil((y1 - y0) / spacing));
  const sx = (x1 - x0) / cols, sy = (y1 - y0) / rows;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const px = x0 + (i + 0.5 + (r() - 0.5) * 0.85) * sx;
      const py = y0 + (j + 0.5 + (r() - 0.5) * 0.85) * sy;
      if (KIT.pointInPoly([px, py], poly)) sites.push([px, py]);
    }
  }
  if (sites.length === 0) sites.push(polyCentroid(poly));
  const cells = [];
  const maxD = Math.max(sx, sy) * 2.4;
  for (let i = 0; i < sites.length; i++) {
    const s = sites[i];
    let cell = poly;
    for (let j = 0; j < sites.length; j++) {
      if (i === j) continue;
      const q = sites[j];
      const dx = q[0] - s[0], dy = q[1] - s[1];
      if (Math.abs(dx) > maxD || Math.abs(dy) > maxD) continue;
      cell = clipHalf(cell, (s[0] + q[0]) / 2, (s[1] + q[1]) / 2, s[0] - q[0], s[1] - q[1]);
      if (cell.length < 3) break;
    }
    if (cell.length >= 3 && Math.abs(polyArea(cell)) > 5) cells.push(cell);
  }
  return cells;
}

function packSlots() {
  const PADX = 5;
  let x = 3, y = 3, rowH = 0;
  return (w, h) => {
    if (x + w > FRAC.w - 3) { x = 3; y += rowH + PADX; rowH = 0; }
    const slot = { x, y };
    x += w + PADX;
    rowH = Math.max(rowH, h);
    return slot;
  };
}

/** Bake one polygon of the block texture into the sprite atlas. */
function carveSprite(actx, blockTex, poly, pack) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of poly) {
    x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]);
    y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]);
  }
  const pad = 9;
  x0 = Math.floor(x0 - pad); y0 = Math.floor(y0 - pad);
  x1 = Math.ceil(x1 + pad); y1 = Math.ceil(y1 + pad);
  const bw = x1 - x0, bh = y1 - y0;
  const slot = pack(bw, bh);
  const c = polyCentroid(poly);
  actx.save();
  actx.translate(slot.x - x0, slot.y - y0);

  // hard cast shadow (baked: cheaper than a second pass per frame)
  actx.save();
  actx.translate(4, 5);
  polyPath(actx, poly);
  actx.fillStyle = 'rgba(12,10,8,0.17)';
  actx.fill();
  actx.restore();

  // the fragment itself
  actx.save();
  polyPath(actx, poly);
  actx.clip();
  actx.drawImage(blockTex, -WPAD, -WPAD);
  actx.restore();

  // frost rim + rim light
  polyPath(actx, poly);
  actx.strokeStyle = 'rgba(154,206,224,0.62)';
  actx.lineWidth = 1;
  actx.stroke();
  polyPath(actx, poly);
  actx.strokeStyle = 'rgba(246,253,255,0.5)';
  actx.lineWidth = 0.5;
  actx.stroke();

  // ice needles at a few vertices
  const seed = Math.round(c[0] * 131 + c[1] * 17);
  for (let i = 0; i < poly.length; i++) {
    if (unit(7553, seed, i) > 0.34) continue;
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const a = Math.atan2(q[1] - p[1], q[0] - p[0]) + Math.PI / 2;
    const len = 2 + unit(7554, seed, i) * 6;
    actx.strokeStyle = 'rgba(236,250,255,0.8)';
    actx.lineWidth = 0.6;
    actx.beginPath();
    actx.moveTo(p[0], p[1]);
    actx.lineTo(p[0] + Math.cos(a) * len, p[1] + Math.sin(a) * len);
    actx.stroke();
  }
  actx.restore();
  return { sx: slot.x, sy: slot.y, sw: bw, sh: bh, dx: x0 - c[0], dy: y0 - c[1], cx: c[0], cy: c[1] };
}

function buildFracture() {
  if (FRAC.shards && FRAC.atlas) return FRAC;
  BLOCK = KIT.layer('scene06:block', WS_W + WPAD * 2, WS_H + WPAD * 2, paintBlock);
  const r = mulberry32(7550);
  const parents = buildParents(r, 12).map((poly) => ({ poly }));
  const shards = [];
  for (let pi = 0; pi < parents.length; pi++) {
    const cells = voronoi(parents[pi].poly, 10.6 + (pi % 4) * 2.6, 75500 + pi * 97);
    for (const cell of cells) {
      const c = polyCentroid(cell);
      const ry = c[1] - WS_H / 2;
      const rx = c[0] - WS_W / 2;
      // the slab splits open along its length: pieces fly up and down, then drift
      const vy = (ry >= 0 ? 1 : -1) * (180 + Math.pow(r(), 1.2) * 380) + 54;
      const vx = rx * 0.7 + (r() - 0.5) * 270 + 78;
      shards.push({
        poly: cell, parent: pi, c,
        vx, vy,
        spin: (r() - 0.5) * 5.4,
        rot0: (r() - 0.5) * 0.12,
        delay: r() * 0.05,
        tint: r(),
        fall: r(),
      });
    }
  }
  // parent velocity = mean of its children
  for (const p of parents) { p.vx = 0; p.vy = 0; p.n = 0; }
  for (const s of shards) {
    const p = parents[s.parent];
    p.vx += s.vx; p.vy += s.vy; p.n++;
  }
  for (const p of parents) { p.vx /= Math.max(1, p.n); p.vy /= Math.max(1, p.n); p.spin = 0.35; }

  const pack = packSlots();
  FRAC.atlas = KIT.layer('scene06:atlas', FRAC.w, FRAC.h, (actx) => {
    for (const p of parents) {
      const sp = carveSprite(actx, BLOCK, p.poly, pack);
      Object.assign(p, sp);
    }
    for (const s of shards) {
      const sp = carveSprite(actx, BLOCK, s.poly, pack);
      Object.assign(s, sp);
    }
  });
  FRAC.shards = shards;
  FRAC.parents = parents;
  return FRAC;
}

/* ------------------------------------------------------------- 4. gold slab */
function goldGeom(u, press) {
  const y = lerp(GOLD.y0, GOLD.y1, press);
  const w = lerp(GOLD.w0, GOLD.w1, press);
  const h = lerp(GOLD.h0, GOLD.h1, press);
  const wobble = Math.sin(u * 1.7) * 3.2;
  const drip = (i) => 10 + 46 * press + 9 * Math.sin(u * 2.4 + i * 2.1) + 6 * i;
  return { x: GOLD.x, y, w, h, wobble, drip };
}

function goldOutline(g, u) {
  const x0 = g.x, y0 = g.y, x1 = g.x + g.w, y1 = g.y + g.h;
  const pts = [
    [x0, y0],
    [x1, y0 + 5],
    [x1 - 5, y0 + g.h * 0.55],
    [x1 - 2, y1 - 26],
  ];
  // oozing bottom edge with two hanging lips
  const n = 12;
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const bul = Math.sin(t * Math.PI * 2.6 + u * 0.7) * 5 + Math.sin(t * Math.PI) * 16;
    pts.push([x, y1 + bul * (0.4 + g.wobble * 0.1)]);
  }
  pts.push([x0 + 3, y0 + g.h * 0.5]);
  return pts;
}

function drawGold(ctx, u, press, oil) {
  const g = goldGeom(u, press);
  const pts = goldOutline(g, u);
  ctx.save();
  // cast shadow on the paper + a red misregistered print plate behind it
  ctx.save();
  ctx.translate(30, 34);
  polyPath(ctx, pts);
  ctx.fillStyle = 'rgba(18,14,9,0.20)';
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(11, 12);
  polyPath(ctx, pts);
  ctx.fillStyle = 'rgba(208,52,40,0.22)';
  ctx.fill();
  ctx.restore();
  // extrusion to the lower-left: a dark gold side face
  const ex = 26, ey = 20;
  ctx.save();
  ctx.translate(-ex, ey);
  polyPath(ctx, pts);
  ctx.fillStyle = C.goldLo;
  ctx.fill();
  ctx.restore();
  // join the two faces
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  ctx.lineTo(pts[0][0] - ex, pts[0][1] + ey);
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    ctx.lineTo(p[0] - ex, p[1] + ey);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(84,60,20,0.92)';
  ctx.fill();

  // face
  polyPath(ctx, pts);
  const gg = ctx.createLinearGradient(g.x, g.y, g.x + g.w * 0.55, g.y + g.h);
  gg.addColorStop(0, '#e6c87f');
  gg.addColorStop(0.24, '#d8b263');
  gg.addColorStop(0.58, C.gold);
  gg.addColorStop(0.82, '#b78633');
  gg.addColorStop(1, '#8d6522');
  ctx.fillStyle = gg;
  ctx.fill();

  ctx.save();
  polyPath(ctx, pts);
  ctx.clip();
  // oily film: three drifting specular smears
  const bandY = g.h * 0.5 + Math.sin(u * 0.9) * 16;
  const sweep = ((u * 0.33) % 1);
  const smx = g.x - g.w * 0.4 + sweep * g.w * 1.8;
  for (let k = 0; k < 3; k++) {
    const sx = smx - k * 190;
    const sg = ctx.createLinearGradient(sx - 150, bandY - 180, sx + 190, bandY + 150);
    sg.addColorStop(0, 'rgba(255,246,214,0)');
    sg.addColorStop(0.36, `rgba(255,246,214,${0.30 - k * 0.06})`);
    sg.addColorStop(0.5, `rgba(255,255,238,${0.44 - k * 0.09})`);
    sg.addColorStop(0.64, `rgba(255,226,150,${0.18 - k * 0.04})`);
    sg.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(g.x - 40, g.y - 40, g.w + 80, g.h + 80);
  }
  // deep oily pool at the bottom
  const pool = ctx.createLinearGradient(0, g.y + g.h * 0.55, 0, g.y + g.h + 30);
  pool.addColorStop(0, 'rgba(80,52,10,0)');
  pool.addColorStop(1, 'rgba(64,40,8,0.55)');
  ctx.fillStyle = pool;
  ctx.fillRect(g.x - 40, g.y + g.h * 0.5, g.w + 80, g.h * 0.6 + 50);
  // patina flecks
  const pr = mulberry32(7554);
  for (let i = 0; i < 90; i++) {
    const x = g.x + pr() * g.w, y = g.y + pr() * g.h;
    ctx.fillStyle = pr() < 0.5 ? 'rgba(255,247,214,0.22)' : 'rgba(78,52,12,0.30)';
    ctx.beginPath(); ctx.ellipse(x, y, 1 + pr() * 6, 0.6 + pr() * 2.2, pr() * TAU, 0, TAU); ctx.fill();
  }
  // gold-leaf squares and a printed halftone: the slab is a material, not a fill
  const lf = mulberry32(75541);
  for (let i = 0; i < 26; i++) {
    const x = g.x + 20 + lf() * (g.w - 60), y = g.y + 16 + lf() * (g.h - 40);
    const s = 12 + lf() * 46;
    ctx.fillStyle = lf() < 0.5 ? 'rgba(255,240,198,0.07)' : 'rgba(92,62,18,0.07)';
    ctx.fillRect(x, y, s, s * (0.35 + lf() * 0.6));
    ctx.strokeStyle = 'rgba(60,42,10,0.12)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x + 0.5, y + 0.5, s, s * (0.35 + lf() * 0.6));
  }
  ctx.fillStyle = 'rgba(60,40,8,0.16)';
  for (let j = 0; j < 12; j++) {
    for (let i = 0; i < 30; i++) {
      const x = g.x + 8 + i * 36 + (j % 2) * 18;
      const y = g.y + 8 + j * 30;
      ctx.fillRect(x, y, 2.2, 2.2);
    }
  }
  // pressure ripple: concentric arcs where it pushes the white block
  ctx.strokeStyle = `rgba(255,244,208,${0.10 + 0.12 * Math.sin(u * 3)})`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(g.x + g.w * 0.94, g.y + g.h * 0.94, 70 + i * 26 + Math.sin(u * 2 + i) * 5, Math.PI * 1.02, Math.PI * 1.62);
    ctx.stroke();
  }

  // the type: fat constructivist serif in ink, embossed with a gold highlight
  const tx = g.x + g.w * 0.5;
  const ty = g.y + g.h * 0.5 + 4;
  KIT.drawText(ctx, '朱门酒肉臭', tx + 7, ty + 6, {
    size: 150, font: KIT.FONT.display, weight: 900, color: 'rgba(208,52,40,0.30)', align: 'center', letterSpacing: 8,
  });
  KIT.drawText(ctx, '朱门酒肉臭', tx + 3, ty + 4, {
    size: 150, font: KIT.FONT.display, weight: 900, color: 'rgba(255,238,196,0.6)', align: 'center', letterSpacing: 8,
  });
  KIT.drawText(ctx, '朱门酒肉臭', tx, ty, {
    size: 150, font: KIT.FONT.display, weight: 900, color: C.black, align: 'center', letterSpacing: 8,
  });
  // a thin red underline that lives inside the slab
  ctx.fillStyle = C.red;
  ctx.fillRect(g.x + 56, g.y + g.h - 46, 250, 5);
  ctx.restore();

  // outline + red misregistration
  ctx.strokeStyle = 'rgba(18,16,13,0.95)';
  ctx.lineWidth = 3.5;
  polyPath(ctx, pts);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(208,52,40,0.45)';
  ctx.lineWidth = 1.4;
  ctx.save(); ctx.translate(5, 5); polyPath(ctx, pts); ctx.stroke(); ctx.restore();

  // oozing drips hanging from the lower lip
  for (let i = 0; i < 3; i++) {
    const dx = g.x + g.w * (0.36 + i * 0.21);
    const len = g.drip(i);
    const top = g.y + g.h - 2;
    ctx.beginPath();
    ctx.moveTo(dx - 6, top);
    ctx.quadraticCurveTo(dx - 7, top + len * 0.7, dx, top + len);
    ctx.quadraticCurveTo(dx + 7, top + len * 0.7, dx + 6, top);
    ctx.closePath();
    const dg = ctx.createLinearGradient(dx - 6, top, dx + 6, top + len);
    dg.addColorStop(0, '#c79a45');
    dg.addColorStop(0.5, '#e8cd86');
    dg.addColorStop(1, '#8d6522');
    ctx.fillStyle = dg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(74,50,12,0.85)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,250,224,0.5)';
    ctx.beginPath(); ctx.ellipse(dx - 2, top + len * 0.55, 1.2, 2.6, 0, 0, TAU); ctx.fill();
  }

  // gold pressure spear that reaches into the empty corner
  const press2 = smoothstep(2.05, 2.5, u);
  if (press2 > 0.01) {
    ctx.save();
    ctx.globalAlpha = press2 * 0.9;
    const px0 = g.x + g.w - 10, py0 = g.y + g.h - 70;
    const px1 = 1440, py1 = 706;
    const px2 = 1578, py2 = 824;
    ctx.strokeStyle = 'rgba(210,161,77,0.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(px0, py0);
    ctx.quadraticCurveTo(px1 - 40, py1 - 40, px2, py2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(18,16,13,0.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(px0 + 2, py0 - 4);
    ctx.quadraticCurveTo(px1 - 36, py1 - 46, px2 + 2, py2 - 6);
    ctx.stroke();
    // arrow head
    ctx.fillStyle = 'rgba(210,161,77,0.95)';
    ctx.beginPath();
    ctx.moveTo(px2 + 16, py2 + 14);
    ctx.lineTo(px2 - 24, py2 + 2);
    ctx.lineTo(px2 - 2, py2 - 26);
    ctx.closePath();
    ctx.fill();
    // pressure ticks along the spear
    ctx.strokeStyle = 'rgba(18,16,13,0.55)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 13; i++) {
      const t = i / 12;
      const x = (1 - t) * (1 - t) * px0 + 2 * (1 - t) * t * (px1 - 40) + t * t * px2;
      const y = (1 - t) * (1 - t) * py0 + 2 * (1 - t) * t * (py1 - 40) + t * t * py2;
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 8);
      ctx.lineTo(x + 4, y + 7);
      ctx.stroke();
    }
    KIT.drawText(ctx, 'PRESSURE → 0', 1466, 842, {
      size: 12, font: KIT.FONT.mono, weight: 700, color: 'rgba(18,16,13,0.7)', letterSpacing: 1.3,
    });
    ctx.restore();
  }
  ctx.restore();
  return g;
}

/* ------------------------------------------------------------ 5. white slab */
function whiteSlot(u) {
  const push = easeOut(clamp01(u / 1.8));
  const squeeze = smoothstep(1.1, 2.0, u);
  const cx = lerp(WS_C0[0], WS_C1[0], push) + squeeze * 6;
  const cy = lerp(WS_C0[1], WS_C1[1], push);
  const rot = WS_ROT * (0.35 + push * 0.65);
  return { cx, cy, rot, squeeze, push };
}

function drawWhite(ctx, u) {
  const st = whiteSlot(u);
  if (!BLOCK) return st;
  // the gold dagger digs into the block's upper-left corner
  const dent = smoothstep(1.2, 1.9, u);
  ctx.save();
  ctx.translate(st.cx, st.cy);
  ctx.rotate(st.rot);
  // a cold cast shadow, then the slab
  ctx.save();
  ctx.translate(15, 18);
  ctx.fillStyle = 'rgba(12,10,8,0.24)';
  ctx.fillRect(-WS_W / 2, -WS_H / 2, WS_W, WS_H);
  ctx.restore();
  // rime overlay: a growing frozen sheen on the left edge
  ctx.drawImage(BLOCK, -WS_W / 2 - WPAD, -WS_H / 2 - WPAD);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-WS_W / 2, -WS_H / 2, WS_W, WS_H);
  ctx.clip();
  const sheen = ctx.createLinearGradient(-WS_W / 2, 0, -WS_W / 2 + 220, 0);
  const amt = 0.16 + 0.22 * smoothstep(1.2, 2.0, u);
  sheen.addColorStop(0, `rgba(214,240,248,${amt})`);
  sheen.addColorStop(0.5, `rgba(214,240,248,${amt * 0.35})`);
  sheen.addColorStop(1, 'rgba(214,240,248,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(-WS_W / 2, -WS_H / 2, WS_W, WS_H);
  // dent: a cold-black notch where the gold drip presses the block
  if (dent > 0) {
    const dx = -WS_W / 2 + 118;
    ctx.fillStyle = `rgba(18,24,28,${0.34 * dent})`;
    ctx.beginPath();
    ctx.moveTo(dx - 74, -WS_H / 2);
    ctx.quadraticCurveTo(dx, -WS_H / 2 + 54 * dent, dx + 74, -WS_H / 2);
    ctx.lineTo(dx + 74, -WS_H / 2 + 6);
    ctx.quadraticCurveTo(dx, -WS_H / 2 + 60 * dent, dx - 74, -WS_H / 2 + 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(180,222,236,${0.6 * dent})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(dx - 74, -WS_H / 2);
    ctx.quadraticCurveTo(dx, -WS_H / 2 + 54 * dent, dx + 74, -WS_H / 2);
    ctx.stroke();
    // cracks radiating from the dent
    ctx.strokeStyle = `rgba(214,242,250,${0.5 * dent})`;
    for (let i = 0; i < 5; i++) {
      const a = -0.5 + i * 0.35;
      const len = 30 + i * 18;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(dx, -WS_H / 2 + 22);
      ctx.lineTo(dx + Math.cos(a + Math.PI / 2) * len * 0.7, -WS_H / 2 + 22 + Math.sin(a + Math.PI / 2) * len);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.restore();
  return st;
}

/** Cold breath left in the air where the frozen block was. */
function drawFrostMist(ctx, u) {
  const t = u - 2.0;
  if (t < 0 || t > 2.2) return;
  const st = whiteSlot(2.0);
  const a = (1 - smoothstep(0.1, 2.0, t));
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 4; i++) {
    const cx = st.cx - 260 + i * 190 + Math.sin(t * 1.4 + i) * 20;
    const cy = st.cy - 34 + i * 22;
    const r = 150 + i * 60;
    const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, r);
    g.addColorStop(0, `rgba(202,236,246,${0.16 * a})`);
    g.addColorStop(0.55, `rgba(190,226,238,${0.07 * a})`);
    g.addColorStop(1, 'rgba(190,226,238,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r * 0.7, r * 2, r * 1.4);
  }
  ctx.restore();
}

function drawShards(ctx, u) {
  const F = FRAC;
  if (!F.atlas) return;
  const st = whiteSlot(2.0);
  const t = u - 2.0;
  if (t < 0) return;
  const sr = Math.sin(st.rot), cr = Math.cos(st.rot);
  // shard local coordinates run 0..WS_W / 0..WS_H; the slab is drawn centred
  const place = (lx, ly) => {
    const ox = lx - WS_W / 2, oy = ly - WS_H / 2;
    return [st.cx + ox * cr - oy * sr, st.cy + ox * sr + oy * cr];
  };
  ctx.save();
  if (t < FRAC_SWAP) {
    // stage 1: twelve slabs
    for (const p of F.parents) {
      const lx = p.cx + p.vx * t, ly = p.cy + p.vy * t;
      const [sx, sy] = place(lx, ly);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(st.rot + p.spin * t);
      ctx.drawImage(F.atlas, p.sx, p.sy, p.sw, p.sh, p.dx, p.dy, p.sw, p.sh);
      ctx.restore();
    }
    ctx.restore();
    return;
  }
  // stage 2: ~900 frost shards
  const tv = t - FRAC_SWAP;
  const nx = 0.569, ny = 0.822;
  const bladeP = smoothstep(4.02, 5.35, u);
  const qc = 960 * nx + 560 * ny;
  const bladeFront = qc - 1520 + 3040 * bladeP;
  const fade = 1 - smoothstep(4.15, 5.3, u);
  for (const s of F.shards) {
    const tv2 = Math.max(0, tv - s.delay);
    const drag = 1 / (1 + 1.15 * tv2);
    const ramp = smoothstep(0, 0.42, tv2);
    const dt = tv2 * ramp;
    const lx = s.cx + s.vx * dt * drag;
    const ly = s.cy + s.vy * dt * drag + (60 + s.fall * 430) * dt * dt;
    let [sx, sy] = place(lx, ly);
    // red blade shoves everything along its 45° normal
    const proj = sx * nx + sy * ny;
    const push = Math.max(0, bladeFront - proj);
    sx += nx * push * 1.5;
    sy += ny * push * 1.5;
    if (sx < -120 || sx > W + 120 || sy < -140 || sy > H + 140) continue;
    const a = fade * (0.9 + s.tint * 0.1);
    if (a <= 0.02) continue;
    ctx.globalAlpha = a;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(st.rot + s.rot0 + s.spin * tv2);
    const k = 1.34;
    ctx.drawImage(F.atlas, s.sx, s.sy, s.sw, s.sh, s.dx * k, s.dy * k, s.sw * k, s.sh * k);
    ctx.restore();
  }
  ctx.restore();
}

/** The twelve fracture lines keep hovering for a beat after the shards leave. */
function drawFractureGhost(ctx, u) {
  const t = u - 2.0;
  if (t <= 0.02 || t > 1.0) return;
  const F = FRAC;
  const st = whiteSlot(2.0);
  const sr = Math.sin(st.rot), cr = Math.cos(st.rot);
  const a = (1 - smoothstep(0.15, 1.0, t)) * 0.7;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = 'rgba(212,244,252,0.9)';
  ctx.lineWidth = 1.4;
  for (const p of F.parents) {
    const lx = p.cx + p.vx * t, ly = p.cy + p.vy * t;
    const sx = st.cx + (lx - WS_W / 2) * cr - (ly - WS_H / 2) * sr;
    const sy = st.cy + (lx - WS_W / 2) * sr + (ly - WS_H / 2) * cr;
    ctx.beginPath();
    p.poly.forEach((q, i) => {
      const qx = q[0] - p.cx, qy = q[1] - p.cy;
      const wx = sx + qx * cr - qy * sr, wy = sy + qx * sr + qy * cr;
      if (i === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
    });
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ 6. blade */
function drawBlade(ctx, u) {
  const p = smoothstep(4.02, 5.15, u);
  if (p <= 0 || p >= 1) return;
  const nx = 0.569, ny = 0.822;
  const qc = 960 * nx + 560 * ny;
  const front = qc - 1520 + 3040 * p;
  const ax = -ny, ay = nx; // along the blade
  const cx = nx * front, cy = ny * front;
  const L = 2700, T = 68;
  ctx.save();
  const quad = (t, dx, dy) => [
    [cx - ax * L + nx * (t + dy) + ax * dx, cy - ay * L + ny * (t + dy) + ay * dx],
    [cx + ax * L + nx * (t + dy) + ax * dx, cy + ay * L + ny * (t + dy) + ay * dx],
    [cx + ax * L - nx * (t + dy) + ax * dx, cy + ay * L - ny * (t + dy) + ay * dx],
    [cx - ax * L - nx * (t + dy) + ax * dx, cy - ay * L - ny * (t + dy) + ay * dx],
  ];
  // dark backing (the blade has a spine)
  polyPath(ctx, quad(T, 0, 10));
  ctx.fillStyle = 'rgba(22,16,12,0.9)';
  ctx.fill();
  // red body
  polyPath(ctx, quad(T, 0, 0));
  const bg = ctx.createLinearGradient(cx + nx * T, cy + ny * T, cx - nx * T, cy - ny * T);
  bg.addColorStop(0, 'rgba(214,58,44,0.97)');
  bg.addColorStop(0.45, 'rgba(178,34,26,0.97)');
  bg.addColorStop(1, 'rgba(96,14,10,0.94)');
  ctx.fillStyle = bg;
  ctx.fill();
  // leading edge glint + trailing hairline
  ctx.strokeStyle = 'rgba(255,243,218,0.95)';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(cx - ax * L - nx * T, cy - ay * L - ny * T); ctx.lineTo(cx + ax * L - nx * T, cy + ay * L - ny * T); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,210,180,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx - ax * L - nx * (T + 9), cy - ay * L - ny * (T + 9)); ctx.lineTo(cx + ax * L - nx * (T + 9), cy + ay * L - ny * (T + 9)); ctx.stroke();
  ctx.strokeStyle = 'rgba(18,16,13,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx - ax * L + nx * T, cy - ay * L + ny * T); ctx.lineTo(cx + ax * L + nx * T, cy + ay * L + ny * T); ctx.stroke();
  // speed streaks feeding the blade
  ctx.save();
  ctx.strokeStyle = 'rgba(255,226,200,0.55)';
  for (let i = 0; i < 34; i++) {
    const t = i / 34;
    const bx = cx - ax * L + ax * 2 * L * t;
    const by = cy - ay * L + ay * 2 * L * t;
    if (bx < -100 || bx > W + 100) continue;
    const len = 40 + (i % 5) * 46;
    ctx.lineWidth = 1 + (i % 3) * 0.8;
    ctx.beginPath();
    ctx.moveTo(bx - nx * (T + 14), by - ny * (T + 14));
    ctx.lineTo(bx - nx * (T + 14 + len), by - ny * (T + 14 + len));
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

/* ------------------------------------------------------------------- 7. gate */
function drawGate(ctx, u) {
  const p = smoothstep(4.9, 5.4, u);
  if (p <= 0) return;
  const x = 1630, y = 236, w = 214, h = 578;
  ctx.save();
  ctx.globalAlpha = p;
  // warm light spilling onto the paper, before the frame
  const spill = ctx.createLinearGradient(x - 120, y + h, x, y + h - 200);
  spill.addColorStop(0, 'rgba(232,186,110,0.32)');
  spill.addColorStop(1, 'rgba(232,186,110,0)');
  ctx.fillStyle = spill;
  ctx.fillRect(x - 130, y + 200, 160, h - 180);
  // the doorway: a dark interior with the next era glowing at the threshold
  const door = ctx.createLinearGradient(x, y, x, y + h);
  door.addColorStop(0, '#1b130c');
  door.addColorStop(0.55, '#120d08');
  door.addColorStop(1, '#2b1d0f');
  ctx.fillStyle = door;
  ctx.fillRect(x, y, w, h);
  // interior light: a thin crack of the next world
  ctx.save();
  ctx.beginPath(); ctx.rect(x + 6, y + 6, w - 12, h - 12); ctx.clip();
  const inGlow = ctx.createLinearGradient(x, y + h * 0.5, x, y + h);
  inGlow.addColorStop(0, 'rgba(240,214,160,0)');
  inGlow.addColorStop(0.5, 'rgba(240,214,160,0.26)');
  inGlow.addColorStop(1, 'rgba(255,242,212,0.95)');
  ctx.fillStyle = inGlow;
  ctx.fillRect(x, y, w, h);
  // backlit dust in the doorway
  const dr = mulberry32(7559);
  for (let i = 0; i < 42; i++) {
    const dx = x + 10 + dr() * (w - 20);
    const dy = y + h * 0.45 + dr() * h * 0.5;
    ctx.fillStyle = `rgba(255,240,205,${(0.1 + dr() * 0.4) * (0.4 + (dy - y) / h)})`;
    ctx.fillRect(dx, dy, 1 + dr() * 2, 1 + dr() * 2);
  }
  // vertical light bars: the ribs of the next frame
  for (let i = 0; i < 4; i++) {
    const bx = x + 34 + i * 46 + Math.sin(u * 0.8 + i) * 2;
    ctx.fillStyle = `rgba(244,226,188,${0.08 + i * 0.03})`;
    ctx.fillRect(bx, y + 26, 3, h - 90);
  }
  // a traveller crossing the threshold, backlit and small
  const fx = x + w * 0.52;
  const fy = y + h - 18;
  ctx.fillStyle = 'rgba(6,4,2,0.95)';
  ctx.beginPath();
  ctx.moveTo(fx - 11, fy);
  ctx.lineTo(fx - 14, fy - 54);
  ctx.quadraticCurveTo(fx - 11, fy - 76, fx, fy - 76);
  ctx.quadraticCurveTo(fx + 12, fy - 76, fx + 14, fy - 54);
  ctx.lineTo(fx + 11, fy);
  ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(fx, fy - 86, 8, 0, TAU); ctx.fill();
  // staff
  ctx.strokeStyle = 'rgba(6,4,2,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(fx + 18, fy - 48); ctx.lineTo(fx + 22, fy + 2); ctx.stroke();
  // threshold shadow
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y + h - 14, w, 14);
  // a rim of warm light around the silhouette (backlight bleed)
  ctx.globalCompositeOperation = 'lighter';
  const rim = ctx.createRadialGradient(fx, fy - 40, 8, fx, fy - 40, 60);
  rim.addColorStop(0, 'rgba(255,226,170,0.18)');
  rim.addColorStop(1, 'rgba(255,226,170,0)');
  ctx.fillStyle = rim;
  ctx.fillRect(fx - 70, fy - 120, 140, 160);
  ctx.restore();
  // constructivist frame: red inner, black steel
  ctx.strokeStyle = C.red;
  ctx.lineWidth = 5;
  ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
  ctx.fillStyle = C.black;
  ctx.fillRect(x - 26, y - 24, w + 52, 26);
  ctx.fillRect(x - 26, y - 24, 20, h + 42);
  ctx.fillRect(x + w + 6, y - 24, 20, h + 42);
  ctx.fillRect(x - 26, y + h + 2, w + 52, 18);
  // red diagonal brace across the top corner
  ctx.strokeStyle = C.red;
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(x - 18, y + 96); ctx.lineTo(x + 66, y - 14); ctx.stroke();
  // bolts
  ctx.fillStyle = 'rgba(221,212,196,0.7)';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath(); ctx.arc(x - 16, y + 46 + i * 118, 2.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w + 16, y + 46 + i * 118, 2.4, 0, TAU); ctx.fill();
  }
  // label on the lintel
  KIT.drawText(ctx, 'GATE / 1150 KM', x + w / 2, y - 11, {
    size: 12, font: KIT.FONT.mono, weight: 700, color: 'rgba(221,212,196,0.95)', align: 'center', letterSpacing: 2.2,
  });
  // thin bone cross-rule at the threshold
  ctx.strokeStyle = 'rgba(244,234,209,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - 30, y + h); ctx.lineTo(x + w + 30, y + h); ctx.stroke();
  ctx.restore();
  // a dashed leader from the caption toward the gate
  ctx.save();
  ctx.globalAlpha = p * 0.75;
  ctx.strokeStyle = 'rgba(18,16,13,0.5)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([10, 9]);
  ctx.beginPath();
  ctx.moveTo(CAP.x + CAP.w - 20, CAP.y + 30);
  ctx.quadraticCurveTo(1560, 470, x - 44, y + 300);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(208,52,40,0.9)';
  ctx.beginPath();
  ctx.moveTo(x - 36, y + 300);
  ctx.lineTo(x - 64, y + 290);
  ctx.lineTo(x - 50, y + 316);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/** A cold field-record strip: facts as typography, the poster's small evidence. */
function drawFieldRecord(ctx, u) {
  const p = smoothstep(1.15, 1.6, u);
  if (p <= 0.001) return;
  const x = 618, y = 868, w = 816, h = 48;
  ctx.save();
  ctx.globalAlpha = p;
  ctx.fillStyle = C.black;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.red;
  ctx.fillRect(x, y, 10, h);
  ctx.fillStyle = 'rgba(221,212,196,0.16)';
  ctx.fillRect(x + 10, y + h - 2, w - 10, 2);
  KIT.drawText(ctx, '天寶十四載 · 冬 · 奉先', x + 28, y + 25, {
    size: 20, font: KIT.FONT.serif, weight: 500, color: 'rgba(234,226,208,0.94)', letterSpacing: 1.6,
  });
  KIT.drawText(ctx, '−17°C', x + 330, y + 24, {
    size: 21, font: KIT.FONT.mono, weight: 700, color: 'rgba(169,203,216,0.95)', letterSpacing: 1,
  });
  KIT.drawText(ctx, '粟米 700 文 / 斗', x + 438, y + 24, {
    size: 18, font: KIT.FONT.serif, weight: 400, color: 'rgba(234,226,208,0.8)', letterSpacing: 1,
  });
  KIT.drawText(ctx, '戶 6 · 存 4', x + w - 26, y + 24, {
    size: 19, font: KIT.FONT.serif, weight: 600, color: 'rgba(226,86,66,0.98)', align: 'right', letterSpacing: 1.2,
  });
  // tick rule above the strip
  ctx.strokeStyle = 'rgba(18,16,13,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x + w, y - 12); ctx.stroke();
  for (let i = 0; i <= 26; i++) {
    const tx = x + (w * i) / 26;
    ctx.beginPath(); ctx.moveTo(tx, y - 12); ctx.lineTo(tx, y - 12 + (i % 6 === 0 ? 8 : 3)); ctx.stroke();
  }
  KIT.drawText(ctx, 'FIELD RECORD / 奉先縣', x, y - 26, {
    size: 11, font: KIT.FONT.mono, weight: 600, color: 'rgba(18,16,13,0.62)', letterSpacing: 1.6,
  });
  ctx.restore();
}

/* ----------------------------------------------------------------- 8. caption */
function paintCaptionPaper(ctx) {
  ctx.fillStyle = '#f7f2e4';
  ctx.fillRect(0, 0, CAP.w, CAP.h);
  const g = ctx.createLinearGradient(0, 0, CAP.w, CAP.h);
  g.addColorStop(0, 'rgba(255,253,246,0.55)');
  g.addColorStop(0.7, 'rgba(206,192,166,0.10)');
  g.addColorStop(1, 'rgba(140,126,102,0.24)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CAP.w, CAP.h);
  const r = mulberry32(7556);
  for (let i = 0; i < 520; i++) {
    ctx.fillStyle = r() < 0.5 ? `rgba(255,255,250,${0.1 + r() * 0.3})` : `rgba(110,96,72,${0.03 + r() * 0.09})`;
    ctx.fillRect(r() * CAP.w, r() * CAP.h, 2 + r() * 26, 0.8);
  }
  // a red registration mark, top-left
  ctx.fillStyle = 'rgba(196,42,32,0.85)';
  ctx.fillRect(18, 16, 22, 4);
  ctx.fillRect(18, 16, 4, 22);
  // tiny typographic rule
  ctx.strokeStyle = 'rgba(18,16,13,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(CAP.w - 210, 24); ctx.lineTo(CAP.w - 26, 24); ctx.stroke();
  KIT.drawText(ctx, 'VERNACULAR / 白話', CAP.w - 26, 40, {
    size: 9, font: KIT.FONT.mono, weight: 600, color: 'rgba(18,16,13,0.55)', align: 'right', letterSpacing: 1.3,
  });
}

function drawCaption(ctx, u, cam) {
  const p = smoothstep(2.14, 2.34, u);
  if (p <= 0.001) return;
  if (!CAP_PAPER) {
    CAP_PAPER = KIT.layer('scene06:caption', CAP.w, CAP.h, paintCaptionPaper);
  }
  const rot = -0.004;
  const slide = (1 - easeOut(p)) * -26;
  ctx.save();
  ctx.globalAlpha = p;
  ctx.translate(CAP.x + cam.x + slide, CAP.y + cam.y + 8);
  ctx.rotate(rot);
  // hard pasted-paper shadow
  ctx.fillStyle = 'rgba(10,8,6,0.30)';
  ctx.fillRect(13, 15, CAP.w, CAP.h);
  ctx.fillStyle = 'rgba(10,8,6,0.12)';
  ctx.fillRect(20, 23, CAP.w, CAP.h);
  ctx.drawImage(CAP_PAPER, 0, 0);
  ctx.strokeStyle = 'rgba(18,16,13,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, CAP.w - 1, CAP.h - 1);
  ctx.fillStyle = C.red;
  ctx.fillRect(0, 0, 7, CAP.h);
  ctx.fillStyle = 'rgba(18,16,13,0.9)';
  ctx.fillRect(7, 0, 1.4, CAP.h);
  KIT.drawText(ctx, '那年冬天，他的小儿子饿死在了盛世里。', 34, 58, {
    size: 38, font: KIT.FONT.serif, weight: 500, color: C.ink, letterSpacing: 0.6,
  });
  KIT.drawText(ctx, '—— 天宝十四载 · 奉先', 36, 104, {
    size: 25, font: KIT.FONT.serif, weight: 400, color: 'rgba(32,26,19,0.78)', letterSpacing: 1.4,
  });
  // a tiny pressure scale on the right end of the strip
  ctx.strokeStyle = 'rgba(18,16,13,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(CAP.w - 190, CAP.h - 30); ctx.lineTo(CAP.w - 34, CAP.h - 30); ctx.stroke();
  for (let i = 0; i <= 8; i++) {
    const x = CAP.w - 190 + i * 19.5;
    ctx.beginPath(); ctx.moveTo(x, CAP.h - 30); ctx.lineTo(x, CAP.h - 30 + (i % 4 === 0 ? 9 : 4)); ctx.stroke();
  }
  KIT.drawText(ctx, '0', CAP.w - 190, CAP.h - 12, { size: 8.5, font: KIT.FONT.mono, color: 'rgba(18,16,13,0.5)' });
  KIT.drawText(ctx, '140', CAP.w - 34, CAP.h - 12, { size: 8.5, font: KIT.FONT.mono, color: 'rgba(18,16,13,0.5)', align: 'right' });
  ctx.restore();
  markText('s06-caption', '那年冬天，他的小儿子饿死在了盛世里。', CAP.x + cam.x + 34 - 2, CAP.y + cam.y + 8 + 34, CAP.w - 100, 48, { size: 38 });
}

/* ------------------------------------------------------------------ 9. chips */
function drawFrostBurst(ctx, u) {
  const t = u - 2.0;
  if (t < 0 || t > 1.3) return;
  const a = Math.exp(-t * 4.5);
  const st = whiteSlot(2.0);
  ctx.save();
  ctx.globalAlpha = a * 0.8;
  ctx.translate(st.cx, st.cy);
  ctx.rotate(st.rot);
  const r = mulberry32(7557);
  for (let i = 0; i < 34; i++) {
    const ang = (i / 34) * TAU + r() * 0.2;
    const len = (60 + r() * 320) * (0.4 + t * 2.2);
    ctx.strokeStyle = i % 2 ? 'rgba(214,246,255,0.75)' : 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 0.8 + r() * 2.2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * 30, Math.sin(ang) * 18);
    let x = Math.cos(ang) * len, y = Math.sin(ang) * len * 0.55;
    ctx.lineTo(x, y);
    ctx.stroke();
    if (i % 3 === 0) {
      const a2 = ang + 0.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a2) * len * 0.3, y + Math.sin(a2) * len * 0.3);
      ctx.stroke();
    }
  }
  ctx.restore();
}

let DUST = null;
function iceDust() {
  if (DUST) return DUST;
  const r = mulberry32(75571);
  DUST = [];
  for (let i = 0; i < 190; i++) {
    const a = r() * TAU;
    const sp = 120 + Math.pow(r(), 1.3) * 720;
    DUST.push({
      x: (r() - 0.5) * 780, y: (r() - 0.5) * 150,
      vx: Math.cos(a) * sp * 1.1 + 70, vy: Math.sin(a) * sp * 0.55 + 40,
      len: 1 + r() * 5, a: 0.2 + r() * 0.7, spin: (r() - 0.5) * 6,
    });
  }
  return DUST;
}
function drawIceDust(ctx, u) {
  const t = u - 2.0;
  if (t < 0 || t > 1.6) return;
  const st = whiteSlot(2.0);
  const D = iceDust();
  ctx.save();
  ctx.translate(st.cx, st.cy);
  ctx.rotate(st.rot);
  ctx.lineCap = 'round';
  for (const p of D) {
    const drag = 1 / (1 + 1.4 * t);
    const x = p.x + p.vx * t * drag;
    const y = p.y + p.vy * t * drag + 60 * t * t;
    const a = p.a * (1 - smoothstep(0.1, 1.5, t));
    if (a <= 0.02) continue;
    ctx.strokeStyle = `rgba(226,247,255,${a.toFixed(3)})`;
    ctx.lineWidth = 0.8 + a * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - Math.cos(p.spin) * p.len, y - Math.sin(p.spin) * p.len);
    ctx.stroke();
  }
  ctx.restore();
}

/* ----------------------------------------------------------------- 10. frame */
function camera(u) {
  const p = smoothstep(4.4, 5.8, u);
  return { x: -24 * p, y: -14 * p, z: 1 + 0.012 * p };
}

export function renderAt(ctx, u, beat, env = {}) {
  if (!FRAC.shards) buildFracture();
  if (!FIELD) FIELD = KIT.layer('scene06:field', W, H, paintField);

  const cam = camera(u);
  const press = easeOut(clamp01(u / 1.75));
  const oil = smoothstep(0.3, 1.3, u);
  const beatPulse = beat && beat.pulse ? beat.pulse : 0;
  const jolt = u >= 2 && u < 2.6 ? Math.exp(-(u - 2) * 11) * 7 : 0;

  ctx.save();
  // camera: a slow constructivist push after the blade sweep
  ctx.translate(W / 2 + cam.x + Math.sin(u * 63) * jolt, H / 2 + cam.y + Math.cos(u * 47) * jolt * 0.6);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-W / 2, -H / 2);

  ctx.drawImage(FIELD, -6, -4, W + 12, H + 8);

  // animated constructivist annotations behind the slabs
  drawMeasure(ctx, u, press);

  // blade passes behind the gold slab, over the frozen shards
  drawBlade(ctx, u);

  // white slab: whole before the downbeat; the gold piles on top of it
  if (u < 2.0) drawWhite(ctx, u);
  const gold = drawGold(ctx, u, press, oil);

  // the frozen block bursts through, in front of the gold: frost shards
  if (u >= 2.0) {
    drawShards(ctx, u);
    drawFrostMist(ctx, u);
    drawFractureGhost(ctx, u);
    drawIceDust(ctx, u);
    drawFrostBurst(ctx, u);
  }

  // gold slab's own pulse
  ctx.save();
  ctx.globalAlpha = beatPulse * 0.25;
  ctx.fillStyle = 'rgba(255,240,200,0.5)';
  ctx.fillRect(gold.x + 4, gold.y + 6, gold.w - 8, 6);
  ctx.restore();

  drawGate(ctx, u);
  drawFieldRecord(ctx, u);
  drawCaption(ctx, u, { x: cam.x + Math.sin(u * 63) * jolt, y: cam.y + Math.cos(u * 47) * jolt * 0.6 });
  ctx.restore();

  /* marks: the poem's two bodies + the vernacular line */
  const goldW = KIT.measure(ctx, '朱门酒肉臭', { size: 150, font: KIT.FONT.display, weight: 900, letterSpacing: 8 });
  markText('s06-gold', '朱门酒肉臭', gold.x + gold.w / 2 - goldW / 2, gold.y + gold.h / 2 - 78, goldW, 152, { size: 150, align: 'center' });
  const st = whiteSlot(Math.min(u, 2.0));
  markText('s06-white', '路有冻死骨', st.cx - 322, st.cy - 58, 644, 116, { size: 104, align: 'center' });
  markText('s06-note', '—— 天宝十四载 · 奉先', CAP.x + cam.x + 36, CAP.y + cam.y + 92, 320, 34, { size: 25 });

  /* global print treatment */
  ctx.save();
  // freeze flash exactly on the downbeat
  if (u >= 2.0) {
    const fl = Math.exp(-(u - 2.0) * 16);
    if (fl > 0.01) {
      ctx.globalAlpha = fl * 0.72;
      ctx.fillStyle = 'rgba(244,252,255,1)';
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalAlpha = 1;
  }
  // careful vignette: keeps the top-left card / top-right log untouched
  const v = ctx.createRadialGradient(960, 560, 460, 980, 570, 1180);
  v.addColorStop(0, 'rgba(40,24,8,0)');
  v.addColorStop(0.72, 'rgba(50,30,10,0.05)');
  v.addColorStop(1, 'rgba(28,16,6,0.22)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  const grain = KIT.layer('scene06:grain', 480, 270, (c) => KIT.grainLayer(480, 270, 755, { amp: 0.11 }));
  ctx.globalAlpha = 0.20;
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(grain, 0, 0, W, H);
  ctx.restore();
  void env;
}

/* -------------------------------------------------------- animated measure */
function drawMeasure(ctx, u, press) {
  const st = whiteSlot(u);
  const a = smoothstep(0.55, 1.3, u) * (1 - smoothstep(1.96, 2.04, u));
  if (a <= 0.01) return;
  const cr = Math.cos(st.rot), sr = Math.sin(st.rot);
  const corner = (lx, ly) => [st.cx + lx * cr - ly * sr, st.cy + lx * sr + ly * cr];
  const [rx, ry] = corner(WS_W / 2, 0);
  const [bx, by] = corner(0, WS_H / 2);
  const rightWall = 1876, bottomWall = 1038;
  ctx.save();
  ctx.globalAlpha = a;
  // right-hand gap: the slab is being pushed into the corner
  ctx.strokeStyle = 'rgba(18,16,13,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(rx + 10, ry - 30); ctx.lineTo(rx + 10, ry + 30); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(rightWall, ry - 30); ctx.lineTo(rightWall, ry + 30); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(rx + 10, ry); ctx.lineTo(rightWall, ry); ctx.stroke();
  ctx.strokeStyle = C.red; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(rx + 14, ry); ctx.lineTo(rightWall - 4, ry); ctx.stroke();
  for (let i = 0; i <= 8; i++) {
    const x = rx + 14 + (rightWall - rx - 18) * (i / 8);
    ctx.strokeStyle = 'rgba(18,16,13,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, ry - 5); ctx.lineTo(x, ry + 5); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(18,16,13,0.92)';
  ctx.fillRect(rx + 16, ry - 34, 84, 19);
  KIT.drawText(ctx, `GAP ${Math.round(rightWall - rx)}`, rx + 58, ry - 24, {
    size: 11, font: KIT.FONT.mono, weight: 700, color: 'rgba(222,212,193,0.96)', align: 'center', letterSpacing: 0.8,
  });
  // bottom-hand gap
  ctx.strokeStyle = 'rgba(18,16,13,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(bx - 26, by + 8); ctx.lineTo(bx + 26, by + 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx - 26, bottomWall); ctx.lineTo(bx + 26, bottomWall); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx, by + 8); ctx.lineTo(bx, bottomWall); ctx.stroke();
  ctx.strokeStyle = C.red; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(bx, by + 12); ctx.lineTo(bx, bottomWall - 4); ctx.stroke();
  for (let i = 0; i <= 6; i++) {
    const y = by + 12 + (bottomWall - by - 16) * (i / 6);
    ctx.strokeStyle = 'rgba(18,16,13,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx - 5, y); ctx.lineTo(bx + 5, y); ctx.stroke();
  }
  // moving arrow: pressure from the gold toward the corner
  const arrowP = (u * 0.9) % 1;
  const axx = lerp(880, rx - 120, arrowP);
  const ayy = lerp(520, ry - 40, arrowP);
  ctx.fillStyle = `rgba(208,52,40,${0.85 - arrowP * 0.5})`;
  ctx.beginPath();
  ctx.moveTo(axx + 34, ayy + 6);
  ctx.lineTo(axx - 6, ayy - 16);
  ctx.lineTo(axx - 6, ayy + 4);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
