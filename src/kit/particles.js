/**
 * particles.js — deterministic winds, rain, ash, leaves, glyph dust and
 * splashes. Everything is a pure function of (t, seed, index); no simulation
 * state survives a seek, so a frame rendered at 91.3 s is byte-identical to the
 * same frame reached by playback.
 */
import { TAU, clamp, clamp01, lerp, hash, unit, mulberry32, noise2, fbm1 } from './math.js';
import { rgba } from './canvas.js';

/** A smooth deterministic gust field. */
export function gust(t, seed = 0, strength = 1) {
  return strength * (
    0.48 +
    0.25 * Math.sin(t * 1.17 + seed * 0.71) +
    0.17 * Math.sin(t * 2.63 + seed * 1.3) +
    0.1 * Math.sin(t * 4.7 + seed * 2.1)
  );
}

/**
 * windAt — vector wind at a point. Used by ribbons (scene 2) and the roof
 * particles (scene 10). Mostly horizontal; a slow vertical eddy.
 */
export function windAt(x, y, t, opts = {}) {
  const seed = opts.seed ?? 2;
  const strength = opts.strength ?? 1;
  const gustV = gust(t, seed, strength);
  const n = fbm1(x * 0.002 + t * 0.13, 3, seed + 4) - 0.5;
  const n2 = fbm1(y * 0.003 - t * 0.09, 2, seed + 7) - 0.5;
  return [gustV * (0.7 + n * 0.6), (n2 * 46 + Math.sin(t * 0.8 + x * 0.004) * 12) * strength];
}

export const Rain = class Rain {
  constructor(opts = {}) {
    this.n = opts.n ?? 280;
    this.seed = opts.seed ?? 808;
    this.speed = opts.speed ?? 2200;
    this.slant = opts.slant ?? -0.17;
    this.lenK = opts.lenK ?? 0.032;
    this.color = opts.color || '#e5ddc8';
    this.alpha = opts.alpha ?? 0.44;
    this.beads = opts.beads ?? false;
    this.w = opts.w ?? 1920;
    this.h = opts.h ?? 1080;
    this.timeScale = opts.timeScale ?? 1;
  }
  draw(ctx, t, opts = {}) {
    const spanX = this.w * 1.3, spanY = this.h * 1.35;
    const speed = this.speed * this.timeScale;
    const alpha = this.alpha * (opts.alpha ?? 1);
    ctx.save();
    ctx.strokeStyle = rgba(this.color, alpha);
    ctx.fillStyle = rgba(this.color, alpha);
    ctx.lineCap = 'round';
    for (let i = 0; i < this.n; i++) {
      const rx = unit(this.seed, i, 1);
      const ry = unit(this.seed, i, 2);
      const rv = unit(this.seed, i, 3);
      const sp = speed * (0.7 + rv * 0.7);
      const y = ((ry * spanY + t * sp) % spanY) - this.h * 0.16;
      const x = rx * spanX - this.w * 0.12 + y * this.slant * 0.38;
      const len = sp * this.lenK * (0.65 + rv * 0.7);
      if (this.beads) {
        const r = 2.2 + rv * 2.7;
        ctx.globalAlpha = alpha * (0.65 + rv * 0.35);
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.arc(x - r * 0.28, y - r * 0.3, r * 0.38, 0, TAU); ctx.fill();
        ctx.fillStyle = rgba(this.color, alpha);
      } else {
        ctx.globalAlpha = alpha * (0.3 + rv * 0.7);
        ctx.lineWidth = 0.6 + rv * 1.2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len * this.slant, y + len); ctx.stroke();
      }
    }
    ctx.restore();
  }
};

/** Leaves / ash / torn paper; deterministic, optionally sampled glyphs. */
export function driftField(ctx, t, opts = {}) {
  const n = opts.n ?? 80;
  const seed = opts.seed ?? 11;
  const w = opts.w ?? 1920, h = opts.h ?? 1080;
  const color = opts.color || 'rgba(28,23,15,0.75)';
  const speed = opts.speed ?? 70;
  const size = opts.size ?? 8;
  const t0 = opts.t0 ?? 0;
  const kind = opts.kind || 'leaf';
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  for (let i = 0; i < n; i++) {
    const r1 = unit(seed, i, 1), r2 = unit(seed, i, 2), r3 = unit(seed, i, 3), r4 = unit(seed, i, 4);
    const life = t - t0;
    const phase = (r1 * w + life * speed * (0.5 + r3)) % (w * 1.25) - w * 0.12;
    const x = opts.direction === -1 ? w - phase : phase;
    const y = (r2 * h * 1.2 + Math.sin(life * (0.7 + r4 * 0.7) + i) * (20 + r3 * 70) + life * speed * 0.4) % (h * 1.25) - h * 0.12;
    const rot = life * (0.4 + r2 * 1.8) + i;
    const scale = (0.45 + r4 * 1.2) * size;
    ctx.globalAlpha = (opts.alpha ?? 0.8) * (0.35 + r4 * 0.65);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    if (kind === 'leaf') {
      ctx.beginPath();
      ctx.moveTo(-scale, 0);
      ctx.quadraticCurveTo(0, -scale * 0.55, scale, 0);
      ctx.quadraticCurveTo(0, scale * 0.28, -scale, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-scale, 0); ctx.lineTo(scale * 0.7, 0);
      ctx.globalAlpha *= 0.6; ctx.lineWidth = 0.8; ctx.stroke();
    } else if (kind === 'ash') {
      ctx.beginPath();
      ctx.ellipse(0, 0, scale * 0.38, scale * 0.28, rot, 0, TAU);
      ctx.fill();
    } else if (kind === 'paper') {
      ctx.beginPath();
      ctx.moveTo(-scale * 0.8, -scale * 0.3);
      ctx.lineTo(scale, -scale * 0.12);
      ctx.lineTo(scale * 0.55, scale * 0.55);
      ctx.lineTo(-scale * 0.9, scale * 0.32);
      ctx.closePath(); ctx.fill();
    } else if (kind === 'glyph') {
      ctx.font = `${size * 1.3}px "Noto Serif SC", serif`;
      ctx.fillText(opts.glyphs ? opts.glyphs[i % opts.glyphs.length] : '杜', -scale * 0.5, scale * 0.5);
    }
    ctx.restore();
  }
  ctx.restore();
}

/** A torn roof / paper roof made of glyphs, blown apart in scene 10. */
export function glyphRoof(ctx, t, opts = {}) {
  const n = opts.n ?? 620;
  const seed = opts.seed ?? 761;
  const cx = opts.x ?? 960;
  const baseY = opts.y ?? 510;
  const width = opts.w ?? 720;
  const blow = clamp01(opts.blow ?? 0);
  const glyphs = opts.glyphs || ['茅', '屋', '风', '雨', '卷', '我', '三', '重', '茅'];
  ctx.save();
  for (let i = 0; i < n; i++) {
    const r1 = unit(seed, i, 1), r2 = unit(seed, i, 2), r3 = unit(seed, i, 3), r4 = unit(seed, i, 4);
    const u = r1;
    const v = r2;
    const roofX = cx + (u - 0.5) * width;
    const roofY = baseY - Math.sin(u * Math.PI) * 160 * (0.5 + v * 0.5) - v * 50;
    const e = blow * (0.3 + r3);
    const dir = r4 < 0.5 ? -1 : 1;
    const x = roofX + dir * e * (250 + r3 * 1100);
    const y = roofY - e * (200 + r4 * 700) + Math.sin(t * 2 + i) * e * 30;
    const a = (1 - blow * 0.7) * (0.32 + r4 * 0.68);
    if (a < 0.02) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((r3 - 0.5) * e * 5 + (u - 0.5) * 0.15);
    ctx.globalAlpha = a;
    ctx.font = `${16 + Math.floor(r2 * 18)}px "Noto Serif SC", serif`;
    ctx.fillStyle = opts.color || '#17130d';
    ctx.fillText(glyphs[(i * 7) % glyphs.length], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

/** A deterministic waterfall of horizontal particles, used for rain curtains. */
export function rainCurtain(ctx, x, y, w, h, t, opts = {}) {
  const n = opts.n ?? 650;
  const seed = opts.seed ?? 3;
  ctx.save();
  ctx.strokeStyle = opts.color || 'rgba(230,236,226,0.2)';
  ctx.lineWidth = opts.width ?? 0.7;
  for (let i = 0; i < n; i++) {
    const r1 = unit(seed, i, 1);
    const r2 = unit(seed, i, 2);
    const r3 = unit(seed, i, 3);
    const gx = x + r1 * w;
    const gy = y + ((r2 * h + t * (250 + r3 * 480)) % h);
    const len = 16 + r3 * 90;
    ctx.globalAlpha = (opts.alpha ?? 0.3) * (0.2 + r3 * 0.8);
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx - len * 0.14, gy + len);
    ctx.stroke();
  }
  ctx.restore();
}

/** Snow / dandelion / sparks. */
export function floatMotes(ctx, t, opts = {}) {
  const n = opts.n ?? 80;
  const seed = opts.seed ?? 5;
  const w = opts.w ?? 1920, h = opts.h ?? 1080;
  const color = opts.color || 'rgba(250,247,235,0.7)';
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const r1 = unit(seed, i, 1), r2 = unit(seed, i, 2), r3 = unit(seed, i, 3);
    const x = (r1 * w + Math.sin(t * 0.5 + i) * (8 + r3 * 24) + t * 9 * (r3 - 0.5)) % w;
    const y = (r2 * h + t * (5 + r1 * 17) + Math.cos(t * 0.8 + i) * 10) % h;
    const size = (0.4 + r3 * 2.4) * (opts.scale ?? 1);
    ctx.globalAlpha = (opts.alpha ?? 1) * (0.25 + r3 * 0.75);
    ctx.beginPath(); ctx.arc(x, y, size, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

