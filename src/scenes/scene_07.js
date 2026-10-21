/**
 * 07 · 表现主义木刻版画 · 磁带熔毁 / Woodcut Print & Tape Meltdown · 755
 *
 * A bone-paper woodcut of the rebellion: a red sun, a broken gate, spears,
 * crows, smoke. On the second downbeat the print itself is treated like a
 * magnetic tape — slowed, misregistered, caught in a four-hit skip loop between
 * 「国破」 and 「山河在」. Then the block splits down the middle into an abyss.
 */
import KIT from '../kit/index.js';
import { clamp01, lerp, smoothstep, easeOut, hash, unit, mulberry32, TAU } from '../kit/math.js';
import { markText } from '../kit/debug.js';
import { roughRect } from '../kit/ink-engine.js';

const W = 1920, H = 1080;
const INK = '#171310';
const PAPER = '#e4dac2';
const RED = '#b62b22';
const RED_DEEP = '#7f1814';

let BASE = null;
let SCRATCH = null;

function polygonJitter(pts, seed, amt = 2.2) {
  const r = mulberry32(hash('polyjitter', seed));
  return pts.map((p) => [p[0] + (r() - 0.5) * amt, p[1] + (r() - 0.5) * amt]);
}

function fillPoly(ctx, pts, color, seed = 1) {
  ctx.beginPath();
  const p = polygonJitter(pts, seed, 1.8);
  ctx.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function carveFill(ctx, pts, opts = {}) {
  const seed = opts.seed ?? 1;
  fillPoly(ctx, pts, opts.color || INK, seed);
  if (opts.hatch) {
    KIT.ink.hatch(ctx, pts, {
      color: opts.hatchColor || PAPER, gap: opts.gap ?? 9, angle: opts.angle ?? -0.62,
      alpha: opts.hatchAlpha ?? 0.42, width: opts.width ?? 1.1, jitter: 1.5, seed,
    });
  }
}

function ridgeLine(x, seed, base = 520, amp = 150) {
  return base - KIT.fbm1(x * 0.0024 + 4.3, 5, seed) * amp - KIT.noise2(x * 0.008, 1.1, seed + 5) * 34;
}

function drawSun(ctx) {
  const cx = 1120, cy = 286, r = 148;
  const rr = mulberry32(755);
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * TAU;
    const rad = r * (0.93 + rr() * 0.1);
    const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = RED;
  ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.98, 0, TAU); ctx.clip();
  ctx.strokeStyle = 'rgba(20,14,11,0.55)';
  for (let i = 0; i < 18; i++) {
    ctx.lineWidth = 0.8 + rr() * 2.3;
    const y = cy - r + i * 16 + rr() * 10;
    ctx.beginPath(); ctx.moveTo(cx - r, y); ctx.lineTo(cx + r, y - 8); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(23,17,13,0.9)';
  ctx.beginPath(); ctx.arc(cx - 36, cy - 3, 16, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 42, cy + 43, 9, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(23,18,13,0.7)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU + 0.1;
    const len = 18 + (i % 5) * 17 + rr() * 35;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r + 9), cy + Math.sin(a) * (r + 9));
    ctx.lineTo(cx + Math.cos(a) * (r + 9 + len), cy + Math.sin(a) * (r + 9 + len));
    ctx.stroke();
  }
  ctx.restore();
}

function drawMountains(ctx) {
  for (let layer = 0; layer < 3; layer++) {
    const pts = [[0, 550 + layer * 36]];
    for (let x = 0; x <= W; x += 16) {
      let y = ridgeLine(x, 91 + layer, 560 + layer * 40, 170 - layer * 25);
      if (x > 800 && x < 1400) y += 90;
      pts.push([x, y]);
    }
    pts.push([W, 920], [0, 920]);
    carveFill(ctx, pts, {
      color: layer === 0 ? 'rgba(22,18,14,0.92)' : `rgba(${24 + layer * 7},${19 + layer * 5},${14 + layer * 4},0.82)`,
      hatch: true, gap: 7 + layer * 4, angle: -0.7 + layer * 0.1, hatchAlpha: 0.28 + layer * 0.08, seed: 91 + layer,
    });
  }
}

function drawCity(ctx) {
  const wall = [
    [280, 920], [280, 680], [420, 680], [420, 640], [520, 640], [520, 680],
    [690, 680], [690, 610], [1260, 610], [1260, 680], [1420, 680], [1420, 650],
    [1530, 650], [1530, 690], [1640, 690], [1640, 940], [280, 940],
  ];
  carveFill(ctx, wall, { seed: 121, hatch: true, gap: 10, angle: 0.18, hatchAlpha: 0.18 });
  for (let x = 300; x < 1620; x += 62) {
    carveFill(ctx, [[x, 680], [x + 30, 680], [x + 30, 640], [x, 640]], { color: 'rgba(23,18,13,0.96)', seed: 130 + x });
  }
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(780, 940); ctx.lineTo(780, 730);
  ctx.quadraticCurveTo(960, 600, 1140, 730);
  ctx.lineTo(1140, 940); ctx.closePath();
  ctx.fillStyle = PAPER; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(822, 940); ctx.lineTo(822, 772);
  ctx.quadraticCurveTo(960, 684, 1098, 772);
  ctx.lineTo(1098, 940); ctx.closePath();
  ctx.fillStyle = 'rgba(20,16,12,0.92)'; ctx.fill();
  ctx.strokeStyle = 'rgba(220,207,179,0.32)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(842 + i * 40, 760 + (i % 2) * 14); ctx.lineTo(842 + i * 40, 938); ctx.stroke(); }
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(822, 800 + i * 36); ctx.lineTo(1098, 800 + i * 36); ctx.stroke(); }
  ctx.fillStyle = INK;
  for (let i = 0; i < 11; i++) {
    const x = 775 + i * 34;
    ctx.beginPath(); ctx.moveTo(x, 720 + (i % 3) * 13); ctx.lineTo(x + 20, 700 + (i % 4) * 8); ctx.lineTo(x + 9, 742); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  for (const tx of [610, 1320]) {
    for (let t = 0; t < 2; t++) {
      const bx = tx + t * 18, by = 600 - t * 105;
      carveFill(ctx, [[bx - 95, by], [bx - 50, by - 36], [bx + 52, by - 38], [bx + 98, by], [bx + 66, by + 18], [bx - 62, by + 18]], { color: INK, seed: 400 + tx + t, hatch: true, gap: 8, angle: 0.2, hatchAlpha: 0.14 });
      carveFill(ctx, [[bx - 20, by + 18], [bx + 22, by + 18], [bx + 18, by + 96], [bx - 16, by + 96]], { color: 'rgba(22,17,13,0.94)', seed: 500 + tx + t, hatch: true, gap: 12, angle: 1.2, hatchAlpha: 0.12 });
    }
  }
}

function drawRefugees(ctx) {
  const r = mulberry32(755);
  ctx.strokeStyle = 'rgba(22,17,13,0.85)';
  ctx.lineWidth = 2.2;
  for (let i = 0; i < 16; i++) {
    const x = 90 + i * 110 + r() * 50;
    const y = 760 + r() * 80;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 28, y - 120 - r() * 90); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 28, y - 120 - r() * 90); ctx.lineTo(x - 38, y - 104 - r() * 80); ctx.stroke();
  }
  for (let i = 0; i < 13; i++) {
    const x = 80 + r() * 1670;
    const y = 880 + r() * 60;
    const s = 0.55 + r() * 0.6;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(21,16,12,0.9)';
    ctx.beginPath();
    ctx.moveTo(-12, -60); ctx.lineTo(10, -62); ctx.lineTo(20, -10); ctx.lineTo(12, 0);
    ctx.lineTo(-12, 0); ctx.lineTo(-20, -12); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(2, -74, 10, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(21,16,12,0.9)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(10, -48); ctx.lineTo(34, -86); ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(1440, 850);
  ctx.fillStyle = 'rgba(20,15,11,0.92)';
  ctx.beginPath();
  ctx.moveTo(-110, -20); ctx.lineTo(-78, -64); ctx.lineTo(-20, -74); ctx.lineTo(42, -66);
  ctx.lineTo(82, -86); ctx.lineTo(102, -68); ctx.lineTo(82, -48); ctx.lineTo(42, -34);
  ctx.lineTo(-10, -30); ctx.lineTo(-48, -8); ctx.lineTo(-68, 38); ctx.lineTo(-80, 38);
  ctx.lineTo(-72, -11); ctx.lineTo(-105, 8); ctx.lineTo(-122, 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(20,15,11,0.92)'; ctx.lineWidth = 5;
  for (const [x, y] of [[-70, 4], [-34, 0], [54, -10], [78, -8]]) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2, y + 42); ctx.stroke();
  }
  ctx.restore();
}

function drawCrows(ctx) {
  ctx.save();
  ctx.strokeStyle = 'rgba(20,15,11,0.9)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const x = 220 + i * 145 + unit(755, i, 1) * 80;
    const y = 110 + unit(755, i, 2) * 180;
    const s = 10 + unit(755, i, 3) * 20;
    ctx.beginPath(); ctx.moveTo(x - s, y); ctx.quadraticCurveTo(x - s * 0.3, y - s * 0.7, x, y);
    ctx.quadraticCurveTo(x + s * 0.35, y - s * 0.8, x + s, y - s * 0.12); ctx.stroke();
  }
  ctx.restore();
}

function buildBase() {
  if (BASE) return BASE;
  const canvas = KIT.paper.woodPaper(W, H, { seed: 755, tone: '#e6dcc5' });
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.strokeStyle = 'rgba(26,20,14,0.82)';
  ctx.lineWidth = 5;
  roughRect(ctx, 34, 34, W - 68, H - 68, { seed: 7, jitter: 3, steps: 18 });
  ctx.stroke();
  ctx.lineWidth = 1;
  roughRect(ctx, 46, 46, W - 92, H - 92, { seed: 8, jitter: 2, steps: 16 });
  ctx.stroke();
  ctx.strokeStyle = 'rgba(24,19,14,0.13)';
  for (let i = 0; i < 54; i++) {
    const y = 60 + i * 12;
    ctx.lineWidth = 0.7 + (i % 4) * 0.35;
    ctx.beginPath(); ctx.moveTo(46, y); ctx.lineTo(W - 46, y + (i % 3) * 1.2); ctx.stroke();
  }
  drawSun(ctx);
  drawMountains(ctx);
  drawCity(ctx);
  drawRefugees(ctx);
  drawCrows(ctx);
  const r = mulberry32(761);
  for (let i = 0; i < 1400; i++) {
    const side = r() < 0.5 ? 0 : 1;
    const x = (side ? 1240 : 600) + (r() - 0.5) * 150;
    const y = 500 - r() * 380;
    const rad = 0.7 + r() * 4.5;
    ctx.fillStyle = `rgba(27,22,16,${(0.04 + r() * 0.14).toFixed(3)})`;
    ctx.beginPath(); ctx.ellipse(x + Math.sin(y * 0.05) * 30, y, rad, rad * 1.7, 0, 0, TAU); ctx.fill();
  }
  const fire = [];
  for (let x = 0; x <= W; x += 40) {
    const h = 20 + KIT.noise2(x * 0.01, 0.4, 755) * 100 + Math.sin(x * 0.08) * 20;
    fire.push([x, 980 - h]);
  }
  ctx.save();
  ctx.globalAlpha = 0.68;
  ctx.fillStyle = RED_DEEP;
  ctx.beginPath(); ctx.moveTo(0, 1080); for (const p of fire) ctx.lineTo(p[0], p[1]); ctx.lineTo(W, 1080); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = RED;
  for (let i = 0; i < 20; i++) {
    const x = 100 + r() * 1720;
    ctx.lineWidth = 2 + r() * 7;
    ctx.beginPath(); ctx.moveTo(x, 1000); ctx.quadraticCurveTo(x - 20, 940, x + 16, 910 + r() * 40); ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = RED;
  ctx.fillRect(52, 52, W - 104, H - 104);
  ctx.restore();
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.28;
  const grain = KIT.layer('scene7:grain', 640, 360, (c) => KIT.grainLayer(640, 360, 755, { amp: 0.32 }));
  ctx.drawImage(grain, 0, 0, W, H);
  ctx.restore();
  BASE = canvas;
  return BASE;
}

function ensureScratch() {
  if (!SCRATCH) SCRATCH = KIT.makeCanvas(W, H);
  return SCRATCH;
}

function drawTitleStrip(ctx, u) {
  const p = smoothstep(0.28, 0.8, u) * (1 - smoothstep(1.96, 2.08, u));
  if (p <= 0.001) return;
  const enter = easeOut(clamp01((u - 0.28) / 0.6));
  const y = 492;
  ctx.save();
  ctx.globalAlpha = p;
  ctx.translate((1 - enter) * -120, 0);
  ctx.fillStyle = 'rgba(228,217,193,0.96)';
  roughRect(ctx, 288, y - 10, 1320, 180, { seed: 751, jitter: 7, steps: 22 });
  ctx.fill();
  ctx.strokeStyle = 'rgba(47,30,20,0.35)';
  ctx.lineWidth = 1;
  roughRect(ctx, 299, y + 1, 1298, 158, { seed: 752, jitter: 4, steps: 18 });
  ctx.stroke();
  KIT.ink.roughText(ctx, '七五五 · 安史之乱', 956, y + 100, {
    size: 119, font: KIT.FONT.display, weight: 900, color: 'rgba(182,43,34,0.44)', align: 'center', letterSpacing: 4, seed: 71,
  });
  KIT.ink.roughText(ctx, '七五五 · 安史之乱', 950, y + 96, {
    size: 119, font: KIT.FONT.display, weight: 900, color: INK, align: 'center', letterSpacing: 4, seed: 72,
  });
  KIT.drawText(ctx, 'THE PRINT BREAKS ON THE BEAT · TAPE SPEED 0.7937×', 946, y + 157, {
    size: 8.5, font: KIT.FONT.mono, color: 'rgba(55,37,24,0.68)', align: 'center', letterSpacing: 1.5,
  });
  // The title itself is already cracked: a jagged fault runs through the slab.
  const crack = smoothstep(1.12, 1.85, u);
  if (crack > 0) {
    const r = mulberry32(7407);
    ctx.strokeStyle = `rgba(20,15,10,${0.86 * crack})`;
    ctx.lineWidth = 3.1;
    ctx.lineCap = 'round';
    let cx = 842, cy = y + 2;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    for (let i = 0; i < 10; i++) {
      cx += (r() - 0.35) * 24;
      cy += 18;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(cx - 2, cy - 18); ctx.lineTo(cx - 52, cy + 26); ctx.lineTo(cx - 74, cy + 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 2, cy - 44); ctx.lineTo(cx + 48, cy - 22); ctx.lineTo(cx + 60, cy + 4); ctx.stroke();
    // tiny offset shards along the break
    ctx.fillStyle = 'rgba(23,17,12,0.9)';
    for (let i = 0; i < 8; i++) {
      const px = 828 + r() * 54, py = y + 22 + r() * 122;
      ctx.save(); ctx.translate(px, py); ctx.rotate(r() * 2); ctx.fillRect(0, 0, 2 + r() * 9, 1 + r() * 2); ctx.restore();
    }
  }
  markText('s07-title', '七五五 · 安史之乱', 320, y, 1260, 170, { size: 119 });
  ctx.restore();
}

function drawGlitchWord(ctx, u) {
  if (u < 2.0 || u >= 3.04) return;
  const idx = Math.floor((u - 2.0) / 0.25);
  const local = (u - 2.0) - idx * 0.25;
  if (idx < 0 || idx > 3) return;
  if (local >= 0.16) return;
  const word = idx % 2 === 0 ? '国破' : '山河在';
  ctx.save();
  if (idx % 2 === 0) {
    ctx.fillStyle = 'rgba(229,219,197,0.93)';
    roughRect(ctx, 240, 258, 1440, 480, { seed: 780 + idx, jitter: 10, steps: 26 });
    ctx.fill();
    KIT.ink.roughText(ctx, word, 972, 506, { size: 330, font: KIT.FONT.display, weight: 900, color: RED, align: 'center', letterSpacing: 10, seed: 780 + idx });
    KIT.ink.roughText(ctx, word, 960, 500, { size: 330, font: KIT.FONT.display, weight: 900, color: INK, align: 'center', letterSpacing: 10, seed: 781 + idx });
  } else {
    ctx.fillStyle = 'rgba(17,13,10,0.96)';
    roughRect(ctx, 190, 254, 1540, 500, { seed: 790 + idx, jitter: 12, steps: 24 });
    ctx.fill();
    KIT.ink.roughText(ctx, word, 960, 505, { size: 270, font: KIT.FONT.display, weight: 900, color: 'rgba(231,218,192,0.96)', align: 'center', letterSpacing: 14, seed: 790 + idx });
  }
  ctx.fillStyle = 'rgba(182,43,34,0.9)';
  ctx.fillRect(70, 440 + (idx % 2) * 20, 110, 6);
  ctx.fillRect(1740, 620 - (idx % 2) * 20, 110, 6);
  ctx.font = `700 13px ${KIT.FONT.mono}`;
  ctx.fillStyle = RED;
  ctx.textAlign = 'left';
  ctx.fillText(`SKIP ${idx + 1}/4  ·  REEL STALL  ·  ${word}`, 76, 420);
  ctx.restore();
  markText(`s07-glitch-${idx}`, word, 260, 280, 1400, 440, { size: 300 });
}

function glitchComposite(ctx, u) {
  if (u < 2.0 || u >= 3.0) return false;
  const local = (u - 2.0) % 0.25;
  if (local > 0.17) return false;
  const scratch = ensureScratch();
  const sctx = scratch.getContext('2d');
  sctx.clearRect(0, 0, W, H);
  sctx.drawImage(ctx.canvas, 0, 0);
  ctx.save();
  ctx.fillStyle = 'rgba(182,43,34,0.08)';
  ctx.fillRect(0, 0, W, H);
  const n = 20;
  const hh = H / n;
  for (let i = 0; i < n; i++) {
    const offX = (unit(755, i, Math.floor(u * 30)) - 0.5) * 160;
    const offY = (unit(756, i, Math.floor(u * 30)) - 0.5) * 10;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, i * hh, W, hh + 1); ctx.clip();
    ctx.drawImage(scratch, offX, offY);
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(9,7,5,0.68)';
  for (let i = 0; i < 5; i++) ctx.fillRect(0, (i * 197 + u * 260) % H, W, 2 + (i % 2) * 4);
  ctx.fillStyle = 'rgba(182,43,34,0.38)';
  ctx.fillRect((u * 700) % W, 0, 3, H);
  ctx.restore();
  return true;
}

function drawAbyss(ctx, u) {
  const split = smoothstep(3.0, 3.55, u) * 92;
  if (u < 3.0) return;
  const scratch = ensureScratch();
  const sctx = scratch.getContext('2d');
  sctx.clearRect(0, 0, W, H);
  sctx.drawImage(ctx.canvas, 0, 0);
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W / 2 - 32, H); ctx.clip();
  ctx.drawImage(scratch, -split, 0);
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.rect(W / 2 + 32, 0, W / 2 - 32, H); ctx.clip();
  ctx.drawImage(scratch, split, 0);
  ctx.restore();
  const gap = 32 + split;
  ctx.fillStyle = '#030303';
  ctx.beginPath();
  ctx.moveTo(W / 2 - gap, 0);
  const r = mulberry32(7550);
  for (let y = 0; y <= H; y += 28) ctx.lineTo(W / 2 - gap + (r() - 0.5) * 26, y);
  ctx.lineTo(W / 2 + gap, H);
  for (let y = H; y >= 0; y -= 28) ctx.lineTo(W / 2 + gap + (r() - 0.5) * 26, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(182,43,34,${0.3 + 0.25 * Math.sin(u * 2)})`;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(W / 2, 670, 4, W / 2, 670, 160);
  glow.addColorStop(0, 'rgba(154,44,30,0.24)');
  glow.addColorStop(1, 'rgba(154,44,30,0)');
  ctx.fillStyle = glow; ctx.fillRect(W / 2 - 200, 400, 400, 500);
  for (let i = 0; i < 80; i++) {
    const y = (u * 180 + i * 97) % H;
    ctx.fillStyle = `rgba(210,120,70,${(0.05 + unit(755, i, 2) * 0.22).toFixed(3)})`;
    ctx.fillRect(W / 2 - gap + unit(755, i, 1) * gap * 2, y, 1 + unit(755, i, 3) * 2, 1);
  }
  ctx.restore();
}

function drawTraveller(ctx, u) {
  const P = KIT.rig.pose({ t: u, phase: u * TAU, wind: 0.6, lean: 0.06, look: 0.4, staff: true });
  const move = smoothstep(3.0, 6.0, u);
  const x = lerp(315, 675, move);
  const y = 952;
  const pos = KIT.rig.placed(P, { x, y, scale: 0.92, rot: 0 });
  const parts = pos.parts.filter((p) => ['body', 'sleeve-near', 'sleeve-far', 'skin', 'cap', 'leg-near', 'leg-far', 'beard', 'hair', 'staff'].includes(p.role));
  ctx.save();
  KIT.rig.drawSilhouette(ctx, { ...pos, parts }, { color: 'rgba(17,13,10,0.96)' });
  KIT.rig.drawWire(ctx, { ...pos, parts }, { color: 'rgba(229,218,196,0.22)', width: 1.1, alpha: 0.9 });
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.3;
  ctx.translate(4, 3);
  KIT.rig.drawSilhouette(ctx, { ...pos, parts }, { color: RED });
  ctx.restore();
}

/**
 * The chasm is part of the typesetting. 【国破】 is cut into the left board and
 * 【山河在】 into the right one, each clipped by its own lip of the abyss; on
 * every tape-skip beat the two halves kick apart, with an 18 px vertical fault
 * between them.
 */
function drawSplitCouplet(ctx, u, gap) {
  const p = smoothstep(3.24, 3.72, u);
  if (p <= 0.001) return;
  const t = Math.max(0, u - 3.24);
  const beatQ = Math.pow(1 - ((u % 0.5) / 0.5), 3);
  const q = Math.exp(-t * 2.2) + beatQ * 0.65;
  const leftEdge = W / 2 - gap - 8;
  const rightEdge = W / 2 + gap + 8;
  const CW = 130, CH = 152;
  const cy = 620;
  const drawCard = (cx, ch, seed) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((seed % 2 ? 1 : -1) * 0.014);
    ctx.globalAlpha = p;
    ctx.fillStyle = 'rgba(246,236,214,0.97)';
    roughRect(ctx, -CW / 2, -CH / 2, CW, CH, { seed: 820 + seed, jitter: 3.2, steps: 12 });
    ctx.fill();
    ctx.strokeStyle = 'rgba(182,43,34,0.95)';
    ctx.lineWidth = 6;
    roughRect(ctx, -CW / 2 + 6, -CH / 2 + 6, CW - 12, CH - 12, { seed: 830 + seed, jitter: 2.2, steps: 10 });
    ctx.stroke();
    KIT.drawText(ctx, ch, 0, 0, {
      size: 112, font: KIT.FONT.display, weight: 900, color: '#171310', align: 'center',
    });
    ctx.restore();
  };
  // ---- left board (read left→right: 国 then 破, pressed against the lip)
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, leftEdge, H); ctx.clip();
  ctx.translate(-16 * q, -9 * q);
  for (let i = 0; i < 2; i++) drawCard(leftEdge - CW / 2 - i * (CW + 6), ['国', '破'][1 - i], i);
  ctx.restore();
  // ---- right board
  ctx.save();
  ctx.beginPath(); ctx.rect(rightEdge, 0, W - rightEdge, H); ctx.clip();
  ctx.translate(16 * q, 9 * q);
  for (let i = 0; i < 3; i++) drawCard(rightEdge + CW / 2 + i * (CW + 6), ['山', '河', '在'][i], 10 + i);
  ctx.restore();
  markText('s07-split-left', '国破', leftEdge - 2 * CW - 6, cy - CH / 2, 2 * CW + 6, CH, { size: 112, align: 'right', color: '#171310' });
  markText('s07-split-right', '山河在', rightEdge, cy - CH / 2, 3 * CW + 12, CH, { size: 112, align: 'left', color: '#171310' });
  KIT.debug.markBox('s07-crack', W / 2 - gap, 0, gap * 2, H, { gap, role: 'abyss' });
  void u;
}

/** The xuan-paper nameplate spanning the chasm, carrying the whole couplet. */
function drawBarThree(ctx, u) {
  if (u < 4.18) return;
  const p = smoothstep(4.18, 4.62, u);
  ctx.save();
  ctx.globalAlpha = p;
  const px = 366, py = 842, pw = 1188, ph = 78;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = 'rgba(246,237,217,0.98)';
  roughRect(ctx, px, py, pw, ph, { seed: 860, jitter: 3, steps: 16 });
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(182,43,34,0.85)';
  ctx.lineWidth = 2.4;
  roughRect(ctx, px + 7, py + 7, pw - 14, ph - 14, { seed: 861, jitter: 1.8, steps: 12 });
  ctx.stroke();
  ctx.fillStyle = '#171310';
  KIT.drawText(ctx, '国破山河在，城春草木深。', 906, py + 33, {
    size: 38, font: KIT.FONT.brush, weight: 400, color: '#171310', align: 'center', letterSpacing: 4,
    mark: 's07-poem',
  });
  KIT.drawText(ctx, '—— 杜甫《春望》· 757', 1380, py + 54, {
    size: 13, font: KIT.FONT.serif, weight: 500, color: 'rgba(86,30,22,0.78)', align: 'center', letterSpacing: 1.8,
  });
  ctx.restore();
  KIT.debug.markBox('s07-nameplate', px, py, pw, ph, { role: 'nameplate', y: py });
}

function drawTapeReadout(ctx, u) {
  const p = smoothstep(1.2, 1.7, u);
  if (p <= 0) return;
  const skip = u >= 2 && u < 3 ? `SKIP ${Math.min(4, Math.floor((u - 2) / 0.25) + 1)} / 4` : 'REEL 07 · 0.7937×';
  ctx.save();
  ctx.globalAlpha = p * 0.82;
  ctx.fillStyle = 'rgba(219,206,181,0.12)';
  ctx.fillRect(1374, 900, 450, 60);
  ctx.strokeStyle = 'rgba(224,209,180,0.25)';
  ctx.strokeRect(1374.5, 900.5, 449, 59);
  KIT.drawText(ctx, skip, 1392, 920, { size: 11, font: KIT.FONT.mono, weight: 700, color: 'rgba(230,216,189,0.8)', letterSpacing: 1.5 });
  KIT.drawText(ctx, '−4.00 ST · WOW 0.60 Hz · 15 IPS', 1392, 944, { size: 8, font: KIT.FONT.mono, color: 'rgba(230,216,189,0.42)', letterSpacing: 1.1 });
  ctx.globalAlpha = p * 0.34;
  ctx.fillStyle = '#3a2417';
  ctx.fillRect(1374, 974, 450, 12);
  ctx.fillStyle = 'rgba(231,205,159,0.22)';
  for (let i = 0; i < 9; i++) ctx.fillRect(1384 + ((u * 70 + i * 48) % 430), 978, 2, 3);
  ctx.restore();
}

export function renderAt(ctx, u, beat, env = {}) {
  const base = buildBase();
  const jolt = (u >= 2 && u < 2.5) ? Math.exp(-(u - 2) * 14) * 8 : 0;
  ctx.save();
  ctx.translate(Math.sin(u * 77) * jolt, Math.cos(u * 54) * jolt * 0.5);
  ctx.drawImage(base, -3 + Math.sin(u * 0.7) * 1.2, -2 + Math.cos(u * 0.5) * 1.0, W + 6, H + 4);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  for (let i = 0; i < 18; i++) {
    const x = 100 + i * 105 + Math.sin(u * 2.1 + i) * 12;
    const h = 30 + unit(755, i, 2) * 120 + Math.sin(u * 3 + i) * 22;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(182,43,34,0.33)' : 'rgba(60,27,18,0.25)';
    ctx.beginPath();
    ctx.moveTo(x - 14, 1000); ctx.quadraticCurveTo(x - 4, 970 - h * 0.4, x + 2, 1000 - h);
    ctx.quadraticCurveTo(x + 15, 970 - h * 0.5, x + 17, 1000); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const r = mulberry32(7550);
  for (let i = 0; i < 240; i++) {
    const x = (r() * W + u * 14) % W;
    const y = (r() * 460 + 300 - u * 9 + 620) % 620;
    ctx.fillStyle = `rgba(30,24,18,${(0.03 + r() * 0.1).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(x, y, 1 + r() * 4, 0, TAU); ctx.fill();
  }
  ctx.restore();
  drawTraveller(ctx, u);
  drawTitleStrip(ctx, u);
  drawGlitchWord(ctx, u);
  drawTapeReadout(ctx, u);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.18 + 0.08 * Math.sin(u * 8);
  ctx.fillStyle = RED;
  ctx.fillRect(W / 2 - 440, 246, 880, 2);
  ctx.restore();
  if (u >= 2 && u < 3.0) {
    ctx.fillStyle = 'rgba(232,219,193,0.8)';
    ctx.fillRect(70, 60 + ((u - 2) / 1) * 960, 2, 18);
  }
  ctx.restore();

  glitchComposite(ctx, u);
  drawAbyss(ctx, u);
  const gap = 32 + smoothstep(3.0, 3.55, u) * 92;
  drawSplitCouplet(ctx, u, gap);
  drawBarThree(ctx, u);

  ctx.save();
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, W * 0.73);
  v.addColorStop(0, 'rgba(26,18,11,0)');
  v.addColorStop(1, 'rgba(26,18,11,0.30)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = RED;
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(46 + i * 3, 60); ctx.lineTo(46 + i * 3, H - 46); ctx.stroke();
  }
  ctx.restore();
  markText('s07-caption', '表现主义木刻 · 七五五 · 安史之乱', 60, 60, 400, 100, { size: 20 });
  void beat; void env;
}
