/**
 * type.js — typography for a film that tells its story with text.
 * Canvas2D only. Letter-spacing, wrapping, vertical columns, kinetic reveals,
 * masks and glyph sampling. No TTS, no narration: the type carries the voice.
 */
import { clamp, clamp01, lerp, hash, TAU, easeOut, smoothstep } from './math.js';
import { makeCanvas, rgba, withClip, parseColor } from './canvas.js';
import { markText } from './debug.js';

export const FONT = Object.freeze({
  serif: '"Noto Serif SC", "Songti SC", "SimSun", serif',
  display: '"Source Han Serif SC", "Noto Serif SC", "Songti SC", serif',
  kai: '"STKaiti", "KaiTi", "LXGW WenKai", serif',
  brush: '"Ma Shan Zheng", "STKaiti", "KaiTi", serif',
  wenkai: '"LXGW WenKai", "Noto Serif SC", serif',
  mono: '"Cascadia Mono", "Consolas", "SFMono-Regular", monospace',
  sans: '"Cascadia Mono", "Microsoft YaHei UI", "Noto Serif SC", sans-serif',
});

const metricCache = new Map();
const spriteCache = new Map();
const MAX_SPRITES = 420;

export function fontString(size, family = FONT.serif, weight = 400, style = 'normal') {
  return `${style} ${weight} ${size}px ${family}`;
}

function applyFont(ctx, size, family, weight, style, letterSpacing) {
  ctx.font = fontString(size, family, weight, style);
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${letterSpacing || 0}px`;
}

export function measure(ctx, text, opts = {}) {
  const size = opts.size ?? 36;
  const family = opts.font || FONT.serif;
  const weight = opts.weight ?? 400;
  const style = opts.style ?? 'normal';
  const spacing = opts.letterSpacing ?? 0;
  const key = `${text}|${size}|${family}|${weight}|${style}|${spacing}`;
  let w = metricCache.get(key);
  if (w != null) return w;
  ctx.save();
  applyFont(ctx, size, family, weight, style, spacing);
  w = ctx.measureText(String(text)).width;
  ctx.restore();
  if (metricCache.size > 4000) metricCache.clear();
  metricCache.set(key, w);
  return w;
}

/** Return a font size that fits `text` inside maxWidth. */
export function fitSize(ctx, text, maxWidth, size, opts = {}) {
  const w = measure(ctx, text, { ...opts, size });
  if (w <= maxWidth) return size;
  return Math.max(8, Math.floor((size * maxWidth) / Math.max(1, w) * 10) / 10);
}

const isCJK = (ch) => /[\u3000-\u9fff\uf900-\ufaff\u3400-\u4dbf]/.test(ch);

function breakLines(ctx, text, maxWidth, size, opts) {
  const paragraphs = String(text).split('\n');
  if (!maxWidth) return paragraphs;
  const out = [];
  for (const para of paragraphs) {
    if (!para) { out.push(''); continue; }
    const chars = [...para];
    let line = '';
    for (let i = 0; i < chars.length; i++) {
      const test = line + chars[i];
      if (line && measure(ctx, test, { ...opts, size }) > maxWidth) {
        // Prefer breaking before a Latin word if possible.
        const m = line.match(/[A-Za-z0-9'\-]+$/);
        if (m && m[0].length > 2 && !isCJK(chars[i])) {
          const word = m[0];
          const keep = line.slice(0, line.length - word.length);
          out.push(keep.trimEnd());
          line = word + chars[i];
        } else {
          out.push(line);
          line = chars[i];
        }
      } else line = test;
    }
    if (line) out.push(line);
  }
  return out;
}

/**
 * drawText — main typographic primitive.
 * opts: font, size, weight, style, color, alpha, align, baseline, letterSpacing,
 *       lineHeight, maxWidth, stroke, strokeWidth, shadow, rotate, blend,
 *       maxLines, ellipsis, justify, mark (string id), markId
 */
export function drawText(ctx, text, x, y, opts = {}) {
  if (text == null || text === '') return { w: 0, h: 0, lines: [] };
  const size = opts.size ?? 36;
  const family = opts.font || FONT.serif;
  const weight = opts.weight ?? 400;
  const style = opts.style ?? 'normal';
  const color = opts.color || '#1b1710';
  const alpha = opts.alpha ?? 1;
  const align = opts.align || 'left';
  const baseline = opts.baseline || 'middle';
  const spacing = opts.letterSpacing ?? 0;
  const lh = opts.lineHeight ?? 1.28;
  const lineHeight = lh > 4 ? lh : size * lh;
  const lines = breakLines(ctx, text, opts.maxWidth, size, opts);
  const shown = opts.maxLines ? lines.slice(0, opts.maxLines) : lines;
  if (opts.maxLines && lines.length > shown.length) {
    const last = shown[shown.length - 1] || '';
    shown[shown.length - 1] = last.slice(0, Math.max(0, last.length - 1)) + (opts.ellipsis || '…');
  }
  const widths = shown.map((l) => measure(ctx, l, { ...opts, size }));
  const blockW = Math.max(0, ...widths);
  const blockH = shown.length * lineHeight;
  let y0;
  if (baseline === 'middle' || baseline === 'center') y0 = y - blockH / 2 + lineHeight / 2;
  else if (baseline === 'bottom' || baseline === 'alphabetic') y0 = y - blockH + lineHeight / 2;
  else if (baseline === 'top') y0 = y + lineHeight / 2;
  else y0 = y;

  ctx.save();
  if (opts.rotate) { ctx.translate(x, y); ctx.rotate(opts.rotate); ctx.translate(-x, -y); }
  ctx.globalAlpha = alpha;
  if (opts.blend) ctx.globalCompositeOperation = opts.blend;
  applyFont(ctx, size, family, weight, style, spacing);
  ctx.fillStyle = color;
  ctx.strokeStyle = opts.stroke || color;
  ctx.lineWidth = opts.strokeWidth ?? 0;
  ctx.lineJoin = 'round';
  ctx.textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';
  ctx.textBaseline = 'middle';
  if (opts.shadow) {
    ctx.shadowColor = opts.shadow.color || 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = opts.shadow.blur || 0;
    ctx.shadowOffsetX = opts.shadow.x || 0;
    ctx.shadowOffsetY = opts.shadow.y || 0;
  }
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`;
  const ax = align === 'center' ? x : align === 'right' ? x : x;
  for (let i = 0; i < shown.length; i++) {
    const line = shown[i];
    let lx = ax;
    if (align === 'left' && opts.justify && widths[i] < blockW) {
      // Draw the line with per-character extra spacing (editorial justification).
      const chars = [...line];
      const extra = (blockW - widths[i]) / Math.max(1, chars.length - 1);
      let cx = x;
      for (const ch of chars) {
        const cw = measure(ctx, ch, { ...opts, size });
        if (opts.strokeWidth) ctx.strokeText(ch, cx, y0 + i * lineHeight);
        ctx.fillText(ch, cx, y0 + i * lineHeight);
        cx += cw + spacing + extra;
      }
      continue;
    }
    if (opts.strokeWidth) ctx.strokeText(line, lx, y0 + i * lineHeight);
    ctx.fillText(line, lx, y0 + i * lineHeight);
  }
  ctx.restore();
  const result = { w: blockW, h: blockH, lines: shown, lineHeight, size };
  if (opts.mark) {
    const boxX = align === 'center' ? x - blockW / 2 : align === 'right' ? x - blockW : x;
    markText(opts.mark, text, boxX, y0 - lineHeight / 2, blockW, blockH, { size, align, color });
  }
  return result;
}

/** Centred line; shorthand used everywhere. */
export function centerText(ctx, text, x, y, opts = {}) {
  return drawText(ctx, text, x, y, { align: 'center', ...opts });
}

/** Horizontal spacing between glyphs for display lines. */
export function spacedText(ctx, text, x, y, opts = {}) {
  return drawText(ctx, text, x, y, opts);
}

/** Vertical CJK columns, read right-to-left. */
export function verticalText(ctx, text, x, y, opts = {}) {
  const size = opts.size ?? 64;
  const family = opts.font || FONT.display;
  const weight = opts.weight ?? 500;
  const color = opts.color || '#1b1710';
  const spacing = opts.letterSpacing ?? size * 0.13;
  const alpha = opts.alpha ?? 1;
  const cols = String(text).split('\n');
  const totalW = (cols.length - 1) * (size + spacing) + size;
  ctx.save();
  ctx.globalAlpha = alpha;
  applyFont(ctx, size, family, weight, opts.style || 'normal', 0);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let c = 0; c < cols.length; c++) {
    const chars = [...cols[c]];
    const cx = x + totalW / 2 - size / 2 - c * (size + spacing);
    for (let i = 0; i < chars.length; i++) {
      ctx.fillText(chars[i], cx, y + size / 2 + i * (size + spacing));
    }
  }
  ctx.restore();
  if (opts.mark) markText(opts.mark, text, x, y, totalW, Math.max(...cols.map((c) => [...c].length)) * (size + spacing), { size, color });
  return { w: totalW, h: Math.max(...cols.map((c) => [...c].length)) * (size + spacing) };
}

/** Typewriter clip reveal (progress 0..1). */
export function typewriter(ctx, text, x, y, progress, opts = {}) {
  const n = [...text].length;
  const k = Math.floor(clamp01(progress) * n + 0.0001);
  const shown = [...text].slice(0, k).join('');
  const res = drawText(ctx, shown, x, y, opts);
  if (opts.caret !== false && progress > 0 && progress < 1) {
    const size = opts.size ?? 36;
    const align = opts.align || 'left';
    const cw = res.w;
    const caretX = align === 'center' ? x + cw / 2 + size * 0.08 : align === 'right' ? x + size * 0.1 : x + cw + size * 0.08;
    ctx.save();
    ctx.fillStyle = opts.color || '#1b1710';
    ctx.globalAlpha = (opts.alpha ?? 1) * (0.65 + 0.35 * Math.sin(progress * 120));
    ctx.fillRect(caretX, y - size * 0.42, Math.max(2, size * 0.06), size * 0.84);
    ctx.restore();
  }
  return res;
}

/** A kinetic line: wipe in from one side on a beat, with optional scale blur. */
export function kineticLine(ctx, text, x, y, progress, opts = {}) {
  const size = opts.size ?? 56;
  const align = opts.align || 'left';
  const p = clamp01(progress);
  const direction = opts.direction ?? 1;
  const w = measure(ctx, text, { ...opts, size });
  // The line is drawn once, under the wipe clip. A faint ghost of the portion
  // already revealed keeps the ink from looking like a hard digital mask.
  const revealW = w * easeOut(p);
  const ax = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.save();
  ctx.beginPath();
  if (direction > 0) ctx.rect(ax - size * 0.1, y - size * 1.2, revealW + size * 0.1, size * 2.4);
  else ctx.rect(ax + w - revealW, y - size * 1.2, revealW, size * 2.4);
  ctx.clip();
  const block = drawText(ctx, text, x, y, { ...opts, size, alpha: opts.alpha ?? 1 });
  ctx.restore();
  if (opts.wipeEdge !== false && p < 0.999) {
    const edgeX = direction > 0 ? ax + revealW : ax + w - revealW;
    ctx.save();
    ctx.strokeStyle = opts.edgeColor || 'rgba(255,245,220,0.5)';
    ctx.lineWidth = opts.edgeWidth ?? 2;
    ctx.beginPath();
    ctx.moveTo(edgeX, y - size * 0.7);
    ctx.lineTo(edgeX + (opts.edgeSkew ?? 12), y + size * 0.7);
    ctx.stroke();
    ctx.restore();
  }
  return block;
}

/** RGB-fringed misregistered text. */
export function chromaticText(ctx, text, x, y, opts = {}) {
  const off = opts.offset ?? 4;
  ctx.save();
  const alpha = opts.alpha ?? 1;
  drawText(ctx, text, x - off, y, { ...opts, color: opts.red || 'rgba(210,52,41,0.55)', alpha: alpha * 0.6, blend: 'screen' });
  drawText(ctx, text, x + off * 0.7, y, { ...opts, color: opts.blue || 'rgba(30,100,150,0.5)', alpha: alpha * 0.55, blend: 'screen' });
  drawText(ctx, text, x, y, { ...opts, alpha });
  ctx.restore();
}

/** Glowing phosphor / neon line text. */
export function neonText(ctx, text, x, y, opts = {}) {
  const color = opts.color || '#00ff66';
  const glow = opts.glow ?? 22;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawText(ctx, text, x, y, { ...opts, color, alpha: (opts.alpha ?? 1) * 0.15, shadow: { color, blur: glow, x: 0, y: 0 } });
  drawText(ctx, text, x, y, { ...opts, color, alpha: (opts.alpha ?? 1) * 0.42, shadow: { color, blur: glow * 0.4, x: 0, y: 0 } });
  drawText(ctx, text, x, y, { ...opts, color: opts.core || '#d9ffe8', alpha: opts.alpha ?? 1 });
  ctx.restore();
}

/** Small caps label with hairline rules. */
export function labelRule(ctx, text, x, y, opts = {}) {
  const size = opts.size ?? 18;
  const color = opts.color || 'rgba(30,25,18,0.7)';
  const w = drawText(ctx, text, x, y, {
    size, font: FONT.mono, weight: 500, color, letterSpacing: opts.letterSpacing ?? 3,
    align: opts.align || 'left', alpha: opts.alpha ?? 1,
  }).w;
  if (opts.rule !== false) {
    ctx.save();
    ctx.strokeStyle = opts.ruleColor || color;
    ctx.globalAlpha = (opts.alpha ?? 1) * 0.5;
    ctx.lineWidth = 1;
    const align = opts.align || 'left';
    const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    const x1 = align === 'center' ? x + w / 2 : align === 'right' ? x : x + w;
    ctx.beginPath();
    ctx.moveTo(x0, y + size * 0.9);
    ctx.lineTo(x1, y + size * 0.9);
    ctx.stroke();
    ctx.restore();
  }
  return w;
}

/* -------------------------------------------------------------- sprites */
/**
 * textSprite — a cached cropped canvas. For repeated static text and masks.
 * Returns { canvas, w, h, pad }.
 */
export function textSprite(text, opts = {}) {
  const size = opts.size ?? 48;
  const family = opts.font || FONT.serif;
  const weight = opts.weight ?? 700;
  const spacing = opts.letterSpacing ?? 0;
  const key = JSON.stringify({ text, size, family, weight, spacing, color: opts.color || '#000', stroke: opts.stroke, strokeWidth: opts.strokeWidth, align: opts.align, pad: opts.pad });
  const hit = spriteCache.get(key);
  if (hit) { spriteCache.delete(key); spriteCache.set(key, hit); return hit; }
  const tmp = makeCanvas(32, 32).getContext('2d');
  applyFont(tmp, size, family, weight, opts.style || 'normal', spacing);
  const lines = String(text).split('\n');
  const widths = lines.map((l) => tmp.measureText(l).width);
  const w = Math.ceil(Math.max(1, ...widths) + size * 0.4);
  const lh = size * (opts.lineHeight || 1.2);
  const h = Math.ceil(lh * lines.length + size * 0.35);
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  applyFont(ctx, size, family, weight, opts.style || 'normal', spacing);
  ctx.textAlign = opts.align === 'right' ? 'right' : opts.align === 'center' ? 'center' : 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = opts.color || '#000';
  if (opts.stroke) { ctx.strokeStyle = opts.stroke; ctx.lineWidth = opts.strokeWidth || 2; }
  for (let i = 0; i < lines.length; i++) {
    const x = ctx.textAlign === 'center' ? w / 2 : ctx.textAlign === 'right' ? w - size * 0.2 : size * 0.2;
    const y = size * 0.175 + lh * (i + 0.5);
    if (opts.stroke) ctx.strokeText(lines[i], x, y);
    ctx.fillText(lines[i], x, y);
  }
  const sprite = { canvas, w, h, pad: size * 0.2, lines };
  spriteCache.set(key, sprite);
  if (spriteCache.size > MAX_SPRITES) {
    const first = spriteCache.keys().next().value;
    spriteCache.delete(first);
  }
  return sprite;
}

export function drawSprite(ctx, sprite, x, y, scale = 1, alpha = 1, align = 'left') {
  const ax = align === 'center' ? sprite.w / 2 : align === 'right' ? sprite.w : 0;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite.canvas, x - ax * scale, y - (sprite.h / 2) * scale, sprite.w * scale, sprite.h * scale);
  ctx.restore();
}

/**
 * Sample glyph interiors for particle typography.
 * Returns { pts: [[x,y]...], w, h, size } in a local coordinate system whose
 * top-left is (0,0). `density` is the target number of points.
 */
export function sampleTextPoints(text, opts = {}) {
  const size = opts.size ?? 220;
  const family = opts.font || FONT.display;
  const weight = opts.weight ?? 700;
  const spacing = opts.letterSpacing ?? size * 0.02;
  const density = opts.density ?? 4000;
  const key = `sample:${text}:${size}:${family}:${weight}:${spacing}:${density}`;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const tmp = makeCanvas(64, 64).getContext('2d');
  applyFont(tmp, size, family, weight, 'normal', spacing);
  const lines = String(text).split('\n');
  const widths = lines.map((l) => tmp.measureText(l).width);
  const w = Math.ceil(Math.max(1, ...widths) + size * 0.1);
  const h = Math.ceil(size * 1.32 * lines.length);
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  applyFont(ctx, size, family, weight, 'normal', spacing);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], size * 0.05, size * (1.04 + i * 1.32));
  const data = ctx.getImageData(0, 0, w, h).data;
  const candidates = [];
  const stride = Math.max(2, Math.round(Math.sqrt((w * h) / (density * 5.5))));
  for (let y = 0; y < h; y += stride) {
    for (let x = 0; x < w; x += stride) {
      if (data[(y * w + x) * 4 + 3] > 128) candidates.push([x + (hash(text, x, y) % 100) / 100, y]);
    }
  }
  // Deterministically thin to density, not random order (keeps glyph shape even).
  const pts = [];
  if (candidates.length > density) {
    const step = candidates.length / density;
    for (let i = 0; i < density; i++) pts.push(candidates[Math.floor(i * step)]);
  } else pts.push(...candidates);
  const obj = { pts, w, h, size, canvas };
  spriteCache.set(key, obj);
  return obj;
}

/** Build a white-on-transparent text mask canvas. */
export function textMask(text, opts = {}) {
  const sp = textSprite(text, { ...opts, color: '#fff', stroke: null });
  return sp.canvas;
}

/** Justified editorial paragraph with a hanging indent. */
export function paragraph(ctx, text, x, y, width, opts = {}) {
  const size = opts.size ?? 26;
  return drawText(ctx, text, x, y, { ...opts, size, maxWidth: width, align: 'left' });
}

export function strokeText(ctx, text, x, y, opts = {}) {
  return drawText(ctx, text, x, y, { ...opts, strokeWidth: opts.strokeWidth ?? Math.max(1, (opts.size || 40) * 0.02) });
}

/** Draw per-character with a seeded hand-set wobble (letterpress). */
export function jitteredText(ctx, text, x, y, opts = {}) {
  const size = opts.size ?? 48;
  const family = opts.font || FONT.serif;
  const weight = opts.weight ?? 700;
  const spacing = opts.letterSpacing ?? 0;
  const color = opts.color || '#1b1710';
  const align = opts.align || 'left';
  const seed = opts.seed ?? 3;
  const jitter = opts.jitter ?? 1.5;
  const chars = [...text];
  ctx.save();
  applyFont(ctx, size, family, weight, opts.style || 'normal', 0);
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.globalAlpha = opts.alpha ?? 1;
  for (let i = 0; i < chars.length; i++) {
    const jx = (hash(seed, i, 1) / 4294967296 - 0.5) * jitter * 2;
    const jy = (hash(seed, i, 2) / 4294967296 - 0.5) * jitter * 2;
    const rot = (hash(seed, i, 3) / 4294967296 - 0.5) * 0.015;
    ctx.save();
    ctx.translate(cx + widths[i] / 2 + jx, y + jy);
    ctx.rotate(rot);
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
    cx += widths[i] + spacing;
  }
  ctx.restore();
  return total;
}
