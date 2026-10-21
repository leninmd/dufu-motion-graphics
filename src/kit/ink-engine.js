/**
 * ink-engine.js — the shared wet-media toolbox.
 *
 * Used by eras 01, 02, 05, 11 and 12 (and selectively by others):
 *   · tapered brush ribbons with bristle separation / flying-white
 *   · wet ink blooms, splatter and pooling
 *   · high-contrast stone-rubbing extraction
 *   · vermilion seal carving
 *   · roughened calligraphic text
 * Every mark is driven by seeded noise, so the same frame is byte-stable.
 */
import {
  TAU, clamp, clamp01, lerp, hash, mulberry32, noise2, fbm1,
  smoothPath, resamplePolyline, ribbon, polygonPath, ellipsePts, vlerp,
} from './math.js';
import {
  rgba, makeCanvas, layer, drawLayer, withPolyClip, grainLayer,
  linear, radial, withClip, parseColor, mixColor,
} from './canvas.js';

/* ------------------------------------------------------------------ strokes */
function widthProfile(p, width, taper, pressure) {
  // Brush entry is soft, body is full, exit tapers to a point.
  const enter = Math.pow(clamp01(p / 0.14), 0.55);
  const exit = Math.pow(clamp01((1 - p) / 0.24), 0.7);
  const body = 0.72 + 0.28 * Math.sin(Math.PI * clamp01(p));
  return Math.max(0.15, width * (0.18 + 0.82 * enter * exit) * body * pressure);
}

function jitterPoints(pts, amp, seed) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = i / Math.max(1, pts.length - 1);
    const n = fbm1(p * 7.3, 2, seed) - 0.5;
    const n2 = noise2(p * 11.7, 4.2, seed + 9) - 0.5;
    // endpoints stay planted
    const k = Math.sin(Math.PI * p);
    out.push([pts[i][0] + n * amp * k, pts[i][1] + n2 * amp * k]);
  }
  return out;
}

/**
 * brushStroke — one calligraphic mark.
 * opts: { color, width, alpha, taper, dry, seed, jitter, paperColor,
 *         bleed, splatter, composite, cap }
 */
export function brushStroke(ctx, pts, opts = {}) {
  if (!pts || pts.length < 2) return;
  const color = opts.color || '#241c12';
  const width = opts.width ?? 10;
  const alpha = opts.alpha ?? 1;
  const seed = opts.seed ?? 1;
  const dry = clamp01(opts.dry ?? 0.22);
  const pressure = opts.pressure ?? 1;
  const taper = opts.taper ?? 0.7;
  const jitter = opts.jitter ?? Math.min(2.2, width * 0.13);
  const rs = resamplePolyline(pts, opts.step ?? Math.max(2.4, width * 0.24));
  const spine = jitterPoints(rs.pts, jitter, seed);
  const length = rs.length || 1;
  const widths = [];
  for (let i = 0; i < spine.length; i++) {
    const s = rs.s[i] / length;
    let w = widthProfile(s, width, taper, pressure);
    w *= 0.86 + 0.28 * noise2(s * 12, 1.3, seed + 5);
    widths.push(w);
  }
  const poly = ribbon(spine, (u, p, i) => widths[i], true);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = opts.composite || 'source-over';
  // wet bleed: a wider, very transparent silhouette
  if (opts.bleed !== 0) {
    const bp = ribbon(spine, (u, p, i) => widths[i] + width * 0.55, true);
    polygonPath(ctx, bp);
    ctx.fillStyle = rgba(color, (opts.bleed ?? 0.08));
    ctx.fill();
  }
  polygonPath(ctx, poly);
  ctx.fillStyle = rgba(color, 0.96);
  ctx.fill();
  // bristle streaks clipped to the ribbon
  if (dry > 0.02) {
    ctx.save();
    polygonPath(ctx, poly);
    ctx.clip();
    const n = Math.max(3, Math.round(width * 0.55 + dry * 11));
    const r = mulberry32(hash('bristle', seed, width));
    for (let b = 0; b < n; b++) {
      const u = r();
      const off = (u - 0.5) * 0.95;
      const a = dry * (0.12 + r() * 0.4);
      ctx.strokeStyle = rgba(opts.paperColor || '#e8ddc4', a);
      ctx.lineWidth = 0.5 + r() * Math.max(0.7, width * 0.075);
      ctx.beginPath();
      for (let i = 2; i < spine.length; i++) {
        const tangentX = spine[i][0] - spine[i - 1][0];
        const tangentY = spine[i][1] - spine[i - 1][1];
        const l = Math.hypot(tangentX, tangentY) || 1;
        const nx = -tangentY / l, ny = tangentX / l;
        const x = spine[i][0] + nx * widths[i] * 0.5 * off;
        const y = spine[i][1] + ny * widths[i] * 0.5 * off;
        if (i === 2) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.globalAlpha = alpha * a;
      ctx.stroke();
    }
    // pooled edge
    ctx.globalAlpha = alpha * (0.1 + dry * 0.12);
    ctx.strokeStyle = rgba(color, 0.8);
    ctx.lineWidth = Math.max(0.5, width * 0.035);
    polygonPath(ctx, poly);
    ctx.stroke();
    ctx.restore();
  }
  // splatter from the brush tip
  if (opts.splatter) {
    ctx.globalAlpha = alpha;
    inkSplatter(ctx, spine[spine.length - 1][0], spine[spine.length - 1][1], {
      color, seed: seed + 31, n: 8 + Math.round(opts.splatter * 20), radius: width * 3.4, alpha: 0.35 + opts.splatter * 0.35,
    });
  }
  ctx.restore();
}

/** A few pale dry scratches over a mark — flying-white. */
export function flyingWhite(ctx, pts, opts = {}) {
  const width = opts.width ?? 20;
  const seed = opts.seed ?? 4;
  const r = mulberry32(hash('flying', seed));
  ctx.save();
  ctx.globalCompositeOperation = opts.composite || 'source-over';
  for (let i = 0; i < (opts.n ?? 7); i++) {
    const off = (r() - 0.5) * width;
    ctx.strokeStyle = rgba(opts.color || '#ede3cc', (opts.alpha ?? 0.22) * (0.3 + r() * 0.7));
    ctx.lineWidth = 0.6 + r() * Math.max(1, width * 0.07);
    ctx.beginPath();
    for (let k = 0; k < pts.length; k++) {
      const p = pts[k];
      const sign = k === 0 ? 1 : -1;
      const x = p[0] + off * sign * (0.2 + r() * 0.5);
      const y = p[1] + off * 0.18;
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function inkSplatter(ctx, x, y, opts = {}) {
  const n = opts.n ?? 22;
  const radius = opts.radius ?? 40;
  const seed = opts.seed ?? 1;
  const r = mulberry32(hash('splat', seed));
  ctx.save();
  ctx.globalCompositeOperation = opts.composite || 'source-over';
  for (let i = 0; i < n; i++) {
    const a = r() * TAU;
    const d = Math.pow(r(), opts.pow ?? 1.8) * radius;
    const rad = (0.6 + Math.pow(r(), 2.2) * Math.max(1.2, radius * 0.09)) * (opts.scale ?? 1);
    const x2 = x + Math.cos(a) * d;
    const y2 = y + Math.sin(a) * d * (opts.squash ?? 0.7);
    ctx.fillStyle = rgba(opts.color || '#20180f', (opts.alpha ?? 0.5) * (0.25 + r() * 0.75));
    ctx.beginPath();
    ctx.ellipse(x2, y2, rad, rad * (0.45 + r() * 0.4), a, 0, TAU);
    ctx.fill();
    if (r() < 0.2) { // comet tail
      ctx.strokeStyle = rgba(opts.color || '#20180f', (opts.alpha ?? 0.5) * 0.4);
      ctx.lineWidth = rad * 0.7;
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - Math.cos(a) * rad * 3.2, y2 - Math.sin(a) * rad * 3.2); ctx.stroke();
    }
  }
  ctx.restore();
}

/** Irregular wet bloom / puddle. */
export function inkBloom(ctx, x, y, radius, opts = {}) {
  const seed = opts.seed ?? 1;
  const n = opts.points ?? 24;
  const color = opts.color || '#1d1710';
  const alpha = clamp01(opts.alpha ?? 0.35);
  const r = mulberry32(hash('bloom', seed));
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const rr = radius * (0.55 + r() * 0.5) * (opts.jagged ?? 1);
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * (opts.squash ?? 0.8)]);
  }
  const sm = smoothPath([...pts, pts[0], pts[1]], 5);
  ctx.save();
  ctx.globalCompositeOperation = opts.composite || 'source-over';
  const g = ctx.createRadialGradient(x, y, radius * 0.05, x, y, radius * 1.12);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.56, rgba(color, alpha * 0.72));
  g.addColorStop(0.88, rgba(color, alpha * 0.2));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(sm[0][0], sm[0][1]);
  for (let i = 1; i < sm.length; i++) ctx.lineTo(sm[i][0], sm[i][1]);
  ctx.closePath();
  ctx.fill();
  if (opts.grain !== false) {
    const gr = grainLayer(160, 160, seed + 7, { amp: 0.5, tint: opts.paper || '#d8c8a9' });
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = alpha * 0.3;
    ctx.drawImage(gr, x - radius, y - radius, radius * 2, radius * 2);
  }
  ctx.restore();
}

/** Dense parallel carving / hatching clipped to a shape. */
export function hatch(ctx, polygon, opts = {}) {
  if (!polygon || polygon.length < 3) return;
  const angle = opts.angle ?? -0.6;
  const gap = opts.gap ?? 7;
  const color = opts.color || '#111';
  const alpha = opts.alpha ?? 1;
  const jitter = opts.jitter ?? 0.8;
  const seed = opts.seed ?? 1;
  // bounding box in rotated space
  const c = Math.cos(-angle), s = Math.sin(-angle);
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (const p of polygon) {
    const x = p[0] * c - p[1] * s, y = p[0] * s + p[1] * c;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  ctx.save();
  withPolyClip(ctx, polygon, () => {
    ctx.translate(0, 0);
    const r = mulberry32(hash('hatch', seed));
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    const diag = Math.hypot(maxX - minX, maxY - minY) * 1.2;
    for (let y = minY; y <= maxY; y += gap * (0.72 + r() * 0.56)) {
      const jx = (r() - 0.5) * jitter * 2;
      ctx.lineWidth = (opts.width ?? 1.2) * (0.6 + r() * 0.8);
      ctx.beginPath();
      const x0 = minX - diag + jx, x1 = maxX + diag + jx;
      ctx.moveTo(x0 * c + y * s, -x0 * s + y * c);
      ctx.lineTo(x1 * c + y * s, -x1 * s + y * c);
      ctx.stroke();
      if (opts.double) {
        ctx.beginPath();
        ctx.lineWidth *= 0.4;
        ctx.moveTo((x0 + 3) * c + (y + 1.2) * s, -(x0 + 3) * s + (y + 1.2) * c);
        ctx.lineTo((x1 - 5) * c + (y + 1.2) * s, -(x1 - 5) * s + (y + 1.2) * c);
        ctx.stroke();
      }
    }
  });
  ctx.restore();
}

/** Rough edge: carve a wobbly outline around a rectangle. */
export function roughRect(ctx, x, y, w, h, opts = {}) {
  const seed = opts.seed ?? 1;
  const r = mulberry32(hash('roughrect', seed));
  const j = opts.jitter ?? 2.5;
  const steps = opts.steps ?? 9;
  const edge = (x0, y0, x1, y1) => {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const p = i / steps;
      pts.push([lerp(x0, x1, p) + (r() - 0.5) * j, lerp(y0, y1, p) + (r() - 0.5) * j]);
    }
    return pts;
  };
  const pts = [
    ...edge(x, y, x + w, y),
    ...edge(x + w, y, x + w, y + h),
    ...edge(x + w, y + h, x, y + h),
    ...edge(x, y + h, x, y),
  ];
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  return pts;
}

/* ------------------------------------------------------------------- seals */
/**
 * A vermilion carved seal. The characters are cut out of the red block.
 * opts: { color, alpha, font, rotate, rough, inset, border, vertical }
 */
export function sealStamp(ctx, x, y, w, text, opts = {}) {
  const h = opts.h ?? w;
  const color = opts.color || '#b52a22';
  const alpha = opts.alpha ?? 0.94;
  const seed = opts.seed ?? 9;
  const rot = opts.rotate ?? 0;
  const font = opts.font || '"Source Han Serif SC", "Noto Serif SC", serif';
  const chars = [...String(text).replace(/[\[\]「」]/g, '')];
  const r = mulberry32(hash('seal', seed, text));
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rot);
  ctx.translate(-w / 2, -h / 2);
  ctx.globalAlpha = alpha;
  // rough paper-shadow
  ctx.save();
  ctx.translate(2, 3);
  roughRect(ctx, 0, 0, w, h, { seed: seed + 2, jitter: Math.max(1.2, w * 0.014), steps: 12 });
  ctx.fillStyle = 'rgba(45,28,16,0.20)';
  ctx.fill();
  ctx.restore();
  // red block
  roughRect(ctx, 0, 0, w, h, { seed, jitter: Math.max(1, w * 0.012), steps: 13 });
  ctx.fillStyle = color;
  ctx.fill();
  // seal paste texture: tiny bites and darker pooling
  ctx.save();
  roughRect(ctx, 0, 0, w, h, { seed, jitter: Math.max(1, w * 0.012), steps: 13 });
  ctx.clip();
  for (let i = 0; i < w * h * 0.018; i++) {
    const px = r() * w, py = r() * h, rad = 0.3 + r() * Math.max(1, w * 0.012);
    ctx.fillStyle = r() < 0.55 ? `rgba(255,190,150,${0.05 + r() * 0.2})` : `rgba(80,14,10,${0.08 + r() * 0.24})`;
    ctx.beginPath(); ctx.arc(px, py, rad, 0, TAU); ctx.fill();
  }
  ctx.restore();
  // inner border
  if (opts.border !== false) {
    const b = opts.inset ?? w * 0.055;
    roughRect(ctx, b, b, w - 2 * b, h - 2 * b, { seed: seed + 3, jitter: Math.max(0.6, w * 0.007), steps: 10 });
    ctx.strokeStyle = 'rgba(255,226,196,0.88)';
    ctx.lineWidth = Math.max(1.5, w * 0.017);
    ctx.stroke();
  }
  // carved characters: paper-coloured, cut into the red (negative seal)
  const inset = opts.inset ?? w * 0.11;
  const iw = w - inset * 2, ih = h - inset * 2;
  const isVertical = opts.vertical ?? (chars.length <= 4 && h > w * 1.15);
  ctx.fillStyle = opts.ink || '#f4ead4';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  if (isVertical || chars.length > 4) {
    const cols = Math.ceil(chars.length / Math.max(1, Math.round(ih / (iw / Math.max(1, Math.ceil(chars.length / 2))))));
    const colCount = Math.min(chars.length, opts.cols || 1);
    const rows = Math.ceil(chars.length / colCount);
    const cellW = iw / colCount;
    const cellH = ih / rows;
    const fs = Math.min(cellW, cellH) * 0.88;
    ctx.font = `700 ${fs}px ${font}`;
    for (let i = 0; i < chars.length; i++) {
      const col = Math.floor(i / rows);
      const row = i % rows;
      const cx = colCount === 1 ? w / 2 : inset + cellW * (col + 0.5);
      const cy = inset + cellH * (row + 0.5);
      ctx.fillText(chars[i], cx, cy);
    }
    void cols;
  } else {
    const fs = Math.min(iw / Math.max(1, chars.length), ih) * 0.84;
    ctx.font = `800 ${fs}px ${font}`;
    // Use a real carved look: characters are not one uniform line.
    for (let i = 0; i < chars.length; i++) {
      const cx = inset + iw * ((i + 0.5) / chars.length);
      const cy = inset + ih * (0.51 + (r() - 0.5) * 0.03);
      ctx.fillText(chars[i], cx, cy);
    }
  }
  // chipped edges
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 18; i++) {
    const px = r() * w, py = r() * h;
    const rad = 0.6 + r() * (w * 0.015);
    const atEdge = r() < 0.5;
    if (!atEdge && r() < 0.7) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath(); ctx.arc(px, py, rad, 0, TAU); ctx.fill();
  }
  ctx.restore();
  return { x, y, w, h, rotate: rot };
}

/* ------------------------------------------------------- stone / rubbing */
/**
 * Extract a very high-contrast "rubbing" from arbitrary drawing:
 * the layer is painted with white shapes on black, then stippled by the grain
 * mask. Returns a baked canvas.
 */
export function rubbingLayer(key, w, h, drawShapes, opts = {}) {
  return layer(key, w, h, (ctx) => {
    ctx.fillStyle = opts.paper || '#d8cdb7';
    ctx.fillRect(0, 0, w, h);
    const ink = makeCanvas(w, h);
    const ictx = ink.getContext('2d');
    ictx.fillStyle = '#000';
    ictx.fillRect(0, 0, w, h);
    ictx.save();
    ictx.fillStyle = '#fff';
    ictx.strokeStyle = '#fff';
    drawShapes(ictx, w, h);
    ictx.restore();
    // threshold-ish grain: punch holes in the white using a dark grain layer
    ictx.globalCompositeOperation = 'destination-out';
    const gr = grainLayer(Math.ceil(w / 2), Math.ceil(h / 2), opts.seed ?? 4, { amp: 0.7 });
    ictx.globalAlpha = opts.erode ?? 0.38;
    ictx.drawImage(gr, 0, 0, w, h);
    ictx.globalAlpha = 1;
    ictx.globalCompositeOperation = 'source-over';
    // now ink is white-on-transparent; draw it in the rubbing colour
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = opts.ink || '#211d18';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(ink, 0, 0);
    ctx.restore();
    // apply paper fibre ghost
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.5;
    ctx.drawImage(ink, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  });
}

/* ------------------------------------------------------------------ masks */
/**
 * A ragged expanding ink mask used for transition wipes. Returns a path drawn
 * onto ctx; caller may fill or clip. p: 0..1.
 */
export function inkWipePath(ctx, w, h, p, opts = {}) {
  const edgeX = lerp(-w * 0.18, w * 1.18, clamp01(p));
  const seed = opts.seed ?? 3;
  const n = 40;
  ctx.beginPath();
  ctx.moveTo(-10, -10);
  ctx.lineTo(Math.max(-10, edgeX + (opts.invert ? w * 0.2 : -w * 0.2)), -10);
  for (let i = 0; i <= n; i++) {
    const y = (i / n) * h;
    const wob = (noise2(i * 0.24, 0.4, seed) - 0.5) * 90
      + (noise2(i * 0.9, 2.2, seed + 1) - 0.5) * 26;
    const x = edgeX + wob;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(Math.max(-10, edgeX + (opts.invert ? w * 0.2 : -w * 0.2)), h + 10);
  ctx.lineTo(-10, h + 10);
  ctx.closePath();
  return edgeX;
}

/** Fine ink speck border along a wipe edge. */
export function inkWipeDust(ctx, w, h, p, opts = {}) {
  const seed = opts.seed ?? 5;
  const edgeX = lerp(-w * 0.18, w * 1.18, clamp01(p));
  const r = mulberry32(hash('wipedust', seed));
  ctx.save();
  for (let i = 0; i < 90; i++) {
    const y = r() * h;
    const x = edgeX + (r() - 0.5) * 160;
    const rad = 0.5 + Math.pow(r(), 2) * 7;
    ctx.fillStyle = rgba(opts.color || '#19140e', (0.1 + r() * 0.6) * (opts.alpha ?? 1));
    ctx.beginPath(); ctx.ellipse(x, y, rad, rad * (0.3 + r() * 0.8), r() * TAU, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ text */
/**
 * Roughen a rendered text line so it reads as carved/printed rather than
 * digitally typeset. Caller provides position and style.
 */
export function roughText(ctx, text, x, y, opts = {}) {
  const {
    size = 64, font = '"Source Han Serif SC", serif', weight = 700,
    color = '#1a160f', align = 'left', alpha = 1, seed = 1,
    letterSpacing = 0, stroke = null, strokeWidth = 0, baseline = 'middle',
  } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${letterSpacing}px`;
  const rr = mulberry32(hash('roughtext', seed));
  ctx.fillStyle = color;
  const chars = [...text];
  let cx = x;
  if (align === 'center') {
    const wid = measureSpaced(ctx, text, letterSpacing);
    cx = x - wid / 2;
    ctx.textAlign = 'left';
  } else if (align === 'right') {
    const wid = measureSpaced(ctx, text, letterSpacing);
    cx = x - wid;
    ctx.textAlign = 'left';
  }
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const ox = (rr() - 0.5) * size * 0.018;
    const oy = (rr() - 0.5) * size * 0.024;
    ctx.save();
    ctx.translate(cx + ox, y + oy);
    ctx.rotate((rr() - 0.5) * 0.012);
    if (stroke) {
      ctx.lineWidth = strokeWidth || Math.max(1, size * 0.02);
      ctx.strokeStyle = stroke;
      ctx.lineJoin = 'round';
      ctx.strokeText(ch, 0, 0);
    }
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    cx += ctx.measureText(ch).width + letterSpacing;
  }
  ctx.restore();
  return cx - x;
}

export function measureSpaced(ctx, text, spacing = 0) {
  const chars = [...text];
  let w = 0;
  for (const ch of chars) w += ctx.measureText(ch).width + spacing;
  return Math.max(0, w - spacing);
}

/** Draw a stack of chopped white strokes as a ghost of a line. */
export function fragmentedLine(ctx, pts, opts = {}) {
  const seed = opts.seed ?? 1;
  const r = mulberry32(hash('fragline', seed));
  const n = opts.n ?? 26;
  ctx.save();
  ctx.strokeStyle = opts.color || '#e9dfc8';
  ctx.lineCap = 'round';
  const total = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = Math.floor(r() * total);
    const b = Math.min(total, a + 1 + Math.floor(r() * 5));
    ctx.globalAlpha = (opts.alpha ?? 0.7) * (0.15 + r() * 0.8);
    ctx.lineWidth = (opts.width ?? 2) * (0.4 + r() * 1.7);
    ctx.beginPath();
    ctx.moveTo(pts[a][0], pts[a][1]);
    for (let k = a + 1; k <= b; k++) ctx.lineTo(pts[k][0], pts[k][1]);
    ctx.stroke();
  }
  ctx.restore();
}

/** A soft grey wash rectangle (uses no blur filter). */
export function washRect(ctx, x, y, w, h, opts = {}) {
  const color = opts.color || '#28231a';
  const g = linear(ctx, x, y, x, y + h, [
    [0, rgba(color, 0)], [0.28, rgba(color, opts.alpha ?? 0.2)], [0.8, rgba(color, (opts.alpha ?? 0.2) * 0.8)], [1, rgba(color, 0)],
  ]);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

/** Draw a brushed vertical column of text (top to bottom). Useful for scenes 9/11. */
export function verticalInkText(ctx, text, x, y, opts = {}) {
  const size = opts.size ?? 72;
  const font = opts.font || '"Ma Shan Zheng", "STKaiti", serif';
  const color = opts.color || '#1c1710';
  const gap = opts.gap ?? size * 1.04;
  const r = mulberry32(hash('vtext', opts.seed ?? 1, text));
  ctx.save();
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.font = `${opts.weight ?? 400} ${size}px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    ctx.save();
    ctx.translate(x + (i > 0 ? (r() - 0.5) * size * 0.08 : 0), y + i * gap);
    ctx.rotate((r() - 0.5) * 0.025);
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

/** Brush font text with rough edges and optional outline. */
export function brushText(ctx, text, x, y, opts = {}) {
  return roughText(ctx, text, x, y, {
    font: opts.font || '"Ma Shan Zheng", "STKaiti", serif',
    weight: opts.weight ?? 400,
    ...opts,
  });
}

/** Circular vermilion seal around a character, as used for key quotes. */
export function redSealRound(ctx, x, y, r, ch, opts = {}) {
  const seed = opts.seed ?? 2;
  ctx.save();
  ctx.strokeStyle = opts.color || 'rgba(166,38,31,0.82)';
  ctx.lineWidth = opts.width ?? Math.max(2, r * 0.12);
  roughRect(ctx, x - r, y - r, r * 2, r * 2, { seed, jitter: r * 0.04, steps: 12 });
  ctx.stroke();
  ctx.fillStyle = opts.color || 'rgba(166,38,31,0.9)';
  ctx.font = `${opts.weight ?? 700} ${r * 1.18}px ${opts.font || '"Source Han Serif SC", serif'}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(ch, x, y + r * 0.05);
  ctx.restore();
}
