/**
 * paper.js — procedural grounds: Xuan paper, silk, granite, woodblock paper,
 * ledger stock, CRT glass and frosted glass. All textures are seeded and baked.
 */
import {
  hash, mulberry32, noise2, fbm2, clamp01, TAU,
} from './math.js';
import {
  layer, makeCtx, linear, radial, rgba, mixColor, parseColor, grainLayer, cloudLayer,
  vignetteLayer, drawLayer,
} from './canvas.js';

/* ------------------------------------------------------------------ helpers */
function deckle(ctx, w, h, color, seed, depth = 12) {
  const r = mulberry32(hash('deckle', seed));
  ctx.save();
  ctx.strokeStyle = color;
  for (let side = 0; side < 4; side++) {
    const n = side < 2 ? 90 : 60;
    for (let i = 0; i < n; i++) {
      const p = (i + r() * 0.8) / n;
      const wob = (r() - 0.5) * depth * 1.6;
      ctx.globalAlpha = 0.025 + r() * 0.08;
      ctx.lineWidth = 0.5 + r() * 1.7;
      ctx.beginPath();
      if (side === 0) {
        const x = p * w, y = depth * (0.3 + r() * 0.7);
        ctx.moveTo(x, 0); ctx.lineTo(x + wob, y);
      } else if (side === 1) {
        const x = p * w, y = h - depth * (0.3 + r() * 0.7);
        ctx.moveTo(x, h); ctx.lineTo(x + wob, y);
      } else if (side === 2) {
        const x = depth * (0.3 + r() * 0.7), y = p * h;
        ctx.moveTo(0, y); ctx.lineTo(x, y + wob);
      } else {
        const x = w - depth * (0.3 + r() * 0.7), y = p * h;
        ctx.moveTo(w, y); ctx.lineTo(x, y + wob);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function fibers(ctx, w, h, seed, count, color, alpha) {
  const r = mulberry32(hash('fiber', seed));
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const x = r() * w, y = r() * h;
    const len = 5 + Math.pow(r(), 2.2) * Math.min(w, h) * 0.09;
    const ang = (r() - 0.5) * 0.6 + (r() < 0.08 ? Math.PI / 2 : 0);
    const bend = (r() - 0.5) * len * 0.34;
    ctx.globalAlpha = alpha * (0.18 + r() * 0.82);
    ctx.lineWidth = 0.35 + r() * 1.05;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(ang) * len * 0.5 - Math.sin(ang) * bend,
      y + Math.sin(ang) * len * 0.5 + Math.cos(ang) * bend,
      x + Math.cos(ang) * len,
      y + Math.sin(ang) * len + (r() - 0.5) * 2,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function pulp(ctx, w, h, seed, count, color, alpha) {
  const r = mulberry32(hash('pulp', seed));
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = r() * w, y = r() * h;
    const s = 0.5 + Math.pow(r(), 2) * 2.2;
    ctx.globalAlpha = alpha * (0.15 + r() * 0.7);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, s, s * (0.3 + r() * 0.8), r() * TAU, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function stains(ctx, w, h, seed, count, color, alpha) {
  const r = mulberry32(hash('stain', seed));
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = r() * w, y = r() * h;
    const rx = (0.03 + r() * 0.13) * w, ry = rx * (0.25 + r() * 0.7);
    const g = radial(ctx, x, y, 0, x, y, Math.max(rx, ry), [
      [0, rgba(color, alpha * (0.3 + r() * 0.7))],
      [0.55, rgba(color, alpha * 0.4)],
      [1, rgba(color, 0)],
    ]);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(r() * TAU);
    ctx.translate(-x, -y);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // tiny foxing spots
  for (let i = 0; i < count * 7; i++) {
    const x = r() * w, y = r() * h;
    const rad = 0.5 + r() * 2.2;
    ctx.globalAlpha = alpha * (0.08 + r() * 0.24);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function glaze(ctx, w, h, color, alpha, tint) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.globalCompositeOperation = tint || 'multiply';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/* -------------------------------------------------------------------- Xuan */
/**
 * ricePaper — warm Xuan / bamboo paper with fibers and ink-ready sizing.
 * opts: { tone, seed, fibers, stains, fiberAlpha, mottle, deckle, vignette }
 */
export function ricePaper(w, h, opts = {}) {
  const seed = opts.seed ?? 7;
  const tone = opts.tone || '#efe5cd';
  const key = `paper:rice:${w}x${h}:${seed}:${tone}:${opts.mottle ?? 0.5}:${opts.fibers ?? 1400}:${opts.stains ?? 10}:${opts.deckle ?? 1}`;
  return layer(key, w, h, (ctx) => {
    const base = parseColor(tone);
    const g = ctx.createLinearGradient(0, 0, w * 0.9, h);
    g.addColorStop(0, `rgb(${Math.min(255, base[0] + 8)},${Math.min(255, base[1] + 7)},${Math.min(255, base[2] + 5)})`);
    g.addColorStop(0.45, `rgb(${base[0]},${base[1]},${base[2]})`);
    g.addColorStop(1, `rgb(${Math.max(0, base[0] - 10)},${Math.max(0, base[1] - 9)},${Math.max(0, base[2] - 7)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // low-frequency pulp clouds
    const cloud = cloudLayer(Math.ceil(w / 2), Math.ceil(h / 2), seed + 11, {
      tint: '#8f7351', alpha: 0.22 * (opts.mottle ?? 0.5), smallW: 96, smallH: 54, octaves: 5,
    });
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.55;
    ctx.drawImage(cloud, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    stains(ctx, w, h, seed + 2, opts.stains ?? 10, '#9b7a4c', 0.065);
    fibers(ctx, w, h, seed + 3, opts.fibers ?? 1400, '#8d724d', opts.fiberAlpha ?? 0.12);
    fibers(ctx, w, h, seed + 4, Math.floor((opts.fibers ?? 1400) * 0.4), '#fffaf0', 0.20);
    pulp(ctx, w, h, seed + 5, 2600, '#806946', 0.13);
    if (opts.deckle !== 0) deckle(ctx, w, h, '#4b3924', seed + 6, 16);
    // edge burn
    const edge = opts.edgeBurn ?? 0.22;
    if (edge > 0) {
      const v = radial(ctx, w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.max(w, h) * 0.78, [
        [0, 'rgba(80,55,26,0)'], [0.7, `rgba(76,52,22,${edge * 0.18})`], [1, `rgba(60,40,16,${edge})`],
      ]);
      ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
    }
    if (opts.vignette !== false) {
      const gr = grainLayer(Math.ceil(w / 2), Math.ceil(h / 2), seed + 20, { amp: 0.06 });
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.22;
      ctx.drawImage(gr, 0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
  });
}

/** Pure white silk / sized paper for baimiao. */
export function silk(w, h, opts = {}) {
  const seed = opts.seed ?? 19;
  return layer(`paper:silk:${w}x${h}:${seed}:${opts.tone || 'white'}`, w, h, (ctx) => {
    const base = opts.tone || '#f3f0e6';
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, 'rgba(255,255,248,0.5)');
    g.addColorStop(0.55, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(98,90,74,0.10)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // silk warp / weft, extremely faint
    const r = mulberry32(hash('silk', seed));
    ctx.save();
    for (let i = 0; i < 520; i++) {
      const y = r() * h, a = 0.025 + r() * 0.035;
      ctx.strokeStyle = `rgba(96,82,58,${a})`;
      ctx.lineWidth = 0.4 + r() * 0.7;
      ctx.beginPath();
      const x = r() * w;
      ctx.moveTo(x, y);
      ctx.lineTo(x + 40 + r() * 260, y + (r() - 0.5) * 1.4);
      ctx.stroke();
    }
    for (let i = 0; i < 200; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.08 + r() * 0.22})`;
      ctx.lineWidth = 0.5 + r();
      const x = r() * w;
      ctx.beginPath(); ctx.moveTo(x, r() * h); ctx.lineTo(x + 1, r() * h + 30 + r() * 180); ctx.stroke();
    }
    ctx.restore();
    stains(ctx, w, h, seed + 1, 3, '#a68a5b', 0.028);
    const v = radial(ctx, w * 0.48, h * 0.45, Math.min(w, h) * 0.24, w * 0.5, h * 0.5, Math.max(w, h) * 0.74, [
      [0, 'rgba(120,100,64,0)'], [1, 'rgba(104,84,50,0.18)'],
    ]);
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  });
}

/** Dark granite / basalt for rubbings. */
export function stone(w, h, opts = {}) {
  const seed = opts.seed ?? 3;
  return layer(`paper:stone:${w}x${h}:${seed}:${opts.tone || 'dark'}`, w, h, (ctx) => {
    const dark = opts.tone !== 'light';
    const base = dark ? '#181714' : '#d9d3c6';
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    const cloud = cloudLayer(Math.ceil(w / 2), Math.ceil(h / 2), seed + 1, {
      tint: dark ? '#57534b' : '#7f776a', alpha: dark ? 0.24 : 0.16, smallW: 80, smallH: 45, octaves: 5,
    });
    ctx.globalCompositeOperation = dark ? 'screen' : 'multiply';
    ctx.globalAlpha = 0.65; ctx.drawImage(cloud, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    const r = mulberry32(hash('stone', seed));
    // mineral speckle
    for (let i = 0; i < 11000; i++) {
      const x = r() * w, y = r() * h, s = 0.4 + Math.pow(r(), 3) * 2.8;
      const l = 40 + r() * 150;
      ctx.fillStyle = dark ? `rgba(${l},${l - 3},${l - 7},${0.12 + r() * 0.5})` : `rgba(${l},${l - 4},${l - 12},${0.1 + r() * 0.28})`;
      ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
    }
    // fractures
    ctx.lineCap = 'round';
    for (let k = 0; k < 26; k++) {
      let x = r() * w, y = r() * h;
      const len = 30 + r() * 300;
      ctx.strokeStyle = dark ? `rgba(210,204,190,${0.035 + r() * 0.07})` : `rgba(50,42,30,${0.06 + r() * 0.1})`;
      ctx.lineWidth = 0.5 + r() * 1.1;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let s = 0; s < 12; s++) {
        x += (r() - 0.5) * 30; y += (r() - 0.7) * len / 8;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    const v = radial(ctx, w * 0.5, h * 0.46, Math.min(w, h) * 0.2, w * 0.5, h * 0.5, Math.max(w, h) * 0.82, [
      [0, 'rgba(0,0,0,0)'], [1, dark ? 'rgba(0,0,0,0.55)' : 'rgba(55,42,22,0.22)'],
    ]);
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  });
}

/** Coarse newsprint / woodcut printing paper. */
export function woodPaper(w, h, opts = {}) {
  const seed = opts.seed ?? 29;
  return layer(`paper:wood:${w}x${h}:${seed}:${opts.tone || 'cream'}`, w, h, (ctx) => {
    const base = opts.tone || '#e7ddc7';
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    const cloud = cloudLayer(Math.ceil(w / 2), Math.ceil(h / 2), seed + 2, {
      tint: '#5f4f36', alpha: 0.16, smallW: 80, smallH: 45, octaves: 4,
    });
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.8; ctx.drawImage(cloud, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    const r = mulberry32(hash('woodpaper', seed));
    // horizontal calendering streaks
    for (let i = 0; i < 800; i++) {
      const y = r() * h;
      ctx.strokeStyle = r() < 0.5 ? `rgba(255,250,236,${0.05 + r() * 0.11})` : `rgba(75,57,34,${0.02 + r() * 0.06})`;
      ctx.lineWidth = 0.4 + r() * 1.3;
      const x0 = r() * w;
      const len = 15 + r() * 220;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + len, y + (r() - 0.5) * 1.2); ctx.stroke();
    }
    fibers(ctx, w, h, seed + 6, 900, '#6d5737', 0.13);
    pulp(ctx, w, h, seed + 7, 900, '#6a5435', 0.10);
    deckle(ctx, w, h, '#4e3b22', seed + 3, 10);
    const v = radial(ctx, w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.8, [
      [0, 'rgba(0,0,0,0)'], [1, 'rgba(58,40,19,0.24)'],
    ]);
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  });
}

/** 2000s grey desktop background. */
export function desktop(w, h, opts = {}) {
  return layer(`paper:desktop:${w}x${h}:${opts.seed || 4}`, w, h, (ctx) => {
    const g = linear(ctx, 0, 0, w, h, [[0, '#0f5b7a'], [0.45, '#2b89a8'], [1, '#0a3f5b']]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const r = mulberry32(hash('desktop', opts.seed || 4));
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 15; i++) {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1 + r() * 2;
      const y = r() * h;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 24) ctx.lineTo(x, y + Math.sin(x / 180 + i) * 18 + (r() - 0.5) * 4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const v = radial(ctx, w * 0.5, h * 0.3, 50, w * 0.5, h * 0.5, w * 0.8, [[0, 'rgba(128,221,255,0.25)'], [1, 'rgba(0,30,50,0.45)']]);
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
    // dither pattern
    ctx.globalAlpha = 0.13;
    for (let y = 0; y < h; y += 4) {
      for (let x = (y / 4) % 2 ? 0 : 2; x < w; x += 4) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  });
}

/** Dark editor paper for the 2026 scene. */
export function darkGrid(w, h, opts = {}) {
  return layer(`paper:darkgrid:${w}x${h}:${opts.seed || 8}`, w, h, (ctx) => {
    const g = linear(ctx, 0, 0, w, h, [[0, '#0b0f14'], [0.5, '#0d131b'], [1, '#080b10']]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(100,140,175,0.045)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const v = radial(ctx, w * 0.62, h * 0.5, 120, w * 0.62, h * 0.5, w * 0.8, [[0, 'rgba(62,115,140,0.10)'], [1, 'rgba(0,0,0,0.55)']]);
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
    const grain = grainLayer(960, 540, 88, { amp: 0.08 });
    ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.13; ctx.drawImage(grain, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  });
}

/** Frosted glass (canvas-only approximation: soft blurred colour field + noise). */
export function frosted(w, h, opts = {}) {
  return layer(`paper:frosted:${w}x${h}:${opts.seed || 2}:${opts.tone || 'dark'}`, w, h, (ctx) => {
    const dark = opts.tone !== 'light';
    const g = linear(ctx, 0, 0, w, h, dark
      ? [[0, '#14161d'], [0.5, '#202832'], [1, '#090b10']]
      : [[0, '#d7cfc2'], [1, '#a9b5b7']]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const r = mulberry32(hash('frost', opts.seed || 2));
    for (let i = 0; i < 22; i++) {
      const x = r() * w, y = r() * h, rad = 80 + r() * 260;
      const gg = radial(ctx, x, y, 0, x, y, rad, [
        [0, dark ? 'rgba(96,123,144,0.20)' : 'rgba(255,255,255,0.34)'],
        [1, 'rgba(0,0,0,0)'],
      ]);
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
    }
    const grain = grainLayer(480, 270, 42, { amp: 0.18 });
    ctx.globalAlpha = 0.35; ctx.drawImage(grain, 0, 0, w, h); ctx.globalAlpha = 1;
  });
}

/** Faint rice-paper grid / ruled album leaf for scene 5. */
export function ruledPaper(w, h, opts = {}) {
  const seed = opts.seed ?? 51;
  return layer(`paper:ruled:${w}x${h}:${seed}:${opts.cols || 12}:${opts.rows || 9}`, w, h, (ctx) => {
    const paper = ricePaper(w, h, { tone: opts.tone || '#e9dfc4', seed, fibers: 900, stains: 8, deckle: 1 });
    ctx.drawImage(paper, 0, 0);
    ctx.strokeStyle = 'rgba(116,84,44,0.22)';
    ctx.lineWidth = 1;
    const cols = opts.cols || 12, rows = opts.rows || 9;
    for (let i = 1; i < cols; i++) {
      const x = (i / cols) * w;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let j = 1; j < rows; j++) {
      const y = (j / rows) * h;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    // red border rules, faint
    ctx.strokeStyle = 'rgba(145,45,38,0.19)';
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.03, h * 0.035, w * 0.94, h * 0.93);
    // insect holes, scorched edge
    const r = mulberry32(hash('insects', seed));
    for (let i = 0; i < 55; i++) {
      const edge = r() < 0.7;
      const x = edge ? (r() < 0.5 ? r() * w * 0.09 : w - r() * w * 0.09) : r() * w;
      const y = edge ? r() * h : (r() < 0.5 ? r() * h * 0.07 : h - r() * h * 0.07);
      const rad = 0.6 + r() * 5.5;
      ctx.fillStyle = `rgba(42,28,14,${0.3 + r() * 0.6})`;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(112,73,35,${0.2 + r() * 0.3})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.arc(x, y, rad + 1 + r() * 3, 0, TAU); ctx.stroke();
    }
    const v = radial(ctx, w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.8, [
      [0, 'rgba(0,0,0,0)'], [1, 'rgba(95,62,24,0.27)'],
    ]);
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  });
}

/** Faint optical-glass reflection for the CRT. */
export function glassSheen(w, h) {
  return layer(`paper:sheen:${w}x${h}`, w, h, (ctx) => {
    const g = linear(ctx, 0, 0, w, h, [
      [0, 'rgba(255,255,255,0.16)'],
      [0.32, 'rgba(255,255,255,0.04)'],
      [0.5, 'rgba(255,255,255,0)'],
      [1, 'rgba(255,255,255,0.02)'],
    ]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const arc = ctx.createRadialGradient(w * 0.38, h * 0.26, 20, w * 0.38, h * 0.26, w * 0.45);
    arc.addColorStop(0, 'rgba(255,255,255,0.18)');
    arc.addColorStop(0.5, 'rgba(255,255,255,0.035)');
    arc.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = arc; ctx.fillRect(0, 0, w, h);
  });
}

/** Apply an aged vignette to any context (dynamic, cheap). */
export function vignette(ctx, w, h, opts = {}) {
  const v = vignetteLayer(w, h, opts);
  ctx.drawImage(v, 0, 0);
}

export function paperEdgeBurn(ctx, w, h, { color = 'rgba(70,42,12,0.8)', depth = 24 } = {}) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, color);
  g.addColorStop(depth / h, 'rgba(0,0,0,0)');
  g.addColorStop(1 - depth / h, 'rgba(0,0,0,0)');
  g.addColorStop(1, color);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const g2 = ctx.createLinearGradient(0, 0, w, 0);
  g2.addColorStop(0, color);
  g2.addColorStop(depth / w, 'rgba(0,0,0,0)');
  g2.addColorStop(1 - depth / w, 'rgba(0,0,0,0)');
  g2.addColorStop(1, color);
  ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);
}

/** Deliberately visible printing misregistration: red / blue channels offset. */
export function misregistered(ctx, draw, offsets = [[4, 1], [0, 0], [-3, -1]], colors = ['#b32a25', '#1b1a18', '#1d5b6d']) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  for (let i = 0; i < offsets.length; i++) {
    ctx.save();
    ctx.translate(offsets[i][0], offsets[i][1]);
    ctx.globalAlpha = i === 1 ? 1 : 0.3;
    ctx.strokeStyle = colors[i];
    ctx.fillStyle = colors[i];
    draw(i);
    ctx.restore();
  }
  ctx.restore();
}
