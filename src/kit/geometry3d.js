/**
 * geometry3d.js — a compact, dependency-free 3D projection kit for the
 * perspective-driven eras (point-cloud Tai Shan, type field, star river).
 * The renderer is deterministic; no WebGL context or external library needed.
 */
import { TAU, clamp, clamp01, hash, mulberry32, fbm2, ridged2, lerp } from './math.js';

export class Camera3D {
  /**
   * Camera at `dist` looking toward the origin, with yaw / pitch / zoom.
   * Orthographic mode is used for the "mountains collapse into one peak" gag.
   */
  constructor(opts = {}) {
    this.cx = opts.cx ?? 960;
    this.cy = opts.cy ?? 540;
    this.dist = opts.dist ?? 1200;
    this.yaw = opts.yaw ?? 0;
    this.pitch = opts.pitch ?? 0;
    this.roll = opts.roll ?? 0;
    this.zoom = opts.zoom ?? 1;
    this.focal = opts.focal ?? 1250;
    this.ortho = opts.ortho ?? false;
    this.orthoScale = opts.orthoScale ?? 0.78;
    this.target = opts.target || [0, 0, 0];
    this.near = opts.near ?? 20;
    this._cy = Math.cos(this.yaw);
    this._sy = Math.sin(this.yaw);
    this._cp = Math.cos(this.pitch);
    this._sp = Math.sin(this.pitch);
    this._cr = Math.cos(this.roll);
    this._sr = Math.sin(this.roll);
  }

  project(p) {
    let x = p[0] - this.target[0];
    let y = p[1] - this.target[1];
    let z = p[2] - this.target[2];
    // yaw around Y
    let x1 = x * this._cy + z * this._sy;
    let z1 = -x * this._sy + z * this._cy;
    // pitch around X
    let y1 = y * this._cp - z1 * this._sp;
    let z2 = y * this._sp + z1 * this._cp;
    if (this.ortho) {
      let sx = this.cx + x1 * this.orthoScale * this.zoom;
      let sy = this.cy - y1 * this.orthoScale * this.zoom;
      if (this.roll) {
        const dx = sx - this.cx, dy = sy - this.cy;
        sx = this.cx + dx * this._cr - dy * this._sr;
        sy = this.cy + dx * this._sr + dy * this._cr;
      }
      return { x: sx, y: sy, z: z2, s: this.orthoScale * this.zoom, visible: true };
    }
    const depth = this.dist + z2;
    if (depth <= this.near) return { x: 0, y: 0, z: depth, s: 0, visible: false };
    const scale = (this.focal / depth) * this.zoom;
    let sx = this.cx + x1 * scale;
    let sy = this.cy - y1 * scale;
    if (this.roll) {
      const dx = sx - this.cx, dy = sy - this.cy;
      sx = this.cx + dx * this._cr - dy * this._sr;
      sy = this.cy + dx * this._sr + dy * this._cr;
    }
    return { x: sx, y: sy, z: depth, s: scale, visible: true };
  }

  /** Project and return null for invisible points; also exposes depth for sort. */
  projectPoint(p) {
    const q = this.project(p);
    return q.visible ? q : null;
  }

  /** Screen-space scale at world origin (for consistent sprites). */
  get unitScale() {
    return this.ortho ? this.orthoScale * this.zoom : this.focal / this.dist * this.zoom;
  }
}

export function rotateY(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
}
export function rotateX(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
}
export function rotateZ(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
}
export function lerp3(a, b, p) {
  return [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)];
}

/**
 * A 35k-point Tai Shan / mountain range. The range is almost planar in z so a
 * 90-degree camera orbit deliberately collapses its width into one silhouette.
 */
export function mountainCloud(opts = {}) {
  const count = opts.count ?? 35000;
  const seed = opts.seed ?? 736;
  const spread = opts.spread ?? 1120;
  const baseY = opts.baseY ?? 430;
  const depth = opts.depth ?? 42;
  const peaks = opts.peaks ?? [
    { x: -900, h: 180, w: 210 }, { x: -690, h: 285, w: 240 }, { x: -460, h: 350, w: 280 },
    { x: -160, h: 470, w: 340 }, { x: 220, h: 405, w: 320 }, { x: 560, h: 505, w: 390 },
    { x: 880, h: 250, w: 230 }, { x: 1090, h: 185, w: 180 },
  ];
  const r = mulberry32(hash('mountaincloud', seed));
  const pts = [];
  for (let i = 0; i < count; i++) {
    // mostly surface, plus a sparse inner volume
    const layer = r() < 0.72 ? 0 : 1;
    let x = (r() * 2 - 1) * spread + (opts.offsetX ?? 0);
    let peak = 0;
    for (let k = 0; k < peaks.length; k++) {
      const p = peaks[k];
      const d = (x - p.x) / p.w;
      peak += p.h * Math.exp(-d * d * 1.7);
    }
    const ridge = ridged2(x * 0.0028 + 7.1, layer * 0.4 + (opts.ridgeY ?? 2.2), 5, seed + 13) * 210;
    const detail = (fbm2(x * 0.009 + 3.7, layer * 1.7, 5, seed + 7) - 0.5) * 110;
    const shoulder = (r() - 0.5) * (layer ? 220 : 84);
    let y = baseY - peak - ridge - detail + shoulder;
    // lower slope volume
    if (r() < 0.68) y += r() * (layer ? 260 : 140);
    if (r() < 0.08) y -= 30 + r() * 100; // carved spires
    const z = (r() * 2 - 1) * depth + (layer ? (r() * 2 - 1) * 300 : 0);
    const depthLight = clamp01(1 - (z + depth) / (depth * 2));
    pts.push({
      p: [x, y, z],
      x, y, z,
      tone: clamp01(0.22 + depthLight * 0.58 + (baseY - y) / 900 * 0.3),
      layer,
      mist: clamp01((y - 120) / 600),
    });
  }
  return pts;
}

/**
 * Particle cloud for a 3D TypeField. Text positions are sampled elsewhere and
 * passed as [x,y,text]; this distributes 1,600 glyph tiles over a slab.
 */
export function typeFieldCloud(texts, opts = {}) {
  const cols = opts.cols ?? 40;
  const rows = opts.rows ?? 40;
  const spacing = opts.spacing ?? 42;
  const out = [];
  const r = mulberry32(hash('typefield', opts.seed ?? 746));
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (out.length >= (opts.count ?? 1600)) break;
      const x = (i - cols / 2 + 0.5) * spacing;
      const z = (j - rows / 2 + 0.5) * spacing;
      const text = texts[(i + j * 3) % texts.length];
      out.push({
        p: [x, -36 - r() * 24, z],
        x, y: -36 - r() * 24, z,
        text,
        seed: r(),
      });
    }
  }
  return out;
}

/** A deterministic star field on a sphere / slab. */
export function starField(count, opts = {}) {
  const seed = opts.seed ?? 2026;
  const r = mulberry32(hash('stars', seed));
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = r() * TAU;
    const z = (r() * 2 - 1) * (opts.depth ?? 900);
    const rad = (0.15 + Math.pow(r(), 0.5) * 0.85) * (opts.spread ?? 1100);
    out.push({
      p: [Math.cos(a) * rad, Math.sin(a) * rad * (opts.squash ?? 0.6), z],
      r: 0.4 + Math.pow(r(), 3) * 2.8,
      a: 0.25 + Math.pow(r(), 2) * 0.75,
      seed: r(),
    });
  }
  return out;
}

/** Draw a point cloud; `colorOf` can vary per point. */
export function drawCloud(ctx, points, camera, opts = {}) {
  const size = opts.size ?? 1.2;
  const alpha = opts.alpha ?? 0.8;
  const colorOf = opts.colorOf;
  const sizeOf = opts.sizeOf;
  const composite = opts.composite || 'source-over';
  const project = opts.project || ((p) => camera.project(p.p || p));
  const clip = opts.clip;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = composite;
  if (clip) {
    ctx.beginPath(); ctx.rect(clip.x, clip.y, clip.w, clip.h); ctx.clip();
  }
  // Batch by quantized colour + size to reduce state changes.
  const buckets = new Map();
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const q = project(pt.p || pt);
    if (!q || !q.visible) continue;
    if (clip && (q.x < clip.x - 4 || q.x > clip.x + clip.w + 4 || q.y < clip.y - 4 || q.y > clip.y + clip.h + 4)) continue;
    const col = colorOf ? colorOf(pt, q, i) : (opts.color || '#fff');
    const sz = sizeOf ? sizeOf(pt, q, i) : size;
    const key = col + '|' + Math.round(sz * 2) / 2;
    let arr = buckets.get(key);
    if (!arr) { arr = []; buckets.set(key, arr); }
    arr.push(q.x, q.y);
  }
  for (const [key, arr] of buckets) {
    const sep = key.lastIndexOf('|');
    ctx.fillStyle = key.slice(0, sep);
    const sz = parseFloat(key.slice(sep + 1));
    for (let k = 0; k < arr.length; k += 2) ctx.fillRect(arr[k], arr[k + 1], sz, sz);
  }
  ctx.restore();
}

/** 3D positions sampled along a ring / arch. */
export function ringPoints(count, radius, opts = {}) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + (opts.phase || 0);
    out.push([Math.cos(a) * radius, (opts.y || 0) + Math.sin(a * (opts.waves || 1)) * (opts.yAmp || 0), Math.sin(a) * radius]);
  }
  return out;
}

/** Perspective quad helper (for labels / cards). */
export function quadPath(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

/** Project a rectangle's corners. */
export function projectRect(camera, x, y, z, w, h) {
  return [
    camera.project([x, y, z]),
    camera.project([x + w, y, z]),
    camera.project([x + w, y + h, z]),
    camera.project([x, y + h, z]),
  ];
}
