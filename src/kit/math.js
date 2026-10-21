/**
 * math.js — deterministic geometry, easing, noise and hashing.
 * Absolutely no Math.random / Date.now anywhere in this file.
 */

export const TAU = Math.PI * 2;
export const PI = Math.PI;
export const HALF_PI = Math.PI / 2;
export const DEG = Math.PI / 180;

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, p) => a + (b - a) * p;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const unlerp = invLerp;
export const mod = (v, m) => ((v % m) + m) % m;
export const mod1 = (v) => ((v % 1) + 1) % 1;
export const fract = (v) => v - Math.floor(v);
export const sign = (v) => (v < 0 ? -1 : 1);
export const step = (a, v) => (v < a ? 0 : 1);
export const mix = lerp;

export const smoothstep = (a, b, v) => {
  if (a === b) return v < a ? 0 : 1;
  const p = clamp01((v - a) / (b - a));
  return p * p * (3 - 2 * p);
};
export const smootherstep = (a, b, v) => {
  if (a === b) return v < a ? 0 : 1;
  const p = clamp01((v - a) / (b - a));
  return p * p * p * (p * (p * 6 - 15) + 10);
};
export const easeIn = (p) => p * p * p;
export const easeOut = (p) => 1 - Math.pow(1 - clamp01(p), 3);
export const easeInOut = (p) => {
  p = clamp01(p);
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
};
export const easeOutCubic = easeOut;
export const easeInCubic = easeIn;
export const easeInOutCubic = easeInOut;
export const easeInQ = (p) => p * p;
export const easeOutQ = (p) => 1 - (1 - p) * (1 - p);
export const easeInOutSine = (p) => 0.5 - 0.5 * Math.cos(PI * clamp01(p));
export const easeOutSine = (p) => Math.sin((clamp01(p) * PI) / 2);
export const easeInSine = (p) => 1 - Math.cos((clamp01(p) * PI) / 2);
export const easeOutExpo = (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
export const easeInExpo = (p) => (p <= 0 ? 0 : Math.pow(2, 10 * p - 10));
export const easeOutBack = (p, c = 1.70158) => {
  const x = p - 1;
  return 1 + (c + 1) * x * x * x + c * x * x;
};
export const easeInBack = (p, c = 1.70158) => (c + 1) * p * p * p - c * p * p;
export const easeOutElastic = (p) => {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  return Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (TAU / 3)) + 1;
};
export const bump = (p) => Math.sin(Math.PI * clamp01(p));
export const pulse = (p, k = 4) => Math.pow(1 - mod1(p), k);

/** Damped spring response, used for stamp shocks and card flips. */
export const spring = (p, { zeta = 0.36, freq = 3.2 } = {}) => {
  if (p <= 0) return 0;
  const w = TAU * freq;
  const wd = w * Math.sqrt(1 - zeta * zeta);
  return Math.exp(-zeta * w * p) * (Math.cos(wd * p) + (zeta * w / wd) * Math.sin(wd * p));
};

/* ------------------------------------------------------------------ hashing */
function hashString(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Stable integer hash over any sequence of numbers / strings.
 * `hash('scene7', i, 3)` always returns the same uint32.
 */
export function hash(...keys) {
  let h = 0x9e3779b9 >>> 0;
  for (let k = 0; k < keys.length; k++) {
    const key = keys[k];
    let v;
    if (typeof key === 'string') v = hashString(key);
    else if (typeof key === 'number') {
      v = Number.isFinite(key) ? (Math.imul((key * 1e6 + 0.5) | 0, 0x27d4eb2d) ^ 0x165667b1) >>> 0 : 0xdeadbeef;
    } else if (typeof key === 'boolean') v = key ? 0x6a09e667 : 0xbb67ae85;
    else if (key == null) v = 0x3c6ef372;
    else v = hashString(String(key));
    h ^= v + 0x9e3779b9 + (h << 6) + (h >>> 2);
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

/** Stable [0,1) random from any key sequence. */
export const unit = (...keys) => hash(...keys) / 4294967296;
export const hash01 = unit;
export const chance = (p, ...keys) => unit(...keys) < p;

/** Seeded PRNG. Returns a function producing [0,1). */
export function mulberry32(seed) {
  let a = (typeof seed === 'string' ? hash(seed) : seed) >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rng = mulberry32;

/** A tiny deterministic random stream with convenience helpers. */
export function random(seed) {
  const r = mulberry32(seed);
  return {
    next: r,
    range: (a, b) => a + (b - a) * r(),
    int: (a, b) => Math.floor(a + (b - a + 1) * r()),
    sign: () => (r() < 0.5 ? -1 : 1),
    pick: (arr) => arr[Math.floor(r() * arr.length)],
    gauss: () => {
      const u = Math.max(1e-9, r());
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * r());
    },
  };
}

/* -------------------------------------------------------------------- noise */
const fade = (t) => t * t * (3 - 2 * t);

export function noise2(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = fade(x - ix), fy = fade(y - iy);
  const a = hash(seed, ix, iy), b = hash(seed, ix + 1, iy);
  const c = hash(seed, ix, iy + 1), d = hash(seed, ix + 1, iy + 1);
  const u = a + (b - a) * fx;
  const v = c + (d - c) * fx;
  return (u + (v - u) * fy) / 4294967296;
}
export function noise1(x, seed = 0) { return noise2(x, 0.417, seed); }

export function fbm2(x, y, oct = 4, seed = 0, lac = 2.03, gain = 0.5) {
  let s = 0, a = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    s += a * noise2(x * f, y * f, seed + i * 131);
    norm += a;
    a *= gain;
    f *= lac;
  }
  return s / (norm || 1);
}
export function fbm1(x, oct = 4, seed = 0, lac = 2.03, gain = 0.5) {
  return fbm2(x, 0.271, oct, seed, lac, gain);
}
export function ridged2(x, y, oct = 4, seed = 0) {
  let s = 0, a = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    const n = 1 - Math.abs(noise2(x * f, y * f, seed + i * 97) * 2 - 1);
    s += a * n * n;
    norm += a;
    a *= 0.52;
    f *= 2.01;
  }
  return s / (norm || 1);
}

/** 2D value-noise gradient (cheap curl-like field). */
export function gradient2(x, y, seed = 0) {
  const e = 0.01;
  return [
    (noise2(x + e, y, seed) - noise2(x - e, y, seed)) / (2 * e),
    (noise2(x, y + e, seed) - noise2(x, y - e, seed)) / (2 * e),
  ];
}

/* ----------------------------------------------------------------- vectors */
export const v2 = (x = 0, y = 0) => [x, y];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const mul = (a, s) => [a[0] * s, a[1] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
export const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
export const vlen = (a) => Math.hypot(a[0], a[1]);
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const norm = (a) => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
export const vlerp = (a, b, p) => [lerp(a[0], b[0], p), lerp(a[1], b[1], p)];
export const vrot = (a, ang) => {
  const c = Math.cos(ang), s = Math.sin(ang);
  return [a[0] * c - a[1] * s, a[0] * s + a[1] * c];
};
export const vrotateAbout = (p, c, ang) => add(c, vrot(sub(p, c), ang));
export const perp = (a) => [-a[1], a[0]];

/* ------------------------------------------------------------------ curves */
export function quadPoint(p0, p1, p2, t) {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
  ];
}
export function cubicPoint(p0, p1, p2, p3, t) {
  const u = 1 - t, w0 = u * u * u, w1 = 3 * u * u * t, w2 = 3 * u * t * t, w3 = t * t * t;
  return [
    w0 * p0[0] + w1 * p1[0] + w2 * p2[0] + w3 * p3[0],
    w0 * p0[1] + w1 * p1[1] + w2 * p2[1] + w3 * p3[1],
  ];
}

/** Catmull-Rom through control points, with `samples` steps per span. */
export function smoothPath(points, samples = 8, tension = 0.5) {
  if (!points || points.length === 0) return [];
  if (points.length < 3) {
    const out = [];
    const n = Math.max(2, samples * Math.max(1, points.length - 1));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      if (points.length === 2) out.push(vlerp(points[0], points[1], t));
      else out.push(points[0]);
    }
    return out;
  }
  const out = [];
  const ext = [points[0], ...points, points[points.length - 1]];
  for (let i = 1; i < ext.length - 2; i++) {
    const p0 = ext[i - 1], p1 = ext[i], p2 = ext[i + 1], p3 = ext[i + 2];
    const steps = i === 1 ? samples : samples;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t, t3 = t2 * t;
      const m1 = [(p2[0] - p0[0]) * tension, (p2[1] - p0[1]) * tension];
      const m2 = [(p3[0] - p1[0]) * tension, (p3[1] - p1[1]) * tension];
      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;
      out.push([
        h00 * p1[0] + h10 * m1[0] + h01 * p2[0] + h11 * m2[0],
        h00 * p1[1] + h10 * m1[1] + h01 * p2[1] + h11 * m2[1],
      ]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/** Closed Catmull-Rom loop. */
export function smoothLoop(points, samples = 8, tension = 0.5) {
  if (!points || points.length < 3) return points ? points.slice() : [];
  const n = points.length;
  const ext = [points[n - 1], ...points, points[0], points[1]];
  const out = [];
  for (let i = 1; i < ext.length - 2; i++) {
    const p0 = ext[i - 1], p1 = ext[i], p2 = ext[i + 1], p3 = ext[i + 2];
    for (let s = 0; s < samples; s++) {
      const t = s / samples, t2 = t * t, t3 = t2 * t;
      const m1 = [(p2[0] - p0[0]) * tension, (p2[1] - p0[1]) * tension];
      const m2 = [(p3[0] - p1[0]) * tension, (p3[1] - p1[1]) * tension];
      const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
      out.push([
        h00 * p1[0] + h10 * m1[0] + h01 * p2[0] + h11 * m2[0],
        h00 * p1[1] + h10 * m1[1] + h01 * p2[1] + h11 * m2[1],
      ]);
    }
  }
  return out;
}

/** Ellipse as a polygon; angle rotates the ellipse itself. */
export function ellipsePts(cx, cy, rx, ry, angle = 0, n = 32) {
  const out = [];
  const c = Math.cos(angle), s = Math.sin(angle);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    out.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return out;
}

/** Variable-width ribbon polygon around a spine. widthAt(u) → width. */
export function ribbon(points, widthAt, cap = true) {
  if (!points || points.length < 2) return [];
  const left = [], right = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const p0 = points[Math.max(0, i - 1)], p1 = points[Math.min(points.length - 1, i + 1)];
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
    const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l;
    const w = (typeof widthAt === 'function' ? widthAt(i / (points.length - 1), p, i) : widthAt) / 2;
    left.push([p[0] + nx * w, p[1] + ny * w]);
    right.push([p[0] - nx * w, p[1] - ny * w]);
  }
  const out = left.slice();
  if (cap) {
    const a = right[right.length - 1], b = left[left.length - 1];
    const mid = vlerp(a, b, 0.5);
    out.push(mid);
  }
  for (let i = right.length - 1; i >= 0; i--) out.push(right[i]);
  return out;
}

export function polylineLength(pts, closed = false) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += dist(pts[i - 1], pts[i]);
  if (closed && pts.length > 2) l += dist(pts[pts.length - 1], pts[0]);
  return l;
}

/** Resample a polyline; returns {pts, s, length}. */
export function resamplePolyline(pts, step = 4, closed = false) {
  if (!pts || pts.length === 0) return { pts: [], s: [], length: 0 };
  const src = closed ? [...pts, pts[0]] : pts;
  const out = [src[0]];
  const s = [0];
  let acc = 0;
  for (let i = 1; i < src.length; i++) {
    const a = src[i - 1], b = src[i];
    const L = dist(a, b);
    const n = Math.max(1, Math.ceil(L / step));
    for (let k = 1; k <= n; k++) {
      out.push(vlerp(a, b, k / n));
      s.push(acc + (L * k) / n);
    }
    acc += L;
  }
  return { pts: out, s, length: acc };
}

export function pointAtLength(pts, s, closed = false) {
  if (!pts || pts.length === 0) return [0, 0];
  const src = closed ? [...pts, pts[0]] : pts;
  let acc = 0;
  for (let i = 1; i < src.length; i++) {
    const d = dist(src[i - 1], src[i]);
    if (acc + d >= s) {
      const p = d === 0 ? 0 : (s - acc) / d;
      return vlerp(src[i - 1], src[i], p);
    }
    acc += d;
  }
  return src[src.length - 1];
}

export function pointTangentAt(pts, s, closed = false) {
  const src = closed ? [...pts, pts[0]] : pts;
  let acc = 0;
  for (let i = 1; i < src.length; i++) {
    const d = dist(src[i - 1], src[i]);
    if (acc + d >= s) return norm(sub(src[i], src[i - 1]));
    acc += d;
  }
  const n = src.length;
  return n > 1 ? norm(sub(src[n - 1], src[n - 2])) : [1, 0];
}

/** Expand a source text into evenly spaced seeded points around a glyph grid. */
export function distribute(n, fn) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(fn(i, n));
  return out;
}

export function uniqueSorted(arr) {
  return [...new Set(arr)].sort((a, b) => a - b);
}

/** A numerically stable 2D triangle hit test. */
export function pointInPoly(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    const hit = yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi || 1e-9) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

/** Build an SVG-style rounded rect path onto a Canvas2D context. */
export function roundedRect(ctx, x, y, w, h, r = 8) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  return ctx;
}

export function polygonPath(ctx, pts, close = true) {
  if (!pts || pts.length === 0) return ctx;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
  return ctx;
}

export function circlePath(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.001, r), 0, TAU);
  return ctx;
}

/** Stable weighted choice. */
export const pick = (arr, ...keys) => arr[Math.min(arr.length - 1, Math.floor(unit(...keys) * arr.length))];
export const randRange = (a, b, ...keys) => a + (b - a) * unit(...keys);
export const randInt = (a, b, ...keys) => Math.floor(a + (b - a + 1) * unit(...keys));

/** Shorthand for blend of two arrays of points. */
export function blendPts(a, b, p) {
  const n = Math.min(a.length, b.length);
  const out = [];
  for (let i = 0; i < n; i++) out.push(vlerp(a[i], b[i], p));
  return out;
}

/** Format numbers without locale surprises. */
export function fixed(v, n = 2) { return Number(v).toFixed(n); }
export function pad(n, l = 2) { return String(n).padStart(l, '0'); }
