/**
 * canvas.js — offscreen layers, colour, noise and compositing helpers.
 * Static textures are baked once into cached canvases and reused by every
 * frame. Nothing here depends on wall-clock time or an unseeded random source.
 */
import { clamp01, hash, mulberry32, roundedRect, TAU } from './math.js';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

export function makeCtx(w, h, opts = {}) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d', opts.alpha === false ? { alpha: false } : undefined);
  return { canvas: c, ctx };
}

export function ctx2d(canvas, opts) {
  return canvas.getContext('2d', opts);
}

/* -------------------------------------------------------------------- colour */
export function parseColor(col) {
  if (Array.isArray(col)) return [col[0] | 0, col[1] | 0, col[2] | 0, col.length > 3 ? +col[3] : 1];
  if (typeof col !== 'string') return [0, 0, 0, 1];
  const s = col.trim();
  if (s[0] === '#') {
    let h = s.slice(1);
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    if (h.length === 4) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h.slice(0, 6), 16);
    const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
  }
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const a = m[1].split(',').map((x) => parseFloat(x));
    return [a[0] | 0, a[1] | 0, a[2] | 0, a.length > 3 ? a[3] : 1];
  }
  const named = { black: [0, 0, 0, 1], white: [255, 255, 255, 1], transparent: [0, 0, 0, 0] };
  return named[s.toLowerCase()] || [0, 0, 0, 1];
}

export function rgba(col, alpha = 1) {
  const c = parseColor(col);
  const a = clamp01(c[3] * alpha);
  return `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(4)})`;
}

export function rgb(col) {
  const c = parseColor(col);
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export function mixColor(a, b, p) {
  const A = parseColor(a), B = parseColor(b);
  const q = clamp01(p);
  return `rgba(${Math.round(A[0] + (B[0] - A[0]) * q)},${Math.round(A[1] + (B[1] - A[1]) * q)},${Math.round(A[2] + (B[2] - A[2]) * q)},${(A[3] + (B[3] - A[3]) * q).toFixed(4)})`;
}

export function shade(col, amount = 0.1) {
  const c = parseColor(col);
  if (amount >= 0) {
    return `rgba(${Math.round(c[0] + (255 - c[0]) * amount)},${Math.round(c[1] + (255 - c[1]) * amount)},${Math.round(c[2] + (255 - c[2]) * amount)},${c[3]})`;
  }
  const k = 1 + amount;
  return `rgba(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)},${c[3]})`;
}

export function linear(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [p, color] of stops) g.addColorStop(clamp01(p), color);
  return g;
}
export function radial(ctx, x0, y0, r0, x1, y1, r1, stops) {
  const g = ctx.createRadialGradient(x0, y0, Math.max(0.01, r0), x1, y1, Math.max(0.01, r1));
  for (const [p, color] of stops) g.addColorStop(clamp01(p), color);
  return g;
}

/* -------------------------------------------------------------- layer cache */
const MAX_CACHE_BYTES = 176 * 1024 * 1024;
const layerCache = new Map();
let cacheBytes = 0;

/**
 * Build (or return cached) canvas. `paint(ctx, w, h)` is called once.
 * The key is global; prefix with your scene id to allow targeted eviction.
 */
export function layer(key, w, h, paint, opts = {}) {
  const k = key.includes(':') ? key : `global:${key}`;
  const width = Math.max(1, Math.ceil(w)), height = Math.max(1, Math.ceil(h));
  const hit = layerCache.get(k);
  if (hit && hit.w === width && hit.h === height) {
    layerCache.delete(k); layerCache.set(k, hit);
    return hit.canvas;
  }
  if (hit) { cacheBytes -= hit.bytes; layerCache.delete(k); }
  const { canvas, ctx } = makeCtx(width, height, { alpha: opts.alpha !== false });
  if (opts.alpha === false) { ctx.fillStyle = opts.background || '#000'; ctx.fillRect(0, 0, width, height); }
  try { paint(ctx, width, height); } catch (e) { console.error('[layer]', k, e); }
  const bytes = width * height * 4;
  layerCache.set(k, { canvas, w: width, h: height, bytes });
  cacheBytes += bytes;
  trimCache(opts.keepPrefix ? k.split(':')[0] : null);
  return canvas;
}

function trimCache(keepPrefix) {
  while (cacheBytes > MAX_CACHE_BYTES && layerCache.size > 1) {
    let victim = null;
    for (const [k, v] of layerCache) {
      if (keepPrefix && k.startsWith(keepPrefix + ':')) continue;
      victim = [k, v];
      break;
    }
    if (!victim) break;
    layerCache.delete(victim[0]);
    cacheBytes -= victim[1].bytes;
  }
}

export function dropLayers(prefix) {
  for (const [k, v] of [...layerCache]) {
    if (!prefix || k.startsWith(prefix + ':') || k === prefix) {
      layerCache.delete(k);
      cacheBytes -= v.bytes;
    }
  }
}
export const layerBytes = () => cacheBytes;

export function drawLayer(ctx, img, x = 0, y = 0, w, h, alpha = 1, blend = 'source-over') {
  if (!img || alpha <= 0.0001) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = blend;
  ctx.drawImage(img, x, y, w == null ? img.width : w, h == null ? img.height : h);
  ctx.restore();
}

export function drawCover(ctx, img, x, y, w, h, alpha = 1) {
  const scale = Math.max(w / img.width, h / img.height);
  const iw = img.width * scale, ih = img.height * scale;
  drawLayer(ctx, img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih, alpha);
}

export function drawContain(ctx, img, x, y, w, h, alpha = 1) {
  const scale = Math.min(w / img.width, h / img.height);
  const iw = img.width * scale, ih = img.height * scale;
  drawLayer(ctx, img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih, alpha);
}

/* --------------------------------------------------------------------- noise */
/**
 * Per-pixel monochrome grain as a transparent canvas. Use small tiles and
 * upscale for cheap, coherent film grain. Generated once.
 */
export function grainLayer(w, h, seed = 1, opts = {}) {
  const { canvas, ctx } = makeCtx(w, h);
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const r = mulberry32(hash('grain', seed));
  const mono = opts.mono !== false;
  const amp = opts.amp ?? 0.5;
  const tint = parseColor(opts.tint || '#000000');
  for (let i = 0; i < w * h; i++) {
    const n = (r() * 2 - 1) * amp;
    const o = i * 4;
    if (mono) {
      const v = n > 0 ? 255 : 0;
      const a = Math.abs(n) * 255;
      d[o] = v; d[o + 1] = v; d[o + 2] = v; d[o + 3] = a;
    } else {
      d[o] = tint[0]; d[o + 1] = tint[1]; d[o + 2] = tint[2];
      d[o + 3] = Math.abs(n) * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Coarse cloud field, useful for ink-wash mist and stone mottling. */
export function cloudLayer(w, h, seed = 1, opts = {}) {
  const smallW = opts.smallW || 128;
  const smallH = opts.smallH || 72;
  const small = makeCanvas(smallW, smallH);
  const sctx = small.getContext('2d');
  const img = sctx.createImageData(smallW, smallH);
  const r = mulberry32(hash('cloud', seed));
  const octaves = opts.octaves || 4;
  // Value noise sampled at multiple frequencies; small enough to stay cheap.
  const grids = [];
  for (let o = 0; o < octaves; o++) {
    const gx = 6 << o, gy = 4 << o;
    const g = new Float32Array(gx * gy);
    for (let i = 0; i < g.length; i++) g[i] = r();
    grids.push({ gx, gy, g });
  }
  const sample = (gx, gy, g, x, y) => {
    const fx = x * (gx - 1), fy = y * (gy - 1);
    const ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = fx - ix, ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = g[iy * gx + ix], b = g[iy * gx + Math.min(gx - 1, ix + 1)];
    const c = g[Math.min(gy - 1, iy + 1) * gx + ix], d = g[Math.min(gy - 1, iy + 1) * gx + Math.min(gx - 1, ix + 1)];
    return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
  };
  const base = parseColor(opts.tint || '#ffffff');
  for (let y = 0; y < smallH; y++) {
    for (let x = 0; x < smallW; x++) {
      let v = 0, amp = 0.55, norm = 0;
      for (let o = 0; o < octaves; o++) {
        const gr = grids[o];
        v += sample(gr.gx, gr.gy, gr.g, x / smallW, y / smallH) * amp;
        norm += amp; amp *= 0.52;
      }
      v /= norm;
      const p = clamp01((v - 0.28) / 0.64);
      const o = (y * smallW + x) * 4;
      img.data[o] = base[0]; img.data[o + 1] = base[1]; img.data[o + 2] = base[2];
      img.data[o + 3] = p * (opts.alpha ?? 1) * 255;
    }
  }
  sctx.putImageData(img, 0, 0);
  const { canvas, ctx } = makeCtx(w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, w, h);
  return canvas;
}

/** Horizontal scanline overlay. */
export function scanlinesLayer(w, h, { gap = 3, alpha = 0.15, color = '#000', offset = 0 } = {}) {
  const { canvas, ctx } = makeCtx(w, h);
  ctx.fillStyle = color;
  for (let y = offset % gap; y < h; y += gap) {
    ctx.globalAlpha = alpha;
    ctx.fillRect(0, y, w, 1);
  }
  return canvas;
}

/** Vignette with elliptical falloff. */
export function vignetteLayer(w, h, { strength = 0.55, color = '#000', inner = 0.35, outer = 0.82 } = {}) {
  const { canvas, ctx } = makeCtx(w, h);
  const g = ctx.createRadialGradient(w * 0.5, h * 0.48, Math.min(w, h) * inner, w * 0.5, h * 0.48, Math.max(w, h) * outer);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.62, `rgba(0,0,0,${strength * 0.28})`);
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  return canvas;
}

/* ------------------------------------------------------------------ drawing */
export function strokePolyline(ctx, pts, width = 1, style = '#000', close = false) {
  if (!pts || pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
  ctx.lineWidth = width;
  ctx.strokeStyle = style;
  ctx.stroke();
}

export function fillPolygon(ctx, pts, style = '#000') {
  if (!pts || pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = style;
  ctx.fill();
}

export function roundedBox(ctx, x, y, w, h, r, fill, stroke, lineWidth = 1) {
  roundedRect(ctx, x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lineWidth; ctx.strokeStyle = stroke; ctx.stroke(); }
}

export function dashed(ctx, pts, width, color, dash = [8, 8], dashOffset = 0) {
  if (!pts || pts.length < 2) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.setLineDash(dash);
  ctx.lineDashOffset = dashOffset;
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
}

export function clipPolygon(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.clip();
}

export function withClip(ctx, x, y, w, h, fn) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  fn();
  ctx.restore();
}

export function withPolyClip(ctx, pts, fn) {
  ctx.save();
  clipPolygon(ctx, pts);
  fn();
  ctx.restore();
}

export function softShadow(ctx, { color = 'rgba(0,0,0,0.4)', blur = 12, x = 0, y = 3 } = {}) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = x;
  ctx.shadowOffsetY = y;
}
export function clearShadow(ctx) {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

/** Cheap glow: draw a path several times with decreasing alpha and increasing width. */
export function glowStroke(ctx, drawPath, { color = '#fff', width = 2, glow = 12, passes = 4 } = {}) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  for (let i = passes; i >= 1; i--) {
    const k = i / passes;
    ctx.globalAlpha = 0.08 + 0.05 / k;
    ctx.lineWidth = width + glow * k;
    drawPath();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = width;
  drawPath();
  ctx.stroke();
  ctx.restore();
}

/** Fill a point cloud efficiently, batching colour buckets. */
export function cloudPoints(ctx, points, { color = '#fff', size = 1, alpha = 1, composite = 'source-over' } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = composite;
  ctx.fillStyle = color;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const s = typeof size === 'function' ? size(p, i) : size;
    ctx.fillRect(p[0], p[1], s, s);
  }
  ctx.restore();
}

/** Deterministic image hash for QA (stable 32-bit FNV over sampled pixels). */
export function imageHash(ctx, w, h, step = 16) {
  const data = ctx.getImageData(0, 0, w, h).data;
  let hashValue = 2166136261 >>> 0;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const o = (y * w + x) * 4;
      hashValue ^= data[o] | (data[o + 1] << 8) | (data[o + 2] << 16) | (data[o + 3] << 24);
      hashValue = Math.imul(hashValue, 16777619);
    }
  }
  return (hashValue >>> 0).toString(16).padStart(8, '0');
}

/** Pixel coverage / contrast metrics used by qa-gate. */
export function pixelStats(ctx, w, h, step = 8) {
  const data = ctx.getImageData(0, 0, w, h).data;
  let n = 0, sum = 0, sum2 = 0, dark = 0, bright = 0, colorful = 0;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const o = (y * w + x) * 4;
      const r = data[o], g = data[o + 1], b = data[o + 2];
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      n++; sum += l; sum2 += l * l;
      if (l < 20) dark++;
      if (l > 225) bright++;
      if (Math.max(r, g, b) - Math.min(r, g, b) > 24) colorful++;
    }
  }
  const mean = sum / n;
  const variance = Math.max(0, sum2 / n - mean * mean);
  return { mean, std: Math.sqrt(variance), dark: dark / n, bright: bright / n, colorful: colorful / n, samples: n };
}

/** Reusable round-capped dot. */
export function dot(ctx, x, y, r, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.01, r), 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function ellipse(ctx, x, y, rx, ry, fill, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.ellipse(0, 0, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.restore();
}
