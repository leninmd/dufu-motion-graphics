/**
 * frames.js — the "time-gate" furniture: stone/ink portals, registration
 * marks, gallery frames and the speed streaks that carry the traveller from
 * one era into the next.
 */
import { clamp, clamp01, lerp, smoothstep, hash, mulberry32, TAU } from './math.js';
import { rgba, linear, radial, makeCanvas } from './canvas.js';

/** Four corner registration marks (print-shop crop marks). */
export function registrationMarks(ctx, x, y, w, h, { color = 'rgba(230,216,186,0.28)', len = 18, inset = 12, width = 1 } = {}) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  const X = x + inset, Y = y + inset, R = x + w - inset, B = y + h - inset;
  ctx.beginPath();
  ctx.moveTo(X, Y + len); ctx.lineTo(X, Y); ctx.lineTo(X + len, Y);
  ctx.moveTo(R - len, Y); ctx.lineTo(R, Y); ctx.lineTo(R, Y + len);
  ctx.moveTo(R, B - len); ctx.lineTo(R, B); ctx.lineTo(R - len, B);
  ctx.moveTo(X + len, B); ctx.lineTo(X, B); ctx.lineTo(X, B - len);
  ctx.stroke();
  ctx.restore();
}

/**
 * A dimensional gateway. Used when the traveller is about to cross into the
 * next era. `style` controls the material: stone, ink, silk, woodcut, neon.
 */
export function drawPortal(ctx, x, y, w, h, opts = {}) {
  const style = opts.style || 'stone';
  const accent = opts.accent || '#c8a55c';
  const a = opts.alpha ?? 1;
  const t = opts.t ?? 0;
  const seed = opts.seed ?? 1;
  if (a <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = a;
  if (style === 'stone') {
    ctx.fillStyle = '#181613';
    ctx.fillRect(x - 22, y - 22, w + 44, h + 44);
    ctx.strokeStyle = 'rgba(213,195,158,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 18, y - 18, w + 36, h + 36);
    ctx.strokeStyle = 'rgba(245,235,209,0.58)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
    // chipped stone blocks
    const r = mulberry32(hash('portalstone', seed));
    for (let i = 0; i < 20; i++) {
      const edge = Math.floor(r() * 4);
      let px, py;
      if (edge === 0) { px = x + r() * w; py = y - 20 + r() * 18; }
      else if (edge === 1) { px = x + w + 2 + r() * 18; py = y + r() * h; }
      else if (edge === 2) { px = x + r() * w; py = y + h + 2 + r() * 18; }
      else { px = x - 20 + r() * 18; py = y + r() * h; }
      ctx.fillStyle = `rgba(222,208,178,${0.04 + r() * 0.14})`;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + 4 + r() * 15, py + (r() - 0.5) * 8);
      ctx.lineTo(px + (r() - 0.5) * 10, py + 4 + r() * 12);
      ctx.closePath(); ctx.fill();
    }
    // phantom edge glow on the inside
    const g = linear(ctx, x - 10, y, x + 10, y, [[0, 'rgba(0,0,0,0)'], [0.7, rgba(accent, 0.12)], [1, rgba(accent, 0.4)]]);
    ctx.fillStyle = g;
    ctx.fillRect(x - 10, y, 10, h);
  } else if (style === 'ink') {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = 'rgba(22,17,11,0.9)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.lineWidth = 13 - i * 4;
      ctx.globalAlpha = a * (0.28 + i * 0.26);
      ctx.beginPath();
      for (let k = 0; k <= 30; k++) {
        const u = k / 30;
        const wob = Math.sin(u * 21 + i) * 2.4 + Math.sin(u * 7 + t * 0.7) * 1.2;
        const px = u * w + wob;
        if (k === 0) ctx.moveTo(px, -4); else ctx.lineTo(px, -4);
      }
      ctx.stroke();
      ctx.beginPath();
      for (let k = 0; k <= 30; k++) {
        const u = k / 30;
        const wob = Math.sin(u * 17 + i + 2) * 2.2;
        if (k === 0) ctx.moveTo(0 + wob, u * h); else ctx.lineTo(0 + wob, u * h);
      }
      ctx.stroke();
      ctx.beginPath();
      for (let k = 0; k <= 30; k++) {
        const u = k / 30;
        const wob = Math.sin(u * 19 + i + 5) * 2;
        if (k === 0) ctx.moveTo(w + wob, u * h); else ctx.lineTo(w + wob, u * h);
      }
      ctx.stroke();
    }
    ctx.restore();
  } else if (style === 'woodcut') {
    ctx.fillStyle = '#17130e';
    ctx.fillRect(x - 15, y - 15, w + 30, h + 30);
    ctx.strokeStyle = '#e9ddc2';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = '#a52a22';
    ctx.lineWidth = 7;
    ctx.strokeRect(x - 11, y - 11, w + 22, h + 22);
    const r = mulberry32(hash('portalwood', seed));
    for (let i = 0; i < 26; i++) {
      const px = x - 8 + r() * (w + 16);
      ctx.strokeStyle = `rgba(232,220,193,${0.06 + r() * 0.1})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(px, y - 12); ctx.lineTo(px + (r() - 0.5) * 8, y + h + 12); ctx.stroke();
    }
  } else if (style === 'gold') {
    ctx.strokeStyle = 'rgba(212,175,55,0.9)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(212,175,55,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 8, y - 8, w + 16, h + 16);
    ctx.fillStyle = 'rgba(8,20,15,0.65)';
    ctx.fillRect(x - 8, y - 8, w + 16, 4);
    ctx.fillRect(x - 8, y + h + 4, w + 16, 4);
  } else if (style === 'crt') {
    ctx.shadowColor = '#00ff66';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0,255,102,0.2)';
    ctx.strokeRect(x - 7, y - 7, w + 14, h + 14);
  } else {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
  }
  ctx.restore();
}

/** A gate seen at the right edge: a sliver of the next world. */
export function drawExitGate(ctx, x, y, w, h, opts = {}) {
  const style = opts.style || 'stone';
  const accent = opts.accent || '#d4af37';
  const p = clamp01(opts.p ?? 1);
  drawPortal(ctx, x, y, w, h, { style, accent, alpha: opts.alpha ?? 1, seed: opts.seed, t: opts.t ?? 0 });
  if (opts.peek) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x + 6, y + 6, w - 12, h - 12); ctx.clip();
    opts.peek(ctx, x + 6, y + 6, w - 12, h - 12);
    ctx.restore();
  }
  // light spill on the interior edge
  if (p > 0) {
    ctx.save();
    const g = linear(ctx, x, y, x + 80, y, [[0, rgba(accent, 0.25 * p)], [1, rgba(accent, 0)]]);
    ctx.fillStyle = g; ctx.fillRect(x, y, 80, h);
    ctx.restore();
  }
}

/** Horizontal speed streaks, deterministic and light. */
export function speedStreaks(ctx, w, h, t, { dir = 1, alpha = 0.25, color = '#efe4c9', n = 34, seed = 3 } = {}) {
  ctx.save();
  ctx.lineCap = 'round';
  const r = mulberry32(hash('speed', seed));
  for (let i = 0; i < n; i++) {
    const y = r() * h;
    const len = 100 + r() * 660;
    const x = ((r() * w + t * (900 + r() * 1400)) % (w + 600)) - 300;
    ctx.globalAlpha = alpha * (0.15 + r() * 0.8);
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.6 + r() * 2.4;
    ctx.beginPath();
    ctx.moveTo(dir > 0 ? x : w - x, y);
    ctx.lineTo(dir > 0 ? x + len : w - x - len, y + (r() - 0.5) * 3);
    ctx.stroke();
  }
  ctx.restore();
}

/** Screen-edge frame appropriate to a scene's material. */
export function drawFrame(ctx, meta, opts = {}) {
  const style = meta?.style || 'black';
  const w = opts.w || 1920, h = opts.h || 1080;
  const accent = opts.accent || meta?.accent || '#d4af37';
  const inset = opts.inset ?? 22;
  ctx.save();
  if (style === 'crt') {
    const g = radial(ctx, w / 2, h / 2, h * 0.25, w / 2, h / 2, w * 0.72, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.66)']]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  ctx.strokeStyle = rgba(accent, 0.22);
  ctx.lineWidth = 1;
  ctx.strokeRect(inset + 0.5, inset + 0.5, w - inset * 2 - 1, h - inset * 2 - 1);
  registrationMarks(ctx, inset, inset, w - inset * 2, h - inset * 2, { color: rgba(accent, 0.22), len: 16, inset: 0 });
  ctx.restore();
}

/** Gallery frame for the outro wall. */
export function galleryFrame(ctx, x, y, w, h, opts = {}) {
  const style = opts.style || 'wood';
  const light = opts.light ?? 1;
  ctx.save();
  if (style === 'wood') {
    // The frame is a border, never a matte: the picture must stay visible.
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = '#151310';
    ctx.fillRect(x - 12, y - 12, w + 24, 8);
    ctx.fillRect(x - 12, y + h + 4, w + 24, 8);
    ctx.fillRect(x - 12, y - 12, 8, h + 24);
    ctx.fillRect(x + w + 4, y - 12, 8, h + 24);
    ctx.restore();
    const g = linear(ctx, x, y, x + w, y + h, [[0, '#5f4a2c'], [0.5, '#8b6a3f'], [1, '#3b2b19']]);
    ctx.fillStyle = g;
    ctx.fillRect(x - 10, y - 10, w + 20, 6);
    ctx.fillRect(x - 10, y + h + 4, w + 20, 6);
    ctx.fillRect(x - 10, y - 10, 6, h + 20);
    ctx.fillRect(x + w + 4, y - 10, 6, h + 20);
    ctx.strokeStyle = 'rgba(214,184,123,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
  } else {
    ctx.fillStyle = 'rgba(15,14,12,0.9)';
    ctx.fillRect(x - 10, y - 10, w + 20, h + 20);
    ctx.strokeStyle = rgba(opts.accent || '#c7a05b', 0.6);
    ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
  }
  if (light < 1) {
    ctx.fillStyle = `rgba(0,0,0,${1 - light})`;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}
