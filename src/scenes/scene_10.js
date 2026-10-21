/**
 * 10 · 离屏粒子与子弹时间 · 草堂 / Offscreen Particle Dissolve & Bullet Time · 761
 *
 * A thatched roof is literally built out of 8,000 glyph-sampled particles.
 * The autumn gale tears it off in bar 1. On the bar-2 downbeat a vermilion
 * time-lash cuts the frame: γ(t) drops to 0.012, the rain hangs as glass beads,
 * and the roof shards assemble into 「安得广厦千万间」. In bar 3 time resumes,
 * the characters rise into a luminous canopy, and the traveller walks on.
 */
import KIT from '../kit/index.js';
import { clamp01, lerp, smoothstep, easeOutCubic, easeInOut, easeIn, hash, unit, mulberry32, TAU } from '../kit/math.js';
import { markText } from '../kit/debug.js';

const W = 1920, H = 1080;
const QUOTE1 = '安得广厦千万间，';
const QUOTE2 = '大庇天下寒士俱欢颜！';
const SUB = '自己淋着破屋的雨，却在替全天下寒士求一间房';
const PARTICLE_N = 8000;

let P = null;

function gammaAt(u) {
  if (u < 2.0) return 1;
  if (u < 4.0) return 0.012;
  return lerp(0.012, 1, smoothstep(4.0, 4.9, u));
}

/** Numerically integrate dτ/dt = γ(t). Piecewise-smooth, deterministic. */
function tauAt(u) {
  if (u <= 2.0) return u;
  let tau = 2.0;
  if (u <= 4.0) return tau + (u - 2.0) * 0.012;
  tau += 2.0 * 0.012;
  const steps = 48;
  const du = (u - 4.0) / steps;
  for (let i = 0; i < steps; i++) {
    const a = 4.0 + i * du, b = a + du;
    tau += (gammaAt(a) + gammaAt(b)) * 0.5 * du;
  }
  return tau;
}

function roofMaskPoints() {
  const cw = 1200, ch = 520;
  const c = KIT.makeCanvas(cw, ch);
  const ctx = c.getContext('2d');
  // A broad wood-and-thatch roof silhouette.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(600, 10);
  ctx.lineTo(1174, 416);
  ctx.lineTo(1122, 496);
  ctx.lineTo(600, 326);
  ctx.lineTo(78, 496);
  ctx.lineTo(24, 416);
  ctx.closePath();
  ctx.clip();
  const r = mulberry32(761);
  const glyphs = ['茅', '草', '風', '雨', '屋', '秋', '卷', '我'];
  for (let y = 12; y < 510; y += 39) {
    for (let x = 16; x < cw; x += 42) {
      const size = 28 + r() * 20;
      ctx.save();
      ctx.translate(x + (r() - 0.5) * 15, y + (r() - 0.5) * 13);
      ctx.rotate((r() - 0.5) * 0.35);
      ctx.font = `600 ${size}px "Noto Serif SC", serif`;
      ctx.fillStyle = '#fff';
      ctx.fillText(glyphs[Math.floor(r() * glyphs.length)], 0, 0);
      ctx.restore();
    }
  }
  ctx.restore();
  const data = ctx.getImageData(0, 0, cw, ch).data;
  const raw = [];
  for (let y = 0; y < ch; y += 2) {
    for (let x = 0; x < cw; x += 2) {
      if (data[(y * cw + x) * 4 + 3] > 100) raw.push([x, y]);
    }
  }
  return { raw, w: cw, h: ch };
}

function quoteMaskPoints() {
  const m = KIT.sampleTextPoints(`${QUOTE1}\n${QUOTE2}`, {
    size: 104, font: KIT.FONT.display, weight: 800, density: PARTICLE_N + 800, letterSpacing: 4,
  });
  return m;
}

function buildParticles() {
  if (P) return P;
  const roof = roofMaskPoints();
  const quote = quoteMaskPoints();
  const r = mulberry32(761);
  // Map the sampled roof into the roof's screen footprint.
  const roofPts = roof.raw.map(([x, y]) => [
    360 + (x / roof.w) * 1200 + (r() - 0.5) * 3,
    330 + (y / roof.h) * 380 + (r() - 0.5) * 3,
  ]);
  const qW = 1180, qH = 286;
  const qx = 960 - qW / 2, qy = 392;
  const quotePts = quote.pts.map(([x, y]) => [
    qx + (x / quote.w) * qW,
    qy + (y / quote.h) * qH,
  ]);
  const points = [];
  for (let i = 0; i < PARTICLE_N; i++) {
    const origin = roofPts[Math.floor((i * 7.771 + 13) % roofPts.length)];
    const target = quotePts[Math.floor((i * 11.317 + 7) % quotePts.length)];
    const delay = r();
    // scatter position at the freeze instant: wind + swirl
    const dir = origin[0] < 960 ? -1 : 1;
    const scatter = [
      origin[0] + dir * (180 + r() * 620) + (r() - 0.5) * 160,
      origin[1] - (60 + r() * 320) + (r() - 0.5) * 80,
    ];
    points.push({
      o: origin,
      t: target,
      s: scatter,
      delay,
      size: 0.8 + Math.pow(r(), 2) * 2.2,
      tw: r() * TAU,
      side: dir,
      glyph: Math.floor(r() * 6),
    });
  }
  const drops = [];
  for (let i = 0; i < 470; i++) {
    const layer = i < 230 ? 0 : i < 400 ? 1 : 2;
    drops.push({
      x0: r() * (W + 260) - 130,
      y0: r() * (H + 260) - 130,
      vy: 520 + r() * 900 + layer * 220,
      vx: -80 - layer * 22,
      len: 20 + r() * 80 + layer * 12,
      depth: layer,
      w: 0.5 + layer * 0.7 + r() * 0.7,
      a: 0.15 + r() * 0.35,
      ph: r() * TAU,
    });
  }
  const reeds = [];
  for (let i = 0; i < 24; i++) {
    reeds.push({ x: r() * W, h: 120 + r() * 230, ph: r() * TAU, lean: r() * 30 });
  }
  P = { points, drops, reeds, roofW: 1200 };
  return P;
}

function drawSky(ctx, tau, gamma) {
  const u = tau;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#07110d');
  g.addColorStop(0.42, '#172b23');
  g.addColorStop(0.68, '#21382d');
  g.addColorStop(0.86, '#101c16');
  g.addColorStop(1, '#060b08');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // cloud banks drawn with a few soft gradients, never a blur filter
  for (let i = 0; i < 7; i++) {
    const x = 180 + i * 250 + Math.sin(u * 0.15 + i) * 40;
    const y = 120 + (i % 3) * 86;
    const rad = 220 + (i % 4) * 60;
    const cg = ctx.createRadialGradient(x, y, 20, x, y, rad);
    cg.addColorStop(0, `rgba(62,84,69,${0.10 + (i % 3) * 0.03})`);
    cg.addColorStop(1, 'rgba(44,60,49,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.ellipse(x, y, rad, rad * 0.42, -0.2, 0, TAU); ctx.fill();
  }
  // distant hill / bamboo silhouette
  ctx.fillStyle = 'rgba(6,16,12,0.55)';
  ctx.beginPath();
  ctx.moveTo(0, 720);
  for (let x = 0; x <= W; x += 24) ctx.lineTo(x, 680 - KIT.fbm1(x * 0.0018, 4, 611) * 100);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  void gamma;
}

function drawBamboo(ctx, u, tau, gamma, layer) {
  const cfg = [
    { n: 17, alpha: 0.28, w: 3.2, col: '36,68,55', spread: [0, W], depth: 0.35 },
    { n: 13, alpha: 0.65, w: 7, col: '20,43,34', spread: [-60, W + 60], depth: 0.7 },
    { n: 8, alpha: 0.95, w: 13, col: '5,14,10', spread: [-120, W + 120], depth: 1.2 },
  ][layer];
  const wind = 0.18 + gamma * 0.82;
  ctx.save();
  ctx.strokeStyle = `rgba(${cfg.col},${cfg.alpha})`;
  ctx.fillStyle = `rgba(${cfg.col},${cfg.alpha})`;
  ctx.lineCap = 'round';
  const r = mulberry32(761 + layer * 17);
  for (let i = 0; i < cfg.n; i++) {
    const x = cfg.spread[0] + r() * (cfg.spread[1] - cfg.spread[0]);
    // Keep the middle of the stage open for the house and the poem.
    if (layer === 2 && x > 380 && x < 1500) continue;
    const baseY = 1110;
    const h = 620 + r() * 780;
    const sway = (Math.sin(tau * 0.75 + i * 1.9 + x * 0.004) * 52 + Math.sin(tau * 1.6 + i) * 20) * wind;
    const bend = (0.055 + r() * 0.05) * wind;
    const topX = x + sway + bend * h * (x < 960 ? -1 : 1) * 0.4;
    const c1 = [x - 24 * wind, baseY - h * 0.35];
    const c2 = [topX + 30 * wind, baseY - h * 0.68];
    const top = [topX, baseY - h];
    ctx.lineWidth = cfg.w * (0.7 + r() * 0.8);
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], top[0], top[1]);
    ctx.stroke();
    // nodes
    const nodes = 5 + Math.floor(r() * 5);
    for (let k = 2; k < nodes; k++) {
      const p = k / nodes;
      const nx = (1 - p) * (1 - p) * (1 - p) * x + 3 * (1 - p) * (1 - p) * p * c1[0] + 3 * (1 - p) * p * p * c2[0] + p * p * p * top[0];
      const ny = (1 - p) * (1 - p) * (1 - p) * baseY + 3 * (1 - p) * (1 - p) * p * c1[1] + 3 * (1 - p) * p * p * c2[1] + p * p * p * top[1];
      ctx.lineWidth = cfg.w * 1.3;
      ctx.beginPath(); ctx.moveTo(nx - cfg.w * 0.8, ny); ctx.lineTo(nx + cfg.w * 0.8, ny + 1); ctx.stroke();
    }
    // blade leaves
    const leaves = 3 + Math.floor(r() * 4);
    for (let k = 0; k < leaves; k++) {
      const p = 0.38 + (k / leaves) * 0.58;
      const nx = (1 - p) * (1 - p) * (1 - p) * x + 3 * (1 - p) * (1 - p) * p * c1[0] + 3 * (1 - p) * p * p * c2[0] + p * p * p * top[0];
      const ny = (1 - p) * (1 - p) * (1 - p) * baseY + 3 * (1 - p) * (1 - p) * p * c1[1] + 3 * (1 - p) * p * p * c2[1] + p * p * p * top[1];
      const dir = (k % 2 ? 1 : -1);
      const ang = -1.0 + dir * 0.45 + sway * 0.006 + Math.sin(tau + k + i) * 0.12 * wind;
      const ll = 80 + r() * 130;
      const ww = 5 + r() * 8;
      const ex = nx + Math.cos(ang) * ll, ey = ny + Math.sin(ang) * ll;
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.quadraticCurveTo(nx + Math.cos(ang) * ll * 0.5 - Math.sin(ang) * ww, ny + Math.sin(ang) * ll * 0.5 + Math.cos(ang) * ww, ex, ey);
      ctx.quadraticCurveTo(nx + Math.cos(ang) * ll * 0.5 + Math.sin(ang) * ww * 0.7, ny + Math.sin(ang) * ll * 0.5 - Math.cos(ang) * ww * 0.7, nx, ny);
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

function drawHouse(ctx, u) {
  const loss = smoothstep(0.9, 2.0, u);
  // wet ground
  const gr = ctx.createLinearGradient(0, 760, 0, H);
  gr.addColorStop(0, 'rgba(16,30,22,0)');
  gr.addColorStop(0.35, 'rgba(12,24,18,0.9)');
  gr.addColorStop(1, 'rgba(4,9,6,1)');
  ctx.fillStyle = gr; ctx.fillRect(0, 730, W, H - 730);
  // puddles
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 5; i++) {
    const x = 420 + i * 260, y = 900 + (i % 3) * 38;
    const gg = ctx.createRadialGradient(x, y, 2, x, y, 120);
    gg.addColorStop(0, 'rgba(148,189,170,0.10)');
    gg.addColorStop(1, 'rgba(148,189,170,0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.ellipse(x, y, 130, 18, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
  // hut wall
  const wall = ctx.createLinearGradient(0, 650, 0, 960);
  wall.addColorStop(0, '#33402f');
  wall.addColorStop(1, '#161d15');
  ctx.fillStyle = wall;
  ctx.beginPath();
  ctx.moveTo(650, 930); ctx.lineTo(664, 650); ctx.lineTo(1288, 650); ctx.lineTo(1304, 930); ctx.closePath();
  ctx.fill();
  // vertical timber framing / raked clay stripes
  ctx.strokeStyle = 'rgba(9,15,10,0.85)';
  for (let i = 0; i < 7; i++) {
    const x = 690 + i * 92;
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(x, 660); ctx.lineTo(x - 3, 928); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(211,194,155,0.13)';
  for (let i = 0; i < 20; i++) {
    const y = 690 + i * 13;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(668, y); ctx.lineTo(1288, y + (i % 3) - 1); ctx.stroke();
  }
  // door with warm interior
  ctx.fillStyle = '#0a0d08';
  ctx.fillRect(862, 748, 172, 184);
  const door = ctx.createLinearGradient(0, 760, 0, 930);
  door.addColorStop(0, 'rgba(218,171,96,0.5)');
  door.addColorStop(0.4, 'rgba(227,174,89,0.13)');
  door.addColorStop(1, 'rgba(227,174,89,0)');
  ctx.fillStyle = door;
  ctx.fillRect(870, 756, 155, 174);
  // window
  ctx.fillStyle = 'rgba(225,178,98,0.16)';
  ctx.fillRect(1080, 720, 100, 70);
  ctx.strokeStyle = 'rgba(220,204,169,0.27)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1080, 720, 100, 70);
  ctx.beginPath(); ctx.moveTo(1130, 720); ctx.lineTo(1130, 790); ctx.moveTo(1080, 755); ctx.lineTo(1180, 755); ctx.stroke();
  // roof beams, what remains after the thatch is torn off
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = '#20160f';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(622, 682); ctx.lineTo(960, 366); ctx.lineTo(1330, 682);
  ctx.stroke();
  ctx.lineWidth = 7;
  for (let i = 1; i < 7; i++) {
    const t = i / 7;
    ctx.beginPath(); ctx.moveTo(622 + t * 338, 682 - t * 316); ctx.lineTo(1330 - t * 370, 682 - t * 316); ctx.stroke();
  }
  ctx.restore();
  // roof bed: dark straw silhouette, visually removed with the wind
  if (loss < 0.97) {
    ctx.save();
    ctx.globalAlpha = 1 - loss * 0.9;
    ctx.fillStyle = 'rgba(38,41,28,0.75)';
    ctx.beginPath();
    ctx.moveTo(590, 690); ctx.lineTo(960, 342); ctx.lineTo(1350, 690);
    ctx.lineTo(1270, 724); ctx.lineTo(960, 620); ctx.lineTo(650, 722); ctx.closePath();
    ctx.fill();
    // dry-straw lines
    ctx.strokeStyle = 'rgba(196,177,130,0.2)';
    for (let i = 0; i < 30; i++) {
      const x = 650 + (i / 30) * 620;
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(x, 680); ctx.lineTo(960 + (x - 960) * 0.22, 380 + (i % 4) * 30); ctx.stroke();
    }
    ctx.restore();
  }
  // door light bloom
  const lg = ctx.createRadialGradient(946, 824, 10, 946, 824, 210);
  lg.addColorStop(0, 'rgba(241,183,94,0.18)');
  lg.addColorStop(1, 'rgba(241,183,94,0)');
  ctx.fillStyle = lg; ctx.fillRect(700, 620, 500, 380);
}

function drawRoofGlyphs(ctx, u, gamma) {
  const a = (1 - smoothstep(1.0, 1.75, u)) * 0.36;
  if (a <= 0.005) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(590, 690); ctx.lineTo(960, 344); ctx.lineTo(1330, 690);
  ctx.lineTo(1270, 732); ctx.lineTo(960, 620); ctx.lineTo(650, 732);
  ctx.closePath(); ctx.clip();
  const r = mulberry32(7610);
  const glyphs = ['茅', '草', '屋', '風', '雨'];
  for (let y = 380; y < 720; y += 35) {
    for (let x = 620; x < 1310; x += 42) {
      ctx.save();
      ctx.translate(x + r() * 10, y + r() * 8);
      ctx.rotate((r() - 0.5) * 0.25);
      ctx.font = `600 ${15 + r() * 14}px "Noto Serif SC", serif`;
      ctx.fillStyle = `rgba(228,212,178,${a.toFixed(3)})`;
      ctx.fillText(glyphs[Math.floor(r() * glyphs.length)], 0, 0);
      ctx.restore();
    }
  }
  ctx.restore();
  void gamma;
}

function drawParticles(ctx, u, gamma, tau) {
  const parts = P.points;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // Roof particles have a dusty straw colour; the assembled poem becomes gold.
  const blow = smoothstep(0.95, 2.0, u);
  const assemble = smoothstep(2.0, 2.86, u);
  const canopy = smoothstep(4.45, 5.35, u);
  const textAlpha = smoothstep(2.2, 2.7, u);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    let x, y, a, size;
    if (u < 2.0) {
      const local = clamp01((u - 0.9 - p.delay * 0.65) / 0.95);
      const e = easeIn(local);
      x = lerp(p.o[0], p.s[0], e);
      y = lerp(p.o[1], p.s[1], e) + Math.sin(tau * 2 + i) * 6 * e;
      x += Math.sin(tau * 1.3 + p.tw) * 16 * e;
      a = 0.22 + unit(761, i, 3) * 0.3;
      size = p.size;
    } else {
      const localA = clamp01((u - 2.0 - p.delay * 0.25) / 0.9);
      const e = easeOutCubic(localA);
      x = lerp(p.s[0], p.t[0], e);
      y = lerp(p.s[1], p.t[1], e);
      // frozen time vibration is tiny
      x += Math.sin(p.tw + tau * 0.8) * (1 - e) * 3;
      y += Math.cos(p.tw * 1.7 + tau * 0.63) * (1 - e) * 3;
      if (canopy > 0) {
        const nx = (x - 960) / 640;
        x = 960 + (x - 960) * (1 + 0.13 * canopy);
        y -= canopy * (168 - 52 * Math.abs(nx)) * (1 - Math.abs(nx) * 0.3);
        x += Math.sin(nx * 4.2 + p.tw) * 9 * canopy;
      }
      a = (0.2 + unit(761, i, 3) * 0.55) * (1 - canopy * 0.15);
      size = p.size * (1 + textAlpha * 0.3);
    }
    if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
    const gold = u >= 2 ? 1 : 0;
    const r = Math.round(lerp(212, 255, gold * 0.7));
    const g = Math.round(lerp(188, 220, gold * 0.65));
    const b = Math.round(lerp(140, 124, gold * 0.45));
    ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`;
    ctx.fillRect(x, y, size, size);
    if ((i & 255) === 0) {
      // a few actual glyph shards in the flurry
      ctx.font = `${Math.round(10 + size * 2)}px "Noto Serif SC", serif`;
      ctx.fillStyle = `rgba(244,225,177,${(a * 0.8).toFixed(3)})`;
      ctx.fillText(['茅', '屋', '風', '雨', '杜', '詩'][i % 6], x, y);
    }
  }
  ctx.restore();
  void gamma;
}

function drawRain(ctx, u, gamma, tau) {
  const mix = 1 - smoothstep(0.012, 0.32, gamma);
  const alphaK = 0.9;
  ctx.save();
  for (const d of P.drops) {
    const x = ((d.x0 + tau * d.vx) % (W + 260) + W + 260) % (W + 260) - 130;
    const y = ((d.y0 + tau * d.vy) % (H + 260) + H + 260) % (H + 260) - 130;
    if (mix < 0.98) {
      ctx.strokeStyle = `rgba(203,222,213,${(d.a * alphaK * (1 - mix)).toFixed(3)})`;
      ctx.lineWidth = d.w;
      const slant = 0.18;
      const len = d.len * (0.25 + 0.75 * gamma);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len * slant, y + len); ctx.stroke();
    }
    if (mix > 0.02) {
      const rad = 1.1 + d.depth * 1.8 + d.a * 8;
      ctx.fillStyle = `rgba(213,231,222,${(mix * (0.25 + d.a * 0.85)).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(255,255,248,${(mix * 0.65).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x - rad * 0.26, y - rad * 0.28, rad * 0.32, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
  void u;
}

function drawTimeLash(ctx, u) {
  if (u < 2.0 || u > 2.48) return;
  const p = (u - 2.0) / 0.48;
  const a = Math.exp(-p * 5.5);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(197,50,39,${0.8 * a})`;
  ctx.lineWidth = 2 + a * 7;
  ctx.beginPath();
  ctx.moveTo(360, -10); ctx.lineTo(1540, 1090);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,138,91,${0.22 * a})`;
  ctx.lineWidth = 40;
  ctx.stroke();
  // shock wave
  ctx.strokeStyle = `rgba(197,50,39,${0.35 * a})`;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(930, 530, 80 + p * 760, 0, TAU); ctx.stroke();
  ctx.restore();
  const r = mulberry32(7612);
  ctx.save();
  for (let i = 0; i < 80; i++) {
    const x = 360 + r() * 1180;
    const y = -10 + (x - 360) * (1100 / 1180);
    ctx.fillStyle = `rgba(214,66,50,${a * (0.05 + r() * 0.3)})`;
    ctx.fillRect(x + (r() - 0.5) * 200, y + (r() - 0.5) * 90, 1 + r() * 4, 1 + r() * 3);
  }
  ctx.restore();
}

function drawQuote(ctx, u) {
  const a = smoothstep(2.38, 2.82, u);
  const fade = 1 - smoothstep(5.0, 5.5, u);
  const alpha = a * fade;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  // a soft darkness, not a card, keeps the poem legible against the storm
  const veil = ctx.createLinearGradient(0, 330, 0, 690);
  veil.addColorStop(0, 'rgba(4,10,8,0)');
  veil.addColorStop(0.32, 'rgba(4,10,8,0.58)');
  veil.addColorStop(0.76, 'rgba(4,10,8,0.58)');
  veil.addColorStop(1, 'rgba(4,10,8,0)');
  ctx.fillStyle = veil; ctx.fillRect(290, 318, 1340, 390);
  // red rule and seal
  ctx.fillStyle = 'rgba(197,50,39,0.9)';
  ctx.fillRect(342, 390, 4, 194);
  const glow = ctx.createRadialGradient(960, 475, 20, 960, 475, 440);
  glow.addColorStop(0, 'rgba(238,208,139,0.08)');
  glow.addColorStop(1, 'rgba(238,208,139,0)');
  ctx.fillStyle = glow; ctx.fillRect(480, 270, 960, 430);
  KIT.drawText(ctx, QUOTE1, 960, 436, {
    size: 69, font: KIT.FONT.display, weight: 600, color: 'rgba(241,231,210,0.97)', align: 'center',
    letterSpacing: 5, shadow: { color: 'rgba(0,0,0,0.75)', blur: 12, x: 0, y: 3 },
  });
  KIT.drawText(ctx, QUOTE2, 960, 524, {
    size: 69, font: KIT.FONT.display, weight: 600, color: 'rgba(241,231,210,0.97)', align: 'center',
    letterSpacing: 5, shadow: { color: 'rgba(0,0,0,0.75)', blur: 12, x: 0, y: 3 },
  });
  const subVeil = ctx.createLinearGradient(0, 570, 0, 678);
  subVeil.addColorStop(0, 'rgba(3,8,6,0)');
  subVeil.addColorStop(0.22, 'rgba(3,8,6,0.52)');
  subVeil.addColorStop(0.8, 'rgba(3,8,6,0.52)');
  subVeil.addColorStop(1, 'rgba(3,8,6,0)');
  ctx.fillStyle = subVeil;
  ctx.fillRect(330, 568, 1260, 112);
  KIT.drawText(ctx, SUB, 960, 602, {
    size: 24, font: KIT.FONT.serif, weight: 500, color: 'rgba(245,232,211,0.96)', align: 'center', letterSpacing: 1.4,
    shadow: { color: 'rgba(0,0,0,0.7)', blur: 8, x: 0, y: 2 },
  });
  KIT.drawText(ctx, '《茅屋為秋風所破歌》 · 七六一 · 成都草堂', 960, 652, {
    size: 11.5, font: KIT.FONT.serif, weight: 500, color: 'rgba(225,204,167,0.72)', align: 'center', letterSpacing: 2.2,
  });
  KIT.ink.sealStamp(ctx, 1442, 398, 70, '廣廈', { seed: 761, color: '#ae2e24', vertical: false, font: KIT.FONT.display, border: true, inset: 6, alpha: 0.82 });
  ctx.restore();
  markText('s10-quote', `${QUOTE1}${QUOTE2}`, 300, 384, 1320, 260, { size: 69, align: 'center', color: '#f1e7d2' });
  markText('s10-sub', SUB, 420, 580, 1080, 44, { size: 23, align: 'center' });
}

function drawBarOneCaption(ctx, u) {
  const a = smoothstep(0.15, 0.7, u) * (1 - smoothstep(1.82, 2.12, u));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(4,10,8,0.42)';
  ctx.fillRect(92, 844, 564, 142);
  ctx.fillStyle = 'rgba(197,50,39,0.9)';
  ctx.fillRect(112, 870, 56, 3);
  KIT.drawText(ctx, '八月秋高风怒号，', 112, 908, {
    size: 31, font: KIT.FONT.display, weight: 500, color: 'rgba(234,229,212,0.94)', letterSpacing: 1.4, mark: 's10-bar1',
  });
  KIT.drawText(ctx, '卷我屋上三重茅。', 112, 948, {
    size: 31, font: KIT.FONT.display, weight: 500, color: 'rgba(234,229,212,0.94)', letterSpacing: 1.4,
  });
  KIT.drawText(ctx, 'AUGUST GALE · THE ROOF IS MADE OF LANGUAGE', 114, 974, {
    size: 8.2, font: KIT.FONT.mono, color: 'rgba(198,218,202,0.45)', letterSpacing: 1.2,
  });
  ctx.restore();
}

function drawTraveler(ctx, u, gamma) {
  const tau = tauAt(u);
  const phase = (tau / 1.0) * TAU;
  const P0 = KIT.rig.pose({ t: tau, phase, wind: 0.65, lean: -0.08, look: 0.2, staff: true });
  const exit = smoothstep(4.7, 6.0, u);
  const x = lerp(760, 1700, easeInOut(exit));
  const y = lerp(934, 900, exit);
  const pos = KIT.rig.placed(P0, { x, y, scale: 0.86, rot: 0 });
  const parts = pos.parts.filter((p) => ['body', 'sleeve-near', 'sleeve-far', 'skin', 'cap', 'leg-near', 'leg-far', 'beard', 'hair', 'staff'].includes(p.role));
  ctx.save();
  KIT.rig.drawSilhouette(ctx, { ...pos, parts }, { color: 'rgba(5,10,7,0.96)' });
  KIT.rig.drawWire(ctx, { ...pos, parts }, { color: 'rgba(193,214,197,0.28)', width: 1.1, alpha: 0.75 });
  // warm rim from the doorway
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.25;
  ctx.translate(3, 0);
  KIT.rig.drawWire(ctx, { ...pos, parts }, { color: 'rgba(240,185,99,0.7)', width: 0.8, alpha: 0.65 });
  ctx.restore();
  void gamma;
}

function drawTech(ctx, u, gamma) {
  const a = smoothstep(1.1, 1.5, u);
  if (a <= 0) return;
  const frozen = u >= 2 && u < 4;
  ctx.save();
  ctx.globalAlpha = a * 0.82;
  const x = 1404, y = 172;
  ctx.fillStyle = 'rgba(4,10,7,0.35)';
  ctx.fillRect(x - 12, y - 12, 450, 66);
  ctx.strokeStyle = 'rgba(193,214,197,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y + 22); ctx.lineTo(x + 300, y + 22); ctx.stroke();
  ctx.fillStyle = 'rgba(197,50,39,0.8)';
  ctx.fillRect(x, y + 21, (frozen ? 0.04 : 1) * 300, 2);
  KIT.drawText(ctx, frozen ? 'γ(t) = 0.012×  ·  TIME INTEGRATOR FROZEN' : 'γ(t) = 1.000×  ·  dτ / dt', x, y, {
    size: 8.5, font: KIT.FONT.mono, color: 'rgba(201,220,205,0.54)', letterSpacing: 1.1,
  });
  KIT.drawText(ctx, `BULB ${String(Math.round((frozen ? 0.012 : 1) * 1000)).padStart(4, '0')} / 1000`, x + 300, y + 40, { size: 8, font: KIT.FONT.mono, color: 'rgba(201,220,205,0.35)', align: 'right', letterSpacing: 0.8 });
  ctx.restore();
}

function drawGate(ctx, u) {
  const p = smoothstep(5.15, 5.5, u);
  if (p <= 0) return;
  ctx.save();
  ctx.globalAlpha = p;
  const x = 1810;
  ctx.fillStyle = 'rgba(2,7,5,0.5)';
  ctx.fillRect(x, 206, 106, 760);
  KIT.frames.drawPortal(ctx, x, 206, 106, 760, { style: 'stone', accent: '#c53227', alpha: 1, seed: 761, t: u });
  ctx.restore();
}

export function renderAt(ctx, u, beat, env = {}) {
  buildParticles();
  const gamma = gammaAt(u);
  const tau = tauAt(u);
  const frozen = gamma < 0.2;
  // camera: slow push in during the time-freeze, then a release
  const push = 1 + 0.035 * smoothstep(0, 2, u) + 0.06 * smoothstep(2.0, 3.3, u) - 0.035 * smoothstep(4.1, 5.4, u);
  const camX = 960 + 24 * smoothstep(2.0, 3.4, u);
  const camY = 540 + 18 * smoothstep(2.0, 3.4, u);
  ctx.save();
  ctx.translate(camX, camY);
  ctx.scale(push, push);
  ctx.translate(-camX, -camY);
  drawSky(ctx, tau, gamma);
  drawBamboo(ctx, u, tau, gamma, 0);
  drawBamboo(ctx, u, tau, gamma, 1);
  drawHouse(ctx, u);
  drawRoofGlyphs(ctx, u, gamma);
  drawRain(ctx, u, gamma, tau);
  drawTraveler(ctx, u, gamma);
  drawBamboo(ctx, u, tau, gamma, 2);
  drawParticles(ctx, u, gamma, tau);
  drawGate(ctx, u);
  ctx.restore();

  drawTimeLash(ctx, u);
  drawBarOneCaption(ctx, u);
  drawQuote(ctx, u);
  drawTech(ctx, u, gamma);
  // a few foreground frozen beads, framing the quote
  if (frozen) {
    const r = mulberry32(7613);
    ctx.save();
    for (let i = 0; i < 32; i++) {
      const x = 90 + r() * 1740, y = 120 + r() * 860;
      if (x > 520 && x < 1400 && y > 340 && y < 660) continue;
      const rad = 1.4 + r() * 5.4;
      ctx.fillStyle = 'rgba(202,229,217,0.10)';
      ctx.beginPath(); ctx.arc(x, y, rad * 2.3, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(206,232,221,${0.22 + r() * 0.28})`;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,248,0.6)';
      ctx.beginPath(); ctx.arc(x - rad * 0.28, y - rad * 0.3, rad * 0.32, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  // vignette, wet highlights, grain
  const v = ctx.createRadialGradient(980, 520, 280, 960, 540, 1120);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(0.7, 'rgba(2,8,5,0.08)');
  v.addColorStop(1, 'rgba(2,7,5,0.42)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  const grain = KIT.layer('scene10:grain', 480, 270, (c) => KIT.grainLayer(480, 270, 101, { amp: 0.1 }));
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.12; ctx.drawImage(grain, 0, 0, W, H); ctx.restore();
  // red beat indicator at the time-lash instant
  if (u >= 2.0 && u < 2.8) {
    const f = Math.exp(-(u - 2.0) * 6);
    ctx.fillStyle = `rgba(197,50,39,${f * 0.06})`;
    ctx.fillRect(0, 0, W, H);
  }
  void beat; void env; void frozen;
}
